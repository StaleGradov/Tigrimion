"use strict";

class MapSystem {
    constructor() {
        this.globalMaps = [];
        this.localMaps = [];
        this.tacticalMaps = [];
        
        this.currentGlobalMap = null;
        this.currentLocalMap = null;
        this.currentTacticalMap = null;
        
        this.playerGlobalPosition = {x: 0, y: 0};
        this.playerLocalPosition = {x: 0, y: 0};
        this.playerTacticalPosition = {x: 0, y: 0};
        
        this.currentHero = null;
        
        this.loadedJSONMaps = new Map();
        this.activeOverlay = null;
        
        this.canvas = null;
        this.ctx = null;
        this.hexSize = 40;
        this.showGrid = false;
        this.hoveredHex = null;
        
        this.zoomLevel = 1.0;
        this.minZoom = 0.1;
        this.maxZoom = 5.0;
        this.zoomStep = 0.2;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.mapOffset = { x: 0, y: 0 };
        
        this.lastHoveredHex = null;
        this.animationFrame = null;
        
        this.pendingMovement = null;
        
        this.canvasInitialized = false;
        
        this.mapStack = [];
        this.currentMapType = 'local';
        
        this.cellTypes = {};
        this.resources = {};
        this.currentCellType = null;
        this.selectedCell = null;
        this.currentCellActions = [];
        
        this.lootTables = {
            1: {
                gold: { weight: 60, min: 5, max: 20 },
                common_items: { weight: 30, items: ['health_potion', 'mana_potion', 'bread', 'torch'] },
                information: { weight: 10, messages: [
                    "Местный житель рассказал о подозрительной активности в лесу...",
                    "Вы нашли старую карту с отметкой тайника",
                    "Надпись на стене: 'Остерегайтесь теней ночью'"
                ]}
            },
            2: {
                gold: { weight: 50, min: 10, max: 35 },
                common_items: { weight: 35, items: ['health_potion', 'mana_potion', 'antidote', 'torch'] },
                rare_items: { weight: 5, items: ['iron_sword', 'leather_armor'] },
                information: { weight: 10, messages: [
                    "Записка: 'Сокровище спрятано под старым дубом'",
                    "Вы нашли дневник путешественника с полезными заметками"
                ]}
            },
            3: {
                gold: { weight: 40, min: 25, max: 60 },
                common_items: { weight: 30, items: ['health_potion', 'mana_potion', 'antidote'] },
                rare_items: { weight: 15, items: ['steel_sword', 'chain_armor', 'magic_ring'] },
                information: { weight: 15, messages: [
                    "Древние письмена рассказывают о затерянном артефакте",
                    "Карта с отметками скрытых проходов"
                ]}
            },
            4: {
                gold: { weight: 30, min: 40, max: 100 },
                common_items: { weight: 25, items: ['greater_health_potion', 'greater_mana_potion'] },
                rare_items: { weight: 25, items: ['magic_sword', 'plate_armor', 'amulet_protection'] },
                epic_items: { weight: 10, items: ['ancient_artifact', 'dragon_scale'] },
                information: { weight: 10, messages: [
                    "Тайные знания о магических ритуалах",
                    "Координаты легендарного сокровища"
                ]}
            },
            5: {
                gold: { weight: 20, min: 75, max: 200 },
                common_items: { weight: 20, items: ['greater_health_potion', 'greater_mana_potion'] },
                rare_items: { weight: 30, items: ['vampire_blade', 'shadow_armor', 'crystal_amulet'] },
                epic_items: { weight: 25, items: ['ancient_artifact', 'dragon_scale', 'phoenix_feather'] },
                legendary_items: { weight: 5, items: ['vampire_heart', 'eternal_crown'] },
                information: { weight: 5, messages: [
                    "Древние секреты бессмертия",
                    "Местоположение сердца вампирского лорда"
                ]}
            }
        };
        
        this.objectSymbols = {
            'player_start': '⭐',
            'monster': '👹',
            'chest': '📦',
            'npc': '🧙',
            'exit': '🚪',
            'obstacle': '🪨',
            'inactive': '🔴',
            'tree': '🌲',
            'elegant_tree': '🎄',
            'cave': '🕳️',
            'lava_crack': '🌋',
            'graveyard_cross': '⚰️',
            'bandit_camp': '⚔️',
            'orc_camp': '👹',
            'black_monolith': '⬛',
            'weapon': '⚔️',
            'armor': '🛡️',
            'village': '🏘️',
            'castle': '🏰',
            'water': '💧',
            'campfire': '🔥',
            'merchant': '🛒',
            'cart': '🛒',
            'traveler': '🚶',
            'portal': '🌀',
            'ancient_rune': '🔰',
            'magic_crystal': '💎',
            'tavern': '🍻',
            'shop': '🏪',
            'dungeon': '🏰',
            'temple': '⛪',
            'bridge': '🌉',
            'mountain': '⛰️'
        };
        
        this.tooltipElement = null;
        this.currentTooltip = null;
        this.tooltipTimeout = null;
        this.resizeTimeout = null;
        
        console.log("✅ MapSystem инициализирован с интеграцией магазинов и системой действий на клетках");
    }

    // ========== МЕТОДЫ ДЛЯ МАГАЗИНОВ ==========

    handleMerchantClick(merchantCell) {
        if (!this.isPlayerAdjacentToTransition(merchantCell)) {
            this.showTransitionWarning(merchantCell);
            return;
        }

        if (!merchantCell.shopItems || merchantCell.shopItems.length === 0) {
            console.warn("🛒 Магазин пуст - нет товаров в shopItems");
            if (window.game) {
                window.game.showNotification("🛒 Магазин пуст!", 'warning');
            }
            return;
        }

        const shopSystem = window.game?.systems?.shop;
        if (shopSystem && shopSystem.openShop) {
            console.log(`🛒 Открываем магазин: ${merchantCell.shopName || 'Неизвестный магазин'}`);
            shopSystem.openShop(merchantCell);
        } else {
            console.error("❌ ShopSystem не доступна или нет метода openShop");
            if (window.game) {
                window.game.showNotification("❌ Система магазинов недоступна", 'error');
            }
        }
    }

    handleTavernVisit(cell) {
        console.log("🍻 Начало обработки посещения таверны:", cell);
        
        if (!this.currentHero) {
            console.error("❌ Нет текущего героя для посещения таверны");
            return;
        }
        
        if (!this.isPlayerAdjacentToTransition(cell)) {
            console.log("❌ Герой не рядом с таверной");
            this.showTransitionWarning(cell);
            return;
        }
        
        console.log("✅ Герой рядом с таверной, начинаем обработку...");
        
        const heroSystem = window.game?.systems?.hero;
        if (!heroSystem) {
            console.error("❌ HeroSystem не доступна");
            return;
        }
        
        const stats = heroSystem.calculateHeroStats(this.currentHero);
        
        const oldHealth = this.currentHero.currentHealth;
        this.currentHero.currentHealth = stats.maxHealth;
        
        const battleSystem = window.game?.systems?.battle;
        if (battleSystem && battleSystem.flask) {
            const oldCharges = battleSystem.flask.currentCharges;
            battleSystem.flask.currentCharges = battleSystem.flask.capacity;
            battleSystem.flask.content = 'water';
            
            console.log(`💧 Фляга пополнена: ${oldCharges} -> ${battleSystem.flask.currentCharges}`);
            
            if (battleSystem.updateFlaskUI) {
                battleSystem.updateFlaskUI();
            }
            if (battleSystem.updateFlaskChargesDisplay) {
                battleSystem.updateFlaskChargesDisplay();
            }
            
            setTimeout(() => {
                if (battleSystem.updateFlaskChargesDisplay) {
                    battleSystem.updateFlaskChargesDisplay();
                    console.log("💧 Интерфейс фляги обновлен после таверны");
                }
            }, 100);
        }
        
        if (window.game) {
            window.game.saveGame();
            window.game.showNotification(`🍻 Таверна: здоровье ${oldHealth}→${stats.maxHealth}, фляга пополнена!`, 'success');
        }
        
        console.log(`🍻 Герой ${this.currentHero.name} посетил таверну, здоровье восстановлено`);
        
        this.drawTacticalMap();
    }

    handleWaterCell(cell) {
        if (!this.currentHero) return;
        
        if (!this.isPlayerAdjacentToWater(cell)) {
            this.showTransitionWarning(cell);
            return;
        }
        
        const battleSystem = window.game?.systems?.battle;
        if (battleSystem && battleSystem.flask) {
            const heroSystem = window.game?.systems?.hero;
            if (heroSystem) {
                const stats = heroSystem.calculateHeroStats(this.currentHero);
                const oldHealth = this.currentHero.currentHealth;
                this.currentHero.currentHealth = stats.maxHealth;
                console.log(`❤️ Здоровье восстановлено: ${oldHealth} → ${stats.maxHealth}`);
            }
            
            const oldCharges = battleSystem.flask.currentCharges;
            battleSystem.flask.currentCharges = battleSystem.flask.capacity;
            battleSystem.flask.content = 'water';
            
            if (battleSystem.updateFlaskUI) {
                battleSystem.updateFlaskUI();
            }
            if (battleSystem.updateFlaskChargesDisplay) {
                battleSystem.updateFlaskChargesDisplay();
            }
            
            if (window.game) {
                window.game.showNotification(
                    `💧 Фляга наполнена водой: ${oldCharges}→${battleSystem.flask.capacity} зарядов! ` +
                    `Здоровье восстановлено до максимума.`, 
                    'success'
                );
                window.game.saveGame();
            }
            
            console.log(`💧 Герой ${this.currentHero.name} пополнил флягу у воды: ${oldCharges}→${battleSystem.flask.capacity}`);
            
            this.drawTacticalMap();
        }
    }

    isPlayerAdjacentToWater(waterCell) {
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        
        return neighbors.some(neighbor => 
            neighbor.row === waterCell.row && 
            neighbor.col === waterCell.col
        );
    }

    showTransitionWarning(transitionCell) {
        const transitionName = this.getTransitionName(transitionCell);
        let message = `Чтобы использовать ${transitionName}, нужно подойти вплотную!`;
        
        if (transitionCell.type === 'water') {
            message = "💧 Чтобы использовать источник воды, нужно подойти к нему вплотную!";
        }
        
        console.log(`🚫 ${message}`);
        
        if (window.game) {
            window.game.showNotification(message, 'warning');
        }
        
        this.highlightTransition(transitionCell);
    }

    getTransitionName(transitionCell) {
        if (transitionCell.tacticalMap) {
            return this.getLocationNameFromPath(transitionCell.tacticalMap) || "помещение";
        }
        if (transitionCell.localMap) {
            return this.getLocationNameFromPath(transitionCell.localMap) || "локацию";
        }
        if (transitionCell.globalMap) {
            return this.getLocationNameFromPath(transitionCell.globalMap) || "регион";
        }
        if (transitionCell.type === 'exit') {
            return "выход";
        }
        if (transitionCell.type === 'water') {
            return "источник воды";
        }
        
        return "переход";
    }

    // ========== СИСТЕМА ДЕЙСТВИЙ НА КЛЕТКАХ ==========

    async loadCellData() {
        try {
            console.log("📥 Загружаем данные типов клеток и ресурсов...");
            
            const [cellTypesResponse, resourcesResponse] = await Promise.all([
                fetch('data/cell_types.json').catch(() => null),
                fetch('data/resources.json').catch(() => null)
            ]);
            
            if (cellTypesResponse && cellTypesResponse.ok) {
                const cellData = await cellTypesResponse.json();
                this.cellTypes = cellData.cell_types || {};
                console.log(`✅ Загружено типов клеток: ${Object.keys(this.cellTypes).length}`);
            } else {
                console.warn("❌ cell_types.json не загружен, создаем базовые типы");
                this.createDefaultCellTypes();
            }
            
            if (resourcesResponse && resourcesResponse.ok) {
                const resourcesData = await resourcesResponse.json();
                this.resources = resourcesData;
                console.log(`✅ Загружено ресурсов: ${Object.keys(this.resources).length} категорий`);
            } else {
                console.warn("❌ resources.json не загружен, создаем базовые ресурсы");
                this.createDefaultResources();
            }
            
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных клеток:", error);
            this.createDefaultCellTypes();
            this.createDefaultResources();
            return false;
        }
    }

    createDefaultCellTypes() {
        this.cellTypes = {
            'grave': {
                name: "Могила крестьянина",
                description: "Старая могила, возможно, здесь что-то закопано...",
                actions: ['search_treasure'],
                icon: '⚰️',
                loot_chances: { items: 70, gold: 25, nothing: 5 }
            },
            'small_stream': {
                name: "Небольшой ручей",
                description: "Чистый источник воды, можно пополнить флягу",
                actions: ['refill_flask'],
                icon: '💧',
                flask_refill: { min: 3, max: 10, chance: 100 }
            },
            'shallow_burrow': {
                name: "Неглубокая нора",
                description: "Нора какого-то животного, может содержать ресурсы",
                actions: ['search_ore', 'search_stone'],
                icon: '🕳️',
                resource_chances: { ores: 40, stones: 40, nothing: 20 }
            },
            'berry_clearing': {
                name: "Поляна с ягодами",
                description: "Поляна, усыпанная различными ягодами",
                actions: ['search_berries', 'search_herbs'],
                icon: '🫐',
                resource_chances: { berries: 60, herbs: 30, nothing: 10 }
            },
            'mushroom_grove': {
                name: "Грибная роща",
                description: "Тенистая местность, богатая грибами",
                actions: ['search_mushrooms', 'search_herbs'],
                icon: '🍄',
                resource_chances: { mushrooms: 70, herbs: 20, nothing: 10 }
            },
            'ancient_tree': {
                name: "Древнее дерево",
                description: "Огромное старое дерево, возможно, содержит ценные ресурсы",
                actions: ['search_wood', 'search_herbs'],
                icon: '🌳',
                resource_chances: { woods: 50, herbs: 30, rare_herbs: 10, nothing: 10 }
            },
            'rocky_outcrop': {
                name: "Скальный выступ",
                description: "Каменное образование, богатое минералами",
                actions: ['search_ore', 'search_stone'],
                icon: '⛰️',
                resource_chances: { ores: 50, stones: 40, rare_ores: 5, nothing: 5 }
            }
        };
    }

    createDefaultResources() {
        this.resources = {
            herbs: [
                { id: 'arnica', name: '🌿 Арника', type: 'herb', rarity: 'common', description: 'Известна своими заживляющими свойствами' },
                { id: 'willow_bark', name: '🍂 Кора Ивы', type: 'herb', rarity: 'common', description: 'Содержит природные обезболивающие' },
                { id: 'coffee_beans', name: '☕️ Кофейные зерна', type: 'herb', rarity: 'uncommon', description: 'Для бодрящих отваров' }
            ],
            berries: [
                { id: 'elderberry', name: '🫐 Бузина', type: 'berry', rarity: 'common', description: 'Укрепляет иммунитет и бодрит' },
                { id: 'rosehip', name: '🌰 Шиповник', type: 'berry', rarity: 'common', description: 'Богат витаминами, тонизирует' }
            ],
            mushrooms: [
                { id: 'tea_mushroom', name: '🍄 Чайный гриб', type: 'mushroom', rarity: 'uncommon', description: 'Основа для ферментированных целебных напитков' }
            ],
            ores: [
                { id: 'iron_ore', name: '⛏️ Железная руда', type: 'ore', rarity: 'common', description: 'Базовая руда для изготовления оружия и доспехов' },
                { id: 'copper_ore', name: '⛏️ Медная руда', type: 'ore', rarity: 'common', description: 'Используется для украшений и инструментов' }
            ],
            stones: [
                { id: 'flint', name: '🪨 Кремень', type: 'stone', rarity: 'common', description: 'Для розжига огня и создания инструментов' },
                { id: 'quartz', name: '🪨 Кварц', type: 'stone', rarity: 'uncommon', description: 'Полупрозрачный кристалл с магическими свойствами' }
            ],
            woods: [
                { id: 'oak_wood', name: '🪵 Дубовая древесина', type: 'wood', rarity: 'common', description: 'Прочная древесина для строительства и оружия' },
                { id: 'pine_wood', name: '🪵 Сосновая древесина', type: 'wood', rarity: 'common', description: 'Легкая и ароматная древесина' }
            ]
        };
    }

 determineCellType(cell) {
    if (!cell || !this.currentTacticalMap) return 'unknown';
    
    const cellKey = `${cell.col},${cell.row}`;
    
    // Если у клетки уже определен тип - используем его
    if (cell.cellType && this.cellTypes[cell.cellType]) {
        return cell.cellType;
    }
    
    // Определяем тип по свойствам клетки
    if (cell.type === 'water') {
        cell.cellType = 'small_stream';
    } else if (cell.type === 'graveyard_cross') {
        cell.cellType = 'grave';
    } else if (cell.type === 'cave') {
        cell.cellType = 'shallow_burrow';
    } else if (cell.type === 'tree' || cell.type === 'elegant_tree') {
        // Для деревьев используем детерминированный выбор на основе координат
        const seed = cell.col * 31 + cell.row * 17;
        cell.cellType = (seed % 2 === 0) ? 'ancient_tree' : 'berry_clearing';
    } else if (cell.type === 'mountain') {
        cell.cellType = 'rocky_outcrop';
    } else if (cell.type === 'campfire') {
        const seed = cell.col * 23 + cell.row * 37;
        cell.cellType = (seed % 2 === 0) ? 'mushroom_grove' : 'berry_clearing';
    } else if (cell.hasLoot) {
        cell.cellType = 'grave';
    } else {
        // Для обычных клеток используем детерминированный рандом на основе координат
        const seed = cell.col * 47 + cell.row * 29;
        const availableTypes = Object.keys(this.cellTypes);
        const randomIndex = seed % availableTypes.length;
        cell.cellType = availableTypes[randomIndex];
    }
    
    console.log(`🔍 Определен тип клетки [${cell.col},${cell.row}]: ${cell.cellType} (исходный тип: ${cell.type})`);
    return cell.cellType;
}

updateCellActionsUI(cell) {
    const actionsContainer = document.getElementById('cellActionsContainer');
    if (!actionsContainer) {
        console.error("❌ Контейнер действий не найден! ID: cellActionsContainer");
        return;
    }
    
    console.log(`📋 Обновляем UI действий для клетки [${cell.col}, ${cell.row}] тип: ${cell.type}`);
    
    this.selectedCell = cell;
    this.currentCellType = this.determineCellType(cell);
    const cellTypeData = this.cellTypes[this.currentCellType];
    
    if (!cellTypeData) {
        console.error(`❌ Данные типа клетки не найдены: ${this.currentCellType}`);
        actionsContainer.innerHTML = '<div class="no-actions">❌ Тип местности не определен</div>';
        return;
    }
    
    // Получаем иконку из objectSymbols или из cellTypeData
    const cellIcon = this.objectSymbols[cell.type] || cellTypeData.icon || '❓';
    
    // Получаем описание из tooltip или создаем свое
    let cellDescription = '';
    
    if (cell.tooltip) {
        // Если есть tooltip, используем его
        cellDescription = cell.tooltip.replace(/\\n/g, '\n');
    } else {
        // Иначе создаем описание на основе типа клетки
        const baseDescription = this.getBaseCellDescription(cell.type);
        cellDescription = baseDescription + '\n\n' + cellTypeData.description;
    }
    
    // Проверяем, исследована ли клетка
    const isExplored = cell.explored || cell.hasAction === false;
    const isCurrentPosition = (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y);
    const isReachable = this.isCellReachable(cell);
    
    let actionsHTML = `
        <div class="cell-info-header">
            <div class="cell-icon-large">${cellIcon}</div>
            <h4 class="cell-name">${cellTypeData.name}</h4>
            <div class="cell-position-info">
                <span class="cell-coords">Позиция: [${cell.col}, ${cell.row}]</span>
                ${isCurrentPosition ? '<span class="current-position-badge">📍 Вы здесь</span>' : ''}
            </div>
            <div class="cell-detailed-description">
                ${cellDescription}
            </div>
    `;
    
    if (isExplored) {
        actionsHTML += '<div class="cell-status">✓ Исследовано</div>';
    } else if (isCurrentPosition) {
        actionsHTML += '<div class="cell-status current">📍 Ваша текущая позиция</div>';
    }
    
    actionsHTML += '</div>';
    
    // Показываем действия только если клетка не исследована
    if (!isExplored) {
        this.currentCellActions = cellTypeData.actions;
        
        if (this.currentCellActions.length > 0) {
            actionsHTML += `
                <div class="available-actions-list">
                    <div class="actions-header">
                        <span class="actions-title">Доступные действия:</span>
            `;
            
            if (!isCurrentPosition && !isReachable) {
                actionsHTML += '<span class="reachability-warning">❌ Подойдите ближе</span>';
            } else if (isCurrentPosition) {
                actionsHTML += '<span class="reachability-success">✅ Доступно</span>';
            }
            
            actionsHTML += '</div>';
            
            // Показываем только доступные действия
            const availableActions = this.currentCellActions.filter(action => {
                if (isCurrentPosition) return true;
                if (isReachable) return true;
                return false;
            });
            
            if (availableActions.length > 0) {
                availableActions.forEach(action => {
                    actionsHTML += this.getActionButtonHTML(action, cell, isCurrentPosition || isReachable);
                });
                
                // Добавляем информацию о шансах
                if (cellTypeData.loot_chances) {
                    actionsHTML += `
                        <div class="chances-info">
                            <div class="chances-title">📊 Шансы находок:</div>
                    `;
                    
                    for (const [result, chance] of Object.entries(cellTypeData.loot_chances)) {
                        actionsHTML += `<div class="chance-item">${this.getChanceName(result)}: <span class="chance-value">${chance}%</span></div>`;
                    }
                    
                    actionsHTML += '</div>';
                }
            } else {
                actionsHTML += `
                    <div class="no-available-actions">
                        <div class="no-actions-icon">🚫</div>
                        <p>Действия недоступны. Подойдите к клетке.</p>
                    </div>
                `;
            }
            
            actionsHTML += '</div>';
        } else {
            actionsHTML += '<div class="no-actions">❌ Нет доступных действий</div>';
        }
    } else {
        actionsHTML += `
            <div class="cell-explored">
                <div class="explored-icon">✓</div>
                <h5>Местность исследована</h5>
                <p>Вы уже исследовали эту местность.</p>
                <p class="hint">Перейдите на другую клетку для новых действий.</p>
            </div>
        `;
    }
    
    actionsContainer.innerHTML = actionsHTML;
    
    // Настраиваем обработчики только для доступных действий
    if (!isExplored && (isCurrentPosition || isReachable)) {
        this.setupActionEventListeners();
    }
    
    this.updateHeroResourcesUI();
}


// Добавляем вспомогательный метод для получения базового описания клетки
getBaseCellDescription(cellType) {
    const descriptions = {
        'player_start': '⭐ Стартовая позиция героя',
        'monster': '👹 Враждебная территория - возможен бой!',
        'chest': '📦 Тайный сундук - может содержать сокровища',
        'npc': '🧙 Встреча с персонажем - возможно даст задание',
        'exit': '🚪 Выход с карты',
        'obstacle': '🪨 Препятствие - непроходимо',
        'tree': '🌲 Дерево - возможно содержит ресурсы',
        'elegant_tree': '🎄 Дерево - возможно содержит ресурсы',
        'cave': '🕳️ Пещера - вход в подземелье',
        'lava_crack': '🌋 Лавовый разлом - опасно!',
        'graveyard_cross': '⚰️ Кладбище - может содержать сокровища',
        'bandit_camp': '⚔️ Лагерь разбойников - опасно!',
        'orc_camp': '👹 Лагерь орков - очень опасно!',
        'black_monolith': '⬛ Загадочный монолит',
        'weapon': '⚔️ Оружие - возможно найдете что-то полезное',
        'armor': '🛡️ Доспех - возможно найдете что-то полезное',
        'village': '🏘️ Деревня - мирное поселение',
        'castle': '🏰 Замок - резиденция правителя',
        'water': '💧 Водоем - можно пополнить флягу',
        'campfire': '🔥 Костер - место для отдыха',
        'merchant': '🛒 Торговец - можно купить предметы',
        'cart': '🛒 Телега - возможна торговля',
        'traveler': '🚶 Путник - может дать информацию',
        'portal': '🌀 Магический портал - телепортация',
        'ancient_rune': '🔰 Древняя руна - магический символ',
        'magic_crystal': '💎 Магический кристалл - источник магии',
        'tavern': '🍻 Таверна - место отдыха',
        'shop': '🏪 Магазин - торговля',
        'dungeon': '🏰 Подземелье - опасно',
        'temple': '⛪ Храм - священное место',
        'bridge': '🌉 Мост - переправа',
        'mountain': '⛰️ Гора - непроходимо'
    };
    
    return descriptions[cellType] || 'Неизвестная местность';
}

// Метод для получения названия шансов
getChanceName(chance) {
    const names = {
        'items': 'Предметы',
        'gold': 'Золото',
        'nothing': 'Ничего',
        'ores': 'Руда',
        'stones': 'Камни',
        'berries': 'Ягоды',
        'herbs': 'Травы',
        'rare_herbs': 'Редкие травы',
        'mushrooms': 'Грибы',
        'woods': 'Древесина',
        'rare_ores': 'Редкая руда'
    };
    return names[chance] || chance;
}



    
getChanceName(chance) {
    const names = {
        'items': 'Находка предметов',
        'gold': 'Находка золота',
        'nothing': 'Ничего не найдено',
        'ores': 'Руда',
        'stones': 'Камни',
        'berries': 'Ягоды',
        'herbs': 'Травы',
        'rare_herbs': 'Редкие травы',
        'mushrooms': 'Грибы',
        'woods': 'Древесина',
        'rare_ores': 'Редкая руда'
    };
    return names[chance] || chance;
}

getActionButtonHTML(action, cell, isAvailable = true) {
    const actionConfigs = {
        'search_treasure': {
            icon: '💰',
            name: 'Искать сокровища',
            description: 'Попытаться найти что-то ценное',
            class: 'action-treasure'
        },
        'refill_flask': {
            icon: '💧',
            name: 'Наполнить флягу',
            description: 'Пополнить запасы воды',
            class: 'action-flask'
        },
        'search_ore': {
            icon: '⛏️',
            name: 'Искать руду',
            description: 'Поиск полезных ископаемых',
            class: 'action-ore'
        },
        'search_stone': {
            icon: '🪨',
            name: 'Искать камни',
            description: 'Собрать строительные материалы',
            class: 'action-stone'
        },
        'search_berries': {
            icon: '🫐',
            name: 'Собрать ягоды',
            description: 'Набрать съедобных ягод',
            class: 'action-berries'
        },
        'search_herbs': {
            icon: '🌿',
            name: 'Собрать травы',
            description: 'Найти лекарственные растения',
            class: 'action-herbs'
        },
        'search_mushrooms': {
            icon: '🍄',
            name: 'Собрать грибы',
            description: 'Найти съедобные грибы',
            class: 'action-mushrooms'
        },
        'search_wood': {
            icon: '🪵',
            name: 'Заготовить древесину',
            description: 'Срубить дерево для получения древесины',
            class: 'action-wood'
        }
    };
    
    const config = actionConfigs[action] || {
        icon: '❓',
        name: action,
        description: 'Неизвестное действие',
        class: 'action-unknown'
    };
    
    const isCurrentPosition = (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y);
    const isCellExplored = cell.explored || cell.hasAction === false;
    
    return `
        <button class="cell-action-btn ${config.class} ${!isAvailable ? 'disabled' : ''}" 
                data-action="${action}"
                data-cell-row="${cell.row}"
                data-cell-col="${cell.col}"
                ${!isAvailable ? 'disabled' : ''}
                ${isAvailable ? `onclick="game.systems.map.performCellAction('${action}', ${cell.row}, ${cell.col})"` : ''}>
            <span class="action-icon">${config.icon}</span>
            <div class="action-info">
                <div class="action-name">${config.name}</div>
                <div class="action-description">${config.description}</div>
                ${isAvailable ? '<div class="action-available">✅ Доступно</div>' : '<div class="action-unavailable">❌ Недоступно</div>'}
            </div>
        </button>
    `;
}

setupActionEventListeners() {
    const actionButtons = document.querySelectorAll('.cell-action-btn:not(.disabled)');
    console.log(`🎯 Найдено ${actionButtons.length} доступных кнопок действий`);
    
    actionButtons.forEach(button => {
        const action = button.dataset.action;
        const row = parseInt(button.dataset.cellRow);
        const col = parseInt(button.dataset.cellCol);
        
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`🎯 Клик по действию: ${action} на клетке [${col}, ${row}]`);
            this.performCellAction(action, row, col);
        });
    });
}

performCellAction(action, row, col) {
    console.log(`🎯 Начало выполнения действия: ${action} на клетке [${col}, ${row}]`);
    
    if (!this.currentHero) {
        console.error("❌ Нет текущего героя для совершения действий!");
        this.showNotification("❌ Нужен герой для совершения действий!", 'error');
        return;
    }
    
    const cellKey = `${col},${row}`;
    const cell = this.currentTacticalMap?.cells[cellKey];
    
    if (!cell) {
        console.error(`❌ Клетка [${col}, ${row}] не найдена в текущей карте`);
        this.showNotification("❌ Клетка не найдена!", 'error');
        return;
    }
    
    console.log(`📊 Проверка клетки: исследовано=${cell.explored}, hasAction=${cell.hasAction}`);
    
    if (cell.explored || cell.hasAction === false) {
        console.warn(`⚠️ Клетка [${col}, ${row}] уже исследована`);
        this.showNotification("❌ Эта клетка уже исследована!", 'warning');
        return;
    }
    
    const isReachable = this.isCellReachable(cell);
    console.log(`🎯 Клетка достижима: ${isReachable}`);
    
    if (!isReachable) {
        console.warn(`⚠️ Клетка [${col}, ${row}] недоступна для исследования`);
        this.showNotification("❌ Клетка недоступна для исследования! Подойдите ближе.", 'warning');
        return;
    }
    
    console.log(`✅ Все проверки пройдены, выполняем действие: ${action}`);
    
    // Анимация выполнения действия
    const actionsContainer = document.getElementById('cellActionsContainer');
    if (actionsContainer) {
        console.log(`🎨 Показываем анимацию выполнения действия`);
        
        // Используем this.getActionName() вместо this.getActionName
        const actionName = this.getActionName(action);
        
        actionsContainer.innerHTML = `
            <div class="action-processing">
                <div class="processing-icon">⚡</div>
                <h4>Выполняется действие...</h4>
                <p>${actionName} на клетке [${col}, ${row}]</p>
                <div class="processing-progress">
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Запускаем анимацию прогресса
        setTimeout(() => {
            const progressFill = actionsContainer.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = '100%';
            }
        }, 50);
    }
    
    // Задержка для имитации выполнения действия
    setTimeout(() => {
        console.log(`⚡ Выполняем действие: ${action}`);
        
        let resultMessage = '';
        let resultType = 'info';
        
        switch(action) {
            case 'search_treasure':
                this.searchTreasure(row, col);
                break;
            case 'refill_flask':
                this.refillFlaskFromStream(row, col);
                break;
            case 'search_ore':
                this.searchForResource('ores', row, col);
                break;
            case 'search_stone':
                this.searchForResource('stones', row, col);
                break;
            case 'search_berries':
                this.searchForResource('berries', row, col);
                break;
            case 'search_herbs':
                this.searchForResource('herbs', row, col);
                break;
            case 'search_mushrooms':
                this.searchForResource('mushrooms', row, col);
                break;
            case 'search_wood':
                this.searchForResource('woods', row, col);
                break;
            default:
                console.warn(`❌ Неизвестное действие: ${action}`);
                resultMessage = "❌ Неизвестное действие";
                resultType = 'error';
                this.showNotification(resultMessage, resultType);
        }
        
        console.log(`✅ Действие ${action} выполнено, помечаем клетку как исследованную`);
        this.markCellAsExplored(row, col);
        
    }, 800); // 800ms для анимации
}

    searchTreasure(row, col) {
        const cellTypeData = this.cellTypes[this.currentCellType];
        if (!cellTypeData) return;
        
        const roll = Math.random() * 100;
        let cumulative = 0;
        
        for (const [result, chance] of Object.entries(cellTypeData.loot_chances)) {
            cumulative += chance;
            if (roll <= cumulative) {
                this.handleTreasureResult(result, row, col);
                return;
            }
        }
    }

    handleTreasureResult(result, row, col) {
        switch(result) {
            case 'items':
                this.giveRandomItem(row, col);
                break;
            case 'gold':
                const goldAmount = Math.floor(Math.random() * 21) + 5;
                this.currentHero.gold += goldAmount;
                this.showNotification(`💰 Найдено ${goldAmount} золотых монет!`, 'success');
                break;
            case 'nothing':
                this.showNotification("❌ Ничего не найдено...", 'warning');
                break;
        }
        
        this.markCellAsExplored(row, col);
    }

    giveRandomItem(row, col) {
        const itemSystem = window.game?.systems?.equipment;
        if (!itemSystem) {
            this.showNotification("❌ Система предметов недоступна", 'error');
            return;
        }
        
        const possibleItems = [
            'health_potion', 'mana_potion', 'rusty_sword', 'leather_armor',
            'iron_sword', 'steel_helmet', 'silver_ring', 'bronze_amulet',
            'torch', 'bread', 'antidote', 'bandage'
        ];
        
        const randomItemId = possibleItems[Math.floor(Math.random() * possibleItems.length)];
        const itemAdded = itemSystem.addItemToHero(this.currentHero, randomItemId);
        
        if (itemAdded) {
            const item = itemSystem.getItemById(randomItemId);
            this.showNotification(`🎁 Найден предмет: ${item?.name || randomItemId}!`, 'success');
        } else {
            this.showNotification("📦 Инвентарь полен! Предмет потерян.", 'warning');
        }
    }

    refillFlaskFromStream(row, col) {
        const cellTypeData = this.cellTypes[this.currentCellType];
        if (!cellTypeData || !cellTypeData.flask_refill) return;
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem || !battleSystem.flask) {
            this.showNotification("❌ Система фляги недоступна", 'error');
            return;
        }
        
        const refillConfig = cellTypeData.flask_refill;
        if (Math.random() * 100 > refillConfig.chance) {
            this.showNotification("💧 Источник пересох или загрязнен", 'warning');
            this.markCellAsExplored(row, col);
            return;
        }
        
        const refillAmount = Math.floor(
            Math.random() * (refillConfig.max - refillConfig.min + 1)
        ) + refillConfig.min;
        
        const oldCharges = battleSystem.flask.currentCharges;
        battleSystem.flask.currentCharges = Math.min(
            battleSystem.flask.capacity,
            oldCharges + refillAmount
        );
        
        battleSystem.flask.content = 'water';
        
        if (battleSystem.updateFlaskUI) battleSystem.updateFlaskUI();
        if (battleSystem.updateFlaskChargesDisplay) battleSystem.updateFlaskChargesDisplay();
        
        this.showNotification(
            `💧 Фляга пополнена на ${refillAmount} зарядов! (${oldCharges}→${battleSystem.flask.currentCharges})`,
            'success'
        );
        
        this.markCellAsExplored(row, col);
    }

    searchForResource(resourceType, row, col) {
        const cellTypeData = this.cellTypes[this.currentCellType];
        if (!cellTypeData || !cellTypeData.resource_chances) return;
        
        const roll = Math.random() * 100;
        let cumulative = 0;
        
        for (const [result, chance] of Object.entries(cellTypeData.resource_chances)) {
            cumulative += chance;
            if (roll <= cumulative) {
                if (result === 'nothing') {
                    this.showNotification("❌ Ничего не найдено...", 'warning');
                    this.markCellAsExplored(row, col);
                } else if (result === resourceType || result.includes(resourceType)) {
                    this.giveResource(resourceType, row, col);
                } else {
                    this.showNotification(`Найдено что-то другое... (${result})`, 'info');
                    this.markCellAsExplored(row, col);
                }
                return;
            }
        }
    }

    giveResource(resourceType, row, col) {
        const resources = this.resources[resourceType];
        if (!resources || resources.length === 0) {
            this.showNotification("❌ Ресурсы этого типа не найдены", 'error');
            this.markCellAsExplored(row, col);
            return;
        }
        
        const randomResource = resources[Math.floor(Math.random() * resources.length)];
        const quantity = this.getResourceQuantity(randomResource.rarity);
        
        this.addResourceToHero(randomResource.id, randomResource.name, quantity);
        
        this.showNotification(
            `✅ Найдено: ${randomResource.name} x${quantity}`,
            'success'
        );
        
        this.markCellAsExplored(row, col);
    }

    getResourceQuantity(rarity) {
        const quantities = {
            'common': { min: 1, max: 3 },
            'uncommon': { min: 1, max: 2 },
            'rare': { min: 1, max: 1 },
            'epic': { min: 1, max: 1 }
        };
        
        const range = quantities[rarity] || quantities.common;
        return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    }

    addResourceToHero(resourceId, resourceName, quantity) {
        if (!this.currentHero.resources) {
            this.currentHero.resources = {};
        }
        
        if (!this.currentHero.resources[resourceId]) {
            this.currentHero.resources[resourceId] = {
                id: resourceId,
                name: resourceName,
                count: 0,
                type: this.getResourceType(resourceId)
            };
        }
        
        this.currentHero.resources[resourceId].count += quantity;
        
        console.log(`📦 Добавлен ресурс ${resourceId}: ${quantity} шт. Всего: ${this.currentHero.resources[resourceId].count}`);
        
        this.updateHeroResourcesUI();
        
        if (window.game) {
            window.game.saveGame();
        }
    }

    getResourceType(resourceId) {
        for (const [type, resources] of Object.entries(this.resources)) {
            if (resources.some(r => r.id === resourceId)) {
                return type;
            }
        }
        return 'unknown';
    }

    updateHeroResourcesUI() {
        const resourcesList = document.getElementById('heroResourcesList');
        if (!resourcesList || !this.currentHero) return;
        
        if (!this.currentHero.resources || Object.keys(this.currentHero.resources).length === 0) {
            resourcesList.innerHTML = '<div class="no-resources">Ресурсов пока нет</div>';
            return;
        }
        
        let resourcesHTML = '';
        Object.values(this.currentHero.resources).forEach(resource => {
            const resourceData = this.getResourceDataById(resource.id);
            const icon = this.getResourceIcon(resource.type);
            
            resourcesHTML += `
                <div class="resource-item">
                    <span class="resource-icon">${icon}</span>
                    <span class="resource-name">${resource.name}</span>
                    <span class="resource-count">x${resource.count}</span>
                </div>
            `;
        });
        
        resourcesList.innerHTML = resourcesHTML;
    }

    getResourceDataById(resourceId) {
        for (const category of Object.values(this.resources)) {
            const resource = category.find(r => r.id === resourceId);
            if (resource) return resource;
        }
        return { name: resourceId, type: 'unknown' };
    }

    getResourceIcon(resourceType) {
        const icons = {
            'herbs': '🌿',
            'berries': '🫐',
            'mushrooms': '🍄',
            'ores': '⛏️',
            'stones': '🪨',
            'woods': '🪵',
            'unknown': '❓'
        };
        return icons[resourceType] || icons.unknown;
    }


getActionName(action) {
    const actionNames = {
        'search_treasure': 'Поиск сокровищ',
        'refill_flask': 'Наполнение фляги',
        'search_ore': 'Поиск руды',
        'search_stone': 'Поиск камней',
        'search_berries': 'Сбор ягод',
        'search_herbs': 'Сбор трав',
        'search_mushrooms': 'Сбор грибов',
        'search_wood': 'Заготовка древесины'
    };
    
    return actionNames[action] || action;
}

    
    markCellAsExplored(row, col) {
        const cellKey = `${col},${row}`;
        if (this.currentTacticalMap && this.currentTacticalMap.cells[cellKey]) {
            this.currentTacticalMap.cells[cellKey].explored = true;
            this.currentTacticalMap.cells[cellKey].hasAction = false;
            this.currentTacticalMap.cells[cellKey].isSelected = false;
            
            this.drawTacticalMap();
            this.clearCellActionsUI();
            
            setTimeout(() => {
                if (this.selectedCell && this.selectedCell.row === row && this.selectedCell.col === col) {
                    this.selectedCell = null;
                }
            }, 100);
        }
    }

    clearCellActionsUI() {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (actionsContainer) {
            actionsContainer.innerHTML = '<div class="actions-placeholder">Выберите клетку для просмотра доступных действий</div>';
        }
    }

 isCellReachable(cell) {
    if (!cell || !this.playerTacticalPosition) return false;
    
    // Если клетка - текущая позиция игрока, она всегда доступна
    if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
        console.log(`📍 Клетка [${cell.col},${cell.row}] - текущая позиция игрока, доступна`);
        return true;
    }
    
    // Иначе проверяем соседство
    const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
    const isAdjacent = neighbors.some(neighbor => 
        neighbor.row === cell.row && neighbor.col === cell.col
    );
    
    console.log(`🎯 Клетка [${cell.col},${cell.row}] доступна для действий: ${isAdjacent ? 'да (сосед)' : 'нет'}`);
    return isAdjacent;
}

    highlightSelectedCell(cell) {
        if (!this.currentTacticalMap) return;
        
        Object.values(this.currentTacticalMap.cells).forEach(c => {
            c.isSelected = false;
        });
        
        cell.isSelected = true;
        this.drawTacticalMap();
    }

    // ========== ОСНОВНЫЕ МЕТОДЫ КАРТ ==========

    getLootItemById(itemId) {
        const itemSystem = window.game?.systems?.equipment;
        if (!itemSystem) {
            console.error("❌ EquipmentSystem не доступна");
            return null;
        }
        
        const item = itemSystem.getItemById(itemId);
        if (!item) {
            console.warn(`⚠️ Предмет с ID ${itemId} не найден в системе`);
            return null;
        }
        
        return item;
    }

    syncHeroWithOtherSystems() {
        if (!this.currentHero) return;
        
        if (window.game) {
            window.game.currentHero = this.currentHero;
            
            if (window.game.systems.hero) {
                window.game.systems.hero.currentHero = this.currentHero;
                console.log("✅ Герой синхронизирован с HeroSystem");
            }
            
            if (window.game.systems.equipment) {
                window.game.systems.equipment.setCurrentHero(this.currentHero);
            }
            
            if (window.game.systems.battle) {
                window.game.systems.battle.currentHero = this.currentHero;
            }

            if (window.game.systems.shop) {
                window.game.systems.shop.currentHero = this.currentHero;
            }
        }
    }

    setCurrentHero(hero) {
        this.currentHero = hero;
        console.log(`🎯 Установлен герой для карты: ${hero?.name || 'нет'}`);
        
        if (hero) {
            this.updatePlayerPositionsFromHero(hero);
            this.syncHeroWithOtherSystems();
        }
    }

    updatePlayerPositionsFromHero(hero) {
        if (hero.mapPosition) {
            this.playerGlobalPosition = hero.mapPosition.global || this.playerGlobalPosition;
            this.playerLocalPosition = hero.mapPosition.local || this.playerLocalPosition;
            this.playerTacticalPosition = hero.mapPosition.tactical || this.playerTacticalPosition;
        }
        
        console.log(`📍 Позиции обновлены для героя: ${hero.name}`);
    }

    async loadMapData() {
        try {
            console.log("📥 Загружаем данные карт...");
            
            await this.loadJSONMaps();
            await this.loadCellData();
            
            this.debugLoadedMaps();
            
            if (this.localMaps.length > 0) {
                this.forceSetLocalMap();
            }
            else if (this.tacticalMaps.length === 0 && this.localMaps.length === 0) {
                console.log("⚠️ Нет загруженных карт, создаем тестовые...");
                this.createTestMaps();
                if (this.localMaps.length > 0) {
                    this.forceSetLocalMap();
                }
            }
            
            this.setStartPositions();
            
            console.log(`✅ Карты загружены: Глобальных=${this.globalMaps.length}, Локальных=${this.localMaps.length}, Тактических=${this.tacticalMaps.length}`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных карт:", error);
            this.createFallbackMaps();
            if (this.localMaps.length > 0) {
                this.forceSetLocalMap();
            }
            return true;
        }
    }

    forceSetLocalMap() {
        if (this.localMaps.length > 0) {
            const localMap = this.localMaps[0];
            this.currentLocalMap = localMap;
            this.currentTacticalMap = localMap;
            this.playerLocalPosition = {...localMap.startPosition};
            this.playerTacticalPosition = {...localMap.startPosition};
            this.currentMapType = 'local';
            
            console.log("✅ Локальная карта принудительно установлена:", {
                name: localMap.name,
                cells: Object.keys(localMap.cells).length,
                startPosition: localMap.startPosition
            });
            return true;
        }
        console.log("❌ Нет локальных карт для установки");
        return false;
    }

    async loadJSONMaps() {
        try {
            console.log("🔄 Загружаем JSON карты...");
            
            const tacticalMapPaths = [
                'data/maps/tactical/tactical-maps.json',
                'data/maps/tactical-maps.json',
                'maps/tactical-maps.json', 
                'data/tactical-maps.json',
                'tactical-maps.json',
                'data/modules/maps/tactical-maps.json'
            ];
            
            const localMapPaths = [
                'data/maps/local/local-maps.json',
                'data/maps/local-maps.json', 
                'maps/local-maps.json',
                'data/local-maps.json',
                'local-maps.json',
                'data/modules/maps/local-maps.json'
            ];
            
            let tacticalLoaded = false;
            for (const path of tacticalMapPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processTigrimionJSONMaps(mapData, 'tactical');
                        console.log(`✅ Тактические карты загружены из: ${path}`);
                        tacticalLoaded = true;
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить тактические карты из ${path}:`, e.message);
                }
            }
            
            let localLoaded = false;
            for (const path of localMapPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processTigrimionJSONMaps(mapData, 'local');
                        console.log(`✅ Локальные карты загружены из: ${path}`);
                        localLoaded = true;
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить локальные карты из ${path}:`, e.message);
                }
            }
            
            console.log(`ℹ️ Итог загрузки: Тактические: ${tacticalLoaded}, Локальные: ${localLoaded}`);
            
        } catch (error) {
            console.error("❌ Ошибка загрузки JSON карт:", error);
        }
    }

    async processTigrimionJSONMaps(mapData, mapType = 'tactical') {
        if (!mapData || !mapData.meta) {
            console.warn("❌ Неверный формат JSON карты Tigrimion");
            return;
        }

        try {
            const convertedMap = this.convertTigrimionJSONToMap(mapData, mapType);
            if (convertedMap) {
                if (mapType === 'tactical') {
                    this.tacticalMaps.push(convertedMap);
                } else if (mapType === 'local') {
                    this.localMaps.push(convertedMap);
                }
                
                this.loadedJSONMaps.set(convertedMap.id, convertedMap);
                console.log(`✅ Обработана ${mapType} карта: ${convertedMap.name}`);
            }
        } catch (error) {
            console.error(`❌ Ошибка обработки ${mapType} карты:`, error);
        }
    }

    convertTigrimionJSONToMap(jsonMap, mapType = 'tactical') {
        if (!jsonMap.game || !jsonMap.game.grid || !jsonMap.game.grid.cells) {
            console.warn("❌ Неверная структура карты Tigrimion");
            return null;
        }

        const cells = jsonMap.game.grid.cells;
        const convertedCells = {};
        
        console.log(`📥 Импортируем ${mapType} карту: ${jsonMap.meta?.name || 'Без названия'}`);
        console.log(`📊 Клеток в импорте: ${cells.length}`);
        
        cells.forEach(cell => {
            const key = `${cell.col},${cell.row}`;
            
            convertedCells[key] = {
                type: cell.type,
                passable: cell.passable !== false,
                visible: cell.visible !== false,
                originalX: cell.x,
                originalY: cell.y,
                x: cell.x,
                y: cell.y,
                row: cell.row,
                col: cell.col,
                monster_id: cell.monster_id,
                tacticalMap: cell.tacticalMap,
                localMap: cell.localMap,
                globalMap: cell.globalMap,
                targetPosition: cell.targetPosition,
                returnX: cell.returnX,
                returnY: cell.returnY,
                tooltip: cell.tooltip,
                hasLoot: cell.hasLoot || false,
                shopName: cell.shopName,
                merchantName: cell.merchantName,
                shopItems: cell.shopItems || [],
                shopId: cell.shopId,
                restockTimer: cell.restockTimer,
                explored: false,
                hasAction: true,
                isSelected: false,
                originalData: cell
            };
        });

        let startPosition = {x: 0, y: 0};
        const startCell = cells.find(cell => cell.type === 'player_start');
        if (startCell) {
            startPosition = {x: startCell.col, y: startCell.row};
            console.log(`🎯 Стартовая позиция: [${startCell.col},${startCell.row}]`);
        }

        const originalCanvasWidth = jsonMap.visual?.canvasWidth || 1024;
        const originalCanvasHeight = jsonMap.visual?.canvasHeight || 1024;

        console.log(`📐 Original canvas: ${originalCanvasWidth}x${originalCanvasHeight}`);

        return {
            id: mapType === 'tactical' ? this.tacticalMaps.length + 1 : this.localMaps.length + 1,
            name: jsonMap.meta?.name || `${mapType === 'tactical' ? 'Тактическая' : 'Локальная'} карта`,
            image: jsonMap.visual?.backgroundImage || "",
            width: 20,
            height: 20,
            startPosition: startPosition,
            description: jsonMap.meta?.description || `Создана в редакторе карт Tigrimion`,
            localPosition: {x: 0, y: 0},
            cells: convertedCells,
            jsonData: jsonMap,
            gameData: jsonMap.game,
            renderType: 'hex',
            cellSize: jsonMap.game.grid.cellSize || 40,
            originalCanvasWidth: originalCanvasWidth,
            originalCanvasHeight: originalCanvasHeight,
            mapType: mapType
        };
    }

    async handleMapTransition(transitionCell) {
        if (!transitionCell) return;

        this.saveCurrentMapToStack();
        
        try {
            if (transitionCell.tacticalMap) {
                await this.loadTacticalMapFile(transitionCell.tacticalMap);
                this.currentMapType = 'tactical';
                console.log(`🚪 Вход в тактическую карту: ${transitionCell.tacticalMap}`);
                
            } else if (transitionCell.localMap) {
                await this.loadLocalMapFile(transitionCell.localMap);
                this.currentMapType = 'local';
                
                if (transitionCell.targetPosition) {
                    this.playerTacticalPosition = {...transitionCell.targetPosition};
                }
                
                console.log(`🌍 Переход на локальную карту: ${transitionCell.localMap}`);
                
            } else if (transitionCell.globalMap) {
                await this.loadGlobalMapFile(transitionCell.globalMap);
                this.currentMapType = 'global';
                console.log(`🗺️ Переход на глобальную карту: ${transitionCell.globalMap}`);
            }
            
            this.calculateCSSScale();
            this.drawTacticalMap();
            
        } catch (error) {
            console.error("❌ Ошибка перехода между картами:", error);
            this.exitToPreviousMap();
        }
    }

    exitToPreviousMap() {
        if (this.mapStack.length === 0) {
            console.log("🚫 Нет предыдущей карты для возврата");
            return;
        }
        
        const savedState = this.mapStack.pop();
        if (savedState) {
            this.currentTacticalMap = savedState.map;
            this.playerTacticalPosition = savedState.playerPosition;
            this.currentMapType = savedState.mapType;
            
            if (savedState.mapType === 'local') {
                this.currentLocalMap = savedState.map;
            }
            
            console.log(`🚪 Возврат на ${savedState.mapType} карту: ${savedState.map.name}`);
            
            this.calculateCSSScale();
            this.drawTacticalMap();
        }
    }

    saveCurrentMapToStack() {
        const mapState = {
            map: this.currentTacticalMap,
            playerPosition: {...this.playerTacticalPosition},
            mapType: this.currentMapType,
            localMap: this.currentLocalMap
        };
        this.mapStack.push(mapState);
        console.log(`💾 Сохранено состояние карты в стек (глубина: ${this.mapStack.length})`);
    }

    async loadTacticalMapFile(mapPath) {
        console.log(`🔍 ЗАГРУЗКА КАРТЫ: ${mapPath}`);
        
        try {
            const response = await fetch(mapPath);
            if (!response.ok) {
                throw new Error(`Не удалось загрузить карту: ${mapPath}`);
            }
            
            const mapData = await response.json();
            console.log(`✅ Карта "${mapData.meta?.name}" загружена`);
            
            const tacticalMap = this.convertTigrimionJSONToMap(mapData, 'tactical');
            
            if (tacticalMap) {
                this.currentTacticalMap = tacticalMap;
                
                if (!this._lastTransitionCell || !this._lastTransitionCell.targetPosition) {
                    this.setPlayerToStartPosition();
                }
                
                console.log(`📍 Текущая позиция игрока:`, this.playerTacticalPosition);
                return tacticalMap;
            }
        } catch (error) {
            console.error(`❌ Ошибка загрузки тактической карты:`, error);
            
            console.log("🔄 Создаем тестовую таверну...");
            const tavernMap = this.createTestTavernMap();
            this.currentTacticalMap = tavernMap;
            
            if (!this._lastTransitionCell || !this._lastTransitionCell.targetPosition) {
                this.setPlayerToStartPosition();
            }
            
            return tavernMap;
        }
        return null;
    }

    async loadLocalMapFile(mapPath) {
        try {
            console.log(`📥 Загружаем локальную карту: ${mapPath}`);
            
            const response = await fetch(mapPath);
            if (!response.ok) {
                throw new Error(`Не удалось загрузить локальную карту: ${mapPath}`);
            }
            
            const mapData = await response.json();
            const localMap = this.convertTigrimionJSONToMap(mapData, 'local');
            
            if (localMap) {
                this.setCurrentLocalMap(localMap);
                console.log(`✅ Локальная карта загружена: ${localMap.name}`);
                return localMap;
            }
        } catch (error) {
            console.error(`❌ Ошибка загрузки локальной карты:`, error);
            
            console.log("🔄 Создаем тестовую локацию...");
            const locationMap = this.createTestLocationMap();
            this.setCurrentLocalMap(locationMap);
            return locationMap;
        }
        return null;
    }

    async loadGlobalMapFile(mapPath) {
        console.log(`🌍 Загрузка глобальной карта: ${mapPath}`);
        return null;
    }

    setCurrentLocalMap(localMap) {
        if (!localMap) {
            console.error("❌ Попытка установить пустую локальную карту");
            return;
        }
        
        this.currentLocalMap = localMap;
        this.currentTacticalMap = localMap;
        this.playerLocalPosition = {...localMap.startPosition};
        this.playerTacticalPosition = {...localMap.startPosition};
        this.currentMapType = 'local';
        
        console.log(`📍 Установлена локальная карта: ${localMap.name}`, {
            startPosition: localMap.startPosition,
            cellsCount: Object.keys(localMap.cells).length
        });
        
        if (this.canvasInitialized) {
            this.calculateCSSScale();
            this.drawTacticalMap();
        }
    }

    setPlayerToStartPosition() {
        if (!this.currentTacticalMap) return;
        
        const startCell = Object.values(this.currentTacticalMap.cells)
            .find(cell => cell.type === 'player_start');
        
        if (startCell) {
            this.playerTacticalPosition = {x: startCell.col, y: startCell.row};
            console.log(`🎯 Герой установлен на стартовую позицию: [${startCell.col}, ${startCell.row}]`);
        } else {
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
        }
    }

    createTestTavernMap() {
        console.log("🍻 Создаем тестовую таверну...");
        
        const tavernMap = {
            id: 1001,
            name: "Таверна 'Веселый Гном'",
            image: "",
            width: 6,
            height: 6,
            startPosition: {x: 3, y: 3},
            description: "Уютная таверна, где можно отдохнуть и послушать новости",
            cells: {
                "3,3": {
                    type: "player_start", 
                    passable: true, 
                    row: 3, 
                    col: 3, 
                    visible: true, 
                    x: 300, 
                    y: 300,
                    explored: false,
                    hasAction: true
                },
                "3,2": {
                    type: "exit", 
                    passable: true, 
                    row: 2, 
                    col: 3, 
                    visible: true, 
                    x: 300, 
                    y: 250,
                    tooltip: "🚪 Выход из таверны\n(Вернуться на улицу)",
                    explored: false,
                    hasAction: true
                },
                "2,3": {
                    type: "npc", 
                    passable: true, 
                    row: 3, 
                    col: 2, 
                    visible: true, 
                    x: 250, 
                    y: 300,
                    tooltip: "🧙 Хозяин таверны\n(Может рассказать новости)",
                    explored: false,
                    hasAction: true
                },
                "4,3": {
                    type: "merchant", 
                    passable: true, 
                    row: 3, 
                    col: 4, 
                    visible: true, 
                    x: 350, 
                    y: 300,
                    shopName: "Таверный магазин",
                    merchantName: "Бармен Грог",
                    shopItems: [1, 2, 3],
                    tooltip: "🛒 Бармен\n(Купить выпивку и еду)",
                    explored: false,
                    hasAction: true
                },
                "3,4": {
                    type: "campfire", 
                    passable: true, 
                    row: 4, 
                    col: 3, 
                    visible: true, 
                    x: 300, 
                    y: 350,
                    tooltip: "🔥 Камин\n(Тепло и уют)",
                    explored: false,
                    hasAction: true
                }
            },
            cellSize: 40,
            originalCanvasWidth: 600,
            originalCanvasHeight: 600,
            mapType: 'tactical'
        };
        
        console.log("✅ Тестовая таверна создана с магазином");
        return tavernMap;
    }

    createTestLocationMap() {
        console.log("🌍 Создаем тестовую локацию...");
        
        const locationMap = {
            id: 1002,
            name: "Тестовая Локация",
            image: "",
            width: 8,
            height: 8,
            startPosition: {x: 4, y: 4},
            description: "Тестовая локация для отладки переходов",
            cells: {
                "4,4": {
                    type: "player_start", 
                    passable: true, 
                    row: 4, 
                    col: 4, 
                    visible: true, 
                    x: 200, 
                    y: 200,
                    explored: false,
                    hasAction: true
                },
                "4,3": {
                    type: "exit", 
                    passable: true, 
                    row: 3, 
                    col: 4, 
                    visible: true, 
                    x: 200, 
                    y: 150,
                    explored: false,
                    hasAction: true
                }
            },
            cellSize: 40,
            originalCanvasWidth: 400,
            originalCanvasHeight: 400,
            mapType: 'local'
        };
        
        console.log("✅ Тестовая локация создана");
        return locationMap;
    }

   handleCanvasClick(e) {
    if (!this.currentTacticalMap) {
        console.error("❌ Нет текущей тактической карты");
        return;
    }

    const canvasRect = this.canvas.getBoundingClientRect();
    
    const computedStyle = getComputedStyle(this.canvas);
    const transform = computedStyle.transform;
    let scale = 1;
    
    if (transform && transform !== 'none') {
        const matrix = new DOMMatrix(transform);
        scale = matrix.a;
    }
    
    const logicalX = (e.clientX - canvasRect.left) / scale;
    const logicalY = (e.clientY - canvasRect.top) / scale;
    
    console.log(`🎯 Клик: экран [${e.clientX}, ${e.clientY}] -> логические [${logicalX}, ${logicalY}] scale: ${scale}`);
    
    const hex = this.getHexAtLogicalPosition(logicalX, logicalY);
    if (!hex) {
        console.log("❌ Клетка не найдена по координатам");
        return;
    }
    
    console.log(`🎲 Клик по клетке: [${hex.col}, ${hex.row}] тип: ${hex.type} tacticalMap: ${hex.tacticalMap}`);
    
    // Обработка ТАВЕРНЫ (тип village с tacticalMap)
    if (hex.type === 'village' && hex.tacticalMap) {
        console.log("🍻 Клик по таверне - проверяем доступность...");
        
        // Проверяем, находится ли герой рядом с таверной
        const isAdjacent = this.isPlayerAdjacentToTransition(hex);
        if (!isAdjacent) {
            console.log("❌ Герой не рядом с таверной");
            this.showTransitionWarning(hex);
            return;
        }
        
        // Если рядом - активируем переход
        console.log("✅ Герой рядом с таверной, активируем переход...");
        this.activateTransition(hex);
        return;
    }
    
    // Обработка воды
    if (hex.type === 'water') {
        console.log("💧 Клик по воде");
        // Проверяем доступность
        if (!this.isPlayerAdjacentToWater(hex)) {
            this.showNotification("❌ Подойдите ближе к воде!", 'warning');
            return;
        }
        this.handleWaterCell(hex);
        return;
    }
    
    // Обработка магазина
    if (hex.type === 'merchant') {
        console.log("🛒 Клик по магазину");
        this.handleMerchantClick(hex);
        return;
    }
    
    // Проверяем, является ли клетка переходом
    if (this.isTransitionCell(hex)) {
        console.log("🚪 Клик по переходу");
        this.handleTransitionClick(hex);
        return;
    }
    
    // Если клик на клетку с монстром или проходимую
    if (hex.passable !== false || hex.type === 'monster') {
        console.log("🎯 Клик для перемещения или действий");
        
        // Проверяем, можно ли переместиться на эту клетку
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        const isReachable = neighbors.some(neighbor => 
            neighbor.row === hex.row && neighbor.col === hex.col
        );
        
        if (isReachable) {
            console.log(`✅ Клетка достижима, начинаем перемещение`);
            this.moveOnTacticalMap(hex.col, hex.row);
        } else {
            console.log(`❌ Клетка недостижима для перемещения`);
            // Не перемещаемся, но показываем действия
        }
    } else {
        console.log(`❌ Клетка непроходима: ${hex.type}`);
    }
    
    // ВСЕГДА показываем панель действий при клике на любую клетку (кроме переходов)
    if (!this.isTransitionCell(hex)) {
        console.log(`📋 Показываем панель действий для клетки [${hex.col}, ${hex.row}]`);
        this.updateCellActionsUI(hex);
        this.highlightSelectedCell(hex);
    } else {
        console.log(`⏭️ Пропускаем показ действий для перехода`);
    }
}

    getHexAtLogicalPosition(x, y) {
        let closestHex = null;
        let minDistance = Infinity;

        for (const cell of Object.values(this.currentTacticalMap.cells)) {
            const cellX = cell.x || cell.originalX || 0;
            const cellY = cell.y || cell.originalY || 0;
            
            const distance = Math.sqrt(
                Math.pow(x - cellX, 2) + 
                Math.pow(y - cellY, 2)
            );
            
            if (distance <= 40 && distance < minDistance) {
                minDistance = distance;
                closestHex = cell;
            }
        }
        
        console.log(`🔍 Найдена клетка:`, closestHex ? 
            `[${closestHex.col},${closestHex.row}] тип: ${closestHex.type}` : 'нет');
        
        return closestHex;
    }

    isTransitionCell(cell) {
        return cell.tacticalMap || cell.localMap || cell.globalMap || cell.type === 'exit';
    }

    async handleTransitionClick(transitionCell) {
        if (!this.isPlayerAdjacentToTransition(transitionCell)) {
            this.showTransitionWarning(transitionCell);
            return;
        }
        
        await this.activateTransition(transitionCell);
    }

    isPlayerAdjacentToTransition(transitionCell) {
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        
        return neighbors.some(neighbor => 
            neighbor.row === transitionCell.row && 
            neighbor.col === transitionCell.col
        );
    }

    getLocationNameFromPath(filePath) {
        if (!filePath) return null;
        const filename = filePath.split('/').pop().replace('.json', '').replace(/_/g, ' ');
        return filename.charAt(0).toUpperCase() + filename.slice(1);
    }

    highlightTransition(transitionCell) {
        if (!transitionCell) return;
        
        const originalColor = transitionCell.highlightColor;
        transitionCell.highlightColor = '#ff4444';
        transitionCell.isHighlighted = true;
        
        this.drawTacticalMap();
        
        setTimeout(() => {
            transitionCell.highlightColor = originalColor;
            transitionCell.isHighlighted = false;
            this.drawTacticalMap();
        }, 1000);
    }

    async activateTransition(transitionCell) {
        console.log(`🚪 АКТИВАЦИЯ ПЕРЕХОДА:`, {
            type: transitionCell.type,
            tacticalMap: transitionCell.tacticalMap,
            localMap: transitionCell.localMap, 
            globalMap: transitionCell.globalMap,
            targetPosition: transitionCell.targetPosition,
            returnX: transitionCell.returnX,
            returnY: transitionCell.returnY
        });

        if (transitionCell.type === 'exit' && !transitionCell.tacticalMap && !transitionCell.localMap && !transitionCell.globalMap) {
            console.log("🚪 Простой выход с карты через exit-гекс");
            this.exitToPreviousMap();
            return;
        }

        this._lastTransitionCell = transitionCell;
        this.saveCurrentMapToStack();
        
        try {
            let newMap = null;
            
            if (transitionCell.tacticalMap) {
                console.log(`🎲 Переход на тактическую карту: ${transitionCell.tacticalMap}`);
                newMap = await this.loadTacticalMapFile(transitionCell.tacticalMap);
                this.currentMapType = 'tactical';
                
                if (transitionCell.targetPosition) {
                    this.playerTacticalPosition = {...transitionCell.targetPosition};
                    console.log(`📍 Игрок установлен на targetPosition:`, this.playerTacticalPosition);
                }
                
            } else if (transitionCell.localMap) {
                console.log(`🌍 Переход на локальную карту: ${transitionCell.localMap}`);
                newMap = await this.loadLocalMapFile(transitionCell.localMap);
                this.currentMapType = 'local';
                
                if (transitionCell.targetPosition) {
                    this.playerTacticalPosition = {...transitionCell.targetPosition};
                    console.log(`📍 Игрок установлен на targetPosition:`, this.playerTacticalPosition);
                } else {
                    this.setPlayerToStartPosition();
                }
                
            } else if (transitionCell.globalMap) {
                console.log(`🗺️ Переход на глобальную карту: ${transitionCell.globalMap}`);
                newMap = await this.loadGlobalMapFile(transitionCell.globalMap);
                this.currentMapType = 'global';
            }
            
            if (newMap) {
                await this.forceMapUpdate(newMap);
            }
            
            this._lastTransitionCell = null;
            
        } catch (error) {
            console.error("❌ Ошибка перехода между картами:", error);
            this._lastTransitionCell = null;
            this.exitToPreviousMap();
        }
    }

async forceMapUpdate(newMap) {
    console.log("🔄 Принудительное обновление карты...");
    
    if (this.currentMapType === 'local') {
        this.currentLocalMap = newMap;
    }
    this.currentTacticalMap = newMap;
    
    if (this.canvasInitialized) {
        this.calculateCSSScale();
        this.drawTacticalMap();
        this.updateMovementInfo();
        console.log("✅ Карта немедленно обновлена");
        
        // Автоматически показываем описание текущей клетки
        setTimeout(() => {
            const cellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
            const currentCell = this.currentTacticalMap.cells[cellKey];
            
            if (currentCell) {
                console.log(`📍 Показываем описание клетки после обновления карты`);
                this.updateCellActionsUI(currentCell);
                this.highlightSelectedCell(currentCell);
            }
        }, 200);
    } else {
        setTimeout(() => {
            this.initCanvas();
        }, 100);
    }
    
    this.updateMapInterface();
}

    updateMapInterface() {
        const header = document.querySelector('.tactical-map-header h4');
        const mapTypeBadge = document.querySelector('.map-type-badge');
        const positionInfo = document.querySelector('.position-info');
        const description = document.querySelector('.map-description');
        const stats = document.querySelector('.map-stats');
        
        if (header && this.currentTacticalMap) {
            const lootLevel = this.currentTacticalMap.jsonData?.meta?.lootLevel;
            const lootLevelText = lootLevel ? ` [Уровень лута: ${lootLevel}]` : '';
            header.textContent = this.currentTacticalMap.name + lootLevelText;
        }
        
        if (mapTypeBadge) {
            mapTypeBadge.textContent = this.currentMapType === 'local' ? '📍 Локальная' : '🎲 Тактическая';
        }
        
        if (positionInfo) {
            positionInfo.textContent = `Позиция: [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}] ${this.currentMapType === 'local' ? ' (локальная)' : ' (тактическая)'}`;
        }
        
        if (description && this.currentTacticalMap) {
            description.textContent = this.currentTacticalMap.description || 'Описание отсутствует';
        }
        
        if (stats && this.currentTacticalMap) {
            const cellsCount = Object.keys(this.currentTacticalMap.cells).length;
            stats.innerHTML = `
                <span>Клеток: ${cellsCount}</span>
                <span>Размер: ${this.currentTacticalMap.width}x${this.currentTacticalMap.height}</span>
                <span>Масштаб: <span id="currentZoom">${Math.round(this.zoomLevel * 100)}%</span></span>
                <span id="availableMoves">Доступных ходов: 0</span>
            `;
        }
        
        this.updateMovementInfo();
    }

    moveOnTacticalMap(x, y) {
        if (!this.currentHero) {
            console.error("❌ Герой не выбран!");
            if (window.game) {
                window.game.showNotification("❌ Герой не выбран! Пожалуйста, выберите героя сначала.", 'error');
            }
            return;
        }

        if (!this.currentTacticalMap) return;

        const cellKey = `${x},${y}`;
        const cellData = this.currentTacticalMap.cells[cellKey];
        
        if (!cellData) {
            console.log("🚫 Клетка не существует");
            if (window.game) {
                window.game.showNotification("Эта клетка не существует!", 'error');
            }
            return;
        }

        if (this.isTransitionCell(cellData)) {
            this.handleTransitionClick(cellData);
            return;
        }

        if (cellData.passable === false) {
            console.log("🚫 Клетка непроходима");
            if (window.game) {
                window.game.showNotification("Эта клетка непроходима!", 'error');
            }
            return;
        }

        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        const isReachable = neighbors.some(neighbor => 
            neighbor.row === y && neighbor.col === x
        );

        if (!isReachable) {
            console.log("🚫 Нельзя переместиться на эту клетку - она недоступна");
            if (window.game) {
                window.game.showNotification("Нельзя переместиться на эту клетку!", 'error');
            }
            return;
        }

        const mapType = this.currentTacticalMap.jsonData?.meta?.mapType || 'combat';
        
        console.log(`🎯 Начало перемещения на [${x}, ${y}], тип карты: ${mapType}`);
        
        this.debugMovementInfo(x, y, cellData);
        
        if (mapType === 'peaceful') {
            this.handlePeacefulMovement(x, y, cellData);
        } else {
            setTimeout(() => {
                this.startTacticalBattleForMovement(x, y, cellData);
            }, 50);
        }
    }

    handlePeacefulMovement(targetX, targetY, cellData) {
        console.log(`🌿 Мирное перемещение на [${targetX}, ${targetY}]`);
        
        if (cellData.hasLoot) {
            console.log(`🎁 Найден лут на клетке [${targetX}, ${targetY}]`);
            this.collectLoot(cellData, targetX, targetY);
        } else {
            console.log(`➡️ Перемещение без лута на [${targetX}, ${targetY}]`);
            this.completePeacefulMovement(targetX, targetY);
        }
    }

    collectLoot(cellData, col, row) {
        const lootLevel = this.currentTacticalMap?.jsonData?.meta?.lootLevel || 1;
        
        console.log(`🎲 Генерация лута уровня ${lootLevel} для клетки [${col},${row}]`);
        
        const reward = this.generateRandomReward(lootLevel);
        
        this.processRewardWithMovement(reward, col, row, cellData);
    }

    generateRandomReward(lootLevel) {
        const lootTable = this.lootTables[lootLevel] || this.lootTables[1];
        
        const rewardType = this.selectRewardType(lootTable);
        const rewardData = lootTable[rewardType];
        
        console.log(`🎯 Выбран тип награды: ${rewardType} для уровня ${lootLevel}`);
        
        switch(rewardType) {
            case 'gold':
                const amount = Math.floor(Math.random() * (rewardData.max - rewardData.min + 1)) + rewardData.min;
                return {
                    type: 'gold',
                    amount: amount,
                    message: `Вы нашли ${amount} золотых монет!`
                };
                
            case 'common_items':
            case 'rare_items':
            case 'epic_items':
            case 'legendary_items':
                const items = rewardData.items;
                const randomItem = items[Math.floor(Math.random() * items.length)];
                return {
                    type: 'item',
                    itemId: randomItem,
                    message: `Вы нашли: ${this.getItemName(randomItem)}!`
                };
                
            case 'information':
                const messages = rewardData.messages;
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                return {
                    type: 'information',
                    message: randomMessage
                };
                
            default:
                return {
                    type: 'gold',
                    amount: 10,
                    message: 'Вы нашли 10 золотых монет!'
                };
        }
    }

    selectRewardType(lootTable) {
        const types = Object.keys(lootTable);
        const weights = types.map(type => lootTable[type].weight);
        
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < types.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return types[i];
            }
        }
        
        return types[0];
    }

    processRewardWithMovement(reward, col, row, cellData) {
        let showNotification = true;
        let completed = false;
        
        try {
            switch(reward.type) {
                case 'gold':
                    this.currentHero.gold += reward.amount;
                    console.log(`💰 Добавлено золото: ${reward.amount}`);
                    completed = true;
                    break;
                    
                case 'item':
                    const itemSystem = window.game?.systems?.equipment;
                    if (itemSystem && itemSystem.addItemToHero) {
                        const lootItem = this.getLootItemById(reward.itemId);
                        if (!lootItem) {
                            console.warn(`⚠️ Предмет лута не найден: ${reward.itemId}`);
                            reward.message = `Найдено что-то странное... (${reward.itemId})`;
                        } else {
                            const itemAdded = itemSystem.addItemToHero(this.currentHero, reward.itemId);
                            if (!itemAdded) {
                                reward.message = "Инвентарь полон! Награда потеряна.";
                            } else {
                                reward.message = `Вы нашли: ${lootItem.name}!`;
                            }
                        }
                        completed = true;
                    }
                    break;
                    
                case 'information':
                    if (this.isImportantInformation(reward.message)) {
                        this.showInformationDialog(reward.message);
                        showNotification = false;
                        this.delayedMovementAfterDialog(col, row, reward.message);
                        return;
                    }
                    completed = true;
                    break;
            }
            
            if (completed) {
                this.syncHeroWithOtherSystems();
                
                if (showNotification && window.game) {
                    window.game.showNotification(reward.message, 'success');
                }
                
                this.completePeacefulMovement(col, row);
                
                console.log(`🎁 Награда обработана и перемещение завершено:`, reward);
            }
            
        } catch (error) {
            console.error("❌ Ошибка обработки награды:", error);
            if (window.game) {
                window.game.showNotification("Ошибка при получении награды", 'error');
            }
            this.completePeacefulMovement(col, row);
        }
    }

    delayedMovementAfterDialog(col, row, message) {
        setTimeout(() => {
            this.completePeacefulMovement(col, row);
            console.log(`💡 Перемещение после диалога: ${message}`);
        }, 100);
    }

    getItemName(itemId) {
        const lootItem = this.getLootItemById(itemId);
        return lootItem ? lootItem.name : itemId;
    }

    isImportantInformation(message) {
        const importantKeywords = ['артефакт', 'сокровищ', 'координат', 'секрет', 'тайн', 'легендарн'];
        return importantKeywords.some(keyword => message.toLowerCase().includes(keyword));
    }

    showInformationDialog(message) {
        if (window.game && window.game.showDialog) {
            window.game.showDialog({
                title: "Важная информация",
                message: message,
                type: "information"
            });
        } else {
            window.game.showNotification("💡 " + message, 'info');
        }
    }

 completePeacefulMovement(targetX, targetY) {
    const oldPosition = {...this.playerTacticalPosition};
    this.playerTacticalPosition = {x: targetX, y: targetY};
    
    console.log(`✅ Мирное перемещение героя ${this.currentHero.name} с [${oldPosition.x}, ${oldPosition.y}] на: [${targetX}, ${targetY}]`);
    
    this.syncHeroWithOtherSystems();
    
    if (this.activeOverlay === 'tactical-map' || this.activeOverlay === 'local-map') {
        this.calculateCSSScale();
        this.drawTacticalMap();
        
        // ВАЖНО: После перемещения автоматически показываем действия для новой клетки
        setTimeout(() => {
            const cellKey = `${targetX},${targetY}`;
            const currentCell = this.currentTacticalMap?.cells[cellKey];
            
            if (currentCell) {
                console.log(`🎯 Автоматически показываем действия для новой клетки [${targetX}, ${targetY}]`);
                this.updateCellActionsUI(currentCell);
                this.highlightSelectedCell(currentCell);
            }
            
            if (window.game) {
                window.game.showNotification(`✅ Перемещение на [${targetX}, ${targetY}]`, 'success');
            }
        }, 300);
    }
    
    this.updateMovementInfo();
}

    startTacticalBattleForMovement(x, y, cellData) {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            return;
        }

        if (!this.currentHero) {
            console.error("❌ Не могу начать бой: герой не выбран");
            return;
        }

        this.pendingMovement = { x: x, y: y };
        
        const specificMonster = this.getMonsterFromCell(cellData);
        
        console.log("🎲 Начинаем бой поверх тактической карты...");
        
        if (specificMonster && cellData.monster_id) {
            console.log(`🎯 Бой с ЗАПРОГРАММИРОВАННЫМ монстром: ${specificMonster.name}`);
            battleSystem.startBattleWithSpecificMonster(this.currentHero, specificMonster, 'movement');
        } else {
            const randomMonster = this.getRandomMonster();
            if (!randomMonster) {
                console.error("❌ Не удалось начать бой: нет случайных монстров");
                if (window.game) {
                    window.game.showNotification("❌ Нет доступных монстров для боя!", 'error');
                }
                return;
            }
            
            console.log(`🎲 Бой со СЛУЧАЙНЫМ монстром: ${randomMonster.name}`);
            battleSystem.startBattleWithMonster(this.currentHero, randomMonster.id, 'movement');
        }
    }

    getRandomMonster() {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem || !battleSystem.getRandomMonsterForMovement) {
            console.error("❌ BattleSystem не доступна для получения случайного монстра");
            return null;
        }
        
        const randomMonster = battleSystem.getRandomMonsterForMovement();
        
        if (!randomMonster) {
            console.error("❌ Не удалось получить случайного монстра");
            return null;
        }
        
        return randomMonster;
    }

  completeMovementAfterBattle(victory, escape = false) {
    if (!this.pendingMovement) return;

    console.log(`🎲 Завершение движения после боя: победа=${victory}, побег=${escape}`);

    let targetX, targetY;
    
    if (victory) {
        // Победа - перемещаем на целевую клетку
        targetX = this.pendingMovement.x;
        targetY = this.pendingMovement.y;
        const oldPosition = {...this.playerTacticalPosition};
        this.playerTacticalPosition = {x: targetX, y: targetY};
        
        console.log(`✅ Успешное перемещение героя ${this.currentHero.name} после боя: [${oldPosition.x}, ${oldPosition.y}] → [${targetX}, ${targetY}]`);
        
        if (window.game) {
            window.game.showNotification(`✅ Успешное перемещение на [${targetX}, ${targetY}]`, 'success');
        }
    } else {
        if (escape) {
            // Побег - остаемся на текущей клетке
            targetX = this.playerTacticalPosition.x;
            targetY = this.playerTacticalPosition.y;
            console.log(`🏃 Побег! Герой ${this.currentHero.name} остался на позиции: [${targetX}, ${targetY}]`);
            
            if (window.game) {
                window.game.showNotification(`🏃 Побег успешен! Герой остался на своей позиции.`, 'warning');
            }
        } else {
            // Смерть в бою - возвращаем на стартовую точку
            const startPosition = this.currentTacticalMap.startPosition;
            targetX = startPosition.x;
            targetY = startPosition.y;
            const oldPosition = {...this.playerTacticalPosition};
            this.playerTacticalPosition = {x: targetX, y: targetY};
            
            console.log(`💀 Поражение! Возврат героя ${this.currentHero.name} на стартовую позицию: [${oldPosition.x}, ${oldPosition.y}] → [${targetX}, ${targetY}]`);
            
            if (window.game) {
                window.game.showNotification(`💀 Поражение! Возврат на стартовую позицию.`, 'error');
            }
        }
    }
    
    // Сбрасываем ожидаемое перемещение
    this.pendingMovement = null;
    
    // Обновляем карту если она активна
    if (this.activeOverlay === 'tactical-map' || this.activeOverlay === 'local-map') {
        this.calculateCSSScale();
        this.drawTacticalMap();
        this.updateMovementInfo();
        
        // АВТОМАТИЧЕСКИ ПОКАЗЫВАЕМ ДЕЙСТВИЯ ДЛЯ НОВОЙ КЛЕТКИ
        setTimeout(() => {
            const cellKey = `${targetX},${targetY}`;
            const currentCell = this.currentTacticalMap?.cells[cellKey];
            
            if (currentCell) {
                console.log(`🎯 После боя показываем действия для клетки [${targetX}, ${targetY}]`);
                this.updateCellActionsUI(currentCell);
                this.highlightSelectedCell(currentCell);
            }
        }, 500);
    }
    
    // Синхронизируем состояние героя
    if (this.currentHero && window.game && window.game.systems && window.game.systems.hero) {
        window.game.systems.hero.currentHero = this.currentHero;
        window.game.systems.hero.calculateHeroStats(this.currentHero);
    }
}
    
    getMonsterFromCell(cellData) {
        if (!cellData || cellData.type !== 'monster' || !cellData.monster_id) {
            return null;
        }
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return null;
        
        return battleSystem.getMonsterById(cellData.monster_id);
    }

    updateHeroInterface() {
        if (window.game?.systems?.hero) {
            this.syncHeroWithOtherSystems();
            
            setTimeout(() => {
                if (window.game.systems.hero.currentHero) {
                    window.game.systems.hero.updateHeroDisplay();
                } else {
                    console.warn("⚠️ Не удалось обновить интерфейс: герой не установлен в HeroSystem");
                }
            }, 10);
        } else {
            console.warn("⚠️ HeroSystem не доступен для обновления интерфейс");
        }
    }

    debugMovementInfo(x, y, cellData) {
        const hasLoot = cellData.hasLoot;
        
        console.group(`🎯 ДЕБАГ ПЕРЕМЕЩЕНИЯ на [${x}, ${y}]`);
        console.log('Тип клетки:', cellData.type);
        console.log('Проходимость:', cellData.passable);
        console.log('Есть лут:', hasLoot);
        console.log('Тип карты:', this.currentTacticalMap.jsonData?.meta?.mapType || 'combat');
        console.log('Текущая позиция:', this.playerTacticalPosition);
        
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        console.log('Доступные соседи:', neighbors.map(n => `[${n.col},${n.row}]`));
        
        const isReachable = neighbors.some(neighbor => 
            neighbor.row === y && neighbor.col === x
        );
        console.log('Достижима:', isReachable);
        console.groupEnd();
        
        return isReachable;
    }

    initCanvas() {
        const container = document.querySelector('.tactical-map-visual');
        if (!container) {
            console.log("❌ Контейнер для карты не найден");
            return;
        }

        container.innerHTML = '';

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'tacticalMapCanvas';
        
        this.canvas.width = 1024;
        this.canvas.height = 1024;
        
        this.canvas.style.width = '1024px';
        this.canvas.style.height = '1024px';
        this.canvas.style.position = 'relative';
        this.canvas.style.background = '#1a1a2e';
        this.canvas.style.border = '2px solid #00ffff';
        this.canvas.style.cursor = 'pointer';
        container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        
        this.zoomLevel = 1.0;
        this.mapOffset = { x: 0, y: 0 };
        
        this.calculateCSSScale();
        this.setupCanvasEventListeners();
        
        this.canvasInitialized = true;
        console.log("✅ Canvas инициализирован с CSS масштабированием");
        this.drawTacticalMap();
    }

    calculateCSSScale() {
        const container = document.querySelector('.tactical-map-visual');
        if (!container || !this.canvas) return;

        const rect = container.getBoundingClientRect();
        
        const scaleX = rect.width / 1024;
        const scaleY = rect.height / 1024;
        
        const scale = Math.min(scaleX, scaleY) * 0.85;
        
        console.log(`📏 CSS Scale: ${scale.toFixed(3)} (container: ${rect.width}x${rect.height})`);
        
        this.canvas.style.transform = `scale(${scale})`;
        this.canvas.style.transformOrigin = 'center center';
        
        this.zoomLevel = scale;
    }
    
    setupCanvasEventListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
        this.canvas.addEventListener('mouseleave', () => this.hideTooltip());

        window.addEventListener('resize', () => {
            setTimeout(() => {
                if (this.canvasInitialized) {
                    this.handleResize();
                }
            }, 100);
        });
    }

    zoomIn() {
        if (this.zoomLevel < this.maxZoom) {
            this.zoomLevel += this.zoomStep;
            this.applyZoom();
        }
    }

    zoomOut() {
        if (this.zoomLevel > this.minZoom) {
            this.zoomLevel -= this.zoomStep;
            this.applyZoom();
        }
    }

    resetZoom() {
        this.zoomLevel = 1.0;
        this.applyZoom();
    }

    applyZoom() {
        if (!this.currentTacticalMap || !this.canvasInitialized) return;
        
        const zoomElement = document.getElementById('currentZoom');
        if (zoomElement) {
            zoomElement.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
        
        this.canvas.style.transform = `scale(${this.zoomLevel})`;
        this.drawTacticalMap();
        
        console.log(`🔍 Масштаб изменен: ${Math.round(this.zoomLevel * 100)}%`);
    }

    drawTacticalMap() {
        if (!this.ctx || !this.currentTacticalMap) {
            console.log("❌ Canvas context или карта не доступна");
            return;
        }

        const canvas = this.canvas;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.drawBackground();
    }

    drawBackground() {
        const map = this.currentTacticalMap;
        
        if (!map.image) {
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.drawHexes();
            if (this.showGrid) {
                this.drawHexGrid();
            }
            return;
        }

        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.drawImage(
                img, 
                0, 
                0, 
                this.canvas.width, 
                this.canvas.height
            );
            
            this.drawHexes();
            
            if (this.showGrid) {
                this.drawHexGrid();
            }
            
            console.log("✅ Фон отрисован");
        };
        
        img.onerror = () => {
            console.error("❌ Ошибка загрузки фона карты");
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.drawHexes();
            if (this.showGrid) {
                this.drawHexGrid();
            }
        };
        
        img.src = map.image;
    }

    handleResize() {
        if (!this.canvasInitialized) return;
        
        console.log("🔄 Адаптация к изменению размеров окна");
        
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this.calculateCSSScale();
            this.drawTacticalMap();
            this.updateMovementInfo();
        }, 100);
    }

    drawHexGrid() {
        const cells = Object.values(this.currentTacticalMap.cells);
        const hexSize = this.currentTacticalMap.cellSize || 40;
        
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.6)';
        this.ctx.lineWidth = 1;
        
        cells.forEach(cell => {
            if (cell.visible) {
                const centerX = cell.x || cell.originalX || 0;
                const centerY = cell.y || cell.originalY || 0;
                
                if (!centerX || !centerY) return;
                
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = Math.PI / 3 * i + Math.PI / 6;
                    const x = centerX + hexSize * Math.cos(angle);
                    const y = centerY + hexSize * Math.sin(angle);
                    
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }
                this.ctx.closePath();
                this.ctx.stroke();
            }
        });
        this.ctx.restore();
    }

    drawHexes() {
        const cells = Object.values(this.currentTacticalMap.cells);
        
        cells.forEach(cell => {
            if (cell.visible) {
                this.drawSingleHex(cell);
                this.drawHexContent(cell);
            }
        });
    }

    drawSingleHex(cell) {
        const hexSize = this.currentTacticalMap.cellSize || 40;
        
        const centerX = cell.x || cell.originalX || 0;
        const centerY = cell.y || cell.originalY || 0;

        if (!centerX || !centerY) return;

        this.ctx.save();
        this.ctx.beginPath();
        
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = centerX + hexSize * Math.cos(angle);
            const y = centerY + hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();

        if (this.showGrid) {
            this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    drawHexContent(cell) {
        const centerX = cell.x || cell.originalX || 0;
        const centerY = cell.y || cell.originalY || 0;
        
        if (!centerX || !centerY) return;

        this.ctx.save();
        
        const hexSize = this.currentTacticalMap.cellSize || 40;
        
        if (cell.isHighlighted) {
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i + Math.PI / 6;
                const x = centerX + hexSize * Math.cos(angle);
                const y = centerY + hexSize * Math.sin(angle);
                
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            
            if (this.isTransitionCell(cell)) {
                this.ctx.fillStyle = cell.highlightColor || 'rgba(255, 215, 0, 0.4)';
            } else {
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            }
            this.ctx.fill();
        }
        
        if (cell.isSelected) {
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i + Math.PI / 6;
                const x = centerX + hexSize * Math.cos(angle);
                const y = centerY + hexSize * Math.sin(angle);
                
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 15;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }
        
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        let fontSize = 16;
        let symbol = '·';
        let color = '#ffffff';

        if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
            symbol = '🎯';
            fontSize = 20;
        } 
        else if (cell.hasLoot) {
            const lootLevel = this.currentTacticalMap?.jsonData?.meta?.lootLevel || 1;
            symbol = this.getLootSymbol(lootLevel);
            color = this.getLootColor(lootLevel);
            fontSize = 18;
        }
        else {
            if (cell.type === 'active' && !cell.objectType) {
                symbol = '·';
                color = '#ffffff';
                fontSize = 24;
            } else {
                symbol = this.objectSymbols[cell.type] || '·';
                
                switch(cell.type) {
                    case 'monster':
                    case 'orc_camp':
                    case 'bandit_camp':
                        color = '#ef4444';
                        break;
                    case 'chest':
                    case 'weapon':
                    case 'armor':
                    case 'magic_crystal':
                        color = '#f59e0b';
                        break;
                    case 'npc':
                    case 'merchant':
                    case 'traveler':
                        color = '#3b82f6';
                        break;
                    case 'exit':
                    case 'portal':
                    case 'cave':
                    case 'dungeon':
                        color = '#8b5cf6';
                        break;
                    case 'tavern':
                    case 'shop':
                    case 'village':
                    case 'castle':
                    case 'temple':
                        color = '#fbbf24';
                        break;
                    case 'obstacle':
                    case 'tree':
                    case 'elegant_tree':
                    case 'black_monolith':
                    case 'mountain':
                        color = '#6b7280';
                        break;
                    case 'lava_crack':
                    case 'campfire':
                        color = '#dc2626';
                        break;
                    case 'graveyard_cross':
                    case 'ancient_rune':
                        color = '#d6d3d1';
                        break;
                    case 'water':
                    case 'bridge':
                        color = '#0ea5e9';
                        break;
                    case 'cart':
                        color = '#78350f';
                        break;
                    case 'inactive':
                        color = '#ef4444';
                        break;
                    default:
                        color = '#ffffff';
                }
            }
        }

        fontSize = Math.max(8, Math.min(30, fontSize));
        
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(symbol, centerX, centerY);
        
        if (cell.explored) {
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
            this.ctx.fillText('✓', centerX + hexSize * 0.6, centerY - hexSize * 0.6);
        }
        
        this.ctx.restore();
    }

    getLootSymbol(lootLevel) {
        const symbols = ['💎', '⭐', '🔮', '👑', '🏆'];
        return symbols[lootLevel - 1] || symbols[0];
    }

    getLootColor(lootLevel) {
        const colors = ['#f59e0b', '#eab308', '#a855f7', '#ec4899', '#ef4444'];
        return colors[lootLevel - 1] || colors[0];
    }

    handleCanvasHover(e) {
        if (!this.currentTacticalMap) return;

        const canvasRect = this.canvas.getBoundingClientRect();
        
        const computedStyle = getComputedStyle(this.canvas);
        const transform = computedStyle.transform;
        let scale = 1;
        
        if (transform && transform !== 'none') {
            const matrix = new DOMMatrix(transform);
            scale = matrix.a;
        }
        
        const logicalX = (e.clientX - canvasRect.left) / scale;
        const logicalY = (e.clientY - canvasRect.top) / scale;

        const hex = this.getHexAtLogicalPosition(logicalX, logicalY);
        
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }

        const prevHex = this.currentTooltip;
        
        if (!hex || (prevHex && hex && (prevHex.col !== hex.col || prevHex.row !== hex.row))) {
            this.hideTooltip();
        }

        if (hex && (!prevHex || prevHex.col !== hex.col || prevHex.row !== hex.row)) {
            this.tooltipTimeout = setTimeout(() => {
                this.showTooltipForHex(hex, e.clientX, e.clientY);
            }, 200);
        }
    }

    showTooltipForHex(hex, mouseX, mouseY) {
        const tooltipText = this.getTooltipTextForHex(hex);
        if (!tooltipText) {
            this.hideTooltip();
            return;
        }

        if (!this.tooltipElement) {
            this.createTooltipElement();
        }

        this.removeHighlight();
        
        this.currentTooltip = hex;
        hex.isHighlighted = true;
        
        this.tooltipElement.textContent = tooltipText;
        this.tooltipElement.style.display = 'block';

        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = mouseX + 15;
        let top = mouseY + 15;

        if (left + tooltipRect.width > viewportWidth - 10) {
            left = mouseX - tooltipRect.width - 15;
        }
        if (top + tooltipRect.height > viewportHeight - 10) {
            top = mouseY - tooltipRect.height - 15;
        }

        this.tooltipElement.style.left = left + 'px';
        this.tooltipElement.style.top = top + 'px';

        this.drawTacticalMap();
    }
    
    getTooltipTextForHex(hex) {
        if (!hex.visible) return null;

        if (hex.tooltip) {
            return hex.tooltip;
        }

        if (hex.type === 'village' && hex.tacticalMap) {
            return `🍻 Таверна "${hex.tooltip || 'Уютное заведение'}"\n(Кликните для отдыха и пополнения фляги)`;
        }

        if (hex.type === 'water') {
            const isAccessible = this.isPlayerAdjacentToWater(hex);
            const accessibilityInfo = isAccessible ? "\n✅ Кликните для использования" : "\n❌ Подойдите ближе";
            return `💧 Источник воды\n(Восстановление здоровья и пополнение фляги)${accessibilityInfo}`;
        }

        if (hex.type === 'merchant') {
            const itemCount = hex.shopItems ? hex.shopItems.length : 0;
            const shopName = hex.shopName || "Магазин";
            const merchantName = hex.merchantName || "Торговец";
            return `🛒 ${shopName}\nТорговец: ${merchantName}\nТоваров: ${itemCount}\n(Кликните для торговли)`;
        }

        if (this.isTransitionCell(hex)) {
            const isAccessible = this.isPlayerAdjacentToTransition(hex);
            const accessibilityInfo = isAccessible ? "\n✅ Доступно для входа" : "\n❌ Подойдите ближе";
            
            if (hex.tacticalMap) {
                const locationName = this.getLocationNameFromPath(hex.tacticalMap);
                return `🚪 Вход в ${locationName}\n(Кликните для входа)${accessibilityInfo}`;
            }
            if (hex.localMap) {
                const locationName = this.getLocationNameFromPath(hex.localMap);
                return `🌍 Переход в ${locationName}\n(Кликните для перехода)${accessibilityInfo}`;
            }
            if (hex.globalMap) {
                const locationName = this.getLocationNameFromPath(hex.globalMap);
                return `🗺️ Переход в ${locationName}\n(Кликните для перехода)${accessibilityInfo}`;
            }
            if (hex.type === 'exit') {
                return `🚪 Выход\n(Кликните для возврата)${accessibilityInfo}`;
            }
        }

        if (hex.hasLoot) {
            const lootLevel = this.currentTacticalMap?.jsonData?.meta?.lootLevel || 1;
            const levelNames = ['Обычный', 'Хороший', 'Редкий', 'Эпический', 'Легендарный'];
            return `💎 Возможная награда\nУровень: ${levelNames[lootLevel - 1] || 'Обычный'}\n(Кликните для исследования)`;
        }

        if (hex.explored) {
            return `✓ Исследованная клетка\n(Действия уже выполнены)`;
        }

        const defaultTooltips = {
            'player_start': '⭐ Стартовая позиция',
            'monster': '👹 Враждебная территория\n(Возможен бой)',
            'chest': '📦 Тайный сундук\n(Может содержать сокровища)',
            'npc': '🧙 Таинственный незнакомец\n(Возможно, даст задание)',
            'exit': '🚪 Выход с карты\n(Вернуться на предыдущую карту)',
            'obstacle': '🪨 Препятствие\n(Непроходимо)',
            'active': '🟢 Проходимая местность',
            'inactive': '🔴 Непроходимая местность',
            'tree': '🌲 Дерево\n(Непроходимо)',
            'elegant_tree': '🎄 Изящное дерево\n(Непроходимо)',
            'cave': '🕳️ Пещера\n(Возможен вход)',
            'lava_crack': '🌋 Лавовый разлом\n(Опасно)',
            'graveyard_cross': '⚰️ Кладбищенский крест\n(Место силы)',
            'bandit_camp': '⚔️ Лагерь разбойников\n(Опасно)',
            'orc_camp': '👹 Лагерь орков\n(Очень опасно)',
            'black_monolith': '⬛ Черный монолит\n(Загадочный артефакт)',
            'weapon': '⚔️ Оружие\n(Можно найти)',
            'armor': '🛡️ Доспех\n(Можно найти)',
            'village': '🏘️ Деревня\n(Мирное поселение)',
            'castle': '🏰 Замок\n(Резиденция правителя)',
            'water': '💧 Водная поверхность\n(Непроходимо, но можно пополнить флягу)',
            'campfire': '🔥 Костер\n(Можно отдохнуть)',
            'cart': '🛒 Телега\n(Возможна торговля)',
            'traveler': '🚶 Путник\n(Может дать информацию)',
            'portal': '🌀 Магический портал\n(Телепортация)',
            'ancient_rune': '🔰 Древняя руна\n(Магический символ)',
            'magic_crystal': '💎 Магический кристалл\n(Источник магии)',
            'tavern': '🍻 Таверна\n(Место отдыха и слухов)',
            'shop': '🏪 Магазин\n(Торговля предметами)',
            'dungeon': '🏰 Подземелье\n(Опасно место)',
            'temple': '⛪ Храм\n(Священное место)',
            'bridge': '🌉 Мост\n(Переправа через препятствие)',
            'mountain': '⛰️ Гора\n(Непроходимо)'
        };

        const baseTooltip = defaultTooltips[hex.type] || null;
        
        if (baseTooltip) {
            const cellType = this.determineCellType(hex);
            const cellTypeData = this.cellTypes[cellType];
            
            if (cellTypeData && !hex.explored) {
                return `${baseTooltip}\n\n🔍 ${cellTypeData.name}\n${cellTypeData.description}\n\n⚡ Доступны действия (кликните для просмотра)`;
            }
        }
        
        return baseTooltip;
    }

    createTooltipElement() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.id = 'mapTooltip';
        this.tooltipElement.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #00ffff;
            font-size: 12px;
            font-family: Arial, sans-serif;
            z-index: 10000;
            pointer-events: none;
            white-space: pre-line;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            display: none;
            max-width: 250px;
            line-height: 1.4;
        `;
        document.body.appendChild(this.tooltipElement);
    }

    hideTooltip() {
        if (this.tooltipElement) {
            this.tooltipElement.style.display = 'none';
        }
        
        this.removeHighlight();
        
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }
    }
    
    highlightHex(hex) {
        if (!hex || hex.isHighlighted) return;
        
        hex.isHighlighted = true;
        this.drawSingleHexWithHighlight(hex);
    }
    
    removeHighlight() {
        let needsRedraw = false;
        
        if (this.currentTacticalMap) {
            Object.values(this.currentTacticalMap.cells).forEach(cell => {
                if (cell.isHighlighted) {
                    cell.isHighlighted = false;
                    needsRedraw = true;
                }
            });
        }
        
        this.currentTooltip = null;
        
        if (needsRedraw && this.canvasInitialized) {
            this.drawTacticalMap();
        }
    }

    getAvailableMoves() {
        if (!this.currentTacticalMap) return [];
        
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        
        console.log(`📍 Текущая позиция: [${currentCol}, ${currentRow}]`);
        console.log(`🎯 Доступные ходы:`, neighbors.map(n => `[${n.col}, ${n.row}]`));
        
        return neighbors;
    }

    getHexGeometry(hexSize) {
        return {
            size: hexSize,
            width: Math.sqrt(3) * hexSize,
            height: 2 * hexSize,
            horizontalDistance: Math.sqrt(3) * hexSize,
            verticalDistance: 1.5 * hexSize,
            diagonalDistance: Math.sqrt(3.25) * hexSize,
            expectedAdjacentDistance: Math.sqrt(3) * hexSize,
            tolerance: hexSize * 0.4
        };
    }

    getHexNeighbors(currentRow, currentCol) {
        if (!this.currentTacticalMap) return [];
        
        console.log(`🔍 Поиск соседей для [${currentCol},${currentRow}]`);
        
        const neighbors = [];
        const currentCell = this.currentTacticalMap.cells[`${currentCol},${currentRow}`];
        
        if (!currentCell) {
            console.log("❌ Текущая клетка не найдена!");
            return [];
        }
        
        const hexSize = this.currentTacticalMap.cellSize || 40;
        const geometry = this.getHexGeometry(hexSize);
        
        Object.values(this.currentTacticalMap.cells).forEach(potentialNeighbor => {
            if (potentialNeighbor.col === currentCol && potentialNeighbor.row === currentRow) {
                return;
            }
            
            const centerX = potentialNeighbor.x || potentialNeighbor.originalX || 0;
            const centerY = potentialNeighbor.y || potentialNeighbor.originalY || 0;
            const currentCenterX = currentCell.x || currentCell.originalX || 0;
            const currentCenterY = currentCell.y || currentCell.originalY || 0;
            
            const dx = centerX - currentCenterX;
            const dy = centerY - currentCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const isAdjacent = this.areHexesAdjacent(currentCell, potentialNeighbor, hexSize);
            
            if (isAdjacent) {
                const direction = this.getDirectionByAngle(dx, dy);
                
                if (potentialNeighbor.visible) {
                    if (potentialNeighbor.type === 'monster') {
                        neighbors.push({
                            row: potentialNeighbor.row,
                            col: potentialNeighbor.col,
                            cell: potentialNeighbor,
                            direction: direction,
                            distance: distance,
                            isMonster: true
                        });
                        console.log(`  ✅ Монстр-сосед: [${potentialNeighbor.col},${potentialNeighbor.row}] - ${direction}`);
                    }
                    else if (potentialNeighbor.passable !== false) {
                        neighbors.push({
                            row: potentialNeighbor.row,
                            col: potentialNeighbor.col,
                            cell: potentialNeighbor,
                            direction: direction,
                            distance: distance,
                            isMonster: false
                        });
                        console.log(`  ✅ Обычный сосед: [${potentialNeighbor.col},${potentialNeighbor.row}] - ${direction}`);
                    }
                }
            }
        });
        
        console.log(`🎯 Итог: найдено ${neighbors.length} доступных соседей`);
        return neighbors;
    }

    areHexesAdjacent(cell1, cell2, hexSize) {
        if (!cell1 || !cell2) return false;
        
        const geometry = this.getHexGeometry(hexSize);
        
        const centerX1 = cell1.x || cell1.originalX || 0;
        const centerY1 = cell1.y || cell1.originalY || 0;
        const centerX2 = cell2.x || cell2.originalX || 0;
        const centerY2 = cell2.y || cell2.originalY || 0;
        
        const dx = centerX2 - centerX1;
        const dy = centerY2 - centerY1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const isHorizontalAdjacent = Math.abs(distance - geometry.horizontalDistance) < geometry.tolerance;
        const isVerticalAdjacent = Math.abs(distance - geometry.verticalDistance) < geometry.tolerance;
        const isDiagonalAdjacent = Math.abs(distance - geometry.diagonalDistance) < geometry.tolerance;
        
        const isAdjacent = isHorizontalAdjacent || isVerticalAdjacent || isDiagonalAdjacent;
        
        return isAdjacent;
    }

    getDirectionByAngle(dx, dy) {
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        const normalizedAngle = (angle + 360) % 360;
        
        if (normalizedAngle >= 330 || normalizedAngle < 30) return 'восток';
        if (normalizedAngle >= 30 && normalizedAngle < 90) return 'юго-восток';
        if (normalizedAngle >= 90 && normalizedAngle < 150) return 'юг';
        if (normalizedAngle >= 150 && normalizedAngle < 210) return 'юго-запад';
        if (normalizedAngle >= 210 && normalizedAngle < 270) return 'запад';
        if (normalizedAngle >= 270 && normalizedAngle < 330) return 'северо-запад';
        
        return 'неизвестно';
    }

    setStartPositions() {
        console.log("🎯 Устанавливаем стартовые позиции...");
        
        if (this.localMaps.length > 0 && this.currentLocalMap) {
            console.log(`📍 Используем установленную локальную карту: ${this.currentLocalMap.name}`);
        }
        else if (this.tacticalMaps.length > 0) {
            this.currentTacticalMap = this.tacticalMaps[0];
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
            this.currentMapType = 'tactical';
            console.log(`🎯 Установлена стартовая тактическая карта: ${this.currentTacticalMap.name}`);
        }
        
        if (this.globalMaps.length > 0) {
            this.currentGlobalMap = this.globalMaps[0];
            this.playerGlobalPosition = {...this.currentGlobalMap.startPosition};
            console.log(`🗺️ Установлена глобальная карта: ${this.currentGlobalMap.name}`);
        }
        
        console.log("✅ Стартовые позиции установлены:", {
            global: this.playerGlobalPosition,
            local: this.playerLocalPosition, 
            tactical: this.playerTacticalPosition,
            mapType: this.currentMapType
        });
    }

    debugLoadedMaps() {
        console.group("📊 Отладка загруженных карт");
        console.log("Локальные карты:", this.localMaps.length);
        this.localMaps.forEach((map, index) => {
            console.log(`  ${index + 1}. ${map.name} (клеток: ${Object.keys(map.cells).length})`);
        });
        console.log("Тактические карты:", this.tacticalMaps.length);
        this.tacticalMaps.forEach((map, index) => {
            console.log(`  ${index + 1}. ${map.name} (клеток: ${Object.keys(map.cells).length})`);
        });
        console.log("Текущая локальная карта:", this.currentLocalMap?.name || 'нет');
        console.log("Текущая тактическая карта:", this.currentTacticalMap?.name || 'нет');
        console.log("Текущий тип карты:", this.currentMapType);
        console.groupEnd();
    }

    createTestMaps() {
        this.globalMaps = [{
            id: 1,
            name: "Континент Арканиум",
            image: "images/maps/global/arcanium.jpg",
            width: 10,
            height: 10,
            startPosition: {x: 5, y: 5},
            description: "Древний континент, полный загадок и опасностей",
            localMaps: [
                {globalX: 5, globalY: 5, localMapId: 1}
            ]
        }];

        this.localMaps = [{
            id: 1,
            name: "Долина Начала",
            image: "images/maps/local/valley.jpg",
            width: 8,
            height: 8,
            startPosition: {x: 4, y: 4},
            globalPosition: {x: 5, y: 5},
            description: "Мирная долина, где начинаются приключения",
            globalConnections: {
                north: {globalX: 5, globalY: 4},
                south: {globalX: 5, globalY: 6},
                east: {globalX: 6, globalY: 5},
                west: {globalX: 4, globalY: 5}
            },
            tacticalMaps: [
                {localX: 4, localY: 4, tacticalMapId: 1}
            ]
        }];

        this.tacticalMaps = [{
            id: 1,
            name: "Лесная Тропа",
            image: "images/maps/tactical/forest_path.jpg",
            width: 6,
            height: 6,
            startPosition: {x: 3, y: 3},
            localPosition: {x: 4, y: 4},
            description: "Извилистая тропа через древний лес",
            cells: {
                "3,3": {type: "start", passable: true, row: 3, col: 3, visible: true, x: 300, y: 300, explored: false, hasAction: true},
                "3,2": {type: "exit", passable: true, row: 2, col: 3, visible: true, x: 300, y: 250, explored: false, hasAction: true},
                "2,3": {type: "monster", passable: false, row: 3, col: 2, visible: true, x: 250, y: 300, explored: false, hasAction: true},
                "4,3": {type: "chest", passable: true, row: 3, col: 4, visible: true, x: 350, y: 300, explored: false, hasAction: true},
                "3,4": {type: "npc", passable: true, row: 4, col: 3, visible: true, x: 300, y: 350, explored: false, hasAction: true}
            }
        }];
    }

    createFallbackMaps() {
        this.globalMaps = [{
            id: 1,
            name: "Тестовый Мир",
            image: "",
            width: 5,
            height: 5,
            startPosition: {x: 2, y: 2},
            description: "Тестовый мир для разработки"
        }];

        this.localMaps = [{
            id: 1,
            name: "Тестовая Зона",
            image: "",
            width: 4,
            height: 4,
            startPosition: {x: 2, y: 2},
            globalPosition: {x: 2, y: 2}
        }];

        this.tacticalMaps = [{
            id: 1,
            name: "Тестовая Комната",
            image: "",
            width: 3,
            height: 3,
            startPosition: {x: 1, y: 1},
            localPosition: {x: 2, y: 2},
            cells: {
                "1,1": {type: "start", passable: true, row: 1, col: 1, visible: true, x: 100, y: 100, explored: false, hasAction: true}
            }
        }];
    }

    showMapOverlay(overlayType, container) {
        console.log(`🗺️ MapSystem: Показываем ${overlayType}`);
        
        let targetMap = null;
        let displayName = '';
        
        if (overlayType === 'local-map') {
            targetMap = this.currentLocalMap;
            displayName = '📍 Локальная карта';
            
            if (!targetMap && this.localMaps.length > 0) {
                targetMap = this.localMaps[0];
                this.currentLocalMap = targetMap;
                console.log(`🔄 Автоматически установлена локальная карта: ${targetMap.name}`);
            }
        } else {
            targetMap = this.currentTacticalMap;
            displayName = '🎲 Тактическая карта';
        }
        
        if (!targetMap) {
            console.error(`❌ ${overlayType} карта не загружена`);
            container.innerHTML = `
                <div class="overlay-content tactical-map-overlay">
                    <div class="tactical-map-header">
                        <h4>${displayName}</h4>
                        <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                    </div>
                    <div class="map-error" style="padding: 20px; text-align: center;">
                        Карта не загружена. Возможно, нужно создать тестовые карты.
                        <br><br>
                        <button class="btn-control" onclick="game.systems.map.createFallbackMaps(); game.systems.map.showOverlay('${overlayType}')">
                            🛠️ Создать тестовые карты
                        </button>
                    </div>
                </div>
            `;
            container.style.display = 'block';
            return;
        }
        
        console.log(`✅ Показываем карту: ${targetMap.name} (тип: ${overlayType}, клеток: ${Object.keys(targetMap.cells).length})`);
        
        this.currentTacticalMap = targetMap;
        
        if (overlayType === 'local-map') {
            this.currentMapType = 'local';
            this.playerTacticalPosition = {...this.playerLocalPosition};
            this.currentLocalMap = targetMap;
        } else {
            this.currentMapType = 'tactical';
        }
        
        container.innerHTML = `
            <div class="overlay-content tactical-map-overlay">
                <div class="tactical-map-header">
                    <h4>${targetMap.name}</h4>
                    <div class="map-type-badge">${overlayType === 'local-map' ? '📍 Локальная' : '🎲 Тактическая'}</div>
                    
                    <div class="zoom-controls">
                        <button class="btn-control" onclick="game.systems.map.zoomOut()" title="Уменьшить">
                            🔍−
                        </button>
                        <span class="zoom-info">${Math.round(this.zoomLevel * 100)}%</span>
                        <button class="btn-control" onclick="game.systems.map.zoomIn()" title="Увеличить">
                            🔍+
                        </button>
                        <button class="btn-control" onclick="game.systems.map.resetZoom()" title="Сбросить масштаб">
                            🔄
                        </button>
                        <button class="btn-control" onclick="game.systems.map.toggleFullscreen()" title="Полноэкранный режим">
                            📱
                        </button>
                    </div>
                    
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
                
                <div class="tactical-map-controls">
                    <button class="btn-control" onclick="game.systems.map.toggleGrid()">
                        ${this.showGrid ? '🔲 Скрыть сетку' : '🔳 Показать сетку'}
                    </button>
                    <button class="btn-control" onclick="game.systems.map.debugInfo()">
                        🐛 Отладка
                    </button>
                    <button class="btn-control" onclick="game.systems.map.testPeacefulMovement()">
                        🧪 Тест перемещения
                    </button>
                    <div class="position-info">
                        Позиция: [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]
                        ${overlayType === 'local-map' ? ' (локальная)' : ' (тактическая)'}
                    </div>
                </div>
                
                <div class="tactical-map-content-with-actions">
                    <div class="map-main-area">
                        <div class="tactical-map-visual">
                            <!-- Canvas будет добавлен автоматически -->
                        </div>
                    </div>
                    
                    <div class="cell-actions-panel">
                        <h4 class="actions-panel-title">⚡ Действия на клетке</h4>
                        <div class="cell-actions-container" id="cellActionsContainer">
                            <div class="actions-placeholder">
                                Выберите клетку для просмотра доступных действий
                            </div>
                        </div>
                        
                        <div class="cell-info-footer">
                            <div class="action-hint">
                                ℹ️ Каждая клетка позволяет совершить одно действие
                            </div>
                            <div class="resource-info">
                                <h5>📦 Ресурсы героя:</h5>
                                <div class="resource-list" id="heroResourcesList">
                                    <!-- Ресурсы будут загружены динамически -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="tactical-map-info">
                    <div class="map-description">
                        ${targetMap.description || 'Описание отсутствует'}
                    </div>
                    <div class="map-stats">
                        <span>Клеток: ${Object.keys(targetMap.cells).length}</span>
                        <span>Размер: ${targetMap.width}x${targetMap.height}</span>
                        <span>Масштаб: <span id="currentZoom">${Math.round(this.zoomLevel * 100)}%</span></span>
                        <span id="availableMoves">Доступных ходов: 0</span>
                    </div>
                </div>
            </div>
        `;
        
       container.style.display = 'block';
    

setTimeout(() => {
    console.log("🎨 Инициализируем Canvas для карты...");
    
    if (!this.currentTacticalMap) {
        console.error("❌ currentTacticalMap не установлена для Canvas");
        return;
    }
    
    try {
        this.initCanvas();
        this.updateMovementInfo();
        this.updateHeroResourcesUI();
        
        // ВАЖНО: Автоматически показываем описание текущей клетки
        const cellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
        const currentCell = this.currentTacticalMap.cells[cellKey];
        
        if (currentCell) {
            console.log(`📍 Автоматически показываем описание текущей клетки [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]`);
            // Небольшая задержка для гарантии что DOM готов
            setTimeout(() => {
                this.updateCellActionsUI(currentCell);
                this.highlightSelectedCell(currentCell);
            }, 100);
        }
        
        console.log("✅ Canvas успешно инициализирован");
        
    } catch (error) {
        console.error("❌ Ошибка инициализации Canvas:", error);
    }
}, 50);
}
    showOverlay(overlayType) {
        console.log(`🎯 MapSystem: Показываем оверлей: ${overlayType}`);
        
        const container = document.getElementById('overlay-container');
        if (!container) {
            console.error("❌ Контейнер оверлея не найден");
            return;
        }

        this.activeOverlay = overlayType;

        this.hideTooltip();
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        switch(overlayType) {
            case 'tactical-map':
            case 'local-map':
                this.showMapOverlay(overlayType, container);
                break;

            case 'global-map':
                container.innerHTML = `
                    <div class="overlay-content map-overlay">
                        <div class="overlay-header">
                            <h3>🗺️ Глобальная карта</h3>
                            <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                        </div>
                        <div class="overlay-body">
                            ${this.renderGlobalMap()}
                        </div>
                    </div>
                `;
                container.style.display = 'block';
                break;

            default:
                console.warn(`⚠️ Неизвестный тип оверлея в MapSystem: ${overlayType}`);
                container.innerHTML = `<div class="map-error">Неизвестный тип окна: ${overlayType}</div>`;
                container.style.display = 'block';
        }
    }

    hideOverlay() {
        console.log("👋 MapSystem: Скрываем оверлей");
        
        const container = document.getElementById('overlay-container');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
            this.activeOverlay = null;
            this.hoveredHex = null;
            this.lastHoveredHex = null;
            this.hideTooltip();
            
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            
            console.log("✅ Оверлей скрыт");
        }
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.drawTacticalMap();
    }

    showTacticalMapEditor() {
        if (!this.currentHero) {
            console.error("❌ Герой не выбран для тактической карты!");
            if (window.game) {
                window.game.showNotification("❌ Сначала выберите героя!", 'error');
                setTimeout(() => {
                    window.game.showHeroSelection();
                }, 1000);
            }
            return;
        }
        
        this.showOverlay('tactical-map');
    }

    forceRedraw() {
        if (this.canvasInitialized) {
            this.calculateCSSScale();
            this.drawTacticalMap();
        }
    }

    updateMovementInfo() {
        const availableMoves = this.getAvailableMoves();
        
        const movesElement = document.getElementById('availableMoves');
        if (movesElement) {
            movesElement.textContent = `Доступных ходов: ${availableMoves.length}`;
        }
    }

    debugInfo() {
        console.group("🗺️ MapSystem Debug Info");
        console.log("Глобальная позиция:", this.playerGlobalPosition);
        console.log("Локальная позиция:", this.playerLocalPosition);
        console.log("Тактическая позиция:", this.playerTacticalPosition);
        console.log("Текущая глобальная карта:", this.currentGlobalMap?.name);
        console.log("Текущая локальная карта:", this.currentLocalMap?.name);
        console.log("Текущая тактическая карта:", this.currentTacticalMap?.name);
        console.log("Тип текущей карты:", this.currentMapType);
        console.log("Глубина стека карт:", this.mapStack.length);
        console.log("Загружено JSON карт:", this.loadedJSONMaps.size);
        console.log("Canvas инициализирован:", this.canvasInitialized);
        console.log("Текущий герой:", this.currentHero?.name || 'нет');
        console.log("Масштаб:", `${Math.round(this.zoomLevel * 100)}%`);
        console.log("Смещение карты:", this.mapOffset);
        
        const availableMoves = this.getAvailableMoves();
        console.log("Доступные ходы:", availableMoves.length);
        availableMoves.forEach(move => {
            console.log(`  [${move.col},${move.row}] - ${move.direction}${move.isMonster ? ' (монстр)' : ''}`);
        });
        
        console.groupEnd();
    }

    testPeacefulMovement() {
        if (!this.currentTacticalMap) {
            console.error("❌ Нет текущей карты");
            return;
        }
        
        console.log("🧪 Тестирование мирное перемещение...");
        
        const availableMoves = this.getAvailableMoves();
        console.log("Доступные ходы:", availableMoves);
        
        if (availableMoves.length > 0) {
            const targetMove = availableMoves[0];
            console.log(`Пытаемся переместиться на: [${targetMove.col}, ${targetMove.row}]`);
            
            const cellData = this.currentTacticalMap.cells[`${targetMove.col},${targetMove.row}`];
            if (cellData) {
                this.handlePeacefulMovement(targetMove.col, targetMove.row, cellData);
            } else {
                console.error("❌ Клетка не найдена");
            }
        } else {
            console.log("❌ Нет доступных ходов для тестирования");
        }
    }

    drawSingleHexWithHighlight(hex) {
        if (!this.ctx || !hex) return;
        
        const hexSize = this.currentTacticalMap.cellSize || 40;
        const centerX = hex.x || hex.originalX || 0;
        const centerY = hex.y || hex.originalY || 0;
        
        if (!centerX || !centerY) return;

        this.ctx.save();
        this.ctx.beginPath();
        
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = centerX + hexSize * Math.cos(angle);
            const y = centerY + hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        this.ctx.fill();
        
        this.ctx.restore();
        
        this.drawHexContent(hex);
    }

    forceLoadLocalMap() {
        console.log("🔄 Принудительная загрузка локальной карты...");
        
        if (this.localMaps.length === 0) {
            console.error("❌ Нет доступных локальных карт");
            
            this.createFallbackLocalMap();
            
            if (this.localMaps.length === 0) {
                console.error("❌ Не удалось создать тестовую локальную карту");
                return false;
            }
        }
        
        const localMap = this.localMaps[0];
        this.setCurrentLocalMap(localMap);
        
        console.log(`✅ Локальная карта установлена: ${localMap.name}`);
        return true;
    }

    createFallbackLocalMap() {
        console.log("🔄 Создаем тестовую локальную карту...");
        
        const testLocalMap = {
            id: 1,
            name: "Тестовая Локальная Зона",
            image: "",
            width: 8,
            height: 8,
            startPosition: {x: 4, y: 4},
            globalPosition: {x: 2, y: 2},
            description: "Тестовая локальная зона для разработки",
            cells: {
                "4,4": {
                    type: "player_start", 
                    passable: true, 
                    row: 4, 
                    col: 4, 
                    visible: true, 
                    x: 200, 
                    y: 200,
                    explored: false,
                    hasAction: true
                },
                "4,3": {
                    type: "exit", 
                    passable: true, 
                    row: 3, 
                    col: 4, 
                    visible: true, 
                    x: 200, 
                    y: 150,
                    explored: false,
                    hasAction: true
                },
                "3,4": {
                    type: "monster", 
                    passable: false, 
                    row: 4, 
                    col: 3, 
                    visible: true, 
                    x: 150, 
                    y: 200,
                    explored: false,
                    hasAction: true
                }
            },
            cellSize: 40,
            originalCanvasWidth: 400,
            originalCanvasHeight: 400,
            mapType: 'local'
        };
        
        this.localMaps.push(testLocalMap);
        console.log("✅ Тестовая локальная карта создана");
    }

    renderGlobalMap() {
        if (!this.currentGlobalMap) return '<div class="map-error">Глобальная карта не загружена</div>';

        return `
            <div class="map-container global-map">
                <h4>${this.currentGlobalMap.name}</h4>
                <div class="map-grid" style="grid-template-columns: repeat(${this.currentGlobalMap.width}, 1fr);">
                    ${this.generateGlobalMapGrid()}
                </div>
                <div class="map-info">
                    Позиция: [${this.playerGlobalPosition.x}, ${this.playerGlobalPosition.y}]
                </div>
            </div>
        `;
    }

    generateGlobalMapGrid() {
        let gridHTML = '';
        const { width, height } = this.currentGlobalMap;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const isPlayerHere = x === this.playerGlobalPosition.x && y === this.playerGlobalPosition.y;
                let cellClass = 'map-cell global-cell';
                let cellContent = '·';

                if (isPlayerHere) {
                    cellClass += ' player-cell';
                    cellContent = '🎯';
                }

                gridHTML += `
                    <div class="${cellClass}" 
                         onclick="game.systems.map.moveOnGlobalMap(${x}, ${y})"
                         title="Глобальная позиция: [${x}, ${y}]">
                        ${cellContent}
                    </div>
                `;
            }
        }
        
        return gridHTML;
    }

    moveOnGlobalMap(x, y) {
        const localMap = this.findLocalMapAtPosition(x, y);
        if (!localMap) {
            console.log("🚫 На этой позиции нет локальной карты");
            if (window.game) {
                window.game.showNotification("На этой позиции нет локации!", 'warning');
            }
            return;
        }

        this.playerGlobalPosition = {x, y};
        this.currentLocalMap = localMap;
        this.playerLocalPosition = {...localMap.startPosition};
        
        const tacticalMap = this.findTacticalMapAtPosition(
            this.playerLocalPosition.x,
            this.playerLocalPosition.y
        );
        
        if (tacticalMap) {
            this.currentTacticalMap = tacticalMap;
            this.playerTacticalPosition = {...tacticalMap.startPosition};
        }

        console.log(`🌍 Перемещение на глобальную позицию: [${x}, ${y}]`);
        this.updateGameDisplay();
        
        if (window.game) {
            window.game.showNotification(`Перемещение в ${localMap.name}`, 'success');
        }
    }

    findLocalMapAtPosition(globalX, globalY) {
        return this.localMaps.find(map => 
            map.globalPosition && 
            map.globalPosition.x === globalX && 
            map.globalPosition.y === globalY
        );
    }

    findTacticalMapAtPosition(localX, localY) {
        return this.tacticalMaps.find(map => 
            map.localPosition && 
            map.localPosition.x === localX && 
            map.localPosition.y === localY
        );
    }

    updateGameDisplay() {
        if (window.game && window.game.systems.hero && window.game.systems.hero.currentHero) {
            window.game.systems.hero.showHeroGameScreen();
        }
    }

    debugBackgroundInfo() {
        console.group("🎨 Debug Background Info");
        const map = this.currentTacticalMap;
        const container = document.querySelector('.tactical-map-visual');
        
        if (container) {
            const rect = container.getBoundingClientRect();
            console.log("Container size:", rect.width, "x", rect.height);
        }
        
        console.log("Original canvas size:", map.originalCanvasWidth, "x", map.originalCanvasHeight);
        console.log("Current zoom:", this.zoomLevel);
        console.log("Map offset:", this.mapOffset);
        console.log("Has background image:", !!map.image);
        console.groupEnd();
    }

    toggleFullscreen() {
        const canvas = this.canvas;
        if (!canvas) return;

        if (!document.fullscreenElement) {
            if (canvas.requestFullscreen) {
                canvas.requestFullscreen();
            } else if (canvas.webkitRequestFullscreen) {
                canvas.webkitRequestFullscreen();
            } else if (canvas.msRequestFullscreen) {
                canvas.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    showNotification(message, type = 'info') {
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен с интеграцией магазинов и системой действий на клетках");
