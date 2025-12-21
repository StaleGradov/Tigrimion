class HexGameplaySystem {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        this.currentHex = null;
        this.hexData = null;
        this.collectedResources = [];
        this.remainingResources = [];
        this.monsterData = null;
        this.currentHexTime = 7; // Начало дня
        this.isNight = false;
        
        // DOM элементы
        this.hexImageContainer = null;
        this.hexTimeDisplay = null;
        
        // Загруженные данные
        this.hexLocations = {};
        this.difficultySettings = {};
        this.gameConstants = {};
        
        console.log("✅ HexGameplaySystem инициализирован");
    }
    
    // ========== ОСНОВНЫЕ МЕТОДЫ ==========
    
    /**
     * Вход на новый гекс
     */
    async enterHex(hexCell) {
        console.log(`🏞️ Вход на гекс [${hexCell.col},${hexCell.row}]`);
        
        // Сохраняем текущий гекс
        this.currentHex = hexCell;
        
        // Сбрасываем состояние
        this.resetHexState();
        
        // Загружаем данные гекса
        await this.loadHexConfig();
        
        // Определяем ID гекса (по типу или случайно)
        const hexId = this.determineHexId(hexCell);
        this.hexData = this.hexLocations[hexId] || this.createDefaultHexData(hexCell);
        
        // Загружаем данные монстра
        await this.loadMonsterData();
        
        // Инициализируем оставшиеся ресурсы
        this.remainingResources = [...this.hexData.resources];
        
        // Отрисовываем интерфейс гекса
        this.renderHexInterface();
        
        // Обновляем время
        this.updateTimeDisplay();
        
        console.log(`✅ Гекс "${this.hexData.name}" загружен, ресурсов: ${this.remainingResources.length}`);
        
        return true;
    }
    
    /**
     * Отрисовка интерфейса гекса (картинка + ресурсы)
     */
    renderHexInterface() {
        const leftPanel = document.querySelector('.cell-info-left-panel');
        if (!leftPanel) {
            console.error("❌ Левая панель не найдена");
            return;
        }
        
        // Создаем HTML для гекса
        const html = this.createHexHTML();
        leftPanel.innerHTML = html;
        
        // Сохраняем ссылки на DOM элементы
        this.hexImageContainer = leftPanel.querySelector('.hex-image-container');
        this.hexTimeDisplay = leftPanel.querySelector('.hex-time-display');
        
        // Загружаем и отрисовываем картинку с ресурсами
        this.loadAndDrawHexImage();
    }
    
    /**
     * Загрузка и отрисовка картинки гекса с ресурсами
     */
    async loadAndDrawHexImage() {
        if (!this.hexImageContainer || !this.hexData) return;
        
        // Создаем canvas для картинки гекса
        const canvas = document.createElement('canvas');
        canvas.width = this.hexData.width || 600;
        canvas.height = this.hexData.height || 400;
        canvas.className = 'hex-canvas';
        canvas.style.cursor = 'pointer';
        
        this.hexImageContainer.innerHTML = '';
        this.hexImageContainer.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        
        // Загружаем фоновое изображение
        const backgroundLoaded = await this.loadBackgroundImage(ctx);
        
        if (backgroundLoaded) {
            // Рисуем ресурсы поверх фона
            this.drawResourcesOnCanvas(ctx);
            
            // Рисуем монстра (если есть)
            this.drawMonsterOnCanvas(ctx);
            
            // Добавляем обработчики кликов по ресурсам
            this.setupCanvasClickHandlers(canvas);
        }
    }
    
    /**
     * Обработка клика по ресурсу на картинке
     */
    async handleResourceClick(resourceId, clickX, clickY) {
        console.log(`🖱️ Клик по ресурсу ${resourceId} на [${clickX}, ${clickY}]`);
        
        // Находим ресурс
        const resource = this.remainingResources.find(r => r.id === resourceId);
        if (!resource) {
            console.error(`❌ Ресурс ${resourceId} не найден`);
            return;
        }
        
        // Проверяем, не ночь ли уже
        if (this.isNight) {
            this.showNotification("🌙 Ночь! Сначала победите монстра.", 'warning');
            return;
        }
        
        // Показываем подтверждение
        const confirmGather = window.confirm(
            `Собрать ${resource.name}?\n` +
            `Шанс успеха: ${this.calculateResourceChance(resource)}%\n` +
            `Время: 2 часа\n\n` +
            `${resource.description}`
        );
        
        if (!confirmGather) return;
        
        // Тратим время на сбор
        this.spendTime(2, `сбор ${resource.name}`);
        
        // Определяем успех
        const success = this.attemptGatherResource(resource);
        
        if (success) {
            // Успешный сбор
            this.collectedResources.push(resource);
            this.remainingResources = this.remainingResources.filter(r => r.id !== resourceId);
            
            // Применяем эффект
            this.applyResourceEffect(resource);
            
            // Обновляем отображение
            this.updateResourceDisplay(resourceId);
            
            this.showNotification(`✅ Собрано: ${resource.name}!`, 'success');
        } else {
            this.showNotification(`❌ Не удалось собрать ${resource.name}...`, 'warning');
        }
        
        // Проверяем, не наступила ли ночь
        this.checkForNight();
        
        // Обновляем интерфейс
        this.updateHexInterface();
    }
    
    /**
     * Проверка наступления ночи и начало боя
     */
    checkForNight() {
        if (this.currentHexTime >= 20 && !this.isNight) {
            this.isNight = true;
            this.startNightBattle();
        }
    }
    
    /**
     * Ночной бой с монстром
     */
    startNightBattle() {
        console.log(`🌙 Наступает ночь! Начинается бой с монстром.`);
        
        if (!this.monsterData) {
            console.error("❌ Нет данных монстра");
            this.completeHex(false);
            return;
        }
        
        // Показываем уведомление
        this.showNotification(
            `🌙 Ночь! Появляется ${this.monsterData.name}!\n` +
            `❤️ Здоровье: ${this.monsterData.health} | ⚔️ Урон: ${this.monsterData.damage}`,
            'warning'
        );
        
        // Начинаем бой через BattleSystem
        const battleSystem = window.game?.systems?.battle;
        if (battleSystem) {
            // Сохраняем текущее состояние гекса для возврата после боя
            this.saveHexStateBeforeBattle();
            
            battleSystem.startBattleWithSpecificMonster(
                this.mapSystem.currentHero,
                this.monsterData,
                'hex_night_battle'
            );
        } else {
            console.error("❌ BattleSystem не найдена");
            this.completeHex(false);
        }
    }
    
    /**
     * Завершение исследования гекса (после боя)
     */
    completeHex(victory = true) {
        if (!this.currentHex) return;
        
        if (victory) {
            console.log(`✅ Победа на гексе [${this.currentHex.col},${this.currentHex.row}]`);
            
            // Отмечаем гекс как исследованный
            this.currentHex.explored = true;
            this.currentHex.hasAction = false;
            
            // Даем награду за собранные ресурсы
            this.processCollectedResources();
            
            // Разблокируем соседние гексы
            this.unlockAdjacentHexes();
            
            this.showNotification("🎉 Гекс исследован! Можно переходить дальше.", 'success');
        } else {
            console.log(`💀 Поражение на гексе [${this.currentHex.col},${this.currentHex.row}]`);
            
            // Возвращаем на стартовую позицию
            this.mapSystem.playerTacticalPosition = {
                ...this.mapSystem.currentTacticalMap.startPosition
            };
            
            // Частично сохраняем собранные ресурсы (50%)
            this.partialResourceSave();
            
            this.showNotification("💀 Вы проиграли! Возврат на стартовую позицию.", 'error');
        }
        
        // Очищаем состояние
        this.resetHexState();
        
        // Перерисовываем карту
        this.mapSystem.drawTacticalMap();
        
        // Возвращаемся к обычному интерфейсу
        if (this.mapSystem.actionSystem) {
            const currentCell = this.mapSystem.currentTacticalMap?.cells[
                `${this.mapSystem.playerTacticalPosition.x},${this.mapSystem.playerTacticalPosition.y}`
            ];
            if (currentCell) {
                this.mapSystem.actionSystem.updateCellActionsUI(currentCell);
            }
        }
    }
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    
    /**
     * Создание HTML для левой панели
     */
    createHexHTML() {
        const difficulty = this.difficultySettings[this.hexData.difficulty] || {};
        
        return `
            <div class="hex-gameplay-container">
                <div class="hex-header" style="
                    background: linear-gradient(135deg, ${this.hexData.color || '#4ade80'}20, transparent);
                    border-left: 4px solid ${this.hexData.color || '#4ade80'};
                    padding: 15px;
                    margin-bottom: 20px;
                    border-radius: 0 8px 8px 0;
                ">
                    <h3 style="color: #00ffcc; margin-bottom: 5px;">
                        ${this.hexData.name}
                    </h3>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="hex-difficulty" style="
                            background: ${this.hexData.color || '#4ade80'};
                            color: white;
                            padding: 3px 10px;
                            border-radius: 12px;
                            font-size: 12px;
                            font-weight: bold;
                        ">
                            ${difficulty.name || 'Легкий'}
                        </span>
                        <div class="hex-time-display" style="
                            color: ${this.currentHexTime >= 20 ? '#ff4444' : '#fbbf24'};
                            font-weight: bold;
                            font-size: 14px;
                        ">
                            🕐 ${this.currentHexTime}:00
                        </div>
                    </div>
                </div>
                
                <div class="hex-image-container" style="
                    position: relative;
                    width: 100%;
                    height: 300px;
                    background: #1a1a2e;
                    border-radius: 8px;
                    overflow: hidden;
                    border: 2px solid ${this.hexData.color || '#4ade80'};
                    margin-bottom: 20px;
                ">
                    <!-- Canvas с картинкой и ресурсами появится здесь -->
                    <div class="image-loading" style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        color: #94a3b8;
                    ">
                        Загрузка изображения гекса...
                    </div>
                </div>
                
                <div class="hex-description" style="
                    color: #cbd5e1;
                    font-size: 14px;
                    line-height: 1.5;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                ">
                    ${this.hexData.description}
                </div>
                
                <div class="hex-stats" style="margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div class="stat-box" style="
                            background: rgba(0, 100, 0, 0.2);
                            border: 1px solid #00aa00;
                            border-radius: 6px;
                            padding: 10px;
                            text-align: center;
                        ">
                            <div style="color: #00ff00; font-size: 18px; margin-bottom: 5px;">
                                ${this.collectedResources.length}
                            </div>
                            <div style="color: #94a3b8; font-size: 12px;">
                                📦 Собрано
                            </div>
                        </div>
                        
                        <div class="stat-box" style="
                            background: rgba(100, 0, 0, 0.2);
                            border: 1px solid #ff4444;
                            border-radius: 6px;
                            padding: 10px;
                            text-align: center;
                        ">
                            <div style="color: #ff6666; font-size: 18px; margin-bottom: 5px;">
                                ${this.remainingResources.length}
                            </div>
                            <div style="color: #94a3b8; font-size: 12px;">
                                ⏳ Осталось
                            </div>
                        </div>
                    </div>
                </div>
                
                ${this.monsterData ? `
                    <div class="monster-info" style="
                        background: rgba(255, 0, 0, 0.1);
                        border: 1px solid #ff4444;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 15px;
                    ">
                        <h4 style="color: #ff6666; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
                            👹 Монстр ночью
                        </h4>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
                            <div>
                                <span style="color: #94a3b8;">Имя:</span>
                                <span style="color: white; margin-left: 5px;">${this.monsterData.name}</span>
                            </div>
                            <div>
                                <span style="color: #94a3b8;">Уровень:</span>
                                <span style="color: #fbbf24; margin-left: 5px;">${this.monsterData.level || 1}</span>
                            </div>
                            <div>
                                <span style="color: #94a3b8;">❤️ Здоровье:</span>
                                <span style="color: #ff6666; margin-left: 5px;">${this.monsterData.health}</span>
                            </div>
                            <div>
                                <span style="color: #94a3b8;">⚔️ Урон:</span>
                                <span style="color: #ffaa00; margin-left: 5px;">${this.monsterData.damage}</span>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="hex-controls" style="margin-top: auto;">
                    <button class="btn-control" onclick="game.systems.hex.skipToNight()" 
                            style="width: 100%; margin-bottom: 10px;"
                            ${this.isNight ? 'disabled' : ''}>
                        ⏩ Пропустить до ночи
                    </button>
                    <button class="btn-control" onclick="game.systems.hex.leaveHex()"
                            style="width: 100%;">
                        🏃‍♂️ Покинуть гекс
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Загрузка фонового изображения на canvas
     */
    loadBackgroundImage(ctx) {
        return new Promise((resolve) => {
            if (!this.hexData.background) {
                // Если нет фонового изображения, создаем градиентный фон
                const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
                gradient.addColorStop(0, '#1a1a2e');
                gradient.addColorStop(1, '#16213e');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                
                // Рисуем текст "Изображение гекса"
                ctx.fillStyle = '#00ffcc';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.hexData.name, ctx.canvas.width / 2, ctx.canvas.height / 2);
                
                resolve(true);
                return;
            }
            
            const img = new Image();
            img.onload = () => {
                // Рисуем изображение
                ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
                resolve(true);
            };
            
            img.onerror = () => {
                console.error(`❌ Не удалось загрузить изображение: ${this.hexData.background}`);
                
                // Fallback градиент
                const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
                gradient.addColorStop(0, '#1a1a2e');
                gradient.addColorStop(1, '#16213e');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                
                ctx.fillStyle = '#00ffcc';
                ctx.font = 'bold 24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.hexData.name, ctx.canvas.width / 2, ctx.canvas.height / 2);
                
                resolve(true);
            };
            
            img.src = this.hexData.background;
        });
    }
    
    /**
     * Рисование ресурсов на canvas
     */
    drawResourcesOnCanvas(ctx) {
        this.remainingResources.forEach(resource => {
            const pos = resource.position || { x: 100, y: 100 };
            
            // Рисуем кружок-подложку
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 25, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fill();
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Рисуем иконку ресурса
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            ctx.fillText(resource.icon, pos.x, pos.y);
            
            // Сохраняем данные ресурса на canvas для кликов
            ctx.canvas.dataset[`resource_${resource.id}`] = JSON.stringify({
                x: pos.x,
                y: pos.y,
                radius: 25
            });
        });
    }
    
    /**
     * Рисование монстра на canvas
     */
    drawMonsterOnCanvas(ctx) {
        if (!this.monsterData || !this.hexData.monster) return;
        
        const pos = this.hexData.monster.position || { x: 500, y: 100 };
        
        // Рисуем кружок-подложку для монстра
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 30, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fill();
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Рисуем иконку монстра
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'white';
        ctx.fillText('👹', pos.x, pos.y);
        
        // Сохраняем данные монстра
        ctx.canvas.dataset.monster = JSON.stringify({
            x: pos.x,
            y: pos.y,
            radius: 30
        });
    }
    
    /**
     * Настройка обработчиков кликов на canvas
     */
    setupCanvasClickHandlers(canvas) {
        canvas.addEventListener('click', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            // Проверяем клик по ресурсам
            this.remainingResources.forEach(resource => {
                const dataKey = `resource_${resource.id}`;
                if (canvas.dataset[dataKey]) {
                    const resourceData = JSON.parse(canvas.dataset[dataKey]);
                    const distance = Math.sqrt(
                        Math.pow(x - resourceData.x, 2) + 
                        Math.pow(y - resourceData.y, 2)
                    );
                    
                    if (distance <= resourceData.radius) {
                        this.handleResourceClick(resource.id, x, y);
                        return;
                    }
                }
            });
            
            // Проверяем клик по монстру
            if (canvas.dataset.monster && this.isNight) {
                const monsterData = JSON.parse(canvas.dataset.monster);
                const distance = Math.sqrt(
                    Math.pow(x - monsterData.x, 2) + 
                    Math.pow(y - monsterData.y, 2)
                );
                
                if (distance <= monsterData.radius) {
                    this.showMonsterDetails();
                    return;
                }
            }
        });
        
        // Добавляем курсор-указатель при наведении на ресурсы
        canvas.addEventListener('mousemove', (event) => {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            
            let isOverResource = false;
            
            // Проверяем наведение на ресурсы
            this.remainingResources.forEach(resource => {
                const dataKey = `resource_${resource.id}`;
                if (canvas.dataset[dataKey]) {
                    const resourceData = JSON.parse(canvas.dataset[dataKey]);
                    const distance = Math.sqrt(
                        Math.pow(x - resourceData.x, 2) + 
                        Math.pow(y - resourceData.y, 2)
                    );
                    
                    if (distance <= resourceData.radius) {
                        isOverResource = true;
                        canvas.title = resource.name;
                        return;
                    }
                }
            });
            
            // Проверяем наведение на монстра
            if (canvas.dataset.monster) {
                const monsterData = JSON.parse(canvas.dataset.monster);
                const distance = Math.sqrt(
                    Math.pow(x - monsterData.x, 2) + 
                    Math.pow(y - monsterData.y, 2)
                );
                
                if (distance <= monsterData.radius) {
                    isOverResource = true;
                    canvas.title = this.monsterData?.name || 'Монстр';
                    return;
                }
            }
            
            canvas.style.cursor = isOverResource ? 'pointer' : 'default';
            if (!isOverResource) canvas.title = '';
        });
    }
    
    /**
     * Расчет шанса сбора ресурса
     */
    calculateResourceChance(resource) {
        const difficulty = this.difficultySettings[this.hexData.difficulty] || {};
        const baseChance = resource.base_chance || 50;
        const bonus = difficulty.resource_chance_bonus || 0;
        return Math.min(100, Math.max(0, baseChance + bonus));
    }
    
    /**
     * Попытка сбора ресурса
     */
    attemptGatherResource(resource) {
        const chance = this.calculateResourceChance(resource);
        const roll = Math.random() * 100;
        return roll <= chance;
    }
    
    /**
     * Применение эффекта ресурса
     */
    applyResourceEffect(resource) {
        const effect = resource.effect;
        if (!effect || !this.mapSystem.currentHero) return;
        
        const hero = this.mapSystem.currentHero;
        
        switch(effect.type) {
            case 'heal':
                const heroSystem = window.game?.systems?.hero;
                if (heroSystem) {
                    const stats = heroSystem.calculateHeroStats(hero);
                    hero.currentHealth = Math.min(
                        stats.maxHealth,
                        hero.currentHealth + effect.value
                    );
                    console.log(`❤️ Восстановлено ${effect.value} здоровья`);
                }
                break;
                
            case 'resource':
                this.addResourceToInventory(resource);
                break;
                
            case 'buff':
                // TODO: Реализовать систему баффов
                console.log(`📈 Получен бафф: ${JSON.stringify(effect)}`);
                break;
        }
    }
    
    // ========== ИНТЕГРАЦИОННЫЕ МЕТОДЫ ==========
    
    /**
     * Сохранение состояния перед боем
     */
    saveHexStateBeforeBattle() {
        // Сохраняем состояние гекса в MapSystem
        this.mapSystem.pendingHexCompletion = {
            hex: this.currentHex,
            collectedResources: [...this.collectedResources],
            hexData: this.hexData,
            victoryCallback: () => this.completeHex(true),
            defeatCallback: () => this.completeHex(false)
        };
    }
    
    /**
     * Обработчик завершения боя (вызывается из BattleSystem)
     */
    handleBattleResult(victory) {
        if (victory) {
            this.completeHex(true);
        } else {
            this.completeHex(false);
        }
    }
    
    // ========== ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ ИНТЕРФЕЙСА ==========
    
    /**
     * Пропустить время до ночи
     */
    skipToNight() {
        if (this.isNight) return;
        
        const hoursToNight = 20 - this.currentHexTime;
        if (hoursToNight > 0) {
            this.spendTime(hoursToNight, "ожидание ночи");
            this.startNightBattle();
        }
    }
    
    /**
     * Покинуть гекс досрочно
     */
    leaveHex() {
        const confirmLeave = window.confirm(
            "Покинуть гекс досрочно?\n\n" +
            "Вы потеряете все несобранные ресурсы.\n" +
            "Собранные ресурсы сохранятся."
        );
        
        if (confirmLeave) {
            this.completeHex(false);
        }
    }
    
    /**
     * Показать детали монстра
     */
    showMonsterDetails() {
        if (!this.monsterData) return;
        
        alert(
            `👹 ${this.monsterData.name}\n\n` +
            `❤️ Здоровье: ${this.monsterData.health}\n` +
            `⚔️ Урон: ${this.monsterData.damage}\n` +
            `🛡️ Броня: ${this.monsterData.armor || 0}\n` +
            `✨ Особые способности: ${this.monsterData.abilities?.join(', ') || 'Нет'}\n\n` +
            `⚠️ Сразитесь с ним ночью!`
        );
    }
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    
    async loadHexConfig() {
        try {
            const response = await fetch('data/hex_locations.json');
            const data = await response.json();
            
            this.hexLocations = data.hex_locations || {};
            this.difficultySettings = data.difficulty_settings || {};
            this.gameConstants = data.game_constants || {};
            
            console.log(`✅ Конфигурация гексов загружена: ${Object.keys(this.hexLocations).length} локаций`);
        } catch (error) {
            console.error('❌ Ошибка загрузки hex_locations.json:', error);
        }
    }
    
    async loadMonsterData() {
        if (!this.hexData.monster) {
            this.monsterData = null;
            return;
        }
        
        try {
            // Загружаем врагов из enemies.json
            const response = await fetch('data/enemies.json');
            const data = await response.json();
            
            // Находим монстра по ID
            const baseMonster = data.enemies?.find(e => e.id === this.hexData.monster.monster_id);
            
            if (baseMonster) {
                // Применяем множитель сложности
                const difficulty = this.difficultySettings[this.hexData.difficulty] || {};
                const multiplier = difficulty.monster_power_multiplier || 1.0;
                
                this.monsterData = {
                    ...baseMonster,
                    health: Math.floor(baseMonster.health * multiplier),
                    damage: Math.floor(baseMonster.damage * multiplier),
                    name: `${baseMonster.name} (${difficulty.name || 'Легкий'})`
                };
                
                console.log(`✅ Монстр загружен: ${this.monsterData.name}`);
            } else {
                console.error(`❌ Монстр ${this.hexData.monster.monster_id} не найден`);
                this.monsterData = null;
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки enemies.json:', error);
            this.monsterData = null;
        }
    }
    
    determineHexId(hexCell) {
        // Можно определить ID на основе типа клетки или координат
        const type = hexCell.type || 'forest';
        const types = Object.keys(this.hexLocations);
        
        if (types.includes(type)) {
            return type;
        }
        
        // Или случайно выбираем из доступных
        return types[Math.floor(Math.random() * types.length)] || 'forest_crossroads';
    }
    
    createDefaultHexData(hexCell) {
        return {
            id: 'default_hex',
            name: 'Лесная поляна',
            description: 'Обычная лесная поляна с разбросанными ресурсами.',
            width: 600,
            height: 400,
            difficulty: 'green',
            color: '#4ade80',
            resources: [
                {
                    id: 'berries',
                    type: 'berries',
                    name: '🫐 Ягоды',
                    icon: '🫐',
                    position: { x: 150, y: 200 },
                    base_chance: 70,
                    base_time: 2,
                    description: 'Съедобные лесные ягоды',
                    effect: { type: 'heal', value: 10 }
                },
                {
                    id: 'water',
                    type: 'water',
                    name: '💧 Вода',
                    icon: '💧',
                    position: { x: 300, y: 150 },
                    base_chance: 80,
                    base_time: 2,
                    description: 'Пресная вода из ручья',
                    effect: { type: 'heal', value: 15 }
                }
            ],
            monster: {
                position: { x: 450, y: 100 },
                monster_id: 'wolf',
                scale_multiplier: 1.0
            }
        };
    }
    
    spendTime(hours, action) {
        this.currentHexTime += hours;
        
        // Обновляем глобальное время через TimeSystem
        if (this.mapSystem.timeSystem) {
            for (let i = 0; i < hours; i++) {
                this.mapSystem.timeSystem.spendHourOnHex(action);
            }
        }
        
        this.updateTimeDisplay();
    }
    
    updateTimeDisplay() {
        if (this.hexTimeDisplay) {
            this.hexTimeDisplay.innerHTML = `
                🕐 ${this.currentHexTime}:00
                ${this.currentHexTime >= 20 ? '<span style="color: #ff4444; margin-left: 5px;">🌙 НОЧЬ</span>' : ''}
            `;
        }
    }
    
    updateResourceDisplay(resourceId) {
        // Обновляем canvas, убирая собранный ресурс
        if (this.hexImageContainer) {
            const canvas = this.hexImageContainer.querySelector('canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                
                // Перерисовываем canvas
                this.loadAndDrawHexImage();
            }
        }
    }
    
    updateHexInterface() {
        // Обновляем статистику в интерфейсе
        const container = document.querySelector('.hex-gameplay-container');
        if (container) {
            const statsBoxes = container.querySelectorAll('.stat-box');
            if (statsBoxes.length >= 2) {
                statsBoxes[0].querySelector('div').textContent = this.collectedResources.length;
                statsBoxes[1].querySelector('div').textContent = this.remainingResources.length;
            }
        }
    }
    
    addResourceToInventory(resource) {
        if (!this.mapSystem.currentHero.resources) {
            this.mapSystem.currentHero.resources = {};
        }
        
        if (!this.mapSystem.currentHero.resources[resource.id]) {
            this.mapSystem.currentHero.resources[resource.id] = {
                id: resource.id,
                name: resource.name,
                type: resource.type,
                icon: resource.icon,
                count: 0
            };
        }
        
        this.mapSystem.currentHero.resources[resource.id].count++;
        console.log(`📦 Добавлен ресурс: ${resource.name} (всего: ${this.mapSystem.currentHero.resources[resource.id].count})`);
    }
    
    processCollectedResources() {
        // Обработка всех собранных ресурсов при успешном завершении гекса
        this.collectedResources.forEach(resource => {
            this.addResourceToInventory(resource);
        });
        
        // Даем бонус за полный сбор
        if (this.collectedResources.length >= this.hexData.resources.length) {
            this.showNotification("🎉 Все ресурсы собраны! Бонус +50 золота!", 'success');
            this.mapSystem.currentHero.gold = (this.mapSystem.currentHero.gold || 0) + 50;
        }
    }
    
    partialResourceSave() {
        // Сохраняем 50% ресурсов при поражении
        const savedCount = Math.ceil(this.collectedResources.length / 2);
        
        for (let i = 0; i < savedCount; i++) {
            if (this.collectedResources[i]) {
                this.addResourceToInventory(this.collectedResources[i]);
            }
        }
        
        console.log(`📦 Сохранено ${savedCount} из ${this.collectedResources.length} ресурсов после поражения`);
    }
    
    unlockAdjacentHexes() {
        const neighbors = this.mapSystem.getHexNeighbors(
            this.currentHex.row,
            this.currentHex.col
        );
        
        neighbors.forEach(neighbor => {
            const cellKey = `${neighbor.col},${neighbor.row}`;
            const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
            
            if (cell && cell.passable !== false && cell.explored === undefined) {
                cell.hasAction = true; // Теперь можно переходить
            }
        });
        
        console.log(`🔓 Разблокировано ${neighbors.length} соседних гексов`);
    }
    
    resetHexState() {
        this.collectedResources = [];
        this.remainingResources = [];
        this.monsterData = null;
        this.currentHexTime = 7;
        this.isNight = false;
        this.currentHex = null;
        this.hexData = null;
    }
    
    showNotification(message, type) {
        if (window.game?.showNotification) {
            window.game.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Регистрация глобально
if (typeof window !== 'undefined') {
    window.HexGameplaySystem = HexGameplaySystem;
    console.log("📦 HexGameplaySystem зарегистрирован глобально");
};
