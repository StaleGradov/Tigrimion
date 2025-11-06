// ========== MODULE: EquipmentSystem ==========
class EquipmentSystem {
    constructor() {
        this.items = [];
        this.itemSets = {};
        this.currentHero = null;
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
            },
            "set_guardian": {
                name: "Милитанта Арканиума",
                requiredPieces: 6, 
                bonus: { type: "damage_mult", value: 0.15 },
                description: "Комплект из 6 вещей даст +15% к урону"
            },
            "set_hunter": {
                name: "Ветерана Арканиума",
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.2 },
                description: "Комплект из 6 вещей даст +20% к урону"
            },
            "set_complete": {
                name: "Командира ополчения Арканиума",
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.25 },
                description: "Комплект из 6 вещей даст +25% к урону"
            }
            // ... остальные сеты из старого скрипта
        };
    }

    // ========== МАГАЗИН И ТОРГОВЛЯ ==========
    showShop() {
        if (!this.currentHero) return;

        const availableItems = this.items.filter(item => 
            item.requiredLevel <= (this.currentHero?.level || 1)
        );

        const categorizedItems = this.categorizeItems(availableItems);
        const merchantHTML = this.renderCategorizedShop(categorizedItems);

        return `
            <div class="overlay-content shop-overlay">
                <div class="overlay-header">
                    <h3>🏪 Магазин снаряжения</h3>
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
                
                <div class="merchant-info">
                    <div class="merchant-stats">
                        <span class="gold-amount">💰 ${this.currentHero.gold.toFixed(2)}</span>
                        <span class="inventory-space">🎒 ${10 - this.currentHero.inventory.length}/10</span>
                    </div>
                </div>
                
                <div class="shop-categories">
                    <button class="category-tab active" data-category="all">Все предметы</button>
                    <button class="category-tab" data-category="weapon">⚔️ Оружие</button>
                    <button class="category-tab" data-category="helmet">⛑️ Шлемы</button>
                    <button class="category-tab" data-category="chest">👕 Броня</button>
                    <button class="category-tab" data-category="gloves">🧤 Перчатки</button>
                    <button class="category-tab" data-category="legs">👖 Поножи</button>
                    <button class="category-tab" data-category="boots">👢 Ботинки</button>
                </div>
                
                <div class="shop-content">
                    ${merchantHTML}
                </div>
            </div>
        `;
    }

    categorizeItems(items) {
        const categories = {
            all: { name: "Все предметы", items: [] },
            weapon: { name: "Оружие", items: [] },
            helmet: { name: "Шлемы", items: [] },
            chest: { name: "Броня", items: [] },
            gloves: { name: "Перчатки", items: [] },
            legs: { name: "Поножи", items: [] },
            boots: { name: "Ботинки", items: [] }
        };
        
        const sortedItems = items.sort((a, b) => a.price - b.price);
        
        sortedItems.forEach(item => {
            categories.all.items.push(item);
            
            if (item.type === 'weapon' && item.weaponType !== 'shield') {
                categories.weapon.items.push(item);
            } else if (item.type in categories) {
                categories[item.type].items.push(item);
            }
        });
        
        return categories;
    }

    renderCategorizedShop(categories) {
        return Object.entries(categories).map(([categoryKey, category]) => `
            <div class="shop-category ${categoryKey}" style="${categoryKey !== 'all' ? 'display: none;' : ''}">
                <h4 class="category-title">${category.name}</h4>
                <div class="items-grid">
                    ${category.items.map(item => this.renderShopItem(item)).join('')}
                </div>
            </div>
        `).join('');
    }

    renderShopItem(item) {
        const isOwned = this.currentHero.inventory.includes(item.id);
        const canAfford = this.currentHero.gold >= item.price;
        const hasSpace = this.currentHero.inventory.length < 10;
        const canBuy = !isOwned && canAfford && hasSpace;
        const frameColor = this.getItemFrameColor(item.rarity);
        
        return `
            <div class="shop-item" onclick="game.systems.equipment.showItemDetails(${item.id})">
                <div class="item-background" style="border-color: ${frameColor};">
                    <div class="item-image-container">
                        <img src="${item.image}" alt="${item.name}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="item-fallback" style="display: none;">
                            <span class="item-icon">${this.getItemTypeIcon(item.type)}</span>
                        </div>
                    </div>
                    
                    <div class="item-rarity-bar" style="background: ${frameColor};"></div>
                    
                    <div class="item-info">
                        <div class="item-name" style="color: ${frameColor};">${item.name}</div>
                        <div class="item-type">${this.getItemTypeName(item.type)}</div>
                        
                        <div class="item-stats-compact">
                            ${item.fixed_damage ? `<span>⚔️${item.fixed_damage}</span>` : ''}
                            ${item.fixed_armor ? `<span>🛡️${item.fixed_armor}</span>` : ''}
                            ${item.fixed_health ? `<span>❤️${item.fixed_health}</span>` : ''}
                        </div>
                        
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

    showItemDetails(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        const isOwned = this.currentHero.inventory.includes(item.id);
        const canAfford = this.currentHero.gold >= item.price;
        const hasSpace = this.currentHero.inventory.length < 10;
        const canBuy = !isOwned && canAfford && hasSpace;
        const frameColor = this.getItemFrameColor(item.rarity);
        
        const modalHTML = `
            <div class="item-detail-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 style="color: ${frameColor};">${item.name}</h4>
                        <button class="close-modal" onclick="game.systems.equipment.closeItemModal()">×</button>
                    </div>
                    
                    <div class="item-detail-content">
                        <div class="item-detail-image">
                            <div class="detail-item-background" style="border-color: ${frameColor};">
                                <img src="${item.image}" alt="${item.name}" 
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                                <div class="item-fallback-large" style="display: none;">
                                    <span class="item-icon-large">${this.getItemTypeIcon(item.type)}</span>
                                </div>
                            </div>
                            <div class="item-rarity" style="background: ${frameColor};">
                                ${this.getRarityName(item.rarity)}
                            </div>
                        </div>
                        
                        <div class="item-detail-info">
                            <div class="item-description">${item.description}</div>
                            
                            <div class="item-stats-detailed">
                                <h5>Характеристики:</h5>
                                ${item.fixed_damage ? `<div class="stat-line"><span>⚔️ Урон:</span> <span>+${item.fixed_damage}</span></div>` : ''}
                                ${item.fixed_armor ? `<div class="stat-line"><span>🛡️ Броня:</span> <span>+${item.fixed_armor}</span></div>` : ''}
                                ${item.fixed_health ? `<div class="stat-line"><span>❤️ Здоровье:</span> <span>+${item.fixed_health}</span></div>` : ''}
                                ${item.bonus && item.bonus.type !== 'none' ? 
                                    `<div class="stat-line"><span>🎯 Бонус:</span> <span>${this.formatBonus(item.bonus)}</span></div>` : ''}
                                ${item.setName ? `<div class="stat-line"><span>✨ Сет:</span> <span>${this.itemSets[item.setName]?.name || item.setName}</span></div>` : ''}
                            </div>
                            
                            <div class="item-requirements">
                                <h5>Требования:</h5>
                                <div class="stat-line"><span>📊 Уровень:</span> <span>${item.requiredLevel}</span></div>
                            </div>
                            
                            <div class="item-actions">
                                <div class="price-section">
                                    <span class="buy-price">💰 Купить: ${item.price.toFixed(2)}</span>
                                    <span class="sell-price">💸 Продать: ${(item.sellPrice || Math.floor(item.price * 0.5)).toFixed(2)}</span>
                                </div>
                                
                                <div class="action-buttons">
                                    ${isOwned ? 
                                        `<button class="btn-secondary" onclick="game.systems.equipment.sellItem(${item.id})">Продать</button>` :
                                        `<button class="btn-primary ${!canBuy ? 'disabled' : ''}" 
                                                ${!canBuy ? 'disabled' : ''}
                                                onclick="game.systems.equipment.buyItem(${item.id})">
                                            Купить
                                        </button>`
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    closeItemModal() {
        const modal = document.querySelector('.item-detail-modal');
        if (modal) modal.remove();
    }

    buyItem(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        if (this.currentHero.gold < item.price) {
            this.showNotification('❌ Недостаточно золота');
            return;
        }

        if (this.currentHero.inventory.length >= 10) {
            this.showNotification('❌ Инвентарь полон! Максимум 10 предметов');
            return;
        }

        if (this.currentHero.inventory.includes(itemId)) {
            this.showNotification('❌ У вас уже есть этот предмет');
            return;
        }

        this.currentHero.gold = parseFloat((this.currentHero.gold - item.price).toFixed(2));
        this.currentHero.inventory.push(itemId);
        
        this.showNotification(`🛒 Куплено: ${item.name} за ${item.price.toFixed(2)} золота`);
        this.closeItemModal();
        game.hideOverlay();
        game.showOverlay('shop');
    }

    sellItem(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        if (!this.currentHero.inventory.includes(itemId)) {
            this.showNotification('❌ Предмет не найден в инвентаре');
            return;
        }

        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);
        const sellPrice = item.sellPrice || Math.floor(item.price * 0.5);
        this.currentHero.gold = parseFloat((this.currentHero.gold + sellPrice).toFixed(2));
        
        // Снятие предмета если он был экипирован
        Object.keys(this.currentHero.equipment).forEach(slot => {
            if (this.currentHero.equipment[slot] === itemId) {
                this.currentHero.equipment[slot] = null;
            }
        });

        this.showNotification(`💰 Продано: ${item.name} за ${sellPrice.toFixed(2)} золота`);
        this.closeItemModal();
        game.hideOverlay();
        game.showOverlay('shop');
    }

    // ========== ИНВЕНТАРЬ И ЭКИПИРОВКА ==========
    showInventory(targetSlot = null) {
        if (!this.currentHero) return '';

        let filteredItems = this.currentHero.inventory;
        let filterInfo = '';
        
        if (targetSlot && targetSlot !== 'inventory') {
            filteredItems = this.getItemsForSlot(targetSlot);
            filterInfo = `
                <div class="filter-info">
                    <strong>🎯 Выбор предмета для: ${this.getSlotName(targetSlot)}</strong>
                    <div>Показано: ${filteredItems.length} подходящих предметов</div>
                </div>
            `;
        }

        const inventoryHTML = filteredItems.map(itemId => {
            const item = this.getItemById(itemId);
            if (!item) return '';
            
            const isEquipped = Object.values(this.currentHero.equipment).includes(itemId);
            const frameColor = this.getItemFrameColor(item.rarity);
            
            return `
                <div class="inventory-item" onclick="game.systems.equipment.equipItem(${itemId})" 
                     style="border-color: ${frameColor};">
                    <div class="inventory-item-image">
                        <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
                    </div>
                    <div class="inventory-item-info">
                        <strong style="color: ${frameColor};">${item.name}</strong>
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
                        ${targetSlot && targetSlot !== 'inventory' ? 
                            `<small style="color: #ffd700;">🎯 Подходит для: ${this.getSlotName(targetSlot)}</small>` : ''}
                    </div>
                </div>
            `;
        }).join('');

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
                        ${inventoryHTML || '<div class="empty-inventory">📭 Инвентарь пуст</div>'}
                    </div>
                    ${targetSlot ? `
                        <div class="inventory-actions">
                            <button class="btn-secondary" onclick="game.showOverlay(\'inventory\')">
                                📦 Показать все предметы
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    equipItem(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        // Использование зелья
        if (item.type === 'potion') {
            this.usePotion(item);
            return;
        }

        // Проверка совместимости оружия
        if (!this.canEquipWeapon(item, this.currentHero.equipment)) {
            this.showNotification(`❌ Нельзя экипировать ${item.name} - несовместимо с текущим оружием`);
            return;
        }

        let slot = item.slot;
        if (!slot) {
            slot = this.getEquipmentSlot(item);
        }

        // Особые случаи для двуручного оружия
        if (item.weaponType === 'two_handed') {
            // Снимаем всё что было в руках
            this.unequipToInventory('main_hand');
            this.unequipToInventory('off_hand');
            
            // Экипируем в обе руки
            this.currentHero.equipment.main_hand = itemId;
            this.currentHero.equipment.off_hand = itemId;
            
        } else {
            // Стандартная экипировка
            const currentEquipped = this.currentHero.equipment[slot];
            if (currentEquipped) {
                this.unequipToInventory(slot);
            }
            this.currentHero.equipment[slot] = itemId;
        }

        // Убираем из инвентаря
        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);

        this.showNotification(`🎯 Надето: ${item.name}`);
        game.hideOverlay();
        game.showHeroGameScreen();
    }

    unequipToInventory(slot) {
        const itemId = this.currentHero.equipment[slot];
        if (!itemId) return false;

        const item = this.getItemById(itemId);
        if (!item) return false;

        // Проверяем место в инвентаре
        if (this.currentHero.inventory.length >= 10) {
            this.showNotification('❌ Инвентарь полон! Максимум 10 предметов');
            return false;
        }

        // Особый случай: если снимаем двуручное оружие
        if (item.weaponType === 'two_handed') {
            this.currentHero.equipment.main_hand = null;
            this.currentHero.equipment.off_hand = null;
        } else {
            this.currentHero.equipment[slot] = null;
        }

        this.currentHero.inventory.push(itemId);
        return true;
    }

    usePotion(item) {
        if (item.type !== 'potion') return;

        if (item.heal) {
            // Здесь нужно добавить логику лечения героя
            this.showNotification(`❤️ Использовано: ${item.name} (+${item.heal} здоровья)`);
        }

        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== item.id);
        this.showNotification(`❤️ Использовано: ${item.name}`);
        game.hideOverlay();
        game.showOverlay('inventory');
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    getItemById(itemId) {
        return this.items.find(item => item.id === itemId);
    }

    getItemsForSlot(slot) {
        return this.currentHero.inventory.filter(itemId => {
            const item = this.getItemById(itemId);
            if (!item) return false;
            
            const suitableSlots = this.getSuitableSlotsForItem(item);
            return suitableSlots.includes(slot);
        });
    }

    getSuitableSlotsForItem(item) {
        const slotMap = {
            'weapon': {
                'one_handed': ['main_hand', 'off_hand'],
                'two_handed': ['main_hand'],
                'shield': ['off_hand']
            },
            'helmet': ['helmet'],
            'chest': ['chest'],
            'gloves': ['gloves'],
            'legs': ['legs'],
            'boots': ['boots']
        };

        if (item.type === 'weapon' && slotMap.weapon[item.weaponType]) {
            return slotMap.weapon[item.weaponType];
        }
        
        return slotMap[item.type] || [];
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
        
        const slotMap = {
            'helmet': 'helmet',
            'chest': 'chest', 
            'gloves': 'gloves',
            'legs': 'legs',
            'boots': 'boots'
        };
        
        return slotMap[item.type] || null;
    }

    getItemFrameColor(rarity) {
        const colors = {
            'common': '#9ca3af',
            'uncommon': '#4cc9f0',
            'rare': '#a855f7',
            'epic': '#f59e0b',
            'legendary': '#ffd700'
        };
        return colors[rarity] || '#9ca3af';
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

    getRarityName(rarity) {
        const names = {
            'common': 'Обычный',
            'uncommon': 'Необычный',
            'rare': 'Редкий',
            'epic': 'Эпический',
            'legendary': 'Легендарный'
        };
        return names[rarity] || 'Обычный';
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

    formatBonus(bonus) {
        if (!bonus || bonus.type === 'none') return 'Нет бонуса';
        
        const bonusNames = {
            'health_mult': 'Здоровье',
            'damage_mult': 'Урон', 
            'armor_mult': 'Броня',
            'gold_mult': 'Золото',
            'health_regen_mult': 'Регенерация',
            'crit_chance': 'Криты',
            'armor_penetration': 'Пенетрация',
            'vampirism': 'Вампиризм'
        };

        const value = Math.round(bonus.value * 100);
        return bonusNames[bonus.type] ? 
            `${bonusNames[bonus.type]} +${value}%` : 
            `Бонус: +${value}%`;
    }

    showNotification(message) {
        // Простая реализация уведомления
        console.log("🔔", message);
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message);
        } else {
            alert(message);
        }
    }

    createFallbackItems() {
        this.items = [
            {
                id: 1,
                name: "Малое зелье здоровья",
                type: "potion",
                value: 20,
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
                slot: "main_hand",
                fixed_damage: 5,
                price: 100,
                image: "images/items/sword1.jpg",
                description: "Простой железный меч",
                requiredLevel: 1,
                rarity: "common"
            },
            {
                id: 3,
                name: "Деревянный щит",
                type: "weapon",
                weaponType: "shield",
                slot: "off_hand",
                fixed_armor: 3,
                price: 80,
                image: "images/items/shield1.jpg",
                description: "Простой деревянный щит",
                requiredLevel: 1,
                rarity: "common"
            },
            {
                id: 4,
                name: "Кожаный шлем",
                type: "helmet",
                slot: "helmet",
                fixed_armor: 2,
                fixed_health: 10,
                price: 120,
                image: "images/items/helmet1.jpg",
                description: "Кожаный шлем",
                requiredLevel: 1,
                rarity: "common"
            }
        ];
        
        this.loadItemSetConfig();
        console.log("🔄 Созданы тестовые предметы");
    }

    // Метод для установки текущего героя
    setCurrentHero(hero) {
        this.currentHero = hero;
    }
}

// Регистрируем систему в глобальной области
window.EquipmentSystem = EquipmentSystem;
console.log("📦 EquipmentSystem модуль загружен");
