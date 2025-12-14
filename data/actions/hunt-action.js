"use strict";

class HuntAction {
    constructor(actionSystem) {
        this.actionSystem = actionSystem;
        this.mapSystem = actionSystem.mapSystem;
        
        // ========== КОНФИГУРАЦИЯ ОХОТЫ ==========
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
            base_chance: 70, // Базовый шанс охоты
            requires_player_here: false
        };
        
        // Категории охотничьих ресурсов
        this.huntResourceCategories = ['bones', 'leathers', 'hides', 'furs'];
        
        // Регистрируем модуль в ActionSystem
        if (actionSystem) {
            actionSystem.registerModule('hunt', this);
            console.log("✅ HuntAction зарегистрирован в ActionSystem");
        }
        
        // Связываем методы для глобального доступа
        this.bindGlobalMethods();
    }

    bindGlobalMethods() {
        // Связываем методы для вызова из HTML
        if (typeof window !== 'undefined') {
            window.huntActionModule = this;
        }
    }

    // ========== РАСЧЕТ ШАНСОВ ==========

    calculateChance(cellType) {
        console.log(`🎯 HuntAction.calculateChance: для типа клетки ${cellType}`);
        
        const cellTypeData = this.actionSystem.cellTypes[cellType];
        if (!cellTypeData) {
            console.log(`   Тип клетки не найден, используем базовый шанс: ${this.config.base_chance}%`);
            return this.config.base_chance;
        }
        
        if (cellTypeData.action_chances && cellTypeData.action_chances.hunt !== undefined) {
            const chance = cellTypeData.action_chances.hunt;
            console.log(`   Шанс охоты для ${cellType}: ${chance}% (из файла)`);
            return chance;
        }
        
        console.log(`   Используем базовый шанс: ${this.config.base_chance}%`);
        return this.config.base_chance;
    }

    // ========== ВЫПОЛНЕНИЕ ОХОТЫ ==========

    async execute(row, col) {
        console.log(`🏹 HuntAction.execute(): Начало охоты на [${col},${row}]`);
        
        // Получаем клетку
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (!cell) {
            console.error("❌ Клетка не найдена");
            this.showNotification("❌ Клетка не найдена!", 'error');
            return false;
        }
        
        // Проверяем, исследована ли клетка
        if (cell.explored === true) {
            console.warn(`⚠️ Клетка [${col},${row}] уже исследована`);
            this.showNotification("❌ Эта клетка уже исследована!", 'warning');
            return false;
        }
        
        // Проверяем, достижима ли клетка
        const isReachable = this.mapSystem.isCellReachable(cell);
        if (!isReachable) {
            console.warn(`⚠️ Клетка [${col},${row}] недостижима`);
            this.showNotification("❌ Клетка недостижима для охоты!", 'warning');
            return false;
        }
        
        // Показываем выбор трофея
        this.showHuntTargetSelection(cell);
        return true;
    }

    // ========== ВЫБОР ТРОФЕЯ ==========

    showHuntTargetSelection(cell) {
        console.log("🎯 Показываем выбор трофея для охоты");
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        // Проверяем есть ли ресурсы в ActionSystem
        const actionSystem = this.actionSystem;
        const resources = actionSystem.resources || {};
        
        // Собираем HTML
        let html = `
            <div class="hunt-target-selection">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 15px;">
                    🏹 ВЫБЕРИТЕ ТРОФЕЙ ДЛЯ ОХОТЫ
                </h3>
                <p style="text-align: center; color: #aaa; margin-bottom: 20px;">
                    Клетка [${cell.col}, ${cell.row}]
                </p>
                
                <div class="chance-info" style="
                    background: rgba(0, 100, 255, 0.1);
                    border: 1px solid #00aaff;
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 20px;
                    text-align: center;
                ">
                    <strong style="color: #00aaff;">Шанс успеха охоты:</strong>
                    <span style="color: #44ff44; font-size: 18px; font-weight: bold; margin-left: 10px;">
                        ${this.calculateChance(this.actionSystem.currentCellType)}%
                    </span>
                </div>
                
                <div class="hunt-categories">
        `;
        
        let hasResources = false;
        
        // Для каждой категории охотничьих ресурсов
        this.huntResourceCategories.forEach(categoryKey => {
            const categoryResources = resources[categoryKey] || [];
            
            if (categoryResources.length > 0) {
                hasResources = true;
                
                const categoryName = this.getCategoryDisplayName(categoryKey);
                const categoryIcon = this.getCategoryIcon(categoryKey);
                
                html += `
                    <div class="hunt-category">
                        <h4 style="color: #00aaff; margin: 15px 0 10px 0;">
                            ${categoryIcon} ${categoryName}
                        </h4>
                        <div class="hunt-targets-grid">
                `;
                
                // Показываем ресурсы из категории
                categoryResources.forEach(resource => {
                    const resourceChance = this.calculateResourceChance(resource);
                    
                    html += `
                        <div class="hunt-target-item" 
                             onclick="window.huntActionModule.selectResource('${resource.id}', ${cell.row}, ${cell.col})">
                            <div class="hunt-target-name" style="font-size: 16px; margin-bottom: 5px; color: #fff;">
                                ${resource.name}
                            </div>
                            <div class="hunt-target-description" style="font-size: 11px; color: #aaa;">
                                ${resource.description || 'Охотничий трофей'}
                            </div>
                            <div class="hunt-target-chance" style="margin-top: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-size: 10px; color: #aaa;">Шанс выпадения:</span>
                                    <span style="color: ${resourceChance >= 50 ? '#44ff44' : '#ffaa00'}; font-weight: bold; font-size: 12px;">
                                        ${resourceChance}%
                                    </span>
                                </div>
                                <div style="width: 100%; height: 4px; background: #333; border-radius: 2px; margin-top: 4px; overflow: hidden;">
                                    <div style="width: ${resourceChance}%; height: 100%; background: ${resourceChance >= 50 ? '#44ff44' : '#ffaa00'};"></div>
                                </div>
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
                    <button class="btn-control" onclick="game.systems.action.loadCellData().then(() => {
                        const cell = ${JSON.stringify(cell)};
                        window.huntActionModule.showHuntTargetSelection(cell);
                    })" style="margin-top: 10px;">
                        🔄 Загрузить ресурсы
                    </button>
                </div>
            `;
        }
        
        html += `
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn-control" onclick="window.huntActionModule.startQuickHunt(${cell.row}, ${cell.col})"
                            style="background: linear-gradient(135deg, #ff4444, #ff6666); padding: 10px 20px;">
                        🏹 Быстрая охота (случайный трофей)
                    </button>
                    <p style="color: #aaa; font-size: 11px; margin-top: 8px;">
                        Быстрая охота на случайного монстра с любым трофеем
                    </p>
                </div>
                
                <div style="margin-top: 20px; padding: 12px; background: rgba(0, 0, 0, 0.3); border-radius: 8px; border: 1px solid rgba(255, 255, 0, 0.3);">
                    <strong style="color: #ffff00;">⚠️ Особенности охоты:</strong>
                    <ul style="margin-top: 8px; padding-left: 20px; font-size: 11px; color: #ccc;">
                        <li>Всегда приводит к бою с монстром</li>
                        <li>При победе - двойной лут с монстра</li>
                        <li>Можно выбрать конкретный трофей</li>
                        <li>Более ценные трофеи имеют меньший шанс выпадения</li>
                    </ul>
                </div>
                
                <button class="btn-control" onclick="game.systems.action.updateCellActionsUI(${JSON.stringify(cell)})"
                        style="margin-top: 20px; width: 100%;">
                    ↩️ Назад к действиям
                </button>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
        
        // Стилизация
        this.styleHuntTargetSelection();
    }

    getCategoryDisplayName(categoryKey) {
        const names = {
            'bones': 'Кости',
            'leathers': 'Кожи',
            'hides': 'Шкуры',
            'furs': 'Меха'
        };
        return names[categoryKey] || categoryKey;
    }

    getCategoryIcon(categoryKey) {
        const icons = {
            'bones': '🦴',
            'leathers': '🐂',
            'hides': '🐅',
            'furs': '🦊'
        };
        return icons[categoryKey] || '🎯';
    }

    calculateResourceChance(resource) {
        // Рассчитываем шанс выпадения ресурса на основе его редкости
        const rarityMultipliers = {
            'common': 70,
            'uncommon': 40,
            'rare': 20
        };
        
        const rarity = resource.rarity || 'common';
        return rarityMultipliers[rarity] || 50;
    }

    // ========== ВЫБОР МОНСТРА ДЛЯ ТРОФЕЯ ==========

    selectResource(resourceId, row, col) {
        console.log(`🎯 Выбран ресурс: ${resourceId} на [${col},${row}]`);
        
        // Сохраняем выбранный ресурс и клетку
        this.selectedResourceId = resourceId;
        this.selectedRow = row;
        this.selectedCol = col;
        
        // Показываем монстров с этим ресурсом
        this.showMonstersForResource(resourceId, row, col);
    }

    showMonstersForResource(resourceId, row, col) {
        console.log(`🔍 Ищем монстров с ресурсом: ${resourceId}`);
        
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
                <div class="no-monsters">
                    <h3 style="color: #ff4444; text-align: center; margin-bottom: 15px;">
                        🚫 Нет подходящих монстров
                    </h3>
                    <p style="text-align: center; color: #aaa;">
                        Для трофея "${resourceInfo?.name || resourceId}" нет монстров с гарантированным выпадением.
                    </p>
                    <p style="text-align: center; color: #ffaa00; font-size: 12px; margin-top: 10px;">
                        Попробуйте выбрать другой трофей или быструю охоту.
                    </p>
                    <button class="btn-control" onclick="window.huntActionModule.showHuntTargetSelection(${JSON.stringify({col: col, row: row})})" 
                            style="margin-top: 20px; width: 100%;">
                        ↩️ Назад к выбору трофея
                    </button>
                </div>
            `;
            return;
        }
        
        // Сортируем монстров по уровню сложности
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
                    <button class="btn-control" onclick="window.huntActionModule.showHuntTargetSelection(${JSON.stringify({col: col, row: row})})" 
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
                
                <div class="hunt-info-banner" style="
                    background: linear-gradient(135deg, rgba(255, 100, 0, 0.1), rgba(255, 50, 0, 0.1));
                    border: 1px solid rgba(255, 100, 0, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 20px;
                    text-align: center;
                ">
                    <strong style="color: #ff6600;">🏹 ОСОБЕННОСТЬ ОХОТЫ:</strong>
                    <p style="margin-top: 8px; color: #ffaa00; font-size: 12px;">
                        При победе вы получите <strong>ДВОЙНОЙ ЛУТ</strong> с монстра!
                    </p>
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
            let resourceCount = 1;
            if (monster.loot.guaranteed) {
                const lootItem = monster.loot.guaranteed.find(l => l.id === resourceId);
                resourceCount = lootItem?.quantity || 1;
            }
            
            // Удваиваем количество для охоты
            const huntResourceCount = resourceCount * 2;
            
            html += `
                <div class="monster-card" data-monster-id="${monster.id}">
                    <div class="monster-header" style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="monster-name" style="font-size: 16px; font-weight: bold; color: #fff;">
                            ${monster.name}
                        </div>
                        <div class="monster-difficulty" style="font-size: 11px; color: ${difficultyColor}; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">
                            ${difficultyText} (Ур. ${monsterLevel})
                        </div>
                    </div>
                    
                    <div class="monster-stats" style="margin: 10px 0; font-size: 12px; background: rgba(0,0,0,0.2); padding: 8px; border-radius: 6px;">
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
                        <div style="color: #44ff44; display: flex; align-items: center; justify-content: space-between;">
                            <span>${resourceInfo?.name || resourceId}</span>
                            <div style="display: flex; align-items: center;">
                                <span style="margin-right: 5px;">×${huntResourceCount}</span>
                                <span style="color: #ffff00; font-size: 10px;">(×2)</span>
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 15px;">
                        <button class="btn-control" onclick="window.huntActionModule.startHuntWithMonster('${resourceId}', '${monster.id}', ${row}, ${col})"
                                style="padding: 8px 15px; font-size: 12px; background: linear-gradient(135deg, ${difficultyColor}, ${difficultyColor}99); width: 100%;">
                            🏹 Охотиться на этого
                        </button>
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
                        1. <strong>Выберите монстра</strong> для охоты<br>
                        2. <strong>Начинается бой</strong> с выбранным монстром<br>
                        3. <strong>При победе</strong> вы получите выбранный трофей<br>
                        4. <strong>Двойной лут</strong> - особенность охоты
                    </p>
                </div>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
        
        // Стилизация
        this.styleMonsterSelection();
    }

    // ========== ЗАПУСК ОХОТЫ ==========

    async startHuntWithMonster(resourceId, monsterId, row, col) {
        console.log(`🏹 Начинаем охоту на монстра ${monsterId} за ресурс ${resourceId} на [${col},${row}]`);
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            this.showNotification("❌ Система боя не доступна", 'error');
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
        
        // Создаем копию монстра с двойным лутом для охоты
        const huntMonster = JSON.parse(JSON.stringify(monster));
        
        // Удваиваем guaranteed лут
        if (huntMonster.loot.guaranteed) {
            huntMonster.loot.guaranteed = huntMonster.loot.guaranteed.map(item => {
                if (item.id === resourceId) {
                    return {
                        ...item,
                        quantity: (item.quantity || 1) * 2
                    };
                }
                return item;
            });
        }
        
        // Удваиваем random лут
        if (huntMonster.loot.random) {
            huntMonster.loot.random = huntMonster.loot.random.map(item => ({
                ...item,
                quantity: (item.quantity || 1) * 2
            }));
        }
        
        // Сохраняем информацию для послебоевой обработки
        this.mapSystem.pendingAction = {
            action: 'hunt',
            row: row,
            col: col,
            targetResource: resourceInfo || { id: resourceId, name: 'Трофей' },
            targetMonster: huntMonster,
            wasSuccess: true,
            doubleLoot: true,
            originalMonster: monster, // Сохраняем оригинального монстра для отображения
            huntModule: this // Ссылка на этот модуль для обработки результатов
        };
        
        console.log(`🏹 Начинаем охоту на ${monster.name} за ${resourceInfo?.name || resourceId}`);
        this.showNotification(`🏹 Начинается охота на ${monster.name}!`, 'info');
        
        // Обновляем интерфейс перед боем
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <div class="hunt-starting">
                    <div class="hunt-starting-icon" style="font-size: 48px; text-align: center; margin: 20px 0;">🏹</div>
                    <h3 style="color: #00ffcc; text-align: center;">Начинается охота!</h3>
                    <div style="text-align: center; margin: 20px 0;">
                        <div style="font-size: 18px; color: #fff; margin-bottom: 10px;">${monster.name}</div>
                        <div style="color: #aaa; font-size: 12px;">
                            Цель: ${resourceInfo?.name || resourceId}
                        </div>
                    </div>
                    <div style="text-align: center; color: #ffff00; margin-top: 20px;">
                        🎯 Особенность охоты: двойной лут!
                    </div>
                </div>
            `;
        }
        
        // Небольшая задержка перед началом боя для драматизма
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Начинаем бой
        battleSystem.startBattleWithSpecificMonster(hero, huntMonster, 'hunt');
    }

    // ========== БЫСТРАЯ ОХОТА ==========

    async startQuickHunt(row, col) {
        console.log(`🏹 Быстрая охота на [${col},${row}]`);
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            this.showNotification("❌ Система боя не доступна", 'error');
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
            this.showNotification("❌ Нет подходящих монстров для охоты", 'warning');
            return;
        }
        
        // Создаем копию монстра с двойным лутом
        const huntMonster = JSON.parse(JSON.stringify(randomMonster));
        
        // Удваиваем весь лут
        if (huntMonster.loot.guaranteed) {
            huntMonster.loot.guaranteed = huntMonster.loot.guaranteed.map(item => ({
                ...item,
                quantity: (item.quantity || 1) * 2
            }));
        }
        
        if (huntMonster.loot.random) {
            huntMonster.loot.random = huntMonster.loot.random.map(item => ({
                ...item,
                quantity: (item.quantity || 1) * 2
            }));
        }
        
        this.mapSystem.pendingAction = {
            action: 'hunt',
            row: row,
            col: col,
            wasSuccess: true,
            doubleLoot: true,
            targetMonster: huntMonster,
            originalMonster: randomMonster,
            huntModule: this
        };
        
        console.log(`🏹 Быстрая охота на ${randomMonster.name}`);
        this.showNotification(`🏹 Быстрая охота на ${randomMonster.name}!`, 'info');
        
        // Обновляем интерфейс
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <div class="quick-hunt-starting">
                    <div style="font-size: 48px; text-align: center; margin: 20px 0;">🎯</div>
                    <h3 style="color: #ffaa00; text-align: center;">Быстрая охота!</h3>
                    <div style="text-align: center; margin: 20px 0;">
                        <div style="font-size: 18px; color: #fff; margin-bottom: 10px;">${randomMonster.name}</div>
                        <div style="color: #aaa; font-size: 12px;">
                            Случайный монстр - случайный трофей
                        </div>
                    </div>
                    <div style="text-align: center; color: #ffff00; margin-top: 20px;">
                        🎯 Особенность: двойной лут со всех монстров!
                    </div>
                </div>
            `;
        }
        
        // Задержка перед боем
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Начинаем бой
        battleSystem.startBattleWithSpecificMonster(hero, huntMonster, 'hunt');
    }

    // ========== ОБРАБОТКА РЕЗУЛЬТАТОВ ОХОТЫ ==========

    completeHuntAfterBattle(victory, escape, doubleLoot = true) {
        console.log(`🏹 HuntAction.completeHuntAfterBattle: победа=${victory}, побег=${escape}, двойной лут=${doubleLoot}`);
        
        if (!this.mapSystem.pendingAction || this.mapSystem.pendingAction.action !== 'hunt') {
            console.error("❌ Нет ожидающего действия охоты");
            return;
        }
        
        const { row, col, targetResource, originalMonster, wasSuccess } = this.mapSystem.pendingAction;
        
        if (victory && wasSuccess) {
            if (targetResource) {
                // Добавляем ресурс герою
                this.addResourceToHero(targetResource, doubleLoot ? 2 : 1);
                
                let message = `🎉 Успешная охота! Получен: ${targetResource.name}`;
                if (doubleLoot) {
                    message += ' (двойной лут!)';
                }
                
                this.showNotification(message, 'success');
            } else {
                // Быстрая охота
                this.showNotification(`🎉 Быстрая охота успешна! Получен двойной лут с ${originalMonster.name}`, 'success');
            }
            
            // Помечаем клетку как исследованную
            const cellKey = `${col},${row}`;
            const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
            if (cell) {
                cell.explored = true;
                console.log(`✅ Клетка [${col},${row}] помечена как исследованная после успешной охоты`);
            }
            
        } else if (victory) {
            // Победа в бою, но не было действия охоты (маловероятно)
            this.showNotification("🎉 Победа в бою!", 'success');
        } else if (escape) {
            this.showNotification("🏃 Вы сбежали с поля боя", 'warning');
        } else {
            this.showNotification("💀 Вы проиграли бой", 'error');
        }
        
        // Очищаем pendingAction
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

    addResourceToHero(resource, quantity = 1) {
        if (!this.mapSystem.currentHero) {
            console.error("❌ Герой не найден для добавления ресурса");
            return;
        }
        
        const actionSystem = this.actionSystem;
        if (!actionSystem || !actionSystem.addResourceToHero) {
            console.error("❌ ActionSystem или метод addResourceToHero не доступен");
            return;
        }
        
        // Используем метод ActionSystem для добавления ресурса
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

    // ========== СТИЛИЗАЦИЯ UI ==========

    styleHuntTargetSelection() {
        setTimeout(() => {
            const grid = document.querySelector('.hunt-targets-grid');
            if (grid) {
                grid.style.cssText = `
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 12px;
                    margin-bottom: 15px;
                `;
            }
            
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
                    item.style.transform = 'translateY(-3px)';
                    item.style.boxShadow = '0 8px 20px rgba(0, 170, 255, 0.4)';
                    item.style.borderColor = '#00ffff';
                };
                item.onmouseleave = () => {
                    item.style.transform = 'translateY(0)';
                    item.style.boxShadow = 'none';
                    item.style.borderColor = '#00aaff';
                };
            });
            
            const categories = document.querySelectorAll('.hunt-category');
            categories.forEach(category => {
                const header = category.querySelector('h4');
                if (header) {
                    header.style.cssText = `
                        color: #00aaff;
                        margin: 20px 0 12px 0;
                        padding-bottom: 8px;
                        border-bottom: 1px solid rgba(0, 170, 255, 0.3);
                        font-size: 16px;
                    `;
                }
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
                    border-radius: 10px;
                    padding: 15px;
                    transition: all 0.2s ease;
                `;
                
                card.onmouseenter = () => {
                    card.style.transform = 'translateY(-3px)';
                    card.style.boxShadow = '0 10px 25px rgba(0, 170, 255, 0.3)';
                };
                card.onmouseleave = () => {
                    card.style.transform = 'translateY(0)';
                    card.style.boxShadow = 'none';
                };
            });
            
            const buttons = document.querySelectorAll('.monster-card .btn-control');
            buttons.forEach(button => {
                button.style.cssText = `
                    padding: 10px 15px;
                    font-size: 12px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-weight: bold;
                    color: white;
                `;
                
                button.onmouseenter = () => {
                    button.style.transform = 'scale(1.05)';
                    button.style.filter = 'brightness(1.2)';
                };
                button.onmouseleave = () => {
                    button.style.transform = 'scale(1)';
                    button.style.filter = 'brightness(1)';
                };
            });
        }, 50);
    }

    // ========== ТЕСТОВЫЕ МЕТОДЫ ==========

    testHuntSelection() {
        console.log("🧪 ТЕСТ: Симуляция выбора трофея");
        
        // Создаем тестовые данные
        const testResources = {
            'bones': [
                { id: 'small_bone', name: '🦴 Маленькая кость', description: 'Кость мелкого животного' },
                { id: 'wolf_bone', name: '🐺 Волчья кость', description: 'Кость волка' },
                { id: 'horse_bone', name: '🐴 Конская кость', description: 'Кость лошади' }
            ],
            'leathers': [
                { id: 'thin_leather', name: '🐂 Тонкая кожа', description: 'Кожа мелкого животного' },
                { id: 'strong_leather', name: '🦌 Прочная кожа', description: 'Кожа оленя' }
            ]
        };
        
        // Временная замена ресурсов для теста
        const originalResources = this.actionSystem.resources;
        this.actionSystem.resources = { ...originalResources, ...testResources };
        
        const testCell = { col: 0, row: 0 };
        this.showHuntTargetSelection(testCell);
        
        // Восстанавливаем оригинальные ресурсы
        setTimeout(() => {
            this.actionSystem.resources = originalResources;
        }, 100);
    }

    testMonsterSelection(resourceId, resourceName) {
        console.log(`🧪 ТЕСТ: Выбран трофей ${resourceName} (${resourceId})`);
        
        // Тестовые монстры
        const testMonsters = [
            { 
                id: 'wolf', 
                name: '🐺 Волк', 
                level: 2, 
                health: 50, 
                armor: 5, 
                damage: 15,
                loot: {
                    guaranteed: [
                        { id: resourceId, quantity: 1 }
                    ]
                }
            },
            { 
                id: 'bear', 
                name: '🐻 Медведь', 
                level: 3, 
                health: 80, 
                armor: 10, 
                damage: 25,
                loot: {
                    guaranteed: [
                        { id: resourceId, quantity: 1 }
                    ]
                }
            }
        ];
        
        // Временная замена монстров для теста
        const battleSystem = window.game?.systems?.battle;
        if (battleSystem) {
            const originalMonsters = battleSystem.monsters;
            battleSystem.monsters = [...(originalMonsters || []), ...testMonsters];
            
            const testCell = { col: 0, row: 0 };
            this.selectedResourceId = resourceId;
            this.selectedRow = 0;
            this.selectedCol = 0;
            
            this.showMonstersForResource(resourceId, 0, 0);
            
            // Восстанавливаем оригинальных монстров
            setTimeout(() => {
                battleSystem.monsters = originalMonsters;
            }, 100);
        }
    }
}

// Глобальная регистрация модуля
if (typeof window !== 'undefined') {
    window.HuntAction = HuntAction;
    console.log("📦 HuntAction модуль зарегистрирован глобально");
}

// Автоматическая регистрация в существующем ActionSystem
if (window.ActionSystem && window.game?.systems?.action) {
    setTimeout(() => {
        if (!window.game.systems.action.actionModules['hunt']) {
            window.game.systems.action.actionModules['hunt'] = new HuntAction(window.game.systems.action);
            console.log("✅ HuntAction автоматически зарегистрирован в ActionSystem");
        }
    }, 100);
}
