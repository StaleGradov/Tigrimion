"use strict";

// ========== МОДУЛЬ 1: СИСТЕМА ДИНАМИЧЕСКОЙ ЗАГРУЗКИ МОДУЛЕЙ И СТИЛЕЙ ==========
class ModuleLoader {
    constructor() {
        this.modules = {};
        this.loadedModules = new Set();
        this.requiredModules = [
            'bonuses-system',
            'level-system', 
            'battle-system',
            'equipment-system',
            'hero-system',
            'map-system'
        ];
    }

    async loadStyles() {
        return new Promise((resolve, reject) => {
            if (document.getElementById('game-styles')) {
                console.log("✅ Стили уже загружены");
                resolve(true);
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'style.css';
            link.id = 'game-styles';
            
            link.onload = () => {
                console.log("✅ Стили игры загружены");
                resolve(true);
            };
            
            link.onerror = () => {
                console.error("❌ Ошибка загрузки стилей");
                this.createFallbackStyles();
                resolve(true);
            };
            
            document.head.appendChild(link);
        });
    }

    createFallbackStyles() {
        const fallbackStyles = `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: Arial, sans-serif; 
                background: #1a1a2e; 
                color: white; 
                padding: 20px; 
            }
            .loading-screen { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                text-align: center; 
            }
            .btn-primary, .btn-secondary { 
                padding: 10px 20px; 
                margin: 5px; 
                border: none; 
                border-radius: 5px; 
                cursor: pointer; 
            }
            .btn-primary { background: #3b82f6; color: white; }
            .btn-secondary { background: #6b7280; color: white; }
        `;
        
        const style = document.createElement('style');
        style.textContent = fallbackStyles;
        document.head.appendChild(style);
        console.log("🔄 Загружены резервные стили");
    }

    async loadModule(moduleName) {
        if (this.loadedModules.has(moduleName)) {
            console.log(`✅ Модуль ${moduleName} уже загружен`);
            return true;
        }

        try {
            const modulePath = `data/modules/${moduleName}.js`;
            console.log(`📥 Загружаем модуль: ${modulePath}`);
            
            const response = await fetch(modulePath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }
            
            const moduleCode = await response.text();
            
            const script = document.createElement('script');
            script.textContent = moduleCode;
            document.head.appendChild(script);
            document.head.removeChild(script);
            
            this.loadedModules.add(moduleName);
            console.log(`✅ Модуль ${moduleName} успешно загружен`);
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки модуля ${moduleName}:`, error);
            return false;
        }
    }

    isModuleAvailable(moduleName) {
        return typeof window[this.getClassName(moduleName)] !== 'undefined';
    }

    getClassName(moduleName) {
        const classMap = {
            'bonuses-system': 'BonusSystem',
            'level-system': 'LevelSystem',
            'battle-system': 'BattleSystem',
            'equipment-system': 'EquipmentSystem',
            'hero-system': 'HeroSystem',
            'map-system': 'MapSystem'
        };
        return classMap[moduleName] || moduleName;
    }

    async waitForAllModules() {
        const maxAttempts = 100;
        const checkInterval = 100;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const loaded = this.requiredModules.every(module => 
                this.isModuleAvailable(module)
            );
            
            if (loaded) {
                console.log("🎉 Все модули загружены и готовы!");
                return true;
            }
            
            if (attempt === 1) {
                console.log("⏳ Ожидание модулей...");
            }
            
            if (attempt % 10 === 0) {
                console.log(`⏳ Попытка ${attempt}/${maxAttempts}...`);
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        throw new Error(`Модули не загрузились за ${maxAttempts/10} секунд`);
    }

    async loadAllModules() {
        console.log("🚀 Начинаем загрузку модулей...");
        
        await this.loadStyles();
        
        const loadPromises = this.requiredModules.map(async (moduleName) => {
            if (!this.isModuleAvailable(moduleName)) {
                return await this.loadModule(moduleName);
            }
            return true;
        });
        
        const results = await Promise.allSettled(loadPromises);
        
        const failedModules = results
            .map((result, index) => ({ result, module: this.requiredModules[index] }))
            .filter(({ result }) => result.status === 'rejected' || result.value === false);
        
        if (failedModules.length > 0) {
            console.error("❌ Не удалось загрузить модули:", failedModules.map(f => f.module));
            throw new Error(`Не удалось загрузить модули: ${failedModules.map(f => f.module).join(', ')}`);
        }
        
        return await this.waitForAllModules();
    }
}

// ========== МОДУЛЬ 2: ОСНОВНОЙ КЛАСС ИГРЫ ==========
class SafeHeroGame {
    constructor() {
        this.moduleLoader = new ModuleLoader();
        this.systems = {};
        this.currentScreen = 'loading';
        this.currentHero = null;
        this.activeOverlay = null;
        this.itemDetailOverlay = null;
        this.init();
    }

    async init() {
        try {
            console.log("🎮 Инициализация игры...");
            
            this.showLoadingScreen("Загрузка игровых модулей...");
            
            await this.moduleLoader.loadAllModules();
            
            await this.initializeSystems();
            
            await this.loadGameData();
            
            this.showHeroSelection();
            
        } catch (error) {
            console.error("💀 Критическая ошибка инициализации:", error);
            this.panic(error);
        }
    }

    async initializeSystems() {
        console.log("⚙️ Инициализация игровых систем...");
        
        try {
            this.systems.bonus = new BonusSystem();
            this.systems.level = new LevelSystem();
            this.systems.battle = new BattleSystem();
            this.systems.equipment = new EquipmentSystem();
            this.systems.hero = new HeroSystem();
            this.systems.map = new MapSystem();
            
            console.log("✅ Все системы инициализированы");
            
        } catch (error) {
            throw new Error(`Ошибка инициализации систем: ${error.message}`);
        }
    }

    async loadGameData() {
        console.log("📂 Загрузка игровых данных...");
        
        try {
            await Promise.all([
                this.systems.hero.loadHeroData(),
                this.systems.equipment.loadItemData(),
                this.systems.battle.loadBattleData(),
                this.systems.map.loadMapData(),
                this.systems.bonus.loadBonusData(),
                this.systems.level.loadLevelData()
            ]);
            
            console.log("✅ Все игровые данные загружены");
            
        } catch (error) {
            throw new Error(`Ошибка загрузки данных: ${error.message}`);
        }
    }

    showLoadingScreen(message) {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div class="loading-screen">
                    <div class="loading-content">
                        <h2>🔄 Tigrimion RPG</h2>
                        <p>${message}</p>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="loadingProgress"></div>
                            </div>
                        </div>
                        <div class="module-status" id="moduleStatus">
                            Инициализация...
                        </div>
                    </div>
                </div>
            `;
        }
    }

    updateLoadingProgress(percent, message) {
        const progress = document.getElementById('loadingProgress');
        const status = document.getElementById('moduleStatus');
        
        if (progress) progress.style.width = percent + '%';
        if (status) status.textContent = message;
    }

    showHeroSelection() {
        const app = document.getElementById('app');
        if (!app) return;

        const heroes = this.systems.hero.heroes;
        
        app.innerHTML = `
            <div class="hero-selection-screen">
                <header class="selection-header">
                    <!-- Заголовок скрыт как просили -->
                </header>
                
                <div class="heroes-grid">
                    ${heroes.map(hero => {
                        const isUnlocked = hero.unlocked || hero.id === 1;
                        const stats = this.systems.hero.calculateHeroStats(hero);
                        
                        return `
                            <div class="hero-card ${isUnlocked ? '' : 'locked'}" 
                                 onclick="${isUnlocked ? `game.selectHero(${hero.id})` : ''}">
                                <div class="hero-image">
                                    <img src="${hero.image}" alt="${hero.name}" 
                                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                                    ${!isUnlocked ? '<div class="locked-overlay">🔒</div>' : ''}
                                </div>
                                <div class="hero-info-tooltip">
                                    <div class="hero-header">
                                        <strong>${hero.name}</strong>
                                        <span class="hero-level">Ур. ${hero.level}</span>
                                    </div>
                                    <div class="hero-stats">
                                        <div class="stat-row">
                                            <span>❤️ ${stats.currentHealth}/${stats.maxHealth}</span>
                                            <span>⚔️ ${stats.damage}</span>
                                            <span>🛡️ ${stats.armor}</span>
                                        </div>
                                        <div class="stat-row">
                                            <span>💰 ${hero.gold.toFixed(2)}</span>
                                            <span>🌟 ${stats.power}</span>
                                        </div>
                                    </div>
                                    <div class="hero-details">
                                        <span>🧬 ${this.getRaceName(hero.race)}</span>
                                        <span>⚔️ ${this.getClassName(hero.class)}</span>
                                        <span>📖 ${this.getSagaName(hero.saga)}</span>
                                    </div>
                                    ${!isUnlocked ? 
                                        '<small class="locked-text">Требуется уровень: ' + (hero.id * 5) + '</small>' : 
                                        '<small class="select-text">Кликните для выбора</small>'
                                    }
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="selection-actions">
                    <button class="btn-secondary" onclick="game.showMainMenu()">
                        ← Назад в меню
                    </button>
                </div>
            </div>
        `;
    }

    selectHero(heroId) {
        const hero = this.systems.hero.heroes.find(h => h.id === heroId);
        if (!hero) return;

        this.currentHero = hero;
        this.systems.hero.currentHero = hero;
        
        // Устанавливаем текущего героя в системе экипировки
        if (this.systems.equipment) {
            this.systems.equipment.setCurrentHero(hero);
        }
        
        console.log(`🎯 Выбран герой: ${hero.name}`);
        this.showHeroGameScreen();
    }

    showHeroGameScreen() {
        if (!this.currentHero) return;

        const app = document.getElementById('app');
        const stats = this.systems.hero.calculateHeroStats(this.currentHero);
        
        app.innerHTML = `
            <div class="hero-game-screen">
                <!-- Верхняя панель кнопок -->
                <div class="top-action-bar">
                    <button class="btn-top" onclick="game.showOverlay('global-map')">
                        🗺️ Глобальная карта
                    </button>
                    <button class="btn-top" onclick="game.showOverlay('local-map')">
                        📍 Локальная карта
                    </button>
                    <button class="btn-top" onclick="game.showOverlay('tactical-map')">
                        🎲 Тактическая карта
                    </button>
                    <button class="btn-top" onclick="game.systems.map.showTacticalMapEditor()">
                        🎨 Создать карту
                    </button>
                    <button class="btn-top" onclick="game.showOverlay('inventory')">
                        🎒 Инвентарь
                    </button>
                    <button class="btn-top" onclick="game.showOverlay('shop')">
                        🏪 Магазин
                    </button>
                    <button class="btn-top" onclick="game.showHeroSelection()">
                        🔁 Сменить героя
                    </button>
                </div>

                <!-- Основное окно героя (полноэкранное) -->
                <div class="hero-main-window">
                    <div class="hero-fullscreen">
                        <!-- Фон - картинка героя -->
                        <div class="hero-background">
                            <img src="${this.currentHero.image}" alt="${this.currentHero.name}" 
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzg4OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                        </div>
                        
                        <!-- Панель параметров поверх картинки -->
                        <div class="hero-overlay-panel">
                            <!-- Верхняя строка - имя и уровень -->
                            <div class="hero-overlay-header">
                                <div class="hero-overlay-name">${this.currentHero.name}</div>
                                <div class="hero-overlay-level">⚡ Ур. ${this.currentHero.level}</div>
                            </div>
                            
                            <!-- Основные параметры -->
                            <div class="hero-overlay-stats">
                                <div class="overlay-stat-group">
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">❤️ Здоровье</span>
                                        <span class="overlay-stat-value">${stats.currentHealth}/${stats.maxHealth}</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">⚔️ Мощь</span>
                                        <span class="overlay-stat-value">${stats.damage}</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">🛡️ Защита</span>
                                        <span class="overlay-stat-value">${stats.armor}</span>
                                    </div>
                                </div>
                                
                                <div class="overlay-stat-group">
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">💰 Золото</span>
                                        <span class="overlay-stat-value">${this.currentHero.gold.toFixed(2)}</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">🌟 Сила</span>
                                        <span class="overlay-stat-value">${stats.power}</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">🧬 Раса</span>
                                        <span class="overlay-stat-value">${this.getRaceName(this.currentHero.race)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Экипировка -->
                            <div class="hero-overlay-equipment">
                                <h4>🎒 Экипировка</h4>
                                <div class="equipment-slots-mini">
                                    ${['main_hand', 'off_hand', 'helmet', 'chest', 'gloves', 'legs', 'boots'].map(slot => {
                                        const itemId = this.currentHero.equipment[slot];
                                        const item = itemId && this.systems.equipment ? 
                                            this.systems.equipment.getItemById(itemId) : null;
                                        return `
                                            <div class="equipment-slot-mini ${slot} ${item ? 'equipped' : 'empty'}"
                                                 onclick="game.showEquipmentForSlot('${slot}')"
                                                 ${item ? `data-rarity="${item.rarity || 'common'}"` : ''}>
                                                <div class="slot-icon-mini">
                                                    ${item ? 
                                                        `<img src="${item.image}" alt="${item.name}" 
                                                              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                                                         <div class="item-fallback" style="display: none;">
                                                             <span>${this.getSlotIcon(slot)}</span>
                                                         </div>` : 
                                                        this.getSlotIcon(slot)
                                                    }
                                                </div>
                                                <div class="slot-label-mini">${this.getSlotName(slot)}</div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Область для оверлеев (открывается поверх героя) -->
                <div id="overlay-container" class="overlay-container"></div>
            </div>
        `;
    }

    showOverlay(overlayType) {
        const container = document.getElementById('overlay-container');
        if (!container) return;

        this.activeOverlay = overlayType;

        switch(overlayType) {
            case 'global-map':
                container.innerHTML = `
                    <div class="overlay-content map-overlay">
                        <div class="overlay-header">
                            <h3>🗺️ Глобальная карта</h3>
                            <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                        </div>
                        <div class="overlay-body">
                            ${this.systems.map ? this.systems.map.renderGlobalMap() : 'Карта загружается...'}
                        </div>
                    </div>
                `;
                break;

            case 'local-map':
                container.innerHTML = `
                    <div class="overlay-content map-overlay">
                        <div class="overlay-header">
                            <h3>📍 Локальная карта</h3>
                            <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                        </div>
                        <div class="overlay-body">
                            ${this.systems.map ? this.systems.map.renderLocalMap() : 'Карта загружается...'}
                        </div>
                    </div>
                `;
                break;

            case 'tactical-map':
                // Вместо стандартного рендера вызываем редактор
                if (this.systems.map) {
                    this.systems.map.showTacticalMapEditor();
                } else {
                    container.innerHTML = '<div class="map-error">Система карт не загружена</div>';
                }
                break;

            case 'inventory':
                container.innerHTML = this.systems.equipment.showInventory();
                break;

            case 'shop':
                container.innerHTML = this.createShopOverlay();
                break;
        }

        container.style.display = 'block';
    }

    // ========== НОВАЯ СИСТЕМА МАГАЗИНА С ОКНОМ ПРЕДМЕТА ==========
    createShopOverlay() {
        const items = this.systems.equipment.items;
        const categories = this.getShopCategories(items);
        
        return `
            <div class="overlay-content shop-overlay">
                <div class="overlay-header">
                    <h3>🏪 Магазин приключенца</h3>
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
                <div class="overlay-body">
                    <div class="merchant-header">
                        <h4>Добро пожаловать в магазин!</h4>
                        <div class="hero-merchant-info">
                            <div class="merchant-stats">
                                <span class="gold-amount">💰 ${this.currentHero.gold.toFixed(2)} золота</span>
                                <span class="inventory-space">🎒 Свободно: ${this.getFreeInventorySlots()} слотов</span>
                            </div>
                        </div>
                    </div>

                    <!-- Основные категории -->
                    <div class="shop-categories">
                        ${Object.keys(categories).map(category => `
                            <button class="category-tab" onclick="game.filterShopItems('${category}')">
                                ${this.getCategoryName(category)}
                            </button>
                        `).join('')}
                    </div>

                    <!-- Подкатегории брони -->
                    <div class="armor-subcategories">
                        <button class="subcategory-tab" onclick="game.filterArmorSubcategory('cloth')">
                            Ткань
                        </button>
                        <button class="subcategory-tab" onclick="game.filterArmorSubcategory('leather')">
                            Кожа
                        </button>
                        <button class="subcategory-tab" onclick="game.filterArmorSubcategory('mail')">
                            Кольчуга
                        </button>
                        <button class="subcategory-tab" onclick="game.filterArmorSubcategory('plate')">
                            Латы
                        </button>
                    </div>

                    <div class="shop-content" id="shopContent">
                        ${this.renderShopItems(items)}
                    </div>
                </div>
            </div>
        `;
    }

    renderShopItems(items) {
        if (!items || items.length === 0) {
            return '<div class="empty-category">Товары временно отсутствуют</div>';
        }

        return `
            <div class="items-grid">
                ${items.map(item => {
                    const canBuy = this.currentHero.gold >= item.price;
                    const isOwned = this.systems.equipment.isItemOwned(item.id);
                    
                    return `
                        <div class="shop-item ${isOwned ? 'owned' : ''} ${!canBuy ? 'cannot-buy' : ''} rarity-${item.rarity || 'common'}" 
                             onclick="game.showItemDetail(${item.id})">
                            <div class="item-background">
                                <div class="item-image-container">
                                    <img src="${item.image}" alt="${item.name}"
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                                    <div class="item-fallback" style="display: none;">
                                        <span class="item-icon">${this.getItemTypeIcon(item.type)}</span>
                                    </div>
                                </div>
                                <div class="item-info">
                                    <div class="item-name">${item.name}</div>
                                    <div class="item-type">${this.getItemTypeName(item.type)}</div>
                                    
                                    ${item.stats ? `
                                        <div class="item-stats-compact">
                                            ${Object.entries(item.stats).slice(0, 3).map(([key, value]) => `
                                                <span>${this.getStatIcon(key)}+${value}</span>
                                            `).join('')}
                                        </div>
                                    ` : ''}
                                    
                                    <div class="item-price-tag">
                                        <div class="price">💰 ${item.price} золота</div>
                                        ${isOwned ? 
                                            '<div class="owned-badge">Уже есть</div>' : 
                                            `<div class="buy-status ${canBuy ? 'can-buy' : 'cannot-buy'}">
                                                ${canBuy ? 'Можно купить' : 'Недостаточно золота'}
                                            </div>`
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // ========== СИСТЕМА ОКНА ПРЕДМЕТА ==========
    showItemDetail(itemId) {
        const item = this.systems.equipment.getItemById(itemId);
        if (!item) return;

        const canBuy = this.currentHero.gold >= item.price;
        const isOwned = this.systems.equipment.isItemOwned(itemId);

        // Создаем отдельный оверлей для предмета поверх магазина
        this.itemDetailOverlay = document.createElement('div');
        this.itemDetailOverlay.className = 'overlay-container item-detail-container';
        this.itemDetailOverlay.style.zIndex = '2000';
        this.itemDetailOverlay.innerHTML = `
            <div class="overlay-content item-detail-overlay">
                <div class="overlay-header">
                    <h3>🔍 Детали предмета</h3>
                    <button class="btn-close" onclick="game.closeItemDetail()">✕</button>
                </div>
                <div class="item-detail-content">
                    <div class="item-detail-main">
                        <div class="item-detail-image">
                            <img src="${item.image}" alt="${item.name}" 
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                        </div>
                        <div class="item-detail-info">
                            <div class="item-detail-name rarity-${item.rarity || 'common'}">${item.name}</div>
                            <div class="item-detail-type">${this.getItemTypeName(item.type)}</div>
                            
                            <div class="item-detail-stats">
                                <h4>📊 Характеристики</h4>
                                <div class="stat-grid">
                                    ${item.stats ? Object.entries(item.stats).map(([key, value]) => `
                                        <div class="stat-item">
                                            <span class="stat-label">${this.getStatLabel(key)}</span>
                                            <span class="stat-value">+${value}</span>
                                        </div>
                                    `).join('') : '<div class="stat-item">Нет характеристик</div>'}
                                </div>
                            </div>
                            
                            <div class="item-detail-description">
                                <h4>📖 Описание</h4>
                                <p>${item.description || 'Описание отсутствует.'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="item-detail-actions">
                        ${!isOwned ? `
                            <button class="btn-buy ${!canBuy ? 'disabled' : ''}" 
                                    onclick="game.buyItem(${itemId})" 
                                    ${!canBuy ? 'disabled' : ''}>
                                🛒 Купить за ${item.price} золота
                            </button>
                        ` : `
                            <button class="btn-buy owned" disabled>
                                ✅ Уже куплено
                            </button>
                        `}
                        <button class="btn-close-item" onclick="game.closeItemDetail()">
                            ❌ Закрыть
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.itemDetailOverlay);
        this.itemDetailOverlay.style.display = 'block';
    }

    closeItemDetail() {
        if (this.itemDetailOverlay) {
            this.itemDetailOverlay.remove();
            this.itemDetailOverlay = null;
        }
    }

    buyItem(itemId) {
        const item = this.systems.equipment.getItemById(itemId);
        if (!item) return;

        if (this.currentHero.gold >= item.price) {
            this.currentHero.gold -= item.price;
            this.systems.equipment.addItemToInventory(itemId);
            
            this.showNotification(`✅ Предмет "${item.name}" куплен!`, 'success');
            this.closeItemDetail();
            
            // Обновляем магазин
            const shopContent = document.getElementById('shopContent');
            if (shopContent) {
                shopContent.innerHTML = this.renderShopItems(this.systems.equipment.items);
            }
            
        } else {
            this.showNotification('❌ Недостаточно золота!', 'error');
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ МАГАЗИНА ==========
    getShopCategories(items) {
        const categories = {};
        items.forEach(item => {
            if (!categories[item.type]) {
                categories[item.type] = [];
            }
            categories[item.type].push(item);
        });
        return categories;
    }

    getCategoryName(category) {
        const names = {
            'weapon': '⚔️ Оружие',
            'armor': '🛡️ Броня', 
            'potion': '🧪 Зелья',
            'scroll': '📜 Свитки',
            'misc': '📦 Разное'
        };
        return names[category] || category;
    }

    getItemTypeIcon(type) {
        const icons = {
            'weapon': '⚔️',
            'armor': '🛡️',
            'potion': '🧪', 
            'scroll': '📜',
            'misc': '📦'
        };
        return icons[type] || '📦';
    }

    getItemTypeName(type) {
        const names = {
            'weapon': 'Оружие',
            'armor': 'Броня',
            'potion': 'Зелье',
            'scroll': 'Свиток', 
            'misc': 'Предмет'
        };
        return names[type] || type;
    }

    getStatIcon(stat) {
        const icons = {
            'health': '❤️',
            'damage': '⚔️',
            'armor': '🛡️',
            'speed': '🏃',
            'magic': '🔮',
            'strength': '💪',
            'agility': '🌀',
            'intelligence': '🧠'
        };
        return icons[stat] || '📊';
    }

    getStatLabel(stat) {
        const labels = {
            'health': 'Здоровье',
            'damage': 'Урон',
            'armor': 'Защита',
            'speed': 'Скорость',
            'magic': 'Магия',
            'strength': 'Сила',
            'agility': 'Ловкость', 
            'intelligence': 'Интеллект'
        };
        return labels[stat] || stat;
    }

    getFreeInventorySlots() {
        return this.systems.equipment ? this.systems.equipment.getFreeInventorySlots() : 0;
    }

    filterShopItems(category) {
        // Реализация фильтрации по категориям
        console.log('Фильтр по категории:', category);
    }

    filterArmorSubcategory(subcategory) {
        // Реализация фильтрации по подкатегориям брони
        console.log('Фильтр по подкатегории брони:', subcategory);
    }

    hideOverlay() {
        const container = document.getElementById('overlay-container');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
            this.activeOverlay = null;
        }
        
        // Также закрываем окно предмета если оно открыто
        this.closeItemDetail();
    }

    showEquipmentForSlot(slot) {
        this.showOverlay('inventory');
        // Здесь можно добавить фильтрацию по слоту
        setTimeout(() => {
            const inventoryOverlay = document.querySelector('.inventory-overlay');
            if (inventoryOverlay) {
                const filterInfo = document.createElement('div');
                filterInfo.className = 'filter-info';
                filterInfo.innerHTML = `
                    <strong>🎯 Выбор предмета для: ${this.getSlotName(slot)}</strong>
                    <div>Показаны только подходящие предметы</div>
                `;
                const overlayBody = inventoryOverlay.querySelector('.overlay-body');
                if (overlayBody) {
                    overlayBody.insertBefore(filterInfo, overlayBody.firstChild);
                }
            }
        }, 100);
    }

    // ========== СИСТЕМА УВЕДОМЛЕНИЙ ==========
    showNotification(message, type = 'info') {
        // Удаляем существующие уведомления
        const existingNotifications = document.querySelectorAll('.game-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `game-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">OK</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Автоматическое скрытие через 5 секунд
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    getRaceName(race) {
        const races = {
            'human': 'Человек',
            'elf': 'Эльф',
            'dwarf': 'Гном',
            'ork': 'Орк',
            'laitar': 'Лайтар',
            'dragon': 'Дракон',
            'fairy': 'Фея',
            'halfling': 'Полурослик'
        };
        return races[race] || race;
    }

    getClassName(className) {
        const classes = {
            'warrior': 'Воин',
            'hunter': 'Охотник',
            'mage': 'Маг',
            'bounty_hunter': 'Охотник за головами',
            'merchant': 'Торговец',
            'thief': 'Вор',
            'fighter': 'Кулачный боец',
            'antiquarian': 'Искатель древностей',
            'death_mage': 'Волхв смерти',
            'sorcerer': 'Колдун',
            'archer': 'Лучник',
            'healer': 'Знахарь',
            'gladiator': 'Гладиатор',
            'blacksmith': 'Кузнец'
        };
        return classes[className] || className;
    }

    getSagaName(saga) {
        const sagas = {
            'golden_egg': 'Золотое Яйцо',
            'vulkanor': 'Вулканор',
            'well': 'Колодец',
            'pets': 'Питомец',
            'following_sun': 'Вслед за солнцем',
            'vampire_crown': 'Корона вампиров',
            'tiger_eye': 'Желтый Глаз тигра',
            'sky_phenomena': 'Небесные явления'
        };
        return sagas[saga] || saga;
    }

    getSlotIcon(slot) {
        const icons = {
            'main_hand': '⚔️',
            'off_hand': '🛡️',
            'helmet': '⛑️',
            'chest': '👕',
            'gloves': '🧤',
            'legs': '👖',
            'boots': '👢'
        };
        return icons[slot] || '📦';
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

    showMainMenu() {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="main-screen">
                <header class="game-header">
                    <h1>🎮 TIGRIMION RPG</h1>
                    <p class="game-subtitle">Модульная RPG система</p>
                </header>
                
                <div class="main-actions">
                    <button class="btn-primary" onclick="game.showHeroSelection()">
                        🚀 Начать игру
                    </button>
                    <button class="btn-secondary" onclick="game.showDebugInfo()">
                        🐛 Информация о системе
                    </button>
                </div>
            </div>
        `;
    }

    showDebugInfo() {
        console.log("=== ДЕБАГ ИНФОРМАЦИЯ ===");
        console.log("Загруженные модули:", this.moduleLoader.loadedModules);
        console.log("Системы:", this.systems);
        console.log("Текущий герой:", this.currentHero);
        console.log("Предметы в системе экипировки:", this.systems.equipment ? this.systems.equipment.items.length : 0);
        
        alert("Информация выведена в консоль (F12)");
    }

    panic(error) {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="error-screen">
                <div class="error-content">
                    <h1>🚨 КРИТИЧЕСКАЯ ОШИБКА</h1>
                    <div class="error-details">
                        <strong>Сообщение:</strong> ${error.message}
                    </div>
                    <div class="error-stack">
                        <strong>Стек:</strong> ${error.stack}
                    </div>
                    <div class="error-actions">
                        <button onclick="location.reload()" class="btn-reload">
                            🔄 Перезагрузить игру
                        </button>
                        <button onclick="game.showMainMenu()" class="btn-main-menu">
                            🏠 В главное меню
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        console.error("💀 ПАНИКА:", error);
    }

    // ========== СИСТЕМА СОХРАНЕНИЯ ==========
    saveGame() {
        if (this.currentHero) {
            const saveData = {
                currentHeroId: this.currentHero.id,
                heroes: this.systems.hero.heroes,
                timestamp: Date.now()
            };
            
            localStorage.setItem('tigrimionSave', JSON.stringify(saveData));
            console.log("💾 Игра сохранена");
        }
    }

    loadSave() {
        try {
            const save = localStorage.getItem('tigrimionSave');
            if (save) {
                const data = JSON.parse(save);
                
                // Загружаем прогресс героев
                if (data.heroes && this.systems.hero) {
                    const savedHeroes = data.heroes;
                    this.systems.hero.heroes = this.systems.hero.heroes.map(freshHero => {
                        const savedHero = savedHeroes.find(h => h.id === freshHero.id);
                        if (savedHero) {
                            return {
                                ...freshHero,
                                ...savedHero
                            };
                        }
                        return freshHero;
                    });
                }
                
                // Восстанавливаем текущего героя
                if (data.currentHeroId) {
                    this.currentHero = this.systems.hero.heroes.find(h => h.id === data.currentHeroId);
                    if (this.currentHero && this.systems.equipment) {
                        this.systems.equipment.setCurrentHero(this.currentHero);
                    }
                }
                
                console.log("📂 Сохранение загружено");
                return true;
            }
        } catch (error) {
            console.error("❌ Ошибка загрузки сохранения:", error);
        }
        return false;
    }

    // ========== СИСТЕМА АВТОСОХРАНЕНИЯ ==========
    startAutosave() {
        setInterval(() => {
            this.saveGame();
        }, 30000); // Сохраняем каждые 30 секунд
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ИГРЫ ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log("🎮 Запуск Tigrimion RPG...");
    window.game = new SafeHeroGame();
    
    // Добавляем обработчик закрытия страницы для сохранения
    window.addEventListener('beforeunload', () => {
        if (window.game) {
            window.game.saveGame();
        }
    });
});

// ========== ГЛОБАЛЬНЫЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// ========== ПОЛИФИЛЛЫ ДЛЯ СТАРЫХ БРАУЗЕРОВ ==========
if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
        if (typeof start !== 'number') {
            start = 0;
        }
        if (start + search.length > this.length) {
            return false;
        }
        return this.indexOf(search, start) !== -1;
    };
}

if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement, fromIndex) {
        if (this == null) {
            throw new TypeError('Array.prototype.includes called on null or undefined');
        }
        var O = Object(this);
        var len = O.length >>> 0;
        if (len === 0) {
            return false;
        }
        var n = fromIndex | 0;
        var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
        while (k < len) {
            if (O[k] === searchElement) {
                return true;
            }
            k++;
        }
        return false;
    };
}
