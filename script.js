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
            'shop-system', // ← ДОБАВЛЕНА ShopSystem
            'resources-system',
            'crafting-system' // ← ДОБАВИТЬ ЗДЕСЬ ⭐
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
        // ⭐ ИСПРАВЛЕННЫЙ ПУТЬ: разные пути для разных модулей
        let modulePath;
        if (moduleName === 'crafting-system') {
            modulePath = 'crafting-system.js'; // Корневая папка
        } else {
            modulePath = `data/modules/${moduleName}.js`;
        }
        
        console.log(`📥 Загружаем модуль: ${modulePath}`);
        
        const response = await fetch(modulePath);
        if (!response.ok) {
            // Пробуем альтернативный путь
            const altPath = `modules/${moduleName}.js`;
            console.log(`🔄 Пробуем альтернативный путь: ${altPath}`);
            const altResponse = await fetch(altPath);
            
            if (!altResponse.ok) {
                throw new Error(`Не удалось загрузить модуль ${moduleName} с путей: ${modulePath}, ${altPath}`);
            }
            
            modulePath = altPath;
        }
        
        const moduleCode = await response.text();
        
        // ⭐ БЕЗОПАСНЫЙ СПОСОБ: Используем Blob
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
        
        // ⭐ СОЗДАЕМ ПРОСТОЙ ЗАГЛУШЕЧНЫЙ МОДУЛЬ
        this.createStubModule(moduleName);
        return false;
    }
}

// ⭐ ДОБАВЬТЕ ЭТОТ МЕТОД В ModuleLoader
createStubModule(moduleName) {
    console.log(`🔄 Создаю заглушку для модуля ${moduleName}`);
    
    const classMap = {
        'crafting-system': 'CraftingSystem'
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
        'shop-system': 'ShopSystem',
        'resources-system': 'ResourcesSystem', // ← ДОБАВЬ ЭТУ СТРОЧКУ!
        'crafting-system': 'CraftingSystem' // ← ДОБАВИТЬ ЭТУ СТРОЧКУ!
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
        'shop-system': 'ShopSystem',
        'resources-system': 'ResourcesSystem',
        'crafting-system': 'CraftingSystem' // ← ДОБАВИТЬ И ЗДЕСЬ
    };
    return classMap[moduleName] || moduleName;
}

    async waitForAllModules() {
        const maxAttempts = 50; // Уменьшил количество попыток
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
                // Покажем какие модули уже загружены
                const loadedList = this.requiredModules
                    .filter(m => this.isModuleAvailable(m))
                    .map(m => this.getClassName(m));
                console.log(`📦 Загружены: ${loadedList.join(', ')}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        // Покажем какие модули не загрузились
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
            // Не бросаем ошибку сразу, пробуем продолжить с тем что есть
            console.log("🔄 Продолжаем с доступными модулями...");
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
        
        // ⭐ ДОБАВИТЬ ЭТО - ОБЩИЕ РЕСУРСЫ
        this.sharedResources = {
            gold: 0, // Временно 0, установится после загрузки героев
            inventory: [], // Общий инвентарь
            unlockedHeroes: [1], // Разблокированные герои
            // ⭐ ДОБАВЛЕНО ДЛЯ РЕСУРСОВ:
            resources: {} // Для хранения ресурсов отдельно
        };
        
        this.isSaveLoaded = false;
        this.init();
    }

    async init() {
        try {
            console.log("🎮 Инициализация игры...");
            
            this.showLoadingScreen("Загрузка игровых модулей...");
            
            await this.moduleLoader.loadAllModules();
            
            await this.initializeSystems();
            
            await this.loadGameData();
            
            // ⭐ ВАЖНО: Загружаем сохранение ДО показа интерфейса
            console.log("📂 Пытаемся загрузить сохранение...");
            const saveLoaded = this.loadSave();
            if (saveLoaded) {
                console.log("✅ Сохранение загружено");
                this.isSaveLoaded = true;
                
                // Если есть текущий герой, показываем его экран
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
            
            // Запускаем автосохранение
            this.startAutosave();
            
            // ⭐ ЗАПУСКАЕМ РЕГЕНЕРАЦИЮ ЗДОРОВЬЯ
            this.startHealthRegeneration();
                  
            // ⭐ ЗАПУСКАЕМ ЗАЩИТУ ОТ ПЕРЕЗАГРУЗКИ ВО ВРЕМЯ БОЯ
            this.setupBattleCrashProtection();
            
            // ⭐ ВАЖНОЕ ДОБАВЛЕНИЕ: Синхронизация HeroSystem после загрузки
            setTimeout(() => {
                if (this.systems.hero && this.currentHero && !this.systems.hero.currentHero) {
                    this.systems.hero.currentHero = this.currentHero;
                    console.log("✅ HeroSystem синхронизирован с текущим героем");
                    
                    // Принудительно обновляем интерфейс если нужно
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
        this.systems.map = new MapSystem();
        this.systems.shop = new ShopSystem();
        
        // ⭐ ВАЖНО: Инициализируем ResourcesSystem ДО загрузки данных
        this.systems.resources = new ResourcesSystem();
        
        // ⭐ ИСПРАВЛЕНИЕ: Инициализируем CraftingSystem и передаем this
        this.systems.crafting = new CraftingSystem(this);
        
        console.log("✅ Все системы инициализированы");
        
        // ⭐ РАСШИРЕННАЯ ОТЛАДКА КРАФТИНГА
        console.log("🔍 Детальная проверка системы крафта:");
        console.log("1. Система крафта создана:", !!this.systems.crafting);
        console.log("2. Объект системы:", this.systems.crafting);
        console.log("3. Метод loadRecipes существует:", typeof this.systems.crafting.loadRecipes);
        
        // Загружаем данные для крафта
        if (this.systems.crafting && this.systems.crafting.loadRecipes) {
            console.log("📋 Загрузка рецептов крафта...");
            
            // Добавляем обработку Promise
            const recipesLoaded = await this.systems.crafting.loadRecipes().catch(error => {
                console.error("❌ Ошибка при загрузке рецептов:", error);
                return false;
            });
            
            console.log("4. Результат загрузки рецептов:", recipesLoaded);
            console.log("5. Рецепты после загрузки:", this.systems.crafting.recipes);
            
            if (recipesLoaded && this.systems.crafting.recipes) {
                console.log("✅ Рецепты крафта загружены успешно");
                console.log("6. Структура рецептов:", Object.keys(this.systems.crafting.recipes));
                
                // Проверяем структуру рецептов
                for (const key in this.systems.crafting.recipes) {
                    console.log(`   - ${key}:`, 
                        Array.isArray(this.systems.crafting.recipes[key]) 
                            ? `массив из ${this.systems.crafting.recipes[key].length} элементов`
                            : typeof this.systems.crafting.recipes[key] === 'object'
                                ? `объект с ${Object.keys(this.systems.crafting.recipes[key]).length} ключами`
                                : typeof this.systems.crafting.recipes[key]
                    );
                }
                
                // Разблокируем базовые станции при старте игры
                this.systems.crafting.unlockStation('campfire');
                this.systems.crafting.unlockStation('workbench');
                
                console.log("🎉 Базовые станции крафта разблокированы");
                
                // Привязываем кнопку крафта к ресурсам
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
                
                // Создаем заглушки для тестирования
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
            // ⭐ ВАЖНО: Загружаем данные ресурсов
            this.systems.resources.loadResourcesData()
        ]);
        
        // ⭐ ИСПРАВЛЕНИЕ: Устанавливаем начальное золото из первого героя
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
            // Перед сохранением синхронизируем золото
            if (this.currentHero.gold !== this.sharedResources.gold) {
                console.log(`🔄 Синхронизация золота: герой ${this.currentHero.gold} → общее ${this.sharedResources.gold}`);
                this.sharedResources.gold = this.currentHero.gold;
            }
            
            const saveData = {
                currentHeroId: this.currentHero.id,
                // Сохраняем ВСЕХ героев с их прогрессом
                heroes: this.systems.hero.heroes.map(hero => {
                    const heroData = {
                        id: hero.id,
                        // Сохраняем весь прогресс каждого героя:
                        level: hero.level,
                        experience: hero.experience,
                        monstersKilled: hero.monstersKilled || 0,
                        deaths: hero.deaths || 0,
                        healthRegen: hero.healthRegen || 1.0,
                        currentHealth: hero.currentHealth || hero.baseHealth,
                        // Экипировка индивидуальна для каждого героя:
                        equipment: {...hero.equipment},
                        unlocked: hero.unlocked,
                        // ⭐ СОХРАНЯЕМ РЕСУРСЫ ГЕРОЯ
                        resources: hero.resources || {}
                    };
                    
                    // ⭐ СОХРАНЯЕМ СОСТОЯНИЕ ФЛЯГИ ТОЛЬКО ДЛЯ ТЕКУЩЕГО ГЕРОЯ
                    if (hero.id === this.currentHero.id && this.systems.battle && this.systems.battle.flask) {
                        heroData.flaskState = {
                            currentCharges: this.systems.battle.flask.currentCharges,
                            content: this.systems.battle.flask.content
                        };
                    }
                    
                    return heroData;
                }),
                // Общие ресурсы:
                sharedResources: {
                    gold: this.sharedResources.gold,
                    inventory: [...this.sharedResources.inventory],
                    unlockedHeroes: [...this.sharedResources.unlockedHeroes],
                    // ⭐ СОХРАНЯЕМ РЕСУРСЫ В ОБЩИХ РЕСУРСАХ
                    resources: this.sharedResources.resources ? {...this.sharedResources.resources} : {}
                },
                timestamp: Date.now(),
                version: "2.3" // Обновляем версию для ресурсов
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
            
            // 🔥 ВАЖНОЕ ИСПРАВЛЕНИЕ 1: Сначала загружаем общий инвентарь
            if (data.sharedResources) {
                this.sharedResources = {
                    gold: data.sharedResources.gold || 0,
                    inventory: data.sharedResources.inventory || [],
                    unlockedHeroes: data.sharedResources.unlockedHeroes || [1],
                    // ⭐ ЗАГРУЖАЕМ РЕСУРСЫ
                    resources: data.sharedResources.resources || {}
                };
                console.log("✅ Общий инвентарь и ресурсы загружены:", {
                    inventory: this.sharedResources.inventory.length,
                    resources: Object.keys(this.sharedResources.resources).length
                });
            } else {
                // Если сохранение старое - берем золото из первого героя
                if (this.systems.hero.heroes.length > 0) {
                    const firstHero = this.systems.hero.heroes[0];
                    this.sharedResources.gold = firstHero.gold || 0;
                    this.sharedResources.inventory = [];
                    this.sharedResources.unlockedHeroes = [1];
                    this.sharedResources.resources = {};
                    console.log(`💰 Золото установлено из первого героя (старое сохранение): ${firstHero.gold}`);
                }
            }
            
            // Загружаем прогресс ВСЕХ героев
            if (data.heroes && this.systems.hero) {
                // Создаем карту сохраненных героев для быстрого доступа
                const savedHeroesMap = new Map();
                data.heroes.forEach(hero => savedHeroesMap.set(hero.id, hero));
                
                // Обновляем всех героев
                this.systems.hero.heroes.forEach(existingHero => {
                    const savedHero = savedHeroesMap.get(existingHero.id);
                    
                    if (savedHero) {
                        // Сохраняем весь прогресс для всех героев
                        existingHero.level = savedHero.level || existingHero.level;
                        existingHero.experience = savedHero.experience || existingHero.experience;
                        existingHero.currentHealth = savedHero.currentHealth || existingHero.baseHealth;
                        existingHero.monstersKilled = savedHero.monstersKilled || 0;
                        existingHero.deaths = savedHero.deaths || 0;
                        existingHero.unlocked = savedHero.unlocked !== undefined ? savedHero.unlocked : existingHero.unlocked;
                        
                        // ⭐ СОХРАНЯЕМ ЭКИПИРОВКУ ИНДИВИДУАЛЬНО ДЛЯ КАЖДОГО ГЕРОЯ
                        if (savedHero.equipment) {
                            existingHero.equipment = {...savedHero.equipment};
                        }
                        
                        // ⭐ ЗАГРУЖАЕМ РЕСУРСЫ ГЕРОЯ (для совместимости со старой системой)
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
            
            // Восстанавливаем текущего героя
            if (data.currentHeroId && this.systems.hero) {
                this.currentHero = this.systems.hero.heroes.find(h => h.id === data.currentHeroId);
                if (this.currentHero) {
                    // ⭐ ВАЖНО: СИНХРОНИЗИРУЕМ ИНВЕНТАРЬ - используем общий
                    this.currentHero.inventory = [...this.sharedResources.inventory];
                    this.currentHero.gold = this.sharedResources.gold;
                    
                    // ⭐ СИНХРОНИЗИРУЕМ РЕСУРСЫ (для совместимости)
                    if (!this.currentHero.resources && this.sharedResources.resources) {
                        this.currentHero.resources = {...this.sharedResources.resources};
                    }
                    
                    // ⭐ ДОБАВЛЯЕМ: Загрузка состояния фляги для текущего героя
                    if (this.systems.battle && this.systems.battle.flask) {
                        const savedHero = data.heroes?.find(h => h.id === this.currentHero.id);
                        if (savedHero?.flaskState) {
                            this.systems.battle.flask.currentCharges = savedHero.flaskState.currentCharges;
                            this.systems.battle.flask.content = savedHero.flaskState.content;
                            console.log(`💧 Фляга восстановлена для ${this.currentHero.name}: ${savedHero.flaskState.currentCharges} зарядов (${savedHero.flaskState.content})`);
                        } else {
                            // Если нет сохраненного состояния - сбрасываем к значениям по умолчанию
                            this.systems.battle.flask.currentCharges = 10;
                            this.systems.battle.flask.content = 'water';
                            console.log(`💧 Фляга сброшена к значениям по умолчанию для ${this.currentHero.name}`);
                        }
                        
                        // Обновляем интерфейс фляги
                        if (this.systems.battle.updateFlaskUI) {
                            this.systems.battle.updateFlaskUI();
                        }
                        if (this.systems.battle.updateFlaskChargesDisplay) {
                            this.systems.battle.updateFlaskChargesDisplay();
                        }
                    }
                    
                    // Синхронизируем с системами
                    if (this.systems.equipment) {
                        this.systems.equipment.setCurrentHero(this.currentHero);
                    }
                    if (this.systems.hero) {
                        this.systems.hero.currentHero = this.currentHero;
                    }
                    if (this.systems.resources) {
                        // Передаем ресурсы в ResourcesSystem
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
            // Новая игра: Устанавливаем значения по умолчанию
            console.log("🆕 Сохранение не найдено, начинаем новую игру");
            
            // Инициализируем общие ресурсы
            this.sharedResources = {
                gold: 100,
                inventory: [],
                unlockedHeroes: [1],
                resources: {} // Пустые ресурсы для новой игры
            };
            
            // Устанавливаем золото для всех героев
            if (this.systems.hero && this.systems.hero.heroes.length > 0) {
                const firstHero = this.systems.hero.heroes[0];
                this.sharedResources.gold = firstHero.gold || 100;
                
                // Синхронизируем золото с первым героем
                this.systems.hero.heroes.forEach(hero => {
                    hero.gold = this.sharedResources.gold;
                    hero.resources = {}; // Пустые ресурсы для нового героя
                });
                
                console.log(`💰 Начальное золото для новой игры: ${this.sharedResources.gold}`);
            }
            
            // Сбрасываем флягу для новой игры
            if (this.systems.battle && this.systems.battle.flask) {
                this.systems.battle.flask.currentCharges = 10;
                this.systems.battle.flask.content = 'water';
                console.log("💧 Фляга установлена на значения по умолчанию для новой игры");
            }
            
            // Инициализируем ResourcesSystem
            if (this.systems.resources) {
                this.systems.resources.sharedResources = this.sharedResources;
            }
        }
    } catch (error) {
        console.error("❌ Ошибка загрузки сохранения:", error);
        localStorage.removeItem('tigrimionSave');
        console.log("🗑️ Битое сохранение удалено");
        
        // При ошибке загрузки устанавливаем значения по умолчанию
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

    // ========== УЛУЧШЕННОЕ АВТОСОХРАНЕНИЕ ==========
    startAutosave() {
        // Сохраняем каждые 30 секунд
        setInterval(() => {
            if (this.currentHero) {
                this.saveGame();
                console.log("💾 Автосохранение выполнено");
            }
        }, 30000);
        
        // Сохраняем при закрытии страницы
        window.addEventListener('beforeunload', () => {
            if (this.currentHero) {
                this.saveGame();
                console.log("💾 Сохранение при закрытии страницы");
            }
        });
    }

    // ========== СИСТЕМА РЕГЕНЕРАЦИИ ЗДОРОВЬЯ ==========
   // ========== УЛУЧШЕННАЯ СИСТЕМА РЕГЕНЕРАЦИИ ЗДОРОВЬЯ ==========
startHealthRegeneration() {
    setInterval(() => {
        if (this.currentHero && this.systems.hero) {
            const stats = this.systems.hero.calculateHeroStats(this.currentHero);
            
            // ⭐ ИСПРАВЛЕНИЕ: Регенерируем только если здоровье меньше максимума И больше 0
            // И если герой не находится в специальной пост-смертной регенерации
            if (this.currentHero.currentHealth > 0 && 
                this.currentHero.currentHealth < stats.maxHealth &&
                !this.currentHero.isInPostDeathRegeneration) {
                
                // ОБЫЧНАЯ регенерация (медленнее чем после смерти)
                const baseRegen = 0.5; // 0.5 хита в секунду в обычном режиме
                const bonusRegen = (stats.healthRegen || 1) * baseRegen;
                const totalRegen = baseRegen + bonusRegen;
                
                this.currentHero.currentHealth = Math.min(
                    stats.maxHealth, 
                    this.currentHero.currentHealth + totalRegen
                );
                
                // РЕДКОЕ автосохранение при обычной регенерации
                if (Math.random() < 0.02) { // 2% шанс
                    this.saveGame();
                }
                
                console.log(`❤️ Обычная регенерация: +${totalRegen.toFixed(1)} HP (${this.currentHero.currentHealth}/${stats.maxHealth})`);
            }
        }
    }, 1000);
}

// ========== ОБРАБОТКА ПЕРЕЗАПУСКА ВО ВРЕМЯ БОЯ ==========
setupBattleCrashProtection() {
    // Обработка перезагрузки страницы во время боя
    window.addEventListener('beforeunload', (e) => {
        if (this.systems?.battle?.battleActive) {
            console.log("💀 Перезагрузка во время боя - поражение");
            
            // Если бой активен, считаем это поражением
            if (this.currentHero) {
                // Возвращаем героя на стартовую позицию
                this.currentHero.currentHealth = 1;
                this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
                
                // Уведомляем систему карт о поражении
                if (this.systems.map) {
                    this.systems.map.completeMovementAfterBattle(false, false);
                }
                
                // Сохраняем состояние
                this.saveGame();
                console.log("💾 Сохранено состояние после поражения при перезагрузке");
            }
        }
    });

    // Обработка обновления страницы (F5)
    window.addEventListener('unload', () => {
        if (this.systems?.battle?.battleActive) {
            console.log("🔄 Страница обновляется во время боя");
            // Состояние уже сохранено в beforeunload
        }
    });

    // Проверка при загрузке - был ли бой активен до перезагрузки
    window.addEventListener('load', () => {
        const wasBattleActive = sessionStorage.getItem('battleWasActive');
        if (wasBattleActive === 'true') {
            console.log("🎲 Восстановление после перезагрузки во время боя");
            sessionStorage.removeItem('battleWasActive');
            
            // Показываем уведомление о поражении
            setTimeout(() => {
                this.showNotification("💀 Бой прерван перезагрузкой! Герой возвращен на стартовую позицию.", 'error');
            }, 1000);
        }
    });
}

// Сохраняем состояние боя при начале
markBattleAsActive() {
    if (this.systems?.battle?.battleActive) {
        sessionStorage.setItem('battleWasActive', 'true');
    }
}

// Очищаем состояние при завершении боя
markBattleAsInactive() {
    sessionStorage.removeItem('battleWasActive');
}
    
handleHeroDeath() {
    if (!this.currentHero) return;
    
    console.log(`💀 Основная игра: обработка смерти ${this.currentHero.name}`);
    
    // ⭐ УБЕДИТЕЛЬНОЕ УСТАНОВЛЕНИЕ ЗДОРОВЬЯ В 1 (вместо 0)
    this.currentHero.currentHealth = 1;
    
    // ⭐ ПОМЕЧАЕМ ЧТО ГЕРОЙ В РЕЖИМЕ ПОСЛЕСМЕРТНОЙ РЕГЕНЕРАЦИИ
    this.currentHero.isInPostDeathRegeneration = true;
    
    // ⭐ СОХРАНЯЕМ СРАЗУ
    this.saveGame();
    
    this.showNotification(`💀 ${this.currentHero.name} повержен! Здоровье восстановится до 1 и начнет регенерировать.`, 'warning');
    
    // ⭐ ЧЕРЕЗ 10 СЕКУНД СНИМАЕМ ФЛАГ (на всякий случай)
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
                        // ⭐ ИСПРАВЛЕНИЕ: Используем HeroSystem вместо LevelSystem
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

    // Устанавливаем общее золото при смене героя
    if (this.sharedResources) {
        hero.gold = this.sharedResources.gold;
        // ⭐ СИНХРОНИЗИРУЕМ РЕСУРСЫ
        hero.resources = {...this.sharedResources.resources};
    }

    this.currentHero = hero;
    
    // Сохраняем в основной игре
    if (this.systems.equipment) {
        this.systems.equipment.setCurrentHero(hero);
    }
    
    // ⭐ ВАЖНО: Загружаем состояние фляги для выбранного героя
    if (this.systems.battle && this.systems.battle.flask) {
        // Ищем сохраненное состояние фляги для этого героя
        const savedHero = this.systems.hero.heroes.find(h => h.id === heroId);
        
        // Проверяем, есть ли сохраненное состояние фляги
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
        
        // Если нет сохраненного состояния - сбрасываем к значениям по умолчанию
        if (!hasFlaskState) {
            this.systems.battle.flask.currentCharges = 10;
            this.systems.battle.flask.content = 'water';
            console.log(`💧 Установлены значения по умолчанию для фляги ${hero.name}`);
        }
        
        // Обновляем интерфейс фляги
        if (this.systems.battle.updateFlaskUI) {
            this.systems.battle.updateFlaskUI();
        }
        if (this.systems.battle.updateFlaskChargesDisplay) {
            this.systems.battle.updateFlaskChargesDisplay();
        }
    }
    
    // Синхронизируем с другими системами
    if (this.systems.battle) {
        this.systems.battle.currentHero = hero;
    }
    if (this.systems.shop) {
        this.systems.shop.currentHero = hero;
    }
    if (this.systems.map) {
        this.systems.map.setCurrentHero(hero);
    }
    // ⭐ СИНХРОНИЗИРУЕМ С RESOURCES SYSTEM
    if (this.systems.resources) {
        this.systems.resources.sharedResources = this.sharedResources;
    }
    
    // Сохраняем при смене героя
    this.saveGame();
    
    console.log(`🎯 Выбран герой: ${hero.name}, уровень: ${hero.level}, опыт: ${hero.experience}, золото: ${hero.gold}, ресурсов: ${Object.keys(hero.resources || {}).length}`);
    this.showHeroGameScreen();
}

    // ⭐ ДОБАВЛЕН МЕТОД ДЛЯ ОБРАБОТКИ КЛИКОВ ПО СЛОТАМ ЭКИПИРОВКИ
    handleEquipmentSlotClick(slot) {
        console.log(`Клик по слоту: ${slot}`);
        const itemId = this.currentHero.equipment[slot];
        
        if (itemId && this.systems.equipment) {
            // Если есть предмет - снимаем его
            this.systems.equipment.unequipItem(slot);
            // Обновляем интерфейс
            this.showHeroGameScreen();
            // Сохраняем игру
            this.saveGame();
            this.showNotification(`✅ Предмет снят со слота ${this.getSlotName(slot)}`, 'success');
        } else {
            // Если нет предмета - показываем инвентарь для экипировки
            this.showEquipmentForSlot(slot);
        }
    }

  // ⭐ ДОБАВЛЕН МЕТОД ДЛЯ ИСПРАВЛЕНИЯ LAYOUT ПОЛОСОК ЗДОРОВЬЯ
fixHealthBarLayout() {
    setTimeout(() => {
        // Принудительно исправляем все полоски здоровья
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
        
        // Вспомогательная функция для рендеринга столбца экипировки
        const renderEquipmentColumn = (slots) => {
            return slots.map(slot => {
                const itemId = this.currentHero.equipment[slot];
                const item = itemId && this.systems.equipment ? 
                    this.systems.equipment.getItemById(itemId) : null;
                
                // ФИКС: Правильно передаем слот в обработчик
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

        // Формируем список активных бонусов
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
                    <button class="btn-top" onclick="game.showOverlay('inventory')">🎒 Инвентарь</button>
                    <button class="btn-top" onclick="game.showOverlay('resources')">📦 Ресурсы</button>
                    <button class="btn-top" onclick="game.systems.hero.showHeroStory()">📖 История Героя</button>
                    <button class="btn-top" onclick="game.showHeroSelection()">🔁 Сменить героя</button>
                     <button class="btn-top" onclick="game.systems.hero.resetCurrentHero()">🔄 Сбросить героя</button>
                    <button class="btn-top" onclick="game.debugCrafting()">🐛 Отладка крафта</button>
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
        
        // ФИКС: Убедимся что обработчики работают
        setTimeout(() => {
            if (this.systems.hero) {
                this.systems.hero.startHealthBarUpdates();
                this.systems.hero.calculateHeroStats();
                
                setTimeout(() => {
                    this.systems.hero.updateHealthAndExperienceBars();
                }, 500);
            }
        }, 100);

        // ⭐ ВЫЗЫВАЕМ ИСПРАВЛЕНИЕ LAYOUT
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


showCrafting() {
    try {
        console.log("🔨 Открытие интерфейса крафта...");
        
        // Проверяем систему крафта
        if (!this.systems.crafting) {
            console.error("❌ Система крафта не найдена");
            this.showNotification('❌ Система крафта не найдена', 'error');
            return;
        }
        
        // ⭐ ИСПРАВЛЕННАЯ ПРОВЕРКА: проверяем наличие рецептов, а не флаг loaded
        const hasRecipes = this.systems.crafting.recipes && 
                          Object.keys(this.systems.crafting.recipes).length > 0;
        
        console.log("Проверка рецептов:", {
            recipes: this.systems.crafting.recipes,
            recipesCount: Object.keys(this.systems.crafting.recipes || {}).length,
            hasRecipes: hasRecipes,
            hasStations: this.systems.crafting.recipes?.stations ? Object.keys(this.systems.crafting.recipes.stations).length : 0
        });
        
        if (!hasRecipes) {
            console.warn("⚠️ Рецепты не найдены в памяти, загружаем...");
            
            // Пробуем загрузить рецепты
            this.systems.crafting.loadRecipes().then(success => {
                if (success) {
                    // Загрузились успешно - открываем интерфейс
                    this.openCraftingInterface();
                } else {
                    // Не удалось загрузить - создаем резервные
                    this.systems.crafting.createFallbackRecipes();
                    this.openCraftingInterface();
                    this.showNotification("⚠️ Используются базовые рецепты", "warning");
                }
            });
            return;
        }
        
        // Если рецепты есть - открываем интерфейс
        this.openCraftingInterface();
        
    } catch (error) {
        console.error('❌ Ошибка при открытии крафта:', error);
        this.showNotification('❌ Ошибка: ' + error.message, 'error');
    }
}

// Добавьте этот вспомогательный метод
openCraftingInterface() {
    try {
        const html = this.systems.crafting.showCraftingUI('all', 'all');
        this.showOverlayContent(html, 'crafting-overlay');
        
        // Привязываем обработчики
        setTimeout(() => {
            if (this.systems.crafting && this.systems.crafting.attachCraftingHandlers) {
                this.systems.crafting.attachCraftingHandlers();
            }
        }, 100);
        
        console.log('✅ Интерфейс крафта открыт');
        this.showNotification('⚒️ Открыта система крафта', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка при открытии интерфейса:', error);
        this.showNotification('❌ Не удалось открыть интерфейс крафта', 'error');
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
            container.style.display = 'block';
            break;

        case 'tactical-map':
            if (this.systems.map) {
                // ⭐ ПЕРЕДАЕМ ТЕКУЩЕГО ГЕРОЯ В СИСТЕМУ КАРТ
                this.systems.map.setCurrentHero(this.currentHero);
                this.systems.map.showTacticalMapEditor();
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
        // ⭐ ПЕРЕДАЕМ ОБЩИЕ РЕСУРСЫ В СИСТЕМУ
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
            // ⭐ ИСПРАВЛЕННЫЙ КОД: ShopSystem сам управляет отображением
            if (this.systems.shop) {
                // Создаем тестовую клетку магазина для демонстрации
                const testMerchantCell = {
                    col: 4,
                    row: 4,
                    shopName: "Оружейная Борга",
                    merchantName: "Борг Железный",
                    shopItems: [1, 2, 3, 15, 22, 34], // ID предметов из твоего примера
                    restockTimer: 86400000
                };
                this.systems.shop.openShop(testMerchantCell);
            } else {
                // Fallback на старую систему если ShopSystem не доступна
                console.warn("ShopSystem не доступна, используем EquipmentSystem");
                const currentCategory = this.systems.equipment.currentCategory || 'all';
                const currentSubcategory = this.systems.equipment.currentSubcategory || 'all';
                container.innerHTML = this.systems.equipment.showShop(currentCategory, currentSubcategory);
                container.style.display = 'block';
                
                // Добавляем обработчики для предметов магазина
                setTimeout(() => this.attachShopItemHandlers(), 100);
            }
            break;

        default:
            console.warn(`⚠️ Неизвестный тип оверлея: ${overlayType}`);
            container.innerHTML = `<div class="map-error">Неизвестный тип окна: ${overlayType}</div>`;
            container.style.display = 'block';
    }
}

    // ========== ОБРАБОТЧИКИ ПРЕДМЕТОВ МАГАЗИНА ==========
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

    // ========== МОДАЛЬНОЕ ОКНО ПРЕДМЕТА ==========
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
                            
                            <!-- ИНФОРМАЦИЯ О БОНУСЕ ПРЕДМЕТА -->
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
                            
                            <!-- ИНФОРМАЦИЯ О СЕТЕ -->
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

        // Добавляем модальное окно в контейнер оверлея
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

    // ========== УВЕЛИЧЕНИЕ ИЗОБРАЖЕНИЯ ПРЕДМЕТА ==========
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

    // ⭐ НОВЫЙ МЕТОД: Возврат к тактической карте
    returnToTacticalMap() {
        // Сначала скрываем боевой экран
        const app = document.getElementById('app');
        if (app) {
            // Показываем экран героя
            this.showHeroGameScreen();
            
            // Затем открываем тактическую карту
            setTimeout(() => {
                if (this.systems.map) {
                    this.systems.map.showOverlay('tactical-map');
                }
            }, 100);
        }
    }

    // ⭐ НОВЫЙ МЕТОД: Управление боем и картой
    manageBattleWithMap() {
        // Этот метод будет вызываться когда нужно показать бой поверх карты
        if (this.systems.battle && this.systems.battle.battleActive) {
            this.systems.battle.showBattleScreen();
        }
    }

    // ⭐ НОВЫЙ МЕТОД: Начать бой при перемещении
    startMovementBattle(hero, monsterId) {
        if (this.systems.battle) {
            // Скрываем карту перед боем
            this.hideOverlay();
            
            // Запускаем бой
            setTimeout(() => {
                this.systems.battle.startBattleWithMonster(hero, monsterId, 'movement');
            }, 50);
        }
    }

    // ========== ПОКУПКА ИЗ МОДАЛЬНОГО ОКНА ==========
    buyItemFromModal(itemId) {
        const item = this.systems.equipment.getItemById(itemId);
        if (!item) return;

        if (this.currentHero.gold >= item.price) {
            this.currentHero.gold -= item.price;
            this.systems.equipment.addItemToInventory(itemId);
            
            // ⭐ СОХРАНЕНИЕ ПОСЛЕ ПОКУПКИ
            this.saveGame();
            
            this.showNotification(`✅ Предмет "${item.name}" куплен!`, 'success');
            this.closeItemDetailModal();
            
            // Обновляем магазин
            this.refreshShop();
            
        } else {
            this.showNotification('❌ Недостаточно золота!', 'error');
        }
    }

    // ========== ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА ==========
    closeItemDetailModal() {
        // Восстанавливаем магазин с сохраненным состоянием
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
            container.style.display = 'none';
            container.innerHTML = '';
            this.activeOverlay = null;
        }
    }

// ⭐ ДОБАВЬТЕ ЭТОТ МЕТОД ПРЯМО ПОСЛЕ hideOverlay
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

    // ========== СИСТЕМА УВЕДОМЛЕНИЙ ==========
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
        
        // Проверяем сохранение
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

    // ========== ОБНОВЛЕНИЕ МАГАЗИНА ==========
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
            
            // Вызываем метод отладки
            this.systems.crafting.debugCraftingSystem();
            
            // Тестируем пути к файлам
            this.systems.crafting.testFilePaths().then(() => {
                console.log("✅ Тестирование путей завершено");
            });
            
            // Проверяем интерфейс
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
        
        this.showNotification("Отладка крафта запущена, смотрите консоль (F12)", "info");
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
