// ========== MODULE: EquipmentSystem ==========
class EquipmentSystem {
    constructor() {
        this.items = [];
        this.itemSets = {};
        this.currentHero = null;
        this.currentCategory = 'all';
        this.currentSubcategory = 'all';
        console.log("✅ EquipmentSystem инициализирован");
    }

    async loadItemData() {
        try {
            console.log("📥 Загружаем данные предметов...");
            
            const response = await fetch('data/items.json');
            if (!response.ok) {
                throw new Error(`Ошибка загрузки items.json: ${response.status}`);
            }
            
            this.items = await response.json();
            this.loadItemSetConfig();
            
            console.log(`✅ Загружено предметов: ${this.items.length}`);
            console.log(`✅ Загружено сетов: ${Object.keys(this.itemSets).length}`);
            
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных предметов:", error);
            this.createFallbackItems();
            return true;
        }
    }

    // ========== СИСТЕМА СЕТОВ ПРЕДМЕТОВ ==========
    loadItemSetConfig() {
        this.itemSets = {
            "set_beginner": {
                name: "Комплект Крестьянина Арканиума",
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.05 },
                description: "Комплект из 6 вещей даст +5% к урону"
            },
            "set_warrior": {
                name: "Комплект Ополченца Арканиума", 
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.1 },
                description: "Комплект из 6 вещей даст +10% к урону"
            },
            // ... остальные сеты из твоего файла
        };
    }

    // ========== УПРАВЛЕНИЕ ГЕРОЕМ ==========
    setCurrentHero(hero) {
        this.currentHero = hero;
        console.log(`🎯 Установлен текущий герой: ${hero?.name}`);
    }

    // ========== МАГАЗИН ==========
    showShop(category = 'all', subcategory = 'all') {
        if (!this.currentHero) return '<div class="error">❌ Герой не выбран</div>';

        // Сохраняем состояние фильтров
        this.currentCategory = category;
        this.currentSubcategory = subcategory;

        const filteredItems = this.filterItemsByCategory(category, subcategory);
        
        return `
            <div class="overlay-content shop-overlay" style="max-width: 1200px; width: 95%;">
                <div class="overlay-header">
                    <h3>🏪 Магазин снаряжения</h3>
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
                
                <div class="merchant-info">
                    <div class="merchant-stats">
                        <span class="gold-amount">💰 ${this.currentHero.gold.toFixed(2)}</span>
                        <span class="inventory-space">🎒 ${this.currentHero.inventory.length}/10</span>
                    </div>
                </div>
                
                <div class="shop-categories">
                    <button class="category-tab ${category === 'all' ? 'active' : ''}" 
                            onclick="game.systems.equipment.handleCategoryClick('all')">Все предметы</button>
                    <button class="category-tab ${category === 'weapon' ? 'active' : ''}" 
                            onclick="game.systems.equipment.handleCategoryClick('weapon')">⚔️ Оружие</button>
                    <button class="category-tab ${category === 'helmet' ? 'active' : ''}" 
                            onclick="game.systems.equipment.handleCategoryClick('helmet')">⛑️ Шлемы</button>
                    <button class="category-tab ${category === 'chest' ? 'active' : ''}" 
                            onclick="game.systems.equipment.handleCategoryClick('chest')">👕 Броня</button>
                    <button class="category-tab ${category === 'gloves' ? 'active' : ''}" 
                            onclick="game.systems.equipment.handleCategoryClick('gloves')">🧤 Перчатки</button>
                    <button class="category-tab ${category === 'legs' ? 'active' : ''}" 
                            onclick="game.systems.equipment.handleCategoryClick('legs')">👖 Поножи</button>
                    <button class="category-tab ${category === 'boots' ? 'active' : ''}" 
                            onclick="game.systems.equipment.handleCategoryClick('boots')">👢 Ботинки</button>
                    <button class="category-tab ${category === 'set' ? 'active' : ''}" 
                            onclick="game.systems.equipment.handleCategoryClick('set')">✨ Сеты</button>
                </div>
                
                <div class="shop-content" style="max-height: 60vh; overflow-y: auto;">
                    <div class="items-grid">
                        ${filteredItems.length > 0 ? 
                            filteredItems.map(item => this.renderShopItem(item)).join('') :
                            '<div class="empty-category">📭 Нет предметов в этой категории</div>'
                        }
                    </div>
                </div>
            </div>
        `;
    }

    handleCategoryClick(category) {
        this.currentCategory = category;
        this.currentSubcategory = 'all';
        
        const container = document.getElementById('overlay-container');
        if (container) {
            container.innerHTML = this.showShop(category, 'all');
            setTimeout(() => {
                if (window.game && window.game.attachShopItemHandlers) {
                    window.game.attachShopItemHandlers();
                }
            }, 100);
        }
    }

    // ========== ФИЛЬТРАЦИЯ ПРЕДМЕТОВ ==========
    filterItemsByCategory(category, subcategory = 'all') {
        let filteredItems = this.items;
        
        // Фильтрация по категории
        if (category !== 'all') {
            if (category === 'set') {
                filteredItems = filteredItems.filter(item => item.setName && this.itemSets[item.setName]);
            } else {
                filteredItems = filteredItems.filter(item => this.doesItemMatchCategory(item, category));
            }
        }
        
        // Дополнительная фильтрация по подкатегории если нужно
        if (subcategory !== 'all' && category !== 'all') {
            filteredItems = this.filterItemsBySubcategory(filteredItems, category, subcategory);
        }
        
        return filteredItems.sort((a, b) => a.price - b.price);
    }

    doesItemMatchCategory(item, category) {
        if (category === 'all') return true;
        if (category === 'weapon') return item.type === 'weapon';
        return item.type === category;
    }

    filterItemsBySubcategory(items, category, subcategory) {
        if (subcategory === 'all') return items;
        
        return items.filter(item => {
            if (item.type !== category) return false;
            
            if (category === 'weapon') {
                return item.weaponType === subcategory;
            } else {
                const itemMaterial = item.material || 'cloth';
                return itemMaterial === subcategory;
            }
        });
    }

    // ========== ОТОБРАЖЕНИЕ ПРЕДМЕТОВ ==========
    renderShopItem(item) {
        const isOwned = this.isItemOwned(item.id);
        const canAfford = this.currentHero.gold >= item.price;
        const hasSpace = this.currentHero.inventory.length < 10;
        const canBuy = !isOwned && canAfford && hasSpace;
        
        return `
            <div class="shop-item" data-item-id="${item.id}" onclick="game.showItemDetailModal(${item.id})">
                <div class="item-background rarity-${item.rarity}">
                    <div class="item-image-container">
                        <img src="${item.image}" alt="${item.name}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="item-fallback" style="display: none;">
                            <span class="item-icon">${this.getItemTypeIcon(item.type)}</span>
                        </div>
                    </div>
                    
                    <div class="item-info">
                        <div class="item-name rarity-${item.rarity}">${item.name}</div>
                        <div class="item-type">${this.getItemTypeName(item.type)}</div>
                        
                        <div class="item-stats-compact">
                            ${item.fixed_damage ? `<span>⚔️${item.fixed_damage}</span>` : ''}
                            ${item.fixed_armor ? `<span>🛡️${item.fixed_armor}</span>` : ''}
                            ${item.fixed_health ? `<span>❤️${item.fixed_health}</span>` : ''}
                            ${this.getBonusDisplayInfo(item) ? `<span class="item-bonus-display">${this.getBonusDisplayInfo(item)}</span>` : ''}
                        </div>
                        
                        ${item.setName ? `
                            <div class="item-set-info">
                                ✨ ${this.itemSets[item.setName]?.name || 'Сет'}
                            </div>
                        ` : ''}
                        
                        <div class="item-price-tag">
                            <span class="price">💰 ${item.price}</span>
                            ${isOwned ? 
                                `<span class="owned-badge">✓ В инвентаре</span>` :
                                `<span class="buy-status ${canBuy ? 'can-buy' : 'cannot-buy'}">${canBuy ? 'Купить' : 'Недоступно'}</span>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== ПОКУПКА И ПРОДАЖА ==========
    buyItem(itemId) {
        if (!this.currentHero) return false;

        const item = this.getItemById(itemId);
        if (!item) return false;

        // Проверки
        if (this.isItemOwned(itemId)) {
            this.showNotification('❌ У вас уже есть этот предмет');
            return false;
        }

        if (this.currentHero.gold < item.price) {
            this.showNotification('❌ Недостаточно золота');
            return false;
        }

        if (this.currentHero.inventory.length >= 10) {
            this.showNotification('❌ Инвентарь полон! Максимум 10 предметов');
            return false;
        }

        // Покупка
        this.currentHero.gold = parseFloat((this.currentHero.gold - item.price).toFixed(2));
        this.addItemToInventory(itemId);
        
        // ⭐ СОХРАНЕНИЕ ПОСЛЕ ПОКУПКИ ⭐
        if (window.game) window.game.saveGame();
        
        this.showNotification(`🛒 Куплено: ${item.name} за ${item.price.toFixed(2)} золота`);
        return true;
    }

    sellItem(itemId) {
        if (!this.currentHero) return false;

        const item = this.getItemById(itemId);
        if (!item) return false;

        if (!this.isItemOwned(itemId)) {
            this.showNotification('❌ Предмет не найден в инвентаре');
            return false;
        }

        // Убираем из инвентаря
        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);
        
        // Снимаем если экипирован
        Object.keys(this.currentHero.equipment).forEach(slot => {
            if (this.currentHero.equipment[slot] === itemId) {
                this.currentHero.equipment[slot] = null;
            }
        });

        // Продажа
        const sellPrice = item.sellPrice || Math.floor(item.price * 0.5);
        this.currentHero.gold = parseFloat((this.currentHero.gold + sellPrice).toFixed(2));
        
        // ⭐ СОХРАНЕНИЕ ПОСЛЕ ПРОДАЖИ ⭐
        if (window.game) window.game.saveGame();

        this.showNotification(`💰 Продано: ${item.name} за ${sellPrice.toFixed(2)} золота`);
        return true;
    }

    // ========== ИНВЕНТАРЬ ==========
    showInventory(targetSlot = null) {
        if (!this.currentHero) return '<div class="error">❌ Герой не выбран</div>';

        let filteredItems = this.currentHero.inventory.map(id => this.getItemById(id)).filter(Boolean);
        let filterInfo = '';
        
        if (targetSlot) {
            filteredItems = filteredItems.filter(item => {
                const suitableSlots = this.getSuitableSlotsForItem(item);
                return suitableSlots.includes(targetSlot);
            });
            filterInfo = `
                <div class="filter-info">
                    <strong>🎯 Выбор предмета для: ${this.getSlotName(targetSlot)}</strong>
                    <div>Показано: ${filteredItems.length} подходящих предметов</div>
                </div>
            `;
        }

        return `
            <div class="overlay-content inventory-overlay">
                <div class="overlay-header">
                    <h3>🎒 Инвентарь</h3>
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
                <div class="overlay-body">
                    <div class="inventory-stats">
                        <span>💰 Золото: ${this.currentHero.gold.toFixed(2)}</span>
                        <span>📦 Предметы: ${this.currentHero.inventory.length}/10</span>
                    </div>
                    ${filterInfo}
                    <div class="inventory-grid">
                        ${filteredItems.length > 0 ? 
                            filteredItems.map(item => this.renderInventoryItem(item)).join('') :
                            '<div class="empty-inventory">📭 Инвентарь пуст</div>'
                        }
                    </div>
                </div>
            </div>
        `;
    }

    renderInventoryItem(item) {
        const isEquipped = Object.values(this.currentHero.equipment).includes(item.id);
        
        return `
            <div class="inventory-item" onclick="game.systems.equipment.equipItem(${item.id})" 
                 data-rarity="${item.rarity}">
                <div class="inventory-item-image">
                    <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
                </div>
                <div class="inventory-item-info">
                    <strong class="rarity-${item.rarity}">${item.name}</strong>
                    <div class="item-stats">
                        ${item.fixed_damage ? `<span>⚔️ +${item.fixed_damage}</span>` : ''}
                        ${item.fixed_armor ? `<span>🛡️ +${item.fixed_armor}</span>` : ''}
                        ${item.fixed_health ? `<span>❤️ +${item.fixed_health}</span>` : ''}
                    </div>
                    <small>${item.description}</small>
                    ${isEquipped ? 
                        '<small style="color: #4ade80;">✓ Надето</small>' : 
                        '<small style="color: #4cc9f0;">📦 В инвентаре</small>'
                    }
                </div>
            </div>
        `;
    }

    // ========== ЭКИПИРОВКА ==========
    equipItem(itemId) {
        if (!this.currentHero) return false;

        const item = this.getItemById(itemId);
        if (!item) return false;

        const slot = this.getEquipmentSlot(item);
        if (!slot) {
            this.showNotification(`❌ Нельзя экипировать ${item.name}`);
            return false;
        }

        // Проверка совместимости
        if (!this.canEquipItem(item, this.currentHero)) {
            this.showNotification(`❌ ${item.name} нельзя экипировать`);
            return false;
        }

        // Снимаем текущий предмет
        const currentItemId = this.currentHero.equipment[slot];
        if (currentItemId) {
            if (!this.unequipItem(slot)) return false;
        }

        // Экипируем новый предмет
        this.currentHero.equipment[slot] = itemId;
        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);

        // ⭐ СОХРАНЕНИЕ ПОСЛЕ ЭКИПИРОВКИ ⭐
        if (window.game) window.game.saveGame();

        this.showNotification(`🎯 Надето: ${item.name}`);
        return true;
    }

    unequipItem(slot) {
        if (!this.currentHero) return false;

        const itemId = this.currentHero.equipment[slot];
        if (!itemId) return false;

        // Проверяем место в инвентаре
        if (this.currentHero.inventory.length >= 10) {
            this.showNotification('❌ Инвентарь полон! Максимум 10 предметов');
            return false;
        }

        this.currentHero.equipment[slot] = null;
        this.currentHero.inventory.push(itemId);

        // ⭐ СОХРАНЕНИЕ ПОСЛЕ СНЯТИЯ ⭐
        if (window.game) window.game.saveGame();

        return true;
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    getItemById(itemId) {
        return this.items.find(item => item.id === itemId);
    }

    isItemOwned(itemId) {
        return this.currentHero && this.currentHero.inventory.includes(itemId);
    }

    addItemToInventory(itemId) {
        if (this.currentHero && !this.currentHero.inventory.includes(itemId)) {
            this.currentHero.inventory.push(itemId);
            return true;
        }
        return false;
    }

    getEquipmentSlot(item) {
        const slotMap = {
            'weapon': {
                'one_handed': 'main_hand',
                'two_handed': 'main_hand',
                'shield': 'off_hand'
            },
            'helmet': 'helmet',
            'chest': 'chest',
            'gloves': 'gloves', 
            'legs': 'legs',
            'boots': 'boots'
        };

        if (item.type === 'weapon') {
            return slotMap.weapon[item.weaponType] || null;
        }
        return slotMap[item.type] || null;
    }

    getSuitableSlotsForItem(item) {
        const slot = this.getEquipmentSlot(item);
        return slot ? [slot] : [];
    }

    canEquipItem(item, hero) {
        if (item.type !== 'weapon') return true;
        
        // Проверка для двуручного оружия
        if (item.weaponType === 'two_handed') {
            return !hero.equipment.main_hand && !hero.equipment.off_hand;
        }
        
        // Проверка для щитов
        if (item.weaponType === 'shield') {
            const mainHandItem = hero.equipment.main_hand ? this.getItemById(hero.equipment.main_hand) : null;
            return !(mainHandItem && mainHandItem.weaponType === 'two_handed');
        }
        
        return true;
    }

    getBonusDisplayInfo(item) {
        if (!item.bonus || item.bonus.type === 'none') return null;
        
        const bonusIcons = {
            'health_mult': '💪',
            'damage_mult': '⚔️',
            'armor_mult': '🛡️',
            'gold_mult': '💰',
            'health_regen_mult': '❤️',
            'crit_chance': '🎯',
            'armor_penetration': '💥',
            'vampirism': '🩸'
        };
        
        const value = Math.round(item.bonus.value * 100);
        const icon = bonusIcons[item.bonus.type] || '✨';
        
        return `${icon}+${value}%`;
    }

    getItemTypeIcon(type) {
        const icons = {
            'weapon': '⚔️',
            'shield': '🛡️',
            'helmet': '⛑️',
            'chest': '👕',
            'gloves': '🧤',
            'legs': '👖',
            'boots': '👢'
        };
        return icons[type] || '🎁';
    }

    getItemTypeName(type) {
        const names = {
            'weapon': 'Оружие',
            'shield': 'Щит',
            'helmet': 'Шлем',
            'chest': 'Броня',
            'gloves': 'Перчатки',
            'legs': 'Поножи',
            'boots': 'Ботинки'
        };
        return names[type] || 'Предмет';
    }

    getSlotName(slot) {
        const names = {
            'main_hand': 'Правая рука',
            'off_hand': 'Левая рука',
            'helmet': 'Шлем',
            'chest': 'Доспех',
            'gloves': 'Перчатки',
            'legs': 'Поножи',
            'boots': 'Ботинки'
        };
        return names[slot] || slot;
    }

    showNotification(message) {
        console.log("🔔 EquipmentSystem:", message);
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message);
        }
    }

    // ========== РЕЗЕРВНЫЕ ДАННЫЕ ==========
    createFallbackItems() {
        this.items = [
            {
                id: 1,
                name: "Малое зелье здоровья",
                type: "potion",
                price: 25,
                heal: 20,
                image: "images/items/potion1.jpg",
                description: "Восстанавливает 20 здоровья",
                rarity: "common"
            },
            {
                id: 2,
                name: "Простой меч",
                type: "weapon",
                weaponType: "one_handed",
                fixed_damage: 5,
                price: 100,
                image: "images/items/sword1.jpg",
                description: "Простой железный меч",
                requiredLevel: 1,
                rarity: "common"
            }
        ];
        
        this.loadItemSetConfig();
        console.log("🔄 Созданы тестовые предметы");
    }
}

// Регистрируем систему в глобальной области
window.EquipmentSystem = EquipmentSystem;
console.log("📦 EquipmentSystem модуль загружен");
