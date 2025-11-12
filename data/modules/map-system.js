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
        
        this.currentHero = null;
        this.loadedJSONMaps = new Map();
        this.activeOverlay = null;
        
        // Canvas rendering
        this.canvas = null;
        this.ctx = null;
        this.showGrid = true;
        this.hoveredHex = null;
        this.mapOffset = { x: 0, y: 0 };
        this.lastHoveredHex = null;
        this.animationFrame = null;
        this.pendingMovement = null;
        this.canvasInitialized = false;
        
        // Правильные настройки для гексов
        this.hexSize = 40; // Фиксированный размер гекса
        this.hexWidth = Math.sqrt(3) * this.hexSize;
        this.hexHeight = 2 * this.hexSize;
        
        console.log("✅ MapSystem инициализирован");
    }

    setCurrentHero(hero) {
        this.currentHero = hero;
        console.log(`🎯 Установлен герой для карты: ${hero?.name || 'нет'}`);
    }

    async loadMapData() {
        try {
            console.log("📥 Загружаем данные карт...");
            
            await this.loadJSONMaps();
            
            if (this.tacticalMaps.length === 0) {
                this.createTestMaps();
            }
            
            this.setStartPositions();
            
            console.log(`✅ Карты загружены: Тактических=${this.tacticalMaps.length}`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных карт:", error);
            this.createFallbackMaps();
            return true;
        }
    }

    async loadJSONMaps() {
        try {
            const mapPaths = [
                'data/maps/tactical/tactical-maps.json',
                'data/maps/tactical-maps.json'
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
        if (!mapData || !mapData.meta) return;

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
            return null;
        }

        const cells = jsonMap.game.grid.cells;
        const convertedCells = {};
        
        // ИГНОРИРУЕМ КООРДИНАТЫ ИЗ JSON И СОЗДАЕМ ПРАВИЛЬНУЮ СЕТКУ ГЕКСОВ
        cells.forEach(cell => {
            const key = `${cell.col},${cell.row}`;
            
            // Вычисляем правильные координаты для гексовой сетки
            const hexCoords = this.getHexCoordinates(cell.col, cell.row);
            
            convertedCells[key] = {
                type: cell.type,
                passable: cell.passable,
                visible: cell.visible,
                x: hexCoords.x,
                y: hexCoords.y,
                row: cell.row,
                col: cell.col,
                originalData: cell
            };
        });

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
            cells: convertedCells,
            jsonData: jsonMap,
            renderType: 'hex'
        };
    }

    // ПРАВИЛЬНОЕ ВЫЧИСЛЕНИЕ КООРДИНАТ ГЕКСОВ
    getHexCoordinates(col, row) {
        const x = col * this.hexWidth + (row % 2) * (this.hexWidth / 2);
        const y = row * (this.hexHeight * 0.75);
        return { x, y };
    }

    // ========== CANVAS SYSTEM ==========
    initCanvas() {
        console.log("🎨 Инициализация Canvas...");
        
        const container = document.querySelector('.tactical-map-visual');
        if (!container) {
            console.error("❌ Контейнер .tactical-map-visual не найден!");
            return;
        }
        
        this.createCanvas(container);
    }

    createCanvas(container) {
        console.log("🖌️ Создание Canvas...");
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        // Создаем canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'tacticalMapCanvas';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.background = '#1a1a2e';
        this.canvas.style.cursor = 'pointer';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        
        container.appendChild(this.canvas);

        // Получаем контекст
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error("❌ Не удалось получить контекст Canvas");
            return;
        }

        // Устанавливаем размеры
        this.setCanvasSize();

        console.log(`📐 Canvas создан: ${this.canvas.width}x${this.canvas.height}`);

        // Добавляем обработчики
        this.setupCanvasEventListeners();
        
        this.canvasInitialized = true;
        console.log("✅ Canvas успешно инициализирован");
        
        // Рисуем карту
        this.drawTacticalMap();
    }

    setCanvasSize() {
        const container = document.querySelector('.tactical-map-visual');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        console.log(`📐 Canvas size: ${this.canvas.width}x${this.canvas.height}`);
        
        // Центрируем карту
        this.centerMap();
    }

    centerMap() {
        if (!this.currentTacticalMap) return;

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

        // Добавляем отступы для гексов
        minX -= this.hexSize;
        minY -= this.hexSize;
        maxX += this.hexSize;
        maxY += this.hexSize;

        const mapWidth = maxX - minX;
        const mapHeight = maxY - minY;

        // Вычисляем смещение для центрирования
        const offsetX = (this.canvas.width - mapWidth) / 2 - minX;
        const offsetY = (this.canvas.height - mapHeight) / 2 - minY;

        console.log(`📐 Map bounds: ${mapWidth.toFixed(0)}x${mapHeight.toFixed(0)}`);
        console.log(`📐 Center offset: (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);

        // Применяем смещение ко всем клеткам
        cells.forEach(cell => {
            cell.x += offsetX;
            cell.y += offsetY;
        });

        this.mapOffset.x = offsetX;
        this.mapOffset.y = offsetY;
    }

    setupCanvasEventListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));

        window.addEventListener('resize', () => {
            setTimeout(() => {
                if (this.canvasInitialized && this.canvas) {
                    this.setCanvasSize();
                    this.drawTacticalMap();
                }
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

        // Преобразуем координаты canvas в координаты гексовой сетки
        const hexCoords = this.pixelToHex(canvasX, canvasY);
        const cellKey = `${hexCoords.col},${hexCoords.row}`;
        
        return this.currentTacticalMap.cells[cellKey] || null;
    }

    // ПРЕОБРАЗОВАНИЕ КООРДИНАТ PIXEL -> HEX
    pixelToHex(x, y) {
        // Компенсируем смещение карты
        const mapX = x - this.mapOffset.x;
        const mapY = y - this.mapOffset.y;
        
        // Обратное преобразование для гексовой сетки
        const tempY = mapY / (this.hexHeight * 0.75);
        const tempX = (mapX - (Math.floor(tempY) % 2) * (this.hexWidth / 2)) / this.hexWidth;
        
        const row = Math.round(tempY);
        const col = Math.round(tempX);
        
        return { col, row };
    }

    drawTacticalMap() {
        if (!this.ctx || !this.currentTacticalMap || !this.canvas) {
            console.log("❌ Не могу рисовать: нет контекста или карты");
            return;
        }

        // Очищаем canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Рисуем фон
        this.drawBackground();
        
        // Рисуем гексы
        this.drawHexes();
        
        // Рисуем доступные ходы
        this.drawAvailableMoves();
        
        // Рисуем эффект наведения
        this.drawHoverEffect();
        
        // Рисуем сетку если включена
        if (this.showGrid) {
            this.drawHexGrid();
        }

        console.log("✅ Карта отрисована");
    }

    drawBackground() {
        // Простой градиентный фон
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
        this.ctx.save();
        this.ctx.beginPath();
        
        // Рисуем шестиугольник
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = cell.x + this.hexSize * Math.cos(angle);
            const y = cell.y + this.hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();

        // Цвет заливки в зависимости от типа клетки
        let fillColor = 'rgba(76, 201, 240, 0.3)';
        
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
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
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

    drawHexGrid() {
        const cells = Object.values(this.currentTacticalMap.cells);
        
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.3)';
        this.ctx.lineWidth = 1;
        
        cells.forEach(cell => {
            if (cell.visible) {
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = Math.PI / 3 * i + Math.PI / 6;
                    const x = cell.x + this.hexSize * Math.cos(angle);
                    const y = cell.y + this.hexSize * Math.sin(angle);
                    
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }
                this.ctx.closePath();
                this.ctx.stroke();
            }
        });
        this.ctx.restore();
    }

    drawAvailableMoves() {
        const availableMoves = this.getAvailableMoves();
        
        this.ctx.save();
        availableMoves.forEach(move => {
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i + Math.PI / 6;
                const x = move.cell.x + this.hexSize * Math.cos(angle);
                const y = move.cell.y + this.hexSize * Math.sin(angle);
                
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();

            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
            this.ctx.fill();
            
            this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        });
        this.ctx.restore();
    }

    drawHoverEffect() {
        if (!this.hoveredHex) return;

        this.ctx.save();
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = this.hoveredHex.x + this.hexSize * Math.cos(angle);
            const y = this.hoveredHex.y + this.hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();

        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.restore();
    }

    // ========== MOVEMENT AND COMBAT ==========
    moveOnTacticalMap(x, y) {
        if (!this.currentHero) {
            console.error("❌ Герой не выбран!");
            if (window.game) {
                window.game.showNotification("❌ Герой не выбран!", 'error');
            }
            return;
        }

        if (window.game.systems.battle && window.game.systems.battle.battleActive) {
            console.log("⚔️ Бой уже идет, нельзя перемещаться");
            return;
        }

        if (!this.currentTacticalMap) return;

        const cellKey = `${x},${y}`;
        const cellData = this.currentTacticalMap.cells[cellKey];
        
        if (!cellData) {
            console.log("🚫 Клетка не существует");
            return;
        }

        if (cellData.passable === false) {
            console.log("🚫 Нельзя пройти на эту клетку");
            return;
        }

        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        const isReachable = neighbors.some(neighbor => 
            neighbor.row === y && neighbor.col === x
        );

        if (!isReachable) {
            console.log("🚫 Нельзя переместиться на эту клетку");
            return;
        }

        this.startBattleForMovement(x, y);
    }

    startBattleForMovement(targetX, targetY) {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem || !this.currentHero) return;

        this.pendingMovement = { x: targetX, y: targetY };
        const randomMonster = this.getRandomMonster();
        
        battleSystem.startBattleWithMonster(this.currentHero, randomMonster.id, 'movement');
        console.log(`⚔️ Запуск боя при перемещении на [${targetX}, ${targetY}]`);
    }

    completeMovementAfterBattle(victory) {
        if (!this.pendingMovement) return;

        const targetX = this.pendingMovement.x;
        const targetY = this.pendingMovement.y;
        
        if (!this.currentHero) return;
        
        if (victory) {
            this.playerTacticalPosition = {x: targetX, y: targetY};
            console.log(`✅ Успешное перемещение на: [${targetX}, ${targetY}]`);
        } else {
            const startPosition = this.currentTacticalMap.startPosition;
            this.playerTacticalPosition = {...startPosition};
            console.log(`💀 Возврат на стартовую позицию`);
        }
        
        this.saveMapState();
        this.updateTacticalMapDisplay();
        this.pendingMovement = null;
    }

    getRandomMonster() {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem || !battleSystem.monsters || battleSystem.monsters.length === 0) {
            return {
                id: 1,
                name: "Случайный монстр",
                health: 30,
                maxHealth: 30,
                damage: 5,
                armor: 2,
                reward: 10,
                experience: 5
            };
        }
        
        const randomIndex = Math.floor(Math.random() * battleSystem.monsters.length);
        return battleSystem.monsters[randomIndex];
    }

    getAvailableMoves() {
        if (!this.currentTacticalMap) return [];
        
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        
        return neighbors;
    }

    getHexNeighbors(row, col) {
        if (!this.currentTacticalMap) return [];

        const neighbors = [];
        
        // Соседи в гексовой сетке
        const directions = [
            { dr: 0, dc: 1 },   // right
            { dr: 0, dc: -1 },  // left
            { dr: -1, dc: row % 2 === 0 ? 0 : 1 }, // up-right / up
            { dr: -1, dc: row % 2 === 0 ? -1 : 0 }, // up-left / up
            { dr: 1, dc: row % 2 === 0 ? 0 : 1 },   // down-right / down
            { dr: 1, dc: row % 2 === 0 ? -1 : 0 }   // down-left / down
        ];

        directions.forEach(({ dr, dc }) => {
            const newRow = row + dr;
            const newCol = col + dc;
            const cellKey = `${newCol},${newRow}`;
            const cell = this.currentTacticalMap.cells[cellKey];
            
            if (cell && cell.visible && cell.passable !== false) {
                neighbors.push({
                    row: newRow,
                    col: newCol,
                    cell: cell
                });
            }
        });

        return neighbors;
    }

    // ========== MAP RENDERING ==========
    renderTacticalMap() {
        if (!this.currentTacticalMap) {
            return '<div class="map-error">Тактическая карта не загружена</div>';
        }

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
                            Доступные ходы: <span id="availableMoves">${this.getAvailableMoves().length}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderGlobalMap() {
        return '<div class="map-error">Глобальная карта в разработке</div>';
    }

    renderLocalMap() {
        return '<div class="map-error">Локальная карта в разработке</div>';
    }

    // ========== OVERLAY SYSTEM ==========
    showOverlay(overlayType) {
        if (overlayType === 'tactical-map') {
            console.log("🎲 Показываем тактическую карту...");
            
            // Проверяем необходимые условия
            if (!this.currentHero) {
                console.error("❌ Герой не выбран!");
                if (window.game) {
                    window.game.showNotification("❌ Сначала выберите героя!", 'error');
                }
                return;
            }
            
            if (!this.currentTacticalMap) {
                console.warn("⚠️ Нет текущей тактической карты, пытаемся загрузить...");
                this.loadMapData().then(() => {
                    if (this.currentTacticalMap) {
                        this.showTacticalMapEditor();
                    } else {
                        console.error("❌ Не удалось загрузить карты!");
                        if (window.game) {
                            window.game.showNotification("❌ Не удалось загрузить карты!", 'error');
                        }
                    }
                });
                return;
            }
            
            this.showTacticalMapEditor();
        }
    }

    showTacticalMapEditor() {
        const container = document.getElementById('overlay-container');
        if (!container) {
            console.error("❌ Контейнер оверлея не найден!");
            return;
        }

        this.activeOverlay = 'tactical-map';
        
        container.innerHTML = `
            <div class="overlay-content tactical-map-overlay">
                <div class="overlay-header">
                    <h3>🎲 Тактическая карта</h3>
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
                <div class="overlay-body" style="padding: 0; background: #000;">
                    ${this.renderTacticalMap()}
                </div>
            </div>
        `;
        container.style.display = 'block';
        
        console.log("✅ Оверлей тактической карты создан");
        
        // Даем время DOM обновиться перед инициализацией Canvas
        setTimeout(() => {
            console.log("🕒 Запуск инициализации Canvas...");
            this.initCanvas();
        }, 100);
    }

    hideOverlay() {
        const container = document.getElementById('overlay-container');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
            this.activeOverlay = null;
        }
    }

    // ========== UTILITY METHODS ==========
    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.drawTacticalMap();
    }

    updateTacticalMapDisplay() {
        if (this.canvasInitialized) {
            this.drawTacticalMap();
        }
    }

    forceRedraw() {
        if (this.canvasInitialized) {
            this.drawTacticalMap();
        }
    }

    // ========== ОТЛАДОЧНЫЕ МЕТОДЫ ==========
    checkSystemStatus() {
        return {
            currentHero: !!this.currentHero,
            tacticalMaps: this.tacticalMaps.length,
            currentTacticalMap: !!this.currentTacticalMap,
            canvasInitialized: this.canvasInitialized,
            activeOverlay: this.activeOverlay
        };
    }

    debugInfo() {
        console.log("MapSystem Debug:", {
            tacticalMaps: this.tacticalMaps.length,
            currentMap: this.currentTacticalMap?.name,
            playerPosition: this.playerTacticalPosition,
            canvasInitialized: this.canvasInitialized
        });
    }

    createTestMaps() {
        this.tacticalMaps = [{
            id: 1,
            name: "Тестовая карта",
            width: 6,
            height: 6,
            startPosition: {x: 3, y: 3},
            cells: {}
        }];

        // Создаем правильную гексовую сетку для тестовой карты
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 6; col++) {
                const key = `${col},${row}`;
                const coords = this.getHexCoordinates(col, row);
                this.tacticalMaps[0].cells[key] = {
                    type: 'empty',
                    passable: true,
                    visible: true,
                    x: coords.x,
                    y: coords.y,
                    row: row,
                    col: col
                };
            }
        }

        // Добавляем специальные клетки
        this.tacticalMaps[0].cells["3,3"].type = "start";
        this.tacticalMaps[0].cells["3,2"].type = "exit";
        this.tacticalMaps[0].cells["2,3"].type = "monster";
        this.tacticalMaps[0].cells["4,3"].type = "chest";
        this.tacticalMaps[0].cells["3,4"].type = "npc";
    }

    createFallbackMaps() {
        this.tacticalMaps = [{
            id: 1,
            name: "Фолбэк карта",
            width: 3,
            height: 3,
            startPosition: {x: 1, y: 1},
            cells: {
                "1,1": {
                    type: "start", 
                    passable: true, 
                    row: 1, 
                    col: 1, 
                    visible: true, 
                    x: this.getHexCoordinates(1, 1).x, 
                    y: this.getHexCoordinates(1, 1).y
                }
            }
        }];
    }

    setStartPositions() {
        if (this.tacticalMaps.length > 0) {
            this.currentTacticalMap = this.tacticalMaps[0];
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
        }
    }

    saveMapState() {
        // Сохранение состояния карты
    }
}

// Регистрируем систему
window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен");
