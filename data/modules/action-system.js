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
        
        // Модули действий
        this.actionModules = {};
        
        // Конфигурация всех действий
        this.actionConfigs = {
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
                module: 'hunt' // Указываем какой модуль обрабатывает это действие
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
        
        // Базовые шансы действий
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
        this.allActions = Object.keys(this.actionConfigs);
        
        this.locationImages = {};
        this.locationImageCache = new Map();
        
        console.log("✅ ActionSystem инициализирован");
    }

    // ========== ИНИЦИАЛИЗАЦИЯ И ЗАГРУЗКА ==========

    async loadCellData() {
        try {
            console.log("📥 ActionSystem: Загружаем данные...");
            
            // Загружаем типы клеток
            try {
                const cellTypesResponse = await fetch('data/cell_types.json');
                if (cellTypesResponse.ok) {
                    const cellData = await cellTypesResponse.json();
                    this.cellTypes = cellData.cell_types || {};
                    console.log(`✅ Загружено типов клеток: ${Object.keys(this.cellTypes).length}`);
                } else {
                    throw new Error('Не удалось загрузить cell_types.json');
                }
            } catch (error) {
                console.warn("⚠️ cell_types.json не загружен, создаем базовые типы");
                this.createDefaultCellTypes();
            }
            
            // Загружаем ресурсы
            try {
                const resourcesResponse = await fetch('data/resources.json');
                if (resourcesResponse.ok) {
                    const resourcesData = await resourcesResponse.json();
                    this.resources = resourcesData;
                    console.log(`✅ Загружено ресурсов: ${Object.keys(this.resources).length} категорий`);
                } else {
                    throw new Error('Не удалось загрузить resources.json');
                }
            } catch (error) {
                console.warn("⚠️ resources.json не загружен, создаем базовые ресурсы");
                this.createDefaultResources();
            }
            
            // Загружаем модуль охоты
            await this.loadHuntModule();
            
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных ActionSystem:", error);
            this.createDefaultCellTypes();
            this.createDefaultResources();
            this.createHuntActionStub();
            return false;
        }
    }

    async loadHuntModule() {
        console.log("🔄 Загружаем модуль охоты...");
        
        try {
            // Пробуем загрузить из файла
            const response = await fetch('data/actions/hunt-action.js');
            if (response.ok) {
                const moduleCode = await response.text();
                
                // Динамически выполняем код модуля
                const script = document.createElement('script');
                script.textContent = moduleCode;
                document.head.appendChild(script);
                
                // Ждем чтобы класс зарегистрировался
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (window.HuntAction) {
                    // Создаем экземпляр модуля охоты
                    this.actionModules['hunt'] = new window.HuntAction(this);
                    console.log("✅ Модуль охоты успешно загружен");
                    return true;
                } else {
                    throw new Error('Класс HuntAction не найден после загрузки файла');
                }
            } else {
                throw new Error('Файл hunt-action.js не найден');
            }
        } catch (error) {
            console.error("❌ Ошибка загрузки модуля охоты:", error);
            
            // Создаем заглушку
            this.createHuntActionStub();
            return false;
        }
    }

    createHuntActionStub() {
        console.log("🔄 Создаем заглушку для модуля охоты");
        
        this.actionModules['hunt'] = {
            execute: (row, col) => {
                console.log(`🏹 Заглушка охоты: клетка [${col},${row}]`);
                this.showNotification("⚠️ Модуль охоты временно недоступен. Используйте Быструю охоту.", 'warning');
                
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
                        this.showNotification(`🏹 Быстрая охота на ${randomMonster.name}`, 'info');
                    }
                }
            },
            completeHuntAfterBattle: (victory, escape, doubleLoot) => {
                console.log(`🏹 Заглушка: обработка результата охоты`);
                this.mapSystem.completeMovementAfterBattle(victory, escape, 'hunt', doubleLoot);
            }
        };
        
        console.log("✅ Заглушка модуля охоты создана");
    }

    // ========== МЕТОДЫ ДЛЯ ДАННЫХ ==========

    createDefaultCellTypes() {
        this.cellTypes = {
            'grave': {
                name: "Старая каменная гробница",
                description: "Массивная каменная плита с высеченными рунами...",
                icon: '⚰️',
                image: 'images/locations/grave.jpg',
                action_chances: {
                    search_treasure: 85,
                    hunt: 70
                },
                failure_monster_chance: 70,
                monster_level: 2
            },
            'small_stream': {
                name: "Хрустальный ручей",
                description: "Прозрачная вода струится по гладким камням...",
                icon: '💧',
                image: 'images/locations/small_stream.jpg',
                action_chances: {
                    search_water: 95,
                    hunt: 60
                },
                failure_monster_chance: 40,
                monster_level: 1
            }
        };
    }

    createDefaultResources() {
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
    }

    // ========== ОСНОВНЫЕ МЕТОДЫ ==========

    determineCellType(cell) {
        if (!cell) return 'grave';
        
        if (cell.cellType && this.cellTypes[cell.cellType]) {
            return cell.cellType;
        }
        
        const typeMapping = {
            'water': 'small_stream',
            'campfire': 'abandoned_camp',
            'berry_clearing': 'berry_clearing'
        };
        
        if (cell.type && typeMapping[cell.type]) {
            cell.cellType = typeMapping[cell.type];
        } else {
            const availableTypes = Object.keys(this.cellTypes);
            if (availableTypes.length > 0) {
                const seed = cell.col * 47 + cell.row * 29;
                cell.cellType = availableTypes[seed % availableTypes.length];
            } else {
                cell.cellType = 'grave';
            }
        }
        
        return cell.cellType;
    }

    getActionChance(action, cellType) {
        const cellTypeData = this.cellTypes[cellType];
        
        if (!cellTypeData) {
            return this.baseActionChances[action] || 25;
        }
        
        if (cellTypeData.action_chances && cellTypeData.action_chances[action] !== undefined) {
            return cellTypeData.action_chances[action];
        }
        
        return this.baseActionChances[action] || 25;
    }

    getAvailableActionsForCellType(cellType) {
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
        
        // Проверяем клетку
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        if (!cell) {
            this.showNotification("❌ Клетка не найдена", 'error');
            return;
        }
        
        if (cell.explored === true) {
            this.showNotification("❌ Эта клетка уже исследована", 'warning');
            return;
        }
        
        // Проверяем достижимость
        const isReachable = this.mapSystem.isCellReachable(cell);
        if (!isReachable) {
            this.showNotification("❌ Клетка недостижима", 'warning');
            return;
        }
        
        // Если действие обрабатывается модулем
        const config = this.actionConfigs[action];
        if (config && config.module && this.actionModules[config.module]) {
            const module = this.actionModules[config.module];
            
            // Для охоты - вызываем execute модуля
            if (config.module === 'hunt' && module.execute) {
                console.log(`🏹 Выполнение охоты через модуль`);
                return await module.execute(row, col);
            }
        }
        
        // Для обычных действий
        this.executeStandardAction(action, row, col);
    }

    executeStandardAction(action, row, col) {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (actionsContainer) {
            const config = this.actionConfigs[action] || { icon: '⚡', name: action };
            const chance = this.getActionChance(action, this.currentCellType);
            
            actionsContainer.innerHTML = `
                <div class="action-processing">
                    <div class="processing-icon">${config.icon}</div>
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
                </div>
            `;
        }
        
        setTimeout(() => {
            const chance = this.getActionChance(action, this.currentCellType);
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
            'search_berries': 'berries'
        };
        
        const resourceType = resourceMap[action];
        if (resourceType) {
            this.giveRandomResource(resourceType, row, col);
        }
        
        this.showNotification(`✅ ${this.actionConfigs[action]?.name || 'Действие'} успешно!`, 'success');
    }

    handleStandardActionFailure(action, row, col) {
        this.showNotification(`❌ ${this.actionConfigs[action]?.name || 'Действие'} не удалось`, 'warning');
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    giveRandomResource(resourceType, row, col) {
        const resources = this.resources[resourceType];
        if (!resources || resources.length === 0) return;
        
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
        
        console.log(`📦 Добавлен ресурс ${resourceId}: ${quantity} шт.`);
        this.updateHeroResourcesUI();
        
        if (window.game && window.game.saveGame) {
            window.game.saveGame();
        }
    }

    updateHeroResourcesUI() {
        const containers = ['heroResourcesList', 'heroResourcesListRight'];
        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container && this.mapSystem.currentHero && this.mapSystem.currentHero.resources) {
                let html = '';
                Object.values(this.mapSystem.currentHero.resources).forEach(resource => {
                    html += `
                        <div class="resource-item">
                            <span>${resource.name}</span>
                            <span>x${resource.count}</span>
                        </div>
                    `;
                });
                container.innerHTML = html || '<div>Ресурсов пока нет</div>';
            }
        });
    }

    showNotification(message, type = 'info') {
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // ========== ИНТЕРФЕЙС ==========

    updateCellActionsUI(cell) {
        const leftPanel = document.querySelector('.cell-info-left-panel') || 
                         this.createLeftPanel();
        const actionsContainer = document.getElementById('cellActionsContainer') || 
                                this.createActionsContainer();
        
        this.selectedCell = cell;
        this.currentCellType = this.determineCellType(cell);
        this.currentCellActions = this.getAvailableActionsForCellType(this.currentCellType);
        
        this.updateLeftPanelUI(leftPanel, cell);
        this.updateActionsContainerUI(actionsContainer, cell);
    }

    updateLeftPanelUI(panel, cell) {
        const cellTypeData = this.cellTypes[this.currentCellType] || {};
        
        panel.innerHTML = `
            <h3>📍 Информация о локации</h3>
            <div class="cell-name">${cellTypeData.name || 'Неизвестная локация'}</div>
            <div class="cell-position">Позиция: [${cell.col}, ${cell.row}]</div>
            <div class="cell-description">${cellTypeData.description || ''}</div>
        `;
    }

    updateActionsContainerUI(container, cell) {
        const isExplored = cell.explored === true;
        const hasAction = cell.hasAction !== false;
        
        if (!isExplored && hasAction) {
            let actionsHTML = '<h3>⚔️ Доступные действия</h3><div class="actions-grid">';
            
            this.currentCellActions.forEach(action => {
                const config = this.actionConfigs[action];
                const chance = this.getActionChance(action, this.currentCellType);
                const chanceColor = this.getChanceColor(chance);
                
                actionsHTML += `
                    <div class="action-card" onclick="game.systems.action.performCellAction('${action}', ${cell.row}, ${cell.col})">
                        <div class="action-icon">${config.icon}</div>
                        <div class="action-name">${config.name}</div>
                        <div class="action-description">${config.description}</div>
                        <div class="action-chance" style="color: ${chanceColor}">${chance}%</div>
                    </div>
                `;
            });
            
            actionsHTML += '</div>';
            container.innerHTML = actionsHTML;
        } else if (isExplored) {
            container.innerHTML = '<div class="cell-explored">✓ Местность исследована</div>';
        } else {
            container.innerHTML = '<div class="no-actions">🚫 Нет доступных действий</div>';
        }
    }

    getChanceColor(chance) {
        if (chance >= 70) return '#44ff44';
        if (chance >= 40) return '#ffaa00';
        return '#ff4444';
    }

    createLeftPanel() {
        const panel = document.createElement('div');
        panel.className = 'cell-info-left-panel';
        document.querySelector('.tactical-map-content-with-actions')?.appendChild(panel);
        return panel;
    }

    createActionsContainer() {
        const container = document.createElement('div');
        container.id = 'cellActionsContainer';
        container.className = 'cell-actions-container';
        document.querySelector('.tactical-map-content-with-actions')?.appendChild(container);
        return container;
    }

    // ========== РЕГИСТРАЦИЯ МОДУЛЕЙ ==========

    registerModule(moduleName, moduleInstance) {
        this.actionModules[moduleName] = moduleInstance;
        console.log(`✅ Модуль ${moduleName} зарегистрирован в ActionSystem`);
    }

    getActionModule(moduleName) {
        return this.actionModules[moduleName];
    }
}

// Глобальная регистрация
if (typeof window !== 'undefined') {
    window.ActionSystem = ActionSystem;
    console.log("📦 ActionSystem зарегистрирован глобально");
}
