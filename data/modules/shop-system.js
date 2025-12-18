"use strict";

class ShopSystem {
    constructor() {
        this.shops = new Map();
        this.currentShop = null;
        this.currentHero = null;
        this.currentCategory = 'all';
        this.currentSubcategory = 'all';
        this.searchQuery = '';
        this.currentSort = 'name';
        
        // СИСТЕМА КАТЕГОРИЙ СООТВЕТСТВУЮЩАЯ EQUIPMENT SYSTEM
        this.categories = {
            'all': { name: 'Все предметы', icon: '📦', subcategories: {} },
            'weapon': { 
                name: 'Оружие', 
                icon: '⚔️',
                subcategories: {
                    'all': 'Всё оружие',
                    'one_handed': 'Одноручное',
                    'two_handed': 'Двуручное',
                    'shield': 'Щиты'
                }
            },
            'helmet': {
                name: 'Шлемы',
                icon: '⛑️',
                subcategories: {
                    'all': 'Все шлемы',
                    'cloth': 'Ткань',
                    'leather': 'Кожа',
                    'hide': 'Шкура',
                    'fur': 'Мех',
                    'bone': 'Кости',
                    'plate': 'Пластины',
                    'chain': 'Кольчуга',
                    'plate_mail': 'Латы'
                }
            },
            'chest': {
                name: 'Броня',
                icon: '👕',
                subcategories: {
                    'all': 'Вся броня',
                    'cloth': 'Ткань',
                    'leather': 'Кожа',
                    'hide': 'Шкура',
                    'fur': 'Мех',
                    'bone': 'Кости',
                    'plate': 'Пластины',
                    'chain': 'Кольчуга',
                    'plate_mail': 'Латы'
                }
            },
            'gloves': {
                name: 'Перчатки',
                icon: '🧤',
                subcategories: {
                    'all': 'Все перчатки',
                    'cloth': 'Ткань',
                    'leather': 'Кожа',
                    'hide': 'Шкура',
                    'fur': 'Мех',
                    'bone': 'Кости',
                    'plate': 'Пластины',
                    'chain': 'Кольчуга',
                    'plate_mail': 'Латы'
                }
            },
            'legs': {
                name: 'Поножи',
                icon: '👖',
                subcategories: {
                    'all': 'Все поножи',
                    'cloth': 'Ткань',
                    'leather': 'Кожа',
                    'hide': 'Шкура',
                    'fur': 'Мех',
                    'bone': 'Кости',
                    'plate': 'Пластины',
                    'chain': 'Кольчуга',
                    'plate_mail': 'Латы'
                }
            },
            'boots': {
                name: 'Ботинки',
                icon: '👢',
                subcategories: {
                    'all': 'Все ботинки',
                    'cloth': 'Ткань',
                    'leather': 'Кожа',
                    'hide': 'Шкура',
                    'fur': 'Мех',
                    'bone': 'Кости',
                    'plate': 'Пластины',
                    'chain': 'Кольчуга',
                    'plate_mail': 'Латы'
                }
            },
            'set': {
                name: 'Сеты',
                icon: '⭐',
                subcategories: {
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
            },
            'potion': {
                name: 'Зелья',
                icon: '🧪',
                subcategories: {
                    'all': 'Все зелья'
                }
            },
            'consumable': {
                name: 'Расходники',
                icon: '🍖',
                subcategories: {
                    'all': 'Все расходники'
                }
            }
        };

        console.log("✅ ShopSystem инициализирована с совместимыми фильтрами");
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
        
        if (!shop) {
            shop = this.createShop(merchantCell, shopId);
            this.shops.set(shopId, shop);
        }

        this.currentShop = shop;
        this.showShopInterface(shop);
    }

    createShop(merchantCell, shopId) {
        const itemIds = merchantCell.shopItems || [];
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

    // Загрузка предметов по ID из EquipmentSystem
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
                // Определяем подкатегорию на основе типа и свойств предмета
                const subcategory = this.determineItemSubcategory(item);
                items.push({
                    ...item,
                    originalId: item.id,
                    subcategory: subcategory
                });
            } else {
                console.warn(`⚠️ Предмет с ID ${itemId} не найден`);
            }
        });

        console.log(`🛒 Загружено ${items.length} предметов для магазина`);
        return items;
    }

    // ОПРЕДЕЛЕНИЕ ПОДКАТЕГОРИИ ДЛЯ ФИЛЬТРАЦИИ
    determineItemSubcategory(item) {
        const type = item.type;
        
        switch(type) {
            case 'weapon':
                // Для оружия используем weaponType
                return item.weaponType || 'one_handed';
            
            case 'helmet':
            case 'chest':
            case 'gloves':
            case 'legs':
            case 'boots':
                // Для брони используем material
                return item.material || 'cloth';
            
            case 'potion':
                return 'all';
            
            case 'consumable':
                return 'all';
            
            default:
                return 'all';
        }
    }

    showShopInterface(shop) {
        const shopHTML = this.generateShopHTML(shop);
        
        const container = document.getElementById('overlay-container');
        if (container) {
            container.innerHTML = shopHTML;
            container.style.display = 'block';
            
            setTimeout(() => this.attachEventHandlers(), 100);
        }
    }

    generateShopHTML(shop) {
        const filteredItems = this.filterItemsByCategory(shop.inventory);
        const subcategories = this.getAvailableSubcategories(shop.inventory);
        
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

                    <!-- Поиск -->
                    <div class="shop-search">
                        <input type="text" id="shop-search-input" placeholder="🔍 Поиск предметов..." 
                               value="${this.searchQuery}">
                        <button class="clear-search" onclick="game.systems.shop.clearSearch()">✕</button>
                    </div>

                    <!-- Основные категории -->
                    <div class="shop-categories">
                        ${Object.entries(this.categories).map(([key, category]) => `
                            <div class="category-tab ${this.currentCategory === key ? 'active' : ''}" 
                                 data-category="${key}">
                                ${category.icon} ${category.name}
                                <span class="category-count">${this.getCategoryItemCount(shop.inventory, key)}</span>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Подкатегории -->
                    ${this.generateSubcategoriesHTML(subcategories)}

                    <!-- Сортировка -->
                    <div class="shop-sorting">
                        <select id="shop-sort">
                            <option value="name" ${this.currentSort === 'name' ? 'selected' : ''}>По названию</option>
                            <option value="price-asc" ${this.currentSort === 'price-asc' ? 'selected' : ''}>Цена (по возрастанию)</option>
                            <option value="price-desc" ${this.currentSort === 'price-desc' ? 'selected' : ''}>Цена (по убыванию)</option>
                            <option value="rarity" ${this.currentSort === 'rarity' ? 'selected' : ''}>По редкости</option>
                            <option value="type" ${this.currentSort === 'type' ? 'selected' : ''}>По типу</option>
                        </select>
                    </div>

                    <!-- Сетка предметов -->
                    <div class="merchant-items-container">
                        <div class="shop-content">
                            <div class="shop-category">
                                <div class="category-title">
                                    ${this.getCategoryTitle()} 
                                    ${filteredItems.length > 0 ? `<span class="items-count">(${filteredItems.length})</span>` : ''}
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

    // Генерация HTML для подкатегорий
    generateSubcategoriesHTML(subcategories) {
        if (this.currentCategory === 'all' || subcategories.length <= 1) {
            return '';
        }

        return `
            <div class="shop-subcategories">
                <div class="subcategory-tabs">
                    ${subcategories.map(subcat => `
                        <div class="subcategory-tab ${this.currentSubcategory === subcat.key ? 'active' : ''}" 
                             data-subcategory="${subcat.key}">
                            ${subcat.icon || ''} ${subcat.name}
                            <span class="subcategory-count">${subcat.count}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    generateItemHTML(item) {
        const canAfford = this.currentHero && this.currentHero.gold >= item.price;
        const isOwned = this.isItemOwned(item.originalId || item.id);
        const isSetItem = item.setName;
        const itemClass = `shop-item ${isOwned ? 'owned' : ''} ${!canAfford ? 'cannot-buy' : ''} rarity-${item.rarity || 'common'} ${isSetItem ? 'set-item' : ''}`;
        
        return `
            <div class="${itemClass}" onclick="game.systems.shop.showItemDetailModal(${item.originalId || item.id})">
                <div class="item-background">
                    ${isSetItem ? '<div class="set-item-indicator">⭐</div>' : ''}
                    <div class="item-image-container">
                        <img src="${item.image}" alt="${item.name}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="item-fallback" style="display: none;">
                            <span class="item-icon">${this.getItemIcon(item.type)}</span>
                        </div>
                    </div>
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-type">${this.getItemTypeName(item.type)} • ${this.getSubcategoryName(item.subcategory)}</div>
                        
                        <div class="item-stats-compact">
                            ${item.fixed_damage ? `<span>⚔️ ${item.fixed_damage}</span>` : ''}
                            ${item.fixed_armor ? `<span>🛡️ ${item.fixed_armor}</span>` : ''}
                            ${item.fixed_health ? `<span>❤️ ${item.fixed_health}</span>` : ''}
                            ${item.fixed_mana ? `<span>🔵 ${item.fixed_mana}</span>` : ''}
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
                            <div class="price">💰 ${this.formatPrice(item.price)}</div>
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

    // ФИЛЬТРАЦИЯ ПРЕДМЕТОВ ПО КАТЕГОРИИ И ПОДКАТЕГОРИИ
    filterItemsByCategory(items) {
        let filtered = items;

        // Фильтрация по поиску
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(item => 
                item.name.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query) ||
                item.type.toLowerCase().includes(query)
            );
        }

        // Фильтрация по основной категории
        if (this.currentCategory !== 'all') {
            if (this.currentCategory === 'set') {
                // Для категории сетов фильтруем по наличию setName
                filtered = filtered.filter(item => item.setName);
            } else {
                // Для остальных категорий - по типу предмета
                filtered = filtered.filter(item => item.type === this.currentCategory);
            }
        }

        // Фильтрация по подкатегории
        if (this.currentSubcategory !== 'all') {
            if (this.currentCategory === 'set') {
                // Для сетов - специальная фильтрация
                filtered = this.filterSetItemsBySubcategory(filtered, this.currentSubcategory);
            } else {
                // Для остальных категорий - по подкатегории
                filtered = filtered.filter(item => item.subcategory === this.currentSubcategory);
            }
        }

        return this.sortItems(filtered);
    }

    // Сортировка предметов
    sortItems(items) {
        return items.sort((a, b) => {
            switch(this.currentSort) {
                case 'price-asc':
                    return a.price - b.price;
                case 'price-desc':
                    return b.price - a.price;
                case 'rarity':
                    const rarityOrder = { 'common': 0, 'uncommon': 1, 'rare': 2, 'epic': 3, 'legendary': 4, 'mythic': 5 };
                    return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
                case 'type':
                    return a.type.localeCompare(b.type) || a.name.localeCompare(b.name);
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });
    }

    // ФИЛЬТРАЦИЯ СЕТОВ ПО ПОДКАТЕГОРИЯМ (совместимо с EquipmentSystem)
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

    // ПОЛУЧЕНИЕ ДОСТУПНЫХ ПОДКАТЕГОРИЙ (ИСПРАВЛЕННАЯ ВЕРСИЯ)
    getAvailableSubcategories(items) {
        if (this.currentCategory === 'all') {
            return [];
        }

        const categoryConfig = this.categories[this.currentCategory];
        if (!categoryConfig || !categoryConfig.subcategories) {
            return [];
        }

        const subcategories = [];
        
        // Добавляем "Все" подкатегорию ВСЕГДА
        subcategories.push({
            key: 'all',
            name: categoryConfig.subcategories.all,
            count: this.getSubcategoryItemCount(items, 'all'),
            icon: '📦'
        });

        // Добавляем остальные подкатегории ВСЕГДА (даже если в них нет предметов)
        Object.entries(categoryConfig.subcategories).forEach(([key, name]) => {
            if (key !== 'all') {
                const count = this.getSubcategoryItemCount(items, key);
                subcategories.push({
                    key: key,
                    name: name,
                    count: count,
                    icon: this.getSubcategoryIcon(key)
                });
            }
        });

        return subcategories;
    }

    // ВСПОМОГАТЕЛЬНЫЙ МЕТОД ДЛЯ ПОДСЧЕТА ПРЕДМЕТОВ В ПОДКАТЕГОРИИ
    getSubcategoryItemCount(items, subcategory) {
        if (this.currentCategory === 'all') return 0;
        
        if (subcategory === 'all') {
            if (this.currentCategory === 'set') {
                return items.filter(item => item.setName).length;
            } else {
                return items.filter(item => item.type === this.currentCategory).length;
            }
        }

        if (this.currentCategory === 'set') {
            return this.filterSetItemsBySubcategory(items, subcategory).length;
        } else {
            return items.filter(item => 
                item.type === this.currentCategory && 
                item.subcategory === subcategory
            ).length;
        }
    }

    // ОБРАБОТЧИКИ СОБЫТИЙ
    attachEventHandlers() {
        // Обработчики категорий
        const categoryTabs = document.querySelectorAll('.category-tab');
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                const category = tab.getAttribute('data-category');
                this.setCategory(category);
            });
        });

        // Обработчики подкатегорий
        const subcategoryTabs = document.querySelectorAll('.subcategory-tab');
        subcategoryTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation();
                const subcategory = tab.getAttribute('data-subcategory');
                this.setSubcategory(subcategory);
            });
        });

        // Обработчик поиска
        const searchInput = document.getElementById('shop-search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.addEventListener('input', (e) => {
                this.handleSearch(e.target.value);
            });
        }

        // Обработчик сортировки
        const sortSelect = document.getElementById('shop-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.handleSortChange(e.target.value);
            });
        }

        // Обработчики для увеличения картинок
        this.attachImageZoomHandlers();
    }

    // ДОБАВЬТЕ новый метод для обработки увеличения картинок
    attachImageZoomHandlers() {
        // Обработчик для картинок в сетке предметов
        const itemImages = document.querySelectorAll('.shop-item .item-image-container img');
        itemImages.forEach(img => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showImageZoom(e.target.src, e.target.alt);
            });
        });

        // Обработчик для картинки в деталях предмета
        const detailImage = document.querySelector('.item-detail-image-zoom');
        if (detailImage) {
            detailImage.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showImageZoom(e.target.src, e.target.alt);
            });
        }
    }

    // ДОБАВЬТЕ метод для показа увеличенной картинки
    showImageZoom(imageSrc, imageAlt) {
        const zoomHTML = `
            <div class="item-image-zoom-overlay" onclick="game.systems.shop.closeImageZoom()">
                <div class="zoom-content" onclick="event.stopPropagation()">
                    <img src="${imageSrc}" alt="${imageAlt}" class="item-image-zoomed">
                    <button class="close-zoom" onclick="game.systems.shop.closeImageZoom()">✕</button>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', zoomHTML);
    }

    // ДОБАВЬТЕ метод для закрытия увеличенной картинки
    closeImageZoom() {
        const zoomOverlay = document.querySelector('.item-image-zoom-overlay');
        if (zoomOverlay) {
            zoomOverlay.remove();
        }
    }

    // Установка категории
    setCategory(category) {
        this.currentCategory = category;
        this.currentSubcategory = 'all';
        
        // Плавное обновление контента
        this.updateShopContent();
    }

    // Установка подкатегории
    setSubcategory(subcategory) {
        this.currentSubcategory = subcategory;
        
        // Плавное обновление контента
        this.updateShopContent();
    }

    // ДОБАВЬТЕ метод для плавного обновления контента
    updateShopContent() {
        if (!this.currentShop) return;

        const container = document.querySelector('.merchant-items-container');
        if (!container) return;

        // Добавляем анимацию исчезновения
        container.style.opacity = '0';
        container.style.transform = 'translateY(20px)';

        setTimeout(() => {
            const filteredItems = this.filterItemsByCategory(this.currentShop.inventory);
            const subcategories = this.getAvailableSubcategories(this.currentShop.inventory);
            
            // Обновляем только необходимые части
            this.updateCategoryTabs();
            this.updateSubcategoryTabs(subcategories);
            this.updateItemsGrid(filteredItems);
            this.updateCategoryTitle(filteredItems.length);

            // Возвращаем анимацию появления
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';

            // Перепривязываем обработчики
            this.attachImageZoomHandlers();
        }, 200);
    }

    // ДОБАВЬТЕ вспомогательные методы для обновления частей интерфейса
    updateCategoryTabs() {
        const categoryTabs = document.querySelectorAll('.category-tab');
        categoryTabs.forEach(tab => {
            const category = tab.getAttribute('data-category');
            tab.classList.toggle('active', this.currentCategory === category);
            
            // Обновляем счетчик
            const countElement = tab.querySelector('.category-count');
            if (countElement) {
                const count = this.getCategoryItemCount(this.currentShop.inventory, category);
                countElement.textContent = count;
            }
        });
    }

    updateSubcategoryTabs(subcategories) {
        const subcategoriesContainer = document.querySelector('.shop-subcategories');
        
        if (this.currentCategory === 'all' || subcategories.length <= 1) {
            if (subcategoriesContainer) {
                subcategoriesContainer.style.display = 'none';
            }
            return;
        }

        if (!subcategoriesContainer) {
            // Создаем контейнер если его нет
            const categoriesContainer = document.querySelector('.shop-categories');
            if (categoriesContainer) {
                categoriesContainer.insertAdjacentHTML('afterend', this.generateSubcategoriesHTML(subcategories));
            }
        } else {
            // Обновляем существующий контейнер
            subcategoriesContainer.innerHTML = this.generateSubcategoriesHTML(subcategories);
            subcategoriesContainer.style.display = 'block';
        }

        // Привязываем обработчики для новых подкатегорий
        setTimeout(() => {
            const subcategoryTabs = document.querySelectorAll('.subcategory-tab');
            subcategoryTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const subcategory = tab.getAttribute('data-subcategory');
                    this.setSubcategory(subcategory);
                });
            });
        }, 0);
    }

    updateItemsGrid(filteredItems) {
        const itemsGrid = document.querySelector('.items-grid');
        const categoryTitle = document.querySelector('.category-title');
        
        if (!itemsGrid) return;

        if (filteredItems.length > 0) {
            itemsGrid.innerHTML = filteredItems.map(item => this.generateItemHTML(item)).join('');
            if (categoryTitle) {
                categoryTitle.style.display = 'block';
            }
        } else {
            itemsGrid.innerHTML = `
                <div class="empty-category">
                    🚫 В этой категории пока нет товаров
                </div>
            `;
        }
    }

    updateCategoryTitle(itemsCount) {
        const categoryTitle = document.querySelector('.category-title');
        if (categoryTitle) {
            const itemsCountElement = categoryTitle.querySelector('.items-count');
            if (itemsCountElement) {
                itemsCountElement.textContent = `(${itemsCount})`;
            } else if (itemsCount > 0) {
                categoryTitle.innerHTML = `${this.getCategoryTitle()} <span class="items-count">(${itemsCount})</span>`;
            } else {
                categoryTitle.textContent = this.getCategoryTitle();
            }
        }
    }

    // Обработка поиска
    handleSearch(query) {
        this.searchQuery = query;
        this.updateShopContent();
    }

    // Очистка поиска
    clearSearch() {
        this.searchQuery = '';
        const searchInput = document.getElementById('shop-search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        this.updateShopContent();
    }

    // Обработка сортировки
    handleSortChange(sortBy) {
        this.currentSort = sortBy;
        this.updateShopContent();
    }

    // ПОКУПКА ПРЕДМЕТА
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

        if (this.isItemOwned(item.originalId || item.id)) {
            window.game?.showNotification("❌ Этот предмет уже есть в инвентаре!", 'error');
            return;
        }

        if (this.currentHero.gold < item.price) {
            window.game?.showNotification("💰 Недостаточно золота!", 'error');
            return;
        }

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
                this.updateShopContent();
                this.updateMerchantStats();
                
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
    }

    // Обновление статистики торговца
    updateMerchantStats() {
        const goldAmount = document.querySelector('.gold-amount');
        const inventorySpace = document.querySelector('.inventory-space');
        
        if (goldAmount) {
            goldAmount.textContent = `💰 ${this.currentHero?.gold || 0} золота`;
        }
        if (inventorySpace) {
            inventorySpace.textContent = `🎒 ${this.getInventorySpace()}`;
        }
    }

    // ПОКАЗ ДЕТАЛЕЙ ПРЕДМЕТА
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
                            ${item.setName ? `
                                <div class="item-set-badge">
                                    ⭐ Часть сета: ${this.getSetName(item.setName)}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div class="item-detail-info">
                            <div class="item-name rarity-${item.rarity || 'common'}">${item.name}</div>
                            <div class="item-type">${this.getItemTypeName(item.type)} • ${this.getSubcategoryName(item.subcategory)}</div>
                            
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
                                ${item.fixed_mana ? `<div class="stat-line"><span>🔵 Мана:</span> <span class="stat-value">+${item.fixed_mana}</span></div>` : ''}
                                ${item.durability ? `<div class="stat-line"><span>⚙️ Прочность:</span> <span class="stat-value">${item.durability.current || item.durability}/${item.durability.max || item.durability}</span></div>` : ''}
                            </div>

                            ${item.setName ? `
                                <div class="item-set-details">
                                    <h5>⭐ Бонус набора</h5>
                                    <div class="set-info">
                                        <div class="set-bonus">${this.formatSetBonus(item.setName)}</div>
                                        <div class="set-description">${this.getSetDescription(item.setName)}</div>
                                        <div class="set-requirements">Требуется предметов: ${this.getSetRequiredPieces(item.setName)}</div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="item-requirements">
                                <h5>📋 Требования</h5>
                                ${item.requiredLevel ? `<div class="stat-line"><span>📈 Уровень:</span> <span class="stat-value">${item.requiredLevel}+</span></div>` : '<div class="stat-line"><span>📈 Уровень:</span> <span class="stat-value">Нет</span></div>'}
                                ${item.requiredStrength ? `<div class="stat-line"><span>💪 Сила:</span> <span class="stat-value">${item.requiredStrength}+</span></div>` : ''}
                                ${item.requiredDexterity ? `<div class="stat-line"><span>🎯 Ловкость:</span> <span class="stat-value">${item.requiredDexterity}+</span></div>` : ''}
                                ${item.requiredIntelligence ? `<div class="stat-line"><span>🧠 Интеллект:</span> <span class="stat-value">${item.requiredIntelligence}+</span></div>` : ''}
                            </div>
                            
                            <div class="item-actions">
                                <div class="price-section">
                                    <span class="buy-price">💰 ${this.formatPrice(item.price)} золота</span>
                                    ${item.sellPrice ? `<span class="sell-price">💸 ${this.formatPrice(item.sellPrice)} золота</span>` : ''}
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
            // Привязываем обработчики для модального окна
            this.attachImageZoomHandlers();
        }
    }

    closeItemDetailModal() {
        if (this.currentShop) {
            this.showShopInterface(this.currentShop);
        }
    }

   closeShop() {
    console.log("=== SHOP SYSTEM CLOSE SHOP ===");
    
    // 1. Скрываем интерфейс магазина
    const shopContainer = document.getElementById('overlay-container');
    if (shopContainer) {
        shopContainer.style.display = 'none';
        shopContainer.innerHTML = '';
    }
    
    // 2. Восстанавливаем карту через MapSystem
    const mapSystem = window.game?.systems?.map;
    if (mapSystem && mapSystem.currentTacticalMap) {
        // ВАЖНОЕ ИСПРАВЛЕНИЕ: Восстанавливаем ВЕСЬ интерфейс карты
        setTimeout(() => {
            // Используем showMapOverlay напрямую
            const container = document.getElementById('overlay-container');
            if (container && mapSystem.showMapOverlay) {
                mapSystem.showMapOverlay('tactical-map', container);
                
                // Обновляем интерфейс действий после отрисовки карты
                setTimeout(() => {
                    const cellKey = `${mapSystem.playerTacticalPosition.x},${mapSystem.playerTacticalPosition.y}`;
                    const currentCell = mapSystem.currentTacticalMap.cells[cellKey];
                    
                    if (currentCell && mapSystem.actionSystem) {
                        mapSystem.actionSystem.updateCellActionsUI(currentCell);
                        mapSystem.actionSystem.highlightSelectedCell(currentCell);
                    }
                    
                    console.log("✅ Карта полностью восстановлена");
                }, 500);
            }
        }, 100);
    }
    
    // 3. Сбрасываем состояние магазина
    this.currentShop = null;
    this.currentCategory = 'all';
    this.currentSubcategory = 'all';
    this.searchQuery = '';
    this.currentSort = 'name';
    
    console.log("⚠️ Магазин закрыт, интерфейс карты восстанавливается...");
}


    

    /**
     * Закрыть магазин и вернуться на карту (альтернативный метод)
     */
    closeShopAndReturnToMap() {
        console.log("🛒 Закрытие магазина и возврат на карту");
        
        // Закрываем магазин
        const shopContainer = document.getElementById('overlay-container');
        if (shopContainer) {
            shopContainer.style.display = 'none';
            shopContainer.innerHTML = '';
        }
        
        // Восстанавливаем карту
        const mapSystem = window.game?.systems?.map;
        if (mapSystem) {
            // Обновляем активный оверлей
            mapSystem.activeOverlay = 'tactical-map';
            
            // Обновляем интерфейс карты
            if (mapSystem.currentTacticalMap) {
                // Находим текущую клетку игрока
                const cellKey = `${mapSystem.playerTacticalPosition.x},${mapSystem.playerTacticalPosition.y}`;
                const currentCell = mapSystem.currentTacticalMap.cells[cellKey];
                
                // Обновляем интерфейс действий
                if (currentCell && mapSystem.actionSystem) {
                    console.log(`📍 Обновляем интерфейс действий для клетки [${mapSystem.playerTacticalPosition.x},${mapSystem.playerTacticalPosition.y}]`);
                    
                    // Небольшая задержка для гарантии обновления DOM
                    setTimeout(() => {
                        mapSystem.actionSystem.updateCellActionsUI(currentCell);
                        mapSystem.actionSystem.highlightSelectedCell(currentCell);
                        
                        // Перерисовываем карту
                        mapSystem.drawTacticalMap();
                        
                        console.log("✅ Магазин закрыт, возвращено управление карте");
                    }, 100);
                }
            }
        }
        
        // Сбрасываем состояние магазина
        this.currentShop = null;
        this.currentCategory = 'all';
        this.currentSubcategory = 'all';
        this.searchQuery = '';
        this.currentSort = 'name';
    }

    
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    getInventorySpace() {
        if (!this.currentHero || !this.currentHero.inventory) {
            return '0/0';
        }
        const maxSlots = this.currentHero.maxInventorySlots || 20;
        return `${this.currentHero.inventory.length}/${maxSlots}`;
    }

    isItemOwned(itemId) {
        if (!this.currentHero || !this.currentHero.inventory) {
            return false;
        }
        return this.currentHero.inventory.some(id => id === itemId || id === itemId.toString());
    }

    getCategoryItemCount(items, category) {
        if (category === 'all') return items.length;
        if (category === 'set') return items.filter(item => item.setName).length;
        return items.filter(item => item.type === category).length;
    }

    getCategoryTitle() {
        if (this.currentCategory === 'all') {
            return '📦 Все товары';
        }
        
        const category = this.categories[this.currentCategory];
        if (!category) return '📦 Товары';
        
        let title = `${category.icon} ${category.name}`;
        
        if (this.currentSubcategory !== 'all') {
            const subcategoryName = category.subcategories[this.currentSubcategory];
            if (subcategoryName) {
                title += ` • ${subcategoryName}`;
            }
        }
        
        return title;
    }

    formatPrice(price) {
        if (price >= 1000) {
            return (price / 1000).toFixed(1) + 'k';
        }
        return price;
    }

    formatBonus(bonus) {
        if (!bonus || bonus.type === 'none') return '';
        
        const bonusTypes = {
            'health_mult': '💪 Здоровье +',
            'damage_mult': '⚔️ Урон +',
            'armor_mult': '🛡️ Броня +',
            'gold_mult': '💰 Золото +',
            'health_regen_mult': '❤️ Регенерация +',
            'crit_chance': '🎯 Криты +',
            'armor_penetration': '💥 Пенетрация +',
            'vampirism': '🩸 Вампиризм +'
        };
        
        const value = bonus.value * 100;
        const formattedValue = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
        return `${bonusTypes[bonus.type] || 'Бонус'} ${formattedValue}%`;
    }

    getSetName(setName) {
        const equipmentSystem = window.game?.systems?.equipment;
        if (equipmentSystem && equipmentSystem.itemSets && equipmentSystem.itemSets[setName]) {
            return equipmentSystem.itemSets[setName].name || setName;
        }
        return setName;
    }

    formatSetBonus(setName) {
        const equipmentSystem = window.game?.systems?.equipment;
        if (equipmentSystem && equipmentSystem.itemSets && equipmentSystem.itemSets[setName]) {
            const set = equipmentSystem.itemSets[setName];
            return this.formatBonus(set.bonus);
        }
        return 'Бонус сета';
    }

    getSetDescription(setName) {
        const equipmentSystem = window.game?.systems?.equipment;
        if (equipmentSystem && equipmentSystem.itemSets && equipmentSystem.itemSets[setName]) {
            return equipmentSystem.itemSets[setName].description || 'Описание сета';
        }
        return 'Описание сета';
    }

    getSetRequiredPieces(setName) {
        const equipmentSystem = window.game?.systems?.equipment;
        if (equipmentSystem && equipmentSystem.itemSets && equipmentSystem.itemSets[setName]) {
            return equipmentSystem.itemSets[setName].requiredPieces || 6;
        }
        return 6;
    }

    getSubcategoryIcon(subcategory) {
        const icons = {
            // Оружие
            'one_handed': '⚔️', 'two_handed': '🪓', 'shield': '🛡️',
            // Материалы брони
            'cloth': '🧵', 'leather': '🐄', 'hide': '🦌', 'fur': '🐻', 
            'bone': '💀', 'plate': '🔩', 'chain': '⛓️', 'plate_mail': '🛡️',
            // Сеты
            'damage': '⚔️', 'crit': '🎯', 'penetration': '💥', 'rich': '💰',
            'vampire': '🩸', 'regen': '❤️', 'health': '💪', 'armor': '🛡️'
        };
        
        return icons[subcategory] || '📦';
    }

    getSubcategoryName(subcategory) {
        const names = {
            // Оружие
            'one_handed': 'Одноручное', 'two_handed': 'Двуручное', 'shield': 'Щит',
            // Материалы брони
            'cloth': 'Ткань', 'leather': 'Кожа', 'hide': 'Шкура', 'fur': 'Мех',
            'bone': 'Кости', 'plate': 'Пластины', 'chain': 'Кольчуга', 'plate_mail': 'Латы',
            // Сеты
            'damage': 'Урон', 'crit': 'Криты', 'penetration': 'Пенетрация', 'rich': 'Богатство',
            'vampire': 'Вампиризм', 'regen': 'Регенерация', 'health': 'Здоровье', 'armor': 'Броня'
        };
        
        return names[subcategory] || subcategory;
    }

    getItemIcon(itemType) {
        const icons = {
            'weapon': '⚔️',
            'helmet': '⛑️',
            'chest': '👕',
            'gloves': '🧤',
            'legs': '👖',
            'boots': '👢',
            'potion': '🧪',
            'consumable': '🍖'
        };
        return icons[itemType] || '📦';
    }

    getItemTypeName(type) {
        const names = {
            'weapon': 'Оружие',
            'helmet': 'Шлем',
            'chest': 'Броня',
            'gloves': 'Перчатки',
            'legs': 'Поножи',
            'boots': 'Ботинки',
            'potion': 'Зелье',
            'consumable': 'Расходник'
        };
        return names[type] || type;
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
        console.log("Текущая подкатегория:", this.currentSubcategory);
        console.log("Поисковый запрос:", this.searchQuery);
        console.log("Текущая сортировка:", this.currentSort);
        
        if (this.currentShop) {
            console.log("Товары в магазине:", this.currentShop.inventory.length);
            this.currentShop.inventory.forEach(item => {
                console.log(`  - ${item.name} (${item.price} золота, ${item.type}.${item.subcategory})`);
            });
        }
        console.groupEnd();
    }
}

window.ShopSystem = ShopSystem;
console.log("📦 ShopSystem модуль загружен с полной функциональностью и совместимыми фильтрами");
