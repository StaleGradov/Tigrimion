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
        
        this.loadedJSONMaps = new Map();
        this.activeOverlay = null;
        
        // Для Canvas рендеринга
        this.canvas = null;
        this.ctx = null;
        this.hexSize = 40;
        this.showGrid = true;
        this.hoveredHex = null;
        
        // Настройки рендеринга как в редакторе
        this.renderSettings = {
            gridSize: 40,
            gridAlpha: 0.3,
            imageTransform: {
                x: 0, y: 0, scale: 1, fit: 'contain'
            }
        };
        
        // Для точного позиционирования
        this.gridMetrics = null;
        
        console.log("✅ MapSystem инициализирован с поддержкой редактора");
    }

    async loadMapData() {
        try {
            console.log("📥 Загружаем данные карт...");
            
            await this.loadJSONMaps();
            
            if (this.tacticalMaps.length === 0) {
                this.createTestMaps();
            }
            
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

    // Сохраняем настройки рендеринга из редактора
    if (jsonMap.renderSettings) {
        this.renderSettings = { ...this.renderSettings, ...jsonMap.renderSettings };
    }

    // Сохраняем трансформацию изображения
    if (jsonMap.imageTransform) {
        this.renderSettings.imageTransform = { ...jsonMap.imageTransform };
    }

    const cells = jsonMap.game.grid.cells;
    
    // Рассчитываем метрики сетки как в редакторе
    const gridMetrics = this.calculateGridMetricsFromCells(cells);

    let startPosition = {x: 0, y: 0};
    const startCell = cells.find(cell => cell.type === 'player_start');
    if (startCell) {
        startPosition = {x: startCell.col, y: startCell.row};
    }

    const convertedCells = {};
    cells.forEach(cell => {
        const key = `${cell.col},${cell.row}`;
        
        // Точное позиционирование как в редакторе с правильным масштабированием
        const screenPos = this.hexToScreenExact(cell.col, cell.row, gridMetrics, jsonMap);
        
        convertedCells[key] = {
            type: cell.type,
            passable: cell.passable,
            visible: cell.visible,
            x: screenPos.x,
            y: screenPos.y,
            row: cell.row,
            col: cell.col,
            originalData: cell
        };
    });

    return {
        id: this.tacticalMaps.length + 1,
        name: jsonMap.meta?.name || "Карта Tigrimion",
        image: jsonMap.visual?.backgroundImage || "",
        width: gridMetrics.cols,
        height: gridMetrics.rows,
        startPosition: startPosition,
        description: jsonMap.meta?.description || "Создана в редакторе карт Tigrimion",
        localPosition: {x: 0, y: 0},
        cells: convertedCells,
        jsonData: jsonMap,
        gameData: jsonMap.game,
        renderType: 'hex',
        cellSize: jsonMap.game.grid.cellSize || 40,
        canvasWidth: jsonMap.visual?.canvasWidth,
        canvasHeight: jsonMap.visual?.canvasHeight,
        // Настройки редактора
        editorSettings: {
            gridSize: jsonMap.game.grid.cellSize,
            gridAlpha: jsonMap.renderSettings?.gridAlpha,
            imageTransform: jsonMap.imageTransform
        }
    };
}

    // Расчет метрик сетки как в редакторе
    calculateGridMetricsFromCells(cells) {
        if (!cells || cells.length === 0) {
            return {
                hexWidth: 69.28,
                hexHeight: 80,
                minRow: 0,
                maxRow: 0,
                minCol: 0,
                maxCol: 0,
                cols: 1,
                rows: 1,
                gridWidth: 69.28,
                gridHeight: 60
            };
        }

        const rows = cells.map(cell => cell.row);
        const cols = cells.map(cell => cell.col);
        
        const minRow = Math.min(...rows);
        const maxRow = Math.max(...rows);
        const minCol = Math.min(...cols);
        const maxCol = Math.max(...cols);

        const gridSize = this.renderSettings.gridSize;
        const hexHeight = gridSize * 2;
        const hexWidth = Math.sqrt(3) * gridSize;

        return {
            hexWidth,
            hexHeight,
            minRow,
            maxRow,
            minCol,
            maxCol,
            cols: maxCol - minCol + 1,
            rows: maxRow - minRow + 1,
            gridWidth: (maxCol - minCol + 1) * hexWidth,
            gridHeight: (maxRow - minRow + 1) * hexHeight * 0.75
        };
    }

    // Точное преобразование координат как в редакторе
hexToScreenExact(col, row, gridMetrics, jsonMap) {
    const gridSize = jsonMap.game.grid.cellSize || 40;
    const hexHeight = gridSize * 2;
    const hexWidth = Math.sqrt(3) * gridSize;

    // Используем оригинальные координаты из редактора
    const originalCell = jsonMap.game.grid.cells.find(cell => 
        cell.col === col && cell.row === row
    );
    
    if (originalCell) {
        // Если есть оригинальные координаты - используем их
        return {
            x: originalCell.x,
            y: originalCell.y
        };
    }

    // Fallback: расчет как в редакторе
    const { minRow, minCol } = gridMetrics;
    
    const gridX = col - minCol;
    const gridY = row - minRow;
    
    const x = gridX * hexWidth + (gridY % 2) * (hexWidth / 2);
    const y = gridY * hexHeight * 0.75;

    return { x, y };
}

    // ========== CANVAS РЕНДЕРИНГ КАК В РЕДАКТОРЕ ==========
   initCanvas() {
    const container = document.querySelector('.tactical-map-visual');
    if (!container) {
        console.log("❌ Контейнер для карты не найден");
        return;
    }

    // Очищаем контейнер
    container.innerHTML = '';

    // Создаем canvas
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'tacticalMapCanvas';
    
    // Устанавливаем размеры контейнера
    const containerRect = container.getBoundingClientRect();
    this.canvas.width = containerRect.width;
    this.canvas.height = containerRect.height;
    
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.cursor = 'pointer';
    container.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d');
    
    console.log(`✅ Canvas инициализирован: ${this.canvas.width}x${this.canvas.height}`);
    this.drawTacticalMap();
}
        
        // Пересчитываем метрики для текущей карты
        if (this.currentTacticalMap) {
            this.gridMetrics = this.calculateGridMetricsFromCells(
                Object.values(this.currentTacticalMap.cells).map(cell => ({
                    row: cell.row,
                    col: cell.col
                }))
            );
        }
        
        // Добавляем обработчики событий
        this.setupCanvasEventListeners();
        
        console.log("✅ Canvas инициализирован с настройками редактора");
        this.drawTacticalMap();
    }

    resizeCanvas() {
        if (!this.canvas) return;

        const container = document.querySelector('.tactical-map-visual');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        this.drawTacticalMap();
    }

    setupCanvasEventListeners() {
        if (!this.canvas) return;

        // Удаляем старые обработчики
        this.canvas.removeEventListener('click', this.boundHandleClick);
        this.canvas.removeEventListener('mousemove', this.boundHandleHover);

        // Создаем новые привязанные обработчики
        this.boundHandleClick = this.handleCanvasClick.bind(this);
        this.boundHandleHover = this.handleCanvasHover.bind(this);

        this.canvas.addEventListener('click', this.boundHandleClick);
        this.canvas.addEventListener('mousemove', this.boundHandleHover);

        window.addEventListener('resize', () => {
            setTimeout(() => this.resizeCanvas(), 100);
        });
    }

    handleCanvasClick(e) {
        if (!this.currentTacticalMap) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = this.getHexAtCanvasPosition(x, y);
        if (hex && hex.passable !== false) {
            console.log(`🎲 Клик по клетке: [${hex.col}, ${hex.row}]`);
            this.moveOnTacticalMap(hex.col, hex.row);
        }
    }

    handleCanvasHover(e) {
        if (!this.currentTacticalMap) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = this.getHexAtCanvasPosition(x, y);
        this.hoveredHex = hex;
        this.drawTacticalMap();
    }

    getHexAtCanvasPosition(x, y) {
        if (!this.currentTacticalMap) return null;

        const cells = Object.values(this.currentTacticalMap.cells);
        const hexSize = this.currentTacticalMap.cellSize || this.renderSettings.gridSize;
        
        for (const cell of cells) {
            const distance = Math.sqrt(
                Math.pow(x - cell.x, 2) + 
                Math.pow(y - cell.y, 2)
            );
            
            if (distance <= hexSize * 0.9) {
                return cell;
            }
        }
        return null;
    }

    hexToScreen(col, row) {
        const hexSize = this.currentTacticalMap?.cellSize || this.renderSettings.gridSize;
        const hexWidth = Math.sqrt(3) * hexSize;
        const hexHeight = 2 * hexSize;

        // Находим границы карты для центрирования
        const cells = Object.values(this.currentTacticalMap.cells);
        const rows = cells.map(cell => cell.row);
        const cols = cells.map(cell => cell.col);
        const minRow = Math.min(...rows);
        const maxRow = Math.max(...rows);
        const minCol = Math.min(...cols);
        const maxCol = Math.max(...cols);

        // Координаты в сетке
        const gridX = col - minCol;
        const gridY = row - minRow;
        
        const x = gridX * hexWidth + (gridY % 2) * (hexWidth / 2);
        const y = gridY * hexHeight * 0.75;

        // Масштабирование и центрирование
        const container = document.querySelector('.tactical-map-visual');
        if (!container) return {x, y};

        const gridWidth = (maxCol - minCol + 1) * hexWidth;
        const gridHeight = (maxRow - minRow + 1) * hexHeight * 0.75;
        
        const scaleX = container.clientWidth / gridWidth;
        const scaleY = container.clientHeight / gridHeight;
        const scale = Math.min(scaleX, scaleY) * 0.85;
        
        const offsetX = (container.clientWidth - gridWidth * scale) / 2;
        const offsetY = (container.clientHeight - gridHeight * scale) / 2;
        
        return {
            x: x * scale + offsetX,
            y: y * scale + offsetY
        };
    }

    drawTacticalMap() {
        if (!this.ctx || !this.currentTacticalMap) return;

        const canvas = this.canvas;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Рисуем фон
        this.drawBackground();

        // Рисуем клетки
        this.drawHexes();

        // Рисуем доступные ходы
        this.drawAvailableMoves();

        // Рисуем подсветку при наведении
        this.drawHoverEffect();

        // Рисуем сетку поверх всего
        if (this.showGrid) {
            this.drawHexGrid();
        }
    }

    drawBackground() {
        const map = this.currentTacticalMap;
        if (!map.image) {
            // Если нет изображения, рисуем градиентный фон как в редакторе
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        const img = new Image();
        img.onload = () => {
            this.ctx.save();
            
            // Применяем трансформацию из редактора
            if (map.editorSettings?.imageTransform) {
                const transform = map.editorSettings.imageTransform;
                this.ctx.drawImage(
                    img,
                    transform.x,
                    transform.y,
                    img.naturalWidth * transform.scale,
                    img.naturalHeight * transform.scale
                );
            } else {
                // Стандартное отображение
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            }
            
            this.ctx.restore();
            
            // Перерисовываем остальные элементы
            this.drawHexes();
            this.drawAvailableMoves();
            this.drawHoverEffect();
            if (this.showGrid) {
                this.drawHexGrid();
            }
        };
        img.onerror = () => {
            console.log("❌ Ошибка загрузки изображения карты");
            // Фон как в редакторе при ошибке
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        };
        img.src = map.image;
    }

    drawHexGrid() {
        const cells = Object.values(this.currentTacticalMap.cells);
        
        this.ctx.save();
        cells.forEach(cell => {
            if (cell.visible) {
                this.drawSingleHexOutline(cell);
            }
        });
        this.ctx.restore();
    }

    drawSingleHexOutline(cell) {
        const hexSize = this.currentTacticalMap.cellSize || this.renderSettings.gridSize;

        this.ctx.save();
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = cell.x + hexSize * Math.cos(angle);
            const y = cell.y + hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();

        this.ctx.strokeStyle = `rgba(0, 255, 255, ${this.renderSettings.gridAlpha})`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
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
        const hexSize = this.currentTacticalMap.cellSize || this.renderSettings.gridSize;

        this.ctx.save();
        this.ctx.beginPath();
        
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = cell.x + hexSize * Math.cos(angle);
            const y = cell.y + hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();

        // Цвета заливки как в редакторе
        let fillColor = 'rgba(0, 0, 0, 0.3)';
        
        if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
            fillColor = 'rgba(74, 222, 128, 0.6)';
        } else if (cell.type === 'monster') {
            fillColor = 'rgba(239, 68, 68, 0.5)';
        } else if (cell.type === 'chest') {
            fillColor = 'rgba(245, 158, 11, 0.5)';
        } else if (cell.type === 'npc') {
            fillColor = 'rgba(59, 130, 246, 0.5)';
        } else if (cell.type === 'exit') {
            fillColor = 'rgba(139, 92, 246, 0.5)';
        } else if (cell.type === 'obstacle' || cell.passable === false) {
            fillColor = 'rgba(107, 114, 128, 0.7)';
        } else if (cell.type === 'player_start') {
            fillColor = 'rgba(74, 222, 128, 0.4)';
        } else if (cell.type === 'active') {
            fillColor = 'rgba(34, 197, 94, 0.3)';
        } else if (cell.type === 'inactive') {
            fillColor = 'rgba(239, 68, 68, 0.3)';
        }

        this.ctx.fillStyle = fillColor;
        this.ctx.fill();

        // Обводка как в редакторе
        if (this.showGrid) {
            let strokeColor = `rgba(0, 255, 255, ${this.renderSettings.gridAlpha})`;
            let lineWidth = 1;
            
            if (cell.type && cell.type !== 'active') {
                const objColors = {
                    'player_start': '#4ade80',
                    'monster': '#ef4444', 
                    'chest': '#f59e0b',
                    'npc': '#3b82f6',
                    'exit': '#8b5cf6',
                    'obstacle': '#6b7280'
                };
                strokeColor = this.hexToRgba(objColors[cell.type] || '#00ffff', 0.9);
                lineWidth = 3;
            } else if (this.hoveredHex && this.hoveredHex.col === cell.col && this.hoveredHex.row === cell.row) {
                strokeColor = 'rgba(255, 255, 255, 0.8)';
                lineWidth = 2;
            }
            
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = lineWidth;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    drawHexContent(cell) {
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        let symbol = '·';
        let color = '#ffffff';
        let fontSize = 16;

        if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
            symbol = '🎯';
            fontSize = 20;
            color = '#ffffff';
        } else {
            switch(cell.type) {
                case 'player_start':
                    symbol = '⭐';
                    break;
                case 'monster':
                    symbol = '👹';
                    break;
                case 'chest':
                    symbol = '📦';
                    break;
                case 'npc':
                    symbol = '🧙';
                    break;
                case 'exit':
                    symbol = '🚪';
                    break;
                case 'obstacle':
                    symbol = '🪨';
                    color = '#6b7280';
                    break;
                case 'active':
                    symbol = '·';
                    color = 'rgba(255, 255, 255, 0.5)';
                    break;
                case 'inactive':
                    symbol = '·';
                    color = 'rgba(255, 255, 255, 0.3)';
                    break;
            }
        }

        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(symbol, cell.x, cell.y);
        this.ctx.restore();
    }

    drawAvailableMoves() {
        const availableMoves = this.getHexNeighbors(
            this.playerTacticalPosition.y, 
            this.playerTacticalPosition.x
        );

        this.ctx.save();
        availableMoves.forEach(move => {
            const hexSize = this.currentTacticalMap.cellSize || this.renderSettings.gridSize;

            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i + Math.PI / 6;
                const x = move.cell.x + hexSize * Math.cos(angle);
                const y = move.cell.y + hexSize * Math.sin(angle);
                
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();

            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
        this.ctx.restore();
    }

    drawHoverEffect() {
        if (!this.hoveredHex) return;

        const hexSize = this.currentTacticalMap.cellSize || this.renderSettings.gridSize;

        this.ctx.save();
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = this.hoveredHex.x + hexSize * Math.cos(angle);
            const y = this.hoveredHex.y + hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.restore();
    }

    // Вспомогательная функция для цветов
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

   // Исправленный алгоритм поиска соседей
getHexNeighbors(currentRow, currentCol) {
    if (!this.currentTacticalMap) return [];
    
    const neighbors = [];
    const isEvenRow = currentRow % 2 === 0;
    
    // Правильные направления для шестиугольной сетки
    const directions = isEvenRow ? [
        {dr: -1, dc: 0},   // северо-запад
        {dr: -1, dc: 1},   // северо-восток  
        {dr: 0, dc: -1},   // запад
        {dr: 0, dc: 1},    // восток
        {dr: 1, dc: 0},    // юго-запад
        {dr: 1, dc: 1}     // юго-восток
    ] : [
        {dr: -1, dc: -1},  // северо-запад
        {dr: -1, dc: 0},   // северо-восток
        {dr: 0, dc: -1},   // запад
        {dr: 0, dc: 1},    // восток
        {dr: 1, dc: -1},   // юго-запад
        {dr: 1, dc: 0}     // юго-восток
    ];
    
    directions.forEach(({dr, dc}) => {
        const newRow = currentRow + dr;
        const newCol = currentCol + dc;
        const cellKey = `${newCol},${newRow}`;
        const neighbor = this.currentTacticalMap.cells[cellKey];
        
        // Проверяем, что клетка существует, видима и проходима
        if (neighbor && neighbor.visible && neighbor.passable !== false) {
            neighbors.push({
                row: newRow,
                col: newCol,
                cell: neighbor
            });
        }
    });
    
    return neighbors;
}
// Улучшенная проверка соседних клеток
isCellReachable(targetRow, targetCol) {
    const currentRow = this.playerTacticalPosition.y;
    const currentCol = this.playerTacticalPosition.x;
    
    // Проверяем, что это не та же самая клетка
    if (targetRow === currentRow && targetCol === currentCol) {
        return false;
    }
    
    const neighbors = this.getHexNeighbors(currentRow, currentCol);
    return neighbors.some(neighbor => 
        neighbor.row === targetRow && neighbor.col === targetCol
    );
}

    // ========== ОСНОВНЫЕ МЕТОДЫ КАРТ ==========
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
                    "3,3": {type: "start", content: "player_start", passable: true, row: 3, col: 3, visible: true},
                    "3,2": {type: "exit", direction: "north", content: "exit_north", passable: true, row: 2, col: 3, visible: true},
                    "2,3": {type: "monster", monsterId: 1, content: "goblin", passable: false, row: 3, col: 2, visible: true},
                    "4,3": {type: "chest", loot: "common", content: "wooden_chest", passable: true, row: 3, col: 4, visible: true},
                    "3,4": {type: "npc", content: "old_merchant", passable: true, row: 4, col: 3, visible: true}
                }
            }];
        }
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
                "1,1": {type: "start", content: "player_start", passable: true, row: 1, col: 1, visible: true}
            }
        }];
    }

    setStartPositions() {
        if (this.globalMaps.length > 0) {
            this.currentGlobalMap = this.globalMaps[0];
            this.playerGlobalPosition = {...this.currentGlobalMap.startPosition};
            
            const localMap = this.findLocalMapAtPosition(
                this.playerGlobalPosition.x, 
                this.playerGlobalPosition.y
            );
            
            if (localMap) {
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
            }
        }
        
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

    // ========== ОТРИСОВКА КАРТ ==========
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
                    <button class="btn-secondary" onclick="game.systems.map.toggleGrid()">
                        ${this.showGrid ? '🔲 Сетка' : '🔳 Сетка'}
                    </button>
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
            </div>
            
            <div class="tactical-map-content" id="tacticalMapContent">
                <div class="tactical-map-visual-container">
                    <div class="tactical-map-visual" id="tacticalMapVisual">
                        <!-- Canvas будет добавлен автоматически -->
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
                    <div class="map-editor-info">
                        <div class="map-editor-stats">
                            <div class="map-editor-stat">
                                <span>Размер клеток:</span>
                                <span>${map.cellSize}px</span>
                            </div>
                            <div class="map-editor-stat">
                                <span>Канвас:</span>
                                <span>${map.canvasWidth}×${map.canvasHeight}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
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

    generateLocalMapGrid() {
        let gridHTML = '';
        const { width, height } = this.currentLocalMap;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const isPlayerHere = x === this.playerLocalPosition.x && y === this.playerLocalPosition.y;
                let cellClass = 'map-cell local-cell';
                let cellContent = '·';

                if (isPlayerHere) {
                    cellClass += ' player-cell';
                    cellContent = '🎯';
                }

                gridHTML += `
                    <div class="${cellClass}" 
                         onclick="game.systems.map.moveOnLocalMap(${x}, ${y})"
                         title="Локальная позиция: [${x}, ${y}]">
                        ${cellContent}
                    </div>
                `;
            }
        }
        
        return gridHTML;
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

    // ========== ДВИЖЕНИЕ И ВЗАИМОДЕЙСТВИЯ ==========
    moveOnGlobalMap(x, y) {
        const localMap = this.findLocalMapAtPosition(x, y);
        if (!localMap) {
            console.log("🚫 На этой позиции нет локальной карты");
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

    // Проверяем, что клетка существует и проходима
    const cellKey = `${x},${y}`;
    const cellData = this.currentTacticalMap.cells[cellKey];
    
    if (!cellData) {
        console.log("🚫 Клетка не существует");
        if (window.game) {
            window.game.showNotification("Эта клетка не существует!", 'error');
        }
        return;
    }

    if (cellData.passable === false) {
        console.log("🚫 Нельзя пройти на эту клетку");
        if (window.game) {
            window.game.showNotification("Нельзя пройти на эту клетку!", 'error');
        }
        return;
    }

    // Проверяем, что клетка соседняя
    if (!this.isCellReachable(y, x)) {
        console.log("🚫 Нельзя переместиться на эту клетку - она не соседняя");
        if (window.game) {
            window.game.showNotification("Можно ходить только на соседние клетки!", 'error');
        }
        return;
    }

    // Перемещаем игрока
    this.playerTacticalPosition = {x, y};
    
    console.log(`🎲 Перемещение на тактическую позицию: [${x}, ${y}]`);
    
    // Взаимодействуем с объектом на клетке
    if (cellData.type !== 'active' && cellData.type !== 'empty') {
        this.interactWithTacticalCell(x, y);
    }
    
    this.updateTacticalMapDisplay();
    this.updateMovementInfo();
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
        this.drawTacticalMap();
    }

    updateMovementInfo() {
        const availableMoves = this.getHexNeighbors(
            this.playerTacticalPosition.y, 
            this.playerTacticalPosition.x
        );
        
        const movesElement = document.getElementById('availableMoves');
        if (movesElement) {
            movesElement.textContent = availableMoves.length;
        }
    }

    // ========== УПРАВЛЕНИЕ ОВЕРЛЕЯМИ ==========
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
            
            // Инициализируем Canvas после добавления в DOM
            setTimeout(() => {
                this.initCanvas();
                this.updateMovementInfo();
            }, 100);
            
        } else {
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
            this.hoveredHex = null;
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.drawTacticalMap();
    }

    showTacticalMapEditor() {
        this.showOverlay('tactical-map');
    }

    zoomIn() {
        console.log("🔍 Увеличиваем масштаб");
        // Реализация масштабирования может быть добавлена позже
    }

    zoomOut() {
        console.log("🔍 Уменьшаем масштаб");
        // Реализация масштабирования может быть добавлена позже
    }
}

// Регистрируем систему в глобальной области
window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен с поддержкой Canvas рендеринга и редактора карт");
