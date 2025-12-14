"use strict";

class ActionSystem {
    constructor(mapSystem) {
        // Проверяем наличие mapSystem
        if (!mapSystem) {
            console.error("❌ ActionSystem: mapSystem не передан");
            throw new Error("ActionSystem требует mapSystem");
        }
        
        this.mapSystem = mapSystem;
        
        // ========== ИНИЦИАЛИЗАЦИЯ С ЗАЩИТОЙ ==========
        this.cellTypes = {};
        this.resources = {};
        this.currentCellType = null;
        this.selectedCell = null;
        this.currentCellActions = [];
        this.actionModules = {};
        
        // Конфигурация всех действий
        this.actionConfigs = this.initializeActionConfigs();
        this.baseActionChances = this.initializeBaseChances();
        this.allActions = Object.keys(this.actionConfigs);
        
        this.locationImages = {};
        this.locationImageCache = new Map();
        
        console.log("✅ ActionSystem инициализирован с mapSystem:", !!mapSystem);
    }

    // ========== ИНИЦИАЛИЗАЦИЯ КОНФИГУРАЦИЙ ==========

    initializeActionConfigs() {
        return {
            'hunt': {
                icon: '🏹',
                name: 'Охотиться',
                description: 'Выследить и добыть дичь. Приводит к бою с монстром. Награда: двойной лут с монстра',
                class: 'action-hunt',
                resource_type: 'loot',
                triggers_monster: true,
                monster_level_multiplier: 1.0,
                always_monster: true,
                double_loot: true,
                module: 'hunt'
            },
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
            }
        };
    }

    initializeBaseChances() {
        return {
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
    }

    // ========== ЗАГРУЗКА ДАННЫХ ==========

    async loadCellData() {
        console.log("📥 ActionSystem: Начинаем загрузку данных...");
        
        try {
            // 1. Сначала загружаем данные клеток
            await this.loadCellTypes();
            
            // 2. Затем загружаем ресурсы
            await this.loadResources();
            
            // 3. Загружаем модуль охоты
            await this.loadHuntModule();
            
            console.log("✅ ActionSystem: Все данные успешно загружены");
            return true;
            
        } catch (error) {
            console.error("❌ ActionSystem: Ошибка загрузки данных:", error);
            
            // Создаем базовые данные при ошибке
            this.createDefaultCellTypes();
            this.createDefaultResources();
            this.createHuntActionStub();
            
            return false;
        }
    }

    async loadCellTypes() {
        try {
            console.log("📥 Загружаем типы клеток...");
            const response = await fetch('data/cell_types.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Защита от undefined/null
            if (!data || typeof data !== 'object') {
                throw new Error("Некорректные данные клеток");
            }
            
            this.cellTypes = data.cell_types || {};
            console.log(`✅ Загружено ${Object.keys(this.cellTypes).length} типов клеток`);
            
        } catch (error) {
            console.warn("⚠️ Не удалось загрузить cell_types.json:", error.message);
            this.createDefaultCellTypes();
        }
    }

    async loadResources() {
        try {
            console.log("📥 Загружаем ресурсы...");
            const response = await fetch('data/resources.json');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Защита от undefined/null
            if (!data || typeof data !== 'object') {
                throw new Error("Некорректные данные ресурсов");
            }
            
            this.resources = data;
            console.log(`✅ Загружено ${Object.keys(this.resources).length} категорий ресурсов`);
            
        } catch (error) {
            console.warn("⚠️ Не удалось загрузить resources.json:", error.message);
            this.createDefaultResources();
        }
    }

    async loadHuntModule() {
        console.log("🔄 Загружаем модуль охоты...");
        
        try {
            // Пробуем загрузить из файла
            const response = await fetch('data/actions/hunt-action.js');
            
            if (response.ok) {
                const moduleCode = await response.text();
                
                if (!moduleCode || moduleCode.trim() === '') {
                    throw new Error("Файл модуля охоты пуст");
                }
                
                // Проверяем что код содержит класс HuntAction
                if (!moduleCode.includes('class HuntAction')) {
                    throw new Error("Файл не содержит класс HuntAction");
                }
                
                // Динамически выполняем код модуля
                const script = document.createElement('script');
                script.textContent = moduleCode;
                document.head.appendChild(script);
                
                // Ждем чтобы класс зарегистрировался
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (window.HuntAction && typeof window.HuntAction === 'function') {
                    // Создаем экземпляр модуля охоты
                    this.actionModules['hunt'] = new window.HuntAction(this);
                    console.log("✅ Модуль охоты успешно загружен и инициализирован");
                } else {
                    throw new Error('Класс HuntAction не найден в глобальной области видимости');
                }
            } else {
                throw new Error(`Файл hunt-action.js не найден (${response.status})`);
            }
        } catch (error) {
            console.error("❌ Ошибка загрузки модуля охоты:", error.message);
            
            // Создаем заглушку
            this.createHuntActionStub();
        }
    }

    // ========== СОЗДАНИЕ БАЗОВЫХ ДАННЫХ ==========

    createDefaultCellTypes() {
        console.log("🔄 Создаем базовые типы клеток...");
        
        this.cellTypes = {
            'grave': {
                name: "Старая каменная гробница",
                description: "Массивная каменная плита с высеченными рунами, явно не крестьянского происхождения.",
                icon: '⚰️',
                action_chances: { search_treasure: 85, hunt: 70 },
                failure_monster_chance: 70,
                monster_level: 2
            },
            'small_stream': {
                name: "Хрустальный ручей",
                description: "Прозрачная вода струится по гладким камням, образуя небольшие водовороты.",
                icon: '💧',
                action_chances: { search_water: 95, hunt: 60 },
                failure_monster_chance: 40,
                monster_level: 1
            },
            'berry_clearing': {
                name: "Ягодная поляна",
                description: "Солнечная поляна, усыпанная спелыми ягоды всех оттенков красного и синего.",
                icon: '🫐',
                action_chances: { search_berries: 90, search_herbs: 75 },
                failure_monster_chance: 35,
                monster_level: 1
            }
        };
        
        console.log("✅ Создано 3 базовых типа клеток");
    }

    createDefaultResources() {
        console.log("🔄 Создаем базовые ресурсы...");
        
        this.resources = {
            treasure: [
                { id: 'gold_coins', name: '💰 Золотые монеты', type: 'treasure', rarity: 'common' }
            ],
            water: [
                { id: 'fresh_water', name: '💧 Пресная вода', type: 'water', rarity: 'common' }
            ],
            bones: [
                { id: 'small_bone', name: '🦴 Маленькая кость', type: 'bones', rarity: 'common', description: 'Кость мелкого животного', price: 5 },
                { id: 'wolf_bone', name: '🐺 Волчья кость', type: 'bones', rarity: 'uncommon', description: 'Кость волка', price: 15 }
            ],
            leathers: [
                { id: 'thin_leather', name: '🐂 Тонкая кожа', type: 'leathers', rarity: 'common', description: 'Кожа мелкого животного', price: 10 },
                { id: 'strong_leather', name: '🦌 Прочная кожа', type: 'leathers', rarity: 'uncommon', description: 'Кожа оленя', price: 20 }
            ]
        };
        
        console.log("✅ Созданы базовые ресурсы");
    }

    createHuntActionStub() {
        console.log("🔄 Создаем заглушку модуля охоты...");
        
        this.actionModules['hunt'] = {
            execute: (row, col) => {
                console.log(`🏹 Заглушка охоты: клетка [${col},${row}]`);
                this.showNotification("⚠️ Модуль охоты временно недоступен", 'warning');
                
                // Простая логика как заглушка
                const battleSystem = window.game?.systems?.battle;
                if (battleSystem) {
                    const randomMonster = battleSystem.getRandomMonsterForMovement?.();
                    if (randomMonster) {
                        this.mapSystem.pendingAction = {
                            action: 'hunt',
                            row: row,
                            col: col,
                            wasSuccess: true,
                            doubleLoot: true
                        };
                        battleSystem.startBattleWithSpecificMonster(this.mapSystem.currentHero, randomMonster, 'hunt');
                    }
                }
            },
            completeHuntAfterBattle: (victory, escape, doubleLoot) => {
                console.log(`🏹 Заглушка: обработка результата охоты`);
                this.mapSystem?.completeMovementAfterBattle?.(victory, escape, 'hunt', doubleLoot);
            }
        };
        
        console.log("✅ Заглушка модуля охоты создана");
    }

    // ========== ОСНОВНЫЕ МЕТОДЫ С ЗАЩИТОЙ ==========

    determineCellType(cell) {
        if (!cell || typeof cell !== 'object') {
            console.warn("❌ determineCellType: передан неверный cell:", cell);
            return 'grave';
        }
        
        // Если тип уже определен и есть в загруженных данных
        if (cell.cellType && this.cellTypes[cell.cellType]) {
            return cell.cellType;
        }
        
        // Определяем тип клетки
        const availableTypes = Object.keys(this.cellTypes);
        if (availableTypes.length === 0) {
            return 'grave';
        }
        
        const seed = (cell.col || 0) * 47 + (cell.row || 0) * 29;
        const randomIndex = seed % availableTypes.length;
        cell.cellType = availableTypes[randomIndex];
        
        return cell.cellType;
    }

    getActionChance(action, cellType) {
        // Защита от undefined
        if (!action || !cellType) {
            return this.baseActionChances[action] || 25;
        }
        
        const cellTypeData = this.cellTypes[cellType];
        
        if (!cellTypeData) {
            return this.baseActionChances[action] || 25;
        }
        
        if (cellTypeData.action_chances && typeof cellTypeData.action_chances[action] === 'number') {
            return cellTypeData.action_chances[action];
        }
        
        return this.baseActionChances[action] || 25;
    }

    getAvailableActionsForCellType(cellType) {
        if (!cellType) {
            return this.allActions.filter(action => (this.baseActionChances[action] || 25) > 0);
        }
        
        const cellTypeData = this.cellTypes[cellType];
        if (!cellTypeData || !cellTypeData.action_chances) {
            return this.allActions.filter(action => (this.baseActionChances[action] || 25) > 0);
        }
        
        return Object.keys(cellTypeData.action_chances)
            .filter(action => cellTypeData.action_chances[action] > 0)
            .sort((a, b) => cellTypeData.action_chances[b] - cellTypeData.action_chances[a]);
    }

    // ========== ВЫПОЛНЕНИЕ ДЕЙСТВИЙ ==========

    async performCellAction(action, row, col) {
        console.log(`🎯 ActionSystem.performCellAction: ${action} на [${col},${row}]`);
        
        try {
            // Проверяем клетку
            const cellKey = `${col},${row}`;
            const cell = this.mapSystem?.currentTacticalMap?.cells?.[cellKey];
            
            if (!cell) {
                this.showNotification("❌ Клетка не найдена", 'error');
                return;
            }
            
            if (cell.explored === true) {
                this.showNotification("❌ Эта клетка уже исследована", 'warning');
                return;
            }
            
            // Проверяем достижимость
            const isReachable = this.mapSystem?.isCellReachable?.(cell);
            if (!isReachable) {
                this.showNotification("❌ Клетка недостижима", 'warning');
                return;
            }
            
            // Если действие обрабатывается модулем
            const config = this.actionConfigs[action];
            if (config && config.module && this.actionModules[config.module]) {
                const module = this.actionModules[config.module];
                
                // Для охоты - вызываем execute модуля
                if (config.module === 'hunt' && typeof module.execute === 'function') {
                    console.log(`🏹 Выполнение охоты через модуль`);
                    return await module.execute(row, col);
                }
            }
            
            // Для обычных действий
            this.executeStandardAction(action, row, col);
            
        } catch (error) {
            console.error("❌ Ошибка при выполнении действия:", error);
            this.showNotification("❌ Ошибка выполнения действия", 'error');
        }
    }

    executeStandardAction(action, row, col) {
        const config = this.actionConfigs[action] || { icon: '⚡', name: 'Действие' };
        const chance = this.getActionChance(action, this.currentCellType);
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <div class="action-processing">
                    <div class="processing-icon">${config.icon}</div>
                    <h4>${config.name}</h4>
                    <p>Шанс успеха: <strong>${chance}%</strong></p>
                    <div class="processing-progress">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Имитация выполнения
        setTimeout(() => {
            const roll = Math.random() * 100;
            const success = roll <= chance;
            
            if (success) {
                this.handleStandardActionSuccess(action, row, col);
            } else {
                this.handleStandardActionFailure(action, row, col);
            }
        }, 800);
    }

    handleStandardActionSuccess(action, row, col) {
        const resourceMap = {
            'search_treasure': 'treasure',
            'search_water': 'water',
            'search_berries': 'berries',
            'search_mushrooms': 'mushrooms',
            'search_herbs': 'herbs',
            'search_ore': 'ores',
            'search_stone': 'stones'
        };
        
        const resourceType = resourceMap[action];
        if (resourceType && this.resources[resourceType]) {
            this.giveRandomResource(resourceType, row, col);
        }
        
        this.showNotification(`✅ ${this.actionConfigs[action]?.name || 'Действие'} успешно!`, 'success');
    }

    handleStandardActionFailure(action) {
        this.showNotification(`❌ ${this.actionConfigs[action]?.name || 'Действие'} не удалось`, 'warning');
    }

    // ========== РЕСУРСЫ И ИНТЕРФЕЙС ==========

    giveRandomResource(resourceType, row, col) {
        const resources = this.resources[resourceType];
        if (!resources || resources.length === 0) return;
        
        const randomResource = resources[Math.floor(Math.random() * resources.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        
        this.addResourceToHero(randomResource.id, randomResource.name, quantity, resourceType);
    }

    addResourceToHero(resourceId, resourceName, quantity, resourceType) {
        // Проверяем наличие героя
        if (!this.mapSystem?.currentHero) {
            console.warn("❌ Нет текущего героя для добавления ресурса");
            return;
        }
        
        // Создаем объект ресурсов если его нет
        if (!this.mapSystem.currentHero.resources || typeof this.mapSystem.currentHero.resources !== 'object') {
            this.mapSystem.currentHero.resources = {};
        }
        
        // Добавляем или обновляем ресурс
        if (!this.mapSystem.currentHero.resources[resourceId]) {
            this.mapSystem.currentHero.resources[resourceId] = {
                id: resourceId,
                name: resourceName,
                count: 0,
                type: resourceType
            };
        }
        
        this.mapSystem.currentHero.resources[resourceId].count += quantity;
        
        console.log(`📦 Добавлен ресурс ${resourceId}: ${quantity} шт. Всего: ${this.mapSystem.currentHero.resources[resourceId].count}`);
        
        // Обновляем UI
        this.updateHeroResourcesUI();
        
        // Сохраняем игру
        if (window.game?.saveGame) {
            try {
                window.game.saveGame();
            } catch (error) {
                console.warn("⚠️ Не удалось сохранить игру:", error);
            }
        }
    }

    updateHeroResourcesUI() {
        const containers = ['heroResourcesList', 'heroResourcesListRight'];
        
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (!container || !this.mapSystem?.currentHero?.resources) return;
            
            const resources = this.mapSystem.currentHero.resources;
            const resourceKeys = Object.keys(resources);
            
            if (resourceKeys.length === 0) {
                container.innerHTML = '<div class="no-resources">Ресурсов пока нет</div>';
                return;
            }
            
            let html = '';
            resourceKeys.forEach(key => {
                const resource = resources[key];
                if (resource && resource.name && typeof resource.count === 'number') {
                    html += `
                        <div class="resource-item">
                            <span>${resource.name}</span>
                            <span>x${resource.count}</span>
                        </div>
                    `;
                }
            });
            
            container.innerHTML = html || '<div class="no-resources">Ресурсов пока нет</div>';
        });
    }

    // ========== УПРАВЛЕНИЕ МОДУЛЯМИ ==========

    registerModule(moduleName, moduleInstance) {
        if (!moduleName || !moduleInstance) {
            console.error("❌ registerModule: неверные параметры");
            return;
        }
        
        this.actionModules[moduleName] = moduleInstance;
        console.log(`✅ Модуль ${moduleName} зарегистрирован в ActionSystem`);
    }

    getActionModule(moduleName) {
        return this.actionModules[moduleName];
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    showNotification(message, type = 'info') {
        try {
            if (window.game && typeof window.game.showNotification === 'function') {
                window.game.showNotification(message, type);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        } catch (error) {
            console.error("❌ Ошибка показа уведомления:", error);
        }
    }

    init() {
        console.log("🔄 ActionSystem.init() - базовая инициализация");
        return Promise.resolve(true);
    }
}

// ========== ГЛОБАЛЬНАЯ РЕГИСТРАЦИЯ ==========
if (typeof window !== 'undefined') {
    // Сначала создаем заглушку если нужно
    if (!window.ActionSystem) {
        window.ActionSystem = class ActionSystemPlaceholder {
            constructor(mapSystem) {
                console.log("📦 ActionSystemPlaceholder создан");
                this.mapSystem = mapSystem;
                this.cellTypes = {};
                this.resources = {};
                this.actionModules = {};
            }
            init() { return Promise.resolve(true); }
            loadCellData() { return Promise.resolve(true); }
            performCellAction() { console.log("⚠️ ActionSystemPlaceholder: метод не реализован"); }
        };
        console.log("✅ ActionSystem заглушка предварительно зарегистрирована");
    }
    
    // Основная регистрация
    window.ActionSystem = ActionSystem;
    console.log("📦 ActionSystem зарегистрирован глобально");
}
