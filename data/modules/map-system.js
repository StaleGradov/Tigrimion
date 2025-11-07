"use strict";

// ========== MODULE: MapSystem with Advanced Built-in Editor ==========
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
        
        // Background image
        this.backgroundImage = null;
        this.backgroundImageUrl = '';
        
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

    // ========== BACKGROUND IMAGE METHODS ==========
    loadBackgroundImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.backgroundImageUrl = e.target.result;
                this.backgroundImage = new Image();
                this.backgroundImage.onload = () => {
                    console.log("✅ Фоновое изображение загружено:", this.backgroundImage.width, "x", this.backgroundImage.height);
                    if (this.currentTacticalMap) {
                        this.currentTacticalMap.image = this.backgroundImageUrl;
                    }
                    this.drawTacticalMap();
                    resolve(this.backgroundImage);
                };
                this.backgroundImage.onerror = () => {
                    console.error("❌ Ошибка загрузки изображения");
                    reject(new Error("Не удалось загрузить изображение"));
                };
                this.backgroundImage.src = this.backgroundImageUrl;
            };
            reader.onerror = () => {
                reject(new Error("Не удалось прочитать файл"));
            };
            reader.readAsDataURL(file);
        });
    }

    setBackgroundImage(url) {
        this.backgroundImageUrl = url;
        this.backgroundImage = new Image();
        this.backgroundImage.onload = () => {
            console.log("✅ Фоновое изображение установлено");
            if (this.currentTacticalMap) {
                this.currentTacticalMap.image = url;
            }
            this.drawTacticalMap();
        };
        this.backgroundImage.onerror = () => {
            console.error("❌ Ошибка загрузки фонового изображения");
        };
        this.backgroundImage.src = url;
    }

    removeBackgroundImage() {
        this.backgroundImage = null;
        this.backgroundImageUrl = '';
        if (this.currentTacticalMap) {
            this.currentTacticalMap.image = '';
        }
        this.drawTacticalMap();
        console.log("🗑️ Фоновое изображение удалено");
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
            
            // Пробуем загрузить отдельные файлы карт
            const individualMaps = await this.loadIndividualMaps();
            if (individualMaps.length > 0) {
                this.tacticalMaps.push(...individualMaps);
                console.log(`✅ Загружено ${individualMaps.length} отдельных карт`);
                return;
            }
            
            // Если отдельных карт нет, пробуем загрузить из единого файла
            const mapPaths = [
                'data/maps/tactical-maps.json',
                'maps/tactical-maps.json', 
                'data/tactical-maps.json',
                'tactical-maps.json'
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

    async loadIndividualMaps() {
        try {
            // В реальной игре здесь будет запрос к серверу для получения списка файлов
            // Для демонстрации просто возвращаем пустой массив
            return [];
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
            for (const map of mapData) {
                const tacticalMap = this.convertTigrimionJSONToMap(map);
                if (tacticalMap) {
                    this.tacticalMaps.push(tacticalMap);
                    this.loadedJSONMaps.set(tacticalMap.id, tacticalMap);
                }
            }
        } else if (mapData.meta) {
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
        const container = document.querySelector('.tactical-map-visual') || 
                         document.querySelector('.preview-container') ||
                         document.querySelector('.game-container');
        
        if (!container) {
            console.log("❌ Контейнер для карты не найден");
            return;
        }

        // Очищаем контейнер
        const existingCanvas = container.querySelector('canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'tacticalMapCanvas';
        
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.cursor = 'pointer';
        container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        
        this.calculateMapPositioning();
        this.setupCanvasEventListeners();
        
        console.log("✅ Canvas инициализирован");
        this.drawTacticalMap();
    }

    calculateMapPositioning() {
        if (!this.canvas) return;

        const container = this.canvas.parentElement;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;

        // Если нет текущей карты, создаем базовую сетку
        if (!this.currentTacticalMap) {
            this.createDefaultGrid();
            return;
        }

        const cells = Object.values(this.currentTacticalMap.cells);
        if (cells.length === 0) {
            this.createDefaultGrid();
            return;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        cells.forEach(cell => {
            minX = Math.min(minX, cell.x);
            minY = Math.min(minY, cell.y);
            maxX = Math.max(maxX, cell.x);
            maxY = Math.max(maxY, cell.y);
        });

        const hexSize = this.currentTacticalMap.cellSize || 40;
        const padding = hexSize * 2;

        const mapWidth = maxX - minX + hexSize * 2;
        const mapHeight = maxY - minY + hexSize * 2;

        const scaleX = (rect.width - padding * 2) / mapWidth;
        const scaleY = (rect.height - padding * 2) / mapHeight;
        this.mapScale = Math.min(scaleX, scaleY, 1);

        this.mapOffset.x = (rect.width - mapWidth * this.mapScale) / 2 - minX * this.mapScale;
        this.mapOffset.y = (rect.height - mapHeight * this.mapScale) / 2 - minY * this.mapScale;

        console.log(`📐 Позиционирование: scale=${this.mapScale}, offset=(${this.mapOffset.x}, ${this.mapOffset.y})`);
    }

    createDefaultGrid() {
        if (!this.currentTacticalMap) {
            this.currentTacticalMap = {
                id: 'editor_default',
                name: 'Новая карта',
                description: 'Создана в редакторе',
                width: 15,
                height: 15,
                startPosition: {x: 7, y: 7},
                cells: {},
                cellSize: this.hexSize,
                renderType: 'hex'
            };
        }

        const hexSize = this.currentTacticalMap.cellSize;
        const width = this.currentTacticalMap.width;
        const height = this.currentTacticalMap.height;

        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                const x = col * hexSize + (row % 2) * hexSize / 2;
                const y = row * hexSize * 0.75;
                const key = `${col},${row}`;
                
                this.currentTacticalMap.cells[key] = {
                    type: 'active',
                    passable: true,
                    visible: true,
                    row: row,
                    col: col,
                    x: x,
                    y: y
                };
            }
        }
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

        if (this.editor.isEditing) {
            this.editor.handleEditorHover(e);
            return;
        }

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
        const hexSize = (this.currentTacticalMap.cellSize || 40) * this.mapScale;
        
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
        if (!this.ctx || !this.canvas) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.mapOffset.x, this.mapOffset.y);
        this.ctx.scale(this.mapScale, this.mapScale);

        this.drawBackground();
        this.drawHexes();

        if (!this.editor.isEditing && this.currentTacticalMap) {
            this.drawAvailableMoves();
        }

        this.drawHoverEffect();

        if (this.showGrid) {
            this.drawHexGrid();
        }

        this.ctx.restore();
    }

    drawBackground() {
        if (!this.currentTacticalMap) return;

        // Если есть фоновое изображение, рисуем его
        if (this.backgroundImage) {
            const cells = Object.values(this.currentTacticalMap.cells);
            if (cells.length === 0) return;

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            
            cells.forEach(cell => {
                const hexSize = this.currentTacticalMap.cellSize || 40;
                minX = Math.min(minX, cell.x - hexSize);
                minY = Math.min(minY, cell.y - hexSize);
                maxX = Math.max(maxX, cell.x + hexSize);
                maxY = Math.max(maxY, cell.y + hexSize);
            });

            const width = maxX - minX;
            const height = maxY - minY;

            this.ctx.drawImage(this.backgroundImage, minX, minY, width, height);
        }
        // Или используем изображение из данных карты
        else if (this.currentTacticalMap.image) {
            const img = new Image();
            img.onload = () => {
                const cells = Object.values(this.currentTacticalMap.cells);
                if (cells.length === 0) return;

                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                
                cells.forEach(cell => {
                    const hexSize = this.currentTacticalMap.cellSize || 40;
                    minX = Math.min(minX, cell.x - hexSize);
                    minY = Math.min(minY, cell.y - hexSize);
                    maxX = Math.max(maxX, cell.x + hexSize);
                    maxY = Math.max(maxY, cell.y + hexSize);
                });

                const width = maxX - minX;
                const height = maxY - minY;

                this.ctx.drawImage(img, minX, minY, width, height);
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
                this.drawFallbackBackground();
            };
            img.src = this.currentTacticalMap.image;
        }
        // Если нет изображения, рисуем градиентный фон
        else {
            this.drawFallbackBackground();
        }
    }

    drawFallbackBackground() {
        const cells = Object.values(this.currentTacticalMap.cells);
        if (cells.length === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        cells.forEach(cell => {
            const hexSize = this.currentTacticalMap.cellSize || 40;
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
        if (!this.currentTacticalMap) return;
        
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
        if (!this.currentTacticalMap) return;
        
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
        
        if (this.currentTacticalMap.startPosition && 
            cell.col === this.currentTacticalMap.startPosition.x && 
            cell.row === this.currentTacticalMap.startPosition.y) {
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

        if (this.currentTacticalMap.startPosition && 
            cell.col === this.currentTacticalMap.startPosition.x && 
            cell.row === this.currentTacticalMap.startPosition.y) {
            symbol = '⭐';
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
        if (!this.currentTacticalMap) return;
        
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
        
        // Инициализируем canvas после показа оверлея
        setTimeout(() => {
            if (overlayType === 'tactical-map' || overlayType === 'tactical-map-editor') {
                this.initCanvas();
            }
        }, 100);
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
        console.log("Фоновое изображение:", this.backgroundImageUrl ? "Загружено" : "Нет");
        console.groupEnd();
    }
}

// ========== ADVANCED MAP EDITOR WITH IMAGE UPLOAD ==========
class MapEditor {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        this.isEditing = false;
        this.currentTool = 'terrain';
        this.selectedCellType = 'active';
        this.currentProject = null;
        this.massEdit = false;
        this.currentVisibility = 'visible';
        this.deletionHistory = [];
        this.maxHistorySize = 20;
        
        this.tools = {
            terrain: ['active', 'inactive'],
            objects: ['player_start', 'monster', 'chest', 'npc', 'exit', 'obstacle']
        };

        this.gameObjects = {
            'player_start': { 
                name: '🎯 Старт игрока', 
                color: '#4ade80',
                description: 'Начальная позиция игрока',
                passable: true
            },
            'monster': { 
                name: '👹 Монстр', 
                color: '#ef4444',
                description: 'Враждебное существо',
                passable: false
            },
            'chest': { 
                name: '📦 Сундук', 
                color: '#f59e0b',
                description: 'Сундук с сокровищами',
                passable: true
            },
            'npc': { 
                name: '🧙 NPC', 
                color: '#3b82f6',
                description: 'Неигровой персонаж',
                passable: true
            },
            'exit': { 
                name: '🚪 Выход', 
                color: '#8b5cf6',
                description: 'Выход с карты',
                passable: true
            },
            'obstacle': { 
                name: '🪨 Препятствие', 
                color: '#6b7280',
                description: 'Непроходимое препятствие',
                passable: false
            },
            'active': { 
                name: '🟢 Активная', 
                color: '#22c55e',
                description: 'Проходимая клетка',
                passable: true
            },
            'inactive': { 
                name: '🔴 Неактивная', 
                color: '#ef4444',
                description: 'Непроходимая клетка',
                passable: false
            }
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
            <div class="map-editor-overlay" style="
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0, 10, 20, 0.95); z-index: 1000; 
                display: flex; flex-direction: column; color: white;
                font-family: Arial, sans-serif;
            ">
                <div class="editor-header" style="
                    background: linear-gradient(45deg, #1a1a2e, #16213e);
                    padding: 20px; border-bottom: 2px solid #00ffff;
                    display: flex; justify-content: space-between; align-items: center;
                ">
                    <h3 style="margin: 0; color: #00ffff; text-shadow: 0 0 10px #00ffff;">
                        🎨 Редактор карт Tigrimion PRO
                    </h3>
                    <div class="editor-controls">
                        <button onclick="game.systems.map.editor.toggleEditor()" style="
                            background: linear-gradient(45deg, #ff4444, #ff8800);
                            border: none; color: white; padding: 10px 20px;
                            border-radius: 25px; cursor: pointer; font-weight: bold;
                        ">🚪 Выйти из редактора</button>
                    </div>
                </div>
                
                <div class="editor-content" style="
                    display: flex; flex: 1; overflow: hidden;
                ">
                    <div class="editor-toolbar" style="
                        width: 350px; background: rgba(0, 20, 40, 0.9);
                        padding: 20px; overflow-y: auto; border-right: 1px solid #00ffff;
                    ">
                        ${this.renderToolbar()}
                    </div>
                    
                    <div class="editor-preview" style="flex: 1; position: relative;">
                        <div class="preview-header" style="
                            background: rgba(0, 0, 0, 0.7); padding: 15px;
                            border-bottom: 1px solid #00ffff; display: flex;
                            justify-content: space-between; align-items: center;
                        ">
                            <h4 style="margin: 0; color: #ffff00;">👁️ Предпросмотр карты</h4>
                            <div class="preview-controls">
                                <button onclick="game.systems.map.toggleGrid()" style="
                                    background: rgba(0, 255, 255, 0.2); border: 1px solid #00ffff;
                                    color: white; padding: 8px 15px; border-radius: 5px;
                                    cursor: pointer; margin: 0 5px;
                                ">${this.mapSystem.showGrid ? '🔲 Сетка' : '🔳 Сетка'}</button>
                                <button onclick="game.systems.map.resetZoom()" style="
                                    background: rgba(255, 215, 0, 0.2); border: 1px solid #ffd700;
                                    color: white; padding: 8px 15px; border-radius: 5px;
                                    cursor: pointer; margin: 0 5px;
                                ">🔄 Сброс зума</button>
                            </div>
                        </div>
                        <div class="preview-container" style="
                            width: 100%; height: calc(100% - 70px); position: relative;
                        ">
                            <!-- Canvas будет добавлен автоматически -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        container.style.display = 'block';
        this.updateStats();
        
        // Инициализируем canvas для редактора
        setTimeout(() => {
            this.mapSystem.initCanvas();
        }, 100);
    }

    renderToolbar() {
        return `
            <div class="tool-section" style="margin-bottom: 25px; padding: 15px; background: rgba(0, 255, 255, 0.1); border-radius: 10px;">
                <h4 style="color: #00ffff; margin-bottom: 15px;">🖼️ Фон карты</h4>
                <div class="image-upload-section">
                    <button onclick="game.systems.map.editor.uploadBackgroundImage()" style="
                        background: linear-gradient(45deg, #00ffff, #0080ff);
                        border: none; color: #000; padding: 12px 20px;
                        border-radius: 25px; cursor: pointer; font-weight: bold;
                        width: 100%; margin-bottom: 10px;
                    ">📁 Загрузить фон</button>
                    <button onclick="game.systems.map.editor.removeBackgroundImage()" style="
                        background: linear-gradient(45deg, #ff4444, #ff8800);
                        border: none; color: white; padding: 10px 20px;
                        border-radius: 25px; cursor: pointer; width: 100%;
                    ">🗑️ Удалить фон</button>
                    <div class="image-preview" id="imagePreview" style="margin-top: 15px;">
                        ${this.mapSystem.backgroundImageUrl ? 
                            `<img src="${this.mapSystem.backgroundImageUrl}" alt="Preview" style="max-width: 100%; max-height: 120px; border: 2px solid #00ffff; border-radius: 5px;">` : 
                            '<div style="color: #888; font-size: 14px; text-align: center; padding: 20px;">Нет фонового изображения</div>'
                        }
                    </div>
                </div>
            </div>
            
            <div class="tool-section" style="margin-bottom: 25px; padding: 15px; background: rgba(0, 255, 0, 0.1); border-radius: 10px;">
                <h4 style="color: #00ff00; margin-bottom: 15px;">🗺️ Террайн</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    ${this.tools.terrain.map(tool => `
                        <button class="tool-btn ${this.selectedCellType === tool ? 'active' : ''}" 
                                onclick="game.systems.map.editor.selectTool('terrain', '${tool}')" style="
                            background: ${this.selectedCellType === tool ? 
                                'rgba(0, 255, 0, 0.3)' : 'rgba(0, 255, 0, 0.1)'};
                            border: 2px solid ${this.selectedCellType === tool ? '#00ff00' : '#008800'};
                            color: white; padding: 12px 8px; border-radius: 8px;
                            cursor: pointer; font-size: 12px; text-align: center;
                        ">
                            ${this.getToolIcon(tool)}<br>${this.getToolName(tool)}
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <div class="tool-section" style="margin-bottom: 25px; padding: 15px; background: rgba(255, 215, 0, 0.1); border-radius: 10px;">
                <h4 style="color: #ffd700; margin-bottom: 15px;">🎯 Объекты</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    ${this.tools.objects.map(tool => `
                        <button class="tool-btn ${this.selectedCellType === tool ? 'active' : ''}" 
                                onclick="game.systems.map.editor.selectTool('objects', '${tool}')" style="
                            background: ${this.selectedCellType === tool ? 
                                'rgba(255, 215, 0, 0.3)' : 'rgba(255, 215, 0, 0.1)'};
                            border: 2px solid ${this.selectedCellType === tool ? '#ffd700' : '#886600'};
                            color: white; padding: 12px 8px; border-radius: 8px;
                            cursor: pointer; font-size: 12px; text-align: center;
                        ">
                            ${this.getToolIcon(tool)}<br>${this.getToolName(tool)}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="tool-section" style="margin-bottom: 25px; padding: 15px; background: rgba(139, 92, 246, 0.1); border-radius: 10px;">
                <h4 style="color: #8b5cf6; margin-bottom: 15px;">⚡ Действия</h4>
                <div style="display: grid; grid-template-columns: 1fr; gap: 8px;">
                    <button onclick="game.systems.map.editor.newMap()" style="
                        background: linear-gradient(45deg, #00ffff, #0080ff);
                        border: none; color: #000; padding: 12px;
                        border-radius: 8px; cursor: pointer; font-weight: bold;
                    ">🆕 Новая карта</button>
                    <button onclick="game.systems.map.editor.loadMapProject()" style="
                        background: linear-gradient(45deg, #ffaa00, #ff8800);
                        border: none; color: #000; padding: 12px;
                        border-radius: 8px; cursor: pointer; font-weight: bold;
                    ">📂 Загрузить проект</button>
                    <button onclick="game.systems.map.editor.saveMapProject()" style="
                        background: linear-gradient(45deg, #00ff00, #00cc00);
                        border: none; color: #000; padding: 12px;
                        border-radius: 8px; cursor: pointer; font-weight: bold;
                    ">💾 Сохранить проект</button>
                    <button onclick="game.systems.map.editor.exportForGame()" style="
                        background: linear-gradient(45deg, #8b5cf6, #6d28d9);
                        border: none; color: white; padding: 12px;
                        border-radius: 8px; cursor: pointer; font-weight: bold;
                    ">🎮 Экспорт в игру</button>
                </div>
            </div>

            <div class="tool-section" style="margin-bottom: 25px; padding: 15px; background: rgba(255, 255, 255, 0.1); border-radius: 10px;">
                <h4 style="color: #ffffff; margin-bottom: 15px;">ℹ️ Информация</h4>
                <div class="editor-info" style="font-size: 14px; line-height: 1.5;">
                    <div>Текущий инструмент: <strong style="color: #00ffff;">${this.getToolName(this.selectedCellType)}</strong></div>
                    <div>Режим: <strong style="color: #ffff00;">${this.isEditing ? 'Редактирование' : 'Просмотр'}</strong></div>
                    <div>Клеток: <strong style="color: #00ff00;" id="editorCellCount">0</strong></div>
                    <div>Фон: <strong style="color: #ffd700;" id="editorBackgroundStatus">${this.mapSystem.backgroundImageUrl ? 'Загружен' : 'Нет'}</strong></div>
                    <div style="margin-top: 10px; font-size: 12px; color: #888;">
                        ЛКМ - разместить • ПКМ - удалить • Shift - область
                    </div>
                </div>
            </div>
        `;
    }

    hideEditorUI() {
        const container = document.getElementById('overlay-container');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
    }

    // ========== IMAGE UPLOAD METHODS ==========
    uploadBackgroundImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleImageUpload(file);
            }
        };
        
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    async handleImageUpload(file) {
        try {
            // Проверяем размер файла (максимум 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert("❌ Файл слишком большой! Максимальный размер: 5MB");
                return;
            }

            // Проверяем тип файла
            if (!file.type.startsWith('image/')) {
                alert("❌ Пожалуйста, выберите файл изображения");
                return;
            }

            console.log("📁 Загружаем изображение:", file.name, file.size, "bytes");
            
            // Показываем индикатор загрузки
            const preview = document.getElementById('imagePreview');
            if (preview) {
                preview.innerHTML = '<div style="color: #00ffff; text-align: center; padding: 20px;">🔄 Загрузка изображения...</div>';
            }

            await this.mapSystem.loadBackgroundImage(file);
            
            // Обновляем превью
            this.updateImagePreview();
            this.updateStats();
            
            console.log("✅ Фоновое изображение успешно загружено");
            
        } catch (error) {
            console.error("❌ Ошибка загрузки изображения:", error);
            alert("❌ Ошибка загрузки изображения: " + error.message);
            
            // Восстанавливаем превью в случае ошибки
            this.updateImagePreview();
        }
    }

    updateImagePreview() {
        const preview = document.getElementById('imagePreview');
        if (preview) {
            if (this.mapSystem.backgroundImageUrl) {
                preview.innerHTML = `
                    <div style="text-align: center;">
                        <img src="${this.mapSystem.backgroundImageUrl}" alt="Preview" 
                             style="max-width: 100%; max-height: 120px; border: 2px solid #00ffff; border-radius: 5px;">
                        <div style="font-size: 12px; color: #00ffff; margin-top: 5px;">
                            ✅ Фон загружен
                        </div>
                    </div>
                `;
            } else {
                preview.innerHTML = '<div style="color: #888; font-size: 14px; text-align: center; padding: 20px;">Нет фонового изображения</div>';
            }
        }
    }

    removeBackgroundImage() {
        this.mapSystem.removeBackgroundImage();
        this.updateImagePreview();
        this.updateStats();
    }

    handleEditorClick(e) {
        if (!this.isEditing) return;
        
        const rect = this.mapSystem.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const hex = this.mapSystem.getHexAtCanvasPosition(x, y);
        if (hex) {
            if (e.shiftKey) {
                this.massEdit = true;
                this.editHexArea(hex.col, hex.row, this.selectedCellType);
            } else {
                this.editCell(hex.col, hex.row);
            }
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
        
        // Сохраняем предыдущее состояние для истории
        const previousCell = this.mapSystem.currentTacticalMap.cells[cellKey];
        if (previousCell) {
            this.addToDeletionHistory(previousCell);
        }
        
        this.mapSystem.currentTacticalMap.cells[cellKey] = {
            type: this.selectedCellType,
            passable: this.gameObjects[this.selectedCellType].passable,
            visible: this.currentVisibility === 'visible',
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

    editHexArea(centerCol, centerRow, editType) {
        if (!this.mapSystem.currentTacticalMap) return;

        const radius = 2;
        const affectedHexes = [];
        
        Object.values(this.mapSystem.currentTacticalMap.cells).forEach(cell => {
            const distance = Math.sqrt(
                Math.pow(cell.col - centerCol, 2) + 
                Math.pow(cell.row - centerRow, 2)
            );
            
            if (distance <= radius) {
                // Сохраняем предыдущее состояние для истории
                this.addToDeletionHistory(cell);
                
                cell.type = editType;
                cell.passable = this.gameObjects[editType].passable;
                affectedHexes.push(cell);
            }
        });
        
        this.mapSystem.drawTacticalMap();
        this.updateStats();
        console.log(`🔄 Область из ${affectedHexes.length} клеток изменена`);
    }

    addToDeletionHistory(cell) {
        const historyItem = {
            id: `${cell.col},${cell.row}`,
            row: cell.row,
            col: cell.col,
            x: cell.x,
            y: cell.y,
            type: cell.type,
            passable: cell.passable,
            visible: cell.visible,
            timestamp: Date.now()
        };
        
        this.deletionHistory.unshift(historyItem);
        
        if (this.deletionHistory.length > this.maxHistorySize) {
            this.deletionHistory.pop();
        }
    }

    selectTool(category, tool) {
        this.selectedCellType = tool;
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
                backgroundImage: this.mapSystem.backgroundImageUrl || "",
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
            image: this.mapSystem.backgroundImageUrl,
            jsonData: this.currentProject
        };
        
        // Создаем базовую сетку
        this.mapSystem.createDefaultGrid();
        
        console.log(`🆕 Создана новая карта: ${mapName}`);
        this.updateStats();
        this.mapSystem.drawTacticalMap();
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
                backgroundImage: this.mapSystem.backgroundImageUrl || "",
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
            
            // Загружаем фоновое изображение если есть
            if (projectData.visual?.backgroundImage) {
                this.mapSystem.setBackgroundImage(projectData.visual.backgroundImage);
            }
            
            this.mapSystem.calculateMapPositioning();
            this.mapSystem.drawTacticalMap();
            this.updateStats();
            this.updateImagePreview();
            
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
        alert(`✅ Карта "${gameMap.name}" экспортирована для игры!\nФайл: ${fileName}`);
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
            monsters: cells.filter(cell => cell.type === 'monster').length,
            chests: cells.filter(cell => cell.type === 'chest').length,
            npcs: cells.filter(cell => cell.type === 'npc').length,
            exits: cells.filter(cell => cell.type === 'exit').length,
            obstacles: cells.filter(cell => cell.type === 'obstacle').length
        };
    }

    updateStats() {
        if (!this.mapSystem.currentTacticalMap) return;
        
        const cellCount = Object.keys(this.mapSystem.currentTacticalMap.cells).length;
        
        const cellCountElement = document.getElementById('editorCellCount');
        if (cellCountElement) {
            cellCountElement.textContent = cellCount;
        }
        
        const backgroundStatus = document.getElementById('editorBackgroundStatus');
        if (backgroundStatus) {
            backgroundStatus.textContent = this.mapSystem.backgroundImageUrl ? 'Загружен' : 'Нет';
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
            'player_start': 'Старт',
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
console.log("📦 MapSystem модуль загружен со встроенным редактором карт и поддержкой загрузки изображений");
