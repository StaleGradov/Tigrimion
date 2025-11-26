"use strict";

class ShopSystem {
    constructor() {
        this.shops = new Map();
        this.currentShop = null;
        this.currentHero = null;
        this.currentCategory = 'all';
        this.currentSubcategory = 'all';
        this.searchQuery = '';
        
        // Полная система категорий
        this.categories = {
            'all': { name: 'Все предметы', icon: '📦', subcategories: {} },
            'weapon': { 
                name: 'Оружие', 
                icon: '⚔️',
                subcategories: {
                    'all': 'Всё оружие',
                    'sword': 'Мечи',
                    'axe': 'Топоры', 
                    'mace': 'Булавы',
                    'dagger': 'Кинжалы',
                    'bow': 'Луки',
                    'staff': 'Посохи',
                    'wand': 'Жезлы',
                    'spear': 'Копья'
                }
            },
            'armor': {
                name: 'Броня',
                icon: '🛡️',
                subcategories: {
                    'all': 'Вся броня',
                    'helmet': 'Шлемы',
                    'chest': 'Нагрудники',
                    'gloves': 'Перчатки',
                    'boots': 'Сапоги',
                    'pants': 'Поножи',
                    'shield': 'Щиты',
                    'cloak': 'Плащи',
                    'amulet': 'Амулеты',
                    'ring': 'Кольца'
                }
            },
            'potion': {
                name: 'Зелья',
                icon: '🧪', 
                subcategories: {
                    'all': 'Все зелья',
                    'health': 'Здоровья',
                    'mana': 'Маны',
                    'stamina': 'Выносливости',
                    'buff': 'Усиления',
                    'debuff': 'Ослабления',
                    'restoration': 'Восстановления'
                }
            },
            'consumable': {
                name: 'Расходники',
                icon: '🍖',
                subcategories: {
                    'all': 'Все расходники',
                    'food': 'Еда',
                    'scroll': 'Свитки',
                    'arrow': 'Стрелы',
                    'throwable': 'Метательное',
                    'reagent': 'Реагенты',
                    'key': 'Ключи'
                }
            },
            'material': {
                name: 'Материалы',
                icon: '⛏️',
                subcategories: {
                    'all': 'Все материалы',
                    'ore': 'Руда',
                    'herb': 'Травы',
                    'leather': 'Кожа',
                    'cloth': 'Ткань',
                    'gem': 'Самоцветы',
                    'enchanted': 'Зачарованные',
                    'wood': 'Древесина'
                }
            },
            'set': {
                name: 'Сеты',
                icon: '⭐',
                subcategories: {
                    'all': 'Все сеты',
                    'warrior': 'Воинские',
                    'mage': 'Магические',
                    'rogue': 'Разбойничьи',
                    'archer': 'Лучников',
                    'tank': 'Танков',
                    'healer': 'Целителей',
                    'hybrid': 'Гибридные'
                }
            },
            'special': {
                name: 'Особые',
                icon: '🎁',
                subcategories: {
                    'all': 'Все особые',
                    'quest': 'Квестовые',
                    'unique': 'Уникальные',
                    'artifact': 'Артефакты',
                    'event': 'Ивентовые'
                }
            }
        };

        // Конфигурация сетов
        this.itemSets = {
            'set_beginner': {
                name: 'Набор новичка',
                bonus: { type: 'health_mult', value: 0.1 },
                pieces: 2,
                description: '+10% к здоровью при экипировке 2 предметов'
            },
            'set_warrior': {
                name: 'Воинский набор',
                bonus: { type: 'damage_mult', value: 0.15 },
                pieces: 3,
                description: '+15% к урону при экипировке 3 предметов'
            },
            'set_guardian': {
                name: 'Страж',
                bonus: { type: 'armor_mult', value: 0.2 },
                pieces: 4,
                description: '+20% к броне при экипировке 4 предметов'
            },
            'set_mage': {
                name: 'Магический набор',
                bonus: { type: 'mana_mult', value: 0.25 },
                pieces: 3,
                description: '+25% к мане при экипировке 3 предметов'
            }
        };
        
        console.log("✅ ShopSystem инициализирована с полной системой категорий");
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
            lastRestock: Date.now(),
            merchantType: merchantCell.merchantType || 'general'
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
                    originalId: item.id,
                    subcategory: this.determineItemSubcategory(item),
                    setInfo: item.setName ? this.itemSets[item.setName] : null
                });
            } else {
                console.warn(`⚠️ Предмет с ID ${itemId} не найден`);
            }
        });

        console.log(`🛒 Загружено ${items.length} предметов для магазина`);
        return items;
    }

    // Определение подкатегории предмета
    determineItemSubcategory(item) {
        const type = item.type;
        const name = item.name?.toLowerCase() || '';
        const subtype = item.subtype || '';

        switch(type) {
            case 'weapon':
                if (name.includes('меч') || name.includes('sword') || subtype === 'sword') return 'sword';
                if (name.includes('топор') || name.includes('axe') || subtype === 'axe') return 'axe';
                if (name.includes('булава') || name.includes('mace') || subtype === 'mace') return 'mace';
                if (name.includes('кинжал') || name.includes('dagger') || subtype === 'dagger') return 'dagger';
                if (name.includes('лук') || name.includes('bow') || subtype === 'bow') return 'bow';
                if (name.includes('посох') || name.includes('staff') || subtype === 'staff') return 'staff';
                if (name.includes('жезл') || name.includes('wand') || subtype === 'wand') return 'wand';
                if (name.includes('копь') || name.includes('spear') || subtype === 'spear') return 'spear';
                return 'sword';

            case 'armor':
                if (name.includes('шлем') || name.includes('helmet') || name.includes('helm') || subtype === 'helmet') return 'helmet';
                if (name.includes('нагрудник') || name.includes('chest') || name.includes('armor') || name.includes('кираса') || subtype === 'chest') return 'chest';
                if (name.includes('перчат') || name.includes('glove') || subtype === 'gloves') return 'gloves';
                if (name.includes('сапог') || name.includes('boot') || subtype === 'boots') return 'boots';
                if (name.includes('понож') || name.includes('pant') || name.includes('legging') || subtype === 'pants') return 'pants';
                if (name.includes('щит') || name.includes('shield') || subtype === 'shield') return 'shield';
                if (name.includes('плащ') || name.includes('cloak') || name.includes('cape') || subtype === 'cloak') return 'cloak';
                if (name.includes('амулет') || name.includes('amulet') || name.includes('necklace') || subtype === 'amulet') return 'amulet';
                if (name.includes('кольцо') || name.includes('ring') || subtype === 'ring') return 'ring';
                return 'chest';

            case 'potion':
                if (name.includes('здоров') || name.includes('health') || name.includes('хил') || subtype === 'health') return 'health';
                if (name.includes('мана') || name.includes('mana') || subtype === 'mana') return 'mana';
                if (name.includes('вынос') || name.includes('stamina') || name.includes('energy') || subtype === 'stamina') return 'stamina';
                if (name.includes('усилен') || name.includes('buff') || name.includes('сила') || subtype === 'buff') return 'buff';
                if (name.includes('ослаб') || name.includes('debuff') || name.includes('яд') || subtype === 'debuff') return 'debuff';
                if (name.includes('восстан') || name.includes('restor') || subtype === 'restoration') return 'restoration';
                return 'health';

            case 'consumable':
                if (name.includes('еда') || name.includes('food') || name.includes('хлеб') || name.includes('мясо') || subtype === 'food') return 'food';
                if (name.includes('свиток') || name.includes('scroll') || subtype === 'scroll') return 'scroll';
                if (name.includes('стрел') || name.includes('arrow') || name.includes('bolt') || subtype === 'arrow') return 'arrow';
                if (name.includes('метатель') || name.includes('throw') || name.includes('нож') || name.includes('star') || subtype === 'throwable') return 'throwable';
                if (name.includes('реагент') || name.includes('reagent') || name.includes('компонент') || subtype === 'reagent') return 'reagent';
                if (name.includes('ключ') || name.includes('key') || subtype === 'key') return 'key';
                return 'food';

            case 'material':
                if (name.includes('руда') || name.includes('ore') || name.includes('желез') || name.includes('сталь') || subtype === 'ore') return 'ore';
                if (name.includes('трава') || name.includes('herb') || name.includes('цветок') || name.includes('корень') || subtype === 'herb') return 'herb';
                if (name.includes('кож') || name.includes('leather') || name.includes('шкур') || subtype === 'leather') return 'leather';
                if (name.includes('ткань') || name.includes('cloth') || name.includes('шелк') || name.includes('шерсть') || subtype === 'cloth') return 'cloth';
                if (name.includes('самоцвет') || name.includes('gem') || name.includes('рубин') || name.includes('изумруд') || name.includes('алмаз') || subtype === 'gem') return 'gem';
                if (name.includes('зачар') || name.includes('enchanted') || name.includes('магич') || name.includes('пылающ') || subtype === 'enchanted') return 'enchanted';
                if (name.includes('дерево') || name.includes('wood') || name.includes('древес') || subtype === 'wood') return 'wood';
                return 'ore';

            case 'special':
                if (name.includes('квест') || name.includes('quest') || subtype === 'quest') return 'quest';
                if (name.includes('уникаль') || name.includes('unique') || name.includes('легенд') || subtype === 'unique') return 'unique';
                if (name.includes('артефакт') || name.includes('artifact') || subtype === 'artifact') return 'artifact';
                if (name.includes('ивент') || name.includes('event') || name.includes('празднич') || subtype === 'event') return 'event';
                return 'unique';

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
        const subcategories = this.getAvailableSubcategories(filteredItems);
        
        return `
            <div class="shop-overlay">
                <div class="overlay-header">
                    <h3>${shop.name}</h3>
                    <button class="btn-close" onclick="game.systems.shop.closeShop()">✕</button>
                </div>
                
                <div class="overlay-body">
                    <!-- Шапка магазина -->
                    <div class="merchant-header">
                        <div class="merchant-info">
                            <h4>🏪 ${shop.merchantName}</h4>
                            <span class="merchant-type">${this.getMerchantTypeName(shop.merchantType)}</span>
                        </div>
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
                               value="${this.searchQuery}" oninput="game.systems.shop.handleSearch(this.value)">
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
                        <select id="shop-sort" onchange="game.systems.shop.handleSortChange(this.value)">
                            <option value="name">По названию</option>
                            <option value="price-asc">Цена (по возрастанию)</option>
                            <option value="price-desc">Цена (по убыванию)</option>
                            <option value="rarity">По редкости</option>
                            <option value="type">По типу</option>
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
                            ${subcat.count ? `<span class="subcategory-count">${subcat.count}</span>` : ''}
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

    // Фильтрация предметов по категории, подкатегории и поиску
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
                filtered = filtered.filter(item => item.setName);
            } else if (this.currentCategory === 'special') {
                filtered = filtered.filter(item => 
                    item.rarity === 'legendary' || 
                    item.rarity === 'mythic' ||
                    item.questItem ||
                    item.unique
                );
            } else {
                filtered = filtered.filter(item => item.type === this.currentCategory);
            }
        }

        // Фильтрация по подкатегории
        if (this.currentSubcategory !== 'all') {
            filtered = filtered.filter(item => item.subcategory === this.currentSubcategory);
        }

        return this.sortItems(filtered);
    }

    // Сортировка предметов
    sortItems(items) {
        const sortBy = document.getElementById('shop-sort')?.value || 'name';
        
        return items.sort((a, b) => {
            switch(sortBy) {
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

    // Получение доступных подкатегорий для текущей категории
    getAvailableSubcategories(items) {
        if (this.currentCategory === 'all') {
            return [];
        }

        const categoryConfig = this.categories[this.currentCategory];
        if (!categoryConfig || !categoryConfig.subcategories) {
            return [];
        }

        const subcategories = [];
        
        // Добавляем "Все" подкатегорию
        subcategories.push({
            key: 'all',
            name: categoryConfig.subcategories.all,
            count: items.length,
            icon: '📦'
        });

        // Добавляем остальные подкатегории с подсчетом предметов
        Object.entries(categoryConfig.subcategories).forEach(([key, name]) => {
            if (key !== 'all') {
                const count = items.filter(item => item.subcategory === key).length;
                if (count > 0 || this.currentSubcategory === key) {
                    subcategories.push({
                        key: key,
                        name: name,
                        count: count,
                        icon: this.getSubcategoryIcon(key)
                    });
                }
            }
        });

        return subcategories;
    }

    // Получение количества предметов в категории
    getCategoryItemCount(items, category) {
        if (category === 'all') return items.length;
        if (category === 'set') return items.filter(item => item.setName).length;
        if (category === 'special') {
            return items.filter(item => 
                item.rarity === 'legendary' || 
                item.rarity === 'mythic' ||
                item.questItem ||
                item.unique
            ).length;
        }
        return items.filter(item => item.type === category).length;
    }

    // Обработчики событий
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
        }
    }

    // Установка категории
    setCategory(category) {
        this.currentCategory = category;
        this.currentSubcategory = 'all';
        if (this.currentShop) {
            this.showShopInterface(this.currentShop);
        }
    }

    // Установка подкатегории
    setSubcategory(subcategory) {
        this.currentSubcategory = subcategory;
        if (this.currentShop) {
            this.showShopInterface(this.currentShop);
        }
    }

    // Обработка поиска
    handleSearch(query) {
        this.searchQuery = query;
        if (this.currentShop) {
            this.showShopInterface(this.currentShop);
        }
    }

    // Очистка поиска
    clearSearch() {
        this.searchQuery = '';
        if (this.currentShop) {
            this.showShopInterface(this.currentShop);
        }
    }

    // Обработка сортировки
    handleSortChange(sortBy) {
        if (this.currentShop) {
            this.showShopInterface(this.currentShop);
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

                            ${item.setInfo ? `
                                <div class="item-set-details">
                                    <h5>⭐ Бонус набора</h5>
                                    <div class="set-info">
                                        <div class="set-bonus">${this.formatBonus(item.setInfo.bonus)}</div>
                                        <div class="set-description">${item.setInfo.description}</div>
                                        <div class="set-requirements">Требуется предметов: ${item.setInfo.pieces}</div>
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
        }
    }

    // Вспомогательные методы
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

    formatBonus(bonus) {
        if (!bonus || bonus.type === 'none') return '';
        
        const bonusTypes = {
            'damage_mult': '📈 Урон +',
            'armor_mult': '🛡️ Броня +',
            'health_mult': '❤️ Здоровье +',
            'speed_mult': '⚡ Скорость +',
            'mana_mult': '🔵 Мана +',
            'crit_chance': '💥 Шанс крита +',
            'dodge_chance': '🌀 Уклонение +'
        };
        
        const value = bonus.value * 100;
        const formattedValue = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
        return `${bonusTypes[bonus.type] || 'Бонус'} ${formattedValue}%`;
    }

    formatPrice(price) {
        if (price >= 1000) {
            return (price / 1000).toFixed(1) + 'k';
        }
        return price;
    }

    getSetName(setName) {
        return this.itemSets[setName]?.name || setName;
    }

    getMerchantTypeName(type) {
        const types = {
            'general': 'Универсальный торговец',
            'weapon': 'Оружейник',
            'armor': 'Бронник',
            'potion': 'Алхимик',
            'magic': 'Магические товары',
            'blacksmith': 'Кузнец',
            'leatherworker': 'Кожевник'
        };
        return types[type] || 'Торговец';
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

    getSubcategoryName(subcategory) {
        const names = {
            // Оружие
            'sword': 'Меч', 'axe': 'Топор', 'mace': 'Булава', 'dagger': 'Кинжал',
            'bow': 'Лук', 'staff': 'Посох', 'wand': 'Жезл', 'spear': 'Копье',
            // Броня
            'helmet': 'Шлем', 'chest': 'Нагрудник', 'gloves': 'Перчатки', 'boots': 'Сапоги',
            'pants': 'Поножи', 'shield': 'Щит', 'cloak': 'Плащ', 'amulet': 'Амулет', 'ring': 'Кольцо',
            // Зелья
            'health': 'Здоровье', 'mana': 'Мана', 'stamina': 'Выносливость', 'buff': 'Усиление', 
            'debuff': 'Ослабление', 'restoration': 'Восстановление',
            // Расходники
            'food': 'Еда', 'scroll': 'Свиток', 'arrow': 'Стрелы', 'throwable': 'Метательное', 
            'reagent': 'Реагент', 'key': 'Ключ',
            // Материалы
            'ore': 'Руда', 'herb': 'Трава', 'leather': 'Кожа', 'cloth': 'Ткань', 
            'gem': 'Самоцвет', 'enchanted': 'Зачарованный', 'wood': 'Древесина',
            // Особые
            'quest': 'Квестовый', 'unique': 'Уникальный', 'artifact': 'Артефакт', 'event': 'Ивентовый'
        };
        
        return names[subcategory] || subcategory;
    }

    getSubcategoryIcon(subcategory) {
        const icons = {
            // Оружие
            'sword': '⚔️', 'axe': '🪓', 'mace': '🔨', 'dagger': '🗡️',
            'bow': '🏹', 'staff': '🔮', 'wand': '✨', 'spear': '🔱',
            // Броня
            'helmet': '⛑️', 'chest': '👕', 'gloves': '🧤', 'boots': '👢',
            'pants': '👖', 'shield': '🛡️', 'cloak': '🧥', 'amulet': '📿', 'ring': '💍',
            // Зелья
            'health': '❤️', 'mana': '🔵', 'stamina': '🟢', 'buff': '🔼', 
            'debuff': '🔽', 'restoration': '🔄',
            // Расходники
            'food': '🍖', 'scroll': '📜', 'arrow': '🏹', 'throwable': '🎯', 
            'reagent': '🧪', 'key': '🔑',
            // Материалы
            'ore': '⛏️', 'herb': '🌿', 'leather': '🐄', 'cloth': '🧵', 
            'gem': '💎', 'enchanted': '✨', 'wood': '🪵',
            // Особые
            'quest': '❓', 'unique': '💫', 'artifact': '🏆', 'event': '🎉'
        };
        
        return icons[subcategory] || '📦';
    }

    getItemIcon(itemType) {
        const icons = {
            'weapon': '⚔️',
            'armor': '🛡️',
            'potion': '🧪',
            'consumable': '🍖',
            'material': '⛏️',
            'special': '🎁',
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
            'material': 'Материал',
            'special': 'Особый',
            'scroll': 'Свиток',
            'misc': 'Предмет'
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

    closeItemDetailModal() {
        if (this.currentShop) {
            this.showShopInterface(this.currentShop);
        }
    }

    closeShop() {
        this.currentShop = null;
        this.searchQuery = '';
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

        const timeSinceLastRestock = Date.now() - shop.lastRestock;
        if (timeSinceLastRestock < shop.restockTimer) {
            console.log(`⏰ Магазин ${shop.name} еще не готов к перезаполнению`);
            return;
        }

        // Здесь можно добавить логику генерации новых предметов
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
console.log("📦 ShopSystem модуль загружен с полной функциональностью");
