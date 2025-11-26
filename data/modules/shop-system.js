"use strict";

class ShopSystem {
    constructor() {
        this.shops = new Map(); // shopId -> Shop
        this.currentShop = null;
        this.currentHero = null;
        this.currentCategory = 'all';
        this.currentSubcategory = 'all';
        
        console.log("✅ ShopSystem инициализирована с новыми стилями");
    }

    // Установка текущего героя
    setCurrentHero(hero) {
        this.currentHero = hero;
        console.log(`🎯 Установлен герой для магазина: ${hero?.name || 'нет'}`);
    }

    // Открытие магазина при заходе на клетку
    openShop(merchantCell) {
        if (!this.currentHero) {
            console.error("❌ Герой не выбран для магазина!");
            if (window.game) {
                window.game.showNotification("❌ Сначала выберите героя!", 'error');
            }
            return;
        }

        const shopId = merchantCell.shopId || `shop_${merchantCell.col}_${merchantCell.row}`;
        let shop = this.shops.get(shopId);
        
        // Если магазин еще не создан - создаем
        if (!shop) {
            shop = this.createShop(merchantCell, shopId);
            this.shops.set(shopId, shop);
        }

        this.currentShop = shop;
        this.showShopInterface(shop);
    }

    createShop(merchantCell, shopId) {
        // Получаем список ID предметов из клетки
        const itemIds = merchantCell.shopItems || [];
        
        // Загружаем полные данные предметов
        const inventory = this.loadItemsByIds(itemIds);
        
        return {
            id: shopId,
            name: merchantCell.shopName || "Магазин",
            merchantName: merchantCell.merchantName || "Торговец",
            inventory: inventory,
            position: { col: merchantCell.col, row: merchantCell.row },
            restockTimer: merchantCell.restockTimer || 24 * 60 * 60 * 1000,
            lastRestock: Date.now()
        };
    }

    // Загрузка предметов по ID
    loadItemsByIds(itemIds) {
        const equipmentSystem = window.game?.systems?.equipment;
        if (!equipmentSystem) {
            console.error("❌ EquipmentSystem не доступна");
            return [];
        }

        const items = [];
        itemIds.forEach(itemId => {
            const item = equipmentSystem.getItemById(itemId);
            if (item) {
                items.push({
                    ...item,
                    originalId: item.id // Сохраняем оригинальный ID
                });
            } else {
                console.warn(`⚠️ Предмет с ID ${itemId} не найден`);
            }
        });

        console.log(`🛒 Загружено ${items.length} предметов для магазина`);
        return items;
    }

    showShopInterface(shop) {
        const shopHTML = this.generateShopHTML(shop);
        
        const container = document.getElementById('overlay-container');
        if (container) {
            container.innerHTML = shopHTML;
            container.style.display = 'block';
            
            // Добавляем обработчики для категорий
            setTimeout(() => this.attachCategoryHandlers(), 100);
        }
    }

    generateShopHTML(shop) {
        const filteredItems = this.filterItemsByCategory(shop.inventory);
        
        return `
            <div class="shop-overlay">
                <div class="overlay-header">
                    <h3>${shop.name}</h3>
                    <button class="btn-close" onclick="game.systems.shop.closeShop()">✕</button>
                </div>
                
                <div class="overlay-body">
                    <!-- Шапка магазина -->
                    <div class="merchant-header">
                        <h4>🏪 ${shop.merchantName}</h4>
                        <div class="hero-merchant-info">
                            <div class="merchant-stats">
                                <span class="gold-amount">💰 ${this.currentHero?.gold || 0} золота</span>
                                <span class="inventory-space">🎒 ${this.getInventorySpace()}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Категории -->
                    <div class="shop-categories">
                        <div class="category-tab ${this.currentCategory === 'all' ? 'active' : ''}" 
                             onclick="game.systems.shop.setCategory('all')">
                            Все предметы
                        </div>
                        <div class="category-tab ${this.currentCategory === 'weapon' ? 'active' : ''}" 
                             onclick="game.systems.shop.setCategory('weapon')">
                            ⚔️ Оружие
                        </div>
                        <div class="category-tab ${this.currentCategory === 'armor' ? 'active' : ''}" 
                             onclick="game.systems.shop.setCategory('armor')">
                            🛡️ Броня
                        </div>
                        <div class="category-tab ${this.currentCategory === 'potion' ? 'active' : ''}" 
                             onclick="game.systems.shop.setCategory('potion')">
                            🧪 Зелья
                        </div>
                        <div class="category-tab ${this.currentCategory === 'consumable' ? 'active' : ''}" 
                             onclick="game.systems.shop.setCategory('consumable')">
                            🍖 Расходники
                        </div>
                    </div>

                    <!-- Подкатегории (если нужно) -->
                    ${this.generateSubcategoriesHTML()}

                    <!-- Сетка предметов -->
                    <div class="merchant-items-container">
                        <div class="shop-content">
                            <div class="shop-category">
                                <div class="category-title">
                                    ${this.getCategoryTitle()}
                                </div>
                                ${filteredItems.length > 0 ? 
                                    `<div class="items-grid">
                                        ${filteredItems.map(item => this.generateItemHTML(item)).join('')}
                                    </div>` :
                                    `<div class="empty-category">
                                        🚫 В этой категории пока нет товаров
                                    </div>`
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateSubcategoriesHTML() {
        // Пока оставим пустым, можно добавить позже
        return '';
    }

    generateItemHTML(item) {
        const canAfford = this.currentHero && this.currentHero.gold >= item.price;
        const isOwned = this.isItemOwned(item.originalId || item.id);
        const itemClass = `shop-item ${isOwned ? 'owned' : ''} ${!canAfford ? 'cannot-buy' : ''} rarity-${item.rarity || 'common'}`;
        
        return `
            <div class="${itemClass}" onclick="game.systems.shop.showItemDetailModal(${item.originalId || item.id})">
                <div class="item-background">
                    <div class="item-image-container">
                        <img src="${item.image}" alt="${item.name}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="item-fallback" style="display: none;">
                            <span class="item-icon">${this.getItemIcon(item.type)}</span>
                        </div>
                    </div>
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-type">${this.getItemTypeName(item.type)}</div>
                        
                        <div class="item-stats-compact">
                            ${item.fixed_damage ? `<span>⚔️ ${item.fixed_damage}</span>` : ''}
                            ${item.fixed_armor ? `<span>🛡️ ${item.fixed_armor}</span>` : ''}
                            ${item.fixed_health ? `<span>❤️ ${item.fixed_health}</span>` : ''}
                        </div>

                        ${item.bonus && item.bonus.type !== 'none' ? `
                            <div class="item-bonus-display">
                                ${this.formatBonus(item.bonus)}
                            </div>
                        ` : ''}

                        ${item.setName ? `
                            <div class="item-set-info">
                                Набор: ${this.getSetName(item.setName)}
                            </div>
                        ` : ''}

                        <div class="item-price-tag">
                            <div class="price">💰 ${item.price}</div>
                            ${isOwned ? 
                                '<div class="owned-badge">✅ В инвентаре</div>' :
                                `<div class="buy-status ${canAfford ? 'can-buy' : 'cannot-buy'}">
                                    ${canAfford ? '🛒 Купить' : '❌ Недостаточно'}
                                </div>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Фильтрация предметов по категории
    filterItemsByCategory(items) {
        if (this.currentCategory === 'all') {
            return items;
        }
        return items.filter(item => item.type === this.currentCategory);
    }

    // Установка категории
    setCategory(category) {
        this.currentCategory = category;
        this.currentSubcategory = 'all';
        if (this.currentShop) {
            this.showShopInterface(this.currentShop);
        }
    }

    // Получение заголовка категории
    getCategoryTitle() {
        const titles = {
            'all': '📦 Все товары',
            'weapon': '⚔️ Оружие',
            'armor': '🛡️ Броня',
            'potion': '🧪 Зелья и зелья',
            'consumable': '🍖 Расходные предметы'
        };
        return titles[this.currentCategory] || '📦 Товары';
    }

    // Получение места в инвентаре
    getInventorySpace() {
        if (!this.currentHero || !this.currentHero.inventory) {
            return '0/0';
        }
        const maxSlots = 20; // Максимальное количество слотов
        return `${this.currentHero.inventory.length}/${maxSlots}`;
    }

    // Проверка владения предметом
    isItemOwned(itemId) {
        if (!this.currentHero || !this.currentHero.inventory) {
            return false;
        }
        return this.currentHero.inventory.includes(itemId);
    }

    // Форматирование бонуса
    formatBonus(bonus) {
        if (!bonus || bonus.type === 'none') return '';
        
        const bonusTypes = {
            'damage_mult': '📈 Урон +',
            'armor_mult': '🛡️ Броня +',
            'health_mult': '❤️ Здоровье +',
            'speed_mult': '⚡ Скорость +'
        };
        
        const value = bonus.value * 100;
        return `${bonusTypes[bonus.type] || 'Бонус'} ${value}%`;
    }

    // Получение названия сета
    getSetName(setName) {
        const sets = {
            'set_beginner': 'Набор новичка',
            'set_warrior': 'Воинский набор',
            'set_guardian': 'Страж'
        };
        return sets[setName] || setName;
    }

    getItemIcon(itemType) {
        const icons = {
            'weapon': '⚔️',
            'armor': '🛡️',
            'potion': '🧪',
            'consumable': '🍖',
            'scroll': '📜',
            'misc': '📦'
        };
        return icons[itemType] || '📦';
    }

    getItemTypeName(type) {
        const names = {
            'weapon': 'Оружие',
            'armor': 'Броня',
            'potion': 'Зелье',
            'consumable': 'Расходник',
            'scroll': 'Свиток',
            'misc': 'Предмет'
        };
        return names[type] || type;
    }

    // Обработчики категорий
    attachCategoryHandlers() {
        const categoryTabs = document.querySelectorAll('.category-tab');
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                const category = tab.getAttribute('onclick').match(/'([^']+)'/)[1];
                this.setCategory(category);
            });
        });
    }

    // Показ деталей предмета
    showItemDetailModal(itemId) {
        const item = this.currentShop.inventory.find(i => 
            (i.originalId || i.id) === itemId
        );
        
        if (!item) {
            console.error("❌ Предмет не найден");
            return;
        }

        const canAfford = this.currentHero && this.currentHero.gold >= item.price;
        const isOwned = this.isItemOwned(item.originalId || item.id);

        const modalHTML = `
            <div class="item-detail-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4>🔍 Детали предмета</h4>
                        <button class="close-modal" onclick="game.systems.shop.closeItemDetailModal()">✕</button>
                    </div>
                    <div class="item-detail-content">
                        <div class="item-detail-image">
                            <div class="detail-item-background rarity-${item.rarity || 'common'}">
                                <img src="${item.image}" alt="${item.name}" 
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
                                     class="item-detail-image-zoom">
                                <div class="item-fallback-large" style="display: none;">
                                    <span>${this.getItemIcon(item.type)}</span>
                                </div>
                            </div>
                            <div class="item-rarity ${item.rarity || 'common'}">
                                ${this.getRarityName(item.rarity)}
                            </div>
                        </div>
                        
                        <div class="item-detail-info">
                            <div class="item-name rarity-${item.rarity || 'common'}">${item.name}</div>
                            <div class="item-type">${this.getItemTypeName(item.type)}</div>
                            
                            <div class="item-description">
                                <p>${item.description || 'Описание отсутствует.'}</p>
                            </div>
                            
                            ${item.flavorText ? `
                                <div class="item-flavor">
                                    "${item.flavorText}"
                                </div>
                            ` : ''}
                            
                            ${item.bonus && item.bonus.type !== 'none' ? `
                                <div class="item-bonus-info">
                                    <h5>🎯 Бонус предмета:</h5>
                                    <div class="bonus-display">
                                        ${this.formatBonus(item.bonus)}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="item-stats-detailed">
                                <h5>📊 Характеристики</h5>
                                ${item.fixed_damage ? `<div class="stat-line"><span>⚔️ Урон:</span> <span class="stat-value">+${item.fixed_damage}</span></div>` : ''}
                                ${item.fixed_armor ? `<div class="stat-line"><span>🛡️ Броня:</span> <span class="stat-value">+${item.fixed_armor}</span></div>` : ''}
                                ${item.fixed_health ? `<div class="stat-line"><span>❤️ Здоровье:</span> <span class="stat-value">+${item.fixed_health}</span></div>` : ''}
                            </div>
                            
                            <div class="item-actions">
                                <div class="price-section">
                                    <span class="buy-price">💰 ${item.price} золота</span>
                                    ${item.sellPrice ? `<span class="sell-price">💸 ${item.sellPrice} золота</span>` : ''}
                                </div>
                                
                                ${!isOwned ? `
                                    <button class="btn-primary ${!canAfford ? 'disabled' : ''}" 
                                            onclick="game.systems.shop.buyItem(${item.originalId || item.id})" 
                                            ${!canAfford ? 'disabled' : ''}>
                                        🛒 Купить
                                    </button>
                                    ${!canAfford ? `
                                        <div class="purchase-error">
                                            ❌ Недостаточно золота
                                        </div>
                                    ` : ''}
                                ` : `
                                    <button class="btn-primary owned" disabled>
                                        ✅ Уже куплено
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = document.getElementById('overlay-container');
        if (container) {
            container.innerHTML = modalHTML;
            
            // Добавляем обработчик для увеличения картинки
            setTimeout(() => {
                const zoomableImage = document.querySelector('.item-detail-image-zoom');
                if (zoomableImage) {
                    zoomableImage.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showZoomedImage(item.image, item.name);
                    });
                }
            }, 100);
        }
    }

    // Покупка предмета
    buyItem(itemId) {
        const item = this.currentShop.inventory.find(i => 
            (i.originalId || i.id) === itemId
        );
        
        if (!item) {
            console.error("❌ Предмет не найден в магазине");
            return;
        }

        if (!this.currentHero) {
            window.game?.showNotification("❌ Герой не выбран!", 'error');
            return;
        }

        if (this.currentHero.gold >= item.price) {
            const equipmentSystem = window.game?.systems?.equipment;
            if (equipmentSystem && equipmentSystem.addItemToHero) {
                const itemAdded = equipmentSystem.addItemToHero(this.currentHero, item.originalId || item.id);
                if (itemAdded) {
                    // Вычитаем золото
                    this.currentHero.gold -= item.price;
                    
                    // Обновляем героя в других системах
                    if (window.game?.systems?.map) {
                        window.game.systems.map.syncHeroWithOtherSystems();
                    }
                    
                    // Обновляем интерфейс
                    this.closeItemDetailModal();
                    if (this.currentShop) {
                        this.showShopInterface(this.currentShop);
                    }
                    
                    if (window.game) {
                        window.game.showNotification(`✅ Куплено: ${item.name}`, 'success');
                    }
                    
                    console.log(`🛒 Герой купил: ${item.name} за ${item.price} золота`);
                } else {
                    window.game?.showNotification("🎒 Недостаточно места в инвентаре!", 'error');
                }
            } else {
                window.game?.showNotification("❌ Система инвентаря недоступна", 'error');
            }
        } else {
            window.game?.showNotification("💰 Недостаточно золота!", 'error');
        }
    }

    // Увеличение изображения
    showZoomedImage(imageSrc, itemName) {
        const zoomOverlay = document.createElement('div');
        zoomOverlay.className = 'item-image-zoom-overlay';
        
        zoomOverlay.innerHTML = `
            <div class="close-zoom" onclick="this.parentElement.remove()">×</div>
            <img src="${imageSrc}" alt="${itemName}" class="item-image-zoomed"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
        `;
        
        // Закрытие по клику на оверлей
        zoomOverlay.addEventListener('click', (e) => {
            if (e.target === zoomOverlay) {
                zoomOverlay.remove();
            }
        });
        
        // Закрытие по ESC
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                zoomOverlay.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        document.body.appendChild(zoomOverlay);
    }

    closeItemDetailModal() {
        if (this.currentShop) {
            this.showShopInterface(this.currentShop);
        }
    }

    closeShop() {
        this.currentShop = null;
        const container = document.getElementById('overlay-container');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
    }

    leaveShop() {
        this.closeShop();
    }

    getRarityName(rarity) {
        const names = {
            'common': 'Обычный',
            'uncommon': 'Необычный',
            'rare': 'Редкий',
            'epic': 'Эпический',
            'legendary': 'Легендарный',
            'mythic': 'Мифический'
        };
        return names[rarity] || 'Обычный';
    }

    // Перезаполнение магазина
    restockShop(shopId) {
        const shop = this.shops.get(shopId);
        if (!shop) return;

        const timeSinceLastRestock = Date.now() - shop.lastRestock;
        if (timeSinceLastRestock < shop.restockTimer) {
            console.log(`⏰ Магазин ${shop.name} еще не готов к перезаполнению`);
            return;
        }

        shop.lastRestock = Date.now();
        console.log(`🔄 Магазин ${shop.name} перезаполнен`);
    }

    // Отладочная информация
    debugInfo() {
        console.group("🛒 ShopSystem Debug Info");
        console.log("Текущий магазин:", this.currentShop?.name || 'нет');
        console.log("Всего магазинов:", this.shops.size);
        console.log("Текущий герой:", this.currentHero?.name || 'нет');
        console.log("Золото героя:", this.currentHero?.gold || 0);
        console.log("Текущая категория:", this.currentCategory);
        
        if (this.currentShop) {
            console.log("Товары в магазине:", this.currentShop.inventory.length);
            this.currentShop.inventory.forEach(item => {
                console.log(`  - ${item.name} (${item.price} золота)`);
            });
        }
        console.groupEnd();
    }
}

window.ShopSystem = ShopSystem;
console.log("📦 ShopSystem модуль загружен с новыми стилями");
