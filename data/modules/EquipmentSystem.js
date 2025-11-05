// ========== MODULE: EquipmentSystem ==========
class EquipmentSystem {
    constructor() {
        this.items = [];
        this.itemSets = {};
        console.log("✅ EquipmentSystem инициализирован");
    }

    async loadItemData() {
        try {
            console.log("📥 Загружаем данные предметов...");
            
            // Загружаем items.json
            const response = await fetch('data/items.json');
            if (!response.ok) {
                throw new Error(`Ошибка загрузки items.json: ${response.status}`);
            }
            
            this.items = await response.json();
            this.loadItemSetConfig();
            
            console.log(`✅ Загружено предметов: ${this.items.length}`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных предметов:", error);
            this.createFallbackItems();
            return true;
        }
    }

    loadItemSetConfig() {
        this.itemSets = {
            "set_beginner": {
                name: "Крестьянина Арканиума",
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.05 },
                description: "Комплект из 6 вещей даст +5% к урону"
            },
            "set_warrior": {
                name: "Ополченца Арканиума", 
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.1 },
                description: "Комплект из 6 вещей даст +10% к урону"
            }
            // ... остальные сеты можно добавить позже
        };
    }

    createFallbackItems() {
        this.items = [{
            id: 1,
            name: "Малое зелье здоровья",
            type: "potion",
            value: 20,
            price: 25,
            heal: 20,
            image: "images/items/potion1.jpg",
            description: "Восстанавливает 20 здоровья"
        }, {
            id: 2,
            name: "Простой меч",
            type: "weapon",
            weaponType: "one_handed",
            slot: "main_hand",
            fixed_damage: 5,
            price: 100,
            image: "images/items/sword1.jpg",
            description: "Простой железный меч",
            requiredLevel: 1
        }];
        
        this.loadItemSetConfig();
        console.log("🔄 Созданы тестовые предметы");
    }

    getItemById(itemId) {
        return this.items.find(item => item.id === itemId);
    }

    getItemsForSlot(slot) {
        return this.items.filter(item => {
            if (!item.slot) return false;
            return item.slot === slot || 
                   (item.weaponType === 'two_handed' && slot === 'main_hand') ||
                   (item.weaponType === 'shield' && slot === 'off_hand');
        });
    }

    canEquipWeapon(item, currentEquipment) {
        if (item.type !== 'weapon') return true;
        
        const mainHand = currentEquipment.main_hand;
        const offHand = currentEquipment.off_hand;
        
        if (item.weaponType === 'two_handed') {
            return !mainHand && !offHand;
        }
        
        if (item.weaponType === 'one_handed') {
            if (item.slot === 'main_hand') {
                const mainHandItem = mainHand ? this.getItemById(mainHand) : null;
                return !(mainHandItem && mainHandItem.weaponType === 'two_handed');
            }
            if (item.slot === 'off_hand') {
                const mainHandItem = mainHand ? this.getItemById(mainHand) : null;
                return !(mainHandItem && mainHandItem.weaponType === 'two_handed');
            }
        }
        
        if (item.weaponType === 'shield') {
            const mainHandItem = mainHand ? this.getItemById(mainHand) : null;
            return !(mainHandItem && mainHandItem.weaponType === 'two_handed');
        }
        
        return true;
    }
}

// Регистрируем систему в глобальной области
window.EquipmentSystem = EquipmentSystem;
console.log("📦 EquipmentSystem модуль загружен");
