// ========== MODULE: BattleSystem ==========
class BattleSystem {
    constructor() {
        this.monsters = [];
        this.battleActive = false;
        this.currentMonsters = [];
        this.currentHero = null;
        this.battleLog = [];
        this.battleRound = 0;
        this.battleType = 'normal';
        this.battleContext = 'normal';
        
        this.battleGrid = {
            allies: [null, null, null, null, null, null],
            enemies: [null, null, null, null, null, null]
        };
        this.selectedTarget = null;
        this.availableTargets = [];
        
        console.log("✅ BattleSystem инициализирован");
    }

    async loadBattleData() {
        try {
            console.log("📥 Загружаем данные монстров...");
            const response = await fetch('data/enemies.json');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            this.monsters = await response.json();
            console.log(`✅ Загружено монстров: ${this.monsters.length}`);
            return true;
        } catch (error) {
            console.error("❌ Ошибка загрузки данных монстров:", error);
            this.createFallbackMonsters();
            return true;
        }
    }

    createFallbackMonsters() {
        this.monsters = [];
        for (let i = 1; i <= 10; i++) {
            this.monsters.push({
                id: i,
                name: `Монстр ${i}`,
                health: 20 + i * 5,
                damage: 5 + i * 2,
                armor: 2 + Math.floor(i/3),
                experience: 5 + i * 2,
                reward: 10 + i * 3,
                attackType: i % 2 === 0 ? "ranged" : "melee"
            });
        }
        console.log("🔄 Созданы тестовые монстры");
    }

    startBattleWithMonster(hero, monsterId, context = 'normal') {
        if (!hero) {
            console.error("❌ Не могу начать бой: герой не передан");
            return;
        }

        const monsterGroup = this.generateMonsterGroup(monsterId);
        if (!monsterGroup) return;

        this.currentHero = hero;
        this.currentMonsters = monsterGroup;
        this.setupBattleGrid(hero, monsterGroup);
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        this.battleContext = context;
        
        console.log(`⚔️ Начинаем тактический бой с ${monsterGroup.length} монстрами`);
        this.showTacticalBattleScreen();
    }

    generateMonsterGroup(baseMonsterId) {
        const baseMonster = this.monsters.find(m => m.id === baseMonsterId);
        if (!baseMonster) return [];

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
                currentHealth: baseMonster.health
            };
            monsterGroup.push(monsterCopy);
        }

        return monsterGroup;
    }

    setupBattleGrid(hero, monsters) {
        this.battleGrid.allies = [null, null, null, null, null, null];
        this.battleGrid.enemies = [null, null, null, null, null, null];
        
        this.battleGrid.allies[3] = {
            type: 'hero',
            data: hero,
            position: 3,
            maxHealth: hero.baseHealth,
            currentHealth: hero.currentHealth || hero.baseHealth
        };

        this.placeMonstersOnGrid(monsters);
    }

    placeMonstersOnGrid(monsters) {
        const frontLinePositions = [0, 1, 2];
        const backLinePositions = [3, 4, 5];
        
        let frontLineCount = 0;
        let backLineCount = 0;

        monsters.forEach(monster => {
            const attackType = monster.attackType || 'melee';
            let position;
            
            if (attackType === 'melee' && frontLineCount < 3) {
                position = frontLinePositions[frontLineCount++];
            } else if (attackType === 'ranged' && backLineCount < 3) {
                position = backLinePositions[backLineCount++];
            } else {
                const availablePositions = [...frontLinePositions, ...backLinePositions]
                    .filter(pos => !this.battleGrid.enemies[pos]);
                if (availablePositions.length > 0) {
                    position = availablePositions[0];
                    if (position < 3) frontLineCount++;
                    else backLineCount++;
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
                    <div class="battle-grid allies-grid">
                        <div class="grid-header">ВАШ ОТРЯД</div>
                        <div class="grid-positions">
                            ${this.renderBattleGrid('allies')}
                        </div>
                    </div>
                    
                    <div class="battle-vs">VS</div>
                    
                    <div class="battle-grid enemies-grid">
                        <div class="grid-header">ПРОТИВНИКИ</div>
                        <div class="grid-positions">
                            ${this.renderBattleGrid('enemies')}
                        </div>
                    </div>
                </div>
                
                <div class="tactical-battle-log">
                    <h4>📜 Ход боя:</h4>
                    <div class="log-entries">
                        ${this.battleLog.map(entry => `<div class="log-entry">${entry}</div>`).join('')}
                    </div>
                </div>
                
                <div class="battle-hint" id="battleHint">
                    Выберите цель для атаки
                </div>
            </div>
        `;

        this.updateAvailableTargets();
    }

    renderBattleGrid(side) {
        const grid = this.battleGrid[side];
        let html = '';
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const position = row * 2 + col;
                const unit = grid[position];
                html += this.renderBattlePosition(unit, position, side);
            }
        }
        
        return html;
    }

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
            const healthPercent = (unit.currentHealth / unit.maxHealth) * 100;
            healthBar = `
                <div class="position-health-bar">
                    <div class="health-fill" style="width: ${healthPercent}%"></div>
                    <div class="health-text">${Math.ceil(unit.currentHealth)}/${unit.maxHealth}</div>
                </div>
            `;
            
            unitHtml = `
                <div class="unit-icon">
                    <span>${isEnemy ? '👹' : '🎯'}</span>
                </div>
                <div class="unit-name">${unit.data.name}</div>
            `;
            
            if (isEnemy) {
                clickHandler = `onclick="game.systems.battle.selectTarget(${position})"`;
                cssClass += ' selectable';
            }
        }
        
        return `<div class="${cssClass}" ${clickHandler} data-position="${position}">${unitHtml}${healthBar}</div>`;
    }

    selectTarget(position) {
        if (!this.availableTargets.includes(position)) return;
        
        this.selectedTarget = position;
        this.executeAttack(position);
    }

    updateAvailableTargets() {
        const hero = this.battleGrid.allies[3];
        if (!hero) return;

        const attackType = this.getHeroAttackType(hero.data);
        
        if (attackType === 'ranged') {
            this.availableTargets = [0, 1, 2, 3, 4, 5].filter(pos => 
                this.battleGrid.enemies[pos] && this.battleGrid.enemies[pos].currentHealth > 0
            );
        } else {
            this.availableTargets = [0, 1, 2].filter(pos => 
                this.battleGrid.enemies[pos] && this.battleGrid.enemies[pos].currentHealth > 0
            );
        }
    }

    getHeroAttackType(hero) {
        const equippedWeaponId = hero.equipment?.main_hand;
        if (equippedWeaponId && window.game.systems.equipment) {
            const weapon = window.game.systems.equipment.getItemById(equippedWeaponId);
            return weapon?.attackType || 'melee';
        }
        return 'melee';
    }

    executeAttack(targetPosition) {
        const hero = this.battleGrid.allies[3];
        const target = this.battleGrid.enemies[targetPosition];
        if (!hero || !target) return;

        this.battleRound++;
        
        const heroStats = window.game.systems.level.calculateHeroStats(hero.data, window.game.systems.bonus);
        const baseDamage = heroStats.damage;
        const targetArmor = target.data.armor || 0;
        const finalDamage = Math.max(1, baseDamage - targetArmor);
        
        target.currentHealth -= finalDamage;
        this.addBattleLog(`🗡️ ${hero.data.name} атакует ${target.data.name} и наносит ${finalDamage} урона!`);
        
        if (target.currentHealth <= 0) {
            this.addBattleLog(`💀 ${target.data.name} повержен!`);
            this.battleGrid.enemies[targetPosition] = null;
            
            if (this.isBattleOver()) {
                this.endTacticalBattle(true);
                return;
            }
        }
        
        setTimeout(() => this.executeMonsterTurns(), 1000);
    }

    executeMonsterTurns() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => unit && unit.currentHealth > 0);
        if (aliveMonsters.length === 0) {
            this.endTacticalBattle(true);
            return;
        }
        
        aliveMonsters.forEach(monster => {
            this.executeMonsterAttack(monster);
        });
        
        this.updateAvailableTargets();
    }

    executeMonsterAttack(monster) {
        const hero = this.battleGrid.allies[3];
        if (!hero) return;
        
        const monsterDamage = monster.data.damage || 5;
        const heroArmor = window.game.systems.level.calculateHeroStats(hero.data, window.game.systems.bonus).armor;
        const finalDamage = Math.max(1, monsterDamage - heroArmor);
        
        hero.currentHealth -= finalDamage;
        this.addBattleLog(`👹 ${monster.data.name} атакует героя и наносит ${finalDamage} урона!`);
        
        if (hero.currentHealth <= 0) {
            this.endTacticalBattle(false);
        }
    }

    isBattleOver() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => unit && unit.currentHealth > 0);
        const hero = this.battleGrid.allies[3];
        return aliveMonsters.length === 0 || (hero && hero.currentHealth <= 0);
    }

    endTacticalBattle(victory) {
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
            this.addBattleLog("💀 ПОРАЖЕНИЕ! Герой повержен");
        }
        
        if (window.game) window.game.saveGame();
        if (this.battleContext === 'movement' && window.game.systems.map) {
            window.game.systems.map.completeMovementAfterBattle(victory);
        }
        
        this.battleActive = false;
        this.currentMonsters = [];
        this.showTacticalBattleResult(victory);
    }

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

    returnToGame() {
        if (this.battleContext === 'movement' && window.game && window.game.systems.map) {
            window.game.showHeroGameScreen();
            setTimeout(() => window.game.systems.map.showOverlay('tactical-map'), 100);
        } else if (window.game) {
            window.game.showHeroGameScreen();
        }
        
        this.battleActive = false;
        this.currentMonsters = [];
    }

    addBattleLog(message) {
        this.battleLog.push(message);
        if (this.battleLog.length > 10) this.battleLog.shift();
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
        this.showTacticalBattleScreen();
    }
}

window.BattleSystem = BattleSystem;
console.log("📦 BattleSystem модуль загружен");
