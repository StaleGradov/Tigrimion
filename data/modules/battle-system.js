"use strict";

class EnhancedBattleSystem {
    constructor() {
        // Наследуем базовую функциональность
        this.battleSystem = new BattleSystem();
        
        // Переменные для тактической системы
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
        
        this.bothPlayersReady = false;
        this.resultShown = false;
        this.battleEnding = false;
        
        console.log("✅ EnhancedBattleSystem инициализирован");
    }

    // ⭐ ОСНОВНОЙ МЕТОД ИНТЕГРАЦИИ
    startTacticalBattle(hero, monsters, context = 'normal') {
        if (!hero) {
            console.error("❌ Не могу начать бой: герой не передан");
            return;
        }

        // Сбрасываем флаги
        this.resultShown = false;
        this.battleEnding = false;

        // Используем существующую логику для настройки боя
        this.battleSystem.currentHero = hero;
        this.battleSystem.currentMonsters = monsters;
        this.battleSystem.battleActive = true;
        this.battleSystem.battleRound = 0;
        this.battleSystem.battleLog = [];
        this.battleSystem.battleContext = context;

        // Настраиваем сетку с героем на позиции 4
        const heroStats = this.battleSystem.getHeroStatsForBattle();
        this.setupTacticalGrid(hero, monsters, heroStats);
        
        console.log(`⚔️ Начинаем тактический бой с ${monsters.length} монстрами`);
        this.showTacticalBattleInterface();
    }

    // ⭐ НАСТРОЙКА СЕТКИ С ТАКТИЧЕСКИМИ ПАНЕЛЯМИ
    setupTacticalGrid(hero, monsters, heroStats) {
        // Используем существующую логику размещения
        this.battleSystem.setupBattleGrid(hero, monsters, heroStats);
        
        // Дополнительно: гарантируем что герой на позиции 4
        this.placeHeroOnPosition4(hero, heroStats);
    }

    placeHeroOnPosition4(hero, heroStats) {
        // Очищаем позицию 4 и ставим героя
        this.battleSystem.battleGrid.allies[4] = {
            type: 'hero',
            data: hero,
            position: 4,
            maxHealth: heroStats.maxHealth,
            currentHealth: heroStats.currentHealth
        };
    }

    // ⭐ ГЛАВНЫЙ ИНТЕРФЕЙС ТАКТИЧЕСКОГО БОЯ
    showTacticalBattleInterface() {
        const app = document.getElementById('app');
        if (!app) return;

        const heroStats = this.battleSystem.getHeroStatsForBattle();
        
        app.innerHTML = `
            <div class="battle-screen-fullscreen">
                <header class="battle-header">
                    <div class="header-left">
                        <h2>⚔️ ТАКТИЧЕСКАЯ ДУЭЛЬ</h2>
                        <div class="battle-round">Раунд: ${this.battleSystem.battleRound}</div>
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
                            <button class="tactical-btn attack" data-action="attack" onclick="game.systems.battle.tacticalSystem.handlePlayerAction('attack')">
                                <span class="btn-icon">⚔️</span>
                                <span class="btn-text">Атака</span>
                                <span class="btn-cost">(1 ОД)</span>
                            </button>
                            
                            <button class="tactical-btn strong-attack" data-action="strongAttack" onclick="game.systems.battle.tacticalSystem.handlePlayerAction('strongAttack')">
                                <span class="btn-icon">💥</span>
                                <span class="btn-text">Силовая</span>
                                <span class="btn-cost">(2 ОД)</span>
                            </button>
                            
                            <button class="tactical-btn crushing-attack" data-action="crushingAttack" onclick="game.systems.battle.tacticalSystem.handlePlayerAction('crushingAttack')">
                                <span class="btn-icon">💢</span>
                                <span class="btn-text">Сокрушительная</span>
                                <span class="btn-cost">(4 ОД)</span>
                            </button>
                            
                            <button class="tactical-btn block" data-action="block" onclick="game.systems.battle.tacticalSystem.handlePlayerAction('block')">
                                <span class="btn-icon">🛡️</span>
                                <span class="btn-text">Блок</span>
                                <span class="btn-cost">(1 ОД)</span>
                            </button>
                            
                            <button class="tactical-btn break-block" data-action="breakBlock" onclick="game.systems.battle.tacticalSystem.handlePlayerAction('breakBlock')">
                                <span class="btn-icon">⚡</span>
                                <span class="btn-text">Пробитие</span>
                                <span class="btn-cost">(1 ОД)</span>
                            </button>
                            
                            <button class="tactical-btn rest" data-action="rest" onclick="game.systems.battle.tacticalSystem.handlePlayerAction('rest')">
                                <span class="btn-icon">🌀</span>
                                <span class="btn-text">Отдых</span>
                                <span class="btn-cost">(1 ОД)</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- ЦЕНТР - СЕТКА 6x6 -->
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
                            <div class="preview-title">Возможные действия противника:</div>
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
                        <button class="btn-battle-flee" onclick="game.systems.battle.tacticalSystem.tryToFlee()">
                            🏃 Попытаться сбежать
                        </button>
                    </div>
                </div>
                
                <div class="battle-log-fullscreen">
                    <h4>📜 Ход боя:</h4>
                    <div class="battle-log-entries" id="battleLogEntries">
                        ${this.battleSystem.battleLog.map(entry => `<div class="log-entry">${entry}</div>`).join('')}
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
        
        // Автоматический ход монстров (ИИ)
        this.executeEnemyTurn();
        
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
            enemy.ap += 1; // +1 ОД за отдых
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
        
        this.addBattleLog(`--- РАЗРЕШЕНИЕ ХОДА ---`);
        
        // Здесь будет сложная логика взаимодействия действий
        // Пока упрощенная версия:
        this.executeTacticalDamage(playerAction, enemyAction);
        
        // Сброс действий и восстановление ОД
        this.players[1].currentAction = null;
        this.players[2].currentAction = null;
        this.players[1].ap = Math.min(3, this.players[1].ap + 1);
        this.players[2].ap = Math.min(3, this.players[2].ap + 1);
        
        this.updateTacticalUI();
        
        // Проверка конца боя
        if (this.checkBattleEnd()) {
            this.endTacticalBattle();
        }
    }

    // ⭐ ВЫПОЛНЕНИЕ УРОНА С ИНТЕГРАЦИЕЙ ВАШИХ СТАТОВ
    executeTacticalDamage(playerAction, enemyAction) {
        const heroStats = this.battleSystem.getHeroStatsForBattle();
        const hero = this.battleSystem.battleGrid.allies[4];
        
        // Базовый урон героя из вашей системы
        const baseHeroDamage = heroStats.damage;
        
        // Множители атак из моей системы
        const damageMultipliers = {
            attack: 1.0,
            strongAttack: 2.5, 
            crushingAttack: 7.5,
            breakBlock: 0.5
        };
        
        // Расчет урона игрока
        if (playerAction && damageMultipliers[playerAction]) {
            const rawDamage = baseHeroDamage * damageMultipliers[playerAction];
            const comboMultiplier = 1 + (this.players[1].combo.count * 0.1);
            const finalDamage = Math.floor(rawDamage * comboMultiplier);
            
            // Применение урона к монстрам
            this.applyDamageToMonsters(finalDamage, playerAction);
        }
        
        // Расчет урона противника (упрощенно)
        if (enemyAction === 'attack') {
            const monsterDamage = this.calculateMonsterDamage();
            const finalDamage = Math.max(1, monsterDamage - heroStats.armor);
            
            hero.currentHealth -= finalDamage;
            this.addBattleLog(`👹 Монстры атакуют и наносят ${finalDamage} урона!`);
        }
    }

    applyDamageToMonsters(damage, action) {
        // Логика выбора цели и применения урона
        const targetPosition = this.findAvailableTarget();
        if (targetPosition !== null) {
            const target = this.battleSystem.battleGrid.enemies[targetPosition];
            if (target && target.currentHealth > 0) {
                const finalDamage = Math.max(1, damage - (target.data.armor || 0));
                target.currentHealth -= finalDamage;
                
                this.addBattleLog(`🎯 Вы наносите ${finalDamage} урона ${target.data.name}!`);
                
                if (target.currentHealth <= 0) {
                    target.currentHealth = 0;
                    this.addBattleLog(`💀 ${target.data.name} повержен!`);
                }
            }
        }
    }

    // ⭐ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    findAvailableTarget() {
        const hero = this.battleSystem.battleGrid.allies[4];
        const attackType = this.battleSystem.getHeroAttackType(hero.data);
        
        let availablePositions = [];
        
        if (attackType === 'ranged') {
            // Дальний бой - все позиции
            availablePositions = [0, 1, 2, 3, 4, 5];
        } else {
            // Ближний бой - сначала ближние (0,2,4), потом дальние
            availablePositions = [0, 2, 4].filter(pos => {
                const unit = this.battleSystem.battleGrid.enemies[pos];
                return unit && unit.currentHealth > 0;
            });
            
            if (availablePositions.length === 0) {
                availablePositions = [1, 3, 5].filter(pos => {
                    const unit = this.battleSystem.battleGrid.enemies[pos];
                    return unit && unit.currentHealth > 0;
                });
            }
        }
        
        return availablePositions.length > 0 ? availablePositions[0] : null;
    }

    calculateMonsterDamage() {
        // Упрощенный расчет урона монстров
        const aliveMonsters = this.battleSystem.battleGrid.enemies.filter(unit => 
            unit && unit.currentHealth > 0
        );
        
        if (aliveMonsters.length === 0) return 0;
        
        const totalDamage = aliveMonsters.reduce((sum, monster) => 
            sum + (monster.data.damage || 5), 0
        );
        
        return Math.floor(totalDamage / aliveMonsters.length);
    }

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
        document.getElementById('playerAP').textContent = `${this.players[1].ap}/3`;
        document.getElementById('enemyAP').textContent = `${this.players[2].ap}/3`;
        
        // Обновление комбо
        document.getElementById('playerCombo').textContent = 
            this.players[1].combo.count > 0 ? 
            `${this.getActionName(this.players[1].combo.type)} x${this.players[1].combo.count}` : 
            'Нет';
            
        document.getElementById('enemyCombo').textContent = 
            this.players[2].combo.count > 0 ? 
            `${this.getActionName(this.players[2].combo.type)} x${this.players[2].combo.count}` : 
            'Нет';
        
        // Обновление истории
        this.updateActionHistory('playerHistory', this.players[1].previousActions);
        this.updateActionHistory('enemyHistory', this.players[2].previousActions);
        
        // Обновление сетки
        this.updateTacticalGrid();
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
        return this.battleSystem.renderFullscreenGrid(side);
    }

    addBattleLog(message) {
        this.battleSystem.addBattleLog(message);
    }

    getTacticalHint() {
        return "Выберите действие и наблюдайте за тактической дуэлью!";
    }

    checkBattleEnd() {
        return this.battleSystem.isBattleOver();
    }

    endTacticalBattle() {
        this.battleSystem.endTacticalBattle(true);
    }

    tryToFlee() {
        this.battleSystem.tryToFlee();
    }
}

// ⭐ ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩЕЙ СИСТЕМОЙ
// Добавляем тактическую систему в BattleSystem
BattleSystem.prototype.tacticalSystem = new EnhancedBattleSystem();

// Переопределяем метод показа боя для использования тактической системы
BattleSystem.prototype.showFullscreenBattle = function() {
    this.tacticalSystem.startTacticalBattle(
        this.currentHero, 
        this.currentMonsters, 
        this.battleContext
    );
};

console.log("🎯 EnhancedBattleSystem интегрирован в BattleSystem");
