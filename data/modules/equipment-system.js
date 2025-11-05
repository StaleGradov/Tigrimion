class EquipmentSystem {
    constructor() {}

    canEquipWeapon(item, currentEquipment, items) {
        if (item.type !== 'weapon') return true;
        
        const mainHand = currentEquipment.main_hand;
        const offHand = currentEquipment.off_hand;
        
        // Если предмет двуручный
        if (item.weaponType === 'two_handed') {
            // Нельзя экипировать если уже есть что-то в любой руке
            if (mainHand || offHand) {
                return false;
            }
            return true;
        }
        
        // Если предмет одноручный
        if (item.weaponType === 'one_handed') {
            // Если в главной руке уже двуручное оружие - нельзя
            const mainHandItem = mainHand ? items.find(i => i.id === mainHand) : null;
            if (mainHandItem && mainHandItem.weaponType === 'two_handed') {
                return false;
            }
            return true;
        }
        
        // Если предмет - щит
        if (item.weaponType === 'shield') {
            // Если в главной руке двуручное оружие - нельзя
            const mainHandItem = mainHand ? items.find(i => i.id === mainHand) : null;
            if (mainHandItem && mainHandItem.weaponType === 'two_handed') {
                return false;
            }
            return true;
        }
        
        return true;
    }

    getEquipmentSlot(item) {
        if (item.type === 'weapon') {
            if (item.weaponType === 'shield') {
                return 'off_hand';
            } else if (item.weaponType === 'two_handed') {
                return 'main_hand';
            } else {
                return 'main_hand';
            }
        }
        
        // Для брони возвращаем соответствующий слот
        const slotMap = {
            'helmet': 'helmet',
            'chest': 'chest', 
            'gloves': 'gloves',
            'legs': 'legs',
            'boots': 'boots'
        };
        
        return slotMap[item.type] || null;
    }

    equipItem(hero, itemId, items) {
        const item = items.find(i => i.id === itemId);
        if (!item) return false;

        // Проверка совместимости оружия
        if (!this.canEquipWeapon(item, hero.equipment, items)) {
            return false;
        }

        const slot = this.getEquipmentSlot(item);
        if (!slot) return false;

        // Особые случаи для двуручного оружия
        if (item.weaponType === 'two_handed') {
            // Снимаем всё что было в руках
            this.unequipToInventory(hero, 'main_hand', items);
            this.unequipToInventory(hero, 'off_hand', items);
            
            // Экипируем в обе руки
            hero.equipment.main_hand = itemId;
            hero.equipment.off_hand = itemId;
        } else {
            // Стандартная экипировка
            hero.equipment[slot] = itemId;
        }

        return true;
    }

    unequipToInventory(hero, slot, items) {
        const itemId = hero.equipment[slot];
        if (!itemId) return false;

        const item = items.find(i => i.id === itemId);
        if (!item) return false;

        // Проверяем место в инвентаре
        if (hero.inventory.length >= 10) {
            return false;
        }

        // Особый случай: если снимаем двуручное оружие
        if (item.weaponType === 'two_handed') {
            hero.equipment.main_hand = null;
            hero.equipment.off_hand = null;
        } else {
            hero.equipment[slot] = null;
        }

        hero.inventory.push(itemId);
        return true;
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EquipmentSystem;
} else {
    window.EquipmentSystem = EquipmentSystem;
}
