"use strict";

class MapSystem {
    constructor(game) {
        this.game = game;
        
        // Подсистемы
        this.renderer = new MapRenderer(this);
        this.actions = new MapActions(this);
        
        // Основные данные карт
        this.globalMaps = [];
        this.localMaps = [];
        this.tacticalMaps = [];
        
        this.currentGlobalMap = null;
        this.currentLocalMap = null;
        this.currentTacticalMap = null;
        
        // Позиции героя
        this.playerGlobalPosition = {x: 0, y: 0};
        this.playerLocalPosition = {x: 0, y: 0};
        this.playerTacticalPosition = {x: 0, y: 0};
        
        // Стек карт для переходов
        this.mapStack = [];
        this.currentMapType = 'local';
        
        // Герой
        this.currentHero = null;
        
        // Данные карт
        this.loadedJSONMaps = new Map();
        this.activeOverlay = null;
        
        // Переменные для синхронизации
        this.pendingMovement = null;
        this.pendingAction = null;
        
        console.log("✅ MapSystem инициализирован");
    }

    // ========== ОСНОВНЫЕ МЕТОДЫ ==========

    /**
     * Основная инициализация системы карт
     */
    async initialize() {
        console.log("🔄 Инициализация MapSystem...");
        
        try {
            // Инициализируем подсистемы
            this.renderer.initialize();
            
            // Загружаем данные карт
            await this.loadMapData();
            
            // Загружаем JSON карты
            await this.loadJSONMaps();
            
            // Устанавливаем начальные позиции
            this.setStartPositions();
            
            // Устанавливаем обработчики событий
            this.setupEventListeners();
            
            console.log("✅ MapSystem полностью инициализирован");
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка инициализации MapSystem:", error);
            return false;
        }
    }

    /**
     * Загрузка всех данных карт
     */
    async loadMapData() {
        console.log("📥 Загружаем данные карт...");
        
        // Загружаем через MapActions
        await this.actions.loadCellData();
        
        // Загружаем картинки локаций
        await this.actions.loadLocationImages();
        
        console.log("✅ Данные карт загружены");
        return true;
    }

    /**
     * Загрузка JSON карт формата Tigrimion
     */
    async loadJSONMaps() {
        console.log("🔄 Загружаем JSON карты...");
        
        try {
            // Используем логику из MapActions
            const loaded = await this.actions.loadJSONMaps();
            
            if (loaded) {
                // Копируем данные из actions в текущую систему
                this.localMaps = this.actions.localMaps || [];
                this.tacticalMaps = this.actions.tacticalMaps || [];
                
                console.log(`✅ JSON карты загружены: Локальных=${this.localMaps.length}, Тактических=${this.tacticalMaps.length}`);
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки JSON карт:", error);
            return false;
        }
    }

    /**
     * Обработка JSON карт формата Tigrimion
     */
    processTigrimionJSONMaps(mapData, mapType = 'tactical') {
        return this.actions.processTigrimionJSONMaps(mapData, mapType);
    }

    /**
     * Конвертация JSON карты Tigrimion во внутренний формат
     */
    convertTigrimionJSONToMap(jsonMap, mapType = 'tactical') {
        return this.actions.convertTigrimionJSONToMap(jsonMap, mapType);
    }

    /**
     * Управление картами
     */
    async manageMaps(mapType, action, mapData = null) {
        switch (action) {
            case 'set':
                return await this.setMap(mapType, mapData);
            case 'get':
                return this.getCurrentMap(mapType);
            case 'switch':
                return await this.switchMapType(mapType);
            case 'stack':
                return this.saveToStack();
            case 'restore':
                return this.restoreFromStack();
            default:
                console.error(`❌ Неизвестное действие для управления картами: ${action}`);
                return false;
        }
    }

    /**
     * Установка текущей карты
     */
    async setMap(mapType, mapData) {
        let targetMap = null;
        
        switch (mapType) {
            case 'global':
                targetMap = this.globalMaps.find(map => map.id === mapData) || mapData;
                this.currentGlobalMap = targetMap;
                this.currentMapType = 'global';
                break;
                
            case 'local':
                targetMap = this.localMaps.find(map => map.id === mapData) || mapData;
                this.currentLocalMap = targetMap;
                this.currentTacticalMap = targetMap; // Локальные карты также являются тактическими
                this.currentMapType = 'local';
                break;
                
            case 'tactical':
                targetMap = this.tacticalMaps.find(map => map.id === mapData) || mapData;
                this.currentTacticalMap = targetMap;
                this.currentMapType = 'tactical';
                break;
                
            default:
                console.error(`❌ Неизвестный тип карты: ${mapType}`);
                return false;
        }
        
        if (!targetMap) {
            console.error(`❌ Карта не найдена: ${mapData}`);
            return false;
        }
        
        console.log(`✅ Установлена карта ${mapType}: ${targetMap.name}`);
        
        // Обновляем отображение
        if (this.renderer.canvasInitialized) {
            this.renderer.calculateCSSScale();
            this.renderer.drawTacticalMap();
        }
        
        return true;
    }

    /**
     * Получение текущей карты
     */
    getCurrentMap(mapType = null) {
        if (!mapType) {
            mapType = this.currentMapType;
        }
        
        switch (mapType) {
            case 'global':
                return this.currentGlobalMap;
            case 'local':
                return this.currentLocalMap;
            case 'tactical':
                return this.currentTacticalMap;
            default:
                return null;
        }
    }

    /**
     * Переключение типа карты
     */
    async switchMapType(newMapType) {
        if (this.currentMapType === newMapType) {
            return true;
        }
        
        console.log(`🔄 Переключение типа карты: ${this.currentMapType} → ${newMapType}`);
        
        // Сохраняем текущее состояние
        this.saveToStack();
        
        // Устанавливаем новый тип
        this.currentMapType = newMapType;
        
        // Обновляем отображение
        await this.updateMapDisplay();
        
        return true;
    }

    /**
     * Сохранение в стек
     */
    saveToStack() {
        const mapState = {
            mapType: this.currentMapType,
            globalMap: this.currentGlobalMap,
            localMap: this.currentLocalMap,
            tacticalMap: this.currentTacticalMap,
            playerGlobalPosition: {...this.playerGlobalPosition},
            playerLocalPosition: {...this.playerLocalPosition},
            playerTacticalPosition: {...this.playerTacticalPosition},
            timestamp: Date.now()
        };
        
        this.mapStack.push(mapState);
        console.log(`💾 Сохранено состояние в стек (глубина: ${this.mapStack.length})`);
        
        return mapState;
    }

    /**
     * Восстановление из стека
     */
    restoreFromStack() {
        if (this.mapStack.length === 0) {
            console.log("🚫 Стек карт пуст");
            return false;
        }
        
        const savedState = this.mapStack.pop();
        
        // Восстанавливаем состояние
        this.currentMapType = savedState.mapType;
        this.currentGlobalMap = savedState.globalMap;
        this.currentLocalMap = savedState.localMap;
        this.currentTacticalMap = savedState.tacticalMap;
        this.playerGlobalPosition = savedState.playerGlobalPosition;
        this.playerLocalPosition = savedState.playerLocalPosition;
        this.playerTacticalPosition = savedState.playerTacticalPosition;
        
        console.log(`🔄 Восстановлено состояние из стека: ${savedState.mapType} карта`);
        
        // Обновляем отображение
        this.updateMapDisplay();
        
        return true;
    }

    /**
     * Обработка клика по переходу
     */
    async handleTransitionClick(transitionCell) {
        console.log("🚪 Обработка перехода...");
        
        // Проверяем доступность
        if (!this.actions.isPlayerAdjacentToTransition(transitionCell)) {
            this.actions.showTransitionWarning(transitionCell);
            return;
        }
        
        // Сохраняем текущее состояние
        this.saveToStack();
        
        try {
            let newMap = null;
            
            if (transitionCell.tacticalMap) {
                // Переход на тактическую карту
                console.log(`🎲 Переход на тактическую карту: ${transitionCell.tacticalMap}`);
                newMap = await this.actions.loadTacticalMapFile(transitionCell.tacticalMap);
                this.currentMapType = 'tactical';
                
            } else if (transitionCell.localMap) {
                // Переход на локальную карту
                console.log(`🌍 Переход на локальную карту: ${transitionCell.localMap}`);
                newMap = await this.actions.loadLocalMapFile(transitionCell.localMap);
                this.currentMapType = 'local';
                
            } else if (transitionCell.globalMap) {
                // Переход на глобальную карту
                console.log(`🗺️ Переход на глобальную карту: ${transitionCell.globalMap}`);
                newMap = await this.actions.loadGlobalMapFile(transitionCell.globalMap);
                this.currentMapType = 'global';
                
            } else if (transitionCell.type === 'exit') {
                // Простой выход
                console.log("🚪 Выход с карты");
                return this.restoreFromStack();
            }
            
            if (newMap) {
                // Устанавливаем новую карту
                await this.setMap(this.currentMapType, newMap);
                
                // Устанавливаем позицию игрока если указана
                if (transitionCell.targetPosition) {
                    this.playerTacticalPosition = {...transitionCell.targetPosition};
                }
                
                // Обновляем отображение
                await this.updateMapDisplay();
                
                // Показываем уведомление
                if (this.game?.showNotification) {
                    this.game.showNotification(`Переход на ${newMap.name}`, 'success');
                }
            }
            
        } catch (error) {
            console.error("❌ Ошибка перехода:", error);
            
            // Восстанавливаем предыдущее состояние
            this.restoreFromStack();
            
            if (this.game?.showNotification) {
                this.game.showNotification("Ошибка перехода между картами", 'error');
            }
        }
    }

    /**
     * Перемещение по тактической карте
     */
    moveOnTacticalMap(x, y) {
        console.log(`🎯 Перемещение на [${x}, ${y}]`);
        
        if (!this.currentHero) {
            console.error("❌ Герой не выбран!");
            if (this.game?.showNotification) {
                this.game.showNotification("❌ Герой не выбран!", 'error');
            }
            return;
        }

        if (!this.currentTacticalMap) {
            console.error("❌ Нет текущей тактической карты");
            return;
        }

        const cellKey = `${x},${y}`;
        const cellData = this.currentTacticalMap.cells[cellKey];
        
        if (!cellData) {
            console.log("🚫 Клетка не существует");
            if (this.game?.showNotification) {
                this.game.showNotification("Эта клетка не существует!", 'error');
            }
            return;
        }

        // Проверка достижимости
        const neighbors = this.renderer.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        const isReachable = neighbors.some(neighbor => 
            neighbor.row === y && neighbor.col === x
        );

        if (!isReachable) {
            console.log("🚫 Нельзя переместиться на эту клетку - она недоступна");
            if (this.game?.showNotification) {
                this.game.showNotification("Нельзя переместиться на эту клетку!", 'error');
            }
            return;
        }

        // Проверка является ли клетка переходом
        if (this.actions.isTransitionCell(cellData)) {
            console.log("🚪 Клетка является переходом");
            this.handleTransitionClick(cellData);
            return;
        }

        // Проверка проходимости
        if (cellData.passable === false) {
            console.log("🚫 Клетка непроходима");
            if (this.game?.showNotification) {
                this.game.showNotification("Эта клетка непроходима!", 'error');
            }
            return;
        }

        // Мирное перемещение
        this.handlePeacefulMovement(x, y, cellData);
    }

    /**
     * Мирное перемещение (без боя)
     */
    handlePeacefulMovement(targetX, targetY, cellData) {
        console.log(`🌿 Мирное перемещение на [${targetX}, ${targetY}]`);
        
        const oldPosition = {...this.playerTacticalPosition};
        this.playerTacticalPosition = {x: targetX, y: targetY};
        
        console.log(`✅ Перемещение героя ${this.currentHero?.name} с [${oldPosition.x}, ${oldPosition.y}] на: [${targetX}, ${targetY}]`);
        
        // Синхронизируем с другими системами
        this.syncHeroWithOtherSystems();
        
        // Обновляем отображение
        this.updateMapDisplay();
        
        // Показываем действия для новой клетки
        setTimeout(() => {
            const cellKey = `${targetX},${targetY}`;
            const currentCell = this.currentTacticalMap?.cells[cellKey];
            
            if (currentCell) {
                this.actions.updateCellActionsUI(currentCell);
                this.renderer.highlightSelectedCell(currentCell);
            }
            
            if (this.game?.showNotification) {
                this.game.showNotification(`✅ Перемещение на [${targetX}, ${targetY}]`, 'success');
            }
        }, 300);
    }

    /**
     * Обработка специальных клеток
     */
    handleSpecialCell(cell) {
        console.log(`🎭 Обработка специальной клетки: ${cell.type}`);
        
        switch (cell.type) {
            case 'water':
                this.actions.handleWaterCell(cell);
                break;
                
            case 'merchant':
            case 'shop':
                this.actions.handleMerchantClick(cell);
                break;
                
            case 'tavern':
            case 'village':
                if (cell.tacticalMap) {
                    this.handleTransitionClick(cell);
                } else {
                    this.actions.handleTavernVisit(cell);
                }
                break;
                
            case 'campfire':
                // TODO: Реализовать отдых у костра
                if (this.game?.showNotification) {
                    this.game.showNotification("🔥 Можно отдохнуть у костра", 'info');
                }
                break;
                
            case 'chest':
                // TODO: Реализовать открытие сундука
                if (this.game?.showNotification) {
                    this.game.showNotification("📦 Можно открыть сундук", 'info');
                }
                break;
                
            case 'npc':
                // TODO: Реализовать диалог с NPC
                if (this.game?.showNotification) {
                    this.game.showNotification("🧙 Можно поговорить с NPC", 'info');
                }
                break;
                
            default:
                console.log(`ℹ️ Обычная клетка: ${cell.type}`);
        }
    }

    /**
     * Взаимодействие с другими системами
     */
    syncHeroWithOtherSystems() {
        if (!this.currentHero) return;
        
        console.log("🔄 Синхронизация героя с другими системами...");
        
        // Синхронизация с основной игрой
        if (this.game) {
            this.game.currentHero = this.currentHero;
            
            // HeroSystem
            if (this.game.systems?.hero) {
                this.game.systems.hero.currentHero = this.currentHero;
                this.game.systems.hero.calculateHeroStats(this.currentHero);
            }
            
            // EquipmentSystem
            if (this.game.systems?.equipment) {
                this.game.systems.equipment.setCurrentHero(this.currentHero);
            }
            
            // BattleSystem
            if (this.game.systems?.battle) {
                this.game.systems.battle.currentHero = this.currentHero;
            }
            
            // ShopSystem
            if (this.game.systems?.shop) {
                this.game.systems.shop.currentHero = this.currentHero;
            }
        }
        
        console.log("✅ Герой синхронизирован");
    }

    /**
     * Показ оверлея карты
     */
    showMapOverlay(overlayType, container) {
        console.log(`🗺️ Показываем оверлей: ${overlayType}`);
        
        this.activeOverlay = overlayType;
        
        // Используем рендерер для отображения
        this.renderer.showMapOverlay(overlayType, container);
        
        // Обновляем информацию о доступных ходах
        this.updateMovementInfo();
    }

    /**
     * Обновление отображения карты
     */
    async updateMapDisplay() {
        if (!this.renderer.canvasInitialized) {
            return;
        }
        
        // Пересчитываем масштаб
        this.renderer.calculateCSSScale();
        
        // Перерисовываем карту
        this.renderer.drawTacticalMap();
        
        // Обновляем информацию
        this.updateMovementInfo();
        this.updateMapInterface();
        
        console.log("🔄 Отображение карты обновлено");
    }

    /**
     * Обновление информации о перемещении
     */
    updateMovementInfo() {
        const availableMoves = this.renderer.getHexNeighbors(
            this.playerTacticalPosition.y, 
            this.playerTacticalPosition.x
        );
        
        const movesElement = document.getElementById('availableMoves');
        if (movesElement) {
            movesElement.textContent = `Доступных ходов: ${availableMoves.length}`;
        }
        
        return availableMoves;
    }

    /**
     * Обновление интерфейса карты
     */
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
                <span>Масштаб: <span id="currentZoom">${Math.round(this.renderer.zoomLevel * 100)}%</span></span>
                <span id="availableMoves">Доступных ходов: 0</span>
            `;
        }
    }

    /**
     * Установка текущего героя
     */
    setCurrentHero(hero) {
        this.currentHero = hero;
        
        console.log(`🎯 Установлен герой: ${hero?.name || 'нет'}`);
        
        if (hero) {
            // Обновляем позиции из данных героя
            this.updatePlayerPositionsFromHero(hero);
            
            // Синхронизируем с другими системами
            this.syncHeroWithOtherSystems();
            
            // Обновляем отображение ресурсов
            this.actions.updateHeroResourcesUI();
        }
    }

    /**
     * Обновление позиций из данных героя
     */
    updatePlayerPositionsFromHero(hero) {
        if (hero.mapPosition) {
            this.playerGlobalPosition = hero.mapPosition.global || this.playerGlobalPosition;
            this.playerLocalPosition = hero.mapPosition.local || this.playerLocalPosition;
            this.playerTacticalPosition = hero.mapPosition.tactical || this.playerTacticalPosition;
        }
        
        console.log(`📍 Позиции обновлены для героя: ${hero.name}`);
    }

    /**
     * Установка начальных позиций
     */
    setStartPositions() {
        console.log("🎯 Устанавливаем стартовые позиции...");
        
        // Устанавливаем первую доступную локальную карту
        if (this.localMaps.length > 0 && !this.currentLocalMap) {
            this.currentLocalMap = this.localMaps[0];
            this.currentTacticalMap = this.currentLocalMap;
            this.playerLocalPosition = {...this.currentLocalMap.startPosition};
            this.playerTacticalPosition = {...this.currentLocalMap.startPosition};
            this.currentMapType = 'local';
            
            console.log(`📍 Установлена стартовая локальная карта: ${this.currentLocalMap.name}`);
        }
        
        // Устанавливаем первую доступную тактическую карту
        if (this.tacticalMaps.length > 0 && !this.currentTacticalMap) {
            this.currentTacticalMap = this.tacticalMaps[0];
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
            this.currentMapType = 'tactical';
            
            console.log(`🎯 Установлена стартовая тактическая карта: ${this.currentTacticalMap.name}`);
        }
        
        console.log("✅ Стартовые позиции установлены:", {
            local: this.playerLocalPosition, 
            tactical: this.playerTacticalPosition,
            mapType: this.currentMapType
        });
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        console.log("🎮 Настройка обработчиков событий MapSystem...");
        
        // Обработка кликов по карте
        if (this.renderer.canvas) {
            this.renderer.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        }
        
        // Глобальные горячие клавиши
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        console.log("✅ Обработчики событий настроены");
    }

    /**
     * Обработка клика по канвасу
     */
    handleCanvasClick(e) {
        if (!this.currentTacticalMap) {
            console.error("❌ Нет текущей тактической карты");
            return;
        }

        console.log("🎯 Обработка клика по карте");

        // Получаем координаты в логической системе
        const canvasRect = this.renderer.canvas.getBoundingClientRect();
        const computedStyle = getComputedStyle(this.renderer.canvas);
        const transform = computedStyle.transform;
        let scale = 1;
        
        if (transform && transform !== 'none') {
            const matrix = new DOMMatrix(transform);
            scale = matrix.a;
        }
        
        const logicalX = (e.clientX - canvasRect.left) / scale;
        const logicalY = (e.clientY - canvasRect.top) / scale;
        
        // Находим клетку
        const hex = this.renderer.getHexAtLogicalPosition(logicalX, logicalY);
        if (!hex) {
            console.log("❌ Клетка не найдена по координатам");
            return;
        }
        
        console.log(`🎲 Клик по клетке: [${hex.col}, ${hex.row}] тип: ${hex.type}`);
        
        // Проверяем является ли клетка специальной
        const isSpecialCell = ['water', 'merchant', 'shop', 'tavern', 'village', 
                              'campfire', 'chest', 'npc'].includes(hex.type);
        
        if (isSpecialCell) {
            this.handleSpecialCell(hex);
            return;
        }
        
        // Проверяем является ли клетка переходом
        if (this.actions.isTransitionCell(hex)) {
            this.handleTransitionClick(hex);
            return;
        }
        
        // Обычное перемещение или действие
        if (hex.passable !== false) {
            this.moveOnTacticalMap(hex.col, hex.row);
        }
        
        // Показываем действия для клетки
        if (!this.actions.isTransitionCell(hex)) {
            this.actions.updateCellActionsUI(hex);
            this.renderer.highlightSelectedCell(hex);
        }
    }

    /**
     * Обработка нажатий клавиш
     */
    handleKeyPress(e) {
        // Только если активен оверлей карты
        if (!this.activeOverlay || !this.activeOverlay.includes('map')) {
            return;
        }
        
        switch(e.key) {
            case 'Escape':
                // Закрыть оверлей
                if (this.game?.hideOverlay) {
                    this.game.hideOverlay();
                }
                break;
                
            case '+':
            case '=':
                // Увеличение масштаба
                this.renderer.zoomIn();
                break;
                
            case '-':
            case '_':
                // Уменьшение масштаба
                this.renderer.zoomOut();
                break;
                
            case '0':
                // Сброс масштаба
                this.renderer.resetZoom();
                break;
                
            case 'g':
            case 'G':
                // Переключение сетки
                this.renderer.toggleGrid();
                break;
                
            case 'ArrowUp':
                // Перемещение вверх
                this.moveOnTacticalMap(this.playerTacticalPosition.x, this.playerTacticalPosition.y - 1);
                break;
                
            case 'ArrowDown':
                // Перемещение вниз
                this.moveOnTacticalMap(this.playerTacticalPosition.x, this.playerTacticalPosition.y + 1);
                break;
                
            case 'ArrowLeft':
                // Перемещение влево
                this.moveOnTacticalMap(this.playerTacticalPosition.x - 1, this.playerTacticalPosition.y);
                break;
                
            case 'ArrowRight':
                // Перемещение вправо
                this.moveOnTacticalMap(this.playerTacticalPosition.x + 1, this.playerTacticalPosition.y);
                break;
        }
    }

    /**
     * Отладочная информация
     */
    debugInfo() {
        console.group("🗺️ MapSystem Debug Info");
        console.log("Глобальная позиция:", this.playerGlobalPosition);
        console.log("Локальная позиция:", this.playerLocalPosition);
        console.log("Тактическая позиция:", this.playerTacticalPosition);
        console.log("Текущая локальная карта:", this.currentLocalMap?.name);
        console.log("Текущая тактическая карта:", this.currentTacticalMap?.name);
        console.log("Тип текущей карты:", this.currentMapType);
        console.log("Глубина стека карт:", this.mapStack.length);
        console.log("Загружено JSON карт:", this.loadedJSONMaps.size);
        console.log("Canvas инициализирован:", this.renderer.canvasInitialized);
        console.log("Текущий герой:", this.currentHero?.name || 'нет');
        console.log("Масштаб:", `${Math.round(this.renderer.zoomLevel * 100)}%`);
        
        const availableMoves = this.updateMovementInfo();
        console.log("Доступные ходы:", availableMoves.length);
        availableMoves.forEach(move => {
            console.log(`  [${move.col},${move.row}] - ${move.direction}${move.isMonster ? ' (монстр)' : ''}`);
        });
        
        console.groupEnd();
    }

    /**
     * Завершение боя
     */
    completeMovementAfterBattle(victory, escape = false, battleType = 'movement', doubleLoot = false) {
        console.log(`🎲 Завершение ${battleType} боя: победа=${victory}, побег=${escape}`);
        
        // Используем логику из MapActions
        this.actions.completeMovementAfterBattle(victory, escape, battleType, doubleLoot);
        
        // Обновляем отображение
        this.updateMapDisplay();
    }

    /**
     * Создание тестовых карт
     */
    createTestMaps() {
        console.log("🛠️ Создаем тестовые карты...");
        
        // Используем логику из MapActions
        this.actions.createTestMaps();
        
        // Копируем данные
        this.localMaps = this.actions.localMaps || [];
        this.tacticalMaps = this.actions.tacticalMaps || [];
        
        console.log(`✅ Тестовые карты созданы: Локальных=${this.localMaps.length}, Тактических=${this.tacticalMaps.length}`);
    }

    /**
     * Получение информации о клетке
     */
    getCellInfo(row, col) {
        const cellKey = `${col},${row}`;
        return this.currentTacticalMap?.cells[cellKey] || null;
    }

    /**
     * Проверка доступности клетки
     */
    isCellReachable(row, col) {
        const cell = this.getCellInfo(row, col);
        if (!cell) return false;
        
        // Используем логику из MapActions
        return this.actions.isCellReachable(cell);
    }

    /**
     * Сброс состояния карты
     */
    resetMapState() {
        console.log("🔄 Сброс состояния карты...");
        
        // Очищаем стек
        this.mapStack = [];
        
        // Сбрасываем позиции
        if (this.currentLocalMap) {
            this.playerLocalPosition = {...this.currentLocalMap.startPosition};
            this.playerTacticalPosition = {...this.currentLocalMap.startPosition};
        }
        
        // Сбрасываем исследованные клетки
        if (this.currentTacticalMap?.cells) {
            Object.values(this.currentTacticalMap.cells).forEach(cell => {
                cell.explored = false;
                cell.hasAction = true;
                cell.isSelected = false;
            });
        }
        
        // Сбрасываем вероятности
        this.actions.resetProbabilityState();
        
        console.log("✅ Состояние карты сброшено");
        
        // Обновляем отображение
        this.updateMapDisplay();
    }

    /**
     * Сохранение состояния карты
     */
    saveMapState() {
        const state = {
            currentMapType: this.currentMapType,
            currentLocalMapId: this.currentLocalMap?.id,
            currentTacticalMapId: this.currentTacticalMap?.id,
            playerLocalPosition: this.playerLocalPosition,
            playerTacticalPosition: this.playerTacticalPosition,
            mapStack: this.mapStack,
            timestamp: Date.now()
        };
        
        console.log("💾 Сохранено состояние карты");
        return state;
    }

    /**
     * Загрузка состояния карты
     */
    loadMapState(state) {
        console.log("📂 Загрузка состояния карты...");
        
        // Восстанавливаем основные параметры
        this.currentMapType = state.currentMapType || 'local';
        this.playerLocalPosition = state.playerLocalPosition || {x: 0, y: 0};
        this.playerTacticalPosition = state.playerTacticalPosition || {x: 0, y: 0};
        this.mapStack = state.mapStack || [];
        
        // Восстанавливаем карты
        if (state.currentLocalMapId) {
            this.currentLocalMap = this.localMaps.find(map => map.id === state.currentLocalMapId);
            if (!this.currentLocalMap && this.localMaps.length > 0) {
                this.currentLocalMap = this.localMaps[0];
            }
        }
        
        if (state.currentTacticalMapId) {
            this.currentTacticalMap = this.tacticalMaps.find(map => map.id === state.currentTacticalMapId);
            if (!this.currentTacticalMap && this.tacticalMaps.length > 0) {
                this.currentTacticalMap = this.tacticalMaps[0];
            }
        }
        
        // Если не нашли тактическую карту, используем локальную
        if (!this.currentTacticalMap && this.currentLocalMap) {
            this.currentTacticalMap = this.currentLocalMap;
        }
        
        console.log("✅ Состояние карты загружено");
        
        // Обновляем отображение
        this.updateMapDisplay();
        
        return true;
    }
}

// Экспорт класса
export { MapSystem };

console.log("📦 MapSystem модуль загружен");
