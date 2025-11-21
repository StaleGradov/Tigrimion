"use strict";

class BattleSystem {
    constructor() {
        this.monsters = [];
        this.battleActive = false;
        this.currentMonsters = [];
        this.currentHero = null;
        this.battleLog = [];
        this.battleRound = 0;
        this.battleContext = 'normal';
        
        // Тактическая система
        this.currentPlayer = 1;
        this.players = {
            1: { 
                ap: 3, 
                currentAction: null,
                combo: { type: null, count: 0 },
                previousActions: []
            },
            2: { 
                ap: 3, 
                currentAction: null,
                combo: { type: null, count: 0 },
                previousActions: []
            }
        };
        
        this.actionsCost = {
            attack: 1,
            strongAttack: 2,
            crushingAttack: 4,
            block: 1,
            breakBlock: 1,
            rest: 1
        };
        
        this.battleGrid = {
            allies: [null, null, null, null, null, null],
            enemies: [null, null, null, null, null, null]
        };
        
        this.selectedTarget = null;
        this.availableTargets = [];
        this.resultShown = false;
        this.battleEnding = false;
        
        console.log("✅ BattleSystem инициализирован с тактической системой");
    }

    async loadBattleData() {
        try {
            console.log("📥 Загружаем данные монстров...");
            
            const [enemiesResponse, monstersResponse] = await Promise.all([
                fetch('data/enemies.json').catch(() => null),
                fetch('data/monsters.json').catch(() => null)
            ]);
            
            this.randomMonsters = [];
            this.programmedMonsters = new Map();
            
            if (enemiesResponse && enemiesResponse.ok) {
                this.randomMonsters = await enemiesResponse.json();
                console.log(`✅ Загружено случайных монстров: ${this.randomMonsters.length}`);
            } else {
                console.error("❌ enemies.json не загружен!");
                this.randomMonsters = [];
            }
            
            if (monstersResponse && monstersResponse.ok) {
                const programmedMonsters = await monstersResponse.json();
                programmedMonsters.forEach(monster => {
                    this.programmedMonsters.set(monster.id, monster);
                });
                console.log(`✅ Загружено запрограммированных монстров: ${programmedMonsters.length}`);
            } else {
                console.error("❌ monsters.json не загружен!");
            }
            
            this.monsters = [...this.randomMonsters, ...Array.from(this.programmedMonsters.values())];
            console.log(`🎯 Всего монстров: ${this.monsters.length}`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных монстров:", error);
            this.randomMonsters = [];
            this.programmedMonsters = new Map();
            this.monsters = [];
            return false;
        }
    }

    getRandomMonsterForMovement() {
        if (this.randomMonsters.length === 0) {
            console.error("❌ Нет случайных монстров в enemies.json!");
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * this.randomMonsters.length);
        const monster = this.randomMonsters[randomIndex];
        console.log(`🎲 Выбран случайный монстр: ${monster.name}`);
        return monster;
    }

    getMonsterById(monsterId) {
        if (this.programmedMonsters.has(monsterId)) {
            return this.programmedMonsters.get(monsterId);
        }
        
        const randomMonster = this.randomMonsters.find(m => m.id === monsterId);
        if (randomMonster) {
            return randomMonster;
        }
        
        console.warn(`❌ Монстр с ID ${monsterId} не найден!`);
        return null;
    }

    getHeroStatsForBattle() {
        if (!this.currentHero || !window.game.systems.hero) {
            console.error("❌ Герой или HeroSystem не доступен");
            return { currentHealth: 0, maxHealth: 0, damage: 0, armor: 0, critChance: 0.1, vampirism: 0 };
        }
        
        return window.game.systems.hero.calculateHeroStats(this.currentHero);
    }

    // ⭐ ОСНОВНОЙ МЕТОД ЗАПУСКА ТАКТИЧЕСКОГО БОЯ
    startBattleWithMonster(hero, monsterId, context = 'normal') {
        if (!hero) {
            console.error("❌ Не могу начать бой: герой не передан");
            return;
        }

        this.resultShown = false;
        this.battleEnding = false;

        const monsterGroup = this.generateMonsterGroup(monsterId);
        if (!monsterGroup) return;

        this.currentHero = hero;
        this.currentMonsters = monsterGroup;
        
        // Сброс тактической системы
        this.currentPlayer = 1;
        this.players[1] = { ap: 3, currentAction: null, combo: { type: null, count: 0 }, previousActions: [] };
        this.players[2] = { ap: 3, currentAction: null, combo: { type: null, count: 0 }, previousActions: [] };
        
        const heroStats = this.getHeroStatsForBattle();
        this.setupTacticalGrid(hero, monsterGroup, heroStats);
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        this.battleContext = context;
        
        console.log(`⚔️ Начинаем тактический бой с ${monsterGroup.length} монстрами`);
        this.showTacticalBattleInterface();
    }

    startBattleWithSpecificMonster(hero, specificMonster, context = 'normal') {
        if (!hero) {
            console.error("❌ Не могу начать бой: герой не передан");
            return;
        }

        this.resultShown = false;
        this.battleEnding = false;

        const monsterGroup = this.generateSpecificMonsterGroup(specificMonster);
        if (!monsterGroup) return;

        this.currentHero = hero;
        this.currentMonsters = monsterGroup;
        
        // Сброс тактической системы
        this.currentPlayer = 1;
        this.players[1] = { ap: 3, currentAction: null, combo: { type: null, count: 0 }, previousActions: [] };
        this.players[2] = { ap: 3, currentAction: null, combo: { type: null, count: 0 }, previousActions: [] };
        
        const heroStats = this.getHeroStatsForBattle();
        this.setupTacticalGrid(hero, monsterGroup, heroStats);
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        this.battleContext = context;
        
        console.log(`⚔️ Начинаем бой с конкретным монстром: ${specificMonster.name}`);
        this.showTacticalBattleInterface();
    }

    generateSpecificMonsterGroup(specificMonster) {
        if (!specificMonster) return null;

        const monsterCount = 1;
        const monsterGroup = [];
        
        for (let i = 0; i < monsterCount; i++) {
            const monsterCopy = {
                ...specificMonster,
                battleId: i + 1,
                currentHealth: specificMonster.health,
                name: monsterCount > 1 ? `${specificMonster.name} ${i + 1}` : specificMonster.name,
                source: 'programmed'
            };
            monsterGroup.push(monsterCopy);
        }

        return monsterGroup;
    }

    generateMonsterGroup(baseMonsterId) {
        let baseMonster = this.monsters.find(m => m.id === baseMonsterId);
        if (!baseMonster) {
            const randomIndex = Math.floor(Math.random() * this.monsters.length);
            baseMonster = this.monsters[randomIndex];
        }

        const roll = Math.random() * 100;
        let monsterCount = 1;
        if (roll <= 70) monsterCount = 1;
        else if (roll <= 85) monsterCount = 2;
        else if (roll <= 93) monsterCount = 3;
        else if (roll <= 97) monsterCount = 4;
        else if (roll <= 99) monsterCount = 5;
        else monsterCount = 6;

        const monsterGroup = [];
        for (let i = 0; i < monsterCount; i++) {
            const monsterCopy = {
                ...baseMonster,
                battleId: i + 1,
                currentHealth: baseMonster.health,
                name: `${baseMonster.name} ${i + 1}`,
                source: 'random'
            };
            monsterGroup.push(monsterCopy);
        }

        return monsterGroup;
    }

    // ⭐ НАСТРОЙКА ТАКТИЧЕСКОЙ СЕТКИ
    setupTacticalGrid(hero, monsters, heroStats = null) {
        this.battleGrid.allies = [null, null, null, null, null, null];
        this.battleGrid.enemies = [null, null, null, null, null, null];
        
        if (!heroStats) {
            heroStats = this.getHeroStatsForBattle();
        }
        
        // Герой на позиции 4 (центр справа)
        this.battleGrid.allies[4] = {
            type: 'hero',
            data: hero,
            position: 4,
            maxHealth: heroStats.maxHealth,
            currentHealth: heroStats.currentHealth
        };

        this.placeMonstersOnGrid(monsters);
        this.updateAvailableTargets();
    }

    placeMonstersOnGrid(monsters) {
        const meleePositions = [0, 2, 4];  // Ближний бой
        const rangedPositions = [1, 3, 5]; // Дальний бой
        
        let meleeCount = 0;
        let rangedCount = 0;

        monsters.forEach(monster => {
            const attackType = monster.attackType || 'melee';
            let position;
            
            if (attackType === 'melee' && meleeCount < 3) {
                position = meleePositions[meleeCount++];
            } else if (attackType === 'ranged' && rangedCount < 3) {
                position = rangedPositions[rangedCount++];
            } else {
                // Если нет мест в своей категории, ищем любые свободные
                const availablePositions = [...meleePositions, ...rangedPositions]
                    .filter(pos => !this.battleGrid.enemies[pos]);
                if (availablePositions.length > 0) {
                    position = availablePositions[0];
                    if (meleePositions.includes(position)) meleeCount++;
                    else rangedCount++;
                }
            }

            if (position !== undefined) {
                this.battleGrid.enemies[position] = {
                    type: 'monster',
                    data: monster,
                    position: position,
                    maxHealth: monster.health,
                    currentHealth: monster.currentHealth
                };
            }
        });

        // Если монстр один - ставим на позицию 3
        if (monsters.length === 1 && !this.battleGrid.enemies[3]) {
            const monster = monsters[0];
            this.battleGrid.enemies[3] = {
                type: 'monster',
                data: monster,
                position: 3,
                maxHealth: monster.health,
                currentHealth: monster.currentHealth
            };
        }
    }

    // ⭐ ГЛАВНЫЙ ИНТЕРФЕЙС ТАКТИЧЕСКОГО БОЯ
    showTacticalBattleInterface() {
        const app = document.getElementById('app');
        if (!app) return;

        const heroStats = this.getHeroStatsForBattle();
        
        app.innerHTML = `
            <div class="battle-screen-fullscreen">
                <header class="battle-header">
                    <div class="header-left">
                        <h2>⚔️ ТАКТИЧЕСКАЯ ДУЭЛЬ</h2>
                        <div class="battle-round">Раунд: ${this.battleRound}</div>
                    </div>
                    <button class="btn-battle-back" onclick="game.systems.battle.returnToGame()">
                        ← Назад к карте
                    </button>
                </header>
                
                <div class="battle-main-area" style="display: flex; gap: 20px; align-items: flex-start; justify-content: center;">
                    <!-- ЛЕВАЯ ПАНЕЛЬ - ИГРОК -->
                    <div class="tactical-panel player-panel">
                        <h3 class="panel-title">ВАШИ ДЕЙСТВИЯ</h3>
                        
                        <div class="panel-stats">
                            <div class="stat-item">
                                <span class="stat-label">Очки действий:</span>
                                <span class="stat-value" id="playerAP">3/3</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Комбо:</span>
                                <span class="stat-value" id="playerCombo">Нет</span>
                            </div>
                        </div>
                        
                        <div class="action-history">
                            <div class="history-title">Последние действия:</div>
                            <div class="history-entries" id="playerHistory">
                                <div class="history-empty">Еще нет действий</div>
                            </div>
                        </div>
                        
                        <div class="tactical-actions">
                            <button class="tactical-btn attack" onclick="game.systems.battle.handlePlayerAction('attack')">
                                <span class="btn-icon">⚔️</span>
                                <span class="btn-text">Атака</span>
                                <span class="btn-cost">(1 ОД)</span>
                            </button>
                            
                            <button class="tactical-btn strong-attack" onclick="game.systems.battle.handlePlayerAction('strongAttack')">
                                <span class="btn-icon">💥</span>
                                <span class="btn-text">Силовая</span>
                                <span class="btn-cost">(2 ОД)</span>
                            </button>
                            
                            <button class="tactical-btn crushing-attack" onclick="game.systems.battle.handlePlayerAction('crushingAttack')">
                                <span class="btn-icon">💢</span>
                                <span class="btn-text">Сокрушительная</span>
                                <span class="btn-cost">(4 ОД)</span>
                            </button>
                            
                            <button class="tactical-btn block" onclick="game.systems.battle.handlePlayerAction('block')">
                                <span class="btn-icon">🛡️</span>
                                <span class="btn-text">Блок</span>
                                <span class="btn-cost">(1 ОД)</span>
                            </button>
                            
                            <button class="tactical-btn break-block" onclick="game.systems.battle.handlePlayerAction('breakBlock')">
                                <span class="btn-icon">⚡</span>
                                <span class="btn-text">Пробитие</span>
                                <span class="btn-cost">(1 ОД)</span>
                            </button>
                            
                            <button class="tactical-btn rest" onclick="game.systems.battle.handlePlayerAction('rest')">
                                <span class="btn-icon">🌀</span>
                                <span class="btn-text">Отдых</span>
                                <span class="btn-cost">(1 ОД)</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- ЦЕНТР - СЕТКА 6x6 -->
                    <div class="battle-grid-fullscreen" style="flex: 1; max-width: 600px;">
                        <div class="grid-side allies-side">
                            <h3 class="side-title">ВАШ ОТРЯД</h3>
                            <div class="grid-container-6x6">
                                ${this.renderTacticalGrid('allies')}
                            </div>
                        </div>
                        
                        <div class="vs-separator">
                            <div class="vs-text">VS</div>
                        </div>
                        
                        <div class="grid-side enemies-side">
                            <h3 class="side-title">ПРОТИВНИКИ</h3>
                            <div class="grid-container-6x6">
                                ${this.renderTacticalGrid('enemies')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- ПРАВАЯ ПАНЕЛЬ - ПРОТИВНИК -->
                    <div class="tactical-panel enemy-panel">
                        <h3 class="panel-title">ДЕЙСТВИЯ ПРОТИВНИКА</h3>
                        
                        <div class="panel-stats">
                            <div class="stat-item">
                                <span class="stat-label">Очки действий:</span>
                                <span class="stat-value" id="enemyAP">3/3</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Комбо:</span>
                                <span class="stat-value" id="enemyCombo">Нет</span>
                            </div>
                        </div>
                        
                        <div class="action-history">
                            <div class="history-title">Последние действия:</div>
                            <div class="history-entries" id="enemyHistory">
                                <div class="history-empty">Еще нет действий</div>
                            </div>
                        </div>
                        
                        <div class="enemy-actions-preview">
                            <div class="preview-title">Возможные действия:</div>
                            <div class="enemy-actions-list">
                                <div class="enemy-action">⚔️ Атака</div>
                                <div class="enemy-action">🛡️ Блок</div>
                                <div class="enemy-action">🌀 Отдых</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- УПРАВЛЕНИЕ И ЛОГ -->
                <div class="battle-controls-fullscreen">
                    <div class="battle-hint-fullscreen" id="battleHint">
                        ${this.getTacticalHint()}
                    </div>
                    
                    <div class="battle-actions-fullscreen">
                        <button class="btn-battle-flee" onclick="game.systems.battle.tryToFlee()">
                            🏃 Попытаться сбежать
                        </button>
                    </div>
                </div>
                
                <div class="battle-log-fullscreen">
                    <h4>📜 Ход боя:</h4>
                    <div class="battle-log-entries" id="battleLogEntries">
                        ${this.battleLog.map(entry => `<div class="log-entry">${entry}</div>`).join('')}
                    </div>
                </div>
            </div>
        `;

        this.updateTacticalUI();
    }

    // ⭐ ОБРАБОТКА ДЕЙСТВИЙ ИГРОКА
    handlePlayerAction(action) {
        if (this.battleEnding || this.resultShown) {
            console.log("🛑 Бой уже завершается, игнорируем клик");
            return;
        }

        const player = this.players[1];
        
        // Проверка доступности ОД
        if (player.ap < this.actionsCost[action]) {
            this.addBattleLog(`❌ Недостаточно ОД для ${this.getActionName(action)}!`);
            return;
        }

        // Списание ОД
        player.ap -= this.actionsCost[action];
        
        // Обновление комбо
        if (player.combo.type === action && player.combo.count < 4) {
            player.combo.count++;
        } else {
            player.combo.type = action;
            player.combo.count = 1;
        }

        // Сохранение действия
        player.currentAction = action;
        player.previousActions.unshift(this.getActionName(action));
        if (player.previousActions.length > 3) {
            player.previousActions.pop();
        }

        this.addBattleLog(`🎯 Вы выбрали: ${this.getActionName(action)} (комбо x${player.combo.count})`);
        
        // Автоматический ход монстров
        setTimeout(() => {
            this.executeEnemyTurn();
        }, 500);
        
        this.updateTacticalUI();
    }

    // ⭐ ХОД ПРОТИВНИКА (ИИ)
    executeEnemyTurn() {
        const enemy = this.players[2];
        const availableActions = Object.keys(this.actionsCost).filter(a => 
            this.actionsCost[a] <= enemy.ap
        );
        
        if (availableActions.length === 0) {
            // Если нет ОД - отдых
            enemy.currentAction = 'rest';
            enemy.ap += 1;
        } else {
            // Простая ИИ логика
            const randomAction = availableActions[Math.floor(Math.random() * availableActions.length)];
            enemy.currentAction = randomAction;
            enemy.ap -= this.actionsCost[randomAction];
            
            // Обновление комбо
            if (enemy.combo.type === randomAction && enemy.combo.count < 4) {
                enemy.combo.count++;
            } else {
                enemy.combo.type = randomAction;
                enemy.combo.count = 1;
            }
        }

        // Сохранение в историю
        enemy.previousActions.unshift(this.getActionName(enemy.currentAction));
        if (enemy.previousActions.length > 3) {
            enemy.previousActions.pop();
        }

        this.addBattleLog(`👹 Противник использует: ${this.getActionName(enemy.currentAction)}`);
        
        // Разрешение хода
        setTimeout(() => {
            this.resolveTacticalTurn();
        }, 1000);
    }

    // ⭐ РАЗРЕШЕНИЕ ТАКТИЧЕСКОГО ХОДА
    resolveTacticalTurn() {
        const playerAction = this.players[1].currentAction;
        const enemyAction = this.players[2].currentAction;
        
        this.battleRound++;
        this.addBattleLog(`--- РАУНД ${this.battleRound} ---`);
        
        // Выполнение урона
        this.executeTacticalDamage(playerAction, enemyAction);
        
        // Сброс действий и восстановление ОД
        this.players[1].currentAction = null;
        this.players[2].currentAction = null;
        this.players[1].ap = Math.min(3, this.players[1].ap + 1);
        this.players[2].ap = Math.min(3, this.players[2].ap + 1);
        
        this.updateTacticalUI();
        
        // Проверка конца боя
        if (this.checkBattleEnd()) {
            setTimeout(() => {
                this.endTacticalBattle(this.isPlayerVictory());
            }, 1000);
        }
    }

    // ⭐ ВЫПОЛНЕНИЕ УРОНА С ИНТЕГРАЦИЕЙ ВАШИХ СТАТОВ
    executeTacticalDamage(playerAction, enemyAction) {
        const heroStats = this.getHeroStatsForBattle();
        const hero = this.battleGrid.allies[4];
        
        // Базовый урон героя из вашей системы
        const baseHeroDamage = heroStats.damage;
        
        // Множители атак (пропорции как обсуждали)
        const damageMultipliers = {
            attack: 1.0,      // 100% урона = обычная атака
            strongAttack: 2.5, // 250% урона
            crushingAttack: 7.5, // 750% урона
            breakBlock: 0.5   // 50% урона, но пробивает блок
        };
        
        // Расчет урона игрока
        if (playerAction && damageMultipliers[playerAction]) {
            const rawDamage = baseHeroDamage * damageMultipliers[playerAction];
            const comboMultiplier = 1 + (this.players[1].combo.count * 0.1);
            let finalDamage = Math.floor(rawDamage * comboMultiplier);
            
            // Критический удар
            const isCrit = Math.random() < heroStats.critChance;
            if (isCrit) {
                finalDamage *= 2;
                this.addBattleLog(`💥 КРИТИЧЕСКИЙ УДАР!`);
            }
            
            this.applyDamageToMonsters(finalDamage, playerAction, isCrit);
        }
        
        // Расчет урона противника
        if (enemyAction === 'attack' || enemyAction === 'strongAttack') {
            const monsterDamage = this.calculateMonsterDamage();
            let finalDamage = Math.max(1, monsterDamage - heroStats.armor);
            
            if (hero) {
                hero.currentHealth -= finalDamage;
                this.addBattleLog(`👹 Монстры атакуют и наносят ${finalDamage} урона!`);
                
                // Вампиризм монстров (если есть)
                if (this.hasVampirismMonsters()) {
                    const healAmount = Math.floor(finalDamage * 0.1);
                    this.healMonsters(healAmount);
                }
            }
        }
    }

    applyDamageToMonsters(damage, action, isCrit = false) {
        const targetPosition = this.findAvailableTarget();
        if (targetPosition !== null) {
            const target = this.battleGrid.enemies[targetPosition];
            if (target && target.currentHealth > 0) {
                let finalDamage = Math.max(1, damage - (target.data.armor || 0));
                
                // Пробитие блока
                if (action === 'breakBlock') {
                    finalDamage = damage; // Игнорирует броню
                    this.addBattleLog(`⚡ Пробитие игнорирует броню!`);
                }
                
                target.currentHealth -= finalDamage;
                
                const critText = isCrit ? "💥 КРИТ " : "";
                this.addBattleLog(`${critText}🎯 Вы наносите ${finalDamage} урона ${target.data.name}!`);
                
                // Вампиризм героя
                const heroStats = this.getHeroStatsForBattle();
                if (heroStats.vampirism > 0) {
                    const healAmount = Math.floor(finalDamage * heroStats.vampirism);
                    const hero = this.battleGrid.allies[4];
                    if (hero) {
                        hero.currentHealth = Math.min(hero.maxHealth, hero.currentHealth + healAmount);
                        this.addBattleLog(`🩸 Поглощено ${healAmount} здоровья!`);
                    }
                }
                
                if (target.currentHealth <= 0) {
                    target.currentHealth = 0;
                    this.addBattleLog(`💀 ${target.data.name} повержен!`);
                }
            }
        }
    }

    findAvailableTarget() {
        const hero = this.battleGrid.allies[4];
        if (!hero) return null;
        
        const attackType = this.getHeroAttackType(hero.data);
        
        let availablePositions = [];
        
        if (attackType === 'ranged') {
            // Дальний бой - все позиции
            availablePositions = [0, 1, 2, 3, 4, 5];
        } else {
            // Ближний бой - сначала ближние (0,2,4), потом дальние
            availablePositions = [0, 2, 4].filter(pos => {
                const unit = this.battleGrid.enemies[pos];
                return unit && unit.currentHealth > 0;
            });
            
            if (availablePositions.length === 0) {
                availablePositions = [1, 3, 5].filter(pos => {
                    const unit = this.battleGrid.enemies[pos];
                    return unit && unit.currentHealth > 0;
                });
            }
        }
        
        return availablePositions.length > 0 ? availablePositions[0] : null;
    }

    calculateMonsterDamage() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => 
            unit && unit.currentHealth > 0
        );
        
        if (aliveMonsters.length === 0) return 0;
        
        const totalDamage = aliveMonsters.reduce((sum, monster) => 
            sum + (monster.data.damage || 5), 0
        );
        
        return Math.floor(totalDamage / aliveMonsters.length);
    }

    hasVampirismMonsters() {
        return this.battleGrid.enemies.some(unit => 
            unit && unit.data.vampirism && unit.data.vampirism > 0
        );
    }

    healMonsters(healAmount) {
        this.battleGrid.enemies.forEach(unit => {
            if (unit && unit.currentHealth > 0) {
                unit.currentHealth = Math.min(unit.maxHealth, unit.currentHealth + healAmount);
            }
        });
    }

    // ⭐ ОСТАЛЬНЫЕ МЕТОДЫ (совместимость)
    showFullscreenBattle() {
        this.showTacticalBattleInterface();
    }

    updateAvailableTargets() {
        // Для совместимости со старой системой
    }

    selectTarget(position) {
        // Для совместимости - в тактической системе цель выбирается автоматически
    }

    executeAttack(targetPosition) {
        // Для совместимости
    }

    getHeroAttackType(hero) {
        const equippedWeaponId = hero.equipment?.main_hand;
        if (equippedWeaponId && window.game.systems.equipment) {
            const weapon = window.game.systems.equipment.getItemById(equippedWeaponId);
            return weapon?.attackType || 'melee';
        }
        return 'melee';
    }

    // ⭐ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    getActionName(action) {
        const names = {
            attack: 'Атака',
            strongAttack: 'Силовая атака',
            crushingAttack: 'Сокрушительная атака',
            block: 'Блок',
            breakBlock: 'Пробитие',
            rest: 'Отдых'
        };
        return names[action] || action;
    }

    updateTacticalUI() {
        // Обновление ОД
        const playerAP = document.getElementById('playerAP');
        const enemyAP = document.getElementById('enemyAP');
        const playerCombo = document.getElementById('playerCombo');
        const enemyCombo = document.getElementById('enemyCombo');
        
        if (playerAP) playerAP.textContent = `${this.players[1].ap}/3`;
        if (enemyAP) enemyAP.textContent = `${this.players[2].ap}/3`;
        
        if (playerCombo) {
            playerCombo.textContent = this.players[1].combo.count > 0 ? 
                `${this.getActionName(this.players[1].combo.type)} x${this.players[1].combo.count}` : 
                'Нет';
        }
            
        if (enemyCombo) {
            enemyCombo.textContent = this.players[2].combo.count > 0 ? 
                `${this.getActionName(this.players[2].combo.type)} x${this.players[2].combo.count}` : 
                'Нет';
        }
        
        this.updateActionHistory('playerHistory', this.players[1].previousActions);
        this.updateActionHistory('enemyHistory', this.players[2].previousActions);
        
        this.updateTacticalGrid();
        this.updateBattleLog();
    }

    updateActionHistory(elementId, actions) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (actions.length === 0) {
            element.innerHTML = '<div class="history-empty">Еще нет действий</div>';
        } else {
            element.innerHTML = actions.map(action => 
                `<div class="history-entry">${action}</div>`
            ).join('');
        }
    }

    updateTacticalGrid() {
        const alliesGrid = document.querySelector('.allies-side .grid-container-6x6');
        const enemiesGrid = document.querySelector('.enemies-side .grid-container-6x6');
        
        if (alliesGrid) {
            alliesGrid.innerHTML = this.renderTacticalGrid('allies');
        }
        if (enemiesGrid) {
            enemiesGrid.innerHTML = this.renderTacticalGrid('enemies');
        }
    }

    renderTacticalGrid(side) {
        const grid = this.battleGrid[side];
        let html = '';
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const position = row * 2 + col;
                const unit = grid[position];
                html += this.renderTacticalGridCell(unit, position, side);
            }
        }
        
        return html;
    }

    renderTacticalGridCell(unit, position, side) {
        const isEnemy = side === 'enemies';
        const isEmpty = !unit;
        
        let cellClass = 'grid-cell-fullscreen';
        let content = '';
        
        if (isEmpty) {
            cellClass += ' empty';
            content = '<div class="empty-slot">⚫</div>';
        } else {
            const healthPercent = (unit.currentHealth / unit.maxHealth) * 100;
            const isAlive = unit.currentHealth > 0;
            
            let stats = '';
            if (isEnemy) {
                stats = `
                    <div class="unit-stats">
                        <div class="stat-line">
                            <span>⚔️ ${unit.data.damage}</span>
                            <span>🛡️ ${unit.data.armor || 0}</span>
                        </div>
                    </div>
                `;
            } else {
                const heroStats = this.getHeroStatsForBattle();
                stats = `
                    <div class="unit-stats">
                        <div class="stat-line">
                            <span>⚔️ ${heroStats.damage}</span>
                            <span>🛡️ ${heroStats.armor}</span>
                        </div>
                    </div>
                `;
            }
            
            content = `
                <div class="unit-display-fullscreen">
                    <div class="unit-image">
                        <img src="${unit.data.image}" alt="${unit.data.name}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="image-fallback" style="display: none;">
                            ${isEnemy ? '👹' : '🎯'}
                        </div>
                    </div>
                    <div class="unit-info">
                        <div class="unit-name">${unit.data.name}</div>
                        <div class="health-bar-fullscreen">
                            <div class="health-fill" style="width: ${healthPercent}%"></div>
                            <div class="health-text">${Math.ceil(unit.currentHealth)}/${unit.maxHealth}</div>
                        </div>
                        ${stats}
                    </div>
                </div>
            `;
            
            if (!isAlive) {
                cellClass += ' dead';
                content += '<div class="dead-overlay">💀</div>';
            }
        }
        
        return `
            <div class="${cellClass}" data-position="${position}" data-side="${side}">
                ${content}
            </div>
        `;
    }

    addBattleLog(message) {
        this.battleLog.push(`[Раунд ${this.battleRound}] ${message}`);
        if (this.battleLog.length > 8) this.battleLog.shift();
        this.updateBattleLog();
    }

    updateBattleLog() {
        const logContainer = document.getElementById('battleLogEntries');
        if (logContainer) {
            logContainer.innerHTML = this.battleLog.map(entry => `<div class="log-entry">${entry}</div>`).join('');
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    getTacticalHint() {
        return "Выберите действие - система автоматически выберет цель!";
    }

    checkBattleEnd() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => unit && unit.currentHealth > 0);
        const hero = this.battleGrid.allies[4];
        return aliveMonsters.length === 0 || (hero && hero.currentHealth <= 0);
    }

    isPlayerVictory() {
        const hero = this.battleGrid.allies[4];
        return hero && hero.currentHealth > 0;
    }

    endTacticalBattle(victory) {
        if (this.resultShown) return;
        this.resultShown = true;

        if (victory) {
            const totalReward = this.currentMonsters.reduce((sum, monster) => sum + (monster.reward || 10), 0);
            const totalExperience = this.currentMonsters.reduce((sum, monster) => sum + (monster.experience || 5), 0);
            
            this.currentHero.gold += totalReward;
            window.game.systems.level.addExperience(this.currentHero, totalExperience);
            this.currentHero.monstersKilled = (this.currentHero.monstersKilled || 0) + this.currentMonsters.length;
            
            this.addBattleLog(`🎉 ПОБЕДА! +${totalReward} золота, +${totalExperience} опыта`);
        } else {
            this.currentHero.currentHealth = 1;
            this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
            this.addBattleLog("💀 ПОРАЖЕНИЕ! Герой повержен. Здоровье восстановится до 1.");
            
            if (window.game && window.game.handleHeroDeath) {
                window.game.handleHeroDeath();
            }
        }
        
        if (this.currentHero && window.game.systems.hero) {
            this.currentHero.currentHealth = this.battleGrid.allies[4]?.currentHealth || this.currentHero.currentHealth;
            window.game.systems.hero.calculateHeroStats(this.currentHero);
        }
        
        if (window.game) window.game.saveGame();
        
        if (this.battleContext === 'movement' && window.game.systems.map) {
            window.game.systems.map.completeMovementAfterBattle(victory);
        }
        
        this.battleActive = false;
        this.showBattleResult(victory);
    }

    showBattleResult(victory) {
        const app = document.getElementById('app');
        if (!app) return;

        let resultHTML = '';
        
        if (victory) {
            const totalReward = this.currentMonsters.reduce((sum, monster) => sum + (monster.reward || 10), 0);
            const totalExperience = this.currentMonsters.reduce((sum, monster) => sum + (monster.experience || 5), 0);
            
            resultHTML = `
                <div class="battle-result-overlay">
                    <div class="battle-result-modal victory">
                        <h3>🎉 ПОБЕДА!</h3>
                        <div class="result-details">
                            <p>Убито монстров: ${this.currentMonsters.length}</p>
                            <p>💰 +${totalReward} золота</p>
                            <p>🌟 +${totalExperience} опыта</p>
                            <p>Раундов: ${this.battleRound}</p>
                        </div>
                        <button class="btn-primary" onclick="game.systems.battle.closeBattleResult()">
                            Продолжить
                        </button>
                    </div>
                </div>
            `;
        } else {
            resultHTML = `
                <div class="battle-result-overlay">
                    <div class="battle-result-modal defeat">
                        <h3>💀 ПОРАЖЕНИЕ</h3>
                        <div class="result-details">
                            <p>Герой повержен в бою</p>
                            <p>Здоровье восстановлено до 1</p>
                            <p>Раундов: ${this.battleRound}</p>
                        </div>
                        <button class="btn-primary" onclick="game.systems.battle.closeBattleResult()">
                            Продолжить
                        </button>
                    </div>
                </div>
            `;
        }
        
        const existingOverlay = document.querySelector('.battle-result-overlay');
        if (existingOverlay) existingOverlay.remove();
        
        app.insertAdjacentHTML('beforeend', resultHTML);
    }

    closeBattleResult() {
        const overlay = document.querySelector('.battle-result-overlay');
        if (overlay) overlay.remove();
        
        this.returnToGame();
    }

    tryToFlee() {
        const fleeChance = 0.4;
        
        if (Math.random() < fleeChance) {
            this.addBattleLog("🏃 Вам удалось сбежать с поля боя!");
            this.endTacticalBattle(false);
        } else {
            this.addBattleLog("❌ Попытка сбежать не удалась! Противники атакуют.");
            this.executeEnemyTurn();
        }
        
        this.updateTacticalUI();
    }

    returnToGame() {
        this.resultShown = false;
        this.battleEnding = false;
        
        if (this.battleContext === 'movement' && window.game && window.game.systems.map) {
            window.game.showHeroGameScreen();
            setTimeout(() => window.game.systems.map.showOverlay('tactical-map'), 100);
        } else if (window.game) {
            window.game.showHeroGameScreen();
        }
        
        this.battleActive = false;
        this.currentMonsters = [];
    }

    // Методы для совместимости
    showTacticalBattleScreen() {
        this.showTacticalBattleInterface();
    }

    hideTacticalMap() {
        const overlayContainer = document.getElementById('overlay-container');
        if (overlayContainer) {
            overlayContainer.style.display = 'none';
            overlayContainer.innerHTML = '';
        }
        if (window.game) window.game.activeOverlay = null;
    }

    showBattleScreen() {
        this.showTacticalBattleInterface();
    }
}

window.BattleSystem = BattleSystem;
console.log("📦 BattleSystem полностью переписан под тактическую систему");
