"use strict";

class ActionSystem {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        
        // ========== НОВАЯ КОНЦЕПЦИЯ: ОДНО ДЕЙСТВИЕ НА КЛЕТКУ ==========
        this.cellTypes = {};
        this.resources = {};
        this.cellEvents = {}; // Типы событий для клеток
        
        // Типы событий на клетках
        this.eventTypes = {
            'robber_camp': {
                name: 'Лагерь разбойников',
                type: 'tavern',
                icon: '⚔️',
                description: 'Притон разбойников. Можно отдохнуть и послушать слухи.',
                tacticalMap: 'data/maps/tactical/tavern1.json',
                isTavern: true
            },
            'orc_camp': {
                name: 'Лагерь орков',
                type: 'tavern',
                icon: '👹',
                description: 'Грязный орчий лагерь. Не самое приятное место для отдыха.',
                tacticalMap: 'data/maps/tactical/tavern1.json',
                isTavern: true
            },
            'attack_caravan': {
                name: 'Караван (нападение)',
                type: 'battle',
                icon: '🐪💀',
                description: 'Торговый караван с ценным грузом. Можно попытаться ограбить.',
                enemyCount: { min: 1, max: 6 },
                isHostile: true,
                lootMultiplier: 2.0,
                difficulty: 2
            },
            'defend_caravan': {
                name: 'Караван (защита)',
                type: 'battle_with_allies',
                icon: '🐪🛡️',
                description: 'Торговый караван под угрозой. Защитите его за награду.',
                enemyCount: { min: 1, max: 6 },
                allyCount: { min: 1, max: 5 },
                isHostile: false,
                rewardMultiplier: 1.5,
                difficulty: 2
            },
            'assassin_contract': {
                name: 'Контракт на убийство',
                type: 'contract',
                icon: '🗡️',
                description: 'Наемник предлагает опасное задание за большие деньги.',
                rewardMultiplier: 5.0,
                difficulty: 3,
                triggersMonster: true
            },
            'hunt': {
                name: 'Охота',
                type: 'hunt',
                icon: '🏹',
                description: 'Выберите трофей для охоты и найдите соответствующего монстра.',
                module: 'hunt',
                requiresModule: true
            },
            'wood_gathering': {
                name: 'Сбор древесины',
                type: 'resource',
                icon: '🪵',
                description: 'Собрать пригодную для строительства древесину.',
                resourceType: 'woods',
                amount: { min: 3, max: 8 }
            },
            'water_source': {
                name: 'Источник воды',
                type: 'water',
                icon: '💧',
                description: 'Наполнить флягу чистой водой.',
                refillFlask: true,
                restoreHealth: true
            },
            'treasure': {
                name: 'Сокровище',
                type: 'treasure',
                icon: '💰',
                description: 'Случайная ценная находка.',
                rewards: [
                    { type: 'item', chance: 40, subtype: 'any' },
                    { type: 'gold', chance: 30, min: 50, max: 200 },
                    { type: 'resource', chance: 30, subtype: 'any' }
                ]
            },
            'weapon_find': {
                name: 'Находка оружия',
                type: 'item',
                icon: '⚔️',
                description: 'Найдено забытое или брошенное оружие.',
                itemType: 'weapon',
                quality: { min: 1, max: 3 }
            },
            'armor_find': {
                name: 'Находка брони',
                type: 'item',
                icon: '🛡️',
                description: 'Найден доспех, оставленный прежним хозяином.',
                itemType: 'armor',
                quality: { min: 1, max: 3 }
            },
            'herb_gathering': {
                name: 'Сбор трав',
                type: 'resource',
                icon: '🌿',
                description: 'Собрать полезные лекарственные травы.',
                resourceType: 'herbs',
                amount: { min: 2, max: 5 }
            },
            'berry_gathering': {
                name: 'Сбор ягод',
                type: 'resource',
                icon: '🫐',
                description: 'Собрать съедобные лесные ягоды.',
                resourceType: 'berries',
                amount: { min: 3, max: 7 }
            },
            'stone_gathering': {
                name: 'Сбор камней',
                type: 'resource',
                icon: '🪨',
                description: 'Найти полезные камни для строительства или ремесла.',
                resourceType: 'stones',
                amount: { min: 2, max: 6 }
            },
            'mushroom_gathering': {
                name: 'Сбор грибов',
                type: 'resource',
                icon: '🍄',
                description: 'Найти съедобные или полезные грибы.',
                resourceType: 'mushrooms',
                amount: { min: 2, max: 5 }
            },
            'ore_gathering': {
                name: 'Добыча руды',
                type: 'resource',
                icon: '⛏️',
                description: 'Найти залежи полезной руды.',
                resourceType: 'ores',
                amount: { min: 1, max: 4 }
            },
            'monster': {
                name: 'Монстр',
                type: 'monster',
                icon: '👹',
                description: 'Опасное существо охраняет эту территорию.',
                monsterLevel: { min: 1, max: 3 },
                isGuard: true
            },
            'monster_group': {
                name: 'Группа монстров',
                type: 'monster_group',
                icon: '👹👹',
                description: 'Несколько монстров патрулируют местность.',
                monsterCount: { min: 2, max: 4 },
                monsterLevel: { min: 1, max: 2 },
                isGuard: true
            }
        };
        
        // Карта соответствия типов клеток событиям
        this.cellTypeToEvent = {
            'forest_crossroads': ['monster', 'monster_group', 'hunt', 'berry_gathering'],
            'cave_entrance': ['monster', 'monster_group', 'ore_gathering', 'mushroom_gathering'],
            'lonely_watchtower': ['assassin_contract', 'treasure', 'monster'],
            'mossy_boulder_field': ['stone_gathering', 'monster', 'monster_group'],
            'hidden_meadow': ['herb_gathering', 'berry_gathering', 'water_source'],
            'ford': ['attack_caravan', 'defend_caravan', 'water_source'],
            'burnt_farm': ['treasure', 'monster', 'wood_gathering'],
            'hunter_blind': ['hunt', 'monster', 'assassin_contract'],
            'sunk_trading_post': ['treasure', 'assassin_contract', 'monster_group'],
            'old_battlefield': ['weapon_find', 'armor_find', 'monster_group'],
            'hermit_hut': ['herb_gathering', 'water_source', 'mushroom_gathering'],
            'caravan_camp': ['attack_caravan', 'defend_caravan', 'monster'],
            'glowing_pool': ['water_source', 'treasure', 'monster']
        };
        
        // Модули действий
        this.actionModules = {};
        
        console.log("✅ ActionSystem инициализирован с новой концепцией (одно действие на клетку)");
    }
    
    // ========== ИНИЦИАЛИЗАЦИЯ МОДУЛЯ ОХОТЫ ==========
    
    async initializeActionModules() {
        console.log("🔄 Инициализация модулей действий...");
        
        // Загружаем модуль охоты
        await this.loadHuntModule();
        
        return true;
    }
    
    async loadHuntModule() {
        console.log("🔄 Загружаем модуль охоты...");
        
        // Проверяем глобальный класс
        if (window.HuntAction) {
            this.actionModules['hunt'] = new window.HuntAction(this);
            console.log("✅ Модуль охоты загружен из глобального класса");
            return true;
        }
        
        // Пробуем загрузить из файла
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
                    
                    if (code.includes('class HuntAction')) {
                        console.log(`✅ Файл найден: ${path}`);
                        
                        // Выполняем код
                        eval(code);
                        
                        // Ждем регистрации класса
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        if (window.HuntAction) {
                            this.actionModules['hunt'] = new window.HuntAction(this);
                            console.log(`✅ Модуль охоты загружен из ${path}`);
                            return true;
                        }
                    }
                }
            } catch (error) {
                console.log(`   ❌ Ошибка: ${error.message}`);
            }
        }
        
        console.error("❌ Не удалось загрузить модуль охоты");
        return false;
    }
    
    // ========== ЗАГРУЗКА ДАННЫХ ==========
    
    async loadCellData() {
        try {
            console.log("📥 ActionSystem: Загружаем данные типов клеток...");
            
            // Загружаем типы клеток
            const cellTypesResponse = await fetch('data/cell_types.json');
            if (cellTypesResponse.ok) {
                const cellData = await cellTypesResponse.json();
                this.cellTypes = cellData.cell_types || {};
                console.log(`✅ Загружено типов клеток: ${Object.keys(this.cellTypes).length}`);
            } else {
                console.warn("⚠️ cell_types.json не загружен, создаем базовые типы");
                this.createDefaultCellTypes();
            }
            
            // Загружаем ресурсы
            const resourcesResponse = await fetch('data/resources.json');
            if (resourcesResponse.ok) {
                const resourcesData = await resourcesResponse.json();
                this.resources = resourcesData;
                console.log(`✅ Загружено ресурсов: ${Object.keys(this.resources).length} категорий`);
            } else {
                console.warn("⚠️ resources.json не загружен, создаем базовые ресурсы");
                this.createDefaultResources();
            }
            
            // Инициализируем модули
            await this.initializeActionModules();
            
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных клеток:", error);
            this.createDefaultCellTypes();
            this.createDefaultResources();
            return false;
        }
    }
    
    // ========== ОПРЕДЕЛЕНИЕ ТИПА КЛЕТКИ И СОБЫТИЯ ==========
    
    determineCellType(cell) {
        if (!cell || !this.mapSystem.currentTacticalMap) return 'forest_crossroads';
        
        const cellKey = `${cell.col},${cell.row}`;
        
        // Если тип уже определен
        if (cell.cellType && this.cellTypes[cell.cellType]) {
            return cell.cellType;
        }
        
        // Определяем тип по типу карты или клетке
        let determinedType = 'forest_crossroads';
        
        if (cell.type === 'water') {
            determinedType = 'ford';
        } else if (cell.type === 'mountain') {
            determinedType = 'cave_entrance';
        } else if (cell.type === 'tree' || cell.type === 'elegant_tree') {
            determinedType = 'hidden_meadow';
        } else if (cell.type === 'castle' || cell.type === 'temple') {
            determinedType = 'lonely_watchtower';
        } else if (cell.type === 'village' || cell.type === 'tavern') {
            determinedType = 'caravan_camp';
        } else if (cell.type === 'graveyard_cross') {
            determinedType = 'old_battlefield';
        }
        
        // Если клетка имеет лут
        if (cell.hasLoot) {
            determinedType = 'treasure';
        }
        
        // Если клетка с монстром
        if (cell.type === 'monster' || cell.type === 'bandit_camp' || cell.type === 'orc_camp') {
            determinedType = this.getRandomCellType(['sunk_trading_post', 'hunter_blind', 'burnt_farm']);
        }
        
        cell.cellType = determinedType;
        
        // Определяем событие для клетки (если еще не определено)
        if (!cell.cellEvent) {
            this.determineCellEvent(cell);
        }
        
        console.log(`🔍 Определен тип клетки [${cell.col},${cell.row}]: ${cell.cellType}, событие: ${cell.cellEvent?.type || 'нет'}`);
        return determinedType;
    }
    
    determineCellEvent(cell) {
        if (!cell || cell.explored) return null;
        
        const cellType = cell.cellType || this.determineCellType(cell);
        const possibleEvents = this.cellTypeToEvent[cellType] || ['monster'];
        
        // Если у клетки уже есть запрограммированное событие
        if (cell.type === 'village' && cell.tacticalMap) {
            cell.cellEvent = {
                type: 'robber_camp',
                ...this.eventTypes['robber_camp']
            };
            return cell.cellEvent;
        }
        
        if (cell.type === 'monster' && cell.monster_id) {
            cell.cellEvent = {
                type: 'monster',
                ...this.eventTypes['monster'],
                specificMonsterId: cell.monster_id
            };
            return cell.cellEvent;
        }
        
        // Выбираем случайное событие
        const randomEventType = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
        const eventTemplate = this.eventTypes[randomEventType];
        
        if (!eventTemplate) {
            console.warn(`⚠️ Событие ${randomEventType} не найдено, используем монстра`);
            cell.cellEvent = { type: 'monster', ...this.eventTypes['monster'] };
            return cell.cellEvent;
        }
        
        // Создаем событие с параметрами
        cell.cellEvent = {
            type: randomEventType,
            ...eventTemplate,
            // Добавляем случайные параметры
            id: `${cell.col}_${cell.row}_${Date.now()}`,
            cellPosition: { row: cell.row, col: cell.col }
        };
        
        // Настраиваем параметры в зависимости от типа
        this.configureEventParameters(cell.cellEvent);
        
        return cell.cellEvent;
    }
    
    configureEventParameters(event) {
        switch(event.type) {
            case 'monster':
                event.monsterLevel = this.getRandomInRange(event.monsterLevel || { min: 1, max: 3 });
                break;
                
            case 'monster_group':
                event.monsterCount = this.getRandomInRange(event.monsterCount || { min: 2, max: 4 });
                event.monsterLevel = this.getRandomInRange(event.monsterLevel || { min: 1, max: 2 });
                break;
                
            case 'attack_caravan':
            case 'defend_caravan':
                event.enemyCount = this.getRandomInRange(event.enemyCount || { min: 1, max: 6 });
                if (event.type === 'defend_caravan') {
                    event.allyCount = this.getRandomInRange(event.allyCount || { min: 1, max: 5 });
                }
                break;
                
            case 'wood_gathering':
            case 'herb_gathering':
            case 'berry_gathering':
            case 'stone_gathering':
            case 'mushroom_gathering':
            case 'ore_gathering':
                if (event.amount) {
                    event.amount = this.getRandomInRange(event.amount);
                }
                break;
        }
    }
    
    getRandomInRange(range) {
        return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    }
    
    getRandomCellType(types) {
        return types[Math.floor(Math.random() * types.length)];
    }
    
    // ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА КЛЕТКИ ==========
    
    updateCellActionsUI(cell) {
        console.log("=== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА КЛЕТКИ ===");
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) {
            console.error("❌ Контейнер действий не найден!");
            return;
        }
        
        if (!cell) {
            actionsContainer.innerHTML = '<div class="no-cell-selected">Выберите клетку на карте</div>';
            return;
        }
        
        const isCurrentPosition = (cell.col === this.mapSystem.playerTacticalPosition.x && 
                                   cell.row === this.mapSystem.playerTacticalPosition.y);
        const isReachable = this.mapSystem.isCellReachable(cell);
        const isExplored = cell.explored === true;
        
        // Определяем тип и событие клетки
        const cellType = this.determineCellType(cell);
        const cellTypeData = this.cellTypes[cellType];
        const cellEvent = cell.cellEvent || this.determineCellEvent(cell);
        
        let html = '';
        
        if (isExplored) {
            // Клетка исследована - показываем результат
            html = this.createExploredCellHTML(cell, cellTypeData, cellEvent);
        } else if (!isReachable) {
            // Клетка недостижима
            html = this.createUnreachableCellHTML(cell, cellTypeData);
        } else if (cellEvent?.isGuard && !isCurrentPosition) {
            // Клетка охраняется - нужно сначала победить монстра
            html = this.createGuardedCellHTML(cell, cellTypeData, cellEvent);
        } else {
            // Клетка доступна для взаимодействия
            html = this.createAvailableCellHTML(cell, cellTypeData, cellEvent, isCurrentPosition);
        }
        
        actionsContainer.innerHTML = html;
        
        // Назначаем обработчики событий
        setTimeout(() => {
            this.setupCellEventListeners(cell);
        }, 50);
    }
    
    createExploredCellHTML(cell, cellTypeData, cellEvent) {
        let eventResult = '';
        
        if (cellEvent) {
            switch(cellEvent.type) {
                case 'robber_camp':
                case 'orc_camp':
                    eventResult = 'Таверна доступна для посещения';
                    break;
                case 'treasure':
                    eventResult = 'Сокровище уже забрано';
                    break;
                case 'water_source':
                    eventResult = 'Источник воды исследован';
                    break;
                default:
                    eventResult = 'Местность исследована';
            }
        }
        
        return `
            <div class="cell-explored">
                <div class="explored-icon">✓</div>
                <h4>Местность исследована</h4>
                <p>${eventResult}</p>
                
                ${cellEvent && (cellEvent.type === 'robber_camp' || cellEvent.type === 'orc_camp') ? `
                    <button class="btn-control visit-tavern-btn" 
                            onclick="game.systems.action.visitTavern(${cell.row}, ${cell.col})"
                            style="margin-top: 15px;">
                        🍻 Посетить таверну
                    </button>
                ` : ''}
                
                ${cellEvent && cellEvent.type === 'water_source' ? `
                    <button class="btn-control use-water-btn" 
                            onclick="game.systems.action.useWaterSource(${cell.row}, ${cell.col})"
                            style="margin-top: 15px;">
                        💧 Использовать источник
                    </button>
                ` : ''}
            </div>
        `;
    }
    
    createUnreachableCellHTML(cell, cellTypeData) {
        return `
            <div class="cell-unreachable">
                <div class="unreachable-icon">🚫</div>
                <h4>Клетка недоступна</h4>
                <p>Подойдите ближе, чтобы взаимодействовать с этой клеткой.</p>
                <p class="hint">Позиция: [${cell.col}, ${cell.row}]</p>
            </div>
        `;
    }
    
    createGuardedCellHTML(cell, cellTypeData, cellEvent) {
        const monsterName = cellEvent.type === 'monster_group' ? 'Группа монстров' : 'Монстр';
        const monsterIcon = cellEvent.type === 'monster_group' ? '👹👹' : '👹';
        
        return `
            <div class="cell-guarded">
                <div class="guarded-icon">${monsterIcon}</div>
                <h4>Территория охраняется</h4>
                <p>${monsterName} патрулирует эту местность.</p>
                <p class="danger">Чтобы исследовать клетку, нужно победить охранника.</p>
                
                <button class="btn-control attack-guard-btn" 
                        onclick="game.systems.action.attackCellGuard(${cell.row}, ${cell.col})"
                        style="margin-top: 15px; background: linear-gradient(135deg, #ef4444, #dc2626);">
                    ⚔️ Атаковать охранника
                </button>
                
                <div class="guard-info" style="margin-top: 15px; padding: 10px; background: rgba(239, 68, 68, 0.1); border-radius: 6px;">
                    <small>После победы над охранником вы сможете исследовать клетку.</small>
                </div>
            </div>
        `;
    }
    
    createAvailableCellHTML(cell, cellTypeData, cellEvent, isCurrentPosition) {
        if (!cellEvent) {
            return `
                <div class="cell-no-event">
                    <div class="no-event-icon">❓</div>
                    <h4>Нет доступных событий</h4>
                    <p>Эта клетка не содержит значимых событий.</p>
                </div>
            `;
        }
        
        const eventConfig = this.eventTypes[cellEvent.type] || {};
        
        let actionButton = '';
        let requirementsInfo = '';
        
        // Проверяем требования
        if (cellEvent.requiresModule && !this.actionModules[cellEvent.type]) {
            requirementsInfo = '<div class="warning">⚠️ Модуль не загружен</div>';
        }
        
        // Создаем кнопку действия
        switch(cellEvent.type) {
            case 'hunt':
                actionButton = `
                    <button class="btn-control start-hunt-btn" 
                            onclick="game.systems.action.startHuntEvent(${cell.row}, ${cell.col})"
                            style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                        🏹 Начать охоту
                    </button>
                `;
                break;
                
            case 'attack_caravan':
                actionButton = `
                    <button class="btn-control attack-caravan-btn" 
                            onclick="game.systems.action.attackCaravan(${cell.row}, ${cell.col})"
                            style="background: linear-gradient(135deg, #ef4444, #dc2626);">
                        🐪💀 Ограбить караван
                    </button>
                `;
                break;
                
            case 'defend_caravan':
                actionButton = `
                    <button class="btn-control defend-caravan-btn" 
                            onclick="game.systems.action.defendCaravan(${cell.row}, ${cell.col})"
                            style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                        🐪🛡️ Защитить караван
                    </button>
                `;
                break;
                
            case 'assassin_contract':
                actionButton = `
                    <button class="btn-control take-contract-btn" 
                            onclick="game.systems.action.takeAssassinContract(${cell.row}, ${cell.col})"
                            style="background: linear-gradient(135deg, #000000, #374151);">
                        🗡️ Взять контракт
                    </button>
                `;
                break;
                
            case 'treasure':
            case 'weapon_find':
            case 'armor_find':
                actionButton = `
                    <button class="btn-control collect-treasure-btn" 
                            onclick="game.systems.action.collectTreasure(${cell.row}, ${cell.col})"
                            style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                        ${eventConfig.icon} Забрать находку
                    </button>
                `;
                break;
                
            case 'wood_gathering':
            case 'herb_gathering':
            case 'berry_gathering':
            case 'stone_gathering':
            case 'mushroom_gathering':
            case 'ore_gathering':
                actionButton = `
                    <button class="btn-control gather-resource-btn" 
                            onclick="game.systems.action.gatherResource(${cell.row}, ${cell.col})"
                            style="background: linear-gradient(135deg, #10b981, #059669);">
                        ${eventConfig.icon} Собрать ресурсы
                    </button>
                `;
                break;
                
            case 'water_source':
                actionButton = `
                    <button class="btn-control use-water-btn" 
                            onclick="game.systems.action.useWaterSource(${cell.row}, ${cell.col})"
                            style="background: linear-gradient(135deg, #0ea5e9, #0284c7);">
                        💧 Использовать источник
                    </button>
                `;
                break;
                
            case 'robber_camp':
            case 'orc_camp':
                actionButton = `
                    <button class="btn-control visit-tavern-btn" 
                            onclick="game.systems.action.visitTavern(${cell.row}, ${cell.col})"
                            style="background: linear-gradient(135deg, #fbbf24, #d97706);">
                        🍻 Посетить таверну
                    </button>
                `;
                break;
        }
        
        return `
            <div class="cell-event">
                <div class="event-header">
                    <div class="event-icon">${eventConfig.icon || '⚡'}</div>
                    <div class="event-title">
                        <h4>${eventConfig.name || cellEvent.type}</h4>
                        <div class="event-type">${this.getEventTypeName(cellEvent.type)}</div>
                    </div>
                </div>
                
                <div class="event-description">
                    <p>${eventConfig.description || 'Описание отсутствует'}</p>
                </div>
                
                ${this.createEventDetails(cellEvent)}
                
                ${requirementsInfo}
                
                <div class="event-actions" style="margin-top: 20px;">
                    ${actionButton}
                    
                    ${!isCurrentPosition ? `
                        <button class="btn-control move-to-cell-btn" 
                                onclick="game.systems.map.moveOnTacticalMap(${cell.col}, ${cell.row})"
                                style="margin-top: 10px; width: 100%;">
                            👣 Перейти к клетке
                        </button>
                    ` : ''}
                </div>
                
                <div class="event-hint" style="margin-top: 15px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px; font-size: 12px;">
                    <small>⚠️ После выполнения действия клетка будет считаться исследованной.</small>
                </div>
            </div>
        `;
    }
    
    createEventDetails(event) {
        let details = '';
        
        switch(event.type) {
            case 'monster':
                details = `
                    <div class="event-detail">
                        <strong>Уровень монстра:</strong> ${event.monsterLevel || 1}
                    </div>
                `;
                break;
                
            case 'monster_group':
                details = `
                    <div class="event-detail">
                        <strong>Количество:</strong> ${event.monsterCount || 2} монстра
                    </div>
                    <div class="event-detail">
                        <strong>Уровень:</strong> ${event.monsterLevel || 1}
                    </div>
                `;
                break;
                
            case 'attack_caravan':
            case 'defend_caravan':
                details = `
                    <div class="event-detail">
                        <strong>Противников:</strong> ${event.enemyCount || 3}
                    </div>
                    ${event.type === 'defend_caravan' ? `
                        <div class="event-detail">
                            <strong>Союзников:</strong> ${event.allyCount || 2}
                        </div>
                    ` : ''}
                `;
                break;
                
            case 'assassin_contract':
                details = `
                    <div class="event-detail">
                        <strong>Награда:</strong> ×${event.rewardMultiplier || 5}
                    </div>
                `;
                break;
                
            case 'wood_gathering':
            case 'herb_gathering':
            case 'berry_gathering':
            case 'stone_gathering':
            case 'mushroom_gathering':
            case 'ore_gathering':
                details = `
                    <div class="event-detail">
                        <strong>Количество:</strong> ${event.amount || 3} единиц
                    </div>
                `;
                break;
        }
        
        if (details) {
            return `<div class="event-details">${details}</div>`;
        }
        
        return '';
    }
    
    getEventTypeName(eventType) {
        const typeNames = {
            'tavern': 'Таверна',
            'battle': 'Бой',
            'battle_with_allies': 'Бой с союзниками',
            'contract': 'Контракт',
            'hunt': 'Охота',
            'resource': 'Ресурсы',
            'water': 'Вода',
            'treasure': 'Сокровище',
            'item': 'Предмет',
            'monster': 'Монстр',
            'monster_group': 'Группа монстров'
        };
        
        return typeNames[eventType] || 'Событие';
    }
    
    // ========== ОБРАБОТЧИКИ СОБЫТИЙ КЛЕТОК ==========
    
    setupCellEventListeners(cell) {
        // Обработчики назначаются через onclick в HTML
    }
    
    // ========== ОСНОВНЫЕ МЕТОДЫ ОБРАБОТКИ СОБЫТИЙ ==========
    
    async startHuntEvent(row, col) {
        console.log(`🏹 Начинаем событие охоты на [${col},${row}]`);
        
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (!cell || !cell.cellEvent || cell.cellEvent.type !== 'hunt') {
            this.showNotification("❌ Это не событие охоты!", 'error');
            return;
        }
        
        // Проверяем модуль охоты
        if (!this.actionModules['hunt']) {
            await this.loadHuntModule();
        }
        
        if (!this.actionModules['hunt']) {
            this.showNotification("❌ Модуль охоты не загружен!", 'error');
            return;
        }
        
        // Запускаем охоту через модуль
        this.actionModules['hunt'].execute(row, col);
    }
    
    attackCellGuard(row, col) {
        console.log(`⚔️ Атакуем охранника клетки [${col},${row}]`);
        
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (!cell || !cell.cellEvent) {
            this.showNotification("❌ Клетка не имеет охранника!", 'error');
            return;
        }
        
        const event = cell.cellEvent;
        
        // Начинаем бой с охранником
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            this.showNotification("❌ Система боя не доступна!", 'error');
            return;
        }
        
        // Сохраняем информацию о клетке для обработки после боя
        this.mapSystem.pendingAction = {
            action: 'clear_guard',
            row: row,
            col: col,
            cell: cell,
            event: event
        };
        
        // Создаем монстра для боя
        let monster;
        
        if (event.type === 'monster_group') {
            // Для группы монстров создаем усиленного монстра
            monster = this.createGroupMonster(event);
        } else {
            // Обычный монстр
            monster = this.createGuardMonster(event);
        }
        
        // Начинаем бой
        battleSystem.startBattleWithSpecificMonster(
            this.mapSystem.currentHero,
            monster,
            'cell_guard'
        );
    }
    
    createGuardMonster(event) {
        const battleSystem = window.game?.systems?.battle;
        const allMonsters = battleSystem?.monsters || [];
        
        // Фильтруем монстров по уровню
        const suitableMonsters = allMonsters.filter(m => 
            (m.level || 1) === (event.monsterLevel || 1)
        );
        
        let monster;
        
        if (suitableMonsters.length > 0) {
            monster = suitableMonsters[Math.floor(Math.random() * suitableMonsters.length)];
        } else if (allMonsters.length > 0) {
            monster = allMonsters[Math.floor(Math.random() * allMonsters.length)];
        } else {
            // Запасной монстр
            monster = {
                id: 'guard_monster',
                name: 'Страж территории',
                level: event.monsterLevel || 1,
                health: 50 + (event.monsterLevel || 1) * 20,
                damage: 10 + (event.monsterLevel || 1) * 5,
                armor: 5 + (event.monsterLevel || 1) * 3
            };
        }
        
        return monster;
    }
    
    createGroupMonster(event) {
        // Создаем усиленного монстра для группы
        return {
            id: 'monster_group',
            name: `Группа монстров (${event.monsterCount || 2})`,
            level: (event.monsterLevel || 1) + 1,
            health: 30 * (event.monsterCount || 2),
            damage: 8 * (event.monsterCount || 2),
            armor: 3 * (event.monsterCount || 2),
            isGroup: true,
            monsterCount: event.monsterCount || 2
        };
    }
    
    attackCaravan(row, col) {
        console.log(`🐪💀 Атакуем караван на [${col},${row}]`);
        
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (!cell || !cell.cellEvent || cell.cellEvent.type !== 'attack_caravan') {
            this.showNotification("❌ Это не караван для нападения!", 'error');
            return;
        }
        
        const event = cell.cellEvent;
        const battleSystem = window.game?.systems?.battle;
        
        if (!battleSystem) {
            this.showNotification("❌ Система боя не доступна!", 'error');
            return;
        }
        
        // Сохраняем информацию для обработки после боя
        this.mapSystem.pendingAction = {
            action: 'attack_caravan',
            row: row,
            col: col,
            cell: cell,
            event: event,
            lootMultiplier: event.lootMultiplier || 2.0
        };
        
        // Создаем врагов для каравана
        const enemies = this.createCaravanEnemies(event.enemyCount || 3);
        
        // Начинаем групповой бой
        battleSystem.startGroupBattle(
            this.mapSystem.currentHero,
            enemies,
            'caravan_attack'
        );
    }
    
    defendCaravan(row, col) {
        console.log(`🐪🛡️ Защищаем караван на [${col},${row}]`);
        
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (!cell || !cell.cellEvent || cell.cellEvent.type !== 'defend_caravan') {
            this.showNotification("❌ Это не караван для защиты!", 'error');
            return;
        }
        
        const event = cell.cellEvent;
        const battleSystem = window.game?.systems?.battle;
        
        if (!battleSystem) {
            this.showNotification("❌ Система боя не доступна!", 'error');
            return;
        }
        
        // Сохраняем информацию для обработки после боя
        this.mapSystem.pendingAction = {
            action: 'defend_caravan',
            row: row,
            col: col,
            cell: cell,
            event: event,
            rewardMultiplier: event.rewardMultiplier || 1.5
        };
        
        // Создаем врагов
        const enemies = this.createCaravanEnemies(event.enemyCount || 3);
        
        // Создаем союзников
        const allies = this.createCaravanAllies(event.allyCount || 2);
        
        // Начинаем бой с союзниками
        battleSystem.startBattleWithAllies(
            this.mapSystem.currentHero,
            enemies,
            allies,
            'caravan_defense'
        );
    }
    
    createCaravanEnemies(count) {
        const battleSystem = window.game?.systems?.battle;
        const allMonsters = battleSystem?.monsters || [];
        const enemies = [];
        
        for (let i = 0; i < count; i++) {
            if (allMonsters.length > 0) {
                const monster = allMonsters[Math.floor(Math.random() * allMonsters.length)];
                enemies.push({
                    ...monster,
                    id: `${monster.id}_caravan_${i}`,
                    name: `${monster.name} (Караван)`
                });
            } else {
                enemies.push({
                    id: `caravan_enemy_${i}`,
                    name: 'Разбойник каравана',
                    level: 2,
                    health: 40,
                    damage: 12,
                    armor: 8
                });
            }
        }
        
        return enemies;
    }
    
    createCaravanAllies(count) {
        const allies = [];
        const possibleAllies = [
            { name: 'Охранник каравана', icon: '🛡️' },
            { name: 'Наемный воин', icon: '⚔️' },
            { name: 'Лучник', icon: '🏹' },
            { name: 'Варвар', icon: '🪓' },
            { name: 'Волшебник', icon: '🔮' }
        ];
        
        for (let i = 0; i < count; i++) {
            const allyType = possibleAllies[Math.floor(Math.random() * possibleAllies.length)];
            allies.push({
                id: `caravan_ally_${i}`,
                name: allyType.name,
                icon: allyType.icon,
                level: 2,
                health: 35,
                damage: 10,
                armor: 6,
                isAlly: true
            });
        }
        
        return allies;
    }
    
    takeAssassinContract(row, col) {
        console.log(`🗡️ Берем контракт на убийство на [${col},${row}]`);
        
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (!cell || !cell.cellEvent || cell.cellEvent.type !== 'assassin_contract') {
            this.showNotification("❌ Это не контракт на убийство!", 'error');
            return;
        }
        
        const event = cell.cellEvent;
        const battleSystem = window.game?.systems?.battle;
        
        if (!battleSystem) {
            this.showNotification("❌ Система боя не доступна!", 'error');
            return;
        }
        
        // Сохраняем информацию для обработки после боя
        this.mapSystem.pendingAction = {
            action: 'assassin_contract',
            row: row,
            col: col,
            cell: cell,
            event: event,
            rewardMultiplier: event.rewardMultiplier || 5.0
        };
        
        // Создаем цель для контракта (усиленный монстр)
        const targetMonster = this.createAssassinTarget();
        
        // Начинаем бой
        battleSystem.startBattleWithSpecificMonster(
            this.mapSystem.currentHero,
            targetMonster,
            'assassin_contract'
        );
    }
    
    createAssassinTarget() {
        const battleSystem = window.game?.systems?.battle;
        const allMonsters = battleSystem?.monsters || [];
        
        // Выбираем самого сильного монстра
        let strongestMonster = allMonsters[0];
        
        for (const monster of allMonsters) {
            if ((monster.level || 1) > (strongestMonster?.level || 1)) {
                strongestMonster = monster;
            }
        }
        
        if (!strongestMonster) {
            strongestMonster = {
                id: 'assassin_target',
                name: 'Цель контракта',
                level: 4,
                health: 120,
                damage: 25,
                armor: 15
            };
        }
        
        // Усиливаем монстра для контракта
        return {
            ...strongestMonster,
            name: `${strongestMonster.name} (Цель контракта)`,
            health: strongestMonster.health * 1.5,
            damage: strongestMonster.damage * 1.3,
            armor: strongestMonster.armor * 1.2,
            isContractTarget: true
        };
    }
    
    collectTreasure(row, col) {
        console.log(`💰 Собираем сокровище на [${col},${row}]`);
        
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (!cell || !cell.cellEvent) {
            this.showNotification("❌ Нет сокровища для сбора!", 'error');
            return;
        }
        
        const event = cell.cellEvent;
        
        // Определяем тип награды
        let reward;
        const random = Math.random() * 100;
        
        if (event.type === 'treasure') {
            if (random < 40) {
                // Предмет
                reward = this.getRandomItem(event.subtype || 'any');
            } else if (random < 70) {
                // Золото
                reward = {
                    type: 'gold',
                    amount: Math.floor(Math.random() * 151) + 50 // 50-200
                };
            } else {
                // Ресурс
                reward = this.getRandomResource();
            }
        } else if (event.type === 'weapon_find') {
            reward = this.getRandomItem('weapon');
        } else if (event.type === 'armor_find') {
            reward = this.getRandomItem('armor');
        }
        
        // Выдаем награду
        this.giveReward(reward, cell);
        
        // Отмечаем клетку как исследованную
        this.completeCellEvent(row, col);
        
        this.showNotification(`✅ Найдено: ${this.getRewardDescription(reward)}`, 'success');
    }
    
    gatherResource(row, col) {
        console.log(`📦 Собираем ресурсы на [${col},${row}]`);
        
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (!cell || !cell.cellEvent) {
            this.showNotification("❌ Нет ресурсов для сбора!", 'error');
            return;
        }
        
        const event = cell.cellEvent;
        const resourceType = event.resourceType;
        const amount = event.amount || 3;
        
        // Получаем случайный ресурс этого типа
        const resources = this.resources[resourceType];
        if (!resources || resources.length === 0) {
            this.showNotification("❌ Ресурсы этого типа не найдены!", 'error');
            return;
        }
        
        const resource = resources[Math.floor(Math.random() * resources.length)];
        
        // Добавляем ресурс герою
        this.addResourceToHero(resource.id, resource.name, amount, resourceType);
        
        // Отмечаем клетку как исследованную
        this.completeCellEvent(row, col);
        
        this.showNotification(`✅ Собрано: ${resource.name} ×${amount}`, 'success');
    }
    
    useWaterSource(row, col) {
        console.log(`💧 Используем источник воды на [${col},${row}]`);
        
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (!cell || !cell.cellEvent || cell.cellEvent.type !== 'water_source') {
            this.showNotification("❌ Это не источник воды!", 'error');
            return;
        }
        
        // Заполняем флягу
        const battleSystem = window.game?.systems?.battle;
        if (battleSystem && battleSystem.flask) {
            battleSystem.flask.currentCharges = battleSystem.flask.capacity;
            battleSystem.flask.content = 'water';
            
            if (battleSystem.updateFlaskUI) {
                battleSystem.updateFlaskUI();
            }
            
            // Восстанавливаем здоровье
            if (this.mapSystem.currentHero) {
                const heroSystem = window.game?.systems?.hero;
                if (heroSystem) {
                    const stats = heroSystem.calculateHeroStats(this.mapSystem.currentHero);
                    this.mapSystem.currentHero.currentHealth = stats.maxHealth;
                }
            }
            
            this.showNotification(`💧 Фляга наполнена водой! Здоровье восстановлено.`, 'success');
            
            // Отмечаем клетку как исследованную
            this.completeCellEvent(row, col);
        } else {
            this.showNotification("❌ Не удалось использовать источник воды", 'error');
        }
    }
    
    visitTavern(row, col) {
        console.log(`🍻 Посещаем таверну на [${col},${row}]`);
        
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (!cell || (!cell.cellEvent || (cell.cellEvent.type !== 'robber_camp' && cell.cellEvent.type !== 'orc_camp'))) {
            this.showNotification("❌ Это не таверна!", 'error');
            return;
        }
        
        // Переходим на карту таверны
        if (cell.cellEvent.tacticalMap) {
            this.mapSystem.handleMapTransition({
                ...cell,
                tacticalMap: cell.cellEvent.tacticalMap
            });
        }
    }
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    
    getRandomItem(subtype = 'any') {
        const itemSystem = window.game?.systems?.equipment;
        if (!itemSystem) return null;
        
        let items = [];
        
        if (subtype === 'weapon') {
            items = itemSystem.items?.weapons || [];
        } else if (subtype === 'armor') {
            items = itemSystem.items?.armor || [];
        } else {
            // Любой предмет
            const allItems = [];
            if (itemSystem.items?.weapons) allItems.push(...itemSystem.items.weapons);
            if (itemSystem.items?.armor) allItems.push(...itemSystem.items.armor);
            items = allItems;
        }
        
        if (items.length === 0) return null;
        
        return items[Math.floor(Math.random() * items.length)];
    }
    
    getRandomResource() {
        const resourceTypes = Object.keys(this.resources).filter(type => 
            type !== 'treasure' && type !== 'gold'
        );
        
        if (resourceTypes.length === 0) return null;
        
        const randomType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
        const resources = this.resources[randomType];
        
        if (!resources || resources.length === 0) return null;
        
        return resources[Math.floor(Math.random() * resources.length)];
    }
    
    giveReward(reward, cell) {
        if (!reward) return;
        
        switch(reward.type) {
            case 'item':
                if (reward.item) {
                    this.addItemToHero(reward.item);
                }
                break;
                
            case 'gold':
                if (this.mapSystem.currentHero) {
                    this.mapSystem.currentHero.gold += (reward.amount || 0);
                }
                break;
                
            case 'resource':
                if (reward.resource) {
                    this.addResourceToHero(
                        reward.resource.id,
                        reward.resource.name,
                        reward.amount || 1,
                        reward.resource.type
                    );
                }
                break;
        }
    }
    
    getRewardDescription(reward) {
        if (!reward) return 'Ничего';
        
        switch(reward.type) {
            case 'item':
                return reward.item?.name || 'Предмет';
            case 'gold':
                return `${reward.amount} золота`;
            case 'resource':
                return `${reward.resource?.name || 'Ресурс'} ×${reward.amount || 1}`;
            default:
                return 'Неизвестная награда';
        }
    }
    
    addItemToHero(item) {
        const itemSystem = window.game?.systems?.equipment;
        if (!itemSystem || !this.mapSystem.currentHero) return false;
        
        return itemSystem.addItemToHero(this.mapSystem.currentHero, item.id);
    }
    
    addResourceToHero(resourceId, resourceName, quantity, resourceType) {
        if (!this.mapSystem.currentHero) return;
        
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
        
        console.log(`📦 Добавлен ресурс ${resourceId}: ${quantity} шт. Всего: ${this.mapSystem.currentHero.resources[resourceId].count}`);
        
        this.updateHeroResourcesUI();
        
        if (window.game) {
            window.game.saveGame();
        }
    }
    
    completeCellEvent(row, col) {
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (cell) {
            cell.explored = true;
            cell.hasAction = false;
            cell.isSelected = false;
            
            // Очищаем событие
            delete cell.cellEvent;
            
            // Перерисовываем карту
            this.mapSystem.drawTacticalMap();
            
            // Обновляем интерфейс
            this.updateCellActionsUI(cell);
        }
    }
    
    // ========== ОБРАБОТКА РЕЗУЛЬТАТОВ БОЯ ==========
    
    completeBattleForCell(victory, escape = false, battleType = 'cell_guard') {
        console.log(`🎲 ActionSystem: Завершение боя ${battleType}, победа: ${victory}`);
        
        if (!this.mapSystem.pendingAction) return;
        
        const { action, row, col, cell, event } = this.mapSystem.pendingAction;
        
        if (victory) {
            switch(action) {
                case 'clear_guard':
                    this.showNotification(`✅ Охранник побежден! Клетка [${col},${row}] теперь доступна для исследования.`, 'success');
                    // Клетка теперь доступна, но не исследована
                    if (cell) {
                        cell.explored = false; // Охранник побежден, но клетка еще не исследована
                        delete cell.cellEvent?.isGuard; // Убираем охрану
                    }
                    break;
                    
                case 'attack_caravan':
                    this.showNotification(`✅ Караван ограблен! Добыча: ×${event.lootMultiplier || 2}`, 'success');
                    this.giveCaravanLoot(event.lootMultiplier || 2.0);
                    this.completeCellEvent(row, col);
                    break;
                    
                case 'defend_caravan':
                    this.showNotification(`✅ Караван спасен! Награда: ×${event.rewardMultiplier || 1.5}`, 'success');
                    this.giveCaravanReward(event.rewardMultiplier || 1.5);
                    this.completeCellEvent(row, col);
                    break;
                    
                case 'assassin_contract':
                    this.showNotification(`✅ Контракт выполнен! Награда: ×${event.rewardMultiplier || 5}`, 'success');
                    this.giveContractReward(event.rewardMultiplier || 5.0);
                    this.completeCellEvent(row, col);
                    break;
                    
                case 'hunt':
                    // Охота обрабатывается через модуль
                    if (this.actionModules['hunt']) {
                        this.actionModules['hunt'].completeHuntAfterBattle(victory, escape);
                    }
                    this.completeCellEvent(row, col);
                    break;
            }
        } else {
            if (escape) {
                this.showNotification(`🏃 Вы сбежали с поля боя`, 'warning');
            } else {
                this.showNotification(`💀 Вы проиграли бой`, 'error');
            }
        }
        
        // Очищаем pending action
        this.mapSystem.pendingAction = null;
        
        // Обновляем интерфейс клетки
        if (cell) {
            setTimeout(() => {
                this.updateCellActionsUI(cell);
            }, 500);
        }
    }
    
    giveCaravanLoot(multiplier) {
        if (!this.mapSystem.currentHero) return;
        
        const baseGold = Math.floor(Math.random() * 101) + 50; // 50-150
        const totalGold = Math.floor(baseGold * multiplier);
        
        this.mapSystem.currentHero.gold += totalGold;
        
        // Также даем случайный ресурс
        const resource = this.getRandomResource();
        if (resource) {
            this.addResourceToHero(resource.id, resource.name, Math.floor(multiplier), resource.type);
        }
        
        this.showNotification(`💰 Получено ${totalGold} золота и ресурсы!`, 'success');
    }
    
    giveCaravanReward(multiplier) {
        if (!this.mapSystem.currentHero) return;
        
        const baseGold = Math.floor(Math.random() * 81) + 30; // 30-110
        const totalGold = Math.floor(baseGold * multiplier);
        
        this.mapSystem.currentHero.gold += totalGold;
        
        this.showNotification(`💰 Награда за защиту: ${totalGold} золота!`, 'success');
    }
    
    giveContractReward(multiplier) {
        if (!this.mapSystem.currentHero) return;
        
        const baseGold = Math.floor(Math.random() * 151) + 100; // 100-250
        const totalGold = Math.floor(baseGold * multiplier);
        
        this.mapSystem.currentHero.gold += totalGold;
        
        // Также даем редкий предмет
        const rareItem = this.getRandomItem();
        if (rareItem) {
            this.addItemToHero(rareItem);
        }
        
        this.showNotification(`💰 Контракт выполнен: ${totalGold} золота и редкий предмет!`, 'success');
    }
    
    // ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА РЕСУРСОВ ==========
    
    updateHeroResourcesUI(containerId = 'heroResourcesList') {
        const resourcesList = document.getElementById(containerId);
        if (!resourcesList || !this.mapSystem.currentHero) return;
        
        if (!this.mapSystem.currentHero.resources || Object.keys(this.mapSystem.currentHero.resources).length === 0) {
            resourcesList.innerHTML = '<div class="no-resources">Ресурсов пока нет</div>';
            return;
        }
        
        let resourcesHTML = '';
        Object.values(this.mapSystem.currentHero.resources).forEach(resource => {
            const icon = this.getResourceIcon(resource.type);
            resourcesHTML += `
                <div class="resource-item">
                    <div class="resource-icon">${icon}</div>
                    <div class="resource-name">${resource.name}</div>
                    <div class="resource-count">×${resource.count}</div>
                </div>
            `;
        });
        
        resourcesList.innerHTML = resourcesHTML;
    }
    
    getResourceIcon(resourceType) {
        const icons = {
            'woods': '🪵',
            'herbs': '🌿',
            'berries': '🫐',
            'stones': '🪨',
            'mushrooms': '🍄',
            'ores': '⛏️',
            'treasure': '💰',
            'water': '💧'
        };
        return icons[resourceType] || '📦';
    }
    
    showNotification(message, type = 'info') {
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    // ========== СОЗДАНИЕ ДЕФОЛТНЫХ ДАННЫХ ==========
    
    createDefaultCellTypes() {
        this.cellTypes = {
            'forest_crossroads': {
                name: "Лесная развилка",
                description: "Место, где охотничья тропа пересекается с более натоптанной дорогой.",
                icon: "🚸",
                image: "images/locations/forest_crossroads.jpg"
            },
            'cave_entrance': {
                name: "Темный вход в пещеру",
                description: "Зияющее отверстие в скале, из которого веет сыростью и запахом гнили.",
                icon: "🕸️",
                image: "images/locations/cave_entrance.jpg"
            }
            // ... остальные типы из вашего файла
        };
    }
    
    createDefaultResources() {
        this.resources = {
            'woods': [
                { id: 'twigs', name: 'Веточки', type: 'woods', rarity: 'common' },
                { id: 'branches', name: 'Ветки', type: 'woods', rarity: 'common' },
                { id: 'logs', name: 'Поленья', type: 'woods', rarity: 'uncommon' }
            ],
            'herbs': [
                { id: 'healing_herbs', name: 'Целебные травы', type: 'herbs', rarity: 'common' },
                { id: 'poison_herbs', name: 'Ядовитые травы', type: 'herbs', rarity: 'uncommon' }
            ],
            'berries': [
                { id: 'wild_berries', name: 'Дикие ягоды', type: 'berries', rarity: 'common' },
                { id: 'medicinal_berries', name: 'Лечебные ягоды', type: 'berries', rarity: 'uncommon' }
            ],
            'stones': [
                { id: 'common_stone', name: 'Обычный камень', type: 'stones', rarity: 'common' },
                { id: 'flint', name: 'Кремень', type: 'stones', rarity: 'common' }
            ],
            'mushrooms': [
                { id: 'common_mushrooms', name: 'Обычные грибы', type: 'mushrooms', rarity: 'common' },
                { id: 'healing_mushrooms', name: 'Целебные грибы', type: 'mushrooms', rarity: 'uncommon' }
            ],
            'ores': [
                { id: 'iron_ore', name: 'Железная руда', type: 'ores', rarity: 'common' },
                { id: 'copper_ore', name: 'Медная руда', type: 'ores', rarity: 'common' }
            ]
        };
    }
}

// Глобальная регистрация
if (typeof window !== 'undefined') {
    window.ActionSystem = ActionSystem;
    console.log("📦 ActionSystem зарегистрирован глобально");
}
