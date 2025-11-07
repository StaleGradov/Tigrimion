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
        
        // Для загрузки JSON карт
        this.loadedJSONMaps = new Map();
        
        console.log("✅ MapSystem инициализирован");
    }

    async loadMapData() {
        try {
            console.log("📥 Загружаем данные карт...");
            
            // Загружаем JSON карты
            await this.loadJSONMaps();
            
            // Если JSON карты не загрузились, используем тестовые
            if (this.tacticalMaps.length === 0) {
                this.createTestMaps();
            }
            
            // Устанавливаем стартовые позиции
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
            
            // Пробуем загрузить карты из разных возможных путей
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
                        await this.processJSONMaps(mapData);
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

    async processJSONMaps(mapData) {
        if (!mapData || !mapData.maps) {
            console.warn("❌ Неверный формат JSON карт");
            return;
        }

        for (const mapJson of mapData.maps) {
            try {
                const tacticalMap = this.convertJSONToTacticalMap(mapJson);
                if (tacticalMap) {
                    this.tacticalMaps.push(tacticalMap);
                    this.loadedJSONMaps.set(tacticalMap.id, tacticalMap);
                    console.log(`✅ Обработана тактическая карта: ${tacticalMap.name}`);
                }
            } catch (error) {
                console.error(`❌ Ошибка обработки карты ${mapJson.name}:`, error);
            }
        }
    }

    convertJSONToTacticalMap(jsonMap) {
        // Конвертируем JSON в формат тактической карты игры
        return {
            id: jsonMap.id || this.tacticalMaps.length + 1,
            name: jsonMap.name || "Безымянная карта",
            image: jsonMap.backgroundImage || jsonMap.image || "",
            width: jsonMap.width || 10,
            height: jsonMap.height || 10,
            startPosition: jsonMap.startPosition || {x: 0, y: 0},
            description: jsonMap.description || "Карта из JSON файла",
            localPosition: {x: 0, y: 0}, // Можно настроить позже
            
            // Конвертируем клетки/тайлы
            cells: this.convertJSONCells(jsonMap.cells || jsonMap.tiles || []),
            
            // Сохраняем оригинальные данные для совместимости
            jsonData: jsonMap,
            
            // Настройки отображения
            renderType: jsonMap.renderType || 'grid', // 'grid' или 'hex'
            cellSize: jsonMap.cellSize || 40
        };
    }

    convertJSONCells(jsonCells) {
        const cells = {};
        
        if (Array.isArray(jsonCells)) {
            // Если клетки в формате массива
            jsonCells.forEach(cell => {
                const key = `${cell.x},${cell.y}`;
                cells[key] = {
                    type: cell.type || 'empty',
                    content: cell.content || '',
                    passable: cell.passable !== false,
                    monsterId: cell.monsterId,
                    loot: cell.loot,
                    // Дополнительные свойства
                    ...cell
                };
            });
        } else if (typeof jsonCells === 'object') {
            // Если клетки в формате объекта
            Object.keys(jsonCells).forEach(key => {
                const cell = jsonCells[key];
                cells[key] = {
                    type: cell.type || 'empty',
                    content: cell.content || '',
                    passable: cell.passable !== false,
                    monsterId: cell.monsterId,
                    loot: cell.loot,
                    ...cell
                };
            });
        }
        
        return cells;
    }

    createTestMaps() {
        // Тестовая глобальная карта
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

        // Тестовые локальные карты
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

        // Тестовые тактические карты (если JSON не загрузились)
        if (this.tacticalMaps.length === 0) {
            this.tacticalMaps = [{
                id: 1,
                name: "Лесная Тропа",
                image: "images/maps/tactical/forest_path.jpg",
                width: 6,
                height: 6,
                startPosition: {x: 3, y: 3},
                localPosition: {x: 4, y: 4},
                description: "Извилистая тропа через древний лес",
                localConnections: {
                    north: {localX: 3, localY: 2},
                    south: {localX: 3, localY: 4},
                    east: {localX: 4, localY: 3},
                    west: {localX: 2, localY: 3}
                },
                cells: {
                    "3,3": {type: "start", content: "player_start", passable: true},
                    "3,2": {type: "exit", direction: "north", content: "exit_north", passable: true},
                    "2,3": {type: "monster", monsterId: 1, content: "goblin", passable: false},
                    "4,3": {type: "chest", loot: "common", content: "wooden_chest", passable: true},
                    "3,4": {type: "npc", content: "old_merchant", passable: true}
                }
            }];
        }
    }

    createFallbackMaps() {
        // Резервные данные если загрузка не удалась
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
                "1,1": {type: "start", content: "player_start", passable: true}
            }
        }];
    }

    // === ОТРИСОВКА ТАКТИЧЕСКОЙ КАРТЫ ===

    renderTacticalMap() {
        if (!this.currentTacticalMap) {
            return '<div class="map-error">Тактическая карта не загружена</div>';
        }

        // Проверяем, это JSON карта или стандартная
        const isJSONMap = this.currentTacticalMap.jsonData;
        
        if (isJSONMap) {
            return this.renderJSONTacticalMap();
        } else {
            return this.renderStandardTacticalMap();
        }
    }

    renderJSONTacticalMap() {
        const map = this.currentTacticalMap;
        
        return `
            <div class="map-container tactical-map json-tactical-map">
                <div class="tactical-map-header">
                    <h4>${map.name}</h4>
                    <div class="map-controls">
                        <button class="btn-secondary" onclick="game.systems.map.zoomIn()">🔍+</button>
                        <button class="btn-secondary" onclick="game.systems.map.zoomOut()">🔍-</button>
                        <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                    </div>
                </div>
                
                <div class="tactical-map-content" id="tacticalMapContent">
                    <div class="tactical-map-visual">
                        ${map.image ? `
                            <img src="${map.image}" alt="${map.name}" 
                                 style="max-width: 100%; height: auto;"
                                 onerror="this.style.display='none'">
                        ` : ''}
                        
                        <div class="tactical-grid-overlay" 
                             style="grid-template-columns: repeat(${map.width}, 1fr);
                                    grid-template-rows: repeat(${map.height}, 1fr);">
                            ${this.generateJSONMapGrid()}
                        </div>
                    </div>
                    
                    <div class="tactical-map-info">
                        <div class="map-description">${map.description}</div>
                        <div class="player-position">
                            Позиция: [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]
                        </div>
                        <div class="map-stats">
                            Размер: ${map.width} × ${map.height}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateJSONMapGrid() {
        let gridHTML = '';
        const map = this.currentTacticalMap;

        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const cellKey = `${x},${y}`;
                const cellData = map.cells[cellKey];
                const isPlayerHere = x === this.playerTacticalPosition.x && y === this.playerTacticalPosition.y;
                
                let cellClass = 'tactical-grid-cell';
                let cellContent = '';
                let title = `Позиция: [${x}, ${y}]`;

                if (isPlayerHere) {
                    cellClass += ' player-cell';
                    cellContent = '🎯';
                } else if (cellData) {
                    cellClass += ` ${cellData.type}-cell`;
                    title += ` - ${this.getCellDescription(cellData)}`;
                    
                    cellContent = this.getCellEmoji(cellData);
                    
                    // Добавляем стили для разных типов клеток
                    if (!cellData.passable) {
                        cellClass += ' impassable';
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

    getCellEmoji(cellData) {
        const emojiMap = {
            'monster': '👹',
            'chest': '📦',
            'npc': '🧙',
            'exit': '🚪',
            'start': '⭐',
            'obstacle': '🪨',
            'empty': '·',
            'wall': '🧱',
            'door': '🚪',
            'trap': '⚡',
            'healing': '❤️',
            'key': '🔑'
        };
        
        return emojiMap[cellData.type] || cellData.content || '·';
    }

    renderStandardTacticalMap() {
        // Стандартный рендер для обратной совместимости
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

    // === ДВИЖЕНИЕ ПО ТАКТИЧЕСКОЙ КАРТЕ ===

    moveOnTacticalMap(x, y) {
        if (!this.currentTacticalMap) return;

        const cellKey = `${x},${y}`;
        const cellData = this.currentTacticalMap.cells[cellKey];
        
        // Проверяем, можно ли пройти на эту клетку
        if (cellData && cellData.passable === false) {
            console.log("🚫 Нельзя пройти на эту клетку");
            if (window.game) {
                window.game.showNotification("Нельзя пройти на эту клетку!", 'error');
            }
            return;
        }

        // Перемещаем игрока
        this.playerTacticalPosition = {x, y};
        
        // Взаимодействуем с клеткой, если на ней что-то есть
        if (cellData && cellData.type !== 'empty') {
            this.interactWithTacticalCell(x, y);
        }

        console.log(`🎲 Перемещение на тактическую позицию: [${x}, ${y}]`);
        this.updateTacticalMapDisplay();
    }

    updateTacticalMapDisplay() {
        // Обновляем отображение тактической карты
        const container = document.getElementById('overlay-container');
        if (container && this.activeOverlay === 'tactical-map') {
            this.showOverlay('tactical-map');
        }
    }

    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

    zoomIn() {
        console.log("🔍 Увеличиваем масштаб");
        // Реализация масштабирования
    }

    zoomOut() {
        console.log("🔍 Уменьшаем масштаб");
        // Реализация масштабирования
    }

    // Переопределяем метод showOverlay для тактических карт
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
        } else {
            // Вызываем родительский метод для других оверлеев
            super.showOverlay(overlayType);
        }
    }

    // Убираем редактор карт из кнопок
    showTacticalMapEditor() {
        // Вместо редактора показываем обычную тактическую карту
        this.showOverlay('tactical-map');
    }
}

// Убираем класс редактора так как он больше не нужен
// class TacticalMapEditor { ... }

// Регистрируем систему в глобальной области
window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен с поддержкой JSON карт");
