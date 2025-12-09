"use strict";

class MapSystem {
    constructor() {
        this.tacticalMaps = [];
        this.currentTacticalMap = null;
        this.playerTacticalPosition = {x: 0, y: 0};
        this.currentHero = null;
        this.currentMapType = 'tactical';
        this.mapStack = [];
        
        // Система действий
        this.cellTypes = {};
        this.resources = {};
        this.currentCellType = null;
        this.selectedCell = null;
        this.currentCellActions = [];
        
        this.actionSuccessRates = {};
        this.explorationStates = {};
        this.huntSuccessRates = {};
        this.completedExplorationCells = new Set();
        
        // Загрузка данных
        this.loadedJSONMaps = new Map();
        this.locationImageCache = new Map();
        
        console.log("✅ MapSystem инициализирован");
    }
    
    // ========== ОСНОВНЫЕ МЕТОДЫ ==========
    
    async loadMapData() {
        try {
            await this.loadCellData();
            await this.loadJSONMaps();
            await this.loadLocationImages();
            
            this.setStartPositions();
            
            console.log(`✅ Карты загружены: Тактических=${this.tacticalMaps.length}`);
            return true;
        } catch (error) {
            console.error("❌ Ошибка загрузки карт:", error);
            return false;
        }
    }
    
    async loadCellData() {
        try {
            const [cellTypesResponse, resourcesResponse] = await Promise.all([
                fetch('data/cell_types.json'),
                fetch('data/resources.json')
            ]);
            
            if (cellTypesResponse.ok) {
                const cellData = await cellTypesResponse.json();
                this.cellTypes = cellData.cell_types || {};
            }
            
            if (resourcesResponse.ok) {
                const resourcesData = await resourcesResponse.json();
                this.resources = resourcesData;
            }
            
            return true;
        } catch (error) {
            console.error("❌ Ошибка загрузки данных:", error);
            return false;
        }
    }
    
    async loadJSONMaps() {
        try {
            const response = await fetch('data/maps/tactical/tactical-maps.json');
            if (response.ok) {
                const mapData = await response.json();
                await this.processJSONMap(mapData);
            }
        } catch (error) {
            console.error("❌ Ошибка загрузки JSON карт:", error);
        }
    }
    
    async processJSONMap(mapData) {
        if (!mapData || !mapData.game?.grid?.cells) return;
        
        const cells = mapData.game.grid.cells;
        const convertedCells = {};
        
        cells.forEach(cell => {
            const key = `${cell.col},${cell.row}`;
            convertedCells[key] = {
                type: cell.type,
                passable: cell.passable !== false,
                visible: cell.visible !== false,
                x: cell.x,
                y: cell.y,
                row: cell.row,
                col: cell.col,
                monster_id: cell.monster_id,
                tacticalMap: cell.tacticalMap,
                targetPosition: cell.targetPosition,
                tooltip: cell.tooltip,
                hasLoot: cell.hasLoot || false,
                shopName: cell.shopName,
                shopItems: cell.shopItems || [],
                explored: false,
                hasAction: true,
                isSelected: false,
                cellType: null
            };
        });
        
        let startPosition = {x: 0, y: 0};
        const startCell = cells.find(cell => cell.type === 'player_start');
        if (startCell) {
            startPosition = {x: startCell.col, y: startCell.row};
        }
        
        const map = {
            id: this.tacticalMaps.length + 1,
            name: mapData.meta?.name || 'Тактическая карта',
            image: mapData.visual?.backgroundImage || "",
            width: 20,
            height: 20,
            startPosition: startPosition,
            description: mapData.meta?.description || '',
            cells: convertedCells,
            jsonData: mapData,
            gameData: mapData.game,
            renderType: 'hex',
            cellSize: mapData.game.grid.cellSize || 40,
            originalCanvasWidth: mapData.visual?.canvasWidth || 1024,
            originalCanvasHeight: mapData.visual?.canvasHeight || 1024,
            mapType: 'tactical'
        };
        
        this.tacticalMaps.push(map);
        this.loadedJSONMaps.set(map.id, map);
        console.log(`✅ Карта загружена: ${map.name} (${Object.keys(map.cells).length} клеток)`);
    }
    
    setStartPositions() {
        if (this.tacticalMaps.length > 0) {
            this.currentTacticalMap = this.tacticalMaps[0];
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
            console.log(`📍 Стартовая позиция:`, this.playerTacticalPosition);
        }
    }
    
    // ========== УПРАВЛЕНИЕ ГЕРОЕМ ==========
    
    setCurrentHero(hero) {
        this.currentHero = hero;
        console.log(`🎯 Герой установлен: ${hero?.name || 'нет'}`);
        
        if (hero && hero.mapPosition) {
            this.playerTacticalPosition = hero.mapPosition.tactical || this.playerTacticalPosition;
        }
    }
    
    syncHeroWithOtherSystems() {
        if (!this.currentHero) return;
        
        if (window.game) {
            window.game.currentHero = this.currentHero;
            
            if (window.game.systems?.hero) {
                window.game.systems.hero.currentHero = this.currentHero;
            }
        }
    }
    
    // ========== ПЕРЕМЕЩЕНИЕ ==========
    
    moveOnTacticalMap(x, y) {
        if (!this.currentHero) {
            this.showNotification("❌ Герой не выбран!", 'error');
            return;
        }
        
        if (!this.currentTacticalMap) return;
        
        const cellKey = `${x},${y}`;
        const cellData = this.currentTacticalMap.cells[cellKey];
        
        if (!cellData) {
            this.showNotification("❌ Клетка не существует!", 'error');
            return;
        }
        
        if (this.isTransitionCell(cellData)) {
            this.handleTransitionClick(cellData);
            return;
        }
        
        if (cellData.passable === false) {
            this.showNotification("❌ Клетка непроходима!", 'error');
            return;
        }
        
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        const isReachable = neighbors.some(neighbor => 
            neighbor.row === y && neighbor.col === x
        );
        
        if (!isReachable) {
            this.showNotification("❌ Клетка недостижима!", 'error');
            return;
        }
        
        this.handlePeacefulMovement(x, y, cellData);
    }
    
    handlePeacefulMovement(targetX, targetY, cellData) {
        const oldPosition = {...this.playerTacticalPosition};
        this.playerTacticalPosition = {x: targetX, y: targetY};
        
        console.log(`✅ Перемещение: [${oldPosition.x},${oldPosition.y}] → [${targetX},${targetY}]`);
        
        this.syncHeroWithOtherSystems();
        
        if (window.game) {
            window.game.showNotification(`✅ Перемещение на [${targetX},${targetY}]`, 'success');
        }
        
        // Обновить интерфейс
        setTimeout(() => {
            const cellKey = `${targetX},${targetY}`;
            const currentCell = this.currentTacticalMap?.cells[cellKey];
            
            if (currentCell) {
                this.updateCellActionsUI(currentCell);
                this.highlightSelectedCell(currentCell);
            }
        }, 300);
        
        this.updateMovementInfo();
    }
    
    // ========== ПЕРЕХОДЫ МЕЖДУ КАРТАМИ ==========
    
    isTransitionCell(cell) {
        return cell.tacticalMap || cell.type === 'exit';
    }
    
    isPlayerAdjacentToTransition(transitionCell) {
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        return neighbors.some(neighbor => 
            neighbor.row === transitionCell.row && 
            neighbor.col === transitionCell.col
        );
    }
    
    async handleTransitionClick(transitionCell) {
        if (!this.isPlayerAdjacentToTransition(transitionCell)) {
            this.showNotification("❌ Подойдите ближе к переходу!", 'warning');
            return;
        }
        
        await this.activateTransition(transitionCell);
    }
    
    async activateTransition(transitionCell) {
        if (transitionCell.type === 'exit' && !transitionCell.tacticalMap) {
            this.exitToPreviousMap();
            return;
        }
        
        this.saveCurrentMapToStack();
        
        if (transitionCell.tacticalMap) {
            try {
                const newMap = await this.loadTacticalMapFile(transitionCell.tacticalMap);
                if (newMap) {
                    this.forceMapUpdate(newMap);
                    
                    if (transitionCell.targetPosition) {
                        this.playerTacticalPosition = {...transitionCell.targetPosition};
                    }
                }
            } catch (error) {
                console.error("❌ Ошибка перехода:", error);
                this.exitToPreviousMap();
            }
        }
    }
    
    async loadTacticalMapFile(mapPath) {
        try {
            const response = await fetch(mapPath);
            const mapData = await response.json();
            return this.processJSONMap(mapData);
        } catch (error) {
            console.error("❌ Ошибка загрузки карты:", error);
            return null;
        }
    }
    
    saveCurrentMapToStack() {
        const mapState = {
            map: this.currentTacticalMap,
            playerPosition: {...this.playerTacticalPosition}
        };
        this.mapStack.push(mapState);
    }
    
    exitToPreviousMap() {
        if (this.mapStack.length === 0) return;
        
        const savedState = this.mapStack.pop();
        if (savedState) {
            this.currentTacticalMap = savedState.map;
            this.playerTacticalPosition = savedState.playerPosition;
            
            this.calculateCSSScale();
            this.drawTacticalMap();
        }
    }
    
    forceMapUpdate(newMap) {
        this.currentTacticalMap = newMap;
        
        Object.values(newMap.cells).forEach(cell => {
            if (cell.explored === undefined) cell.explored = false;
            if (cell.hasAction === undefined) cell.hasAction = true;
            if (cell.isSelected === undefined) cell.isSelected = false;
        });
        
        this.calculateCSSScale();
        this.drawTacticalMap();
        this.updateMovementInfo();
    }
    
    // ========== ГЕОМЕТРИЯ ШЕСТИУГОЛЬНИКОВ ==========
    
    getHexNeighbors(currentRow, currentCol) {
        if (!this.currentTacticalMap) return [];
        
        const neighbors = [];
        const currentCell = this.currentTacticalMap.cells[`${currentCol},${currentRow}`];
        
        if (!currentCell) return [];
        
        const hexSize = this.currentTacticalMap.cellSize || 40;
        
        Object.values(this.currentTacticalMap.cells).forEach(potentialNeighbor => {
            if (potentialNeighbor.col === currentCol && potentialNeighbor.row === currentRow) {
                return;
            }
            
            const isAdjacent = this.areHexesAdjacent(currentCell, potentialNeighbor, hexSize);
            
            if (isAdjacent && potentialNeighbor.visible) {
                neighbors.push({
                    row: potentialNeighbor.row,
                    col: potentialNeighbor.col,
                    cell: potentialNeighbor,
                    isMonster: potentialNeighbor.type === 'monster'
                });
            }
        });
        
        return neighbors;
    }
    
    areHexesAdjacent(cell1, cell2, hexSize) {
        if (!cell1 || !cell2) return false;
        
        const centerX1 = cell1.x || 0;
        const centerY1 = cell1.y || 0;
        const centerX2 = cell2.x || 0;
        const centerY2 = cell2.y || 0;
        
        const dx = centerX2 - centerX1;
        const dy = centerY2 - centerY1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const expectedDistance = hexSize * 1.73; // √3 * hexSize
        const tolerance = hexSize * 0.4;
        
        return Math.abs(distance - expectedDistance) < tolerance;
    }
    
    // ========== ТИПЫ КЛЕТОК ==========
    
    determineCellType(cell) {
        if (!cell || !this.currentTacticalMap) return 'grave';
        
        if (cell.cellType && this.cellTypes[cell.cellType]) {
            return cell.cellType;
        }
        
        const typeMapping = {
            'water': 'small_stream',
            'tree': 'ancient_tree',
            'cave': 'crystal_cave',
            'campfire': 'abandoned_camp',
            'monster': 'beast_lair',
            'chest': 'smugglers_cache',
            'merchant': 'village',
            'village': 'village'
        };
        
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
        
        return cell.cellType;
    }
    
    getDefaultCellType(cell) {
        const availableTypes = Object.keys(this.cellTypes);
        if (availableTypes.length > 0) {
            const seed = cell.col * 47 + cell.row * 29;
            return availableTypes[seed % availableTypes.length];
        }
        return 'grave';
    }
    
    // ========== УТИЛИТЫ ==========
    
    getCellKey(row, col) {
        return `${col},${row}`;
    }
    
    getCellByKey(cellKey) {
        if (!this.currentTacticalMap) return null;
        return this.currentTacticalMap.cells[cellKey];
    }
    
    isCellReachable(cell) {
        if (!cell || !this.playerTacticalPosition) return false;
        
        if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
            return true;
        }
        
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        return neighbors.some(neighbor => 
            neighbor.row === cell.row && neighbor.col === cell.col
        );
    }
    
    highlightSelectedCell(cell) {
        if (!this.currentTacticalMap) return;
        
        Object.values(this.currentTacticalMap.cells).forEach(c => {
            c.isSelected = false;
        });
        
        cell.isSelected = true;
        this.drawTacticalMap();
    }
    
    showNotification(message, type = 'info') {
        if (window.game?.showNotification) {
            window.game.showNotification(message, type);
        } else {
            console.log(`${type}: ${message}`);
        }
    }
    
    updateMovementInfo() {
        const availableMoves = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        
        const movesElement = document.getElementById('availableMoves');
        if (movesElement) {
            movesElement.textContent = `Доступных ходов: ${availableMoves.length}`;
        }
    }
    
    // Эти методы будут переопределены в других модулях
    calculateCSSScale() {}
    drawTacticalMap() {}
    updateCellActionsUI(cell) {}
    createActionsContainerFallback() {}
    loadLocationImages() { return Promise.resolve(true); }
}

window.MapSystem = MapSystem;
