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
        
        this.zoomLevel = 1.0;
        this.minZoom = 0.1;
        this.maxZoom = 5.0;
        this.zoomStep = 0.2;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.mapOffset = { x: 0, y: 0 };
        
        this.lastHoveredHex = null;
        this.animationFrame = null;
        
        this.pendingMovement = null;
        this.pendingAction = null;
        
        this.canvasInitialized = false;
        
        this.mapStack = [];
        this.currentMapType = 'local';
        
        // Ссылка на ActionSystem
        this.actionSystem = null;
        this.timeSystem = null;
        
        
        this.lootTables = {
            1: {
                gold: { weight: 60, min: 5, max: 20 },
                common_items: { weight: 30, items: ['health_potion', 'mana_potion', 'bread', 'torch'] },
                information: { weight: 10, messages: [
                    "Местный житель рассказал о подозрительной активности в лесу...",
                    "Вы нашли старую карту с отметкой тайника",
                    "Надпись на стене: 'Остерегайтесь теней ночью'"
                ]}
            },
            2: {
                gold: { weight: 50, min: 10, max: 35 },
                common_items: { weight: 35, items: ['health_potion', 'mana_potion', 'antidote', 'torch'] },
                rare_items: { weight: 5, items: ['iron_sword', 'leather_armor'] },
                information: { weight: 10, messages: [
                    "Записка: 'Сокровище спрятано под старым дубом'",
                    "Вы нашли дневник путешественника с полезными заметками"
                ]}
            },
            3: {
                gold: { weight: 40, min: 25, max: 60 },
                common_items: { weight: 30, items: ['health_potion', 'mana_potion', 'antidote'] },
                rare_items: { weight: 15, items: ['steel_sword', 'chain_armor', 'magic_ring'] },
                information: { weight: 15, messages: [
                    "Древние письмена рассказывают о затерянном артефакте",
                    "Карта с отметками скрытых проходов"
                ]}
            },
            4: {
                gold: { weight: 30, min: 40, max: 100 },
                common_items: { weight: 25, items: ['greater_health_potion', 'greater_mana_potion'] },
                rare_items: { weight: 25, items: ['magic_sword', 'plate_armor', 'amulet_protection'] },
                epic_items: { weight: 10, items: ['ancient_artifact', 'dragon_scale'] },
                information: { weight: 10, messages: [
                    "Тайные знания о магических ритуалах",
                    "Координаты легендарного сокровища"
                ]}
            },
            5: {
                gold: { weight: 20, min: 75, max: 200 },
                common_items: { weight: 20, items: ['greater_health_potion', 'greater_mana_potion'] },
                rare_items: { weight: 30, items: ['vampire_blade', 'shadow_armor', 'crystal_amulet'] },
                epic_items: { weight: 25, items: ['ancient_artifact', 'dragon_scale', 'phoenix_feather'] },
                legendary_items: { weight: 5, items: ['vampire_heart', 'eternal_crown'] },
                information: { weight: 5, messages: [
                    "Древние секреты бессмертия",
                    "Местоположение сердца вампирского лорда"
                ]}
            }
        };
        
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
            'tavern': '🍻',
            'shop': '🏪',
            'dungeon': '🏰',
            'temple': '⛪',
            'bridge': '🌉',
            'mountain': '⛰️'
        };


        // ========== УРОВНИ ВИДИМОСТИ ГЕКСОВ ==========

// В конструкторе изменяем цвета тумана:
this.fogColors = {
    EXPLORED: 'rgba(0, 0, 0, 0)',        // Полностью прозрачный
    PLAYER: 'rgba(0, 0, 0, 0)',          // Полностью прозрачный
    ADJACENT: 'rgba(0, 0, 0, 0.2)',      // Очень лёгкий туман
    VISIBLE: 'rgba(0, 0, 0, 0.5)',       // Средний туман
    HIDDEN: 'rgba(0, 0, 0, 0.8)',        // Сильный туман
    OBSCURED: 'rgba(0, 0, 0, 0.95)'      // Почти непрозрачный
};

// И увеличиваем прозрачность символов для лучшей видимости:
this.visibilityLevels = {
    EXPLORED: 1.0,      // Полностью видимый (исследованный)
    PLAYER: 1.0,        // Полностью видимый (текущая позиция)
    ADJACENT: 0.9,      // Почти полностью видимый (соседний)
    VISIBLE: 0.6,       // Хорошо видимый (в поле зрения)
    HIDDEN: 0.3,        // Слабо видимый (не исследованный, не соседний)
    OBSCURED: 0.0       // Полностью скрытый (недоступен для просмотра)
};

// Радиус видимости от игрока (в клетках)
this.visibilityRadius = 2;

// Включена ли система тумана войны
this.fogOfWarEnabled = true;

        
        this.tooltipElement = null;
        this.currentTooltip = null;
        this.tooltipTimeout = null;
        this.resizeTimeout = null;
        
        console.log("✅ MapSystem инициализирован (упрощенная версия)");
    }

    // ========== ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ ДЕЙСТВИЙ ==========

    initializeActionSystem() {
        if (!this.actionSystem) {
            this.actionSystem = new ActionSystem(this);
            console.log("✅ ActionSystem создан и привязан к MapSystem");
        }
        return this.actionSystem;
    }


    // ========== МЕТОДЫ ДЛЯ МОДУЛЯ ОХОТЫ ==========

getActionSystem() {
    return this.actionSystem;
}

isHuntModuleLoaded() {
    return this.actionSystem && 
           this.actionSystem.actionModules && 
           this.actionSystem.actionModules['hunt'];
}

executeHuntAction(row, col) {
    if (this.isHuntModuleLoaded()) {
        return this.actionSystem.actionModules['hunt'].execute(row, col);
    } else {
        console.error("❌ Модуль охоты не загружен");
        if (window.game) {
            window.game.showNotification("❌ Модуль охоты не загружен", 'error');
        }
        return false;
    }
}



    /**
 * Обработка клика по магазину - исправленная версия
 */
handleMerchantClick(merchantCell) {
    console.log(`🛒 handleMerchantClick для торговца на [${merchantCell.col},${merchantCell.row}]`);
    
    // Проверяем, стоит ли игрок на клетке торговца
    const isPlayerOnCell = (
        merchantCell.col === this.playerTacticalPosition.x && 
        merchantCell.row === this.playerTacticalPosition.y
    );
    
    // Проверяем, рядом ли игрок с торговцем
    const isPlayerAdjacent = this.isPlayerAdjacentToTransition(merchantCell);
    
    console.log(`   Игрок на клетке: ${isPlayerOnCell}, рядом: ${isPlayerAdjacent}`);
    console.log(`   Позиция игрока: [${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}]`);
    
    // Торговля разрешена если игрок НА клетке или РЯДОМ
    if (!isPlayerOnCell && !isPlayerAdjacent) {
        console.log(`❌ Торговец недоступен: игрок слишком далеко`);
        this.showNotification("❌ Подойдите ближе к торговцу!", 'warning');
        return;
    }
    
    // Проверяем данные магазина
    if (!merchantCell.shopItems || merchantCell.shopItems.length === 0) {
        console.warn("🛒 Магазин пуст - нет товаров в shopItems");
        if (window.game) {
            window.game.showNotification("🛒 Магазин пуст!", 'warning');
        }
        return;
    }

    console.log(`🛒 Открываем магазин: ${merchantCell.shopName || 'Неизвестный магазин'}, товаров: ${merchantCell.shopItems.length}`);
    
    // ВАЖНОЕ ИСПРАВЛЕНИЕ: НЕ сохраняем текущую карту в стек при открытии магазина
    // Магазин - это часть той же карты, а не отдельная карта
    console.log("🔄 Магазин открывается в том же окне, без сохранения в стек карт");
    
    // Открываем через ShopSystem
    const shopSystem = window.game?.systems?.shop;
    if (shopSystem && shopSystem.openShop) {
        // Сохраняем текущий активный оверлей перед открытием магазина
        this.previousOverlayBeforeShop = this.activeOverlay;
        
        shopSystem.openShop(merchantCell);
        console.log("✅ Магазин успешно открыт через ShopSystem");
    } else {
        console.error("❌ ShopSystem не доступна или нет метода openShop");
        if (window.game) {
            window.game.showNotification("❌ Система магазинов недоступна", 'error');
        }
    }
}


    

    
    handleTavernVisit(cell) {
        console.log("🍻 Начало обработки посещения таверны:", cell);
        
        if (!this.currentHero) {
            console.error("❌ Нет текущего героя для посещения таверны");
            return;
        }
        
        if (!this.isPlayerAdjacentToTransition(cell)) {
            console.log("❌ Герой не рядом с таверной");
            this.showTransitionWarning(cell);
            return;
        }
        
        console.log("✅ Герой рядом с таверной, начинаем обработку...");
        
        const heroSystem = window.game?.systems?.hero;
        if (!heroSystem) {
            console.error("❌ HeroSystem не доступна");
            return;
        }
        
        const stats = heroSystem.calculateHeroStats(this.currentHero);
        
        const oldHealth = this.currentHero.currentHealth;
        this.currentHero.currentHealth = stats.maxHealth;
        
        const battleSystem = window.game?.systems?.battle;
        if (battleSystem && battleSystem.flask) {
            const oldCharges = battleSystem.flask.currentCharges;
            battleSystem.flask.currentCharges = battleSystem.flask.capacity;
            battleSystem.flask.content = 'water';
            
            console.log(`💧 Фляга пополнена: ${oldCharges} -> ${battleSystem.flask.currentCharges}`);
            
            if (battleSystem.updateFlaskUI) {
                battleSystem.updateFlaskUI();
            }
            if (battleSystem.updateFlaskChargesDisplay) {
                battleSystem.updateFlaskChargesDisplay();
            }
            
            setTimeout(() => {
                if (battleSystem.updateFlaskChargesDisplay) {
                    battleSystem.updateFlaskChargesDisplay();
                    console.log("💧 Интерфейс фляги обновлен после таверны");
                }
            }, 100);
        }
        
        if (window.game) {
            window.game.saveGame();
            window.game.showNotification(`🍻 Таверна: здоровье ${oldHealth}→${stats.maxHealth}, фляга пополнена!`, 'success');
        }
        
        console.log(`🍻 Герой ${this.currentHero.name} посетил таверну, здоровье восстановлено`);
        
        this.drawTacticalMap();
    }

    handleWaterCell(cell) {
        if (!this.currentHero) return;
        
        if (!this.isPlayerAdjacentToWater(cell)) {
            this.showTransitionWarning(cell);
            return;
        }
        
        const battleSystem = window.game?.systems?.battle;
        if (battleSystem && battleSystem.flask) {
            const heroSystem = window.game?.systems?.hero;
            if (heroSystem) {
                const stats = heroSystem.calculateHeroStats(this.currentHero);
                const oldHealth = this.currentHero.currentHealth;
                this.currentHero.currentHealth = stats.maxHealth;
                console.log(`❤️ Здоровье восстановлено: ${oldHealth} → ${stats.maxHealth}`);
            }
            
            const oldCharges = battleSystem.flask.currentCharges;
            battleSystem.flask.currentCharges = battleSystem.flask.capacity;
            battleSystem.flask.content = 'water';
            
            if (battleSystem.updateFlaskUI) {
                battleSystem.updateFlaskUI();
            }
            if (battleSystem.updateFlaskChargesDisplay) {
                battleSystem.updateFlaskChargesDisplay();
            }
            
            if (window.game) {
                window.game.showNotification(
                    `💧 Фляга наполнена водой: ${oldCharges}→${battleSystem.flask.capacity} зарядов! ` +
                    `Здоровье восстановлено до максимума.`, 
                    'success'
                );
                window.game.saveGame();
            }
            
            console.log(`💧 Герой ${this.currentHero.name} пополнил флягу у воды: ${oldCharges}→${battleSystem.flask.capacity}`);
            
            this.drawTacticalMap();
        }
    }

    isPlayerAdjacentToWater(waterCell) {
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        
        return neighbors.some(neighbor => 
            neighbor.row === waterCell.row && 
            neighbor.col === waterCell.col
        );
    }

    showTransitionWarning(transitionCell) {
        const transitionName = this.getTransitionName(transitionCell);
        let message = `Чтобы использовать ${transitionName}, нужно подойти вплотную!`;
        
        if (transitionCell.type === 'water') {
            message = "💧 Чтобы использовать источник воды, нужно подойти к нему вплотную!";
        }
        
        console.log(`🚫 ${message}`);
        
        if (window.game) {
            window.game.showNotification(message, 'warning');
        }
        
        this.highlightTransition(transitionCell);
    }

    getTransitionName(transitionCell) {
        if (transitionCell.tacticalMap) {
            return this.getLocationNameFromPath(transitionCell.tacticalMap) || "помещение";
        }
        if (transitionCell.localMap) {
            return this.getLocationNameFromPath(transitionCell.localMap) || "локацию";
        }
        if (transitionCell.globalMap) {
            return this.getLocationNameFromPath(transitionCell.globalMap) || "регион";
        }
        if (transitionCell.type === 'exit') {
            return "выход";
        }
        if (transitionCell.type === 'water') {
            return "источник воды";
        }
        
        return "переход";
    }

    // ========== ПРОКСИ-МЕТОДЫ ДЛЯ ACTIONSYSTEM ==========
    // Эти методы перенаправляют вызовы в ActionSystem

    async loadCellData() {
        if (this.actionSystem) {
            return await this.actionSystem.loadCellData();
        }
        return false;
    }

    async loadLocationImages() {
        if (this.actionSystem) {
            return await this.actionSystem.loadLocationImages();
        }
        return false;
    }

    determineCellType(cell) {
        if (this.actionSystem) {
            return this.actionSystem.determineCellType(cell);
        }
        return 'grave';
    }

    updateCellActionsUI(cell) {
        if (this.actionSystem) {
            return this.actionSystem.updateCellActionsUI(cell);
        }
        console.error("❌ ActionSystem не инициализирован");
    }

    performCellAction(action, row, col) {
        if (this.actionSystem) {
            return this.actionSystem.performCellAction(action, row, col);
        }
        console.error("❌ ActionSystem не инициализирован");
    }

    completeCellExploration(row, col) {
        if (this.actionSystem) {
            return this.actionSystem.completeCellExploration(row, col);
        }
        console.error("❌ ActionSystem не инициализирован");
    }

    updateHeroResourcesUI(containerId = 'heroResourcesList') {
        if (this.actionSystem) {
            return this.actionSystem.updateHeroResourcesUI(containerId);
        }
        console.error("❌ ActionSystem не инициализирован");
    }

markCellAsExplored(row, col) {
    if (this.actionSystem) {
        const result = this.actionSystem.markCellAsExplored(row, col);
        
        // После исследования клетки открываем видимость соседних
        this.revealAdjacentCells(row, col);
        
        // Перерисовываем карту
        if (this.canvasInitialized) {
            this.drawTacticalMap();
        }
        
        return result;
    }
    console.error("❌ ActionSystem не инициализирован");
    return false;
}

    highlightSelectedCell(cell) {
        if (this.actionSystem) {
            return this.actionSystem.highlightSelectedCell(cell);
        }
        console.error("❌ ActionSystem не инициализирован");
    }

    // ========== МЕТОДЫ КОТОРЫЕ ОСТАЛИСЬ В MAPSYSTEM ==========

    isCellReachable(cell) {
        if (!cell || !this.playerTacticalPosition) return false;
        
        if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
            return true;
        }
        
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        const isNeighbor = neighbors.some(neighbor => 
            neighbor.row === cell.row && neighbor.col === cell.col
        );
        
        return isNeighbor;
    }

completeMovementAfterBattle(victory, escape = false, battleType = 'movement', doubleLoot = false) {
    console.log(`🎲 MapSystem: Завершение ${battleType} боя: победа=${victory}, побег=${escape}, двойной лут=${doubleLoot}`);
    
    // Делегируем обработку охоты модулю охоты через ActionSystem
    if (battleType === 'hunt' && this.actionSystem) {
        return this.completeHuntAfterBattle(victory, escape, doubleLoot);
    }
    
    // Обработка неудачных действий
    if (battleType === 'action_failure' && this.pendingAction) {
        const { action, row, col, cellTypeData, wasFailure } = this.pendingAction;
        
        if (victory) {
            console.log(`✅ Победа над монстром после неудачного действия ${action}`);
            this.showNotification(`✅ Вы победили монстра! Действие ${action} можно повторить.`, 'success');
            
            setTimeout(() => {
                const cellKey = `${col},${row}`;
                const cell = this.currentTacticalMap?.cells[cellKey];
                
                if (cell && this.actionSystem) {
                    this.actionSystem.updateCellActionsUI(cell);
                    this.actionSystem.highlightSelectedCell(cell);
                }
            }, 500);
        } else {
            console.log(`💀 Поражение от монстра после действия ${action}`);
            if (this.actionSystem) {
                this.actionSystem.markCellAsExplored(row, col);
            }
            this.showNotification(`💀 Вы были ранены монстром! Локация теперь считается опасной.`, 'error');
        }
        
        this.pendingAction = null;
        return;
    }
    
    // Обработка обычного перемещения
    if (this.pendingMovement) {
        let targetX, targetY;
        
        if (victory) {
            targetX = this.pendingMovement.x;
            targetY = this.pendingMovement.y;
            const oldPosition = {...this.playerTacticalPosition};
            this.playerTacticalPosition = {x: targetX, y: targetY};
            
            // Обновляем видимость
            this.updateVisibilityOnMove(targetX, targetY);
            
            console.log(`✅ Успешное перемещение героя ${this.currentHero.name} после боя: [${oldPosition.x}, ${oldPosition.y}] → [${targetX}, ${targetY}]`);
            
            if (window.game) {
                window.game.showNotification(`✅ Успешное перемещение на [${targetX}, ${targetY}]`, 'success');
            }
        } else {
            if (escape) {
                targetX = this.playerTacticalPosition.x;
                targetY = this.playerTacticalPosition.y;
                console.log(`🏃 Побег! Герой ${this.currentHero.name} остался на позиции: [${targetX}, ${targetY}]`);
                
                if (window.game) {
                    window.game.showNotification(`🏃 Побег успешен! Герой остался на своей позиции.`, 'warning');
                }
            } else {
                const startPosition = this.currentTacticalMap.startPosition;
                targetX = startPosition.x;
                targetY = startPosition.y;
                const oldPosition = {...this.playerTacticalPosition};
                this.playerTacticalPosition = {x: targetX, y: targetY};
                
                // Обновляем видимость
                this.updateVisibilityOnMove(targetX, targetY);
                
                console.log(`💀 Поражение! Возврат героя ${this.currentHero.name} на стартовую позицию: [${oldPosition.x}, ${oldPosition.y}] → [${targetX}, ${targetY}]`);
                
                if (window.game) {
                    window.game.showNotification(`💀 Поражение! Возврат на стартовую позицию.`, 'error');
                }
            }
        }
        
        this.pendingMovement = null;
        
        if (this.activeOverlay === 'tactical-map' || this.activeOverlay === 'local-map') {
            this.calculateCSSScale();
            this.drawTacticalMap();
            this.updateMovementInfo();
            
            setTimeout(() => {
                const cellKey = `${targetX},${targetY}`;
                const currentCell = this.currentTacticalMap?.cells[cellKey];
                
                if (currentCell && this.actionSystem) {
                    console.log(`🎯 После боя показываем действия для клетки [${targetX}, ${targetY}]`);
                    this.actionSystem.updateCellActionsUI(currentCell);
                    this.actionSystem.highlightSelectedCell(currentCell);
                }
            }, 500);
        }
        
        if (this.currentHero && window.game && window.game.systems && window.game.systems.hero) {
            window.game.systems.hero.currentHero = this.currentHero;
            window.game.systems.hero.calculateHeroStats(this.currentHero);
        }
    }
}


/**
 * Обработка завершения специального действия (торговля, вода и т.д.)
 * Важно: специальные клетки НЕ отмечаются как исследованные
 */
handleSpecialActionCompletion(cell, action) {
    console.log(`🎯 Завершение специального действия ${action} на клетке ${cell.type}`);
    
    // Проверяем, является ли клетка специальной
    const specialCellTypes = ['merchant', 'water', 'tavern', 'campfire'];
    const isSpecialCell = specialCellTypes.includes(cell.type);
    
    if (isSpecialCell) {
        console.log(`🔄 Клетка ${cell.type} остается доступной для повторного использования`);
        // НЕ устанавливаем explored = true для специальных клеток
        // Клетка остается в том же состоянии
        cell.hasAction = true; // Гарантируем, что действия остаются доступными
        
        // Для торговца обновляем список товаров если нужно
        if (cell.type === 'merchant' && cell.restockTimer) {
            cell.restockTimer--;
            if (cell.restockTimer <= 0) {
                console.log("🔄 Торговец пополняет запасы");
                this.restockMerchant(cell);
                cell.restockTimer = 7; // Через 7 дней снова пополняет
            }
        }
    } else {
        // Для обычных клеток обычная логика
        cell.explored = true;
        cell.hasAction = false;
    }
    
    // Перерисовываем карту
    this.drawTacticalMap();
    
    // Обновляем интерфейс действий
    if (this.actionSystem) {
        setTimeout(() => {
            this.actionSystem.updateCellActionsUI(cell);
        }, 300);
    }
    
    return true;
}

/**
 * Пополнение запасов торговца
 */
restockMerchant(merchantCell) {
    if (!merchantCell.shopItems || merchantCell.shopItems.length === 0) {
        console.warn("🛒 У торговца нет товаров для пополнения");
        return;
    }
    
    // Увеличиваем количество каждого товара
    merchantCell.shopItems.forEach(item => {
        if (item.quantity !== undefined) {
            item.quantity = Math.min(item.maxQuantity || 10, item.quantity + (item.restockAmount || 1));
        }
    });
    
    console.log("✅ Запасы торговца пополнены");
    
    if (window.game) {
        window.game.showNotification("🛒 Торговец пополнил запасы товаров", 'success');
    }
}




    
completeHuntAfterBattle(victory, escape, doubleLoot = false) {
    console.log(`🏹 MapSystem: Завершение охоты: победа=${victory}, побег=${escape}, двойной лут=${doubleLoot}`);
    
    if (!this.pendingAction || this.pendingAction.action !== 'hunt') {
        console.error("❌ Нет ожидающего действия охоты");
        this.completeMovementAfterBattle(victory, escape);
        return;
    }
    
    const { row, col, targetResource, wasSuccess, wasFailure } = this.pendingAction;
    const cellKey = `${col},${row}`;
    const cell = this.currentTacticalMap?.cells[cellKey];
    
    if (victory) {
        // ГЕРОЙ ПОБЕДИЛ В БОЮ
        if (wasSuccess) {
            // УСПЕШНАЯ ОХОТА + ПОБЕДА В БОЮ = получаем целевой ресурс
            this.processHuntResource(targetResource, doubleLoot);
            
            const bonusText = doubleLoot ? ' (двойной лут!)' : '';
            this.showNotification(`🎉 Успешная охота! Получен: ${targetResource.name}${bonusText}`, 'success');
            
            // Отмечаем клетку как исследованную после успешной охоты
            if (cell) {
                cell.explored = true;
                cell.hasAction = false;
            }
        } else {
            // НЕУДАЧНАЯ ОХОТА + ПОБЕДА В БОЮ = получаем случайный ресурс
            const randomResource = this.getRandomHuntResource();
            if (randomResource) {
                this.processHuntResource(randomResource, false);
                this.showNotification(`🎉 Победа в бою! Получен случайный трофей: ${randomResource.name}`, 'success');
            }
        }
        
        // Штраф уже применен в startHuntBattle если была неудача
        if (wasFailure && cell) {
            this.applyDoubleHuntPenalty(cell);
        }
        
    } else {
        // ГЕРОЙ ПРОИГРАЛ БОЙ ИЛИ СБЕЖАЛ
        if (escape) {
            this.showNotification("🏃 Вы сбежали с поля боя", 'warning');
        } else {
            this.showNotification("💀 Вы проиграли бой", 'error');
        }
        
        // При поражении штраф удваивается
        if (wasFailure && cell) {
            this.applyDoubleHuntPenalty(cell);
        }
    }
    
    // ⭐ ВАЖНО: ПОКАЗЫВАЕМ РЕЗУЛЬТАТ БОЯ ПОСЛЕ ОБРАБОТКИ ОХОТЫ
    setTimeout(() => {
        const battleSystem = window.game?.systems?.battle;
        if (battleSystem && battleSystem.showBattleResult) {
            battleSystem.showBattleResult(victory, escape);
        } else {
            console.error("❌ BattleSystem не доступна для показа результатов");
        }
    }, 100);
    
    // Очищаем pendingAction
    this.pendingAction = null;
}

// ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ ОХОТЫ ==========

processHuntResource(resource, doubleLoot = false) {
    if (!resource || !this.currentHero) return;
    
    console.log(`🎁 Обработка ресурса охоты: ${resource.name}, двойной лут: ${doubleLoot}`);
    
    const count = doubleLoot ? 2 : 1;
    
    // Проверяем, есть ли система ресурсов
    const resourcesSystem = window.game?.systems?.resources;
    if (resourcesSystem) {
        // Добавляем через ResourcesSystem
        for (let i = 0; i < count; i++) {
            this.addResourceToHero(resource.id, 1);
        }
        console.log(`✅ Ресурс ${resource.name} добавлен через ResourcesSystem (количество: ${count})`);
    } else {
        // Запасной вариант
        console.warn(`⚠️ ResourcesSystem не доступна, используем прямой метод`);
        
        // Сохраняем лут в battleLoot BattleSystem
        const battleSystem = window.game?.systems?.battle;
        if (battleSystem) {
            for (let i = 0; i < count; i++) {
                if (!battleSystem.battleLoot) battleSystem.battleLoot = [];
                battleSystem.battleLoot.push({
                    id: resource.id,
                    name: resource.name,
                    timestamp: Date.now(),
                    doubleLoot: doubleLoot
                });
            }
            console.log(`✅ Ресурс ${resource.name} добавлен в battleLoot (количество: ${count})`);
        }
    }
}

getRandomHuntResource() {
    // Получаем случайный ресурс для охоты
    const resourcesSystem = window.game?.systems?.resources;
    if (!resourcesSystem) return null;
    
    // Получаем все доступные ресурсы из категории "hides" (шкуры)
    const hideResources = resourcesSystem.resources?.hides || [];
    const leatherResources = resourcesSystem.resources?.leathers || [];
    const furResources = resourcesSystem.resources?.furs || [];
    
    const allResources = [...hideResources, ...leatherResources, ...furResources];
    
    if (allResources.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * allResources.length);
    return allResources[randomIndex];
}

applyDoubleHuntPenalty(cell) {
    // Применяем штраф за неудачную охоту
    if (!cell || !this.currentHero) return;
    
    console.log(`⚠️ Применение штрафа за неудачную охоту`);
    
    // Например, можно уменьшить здоровье героя
    const heroSystem = window.game?.systems?.hero;
    if (heroSystem) {
        const stats = heroSystem.calculateHeroStats(this.currentHero);
        const penalty = Math.floor(stats.maxHealth * 0.1); // 10% от макс. здоровья
        this.currentHero.currentHealth = Math.max(1, this.currentHero.currentHealth - penalty);
        
        this.showNotification(`⚠️ Неудачная охота! Потеряно ${penalty} здоровья`, 'warning');
    }
}

// ========== МЕТОД ДОБАВЛЕНИЯ РЕСУРСОВ ГЕРОЮ ==========

addResourceToHero(resourceId, amount = 1) {
    if (!this.currentHero) return;
    
    // Используем sharedResources для хранения ресурсов
    if (!window.game.sharedResources) {
        window.game.sharedResources = {};
    }
    
    if (!window.game.sharedResources.resources) {
        window.game.sharedResources.resources = {};
    }
    
    // Добавляем ресурс
    if (!window.game.sharedResources.resources[resourceId]) {
        window.game.sharedResources.resources[resourceId] = {
            id: resourceId,
            count: 0
        };
    }
    
    window.game.sharedResources.resources[resourceId].count += amount;
    
    // Также добавляем в текущего героя для совместимости
    if (!this.currentHero.resources) {
        this.currentHero.resources = {};
    }
    
    if (!this.currentHero.resources[resourceId]) {
        this.currentHero.resources[resourceId] = {
            id: resourceId,
            count: 0
        };
    }
    
    this.currentHero.resources[resourceId].count += amount;
    
    console.log(`📦 Ресурс ${resourceId} добавлен герою (количество: ${amount}, всего: ${this.currentHero.resources[resourceId].count})`);
    
    // Обновляем интерфейс ресурсов
    if (this.actionSystem) {
        this.actionSystem.updateHeroResourcesUI();
    }
}

showNotification(message, type = 'info') {
    if (window.game && window.game.showNotification) {
        window.game.showNotification(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
        // Создаем простую нотификацию
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            border-radius: 6px;
            z-index: 9999;
            font-family: Arial, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}
    
    // ========== СИСТЕМА ЛУТА ==========

    getLootItemById(itemId) {
        const itemSystem = window.game?.systems?.equipment;
        if (!itemSystem) {
            console.error("❌ EquipmentSystem не доступна");
            return null;
        }
        
        const item = itemSystem.getItemById(itemId);
        if (!item) {
            console.warn(`⚠️ Предмет с ID ${itemId} не найден в системе`);
            return null;
        }
        
        return item;
    }

    // ========== ГЕРОЙ И СИНХРОНИЗАЦИЯ ==========

    syncHeroWithOtherSystems() {
        if (!this.currentHero) return;
        
        if (window.game) {
            window.game.currentHero = this.currentHero;
            
            if (window.game.systems.hero) {
                window.game.systems.hero.currentHero = this.currentHero;
                console.log("✅ Герой синхронизирован с HeroSystem");
            }
            
            if (window.game.systems.equipment) {
                window.game.systems.equipment.setCurrentHero(this.currentHero);
            }
            
            if (window.game.systems.battle) {
                window.game.systems.battle.currentHero = this.currentHero;
            }

            if (window.game.systems.shop) {
                window.game.systems.shop.currentHero = this.currentHero;
            }
        }
    }

    setCurrentHero(hero) {
        this.currentHero = hero;
        console.log(`🎯 Установлен герой для карты: ${hero?.name || 'нет'}`);
        
        if (hero) {
            this.updatePlayerPositionsFromHero(hero);
            this.syncHeroWithOtherSystems();
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

    // ========== ЗАГРУЗКА КАРТ ==========

   // В КЛАССЕ MapSystem метод loadMapData:
async loadMapData() {
    try {
        console.log("📥 MapSystem: Загружаем данные карт...");
        
        // Инициализируем системы В ПОРЯДКЕ ВАЖНОСТИ
        this.initializeTimeSystem(); // СНАЧАЛА TimeSystem
        this.initializeActionSystem(); // ПОТОМ ActionSystem
        
        await this.loadJSONMaps();
        
        if (this.actionSystem) {
            await this.actionSystem.loadCellData();
            await this.actionSystem.loadLocationImages();
        }
        
        this.debugLoadedMaps();
        
        if (this.actionSystem) {
            await this.initializeCellSystem();
        }
        
        // Инициализируем лагерь на стартовой позиции, если его нет
        if (this.timeSystem && !this.timeSystem.camp.exists) {
            const startHex = this.findStartHex();
            if (startHex) {
                this.playerTacticalPosition = {x: startHex.col, y: startHex.row};
                this.timeSystem.camp.location = {...this.playerTacticalPosition};
                this.timeSystem.camp.exists = true;
                this.timeSystem.camp.protections = ['basic_campfire'];
                this.timeSystem.camp.level = 1;
                console.log(`🏕️ Автоматически создан лагерь на стартовой позиции [${startHex.col},${startHex.row}]`);
            }
        }
        
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
        
        console.log(`✅ Карты загружены: Глобальных=${this.globalMaps.length}, Локальных=${this.localMaps.length}, Тактических=${this.tacticalMaps.length}`);
        
        // Обновляем отображение времени
        if (this.timeSystem) {
            this.timeSystem.updateTimeDisplay();
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ Ошибка загрузки данных карт:", error);
        this.createFallbackMaps();
        if (this.localMaps.length > 0) {
            this.forceSetLocalMap();
        }
        
        // Создаем лагерь даже при ошибке
        if (this.timeSystem && !this.timeSystem.camp.exists) {
            this.timeSystem.camp.location = {...this.playerTacticalPosition};
            this.timeSystem.camp.exists = true;
            this.timeSystem.camp.protections = ['basic_campfire'];
            this.timeSystem.camp.level = 1;
        }
        
        return true;
    }
}

// НОВЫЙ МЕТОД в MapSystem (добавить после loadMapData):
findStartHex() {
    if (!this.currentTacticalMap || !this.currentTacticalMap.cells) {
        return null;
    }
    
    // Ищем клетку с типом player_start
    for (const cell of Object.values(this.currentTacticalMap.cells)) {
        if (cell.type === 'player_start') {
            return cell;
        }
    }
    
    // Если нет player_start, берем первую доступную клетку
    const firstCell = Object.values(this.currentTacticalMap.cells)[0];
    if (firstCell) {
        return firstCell;
    }
    
    return null;
}

// НОВЫЙ МЕТОД в MapSystem (добавить в конструктор или отдельно):
initializeTimeSystem() {
    if (!this.timeSystem) {
        // Пробуем загрузить модуль TimeSystem
        if (typeof TimeSystem !== 'undefined') {
            this.timeSystem = new TimeSystem(this);
            console.log("✅ TimeSystem создан из глобального класса");
        } else {
            // Если нет глобального класса, создаем базовый
            console.log("⚠️ TimeSystem не найден глобально, создаем базовый");
            this.createBasicTimeSystem();
        }
    }
    return this.timeSystem;
}

// НОВЫЙ МЕТОД для создания базового TimeSystem если модуль не загружен:
createBasicTimeSystem() {
    this.timeSystem = {
        gameTime: { day: 1, hour: 7, season: 'summer' },
        camp: { exists: false, location: null, protections: [], level: 0 },
        currentHexTime: 0,
        maxHexTime: 16,
        seasonalDayLength: { summer: 20, autumn: 16, winter: 8, spring: 16 },
        
        spendHourOnHex: function(action) {
            console.log(`🕐 [BASIC] Тратим час на: ${action}`);
            this.currentHexTime++;
            this.gameTime.hour++;
            
            if (this.gameTime.hour >= 24) {
                this.gameTime.hour = 0;
                this.gameTime.day++;
            }
            
            this.updateTimeDisplay();
            return true;
        },
        
        updateTimeDisplay: function() {
            const timeElement = document.getElementById('timeDisplay');
            if (!timeElement) return;
            
            const hourDisplay = this.gameTime.hour.toString().padStart(2, '0');
            const seasonNames = { summer: 'Лето', autumn: 'Осень', winter: 'Зима', spring: 'Весна' };
            
            timeElement.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #fbbf24; font-weight: bold;">
                        ☀️ ${hourDisplay}:00
                    </span>
                    <span style="color: #94a3b8;">
                        День ${this.gameTime.day} (${seasonNames[this.gameTime.season] || this.gameTime.season})
                    </span>
                    ${this.camp.exists ? '<span style="color: #10b981;">🏕️ Лагерь</span>' : ''}
                </div>
            `;
        },
        
        isInCamp: function() {
            if (!this.camp.exists || !this.camp.location) return false;
            const heroPos = this.mapSystem.playerTacticalPosition;
            return heroPos.x === this.camp.location.x && heroPos.y === this.camp.location.y;
        },
        
        createCamp: function() {
            const heroPos = this.mapSystem.playerTacticalPosition;
            this.camp = {
                exists: true,
                location: {...heroPos},
                protections: ['basic_campfire'],
                level: 1,
                createdDay: this.gameTime.day
            };
            console.log(`🏕️ Лагерь создан на [${heroPos.x}, ${heroPos.y}]`);
            this.updateTimeDisplay();
            
            if (window.game) {
                window.game.showNotification("🏕️ Лагерь создан!", 'success');
            }
            return true;
        },
        
        returnToCamp: function() {
            if (!this.camp.exists) {
                console.log("❌ Лагерь не создан!");
                return false;
            }
            
            // Просто телепортируем в лагерь для простоты
            this.mapSystem.playerTacticalPosition = {...this.camp.location};
            this.mapSystem.drawTacticalMap();
            
            console.log(`🏕️ Возвращение в лагерь`);
            
            if (window.game) {
                window.game.showNotification("🏕️ Вы вернулись в лагерь", 'success');
            }
            return true;
        },
        
        spendNightInCamp: function() {
            if (!this.isInCamp()) {
                console.log("❌ Не в лагере!");
                return false;
            }
            
            // Переходим к утру (7:00)
            this.gameTime.hour = 7;
            this.gameTime.day++;
            
            // Восстанавливаем здоровье
            if (this.mapSystem.currentHero) {
                const heroSystem = window.game?.systems?.hero;
                if (heroSystem) {
                    const stats = heroSystem.calculateHeroStats(this.mapSystem.currentHero);
                    this.mapSystem.currentHero.currentHealth = stats.maxHealth;
                    console.log(`❤️ Здоровье восстановлено до максимума`);
                }
            }
            
            this.updateTimeDisplay();
            
            if (window.game) {
                window.game.showNotification(`🌅 Утро дня ${this.gameTime.day}. Вы хорошо отдохнули.`, 'success');
            }
            
            return true;
        },
        
        getTimeStatus: function() {
            const dayLength = this.seasonalDayLength[this.gameTime.season];
            const isDay = this.gameTime.hour >= 7 && this.gameTime.hour < dayLength;
            
            return {
                hour: this.gameTime.hour,
                day: this.gameTime.day,
                season: this.gameTime.season,
                isDay: isDay,
                isNight: !isDay
            };
        },
        
        saveState: function() {
            return {
                gameTime: {...this.gameTime},
                camp: {...this.camp},
                currentHexTime: this.currentHexTime
            };
        },
        
        loadState: function(state) {
            if (state.gameTime) this.gameTime = state.gameTime;
            if (state.camp) this.camp = state.camp;
            if (state.currentHexTime) this.currentHexTime = state.currentHexTime;
            this.updateTimeDisplay();
        }
    };
    
    // Привязываем MapSystem
    this.timeSystem.mapSystem = this;
    console.log("✅ Базовый TimeSystem создан");
}

  async initializeCellSystem() {
    console.log("🔄 MapSystem: Инициализация системы клеток...");
    
    [this.localMaps, this.tacticalMaps].forEach(mapArray => {
        mapArray.forEach(map => {
            if (map && map.cells) {
                Object.values(map.cells).forEach(cell => {
                    if (!cell.cellType && this.actionSystem) {
                        this.actionSystem.determineCellType(cell);
                    }
                    if (cell.explored === undefined) cell.explored = false;
                    if (cell.hasAction === undefined) cell.hasAction = true;
                    if (cell.isSelected === undefined) cell.isSelected = false;
                    // Инициализируем видимость для каждой клетки
                    this.updateCellVisibility(cell);
                });
            }
        });
    });
    
    console.log("✅ Система клеток инициализирована");
    console.log("👁️ Видимость клеток инициализирована для всех карт");
    return true;
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
            
            if (localMap.cells && this.actionSystem) {
                Object.values(localMap.cells).forEach(cell => {
                    if (!cell.cellType) {
                        this.actionSystem.determineCellType(cell);
                    }
                    if (cell.explored === undefined) cell.explored = false;
                    if (cell.hasAction === undefined) cell.hasAction = true;
                    if (cell.isSelected === undefined) cell.isSelected = false;
                });
            }
            
            return true;
        }
        console.log("❌ Нет локальных карт для установки");
        return false;
    }

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
                hasLoot: cell.hasLoot || false,
                shopName: cell.shopName,
                merchantName: cell.merchantName,
                shopItems: cell.shopItems || [],
                shopId: cell.shopId,
                restockTimer: cell.restockTimer,
                explored: false,
                hasAction: true,
                isSelected: false,
                originalData: cell,
                cellType: null
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

    // ========== ПЕРЕХОДЫ МЕЖДУ КАРТАМИ ==========

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
            
            this.calculateCSSScale();
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
            
            this.calculateCSSScale();
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
    console.log(`🔍 ЗАГРУЗКА КАРТЫ: ${mapPath}`);
    
    try {
        const response = await fetch(mapPath);
        if (!response.ok) {
            throw new Error(`Не удалось загрузить карту: ${mapPath}`);
        }
        
        const mapData = await response.json();
        console.log(`✅ Карта "${mapData.meta?.name}" загружена`);
        
        const tacticalMap = this.convertTigrimionJSONToMap(mapData, 'tactical');
        
        if (tacticalMap) {
            this.currentTacticalMap = tacticalMap;
            
            if (this.actionSystem) {
                Object.values(tacticalMap.cells).forEach(cell => {
                    if (!cell.cellType) {
                        this.actionSystem.determineCellType(cell);
                    }
                    if (cell.explored === undefined) cell.explored = false;
                    if (cell.hasAction === undefined) cell.hasAction = true;
                    if (cell.isSelected === undefined) cell.isSelected = false;
                    // Инициализируем видимость клетки
                    this.updateCellVisibility(cell);
                });
            }
            
            if (!this._lastTransitionCell || !this._lastTransitionCell.targetPosition) {
                this.setPlayerToStartPosition();
            }
            
            // Обновляем видимость всех клеток
            this.updateAllCellsVisibility();
            console.log(`👁️ Видимость клеток обновлена для тактической карты: ${tacticalMap.name}`);
            
            console.log(`📍 Текущая позиция игрока:`, this.playerTacticalPosition);
            return tacticalMap;
        }
    } catch (error) {
        console.error(`❌ Ошибка загрузки тактической карты:`, error);
        
        console.log("🔄 Создаем тестовую таверну...");
        const tavernMap = this.createTestTavernMap();
        this.currentTacticalMap = tavernMap;
        
        // Инициализируем видимость для тестовой карты
        Object.values(tavernMap.cells).forEach(cell => {
            this.updateCellVisibility(cell);
        });
        
        // Обновляем видимость всех клеток
        this.updateAllCellsVisibility();
        console.log(`👁️ Видимость клеток обновлена для тестовой таверны: ${tavernMap.name}`);
        
        if (!this._lastTransitionCell || !this._lastTransitionCell.targetPosition) {
            this.setPlayerToStartPosition();
        }
        
        return tavernMap;
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
            
            // Инициализируем видимость для всех клеток
            Object.values(localMap.cells).forEach(cell => {
                this.updateCellVisibility(cell);
            });
            
            // Обновляем видимость всех клеток
            this.updateAllCellsVisibility();
            console.log(`👁️ Видимость клеток обновлена для локальной карты: ${localMap.name}`);
            
            console.log(`✅ Локальная карта загружена: ${localMap.name}`);
            return localMap;
        }

        
    } catch (error) {
        console.error(`❌ Ошибка загрузки локальной карты:`, error);
        
        console.log("🔄 Создаем тестовую локацию...");
        const locationMap = this.createTestLocationMap();
        this.setCurrentLocalMap(locationMap);
        
        // Инициализируем видимость для тестовой карты
        Object.values(locationMap.cells).forEach(cell => {
            this.updateCellVisibility(cell);
        });
        
        // Обновляем видимость всех клеток
        this.updateAllCellsVisibility();
        console.log(`👁️ Видимость клеток обновлена для тестовой локации: ${locationMap.name}`);
        
        return locationMap;
    }
    return null;
}
    async loadGlobalMapFile(mapPath) {
        console.log(`🌍 Загрузка глобальной карта: ${mapPath}`);
        return null;
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
    
    if (this.actionSystem) {
        Object.values(localMap.cells).forEach(cell => {
            if (!cell.cellType) {
                this.actionSystem.determineCellType(cell);
            }
            if (cell.explored === undefined) cell.explored = false;
            if (cell.hasAction === undefined) cell.hasAction = true;
            if (cell.isSelected === undefined) cell.isSelected = false;
            // Инициализируем видимость клетки
            this.updateCellVisibility(cell);
        });
    }
    
    // Обновляем видимость всех клеток
    this.updateAllCellsVisibility();
    console.log(`👁️ Видимость клеток обновлена для локальной карты: ${localMap.name}`);
    
    console.log(`📍 Установлена локальная карта: ${localMap.name}`, {
        startPosition: localMap.startPosition,
        cellsCount: Object.keys(localMap.cells).length
    });
    
    if (this.canvasInitialized) {
        this.calculateCSSScale();
        this.drawTacticalMap();
    }
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

    createTestTavernMap() {
        console.log("🍻 Создаем тестовую таверну...");
        
        const tavernMap = {
            id: 1001,
            name: "Таверна 'Веселый Гном'",
            image: "",
            width: 6,
            height: 6,
            startPosition: {x: 3, y: 3},
            description: "Уютная таверна, где можно отдохнуть и послушать новости",
            cells: {
                "3,3": {
                    type: "player_start", 
                    passable: true, 
                    row: 3, 
                    col: 3, 
                    visible: true, 
                    x: 300, 
                    y: 300,
                    explored: false,
                    hasAction: true,
                    isSelected: false,
                    cellType: null
                },
                "3,2": {
                    type: "exit", 
                    passable: true, 
                    row: 2, 
                    col: 3, 
                    visible: true, 
                    x: 300, 
                    y: 250,
                    tooltip: "🚪 Выход из таверны\n(Вернуться на улицу)",
                    explored: false,
                    hasAction: true,
                    isSelected: false,
                    cellType: null
                },
                "2,3": {
                    type: "npc", 
                    passable: true, 
                    row: 3, 
                    col: 2, 
                    visible: true, 
                    x: 250, 
                    y: 300,
                    tooltip: "🧙 Хозяин таверны\n(Может рассказать новости)",
                    explored: false,
                    hasAction: true,
                    isSelected: false,
                    cellType: null
                },
                "4,3": {
                    type: "merchant", 
                    passable: true, 
                    row: 3, 
                    col: 4, 
                    visible: true, 
                    x: 350, 
                    y: 300,
                    shopName: "Таверный магазин",
                    merchantName: "Бармен Грог",
                    shopItems: [1, 2, 3],
                    tooltip: "🛒 Бармен\n(Купить выпивку и еду)",
                    explored: false,
                    hasAction: true,
                    isSelected: false,
                    cellType: null
                },
                "3,4": {
                    type: "campfire", 
                    passable: true, 
                    row: 4, 
                    col: 3, 
                    visible: true, 
                    x: 300, 
                    y: 350,
                    tooltip: "🔥 Камин\n(Тепло и уют)",
                    explored: false,
                    hasAction: true,
                    isSelected: false,
                    cellType: null
                }
            },
            cellSize: 40,
            originalCanvasWidth: 600,
            originalCanvasHeight: 600,
            mapType: 'tactical'
        };
        
        console.log("✅ Тестовая таверна создана с магазином");
        return tavernMap;
    }

    createTestLocationMap() {
        console.log("🌍 Создаем тестовую локацию...");
        
        const locationMap = {
            id: 1002,
            name: "Тестовая Локация",
            image: "",
            width: 8,
            height: 8,
            startPosition: {x: 4, y: 4},
            description: "Тестовая локация для отладки переходов",
            cells: {
                "4,4": {
                    type: "player_start", 
                    passable: true, 
                    row: 4, 
                    col: 4, 
                    visible: true, 
                    x: 200, 
                    y: 200,
                    explored: false,
                    hasAction: true,
                    isSelected: false,
                    cellType: null
                },
                "4,3": {
                    type: "exit", 
                    passable: true, 
                    row: 3, 
                    col: 4, 
                    visible: true, 
                    x: 200, 
                    y: 150,
                    explored: false,
                    hasAction: true,
                    isSelected: false,
                    cellType: null
                }
            },
            cellSize: 40,
            originalCanvasWidth: 400,
            originalCanvasHeight: 400,
            mapType: 'local'
        };
        
        console.log("✅ Тестовая локация создана");
        return locationMap;
    }

   async forceMapUpdate(newMap) {
    console.log("🔄 Принудительное обновление карты...");
    
    if (this.currentMapType === 'local') {
        this.currentLocalMap = newMap;
    }
    this.currentTacticalMap = newMap;
    
    if (newMap.cells && this.actionSystem) {
        Object.values(newMap.cells).forEach(cell => {
            if (!cell.cellType) {
                this.actionSystem.determineCellType(cell);
            }
            if (cell.explored === undefined) cell.explored = false;
            if (cell.hasAction === undefined) cell.hasAction = true;
            if (cell.isSelected === undefined) cell.isSelected = false;
            // Инициализируем видимость клетки
            this.updateCellVisibility(cell);
        });
    }
    
    // Обновляем видимость всех клеток
    this.updateAllCellsVisibility();
    console.log(`👁️ Видимость клеток обновлена для карты: ${newMap.name}`);
    
    if (this.canvasInitialized) {
        this.calculateCSSScale();
        this.drawTacticalMap();
        this.updateMovementInfo();
        console.log("✅ Карта немедленно обновлена");
        
        setTimeout(() => {
            const cellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
            const currentCell = this.currentTacticalMap.cells[cellKey];
            
            if (currentCell && this.actionSystem) {
                console.log(`📍 Показываем описание клетки после обновления карты`);
                this.actionSystem.updateCellActionsUI(currentCell);
                this.actionSystem.highlightSelectedCell(currentCell);
            }
        }, 200);
    } else {
        setTimeout(() => {
            this.initCanvas();
        }, 100);
    }
    
    this.updateMapInterface();
}

    updateMapInterface() {
        const header = document.querySelector('.tactical-map-header h4');
        const mapTypeBadge = document.querySelector('.map-type-badge');
        const positionInfo = document.querySelector('.position-info');
        const description = document.querySelector('.map-description');
        const stats = document.querySelector('.map-stats');
        
        if (header && this.currentTacticalMap) {
            const lootLevel = this.currentTacticalMap.jsonData?.meta?.lootLevel;
            const lootLevelText = lootLevel ? ` [Уровень лута: ${lootLevel}]` : '';
            header.textContent = this.currentTacticalMap.name + lootLevelText;
        }
        
        if (mapTypeBadge) {
            mapTypeBadge.textContent = this.currentMapType === 'local' ? '📍 Локальная' : '🎲 Тактическая';
        }
        
        if (positionInfo) {
            positionInfo.textContent = `Позиция: [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}] ${this.currentMapType === 'local' ? ' (локальная)' : ' (тактическая)'}`;
        }
        
        if (description && this.currentTacticalMap) {
            description.textContent = this.currentTacticalMap.description || 'Описание отсутствует';
        }
        
        if (stats && this.currentTacticalMap) {
            const cellsCount = Object.keys(this.currentTacticalMap.cells).length;
            stats.innerHTML = `
                <span>Клеток: ${cellsCount}</span>
                <span>Размер: ${this.currentTacticalMap.width}x${this.currentTacticalMap.height}</span>
                <span>Масштаб: <span id="currentZoom">${Math.round(this.zoomLevel * 100)}%</span></span>
                <span id="availableMoves">Доступных ходов: 0</span>
            `;
        }
        
        this.updateMovementInfo();
    }

handleCanvasClick(e) {
    if (!this.currentTacticalMap) {
        console.error("❌ Нет текущей тактической карты");
        return;
    }

    console.log("🎯 ОБРАБОТКА КЛИКА ПО КАРТЕ");

    const canvasRect = this.canvas.getBoundingClientRect();
    
    const computedStyle = getComputedStyle(this.canvas);
    const transform = computedStyle.transform;
    let scale = 1;
    
    if (transform && transform !== 'none') {
        const matrix = new DOMMatrix(transform);
        scale = matrix.a;
    }
    
    const logicalX = (e.clientX - canvasRect.left) / scale;
    const logicalY = (e.clientY - canvasRect.top) / scale;
    
    console.log(`🎯 Клик: экран [${e.clientX}, ${e.clientY}] -> логические [${logicalX}, ${logicalY}] scale: ${scale}`);
    
    const hex = this.getHexAtLogicalPosition(logicalX, logicalY);
    if (!hex) {
        console.log("❌ Клетка не найдена по координатам");
        return;
    }
    
    console.log(`🎲 Клик по клетке: [${hex.col}, ${hex.row}] тип: ${hex.type} tacticalMap: ${hex.tacticalMap}`);
    
    // === СПЕЦИАЛЬНАЯ ОБРАБОТКА ДЛЯ МИРНЫХ КАРТ (ТАВЕРН) ===
    if (this.isPeacefulMap()) {
        console.log("🍻 Обработка клика на мирной карте (таверна)");
        
        // ПРОВЕРКА: Убеждаемся, что клетка найдена правильно
        if (!hex) {
            console.error("❌ НЕ НАЙДЕНА КЛЕТКА ПО КООРДИНАТАМ!");
            console.log("Логические координаты клика:", logicalX, logicalY);
            // Показываем сообщение и выходим
            this.showNotification("Не удалось определить клетку. Попробуйте кликнуть ближе к центру.", 'warning');
            return;
        }
        
        console.log(`🎯 Клик по клетке на мирной карте: [${hex.col}, ${hex.row}] тип: ${hex.type}`);
        
        // === ОБРАБОТКА СПЕЦИАЛЬНЫХ КЛЕТОК (торговец, вода и т.д.) ===
        const specialCellTypes = ['merchant', 'water', 'tavern', 'campfire', 'npc'];
        if (specialCellTypes.includes(hex.type)) {
            console.log(`🎯 Клик по специальной клетке: ${hex.type}`);
            
            // УПРОЩЕННАЯ ПРОВЕРКА ДОСТИЖИМОСТИ: Просто сравниваем координаты с соседями
            const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
            const isReachable = neighbors.some(neighbor => 
                neighbor.row === hex.row && neighbor.col === hex.col
            );
            
            if (isReachable) {
                console.log(`✅ Клетка достижима! Показываем интерфейс ActionSystem.`);
                
                // НЕМЕДЛЕННО показываем интерфейс действий
                if (this.actionSystem) {
                    this.actionSystem.updateCellActionsUI(hex);
                    this.actionSystem.highlightSelectedCell(hex);
                } else {
                    console.error("❌ ActionSystem не доступен!");
                    this.showNotification("Система действий не загружена", 'error');
                }
            } else {
                console.log(`❌ Клетка недостижима для взаимодействия`);
                
                // Показываем понятное сообщение
                let message = `Чтобы взаимодействовать, подойдите к клетке [${hex.col}, ${hex.row}]`;
                if (hex.type === 'merchant') message = `🛒 Подойдите к торговцу [${hex.col}, ${hex.row}]`;
                if (hex.type === 'water') message = `💧 Подойдите к источнику воды [${hex.col}, ${hex.row}]`;
                if (hex.type === 'tavern') message = `🍻 Подойдите к таверне [${hex.col}, ${hex.row}]`;
                
                this.showNotification(message, 'warning');
                
                // Простая подсветка на 1 секунду
                const originalColor = hex.highlightColor;
                hex.highlightColor = '#ff4444';
                hex.isHighlighted = true;
                this.drawTacticalMap();
                
                setTimeout(() => {
                    hex.highlightColor = originalColor;
                    hex.isHighlighted = false;
                    this.drawTacticalMap();
                }, 1000);
            }
            return; // ВАЖНО: завершаем обработку для специальных клеток
        }
        
        // === ОБРАБОТКА ВЫХОДА ИЗ ТАВЕРНЫ ===
        if (hex.type === 'exit') {
            console.log("🚪 Клик по выходу из таверны");
            
            const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
            const isReachable = neighbors.some(neighbor => 
                neighbor.row === hex.row && neighbor.col === hex.col
            );
            
            if (isReachable) {
                console.log("✅ Выход достижим, выходим из таверны...");
                this.exitToPreviousMap();
            } else {
                console.log("❌ Выход недостижим");
                this.showNotification("❌ Подойдите ближе к выходу!", 'warning');
            }
            return;
        }
        
        // === ОБЫЧНЫЕ ПРОХОДИМЫЕ КЛЕТКИ (для перемещения) ===
        if (hex.passable !== false) {
            console.log("✅ Клик для перемещения на мирной карте");
            
            const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
            const isReachable = neighbors.some(neighbor => 
                neighbor.row === hex.row && neighbor.col === hex.col
            );
            
            if (isReachable) {
                console.log(`✅ Клетка достижима, начинаем перемещение`);
                this.moveOnTacticalMap(hex.col, hex.row);
            } else {
                console.log(`❌ Клетка недостижима для перемещения`);
                this.showNotification("Чтобы переместиться, нужно подойти вплотную к соседней клетке!", 'warning');
            }
            return;
        }
        
        console.log(`❌ Клетка непроходима или необрабатываемого типа: ${hex.type}`);
        return;
    }
    
    // === ОБЫЧНАЯ ОБРАБОТКА ДЛЯ НЕ-МИРНЫХ КАРТ ===
    
    // Обработка переходов (таверны)
    if (hex.type === 'tavern' && hex.tacticalMap) {
        console.log("🍻 Клик по таверне - проверяем доступность...");
        
        const isAdjacent = this.isPlayerAdjacentToTransition(hex);
        if (!isAdjacent) {
            console.log("❌ Герой не рядом с таверной");
            this.showTransitionWarning(hex);
            return;
        }
        
        console.log("✅ Герой рядом с таверной, активируем переход...");
        this.activateTransition(hex);
        return;
    }
    
    // Обработка воды (отдельно, так как это может быть на любой карте)
    if (hex.type === 'water') {
        console.log("💧 Клик по воде");
        
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        const isReachable = neighbors.some(neighbor => 
            neighbor.row === hex.row && neighbor.col === hex.col
        );
        
        if (isReachable) {
            // Проверяем, исследована ли клетка с водой
            if (hex.explored) {
                this.handleWaterCell(hex);
            } else {
                this.showNotification("💧 Сначала исследуйте эту клетку (переночуйте на ней), чтобы использовать воду", 'warning');
            }
        } else {
            this.showNotification("❌ Подойдите ближе к воде!", 'warning');
        }
        return;
    }
    
    // Обработка магазинов (отдельно)
    if (hex.type === 'merchant') {
        console.log("🛒 Клик по магазине");
        
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        const isReachable = neighbors.some(neighbor => 
            neighbor.row === hex.row && neighbor.col === hex.col
        );
        
        if (isReachable) {
            if (hex.explored) {
                this.handleMerchantClick(hex);
            } else {
                this.showNotification("🛒 Сначала исследуйте эту клетку (переночуйте на ней), чтобы торговать", 'warning');
            }
        } else {
            this.showNotification("❌ Подойдите ближе к торговцу!", 'warning');
        }
        return;
    }
    
    // Обработка переходов между картами
    if (this.isTransitionCell(hex)) {
        console.log("🚪 Клик по переходу");
        this.handleTransitionClick(hex);
        return;
    }
    
    // Обычная логика для перемещений и действий
    if (hex.passable !== false || hex.type === 'monster') {
        console.log("🎯 Клик для перемещения или действий");
        
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        const isReachable = neighbors.some(neighbor => 
            neighbor.row === hex.row && neighbor.col === hex.col
        );
        
        if (isReachable) {
            console.log(`✅ Клетка достижима, начинаем перемещение или действия`);
            
            // Если клетка исследована - мирное перемещение
            if (hex.explored) {
                this.moveOnTacticalMap(hex.col, hex.row);
            } else {
                // Если не исследована - проверяем можно ли перейти
                if (this.canMoveToHex(hex)) {
                    this.moveOnTacticalMap(hex.col, hex.row);
                } else {
                    // Предлагаем исследовать текущую клетку
                    this.suggestResearchCurrentHex(hex);
                }
            }
        } else {
            console.log(`❌ Клетка недостижима для перемещения`);
            this.showNotification("Чтобы переместиться, нужно подойти вплотную к соседней клетке!", 'warning');
        }
    } else {
        console.log(`❌ Клетка непроходима: ${hex.type}`);
        this.showNotification(`Эта клетка непроходима (${this.getCellTypeName(hex.type)})`, 'error');
    }
    
    // Обновляем интерфейс действий (если это не переход)
    if (!this.isTransitionCell(hex)) {
        console.log(`📋 Вызываем updateCellActionsUI для клетки [${hex.col}, ${hex.row}]`);
        if (this.actionSystem) {
            this.actionSystem.updateCellActionsUI(hex);
            this.actionSystem.highlightSelectedCell(hex);
        }
    } else {
        console.log(`⏭️ Пропускаем показ действий для перехода`);
    }
}


    
canMoveToHex(targetCell) {
    if (!targetCell) return false;
    
    // На мирных картах всегда можно перемещаться
    if (this.isPeacefulMap()) {
        return true;
    }
    
    // Если гекс уже исследован - можно переходить
    if (targetCell.explored) {
        return true;
    }
    
    // Если не исследован - нужно сначала исследовать текущий
    const currentCellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
    const currentCell = this.currentTacticalMap?.cells[currentCellKey];
    
    if (!currentCell) return false;
    
    if (!currentCell.explored) {
        // Текущий гекс не исследован - нельзя переходить на новый
        this.showNotification(
            "❌ Сначала исследуйте текущий гекс (переночуйте на нём)!",
            'warning'
        );
        return false;
    }
    
    return true;
}

/**
 * Предлагает исследовать текущую клетку перед переходом на новую
 */
suggestResearchCurrentHex(targetHex) {
    if (!this.currentHero) return;
    
    const currentCellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
    const currentCell = this.currentTacticalMap?.cells[currentCellKey];
    
    if (!currentCell) return;
    
    if (window.game) {
        const confirmResearch = window.confirm(
            `Чтобы перейти на новую клетку [${targetHex.col},${targetHex.row}], ` +
            `нужно сначала исследовать текущую клетку [${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}].\n\n` +
            `Исследование требует ночёвки на текущей клетке.\n` +
            `Исследовать текущую клетку сейчас?`
        );
        
        if (confirmResearch) {
            this.researchCurrentHex();
        }
    }
}

// ДОБАВИТЬ в класс MapSystem этот новый метод:
highlightUnreachableHex(hex) {
    if (!hex) return;
    
    // Сохраняем оригинальное состояние
    const originalSelected = hex.isSelected;
    const originalHighlight = hex.isHighlighted;
    const originalColor = hex.highlightColor;
    
    // Подсвечиваем красным
    hex.isSelected = true;
    hex.isHighlighted = true;
    hex.highlightColor = '#ff4444';
    
    // Перерисовываем карту
    this.drawTacticalMap();
    
    // Через 1.5 секунды убираем подсветку
    setTimeout(() => {
        hex.isSelected = originalSelected;
        hex.isHighlighted = originalHighlight;
        hex.highlightColor = originalColor;
        this.drawTacticalMap();
    }, 1500);
}

getDirectionToHex(targetHex) {
    if (!this.playerTacticalPosition || !targetHex) return "";
    
    const dx = targetHex.col - this.playerTacticalPosition.x;
    const dy = targetHex.row - this.playerTacticalPosition.y;
    
    if (dx === 0 && dy === 0) return "здесь же";
    
    let direction = "";
    
    if (dy < 0) direction += "северо-";
    if (dy > 0) direction += "юго-";
    if (dx > 0) direction += "восточнее";
    if (dx < 0) direction += "западнее";
    
    // Убираем лишние дефисы
    direction = direction.replace(/-восточнее$/, "-восток").replace(/-западнее$/, "-запад");
    
    // Упрощаем для близких направлений
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
        if (dx === 1 && dy === 0) return "восточнее";
        if (dx === -1 && dy === 0) return "западнее";
        if (dx === 0 && dy === -1) return "севернее";
        if (dx === 0 && dy === 1) return "южнее";
        if (dx === 1 && dy === -1) return "северо-восточнее";
        if (dx === -1 && dy === -1) return "северо-западнее";
        if (dx === 1 && dy === 1) return "юго-восточнее";
        if (dx === -1 && dy === 1) return "юго-западнее";
    }
    
    // Определяем расстояние
    const distance = Math.sqrt(dx*dx + dy*dy);
    let distanceText = "";
    
    if (distance <= 2) distanceText = "близко";
    else if (distance <= 4) distanceText = "недалеко";
    else if (distance <= 6) distanceText = "довольно далеко";
    else distanceText = "далеко";
    
    return `${direction} (${distanceText})`;
}

/**
 * Центрировать карту на указанной клетке
 */
centerMapOnHex(hex) {
    if (!this.canvas || !hex) return;
    
    const centerX = hex.x || hex.originalX || 0;
    const centerY = hex.y || hex.originalY || 0;
    
    if (!centerX || !centerY) return;
    
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    // Рассчитываем смещение для центрирования
    const targetOffsetX = (canvasWidth / 2) - centerX;
    const targetOffsetY = (canvasHeight / 2) - centerY;
    
    // Плавная анимация центрирования
    const animateCenter = () => {
        const dx = targetOffsetX - this.mapOffset.x;
        const dy = targetOffsetY - this.mapOffset.y;
        
        // Если уже близко, останавливаем анимацию
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            this.mapOffset.x = targetOffsetX;
            this.mapOffset.y = targetOffsetY;
            this.drawTacticalMap();
            return;
        }
        
        // Плавное движение
        this.mapOffset.x += dx * 0.2;
        this.mapOffset.y += dy * 0.2;
        this.drawTacticalMap();
        
        requestAnimationFrame(animateCenter);
    };
    
    animateCenter();
}

/**
 * Подсветить недоступную клетку
 */
highlightUnreachableHex(hex) {
    if (!hex) return;
    
    // Сохраняем оригинальный цвет
    const originalHighlight = hex.isHighlighted;
    const originalHighlightColor = hex.highlightColor;
    
    // Устанавливаем красную подсветку
    hex.isHighlighted = true;
    hex.highlightColor = '#ff4444';
    
    // Перерисовываем карту
    this.drawTacticalMap();
    
    // Через 1.5 секунды убираем подсветку
    setTimeout(() => {
        hex.isHighlighted = originalHighlight;
        hex.highlightColor = originalHighlightColor;
        this.drawTacticalMap();
    }, 1500);
}

/**
 * Предложить исследовать текущую клетку
 */
suggestResearchCurrentHex(targetHex) {
    if (!this.currentHero) return;
    
    const currentCellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
    const currentCell = this.currentTacticalMap?.cells[currentCellKey];
    
    if (!currentCell) return;
    
    if (window.game) {
        const confirmResearch = window.confirm(
            `Чтобы перейти на новую клетку [${targetHex.col},${targetHex.row}], ` +
            `нужно сначала исследовать текущую клетку [${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}].\n\n` +
            `Исследование требует ночёвки на текущей клетке.\n` +
            `Исследовать текущую клетку сейчас?`
        );
        
        if (confirmResearch) {
            this.researchCurrentHex();
        }
    }
}

/**
 * Получить читаемое название типа клетки
 */
getCellTypeName(cellType) {
    const names = {
        'merchant': '🛒 Торговец',
        'water': '💧 Вода',
        'tavern': '🍻 Таверна',
        'campfire': '🔥 Кострище',
        'npc': '🧙 Персонаж',
        'monster': '👹 Монстр',
        'chest': '📦 Сундук',
        'exit': '🚪 Выход',
        'obstacle': '🪨 Препятствие',
        'tree': '🌲 Дерево',
        'village': '🏘️ Деревня',
        'castle': '🏰 Замок',
        'portal': '🌀 Портал',
        'player_start': '⭐ Старт',
        'inactive': '🔴 Неактивно'
    };
    
    return names[cellType] || cellType;
}

/**
 * Показать уведомление
 */
showNotification(message, type = 'info') {
    if (window.game && window.game.showNotification) {
        window.game.showNotification(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
        // Создаем простую нотификацию
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            border-radius: 6px;
            z-index: 9999;
            font-family: Arial, sans-serif;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}
    getHexAtLogicalPosition(x, y) {
        console.log(`🔍 Поиск клетки по координатам: [${x}, ${y}]`);
        
        let closestHex = null;
        let minDistance = Infinity;

        const cells = Object.values(this.currentTacticalMap.cells);
        console.log(`🔍 Всего клеток в карте: ${cells.length}`);

        for (const cell of cells) {
            const cellX = cell.x || cell.originalX || 0;
            const cellY = cell.y || cell.originalY || 0;
            
            const distance = Math.sqrt(
                Math.pow(x - cellX, 2) + 
                Math.pow(y - cellY, 2)
            );
            
            console.log(`  Клетка [${cell.col},${cell.row}]: x=${cellX}, y=${cellY}, distance=${distance}`);
            
            if (distance <= 40 && distance < minDistance) {
                minDistance = distance;
                closestHex = cell;
            }
        }
        
        console.log(`🔍 Найдена клетка:`, closestHex ? 
            `[${closestHex.col},${closestHex.row}] тип: ${closestHex.type}` : 'нет');
        
        return closestHex;
    }

    isTransitionCell(cell) {
        return cell.tacticalMap || cell.localMap || cell.globalMap || cell.type === 'exit';
    }

    async handleTransitionClick(transitionCell) {
        if (!this.isPlayerAdjacentToTransition(transitionCell)) {
            this.showTransitionWarning(transitionCell);
            return;
        }
        
        await this.activateTransition(transitionCell);
    }

 isPlayerAdjacentToTransition(transitionCell) {
    const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
    
    return neighbors.some(neighbor => 
        neighbor.row === transitionCell.row && 
        neighbor.col === transitionCell.col
    );
}

    getLocationNameFromPath(filePath) {
        if (!filePath) return null;
        const filename = filePath.split('/').pop().replace('.json', '').replace(/_/g, ' ');
        return filename.charAt(0).toUpperCase() + filename.slice(1);
    }

    highlightTransition(transitionCell) {
        if (!transitionCell) return;
        
        const originalColor = transitionCell.highlightColor;
        transitionCell.highlightColor = '#ff4444';
        transitionCell.isHighlighted = true;
        
        this.drawTacticalMap();
        
        setTimeout(() => {
            transitionCell.highlightColor = originalColor;
            transitionCell.isHighlighted = false;
            this.drawTacticalMap();
        }, 1000);
    }

    async activateTransition(transitionCell) {
        console.log(`🚪 АКТИВАЦИЯ ПЕРЕХОДА:`, {
            type: transitionCell.type,
            tacticalMap: transitionCell.tacticalMap,
            localMap: transitionCell.localMap, 
            globalMap: transitionCell.globalMap,
            targetPosition: transitionCell.targetPosition,
            returnX: transitionCell.returnX,
            returnY: transitionCell.returnY
        });

        if (transitionCell.type === 'exit' && !transitionCell.tacticalMap && !transitionCell.localMap && !transitionCell.globalMap) {
            console.log("🚪 Простой выход с карты через exit-гекс");
            this.exitToPreviousMap();
            return;
        }

        this._lastTransitionCell = transitionCell;
        this.saveCurrentMapToStack();
        
        try {
            let newMap = null;
            
            if (transitionCell.tacticalMap) {
                console.log(`🎲 Переход на тактическую карту: ${transitionCell.tacticalMap}`);
                newMap = await this.loadTacticalMapFile(transitionCell.tacticalMap);
                this.currentMapType = 'tactical';
                
                if (transitionCell.targetPosition) {
                    this.playerTacticalPosition = {...transitionCell.targetPosition};
                    console.log(`📍 Игрок установлен на targetPosition:`, this.playerTacticalPosition);
                }
                
            } else if (transitionCell.localMap) {
                console.log(`🌍 Переход на локальную карту: ${transitionCell.localMap}`);
                newMap = await this.loadLocalMapFile(transitionCell.localMap);
                this.currentMapType = 'local';
                
                if (transitionCell.targetPosition) {
                    this.playerTacticalPosition = {...transitionCell.targetPosition};
                    console.log(`📍 Игрок установлен на targetPosition:`, this.playerTacticalPosition);
                } else {
                    this.setPlayerToStartPosition();
                }
                
            } else if (transitionCell.globalMap) {
                console.log(`🗺️ Переход на глобальную карту: ${transitionCell.globalMap}`);
                newMap = await this.loadGlobalMapFile(transitionCell.globalMap);
                this.currentMapType = 'global';
            }
            
            if (newMap) {
                await this.forceMapUpdate(newMap);
            }
            
            this._lastTransitionCell = null;
            
        } catch (error) {
            console.error("❌ Ошибка перехода между картами:", error);
            this._lastTransitionCell = null;
            this.exitToPreviousMap();
        }
    }


moveOnTacticalMap(x, y) {
    console.log("🎯 MapSystem.moveOnTacticalMap вызывается");
    
    if (!this.currentHero) {
        console.error("❌ Герой не выбран!");
        if (window.game) {
            window.game.showNotification("❌ Герой не выбран! Пожалуйста, выберите героя сначала.", 'error');
        }
        return;
    }

    if (!this.currentTacticalMap) {
        console.error("❌ Нет текущей тактической карты");
        return;
    }

    const cellKey = `${x},${y}`;
    const cellData = this.currentTacticalMap.cells[cellKey];
    
    if (!cellData) {
        console.log("🚫 Клетка не существует");
        if (window.game) {
            window.game.showNotification("Эта клетка не существует!", 'error');
        }
        return;
    }

    // === СПЕЦИАЛЬНАЯ ОБРАБОТКА МИРНЫХ КАРТ (ТАВЕРН) ===
    if (this.isPeacefulMap()) {
        console.log("🍻 Мирная карта (таверна) - свободное перемещение");
        
        // Проверяем достижимость
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

        // На мирных картах время не тратится и нет исследования
        const oldPosition = {...this.playerTacticalPosition};
        this.playerTacticalPosition = {x: x, y: y};
        
        console.log(`🍻 Свободное перемещение в таверне: [${oldPosition.x}, ${oldPosition.y}] → [${x}, ${y}]`);
        
        // Обновляем видимость
        this.updateVisibilityOnMove(x, y);
        
        if (window.game) {
            window.game.showNotification(`✅ Перемещение на [${x}, ${y}]`, 'success');
        }
        
        // Обновляем интерфейс
        if (this.activeOverlay === 'tactical-map' || this.activeOverlay === 'local-map') {
            this.calculateCSSScale();
            this.drawTacticalMap();
            
            setTimeout(() => {
                if (this.actionSystem) {
                    this.actionSystem.updateCellActionsUI(cellData);
                    this.actionSystem.highlightSelectedCell(cellData);
                }
            }, 300);
        }
        
        return;
    }

    // === ОБЫЧНАЯ ОБРАБОТКА ДЛЯ НЕ-МИРНЫХ КАРТ ===
    // === ПРОВЕРКА НА ИССЛЕДОВАННЫЕ КЛЕТКИ ===
    if (cellData.explored) {
        console.log(`✅ Клетка [${x},${y}] уже исследована, перемещение без боя`);
        this.handlePeacefulMovement(x, y, cellData);
        return;
    } else {
        // Если клетка не исследована - проверяем, можно ли на неё перейти
        if (!this.canMoveToHex(cellData)) {
            console.log(`❌ Нельзя перейти на неисследованный гекс [${x},${y}]`);
            
            // Предлагаем исследовать текущий гекс
            const currentCellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
            const currentCell = this.currentTacticalMap?.cells[currentCellKey];
            
            if (currentCell && !currentCell.explored) {
                if (window.game) {
                    const researchNow = window.confirm(
                        `Чтобы перейти на новый гекс [${x},${y}], нужно сначала исследовать текущий.\n\n` +
                        `Исследование требует ночёвки на текущем гексе.\n` +
                        `Исследовать текущий гекс сейчас?`
                    );
                    
                    if (researchNow) {
                        this.researchCurrentHex();
                    }
                }
            }
            return;
        }
    }

    // === ПРОВЕРКА НА ПЕРЕХОДЫ ===
    if (this.isTransitionCell(cellData)) {
        console.log("🚪 Клик по переходу");
        this.handleTransitionClick(cellData);
        return;
    }

    // === ПРОВЕРКА НА ПРОХОДИМОСТЬ ===
    if (cellData.passable === false) {
        console.log("🚫 Клетка непроходима");
        if (window.game) {
            window.game.showNotification("Эта клетка непроходима!", 'error');
        }
        return;
    }

    // === ПРОВЕРКА НА ДОСТИЖИМОСТЬ ===
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

    // === ПРОВЕРКА НА НОЧЬ ===
    if (this.timeSystem) {
        const timeStatus = this.timeSystem.getTimeStatus();
        
        // Если ночь и цель не исследована
        if (timeStatus.isNight && !cellData.explored) {
            console.log("🌙 Попытка исследования нового гекса ночью");
            
            if (window.game) {
                const confirmExplore = window.confirm(
                    "🌙 Исследовать новый гекс ночью ОЧЕНЬ ОПАСНО!\n\n" +
                    "Без костра: 90% шанс нападения каждый час\n" +
                    "Рекомендуется:\n" +
                    "1. Вернуться в лагерь (кнопка '🏕️ В лагерь')\n" +
                    "2. Переночевать (кнопка '🌙 Переночевать')\n" +
                    "3. Исследовать утром\n\n" +
                    "Всё равно исследовать ночью?"
                );
                
                if (!confirmExplore) {
                    console.log("❌ Игрок отменил ночное исследование");
                    return;
                }
            }
        }
    }

    console.log(`✅ Мирное перемещение на [${x}, ${y}]`);
    this.handlePeacefulMovement(x, y, cellData);
}


// ========== СИСТЕМА ИССЛЕДОВАНИЯ ГЕКСОВ ==========
researchCurrentHex() {
    // Если мы на мирной карте - не нужно исследовать
    if (this.isPeacefulMap()) {
        console.log("🍻 На мирной карте (таверна) исследование не требуется");
        this.showNotification("🍻 В таверне не нужно исследовать клетки!", 'info');
        return false;
    }
    
    console.log(`🔍 MapSystem.researchCurrentHex вызывается для [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]`);
    
    if (!this.currentHero) {
        console.error("❌ Герой не выбран!");
        this.showNotification("❌ Сначала выберите героя!", 'error');
        return false;
    }
    
    // Получаем текущую клетку
    const cellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
    const currentCell = this.currentTacticalMap?.cells[cellKey];
    
    if (!currentCell) {
        console.error("❌ Текущая клетка не найдена!");
        return false;
    }
    
    // Проверяем, исследована ли уже клетка
    if (currentCell.explored) {
        console.log("✅ Клетка уже исследована");
        this.showNotification("Эта клетка уже исследована!", 'info');
        return true;
    }
    
    // Проверяем систему времени
    if (!this.timeSystem) {
        console.error("❌ TimeSystem не доступен");
        return false;
    }
    
    const timeStatus = this.timeSystem.getTimeStatus();
    
    // Если сейчас день, нужно сначала дождаться ночи
    if (timeStatus.isDay) {
        console.log("☀️ Сейчас день, нужно дождаться ночи для исследования");
        
        // Ускоряем время до вечера для исследования
        const hoursUntilNight = 20 - timeStatus.hour; // упрощенный расчет
        
        if (window.game) {
            const confirmResearch = window.confirm(
                `☀️ Сейчас день (${timeStatus.hour}:00).\n` +
                `Исследование гекса возможно только после ночёвки на нём.\n` +
                `Потратить ${hoursUntilNight} часов до вечера и переночевать?\n\n` +
                `⚠️ Внимание: без костра вероятность нападения ночью 90%!`
            );
            
            if (!confirmResearch) {
                console.log("❌ Игрок отменил исследование");
                return false;
            }
        }
        
        // Тратим время до вечера
        for (let i = 0; i < hoursUntilNight; i++) {
            this.timeSystem.spendHourOnHex('wait_for_night');
        }
    }
    
    // Теперь ночь - начинаем ночёвку
    console.log("🌙 Начинаем ночёвку для исследования гекса...");
    
    // Проверяем, есть ли на клетке костёр
    const hasCampfire = this.checkForCampfire(currentCell);
    
    // Рассчитываем вероятность нападения
    const attackProbability = hasCampfire ? 10 : 90; // С костром 10%, без - 90%
    
    console.log(`🏕️ Ночёвка: костёр = ${hasCampfire}, вероятность нападения = ${attackProbability}%`);
    
    // Ночёвка занимает до утра
    const randomValue = Math.random() * 100;
    const willBeAttacked = randomValue <= attackProbability;
    
    if (willBeAttacked) {
        console.log("⚔️ Ночное нападение монстра!");
        // Запускаем ночной бой
        const battleResult = this.startNightBattle();
        
        if (!battleResult || !battleResult.victory) {
            // Герой не пережил ночь
            this.handleHeroDeathAfterFailedNight();
            return false;
        }
    } else {
        console.log("🌙 Спокойная ночь");
        this.showNotification("🌙 Вы спокойно пережили ночь на этом гексе", 'success');
    }
    
    // Переходим к утру
    this.advanceToMorning();
    
    // Отмечаем клетку как исследованную
    currentCell.explored = true;
    
    // Открываем видимость соседних клеток
    this.revealAdjacentCells(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
    
    // Перерисовываем карту
    this.drawTacticalMap();
    
    console.log(`✅ Гекс [${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}] исследован!`);
    
    // Автосохранение
    if (window.game) {
        window.game.saveGame();
    }
    
    return true;
}

startNightBattle() {
    console.log("⚔️ Начинаем ночной бой...");
    
    const battleSystem = window.game?.systems?.battle;
    if (!battleSystem) {
        return {
            victory: false,
            survived: false,
            message: "❌ Система боя не доступна"
        };
    }
    
    // Получаем ночного монстра (более сильного)
    const nightMonster = this.getNightMonster();
    
    // Сохраняем текущую позицию для возврата
    const originalPosition = {...this.playerTacticalPosition};
    
    // Начинаем бой
    battleSystem.startBattleWithSpecificMonster(
        this.currentHero,
        nightMonster,
        'night_research'
    );
    
    // Возвращаем результат боя
    return {
        victory: true, // Временное значение, реальное определится в BattleSystem
        survived: true,
        message: `Ночной бой с ${nightMonster.name}!`
    };
}


getNightMonster() {
    const battleSystem = window.game?.systems?.battle;
    if (!battleSystem) return null;
    
    const allMonsters = battleSystem.monsters || [];
    if (allMonsters.length === 0) return null;
    
    // Ночью появляются более опасные монстры
    const nightMonsters = allMonsters.filter(m => (m.level || 1) >= 2);
    
    if (nightMonsters.length > 0) {
        // Увеличиваем сложность ночных монстров
        const monster = nightMonsters[Math.floor(Math.random() * nightMonsters.length)];
        return {
            ...monster,
            health: Math.floor(monster.health * 1.3), // +30% здоровья
            damage: Math.floor(monster.damage * 1.2)  // +20% урона
        };
    }
    
    // Если нет специальных ночных, берём обычного и усиливаем
    const baseMonster = allMonsters[Math.floor(Math.random() * allMonsters.length)];
    return {
        ...baseMonster,
        health: Math.floor(baseMonster.health * 1.5),
        damage: Math.floor(baseMonster.damage * 1.3)
    };
}


checkForCampfire(cell) {
    if (!cell) return false;
    
    // Проверяем тип клетки
    if (cell.type === 'campfire') {
        return true;
    }
    
    // Проверяем, установлен ли костёр игроком
    if (this.timeSystem?.camp?.exists) {
        const campLocation = this.timeSystem.camp.location;
        if (campLocation && 
            campLocation.x === cell.col && 
            campLocation.y === cell.row) {
            return this.timeSystem.camp.protections.includes('basic_campfire');
        }
    }
    
    return false;
}


advanceToMorning() {
    if (!this.timeSystem) return;
    
    const currentHour = this.timeSystem.gameTime.hour;
    
    // Сколько часов до 7 утра
    let hoursToMorning;
    if (currentHour >= 7) {
        hoursToMorning = (24 - currentHour) + 7;
    } else {
        hoursToMorning = 7 - currentHour;
    }
    
    console.log(`🌅 Переход к утру: ${hoursToMorning} часов`);
    
    // Проходим часы до утра
    for (let i = 0; i < hoursToMorning; i++) {
        this.timeSystem.spendHourOnHex('sleep');
    }
    
    // Восстанавливаем здоровье после сна
    if (this.currentHero) {
        const heroSystem = window.game?.systems?.hero;
        if (heroSystem) {
            const stats = heroSystem.calculateHeroStats(this.currentHero);
            const healAmount = Math.floor(stats.maxHealth * 0.2); // 20% от максимума
            this.currentHero.currentHealth = Math.min(
                stats.maxHealth,
                this.currentHero.currentHealth + healAmount
            );
            
            console.log(`❤️ Восстановлено ${healAmount} здоровья после ночи`);
        }
    }
}


handleHeroDeathAfterFailedNight() {
    if (!this.currentHero) return;
    
    console.log(`💀 Обработка смерти героя ${this.currentHero.name} после неудачной ночи`);
    
    // Возвращаем на стартовую позицию
    const startPosition = this.currentTacticalMap?.startPosition || {x: 0, y: 0};
    this.playerTacticalPosition = {...startPosition};
    
    // Устанавливаем минимальное здоровье
    this.currentHero.currentHealth = 1;
    
    // Увеличиваем счётчик смертей
    this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
    
    // Показываем сообщение
    this.showNotification(
        `💀 ${this.currentHero.name} не пережил ночь! Возвращён на стартовую позицию с 1 HP.`,
        'error'
    );
    
    // Перерисовываем карту
    this.drawTacticalMap();
    
    // Сохраняем игру
    if (window.game) {
        window.game.saveGame();
    }
}


// В КЛАССЕ MapSystem, метод canMoveToHex:
canMoveToHex(targetCell) {
    if (!targetCell) return false;
    
    // На мирных картах всегда можно перемещаться
    if (this.isPeacefulMap()) {
        return true;
    }
    
    // Если гекс уже исследован - можно переходить
    if (targetCell.explored) {
        return true;
    }
    
    // Если не исследован - нужно сначала исследовать текущий
    const currentCellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
    const currentCell = this.currentTacticalMap?.cells[currentCellKey];
    
    if (!currentCell) return false;
    
    if (!currentCell.explored) {
        // Текущий гекс не исследован - нельзя переходить на новый
        this.showNotification(
            "❌ Сначала исследуйте текущий гекс (переночуйте на нём)!",
            'warning'
        );
        return false;
    }
    
    return true;
}
    


updateResearchStatus() {
    const currentCellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
    const currentCell = this.currentTacticalMap?.cells[currentCellKey];
    
    if (!currentCell) return;
    
    const statusElement = document.getElementById('researchStatus');
    if (!statusElement) return;
    
    if (currentCell.explored) {
        statusElement.innerHTML = `
            <div style="color: #00ff00; display: flex; align-items: center; gap: 5px;">
                ✅ Исследован
            </div>
        `;
    } else {
        const hasCampfire = this.checkForCampfire(currentCell);
        const safety = hasCampfire ? "относительно безопасно" : "очень опасно";
        const safetyColor = hasCampfire ? "#f59e0b" : "#ef4444";
        
        statusElement.innerHTML = `
            <div style="color: ${safetyColor}; display: flex; align-items: center; gap: 5px;">
                ❓ Не исследован
                <small style="color: #94a3b8;">(Ночёвка ${safety})</small>
            </div>
        `;
    }
}



isPeacefulMap() {
    if (!this.currentTacticalMap || !this.currentTacticalMap.jsonData) {
        return false;
    }
    
    // Проверяем тип карты из JSON данных
    const mapType = this.currentTacticalMap.jsonData.meta?.mapType;
    return mapType === 'peaceful';
}


shouldResearchCell(cell) {
    if (this.isPeacefulMap()) {
        return false; // На мирных картах не нужно исследовать клетки
    }
    return !cell.explored; // На обычных картах исследовать неисследованные клетки
}
    
    

handlePeacefulMovement(targetX, targetY, cellData) {
    console.log(`🌿 Мирное перемещение на [${targetX}, ${targetY}]`);
    
    // === ПРОВЕРКА НА НОЧЬ ===
    if (this.timeSystem) {
        const timeStatus = this.timeSystem.getTimeStatus();
        
        // Если ночь и не в лагере - предупреждение
        if (timeStatus.isNight && !this.timeSystem.isInCamp()) {
            console.log("🌙 Попытка перемещения ночью вне лагеря");
            
            // Показываем предупреждение, но разрешаем перемещение
            if (window.game) {
                const confirmMove = window.confirm(
                    "🌙 ОПАСНО! Ночью перемещаться очень рискованно.\n" +
                    "Без костра вероятность нападения 90% каждый час.\n" +
                    "Продолжить перемещение?"
                );
                
                if (!confirmMove) {
                    console.log("❌ Игрок отменил перемещение ночью");
                    return;
                }
            }
        }
        
        // Тратим 1 час на перемещение
        this.timeSystem.spendHourOnHex('movement');
    }
    
    const oldPosition = {...this.playerTacticalPosition};
    this.playerTacticalPosition = {x: targetX, y: targetY};
    
    // Обновляем видимость
    this.updateVisibilityOnMove(targetX, targetY);
    
    console.log(`✅ Перемещение героя ${this.currentHero?.name || 'неизвестно'} с [${oldPosition.x}, ${oldPosition.y}] на: [${targetX}, ${targetY}]`);
    
    this.syncHeroWithOtherSystems();
    
    if (this.activeOverlay === 'tactical-map' || this.activeOverlay === 'local-map') {
        this.calculateCSSScale();
        this.drawTacticalMap();
        
        setTimeout(() => {
            const cellKey = `${targetX},${targetY}`;
            const currentCell = this.currentTacticalMap?.cells[cellKey];
            
            if (currentCell && this.actionSystem) {
                console.log(`🎯 Показываем доступные действия для новой клетки [${targetX}, ${targetY}]`);
                this.actionSystem.updateCellActionsUI(currentCell);
                this.actionSystem.highlightSelectedCell(currentCell);
            }
            
            if (window.game) {
                window.game.showNotification(`✅ Перемещение на [${targetX}, ${targetY}]`, 'success');
            }
        }, 300);
    }
    
    this.updateMovementInfo();
}

    collectLoot(cellData, col, row) {
        const lootLevel = this.currentTacticalMap?.jsonData?.meta?.lootLevel || 1;
        
        console.log(`🎲 Генерация лута уровня ${lootLevel} для клетке [${col},${row}]`);
        
        const reward = this.generateRandomReward(lootLevel);
        
        this.processRewardWithMovement(reward, col, row, cellData);
    }

    generateRandomReward(lootLevel) {
        const lootTable = this.lootTables[lootLevel] || this.lootTables[1];
        
        const rewardType = this.selectRewardType(lootTable);
        const rewardData = lootTable[rewardType];
        
        console.log(`🎯 Выбран тип награды: ${rewardType} для уровня ${lootLevel}`);
        
        switch(rewardType) {
            case 'gold':
                const amount = Math.floor(Math.random() * (rewardData.max - rewardData.min + 1)) + rewardData.min;
                return {
                    type: 'gold',
                    amount: amount,
                    message: `Вы нашли ${amount} золотых монет!`
                };
                
            case 'common_items':
            case 'rare_items':
            case 'epic_items':
            case 'legendary_items':
                const items = rewardData.items;
                const randomItem = items[Math.floor(Math.random() * items.length)];
                return {
                    type: 'item',
                    itemId: randomItem,
                    message: `Вы нашли: ${this.getItemName(randomItem)}!`
                };
                
            case 'information':
                const messages = rewardData.messages;
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                return {
                    type: 'information',
                    message: randomMessage
                };
                
            default:
                return {
                    type: 'gold',
                    amount: 10,
                    message: 'Вы нашли 10 золотых монет!'
                };
        }
    }

    selectRewardType(lootTable) {
        const types = Object.keys(lootTable);
        const weights = types.map(type => lootTable[type].weight);
        
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < types.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return types[i];
            }
        }
        
        return types[0];
    }

    processRewardWithMovement(reward, col, row, cellData) {
        let showNotification = true;
        let completed = false;
        
        try {
            switch(reward.type) {
                case 'gold':
                    this.currentHero.gold += reward.amount;
                    console.log(`💰 Добавлено золото: ${reward.amount}`);
                    completed = true;
                    break;
                    
                case 'item':
                    const itemSystem = window.game?.systems?.equipment;
                    if (itemSystem && itemSystem.addItemToHero) {
                        const lootItem = this.getLootItemById(reward.itemId);
                        if (!lootItem) {
                            console.warn(`⚠️ Предмет лута не найден: ${reward.itemId}`);
                            reward.message = `Найдено что-то странное... (${reward.itemId})`;
                        } else {
                            const itemAdded = itemSystem.addItemToHero(this.currentHero, reward.itemId);
                            if (!itemAdded) {
                                reward.message = "Инвентарь полен! Награда потеряна.";
                            } else {
                                reward.message = `Вы нашли: ${lootItem.name}!`;
                            }
                        }
                        completed = true;
                    }
                    break;
                    
                case 'information':
                    if (this.isImportantInformation(reward.message)) {
                        this.showInformationDialog(reward.message);
                        showNotification = false;
                        this.delayedMovementAfterDialog(col, row, reward.message);
                        return;
                    }
                    completed = true;
                    break;
            }
            
            if (completed) {
                this.syncHeroWithOtherSystems();
                
                if (showNotification && window.game) {
                    window.game.showNotification(reward.message, 'success');
                }
                
                console.log(`🎁 Награда обработана:`, reward);
            }
            
        } catch (error) {
            console.error("❌ Ошибка обработки награды:", error);
            if (window.game) {
                window.game.showNotification("Ошибка при получении награды", 'error');
            }
        }
    }

    delayedMovementAfterDialog(col, row, message) {
        setTimeout(() => {
            console.log(`💡 Перемещение после диалога: ${message}`);
        }, 100);
    }

    getItemName(itemId) {
        const lootItem = this.getLootItemById(itemId);
        return lootItem ? lootItem.name : itemId;
    }

    isImportantInformation(message) {
        const importantKeywords = ['артефакт', 'сокровищ', 'координат', 'секрет', 'тайн', 'легендарн'];
        return importantKeywords.some(keyword => message.toLowerCase().includes(keyword));
    }

    showInformationDialog(message) {
        if (window.game && window.game.showDialog) {
            window.game.showDialog({
                title: "Важная информация",
                message: message,
                type: "information"
            });
        } else {
            this.showNotification("💡 " + message, 'info');
        }
    }

startTacticalBattleForMovement(x, y, cellData) {
    const battleSystem = window.game?.systems?.battle;
    if (!battleSystem) {
        console.error("❌ BattleSystem не доступна");
        return;
    }

    if (!this.currentHero) {
        console.error("❌ Не могу начать бой: герой не выбран");
        return;
    }

    this.pendingMovement = { x: x, y: y };
    
    const specificMonster = this.getMonsterFromCell(cellData);
    
    console.log("🎲 Начинаем бой поверх тактической карты...");
    
    if (specificMonster && cellData.monster_id) {
        console.log(`🎯 Бой с ЗАПРОГРАММИРОВАННЫМ монстром: ${specificMonster.name}`);
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
        
        console.log(`🎲 Бой со СЛУЧАЙНЫМ монстром: ${randomMonster.name}`);
        
        // Проверяем, не была ли это охота
        if (this.pendingAction && this.pendingAction.action === 'hunt') {
            // Для охоты используем специальный тип боя
            battleSystem.startBattleWithMonster(this.currentHero, randomMonster.id, 'hunt');
        } else {
            battleSystem.startBattleWithMonster(this.currentHero, randomMonster.id, 'movement');
        }
    }
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

    updateHeroInterface() {
        if (window.game?.systems?.hero) {
            this.syncHeroWithOtherSystems();
            
            setTimeout(() => {
                if (window.game.systems.hero.currentHero) {
                    window.game.systems.hero.updateHeroDisplay();
                } else {
                    console.warn("⚠️ Не удалось обновить интерфейс: герой не установлен в HeroSystem");
                }
            }, 10);
        } else {
            console.warn("⚠️ HeroSystem не доступен для обновления интерфейс");
        }
    }

    debugMovementInfo(x, y, cellData) {
        const hasLoot = cellData.hasLoot;
        
        console.group(`🎯 ДЕБАГ ПЕРЕМЕЩЕНИЯ на [${x}, ${y}]`);
        console.log('Тип клетки:', cellData.type);
        console.log('Проходимость:', cellData.passable);
        console.log('Есть лут:', hasLoot);
        console.log('Тип карты:', this.currentTacticalMap.jsonData?.meta?.mapType || 'combat');
        console.log('Текущая позиция:', this.playerTacticalPosition);
        
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        console.log('Доступные соседи:', neighbors.map(n => `[${n.col},${n.row}]`));
        
        const isReachable = neighbors.some(neighbor => 
            neighbor.row === y && neighbor.col === x
        );
        console.log('Достижима:', isReachable);
        console.groupEnd();
        
        return isReachable;
    }

    // ========== CANVAS И ОТРИСОВКА ==========

    initCanvas() {
        const container = document.querySelector('.tactical-map-visual');
        if (!container) {
            console.log("❌ Контейнер для карты не найден");
            return;
        }

        container.innerHTML = '';

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'tacticalMapCanvas';
        
        this.canvas.width = 1024;
        this.canvas.height = 1024;
        
        this.canvas.style.width = '1024px';
        this.canvas.style.height = '1024px';
        this.canvas.style.position = 'relative';
        this.canvas.style.background = '#1a1a2e';
        this.canvas.style.border = '2px solid #00ffff';
        this.canvas.style.cursor = 'pointer';
        container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        
        this.zoomLevel = 1.0;
        this.mapOffset = { x: 0, y: 0 };
        
        this.calculateCSSScale();
        this.setupCanvasEventListeners();
        
        this.canvasInitialized = true;
        console.log("✅ Canvas инициализирован с CSS масштабированием");
        this.drawTacticalMap();
    }

    calculateCSSScale() {
        const container = document.querySelector('.tactical-map-visual');
        if (!container || !this.canvas) return;

        const rect = container.getBoundingClientRect();
        
        const scaleX = rect.width / 1024;
        const scaleY = rect.height / 1024;
        
        const scale = Math.min(scaleX, scaleY) * 0.85;
        
        console.log(`📏 CSS Scale: ${scale.toFixed(3)} (container: ${rect.width}x${rect.height})`);
        
        this.canvas.style.transform = `scale(${scale})`;
        this.canvas.style.transformOrigin = 'center center';
        
        this.zoomLevel = scale;
    }
    
    setupCanvasEventListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
        this.canvas.addEventListener('mouseleave', () => this.hideTooltip());

        window.addEventListener('resize', () => {
            setTimeout(() => {
                if (this.canvasInitialized) {
                    this.handleResize();
                }
            }, 100);
        });
    }

    zoomIn() {
        if (this.zoomLevel < this.maxZoom) {
            this.zoomLevel += this.zoomStep;
            this.applyZoom();
        }
    }

    zoomOut() {
        if (this.zoomLevel > this.minZoom) {
            this.zoomLevel -= this.zoomStep;
            this.applyZoom();
        }
    }

    resetZoom() {
        this.zoomLevel = 1.0;
        this.applyZoom();
    }

    applyZoom() {
        if (!this.currentTacticalMap || !this.canvasInitialized) return;
        
        const zoomElement = document.getElementById('currentZoom');
        if (zoomElement) {
            zoomElement.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
        
        this.canvas.style.transform = `scale(${this.zoomLevel})`;
        this.drawTacticalMap();
        
        console.log(`🔍 Масштаб изменен: ${Math.round(this.zoomLevel * 100)}%`);
    }

 // В КЛАССЕ MapSystem, метод drawTacticalMap:
drawTacticalMap() {
    if (!this.ctx || !this.currentTacticalMap) {
        console.log("❌ Canvas context или карта не доступна");
        return;
    }

    const canvas = this.canvas;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawBackground();
    
    // Добавляем индикатор для мирных карт
    if (this.isPeacefulMap()) {
        console.log("🎯 Отрисовываем мирную карту с индикатором");
        this.drawPeacefulMapIndicator();
    }
    
    console.log("✅ Тактическая карта отрисована");
}

drawBackground() {
    const map = this.currentTacticalMap;
    
    if (!map.image) {
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawHexes();
        if (this.showGrid) {
            this.drawHexGrid();
        }
        return;
    }

    const img = new Image();
    img.onload = () => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Сначала рисуем фон карты ПОЛНОСТЬЮ
        this.ctx.drawImage(
            img, 
            0, 
            0, 
            this.canvas.width, 
            this.canvas.height
        );
        
        // Затем рисуем гексы (они будут накладывать туман)
        this.drawHexes();
        
        // Сетку рисуем поверх всего
        if (this.showGrid) {
            this.drawHexGrid();
        }
        
        console.log("✅ Фон отрисован с учётом тумана войны");
    };
    
    img.onerror = () => {
        console.error("❌ Ошибка загрузки фона карты");
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawHexes();
        if (this.showGrid) {
            this.drawHexGrid();
        }
    };
    
    img.src = map.image;
}

    handleResize() {
        if (!this.canvasInitialized) return;
        
        console.log("🔄 Адаптация к изменению размеров окна");
        
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this.calculateCSSScale();
            this.drawTacticalMap();
            this.updateMovementInfo();
        }, 100);
    }

    drawHexGrid() {
        const cells = Object.values(this.currentTacticalMap.cells);
        const hexSize = this.currentTacticalMap.cellSize || 40;
        
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.6)';
        this.ctx.lineWidth = 1;
        
        cells.forEach(cell => {
            if (cell.visible) {
                const centerX = cell.x || cell.originalX || 0;
                const centerY = cell.y || cell.originalY || 0;
                
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
    if (!this.currentTacticalMap || !this.currentTacticalMap.cells) {
        return;
    }
    
    // Сначала обновляем видимость всех клеток
    this.updateAllCellsVisibility();
    
    const cells = Object.values(this.currentTacticalMap.cells);
    
    // Сортируем клетки: сначала те, что должны быть наверху (высокая видимость)
    const sortedCells = [...cells].sort((a, b) => {
        const visibilityA = a.visibilityLevel || this.visibilityLevels.HIDDEN;
        const visibilityB = b.visibilityLevel || this.visibilityLevels.HIDDEN;
        // Теперь высокой видимости рисуем ПОСЛЕ (чтобы они были сверху)
        return visibilityA - visibilityB;
    });
    
    // Рисуем все клетки
    sortedCells.forEach(cell => {
        // Если клетка полностью невидима (OBSCURED) - не рисуем её
        if (cell.visibilityLevel > this.visibilityLevels.OBSCURED) {
            this.drawSingleHexWithVisibility(cell);
        }
    });
}

drawPeacefulMapIndicator() {
    if (!this.isPeacefulMap() || !this.canvas || !this.ctx) {
        console.log("❌ Не могу нарисовать индикатор мирной карты");
        return;
    }
    
    console.log("🎨 Рисуем индикатор мирной карты");
    
    this.ctx.save();
    
    try {
        // Рисуем индикатор в верхнем правом углу
        const indicatorText = "🍻 Мирная карта";
        this.ctx.font = "bold 16px Arial";
        
        // Измеряем ширину текста
        const textMetrics = this.ctx.measureText(indicatorText);
        const textWidth = textMetrics.width;
        
        // Позиция индикатора
        const x = this.canvas.width - textWidth - 30;
        const y = 35;
        
        // Рисуем фон с закругленными углами
        this.ctx.beginPath();
        
        // Полифил для roundRect ВНУТРИ метода
        if (!CanvasRenderingContext2D.prototype.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
                if (width < 2 * radius) radius = width / 2;
                if (height < 2 * radius) radius = height / 2;
                this.beginPath();
                this.moveTo(x + radius, y);
                this.arcTo(x + width, y, x + width, y + height, radius);
                this.arcTo(x + width, y + height, x, y + height, radius);
                this.arcTo(x, y + height, x, y, radius);
                this.arcTo(x, y, x + width, y, radius);
                this.closePath();
                return this;
            };
        }
        
        this.ctx.roundRect(x - 15, y - 25, textWidth + 30, 40, 10);
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        this.ctx.fill();
        
        // Обводка
        this.ctx.strokeStyle = "#00aaff";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Текст
        this.ctx.fillStyle = "#00aaff";
        this.ctx.fillText(indicatorText, x, y);
        
        // Добавляем иконку
        this.ctx.font = "20px Arial";
        this.ctx.fillText("🍻", x - 25, y);
        
    } catch (error) {
        console.error("❌ Ошибка при рисовании индикатора мирной карты:", error);
    } finally {
        this.ctx.restore();
    }
} 

    

 drawSingleHex(cell) {
    // Старый метод для совместимости, теперь используем drawSingleHexWithVisibility
    this.drawSingleHexWithVisibility(cell);
}



 drawSingleHexWithVisibility(cell) {
    const hexSize = this.currentTacticalMap.cellSize || 40;
    const centerX = cell.x || cell.originalX || 0;
    const centerY = cell.y || cell.originalY || 0;

    if (!centerX || !centerY) return;
    
    const visibilityLevel = cell.visibilityLevel || this.visibilityLevels.HIDDEN;
    const fogColor = cell.visibilityColor || this.fogColors.HIDDEN;
    
    this.ctx.save();
    
    // ТОЛЬКО если клетка не исследована и не полностью видима - рисуем туман
    if (visibilityLevel < this.visibilityLevels.EXPLORED) {
        // Рисуем гекс с туманом
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = centerX + hexSize * Math.cos(angle);
            const y = centerY + hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        
        // Заливаем туманом
        this.ctx.fillStyle = fogColor;
        this.ctx.fill();
        
        // Если туман тёмный, можно добавить лёгкий градиент для объёма
        if (visibilityLevel === this.visibilityLevels.HIDDEN) {
            const gradient = this.ctx.createRadialGradient(
                centerX, centerY, 0,
                centerX, centerY, hexSize * 0.8
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
            
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i + Math.PI / 6;
                const x = centerX + hexSize * 0.8 * Math.cos(angle);
                const y = centerY + hexSize * 0.8 * Math.sin(angle);
                
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            this.ctx.fillStyle = gradient;
            this.ctx.fill();
        }
    }
    
    // Рисуем контур сетки (если включена)
    if (this.showGrid && visibilityLevel >= this.visibilityLevels.VISIBLE) {
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = centerX + hexSize * Math.cos(angle);
            const y = centerY + hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        
        // Цвет сетки зависит от видимости
        let gridAlpha = 0.3;
        if (visibilityLevel === this.visibilityLevels.ADJACENT) gridAlpha = 0.2;
        if (visibilityLevel === this.visibilityLevels.VISIBLE) gridAlpha = 0.1;
        
        this.ctx.strokeStyle = `rgba(76, 201, 240, ${gridAlpha})`;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }
    
    // Рисуем контент гекса (если достаточно видим)
    if (visibilityLevel >= this.visibilityLevels.VISIBLE) {
        this.drawHexContentWithVisibility(cell);
    }
    
    this.ctx.restore();
}

    

  drawHexContent(cell) {
    // Старый метод для совместимости, теперь используем drawHexContentWithVisibility
    this.drawHexContentWithVisibility(cell);
}

drawHexContentWithVisibility(cell) {
    const centerX = cell.x || cell.originalX || 0;
    const centerY = cell.y || cell.originalY || 0;
    
    if (!centerX || !centerY) return;

    const visibilityLevel = cell.visibilityLevel || this.visibilityLevels.HIDDEN;
    const hexSize = this.currentTacticalMap.cellSize || 40;
    
    this.ctx.save();
    
    // Подсветка выбранной клетки (только если достаточно видима)
    if (cell.isSelected && visibilityLevel >= this.visibilityLevels.VISIBLE) {
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = centerX + hexSize * Math.cos(angle);
            const y = centerY + hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        
        this.ctx.strokeStyle = '#00ffff';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        this.ctx.shadowColor = '#00ffff';
        this.ctx.shadowBlur = 15;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }
    
    // Подсветка при наведении (только если достаточно видима)
    if (cell.isHighlighted && visibilityLevel >= this.visibilityLevels.VISIBLE) {
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = centerX + hexSize * Math.cos(angle);
            const y = centerY + hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        
        if (this.isTransitionCell(cell)) {
            this.ctx.fillStyle = cell.highlightColor || 'rgba(255, 215, 0, 0.3)';
        } else {
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
        }
        this.ctx.fill();
    }
    
    // Определяем символ и цвет в зависимости от типа клетки
    let symbol = this.getCellSymbol(cell);
    let color = this.getCellColor(cell);
    let fontSize = this.getCellFontSize(cell);
    
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Устанавливаем прозрачность в зависимости от уровня видимости
    let alpha = 1.0;
    if (visibilityLevel === this.visibilityLevels.ADJACENT) {
        alpha = 0.7; // Соседние клетки - почти полностью видимые символы
    } else if (visibilityLevel === this.visibilityLevels.VISIBLE) {
        alpha = 0.4; // Дальние клетки - полупрозрачные символы
    } else if (visibilityLevel === this.visibilityLevels.HIDDEN) {
        alpha = 0.1; // Едва видимые клетки - почти прозрачные символы
    }
    
    // Рисуем символ клетки
    if (alpha > 0) {
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.fillStyle = this.hexToRGBA(color, alpha);
        this.ctx.fillText(symbol, centerX, centerY);
    }
    
    // Галочка исследованной клетки (если исследована и достаточно видима)
    if (cell.explored && visibilityLevel >= this.visibilityLevels.VISIBLE) {
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillStyle = this.hexToRGBA('#00ff00', alpha * 0.8);
        this.ctx.fillText('✓', centerX + hexSize * 0.6, centerY - hexSize * 0.6);
    }
    
    // Если клетка исследована, можно добавить дополнительный эффект
    if (cell.explored && visibilityLevel >= this.visibilityLevels.EXPLORED) {
        // Лёгкое свечение исследованной клетки
        this.ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = centerX + hexSize * Math.cos(angle);
            const y = centerY + hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }
    
    this.ctx.restore();
}

// Вспомогательные методы для получения символа, цвета и размера шрифта
getCellSymbol(cell) {
    if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
        return '🎯';
    }
    
    if (cell.hasLoot) {
        const lootLevel = this.currentTacticalMap?.jsonData?.meta?.lootLevel || 1;
        return this.getLootSymbol(lootLevel);
    }
    
    return this.objectSymbols[cell.type] || '·';
}

getCellColor(cell) {
    if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
        return '#00ffff';
    }
    
    if (cell.hasLoot) {
        const lootLevel = this.currentTacticalMap?.jsonData?.meta?.lootLevel || 1;
        return this.getLootColor(lootLevel);
    }
    
    switch(cell.type) {
        case 'monster':
        case 'orc_camp':
        case 'bandit_camp':
            return '#ef4444';
        case 'chest':
        case 'weapon':
        case 'armor':
        case 'magic_crystal':
            return '#f59e0b';
        case 'npc':
        case 'merchant':
        case 'traveler':
            return '#3b82f6';
        case 'exit':
        case 'portal':
        case 'cave':
        case 'dungeon':
            return '#8b5cf6';
        case 'tavern':
        case 'shop':
        case 'village':
        case 'castle':
        case 'temple':
            return '#fbbf24';
        case 'obstacle':
        case 'tree':
        case 'elegant_tree':
        case 'black_monolith':
        case 'mountain':
            return '#6b7280';
        case 'lava_crack':
        case 'campfire':
            return '#dc2626';
        case 'graveyard_cross':
        case 'ancient_rune':
            return '#d6d3d1';
        case 'water':
        case 'bridge':
            return '#0ea5e9';
        case 'cart':
            return '#78350f';
        case 'inactive':
            return '#ef4444';
        default:
            return '#ffffff';
    }
}

getCellFontSize(cell) {
    if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
        return 20;
    }
    
    if (cell.hasLoot) {
        return 18;
    }
    
    if (cell.type === 'active' && !cell.objectType) {
        return 24;
    }
    
    return Math.max(12, Math.min(20, 16));
}


getSymbolOpacityForVisibility(visibilityLevel) {
    // Символы становятся более прозрачными по мере уменьшения видимости
    switch(visibilityLevel) {
        case this.visibilityLevels.EXPLORED:
        case this.visibilityLevels.PLAYER:
            return 1.0; // Полная видимость
        case this.visibilityLevels.ADJACENT:
            return 0.9; // Почти полная видимость
        case this.visibilityLevels.VISIBLE:
            return 0.7; // Хорошая видимость
        case this.visibilityLevels.HIDDEN:
            return 0.4; // Слабая видимость
        default:
            return 0.1; // Едва видимый
    }
}
    

    getLootSymbol(lootLevel) {
        const symbols = ['💎', '⭐', '🔮', '👑', '🏆'];
        return symbols[lootLevel - 1] || symbols[0];
    }

    getLootColor(lootLevel) {
        const colors = ['#f59e0b', '#eab308', '#a855f7', '#ec4899', '#ef4444'];
        return colors[lootLevel - 1] || colors[0];
    }

    handleCanvasHover(e) {
        if (!this.currentTacticalMap) return;

        const canvasRect = this.canvas.getBoundingClientRect();
        
        const computedStyle = getComputedStyle(this.canvas);
        const transform = computedStyle.transform;
        let scale = 1;
        
        if (transform && transform !== 'none') {
            const matrix = new DOMMatrix(transform);
            scale = matrix.a;
        }
        
        const logicalX = (e.clientX - canvasRect.left) / scale;
        const logicalY = (e.clientY - canvasRect.top) / scale;

        const hex = this.getHexAtLogicalPosition(logicalX, logicalY);
        
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
    
    const visibilityLevel = hex.visibilityLevel || this.visibilityLevels.HIDDEN;
    
    // Если клетка почти не видна, показываем минимальную информацию
    if (visibilityLevel <= this.visibilityLevels.HIDDEN) {
        return "🌫️ Туман войны\n(Подойдите ближе, чтобы разведать)";
    }
    
    // Если клетка слабо видна
    if (visibilityLevel === this.visibilityLevels.VISIBLE) {
        return `🌫️ Размытые очертания\n(Требуется дальнейшее исследование)`;
    }

    if (hex.tooltip) {
        return hex.tooltip;
    }

    if (hex.type === 'village' && hex.tacticalMap) {
        return `🍻 Таверна "${hex.tooltip || 'Уютное заведение'}"\n(Кликните для отдыха и пополнения фляги)`;
    }

    if (hex.type === 'water') {
        const isAccessible = this.isPlayerAdjacentToWater(hex);
        const accessibilityInfo = isAccessible ? "\n✅ Кликните для использования" : "\n❌ Подойдите ближе";
        return `💧 Источник воды\n(Восстановление здоровья и пополнение фляги)${accessibilityInfo}`;
    }

    if (hex.type === 'merchant') {
        const itemCount = hex.shopItems ? hex.shopItems.length : 0;
        const shopName = hex.shopName || "Магазин";
        const merchantName = hex.merchantName || "Торговец";
        return `🛒 ${shopName}\nТорговец: ${merchantName}\nТоваров: ${itemCount}\n(Кликните для торговли)`;
    }

    if (this.isTransitionCell(hex)) {
        const isAccessible = this.isPlayerAdjacentToTransition(hex);
        const accessibilityInfo = isAccessible ? "\n✅ Доступно для входа" : "\n❌ Подойдите ближе";
        
        if (hex.tacticalMap) {
            const locationName = this.getLocationNameFromPath(hex.tacticalMap);
            return `🚪 Вход в ${locationName}\n(Кликните для входа)${accessibilityInfo}`;
        }
        if (hex.localMap) {
            const locationName = this.getLocationNameFromPath(hex.localMap);
            return `🌍 Переход в ${locationName}\n(Кликните для перехода)${accessibilityInfo}`;
        }
        if (hex.globalMap) {
            const locationName = this.getLocationNameFromPath(hex.globalMap);
            return `🗺️ Переход в ${locationName}\n(Кликните для перехода)${accessibilityInfo}`;
        }
        if (hex.type === 'exit') {
            return `🚪 Выход\n(Кликните для возврата)${accessibilityInfo}`;
        }
    }

    if (hex.hasLoot) {
        const lootLevel = this.currentTacticalMap?.jsonData?.meta?.lootLevel || 1;
        const levelNames = ['Обычный', 'Хороший', 'Редкий', 'Эпический', 'Легендарный'];
        return `💎 Возможная награда\nУровень: ${levelNames[lootLevel - 1] || 'Обычный'}\n(Кликните для исследования)`;
    }

    if (hex.explored) {
        return `✓ Исследованная клетка\n(Действия уже выполнены)`;
    }

    const defaultTooltips = {
        'player_start': '⭐ Стартовая позиция',
        'monster': '👹 Враждебная территория\n(Возможен бой)',
        'chest': '📦 Тайный сундук\n(Может содержать сокровища)',
        'npc': '🧙 Таинственный незнакомец\n(Возможно, даст задание)',
        'exit': '🚪 Выход с карты\n(Вернуться на предыдущую карту)',
        'obstacle': '🪨 Препятствие\n(Непроходимо)',
        'active': '🟢 Проходимая местность',
        'inactive': '🔴 Непроходимая местность',
        'tree': '🌲 Дерево\n(Непроходимо)',
        'elegant_tree': '🎄 Изящное дерево\n(Непроходимо)',
        'cave': '🕳️ Пещера\n(Возможен вход)',
        'lava_crack': '🌋 Лавовый разлом\n(Опасно)',
        'graveyard_cross': '⚰️ Кладбищенский крест\n(Место силы)',
        'bandit_camp': '⚔️ Лагерь разбойников\n(Опасно)',
        'orc_camp': '👹 Лагерь орков\n(Очень опасно)',
        'black_monolith': '⬛ Черный монолит\n(Загадочный артефакт)',
        'weapon': '⚔️ Оружие\n(Можно найти)',
        'armor': '🛡️ Доспех\n(Можно найти)',
        'village': '🏘️ Деревня\n(Мирное поселение)',
        'castle': '🏰 Замок\n(Резиденция правителя)',
        'water': '💧 Водная поверхность\n(Непроходимо, но можно пополнить флягу)',
        'campfire': '🔥 Костер\n(Можно отдохнуть)',
        'cart': '🛒 Телега\n(Возможна торговля)',
        'traveler': '🚶 Путник\n(Может дать информацию)',
        'portal': '🌀 Магический портал\n(Телепортация)',
        'ancient_rune': '🔰 Древняя руна\n(Магический символ)',
        'magic_crystal': '💎 Магический кристалл\n(Источник магии)',
        'tavern': '🍻 Таверна\n(Место отдыха и слухов)',
        'shop': '🏪 Магазин\n(Торговля предметами)',
        'dungeon': '🏰 Подземелье\n(Опасно место)',
        'temple': '⛪ Храм\n(Священное место)',
        'bridge': '🌉 Мост\n(Переправа через препятствие)',
        'mountain': '⛰️ Гора\n(Непроходимо)'
    };

    const baseTooltip = defaultTooltips[hex.type] || null;
    
    if (baseTooltip) {
        const cellType = this.determineCellType(hex);
        const cellTypeData = this.actionSystem?.cellTypes?.[cellType];
        
        if (cellTypeData && !hex.explored) {
            return `${baseTooltip}\n\n🔍 ${cellTypeData.name}\n${cellTypeData.description}\n\n⚡ Доступны действия (кликните для просмотра)`;
        }
    }
    
    return baseTooltip;
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

    getAvailableMoves() {
        if (!this.currentTacticalMap) return [];
        
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        
        console.log(`📍 Текущая позиция: [${currentCol}, ${currentRow}]`);
        console.log(`🎯 Доступные ходы:`, neighbors.map(n => `[${n.col}, ${n.row}]`));
        
        return neighbors;
    }


// ========== СИСТЕМА ВИДИМОСТИ ==========

getHexVisibilityLevel(cell) {
    if (!cell || !this.playerTacticalPosition) {
        return this.visibilityLevels.OBSCURED;
    }

    // Если туман войны отключен, показываем все клетки
    if (!this.fogOfWarEnabled) {
        return this.visibilityLevels.EXPLORED;
    }

    // Проверяем, исследован ли гекс
    if (cell.explored) {
        return this.visibilityLevels.EXPLORED;
    }

    // Проверяем, находится ли игрок на этом гексе
    if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
        return this.visibilityLevels.PLAYER;
    }

    // Получаем расстояние до игрока
    const distance = this.getHexDistance(
        cell.row, cell.col,
        this.playerTacticalPosition.y, this.playerTacticalPosition.x
    );

    // Определяем уровень видимости по расстоянию
    if (distance <= 1) {
        // Соседние клетки
        return this.visibilityLevels.ADJACENT;
    } else if (distance <= this.visibilityRadius) {
        // В пределах радиуса видимости
        return this.visibilityLevels.VISIBLE;
    } else {
        // За пределами видимости
        return this.visibilityLevels.HIDDEN;
    }
}

getHexDistance(row1, col1, row2, col2) {
    // Преобразуем координаты в оффсетные для правильного расчета расстояния
    const x1 = col1;
    const z1 = row1 - Math.floor(col1 / 2);
    const y1 = -x1 - z1;
    
    const x2 = col2;
    const z2 = row2 - Math.floor(col2 / 2);
    const y2 = -x2 - z2;
    
    // Манхэттенское расстояние для гексов
    return Math.max(
        Math.abs(x1 - x2),
        Math.abs(y1 - y2),
        Math.abs(z1 - z2)
    );
}

updateCellVisibility(cell) {
    if (!cell) return;
    
    // Обновляем уровень видимости
    cell.visibilityLevel = this.getHexVisibilityLevel(cell);
    cell.visibilityColor = this.fogColors[this.getVisibilityLevelKey(cell.visibilityLevel)];
    
    return cell;
}

getVisibilityLevelKey(level) {
    const levels = this.visibilityLevels;
    for (const key in levels) {
        if (levels[key] === level) {
            return key;
        }
    }
    return 'OBSCURED';
}

updateAllCellsVisibility() {
    if (!this.currentTacticalMap || !this.currentTacticalMap.cells) {
        return;
    }
    
    Object.values(this.currentTacticalMap.cells).forEach(cell => {
        this.updateCellVisibility(cell);
    });
    
    console.log(`👁️ Видимость клеток обновлена для позиции [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]`);
}

getVisibleCells() {
    if (!this.currentTacticalMap) {
        return [];
    }
    
    const visibleCells = [];
    Object.values(this.currentTacticalMap.cells).forEach(cell => {
        const visibility = this.getHexVisibilityLevel(cell);
        if (visibility > this.visibilityLevels.OBSCURED) {
            visibleCells.push({
                cell: cell,
                visibility: visibility
            });
        }
    });
    
    return visibleCells;
}

revealAdjacentCells(row, col) {
    if (!this.currentTacticalMap) return;
    
    const cellsToReveal = this.getCellsInRadius(row, col, 1);
    
    cellsToReveal.forEach(cell => {
        if (!cell.explored) {
            // Отмечаем как видимые, но не исследованные
            cell.visibilityLevel = Math.max(
                cell.visibilityLevel || this.visibilityLevels.HIDDEN,
                this.visibilityLevels.VISIBLE
            );
        }
    });
    
    console.log(`🔍 Открыта видимость для ${cellsToReveal.length} клеток вокруг [${col},${row}]`);
    
    // Перерисовываем карту
    if (this.canvasInitialized) {
        this.drawTacticalMap();
    }
}

getCellsInRadius(centerRow, centerCol, radius) {
    const cells = [];
    
    for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
            if (Math.abs(dr) + Math.abs(dc) <= radius) {
                const cellKey = `${centerCol + dc},${centerRow + dr}`;
                const cell = this.currentTacticalMap.cells[cellKey];
                if (cell) {
                    cells.push(cell);
                }
            }
        }
    }
    
    return cells;
}

updateVisibilityOnMove(newX, newY) {
    const oldX = this.playerTacticalPosition.x;
    const oldY = this.playerTacticalPosition.y;
    
    // Обновляем видимость для новой позиции
    this.updateAllCellsVisibility();
    
    // Открываем видимость соседних клеток
    this.revealAdjacentCells(newY, newX);
    
    console.log(`👁️ Видимость обновлена при перемещении [${oldX},${oldY}] -> [${newX},${newY}]`);
}

hexToRGBA(hex, alpha = 1) {
    let r = 0, g = 0, b = 0;
    
    // 3-символьный формат
    if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    }
    // 6-символьный формат
    else if (hex.length === 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }
    
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

toggleVisibilitySystem() {
    this.fogOfWarEnabled = !this.fogOfWarEnabled;
    
    if (this.fogOfWarEnabled) {
        console.log("👁️ Система видимости включена");
        this.showNotification("Туман войны включен", 'info');
    } else {
        console.log("👁️ Система видимости отключена");
        this.showNotification("Туман войны отключен", 'info');
    }
    
    this.updateAllCellsVisibility();
    this.drawTacticalMap();
}

increaseVisibility() {
    if (this.visibilityRadius < 5) {
        this.visibilityRadius++;
        console.log(`👁️ Радиус видимости увеличен: ${this.visibilityRadius}`);
        this.updateAllCellsVisibility();
        this.drawTacticalMap();
        this.showNotification(`Радиус видимости: ${this.visibilityRadius}`, 'info');
    }
}

decreaseVisibility() {
    if (this.visibilityRadius > 0) {
        this.visibilityRadius--;
        console.log(`👁️ Радиус видимости уменьшен: ${this.visibilityRadius}`);
        this.updateAllCellsVisibility();
        this.drawTacticalMap();
        this.showNotification(`Радиус видимости: ${this.visibilityRadius}`, 'info');
    }
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
            
            const centerX = potentialNeighbor.x || potentialNeighbor.originalX || 0;
            const centerY = potentialNeighbor.y || potentialNeighbor.originalY || 0;
            const currentCenterX = currentCell.x || currentCell.originalX || 0;
            const currentCenterY = currentCell.y || currentCell.originalY || 0;
            
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

    areHexesAdjacent(cell1, cell2, hexSize) {
        if (!cell1 || !cell2) return false;
        
        const geometry = this.getHexGeometry(hexSize);
        
        const centerX1 = cell1.x || cell1.originalX || 0;
        const centerY1 = cell1.y || cell1.originalY || 0;
        const centerX2 = cell2.x || cell2.originalX || 0;
        const centerY2 = cell2.y || cell2.originalY || 0;
        
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

    // ========== ИНИЦИАЛИЗАЦИЯ И СТАРТОВЫЕ ПОЗИЦИИ ==========

    setStartPositions() {
        console.log("🎯 Устанавливаем стартовые позиции...");
        
        if (this.localMaps.length > 0 && this.currentLocalMap) {
            console.log(`📍 Используем установленную локальную карту: ${this.currentLocalMap.name}`);
        }
        else if (this.tacticalMaps.length > 0) {
            this.currentTacticalMap = this.tacticalMaps[0];
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
            this.currentMapType = 'tactical';
            console.log(`🎯 Установлена стартовая тактическая карта: ${this.currentTacticalMap.name}`);
        }
        
        if (this.globalMaps.length > 0) {
            this.currentGlobalMap = this.globalMaps[0];
            this.playerGlobalPosition = {...this.currentGlobalMap.startPosition};
            console.log(`🗺️ Установлена глобальная карта: ${this.currentGlobalMap.name}`);
        }
        
        console.log("✅ Стартовые позиции установлены:", {
            global: this.playerGlobalPosition,
            local: this.playerLocalPosition, 
            tactical: this.playerTacticalPosition,
            mapType: this.currentMapType
        });
    }

    debugLoadedMaps() {
        console.group("📊 Отладка загруженных карт");
        console.log("Локальные карты:", this.localMaps.length);
        this.localMaps.forEach((map, index) => {
            console.log(`  ${index + 1}. ${map.name} (клеток: ${Object.keys(map.cells).length})`);
        });
        console.log("Тактические карты:", this.tacticalMaps.length);
        this.tacticalMaps.forEach((map, index) => {
            console.log(`  ${index + 1}. ${map.name} (клеток: ${Object.keys(map.cells).length})`);
        });
        console.log("Текущая локальная карта:", this.currentLocalMap?.name || 'нет');
        console.log("Текущая тактическая карта:", this.currentTacticalMap?.name || 'нет');
        console.log("Текущий тип карты:", this.currentMapType);
        console.log("Глубина стека карт:", this.mapStack.length);
        console.log("Загружено JSON карт:", this.loadedJSONMaps.size);
        console.log("Canvas инициализирован:", this.canvasInitialized);
        console.log("Текущий герой:", this.currentHero?.name || 'нет');
        console.log("Масштаб:", `${Math.round(this.zoomLevel * 100)}%`);
        console.log("Смещение карты:", this.mapOffset);
        
        const availableMoves = this.getAvailableMoves();
        console.log("Доступные ходы:", availableMoves.length);
        availableMoves.forEach(move => {
            console.log(`  [${move.col},${move.row}] - ${move.direction}${move.isMonster ? ' (монстр)' : ''}`);
        });
        
        console.groupEnd();
    }

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
                "3,3": {type: "start", passable: true, row: 3, col: 3, visible: true, x: 300, y: 300, explored: false, hasAction: true, isSelected: false, cellType: null},
                "3,2": {type: "exit", passable: true, row: 2, col: 3, visible: true, x: 300, y: 250, explored: false, hasAction: true, isSelected: false, cellType: null},
                "2,3": {type: "monster", passable: false, row: 3, col: 2, visible: true, x: 250, y: 300, explored: false, hasAction: true, isSelected: false, cellType: null},
                "4,3": {type: "chest", passable: true, row: 3, col: 4, visible: true, x: 350, y: 300, explored: false, hasAction: true, isSelected: false, cellType: null},
                "3,4": {type: "npc", passable: true, row: 4, col: 3, visible: true, x: 300, y: 350, explored: false, hasAction: true, isSelected: false, cellType: null}
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
                "1,1": {type: "start", passable: true, row: 1, col: 1, visible: true, x: 100, y: 100, explored: false, hasAction: true, isSelected: false, cellType: null}
            }
        }];
    }

    // ========== ОТОБРАЖЕНИЕ ОВЕРЛЕЯ КАРТЫ ==========
// В КЛАССЕ MapSystem, метод showMapOverlay:
showMapOverlay(overlayType, container) {
    console.log(`🗺️ MapSystem: Показываем ${overlayType}`);
    
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
    } else {
        targetMap = this.currentTacticalMap;
        displayName = '🎲 Тактическая карта';
    }
    
    if (!targetMap) {
        console.error(`❌ ${overlayType} карта не загружена`);
        container.innerHTML = `
            <div class="overlay-content tactical-map-overlay">
                <div class="tactical-map-header">
                    <h4>${displayName}</h4>
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
                <div class="map-error" style="padding: 20px; text-align: center;">
                    Карта не загружена. Возможно, нужно создать тестовые карты.
                    <br><br>
                    <button class="btn-control" onclick="game.systems.map.createFallbackMaps(); game.systems.map.showOverlay('${overlayType}')">
                        🛠️ Создать тестовые карты
                    </button>
                </div>
            </div>
        `;
        container.style.display = 'block';
        return;
    }
    
    console.log(`✅ Показываем карту: ${targetMap.name} (тип: ${overlayType}, клеток: ${Object.keys(targetMap.cells).length})`);
    
    this.currentTacticalMap = targetMap;
    
    if (overlayType === 'local-map') {
        this.currentMapType = 'local';
        this.playerTacticalPosition = {...this.playerLocalPosition};
        this.currentLocalMap = targetMap;
    } else {
        this.currentMapType = 'tactical';
    }
    
    container.innerHTML = `
        <div class="overlay-content tactical-map-overlay">
            <div class="tactical-map-header">
                <h4>${targetMap.name}</h4>
                
                <!-- Индикатор мирной карты -->
                ${this.isPeacefulMap() ? `
                    <div class="peaceful-map-indicator" style="
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: rgba(0, 170, 255, 0.15);
                        border: 2px solid #00aaff;
                        border-radius: 8px;
                        padding: 6px 12px;
                        color: #00aaff;
                        font-weight: bold;
                        font-size: 14px;
                        margin-left: 15px;
                        vertical-align: middle;
                        animation: peaceful-pulse 2s infinite;
                    ">
                        <span>🍻</span>
                        <span>Мирная карта</span>
                    </div>
                ` : ''}
                
                <div class="map-type-badge">${overlayType === 'local-map' ? '📍 Локальная' : '🎲 Тактическая'}</div>
                
                <div class="zoom-controls">
                    <button class="btn-control" onclick="game.systems.map.zoomOut()" title="Уменьшить">
                        🔍−
                    </button>
                    <span class="zoom-info">${Math.round(this.zoomLevel * 100)}%</span>
                    <button class="btn-control" onclick="game.systems.map.zoomIn()" title="Увеличить">
                        🔍+
                    </button>
                    <button class="btn-control" onclick="game.systems.map.resetZoom()" title="Сбросить масштаб">
                        🔄
                    </button>
                    <button class="btn-control" onclick="game.systems.map.toggleFullscreen()" title="Полноэкранный режим">
                        📱
                    </button>
                </div>
                
                <button class="btn-close" onclick="game.hideOverlay()">✕</button>
            </div>
            
            <div class="tactical-map-controls">
                <div class="time-controls-group" style="display: flex; align-items: center; gap: 10px; margin-right: auto;">
                    <div class="time-display" id="timeDisplay" style="font-size: 14px;">
                        ☀️ 07:00 День 1 (Лето)
                    </div>
                    
                    <button class="btn-control" 
                            onclick="if (game.systems.map.timeSystem) game.systems.map.timeSystem.createCamp()" 
                            title="Создать лагерь на этом гексе"
                            style="padding: 5px 10px; font-size: 12px;">
                        🏕️ Создать лагерь
                    </button>
                    
                    <button class="btn-control" 
                            onclick="if (game.systems.map.timeSystem) game.systems.map.timeSystem.returnToCamp()" 
                            title="Вернуться в лагерь"
                            ${!this.timeSystem?.camp?.exists ? 'disabled' : ''}
                            style="padding: 5px 10px; font-size: 12px;">
                        🏕️ В лагерь
                    </button>
                    
                    <button class="btn-control" 
                            onclick="if (game.systems.map.timeSystem) game.systems.map.timeSystem.spendNightInCamp()" 
                            title="Провести ночь в лагере"
                            ${!this.timeSystem?.isInCamp?.() ? 'disabled' : ''}
                            style="padding: 5px 10px; font-size: 12px;">
                        🌙 Переночевать
                    </button>
                    <button class="btn-control" 
                            onclick="if (game.systems.map) game.systems.map.researchCurrentHex()" 
                            title="Исследовать этот гекс (переночевать)"
                            style="padding: 5px 10px; font-size: 12px;">
                        🔍 Исследовать гекс
                    </button>
                </div>
                
                <div class="map-controls-group" style="display: flex; align-items: center; gap: 10px;">
                    <button class="btn-control" onclick="game.systems.map.toggleGrid()">
                        ${this.showGrid ? '🔲 Скрыть сетку' : '🔳 Показать сетку'}
                    </button>
                    <button class="btn-control" onclick="game.systems.map.toggleVisibilitySystem()">
                        ${this.fogOfWarEnabled ? '👁️ Выкл. туман' : '👁️ Вкл. туман'}
                    </button>
                    <button class="btn-control" onclick="game.systems.map.increaseVisibility()" title="Увеличить радиус видимости">
                        👁️+
                    </button>
                    <button class="btn-control" onclick="game.systems.map.decreaseVisibility()" title="Уменьшить радиус видимости">
                        👁️-
                    </button>
                    <div class="position-info" style="color: #94a3b8; font-size: 12px;">
                        Позиция: [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]
                        ${overlayType === 'local-map' ? ' (локальная)' : ' (тактическая)'}
                    </div>
                </div>
            </div>
            
            <div class="tactical-map-content-with-actions">
                <div class="map-main-area">
                    <div class="tactical-map-visual">
                        <!-- Canvas будет добавлен автоматически -->
                    </div>
                </div>
                
                <div class="cell-actions-panel">
                    <h4 class="actions-panel-title">⚡ Действия на клетке</h4>
                    <div class="cell-actions-container" id="cellActionsContainer">
                        <div class="actions-placeholder">
                            Выберите клетку для просмотра доступных действий
                        </div>
                    </div>
                    
                    <div class="cell-info-footer">
                        <div class="action-hint">
                            ℹ️ Каждая клетка позволяет совершить одно действие
                        </div>
                        <div class="resource-info">
                            <h5>📦 Ресурсы героя:</h5>
                            <div class="resource-list" id="heroResourcesList">
                                <!-- Ресурсы будут загружены динамически -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="tactical-map-info">
                <div class="map-description">
                    ${targetMap.description || 'Описание отсутствует'}
                    ${this.isPeacefulMap() ? '<br><span style="color: #00aaff;">🍻 Мирная локация - свободное перемещение без затрат времени</span>' : ''}
                </div>
                <div class="map-stats">
                    <span>Клеток: ${Object.keys(targetMap.cells).length}</span>
                    <span>Размер: ${targetMap.width}x${targetMap.height}</span>
                    <span>Масштаб: <span id="currentZoom">${Math.round(this.zoomLevel * 100)}%</span></span>
                    <span id="availableMoves">Доступных ходов: 0</span>
                    <span>Радиус видимости: ${this.visibilityRadius}</span>
                    <span>Туман войны: ${this.fogOfWarEnabled ? 'включен' : 'выключен'}</span>
                    ${this.isPeacefulMap() ? '<span style="color: #00aaff;">🍻 Мирная</span>' : ''}
                </div>
            </div>
        </div>
    `;
    
    container.style.display = 'block';
    
    setTimeout(() => {
        console.log("🎨 Инициализируем Canvas для карты...");
        
        if (!this.currentTacticalMap) {
            console.error("❌ currentTacticalMap не установлена для Canvas");
            return;
        }
        
        try {
            this.initCanvas();
            this.updateMovementInfo();
            
            if (this.actionSystem) {
                this.actionSystem.updateHeroResourcesUI();
            }
            
            console.log("🔍 Проверяем состояние клеток на карте:");
            Object.values(this.currentTacticalMap.cells).forEach(cell => {
                console.log(`  [${cell.col},${cell.row}]: type=${cell.type}, explored=${cell.explored}, cellType=${cell.cellType}, visibility=${cell.visibilityLevel}`);
            });
            
            const cellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
            const currentCell = this.currentTacticalMap.cells[cellKey];
            
            if (currentCell && this.actionSystem) {
                console.log(`📍 Автоматически показываем описание текущей клетки [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]`);
                setTimeout(() => {
                    this.actionSystem.updateCellActionsUI(currentCell);
                    this.actionSystem.highlightSelectedCell(currentCell);
                }, 100);
            }
            
            console.log("✅ Canvas успешно инициализирован");
            
        } catch (error) {
            console.error("❌ Ошибка инициализации Canvas:", error);
        }
    }, 50);
}
    
    showOverlay(overlayType) {
        console.log(`🎯 MapSystem: Показываем оверлей: ${overlayType}`);
        
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

        switch(overlayType) {
            case 'tactical-map':
            case 'local-map':
                this.showMapOverlay(overlayType, container);
                break;

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
                container.style.display = 'block';
                break;

            default:
                console.warn(`⚠️ Неизвестный тип оверлея в MapSystem: ${overlayType}`);
                container.innerHTML = `<div class="map-error">Неизвестный тип окна: ${overlayType}</div>`;
                container.style.display = 'block';
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
        
        console.log("✅ Оверлей скрыт, показываем главный экран героя");
        
        // ⭐ ВАЖНОЕ ИСПРАВЛЕНИЕ: Возвращаемся к главному экрану героя
        if (window.game && window.game.showHeroGameScreen) {
            // Небольшая задержка для гарантии очистки DOM
            setTimeout(() => {
                window.game.showHeroGameScreen();
            }, 50);
        } else {
            console.error("❌ window.game.showHeroGameScreen не доступен");
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
            this.calculateCSSScale();
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

    debugInfo() {
        console.group("🗺️ MapSystem Debug Info");
        console.log("Глобальная позиция:", this.playerGlobalPosition);
        console.log("Локальная позиция:", this.playerLocalPosition);
        console.log("Тактическая позиция:", this.playerTacticalPosition);
        console.log("Текущая глобальная карта:", this.currentGlobalMap?.name);
        console.log("Текущая локальная карта:", this.currentLocalMap?.name);
        console.log("Текущая тактическая карта:", this.currentTacticalMap?.name);
        console.log("Тип текущей карты:", this.currentMapType);
        console.log("Глубина стека карт:", this.mapStack.length);
        console.log("Загружено JSON карт:", this.loadedJSONMaps.size);
        console.log("Canvas инициализирован:", this.canvasInitialized);
        console.log("Текущий герой:", this.currentHero?.name || 'нет');
        console.log("Масштаб:", `${Math.round(this.zoomLevel * 100)}%`);
        console.log("Смещение карты:", this.mapOffset);
        
        const availableMoves = this.getAvailableMoves();
        console.log("Доступные ходы:", availableMoves.length);
        availableMoves.forEach(move => {
            console.log(`  [${move.col},${move.row}] - ${move.direction}${move.isMonster ? ' (монстр)' : ''}`);
        });
        
        console.groupEnd();
    }

    testPeacefulMovement() {
        if (!this.currentTacticalMap) {
            console.error("❌ Нет текущей карты");
            return;
        }
        
        console.log("🧪 Тестирование мирное перемещение...");
        
        const availableMoves = this.getAvailableMoves();
        console.log("Доступные ходы:", availableMoves);
        
        if (availableMoves.length > 0) {
            const targetMove = availableMoves[0];
            console.log(`Пытаемся переместиться на: [${targetMove.col}, ${targetMove.row}]`);
            
            const cellData = this.currentTacticalMap.cells[`${targetMove.col},${targetMove.row}`];
            if (cellData) {
                this.handlePeacefulMovement(targetMove.col, targetMove.row, cellData);
            } else {
                console.error("❌ Клетка не найдена");
            }
        } else {
            console.log("❌ Нет доступных ходов для тестирования");
        }
    }

    drawSingleHexWithHighlight(hex) {
        if (!this.ctx || !hex) return;
        
        const hexSize = this.currentTacticalMap.cellSize || 40;
        const centerX = hex.x || hex.originalX || 0;
        const centerY = hex.y || hex.originalY || 0;
        
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

    forceLoadLocalMap() {
        console.log("🔄 Принудительная загрузка локальной карты...");
        
        if (this.localMaps.length === 0) {
            console.error("❌ Нет доступных локальных карт");
            
            this.createFallbackLocalMap();
            
            if (this.localMaps.length === 0) {
                console.error("❌ Не удалось создать тестовую локальную карту");
                return false;
            }
        }
        
        const localMap = this.localMaps[0];
        this.setCurrentLocalMap(localMap);
        
        console.log(`✅ Локальная карта установлена: ${localMap.name}`);
        return true;
    }

    createFallbackLocalMap() {
        console.log("🔄 Создаем тестовую локальную карту...");
        
        const testLocalMap = {
            id: 1,
            name: "Тестовая Локальная Зона",
            image: "",
            width: 8,
            height: 8,
            startPosition: {x: 4, y: 4},
            globalPosition: {x: 2, y: 2},
            description: "Тестовая локальная зона для разработки",
            cells: {
                "4,4": {
                    type: "player_start", 
                    passable: true, 
                    row: 4, 
                    col: 4, 
                    visible: true, 
                    x: 200, 
                    y: 200,
                    explored: false,
                    hasAction: true,
                    isSelected: false,
                    cellType: null
                },
                "4,3": {
                    type: "exit", 
                    passable: true, 
                    row: 3, 
                    col: 4, 
                    visible: true, 
                    x: 200, 
                    y: 150,
                    explored: false,
                    hasAction: true,
                    isSelected: false,
                    cellType: null
                },
                "3,4": {
                    type: "monster", 
                    passable: false, 
                    row: 4, 
                    col: 3, 
                    visible: true, 
                    x: 150, 
                    y: 200,
                    explored: false,
                    hasAction: true,
                    isSelected: false,
                    cellType: null
                }
            },
            cellSize: 40,
            originalCanvasWidth: 400,
            originalCanvasHeight: 400,
            mapType: 'local'
        };
        
        this.localMaps.push(testLocalMap);
        console.log("✅ Тестовая локальная карта создана");
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

    debugBackgroundInfo() {
        console.group("🎨 Debug Background Info");
        const map = this.currentTacticalMap;
        const container = document.querySelector('.tactical-map-visual');
        
        if (container) {
            const rect = container.getBoundingClientRect();
            console.log("Container size:", rect.width, "x", rect.height);
        }
        
        console.log("Original canvas size:", map.originalCanvasWidth, "x", map.originalCanvasHeight);
        console.log("Current zoom:", this.zoomLevel);
        console.log("Map offset:", this.mapOffset);
        console.log("Has background image:", !!map.image);
        console.groupEnd();
    }

    toggleFullscreen() {
        const canvas = this.canvas;
        if (!canvas) return;

        if (!document.fullscreenElement) {
            if (canvas.requestFullscreen) {
                canvas.requestFullscreen();
            } else if (canvas.webkitRequestFullscreen) {
                canvas.webkitRequestFullscreen();
            } else if (canvas.msRequestFullscreen) {
                canvas.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }


getExploredCellsData() {
    const exploredData = {};
    
    // ИСПРАВЛЕНИЕ: используем this вместо this.systems.map
    if (this.currentTacticalMap) {
        Object.values(this.currentTacticalMap.cells).forEach(cell => {
            if (cell.explored) {
                const key = `${cell.col},${cell.row}`;
                exploredData[key] = {
                    explored: true,
                    hasAction: cell.hasAction,
                    cellType: cell.cellType
                };
            }
        });
    }
    
    return exploredData;
}

restoreExploredCells(exploredCellsData) {
    // ИСПРАВЛЕНИЕ: используем this вместо this.systems.map
    if (!this.currentTacticalMap) return;
    
    Object.entries(exploredCellsData).forEach(([key, data]) => {
        const cell = this.currentTacticalMap.cells[key];
        if (cell) {
            cell.explored = data.explored || false;
            cell.hasAction = data.hasAction !== undefined ? data.hasAction : true;
            if (data.cellType) {
                cell.cellType = data.cellType;
            }
        }
    });
    
    console.log(`✅ Восстановлено ${Object.keys(exploredCellsData).length} исследованных клеток`);
}


    
} // <-- ЗАКРЫВАЕМ КЛАСС MapSystem ЗДЕСЬ

// ЭТОТ КОД ДОЛЖЕН БЫТЬ ВНЕ КЛАССА:
window.MapSystem = MapSystem;
console.log("📦 MapSystem модуль загружен (упрощенная версия)");
