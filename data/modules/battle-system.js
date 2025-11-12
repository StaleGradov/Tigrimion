// ========== ОБНОВЛЕННАЯ СИСТЕМА БОЯ С СЕТКОЙ 3×2 ==========
class BattleSystem {
    constructor() {
        this.monsters = [];
        this.battleActive = false;
        this.currentMonsters = []; // Теперь массив монстров
        this.currentHero = null;
        this.battleLog = [];
        this.battleRound = 0;
        this.battleType = 'normal';
        this.battleContext = 'normal';
        
        // НОВЫЕ ПОЛЯ ДЛЯ СЕТКИ 3×2
        this.battleGrid = {
            allies: [null, null, null, null, null, null], // 6 позиций
            enemies: [null, null, null, null, null, null] // 6 позиций
        };
        this.selectedTarget = null;
        this.availableTargets = [];
        
        console.log("✅ BattleSystem инициализирован с новой сеткой 3×2");
    }

    // ОБНОВЛЕННЫЙ МЕТОД: Начать бой с группой монстров
    startBattleWithMonster(hero, monsterId, context = 'normal') {
        if (!hero) {
            console.error("❌ Не могу начать бой: герой не передан");
            return;
        }

        // Генерируем группу монстров на основе шансов
        const monsterGroup = this.generateMonsterGroup(monsterId);
        if (!monsterGroup || monsterGroup.length === 0) {
            console.error("❌ Не удалось сгенерировать группу монстров");
            return;
        }

        this.currentHero = hero;
        this.currentMonsters = monsterGroup;
        
        // Заполняем сетку боя
        this.setupBattleGrid(hero, monsterGroup);
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        this.battleType = context;
        this.battleContext = context;
        
        this.addBattleLog(`⚔️ Бой начался! Противников: ${monsterGroup.length}`);
        console.log(`⚔️ Начинаем тактический бой с ${monsterGroup.length} монстрами`);
        
        this.hideTacticalMap();
        this.showTacticalBattleScreen();
    }

    // НОВЫЙ МЕТОД: Генерация группы монстров
    generateMonsterGroup(baseMonsterId) {
        const baseMonster = this.monsters.find(m => m.id === baseMonsterId);
        if (!baseMonster) return [];

        // Определяем количество монстров по шансам
        const roll = Math.random() * 100;
        let monsterCount = 1;
        
        if (roll <= 70) monsterCount = 1;
        else if (roll <= 85) monsterCount = 2;
        else if (roll <= 93) monsterCount = 3;
        else if (roll <= 97) monsterCount = 4;
        else if (roll <= 99) monsterCount = 5;
        else monsterCount = 6;

        console.log(`🎲 Генерация группы: ${monsterCount} монстров (шанс: ${roll.toFixed(1)}%)`);

        const monsterGroup = [];
        for (let i = 0; i < monsterCount; i++) {
            // Можно варьировать монстров или использовать одного типа
            const monsterCopy = {
                ...baseMonster,
                battleId: i + 1, // Уникальный ID в бою
                currentHealth: baseMonster.health,
                position: null // Будет установлено при расстановке
            };
            monsterGroup.push(monsterCopy);
        }

        return monsterGroup;
    }

    // НОВЫЙ МЕТОД: Настройка боевой сетки
    setupBattleGrid(hero, monsters) {
        // Сбрасываем сетку
        this.battleGrid.allies = [null, null, null, null, null, null];
        this.battleGrid.enemies = [null, null, null, null, null, null];
        
        // Размещаем героя на позиции [3,2] (индекс 3 в массиве allies)
        this.battleGrid.allies[3] = {
            type: 'hero',
            data: hero,
            position: 3,
            maxHealth: hero.baseHealth,
            currentHealth: hero.currentHealth || hero.baseHealth
        };

        // Размещаем монстров с учетом их типа атаки
        this.placeMonstersOnGrid(monsters);
    }

    // НОВЫЙ МЕТОД: Расстановка монстров на сетке
    placeMonstersOnGrid(monsters) {
        const frontLinePositions = [0, 1, 2]; // Первый ряд
        const backLinePositions = [3, 4, 5];  // Второй ряд
        
        let frontLineCount = 0;
        let backLineCount = 0;

        // Сначала размещаем ближних бойцов
        monsters.forEach(monster => {
            const attackType = monster.attackType || 'melee'; // По умолчанию ближний бой
            
            if (attackType === 'melee' && frontLineCount < 3) {
                // Ставим в первый ряд
                const position = frontLinePositions[frontLineCount];
                this.battleGrid.enemies[position] = {
                    type: 'monster',
                    data: monster,
                    position: position,
                    maxHealth: monster.health,
                    currentHealth: monster.currentHealth
                };
                monster.position = position;
                frontLineCount++;
            } else if (attackType === 'ranged' && backLineCount < 3) {
                // Ставим во второй ряд
                const position = backLinePositions[backLineCount];
                this.battleGrid.enemies[position] = {
                    type: 'monster',
                    data: monster,
                    position: position,
                    maxHealth: monster.health,
                    currentHealth: monster.currentHealth
                };
                monster.position = position;
                backLineCount++;
            } else {
                // Если ряды заполнены, ставим в любую свободную позицию
                const availablePositions = [...frontLinePositions, ...backLinePositions]
                    .filter(pos => !this.battleGrid.enemies[pos]);
                
                if (availablePositions.length > 0) {
                    const position = availablePositions[0];
                    this.battleGrid.enemies[position] = {
                        type: 'monster',
                        data: monster,
                        position: position,
                        maxHealth: monster.health,
                        currentHealth: monster.currentHealth
                    };
                    monster.position = position;
                    
                    if (position < 3) frontLineCount++;
                    else backLineCount++;
                }
            }
        });

        console.log("🎯 Расстановка монстров завершена:", this.battleGrid.enemies.map(m => m ? m.data.name : 'null'));
    }

    // НОВЫЙ МЕТОД: Показать тактический экран боя
    showTacticalBattleScreen() {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="tactical-battle-screen">
                <header class="battle-header">
                    <h2>⚔️ ТАКТИЧЕСКИЙ БОЙ</h2>
                    <div class="battle-round">Раунд: ${this.battleRound}</div>
                </header>
                
                <div class="battle-grid-container">
                    <!-- Сетка союзников -->
                    <div class="battle-grid allies-grid">
                        <div class="grid-header">ВАШ ОТРЯД</div>
                        <div class="grid-positions">
                            ${this.renderBattleGrid('allies')}
                        </div>
                    </div>
                    
                    <!-- Разделитель -->
                    <div class="battle-vs">VS</div>
                    
                    <!-- Сетка противников -->
                    <div class="battle-grid enemies-grid">
                        <div class="grid-header">ПРОТИВНИКИ</div>
                        <div class="grid-positions">
                            ${this.renderBattleGrid('enemies')}
                        </div>
                    </div>
                </div>
                
                <!-- Лог боя -->
                <div class="tactical-battle-log">
                    <h4>📜 Ход боя:</h4>
                    <div class="log-entries">
                        ${this.battleLog.map(entry => `
                            <div class="log-entry">${entry}</div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Подсказка -->
                <div class="battle-hint" id="battleHint">
                    Выберите цель для атаки
                </div>
            </div>
        `;

        this.injectTacticalBattleStyles();
        this.updateAvailableTargets();
    }

    // НОВЫЙ МЕТОД: Отрисовка боевой сетки
    renderBattleGrid(side) {
        const grid = this.battleGrid[side];
        let html = '';
        
        // Рендерим сетку 3×2
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const position = row * 2 + col;
                const unit = grid[position];
                
                html += this.renderBattlePosition(unit, position, side);
            }
        }
        
        return html;
    }

    // НОВЫЙ МЕТОД: Отрисовка позиции в сетке
    renderBattlePosition(unit, position, side) {
        const isEnemy = side === 'enemies';
        const isEmpty = !unit;
        
        let unitHtml = '';
        let healthBar = '';
        let clickHandler = '';
        let cssClass = `battle-position ${isEnemy ? 'enemy-position' : 'ally-position'}`;
        
        if (isEmpty) {
            unitHtml = '<div class="empty-slot">⚫</div>';
            cssClass += ' empty';
        } else {
            // Полоска здоровья
            const healthPercent = (unit.currentHealth / unit.maxHealth) * 100;
            healthBar = `
                <div class="position-health-bar">
                    <div class="health-fill" style="width: ${healthPercent}%"></div>
                    <div class="health-text">${Math.ceil(unit.currentHealth)}/${unit.maxHealth}</div>
                </div>
            `;
            
            // Иконка юнита
            const imageUrl = unit.data.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjEyIiBmaWxsPSIjODg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+${isEnemy ? '👹' : '🎯'}</dGV4dD48L3N2Zz4=';
            
            unitHtml = `
                <div class="unit-icon">
                    <img src="${imageUrl}" alt="${unit.data.name}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                    <div class="unit-fallback" style="display: none;">
                        <span>${isEnemy ? '👹' : '🎯'}</span>
                    </div>
                </div>
                <div class="unit-name">${unit.data.name}</div>
            `;
            
            // Обработчик клика для врагов
            if (isEnemy) {
                clickHandler = `onclick="game.systems.battle.selectTarget(${position})"`;
                cssClass += ' selectable';
            }
        }
        
        return `
            <div class="${cssClass}" ${clickHandler} data-position="${position}">
                ${unitHtml}
                ${healthBar}
            </div>
        `;
    }

    // НОВЫЙ МЕТОД: Выбор цели для атаки
    selectTarget(position) {
        if (!this.availableTargets.includes(position)) {
            console.log("🚫 Цель недоступна для атаки");
            return;
        }

        this.selectedTarget = position;
        const targetUnit = this.battleGrid.enemies[position];
        
        console.log(`🎯 Выбрана цель: ${targetUnit.data.name} на позиции ${position}`);
        
        // Подсвечиваем выбранную цель
        this.highlightSelectedTarget(position);
        
        // Выполняем атаку
        this.executeAttack(position);
    }

    // НОВЫЙ МЕТОД: Подсветка выбранной цели
    highlightSelectedTarget(position) {
        // Сбрасываем предыдущие подсветки
        document.querySelectorAll('.battle-position').forEach(el => {
            el.classList.remove('selected', 'available');
        });
        
        // Подсвечиваем выбранную цель
        const targetElement = document.querySelector(`.enemy-position[data-position="${position}"]`);
        if (targetElement) {
            targetElement.classList.add('selected');
        }
    }

    // НОВЫЙ МЕТОД: Обновление доступных целей
    updateAvailableTargets() {
        const hero = this.battleGrid.allies[3]; // Герой на позиции 3
        if (!hero) return;

        // Определяем тип атаки героя по оружию
        const attackType = this.getHeroAttackType(hero.data);
        
        this.availableTargets = [];
        
        // Определяем доступные цели в зависимости от типа атаки
        if (attackType === 'ranged') {
            // Дальний бой - все враги доступны
            this.availableTargets = [0, 1, 2, 3, 4, 5].filter(pos => 
                this.battleGrid.enemies[pos] && this.battleGrid.enemies[pos].currentHealth > 0
            );
        } else {
            // Ближний бой - только первый ряд (позиции 0, 1, 2)
            this.availableTargets = [0, 1, 2].filter(pos => 
                this.battleGrid.enemies[pos] && this.battleGrid.enemies[pos].currentHealth > 0
            );
        }
        
        // Визуально подсвечиваем доступные цели
        this.highlightAvailableTargets();
        
        // Обновляем подсказку
        this.updateBattleHint(attackType);
    }

    // НОВЫЙ МЕТОД: Определение типа атаки героя
    getHeroAttackType(hero) {
        // Временная логика - позже интегрируем с системой экипировки
        const equippedWeapon = hero.equipment?.main_hand;
        if (equippedWeapon) {
            // Здесь будет проверка типа оружия из системы экипировки
            return 'melee'; // Временно всегда ближний бой
        }
        return 'melee'; // По умолчанию ближний бой
    }

    // НОВЫЙ МЕТОД: Подсветка доступных целей
    highlightAvailableTargets() {
        document.querySelectorAll('.enemy-position').forEach(el => {
            const position = parseInt(el.getAttribute('data-position'));
            if (this.availableTargets.includes(position)) {
                el.classList.add('available');
            } else {
                el.classList.remove('available');
            }
        });
    }

    // НОВЫЙ МЕТОД: Обновление подсказки
    updateBattleHint(attackType) {
        const hintElement = document.getElementById('battleHint');
        if (hintElement) {
            const targetType = attackType === 'ranged' ? 'любого противника' : 'противника в первом ряду';
            hintElement.textContent = `Выберите ${targetType} для атаки (${attackType === 'ranged' ? 'дальний бой' : 'ближний бой'})`;
        }
    }

    // НОВЫЙ МЕТОД: Выполнение атаки
    executeAttack(targetPosition) {
        const hero = this.battleGrid.allies[3];
        const target = this.battleGrid.enemies[targetPosition];
        
        if (!hero || !target) {
            console.error("❌ Не могу выполнить атаку: герой или цель не найдены");
            return;
        }

        this.battleRound++;
        
        // Расчет урона (временная логика)
        const heroStats = window.game.systems.level.calculateHeroStats(hero.data, window.game.systems.bonus);
        const baseDamage = heroStats.damage;
        const targetArmor = target.data.armor || 0;
        const finalDamage = Math.max(1, baseDamage - targetArmor);
        
        // Применяем урон
        target.currentHealth -= finalDamage;
        
        // Анимация атаки
        this.playAttackAnimation(3, targetPosition, finalDamage);
        
        this.addBattleLog(`🗡️ ${hero.data.name} атакует ${target.data.name} и наносит ${finalDamage} урона!`);
        
        // Проверяем смерть цели
        if (target.currentHealth <= 0) {
            this.addBattleLog(`💀 ${target.data.name} повержен!`);
            this.battleGrid.enemies[targetPosition] = null;
            
            // Проверяем конец боя
            if (this.isBattleOver()) {
                this.endTacticalBattle(true);
                return;
            }
        }
        
        // Ход монстров
        setTimeout(() => {
            this.executeMonsterTurns();
        }, 1000);
    }

    // НОВЫЙ МЕТОД: Анимация атаки
    playAttackAnimation(attackerPosition, targetPosition, damage) {
        const attackerEl = document.querySelector(`.ally-position[data-position="${attackerPosition}"]`);
        const targetEl = document.querySelector(`.enemy-position[data-position="${targetPosition}"]`);
        
        if (attackerEl && targetEl) {
            // Простая анимация смещения
            attackerEl.style.transform = 'translateX(10px)';
            setTimeout(() => {
                attackerEl.style.transform = 'translateX(0)';
                
                // Эффект попадания по цели
                targetEl.classList.add('hit-effect');
                setTimeout(() => {
                    targetEl.classList.remove('hit-effect');
                }, 500);
                
            }, 300);
        }
        
        // Обновляем полоску здоровья
        this.updateHealthDisplay(targetPosition);
    }

    // НОВЫЙ МЕТОД: Обновление отображения здоровья
    updateHealthDisplay(position) {
        const unit = this.battleGrid.enemies[position];
        if (!unit) return;
        
        const positionEl = document.querySelector(`.enemy-position[data-position="${position}"]`);
        if (positionEl) {
            const healthBar = positionEl.querySelector('.health-fill');
            const healthText = positionEl.querySelector('.health-text');
            
            if (healthBar && healthText) {
                const healthPercent = (unit.currentHealth / unit.maxHealth) * 100;
                healthBar.style.width = `${healthPercent}%`;
                healthText.textContent = `${Math.ceil(unit.currentHealth)}/${unit.maxHealth}`;
            }
        }
    }

    // НОВЫЙ МЕТОД: Ход монстров
    executeMonsterTurns() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => unit && unit.currentHealth > 0);
        
        if (aliveMonsters.length === 0) {
            this.endTacticalBattle(true);
            return;
        }
        
        // Монстры атакуют по очереди
        let monsterIndex = 0;
        const executeNextMonsterTurn = () => {
            if (monsterIndex >= aliveMonsters.length) {
                // Все монстры сходили, ход игрока
                this.updateAvailableTargets();
                return;
            }
            
            const monster = aliveMonsters[monsterIndex];
            this.executeMonsterAttack(monster);
            
            monsterIndex++;
            setTimeout(executeNextMonsterTurn, 800);
        };
        
        executeNextMonsterTurn();
    }

    // НОВЫЙ МЕТОД: Атака монстра
    executeMonsterAttack(monster) {
        const hero = this.battleGrid.allies[3];
        if (!hero) return;
        
        // Монстры всегда атакуют героя (пока что)
        const monsterDamage = monster.data.damage || 5;
        const heroArmor = window.game.systems.level.calculateHeroStats(hero.data, window.game.systems.bonus).armor;
        const finalDamage = Math.max(1, monsterDamage - heroArmor);
        
        hero.currentHealth -= finalDamage;
        
        this.addBattleLog(`👹 ${monster.data.name} атакует героя и наносит ${finalDamage} урона!`);
        
        // Анимация атаки монстра
        this.playMonsterAttackAnimation(monster.position, 3, finalDamage);
        
        // Проверяем смерть героя
        if (hero.currentHealth <= 0) {
            this.addBattleLog(`💀 ${hero.data.name} повержен!`);
            this.endTacticalBattle(false);
        }
    }

    // НОВЫЙ МЕТОД: Анимация атаки монстра
    playMonsterAttackAnimation(monsterPosition, targetPosition, damage) {
        const monsterEl = document.querySelector(`.enemy-position[data-position="${monsterPosition}"]`);
        const targetEl = document.querySelector(`.ally-position[data-position="${targetPosition}"]`);
        
        if (monsterEl && targetEl) {
            monsterEl.style.transform = 'translateX(-10px)';
            setTimeout(() => {
                monsterEl.style.transform = 'translateX(0)';
                
                targetEl.classList.add('hit-effect');
                setTimeout(() => {
                    targetEl.classList.remove('hit-effect');
                }, 500);
                
            }, 300);
        }
        
        // Обновляем здоровье героя
        this.updateHeroHealthDisplay();
    }

    // НОВЫЙ МЕТОД: Обновление здоровья героя
    updateHeroHealthDisplay() {
        const hero = this.battleGrid.allies[3];
        if (!hero) return;
        
        const heroEl = document.querySelector('.ally-position[data-position="3"]');
        if (heroEl) {
            const healthBar = heroEl.querySelector('.health-fill');
            const healthText = heroEl.querySelector('.health-text');
            
            if (healthBar && healthText) {
                const healthPercent = (hero.currentHealth / hero.maxHealth) * 100;
                healthBar.style.width = `${healthPercent}%`;
                healthText.textContent = `${Math.ceil(hero.currentHealth)}/${hero.maxHealth}`;
            }
        }
    }

    // НОВЫЙ МЕТОД: Проверка окончания боя
    isBattleOver() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => unit && unit.currentHealth > 0);
        const hero = this.battleGrid.allies[3];
        
        return aliveMonsters.length === 0 || (hero && hero.currentHealth <= 0);
    }

    // НОВЫЙ МЕТОД: Завершение тактического боя
    endTacticalBattle(victory) {
        if (victory) {
            // Награда за каждого убитого монстра
            const totalReward = this.currentMonsters.reduce((sum, monster) => {
                return sum + (monster.reward || 10);
            }, 0);
            
            const totalExperience = this.currentMonsters.reduce((sum, monster) => {
                return sum + (monster.experience || 5);
            }, 0);
            
            this.currentHero.gold += totalReward;
            window.game.systems.level.addExperience(this.currentHero, totalExperience);
            this.currentHero.monstersKilled = (this.currentHero.monstersKilled || 0) + this.currentMonsters.length;
            
            this.addBattleLog(`🎉 ПОБЕДА! +${totalReward} золота, +${totalExperience} опыта`);
        } else {
            this.currentHero.currentHealth = 1;
            this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
            this.addBattleLog("💀 ПОРАЖЕНИЕ! Герой повержен");
        }
        
        // Сохраняем игру
        if (window.game) {
            window.game.saveGame();
        }
        
        this.battleActive = false;
        this.currentMonsters = [];
        
        // Показываем экран результата
        this.showTacticalBattleResult(victory);
    }

    // НОВЫЙ МЕТОД: Показать результат боя
    showTacticalBattleResult(victory) {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="battle-result-screen">
                <div class="result-content ${victory ? 'victory' : 'defeat'}">
                    <h2>${victory ? '🎉 ПОБЕДА!' : '💀 ПОРАЖЕНИЕ'}</h2>
                    <div class="result-stats">
                        <div class="stat">Убито монстров: ${this.currentMonsters.length}</div>
                        <div class="stat">Потрачено раундов: ${this.battleRound}</div>
                    </div>
                    <button class="btn-primary" onclick="game.systems.battle.returnToGame()">
                        Продолжить
                    </button>
                </div>
            </div>
        `;
    }

    // НОВЫЙ МЕТОД: Стили для тактического боя
    injectTacticalBattleStyles() {
        const styles = `
            <style>
            .tactical-battle-screen {
                padding: 1rem;
                background: #1f2937;
                color: white;
                min-height: 100vh;
            }
            
            .battle-grid-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 2rem;
                margin: 2rem 0;
            }
            
            .battle-grid {
                flex: 1;
                background: rgba(55, 65, 81, 0.8);
                border-radius: 12px;
                padding: 1rem;
                border: 2px solid #4b5563;
            }
            
            .grid-header {
                text-align: center;
                font-weight: bold;
                margin-bottom: 1rem;
                color: #f59e0b;
                font-size: 1.2rem;
            }
            
            .grid-positions {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                grid-template-rows: repeat(3, 1fr);
                gap: 0.5rem;
                min-height: 400px;
            }
            
            .battle-position {
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                padding: 0.5rem;
                text-align: center;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 120px;
            }
            
            .battle-position.empty {
                opacity: 0.3;
            }
            
            .battle-position.selectable {
                cursor: pointer;
            }
            
            .battle-position.available {
                border-color: #4ade80;
                background: rgba(74, 222, 128, 0.1);
            }
            
            .battle-position.available:hover {
                border-color: #22c55e;
                background: rgba(74, 222, 128, 0.2);
                transform: scale(1.05);
            }
            
            .battle-position.selected {
                border-color: #3b82f6;
                background: rgba(59, 130, 246, 0.2);
                transform: scale(1.05);
            }
            
            .unit-icon {
                width: 60px;
                height: 60px;
                margin-bottom: 0.5rem;
            }
            
            .unit-icon img {
                width: 100%;
                height: 100%;
                object-fit: cover;
                border-radius: 8px;
            }
            
            .unit-name {
                font-size: 0.9rem;
                font-weight: bold;
                margin-bottom: 0.5rem;
            }
            
            .position-health-bar {
                width: 100%;
                height: 8px;
                background: #4b5563;
                border-radius: 4px;
                overflow: hidden;
                position: relative;
            }
            
            .health-fill {
                height: 100%;
                background: linear-gradient(90deg, #ef4444, #f59e0b);
                transition: width 0.3s ease;
            }
            
            .health-text {
                font-size: 0.7rem;
                color: #cbd5e1;
                margin-top: 2px;
            }
            
            .battle-vs {
                font-size: 2rem;
                font-weight: bold;
                color: #f59e0b;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            }
            
            .tactical-battle-log {
                background: rgba(0, 0, 0, 0.4);
                border-radius: 8px;
                padding: 1rem;
                margin: 1rem 0;
                max-height: 150px;
                overflow-y: auto;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .battle-hint {
                text-align: center;
                padding: 1rem;
                background: rgba(59, 130, 246, 0.1);
                border-radius: 8px;
                border: 1px solid #3b82f6;
                font-weight: bold;
            }
            
            .hit-effect {
                animation: hitFlash 0.5s ease;
            }
            
            @keyframes hitFlash {
                0% { background: rgba(239, 68, 68, 0.3); }
                100% { background: transparent; }
            }
            
            .battle-result-screen {
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: #1f2937;
            }
            
            .result-content {
                background: rgba(255, 255, 255, 0.1);
                padding: 3rem;
                border-radius: 15px;
                text-align: center;
                border: 3px solid;
            }
            
            .result-content.victory {
                border-color: #10b981;
                background: rgba(16, 185, 129, 0.1);
            }
            
            .result-content.defeat {
                border-color: #ef4444;
                background: rgba(239, 68, 68, 0.1);
            }
            
            .result-stats {
                margin: 2rem 0;
            }
            
            .stat {
                margin: 0.5rem 0;
                font-size: 1.1rem;
            }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
}

// Обновляем глобальную регистрацию
window.BattleSystem = BattleSystem;
console.log("📦 BattleSystem обновлен с тактической сеткой 3×2");
