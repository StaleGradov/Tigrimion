"use strict";

class HuntAction {
    constructor(actionSystem) {
        this.actionSystem = actionSystem;
        this.mapSystem = actionSystem.mapSystem;
        this.config = {
            id: 'hunt',
            icon: '🏹',
            name: 'Охотиться',
            description: 'Выследить и добыть дичь. Приводит к бою с монстром. Награда: двойной лут с монстра',
            class: 'action-hunt',
            resource_type: 'loot',
            triggers_monster: true,
            monster_level_multiplier: 1.0,
            always_monster: true,
            double_loot: true
        };
        
        // Регистрируем модуль в ActionSystem
        if (actionSystem) {
            actionSystem.registerModule('hunt', this);
            console.log("✅ HuntAction зарегистрирован в ActionSystem");
        }
    }

execute(row, col) {
    console.log(`🏹 HuntAction.execute(): Начало охоты на [${col},${row}]`);
    
    // Проверяем загрузку модуля
    if (!this.verifyModuleSetup()) {
        this.showNotification("❌ Модуль охоты не готов!", 'error');
        return;
    }
    
    // Проверяем базовые условия
    if (!this.verifyBasicConditions(row, col)) {
        return;
    }
    
    // Получаем клетку
    const cellKey = `${col},${row}`;
    const cell = this.mapSystem.currentTacticalMap.cells[cellKey];
    
    if (!cell) {
        console.error(`❌ Клетка [${col}, ${row}] не найдена`);
        this.showNotification("❌ Клетка не найдена!", 'error');
        return;
    }
    
    if (cell.explored === true) {
        this.showNotification("❌ Эта клетка уже исследована!", 'warning');
        return;
    }
    
    // Проверяем, достижима ли клетка
    const isReachable = this.mapSystem.isCellReachable(cell);
    if (!isReachable) {
        this.showNotification("❌ Клетка недостижима для охоты!", 'warning');
        return;
    }
    
    // Определяем тип клетки
    const cellType = this.actionSystem.determineCellType(cell);
    console.log(`🔍 Тип клетки [${col},${row}]: ${cellType}`);
    
    // Сохраняем информацию
    this.currentCell = cell;
    this.currentCellRow = row;
    this.currentCellCol = col;
    this.currentCellType = cellType;
    
    // ВАЖНО: Показываем выбор трофея, а не сразу бой!
    console.log(`✅ Вызываем showHuntTargetSelection() для клетки [${col},${row}]`);
    this.showHuntTargetSelection(cell);
    
    console.log(`✅ Подготовка охоты завершена, показываем выбор трофея`);
}

verifyModuleSetup() {
    console.log("🔍 Проверка настройки модуля охоты:");
    console.log("   this:", this);
    console.log("   this.actionSystem:", this.actionSystem);
    console.log("   this.mapSystem:", this.mapSystem);
    console.log("   this.mapSystem.currentHero:", this.mapSystem?.currentHero);
    
    if (!this.mapSystem) {
        console.error("❌ MapSystem не доступна!");
        return false;
    }
    
    if (!this.actionSystem) {
        console.error("❌ ActionSystem не доступна!");
        return false;
    }
    
    if (!this.mapSystem.currentHero) {
        console.error("❌ Нет текущего героя!");
        return false;
    }
    
    return true;
}

verifyBasicConditions(row, col) {
    if (!this.mapSystem.currentTacticalMap) {
        console.error("❌ Нет текущей тактической карты!");
        this.showNotification("❌ Карта не загружена!", 'error');
        return false;
    }
    
    const cellKey = `${col},${row}`;
    if (!this.mapSystem.currentTacticalMap.cells[cellKey]) {
        console.error(`❌ Клетка [${col}, ${row}] не существует на карте`);
        this.showNotification("❌ Клетка не существует!", 'error');
        return false;
    }
    
    return true;
}

async verifyResourcesLoaded() {
    if (!this.actionSystem.resources || Object.keys(this.actionSystem.resources).length === 0) {
        console.warn("⚠️ Ресурсы не загружены, пробуем загрузить...");
        
        try {
            await this.actionSystem.loadCellData();
            console.log("✅ Ресурсы загружены");
        } catch (error) {
            console.error("❌ Не удалось загрузить ресурсы:", error);
        }
    }
    
    // Проверяем наличие охотничьих ресурсов
    const huntResources = ['bones', 'leathers', 'hides', 'furs'];
    let hasHuntResources = false;
    
    huntResources.forEach(category => {
        if (this.actionSystem.resources[category] && 
            this.actionSystem.resources[category].length > 0) {
            hasHuntResources = true;
        }
    });
    
    if (!hasHuntResources) {
        console.warn("⚠️ Нет охотничьих ресурсов, создаем тестовые");
        this.createTestHuntResources();
    }
}


createTestHuntResources() {
    console.log("🔄 Создаем тестовые охотничьи ресурсы");
    
    if (!this.actionSystem.resources) {
        this.actionSystem.resources = {};
    }
    
    // Охотничьи ресурсы
    this.actionSystem.resources.bones = [
        { id: 'small_bone', name: '🦴 Маленькая кость', description: 'Кость мелкого животного', type: 'bones', price: 5 },
        { id: 'wolf_bone', name: '🐺 Волчья кость', description: 'Кость волка, прочная и крепкая', type: 'bones', price: 15 },
        { id: 'horse_bone', name: '🐴 Конская кость', description: 'Кость лошади, большая и тяжелая', type: 'bones', price: 25 }
    ];
    
    this.actionSystem.resources.leathers = [
        { id: 'thin_leather', name: '🐂 Тонкая кожа', description: 'Кожа мелкого животного', type: 'leathers', price: 10 },
        { id: 'strong_leather', name: '🦌 Прочная кожа', description: 'Кожа оленя, хорошего качества', type: 'leathers', price: 20 },
        { id: 'thick_leather', name: '🐗 Толстая кожа', description: 'Кожа кабана, очень прочная', type: 'leathers', price: 30 }
    ];
    
    this.actionSystem.resources.hides = [
        { id: 'thin_hide', name: '🐇 Тонкая шкура', description: 'Шкурка кролика', type: 'hides', price: 8 },
        { id: 'strong_hide', name: '🦊 Лисья шкура', description: 'Шкурка лисы, красивая и теплая', type: 'hides', price: 40 },
        { id: 'thick_hide', name: '🐻 Медвежья шкура', description: 'Шкура медведя, очень ценная', type: 'hides', price: 100 }
    ];
    
    this.actionSystem.resources.furs = [
        { id: 'hare_fur', name: '🐰 Заячий мех', description: 'Мягкий мех зайца', type: 'furs', price: 12 },
        { id: 'marten_fur', name: '🦡 Куний мех', description: 'Мех куницы, очень ценный', type: 'furs', price: 50 },
        { id: 'arctic_fox_fur', name: '🦊 Мех песца', description: 'Белый мех песца, роскошный', type: 'furs', price: 80 }
    ];
    
    console.log("✅ Тестовые охотничьи ресурсы созданы");
}

    
// Добавьте этот вспомогательный метод если ресурсы не загружены
showSimpleHuntInterface(cell) {
    const actionsContainer = document.getElementById('cellActionsContainer');
    if (!actionsContainer) return;
    
    const cellType = this.actionSystem.determineCellType(cell);
    const cellTypeData = this.actionSystem.cellTypes[cellType];
    const baseChance = this.actionSystem.getActionChance(this.config.id, cellType);
    
    actionsContainer.innerHTML = `
        <div class="simple-hunt-interface">
            <h3 style="color: #00ffcc; margin-bottom: 15px; text-align: center;">
                🏹 Охота
            </h3>
            
            <div class="hunt-info" style="background: rgba(255, 100, 100, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ff4444;">
                <strong>⚠️ Простая охота:</strong>
                <p style="margin-top: 8px; font-size: 14px; color: #ffcccc;">
                    • Ресурсы для охоты не загружены<br>
                    • Вы начнете обычную охоту без выбора трофея<br>
                    • Встретите случайного монстра<br>
                    • Получите стандартный лут
                </p>
            </div>
            
            <div class="base-chance-info" style="background: rgba(0, 0, 0, 0.4); padding: 10px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                <strong>Базовая вероятность успеха:</strong> 
                <span style="color: ${baseChance >= 70 ? '#44ff44' : baseChance >= 40 ? '#ffaa00' : '#ff4444'}">
                    ${baseChance}%
                </span>
            </div>
            
            <div style="text-align: center;">
                <button class="btn-control" onclick="window.game.systems.action.actionModules.hunt.startSimpleHunt()"
                        style="padding: 15px 30px; font-size: 16px; background: linear-gradient(135deg, #ff4444, #ff6666);">
                    🏹 Начать простую охоту
                </button>
            </div>
            
            <div style="margin-top: 20px; color: #888; font-size: 12px; text-align: center;">
                <em>Примечание: Загрузите файлы ресурсов для полного функционала охоты</em>
            </div>
        </div>
    `;
}

// Метод для простой охоты (если ресурсы не загружены)
startSimpleHunt() {
    if (!this.mapSystem.currentHero) return;
    
    const battleSystem = window.game?.systems?.battle;
    if (!battleSystem) {
        this.showNotification("❌ Система боя не доступна!", 'error');
        return;
    }
    
    const randomMonster = battleSystem.getRandomMonsterForMovement();
    if (!randomMonster) {
        this.showNotification("❌ Нет доступных монстров!", 'error');
        return;
    }
    
    // Сохраняем информацию о охоте
    this.mapSystem.pendingAction = {
        action: 'hunt',
        row: this.currentCellRow,
        col: this.currentCellCol,
        wasSuccess: true,
        doubleLoot: false,
        simpleHunt: true
    };
    
    console.log(`🏹 Начинаем простую охоту на: ${randomMonster.name}`);
    this.showNotification(`🏹 Начинается охота на ${randomMonster.name}!`, 'info');
    
    battleSystem.startBattleWithSpecificMonster(this.mapSystem.currentHero, randomMonster, 'hunt');
}

    // ========== ВЫБОР ЦЕЛИ ОХОТЫ ==========

    showHuntTargetSelection(cell) {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        const cellType = this.actionSystem.determineCellType(cell);
        const cellTypeData = this.actionSystem.cellTypes[cellType];
        const baseChance = this.actionSystem.getActionChance(this.config.id, cellType);
        
        const huntableResources = this.groupHuntableResources();
        
        let html = `
            <div class="hunt-target-selection">
                <h3 style="color: #00ffcc; margin-bottom: 15px; text-align: center;">
                    🏹 Выберите желаемый трофей для охоты
                </h3>
                
                <div class="hunt-info" style="background: rgba(255, 100, 100, 0.1); padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #ff4444;">
                    <strong>⚠️ Особенности охоты:</strong>
                    <p style="margin-top: 8px; font-size: 14px; color: #ffcccc;">
                        • Выберите трофей, который хотите добыть<br>
                        • Затем увидите монстров, у которых падает этот ресурс<br>
                        • Охота всегда приводит к бою с выбранным монстром<br>
                        • После победы вы получите выбранный трофей
                    </p>
                </div>
                
                <div class="base-chance-info" style="background: rgba(0, 0, 0, 0.4); padding: 10px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                    <strong>Базовая вероятность успеха:</strong> 
                    <span style="color: ${baseChance >= 70 ? '#44ff44' : baseChance >= 40 ? '#ffaa00' : '#ff4444'}">
                        ${baseChance}%
                    </span>
                </div>
                
                <div class="hunt-categories">
        `;
        
        const huntCategories = ['bones', 'leathers', 'hides', 'furs'];
        
        huntCategories.forEach(category => {
            const categoryData = huntableResources[category];
            if (!categoryData || categoryData.resources.length === 0) return;
            
            const categoryNames = {
                'bones': '🦴 Кости',
                'leathers': '🐂 Кожи',
                'hides': '🐅 Шкуры',
                'furs': '🦊 Меха'
            };
            
            html += `
                <div class="hunt-category">
                    <h4 style="color: #00aaff; margin: 15px 0 10px 0;">
                        ${categoryNames[category] || category}
                    </h4>
                    <div class="hunt-targets-grid">
            `;
            
            categoryData.resources.forEach(resource => {
                const monstersWithResource = this.getMonstersWithResource(resource.id);
                const monsterCount = monstersWithResource.length;
                
                html += `
                    <div class="hunt-target-item" onclick="window.game.systems.action.actionModules.hunt.showMonsterSelectionForResource('${resource.id}', ${cell.row}, ${cell.col})">
                        <div class="hunt-target-name" style="font-size: 16px; margin-bottom: 5px;">
                            ${resource.name}
                        </div>
                        <div class="hunt-target-description" style="font-size: 11px; color: #aaa; margin: 5px 0;">
                            ${resource.description}
                        </div>
                        <div class="monster-count" style="font-size: 10px; color: #888; margin-top: 5px;">
                            🎯 Монстров с этим трофеем: <strong>${monsterCount}</strong>
                        </div>
                        <div class="hunt-target-price" style="font-size: 10px; color: #f59e0b; margin-top: 8px;">
                            Цена: ${resource.price || resource.value || 10} золота
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <button class="btn-control" onclick="window.game.systems.action.updateCellActionsUI(this.selectedCell)" 
                        style="margin-top: 20px; width: 100%;">
                    ↩️ Назад к действиям
                </button>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
        
        this.styleHuntTargetSelection();
    }

    showMonsterSelectionForResource(resourceId, row, col) {
        const resource = this.findResourceById(resourceId);
        if (!resource) {
            console.error(`Ресурс ${resourceId} не найден`);
            return;
        }
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        const cellType = this.actionSystem.currentCellType;
        const cellTypeData = this.actionSystem.cellTypes[cellType];
        const baseChance = this.actionSystem.getActionChance(this.config.id, cellType);
        
        const monsters = this.getMonstersWithResource(resourceId);
        
        if (monsters.length === 0) {
            const html = `
                <div class="no-monsters-found">
                    <h3 style="color: #ff4444; text-align: center; margin-bottom: 15px;">
                        🚫 Нет подходящих монстров
                    </h3>
                    <p style="text-align: center; color: #aaa;">
                        Для трофея "${resource.name}" нет монстров с гарантированным выпадением.
                    </p>
                    <button class="btn-control" onclick="window.game.systems.action.actionModules.hunt.showHuntTargetSelection(this.selectedCell)" 
                            style="margin-top: 20px; width: 100%;">
                        ↩️ Назад к выбору трофея
                    </button>
                </div>
            `;
            actionsContainer.innerHTML = html;
            return;
        }
        
        monsters.sort((a, b) => {
            const levelA = a.level || this.calculateMonsterLevel(a);
            const levelB = b.level || this.calculateMonsterLevel(b);
            return levelA - levelB;
        });
        
        let html = `
            <div class="monster-selection">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: #00ffcc; margin: 0;">
                        🎯 Выберите монстра для охоты
                    </h3>
                    <button class="btn-control" onclick="window.game.systems.action.actionModules.hunt.showHuntTargetSelection(this.selectedCell)" 
                            style="padding: 5px 10px; font-size: 12px;">
                        ↩️ Назад
                    </button>
                </div>
                
                <div class="selected-resource-info" style="
                    background: rgba(0, 100, 255, 0.1);
                    border: 1px solid #00aaff;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 20px;
                    text-align: center;
                ">
                    <div style="font-size: 18px; color: #00aaff; margin-bottom: 5px;">
                        Цель охоты: ${resource.name}
                    </div>
                    <div style="color: #aaa; font-size: 12px;">
                        ${resource.description}
                    </div>
                </div>
                
                <div class="hunt-chance-info" style="
                    background: rgba(0, 0, 0, 0.4);
                    padding: 10px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                ">
                    <strong>Общий шанс успеха охоты:</strong> 
                    <span style="color: ${baseChance >= 70 ? '#44ff44' : baseChance >= 40 ? '#ffaa00' : '#ff4444'}">
                        ${baseChance}%
                    </span>
                    <p style="margin-top: 5px; font-size: 12px; color: #888;">
                        • 20-80% шанс встретить выбранного монстра<br>
                        • Если не удастся - встретите другого с тем же трофеем<br>
                        • В крайнем случае - любого случайного монстра
                    </p>
                </div>
                
                <div class="monsters-grid">
        `;
        
        monsters.forEach(monster => {
            const monsterLevel = monster.level || this.calculateMonsterLevel(monster);
            const huntChance = this.calculateMonsterHuntChance(monster, baseChance);
            
            let difficultyColor = '#44ff44';
            let difficultyText = 'Лёгкий';
            if (monsterLevel >= 3) {
                difficultyColor = '#ffaa00';
                difficultyText = 'Средний';
            }
            if (monsterLevel >= 5) {
                difficultyColor = '#ff4444';
                difficultyText = 'Сложный';
            }
            
            html += `
                <div class="monster-card" data-monster-id="${monster.id}">
                    <div class="monster-header">
                        <div class="monster-name" style="font-size: 16px; font-weight: bold; color: #fff;">
                            ${monster.name}
                        </div>
                        <div class="monster-difficulty" style="font-size: 11px; color: ${difficultyColor};">
                            ${difficultyText} (Ур. ${monsterLevel})
                        </div>
                    </div>
                    
                    <div class="monster-stats" style="margin: 10px 0; font-size: 12px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                            <span style="color: #ff6666;">❤️ Здоровье:</span>
                            <span style="color: #fff;">${monster.health}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                            <span style="color: #6666ff;">🛡️ Броня:</span>
                            <span style="color: #fff;">${monster.armor}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                            <span style="color: #ffaa00;">⚔️ Урон:</span>
                            <span style="color: #fff;">${monster.damage}</span>
                        </div>
                    </div>
                    
                    <div class="monster-loot" style="
                        background: rgba(0, 0, 0, 0.3);
                        border-radius: 6px;
                        padding: 8px;
                        margin: 10px 0;
                        font-size: 11px;
                    ">
                        <div style="color: #00ffcc; font-weight: bold; margin-bottom: 5px;">🎁 Гарантированный лут:</div>
                        <ul style="margin: 0; padding-left: 15px; color: #aaa;">
            `;
            
            if (monster.loot && monster.loot.guaranteed) {
                monster.loot.guaranteed.forEach(lootItem => {
                    if (lootItem.id === resourceId) {
                        html += `<li style="color: #44ff44;">${resource.name} × ${lootItem.quantity || 1}</li>`;
                    } else {
                        const extraResource = this.findResourceById(lootItem.id);
                        if (extraResource) {
                            html += `<li>${extraResource.name} × ${lootItem.quantity || 1}</li>`;
                        }
                    }
                });
            }
            
            html += `
                        </ul>
                    </div>
                    
                    <div class="monster-hunt-chance" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-top: 10px;
                        padding-top: 10px;
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                    ">
                        <span style="color: #aaa; font-size: 11px;">Шанс встретить именно этого:</span>
                        <div style="display: flex; align-items: center;">
                            <div style="
                                width: 40px;
                                height: 6px;
                                background: #333;
                                border-radius: 3px;
                                margin-right: 8px;
                                overflow: hidden;
                            ">
                                <div style="
                                    width: ${Math.min(80, Math.max(20, Math.round(100 / monsters.length) + (monsterLevel * 5)))}%;
                                    height: 100%;
                                    background: ${difficultyColor};
                                    border-radius: 3px;
                                "></div>
                            </div>
                            <span style="color: ${difficultyColor}; font-weight: bold; font-size: 14px;">
                                ${Math.min(80, Math.max(20, Math.round(100 / monsters.length) + (monsterLevel * 5)))}%
                            </span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <div class="hunt-explanation" style="
                    margin-top: 20px;
                    padding: 15px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    font-size: 12px;
                    color: #aaa;
                    border: 1px solid rgba(0, 255, 204, 0.3);
                ">
                    <strong style="color: #00ffcc;">📝 Как работает охота:</strong>
                    <p style="margin-top: 8px;">
                        1. <strong>Кликните на монстра</strong> чтобы выделить его зеленой рамкой<br>
                        2. <strong>Шанс встретить именно этого монстра:</strong> 20-80% (зависит от сложности)<br>
                        3. <strong>Если не удалось</strong> - встретите другого с тем же трофеем<br>
                        4. <strong>В крайнем случае</strong> - любого случайного монстра<br>
                        5. <strong>Награда:</strong> Получите "${resource.name}" только при победе
                    </p>
                </div>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
        
        this.styleMonsterSelection();
    }

    // ========== ЗАПУСК ОХОТЫ ==========

    performHuntForMonster(resourceId, monsterId, row, col) {
        console.log(`🔍 performHuntForMonster: resourceId=${resourceId}, monsterId=${monsterId}`);
        
        const resource = this.findResourceById(resourceId);
        if (!resource) {
            console.error(`Ресурс ${resourceId} не найден`);
            return;
        }
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            this.showNotification("❌ Не удалось начать охоту", 'error');
            return;
        }
        
        const monsterIdStr = monsterId.toString();
        const specificMonster = battleSystem.getMonsterById(monsterIdStr);
        
        if (!specificMonster) {
            console.error(`❌ Монстр с ID "${monsterIdStr}" не найден!`);
            this.showNotification("❌ Выбранный монстр не найден", 'error');
            return;
        }
        
        console.log(`✅ Найден монстр: ${specificMonster.name} (ID: "${specificMonster.id}")`);
        
        const allMonstersWithResource = this.getMonstersWithResource(resourceId);
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        const cellType = this.actionSystem.determineCellType(cell);
        const cellTypeData = this.actionSystem.cellTypes[cellType];
        const baseChance = this.actionSystem.getActionChance(this.config.id, cellType);
        
        let specificMonsterChance = 0;
        if (specificMonster && allMonstersWithResource.length > 0) {
            const baseSpecificChance = Math.max(20, Math.min(80, 100 / allMonstersWithResource.length));
            const monsterLevel = specificMonster.level || this.calculateMonsterLevel(specificMonster);
            const levelBonus = Math.min(30, monsterLevel * 5);
            specificMonsterChance = Math.min(80, baseSpecificChance + levelBonus);
        }
        
        const anyMonsterWithResourceChance = Math.min(95, baseChance + 10);
        const totalBattleChance = baseChance;
        
        console.log(`🏹 Охота за ${resource.name}:`);
        console.log(`   - Выбранный монстр: ${specificMonster.name}`);
        console.log(`   - Шанс встретить именно его: ${specificMonsterChance}%`);
        console.log(`   - Шанс встретить любого с трофеем: ${anyMonsterWithResourceChance}%`);
        console.log(`   - Общий шанс боя: ${totalBattleChance}%`);
        
        const roll = Math.random() * 100;
        let targetMonster = null;
        let huntType = 'none';
        
        if (roll <= specificMonsterChance) {
            targetMonster = specificMonster;
            huntType = 'specific';
            console.log(`🎯 Удача! Выследили именно ${specificMonster.name}`);
        } else if (roll <= anyMonsterWithResourceChance) {
            const otherMonsters = allMonstersWithResource.filter(m => m.id.toString() !== monsterIdStr);
            if (otherMonsters.length > 0) {
                targetMonster = otherMonsters[Math.floor(Math.random() * otherMonsters.length)];
                huntType = 'any_with_resource';
                console.log(`🎲 Встретили другого монстра с трофеем: ${targetMonster.name}`);
            } else {
                targetMonster = specificMonster;
                huntType = 'specific_fallback';
                console.log(`🎲 Нет других монстров, встретили ${specificMonster.name}`);
            }
        } else if (roll <= totalBattleChance) {
            const allMonsters = battleSystem.getAvailableMonsters();
            if (allMonsters.length > 0) {
                targetMonster = allMonsters[Math.floor(Math.random() * allMonsters.length)];
                huntType = 'any_monster';
                console.log(`👹 Встретили случайного монстра: ${targetMonster.name}`);
            }
        }
        
        if (targetMonster) {
            this.mapSystem.pendingAction = {
                action: 'hunt',
                row: row,
                col: col,
                cellTypeData: cellTypeData,
                targetResource: resource,
                targetMonster: targetMonster,
                originalTargetMonsterId: monsterIdStr,
                originalTargetMonster: specificMonster,
                huntType: huntType,
                specificMonsterChance: specificMonsterChance,
                anyMonsterChance: anyMonsterWithResourceChance,
                totalChance: totalBattleChance,
                huntRoll: roll
            };
            
            battleSystem.startBattleWithSpecificMonster(this.mapSystem.currentHero, targetMonster, 'hunt');
            
            let message = '';
            switch (huntType) {
                case 'specific':
                    message = `🏹 Удача! Вы выследили именно ${targetMonster.name} для добычи ${resource.name}`;
                    break;
                case 'any_with_resource':
                    message = `🎯 Вы наткнулись на ${targetMonster.name}, у которого тоже есть ${resource.name}`;
                    break;
                case 'any_monster':
                    message = `👹 Вы спугнули ${targetMonster.name}! Придется сражаться`;
                    break;
                default:
                    message = `⚔️ Начинается бой с ${targetMonster.name}`;
            }
            
            this.showNotification(message, huntType === 'specific' ? 'success' : 'info');
        } else {
            console.log(`❌ Охота провалилась - не удалось найти дичь`);
            this.showNotification("❌ Не удалось найти дичь для охоты", 'warning');
            
            setTimeout(() => {
                const cell = this.mapSystem.currentTacticalMap?.cells[`${col},${row}`];
                if (cell) {
                    this.showHuntTargetSelection(cell);
                }
            }, 1000);
        }
    }

    // ========== ОБРАБОТКА РЕЗУЛЬТАТОВ ОХОТЫ ==========

    completeHuntAfterBattle(victory, escape, doubleLoot = false) {
        console.log(`🏹 HuntAction: Завершение охоты: победа=${victory}, побег=${escape}, двойной лут=${doubleLoot}`);
        
        if (!this.mapSystem.pendingAction || this.mapSystem.pendingAction.action !== 'hunt') {
            console.error("❌ Нет ожидающего действия охоты");
            return;
        }
        
        const { row, col, targetResource, wasSuccess, wasFailure } = this.mapSystem.pendingAction;
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (victory) {
            if (wasSuccess) {
                this.addResourceFromHunt(targetResource, doubleLoot);
                this.showNotification(`🎉 Успешная охота! Получен: ${targetResource.name}${doubleLoot ? ' (двойной лут!)' : ''}`, 'success');
                
                if (cell) {
                    cell.explored = true;
                    cell.hasAction = false;
                }
            } else {
                const randomResource = this.getRandomHuntResource();
                if (randomResource) {
                    this.addResourceFromHunt(randomResource, false);
                    this.showNotification(`🎉 Победа в бою! Получен случайный трофей: ${randomResource.name}`, 'success');
                }
            }
            
            if (wasFailure && cell) {
                this.applyDoubleHuntPenalty(cell);
            }
        } else {
            if (escape) {
                this.showNotification("🏃 Вы сбежали с поля боя", 'warning');
            } else {
                this.showNotification("💀 Вы проиграли бой", 'error');
            }
            
            if (wasFailure && cell) {
                this.applyDoubleHuntPenalty(cell);
            }
        }
        
        this.mapSystem.pendingAction = null;
        
        setTimeout(() => {
            if (cell && this.actionSystem) {
                this.actionSystem.updateCellActionsUI(cell);
                this.actionSystem.highlightSelectedCell(cell);
            }
        }, 500);
        
        if (window.game && window.game.saveGame) {
            window.game.saveGame();
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    getMonstersWithResource(resourceId) {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return [];
        
        const allMonsters = battleSystem.monsters || [];
        const matchingMonsters = allMonsters.filter(monster => {
            if (!monster.loot || !monster.loot.guaranteed) return false;
            return monster.loot.guaranteed.some(lootItem => lootItem.id === resourceId);
        });
        
        console.log(`🎯 Найдено ${matchingMonsters.length} монстров с ресурсом ${resourceId}`);
        return matchingMonsters;
    }

    findResourceById(resourceId) {
        for (const category in this.actionSystem.resources) {
            const resource = this.actionSystem.resources[category].find(r => r.id === resourceId);
            if (resource) return resource;
        }
        return null;
    }

    groupHuntableResources() {
        return {
            'bones': {
                description: 'Кости животных для ремесла и алхимии',
                resources: [
                    this.findResourceById('small_bone'),
                    this.findResourceById('wolf_bone'),
                    this.findResourceById('horse_bone'),
                    this.findResourceById('bull_bone'),
                    this.findResourceById('mammoth_bone'),
                    this.findResourceById('dragon_bone')
                ].filter(r => r !== null)
            },
            'leathers': {
                description: 'Кожи животных для брони и снаряжения',
                resources: [
                    this.findResourceById('thin_leather'),
                    this.findResourceById('strong_leather'),
                    this.findResourceById('thick_leather'),
                    this.findResourceById('bull_leather'),
                    this.findResourceById('lizard_leather'),
                    this.findResourceById('dragon_leather')
                ].filter(r => r !== null)
            },
            'hides': {
                description: 'Шкуры животных для теплой одежды',
                resources: [
                    this.findResourceById('thin_hide'),
                    this.findResourceById('strong_hide'),
                    this.findResourceById('thick_hide'),
                    this.findResourceById('tiger_hide'),
                    this.findResourceById('bear_hide'),
                    this.findResourceById('dragon_hide')
                ].filter(r => r !== null)
            },
            'furs': {
                description: 'Мех животных для роскошной одежды',
                resources: [
                    this.findResourceById('hare_fur'),
                    this.findResourceById('marten_fur'),
                    this.findResourceById('arctic_fox_fur'),
                    this.findResourceById('lynx_fur'),
                    this.findResourceById('leopard_fur'),
                    this.findResourceById('mammoth_fur')
                ].filter(r => r !== null)
            }
        };
    }

    calculateMonsterLevel(monster) {
        const healthLevel = Math.floor(monster.health / 100);
        const armorLevel = Math.floor(monster.armor / 10);
        const damageLevel = Math.floor(monster.damage / 30);
        return Math.max(1, Math.min(10, Math.round((healthLevel + armorLevel + damageLevel) / 3)));
    }

    calculateMonsterHuntChance(monster, baseChance) {
        const monsterLevel = monster.level || this.calculateMonsterLevel(monster);
        const levelPenalty = Math.max(0.1, 1 - (monsterLevel * 0.05));
        const chance = Math.round(baseChance * levelPenalty);
        return Math.min(100, Math.max(5, chance));
    }

    addResourceFromHunt(resource, doubleLoot) {
        if (!this.mapSystem.currentHero) return;
        
        const actionSystem = window.game?.systems?.action;
        if (!actionSystem) return;
        
        let quantity = 1;
        if (doubleLoot) {
            quantity = 2;
            console.log(`🎁 ДВОЙНОЙ ЛУТ! Добавляем ${quantity}x ${resource.name}`);
        }
        
        actionSystem.addResourceToHero(resource.id, resource.name, quantity, this.getResourceType(resource));
    }

    getRandomHuntResource() {
        const actionSystem = window.game?.systems?.action;
        if (!actionSystem || !actionSystem.resources) return null;
        
        const allHuntResources = [];
        
        if (Array.isArray(actionSystem.resources.bones)) {
            allHuntResources.push(...actionSystem.resources.bones);
        }
        if (Array.isArray(actionSystem.resources.leathers)) {
            allHuntResources.push(...actionSystem.resources.leathers);
        }
        if (Array.isArray(actionSystem.resources.hides)) {
            allHuntResources.push(...actionSystem.resources.hides);
        }
        if (Array.isArray(actionSystem.resources.furs)) {
            allHuntResources.push(...actionSystem.resources.furs);
        }
        
        if (allHuntResources.length === 0) return null;
        
        const weightedResources = allHuntResources.map(resource => {
            const price = resource.price || resource.value || 10;
            const weight = Math.max(1, 100 - price);
            return { resource, weight };
        });
        
        const totalWeight = weightedResources.reduce((sum, item) => sum + item.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const item of weightedResources) {
            if (random < item.weight) {
                return item.resource;
            }
            random -= item.weight;
        }
        
        return weightedResources[0].resource;
    }

    getResourceType(resource) {
        if (resource.id.includes('bone')) return 'bones';
        if (resource.id.includes('leather')) return 'leathers';
        if (resource.id.includes('hide')) return 'hides';
        if (resource.id.includes('fur')) return 'furs';
        return 'loot';
    }

    applyDoubleHuntPenalty(cell) {
        const cellType = this.actionSystem.determineCellType(cell);
        const cellTypeData = this.actionSystem.cellTypes[cellType];
        
        if (!cellTypeData || !cellTypeData.action_chances) return;
        
        Object.keys(cellTypeData.action_chances).forEach(action => {
            if (cellTypeData.action_chances[action] > 0) {
                const originalChance = cellTypeData.original_chances?.[action] || cellTypeData.action_chances[action] + 5;
                const newChance = Math.max(1, originalChance - 10);
                cellTypeData.action_chances[action] = newChance;
            }
        });
        
        console.log(`📉 УДВОЕННЫЙ штраф применен к клетке [${cell.col},${cell.row}]`);
        
        if (!cellTypeData.original_chances) {
            cellTypeData.original_chances = { ...cellTypeData.action_chances };
        }
        
        cellTypeData.hunt_failure_penalty = true;
        cellTypeData.double_penalty = true;
    }

    // ========== СТИЛИЗАЦИЯ ИНТЕРФЕЙСА ==========

    styleHuntTargetSelection() {
        setTimeout(() => {
            const grid = document.querySelector('.hunt-targets-grid');
            if (grid) {
                grid.style.cssText = `
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                    margin-bottom: 15px;
                `;
            }
            
            const items = document.querySelectorAll('.hunt-target-item');
            items.forEach(item => {
                item.style.cssText = `
                    background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9));
                    border: 1px solid #00aaff;
                    border-radius: 8px;
                    padding: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    height: 100%;
                `;
                
                item.onmouseenter = () => {
                    item.style.transform = 'translateY(-2px)';
                    item.style.boxShadow = '0 5px 15px rgba(0, 170, 255, 0.3)';
                };
                item.onmouseleave = () => {
                    item.style.transform = 'translateY(0)';
                    item.style.boxShadow = 'none';
                };
            });
        }, 50);
    }

    styleMonsterSelection() {
        setTimeout(() => {
            const grid = document.querySelector('.monsters-grid');
            if (grid) {
                grid.style.cssText = `
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin-bottom: 20px;
                `;
            }
            
            const cards = document.querySelectorAll('.monster-card');
            cards.forEach(card => {
                card.style.cssText = `
                    background: linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(20, 25, 45, 0.95));
                    border: 1px solid #00aaff;
                    border-radius: 8px;
                    padding: 15px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin: 2px;
                `;
                
                card.onmouseenter = () => {
                    card.style.transform = 'translateY(-3px)';
                    card.style.boxShadow = '0 8px 20px rgba(0, 170, 255, 0.4)';
                    card.style.border = '2px solid #00ffff';
                    card.style.zIndex = '10';
                };
                
                card.onmouseleave = () => {
                    card.style.transform = 'translateY(0)';
                    card.style.boxShadow = 'none';
                    card.style.border = '1px solid #00aaff';
                    card.style.zIndex = '1';
                };
                
                card.onclick = (e) => {
                    e.stopPropagation();
                    
                    cards.forEach(c => {
                        c.style.border = '1px solid #00aaff';
                        c.style.background = 'linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(20, 25, 45, 0.95))';
                        c.style.boxShadow = 'none';
                        c.style.transform = 'translateY(0)';
                    });
                    
                    card.style.border = '3px solid #00ff00';
                    card.style.background = 'linear-gradient(135deg, rgba(30, 46, 30, 0.95), rgba(20, 45, 20, 0.95))';
                    card.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.5)';
                    card.style.transform = 'scale(1.02)';
                    
                    const monsterId = card.getAttribute('data-monster-id');
                    console.log(`🎯 Выбран монстр с ID: ${monsterId}`);
                    
                    const originalBackground = card.style.background;
                    const originalBorder = card.style.border;
                    const originalShadow = card.style.boxShadow;
                    
                    card.style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.8)';
                    
                    setTimeout(() => {
                        card.style.boxShadow = originalShadow;
                    }, 200);
                    
                    setTimeout(() => {
                        card.style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.8)';
                    }, 400);
                    
                    setTimeout(() => {
                        const resourceId = document.querySelector('.selected-resource-info').textContent.match(/Цель охоты: (.+)/)[1];
                        const resource = this.findResourceById(this.getResourceIdByName(resourceId));
                        if (resource) {
                            console.log(`🏹 Начинаем охоту на монстра ${monsterId} за ресурс ${resource.id}`);
                            this.performHuntForMonster(resource.id, monsterId, 
                                this.mapSystem.pendingAction?.row || 0, 
                                this.mapSystem.pendingAction?.col || 0);
                        }
                    }, 600);
                };
            });
            
            const style = document.createElement('style');
            style.textContent = `
                .monster-card {
                    position: relative;
                    overflow: hidden;
                }
                
                .monster-card.selected {
                    animation: pulseSelected 1s ease-in-out infinite alternate;
                }
                
                @keyframes pulseSelected {
                    from {
                        box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
                    }
                    to {
                        box-shadow: 0 0 25px rgba(0, 255, 0, 0.8);
                    }
                }
                
                .monster-card:hover {
                    z-index: 100;
                }
            `;
            document.head.appendChild(style);
            
        }, 50);
    }

    getResourceIdByName(name) {
        for (const category in this.actionSystem.resources) {
            for (const resource of this.actionSystem.resources[category]) {
                if (resource.name === name) {
                    return resource.id;
                }
            }
        }
        return '';
    }

    showNotification(message, type = 'info') {
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Глобальная регистрация модуля
if (window.ActionSystem) {
    // Автоматическая регистрация при загрузке модуля
    const originalActionSystem = window.ActionSystem;
    window.ActionSystem = class extends originalActionSystem {
        constructor(mapSystem) {
            super(mapSystem);
            
            // Автоматически создаем экземпляр HuntAction при создании ActionSystem
            setTimeout(() => {
                if (!this.actionModules['hunt'] && window.HuntAction) {
                    this.actionModules['hunt'] = new window.HuntAction(this);
                    console.log("✅ HuntAction автоматически зарегистрирован в ActionSystem");
                }
            }, 100);
        }
    };
}

// Экспорт класса
window.HuntAction = HuntAction;
console.log("📦 HuntAction модуль загружен и готов к регистрации");
