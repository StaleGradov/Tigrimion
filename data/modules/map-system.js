"use strict";

// ========== MODULE: MapSystem with Built-in Editor ==========
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
        
        // Canvas rendering
        this.canvas = null;
        this.ctx = null;
        this.hexSize = 40;
        this.showGrid = true;
        this.hoveredHex = null;
        
        // Map positioning
        this.mapOffset = { x: 0, y: 0 };
        this.mapScale = 1;
        
        // Optimization
        this.lastHoveredHex = null;
        this.animationFrame = null;
        
        // Editor system
        this.editor = new MapEditor(this);
        
        console.log("✅ MapSystem инициализирован со встроенным редактором");
    }

    // ========== EDITOR INTEGRATION ==========
    showTacticalMapEditor() {
        this.showOverlay('tactical-map-editor');
    }

    // ========== MAIN METHODS ==========
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
                'data/maps/tactical/',
                'data/maps/tactical-maps.json',
                'maps/tactical-maps.json', 
                'data/tactical-maps.json',
                'tactical-maps.json'
            ];
            
            // Пробуем загрузить отдельные файлы карт
            const individualMaps = await this.loadIndividualMaps();
            if (individualMaps.length > 0) {
                this.tacticalMaps.push(...individualMaps);
                console.log(`✅ Загружено ${individualMaps.length} отдельных карт`);
                return;
            }
            
            // Если отдельных карт нет, пробуем загрузить из единого файла
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

    async loadIndividualMaps() {
        try {
            // Получаем список всех JSON файлов в папке tactical
            const response = await fetch('data/maps/tactical/');
            if (!response.ok) return [];
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const links = doc.querySelectorAll('a[href$=".json"]');
            
            const maps = [];
            
            for (const link of links) {
                try {
                    const mapPath = `data/maps/tactical/${link.getAttribute('href')}`;
                    const mapResponse = await fetch(mapPath);
                    if (mapResponse.ok) {
                        const mapData = await mapResponse.json();
                        const tacticalMap = this.convertToTacticalMap(mapData);
                        if (tacticalMap) {
                            maps.push(tacticalMap);
                            console.log(`✅ Загружена карта: ${tacticalMap.name}`);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Ошибка загрузки карты ${link.getAttribute('href')}:`, error);
                }
            }
            
            return maps;
        } catch (error) {
            console.log("❌ Не удалось загрузить отдельные карты:", error);
            return [];
        }
    }

    convertToTacticalMap(mapData) {
        if (!mapData || !mapData.name) return null;
        
        return {
            id: mapData.id || `map_${Date.now()}`,
            name: mapData.name,
            description: mapData.description || "Создана в редакторе",
            image: mapData.image || "",
            width: mapData.width || 20,
            height: mapData.height || 20,
            startPosition: mapData.startPosition || {x: 0, y: 0},
            cells: mapData.cells || {},
            gameData: mapData.gameData,
            cellSize: mapData.cellSize || 40,
            renderType: 'hex'
        };
    }

    async processTigrimionJSONMaps(mapData) {
        if (Array.isArray(mapData)) {
            // Если это массив карт
            for (const map of mapData) {
                const tacticalMap = this.convertTigrimionJSONToMap(map);
                if (tacticalMap) {
                    this.tacticalMaps.push(tacticalMap);
                    this.loadedJSONMaps.set(tacticalMap.id, tacticalMap);
                }
            }
        } else if (mapData.meta) {
            // Если это одна карта в формате редактора
            const tacticalMap = this.convertTigrimionJSONToMap(mapData);
            if (tacticalMap) {
                this.tacticalMaps.push(tacticalMap);
                this.loadedJSONMaps.set(tacticalMap.id, tacticalMap);
            }
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

        // Find start position
        let startPosition = {x: 0, y: 0};
        const startCell = cells.find(cell => cell.type === 'player_start');
        if (startCell) {
            startPosition = {x: startCell.col, y: startCell.row};
        }

        return {
            id: jsonMap.meta?.name?.replace(/\s+/g, '_') || `map_${Date.now()}`,
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

    // ========== CANVAS RENDERING ==========
    initCanvas() {
        const container = document.querySelector('.tactical-map-visual');
        if (!container) {
            console.log("❌ Контейнер для карты не найден");
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'tacticalMapCanvas';
        
        // Set dimensions
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.cursor = 'pointer';
        container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        
        // Calculate positioning
        this.calculateMapPositioning();
        
        // Add event listeners
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

        // Find map boundaries
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        cells.forEach(cell => {
            minX = Math.min(minX, cell.x);
            minY = Math.min(minY, cell.y);
            maxX = Math.max(maxX, cell.x);
            maxY = Math.max(maxY, cell.y);
        });

        // Add padding
        const hexSize = this.currentTacticalMap.cellSize || 40;
        const padding = hexSize * 2;

        const mapWidth = maxX - minX + hexSize * 2;
        const mapHeight = maxY - minY + hexSize * 2;

        // Calculate scale to fit container
        const scaleX = (rect.width - padding * 2) / mapWidth;
        const scaleY = (rect.height - padding * 2) / mapHeight;
        this.mapScale = Math.min(scaleX, scaleY, 1);

        // Center the map
        this.mapOffset.x = (rect.width - mapWidth * this.mapScale) / 2 - minX * this.mapScale;
        this.mapOffset.y = (rect.height - mapHeight * this.mapScale) / 2 - minY * this.mapScale;

        console.log(`📐 Позиционирование: scale=${this.mapScale}, offset=(${this.mapOffset.x}, ${this.mapOffset.y})`);
    }

    setupCanvasEventListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
        this.canvas.addEventListener('wheel', (e) => this.handleCanvasZoom(e));

        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.calculateMapPositioning();
                this.drawTacticalMap();
            }, 100);
        });
    }

    handleCanvasZoom(e) {
        e.preventDefault();
        
        const zoomIntensity = 0.1;
        const wheel = e.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(wheel * zoomIntensity);
        
        this.mapScale = Math.max(0.3, Math.min(2, this.mapScale * zoom));
        this.drawTacticalMap();
        this.updateZoomDisplay();
    }

    handleCanvasClick(e) {
        if (!this.currentTacticalMap) return;

        // If editor is active, let it handle the click
        if (this.editor.isEditing) {
            this.editor.handleEditorClick(e);
            return;
        }

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

        // If editor is active, let it handle the hover
        if (this.editor.isEditing) {
            this.editor.handleEditorHover(e);
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = this.getHexAtCanvasPosition(x, y);
        
        // Optimization: redraw only if hex changed
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
        const hexSize = (this.currentTacticalMap.cellSize || 40) * this.mapScale;
        
        // Convert canvas coordinates to map coordinates
        const mapX = (canvasX - this.mapOffset.x) / this.mapScale;
        const mapY = (canvasY - this.mapOffset.y) / this.mapScale;

        for (const cell of cells) {
            const distance = Math.sqrt(
                Math.pow(mapX - cell.x, 2) + 
                Math.pow(mapY - cell.y, 2)
            );
            
            if (distance <= hexSize * 0.6) {
                return cell;
            }
        }
        return null;
    }

    drawTacticalMap() {
        if (!this.ctx || !this.currentTacticalMap) return;

        const canvas = this.canvas;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Save context for transformations
        this.ctx.save();
        
        // Apply scale and offset
        this.ctx.translate(this.mapOffset.x, this.mapOffset.y);
        this.ctx.scale(this.mapScale, this.mapScale);

        // Draw background
        this.drawBackground();

        // Draw cells
        this.drawHexes();

        // Draw available moves (only in game mode)
        if (!this.editor.isEditing) {
            this.drawAvailableMoves();
        }

        // Draw hover effect
        this.drawHoverEffect();

        // Draw grid on top of everything
        if (this.showGrid) {
            this.drawHexGrid();
        }

        this.ctx.restore();
    }

    drawBackground() {
        const map = this.currentTacticalMap;
        if (!map.image) {
            return;
        }

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
            // Redraw other elements
            this.drawHexes();
            if (!this.editor.isEditing) {
                this.drawAvailableMoves();
            }
            this.drawHoverEffect();
            if (this.showGrid) {
                this.drawHexGrid();
            }
        };
        img.onerror = () => {
            console.log("❌ Ошибка загрузки изображения карты");
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

        // Fill colors
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
        } else if (cell.type === 'inactive') {
            fillColor = 'rgba(239, 68, 68, 0.3)';
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
                case 'inactive':
                    symbol = '❌';
                    color = '#ef4444';
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

    // ========== MOVEMENT SYSTEM ==========
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
        const isEvenRow = currentRow % 2 === 0;
        
        const directions = isEvenRow ? [
            {dr: -1, dc: 0},   // north
            {dr: -1, dc: 1},   // northeast
            {dr: 0, dc: 1},    // east
            {dr: 1, dc: 0},    // south
            {dr: 1, dc: -1},   // southwest
            {dr: 0, dc: -1}    // west
        ] : [
            {dr: -1, dc: -1},  // northwest
            {dr: -1, dc: 0},   // north
            {dr: 0, dc: 1},    // east
            {dr: 1, dc: 0},    // south
            {dr: 1, dc: 1},    // southeast
            {dr: 0, dc: -1}    // west
        ];
        
        directions.forEach(({dr, dc}) => {
            const newRow = currentRow + dr;
            const newCol = currentCol + dc;
            const cellKey = `${newCol},${newRow}`;
            const neighbor = this.currentTacticalMap.cells[cellKey];
            
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

    isCellReachable(targetRow, targetCol) {
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        
        if (targetRow === currentRow && targetCol === currentCol) {
            return false;
        }
        
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        return neighbors.some(neighbor => 
            neighbor.row === targetRow && neighbor.col === targetCol
        );
    }

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

        if (!this.isCellReachable(y, x)) {
            console.log("🚫 Нельзя переместиться на эту клетку - она недоступна");
            if (window.game) {
                window.game.showNotification("Нельзя переместиться на эту клетку!", 'error');
            }
            return;
        }

        const oldPosition = {...this.playerTacticalPosition};
        this.playerTacticalPosition = {x, y};
        
        console.log(`✅ Успешное перемещение с [${oldPosition.x}, ${oldPosition.y}] на: [${x}, ${y}]`);
        
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

    // ========== MAP MANAGEMENT ==========
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

    // ========== OVERLAY SYSTEM ==========
    showOverlay(overlayType) {
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

            case 'tactical-map':
                container.innerHTML = `
                    <div class="overlay-content map-overlay">
                        <div class="overlay-header">
                            <h3>🎲 Тактическая карта</h3>
                            <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                        </div>
                        <div class="overlay-body">
                            ${this.renderTacticalMap()}
                        </div>
                    </div>
                `;
                break;

            case 'tactical-map-editor':
                this.editor.showEditorUI();
                break;
        }

        container.style.display = 'block';
    }

    hideOverlay() {
        const container = document.getElementById('overlay-container');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
            this.activeOverlay = null;
            this.hoveredHex = null;
            this.lastHoveredHex = null;
            
            // Exit editor mode when closing overlay
            if (this.editor.isEditing) {
                this.editor.toggleEditor();
            }
            
            // Cancel animation
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
        }
    }

    // ========== RENDERING METHODS ==========
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

        const scalePercent = Math.round(this.mapScale * 100);
        
        return `
            <div class="map-container tactical-map">
                <div class="tactical-map-header">
                    <h4>${this.currentTacticalMap.name}</h4>
                    <div class="map-controls">
                        <div class="zoom-controls">
                            <button class="zoom-btn" onclick="game.systems.map.zoomOut()">-</button>
                            <span class="zoom-display">${scalePercent}%</span>
                            <button class="zoom-btn" onclick="game.systems.map.zoomIn()">+</button>
                        </div>
                        <button class="btn-secondary" onclick="game.systems.map.toggleGrid()">
                            ${this.showGrid ? '🔲 Сетка' : '🔳 Сетка'}
                        </button>
                        <button class="btn-secondary" onclick="game.systems.map.resetZoom()">
                            🔄 Сброс
                        </button>
                        <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                    </div>
                </div>
                
                <div class="tactical-map-content">
                    <div class="tactical-map-visual">
                        <!-- Canvas будет добавлен автоматически -->
                    </div>
                    
                    <div class="position-info">
                        <div class="player-position">
                            Позиция: [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]
                        </div>
                        <div class="map-stats">
                            Размер: ${this.currentTacticalMap.width} × ${this.currentTacticalMap.height} | Клеток: ${Object.keys(this.currentTacticalMap.cells).length}
                        </div>
                        <div class="movement-info">
                            Доступные ходы: <span id="availableMoves">${this.getAvailableMoves().length}</span>
                        </div>
                        <div class="zoom-info">
                            Масштаб: ${scalePercent}% | Используйте колесо мыши для zoom
                        </div>
                    </div>
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

    // ========== MOVEMENT METHODS ==========
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

    // ========== UI UPDATES ==========
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

    updateZoomDisplay() {
        const zoomDisplay = document.querySelector('.zoom-display');
        if (zoomDisplay) {
            zoomDisplay.textContent = Math.round(this.mapScale * 100) + '%';
        }
    }

    // ========== CONTROLS ==========
    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.drawTacticalMap();
    }

    zoomIn() {
        this.mapScale = Math.min(2, this.mapScale * 1.2);
        this.drawTacticalMap();
        this.updateZoomDisplay();
    }

    zoomOut() {
        this.mapScale = Math.max(0.3, this.mapScale / 1.2);
        this.drawTacticalMap();
        this.updateZoomDisplay();
    }

    resetZoom() {
        this.calculateMapPositioning();
        this.drawTacticalMap();
        this.updateZoomDisplay();
    }

    // ========== SAVE/LOAD SYSTEM ==========
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

    // ========== DEBUG INFO ==========
    debugInfo() {
        console.group("🗺️ MapSystem Debug Info");
        console.log("Глобальная позиция:", this.playerGlobalPosition);
        console.log("Локальная позиция:", this.playerLocalPosition);
        console.log("Тактическая позиция:", this.playerTacticalPosition);
        console.log("Текущая глобальная карта:", this.currentGlobalMap?.name);
        console.log("Текущая локальная карта:", this.currentLocalMap?.name);
        console.log("Текущая тактическая карта:", this.currentTacticalMap?.name);
        console.log("Загружено JSON карт:", this.loadedJSONMaps.size);
        console.log("Масштаб:", this.mapScale);
        console.log("Смещение:", this.mapOffset);
        console.log("Режим редактора:", this.editor.isEditing);
        console.groupEnd();
    }
}

// ========== BUILT-IN MAP EDITOR ==========
class MapEditor {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        this.isEditing = false;
        this.currentTool = 'terrain';
        this.selectedCellType = 'active';
        this.currentProject = null;
        
        this.tools = {
            terrain: ['active', 'inactive'],
            objects: ['player_start', 'monster', 'chest', 'npc', 'exit', 'obstacle']
        };
    }

    toggleEditor() {
        this.isEditing = !this.isEditing;
        
        if (this.isEditing) {
            this.enterEditMode();
        } else {
            this.exitEditMode();
        }
        
        this.mapSystem.drawTacticalMap();
        return this.isEditing;
    }

    enterEditMode() {
        console.log("🎨 Вход в режим редактора");
        
        this.originalClickHandler = this.mapSystem.handleCanvasClick;
        this.originalHoverHandler = this.mapSystem.handleCanvasHover;
        
        this.mapSystem.handleCanvasClick = (e) => this.handleEditorClick(e);
        this.mapSystem.handleCanvasHover = (e) => this.handleEditorHover(e);
        
        this.mapSystem.showGrid = true;
        
        this.showEditorUI();
    }

    exitEditMode() {
        console.log("🎨 Выход из режима редактора");
        
        if (this.originalClickHandler) {
            this.mapSystem.handleCanvasClick = this.originalClickHandler;
        }
        if (this.originalHoverHandler) {
            this.mapSystem.handleCanvasHover = this.originalHoverHandler;
        }
        
        this.hideEditorUI();
    }

    showEditorUI() {
        const container = document.getElementById('overlay-container');
        if (!container) return;

        container.innerHTML = `
            <div class="map-editor-overlay">
                <div class="editor-header">
                    <h3>🎨 Редактор карт Tigrimion</h3>
                    <div class="editor-controls">
                        <button class="btn-editor" onclick="game.systems.map.editor.toggleEditor()">
                            🚪 Выйти
                        </button>
                    </div>
                </div>
                
                <div class="editor-content">
                    <div class="editor-toolbar">
                        <div class="tool-section">
                            <h4>🗺️ Террайн</h4>
                            ${this.tools.terrain.map(tool => `
                                <button class="tool-btn ${this.selectedCellType === tool ? 'active' : ''}"
                                        onclick="game.systems.map.editor.selectTool('terrain', '${tool}')">
                                    ${this.getToolIcon(tool)} ${this.getToolName(tool)}
                                </button>
                            `).join('')}
                        </div>
                        
                        <div class="tool-section">
                            <h4>🎯 Объекты</h4>
                            ${this.tools.objects.map(tool => `
                                <button class="tool-btn ${this.selectedCellType === tool ? 'active' : ''}"
                                        onclick="game.systems.map.editor.selectTool('objects', '${tool}')">
                                    ${this.getToolIcon(tool)} ${this.getToolName(tool)}
                                </button>
                            `).join('')}
                        </div>
                        
                        <div class="tool-section">
                            <h4>⚡ Действия</h4>
                            <button class="btn-editor-primary" onclick="game.systems.map.editor.newMap()">
                                🆕 Новая карта
                            </button>
                            <button class="btn-editor-primary" onclick="game.systems.map.editor.loadMapProject()">
                                📂 Загрузить проект
                            </button>
                            <button class="btn-editor-success" onclick="game.systems.map.editor.saveMapProject()">
                                💾 Сохранить проект
                            </button>
                            <button class="btn-editor-export" onclick="game.systems.map.editor.exportForGame()">
                                🎮 Экспорт в игру
                            </button>
                        </div>
                        
                        <div class="tool-section">
                            <h4>ℹ️ Информация</h4>
                            <div class="editor-info">
                                <div>Текущий инструмент: <strong>${this.getToolName(this.selectedCellType)}</strong></div>
                                <div>Режим: <strong>${this.isEditing ? 'Редактирование' : 'Просмотр'}</strong></div>
                                <div>Клеток: <strong id="editorCellCount">0</strong></div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="editor-preview">
                        <div class="preview-header">
                            <h4>👁️ Предпросмотр карты</h4>
                            <div class="preview-controls">
                                <button class="btn-small" onclick="game.systems.map.toggleGrid()">
                                    ${this.mapSystem.showGrid ? '🔲 Сетка' : '🔳 Сетка'}
                                </button>
                                <button class="btn-small" onclick="game.systems.map.resetZoom()">
                                    🔄 Сброс зума
                                </button>
                            </div>
                        </div>
                        <div class="preview-container">
                            <!-- Canvas рендерится автоматически -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.style.display = 'block';
        this.updateStats();
    }

    hideEditorUI() {
        const container = document.getElementById('overlay-container');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
    }

    handleEditorClick(e) {
        if (!this.isEditing) return;
        
        const rect = this.mapSystem.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const hex = this.mapSystem.getHexAtCanvasPosition(x, y);
        if (hex) {
            this.editCell(hex.col, hex.row);
        }
    }

    handleEditorHover(e) {
        if (!this.isEditing) return;
        
        const rect = this.mapSystem.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const hex = this.mapSystem.getHexAtCanvasPosition(x, y);
        this.mapSystem.hoveredHex = hex;
        this.mapSystem.drawTacticalMap();
    }

    editCell(col, row) {
        if (!this.mapSystem.currentTacticalMap) {
            this.createNewMap();
        }
        
        const cellKey = `${col},${row}`;
        const hexSize = this.mapSystem.hexSize;
        
        this.mapSystem.currentTacticalMap.cells[cellKey] = {
            type: this.selectedCellType,
            passable: !['inactive', 'obstacle', 'monster'].includes(this.selectedCellType),
            visible: true,
            row: row,
            col: col,
            x: col * hexSize + (row % 2) * hexSize / 2,
            y: row * hexSize * 0.75,
            originalData: {
                created: new Date().toISOString(),
                tool: this.selectedCellType
            }
        };
        
        console.log(`✏️ Изменена клетка [${col}, ${row}] -> ${this.selectedCellType}`);
        this.mapSystem.drawTacticalMap();
        this.updateStats();
    }

    selectTool(category, tool) {
        this.selectedCellType = tool;
        
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[onclick="game.systems.map.editor.selectTool('${category}', '${tool}')"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        this.updateStats();
    }

    createNewMap() {
        const mapName = prompt("Название новой карты:", "Новая карта");
        if (!mapName) return;
        
        this.currentProject = {
            meta: {
                name: mapName,
                description: prompt("Описание карты:", "Создано во встроенном редакторе") || "",
                created: new Date().toISOString(),
                version: "1.0"
            },
            game: {
                grid: {
                    cellSize: this.mapSystem.hexSize,
                    cells: {}
                }
            },
            visual: {
                backgroundImage: "",
                canvasWidth: 800,
                canvasHeight: 600
            }
        };
        
        this.mapSystem.currentTacticalMap = {
            id: 'editor_temp',
            name: mapName,
            description: this.currentProject.meta.description,
            cells: {},
            startPosition: {x: 0, y: 0},
            width: 20,
            height: 20,
            cellSize: this.mapSystem.hexSize,
            jsonData: this.currentProject
        };
        
        console.log(`🆕 Создана новая карта: ${mapName}`);
        this.updateStats();
    }

    async saveMapProject() {
        if (!this.mapSystem.currentTacticalMap) {
            alert("❌ Нет активной карты для сохранения!");
            return;
        }

        const projectData = this.prepareProjectData();
        const fileName = `${projectData.meta.name.replace(/\s+/g, '_')}_project.json`;
        
        localStorage.setItem('mapEditor_currentProject', JSON.stringify(projectData));
        
        this.downloadJSON(projectData, fileName);
        
        console.log(`💾 Проект сохранен: ${fileName}`);
        alert(`✅ Проект "${projectData.meta.name}" сохранен!`);
    }

    async loadMapProject() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const projectData = JSON.parse(event.target.result);
                        this.loadProjectData(projectData);
                        alert(`✅ Проект "${projectData.meta.name}" загружен!`);
                    } catch (error) {
                        alert("❌ Ошибка загрузки проекта: " + error.message);
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }

    prepareProjectData() {
        const cells = Object.values(this.mapSystem.currentTacticalMap.cells).map(cell => ({
            id: `cell_${cell.row}_${cell.col}`,
            row: cell.row,
            col: cell.col,
            x: cell.x,
            y: cell.y,
            type: cell.type,
            passable: cell.passable,
            visible: cell.visible,
            originalData: cell.originalData
        }));

        return {
            meta: {
                name: this.mapSystem.currentTacticalMap.name,
                description: this.mapSystem.currentTacticalMap.description,
                created: new Date().toISOString(),
                version: "1.0",
                editor: "Tigrimion Built-in Editor"
            },
            game: {
                grid: {
                    cellSize: this.mapSystem.hexSize,
                    cells: cells
                },
                playerStart: this.findStartPosition(),
                objects: this.collectObjects()
            },
            visual: {
                backgroundImage: this.mapSystem.currentTacticalMap.image || "",
                canvasWidth: this.mapSystem.canvas?.width || 800,
                canvasHeight: this.mapSystem.canvas?.height || 600
            },
            editor: {
                settings: {
                    hexSize: this.mapSystem.hexSize,
                    showGrid: this.mapSystem.showGrid
                }
            }
        };
    }

    loadProjectData(projectData) {
        const tacticalMap = this.mapSystem.convertTigrimionJSONToMap(projectData);
        if (tacticalMap) {
            this.mapSystem.currentTacticalMap = tacticalMap;
            this.currentProject = projectData;
            
            this.mapSystem.calculateMapPositioning();
            this.mapSystem.drawTacticalMap();
            this.updateStats();
            
            console.log(`📂 Проект загружен: ${tacticalMap.name}`);
        }
    }

    async exportForGame() {
        if (!this.mapSystem.currentTacticalMap) {
            alert("❌ Нет активной карты для экспорта!");
            return;
        }

        const projectData = this.prepareProjectData();
        const gameMap = this.convertToGameFormat(projectData);
        
        const fileName = `${gameMap.name.replace(/\s+/g, '_')}.json`;
        
        this.downloadJSON(gameMap, fileName);
        
        console.log(`🎮 Карта экспортирована: ${fileName}`);
        alert(`✅ Карта "${gameMap.name}" экспортирована для игры!\nФайл: data/maps/tactical/${fileName}`);
    }

    convertToGameFormat(projectData) {
        return {
            id: `map_${Date.now()}`,
            name: projectData.meta.name,
            description: projectData.meta.description,
            image: projectData.visual.backgroundImage,
            width: 20,
            height: 20,
            startPosition: projectData.game.playerStart,
            cells: projectData.game.grid.cells.reduce((acc, cell) => {
                const key = `${cell.col},${cell.row}`;
                acc[key] = {
                    type: cell.type,
                    passable: cell.passable,
                    visible: cell.visible,
                    row: cell.row,
                    col: cell.col,
                    x: cell.x,
                    y: cell.y
                };
                return acc;
            }, {}),
            gameData: projectData.game,
            cellSize: projectData.game.grid.cellSize,
            renderType: 'hex'
        };
    }

    findStartPosition() {
        const cells = Object.values(this.mapSystem.currentTacticalMap.cells);
        const startCell = cells.find(cell => cell.type === 'player_start');
        return startCell ? {x: startCell.col, y: startCell.row} : {x: 0, y: 0};
    }

    collectObjects() {
        const cells = Object.values(this.mapSystem.currentTacticalMap.cells);
        return {
            monsters: cells.filter(cell => cell.type === 'monster').map(cell => cell.id),
            chests: cells.filter(cell => cell.type === 'chest').map(cell => cell.id),
            npcs: cells.filter(cell => cell.type === 'npc').map(cell => cell.id),
            exits: cells.filter(cell => cell.type === 'exit').map(cell => cell.id),
            obstacles: cells.filter(cell => cell.type === 'obstacle').map(cell => cell.id)
        };
    }

    updateStats() {
        const cellCount = this.mapSystem.currentTacticalMap ? 
            Object.keys(this.mapSystem.currentTacticalMap.cells).length : 0;
        
        const cellCountElement = document.getElementById('editorCellCount');
        if (cellCountElement) {
            cellCountElement.textContent = cellCount;
        }
    }

    getToolIcon(tool) {
        const icons = {
            'active': '🟢',
            'inactive': '🔴',
            'player_start': '🎯',
            'monster': '👹',
            'chest': '📦',
            'npc': '🧙',
            'exit': '🚪',
            'obstacle': '🪨'
        };
        return icons[tool] || '⚫';
    }

    getToolName(tool) {
        const names = {
            'active': 'Активная',
            'inactive': 'Неактивная',
            'player_start': 'Старт игрока',
            'monster': 'Монстр',
            'chest': 'Сундук',
            'npc': 'NPC',
            'exit': 'Выход',
            'obstacle': 'Препятствие'
        };
        return names[tool] || tool;
    }

    downloadJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Регистрируем систему в глобальной области
window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен со встроенным редактором карт");
