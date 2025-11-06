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
        this.activeOverlay = null; // Текущее открытое окно поверх героя
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

    // ========== НОВАЯ СИСТЕМА ЭКРАНОВ ==========
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
                        
                        <!-- Экипировка (2 предмета) -->
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
                                                    `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">` : 
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
                container.innerHTML = `
                    <div class="overlay-content map-overlay">
                        <div class="overlay-header">
                            <h3>🎲 Тактическая карта</h3>
                            <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                        </div>
                        <div class="overlay-body">
                            ${this.systems.map ? this.systems.map.renderTacticalMap() : 'Карта загружается...'}
                        </div>
                    </div>
                `;
                break;

            case 'inventory':
                this.showInventoryOverlay();
                break;

            case 'shop':
                this.showShopOverlay();
                break;
        }

        container.style.display = 'block';
    }

    hideOverlay() {
        const container = document.getElementById('overlay-container');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
            this.activeOverlay = null;
        }
    }

    showInventoryOverlay() {
        const container = document.getElementById('overlay-container');
        if (!container || !this.currentHero) return;

        const inventoryHTML = this.currentHero.inventory.map(itemId => {
            const item = this.systems.equipment.getItemById(itemId);
            if (!item) return '';
            
            const isEquipped = Object.values(this.currentHero.equipment).includes(itemId);
            
            return `
                <div class="inventory-item" data-rarity="${item.rarity || 'common'}">
                    <div class="item-image">
                        <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
                    </div>
                    <div class="item-info">
                        <div class="item-name">${item.name}</div>
                        <div class="item-stats">
                            ${item.fixed_damage ? `<span>⚔️ +${item.fixed_damage}</span>` : ''}
                            ${item.fixed_armor ? `<span>🛡️ +${item.fixed_armor}</span>` : ''}
                            ${item.fixed_health ? `<span>❤️ +${item.fixed_health}</span>` : ''}
                        </div>
                        <div class="item-description">${item.description}</div>
                        ${isEquipped ? 
                            '<div class="item-status equipped">✅ Надето</div>' : 
                            `<button class="btn-equip" onclick="game.systems.equipment.equipItem(${item.id})">Надеть</button>`
                        }
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="overlay-content inventory-overlay">
                <div class="overlay-header">
                    <h3>🎒 Инвентарь</h3>
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
                <div class="overlay-body">
                    <div class="inventory-stats">
                        <span>💰 Золото: ${this.currentHero.gold.toFixed(2)}</span>
                        <span>📦 Предметы: ${this.currentHero.inventory.length}</span>
                    </div>
                    <div class="inventory-grid">
                        ${inventoryHTML || '<div class="empty-inventory">📭 Инвентарь пуст</div>'}
                    </div>
                </div>
            </div>
        `;
    }

    showShopOverlay() {
        const container = document.getElementById('overlay-container');
        if (!container) return;

        container.innerHTML = `
            <div class="overlay-content shop-overlay">
                <div class="overlay-header">
                    <h3>🏪 Магазин</h3>
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
                <div class="overlay-body">
                    <div class="shop-content">
                        <p>Магазин будет реализован в следующем обновлении</p>
                        <p>💰 Ваше золото: ${this.currentHero ? this.currentHero.gold.toFixed(2) : '0'}</p>
                    </div>
                </div>
            </div>
        `;
    }

    showEquipmentForSlot(slot) {
        this.showOverlay('inventory');
        // Здесь можно добавить фильтрацию по слоту
    }

    // Вспомогательные методы
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
                    <div class="error-actions">
                        <button onclick="location.reload()" class="btn-reload">
                            🔄 Перезагрузить игру
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        console.error("💀 ПАНИКА:", error);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log("🎮 Запуск Tigrimion RPG...");
    window.game = new SafeHeroGame();
});
