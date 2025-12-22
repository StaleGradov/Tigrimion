// ========== ПРЕДВАРИТЕЛЬНАЯ РЕГИСТРАЦИЯ ДЛЯ ЗАГРУЗЧИКА ==========
if (typeof window !== 'undefined') {
    if (!window.ActionSystem) {
        window.ActionSystem = class ActionSystemPlaceholder {
            constructor(mapSystem) {
                console.log("📦 ActionSystemPlaceholder создан для загрузчика");
                this.mapSystem = mapSystem;
            }
            init() { return Promise.resolve(true); }
        };
        console.log("✅ ActionSystem предварительно зарегистрирован");
    }
}

"use strict";

class ActionSystem {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        
        // ========== КОНФИГУРАЦИЯ ДЕЙСТВИЙ ==========
        this.cellTypes = {};
        this.resources = {};
        this.currentCellType = null;
        this.selectedCell = null;
        this.currentCellActions = [];
        
        // Универсальные действия с базовыми шансами
        this.baseActionChances = {
            'search_treasure': 25,
            'search_water': 30,
            'search_berries': 35,
            'search_mushrooms': 30,
            'search_herbs': 40,
            'search_ore': 20,
            'search_stone': 25,
            'set_trap': 50,
            'prepare_ambush': 45,
            'hunt': 70,
            'hunt_caravan': 30,
            'take_assassination_contract': 20,
            'light_campfire': 80,
            'guard_caravan': 40,
            'gather_wood': 60,
            'stealth_movement': 85
        };
        
        // Все доступные действия
        this.allActions = [
            'search_treasure',
            'search_water', 
            'search_berries',
            'search_mushrooms',
            'search_herbs',
            'search_ore',
            'search_stone',
            'set_trap',
            'prepare_ambush',
            'hunt',
            'hunt_caravan',
            'take_assassination_contract',
            'light_campfire',
            'guard_caravan',
            'gather_wood',
            'stealth_movement',
           'trade',        // <-- НОВОЕ: Торговля
           'fill_flask'    // <-- НОВОЕ: Наполнить флягу
        ];
        
        // Конфигурация действий
        this.actionConfigs = {
            'search_treasure': {
                icon: '💰',
                name: 'Искать сокровища',
                description: 'Тщательно обыскать местность в поисках ценностей',
                class: 'action-treasure',
                resource_type: 'treasure'
            },
            'search_water': {
                icon: '💧',
                name: 'Искать воду',
                description: 'Найти источники воды или следы влаги',
                class: 'action-water',
                resource_type: 'water'
            },
            'search_berries': {
                icon: '🫐',
                name: 'Собирать ягоды',
                description: 'Собрать съедобные ягоды и плоды',
                class: 'action-berries',
                resource_type: 'berries'
            },
            'search_mushrooms': {
                icon: '🍄',
                name: 'Собирать грибы',
                description: 'Найти и собрать грибы',
                class: 'action-mushrooms',
                resource_type: 'mushrooms'
            },
            'search_herbs': {
                icon: '🌿',
                name: 'Собирать травы',
                description: 'Найти лекарственные и полезные растения',
                class: 'action-herbs',
                resource_type: 'herbs'
            },
            'search_ore': {
                icon: '⛏️',
                name: 'Искать руду',
                description: 'Поиск металлических руд и минералов',
                class: 'action-ore',
                resource_type: 'ores'
            },
            'search_stone': {
                icon: '🪨',
                name: 'Собирать камни',
                description: 'Найти строительные и полезные камни',
                class: 'action-stone',
                resource_type: 'stones'
            },
            'set_trap': {
                icon: '🪤',
                name: 'Установить ловушку',
                description: 'Создать ловушку для мелкой дичи',
                class: 'action-trap',
                resource_type: 'traps'
            },
            'prepare_ambush': {
                icon: '🎯',
                name: 'Подготовить засаду',
                description: 'Подготовить позицию для неожиданной атаки',
                class: 'action-ambush',
                resource_type: 'ambush'
            },
            'hunt': {
                icon: '🏹',
                name: 'Охотиться',
                description: 'Выследить и добыть дичь. Приводит к бою с монстром. Награда: двойной лут с монстра',
                class: 'action-hunt',
                resource_type: 'loot',
                triggers_monster: true,
                monster_level_multiplier: 1.0,
                always_monster: true,
                double_loot: true
            },
            'hunt_caravan': {
                icon: '🏹',
                name: 'Охотиться на караван',
                description: 'Подкараулить торговый караван для нападения',
                class: 'action-hunt',
                resource_type: 'loot',
                triggers_monster: true,
                monster_level_multiplier: 1.5
            },
            'take_assassination_contract': {
                icon: '🗡️',
                name: 'Взять контракт на убийство',
                description: 'Получить задание на устранение цели',
                class: 'action-assassination',
                resource_type: 'contracts',
                triggers_monster: true,
                monster_level_multiplier: 2.0
            },
            'light_campfire': {
                icon: '🔥',
                name: 'Разжечь костёр',
                description: 'Создать укрытие и место для отдыха',
                class: 'action-campfire',
                resource_type: 'shelter'
            },
            'guard_caravan': {
                icon: '🛡️',
                name: 'Охранять караван',
                description: 'Наняться для защиты торгового каравана',
                class: 'action-guard',
                resource_type: 'gold',
                triggers_monster: true,
                monster_level_multiplier: 1.2
            },
            'gather_wood': {
                icon: '🪵',
                name: 'Собирать дрова',
                description: 'Найти и собрать сухие ветки для костра и строительства',
                class: 'action-wood',
                resource_type: 'woods'
            },
            'stealth_movement': {
                icon: '👣',
                name: 'Скрытное перемещение',
                description: 'Тихо и незаметно передвинуться на соседнюю клетку без риска боя',
                class: 'action-stealth',
                requires_player_here: true,
                special: 'movement'
            }, 
        'trade': {
        icon: '🛒',
        name: 'Торговать',
        description: 'Просмотреть товары торговца и совершить покупки',
        class: 'action-trade',
        requires_player_here: true,
        special: 'shop'
    },
    'fill_flask': {
        icon: '💧',
        name: 'Наполнить флягу',
        description: 'Наполнить флягу водой из источника',
        class: 'action-water',
        requires_player_here: true,
        special: 'water'
    }
        };
        
        this.locationImages = {};
        this.locationImageCache = new Map();
        
        // Модули действий (охоты)
        this.actionModules = {};
        
        // ДЕБАГ ИНФОРМАЦИЯ
        console.log("✅ ActionSystem инициализирован");
        console.log("   mapSystem:", mapSystem);
        console.log("   window.HuntAction:", window.HuntAction);
        
        // НЕ вызываем инициализацию модулей здесь - они загрузятся позже
        // setTimeout(() => {
        //     this.initializeActionModules();
        // }, 500);
    }

    // ========== ИНИЦИАЛИЗАЦИЯ МОДУЛЕЙ ДЕЙСТВИЙ ==========

initializeActionModules() {
    console.log("🔄 Инициализация модулей действий...");
    
    try {
        // ВАЖНО: Проверяем, не является ли текущий модуль охоты заглушкой
        const currentHuntModule = this.actionModules['hunt'];
        if (currentHuntModule) {
            // Проверяем признаки заглушки
            const isStub = currentHuntModule.execute && 
                          currentHuntModule.execute.toString().includes('Заглушка охоты');
            
            if (isStub) {
                console.log("⚠️ Обнаружена заглушка модуля охоты, удаляем её");
                delete this.actionModules['hunt'];
            } else if (currentHuntModule.showHuntTargetSelection) {
                console.log("✅ Настоящий модуль охоты уже загружен");
                return true;
            }
        }
        
        // Загружаем модуль охоты
        console.log("🔄 Загружаем модуль охоты...");
        return this.loadHuntModuleWithFallback();
        
    } catch (error) {
        console.error("❌ Ошибка инициализации модулей действий:", error);
        
        // Только в крайнем случае создаем заглушку
        // Но сначала проверяем, может настоящий модуль уже загружен
        if (!this.actionModules['hunt'] || !this.actionModules['hunt'].showHuntTargetSelection) {
            this.createHuntActionStub();
        }
        
        return false;
    }
}

async loadHuntModuleWithFallback() {
    console.log("🔄 Пытаемся загрузить модуль охоты...");
    
    // Пробуем несколько способов загрузки
    
    // 1. Если класс уже глобально доступен
    if (window.HuntAction) {
        console.log("✅ Глобальный класс HuntAction найден, создаем экземпляр");
        this.actionModules['hunt'] = new window.HuntAction(this);
        return true;
    }
    
    // 2. Пробуем загрузить из файла
    const paths = [
        'data/actions/hunt-action.js',
        'modules/actions/hunt-action.js',
        'hunt-action.js'
    ];
    
    for (const path of paths) {
        try {
            console.log(`   Пробуем: ${path}`);
            const response = await fetch(path);
            if (response.ok) {
                const code = await response.text();
                
                // Проверяем содержимое файла
                if (code.includes('class HuntAction') && code.includes('showHuntTargetSelection')) {
                    console.log(`✅ Файл найден: ${path}`);
                    
                    // Выполняем код
                    eval(code);
                    
                    // Ждем немного чтобы класс зарегистрировался
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (window.HuntAction) {
                        this.actionModules['hunt'] = new window.HuntAction(this);
                        console.log(`✅ Модуль охоты загружен из ${path}`);
                        return true;
                    }
                } else {
                    console.log(`   ❌ Файл не содержит класс HuntAction: ${path}`);
                }
            } else {
                console.log(`   ❌ Не доступен: ${path}`);
            }
        } catch (error) {
            console.log(`   ❌ Ошибка: ${error.message}`);
        }
    }
    
    // 3. Только если все способы не сработали - заглушка
    console.error("❌ Не удалось загрузить модуль охоты ни с одного пути");
    console.log("⚠️ Создаем заглушку модуля охоты");
    this.createHuntActionStub();
    return false;
}

    registerModule(moduleName, moduleInstance) {
        this.actionModules[moduleName] = moduleInstance;
        console.log(`✅ Модуль ${moduleName} зарегистрирован в ActionSystem`);
    }

    createHuntActionStub() {
        console.log("🔄 Создаем заглушку для модуля охоты");
        this.actionModules['hunt'] = {
            execute: (row, col) => {
                console.log(`🏹 Заглушка охоты: клетка [${col},${row}]`);
                this.showNotification("⚠️ Модуль охоты не загружен. Заглушка активирована.", 'warning');
                
                // Базовая логика охоты как заглушка
                const cellKey = `${col},${row}`;
                const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
                
                if (!cell) {
                    this.showNotification("❌ Клетка не найдена!", 'error');
                    return;
                }
                
                if (cell.explored === true) {
                    this.showNotification("❌ Эта клетка уже исследована!", 'warning');
                    return;
                }
                
                // Простой бой как заглушка
                const battleSystem = window.game?.systems?.battle;
                if (battleSystem) {
                    const randomMonster = battleSystem.getRandomMonsterForMovement();
                    if (randomMonster) {
                        this.mapSystem.pendingAction = {
                            action: 'hunt',
                            row: row,
                            col: col,
                            wasSuccess: true,
                            doubleLoot: true
                        };
                        battleSystem.startBattleWithSpecificMonster(this.mapSystem.currentHero, randomMonster, 'hunt');
                        this.showNotification(`🏹 Простая охота на ${randomMonster.name}`, 'info');
                    }
                }
            },
            completeHuntAfterBattle: (victory, escape, doubleLoot) => {
                console.log(`🏹 Заглушка: обработка результата охоты`);
                this.mapSystem.completeMovementAfterBattle(victory, escape, 'hunt', doubleLoot);
            },
            config: {
                id: 'hunt',
                icon: '🏹',
                name: 'Охотиться',
                description: 'Выследить и добыть дичь'
            }
        };
        
        console.log("✅ Заглушка модуля охоты создана и зарегистрирована");
    }

    // ========== ПРОВЕРКА ЗАГРУЗКИ МОДУЛЕЙ ==========

    checkModulesLoaded() {
        console.log("🔍 Проверка загрузки модулей действий:");
        console.log("   Доступные модули:", Object.keys(this.actionModules));
        
        if (!this.actionModules['hunt']) {
            console.log("❌ Модуль охоты не найден в actionModules");
            
            // Проверяем, есть ли глобальный класс HuntAction
            if (window.HuntAction) {
                console.log("✅ Глобальный класс HuntAction найден, создаем экземпляр");
                this.actionModules['hunt'] = new window.HuntAction(this);
                return true;
            } else {
                console.error("❌ Глобальный класс HuntAction не найден");
                this.createHuntActionStub();
                return false;
            }
        }
        
        console.log("✅ Модуль охоты загружен:", this.actionModules['hunt']);
        return true;
    }

    async ensureHuntModuleLoaded() {
        if (this.actionModules['hunt']) {
            console.log("✅ Модуль охоты уже загружен");
            return true;
        }
        
        console.log("🔄 Обеспечиваем загрузку модуля охоты...");
        
        // Сначала пробуем найти глобальный класс
        if (window.HuntAction) {
            this.actionModules['hunt'] = new window.HuntAction(this);
            console.log("✅ Экземпляр HuntAction создан из глобального класса");
            return true;
        }
        
        // Если нет, пробуем загрузить через loader
        try {
            if (window.ActionModulesLoader) {
                const loader = new ActionModulesLoader(this);
                const loaded = await loader.loadModule('hunt');
                
                if (loaded && window.HuntAction) {
                    this.actionModules['hunt'] = new window.HuntAction(this);
                    console.log("✅ Модуль охоты загружен через loader");
                    return true;
                }
            }
        } catch (error) {
            console.error("❌ Ошибка загрузки модуля охоты:", error);
        }
        
        // В крайнем случае создаем заглушку
        this.createHuntActionStub();
        console.log("⚠️ Используется заглушка модуля охоты");
        return false;
    }

    // ========== ПРИНУДИТЕЛЬНАЯ ЗАГРУЗКА МОДУЛЯ ОХОТЫ ==========

    async forceLoadHuntModule() {
        console.log("🔄 ПРИНУДИТЕЛЬНАЯ ЗАГРУЗКА МОДУЛЯ ОХОТЫ");
        
        // Удаляем старый модуль если есть
        delete this.actionModules['hunt'];
        
        // Пробуем несколько путей
        const paths = [
            'data/actions/hunt-action.js',
            'data/modules/actions/hunt-action.js',
            'modules/actions/hunt-action.js',
            'hunt-action.js'
        ];
        
        for (const path of paths) {
            console.log(`   Пробуем: ${path}`);
            try {
                const response = await fetch(path);
                if (response.ok) {
                    console.log(`✅ Файл найден: ${path}`);
                    const moduleCode = await response.text();
                    
                    // Проверяем содержимое файла
                    console.log(`📄 Размер файла: ${moduleCode.length} байт`);
                    console.log(`   Содержит 'showHuntTargetSelection': ${moduleCode.includes('showHuntTargetSelection')}`);
                    console.log(`   Содержит 'execute': ${moduleCode.includes('execute')}`);
                    console.log(`   Содержит 'class HuntAction': ${moduleCode.includes('class HuntAction')}`);
                    
                    // Загружаем скрипт
                    const script = document.createElement('script');
                    script.textContent = moduleCode;
                    document.head.appendChild(script);
                    
                    console.log("✅ Скрипт загружен в DOM");
                    
                    // Ждем немного чтобы класс зарегистрировался
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    if (window.HuntAction) {
                        console.log("✅ Класс HuntAction зарегистрирован глобально");
                        this.actionModules['hunt'] = new window.HuntAction(this);
                        console.log("✅ Экземпляр HuntAction создан");
                        return true;
                    } else {
                        console.log("❌ Класс HuntAction не зарегистрирован после загрузки");
                    }
                } else {
                    console.log(`   ❌ Не доступен: ${path}`);
                }
            } catch (error) {
                console.log(`   ❌ Ошибка: ${error.message}`);
            }
        }
        
        console.error("❌ Не удалось загрузить модуль охоты ни с одного пути");
        this.createHuntActionStub();
        return false;
    }

    // ========== ДИАГНОСТИКА МОДУЛЯ ОХОТЫ ==========

    async diagnoseHuntModule() {
        console.group("🔍 ДИАГНОСТИКА МОДУЛЯ ОХОТЫ");
        
        // 1. Проверяем состояние модуля
        console.log("1. Состояние модуля охоты:");
        console.log("   - actionModules['hunt']:", this.actionModules['hunt']);
        console.log("   - Тип:", typeof this.actionModules['hunt']);
        console.log("   - Является ли классом?", this.actionModules['hunt']?.constructor?.name);
        
        // 2. Проверяем методы
        if (this.actionModules['hunt']) {
            const hunt = this.actionModules['hunt'];
            console.log("2. Методы модуля охоты:");
            console.log("   - execute:", typeof hunt.execute);
            console.log("   - showHuntTargetSelection:", typeof hunt.showHuntTargetSelection);
            console.log("   - performHuntForMonster:", typeof hunt.performHuntForMonster);
            if (hunt) {
                const prototype = Object.getPrototypeOf(hunt);
                console.log("   - Все методы:", Object.getOwnPropertyNames(prototype));
            }
        }
        
        // 3. Проверяем глобальный класс
        console.log("3. Глобальный класс HuntAction:");
        console.log("   - window.HuntAction:", window.HuntAction);
        console.log("   - Тип:", typeof window.HuntAction);
        
        // 4. Проверяем загрузку файла
        console.log("4. Проверка загрузки файла:");
        try {
            const testResponse = await fetch('data/actions/hunt-action.js');
            console.log("   - Файл hunt-action.js:", testResponse.ok ? "НАЙДЕН" : "НЕ НАЙДЕН");
        } catch (error) {
            console.log("   - Ошибка проверки файла:", error.message);
        }
        
        // 5. Проверяем связь с MapSystem
        console.log("5. Связь с MapSystem:");
        console.log("   - MapSystem:", this.mapSystem);
        console.log("   - MapSystem.currentHero:", this.mapSystem?.currentHero);
        
        console.groupEnd();
        
        return {
            moduleExists: !!this.actionModules['hunt'],
            hasExecuteMethod: typeof this.actionModules['hunt']?.execute === 'function',
            hasShowHuntMethod: typeof this.actionModules['hunt']?.showHuntTargetSelection === 'function',
            fileExists: false, // будет обновлено
            globalClassExists: !!window.HuntAction
        };
    }

    // ========== ТЕСТ ВЫБОРА ТРОФЕЯ ==========

    testHuntSelection() {
        console.log("🧪 ТЕСТ: Симуляция выбора трофея");
        
        // Создаем тестовые данные
        const testResources = {
            'bones': [
                { id: 'small_bone', name: '🦴 Маленькая кость', description: 'Кость мелкого животного' },
                { id: 'wolf_bone', name: '🐺 Волчья кость', description: 'Кость волка' },
                { id: 'horse_bone', name: '🐴 Конская кость', description: 'Кость лошади' }
            ],
            'leathers': [
                { id: 'thin_leather', name: '🐂 Тонкая кожа', description: 'Кожа мелкого животного' },
                { id: 'strong_leather', name: '🦌 Прочная кожа', description: 'Кожа оленя' }
            ]
        };
        
        // Показываем интерфейс выбора трофея
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (actionsContainer) {
            let html = `
                <div class="hunt-target-selection">
                    <h3 style="color: #00ffcc; margin-bottom: 15px; text-align: center;">
                        🏹 ВЫБЕРИТЕ ТРОФЕЙ ДЛЯ ОХОТЫ
                    </h3>
                    <p style="text-align: center; color: #aaa; margin-bottom: 20px;">
                        Это тестовый интерфейс. В реальной игре здесь будут ресурсы из файла.
                    </p>
                    
                    <div class="hunt-categories">
            `;
            
            Object.entries(testResources).forEach(([category, resources]) => {
                const categoryName = category === 'bones' ? '🦴 Кости' : '🐂 Кожи';
                
                html += `
                    <div class="hunt-category">
                        <h4 style="color: #00aaff; margin: 15px 0 10px 0;">
                            ${categoryName}
                        </h4>
                        <div class="hunt-targets-grid">
                `;
                
                resources.forEach(resource => {
                    html += `
                        <div class="hunt-target-item" onclick="game.systems.action.testMonsterSelection('${resource.id}', '${resource.name}')">
                            <div class="hunt-target-name">${resource.name}</div>
                            <div class="hunt-target-description">${resource.description}</div>
                            <div class="test-tag" style="font-size: 10px; color: #f59e0b; margin-top: 5px;">[ТЕСТ]</div>
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                    
                    <div style="margin-top: 30px; padding: 15px; background: rgba(255, 100, 100, 0.1); border-radius: 8px; border: 1px solid #ff4444;">
                        <strong style="color: #ff4444;">⚠️ ВАЖНО:</strong>
                        <p style="margin-top: 8px; font-size: 12px; color: #ffcccc;">
                            1. Сначала выбирается трофей<br>
                            2. Затем показываются монстры, у которых падает этот трофей<br>
                            3. Выбирается монстр для охоты<br>
                            4. Начинается бой с выбранным монстром
                        </p>
                    </div>
                </div>
            `;
            
            actionsContainer.innerHTML = html;
            
            // Стилизуем
            setTimeout(() => {
                const grid = document.querySelector('.hunt-targets-grid');
                if (grid) {
                    grid.style.cssText = `
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 10px;
                        margin-bottom: 15px;
                    `;
                }
                
                const items = document.querySelectorAll('.hunt-target-item');
                items.forEach(item => {
                    item.style.cssText = `
                        background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9));
                        border: 1px solid #00aaff;
                        border-radius: 8px;
                        padding: 12px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    `;
                    
                    item.onmouseenter = () => {
                        item.style.transform = 'translateY(-2px)';
                        item.style.boxShadow = '0 5px 15px rgba(0, 170, 255, 0.3)';
                    };
                    item.onmouseleave = () => {
                        item.style.transform = 'translateY(0)';
                        item.style.boxShadow = 'none';
                    };
                });
            }, 50);
        }
    }

    testMonsterSelection(resourceId, resourceName) {
        console.log(`🧪 ТЕСТ: Выбран трофей ${resourceName} (${resourceId})`);
        
        // Тестовые монстры
        const testMonsters = [
            { id: 'wolf', name: '🐺 Волк', level: 2, health: 50, armor: 5, damage: 15 },
            { id: 'bear', name: '🐻 Медведь', level: 3, health: 80, armor: 10, damage: 25 },
            { id: 'boar', name: '🐗 Кабан', level: 1, health: 30, armor: 3, damage: 10 }
        ];
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (actionsContainer) {
            let html = `
                <div class="monster-selection">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="color: #00ffcc; margin: 0;">
                            🎯 ВЫБЕРИТЕ МОНСТРА ДЛЯ ОХОТЫ
                        </h3>
                        <button class="btn-control" onclick="game.systems.action.testHuntSelection()" 
                                style="padding: 5px 10px; font-size: 12px;">
                            ↩️ Назад
                        </button>
                    </div>
                    
                    <div class="selected-resource-info" style="background: rgba(0, 100, 255, 0.1); border: 1px solid #00aaff; border-radius: 8px; padding: 15px; margin-bottom: 20px; text-align: center;">
                        <div style="font-size: 18px; color: #00aaff; margin-bottom: 5px;">
                            Цель охоты: ${resourceName}
                        </div>
                        <div style="color: #aaa; font-size: 12px;">
                            [ТЕСТОВЫЙ РЕСУРС]
                        </div>
                    </div>
                    
                    <div class="monsters-grid">
            `;
            
            testMonsters.forEach(monster => {
                html += `
                    <div class="monster-card" data-monster-id="${monster.id}">
                        <div class="monster-header">
                            <div class="monster-name">${monster.name}</div>
                            <div class="monster-difficulty" style="color: #44ff44;">
                                Легкий (Ур. ${monster.level})
                            </div>
                        </div>
                        
                        <div class="monster-stats" style="margin: 10px 0; font-size: 12px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #ff6666;">❤️ Здоровье:</span>
                                <span>${monster.health}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #6666ff;">🛡️ Броня:</span>
                                <span>${monster.armor}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #ffaa00;">⚔️ Урон:</span>
                                <span>${monster.damage}</span>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 15px;">
                            <button class="btn-control" onclick="game.systems.action.startTestHunt('${resourceId}', '${monster.id}', '${monster.name}')"
                                    style="padding: 8px 15px; font-size: 12px;">
                                🏹 Охотиться на этого
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: rgba(0, 0, 0, 0.3); border-radius: 8px; font-size: 12px; color: #aaa; border: 1px solid rgba(0, 255, 204, 0.3);">
                        <strong style="color: #00ffcc;">📝 Это тестовый интерфейс:</strong>
                        <p style="margin-top: 8px;">
                            1. В реальной игре здесь будут монстры из базы данных<br>
                            2. Каждый монстр будет иметь список лута<br>
                            3. Шанс встретить конкретного монстра зависит от сложности<br>
                            4. После победы вы получите выбранный трофей
                        </p>
                    </div>
                </div>
            `;
            
            actionsContainer.innerHTML = html;
            
            // Стилизуем
            setTimeout(() => {
                const grid = document.querySelector('.monsters-grid');
                if (grid) {
                    grid.style.cssText = `
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 15px;
                        margin-bottom: 20px;
                    `;
                }
                
                const cards = document.querySelectorAll('.monster-card');
                cards.forEach(card => {
                    card.style.cssText = `
                        background: linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(20, 25, 45, 0.95));
                        border: 1px solid #00aaff;
                        border-radius: 8px;
                        padding: 15px;
                    `;
                });
            }, 50);
        }
    }

    startTestHunt(resourceId, monsterId, monsterName) {
        console.log(`🧪 ТЕСТ: Начинаем охоту на ${monsterName} за ресурс ${resourceId}`);
        
        // Сохраняем информацию для теста
        this.mapSystem.pendingAction = {
            action: 'hunt',
            row: 0,
            col: 0,
            targetResource: { id: resourceId, name: 'Тестовый ресурс' },
            wasSuccess: true,
            doubleLoot: false
        };
        
        // Начинаем тестовый бой
        const battleSystem = window.game?.systems?.battle;
        if (battleSystem) {
            const testMonster = {
                id: monsterId,
                name: monsterName,
                level: 2,
                health: 50,
                armor: 5,
                damage: 15,
                loot: {
                    guaranteed: [
                        { id: resourceId, quantity: 1 }
                    ]
                }
            };
            
            this.showNotification(`🏹 Начинается тестовая охота на ${monsterName}!`, 'info');
            battleSystem.startBattleWithSpecificMonster(this.mapSystem.currentHero, testMonster, 'hunt');
        } else {
            this.showNotification("❌ Система боя не доступна для теста", 'error');
        }
    }

    // ========== МЕТОДЫ ДЛЯ ЗАГРУЗКИ ДАННЫХ ==========

  async loadCellData() {
    try {
        console.log("📥 ActionSystem: Загружаем данные типов клеток и ресурсов...");
        
        // Используем Promise.all для параллельной загрузки
        const [cellTypesResponse, resourcesResponse] = await Promise.all([
            fetch('data/cell_types.json').catch(() => {
                console.warn("⚠️ cell_types.json не загружен, создаем базовые типы");
                return null;
            }),
            fetch('data/resources.json').catch(() => {
                console.warn("⚠️ resources.json не загружен, создаем базовые ресурсы");
                return null;
            })
        ]);
        
        // Загружаем типы клеток
        if (cellTypesResponse && cellTypesResponse.ok) {
            const cellData = await cellTypesResponse.json();
            this.cellTypes = cellData.cell_types || {};
            console.log(`✅ Загружено типов клеток: ${Object.keys(this.cellTypes).length}`);
        } else {
            console.warn("❌ cell_types.json не загружен, создаем базовые типы");
            this.createDefaultCellTypes();
        }
        
        // Загружаем ресурсы
        if (resourcesResponse && resourcesResponse.ok) {
            const resourcesData = await resourcesResponse.json();
            this.resources = resourcesData;
            console.log(`✅ Загружено ресурсов: ${Object.keys(this.resources).length} категорий`);
        } else {
            console.warn("❌ resources.json не загружен, создаем базовые ресурсы");
            this.createDefaultResources();
        }
        
        // ВАЖНО: Инициализируем модули действий ПОСЛЕ загрузки данных
        console.log("🔄 Инициализация модулей действий после загрузки данных...");
        await this.initializeActionModules();
        
        // Загружаем картинки локаций (асинхронно, не ждем завершения)
        this.loadLocationImages().catch(error => {
            console.error("❌ Ошибка загрузки картинок локаций:", error);
        });
        
        return true;
        
    } catch (error) {
        console.error("❌ Ошибка загрузки данных клеток:", error);
        
        // Создаем базовые данные при ошибке
        this.createDefaultCellTypes();
        this.createDefaultResources();
        
        // Пробуем инициализировать модули даже при ошибке
        try {
            await this.initializeActionModules();
        } catch (moduleError) {
            console.error("❌ Ошибка инициализации модулей:", moduleError);
        }
        
        return false;
    }
}

    createDefaultCellTypes() {
        this.cellTypes = {
            'grave': {
                name: "Старая каменная гробница",
                description: "Массивная каменная плита с высеченными рунами, явно не крестьянского происхождения. Земля вокруг оседала неравномерно, будто под ней пустота.",
                suggestion: "Это захоронение знатного воина или мага — слишком дорогая отделка для простолюдина.",
                icon: '⚰️',
                image: 'images/locations/grave.jpg',
                action_chances: {
                    search_treasure: 85,
                    search_water: 10,
                    search_berries: 5,
                    search_mushrooms: 15,
                    search_herbs: 20,
                    search_ore: 25,
                    search_stone: 60,
                    set_trap: 40,
                    prepare_ambush: 55,
                    hunt: 70,
                    hunt_caravan: 30,
                    take_assassination_contract: 20,
                    light_campfire: 70,
                    guard_caravan: 35,
                    gather_wood: 20,
                    stealth_movement: 90
                },
                special_notes: "Высокий шанс найти сокровища, но будьте осторожны — такие места часто охраняются проклятиями.",
                failure_monster_chance: 70,
                monster_level: 2
            },
            
            'small_stream': {
                name: "Хрустальный ручей",
                description: "Прозрачная вода струится по гладким камням, образуя небольшие водовороты. Рыбки серебрятся на дне.",
                suggestion: "Идеальное место для пополнения запасов — вода здесь не застаивается.",
                icon: '💧',
                image: 'images/locations/small_stream.jpg',
                action_chances: {
                    search_treasure: 15,
                    search_water: 95,
                    search_berries: 45,
                    search_mushrooms: 25,
                    search_herbs: 50,
                    search_ore: 10,
                    search_stone: 40,
                    set_trap: 75,
                    prepare_ambush: 30,
                    hunt: 60,
                    hunt_caravan: 10,
                    take_assassination_contract: 5,
                    light_campfire: 90,
                    guard_caravan: 25,
                    gather_wood: 30,
                    stealth_movement: 85
                },
                special_notes: "Почти гарантированно можно найти чистую воду. Животные часто приходят на водопой.",
                failure_monster_chance: 40,
                monster_level: 1
            },
            
            'shallow_burrow': {
                name: "Лисья нора",
                description: "Аккуратный вход в подземное логово, окруженный выброшенной землей и костями мелких животных.",
                suggestion: "Нора слишком ухоженная для дикого зверя — кто-то мог использовать ее как тайник.",
                icon: '🕳️',
                image: 'images/locations/shallow_burrow.jpg',
                action_chances: {
                    search_treasure: 40,
                    search_water: 20,
                    search_berries: 10,
                    search_mushrooms: 35,
                    search_herbs: 30,
                    search_ore: 25,
                    search_stone: 50,
                    set_trap: 85,
                    prepare_ambush: 65,
                    hunt: 80,
                    hunt_caravan: 45,
                    take_assassination_contract: 35,
                    light_campfire: 50,
                    guard_caravan: 40,
                    gather_wood: 15,
                    stealth_movement: 70
                },
                special_notes: "Отличное место для засады — ограниченные пути отхода.",
                failure_monster_chance: 60,
                monster_level: 2
            },
            
            'berry_clearing': {
                name: "Ягодная поляна у опушки",
                description: "Солнечная поляна, усыпанная спелыми ягоды всех оттенков красного и синего.",
                suggestion: "Ягоды выглядят съедобными, но темно-синие у камня лучше не трогать.",
                icon: '🫐',
                image: 'images/locations/berry_clearing.jpg',
                action_chances: {
                    search_treasure: 25,
                    search_water: 35,
                    search_berries: 90,
                    search_mushrooms: 40,
                    search_herbs: 75,
                    search_ore: 5,
                    search_stone: 20,
                    set_trap: 60,
                    prepare_ambush: 45,
                    hunt: 50,
                    hunt_caravan: 20,
                    take_assassination_contract: 15,
                    light_campfire: 85,
                    guard_caravan: 30,
                    gather_wood: 40,
                    stealth_movement: 80
                },
                special_notes: "Обилие ягод и лекарственных трав.",
                failure_monster_chance: 35,
                monster_level: 1
            }
        };
    }

    createDefaultResources() {
        this.resources = {
            treasure: [
                { id: 'gold_coins', name: '💰 Золотые монеты', type: 'treasure', rarity: 'common', description: 'Древние монеты, все еще имеющие ценность' },
                { id: 'silver_goblet', name: '🥈 Серебряный кубок', type: 'treasure', rarity: 'uncommon', description: 'Изысканный кубок с гравировкой' },
                { id: 'jewelry', name: '💎 Драгоценности', type: 'treasure', rarity: 'rare', description: 'Бриллианты и изумруды' }
            ],
            water: [
                { id: 'fresh_water', name: '💧 Пресная вода', type: 'water', rarity: 'common', description: 'Чистая питьевая вода' },
                { id: 'mineral_water', name: '💎 Минеральная вода', type: 'water', rarity: 'uncommon', description: 'Вода с полезными минералами' },
                { id: 'magical_spring', name: '✨ Вода из магического источника', type: 'water', rarity: 'rare', description: 'Вода с лечебными свойствами' }
            ],
            berries: [
                { id: 'wild_berries', name: '🫐 Дикие ягоды', type: 'berries', rarity: 'common', description: 'Сладкие лесные ягоды' },
                { id: 'medicinal_berries', name: '🌿 Лечебные ягоды', type: 'berries', rarity: 'uncommon', description: 'Ягоды с целебными свойствами' },
                { id: 'nightshade', name: '☠️ Паслён', type: 'berries', rarity: 'rare', description: 'Ядовитые ягоды для создания ядов' }
            ],
            mushrooms: [
                { id: 'common_mushrooms', name: '🍄 Обычные грибы', type: 'mushrooms', rarity: 'common', description: 'Съедобные лесные грибы' },
                { id: 'healing_mushrooms', name: '❤️ Целебные грибы', type: 'mushrooms', rarity: 'uncommon', description: 'Грибы с лечебными свойствами' },
                { id: 'hallucinogenic_mushrooms', name: '🌀 Галлюциногенные грибы', type: 'mushrooms', rarity: 'rare', description: 'Грибы, изменяющие сознание' }
            ],
            herbs: [
                { id: 'healing_herbs', name: '🌿 Целебные травы', type: 'herbs', rarity: 'common', description: 'Травы для лечения ран' },
                { id: 'poison_herbs', name: '☠️ Ядовитые травы', type: 'herbs', rarity: 'uncommon', description: 'Травы для создания ядов' },
                { id: 'magical_herbs', name: '✨ Магические травы', type: 'herbs', rarity: 'rare', description: 'Редкие травы для алхимии' }
            ],
            ores: [
                { id: 'iron_ore', name: '⛏️ Железная руда', type: 'ores', rarity: 'common', description: 'Базовая руда для ковки' },
                { id: 'copper_ore', name: '🔶 Медная руда', type: 'ores', rarity: 'common', description: 'Руда для инструментов' },
                { id: 'silver_ore', name: '🥈 Серебряная руда', type: 'ores', rarity: 'uncommon', description: 'Руда для ценных предметов' }
            ],
            stones: [
                { id: 'common_stone', name: '🪨 Обычный камень', type: 'stones', rarity: 'common', description: 'Строительный материал' },
                { id: 'flint', name: '🔥 Кремень', type: 'stones', rarity: 'common', description: 'Для разжигания огня' },
                { id: 'obsidian', name: '⚫ Обсидиан', type: 'stones', rarity: 'uncommon', description: 'Вулканическое стекло' }
            ],
            traps: [
                { id: 'snare_trap', name: '🪤 Петля-ловушка', type: 'traps', rarity: 'common', description: 'Простая ловушка для мелкой дичи' },
                { id: 'pit_trap', name: '🕳️ Яма-ловушка', type: 'traps', rarity: 'uncommon', description: 'Глубокая яма, прикрытая ветками' },
                { id: 'bear_trap', name: '🐻 Капкан', type: 'traps', rarity: 'rare', description: 'Мощная ловушка для крупной дичи' }
            ],
            ambush: [
                { id: 'ambush_position', name: '🎯 Позиция для засады', type: 'ambush', rarity: 'common', description: 'Подготовленная позиция для атаки' },
                { id: 'hidden_position', name: '👁️ Скрытная позиция', type: 'ambush', rarity: 'uncommon', description: 'Отличное укрытие для наблюдения' },
                { id: 'killing_ground', name: '💀 Убийственная зона', type: 'ambush', rarity: 'rare', description: 'Идеальное место для засады' }
            ],
            loot: [
                { id: 'caravan_loot', name: '📦 Добыча с каравана', type: 'loot', rarity: 'uncommon', description: 'Товары и припасы с торгового каравана' },
                { id: 'bandit_loot', name: '⚔️ Добыча разбойников', type: 'loot', rarity: 'common', description: 'Награбленное добро' },
                { id: 'treasure_chest', name: '💰 Сундук с сокровищами', type: 'loot', rarity: 'rare', description: 'Богатая добыча' }
            ],
            contracts: [
                { id: 'assassination_contract', name: '📜 Контракт на убийство', type: 'contracts', rarity: 'rare', description: 'Задание на устранение цели' },
                { id: 'bounty_hunt', name: '🎯 Задание на поимку', type: 'contracts', rarity: 'uncommon', description: 'Охота на преступника' },
                { id: 'delivery_contract', name: '📦 Контракт на доставку', type: 'contracts', rarity: 'common', description: 'Доставка груза' }
            ],
            shelter: [
                { id: 'campfire_site', name: '🔥 Место для лагеря', type: 'shelter', rarity: 'common', description: 'Безопасное место для отдыха' },
                { id: 'hidden_camp', name: '🏕️ Скрытый лагерь', type: 'shelter', rarity: 'uncommon', description: 'Укрытие для длительного пребывания' },
                { id: 'fortified_camp', name: '🏰 Укрепленный лагерь', type: 'shelter', rarity: 'rare', description: 'Надежное укрытие с защитой' }
            ],
            food: [
                { id: 'venison', name: '🦌 Оленина', type: 'food', rarity: 'common', description: 'Свежее мясо оленя' },
                { id: 'rabbit', name: '🐇 Крольчатина', type: 'food', rarity: 'common', description: 'Мясо кролика' },
                { id: 'boar_meat', name: '🐗 Кабанятина', type: 'food', rarity: 'uncommon', description: 'Жирное мясо кабана' },
                { id: 'bird', name: '🐦 Птица', type: 'food', rarity: 'common', description: 'Мясо лесной птицы' }
            ],
            woods: [
                { id: 'twigs', name: '🌿 Веточки', type: 'woods', rarity: 'common', description: 'Мелкие сухие ветки' },
                { id: 'branches', name: '🪵 Ветки', type: 'woods', rarity: 'common', description: 'Крепкие ветки для костра' },
                { id: 'logs', name: '🪓 Поленья', type: 'woods', rarity: 'uncommon', description: 'Толстые поленья для длительного горения' }
            ],
            // Охотничьи ресурсы (для модуля охоты)
            bones: [
                { id: 'small_bone', name: '🦴 Маленькая кость', type: 'bones', rarity: 'common', description: 'Кость мелкого животного', price: 5 },
                { id: 'wolf_bone', name: '🐺 Волчья кость', type: 'bones', rarity: 'uncommon', description: 'Кость волка, прочная и крепкая', price: 15 },
                { id: 'horse_bone', name: '🐴 Конская кость', type: 'bones', rarity: 'rare', description: 'Кость лошади, большая и тяжелая', price: 25 }
            ],
            leathers: [
                { id: 'thin_leather', name: '🐂 Тонкая кожа', type: 'leathers', rarity: 'common', description: 'Кожа мелкого животного', price: 10 },
                { id: 'strong_leather', name: '🦌 Прочная кожа', type: 'leathers', rarity: 'uncommon', description: 'Кожа оленя, хорошего качества', price: 20 },
                { id: 'thick_leather', name: '🐗 Толстая кожа', type: 'leathers', rarity: 'rare', description: 'Кожа кабана, очень прочная', price: 30 }
            ],
            hides: [
                { id: 'thin_hide', name: '🐇 Тонкая шкура', type: 'hides', rarity: 'common', description: 'Шкурка кролика', price: 8 },
                { id: 'strong_hide', name: '🦊 Лисья шкура', type: 'hides', rarity: 'uncommon', description: 'Шкурка лисы, красивая и теплая', price: 40 },
                { id: 'thick_hide', name: '🐻 Медвежья шкура', type: 'hides', rarity: 'rare', description: 'Шкура медведя, очень ценная', price: 100 }
            ],
            furs: [
                { id: 'hare_fur', name: '🐰 Заячий мех', type: 'furs', rarity: 'common', description: 'Мягкий мех зайца', price: 12 },
                { id: 'marten_fur', name: '🦡 Куний мех', type: 'furs', rarity: 'uncommon', description: 'Мех куницы, очень ценный', price: 50 },
                { id: 'arctic_fox_fur', name: '🦊 Мех песца', type: 'furs', rarity: 'rare', description: 'Белый мех песца, роскошный', price: 80 }
            ]
        };
    }

    async loadLocationImages() {
        try {
            console.log("🖼️ ActionSystem: Загружаем картинки локаций...");
            
            const fallbackImg = this.createFallbackImage();
            this.locationImageCache.set('fallback', fallbackImg);
            
            console.log("✅ Картинки локаций готовы");
            return true;
        } catch (error) {
            console.error("❌ Ошибка загрузки картинок:", error);
            return false;
        }
    }

    createFallbackImage() {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 400, 400);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 400);
        
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Изображение', 200, 180);
        ctx.fillText('локации', 200, 220);
        
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 380, 380);
        
        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    }

    // ========== МЕТОДЫ ОПРЕДЕЛЕНИЯ ТИПОВ КЛЕТОК ==========

    determineCellType(cell) {
        if (!cell || !this.mapSystem.currentTacticalMap) return 'grave';
        
        const cellKey = `${cell.col},${cell.row}`;
        
        // Если тип уже определен и есть в загруженных данных
        if (cell.cellType && this.cellTypes[cell.cellType]) {
            return cell.cellType;
        }
        
        // Маппинг типов клеток на типы локаций
        const typeMapping = {
            'water': 'small_stream',
            'graveyard_cross': 'haunted_cemetery',
            'cave': 'crystal_cave',
            'tree': 'ancient_tree',
            'elegant_tree': 'ancient_tree',
            'mountain': 'rocky_outcrop',
            'campfire': 'abandoned_camp',
            'berry_clearing': 'berry_clearing',
            'rocky_outcrop': 'rocky_outcrop',
            'ruined_shrine': 'ruined_shrine',
            'crystal_cave': 'crystal_cave',
            'herb_garden': 'herb_garden',
            'haunted_cemetery': 'haunted_cemetery',
            'sunken_ship': 'sunken_ship',
            'abandoned_camp': 'abandoned_camp',
            'player_start': 'ancient_tree',
            'npc': 'village',
            'merchant': 'village',
            'tavern': 'village',
            'shop': 'village',
            'village': 'village',
            'castle': 'ruined_shrine',
            'bandit_camp': 'bandit_camp',
            'orc_camp': 'bandit_camp',
            'monster': 'beast_lair',
            'chest': 'smugglers_cache',
            'obstacle': 'petrified_forest',
            'portal': 'fairy_ring',
            'ancient_rune': 'druid_stone_circle',
            'magic_crystal': 'crystal_cave',
            'bridge': 'bridge_troll_toll',
            'lava_crack': 'mineral_spring',
            'traveler': 'abandoned_camp',
            'cart': 'abandoned_camp',
            'inactive': 'petrified_forest'
        };
        
        // Определяем тип клетки
        if (cell.type && typeMapping[cell.type]) {
            const mappedType = typeMapping[cell.type];
            if (this.cellTypes[mappedType]) {
                cell.cellType = mappedType;
            } else {
                cell.cellType = this.getDefaultCellType(cell);
            }
        } else {
            cell.cellType = this.getDefaultCellType(cell);
        }
        
        console.log(`🔍 ActionSystem: Определен тип клетки [${cell.col},${cell.row}]: ${cell.cellType} (исходный тип: ${cell.type})`);
        return cell.cellType;
    }

    getDefaultCellType(cell) {
        if (cell.hasLoot) {
            const lootLocations = ['smugglers_cache', 'abandoned_camp', 'sunken_ship'];
            const seed = cell.col * 47 + cell.row * 29;
            return lootLocations[seed % lootLocations.length];
        } else if (cell.passable === false) {
            return 'petrified_forest';
        } else {
            const availableTypes = Object.keys(this.cellTypes);
            if (availableTypes.length > 0) {
                const seed = cell.col * 47 + cell.row * 29;
                const randomIndex = seed % availableTypes.length;
                return availableTypes[randomIndex];
            } else {
                return 'grave';
            }
        }
    }

    getActionChance(action, cellType) {
        console.log(`🔍 ActionSystem: Запрос шанса для действия: ${action}, тип клетки: ${cellType}`);
        
        const cellTypeData = this.cellTypes[cellType];
        
        if (!cellTypeData) {
            console.warn(`❌ Данные типа клетки не найдены: ${cellType}`);
            const baseChance = this.baseActionChances[action] || 25;
            console.log(`   Используем базовый шанс: ${baseChance}%`);
            return baseChance;
        }
        
        if (cellTypeData.action_chances) {
            if (cellTypeData.action_chances[action] !== undefined) {
                const chance = cellTypeData.action_chances[action];
                console.log(`   Шанс ${action} для ${cellType}: ${chance}% (из файла)`);
                return chance;
            }
        }
        
        const baseChance = this.baseActionChances[action] || 25;
        console.log(`   Используем базовый шанс: ${baseChance}%`);
        return baseChance;
    }

// В классе ActionSystem, ДОБАВИТЬ после метода getActionChance:
getChanceColor(chance) {
    if (chance >= 90) return '#00ffaa';
    if (chance >= 70) return '#44ff44';
    if (chance >= 40) return '#ffaa00';
    return '#ff4444';
}


    
getAvailableActionsForCellType(cellType, cell) {
    // Если клетка специальная (торговец или вода), возвращаем соответствующие действия
    if (cell) {
        if (cell.type === 'merchant') {
            return ['trade']; // Только действие торговли
        }
        if (cell.type === 'water') {
            return ['fill_flask']; // Только действие наполнения фляги
        }
    }
    
    // Для обычных клеток - обычная логика
    const cellTypeData = this.cellTypes[cellType];
    if (!cellTypeData || !cellTypeData.action_chances) {
        return this.allActions.filter(action => (this.baseActionChances[action] || 25) > 0);
    }
    
    const availableActions = Object.keys(cellTypeData.action_chances)
        .filter(action => cellTypeData.action_chances[action] > 0)
        .sort((a, b) => cellTypeData.action_chances[b] - cellTypeData.action_chances[a]);
    
    return availableActions;
}


// В классе ActionSystem, ДОБАВИТЬ после метода getAvailableActionsForCellType:
getCellSpecificActions(cell) {
    if (!cell) return [];
    
    const actions = [];
    
    // Проверяем тип клетки и добавляем соответствующие действия
    switch (cell.type) {
        case 'merchant':
            actions.push('trade');
            break;
            
        case 'water':
            actions.push('fill_flask');
            break;
            
        case 'tavern':
            actions.push('rest');
            actions.push('gather_info');
            break;
            
        case 'campfire':
            actions.push('rest');
            actions.push('cook');
            break;
            
        default:
            // Для обычных клеток возвращаем пустой массив
            // обычные действия будут определены через getAvailableActionsForCellType
            break;
    }
    
    return actions;
}


updateCellActionsUI(cell) {
    console.log("=== НАЧАЛО updateCellActionsUI ===");
    
    // Проверяем, мирная ли карта
    if (this.mapSystem.isPeacefulMap && this.mapSystem.isPeacefulMap()) {
        console.log("🍻 Мирная карта - показываем специальный интерфейс");
        this.showPeacefulMapUI(cell);
        return;
    }
    
    const mapContent = document.querySelector('.tactical-map-content-with-actions');
    if (!mapContent) {
        console.error("❌ Основной контейнер карты не найден!");
        return;
    }
    
    // Создаем левую панель если ее нет
    let leftPanel = document.querySelector('.cell-info-left-panel');
    if (!leftPanel) {
        leftPanel = document.createElement('div');
        leftPanel.className = 'cell-info-left-panel';
        mapContent.insertBefore(leftPanel, mapContent.firstChild);
    }
    
    const actionsContainer = document.getElementById('cellActionsContainer');
    if (!actionsContainer) {
        console.error("❌ Контейнер действий не найден!");
        this.createActionsContainerFallback();
        return;
    }
    
    const mapVisual = document.querySelector('.tactical-map-visual');
    const mapRect = mapVisual ? mapVisual.getBoundingClientRect() : null;
    
    const panelWidth = 1150;
    const panelHeight = mapRect ? mapRect.height - 30 : window.innerHeight * 0.8;
    
    console.log(`📐 Размеры панелей: ${panelWidth}x${panelHeight}px`);
    
    // ========== ЛЕВАЯ ПАНЕЛЬ ==========
    leftPanel.style.cssText = `
        display: flex !important;
        flex-direction: column !important;
        visibility: visible !important;
        opacity: 1 !important;
        height: ${panelHeight}px !important;
        max-height: ${panelHeight}px !important;
        min-height: ${panelHeight}px !important;
        width: ${panelWidth}px !important;
        max-width: ${panelWidth}px !important;
        min-width: ${panelWidth}px !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
        border: 2px solid #00ffcc !important;
        border-radius: 10px !important;
        padding: 20px !important;
        margin-right: 20px !important;
        position: relative !important;
        box-shadow: 0 0 20px rgba(0, 255, 204, 0.4) !important;
        flex-shrink: 0 !important;
        align-self: flex-start !important;
    `;
    
    // ========== ПРАВАЯ ПАНЕЛЬ ==========
    actionsContainer.style.cssText = `
        display: flex !important;
        flex-direction: column !important;
        visibility: visible !important;
        opacity: 1 !important;
        height: ${panelHeight}px !important;
        max-height: ${panelHeight}px !important;
        min-height: ${panelHeight}px !important;
        width: ${panelWidth}px !important;
        max-width: ${panelWidth}px !important;
        min-width: ${panelWidth}px !important;
        overflow-y: auto !important;
        overflow-x: hidden !important;
        background: linear-gradient(135deg, #16213e, #1a1a2e) !important;
        border: 2px solid #00ffff !important;
        border-radius: 10px !important;
        padding: 20px !important;
        margin-left: 20px !important;
        position: relative !important;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.4) !important;
        flex-shrink: 0 !important;
        align-self: flex-start !important;
    `;
    
    const panel = actionsContainer.closest('.cell-actions-panel');
    if (panel) {
        panel.style.cssText = `
            display: flex !important;
            flex-direction: column !important;
            height: ${panelHeight + 30}px !important;
            max-height: ${panelHeight + 30}px !important;
            min-height: ${panelHeight + 30}px !important;
            width: ${panelWidth + 30}px !important;
            max-width: ${panelWidth + 30}px !important;
            min-width: ${panelWidth + 30}px !important;
            margin-left: 20px !important;
            align-self: flex-start !important;
            flex-shrink: 0 !important;
        `;
    }
    
    mapContent.style.cssText = `
        display: flex !important;
        flex-direction: row !important;
        justify-content: space-between !important;
        align-items: flex-start !important;
        height: ${panelHeight + 40}px !important;
        gap: 20px !important;
        padding: 0 20px !important;
        overflow: visible !important;
        width: 100% !important;
    `;
    
    const mapMainArea = document.querySelector('.map-main-area');
    if (mapMainArea) {
        mapMainArea.style.cssText = `
            flex: 1 !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            height: ${panelHeight}px !important;
            min-width: 600px !important;
            max-width: 800px !important;
            margin: 0 20px !important;
        `;
    }
    
    if (cell.explored === undefined) cell.explored = false;
    if (cell.hasAction === undefined) cell.hasAction = true;
    
    this.selectedCell = cell;
    this.currentCellType = this.determineCellType(cell);
    const cellTypeData = this.cellTypes[this.currentCellType];
    
    if (!cellTypeData) {
        console.error(`❌ Данные типа клетки не найдены: ${this.currentCellType}`);
        leftPanel.innerHTML = `<div class="cell-error">Ошибка загрузки типа клетки</div>`;
        actionsContainer.innerHTML = `<div class="cell-error">Ошибка загрузки типа клетки</div>`;
        return;
    }
    
    const cellIcon = this.mapSystem.objectSymbols[cell.type] || cellTypeData.icon || '❓';
    
    const isCurrentPosition = (cell.col === this.mapSystem.playerTacticalPosition.x && 
                       cell.row === this.mapSystem.playerTacticalPosition.y);
    const isReachable = this.mapSystem.isCellReachable(cell);
    const isExplored = cell.explored === true;
    const isSpecialCell = this.isSpecialCellForActions(cell);
    
    // ========== ВАЖНОЕ ИСПРАВЛЕНИЕ: всегда показываем специальные действия для специальных клеток ==========
    if (isSpecialCell) {
        console.log(`🎯 Это специальная клетка: ${cell.type}, показываем специальные действия всегда`);
        this.currentCellActions = this.getCellSpecificActions(cell);
        
        // ОСОБО ВАЖНО: для специальных клеток НЕ устанавливаем explored = true после использования
        // Клетка остается доступной для повторного использования
        if (isExplored && isSpecialCell) {
            console.log(`🔄 Клетка ${cell.type} исследована, но специальные действия остаются доступными`);
            // НЕ показываем "клетка исследована", показываем интерфейс с действиями
        }
    } else {
        // Для обычных клеток используем обычную логику
        this.currentCellActions = this.getAvailableActionsForCellType(this.currentCellType, cell);
    }
    
    console.log(`🎯 Доступные действия: ${this.currentCellActions.length} шт. (специальная клетка: ${isSpecialCell})`);
    
    // ========== HTML ЛЕВОЙ ПАНЕЛИ ==========
    let leftHTML = '';
    
    try {
        leftHTML = this.createLeftPanelHTML(cell, cellTypeData, cellIcon, isCurrentPosition, isExplored);
    } catch (error) {
        console.error("❌ Ошибка создания информации о клетке:", error);
        leftHTML = `<div style="color: red; padding: 10px;">Ошибка: ${error.message}</div>`;
    }
    
    leftPanel.innerHTML = leftHTML;
    
    // ========== HTML ПРАВОЙ ПАНЕЛИ ==========
    let rightHTML = '';
    
    rightHTML += `
        <div class="actions-section" style="margin-bottom: 20px;">
            <h3 style="color: #00ffff; margin-bottom: 15px; text-align: center;">
                ⚔️ Доступные действия
            </h3>
    `;
    
    // ========== ИСПРАВЛЕНИЕ: специальные клетки всегда показывают действия ==========
    if (isSpecialCell) {
        console.log(`🎯 Показываем специальные действия для ${cell.type}`);
        if (this.currentCellActions.length > 0) {
            try {
                rightHTML += this.createActionsButtonsHTML(cell, isCurrentPosition, isReachable);
            } catch (error) {
                console.error("❌ Ошибка создания списка действий:", error);
                rightHTML += `<div style="color: red; padding: 5px;">Ошибка действий</div>`;
            }
        } else {
            rightHTML += this.createNoActionsHTML();
        }
    } 
    // Обычные клетки с обычной логикой
    else if (!isExplored && cell.hasAction !== false) {
        if (this.currentCellActions.length > 0) {
            try {
                rightHTML += this.createActionsButtonsHTML(cell, isCurrentPosition, isReachable);
            } catch (error) {
                console.error("❌ Ошибка создания списка действий:", error);
                rightHTML += `<div style="color: red; padding: 5px;">Ошибка действий</div>`;
            }
        } else {
            rightHTML += this.createNoActionsHTML();
        }
    } else if (isExplored && !isSpecialCell) {
        rightHTML += this.createExploredCellHTML();
    } else if (cell.hasAction === false) {
        rightHTML += this.createNoActionsHTML();
    }
    
    rightHTML += `</div>`;
    
    // Добавляем легенду шансов только для не-мирных карт и не-специальных клеток
    if (!this.mapSystem.isPeacefulMap() && !isSpecialCell) {
        rightHTML += `
            <div class="chance-legend" style="
                background: rgba(0, 0, 0, 0.4);
                border-radius: 8px;
                padding: 12px;
                font-size: 12px;
                color: #ccc;
                margin-top: 15px;
            ">
                <strong style="color: #00ffcc;">Легенда шансов:</strong>
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <span style="color: #ff4444;">0-39% - Плохой</span>
                    <span style="color: #ffaa00;">40-69% - Средний</span>
                    <span style="color: #44ff44;">70-89% - Хороший</span>
                    <span style="color: #00ffaa;">90-100% - Отличный</span>
                </div>
            </div>
        `;
    }
    
    rightHTML += `
        <div class="resource-info" style="margin-top: auto; padding-top: 20px; border-top: 1px solid #475569;">
            <h5 style="color: #00ffff; margin-bottom: 10px; text-align: center;">📦 Ресурсы героя:</h5>
            <div class="resource-list" id="heroResourcesListRight">
                <!-- Ресурсы будут загружены динамически -->
            </div>
        </div>
    `;
    
    actionsContainer.innerHTML = rightHTML;
    
    // ========== ОПТИМИЗАЦИЯ ==========
    setTimeout(() => {
        const leftImageWrapper = leftPanel.querySelector('.location-visual-container');
        if (leftImageWrapper) {
            leftImageWrapper.style.cssText = `
                height: 300px !important;
                width: 300px !important;
                max-height: 300px !important;
                max-width: 300px !important;
                min-height: 300px !important;
                min-width: 300px !important;
                overflow: hidden !important;
                margin: 0 auto 20px auto !important;
                position: relative !important;
                border: 2px solid #00ffcc !important;
                border-radius: 10px !important;
                align-self: center !important;
            `;
        }
        
        if (cellTypeData) {
            try {
                this.displayRealLocationImage(cellTypeData, leftPanel);
            } catch (error) {
                console.error("❌ Ошибка загрузки картинки:", error);
            }
        }
        
        const actionCards = actionsContainer.querySelectorAll('.action-card');
        actionCards.forEach(card => {
            card.style.cssText = `
                background: linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(20, 25, 45, 0.95)) !important;
                border: 1px solid #00aaff !important;
                border-radius: 8px !important;
                padding: 12px !important;
                display: flex !important;
                flex-direction: column !important;
                height: 100% !important;
                transition: all 0.2s ease !important;
                margin: 0 !important;
            `;
            
            if (!card.style.opacity || card.style.opacity !== '0.6') {
                card.onmouseenter = () => {
                    card.style.transform = 'translateY(-3px) scale(1.02)';
                    card.style.boxShadow = '0 8px 20px rgba(0, 170, 255, 0.4)';
                };
                card.onmouseleave = () => {
                    card.style.transform = 'translateY(0) scale(1)';
                    card.style.boxShadow = 'none';
                };
            }
        });
        
        const actionsGrid = actionsContainer.querySelector('.actions-grid');
        if (actionsGrid) {
            actionsGrid.style.cssText = `
                display: grid !important;
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 12px !important;
                margin-bottom: 20px !important;
            `;
        }
        
        this.updateHeroResourcesUI('heroResourcesListRight');
        
        console.log(`✅ Панели созданы: левая ${panelWidth}x${panelHeight}px, карта по центру, правая ${panelWidth}x${panelHeight}px`);
        
    }, 50);
    
    if ((!isExplored && cell.hasAction !== false && this.currentCellActions.length > 0) || 
        (isSpecialCell && this.currentCellActions.length > 0)) {
        try {
            this.setupActionEventListeners();
        } catch (error) {
            console.error("❌ Ошибка назначения обработчиков:", error);
        }
    }
    
    console.log("✅ Панели обновлены");
    console.log("=== КОНЕЦ updateCellActionsUI ===");
}




    

    createLeftPanelHTML(cell, cellTypeData, cellIcon, isCurrentPosition, isExplored) {
        return `
            <div class="cell-info-header-left">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 20px; border-bottom: 2px solid rgba(0, 255, 204, 0.3); padding-bottom: 10px;">
                    📍 Информация о локации
                </h3>
                
                <div class="location-visual-container">
                    <div class="location-image-wrapper" id="locationImageWrapperLeft">
                        <div class="image-loading">🖼️ Загрузка изображения...</div>
                    </div>
                    <div class="location-icon-overlay">
                        <div class="cell-icon-large">${cellIcon}</div>
                    </div>
                </div>
                
                <h4 class="cell-name" style="color: #00ffcc; text-align: center; margin: 15px 0; font-size: 1.3rem;">
                    ${cellTypeData.name}
                </h4>
                
                <div class="cell-position-info" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 6px;
                    margin-bottom: 15px;
                ">
                    <span class="cell-coords" style="color: #94a3b8; font-size: 14px;">
                        Позиция: [${cell.col}, ${cell.row}]
                    </span>
                    ${isCurrentPosition ? 
                        '<span class="current-position-badge" style="background: rgba(0, 255, 204, 0.2); color: #00ffcc; padding: 4px 8px; border-radius: 4px; font-size: 12px;">📍 Вы здесь</span>' : ''}
                    ${isExplored ? 
                        '<span class="explored-badge" style="background: rgba(0, 255, 0, 0.2); color: #00ff00; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✓ Исследовано</span>' : ''}
                </div>
                
                <div class="cell-description-text" style="
                    color: #cbd5e1;
                    font-size: 14px;
                    line-height: 1.6;
                    padding: 15px;
                    background: rgba(0, 0, 0, 0.4);
                    border-radius: 8px;
                    margin-bottom: 15px;
                    border-left: 3px solid #00ffcc;
                    max-height: 200px;
                    overflow-y: auto;
                ">
                    ${cellTypeData.description}
                </div>
                
                ${cellTypeData.suggestion ? `
                    <div class="cell-suggestion" style="
                        background: rgba(251, 191, 36, 0.1);
                        border: 1px solid rgba(251, 191, 36, 0.3);
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 15px;
                        color: #fbbf24;
                        font-size: 13px;
                    ">
                        <strong>💡 Совет:</strong> ${cellTypeData.suggestion}
                    </div>
                ` : ''}
                
                ${cellTypeData.special_notes ? `
                    <div class="special-notes" style="
                        background: rgba(245, 158, 11, 0.1);
                        border: 1px solid rgba(245, 158, 11, 0.3);
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 15px;
                        color: #fbbf24;
                        font-size: 13px;
                    ">
                        <strong>📝 Особенности:</strong> ${cellTypeData.special_notes}
                    </div>
                ` : ''}
                
                <div class="danger-level-info" style="
                    background: rgba(255, 100, 100, 0.1);
                    border: 1px solid rgba(255, 100, 100, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 15px;
                    color: #ffcccc;
                    font-size: 14px;
                ">
                    <strong style="color: #ff6666; display: block; margin-bottom: 8px;">⚠️ Уровень опасности: ${cellTypeData.monster_level || 1}/5</strong>
                    <div class="danger-bar" style="
                        width: 100%;
                        height: 8px;
                        background: rgba(255, 100, 100, 0.2);
                        border-radius: 4px;
                        overflow: hidden;
                        margin: 8px 0;
                    ">
                        <div class="danger-fill" style="
                            width: ${(cellTypeData.monster_level || 1) * 20}%;
                            height: 100%;
                            background: linear-gradient(90deg, #ff6666, #ff4444);
                            border-radius: 4px;
                        "></div>
                    </div>
                    <small style="color: #ff9999; font-size: 12px;">
                        Шанс монстра при неудаче: ${cellTypeData.failure_monster_chance || 50}%
                    </small>
                </div>
                
                <div class="cell-stats-left" style="
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    padding: 15px;
                    border: 1px solid rgba(0, 255, 204, 0.2);
                    margin-top: auto;
                ">
                    <h5 style="color: #00ffcc; margin-bottom: 10px; text-align: center;">📊 Статистика клетки</h5>
                    <div class="stat-item" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <span style="color: #94a3b8;">Тип:</span>
                        <span class="stat-value" style="color: #00ffcc; font-weight: bold;">${cell.type || 'Обычная'}</span>
                    </div>
                    <div class="stat-item" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <span style="color: #94a3b8;">Проходимость:</span>
                        <span class="stat-value" style="color: ${cell.passable !== false ? '#00ff00' : '#ff4444'}; font-weight: bold;">
                            ${cell.passable !== false ? '✅ Проходима' : '❌ Непроходима'}
                        </span>
                    </div>
                    <div class="stat-item" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <span style="color: #94a3b8;">Видимость:</span>
                        <span class="stat-value" style="color: ${cell.visible !== false ? '#00ffcc' : '#ffaa00'}; font-weight: bold;">
                            ${cell.visible !== false ? '👁️ Видима' : '👻 Скрыта'}
                        </span>
                    </div>
                    ${cell.hasLoot ? `
                        <div class="stat-item" style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <span style="color: #94a3b8;">Лут:</span>
                            <span class="stat-value" style="color: #f59e0b; font-weight: bold;">💎 Возможен</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
createActionsButtonsHTML(cell, isCurrentPosition, isReachable) {
    console.log(`🔍 Создание кнопок действий для клетки [${cell.col},${cell.row}], тип: ${cell.type}`);
    
    // Проверяем, является ли клетка специальной (торговец, вода и т.д.)
    const isSpecialCell = cell.type === 'merchant' || cell.type === 'water' || 
                          cell.type === 'tavern' || cell.type === 'campfire';
    
    // Для специальных клеток используем специальный интерфейс
    if (isSpecialCell && this.currentCellActions.length > 0) {
        return this.generateSpecialActionsButtonsHTML(cell, isCurrentPosition, isReachable);
    }
    
    // Для обычных клеток - стандартный интерфейс
    let html = `<div class="actions-grid" style="
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 20px;
    ">`;
    
    this.currentCellActions.forEach((action, index) => {
        const chance = this.getActionChance(action, this.currentCellType);
        const chancePercent = Math.round(chance);
        const config = this.actionConfigs[action] || {
            icon: '❓',
            name: action.replace(/_/g, ' '),
            description: 'Неизвестное действие'
        };
        
        // Определяем цвет шанса
        let chanceColor = '#ff4444'; // Плохой (0-39%)
        if (chance >= 40) chanceColor = '#ffaa00'; // Средний (40-69%)
        if (chance >= 70) chanceColor = '#44ff44'; // Хороший (70-89%)
        if (chance >= 90) chanceColor = '#00ffaa'; // Отличный (90-100%)
        
        // Проверяем доступность действия
        let isDisabled = false;
        let disabledReason = '';
        
        // ИСПРАВЛЕНИЕ: Для торговли и наполнения фляги проверяем только достижимость
        if (action === 'trade' || action === 'fill_flask') {
            if (!isReachable) {
                isDisabled = true;
                disabledReason = '❌ Подойдите ближе';
            }
        } else {
            // Для остальных действий обычная логика
            if (!isReachable) {
                isDisabled = true;
                disabledReason = '❌ Клетка недоступна';
            } else if (!isCurrentPosition && config.requires_player_here) {
                isDisabled = true;
                disabledReason = '❌ Нужно быть в клетке';
            } else if (cell.explored && !config.allowed_on_explored) {
                isDisabled = true;
                disabledReason = '❌ Клетка уже исследована';
            }
        }
        
        // Специальные метки для действий
        const triggersMonster = config.triggers_monster ? '⚠️ Может вызвать монстра!' : '';
        const alwaysMonster = config.always_monster ? '🏹 Всегда приводит к бою' : '';
        const doubleLoot = config.double_loot ? '💰 Двойной лут' : '';
        const isSpecialAction = config.special ? `🎯 ${config.special.toUpperCase()}` : '';
        
        // Создаем обработчик клика
        let onClickHandler = '';
        if (!isDisabled) {
            onClickHandler = `onclick="window.game.systems.action.performCellAction('${action}', ${cell.row}, ${cell.col})"`;
        }
        
        // Определяем иконку действия в зависимости от типа
        let actionIcon = config.icon || '⚡';
        if (action === 'trade') actionIcon = '🛒';
        if (action === 'fill_flask') actionIcon = '💧';
        if (action === 'rest') actionIcon = '😴';
        if (action === 'gather_info') actionIcon = '👂';
        
        html += `
            <div class="action-card" style="
                background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9));
                border: 1px solid ${isDisabled ? '#666' : '#00aaff'};
                border-radius: 8px;
                padding: 12px;
                display: flex;
                flex-direction: column;
                height: 100%;
                transition: all 0.2s ease;
                ${!isDisabled ? 'cursor: pointer;' : 'opacity: 0.6; cursor: not-allowed;'}
                position: relative;
                overflow: hidden;
            " ${onClickHandler}>
                
                <!-- Фоновый эффект для редкости/особенностей -->
                ${config.special ? `
                    <div class="action-special-badge" style="
                        position: absolute;
                        top: 5px;
                        right: 5px;
                        background: rgba(0, 170, 255, 0.2);
                        color: #00aaff;
                        font-size: 10px;
                        padding: 2px 6px;
                        border-radius: 4px;
                        border: 1px solid rgba(0, 170, 255, 0.3);
                    ">
                        ${isSpecialAction}
                    </div>
                ` : ''}
                
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <div class="action-icon" style="
                        font-size: 20px;
                        margin-right: 10px;
                        color: ${isDisabled ? '#888' : chanceColor};
                        flex-shrink: 0;
                        filter: ${isDisabled ? 'grayscale(1)' : 'none'};
                    ">
                        ${actionIcon}
                    </div>
                    <div class="action-name" style="
                        font-weight: bold;
                        color: ${isDisabled ? '#888' : '#ffffff'};
                        font-size: 13px;
                        flex: 1;
                    ">
                        ${config.name}
                    </div>
                </div>
                
                <div class="action-description" style="
                    color: ${isDisabled ? '#777' : '#b0b0ff'};
                    font-size: 11px;
                    margin-bottom: 10px;
                    line-height: 1.3;
                    flex: 1;
                ">
                    ${config.description}
                    
                    <!-- Показываем особые свойства действий -->
                    ${triggersMonster ? `<br><small style="color: #ff4444; font-size: 9px;">${triggersMonster}</small>` : ''}
                    ${alwaysMonster ? `<br><small style="color: #ffaa00; font-size: 9px;">${alwaysMonster}</small>` : ''}
                    ${doubleLoot ? `<br><small style="color: #f59e0b; font-size: 9px;">${doubleLoot}</small>` : ''}
                    ${isSpecialAction ? `<br><small style="color: #00aaff; font-size: 9px;">${isSpecialAction}</small>` : ''}
                </div>
                
                <!-- Показ шанса успеха -->
                <div class="action-chance-display" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 11px;
                    margin-top: auto;
                    padding-top: 10px;
                    border-top: 1px solid ${isDisabled ? '#444' : 'rgba(255, 255, 255, 0.1)'};
                ">
                    <span style="color: ${isDisabled ? '#777' : '#aaa'};">Шанс успеха:</span>
                    <div style="display: flex; align-items: center;">
                        <div style="
                            width: 40px;
                            height: 6px;
                            background: ${isDisabled ? '#444' : '#333'};
                            border-radius: 3px;
                            margin-right: 8px;
                            overflow: hidden;
                        ">
                            <div style="
                                width: ${chancePercent}%;
                                height: 100%;
                                background: ${isDisabled ? '#666' : chanceColor};
                                border-radius: 3px;
                                transition: width 0.3s ease;
                            "></div>
                        </div>
                        <span style="color: ${isDisabled ? '#888' : chanceColor}; font-weight: bold;">
                            ${chancePercent}%
                        </span>
                    </div>
                </div>
                
                <!-- Причина недоступности -->
                ${isDisabled ? `
                    <div style="
                        font-size: 10px;
                        color: #ff6666;
                        margin-top: 8px;
                        padding-top: 8px;
                        border-top: 1px dashed #444;
                        text-align: center;
                    ">
                        ${disabledReason}
                    </div>
                ` : ''}
                
                <!-- Эффект при наведении (только для доступных действий) -->
                ${!isDisabled ? `
                    <div class="action-hover-effect" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(45deg, transparent, rgba(0, 170, 255, 0.05), transparent);
                        opacity: 0;
                        transition: opacity 0.3s ease;
                        pointer-events: none;
                    "></div>
                ` : ''}
            </div>
        `;
    });
    
    html += `</div>`;
    
    // Добавляем JavaScript для эффектов наведения
    html += `
        <script>
            setTimeout(() => {
                const actionCards = document.querySelectorAll('.action-card:not([style*="opacity: 0.6"])');
                actionCards.forEach(card => {
                    const hoverEffect = card.querySelector('.action-hover-effect');
                    
                    card.addEventListener('mouseenter', () => {
                        card.style.transform = 'translateY(-3px) scale(1.02)';
                        card.style.boxShadow = '0 8px 20px rgba(0, 170, 255, 0.4)';
                        card.style.borderColor = '#00ffcc';
                        if (hoverEffect) hoverEffect.style.opacity = '1';
                        
                        // Анимация полоски шанса
                        const chanceFill = card.querySelector('div[style*="width:"]');
                        if (chanceFill) {
                            const originalWidth = chanceFill.style.width;
                            chanceFill.style.width = '0%';
                            setTimeout(() => {
                                chanceFill.style.width = originalWidth;
                            }, 10);
                        }
                    });
                    
                    card.addEventListener('mouseleave', () => {
                        card.style.transform = 'translateY(0) scale(1)';
                        card.style.boxShadow = 'none';
                        card.style.borderColor = '#00aaff';
                        if (hoverEffect) hoverEffect.style.opacity = '0';
                    });
                });
            }, 50);
        </script>
    `;
    
    return html;
}

    
/**
 * Генерация кнопок специальных действий для не-мирных карт
 */
generateSpecialActionsButtonsHTML(cell, isCurrentPosition, isReachable) {
    console.log(`🎯 Генерация специальных действий для ${cell.type} на обычной карте`);
    
    // Определяем заголовок и описание в зависимости от типа клетки
    let title = '';
    let subtitle = '';
    let bgColor = 'rgba(0, 170, 255, 0.1)';
    let borderColor = '#00aaff';
    
    switch(cell.type) {
        case 'merchant':
            title = '🛒 Торговец';
            subtitle = cell.merchantName || 'Торговец';
            bgColor = 'rgba(251, 191, 36, 0.1)';
            borderColor = '#fbbf24';
            break;
            
        case 'water':
            title = '💧 Источник воды';
            subtitle = 'Чистая питьевая вода';
            bgColor = 'rgba(59, 130, 246, 0.1)';
            borderColor = '#3b82f6';
            break;
            
        case 'tavern':
            title = '🍻 Таверна';
            subtitle = 'Место для отдыха и новостей';
            bgColor = 'rgba(220, 38, 38, 0.1)';
            borderColor = '#dc2626';
            break;
            
        case 'campfire':
            title = '🔥 Кострище';
            subtitle = 'Тепло и уют у огня';
            bgColor = 'rgba(245, 158, 11, 0.1)';
            borderColor = '#f59e0b';
            break;
            
        default:
            title = '⚡ Особые действия';
            subtitle = 'Доступные взаимодействия';
    }
    
    let html = `
        <div class="special-actions-section" style="margin-bottom: 20px;">
            <div class="special-actions-header" style="
                background: ${bgColor};
                border: 2px solid ${borderColor};
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 20px;
                text-align: center;
            ">
                <h3 style="color: ${borderColor}; margin-bottom: 8px; font-size: 18px;">
                    ${title}
                </h3>
                <p style="color: #ccc; font-size: 14px; margin-bottom: 5px;">
                    ${subtitle}
                </p>
                <p style="color: #94a3b8; font-size: 12px;">
                    Позиция: [${cell.col}, ${cell.row}]
                </p>
            </div>
            
            <div class="special-actions-grid" style="
                display: grid;
                grid-template-columns: repeat(${this.currentCellActions.length}, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            ">
    `;
    
    // Генерируем кнопки для каждого специального действия
    this.currentCellActions.forEach((action, index) => {
        const config = this.actionConfigs[action] || {
            icon: '❓',
            name: action.replace(/_/g, ' '),
            description: 'Специальное действие'
        };
        
        // Проверяем доступность действия
        const isDisabled = !isReachable;
        const disabledReason = isReachable ? '' : '❌ Подойдите ближе';
        
        // Шанс успеха для специальных действий всегда 100%
        const chancePercent = 100;
        const chanceColor = '#00ffaa';
        
        // Создаем обработчик клика
        let onClickHandler = '';
        if (!isDisabled) {
            onClickHandler = `onclick="window.game.systems.action.performCellAction('${action}', ${cell.row}, ${cell.col})"`;
        }
        
        // Определяем цвет карточки в зависимости от типа действия
        let cardBgColor = 'rgba(30, 30, 46, 0.95)';
        let cardBorderColor = isDisabled ? '#666' : borderColor;
        
        if (action === 'trade') {
            cardBgColor = 'rgba(251, 191, 36, 0.1)';
        } else if (action === 'fill_flask') {
            cardBgColor = 'rgba(59, 130, 246, 0.1)';
        } else if (action === 'rest') {
            cardBgColor = 'rgba(220, 38, 38, 0.1)';
        } else if (action === 'gather_info') {
            cardBgColor = 'rgba(139, 92, 246, 0.1)';
        }
        
        html += `
            <div class="special-action-card" ${onClickHandler}
                 style="
                    background: linear-gradient(135deg, ${cardBgColor}, rgba(20, 25, 45, 0.95));
                    border: 2px solid ${cardBorderColor};
                    border-radius: 10px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                    transition: all 0.3s ease;
                    ${!isDisabled ? 'cursor: pointer;' : 'opacity: 0.6; cursor: not-allowed;'}
                    position: relative;
                    overflow: hidden;
                 ">
                
                <!-- Иконка действия -->
                <div class="special-action-icon" style="
                    font-size: 32px;
                    margin-bottom: 15px;
                    color: ${isDisabled ? '#888' : borderColor};
                    transition: transform 0.3s ease;
                ">
                    ${config.icon}
                </div>
                
                <!-- Название действия -->
                <div class="special-action-name" style="
                    font-size: 16px;
                    font-weight: bold;
                    color: ${isDisabled ? '#888' : '#ffffff'};
                    margin-bottom: 10px;
                ">
                    ${config.name}
                </div>
                
                <!-- Описание действия -->
                <div class="special-action-description" style="
                    color: ${isDisabled ? '#777' : '#b0b0ff'};
                    font-size: 12px;
                    line-height: 1.4;
                    margin-bottom: 15px;
                    flex: 1;
                ">
                    ${config.description}
                </div>
                
                <!-- Шанс успеха (всегда 100% для специальных действий) -->
                <div class="special-action-chance" style="
                    background: ${isDisabled ? '#444' : 'rgba(0, 255, 170, 0.1)'};
                    border: 1px solid ${isDisabled ? '#666' : '#00ffaa'};
                    border-radius: 20px;
                    padding: 5px 15px;
                    font-size: 12px;
                    color: ${isDisabled ? '#888' : '#00ffaa'};
                    font-weight: bold;
                    margin-bottom: 10px;
                ">
                    🎯 Шанс: ${chancePercent}%
                </div>
                
                <!-- Причина недоступности -->
                ${isDisabled ? `
                    <div style="
                        font-size: 11px;
                        color: #ff6666;
                        padding-top: 10px;
                        border-top: 1px dashed #444;
                        width: 100%;
                    ">
                        ${disabledReason}
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    html += `
            </div>
            
            <!-- Подсказка -->
            <div class="special-actions-hint" style="
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                padding: 12px;
                text-align: center;
                color: #94a3b8;
                font-size: 12px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                margin-top: 10px;
            ">
                <strong>💡 Подсказка:</strong> ${this.getSpecialActionHint(cell.type)}
            </div>
        </div>
        
        <script>
            // JavaScript для анимации кнопок
            setTimeout(() => {
                const specialCards = document.querySelectorAll('.special-action-card:not([style*="opacity: 0.6"])');
                specialCards.forEach(card => {
                    const icon = card.querySelector('.special-action-icon');
                    
                    card.addEventListener('mouseenter', () => {
                        card.style.transform = 'translateY(-5px) scale(1.05)';
                        card.style.boxShadow = '0 15px 30px rgba(0, 0, 0, 0.4)';
                        card.style.borderWidth = '3px';
                        if (icon) icon.style.transform = 'scale(1.2) rotate(5deg)';
                    });
                    
                    card.addEventListener('mouseleave', () => {
                        card.style.transform = 'translateY(0) scale(1)';
                        card.style.boxShadow = 'none';
                        card.style.borderWidth = '2px';
                        if (icon) icon.style.transform = 'scale(1) rotate(0deg)';
                    });
                });
            }, 50);
        </script>
    `;
    
    return html;
}

    
getSpecialActionHint(cellType) {
    const hints = {
        'merchant': 'Нажмите на действие "Торговать" для открытия магазина и покупки товаров',
        'water': 'Нажмите на действие "Наполнить флягу" для пополнения запасов воды и восстановления здоровья',
        'tavern': 'Отдых восстановит здоровье и силы, а сбор информации может открыть новые возможности',
        'campfire': 'Отдых у костра восстановит здоровье и даст временные бонусы'
    };
    
    return hints[cellType] || 'Нажмите на действие для его выполнения';
}


/**
 * Проверяет, является ли действие специальным (всегда доступным)
 */
isSpecialAction(action) {
    const specialActions = ['trade', 'fill_flask', 'rest', 'gather_info'];
    return specialActions.includes(action);
}

/**
 * Проверяет, является ли клетка специальной для действий
 */
isSpecialCellForActions(cell) {
    if (!cell) return false;
    
    const specialCellTypes = ['merchant', 'water', 'tavern', 'campfire'];
    return specialCellTypes.includes(cell.type);
}


    
    createNoActionsHTML() {
        return `
            <div class="no-available-actions">
                <div class="no-actions-icon">🚫</div>
                <p>Для этой локации нет доступных действий</p>
                <p class="hint">Выберите другую клетку для взаимодействия.</p>
            </div>
        `;
    }

    createExploredCellHTML() {
        return `
            <div class="cell-explored">
                <div class="explored-icon">✓</div>
                <h5>Местность исследована</h5>
                <p>Вы уже исследовали эту местность и совершили доступные действия.</p>
                <p class="hint">Перейдите на другую клетку для новых действий.</p>
            </div>
        `;
    }

    createActionsContainerFallback() {
        console.log("🛠️ ActionSystem: Создаем контейнеры слева и справа");
        
        const mapContent = document.querySelector('.tactical-map-content-with-actions');
        if (!mapContent) {
            console.error("❌ Основной контейнер карты не найден");
            return;
        }
        
        const leftPanel = document.createElement('div');
        leftPanel.className = 'cell-info-left-panel';
        leftPanel.id = 'cellInfoLeftPanel';
        
        const actionsPanel = document.createElement('div');
        actionsPanel.className = 'cell-actions-panel';
        
        const actionsContainer = document.createElement('div');
        actionsContainer.id = 'cellActionsContainer';
        actionsContainer.className = 'cell-actions-container';
        
        actionsPanel.appendChild(actionsContainer);
        
        mapContent.innerHTML = '';
        mapContent.appendChild(leftPanel);
        mapContent.appendChild(actionsPanel);
        
        console.log("✅ Контейнеры созданы слева и справа");
    }

    displayRealLocationImage(cellTypeData, leftContainer) {
        const imageWrapper = leftContainer?.querySelector('#locationImageWrapperLeft');
        if (!imageWrapper) return;
        
        const img = new Image();
        
        img.onload = () => {
            imageWrapper.innerHTML = '';
            img.className = 'location-image';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            imageWrapper.appendChild(img);
            
            const overlay = document.createElement('div');
            overlay.className = 'image-dark-overlay';
            imageWrapper.appendChild(overlay);
            
            console.log(`🖼️ Картинка локации загружена в левую панель: ${cellTypeData.name}`);
        };
        
        img.onerror = () => {
            console.error(`❌ Ошибка загрузки картинки: ${cellTypeData.image}`);
            this.displayFallbackLocationImage(cellTypeData, leftContainer);
        };
        
        img.src = cellTypeData.image || '';
    }

    displayFallbackLocationImage(cellTypeData, container) {
        const imageWrapper = container?.querySelector('#locationImageWrapperLeft') || 
                            document.getElementById('locationImageWrapperLeft');
        if (!imageWrapper) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 250;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 400, 250);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 250);
        
        ctx.fillStyle = 'rgba(0, 255, 204, 0.05)';
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * 400;
            const y = Math.random() * 250;
            const size = Math.random() * 3 + 1;
            ctx.fillRect(x, y, size, size);
        }
        
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(cellTypeData.name, 200, 35);
        
        ctx.font = 'bold 64px Arial';
        ctx.fillText(cellTypeData.icon || '❓', 200, 120);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Arial';
        ctx.fillText('Изображение локации', 200, 160);
        
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 380, 230);
        
        const img = new Image();
        img.src = canvas.toDataURL();
        
        img.onload = () => {
            imageWrapper.innerHTML = '';
            const imgElement = img.cloneNode();
            imgElement.className = 'location-image';
            imgElement.style.width = '100%';
            imgElement.style.height = '100%';
            imgElement.style.objectFit = 'cover';
            imageWrapper.appendChild(imgElement);
            
            const overlay = document.createElement('div');
            overlay.className = 'image-dark-overlay';
            imageWrapper.appendChild(overlay);
            
            console.log(`🖼️ Fallback картинка локации создана: ${cellTypeData.name}`);
        };
    }

    setupActionEventListeners() {
        const actionButtons = document.querySelectorAll('.cell-action-btn:not(.disabled)');
        console.log(`🎯 ActionSystem: Найдено ${actionButtons.length} доступных кнопок действий`);
        
        actionButtons.forEach(button => {
            const action = button.dataset.action;
            const row = parseInt(button.dataset.cellRow);
            const col = parseInt(button.dataset.cellCol);
            
            button.removeEventListener('click', this.handleActionClick);
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log(`🎯 Клик по действию: ${action} на клетке [${col}, ${row}]`);
                this.performCellAction(action, row, col);
            });
        });
    }


async performCellAction(action, row, col) {
    console.log(`🎯 ActionSystem.performCellAction: ${action} на [${col},${row}]`);

    // === ПРОВЕРКА НА МИРНУЮ КАРТУ ===
    if (this.mapSystem.isPeacefulMap && this.mapSystem.isPeacefulMap()) {
        console.log(`🍻 На мирной карте выполняется действие: ${action}`);
        
        // Для мирных карт особые правила
        if (action === 'trade') {
            this.handleTradeAction(row, col);
            return;
        }

        if (action === 'fill_flask') {
            this.handleFillFlaskAction(row, col);
            return;
        }
        
        // Для других действий на мирной карте просто показываем сообщение
        const config = this.actionConfigs[action] || {
            icon: '⚡',
            name: action.replace(/_/g, ' '),
            description: 'Действие выполнено'
        };
        this.showNotification(`${config.icon} ${config.name} выполнено на мирной карте`, 'success');
        return;
    }

    // === ОБРАБОТКА СПЕЦИАЛЬНЫХ ДЕЙСТВИЙ (торговля, вода) ===
    if (action === 'trade') {
        this.handleTradeAction(row, col);
        return;
    }

    if (action === 'fill_flask') {
        this.handleFillFlaskAction(row, col);
        return;
    }
    
    // === ДИАГНОСТИКА И ИСПРАВЛЕНИЕ ПЕРЕД ОХОТОЙ ===
    if (action === 'hunt') {
        console.log(`🏹 === ОБРАБОТКА ОХОТЫ ===`);
        
        // 1. Проверяем, загружен ли модуль охоты
        if (!this.actionModules['hunt']) {
            console.log("🔄 Модуль охоты не загружен, пробуем загрузить...");
            await this.ensureHuntModuleLoaded();
        }
        
        // 2. Получаем модуль охоты
        const huntModule = this.actionModules['hunt'];
        if (!huntModule) {
            console.error("❌ Модуль охоты не найден даже после загрузки");
            this.showNotification("❌ Система охоты не доступна!", 'error');
            return;
        }
        
        console.log("✅ Модуль охоты найден:", huntModule);
        
        // 3. Проверяем метод execute
        if (typeof huntModule.execute !== 'function') {
            console.error("❌ У модуля нет метода execute!");
            this.showNotification("❌ Ошибка модуля охоты!", 'error');
            return;
        }
        
        // 4. Получаем клетку для проверки
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (!cell) {
            console.error(`❌ Клетка [${col}, ${row}] не найдена`);
            this.showNotification("❌ Клетка не найдена!", 'error');
            return;
        }
        
        // ВАЖНОЕ ИСПРАВЛЕНИЕ: для охоты проверяем исследованность только если клетка не специальная
        if (!this.isSpecialCellForActions(cell) && cell.explored === true) {
            console.warn(`⚠️ Клетка [${col}, ${row}] уже исследована`);
            this.showNotification("❌ Эта клетка уже исследована!", 'warning');
            return;
        }
        
        // 5. Проверяем, достижима ли клетка
        const isReachable = this.mapSystem.isCellReachable(cell);
        if (!isReachable) {
            console.warn(`⚠️ Клетка [${col}, ${row}] недостижима`);
            this.showNotification("❌ Клетка недостижима для охоты!", 'warning');
            return;
        }
        
        // 6. Вызываем execute модуля охоты
        console.log(`✅ Вызываем huntModule.execute(${row}, ${col})`);
        
        try {
            return await huntModule.execute(row, col);
        } catch (error) {
            console.error("❌ Ошибка выполнения модуля охоты:", error);
            this.showNotification("❌ Ошибка системы охоты!", 'error');
            return;
        }
    }
    
    // === СКРЫТНОЕ ПЕРЕМЕЩЕНИЕ - обрабатываем отдельно ===
    if (action === 'stealth_movement') {
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        if (!cell) {
            console.error(`❌ Клетка не найдена`);
            return;
        }
        
        if (!this.mapSystem.isCellReachable(cell)) {
            console.warn(`⚠️ Клетка недостижима для скрытного перемещения`);
            this.showNotification("❌ Клетка недостижима!", 'warning');
            return;
        }
        this.handleStealthMovement(cell);
        return;
    }
    
    // === РЕСУРСНЫЕ ДЕЙСТВИЯ с отображением вероятностей ===
    const resourceActions = [
        'search_treasure', 'search_water', 'search_berries', 
        'search_mushrooms', 'search_herbs', 'search_ore', 
        'search_stone', 'gather_wood', 'set_trap'
    ];
    
    if (resourceActions.includes(action)) {
        console.log(`📊 Показываем вероятности для ${action}`);
        this.performResourceAction(action, row, col);
        return;
    }
    
    // ========== СТАНДАРТНАЯ ОБРАБОТКА ОСТАЛЬНЫХ ДЕЙСТВИЙ ==========
    
    // Получаем клетку
    const cellKey = `${col},${row}`;
    const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
    if (!cell) {
        console.error(`❌ Клетка не найдена`);
        return;
    }
    
    // Проверяем доступность клетки
    const isReachable = this.mapSystem.isCellReachable(cell);
    if (!isReachable) {
        console.warn(`⚠️ Клетка [${col}, ${row}] недостижима`);
        this.showNotification("❌ Клетка недостижима для действия!", 'warning');
        return;
    }
    
    // ВАЖНОЕ ИСПРАВЛЕНИЕ: проверяем исследованность только для не-специальных действий
    if (!this.isSpecialAction(action) && cell.explored === true) {
        console.warn(`⚠️ Клетка [${col}, ${row}] уже исследована`);
        this.showNotification("❌ Эта клетка уже исследована!", 'warning');
        return;
    }
    
    // Проверяем, есть ли у клетки действия
    if (cell.hasAction === false && !this.isSpecialAction(action)) {
        console.warn(`⚠️ Клетка [${col}, ${row}] не имеет доступных действий`);
        this.showNotification("❌ На этой клетке нет доступных действий!", 'warning');
        return;
    }
    
    const actionsContainer = document.getElementById('cellActionsContainer');
    if (actionsContainer) {
        const config = this.actionConfigs[action] || {
            icon: '⚡',
            name: action.replace(/_/g, ' '),
            description: 'Выполняется действие...'
        };
        const chance = this.isSpecialAction(action) ? 100 : this.getActionChance(action, this.currentCellType);
        
        actionsContainer.innerHTML = `
            <div class="action-processing">
                <div class="processing-icon">${config.icon || '⚡'}</div>
                <h4>Выполняется действие...</h4>
                <p>${config.name} на клетке [${col}, ${row}]</p>
                <div class="chance-display-processing">
                    <span class="chance-label">Шанс успеха:</span>
                    <span class="chance-value">${chance}%</span>
                </div>
                <div class="processing-progress">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                </div>
                <div class="processing-hint">Результат зависит от удачи и особенностей местности</div>
            </div>
        `;
        
        setTimeout(() => {
            const progressFill = actionsContainer.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = '100%';
            }
        }, 50);
    }
    
    // === ПРОВЕРКА НА НОЧЬ ===
    if (this.mapSystem.timeSystem) {
        const timeStatus = this.mapSystem.timeSystem.getTimeStatus();
        
        // Если ночь и не в лагере - предупреждение
        if (timeStatus.isNight && !this.mapSystem.timeSystem.isInCamp()) {
            console.log("🌙 Выполнение действия ночью вне лагеря");
            
            // Показываем предупреждение
            if (window.game) {
                const confirmAction = window.confirm(
                    "🌙 Ночью выполнять действия очень опасно!\n" +
                    "Шум и свет привлекут монстров.\n" +
                    "Продолжить?"
                );
                
                if (!confirmAction) {
                    console.log("❌ Игрок отменил действие ночью");
                    
                    // Восстанавливаем интерфейс
                    setTimeout(() => {
                        if (cell) {
                            this.updateCellActionsUI(cell);
                        }
                    }, 100);
                    return;
                }
            }
        }
        
        // Тратим 1 час на действие
        this.mapSystem.timeSystem.spendHourOnHex(action);
    }
    
    // Имитация выполнения действия с задержкой
    setTimeout(() => {
        const chance = this.isSpecialAction(action) ? 100 : this.getActionChance(action, this.currentCellType);
        const roll = Math.random() * 100;
        const success = roll <= chance;
        
        console.log(`🎲 Бросок удачи: ${roll.toFixed(1)}/${chance} - ${success ? 'УСПЕХ' : 'ПРОВАЛ'}`);
        
        if (success) {
            this.handleActionSuccess(action, row, col);
            
            // ВАЖНОЕ ИСПРАВЛЕНИЕ: специальные клетки НЕ отмечаем как исследованные
            // чтобы можно было использовать их многократно
            if (!this.isSpecialAction(action)) {
                // Отмечаем клетку как исследованную после успешного действия
                cell.explored = true;
                cell.hasAction = false;
            }
        } else {
            const cellTypeData = this.cellTypes[this.currentCellType];
            
            let monsterChance = cellTypeData?.failure_monster_chance || 50;
            
            const config = this.actionConfigs[action];
            if (config && config.triggers_monster) {
                monsterChance *= (config.monster_level_multiplier || 1);
            }
            
            const monsterRoll = Math.random() * 100;
            
            if (monsterRoll <= monsterChance) {
                console.log(`👹 Неудача вызвала появление монстра! Шанс: ${monsterChance}%, Выпало: ${monsterRoll}`);
                this.handleActionFailureWithMonster(action, row, col, cellTypeData);
            } else {
                this.handleActionFailure(action);
            }
        }
        
        // Обновляем интерфейс клетки после завершения действия
        setTimeout(() => {
            if (cell) {
                this.updateCellActionsUI(cell);
            }
            
            // Сохраняем игру
            if (window.game) {
                window.game.saveGame();
            }
        }, 1000);
        
    }, 800);
}



// ========== НОВАЯ МЕХАНИКА ДЕЙСТВИЙ ==========

/**
 * Выполнение действия с учётом времени суток
 */
async performCellActionNew(action, row, col) {
    console.log(`🎯 НОВОЕ выполнение действия: ${action} на [${col},${row}]`);
    
    const cellKey = `${col},${row}`;
    const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
    
    if (!cell) {
        this.showNotification("❌ Клетка не найдена!", 'error');
        return;
    }

    // Проверка исследованности
    if (!cell.explored && cell.cellTypeData?.research_required) {
        this.showNotification("❌ Сначала исследуйте этот гекс!", 'warning');
        return;
    }

    // Проверка, что действие доступно
    const cellTypeData = this.cellTypes[cell.cellType];
    const actionData = cellTypeData?.actions?.find(a => a.type === action);
    
    if (!actionData) {
        this.showNotification("❌ Это действие недоступно на этом гексе!", 'error');
        return;
    }

    // Проверка времени суток
    const timeStatus = this.mapSystem.timeSystem?.getTimeStatus();
    const isDay = timeStatus?.isDay ?? true;
    
    // Получение шанса успеха
    const successChance = isDay ? actionData.day_success_chance : actionData.night_success_chance;
    const monsterChance = isDay ? 0 : actionData.night_monster_chance;
    
    // Показ интерфейса действия
    this.showActionInterface(actionData, successChance, monsterChance, row, col, isDay);
}



// ========== МОСТЫ ДЛЯ СОВМЕСТИМОСТИ ==========

/**
 * Мост между старой и новой механикой действий
 * Разместить ПОСЛЕ performCellActionNew
 */
performCellActionBridge(action, row, col) {
    console.log("🌉 ActionSystem: Используем мост для действия", action);
    
    const cellKey = `${col},${row}`;
    const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
    
    if (!cell) {
        console.error("❌ Клетка не найдена");
        return this.performCellActionOld(action, row, col);
    }
    
    // Определяем тип клетки
    const cellType = cell.cellType || this.determineCellType(cell);
    const cellTypeData = this.cellTypes[cellType];
    
    // Проверяем, есть ли данные в новом формате
    const hasNewFormat = cellTypeData && 
                        cellTypeData.actions && 
                        Array.isArray(cellTypeData.actions);
    
    if (hasNewFormat) {
        console.log("✅ Используем новую механику действий");
        
        // Находим действие в новом формате
        const actionData = cellTypeData.actions.find(a => a.type === action);
        if (actionData) {
            return this.performCellActionNew(action, row, col);
        } else {
            console.warn("⚠️ Действие не найдено в новом формате, пробуем старую механику");
        }
    }
    
    // Используем старую механику для обратной совместимости
    console.log("🔄 Используем старую механику для совместимости");
    return this.performCellActionOld(action, row, col);
}

/**
 * Старая версия performCellAction для обратной совместимости
 * Разместить ПОСЛЕ performCellActionBridge
 */
performCellActionOld(action, row, col) {
    console.log(`🎯 ActionSystem.OLD: Старая механика действия ${action} на [${col},${row}]`);
    
    // Сохраняем старую логику, но с улучшениями
    const cellKey = `${col},${row}`;
    const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
    
    if (!cell) {
        this.showNotification("❌ Клетка не найдена!", 'error');
        return;
    }
    
    // Проверяем исследованность
    if (cell.explored && !this.isSpecialAction(action)) {
        this.showNotification("❌ Эта клетка уже исследована!", 'warning');
        return;
    }
    
    // Для торговли и воды - старая логика
    if (action === 'trade') {
        return this.handleTradeAction(row, col);
    }
    
    if (action === 'fill_flask') {
        return this.handleFillFlaskAction(row, col);
    }
    
    // Для охоты - старая логика
    if (action === 'hunt') {
        if (this.actionModules['hunt']) {
            return this.actionModules['hunt'].execute(row, col);
        }
    }
    
    // Остальные действия - упрощённая старая логика
    const chance = this.getActionChanceOld(action, cell.cellType);
    const roll = Math.random() * 100;
    const success = roll <= chance;
    
    if (success) {
        this.showNotification(`✅ ${action} успешно!`, 'success');
        cell.explored = true;
        cell.hasAction = false;
    } else {
        this.showNotification(`❌ ${action} не удалось`, 'warning');
    }
    
    // Обновляем интерфейс
    setTimeout(() => {
        this.updateCellActionsUI(cell);
    }, 500);
}

/**
 * Старая версия getActionChance для совместимости
 */
getActionChanceOld(action, cellType) {
    const cellTypeData = this.cellTypes[cellType];
    
    if (cellTypeData && cellTypeData.action_chances) {
        return cellTypeData.action_chances[action] || 50;
    }
    
    return this.baseActionChances[action] || 50;
}


    
/**
 * Показ интерфейса для действия
 */
showActionInterface(actionData, successChance, monsterChance, row, col, isDay) {
    const actionsContainer = document.getElementById('cellActionsContainer');
    if (!actionsContainer) return;
    
    const timeText = isDay ? '☀️ День' : '🌙 Ночь';
    const successColor = this.getChanceColor(successChance);
    const monsterColor = monsterChance > 0 ? '#ff4444' : '#00ff00';
    
    actionsContainer.innerHTML = `
        <div class="action-interface">
            <h3 style="color: #00ffcc; text-align: center;">
                ${actionData.icon} ${actionData.name}
            </h3>
            
            <div class="action-info" style="
                background: rgba(0, 0, 0, 0.4);
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
            ">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #94a3b8;">Время:</span>
                    <span style="color: ${isDay ? '#fbbf24' : '#3b82f6'};">${timeText}</span>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="color: #94a3b8;">Шанс успеха:</span>
                    <span style="color: ${successColor}; font-weight: bold;">${successChance}%</span>
                </div>
                
                ${monsterChance > 0 ? `
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: #94a3b8;">Шанс монстра:</span>
                        <span style="color: ${monsterColor}; font-weight: bold;">${monsterChance}%</span>
                    </div>
                ` : ''}
                
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <p style="color: #cbd5e1; font-size: 14px;">${actionData.description}</p>
                </div>
            </div>
            
            <div class="action-requirements" style="
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                padding: 10px;
                margin-bottom: 20px;
                font-size: 12px;
                color: #94a3b8;
            ">
                ${actionData.requires_research ? '✓ Требуется исследование гекса' : '✓ Доступно сразу'}
                ${actionData.triggers_battle ? '<br>⚠️ Вызывает бой' : ''}
                ${actionData.requires_stealth ? '<br>👣 Требуется скрытность' : ''}
                ${actionData.is_peaceful ? '<br>🍻 Мирное действие' : ''}
            </div>
            
            <div style="text-align: center;">
                <button class="btn-control" 
                        onclick="window.game.systems.action.executeActionNew('${actionData.type}', ${row}, ${col})"
                        style="padding: 15px 30px; font-size: 16px;">
                    🎲 Выполнить действие
                </button>
            </div>
            
            <div style="margin-top: 20px; color: #888; font-size: 12px; text-align: center;">
                <em>Действие займёт 1 час времени</em>
            </div>
        </div>
    `;
}

/**
 * Выполнение действия с учётом всех факторов
 */
async executeActionNew(actionType, row, col) {
    const cellKey = `${col},${row}`;
    const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
    const cellTypeData = this.cellTypes[cell.cellType];
    const actionData = cellTypeData?.actions?.find(a => a.type === actionType);
    
    if (!cell || !actionData) return;
    
    // Тратим 1 час времени
    if (this.mapSystem.timeSystem) {
        this.mapSystem.timeSystem.spendHourOnHex(actionType);
    }
    
    const timeStatus = this.mapSystem.timeSystem?.getTimeStatus();
    const isDay = timeStatus?.isDay ?? true;
    
    // Проверка успеха
    const successChance = isDay ? actionData.day_success_chance : actionData.night_success_chance;
    const successRoll = Math.random() * 100;
    const isSuccess = successRoll <= successChance;
    
    // Проверка появления монстра
    const monsterChance = isDay ? 0 : actionData.night_monster_chance;
    const monsterRoll = Math.random() * 100;
    const hasMonster = monsterRoll <= monsterChance;
    
    if (isSuccess) {
        // Успешное выполнение действия
        await this.handleActionSuccessNew(actionData, cell, row, col);
        
        // Если ночью и есть шанс монстра
        if (hasMonster && actionData.night_monster_chance > 0) {
            // Вызов боя с монстром
            await this.startBattleForAction(cell, actionData);
        }
    } else {
        // Неудачное выполнение
        this.handleActionFailureNew(actionData, cell);
        
        // При неудаче всегда вызываем бой ночью
        if (!isDay && actionData.night_monster_chance > 0) {
            await this.startBattleForAction(cell, actionData);
        }
    }
    
    // Обновление интерфейса
    setTimeout(() => {
        if (cell) {
            this.updateCellActionsUI(cell);
        }
    }, 1000);
}

/**
 * Обработка успешного выполнения действия
 */
async handleActionSuccessNew(actionData, cell, row, col) {
    console.log(`✅ Успешное выполнение: ${actionData.name}`);
    
    // Награда в зависимости от типа действия
    switch(actionData.resource_type) {
        case 'treasure':
            this.giveTreasureReward(cell);
            break;
        case 'gold':
            this.giveGoldReward(actionData);
            break;
        case 'weapon':
        case 'armor':
            this.giveItemReward(actionData.resource_type);
            break;
        case 'hunting':
            this.giveHuntingReward(cell);
            break;
        case 'water':
            this.fillFlask();
            break;
        case 'shop':
            this.openShop(cell);
            break;
        case 'information':
            this.giveInformation(cell);
            break;
        case 'contract':
            this.giveAssassinationContract();
            break;
        default:
            // Сбор ресурсов
            this.giveResourceReward(actionData);
    }
    
    // Если это было последнее действие на гексе
    if (!cell.cellTypeData?.reusable_after_research) {
        cell.hasAction = false;
    }
    
    this.showNotification(`✅ ${actionData.name} успешно выполнено!`, 'success');
}

/**
 * Запуск боя для действия
 */
async startBattleForAction(cell, actionData) {
    const battleSystem = window.game?.systems?.battle;
    if (!battleSystem) return;
    
    // Получение монстра в зависимости от типа действия
    let monster = null;
    
    if (actionData.battle_type === 'boss') {
        monster = this.getBossMonster(cell.cellTypeData?.research_monster_level);
    } else if (actionData.battle_type === 'group') {
        // Бой с группой монстров
        await this.startGroupBattle(cell, actionData.group_size);
        return;
    } else if (actionData.battle_type === 'hunt') {
        // Охотничий бой
        await this.startHuntBattle(cell);
        return;
    } else {
        // Случайный монстр из списка
        monster = this.getRandomMonsterForCell(cell);
    }
    
    if (monster) {
        this.mapSystem.pendingAction = {
            action: actionData.type,
            row: cell.row,
            col: cell.col,
            wasSuccess: true,
            requiresResearch: cell.cellTypeData?.research_required
        };
        
        battleSystem.startBattleWithSpecificMonster(
            this.mapSystem.currentHero,
            monster,
            'action'
        );
    }
}

/**
 * Получение случайного монстра для клетки
 */
getRandomMonsterForCell(cell) {
    const cellTypeData = this.cellTypes[cell.cellType];
    if (!cellTypeData?.monsters || cellTypeData.monsters.length === 0) {
        return this.getRandomMonsterByLevel(cellTypeData?.research_monster_level || 1);
    }
    
    const monsterId = cellTypeData.monsters[
        Math.floor(Math.random() * cellTypeData.monsters.length)
    ];
    
    const battleSystem = window.game?.systems?.battle;
    if (battleSystem) {
        return battleSystem.getMonsterById(monsterId);
    }
    
    return null;
}

/**
 * Бой с группой монстров
 */
async startGroupBattle(cell, groupSize) {
    const battleSystem = window.game?.systems?.battle;
    if (!battleSystem) return;
    
    const monsters = [];
    for (let i = 0; i < groupSize; i++) {
        const monster = this.getRandomMonsterForCell(cell);
        if (monster) {
            monsters.push(monster);
        }
    }
    
    if (monsters.length > 0) {
        this.mapSystem.pendingAction = {
            action: 'group_battle',
            row: cell.row,
            col: cell.col,
            monsters: monsters,
            requiresResearch: cell.cellTypeData?.research_required
        };
        
        // Запуск группового боя
        battleSystem.startGroupBattle(this.mapSystem.currentHero, monsters, 'group');
    }
}

/**
 * Выдача награды за сокровища
 */
giveTreasureReward(cell) {
    const cellTypeData = this.cellTypes[cell.cellType];
    if (!cellTypeData?.loot_after_research) return;
    
    const loot = cellTypeData.loot_after_research;
    
    // Золото
    if (loot.gold && Math.random() * 100 <= loot.gold.chance) {
        const amount = Math.floor(
            Math.random() * (loot.gold.max - loot.gold.min + 1)
        ) + loot.gold.min;
        
        this.mapSystem.currentHero.gold += amount;
        this.showNotification(`💰 Найдено ${amount} золота!`, 'success');
    }
    
    // Предметы
    if (loot.items) {
        Object.entries(loot.items).forEach(([itemType, chance]) => {
            if (Math.random() * 100 <= chance) {
                const item = this.getRandomItemByType(itemType);
                if (item) {
                    this.addItemToHero(item.id);
                    this.showNotification(`🎁 Найдено: ${item.name}!`, 'success');
                }
            }
        });
    }
    
    // Ресурсы
    if (loot.resources) {
        Object.entries(loot.resources).forEach(([resourceType, chance]) => {
            if (Math.random() * 100 <= chance) {
                const resource = this.getRandomResource(resourceType);
                if (resource) {
                    this.addResourceToHero(resource.id, resource.name, 1, resourceType);
                }
            }
        });
    }
}

/**
 * Выдача награды за охоту
 */
giveHuntingReward(cell) {
    const cellTypeData = this.cellTypes[cell.cellType];
    if (!cellTypeData?.huntable_monsters) return;
    
    // Выбор трофея
    const trophyTypes = ['bones', 'leathers', 'hides', 'furs', 'food'];
    const trophyType = trophyTypes[Math.floor(Math.random() * trophyTypes.length)];
    
    const resources = this.resources[trophyType];
    if (resources && resources.length > 0) {
        const resource = resources[Math.floor(Math.random() * resources.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        
        this.addResourceToHero(resource.id, resource.name, quantity, trophyType);
        this.showNotification(`🏹 Охота удалась! Получено: ${resource.name} x${quantity}`, 'success');
    }
}


    
    

 handleTradeAction(row, col) {
    console.log(`🛒 Обработка торговли на клетке [${col},${row}]`);
    
    const cellKey = `${col},${row}`;
    const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
    
    if (!cell) {
        console.error(`❌ Клетка [${col}, ${row}] не найдена`);
        this.showNotification("❌ Клетка не найдена!", 'error');
        return;
    }
    
    // Проверяем, достижима ли клетка (игрок должен быть рядом)
    const isReachable = this.mapSystem.isCellReachable(cell);
    if (!isReachable) {
        console.warn(`⚠️ Клетка [${col}, ${row}] недостижима для торговли`);
        this.showNotification("❌ Подойдите ближе к торговцу!", 'warning');
        return;
    }
    
    // Проверяем, есть ли у клетки данные о магазине
    if (!cell.shopItems || cell.shopItems.length === 0) {
        console.warn("🛒 У торговца нет товаров в shopItems");
        this.showNotification("🛒 У торговца нет товаров для продажи!", 'warning');
        return;
    }
    
    // Используем MapSystem для открытия магазина
    if (this.mapSystem.handleMerchantClick) {
        this.mapSystem.handleMerchantClick(cell);
    } else {
        // Альтернатива через ShopSystem
        const shopSystem = window.game?.systems?.shop;
        if (shopSystem && shopSystem.openShop) {
            shopSystem.openShop(cell);
        } else {
            console.error("❌ ShopSystem не доступна или нет метода openShop");
            this.showNotification("❌ Система магазинов недоступна", 'error');
        }
    }
    
    // ВАЖНОЕ ИСПРАВЛЕНИЕ: НЕ отмечаем клетку как исследованную
    // Клетка остается доступной для повторной торговли
    console.log("✅ Магазин открыт, клетка остается доступной для повторного использования");
    
    // Показываем сообщение об успешном открытии магазина
    this.showNotification("🛒 Магазин открыт!", 'success');
}

    
handleFillFlaskAction(row, col) {
    console.log(`💧 Обработка наполнения фляги на клетке [${col},${row}]`);
    
    const cellKey = `${col},${row}`;
    const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
    
    if (!cell) {
        console.error(`❌ Клетка [${col}, ${row}] не найдена`);
        this.showNotification("❌ Клетка не найдена!", 'error');
        return;
    }
    
    // Проверяем, достижима ли клетка (игрок должен быть рядом)
    const isReachable = this.mapSystem.isCellReachable(cell);
    if (!isReachable) {
        console.warn(`⚠️ Клетка [${col}, ${row}] недостижима для использования воды`);
        this.showNotification("❌ Подойдите ближе к воде!", 'warning');
        return;
    }
    
    // Используем MapSystem для обработки воды
    if (this.mapSystem.handleWaterCell) {
        this.mapSystem.handleWaterCell(cell);
        
        // ВАЖНОЕ ИСПРАВЛЕНИЕ: НЕ отмечаем клетку как исследованную
        console.log("💧 Фляга наполнена, источник воды остается доступным");
        
        // Обновляем интерфейс
        setTimeout(() => {
            if (cell) {
                this.updateCellActionsUI(cell);
            }
        }, 500);
    } else {
        // Ручная обработка
        this.fillFlaskManually(cell);
        
        // ВАЖНОЕ ИСПРАВЛЕНИЕ: НЕ отмечаем клетку как исследованную
        console.log("💧 Фляга наполнена вручную, источник воды остается доступным");
        
        // Обновляем интерфейс
        setTimeout(() => {
            if (cell) {
                this.updateCellActionsUI(cell);
            }
        }, 500);
    }
}

/**
 * Ручное наполнение фляги (если MapSystem не имеет метода)
 */
/**
 * Ручное наполнение фляги (если MapSystem не имеет метода)
 */
fillFlaskManually(cell) {
    if (!this.mapSystem.currentHero) {
        this.showNotification("❌ Нет текущего героя!", 'error');
        return;
    }
    
    const battleSystem = window.game?.systems?.battle;
    if (battleSystem && battleSystem.flask) {
        const oldCharges = battleSystem.flask.currentCharges;
        battleSystem.flask.currentCharges = battleSystem.flask.capacity;
        battleSystem.flask.content = 'water';
        
        if (battleSystem.updateFlaskUI) {
            battleSystem.updateFlaskUI();
        }
        if (battleSystem.updateFlaskChargesDisplay) {
            battleSystem.updateFlaskChargesDisplay();
        }
        
        this.showNotification(`💧 Фляга наполнена водой: ${oldCharges}→${battleSystem.flask.capacity} зарядов!`, 'success');
        
        // Также восстанавливаем здоровье героя
        const heroSystem = window.game?.systems?.hero;
        if (heroSystem) {
            const stats = heroSystem.calculateHeroStats(this.mapSystem.currentHero);
            const oldHealth = this.mapSystem.currentHero.currentHealth;
            this.mapSystem.currentHero.currentHealth = stats.maxHealth;
            
            this.showNotification(`❤️ Здоровье восстановлено: ${oldHealth} → ${stats.maxHealth}`, 'success');
        }
        
        // Сохраняем игру
        if (window.game) {
            window.game.saveGame();
        }
        
        // Отмечаем клетку как исследованную
        if (cell) {
            cell.explored = true;
            this.mapSystem.drawTacticalMap();
        }
    } else {
        this.showNotification("❌ Фляга не найдена в системе боя!", 'error');
    }
}




    
    handleHuntActionSuccess(row, col) {
        console.log(`🏹 Обработка успешной охоты на клетке [${col},${row}]`);
        
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        const cellTypeData = this.cellTypes[this.currentCellType];
        
        if (!cellTypeData) {
            console.error("❌ Нет данных типа клетки");
            return;
        }
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            this.showNotification("❌ Не удалось начать охоту", 'error');
            return;
        }
        
        const monsterLevel = cellTypeData.monster_level || 1;
        const randomMonster = this.getMonsterByLevel(monsterLevel);
        
        if (!randomMonster) {
            console.error(`❌ Не найден монстр уровня ${monsterLevel}`);
            this.showNotification("❌ Не удалось найти дичь для охоты", 'error');
            return;
        }
        
        this.mapSystem.pendingAction = {
            action: 'hunt',
            row: row,
            col: col,
            cellTypeData: cellTypeData,
            wasSuccess: true,
            doubleLoot: true
        };
        
        console.log(`🏹 Начинаем охоту на ${randomMonster.name} (уровень ${monsterLevel}) с двойным лутодропом`);
        
        this.showNotification(`🏹 Вы успешно выследили ${randomMonster.name}! Начинается бой.`, 'success');
        
        battleSystem.startBattleWithMonster(this.mapSystem.currentHero, randomMonster.id, 'hunt');
    }

    handleActionSuccess(action, row, col) {
        const config = this.actionConfigs[action];
        
        const successMessages = {
            'search_treasure': "💰 Найдены ценности!",
            'search_water': "💧 Найдена вода!",
            'search_berries': "🫐 Собраны ягоды!",
            'search_mushrooms': "🍄 Собраны грибы!",
            'search_herbs': "🌿 Собраны травы!",
            'search_ore': "⛏️ Найдена руда!",
            'search_stone': "🪨 Собраны камни!",
            'set_trap': "🪤 Ловушка установлена!",
            'prepare_ambush': "🎯 Позиция для засады подготовлена!",
            'hunt': "🏹 Успешная охота! Начинается бой с монстром.",
            'hunt_caravan': "🏹 Успешная охота на караван!",
            'take_assassination_contract': "🗡️ Контракт на убийство получен!",
            'light_campfire': "🔥 Костёр разожжён!",
            'guard_caravan': "🛡️ Найм на охрану каравана успешен!",
            'gather_wood': "🪵 Дрова собраны!",
            'stealth_movement': "👣 Вы тихо переместились!"
        };
        
        const message = successMessages[action] || "✅ Действие успешно!";
        
        // Охота обрабатывается через модуль, так что здесь не запускаем бой
        if (action === 'hunt') {
            // Этот код не должен выполняться, так как охота обрабатывается через модуль
            console.warn("⚠️ Охота не должна обрабатываться через handleActionSuccess!");
            return;
        }
        
        const resourceMap = {
            'search_treasure': 'treasure',
            'search_water': 'water',
            'search_berries': 'berries',
            'search_mushrooms': 'mushrooms',
            'search_herbs': 'herbs',
            'search_ore': 'ores',
            'search_stone': 'stones',
            'set_trap': 'traps',
            'prepare_ambush': 'ambush',
            'hunt': 'loot',
            'hunt_caravan': 'loot',
            'take_assassination_contract': 'contracts',
            'light_campfire': 'shelter',
            'guard_caravan': 'gold',
            'gather_wood': 'woods'
        };
        
        const resourceType = resourceMap[action];
        if (resourceType) {
            if (resourceType === 'gold') {
                const goldAmount = Math.floor(Math.random() * 50) + 25;
                this.mapSystem.currentHero.gold += goldAmount;
                this.showNotification(`${message} Получено ${goldAmount} золота.`, 'success');
                console.log(`💰 Добавлено золото: ${goldAmount}`);
            } else {
                this.giveRandomResource(resourceType, row, col);
            }
        }
        
        this.showNotification(message, 'success');
        
        console.log(`✅ Клетка [${col},${row}] остаётся доступной для других действий`);
    }

    handleActionFailure(action) {
        const failureMessages = {
            'search_treasure': "❌ Ничего ценного не найдено...",
            'search_water': "❌ Вода оказалась непригодной для питья",
            'search_berries': "❌ Ягоды оказались неспелыми или ядовитыми",
            'search_mushrooms': "❌ Грибы оказались несъедобными",
            'search_herbs': "❌ Травы оказались бесполезными",
            'search_ore': "❌ Руда слишком бедная для добычи",
            'search_stone': "❌ Камни слишком хрупкие",
            'set_trap': "❌ Ловушка сломалась при установке",
            'prepare_ambush': "❌ Позиция оказалась неподходящей",
            'hunt': "❌ Не удалось найти дичь для охоты",
            'hunt_caravan': "❌ Караван оказался слишком хорошо охраняем",
            'take_assassination_contract': "❌ Заказчик передумал или конкуренты перебили цену",
            'light_campfire': "❌ Дрова оказались сырыми, не удалось разжечь огонь",
            'guard_caravan': "❌ Вас не взяли на работу - недостаточно опыта или репутации",
            'gather_wood': "❌ Не найдено подходящих дров",
            'stealth_movement': "❌ Вас заметили во время перемещения!"
        };
        
        this.showNotification(failureMessages[action] || "❌ Действие не увенчалось успехом", 'warning');
    }

    handleActionFailureWithMonster(action, row, col, cellTypeData) {
        console.log(`👹 Действие ${action} провалилось и привлекло внимание монстра!`);
        
        const config = this.actionConfigs[action] || {};
        const monsterLevel = cellTypeData.monster_level || 1;
        
        const adjustedMonsterLevel = Math.min(
            5,
            Math.max(1, Math.floor(monsterLevel * (config.monster_level_multiplier || 1)))
        );
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            this.showNotification("❌ Не удалось начать бой с монстром", 'error');
            return;
        }
        
        const randomMonster = this.getMonsterByLevel(adjustedMonsterLevel);
        
        if (!randomMonster) {
            console.error(`❌ Не найден монстр уровня ${adjustedMonsterLevel}`);
            this.handleActionFailure(action);
            return;
        }
        
        this.mapSystem.pendingAction = {
            action: action,
            row: row,
            col: col,
            cellTypeData: cellTypeData,
            wasFailure: true
        };
        
        console.log(`⚔️ Начинаем бой с ${randomMonster.name} (уровень ${adjustedMonsterLevel})`);
        battleSystem.startBattleWithMonster(this.mapSystem.currentHero, randomMonster.id, 'action_failure');
        
        this.showNotification(`👹 Провал привлёк ${randomMonster.name}! Готовьтесь к бою!`, 'warning');
    }

    getMonsterByLevel(level) {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return null;
        
        const allMonsters = battleSystem.monsters || [];
        if (!allMonsters || allMonsters.length === 0) return null;
        
        const suitableMonsters = allMonsters.filter(monster => {
            const monsterLevel = monster.level || 1;
            return Math.abs(monsterLevel - level) <= 1;
        });
        
        if (suitableMonsters.length > 0) {
            return suitableMonsters[Math.floor(Math.random() * suitableMonsters.length)];
        }
        
        return allMonsters[Math.floor(Math.random() * allMonsters.length)];
    }

    giveRandomResource(resourceType, row, col) {
        const resources = this.resources[resourceType];
        if (!resources || resources.length === 0) {
            console.warn(`⚠️ Ресурсы типа ${resourceType} не найдены`);
            return;
        }
        
        const randomResource = resources[Math.floor(Math.random() * resources.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        
        this.addResourceToHero(randomResource.id, randomResource.name, quantity, resourceType);
    }

    addResourceToHero(resourceId, resourceName, quantity, resourceType) {
        if (!this.mapSystem.currentHero.resources) {
            this.mapSystem.currentHero.resources = {};
        }
        
        if (!this.mapSystem.currentHero.resources[resourceId]) {
            this.mapSystem.currentHero.resources[resourceId] = {
                id: resourceId,
                name: resourceName,
                count: 0,
                type: resourceType
            };
        }
        
        this.mapSystem.currentHero.resources[resourceId].count += quantity;
        
        console.log(`📦 ActionSystem: Добавлен ресурс ${resourceId}: ${quantity} шт. Всего: ${this.mapSystem.currentHero.resources[resourceId].count}`);
        
        this.updateHeroResourcesUI();
        
        if (window.game) {
            window.game.saveGame();
        }
    }

    updateHeroResourcesUI(containerId = 'heroResourcesList') {
        const resourcesList = document.getElementById(containerId);
        if (!resourcesList || !this.mapSystem.currentHero) return;
        
        if (!this.mapSystem.currentHero.resources || Object.keys(this.mapSystem.currentHero.resources).length === 0) {
            resourcesList.innerHTML = '<div class="no-resources" style="text-align: center; color: #94a3b8; padding: 20px;">Ресурсов пока нет</div>';
            return;
        }
        
        let resourcesHTML = '';
        Object.values(this.mapSystem.currentHero.resources).forEach(resource => {
            const icon = this.getResourceIcon(resource.type);
            resourcesHTML += `
                <div class="resource-item" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 6px;
                    margin-bottom: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 18px;">${icon}</span>
                        <span style="color: #cbd5e1; font-size: 14px;">${resource.name}</span>
                    </div>
                    <span style="color: #f59e0b; font-weight: bold; font-size: 16px;">x${resource.count}</span>
                </div>
            `;
        });
        
        resourcesList.innerHTML = resourcesHTML;
    }

    getResourceIcon(resourceType) {
        const icons = {
            'treasure': '💰',
            'water': '💧',
            'berries': '🫐',
            'mushrooms': '🍄',
            'herbs': '🌿',
            'ores': '⛏️',
            'stones': '🪨',
            'traps': '🪤',
            'ambush': '🎯',
            'loot': '📦',
            'contracts': '📜',
            'shelter': '🏕️',
            'food': '🍖',
            'woods': '🪵'
        };
        return icons[resourceType] || '📦';
    }

    // ========== СПЕЦИАЛЬНЫЕ ДЕЙСТВИЯ ==========

    performResourceAction(action, row, col) {
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        if (!cell) return;
        
        const config = this.actionConfigs[action];
        const baseChance = this.getActionChance(action, this.currentCellType);
        
        this.showResourceChanceWindow(action, config, baseChance, row, col);
    }

    showResourceChanceWindow(action, config, baseChance, row, col) {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        const resourceCategory = config.resource_type;
        const resources = this.resources[resourceCategory] || [];
        
        if (resources.length === 0) {
            console.error(`Нет ресурсов для категории: ${resourceCategory}`);
            return;
        }
        
        const resourceChances = this.calculateResourceProbabilities(resources, baseChance);
        
        let html = `
            <div class="resource-gathering">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 15px;">
                    ${config.icon} ${config.name}
                </h3>
                
                <div class="base-chance-info" style="
                    background: rgba(0, 0, 0, 0.4);
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                ">
                    <strong>Общая вероятность успеха:</strong> 
                    <span style="color: ${baseChance >= 70 ? '#44ff44' : baseChance >= 40 ? '#ffaa00' : '#ff4444'}; font-size: 18px;">
                        ${baseChance}%
                    </span>
                </div>
                
                <div class="resource-probabilities">
                    <h4 style="color: #00aaff; margin: 20px 0 10px 0;">Вероятности находок:</h4>
        `;
        
        resourceChances.forEach(({resource, chance}) => {
            html += `
                <div class="resource-chance-item" style="
                    background: rgba(30, 30, 46, 0.7);
                    border-left: 4px solid ${chance >= 30 ? '#44ff44' : chance >= 15 ? '#ffaa00' : '#ff4444'};
                    padding: 10px 15px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div>
                        <span style="font-size: 18px; margin-right: 10px;">${resource.name}</span>
                        <span style="color: #aaa; font-size: 12px;">${resource.description}</span>
                    </div>
                    <div style="
                        font-weight: bold;
                        color: ${chance >= 30 ? '#44ff44' : chance >= 15 ? '#ffaa00' : '#ff4444'};
                        font-size: 16px;
                    ">
                        ${chance}%
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <button class="btn-control" onclick="window.game.systems.action.executeResourceGathering('${action}', ${row}, ${col})"
                            style="padding: 15px 30px; font-size: 16px;">
                        🎲 Попробовать удачу!
                    </button>
                </div>
                
                <div style="margin-top: 20px; color: #888; font-size: 12px; text-align: center;">
                    <em>Примечание: Более дорогие ресурсы имеют меньшую вероятность выпадения</em>
                </div>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
    }



/**
 * Показываем интерфейс для мирной карты
 */
showPeacefulMapUI(cell) {
    console.log("🍻 ActionSystem: Показываем интерфейс для мирной карты", cell);
    
    const actionsContainer = document.getElementById('cellActionsContainer');
    if (!actionsContainer) {
        console.error("❌ Контейнер действий не найден");
        return;
    }
    
    // Проверяем, есть ли специальные действия для этой клетки
    const specialActions = this.getCellSpecificActions(cell);
    const hasSpecialActions = specialActions.length > 0;
    
    console.log(`🔍 Специальные действия для клетки ${cell.type}:`, specialActions);
    
    if (hasSpecialActions) {
        // Показываем специальные действия
        console.log(`✅ Есть специальные действия для ${cell.type}, показываем интерфейс`);
        actionsContainer.innerHTML = this.generateSpecialActionsHTML(cell, specialActions);
        
        // Добавляем стили для сетки
        setTimeout(() => {
            const grid = actionsContainer.querySelector('.special-actions-grid');
            if (grid) {
                grid.style.cssText = `
                    display: grid !important;
                    grid-template-columns: repeat(2, 1fr) !important;
                    gap: 15px !important;
                    margin-bottom: 20px !important;
                `;
            }
            
            // Анимация для карточек
            const actionCards = actionsContainer.querySelectorAll('.special-action-card');
            actionCards.forEach(card => {
                card.style.cssText = `
                    background: linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(20, 25, 45, 0.95)) !important;
                    border: 2px solid #00aaff !important;
                    border-radius: 10px !important;
                    padding: 20px !important;
                    cursor: pointer !important;
                    transition: all 0.3s ease !important;
                    text-align: center !important;
                `;
                
                card.addEventListener('mouseenter', () => {
                    card.style.transform = 'translateY(-5px) scale(1.05)';
                    card.style.boxShadow = '0 15px 30px rgba(0, 170, 255, 0.4)';
                    card.style.borderColor = '#00ffcc';
                });
                
                card.addEventListener('mouseleave', () => {
                    card.style.transform = 'translateY(0) scale(1)';
                    card.style.boxShadow = 'none';
                    card.style.borderColor = '#00aaff';
                });
            });
            
            console.log(`✅ Интерфейс специальных действий отрисован, карточек: ${actionCards.length}`);
            
        }, 50);
    } else {
        // Показываем обычный интерфейс для мирной карты
        console.log(`ℹ️ Нет специальных действий для ${cell.type}, показываем общий интерфейс`);
        actionsContainer.innerHTML = `
            <div class="peaceful-map-ui">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 15px;">
                    🍻 Мирная локация
                </h3>
                
                <div class="peaceful-info" style="
                    background: rgba(0, 170, 255, 0.1);
                    border: 1px solid #00aaff;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 20px;
                    text-align: center;
                ">
                    <p style="color: #00aaff; font-size: 16px; margin-bottom: 10px;">
                        🏰 ${this.mapSystem.currentTacticalMap?.name || 'Таверна'}
                    </p>
                    <p style="color: #ccc; font-size: 14px;">
                        Здесь можно свободно перемещаться.<br>
                        Время не тратится, монстры не нападают.
                    </p>
                </div>
                
                <div class="cell-info" style="
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    padding: 15px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                ">
                    <div class="cell-position" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                    ">
                        <span style="color: #94a3b8;">Позиция:</span>
                        <span style="color: #00ffcc; font-weight: bold;">
                            [${cell.col}, ${cell.row}]
                        </span>
                    </div>
                    
                    ${cell.type === 'player_start' ? `
                        <div class="special-cell" style="
                            color: #f59e0b;
                            margin-top: 10px;
                            padding-top: 10px;
                            border-top: 1px dashed rgba(245, 158, 11, 0.3);
                        ">
                            ⭐ Стартовая позиция
                        </div>
                    ` : ''}
                    
                    ${cell.type === 'exit' ? `
                        <div class="special-cell" style="
                            color: #8b5cf6;
                            margin-top: 10px;
                            padding-top: 10px;
                            border-top: 1px dashed rgba(139, 92, 246, 0.3);
                        ">
                            🚪 Выход из таверны
                        </div>
                    ` : ''}
                </div>
                
                <div class="peaceful-hint" style="
                    margin-top: 20px;
                    padding: 15px;
                    background: rgba(0, 255, 0, 0.05);
                    border: 1px solid rgba(0, 255, 0, 0.2);
                    border-radius: 8px;
                    color: #00ff00;
                    font-size: 12px;
                    text-align: center;
                ">
                    <strong>💡 Подсказка:</strong><br>
                    На мирных картах можно свободно перемещаться.<br>
                    Кликайте на соседние клетки для перемещения.
                </div>
            </div>
        `;
    }
}

/**
 * Генерация HTML для специальных действий
 */
/**
 * Генерация HTML для специальных действий с правильными обработчиками
 */
generateSpecialActionsHTML(cell, specialActions) {
    let html = `
        <div class="special-actions-ui">
            <h3 style="color: #00ffcc; text-align: center; margin-bottom: 15px;">
                ${this.getSpecialActionTitle(cell.type)}
            </h3>
            
            <div class="special-action-info" style="
                background: rgba(0, 170, 255, 0.1);
                border: 1px solid #00aaff;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
                text-align: center;
            ">
                <p style="color: #00aaff; font-size: 16px; margin-bottom: 10px;">
                    ${this.getSpecialActionSubtitle(cell.type)}
                </p>
                <p style="color: #ccc; font-size: 14px;">
                    ${this.getSpecialActionDescription(cell.type)}
                </p>
            </div>
            
            <div class="special-actions-grid" style="
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 15px;
                margin-bottom: 20px;
            ">
    `;
    
    specialActions.forEach(action => {
        const config = this.actionConfigs[action] || {
            icon: '❓',
            name: action.replace(/_/g, ' '),
            description: 'Специальное действие'
        };
        
        // Создаем правильный обработчик onclick
        const onClickCode = `window.game.systems.action.performCellAction('${action}', ${cell.row}, ${cell.col})`;
        
        html += `
            <div class="special-action-card" onclick="${onClickCode}"
                 style="
                    background: linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(20, 25, 45, 0.95));
                    border: 2px solid #00aaff;
                    border-radius: 10px;
                    padding: 20px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-align: center;
                 ">
                <div class="special-action-icon" style="
                    font-size: 32px;
                    margin-bottom: 10px;
                    color: #00ffcc;
                ">
                    ${config.icon}
                </div>
                
                <div class="special-action-name" style="
                    font-size: 16px;
                    font-weight: bold;
                    color: #ffffff;
                    margin-bottom: 8px;
                ">
                    ${config.name}
                </div>
                
                <div class="special-action-description" style="
                    font-size: 12px;
                    color: #b0b0ff;
                    line-height: 1.4;
                ">
                    ${config.description}
                </div>
                
                <div class="special-action-hint" style="
                    margin-top: 10px;
                    font-size: 10px;
                    color: #00ffaa;
                    font-style: italic;
                ">
                    🎯 Шанс успеха: 100%
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
            
            <div class="special-action-footer" style="
                padding: 15px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
                text-align: center;
                color: #94a3b8;
                font-size: 12px;
            ">
                <strong>💡 Подсказка:</strong><br>
                ${this.getSpecialActionHint(cell.type)}
            </div>
        </div>
        
        <script>
            // JavaScript для анимации кнопок
            setTimeout(() => {
                const actionCards = document.querySelectorAll('.special-action-card');
                actionCards.forEach(card => {
                    card.addEventListener('mouseenter', function() {
                        this.style.transform = 'translateY(-5px) scale(1.05)';
                        this.style.boxShadow = '0 15px 30px rgba(0, 170, 255, 0.4)';
                        this.style.borderColor = '#00ffcc';
                    });
                    
                    card.addEventListener('mouseleave', function() {
                        this.style.transform = 'translateY(0) scale(1)';
                        this.style.boxShadow = 'none';
                        this.style.borderColor = '#00aaff';
                    });
                });
            }, 50);
        </script>
    `;
    
    return html;
}

/**
 * Вспомогательные методы для текстов специальных действий
 */
getSpecialActionTitle(cellType) {
    const titles = {
        'merchant': '🛒 Лавка торговца',
        'water': '💧 Источник воды',
        'tavern': '🍻 Таверна',
        'campfire': '🔥 Кострище'
    };
    return titles[cellType] || '⚡ Доступные действия';
}

getSpecialActionSubtitle(cellType) {
    const subtitles = {
        'merchant': 'Выберите действие с торговцем',
        'water': 'Используйте источник воды',
        'tavern': 'Отдохните и соберите информацию',
        'campfire': 'Отдохните у костра'
    };
    return subtitles[cellType] || 'Доступные действия';
}

getSpecialActionDescription(cellType) {
    const descriptions = {
        'merchant': 'Торговец предлагает различные товары по разумным ценам',
        'water': 'Чистая вода для питья и наполнения фляги',
        'tavern': 'Место для отдыха, сбора слухов и восстановления сил',
        'campfire': 'Уютное место для отдыха и приготовления пищи'
    };
    return descriptions[cellType] || 'Выберите действие для выполнения';
}

getSpecialActionHint(cellType) {
    const hints = {
        'merchant': 'Нажмите на действие для открытия магазина',
        'water': 'Нажмите для наполнения фляги и восстановления здоровья',
        'tavern': 'Отдых восстановит здоровье, а слухи могут дать полезную информацию',
        'campfire': 'Отдых у костра восстановит здоровье и силы'
    };
    return hints[cellType] || 'Нажмите на действие для его выполнения';
}


/**
 * Создает специальную панель для специальных клеток
 */
createSpecialCellUI(cell, specialActions) {
    console.log(`🎨 Создаем специальный интерфейс для клетки ${cell.type}`);
    
    let html = `
        <div class="special-cell-ui">
            <div class="special-cell-header" style="
                background: rgba(0, 170, 255, 0.1);
                border: 2px solid #00aaff;
                border-radius: 10px;
                padding: 15px;
                margin-bottom: 20px;
                text-align: center;
            ">
                <h3 style="color: #00ffcc; margin-bottom: 10px;">
                    ${this.getSpecialCellTitle(cell)}
                </h3>
                <p style="color: #ccc; font-size: 14px;">
                    ${this.getSpecialCellDescription(cell)}
                </p>
            </div>
            
            <div class="special-actions-container">
                <h4 style="color: #00aaff; margin-bottom: 15px; text-align: center;">
                    ⚡ Доступные действия
                </h4>
                
                <div class="special-actions-grid" style="
                    display: grid;
                    grid-template-columns: repeat(${Math.min(specialActions.length, 2)}, 1fr);
                    gap: 15px;
                    margin-bottom: 20px;
                ">
    `;
    
    specialActions.forEach(action => {
        const config = this.actionConfigs[action] || {
            icon: '❓',
            name: action.replace(/_/g, ' '),
            description: 'Специальное действие'
        };
        
        html += `
            <div class="special-action-card" 
                 onclick="window.game.systems.action.performCellAction('${action}', ${cell.row}, ${cell.col})"
                 style="
                    background: linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(20, 25, 45, 0.95));
                    border: 2px solid #00aaff;
                    border-radius: 10px;
                    padding: 20px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-align: center;
                 ">
                <div class="special-action-icon" style="
                    font-size: 32px;
                    margin-bottom: 10px;
                    color: #00ffcc;
                ">
                    ${config.icon}
                </div>
                
                <div class="special-action-name" style="
                    font-size: 16px;
                    font-weight: bold;
                    color: #ffffff;
                    margin-bottom: 8px;
                ">
                    ${config.name}
                </div>
                
                <div class="special-action-description" style="
                    font-size: 12px;
                    color: #b0b0ff;
                    line-height: 1.4;
                    margin-bottom: 10px;
                ">
                    ${config.description}
                </div>
                
                <div class="special-action-availability" style="
                    font-size: 11px;
                    color: #00ffaa;
                    font-weight: bold;
                ">
                    ✅ Всегда доступно
                </div>
            </div>
        `;
    });
    
    html += `
                </div>
                
                <div class="special-cell-hint" style="
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    text-align: center;
                    color: #94a3b8;
                    font-size: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                ">
                    <strong>💡 Особенность:</strong> ${this.getSpecialCellHint(cell)}
                </div>
            </div>
        </div>
    `;
    
    return html;
}

/**
 * Вспомогательные методы для специальных клеток
 */
getSpecialCellTitle(cell) {
    switch(cell.type) {
        case 'merchant': return '🛒 Лавка торговца';
        case 'water': return '💧 Источник воды';
        case 'tavern': return '🍻 Таверна';
        case 'campfire': return '🔥 Кострище';
        default: return '⚡ Особое место';
    }
}

getSpecialCellDescription(cell) {
    switch(cell.type) {
        case 'merchant': 
            return cell.shopName ? `"${cell.shopName}" - ${cell.merchantName || 'Торговец'}` : 'Магазин';
        case 'water': return 'Чистая питьевая вода';
        case 'tavern': return 'Место для отдыха и общения';
        case 'campfire': return 'Тепло и уют у огня';
        default: return 'Особое место для взаимодействия';
    }
}

getSpecialCellHint(cell) {
    switch(cell.type) {
        case 'merchant': return 'Можно торговать многократно, запасы пополняются со временем';
        case 'water': return 'Источник воды никогда не иссякает, можно наполнять флягу сколько угодно раз';
        case 'tavern': return 'В таверне можно отдыхать и собирать информацию многократно';
        case 'campfire': return 'У костра можно отдыхать многократно, он не гаснет';
        default: return 'Это место можно использовать многократно';
    }
}

    

    
    calculateResourceProbabilities(resources, baseChance) {
        const sortedResources = [...resources].sort((a, b) => {
            const priceA = a.price || a.value || 0;
            const priceB = b.price || b.value || 0;
            return priceA - priceB;
        });
        
        const totalWeight = sortedResources.reduce((sum, resource, index) => {
            const weight = Math.max(1, 10 - index * 2);
            return sum + weight;
        }, 0);
        
        return sortedResources.map((resource, index) => {
            const weight = Math.max(1, 10 - index * 2);
            const chance = Math.round((weight / totalWeight) * baseChance);
            return {
                resource,
                chance: Math.min(100, Math.max(1, chance))
            };
        });
    }

    executeResourceGathering(action, row, col) {
        const baseChance = this.getActionChance(action, this.currentCellType);
        const roll = Math.random() * 100;
        const success = roll <= baseChance;
        
        if (success) {
            const config = this.actionConfigs[action];
            const resourceCategory = config.resource_type;
            const resources = this.resources[resourceCategory] || [];
            
            if (resources.length > 0) {
                const resourceChances = this.calculateResourceProbabilities(resources, baseChance);
                
                let totalChance = 0;
                const randomValue = Math.random() * 100;
                
                for (const {resource, chance} of resourceChances) {
                    totalChance += chance;
                    if (randomValue <= totalChance) {
                        this.addResourceToHero(resource.id, resource.name, 1, resourceCategory);
                        this.showNotification(`✅ ${config.name} успешно! Найден: ${resource.name}`, 'success');
                        break;
                    }
                }
            } else {
                this.handleActionSuccess(action, row, col);
            }
        } else {
            this.handleActionFailure(action);
        }
        
        setTimeout(() => {
            const cellKey = `${col},${row}`;
            const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
            if (cell) {
                this.updateCellActionsUI(cell);
            }
        }, 1000);
    }

    handleStealthMovement(cell) {
        const neighbors = this.mapSystem.getHexNeighbors(this.mapSystem.playerTacticalPosition.y, this.mapSystem.playerTacticalPosition.x);
        
        const availableCells = neighbors.filter(neighbor => {
            const neighborCell = this.mapSystem.currentTacticalMap.cells[`${neighbor.col},${neighbor.row}`];
            return neighborCell && neighborCell.passable !== false;
        });
        
        if (availableCells.length === 0) {
            this.showNotification("❌ Нет доступных клеток для перемещения", 'warning');
            return;
        }
        
        this.showStealthMovementSelection(availableCells, cell);
    }

    showStealthMovementSelection(availableCells, currentCell) {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        const baseChance = this.getActionChance('stealth_movement', this.currentCellType);
        
        let html = `
            <div class="stealth-movement">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 15px;">
                    👣 Скрытное перемещение
                </h3>
                
                <div class="base-chance-info" style="
                    background: rgba(0, 0, 0, 0.4);
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                ">
                    <strong>Базовая вероятность успеха:</strong> 
                    <span style="color: ${baseChance >= 70 ? '#44ff44' : baseChance >= 40 ? '#ffaa00' : '#ff4444'}; font-size: 18px;">
                        ${baseChance}%
                    </span>
                    <p style="margin-top: 10px; font-size: 12px; color: #aaa;">
                        Вероятность тихо переместиться без риска боя
                    </p>
                </div>
                
                <div class="available-targets">
                    <h4 style="color: #00aaff; margin: 20px 0 10px 0;">Доступные направления:</h4>
        `;
        
        availableCells.forEach(targetCell => {
            const neighborHex = this.mapSystem.currentTacticalMap.cells[`${targetCell.col},${targetCell.row}`];
            if (!neighborHex) return;
            
            html += `
                <div class="movement-target" onclick="window.game.systems.action.attemptStealthMovement(${targetCell.row}, ${targetCell.col})">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-size: 16px;">Направление: ${targetCell.direction}</span>
                            <div style="color: #aaa; font-size: 12px;">
                                Клетка [${targetCell.col}, ${targetCell.row}]
                            </div>
                        </div>
                        <div style="
                            font-weight: bold;
                            color: ${baseChance >= 70 ? '#44ff44' : baseChance >= 40 ? '#ffaa00' : '#ff4444'};
                        ">
                            ${baseChance}%
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <button class="btn-control" onclick="window.game.systems.action.updateCellActionsUI(this.selectedCell)" 
                        style="margin-top: 20px; width: 100%;">
                    ↩️ Отмена
                </button>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
        
        setTimeout(() => {
            const items = actionsContainer.querySelectorAll('.movement-target');
            items.forEach(item => {
                item.style.cssText = `
                    background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9));
                    border: 1px solid #00aaff;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                `;
                
                item.onmouseenter = () => {
                    item.style.transform = 'translateY(-2px)';
                    item.style.boxShadow = '0 5px 15px rgba(0, 170, 255, 0.3)';
                };
                item.onmouseleave = () => {
                    item.style.transform = 'translateY(0)';
                    item.style.boxShadow = 'none';
                };
            });
        }, 50);
    }

    attemptStealthMovement(targetRow, targetCol) {
        const baseChance = this.getActionChance('stealth_movement', this.currentCellType);
        const roll = Math.random() * 100;
        const success = roll <= baseChance;
        
        if (success) {
            this.mapSystem.handlePeacefulMovement(targetCol, targetRow, null);
            this.showNotification("👣 Вы тихо переместились на соседнюю клетку", 'success');
        } else {
            this.showNotification("🚨 Вас заметили! Готовьтесь к бою!", 'warning');
            
            const battleSystem = window.game?.systems?.battle;
            if (battleSystem) {
                this.mapSystem.pendingMovement = { x: targetCol, y: targetRow };
                battleSystem.startBattleWithMonster(this.mapSystem.currentHero, null, 'movement');
            }
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    showNotification(message, type = 'info') {
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    markCellAsExplored(row, col) {
        const cellKey = `${col},${row}`;
        if (this.mapSystem.currentTacticalMap && this.mapSystem.currentTacticalMap.cells[cellKey]) {
            this.mapSystem.currentTacticalMap.cells[cellKey].explored = true;
            this.mapSystem.currentTacticalMap.cells[cellKey].hasAction = false;
            this.mapSystem.currentTacticalMap.cells[cellKey].isSelected = false;
            
            this.mapSystem.drawTacticalMap();
            this.clearCellActionsUI();
        }
    }

    completeCellExploration(row, col) {
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (cell) {
            cell.explored = true;
            cell.hasAction = false;
            
            this.showNotification("✅ Вы полностью исследовали эту местность", 'success');
            this.mapSystem.drawTacticalMap();
            this.clearCellActionsUI();
        }
    }

    clearCellActionsUI() {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (actionsContainer) {
            actionsContainer.innerHTML = '<div class="actions-placeholder">Выберите клетку для просмотра доступных действий</div>';
        }
    }

    highlightSelectedCell(cell) {
        if (!this.mapSystem.currentTacticalMap) return;
        
        Object.values(this.mapSystem.currentTacticalMap.cells).forEach(c => {
            c.isSelected = false;
        });
        
        cell.isSelected = true;
        this.mapSystem.drawTacticalMap();
    }
}

// Глобальная регистрация
if (typeof window !== 'undefined') {
    window.ActionSystem = ActionSystem;
    console.log("📦 ActionSystem зарегистрирован глобально");
}
