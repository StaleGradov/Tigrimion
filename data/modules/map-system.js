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
        
        // СИСТЕМА ПЕРЕХОДОВ МЕЖДУ КАРТАМИ
        this.mapStack = [];
        this.currentMapType = 'local';
        
        // СИСТЕМА ГЛОБАЛЬНОЙ КАРТЫ
        this.globalProgress = {
            visitedCells: new Set(),
            currentGlobalX: 0,
            currentGlobalY: 0,
            unlockedCells: new Set(),
            discoveredCells: new Set()
        };
        
        this.globalMapConnections = new Map();
        
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
            
            // Символы для глобальной карты
            'global_visited': '🟢',
            'global_current': '🎯',
            'global_next': '🟡',
            'global_locked': '🔴',
            'global_exit': '🚪',
            'local_exit': '🌍',
            'tactical_entrance': '🚪'
        };
        
        // Подсказки
        this.tooltipElement = null;
        this.currentTooltip = null;
        this.tooltipTimeout = null;
        
        console.log("✅ MapSystem инициализирован с системой глобальных карт");
    }

    // ========== ОСНОВНЫЕ МЕТОДЫ ИНИЦИАЛИЗАЦИИ ==========

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
        await this.loadGlobalMapData();
        
        this.debugLoadedMaps();
        
        // ДОБАВЬТЕ ЭТИ СТРОКИ:
        console.log("🔧 Применяем исправления...");
        this.fixCellCoordinates(); // Исправляем координаты
        
        if (this.localMaps.length > 0) {
            this.forceSetLocalMap();
        }
        
        this.setStartPositions();
        this.loadGlobalProgress();
        
        // ПРИНУДИТЕЛЬНАЯ ОТРИСОВКА ПОСЛЕ ЗАГРУЗКИ
        setTimeout(() => {
            console.log("🔄 Принудительная инициализация после загрузки...");
            if (this.currentGlobalMap) {
                this.calculateGlobalMapPositioning();
                this.drawGlobalMap();
            }
            if (this.currentLocalMap) {
                this.calculateMapPositioning();
                this.drawTacticalMap();
            }
        }, 500);
        
        console.log(`✅ Карты загружены: Глобальных=${this.globalMaps.length}, Локальных=${this.localMaps.length}, Тактических=${this.tacticalMaps.length}`);
        return true;
        
    } catch (error) {
        console.error("❌ Ошибка загрузки данных карт:", error);
        this.createFallbackMaps();
        if (this.localMaps.length > 0) {
            this.forceSetLocalMap();
        }
        return true;
    }
}

    // ========== СИСТЕМА ГЛОБАЛЬНОЙ КАРТЫ ==========

    async loadGlobalMapData() {
        try {
            console.log("🌍 Загружаем глобальную карту...");
            
            const globalMapPaths = [
                'data/maps/global/global-map.json',
                'data/maps/global-map.json',
                'maps/global-map.json',
                'data/global-map.json',
                'global-map.json'
            ];
            
            for (const path of globalMapPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processGlobalJSONMap(mapData);
                        console.log(`✅ Глобальная карта загружена из: ${path}`);
                        return true;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить глобальную карту из ${path}:`, e.message);
                }
            }
            
            console.log("⚠️ Глобальная карта не найдена, создаем тестовую...");
            this.createTestGlobalMap();
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки глобальной карты:", error);
            this.createTestGlobalMap();
            return true;
        }
    }

    processGlobalJSONMap(mapData) {
        const globalMap = this.convertTigrimionJSONToMap(mapData, 'global');
        if (globalMap) {
            this.globalMaps = [globalMap];
            this.currentGlobalMap = globalMap;
            
            // Инициализируем прогресс
            this.initializeGlobalProgress();
            
            console.log(`✅ Глобальная карта обработана: ${globalMap.name}`);
            return globalMap;
        }
        return null;
    }

    initializeGlobalProgress() {
        if (!this.currentGlobalMap) {
            console.error("❌ currentGlobalMap не установлена!");
            return;
        }
        
        console.group("🔍 DEBUG initializeGlobalProgress");
        console.log("Все клетки глобальной карты:", Object.values(this.currentGlobalMap.cells));
        console.log("Количество клеток:", Object.keys(this.currentGlobalMap.cells).length);
        
        // Ищем стартовую клетку
        let startCell = Object.values(this.currentGlobalMap.cells)
            .find(cell => cell.type === 'player_start' || cell.type === 'global_current');
        
        console.log("Найдена стартовая клетка:", startCell);
        
        // Если нет специальной стартовой клетки, берем первую активную клетку
        if (!startCell) {
            startCell = Object.values(this.currentGlobalMap.cells)
                .find(cell => cell.type === 'active' && cell.passable !== false);
            console.log("Найдена активная клетка как стартовая:", startCell);
        }
        
        // Если всё еще нет, берем просто первую клетку
        if (!startCell) {
            startCell = Object.values(this.currentGlobalMap.cells)[0];
            console.log("Берем первую клетку как стартовую:", startCell);
        }
        
        if (startCell) {
            this.globalProgress.currentGlobalX = startCell.col;
            this.globalProgress.currentGlobalY = startCell.row;
            
            const cellKey = `${startCell.col},${startCell.row}`;
            this.globalProgress.visitedCells.add(cellKey);
            this.globalProgress.unlockedCells.add(cellKey);
            this.globalProgress.discoveredCells.add(cellKey);
            
            console.log(`🎯 Стартовая позиция на глобальной карте: [${startCell.col}, ${startCell.row}]`);
        } else {
            console.error("❌ Нет подходящих клеток для стартовой позиции на глобальной карте!");
            console.groupEnd();
            return;
        }
        
        // Разблокируем соседние клетки от стартовой позиции
        this.unlockAdjacentGlobalCells(this.globalProgress.currentGlobalX, this.globalProgress.currentGlobalY);
        
        console.log("Итоговый прогресс:", this.globalProgress);
        console.groupEnd();
    }

    unlockAdjacentGlobalCells(x, y) {
        if (!this.currentGlobalMap) return;
        
        const directions = [
            [0, 1], [1, 0], [0, -1], [-1, 0],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        
        directions.forEach(([dx, dy]) => {
            const newX = x + dx;
            const newY = y + dy;
            const cellKey = `${newX},${newY}`;
            
            if (this.currentGlobalMap.cells[cellKey]) {
                this.globalProgress.unlockedCells.add(cellKey);
                this.globalProgress.discoveredCells.add(cellKey);
            }
        });
    }

    saveGlobalProgress() {
        const progress = {
            visitedCells: Array.from(this.globalProgress.visitedCells),
            currentGlobalX: this.globalProgress.currentGlobalX,
            currentGlobalY: this.globalProgress.currentGlobalY,
            unlockedCells: Array.from(this.globalProgress.unlockedCells),
            discoveredCells: Array.from(this.globalProgress.discoveredCells)
        };
        localStorage.setItem('globalMapProgress', JSON.stringify(progress));
        console.log("💾 Прогресс глобальной карты сохранен");
    }

    loadGlobalProgress() {
        try {
            const saved = localStorage.getItem('globalMapProgress');
            if (saved) {
                const progress = JSON.parse(saved);
                this.globalProgress.visitedCells = new Set(progress.visitedCells);
                this.globalProgress.currentGlobalX = progress.currentGlobalX;
                this.globalProgress.currentGlobalY = progress.currentGlobalY;
                this.globalProgress.unlockedCells = new Set(progress.unlockedCells);
                this.globalProgress.discoveredCells = new Set(progress.discoveredCells || []);
                
                console.log("📂 Прогресс глобальной карты загружен", {
                    currentPosition: [this.globalProgress.currentGlobalX, this.globalProgress.currentGlobalY],
                    visited: this.globalProgress.visitedCells.size,
                    unlocked: this.globalProgress.unlockedCells.size
                });
            }
        } catch (error) {
            console.error("❌ Ошибка загрузки прогресса глобальной карты:", error);
        }
    }
    
// ДОБАВЬТЕ В КЛАСС MapSystem
    
fixCellCoordinates() {
    console.group("🔧 ИСПРАВЛЕНИЕ КООРДИНАТ КЛЕТОК");
    
    // Исправляем глобальную карту
    if (this.currentGlobalMap) {
        const cells = Object.values(this.currentGlobalMap.cells);
        console.log(`🌍 Исправляем ${cells.length} клеток глобальной карты`);
        
        cells.forEach(cell => {
            // Используем координаты из редактора как основные
            if (cell.originalData) {
                cell.x = cell.originalData.editorX || cell.x;
                cell.y = cell.originalData.editorY || cell.y;
            }
            // Убеждаемся, что координаты есть
            cell.x = cell.x || 0;
            cell.y = cell.y || 0;
            cell.originalX = cell.x;
            cell.originalY = cell.y;
        });
    }
    
    // Исправляем локальную карту
    if (this.currentLocalMap) {
        const cells = Object.values(this.currentLocalMap.cells);
        console.log(`📍 Исправляем ${cells.length} клеток локальной карты`);
        
        cells.forEach(cell => {
            if (cell.originalData) {
                cell.x = cell.originalData.editorX || cell.x;
                cell.y = cell.originalData.editorY || cell.y;
            }
            cell.x = cell.x || 0;
            cell.y = cell.y || 0;
            cell.originalX = cell.x;
            cell.originalY = cell.y;
        });
    }
    
    console.groupEnd();
}
    // ========== ОТОБРАЖЕНИЕ ГЛОБАЛЬНОЙ КАРТЫ ==========

    renderGlobalMap() {
        if (!this.currentGlobalMap) {
            return '<div class="map-error">Глобальная карта не загружена</div>';
        }

        return `
            <div class="map-overlay-container" style="display: block;">
                <div class="map-content-container global-map-container">
                    <div class="map-header">
                        <h3>🗺️ ${this.currentGlobalMap.name}</h3>
                        <div class="map-controls">
                            <button class="btn-control" onclick="game.systems.map.toggleGrid()">
                                ${this.showGrid ? '🔲 Скрыть сетку' : '🔳 Показать сетку'}
                            </button>
                            <button class="btn-control" onclick="game.systems.map.debugGlobalInfo()">
                                🐛 Отладка
                            </button>
                            <button class="btn-close" onclick="game.hideOverlay()">✕ Закрыть</button>
                            <button class="btn-control" onclick="game.systems.map.debugForceRedraw()">
                           🔄 Принудительная перерисовка
                            </button>
                        </div>
                    </div>
                    
                    <div class="map-main-area">
                        <div class="map-visual-area" id="globalMapVisual">
                            <div class="map-loading">
                                Загрузка глобальной карты...
                            </div>
                        </div>
                        
                        <div class="map-info-panel">
                            <div class="progress-stats">
                                <div class="stat-item">
                                    <span class="stat-label">📍 Текущая позиция:</span>
                                    <span class="stat-value">[${this.globalProgress.currentGlobalX}, ${this.globalProgress.currentGlobalY}]</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">📊 Посещено:</span>
                                    <span class="stat-value">${this.globalProgress.visitedCells.size} гексов</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">🔓 Доступно:</span>
                                    <span class="stat-value">${this.globalProgress.unlockedCells.size} гексов</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">🔄 Обнаружено:</span>
                                    <span class="stat-value">${this.globalProgress.discoveredCells.size} гексов</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="map-legend">
                        <div class="legend-title">📋 Легенда карты:</div>
                        <div class="legend-grid">
                            <div class="legend-item">
                                <span class="legend-symbol">🎯</span>
                                <span>Текущая позиция</span>
                            </div>
                            <div class="legend-item">
                                <span class="legend-symbol">🟢</span>
                                <span>Посещённые</span>
                            </div>
                            <div class="legend-item">
                                <span class="legend-symbol">🟡</span>
                                <span>Доступные</span>
                            </div>
                            <div class="legend-item">
                                <span class="legend-symbol">🔴</span>
                                <span>Заблокированные</span>
                            </div>
                            <div class="legend-item">
                                <span class="legend-symbol">🚪</span>
                                <span>Переходы</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    initGlobalMapCanvas() {
        console.group("🔍 DEBUG initGlobalMapCanvas");
        
        const container = document.getElementById('globalMapVisual');
        if (!container) {
            console.error("❌ Контейнер globalMapVisual не найден");
            console.groupEnd();
            return;
        }

        console.log("Очищаем контейнер...");
        container.innerHTML = '';

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'globalMapCanvas';
        this.canvas.className = 'map-canvas';
        
        // Устанавливаем размеры canvas
        const containerRect = container.getBoundingClientRect();
        this.canvas.width = containerRect.width;
        this.canvas.height = containerRect.height;
        
        container.appendChild(this.canvas);

        console.log("Canvas создан:", this.canvas);
        console.log("Canvas размеры:", this.canvas.width, "x", this.canvas.height);

        this.ctx = this.canvas.getContext('2d');
        console.log("Контекст создан:", this.ctx);
        
        // Рассчитываем позиционирование
        this.calculateGlobalMapPositioning();
        
        // Настраиваем обработчики событий
        this.setupGlobalCanvasEventListeners();
        
        // Рисуем карту
        setTimeout(() => {
            console.log("🔍 Проверка перед отрисовкой:", {
                ctx: !!this.ctx,
                currentGlobalMap: !!this.currentGlobalMap,
                canvas: !!this.canvas
            });
            
            if (this.ctx && this.currentGlobalMap && this.canvas) {
                console.log("✅ Все условия выполнены, вызываем drawGlobalMap");
                this.drawGlobalMap();
            } else {
                console.error("❌ Условия не выполнены для отрисовки");
                this.drawTestFallback();
            }
        }, 100);
        
        console.log("✅ initGlobalMapCanvas завершен");
        console.groupEnd();
    }

   calculateGlobalMapPositioning() {
    console.group("🔍 DEBUG calculateGlobalMapPositioning - ИСПРАВЛЕННЫЙ");
    
    if (!this.currentGlobalMap) {
        console.error("❌ currentGlobalMap не установлена!");
        console.groupEnd();
        return;
    }

    const container = document.getElementById('globalMapVisual');
    if (!container) {
        console.error("❌ Контейнер globalMapVisual не найден!");
        console.groupEnd();
        return;
    }

    // ОЧИЩАЕМ КОНТЕЙНЕР
    container.innerHTML = '';
    
    // СОЗДАЕМ CANVAS
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'globalMapCanvas';
    this.canvas.className = 'map-canvas';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.display = 'block';
    
    container.appendChild(this.canvas);

    // УСТАНАВЛИВАЕМ РАЗМЕРЫ CANVAS
    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    console.log(`📐 Размер контейнера: ${rect.width}x${rect.height}`);
    console.log(`📐 Размер canvas: ${this.canvas.width}x${this.canvas.height}`);

    this.ctx = this.canvas.getContext('2d');
    
    // ПОЛУЧАЕМ РАЗМЕРЫ КАРТЫ ИЗ ДАННЫХ
    const cells = Object.values(this.currentGlobalMap.cells);
    if (cells.length === 0) {
        console.error("❌ Нет клеток для отображения!");
        console.groupEnd();
        return;
    }

    // НАХОДИМ ГРАНИЦЫ КАРТЫ
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cells.forEach(cell => {
        if (cell.x < minX) minX = cell.x;
        if (cell.y < minY) minY = cell.y;
        if (cell.x > maxX) maxX = cell.x;
        if (cell.y > maxY) maxY = cell.y;
    });
    
    const mapWidth = maxX - minX + 100; // + отступы
    const mapHeight = maxY - minY + 100;
    
    console.log(`🗺️ Границы карты: X[${minX}-${maxX}], Y[${minY}-${maxY}]`);
    console.log(`📏 Размер карты: ${mapWidth}x${mapHeight}`);

    // РАСЧЕТ МАСШТАБА ДЛЯ ВМЕЩЕНИЯ ВСЕЙ КАРТЫ
    const scaleX = rect.width / mapWidth;
    const scaleY = rect.height / mapHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% чтобы были отступы
    
    // ЦЕНТРИРОВАНИЕ
    const offsetX = (rect.width - mapWidth * scale) / 2;
    const offsetY = (rect.height - mapHeight * scale) / 2;

    console.log(`📏 Масштаб: ${scale.toFixed(3)}, Смещение: [${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}]`);

    // ОБРАБАТЫВАЕМ КЛЕТКИ
    let processedCount = 0;
    let visibleCount = 0;
    
    cells.forEach(cell => {
        // ПРИМЕНЯЕМ МАСШТАБ И СМЕЩЕНИЕ ОТНОСИТЕЛЬНО ГРАНИЦ
        cell.displayX = (cell.x - minX) * scale + offsetX;
        cell.displayY = (cell.y - minY) * scale + offsetY;
        processedCount++;
        
        if (cell.visible) visibleCount++;
        
        // ДЕБАГ ПЕРВЫХ 3 КЛЕТОК
        if (processedCount <= 3) {
            console.log(`Клетка ${processedCount}:`, {
                оригинал: `[${cell.x}, ${cell.y}]`,
                отображение: `[${cell.displayX.toFixed(1)}, ${cell.displayY.toFixed(1)}]`,
                тип: cell.type,
                col: cell.col,
                row: cell.row,
                видима: cell.visible
            });
        }
    });

    console.log(`✅ Позиционирование завершено. Обработано: ${processedCount}, Видимых: ${visibleCount}`);
    console.groupEnd();
}

   drawGlobalMap() {
    console.group("🔍 DEBUG drawGlobalMap - ИСПРАВЛЕННЫЙ");
    
    if (!this.ctx) {
        console.error("❌ Canvas context не доступен");
        console.groupEnd();
        return;
    }
    
    if (!this.currentGlobalMap) {
        console.error("❌ Глобальная карта не доступна");
        console.groupEnd();
        return;
    }
    
    if (!this.canvas) {
        console.error("❌ Canvas не доступен");
        console.groupEnd();
        return;
    }

    const canvas = this.canvas;
    console.log("🎨 Начинаем отрисовку глобальной карты...");
    console.log("Canvas размеры:", canvas.width, "x", canvas.height);
    
    // Очищаем canvas
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    try {
        // Рисуем фон
        this.drawGlobalBackground();
        console.log("✅ Фон нарисован");
        
        // Рисуем гексы
        const cells = Object.values(this.currentGlobalMap.cells);
        let drawnCount = 0;
        
        cells.forEach(cell => {
            if (cell.visible && cell.displayX !== undefined && cell.displayY !== undefined) {
                this.drawSingleGlobalHex(cell);
                this.drawGlobalHexContent(cell);
                drawnCount++;
            }
        });
        
        console.log(`✅ Отрисовано гексов: ${drawnCount}`);

        if (this.showGrid) {
            this.drawGlobalHexGrid();
            console.log("✅ Сетка нарисована");
        }
        
    } catch (error) {
        console.error("❌ Ошибка при отрисовке:", error);
        this.drawTestFallback();
    }
    
    console.log("✅ drawGlobalMap завершен");
    console.groupEnd();
}

    

    drawGlobalBackground() {
        const map = this.currentGlobalMap;
        if (!map.image) {
            // Градиентный фон для глобальной карты
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#0f172a');
            gradient.addColorStop(0.5, '#1e293b');
            gradient.addColorStop(1, '#334155');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        const editorWidth = map.originalCanvasWidth || 1024;
        const editorHeight = map.originalCanvasHeight || 1024;

        const scaleX = this.canvas.width / editorWidth;
        const scaleY = this.canvas.height / editorHeight;
        const scale = Math.min(scaleX, scaleY, 1.0);

        const offsetX = (this.canvas.width - editorWidth * scale) / 2;
        const offsetY = (this.canvas.height - editorHeight * scale) / 2;

        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(
                img, 
                offsetX, 
                offsetY, 
                editorWidth * scale, 
                editorHeight * scale
            );
            
            this.drawGlobalHexes();
            if (this.showGrid) {
                this.drawGlobalHexGrid();
            }
        };
        img.onerror = () => {
            console.error("❌ Ошибка загрузки фона глобальной карты");
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#0f172a');
            gradient.addColorStop(1, '#334155');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        };
        img.src = map.image;
    }

    drawGlobalHexes() {
        const cells = Object.values(this.currentGlobalMap.cells);
        
        let drawnCount = 0;
        let skippedCount = 0;
        
        cells.forEach(cell => {
            if (cell.visible) {
                if (cell.displayX !== undefined && cell.displayY !== undefined) {
                    this.drawSingleGlobalHex(cell);
                    this.drawGlobalHexContent(cell);
                    drawnCount++;
                } else {
                    console.warn(`⚠️ Пропуск видимой клетки [${cell.col},${cell.row}] - нет координат`);
                    skippedCount++;
                }
            }
        });
        
        console.log(`🎨 Отрисовано глобальных клеток: ${drawnCount}, пропущено: ${skippedCount}`);
    }

    drawSingleGlobalHex(cell) {
        const hexSize = this.currentGlobalMap.cellSize || 30;
        
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

        // Определяем цвет заливки в зависимости от статуса гекса
        const cellKey = `${cell.col},${cell.row}`;
        let fillColor = 'rgba(100, 100, 100, 0.3)';
        
        if (this.globalProgress.currentGlobalX === cell.col && this.globalProgress.currentGlobalY === cell.row) {
            fillColor = 'rgba(255, 215, 0, 0.4)';
        } else if (this.globalProgress.visitedCells.has(cellKey)) {
            fillColor = 'rgba(34, 197, 94, 0.4)';
        } else if (this.globalProgress.unlockedCells.has(cellKey)) {
            fillColor = 'rgba(234, 179, 8, 0.4)';
        } else if (this.globalProgress.discoveredCells.has(cellKey)) {
            fillColor = 'rgba(59, 130, 246, 0.3)';
        }

        this.ctx.fillStyle = fillColor;
        this.ctx.fill();

        if (this.showGrid) {
            this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    drawGlobalHexContent(cell) {
        const centerX = cell.displayX;
        const centerY = cell.displayY;
        
        if (!centerX || !centerY) return;

        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        let symbol = '·';
        let color = '#ffffff';
        let fontSize = 14;

        const cellKey = `${cell.col},${cell.row}`;
        
        // Определяем символ для гекса
        if (this.globalProgress.currentGlobalX === cell.col && this.globalProgress.currentGlobalY === cell.row) {
            symbol = '🎯';
            fontSize = 18;
            color = '#fbbf24';
        } else if (cell.type === 'local_exit' || cell.type === 'tactical_entrance') {
            symbol = this.objectSymbols[cell.type] || '🚪';
            color = '#8b5cf6';
            fontSize = 16;
        } else if (this.globalProgress.visitedCells.has(cellKey)) {
            symbol = '🟢';
            color = '#22c55e';
        } else if (this.globalProgress.unlockedCells.has(cellKey)) {
            symbol = '🟡';
            color = '#eab308';
        } else if (this.globalProgress.discoveredCells.has(cellKey)) {
            symbol = '🔵';
            color = '#3b82f6';
        } else {
            symbol = '🔴';
            color = '#ef4444';
        }

        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(symbol, centerX, centerY);
        this.ctx.restore();
    }

    drawGlobalHexGrid() {
        const cells = Object.values(this.currentGlobalMap.cells);
        const hexSize = this.currentGlobalMap.cellSize || 30;
        
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
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

    drawTestFallback() {
        if (!this.ctx || !this.canvas) return;
        
        console.log("🎨 Рисуем тестовый fallback...");
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🗺️ Глобальная карта', this.canvas.width / 2, this.canvas.height / 2 - 30);
        
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Загружена: ' + (this.currentGlobalMap?.name || 'неизвестно'), this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.fillText('Клеток: ' + (this.currentGlobalMap ? Object.keys(this.currentGlobalMap.cells).length : 0), this.canvas.width / 2, this.canvas.height / 2 + 30);
        this.ctx.fillText('Canvas: ' + this.canvas.width + 'x' + this.canvas.height, this.canvas.width / 2, this.canvas.height / 2 + 60);
        
        console.log("✅ Тестовый fallback нарисован");
    }

    // ========== ОБРАБОТЧИКИ СОБЫТИЙ ДЛЯ ГЛОБАЛЬНОЙ КАРТЫ ==========

    setupGlobalCanvasEventListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('click', (e) => this.handleGlobalCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleGlobalCanvasHover(e));
        this.canvas.addEventListener('mouseleave', () => this.hideTooltip());

        window.addEventListener('resize', () => {
            setTimeout(() => {
                if (this.canvas) {
                    this.calculateGlobalMapPositioning();
                    this.drawGlobalMap();
                }
            }, 100);
        });
    }

    handleGlobalCanvasClick(e) {
        if (!this.currentGlobalMap) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = this.getHexAtCanvasPosition(x, y);
        
        if (!hex) return;
        
        console.log(`🌍 Клик по глобальному гексу:`, {
            type: hex.type,
            col: hex.col,
            row: hex.row,
            position: [this.globalProgress.currentGlobalX, this.globalProgress.currentGlobalY]
        });

        if (window.game) {
            window.game.showNotification("🗺️ Глобальная карта только для просмотра. Используйте локальную карту для перемещения.", 'info');
        }
    }

    handleGlobalCanvasHover(e) {
        if (!this.currentGlobalMap) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = this.getHexAtCanvasPosition(x, y);
        
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }

        if (!hex || (this.currentTooltip && hex && (this.currentTooltip.col !== hex.col || this.currentTooltip.row !== hex.row))) {
            this.hideTooltip();
        }

        if (hex && (!this.currentTooltip || this.currentTooltip.col !== hex.col || this.currentTooltip.row !== hex.row)) {
            this.tooltipTimeout = setTimeout(() => {
                this.showTooltipForGlobalHex(hex, e.clientX, e.clientY);
            }, 200);
        }
    }

    showTooltipForGlobalHex(hex, mouseX, mouseY) {
        const tooltipText = this.getGlobalTooltipTextForHex(hex);
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

        this.drawGlobalMap();
    }

    getGlobalTooltipTextForHex(hex) {
        const cellKey = `${hex.col},${hex.row}`;
        
        let status = '';
        if (this.globalProgress.currentGlobalX === hex.col && this.globalProgress.currentGlobalY === hex.row) {
            status = '🎯 ТЕКУЩАЯ ПОЗИЦИЯ';
        } else if (this.globalProgress.visitedCells.has(cellKey)) {
            status = '🟢 Посещён';
        } else if (this.globalProgress.unlockedCells.has(cellKey)) {
            status = '🟡 Доступен';
        } else if (this.globalProgress.discoveredCells.has(cellKey)) {
            status = '🔵 Обнаружен';
        } else {
            status = '🔴 Заблокирован';
        }

        if (hex.tooltip) {
            return `${hex.tooltip}\nСтатус: ${status}`;
        }

        const defaultTooltips = {
            'player_start': '⭐ Стартовая позиция',
            'local_exit': '🌍 Выход в другую зону',
            'tactical_entrance': '🚪 Вход в помещение',
            'village': '🏘️ Деревня',
            'castle': '🏰 Замок',
            'cave': '🕳️ Пещера',
            'forest': '🌲 Лес',
            'mountain': '⛰️ Горы',
            'water': '💧 Водоём'
        };

        const baseTooltip = defaultTooltips[hex.type] || `Глобальная позиция: [${hex.col}, ${hex.row}]`;
        return `${baseTooltip}\nСтатус: ${status}`;
    }

    // ========== СИСТЕМА ПЕРЕХОДОВ МЕЖДУ КАРТАМИ ==========

    handleLocalToLocalTransition(exitCell) {
        if (!exitCell.localMap) {
            console.error("❌ Нет указанной локальной карты для перехода");
            return;
        }

        console.log(`🌍 Переход на новую локальную карту: ${exitCell.localMap}`);
        
        if (exitCell.globalTargetX !== undefined && exitCell.globalTargetY !== undefined) {
            const oldX = this.globalProgress.currentGlobalX;
            const oldY = this.globalProgress.currentGlobalY;
            
            this.globalProgress.currentGlobalX = exitCell.globalTargetX;
            this.globalProgress.currentGlobalY = exitCell.globalTargetY;
            
            const newCellKey = `${exitCell.globalTargetX},${exitCell.globalTargetY}`;
            this.globalProgress.visitedCells.add(newCellKey);
            
            this.unlockAdjacentGlobalCells(exitCell.globalTargetX, exitCell.globalTargetY);
            
            this.saveGlobalProgress();
            
            console.log(`📍 Перемещение на глобальной карте: [${oldX},${oldY}] → [${exitCell.globalTargetX},${exitCell.globalTargetY}]`);
        }
        
        this.loadLocalMapFile(exitCell.localMap).then(success => {
            if (success && window.game) {
                window.game.showNotification(`🌍 Переход в новую зону!`, 'success');
            }
        });
    }

    async handleMapTransition(transitionCell) {
        if (!transitionCell) return;

        this.saveCurrentMapToStack();
        
        try {
            if (transitionCell.tacticalMap) {
                await this.loadTacticalMapFile(transitionCell.tacticalMap);
                this.currentMapType = 'tactical';
                console.log(`🚪 Вход в тактическую карту: ${transitionCell.tacticalMap}`);
                
            } else if (transitionCell.localMap) {
                await this.loadLocalMapFile(transitionCell.localMap);
                this.currentMapType = 'local';
                
                if (transitionCell.targetPosition) {
                    this.playerTacticalPosition = {...transitionCell.targetPosition};
                }
                
                console.log(`🌍 Переход на локальную карту: ${transitionCell.localMap}`);
                
            } else if (transitionCell.globalMap) {
                await this.loadGlobalMapFile(transitionCell.globalMap);
                this.currentMapType = 'global';
                console.log(`🗺️ Переход на глобальную карту: ${transitionCell.globalMap}`);
            }
            
            this.calculateMapPositioning();
            this.drawTacticalMap();
            
        } catch (error) {
            console.error("❌ Ошибка перехода между картами:", error);
            this.exitToPreviousMap();
        }
    }

    exitToPreviousMap() {
        if (this.mapStack.length === 0) {
            console.log("🚫 Нет предыдущей карты для возврата");
            return;
        }
        
        const savedState = this.mapStack.pop();
        if (savedState) {
            this.currentTacticalMap = savedState.map;
            this.playerTacticalPosition = savedState.playerPosition;
            this.currentMapType = savedState.mapType;
            
            if (savedState.mapType === 'local') {
                this.currentLocalMap = savedState.map;
            }
            
            console.log(`🚪 Возврат на ${savedState.mapType} карту: ${savedState.map.name}`);
            
            this.calculateMapPositioning();
            this.drawTacticalMap();
        }
    }

    saveCurrentMapToStack() {
        const mapState = {
            map: this.currentTacticalMap,
            playerPosition: {...this.playerTacticalPosition},
            mapType: this.currentMapType,
            localMap: this.currentLocalMap
        };
        this.mapStack.push(mapState);
        console.log(`💾 Сохранено состояние карты в стек (глубина: ${this.mapStack.length})`);
    }

    // ========== ЗАГРУЗКА КАРТ ИЗ JSON ==========

    async loadJSONMaps() {
        try {
            console.log("🔄 Загружаем JSON карты...");
            
            const tacticalMapPaths = [
                'data/maps/tactical/tactical-maps.json',
                'data/maps/tactical-maps.json',
                'maps/tactical-maps.json', 
                'data/tactical-maps.json',
                'tactical-maps.json',
                'data/modules/maps/tactical-maps.json'
            ];
            
            const localMapPaths = [
                'data/maps/local/local-maps.json',
                'data/maps/local-maps.json', 
                'maps/local-maps.json',
                'data/local-maps.json',
                'local-maps.json',
                'data/modules/maps/local-maps.json'
            ];
            
            let tacticalLoaded = false;
            for (const path of tacticalMapPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processTigrimionJSONMaps(mapData, 'tactical');
                        console.log(`✅ Тактические карты загружены из: ${path}`);
                        tacticalLoaded = true;
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить тактические карты из ${path}:`, e.message);
                }
            }
            
            let localLoaded = false;
            for (const path of localMapPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processTigrimionJSONMaps(mapData, 'local');
                        console.log(`✅ Локальные карты загружены из: ${path}`);
                        localLoaded = true;
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить локальные карты из ${path}:`, e.message);
                }
            }
            
            console.log(`ℹ️ Итог загрузки: Тактические: ${tacticalLoaded}, Локальные: ${localLoaded}`);
            
        } catch (error) {
            console.error("❌ Ошибка загрузки JSON карт:", error);
        }
    }

    async processTigrimionJSONMaps(mapData, mapType = 'tactical') {
        if (!mapData || !mapData.meta) {
            console.warn("❌ Неверный формат JSON карты Tigrimion");
            return;
        }

        try {
            const convertedMap = this.convertTigrimionJSONToMap(mapData, mapType);
            if (convertedMap) {
                if (mapType === 'tactical') {
                    this.tacticalMaps.push(convertedMap);
                } else if (mapType === 'local') {
                    this.localMaps.push(convertedMap);
                }
                
                this.loadedJSONMaps.set(convertedMap.id, convertedMap);
                console.log(`✅ Обработана ${mapType} карта: ${convertedMap.name}`);
            }
        } catch (error) {
            console.error(`❌ Ошибка обработки ${mapType} карты:`, error);
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
                tacticalMap: cell.tacticalMap,
                localMap: cell.localMap,
                globalMap: cell.globalMap,
                targetPosition: cell.targetPosition,
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
            id: mapType === 'tactical' ? this.tacticalMaps.length + 1 : this.localMaps.length + 1,
            name: jsonMap.meta?.name || `${mapType === 'tactical' ? 'Тактическая' : 'Локальная'} карта`,
            image: jsonMap.visual?.backgroundImage || "",
            width: 20,
            height: 20,
            startPosition: startPosition,
            description: jsonMap.meta?.description || `Создана в редакторе карт Tigrimion`,
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

    // ========== УПРАВЛЕНИЕ ЛОКАЛЬНЫМИ КАРТАМИ ==========

    forceSetLocalMap() {
        if (this.localMaps.length > 0) {
            const localMap = this.localMaps[0];
            this.currentLocalMap = localMap;
            this.currentTacticalMap = localMap;
            this.playerLocalPosition = {...localMap.startPosition};
            this.playerTacticalPosition = {...localMap.startPosition};
            this.currentMapType = 'local';
            
            console.log("✅ Локальная карта принудительно установлена:", {
                name: localMap.name,
                cells: Object.keys(localMap.cells).length,
                startPosition: localMap.startPosition
            });
            return true;
        }
        console.log("❌ Нет локальных карт для установки");
        return false;
    }

    forceLoadLocalMap() {
        if (this.localMaps.length > 0 && !this.currentLocalMap) {
            const localMap = this.localMaps[0];
            this.setCurrentLocalMap(localMap);
            console.log("🔄 Локальная карта принудительно загружена:", localMap.name);
        }
    }

    setCurrentLocalMap(localMap) {
        if (!localMap) {
            console.error("❌ Попытка установить пустую локальную карту");
            return;
        }
        
        this.currentLocalMap = localMap;
        this.currentTacticalMap = localMap;
        this.playerLocalPosition = {...localMap.startPosition};
        this.playerTacticalPosition = {...localMap.startPosition};
        this.currentMapType = 'local';
        
        console.log(`📍 Установлена локальная карта: ${localMap.name}`, {
            startPosition: localMap.startPosition,
            cellsCount: Object.keys(localMap.cells).length
        });
        
        if (this.canvasInitialized) {
            this.calculateMapPositioning();
            this.drawTacticalMap();
        }
    }

    // ========== ЗАГРУЗКА ФАЙЛОВ КАРТ ==========

    async loadTacticalMapFile(mapPath) {
        try {
            console.log(`📥 Загружаем тактическую карту: ${mapPath}`);
            
            const response = await fetch(mapPath);
            if (!response.ok) {
                throw new Error(`Не удалось загрузить карту: ${mapPath}`);
            }
            
            const mapData = await response.json();
            const tacticalMap = this.convertTigrimionJSONToMap(mapData, 'tactical');
            
            if (tacticalMap) {
                this.currentTacticalMap = tacticalMap;
                this.setPlayerToStartPosition();
                
                console.log(`✅ Тактическая карта загружена: ${tacticalMap.name}`);
                return tacticalMap;
            }
        } catch (error) {
            console.error(`❌ Ошибка загрузки тактической карты:`, error);
            throw error;
        }
        return null;
    }

    async loadLocalMapFile(mapPath) {
        try {
            console.log(`📥 Загружаем локальную карту: ${mapPath}`);
            
            const response = await fetch(mapPath);
            if (!response.ok) {
                throw new Error(`Не удалось загрузить локальную карту: ${mapPath}`);
            }
            
            const mapData = await response.json();
            const localMap = this.convertTigrimionJSONToMap(mapData, 'local');
            
            if (localMap) {
                this.setCurrentLocalMap(localMap);
                console.log(`✅ Локальная карта загружена: ${localMap.name}`);
                return localMap;
            }
        } catch (error) {
            console.error(`❌ Ошибка загрузки локальной карты:`, error);
            throw error;
        }
        return null;
    }

    async loadGlobalMapFile(mapPath) {
        console.log(`🌍 Загрузка глобальной карта: ${mapPath}`);
        return null;
    }

    setPlayerToStartPosition() {
        if (!this.currentTacticalMap) return;
        
        const startCell = Object.values(this.currentTacticalMap.cells)
            .find(cell => cell.type === 'player_start');
        
        if (startCell) {
            this.playerTacticalPosition = {x: startCell.col, y: startCell.row};
            console.log(`🎯 Герой установлен на стартовую позицию: [${startCell.col}, ${startCell.row}]`);
        } else {
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
        }
    }

    // ========== СИСТЕМА ПЕРЕМЕЩЕНИЯ И БОЯ ==========

    handleCanvasClick(e) {
        if (!this.currentTacticalMap) {
            console.error("❌ currentTacticalMap не установлена!");
            return;
        }

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hex = this.getHexAtCanvasPosition(x, y);
        
        if (!hex) {
            console.log("❌ Гекс не найден по этим координатам");
            return;
        }
        
        console.log(`🎲 Клик по клетке:`, {
            type: hex.type,
            col: hex.col,
            row: hex.row,
            localMap: hex.localMap,
            tacticalMap: hex.tacticalMap,
            passable: hex.passable
        });

        const isAdjacentToPlayer = this.isHexAdjacentToPlayer(hex);
        
        if (hex.type === 'local_exit' && isAdjacentToPlayer) {
            console.log(`🌍 ОБНАРУЖЕН ПЕРЕХОД НА ЛОКАЛЬНУЮ КАРТУ: ${hex.localMap}`);
            this.handleLocalToLocalTransition(hex);
            return;
        }
        
        if (hex.tacticalMap && isAdjacentToPlayer) {
            console.log(`🚪 Вход в тактическую карту: ${hex.tacticalMap}`);
            this.handleMapTransition(hex);
            return;
        }
        
        if (hex.type === 'exit') {
            console.log("🎲 Клик по выходу");
            this.exitToPreviousMap();
            return;
        }
        
        if ((hex.localMap || hex.tacticalMap) && !isAdjacentToPlayer) {
            console.log(`🚫 ПЕРЕХОД ЗАБЛОКИРОВАН: герой не на соседней клетке`);
            if (window.game) {
                window.game.showNotification("Подойдите ближе к входу!", 'warning');
            }
            return;
        }
        
        if (hex.passable !== false || hex.type === 'monster') {
            console.log(`🎲 Клик по проходимой клетке: [${hex.col}, ${hex.row}] тип: ${hex.type}`);
            this.moveOnTacticalMap(hex.col, hex.row);
        } else {
            console.log(`🚫 Клетка непроходимая: [${hex.col}, ${hex.row}] тип: ${hex.type}`);
        }
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

        if (cellData.tacticalMap || cellData.localMap || cellData.globalMap) {
            console.log(`🎯 Попытка перехода через moveOnTacticalMap`);
            if (this.isHexAdjacentToPlayer(cellData)) {
                this.handleMapTransition(cellData);
            } else {
                console.log(`🚫 Переход заблокирован: герой не рядом`);
                if (window.game) {
                    window.game.showNotification("Подойдите ближе к входу!", 'warning');
                }
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
        
        if (this.activeOverlay === 'tactical-map') {
            this.calculateMapPositioning();
            this.drawTacticalMap();
        }
        
        this.pendingMovement = null;
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

    getMonsterFromCell(cellData) {
        if (!cellData || cellData.type !== 'monster' || !cellData.monster_id) {
            return null;
        }
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return null;
        
        return battleSystem.getMonsterById(cellData.monster_id);
    }

    // ========== CANVAS И ОТОБРАЖЕНИЕ ЛОКАЛЬНЫХ/ТАКТИЧЕСКИХ КАРТ ==========

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
        
        console.log(`📐 Размер контейнера: ${rect.width}x${rect.height}`);
        
        const editorWidth = this.currentTacticalMap.originalCanvasWidth || 1024;
        const editorHeight = this.currentTacticalMap.originalCanvasHeight || 1024;

        console.log(`🎯 Размер редактора: ${editorWidth}x${editorHeight}`);

        const scaleX = rect.width / editorWidth;
        const scaleY = rect.height / editorHeight;
        const scale = Math.min(scaleX, scaleY, 1.0);

        const offsetX = (rect.width - editorWidth * scale) / 2;
        const offsetY = (rect.height - editorHeight * scale) / 2;

        console.log(`📏 Масштаб: ${scale.toFixed(3)}, Смещение: [${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}]`);

        Object.values(this.currentTacticalMap.cells).forEach(cell => {
            const originalX = cell.originalX || cell.x;
            const originalY = cell.originalY || cell.y;
            
            cell.displayX = originalX * scale + offsetX;
            cell.displayY = originalY * scale + offsetY;
        });

        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        console.log(`✅ Позиционирование завершено`);
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
        if (!this.currentTacticalMap) {
            console.error("❌ currentTacticalMap не доступна для поиска гекса");
            return null;
        }

        const hexSize = (this.currentTacticalMap.cellSize || 40) * 0.8;
        
        console.log(`🔍 Поиск гекса по координатам: [${canvasX}, ${canvasY}], размер гекса: ${hexSize}`);
        
        if (this.lastHoveredHex) {
            const centerX = this.lastHoveredHex.displayX;
            const centerY = this.lastHoveredHex.displayY;
            
            if (centerX && centerY) {
                const distance = Math.sqrt(
                    Math.pow(canvasX - centerX, 2) + 
                    Math.pow(canvasY - centerY, 2)
                );
                
                console.log(`📏 Расстояние до кэшированного гекса: ${distance}`);
                
                if (distance <= hexSize) {
                    console.log(`✅ Используем кэшированный гекс:`, this.lastHoveredHex);
                    return this.lastHoveredHex;
                }
            }
        }
        
        let closestHex = null;
        let minDistance = Infinity;
        
        for (const cell of Object.values(this.currentTacticalMap.cells)) {
            const centerX = cell.displayX;
            const centerY = cell.displayY;
            
            if (!centerX || !centerY) {
                console.log(`⚠️ У клетки [${cell.col},${cell.row}] нет display координат`);
                continue;
            }
            
            const distance = Math.sqrt(
                Math.pow(canvasX - centerX, 2) + 
                Math.pow(canvasY - centerY, 2)
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                closestHex = cell;
            }
            
            if (distance <= hexSize) {
                console.log(`✅ Найден гекс [${cell.col},${cell.row}] на расстоянии ${distance}`);
                this.lastHoveredHex = cell;
                return cell;
            }
        }
        
        if (closestHex && minDistance < hexSize * 2) {
            console.log(`⚠️ Ближайший гекс [${closestHex.col},${closestHex.row}] на расстоянии ${minDistance}`);
        } else {
            console.log(`❌ Гекс не найден. Ближайший на расстоянии ${minDistance}`);
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

        if (hex.tooltip) {
            return hex.tooltip;
        }

        if (hex.tacticalMap) {
            return "🚪 Вход в помещение\n(Кликните для входа)";
        }
        if (hex.localMap) {
            return "🌍 Переход в другой регион\n(Кликните для перехода)";
        }
        if (hex.globalMap) {
            return "🗺️ Переход на глобальную карту\n(Кликните для перехода)";
        }
        if (hex.type === 'exit') {
            return "🚪 Выход\n(Кликните для возврата)";
        }

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

        const scaleX = this.canvas.width / editorWidth;
        const scaleY = this.canvas.height / editorHeight;
        const scale = Math.min(scaleX, scaleY, 1.0);

        const offsetX = (this.canvas.width - editorWidth * scale) / 2;
        const offsetY = (this.canvas.height - editorHeight * scale) / 2;

        const img = new Image();
        img.onload = () => {
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
            if (cell.type === 'active' && !cell.objectType) {
                symbol = '·';
                color = '#ffffff';
                fontSize = 24;
            } else {
                symbol = this.objectSymbols[cell.type] || '·';
                
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

    drawSingleHexWithHighlight(hex) {
        if (!this.ctx || !hex) return;
        
        const hexSize = this.currentTacticalMap.cellSize || 40;
        const centerX = hex.displayX;
        const centerY = hex.displayY;
        
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
        
        this.drawHexContent(hex);
    }

    // ========== СИСТЕМА НАВИГАЦИИ И СОСЕДЕЙ ==========

    getAvailableMoves() {
        if (!this.currentTacticalMap) return [];
        
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        
        console.log(`📍 Текущая позиция: [${currentCol}, ${currentRow}]`);
        console.log(`🎯 Доступные ходы:`, neighbors.map(n => `[${n.col}, ${n.row}]`));
        
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

    isHexAdjacentToPlayer(targetHex) {
        if (!this.currentTacticalMap) return false;
        
        const playerX = this.playerTacticalPosition.x;
        const playerY = this.playerTacticalPosition.y;
        
        console.log(`📍 Проверка соседства: игрок [${playerX},${playerY}] -> цель [${targetHex.col},${targetHex.row}]`);
        
        const playerNeighbors = this.getHexNeighbors(playerY, playerX);
        
        const isAdjacent = playerNeighbors.some(neighbor => 
            neighbor.col === targetHex.col && neighbor.row === targetHex.row
        );
        
        console.log(`📏 Результат проверки соседства: ${isAdjacent}`);
        
        if (isAdjacent) {
            console.log(`✅ Клетка [${targetHex.col},${targetHex.row}] соседняя с игроком`);
        } else {
            console.log(`❌ Клетка [${targetHex.col},${targetHex.row}] НЕ соседняя с игроком`);
            console.log(`🎯 Соседи игрока:`, playerNeighbors.map(n => `[${n.col},${n.row}]`));
        }
        
        return isAdjacent;
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

    // ========== СИСТЕМА КАРТ И ОТОБРАЖЕНИЯ ==========

    setStartPositions() {
        console.log("🎯 Устанавливаем стартовые позиции...");
        
        if (this.globalMaps.length > 0) {
            this.currentGlobalMap = this.globalMaps[0];
            console.log(`🗺️ Установлена глобальная карта: ${this.currentGlobalMap.name}`);
        }
        
        if (this.localMaps.length > 0 && this.currentLocalMap) {
            console.log(`📍 Используем установленную локальную карту: ${this.currentLocalMap.name}`);
        } else if (this.tacticalMaps.length > 0) {
            this.currentTacticalMap = this.tacticalMaps[0];
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
            this.currentMapType = 'tactical';
            console.log(`🎯 Установлена стартовая тактическая карта: ${this.currentTacticalMap.name}`);
        }
        
        console.log("✅ Стартовые позиции установлены:", {
            global: [this.globalProgress.currentGlobalX, this.globalProgress.currentGlobalY],
            local: this.playerLocalPosition, 
            tactical: this.playerTacticalPosition,
            mapType: this.currentMapType
        });
    }

    debugLoadedMaps() {
        console.group("📊 Отладка загруженных карт");
        console.log("Глобальные карты:", this.globalMaps.length);
        this.globalMaps.forEach((map, index) => {
            console.log(`  ${index + 1}. ${map.name} (клеток: ${Object.keys(map.cells).length})`);
        });
        console.log("Локальные карты:", this.localMaps.length);
        this.localMaps.forEach((map, index) => {
            console.log(`  ${index + 1}. ${map.name} (клеток: ${Object.keys(map.cells).length})`);
        });
        console.log("Тактические карты:", this.tacticalMaps.length);
        console.log("Текущая глобальная карта:", this.currentGlobalMap?.name || 'нет');
        console.log("Текущая локальная карта:", this.currentLocalMap?.name || 'нет');
        console.log("Текущая тактическая карта:", this.currentTacticalMap?.name || 'нет');
        console.log("Текущий тип карты:", this.currentMapType);
        console.log("Прогресс глобальной карты:", {
            current: [this.globalProgress.currentGlobalX, this.globalProgress.currentGlobalY],
            visited: this.globalProgress.visitedCells.size,
            unlocked: this.globalProgress.unlockedCells.size
        });
        console.groupEnd();
    }

    // ========== ОТОБРАЖЕНИЕ КАРТ ==========

    showMapOverlay(overlayType, container) {
        console.group(`🔍 DEBUG showMapOverlay для ${overlayType}`);
        console.log("overlayType:", overlayType);
        console.log("container:", container);
        console.log("currentGlobalMap:", this.currentGlobalMap);
        console.log("currentLocalMap:", this.currentLocalMap);
        console.log("currentTacticalMap:", this.currentTacticalMap);
        
        let targetMap = null;
        let displayName = '';
        
        if (overlayType === 'local-map') {
            targetMap = this.currentLocalMap;
            displayName = '📍 Локальная карта';
            
            if (!targetMap && this.localMaps.length > 0) {
                targetMap = this.localMaps[0];
                this.currentLocalMap = targetMap;
                console.log(`🔄 Автоматически установлена локальная карта: ${targetMap.name}`);
            }
        } else if (overlayType === 'global-map') {
            targetMap = this.currentGlobalMap;
            displayName = '🗺️ Глобальная карта';
            console.log("🌍 Глобальная карта выбрана, targetMap:", targetMap);
        } else {
            targetMap = this.currentTacticalMap;
            displayName = '🎲 Тактическая карта';
        }
        
        console.log("targetMap после выбора:", targetMap);
        
        if (!targetMap) {
            console.error(`❌ ${overlayType} карта не загружена`);
            container.innerHTML = `
                <div class="overlay-content tactical-map-overlay">
                    <div class="tactical-map-header">
                        <h4>${displayName}</h4>
                        <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                    </div>
                    <div class="map-error" style="padding: 20px; text-align: center;">
                        Карта не загружена.
                    </div>
                </div>
            `;
            container.style.display = 'block';
            console.groupEnd();
            return;
        }
        
        console.log(`✅ Показываем карту: ${targetMap.name} (тип: ${overlayType})`);
        
        if (overlayType === 'local-map') {
            this.currentTacticalMap = targetMap;
            this.currentMapType = 'local';
            this.playerTacticalPosition = {...this.playerLocalPosition};
            this.currentLocalMap = targetMap;
        } else if (overlayType === 'global-map') {
            this.currentMapType = 'global';
            console.log("🌍 Установлен currentMapType: global");
        } else {
            this.currentMapType = 'tactical';
        }
        
        if (overlayType === 'global-map') {
            console.log("🌍 Рендерим глобальную карту...");
            container.innerHTML = this.renderGlobalMap();
            console.log("✅ HTML глобальной карты установлен");
            
            setTimeout(() => {
                console.log("🎨 Инициализируем canvas для глобальной карты...");
                this.initGlobalMapCanvas();
            }, 50);
            
        } else {
            container.innerHTML = `
                <div class="overlay-content tactical-map-overlay">
                    <div class="tactical-map-header">
                        <h4>${targetMap.name}</h4>
                        <div class="map-type-badge">${overlayType === 'local-map' ? '📍 Локальная' : '🎲 Тактическая'}</div>
                        <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                    </div>
                    
                    <div class="tactical-map-controls">
                        <button class="btn-control" onclick="game.systems.map.toggleGrid()">
                            ${this.showGrid ? '🔲 Скрыть сетку' : '🔳 Показать сетку'}
                        </button>
                        <button class="btn-control" onclick="game.systems.map.debugInfo()">
                            🐛 Отладка
                        </button>
                        <div class="position-info">
                            Позиция: [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]
                        </div>
                    </div>
                    
                    <div class="tactical-map-content">
                        <div class="tactical-map-visual">
                        </div>
                        
                        <div class="tactical-map-info">
                            <div class="map-description">
                                ${targetMap.description || 'Описание отсутствует'}
                            </div>
                            <div class="map-stats">
                                <span>Клеток: ${Object.keys(targetMap.cells).length}</span>
                                <span>Размер: ${targetMap.width}x${targetMap.height}</span>
                                <span id="availableMoves">Доступных ходов: 0</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            setTimeout(() => {
                console.log("🎨 Инициализируем Canvas для карты...");
                if (!targetMap) {
                    console.error("❌ Карта не установлена для Canvas");
                    console.groupEnd();
                    return;
                }
                
                try {
                    console.log("📍 Вызываем initCanvas()");
                    this.initCanvas();
                    this.updateMovementInfo();
                    
                    console.log("✅ Canvas успешно инициализирован", {
                        map: targetMap.name,
                        type: overlayType
                    });
                    
                } catch (error) {
                    console.error("❌ Ошибка инициализации Canvas:", error);
                    container.innerHTML += `
                        <div class="map-error" style="color: red; padding: 10px;">
                            Ошибка загрузки карты: ${error.message}
                        </div>
                    `;
                }
            }, 50);
        }
        
        container.style.display = 'block';
        console.log("✅ Контейнер отображен");
        console.groupEnd();
    }

    hideOverlay() {
        console.log("👋 MapSystem: Скрываем оверлей");
        
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
        if (this.currentMapType === 'global') {
            this.drawGlobalMap();
        } else {
            this.drawTacticalMap();
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

    forceRedraw() {
        if (this.canvasInitialized) {
            if (this.currentMapType === 'global') {
                this.calculateGlobalMapPositioning();
                this.drawGlobalMap();
            } else {
                this.calculateMapPositioning();
                this.drawTacticalMap();
            }
        }
    }

    saveMapState() {
        const state = {
            playerGlobalPosition: this.playerGlobalPosition,
            playerLocalPosition: this.playerLocalPosition,
            playerTacticalPosition: this.playerTacticalPosition,
            currentGlobalMapId: this.currentGlobalMap?.id,
            currentLocalMapId: this.currentLocalMap?.id,
            currentTacticalMapId: this.currentTacticalMap?.id,
            mapStack: this.mapStack,
            currentMapType: this.currentMapType
        };
        
        localStorage.setItem('mapSystemState', JSON.stringify(state));
        this.saveGlobalProgress();
        console.log("💾 Состояние карт сохранено");
    }

    loadMapState() {
        try {
            const saved = localStorage.getItem('mapSystemState');
            if (saved) {
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
                
                if (state.mapStack) {
                    this.mapStack = state.mapStack;
                }
                if (state.currentMapType) {
                    this.currentMapType = state.currentMapType;
                }
                
                console.log("💾 Состояние карт загружено");
                return true;
            }
        } catch (error) {
            console.error("❌ Ошибка загрузки состояния карт:", error);
        }
        return false;
    }

    debugInfo() {
        console.group("🗺️ MapSystem Debug Info");
        console.log("Глобальная позиция:", [this.globalProgress.currentGlobalX, this.globalProgress.currentGlobalY]);
        console.log("Локальная позиция:", this.playerLocalPosition);
        console.log("Тактическая позиция:", this.playerTacticalPosition);
        console.log("Текущая глобальная карта:", this.currentGlobalMap?.name);
        console.log("Текущая локальная карта:", this.currentLocalMap?.name);
        console.log("Текущая тактическая карта:", this.currentTacticalMap?.name);
        console.log("Тип текущей карты:", this.currentMapType);
        console.log("Глубина стека карт:", this.mapStack.length);
        console.log("Прогресс глобальной карты:", {
            visited: this.globalProgress.visitedCells.size,
            unlocked: this.globalProgress.unlockedCells.size,
            discovered: this.globalProgress.discoveredCells.size
        });
        console.log("Canvas инициализирован:", this.canvasInitialized);
        console.log("Текущий герой:", this.currentHero?.name || 'нет');
        console.groupEnd();
    }

    debugGlobalInfo() {
        console.group("🌍 Global Map Debug Info");
        console.log("Текущая позиция:", [this.globalProgress.currentGlobalX, this.globalProgress.currentGlobalY]);
        console.log("Посещённые клетки:", Array.from(this.globalProgress.visitedCells));
        console.log("Разблокированные клетки:", Array.from(this.globalProgress.unlockedCells));
        console.log("Обнаруженные клетки:", Array.from(this.globalProgress.discoveredCells));
        console.log("Глобальная карта:", this.currentGlobalMap);
        console.groupEnd();
        
        if (window.game) {
            window.game.showNotification("Информация о глобальной карте выведена в консоль", 'info');
        }
    }

debugForceRedraw() {
    console.log("🔄 ПРИНУДИТЕЛЬНАЯ ПЕРЕРИСОВКА ВСЕХ КАРТ");
    this.fixCellCoordinates();
    
    if (this.currentGlobalMap) {
        this.calculateGlobalMapPositioning();
        this.drawGlobalMap();
    }
    if (this.currentLocalMap) {
        this.calculateMapPositioning();
        this.drawTacticalMap();
    }
}
    
    updateMovementInfo() {
        const availableMoves = this.getAvailableMoves();
        
        const movesElement = document.getElementById('availableMoves');
        if (movesElement) {
            movesElement.textContent = `Доступных ходов: ${availableMoves.length}`;
        }
    }

    // ========== ТЕСТОВЫЕ КАРТЫ ==========

    createTestMaps() {
        this.createTestGlobalMap();
        this.createTestLocalMaps();
    }

    createTestGlobalMap() {
        this.globalMaps = [{
            id: 1,
            name: "Континент Арканиум",
            image: "",
            width: 15,
            height: 10,
            startPosition: {x: 7, y: 5},
            description: "Древний континент, полный загадок и опасностей",
            cells: {
                "7,5": {
                    type: "player_start", 
                    passable: true, 
                    row: 5, 
                    col: 7, 
                    visible: true, 
                    x: 350, 
                    y: 250,
                    displayX: 350,
                    displayY: 250
                },
                "8,5": {
                    type: "local_exit", 
                    passable: true, 
                    row: 5, 
                    col: 8, 
                    visible: true, 
                    x: 385, 
                    y: 250,
                    localMap: "data/maps/local/forest.json",
                    globalTargetX: 8,
                    globalTargetY: 5,
                    tooltip: "🌍 Вход в Лесную Долину",
                    displayX: 385,
                    displayY: 250
                }
            },
            cellSize: 30,
            originalCanvasWidth: 800,
            originalCanvasHeight: 600,
            mapType: 'global'
        }];
        console.log("✅ Тестовая глобальная карта создана");
    }

    createTestLocalMaps() {
        this.localMaps = [{
            id: 1,
            name: "Долина Начала",
            image: "",
            width: 8,
            height: 8,
            startPosition: {x: 4, y: 4},
            description: "Мирная долина, где начинаются приключения",
            cells: {
                "4,4": {
                    type: "player_start", 
                    passable: true, 
                    row: 4, 
                    col: 4, 
                    visible: true, 
                    x: 200, 
                    y: 200,
                    displayX: 200,
                    displayY: 200
                },
                "4,3": {
                    type: "local_exit", 
                    passable: true, 
                    row: 3, 
                    col: 4, 
                    visible: true, 
                    x: 200, 
                    y: 150,
                    localMap: "data/maps/local/forest.json",
                    globalTargetX: 8,
                    globalTargetY: 5,
                    tooltip: "🌍 Выход в Лесную Долину",
                    displayX: 200,
                    displayY: 150
                },
                "3,4": {
                    type: "monster", 
                    passable: false, 
                    row: 4, 
                    col: 3, 
                    visible: true, 
                    x: 150, 
                    y: 200,
                    displayX: 150,
                    displayY: 200
                },
                "4,5": {
                    type: "tactical_entrance", 
                    passable: true, 
                    row: 5, 
                    col: 4, 
                    visible: true, 
                    x: 200, 
                    y: 250,
                    tacticalMap: "data/maps/tactical/cave.json",
                    tooltip: "🚪 Вход в пещеру",
                    displayX: 200,
                    displayY: 250
                }
            },
            cellSize: 40,
            originalCanvasWidth: 400,
            originalCanvasHeight: 400,
            mapType: 'local'
        }];
        console.log("✅ Тестовые локальные карты созданы");
    }

    createFallbackMaps() {
        this.createTestGlobalMap();
        this.createTestLocalMaps();
    }
}

window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен с полной системой глобальных карт");
