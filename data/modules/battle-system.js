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
        
        // Герой на позиции 5 (самая правая центральная ячейка)
        this.battleGrid.allies[5] = {
            type: 'hero',
            data: hero,
            position: 5,
            maxHealth: heroStats.maxHealth,
            currentHealth: heroStats.currentHealth
        };

        this.placeMonstersOnGrid(monsters);
        this.updateAvailableTargets();
    }

    placeMonstersOnGrid(monsters) {
        // Монстры на левой стороне, главный монстр на позиции 2 (левая центральная)
        const positions = [0, 1, 2, 3, 4, 5];
        
        monsters.forEach((monster, index) => {
            let position;
            if (monsters.length === 1) {
                position = 2; // Центральная левая позиция для одного монстра
            } else {
                position = positions[index] || index;
            }
            
            if (position < 6) {
                this.battleGrid.enemies[position] = {
                    type: 'monster',
                    data: monster,
                    position: position,
                    maxHealth: monster.health,
                    currentHealth: monster.currentHealth
                };
            }
        });
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
                
                <div class="battle-main-area">
                    <!-- ЛЕВАЯ ПАНЕЛЬ - ИГРОК -->
                    <div class="tactical-panel player-panel">
                        <h3 class="panel-title">ВАШИ ДЕЙСТВИЯ</h3>
                        
                        <div class="panel-stats">
                            <div class="stat-item">
                                <span class="stat-label">Очки действий:</span>
                                <span class="stat-value" id="playerAP">3/∞</span>
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
                    
                    <!-- ЦЕНТР - УВЕЛИЧЕННАЯ СЕТКА 6x6 -->
                    <div class="battle-grid-fullscreen">
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
                    
                    <!-- ПРАВАЯ ПАНЕЛЬ - ПРОТИВНИК (СДВИНУТА ПРАВЕЕ) -->
                    <div class="tactical-panel enemy-panel">
                        <h3 class="panel-title">ДЕЙСТВИЯ ПРОТИВНИКА</h3>
                        
                        <div class="panel-stats">
                            <div class="stat-item">
                                <span class="stat-label">Очки действий:</span>
                                <span class="stat-value" id="enemyAP">3/∞</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Комбо:</span>
                                <span class="stat-value" id="enemyCombo">Нет</span>
                            </div>
                        </div>
                        
                        <div class="action-history">
                            <div class="history-title">Последнее действие:</div>
                            <div class="history-entries" id="enemyHistory">
                                <div class="history-empty">Еще нет действий</div>
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

    // ⭐ ОБРАБОТКА ДЕЙСТВИЙ ИГРОКА С ПРАВИЛЬНОЙ ПРОГРЕССИЕЙ
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
        
        // Обновление комбо (сбрасывается при смене типа действия)
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
        
        // Автоматический ход монстров через ИИ
        setTimeout(() => {
            this.executeEnemyTurn();
        }, 500);
        
        this.updateTacticalUI();
    }

    // ⭐ РАСЧЕТ МНОЖИТЕЛЯ КОМБО ПО ТИПУ АТАКИ
    getComboMultiplier(action, comboCount) {
        const baseMultipliers = {
            attack: [1.0, 2.0, 4.0, 8.0],        // 100% → 200% → 400% → 800%
            strongAttack: [2.5, 5.0, 10.0, 20.0], // 250% → 500% → 1000% → 2000%
            crushingAttack: [7.5, 15.0, 30.0, 60.0], // 750% → 1500% → 3000% → 6000%
            breakBlock: [0.5, 1.0, 1.5, 2.0]     // 50% → 100% → 150% → 200% (без блока)
        };
        
        const index = Math.min(comboCount - 1, 3);
        return baseMultipliers[action] ? baseMultipliers[action][index] : 1.0;
    }

    // ⭐ РАСЧЕТ МНОЖИТЕЛЯ ПРОБИТИЯ С УЧЕТОМ БЛОКА ПРОТИВНИКА
    getBreakBlockMultiplier(comboCount, enemyHasBlock = false) {
        if (!enemyHasBlock) {
            // Без блока: 50% → 100% → 150% → 200%
            const multipliers = [0.5, 1.0, 1.5, 2.0];
            return multipliers[Math.min(comboCount - 1, 3)];
        } else {
            // С блоком: 200% → 300% → 400% → 500%
            const multipliers = [2.0, 3.0, 4.0, 5.0];
            return multipliers[Math.min(comboCount - 1, 3)];
        }
    }

    // ⭐ РАСЧЕТ ЭФФЕКТИВНОСТИ БЛОКА
    getBlockEfficiency(comboCount) {
        // 50% → 75% → 100% → 100% + отражение
        const efficiencies = [0.5, 0.75, 1.0, 1.0];
        return efficiencies[Math.min(comboCount - 1, 3)];
    }

    // ⭐ РАСЧЕТ БОНУСНЫХ ОД ДЛЯ БЛОКА
    getBlockAPBonus(comboCount) {
        // +1 → +2 → +3 → +4 ОД за блок
        const apBonuses = [1, 2, 3, 4];
        return apBonuses[Math.min(comboCount - 1, 3)];
    }

    // ⭐ РАСЧЕТ ЭФФЕКТИВНОСТИ ОТДЫХА
    getRestEfficiency(comboCount) {
        // +1 ОД+5%HP → +2 ОД+10%HP → +3 ОД+15%HP → +4 ОД+20%HP
        const apGain = [1, 2, 3, 4];
        const healPercent = [0.05, 0.10, 0.15, 0.20];
        
        return {
            ap: apGain[Math.min(comboCount - 1, 3)],
            healPercent: healPercent[Math.min(comboCount - 1, 3)]
        };
    }

    // ⭐ УМНЫЙ ИИ ДЛЯ ПРОТИВНИКА
    executeEnemyTurn() {
        const enemy = this.players[2];
        
        // Создаем ИИ для этого хода
        const tacticalAI = new TacticalAI(this);
        
        // Получаем интеллектуальное решение
        const action = tacticalAI.decideAction();
        
        // Выполняем действие
        enemy.currentAction = action;
        enemy.ap -= this.actionsCost[action];
        
        // Обновление комбо
        if (enemy.combo.type === action && enemy.combo.count < 4) {
            enemy.combo.count++;
        } else {
            enemy.combo.type = action;
            enemy.combo.count = 1;
        }

        // Сохранение в историю (только последнее действие)
        enemy.previousActions = [this.getActionName(action)];

        this.addBattleLog(`👹 Противник использует: ${this.getActionName(action)}`);
        
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
        this.players[1].ap += 1; // +1 ОД каждый ход
        this.players[2].ap += 1; // +1 ОД каждый ход
        
        this.updateTacticalUI();
        
        // Проверка конца боя
        if (this.checkBattleEnd()) {
            setTimeout(() => {
                this.endTacticalBattle(this.isPlayerVictory());
            }, 1000);
        }
    }

    // ⭐ ВЫПОЛНЕНИЕ УРОНА С ПРАВИЛЬНОЙ ПРОГРЕССИЕЙ КОМБО
    executeTacticalDamage(playerAction, enemyAction) {
        const heroStats = this.getHeroStatsForBattle();
        const hero = this.battleGrid.allies[5];
        
        // 🔧 ИСПРАВЛЕНИЕ: Не даем здоровью уйти в минус
        if (hero && hero.currentHealth <= 0) {
            hero.currentHealth = 0;
            return;
        }
        
        // Базовый урон героя из вашей системы
        const baseHeroDamage = heroStats.damage;
        
        // Проверяем, есть ли у противника блок
        const enemyHasBlock = enemyAction === 'block';
        
        // Расчет урона игрока с правильной прогрессией комбо
        if (playerAction && playerAction !== 'rest' && playerAction !== 'block') {
            let damageMultiplier = 1.0;
            let finalDamage = 0;
            
            if (playerAction === 'breakBlock') {
                // Особый расчет для пробития
                damageMultiplier = this.getBreakBlockMultiplier(this.players[1].combo.count, enemyHasBlock);
                finalDamage = Math.floor(baseHeroDamage * damageMultiplier);
                
                if (enemyHasBlock) {
                    this.addBattleLog(`⚡ Пробитие блока! Множитель x${damageMultiplier}`);
                }
            } else {
                // Обычные атаки
                damageMultiplier = this.getComboMultiplier(playerAction, this.players[1].combo.count);
                const rawDamage = baseHeroDamage * damageMultiplier;
                finalDamage = Math.floor(rawDamage);
            }
            
            // Критический удар
            const isCrit = Math.random() < heroStats.critChance;
            if (isCrit) {
                finalDamage *= 2;
                this.addBattleLog(`💥 КРИТИЧЕСКИЙ УДАР!`);
            }
            
            this.applyDamageToMonsters(finalDamage, playerAction, isCrit, enemyHasBlock);
        }
        
        // Обработка блока игрока
        if (playerAction === 'block') {
            const blockEfficiency = this.getBlockEfficiency(this.players[1].combo.count);
            const apBonus = this.getBlockAPBonus(this.players[1].combo.count);
            
            this.players[1].ap += apBonus; // Бонусные ОД за блок
            
            this.addBattleLog(`🛡️ Блок активирован (эффективность: ${blockEfficiency * 100}%) +${apBonus} ОД`);
            
            // Отражение урона на 4-м стаке
            if (this.players[1].combo.count >= 4) {
                this.addBattleLog(`✨ Блок отражает урон обратно врагу!`);
                // Отражение 50% урона обратно врагу
                const reflectedDamage = Math.floor(this.calculateMonsterDamage() * 0.5);
                this.applyDamageToMonsters(reflectedDamage, 'block', false, false);
            }
        }
        
        // Обработка отдыха игрока
        if (playerAction === 'rest') {
            const restEfficiency = this.getRestEfficiency(this.players[1].combo.count);
            this.players[1].ap += restEfficiency.ap;
            
            if (hero) {
                const healAmount = Math.floor(hero.maxHealth * restEfficiency.healPercent);
                hero.currentHealth = Math.min(hero.maxHealth, hero.currentHealth + healAmount);
                this.addBattleLog(`🌀 Отдых: +${restEfficiency.ap} ОД, +${healAmount} HP`);
            }
        }
        
        // 🔥 ИСПРАВЛЕНИЕ: Расчет урона противника с учетом комбо и прогрессии
        if (enemyAction === 'attack') {
            const monsterDamage = this.calculateMonsterDamageWithCombo(enemyAction);
            let finalDamage = Math.max(1, monsterDamage - heroStats.armor);
            
            // Учет блока игрока
            if (playerAction === 'block') {
                const blockEfficiency = this.getBlockEfficiency(this.players[1].combo.count);
                finalDamage = Math.floor(finalDamage * (1 - blockEfficiency));
                this.addBattleLog(`🛡️ Блок поглощает ${blockEfficiency * 100}% урона!`);
            }
            
            if (hero && finalDamage > 0) {
                hero.currentHealth = Math.max(0, hero.currentHealth - finalDamage);
                this.addBattleLog(`👹 Монстры атакуют и наносят ${finalDamage} урона!`);
                
                // Вампиризм монстров (если есть)
                if (this.hasVampirismMonsters()) {
                    const healAmount = Math.floor(finalDamage * 0.1);
                    this.healMonsters(healAmount);
                }
            }
        }
        
        // 🔥 ИСПРАВЛЕНИЕ: Обработка блока противника с прогрессией
        if (enemyAction === 'block') {
            const enemyCombo = this.players[2].combo;
            const blockEfficiency = this.getBlockEfficiency(enemyCombo.count);
            const apBonus = this.getBlockAPBonus(enemyCombo.count);
            
            this.players[2].ap += apBonus;
            this.addBattleLog(`👹 Противник блокирует (эффективность: ${blockEfficiency * 100}%) +${apBonus} ОД`);
            
            // Отражение урона на 4-м стаке
            if (enemyCombo.count >= 4) {
                this.addBattleLog(`✨ Блок противника отражает урон!`);
                const reflectedDamage = Math.floor(baseHeroDamage * 0.5);
                if (hero) {
                    hero.currentHealth = Math.max(0, hero.currentHealth - reflectedDamage);
                    this.addBattleLog(`💥 Отражено ${reflectedDamage} урона обратно!`);
                }
            }
        }
        
        // 🔥 ИСПРАВЛЕНИЕ: Обработка отдыха противника с прогрессией
        if (enemyAction === 'rest') {
            const enemyCombo = this.players[2].combo.count;
            const restEfficiency = this.getRestEfficiency(enemyCombo);
            
            this.players[2].ap += restEfficiency.ap;
            
            // Лечение монстров
            const aliveMonsters = this.battleGrid.enemies.filter(m => m && m.currentHealth > 0);
            if (aliveMonsters.length > 0) {
                const healAmount = Math.floor(aliveMonsters[0].maxHealth * restEfficiency.healPercent);
                aliveMonsters.forEach(monster => {
                    monster.currentHealth = Math.min(monster.maxHealth, monster.currentHealth + healAmount);
                });
                this.addBattleLog(`👹 Противник отдыхает: +${restEfficiency.ap} ОД, +${healAmount} HP монстрам`);
            }
        }
        
        // 🔥 ИСПРАВЛЕНИЕ: Обработка пробития противника
        if (enemyAction === 'breakBlock') {
            const playerHasBlock = playerAction === 'block';
            const breakMultiplier = this.getBreakBlockMultiplier(this.players[2].combo.count, playerHasBlock);
            const baseMonsterDamage = this.calculateBaseMonsterDamage();
            const finalDamage = Math.floor(baseMonsterDamage * breakMultiplier);
            
            if (hero && finalDamage > 0) {
                // Пробитие игнорирует броню
                hero.currentHealth = Math.max(0, hero.currentHealth - finalDamage);
                this.addBattleLog(`⚡ Противник пробивает защиту и наносит ${finalDamage} урона!`);
            }
        }
    }

    // 🔥 НОВЫЙ МЕТОД: Расчет урона монстров с учетом комбо
    calculateMonsterDamageWithCombo(action) {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => 
            unit && unit.currentHealth > 0
        );
        
        if (aliveMonsters.length === 0) return 0;
        
        // Базовый урон монстров (средний)
        const baseDamage = aliveMonsters.reduce((sum, monster) => 
            sum + (monster.data.damage || 5), 0
        ) / aliveMonsters.length;
        
        // Применяем множитель комбо
        const comboMultiplier = this.getComboMultiplier(action, this.players[2].combo.count);
        const finalDamage = baseDamage * comboMultiplier;
        
        console.log(`🎯 Урон монстров: база=${baseDamage}, комбо=${comboMultiplier}x, итого=${finalDamage}`);
        
        return Math.floor(finalDamage);
    }

    // 🔥 НОВЫЙ МЕТОД: Базовый урон монстра (без комбо)
    calculateBaseMonsterDamage() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => 
            unit && unit.currentHealth > 0
        );
        
        if (aliveMonsters.length === 0) return 0;
        
        return aliveMonsters.reduce((sum, monster) => 
            sum + (monster.data.damage || 5), 0
        ) / aliveMonsters.length;
    }

    applyDamageToMonsters(damage, action, isCrit = false, enemyHasBlock = false) {
        const targetPosition = this.findAvailableTarget();
        if (targetPosition !== null) {
            const target = this.battleGrid.enemies[targetPosition];
            if (target && target.currentHealth > 0) {
                let finalDamage = Math.max(1, damage - (target.data.armor || 0));
                
                // Пробитие блока
                if (action === 'breakBlock' && enemyHasBlock) {
                    finalDamage = damage; // Игнорирует броню при пробитии блока
                    this.addBattleLog(`⚡ Пробитие игнорирует броню!`);
                }
                
                target.currentHealth = Math.max(0, target.currentHealth - finalDamage);
                
                const critText = isCrit ? "💥 КРИТ " : "";
                this.addBattleLog(`${critText}🎯 Вы наносите ${finalDamage} урона ${target.data.name}!`);
                
                // Вампиризм героя
                const heroStats = this.getHeroStatsForBattle();
                if (heroStats.vampirism > 0) {
                    const healAmount = Math.floor(finalDamage * heroStats.vampirism);
                    const hero = this.battleGrid.allies[5];
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
        const hero = this.battleGrid.allies[5];
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

    // 🔥 УДАЛЕН СТАРЫЙ МЕТОД: calculateMonsterDamage() - заменен на calculateMonsterDamageWithCombo()

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

    // ⭐ ПРОВЕРКА КОНЦА БОЯ С ИСПРАВЛЕНИЕМ ЗДОРОВЬЯ
    checkBattleEnd() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => unit && unit.currentHealth > 0);
        const hero = this.battleGrid.allies[5];
        
        // 🔧 ИСПРАВЛЕНИЕ: Если здоровье героя <= 0, устанавливаем его в 0
        if (hero && hero.currentHealth <= 0) {
            hero.currentHealth = 0;
        }
        
        return aliveMonsters.length === 0 || (hero && hero.currentHealth <= 0);
    }

    isPlayerVictory() {
        const hero = this.battleGrid.allies[5];
        return hero && hero.currentHealth > 0;
    }

    // ⭐ ЗАВЕРШЕНИЕ БОЯ С ИСПРАВЛЕНИЕМ ЗДОРОВЬЯ ГЕРОЯ
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
            // 🔧 ИСПРАВЛЕНИЕ: При поражении оставляем 1 HP вместо ухода в минус
            this.currentHero.currentHealth = 1;
            this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
            this.addBattleLog("💀 ПОРАЖЕНИЕ! Герой повержен. Здоровье восстановится до 1.");
            
            if (window.game && window.game.handleHeroDeath) {
                window.game.handleHeroDeath();
            }
        }
        
        // 🔧 ИСПРАВЛЕНИЕ: Синхронизируем здоровье героя
        if (this.currentHero && window.game.systems.hero) {
            this.currentHero.currentHealth = this.battleGrid.allies[5]?.currentHealth || this.currentHero.currentHealth;
            window.game.systems.hero.calculateHeroStats(this.currentHero);
        }
        
        if (window.game) window.game.saveGame();
        
        if (this.battleContext === 'movement' && window.game.systems.map) {
            window.game.systems.map.completeMovementAfterBattle(victory);
        }
        
        this.battleActive = false;
        this.showBattleResult(victory);
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
        
        if (playerAP) playerAP.textContent = `${this.players[1].ap}/∞`;
        if (enemyAP) enemyAP.textContent = `${this.players[2].ap}/∞`;
        
        // Обновление комбо с отображением множителя
        if (playerCombo) {
            if (this.players[1].combo.count > 0) {
                const action = this.players[1].combo.type;
                const count = this.players[1].combo.count;
                let multiplierText = '';
                
                if (action === 'attack') multiplierText = ` (x${this.getComboMultiplier(action, count)})`;
                else if (action === 'strongAttack') multiplierText = ` (x${this.getComboMultiplier(action, count)})`;
                else if (action === 'crushingAttack') multiplierText = ` (x${this.getComboMultiplier(action, count)})`;
                else if (action === 'breakBlock') multiplierText = ` (x${this.getBreakBlockMultiplier(count, false)})`;
                else if (action === 'block') multiplierText = ` (${this.getBlockEfficiency(count) * 100}% +${this.getBlockAPBonus(count)}ОД)`;
                else if (action === 'rest') multiplierText = ` (+${this.getRestEfficiency(count).ap}ОД)`;
                
                playerCombo.textContent = `${this.getActionName(action)} x${count}${multiplierText}`;
            } else {
                playerCombo.textContent = 'Нет';
            }
        }
            
        if (enemyCombo) {
            if (this.players[2].combo.count > 0) {
                enemyCombo.textContent = `${this.getActionName(this.players[2].combo.type)} x${this.players[2].combo.count}`;
            } else {
                enemyCombo.textContent = 'Нет';
            }
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
        return "Выберите действие - система автоматически выберет цель! Комбо растет с каждым повторением одного типа действия.";
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

// 🧠 КЛАСС УМНОГО ИИ ДЛЯ ПРОТИВНИКА
class TacticalAI {
    constructor(battleSystem) {
        this.bs = battleSystem;
        this.personality = this.analyzeMonsterGroup();
        this.memory = {
            playerPattern: [],
            lastPlayerAction: null,
            predictedNextAction: null,
            dangerLevel: 0
        };
    }
    
    // ⭐ ОСНОВНОЙ МЕТОД ПРИНЯТИЯ РЕШЕНИЙ
    decideAction() {
        const enemy = this.bs.players[2];
        const player = this.bs.players[1];
        
        // 1. АНАЛИЗ ТЕКУЩЕЙ СИТУАЦИИ
        const situation = this.analyzeSituation();
        
        // 2. ВЫБОР СТРАТЕГИИ НА ОСНОВЕ СИТУАЦИИ
        const strategy = this.chooseStrategy(situation);
        
        // 3. ВЫБОР КОНКРЕТНОГО ДЕЙСТВИЯ
        const action = this.selectAction(strategy, enemy, player);
        
        console.log(`🤖 ИИ: Стратегия=${strategy}, Действие=${action}, ОД=${enemy.ap}`);
        return action;
    }
    
    analyzeSituation() {
        const enemy = this.bs.players[2];
        const player = this.bs.players[1];
        const hero = this.bs.battleGrid.allies[5];
        const monsters = this.bs.battleGrid.enemies.filter(m => m && m.currentHealth > 0);
        
        return {
            // Состояние сторон
            heroHealthPercent: hero ? hero.currentHealth / hero.maxHealth : 0,
            monsterHealthPercent: this.getAverageMonsterHealth(),
            
            // Ресурсы
            playerAP: player.ap,
            enemyAP: enemy.ap,
            playerCombo: player.combo,
            enemyCombo: enemy.combo,
            
            // Угрозы
            playerComboThreat: this.calculatePlayerComboThreat(),
            imminentDanger: this.checkImminentDanger(),
            
            // Паттерны игрока
            playerPattern: this.analyzePlayerPattern(),
            predictedAction: this.predictPlayerAction(),
            
            // Тактические возможности
            canBreakCombo: this.canBreakPlayerCombo(),
            canForceWasteAP: this.canForcePlayerToWasteAP(),
            
            // Статистика
            turn: this.bs.battleRound,
            monstersAlive: monsters.length
        };
    }
    
    chooseStrategy(situation) {
        // 🚨 КРИТИЧЕСКИЕ СИТУАЦИИ
        if (situation.imminentDanger === 'PLAYER_WIN_NEXT_TURN') {
            return 'DESPERATE_DEFENSE';
        }
        
        if (situation.heroHealthPercent < 0.3) {
            return 'FINISHING_BLOW';
        }
        
        if (situation.monsterHealthPercent < 0.4) {
            return 'SURVIVAL';
        }
        
        // 🎪 СИТУАТИВНЫЕ СТРАТЕГИИ
        if (situation.playerComboThreat >= 8) {
            return 'COMBO_BREAKER';
        }
        
        if (situation.playerAP <= 1 && situation.enemyAP >= 2) {
            return 'AGGRESSIVE_PRESSURE';
        }
        
        if (situation.predictedAction === 'crushingAttack' && situation.enemyAP >= 2) {
            return 'PREEMPTIVE_BLOCK';
        }
        
        // 🔮 АДАПТАЦИЯ К СТИЛЮ ИГРОКА
        if (situation.playerPattern === 'AGGRESSIVE') {
            return 'COUNTER_ATTACK';
        }
        
        if (situation.playerPattern === 'DEFENSIVE') {
            return 'SUSTAINED_PRESSURE';
        }
        
        // ⚖️ СТАНДАРТНАЯ СТРАТЕГИЯ
        return 'BALANCED';
    }
    
    selectAction(strategy, enemy, player) {
        const availableActions = this.getAvailableActions(enemy.ap);
        if (availableActions.length === 0) return 'rest';
        
        let weightedActions = [];
        
        switch(strategy) {
            case 'DESPERATE_DEFENSE':
                weightedActions = this.weightActions(availableActions, { block: 90, rest: 10 });
                break;
                
            case 'FINISHING_BLOW':
                weightedActions = this.weightActions(availableActions, { 
                    strongAttack: 60, attack: 30, breakBlock: 10 
                });
                break;
                
            case 'SURVIVAL':
                weightedActions = this.weightActions(availableActions, { 
                    block: 50, rest: 40, attack: 10 
                });
                break;
                
            case 'COMBO_BREAKER':
                if (player.combo.type === 'block') {
                    weightedActions = this.weightActions(availableActions, { breakBlock: 80, attack: 20 });
                } else {
                    weightedActions = this.weightActions(availableActions, { block: 70, rest: 30 });
                }
                break;
                
            case 'AGGRESSIVE_PRESSURE':
                weightedActions = this.weightActions(availableActions, { 
                    strongAttack: 50, attack: 40, breakBlock: 10 
                });
                break;
                
            case 'PREEMPTIVE_BLOCK':
                weightedActions = this.weightActions(availableActions, { block: 85, rest: 15 });
                break;
                
            case 'COUNTER_ATTACK':
                if (player.currentAction === 'attack' && enemy.ap >= 2) {
                    weightedActions = this.weightActions(availableActions, { strongAttack: 70, block: 30 });
                } else {
                    weightedActions = this.weightActions(availableActions, { attack: 50, block: 40, rest: 10 });
                }
                break;
                
            case 'SUSTAINED_PRESSURE':
                weightedActions = this.weightActions(availableActions, { 
                    attack: 40, breakBlock: 35, rest: 25 
                });
                break;
                
            default: // BALANCED
                weightedActions = this.weightActions(availableActions, { 
                    attack: 40, block: 30, rest: 20, strongAttack: 10 
                });
        }
        
        // Применяем личность монстра
        weightedActions = this.applyPersonalityModifiers(weightedActions);
        
        return weightedActions.length > 0 ? weightedActions[0] : 'rest';
    }
    
    getAvailableActions(ap) {
        return Object.keys(this.bs.actionsCost).filter(action => 
            this.bs.actionsCost[action] <= ap
        );
    }
    
    weightActions(availableActions, weights) {
        const weighted = [];
        
        availableActions.forEach(action => {
            const weight = weights[action] || 5;
            for (let i = 0; i < weight; i++) {
                weighted.push(action);
            }
        });
        
        return weighted;
    }
    
    applyPersonalityModifiers(actions) {
        const modifiers = {
            'BERSERKER': { attack: 1.5, strongAttack: 1.3, block: 0.5, rest: 0.3 },
            'DEFENDER': { block: 2.0, rest: 1.5, attack: 0.6, strongAttack: 0.3 },
            'TACTICIAN': { breakBlock: 1.8, strongAttack: 1.2, rest: 1.1 },
            'AGGRESSIVE_SWARM': { attack: 1.4, strongAttack: 1.2, block: 0.7 },
            'ENDURANCE_PACK': { block: 1.3, rest: 1.4, attack: 0.9 },
            'STRATEGIC_GROUP': { breakBlock: 1.3, strongAttack: 1.1, block: 1.1 }
        };
        
        const modifier = modifiers[this.personality] || {};
        const weighted = [];
        
        actions.forEach(action => {
            const weight = modifier[action] || 1;
            for (let i = 0; i < weight; i++) {
                weighted.push(action);
            }
        });
        
        return weighted;
    }
    
    analyzeMonsterGroup() {
        const monsters = this.bs.currentMonsters;
        
        if (monsters.length === 1) {
            const monster = monsters[0];
            if (monster.health > 50) return 'TACTICIAN';
            if (monster.damage > 15) return 'BERSERKER';
            if (monster.armor > 8) return 'DEFENDER';
        }
        
        const totalDamage = monsters.reduce((sum, m) => sum + m.damage, 0);
        const totalHealth = monsters.reduce((sum, m) => sum + m.health, 0);
        
        if (totalDamage / monsters.length > 12) return 'AGGRESSIVE_SWARM';
        if (totalHealth / monsters.length > 40) return 'ENDURANCE_PACK';
        
        return 'STRATEGIC_GROUP';
    }
    
    getAverageMonsterHealth() {
        const monsters = this.bs.battleGrid.enemies.filter(m => m && m.currentHealth > 0);
        if (monsters.length === 0) return 0;
        
        const totalHealth = monsters.reduce((sum, m) => sum + m.currentHealth, 0);
        const totalMaxHealth = monsters.reduce((sum, m) => sum + m.maxHealth, 0);
        
        return totalHealth / totalMaxHealth;
    }
    
    calculatePlayerComboThreat() {
        const player = this.bs.players[1];
        if (!player.combo.type) return 0;
        
        const threatValues = {
            'attack': [2, 4, 8, 16],
            'strongAttack': [5, 10, 20, 40],
            'crushingAttack': [15, 30, 60, 120],
            'breakBlock': [1, 2, 3, 4],
            'block': [1, 2, 3, 4],
            'rest': [0, 0, 0, 0]
        };
        
        const threat = threatValues[player.combo.type]?.[player.combo.count - 1] || 0;
        const canExecute = player.ap >= (this.bs.actionsCost[player.combo.type] || 1);
        
        return canExecute ? threat : threat * 0.3;
    }
    
    checkImminentDanger() {
        const hero = this.bs.battleGrid.allies[5];
        const player = this.bs.players[1];
        
        if (!hero || !player.combo.type) return 'NONE';
        
        // Упрощенная проверка возможности добивания
        const playerDamage = this.bs.getHeroStatsForBattle().damage;
        const comboMultiplier = this.bs.getComboMultiplier(player.combo.type, player.combo.count);
        const potentialDamage = playerDamage * comboMultiplier;
        
        if (potentialDamage >= hero.currentHealth && player.ap >= this.bs.actionsCost[player.combo.type]) {
            return 'PLAYER_WIN_NEXT_TURN';
        }
        
        if (player.combo.count >= 3 && player.ap >= 3) {
            return 'HIGH_COMBO_THREAT';
        }
        
        return 'NONE';
    }
    
    analyzePlayerPattern() {
        const actions = this.bs.players[1].previousActions;
        if (actions.length < 2) return 'UNKNOWN';
        
        const attackCount = actions.filter(a => a.includes('атака')).length;
        const defenseCount = actions.filter(a => a === 'Блок' || a === 'Отдых').length;
        
        if (attackCount / actions.length > 0.7) return 'AGGRESSIVE';
        if (defenseCount / actions.length > 0.6) return 'DEFENSIVE';
        
        return 'ADAPTIVE';
    }
    
    predictPlayerAction() {
        const player = this.bs.players[1];
        const history = player.previousActions;
        
        if (history.length < 2) return null;
        
        const lastAction = this.getActionFromName(history[0]);
        const secondLastAction = this.getActionFromName(history[1]);
        
        if (lastAction === secondLastAction && ['attack', 'strongAttack', 'crushingAttack'].includes(lastAction)) {
            return lastAction;
        }
        
        if (lastAction === 'block' && ['attack', 'strongAttack', 'crushingAttack'].includes(secondLastAction)) {
            return secondLastAction;
        }
        
        if (lastAction === 'rest' && player.ap <= 2) {
            return 'strongAttack';
        }
        
        return null;
    }
    
    getActionFromName(actionName) {
        const names = {
            'Атака': 'attack',
            'Силовая атака': 'strongAttack',
            'Сокрушительная атака': 'crushingAttack',
            'Блок': 'block',
            'Пробитие': 'breakBlock',
            'Отдых': 'rest'
        };
        
        return names[actionName] || null;
    }
    
    canBreakPlayerCombo() {
        const player = this.bs.players[1];
        return player.combo.count >= 2 && player.combo.type !== 'rest';
    }
    
    canForcePlayerToWasteAP() {
        const player = this.bs.players[1];
        return player.ap <= 2 && this.bs.players[2].ap >= 2;
    }
}

window.BattleSystem = BattleSystem;
console.log("📦 BattleSystem полностью переписан с умным ИИ, прогрессией комбо для монстров и исправлением здоровья героя");
