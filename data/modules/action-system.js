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
        // Проверяем входные параметры
        if (!mapSystem) {
            console.error("❌ ActionSystem: mapSystem не передан!");
            throw new Error("ActionSystem требует mapSystem");
        }
        
        this.mapSystem = mapSystem;
        
        // ========== КОНФИГУРАЦИЯ ДЕЙСТВИЙ ==========
        this.cellTypes = {};
        this.resources = {};
        this.currentCellType = null;
        this.selectedCell = null;
        this.currentCellActions = [];
        
        // Модули действий (динамически загружаются)
        this.actionModules = {};
        
        // Базовые конфигурации для всех действий
        this.actionConfigs = {
            'search_treasure': {
                icon: '💰',
                name: 'Искать сокровища',
                description: 'Тщательно обыскать местность в поисках ценностей',
                class: 'action-treasure',
                resource_type: 'treasure',
                baseChance: 25
            },
            'search_water': {
                icon: '💧',
                name: 'Искать воду',
                description: 'Найти источники воды или следы влаги',
                class: 'action-water',
                resource_type: 'water',
                baseChance: 30
            },
            'search_berries': {
                icon: '🫐',
                name: 'Собирать ягоды',
                description: 'Собрать съедобные ягоды и плоды',
                class: 'action-berries',
                resource_type: 'berries',
                baseChance: 35
            },
            'search_mushrooms': {
                icon: '🍄',
                name: 'Собирать грибы',
                description: 'Найти и собрать грибы',
                class: 'action-mushrooms',
                resource_type: 'mushrooms',
                baseChance: 30
            },
            'search_herbs': {
                icon: '🌿',
                name: 'Собирать травы',
                description: 'Найти лекарственные и полезные растения',
                class: 'action-herbs',
                resource_type: 'herbs',
                baseChance: 40
            },
            'search_ore': {
                icon: '⛏️',
                name: 'Искать руду',
                description: 'Поиск металлических руд и минералов',
                class: 'action-ore',
                resource_type: 'ores',
                baseChance: 20
            },
            'search_stone': {
                icon: '🪨',
                name: 'Собирать камни',
                description: 'Найти строительные и полезные камни',
                class: 'action-stone',
                resource_type: 'stones',
                baseChance: 25
            },
            'set_trap': {
                icon: '🪤',
                name: 'Установить ловушку',
                description: 'Создать ловушку для мелкой дичи',
                class: 'action-trap',
                resource_type: 'traps',
                baseChance: 50
            },
            'prepare_ambush': {
                icon: '🎯',
                name: 'Подготовить засаду',
                description: 'Подготовить позицию для неожиданной атаки',
                class: 'action-ambush',
                resource_type: 'ambush',
                baseChance: 45
            },
            'hunt': {
                icon: '🏹',
                name: 'Охотиться',
                description: 'Выследить и добыть дичь. Приводит к бою с монстром',
                class: 'action-hunt',
                resource_type: 'loot',
                baseChance: 70,
                triggers_monster: true,
                monster_level_multiplier: 1.0,
                always_monster: true,
                isComplexAction: true
            },
            'hunt_caravan': {
                icon: '🏹',
                name: 'Охотиться на караван',
                description: 'Подкараулить торговый караван для нападения',
                class: 'action-hunt',
                resource_type: 'loot',
                baseChance: 30,
                triggers_monster: true,
                monster_level_multiplier: 1.5
            },
            'take_assassination_contract': {
                icon: '🗡️',
                name: 'Взять контракт на убийство',
                description: 'Получить задание на устранение цели',
                class: 'action-assassination',
                resource_type: 'contracts',
                baseChance: 20,
                triggers_monster: true,
                monster_level_multiplier: 2.0
            },
            'light_campfire': {
                icon: '🔥',
                name: 'Разжечь костёр',
                description: 'Создать укрытие и место для отдыха',
                class: 'action-campfire',
                resource_type: 'shelter',
                baseChance: 80
            },
            'guard_caravan': {
                icon: '🛡️',
                name: 'Охранять караван',
                description: 'Наняться для защиты торгового каравана',
                class: 'action-guard',
                resource_type: 'gold',
                baseChance: 40,
                triggers_monster: true,
                monster_level_multiplier: 1.2
            },
            'gather_wood': {
                icon: '🪵',
                name: 'Собирать дрова',
                description: 'Найти и собрать сухие ветки для костра и строительства',
                class: 'action-wood',
                resource_type: 'woods',
                baseChance: 60
            },
            'stealth_movement': {
                icon: '👣',
                name: 'Скрытное перемещение',
                description: 'Тихо и незаметно передвинуться на соседнюю клетку без риска боя',
                class: 'action-stealth',
                baseChance: 85,
                requires_player_here: true,
                special: 'movement'
            }
        };
        
        this.locationImageCache = new Map();
        
        console.log("✅ ActionSystem инициализирован");
    }

    // ========== ИНИЦИАЛИЗАЦИЯ И ЗАГРУЗКА ДАННЫХ ==========

    async init() {
        try {
            console.log("🔄 ActionSystem: Запуск инициализации...");
            
            // Загружаем данные клеток и ресурсов
            await this.loadCellData();
            
            // Загружаем модули действий
            await this.loadActionModules();
            
            console.log("✅ ActionSystem полностью инициализирован");
            return true;
        } catch (error) {
            console.error("❌ Ошибка инициализации ActionSystem:", error);
            return false;
        }
    }

    async loadCellData() {
        try {
            console.log("📥 ActionSystem: Загружаем данные типов клеток и ресурсов...");
            
            // Создаем базовые данные ПЕРЕД попыткой загрузки
            this.createDefaultResources();
            this.createDefaultCellTypes();
            
            // Теперь пробуем загрузить из файлов
            try {
                const [cellTypesResponse, resourcesResponse] = await Promise.allSettled([
                    fetch('data/cell_types.json'),
                    fetch('data/resources.json')
                ]);
                
                // Обрабатываем типы клеток
                if (cellTypesResponse.status === 'fulfilled' && cellTypesResponse.value.ok) {
                    const cellData = await cellTypesResponse.value.json();
                    if (cellData && cellData.cell_types) {
                        this.cellTypes = cellData.cell_types;
                        console.log(`✅ Загружено типов клеток из файла: ${Object.keys(this.cellTypes).length}`);
                    }
                } else {
                    console.warn("⚠️ cell_types.json не загружен, используем базовые типы");
                }
                
                // Обрабатываем ресурсы
                if (resourcesResponse.status === 'fulfilled' && resourcesResponse.value.ok) {
                    const resourcesData = await resourcesResponse.value.json();
                    if (resourcesData && typeof resourcesData === 'object') {
                        // Объединяем с базовыми ресурсами
                        this.resources = { ...this.resources, ...resourcesData };
                        console.log(`✅ Загружено ресурсов из файла: ${Object.keys(resourcesData).length} категорий`);
                    }
                } else {
                    console.warn("⚠️ resources.json не загружен, используем базовые ресурсы");
                }
                
            } catch (fetchError) {
                console.warn("⚠️ Ошибка при загрузке файлов:", fetchError.message);
                // Продолжаем с базовыми данными
            }
            
            console.log(`📊 Итоговые данные: ${Object.keys(this.cellTypes).length} типов клеток, ${Object.keys(this.resources).length} категорий ресурсов`);
            return true;
            
        } catch (error) {
            console.error("❌ Критическая ошибка загрузки данных:", error);
            // Гарантируем наличие базовых данных
            this.createDefaultResources();
            this.createDefaultCellTypes();
            return false;
        }
    }

    async loadActionModules() {
        console.log("🔄 ActionSystem: Загрузка модулей действий...");
        
        try {
            // Загружаем модуль охоты
            await this.loadHuntModule();
            
            console.log(`✅ Загружено модулей действий: ${Object.keys(this.actionModules).length}`);
            return true;
        } catch (error) {
            console.error("❌ Ошибка загрузки модулей действий:", error);
            return false;
        }
    }

    async loadHuntModule() {
        console.log("🔄 ActionSystem: Загрузка модуля охоты...");
        
        try {
            // Проверяем, есть ли уже глобальный класс HuntAction
            if (window.HuntAction) {
                console.log("✅ HuntAction уже загружен глобально");
                this.actionModules['hunt'] = new window.HuntAction(this);
                return true;
            }
            
            // Пробуем несколько путей к файлу
            const paths = [
                'data/actions/hunt-action.js',
                'hunt-action.js',
                './hunt-action.js'
            ];
            
            for (const path of paths) {
                try {
                    console.log(`   Пробуем путь: ${path}`);
                    const response = await fetch(path);
                    if (response.ok) {
                        const moduleCode = await response.text();
                        
                        // Проверяем что файл содержит нужный класс
                        if (moduleCode.includes('class HuntAction')) {
                            console.log(`✅ Файл найден: ${path}`);
                            
                            // Выполняем код модуля
                            const script = document.createElement('script');
                            script.type = 'text/javascript';
                            script.textContent = moduleCode;
                            document.head.appendChild(script);
                            
                            // Ждем для регистрации класса
                            await new Promise(resolve => setTimeout(resolve, 100));
                            
                            if (window.HuntAction) {
                                this.actionModules['hunt'] = new window.HuntAction(this);
                                console.log("✅ Модуль охоты загружен из файла");
                                return true;
                            }
                        }
                    }
                } catch (error) {
                    console.log(`   ❌ Не удалось загрузить с ${path}: ${error.message}`);
                }
            }
            
            throw new Error("Не удалось загрузить модуль охоты ни с одного пути");
            
        } catch (error) {
            console.error(`❌ Не удалось загрузить модуль охоты: ${error.message}`);
            
            // Создаем минимальную заглушку
            this.createHuntModuleStub();
            return false;
        }
    }

    createHuntModuleStub() {
        console.log("🔄 ActionSystem: Создаем заглушку модуля охоты");
        
        this.actionModules['hunt'] = {
            execute: (row, col) => {
                console.log(`🏹 Заглушка: Охота на [${col},${row}]`);
                this.showNotification("⚠️ Модуль охоты временно недоступен", 'warning');
                
                // Простая логика для тестирования
                const battleSystem = window.game?.systems?.battle;
                if (battleSystem) {
                    const hero = this.mapSystem?.currentHero;
                    if (hero) {
                        const randomMonster = battleSystem.getRandomMonsterForMovement();
                        if (randomMonster) {
                            this.mapSystem.pendingAction = {
                                action: 'hunt',
                                row: row,
                                col: col,
                                wasSuccess: true,
                                doubleLoot: true
                            };
                            battleSystem.startBattleWithSpecificMonster(hero, randomMonster, 'hunt');
                        }
                    }
                }
            },
            completeHuntAfterBattle: (victory, escape, doubleLoot) => {
                console.log(`🏹 Заглушка: обработка результата охоты`);
                if (this.mapSystem && this.mapSystem.completeMovementAfterBattle) {
                    this.mapSystem.completeMovementAfterBattle(victory, escape, 'hunt', doubleLoot);
                }
            }
        };
        
        console.log("✅ Заглушка модуля охоты создана");
    }

    // ========== БАЗОВЫЕ ДАННЫЕ (должны быть определены ПЕРЕД любыми вызовами) ==========

    createDefaultResources() {
        console.log("📦 ActionSystem: Создаем базовые ресурсы...");
        this.resources = {
            treasure: [
                { id: 'gold_coins', name: '💰 Золотые монеты', type: 'treasure' }
            ],
            water: [
                { id: 'fresh_water', name: '💧 Пресная вода', type: 'water' }
            ],
            berries: [
                { id: 'wild_berries', name: '🫐 Дикие ягоды', type: 'berries' }
            ],
            mushrooms: [
                { id: 'common_mushrooms', name: '🍄 Обычные грибы', type: 'mushrooms' }
            ],
            herbs: [
                { id: 'healing_herbs', name: '🌿 Целебные травы', type: 'herbs' }
            ],
            ores: [
                { id: 'iron_ore', name: '⛏️ Железная руда', type: 'ores' }
            ],
            stones: [
                { id: 'common_stone', name: '🪨 Обычный камень', type: 'stones' }
            ],
            traps: [
                { id: 'snare_trap', name: '🪤 Петля-ловушка', type: 'traps' }
            ],
            ambush: [
                { id: 'ambush_position', name: '🎯 Позиция для засады', type: 'ambush' }
            ],
            // Охотничьи ресурсы (ВАЖНО: должны быть для модуля охоты)
            bones: [
                { id: 'small_bone', name: '🦴 Маленькая кость', type: 'bones', description: 'Кость мелкого животного', price: 5 }
            ],
            leathers: [
                { id: 'thin_leather', name: '🐂 Тонкая кожа', type: 'leathers', description: 'Кожа мелкого животного', price: 10 }
            ],
            hides: [
                { id: 'thin_hide', name: '🐇 Тонкая шкура', type: 'hides', description: 'Шкурка кролика', price: 8 }
            ],
            furs: [
                { id: 'hare_fur', name: '🐰 Заячий мех', type: 'furs', description: 'Мягкий мех зайца', price: 12 }
            ],
            loot: [
                { id: 'basic_loot', name: '📦 Обычная добыча', type: 'loot', description: 'Обычные охотничьи трофеи' }
            ],
            contracts: [
                { id: 'basic_contract', name: '📜 Простой контракт', type: 'contracts' }
            ],
            shelter: [
                { id: 'basic_camp', name: '🏕️ Простой лагерь', type: 'shelter' }
            ],
            woods: [
                { id: 'twigs', name: '🌿 Веточки', type: 'woods' }
            ],
            gold: []
        };
        console.log("✅ Базовые ресурсы созданы");
    }

    createDefaultCellTypes() {
        console.log("🗺️ ActionSystem: Создаем базовые типы клеток...");
        this.cellTypes = {
            'grave': {
                name: "Старая каменная гробница",
                description: "Массивная каменная плита с высеченными рунами.",
                suggestion: "Это захоронение знатного воина или мага.",
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
                special_notes: "Высокий шанс найти сокровища.",
                failure_monster_chance: 70,
                monster_level: 2
            },
            'forest': {
                name: "Густой лес",
                description: "Плотный лес с высокими деревьями и густым подлеском.",
                suggestion: "Хорошее место для охоты и сбора ресурсов.",
                icon: '🌲',
                action_chances: {
                    search_treasure: 20,
                    search_water: 40,
                    search_berries: 60,
                    search_mushrooms: 50,
                    search_herbs: 45,
                    search_ore: 10,
                    search_stone: 30,
                    set_trap: 70,
                    prepare_ambush: 65,
                    hunt: 80,
                    hunt_caravan: 20,
                    take_assassination_contract: 15,
                    light_campfire: 85,
                    guard_caravan: 25,
                    gather_wood: 75,
                    stealth_movement: 85
                },
                failure_monster_chance: 60,
                monster_level: 2
            }
        };
        console.log("✅ Базовые типы клеток созданы");
    }

    // ========== РЕГИСТРАЦИЯ МОДУЛЕЙ ==========

    registerModule(moduleName, moduleInstance) {
        try {
            if (!moduleName || !moduleInstance) {
                console.error("❌ ActionSystem.registerModule: неверные параметры");
                return;
            }
            
            this.actionModules[moduleName] = moduleInstance;
            console.log(`✅ Модуль ${moduleName} зарегистрирован в ActionSystem`);
            
            // Обновляем конфигурацию действия, если модуль предоставляет свою
            if (moduleInstance.config && moduleInstance.config.id) {
                const actionId = moduleInstance.config.id;
                if (this.actionConfigs[actionId]) {
                    this.actionConfigs[actionId] = {
                        ...this.actionConfigs[actionId],
                        ...moduleInstance.config,
                        isComplexAction: true
                    };
                }
            }
        } catch (error) {
            console.error("❌ Ошибка регистрации модуля:", error);
        }
    }

    // ========== УПРАВЛЕНИЕ ДЕЙСТВИЯМИ НА КАРТЕ ==========

    updateCellActionsUI(cell) {
        try {
            console.log("=== ActionSystem.updateCellActionsUI ===");
            
            if (!cell) {
                console.error("❌ Клетка не передана");
                return;
            }
            
            const mapContent = document.querySelector('.tactical-map-content-with-actions');
            if (!mapContent) {
                console.error("❌ Основной контейнер карты не найден!");
                return;
            }
            
            // Создаем контейнеры если их нет
            this.createActionPanels(mapContent);
            
            const actionsContainer = document.getElementById('cellActionsContainer');
            if (!actionsContainer) {
                console.error("❌ Контейнер действий не найден!");
                return;
            }
            
            // Определяем тип клетки
            this.selectedCell = cell;
            this.currentCellType = this.determineCellType(cell);
            
            if (!this.currentCellType || !this.cellTypes[this.currentCellType]) {
                console.error(`❌ Не удалось определить тип клетки для:`, cell);
                actionsContainer.innerHTML = `<div class="cell-error" style="color: red; padding: 20px;">Ошибка определения типа клетки</div>`;
                return;
            }
            
            const cellTypeData = this.cellTypes[this.currentCellType];
            
            // Проверяем состояние клетки
            const isCurrentPosition = this.mapSystem && this.mapSystem.playerTacticalPosition && 
                                     (cell.col === this.mapSystem.playerTacticalPosition.x && 
                                      cell.row === this.mapSystem.playerTacticalPosition.y);
            const isReachable = this.mapSystem && this.mapSystem.isCellReachable ? 
                               this.mapSystem.isCellReachable(cell) : false;
            const isExplored = cell.explored === true;
            
            // Получаем доступные действия для этого типа клетки
            this.currentCellActions = this.getAvailableActionsForCellType(this.currentCellType);
            
            // Создаем интерфейс действий
            this.createActionsInterface(actionsContainer, cell, cellTypeData, isCurrentPosition, isReachable, isExplored);
            
            console.log(`✅ Панель действий обновлена для клетки [${cell.col},${cell.row}]`);
            
        } catch (error) {
            console.error("❌ Критическая ошибка в updateCellActionsUI:", error);
        }
    }

    createActionPanels(mapContent) {
        try {
            // Левый контейнер (информация о клетке)
            let leftPanel = document.querySelector('.cell-info-left-panel');
            if (!leftPanel) {
                leftPanel = document.createElement('div');
                leftPanel.className = 'cell-info-left-panel';
                leftPanel.id = 'cellInfoLeftPanel';
                mapContent.insertBefore(leftPanel, mapContent.firstChild);
            }
            
            // Правый контейнер (действия)
            let actionsContainer = document.getElementById('cellActionsContainer');
            if (!actionsContainer) {
                actionsContainer = document.createElement('div');
                actionsContainer.id = 'cellActionsContainer';
                actionsContainer.className = 'cell-actions-container';
                
                let actionsPanel = document.querySelector('.cell-actions-panel');
                if (!actionsPanel) {
                    actionsPanel = document.createElement('div');
                    actionsPanel.className = 'cell-actions-panel';
                    mapContent.appendChild(actionsPanel);
                }
                actionsPanel.innerHTML = '';
                actionsPanel.appendChild(actionsContainer);
            }
            
            // Устанавливаем стили
            const panelWidth = 1150;
            const panelHeight = 600;
            
            leftPanel.style.cssText = `
                display: flex !important;
                flex-direction: column !important;
                width: ${panelWidth}px !important;
                height: ${panelHeight}px !important;
                background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
                border: 2px solid #00ffcc !important;
                border-radius: 10px !important;
                padding: 20px !important;
                margin-right: 20px !important;
                box-shadow: 0 0 20px rgba(0, 255, 204, 0.4) !important;
                overflow-y: auto !important;
            `;
            
            actionsContainer.style.cssText = `
                display: flex !important;
                flex-direction: column !important;
                width: ${panelWidth}px !important;
                height: ${panelHeight}px !important;
                background: linear-gradient(135deg, #16213e, #1a1a2e) !important;
                border: 2px solid #00ffff !important;
                border-radius: 10px !important;
                padding: 20px !important;
                margin-left: 20px !important;
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.4) !important;
                overflow-y: auto !important;
            `;
            
        } catch (error) {
            console.error("❌ Ошибка создания панелей:", error);
        }
    }

    createActionsInterface(container, cell, cellTypeData, isCurrentPosition, isReachable, isExplored) {
        try {
            let html = '';
            
            html += `
                <div class="actions-section">
                    <h3 style="color: #00ffff; margin-bottom: 15px; text-align: center;">
                        ⚔️ Доступные действия
                    </h3>
            `;
            
            if (!isExplored && cell.hasAction !== false) {
                if (this.currentCellActions && this.currentCellActions.length > 0) {
                    html += this.createActionButtonsHTML(cell, isCurrentPosition, isReachable);
                    
                    html += `
                        <div class="cell-completion-controls" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #475569;">
                            <button class="btn-control complete-exploration-btn" 
                                    onclick="game.systems.action.completeCellExploration(${cell.row}, ${cell.col})"
                                    style="width: 100%; padding: 12px; background: linear-gradient(135deg, #10b981, #059669);">
                                ✓ Завершить исследование
                            </button>
                            <p class="hint" style="text-align: center; margin-top: 10px; color: #94a3b8; font-size: 12px;">
                                После завершения исследования вы не сможете выполнять здесь действия
                            </p>
                        </div>
                    `;
                } else {
                    html += this.createNoActionsHTML();
                }
            } else if (isExplored) {
                html += this.createExploredCellHTML();
            } else if (cell.hasAction === false) {
                html += this.createNoActionsHTML();
            }
            
            html += `</div>`;
            
            html += `
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
            
            container.innerHTML = html;
            
            // Применяем стили к кнопкам действий
            setTimeout(() => {
                this.styleActionButtons();
            }, 50);
            
        } catch (error) {
            console.error("❌ Ошибка создания интерфейса действий:", error);
            container.innerHTML = `<div style="color: red; padding: 20px;">Ошибка создания интерфейса: ${error.message}</div>`;
        }
    }

    createActionButtonsHTML(cell, isCurrentPosition, isReachable) {
        try {
            if (!this.currentCellActions || this.currentCellActions.length === 0) {
                return '<div style="color: #ffaa00; text-align: center; padding: 20px;">Нет доступных действий</div>';
            }
            
            let html = `<div class="actions-grid" style="
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 10px;
                margin-bottom: 20px;
            ">`;
            
            this.currentCellActions.forEach(action => {
                const config = this.actionConfigs[action] || {
                    icon: '❓',
                    name: action.replace(/_/g, ' '),
                    description: 'Неизвестное действие',
                    baseChance: 25
                };
                
                const chance = this.getActionChance(action, this.currentCellType);
                const chancePercent = Math.round(chance);
                
                let chanceColor = '#ff4444';
                if (chance >= 40) chanceColor = '#ffaa00';
                if (chance >= 70) chanceColor = '#44ff44';
                if (chance >= 90) chanceColor = '#00ffaa';
                
                let isDisabled = false;
                let disabledReason = '';
                
                if (!isReachable) {
                    isDisabled = true;
                    disabledReason = 'Клетка недоступна';
                } else if (!isCurrentPosition && config.requires_player_here) {
                    isDisabled = true;
                    disabledReason = 'Нужно быть в клетке';
                }
                
                // Особый обработчик для сложных действий (как охота)
                let onClickHandler = '';
                if (!isDisabled) {
                    if (config.isComplexAction && this.actionModules[action]) {
                        // Сложное действие с собственным модулем
                        onClickHandler = `onclick="window.game.systems.action.executeComplexAction('${action}', ${cell.row}, ${cell.col})"`;
                    } else {
                        // Простое действие
                        onClickHandler = `onclick="window.game.systems.action.performSimpleAction('${action}', ${cell.row}, ${cell.col})"`;
                    }
                }
                
                html += `
                    <div class="action-card" ${onClickHandler}
                         style="
                            background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9));
                            border: 1px solid ${isDisabled ? '#666' : '#00aaff'};
                            border-radius: 8px;
                            padding: 12px;
                            display: flex;
                            flex-direction: column;
                            height: 100%;
                            transition: all 0.2s ease;
                            ${!isDisabled ? 'cursor: pointer;' : 'opacity: 0.6;'}
                         ">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <div class="action-icon" style="
                                font-size: 20px;
                                margin-right: 10px;
                                color: ${chanceColor};
                                flex-shrink: 0;
                            ">
                                ${config.icon}
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
                            ${config.triggers_monster ? `<br><small style="color: #ff4444;">⚠️ Может вызвать монстра!</small>` : ''}
                            ${config.always_monster ? `<br><small style="color: #ffaa00;">🏹 Всегда приводит к бою</small>` : ''}
                        </div>
                        
                        <div class="action-chance-display" style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            font-size: 11px;
                            margin-top: auto;
                        ">
                            <span style="color: #aaa;">Шанс:</span>
                            <div style="display: flex; align-items: center;">
                                <div style="
                                    width: 40px;
                                    height: 6px;
                                    background: #333;
                                    border-radius: 3px;
                                    margin-right: 8px;
                                    overflow: hidden;
                                ">
                                    <div style="
                                        width: ${chancePercent}%;
                                        height: 100%;
                                        background: ${chanceColor};
                                        border-radius: 3px;
                                    "></div>
                                </div>
                                <span style="color: ${chanceColor}; font-weight: bold;">
                                    ${chancePercent}%
                                </span>
                            </div>
                        </div>
                        
                        ${isDisabled ? `
                            <div style="
                                font-size: 10px;
                                color: #ff6666;
                                margin-top: 8px;
                                padding-top: 8px;
                                border-top: 1px dashed #444;
                            ">
                                ${disabledReason}
                            </div>
                        ` : ''}
                    </div>
                `;
            });
            
            html += `</div>`;
            return html;
            
        } catch (error) {
            console.error("❌ Ошибка создания кнопок действий:", error);
            return `<div style="color: red; padding: 10px;">Ошибка: ${error.message}</div>`;
        }
    }

    styleActionButtons() {
        try {
            const actionCards = document.querySelectorAll('.action-card:not([style*="opacity: 0.6"])');
            actionCards.forEach(card => {
                card.onmouseenter = () => {
                    card.style.transform = 'translateY(-3px) scale(1.02)';
                    card.style.boxShadow = '0 8px 20px rgba(0, 170, 255, 0.4)';
                };
                card.onmouseleave = () => {
                    card.style.transform = 'translateY(0) scale(1)';
                    card.style.boxShadow = 'none';
                };
            });
        } catch (error) {
            console.error("❌ Ошибка стилизации кнопок:", error);
        }
    }

    // ========== ВЫПОЛНЕНИЕ ДЕЙСТВИЙ ==========

    executeComplexAction(action, row, col) {
        try {
            console.log(`🎯 ActionSystem.executeComplexAction: ${action} на [${col},${row}]`);
            
            const module = this.actionModules[action];
            if (!module) {
                console.error(`❌ Модуль для действия ${action} не загружен`);
                this.showNotification(`❌ Система действия "${action}" не доступна!`, 'error');
                return;
            }
            
            if (typeof module.execute !== 'function') {
                console.error(`❌ Модуль ${action} не имеет метода execute`);
                this.showNotification(`❌ Ошибка модуля действия!`, 'error');
                return;
            }
            
            // Проверяем доступность клетки
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
            
            if (!this.mapSystem.isCellReachable(cell)) {
                this.showNotification("❌ Клетка недостижима!", 'warning');
                return;
            }
            
            // Вызываем метод модуля
            module.execute(row, col);
            
        } catch (error) {
            console.error(`❌ Ошибка выполнения действия ${action}:`, error);
            this.showNotification(`❌ Ошибка выполнения действия!`, 'error');
        }
    }

    performSimpleAction(action, row, col) {
        try {
            console.log(`🎯 ActionSystem.performSimpleAction: ${action} на [${col},${row}]`);
            
            const config = this.actionConfigs[action];
            const chance = this.getActionChance(action, this.currentCellType);
            
            // Показываем обработку
            this.showActionProcessing(action, config, chance, row, col);
            
            // Имитируем выполнение
            setTimeout(() => {
                try {
                    const roll = Math.random() * 100;
                    const success = roll <= chance;
                    
                    console.log(`🎲 Бросок удачи: ${roll.toFixed(1)}/${chance} - ${success ? 'УСПЕХ' : 'ПРОВАЛ'}`);
                    
                    if (success) {
                        this.handleSimpleActionSuccess(action, row, col);
                    } else {
                        this.handleSimpleActionFailure(action, row, col);
                    }
                    
                    // Обновляем интерфейс
                    setTimeout(() => {
                        try {
                            const cellKey = `${col},${row}`;
                            const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
                            if (cell) {
                                this.updateCellActionsUI(cell);
                            }
                        } catch (error) {
                            console.error("❌ Ошибка обновления интерфейса:", error);
                        }
                    }, 1000);
                } catch (error) {
                    console.error("❌ Ошибка обработки действия:", error);
                }
            }, 800);
            
        } catch (error) {
            console.error("❌ Ошибка в performSimpleAction:", error);
        }
    }

    showActionProcessing(action, config, chance, row, col) {
        try {
            const actionsContainer = document.getElementById('cellActionsContainer');
            if (!actionsContainer) return;
            
            actionsContainer.innerHTML = `
                <div class="action-processing">
                    <div class="processing-icon" style="font-size: 48px; text-align: center; margin: 20px 0;">
                        ${config.icon || '⚡'}
                    </div>
                    <h4 style="color: #00ffcc; text-align: center; margin-bottom: 10px;">
                        Выполняется действие...
                    </h4>
                    <p style="text-align: center; color: #aaa; margin-bottom: 20px;">
                        ${config.name} на клетке [${col}, ${row}]
                    </p>
                    <div class="chance-display-processing" style="
                        text-align: center;
                        margin: 20px 0;
                    ">
                        <span style="color: #aaa;">Шанс успеха:</span>
                        <span style="color: #00ffcc; font-size: 24px; font-weight: bold; margin-left: 10px;">
                            ${chance}%
                        </span>
                    </div>
                    <div class="processing-progress" style="
                        width: 80%;
                        margin: 0 auto;
                        height: 10px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 5px;
                        overflow: hidden;
                    ">
                        <div class="progress-fill" style="
                            width: 0%;
                            height: 100%;
                            background: linear-gradient(90deg, #00ffcc, #00aaff);
                            border-radius: 5px;
                            transition: width 0.8s ease;
                        "></div>
                    </div>
                    <div class="processing-hint" style="
                        text-align: center;
                        color: #888;
                        margin-top: 20px;
                        font-size: 12px;
                    ">
                        Результат зависит от удачи и особенностей местности
                    </div>
                </div>
            `;
            
            // Анимация прогресса
            setTimeout(() => {
                const progressFill = actionsContainer.querySelector('.progress-fill');
                if (progressFill) {
                    progressFill.style.width = '100%';
                }
            }, 50);
            
        } catch (error) {
            console.error("❌ Ошибка показа обработки действия:", error);
        }
    }

    handleSimpleActionSuccess(action, row, col) {
        try {
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
                'hunt_caravan': "🏹 Успешная охота на караван!",
                'take_assassination_contract': "🗡️ Контракт на убийство получен!",
                'light_campfire': "🔥 Костёр разожжён!",
                'guard_caravan': "🛡️ Найм на охрану каравана успешен!",
                'gather_wood': "🪵 Дрова собраны!"
            };
            
            const message = successMessages[action] || "✅ Действие успешно!";
            this.showNotification(message, 'success');
            
            // Награда за действие
            if (config.resource_type) {
                if (config.resource_type === 'gold') {
                    const goldAmount = Math.floor(Math.random() * 50) + 25;
                    if (this.mapSystem.currentHero) {
                        this.mapSystem.currentHero.gold += goldAmount;
                        console.log(`💰 Добавлено золото: ${goldAmount}`);
                    }
                } else {
                    this.giveRandomResource(config.resource_type, row, col);
                }
            }
        } catch (error) {
            console.error("❌ Ошибка обработки успеха действия:", error);
        }
    }

    handleSimpleActionFailure(action, row, col) {
        try {
            const config = this.actionConfigs[action];
            const cellTypeData = this.cellTypes[this.currentCellType];
            
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
                'hunt_caravan': "❌ Караван оказался слишком хорошо охраняем",
                'take_assassination_contract': "❌ Заказчик передумал или конкуренты перебили цену",
                'light_campfire': "❌ Дрова оказались сырыми, не удалось разжечь огонь",
                'guard_caravan': "❌ Вас не взяли на работу - недостаточно опыта или репутации",
                'gather_wood': "❌ Не найдено подходящих дров"
            };
            
            // Проверяем, вызывает ли монстра
            if (config.triggers_monster) {
                let monsterChance = cellTypeData?.failure_monster_chance || 50;
                monsterChance *= (config.monster_level_multiplier || 1);
                
                const monsterRoll = Math.random() * 100;
                
                if (monsterRoll <= monsterChance) {
                    console.log(`👹 Неудача вызвала появление монстра!`);
                    this.handleActionFailureWithMonster(action, row, col, cellTypeData);
                    return;
                }
            }
            
            this.showNotification(failureMessages[action] || "❌ Действие не увенчалось успехом", 'warning');
        } catch (error) {
            console.error("❌ Ошибка обработки провала действия:", error);
        }
    }

    // ========== ОПРЕДЕЛЕНИЕ ТИПОВ КЛЕТОК И ДЕЙСТВИЙ ==========

    determineCellType(cell) {
        try {
            if (!cell) return 'grave';
            
            if (cell.cellType && this.cellTypes[cell.cellType]) {
                return cell.cellType;
            }
            
            // Маппинг типов клеток на типы локаций
            const typeMapping = {
                'water': 'forest',
                'graveyard_cross': 'grave',
                'cave': 'forest',
                'tree': 'forest',
                'elegant_tree': 'forest',
                'mountain': 'forest',
                'campfire': 'forest',
                'berry_clearing': 'forest',
                'rocky_outcrop': 'forest',
                'ruined_shrine': 'grave',
                'crystal_cave': 'forest',
                'herb_garden': 'forest',
                'haunted_cemetery': 'grave',
                'sunken_ship': 'forest',
                'abandoned_camp': 'forest',
                'player_start': 'forest',
                'npc': 'forest',
                'merchant': 'forest',
                'tavern': 'forest',
                'shop': 'forest',
                'village': 'forest',
                'castle': 'grave',
                'bandit_camp': 'forest',
                'orc_camp': 'forest',
                'monster': 'forest',
                'chest': 'forest',
                'obstacle': 'forest',
                'portal': 'forest',
                'ancient_rune': 'grave',
                'magic_crystal': 'forest',
                'bridge': 'forest',
                'lava_crack': 'forest',
                'traveler': 'forest',
                'cart': 'forest',
                'inactive': 'forest'
            };
            
            if (cell.type && typeMapping[cell.type]) {
                cell.cellType = typeMapping[cell.type];
            } else {
                cell.cellType = this.getDefaultCellType(cell);
            }
            
            return cell.cellType;
        } catch (error) {
            console.error("❌ Ошибка определения типа клетки:", error);
            return 'grave';
        }
    }

    getDefaultCellType(cell) {
        try {
            const availableTypes = Object.keys(this.cellTypes);
            if (availableTypes.length > 0) {
                const seed = (cell.col || 0) * 47 + (cell.row || 0) * 29;
                return availableTypes[seed % availableTypes.length];
            }
            return 'grave';
        } catch (error) {
            console.error("❌ Ошибка получения типа клетки по умолчанию:", error);
            return 'grave';
        }
    }

    getActionChance(action, cellType) {
        try {
            const cellTypeData = this.cellTypes[cellType];
            
            if (cellTypeData?.action_chances?.[action] !== undefined) {
                return cellTypeData.action_chances[action];
            }
            
            return this.actionConfigs[action]?.baseChance || 25;
        } catch (error) {
            console.error("❌ Ошибка получения шанса действия:", error);
            return 25;
        }
    }

    getAvailableActionsForCellType(cellType) {
        try {
            const cellTypeData = this.cellTypes[cellType];
            const allActions = Object.keys(this.actionConfigs);
            
            if (!cellTypeData || !cellTypeData.action_chances) {
                return allActions.filter(action => this.getActionChance(action, cellType) > 0);
            }
            
            const availableActions = Object.keys(cellTypeData.action_chances)
                .filter(action => cellTypeData.action_chances[action] > 0)
                .sort((a, b) => cellTypeData.action_chances[b] - cellTypeData.action_chances[a]);
            
            return availableActions;
        } catch (error) {
            console.error("❌ Ошибка получения доступных действий:", error);
            return [];
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    giveRandomResource(resourceType, row, col) {
        try {
            const resources = this.resources[resourceType];
            if (!resources || resources.length === 0) {
                console.warn(`⚠️ Ресурсы типа ${resourceType} не найдены`);
                return;
            }
            
            const randomResource = resources[Math.floor(Math.random() * resources.length)];
            const quantity = Math.floor(Math.random() * 3) + 1;
            
            this.addResourceToHero(randomResource.id, randomResource.name, quantity, resourceType);
        } catch (error) {
            console.error("❌ Ошибка выдачи ресурса:", error);
        }
    }

    addResourceToHero(resourceId, resourceName, quantity, resourceType) {
        try {
            if (!this.mapSystem || !this.mapSystem.currentHero) {
                console.warn("⚠️ Герой не доступен для добавления ресурса");
                return;
            }
            
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
            
            if (window.game && window.game.saveGame) {
                window.game.saveGame();
            }
        } catch (error) {
            console.error("❌ Ошибка добавления ресурса герою:", error);
        }
    }

    updateHeroResourcesUI() {
        // Реализация обновления UI ресурсов героя
        try {
            const resourcesList = document.getElementById('heroResourcesListRight');
            if (!resourcesList || !this.mapSystem.currentHero) return;
            
            if (!this.mapSystem.currentHero.resources || Object.keys(this.mapSystem.currentHero.resources).length === 0) {
                resourcesList.innerHTML = '<div class="no-resources" style="text-align: center; color: #94a3b8; padding: 20px;">Ресурсов пока нет</div>';
                return;
            }
            
            // Здесь должна быть реализация обновления UI ресурсов
        } catch (error) {
            console.error("❌ Ошибка обновления UI ресурсов:", error);
        }
    }

    handleActionFailureWithMonster(action, row, col, cellTypeData) {
        try {
            const config = this.actionConfigs[action] || {};
            const monsterLevel = cellTypeData.monster_level || 1;
            
            const adjustedMonsterLevel = Math.min(
                5,
                Math.max(1, Math.floor(monsterLevel * (config.monster_level_multiplier || 1)))
            );
            
            const battleSystem = window.game?.systems?.battle;
            if (!battleSystem) return;
            
            const randomMonster = this.getMonsterByLevel(adjustedMonsterLevel);
            if (!randomMonster) return;
            
            this.mapSystem.pendingAction = {
                action: action,
                row: row,
                col: col,
                cellTypeData: cellTypeData,
                wasFailure: true
            };
            
            if (this.mapSystem.currentHero) {
                battleSystem.startBattleWithMonster(this.mapSystem.currentHero, randomMonster.id, 'action_failure');
                this.showNotification(`👹 Провал привлёк ${randomMonster.name}! Готовьтесь к бою!`, 'warning');
            }
        } catch (error) {
            console.error("❌ Ошибка обработки провала с монстром:", error);
        }
    }

    getMonsterByLevel(level) {
        try {
            const battleSystem = window.game?.systems?.battle;
            if (!battleSystem) return null;
            
            const allMonsters = battleSystem.monsters || [];
            if (allMonsters.length === 0) return null;
            
            const suitableMonsters = allMonsters.filter(monster => {
                const monsterLevel = monster.level || 1;
                return Math.abs(monsterLevel - level) <= 1;
            });
            
            if (suitableMonsters.length > 0) {
                return suitableMonsters[Math.floor(Math.random() * suitableMonsters.length)];
            }
            
            return allMonsters[Math.floor(Math.random() * allMonsters.length)];
        } catch (error) {
            console.error("❌ Ошибка получения монстра по уровню:", error);
            return null;
        }
    }

    createNoActionsHTML() {
        return `
            <div class="no-available-actions" style="text-align: center; padding: 40px; color: #94a3b8;">
                <div style="font-size: 48px; margin-bottom: 20px;">🚫</div>
                <h5>Для этой локации нет доступных действий</h5>
                <p class="hint" style="color: #64748b; margin-top: 10px;">Выберите другую клетку для взаимодействия.</p>
            </div>
        `;
    }

    createExploredCellHTML() {
        return `
            <div class="cell-explored" style="text-align: center; padding: 40px; color: #94a3b8;">
                <div style="font-size: 48px; margin-bottom: 20px;">✓</div>
                <h5>Местность исследована</h5>
                <p>Вы уже исследовали эту местность и совершили доступные действия.</p>
                <p class="hint" style="color: #64748b; margin-top: 10px;">Перейдите на другую клетку для новых действий.</p>
            </div>
        `;
    }

    showNotification(message, type = 'info') {
        try {
            if (window.game && window.game.showNotification) {
                window.game.showNotification(message, type);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        } catch (error) {
            console.error("❌ Ошибка показа уведомления:", error);
        }
    }

    completeCellExploration(row, col) {
        try {
            const cellKey = `${col},${row}`;
            const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
            
            if (cell) {
                cell.explored = true;
                cell.hasAction = false;
                this.showNotification("✅ Вы полностью исследовали эту местность", 'success');
                if (this.mapSystem.drawTacticalMap) {
                    this.mapSystem.drawTacticalMap();
                }
                this.clearCellActionsUI();
            }
        } catch (error) {
            console.error("❌ Ошибка завершения исследования:", error);
        }
    }

    clearCellActionsUI() {
        try {
            const actionsContainer = document.getElementById('cellActionsContainer');
            if (actionsContainer) {
                actionsContainer.innerHTML = '<div class="actions-placeholder" style="text-align: center; padding: 40px; color: #64748b;">Выберите клетку для просмотра доступных действий</div>';
            }
        } catch (error) {
            console.error("❌ Ошибка очистки UI действий:", error);
        }
    }
}

// Глобальная регистрация
if (typeof window !== 'undefined') {
    window.ActionSystem = ActionSystem;
    console.log("📦 ActionSystem зарегистрирован глобально");
}
