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
        this.backgroundImage = null;
        
        // Параметры позиционирования
        this.mapOffset = { x: 0, y: 0 };
        this.mapScale = 1;
        
        // Игровые свойства
        this.availableMoves = [];
        
        // Оптимизация рендеринга
        this.lastHoveredHex = null;
        this.animationFrame = null;
        
        console.log("✅ MapSystem инициализирован");
    }

    async loadMapData() {
        try {
            console.log("📥 Загружаем данные карт...");
            
            // Создаем тестовые карты
            this.createTestMaps();
            
            this.setStartPositions();
            
            console.log(`✅ Карты загружены: Тактических=${this.tacticalMaps.length}`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных карт:", error);
            this.createFallbackMaps();
            return true;
        }
    }

    // ========== НОВАЯ СИСТЕМА ПОИСКА СОСЕДНИХ КЛЕТОК ==========
    getAvailableMoves() {
        if (!this.currentTacticalMap) {
            console.log("❌ Нет текущей тактической карты");
            return [];
        }
        
        const currentCol = this.playerTacticalPosition.x;
        const currentRow = this.playerTacticalPosition.y;
        
        console.log(`📍 Текущая позиция: [${currentCol}, ${currentRow}]`);
        
        // Используем метод поиска по расстоянию
        const neighbors = this.getNeighborsByDistance(currentCol, currentRow);
        console.log(`🎯 Найдено доступных ходов: ${neighbors.length}`);
        
        return neighbors;
    }

    getNeighborsByDistance(col, row) {
        if (!this.currentTacticalMap) return [];
        
        const neighbors = [];
        const playerCell = this.currentTacticalMap.cells[`${col},${row}`];
        
        if (!playerCell) {
            console.log(`❌ Клетка игрока [${col},${row}] не найдена`);
            return [];
        }
        
        const maxDistance = (this.currentTacticalMap.cellSize || 40) * 1.5;
        
        console.log(`🔍 Поиск соседей для [${col},${row}], максимальное расстояние: ${maxDistance}`);
        
        Object.values(this.currentTacticalMap.cells).forEach(cell => {
            // Пропускаем текущую клетку игрока
            if (cell.col === col && cell.row === row) return;
            
            const distance = Math.sqrt(
                Math.pow(cell.x - playerCell.x, 2) + 
                Math.pow(cell.y - playerCell.y, 2)
            );
            
            if (distance <= maxDistance) {
                console.log(`  📏 Клетка [${cell.col},${cell.row}] - расстояние: ${distance.toFixed(1)}`);
                
                if (cell.visible && cell.passable !== false) {
                    neighbors.push({
                        row: cell.row,
                        col: cell.col,
                        cell: cell,
                        distance: distance
                    });
                    console.log(`  ✅ [${cell.col},${cell.row}] - ДОСТУПЕН`);
                } else {
                    console.log(`  ❌ [${cell.col},${cell.row}] - НЕДОСТУПЕН (visible: ${cell.visible}, passable: ${cell.passable})`);
                }
            }
        });
        
        return neighbors;
    }

    // ========== CANVAS РЕНДЕРИНГ ==========
    initCanvas() {
        console.log("🎨 Инициализация Canvas...");
        
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
        
        // Сбрасываем фоновое изображение
        this.backgroundImage = null;
        
        // Рассчитываем масштаб и позиционирование
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

        const cells = Object.values(this.currentTacticalMap.cells);
        if (cells.length === 0) return;

        // Находим границы карты
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        cells.forEach(cell => {
            minX = Math.min(minX, cell.x);
            minY = Math.min(minY, cell.y);
            maxX = Math.max(maxX, cell.x);
            maxY = Math.max(maxY, cell.y);
        });

        const hexSize = this.currentTacticalMap.cellSize || 40;
        const padding = hexSize;

        const mapWidth = maxX - minX + hexSize * 2;
        const mapHeight = maxY - minY + hexSize * 2;

        // Рассчитываем масштаб
        const scaleX = (rect.width - padding * 2) / mapWidth;
        const scaleY = (rect.height - padding * 2) / mapHeight;
        this.mapScale = Math.min(scaleX, scaleY, 1);

        // Центрируем карту
        this.mapOffset.x = (rect.width - mapWidth * this.mapScale) / 2 - minX * this.mapScale;
        this.mapOffset.y = (rect.height - mapHeight * this.mapScale) / 2 - minY * this.mapScale;

        console.log(`📐 Позиционирование: scale=${this.mapScale}, offset=(${this.mapOffset.x}, ${this.mapOffset.y})`);
    }

    setupCanvasEventListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));

        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.calculateMapPositioning();
                this.drawTacticalMap();
            }, 100);
        });
    }

    handleCanvasClick(e) {
        if (!this.currentTacticalMap) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = this.getHexAtCanvasPosition(x, y);
        if (hex) {
            console.log(`🎲 Клик по клетке: [${hex.col}, ${hex.row}]`);
            
            // Проверяем доступность клетки
            const isAvailable = this.availableMoves.some(move => 
                move.col === hex.col && move.row === hex.row
            );
            
            if (isAvailable) {
                this.moveOnTacticalMap(hex.col, hex.row);
            } else {
                console.log(`🚫 Клетка [${hex.col}, ${hex.row}] недоступна`);
                if (window.game) {
                    window.game.showNotification("Нельзя переместиться на эту клетку!", 'error');
                }
            }
        }
    }

    handleCanvasHover(e) {
        if (!this.currentTacticalMap) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = this.getHexAtCanvasPosition(x, y);
        
        if (this.lastHoveredHex !== hex) {
            this.lastHoveredHex = hex;
            this.hoveredHex = hex;
            
            // Обновляем курсор
            if (hex && this.availableMoves.some(move => move.col === hex.col && move.row === hex.row)) {
                this.canvas.style.cursor = 'pointer';
            } else {
                this.canvas.style.cursor = 'default';
            }
            
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
        const hexSize = (this.currentTacticalMap.cellSize || 40) * this.mapScale;
        
        const mapX = (canvasX - this.mapOffset.x) / this.mapScale;
        const mapY = (canvasY - this.mapOffset.y) / this.mapScale;

        // Ищем ближайшую клетку
        let closestCell = null;
        let minDistance = Infinity;

        for (const cell of cells) {
            const distance = Math.sqrt(
                Math.pow(mapX - cell.x, 2) + 
                Math.pow(mapY - cell.y, 2)
            );
            
            if (distance < minDistance && distance <= hexSize * 0.8) {
                minDistance = distance;
                closestCell = cell;
            }
        }

        return closestCell;
    }

    drawTacticalMap() {
        if (!this.ctx || !this.currentTacticalMap) {
            console.log("❌ Не могу отрисовать карту: нет контекста или карты");
            return;
        }

        const canvas = this.canvas;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.ctx.save();
        this.ctx.translate(this.mapOffset.x, this.mapOffset.y);
        this.ctx.scale(this.mapScale, this.mapScale);

        // Рисуем фон
        this.drawBackground();

        // Рисуем клетки
        this.drawHexes();

        // Рисуем доступные ходы
        this.drawAvailableMoves();

        // Рисуем подсветку при наведении
        this.drawHoverEffect();

        // Рисуем сетку
        if (this.showGrid) {
            this.drawHexGrid();
        }

        this.ctx.restore();
    }

    drawBackground() {
        const map = this.currentTacticalMap;
        
        // Всегда рисуем градиентный фон для надежности
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

        const gradient = this.ctx.createLinearGradient(minX, minY, maxX, maxY);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(minX, minY, width, height);
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
        this.ctx.save();
        
        this.availableMoves.forEach(move => {
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

    // ========== ДВИЖЕНИЕ ==========
    moveOnTacticalMap(x, y) {
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

        if (cellData.passable === false) {
            console.log("🚫 Нельзя пройти на эту клетку");
            if (window.game) {
                window.game.showNotification("Нельзя пройти на эту клетку!", 'error');
            }
            return;
        }

        // Проверяем доступность
        const isReachable = this.availableMoves.some(move => 
            move.col === x && move.row === y
        );
        
        if (!isReachable) {
            console.log("🚫 Нельзя переместиться на эту клетку");
            if (window.game) {
                window.game.showNotification("Нельзя переместиться на эту клетку!", 'error');
            }
            return;
        }

        // Перемещаем игрока
        const oldPosition = {...this.playerTacticalPosition};
        this.playerTacticalPosition = {x, y};
        
        console.log(`✅ Успешное перемещение с [${oldPosition.x}, ${oldPosition.y}] на: [${x}, ${y}]`);
        
        // Взаимодействие с объектом
        if (cellData.type !== 'active' && cellData.type !== 'empty' && cellData.type !== 'player_start') {
            this.interactWithTacticalCell(x, y);
        }
        
        this.updateTacticalMapDisplay();
        
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

    // ========== ТЕСТОВЫЕ КАРТЫ ==========
    createTestMaps() {
        this.tacticalMaps = [{
            id: 1,
            name: "Тестовая карта",
            image: "",
            width: 5,
            height: 5,
            startPosition: {x: 2, y: 2},
            localPosition: {x: 0, y: 0},
            description: "Тестовая карта для отладки",
            cellSize: 40,
            cells: {
                "2,2": {type: "player_start", passable: true, row: 2, col: 2, visible: true, x: 200, y: 200},
                "1,2": {type: "active", passable: true, row: 2, col: 1, visible: true, x: 150, y: 200},
                "3,2": {type: "active", passable: true, row: 2, col: 3, visible: true, x: 250, y: 200},
                "2,1": {type: "active", passable: true, row: 1, col: 2, visible: true, x: 200, y: 150},
                "2,3": {type: "active", passable: true, row: 3, col: 2, visible: true, x: 200, y: 250},
                "1,1": {type: "chest", passable: true, row: 1, col: 1, visible: true, x: 150, y: 150},
                "3,3": {type: "monster", passable: false, row: 3, col: 3, visible: true, x: 250, y: 250},
                "1,3": {type: "active", passable: true, row: 3, col: 1, visible: true, x: 150, y: 250},
                "3,1": {type: "active", passable: true, row: 1, col: 3, visible: true, x: 250, y: 150}
            }
        }];

        console.log("✅ Создана тестовая карта с 9 клетками");
    }

    createFallbackMaps() {
        this.tacticalMaps = [{
            id: 1,
            name: "Запасная карта",
            image: "",
            width: 3,
            height: 3,
            startPosition: {x: 1, y: 1},
            localPosition: {x: 0, y: 0},
            cellSize: 40,
            cells: {
                "1,1": {type: "player_start", passable: true, row: 1, col: 1, visible: true, x: 100, y: 100},
                "0,1": {type: "active", passable: true, row: 1, col: 0, visible: true, x: 50, y: 100},
                "2,1": {type: "active", passable: true, row: 1, col: 2, visible: true, x: 150, y: 100},
                "1,0": {type: "active", passable: true, row: 0, col: 1, visible: true, x: 100, y: 50},
                "1,2": {type: "active", passable: true, row: 2, col: 1, visible: true, x: 100, y: 150}
            }
        }];
    }

    setStartPositions() {
        if (this.tacticalMaps.length > 0) {
            this.currentTacticalMap = this.tacticalMaps[0];
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
            console.log(`🎯 Установлена стартовая позиция: [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]`);
        }
        
        // Обновляем доступные ходы
        this.availableMoves = this.getAvailableMoves();
    }

    // ========== ИНТЕРФЕЙС И ОВЕРЛЕИ ==========
    renderTacticalMap() {
        if (!this.currentTacticalMap) {
            return '<div class="map-error">Тактическая карта не загружена</div>';
        }

        return `
            <div class="map-container tactical-map tigrimion-tactical-map">
                <div class="tactical-map-header">
                    <h4>${this.currentTacticalMap.name}</h4>
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
                        <div class="movement-info">
                            Доступные ходы: <span id="availableMoves">${this.availableMoves.length}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showTacticalMap() {
        console.log("🗺️ Открываем тактическую карту...");
        
        const container = document.getElementById('overlay-container');
        if (!container) {
            console.log("❌ Контейнер оверлея не найден");
            return;
        }

        this.activeOverlay = 'tactical-map';
        
        container.innerHTML = `
            <div class="overlay-content tactical-map-overlay">
                <div class="overlay-header">
                    <h3>🎲 Тактическая карта</h3>
                    <button class="btn-close" onclick="game.systems.map.hideTacticalMap()">✕</button>
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
        }, 50);
    }

    hideTacticalMap() {
        console.log("🗺️ Закрываем тактическую карту...");
        
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

    updateTacticalMapDisplay() {
        // Обновляем доступные ходы
        this.availableMoves = this.getAvailableMoves();
        this.drawTacticalMap();
    }

    debugInfo() {
        console.group("🗺️ MapSystem Debug Info");
        console.log("Текущая карта:", this.currentTacticalMap?.name);
        console.log("Позиция игрока:", this.playerTacticalPosition);
        console.log("Доступные ходы:", this.availableMoves.length);
        console.log("Все клетки:", Object.keys(this.currentTacticalMap?.cells || {}));
        console.groupEnd();
    }

    // Метод для тестирования из консоли
    testMovement() {
        console.log("🧪 Тестирование движения...");
        this.debugInfo();
    }
}

// Регистрируем систему
window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен");

// Добавляем глобальную функцию для тестирования
window.testMapSystem = function() {
    if (window.game && window.game.systems.map) {
        window.game.systems.map.testMovement();
    } else {
        console.log("❌ MapSystem не доступен");
    }
};
