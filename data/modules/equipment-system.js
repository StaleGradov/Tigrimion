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
            
            // Отладка
            this.debugItems();
            
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
            // Сеты будут здесь
        };
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
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

    debugItems() {
        console.log('=== ДЕБАГ ПРЕДМЕТОВ ===');
        console.log(`Всего предметов: ${this.items.length}`);
        
        const categories = {};
        this.items.forEach(item => {
            if (!categories[item.type]) categories[item.type] = 0;
            categories[item.type]++;
            
            if (item.type === 'weapon') {
                console.log(`Оружие: ${item.name} (${item.weaponType})`);
            } else if (item.material) {
                console.log(`${item.type}: ${item.name} (${item.material})`);
            }
        });
        
        console.log('Распределение по категориям:', categories);
    }

    // ========== МАГАЗИН И ФИЛЬТРАЦИЯ ==========
    showShop(category = 'all', subcategory = 'all') {
        if (!this.currentHero) return '';

        // Сохраняем текущее состояние
        this.currentCategory = category;
        this.currentSubcategory = subcategory;

        console.log('🔍 Открываем магазин:', { category, subcategory });

        const html = `
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
                            data-category="all"
                            onclick="game.systems.equipment.handleCategoryClick('all')">Все предметы</button>
                    <button class="category-tab ${category === 'weapon' ? 'active' : ''}" 
                            data-category="weapon"
                            onclick="game.systems.equipment.handleCategoryClick('weapon')">⚔️ Оружие</button>
                    <button class="category-tab ${category === 'helmet' ? 'active' : ''}" 
                            data-category="helmet"
                            onclick="game.systems.equipment.handleCategoryClick('helmet')">⛑️ Шлемы</button>
                    <button class="category-tab ${category === 'chest' ? 'active' : ''}" 
                            data-category="chest"
                            onclick="game.systems.equipment.handleCategoryClick('chest')">👕 Броня</button>
                    <button class="category-tab ${category === 'gloves' ? 'active' : ''}" 
                            data-category="gloves"
                            onclick="game.systems.equipment.handleCategoryClick('gloves')">🧤 Перчатки</button>
                    <button class="category-tab ${category === 'legs' ? 'active' : ''}" 
                            data-category="legs"
                            onclick="game.systems.equipment.handleCategoryClick('legs')">👖 Поножи</button>
                    <button class="category-tab ${category === 'boots' ? 'active' : ''}" 
                            data-category="boots"
                            onclick="game.systems.equipment.handleCategoryClick('boots')">👢 Ботинки</button>
                    <!-- НОВАЯ КАТЕГОРИЯ СЕТОВ -->
                    <button class="category-tab ${category === 'set' ? 'active' : ''}" 
                            data-category="set"
                            onclick="game.systems.equipment.handleCategoryClick('set')">✨ Сеты</button>
                </div>
                
                <div id="shop-subcategories-container"></div>
                
                <div class="shop-content" style="max-height: 60vh; overflow-y: auto;">
                    <div class="items-grid" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">
                        ${this.renderShopItems(category, subcategory)}
                    </div>
                </div>
            </div>
        `;

        // Откладываем инициализацию подкатегорий после рендера
        setTimeout(() => {
            this.initializeSubcategories(category, subcategory);
        }, 0);

        return html;
    }

    // Новая система подкатегорий
    getSubcategories() {
        return {
            'helmet': {
                'all': 'Все шлемы',
                'cloth': 'Ткань',
                'leather': 'Кожа', 
                'hide': 'Шкура',
                'fur': 'Мех',
                'bone': 'Кости',
                'plate': 'Пластины',
                'chain': 'Кольчуга',
                'plate_mail': 'Латы'
            },
            'chest': {
                'all': 'Вся броня',
                'cloth': 'Ткань',
                'leather': 'Кожа',
                'hide': 'Шкура', 
                'fur': 'Мех',
                'bone': 'Кости',
                'plate': 'Пластины',
                'chain': 'Кольчуга',
                'plate_mail': 'Латы'
            },
            'gloves': {
                'all': 'Все перчатки',
                'cloth': 'Ткань',
                'leather': 'Кожа',
                'hide': 'Шкура',
                'fur': 'Мех', 
                'bone': 'Кости',
                'plate': 'Пластины',
                'chain': 'Кольчуга',
                'plate_mail': 'Латы'
            },
            'legs': {
                'all': 'Все поножи',
                'cloth': 'Ткань',
                'leather': 'Кожа',
                'hide': 'Шкура',
                'fur': 'Мех',
                'bone': 'Кости',
                'plate': 'Пластины', 
                'chain': 'Кольчуга',
                'plate_mail': 'Латы'
            },
            'boots': {
                'all': 'Все ботинки',
                'cloth': 'Ткань',
                'leather': 'Кожа',
                'hide': 'Шкура',
                'fur': 'Мех',
                'bone': 'Кости',
                'plate': 'Пластины',
                'chain': 'Кольчуга',
                'plate_mail': 'Латы'
            },
            'weapon': {
                'all': 'Все оружие',
                'one_handed': 'Одноручное',
                'two_handed': 'Двуручное', 
                'shield': 'Щиты'
            },
            // НОВЫЕ ПОДКАТЕГОРИИ СЕТОВ
            'set': {
                'all': 'Все сеты',
                'damage': '⚔️ Урон',
                'crit': '🎯 Критический удар',
                'penetration': '💥 Игнор Брони', 
                'rich': '💰 Богатство',
                'vampire': '🩸 Вампиризм',
                'regen': '❤️ Регенерация',
                'health': '💪 Здоровье',
                'armor': '🛡️ Броня'
            }
        };
    }

    initializeSubcategories(category, currentSubcategory = 'all') {
        const container = document.getElementById('shop-subcategories-container');
        if (!container) return;

        const subcategories = this.getSubcategories()[category];
        if (!subcategories) {
            container.innerHTML = '';
            return;
        }

        let html = `<div class="shop-subcategories">
            <div class="subcategory-tabs">`;
        
        Object.entries(subcategories).forEach(([key, name]) => {
            const isActive = currentSubcategory === key;
            const count = this.getSubcategoryItemCount(category, key);
            html += `
                <button class="subcategory-tab ${isActive ? 'active' : ''}" 
                        data-subcategory="${key}"
                        onclick="game.systems.equipment.handleSubcategoryClick('${category}', '${key}')">
                    ${name}
                    <span class="subcategory-count">${count}</span>
                </button>
            `;
        });
        
        html += `</div></div>`;
        container.innerHTML = html;

        console.log('✅ Подкатегории инициализированы для:', category);
    }

    handleCategoryClick(category) {
        console.log('🎯 Нажата категория:', category);
        // Сохраняем состояние перед переходом
        this.currentCategory = category;
        this.currentSubcategory = 'all'; // Сбрасываем подкатегорию при смене категории
        
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

    handleSubcategoryClick(category, subcategory) {
        console.log('🎯 Нажата подкатегория:', { category, subcategory });
        
        // Сохраняем состояние
        this.currentCategory = category;
        this.currentSubcategory = subcategory;
        
        // Обновляем активные вкладки
        const allSubTabs = document.querySelectorAll('.subcategory-tab');
        allSubTabs.forEach(tab => tab.classList.remove('active'));
        
        const clickedTab = document.querySelector(`[data-subcategory="${subcategory}"]`);
        if (clickedTab) {
            clickedTab.classList.add('active');
        }
        
        // Обновляем отображение предметов
        this.updateShopItems(category, subcategory);
    }

    updateShopItems(category, subcategory) {
        const itemsGrid = document.querySelector('.items-grid');
        if (!itemsGrid) return;

        itemsGrid.innerHTML = this.renderShopItems(category, subcategory);
        
        // Перепривязываем обработчики
        setTimeout(() => {
            if (window.game && window.game.attachShopItemHandlers) {
                window.game.attachShopItemHandlers();
            }
        }, 100);
    }

    renderShopItems(category, subcategory = 'all') {
        const filteredItems = this.filterItemsByCategory(category, subcategory);
        console.log(`📦 Отображаем ${filteredItems.length} предметов для:`, { category, subcategory });

        if (filteredItems.length === 0) {
            return '<div class="empty-category">📭 Нет предметов в этой категории</div>';
        }

        return filteredItems.map(item => this.renderShopItem(item)).join('');
    }

    // Улучшенная фильтрация
    filterItemsByCategory(category, subcategory = 'all') {
        console.log(`🔍 Фильтрация: категория=${category}, подкатегория=${subcategory}`);
        
        // Показываем ВСЕ предметы (без фильтра по уровню)
        let filteredItems = this.items;
        
        // Фильтрация по основной категории
        if (category !== 'all') {
            if (category === 'set') {
                // Для категории сетов фильтруем предметы, которые принадлежат какому-либо сету
                filteredItems = filteredItems.filter(item => item.setName && this.itemSets[item.setName]);
            } else {
                filteredItems = filteredItems.filter(item => this.doesItemMatchCategory(item, category));
            }
        }

        // Фильтрация по подкатегории сетов
        if (subcategory !== 'all' && category === 'set') {
            filteredItems = this.filterSetItemsBySubcategory(filteredItems, subcategory);
        }
        // Фильтрация по подкатегории для остальных категорий
        else if (subcategory !== 'all' && category !== 'all') {
            filteredItems = this.filterItemsBySubcategory(filteredItems, category, subcategory);
        }

        console.log(`📊 Результат фильтрации: ${filteredItems.length} предметов`);
        
        // Сортируем по цене для удобства
        return filteredItems.sort((a, b) => a.price - b.price);
    }

    // ========== ФИЛЬТРАЦИЯ СЕТОВ ПО ПОДКАТЕГОРИЯМ ==========
    filterSetItemsBySubcategory(items, subcategory) {
        const setBonusMap = {
            'damage': ['set_beginner', 'set_warrior', 'set_guardian', 'set_hunter', 'set_complete', 'set_king'],
            'crit': ['set_crit1', 'set_crit2', 'set_crit3', 'set_crit4', 'set_crit5', 'set_crit6'],
            'penetration': ['set_penetration1', 'set_penetration2', 'set_penetration3', 'set_penetration4', 'set_penetration5', 'set_penetration6'],
            'rich': ['set_rich1', 'set_rich2', 'set_rich3', 'set_rich4', 'set_rich5', 'set_rich6'],
            'vampire': ['set_vampire1', 'set_vampire2', 'set_vampire3', 'set_vampire4', 'set_vampire5', 'set_vampire6'],
            'regen': ['set_regen1', 'set_regen2', 'set_regen3', 'set_regen4', 'set_regen5', 'set_regen6'],
            'health': ['set_health1', 'set_health2', 'set_health3', 'set_health4', 'set_health5', 'set_health6'],
            'armor': ['set_bron1', 'set_bron2', 'set_bron3', 'set_bron4', 'set_bron5', 'set_bron6']
        };

        if (subcategory === 'all') return items;
        
        const allowedSets = setBonusMap[subcategory] || [];
        return items.filter(item => {
            return item.setName && allowedSets.includes(item.setName);
        });
    }

    // Метод из старой версии - проверка соответствия категории
    doesItemMatchCategory(item, category) {
        if (category === 'all') return true;
        if (category === 'weapon') {
            // Включаем ВСЕ оружие включая щиты
            return item.type === 'weapon';
        }
        return item.type === category;
    }

    // Метод из старой версии - фильтрация по подкатегории
    filterItemsBySubcategory(items, category, subcategory) {
        if (!subcategory || subcategory === 'all') return items;
        
        return items.filter(item => {
            if (item.type !== category) return false;
            
            if (category === 'weapon') {
                // Для оружия фильтруем по weaponType
                return item.weaponType === subcategory;
            } else {
                // Для брони фильтруем по материалу
                const itemMaterial = item.material || 'cloth';
                return itemMaterial === subcategory;
            }
        });
    }

    getSubcategoryItemCount(category, subcategory) {
        const items = this.filterItemsByCategory(category, subcategory);
        return items.length;
    }

    renderShopItem(item) {
        const isOwned = this.isItemOwned(item.id);
        const canAfford = this.currentHero.gold >= item.price;
        const hasSpace = this.currentHero.inventory.length < 10;
        const canBuy = !isOwned && canAfford && hasSpace;
        const frameColor = this.getItemFrameColor(item.rarity);
        
        // Получаем информацию о бонусе предмета
        const bonusInfo = this.getBonusDisplayInfo(item);
        
        return `
            <div class="shop-item" data-item-id="${item.id}" onclick="game.showItemDetailModal(${item.id})">
                <div class="item-background rarity-${item.rarity}" style="border-color: ${frameColor};">
                    <div class="item-image-container">
                        <img src="${item.image}" alt="${item.name}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="item-fallback" style="display: none;">
                            <span class="item-icon">${this.getItemTypeIcon(item.type)}</span>
                        </div>
                    </div>
                    
                    <div class="item-info">
                        <div class="item-name" style="color: ${frameColor};">${item.name}</div>
                        <div class="item-type">${this.getItemTypeName(item.type)}</div>
                        
                        <div class="item-stats-compact">
                            ${item.fixed_damage ? `<span>⚔️${item.fixed_damage}</span>` : ''}
                            ${item.fixed_armor ? `<span>🛡️${item.fixed_armor}</span>` : ''}
                            ${item.fixed_health ? `<span>❤️${item.fixed_health}</span>` : ''}
                            <!-- ОТОБРАЖЕНИЕ БОНУСА ПРЕДМЕТА -->
                            ${bonusInfo ? `<span class="item-bonus-display">${bonusInfo}</span>` : ''}
                        </div>
                        
                        <!-- ОТОБРАЖЕНИЕ ИНФОРМАЦИИ О СЕТЕ -->
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

    // ========== ПОЛУЧЕНИЕ ИНФОРМАЦИИ О БОНУСЕ ДЛЯ ОТОБРАЖЕНИЯ ==========
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

    // ========== ДЕТАЛИ ПРЕДМЕТА И ПОКУПКА ==========
    showItemDetails(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        const isOwned = this.isItemOwned(item.id);
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
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
                                     class="item-detail-image-zoom">
                                <div class="item-fallback-large" style="display: none;">
                                    <span class="item-icon-large">${this.getItemTypeIcon(item.type)}</span>
                                </div>
                            </div>
                            <div class="item-rarity ${item.rarity}" style="background: ${frameColor};">
                                ${this.getRarityName(item.rarity)}
                            </div>
                        </div>
                        
                        <div class="item-detail-info">
                            <div class="item-description">${item.description}</div>
                            
                            <!-- ИНФОРМАЦИЯ О БОНУСЕ ПРЕДМЕТА -->
                            ${item.bonus && item.bonus.type !== 'none' ? `
                                <div class="item-bonus-info">
                                    <h5>🎯 Бонус предмета:</h5>
                                    <div class="bonus-display" style="color: #4cc9f0; font-weight: bold;">
                                        ${this.formatBonus(item.bonus)}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="item-stats-detailed">
                                <h5>Характеристики:</h5>
                                ${item.fixed_damage ? `<div class="stat-line"><span>⚔️ Урон:</span> <span>+${item.fixed_damage}</span></div>` : ''}
                                ${item.fixed_armor ? `<div class="stat-line"><span>🛡️ Броня:</span> <span>+${item.fixed_armor}</span></div>` : ''}
                                ${item.fixed_health ? `<div class="stat-line"><span>❤️ Здоровье:</span> <span>+${item.fixed_health}</span></div>` : ''}
                            </div>
                            
                            <!-- ИНФОРМАЦИЯ О СЕТЕ -->
                            ${item.setName && this.itemSets[item.setName] ? `
                                <div class="item-set-details">
                                    <h5>✨ Бонус сета:</h5>
                                    <div class="set-info">
                                        <strong>${this.itemSets[item.setName].name}</strong>
                                        <div class="set-bonus">${this.formatBonus(this.itemSets[item.setName].bonus)}</div>
                                        <div class="set-description">${this.itemSets[item.setName].description}</div>
                                        <div class="set-requirements">Требуется предметов: ${this.itemSets[item.setName].requiredPieces}/6</div>
                                    </div>
                                </div>
                            ` : ''}
                            
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
        
        // ВОССТАНАВЛИВАЕМ магазин с сохраненной категорией
        if (window.game && window.game.showOverlay) {
            // Используем текущие сохраненные категории
            const currentCategory = this.currentCategory || 'all';
            const currentSubcategory = this.currentSubcategory || 'all';
            
            // Показываем магазин с сохраненным состоянием
            const container = document.getElementById('overlay-container');
            if (container) {
                container.innerHTML = this.showShop(currentCategory, currentSubcategory);
                setTimeout(() => {
                    if (window.game.attachShopItemHandlers) {
                        window.game.attachShopItemHandlers();
                    }
                }, 100);
            }
        }
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

        if (this.isItemOwned(itemId)) {
            this.showNotification('❌ У вас уже есть этот предмет');
            return;
        }

        this.currentHero.gold = parseFloat((this.currentHero.gold - item.price).toFixed(2));
        this.addItemToInventory(itemId);
        
        // ⭐ СОХРАНЕНИЕ ПОСЛЕ ПОКУПКИ ⭐
        if (window.game) window.game.saveGame();
        
        this.showNotification(`🛒 Куплено: ${item.name} за ${item.price.toFixed(2)} золота`);
        this.closeItemModal();
        // НЕ закрываем оверлей полностью, а обновляем магазин с сохраненным состоянием
        this.refreshShopWithSavedState();
    }

    // ========== ПРОДАЖА ПРЕДМЕТА ИЗ ИНВЕНТАРЯ ==========
    sellItemFromInventory(itemId) {
        const item = this.getItemById(itemId);
        if (!item) {
            this.showNotification('❌ Предмет не найден');
            return;
        }

        // Проверяем, не надет ли предмет
        const isEquipped = Object.values(this.currentHero.equipment).includes(itemId);
        if (isEquipped) {
            this.showNotification('❌ Нельзя продать надетый предмет! Сначала снимите его.');
            return;
        }

        if (!confirm(`Продать "${item.name}"?\n\nЦена продажи: ${(item.sellPrice || Math.floor(item.price * 0.5)).toFixed(2)} золота`)) {
            return;
        }

        // Убираем предмет из инвентаря
        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);
        
        // Добавляем золото
        const sellPrice = item.sellPrice || Math.floor(item.price * 0.5);
        this.currentHero.gold = parseFloat((this.currentHero.gold + sellPrice).toFixed(2));

        // ⭐ СОХРАНЕНИЕ ПОСЛЕ ПРОДАЖИ ⭐
        if (window.game) window.game.saveGame();

        this.showNotification(`💰 Продано: ${item.name} за ${sellPrice.toFixed(2)} золота`);
        
        // Обновляем интерфейс инвентаря
        this.refreshInventory();
    }

    sellItem(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        if (!this.isItemOwned(itemId)) {
            this.showNotification('❌ Предмет не найден в инвентаре');
            return;
        }

        // Проверяем, не надет ли предмет
        const isEquipped = Object.values(this.currentHero.equipment).includes(itemId);
        if (isEquipped) {
            this.showNotification('❌ Нельзя продать надетый предмет! Сначала снимите его.');
            return;
        }

        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);
        const sellPrice = item.sellPrice || Math.floor(item.price * 0.5);
        this.currentHero.gold = parseFloat((this.currentHero.gold + sellPrice).toFixed(2));

        // ⭐ СОХРАНЕНИЕ ПОСЛЕ ПРОДАЖИ ⭐
        if (window.game) window.game.saveGame();

        this.showNotification(`💰 Продано: ${item.name} за ${sellPrice.toFixed(2)} золота`);
        this.closeItemModal();
        this.refreshShopWithSavedState();
    }

    // ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСОВ ==========
    refreshInventory() {
        const container = document.getElementById('overlay-container');
        if (container) {
            container.innerHTML = this.showInventory();
        }
    }

    refreshShopWithSavedState() {
        const currentCategory = this.currentCategory || 'all';
        const currentSubcategory = this.currentSubcategory || 'all';
        
        const container = document.getElementById('overlay-container');
        if (container) {
            container.innerHTML = this.showShop(currentCategory, currentSubcategory);
            setTimeout(() => {
                if (window.game && window.game.attachShopItemHandlers) {
                    window.game.attachShopItemHandlers();
                }
            }, 100);
        }
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
            const sellPrice = item.sellPrice || Math.floor(item.price * 0.5);
            
            return `
                <div class="inventory-item" data-rarity="${item.rarity}" style="border-color: ${frameColor};">
                    <div class="inventory-item-image" onclick="game.systems.equipment.showInventoryItemDetails(${itemId})">
                        <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
                    </div>
                    <div class="inventory-item-info">
                        <strong style="color: ${frameColor};" onclick="game.systems.equipment.showInventoryItemDetails(${itemId})">${item.name}</strong>
                        <div class="item-stats">
                            ${item.fixed_damage ? `<span>⚔️ +${item.fixed_damage}</span>` : ''}
                            ${item.fixed_armor ? `<span>🛡️ +${item.fixed_armor}</span>` : ''}
                            ${item.fixed_health ? `<span>❤️ +${item.fixed_health}</span>` : ''}
                        </div>
                        <small>${item.description}</small>
                        <div class="inventory-item-actions">
                            ${isEquipped ? 
                                '<span style="color: #4ade80;">✓ Надето</span>' : 
                                `<button class="btn-small" onclick="game.systems.equipment.equipItem(${itemId})">🎯 Надеть</button>`
                            }
                            <button class="btn-small btn-sell" onclick="game.systems.equipment.sellItemFromInventory(${itemId})">
                                💰 Продать (${sellPrice})
                            </button>
                        </div>
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

    // ========== ДЕТАЛИ ПРЕДМЕТА В ИНВЕНТАРЕ ==========
    showInventoryItemDetails(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        const isEquipped = Object.values(this.currentHero.equipment).includes(itemId);
        const canSell = !isEquipped;
        const sellPrice = item.sellPrice || Math.floor(item.price * 0.5);
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
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
                                     class="item-detail-image-zoom">
                                <div class="item-fallback-large" style="display: none;">
                                    <span class="item-icon-large">${this.getItemTypeIcon(item.type)}</span>
                                </div>
                            </div>
                            <div class="item-rarity ${item.rarity}" style="background: ${frameColor};">
                                ${this.getRarityName(item.rarity)}
                            </div>
                        </div>
                        
                        <div class="item-detail-info">
                            <div class="item-description">${item.description}</div>
                            
                            <!-- ИНФОРМАЦИЯ О БОНУСЕ ПРЕДМЕТА -->
                            ${item.bonus && item.bonus.type !== 'none' ? `
                                <div class="item-bonus-info">
                                    <h5>🎯 Бонус предмета:</h5>
                                    <div class="bonus-display" style="color: #4cc9f0; font-weight: bold;">
                                        ${this.formatBonus(item.bonus)}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="item-stats-detailed">
                                <h5>Характеристики:</h5>
                                ${item.fixed_damage ? `<div class="stat-line"><span>⚔️ Урон:</span> <span>+${item.fixed_damage}</span></div>` : ''}
                                ${item.fixed_armor ? `<div class="stat-line"><span>🛡️ Броня:</span> <span>+${item.fixed_armor}</span></div>` : ''}
                                ${item.fixed_health ? `<div class="stat-line"><span>❤️ Здоровье:</span> <span>+${item.fixed_health}</span></div>` : ''}
                            </div>
                            
                            <!-- ИНФОРМАЦИЯ О СЕТЕ -->
                            ${item.setName && this.itemSets[item.setName] ? `
                                <div class="item-set-details">
                                    <h5>✨ Бонус сета:</h5>
                                    <div class="set-info">
                                        <strong>${this.itemSets[item.setName].name}</strong>
                                        <div class="set-bonus">${this.formatBonus(this.itemSets[item.setName].bonus)}</div>
                                        <div class="set-description">${this.itemSets[item.setName].description}</div>
                                        <div class="set-requirements">Требуется предметов: ${this.itemSets[item.setName].requiredPieces}/6</div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="item-actions">
                                <div class="price-section">
                                    <span class="sell-price">💸 Продать: ${sellPrice.toFixed(2)} золота</span>
                                    ${isEquipped ? '<span style="color: #4ade80;">✓ Надето</span>' : ''}
                                </div>
                                
                                <div class="action-buttons">
                                    ${!isEquipped ? 
                                        `<button class="btn-primary" onclick="game.systems.equipment.equipItem(${item.id})">🎯 Надеть</button>` : 
                                        `<button class="btn-secondary" onclick="game.systems.equipment.unequipItem('${this.getEquipmentSlot(item)}')">📦 Снять</button>`
                                    }
                                    ${canSell ? 
                                        `<button class="btn-sell" onclick="game.systems.equipment.sellItemFromInventory(${item.id})">💰 Продать</button>` : 
                                        `<button class="btn-secondary disabled" disabled>❌ Нельзя продать надетый предмет</button>`
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

    equipItem(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        // Использование зелья
        if (item.type === 'potion') {
            this.usePotion(item);
            return;
        }

        // Определяем слот для предмета
        const slot = this.getEquipmentSlot(item);
        if (!slot) {
            this.showNotification(`❌ Нельзя экипировать ${item.name}`);
            return;
        }

        // Проверка совместимости оружия
        if (!this.canEquipWeapon(item, this.currentHero.equipment)) {
            this.showNotification(`❌ Нельзя экипировать ${item.name} - несовместимо с текущим оружием`);
            return;
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

        // ⭐ ДОБАВЛЯЕМ ПЕРЕСЧЕТ ХАРАКТЕРИСТИК
        if (window.game && window.game.systems && window.game.systems.level) {
            // Обновляем текущее здоровье с учетом нового максимума
            const newStats = window.game.systems.level.calculateHeroStats(this.currentHero, window.game.systems.bonus);
            this.currentHero.currentHealth = newStats.maxHealth; // Полное восстановление при экипировке
        }

        // ⭐ СОХРАНЕНИЕ ПОСЛЕ ЭКИПИРОВКИ ⭐
        if (window.game) window.game.saveGame();

        this.showNotification(`🎯 Надето: ${item.name}`);
        
        // Обновляем интерфейс
        game.hideOverlay();
        game.showHeroGameScreen();
    }

    // ========== СНЯТИЕ ПРЕДМЕТА ==========
    unequipItem(slot) {
        if (!this.currentHero) return;
        
        const itemId = this.currentHero.equipment[slot];
        if (!itemId) {
            this.showNotification('❌ В этом слоте ничего не надето');
            return;
        }

        const item = this.getItemById(itemId);
        if (!item) return;

        // Проверяем место в инвентаре
        if (this.currentHero.inventory.length >= 10) {
            this.showNotification('❌ Инвентарь полон! Максимум 10 предметов');
            return;
        }

        // Особый случай: если снимаем двуручное оружие
        if (item.weaponType === 'two_handed') {
            this.currentHero.equipment.main_hand = null;
            this.currentHero.equipment.off_hand = null;
        } else {
            this.currentHero.equipment[slot] = null;
        }

        // Добавляем предмет обратно в инвентарь
        this.currentHero.inventory.push(itemId);
        
        // ⭐ ДОБАВЛЯЕМ ПЕРЕСЧЕТ ХАРАКТЕРИСТИК
        if (window.game && window.game.systems && window.game.systems.level) {
            const newStats = window.game.systems.level.calculateHeroStats(this.currentHero, window.game.systems.bonus);
            // Сохраняем текущий процент здоровья
            const healthPercent = this.currentHero.currentHealth / (this.currentHero.currentHealth || 1);
            this.currentHero.currentHealth = Math.max(1, Math.floor(newStats.maxHealth * healthPercent));
        }
        
        // ⭐ СОХРАНЕНИЕ ПОСЛЕ СНЯТИЯ ⭐
        if (window.game) window.game.saveGame();
        
        this.showNotification(`📦 Снято: ${item.name}`);
        
        // Обновляем интерфейс
        if (window.game) {
            window.game.hideOverlay();
            window.game.showHeroGameScreen();
        }
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
        
        // ⭐ СОХРАНЕНИЕ ПОСЛЕ СНЯТИЯ ⭐
        if (window.game) window.game.saveGame();
        
        return true;
    }

    usePotion(item) {
        if (item.type !== 'potion') return;

        if (item.heal) {
            // Здесь нужно добавить логику лечения героя
            this.showNotification(`❤️ Использовано: ${item.name} (+${item.heal} здоровья)`);
        }

        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== item.id);
        
        // ⭐ СОХРАНЕНИЕ ПОСЛЕ ИСПОЛЬЗОВАНИЯ ⭐
        if (window.game) window.game.saveGame();
        
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

    getItemFrameColor(rarity) {
        const colors = {
            'common': '#9ca3af',
            'uncommon': '#4ade80',
            'rare': '#4cc9f0',
            'epic': '#a855f7',
            'legendary': '#f59e0b',
            'mythic': '#ff6b6b'
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
            'legendary': 'Легендарный',
            'mythic': 'Мифический'
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
        console.log("🔔 EquipmentSystem:", message);
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
                material: "leather",
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
