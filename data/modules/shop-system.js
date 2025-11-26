class ShopSystem {
    constructor() {
        this.shops = new Map(); // shopId -> Shop
        this.currentShop = null;
    }

    // Открытие магазина при заходе на клетку
    openShop(merchantCell) {
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
                items.push({...item}); // Копируем предмет
            } else {
                console.warn(`⚠️ Предмет с ID ${itemId} не найден`);
            }
        });

        return items;
    }

    showShopInterface(shop) {
        const shopHTML = this.generateShopHTML(shop);
        
        if (window.game) {
            window.game.showOverlay('shop', shopHTML);
        }
    }

    generateShopHTML(shop) {
        const hero = window.game?.systems?.map?.currentHero || window.game?.currentHero;
        
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
                            💰 Золото: <strong>${hero?.gold || 0}</strong>
                        </div>
                        <div class="player-inventory-preview">
                            <h5>🎒 Ваш инвентарь</h5>
                            <!-- Можно добавить превью инвентаря -->
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
        const hero = window.game?.systems?.map?.currentHero || window.game?.currentHero;
        const canAfford = hero && hero.gold >= item.price;
        const itemClass = canAfford ? 'shop-item affordable' : 'shop-item expensive';
        
        return `
            <div class="${itemClass}" onclick="game.systems.shop.buyItem(${item.id})" 
                 title="${item.description || ''}">
                <img src="${item.image}" alt="${item.name}" class="item-image" 
                     onerror="this.src='https://via.placeholder.com/50x50/333/fff?text=?'">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-type">${this.getItemTypeName(item.type)}</div>
                    <div class="item-stats">
                        ${item.fixed_damage ? `⚔️ ${item.fixed_damage} ` : ''}
                        ${item.fixed_armor ? `🛡️ ${item.fixed_armor} ` : ''}
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
        const item = this.currentShop.inventory.find(i => i.id === itemId);
        if (!item) return;

        const hero = window.game?.systems?.map?.currentHero || window.game?.currentHero;
        if (!hero) {
            window.game?.showNotification("❌ Герой не выбран!", 'error');
            return;
        }

        if (hero.gold >= item.price) {
            const equipmentSystem = window.game.systems.equipment;
            if (equipmentSystem && equipmentSystem.addItemToHero) {
                const itemAdded = equipmentSystem.addItemToHero(hero, item.id);
                if (itemAdded) {
                    hero.gold -= item.price;
                    
                    // Убираем предмет из магазина (или оставляем для перезаполнения)
                    // this.currentShop.inventory = this.currentShop.inventory.filter(i => i.id !== itemId);
                    
                    this.updateShopInterface();
                    
                    if (window.game) {
                        window.game.showNotification(`✅ Куплено: ${item.name}`, 'success');
                    }
                } else {
                    window.game.showNotification("🎒 Недостаточно места в инвентаре!", 'error');
                }
            }
        } else {
            window.game.showNotification("💰 Недостаточно золота!", 'error');
        }
    }

    updateShopInterface() {
        if (this.currentShop) {
            this.showShopInterface(this.currentShop);
        }
    }

    closeShop() {
        this.currentShop = null;
        if (window.game) {
            window.game.hideOverlay();
        }
    }

    leaveShop() {
        this.closeShop();
    }
}
