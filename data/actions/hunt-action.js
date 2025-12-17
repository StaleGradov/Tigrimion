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
        
        // Получаем клетку
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (cell) {
            // Показываем выбор трофея
            this.showHuntTargetSelection(cell);
        } else {
            console.error("❌ Клетка не найдена");
            this.showNotification("❌ Клетка не найдена!", 'error');
        }
    }

    // ========== ВЫБОР ТРОФЕЯ ==========

  showHuntTargetSelection(cell) {
    console.log("🎯 Показываем выбор трофея для охоты");
    
    const actionsContainer = document.getElementById('cellActionsContainer');
    if (!actionsContainer) return;
    
    // Проверяем есть ли ресурсы в ActionSystem
    const actionSystem = this.actionSystem;
    const resources = actionSystem.resources || {};
    
    // Категории охотничьих ресурсов
    const huntCategories = [
        { key: 'bones', name: '🦴 Кости', icon: '🦴' },
        { key: 'leathers', name: '🐂 Кожи', icon: '🐂' },
        { key: 'hides', name: '🐅 Шкуры', icon: '🐅' },
        { key: 'furs', name: '🦊 Меха', icon: '🦊' }
    ];
    
    // Собираем все ресурсы в один массив с метаданными категории
    const allResources = [];
    
    huntCategories.forEach(category => {
        const categoryResources = resources[category.key] || [];
        categoryResources.forEach(resource => {
            allResources.push({
                ...resource,
                category: category.name,
                categoryIcon: category.icon
            });
        });
    });
    
    // Сортируем ресурсы по категориям для группировки
    allResources.sort((a, b) => {
        return huntCategories.findIndex(c => c.name === a.category) - 
               huntCategories.findIndex(c => c.name === b.category);
    });
    
    // Создаем HTML
    let html = `
        <div class="hunt-target-selection">
            <h3 style="color: #00ffcc; text-align: center; margin-bottom: 15px;">
                🏹 ВЫБЕРИТЕ ТРОФЕЙ ДЛЯ ОХОТЫ
            </h3>
            <p style="text-align: center; color: #aaa; margin-bottom: 20px;">
                Клетка [${cell.col}, ${cell.row}]
            </p>
            
            <div class="hunt-resources-grid">
    `;
    
    if (allResources.length > 0) {
        // Разделяем ресурсы на две колонки
        const midIndex = Math.ceil(allResources.length / 2);
        const leftColumn = allResources.slice(0, midIndex);
        const rightColumn = allResources.slice(midIndex);
        
        html += `
            <div class="hunt-columns">
                <div class="hunt-column">
        `;
        
        // Левая колонка
        leftColumn.forEach(resource => {
            html += `
                <div class="hunt-resource-item" 
                     onclick="window.game.systems.action.actionModules.hunt.selectResource('${resource.id}', ${cell.row}, ${cell.col})">
                    <div class="resource-category" style="color: #00aaff; font-size: 11px; margin-bottom: 3px;">
                        ${resource.categoryIcon} ${resource.category}
                    </div>
                    <div class="resource-name" style="font-size: 14px; margin-bottom: 5px;">
                        ${resource.name}
                    </div>
                    <div class="resource-description" style="font-size: 10px; color: #aaa; margin-bottom: 5px;">
                        ${resource.description || 'Охотничий трофей'}
                    </div>
                    ${resource.price ? `
                        <div class="resource-price" style="font-size: 9px; color: #f59e0b;">
                            Цена: ${resource.price} золота
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        html += `
                </div>
                <div class="hunt-column">
        `;
        
        // Правая колонка
        rightColumn.forEach(resource => {
            html += `
                <div class="hunt-resource-item" 
                     onclick="window.game.systems.action.actionModules.hunt.selectResource('${resource.id}', ${cell.row}, ${cell.col})">
                    <div class="resource-category" style="color: #00aaff; font-size: 11px; margin-bottom: 3px;">
                        ${resource.categoryIcon} ${resource.category}
                    </div>
                    <div class="resource-name" style="font-size: 14px; margin-bottom: 5px;">
                        ${resource.name}
                    </div>
                    <div class="resource-description" style="font-size: 10px; color: #aaa; margin-bottom: 5px;">
                        ${resource.description || 'Охотничий трофей'}
                    </div>
                    ${resource.price ? `
                        <div class="resource-price" style="font-size: 9px; color: #f59e0b;">
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
    } else {
        html += `
            <div style="text-align: center; padding: 20px; color: #ffaa00;">
                <p>⚠️ Ресурсы не загружены</p>
                <button class="btn-control" onclick="game.systems.action.loadCellData().then(() => {
                    const cell = ${JSON.stringify(cell)};
                    game.systems.action.actionModules.hunt.showHuntTargetSelection(cell);
                })" style="margin-top: 10px;">
                    🔄 Загрузить ресурсы
                </button>
            </div>
        `;
    }
    
    html += `
            </div>
            
            <div style="margin-top: 20px; text-align: center;">
                <button class="btn-control" onclick="game.systems.action.actionModules.hunt.startQuickHunt(${cell.row}, ${cell.col})"
                        style="background: linear-gradient(135deg, #ff4444, #ff6666);">
                    🏹 Быстрая охота (случайный трофей)
                </button>
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
                    <button class="btn-control" onclick="game.systems.action.actionModules.hunt.showHuntTargetSelection(${JSON.stringify({col: col, row: row})})" 
                            style="margin-top: 20px; width: 100%;">
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
                    <button class="btn-control" onclick="game.systems.action.actionModules.hunt.showHuntTargetSelection(${JSON.stringify({col: col, row: row})})" 
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
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 15px;">
                        <button class="btn-control" onclick="game.systems.action.actionModules.hunt.startHuntWithMonster('${resourceId}', '${monster.id}', ${row}, ${col})"
                                style="padding: 8px 15px; font-size: 12px; background: linear-gradient(135deg, ${difficultyColor}, ${difficultyColor}99);">
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

    startHuntWithMonster(resourceId, monsterId, row, col) {
        console.log(`🏹 Начинаем охоту на монстра ${monsterId} за ресурс ${resourceId} на [${col},${row}]`);
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
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
            doubleLoot: true
        };
        
        console.log(`🏹 Начинаем охоту на ${monster.name} за ${resourceInfo?.name || resourceId}`);
        this.showNotification(`🏹 Начинается охота на ${monster.name}!`, 'info');
        
        // Начинаем бой
        battleSystem.startBattleWithSpecificMonster(hero, monster, 'hunt');
    }

    // ========== БЫСТРАЯ ОХОТА (без выбора трофея) ==========

    startQuickHunt(row, col) {
        console.log(`🏹 Быстрая охота на [${col},${row}]`);
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            return;
        }
        
        // Получаем героя
        const hero = this.mapSystem.currentHero || window.game?.currentHero || window.game?.systems?.map?.currentHero;
        if (!hero) {
            console.error("❌ Герой не найден");
            return;
        }
        
        const randomMonster = battleSystem.getRandomMonsterForMovement();
        if (!randomMonster) {
            console.error("❌ Нет доступных монстров");
            return;
        }
        
        this.mapSystem.pendingAction = {
            action: 'hunt',
            row: row,
            col: col,
            wasSuccess: true,
            doubleLoot: true
        };
        
        console.log(`🏹 Быстрая охота на ${randomMonster.name}`);
        this.showNotification(`🏹 Быстрая охота на ${randomMonster.name}!`, 'info');
        
        battleSystem.startBattleWithSpecificMonster(hero, randomMonster, 'hunt');
    }

    // ========== ОБРАБОТКА РЕЗУЛЬТАТОВ ==========

    completeHuntAfterBattle(victory, escape, doubleLoot = false) {
        console.log(`🏹 Завершение охоты: победа=${victory}, побег=${escape}, двойной лут=${doubleLoot}`);
        
        if (!this.mapSystem.pendingAction || this.mapSystem.pendingAction.action !== 'hunt') {
            console.error("❌ Нет ожидающего действия охоты");
            return;
        }
        
        const { row, col, targetResource, wasSuccess } = this.mapSystem.pendingAction;
        
        if (victory && wasSuccess && targetResource) {
            // Добавляем ресурс герою
            this.addResourceToHero(targetResource, doubleLoot ? 2 : 1);
            
            let message = `🎉 Успешная охота! Получен: ${targetResource.name}`;
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
        const columns = document.querySelector('.hunt-columns');
        if (columns) {
            columns.style.cssText = `
                display: flex;
                gap: 15px;
                margin-bottom: 20px;
            `;
        }
        
        const columnElements = document.querySelectorAll('.hunt-column');
        columnElements.forEach(column => {
            column.style.cssText = `
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 10px;
            `;
        });
        
        const items = document.querySelectorAll('.hunt-resource-item');
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
