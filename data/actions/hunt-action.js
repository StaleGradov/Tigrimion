"use strict";

class HuntAction {
    constructor(actionSystem) {
        // Проверяем наличие actionSystem
        if (!actionSystem) {
            console.error("❌ HuntAction: actionSystem не передан");
            throw new Error("HuntAction требует actionSystem");
        }
        
        this.actionSystem = actionSystem;
        this.mapSystem = actionSystem?.mapSystem;
        
        // Данные для текущей охоты
        this.selectedResource = null;
        this.selectedRow = null;
        this.selectedCol = null;
        
        console.log("✅ HuntAction создан с actionSystem:", !!actionSystem);
        
        // Регистрация в ActionSystem
        try {
            if (actionSystem && typeof actionSystem.registerModule === 'function') {
                actionSystem.registerModule('hunt', this);
                console.log("✅ HuntAction зарегистрирован в ActionSystem");
            } else {
                console.warn("⚠️ ActionSystem не поддерживает registerModule");
            }
        } catch (error) {
            console.error("❌ Ошибка регистрации HuntAction:", error);
        }
    }

    // ========== ОСНОВНОЙ МЕТОД ==========

    async execute(row, col) {
        console.log(`🏹 HuntAction.execute(): Начало охоты на [${col},${row}]`);
        
        try {
            // Проверяем клетку
            const cellKey = `${col},${row}`;
            const cell = this.mapSystem?.currentTacticalMap?.cells?.[cellKey];
            
            if (!cell) {
                this.showNotification("❌ Клетка не найдена", 'error');
                return false;
            }
            
            if (cell.explored === true) {
                this.showNotification("❌ Эта клетка уже исследована", 'warning');
                return false;
            }
            
            // Сохраняем координаты
            this.selectedRow = row;
            this.selectedCol = col;
            
            // Показываем выбор трофея
            this.showHuntTargetSelection();
            
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка выполнения охоты:", error);
            this.showNotification("❌ Ошибка начала охоты", 'error');
            return false;
        }
    }

    // ========== ЭТАП 1: ВЫБОР ТРОФЕЯ ==========

    showHuntTargetSelection() {
        console.log("🎯 Этап 1: Показываем выбор трофея");
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) {
            console.error("❌ Контейнер действий не найден");
            this.showNotification("❌ Ошибка интерфейса", 'error');
            return;
        }
        
        // Получаем охотничьи ресурсы
        const huntResources = this.getHuntResources();
        
        let html = `
            <div class="hunt-target-selection">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 15px;">
                    🏹 ВЫБЕРИТЕ ТРОФЕЙ ДЛЯ ОХОТЫ
                </h3>
                <p style="text-align: center; color: #aaa; margin-bottom: 20px;">
                    Клетка [${this.selectedCol}, ${this.selectedRow}]
                </p>
                
                <div class="hunt-categories">
        `;
        
        // Отображаем ресурсы по категориям
        const categories = this.getResourceCategories();
        let hasResources = false;
        
        categories.forEach(category => {
            const categoryResources = huntResources.filter(r => this.getResourceType(r) === category.key);
            
            if (categoryResources.length > 0) {
                hasResources = true;
                
                html += `
                    <div class="hunt-category">
                        <h4 style="color: #00aaff; margin: 15px 0 10px 0;">
                            ${category.icon} ${category.name}
                        </h4>
                        <div class="hunt-targets-grid">
                `;
                
                categoryResources.slice(0, 3).forEach(resource => {
                    if (!resource || !resource.id || !resource.name) return;
                    
                    html += `
                        <div class="hunt-target-item" 
                             onclick="window.game?.systems?.action?.actionModules?.hunt?.selectResource('${resource.id}')">
                            <div class="hunt-target-name">${resource.name}</div>
                            ${resource.description ? `
                                <div class="hunt-target-description">${resource.description}</div>
                            ` : ''}
                            ${resource.price ? `
                                <div class="hunt-target-price">Цена: ${resource.price} золота</div>
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
        
        if (!hasResources) {
            html += `
                <div style="text-align: center; padding: 20px; color: #ffaa00;">
                    <p>⚠️ Ресурсы для охоты не найдены</p>
                </div>
            `;
        }
        
        html += `
                </div>
                
                <div style="margin-top: 20px; text-align: center;">
                    <button class="btn-control" onclick="window.game?.systems?.action?.actionModules?.hunt?.startQuickHunt()"
                            style="background: linear-gradient(135deg, #ff4444, #ff6666);">
                        🏹 Быстрая охота (случайный трофей)
                    </button>
                </div>
                
                <button class="btn-control" onclick="window.game?.systems?.action?.updateCellActionsUI(window.game?.systems?.map?.currentTacticalMap?.cells['${this.selectedCol},${this.selectedRow}'])"
                        style="margin-top: 20px; width: 100%;">
                    ↩️ Назад к действиям
                </button>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
        
        // Применяем стили
        setTimeout(() => {
            this.styleHuntTargetSelection();
        }, 50);
    }

    selectResource(resourceId) {
        console.log(`🎯 Выбран ресурс: ${resourceId}`);
        
        if (!resourceId) {
            this.showNotification("❌ Не выбран ресурс", 'error');
            return;
        }
        
        this.selectedResource = resourceId;
        
        // Переходим к выбору монстра
        this.showMonstersForResource();
    }

    // ========== ЭТАП 2: ВЫБОР МОНСТРА ==========

    showMonstersForResource() {
        console.log(`🔍 Этап 2: Ищем монстров с ресурсом: ${this.selectedResource}`);
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) {
            console.error("❌ Контейнер действий не найден");
            return;
        }
        
        // Получаем монстров с этим ресурсом
        const monstersWithResource = this.getMonstersWithResource(this.selectedResource);
        
        // Получаем информацию о ресурсе
        const resourceInfo = this.getResourceInfo(this.selectedResource);
        
        let html = `
            <div class="monster-selection">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: #00ffcc; margin: 0;">
                        🎯 ВЫБЕРИТЕ МОНСТРА ДЛЯ ОХОТЫ
                    </h3>
                    <button class="btn-control" onclick="window.game?.systems?.action?.actionModules?.hunt?.showHuntTargetSelection()" 
                            style="padding: 5px 10px; font-size: 12px;">
                        ↩️ Назад
                    </button>
                </div>
                
                <div class="selected-resource-info">
                    <div class="resource-name">Цель охоты: ${resourceInfo?.name || this.selectedResource}</div>
                    ${resourceInfo?.description ? `
                        <div class="resource-description">${resourceInfo.description}</div>
                    ` : ''}
                </div>
        `;
        
        if (!monstersWithResource || monstersWithResource.length === 0) {
            html += `
                <div class="no-monsters">
                    <p>🚫 Нет монстров с этим трофеем</p>
                    <button class="btn-control" onclick="window.game?.systems?.action?.actionModules?.hunt?.showHuntTargetSelection()">
                        ↩️ Назад к выбору трофея
                    </button>
                </div>
            `;
        } else {
            html += `<div class="monsters-grid">`;
            
            monstersWithResource.forEach(monster => {
                if (!monster || !monster.id) return;
                
                const monsterLevel = monster.level || 1;
                const difficulty = this.getMonsterDifficulty(monsterLevel);
                
                html += `
                    <div class="monster-card">
                        <div class="monster-header">
                            <div class="monster-name">${monster.name || 'Неизвестный монстр'}</div>
                            <div class="monster-difficulty" style="color: ${difficulty.color}">
                                ${difficulty.text} (Ур. ${monsterLevel})
                            </div>
                        </div>
                        
                        <div class="monster-stats">
                            <div><span>❤️ Здоровье:</span><span>${monster.health || 0}</span></div>
                            <div><span>🛡️ Броня:</span><span>${monster.armor || 0}</span></div>
                            <div><span>⚔️ Урон:</span><span>${monster.damage || 0}</span></div>
                        </div>
                        
                        <div class="monster-loot">
                            <div>🎁 Гарантированный лут:</div>
                            <div>${resourceInfo?.name || this.selectedResource}</div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 15px;">
                            <button class="btn-control" 
                                    onclick="window.game?.systems?.action?.actionModules?.hunt?.startHuntWithMonster('${monster.id}')"
                                    style="background: linear-gradient(135deg, ${difficulty.color}, ${difficulty.color}99);">
                                🏹 Охотиться на этого
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `</div>`;
        }
        
        html += `
                <div class="hunt-explanation">
                    <strong>📝 Как работает охота:</strong>
                    <p>
                        1. <strong>Выберите монстра</strong> для охоты<br>
                        2. <strong>Начинается бой</strong> с выбранным монстром<br>
                        3. <strong>При победе</strong> вы получите выбранный трофей<br>
                        4. <strong>Двойной лут</strong> - особенность охоты
                    </p>
                </div>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
        
        // Применяем стили
        setTimeout(() => {
            this.styleMonsterSelection();
        }, 50);
    }

    // ========== ЭТАП 3: НАЧАЛО ОХОТЫ ==========

    startHuntWithMonster(monsterId) {
        console.log(`🏹 Этап 3: Начинаем охоту на монстра ${monsterId}`);
        
        if (!monsterId) {
            this.showNotification("❌ Монстр не выбран", 'error');
            return;
        }
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem || typeof battleSystem.getMonsterById !== 'function') {
            this.showNotification("❌ Система боя не доступна", 'error');
            return;
        }
        
        // Получаем героя
        const hero = this.getCurrentHero();
        if (!hero) {
            this.showNotification("❌ Герой не найден", 'error');
            return;
        }
        
        // Находим монстра
        const monster = battleSystem.getMonsterById(monsterId);
        if (!monster) {
            this.showNotification("❌ Монстр не найден", 'error');
            return;
        }
        
        // Получаем информацию о ресурсе
        const resourceInfo = this.getResourceInfo(this.selectedResource);
        
        // Сохраняем информацию для послебоевой обработки
        if (this.mapSystem && this.selectedRow !== null && this.selectedCol !== null) {
            this.mapSystem.pendingAction = {
                action: 'hunt',
                row: this.selectedRow,
                col: this.selectedCol,
                targetResource: resourceInfo || { id: this.selectedResource, name: 'Трофей' },
                targetMonster: monster,
                wasSuccess: true,
                doubleLoot: true
            };
        }
        
        console.log(`🏹 Начинаем охоту на ${monster.name} за ${resourceInfo?.name || this.selectedResource}`);
        this.showNotification(`🏹 Начинается охота на ${monster.name}!`, 'info');
        
        // Начинаем бой
        try {
            battleSystem.startBattleWithSpecificMonster(hero, monster, 'hunt');
        } catch (error) {
            console.error("❌ Ошибка начала боя:", error);
            this.showNotification("❌ Не удалось начать охоту", 'error');
        }
    }

    // ========== БЫСТРАЯ ОХОТА ==========

    startQuickHunt() {
        console.log(`🏹 Быстрая охота на [${this.selectedCol},${this.selectedRow}]`);
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem || typeof battleSystem.getRandomMonsterForMovement !== 'function') {
            this.showNotification("❌ Система боя не доступна", 'error');
            return;
        }
        
        const hero = this.getCurrentHero();
        if (!hero) {
            this.showNotification("❌ Герой не найден", 'error');
            return;
        }
        
        const randomMonster = battleSystem.getRandomMonsterForMovement();
        if (!randomMonster) {
            this.showNotification("❌ Нет доступных монстров", 'warning');
            return;
        }
        
        if (this.mapSystem && this.selectedRow !== null && this.selectedCol !== null) {
            this.mapSystem.pendingAction = {
                action: 'hunt',
                row: this.selectedRow,
                col: this.selectedCol,
                wasSuccess: true,
                doubleLoot: true
            };
        }
        
        this.showNotification(`🏹 Быстрая охота на ${randomMonster.name}!`, 'info');
        
        try {
            battleSystem.startBattleWithSpecificMonster(hero, randomMonster, 'hunt');
        } catch (error) {
            console.error("❌ Ошибка быстрой охоты:", error);
            this.showNotification("❌ Не удалось начать охоту", 'error');
        }
    }

    // ========== ПОСЛЕБОЕВАЯ ОБРАБОТКА ==========

    completeHuntAfterBattle(victory, escape, doubleLoot = false) {
        console.log(`🏹 Завершение охоты: победа=${victory}, двойной лут=${doubleLoot}`);
        
        if (!this.mapSystem?.pendingAction || this.mapSystem.pendingAction.action !== 'hunt') {
            console.error("❌ Нет ожидающего действия охоты");
            return;
        }
        
        const { targetResource, wasSuccess } = this.mapSystem.pendingAction;
        
        if (victory && wasSuccess && targetResource) {
            // Добавляем ресурс герою
            this.addResourceToHero(targetResource, doubleLoot ? 2 : 1);
            
            let message = `🎉 Успешная охота! Получен: ${targetResource.name || 'Трофей'}`;
            if (doubleLoot) {
                message += ' (двойной лут!)';
            }
            
            this.showNotification(message, 'success');
            
            // Помечаем клетку как исследованную
            this.markCellAsExplored();
        } else if (victory) {
            this.showNotification("🎉 Победа в бою!", 'success');
        } else if (escape) {
            this.showNotification("🏃 Вы сбежали с поля боя", 'warning');
        } else {
            this.showNotification("💀 Вы проиграли бой", 'error');
        }
        
        // Сбрасываем состояние
        this.resetHuntState();
        
        // Сохраняем игру
        if (window.game?.saveGame) {
            try {
                window.game.saveGame();
            } catch (error) {
                console.warn("⚠️ Не удалось сохранить игру:", error);
            }
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    getHuntResources() {
        const resources = this.actionSystem?.resources || {};
        const huntResourceTypes = ['bones', 'leathers', 'hides', 'furs'];
        let huntResources = [];
        
        huntResourceTypes.forEach(type => {
            if (resources[type] && Array.isArray(resources[type])) {
                huntResources = huntResources.concat(resources[type]);
            }
        });
        
        return huntResources;
    }

    getResourceCategories() {
        return [
            { key: 'bones', name: 'Кости', icon: '🦴' },
            { key: 'leathers', name: 'Кожи', icon: '🐂' },
            { key: 'hides', name: 'Шкуры', icon: '🐅' },
            { key: 'furs', name: 'Меха', icon: '🦊' }
        ];
    }

    getResourceType(resource) {
        if (!resource || typeof resource !== 'object') return 'bones';
        
        if (resource.id && resource.id.includes('bone')) return 'bones';
        if (resource.id && resource.id.includes('leather')) return 'leathers';
        if (resource.id && resource.id.includes('hide')) return 'hides';
        if (resource.id && resource.id.includes('fur')) return 'furs';
        
        return resource.type || 'bones';
    }

    getResourceInfo(resourceId) {
        if (!resourceId || !this.actionSystem?.resources) return null;
        
        const resources = this.actionSystem.resources;
        
        for (const category in resources) {
            if (Array.isArray(resources[category])) {
                const found = resources[category].find(r => r && r.id === resourceId);
                if (found) return found;
            }
        }
        
        return null;
    }

    getMonstersWithResource(resourceId) {
        if (!resourceId) return [];
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem || !battleSystem.monsters || !Array.isArray(battleSystem.monsters)) {
            return [];
        }
        
        return battleSystem.monsters.filter(monster => {
            if (!monster || !monster.loot || !monster.loot.guaranteed) return false;
            return monster.loot.guaranteed.some(loot => loot && loot.id === resourceId);
        });
    }

    getMonsterDifficulty(level) {
        const lvl = Number(level) || 1;
        
        if (lvl >= 5) return { text: 'Сложный', color: '#ff4444' };
        if (lvl >= 3) return { text: 'Средний', color: '#ffaa00' };
        return { text: 'Лёгкий', color: '#44ff44' };
    }

    getCurrentHero() {
        return this.mapSystem?.currentHero || 
               window.game?.currentHero || 
               window.game?.systems?.map?.currentHero;
    }

    addResourceToHero(resource, quantity = 1) {
        if (!this.actionSystem || typeof this.actionSystem.addResourceToHero !== 'function') {
            console.warn("❌ ActionSystem.addResourceToHero не доступен");
            return;
        }
        
        if (!resource || !resource.id || !resource.name) {
            console.warn("❌ Неверный ресурс для добавления:", resource);
            return;
        }
        
        this.actionSystem.addResourceToHero(
            resource.id, 
            resource.name, 
            quantity, 
            this.getResourceType(resource)
        );
    }

    markCellAsExplored() {
        if (!this.mapSystem || this.selectedRow === null || this.selectedCol === null) return;
        
        const cellKey = `${this.selectedCol},${this.selectedRow}`;
        const cell = this.mapSystem.currentTacticalMap?.cells?.[cellKey];
        if (cell && typeof cell === 'object') {
            cell.explored = true;
        }
    }

    resetHuntState() {
        this.selectedResource = null;
        this.selectedRow = null;
        this.selectedCol = null;
        
        if (this.mapSystem) {
            this.mapSystem.pendingAction = null;
        }
    }

    showNotification(message, type = 'info') {
        try {
            if (window.game && typeof window.game.showNotification === 'function') {
                window.game.showNotification(message, type);
            } else {
                console.log(`${type.toUpperCase()}: ${message}`);
            }
        } catch (error) {
            console.error("❌ Ошибка показа уведомления:", error);
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
            
            // Стили для selected-resource-info
            const resourceInfo = document.querySelector('.selected-resource-info');
            if (resourceInfo) {
                resourceInfo.style.cssText = `
                    background: rgba(0, 100, 255, 0.1);
                    border: 1px solid #00aaff;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 20px;
                    text-align: center;
                `;
                
                const resourceName = resourceInfo.querySelector('.resource-name');
                if (resourceName) {
                    resourceName.style.cssText = `
                        font-size: 18px;
                        color: #00aaff;
                        margin-bottom: 5px;
                    `;
                }
                
                const resourceDesc = resourceInfo.querySelector('.resource-description');
                if (resourceDesc) {
                    resourceDesc.style.cssText = `
                        color: #aaa;
                        font-size: 12px;
                    `;
                }
            }
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
            
            // Стили для hunt-explanation
            const explanation = document.querySelector('.hunt-explanation');
            if (explanation) {
                explanation.style.cssText = `
                    margin-top: 20px;
                    padding: 15px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    font-size: 12px;
                    color: #aaa;
                    border: 1px solid rgba(0, 255, 204, 0.3);
                `;
            }
        }, 50);
    }
}

// ========== ГЛОБАЛЬНАЯ РЕГИСТРАЦИЯ ==========
if (typeof window !== 'undefined') {
    try {
        window.HuntAction = HuntAction;
        console.log("📦 HuntAction зарегистрирован глобально");
        
        // Автоматическая регистрация в ActionSystem если он уже существует
        if (window.ActionSystem && window.game?.systems?.action) {
            console.log("🔄 Автоматическая регистрация HuntAction в ActionSystem...");
            
            // Даем время на инициализацию
            setTimeout(() => {
                try {
                    if (window.game?.systems?.action && 
                        !window.game.systems.action.actionModules?.['hunt']) {
                        window.game.systems.action.actionModules['hunt'] = new HuntAction(window.game.systems.action);
                        console.log("✅ HuntAction автоматически зарегистрирован в ActionSystem");
                    }
                } catch (error) {
                    console.error("❌ Ошибка автоматической регистрации:", error);
                }
            }, 500);
        }
    } catch (error) {
        console.error("❌ Ошибка регистрации HuntAction:", error);
    }
}
