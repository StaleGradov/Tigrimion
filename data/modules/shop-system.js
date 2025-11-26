"use strict";

class ShopSystem {
    constructor() {
        this.shops = new Map(); // shopId -> Shop
        this.currentShop = null;
        this.currentHero = null;
        
        console.log("✅ ShopSystem инициализирована");
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
        
        // ⭐ ИСПРАВЛЕНИЕ: Не вызываем game.showOverlay() чтобы избежать рекурсии
        const container = document.getElementById('overlay-container');
        if (container) {
            container.innerHTML = shopHTML;
            container.style.display = 'block';
        }
    }

    generateShopHTML(shop) {
        return `
            <div class="shop-overlay">
                <div class="shop-header">
                    <h3>${shop.name}</h3>
                    <div class="merchant-info">🏪 ${shop.merchantName}</div>
                    <button class="btn-close" onclick="game.systems.shop.closeShop()">✕</button>
                </div>
                
                <div class="shop-content">
                    <div class="inventory-section">
                        <h4>📦 Товары в продаже:</h4>
                        ${shop.inventory.length > 0 ? 
                            `<div class="shop-items">
                                ${shop.inventory.map(item => this.generateItemHTML(item)).join('')}
                            </div>` :
                            `<div class="empty-shop">😔 Магазин пуст</div>`
                        }
                    </div>
                    
                    <div class="player-section">
                        <div class="player-gold">
                            💰 Золото: <strong>${this.currentHero?.gold || 0}</strong>
                        </div>
                        <div class="player-inventory-preview">
                            <h5>🎒 Ваш инвентарь</h5>
                            <div class="inventory-slots">
                                ${this.generateInventoryPreview()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="shop-controls">
                    <button class="btn-control" onclick="game.systems.shop.leaveShop()">
                        🚪 Покинуть магазин
                    </button>
                </div>
            </div>
        `;
    }

    generateItemHTML(item) {
        const canAfford = this.currentHero && this.currentHero.gold >= item.price;
        const itemClass = canAfford ? 'shop-item affordable' : 'shop-item expensive';
        
        return `
            <div class="${itemClass}" onclick="game.systems.shop.buyItem(${item.originalId || item.id})" 
                 title="${item.description || ''}">
                <img src="${item.image}" alt="${item.name}" class="item-image" 
                     onerror="this.src='https://via.placeholder.com/50x50/333/fff?text=?'">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-type">${this.getItemTypeName(item.type)}</div>
                    <div class="item-stats">
                        ${item.fixed_damage ? `⚔️ ${item.fixed_damage} ` : ''}
                        ${item.fixed_armor ? `🛡️ ${item.fixed_armor} ` : ''}
                        ${item.fixed_health ? `❤️ ${item.fixed_health} ` : ''}
                    </div>
                    <div class="item-price ${canAfford ? 'can-buy' : 'no-money'}">
                        💰 ${item.price} 
                        ${!canAfford ? '<span class="not-enough">(недостаточно)</span>' : ''}
                    </div>
                    <div class="item-rarity ${item.rarity}">${this.getRarityName(item.rarity)}</div>
                </div>
            </div>
        `;
    }

    generateInventoryPreview() {
        if (!this.currentHero || !this.currentHero.inventory) {
            return '<div class="empty-inventory">Инвентарь пуст</div>';
        }

        // ⭐ ИСПРАВЛЕНИЕ: Простой превью без рекурсивных вызовов
        let previewHTML = '';
        const maxPreviewItems = 8;
        
        // Показываем первые несколько предметов
        for (let i = 0; i < Math.min(this.currentHero.inventory.length, maxPreviewItems); i++) {
            const itemId = this.currentHero.inventory[i];
            const equipmentSystem = window.game?.systems?.equipment;
            if (equipmentSystem) {
                const item = equipmentSystem.getItemById(itemId);
                if (item) {
                    previewHTML += `
                        <div class="inventory-slot" title="${item.name}">
                            <img src="${item.image}" alt="${item.name}" class="slot-image"
                                 onerror="this.style.display='none'">
                        </div>
                    `;
                } else {
                    previewHTML += '<div class="inventory-slot unknown">?</div>';
                }
            } else {
                previewHTML += '<div class="inventory-slot unknown">?</div>';
            }
        }

        // Заполняем пустые слоты
        for (let i = this.currentHero.inventory.length; i < maxPreviewItems; i++) {
            previewHTML += '<div class="inventory-slot empty"></div>';
        }

        return previewHTML;
    }

    getItemTypeName(type) {
        const types = {
            'weapon': '⚔️ Оружие',
            'armor': '🛡️ Броня', 
            'potion': '🧪 Зелье',
            'consumable': '🍖 Расходник',
            'magic': '🔮 Магия',
            'scroll': '📜 Свиток'
        };
        return types[type] || type;
    }

    getRarityName(rarity) {
        const names = {
            'common': 'Обычный',
            'uncommon': 'Необычный',
            'rare': 'Редкий',
            'epic': 'Эпический',
            'legendary': 'Легендарный'
        };
        return names[rarity] || rarity;
    }

    buyItem(itemId) {
        if (!this.currentShop) {
            console.error("❌ Нет активного магазина");
            return;
        }

        // Находим предмет в инвентаре магазина
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
                    this.updateShopInterface();
                    
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

    updateShopInterface() {
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

    // Перезаполнение магазина
    restockShop(shopId) {
        const shop = this.shops.get(shopId);
        if (!shop) return;

        // Проверяем, прошло ли достаточно времени для перезаполнения
        const timeSinceLastRestock = Date.now() - shop.lastRestock;
        if (timeSinceLastRestock < shop.restockTimer) {
            console.log(`⏰ Магазин ${shop.name} еще не готов к перезаполнению`);
            return;
        }

        // Здесь можно добавить логику перезаполнения
        // Например, обновить список товаров
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
console.log("📦 ShopSystem модуль загружен");
