"use strict";

class MapSystem {
    constructor() {
        this.globalMaps = [];
        this.localMaps = [];
        this.tacticalMaps = [];
        
        this.currentTacticalMap = null;
        this.currentGlobalMap = null;
        this.currentLocalMap = null;
        
        this.playerGlobalPosition = {x: 0, y: 0};
        this.playerLocalPosition = {x: 0, y: 0};
        this.playerTacticalPosition = {x: 0, y: 0};
        
        this.currentHero = null;
        this.loadedJSONMaps = new Map();
        this.activeOverlay = null;
        this.canvas = null;
        this.ctx = null;
        this.hexSize = 40;
        this.showGrid = false;
        this.hoveredHex = null;
        this.mapOffset = { x: 0, y: 0 };
        this.lastHoveredHex = null;
        this.animationFrame = null;
        this.pendingMovement = null;
        this.canvasInitialized = false;

        // Новые свойства для навигации
        this.mapStack = [];
        this.currentMapType = 'local';

        // Новые свойства для подсказок
        this.tooltipElement = null;
        this.currentTooltip = null;
        this.tooltipTimeout = null;

        // Словарь символов для всех типов объектов
        this.objectSymbols = {
            'player_start': '⭐',
            'monster': '👹',
            'chest': '📦',
            'npc': '🧙',
            'exit': '🚪',
            'obstacle': '🪨',
            'inactive': '🔴',
            'tree': '🌲',
            'elegant_tree': '🎄',
            'cave': '🕳️',
            'lava_crack': '🌋',
            'graveyard_cross': '⚰️',
            'bandit_camp': '⚔️',
            'orc_camp': '👹',
            'black_monolith': '⬛',
            'weapon': '⚔️',
            'armor': '🛡️',
            'village': '🏘️',
            'castle': '🏰',
            'water': '💧',
            'campfire': '🔥',
            'merchant': '🛒',
            'cart': '🛒',
            'traveler': '🚶',
            'portal': '🌀',
            'ancient_rune': '🔰',
            'magic_crystal': '💎'
        };

        console.log("✅ MapSystem инициализирован с системой переходов (Local <-> Tactical)");
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
            console.log("📥 Загружаем данные карт…");
            await this.loadJSONMaps();
            
            if (this.localMaps.length === 0 && this.tacticalMaps.length === 0) {
                this.createTestMaps();
            }
            
            this.setStartPositions();
            console.log(`✅ Карты загружены: Локальных=${this.localMaps.length}, Тактических=${this.tacticalMaps.length}`);
            return true;
        } catch (error) {
            console.error("❌ Ошибка загрузки данных карт:", error);
            this.createFallbackMaps();
            return true;
        }
    }

    async loadJSONMaps() {
        try {
            console.log("🔄 Загружаем JSON карты…");

            // 1. ПУТИ ДЛЯ ЛОКАЛЬНЫХ КАРТ
            const localMapPaths = [
                'data/maps/local/local-maps.json',
                'data/maps/local-maps.json',
                'maps/local-maps.json',
                'data/local-maps.json'
            ];

            // 2. ПУТИ ДЛЯ ТАКТИЧЕСКИХ КАРТ
            const tacticalMapPaths = [
                'data/maps/tactical/tactical-maps.json',
                'data/maps/tactical-maps.json',
                'maps/tactical-maps.json',
                'data/tactical-maps.json'
            ];

            // Загрузка локальных карт
            for (const path of localMapPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processTigrimionJSONMaps(mapData, 'local');
                        console.log(`✅ Локальные карты загружены из: ${path}`);
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить локальные карты из ${path}:`, e.message);
                }
            }

            // Загрузка тактических карт
            for (const path of tacticalMapPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processTigrimionJSONMaps(mapData, 'tactical');
                        console.log(`✅ Тактические карты загружены из: ${path}`);
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить тактические карты из ${path}:`, e.message);
                }
            }

            console.log("ℹ️ Загрузка JSON карт завершена");

        } catch (error) {
            console.error("❌ Ошибка загрузки JSON карт:", error);
        }
    }

    async processTigrimionJSONMaps(mapData, mapType = 'tactical') {
        if (!mapData || !mapData.meta) {
            console.warn(`❌ Неверный формат JSON карты Tigrimion (${mapType})`);
            return;
        }

        try {
            const convertedMap = this.convertTigrimionJSONToMap(mapData, mapType);
            if (convertedMap) {
                if (mapType === 'local') {
                    this.localMaps.push(convertedMap);
                    // Если это первая локальная карта, делаем её активной по умолчанию
                    if (this.localMaps.length === 1) {
                        this.setCurrentLocalMap(convertedMap);
                    }
                } else {
                    this.tacticalMaps.push(convertedMap);
                }
                
                this.loadedJSONMaps.set(convertedMap.id, convertedMap);
                console.log(`✅ Обработана ${mapType} карта: ${convertedMap.name}`);
            }
        } catch (error) {
            console.error(`❌ Ошибка обработки карты (${mapType}):`, error);
        }
    }

    convertTigrimionJSONToMap(jsonMap, mapType = 'tactical') {
        if (!jsonMap.game || !jsonMap.game.grid || !jsonMap.game.grid.cells) {
            console.warn("❌ Неверная структура карты Tigrimion");
            return null;
        }

        const cells = jsonMap.game.grid.cells;
        const convertedCells = {};
        
        console.log(`📥 Импортируем ${mapType} карту: ${jsonMap.meta?.name || 'Без названия'}`);
        console.log(`📊 Клеток в импорте: ${cells.length}`);

        cells.forEach(cell => {
            const key = `${cell.col},${cell.row}`;
            
            convertedCells[key] = {
                type: cell.type,
                passable: cell.passable !== false,
                visible: cell.visible !== false,
                originalX: cell.x,
                originalY: cell.y,
                x: cell.x,
                y: cell.y,
                row: cell.row,
                col: cell.col,
                monster_id: cell.monster_id,
                // СВОЙСТВА ДЛЯ ПЕРЕХОДОВ И ПОДСКАЗОК
                tacticalMap: cell.tacticalMap,
                returnX: cell.returnX,
                returnY: cell.returnY,
                tooltip: cell.tooltip,
                originalData: cell
            };
        });

        let startPosition = {x: 0, y: 0};
        const startCell = cells.find(cell => cell.type === 'player_start');
        if (startCell) {
            startPosition = {x: startCell.col, y: startCell.row};
            console.log(`🎯 Стартовая позиция: [${startCell.col},${startCell.row}]`);
        }

        const originalCanvasWidth = jsonMap.visual?.canvasWidth || 1024;
        const originalCanvasHeight = jsonMap.visual?.canvasHeight || 1024;

        console.log(`📐 Original canvas: ${originalCanvasWidth}x${originalCanvasHeight}`);

        return {
            id: mapType === 'local' ? `local_${this.localMaps.length + 1}` : `tactical_${this.tacticalMaps.length + 1}`,
            name: jsonMap.meta?.name || `${mapType === 'local' ? 'Локальная' : 'Тактическая'} карта`,
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
            cellSize: jsonMap.game.grid.cellSize || 40,
            originalCanvasWidth: originalCanvasWidth,
            originalCanvasHeight: originalCanvasHeight,
            mapType: mapType
        };
    }

    getMonsterFromCell(cellData) {
        if (!cellData || cellData.type !== 'monster' || !cellData.monster_id) {
            return null;
        }
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return null;
        return battleSystem.getMonsterById(cellData.monster_id);
    }

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
        
        const editorWidth = this.currentTacticalMap.originalCanvasWidth || 1024;
        const editorHeight = this.currentTacticalMap.originalCanvasHeight || 1024;
        
        console.log(`🎯 Editor canvas: ${editorWidth}x${editorHeight}`);
        console.log(`📐 Container: ${rect.width}x${rect.height}`);

        const scaleX = rect.width / editorWidth;
        const scaleY = rect.height / editorHeight;
        
        const scale = Math.min(scaleX, scaleY, 1.0);
        
        const offsetX = (rect.width - editorWidth * scale) / 2;
        const offsetY = (rect.height - editorHeight * scale) / 2;

        console.log(`📏 Scale: ${scale.toFixed(3)}, Offset: [${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}]`);

        this.currentTacticalMap.displayScale = scale;
        this.currentTacticalMap.displayOffsetX = offsetX;
        this.currentTacticalMap.displayOffsetY = offsetY;

        Object.values(this.currentTacticalMap.cells).forEach(cell => {
            const originalX = cell.originalX || cell.x;
            const originalY = cell.originalY || cell.y;
            
            cell.displayX = originalX * scale + offsetX;
            cell.displayY = originalY * scale + offsetY;
        });

        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    setupCanvasEventListeners() {
        if (!this.canvas) return;
        
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
        this.canvas.addEventListener('mouseleave', () => this.hideTooltip());
        
        window.addEventListener('resize', () => {
            setTimeout(() => {
                if (this.canvasInitialized) {
                    this.calculateMapPositioning();
                    this.forceRedraw();
                }
            }, 100);
        });
    }

    // ========== ОБРАБОТКА КЛИКОВ И ПЕРЕХОДОВ ==========
    
    handleCanvasClick(e) {
        if (!this.currentTacticalMap) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = this.getHexAtCanvasPosition(x, y);
        
        if (!hex) return;

        console.log(`🎲 Клик по клетке: [${hex.col}, ${hex.row}] тип: ${hex.type}`);

        // 1. ПРОВЕРКА НА ВХОД В ЗДАНИЕ/ТАКТИЧЕСКУЮ КАРТУ
        if (this.currentMapType === 'local' && hex.tacticalMap) {
            this.enterTacticalMap(hex);
            return;
        }
        
        // 2. ПРОВЕРКА НА ВЫХОД ИЗ ТАКТИЧЕСКОЙ КАРТЫ
        if (this.currentMapType === 'tactical' && hex.type === 'exit') {
            this.exitToLocalMap();
            return;
        }

        // 3. ОБЫЧНОЕ ПЕРЕМЕЩЕНИЕ / БОЙ
        if (hex.passable !== false || hex.type === 'monster') {
            this.moveOnTacticalMap(hex.col, hex.row);
        }
    }

    // --- МЕТОДЫ НАВИГАЦИИ (ВХОД / ВЫХОД) ---

    async enterTacticalMap(entranceCell) {
        if (!entranceCell.tacticalMap) return;
        
        console.log(`🚪 Попытка входа в: ${entranceCell.tacticalMap}`);

        // 1. Сохраняем текущее состояние (Локальную карту) в стек
        this.saveCurrentMapToStack();

        // 2. Пытаемся загрузить тактическую карту
        await this.loadTacticalMapFile(entranceCell.tacticalMap);
    }

    exitToLocalMap() {
        if (this.mapStack.length === 0) {
            console.log("🚫 Стек карт пуст, некуда выходить");
            return;
        }

        console.log("🚪 Выход из тактической карты…");

        // 1. Восстанавливаем состояние из стека
        this.restoreLocalMapFromStack();
    }

    saveCurrentMapToStack() {
        const mapState = {
            map: this.currentTacticalMap,
            playerPosition: {...this.playerTacticalPosition},
            mapType: this.currentMapType,
        };
        this.mapStack.push(mapState);
        console.log(`💾 Карта сохранена в стек. Размер стека: ${this.mapStack.length}`);
    }

    restoreLocalMapFromStack() {
        const savedState = this.mapStack.pop();
        if (savedState) {
            this.currentTacticalMap = savedState.map;
            this.playerTacticalPosition = savedState.playerPosition;
            this.currentMapType = savedState.mapType;
            
            console.log(`♻️ Восстановлена карта: ${this.currentTacticalMap.name}`);
            
            if (this.canvasInitialized) {
                this.calculateMapPositioning();
                this.drawTacticalMap();
            }
            
            if (window.game) {
                window.game.showNotification(`Возврат в ${this.currentTacticalMap.name}`, 'info');
            }
        }
    }

    async loadTacticalMapFile(mapPath) {
        try {
            console.log(`📥 Загрузка файла тактической карты: ${mapPath}`);
            
            let fullPath = mapPath;
            if (!mapPath.includes('/') && !mapPath.includes('.json')) {
                fullPath = `data/maps/tactical/${mapPath}.json`;
            }

            const response = await fetch(fullPath);
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            const mapData = await response.json();
            const tacticalMap = this.convertTigrimionJSONToMap(mapData, 'tactical');
            
            if (tacticalMap) {
                this.currentTacticalMap = tacticalMap;
                this.currentMapType = 'tactical';
                this.setPlayerToStartPosition();
                
                if (this.canvasInitialized) {
                    this.calculateMapPositioning();
                    this.drawTacticalMap();
                }
                
                console.log(`✅ Вход выполнен в: ${tacticalMap.name}`);
                if (window.game) window.game.showNotification(`Вход: ${tacticalMap.name}`, 'success');
            }

        } catch (error) {
            console.error(`❌ Ошибка при загрузке тактической карты ${mapPath}:`, error);
            if (window.game) window.game.showNotification("Ошибка загрузки карты", 'error');
        }
    }

    setPlayerToStartPosition() {
        if (!this.currentTacticalMap) return;
        
        const startCell = Object.values(this.currentTacticalMap.cells)
            .find(cell => cell.type === 'player_start');
        
        if (startCell) {
            this.playerTacticalPosition = {x: startCell.col, y: startCell.row};
            console.log(`🎯 Герой перемещен на старт: [${startCell.col}, ${startCell.row}]`);
        }
    }

    // --- КОНЕЦ МЕТОДОВ НАВИГАЦИИ ---

    handleCanvasHover(e) {
        if (!this.currentTacticalMap) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = this.getHexAtCanvasPosition(x, y);

        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }

        const prevHex = this.currentTooltip;

        if (!hex || (prevHex && hex && (prevHex.col !== hex.col || prevHex.row !== hex.row))) {
            this.hideTooltip();
        }

        if (hex && (!prevHex || prevHex.col !== hex.col || prevHex.row !== hex.row)) {
            this.tooltipTimeout = setTimeout(() => {
                this.showTooltipForHex(hex, e.clientX, e.clientY);
            }, 200);
        }
    }

    getHexAtCanvasPosition(canvasX, canvasY) {
        if (!this.currentTacticalMap) return null;
        
        const hexSize = (this.currentTacticalMap.cellSize || 40) * 0.8;

        if (this.lastHoveredHex) {
            const centerX = this.lastHoveredHex.displayX;
            const centerY = this.lastHoveredHex.displayY;
            if (centerX && centerY) {
                const distance = Math.sqrt(
                    Math.pow(canvasX - centerX, 2) + Math.pow(canvasY - centerY, 2)
                );
                if (distance <= hexSize) {
                    return this.lastHoveredHex;
                }
            }
        }

        for (const cell of Object.values(this.currentTacticalMap.cells)) {
            const centerX = cell.displayX;
            const centerY = cell.displayY;
            
            if (!centerX || !centerY) continue;

            const distance = Math.sqrt(
                Math.pow(canvasX - centerX, 2) + Math.pow(canvasY - centerY, 2)
            );

            if (distance <= hexSize) {
                this.lastHoveredHex = cell;
                return cell;
            }
        }

        this.lastHoveredHex = null;
        return null;
    }

    showTooltipForHex(hex, mouseX, mouseY) {
        const tooltipText = this.getTooltipTextForHex(hex);
        if (!tooltipText) {
            this.hideTooltip();
            return;
        }

        if (!this.tooltipElement) {
            this.createTooltipElement();
        }

        this.removeHighlight();
        this.currentTooltip = hex;
        hex.isHighlighted = true;

        this.tooltipElement.textContent = tooltipText;
        this.tooltipElement.style.display = 'block';

        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = mouseX + 15;
        let top = mouseY + 15;

        if (left + tooltipRect.width > viewportWidth - 10) {
            left = mouseX - tooltipRect.width - 15;
        }
        if (top + tooltipRect.height > viewportHeight - 10) {
            top = mouseY - tooltipRect.height - 15;
        }

        this.tooltipElement.style.left = left + 'px';
        this.tooltipElement.style.top = top + 'px';

        this.drawTacticalMap();
    }

    getTooltipTextForHex(hex) {
        if (!hex.visible) return null;

        if (hex.tooltip) return hex.tooltip;

        if (hex.tacticalMap) return `🚪 Вход: ${hex.type}\n(Нажмите для входа)`;

        const defaultTooltips = {
            'player_start': '⭐ Стартовая позиция',
            'monster': '👹 Враждебная территория',
            'chest': '📦 Тайный сундук',
            'npc': '🧙 Таинственный незнакомец',
            'exit': '🚪 Выход с карты',
            'obstacle': '🪨 Препятствие',
            'active': '🟢 Проходимая местность',
            'inactive': '🔴 Непроходимая местность',
            'tree': '🌲 Дерево',
            'elegant_tree': '🎄 Изящное дерево',
            'cave': '🕳️ Пещера',
            'lava_crack': '🌋 Лавовый разлом',
            'graveyard_cross': '⚰️ Кладбищенский крест',
            'bandit_camp': '⚔️ Лагерь разбойников',
            'orc_camp': '👹 Лагерь орков',
            'black_monolith': '⬛ Черный монолит',
            'weapon': '⚔️ Оружие',
            'armor': '🛡️ Доспех',
            'village': '🏘️ Деревня',
            'castle': '🏰 Замок',
            'water': '💧 Водная поверхность',
            'campfire': '🔥 Костер',
            'merchant': '🛒 Торговец',
            'cart': '🛒 Телега',
            'traveler': '🚶 Путник',
            'portal': '🌀 Магический портал',
            'ancient_rune': '🔰 Древняя руна',
            'magic_crystal': '💎 Магический кристалл'
        };

        return defaultTooltips[hex.type] || null;
    }

    createTooltipElement() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.id = 'mapTooltip';
        this.tooltipElement.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #00ffff;
            font-size: 12px;
            font-family: Arial, sans-serif;
            z-index: 10000;
            pointer-events: none;
            white-space: pre-line;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            display: none;
            max-width: 250px;
            line-height: 1.4;
        `;
        document.body.appendChild(this.tooltipElement);
    }

    hideTooltip() {
        if (this.tooltipElement) {
            this.tooltipElement.style.display = 'none';
        }
        this.removeHighlight();
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }
    }

    highlightHex(hex) {
        if (!hex || hex.isHighlighted) return;
        hex.isHighlighted = true;
        this.drawSingleHexWithHighlight(hex);
    }

    removeHighlight() {
        let needsRedraw = false;
        if (this.currentTacticalMap) {
            Object.values(this.currentTacticalMap.cells).forEach(cell => {
                if (cell.isHighlighted) {
                    cell.isHighlighted = false;
                    needsRedraw = true;
                }
            });
        }
        this.currentTooltip = null;
        if (needsRedraw && this.canvasInitialized) {
            this.drawTacticalMap();
        }
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

        const editorWidth = map.originalCanvasWidth || 1024;
        const editorHeight = map.originalCanvasHeight || 1024;
        const scale = map.displayScale || 1;
        const offsetX = map.displayOffsetX || 0;
        const offsetY = map.displayOffsetY || 0;

        const img = new Image();
        img.onload = () => {
            if (this.currentTacticalMap !== map) return;
            
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(
                img,
                offsetX,
                offsetY,
                editorWidth * scale,
                editorHeight * scale
            );
            this.drawHexes();
            if (this.showGrid) {
                this.drawHexGrid();
            }
        };
        img.onerror = () => {
            console.error("❌ Ошибка загрузки фона карты");
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawHexes();
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
                const centerX = cell.displayX;
                const centerY = cell.displayY;
                
                if (!centerX || !centerY) return;

                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = Math.PI / 3 * i + Math.PI / 6;
                    const x = centerX + hexSize * Math.cos(angle);
                    const y = centerY + hexSize * Math.sin(angle);
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
        const centerX = cell.displayX;
        const centerY = cell.displayY;
        
        if (!centerX || !centerY) return;

        this.ctx.save();
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = centerX + hexSize * Math.cos(angle);
            const y = centerY + hexSize * Math.sin(angle);
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        
        if (this.showGrid) {
            this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawHexContent(cell) {
        const centerX = cell.displayX;
        const centerY = cell.displayY;
        
        if (!centerX || !centerY) return;

        this.ctx.save();

        if (cell.isHighlighted) {
            const hexSize = this.currentTacticalMap.cellSize || 40;
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i + Math.PI / 6;
                const x = centerX + hexSize * Math.cos(angle);
                const y = centerY + hexSize * Math.sin(angle);
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            this.ctx.fill();
        }

        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        let symbol = '·';
        let color = '#ffffff';
        let fontSize = 16;

        if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
            symbol = '🎯';
            fontSize = 20;
        } else {
            if (cell.type === 'active' && !cell.objectType) {
                symbol = '·';
                color = '#ffffff';
                fontSize = 24;
            } else {
                symbol = this.objectSymbols[cell.type] || '·';
                
                switch(cell.type) {
                    case 'monster':
                    case 'orc_camp':
                        color = '#ef4444'; break;
                    case 'chest':
                        color = '#f59e0b'; break;
                    case 'npc':
                    case 'merchant':
                    case 'traveler':
                        color = '#3b82f6'; break;
                    case 'exit':
                    case 'portal':
                        color = '#8b5cf6'; break;
                    case 'obstacle':
                    case 'tree':
                    case 'elegant_tree':
                    case 'cave':
                    case 'black_monolith':
                        color = '#6b7280'; break;
                    case 'lava_crack':
                        color = '#dc2626'; break;
                    case 'graveyard_cross':
                        color = '#d6d3d1'; break;
                    case 'bandit_camp':
                        color = '#ca8a04'; break;
                    case 'weapon':
                        color = '#94a3b8'; break;
                    case 'armor':
                        color = '#60a5fa'; break;
                    case 'village':
                        color = '#fbbf24'; break;
                    case 'castle':
                        color = '#c084fc'; break;
                    case 'water':
                        color = '#0ea5e9'; break;
                    case 'campfire':
                        color = '#ea580c'; break;
                    case 'cart':
                        color = '#78350f'; break;
                    case 'ancient_rune':
                        color = '#fde047'; break;
                    case 'magic_crystal':
                        color = '#c4b5fd'; break;
                    case 'inactive':
                        color = '#ef4444'; break;
                    default:
                        color = '#ffffff';
                }
            }
        }

        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(symbol, centerX, centerY);
        
        this.ctx.restore();
    }

    drawSingleHexWithHighlight(hex) {
        // Реализация метода для подсветки гекса
        if (!hex || !this.ctx) return;
        
        const centerX = hex.displayX;
        const centerY = hex.displayY;
        const hexSize = this.currentTacticalMap.cellSize || 40;
        
        if (!centerX || !centerY) return;

        this.ctx.save();
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = centerX + hexSize * Math.cos(angle);
            const y = centerY + hexSize * Math.sin(angle);
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        this.ctx.fill();
        this.ctx.restore();
    }

    // ========== СИСТЕМА ПЕРЕМЕЩЕНИЯ ==========
    
    moveOnTacticalMap(x, y) {
        if (!this.currentHero) {
            console.error("❌ Герой не выбран!");
            if (window.game) {
                window.game.showNotification("❌ Герой не выбран!", 'error');
            }
            return;
        }

        if (!this.currentTacticalMap) return;

        const cellKey = `${x},${y}`;
        const cellData = this.currentTacticalMap.cells[cellKey];

        if (!cellData) {
            if (window.game) window.game.showNotification("Эта клетка не существует!", 'error');
            return;
        }

        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        const isReachable = neighbors.some(neighbor => neighbor.row === y && neighbor.col === x);

        if (!isReachable) {
            if (window.game) window.game.showNotification("Слишком далеко!", 'error');
            return;
        }

        this.hideOverlay();
        setTimeout(() => {
            this.startTacticalBattleForMovement(x, y, cellData);
        }, 50);
    }

    startTacticalBattleForMovement(targetX, targetY, cellData) {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return;

        this.pendingMovement = { x: targetX, y: targetY };

        const specificMonster = this.getMonsterFromCell(cellData);
        
        if (specificMonster && cellData.monster_id) {
            console.log(`🎯 Бой с монстром: ${specificMonster.name}`);
            battleSystem.startBattleWithSpecificMonster(this.currentHero, specificMonster, 'movement');
        } else {
            const randomMonster = this.getRandomMonster();
            if (!randomMonster) {
                this.completeMovementAfterBattle(true);
                return;
            }
            console.log(`🎲 Случайный бой: ${randomMonster.name}`);
            battleSystem.startBattleWithMonster(this.currentHero, randomMonster.id, 'movement');
        }
    }

    getRandomMonster() {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem || !battleSystem.getRandomMonsterForMovement) return null;
        return battleSystem.getRandomMonsterForMovement();
    }

    completeMovementAfterBattle(victory) {
        if (!this.pendingMovement) return;

        const targetX = this.pendingMovement.x;
        const targetY = this.pendingMovement.y;

        if (!this.currentHero) return;

        if (victory) {
            this.playerTacticalPosition = {x: targetX, y: targetY};
            console.log(`✅ Перемещение успешно: [${targetX}, ${targetY}]`);
        } else {
            const startPosition = this.currentTacticalMap.startPosition;
            this.playerTacticalPosition = {...startPosition};
            if (window.game) window.game.showNotification("Поражение! Возврат на старт.", 'error');
        }

        this.saveMapState();
        
        if (this.activeOverlay === 'tactical-map') {
            this.calculateMapPositioning();
            this.drawTacticalMap();
        }
        
        this.pendingMovement = null;
    }

    getHexNeighbors(currentRow, currentCol) {
        if (!this.currentTacticalMap) return [];
        const neighbors = [];
        const currentCell = this.currentTacticalMap.cells[`${currentCol},${currentRow}`];
        
        if (!currentCell) return [];

        const hexSize = this.currentTacticalMap.cellSize || 40;

        Object.values(this.currentTacticalMap.cells).forEach(potentialNeighbor => {
            if (potentialNeighbor.col === currentCol && potentialNeighbor.row === currentRow) return;

            const centerX = potentialNeighbor.displayX || potentialNeighbor.x;
            const centerY = potentialNeighbor.displayY || potentialNeighbor.y;
            const currentCenterX = currentCell.displayX || currentCell.x;
            const currentCenterY = currentCell.displayY || currentCell.y;
            
            const dx = centerX - currentCenterX;
            const dy = centerY - currentCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (this.areHexesAdjacent(currentCell, potentialNeighbor, hexSize)) {
                if (potentialNeighbor.visible) {
                    if (potentialNeighbor.type === 'monster' || potentialNeighbor.passable !== false) {
                        neighbors.push({
                            row: potentialNeighbor.row,
                            col: potentialNeighbor.col,
                            cell: potentialNeighbor,
                            distance: distance
                        });
                    }
                }
            }
        });
        return neighbors;
    }

    getHexGeometry(hexSize) {
        return {
            size: hexSize,
            horizontalDistance: Math.sqrt(3) * hexSize,
            verticalDistance: 1.5 * hexSize,
            diagonalDistance: Math.sqrt(3.25) * hexSize,
            tolerance: hexSize * 0.4
        };
    }

    areHexesAdjacent(cell1, cell2, hexSize) {
        if (!cell1 || !cell2) return false;
        const geometry = this.getHexGeometry(hexSize);
        
        const dx = (cell2.displayX || cell2.x) - (cell1.displayX || cell1.x);
        const dy = (cell2.displayY || cell2.y) - (cell1.displayY || cell1.y);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const isHorizontalAdjacent = Math.abs(distance - geometry.horizontalDistance) < geometry.tolerance;
        const isVerticalAdjacent = Math.abs(distance - geometry.verticalDistance) < geometry.tolerance;
        const isDiagonalAdjacent = Math.abs(distance - geometry.diagonalDistance) < geometry.tolerance;
        
        return isHorizontalAdjacent || isVerticalAdjacent || isDiagonalAdjacent;
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ И ИНИЦИАЛИЗАЦИЯ ==========

    createTestMaps() {
        this.localMaps = [{
            id: 'test_local_1',
            name: "Тестовая Долина",
            width: 8,
            height: 8,
            startPosition: {x: 4, y: 4},
            cells: {},
            cellSize: 40
        }];
    }

    createFallbackMaps() {
        this.createTestMaps();
    }

    setCurrentLocalMap(localMap) {
        if (!localMap) return;
        this.currentLocalMap = localMap;
        this.currentTacticalMap = localMap;
        this.playerLocalPosition = {...localMap.startPosition};
        this.playerTacticalPosition = {...localMap.startPosition};
        this.currentMapType = 'local';
        
        console.log(`📍 Установлена активная локальная карта: ${localMap.name}`);
        
        if (this.canvasInitialized) {
            this.calculateMapPositioning();
            this.drawTacticalMap();
        }
    }

    setStartPositions() {
        if (this.localMaps.length > 0) {
            const localMap = this.localMaps[0];
            this.setCurrentLocalMap(localMap);
        } else if (this.tacticalMaps.length > 0) {
            this.currentTacticalMap = this.tacticalMaps[0];
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
            this.currentMapType = 'tactical';
            console.log(`🎯 Установлена стартовая тактическая карта: ${this.currentTacticalMap.name}`);
        }
    }

    // РЕНДЕРИНГ HTML
    
    renderTigrimionTacticalMap() {
        const map = this.currentTacticalMap;
        if (!map) return '<div class="map-error">Карта не выбрана</div>';
        
        return `
            <div class="tactical-map-header">
                <h4>${map.name}</h4>
                <button class="btn-close" onclick="game.hideOverlay()">✕</button>
            </div>
            <div class="tactical-map-content">
                <div class="tactical-map-visual">
                </div>
            </div>
        `;
    }

    renderLocalMap() {
        if (this.currentLocalMap) {
            return this.renderTigrimionTacticalMap();
        }
        return '<div class="map-error">Локальная карта не загружена</div>';
    }

    renderGlobalMap() {
        return '<div class="map-error">Глобальная карта пока не доступна</div>';
    }

    showOverlay(overlayType) {
        const container = document.getElementById('overlay-container');
        if (!container) return;

        this.activeOverlay = overlayType;

        if (overlayType === 'tactical-map' || overlayType === 'local-map') {
            container.innerHTML = `
                <div class="overlay-content tactical-map-overlay">
                    ${this.renderTigrimionTacticalMap()}
                </div>
            `;
            container.style.display = 'block';
            setTimeout(() => {
                this.initCanvas();
            }, 50);
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
            this.hideTooltip();
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
            if (window.game) {
                window.game.showNotification("❌ Сначала выберите героя!", 'error');
                setTimeout(() => { window.game.showHeroSelection(); }, 1000);
            }
            return;
        }
        this.showOverlay('tactical-map');
    }

    forceRedraw() {
        if (this.canvasInitialized) {
            this.calculateMapPositioning();
            this.drawTacticalMap();
        }
    }

    saveMapState() {
        const state = {
            playerTacticalPosition: this.playerTacticalPosition,
            currentMapStack: this.mapStack,
            currentMapId: this.currentTacticalMap?.id,
            currentMapType: this.currentMapType
        };
        localStorage.setItem('mapSystemState', JSON.stringify(state));
        console.log("💾 Состояние карт сохранено");
    }

    loadMapState() {
        try {
            const saved = localStorage.getItem('mapSystemState');
            if (!saved) return false;
            
            const state = JSON.parse(saved);
            
            if (state.playerTacticalPosition) {
                this.playerTacticalPosition = state.playerTacticalPosition;
            }
            
            if (state.currentMapStack) {
                this.mapStack = state.currentMapStack;
            }

            if (state.currentMapType) {
                this.currentMapType = state.currentMapType;
            }

            let restoredMap = null;
            if (state.currentMapType === 'local') {
                restoredMap = this.localMaps.find(m => m.id === state.currentMapId);
            } else {
                restoredMap = this.tacticalMaps.find(m => m.id === state.currentMapId);
            }

            if (restoredMap) {
                this.currentTacticalMap = restoredMap;
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
        console.log("Тип карты:", this.currentMapType);
        console.log("Тактическая позиция:", this.playerTacticalPosition);
        console.log("Стек карт:", this.mapStack);
        console.log("Текущая карта:", this.currentTacticalMap?.name);
        console.log("Всего локальных карт:", this.localMaps.length);
        console.log("Всего тактических карт:", this.tacticalMaps.length);
        console.groupEnd();
    }
}

window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен");
