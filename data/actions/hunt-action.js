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
            double_loot: true,
            is_hunt_action: true
        };
        
        // Регистрируем модуль в ActionSystem
        if (actionSystem) {
            actionSystem.registerModule('hunt', this);
            console.log("✅ HuntAction зарегистрирован в ActionSystem");
        }
    }

    // ========== ОСНОВНОЙ МЕТОД ВЫПОЛНЕНИЯ ОХОТЫ ==========

    execute(row, col) {
        console.log(`🏹 HuntAction.execute(): Начало охоты на [${col},${row}]`);
        
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
            console.warn(`⚠️ Клетка [${col}, ${row}] уже исследована`);
            this.showNotification("❌ Эта клетка уже исследована!", 'warning');
            return;
        }
        
        // Проверяем, достижима ли клетка
        const isReachable = this.mapSystem.isCellReachable(cell);
        if (!isReachable) {
            console.warn(`⚠️ Клетка [${col}, ${row}] недостижима`);
            this.showNotification("❌ Клетка недостижима для охоты!", 'warning');
            return;
        }
        
        // Показываем выбор трофея
        this.showHuntTargetSelection(cell);
    }

    // ========== ШАГ 1: ВЫБОР ТРОФЕЯ ==========

    showHuntTargetSelection(cell) {
        console.log("🎯 HuntAction: Показываем выбор трофея для охоты");
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) {
            console.error("❌ Контейнер действий не найден");
            return;
        }
        
        // Проверяем есть ли ресурсы в ActionSystem
        const actionSystem = this.actionSystem;
        const resources = actionSystem.resources || {};
        
        // Категории охотничьих ресурсов
        const huntCategories = [
            { key: 'bones', name: '🦴 Кости', icon: '🦴', description: 'Прочные кости животных для ремесла' },
            { key: 'leathers', name: '🐂 Кожи', icon: '🐂', description: 'Выделанные кожи для брони и предметов' },
            { key: 'hides', name: '🐅 Шкуры', icon: '🐅', description: 'Цельные шкуры для украшений и одежды' },
            { key: 'furs', name: '🦊 Меха', icon: '🦊', description: 'Теплые меха для зимней одежды' }
        ];
        
        // Создаем HTML
        let html = `
            <div class="hunt-target-selection">
                <div class="hunt-header" style="text-align: center; margin-bottom: 25px;">
                    <h3 style="color: #00ffcc; margin-bottom: 10px;">
                        🏹 ВЫБЕРИТЕ ТРОФЕЙ ДЛЯ ОХОТЫ
                    </h3>
                    <div class="hunt-location-info" style="
                        background: rgba(0, 170, 255, 0.1);
                        border: 1px solid rgba(0, 170, 255, 0.3);
                        border-radius: 8px;
                        padding: 10px;
                        display: inline-block;
                        margin-bottom: 15px;
                    ">
                        <span style="color: #00aaff;">📍 Локация:</span>
                        <span style="color: #ffffff; font-weight: bold; margin-left: 10px;">
                            [${cell.col}, ${cell.row}]
                        </span>
                    </div>
                </div>
                
                <div class="hunt-instructions" style="
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 20px;
                    border-left: 4px solid #f59e0b;
                ">
                    <strong style="color: #f59e0b; display: block; margin-bottom: 8px;">📋 Как работает охота:</strong>
                    <ol style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px;">
                        <li style="margin-bottom: 5px;"><strong>Выберите трофей</strong>, который хотите получить</li>
                        <li style="margin-bottom: 5px;"><strong>Выберите монстра</strong>, у которого выпадает этот трофей</li>
                        <li style="margin-bottom: 5px;"><strong>Начнется бой</strong> с выбранным монстром</li>
                        <li><strong>При победе</strong> получите выбранный трофей (в двойном количестве!)</li>
                    </ol>
                </div>
                
                <div class="hunt-categories">
        `;
        
        let hasResources = false;
        
        // Для каждой категории
        huntCategories.forEach(category => {
            const categoryResources = resources[category.key] || [];
            
            if (categoryResources.length > 0) {
                hasResources = true;
                
                html += `
                    <div class="hunt-category-section" style="margin-bottom: 25px;">
                        <div class="category-header" style="
                            display: flex;
                            align-items: center;
                            margin-bottom: 15px;
                            padding-bottom: 8px;
                            border-bottom: 2px solid rgba(0, 170, 255, 0.3);
                        ">
                            <div class="category-icon" style="font-size: 24px; margin-right: 12px;">
                                ${category.icon}
                            </div>
                            <div>
                                <h4 style="color: #00aaff; margin: 0; font-size: 18px;">
                                    ${category.name}
                                </h4>
                                <div class="category-description" style="color: #94a3b8; font-size: 12px;">
                                    ${category.description}
                                </div>
                            </div>
                        </div>
                        
                        <div class="hunt-targets-grid">
                `;
                
                // Показываем ресурсы из категории
                categoryResources.forEach(resource => {
                    const resourcePrice = resource.price || 0;
                    const rarityColor = this.getRarityColor(resource.rarity);
                    
                    html += `
                        <div class="hunt-target-item" 
                             onclick="window.game.systems.action.actionModules.hunt.selectResource('${resource.id}', ${cell.row}, ${cell.col})"
                             style="
                                background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9));
                                border: 1px solid ${rarityColor};
                                border-radius: 10px;
                                padding: 15px;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                position: relative;
                                overflow: hidden;
                             ">
                            <div class="target-item-content">
                                <div class="target-name" style="
                                    font-size: 16px;
                                    font-weight: bold;
                                    color: #ffffff;
                                    margin-bottom: 8px;
                                    display: flex;
                                    align-items: center;
                                ">
                                    <span style="margin-right: 8px;">${resource.name}</span>
                                    <span class="rarity-badge" style="
                                        background: ${rarityColor}22;
                                        color: ${rarityColor};
                                        font-size: 10px;
                                        padding: 2px 8px;
                                        border-radius: 10px;
                                        border: 1px solid ${rarityColor}88;
                                    ">
                                        ${this.getRarityText(resource.rarity)}
                                    </span>
                                </div>
                                
                                <div class="target-description" style="
                                    color: #b0b0ff;
                                    font-size: 12px;
                                    margin-bottom: 10px;
                                    line-height: 1.4;
                                ">
                                    ${resource.description || 'Ценный охотничий трофей'}
                                </div>
                                
                                <div class="target-stats" style="
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    margin-top: 12px;
                                    padding-top: 12px;
                                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                                ">
                                    ${resourcePrice > 0 ? `
                                        <div class="target-price" style="
                                            color: #f59e0b;
                                            font-weight: bold;
                                            font-size: 14px;
                                        ">
                                            💰 ${resourcePrice} золота
                                        </div>
                                    ` : ''}
                                    
                                    <div class="hunt-arrow" style="
                                        color: #00ffcc;
                                        font-size: 14px;
                                        font-weight: bold;
                                    ">
                                        Охотиться →
                                    </div>
                                </div>
                            </div>
                            
                            <div class="hover-effect" style="
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                bottom: 0;
                                background: linear-gradient(45deg, transparent, ${rarityColor}11, transparent);
                                opacity: 0;
                                transition: opacity 0.3s ease;
                            "></div>
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
                <div style="
                    text-align: center;
                    padding: 40px 20px;
                    color: #ffaa00;
                    background: rgba(255, 170, 0, 0.05);
                    border-radius: 10px;
                    border: 1px solid rgba(255, 170, 0, 0.3);
                ">
                    <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                    <p style="font-size: 16px; margin-bottom: 15px;">Ресурсы для охоты не загружены</p>
                    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 25px;">
                        Возможно, файл с ресурсами не был загружен или поврежден.
                    </p>
                    <button class="btn-control" 
                            onclick="game.systems.action.loadCellData().then(() => {
                                const cell = ${JSON.stringify(cell)};
                                game.systems.action.actionModules.hunt.showHuntTargetSelection(cell);
                            })" 
                            style="
                                padding: 12px 24px;
                                font-size: 14px;
                                background: linear-gradient(135deg, #f59e0b, #d97706);
                            ">
                        🔄 Загрузить ресурсы
                    </button>
                </div>
            `;
        }
        
        html += `
                </div>
                
                <div class="hunt-footer" style="margin-top: 30px;">
                    <div class="quick-hunt-section" style="text-align: center;">
                        <p style="color: #94a3b8; margin-bottom: 15px; font-size: 14px;">
                            Не хотите выбирать трофей? Попробуйте быструю охоту:
                        </p>
                        <button class="btn-control" 
                                onclick="game.systems.action.actionModules.hunt.startQuickHunt(${cell.row}, ${cell.col})"
                                style="
                                    padding: 12px 30px;
                                    font-size: 15px;
                                    background: linear-gradient(135deg, #ff4444, #ff6666);
                                ">
                            🏹 Быстрая охота (случайный трофей)
                        </button>
                        <p style="color: #ff9999; font-size: 12px; margin-top: 10px;">
                            Начнется охота на случайного монстра с любым трофеем
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 25px;">
                        <button class="btn-control" 
                                onclick="game.systems.action.updateCellActionsUI(${JSON.stringify(cell)})"
                                style="
                                    padding: 10px 20px;
                                    font-size: 13px;
                                    background: rgba(0, 0, 0, 0.3);
                                    border: 1px solid #475569;
                                ">
                            ↩️ Назад к списку действий
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
        
        // Стилизация
        this.styleHuntTargetSelection();
    }

    // ========== ШАГ 2: ВЫБОР МОНСТРА ДЛЯ ТРОФЕЯ ==========

    selectResource(resourceId, row, col) {
        console.log(`🎯 HuntAction: Выбран ресурс: ${resourceId} на [${col},${row}]`);
        
        // Сохраняем выбранный ресурс
        this.selectedResourceId = resourceId;
        this.selectedRow = row;
        this.selectedCol = col;
        
        // Показываем монстров с этим ресурсом
        this.showMonstersForResource(resourceId, row, col);
    }

    showMonstersForResource(resourceId, row, col) {
        console.log(`🔍 HuntAction: Ищем монстров с ресурсом: ${resourceId}`);
        
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
            if (!monster.loot) return false;
            
            // Проверяем guaranteed лут
            if (monster.loot.guaranteed) {
                return monster.loot.guaranteed.some(loot => loot.id === resourceId);
            }
            
            // Проверяем random лут
            if (monster.loot.random) {
                return monster.loot.random.some(loot => loot.id === resourceId);
            }
            
            return false;
        });
        
        console.log(`🎯 Найдено ${monstersWithResource.length} монстров с ресурсом ${resourceId}`);
        
        // Находим информацию о ресурсе
        const actionSystem = this.actionSystem;
        let resourceInfo = null;
        for (const category in actionSystem.resources) {
            const found = actionSystem.resources[category]?.find(r => r.id === resourceId);
            if (found) {
                resourceInfo = found;
                break;
            }
        }
        
        // Если нет монстров с этим ресурсом
        if (monstersWithResource.length === 0) {
            actionsContainer.innerHTML = `
                <div class="no-monsters-found" style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 48px; color: #ff4444; margin-bottom: 20px;">🚫</div>
                    <h3 style="color: #ff4444; margin-bottom: 15px;">
                        Нет подходящих монстров
                    </h3>
                    <p style="color: #aaa; margin-bottom: 25px; max-width: 500px; margin-left: auto; margin-right: auto;">
                        Для трофея <strong style="color: #00aaff;">"${resourceInfo?.name || resourceId}"</strong> 
                        нет монстров с гарантированным выпадением.
                    </p>
                    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 30px;">
                        Попробуйте выбрать другой трофей или использовать быструю охоту.
                    </p>
                    <button class="btn-control" 
                            onclick="game.systems.action.actionModules.hunt.showHuntTargetSelection(${JSON.stringify({col: col, row: row})})" 
                            style="padding: 12px 30px; font-size: 14px;">
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
                <div class="monster-selection-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 25px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid rgba(0, 255, 204, 0.3);
                ">
                    <h3 style="color: #00ffcc; margin: 0; font-size: 22px;">
                        🎯 ВЫБЕРИТЕ МОНСТРА ДЛЯ ОХОТЫ
                    </h3>
                    <button class="btn-control" 
                            onclick="game.systems.action.actionModules.hunt.showHuntTargetSelection(${JSON.stringify({col: col, row: row})})" 
                            style="padding: 8px 16px; font-size: 13px;">
                        ↩️ Назад
                    </button>
                </div>
                
                <div class="selected-resource-display" style="
                    background: linear-gradient(135deg, rgba(0, 100, 255, 0.1), rgba(0, 170, 255, 0.1));
                    border: 2px solid #00aaff;
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 30px;
                    text-align: center;
                ">
                    <div class="resource-icon" style="font-size: 36px; margin-bottom: 10px;">
                        ${resourceInfo?.name?.charAt(0) || '🏹'}
                    </div>
                    <div style="font-size: 20px; color: #00aaff; margin-bottom: 5px; font-weight: bold;">
                        Цель охоты: ${resourceInfo?.name || resourceId}
                    </div>
                    ${resourceInfo?.description ? `
                        <div style="color: #66aaff; font-size: 14px; max-width: 600px; margin: 0 auto;">
                            ${resourceInfo.description}
                        </div>
                    ` : ''}
                    <div class="double-loot-notice" style="
                        margin-top: 15px;
                        padding: 10px;
                        background: rgba(245, 158, 11, 0.1);
                        border-radius: 8px;
                        border: 1px solid rgba(245, 158, 11, 0.3);
                        display: inline-block;
                    ">
                        <span style="color: #f59e0b; font-weight: bold;">💰 Двойной лут:</span>
                        <span style="color: #fbbf24; margin-left: 5px;">
                            При победе получите трофей в двойном количестве!
                        </span>
                    </div>
                </div>
                
                <div class="monsters-count-info" style="
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 20px;
                    text-align: center;
                    font-size: 14px;
                    color: #cbd5e1;
                ">
                    Найдено <span style="color: #00ffcc; font-weight: bold;">${monstersWithResource.length}</span> монстров с этим трофеем
                </div>
                
                <div class="monsters-grid">
        `;
        
        // Для каждого монстра
        monstersWithResource.forEach(monster => {
            const monsterLevel = monster.level || this.calculateMonsterLevel(monster);
            const { difficultyColor, difficultyText } = this.getMonsterDifficulty(monsterLevel);
            
            // Находим количество ресурса у монстра
            let resourceCount = 1;
            if (monster.loot?.guaranteed) {
                const lootItem = monster.loot.guaranteed.find(l => l.id === resourceId);
                resourceCount = lootItem?.quantity || 1;
            }
            
            html += `
                <div class="monster-card" data-monster-id="${monster.id}">
                    <div class="monster-card-header" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 15px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    ">
                        <div class="monster-name" style="font-size: 18px; font-weight: bold; color: #fff;">
                            ${monster.name}
                        </div>
                        <div class="monster-difficulty" style="
                            font-size: 12px;
                            color: ${difficultyColor};
                            background: ${difficultyColor}22;
                            padding: 4px 10px;
                            border-radius: 12px;
                            border: 1px solid ${difficultyColor}88;
                            font-weight: bold;
                        ">
                            ${difficultyText} (Ур. ${monsterLevel})
                        </div>
                    </div>
                    
                    <div class="monster-stats" style="margin: 15px 0;">
                        <div class="stat-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; color: #ff6666;">
                                <span style="margin-right: 8px;">❤️</span>
                                <span>Здоровье:</span>
                            </div>
                            <div style="color: #fff; font-weight: bold;">${monster.health}</div>
                        </div>
                        
                        <div class="stat-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; color: #6666ff;">
                                <span style="margin-right: 8px;">🛡️</span>
                                <span>Броня:</span>
                            </div>
                            <div style="color: #fff; font-weight: bold;">${monster.armor}</div>
                        </div>
                        
                        <div class="stat-row" style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; color: #ffaa00;">
                                <span style="margin-right: 8px;">⚔️</span>
                                <span>Урон:</span>
                            </div>
                            <div style="color: #fff; font-weight: bold;">${monster.damage}</div>
                        </div>
                    </div>
                    
                    <div class="monster-loot-info" style="
                        background: rgba(0, 0, 0, 0.4);
                        border-radius: 8px;
                        padding: 12px;
                        margin: 15px 0;
                    ">
                        <div style="color: #00ffcc; font-weight: bold; margin-bottom: 8px; font-size: 13px;">
                            🎁 Гарантированный лут:
                        </div>
                        <div style="
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            color: #44ff44;
                            font-weight: bold;
                        ">
                            <span>${resourceInfo?.name || resourceId}</span>
                            <span>× ${resourceCount}</span>
                        </div>
                        <div style="
                            color: #f59e0b;
                            font-size: 11px;
                            margin-top: 8px;
                            text-align: center;
                        ">
                            (× ${resourceCount * 2} при победе в охоте!)
                        </div>
                    </div>
                    
                    <div class="hunt-button-container" style="text-align: center; margin-top: 20px;">
                        <button class="btn-control hunt-monster-btn" 
                                onclick="game.systems.action.actionModules.hunt.startHuntWithMonster('${resourceId}', '${monster.id}', ${row}, ${col})"
                                style="
                                    padding: 10px 20px;
                                    font-size: 14px;
                                    background: linear-gradient(135deg, ${difficultyColor}, ${difficultyColor}99);
                                    border: 1px solid ${difficultyColor};
                                    width: 100%;
                                ">
                            🏹 Охотиться на этого монстра
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <div class="monster-selection-footer" style="
                    margin-top: 30px;
                    padding: 20px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 12px;
                    border: 1px solid rgba(0, 255, 204, 0.3);
                ">
                    <strong style="color: #00ffcc; display: block; margin-bottom: 15px; font-size: 16px;">
                        📝 Советы по охоте:
                    </strong>
                    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
                        <p style="margin-bottom: 10px;">
                            • <strong>Выбирайте монстра по силам</strong> - чем выше уровень, тем сложнее бой
                        </p>
                        <p style="margin-bottom: 10px;">
                            • <strong>Обращайте внимание на статистику</strong> - здоровье, броня и урон важны
                        </p>
                        <p style="margin-bottom: 10px;">
                            • <strong>Помните о двойном луте</strong> - охота всегда дает награду в двойном размере
                        </p>
                        <p>
                            • <strong>Можно отступить</strong> - если бой идет плохо, всегда можно попробовать сбежать
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
        
        // Стилизация
        this.styleMonsterSelection();
    }

    // ========== ШАГ 3: ЗАПУСК ОХОТЫ С ВЫБРАННЫМ МОНСТРОМ ==========

    startHuntWithMonster(resourceId, monsterId, row, col) {
        console.log(`🏹 HuntAction: Начинаем охоту на монстра ${monsterId} за ресурс ${resourceId} на [${col},${row}]`);
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            this.showNotification("❌ Система боя не доступна!", 'error');
            return;
        }
        
        // Получаем героя
        const hero = this.mapSystem.currentHero || window.game?.currentHero || window.game?.systems?.map?.currentHero;
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
        const actionSystem = this.actionSystem;
        let resourceInfo = null;
        for (const category in actionSystem.resources) {
            const found = actionSystem.resources[category]?.find(r => r.id === resourceId);
            if (found) {
                resourceInfo = found;
                break;
            }
        }
        
        // Сохраняем информацию для послебоевой обработки
        this.mapSystem.pendingAction = {
            action: 'hunt',
            row: row,
            col: col,
            targetResource: resourceInfo || { id: resourceId, name: 'Трофей' },
            targetMonster: monster,
            wasSuccess: true,
            doubleLoot: true,
            huntModule: this
        };
        
        console.log(`🏹 Начинаем охоту на ${monster.name} за ${resourceInfo?.name || resourceId}`);
        
        // Показываем сообщение о начале охоты
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <div class="hunt-starting" style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 64px; color: #00ffcc; margin-bottom: 20px;">🏹</div>
                    <h3 style="color: #00ffcc; margin-bottom: 15px;">
                        ОХОТА НАЧИНАЕТСЯ!
                    </h3>
                    <div style="
                        background: rgba(0, 170, 255, 0.1);
                        border: 2px solid #00aaff;
                        border-radius: 12px;
                        padding: 20px;
                        max-width: 500px;
                        margin: 0 auto 30px auto;
                    ">
                        <div style="font-size: 20px; color: #fff; margin-bottom: 10px; font-weight: bold;">
                            ${monster.name}
                        </div>
                        <div style="color: #00aaff; font-size: 16px; margin-bottom: 15px;">
                            Цель: ${resourceInfo?.name || resourceId}
                        </div>
                        <div style="color: #f59e0b; font-size: 14px;">
                            🎯 Двойной лут: При победе получите трофей в двойном количестве!
                        </div>
                    </div>
                    
                    <div class="hunt-starting-message" style="
                        color: #cbd5e1;
                        font-size: 14px;
                        margin-bottom: 30px;
                        max-width: 600px;
                        margin-left: auto;
                        margin-right: auto;
                    ">
                        Вы выследили ${monster.name} и готовы к атаке. Будьте осторожны и удачи в бою!
                    </div>
                    
                    <div class="loading-indicator" style="
                        width: 200px;
                        height: 4px;
                        background: rgba(0, 0, 0, 0.3);
                        border-radius: 2px;
                        margin: 0 auto;
                        overflow: hidden;
                    ">
                        <div class="loading-bar" style="
                            width: 100%;
                            height: 100%;
                            background: linear-gradient(90deg, #00ffcc, #00aaff);
                            border-radius: 2px;
                            animation: loading 1.5s ease-in-out infinite;
                        "></div>
                    </div>
                    
                    <style>
                        @keyframes loading {
                            0% { transform: translateX(-100%); }
                            100% { transform: translateX(100%); }
                        }
                    </style>
                </div>
            `;
        }
        
        this.showNotification(`🏹 Начинается охота на ${monster.name}! Удачи в бою!`, 'info');
        
        // Ждем немного для драматичности и начинаем бой
        setTimeout(() => {
            battleSystem.startBattleWithSpecificMonster(hero, monster, 'hunt');
        }, 1500);
    }

    // ========== БЫСТРАЯ ОХОТА (без выбора трофея) ==========

    startQuickHunt(row, col) {
        console.log(`🏹 HuntAction: Быстрая охота на [${col},${row}]`);
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            this.showNotification("❌ Система боя не доступна!", 'error');
            return;
        }
        
        // Получаем героя
        const hero = this.mapSystem.currentHero || window.game?.currentHero || window.game?.systems?.map?.currentHero;
        if (!hero) {
            console.error("❌ Герой не найден");
            this.showNotification("❌ Герой не найден!", 'error');
            return;
        }
        
        const randomMonster = battleSystem.getRandomMonsterForMovement();
        if (!randomMonster) {
            console.error("❌ Нет доступных монстров");
            this.showNotification("❌ Нет подходящих монстров для охоты!", 'warning');
            return;
        }
        
        // Выбираем случайный ресурс из доступных
        const actionSystem = this.actionSystem;
        let randomResource = null;
        
        // Собираем все охотничьи ресурсы
        const huntResourceKeys = ['bones', 'leathers', 'hides', 'furs'];
        let allHuntResources = [];
        
        huntResourceKeys.forEach(key => {
            const resources = actionSystem.resources[key] || [];
            allHuntResources = allHuntResources.concat(resources);
        });
        
        if (allHuntResources.length > 0) {
            randomResource = allHuntResources[Math.floor(Math.random() * allHuntResources.length)];
        }
        
        this.mapSystem.pendingAction = {
            action: 'hunt',
            row: row,
            col: col,
            targetResource: randomResource || { id: 'random_loot', name: 'Случайный трофей' },
            targetMonster: randomMonster,
            wasSuccess: true,
            doubleLoot: true,
            huntModule: this,
            isQuickHunt: true
        };
        
        console.log(`🏹 Быстрая охота на ${randomMonster.name}`);
        
        // Показываем сообщение о быстрой охоте
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <div class="quick-hunt-starting" style="text-align: center; padding: 40px 20px;">
                    <div style="font-size: 64px; color: #ff4444; margin-bottom: 20px;">⚡</div>
                    <h3 style="color: #ff4444; margin-bottom: 15px;">
                        БЫСТРАЯ ОХОТА!
                    </h3>
                    <div style="
                        background: rgba(255, 68, 68, 0.1);
                        border: 2px solid #ff4444;
                        border-radius: 12px;
                        padding: 20px;
                        max-width: 500px;
                        margin: 0 auto 30px auto;
                    ">
                        <div style="font-size: 20px; color: #fff; margin-bottom: 10px; font-weight: bold;">
                            ${randomMonster.name}
                        </div>
                        <div style="color: #ff6666; font-size: 16px; margin-bottom: 15px;">
                            Случайная цель охоты
                        </div>
                        <div style="color: #f59e0b; font-size: 14px;">
                            🎲 Удача решит, какой трофей вы получите!
                        </div>
                    </div>
                    
                    <div style="color: #cbd5e1; font-size: 14px; margin-bottom: 30px;">
                        Вы бросаетесь в погоню за первой же дичью. Рискованно, но может окупиться!
                    </div>
                </div>
            `;
        }
        
        this.showNotification(`🏹 Быстрая охота на ${randomMonster.name}! Удачи!`, 'info');
        
        // Ждем немного и начинаем бой
        setTimeout(() => {
            battleSystem.startBattleWithSpecificMonster(hero, randomMonster, 'hunt');
        }, 1500);
    }

    // ========== ОБРАБОТКА РЕЗУЛЬТАТОВ ОХОТЫ ==========

    completeHuntAfterBattle(victory, escape, doubleLoot = true) {
        console.log(`🏹 HuntAction: Завершение охоты: победа=${victory}, побег=${escape}, двойной лут=${doubleLoot}`);
        
        if (!this.mapSystem.pendingAction || this.mapSystem.pendingAction.action !== 'hunt') {
            console.error("❌ Нет ожидающего действия охоты");
            return;
        }
        
        const { row, col, targetResource, targetMonster, isQuickHunt } = this.mapSystem.pendingAction;
        
        if (victory && targetResource) {
            // Добавляем ресурс герою
            const quantity = doubleLoot ? 2 : 1;
            this.addResourceToHero(targetResource, quantity);
            
            let message = `🎉 Успешная охота! `;
            if (isQuickHunt) {
                message += `Получен случайный трофей: ${targetResource.name}`;
            } else {
                message += `Получен: ${targetResource.name}`;
            }
            
            if (doubleLoot) {
                message += ' (двойной лут!)';
            }
            
            this.showNotification(message, 'success');
            
            // Помечаем клетку как исследованную
            const cellKey = `${col},${row}`;
            const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
            if (cell) {
                cell.explored = true;
            }
        } else if (victory) {
            this.showNotification("🎉 Победа в бою, но трофей не найден", 'warning');
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
        }, 1000);
        
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

    getMonsterDifficulty(level) {
        if (level <= 2) {
            return { difficultyColor: '#44ff44', difficultyText: 'Легкий' };
        } else if (level <= 4) {
            return { difficultyColor: '#ffaa00', difficultyText: 'Средний' };
        } else if (level <= 6) {
            return { difficultyColor: '#ff4444', difficultyText: 'Сложный' };
        } else {
            return { difficultyColor: '#ff00ff', difficultyText: 'Опасный' };
        }
    }

    getRarityColor(rarity) {
        switch (rarity) {
            case 'common': return '#94a3b8';
            case 'uncommon': return '#00aaff';
            case 'rare': return '#f59e0b';
            case 'epic': return '#ff00ff';
            case 'legendary': return '#ff4444';
            default: return '#94a3b8';
        }
    }

    getRarityText(rarity) {
        switch (rarity) {
            case 'common': return 'Обычный';
            case 'uncommon': return 'Необычный';
            case 'rare': return 'Редкий';
            case 'epic': return 'Эпический';
            case 'legendary': return 'Легендарный';
            default: return 'Обычный';
        }
    }

    addResourceToHero(resource, quantity = 1) {
        if (!this.mapSystem.currentHero) return;
        
        const actionSystem = window.game?.systems?.action;
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
            const grids = document.querySelectorAll('.hunt-targets-grid');
            grids.forEach(grid => {
                grid.style.cssText = `
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 15px;
                    margin-bottom: 15px;
                `;
            });
            
            const items = document.querySelectorAll('.hunt-target-item');
            items.forEach(item => {
                const originalBorder = item.style.borderColor;
                
                item.onmouseenter = () => {
                    item.style.transform = 'translateY(-5px) scale(1.02)';
                    item.style.boxShadow = '0 10px 25px rgba(0, 170, 255, 0.3)';
                    
                    const hoverEffect = item.querySelector('.hover-effect');
                    if (hoverEffect) {
                        hoverEffect.style.opacity = '1';
                    }
                };
                
                item.onmouseleave = () => {
                    item.style.transform = 'translateY(0) scale(1)';
                    item.style.boxShadow = 'none';
                    
                    const hoverEffect = item.querySelector('.hover-effect');
                    if (hoverEffect) {
                        hoverEffect.style.opacity = '0';
                    }
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
                    gap: 20px;
                    margin-bottom: 20px;
                `;
            }
            
            const cards = document.querySelectorAll('.monster-card');
            cards.forEach(card => {
                card.style.cssText = `
                    background: linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(20, 25, 45, 0.95));
                    border: 2px solid #00aaff;
                    border-radius: 12px;
                    padding: 20px;
                    transition: all 0.3s ease;
                `;
                
                card.onmouseenter = () => {
                    card.style.transform = 'translateY(-5px) scale(1.02)';
                    card.style.boxShadow = '0 15px 30px rgba(0, 170, 255, 0.4)';
                };
                
                card.onmouseleave = () => {
                    card.style.transform = 'translateY(0) scale(1)';
                    card.style.boxShadow = 'none';
                };
            });
            
            const huntButtons = document.querySelectorAll('.hunt-monster-btn');
            huntButtons.forEach(button => {
                button.onmouseenter = () => {
                    button.style.transform = 'scale(1.05)';
                };
                
                button.onmouseleave = () => {
                    button.style.transform = 'scale(1)';
                };
            });
        }, 50);
    }
}

// Глобальная регистрация модуля
window.HuntAction = HuntAction;
console.log("📦 HuntAction модуль загружен");

// Автоматическая регистрация в существующем ActionSystem
if (window.ActionSystem && window.game?.systems?.action) {
    setTimeout(() => {
        if (!window.game.systems.action.actionModules['hunt']) {
            window.game.systems.action.actionModules['hunt'] = new HuntAction(window.game.systems.action);
            console.log("✅ HuntAction автоматически зарегистрирован в ActionSystem");
        }
    }, 100);
}
