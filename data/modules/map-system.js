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
        this.pendingAction = null;
        this.pendingResearch = null;
        
        this.canvasInitialized = false;
        
        this.mapStack = [];
        this.currentMapType = 'local';
        
        // Ссылка на ActionSystem
        this.actionSystem = null;
        this.timeSystem = null;
        
        // Типы карт
        this.mapTypes = {
            'travel': {
                name: "Карта для путешествий",
                description: "Открытая местность для исследования",
                is_peaceful: false,
                time_required: true,
                requires_research: true
            },
            'tavern': {
                name: "Таверна",
                description: "Мирное место для отдыха",
                is_peaceful: true,
                time_required: false,
                requires_research: false
            },
            'castle': {
                name: "Замок",
                description: "Фортификация правителя",
                is_peaceful: true,
                time_required: false,
                requires_research: false
            },
            'city': {
                name: "Город",
                description: "Крупное поселение",
                is_peaceful: true,
                time_required: false,
                requires_research: false
            },
            'dungeon': {
                name: "Подземелье",
                description: "Опасное подземное место",
                is_peaceful: false,
                time_required: true,
                requires_research: true
            }
        };
        
        // Типы клеток и действия
        this.cellTypes = {};
        
        // Видимость и туман войны
        this.fogColors = {
            EXPLORED: 'rgba(0, 0, 0, 0)',
            PLAYER: 'rgba(0, 0, 0, 0)',
            ADJACENT: 'rgba(0, 0, 0, 0.2)',
            VISIBLE: 'rgba(0, 0, 0, 0.5)',
            HIDDEN: 'rgba(0, 0, 0, 0.8)',
            OBSCURED: 'rgba(0, 0, 0, 0.95)'
        };
        
        this.visibilityLevels = {
            EXPLORED: 1.0,
            PLAYER: 1.0,
            ADJACENT: 0.9,
            VISIBLE: 0.6,
            HIDDEN: 0.3,
            OBSCURED: 0.0
        };
        
        this.visibilityRadius = 2;
        this.fogOfWarEnabled = true;
        
        // Счетчики действий на клетках
        this.cellActionCounters = {};
        
        this.tooltipElement = null;
        this.currentTooltip = null;
        this.tooltipTimeout = null;
        this.resizeTimeout = null;
        
        console.log("✅ MapSystem инициализирован (новая концепция)");
    }

    // ========== ОСНОВНЫЕ МЕТОДЫ ==========

    /**
     * Инициализация ActionSystem
     */
    initializeActionSystem() {
        if (!this.actionSystem) {
            this.actionSystem = new ActionSystem(this);
            console.log("✅ ActionSystem создан и привязан к MapSystem");
        }
        return this.actionSystem;
    }

    /**
     * Инициализация TimeSystem
     */
    initializeTimeSystem() {
        if (!this.timeSystem) {
            if (typeof TimeSystem !== 'undefined') {
                this.timeSystem = new TimeSystem(this);
                console.log("✅ TimeSystem создан из глобального класса");
            } else {
                this.createBasicTimeSystem();
            }
        }
        return this.timeSystem;
    }

    /**
     * Загрузка всех данных карт
     */
    async loadMapData() {
        try {
            console.log("📥 MapSystem: Загружаем данные карт...");
            
            // Инициализируем системы
            this.initializeTimeSystem();
            this.initializeActionSystem();
            
            // Загружаем типы карт
            await this.loadMapTypes();
            
            // Загружаем типы клеток
            await this.loadCellTypes();
            
            // Загружаем JSON карты
            await this.loadJSONMaps();
            
            // Инициализируем клетки
            await this.initializeCellSystem();
            
            // Создаем лагерь если нужно
            if (this.timeSystem && !this.timeSystem.camp.exists) {
                const startHex = this.findStartHex();
                if (startHex) {
                    this.playerTacticalPosition = {x: startHex.col, y: startHex.row};
                    this.timeSystem.camp.location = {...this.playerTacticalPosition};
                    this.timeSystem.camp.exists = true;
                    this.timeSystem.camp.protections = ['basic_campfire'];
                    this.timeSystem.camp.level = 1;
                    console.log(`🏕️ Автоматически создан лагерь на стартовой позиции [${startHex.col},${startHex.row}]`);
                }
            }
            
            // Устанавливаем начальную карту
            this.determineCurrentMapType();
            if (this.localMaps.length > 0) {
                this.forceSetLocalMap();
            } else if (this.tacticalMaps.length === 0 && this.localMaps.length === 0) {
                console.log("⚠️ Нет загруженных карт, создаем тестовые...");
                this.createTestMaps();
                if (this.localMaps.length > 0) {
                    this.forceSetLocalMap();
                }
            }
            
            this.setStartPositions();
            
            console.log(`✅ Карты загружены: Локальных=${this.localMaps.length}, Тактических=${this.tacticalMaps.length}`);
            
            // Обновляем отображение времени
            if (this.timeSystem) {
                this.timeSystem.updateTimeDisplay();
            }
            
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных карт:", error);
            this.createFallbackMaps();
            if (this.localMaps.length > 0) {
                this.forceSetLocalMap();
            }
            
            if (this.timeSystem && !this.timeSystem.camp.exists) {
                this.timeSystem.camp.location = {...this.playerTacticalPosition};
                this.timeSystem.camp.exists = true;
                this.timeSystem.camp.protections = ['basic_campfire'];
                this.timeSystem.camp.level = 1;
            }
            
            return true;
        }
    }

    /**
     * Загрузка типов карт
     */
    async loadMapTypes() {
        try {
            const response = await fetch('data/map_types.json');
            if (response.ok) {
                const data = await response.json();
                this.mapTypes = {...this.mapTypes, ...data.map_types};
                console.log(`✅ Загружено типов карт: ${Object.keys(this.mapTypes).length}`);
            }
        } catch (error) {
            console.log("⚠️ map_types.json не загружен, используем стандартные");
        }
    }

    /**
     * Загрузка типов клеток
     */
    async loadCellTypes() {
        try {
            const response = await fetch('data/cell_types.json');
            if (response.ok) {
                const data = await response.json();
                this.cellTypes = data.cell_types || {};
                console.log(`✅ Загружено типов клеток: ${Object.keys(this.cellTypes).length}`);
            }
        } catch (error) {
            console.error("❌ Ошибка загрузки типов клеток:", error);
        }
    }

    /**
     * Определение типа текущей карты
     */
    determineCurrentMapType() {
        if (!this.currentTacticalMap) return 'travel';
        
        const mapName = this.currentTacticalMap.name.toLowerCase();
        
        if (mapName.includes('таверн') || mapName.includes('tavern')) {
            this.currentMapType = 'tavern';
        } else if (mapName.includes('замок') || mapName.includes('castle')) {
            this.currentMapType = 'castle';
        } else if (mapName.includes('город') || mapName.includes('city')) {
            this.currentMapType = 'city';
        } else if (mapName.includes('подземель') || mapName.includes('dungeon')) {
            this.currentMapType = 'dungeon';
        } else {
            this.currentMapType = 'travel';
        }
        
        console.log(`🗺️ Определен тип карты: ${this.currentMapType} (${this.currentTacticalMap.name})`);
        
        return this.currentMapType;
    }

    // ========== УПРАВЛЕНИЕ ГЕРОЕМ ==========

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

    syncHeroWithOtherSystems() {
        if (!this.currentHero) return;
        
        if (window.game) {
            window.game.currentHero = this.currentHero;
            
            if (window.game.systems.hero) {
                window.game.systems.hero.currentHero = this.currentHero;
            }
            
            if (window.game.systems.equipment) {
                window.game.systems.equipment.setCurrentHero(this.currentHero);
            }
            
            if (window.game.systems.battle) {
                window.game.systems.battle.currentHero = this.currentHero;
            }
        }
    }

    // ========== НОВАЯ СИСТЕМА ПЕРЕМЕЩЕНИЯ И ИССЛЕДОВАНИЯ ==========

    /**
     * Основной метод обработки клика по карте
     */
    handleCanvasClick(e) {
        if (!this.currentTacticalMap) {
            console.error("❌ Нет текущей тактической карты");
            return;
        }

        console.log("🎯 ОБРАБОТКА КЛИКА ПО КАРТЕ");

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
        if (!hex) {
            console.log("❌ Клетка не найдена по координатам");
            return;
        }
        
        console.log(`🎲 Клик по клетке: [${hex.col}, ${hex.row}] тип: ${hex.type}`);
        
        // Проверяем достижимость
        const isReachable = this.isHexReachable(hex);
        
        if (!isReachable) {
            this.showNotification("❌ Чтобы взаимодействовать, нужно подойти вплотную!", 'warning');
            this.highlightUnreachableHex(hex);
            return;
        }
        
        // Если игрок уже на этой клетке
        if (hex.col === this.playerTacticalPosition.x && hex.row === this.playerTacticalPosition.y) {
            this.showCellActions(hex);
            return;
        }
        
        // Проверяем тип клетки
        const cellType = this.getCellType(hex);
        const cellTypeData = this.cellTypes[cellType];
        
        // Если клетка не исследована и требует исследования
        if (!hex.explored && cellTypeData?.research_required) {
            this.handleUnexploredHexClick(hex, cellTypeData);
            return;
        }
        
        // Если это переход
        if (this.isTransitionCell(hex)) {
            this.handleTransitionClick(hex);
            return;
        }
        
        // Если это специальная клетка (торговец, вода и т.д.)
        if (this.isSpecialCell(hex)) {
            this.handleSpecialCellClick(hex);
            return;
        }
        
        // Обычное перемещение
        this.handleMovementToHex(hex);
    }

    /**
     * Проверка достижимости гекса
     */
    isHexReachable(hex) {
        if (!hex || !this.playerTacticalPosition) return false;
        
        if (hex.col === this.playerTacticalPosition.x && hex.row === this.playerTacticalPosition.y) {
            return true;
        }
        
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        return neighbors.some(neighbor => 
            neighbor.row === hex.row && neighbor.col === hex.col
        );
    }

    /**
     * Обработка клика на неисследованном гексе
     */
    handleUnexploredHexClick(hex, cellTypeData) {
        console.log(`🔍 Клик на неисследованном гексе [${hex.col},${hex.row}]`);
        
        // Проверяем время
        const timeStatus = this.timeSystem?.getTimeStatus();
        const isNight = timeStatus?.isNight || false;
        
        let message = `Этот гекс [${hex.col},${hex.row}] не исследован.\n`;
        message += `Для исследования нужно победить монстра (уровень опасности: ${cellTypeData.research_monster_level || 1}).\n`;
        message += `Время исследования: ${cellTypeData.time_to_research || 1} час(ов).\n`;
        
        if (isNight) {
            message += "\n⚠️ Исследование ночью ОЧЕНЬ ОПАСНО!\n";
            message += "Без костра вероятность нападения 90% каждый час.\n";
            message += "Рекомендуется исследовать утром.\n\n";
        }
        
        message += "Исследовать сейчас?";
        
        if (window.confirm(message)) {
            this.startHexResearch(hex, cellTypeData);
        }
    }

    /**
     * Начало исследования гекса (бой с монстром)
     */
    async startHexResearch(hex, cellTypeData) {
        console.log(`⚔️ Начинаем исследование гекса [${hex.col},${hex.row}]`);
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            this.showNotification("❌ Система боя не доступна!", 'error');
            return;
        }
        
        if (!this.currentHero) {
            this.showNotification("❌ Герой не выбран!", 'error');
            return;
        }
        
        // Получаем монстра для исследования
        const monster = this.getResearchMonster(cellTypeData);
        if (!monster) {
            this.showNotification("❌ Не удалось найти монстра для исследования", 'error');
            return;
        }
        
        // Сохраняем информацию для послебоевой обработки
        this.pendingResearch = {
            hex: hex,
            cellTypeData: cellTypeData,
            monster: monster,
            targetX: hex.col,
            targetY: hex.row
        };
        
        // Начинаем бой
        battleSystem.startBattleWithSpecificMonster(
            this.currentHero,
            monster,
            'research'
        );
    }

    /**
     * Завершение исследования после боя
     */
    completeResearchAfterBattle(victory, escape) {
        if (!this.pendingResearch) {
            console.warn("❌ Нет ожидающего исследования");
            return;
        }
        
        const { hex, cellTypeData, targetX, targetY } = this.pendingResearch;
        
        if (victory) {
            // Успешное исследование
            hex.explored = true;
            hex.hasAction = true;
            
            // Отмечаем клетку как исследованную
            this.markCellAsExplored(hex.row, hex.col);
            
            // Открываем видимость соседних клеток
            this.revealAdjacentCells(hex.row, hex.col);
            
            // Выдача награды за исследование
            this.giveResearchReward(hex, cellTypeData);
            
            // Тратим время на исследование
            if (this.timeSystem) {
                for (let i = 0; i < cellTypeData.time_to_research; i++) {
                    this.timeSystem.spendHourOnHex('research');
                }
            }
            
            // Перемещаем героя на исследованный гекс
            const oldPosition = {...this.playerTacticalPosition};
            this.playerTacticalPosition = {x: targetX, y: targetY};
            this.updateVisibilityOnMove(targetX, targetY);
            
            this.showNotification(`✅ Гекс [${targetX},${targetY}] исследован!`, 'success');
            console.log(`✅ Перемещение после исследования: [${oldPosition.x},${oldPosition.y}] → [${targetX},${targetY}]`);
            
        } else {
            // Неудачное исследование
            if (escape) {
                this.showNotification(`🏃 Вы сбежали с поля боя`, 'warning');
            } else {
                this.showNotification(`💀 Поражение! Возврат на стартовую позицию`, 'error');
                // При поражении возвращаемся на стартовую позицию
                const startPosition = this.currentTacticalMap.startPosition;
                this.playerTacticalPosition = {...startPosition};
            }
        }
        
        // Очищаем pending
        this.pendingResearch = null;
        
        // Перерисовываем карту
        this.drawTacticalMap();
        
        // Обновляем интерфейс
        setTimeout(() => {
            this.showCellActions(hex);
        }, 500);
    }

    /**
     * Получение монстра для исследования
     */
    getResearchMonster(cellTypeData) {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return null;
        
        // Если есть список конкретных монстров
        if (cellTypeData.monsters && cellTypeData.monsters.length > 0) {
            const monsterId = cellTypeData.monsters[
                Math.floor(Math.random() * cellTypeData.monsters.length)
            ];
            return battleSystem.getMonsterById(monsterId);
        }
        
        // Иначе случайный монстр по уровню
        return this.getRandomMonsterByLevel(cellTypeData.research_monster_level || 1);
    }

    /**
     * Выдача награды за исследование
     */
    giveResearchReward(hex, cellTypeData) {
        if (!cellTypeData.loot_after_research) return;
        
        const loot = cellTypeData.loot_after_research;
        
        // Золото
        if (loot.gold && Math.random() * 100 <= loot.gold.chance) {
            const amount = Math.floor(
                Math.random() * (loot.gold.max - loot.gold.min + 1)
            ) + loot.gold.min;
            
            if (this.currentHero) {
                this.currentHero.gold += amount;
                this.showNotification(`💰 Найдено ${amount} золота при исследовании!`, 'success');
            }
        }
        
        // Ресурсы
        if (loot.resources) {
            Object.entries(loot.resources).forEach(([resourceType, chance]) => {
                if (Math.random() * 100 <= chance) {
                    this.addResourceToHero(resourceType, 1);
                }
            });
        }
    }

    /**
     * Обработка перемещения на гекс
     */
    handleMovementToHex(hex) {
        if (!hex.passable) {
            this.showNotification(`❌ Клетка непроходима`, 'error');
            return;
        }
        
        console.log(`🚶 Перемещение на [${hex.col},${hex.row}]`);
        
        const oldPosition = {...this.playerTacticalPosition};
        this.playerTacticalPosition = {x: hex.col, y: hex.row};
        
        // Обновляем видимость
        this.updateVisibilityOnMove(hex.col, hex.row);
        
        // Тратим 1 час времени (если не мирная карта)
        if (!this.isPeacefulMap() && this.timeSystem) {
            this.timeSystem.spendHourOnHex('movement');
        }
        
        console.log(`✅ Перемещение: [${oldPosition.x},${oldPosition.y}] → [${hex.col},${hex.row}]`);
        
        this.showNotification(`✅ Перемещение на [${hex.col},${hex.row}]`, 'success');
        this.drawTacticalMap();
        
        // Показываем действия на новой клетке
        setTimeout(() => {
            this.showCellActions(hex);
        }, 300);
    }

    /**
     * Показ действий на клетке
     */
    showCellActions(hex) {
        console.log(`🎯 Показываем действия для клетки [${hex.col},${hex.row}]`);
        
        if (!hex.explored && this.cellTypes[this.getCellType(hex)]?.research_required) {
            this.showNotification("❌ Сначала исследуйте этот гекс!", 'warning');
            return;
        }
        
        const cellType = this.getCellType(hex);
        const cellTypeData = this.cellTypes[cellType];
        
        if (!cellTypeData || !cellTypeData.actions || cellTypeData.actions.length === 0) {
            this.showNotification("ℹ️ На этой клетке нет доступных действий", 'info');
            return;
        }
        
        // Получаем доступные действия (только одно на клетку)
        const availableActions = this.getAvailableActionsForHex(hex, cellTypeData);
        
        if (availableActions.length === 0) {
            this.showNotification("ℹ️ Все действия на этой клетке уже выполнены", 'info');
            return;
        }
        
        // Показываем интерфейс выбора действия
        this.showActionSelection(hex, availableActions);
    }

    /**
     * Получение доступных действий для гекса
     */
    getAvailableActionsForHex(hex, cellTypeData) {
        const cellKey = `${hex.col},${hex.row}`;
        const actionCount = this.cellActionCounters[cellKey] || 0;
        
        // Если на клетке уже выполнено действие, показываем только если она многоразовая
        if (actionCount > 0 && !cellTypeData.reusable_after_research) {
            return [];
        }
        
        // Фильтруем действия по времени суток и другим условиям
        const timeStatus = this.timeSystem?.getTimeStatus();
        const isNight = timeStatus?.isNight || false;
        
        return cellTypeData.actions.filter(action => {
            // Проверка времени суток
            if (isNight && action.night_success_chance === 0) {
                return false;
            }
            
            // Проверка исследования
            if (action.requires_research && !hex.explored) {
                return false;
            }
            
            // Проверка навыков
            if (action.requires_skill && !this.hasHeroSkill(action.requires_skill)) {
                return false;
            }
            
            return true;
        });
    }

    /**
     * Показ выбора действия
     */
    showActionSelection(hex, actions) {
        if (actions.length === 1) {
            // Если только одно действие - выполняем его сразу
            this.performCellAction(actions[0], hex);
            return;
        }
        
        // Создаем интерфейс выбора действия
        const actionList = actions.map(action => 
            `<button class="action-btn" onclick="game.systems.map.performCellAction(${JSON.stringify(action)}, ${JSON.stringify(hex)})">
                ${action.icon} ${action.name}
                <br><small>${action.description}</small>
            </button>`
        ).join('');
        
        const container = document.getElementById('cellActionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="actions-selection">
                    <h5>⚡ Выберите действие:</h5>
                    <div class="action-buttons">
                        ${actionList}
                    </div>
                </div>
            `;
        }
    }

    /**
     * Выполнение действия на клетке
     */
    async performCellAction(action, hex) {
        console.log(`⚡ Выполнение действия: ${action.name} на [${hex.col},${hex.row}]`);
        
        if (!this.currentHero) {
            this.showNotification("❌ Герой не выбран!", 'error');
            return;
        }
        
        // Проверяем время суток
        const timeStatus = this.timeSystem?.getTimeStatus();
        const isNight = timeStatus?.isNight || false;
        
        // Рассчитываем шанс успеха
        let successChance = isNight ? (action.night_success_chance || 0) : (action.day_success_chance || 100);
        
        // Учитываем количество уже выполненных действий на этой клетке
        const cellKey = `${hex.col},${hex.row}`;
        const actionCount = this.cellActionCounters[cellKey] || 0;
        successChance -= actionCount * 5; // Уменьшаем шанс на 5% за каждое выполненное действие
        
        if (successChance < 0) successChance = 0;
        
        const successRoll = Math.random() * 100;
        const isSuccess = successRoll <= successChance;
        
        console.log(`🎲 Шанс успеха: ${successChance}%, выпало: ${successRoll}, успех: ${isSuccess}`);
        
        // Если действие должно вызывать бой
        if (action.triggers_battle || (isNight && action.night_monster_chance === 100) || !isSuccess) {
            this.startActionBattle(action, hex, isSuccess);
            return;
        }
        
        // Успешное выполнение действия
        await this.completeActionSuccessfully(action, hex);
    }

    /**
     * Начало боя для действия
     */
    startActionBattle(action, hex, wasSuccess) {
        console.log(`⚔️ Начинаем бой для действия: ${action.name}`);
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            this.showNotification("❌ Система боя не доступна!", 'error');
            return;
        }
        
        // Получаем монстра
        const monster = this.getActionMonster(action, hex);
        if (!monster) {
            this.showNotification("❌ Не удалось найти монстра для боя", 'error');
            return;
        }
        
        // Сохраняем информацию для послебоевой обработки
        this.pendingAction = {
            action: action,
            hex: hex,
            monster: monster,
            wasSuccess: wasSuccess,
            startTime: Date.now()
        };
        
        // Начинаем бой
        battleSystem.startBattleWithSpecificMonster(
            this.currentHero,
            monster,
            'action'
        );
    }

    /**
     * Завершение действия после боя
     */
    completeActionAfterBattle(victory, escape) {
        if (!this.pendingAction) {
            console.warn("❌ Нет ожидающего действия");
            return;
        }
        
        const { action, hex, wasSuccess } = this.pendingAction;
        
        if (victory) {
            if (wasSuccess) {
                // Победа в бою после успешного действия
                this.completeActionSuccessfully(action, hex);
                this.showNotification(`✅ Вы победили монстра и завершили действие!`, 'success');
            } else {
                // Победа в бою после неудачного действия
                this.showNotification(`✅ Вы победили монстра после неудачи!`, 'success');
                // Действие считается выполненным, но без награды
                this.markActionAsCompleted(hex);
            }
        } else {
            if (escape) {
                this.showNotification(`🏃 Вы сбежали с поля боя`, 'warning');
            } else {
                this.showNotification(`💀 Вы проиграли бой`, 'error');
                // При поражении возвращаемся на стартовую позицию
                const startPosition = this.currentTacticalMap.startPosition;
                this.playerTacticalPosition = {...startPosition};
            }
        }
        
        this.pendingAction = null;
        this.drawTacticalMap();
    }

    /**
     * Успешное завершение действия
     */
    async completeActionSuccessfully(action, hex) {
        console.log(`✅ Успешное выполнение действия: ${action.name}`);
        
        // Добавляем награду
        await this.giveActionReward(action, hex);
        
        // Отмечаем действие как выполненное
        this.markActionAsCompleted(hex);
        
        // Тратим 1 час времени
        if (this.timeSystem) {
            this.timeSystem.spendHourOnHex(action.type);
        }
        
        // Показываем уведомление
        this.showNotification(`✅ Действие "${action.name}" выполнено успешно!`, 'success');
        
        // Перерисовываем карту
        this.drawTacticalMap();
    }

    /**
     * Выдача награды за действие
     */
    async giveActionReward(action, hex) {
        switch (action.resource_type) {
            case 'gold':
                const amount = Math.floor(Math.random() * (50 - 10 + 1)) + 10;
                if (this.currentHero) {
                    this.currentHero.gold += amount;
                    this.showNotification(`💰 Получено ${amount} золота!`, 'success');
                }
                break;
                
            case 'hunting':
                // Награда за охоту
                const huntReward = this.getHuntingReward();
                if (huntReward) {
                    this.addResourceToHero(huntReward.id, 1);
                    this.showNotification(`🎁 Получен трофей: ${huntReward.name}!`, 'success');
                }
                break;
                
            case 'woods':
                this.addResourceToHero('wood', Math.floor(Math.random() * 3) + 1);
                this.showNotification(`🪵 Собрано дерево!`, 'success');
                break;
                
            case 'water':
                // Наполнение фляги
                const battleSystem = window.game?.systems?.battle;
                if (battleSystem && battleSystem.flask) {
                    battleSystem.flask.currentCharges = battleSystem.flask.capacity;
                    battleSystem.flask.content = 'water';
                    this.showNotification(`💧 Фляга наполнена водой!`, 'success');
                }
                break;
                
            case 'herbs':
                this.addResourceToHero('herb', Math.floor(Math.random() * 2) + 1);
                this.showNotification(`🌿 Собраны травы!`, 'success');
                break;
                
            case 'berries':
                this.addResourceToHero('berry', Math.floor(Math.random() * 3) + 2);
                this.showNotification(`🫐 Собраны ягоды!`, 'success');
                break;
                
            case 'mushrooms':
                this.addResourceToHero('mushroom', Math.floor(Math.random() * 2) + 1);
                this.showNotification(`🍄 Собраны грибы!`, 'success');
                break;
                
            case 'ores':
                this.addResourceToHero('ore', Math.floor(Math.random() * 2) + 1);
                this.showNotification(`⛏️ Найдена руда!`, 'success');
                break;
                
            case 'stones':
                this.addResourceToHero('stone', Math.floor(Math.random() * 3) + 2);
                this.showNotification(`🪨 Собраны камни!`, 'success');
                break;
                
            case 'food':
                this.addResourceToHero('food', Math.floor(Math.random() * 2) + 1);
                this.showNotification(`🍖 Найдена еда!`, 'success');
                break;
        }
    }

    /**
     * Отметка действия как выполненного
     */
    markActionAsCompleted(hex) {
        const cellKey = `${hex.col},${hex.row}`;
        this.cellActionCounters[cellKey] = (this.cellActionCounters[cellKey] || 0) + 1;
        
        // Если клетка одноразовая - скрываем действия
        const cellType = this.getCellType(hex);
        const cellTypeData = this.cellTypes[cellType];
        
        if (!cellTypeData.reusable_after_research) {
            hex.hasAction = false;
        }
        
        console.log(`📝 Действие на клетке [${hex.col},${hex.row}] выполнено (всего: ${this.cellActionCounters[cellKey]})`);
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    /**
     * Определение типа клетки
     */
    getCellType(cell) {
        if (cell.cellType) return cell.cellType;
        
        // Определяем тип по символу или другим признакам
        const cellTypeMap = {
            '🏕️': 'abandoned_camp',
            '👹': 'orc_camp',
            '⚔️': 'bandit_camp',
            '🐪': 'caravan',
            '🚶': 'traveler',
            '🏹': 'hunting_grounds',
            '🌲': 'forest',
            '💧': 'river',
            '⛰️': 'mountains',
            '📦': 'treasure_cache',
            '⚔️': 'weapon_cache',
            '🌿': 'herb_garden',
            '🪨': 'monster_lair'
        };
        
        const symbol = this.getCellSymbol(cell);
        return cellTypeMap[symbol] || 'forest';
    }

    /**
     * Проверка, является ли клетка специальной
     */
    isSpecialCell(cell) {
        const specialTypes = ['merchant', 'water', 'tavern', 'campfire', 'npc', 'shop'];
        return specialTypes.includes(cell.type);
    }

    /**
     * Проверка, является ли карта мирной
     */
    isPeacefulMap() {
        if (!this.currentTacticalMap || !this.currentMapType) return false;
        
        const peacefulTypes = ['tavern', 'castle', 'city'];
        return peacefulTypes.includes(this.currentMapType);
    }

    /**
     * Исследование текущего гекса (ночёвка)
     */
    researchCurrentHex() {
        if (this.isPeacefulMap()) {
            this.showNotification("🍻 На мирной карте исследование не требуется", 'info');
            return false;
        }
        
        console.log(`🔍 Исследование текущего гекса [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]`);
        
        const cellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
        const currentCell = this.currentTacticalMap?.cells[cellKey];
        
        if (!currentCell) {
            this.showNotification("❌ Текущая клетка не найдена!", 'error');
            return false;
        }
        
        if (currentCell.explored) {
            this.showNotification("✅ Клетка уже исследована", 'info');
            return true;
        }
        
        // Проверяем время
        const timeStatus = this.timeSystem?.getTimeStatus();
        const isNight = timeStatus?.isNight || false;
        
        if (!isNight) {
            const confirmResearch = window.confirm(
                "☀️ Сейчас день. Исследование гекса требует ночёвки на нём.\n" +
                "Ночью вероятность нападения монстра очень высока!\n\n" +
                "Продолжить исследование?"
            );
            
            if (!confirmResearch) return false;
        }
        
        // Начинаем ночёвку/исследование
        this.startNightResearch(currentCell);
        return true;
    }

    /**
     * Начало ночного исследования
     */
    startNightResearch(cell) {
        console.log("🌙 Начинаем ночное исследование гекса...");
        
        // Проверяем, есть ли костёр
        const hasCampfire = this.checkForCampfire(cell);
        const attackProbability = hasCampfire ? 10 : 90;
        
        const randomValue = Math.random() * 100;
        const willBeAttacked = randomValue <= attackProbability;
        
        if (willBeAttacked) {
            console.log("⚔️ Ночное нападение монстра!");
            this.startNightBattle(cell);
        } else {
            console.log("🌙 Спокойная ночь");
            this.completeNightResearch(cell, true);
        }
    }

    /**
     * Завершение ночного исследования
     */
    completeNightResearch(cell, peaceful) {
        if (peaceful) {
            this.showNotification("🌙 Вы спокойно пережили ночь на этом гексе", 'success');
        }
        
        // Отмечаем клетку как исследованную
        cell.explored = true;
        this.markCellAsExplored(cell.row, cell.col);
        
        // Открываем видимость соседних клеток
        this.revealAdjacentCells(cell.row, cell.col);
        
        // Переходим к утру
        if (this.timeSystem) {
            const currentHour = this.timeSystem.gameTime.hour;
            let hoursToMorning = currentHour >= 7 ? (24 - currentHour) + 7 : 7 - currentHour;
            
            for (let i = 0; i < hoursToMorning; i++) {
                this.timeSystem.spendHourOnHex('sleep');
            }
        }
        
        // Восстанавливаем здоровье
        if (this.currentHero) {
            const heroSystem = window.game?.systems?.hero;
            if (heroSystem) {
                const stats = heroSystem.calculateHeroStats(this.currentHero);
                this.currentHero.currentHealth = stats.maxHealth;
            }
        }
        
        this.drawTacticalMap();
        this.showNotification(`✅ Гекс [${cell.col},${cell.row}] исследован!`, 'success');
    }

    // ========== МЕТОДЫ ДЛЯ РЕСУРСОВ ==========

    /**
     * Добавление ресурса герою
     */
    addResourceToHero(resourceId, amount = 1) {
        if (!this.currentHero) return false;
        
        if (!window.game.sharedResources) {
            window.game.sharedResources = {};
        }
        
        if (!window.game.sharedResources.resources) {
            window.game.sharedResources.resources = {};
        }
        
        if (!window.game.sharedResources.resources[resourceId]) {
            window.game.sharedResources.resources[resourceId] = {
                id: resourceId,
                count: 0
            };
        }
        
        window.game.sharedResources.resources[resourceId].count += amount;
        
        console.log(`📦 Ресурс ${resourceId} добавлен (количество: ${amount})`);
        
        // Обновляем интерфейс
        if (this.actionSystem) {
            this.actionSystem.updateHeroResourcesUI();
        }
        
        return true;
    }

    /**
     * Получение награды за охоту
     */
    getHuntingReward() {
        const resourcesSystem = window.game?.systems?.resources;
        if (!resourcesSystem) return null;
        
        const hideResources = resourcesSystem.resources?.hides || [];
        const leatherResources = resourcesSystem.resources?.leathers || [];
        const furResources = resourcesSystem.resources?.furs || [];
        
        const allResources = [...hideResources, ...leatherResources, ...furResources];
        
        if (allResources.length === 0) return null;
        
        const randomIndex = Math.floor(Math.random() * allResources.length);
        return allResources[randomIndex];
    }

    // ========== МЕТОДЫ ДЛЯ КАРТ И ПЕРЕХОДОВ ==========

    /**
     * Загрузка JSON карт
     */
    async loadJSONMaps() {
        try {
            console.log("🔄 Загружаем JSON карты...");
            
            const tacticalMapPaths = [
                'data/maps/tactical/tactical-maps.json',
                'data/maps/tactical-maps.json',
                'maps/tactical-maps.json'
            ];
            
            const localMapPaths = [
                'data/maps/local/local-maps.json',
                'data/maps/local-maps.json',
                'maps/local-maps.json'
            ];
            
            for (const path of tacticalMapPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processTigrimionJSONMaps(mapData, 'tactical');
                        console.log(`✅ Тактические карты загружены из: ${path}`);
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить тактические карты из ${path}:`, e.message);
                }
            }
            
            for (const path of localMapPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processTigrimionJSONMaps(mapData, 'local');
                        console.log(`✅ Локальные карты загружены из: ${path}`);
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить локальные карты из ${path}:`, e.message);
                }
            }
            
        } catch (error) {
            console.error("❌ Ошибка загрузки JSON карт:", error);
        }
    }

    /**
     * Обработка карт в формате Tigrimion
     */
    processTigrimionJSONMaps(mapData, mapType = 'tactical') {
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

    /**
     * Конвертация формата Tigrimion
     */
    convertTigrimionJSONToMap(jsonMap, mapType = 'tactical') {
        if (!jsonMap.game || !jsonMap.game.grid || !jsonMap.game.grid.cells) {
            console.warn("❌ Неверная структура карты Tigrimion");
            return null;
        }

        const cells = jsonMap.game.grid.cells;
        const convertedCells = {};
        
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
        }

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
            originalCanvasWidth: jsonMap.visual?.canvasWidth || 1024,
            originalCanvasHeight: jsonMap.visual?.canvasHeight || 1024,
            mapType: mapType
        };
    }

    /**
     * Инициализация системы клеток
     */
    async initializeCellSystem() {
        console.log("🔄 Инициализация системы клеток...");
        
        [this.localMaps, this.tacticalMaps].forEach(mapArray => {
            mapArray.forEach(map => {
                if (map && map.cells) {
                    Object.values(map.cells).forEach(cell => {
                        // Определяем тип клетки
                        if (!cell.cellType) {
                            cell.cellType = this.getCellType(cell);
                        }
                        
                        // Инициализируем базовые свойства
                        if (cell.explored === undefined) cell.explored = false;
                        if (cell.hasAction === undefined) cell.hasAction = true;
                        if (cell.isSelected === undefined) cell.isSelected = false;
                        
                        // Инициализируем видимость
                        this.updateCellVisibility(cell);
                    });
                }
            });
        });
        
        console.log("✅ Система клеток инициализирована");
        return true;
    }

    // ========== СИСТЕМА ВИДИМОСТИ ==========

    /**
     * Обновление видимости клетки
     */
    updateCellVisibility(cell) {
        if (!cell || !this.playerTacticalPosition) return;
        
        if (!this.fogOfWarEnabled) {
            cell.visibilityLevel = this.visibilityLevels.EXPLORED;
            cell.visibilityColor = this.fogColors.EXPLORED;
            return;
        }
        
        if (cell.explored) {
            cell.visibilityLevel = this.visibilityLevels.EXPLORED;
            cell.visibilityColor = this.fogColors.EXPLORED;
            return;
        }
        
        if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
            cell.visibilityLevel = this.visibilityLevels.PLAYER;
            cell.visibilityColor = this.fogColors.PLAYER;
            return;
        }
        
        const distance = this.getHexDistance(
            cell.row, cell.col,
            this.playerTacticalPosition.y, this.playerTacticalPosition.x
        );
        
        if (distance <= 1) {
            cell.visibilityLevel = this.visibilityLevels.ADJACENT;
            cell.visibilityColor = this.fogColors.ADJACENT;
        } else if (distance <= this.visibilityRadius) {
            cell.visibilityLevel = this.visibilityLevels.VISIBLE;
            cell.visibilityColor = this.fogColors.VISIBLE;
        } else {
            cell.visibilityLevel = this.visibilityLevels.HIDDEN;
            cell.visibilityColor = this.fogColors.HIDDEN;
        }
    }

    /**
     * Обновление видимости всех клеток
     */
    updateAllCellsVisibility() {
        if (!this.currentTacticalMap || !this.currentTacticalMap.cells) return;
        
        Object.values(this.currentTacticalMap.cells).forEach(cell => {
            this.updateCellVisibility(cell);
        });
    }

    /**
     * Открытие видимости соседних клеток
     */
    revealAdjacentCells(row, col) {
        if (!this.currentTacticalMap) return;
        
        const cellsToReveal = this.getCellsInRadius(row, col, 1);
        
        cellsToReveal.forEach(cell => {
            if (!cell.explored) {
                cell.visibilityLevel = Math.max(
                    cell.visibilityLevel || this.visibilityLevels.HIDDEN,
                    this.visibilityLevels.VISIBLE
                );
            }
        });
        
        console.log(`🔍 Открыта видимость для ${cellsToReveal.length} клеток вокруг [${col},${row}]`);
    }

    /**
     * Обновление видимости при перемещении
     */
    updateVisibilityOnMove(newX, newY) {
        this.updateAllCellsVisibility();
        this.revealAdjacentCells(newY, newX);
    }

    // ========== ОТОБРАЖЕНИЕ КАРТЫ ==========

    /**
     * Инициализация Canvas
     */
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
        console.log("✅ Canvas инициализирован");
        this.drawTacticalMap();
    }

    /**
     * Отрисовка тактической карты
     */
    drawTacticalMap() {
        if (!this.ctx || !this.currentTacticalMap) {
            console.log("❌ Canvas context или карта не доступна");
            return;
        }

        const canvas = this.canvas;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.drawBackground();
        this.drawHexes();
        
        if (this.showGrid) {
            this.drawHexGrid();
        }
        
        if (this.isPeacefulMap()) {
            this.drawPeacefulMapIndicator();
        }
        
        console.log("✅ Тактическая карта отрисована");
    }

    /**
     * Отрисовка фона
     */
    drawBackground() {
        const map = this.currentTacticalMap;
        
        if (!map.image) {
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        const img = new Image();
        img.onload = () => {
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            this.drawHexes();
            if (this.showGrid) this.drawHexGrid();
        };
        
        img.onerror = () => {
            console.error("❌ Ошибка загрузки фона карты");
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawHexes();
            if (this.showGrid) this.drawHexGrid();
        };
        
        img.src = map.image;
    }

    /**
     * Отрисовка гексов
     */
    drawHexes() {
        if (!this.currentTacticalMap || !this.currentTacticalMap.cells) return;
        
        // Обновляем видимость
        this.updateAllCellsVisibility();
        
        const cells = Object.values(this.currentTacticalMap.cells);
        
        // Сортируем по видимости
        const sortedCells = [...cells].sort((a, b) => {
            const visibilityA = a.visibilityLevel || this.visibilityLevels.HIDDEN;
            const visibilityB = b.visibilityLevel || this.visibilityLevels.HIDDEN;
            return visibilityA - visibilityB;
        });
        
        // Рисуем все клетки
        sortedCells.forEach(cell => {
            if (cell.visibilityLevel > this.visibilityLevels.OBSCURED) {
                this.drawSingleHexWithVisibility(cell);
            }
        });
    }

    /**
     * Отрисовка одного гекса с учетом видимости
     */
    drawSingleHexWithVisibility(cell) {
        const hexSize = this.currentTacticalMap.cellSize || 40;
        const centerX = cell.x || cell.originalX || 0;
        const centerY = cell.y || cell.originalY || 0;

        if (!centerX || !centerY) return;
        
        const visibilityLevel = cell.visibilityLevel || this.visibilityLevels.HIDDEN;
        const fogColor = cell.visibilityColor || this.fogColors.HIDDEN;
        
        this.ctx.save();
        
        // Рисуем туман если нужно
        if (visibilityLevel < this.visibilityLevels.EXPLORED) {
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i + Math.PI / 6;
                const x = centerX + hexSize * Math.cos(angle);
                const y = centerY + hexSize * Math.sin(angle);
                
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            
            this.ctx.fillStyle = fogColor;
            this.ctx.fill();
        }
        
        // Рисуем сетку если включена
        if (this.showGrid && visibilityLevel >= this.visibilityLevels.VISIBLE) {
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i + Math.PI / 6;
                const x = centerX + hexSize * Math.cos(angle);
                const y = centerY + hexSize * Math.sin(angle);
                
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            
            let gridAlpha = 0.3;
            if (visibilityLevel === this.visibilityLevels.ADJACENT) gridAlpha = 0.2;
            if (visibilityLevel === this.visibilityLevels.VISIBLE) gridAlpha = 0.1;
            
            this.ctx.strokeStyle = `rgba(76, 201, 240, ${gridAlpha})`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        // Рисуем контент если достаточно видимо
        if (visibilityLevel >= this.visibilityLevels.VISIBLE) {
            this.drawHexContentWithVisibility(cell);
        }
        
        this.ctx.restore();
    }

    /**
     * Отрисовка содержимого гекса
     */
    drawHexContentWithVisibility(cell) {
        const centerX = cell.x || cell.originalX || 0;
        const centerY = cell.y || cell.originalY || 0;
        
        if (!centerX || !centerY) return;

        const visibilityLevel = cell.visibilityLevel || this.visibilityLevels.HIDDEN;
        const hexSize = this.currentTacticalMap.cellSize || 40;
        
        this.ctx.save();
        
        // Подсветка выбранной клетки
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
        }
        
        // Определяем символ и цвет
        let symbol = this.getCellSymbol(cell);
        let color = this.getCellColor(cell);
        let fontSize = this.getCellFontSize(cell);
        
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Устанавливаем прозрачность в зависимости от видимости
        let alpha = 1.0;
        if (visibilityLevel === this.visibilityLevels.ADJACENT) {
            alpha = 0.7;
        } else if (visibilityLevel === this.visibilityLevels.VISIBLE) {
            alpha = 0.4;
        } else if (visibilityLevel === this.visibilityLevels.HIDDEN) {
            alpha = 0.1;
        }
        
        // Рисуем символ
        if (alpha > 0) {
            this.ctx.font = `bold ${fontSize}px Arial`;
            this.ctx.fillStyle = this.hexToRGBA(color, alpha);
            this.ctx.fillText(symbol, centerX, centerY);
        }
        
        // Галочка исследованной клетки
        if (cell.explored) {
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = this.hexToRGBA('#00ff00', alpha * 0.8);
            this.ctx.fillText('✓', centerX + hexSize * 0.6, centerY - hexSize * 0.6);
        }
        
        this.ctx.restore();
    }

    // ========== УТИЛИТЫ ==========

    getCellSymbol(cell) {
        const objectSymbols = {
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
        
        if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
            return '🎯';
        }
        
        return objectSymbols[cell.type] || '·';
    }

    getCellColor(cell) {
        if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
            return '#00ffff';
        }
        
        switch(cell.type) {
            case 'monster':
            case 'orc_camp':
            case 'bandit_camp':
                return '#ef4444';
            case 'chest':
            case 'weapon':
            case 'armor':
            case 'magic_crystal':
                return '#f59e0b';
            case 'npc':
            case 'merchant':
            case 'traveler':
                return '#3b82f6';
            case 'exit':
            case 'portal':
            case 'cave':
            case 'dungeon':
                return '#8b5cf6';
            case 'tavern':
            case 'shop':
            case 'village':
            case 'castle':
            case 'temple':
                return '#fbbf24';
            case 'obstacle':
            case 'tree':
            case 'elegant_tree':
            case 'black_monolith':
            case 'mountain':
                return '#6b7280';
            case 'lava_crack':
            case 'campfire':
                return '#dc2626';
            case 'graveyard_cross':
            case 'ancient_rune':
                return '#d6d3d1';
            case 'water':
            case 'bridge':
                return '#0ea5e9';
            case 'cart':
                return '#78350f';
            case 'inactive':
                return '#ef4444';
            default:
                return '#ffffff';
        }
    }

    getCellFontSize(cell) {
        if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
            return 20;
        }
        return Math.max(12, Math.min(20, 16));
    }

    hexToRGBA(hex, alpha = 1) {
        let r = 0, g = 0, b = 0;
        
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex[1] + hex[2], 16);
            g = parseInt(hex[3] + hex[4], 16);
            b = parseInt(hex[5] + hex[6], 16);
        }
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    showNotification(message, type = 'info') {
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // ========== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ДЛЯ ПОЛНОЙ ФУНКЦИОНАЛЬНОСТИ ==========

    // Эти методы остаются без изменений, так как они уже работают правильно
    // или будут переиспользованы из старой версии:

    getHexAtLogicalPosition(x, y) {
        // Реализация поиска гекса по координатам
        console.log(`🔍 Поиск клетки по координатам: [${x}, ${y}]`);
        
        let closestHex = null;
        let minDistance = Infinity;

        const cells = Object.values(this.currentTacticalMap.cells);
        
        for (const cell of cells) {
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
        
        return closestHex;
    }

    getHexNeighbors(currentRow, currentCol) {
        // Реализация поиска соседних гексов
        if (!this.currentTacticalMap) return [];
        
        const neighbors = [];
        const currentCell = this.currentTacticalMap.cells[`${currentCol},${currentRow}`];
        
        if (!currentCell) return [];
        
        const hexSize = this.currentTacticalMap.cellSize || 40;
        const geometry = this.getHexGeometry(hexSize);
        
        Object.values(this.currentTacticalMap.cells).forEach(potentialNeighbor => {
            if (potentialNeighbor.col === currentCol && potentialNeighbor.row === currentRow) {
                return;
            }
            
            const isAdjacent = this.areHexesAdjacent(currentCell, potentialNeighbor, hexSize);
            
            if (isAdjacent && potentialNeighbor.visible && potentialNeighbor.passable !== false) {
                neighbors.push({
                    row: potentialNeighbor.row,
                    col: potentialNeighbor.col,
                    cell: potentialNeighbor
                });
            }
        });
        
        return neighbors;
    }

    areHexesAdjacent(cell1, cell2, hexSize) {
        // Проверка соседства гексов
        if (!cell1 || !cell2) return false;
        
        const centerX1 = cell1.x || cell1.originalX || 0;
        const centerY1 = cell1.y || cell1.originalY || 0;
        const centerX2 = cell2.x || cell2.originalX || 0;
        const centerY2 = cell2.y || cell2.originalY || 0;
        
        const dx = centerX2 - centerX1;
        const dy = centerY2 - centerY1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const geometry = this.getHexGeometry(hexSize);
        const isHorizontalAdjacent = Math.abs(distance - geometry.horizontalDistance) < geometry.tolerance;
        const isVerticalAdjacent = Math.abs(distance - geometry.verticalDistance) < geometry.tolerance;
        const isDiagonalAdjacent = Math.abs(distance - geometry.diagonalDistance) < geometry.tolerance;
        
        return isHorizontalAdjacent || isVerticalAdjacent || isDiagonalAdjacent;
    }

    getHexGeometry(hexSize) {
        return {
            size: hexSize,
            width: Math.sqrt(3) * hexSize,
            height: 2 * hexSize,
            horizontalDistance: Math.sqrt(3) * hexSize,
            verticalDistance: 1.5 * hexSize,
            diagonalDistance: Math.sqrt(3.25) * hexSize,
            tolerance: hexSize * 0.4
        };
    }

    getHexDistance(row1, col1, row2, col2) {
        // Расчет расстояния между гексами
        const x1 = col1;
        const z1 = row1 - Math.floor(col1 / 2);
        const y1 = -x1 - z1;
        
        const x2 = col2;
        const z2 = row2 - Math.floor(col2 / 2);
        const y2 = -x2 - z2;
        
        return Math.max(
            Math.abs(x1 - x2),
            Math.abs(y1 - y2),
            Math.abs(z1 - z2)
        );
    }

    isTransitionCell(cell) {
        return cell.tacticalMap || cell.localMap || cell.globalMap || cell.type === 'exit';
    }

    getCellsInRadius(centerRow, centerCol, radius) {
        // Получение клеток в радиусе
        const cells = [];
        
        for (let dr = -radius; dr <= radius; dr++) {
            for (let dc = -radius; dc <= radius; dc++) {
                if (Math.abs(dr) + Math.abs(dc) <= radius) {
                    const cellKey = `${centerCol + dc},${centerRow + dr}`;
                    const cell = this.currentTacticalMap.cells[cellKey];
                    if (cell) {
                        cells.push(cell);
                    }
                }
            }
        }
        
        return cells;
    }

    markCellAsExplored(row, col) {
        const cellKey = `${col},${row}`;
        const cell = this.currentTacticalMap?.cells[cellKey];
        
        if (cell) {
            cell.explored = true;
            this.revealAdjacentCells(row, col);
            
            if (this.canvasInitialized) {
                this.drawTacticalMap();
            }
            
            return true;
        }
        
        return false;
    }

    // ========== МЕТОДЫ ДЛЯ ОТЛАДКИ И ТЕСТИРОВАНИЯ ==========

    debugInfo() {
        console.group("🗺️ MapSystem Debug Info");
        console.log("Текущая карта:", this.currentTacticalMap?.name);
        console.log("Тип карты:", this.currentMapType);
        console.log("Позиция игрока:", this.playerTacticalPosition);
        console.log("Мирная карта:", this.isPeacefulMap());
        console.log("Загружено типов клеток:", Object.keys(this.cellTypes).length);
        console.log("Туман войны:", this.fogOfWarEnabled ? 'включен' : 'выключен');
        console.log("Радиус видимости:", this.visibilityRadius);
        console.groupEnd();
    }

    createTestMaps() {
        // Создание тестовых карт
        this.localMaps = [{
            id: 1,
            name: "Тестовая Локация",
            image: "",
            width: 8,
            height: 8,
            startPosition: {x: 4, y: 4},
            description: "Тестовая локация для отладки",
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
                    type: "forest", 
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
                    type: "water", 
                    passable: true, 
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
        }];
    }

    createFallbackMaps() {
        // Создание резервных карт при ошибке
        this.localMaps = [{
            id: 1,
            name: "Резервная Локация",
            image: "",
            width: 6,
            height: 6,
            startPosition: {x: 3, y: 3},
            description: "Резервная локация",
            cells: {
                "3,3": {
                    type: "player_start", 
                    passable: true, 
                    row: 3, 
                    col: 3, 
                    visible: true, 
                    x: 150, 
                    y: 150,
                    explored: false,
                    hasAction: true
                }
            },
            cellSize: 40,
            originalCanvasWidth: 300,
            originalCanvasHeight: 300,
            mapType: 'local'
        }];
    }

    // Остальные методы для совместимости (переходы, управление оверлеем и т.д.)
    // могут быть добавлены по мере необходимости

} // Конец класса MapSystem

// Экспорт класса
window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен (новая концепция)");
