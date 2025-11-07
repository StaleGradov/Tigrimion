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
        
        // Убраны масштабирование и смещение - они вызывают проблемы
        this.mapOffset = { x: 0, y: 0 };
        this.mapScale = 1;
        
        // Оптимизация рендеринга
        this.lastHoveredHex = null;
        this.animationFrame = null;
        
        console.log("✅ MapSystem инициализирован");
    }

    async loadMapData() {
        try {
            console.log("📥 Загружаем данные карт...");
            
            // Сначала создаем тестовые карты
            this.createTestMaps();
            
            // Затем пробуем загрузить JSON
            await this.loadJSONMaps();
            
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
        
        // Устанавливаем размеры - ФИКС: используем фиксированные размеры
        const containerRect = container.getBoundingClientRect();
        this.canvas.width = containerRect.width;
        this.canvas.height = containerRect.height;
        
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.cursor = 'pointer';
        this.canvas.style.background = 'transparent'; // Убираем фон
        
        container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        
        // Отладочная информация
        console.log("🔍 Инициализация карты:");
        console.log("Размер контейнера:", containerRect.width, "x", containerRect.height);
        console.log("Размер canvas:", this.canvas.width, "x", this.canvas.height);
        console.log("Текущая карта:", this.currentTacticalMap);
        
        // Добавляем обработчики событий
        this.setupCanvasEventListeners();
        
        console.log("✅ Canvas инициализирован");
        this.drawTacticalMap();
    }

    setupCanvasEventListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));

        // УБРАНО: масштабирование колесиком
        // this.canvas.addEventListener('wheel', (e) => this.handleCanvasZoom(e));

        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.initCanvas(); // Полная переинициализация при изменении размера
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
            console.log(`🎲 Клик по клетке: [${hex.col}, ${hex.row}]`, hex);
            this.moveOnTacticalMap(hex.col, hex.row);
        } else {
            console.log("❌ Клик вне клетки");
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
        
        // УПРОЩЕННЫЙ АЛГОРИТМ: ищем ближайшую клетку
        let closestCell = null;
        let minDistance = Infinity;

        for (const cell of cells) {
            if (!cell.visible) continue;
            
            const distance = Math.sqrt(
                Math.pow(canvasX - cell.x, 2) + 
                Math.pow(canvasY - cell.y, 2)
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
            console.log("❌ Не могу рисовать: нет контекста или карты");
            return;
        }

        // Очищаем canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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
            // Градиентный фон по умолчанию
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
            // Перерисовываем остальные элементы поверх фона
            this.drawHexes();
            this.drawAvailableMoves();
            this.drawHoverEffect();
            if (this.showGrid) {
                this.drawHexGrid();
            }
        };
        img.onerror = () => {
            console.log("❌ Ошибка загрузки изображения карты");
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

    // ========== ИСПРАВЛЕННАЯ СИСТЕМА СОСЕДЕЙ И ДВИЖЕНИЯ ==========
    getAvailableMoves() {
        if (!this.currentTacticalMap) return [];
        
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        
        console.log(`📍 Текущая позиция: [${currentCol}, ${currentRow}]`);
        console.log(`🎯 Доступные ходы:`, neighbors.map(n => `[${n.col}, ${n.row}]`));
        
        return neighbors;
    }

    getHexNeighbors(row, col) {
        if (!this.currentTacticalMap) return [];
        
        const neighbors = [];
        const isEvenRow = row % 2 === 0;
        
        // ПРАВИЛЬНЫЕ направления для шестиугольной сетки
        const directions = isEvenRow ? [
            // Для ЧЕТНЫХ строк (0, 2, 4...)
            {dr: -1, dc: 0},   // север
            {dr: -1, dc: 1},   // северо-восток  
            {dr: 0, dc: 1},    // восток
            {dr: 1, dc: 0},    // юг
            {dr: 1, dc: 1},    // юго-восток
            {dr: 0, dc: -1}    // запад
        ] : [
            // Для НЕЧЕТНЫХ строк (1, 3, 5...)
            {dr: -1, dc: -1},  // северо-запад
            {dr: -1, dc: 0},   // север
            {dr: 0, dc: 1},    // восток  
            {dr: 1, dc: -1},   // юго-запад
            {dr: 1, dc: 0},    // юг
            {dr: 0, dc: -1}    // запад
        ];
        
        console.log(`🔍 Поиск соседей для [${col},${row}], четная строка: ${isEvenRow}`);
        
        directions.forEach(({dr, dc}) => {
            const newRow = row + dr;
            const newCol = col + dc;
            const cellKey = `${newCol},${newRow}`;
            const neighbor = this.currentTacticalMap.cells[cellKey];
            
            // Проверяем, что клетка существует, видима и проходима
            if (neighbor && neighbor.visible && neighbor.passable !== false) {
                neighbors.push({
                    row: newRow,
                    col: newCol,
                    cell: neighbor
                });
                console.log(`  ✅ Сосед: [${newCol},${newRow}] - ДОСТУПЕН`);
            } else if (neighbor) {
                console.log(`  ❌ Сосед: [${newCol},${newRow}] - НЕДОСТУПЕН`, {
                    exists: !!neighbor,
                    visible: neighbor?.visible,
                    passable: neighbor?.passable
                });
            } else {
                console.log(`  ❌ Сосед: [${newCol},${newRow}] - КЛЕТКА НЕ СУЩЕСТВУЕТ`);
            }
        });
        
        console.log(`🎯 Итог: найдено ${neighbors.length} доступных соседей`);
        return neighbors;
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
        if (!this.currentTacticalMap) {
            console.log("❌ Нет текущей тактической карты");
            return;
        }

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

        // Проверяем, что клетка доступна для хода
        if (!this.isCellReachable(y, x)) {
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
        console.log("🗺️ Создаем тестовые карты...");
        
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
            cells: this.createTestCells()
        }];
        
        console.log("✅ Тестовые карты созданы");
    }

    createTestCells() {
        const cells = {};
        const hexSize = 40;
        
        // Создаем тестовую сетку 6x6 с правильными координатами
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 6; col++) {
                const isEvenRow = row % 2 === 0;
                const x = col * hexSize * 1.5 + (isEvenRow ? 0 : hexSize * 0.75) + 100;
                const y = row * hexSize * Math.sqrt(3) / 2 + 100;
                
                let type = 'active';
                let passable = true;
                
                // Добавляем специальные клетки
                if (row === 3 && col === 3) {
                    type = 'player_start';
                } else if (row === 2 && col === 3) {
                    type = 'exit';
                } else if (row === 3 && col === 2) {
                    type = 'monster';
                    passable = false;
                } else if (row === 3 && col === 4) {
                    type = 'chest';
                } else if (row === 4 && col === 3) {
                    type = 'npc';
                } else if (row === 1 && col === 1) {
                    type = 'obstacle';
                    passable = false;
                }
                
                cells[`${col},${row}`] = {
                    type: type,
                    passable: passable,
                    visible: true,
                    x: x,
                    y: y,
                    row: row,
                    col: col
                };
            }
        }
        
        console.log(`✅ Создано ${Object.keys(cells).length} тестовых клеток`);
        return cells;
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
            cells: this.createTestCells()
        }];
    }

    setStartPositions() {
        console.log("🎯 Устанавливаем стартовые позиции...");
        
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
        
        console.log("✅ Стартовые позиции установлены:");
        console.log("Глобальная:", this.playerGlobalPosition);
        console.log("Локальная:", this.playerLocalPosition);
        console.log("Тактическая:", this.playerTacticalPosition);
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

    // ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ==========
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

    // УБРАНО: zoomIn, zoomOut, resetZoom

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
        console.groupEnd();
    }
}

// Регистрируем систему в глобальной области
window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен с исправленной системой движения");
