"use strict";

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
        
        this.canvas = null;
        this.ctx = null;
        this.hexSize = 40;
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
        
        if (hero) {
            this.updatePlayerPositionsFromHero(hero);
        }
    }

    updatePlayerPositionsFromHero(hero) {
        if (hero.mapPosition) {
            this.playerGlobalPosition = hero.mapPosition.global || this.playerGlobalPosition;
            this.playerLocalPosition = hero.mapPosition.local || this.playerLocalPosition;
            this.playerTacticalPosition = hero.mapPosition.tactical || this.playerTacticalPosition;
        }
        
        console.log(`📍 Позиции обновлены для героя: ${hero.name}`);
    }

    async loadMapData() {
        try {
            console.log("📥 Загружаем данные карт...");
            
            await this.loadJSONMaps();
            
            if (this.tacticalMaps.length === 0) {
                this.createTestMaps();
            }
            
            this.setStartPositions();
            
            // Загружаем состояние побежденных монстров
            this.loadDefeatedMonsters();
            
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
            console.warn("❌ Неверный формат JSON карты Tigrimion");
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
                monster_id: cell.monster_id, // Сохраняем ID монстра
                defeated: cell.defeated || false, // Состояние победы
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
            localPosition: {x: 0, y: 0},
            cells: convertedCells,
            jsonData: jsonMap,
            gameData: jsonMap.game,
            renderType: 'hex',
            cellSize: jsonMap.game.grid.cellSize || 40
        };
    }

    // ========== ОБНОВЛЕННАЯ СИСТЕМА ПЕРЕМЕЩЕНИЯ С КОНКРЕТНЫМИ МОНСТРАМИ ==========
    moveOnTacticalMap(x, y) {
        if (!this.currentHero) {
            console.error("❌ Герой не выбран!");
            if (window.game) {
                window.game.showNotification("❌ Герой не выбран! Пожалуйста, выберите героя сначала.", 'error');
            }
            return;
        }

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

        if (cellData.passable === false && !(cellData.type === 'monster' && cellData.defeated)) {
            console.log("🚫 Нельзя пройти на эту клетку");
            if (window.game) {
                window.game.showNotification("Нельзя пройти на эту клетку!", 'error');
            }
            return;
        }

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

        this.hideOverlay();
        
        setTimeout(() => {
            // ПРОВЕРЯЕМ ЕСТЬ ЛИ НА КЛЕТКЕ КОНКРЕТНЫЙ МОНСТР
            if (cellData.type === 'monster' && cellData.monster_id && !cellData.defeated) {
                this.startSpecificMonsterBattle(cellData, x, y);
            } else {
                // Если клетка пустая или монстр уже побежден - просто перемещаемся
                this.completeMovement(x, y, true);
            }
        }, 50);
    }

    // ЗАПУСК БОЯ С КОНКРЕТНЫМ МОНСТРОМ
    startSpecificMonsterBattle(cellData, targetX, targetY) {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            return;
        }

        if (!this.currentHero) {
            console.error("❌ Не могу начать бой: герой не выбран");
            return;
        }

        this.pendingMovement = { x: targetX, y: targetY, cellData: cellData };
        
        // Запускаем бой с конкретным монстром по ID
        battleSystem.startBattleWithSpecificMonster(this.currentHero, cellData.monster_id, 'movement');
        
        console.log(`⚔️ Запуск боя с конкретным монстром ID: ${cellData.monster_id} на клетке [${targetX}, ${targetY}]`);
    }

    // ПРОСТОЕ ПЕРЕМЕЩЕНИЕ БЕЗ БОЯ
    completeMovement(targetX, targetY, victory = true) {
        if (!this.currentHero) {
            console.error("❌ Не могу завершить перемещение: герой не выбран");
            return;
        }
        
        const oldPosition = {...this.playerTacticalPosition};
        this.playerTacticalPosition = {x: targetX, y: targetY};
        
        console.log(`✅ Перемещение героя ${this.currentHero.name} на: [${targetX}, ${targetY}]`);
        
        this.saveMapState();
        
        if (this.activeOverlay === 'tactical-map') {
            this.updateTacticalMapDisplay();
        }
    }

    // ОБРАБОТКА РЕЗУЛЬТАТА БОЯ ИЗ BATTLE SYSTEM
    completeMovementAfterBattle(victory) {
        if (!this.pendingMovement) return;

        const targetX = this.pendingMovement.x;
        const targetY = this.pendingMovement.y;
        const cellData = this.pendingMovement.cellData;
        
        if (!this.currentHero) {
            console.error("❌ Не могу завершить перемещение: герой не выбран");
            return;
        }
        
        if (victory) {
            const oldPosition = {...this.playerTacticalPosition};
            this.playerTacticalPosition = {x: targetX, y: targetY};
            
            // ЕСЛИ ЭТО БЫЛ КОНКРЕТНЫЙ МОНСТР - ПОМЕЧАЕМ ЕГО КАК ПОБЕЖДЕННОГО
            if (cellData && cellData.type === 'monster' && cellData.monster_id) {
                this.markMonsterAsDefeated(cellData);
            }
            
            console.log(`✅ Успешное перемещение героя ${this.currentHero.name} после боя на: [${targetX}, ${targetY}]`);
            
            this.saveMapState();
            
            if (this.activeOverlay === 'tactical-map') {
                this.updateTacticalMapDisplay();
            }
            
        } else {
            const startPosition = this.currentTacticalMap.startPosition;
            this.playerTacticalPosition = {...startPosition};
            
            console.log(`💀 Поражение! Возврат героя ${this.currentHero.name} на стартовую позицию`);
            
            this.saveMapState();
            
            if (this.activeOverlay === 'tactical-map') {
                this.updateTacticalMapDisplay();
            }
            
            if (window.game) {
                window.game.showNotification("Поражение! Возврат на стартовую позицию.", 'error');
            }
        }
        
        this.pendingMovement = null;
    }

    // ПОМЕТКА МОНСТРА КАК ПОБЕЖДЕННОГО
    markMonsterAsDefeated(cellData) {
        cellData.defeated = true;
        cellData.passable = true; // Теперь можно проходить
        cellData.type = 'active'; // Меняем тип клетки
        
        // Обновляем визуальное отображение
        this.updateCellVisualAfterBattle(cellData);
        
        console.log(`🎯 Монстр ID ${cellData.monster_id} побежден и удален с карты`);
        
        // Сохраняем состояние
        this.saveDefeatedMonsters();
    }

    // ОБНОВЛЕНИЕ ВИЗУАЛА КЛЕТКИ ПОСЛЕ БОЯ
    updateCellVisualAfterBattle(cellData) {
        // Убираем иконку монстра, меняем тип клетки
        cellData.type = 'active';
        cellData.originalType = 'monster_defeated'; // Сохраняем для истории
        
        // Обновляем отображение на карте
        if (this.canvasInitialized) {
            this.drawTacticalMap();
        }
    }

    // СОХРАНЕНИЕ СОСТОЯНИЯ ПОБЕЖДЕННЫХ МОНСТРОВ
    saveDefeatedMonsters() {
        if (!this.currentTacticalMap) return;
        
        const defeatedMonsters = {};
        
        // Собираем всех побежденных монстров на текущей карте
        Object.values(this.currentTacticalMap.cells).forEach(cell => {
            if (cell.defeated && cell.monster_id) {
                defeatedMonsters[`${cell.col},${cell.row}`] = {
                    monster_id: cell.monster_id,
                    defeated: true,
                    defeatedAt: Date.now()
                };
            }
        });
        
        localStorage.setItem(`defeated_monsters_${this.currentTacticalMap.id}`, 
                           JSON.stringify(defeatedMonsters));
        
        console.log(`💾 Сохранено ${Object.keys(defeatedMonsters).length} побежденных монстров`);
    }

    // ЗАГРУЗКА СОСТОЯНИЯ ПОБЕЖДЕННЫХ МОНСТРОВ
    loadDefeatedMonsters() {
        if (!this.currentTacticalMap) return;
        
        try {
            const saved = localStorage.getItem(`defeated_monsters_${this.currentTacticalMap.id}`);
            if (!saved) return;
            
            const defeatedMonsters = JSON.parse(saved);
            
            // Восстанавливаем состояние клеток
            Object.entries(defeatedMonsters).forEach(([cellKey, data]) => {
                const cell = this.currentTacticalMap.cells[cellKey];
                if (cell && data.defeated) {
                    cell.defeated = true;
                    cell.passable = true;
                    cell.type = 'active';
                }
            });
            
            console.log(`📂 Загружено ${Object.keys(defeatedMonsters).length} побежденных монстров`);
            
        } catch (error) {
            console.error("❌ Ошибка загрузки побежденных монстров:", error);
        }
    }

    // ========== CANVIS И ОТОБРАЖЕНИЕ КАРТЫ ==========
    initCanvas() {
        const container = document.querySelector('.tactical-map-visual');
        if (!container) {
            console.log("❌ Контейнер для карты не найден");
            return;
        }

        container.innerHTML = '';

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
        
        this.canvasInitialized = true;
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
        
        if (cells.length > 0) {
            let avgX = 0, avgY = 0;
            cells.forEach(cell => {
                avgX += cell.x;
                avgY += cell.y;
            });
            avgX /= cells.length;
            avgY /= cells.length;
            
            const centerCanvasX = rect.width / 2;
            const centerCanvasY = rect.height / 2;
            
            const offsetX = centerCanvasX - avgX;
            const offsetY = centerCanvasY - avgY;
            
            cells.forEach(cell => {
                cell.x += offsetX;
                cell.y += offsetY;
            });
        }
        
        this.mapOffset.x = 0;
        this.mapOffset.y = 0;
    }
    
    setupCanvasEventListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        window.addEventListener('resize', () => {
            setTimeout(() => {
                if (this.canvasInitialized) {
                    this.calculateMapPositioning();
                    this.forceRedraw();
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
        if (hex && (hex.passable !== false || (hex.type === 'monster' && hex.defeated))) {
            console.log(`🎲 Клик по клетке: [${hex.col}, ${hex.row}] тип: ${hex.type}${hex.monster_id ? ` монстр: ${hex.monster_id}` : ''}`);
            this.moveOnTacticalMap(hex.col, hex.row);
        }
    }

    getHexAtCanvasPosition(canvasX, canvasY) {
        if (!this.currentTacticalMap) return null;

        const cells = Object.values(this.currentTacticalMap.cells);
        const hexSize = this.currentTacticalMap.cellSize || 40;

        for (const cell of cells) {
            const distance = Math.sqrt(
                Math.pow(canvasX - cell.x, 2) + 
                Math.pow(canvasY - cell.y, 2)
            );
            
            if (distance <= hexSize * 0.6) {
                return cell;
            }
        }
        
        return null;
    }

    drawTacticalMap() {
        if (!this.ctx || !this.currentTacticalMap) {
            console.log("❌ Canvas context или карта не доступна");
            return;
        }

        const canvas = this.canvas;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.drawBackground();
        this.drawHexes();
        this.drawAvailableMoves();
        this.drawHoverEffect();

        if (this.showGrid) {
            this.drawHexGrid();
        }
    }

    drawBackground() {
        const map = this.currentTacticalMap;
        if (!map.image) {
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
            this.drawHexes();
            this.drawAvailableMoves();
            this.drawHoverEffect();
            if (this.showGrid) {
                this.drawHexGrid();
            }
        };
        img.onerror = () => {
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

        let fillColor = 'rgba(76, 201, 240, 0.2)';
        
        if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
            fillColor = 'rgba(74, 222, 128, 0.6)';
        } else if (cell.type === 'monster' && !cell.defeated) {
            fillColor = 'rgba(239, 68, 68, 0.5)';
        } else if (cell.type === 'monster' && cell.defeated) {
            fillColor = 'rgba(107, 114, 128, 0.3)'; // Побежденный монстр
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
                    if (cell.defeated) {
                        symbol = '💀'; // Побежденный монстр
                        color = '#6b7280';
                    } else {
                        symbol = '👹'; // Живой монстр
                    }
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

    // ========== СИСТЕМА ПЕРЕМЕЩЕНИЯ ==========
    getAvailableMoves() {
        if (!this.currentTacticalMap) return [];
        
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        
        return neighbors;
    }

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
        
        const neighbors = [];
        const currentCell = this.currentTacticalMap.cells[`${currentCol},${currentRow}`];
        
        if (!currentCell) {
            return [];
        }
        
        const hexSize = this.currentTacticalMap.cellSize || 40;
        const geometry = this.getHexGeometry(hexSize);
        
        Object.values(this.currentTacticalMap.cells).forEach(potentialNeighbor => {
            if (potentialNeighbor.col === currentCol && potentialNeighbor.row === currentRow) {
                return;
            }
            
            const dx = potentialNeighbor.x - currentCell.x;
            const dy = potentialNeighbor.y - currentCell.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const isAdjacent = this.areHexesAdjacent(currentCell, potentialNeighbor, hexSize);
            
            if (isAdjacent) {
                // Проверяем можно ли пройти на клетку
                const canPass = potentialNeighbor.passable !== false || 
                               (potentialNeighbor.type === 'monster' && potentialNeighbor.defeated);
                
                if (potentialNeighbor.visible && canPass) {
                    neighbors.push({
                        row: potentialNeighbor.row,
                        col: potentialNeighbor.col,
                        cell: potentialNeighbor,
                        distance: distance
                    });
                }
            }
        });
        
        return neighbors;
    }

    areHexesAdjacent(cell1, cell2, hexSize) {
        if (!cell1 || !cell2) return false;
        
        const geometry = this.getHexGeometry(hexSize);
        
        const dx = cell2.x - cell1.x;
        const dy = cell2.y - cell1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const isHorizontalAdjacent = Math.abs(distance - geometry.horizontalDistance) < geometry.tolerance;
        const isVerticalAdjacent = Math.abs(distance - geometry.verticalDistance) < geometry.tolerance;
        const isDiagonalAdjacent = Math.abs(distance - geometry.diagonalDistance) < geometry.tolerance;
        
        const isAdjacent = isHorizontalAdjacent || isVerticalAdjacent || isDiagonalAdjacent;
        
        return isAdjacent;
    }

    // ========== БАЗОВЫЕ МЕТОДЫ КАРТ ==========
    createTestMaps() {
        this.tacticalMaps = [{
            id: 1,
            name: "Тестовая карта с монстрами",
            image: "",
            width: 6,
            height: 6,
            startPosition: {x: 3, y: 3},
            localPosition: {x: 4, y: 4},
            description: "Тестовая карта с разными монстрами",
            cells: {
                "3,3": {type: "start", passable: true, row: 3, col: 3, visible: true, x: 300, y: 300},
                "3,2": {type: "monster", passable: false, row: 2, col: 3, visible: true, x: 300, y: 250, monster_id: 1},
                "2,3": {type: "monster", passable: false, row: 3, col: 2, visible: true, x: 250, y: 300, monster_id: 2},
                "4,3": {type: "chest", passable: true, row: 3, col: 4, visible: true, x: 350, y: 300},
                "3,4": {type: "npc", passable: true, row: 4, col: 3, visible: true, x: 300, y: 350}
            }
        }];
    }

    createFallbackMaps() {
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
        if (this.tacticalMaps.length > 0 && !this.currentTacticalMap) {
            this.currentTacticalMap = this.tacticalMaps[0];
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
        }
    }

    // ========== ИНТЕРФЕЙС КАРТЫ ==========
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
                            if (cellData.defeated) {
                                cellContent = '💀';
                                title += ' (Побежден)';
                            } else {
                                cellContent = '👹';
                                if (cellData.monster_id) {
                                    title += ` (Монстр ID: ${cellData.monster_id})`;
                                }
                            }
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
            'monster': cellData.defeated ? 'Побежденный монстр' : 'Монстр',
            'chest': 'Сундук',
            'npc': 'NPC',
            'obstacle': 'Препятствие',
            'active': 'Активная клетка',
            'empty': 'Пустая клетка'
        };
        return descriptions[cellData.type] || cellData.type;
    }

    // ========== СИСТЕМА ОКНОВ ==========
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
            }

            container.style.display = 'block';
        }
    }

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
        
        if (this.canvasInitialized) {
            this.drawTacticalMap();
        }
    }

    updateMovementInfo() {
        const availableMoves = this.getAvailableMoves();
        
        const movesElement = document.getElementById('availableMoves');
        if (movesElement) {
            movesElement.textContent = availableMoves.length;
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

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.drawTacticalMap();
    }

    showTacticalMapEditor() {
        if (!this.currentHero) {
            console.error("❌ Герой не выбран для тактической карты!");
            if (window.game) {
                window.game.showNotification("❌ Сначала выберите героя!", 'error');
                setTimeout(() => {
                    window.game.showHeroSelection();
                }, 1000);
            }
            return;
        }
        
        this.showOverlay('tactical-map');
    }

    forceRedraw() {
        if (this.canvasInitialized) {
            this.drawTacticalMap();
        }
    }

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

    debugInfo() {
        console.group("🗺️ MapSystem Debug Info");
        console.log("Глобальная позиция:", this.playerGlobalPosition);
        console.log("Локальная позиция:", this.playerLocalPosition);
        console.log("Тактическая позиция:", this.playerTacticalPosition);
        console.log("Текущая глобальная карта:", this.currentGlobalMap?.name);
        console.log("Текущая локальная карта:", this.currentLocalMap?.name);
        console.log("Текущая тактическая карта:", this.currentTacticalMap?.name);
        console.log("Загружено JSON карт:", this.loadedJSONMaps.size);
        console.log("Текущий герой:", this.currentHero?.name || 'нет');
        console.groupEnd();
    }
}

window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен с системой конкретных монстров");
