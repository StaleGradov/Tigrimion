"use strict";

class HerbsAction {
    constructor(actionSystem) {
        this.actionSystem = actionSystem;
        this.mapSystem = actionSystem.mapSystem;
        this.config = {
            id: 'search_herbs',
            icon: '🌿',
            name: 'Собирать травы',
            description: 'Найти лекарственные и полезные растения',
            class: 'action-herbs',
            resource_type: 'herbs'
        };
        
        // Регистрируем модуль в ActionSystem
        if (actionSystem) {
            actionSystem.registerModule('search_herbs', this);
            console.log("✅ HerbsAction зарегистрирован в ActionSystem");
        }
    }

    execute(row, col) {
        console.log(`🌿 HerbsAction.execute(): Начало сбора трав на [${col},${row}]`);
        
        // Получаем клетку
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (cell) {
            // Показываем выбор травы для сбора
            this.showHerbsSelection(cell);
        } else {
            console.error("❌ Клетка не найдена");
            this.showNotification("❌ Клетка не найдена!", 'error');
        }
    }

    // ========== ВЫБОР ТРАВЫ ДЛЯ СБОРА ==========

    showHerbsSelection(cell) {
        console.log("🌿 Показываем выбор трав для сбора");
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        // Проверяем есть ли ресурсы в ActionSystem
        const actionSystem = this.actionSystem;
        const allHerbs = actionSystem.resources?.herbs || [];
        
        if (allHerbs.length === 0) {
            console.error("❌ Нет данных о травах");
            this.showNoHerbsAvailable(cell);
            return;
        }
        
        // Получаем базовую вероятность для этой клетки
        const cellType = this.actionSystem.determineCellType(cell);
        const baseChance = this.actionSystem.getActionChance('search_herbs', cellType);
        
        // Рассчитываем вероятности для каждой травы
        const herbsWithChances = this.calculateHerbProbabilities(allHerbs, baseChance);
        
        // Создаем HTML
        let html = `
            <div class="herbs-selection">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 15px;">
                    🌿 СОБИРАТЬ ТРАВЫ
                </h3>
                <p style="text-align: center; color: #aaa; margin-bottom: 20px;">
                    Клетка [${cell.col}, ${cell.row}] | Базовая вероятность: <span style="color: #00ffaa">${baseChance}%</span>
                </p>
                
                <div class="chance-explanation" style="
                    background: rgba(0, 100, 255, 0.1);
                    border: 1px solid #00aaff;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 20px;
                    font-size: 12px;
                    color: #aaa;
                ">
                    <strong style="color: #00aaff;">📊 Как работают шансы:</strong>
                    <ul style="margin: 10px 0 0 20px; padding: 0;">
                        <li>Базовая вероятность зависит от типа местности</li>
                        <li>Редкие травы имеют меньший шанс обнаружения</li>
                        <li>При неудаче может начаться бой с местной фауной</li>
                    </ul>
                </div>
                
                <div class="herbs-categories-container" style="
                    max-height: 500px;
                    overflow-y: auto;
                    padding-right: 10px;
                ">
        `;
        
        // Разделяем травы на две колонки
        const midIndex = Math.ceil(herbsWithChances.length / 2);
        const leftColumn = herbsWithChances.slice(0, midIndex);
        const rightColumn = herbsWithChances.slice(midIndex);
        
        html += `
            <div class="herbs-grid" style="display: flex; gap: 15px;">
                <div class="herbs-column" style="flex: 1;">
        `;
        
        // Левая колонка трав
        leftColumn.forEach(({herb, chance}) => {
            const chanceColor = this.getChanceColor(chance);
            const rarityColor = this.getRarityColor(herb.rarity);
            
            html += `
                <div class="herb-item" 
                     onclick="window.game.systems.action.actionModules['search_herbs'].attemptHerbGathering('${herb.id}', ${cell.row}, ${cell.col})">
                    <div class="herb-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div class="herb-name" style="font-size: 15px; font-weight: bold; color: #fff;">
                            ${herb.name}
                        </div>
                        <div class="herb-rarity" style="
                            font-size: 10px;
                            color: ${rarityColor};
                            padding: 2px 6px;
                            background: rgba(0,0,0,0.3);
                            border-radius: 10px;
                            border: 1px solid ${rarityColor};
                        ">
                            ${herb.rarity === 'common' ? 'Обычная' : 
                              herb.rarity === 'uncommon' ? 'Необычная' : 'Редкая'}
                        </div>
                    </div>
                    
                    <div class="herb-description" style="font-size: 11px; color: #aaa; margin-bottom: 10px; line-height: 1.3;">
                        ${herb.description}
                    </div>
                    
                    <div class="herb-chance-display" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-top: 10px;
                    ">
                        <span style="font-size: 11px; color: #ccc;">Шанс сбора:</span>
                        <div style="display: flex; align-items: center;">
                            <div style="
                                width: 60px;
                                height: 8px;
                                background: #333;
                                border-radius: 4px;
                                margin-right: 8px;
                                overflow: hidden;
                            ">
                                <div style="
                                    width: ${chance}%;
                                    height: 100%;
                                    background: ${chanceColor};
                                    border-radius: 4px;
                                "></div>
                            </div>
                            <span style="color: ${chanceColor}; font-weight: bold; font-size: 14px;">
                                ${chance}%
                            </span>
                        </div>
                    </div>
                    
                    <div class="herb-value" style="
                        margin-top: 8px;
                        font-size: 10px;
                        color: #f59e0b;
                        display: flex;
                        justify-content: space-between;
                    ">
                        <span>Ценность:</span>
                        <span>${herb.value || 0} единиц</span>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                <div class="herbs-column" style="flex: 1;">
        `;
        
        // Правая колонка трав
        rightColumn.forEach(({herb, chance}) => {
            const chanceColor = this.getChanceColor(chance);
            const rarityColor = this.getRarityColor(herb.rarity);
            
            html += `
                <div class="herb-item" 
                     onclick="window.game.systems.action.actionModules['search_herbs'].attemptHerbGathering('${herb.id}', ${cell.row}, ${cell.col})">
                    <div class="herb-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div class="herb-name" style="font-size: 15px; font-weight: bold; color: #fff;">
                            ${herb.name}
                        </div>
                        <div class="herb-rarity" style="
                            font-size: 10px;
                            color: ${rarityColor};
                            padding: 2px 6px;
                            background: rgba(0,0,0,0.3);
                            border-radius: 10px;
                            border: 1px solid ${rarityColor};
                        ">
                            ${herb.rarity === 'common' ? 'Обычная' : 
                              herb.rarity === 'uncommon' ? 'Необычная' : 'Редкая'}
                        </div>
                    </div>
                    
                    <div class="herb-description" style="font-size: 11px; color: #aaa; margin-bottom: 10px; line-height: 1.3;">
                        ${herb.description}
                    </div>
                    
                    <div class="herb-chance-display" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-top: 10px;
                    ">
                        <span style="font-size: 11px; color: #ccc;">Шанс сбора:</span>
                        <div style="display: flex; align-items: center;">
                            <div style="
                                width: 60px;
                                height: 8px;
                                background: #333;
                                border-radius: 4px;
                                margin-right: 8px;
                                overflow: hidden;
                            ">
                                <div style="
                                    width: ${chance}%;
                                    height: 100%;
                                    background: ${chanceColor};
                                    border-radius: 4px;
                                "></div>
                            </div>
                            <span style="color: ${chanceColor}; font-weight: bold; font-size: 14px;">
                                ${chance}%
                            </span>
                        </div>
                    </div>
                    
                    <div class="herb-value" style="
                        margin-top: 8px;
                        font-size: 10px;
                        color: #f59e0b;
                        display: flex;
                        justify-content: space-between;
                    ">
                        <span>Ценность:</span>
                        <span>${herb.value || 0} единиц</span>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
            
            <div style="margin-top: 25px; text-align: center;">
                <button class="btn-control" onclick="window.game.systems.action.actionModules['search_herbs'].attemptQuickHerbGathering(${cell.row}, ${cell.col})"
                        style="background: linear-gradient(135deg, #10b981, #059669); padding: 12px 24px; font-size: 14px;">
                    🌿 Быстрый сбор (случайная трава)
                </button>
                <p style="font-size: 11px; color: #aaa; margin-top: 8px;">
                    Будет выбрана трава со случайным шансом на основе базовой вероятности
                </p>
            </div>
            
            <div style="margin-top: 20px; padding: 15px; background: rgba(255, 100, 100, 0.1); border-radius: 8px; border: 1px solid rgba(255, 100, 100, 0.3);">
                <strong style="color: #ff6666; font-size: 12px;">⚠️ ВНИМАНИЕ:</strong>
                <p style="margin-top: 8px; font-size: 11px; color: #ffcccc;">
                    При неудачном сборе есть шанс привлечь внимание местных обитателей и начать бой!
                </p>
            </div>
            
            <button class="btn-control" onclick="game.systems.action.updateCellActionsUI(${JSON.stringify(cell)})"
                    style="margin-top: 20px; width: 100%; padding: 10px;">
                ↩️ Назад к действиям
            </button>
        </div>
    `;
        
        actionsContainer.innerHTML = html;
        
        // Стилизация
        this.styleHerbsSelection();
    }

    // ========== РАСЧЕТ ВЕРОЯТНОСТЕЙ ==========

    calculateHerbProbabilities(herbs, baseChance) {
        // Сортируем травы по редкости (common -> uncommon -> rare) и ценности
        const sortedHerbs = [...herbs].sort((a, b) => {
            // Сначала по редкости
            const rarityOrder = { 'common': 1, 'uncommon': 2, 'rare': 3 };
            if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) {
                return rarityOrder[a.rarity] - rarityOrder[b.rarity];
            }
            // Затем по ценности
            return (a.value || 0) - (b.value || 0);
        });
        
        // Рассчитываем вес для каждой травы на основе редкости
        const herbsWithWeights = sortedHerbs.map(herb => {
            let weight = 10; // базовый вес
            
            // Модификаторы на основе редкости
            if (herb.rarity === 'common') {
                weight = 15; // Более высокий шанс для обычных трав
            } else if (herb.rarity === 'uncommon') {
                weight = 8; // Средний шанс
            } else if (herb.rarity === 'rare') {
                weight = 3; // Низкий шанс
            }
            
            // Дополнительный модификатор на основе ценности
            const valueModifier = Math.max(1, 10 - Math.floor((herb.value || 0) / 5));
            weight = Math.max(1, weight * valueModifier / 10);
            
            return { herb, weight };
        });
        
        // Суммируем все веса
        const totalWeight = herbsWithWeights.reduce((sum, item) => sum + item.weight, 0);
        
        // Рассчитываем вероятность для каждой травы
        return herbsWithWeights.map(({ herb, weight }) => {
            let chance = Math.round((weight / totalWeight) * baseChance);
            
            // Гарантируем минимум 1% и максимум baseChance%
            chance = Math.max(1, Math.min(baseChance, chance));
            
            return { herb, chance };
        });
    }

    // ========== ПОПЫТКА СБОРА ТРАВЫ ==========

    attemptHerbGathering(herbId, row, col) {
        console.log(`🌿 Попытка собрать траву: ${herbId} на [${col},${row}]`);
        
        // Получаем информацию о траве
        const actionSystem = this.actionSystem;
        const herbInfo = actionSystem.resources?.herbs?.find(h => h.id === herbId);
        
        if (!herbInfo) {
            console.error(`❌ Трава с ID ${herbId} не найдена`);
            this.showNotification("❌ Ошибка: трава не найдена!", 'error');
            return;
        }
        
        // Получаем клетку
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        if (!cell) return;
        
        // Получаем базовую вероятность для клетки
        const cellType = this.actionSystem.determineCellType(cell);
        const baseChance = this.actionSystem.getActionChance('search_herbs', cellType);
        
        // Рассчитываем точную вероятность для этой травы
        const allHerbs = actionSystem.resources?.herbs || [];
        const herbsWithChances = this.calculateHerbProbabilities(allHerbs, baseChance);
        const herbChance = herbsWithChances.find(h => h.herb.id === herbId)?.chance || 0;
        
        // Показываем процесс сбора
        this.showGatheringProcess(herbInfo, herbChance, row, col);
    }

    showGatheringProcess(herbInfo, chance, row, col) {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        const rarityText = herbInfo.rarity === 'common' ? 'Обычная' : 
                          herbInfo.rarity === 'uncommon' ? 'Необычная' : 'Редкая';
        const rarityColor = this.getRarityColor(herbInfo.rarity);
        
        let html = `
            <div class="gathering-process">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 20px;">
                    🌿 СБОР ТРАВЫ
                </h3>
                
                <div class="herb-info-card" style="
                    background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9));
                    border: 2px solid ${rarityColor};
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 25px;
                    text-align: center;
                ">
                    <div class="herb-icon" style="font-size: 48px; margin-bottom: 15px;">
                        ${herbInfo.name.split(' ')[0]} <!-- Первый эмодзи -->
                    </div>
                    
                    <div class="herb-name-large" style="font-size: 20px; font-weight: bold; color: #fff; margin-bottom: 5px;">
                        ${herbInfo.name}
                    </div>
                    
                    <div class="herb-rarity-badge" style="
                        display: inline-block;
                        font-size: 12px;
                        color: ${rarityColor};
                        padding: 4px 12px;
                        background: rgba(0,0,0,0.3);
                        border-radius: 20px;
                        border: 1px solid ${rarityColor};
                        margin-bottom: 15px;
                    ">
                        ${rarityText} трава
                    </div>
                    
                    <div class="herb-description-large" style="
                        color: #aaa;
                        font-size: 14px;
                        line-height: 1.4;
                        margin-bottom: 20px;
                    ">
                        ${herbInfo.description}
                    </div>
                    
                    <div class="chance-display" style="
                        background: rgba(0, 0, 0, 0.4);
                        border-radius: 10px;
                        padding: 15px;
                        margin-top: 15px;
                    ">
                        <div style="font-size: 14px; color: #ccc; margin-bottom: 8px;">
                            Шанс успешного сбора:
                        </div>
                        <div style="font-size: 32px; font-weight: bold; color: ${this.getChanceColor(chance)};">
                            ${chance}%
                        </div>
                    </div>
                </div>
                
                <div class="gathering-animation" style="text-align: center;">
                    <div class="animation-icon" style="
                        font-size: 40px;
                        margin-bottom: 20px;
                        animation: pulse 1.5s infinite;
                    ">
                        🌿
                    </div>
                    
                    <div class="progress-container" style="
                        width: 100%;
                        height: 20px;
                        background: #1a1a2e;
                        border-radius: 10px;
                        overflow: hidden;
                        margin-bottom: 20px;
                        border: 1px solid #00ffcc;
                    ">
                        <div class="progress-bar" id="gatheringProgressBar" style="
                            width: 0%;
                            height: 100%;
                            background: linear-gradient(90deg, #00ffcc, #00ffff);
                            border-radius: 10px;
                            transition: width 1.5s ease-in-out;
                        "></div>
                    </div>
                    
                    <div class="gathering-text" style="
                        color: #00ffcc;
                        font-size: 14px;
                        margin-bottom: 30px;
                    ">
                        Идёт поиск и сбор травы...
                    </div>
                </div>
                
                <div class="gathering-warning" style="
                    padding: 15px;
                    background: rgba(255, 100, 100, 0.1);
                    border-radius: 8px;
                    border: 1px solid rgba(255, 100, 100, 0.3);
                    font-size: 12px;
                    color: #ffcccc;
                    text-align: center;
                ">
                    ⚠️ При неудаче может начаться бой с местными обитателями!
                </div>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
        
        // Запускаем анимацию прогресса
        setTimeout(() => {
            const progressBar = document.getElementById('gatheringProgressBar');
            if (progressBar) {
                progressBar.style.width = '100%';
            }
        }, 100);
        
        // Через 1.5 секунды определяем результат
        setTimeout(() => {
            this.resolveGatheringAttempt(herbInfo, chance, row, col);
        }, 1600);
    }

    // ========== ОПРЕДЕЛЕНИЕ РЕЗУЛЬТАТА ==========

    resolveGatheringAttempt(herbInfo, chance, row, col) {
        const roll = Math.random() * 100;
        const success = roll <= chance;
        
        console.log(`🌿 Бросок сбора травы: ${roll.toFixed(1)}/${chance} - ${success ? 'УСПЕХ' : 'ПРОВАЛ'}`);
        
        if (success) {
            this.handleHerbGatheringSuccess(herbInfo, row, col);
        } else {
            this.handleHerbGatheringFailure(row, col, herbInfo);
        }
    }

    handleHerbGatheringSuccess(herbInfo, row, col) {
        // Добавляем траву герою
        this.actionSystem.addResourceToHero(herbInfo.id, herbInfo.name, 1, 'herbs');
        
        // Показываем успешное сообщение
        this.showGatheringResult(true, herbInfo, row, col);
        
        // Помечаем клетку как исследованную (по желанию)
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        if (cell) {
            cell.explored = true;
        }
        
        // Сохраняем игру
        if (window.game?.saveGame) {
            window.game.saveGame();
        }
    }

    handleHerbGatheringFailure(row, col, herbInfo) {
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        const cellTypeData = this.actionSystem.cellTypes[this.actionSystem.determineCellType(cell)];
        
        // Шанс монстра при неудаче (например, 40% или из данных клетки)
        const monsterChance = cellTypeData?.failure_monster_chance || 40;
        const monsterRoll = Math.random() * 100;
        
        if (monsterRoll <= monsterChance) {
            console.log(`👹 Неудачный сбор привлёк монстра! Шанс: ${monsterChance}%, Выпало: ${monsterRoll}`);
            
            // Начинаем бой
            const battleSystem = window.game?.systems?.battle;
            if (battleSystem) {
                this.mapSystem.pendingAction = {
                    action: 'search_herbs',
                    row: row,
                    col: col,
                    attemptedHerb: herbInfo,
                    wasFailure: true
                };
                
                const monsterLevel = cellTypeData?.monster_level || 1;
                const monster = this.getMonsterByLevel(monsterLevel);
                
                if (monster) {
                    battleSystem.startBattleWithSpecificMonster(
                        this.mapSystem.currentHero, 
                        monster, 
                        'herb_gathering_failure'
                    );
                } else {
                    // Если монстр не найден, показываем простое сообщение о неудаче
                    this.showGatheringResult(false, herbInfo, row, col, false);
                }
            } else {
                this.showGatheringResult(false, herbInfo, row, col, false);
            }
        } else {
            // Просто неудача без боя
            this.showGatheringResult(false, herbInfo, row, col, false);
        }
    }

    showGatheringResult(success, herbInfo, row, col, monsterTriggered = false) {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        let html = '';
        
        if (success) {
            html = `
                <div class="gathering-result success">
                    <div class="result-icon" style="
                        font-size: 64px;
                        margin-bottom: 20px;
                        text-align: center;
                        animation: bounce 1s;
                    ">
                        ✅
                    </div>
                    
                    <h3 style="color: #00ffaa; text-align: center; margin-bottom: 15px;">
                        🌿 ТРАВА УСПЕШНО СОБРАНА!
                    </h3>
                    
                    <div class="result-card" style="
                        background: linear-gradient(135deg, rgba(20, 80, 60, 0.9), rgba(10, 50, 40, 0.9));
                        border: 2px solid #00ffaa;
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 20px;
                        text-align: center;
                    ">
                        <div style="font-size: 32px; margin-bottom: 10px;">
                            ${herbInfo.name.split(' ')[0]}
                        </div>
                        <div style="font-size: 18px; font-weight: bold; color: #fff; margin-bottom: 10px;">
                            ${herbInfo.name}
                        </div>
                        <div style="color: #aaffaa; font-size: 14px; margin-bottom: 15px;">
                            ${herbInfo.description}
                        </div>
                        <div style="
                            display: inline-block;
                            background: rgba(0, 255, 170, 0.2);
                            color: #00ffaa;
                            padding: 8px 16px;
                            border-radius: 20px;
                            font-size: 14px;
                            border: 1px solid #00ffaa;
                        ">
                            +1 в инвентарь
                        </div>
                    </div>
                    
                    <div class="result-message" style="
                        color: #aaffaa;
                        text-align: center;
                        font-size: 14px;
                        margin-bottom: 25px;
                    ">
                        Трава добавлена в ваш инвентарь ресурсов.
                    </div>
                </div>
            `;
        } else if (monsterTriggered) {
            html = `
                <div class="gathering-result monster">
                    <div class="result-icon" style="
                        font-size: 64px;
                        margin-bottom: 20px;
                        text-align: center;
                        animation: shake 0.5s;
                    ">
                        ⚔️
                    </div>
                    
                    <h3 style="color: #ff6666; text-align: center; margin-bottom: 15px;">
                        🚨 ВАС ОБНАРУЖИЛИ!
                    </h3>
                    
                    <div class="result-card" style="
                        background: linear-gradient(135deg, rgba(80, 20, 20, 0.9), rgba(50, 10, 10, 0.9));
                        border: 2px solid #ff4444;
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 20px;
                        text-align: center;
                    ">
                        <div style="font-size: 32px; margin-bottom: 10px;">
                            😱
                        </div>
                        <div style="font-size: 18px; font-weight: bold; color: #fff; margin-bottom: 10px;">
                            Сбор травы привлёк монстра!
                        </div>
                        <div style="color: #ffaaaa; font-size: 14px; margin-bottom: 15px;">
                            Ваши неуклюжие движения разозлили местных обитателей.
                        </div>
                        <div style="
                            display: inline-block;
                            background: rgba(255, 100, 100, 0.2);
                            color: #ff6666;
                            padding: 8px 16px;
                            border-radius: 20px;
                            font-size: 14px;
                            border: 1px solid #ff6666;
                        ">
                            Готовьтесь к бою!
                        </div>
                    </div>
                </div>
            `;
        } else {
            html = `
                <div class="gathering-result failure">
                    <div class="result-icon" style="
                        font-size: 64px;
                        margin-bottom: 20px;
                        text-align: center;
                        animation: fadeIn 1s;
                    ">
                        ❌
                    </div>
                    
                    <h3 style="color: #ffaa00; text-align: center; margin-bottom: 15px;">
                        🌿 НЕУДАЧА
                    </h3>
                    
                    <div class="result-card" style="
                        background: linear-gradient(135deg, rgba(80, 60, 20, 0.9), rgba(50, 40, 10, 0.9));
                        border: 2px solid #ffaa00;
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 20px;
                        text-align: center;
                    ">
                        <div style="font-size: 32px; margin-bottom: 10px;">
                            ${herbInfo.name.split(' ')[0]}
                        </div>
                        <div style="font-size: 18px; font-weight: bold; color: #fff; margin-bottom: 10px;">
                            ${herbInfo.name}
                        </div>
                        <div style="color: #ffccaa; font-size: 14px; margin-bottom: 15px;">
                            Не удалось собрать эту траву.
                        </div>
                        <div style="
                            display: inline-block;
                            background: rgba(255, 170, 0, 0.2);
                            color: #ffaa00;
                            padding: 8px 16px;
                            border-radius: 20px;
                            font-size: 14px;
                            border: 1px solid #ffaa00;
                        ">
                            Трава не получена
                        </div>
                    </div>
                    
                    <div class="result-message" style="
                        color: #ffccaa;
                        text-align: center;
                        font-size: 14px;
                        margin-bottom: 25px;
                    ">
                        Возможно, трава была ещё не созревшей или её уже кто-то собрал.
                    </div>
                </div>
            `;
        }
        
        // Кнопка возврата
        html += `
            <div style="text-align: center; margin-top: 30px;">
                <button class="btn-control" onclick="const cell = game.systems.map.currentTacticalMap.cells['${col},${row}']; game.systems.action.updateCellActionsUI(cell)"
                        style="padding: 12px 30px; font-size: 16px;">
                    ↩️ Вернуться к действиям
                </button>
            </div>
            
            <style>
                @keyframes bounce {
                    0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
                    40% {transform: translateY(-20px);}
                    60% {transform: translateY(-10px);}
                }
                @keyframes shake {
                    0%, 100% {transform: translateX(0);}
                    10%, 30%, 50%, 70%, 90% {transform: translateX(-5px);}
                    20%, 40%, 60%, 80% {transform: translateX(5px);}
                }
                @keyframes fadeIn {
                    from {opacity: 0;}
                    to {opacity: 1;}
                }
            </style>
        `;
        
        actionsContainer.innerHTML = html;
    }

    // ========== БЫСТРЫЙ СБОР ==========

    attemptQuickHerbGathering(row, col) {
        console.log(`🌿 Быстрый сбор травы на [${col},${row}]`);
        
        // Получаем информацию о травах
        const actionSystem = this.actionSystem;
        const allHerbs = actionSystem.resources?.herbs || [];
        
        if (allHerbs.length === 0) {
            this.showNotification("❌ Нет доступных трав для сбора", 'error');
            return;
        }
        
        // Получаем клетку
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        if (!cell) return;
        
        // Получаем базовую вероятность
        const cellType = this.actionSystem.determineCellType(cell);
        const baseChance = this.actionSystem.getActionChance('search_herbs', cellType);
        
        // Рассчитываем вероятности
        const herbsWithChances = this.calculateHerbProbabilities(allHerbs, baseChance);
        
        // Выбираем случайную траву на основе вероятностей
        let totalChance = 0;
        const randomValue = Math.random() * 100;
        
        for (const { herb, chance } of herbsWithChances) {
            totalChance += chance;
            if (randomValue <= totalChance) {
                this.attemptHerbGathering(herb.id, row, col);
                return;
            }
        }
        
        // Если что-то пошло не так, выбираем первую траву
        this.attemptHerbGathering(allHerbs[0].id, row, col);
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    getMonsterByLevel(level) {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return null;
        
        const allMonsters = battleSystem.monsters || [];
        if (!allMonsters || allMonsters.length === 0) return null;
        
        const suitableMonsters = allMonsters.filter(monster => {
            const monsterLevel = monster.level || 1;
            return Math.abs(monsterLevel - level) <= 1;
        });
        
        if (suitableMonsters.length > 0) {
            return suitableMonsters[Math.floor(Math.random() * suitableMonsters.length)];
        }
        
        return allMonsters[Math.floor(Math.random() * allMonsters.length)];
    }

    getChanceColor(chance) {
        if (chance >= 70) return '#00ffaa';
        if (chance >= 40) return '#ffaa00';
        return '#ff4444';
    }

    getRarityColor(rarity) {
        switch(rarity) {
            case 'common': return '#44ff44';
            case 'uncommon': return '#00aaff';
            case 'rare': return '#ff44ff';
            default: return '#cccccc';
        }
    }

    showNoHerbsAvailable(cell) {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        actionsContainer.innerHTML = `
            <div class="no-herbs-available">
                <h3 style="color: #ffaa00; text-align: center; margin-bottom: 20px;">
                    🌿 ТРАВЫ НЕ НАЙДЕНЫ
                </h3>
                
                <div style="
                    background: rgba(255, 170, 0, 0.1);
                    border: 1px solid rgba(255, 170, 0, 0.3);
                    border-radius: 8px;
                    padding: 20px;
                    margin-bottom: 20px;
                    text-align: center;
                ">
                    <div style="font-size: 48px; margin-bottom: 15px;">
                        🚫
                    </div>
                    <div style="color: #ffccaa; font-size: 14px; margin-bottom: 15px;">
                        На этой локации нет трав, доступных для сбора.
                    </div>
                    <div style="color: #ffaa00; font-size: 12px;">
                        Попробуйте другое место, например, лесную поляну или лужайку.
                    </div>
                </div>
                
                <button class="btn-control" onclick="game.systems.action.updateCellActionsUI(${JSON.stringify(cell)})"
                        style="width: 100%; padding: 12px; margin-top: 20px;">
                    ↩️ Вернуться к действиям
                </button>
            </div>
        `;
    }

    showNotification(message, type = 'info') {
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // ========== СТИЛИЗАЦИЯ ==========

    styleHerbsSelection() {
        setTimeout(() => {
            // Получаем контейнер действий
            const actionsContainer = document.getElementById('cellActionsContainer');
            if (!actionsContainer) return;
            
            // Вычисляем высоту контейнера
            const containerHeight = actionsContainer.clientHeight;
            const scrollHeight = Math.floor(containerHeight * 0.7);
            
            // Настройка контейнера с прокруткой
            const categoriesContainer = document.querySelector('.herbs-categories-container');
            if (categoriesContainer) {
                categoriesContainer.style.cssText = `
                    max-height: ${scrollHeight}px !important;
                    height: ${scrollHeight}px !important;
                    overflow-y: auto !important;
                    padding-right: 10px !important;
                    margin-bottom: 15px !important;
                `;
                
                // Стилизация скроллбара
                categoriesContainer.style.cssText += `
                    scrollbar-width: thin !important;
                    scrollbar-color: #00aaff #1a1a2e !important;
                    
                    ::-webkit-scrollbar {
                        width: 8px !important;
                    }
                    ::-webkit-scrollbar-track {
                        background: #1a1a2e !important;
                        border-radius: 4px !important;
                    }
                    ::-webkit-scrollbar-thumb {
                        background: #00aaff !important;
                        border-radius: 4px !important;
                    }
                    ::-webkit-scrollbar-thumb:hover {
                        background: #00ffff !important;
                    }
                `;
            }
            
            // Настройка сетки трав
            const herbsGrid = document.querySelector('.herbs-grid');
            if (herbsGrid) {
                herbsGrid.style.cssText = `
                    display: flex !important;
                    gap: 15px !important;
                    margin-bottom: 20px !important;
                `;
            }
            
            // Настройка колонок
            const columns = document.querySelectorAll('.herbs-column');
            columns.forEach(column => {
                column.style.cssText = `
                    flex: 1 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    gap: 12px !important;
                `;
            });
            
            // Настройка элементов трав
            const items = document.querySelectorAll('.herb-item');
            items.forEach(item => {
                item.style.cssText = `
                    background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9)) !important;
                    border: 1px solid #00aaff !important;
                    border-radius: 8px !important;
                    padding: 15px !important;
                    cursor: pointer !important;
                    transition: all 0.2s ease !important;
                `;
                
                item.onmouseenter = () => {
                    item.style.transform = 'translateY(-3px) scale(1.02)';
                    item.style.boxShadow = '0 8px 20px rgba(0, 170, 255, 0.4)';
                    item.style.zIndex = '10';
                };
                item.onmouseleave = () => {
                    item.style.transform = 'translateY(0) scale(1)';
                    item.style.boxShadow = 'none';
                    item.style.zIndex = 'auto';
                };
            });
            
            console.log(`✅ Контейнер трав установлен на ${scrollHeight}px`);
        }, 50);
    }
}

// Глобальная регистрация модуля
window.HerbsAction = HerbsAction;
console.log("📦 HerbsAction модуль загружен");

// Автоматическая регистрация в существующем ActionSystem
if (window.ActionSystem && window.game?.systems?.action) {
    setTimeout(() => {
        if (!window.game.systems.action.actionModules['search_herbs']) {
            window.game.systems.action.actionModules['search_herbs'] = new HerbsAction(window.game.systems.action);
            console.log("✅ HerbsAction автоматически зарегистрирован в ActionSystem");
        }
    }, 100);
}
