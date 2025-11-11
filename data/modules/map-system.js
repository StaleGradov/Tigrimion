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
            renderType: 'hex',
            cellSize: jsonMap.game.grid.cellSize || 40
        };
    }

    // ========== CANVAS SYSTEM ==========
 initCanvas() {
    console.log("🎨 Инициализация Canvas...");
    
    const container = document.querySelector('.tactical-map-visual');
    if (!container) {
        console.error("❌ Контейнер .tactical-map-visual не найден!");
        // Попробуем найти другой контейнер
        const altContainer = document.getElementById('tacticalMapVisual');
        if (altContainer) {
            console.log("✅ Найден контейнер по ID");
            this.createCanvas(altContainer);
        }
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
    this.canvas.style.background = '#ff0000'; // Красный для отладки
    this.canvas.style.border = '3px solid yellow';
    
    container.appendChild(this.canvas);

    // Получаем контекст
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
        console.error("❌ Не удалось получить контекст Canvas");
        return;
    }

    // Устанавливаем размеры
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    console.log(`📐 Canvas создан: ${this.canvas.width}x${this.canvas.height}`, {
        containerRect: rect,
        canvasStyle: {
            width: this.canvas.style.width,
            height: this.canvas.style.height
        }
    });

    // Добавляем обработчики
    this.setupCanvasEventListeners();
    
    this.canvasInitialized = true;
    console.log("✅ Canvas успешно инициализирован");
    
    // Рисуем тестовый квадрат
    this.drawTestPattern();
}

drawTestPattern() {
    if (!this.ctx || !this.canvas) return;
    
    // Очищаем
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Рисуем тестовый узор
    this.ctx.fillStyle = '#00ff00';
    this.ctx.fillRect(10, 10, 100, 100);
    
    this.ctx.fillStyle = '#0000ff';
    this.ctx.fillRect(this.canvas.width - 110, 10, 100, 100);
    
    this.ctx.fillStyle = '#ffff00';
    this.ctx.fillRect(10, this.canvas.height - 110, 100, 100);
    
    this.ctx.fillStyle = '#ff00ff';
    this.ctx.fillRect(this.canvas.width - 110, this.canvas.height - 110, 100, 100);
    
    // Текст по центру
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('CANVAS WORKS!', this.canvas.width / 2, this.canvas.height / 2);
    
    console.log("✅ Тестовый узор нарисован");
}
    setupCanvasEventListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));

        window.addEventListener('resize', () => {
            setTimeout(() => {
                if (this.canvasInitialized && this.canvas) {
                    const container = document.querySelector('.tactical-map-visual');
                    if (container) {
                        const rect = container.getBoundingClientRect();
                        this.canvas.width = rect.width;
                        this.canvas.height = rect.height;
                        this.drawTacticalMap();
                    }
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

        const cells = Object.values(this.currentTacticalMap.cells);
        const hexSize = 40; // Базовый размер для расчетов
        
        for (const cell of cells) {
            // Используем реальные координаты из данных карты
            const distance = Math.sqrt(
                Math.pow(canvasX - cell.x, 2) + 
                Math.pow(canvasY - cell.y, 2)
            );
            
            if (distance <= hexSize * 0.8) {
                return cell;
            }
        }
        
        return null;
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
        const hexSize = 40;
        
        cells.forEach(cell => {
            if (cell.visible) {
                this.drawSingleHex(cell, hexSize);
                this.drawHexContent(cell, hexSize);
            }
        });
    }

    drawSingleHex(cell, hexSize) {
        this.ctx.save();
        this.ctx.beginPath();
        
        // Рисуем шестиугольник
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = cell.x + hexSize * Math.cos(angle);
            const y = cell.y + hexSize * Math.sin(angle);
            
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

    drawHexContent(cell, hexSize) {
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
        const hexSize = 40;
        
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.3)';
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

    drawAvailableMoves() {
        const availableMoves = this.getAvailableMoves();
        const hexSize = 40;
        
        this.ctx.save();
        availableMoves.forEach(move => {
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i + Math.PI / 6;
                const x = move.cell.x + hexSize * Math.cos(angle);
                const y = move.cell.y + hexSize * Math.sin(angle);
                
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

        const hexSize = 40;
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

    getHexNeighbors(currentRow, currentCol) {
        if (!this.currentTacticalMap) return [];
        
        const neighbors = [];
        const currentCell = this.currentTacticalMap.cells[`${currentCol},${currentRow}`];
        
        if (!currentCell) return [];
        
        const hexSize = 40;
        const geometry = this.getHexGeometry(hexSize);
        
        Object.values(this.currentTacticalMap.cells).forEach(potentialNeighbor => {
            if (potentialNeighbor.col === currentCol && potentialNeighbor.row === currentRow) {
                return;
            }
            
            const dx = potentialNeighbor.x - currentCell.x;
            const dy = potentialNeighbor.y - currentCell.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const isAdjacent = this.areHexesAdjacent(currentCell, potentialNeighbor, hexSize);
            
            if (isAdjacent && potentialNeighbor.visible && potentialNeighbor.passable !== false) {
                neighbors.push({
                    row: potentialNeighbor.row,
                    col: potentialNeighbor.col,
                    cell: potentialNeighbor,
                    distance: distance
                });
            }
        });
        
        return neighbors;
    }

    getHexGeometry(hexSize) {
        return {
            size: hexSize,
            horizontalDistance: Math.sqrt(3) * hexSize,
            verticalDistance: 1.5 * hexSize,
            tolerance: hexSize * 0.8
        };
    }

    areHexesAdjacent(cell1, cell2, hexSize) {
        if (!cell1 || !cell2) return false;
        
        const geometry = this.getHexGeometry(hexSize);
        const dx = cell2.x - cell1.x;
        const dy = cell2.y - cell1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const isHorizontalAdjacent = Math.abs(distance - geometry.horizontalDistance) < geometry.tolerance;
        const isVerticalAdjacent = Math.abs(distance - geometry.verticalDistance) < geometry.tolerance;
        
        return isHorizontalAdjacent || isVerticalAdjacent;
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
                    <div class="tactical-map-visual" id="tacticalMapVisual" 
                         style="height: 600px; min-height: 600px; background: #1a1a2e; border: 2px solid #00ffff; border-radius: 10px; position: relative;">
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #00ffff; font-size: 16px;">
                            Загрузка тактической карты...
                        </div>
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
        // ========== OVERLAY SYSTEM ==========
    showOverlay(overlayType) {
        if (overlayType === 'tactical-map') {
            const container = document.getElementById('overlay-container');
            if (!container) {
                console.error("❌ Контейнер оверлея не найден!");
                return;
            }

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
            
            console.log("✅ Оверлей тактической карты создан");
            
            // Инициализируем Canvas после добавления в DOM с небольшой задержкой
            setTimeout(() => {
                console.log("🕒 Запуск инициализации Canvas...");
                this.initCanvas();
                
                // Если через 2 секунды canvas не создан, пробуем принудительно
                setTimeout(() => {
                    if (!this.canvasInitialized) {
                        console.warn("⚠️ Canvas не инициализирован, пробуем принудительно...");
                        this.forceCanvasInit();
                    }
                }, 2000);
            }, 100);
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

    showTacticalMapEditor() {
        if (!this.currentHero) {
            console.error("❌ Герой не выбран!");
            if (window.game) {
                window.game.showNotification("❌ Сначала выберите героя!", 'error');
            }
            return;
        }
        
        this.showOverlay('tactical-map');
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

    createTestMaps() {
        this.tacticalMaps = [{
            id: 1,
            name: "Тестовая карта",
            width: 6,
            height: 6,
            startPosition: {x: 3, y: 3},
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
        this.tacticalMaps = [{
            id: 1,
            name: "Фолбэк карта",
            width: 3,
            height: 3,
            startPosition: {x: 1, y: 1},
            cells: {
                "1,1": {type: "start", passable: true, row: 1, col: 1, visible: true, x: 200, y: 200}
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

    debugInfo() {
        console.log("MapSystem Debug:", {
            tacticalMaps: this.tacticalMaps.length,
            currentMap: this.currentTacticalMap?.name,
            playerPosition: this.playerTacticalPosition,
            canvasInitialized: this.canvasInitialized
        });
    }
}

// Регистрируем систему
window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен");
