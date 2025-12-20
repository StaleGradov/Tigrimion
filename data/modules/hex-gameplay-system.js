class HexGameplaySystem {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        this.currentHex = null;
        this.hexData = null; // Данные из JSON
        this.collectedResources = [];
        this.activeMonster = null;
        this.hexStartTime = 7; // Всегда начинаем с 7 утра
        this.currentHexTime = 7;
        this.availableActions = [];
        
        // Загруженные данные гексов
        this.hexLocations = {};
        this.difficultySettings = {};
    }
    
    // 1. Инициализация при входе на гекс
    async enterHex(hexCell) {
        console.log(`🏞️ Вход на гекс [${hexCell.col},${hexCell.row}]`);
        
        this.currentHex = hexCell;
        
        // Загружаем данные гекса
        await this.loadHexData(hexCell);
        
        // Сбрасываем состояние
        this.resetHexState();
        
        // Начинаем день (7:00)
        this.currentHexTime = this.hexStartTime;
        this.updateTimeDisplay();
        
        // Отрисовываем ресурсы на гексе
        this.renderHexResources();
        
        // Показываем интерфейс
        this.updateHexInterface();
        
        return true;
    }
    
    // 2. Загрузка данных гекса
    async loadHexData(hexCell) {
        const hexId = this.getHexId(hexCell);
        
        // Пробуем загрузить из hex_locations.json
        try {
            const response = await fetch('data/hex_locations.json');
            const data = await response.json();
            
            this.hexLocations = data.hex_locations || {};
            this.difficultySettings = data.difficulty_settings || {};
            
            this.hexData = this.hexLocations[hexId] || this.createDefaultHexData(hexCell);
            
            console.log(`✅ Данные гекса загружены: ${this.hexData.name}`);
        } catch (error) {
            console.error('❌ Ошибка загрузки hex_locations.json:', error);
            this.hexData = this.createDefaultHexData(hexCell);
        }
    }
    
    // 3. Отрисовка ресурсов на canvas
    renderHexResources() {
        if (!this.mapSystem.ctx || !this.hexData) return;
        
        const canvas = this.mapSystem.canvas;
        const ctx = this.mapSystem.ctx;
        
        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем фон гекса
        this.drawHexBackground();
        
        // Рисуем ресурсы
        this.hexData.resources.forEach(resource => {
            this.drawResourceIcon(resource);
        });
        
        // Рисуем монстра (если есть)
        if (this.activeMonster) {
            this.drawMonsterIcon();
        }
        
        console.log(`🎨 Отрисовано ${this.hexData.resources.length} ресурсов на гексе`);
    }
    
    // 4. Обработка клика по ресурсу
    handleResourceClick(resourceId, event) {
        const resource = this.hexData.resources.find(r => r.id === resourceId);
        if (!resource) return;
        
        // Проверяем, не ночь ли уже
        if (this.currentHexTime >= 20) {
            this.showNotification("🌙 Наступила ночь! Теперь придется сражаться с монстром.", 'warning');
            return;
        }
        
        // Рассчитываем шанс с учетом сложности
        const difficulty = this.difficultySettings[this.hexData.difficulty] || {};
        const baseChance = resource.base_chance || 50;
        const bonus = difficulty.resource_chance_bonus || 0;
        const finalChance = Math.min(100, Math.max(0, baseChance + bonus));
        
        // Бросок удачи
        const roll = Math.random() * 100;
        const success = roll <= finalChance;
        
        // Тратим время
        const timeCost = (resource.base_time || 2) * (1 + (difficulty.time_cost_multiplier || 0));
        this.spendTime(timeCost, `сбор ${resource.name}`);
        
        if (success) {
            // Успешный сбор
            this.collectedResources.push(resource);
            this.removeResourceFromHex(resourceId);
            
            // Применяем эффект ресурса
            this.applyResourceEffect(resource);
            
            this.showNotification(`✅ Собран ${resource.name}! (+${timeCost} часов)`, 'success');
        } else {
            // Неудача
            this.showNotification(`❌ Не удалось собрать ${resource.name}... (+${timeCost} часов)`, 'warning');
        }
        
        // Проверяем, не наступила ли ночь
        if (this.currentHexTime >= 20) {
            this.startNightBattle();
        }
        
        // Обновляем интерфейс
        this.updateHexInterface();
    }
    
    // 5. Ночной бой с монстром
    startNightBattle() {
        console.log(`🌙 Наступает ночь на гексе [${this.currentHex.col},${this.currentHex.row}]`);
        
        // Получаем монстра для этого гекса
        const monster = this.getMonsterForHex();
        
        if (!monster) {
            console.log("❌ Нет монстра для этого гекса");
            this.completeHexExploration();
            return;
        }
        
        this.activeMonster = monster;
        
        // Показываем предупреждение
        this.showNotification(
            `🌙 Ночь! Появляется ${monster.name}!\n` +
            `❤️ Здоровье: ${monster.health} ⚔️ Урон: ${monster.damage}`,
            'warning'
        );
        
        // Начинаем бой через BattleSystem
        const battleSystem = window.game?.systems?.battle;
        if (battleSystem) {
            battleSystem.startBattleWithSpecificMonster(
                this.mapSystem.currentHero,
                monster,
                'hex_exploration'
            );
        }
    }
    
    // 6. Завершение исследования гекса
    completeHexExploration(victory = true) {
        if (!this.currentHex) return;
        
        if (victory) {
            console.log(`✅ Гекс [${this.currentHex.col},${this.currentHex.row}] исследован`);
            
            // Отмечаем гекс как исследованный
            this.currentHex.explored = true;
            this.currentHex.hasAction = false;
            
            // Даем награду за собранные ресурсы
            this.processCollectedResources();
            
            // Позволяем переходить на соседние гексы
            this.unlockAdjacentHexes();
            
            this.showNotification("✅ Гекс исследован! Теперь можно переходить на соседние клетки.", 'success');
        } else {
            console.log(`💀 Поражение на гексе [${this.currentHex.col},${this.currentHex.row}]`);
            
            // Возвращаем на стартовую позицию
            this.mapSystem.playerTacticalPosition = {...this.mapSystem.currentTacticalMap.startPosition};
            this.showNotification("💀 Вы проиграли бой! Возврат на стартовую позицию.", 'error');
        }
        
        // Очищаем состояние
        this.resetHexState();
        
        // Перерисовываем карту
        this.mapSystem.drawTacticalMap();
    }
    
    // 7. Обновление интерфейса гекса
    updateHexInterface() {
        const interfaceHTML = `
            <div class="hex-gameplay-interface">
                <div class="hex-header">
                    <h3>${this.hexData?.name || 'Неизвестный гекс'}</h3>
                    <div class="hex-difficulty" style="color: ${this.hexData?.color || '#4ade80'}">
                        ${this.difficultySettings[this.hexData?.difficulty]?.name || 'Легкий'}
                    </div>
                </div>
                
                <div class="hex-info">
                    <div class="time-display">
                        <span class="time-icon">🕐</span>
                        <span class="time-value">${this.currentHexTime}:00</span>
                        ${this.currentHexTime >= 20 ? 
                          '<span class="night-warning" style="color: #ff4444;">🌙 НОЧЬ</span>' : 
                          `<span class="time-until-night">
                              До ночи: ${20 - this.currentHexTime}ч
                          </span>`
                        }
                    </div>
                    
                    <div class="collected-resources">
                        <h4>📦 Собрано ресурсов: ${this.collectedResources.length}</h4>
                        <div class="resources-list">
                            ${this.collectedResources.map(res => 
                                `<div class="resource-item">${res.icon} ${res.name}</div>`
                            ).join('')}
                        </div>
                    </div>
                    
                    <div class="hex-description">
                        ${this.hexData?.description || ''}
                    </div>
                    
                    ${this.activeMonster ? `
                        <div class="monster-info">
                            <h4>👹 Ожидает ночью:</h4>
                            <div class="monster-stats">
                                <span>${this.activeMonster.name}</span>
                                <div>❤️ ${this.activeMonster.health}</div>
                                <div>⚔️ ${this.activeMonster.damage}</div>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="hex-actions">
                        <button class="btn-control" onclick="game.systems.hex.skipToNight()">
                            ⏩ Пропустить до ночи
                        </button>
                        <button class="btn-control" onclick="game.systems.hex.leaveHex()">
                            🏃 Покинуть гекс
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const container = document.getElementById('cellActionsContainer');
        if (container) {
            container.innerHTML = interfaceHTML;
        }
    }
    
    // 8. Вспомогательные методы
    getHexId(hexCell) {
        // Генерируем ID на основе типа и координат
        const type = hexCell.type || 'forest';
        return `${type}_${hexCell.col}_${hexCell.row}`;
    }
    
    createDefaultHexData(hexCell) {
        // Создаем данные по умолчанию
        return {
            id: this.getHexId(hexCell),
            name: 'Лесная поляна',
            description: 'Обычная лесная поляна с разбросанными ресурсами.',
            difficulty: 'green',
            color: '#4ade80',
            resources: [
                {
                    id: 'berries',
                    type: 'berries',
                    name: '🫐 Ягоды',
                    icon: '🫐',
                    position: { x: 200, y: 150 },
                    base_chance: 70,
                    base_time: 2,
                    description: 'Съедобные ягоды',
                    effect: { type: 'heal', value: 10 }
                },
                {
                    id: 'water',
                    type: 'water',
                    name: '💧 Вода',
                    icon: '💧',
                    position: { x: 300, y: 250 },
                    base_chance: 80,
                    base_time: 2,
                    description: 'Пресная вода',
                    effect: { type: 'heal', value: 15 }
                }
            ]
        };
    }
    
    getMonsterForHex() {
        // Получаем монстра по сложности гекса
        const difficulty = this.hexData.difficulty;
        const multiplier = this.difficultySettings[difficulty]?.monster_power_multiplier || 1.0;
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return null;
        
        const baseMonster = battleSystem.getRandomMonsterForMovement();
        if (!baseMonster) return null;
        
        return {
            ...baseMonster,
            health: Math.floor(baseMonster.health * multiplier),
            damage: Math.floor(baseMonster.damage * multiplier),
            name: `${baseMonster.name} (${difficulty})`
        };
    }
    
    spendTime(hours, action) {
        this.currentHexTime += hours;
        
        // Обновляем общее время в TimeSystem
        if (this.mapSystem.timeSystem) {
            for (let i = 0; i < hours; i++) {
                this.mapSystem.timeSystem.spendHourOnHex(action);
            }
        }
        
        this.updateTimeDisplay();
    }
    
    updateTimeDisplay() {
        const display = document.querySelector('.time-display');
        if (display) {
            display.innerHTML = `
                <span class="time-icon">🕐</span>
                <span class="time-value">${this.currentHexTime}:00</span>
                ${this.currentHexTime >= 20 ? 
                  '<span class="night-warning" style="color: #ff4444;">🌙 НОЧЬ</span>' : 
                  `<span class="time-until-night">
                      До ночи: ${20 - this.currentHexTime}ч
                  </span>`
                }
            `;
        }
    }
    
    showNotification(message, type) {
        if (window.game?.showNotification) {
            window.game.showNotification(message, type);
        }
    }
    
    resetHexState() {
        this.collectedResources = [];
        this.activeMonster = null;
        this.currentHexTime = this.hexStartTime;
    }
    
    // 9. Методы рисования
    drawHexBackground() {
        // Реализация рисования фона гекса
    }
    
    drawResourceIcon(resource) {
        // Реализация рисования иконки ресурса
    }
    
    drawMonsterIcon() {
        // Реализация рисования иконки монстра
    }
    
    removeResourceFromHex(resourceId) {
        // Удаляем собранный ресурс из отображения
        this.hexData.resources = this.hexData.resources.filter(r => r.id !== resourceId);
        this.renderHexResources();
    }
    
    applyResourceEffect(resource) {
        // Применяем эффект ресурса к герою
        const effect = resource.effect;
        
        switch(effect.type) {
            case 'heal':
                const hero = this.mapSystem.currentHero;
                hero.currentHealth = Math.min(
                    hero.maxHealth || 100,
                    hero.currentHealth + effect.value
                );
                break;
            case 'resource':
                // Добавляем ресурс в инвентарь
                this.addResourceToInventory(resource);
                break;
            case 'buff':
                // Применяем бафф
                this.applyBuff(effect);
                break;
        }
    }
    
    processCollectedResources() {
        // Обработка всех собранных ресурсов
        this.collectedResources.forEach(resource => {
            this.addResourceToInventory(resource);
        });
    }
    
    addResourceToInventory(resource) {
        // Добавляем ресурс в инвентарь героя
        if (!this.mapSystem.currentHero.resources) {
            this.mapSystem.currentHero.resources = {};
        }
        
        if (!this.mapSystem.currentHero.resources[resource.id]) {
            this.mapSystem.currentHero.resources[resource.id] = {
                ...resource,
                count: 0
            };
        }
        
        this.mapSystem.currentHero.resources[resource.id].count++;
    }
    
    unlockAdjacentHexes() {
        // Разблокируем соседние гексы для перехода
        const neighbors = this.mapSystem.getHexNeighbors(
            this.currentHex.row, 
            this.currentHex.col
        );
        
        neighbors.forEach(neighbor => {
            const cellKey = `${neighbor.col},${neighbor.row}`;
            const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
            if (cell && cell.explored === undefined) {
                cell.hasAction = true; // Теперь можно переходить
            }
        });
    }
    
    // 10. Публичные методы для интерфейса
    skipToNight() {
        // Пропускаем время до ночи
        const hoursToNight = 20 - this.currentHexTime;
        if (hoursToNight > 0) {
            this.spendTime(hoursToNight, "ожидание ночи");
            this.startNightBattle();
        }
    }
    
    leaveHex() {
        // Досрочный уход с гекса (проигрыш)
        if (this.collectedResources.length > 0) {
            const confirmLeave = window.confirm(
                "Вы покидаете гекс досрочно. Все несобранные ресурсы будут потеряны.\n" +
                "Продолжить?"
            );
            
            if (!confirmLeave) return;
        }
        
        this.completeHexExploration(false);
    }
}

// Регистрация модуля
window.HexGameplaySystem = HexGameplaySystem;
