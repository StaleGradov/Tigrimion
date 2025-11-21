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
        
        // ⭐ НОВОЕ: Система тактической дуэли
        this.duelActive = false;
        this.duelState = null;
        this.useTacticalDuelForAll = true; // Включить дуэль для всех боев
        
        this.battleGrid = {
            allies: [null, null, null, null, null, null],
            enemies: [null, null, null, null, null, null]
        };
        this.selectedTarget = null;
        this.availableTargets = [];
        
        this.resultShown = false;
        this.battleEnding = false;
        
        console.log("✅ BattleSystem инициализирован с системой дуэли");
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

    // ⭐ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Получаем актуальные статы из HeroSystem
    getHeroStatsForBattle() {
        if (!this.currentHero || !window.game.systems.hero) {
            console.error("❌ Герой или HeroSystem не доступен");
            return { currentHealth: 0, maxHealth: 0, damage: 0, armor: 0 };
        }
        
        return window.game.systems.hero.calculateHeroStats(this.currentHero);
    }

    // ⭐ ОСНОВНОЙ МЕТОД: Запуск любого боя через тактическую дуэль
    startBattleWithMonster(hero, monsterId, context = 'normal') {
        if (!hero) {
            console.error("❌ Не могу начать бой: герой не передан");
            return;
        }

        const monster = this.getMonsterById(monsterId);
        if (!monster) {
            console.error("❌ Монстр не найден:", monsterId);
            return;
        }

        // ⭐ ВСЕГДА используем тактическую дуэль
        this.startTacticalDuel(hero, monster, context);
    }

    // ⭐ НОВЫЙ МЕТОД: Запуск тактической дуэли
    startTacticalDuel(hero, monster, context = 'normal') {
        if (!hero || !monster) {
            console.error("❌ Не могу начать дуэль: герой или монстр не передан");
            return;
        }

        this.currentHero = hero;
        this.currentMonsters = [monster];
        this.battleContext = context;
        this.duelActive = true;
        
        // ⭐ СБРАСЫВАЕМ ФЛАГИ ПРИ НАЧАЛЕ НОВОГО БОЯ
        this.resultShown = false;
        this.battleEnding = false;

        // Инициализация состояния дуэли
        this.duelState = {
            currentTurn: 'hero',
            players: {
                hero: { 
                    name: hero.name,
                    health: 100, 
                    maxHealth: 100,
                    ap: 3, 
                    currentAction: null,
                    combo: { type: null, count: 0 },
                    previousActions: [],
                    stats: this.getHeroStatsForBattle() // Сохраняем статы героя
                },
                enemy: { 
                    name: monster.name,
                    health: 100, 
                    maxHealth: 100,
                    ap: 3, 
                    currentAction: null,
                    combo: { type: null, count: 0 },
                    previousActions: [],
                    monsterData: monster // Сохраняем данные монстра
                }
            },
            actionsCost: {
                attack: 1,
                strongAttack: 2,
                crushingAttack: 4,
                block: 1,
                breakBlock: 1,
                rest: 1
            },
            bothPlayersReady: false,
            round: 0
        };

        this.battleLog = [];
        this.battleRound = 0;

        console.log(`⚔️ Начинаем тактическую дуэль с ${monster.name}`);
        this.showTacticalDuelScreen();
    }

    // ⭐ НОВЫЙ МЕТОД: Показать экран тактической дуэли
    showTacticalDuelScreen() {
        const app = document.getElementById('app');
        if (!app) return;

        const duel = this.duelState;

        app.innerHTML = `
            <div class="battle-screen-fullscreen">
                <header class="battle-header">
                    <div class="header-left">
                        <h2>⚔️ ТАКТИЧЕСКАЯ ДУЭЛЬ</h2>
                        <div class="battle-round">Раунд: ${duel.round}</div>
                    </div>
                    <button class="btn-battle-back" onclick="game.systems.battle.returnToGame()">
                        ← Назад к карте
                    </button>
                </header>
                
                <div class="duel-integration">
                    <!-- Левая панель - действия героя -->
                    <div class="duel-actions-left">
                        <div class="duel-header">${duel.players.hero.name}</div>
                        <div class="health-bar-fullscreen">
                            <div class="health-fill" style="width: ${(duel.players.hero.health / duel.players.hero.maxHealth) * 100}%"></div>
                            <div class="health-text">${Math.ceil(duel.players.hero.health)}/${duel.players.hero.maxHealth}</div>
                        </div>
                        
                        <div class="ap-counter">Очки действий: ${duel.players.hero.ap}</div>
                        
                        <div class="combo-display">
                            ${duel.players.hero.combo.count > 0 ? 
                                `Комбо: ${this.getActionName(duel.players.hero.combo.type)} x${duel.players.hero.combo.count}` : 
                                'Комбо: Нет'}
                        </div>
                        
                        <div class="previous-action">
                            ${duel.players.hero.previousActions.length > 0 ? 
                                `Предыдущее: ${this.getActionName(duel.players.hero.previousActions[duel.players.hero.previousActions.length - 1])}` : 
                                'Предыдущее: -'}
                        </div>

                        ${duel.currentTurn === 'hero' && !duel.bothPlayersReady ? `
                            <div class="duel-actions">
                                <button class="duel-action-btn attack" onclick="game.systems.battle.duelAction('attack')" 
                                    ${duel.players.hero.ap < 1 ? 'disabled' : ''}>⚔️ Атака (1 ОД)</button>
                                <button class="duel-action-btn strong-attack" onclick="game.systems.battle.duelAction('strongAttack')" 
                                    ${duel.players.hero.ap < 2 ? 'disabled' : ''}>💥 Силовая (2 ОД)</button>
                                <button class="duel-action-btn crushing-attack" onclick="game.systems.battle.duelAction('crushingAttack')" 
                                    ${duel.players.hero.ap < 4 ? 'disabled' : ''}>💢 Сокрушительная (4 ОД)</button>
                                <button class="duel-action-btn block" onclick="game.systems.battle.duelAction('block')" 
                                    ${duel.players.hero.ap < 1 ? 'disabled' : ''}>🛡️ Блок (1 ОД)</button>
                                <button class="duel-action-btn break-block" onclick="game.systems.battle.duelAction('breakBlock')" 
                                    ${duel.players.hero.ap < 1 ? 'disabled' : ''}>⚡ Пробитие (1 ОД)</button>
                                <button class="duel-action-btn rest" onclick="game.systems.battle.duelAction('rest')" 
                                    ${duel.players.hero.ap < 1 ? 'disabled' : ''}>🌀 Отдых (1 ОД)</button>
                            </div>
                        ` : `
                            <div class="duel-turn-indicator">
                                ${duel.bothPlayersReady ? 'Ожидание результата...' : 'Ожидание хода противника...'}
                            </div>
                        `}
                    </div>

                    <!-- Центральная область с индикатором хода -->
                    <div style="flex: 0.5; display: flex; align-items: center; justify-content: center;">
                        ${duel.bothPlayersReady ? `
                            <button class="duel-resolve-btn" onclick="game.systems.battle.resolveDuelTurn()">
                                Показать результат
                            </button>
                        ` : `
                            <div class="duel-turn-indicator">
                                ${duel.currentTurn === 'hero' ? 'Ваш ход!' : 'Ход противника'}
                            </div>
                        `}
                    </div>

                    <!-- Правая панель - действия противника -->
                    <div class="duel-actions-right">
                        <div class="duel-header">${duel.players.enemy.name}</div>
                        <div class="health-bar-fullscreen">
                            <div class="health-fill" style="width: ${(duel.players.enemy.health / duel.players.enemy.maxHealth) * 100}%"></div>
                            <div class="health-text">${Math.ceil(duel.players.enemy.health)}/${duel.players.enemy.maxHealth}</div>
                        </div>
                        
                        <div class="ap-counter">Очки действий: ${duel.players.enemy.ap}</div>
                        
                        <div class="combo-display">
                            ${duel.players.enemy.combo.count > 0 ? 
                                `Комбо: ${this.getActionName(duel.players.enemy.combo.type)} x${duel.players.enemy.combo.count}` : 
                                'Комбо: Нет'}
                        </div>
                        
                        <div class="previous-action">
                            ${duel.players.enemy.previousActions.length > 0 ? 
                                `Предыдущее: ${this.getActionName(duel.players.enemy.previousActions[duel.players.enemy.previousActions.length - 1])}` : 
                                'Предыдущее: -'}
                        </div>

                        <div class="duel-turn-indicator">
                            ${duel.currentTurn === 'enemy' && !duel.bothPlayersReady ? 'Противник думает...' : 
                              duel.bothPlayersReady ? 'Готов к разрешению' : 'Ожидание своей очереди'}
                        </div>
                    </div>
                </div>
                
                <div class="duel-log" id="duelLogEntries">
                    ${this.battleLog.map(entry => `<div class="log-entry ${entry.type || 'system'}-log">${entry.message}</div>`).join('')}
                </div>
                
                <!-- Кнопка побега -->
                <div class="battle-controls-fullscreen">
                    <button class="btn-battle-flee" onclick="game.systems.battle.tryToFleeDuel()">
                        🏃 Попытаться сбежать
                    </button>
                </div>
            </div>
        `;
    }

    // ⭐ НОВЫЙ МЕТОД: Обработка действия в дуэли
    duelAction(action) {
        if (!this.duelActive || this.duelState.bothPlayersReady) return;

        const player = this.duelState.players.hero;
        const cost = this.duelState.actionsCost[action];

        if (player.ap < cost) {
            this.addDuelLog("Недостаточно очков действий!", 'system');
            return;
        }

        // Списание ОД
        player.ap -= cost;

        // Обновление комбо
        if (player.combo.type === action && player.combo.count < 4) {
            player.combo.count++;
        } else {
            player.combo.type = action;
            player.combo.count = 1;
        }

        // Сохранение действия
        player.currentAction = action;
        player.previousActions.push(action);
        if (player.previousActions.length > 3) {
            player.previousActions.shift();
        }

        this.addDuelLog(`${player.name} выбирает ${this.getActionName(action)}`, 'hero');

        // Переход хода к противнику
        this.duelState.currentTurn = 'enemy';
        this.duelState.bothPlayersReady = false;

        // Ход ИИ
        setTimeout(() => this.makeEnemyMove(), 1000);
        this.showTacticalDuelScreen();
    }

    // ⭐ НОВЫЙ МЕТОД: Логика ИИ для противника
    makeEnemyMove() {
        if (!this.duelActive || this.duelState.bothPlayersReady) return;

        const enemy = this.duelState.players.enemy;
        const hero = this.duelState.players.hero;

        let action;

        // Простая стратегия ИИ
        if (enemy.health < 30 && enemy.ap >= 1) {
            action = 'rest';
        } else if (hero.combo.type && (hero.combo.type === 'attack' || hero.combo.type === 'strongAttack') && 
                  hero.combo.count >= 2 && enemy.ap >= 1) {
            action = 'block';
        } else if (enemy.ap >= 4 && Math.random() > 0.6) {
            action = 'crushingAttack';
        } else if (enemy.ap >= 2 && (enemy.combo.type === 'strongAttack' || enemy.combo.type === 'attack')) {
            action = enemy.combo.type;
        } else if (enemy.combo.type && enemy.ap >= this.duelState.actionsCost[enemy.combo.type]) {
            action = enemy.combo.type;
        } else {
            const availableActions = Object.keys(this.duelState.actionsCost).filter(a => 
                this.duelState.actionsCost[a] <= enemy.ap
            );
            action = availableActions[Math.floor(Math.random() * availableActions.length)] || 'rest';
        }

        // Выполнение действия
        const cost = this.duelState.actionsCost[action];
        enemy.ap -= cost;

        // Обновление комбо
        if (enemy.combo.type === action && enemy.combo.count < 4) {
            enemy.combo.count++;
        } else {
            enemy.combo.type = action;
            enemy.combo.count = 1;
        }

        enemy.currentAction = action;
        enemy.previousActions.push(action);
        if (enemy.previousActions.length > 3) {
            enemy.previousActions.shift();
        }

        this.addDuelLog(`${enemy.name} выбирает ${this.getActionName(action)}`, 'enemy');

        // Оба игрока сделали ход
        this.duelState.bothPlayersReady = true;
        this.duelState.round++;
        this.showTacticalDuelScreen();
    }

    // ⭐ НОВЫЙ МЕТОД: Разрешение хода дуэли
    resolveDuelTurn() {
        const duel = this.duelState;
        const action1 = duel.players.hero.currentAction;
        const action2 = duel.players.enemy.currentAction;
        const combo1 = duel.players.hero.combo.count;
        const combo2 = duel.players.enemy.combo.count;

        this.addDuelLog(`--- РАЗРЕШЕНИЕ ХОДА ${duel.round} ---`, 'system');

        let damageToEnemy = 0;
        let damageToHero = 0;
        let heroHeal = 0;
        let enemyHeal = 0;
        let heroAPBonus = 0;
        let enemyAPBonus = 0;

        // Логика взаимодействия действий
        if (action1 === 'attack') {
            if (action2 === 'block') {
                const blockEffect = [0.5, 0.25, 0, 0][Math.min(combo2 - 1, 3)];
                damageToEnemy = this.calculateComboDamage('attack', combo1) * blockEffect;
                this.addDuelLog(`Блок ${duel.players.enemy.name} уменьшил урон на ${(1-blockEffect)*100}%`, 'system');
            } else {
                damageToEnemy = this.calculateComboDamage('attack', combo1);
            }
        }

        if (action2 === 'attack') {
            if (action1 === 'block') {
                const blockEffect = [0.5, 0.25, 0, 0][Math.min(combo1 - 1, 3)];
                damageToHero = this.calculateComboDamage('attack', combo2) * blockEffect;
                this.addDuelLog(`Блок ${duel.players.hero.name} уменьшил урон на ${(1-blockEffect)*100}%`, 'system');
            } else {
                damageToHero = this.calculateComboDamage('attack', combo2);
            }
        }

        if (action1 === 'strongAttack') {
            damageToEnemy = this.calculateComboDamage('strongAttack', combo1);
            this.addDuelLog(`${duel.players.hero.name} наносит ${damageToEnemy} урона!`, 'hero');
        }

        if (action2 === 'strongAttack') {
            damageToHero = this.calculateComboDamage('strongAttack', combo2);
            this.addDuelLog(`${duel.players.enemy.name} наносит ${damageToHero} урона!`, 'enemy');
        }

        if (action1 === 'crushingAttack') {
            damageToEnemy = this.calculateComboDamage('crushingAttack', combo1);
            this.addDuelLog(`💢 ${duel.players.hero.name} наносит Сокрушительный удар ${damageToEnemy}!`, 'hero');
        }

        if (action2 === 'crushingAttack') {
            damageToHero = this.calculateComboDamage('crushingAttack', combo2);
            this.addDuelLog(`💢 ${duel.players.enemy.name} наносит Сокрушительный удар ${damageToHero}!`, 'enemy');
        }

        if (action1 === 'breakBlock') {
            const isAgainstBlock = action2 === 'block';
            damageToEnemy = this.calculateComboDamage('breakBlock', combo1, isAgainstBlock);
            if (isAgainstBlock) {
                this.addDuelLog(`Пробитие пробивает блок! Урон: ${damageToEnemy}`, 'hero');
            } else {
                this.addDuelLog(`Пробитие наносит ${damageToEnemy} урона`, 'hero');
            }
        }

        if (action2 === 'breakBlock') {
            const isAgainstBlock = action1 === 'block';
            damageToHero = this.calculateComboDamage('breakBlock', combo2, isAgainstBlock);
            if (isAgainstBlock) {
                this.addDuelLog(`Пробитие пробивает блок! Урон: ${damageToHero}`, 'enemy');
            } else {
                this.addDuelLog(`Пробитие наносит ${damageToHero} урона`, 'enemy');
            }
        }

        // Обработка отдыха
        if (action1 === 'rest') {
            heroHeal = [5, 10, 15, 20][Math.min(combo1 - 1, 3)];
            heroAPBonus = [1, 2, 3, 4][Math.min(combo1 - 1, 3)];
            duel.players.hero.health = Math.min(duel.players.hero.maxHealth, duel.players.hero.health + heroHeal);
            this.addDuelLog(`${duel.players.hero.name} восстанавливает ${heroHeal} здоровья`, 'hero');
        }

        if (action2 === 'rest') {
            enemyHeal = [5, 10, 15, 20][Math.min(combo2 - 1, 3)];
            enemyAPBonus = [1, 2, 3, 4][Math.min(combo2 - 1, 3)];
            duel.players.enemy.health = Math.min(duel.players.enemy.maxHealth, duel.players.enemy.health + enemyHeal);
            this.addDuelLog(`${duel.players.enemy.name} восстанавливает здоровье`, 'enemy');
        }

        // Бонусы за блок
        if (action1 === 'block') {
            heroAPBonus = [1, 2, 3, 4][Math.min(combo1 - 1, 3)];
            this.addDuelLog(`${duel.players.hero.name} получает +${heroAPBonus} ОД за блок`, 'hero');
        }

        if (action2 === 'block') {
            enemyAPBonus = [1, 2, 3, 4][Math.min(combo2 - 1, 3)];
            this.addDuelLog(`${duel.players.enemy.name} получает +${enemyAPBonus} ОД за блок`, 'enemy');
        }

        // Применение урона
        duel.players.enemy.health = Math.max(0, duel.players.enemy.health - damageToEnemy);
        duel.players.hero.health = Math.max(0, duel.players.hero.health - damageToHero);

        // Применение бонусов ОД
        duel.players.hero.ap += heroAPBonus;
        duel.players.enemy.ap += enemyAPBonus;

        // Восстановление ОД в начале хода
        duel.players.hero.ap += 1;
        duel.players.enemy.ap += 1;

        // Сброс действий
        duel.players.hero.currentAction = null;
        duel.players.enemy.currentAction = null;
        duel.bothPlayersReady = false;
        duel.currentTurn = 'hero';

        // Проверка окончания дуэли
        if (duel.players.hero.health <= 0 || duel.players.enemy.health <= 0) {
            this.endTacticalDuel();
            return;
        }

        this.showTacticalDuelScreen();
    }

    // ⭐ НОВЫЙ МЕТОД: Завершение дуэли
    endTacticalDuel() {
        const duel = this.duelState;
        const victory = duel.players.enemy.health <= 0;

        // ⭐ ЗАЩИТА: Если результат уже показан, выходим
        if (this.resultShown) {
            console.log("🛑 Результат дуэли уже показан, игнорируем");
            return;
        }
        
        this.resultShown = true;

        if (victory) {
            const totalReward = this.currentMonsters.reduce((sum, monster) => sum + (monster.reward || 10), 0);
            const totalExperience = this.currentMonsters.reduce((sum, monster) => sum + (monster.experience || 5), 0);
            
            this.currentHero.gold += totalReward;
            window.game.systems.level.addExperience(this.currentHero, totalExperience);
            this.currentHero.monstersKilled = (this.currentHero.monstersKilled || 0) + this.currentMonsters.length;
            
            this.addDuelLog(`🎉 ПОБЕДА! +${totalReward} золота, +${totalExperience} опыта`, 'system');
        } else {
            // ⭐ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Устанавливаем здоровье в 1 и запускаем специальную регенерацию
            this.currentHero.currentHealth = 1;
            this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
            this.addDuelLog("💀 ПОРАЖЕНИЕ! Герой повержен. Здоровье восстановится до 1 и начнет регенерировать.", 'system');
            
            // ⭐ ЗАПУСКАЕМ СПЕЦИАЛЬНУЮ РЕГЕНЕРАЦИЮ ПОСЛЕ СМЕРТИ
            if (window.game && window.game.handleHeroDeath) {
                window.game.handleHeroDeath();
            }
        }
        
        // ⭐ ВАЖНОЕ ИСПРАВЛЕНИЕ: Обновляем здоровье героя в основной системе
        if (this.currentHero && window.game.systems.hero) {
            // Синхронизируем здоровье
            this.currentHero.currentHealth = Math.max(1, this.currentHero.currentHealth);
            
            // ⭐ ОБНОВЛЯЕМ ИНТЕРФЕЙС СРАЗУ
            window.game.systems.hero.calculateHeroStats(this.currentHero);
        }
        
        if (window.game) window.game.saveGame();
        
        if (this.battleContext === 'movement' && window.game.systems.map) {
            window.game.systems.map.completeMovementAfterBattle(victory);
        }
        
        this.duelActive = false;
        
        // Показать результат и вернуться в игру
        setTimeout(() => {
            this.showDuelResult(victory);
        }, 2000);
    }

    // ⭐ НОВЫЙ МЕТОД: Показать результат дуэли
    showDuelResult(victory) {
        this.showBattleResult(victory, false);
    }

    // ⭐ НОВЫЙ МЕТОД: Попытка сбежать из дуэли
    tryToFleeDuel() {
        const fleeChance = 0.4;
        
        if (Math.random() < fleeChance) {
            this.addDuelLog("🏃 Вам удалось сбежать с поля боя!", 'system');
            this.endTacticalDuel(false, true);
        } else {
            this.addDuelLog("❌ Попытка сбежать не удалась! Противник атакует.", 'system');
            // Противник автоматически атакует
            this.duelState.players.enemy.currentAction = 'attack';
            this.duelState.bothPlayersReady = true;
            this.resolveDuelTurn();
        }
    }

    // ⭐ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ ДУЭЛИ
    getActionName(action) {
        const names = {
            attack: 'Атака',
            strongAttack: 'Силовая',
            crushingAttack: 'Сокрушительная',
            block: 'Блок',
            breakBlock: 'Пробитие',
            rest: 'Отдых'
        };
        return names[action] || action;
    }

    calculateComboDamage(action, comboCount, isAgainstBlock = false) {
        const baseDamage = {
            attack: 10,
            strongAttack: 25,
            crushingAttack: 75,
            breakBlock: isAgainstBlock ? 20 : 5
        };
        
        const multipliers = {
            attack: [1, 2, 4, 8],
            strongAttack: [1, 2, 4, 8],
            crushingAttack: [1, 2, 4, 8],
            breakBlock: [1, 1.5, 2, 2.5]
        };
        
        const comboIndex = Math.min(comboCount - 1, 3);
        return Math.floor(baseDamage[action] * multipliers[action][comboIndex]);
    }

    addDuelLog(message, type = 'system') {
        this.battleLog.push({ message, type });
        if (this.battleLog.length > 8) this.battleLog.shift();
        
        const logContainer = document.getElementById('duelLogEntries');
        if (logContainer) {
            logContainer.innerHTML = this.battleLog.map(entry => 
                `<div class="log-entry ${entry.type}-log">${entry.message}</div>`
            ).join('');
            logContainer.scrollTop = logContainer.scrollHeight;
        }
    }

    // ========== СОВМЕСТИМОСТЬ С СУЩЕСТВУЮЩЕЙ СИСТЕМОЙ ==========

    // ⭐ ИСПРАВЛЕНИЕ: Принимаем heroStats для правильной инициализации
    setupBattleGrid(hero, monsters, heroStats = null) {
        this.battleGrid.allies = [null, null, null, null, null, null];
        this.battleGrid.enemies = [null, null, null, null, null, null];
        
        // ⭐ ИСПРАВЛЕНИЕ: Используем актуальные статы вместо базовых
        if (!heroStats) {
            heroStats = this.getHeroStatsForBattle();
        }
        
        this.battleGrid.allies[0] = {
            type: 'hero',
            data: hero,
            position: 0,
            maxHealth: heroStats.maxHealth, // ⭐ ИСПРАВЛЕНО: Используем maxHealth из HeroSystem
            currentHealth: heroStats.currentHealth // ⭐ ИСПРАВЛЕНО: Используем currentHealth из HeroSystem
        };

        this.placeMonstersOnGrid(monsters);
        this.updateAvailableTargets();
    }

    placeMonstersOnGrid(monsters) {
        const meleePositions = [0, 2, 4];
        const rangedPositions = [1, 3, 5];
        
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
    }

    // ⭐ СУЩЕСТВУЮЩИЕ МЕТОДЫ ДЛЯ СОВМЕСТИМОСТИ
    showFullscreenBattle() {
        // Теперь всегда используем тактическую дуэль
        if (this.currentMonsters.length > 0 && this.currentHero) {
            this.startTacticalDuel(this.currentHero, this.currentMonsters[0], this.battleContext);
        }
    }

    showTacticalBattleScreen() {
        this.showFullscreenBattle();
    }

    returnToGame() {
        // ⭐ СБРАСЫВАЕМ ФЛАГИ ПРИ ВОЗВРАТЕ В ИГРУ
        this.resultShown = false;
        this.battleEnding = false;
        this.duelActive = false;
        
        if (this.battleContext === 'movement' && window.game && window.game.systems.map) {
            window.game.showHeroGameScreen();
            setTimeout(() => window.game.systems.map.showOverlay('tactical-map'), 100);
        } else if (window.game) {
            window.game.showHeroGameScreen();
        }
        
        this.battleActive = false;
        this.currentMonsters = [];
    }

    // ⭐ СУЩЕСТВУЮЩИЕ МЕТОДЫ ДЛЯ СОВМЕСТИМОСТИ
    addBattleLog(message) {
        this.addDuelLog(message, 'system');
    }

    updateBattleLog() {
        // Уже реализовано в addDuelLog
    }

    showBattleScreen() {
        this.showTacticalDuelScreen();
    }

    // ⭐ МЕТОД ДЛЯ БОЯ С МНОЖЕСТВОМ ВРАГОВ (будущая реализация)
    startGroupBattle(hero, monsters, context = 'normal') {
        // Пока используем дуэль с первым монстром
        if (monsters.length > 0) {
            this.startTacticalDuel(hero, monsters[0], context);
        }
    }
}

window.BattleSystem = BattleSystem;
console.log("📦 BattleSystem модуль загружен с тактической дуэлью для всех боев");
