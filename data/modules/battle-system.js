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
            }
        };
        
        this.actionsCost = {
            attack: 1,
            strongAttack: 2,
            crushingAttack: 4,
            block: 1,
            breakBlock: 1,
            rest: 1,
            heal: 1
        };
        
        this.battleGrid = {
            allies: [null, null, null, null, null, null],
            enemies: [null, null, null, null, null, null]
        };
        
        this.selectedTarget = null;
        this.availableTargets = [];
        this.resultShown = false;
        this.battleEnding = false;
        this.pendingAction = null;
        
        console.log("✅ BattleSystem инициализирован с улучшенной групповой системой");
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

    getMonstersForCurrentMap() {
        if (!window.game.systems.map || !window.game.systems.map.currentMap) {
            console.log("🗺️ Карта не активна, используем общих монстров");
            return this.monsters;
        }

        const currentMap = window.game.systems.map.currentMap;
        
        if (!currentMap.monsters || !currentMap.monsters.availableMonsters) {
            console.log("🗺️ У карты нет своих монстров, используем общих");
            return this.monsters;
        }

        const mapMonsters = currentMap.monsters.availableMonsters
            .map(monsterId => this.getMonsterById(monsterId))
            .filter(monster => monster !== null);

        console.log(`🗺️ Загружено монстров для карты "${currentMap.meta.name}": ${mapMonsters.length}`);
        return mapMonsters;
    }

    getRandomMonsterForMovement() {
        const mapMonsters = this.getMonstersForCurrentMap();
        
        if (mapMonsters.length === 0) {
            console.error("❌ Нет монстров для текущей карты!");
            return this.monsters[0] || null;
        }
        
        const randomIndex = Math.floor(Math.random() * mapMonsters.length);
        const monster = mapMonsters[randomIndex];
        console.log(`🎲 Выбран монстр для карты: ${monster.name} (шанс: ${(1/mapMonsters.length*100).toFixed(1)}%)`);
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

    generateMonsterGroup(baseMonsterId) {
        const currentMap = window.game.systems.map?.currentMap;
        const mapSettings = currentMap?.monsters;
        const mapMonsters = this.getMonstersForCurrentMap();
        
        if (mapMonsters.length === 0) {
            console.error("❌ Нет доступных монстров для генерации группы!");
            return null;
        }

        const minMonsters = mapSettings?.minMonsters || 1;
        const maxMonsters = mapSettings?.maxMonsters || 3;
        
        let monsterCount = minMonsters;
        const roll = Math.random() * 100;
        
        if (maxMonsters > minMonsters) {
            const range = maxMonsters - minMonsters;
            if (roll <= 70) monsterCount = minMonsters;
            else if (roll <= 85) monsterCount = minMonsters + 1;
            else if (roll <= 95) monsterCount = minMonsters + 2;
            else monsterCount = maxMonsters;
        }

        const monsterGroup = [];
        const usedMonsters = new Set();
        
        for (let i = 0; i < monsterCount; i++) {
            let selectedMonster;
            let attempts = 0;
            
            do {
                const randomIndex = Math.floor(Math.random() * mapMonsters.length);
                selectedMonster = mapMonsters[randomIndex];
                attempts++;
            } while (usedMonsters.has(selectedMonster.id) && attempts < 5 && mapMonsters.length > 1);
            
            usedMonsters.add(selectedMonster.id);
            
            const monsterCopy = {
                ...selectedMonster,
                battleId: i + 1,
                currentHealth: selectedMonster.health,
                name: monsterCount > 1 ? `${selectedMonster.name} ${i + 1}` : selectedMonster.name,
                source: 'map',
                ai: new TacticalAI(this, selectedMonster),
                ap: 3,
                currentAction: null,
                combo: { type: null, count: 0 },
                previousActions: []
            };
            monsterGroup.push(monsterCopy);
        }

        console.log(`🎲 Сгенерирована группа из ${monsterCount} монстров:`, monsterGroup.map(m => m.name));
        return monsterGroup;
    }

    startBattleWithMonster(hero, monsterId, context = 'normal') {
        if (!hero) {
            console.error("❌ Не могу начать бой: герой не передан");
            return;
        }

        this.resultShown = false;
        this.battleEnding = false;

        const monsterGroup = this.generateMonsterGroup(monsterId);
        if (!monsterGroup || monsterGroup.length === 0) {
            console.error("❌ Не удалось сгенерировать группу монстров!");
            return;
        }

        this.currentHero = hero;
        this.currentMonsters = monsterGroup;
        
        this.players[1] = { 
            ap: 3, 
            currentAction: null, 
            combo: { type: null, count: 0 }, 
            previousActions: [] 
        };
        
        const heroStats = this.getHeroStatsForBattle();
        this.setupTacticalGrid(hero, monsterGroup, heroStats);
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        this.battleContext = context;
        this.selectedTarget = null;
        this.pendingAction = null;
        
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
        
        this.players[1] = { 
            ap: 3, 
            currentAction: null, 
            combo: { type: null, count: 0 }, 
            previousActions: [] 
        };
        
        const heroStats = this.getHeroStatsForBattle();
        this.setupTacticalGrid(hero, monsterGroup, heroStats);
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        this.battleContext = context;
        this.selectedTarget = null;
        this.pendingAction = null;
        
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
                source: 'programmed',
                ai: new TacticalAI(this, specificMonster),
                ap: 3,
                currentAction: null,
                combo: { type: null, count: 0 },
                previousActions: []
            };
            monsterGroup.push(monsterCopy);
        }

        return monsterGroup;
    }

    setupTacticalGrid(hero, monsters, heroStats = null) {
        this.battleGrid.allies = [null, null, null, null, null, null];
        this.battleGrid.enemies = [null, null, null, null, null, null];
        
        if (!heroStats) {
            heroStats = this.getHeroStatsForBattle();
        }
        
        this.battleGrid.allies[4] = {
            type: 'hero',
            data: hero,
            position: 4,
            maxHealth: heroStats.maxHealth,
            currentHealth: heroStats.currentHealth,
            attackType: this.getHeroAttackType(hero)
        };

        this.placeMonstersOnGrid(monsters);
        this.updateAvailableTargets();
    }

    placeMonstersOnGrid(monsters) {
        const frontRowPositions = [0, 2, 4];
        const backRowPositions = [1, 3, 5];
        
        const frontRowMonsters = [];
        const backRowMonsters = [];
        
        monsters.forEach(monster => {
            if (monster.attackType === 'melee') {
                frontRowMonsters.push(monster);
            } else {
                backRowMonsters.push(monster);
            }
        });
        
        let frontIndex = 0;
        frontRowMonsters.forEach(monster => {
            if (frontIndex < frontRowPositions.length) {
                const position = frontRowPositions[frontIndex];
                this.battleGrid.enemies[position] = {
                    type: 'monster',
                    data: monster,
                    position: position,
                    maxHealth: monster.health,
                    currentHealth: monster.currentHealth,
                    attackType: monster.attackType,
                    row: 'front'
                };
                frontIndex++;
            }
        });
        
        let backIndex = 0;
        backRowMonsters.forEach(monster => {
            if (backIndex < backRowPositions.length) {
                const position = backRowPositions[backIndex];
                this.battleGrid.enemies[position] = {
                    type: 'monster',
                    data: monster,
                    position: position,
                    maxHealth: monster.health,
                    currentHealth: monster.currentHealth,
                    attackType: monster.attackType,
                    row: 'back'
                };
                backIndex++;
            }
        });
        
        const remainingMonsters = [...frontRowMonsters.slice(frontIndex), ...backRowMonsters.slice(backIndex)];
        let remainingIndex = 0;
        
        for (let i = frontIndex; i < frontRowPositions.length && remainingIndex < remainingMonsters.length; i++) {
            const position = frontRowPositions[i];
            const monster = remainingMonsters[remainingIndex];
            this.battleGrid.enemies[position] = {
                type: 'monster',
                data: monster,
                position: position,
                maxHealth: monster.health,
                currentHealth: monster.currentHealth,
                attackType: monster.attackType,
                row: 'front'
            };
            remainingIndex++;
        }
        
        for (let i = backIndex; i < backRowPositions.length && remainingIndex < remainingMonsters.length; i++) {
            const position = backRowPositions[i];
            const monster = remainingMonsters[remainingIndex];
            this.battleGrid.enemies[position] = {
                type: 'monster',
                data: monster,
                position: position,
                maxHealth: monster.health,
                currentHealth: monster.currentHealth,
                attackType: monster.attackType,
                row: 'back'
            };
            remainingIndex++;
        }
        
        console.log(`🎯 Монстры размещены: ${frontRowMonsters.length} в первом ряду, ${backRowMonsters.length} во втором ряду`);
    }

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
                
                <div class="battle-main-area-compact">
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
                            
                            <button class="tactical-btn heal" onclick="game.systems.battle.handlePlayerAction('heal')">
                                <span class="btn-icon">❤️</span>
                                <span class="btn-text">Лечение</span>
                                <span class="btn-cost">(1 ОД)</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- ЦЕНТР - КОМПАКТНАЯ СЕТКА БЕЗ VS -->
                    <div class="battle-grid-compact">
                        <div class="grid-side-compact allies-side">
                            <h3 class="side-title">ВАШ ОТРЯД</h3>
                            <div class="grid-container-6x6-compact">
                                ${this.renderTacticalGrid('allies')}
                            </div>
                        </div>
                        
                        <div class="grid-side-compact enemies-side">
                            <h3 class="side-title">ПРОТИВНИКИ</h3>
                            <div class="grid-container-6x6-compact">
                                ${this.renderTacticalGrid('enemies')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- ПРАВАЯ ПАНЕЛЬ - ГРУППОВЫЕ ПАНЕЛИ МОНСТРОВ -->
                    <div class="enemy-panels-container">
                        <h3 class="panel-title">ДЕЙСТВИЯ ПРОТИВНИКОВ</h3>
                        <div class="enemy-panels-grid" id="enemyPanelsGrid">
                            ${this.renderEnemyPanels()}
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

    renderEnemyPanels() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => 
            unit && unit.currentHealth > 0
        );
        
        if (aliveMonsters.length === 0) {
            return '<div class="no-enemies">Все противники повержены!</div>';
        }
        
        return aliveMonsters.map(monster => `
            <div class="enemy-panel-mini" data-monster-id="${monster.data.battleId}">
                <div class="enemy-panel-header">
                    <span class="enemy-name">${monster.data.name}</span>
                    <span class="enemy-row">${monster.row === 'front' ? '🥊 Передний' : '🏹 Задний'}</span>
                </div>
                <div class="enemy-panel-stats">
                    <div class="stat-row">
                        <span>ОД: <span id="enemyAP-${monster.data.battleId}">${monster.data.ap}</span></span>
                        <span>Комбо: <span id="enemyCombo-${monster.data.battleId}">${monster.data.combo.count > 0 ? `${this.getActionName(monster.data.combo.type)} x${monster.data.combo.count}` : 'Нет'}</span></span>
                    </div>
                </div>
                <div class="enemy-action-history">
                    <div class="history-title">Действие:</div>
                    <div class="history-entries" id="enemyHistory-${monster.data.battleId}">
                        ${monster.data.previousActions.length > 0 ? 
                            monster.data.previousActions.map(action => `<div class="history-entry">${action}</div>`).join('') : 
                            '<div class="history-empty">Ожидание...</div>'
                        }
                    </div>
                </div>
            </div>
        `).join('');
    }

    handlePlayerAction(action) {
        if (this.battleEnding || this.resultShown) {
            console.log("🛑 Бой уже завершается, игнорируем клик");
            return;
        }

        const player = this.players[1];
        
        if (player.ap < this.actionsCost[action]) {
            this.addBattleLog(`❌ Недостаточно ОД для ${this.getActionName(action)}!`);
            return;
        }

        if (this.isAttackAction(action) && !this.selectedTarget) {
            this.showTargetSelection(action);
            return;
        }

        this.executePlayerAction(action);
    }

    showTargetSelection(action) {
        this.updateAvailableTargets();
        
        if (this.availableTargets.length === 0) {
            this.addBattleLog("❌ Нет доступных целей для атаки!");
            return;
        }

        this.highlightAvailableTargets();
        this.pendingAction = action;
        
        this.addBattleLog("🎯 Выберите цель для атаки (кликните на противника)");
        
        const hintElement = document.getElementById('battleHint');
        if (hintElement) {
            hintElement.textContent = "🎯 Выберите цель для атаки! Кликните на противника в сетке.";
        }
    }

    selectTarget(position) {
        if (!this.pendingAction) return;
        
        const target = this.battleGrid.enemies[position];
        if (!target || target.currentHealth <= 0) {
            this.addBattleLog("❌ Невозможно выбрать эту цель!");
            return;
        }
        
        if (!this.availableTargets.includes(position)) {
            this.addBattleLog("❌ Эта цель недоступна для вашего оружия!");
            return;
        }
        
        this.selectedTarget = position;
        this.addBattleLog(`🎯 Цель выбрана: ${target.data.name}`);
        
        this.clearTargetHighlights();
        this.executePlayerAction(this.pendingAction);
        this.pendingAction = null;
        
        const hintElement = document.getElementById('battleHint');
        if (hintElement) {
            hintElement.textContent = this.getTacticalHint();
        }
    }

    highlightAvailableTargets() {
        this.availableTargets.forEach(position => {
            const cell = document.querySelector(`.grid-cell-fullscreen[data-position="${position}"][data-side="enemies"]`);
            if (cell) {
                cell.classList.add('selectable');
                cell.onclick = () => this.selectTarget(position);
            }
        });
    }

    clearTargetHighlights() {
        const cells = document.querySelectorAll('.grid-cell-fullscreen.selectable');
        cells.forEach(cell => {
            cell.classList.remove('selectable');
            cell.onclick = null;
        });
    }

    updateAvailableTargets() {
        const heroAttackType = this.getHeroAttackType(this.currentHero);
        this.availableTargets = [];
        
        this.battleGrid.enemies.forEach((unit, position) => {
            if (unit && unit.currentHealth > 0) {
                // Для ближнего боя доступны монстры первого ряда
                if (heroAttackType === 'melee') {
                    if (unit.row === 'front') {
                        this.availableTargets.push(position);
                    } else {
                        // Проверяем, есть ли живые монстры в первом ряду
                        const hasAliveFrontRow = this.battleGrid.enemies.some((u, pos) => 
                            u && u.currentHealth > 0 && u.row === 'front'
                        );
                        // Если нет живых в первом ряду - можно атаковать второй ряд
                        if (!hasAliveFrontRow) {
                            this.availableTargets.push(position);
                        }
                    }
                } else {
                    // Для дальнего боя доступны все монстры
                    this.availableTargets.push(position);
                }
            }
        });
        
        console.log(`🎯 Доступные цели для ${heroAttackType} атаки:`, this.availableTargets);
    }

    isAttackAction(action) {
        return ['attack', 'strongAttack', 'crushingAttack', 'breakBlock'].includes(action);
    }

    executePlayerAction(action) {
        const player = this.players[1];
        
        player.ap -= this.actionsCost[action];
        
        if (player.combo.type === action && player.combo.count < 4) {
            player.combo.count++;
        } else {
            player.combo.type = action;
            player.combo.count = 1;
        }

        player.currentAction = action;
        player.previousActions.unshift(this.getActionName(action));
        if (player.previousActions.length > 3) {
            player.previousActions.pop();
        }

        this.addBattleLog(`🎯 Вы используете: ${this.getActionName(action)} (комбо x${player.combo.count})`);
        
        if (action === 'heal') {
            this.executeHealAction(player);
        }
        
        setTimeout(() => {
            this.executeEnemyTurns();
        }, 800);
        
        this.updateTacticalUI();
    }

    executeHealAction(player) {
        const hero = this.battleGrid.allies[4];
        if (!hero) return;
        
        const healEfficiency = this.getHealEfficiency(player.combo.count);
        const healAmount = Math.floor(hero.maxHealth * healEfficiency);
        const actualHeal = Math.min(healAmount, hero.maxHealth - hero.currentHealth);
        
        hero.currentHealth += actualHeal;
        
        this.addBattleLog(`❤️ Вы лечитесь на ${actualHeal} HP (${healEfficiency * 100}% от макс. здоровья)`);
    }

    executeEnemyTurns() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => 
            unit && unit.currentHealth > 0
        );
        
        if (aliveMonsters.length === 0) {
            this.resolveTacticalTurn();
            return;
        }
        
        this.executeNextMonsterTurn(0, aliveMonsters);
    }

    executeNextMonsterTurn(index, monsters) {
        if (index >= monsters.length) {
            setTimeout(() => {
                this.resolveTacticalTurn();
            }, 500);
            return;
        }
        
        const monsterUnit = monsters[index];
        const monster = monsterUnit.data;
        
        const tacticalAI = new TacticalAI(this, monster);
        const action = tacticalAI.decideAction();
        
        monster.currentAction = action;
        monster.ap -= this.actionsCost[action];
        
        if (monster.combo.type === action && monster.combo.count < 4) {
            monster.combo.count++;
        } else {
            monster.combo.type = action;
            monster.combo.count = 1;
        }

        monster.previousActions.unshift(this.getActionName(action));
        if (monster.previousActions.length > 1) {
            monster.previousActions.pop();
        }

        this.addBattleLog(`👹 ${monster.name} использует: ${this.getActionName(action)}`);
        
        this.executeMonsterAction(monster, monsterUnit);
        this.updateMonsterPanel(monster.battleId);
        
        setTimeout(() => {
            this.executeNextMonsterTurn(index + 1, monsters);
        }, 800);
    }

    executeMonsterAction(monster, monsterUnit) {
        const hero = this.battleGrid.allies[4];
        if (!hero || hero.currentHealth <= 0) return;

        let damage = 0;
        let message = '';
        
        switch(monster.currentAction) {
            case 'attack':
            case 'strongAttack':
            case 'crushingAttack':
                damage = this.calculateMonsterDamage(monster, monsterUnit);
                const heroStats = this.getHeroStatsForBattle();
                const finalDamage = Math.max(1, damage - heroStats.armor);
                
                const oldHealth = hero.currentHealth;
                hero.currentHealth = Math.max(0, hero.currentHealth - finalDamage);
                message = `👹 ${monster.name} атакует и наносит ${finalDamage} урона!`;
                
                this.updateHealthBar('allies', 4, hero.currentHealth, hero.maxHealth);
                
                if (hero.currentHealth <= 0) {
                    hero.currentHealth = 0;
                    this.updateHealthBar('allies', 4, 0, hero.maxHealth);
                }
                break;
                
            case 'heal':
                const healEfficiency = this.getHealEfficiency(monster.combo.count);
                const healAmount = Math.floor(monsterUnit.maxHealth * healEfficiency);
                const actualHeal = Math.min(healAmount, monsterUnit.maxHealth - monsterUnit.currentHealth);
                monsterUnit.currentHealth += actualHeal;
                message = `❤️ ${monster.name} лечится на ${actualHeal} HP`;
                
                this.updateHealthBar('enemies', monsterUnit.position, monsterUnit.currentHealth, monsterUnit.maxHealth);
                break;
                
            case 'block':
                message = `🛡️ ${monster.name} защищается`;
                break;
                
            case 'rest':
                const restEfficiency = this.getRestEfficiency(monster.combo.count);
                monster.ap += restEfficiency.ap;
                message = `🌀 ${monster.name} отдыхает (+${restEfficiency.ap} ОД)`;
                break;
                
            default:
                message = `👹 ${monster.name} совершает действие`;
        }
        
        if (message) {
            this.addBattleLog(message);
        }
    }

    calculateMonsterDamage(monster, monsterUnit) {
        let baseDamage = monster.damage || 10;
        let multiplier = 1.0;
        
        switch(monster.currentAction) {
            case 'strongAttack':
                multiplier = 1.5;
                break;
            case 'crushingAttack':
                multiplier = 2.0;
                break;
        }
        
        const comboMultiplier = this.getComboMultiplier(monster.currentAction, monster.combo.count);
        multiplier *= comboMultiplier;
        
        const finalDamage = baseDamage * multiplier;
        console.log(`🎯 Урон монстра ${monster.name}: база=${baseDamage}, множитель=${multiplier}, итого=${Math.floor(finalDamage)}`);
        
        return Math.floor(finalDamage);
    }

    updateHealthBar(side, position, currentHealth, maxHealth) {
        const healthPercent = (currentHealth / maxHealth) * 100;
        const healthFill = document.getElementById(`health-${side}-${position}`);
        const healthText = healthFill?.parentElement?.querySelector('.health-text');
        
        if (healthFill) {
            healthFill.classList.add('health-changing');
            healthFill.style.width = `${healthPercent}%`;
            
            if (healthPercent <= 25) {
                healthFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
            } else if (healthPercent <= 50) {
                healthFill.style.background = 'linear-gradient(90deg, #f59e0b, #eab308)';
            } else {
                healthFill.style.background = 'linear-gradient(90deg, #ef4444, #f59e0b)';
            }
            
            setTimeout(() => {
                healthFill.classList.remove('health-changing');
            }, 300);
        }
        
        if (healthText) {
            healthText.textContent = `${Math.ceil(currentHealth)}/${maxHealth}`;
        }
        
        const overlayNumbers = document.querySelector(`[data-position="${position}"][data-side="${side}"] .overlay-health-numbers`);
        if (overlayNumbers) {
            overlayNumbers.textContent = `${Math.ceil(currentHealth)}/${maxHealth}`;
        }
    }

    getHealEfficiency(comboCount) {
        const efficiencies = [0.10, 0.20, 0.40, 0.80];
        return efficiencies[Math.min(comboCount - 1, 3)];
    }

    updateMonsterPanel(monsterId) {
        const monster = this.currentMonsters.find(m => m.battleId === monsterId);
        if (!monster) return;
        
        const apElement = document.getElementById(`enemyAP-${monsterId}`);
        const comboElement = document.getElementById(`enemyCombo-${monsterId}`);
        const historyElement = document.getElementById(`enemyHistory-${monsterId}`);
        
        if (apElement) apElement.textContent = monster.ap;
        if (comboElement) {
            comboElement.textContent = monster.combo.count > 0 ? 
                `${this.getActionName(monster.combo.type)} x${monster.combo.count}` : 'Нет';
        }
        if (historyElement) {
            historyElement.innerHTML = monster.previousActions.length > 0 ? 
                monster.previousActions.map(action => `<div class="history-entry">${action}</div>`).join('') : 
                '<div class="history-empty">Ожидание...</div>';
        }
    }

    getComboMultiplier(action, comboCount) {
        const baseMultipliers = {
            attack: [1.0, 2.0, 4.0, 8.0],
            strongAttack: [2.5, 5.0, 10.0, 20.0],
            crushingAttack: [7.5, 15.0, 30.0, 60.0],
            breakBlock: [0.5, 1.0, 1.5, 2.0]
        };
        
        const index = Math.min(comboCount - 1, 3);
        return baseMultipliers[action] ? baseMultipliers[action][index] : 1.0;
    }

    getBreakBlockMultiplier(comboCount, enemyHasBlock = false) {
        if (!enemyHasBlock) {
            const multipliers = [0.5, 1.0, 1.5, 2.0];
            return multipliers[Math.min(comboCount - 1, 3)];
        } else {
            const multipliers = [2.0, 3.0, 4.0, 5.0];
            return multipliers[Math.min(comboCount - 1, 3)];
        }
    }

    getBlockEfficiency(comboCount) {
        const efficiencies = [0.5, 0.75, 1.0, 1.0];
        return efficiencies[Math.min(comboCount - 1, 3)];
    }

    getBlockAPBonus(comboCount) {
        const apBonuses = [1, 2, 3, 4];
        return apBonuses[Math.min(comboCount - 1, 3)];
    }

    getRestEfficiency(comboCount) {
        const apGain = [1, 2, 3, 4];
        const healPercent = [0.05, 0.10, 0.15, 0.20];
        
        return {
            ap: apGain[Math.min(comboCount - 1, 3)],
            healPercent: healPercent[Math.min(comboCount - 1, 3)]
        };
    }

    resolveTacticalTurn() {
        const playerAction = this.players[1].currentAction;
        
        this.battleRound++;
        this.addBattleLog(`--- РАУНД ${this.battleRound} ---`);
        
        this.executeTacticalDamage(playerAction);
        
        this.players[1].currentAction = null;
        this.players[1].ap += 1;
        
        this.currentMonsters.forEach(monster => {
            if (monster.currentHealth > 0) {
                monster.ap += 1;
            }
        });
        
        this.selectedTarget = null;
        this.updateTacticalUI();
        
        if (this.checkBattleEnd()) {
            setTimeout(() => {
                this.endTacticalBattle(this.isPlayerVictory());
            }, 1000);
        }
    }

    executeTacticalDamage(playerAction) {
        if (this.isAttackAction(playerAction) && this.selectedTarget !== null) {
            const targetUnit = this.battleGrid.enemies[this.selectedTarget];
            if (targetUnit && targetUnit.currentHealth > 0) {
                const heroStats = this.getHeroStatsForBattle();
                const player = this.players[1];
                
                let damage = heroStats.damage;
                
                if (playerAction === 'strongAttack') damage *= 1.5;
                if (playerAction === 'crushingAttack') damage *= 2.0;
                if (playerAction === 'breakBlock') damage *= 0.5;
                
                const comboMultiplier = this.getComboMultiplier(playerAction, player.combo.count);
                damage *= comboMultiplier;
                
                let finalDamage = damage;
                if (playerAction !== 'breakBlock') {
                    finalDamage = Math.max(1, damage - (targetUnit.data.armor || 0));
                }
                
                finalDamage = Math.floor(finalDamage);
                
                const oldHealth = targetUnit.currentHealth;
                targetUnit.currentHealth = Math.max(0, targetUnit.currentHealth - finalDamage);
                
                this.addBattleLog(`🎯 Вы наносите ${finalDamage} урона ${targetUnit.data.name}!`);
                
                this.updateHealthBar('enemies', this.selectedTarget, targetUnit.currentHealth, targetUnit.maxHealth);
                
                if (targetUnit.currentHealth <= 0) {
                    targetUnit.currentHealth = 0;
                    this.addBattleLog(`💀 ${targetUnit.data.name} повержен!`);
                    this.updateHealthBar('enemies', this.selectedTarget, 0, targetUnit.maxHealth);
                }
            }
        }
    }

    updateTacticalUI() {
        const playerAP = document.getElementById('playerAP');
        const playerCombo = document.getElementById('playerCombo');
        
        if (playerAP) playerAP.textContent = `${this.players[1].ap}/∞`;
        
        if (playerCombo) {
            if (this.players[1].combo.count > 0) {
                const action = this.players[1].combo.type;
                const count = this.players[1].combo.count;
                let multiplierText = '';
                
                if (this.isAttackAction(action)) multiplierText = ` (x${this.getComboMultiplier(action, count)})`;
                else if (action === 'breakBlock') multiplierText = ` (x${this.getBreakBlockMultiplier(count, false)})`;
                else if (action === 'block') multiplierText = ` (${this.getBlockEfficiency(count) * 100}% +${this.getBlockAPBonus(count)}ОД)`;
                else if (action === 'rest') multiplierText = ` (+${this.getRestEfficiency(count).ap}ОД)`;
                else if (action === 'heal') multiplierText = ` (${this.getHealEfficiency(count) * 100}% HP)`;
                
                playerCombo.textContent = `${this.getActionName(action)} x${count}${multiplierText}`;
            } else {
                playerCombo.textContent = 'Нет';
            }
        }
        
        this.updateActionHistory('playerHistory', this.players[1].previousActions);
        
        this.currentMonsters.forEach(monster => {
            if (monster.currentHealth > 0) {
                this.updateMonsterPanel(monster.battleId);
            }
        });
        
        this.updateTacticalGrid();
        this.updateBattleLog();
    }

    getActionName(action) {
        const names = {
            attack: 'Атака',
            strongAttack: 'Силовая атака',
            crushingAttack: 'Сокрушительная атака',
            block: 'Блок',
            breakBlock: 'Пробитие',
            rest: 'Отдых',
            heal: 'Лечение'
        };
        return names[action] || action;
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
        const alliesGrid = document.querySelector('.allies-side .grid-container-6x6-compact');
        const enemiesGrid = document.querySelector('.enemies-side .grid-container-6x6-compact');
        
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
            
            let currentStats;
            if (isEnemy) {
                currentStats = {
                    damage: unit.data.damage || 10,
                    armor: unit.data.armor || 0,
                    currentHealth: Math.ceil(unit.currentHealth),
                    maxHealth: unit.maxHealth,
                    attackType: unit.attackType,
                    row: unit.row
                };
            } else {
                const heroStats = this.getHeroStatsForBattle();
                currentStats = {
                    damage: heroStats.damage,
                    armor: heroStats.armor,
                    currentHealth: Math.ceil(unit.currentHealth),
                    maxHealth: unit.maxHealth,
                    attackType: unit.attackType
                };
            }

            content = `
                <div class="unit-image-container">
                    <img class="unit-image" src="${unit.data.image}" alt="${unit.data.name}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                    <div class="image-fallback" style="display: none;">
                        ${isEnemy ? '👹' : '🎯'}
                    </div>
                    
                    <!-- ВСПЛЫВАЮЩАЯ ПОДСКАЗКА СНИЗУ С ИМЕНЕМ -->
                    <div class="unit-info-overlay">
                        <div class="overlay-unit-header">
                            <div class="overlay-unit-name">${unit.data.name}</div>
                            <div class="overlay-unit-level">${isEnemy ? 'Lvl 1' : 'Lvl ' + (unit.data.level || 1)}</div>
                        </div>
                        <div class="overlay-simple-stats">
                            <div class="overlay-health">
                                <span class="overlay-health-label">❤️ Здоровье:</span>
                                <span class="overlay-health-numbers">${currentStats.currentHealth}/${currentStats.maxHealth}</span>
                            </div>
                            <div class="overlay-main-stats">
                                <span class="overlay-damage">⚔️ ${currentStats.damage}</span>
                                <span class="overlay-armor">🛡️ ${currentStats.armor}</span>
                                <span class="overlay-type">${currentStats.attackType === 'melee' ? '🥊 Ближний' : '🏹 Дальний'}</span>
                                ${isEnemy ? `<span class="overlay-row">${currentStats.row === 'front' ? '1-й ряд' : '2-й ряд'}</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- ПОЛОСА ЗДОРОВЬЯ ВНИЗУ - НЕ КОНФЛИКТУЕТ С ДРУГИМИ СТИЛЯМИ -->
                <div class="unit-health-container">
                    <div class="health-bar-fullscreen">
                        <div class="health-fill" id="health-${side}-${position}" style="width: ${healthPercent}%"></div>
                        <div class="health-text">${currentStats.currentHealth}/${currentStats.maxHealth}</div>
                    </div>
                </div>
            `;
            
            if (!isAlive) {
                cellClass += ' dead';
                content += '<div class="dead-overlay">💀</div>';
            }
        }
        
        const onClick = isEnemy && !isEmpty ? `onclick="game.systems.battle.selectTarget(${position})"` : '';
        
        return `
            <div class="${cellClass}" data-position="${position}" data-side="${side}" ${onClick}>
                ${content}
            </div>
        `;
    }

    getHeroAttackType(hero) {
        const equippedWeaponId = hero.equipment?.main_hand;
        if (equippedWeaponId && window.game.systems.equipment) {
            const weapon = window.game.systems.equipment.getItemById(equippedWeaponId);
            return weapon?.attackType || 'melee';
        }
        return 'melee';
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
        const heroAttackType = this.getHeroAttackType(this.currentHero);
        const rangeText = heroAttackType === 'melee' ? 'сначала враги первого ряда' : 'любые враги';
        return `Ваше оружие: ${heroAttackType === 'melee' ? 'ближнего боя' : 'дальнего боя'}. Можете атаковать ${rangeText}.`;
    }

    checkBattleEnd() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => unit && unit.currentHealth > 0);
        const hero = this.battleGrid.allies[4];
        
        if (hero && hero.currentHealth <= 0) {
            hero.currentHealth = 0;
        }
        
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
            this.executeEnemyTurns();
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
        this.selectedTarget = null;
        this.pendingAction = null;
    }

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

class TacticalAI {
    constructor(battleSystem, monster) {
        this.bs = battleSystem;
        this.monster = monster;
    }
    
    decideAction() {
        const availableActions = this.getAvailableActions();
        if (availableActions.length === 0) return 'rest';
        
        const hero = this.bs.battleGrid.allies[4];
        if (!hero) return 'rest';
        
        const heroHealthPercent = hero.currentHealth / hero.maxHealth;
        const monsterHealthPercent = this.monster.currentHealth / this.monster.health;
        
        if (this.monster.ap >= 1 && Math.random() < 0.7) {
            if (this.monster.ap >= 4 && Math.random() < 0.3) {
                return 'crushingAttack';
            }
            if (this.monster.ap >= 2 && Math.random() < 0.4) {
                return 'strongAttack';
            }
            return 'attack';
        }
        
        if (monsterHealthPercent < 0.3 && Math.random() < 0.6 && availableActions.includes('heal')) {
            return 'heal';
        }
        
        if (monsterHealthPercent < 0.5 && Math.random() < 0.4 && availableActions.includes('block')) {
            return 'block';
        }
        
        if (this.monster.ap <= 1 && availableActions.includes('rest')) {
            return 'rest';
        }
        
        return availableActions.includes('attack') ? 'attack' : availableActions[0];
    }
    
    getAvailableActions() {
        const actions = [];
        
        if (this.monster.ap >= 1) actions.push('attack', 'block', 'rest', 'heal');
        if (this.monster.ap >= 2) actions.push('strongAttack');
        if (this.monster.ap >= 4) actions.push('crushingAttack');
        
        return actions;
    }
}

window.BattleSystem = BattleSystem;
console.log("📦 BattleSystem полностью переписан с компактной сеткой боя");

