"use strict";

class MapActions {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        
        // Конфигурация действий
        this.baseActionChances = {
            'search_treasure': 25,
            'search_water': 30,
            'search_berries': 35,
            'search_mushrooms': 30,
            'search_herbs': 40,
            'search_ore': 20,
            'search_stone': 25,
            'set_trap': 50,
            'prepare_ambush': 45,
            'hunt': 70,
            'light_campfire': 80,
            'gather_wood': 60,
            'stealth_movement': 75
        };
        
        this.actionConfigs = {
            'search_treasure': {
                icon: '💰',
                name: 'Искать сокровища',
                description: 'Тщательно обыскать местность',
                class: 'action-treasure',
                resource_type: 'treasure'
            },
            'search_water': {
                icon: '💧',
                name: 'Искать воду',
                description: 'Найти источники воды',
                class: 'action-water',
                resource_type: 'water'
            },
            'search_berries': {
                icon: '🫐',
                name: 'Собирать ягоды',
                description: 'Собрать съедобные ягоды',
                class: 'action-berries',
                resource_type: 'berries'
            },
            'hunt': {
                icon: '🏹',
                name: 'Охотиться',
                description: 'Выследить и добыть дичь',
                class: 'action-hunt',
                resource_type: 'loot',
                triggers_monster: true,
                always_monster: true
            },
            'stealth_movement': {
                icon: '👣',
                name: 'Скрытное перемещение',
                description: 'Тихо передвинуться на соседнюю клетку',
                class: 'action-stealth',
                special: 'movement'
            }
        };
        
        this.allActions = Object.keys(this.actionConfigs);
        
        console.log("✅ MapActions инициализирован");
    }
    
    // ========== ИНТЕРФЕЙС ДЕЙСТВИЙ ==========
    
    updateCellActionsUI(cell) {
        const mapContent = document.querySelector('.tactical-map-content-with-actions');
        if (!mapContent) {
            console.error("❌ Контейнер карты не найден!");
            return;
        }
        
        // Создаем левую панель
        let leftPanel = document.querySelector('.cell-info-left-panel');
        if (!leftPanel) {
            leftPanel = document.createElement('div');
            leftPanel.className = 'cell-info-left-panel';
            mapContent.insertBefore(leftPanel, mapContent.firstChild);
        }
        
        // Получаем правую панель
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) {
            console.error("❌ Контейнер действий не найден!");
            this.mapSystem.createActionsContainerFallback();
            return;
        }
        
        this.mapSystem.selectedCell = cell;
        this.mapSystem.currentCellType = this.mapSystem.determineCellType(cell);
        const cellTypeData = this.mapSystem.cellTypes[this.mapSystem.currentCellType];
        
        if (!cellTypeData) {
            leftPanel.innerHTML = `<div class="cell-error">Ошибка загрузки типа клетки</div>`;
            actionsContainer.innerHTML = `<div class="cell-error">Ошибка загрузки типа клетки</div>`;
            return;
        }
        
        const isCurrentPosition = (cell.col === this.mapSystem.playerTacticalPosition.x && 
                               cell.row === this.mapSystem.playerTacticalPosition.y);
        const isReachable = this.mapSystem.isCellReachable(cell);
        const isExplored = cell.explored === true || 
                         this.mapSystem.isExplorationCompleted(cell.row, cell.col);
        
        // Получаем доступные действия
        this.mapSystem.currentCellActions = this.getAvailableActionsForCellType(this.mapSystem.currentCellType);
        
        // ========== ЛЕВАЯ ПАНЕЛЬ ==========
        leftPanel.innerHTML = this.createLeftPanelHTML(cell, cellTypeData, isCurrentPosition, isExplored);
        
        // ========== ПРАВАЯ ПАНЕЛЬ ==========
        let rightHTML = `
            <div class="actions-section" style="margin-bottom: 20px;">
                <h3 style="color: #00ffff; margin-bottom: 15px; text-align: center;">
                    ⚔️ Доступные действия
                </h3>
        `;
        
        if (!isExplored && cell.hasAction !== false) {
            if (this.mapSystem.currentCellActions.length > 0) {
                rightHTML += this.createActionsButtonsHTML(cell, isCurrentPosition, isReachable, isExplored);
                
                // Кнопка завершения исследования
                rightHTML += `
                    <div class="cell-completion-controls" style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #475569;">
                        <button class="btn-control complete-exploration-btn" 
                                onclick="game.systems.map.completeCellExploration(${cell.row}, ${cell.col})"
                                style="width: 100%; padding: 12px; background: linear-gradient(135deg, #10b981, #059669); color: white;">
                            ✓ Завершить исследование этой клетки
                        </button>
                    </div>
                `;
            } else {
                rightHTML += this.createNoActionsHTML();
            }
        } else if (isExplored) {
            rightHTML += this.createExploredCellHTML();
        } else if (cell.hasAction === false) {
            rightHTML += this.createNoActionsHTML();
        }
        
        rightHTML += `</div>`;
        
        // Легенда шансов
        rightHTML += `
            <div class="chance-legend" style="background: rgba(0, 0, 0, 0.4); border-radius: 8px; padding: 12px; margin-top: 15px;">
                <strong style="color: #00ffcc;">Легенда шансов:</strong>
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <span style="color: #ff4444;">0-39% - Плохой</span>
                    <span style="color: #ffaa00;">40-69% - Средний</span>
                    <span style="color: #44ff44;">70-89% - Хороший</span>
                    <span style="color: #00ffaa;">90-100% - Отличный</span>
                </div>
            </div>
        `;
        
        // Ресурсы героя
        rightHTML += `
            <div class="resource-info" style="margin-top: auto; padding-top: 20px; border-top: 1px solid #475569;">
                <h5 style="color: #00ffff; margin-bottom: 10px; text-align: center;">📦 Ресурсы героя:</h5>
                <div class="resource-list" id="heroResourcesListRight"></div>
            </div>
        `;
        
        actionsContainer.innerHTML = rightHTML;
        
        // Загружаем картинку
        if (cellTypeData) {
            this.displayLocationImage(cellTypeData, leftPanel);
        }
        
        // Обновляем ресурсы
        this.updateHeroResourcesUI('heroResourcesListRight');
        
        // Назначаем обработчики
        if (!isExplored && cell.hasAction !== false && this.mapSystem.currentCellActions.length > 0) {
            this.setupActionEventListeners();
        }
    }
    
    createLeftPanelHTML(cell, cellTypeData, isCurrentPosition, isExplored) {
        const cellIcon = this.mapSystem.objectSymbols[cell.type] || cellTypeData.icon || '❓';
        
        return `
            <div class="cell-info-header-left">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 20px; border-bottom: 2px solid rgba(0, 255, 204, 0.3); padding-bottom: 10px;">
                    📍 Информация о локации
                </h3>
                
                <div class="location-visual-container">
                    <div class="location-image-wrapper" id="locationImageWrapperLeft">
                        <div class="image-loading">🖼️ Загрузка изображения...</div>
                    </div>
                    <div class="location-icon-overlay">
                        <div class="cell-icon-large">${cellIcon}</div>
                    </div>
                </div>
                
                <h4 class="cell-name" style="color: #00ffcc; text-align: center; margin: 15px 0; font-size: 1.3rem;">
                    ${cellTypeData.name}
                </h4>
                
                <div class="cell-position-info" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(0, 0, 0, 0.3); border-radius: 6px; margin-bottom: 15px;">
                    <span class="cell-coords" style="color: #94a3b8; font-size: 14px;">
                        Позиция: [${cell.col}, ${cell.row}]
                    </span>
                    ${isCurrentPosition ? 
                        '<span class="current-position-badge" style="background: rgba(0, 255, 204, 0.2); color: #00ffcc; padding: 4px 8px; border-radius: 4px; font-size: 12px;">📍 Вы здесь</span>' : ''}
                    ${isExplored ? 
                        '<span class="explored-badge" style="background: rgba(0, 255, 0, 0.2); color: #00ff00; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✓ Исследовано</span>' : ''}
                </div>
                
                <div class="cell-description-text" style="color: #cbd5e1; font-size: 14px; line-height: 1.6; padding: 15px; background: rgba(0, 0, 0, 0.4); border-radius: 8px; margin-bottom: 15px;">
                    ${cellTypeData.description}
                </div>
            </div>
        `;
    }
    
    createActionsButtonsHTML(cell, isCurrentPosition, isReachable) {
        let html = `<div class="actions-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px;">`;
        
        this.mapSystem.currentCellActions.forEach(action => {
            const chance = this.getActionChance(action, this.mapSystem.currentCellType);
            const chancePercent = Math.round(chance);
            const config = this.actionConfigs[action] || {
                icon: '❓',
                name: action.replace(/_/g, ' '),
                description: 'Неизвестное действие'
            };
            
            let chanceColor = '#ff4444';
            if (chance >= 40) chanceColor = '#ffaa00';
            if (chance >= 70) chanceColor = '#44ff44';
            if (chance >= 90) chanceColor = '#00ffaa';
            
            let isDisabled = false;
            if (!isReachable) {
                isDisabled = true;
            } else if (!isCurrentPosition && config.requiresPlayerHere) {
                isDisabled = true;
            }
            
            const onClickHandler = !isDisabled ? 
                `onclick="window.game.systems.map.performCellAction('${action}', ${cell.row}, ${cell.col})"` : '';
            
            html += `
                <div class="action-card" style="background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9)); border: 1px solid ${isDisabled ? '#666' : '#00aaff'}; border-radius: 8px; padding: 12px; transition: all 0.2s ease; ${!isDisabled ? 'cursor: pointer;' : 'opacity: 0.6;'}" ${onClickHandler}>
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <div class="action-icon" style="font-size: 20px; margin-right: 10px; color: ${chanceColor};">
                            ${config.icon}
                        </div>
                        <div class="action-name" style="font-weight: bold; color: ${isDisabled ? '#888' : '#ffffff'}; font-size: 13px;">
                            ${config.name}
                        </div>
                    </div>
                    
                    <div class="action-description" style="color: ${isDisabled ? '#777' : '#b0b0ff'}; font-size: 11px; margin-bottom: 10px; line-height: 1.3;">
                        ${config.description}
                    </div>
                    
                    <div class="action-chance-display" style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                        <span style="color: #aaa;">Шанс:</span>
                        <div style="display: flex; align-items: center;">
                            <div style="width: 40px; height: 6px; background: #333; border-radius: 3px; margin-right: 8px; overflow: hidden;">
                                <div style="width: ${chancePercent}%; height: 100%; background: ${chanceColor}; border-radius: 3px;"></div>
                            </div>
                            <span style="color: ${chanceColor}; font-weight: bold;">${chancePercent}%</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        return html;
    }
    
    createNoActionsHTML() {
        return `
            <div class="no-available-actions" style="text-align: center; padding: 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">🚫</div>
                <p>Для этой локации нет доступных действий</p>
            </div>
        `;
    }
    
    createExploredCellHTML() {
        return `
            <div class="cell-explored" style="text-align: center; padding: 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">✓</div>
                <h4 style="color: #00ffcc;">Местность исследована</h4>
                <p style="color: #aaa;">Вы уже исследовали эту местность.</p>
            </div>
        `;
    }
    
    // ========== ВЫПОЛНЕНИЕ ДЕЙСТВИЙ ==========
    
    async performCellAction(action, row, col) {
        if (!this.mapSystem.currentHero) {
            this.mapSystem.showNotification("❌ Нужен герой для действий!", 'error');
            return;
        }
        
        const cellKey = this.mapSystem.getCellKey(row, col);
        const cell = this.mapSystem.getCellByKey(cellKey);
        
        if (!cell) {
            this.mapSystem.showNotification("❌ Клетка не найдена!", 'error');
            return;
        }
        
        // Проверка исследования
        if (this.mapSystem.isExplorationCompleted(row, col) || cell.explored === true) {
            this.mapSystem.showNotification("❌ Клетка уже исследована!", 'warning');
            return;
        }
        
        const config = this.actionConfigs[action] || {};
        
        // Обработка специальных действий
        if (action === 'hunt') {
            this.showHuntTargetSelection(cell);
            return;
        }
        
        if (action === 'stealth_movement') {
            if (!this.mapSystem.isCellReachable(cell)) {
                this.mapSystem.showNotification("❌ Клетка недостижима!", 'warning');
                return;
            }
            this.handleStealthMovement(cell);
            return;
        }
        
        // Стандартное действие с вероятностью
        this.showActionProbabilityWindow(action, row, col);
    }
    
    showActionProbabilityWindow(action, row, col) {
        const cellKey = this.mapSystem.getCellKey(row, col);
        const config = this.actionConfigs[action] || {};
        const baseChance = this.getActionChance(action, this.mapSystem.currentCellType);
        const currentChance = this.mapSystem.calculateActionChance(baseChance, cellKey, action);
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        const html = `
            <div class="action-probability-window">
                <h3 style="color: #00ffcc; margin-bottom: 15px; text-align: center;">
                    ${config.icon || '⚡'} ${config.name}
                </h3>
                
                <div class="probability-display" style="background: rgba(0, 0, 0, 0.4); padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: center;">
                    <div style="font-size: 16px; margin-bottom: 10px;">Текущая вероятность успеха:</div>
                    
                    <div style="font-size: 32px; font-weight: bold; color: ${currentChance >= 70 ? '#44ff44' : currentChance >= 40 ? '#ffaa00' : '#ff4444'}; margin: 15px 0;">
                        ${currentChance}%
                    </div>
                    
                    <div style="width: 100%; height: 20px; background: #333; border-radius: 10px; overflow: hidden; margin: 10px 0;">
                        <div style="width: ${currentChance}%; height: 100%; background: ${currentChance >= 70 ? '#44ff44' : currentChance >= 40 ? '#ffaa00' : '#ff4444'}; border-radius: 10px;"></div>
                    </div>
                </div>
                
                <div style="text-align: center; margin: 20px 0;">
                    <button class="btn-control" onclick="window.game.systems.map.executeActionWithProbability('${action}', ${row}, ${col})"
                            style="padding: 15px 30px; font-size: 16px; background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                        🎲 Попробовать удачу!
                    </button>
                </div>
                
                <button class="btn-control" onclick="window.game.systems.map.updateCellActionsUI(this.selectedCell)" 
                        style="margin-top: 20px; width: 100%; background: #6b7280;">
                    ↩️ Назад к действиям
                </button>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
    }
    
    async executeActionWithProbability(action, row, col) {
        const cellKey = this.mapSystem.getCellKey(row, col);
        const baseChance = this.getActionChance(action, this.mapSystem.currentCellType);
        const currentChance = this.mapSystem.calculateActionChance(baseChance, cellKey, action);
        
        const roll = Math.random() * 100;
        const success = roll <= currentChance;
        
        // Показываем анимацию броска
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <div class="dice-roll-animation" style="text-align: center;">
                    <h3 style="color: #00ffcc;">🎲 Бросок удачи...</h3>
                    <div style="font-size: 48px; margin: 20px 0; color: ${success ? '#44ff44' : '#ff4444'};">
                        ${roll.toFixed(1)}
                    </div>
                    <div style="font-size: 24px; color: ${success ? '#44ff44' : '#ff4444'};">
                        ${success ? '✅ УСПЕХ!' : '❌ НЕУДАЧА'}
                    </div>
                </div>
            `;
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (success) {
            this.handleActionSuccess(action, row, col);
            this.mapSystem.reduceActionChance(cellKey, action);
        } else {
            this.handleActionFailure(action);
        }
    }
    
    handleActionSuccess(action, row, col) {
        const config = this.actionConfigs[action];
        const successMessages = {
            'search_treasure': "💰 Найдены ценности!",
            'search_water': "💧 Найдена вода!",
            'search_berries': "🫐 Собраны ягоды!",
            'hunt': "🏹 Успешная охота!"
        };
        
        const message = successMessages[action] || "✅ Действие успешно!";
        this.mapSystem.showNotification(message, 'success');
        
        // Отмечаем клетку как исследованную
        this.mapSystem.markCellAsExplored(row, col);
    }
    
    handleActionFailure(action) {
        const failureMessages = {
            'search_treasure': "❌ Ничего ценного не найдено...",
            'search_water': "❌ Вода оказалась непригодной",
            'search_berries': "❌ Ягоды оказались неспелыми",
            'hunt': "❌ Не удалось найти дичь"
        };
        
        this.mapSystem.showNotification(failureMessages[action] || "❌ Действие не удалось", 'warning');
    }
    
    // ========== ОХОТА ==========
    
    showHuntTargetSelection(cell) {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            actionsContainer.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h3 style="color: #ff4444;">❌ Система боя недоступна</h3>
                    <button class="btn-control" onclick="window.game.systems.map.updateCellActionsUI(this.selectedCell)" 
                            style="margin-top: 20px;">
                        ↩️ Назад
                    </button>
                </div>
            `;
            return;
        }
        
        const huntableMonsters = this.getHuntableMonsters();
        
        if (huntableMonsters.length === 0) {
            actionsContainer.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h3 style="color: #ff4444;">❌ Нет доступных целей</h3>
                    <p>В этой местности нет подходящей дичи.</p>
                    <button class="btn-control" onclick="window.game.systems.map.updateCellActionsUI(this.selectedCell)" 
                            style="margin-top: 20px;">
                        ↩️ Назад
                    </button>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="hunt-target-selection">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 20px;">
                    🏹 Выберите цель охоты
                </h3>
                
                <div class="hunt-targets-list">
        `;
        
        huntableMonsters.forEach(monster => {
            html += `
                <div class="hunt-target-card" onclick="window.game.systems.map.startHuntForMonster(${cell.row}, ${cell.col}, '${monster.id}')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="font-size: 24px;">${monster.image || '🐾'}</div>
                            <div>
                                <div style="font-weight: bold;">${monster.name}</div>
                                <div style="font-size: 12px; color: #aaa;">❤️ ${monster.health} HP</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <button class="btn-control" onclick="window.game.systems.map.updateCellActionsUI(this.selectedCell)" 
                        style="margin-top: 20px; width: 100%;">
                    ↩️ Назад
                </button>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
    }
    
    getHuntableMonsters() {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return [];
        
        const allMonsters = battleSystem.monsters || [];
        return allMonsters.filter(monster => {
            const animalTypes = ['волк', 'медведь', 'кабан', 'олень', 'лось', 'лиса', 'рысь'];
            return animalTypes.some(type => monster.name.toLowerCase().includes(type));
        });
    }
    
    // ========== СКРЫТНОЕ ПЕРЕМЕЩЕНИЕ ==========
    
    handleStealthMovement(cell) {
        const neighbors = this.mapSystem.getHexNeighbors(
            this.mapSystem.playerTacticalPosition.y, 
            this.mapSystem.playerTacticalPosition.x
        );
        
        const availableCells = neighbors.filter(neighbor => {
            const neighborCell = this.mapSystem.currentTacticalMap.cells[`${neighbor.col},${neighbor.row}`];
            return neighborCell && neighborCell.passable !== false;
        });
        
        if (availableCells.length === 0) {
            this.mapSystem.showNotification("❌ Нет доступных клеток!", 'warning');
            return;
        }
        
        // Выбираем первую доступную клетку
        const targetCell = availableCells[0];
        const baseChance = this.getActionChance('stealth_movement', this.mapSystem.currentCellType);
        const roll = Math.random() * 100;
        const success = roll <= baseChance;
        
        if (success) {
            this.mapSystem.handlePeacefulMovement(targetCell.col, targetCell.row, null);
            this.mapSystem.showNotification("👣 Вы тихо переместились", 'success');
        } else {
            this.mapSystem.showNotification("🚨 Вас заметили! Начинается бой!", 'warning');
            
            const battleSystem = window.game?.systems?.battle;
            if (battleSystem) {
                battleSystem.startBattleWithMonster(this.mapSystem.currentHero, null, 'movement');
            }
        }
    }
    
    // ========== УТИЛИТЫ ==========
    
    getAvailableActionsForCellType(cellType) {
        const cellTypeData = this.mapSystem.cellTypes[cellType];
        if (!cellTypeData || !cellTypeData.action_chances) {
            return this.allActions.filter(action => (this.baseActionChances[action] || 25) > 0);
        }
        
        return Object.keys(cellTypeData.action_chances)
            .filter(action => cellTypeData.action_chances[action] > 0)
            .sort((a, b) => cellTypeData.action_chances[b] - cellTypeData.action_chances[a]);
    }
    
    getActionChance(action, cellType) {
        const cellTypeData = this.mapSystem.cellTypes[cellType];
        
        if (cellTypeData?.action_chances?.[action] !== undefined) {
            return cellTypeData.action_chances[action];
        }
        
        return this.baseActionChances[action] || 25;
    }
    
    displayLocationImage(cellTypeData, container) {
        const imageWrapper = container?.querySelector('#locationImageWrapperLeft');
        if (!imageWrapper) return;
        
        const img = new Image();
        img.onload = () => {
            imageWrapper.innerHTML = '';
            img.className = 'location-image';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            imageWrapper.appendChild(img);
        };
        img.onerror = () => {
            this.displayFallbackLocationImage(cellTypeData, container);
        };
        img.src = cellTypeData.image || '';
    }
    
    displayFallbackLocationImage(cellTypeData, container) {
        const imageWrapper = container?.querySelector('#locationImageWrapperLeft');
        if (!imageWrapper) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 250;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 400, 250);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 250);
        
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(cellTypeData.name, 200, 35);
        
        ctx.font = 'bold 64px Arial';
        ctx.fillText(cellTypeData.icon || '❓', 200, 120);
        
        const img = new Image();
        img.src = canvas.toDataURL();
        
        img.onload = () => {
            imageWrapper.innerHTML = '';
            imageWrapper.appendChild(img);
        };
    }
    
    updateHeroResourcesUI(containerId = 'heroResourcesList') {
        const resourcesList = document.getElementById(containerId);
        if (!resourcesList || !this.mapSystem.currentHero) return;
        
        if (!this.mapSystem.currentHero.resources || Object.keys(this.mapSystem.currentHero.resources).length === 0) {
            resourcesList.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">Ресурсов пока нет</div>';
            return;
        }
        
        let resourcesHTML = '';
        Object.values(this.mapSystem.currentHero.resources).forEach(resource => {
            const icon = this.getResourceIcon(resource.type);
            resourcesHTML += `
                <div class="resource-item" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(0, 0, 0, 0.3); border-radius: 6px; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 18px;">${icon}</span>
                        <span style="color: #cbd5e1; font-size: 14px;">${resource.name}</span>
                    </div>
                    <span style="color: #f59e0b; font-weight: bold;">x${resource.count}</span>
                </div>
            `;
        });
        
        resourcesList.innerHTML = resourcesHTML;
    }
    
    getResourceIcon(resourceType) {
        const icons = {
            'treasure': '💰',
            'water': '💧',
            'berries': '🫐',
            'loot': '📦'
        };
        return icons[resourceType] || '📦';
    }
    
    setupActionEventListeners() {
        const actionButtons = document.querySelectorAll('.action-card[onclick]');
        console.log(`🎯 Найдено ${actionButtons.length} кнопок действий`);
    }
}
