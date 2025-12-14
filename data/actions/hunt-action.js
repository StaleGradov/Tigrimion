"use strict";

class HuntAction {
    constructor(actionSystem) {
        // Безопасная проверка параметров
        if (!actionSystem) {
            console.error("❌ HuntAction: actionSystem не передан!");
            throw new Error("HuntAction требует actionSystem");
        }
        
        this.actionSystem = actionSystem;
        this.mapSystem = actionSystem.mapSystem;
        
        // Конфигурация действия
        this.config = {
            id: 'hunt',
            icon: '🏹',
            name: 'Охотиться',
            description: 'Выследить и добыть дичь. Приводит к бою с монстром. Награда: двойной лут с монстра',
            class: 'action-hunt',
            resource_type: 'loot',
            baseChance: 70,
            triggers_monster: true,
            monster_level_multiplier: 1.0,
            always_monster: true,
            double_loot: true,
            isComplexAction: true
        };
        
        // Данные для текущей охоты
        this.currentHuntData = null;
        
        // Регистрируем модуль в ActionSystem
        try {
            if (actionSystem && actionSystem.registerModule) {
                actionSystem.registerModule('hunt', this);
                console.log("✅ HuntAction зарегистрирован в ActionSystem");
            } else {
                console.warn("⚠️ ActionSystem не поддерживает registerModule");
            }
        } catch (error) {
            console.error("❌ Ошибка регистрации HuntAction:", error);
        }
        
        console.log("🏹 HuntAction модуль инициализирован");
    }

    // ========== ОСНОВНОЙ МЕТОД ВЫПОЛНЕНИЯ ==========

    execute(row, col) {
        try {
            console.log(`🏹 HuntAction.execute(): Начало охоты на [${col},${row}]`);
            
            // Проверяем систему карты
            if (!this.mapSystem || !this.mapSystem.currentTacticalMap) {
                this.showNotification("❌ Система карты не доступна!", 'error');
                return;
            }
            
            // Проверяем доступность клетки
            const cellKey = `${col},${row}`;
            const cell = this.mapSystem.currentTacticalMap.cells?.[cellKey];
            
            if (!cell) {
                this.showNotification("❌ Клетка не найдена!", 'error');
                return;
            }
            
            if (cell.explored === true) {
                this.showNotification("❌ Эта клетка уже исследована!", 'warning');
                return;
            }
            
            if (this.mapSystem.isCellReachable && !this.mapSystem.isCellReachable(cell)) {
                this.showNotification("❌ Клетка недостижима для охоты!", 'warning');
                return;
            }
            
            // Сохраняем данные клетки
            this.currentHuntData = {
                row: row,
                col: col,
                cell: cell
            };
            
            // Показываем выбор трофея
            this.showHuntTargetSelection();
            
        } catch (error) {
            console.error("❌ Ошибка выполнения HuntAction.execute():", error);
            this.showNotification("❌ Ошибка системы охоты!", 'error');
        }
    }

    // ========== ЭТАП 1: ВЫБОР ТРОФЕЯ ==========

    showHuntTargetSelection() {
        try {
            console.log("🎯 HuntAction: Показываем выбор трофея для охоты");
            
            const actionsContainer = document.getElementById('cellActionsContainer');
            if (!actionsContainer) {
                console.error("❌ Контейнер действий не найден");
                return;
            }
            
            if (!this.currentHuntData || !this.currentHuntData.cell) {
                this.showNotification("❌ Данные охоты не найдены!", 'error');
                return;
            }
            
            const cell = this.currentHuntData.cell;
            
            // Получаем охотничьи ресурсы из ActionSystem
            const actionSystem = this.actionSystem;
            if (!actionSystem || !actionSystem.resources) {
                this.showNotification("❌ Ресурсы не загружены!", 'error');
                return;
            }
            
            const resources = actionSystem.resources;
            
            // Категории охотничьих ресурсов
            const huntCategories = [
                { key: 'bones', name: '🦴 Кости', icon: '🦴' },
                { key: 'leathers', name: '🐂 Кожи', icon: '🐂' },
                { key: 'hides', name: '🐅 Шкуры', icon: '🐅' },
                { key: 'furs', name: '🦊 Меха', icon: '🦊' }
            ];
            
            // Создаем HTML интерфейса
            let html = `
                <div class="hunt-target-selection">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="color: #00ffcc; margin: 0;">
                            🏹 ВЫБЕРИТЕ ТРОФЕЙ ДЛЯ ОХОТЫ
                        </h3>
                        <div style="color: #aaa; font-size: 12px;">
                            Клетка [${cell.col}, ${cell.row}]
                        </div>
                    </div>
                    
                    <div class="hunt-info" style="
                        background: rgba(0, 100, 255, 0.1);
                        border: 1px solid #00aaff;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 20px;
                    ">
                        <p style="margin: 0; color: #00aaff;">
                            <strong>Как работает охота:</strong><br>
                            1. Сначала выберите желаемый трофей<br>
                            2. Затем выберите монстра, у которого выпадает этот трофей<br>
                            3. Начнется бой с выбранным монстром<br>
                            4. При победе вы получите двойное количество трофея!
                        </p>
                    </div>
                    
                    <div class="hunt-categories">
            `;
            
            let hasResources = false;
            
            // Для каждой категории охотничьих ресурсов
            for (const category of huntCategories) {
                const categoryResources = resources[category.key];
                
                if (Array.isArray(categoryResources) && categoryResources.length > 0) {
                    hasResources = true;
                    html += `
                        <div class="hunt-category">
                            <h4 style="color: #00aaff; margin: 15px 0 10px 0; padding-bottom: 5px; border-bottom: 1px solid rgba(0, 170, 255, 0.3);">
                                ${category.icon} ${category.name}
                            </h4>
                            <div class="hunt-targets-grid">
                    `;
                    
                    // Показываем ресурсы из категории (первые 4)
                    categoryResources.slice(0, 4).forEach(resource => {
                        if (resource && resource.id && resource.name) {
                            html += `
                                <div class="hunt-target-item" 
                                     onclick="window.game.systems.action.actionModules.hunt.selectResource('${resource.id}', '${category.key}')">
                                    <div class="hunt-target-name" style="font-size: 16px; font-weight: bold; color: #fff; margin-bottom: 5px;">
                                        ${resource.name}
                                    </div>
                                    <div class="hunt-target-description" style="font-size: 11px; color: #aaa; margin-bottom: 8px;">
                                        ${resource.description || 'Охотничий трофей'}
                                    </div>
                                    ${resource.price ? `
                                        <div class="hunt-target-price" style="
                                            font-size: 10px; 
                                            color: #f59e0b; 
                                            background: rgba(245, 158, 11, 0.1);
                                            padding: 2px 6px;
                                            border-radius: 3px;
                                            display: inline-block;
                                        ">
                                            Цена: ${resource.price} золота
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        }
                    });
                    
                    html += `
                            </div>
                        </div>
                    `;
                }
            }
            
            // Если нет ресурсов
            if (!hasResources) {
                html += `
                    <div style="text-align: center; padding: 40px; color: #ffaa00;">
                        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                        <p style="margin-bottom: 20px;">Охотничьи ресурсы не загружены</p>
                        <button class="btn-control" 
                                onclick="if(game.systems.action) game.systems.action.loadCellData().then(() => {
                                    const module = game.systems.action.actionModules?.hunt;
                                    if (module) module.showHuntTargetSelection();
                                })" 
                                style="padding: 10px 20px; background: linear-gradient(135deg, #f59e0b, #d97706);">
                            🔄 Загрузить ресурсы
                        </button>
                    </div>
                `;
            }
            
            html += `
                    </div>
                    
                    <div style="margin-top: 30px; text-align: center;">
                        <button class="btn-control" 
                                onclick="if(window.game.systems.action.actionModules.hunt) window.game.systems.action.actionModules.hunt.startQuickHunt()"
                                style="
                                    padding: 12px 24px;
                                    background: linear-gradient(135deg, #dc2626, #b91c1c);
                                    font-size: 14px;
                                    font-weight: bold;
                                ">
                            🏹 Быстрая охота (случайный трофей)
                        </button>
                        <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">
                            Быстрая охота без выбора трофея и монстра
                        </p>
                    </div>
                    
                    <button class="btn-control" 
                            onclick="if(game.systems.action && game.systems.action.updateCellActionsUI) game.systems.action.updateCellActionsUI(${JSON.stringify(cell)})"
                            style="margin-top: 20px; width: 100%; padding: 12px; background: #374151;">
                        ↩️ Назад к действиям
                    </button>
                </div>
            `;
            
            actionsContainer.innerHTML = html;
            
            // Применяем стили
            this.styleHuntTargetSelection();
            
        } catch (error) {
            console.error("❌ Ошибка показа выбора трофея:", error);
            this.showNotification("❌ Ошибка загрузки интерфейса охоты!", 'error');
        }
    }

    // ========== ЭТАП 2: ВЫБОР РЕСУРСА ==========

    selectResource(resourceId, resourceCategory) {
        try {
            console.log(`🎯 HuntAction: Выбран ресурс: ${resourceId} из категории ${resourceCategory}`);
            
            // Сохраняем выбранный ресурс
            this.currentHuntData.selectedResourceId = resourceId;
            this.currentHuntData.resourceCategory = resourceCategory;
            
            // Находим информацию о ресурсе
            this.currentHuntData.resourceInfo = this.findResourceInfo(resourceId);
            
            // Переходим к выбору монстра
            this.showMonstersForResource();
            
        } catch (error) {
            console.error("❌ Ошибка выбора ресурса:", error);
            this.showNotification("❌ Ошибка выбора трофея!", 'error');
        }
    }

    findResourceInfo(resourceId) {
        try {
            const actionSystem = this.actionSystem;
            if (!actionSystem || !actionSystem.resources) {
                return {
                    id: resourceId,
                    name: 'Трофей',
                    description: 'Охотничий трофей',
                    category: 'loot'
                };
            }
            
            for (const category in actionSystem.resources) {
                const categoryResources = actionSystem.resources[category];
                if (Array.isArray(categoryResources)) {
                    const found = categoryResources.find(r => r.id === resourceId);
                    if (found) {
                        return {
                            ...found,
                            category: category
                        };
                    }
                }
            }
            
            return {
                id: resourceId,
                name: 'Трофей',
                description: 'Охотничий трофей',
                category: 'loot'
            };
        } catch (error) {
            console.error("❌ Ошибка поиска информации о ресурсе:", error);
            return {
                id: resourceId,
                name: 'Трофей',
                description: 'Охотничий трофей',
                category: 'loot'
            };
        }
    }

    // ========== ЭТАП 3: ВЫБОР МОНСТРА ==========

    showMonstersForResource() {
        try {
            console.log(`🔍 HuntAction: Ищем монстров с ресурсом: ${this.currentHuntData?.selectedResourceId}`);
            
            const actionsContainer = document.getElementById('cellActionsContainer');
            if (!actionsContainer) {
                console.error("❌ Контейнер действий не найден");
                return;
            }
            
            if (!this.currentHuntData || !this.currentHuntData.selectedResourceId) {
                this.showNotification("❌ Ресурс не выбран!", 'error');
                return;
            }
            
            const battleSystem = window.game?.systems?.battle;
            if (!battleSystem || !battleSystem.monsters) {
                this.showNotification("❌ Система боя не доступна", 'error');
                return;
            }
            
            // Находим монстров у которых в луте есть этот ресурс
            const monstersWithResource = battleSystem.monsters.filter(monster => {
                if (!monster || !monster.loot || !monster.loot.guaranteed) return false;
                return monster.loot.guaranteed.some(loot => loot && loot.id === this.currentHuntData.selectedResourceId);
            });
            
            console.log(`🎯 Найдено ${monstersWithResource.length} монстров с ресурсом ${this.currentHuntData.selectedResourceId}`);
            
            // Если нет монстров с этим ресурсом
            if (monstersWithResource.length === 0) {
                actionsContainer.innerHTML = `
                    <div class="no-monsters">
                        <h3 style="color: #ff4444; text-align: center; margin-bottom: 15px;">
                            🚫 Нет подходящих монстров
                        </h3>
                        <p style="text-align: center; color: #aaa; margin-bottom: 20px;">
                            Для трофея "${this.currentHuntData.resourceInfo?.name || 'неизвестного'}" нет монстров с гарантированным выпадением.
                        </p>
                        <button class="btn-control" 
                                onclick="if(window.game.systems.action.actionModules.hunt) window.game.systems.action.actionModules.hunt.showHuntTargetSelection()" 
                                style="width: 100%; padding: 12px; margin-bottom: 10px;">
                            ↩️ Назад к выбору трофея
                        </button>
                    </div>
                `;
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
                        <button class="btn-control" 
                                onclick="if(window.game.systems.action.actionModules.hunt) window.game.systems.action.actionModules.hunt.showHuntTargetSelection()" 
                                style="padding: 5px 10px; font-size: 12px; background: #374151;">
                            ↩️ Назад
                        </button>
                    </div>
                    
                    <div class="selected-resource-info" style="
                        background: rgba(0, 100, 255, 0.1);
                        border: 1px solid #00aaff;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 20px;
                    ">
                        <div style="font-size: 18px; color: #00aaff; font-weight: bold; margin-bottom: 5px;">
                            🎯 Цель охоты: ${this.currentHuntData.resourceInfo?.name || 'Трофей'}
                        </div>
                        ${this.currentHuntData.resourceInfo?.description ? `
                            <div style="color: #94a3b8; font-size: 12px;">
                                ${this.currentHuntData.resourceInfo.description}
                            </div>
                        ` : ''}
                        <div style="margin-top: 10px; color: #00ffcc; font-size: 12px;">
                            🏆 Награда: <strong>двойное количество</strong> выбранного трофея!
                        </div>
                    </div>
                    
                    <div class="monsters-grid">
            `;
            
            // Для каждого монстра создаем карточку
            for (const monster of monstersWithResource) {
                if (!monster || !monster.id || !monster.name) continue;
                
                const monsterLevel = monster.level || this.calculateMonsterLevel(monster);
                let difficultyColor = '#44ff44';
                let difficultyText = 'Легкий';
                let difficultyClass = 'easy';
                
                if (monsterLevel >= 3 && monsterLevel <= 4) {
                    difficultyColor = '#ffaa00';
                    difficultyText = 'Средний';
                    difficultyClass = 'medium';
                } else if (monsterLevel >= 5) {
                    difficultyColor = '#ff4444';
                    difficultyText = 'Сложный';
                    difficultyClass = 'hard';
                }
                
                // Находим количество ресурса у монстра
                const lootItem = monster.loot.guaranteed.find(l => l && l.id === this.currentHuntData.selectedResourceId);
                const resourceCount = lootItem?.quantity || 1;
                
                html += `
                    <div class="monster-card ${difficultyClass}" 
                         data-monster-id="${monster.id}">
                        <div class="monster-header" style="margin-bottom: 10px;">
                            <div class="monster-name" style="font-size: 16px; font-weight: bold; color: #fff; margin-bottom: 5px;">
                                ${monster.name}
                            </div>
                            <div class="monster-difficulty" style="
                                font-size: 11px; 
                                color: ${difficultyColor}; 
                                font-weight: bold;
                                background: rgba(255, 255, 255, 0.1);
                                padding: 2px 8px;
                                border-radius: 10px;
                                display: inline-block;
                            ">
                                ${difficultyText} (Ур. ${monsterLevel})
                            </div>
                        </div>
                        
                        <div class="monster-stats" style="
                            background: rgba(0, 0, 0, 0.3);
                            border-radius: 6px;
                            padding: 10px;
                            margin: 10px 0;
                            font-size: 11px;
                        ">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #ff6666;">❤️ Здоровье:</span>
                                <span style="color: #fff; font-weight: bold;">${monster.health || 0}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #6666ff;">🛡️ Броня:</span>
                                <span style="color: #fff; font-weight: bold;">${monster.armor || 0}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #ffaa00;">⚔️ Урон:</span>
                                <span style="color: #fff; font-weight: bold;">${monster.damage || 0}</span>
                            </div>
                        </div>
                        
                        <div class="monster-loot" style="
                            background: rgba(0, 255, 204, 0.1);
                            border: 1px solid rgba(0, 255, 204, 0.3);
                            border-radius: 6px;
                            padding: 8px;
                            margin: 10px 0;
                            font-size: 11px;
                        ">
                            <div style="color: #00ffcc; font-weight: bold; margin-bottom: 5px;">🎁 Гарантированный лут:</div>
                            <div style="color: #44ff44; font-weight: bold;">
                                ${this.currentHuntData.resourceInfo?.name || 'Трофей'} × ${resourceCount}
                            </div>
                            <div style="color: #00ffcc; font-size: 10px; margin-top: 5px;">
                                🏆 При охоте: × ${resourceCount * 2}
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 15px;">
                            <button class="btn-control hunt-monster-btn" 
                                    onclick="if(window.game.systems.action.actionModules.hunt) window.game.systems.action.actionModules.hunt.startHuntWithMonster('${monster.id}')"
                                    style="
                                        padding: 8px 16px;
                                        font-size: 12px;
                                        font-weight: bold;
                                        background: linear-gradient(135deg, ${difficultyColor}, ${difficultyColor}99);
                                        width: 100%;
                                    ">
                                🏹 Охотиться на этого
                            </button>
                        </div>
                    </div>
                `;
            }
            
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
                        <strong style="color: #00ffcc; display: block; margin-bottom: 8px;">📝 Важная информация:</strong>
                        <ul style="margin: 0; padding-left: 20px;">
                            <li>При победе вы получите <strong>двойное количество</strong> выбранного трофея</li>
                            <li>Более сильные монстры дают больше опыта</li>
                            <li>Уровень монстра влияет на сложность боя</li>
                            <li>Выбор более слабого монстра увеличивает шансы на победу</li>
                        </ul>
                    </div>
                </div>
            `;
            
            actionsContainer.innerHTML = html;
            
            // Применяем стили
            this.styleMonsterSelection();
            
        } catch (error) {
            console.error("❌ Ошибка показа выбора монстра:", error);
            this.showNotification("❌ Ошибка загрузки списка монстров!", 'error');
        }
    }

    // ========== ЭТАП 4: ЗАПУСК ОХОТЫ И БОЯ ==========

    startHuntWithMonster(monsterId) {
        try {
            console.log(`🏹 HuntAction: Начинаем охоту на монстра ${monsterId}`);
            
            if (!monsterId) {
                this.showNotification("❌ Монстр не выбран!", 'error');
                return;
            }
            
            const battleSystem = window.game?.systems?.battle;
            if (!battleSystem) {
                this.showNotification("❌ Система боя не доступна", 'error');
                return;
            }
            
            // Получаем героя
            const hero = this.mapSystem?.currentHero;
            if (!hero) {
                this.showNotification("❌ Герой не найден", 'error');
                return;
            }
            
            // Находим монстра
            const monster = battleSystem.getMonsterById?.(monsterId);
            if (!monster) {
                this.showNotification("❌ Монстр не найден", 'error');
                return;
            }
            
            // Сохраняем данные охоты в MapSystem для обработки после боя
            if (this.mapSystem) {
                this.mapSystem.pendingAction = {
                    action: 'hunt',
                    row: this.currentHuntData?.row || 0,
                    col: this.currentHuntData?.col || 0,
                    targetResource: this.currentHuntData?.resourceInfo || { id: 'unknown', name: 'Трофей' },
                    targetMonster: monster,
                    wasSuccess: true,
                    doubleLoot: true
                };
            }
            
            console.log(`🏹 Начинается охота на ${monster.name} за ${this.currentHuntData?.resourceInfo?.name || 'трофей'}`);
            this.showNotification(`🏹 Начинается охота на ${monster.name}!`, 'info');
            
            // Начинаем бой
            if (battleSystem.startBattleWithSpecificMonster) {
                battleSystem.startBattleWithSpecificMonster(hero, monster, 'hunt');
            }
            
        } catch (error) {
            console.error("❌ Ошибка запуска охоты:", error);
            this.showNotification("❌ Ошибка запуска охоты!", 'error');
        }
    }

    // ========== БЫСТРАЯ ОХОТА ==========

    startQuickHunt() {
        try {
            console.log(`🏹 HuntAction: Быстрая охота`);
            
            const battleSystem = window.game?.systems?.battle;
            if (!battleSystem) {
                this.showNotification("❌ Система боя не доступна", 'error');
                return;
            }
            
            const hero = this.mapSystem?.currentHero;
            if (!hero) {
                this.showNotification("❌ Герой не найден", 'error');
                return;
            }
            
            const randomMonster = battleSystem.getRandomMonsterForMovement?.();
            if (!randomMonster) {
                this.showNotification("❌ Нет доступных монстров", 'error');
                return;
            }
            
            // Для быстрой охоты берем случайный ресурс
            const actionSystem = this.actionSystem;
            let randomResource = null;
            const huntCategories = ['bones', 'leathers', 'hides', 'furs'];
            
            if (actionSystem && actionSystem.resources) {
                for (const category of huntCategories) {
                    const resources = actionSystem.resources[category];
                    if (Array.isArray(resources) && resources.length > 0) {
                        randomResource = resources[Math.floor(Math.random() * resources.length)];
                        break;
                    }
                }
            }
            
            if (this.mapSystem) {
                this.mapSystem.pendingAction = {
                    action: 'hunt',
                    row: this.currentHuntData?.row || 0,
                    col: this.currentHuntData?.col || 0,
                    targetResource: randomResource || { id: 'quick_loot', name: 'Быстрая добыча' },
                    targetMonster: randomMonster,
                    wasSuccess: true,
                    doubleLoot: true
                };
            }
            
            console.log(`🏹 Быстрая охота на ${randomMonster.name}`);
            this.showNotification(`🏹 Быстрая охота на ${randomMonster.name}!`, 'info');
            
            if (battleSystem.startBattleWithSpecificMonster) {
                battleSystem.startBattleWithSpecificMonster(hero, randomMonster, 'hunt');
            }
            
        } catch (error) {
            console.error("❌ Ошибка быстрой охоты:", error);
            this.showNotification("❌ Ошибка быстрой охоты!", 'error');
        }
    }

    // ========== ОБРАБОТКА РЕЗУЛЬТАТОВ ПОСЛЕ БОЯ ==========

    completeHuntAfterBattle(victory, escape, doubleLoot = false) {
        try {
            console.log(`🏹 HuntAction.completeHuntAfterBattle: победа=${victory}, побег=${escape}, двойной лут=${doubleLoot}`);
            
            if (!this.mapSystem || !this.mapSystem.pendingAction || this.mapSystem.pendingAction.action !== 'hunt') {
                console.error("❌ Нет ожидающего действия охоты");
                return;
            }
            
            const huntData = this.mapSystem.pendingAction;
            const { row, col, targetResource, wasSuccess } = huntData;
            
            if (victory && wasSuccess && targetResource) {
                // Добавляем ресурс герою
                const quantity = doubleLoot ? 2 : 1;
                this.addResourceToHero(targetResource, quantity);
                
                let message = `🎉 Успешная охота! Получен: ${targetResource.name}`;
                if (doubleLoot) {
                    message += ` ×${quantity} (двойной лут!)`;
                }
                
                this.showNotification(message, 'success');
                
                // Помечаем клетку как исследованную
                const cellKey = `${col},${row}`;
                const cell = this.mapSystem.currentTacticalMap?.cells?.[cellKey];
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
            
            // Очищаем данные
            this.mapSystem.pendingAction = null;
            this.currentHuntData = null;
            
            // Обновляем интерфейс
            setTimeout(() => {
                try {
                    const cellKey = `${col},${row}`;
                    const cell = this.mapSystem.currentTacticalMap?.cells?.[cellKey];
                    if (cell && this.actionSystem && this.actionSystem.updateCellActionsUI) {
                        this.actionSystem.updateCellActionsUI(cell);
                    }
                } catch (error) {
                    console.error("❌ Ошибка обновления интерфейса после охоты:", error);
                }
            }, 500);
            
            // Сохраняем игру
            if (window.game && window.game.saveGame) {
                try {
                    window.game.saveGame();
                } catch (error) {
                    console.error("❌ Ошибка сохранения игры:", error);
                }
            }
            
        } catch (error) {
            console.error("❌ Ошибка обработки результатов охоты:", error);
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    calculateMonsterLevel(monster) {
        try {
            if (!monster) return 1;
            
            const health = monster.health || 0;
            const armor = monster.armor || 0;
            const damage = monster.damage || 0;
            
            const healthLevel = Math.floor(health / 100);
            const armorLevel = Math.floor(armor / 10);
            const damageLevel = Math.floor(damage / 30);
            
            return Math.max(1, Math.min(10, Math.round((healthLevel + armorLevel + damageLevel) / 3)));
        } catch (error) {
            console.error("❌ Ошибка расчета уровня монстра:", error);
            return 1;
        }
    }

    addResourceToHero(resource, quantity = 1) {
        try {
            if (!this.mapSystem || !this.mapSystem.currentHero) {
                console.warn("⚠️ Герой не доступен для добавления ресурса");
                return;
            }
            
            if (!resource || !resource.id || !resource.name) {
                console.warn("⚠️ Неверный ресурс для добавления");
                return;
            }
            
            const actionSystem = this.actionSystem;
            if (!actionSystem || !actionSystem.addResourceToHero) {
                console.warn("⚠️ ActionSystem не поддерживает addResourceToHero");
                return;
            }
            
            const resourceType = this.getResourceType(resource);
            actionSystem.addResourceToHero(
                resource.id, 
                resource.name, 
                quantity, 
                resourceType
            );
            
        } catch (error) {
            console.error("❌ Ошибка добавления ресурса герою:", error);
        }
    }

    getResourceType(resource) {
        try {
            if (!resource || !resource.id) return 'loot';
            
            const id = resource.id.toLowerCase();
            if (id.includes('bone')) return 'bones';
            if (id.includes('leather')) return 'leathers';
            if (id.includes('hide')) return 'hides';
            if (id.includes('fur')) return 'furs';
            return 'loot';
        } catch (error) {
            console.error("❌ Ошибка определения типа ресурса:", error);
            return 'loot';
        }
    }

    showNotification(message, type = 'info') {
        try {
            if (window.game && window.game.showNotification) {
                window.game.showNotification(message, type);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        } catch (error) {
            console.error("❌ Ошибка показа уведомления:", error);
        }
    }

    // ========== СТИЛИЗАЦИЯ ИНТЕРФЕЙСА ==========

    styleHuntTargetSelection() {
        try {
            setTimeout(() => {
                // Стилизация сетки трофеев
                const grid = document.querySelector('.hunt-targets-grid');
                if (grid) {
                    grid.style.cssText = `
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 12px;
                        margin-bottom: 15px;
                    `;
                }
                
                // Стилизация карточек трофеев
                const items = document.querySelectorAll('.hunt-target-item');
                items.forEach(item => {
                    item.style.cssText = `
                        background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9));
                        border: 1px solid #00aaff;
                        border-radius: 8px;
                        padding: 15px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    `;
                    
                    item.onmouseenter = () => {
                        item.style.transform = 'translateY(-2px) scale(1.02)';
                        item.style.boxShadow = '0 8px 20px rgba(0, 170, 255, 0.3)';
                        item.style.borderColor = '#00ffff';
                    };
                    
                    item.onmouseleave = () => {
                        item.style.transform = 'translateY(0) scale(1)';
                        item.style.boxShadow = 'none';
                        item.style.borderColor = '#00aaff';
                    };
                });
            }, 50);
        } catch (error) {
            console.error("❌ Ошибка стилизации выбора трофея:", error);
        }
    }

    styleMonsterSelection() {
        try {
            setTimeout(() => {
                // Стилизация сетки монстров
                const grid = document.querySelector('.monsters-grid');
                if (grid) {
                    grid.style.cssText = `
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 15px;
                        margin-bottom: 20px;
                    `;
                }
                
                // Стилизация карточек монстров
                const cards = document.querySelectorAll('.monster-card');
                cards.forEach(card => {
                    card.style.cssText = `
                        background: linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(20, 25, 45, 0.95));
                        border: 1px solid #00aaff;
                        border-radius: 8px;
                        padding: 15px;
                        transition: all 0.2s ease;
                    `;
                    
                    // Специальные стили по сложности
                    if (card.classList.contains('medium')) {
                        card.style.borderColor = '#ffaa00';
                    } else if (card.classList.contains('hard')) {
                        card.style.borderColor = '#ff4444';
                    }
                    
                    card.onmouseenter = () => {
                        card.style.transform = 'translateY(-3px) scale(1.02)';
                        if (card.classList.contains('easy')) {
                            card.style.boxShadow = '0 8px 20px rgba(68, 255, 68, 0.3)';
                        } else if (card.classList.contains('medium')) {
                            card.style.boxShadow = '0 8px 20px rgba(255, 170, 0, 0.3)';
                        } else if (card.classList.contains('hard')) {
                            card.style.boxShadow = '0 8px 20px rgba(255, 68, 68, 0.3)';
                        } else {
                            card.style.boxShadow = '0 8px 20px rgba(0, 170, 255, 0.3)';
                        }
                    };
                    
                    card.onmouseleave = () => {
                        card.style.transform = 'translateY(0) scale(1)';
                        card.style.boxShadow = 'none';
                    };
                });
                
                // Стилизация кнопок охоты
                const huntButtons = document.querySelectorAll('.hunt-monster-btn');
                huntButtons.forEach(button => {
                    button.onmouseenter = () => {
                        button.style.transform = 'scale(1.05)';
                        button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                    };
                    
                    button.onmouseleave = () => {
                        button.style.transform = 'scale(1)';
                        button.style.boxShadow = 'none';
                    };
                });
            }, 50);
        } catch (error) {
            console.error("❌ Ошибка стилизации выбора монстра:", error);
        }
    }
}

// Глобальная регистрация модуля
if (typeof window !== 'undefined') {
    window.HuntAction = HuntAction;
    console.log("📦 HuntAction модуль зарегистрирован глобально");
}

// Автоматическая регистрация в существующем ActionSystem
try {
    if (window.game?.systems?.action) {
        setTimeout(() => {
            const actionSystem = window.game.systems.action;
            if (actionSystem && !actionSystem.actionModules?.hunt) {
                actionSystem.actionModules['hunt'] = new HuntAction(actionSystem);
                console.log("✅ HuntAction автоматически зарегистрирован в ActionSystem");
            }
        }, 100);
    }
} catch (error) {
    console.error("❌ Ошибка автоматической регистрации HuntAction:", error);
}
