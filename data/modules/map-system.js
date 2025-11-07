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
        
        // Для тактической карты
        this.tacticalMapEditor = null;
        this.isTacticalEditMode = false;
        
        console.log("✅ MapSystem инициализирован");
    }

    async loadMapData() {
        try {
            console.log("📥 Загружаем данные карт...");
            
            // Пока используем тестовые данные
            this.createTestMaps();
            
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

        // Тестовые тактические карты
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
            localPosition: {x: 2, y: 2}
        }];
    }

    setStartPositions() {
        // Устанавливаем начальные позиции на картах
        if (this.globalMaps.length > 0) {
            this.currentGlobalMap = this.globalMaps[0];
            this.playerGlobalPosition = {...this.currentGlobalMap.startPosition};
            
            // Находим соответствующую локальную карту
            const localMap = this.findLocalMapAtPosition(
                this.playerGlobalPosition.x, 
                this.playerGlobalPosition.y
            );
            
            if (localMap) {
                this.currentLocalMap = localMap;
                this.playerLocalPosition = {...localMap.startPosition};
                
                // Находим соответствующую тактическую карту
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

    // === ОТРИСОВКА КАРТ ===

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
        // Если у нас есть созданные тактические карты, показываем их
        if (this.tacticalMaps.length > 0 && !this.isTacticalEditMode) {
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
        } else {
            // Показываем редактор
            this.showTacticalMapEditor();
            return '<div class="map-loading">Загрузка редактора карт...</div>';
        }
    }

    generateGlobalMapGrid() {
        let gridHTML = '';
        const { width, height } = this.currentGlobalMap;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const hasLocalMap = this.findLocalMapAtPosition(x, y);
                const isPlayerHere = x === this.playerGlobalPosition.x && y === this.playerGlobalPosition.y;
                
                let cellClass = 'map-cell';
                let cellContent = '';
                
                if (isPlayerHere) {
                    cellClass += ' player-cell';
                    cellContent = '🎯';
                } else if (hasLocalMap) {
                    cellClass += ' has-local-map';
                    cellContent = '📍';
                } else {
                    cellClass += ' empty-cell';
                    cellContent = '·';
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
                const hasTacticalMap = this.findTacticalMapAtPosition(x, y);
                const isPlayerHere = x === this.playerLocalPosition.x && y === this.playerLocalPosition.y;
                
                let cellClass = 'map-cell';
                let cellContent = '';
                
                if (isPlayerHere) {
                    cellClass += ' player-cell';
                    cellContent = '🎯';
                } else if (hasTacticalMap) {
                    cellClass += ' has-tactical-map';
                    cellContent = '⚔️';
                } else {
                    cellClass += ' empty-cell';
                    cellContent = '·';
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
                        default:
                            cellContent = '·';
                    }
                } else {
                    cellClass += ' empty-cell';
                    cellContent = '·';
                }

                gridHTML += `
                    <div class="${cellClass}" 
                         onclick="game.systems.map.interactWithTacticalCell(${x}, ${y})"
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
            'exit': 'Выход',
            'monster': 'Монстр',
            'chest': 'Сундук',
            'npc': 'NPC'
        };
        return descriptions[cellData.type] || cellData.type;
    }

    // === ДВИЖЕНИЕ И ВЗАИМОДЕЙСТВИЯ ===

    moveOnGlobalMap(x, y) {
        const localMap = this.findLocalMapAtPosition(x, y);
        if (!localMap) {
            console.log("🚫 На этой позиции нет локальной карты");
            return;
        }

        this.playerGlobalPosition = {x, y};
        this.currentLocalMap = localMap;
        this.playerLocalPosition = {...localMap.startPosition};
        
        // Обновляем тактическую карту
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
    }

    moveOnLocalMap(x, y) {
        const tacticalMap = this.findTacticalMapAtPosition(x, y);
        if (!tacticalMap) {
            console.log("🚫 На этой позиции нет тактической карты");
            return;
        }

        this.playerLocalPosition = {x, y};
        this.currentTacticalMap = tacticalMap;
        this.playerTacticalPosition = {...tacticalMap.startPosition};

        console.log(`📍 Перемещение на локальную позицию: [${x}, ${y}]`);
        this.updateGameDisplay();
    }

    interactWithTacticalCell(x, y) {
        const cellKey = `${x},${y}`;
        const cellData = this.currentTacticalMap.cells[cellKey];
        
        if (!cellData) {
            console.log("🚫 На этой клетке ничего нет");
            return;
        }

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
        // Интеграция с BattleSystem
        if (window.game && window.game.systems.battle) {
            window.game.systems.battle.startBattleWithMonster(monsterId);
        }
    }

    openChest(chestData) {
        console.log(`📦 Открываем сундук:`, chestData);
        // Логика получения лута
        if (window.game) {
            window.game.showNotification(`Найден сундук с ${chestData.loot} добычей!`, 'success');
        }
    }

    talkToNPC(npcData) {
        console.log(`🧙 Общаемся с NPC:`, npcData);
        if (window.game) {
            window.game.showNotification('NPC: "Приветствую, путник! Я могу предложить тебе товары или задания."', 'info');
        }
    }

    useExit(exitData, x, y) {
        console.log(`🚪 Используем выход:`, exitData);
        
        // Перемещение на соседнюю тактическую карту
        const newLocalPos = this.currentTacticalMap.localConnections[exitData.direction];
        if (newLocalPos) {
            this.moveOnLocalMap(newLocalPos.localX, newLocalPos.localY);
        }
    }

    updateGameDisplay() {
        // Обновляем отображение в HeroSystem
        if (window.game && window.game.systems.hero && window.game.systems.hero.currentHero) {
            window.game.systems.hero.showHeroGameScreen();
        }
    }

    // === НОВЫЕ МЕТОДЫ ДЛЯ ТАКТИЧЕСКОЙ КАРТЫ ===

    showTacticalMapEditor() {
        const container = document.getElementById('overlay-container');
        if (!container) return;

        container.innerHTML = `
            <div class="overlay-content tactical-map-container tactical-map-overlay">
                <div class="tactical-map-header">
                    <div class="tactical-map-title">🎲 Редактор Тактической Карты</div>
                    <div class="tactical-map-controls">
                        <button class="btn-secondary" onclick="game.systems.map.toggleTacticalEditMode()" id="tacticalEditBtn">
                            🎨 Режим редактирования
                        </button>
                        <button class="btn-primary" onclick="game.systems.map.saveTacticalMap()">
                            💾 Сохранить карту
                        </button>
                        <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                    </div>
                </div>
                
                <div class="tactical-map-content">
                    <div class="tactical-map-visual">
                        <img id="tacticalMapImage" src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80" alt="Тактическая карта">
                        <canvas id="tacticalMapCanvas"></canvas>
                    </div>
                    
                    <div class="tactical-map-sidebar">
                        <div class="tactical-upload-area" onclick="document.getElementById('tacticalImageUpload').click()">
                            <div>📁 ЗАГРУЗИТЕ КАРТУ</div>
                            <div style="font-size: 0.8em; color: #9ca3af; margin-top: 5px;">
                                Кликните чтобы выбрать изображение
                            </div>
                            <input type="file" id="tacticalImageUpload" accept="image/*" style="display: none;">
                        </div>
                        
                        <div class="tactical-settings">
                            <div class="tactical-setting-group">
                                <label>Размер шестиугольников:</label>
                                <input type="range" id="tacticalGridSize" min="20" max="80" value="40">
                                <div class="tactical-value-display" id="tacticalGridSizeValue">40px</div>
                            </div>
                            
                            <div class="tactical-setting-group">
                                <label>Прозрачность сетки:</label>
                                <input type="range" id="tacticalGridAlpha" min="0" max="100" value="30">
                                <div class="tactical-value-display" id="tacticalGridAlphaValue">30%</div>
                            </div>
                        </div>
                        
                        <div class="tactical-edit-controls" id="tacticalEditControls" style="display: none;">
                            <div style="text-align: center; margin-bottom: 10px; color: #ffd700;">
                                🎨 РЕЖИМ РЕДАКТИРОВАНИЯ
                            </div>
                            
                            <div class="tactical-objects-grid">
                                <div class="tactical-obj-btn active" onclick="game.systems.map.setTacticalEditMode('active')">
                                    🟢 Активная
                                </div>
                                <div class="tactical-obj-btn" onclick="game.systems.map.setTacticalEditMode('inactive')">
                                    🔴 Неактивная
                                </div>
                                <div class="tactical-obj-btn" onclick="game.systems.map.setTacticalEditMode('player_start')">
                                    🎯 Старт игрока
                                </div>
                                <div class="tactical-obj-btn" onclick="game.systems.map.setTacticalEditMode('monster')">
                                    👹 Монстр
                                </div>
                                <div class="tactical-obj-btn" onclick="game.systems.map.setTacticalEditMode('chest')">
                                    📦 Сундук
                                </div>
                                <div class="tactical-obj-btn" onclick="game.systems.map.setTacticalEditMode('npc')">
                                    🧙 NPC
                                </div>
                                <div class="tactical-obj-btn" onclick="game.systems.map.setTacticalEditMode('exit')">
                                    🚪 Выход
                                </div>
                                <div class="tactical-obj-btn" onclick="game.systems.map.setTacticalEditMode('obstacle')">
                                    🪨 Препятствие
                                </div>
                            </div>
                            
                            <div style="text-align: center; font-size: 0.8em; color: #9ca3af; margin-top: 10px;">
                                ЛКМ - разместить • ПКМ - удалить
                            </div>
                        </div>
                        
                        <div class="tactical-stats">
                            <div class="tactical-stat-item">
                                <span>Активных клеток:</span>
                                <span id="tacticalActiveCount">0</span>
                            </div>
                            <div class="tactical-stat-item">
                                <span>Спец. объектов:</span>
                                <span id="tacticalSpecialCount">0</span>
                            </div>
                            <div class="tactical-stat-item">
                                <span>Текущий объект:</span>
                                <span id="tacticalCurrentType">-</span>
                            </div>
                        </div>
                        
                        <div class="tactical-message-log" id="tacticalMessageLog">
                            <div class="tactical-message">
                                Добро пожаловать в редактор тактической карты!
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Инициализируем редактор
        this.initTacticalMapEditor();
    }

    initTacticalMapEditor() {
        this.tacticalMapEditor = new TacticalMapEditor();
        this.tacticalMapEditor.init();
    }

    toggleTacticalEditMode() {
        this.isTacticalEditMode = !this.isTacticalEditMode;
        const btn = document.getElementById('tacticalEditBtn');
        const editControls = document.getElementById('tacticalEditControls');
        
        if (this.isTacticalEditMode) {
            btn.textContent = '🎮 Режим игры';
            btn.style.background = 'linear-gradient(135deg, #ffff00, #ffaa00)';
            editControls.style.display = 'block';
            this.addTacticalMessage("Режим редактирования активирован!");
        } else {
            btn.textContent = '🎨 Режим редактирования';
            btn.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
            editControls.style.display = 'none';
            this.addTacticalMessage("Режим игры активирован!");
        }
        
        if (this.tacticalMapEditor) {
            this.tacticalMapEditor.setEditMode(this.isTacticalEditMode);
        }
    }

    setTacticalEditMode(editType) {
        if (this.tacticalMapEditor) {
            this.tacticalMapEditor.setEditModeType(editType);
            
            const descriptions = {
                'active': 'Активная клетка',
                'inactive': 'Неактивная клетка',
                'player_start': 'Старт игрока',
                'monster': 'Монстр',
                'chest': 'Сундук',
                'npc': 'NPC',
                'exit': 'Выход',
                'obstacle': 'Препятствие'
            };
            
            document.getElementById('tacticalCurrentType').textContent = descriptions[editType] || editType;
            this.addTacticalMessage(`Режим: ${descriptions[editType]}`);
        }
    }

    saveTacticalMap() {
        if (this.tacticalMapEditor) {
            const mapData = this.tacticalMapEditor.exportMap();
            
            // Сохраняем в систему карт
            this.saveTacticalMapToSystem(mapData);
            this.addTacticalMessage("Карта успешно сохранена!");
        }
    }

    saveTacticalMapToSystem(mapData) {
        // Создаем новую тактическую карту на основе данных редактора
        const newTacticalMap = {
            id: this.tacticalMaps.length + 1,
            name: "Пользовательская карта " + (this.tacticalMaps.length + 1),
            image: mapData.imageSrc,
            width: mapData.gridWidth,
            height: mapData.gridHeight,
            startPosition: mapData.playerStart,
            cells: mapData.cells,
            hexData: mapData.hexes,
            description: "Создана в редакторе карт",
            localPosition: {x: 0, y: 0} // Можно настроить позже
        };
        
        this.tacticalMaps.push(newTacticalMap);
        
        // Устанавливаем как текущую тактическую карту
        this.currentTacticalMap = newTacticalMap;
        this.playerTacticalPosition = {...newTacticalMap.startPosition};
        
        console.log("💾 Тактическая карта сохранена:", newTacticalMap);
        
        // Показываем уведомление
        if (window.game) {
            window.game.showNotification(`Карта "${newTacticalMap.name}" успешно создана!`, 'success');
        }
    }

    addTacticalMessage(text) {
        const log = document.getElementById('tacticalMessageLog');
        if (!log) return;
        
        const message = document.createElement('div');
        message.className = 'tactical-message';
        message.textContent = text;
        log.appendChild(message);
        log.scrollTop = log.scrollHeight;
        
        if (log.children.length > 6) {
            log.removeChild(log.firstChild);
        }
    }

    updateTacticalStats(stats) {
        const activeCount = document.getElementById('tacticalActiveCount');
        const specialCount = document.getElementById('tacticalSpecialCount');
        
        if (activeCount) activeCount.textContent = stats.activeCount || 0;
        if (specialCount) specialCount.textContent = stats.specialCount || 0;
    }
}

// ========== КЛАСС РЕДАКТОРА ТАКТИЧЕСКОЙ КАРТЫ ==========
class TacticalMapEditor {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.mapImage = null;
        this.hexes = [];
        this.showGrid = true;
        this.isEditMode = false;
        this.currentEditType = 'active';
        
        this.settings = {
            gridSize: 40,
            gridAlpha: 0.3
        };
        
        this.objectTypes = {
            'player_start': { name: '🎯 Старт', color: '#4ade80' },
            'monster': { name: '👹 Монстр', color: '#ef4444' },
            'chest': { name: '📦 Сундук', color: '#f59e0b' },
            'npc': { name: '🧙 NPC', color: '#3b82f6' },
            'exit': { name: '🚪 Выход', color: '#8b5cf6' },
            'obstacle': { name: '🪨 Препятствие', color: '#6b7280' }
        };
    }

    init() {
        this.canvas = document.getElementById('tacticalMapCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.mapImage = document.getElementById('tacticalMapImage');
        
        this.setupEventListeners();
        this.setupSliders();
        this.resizeCanvas();
        this.generateHexGrid();
        this.draw();
    }

    setupEventListeners() {
        // Загрузка изображения
        const uploadInput = document.getElementById('tacticalImageUpload');
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.mapImage.src = event.target.result;
                        this.mapImage.onload = () => {
                            this.resizeCanvas();
                            this.generateHexGrid();
                            if (window.game && window.game.systems.map) {
                                window.game.systems.map.addTacticalMessage("Новая карта загружена!");
                            }
                        };
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Обработка кликов по канвасу
        this.canvas.addEventListener('click', (e) => {
            if (!this.isEditMode) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.editHexAt(x, y, this.currentEditType);
        });

        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!this.isEditMode) return;
            
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.deleteHexAt(x, y);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.handleHover(x, y);
        });

        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.resizeCanvas();
                this.generateHexGrid();
            }, 100);
        });
    }

    setupSliders() {
        const gridSizeSlider = document.getElementById('tacticalGridSize');
        const gridAlphaSlider = document.getElementById('tacticalGridAlpha');
        
        if (gridSizeSlider) {
            gridSizeSlider.addEventListener('input', (e) => {
                this.settings.gridSize = parseInt(e.target.value);
                document.getElementById('tacticalGridSizeValue').textContent = e.target.value + 'px';
                this.generateHexGrid();
            });
        }

        if (gridAlphaSlider) {
            gridAlphaSlider.addEventListener('input', (e) => {
                this.settings.gridAlpha = parseInt(e.target.value) / 100;
                document.getElementById('tacticalGridAlphaValue').textContent = e.target.value + '%';
                this.draw();
            });
        }
    }

    resizeCanvas() {
        if (this.canvas && this.mapImage) {
            this.canvas.width = this.mapImage.clientWidth;
            this.canvas.height = this.mapImage.clientHeight;
        }
    }

    generateHexGrid() {
        this.hexes = [];
        const hexHeight = this.settings.gridSize * 2;
        const hexWidth = Math.sqrt(3) * this.settings.gridSize;
        const cols = Math.ceil(this.canvas.width / hexWidth) + 1;
        const rows = Math.ceil(this.canvas.height / (hexHeight * 0.75)) + 1;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * hexWidth + (row % 2) * hexWidth / 2;
                const y = row * hexHeight * 0.75;
                
                this.hexes.push({
                    row, col,
                    x, y,
                    active: true,
                    type: 'active',
                    objectType: null,
                    hover: false,
                    id: `${row}-${col}`
                });
            }
        }
        this.updateStats();
    }

    draw() {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.showGrid) {
            this.drawHexGrid();
        }
        
        this.drawHexObjects();
    }

    drawHexGrid() {
        this.hexes.forEach(hex => {
            if (hex.active) {
                this.drawHexagon(hex);
            }
        });
    }

    drawHexagon(hex) {
        const centerX = hex.x;
        const centerY = hex.y;
        const radius = this.settings.gridSize;

        this.ctx.save();
        this.ctx.beginPath();
        
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();

        // Заливка для активных клеток
        if (hex.active) {
            let fillColor = 'rgba(76, 201, 240, 0.1)';
            
            if (hex.objectType) {
                const obj = this.objectTypes[hex.objectType];
                fillColor = this.hexToRgba(obj.color, 0.3);
            }
            
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
        }

        // Обводка
        let strokeColor = `rgba(76, 201, 240, ${this.settings.gridAlpha})`;
        let lineWidth = 1;
        
        if (hex.objectType) {
            const obj = this.objectTypes[hex.objectType];
            strokeColor = this.hexToRgba(obj.color, 0.8);
            lineWidth = 3;
        } else if (hex.hover) {
            strokeColor = 'rgba(255, 255, 255, 0.8)';
            lineWidth = 2;
        }
        
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.stroke();

        // Иконка объекта
        if (hex.objectType) {
            const obj = this.objectTypes[hex.objectType];
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(obj.name.split(' ')[0], hex.x, hex.y);
        }

        this.ctx.restore();
    }

    drawHexObjects() {
        // Дополнительная отрисовка объектов поверх сетки
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    getHexAt(x, y) {
        return this.hexes.find(hex => {
            if (!hex.active) return false;
            
            const dx = x - hex.x;
            const dy = y - hex.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= this.settings.gridSize;
        });
    }

    editHexAt(x, y, editType) {
        const hex = this.getHexAt(x, y);
        if (hex) {
            hex.active = true;
            
            if (editType === 'inactive') {
                hex.active = false;
                hex.objectType = null;
            } else if (editType === 'active') {
                hex.objectType = null;
            } else {
                hex.objectType = editType;
            }
            
            this.updateStats();
            this.draw();
            if (window.game && window.game.systems.map) {
                window.game.systems.map.addTacticalMessage(`Клетка [${hex.row},${hex.col}] изменена`);
            }
        }
    }

    deleteHexAt(x, y) {
        const hex = this.getHexAt(x, y);
        if (hex) {
            hex.objectType = null;
            this.updateStats();
            this.draw();
            if (window.game && window.game.systems.map) {
                window.game.systems.map.addTacticalMessage(`Объект удален с клетки [${hex.row},${hex.col}]`);
            }
        }
    }

    handleHover(x, y) {
        let hoverChanged = false;
        
        this.hexes.forEach(hex => {
            if (hex.hover) {
                hex.hover = false;
                hoverChanged = true;
            }
        });
        
        const hex = this.getHexAt(x, y);
        if (hex && hex.active) {
            hex.hover = true;
            hoverChanged = true;
        }
        
        if (hoverChanged) this.draw();
    }

    updateStats() {
        const activeCount = this.hexes.filter(hex => hex.active).length;
        const specialCount = this.hexes.filter(hex => hex.objectType).length;
        
        if (window.game && window.game.systems.map) {
            window.game.systems.map.updateTacticalStats({
                activeCount,
                specialCount
            });
        }
    }

    setEditMode(enabled) {
        this.isEditMode = enabled;
        this.canvas.style.cursor = enabled ? 'cell' : 'default';
        this.draw();
    }

    setEditModeType(editType) {
        this.currentEditType = editType;
    }

    exportMap() {
        const activeHexes = this.hexes.filter(hex => hex.active);
        const cells = {};
        
        activeHexes.forEach(hex => {
            if (hex.objectType) {
                cells[`${hex.col},${hex.row}`] = {
                    type: hex.objectType,
                    passable: hex.objectType !== 'obstacle' && hex.objectType !== 'monster'
                };
            }
        });
        
        const playerStartHex = activeHexes.find(hex => hex.objectType === 'player_start');
        
        return {
            imageSrc: this.mapImage.src,
            gridWidth: Math.max(...activeHexes.map(h => h.col)) + 1,
            gridHeight: Math.max(...activeHexes.map(h => h.row)) + 1,
            playerStart: playerStartHex ? {x: playerStartHex.col, y: playerStartHex.row} : {x: 0, y: 0},
            cells: cells,
            hexes: activeHexes,
            settings: this.settings
        };
    }
}

// Регистрируем систему в глобальной области
window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен");
