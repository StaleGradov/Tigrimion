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
            'map-system',
            'action-system',
            'shop-system',
            'resources-system',
            'crafting-system',
            // ========== ДОБАВИТЬ: Загрузчик модулей действий ==========
            'action-modules-loader'
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
            let modulePath;
            if (moduleName === 'crafting-system') {
                modulePath = 'crafting-system.js';
            } else if (moduleName === 'action-modules-loader') {
                modulePath = 'action-modules-loader.js';
            } else {
                modulePath = `data/modules/${moduleName}.js`;
            }
            
            console.log(`📥 Загружаем модуль: ${modulePath}`);
            
            const response = await fetch(modulePath);
            if (!response.ok) {
                const altPath = `modules/${moduleName}.js`;
                console.log(`🔄 Пробуем альтернативный путь: ${altPath}`);
                const altResponse = await fetch(altPath);
                
                if (!altResponse.ok) {
                    throw new Error(`Не удалось загрузить модуль ${moduleName} с путей: ${modulePath}, ${altPath}`);
                }
                
                modulePath = altPath;
            }
            
            const moduleCode = await response.text();
            
            const blob = new Blob([moduleCode], { type: 'application/javascript' });
            const url = URL.createObjectURL(blob);
            
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.onload = () => {
                    URL.revokeObjectURL(url);
                    resolve();
                };
                script.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error(`Ошибка выполнения модуля ${moduleName}`));
                };
                document.head.appendChild(script);
            });
            
            this.loadedModules.add(moduleName);
            console.log(`✅ Модуль ${moduleName} успешно загружен`);
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки модуля ${moduleName}:`, error);
            
            this.createStubModule(moduleName);
            return false;
        }
    }

    createStubModule(moduleName) {
        console.log(`🔄 Создаю заглушку для модуля ${moduleName}`);
        
        const classMap = {
            'crafting-system': 'CraftingSystem',
            'action-system': 'ActionSystem',
            'map-system': 'MapSystem',
            'bonuses-system': 'BonusSystem',
            'level-system': 'LevelSystem',
            'battle-system': 'BattleSystem',
            'equipment-system': 'EquipmentSystem',
            'hero-system': 'HeroSystem',
            'shop-system': 'ShopSystem',
            'resources-system': 'ResourcesSystem',
            'action-modules-loader': 'ActionModulesLoader'
        };
        
        const className = classMap[moduleName];
        if (className && !window[className]) {
            window[className] = class StubSystem {
                constructor() {
                    console.log(`📦 Создана заглушка для ${className}`);
                }
                async initialize() {
                    console.log(`🔄 Инициализация заглушки ${className}`);
                    return true;
                }
            };
            console.log(`✅ Заглушка ${className} создана`);
        }
    }
    
    isModuleAvailable(moduleName) {
        const classMap = {
            'bonuses-system': 'BonusSystem',
            'level-system': 'LevelSystem',
            'battle-system': 'BattleSystem',
            'equipment-system': 'EquipmentSystem',
            'hero-system': 'HeroSystem',
            'map-system': 'MapSystem',
            'action-system': 'ActionSystem',
            'shop-system': 'ShopSystem',
            'resources-system': 'ResourcesSystem',
            'crafting-system': 'CraftingSystem',
            'action-modules-loader': 'ActionModulesLoader'
        };
        return typeof window[classMap[moduleName]] !== 'undefined';
    }

    getClassName(moduleName) {
        const classMap = {
            'bonuses-system': 'BonusSystem',
            'level-system': 'LevelSystem',
            'battle-system': 'BattleSystem',
            'equipment-system': 'EquipmentSystem',
            'hero-system': 'HeroSystem',
            'map-system': 'MapSystem',
            'action-system': 'ActionSystem',
            'shop-system': 'ShopSystem',
            'resources-system': 'ResourcesSystem',
            'crafting-system': 'CraftingSystem',
            'action-modules-loader': 'ActionModulesLoader'
        };
        return classMap[moduleName] || moduleName;
    }

    async waitForAllModules() {
        const maxAttempts = 50;
        const checkInterval = 200;
        
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
            
            if (attempt % 5 === 0) {
                console.log(`⏳ Попытка ${attempt}/${maxAttempts}...`);
                const loadedList = this.requiredModules
                    .filter(m => this.isModuleAvailable(m))
                    .map(m => this.getClassName(m));
                console.log(`📦 Загружены: ${loadedList.join(', ')}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        const failedModules = this.requiredModules
            .filter(m => !this.isModuleAvailable(m))
            .map(m => this.getClassName(m));
        
        throw new Error(`Модули не загрузились за ${maxAttempts * checkInterval / 1000} секунд. Не загружены: ${failedModules.join(', ')}`);
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
            console.log("🔄 Продолжаем с доступными модулями...");
        }
        
        return await this.waitForAllModules();
    }
}

// ========== МОДУЛЬ 2: ОСНОВНОЙ КЛАСС ИГРЫ ==========
class SafeHeroGame {
    constructor() {
        this.moduleLoader = new ModuleLoader();
        this.systems = {
            bonus: null,
            level: null,
            battle: null,
            equipment: null,
            hero: null,
            map: null,
            action: null,
            shop: null,
            resources: null,
            crafting: null
        };
        this.currentScreen = 'loading';
        this.currentHero = null;
        this.activeOverlay = null;
        
        this.sharedResources = {
            gold: 0,
            inventory: [],
            unlockedHeroes: [1],
            resources: {}
        };
        
        this.isSaveLoaded = false;
        
        // ========== ДОБАВИТЬ: Инициализация модулей действий ==========
        this.actionModules = {};
        
        this.init();
    }

    async init() {
        try {
            console.log("🎮 Инициализация игры...");
            
            this.showLoadingScreen("Загрузка игровых модулей...");
            
            await this.moduleLoader.loadAllModules();
            
            await this.initializeSystems();
            
            await this.loadGameData();
            
            console.log("📂 Пытаемся загрузить сохранение...");
            const saveLoaded = this.loadSave();
            if (saveLoaded) {
                console.log("✅ Сохранение загружено");
                this.isSaveLoaded = true;
                
                if (this.currentHero) {
                    console.log(`🎯 Восстановлен герой: ${this.currentHero.name}`);
                    this.showHeroGameScreen();
                } else {
                    this.showHeroSelection();
                }
            } else {
                console.log("🆕 Сохранение не найдено, начинаем новую игру");
                this.showHeroSelection();
            }
            
            this.startAutosave();
            
            this.startHealthRegeneration();
                  
            this.setupBattleCrashProtection();
            
            setTimeout(() => {
                if (this.systems.hero && this.currentHero && !this.systems.hero.currentHero) {
                    this.systems.hero.currentHero = this.currentHero;
                    console.log("✅ HeroSystem синхронизирован с текущим героем");
                    
                    if (this.currentScreen === 'hero-game') {
                        this.systems.hero.showHeroGameScreen();
                    }
                }
            }, 1000);
            
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
            
            // Создаем MapSystem первым
            this.systems.map = new MapSystem();
            
            // Создаем ActionSystem и передаем MapSystem
            this.systems.action = new ActionSystem(this.systems.map);
            
            // Инициализируем ActionSystem в MapSystem
            this.systems.map.initializeActionSystem();
            
            this.systems.shop = new ShopSystem();
            
            this.systems.resources = new ResourcesSystem();
            
            this.systems.crafting = new CraftingSystem(this);
            
            console.log("✅ Все системы инициализированы");
            
            // ========== ДОБАВИТЬ: Инициализация модулей действий ==========
            await this.initializeActionModules();
            
            console.log("🔍 Детальная проверка системы крафта:");
            console.log("1. Система крафта создана:", !!this.systems.crafting);
            console.log("2. Объект системы:", this.systems.crafting);
            console.log("3. Метод loadRecipes существует:", typeof this.systems.crafting.loadRecipes);
            
            if (this.systems.crafting && this.systems.crafting.loadRecipes) {
                console.log("📋 Загрузка рецептов крафта...");
                
                const recipesLoaded = await this.systems.crafting.loadRecipes().catch(error => {
                    console.error("❌ Ошибка при загрузке рецептов:", error);
                    return false;
                });
                
                console.log("4. Результат загрузки рецептов:", recipesLoaded);
                console.log("5. Рецепты после загрузки:", this.systems.crafting.recipes);
                
                if (recipesLoaded && this.systems.crafting.recipes) {
                    console.log("✅ Рецепты крафта загружены успешно");
                    console.log("6. Структура рецептов:", Object.keys(this.systems.crafting.recipes));
                    
                    for (const key in this.systems.crafting.recipes) {
                        console.log(`   - ${key}:`, 
                            Array.isArray(this.systems.crafting.recipes[key]) 
                                ? `массив из ${this.systems.crafting.recipes[key].length} элементов`
                                : typeof this.systems.crafting.recipes[key] === 'object'
                                    ? `объект с ${Object.keys(this.systems.crafting.recipes[key]).length} ключами`
                                    : typeof this.systems.crafting.recipes[key]
                        );
                    }
                    
                    this.systems.crafting.unlockStation('campfire');
                    this.systems.crafting.unlockStation('workbench');
                    
                    console.log("🎉 Базовые станции крафта разблокированы");
                    
                    if (this.systems.crafting.addCraftingToResources) {
                        setTimeout(() => {
                            this.systems.crafting.addCraftingToResources();
                            console.log("✅ Кнопка крафта добавлена в интерфейс ресурсов");
                        }, 1000);
                    }
                    
                } else {
                    console.warn("⚠️ Не удалось загрузить рецепты крафта");
                    console.warn("Причина: recipesLoaded =", recipesLoaded);
                    console.warn("recipes =", this.systems.crafting.recipes);
                    
                    this.systems.crafting.createFallbackRecipes();
                    console.log("🔄 Созданы резервные рецепты для тестирования");
                }
            } else {
                console.error("❌ Система крафта не инициализирована правильно");
            }
            
        } catch (error) {
            console.error("❌ Ошибка инициализации систем:", error);
            throw new Error(`Ошибка инициализации систем: ${error.message}`);
        }
    }


    // ========== НОВЫЙ МЕТОД: Инициализация модулей действий ==========
    async initializeActionModules() {
        console.log("🔄 Инициализация модулей действий...");
        
        try {
            // Проверяем, что ActionSystem загружена
            if (!this.systems.action) {
                console.error("❌ ActionSystem не доступна для инициализации модулей");
                return false;
            }
            
            console.log("🔍 Проверяем ActionSystem:", {
                hasActionSystem: !!this.systems.action,
                actionModules: this.systems.action.actionModules,
                mapSystem: this.systems.action.mapSystem
            });
            
            // Инициализируем загрузчик модулей действий
            const moduleLoader = new ActionModulesLoader(this.systems.action);
            console.log("✅ ModuleLoader создан");
            
            // Загружаем модуль охоты
            console.log("📥 Начинаем загрузку модуля охоты...");
            const loaded = await moduleLoader.loadModule('hunt');
            console.log("Результат загрузки модуля охоты:", loaded);
            
            if (loaded && window.HuntAction) {
                console.log("✅ Модуль охоты загружен, создаем экземпляр...");
                
                // Создаем экземпляр HuntAction и регистрируем его в ActionSystem
                this.systems.action.actionModules['hunt'] = new window.HuntAction(this.systems.action);
                console.log("✅ Экземпляр HuntAction создан и зарегистрирован");
                
                // Также регистрируем в game.actionModules для прямого доступа
                this.actionModules['hunt'] = this.systems.action.actionModules['hunt'];
                
                // Выводим отладочную информацию
                this.debugActionModules();
                
                return true;
            } else {
                console.warn("⚠️ Не удалось загрузить модуль охоты через loader");
                console.log("Пробуем загрузить напрямую...");
                
                // Пробуем альтернативные пути
                const success = await this.loadHuntModuleDirectly();
                if (success) {
                    return true;
                }
                
                console.warn("⚠️ Не удалось загрузить модуль охоты, создаем заглушку");
                this.createActionModuleStubs();
                return false;
            }
            
        } catch (error) {
            console.error("❌ Ошибка инициализации модулей действий:", error);
            this.createActionModuleStubs();
            return false;
        }
    }


        // ========== НОВЫЙ МЕТОД: Прямая загрузка модуля охоты ==========
    async loadHuntModuleDirectly() {
        try {
            console.log("🔄 Пытаемся загрузить модуль охоты напрямую...");
            
            const modulePaths = [
                'data/actions/hunt-action.js',
                'modules/actions/hunt-action.js',
                'hunt-action.js'
            ];
            
            for (const path of modulePaths) {
                console.log(`   Пробуем путь: ${path}`);
                try {
                    const response = await fetch(path);
                    if (!response.ok) {
                        console.log(`   ❌ Не найден: ${path}`);
                        continue;
                    }
                    
                    const code = await response.text();
                    console.log(`   ✅ Найден: ${path} (${code.length} байт)`);
                    
                    // Загружаем скрипт
                    const blob = new Blob([code], { type: 'application/javascript' });
                    const url = URL.createObjectURL(blob);
                    
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = url;
                        script.onload = resolve;
                        script.onerror = reject;
                        document.head.appendChild(script);
                    });
                    
                    URL.revokeObjectURL(url);
                    
                    if (window.HuntAction) {
                        console.log("✅ Класс HuntAction загружен!");
                        
                        // Создаем экземпляр
                        if (this.systems.action) {
                            this.systems.action.actionModules['hunt'] = new window.HuntAction(this.systems.action);
                            console.log("✅ Экземпляр HuntAction создан!");
                            return true;
                        }
                    }
                    
                } catch (e) {
                    console.log(`   ❌ Ошибка: ${e.message}`);
                }
            }
            
            console.error("❌ Не удалось загрузить модуль охоты ни с одного пути");
            return false;
            
        } catch (error) {
            console.error("❌ Ошибка прямой загрузки:", error);
            return false;
        }
    }

    // ========== НОВЫЙ МЕТОД: Отладка модулей действий ==========
    debugActionModules() {
        console.group("🔍 Отладка модулей действий (из game.js)");
        console.log("Game actionModules:", this.actionModules);
        console.log("ActionSystem actionModules:", this.systems.action?.actionModules);
        console.log("Hunt module:", this.systems.action?.actionModules['hunt']);
        
        if (this.systems.action?.actionModules['hunt']) {
            const huntModule = this.systems.action.actionModules['hunt'];
            console.log("Hunt module methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(huntModule)));
            console.log("Has execute method:", typeof huntModule.execute === 'function');
            console.log("Hunt module config:", huntModule.config);
        }
        
        console.log("Global HuntAction:", window.HuntAction);
        console.groupEnd();
    }

    // ========== НОВЫЙ МЕТОД: Принудительная перезагрузка модулей ==========
    async reloadActionModules() {
        console.log("🔄 ПРИНУДИТЕЛЬНАЯ ПЕРЕЗАГРУЗКА МОДУЛЕЙ ДЕЙСТВИЙ");
        
        // Удаляем старые модули
        if (this.systems.action) {
            delete this.systems.action.actionModules['hunt'];
        }
        delete this.actionModules['hunt'];
        
        // Удаляем глобальный класс
        delete window.HuntAction;
        
        // Загружаем заново
        const success = await this.initializeActionModules();
        
        if (success) {
            this.showNotification("✅ Модули действий перезагружены!", 'success');
        } else {
            this.showNotification("⚠️ Используется заглушка модуля охоты", 'warning');
        }
        
        return success;
    }

    // ========== НОВЫЙ МЕТОД: Создание заглушек для модулей действий ==========
    createActionModuleStubs() {
        console.log("🔄 Создаем заглушки для модулей действий...");
        
        if (this.systems.action) {
            // Заглушка для охоты
            this.systems.action.actionModules['hunt'] = {
                execute: (row, col) => {
                    console.log(`🏹 Заглушка охоты: клетка [${col},${row}]`);
                    this.showNotification("⚠️ Модуль охоты не загружен. Заглушка активирована.", 'warning');
                    
                    const cellKey = `${col},${row}`;
                    const cell = this.systems.map?.currentTacticalMap?.cells[cellKey];
                    
                    if (!cell) {
                        this.showNotification("❌ Клетка не найдена!", 'error');
                        return;
                    }
                    
                    if (cell.explored === true) {
                        this.showNotification("❌ Эта клетка уже исследована!", 'warning');
                        return;
                    }
                    
                    // Простой бой как заглушка
                    const battleSystem = this.systems.battle;
                    if (battleSystem) {
                        const randomMonster = battleSystem.getRandomMonsterForMovement();
                        if (randomMonster) {
                            this.systems.map.pendingAction = {
                                action: 'hunt',
                                row: row,
                                col: col,
                                wasSuccess: true,
                                doubleLoot: true
                            };
                            battleSystem.startBattleWithSpecificMonster(this.currentHero, randomMonster, 'hunt');
                            this.showNotification(`🏹 Простая охота на ${randomMonster.name}`, 'info');
                        }
                    }
                },
                completeHuntAfterBattle: (victory, escape, doubleLoot) => {
                    console.log(`🏹 Заглушка: обработка результата охоты`);
                    if (this.systems.map) {
                        this.systems.map.completeHuntAfterBattle(victory, escape, doubleLoot);
                    }
                },
                config: {
                    id: 'hunt',
                    icon: '🏹',
                    name: 'Охотиться',
                    description: 'Выследить и добыть дичь'
                }
            };
            
            console.log("✅ Заглушки модулей действий созданы");
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
                this.systems.level.loadLevelData(),
                this.systems.resources.loadResourcesData()
            ]);
            
            // После загрузки карт, загружаем данные клеток в ActionSystem
            if (this.systems.action) {
                await this.systems.action.loadCellData();
                await this.systems.action.loadLocationImages();
            }
            
            if (this.systems.hero.heroes.length > 0 && this.sharedResources.gold === 0) {
                const firstHero = this.systems.hero.heroes[0];
                this.sharedResources.gold = firstHero.gold;
                console.log(`💰 Начальное золото установлено из первого героя: ${firstHero.gold}`);
            }
            
            console.log("✅ Все игровые данные загружены");
            
        } catch (error) {
            throw new Error(`Ошибка загрузки данных: ${error.message}`);
        }
    }

    saveGame() {
        try {
            if (this.currentHero && this.systems.equipment && this.systems.hero) {
                if (this.currentHero.gold !== this.sharedResources.gold) {
                    console.log(`🔄 Синхронизация золота: герой ${this.currentHero.gold} → общее ${this.sharedResources.gold}`);
                    this.sharedResources.gold = this.currentHero.gold;
                }
                
                const saveData = {
                    currentHeroId: this.currentHero.id,
                    heroes: this.systems.hero.heroes.map(hero => {
                        const heroData = {
                            id: hero.id,
                            level: hero.level,
                            experience: hero.experience,
                            monstersKilled: hero.monstersKilled || 0,
                            deaths: hero.deaths || 0,
                            healthRegen: hero.healthRegen || 1.0,
                            currentHealth: hero.currentHealth || hero.baseHealth,
                            equipment: {...hero.equipment},
                            unlocked: hero.unlocked,
                            resources: hero.resources || {}
                        };
                        
                        if (hero.id === this.currentHero.id && this.systems.battle && this.systems.battle.flask) {
                            heroData.flaskState = {
                                currentCharges: this.systems.battle.flask.currentCharges,
                                content: this.systems.battle.flask.content
                            };
                        }
                        
                        return heroData;
                    }),
                    sharedResources: {
                        gold: this.sharedResources.gold,
                        inventory: [...this.sharedResources.inventory],
                        unlockedHeroes: [...this.sharedResources.unlockedHeroes],
                        resources: this.sharedResources.resources ? {...this.sharedResources.resources} : {}
                    },
                    timestamp: Date.now(),
                    version: "2.4"
                };
                
                localStorage.setItem('tigrimionSave', JSON.stringify(saveData));
                console.log("💾 Игра сохранена с прогрессом всех героев и ресурсами", {
                    gold: this.sharedResources.gold,
                    heroes: this.systems.hero.heroes.map(h => `${h.name}: ур.${h.level}, опыт:${h.experience}`),
                    resourcesCount: Object.keys(this.sharedResources.resources || {}).length,
                    flaskCharges: this.systems.battle?.flask?.currentCharges || 'N/A',
                    flaskContent: this.systems.battle?.flask?.content || 'N/A'
                });
                return true;
            }
        } catch (error) {
            console.error("❌ Ошибка сохранения:", error);
        }
        return false;
    }

    loadSave() {
        try {
            const save = localStorage.getItem('tigrimionSave');
            if (save) {
                const data = JSON.parse(save);
                console.log("📂 Загружаем сохранение:", data);
                
                if (data.sharedResources) {
                    this.sharedResources = {
                        gold: data.sharedResources.gold || 0,
                        inventory: data.sharedResources.inventory || [],
                        unlockedHeroes: data.sharedResources.unlockedHeroes || [1],
                        resources: data.sharedResources.resources || {}
                    };
                    console.log("✅ Общий инвентарь и ресурсы загружены:", {
                        inventory: this.sharedResources.inventory.length,
                        resources: Object.keys(this.sharedResources.resources).length
                    });
                } else {
                    if (this.systems.hero.heroes.length > 0) {
                        const firstHero = this.systems.hero.heroes[0];
                        this.sharedResources.gold = firstHero.gold || 0;
                        this.sharedResources.inventory = [];
                        this.sharedResources.unlockedHeroes = [1];
                        this.sharedResources.resources = {};
                        console.log(`💰 Золото установлено из первого героя (старое сохранение): ${firstHero.gold}`);
                    }
                }
                
                if (data.heroes && this.systems.hero) {
                    const savedHeroesMap = new Map();
                    data.heroes.forEach(hero => savedHeroesMap.set(hero.id, hero));
                    
                    this.systems.hero.heroes.forEach(existingHero => {
                        const savedHero = savedHeroesMap.get(existingHero.id);
                        
                        if (savedHero) {
                            existingHero.level = savedHero.level || existingHero.level;
                            existingHero.experience = savedHero.experience || existingHero.experience;
                            existingHero.currentHealth = savedHero.currentHealth || existingHero.baseHealth;
                            existingHero.monstersKilled = savedHero.monstersKilled || 0;
                            existingHero.deaths = savedHero.deaths || 0;
                            existingHero.unlocked = savedHero.unlocked !== undefined ? savedHero.unlocked : existingHero.unlocked;
                            
                            if (savedHero.equipment) {
                                existingHero.equipment = {...savedHero.equipment};
                            }
                            
                            if (savedHero.resources) {
                                existingHero.resources = {...savedHero.resources};
                            }
                            
                            console.log(`🎯 Загружен герой: ${existingHero.name}`, {
                                level: existingHero.level,
                                experience: existingHero.experience,
                                health: existingHero.currentHealth,
                                equipment: existingHero.equipment,
                                resourcesCount: Object.keys(existingHero.resources || {}).length
                            });
                        }
                    });
                    
                    console.log("✅ Прогресс всех героев загружен");
                }
                
                if (data.currentHeroId && this.systems.hero) {
                    this.currentHero = this.systems.hero.heroes.find(h => h.id === data.currentHeroId);
                    if (this.currentHero) {
                        this.currentHero.inventory = [...this.sharedResources.inventory];
                        this.currentHero.gold = this.sharedResources.gold;
                        
                        if (!this.currentHero.resources && this.sharedResources.resources) {
                            this.currentHero.resources = {...this.sharedResources.resources};
                        }
                        
                        if (this.systems.battle && this.systems.battle.flask) {
                            const savedHero = data.heroes?.find(h => h.id === this.currentHero.id);
                            if (savedHero?.flaskState) {
                                this.systems.battle.flask.currentCharges = savedHero.flaskState.currentCharges;
                                this.systems.battle.flask.content = savedHero.flaskState.content;
                                console.log(`💧 Фляга восстановлена для ${this.currentHero.name}: ${savedHero.flaskState.currentCharges} зарядов (${savedHero.flaskState.content})`);
                            } else {
                                this.systems.battle.flask.currentCharges = 10;
                                this.systems.battle.flask.content = 'water';
                                console.log(`💧 Фляга сброшена к значениям по умолчанию для ${this.currentHero.name}`);
                            }
                            
                            if (this.systems.battle.updateFlaskUI) {
                                this.systems.battle.updateFlaskUI();
                            }
                            if (this.systems.battle.updateFlaskChargesDisplay) {
                                this.systems.battle.updateFlaskChargesDisplay();
                            }
                        }
                        
                        if (this.systems.equipment) {
                            this.systems.equipment.setCurrentHero(this.currentHero);
                        }
                        if (this.systems.hero) {
                            this.systems.hero.currentHero = this.currentHero;
                        }
                        if (this.systems.resources) {
                            this.systems.resources.sharedResources = this.sharedResources;
                        }
                        
                        console.log("✅ Текущий герой восстановлен с общим инвентарем и ресурсами:", {
                            name: this.currentHero.name,
                            inventory: this.currentHero.inventory.length,
                            gold: this.currentHero.gold,
                            resources: Object.keys(this.currentHero.resources || {}).length
                        });
                    }
                }
                
                return true;
            } else {
                console.log("🆕 Сохранение не найдено, начинаем новую игру");
                
                this.sharedResources = {
                    gold: 100,
                    inventory: [],
                    unlockedHeroes: [1],
                    resources: {}
                };
                
                if (this.systems.hero && this.systems.hero.heroes.length > 0) {
                    const firstHero = this.systems.hero.heroes[0];
                    this.sharedResources.gold = firstHero.gold || 100;
                    
                    this.systems.hero.heroes.forEach(hero => {
                        hero.gold = this.sharedResources.gold;
                        hero.resources = {};
                    });
                    
                    console.log(`💰 Начальное золото для новой игры: ${this.sharedResources.gold}`);
                }
                
                if (this.systems.battle && this.systems.battle.flask) {
                    this.systems.battle.flask.currentCharges = 10;
                    this.systems.battle.flask.content = 'water';
                    console.log("💧 Фляга установлена на значения по умолчанию для новой игры");
                }
                
                if (this.systems.resources) {
                    this.systems.resources.sharedResources = this.sharedResources;
                }
            }
        } catch (error) {
            console.error("❌ Ошибка загрузки сохранения:", error);
            localStorage.removeItem('tigrimionSave');
            console.log("🗑️ Битое сохранение удалено");
            
            this.sharedResources = {
                gold: 100,
                inventory: [],
                unlockedHeroes: [1],
                resources: {}
            };
            
            if (this.systems.battle && this.systems.battle.flask) {
                this.systems.battle.flask.currentCharges = 10;
                this.systems.battle.flask.content = 'water';
            }
            
            if (this.systems.resources) {
                this.systems.resources.sharedResources = this.sharedResources;
            }
        }
        return false;
    }

    startAutosave() {
        setInterval(() => {
            if (this.currentHero) {
                this.saveGame();
                console.log("💾 Автосохранение выполнено");
            }
        }, 30000);
        
        window.addEventListener('beforeunload', () => {
            if (this.currentHero) {
                this.saveGame();
                console.log("💾 Сохранение при закрытии страницы");
            }
        });
    }

    startHealthRegeneration() {
        setInterval(() => {
            if (this.currentHero && this.systems.hero) {
                const stats = this.systems.hero.calculateHeroStats(this.currentHero);
                
                if (this.currentHero.currentHealth > 0 && 
                    this.currentHero.currentHealth < stats.maxHealth &&
                    !this.currentHero.isInPostDeathRegeneration) {
                    
                    const baseRegen = 0.5;
                    const bonusRegen = (stats.healthRegen || 1) * baseRegen;
                    const totalRegen = baseRegen + bonusRegen;
                    
                    this.currentHero.currentHealth = Math.min(
                        stats.maxHealth, 
                        this.currentHero.currentHealth + totalRegen
                    );
                    
                    if (Math.random() < 0.02) {
                        this.saveGame();
                    }
                    
                    console.log(`❤️ Обычная регенерация: +${totalRegen.toFixed(1)} HP (${this.currentHero.currentHealth}/${stats.maxHealth})`);
                }
            }
        }, 1000);
    }

    setupBattleCrashProtection() {
        window.addEventListener('beforeunload', (e) => {
            if (this.systems?.battle?.battleActive) {
                console.log("💀 Перезагрузка во время боя - поражение");
                
                if (this.currentHero) {
                    this.currentHero.currentHealth = 1;
                    this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
                    
                    if (this.systems.map) {
                        this.systems.map.completeMovementAfterBattle(false, false);
                    }
                    
                    this.saveGame();
                    console.log("💾 Сохранено состояние после поражения при перезагрузке");
                }
            }
        });

        window.addEventListener('unload', () => {
            if (this.systems?.battle?.battleActive) {
                console.log("🔄 Страница обновляется во время боя");
            }
        });

        window.addEventListener('load', () => {
            const wasBattleActive = sessionStorage.getItem('battleWasActive');
            if (wasBattleActive === 'true') {
                console.log("🎲 Восстановление после перезагрузки во время боя");
                sessionStorage.removeItem('battleWasActive');
                
                setTimeout(() => {
                    this.showNotification("💀 Бой прерван перезагрузкой! Герой возвращен на стартовую позицию.", 'error');
                }, 1000);
            }
        });
    }

    markBattleAsActive() {
        if (this.systems?.battle?.battleActive) {
            sessionStorage.setItem('battleWasActive', 'true');
        }
    }

    markBattleAsInactive() {
        sessionStorage.removeItem('battleWasActive');
    }
    
    handleHeroDeath() {
        if (!this.currentHero) return;
        
        console.log(`💀 Основная игра: обработка смерти ${this.currentHero.name}`);
        
        this.currentHero.currentHealth = 1;
        
        this.currentHero.isInPostDeathRegeneration = true;
        
        this.saveGame();
        
        this.showNotification(`💀 ${this.currentHero.name} повержен! Здоровье восстановится до 1 и начнет регенерировать.`, 'warning');
        
        setTimeout(() => {
            if (this.currentHero) {
                this.currentHero.isInPostDeathRegeneration = false;
            }
        }, 10000);
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
        if (!hero) {
            console.error(`❌ Герой с ID ${heroId} не найден`);
            return;
        }

        const isUnlocked = hero.unlocked;
        if (!isUnlocked) {
            this.showNotification(`❌ Герой ${hero.name} заблокирован!`);
            return;
        }

        if (this.sharedResources) {
            hero.gold = this.sharedResources.gold;
            hero.resources = {...this.sharedResources.resources};
        }

        this.currentHero = hero;
        
        if (this.systems.equipment) {
            this.systems.equipment.setCurrentHero(hero);
        }
        
        if (this.systems.battle && this.systems.battle.flask) {
            let hasFlaskState = false;
            const save = localStorage.getItem('tigrimionSave');
            if (save) {
                try {
                    const data = JSON.parse(save);
                    const savedHeroData = data.heroes?.find(h => h.id === heroId);
                    if (savedHeroData?.flaskState) {
                        this.systems.battle.flask.currentCharges = savedHeroData.flaskState.currentCharges;
                        this.systems.battle.flask.content = savedHeroData.flaskState.content;
                        hasFlaskState = true;
                        console.log(`💧 Восстановлено состояние фляги для ${hero.name}: ${savedHeroData.flaskState.currentCharges} зарядов (${savedHeroData.flaskState.content})`);
                    }
                } catch (e) {
                    console.error("❌ Ошибка чтения состояния фляги:", e);
                }
            }
            
            if (!hasFlaskState) {
                this.systems.battle.flask.currentCharges = 10;
                this.systems.battle.flask.content = 'water';
                console.log(`💧 Установлены значения по умолчанию для фляги ${hero.name}`);
            }
            
            if (this.systems.battle.updateFlaskUI) {
                this.systems.battle.updateFlaskUI();
            }
            if (this.systems.battle.updateFlaskChargesDisplay) {
                this.systems.battle.updateFlaskChargesDisplay();
            }
        }
        
        if (this.systems.battle) {
            this.systems.battle.currentHero = hero;
        }
        if (this.systems.shop) {
            this.systems.shop.currentHero = hero;
        }
        if (this.systems.map) {
            this.systems.map.setCurrentHero(hero);
        }
        if (this.systems.action) {
            this.systems.action.mapSystem.setCurrentHero(hero);
        }
        if (this.systems.resources) {
            this.systems.resources.sharedResources = this.sharedResources;
        }
        
        this.saveGame();
        
        console.log(`🎯 Выбран герой: ${hero.name}, уровень: ${hero.level}, опыт: ${hero.experience}, золото: ${hero.gold}, ресурсов: ${Object.keys(hero.resources || {}).length}`);
        this.showHeroGameScreen();
    }

    handleEquipmentSlotClick(slot) {
        console.log(`Клик по слоту: ${slot}`);
        const itemId = this.currentHero.equipment[slot];
        
        if (itemId && this.systems.equipment) {
            this.systems.equipment.unequipItem(slot);
            this.showHeroGameScreen();
            this.saveGame();
            this.showNotification(`✅ Предмет снят со слота ${this.getSlotName(slot)}`, 'success');
        } else {
            this.showEquipmentForSlot(slot);
        }
    }

    fixHealthBarLayout() {
        setTimeout(() => {
            const healthBars = document.querySelectorAll('.health-bar, .experience-bar');
            healthBars.forEach(bar => {
                bar.style.margin = '0';
                bar.style.padding = '0';
                bar.style.position = 'relative';
            });
            
            const containers = document.querySelectorAll('.health-bar-container, .experience-bar-container');
            containers.forEach(container => {
                container.style.margin = '4px 0 0 0';
                container.style.padding = '0';
                container.style.position = 'relative';
            });
            
            const sections = document.querySelectorAll('.health-display-section, .experience-display-section');
            sections.forEach(section => {
                section.style.margin = '0';
                section.style.padding = '8px 0';
                section.style.position = 'relative';
            });
            
            console.log("✅ Layout полосок здоровья исправлен");
        }, 300);
    }

    showHeroGameScreen() {
        if (!this.currentHero) return;

        const app = document.getElementById('app');
        if (!this.systems.hero || !this.systems.hero.calculateHeroStats) {
            console.error("❌ HeroSystem не доступен");
            this.showHeroSelection();
            return;
        }

        const stats = this.systems.hero.calculateHeroStats(this.currentHero);
        
        const renderEquipmentColumn = (slots) => {
            return slots.map(slot => {
                const itemId = this.currentHero.equipment[slot];
                const item = itemId && this.systems.equipment ? 
                    this.systems.equipment.getItemById(itemId) : null;
                
                return `
                    <div class="equipment-slot-column-v2 ${item ? 'equipped' : 'empty'}"
                         onclick="game.handleEquipmentSlotClick('${slot}')"
                         ${item ? `data-rarity="${item.rarity || 'common'}"` : ''}>
                        <div class="slot-icon-column-v2">
                            ${item ? 
                                `<img src="${item.image}" alt="${item.name}" 
                                      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                                 <div class="item-fallback" style="display: none;">
                                     <span>${this.getSlotIcon(slot)}</span>
                                 </div>` : 
                                this.getSlotIcon(slot)
                            }
                        </div>
                        <div class="slot-label-column-v2">${this.getSlotName(slot)}</div>
                    </div>
                `;
            }).join('');
        };

        const activeBonuses = stats.activeBonuses || [];
        const bonusesHTML = activeBonuses.length > 0 ? 
            activeBonuses.map(bonus => `
                <div class="bonus-item-v2">
                    <span class="bonus-label-v2">${bonus.label}</span>
                    <span class="bonus-value-v2">${bonus.display}</span>
                </div>
            `).join('') : 
            `<div class="bonus-item-v2">
                <span class="bonus-label-v2">Активные бонусы</span>
                <span class="bonus-value-v2">Нет активных</span>
            </div>`;

        app.innerHTML = `
            <div class="hero-game-screen">
                <!-- Верхняя панель кнопок -->
                <div class="top-action-bar">
                    <button class="btn-top" onclick="game.showOverlay('global-map')">🗺️ Глобальная карта</button>
                    <button class="btn-top" onclick="game.showOverlay('tactical-map')">🎲 Тактическая карта</button>
                    <button class="btn-top" onclick="game.systems.map.showTacticalMapEditor()">🎯 Редактор карты</button>
                    <button class="btn-top" onclick="game.systems.map.debugInfo()">🐛 Отладка карты</button>
                    <button class="btn-top" onclick="game.showOverlay('inventory')">🎒 Инвентарь</button>
                    <button class="btn-top" onclick="game.showOverlay('resources')">📦 Ресурсы</button>
                    <button class="btn-top" onclick="game.systems.hero.showHeroStory()">📖 История Героя</button>
                    <button class="btn-top" onclick="game.showHeroSelection()">🔁 Сменить героя</button>
                    <button class="btn-top" onclick="game.systems.hero.resetCurrentHero()">🔄 Сбросить героя</button>
                    <button class="btn-top" onclick="game.debugCrafting()">⚗️ Отладка крафта</button>
                </div>

                <!-- Основная область героя -->
                <div class="hero-main-window-v2">
                    <!-- Левый столбец экипировки -->
                    <div class="equipment-column-v2 left-column">
                        ${renderEquipmentColumn(['main_hand', 'off_hand', 'helmet', 'relic'])}
                    </div>

                    <!-- Центральная область с героем -->
                    <div class="hero-center-area-v2">
                        <div class="hero-image-container-v2">
                            <img src="${this.currentHero.image}" alt="${this.currentHero.name}" 
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzg4OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                            
                            <!-- Полоски поверх картинки -->
                            <div class="hero-overlay-stats-v2">
                                <!-- Полоска здоровья -->
                                <div class="health-display-section">
                                    <div class="health-bar-container">
                                        <div class="health-bar" id="heroHealthBar" 
                                             style="width: ${(stats.currentHealth / stats.maxHealth) * 100}%">
                                            ${stats.currentHealth}/${stats.maxHealth}
                                        </div>
                                    </div>
                                </div>

                                <!-- Полоска опыта -->
                                <div class="experience-display-section">
                                    <div class="experience-bar-container">
                                        <div class="experience-bar" id="heroExperienceBar" 
                                             style="width: ${this.systems.hero.getExperiencePercent(this.currentHero)}%">
                                            ${this.currentHero.experience}/${this.systems.hero.getExperienceForNextLevel(this.currentHero.level)}
                                        </div>
                                    </div>
                                </div>

                                <!-- Компактные параметры -->
                                <div class="compact-stats-v2">
                                    <div class="compact-stat-v2">
                                        <span class="stat-label-v2">⚔️ Урон</span>
                                        <span class="stat-value-v2">${stats.damage}</span>
                                    </div>
                                    <div class="compact-stat-v2">
                                        <span class="stat-label-v2">🛡️ Броня</span>
                                        <span class="stat-value-v2">${stats.armor}</span>
                                    </div>
                                    <div class="compact-stat-v2">
                                        <span class="stat-label-v2">💰 Золото</span>
                                        <span class="stat-value-v2">${this.currentHero.gold.toFixed(2)}</span>
                                    </div>
                                    <div class="compact-stat-v2">
                                        <span class="stat-label-v2">🌟 Сила</span>
                                        <span class="stat-value-v2">${stats.power}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ВСЕ параметры и бонусы под картинкой -->
                        <div class="hero-full-info-v2">
                            <!-- Происхождение -->
                            <div class="hero-origins-section-v2">
                                <h4>🎭 Происхождение</h4>
                                <div class="origin-item-v2">
                                    <span class="origin-type-v2">🧬 Раса: ${this.getRaceName(this.currentHero.race)}</span>
                                    <span class="origin-bonus-v2">${this.systems.hero.getRaceBonusDescription(this.currentHero.race)}</span>
                                </div>
                                <div class="origin-item-v2">
                                    <span class="origin-type-v2">⚔️ Профессия: ${this.getClassName(this.currentHero.class)}</span>
                                    <span class="origin-bonus-v2">${this.systems.hero.getClassBonusDescription(this.currentHero.class)}</span>
                                </div>
                                <div class="origin-item-v2">
                                    <span class="origin-type-v2">📖 Сага: ${this.getSagaName(this.currentHero.saga)}</span>
                                    <span class="origin-bonus-v2">${this.systems.hero.getSagaBonusDescription(this.currentHero.saga)}</span>
                                </div>
                            </div>

                            <!-- Активные бонусы -->
                            <div class="hero-bonuses-section-v2">
                                <h4>🎯 Активные бонусы</h4>
                                <div class="bonuses-grid-v2">
                                    ${bonusesHTML}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Правый столбец экипировки -->
                    <div class="equipment-column-v2 right-column">
                        ${renderEquipmentColumn(['chest', 'gloves', 'legs', 'boots'])}
                    </div>
                </div>

                <!-- Область для оверлеев -->
                <div id="overlay-container" class="overlay-container"></div>
            </div>
        `;
        
        setTimeout(() => {
            if (this.systems.hero) {
                this.systems.hero.startHealthBarUpdates();
                this.systems.hero.calculateHeroStats();
                
                setTimeout(() => {
                    this.systems.hero.updateHealthAndExperienceBars();
                }, 500);
            }
        }, 100);

        setTimeout(() => {
            this.fixHealthBarLayout();
        }, 200);
        
        console.log("✅ Исправленный интерфейс героя отрендерен");
    }


   showInventoryHub() {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="hero-game-screen">
                <div class="top-action-bar">
                    <button class="btn-top" onclick="game.showHeroGameScreen()">← Назад к герою</button>
                </div>
                
                <div class="inventory-hub">
                    <div class="hub-header">
                        <h2>🎪 Центр управления</h2>
                    </div>
                    
                    <div class="hub-grid">
                        <!-- Инвентарь снаряжения -->
                        <div class="hub-card" onclick="game.showOverlay('inventory')">
                            <div class="hub-icon">🎒</div>
                            <div class="hub-title">Экипировка</div>
                            <div class="hub-description">Снаряжение, оружие, броня</div>
                            <div class="hub-stats">
                                ${this.currentHero ? `${this.currentHero.inventory.length}/100 предметов` : 'Загрузка...'}
                            </div>
                        </div>
                        
                        <!-- Ресурсы -->
                        <div class="hub-card" onclick="game.showOverlay('resources')">
                            <div class="hub-icon">📦</div>
                            <div class="hub-title">Ресурсы</div>
                            <div class="hub-description">Материалы для крафта</div>
                            <div class="hub-stats">
                                ${this.systems.resources ? 'Доступно' : 'Загрузка...'}
                            </div>
                        </div>
                        
                        <!-- Крафт -->
                        <div class="hub-card" onclick="game.systems.resources.showCrafting()">
                            <div class="hub-icon">⚗️</div>
                            <div class="hub-title">Крафт</div>
                            <div class="hub-description">Создание предметов</div>
                            <div class="hub-stats">
                                ${this.systems.resources ? `${Object.keys(this.systems.resources.craftingRecipes).length} рецептов` : 'Загрузка...'}
                            </div>
                        </div>
                        
                        <!-- Магазин -->
                        <div class="hub-card" onclick="game.showOverlay('shop')">
                            <div class="hub-icon">🏪</div>
                            <div class="hub-title">Магазин</div>
                            <div class="hub-description">Покупка и продажа</div>
                            <div class="hub-stats">
                                Доступно всегда
                            </div>
                        </div>
                        
                        <!-- Продажа -->
                        <div class="hub-card" onclick="game.showSellScreen()">
                            <div class="hub-icon">💰</div>
                            <div class="hub-title">Продажа</div>
                            <div class="hub-description">Быстрая продажа предметов</div>
                            <div class="hub-stats">
                                Нажми для продажи
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="overlay-container" class="overlay-container"></div>
            </div>
        `;
    }

    async showCrafting() {
        try {
            console.log("🔨 Открытие интерфейса крафта...");
            
            console.log("Состояние системы крафта:", {
                hasSystem: !!this.systems.crafting,
                recipes: this.systems.crafting?.recipes,
                recipesCount: this.systems.crafting?.recipes ? Object.keys(this.systems.crafting.recipes).length : 0,
                stations: this.systems.crafting?.recipes?.stations,
                stationsCount: this.systems.crafting?.recipes?.stations ? Object.keys(this.systems.crafting.recipes.stations).length : 0
            });
            
            if (!this.systems.crafting) {
                console.error("❌ Система крафта не инициализирована");
                this.showNotification("❌ Система крафта не доступна", "error");
                return;
            }
            
            if (this.systems.crafting.recipes && Object.keys(this.systems.crafting.recipes).length > 0) {
                console.log("✅ Рецепты найдены, открываем интерфейс...");
                
                const html = this.systems.crafting.showCraftingUI('all', 'all');
                
                const overlayHTML = `
                    <div class="overlay-content crafting-overlay">
                        ${html}
                    </div>
                `;
                
                this.showOverlayContent(overlayHTML, 'crafting-overlay');
                
                console.log("✅ Интерфейс крафта открыт");
            } else {
                console.warn("⚠️ Рецепты не найдены, создаем резервные...");
                
                this.systems.crafting.createFallbackRecipes();
                
                const html = this.systems.crafting.showCraftingUI('all', 'all');
                
                const overlayHTML = `
                    <div class="overlay-content crafting-overlay">
                        ${html}
                    </div>
                `;
                
                this.showOverlayContent(overlayHTML, 'crafting-overlay');
                
                this.showNotification("⚠️ Используются базовые рецепты крафта", "warning");
            }
            
        } catch (error) {
            console.error("❌ Ошибка при открытии крафта:", error);
            this.showNotification(`❌ Ошибка: ${error.message}`, "error");
        }
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
                container.style.display = 'block';
                break;

            case 'local-map':
            case 'tactical-map':
                if (this.systems.map) {
                    this.systems.map.showOverlay(overlayType);
                } else {
                    container.innerHTML = '<div class="map-error">Система карт не загружена</div>';
                    container.style.display = 'block';
                }
                break;

            case 'inventory':
                container.innerHTML = this.systems.equipment.showInventory();
                container.style.display = 'block';
                break;

            case 'resources':
                if (this.systems.resources && this.systems.resources.loaded) {
                    if (!this.systems.resources.sharedResources && this.sharedResources) {
                        this.systems.resources.sharedResources = this.sharedResources;
                    }
                    
                    container.innerHTML = this.systems.resources.showResourcesInventory();
                    container.style.display = 'block';
                } else {
                    container.innerHTML = `
                        <div class="overlay-content">
                            <div class="overlay-header">
                                <h3>📦 Ресурсы</h3>
                                <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                            </div>
                            <div class="overlay-body">
                                <div class="error-message">
                                    ❌ Система ресурсов не загружена. Попробуйте перезагрузить игру.
                                </div>
                            </div>
                        </div>
                    `;
                    container.style.display = 'block';
                }
                break;
                
            case 'shop':
                if (this.systems.shop) {
                    const testMerchantCell = {
                        col: 4,
                        row: 4,
                        shopName: "Оружейная Борга",
                        merchantName: "Борг Железный",
                        shopItems: [1, 2, 3, 15, 22, 34],
                        restockTimer: 86400000
                    };
                    this.systems.shop.openShop(testMerchantCell);
                } else {
                    console.warn("ShopSystem не доступна, используем EquipmentSystem");
                    const currentCategory = this.systems.equipment.currentCategory || 'all';
                    const currentSubcategory = this.systems.equipment.currentSubcategory || 'all';
                    container.innerHTML = this.systems.equipment.showShop(currentCategory, currentSubcategory);
                    container.style.display = 'block';
                    
                    setTimeout(() => this.attachShopItemHandlers(), 100);
                }
                break;

            default:
                console.warn(`⚠️ Неизвестный тип оверлея: ${overlayType}`);
                container.innerHTML = `<div class="map-error">Неизвестный тип окна: ${overlayType}</div>`;
                container.style.display = 'block';
        }
    }

    attachShopItemHandlers() {
        const shopItems = document.querySelectorAll('.shop-item');
        console.log(`Найдено предметов в магазине: ${shopItems.length}`);
        
        shopItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = item.getAttribute('data-item-id');
                console.log(`Клик по предмету ID: ${itemId}`);
                if (itemId) {
                    this.showItemDetailModal(parseInt(itemId));
                }
            });
        });
    }

    showItemDetailModal(itemId) {
        console.log(`Открываем модалку для предмета ID: ${itemId}`);
        const item = this.systems.equipment.getItemById(itemId);
        if (!item) {
            console.error(`Предмет с ID ${itemId} не найден!`);
            return;
        }

        const canBuy = this.currentHero.gold >= item.price;
        const isOwned = this.systems.equipment.isItemOwned(itemId);

        const modalHTML = `
            <div class="item-detail-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4>🔍 Детали предмета</h4>
                        <button class="close-modal" onclick="game.closeItemDetailModal()">✕</button>
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
                                        ${this.systems.equipment.formatBonus(item.bonus)}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="item-stats-detailed">
                                <h5>📊 Характеристики</h5>
                                ${item.stats ? Object.entries(item.stats).map(([key, value]) => `
                                    <div class="stat-line">
                                        <span>${this.getStatLabel(key)}</span>
                                        <span class="stat-value">+${value}</span>
                                    </div>
                                `).join('') : ''}
                                ${item.fixed_damage ? `<div class="stat-line"><span>⚔️ Урон:</span> <span class="stat-value">+${item.fixed_damage}</span></div>` : ''}
                                ${item.fixed_armor ? `<div class="stat-line"><span>🛡️ Броня:</span> <span class="stat-value">+${item.fixed_armor}</span></div>` : ''}
                                ${item.fixed_health ? `<div class="stat-line"><span>❤️ Здоровье:</span> <span class="stat-value">+${item.fixed_health}</span></div>` : ''}
                            </div>
                            
                            ${item.setName && this.systems.equipment.itemSets[item.setName] ? `
                                <div class="item-set-details">
                                    <h5>✨ Бонус сета:</h5>
                                    <div class="set-info">
                                        <strong>${this.systems.equipment.itemSets[item.setName].name}</strong>
                                        <div class="set-bonus">${this.systems.equipment.formatBonus(this.systems.equipment.itemSets[item.setName].bonus)}</div>
                                        <div class="set-description">${this.systems.equipment.itemSets[item.setName].description}</div>
                                        <div class="set-requirements">Требуется предметов: ${this.systems.equipment.itemSets[item.setName].requiredPieces}/6</div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${item.requirements ? `
                                <div class="item-requirements">
                                    <h5>⚡ Требования</h5>
                                    ${Object.entries(item.requirements).map(([key, value]) => `
                                        <div class="stat-line">
                                            <span>${this.getRequirementLabel(key)}</span>
                                            <span class="stat-value">${value}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <div class="item-actions">
                                <div class="price-section">
                                    <span class="buy-price">💰 ${item.price} золота</span>
                                    ${item.sellPrice ? `<span class="sell-price">💸 ${item.sellPrice} золота</span>` : ''}
                                </div>
                                
                                ${!isOwned ? `
                                    <button class="btn-primary ${!canBuy ? 'disabled' : ''}" 
                                            onclick="game.buyItemFromModal(${itemId})" 
                                            ${!canBuy ? 'disabled' : ''}>
                                        🛒 Купить
                                    </button>
                                    ${!canBuy ? `
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

    showZoomedImage(imageSrc, itemName) {
        const zoomOverlay = document.createElement('div');
        zoomOverlay.className = 'item-image-zoom-overlay';
        
        zoomOverlay.innerHTML = `
            <div class="close-zoom" onclick="this.parentElement.remove()">×</div>
            <img src="${imageSrc}" alt="${itemName}" class="item-image-zoomed"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
        `;
        
        zoomOverlay.addEventListener('click', (e) => {
            if (e.target === zoomOverlay) {
                zoomOverlay.remove();
            }
        });
        
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                zoomOverlay.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        document.body.appendChild(zoomOverlay);
    }

    returnToTacticalMap() {
        const app = document.getElementById('app');
        if (app) {
            this.showHeroGameScreen();
            
            setTimeout(() => {
                if (this.systems.map) {
                    this.systems.map.showOverlay('tactical-map');
                }
            }, 100);
        }
    }

    manageBattleWithMap() {
        if (this.systems.battle && this.systems.battle.battleActive) {
            this.systems.battle.showBattleScreen();
        }
    }

    startMovementBattle(hero, monsterId) {
        if (this.systems.battle) {
            this.hideOverlay();
            
            setTimeout(() => {
                this.systems.battle.startBattleWithMonster(hero, monsterId, 'movement');
            }, 50);
        }
    }

    buyItemFromModal(itemId) {
        const item = this.systems.equipment.getItemById(itemId);
        if (!item) return;

        if (this.currentHero.gold >= item.price) {
            this.currentHero.gold -= item.price;
            this.systems.equipment.addItemToInventory(itemId);
            
            this.saveGame();
            
            this.showNotification(`✅ Предмет "${item.name}" куплен!`, 'success');
            this.closeItemDetailModal();
            
            this.refreshShop();
            
        } else {
            this.showNotification('❌ Недостаточно золота!', 'error');
        }
    }

    closeItemDetailModal() {
        const container = document.getElementById('overlay-container');
        if (container && this.systems.equipment) {
            const currentCategory = this.systems.equipment.currentCategory || 'all';
            const currentSubcategory = this.systems.equipment.currentSubcategory || 'all';
            container.innerHTML = this.systems.equipment.showShop(currentCategory, currentSubcategory);
            setTimeout(() => this.attachShopItemHandlers(), 100);
        }
    }

    hideOverlay() {
        const container = document.getElementById('overlay-container');
        if (container) {
            if (this.systems.map && (this.activeOverlay === 'tactical-map' || this.activeOverlay === 'local-map')) {
                this.systems.map.hideOverlay();
            } else {
                container.style.display = 'none';
                container.innerHTML = '';
            }
            this.activeOverlay = null;
        }
    }

    showOverlayContent(content, className = '') {
        const container = document.getElementById('overlay-container');
        if (!container) return;
        
        container.innerHTML = content;
        container.style.display = 'block';
        
        if (className) {
            container.firstElementChild?.classList.add(className);
        }
    }
    
    showEquipmentForSlot(slot) {
        this.showOverlay('inventory');
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

    showNotification(message, type = 'info') {
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
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

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

    getItemIcon(itemType) {
        const icons = {
            'weapon': '⚔️',
            'armor': '🛡️',
            'potion': '🧪',
            'scroll': '📜',
            'misc': '📦'
        };
        return icons[itemType] || '📦';
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

    getRequirementLabel(requirement) {
        const labels = {
            'level': 'Уровень',
            'strength': 'Сила',
            'agility': 'Ловкость',
            'intelligence': 'Интеллект'
        };
        return labels[requirement] || requirement;
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
        console.log("Текущий герой в HeroSystem:", this.systems.hero?.currentHero);
        console.log("Инвентарь текущего героя:", this.currentHero?.inventory);
        console.log("Экипировка текущего героя:", this.currentHero?.equipment);
        console.log("Предметы в системе экипировки:", this.systems.equipment ? this.systems.equipment.items.length : 0);
        
        const save = localStorage.getItem('tigrimionSave');
        if (save) {
            const data = JSON.parse(save);
            console.log("Данные в сохранении:", data);
        } else {
            console.log("Сохранение не найдено");
        }
        
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

    refreshShop() {
        const container = document.getElementById('overlay-container');
        if (container && this.activeOverlay === 'shop') {
            const currentCategory = this.systems.equipment.currentCategory || 'all';
            const currentSubcategory = this.systems.equipment.currentSubcategory || 'all';
            container.innerHTML = this.systems.equipment.showShop(currentCategory, currentSubcategory);
            setTimeout(() => this.attachShopItemHandlers(), 100);
        }
    }

    debugCrafting() {
        if (this.systems.crafting) {
            console.log("=== ОТЛАДКА СИСТЕМЫ КРАФТА ===");
            
            this.systems.crafting.debugCraftingSystem();
            
            this.systems.crafting.testFilePaths().then(() => {
                console.log("✅ Тестирование путей завершено");
            });
            
            console.log("Тест интерфейса крафта:");
            try {
                const html = this.systems.crafting.showCraftingUI('all', 'all');
                console.log("HTML интерфейса сгенерирован:", html.length > 0);
                console.log("Первые 500 символов HTML:", html.substring(0, 500));
            } catch (error) {
                console.error("Ошибка при генерации интерфейса:", error);
            }
        } else {
            console.error("❌ Система крафта не доступна");
        }
        
        // ========== ДОБАВИТЬ: Отладка модулей действий ==========
        console.log("=== ОТЛАДКА МОДУЛЕЙ ДЕЙСТВИЙ ===");
        if (this.systems.action && this.systems.action.actionModules) {
            console.log("Загруженные модули действий:", Object.keys(this.systems.action.actionModules));
            console.log("Модуль охоты:", this.systems.action.actionModules['hunt']);
        } else {
            console.error("❌ Модули действий не инициализированы");
        }
        
        this.showNotification("Отладка крафта и модулей действий запущена, смотрите консоль (F12)", "info");
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ИГРЫ ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log("🎮 Запуск Tigrimion RPG...");
    window.game = new SafeHeroGame();
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
