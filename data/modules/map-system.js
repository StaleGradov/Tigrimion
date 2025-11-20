"use strict";

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
        
        // Canvas системы для разных типов карт
        this.canvas = null;
        this.ctx = null;
        this.currentCanvasType = null; // 'global', 'local', 'tactical'
        
        this.hexSize = 40;
        this.showGrid = false;
        this.hoveredHex = null;
        
        this.mapOffset = { x: 0, y: 0 };
        
        this.lastHoveredHex = null;
        this.animationFrame = null;
        
        this.pendingMovement = null;
        
        this.canvasInitialized = false;
        
        // Система подсказок
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
            'magic_crystal': '💎',
            // Специальные для глобальной карты
            'continent': '🗺️',
            'ocean': '🌊',
            'mountain': '⛰️',
            'forest': '🌲',
            'desert': '🏜️',
            'city': '🏙️',
            'dungeon': '🏰',
            'quest_location': '📍',
            // Специальные для локальной карты
            'plains': '🌾',
            'hills': '⛰️',
            'river': '🌊',
            'bridge': '🌉',
            'tower': '🏯'
        };
        
        console.log("✅ MapSystem инициализирован с системой подсказок для всех карт");
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
            
            // Загружаем тактические карты
            const tacticalPaths = [
                'data/maps/tactical/tactical-maps.json',
                'data/maps/tactical-maps.json',
                'maps/tactical-maps.json', 
                'data/tactical-maps.json',
                'tactical-maps.json',
                'data/modules/maps/tactical-maps.json'
            ];
            
            for (const path of tacticalPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processTigrimionJSONMaps(mapData);
                        console.log(`✅ Тактические карты загружены из: ${path}`);
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить из ${path}:`, e.message);
                }
            }
            
            // Загружаем локальные карты
            const localPaths = [
                'data/maps/local/local-maps.json',
                'data/maps/local-maps.json',
                'maps/local-maps.json',
                'data/local-maps.json',
                'local-maps.json'
            ];
            
            for (const path of localPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processLocalJSONMaps(mapData);
                        console.log(`✅ Локальные карты загружены из: ${path}`);
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить локальные карты из ${path}:`, e.message);
                }
            }
            
            // Загружаем глобальные карты
            const globalPaths = [
                'data/maps/global/global-maps.json',
                'data/maps/global-maps.json',
                'maps/global-maps.json',
                'data/global-maps.json',
                'global-maps.json'
            ];
            
            for (const path of globalPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processGlobalJSONMaps(mapData);
                        console.log(`✅ Глобальные карты загружены из: ${path}`);
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить глобальные карты из ${path}:`, e.message);
                }
            }
            
            console.log("ℹ️ JSON карты загружены или созданы тестовые данные");
            
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
            console.error(`❌ Ошибка обработки тактической карты:`, error);
        }
    }

    async processLocalJSONMaps(mapData) {
        if (!mapData || !Array.isArray(mapData.maps)) {
            console.warn("❌ Неверный формат JSON локальных карт");
            this.createTestLocalMaps();
            return;
        }

        try {
            mapData.maps.forEach(localMap => {
                const convertedMap = this.convertLocalJSONToMap(localMap);
                if (convertedMap) {
                    this.localMaps.push(convertedMap);
                    console.log(`✅ Обработана локальная карта: ${convertedMap.name}`);
                }
            });
        } catch (error) {
            console.error(`❌ Ошибка обработки локальных карт:`, error);
            this.createTestLocalMaps();
        }
    }

    async processGlobalJSONMaps(mapData) {
        if (!mapData || !Array.isArray(mapData.maps)) {
            console.warn("❌ Неверный формат JSON глобальных карт");
            this.createTestGlobalMaps();
            return;
        }

        try {
            mapData.maps.forEach(globalMap => {
                const convertedMap = this.convertGlobalJSONToMap(globalMap);
                if (convertedMap) {
                    this.globalMaps.push(convertedMap);
                    console.log(`✅ Обработана глобальная карта: ${convertedMap.name}`);
                }
            });
        } catch (error) {
            console.error(`❌ Ошибка обработки глобальных карт:`, error);
            this.createTestGlobalMaps();
        }
    }

    convertTigrimionJSONToMap(jsonMap) {
        if (!jsonMap.game || !jsonMap.game.grid || !jsonMap.game.grid.cells) {
            console.warn("❌ Неверная структура карты Tigrimion");
            return null;
        }

        const cells = jsonMap.game.grid.cells;
        const convertedCells = {};
        
        console.log(`📥 Импортируем тактическую карту: ${jsonMap.meta?.name || 'Без названия'}`);
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
            cellSize: jsonMap.game.grid.cellSize || 40,
            originalCanvasWidth: originalCanvasWidth,
            originalCanvasHeight: originalCanvasHeight
        };
    }

    convertLocalJSONToMap(localMap) {
        return {
            id: localMap.id || this.localMaps.length + 1,
            name: localMap.name || "Локальная карта",
            image: localMap.image || "",
            width: localMap.width || 10,
            height: localMap.height || 10,
            startPosition: localMap.startPosition || {x: 0, y: 0},
            description: localMap.description || "Локальная область",
            globalPosition: localMap.globalPosition || {x: 0, y: 0},
            cells: localMap.cells || {},
            renderType: 'square'
        };
    }

    convertGlobalJSONToMap(globalMap) {
        return {
            id: globalMap.id || this.globalMaps.length + 1,
            name: globalMap.name || "Глобальная карта",
            image: globalMap.image || "",
            width: globalMap.width || 8,
            height: globalMap.height || 8,
            startPosition: globalMap.startPosition || {x: 0, y: 0},
            description: globalMap.description || "Глобальный мир",
            cells: globalMap.cells || {},
            renderType: 'square'
        };
    }

    // ========== ОСНОВНЫЕ МЕТОДЫ ОТОБРАЖЕНИЯ КАРТ ==========

    showOverlay(overlayType) {
        if (['global-map', 'local-map', 'tactical-map'].includes(overlayType)) {
            const container = document.getElementById('overlay-container');
            if (!container) return;

            this.activeOverlay = overlayType;
            this.currentCanvasType = overlayType.replace('-map', '');
            
            container.innerHTML = `
                <div class="overlay-content ${overlayType}-overlay">
                    <div class="tactical-map-header">
                        <h4>${this.getMapTitle(overlayType)}</h4>
                        <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                    </div>
                    <div class="tactical-map-content">
                        <div class="tactical-map-visual" id="${overlayType}-visual">
                            <!-- Canvas будет добавлен автоматически -->
                        </div>
                        <div class="tactical-map-info">
                            ${this.renderMapInfo(overlayType)}
                        </div>
                    </div>
                </div>
            `;
            container.style.display = 'block';
            
            setTimeout(() => {
                this.initCanvas(overlayType);
                if (overlayType === 'tactical-map') {
                    this.updateMovementInfo();
                }
            }, 50);
            
        } else {
            // Остальные оверлеи (инвентарь, магазин и т.д.)
            const container = document.getElementById('overlay-container');
            if (!container) return;

            this.activeOverlay = overlayType;

            switch(overlayType) {
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

    getMapTitle(overlayType) {
        const titles = {
            'global-map': '🗺️ Глобальная карта',
            'local-map': '📍 Локальная карта', 
            'tactical-map': '🎲 Тактическая карта'
        };
        return titles[overlayType] || 'Карта';
    }

    renderMapInfo(overlayType) {
        const currentMap = this.getCurrentMap(overlayType);
        const playerPos = this.getPlayerPosition(overlayType);
        
        if (!currentMap) {
            return '<div class="map-error">Карта не загружена</div>';
        }

        let infoHTML = `
            <div class="map-description">${currentMap.description || 'Описание отсутствует'}</div>
            <div class="player-position">📍 Позиция: [${playerPos.x}, ${playerPos.y}]</div>
            <div class="map-stats">📏 Размер: ${currentMap.width || '?'}x${currentMap.height || '?'}</div>
        `;

        if (overlayType === 'tactical-map') {
            infoHTML += `
                <div class="movement-info">
                    🎯 Доступных ходов: <span id="availableMoves">0</span>
                </div>
            `;
        }

        return infoHTML;
    }

    getCurrentMap(overlayType) {
        switch(overlayType) {
            case 'global-map': return this.currentGlobalMap;
            case 'local-map': return this.currentLocalMap;
            case 'tactical-map': return this.currentTacticalMap;
            default: return null;
        }
    }

    getPlayerPosition(overlayType) {
        switch(overlayType) {
            case 'global-map': return this.playerGlobalPosition;
            case 'local-map': return this.playerLocalPosition;
            case 'tactical-map': return this.playerTacticalPosition;
            default: return {x: 0, y: 0};
        }
    }

    // ========== УНИВЕРСАЛЬНАЯ СИСТЕМА CANVAS ==========

    initCanvas(overlayType) {
        const container = document.getElementById(`${overlayType}-visual`);
        if (!container) {
            console.log("❌ Контейнер для карты не найден");
            return;
        }

        container.innerHTML = '';

        this.canvas = document.createElement('canvas');
        this.canvas.id = `${overlayType}Canvas`;
        
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.position = 'absolute';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.cursor = 'pointer';
        container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        
        this.calculateMapPositioning(overlayType);
        this.setupCanvasEventListeners(overlayType);
        
        this.canvasInitialized = true;
        console.log(`✅ Canvas инициализирован для ${overlayType}`);
        this.drawCurrentMap(overlayType);
    }

    calculateMapPositioning(overlayType) {
        const currentMap = this.getCurrentMap(overlayType);
        if (!currentMap || !this.canvas) return;

        const container = document.getElementById(`${overlayType}-visual`);
        if (!container) return;

        const rect = container.getBoundingClientRect();
        
        let editorWidth, editorHeight;

        if (overlayType === 'tactical-map' && currentMap.jsonData) {
            editorWidth = currentMap.originalCanvasWidth || 1024;
            editorHeight = currentMap.originalCanvasHeight || 1024;
        } else {
            // Для глобальных и локальных карт используем стандартные размеры
            editorWidth = 800;
            editorHeight = 600;
        }

        const scaleX = rect.width / editorWidth;
        const scaleY = rect.height / editorHeight;
        const scale = Math.min(scaleX, scaleY, 1.0);

        const offsetX = (rect.width - editorWidth * scale) / 2;
        const offsetY = (rect.height - editorHeight * scale) / 2;

        // Сохраняем параметры отображения для текущей карты
        currentMap.displayParams = {
            scale: scale,
            offsetX: offsetX,
            offsetY: offsetY,
            containerWidth: rect.width,
            containerHeight: rect.height
        };

        // Для тактических карт обновляем координаты отображения
        if (overlayType === 'tactical-map' && currentMap.cells) {
            Object.values(currentMap.cells).forEach(cell => {
                const originalX = cell.originalX || cell.x;
                const originalY = cell.originalY || cell.y;
                
                cell.displayX = originalX * scale + offsetX;
                cell.displayY = originalY * scale + offsetY;
            });
        }

        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    setupCanvasEventListeners(overlayType) {
        if (!this.canvas) return;

        // Убираем старые обработчики
        this.canvas.replaceWith(this.canvas.cloneNode(true));
        this.canvas = document.getElementById(`${overlayType}Canvas`);
        this.ctx = this.canvas.getContext('2d');

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e, overlayType));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e, overlayType));
        this.canvas.addEventListener('mouseleave', () => this.hideTooltip());

        window.addEventListener('resize', () => {
            setTimeout(() => {
                if (this.canvasInitialized && this.activeOverlay === overlayType) {
                    this.calculateMapPositioning(overlayType);
                    this.forceRedraw(overlayType);
                }
            }, 100);
        });
    }

    handleCanvasClick(e, overlayType) {
        const currentMap = this.getCurrentMap(overlayType);
        if (!currentMap) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (overlayType === 'tactical-map') {
            const hex = this.getHexAtCanvasPosition(x, y);
            if (hex && (hex.passable !== false || hex.type === 'monster')) {
                console.log(`🎲 Клик по клетке: [${hex.col}, ${hex.row}] тип: ${hex.type}`);
                this.moveOnTacticalMap(hex.col, hex.row);
            }
        } else if (overlayType === 'global-map') {
            this.handleGlobalMapClick(x, y);
        } else if (overlayType === 'local-map') {
            this.handleLocalMapClick(x, y);
        }
    }

    handleCanvasHover(e, overlayType) {
        const currentMap = this.getCurrentMap(overlayType);
        if (!currentMap) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        let hoveredCell = null;

        if (overlayType === 'tactical-map') {
            hoveredCell = this.getHexAtCanvasPosition(x, y);
        } else if (overlayType === 'global-map') {
            hoveredCell = this.getGlobalMapCellAtPosition(x, y);
        } else if (overlayType === 'local-map') {
            hoveredCell = this.getLocalMapCellAtPosition(x, y);
        }

        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }

        const prevCell = this.currentTooltip;
        
        if (!hoveredCell || (prevCell && this.isDifferentCell(prevCell, hoveredCell, overlayType))) {
            this.hideTooltip();
        }

        if (hoveredCell && (!prevCell || this.isDifferentCell(prevCell, hoveredCell, overlayType))) {
            this.tooltipTimeout = setTimeout(() => {
                this.showTooltipForCell(hoveredCell, e.clientX, e.clientY, overlayType);
            }, 200);
        }
    }

    isDifferentCell(cell1, cell2, overlayType) {
        if (overlayType === 'tactical-map') {
            return cell1.col !== cell2.col || cell1.row !== cell2.row;
        } else {
            return cell1.x !== cell2.x || cell1.y !== cell2.y;
        }
    }

    getGlobalMapCellAtPosition(canvasX, canvasY) {
        if (!this.currentGlobalMap) return null;

        const params = this.currentGlobalMap.displayParams;
        if (!params) return null;

        const cellSize = 60; // Размер клетки глобальной карты

        for (let y = 0; y < this.currentGlobalMap.height; y++) {
            for (let x = 0; x < this.currentGlobalMap.width; x++) {
                const displayX = x * cellSize * params.scale + params.offsetX;
                const displayY = y * cellSize * params.scale + params.offsetY;
                const cellSizeScaled = cellSize * params.scale;

                if (canvasX >= displayX && canvasX <= displayX + cellSizeScaled &&
                    canvasY >= displayY && canvasY <= displayY + cellSizeScaled) {
                    return {
                        x: x,
                        y: y,
                        type: this.getGlobalCellType(x, y),
                        displayX: displayX,
                        displayY: displayY
                    };
                }
            }
        }
        return null;
    }

    getLocalMapCellAtPosition(canvasX, canvasY) {
        if (!this.currentLocalMap) return null;

        const params = this.currentLocalMap.displayParams;
        if (!params) return null;

        const cellSize = 50; // Размер клетки локальной карты

        for (let y = 0; y < this.currentLocalMap.height; y++) {
            for (let x = 0; x < this.currentLocalMap.width; x++) {
                const displayX = x * cellSize * params.scale + params.offsetX;
                const displayY = y * cellSize * params.scale + params.offsetY;
                const cellSizeScaled = cellSize * params.scale;

                if (canvasX >= displayX && canvasX <= displayX + cellSizeScaled &&
                    canvasY >= displayY && canvasY <= displayY + cellSizeScaled) {
                    return {
                        x: x,
                        y: y,
                        type: this.getLocalCellType(x, y),
                        displayX: displayX,
                        displayY: displayY
                    };
                }
            }
        }
        return null;
    }

    getGlobalCellType(x, y) {
        // Здесь можно добавить логику определения типа клетки глобальной карты
        if (x === this.playerGlobalPosition.x && y === this.playerGlobalPosition.y) {
            return 'player_start';
        }
        
        // Временная логика - можно заменить на данные из JSON
        const types = ['continent', 'ocean', 'mountain', 'forest', 'city'];
        return types[Math.abs(x * y) % types.length];
    }

    getLocalCellType(x, y) {
        if (x === this.playerLocalPosition.x && y === this.playerLocalPosition.y) {
            return 'player_start';
        }
        
        // Временная логика - можно заменить на данные из JSON
        const types = ['village', 'forest', 'cave', 'water', 'campfire'];
        return types[Math.abs(x * y) % types.length];
    }

    showTooltipForCell(cell, mouseX, mouseY, overlayType) {
        const tooltipText = this.getTooltipTextForCell(cell, overlayType);
        if (!tooltipText) {
            this.hideTooltip();
            return;
        }

        if (!this.tooltipElement) {
            this.createTooltipElement();
        }

        this.removeHighlight();
        
        this.currentTooltip = cell;
        cell.isHighlighted = true;
        
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

        this.drawCurrentMap(this.activeOverlay);
    }

    getTooltipTextForCell(cell, overlayType) {
        // Кастомные подсказки из данных карты
        if (cell.tooltip) {
            return cell.tooltip;
        }

        // Стандартные подсказки по типу
        const defaultTooltips = {
            // Тактические подсказки
            'player_start': '⭐ Стартовая позиция',
            'monster': '👹 Враждебная территория',
            'chest': '📦 Тайный сундук',
            'npc': '🧙 Таинственный незнакомец',
            'exit': '🚪 Выход с карты',
            'obstacle': '🪨 Препятствие',
            'active': '🟢 Проходимая местность',
            'inactive': '🔴 Непроходимая местность',
            
            // Глобальные подсказки
            'continent': '🗺️ Континент',
            'ocean': '🌊 Океан',
            'mountain': '⛰️ Горная цепь',
            'forest': '🌲 Древний лес',
            'desert': '🏜️ Пустыня',
            'city': '🏙️ Столица',
            'dungeon': '🏰 Подземелье',
            'quest_location': '📍 Локация задания',
            
            // Локальные подсказки
            'village': '🏘️ Деревня',
            'castle': '🏰 Замок',
            'water': '💧 Озеро',
            'campfire': '🔥 Старый костер',
            'plains': '🌾 Равнина',
            'hills': '⛰️ Холмы',
            'river': '🌊 Река',
            'bridge': '🌉 Мост',
            'tower': '🏯 Башня'
        };

        const tooltip = defaultTooltips[cell.type] || `${overlayType.replace('-map', '')} клетка [${cell.x}, ${cell.y}]`;
        
        if (cell.x === this.getPlayerPosition(this.activeOverlay).x && 
            cell.y === this.getPlayerPosition(this.activeOverlay).y) {
            return `🎯 Ваша позиция\n${tooltip}`;
        }
        
        return tooltip;
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
            this.drawCurrentMap(this.activeOverlay);
        }
    }

    // ========== ОТРИСОВКА КАРТ ==========

    drawCurrentMap(overlayType) {
        if (!this.ctx || !this.getCurrentMap(overlayType)) {
            console.log("❌ Canvas context или карта не доступна");
            return;
        }

        const canvas = this.canvas;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.drawBackground(overlayType);

        switch(overlayType) {
            case 'tactical-map':
                this.drawTacticalMap();
                break;
            case 'global-map':
                this.drawGlobalMap();
                break;
            case 'local-map':
                this.drawLocalMap();
                break;
        }

        if (this.showGrid) {
            this.drawGrid(overlayType);
        }
    }

    drawBackground(overlayType) {
        const currentMap = this.getCurrentMap(overlayType);
        if (!currentMap) return;

        if (currentMap.image) {
            this.drawMapBackgroundImage(currentMap, overlayType);
        } else {
            this.drawDefaultBackground(overlayType);
        }
    }

    drawMapBackgroundImage(map, overlayType) {
        const params = map.displayParams;
        if (!params) return;

        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(
                img, 
                params.offsetX, 
                params.offsetY, 
                (map.originalCanvasWidth || 800) * params.scale, 
                (map.originalCanvasHeight || 600) * params.scale
            );
            this.forceRedraw(this.activeOverlay);
        };
        img.onerror = () => {
            console.error("❌ Ошибка загрузки фона карты");
            this.drawDefaultBackground(overlayType.replace('-map', ''));
        };
        img.src = map.image;
    }

    drawDefaultBackground(overlayType) {
        const gradients = {
            'global': ['#1a1a2e', '#16213e', '#0f3460'],
            'local': ['#1b4332', '#2d6a4f', '#40916c'],
            'tactical': ['#1a1a2e', '#16213e']
        };

        const type = overlayType.replace('-map', '');
        const colors = gradients[type] || gradients.tactical;

        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color);
        });

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawTacticalMap() {
        if (!this.currentTacticalMap || !this.currentTacticalMap.cells) return;

        const cells = Object.values(this.currentTacticalMap.cells);
        
        cells.forEach(cell => {
            if (cell.visible) {
                this.drawHex(cell);
                this.drawHexContent(cell, 'tactical');
            }
        });
    }

    drawGlobalMap() {
        if (!this.currentGlobalMap) return;

        const params = this.currentGlobalMap.displayParams;
        if (!params) return;

        const cellSize = 60 * params.scale;

        for (let y = 0; y < this.currentGlobalMap.height; y++) {
            for (let x = 0; x < this.currentGlobalMap.width; x++) {
                const displayX = x * cellSize + params.offsetX;
                const displayY = y * cellSize + params.offsetY;
                
                const cellType = this.getGlobalCellType(x, y);
                const isPlayerHere = x === this.playerGlobalPosition.x && y === this.playerGlobalPosition.y;

                this.drawMapCell(displayX, displayY, cellSize, cellType, isPlayerHere, 'global');
            }
        }
    }

    drawLocalMap() {
        if (!this.currentLocalMap) return;

        const params = this.currentLocalMap.displayParams;
        if (!params) return;

        const cellSize = 50 * params.scale;

        for (let y = 0; y < this.currentLocalMap.height; y++) {
            for (let x = 0; x < this.currentLocalMap.width; x++) {
                const displayX = x * cellSize + params.offsetX;
                const displayY = y * cellSize + params.offsetY;
                
                const cellType = this.getLocalCellType(x, y);
                const isPlayerHere = x === this.playerLocalPosition.x && y === this.playerLocalPosition.y;

                this.drawMapCell(displayX, displayY, cellSize, cellType, isPlayerHere, 'local');
            }
        }
    }

    drawMapCell(x, y, size, cellType, isPlayerHere, mapType) {
        this.ctx.save();
        
        // Рисуем клетку
        this.ctx.fillStyle = this.getCellColor(cellType, mapType);
        this.ctx.fillRect(x, y, size, size);
        
        // Рамка
        this.ctx.strokeStyle = isPlayerHere ? '#00ff00' : '#ffffff';
        this.ctx.lineWidth = isPlayerHere ? 3 : 1;
        this.ctx.strokeRect(x, y, size, size);

        // Символ
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = `bold ${size * 0.4}px Arial`;
        this.ctx.fillStyle = '#ffffff';
        
        const symbol = isPlayerHere ? '🎯' : (this.objectSymbols[cellType] || '·');
        this.ctx.fillText(symbol, x + size/2, y + size/2);

        this.ctx.restore();
    }

    getCellColor(cellType, mapType) {
        const colors = {
            'global': {
                'continent': 'rgba(139, 69, 19, 0.7)',
                'ocean': 'rgba(0, 105, 148, 0.7)',
                'mountain': 'rgba(136, 136, 136, 0.7)',
                'forest': 'rgba(34, 139, 34, 0.7)',
                'desert': 'rgba(238, 203, 173, 0.7)',
                'city': 'rgba(192, 192, 192, 0.7)',
                'default': 'rgba(74, 85, 104, 0.7)'
            },
            'local': {
                'village': 'rgba(245, 158, 11, 0.7)',
                'forest': 'rgba(34, 139, 34, 0.7)',
                'cave': 'rgba(101, 67, 33, 0.7)',
                'water': 'rgba(59, 130, 246, 0.7)',
                'campfire': 'rgba(220, 38, 38, 0.7)',
                'plains': 'rgba(126, 217, 87, 0.7)',
                'hills': 'rgba(101, 67, 33, 0.7)',
                'river': 'rgba(59, 130, 246, 0.7)',
                'bridge': 'rgba(156, 163, 175, 0.7)',
                'tower': 'rgba(192, 192, 192, 0.7)',
                'default': 'rgba(113, 128, 150, 0.7)'
            }
        };

        const mapColors = colors[mapType] || colors.global;
        return mapColors[cellType] || mapColors.default;
    }

    drawGrid(overlayType) {
        const currentMap = this.getCurrentMap(overlayType);
        if (!currentMap) return;

        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1;

        if (overlayType === 'tactical-map') {
            this.drawHexGrid();
        } else {
            this.drawSquareGrid(overlayType);
        }

        this.ctx.restore();
    }

    drawSquareGrid(overlayType) {
        const currentMap = this.getCurrentMap(overlayType);
        const params = currentMap.displayParams;
        if (!params) return;

        const cellSize = (overlayType === 'global-map' ? 60 : 50) * params.scale;

        for (let y = 0; y < currentMap.height; y++) {
            for (let x = 0; x < currentMap.width; x++) {
                const displayX = x * cellSize + params.offsetX;
                const displayY = y * cellSize + params.offsetY;

                this.ctx.strokeRect(displayX, displayY, cellSize, cellSize);
            }
        }
    }

    // ========== ОБРАБОТКА КЛИКОВ ПО КАРТАМ ==========

    handleGlobalMapClick(x, y) {
        const cell = this.getGlobalMapCellAtPosition(x, y);
        if (!cell) return;

        console.log(`🌍 Клик по глобальной карте: [${cell.x}, ${cell.y}]`);
        
        // Перемещение по глобальной карте
        this.moveOnGlobalMap(cell.x, cell.y);
    }

    handleLocalMapClick(x, y) {
        const cell = this.getLocalMapCellAtPosition(x, y);
        if (!cell) return;

        console.log(`📍 Клик по локальной карте: [${cell.x}, ${cell.y}]`);
        
        // Перемещение по локальной карте
        this.moveOnLocalMap(cell.x, cell.y);
    }

    // ========== СИСТЕМА ПЕРЕМЕЩЕНИЯ ==========

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

        // Обновляем отображение карты
        this.forceRedraw('global-map');
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

        // Обновляем отображение карты
        this.forceRedraw('local-map');
    }

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
            this.startTacticalBattleForMovement(x, y, cellData);
        }, 50);
    }

    // ========== СИСТЕМА БОЯ ПРИ ПЕРЕМЕЩЕНИИ ==========

    startTacticalBattleForMovement(targetX, targetY, cellData) {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            return;
        }

        if (!this.currentHero) {
            console.error("❌ Не могу начать бой: герой не выбран");
            return;
        }

        this.pendingMovement = { x: targetX, y: targetY };
        
        const specificMonster = this.getMonsterFromCell(cellData);
        
        if (specificMonster && cellData.monster_id) {
            console.log(`🎯 Бой с ЗАПРОГРАММИРОВАННЫМ монстром: ${specificMonster.name} (ID: ${cellData.monster_id})`);
            battleSystem.startBattleWithSpecificMonster(this.currentHero, specificMonster, 'movement');
        } else {
            const randomMonster = this.getRandomMonster();
            if (!randomMonster) {
                console.error("❌ Не удалось начать бой: нет случайных монстров");
                if (window.game) {
                    window.game.showNotification("❌ Нет доступных монстров для боя!", 'error');
                }
                return;
            }
            
            console.log(`🎲 Бой со СЛУЧАЙНЫМ монстром: ${randomMonster.name} (из enemies.json)`);
            battleSystem.startBattleWithMonster(this.currentHero, randomMonster.id, 'movement');
        }
    }

    getMonsterFromCell(cellData) {
        if (!cellData || cellData.type !== 'monster' || !cellData.monster_id) {
            return null;
        }
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return null;
        
        return battleSystem.getMonsterById(cellData.monster_id);
    }

    getRandomMonster() {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem || !battleSystem.getRandomMonsterForMovement) {
            console.error("❌ BattleSystem не доступна для получения случайного монстра");
            return null;
        }
        
        const randomMonster = battleSystem.getRandomMonsterForMovement();
        
        if (!randomMonster) {
            console.error("❌ Не удалось получить случайного монстра");
            return null;
        }
        
        return randomMonster;
    }

    completeMovementAfterBattle(victory) {
        if (!this.pendingMovement) return;

        const targetX = this.pendingMovement.x;
        const targetY = this.pendingMovement.y;
        
        if (!this.currentHero) {
            console.error("❌ Не могу завершить перемещение: герой не выбран");
            return;
        }
        
        if (victory) {
            const oldPosition = {...this.playerTacticalPosition};
            this.playerTacticalPosition = {x: targetX, y: targetY};
            
            console.log(`✅ Успешное перемещение героя ${this.currentHero.name} после боя с [${oldPosition.x}, ${oldPosition.y}] на: [${targetX}, ${targetY}]`);
            
        } else {
            const startPosition = this.currentTacticalMap.startPosition;
            this.playerTacticalPosition = {...startPosition};
            
            console.log(`💀 Поражение! Возврат героя ${this.currentHero.name} на стартовую позицию: [${startPosition.x}, ${startPosition.y}]`);
            
            if (window.game) {
                window.game.showNotification("Поражение! Возврат на стартовую позицию.", 'error');
            }
        }
        
        this.saveMapState();
        
        // ВАЖНО: Принудительно пересчитываем отображение
        if (this.activeOverlay === 'tactical-map') {
            this.calculateMapPositioning('tactical-map');
            this.drawCurrentMap('tactical-map');
        }
        
        this.pendingMovement = null;
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    getHexAtCanvasPosition(canvasX, canvasY) {
        if (!this.currentTacticalMap) return null;

        const hexSize = (this.currentTacticalMap.cellSize || 40) * 0.8;
        
        // Кэшируем результат поиска если координаты похожи
        if (this.lastHoveredHex) {
            const centerX = this.lastHoveredHex.displayX;
            const centerY = this.lastHoveredHex.displayY;
            
            if (centerX && centerY) {
                const distance = Math.sqrt(
                    Math.pow(canvasX - centerX, 2) + 
                    Math.pow(canvasY - centerY, 2)
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
                Math.pow(canvasX - centerX, 2) + 
                Math.pow(canvasY - centerY, 2)
            );
            
            if (distance <= hexSize) {
                this.lastHoveredHex = cell; // Кэшируем найденный гекс
                return cell;
            }
        }
        
        this.lastHoveredHex = null;
        return null;
    }

    drawHex(cell) {
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
        
        // Рисуем подсветку если гекс выделен
        if (cell.isHighlighted) {
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i + Math.PI / 6;
                const x = centerX + this.hexSize * Math.cos(angle);
                const y = centerY + this.hexSize * Math.sin(angle);
                
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
            // Для обычных проходимых клеток оставляем точку
            if (cell.type === 'active' && !cell.objectType) {
                symbol = '·';
                color = '#ffffff';
                fontSize = 24;
            } else {
                // Используем словарь символов для специальных объектов
                symbol = this.objectSymbols[cell.type] || '·';
                
                // Настраиваем цвет для разных типов объектов
                switch(cell.type) {
                    case 'monster':
                    case 'orc_camp':
                        color = '#ef4444';
                        break;
                    case 'chest':
                        color = '#f59e0b';
                        break;
                    case 'npc':
                    case 'merchant':
                    case 'traveler':
                        color = '#3b82f6';
                        break;
                    case 'exit':
                    case 'portal':
                        color = '#8b5cf6';
                        break;
                    case 'obstacle':
                    case 'tree':
                    case 'elegant_tree':
                    case 'cave':
                    case 'black_monolith':
                        color = '#6b7280';
                        break;
                    case 'lava_crack':
                        color = '#dc2626';
                        break;
                    case 'graveyard_cross':
                        color = '#d6d3d1';
                        break;
                    case 'bandit_camp':
                        color = '#ca8a04';
                        break;
                    case 'weapon':
                        color = '#94a3b8';
                        break;
                    case 'armor':
                        color = '#60a5fa';
                        break;
                    case 'village':
                        color = '#fbbf24';
                        break;
                    case 'castle':
                        color = '#c084fc';
                        break;
                    case 'water':
                        color = '#0ea5e9';
                        break;
                    case 'campfire':
                        color = '#ea580c';
                        break;
                    case 'cart':
                        color = '#78350f';
                        break;
                    case 'ancient_rune':
                        color = '#fde047';
                        break;
                    case 'magic_crystal':
                        color = '#c4b5fd';
                        break;
                    case 'inactive':
                        color = '#ef4444';
                        break;
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

    drawSingleHexWithHighlight(hex) {
        // Перерисовываем только один гекс с подсветкой
        this.drawHex(hex);
        this.drawHexContent(hex);
    }

    getAvailableMoves() {
        if (!this.currentTacticalMap) return [];
        
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        
        console.log(`📍 Текущая позиция: [${currentCol}, ${currentRow}]`);
        console.log(`🎯 Доступные ходы:`, neighbors.map(n => `[${n.col}, ${n.row}]`));
        
        return neighbors;
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
        
        Object.values(this.currentTacticalMap.cells).forEach(potentialNeighbor => {
            if (potentialNeighbor.col === currentCol && potentialNeighbor.row === currentRow) {
                return;
            }
            
            const centerX = potentialNeighbor.displayX || potentialNeighbor.x;
            const centerY = potentialNeighbor.displayY || potentialNeighbor.y;
            const currentCenterX = currentCell.displayX || currentCell.x;
            const currentCenterY = currentCell.displayY || currentCell.y;
            
            const dx = centerX - currentCenterX;
            const dy = centerY - currentCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const isAdjacent = this.areHexesAdjacent(currentCell, potentialNeighbor, hexSize);
            
            if (isAdjacent) {
                const direction = this.getDirectionByAngle(dx, dy);
                
                if (potentialNeighbor.visible) {
                    if (potentialNeighbor.type === 'monster') {
                        neighbors.push({
                            row: potentialNeighbor.row,
                            col: potentialNeighbor.col,
                            cell: potentialNeighbor,
                            direction: direction,
                            distance: distance,
                            isMonster: true
                        });
                        console.log(`  ✅ Монстр-сосед: [${potentialNeighbor.col},${potentialNeighbor.row}] - ${direction}`);
                    }
                    else if (potentialNeighbor.passable !== false) {
                        neighbors.push({
                            row: potentialNeighbor.row,
                            col: potentialNeighbor.col,
                            cell: potentialNeighbor,
                            direction: direction,
                            distance: distance,
                            isMonster: false
                        });
                        console.log(`  ✅ Обычный сосед: [${potentialNeighbor.col},${potentialNeighbor.row}] - ${direction}`);
                    }
                }
            }
        });
        
        console.log(`🎯 Итог: найдено ${neighbors.length} доступных соседей`);
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

    areHexesAdjacent(cell1, cell2, hexSize) {
        if (!cell1 || !cell2) return false;
        
        const geometry = this.getHexGeometry(hexSize);
        
        const centerX1 = cell1.displayX || cell1.x;
        const centerY1 = cell1.displayY || cell1.y;
        const centerX2 = cell2.displayX || cell2.x;
        const centerY2 = cell2.displayY || cell2.y;
        
        const dx = centerX2 - centerX1;
        const dy = centerY2 - centerY1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const isHorizontalAdjacent = Math.abs(distance - geometry.horizontalDistance) < geometry.tolerance;
        const isVerticalAdjacent = Math.abs(distance - geometry.verticalDistance) < geometry.tolerance;
        const isDiagonalAdjacent = Math.abs(distance - geometry.diagonalDistance) < geometry.tolerance;
        
        const isAdjacent = isHorizontalAdjacent || isVerticalAdjacent || isDiagonalAdjacent;
        
        return isAdjacent;
    }

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

    updateMovementInfo() {
        const availableMoves = this.getAvailableMoves();
        
        const movesElement = document.getElementById('availableMoves');
        if (movesElement) {
            movesElement.textContent = availableMoves.length;
        }
    }

    // ========== ТЕСТОВЫЕ ДАННЫЕ ==========

    createTestMaps() {
        this.createTestGlobalMaps();
        this.createTestLocalMaps();
        this.createTestTacticalMaps();
    }

    createTestGlobalMaps() {
        this.globalMaps = [{
            id: 1,
            name: "Континент Арканиум",
            image: "images/maps/global/arcanium.jpg",
            width: 8,
            height: 8,
            startPosition: {x: 4, y: 4},
            description: "Древний континент, полный загадок и опасностей",
            renderType: 'square'
        }];
    }

    createTestLocalMaps() {
        this.localMaps = [{
            id: 1,
            name: "Долина Начала",
            image: "images/maps/local/valley.jpg",
            width: 10,
            height: 10,
            startPosition: {x: 5, y: 5},
            globalPosition: {x: 4, y: 4},
            description: "Мирная долина, где начинаются приключения",
            renderType: 'square'
        }];
    }

    createTestTacticalMaps() {
        this.tacticalMaps = [{
            id: 1,
            name: "Лесная Тропа",
            image: "images/maps/tactical/forest_path.jpg",
            width: 6,
            height: 6,
            startPosition: {x: 3, y: 3},
            localPosition: {x: 5, y: 5},
            description: "Извилистая тропа через древний лес",
            cells: {
                "3,3": {type: "start", passable: true, row: 3, col: 3, visible: true, x: 300, y: 300},
                "3,2": {type: "exit", passable: true, row: 2, col: 3, visible: true, x: 300, y: 250},
                "2,3": {type: "monster", passable: false, row: 3, col: 2, visible: true, x: 250, y: 300},
                "4,3": {type: "chest", passable: true, row: 3, col: 4, visible: true, x: 350, y: 300},
                "3,4": {type: "npc", passable: true, row: 4, col: 3, visible: true, x: 300, y: 350}
            },
            renderType: 'hex'
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
            description: "Тестовый мир для разработки",
            renderType: 'square'
        }];

        this.localMaps = [{
            id: 1,
            name: "Тестовая Зона",
            image: "",
            width: 4,
            height: 4,
            startPosition: {x: 2, y: 2},
            globalPosition: {x: 2, y: 2},
            renderType: 'square'
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
            },
            renderType: 'hex'
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

    // ========== УПРАВЛЕНИЕ ОТОБРАЖЕНИЕМ ==========

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

    forceRedraw(overlayType) {
        if (this.canvasInitialized) {
            this.calculateMapPositioning(overlayType);
            this.drawCurrentMap(overlayType);
        }
    }

    updateGameDisplay() {
        if (window.game && window.game.systems.hero && window.game.systems.hero.currentHero) {
            window.game.systems.hero.showHeroGameScreen();
        }
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

    // ========== СИСТЕМА СОХРАНЕНИЯ ==========

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

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.drawCurrentMap(this.activeOverlay);
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
console.log("📦 MapSystem модуль загружен с поддержкой глобальных, локальных и тактических карт");
