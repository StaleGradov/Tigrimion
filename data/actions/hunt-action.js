"use strict";

class HuntAction {
    constructor(actionSystem) {
        this.actionSystem = actionSystem;
        this.mapSystem = actionSystem ? actionSystem.mapSystem : null;
        
        // Конфигурация действий охоты
        this.configs = {
            'hunt': {
                id: 'hunt',
                icon: '🏹',
                name: 'Охотиться',
                description: 'Выследить и добыть дичь. Приводит к бою с монстром. Награда: двойной лут с монстра',
                class: 'action-hunt',
                triggers_monster: true,
                monster_level_multiplier: 1.0,
                always_monster: true,
                double_loot: true,
                requires_module: 'hunt'
            },
            'hunt_caravan': {
                id: 'hunt_caravan',
                icon: '🏹',
                name: 'Охотиться на караван',
                description: 'Подкараулить торговый караван для нападения',
                class: 'action-hunt',
                triggers_monster: true,
                monster_level_multiplier: 1.5,
                requires_module: 'hunt'
            }
        };
        
        this.selectedResourceId = null;
        this.selectedRow = null;
        this.selectedCol = null;
        
        // Регистрируем модуль в ActionSystem
        if (actionSystem) {
            actionSystem.registerModule('hunt', this);
            console.log("✅ HuntAction зарегистрирован в ActionSystem");
        }
    }

    // ========== МЕТОДЫ МОДУЛЯ ==========

    getSupportedActions() {
        return Object.keys(this.configs);
    }

    async execute(actionKey, row, col) {
        console.log(`🏹 HuntAction.execute(${actionKey}): Начало на [${col},${row}]`);
        
        if (!this.mapSystem) {
            console.error("❌ MapSystem не доступна");
            this.showNotification("❌ Система карт не доступна", 'error');
            return;
        }
        
        // Получаем клетку
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (!cell) {
            console.error("❌ Клетка не найдена");
            this.showNotification("❌ Клетка не найдена!", 'error');
            return;
        }
        
        // Проверяем, исследована ли клетка
        if (cell.explored === true) {
            console.warn(`⚠️ Клетка [${col},${row}] уже исследована`);
            this.showNotification("❌ Эта клетка уже исследована!", 'warning');
            return;
        }
        
        // Проверяем достижимость
        if (!this.mapSystem.isCellReachable(cell)) {
            console.warn(`⚠️ Клетка [${col},${row}] недостижима`);
            this.showNotification("❌ Клетка недостижима для охоты!", 'warning');
            return;
        }
        
        // Сохраняем выбранную клетку
        this.selectedRow = row;
        this.selectedCol = col;
        
        // Показываем выбор трофея
        await this.showHuntTargetSelection(cell, actionKey);
    }

    // ========== ВЫБОР ТРОФЕЯ ==========

    async showHuntTargetSelection(cell, actionKey = 'hunt') {
        console.log("🎯 Показываем выбор трофея для охоты");
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) {
            console.error("❌ Контейнер действий не найден");
            return;
        }
        
        // Проверяем есть ли ресурсы в ActionSystem
        const actionSystem = this.actionSystem;
        const resources = actionSystem ? actionSystem.resources : {};
        
        // Категории охотничьих ресурсов
        const huntCategories = [
            { key: 'bones', name: '🦴 Кости', icon: '🦴' },
            { key: 'leathers', name: '🐂 Кожи', icon: '🐂' },
            { key: 'hides', name: '🐅 Шкуры', icon: '🐅' },
            { key: 'furs', name: '🦊 Меха', icon: '🦊' }
        ];
        
        let html = `
            <div class="hunt-target-selection">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="color: #00ffcc; margin: 0;">
                        🏹 ВЫБЕРИТЕ ТРОФЕЙ ДЛЯ ОХОТЫ
                    </h3>
                    <button class="btn-control" onclick="this.startQuickHunt(${cell.row}, ${cell.col}, '${actionKey}')" 
                            style="padding: 5px 10px; font-size: 12px;">
                        🏹 Быстрая охота
                    </button>
                </div>
                
                <p style="text-align: center; color: #aaa; margin-bottom: 20px;">
                    Клетка [${cell.col}, ${cell.row}] - ${this.configs[actionKey].name}
                </p>
                
                <div class="hunt-categories">
        `;
        
        let hasResources = false;
        
        // Для каждой категории
        huntCategories.forEach(category => {
            const categoryResources = resources[category.key] || [];
            
            if (categoryResources.length > 0) {
                hasResources = true;
                html += `
                    <div class="hunt-category">
                        <h4 style="color: #00aaff; margin: 15px 0 10px 0;">
                            ${category.icon} ${category.name}
                        </h4>
                        <div class="hunt-targets-grid">
                `;
                
                // Показываем ресурсы из категории
                categoryResources.slice(0, 3).forEach(resource => {
                    html += `
                        <div class="hunt-target-item" 
                             onclick="window.game.systems.action.actionModules.hunt.selectResource('${resource.id}', ${cell.row}, ${cell.col}, '${actionKey}')">
                            <div class="hunt-target-name" style="font-size: 16px; margin-bottom: 5px;">
                                ${resource.name}
                            </div>
                            <div class="hunt-target-description" style="font-size: 11px; color: #aaa;">
                                ${resource.description || 'Охотничий трофей'}
                            </div>
                            ${resource.price ? `
                                <div class="hunt-target-price" style="font-size: 10px; color: #f59e0b; margin-top: 5px;">
                                    Цена: ${resource.price} золота
                                </div>
                            ` : ''}
                        </div>
                    `;
                });
                
                html += `
                        </div>
                    </div>
                `;
            }
        });
        
        // Если нет ресурсов
        if (!hasResources) {
            html += `
                <div style="text-align: center; padding: 20px; color: #ffaa00;">
                    <p>⚠️ Ресурсы не загружены</p>
                    <button class="btn-control" onclick="this.startQuickHunt(${cell.row}, ${cell.col}, '${actionKey}')" 
                            style="margin-top: 10px;">
                        🏹 Начать быструю охоту
                    </button>
                </div>
            `;
        }
        
        html += `
                </div>
                
                <div class="hunt-instructions" style="
                    margin-top: 20px;
                    padding: 15px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    border: 1px solid rgba(0, 255, 204, 0.3);
                    font-size: 12px;
                    color: #aaa;
                ">
                    <strong style="color: #00ffcc;">📝 Как работает охота:</strong>
                    <p style="margin-top: 8px;">
                        1. <strong>Выберите трофей</strong> для охоты<br>
                        2. <strong>Выберите монстра</strong> с этим трофеем<br>
                        3. <strong>Начинается бой</strong> с выбранным монстром<br>
                        4. <strong>При победе</strong> вы получите выбранный трофей<br>
                        5. <strong>Двойной лут</strong> - особенность охоты
                    </p>
                </div>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
        
        // Стилизация
        this.styleHuntTargetSelection();
        
        // Добавляем обработчики
        this.attachHuntEventListeners(cell, actionKey);
    }

    attachHuntEventListeners(cell, actionKey) {
        // Используем setTimeout чтобы DOM успел обновиться
        setTimeout(() => {
            // Обработчик для быстрой охоты
            const quickHuntBtn = actionsContainer.querySelector('.btn-control[onclick*="startQuickHunt"]');
            if (quickHuntBtn) {
                quickHuntBtn.onclick = () => this.startQuickHunt(cell.row, cell.col, actionKey);
            }
            
            // Обработчики для выбора ресурсов
            const resourceItems = document.querySelectorAll('.hunt-target-item');
            resourceItems.forEach(item => {
                const onclickAttr = item.getAttribute('onclick');
                if (onclickAttr) {
                    // Извлекаем параметры из onclick
                    const match = onclickAttr.match(/selectResource\('([^']+)',\s*(\d+),\s*(\d+),\s*'([^']+)'\)/);
                    if (match) {
                        const [_, resourceId, row, col, action] = match;
                        item.onclick = () => this.selectResource(resourceId, parseInt(row), parseInt(col), action);
                    }
                }
            });
        }, 50);
    }

    // ========== ВЫБОР РЕСУРСА ==========

    selectResource(resourceId, row, col, actionKey = 'hunt') {
        console.log(`🎯 Выбран ресурс: ${resourceId} на [${col},${row}] для действия ${actionKey}`);
        
        this.selectedResourceId = resourceId;
        this.selectedRow = row;
        this.selectedCol = col;
        this.currentActionKey = actionKey;
        
        this.showMonstersForResource(resourceId, row, col, actionKey);
    }

    // ========== ВЫБОР МОНСТРА ==========

    async showMonstersForResource(resourceId, row, col, actionKey = 'hunt') {
        console.log(`🔍 Ищем монстров с ресурсом: ${resourceId} для действия ${actionKey}`);
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem || !battleSystem.monsters) {
            console.error("❌ BattleSystem или монстры не найдены");
            this.showNotification("❌ Система боя не доступна", 'error');
            return;
        }
        
        // Находим монстров у которых в луте есть этот ресурс
        const monstersWithResource = battleSystem.monsters.filter(monster => {
            if (!monster.loot || !monster.loot.guaranteed) return false;
            return monster.loot.guaranteed.some(loot => loot.id === resourceId);
        });
        
        console.log(`🎯 Найдено ${monstersWithResource.length} монстров с ресурсом ${resourceId}`);
        
        // Находим информацию о ресурсе
        const actionSystem = this.actionSystem;
        let resourceInfo = null;
        if (actionSystem && actionSystem.resources) {
            for (const category in actionSystem.resources) {
                const found = actionSystem.resources[category]?.find(r => r.id === resourceId);
                if (found) {
                    resourceInfo = found;
                    break;
                }
            }
        }
        
        // Если нет монстров с этим ресурсом
        if (monstersWithResource.length === 0) {
            actionsContainer.innerHTML = `
                <div class="no-monsters">
                    <h3 style="color: #ff4444; text-align: center; margin-bottom: 15px;">
                        🚫 Нет подходящих монстров
                    </h3>
                    <p style="text-align: center; color: #aaa;">
                        Для трофея "${resourceInfo?.name || resourceId}" нет монстров с гарантированным выпадением.
                    </p>
                    <button class="btn-control" onclick="window.game.systems.action.actionModules.hunt.showHuntTargetSelection(${JSON.stringify({col: col, row: row})}, '${actionKey}')" 
                            style="margin-top: 20px; width: 100%;">
                        ↩️ Назад к выбору трофея
                    </button>
                </div>
            `;
            
            // Добавляем обработчик
            setTimeout(() => {
                const backBtn = actionsContainer.querySelector('.btn-control');
                if (backBtn) {
                    backBtn.onclick = () => this.showHuntTargetSelection({col, row}, actionKey);
                }
            }, 50);
            
            return;
        }
        
        // Сортируем монстров по уровню
        monstersWithResource.sort((a, b) => {
            const levelA = a.level || this.calculateMonsterLevel(a);
            const levelB = b.level || this.calculateMonsterLevel(b);
            return levelA - levelB;
        });
        
        // Создаем HTML для выбора монстра
        let html = `
            <div class="monster-selection">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: #00ffcc; margin: 0;">
                        🎯 ВЫБЕРИТЕ МОНСТРА ДЛЯ ОХОТЫ
                    </h3>
                    <button class="btn-control" onclick="window.game.systems.action.actionModules.hunt.showHuntTargetSelection(${JSON.stringify({col: col, row: row})}, '${actionKey}')" 
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
                        Цель охоты: ${resourceInfo?.name || resourceId}
                    </div>
                    ${resourceInfo?.description ? `
                        <div style="color: #aaa; font-size: 12px;">
                            ${resourceInfo.description}
                        </div>
                    ` : ''}
                </div>
                
                <div class="monsters-grid">
        `;
        
        // Для каждого монстра
        monstersWithResource.forEach(monster => {
            const monsterLevel = monster.level || this.calculateMonsterLevel(monster);
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
            
            // Находим количество ресурса у монстра
            const lootItem = monster.loot.guaranteed.find(l => l.id === resourceId);
            const resourceCount = lootItem?.quantity || 1;
            
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
                        <div style="display: flex; justify-content: space-between;">
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
                        <div style="color: #44ff44;">
                            ${resourceInfo?.name || resourceId} × ${resourceCount}
                            ${actionKey === 'hunt' ? ' (двойной лут!)' : ''}
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 15px;">
                        <button class="btn-control hunt-monster-btn" 
                                data-resource-id="${resourceId}"
                                data-monster-id="${monster.id}"
                                data-row="${row}"
                                data-col="${col}"
                                data-action="${actionKey}"
                                style="padding: 8px 15px; font-size: 12px; background: linear-gradient(135deg, ${difficultyColor}, ${difficultyColor}99);">
                            🏹 Охотиться на этого
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <div class="hunt-warning" style="
                    margin-top: 20px;
                    padding: 15px;
                    background: rgba(255, 100, 100, 0.1);
                    border: 1px solid rgba(255, 100, 100, 0.3);
                    border-radius: 8px;
                    font-size: 12px;
                    color: #ffcccc;
                ">
                    <strong style="color: #ff6666;">⚠️ Внимание:</strong>
                    <p style="margin-top: 8px;">
                        Охота всегда приводит к бою с выбранным монстром.
                        При поражении вы потеряете здоровье и вернетесь на стартовую позицию.
                    </p>
                </div>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
        
        // Стилизация
        this.styleMonsterSelection();
        
        // Добавляем обработчики
        this.attachMonsterEventListeners();
    }

    attachMonsterEventListeners() {
        setTimeout(() => {
            // Обработчик для кнопки назад
            const backBtn = actionsContainer.querySelector('.btn-control[onclick*="showHuntTargetSelection"]');
            if (backBtn) {
                const match = backBtn.getAttribute('onclick').match(/showHuntTargetSelection\((.*?), '(.*?)'\)/);
                if (match) {
                    const cellData = JSON.parse(match[1]);
                    const actionKey = match[2];
                    backBtn.onclick = () => this.showHuntTargetSelection(cellData, actionKey);
                }
            }
            
            // Обработчики для кнопок охоты
            const huntButtons = document.querySelectorAll('.hunt-monster-btn');
            huntButtons.forEach(button => {
                button.onclick = () => {
                    const resourceId = button.getAttribute('data-resource-id');
                    const monsterId = button.getAttribute('data-monster-id');
                    const row = parseInt(button.getAttribute('data-row'));
                    const col = parseInt(button.getAttribute('data-col'));
                    const actionKey = button.getAttribute('data-action');
                    
                    this.startHuntWithMonster(resourceId, monsterId, row, col, actionKey);
                };
            });
        }, 50);
    }

    // ========== ЗАПУСК ОХОТЫ ==========

    async startHuntWithMonster(resourceId, monsterId, row, col, actionKey = 'hunt') {
        console.log(`🏹 Начинаем охоту на монстра ${monsterId} за ресурс ${resourceId} на [${col},${row}]`);
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            this.showNotification("❌ Система боя не доступна", 'error');
            return;
        }
        
        // Получаем героя
        const hero = this.mapSystem ? this.mapSystem.currentHero : window.game?.currentHero;
        if (!hero) {
            console.error("❌ Герой не найден");
            this.showNotification("❌ Герой не найден!", 'error');
            return;
        }
        
        // Находим монстра
        const monster = battleSystem.getMonsterById(monsterId);
        if (!monster) {
            console.error(`❌ Монстр с ID ${monsterId} не найден`);
            this.showNotification("❌ Монстр не найден!", 'error');
            return;
        }
        
        // Находим информацию о ресурсе
        let resourceInfo = null;
        if (this.actionSystem && this.actionSystem.resources) {
            for (const category in this.actionSystem.resources) {
                const found = this.actionSystem.resources[category]?.find(r => r.id === resourceId);
                if (found) {
                    resourceInfo = found;
                    break;
                }
            }
        }
        
        // Сохраняем информацию для послебоевой обработки
        if (this.mapSystem) {
            this.mapSystem.pendingAction = {
                action: actionKey,
                row: row,
                col: col,
                targetResource: resourceInfo || { id: resourceId, name: 'Трофей' },
                targetMonster: monster,
                wasSuccess: true,
                doubleLoot: actionKey === 'hunt' // Двойной лут только для обычной охоты
            };
        }
        
        console.log(`🏹 Начинаем охоту на ${monster.name} за ${resourceInfo?.name || resourceId}`);
        this.showNotification(`🏹 Начинается охота на ${monster.name}!`, 'info');
        
        // Начинаем бой
        battleSystem.startBattleWithSpecificMonster(hero, monster, actionKey);
    }

    // ========== БЫСТРАЯ ОХОТА (без выбора) ==========

    async startQuickHunt(row, col, actionKey = 'hunt') {
        console.log(`🏹 Быстрая охота на [${col},${row}]`);
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            this.showNotification("❌ Система боя не доступна", 'error');
            return;
        }
        
        // Получаем героя
        const hero = this.mapSystem ? this.mapSystem.currentHero : window.game?.currentHero;
        if (!hero) {
            console.error("❌ Герой не найден");
            this.showNotification("❌ Герой не найден!", 'error');
            return;
        }
        
        // Выбираем случайный ресурс из охотничьих категорий
        let randomResource = null;
        if (this.actionSystem && this.actionSystem.resources) {
            const huntCategories = ['bones', 'leathers', 'hides', 'furs'];
            for (const category of huntCategories) {
                const resources = this.actionSystem.resources[category];
                if (resources && resources.length > 0) {
                    randomResource = resources[Math.floor(Math.random() * resources.length)];
                    break;
                }
            }
        }
        
        // Выбираем случайного монстра
        const randomMonster = battleSystem.getRandomMonsterForMovement();
        if (!randomMonster) {
            console.error("❌ Нет доступных монстров");
            this.showNotification("❌ Нет подходящих монстров для охоты", 'error');
            return;
        }
        
        // Сохраняем информацию
        if (this.mapSystem) {
            this.mapSystem.pendingAction = {
                action: actionKey,
                row: row,
                col: col,
                targetResource: randomResource,
                targetMonster: randomMonster,
                wasSuccess: true,
                doubleLoot: actionKey === 'hunt',
                isQuickHunt: true
            };
        }
        
        console.log(`🏹 Быстрая охота на ${randomMonster.name}`);
        this.showNotification(`🏹 Быстрая охота на ${randomMonster.name}!`, 'info');
        
        battleSystem.startBattleWithSpecificMonster(hero, randomMonster, actionKey);
    }

    // ========== ОБРАБОТКА РЕЗУЛЬТАТОВ ==========

    async completeHuntAfterBattle(victory, escape, doubleLoot = false, isQuickHunt = false) {
        console.log(`🏹 Завершение охоты: победа=${victory}, побег=${escape}, двойной лут=${doubleLoot}, быстрая=${isQuickHunt}`);
        
        if (!this.mapSystem || !this.mapSystem.pendingAction || 
            (this.mapSystem.pendingAction.action !== 'hunt' && this.mapSystem.pendingAction.action !== 'hunt_caravan')) {
            console.error("❌ Нет ожидающего действия охоты");
            return;
        }
        
        const { row, col, targetResource, wasSuccess, action } = this.mapSystem.pendingAction;
        
        if (victory && wasSuccess && targetResource) {
            // Добавляем ресурс герою
            await this.addResourceToHero(targetResource, doubleLoot ? 2 : 1);
            
            let message = `🎉 Успешная охота! Получен: ${targetResource.name}`;
            if (doubleLoot) {
                message += ' (двойной лут!)';
            }
            if (isQuickHunt) {
                message = `🎉 Быстрая охота успешна! Получен: ${targetResource.name}`;
            }
            
            this.showNotification(message, 'success');
            
            // Помечаем клетку как исследованную
            const cellKey = `${col},${row}`;
            const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
            if (cell) {
                cell.explored = true;
            }
        } else if (victory) {
            this.showNotification("🎉 Победа в бою!", 'success');
        } else if (escape) {
            this.showNotification("🏃 Вы сбежали с поля боя", 'warning');
        } else {
            this.showNotification("💀 Вы проиграли бой", 'error');
        }
        
        this.mapSystem.pendingAction = null;
        
        // Обновляем интерфейс
        setTimeout(() => {
            const cellKey = `${col},${row}`;
            const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
            if (cell && this.actionSystem) {
                this.actionSystem.updateCellActionsUI(cell);
            }
        }, 500);
        
        // Сохраняем игру
        if (window.game && window.game.saveGame) {
            window.game.saveGame();
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    calculateMonsterLevel(monster) {
        const healthLevel = Math.floor(monster.health / 100);
        const armorLevel = Math.floor(monster.armor / 10);
        const damageLevel = Math.floor(monster.damage / 30);
        return Math.max(1, Math.min(10, Math.round((healthLevel + armorLevel + damageLevel) / 3)));
    }

    async addResourceToHero(resource, quantity = 1) {
        if (!this.mapSystem || !this.mapSystem.currentHero) return;
        
        const actionSystem = this.actionSystem || window.game?.systems?.action;
        if (!actionSystem || !actionSystem.addResourceToHero) return;
        
        actionSystem.addResourceToHero(resource.id, resource.name, quantity, this.getResourceType(resource));
    }

    getResourceType(resource) {
        if (resource.id.includes('bone')) return 'bones';
        if (resource.id.includes('leather')) return 'leathers';
        if (resource.id.includes('hide')) return 'hides';
        if (resource.id.includes('fur')) return 'furs';
        return 'loot';
    }

    showNotification(message, type = 'info') {
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // ========== СТИЛИЗАЦИЯ ==========

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
                `;
            });
        }, 50);
    }
}

// Глобальная регистрация модуля
if (typeof window !== 'undefined') {
    window.HuntAction = HuntAction;
    console.log("📦 HuntAction модуль зарегистрирован глобально");
}

// Автоматическая регистрация в существующем ActionSystem
if (window.game && window.game.systems && window.game.systems.action) {
    setTimeout(() => {
        const actionSystem = window.game.systems.action;
        if (actionSystem && !actionSystem.actionModules['hunt']) {
            try {
                actionSystem.actionModules['hunt'] = new HuntAction(actionSystem);
                console.log("✅ HuntAction автоматически зарегистрирован в ActionSystem");
            } catch (error) {
                console.error("❌ Ошибка автоматической регистрации HuntAction:", error);
            }
        }
    }, 100);
}
