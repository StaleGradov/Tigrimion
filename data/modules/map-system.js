// ========== MODULE: MapSystem ==========
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
        
        // Для загрузки JSON карт
        this.loadedJSONMaps = new Map();
        
        console.log("✅ MapSystem инициализирован");
    }

    async loadMapData() {
        try {
            console.log("📥 Загружаем данные карт...");
            
            // Загружаем JSON карты
            await this.loadJSONMaps();
            
            // Если JSON карты не загрузились, используем тестовые
            if (this.tacticalMaps.length === 0) {
                this.createTestMaps();
            }
            
            // Устанавливаем стартовые позиции
            this.setStartPositions();
            
            console.log(`✅ Карты загружены: Глобальных=${this.globalMaps.length}, Локальных=${this.localMaps.length}, Тактических=${this.tacticalMaps.length}`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных карт:", error);
            this.createFallbackMaps();
            return true;
        }
    }

    async loadJSONMaps() {
        try {
            console.log("🔄 Загружаем JSON карты...");
            
            const mapPaths = [
                'data/maps/tactical/tactical-maps.json',
                'data/maps/tactical-maps.json',
                'maps/tactical-maps.json', 
                'data/tactical-maps.json',
                'tactical-maps.json',
                'data/modules/maps/tactical-maps.json'
            ];
            
            for (const path of mapPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processTigrimionJSONMaps(mapData);
                        console.log(`✅ JSON карты загружены из: ${path}`);
                        return;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить из ${path}:`, e.message);
                }
            }
            
            console.log("ℹ️ JSON карты не найдены, будут использованы тестовые данные");
            
        } catch (error) {
            console.error("❌ Ошибка загрузки JSON карт:", error);
        }
    }

    async processTigrimionJSONMaps(mapData) {
        if (!mapData || !mapData.meta) {
            console.warn("❌ Неверный формат JSON карт Tigrimion");
            return;
        }

        try {
            // Обрабатываем как одиночную карту в формате Tigrimion
            const tacticalMap = this.convertTigrimionJSONToMap(mapData);
            if (tacticalMap) {
                this.tacticalMaps.push(tacticalMap);
                this.loadedJSONMaps.set(tacticalMap.id, tacticalMap);
                console.log(`✅ Обработана тактическая карта: ${tacticalMap.name}`);
            }
        } catch (error) {
            console.error(`❌ Ошибка обработки карты:`, error);
        }
    }

    convertTigrimionJSONToMap(jsonMap) {
        if (!jsonMap.game || !jsonMap.game.grid || !jsonMap.game.grid.cells) {
            console.warn("❌ Неверная структура карты Tigrimion");
            return null;
        }

        // Определяем размеры карты из клеток
        const cells = jsonMap.game.grid.cells;
        const rows = Math.max(...cells.map(cell => cell.row)) + 1;
        const cols = Math.max(...cells.map(cell => cell.col)) + 1;

        // Находим стартовую позицию игрока
        let startPosition = {x: 0, y: 0};
        const startCell = cells.find(cell => cell.type === 'player_start');
        if (startCell) {
            startPosition = {x: startCell.col, y: startCell.row};
        }

        // Конвертируем клетки в наш формат
        const convertedCells = {};
        cells.forEach(cell => {
            const key = `${cell.col},${cell.row}`;
            convertedCells[key] = {
                type: cell.type,
                passable: cell.passable,
                visible: cell.visible,
                x: cell.x,
                y: cell.y,
                row: cell.row,
                col: cell.col,
                // Сохраняем оригинальные данные для совместимости
                originalData: cell
            };
        });

        return {
            id: this.tacticalMaps.length + 1,
            name: jsonMap.meta?.name || "Карта Tigrimion",
            image: jsonMap.visual?.backgroundImage || "",
            width: cols,
            height: rows,
            startPosition: startPosition,
            description: jsonMap.meta?.description || "Создана в редакторе карт Tigrimion",
            localPosition: {x: 0, y: 0},
            
            // Основные данные клеток
            cells: convertedCells,
            
            // Сохраняем оригинальную структуру для расширенной функциональности
            jsonData: jsonMap,
            gameData: jsonMap.game,
            
            // Настройки отображения
            renderType: 'hex',
            cellSize: jsonMap.game.grid.cellSize || 41,
            canvasWidth: jsonMap.visual?.canvasWidth,
            canvasHeight: jsonMap.visual?.canvasHeight
        };
    }

    // ========== ПРАВИЛЬНОЕ ПРЕОБРАЗОВАНИЕ КООРДИНАТ ==========
// ========== ПРАВИЛЬНОЕ ПРЕОБРАЗОВАНИЕ КООРДИНАТ ==========
generateHexGridFromData(mapData) {
    const cells = Object.values(mapData.cells);
    const hexSize = mapData.cellSize || 41;
    const hexWidth = Math.sqrt(3) * hexSize;
    const hexHeight = 2 * hexSize;
    
    // Находим границы сетки
    const minRow = Math.min(...cells.map(cell => cell.row));
    const maxRow = Math.max(...cells.map(cell => cell.row));
    const minCol = Math.min(...cells.map(cell => cell.col));
    const maxCol = Math.max(...cells.map(cell => cell.col));
    
    const gridHTML = cells.map(cellData => {
        const isPlayerHere = cellData.col === this.playerTacticalPosition.x && 
                           cellData.row === this.playerTacticalPosition.y;
        
        // ВЫЧИСЛЯЕМ КООРДИНАТЫ ПРАВИЛЬНО - относительно сетки
        const gridX = cellData.col - minCol;
        const gridY = cellData.row - minRow;
        const x = gridX * hexWidth + (gridY % 2) * hexWidth / 2;
        const y = gridY * hexHeight * 0.75;
        
        // Преобразуем в координаты контейнера
        const container = document.querySelector('.tactical-map-visual');
        let finalX = x, finalY = y;
        
        if (container) {
            // Центрируем всю сетку
            const gridCols = maxCol - minCol + 1;
            const gridRows = maxRow - minRow + 1;
            const totalWidth = gridCols * hexWidth;
            const totalHeight = gridRows * hexHeight * 0.75;
            
            const scaleX = container.clientWidth / totalWidth;
            const scaleY = container.clientHeight / totalHeight;
            const scale = Math.min(scaleX, scaleY) * 0.8; // Уменьшим масштаб для отступов
            
            const offsetX = (container.clientWidth - totalWidth * scale) / 2;
            const offsetY = (container.clientHeight - totalHeight * scale) / 2;
            
            finalX = x * scale + offsetX;
            finalY = y * scale + offsetY;
        }
        
        const availableMoves = this.getHexNeighbors(
            this.playerTacticalPosition.y, 
            this.playerTacticalPosition.x
        );
        
        const isReachable = availableMoves.some(move => 
            move.row === cellData.row && move.col === cellData.col
        );
        
        let cellClass = 'tactical-hex-cell';
        let cellContent = this.getCellEmoji(cellData);
        
        if (isPlayerHere) {
            cellClass += ' player-cell';
            cellContent = '🎯';
        } else if (isReachable) {
            cellClass += ' reachable-cell';
        } else {
            cellClass += ` ${cellData.type}-cell`;
        }
        
        if (!cellData.passable && !isPlayerHere) {
            cellClass += ' impassable';
        }
        
        return `
            <div class="${cellClass}" 
                 style="left: ${finalX}px; top: ${finalY}px;"
                 onclick="game.systems.map.moveOnTacticalMap(${cellData.col}, ${cellData.row})"
                 title="${this.getCellDescription(cellData)} - [${cellData.col},${cellData.row}]">
                ${cellContent}
            </div>
        `;
    }).join('');
    
    return gridHTML;
}

// ========== ИСПРАВЛЕННАЯ ФУНКЦИЯ: ПОЛУЧЕНИЕ СОСЕДНИХ КЛЕТОК ==========
getHexNeighbors(currentRow, currentCol) {
    if (!this.currentTacticalMap) return [];
    
    const neighbors = [];
    
    // Для шестиугольной сетки направления зависят от четности строки
    const isEvenRow = currentRow % 2 === 0;
    
    const directions = isEvenRow ? [
        // Для четных строк
        [0, -1],  [1, 0],   [0, 1],
        [-1, 0],  [-1, -1], [-1, 1]
    ] : [
        // Для нечетных строк  
        [0, -1],  [1, 0],   [0, 1],
        [-1, 0],  [1, -1],  [1, 1]
    ];
    
    directions.forEach(([dr, dc]) => {
        const newRow = currentRow + dr;
        const newCol = currentCol + dc;
        const cellKey = `${newCol},${newRow}`;
        const neighbor = this.currentTacticalMap.cells[cellKey];
        
        if (neighbor && neighbor.passable !== false) {
            neighbors.push({
                row: newRow,
                col: newCol,
                cell: neighbor
            });
        }
    });
    
    return neighbors;
}

    // ========== НОВАЯ ФУНКЦИЯ: ПРОВЕРКА ДОСТУПНОСТИ КЛЕТКИ ==========
    isCellReachable(targetRow, targetCol) {
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        
        // Получаем всех соседей текущей позиции
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        
        // Проверяем, является ли целевая клетка соседней
        return neighbors.some(neighbor => 
            neighbor.row === targetRow && neighbor.col === targetCol
        );
    }

    createTestMaps() {
        // Тестовая глобальная карта
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

        // Тестовые локальные карты
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

        // Тестовые тактические карты (если JSON не загрузились)
        if (this.tacticalMaps.length === 0) {
            this.tacticalMaps = [{
                id: 1,
                name: "Лесная Тропа",
                image: "images/maps/tactical/forest_path.jpg",
                width: 6,
                height: 6,
                startPosition: {x: 3, y: 3},
                localPosition: {x: 4, y: 4},
                description: "Извилистая тропа через древний лес",
                localConnections: {
                    north: {localX: 3, localY: 2},
                    south: {localX: 3, localY: 4},
                    east: {localX: 4, localY: 3},
                    west: {localX: 2, localY: 3}
                },
                cells: {
                    "3,3": {type: "start", content: "player_start", passable: true, row: 3, col: 3},
                    "3,2": {type: "exit", direction: "north", content: "exit_north", passable: true, row: 2, col: 3},
                    "2,3": {type: "monster", monsterId: 1, content: "goblin", passable: false, row: 3, col: 2},
                    "4,3": {type: "chest", loot: "common", content: "wooden_chest", passable: true, row: 3, col: 4},
                    "3,4": {type: "npc", content: "old_merchant", passable: true, row: 4, col: 3}
                }
            }];
        }
    }

    createFallbackMaps() {
        // Резервные данные если загрузка не удалась
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
                "1,1": {type: "start", content: "player_start", passable: true, row: 1, col: 1}
            }
        }];
    }

    setStartPositions() {
        // Устанавливаем начальные позиции на картах
        if (this.globalMaps.length > 0) {
            this.currentGlobalMap = this.globalMaps[0];
            this.playerGlobalPosition = {...this.currentGlobalMap.startPosition};
            
            // Находим соответствующую локальную карту
            const localMap = this.findLocalMapAtPosition(
                this.playerGlobalPosition.x, 
                this.playerGlobalPosition.y
            );
            
            if (localMap) {
                this.currentLocalMap = localMap;
                this.playerLocalPosition = {...localMap.startPosition};
                
                // Находим соответствующую тактическую карту
                const tacticalMap = this.findTacticalMapAtPosition(
                    this.playerLocalPosition.x,
                    this.playerLocalPosition.y
                );
                
                if (tacticalMap) {
                    this.currentTacticalMap = tacticalMap;
                    this.playerTacticalPosition = {...tacticalMap.startPosition};
                }
            }
        }
        
        // Если есть JSON карты, устанавливаем первую как текущую
        if (this.tacticalMaps.length > 0 && !this.currentTacticalMap) {
            this.currentTacticalMap = this.tacticalMaps[0];
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
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

    // === ОТРИСОВКА КАРТ ===

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

    renderLocalMap() {
        if (!this.currentLocalMap) return '<div class="map-error">Локальная карта не загружена</div>';

        return `
            <div class="map-container local-map">
                <h4>${this.currentLocalMap.name}</h4>
                <div class="map-grid" style="grid-template-columns: repeat(${this.currentLocalMap.width}, 1fr);">
                    ${this.generateLocalMapGrid()}
                </div>
                <div class="map-info">
                    Позиция: [${this.playerLocalPosition.x}, ${this.playerLocalPosition.y}]
                </div>
            </div>
        `;
    }

    renderTacticalMap() {
        if (!this.currentTacticalMap) {
            return '<div class="map-error">Тактическая карта не загружена</div>';
        }

        // Проверяем, это JSON карта Tigrimion или стандартная
        const isTigrimionMap = this.currentTacticalMap.jsonData;
        
        if (isTigrimionMap) {
            return this.renderTigrimionTacticalMap();
        } else {
            return this.renderStandardTacticalMap();
        }
    }

    renderTigrimionTacticalMap() {
        const map = this.currentTacticalMap;
        
        return `
            <div class="map-container tactical-map tigrimion-tactical-map">
                <div class="tactical-map-header">
                    <h4>${map.name}</h4>
                    <div class="map-controls">
                        <button class="btn-secondary" onclick="game.systems.map.zoomIn()">🔍+</button>
                        <button class="btn-secondary" onclick="game.systems.map.zoomOut()">🔍-</button>
                        <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                    </div>
                </div>
                
                <div class="tactical-map-content" id="tacticalMapContent">
                    <div class="tactical-map-visual" id="tacticalMapVisual">
                        ${map.image ? `
                            <img src="${map.image}" alt="${map.name}" 
                                 style="max-width: 100%; height: auto;"
                                 onerror="this.style.display='none'">
                        ` : ''}
                        
                        <div class="tactical-hex-overlay" id="hexOverlay">
                            ${this.generateTigrimionHexGrid()}
                        </div>
                    </div>
                    
                    <div class="tactical-map-info">
                        <div class="map-description">${map.description}</div>
                        <div class="player-position">
                            Позиция: [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]
                        </div>
                        <div class="map-stats">
                            Размер: ${map.width} × ${map.height} | Клеток: ${Object.keys(map.cells).length}
                        </div>
                        <div class="movement-info" id="movementInfo">
                            Доступные ходы: <span id="availableMoves">0</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== ОБНОВЛЕННАЯ ФУНКЦИЯ ОТРИСОВКИ СЕТКИ ==========
    generateTigrimionHexGrid() {
        const map = this.currentTacticalMap;
        
        // Получаем доступные для хода клетки
        const availableMoves = this.getHexNeighbors(
            this.playerTacticalPosition.y, 
            this.playerTacticalPosition.x
        );
        
        // Генерируем сетку заново на основе данных
        const gridHTML = this.generateHexGridFromData(map);
        
        // Обновляем информацию о доступных ходах
        setTimeout(() => {
            const movesElement = document.getElementById('availableMoves');
            if (movesElement) {
                movesElement.textContent = availableMoves.length;
            }
        }, 100);
        
        return gridHTML;
    }

    renderStandardTacticalMap() {
        if (!this.currentTacticalMap) return '<div class="map-error">Тактическая карта не загружена</div>';

        return `
            <div class="map-container tactical-map">
                <h4>${this.currentTacticalMap.name}</h4>
                <div class="map-grid" style="grid-template-columns: repeat(${this.currentTacticalMap.width}, 1fr);">
                    ${this.generateTacticalMapGrid()}
                </div>
                <div class="map-info">
                    Позиция: [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]
                    <br>
                    <small>${this.currentTacticalMap.description}</small>
                </div>
            </div>
        `;
    }

    generateTacticalMapGrid() {
        let gridHTML = '';
        const { width, height } = this.currentTacticalMap;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cellKey = `${x},${y}`;
                const cellData = this.currentTacticalMap.cells[cellKey];
                const isPlayerHere = x === this.playerTacticalPosition.x && y === this.playerTacticalPosition.y;
                
                let cellClass = 'map-cell tactical-cell';
                let cellContent = '';
                let title = `Тактическая позиция: [${x}, ${y}]`;

                if (isPlayerHere) {
                    cellClass += ' player-cell';
                    cellContent = '🎯';
                } else if (cellData) {
                    cellClass += ` ${cellData.type}-cell`;
                    title += ` - ${this.getCellDescription(cellData)}`;
                    
                    switch(cellData.type) {
                        case 'monster':
                            cellContent = '👹';
                            break;
                        case 'chest':
                            cellContent = '📦';
                            break;
                        case 'npc':
                            cellContent = '🧙';
                            break;
                        case 'exit':
                            cellContent = '🚪';
                            break;
                        default:
                            cellContent = '·';
                    }
                } else {
                    cellClass += ' empty-cell';
                    cellContent = '·';
                }

                gridHTML += `
                    <div class="${cellClass}" 
                         onclick="game.systems.map.interactWithTacticalCell(${x}, ${y})"
                         title="${title}">
                        ${cellContent}
                    </div>
                `;
            }
        }
        
        return gridHTML;
    }

    getCellDescription(cellData) {
        const descriptions = {
            'start': 'Точка старта',
            'player_start': 'Старт игрока',
            'exit': 'Выход',
            'monster': 'Монстр',
            'chest': 'Сундук',
            'npc': 'NPC',
            'obstacle': 'Препятствие',
            'active': 'Активная клетка',
            'empty': 'Пустая клетка'
        };
        return descriptions[cellData.type] || cellData.type;
    }

    getCellEmoji(cellData) {
        const emojiMap = {
            'monster': '👹',
            'chest': '📦',
            'npc': '🧙',
            'exit': '🚪',
            'player_start': '⭐',
            'start': '⭐',
            'obstacle': '🪨',
            'active': '·',
            'empty': '·'
        };
        
        return emojiMap[cellData.type] || '·';
    }

    // === ДВИЖЕНИЕ И ВЗАИМОДЕЙСТВИЯ ===

    moveOnGlobalMap(x, y) {
        const localMap = this.findLocalMapAtPosition(x, y);
        if (!localMap) {
            console.log("🚫 На этой позиции нет локальной карты");
            return;
        }

        this.playerGlobalPosition = {x, y};
        this.currentLocalMap = localMap;
        this.playerLocalPosition = {...localMap.startPosition};
        
        // Обновляем тактическую карту
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
    }

    moveOnLocalMap(x, y) {
        const tacticalMap = this.findTacticalMapAtPosition(x, y);
        if (!tacticalMap) {
            console.log("🚫 На этой позиции нет тактической карты");
            return;
        }

        this.playerLocalPosition = {x, y};
        this.currentTacticalMap = tacticalMap;
        this.playerTacticalPosition = {...tacticalMap.startPosition};

        console.log(`📍 Перемещение на локальную позицию: [${x}, ${y}]`);
        this.updateGameDisplay();
    }

    moveOnTacticalMap(x, y) {
        if (!this.currentTacticalMap) return;

        // ПРОВЕРКА ДОСТУПНОСТИ КЛЕТКИ
        if (!this.isCellReachable(y, x)) {
            console.log("🚫 Нельзя переместиться на эту клетку - она не соседняя");
            if (window.game) {
                window.game.showNotification("Можно ходить только на соседние клетки!", 'error');
            }
            return;
        }

        const cellKey = `${x},${y}`;
        const cellData = this.currentTacticalMap.cells[cellKey];
        
        // Проверяем, можно ли пройти на эту клетку
        if (cellData && cellData.passable === false) {
            console.log("🚫 Нельзя пройти на эту клетку");
            if (window.game) {
                window.game.showNotification("Нельзя пройти на эту клетку!", 'error');
            }
            return;
        }

        // Перемещаем игрока
        this.playerTacticalPosition = {x, y};
        
        // Взаимодействуем с клеткой, если на ней что-то есть
        if (cellData && cellData.type !== 'active' && cellData.type !== 'empty') {
            this.interactWithTacticalCell(x, y);
        }

        console.log(`🎲 Перемещение на тактическую позицию: [${x}, ${y}]`);
        this.updateTacticalMapDisplay();
    }

    interactWithTacticalCell(x, y) {
        const cellKey = `${x},${y}`;
        const cellData = this.currentTacticalMap.cells[cellKey];
        
        if (!cellData) {
            console.log("🚫 На этой клетке ничего нет");
            return;
        }

        console.log(`🎲 Взаимодействие с: ${cellData.type}`, cellData);

        switch(cellData.type) {
            case 'monster':
                this.startBattle(cellData.monsterId);
                break;
            case 'chest':
                this.openChest(cellData);
                break;
            case 'npc':
                this.talkToNPC(cellData);
                break;
            case 'exit':
                this.useExit(cellData, x, y);
                break;
        }
    }

    startBattle(monsterId) {
        console.log(`⚔️ Начинаем бой с монстром ID: ${monsterId}`);
        if (window.game && window.game.systems.battle) {
            window.game.systems.battle.startBattleWithMonster(monsterId);
        }
    }

    openChest(chestData) {
        console.log(`📦 Открываем сундук:`, chestData);
        if (window.game) {
            window.game.showNotification(`Найден сундук с добычей!`, 'success');
        }
    }

    talkToNPC(npcData) {
        console.log(`🧙 Общаемся с NPC:`, npcData);
        if (window.game) {
            window.game.showNotification('NPC: "Приветствую, путник! Я могу предложить тебе товары или задания."', 'info');
        }
    }

    useExit(exitData, x, y) {
        console.log(`🚪 Используем выход:`, exitData);
        if (window.game) {
            window.game.showNotification('Выход с карты!', 'info');
        }
    }

    updateGameDisplay() {
        if (window.game && window.game.systems.hero && window.game.systems.hero.currentHero) {
            window.game.systems.hero.showHeroGameScreen();
        }
    }

    updateTacticalMapDisplay() {
        const container = document.getElementById('overlay-container');
        if (container && this.activeOverlay === 'tactical-map') {
            this.showOverlay('tactical-map');
        }
    }

    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

    zoomIn() {
        console.log("🔍 Увеличиваем масштаб");
        // Реализация масштабирования может быть добавлена позже
    }

    zoomOut() {
        console.log("🔍 Уменьшаем масштаб");
        // Реализация масштабирования может быть добавлена позже
    }

    showOverlay(overlayType) {
        if (overlayType === 'tactical-map') {
            const container = document.getElementById('overlay-container');
            if (!container) return;

            this.activeOverlay = overlayType;
            
            container.innerHTML = `
                <div class="overlay-content tactical-map-overlay">
                    <div class="overlay-header">
                        <h3>🎲 Тактическая карта</h3>
                        <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                    </div>
                    <div class="overlay-body">
                        ${this.renderTacticalMap()}
                    </div>
                </div>
            `;
            container.style.display = 'block';
        } else {
            // Для других оверлеев используем стандартную логику
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
                                ${this.renderGlobalMap()}
                            </div>
                        </div>
                    `;
                    break;

                case 'local-map':
                    container.innerHTML = `
                        <div class="overlay-content map-overlay">
                            <div class="overlay-header">
                                <h3>📍 Локальная карта</h3>
                                <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                            </div>
                            <div class="overlay-body">
                                ${this.renderLocalMap()}
                            </div>
                        </div>
                    `;
                    break;

                case 'inventory':
                    if (window.game.systems.equipment) {
                        container.innerHTML = window.game.systems.equipment.showInventory();
                    }
                    break;

                case 'shop':
                    if (window.game.systems.equipment) {
                        container.innerHTML = window.game.systems.equipment.showShop();
                    }
                    break;
            }

            container.style.display = 'block';
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

    // Убираем редактор карт - вместо него показываем обычную карту
    showTacticalMapEditor() {
        this.showOverlay('tactical-map');
    }
}

// Регистрируем систему в глобальной области
window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен с поддержкой JSON карт Tigrimion");
