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
        
        // Убрали масштабирование и сложное позиционирование
        this.mapOffset = { x: 0, y: 0 };
        
        // Оптимизация рендеринга
        this.lastHoveredHex = null;
        this.animationFrame = null;
        
        console.log("✅ MapSystem инициализирован");
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
                originalData: cell
            };
        });

        // Находим стартовую позицию
        let startPosition = {x: 0, y: 0};
        const startCell = cells.find(cell => cell.type === 'player_start');
        if (startCell) {
            startPosition = {x: startCell.col, y: startCell.row};
        }

        return {
            id: this.tacticalMaps.length + 1,
            name: jsonMap.meta?.name || "Карта Tigrimion",
            image: jsonMap.visual?.backgroundImage || "",
            width: 20,
            height: 20,
            startPosition: startPosition,
            description: jsonMap.meta?.description || "Создана в редакторе карт Tigrimion",
            localPosition: {x: 0, y: 0},
            cells: convertedCells,
            jsonData: jsonMap,
            gameData: jsonMap.game,
            renderType: 'hex',
            cellSize: jsonMap.game.grid.cellSize || 40
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
        
        // Рассчитываем позиционирование
        this.calculateMapPositioning();
        
        // Добавляем обработчики событий
        this.setupCanvasEventListeners();
        
        console.log("✅ Canvas инициализирован");
        this.drawTacticalMap();
    }

   calculateMapPositioning() {
    if (!this.currentTacticalMap || !this.canvas) return;

    const container = document.querySelector('.tactical-map-visual');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    console.log(`📐 Контейнер: ${rect.width}x${rect.height}`);
    console.log(`📐 Canvas: ${this.canvas.width}x${this.canvas.height}`);

    const cells = Object.values(this.currentTacticalMap.cells);
    if (cells.length === 0) return;

    // Находим границы ВСЕХ клеток
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    cells.forEach(cell => {
        const hexSize = this.currentTacticalMap.cellSize || 40;
        // Учитываем размер гекса при расчете границ
        minX = Math.min(minX, cell.x - hexSize);
        minY = Math.min(minY, cell.y - hexSize);
        maxX = Math.max(maxX, cell.x + hexSize);
        maxY = Math.max(maxY, cell.y + hexSize);
    });

    console.log(`📐 Границы карты: X[${minX.toFixed(0)}-${maxX.toFixed(0)}] Y[${minY.toFixed(0)}-${maxY.toFixed(0)}]`);

    // Центрируем карту ПРОСТО - помещаем центр масс в центр canvas
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    this.mapOffset.x = rect.width / 2 - centerX;
    this.mapOffset.y = rect.height / 2 - centerY;

    console.log(`📐 Центр карты: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);
    console.log(`📐 Смещение: (${this.mapOffset.x.toFixed(1)}, ${this.mapOffset.y.toFixed(1)})`);

    // Отладочная информация о нескольких клетках
    console.log("🔍 Примеры клеток:");
    cells.slice(0, 3).forEach(cell => {
        console.log(`  [${cell.col},${cell.row}] -> (${cell.x}, ${cell.y})`);
    });
}
setupCanvasEventListeners() {
    if (!this.canvas) return;

    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    // УБРАТЬ СТРОКУ НИЖЕ - ВРЕМЕННО ОТКЛЮЧАЕМ ХОВЕР
    // this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));

    window.addEventListener('resize', () => {
        setTimeout(() => {
            this.calculateMapPositioning();
            this.forceRedraw();
        }, 100);
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
        
        // Оптимизация: перерисовываем только если изменилась клетка
        if (this.lastHoveredHex !== hex) {
            this.lastHoveredHex = hex;
            this.hoveredHex = hex;
            
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
            }
            this.animationFrame = requestAnimationFrame(() => {
                this.drawTacticalMap();
            });
        }
    }

   getHexAtCanvasPosition(canvasX, canvasY) {
    if (!this.currentTacticalMap) return null;

    const cells = Object.values(this.currentTacticalMap.cells);
    const hexSize = this.currentTacticalMap.cellSize || 40;
    
    console.log(`🎯 Canvas click: (${canvasX}, ${canvasY})`);
    console.log(`🎯 Map offset: (${this.mapOffset.x}, ${this.mapOffset.y})`);
    
    // ПРАВИЛЬНОЕ преобразование: вычитаем смещение
    const mapX = canvasX - this.mapOffset.x;
    const mapY = canvasY - this.mapOffset.y;
    
    console.log(`🎯 Map coordinates: (${mapX}, ${mapY})`);

    let closestCell = null;
    let minDistance = Infinity;

    for (const cell of cells) {
        const distance = Math.sqrt(
            Math.pow(mapX - cell.x, 2) + 
            Math.pow(mapY - cell.y, 2)
        );
        
        // Ищем ближайшую клетку
        if (distance < minDistance) {
            minDistance = distance;
            closestCell = cell;
        }
        
        // Если попадаем точно в клетку
        if (distance <= hexSize * 0.6) {
            console.log(`✅ Точное попадание в [${cell.col},${cell.row}] - расстояние: ${distance.toFixed(1)}`);
            return cell;
        }
    }
    
    // Если не попали точно, но есть ближайшая клетка в пределах досягаемости
    if (closestCell && minDistance <= hexSize * 1.2) {
        console.log(`🎯 Ближайшая клетка [${closestCell.col},${closestCell.row}] - расстояние: ${minDistance.toFixed(1)}`);
        return closestCell;
    }
    
    console.log(`❌ Не попали ни в одну клетку. Ближайшая: ${minDistance.toFixed(1)}px`);
    return null;
}

    drawTacticalMap() {
        if (!this.ctx || !this.currentTacticalMap) return;

        const canvas = this.canvas;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Сохраняем контекст для трансформаций
        this.ctx.save();
        
        // Применяем только смещение (без масштаба)
        this.ctx.translate(this.mapOffset.x, this.mapOffset.y);

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

        this.ctx.restore();
        
        this.drawDebugOverlay();
    }

    drawBackground() {
        const map = this.currentTacticalMap;
        if (!map.image) {
            return;
        }

        // Получаем границы для рисования фона
        const cells = Object.values(map.cells);
        if (cells.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        cells.forEach(cell => {
            const hexSize = map.cellSize || 40;
            minX = Math.min(minX, cell.x - hexSize);
            minY = Math.min(minY, cell.y - hexSize);
            maxX = Math.max(maxX, cell.x + hexSize);
            maxY = Math.max(maxY, cell.y + hexSize);
        });

        const width = maxX - minX;
        const height = maxY - minY;

        const img = new Image();
        img.onload = () => {
            this.ctx.drawImage(img, minX, minY, width, height);
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
            const gradient = this.ctx.createLinearGradient(minX, minY, maxX, maxY);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(minX, minY, width, height);
        };
        img.src = map.image;
    }

    drawHexGrid() {
        const cells = Object.values(this.currentTacticalMap.cells);
        const hexSize = this.currentTacticalMap.cellSize || 40;
        
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.6)';
        this.ctx.lineWidth = 1;
        
        cells.forEach(cell => {
            if (cell.visible) {
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = Math.PI / 3 * i + Math.PI / 6;
                    const x = cell.x + hexSize * Math.cos(angle);
                    const y = cell.y + hexSize * Math.sin(angle);
                    
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
        const availableMoves = this.getAvailableMoves();
        
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

            // Яркая подсветка доступных ходов
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
            this.ctx.lineWidth = 3;
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
drawDebugOverlay() {
    if (!this.ctx) return;
    
    this.ctx.save();
    
    // Рисуем отладочную информацию поверх всего
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(10, 10, 300, 120);
    
    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'left';
    
    this.ctx.fillText(`Canvas: ${this.canvas.width}x${this.canvas.height}`, 20, 30);
    this.ctx.fillText(`Offset: (${this.mapOffset.x.toFixed(1)}, ${this.mapOffset.y.toFixed(1)})`, 20, 50);
    this.ctx.fillText(`Cells: ${Object.keys(this.currentTacticalMap.cells).length}`, 20, 70);
    
    if (this.playerTacticalPosition) {
        this.ctx.fillText(`Player: [${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}]`, 20, 90);
    }
    
    this.ctx.fillText(`Hover: ${this.hoveredHex ? `[${this.hoveredHex.col},${this.hoveredHex.row}]` : 'none'}`, 20, 110);
    
    // Рисуем перекрестие в центре canvas
    this.ctx.strokeStyle = '#ff0000';
    this.ctx.lineWidth = 1;
    
    // Вертикальная линия
    this.ctx.beginPath();
    this.ctx.moveTo(this.canvas.width / 2, 0);
    this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
    this.ctx.stroke();
    
    // Горизонтальная линия
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height / 2);
    this.ctx.lineTo(this.canvas.width, this.canvas.height / 2);
    this.ctx.stroke();
    
    this.ctx.restore();
}
    // ========== НОВАЯ СИСТЕМА ОПРЕДЕЛЕНИЯ СОСЕДЕЙ ПО РАССТОЯНИЮ ==========
    getAvailableMoves() {
        if (!this.currentTacticalMap) return [];
        
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        
        console.log(`📍 Текущая позиция: [${currentCol}, ${currentRow}]`);
        console.log(`🎯 Доступные ходы:`, neighbors.map(n => `[${n.col}, ${n.row}]`));
        
        return neighbors;
    }

    // Основные геометрические константы для гексов
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
        
        // Проверяем все клетки на карте
        Object.values(this.currentTacticalMap.cells).forEach(potentialNeighbor => {
            // Пропускаем текущую клетку
            if (potentialNeighbor.col === currentCol && potentialNeighbor.row === currentRow) {
                return;
            }
            
            // Проверяем расстояние
            const dx = potentialNeighbor.x - currentCell.x;
            const dy = potentialNeighbor.y - currentCell.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const isAdjacent = this.areHexesAdjacent(currentCell, potentialNeighbor, hexSize);
            
            if (isAdjacent) {
                const direction = this.getDirectionByAngle(dx, dy);
                
                if (potentialNeighbor.visible && potentialNeighbor.passable !== false) {
                    neighbors.push({
                        row: potentialNeighbor.row,
                        col: potentialNeighbor.col,
                        cell: potentialNeighbor,
                        direction: direction,
                        distance: distance
                    });
                    console.log(`  ✅ Сосед: [${potentialNeighbor.col},${potentialNeighbor.row}] - ${direction} (${distance.toFixed(1)}px)`);
                }
            }
        });
        
        console.log(`🎯 Итог: найдено ${neighbors.length} доступных соседей`);
        return neighbors;
    }

    // Метод проверки смежности по расстоянию между центрами
    areHexesAdjacent(cell1, cell2, hexSize) {
        if (!cell1 || !cell2) return false;
        
        const geometry = this.getHexGeometry(hexSize);
        
        // Вычисляем расстояние между центрами
        const dx = cell2.x - cell1.x;
        const dy = cell2.y - cell1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Проверяем все возможные расстояния для смежных гексов
        const isHorizontalAdjacent = Math.abs(distance - geometry.horizontalDistance) < geometry.tolerance;
        const isVerticalAdjacent = Math.abs(distance - geometry.verticalDistance) < geometry.tolerance;
        const isDiagonalAdjacent = Math.abs(distance - geometry.diagonalDistance) < geometry.tolerance;
        
        const isAdjacent = isHorizontalAdjacent || isVerticalAdjacent || isDiagonalAdjacent;
        
        return isAdjacent;
    }

    // Определение направления по вектору
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

    isCellReachable(targetRow, targetCol) {
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        
        // Нельзя ходить на ту же клетку
        if (targetRow === currentRow && targetCol === currentCol) {
            console.log(`🚫 Нельзя ходить на ту же клетку [${targetCol},${targetRow}]`);
            return false;
        }
        
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        const isReachable = neighbors.some(neighbor => 
            neighbor.row === targetRow && neighbor.col === targetCol
        );
        
        console.log(`🎯 Проверка достижимости [${targetCol},${targetRow}] от [${currentCol},${currentRow}]: ${isReachable}`);
        
        if (!isReachable) {
            console.log(`📋 Доступные ходы:`, neighbors.map(n => `[${n.col},${n.row}]`));
        }
        
        return isReachable;
    }

    moveOnTacticalMap(x, y) {
        if (!this.currentTacticalMap) return;

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

        // ПРОСТАЯ проверка достижимости
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

        // Перемещаем игрока
        const oldPosition = {...this.playerTacticalPosition};
        this.playerTacticalPosition = {x, y};
        
        console.log(`✅ Успешное перемещение с [${oldPosition.x}, ${oldPosition.y}] на: [${x}, ${y}]`);
        
        // Взаимодействуем с объектом на клетке
        if (cellData.type !== 'active' && cellData.type !== 'empty' && cellData.type !== 'player_start') {
            this.interactWithTacticalCell(x, y);
        }
        
        this.updateTacticalMapDisplay();
        this.updateMovementInfo();
        
        if (window.game) {
            window.game.showNotification(`Перемещение на [${x}, ${y}]`, 'success');
        }
    }

    interactWithTacticalCell(x, y) {
        const cellKey = `${x},${y}`;
        const cellData = this.currentTacticalMap.cells[cellKey];
        
        if (!cellData) return;

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
            window.game.showNotification('NPC: "Приветствую, путник!"', 'info');
        }
    }

    useExit(exitData, x, y) {
        console.log(`🚪 Используем выход:`, exitData);
        if (window.game) {
            window.game.showNotification('Выход с карты!', 'info');
        }
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
                "3,3": {type: "start", passable: true, row: 3, col: 3, visible: true, x: 300, y: 300},
                "3,2": {type: "exit", passable: true, row: 2, col: 3, visible: true, x: 300, y: 250},
                "2,3": {type: "monster", passable: false, row: 3, col: 2, visible: true, x: 250, y: 300},
                "4,3": {type: "chest", passable: true, row: 3, col: 4, visible: true, x: 350, y: 300},
                "3,4": {type: "npc", passable: true, row: 4, col: 3, visible: true, x: 300, y: 350}
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
                "1,1": {type: "start", passable: true, row: 1, col: 1, visible: true, x: 100, y: 100}
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
                    <div class="tactical-map-visual" id="tacticalMapVisual">
                        <!-- Canvas будет добавлен автоматически -->
                    </div>
                    
                    <div class="position-info">
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
                        case 'player_start':
                            cellContent = '⭐';
                            break;
                        case 'obstacle':
                            cellContent = '🪨';
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
                         onclick="game.systems.map.moveOnTacticalMap(${x}, ${y})"
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

    moveOnLocalMap(x, y) {
        const tacticalMap = this.findTacticalMapAtPosition(x, y);
        if (!tacticalMap) {
            console.log("🚫 На этой позиции нет тактической карты");
            if (window.game) {
                window.game.showNotification("Здесь нет тактической зоны!", 'warning');
            }
            return;
        }

        this.playerLocalPosition = {x, y};
        this.currentTacticalMap = tacticalMap;
        this.playerTacticalPosition = {...tacticalMap.startPosition};

        console.log(`📍 Перемещение на локальную позицию: [${x}, ${y}]`);
        this.updateGameDisplay();
        
        if (window.game) {
            window.game.showNotification(`Вход в ${tacticalMap.name}`, 'info');
        }
    }

    // ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ==========
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
        const availableMoves = this.getAvailableMoves();
        
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
                    if (window.game && window.game.systems.equipment) {
                        container.innerHTML = window.game.systems.equipment.showInventory();
                    }
                    break;

                case 'shop':
                    if (window.game && window.game.systems.equipment) {
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
            this.lastHoveredHex = null;
            
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
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

    // ========== СИСТЕМА СОХРАНЕНИЯ/ЗАГРУЗКИ ==========
    saveMapState() {
        const state = {
            playerGlobalPosition: this.playerGlobalPosition,
            playerLocalPosition: this.playerLocalPosition,
            playerTacticalPosition: this.playerTacticalPosition,
            currentGlobalMapId: this.currentGlobalMap?.id,
            currentLocalMapId: this.currentLocalMap?.id,
            currentTacticalMapId: this.currentTacticalMap?.id
        };
        
        localStorage.setItem('mapSystemState', JSON.stringify(state));
        console.log("💾 Состояние карт сохранено");
    }

    loadMapState() {
        try {
            const saved = localStorage.getItem('mapSystemState');
            if (!saved) return false;

            const state = JSON.parse(saved);
            
            if (state.playerGlobalPosition) {
                this.playerGlobalPosition = state.playerGlobalPosition;
            }
            if (state.playerLocalPosition) {
                this.playerLocalPosition = state.playerLocalPosition;
            }
            if (state.playerTacticalPosition) {
                this.playerTacticalPosition = state.playerTacticalPosition;
            }
            
            if (state.currentGlobalMapId) {
                this.currentGlobalMap = this.globalMaps.find(map => map.id === state.currentGlobalMapId);
            }
            if (state.currentLocalMapId) {
                this.currentLocalMap = this.localMaps.find(map => map.id === state.currentLocalMapId);
            }
            if (state.currentTacticalMapId) {
                this.currentTacticalMap = this.tacticalMaps.find(map => map.id === state.currentTacticalMapId);
            }
            
            console.log("💾 Состояние карт загружено");
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки состояния карт:", error);
            return false;
        }
    }

    // ========== ДЕБАГ ИНФОРМАЦИЯ ==========
    debugInfo() {
        console.group("🗺️ MapSystem Debug Info");
        console.log("Глобальная позиция:", this.playerGlobalPosition);
        console.log("Локальная позиция:", this.playerLocalPosition);
        console.log("Тактическая позиция:", this.playerTacticalPosition);
        console.log("Текущая глобальная карта:", this.currentGlobalMap?.name);
        console.log("Текущая локальная карта:", this.currentLocalMap?.name);
        console.log("Текущая тактическая карта:", this.currentTacticalMap?.name);
        console.log("Загружено JSON карт:", this.loadedJSONMaps.size);
        console.log("Смещение:", this.mapOffset);
        console.groupEnd();
    }
}

// Регистрируем систему в глобальной области
window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен с новой системой определения соседей");
