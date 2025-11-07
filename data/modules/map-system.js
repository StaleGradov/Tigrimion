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

        const cells = jsonMap.game.grid.cells;
        
        // Рассчитываем метрики сетки
        const gridMetrics = this.calculateGridMetricsFromCells(cells);

        let startPosition = {x: 0, y: 0};
        const startCell = cells.find(cell => cell.type === 'player_start');
        if (startCell) {
            startPosition = {x: startCell.col, y: startCell.row};
        }

        const convertedCells = {};
        
        // Находим минимальные координаты для центрирования
        const minX = Math.min(...cells.map(cell => cell.x));
        const minY = Math.min(...cells.map(cell => cell.y));
        const maxX = Math.max(...cells.map(cell => cell.x));
        const maxY = Math.max(...cells.map(cell => cell.y));
        
        // Смещение для центрирования
        const offsetX = -minX;
        const offsetY = -minY;

        cells.forEach(cell => {
            const key = `${cell.col},${cell.row}`;
            
            // Корректируем координаты для центрирования
            const adjustedX = cell.x + offsetX + 50; // +50 для отступа
            const adjustedY = cell.y + offsetY + 50; // +50 для отступа
            
            convertedCells[key] = {
                type: cell.type,
                passable: cell.passable,
                visible: cell.visible,
                x: adjustedX,
                y: adjustedY,
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
            // Сохраняем смещения для правильного отображения
            offset: { x: offsetX, y: offsetY }
        };
    }

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

        return {
            minRow,
            maxRow,
            minCol,
            maxCol,
            cols: maxCol - minCol + 1,
            rows: maxRow - minRow + 1
        };
    }

    // ========== CANVAS РЕНДЕРИНГ ==========
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
        
        // Устанавливаем размеры
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.cursor = 'pointer';
        container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Добавляем обработчики событий
        this.setupCanvasEventListeners();
        
        console.log("✅ Canvas инициализирован");
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

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));

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
        const hexSize = this.currentTacticalMap.cellSize || 40;
        
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
            // Градиентный фон
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        const img = new Image();
        img.onload = () => {
            // Рисуем изображение на весь canvas
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
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
            // Градиентный фон при ошибке
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            this.ctx.fillStyle = gradient;
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
        const hexSize = this.currentTacticalMap.cellSize || 40;

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

        this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.6)';
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
        const hexSize = this.currentTacticalMap.cellSize || 40;

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

        // Цвета заливки
        let fillColor = 'rgba(76, 201, 240, 0.2)';
        
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
        }

        this.ctx.fillStyle = fillColor;
        this.ctx.fill();

        // Обводка
        if (this.showGrid) {
            let strokeColor = 'rgba(76, 201, 240, 0.6)';
            let lineWidth = 1;
            
            if (cell.type && cell.type !== 'active') {
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
            const hexSize = this.currentTacticalMap.cellSize || 40;

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

        const hexSize = this.currentTacticalMap.cellSize || 40;

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

    // ========== СИСТЕМА СОСЕДЕЙ И ДВИЖЕНИЯ ==========
    getHexNeighbors(currentRow, currentCol) {
        if (!this.currentTacticalMap) return [];
        
        const neighbors = [];
        const isEvenRow = currentRow % 2 === 0;
        
        // ПРАВИЛЬНЫЕ направления для шестиугольной сетки
        const directions = isEvenRow ? [
            {dr: -1, dc: 0},   // север
            {dr: -1, dc: 1},   // северо-восток  
            {dr: 0, dc: 1},    // юго-восток
            {dr: 1, dc: 0},    // юг
            {dr: 1, dc: -1},   // юго-запад
            {dr: 0, dc: -1}    // северо-запад
        ] : [
            {dr: -1, dc: 0},   // север
            {dr: -1, dc: 1},   // северо-восток
            {dr: 0, dc: 1},    // юго-восток  
            {dr: 1, dc: 1},    // юг
            {dr: 1, dc: 0},    // юго-запад
            {dr: 0, dc: -1}    // северо-запад
        ];
        
        console.log(`🔍 Поиск соседей для [${currentCol},${currentRow}]:`);
        
        directions.forEach(({dr, dc}) => {
            const newRow = currentRow + dr;
            const newCol = currentCol + dc;
            const cellKey = `${newCol},${newRow}`;
            const neighbor = this.currentTacticalMap.cells[cellKey];
            
            if (neighbor) {
                console.log(`   Проверка [${newCol},${newRow}]: ${neighbor.type}, passable: ${neighbor.passable}`);
            }
            
            // Проверяем, что клетка существует, видима и проходима
            if (neighbor && neighbor.visible && neighbor.passable !== false) {
                neighbors.push({
                    row: newRow,
                    col: newCol,
                    cell: neighbor
                });
                console.log(`   ✅ Добавлен сосед: [${newCol},${newRow}]`);
            }
        });
        
        console.log(`   Найдено соседей: ${neighbors.length}`);
        return neighbors;
    }

    isCellReachable(targetRow, targetCol) {
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        return neighbors.some(neighbor => 
            neighbor.row === targetRow && neighbor.col === targetCol
        );
    }

    // ДОБАВЬТЕ метод для отладки
    debugNeighbors() {
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        
        console.log("=== ДЕБАГ СИСТЕМЫ ХОДОВ ===");
        console.log(`Текущая позиция: [${currentCol}, ${currentRow}]`);
        
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        console.log("Доступные ходы:", neighbors);
        
        // Покажем все клетки вокруг для проверки
        for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
                const checkRow = currentRow + dr;
                const checkCol = currentCol + dc;
                const cellKey = `${checkCol},${checkRow}`;
                const cell = this.currentTacticalMap.cells[cellKey];
                
                if (cell) {
                    const isNeighbor = neighbors.some(n => n.row === checkRow && n.col === checkCol);
                    console.log(`[${checkCol},${checkRow}]: ${cell.type} ${isNeighbor ? '✅ СОСЕД' : ''}`);
                }
            }
        }
    }

    moveOnTacticalMap(x, y) {
        if (!this.currentTacticalMap) return;

        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        
        console.log(`🎲 Попытка перемещения с [${currentCol},${currentRow}] на [${x},${y}]`);

        // Проверяем, что клетка существует
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
            
       
