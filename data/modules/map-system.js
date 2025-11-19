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
            
            if (this.localMaps.length > 0) {
                this.forceSetLocalMap();
            }
            else if (this.tacticalMaps.length === 0 && this.localMaps.length === 0) {
                console.log("⚠️ Нет загруженных карт, создаем тестовые...");
                this.createTestMaps();
                if (this.localMaps.length > 0) {
                    this.forceSetLocalMap();
                }
            }
            
            this.setStartPositions();
            this.loadGlobalProgress();
            
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

    // ПЕРЕХОД МЕЖДУ ЛОКАЛЬНЫМИ КАРТАМИ ЧЕРЕЗ ГЛОБАЛЬНУЮ
    handleLocalToLocalTransition(exitCell) {
        if (!exitCell.localMap) {
            console.error("❌ Нет указанной локальной карты для перехода");
            return;
        }

        console.log(`🌍 Переход на новую локальную карту: ${exitCell.localMap}`);
        
        // Обновляем позицию на глобальной карте
        if (exitCell.globalTargetX !== undefined && exitCell.globalTargetY !== undefined) {
            const oldX = this.globalProgress.currentGlobalX;
            const oldY = this.globalProgress.currentGlobalY;
            
            this.globalProgress.currentGlobalX = exitCell.globalTargetX;
            this.globalProgress.currentGlobalY = exitCell.globalTargetY;
            
            // Помечаем новый гекс как посещённый
            const newCellKey = `${exitCell.globalTargetX},${exitCell.globalTargetY}`;
            this.globalProgress.visitedCells.add(newCellKey);
            
            // Разблокируем соседние гексы
            this.unlockAdjacentGlobalCells(exitCell.globalTargetX, exitCell.globalTargetY);
            
            this.saveGlobalProgress();
            
            console.log(`📍 Перемещение на глобальной карте: [${oldX},${oldY}] → [${exitCell.globalTargetX},${exitCell.globalTargetY}]`);
        }
        
        // Загружаем новую локальную карту
        this.loadLocalMapFile(exitCell.localMap).then(success => {
            if (success && window.game) {
                window.game.showNotification(`🌍 Переход в новую зону!`, 'success');
            }
        });
    }

    // ========== ОТОБРАЖЕНИЕ ГЛОБАЛЬНОЙ КАРТЫ ==========
renderGlobalMap() {
    if (!this.currentGlobalMap) {
        return '<div class="map-error">Глобальная карта не загружена</div>';
    }

    return `
        <div class="overlay-content global-map-overlay" style="max-width: 1200px; max-height: 90vh; background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); border: 2px solid #00ffff; border-radius: 12px; box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);">
            <div class="overlay-header">
                <h3>🗺️ Глобальная карта</h3>
                <button class="btn-close" onclick="game.hideOverlay()">✕</button>
            </div>
            
            <div class="global-map-info" style="background: rgba(0, 0, 0, 0.5); padding: 12px; border-radius: 8px; margin: 10px 0;">
                <div class="progress-stats" style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                    <span style="background: rgba(0, 255, 255, 0.2); padding: 6px 12px; border-radius: 20px; border: 1px solid #00ffff; font-size: 12px;">
                        📍 Текущая позиция: [${this.globalProgress.currentGlobalX}, ${this.globalProgress.currentGlobalY}]
                    </span>
                    <span style="background: rgba(0, 255, 255, 0.2); padding: 6px 12px; border-radius: 20px; border: 1px solid #00ffff; font-size: 12px;">
                        📊 Посещено: ${this.globalProgress.visitedCells.size} гексов
                    </span>
                    <span style="background: rgba(0, 255, 255, 0.2); padding: 6px 12px; border-radius: 20px; border: 1px solid #00ffff; font-size: 12px;">
                        🔓 Доступно: ${this.globalProgress.unlockedCells.size} гексов
                    </span>
                </div>
            </div>
            
            <div class="global-map-visual" style="height: 500px !important; min-height: 500px !important; background: rgba(0, 0, 0, 0.3); border: 1px solid #00ffff; border-radius: 8px; margin: 15px 0; position: relative; overflow: hidden;">
                <!-- Canvas будет добавлен автоматически -->
            </div>
            
            <div class="global-map-legend" style="background: rgba(0, 0, 0, 0.5); padding: 15px; border-radius: 8px; margin: 10px 0;">
                <h4>📋 Легенда карты:</h4>
                <div class="legend-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
                    <div class="legend-item" style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                        <span class="legend-symbol" style="font-size: 16px;">🎯</span>
                        <span>Текущая позиция</span>
                    </div>
                    <div class="legend-item" style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                        <span class="legend-symbol" style="font-size: 16px;">🟢</span>
                        <span>Посещённые</span>
                    </div>
                    <div class="legend-item" style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                        <span class="legend-symbol" style="font-size: 16px;">🟡</span>
                        <span>Доступные</span>
                    </div>
                    <div class="legend-item" style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                        <span class="legend-symbol" style="font-size: 16px;">🔴</span>
                        <span>Заблокированные</span>
                    </div>
                    <div class="legend-item" style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                        <span class="legend-symbol" style="font-size: 16px;">🌍</span>
                        <span>Переходы</span>
                    </div>
                    <div class="legend-item" style="display: flex; align-items: center; gap: 8px; font-size: 12px;">
                        <span class="legend-symbol" style="font-size: 16px;">🚪</span>
                        <span>Входы</span>
                    </div>
                </div>
            </div>
            
            <div class="global-map-actions" style="display: flex; gap: 10px; justify-content: center; padding: 10px; border-top: 1px solid #00ffff;">
                <button class="btn-control" onclick="game.systems.map.toggleGrid()">
                    ${this.showGrid ? '🔲 Скрыть сетку' : '🔳 Показать сетку'}
                </button>
                <button class="btn-control" onclick="game.systems.map.debugGlobalInfo()">
                    🐛 Отладка
                </button>
            </div>
        </div>
    `;
}

   initGlobalMapCanvas() {
    console.group("🔍 DEBUG initGlobalMapCanvas");
    const container = document.querySelector('.global-map-visual');
    console.log("Контейнер .global-map-visual:", container);
    
    if (!container) {
        console.log("❌ Контейнер для глобальной карты не найден");
        console.groupEnd();
        return;
    }

    console.log("Очищаем контейнер...");
    container.innerHTML = '';

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'globalMapCanvas';
    
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.cursor = 'pointer';
    container.appendChild(this.canvas);

    console.log("Canvas создан:", this.canvas);

    this.ctx = this.canvas.getContext('2d');
    console.log("Контекст создан:", this.ctx);
    
    console.log("Вызываем calculateGlobalMapPositioning...");
    this.calculateGlobalMapPositioning();
    
    console.log("Вызываем setupGlobalCanvasEventListeners...");
    this.setupGlobalCanvasEventListeners();
    
    console.log("Вызываем drawGlobalMap...");
    this.drawGlobalMap();
    
    console.log("✅ initGlobalMapCanvas завершен");
    console.groupEnd();
}

calculateGlobalMapPositioning() {
    console.group("🔍 DEBUG calculateGlobalMapPositioning");
    
    if (!this.currentGlobalMap || !this.canvas) {
        console.log("❌ currentGlobalMap или canvas не доступны");
        console.groupEnd();
        return;
    }

    const container = document.querySelector('.global-map-visual');
    if (!container) {
        console.log("❌ Контейнер не найден");
        console.groupEnd();
        return;
    }

    const rect = container.getBoundingClientRect();
    console.log(`📐 Размер контейнера: ${rect.width}x${rect.height}`);
    
    const editorWidth = this.currentGlobalMap.originalCanvasWidth || 1024;
    const editorHeight = this.currentGlobalMap.originalCanvasHeight || 1024;

    console.log(`🎯 Размер редактора: ${editorWidth}x${editorHeight}`);

    // Исправляем расчет масштаба - учитываем оба измерения
    const scaleX = rect.width / editorWidth;
    const scaleY = rect.height / editorHeight;
    const scale = Math.min(scaleX, scaleY, 1.0); // Берем меньший масштаб для пропорциональности

    // Центрируем по обоим осям
    const offsetX = (rect.width - editorWidth * scale) / 2;
    const offsetY = (rect.height - editorHeight * scale) / 2;

    console.log(`📏 Масштаб: ${scale.toFixed(3)}, Смещение: [${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}]`);

    // Обрабатываем все клетки глобальной карты
    const cells = Object.values(this.currentGlobalMap.cells);
    console.log("Обрабатываем клеток:", cells.length);
    
    let processedCount = 0;
    cells.forEach(cell => {
        const originalX = cell.originalX || cell.x;
        const originalY = cell.originalY || cell.y;
        
        // Применяем масштаб и смещение
        cell.displayX = originalX * scale + offsetX;
        cell.displayY = originalY * scale + offsetY;
        processedCount++;
        
        // Логируем первую клетку для проверки
        if (processedCount === 1) {
            console.log("Первая клетка:", {
                оригинал: `[${originalX}, ${originalY}]`,
                отображение: `[${cell.displayX.toFixed(1)}, ${cell.displayY.toFixed(1)}]`
            });
        }
    });

    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    console.log(`✅ Позиционирование завершено. Обработано клеток: ${processedCount}`);
    console.groupEnd();
}

 drawGlobalMap() {
    console.group("🔍 DEBUG drawGlobalMap");
    console.log("this.ctx:", this.ctx);
    console.log("this.currentGlobalMap:", this.currentGlobalMap);
    console.log("this.canvas:", this.canvas);
    
    if (!this.ctx || !this.currentGlobalMap || !this.canvas) {
        console.log("❌ Canvas context, глобальная карта или canvas не доступна");
        console.groupEnd();
        return;
    }

    const canvas = this.canvas;
    console.log("Canvas размеры:", canvas.width, "x", canvas.height);
    
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawGlobalBackground();
    this.drawGlobalHexes();

    if (this.showGrid) {
        this.drawGlobalHexGrid();
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
        
        cells.forEach(cell => {
            if (cell.visible) {
                this.drawSingleGlobalHex(cell);
                this.drawGlobalHexContent(cell);
            }
        });
    }

    drawSingleGlobalHex(cell) {
        const hexSize = this.currentGlobalMap.cellSize || 30; // Меньше размер для глобальной карты
        
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
        let fillColor = 'rgba(100, 100, 100, 0.3)'; // По умолчанию - заблокированный
        
        if (this.globalProgress.currentGlobalX === cell.col && this.globalProgress.currentGlobalY === cell.row) {
            fillColor = 'rgba(255, 215, 0, 0.4)'; // Текущая позиция - золотой
        } else if (this.globalProgress.visitedCells.has(cellKey)) {
            fillColor = 'rgba(34, 197, 94, 0.4)'; // Посещённый - зелёный
        } else if (this.globalProgress.unlockedCells.has(cellKey)) {
            fillColor = 'rgba(234, 179, 8, 0.4)'; // Доступный - жёлтый
        } else if (this.globalProgress.discoveredCells.has(cellKey)) {
            fillColor = 'rgba(59, 130, 246, 0.3)'; // Обнаруженный - синий
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

        // Глобальная карта только для просмотра - никаких действий по клику
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

        // Кастомная подсказка из JSON
        if (hex.tooltip) {
            return `${hex.tooltip}\nСтатус: ${status}`;
        }

        // Стандартные подсказки по типу
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

    // ========== ОБНОВЛЕННЫЕ МЕТОДЫ ДЛЯ ЛОКАЛЬНЫХ КАРТ ==========

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
        
        // ПРИОРИТЕТ 1: Переход на другую локальную карту
        if (hex.type === 'local_exit' && isAdjacentToPlayer) {
            console.log(`🌍 ОБНАРУЖЕН ПЕРЕХОД НА ЛОКАЛЬНУЮ КАРТУ: ${hex.localMap}`);
            this.handleLocalToLocalTransition(hex);
            return;
        }
        
        // ПРИОРИТЕТ 2: Переход на тактическую карту
        if (hex.tacticalMap && isAdjacentToPlayer) {
            console.log(`🚪 Вход в тактическую карту: ${hex.tacticalMap}`);
            this.handleMapTransition(hex);
            return;
        }
        
        // ПРИОРИТЕТ 3: Выход с тактической карты
        if (hex.type === 'exit') {
            console.log("🎲 Клик по выходу");
            this.exitToPreviousMap();
            return;
        }
        
        // Если это переход, но герой не рядом
        if ((hex.localMap || hex.tacticalMap) && !isAdjacentToPlayer) {
            console.log(`🚫 ПЕРЕХОД ЗАБЛОКИРОВАН: герой не на соседней клетке`);
            if (window.game) {
                window.game.showNotification("Подойдите ближе к входу!", 'warning');
            }
            return;
        }
        
        // Обычная логика перемещения
        if (hex.passable !== false || hex.type === 'monster') {
            console.log(`🎲 Клик по проходимой клетке: [${hex.col}, ${hex.row}] тип: ${hex.type}`);
            this.moveOnTacticalMap(hex.col, hex.row);
        } else {
            console.log(`🚫 Клетка непроходимая: [${hex.col}, ${hex.row}] тип: ${hex.type}`);
        }
    }

    // ========== СУЩЕСТВУЮЩИЕ МЕТОДЫ (остаются без изменений) ==========

    async loadJSONMaps() {
        try {
            console.log("🔄 Загружаем JSON карты...");
            
            // ПУТИ ДЛЯ ТАКТИЧЕСКИХ КАРТ
            const tacticalMapPaths = [
                'data/maps/tactical/tactical-maps.json',
                'data/maps/tactical-maps.json',
                'maps/tactical-maps.json', 
                'data/tactical-maps.json',
                'tactical-maps.json',
                'data/modules/maps/tactical-maps.json'
            ];
            
            // ПУТИ ДЛЯ ЛОКАЛЬНЫХ КАРТ
            const localMapPaths = [
                'data/maps/local/local-maps.json',
                'data/maps/local-maps.json', 
                'maps/local-maps.json',
                'data/local-maps.json',
                'local-maps.json',
                'data/modules/maps/local-maps.json'
            ];
            
            // Загружаем тактические карты
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
            
            // Загружаем локальные карты
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
                // СВОЙСТВА ДЛЯ ПЕРЕХОДОВ
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

    // СИСТЕМА ПЕРЕХОДОВ МЕЖДУ КАРТАМИ
    async handleMapTransition(transitionCell) {
        if (!transitionCell) return;

        // Сохраняем текущую карту в стек
        this.saveCurrentMapToStack();
        
        try {
            if (transitionCell.tacticalMap) {
                // Переход на тактическую карту
                await this.loadTacticalMapFile(transitionCell.tacticalMap);
                this.currentMapType = 'tactical';
                console.log(`🚪 Вход в тактическую карту: ${transitionCell.tacticalMap}`);
                
            } else if (transitionCell.localMap) {
                // Переход на другую локальную карту
                await this.loadLocalMapFile(transitionCell.localMap);
                this.currentMapType = 'local';
                
                // Устанавливаем позицию на целевой карте если указана
                if (transitionCell.targetPosition) {
                    this.playerTacticalPosition = {...transitionCell.targetPosition};
                }
                
                console.log(`🌍 Переход на локальную карту: ${transitionCell.localMap}`);
                
            } else if (transitionCell.globalMap) {
                // Переход на глобальную карту
                await this.loadGlobalMapFile(transitionCell.globalMap);
                this.currentMapType = 'global';
                console.log(`🗺️ Переход на глобальную карту: ${transitionCell.globalMap}`);
            }
            
            // Перерисовываем
            this.calculateMapPositioning();
            this.drawTacticalMap();
            
        } catch (error) {
            console.error("❌ Ошибка перехода между картами:", error);
            // Восстанавливаем предыдущее состояние при ошибке
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
            
            // Восстанавливаем локальную карту если нужно
            if (savedState.mapType === 'local') {
                this.currentLocalMap = savedState.map;
            }
            
            console.log(`🚪 Возврат на ${savedState.mapType} карту: ${savedState.map.name}`);
            
            // Перерисовываем
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
        // Заглушка для глобальных карт
        console.log(`🌍 Загрузка глобальной карта: ${mapPath}`);
        // Реализация будет позже
        return null;
    }

    setCurrentLocalMap(localMap) {
        if (!localMap) {
            console.error("❌ Попытка установить пустую локальную карту");
            return;
        }
        
        this.currentLocalMap = localMap;
        this.currentTacticalMap = localMap; // Локальная карта отображается как тактическая
        this.playerLocalPosition = {...localMap.startPosition};
        this.playerTacticalPosition = {...localMap.startPosition};
        this.currentMapType = 'local';
        
        console.log(`📍 Установлена локальная карта: ${localMap.name}`, {
            startPosition: localMap.startPosition,
            cellsCount: Object.keys(localMap.cells).length
        });
        
        // Если canvas уже инициализирован - перерисовываем
        if (this.canvasInitialized) {
            this.calculateMapPositioning();
            this.drawTacticalMap();
        }
    }

    setPlayerToStartPosition() {
        if (!this.currentTacticalMap) return;
        
        // Ищем клетку player_start
        const startCell = Object.values(this.currentTacticalMap.cells)
            .find(cell => cell.type === 'player_start');
        
        if (startCell) {
            this.playerTacticalPosition = {x: startCell.col, y: startCell.row};
            console.log(`🎯 Герой установлен на стартовую позицию: [${startCell.col}, ${startCell.row}]`);
        } else {
            // Используем стартовую позицию карты
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
        }
    }

    // СИСТЕМА ПЕРЕМЕЩЕНИЯ И БОЯ
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

        // ПРОВЕРКА: если это переход - обрабатываем отдельно
        if (cellData.tacticalMap || cellData.localMap || cellData.globalMap) {
            console.log(`🎯 Попытка перехода через moveOnTacticalMap`);
            // Проверяем соседство и обрабатываем переход
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
        
        // ВАЖНО: Принудительно пересчитываем отображение
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

    // CANVAS И ОТОБРАЖЕНИЕ
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

        // Проверим конкретно клетку перехода
        const transitionCell = Object.values(this.currentTacticalMap.cells).find(
            cell => cell.type === 'tactical_entrance'
        );
        
        if (transitionCell) {
            const originalX = transitionCell.originalX || transitionCell.x;
            const originalY = transitionCell.originalY || transitionCell.y;
            
            transitionCell.displayX = originalX * scale + offsetX;
            transitionCell.displayY = originalY * scale + offsetY;
            
            console.log(`🎯 Клетка перехода:`, {
                оригинал: `[${originalX}, ${originalY}]`,
                отображение: `[${transitionCell.displayX}, ${transitionCell.displayY}]`,
                тип: transitionCell.type
            });
        }

        // Обрабатываем все клетки
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

        // Определяем предыдущий подсвеченный гекс
        const prevHex = this.currentTooltip;
        
        // Если ушли с гекса или перешли на другой
        if (!hex || (prevHex && hex && (prevHex.col !== hex.col || prevHex.row !== hex.row))) {
            this.hideTooltip();
        }

        // Если навели на новый гекс
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
        
        // Проверяем кэшированный гекс
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
        
        // Ищем среди всех клеток
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
        
        // Если не нашли точного совпадения, покажем ближайший
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

        // Сначала снимаем подсветку со старого гекса
        this.removeHighlight();
        
        // Затем подсвечиваем новый
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

        // ПЕРЕРИСОВЫВАЕМ ВСЮ КАРТУ ОДИН РАЗ
        this.drawTacticalMap();
    }
    
    getTooltipTextForHex(hex) {
        if (!hex.visible) return null;

        // ПРИОРИТЕТ 1: Кастомная подсказка из JSON
        if (hex.tooltip) {
            return hex.tooltip;
        }

        // ПРИОРИТЕТ 2: Подсказки для переходов
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

        // ПРИОРИТЕТ 3: Стандартные подсказки по типу
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
        
        // Перерисовываем только этот гекс для производительности
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
        
        // Перерисовываем только если были изменения
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

    // СИСТЕМА НАВИГАЦИИ И СОСЕДЕЙ
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
        
        // Получаем всех соседей игрока
        const playerNeighbors = this.getHexNeighbors(playerY, playerX);
        
        // Проверяем, является ли целевая клетка соседом игрока
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

    // СИСТЕМА КАРТ И ОТОБРАЖЕНИЯ
    setStartPositions() {
        console.log("🎯 Устанавливаем стартовые позиции...");
        
        // Глобальная карта
        if (this.globalMaps.length > 0) {
            this.currentGlobalMap = this.globalMaps[0];
            console.log(`🗺️ Установлена глобальная карта: ${this.currentGlobalMap.name}`);
        }
        
        // Локальная карта
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

    // ТЕСТОВЫЕ КАРТЫ
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

    // ОТОБРАЖЕНИЕ КАРТ
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
    
    // РЕНДЕРИМ ИНТЕРФЕЙС КАРТЫ
    if (overlayType === 'global-map') {
        console.log("🌍 Рендерим глобальную карту...");
        container.innerHTML = this.renderGlobalMap();
        console.log("✅ HTML глобальной карты установлен");
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
                        <!-- Canvas будет добавлен автоматически -->
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
    }
    
    container.style.display = 'block';
    console.log("✅ Контейнер отображен");
    
    // ИНИЦИАЛИЗИРУЕМ CANVAS
    setTimeout(() => {
        console.log("🎨 Инициализируем Canvas для карты...");
        console.log("overlayType в setTimeout:", overlayType);
        console.log("targetMap в setTimeout:", targetMap);
        
        if (!targetMap) {
            console.error("❌ Карта не установлена для Canvas");
            console.groupEnd();
            return;
        }
        
        try {
            if (overlayType === 'global-map') {
                console.log("🌍 Вызываем initGlobalMapCanvas()");
                this.initGlobalMapCanvas();
            } else {
                console.log("📍 Вызываем initCanvas()");
                this.initCanvas();
                this.updateMovementInfo();
            }
            
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
        console.groupEnd();
    }, 50);
}

    showOverlay(overlayType) {
        const container = document.getElementById('overlay-container');
        if (!container) {
            console.error("❌ Контейнер оверлея не найден");
            return;
        }

        this.activeOverlay = overlayType;

        this.hideTooltip();
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (overlayType === 'global-map') {
            this.showMapOverlay('global-map', container);
        } else if (overlayType === 'local-map' || overlayType === 'tactical-map') {
            this.showMapOverlay(overlayType, container);
        } else {
            console.warn(`⚠️ Неизвестный тип оверлея: ${overlayType}`);
        }
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

    updateMovementInfo() {
        const availableMoves = this.getAvailableMoves();
        
        const movesElement = document.getElementById('availableMoves');
        if (movesElement) {
            movesElement.textContent = `Доступных ходов: ${availableMoves.length}`;
        }
    }

    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ ОТРИСОВКИ
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
}

window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен с полной системой глобальных карт");
