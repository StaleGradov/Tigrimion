"use strict";

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
        this.monsters = [
            {
                id: 1,
                name: "Лютоволк",
                health: 300,
                damage: 25,
                armor: 5,
                experience: 50,
                reward: 100,
                attackType: "melee"
            },
            {
                id: 2,
                name: "Гоблин",
                health: 150,
                damage: 15,
                armor: 2,
                experience: 25,
                reward: 50,
                attackType: "melee"
            },
            {
                id: 3,
                name: "Орк",
                health: 400,
                damage: 35,
                armor: 8,
                experience: 75,
                reward: 150,
                attackType: "melee"
            }
        ];
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
        this.showInteractiveBattle();
    }

    generateMonsterGroup(baseMonsterId) {
        const baseMonster = this.monsters.find(m => m.id === baseMonsterId);
        if (!baseMonster) {
            // Если монстр не найден, используем случайного
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
                name: `${baseMonster.name} ${i + 1}`
            };
            monsterGroup.push(monsterCopy);
        }

        return monsterGroup;
    }

    setupBattleGrid(hero, monsters) {
        this.battleGrid.allies = [null, null, null, null, null, null];
        this.battleGrid.enemies = [null, null, null, null, null, null];
        
        // Размещаем героя в центре заднего ряда
        this.battleGrid.allies[3] = {
            type: 'hero',
            data: hero,
            position: 3,
            maxHealth: hero.baseHealth,
            currentHealth: hero.currentHealth || hero.baseHealth
        };

        this.placeMonstersOnGrid(monsters);
        this.updateAvailableTargets();
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

    // ========== ИНТЕРАКТИВНЫЙ ИНТЕРФЕЙС БОЯ ==========
    showInteractiveBattle() {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="battle-screen-interactive">
                <header class="battle-header">
                    <h2>⚔️ ТАКТИЧЕСКИЙ БОЙ</h2>
                    <div class="battle-round">Раунд: ${this.battleRound}</div>
                    <button class="btn-battle-back" onclick="game.systems.battle.returnToGame()">
                        ← Назад к карте
                    </button>
                </header>
                
                <div class="battle-status">
                    <div class="hero-status">
                        <div class="combatant-hero">
                            <div class="combatant-image">
                                <img src="${this.currentHero.image}" alt="${this.currentHero.name}" 
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                                <div class="combatant-fallback" style="display: none;">🎯</div>
                            </div>
                            <div class="combatant-info">
                                <h4>${this.currentHero.name}</h4>
                                <div class="health-bar">
                                    <div class="health-fill" style="width: ${(this.battleGrid.allies[3].currentHealth / this.battleGrid.allies[3].maxHealth) * 100}%"></div>
                                    <div class="health-text">${Math.ceil(this.battleGrid.allies[3].currentHealth)}/${this.battleGrid.allies[3].maxHealth}</div>
                                </div>
                                <div class="combatant-stats">
                                    <span>⚔️ ${this.getHeroDamage()}</span>
                                    <span>🛡️ ${this.getHeroArmor()}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="battle-vs">VS</div>
                    
                    <div class="enemies-status">
                        ${this.renderEnemiesStatus()}
                    </div>
                </div>
                
                <div class="battle-grid-interactive">
                    <div class="grid-side allies-side">
                        <h4>ВАШ ОТРЯД</h4>
                        <div class="grid-positions">
                            ${this.renderInteractiveGrid('allies')}
                        </div>
                    </div>
                    
                    <div class="grid-side enemies-side">
                        <h4>ПРОТИВНИКИ</h4>
                        <div class="grid-positions">
                            ${this.renderInteractiveGrid('enemies')}
                        </div>
                    </div>
                </div>
                
                <div class="battle-controls">
                    <div class="battle-hint" id="battleHint">
                        ${this.getBattleHint()}
                    </div>
                    
                    <div class="battle-actions">
                        <button class="btn-battle-flee" onclick="game.systems.battle.tryToFlee()">
                            🏃 Попытаться сбежать
                        </button>
                    </div>
                </div>
                
                <div class="battle-log-container">
                    <h4>📜 Ход боя:</h4>
                    <div class="battle-log-entries" id="battleLogEntries">
                        ${this.battleLog.map(entry => `<div class="log-entry">${entry}</div>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    renderInteractiveGrid(side) {
        const grid = this.battleGrid[side];
        let html = '';
        
        for (let position = 0; position < 6; position++) {
            const unit = grid[position];
            html += this.renderInteractiveGridCell(unit, position, side);
        }
        
        return html;
    }

    renderInteractiveGridCell(unit, position, side) {
        const isEnemy = side === 'enemies';
        const isEmpty = !unit;
        
        let cellClass = 'grid-cell';
        let content = '';
        let onClick = '';
        
        if (isEmpty) {
            cellClass += ' empty';
            content = '⚫';
        } else {
            const healthPercent = (unit.currentHealth / unit.maxHealth) * 100;
            const isAlive = unit.currentHealth > 0;
            
            let unitSymbol = isEnemy ? '👹' : '🎯';
            if (!isAlive) {
                unitSymbol = '💀';
                cellClass += ' dead';
            } else {
                cellClass += ' alive';
            }
            
            content = `
                <div class="unit-display">
                    <div class="unit-symbol">${unitSymbol}</div>
                    <div class="unit-name">${unit.data.name}</div>
                    <div class="unit-health">
                        <div class="health-bar-small">
                            <div class="health-fill-small" style="width: ${healthPercent}%"></div>
                        </div>
                        <div class="health-text-small">${Math.ceil(unit.currentHealth)}</div>
                    </div>
                </div>
            `;
            
            // Делаем врагов кликабельными, если они живы и доступны для атаки
            if (isEnemy && isAlive && this.availableTargets.includes(position)) {
                cellClass += ' selectable';
                onClick = `onclick="game.systems.battle.selectTarget(${position})"`;
            }
        }
        
        return `
            <div class="${cellClass}" ${onClick} data-position="${position}" data-side="${side}">
                ${content}
            </div>
        `;
    }

    renderEnemiesStatus() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => unit && unit.currentHealth > 0);
        
        return aliveMonsters.map(monster => `
            <div class="combatant-enemy">
                <div class="combatant-image">
                    <div class="enemy-symbol">👹</div>
                </div>
                <div class="combatant-info">
                    <h4>${monster.data.name}</h4>
                    <div class="health-bar">
                        <div class="health-fill" style="width: ${(monster.currentHealth / monster.maxHealth) * 100}%"></div>
                        <div class="health-text">${Math.ceil(monster.currentHealth)}/${monster.maxHealth}</div>
                    </div>
                    <div class="combatant-stats">
                        <span>⚔️ ${monster.data.damage}</span>
                        <span>🛡️ ${monster.data.armor || 0}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    getHeroDamage() {
        if (!this.currentHero || !window.game?.systems?.level) return 0;
        const stats = window.game.systems.level.calculateHeroStats(this.currentHero, window.game.systems.bonus);
        return stats.damage;
    }

    getHeroArmor() {
        if (!this.currentHero || !window.game?.systems?.level) return 0;
        const stats = window.game.systems.level.calculateHeroStats(this.currentHero, window.game.systems.bonus);
        return stats.armor;
    }

    getBattleHint() {
        if (this.availableTargets.length === 0) {
            return "Ожидание хода противника...";
        }
        
        const targetCount = this.availableTargets.length;
        if (targetCount === 1) {
            return "Кликните на врага для атаки (доступна 1 цель)";
        } else {
            return `Кликните на врага для атаки (доступно ${targetCount} целей)`;
        }
    }

    // ========== ОСНОВНАЯ ЛОГИКА БОЯ ==========
    selectTarget(position) {
        if (!this.availableTargets.includes(position)) {
            console.log("❌ Цель недоступна для атаки");
            return;
        }

        const target = this.battleGrid.enemies[position];
        if (!target || target.currentHealth <= 0) {
            console.log("❌ Цель уже мертва");
            return;
        }

        this.selectedTarget = position;
        console.log(`🎯 Выбрана цель: ${target.data.name} на позиции ${position}`);
        
        this.executeAttack(position);
    }

    executeAttack(targetPosition) {
        const hero = this.battleGrid.allies[3];
        const target = this.battleGrid.enemies[targetPosition];
        
        if (!hero || !target) {
            console.error("❌ Ошибка атаки: герой или цель не найдены");
            return;
        }

        this.battleRound++;
        
        // Расчет урона
        const heroStats = window.game.systems.level.calculateHeroStats(hero.data, window.game.systems.bonus);
        const baseDamage = heroStats.damage;
        const targetArmor = target.data.armor || 0;
        
        // Критический удар
        const isCrit = Math.random() < (heroStats.critChance || 0.1);
        const critMultiplier = isCrit ? 2 : 1;
        const finalDamage = Math.max(1, Math.floor((baseDamage - targetArmor) * critMultiplier));
        
        // Нанесение урона
        target.currentHealth -= finalDamage;
        
        // Вампиризм
        if (heroStats.vampirism && heroStats.vampirism > 0) {
            const healAmount = Math.floor(finalDamage * heroStats.vampirism);
            hero.currentHealth = Math.min(hero.currentHealth + healAmount, hero.maxHealth);
            if (healAmount > 0) {
                this.addBattleLog(`🩸 ${hero.data.name} поглощает ${healAmount} здоровья!`);
            }
        }
        
        // Логирование
        if (isCrit) {
            this.addBattleLog(`💥 КРИТИЧЕСКИЙ УДАР! ${hero.data.name} атакует ${target.data.name} и наносит ${finalDamage} урона!`);
        } else {
            this.addBattleLog(`🗡️ ${hero.data.name} атакует ${target.data.name} и наносит ${finalDamage} урона!`);
        }
        
        // Проверка смерти цели
        if (target.currentHealth <= 0) {
            target.currentHealth = 0;
            this.addBattleLog(`💀 ${target.data.name} повержен!`);
            
            // Проверка конца боя
            if (this.isBattleOver()) {
                this.endTacticalBattle(true);
                return;
            }
        }
        
        // Обновление интерфейса
        this.updateBattleDisplay();
        
        // Ход монстров
        setTimeout(() => this.executeMonsterTurns(), 1500);
    }

    executeMonsterTurns() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => unit && unit.currentHealth > 0);
        if (aliveMonsters.length === 0) {
            this.endTacticalBattle(true);
            return;
        }
        
        let monsterIndex = 0;
        const executeNextMonster = () => {
            if (monsterIndex >= aliveMonsters.length) {
                // Все монстры походили
                this.updateAvailableTargets();
                this.updateBattleDisplay();
                return;
            }
            
            const monster = aliveMonsters[monsterIndex];
            this.executeMonsterAttack(monster);
            monsterIndex++;
            
            // Задержка между атаками монстров
            setTimeout(executeNextMonster, 1000);
        };
        
        executeNextMonster();
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
            hero.currentHealth = 0;
            this.addBattleLog(`💀 ${hero.data.name} повержен!`);
            this.endTacticalBattle(false);
        }
    }

    updateAvailableTargets() {
        const hero = this.battleGrid.allies[3];
        if (!hero) return;

        const attackType = this.getHeroAttackType(hero.data);
        
        if (attackType === 'ranged') {
            // Дальний бой - можно атаковать любых врагов
            this.availableTargets = [0, 1, 2, 3, 4, 5].filter(pos => {
                const unit = this.battleGrid.enemies[pos];
                return unit && unit.currentHealth > 0;
            });
        } else {
            // Ближний бой - только передняя линия
            this.availableTargets = [0, 1, 2].filter(pos => {
                const unit = this.battleGrid.enemies[pos];
                return unit && unit.currentHealth > 0;
            });
            
            // Если передняя линия пуста, можно атаковать любых врагов
            if (this.availableTargets.length === 0) {
                this.availableTargets = [0, 1, 2, 3, 4, 5].filter(pos => {
                    const unit = this.battleGrid.enemies[pos];
                    return unit && unit.currentHealth > 0;
                });
            }
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

    isBattleOver() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => unit && unit.currentHealth > 0);
        const hero = this.battleGrid.allies[3];
        return aliveMonsters.length === 0 || (hero && hero.currentHealth <= 0);
    }

    // ========== СИСТЕМА ПОБЕГА ==========
    tryToFlee() {
        const fleeChance = 0.4; // 40% шанс сбежать
        
        if (Math.random() < fleeChance) {
            this.addBattleLog("🏃 Вам удалось сбежать с поля боя!");
            this.endTacticalBattle(false, true);
        } else {
            this.addBattleLog("❌ Попытка сбежать не удалась! Противники атакуют.");
            this.executeMonsterTurns();
        }
        
        this.updateBattleDisplay();
    }

    // ========== ЗАВЕРШЕНИЕ БОЯ ==========
    endTacticalBattle(victory, fled = false) {
        if (fled) {
            // При побеге - минимальные потери
            const hero = this.battleGrid.allies[3];
            if (hero) {
                const damage = Math.floor(hero.maxHealth * 0.1); // 10% от макс здоровья
                hero.currentHealth = Math.max(1, hero.currentHealth - damage);
                this.addBattleLog(`🏃 Вы сбежали, получив ${damage} урона`);
            }
        } else if (victory) {
            // Победа - награда
            const totalReward = this.currentMonsters.reduce((sum, monster) => sum + (monster.reward || 10), 0);
            const totalExperience = this.currentMonsters.reduce((sum, monster) => sum + (monster.experience || 5), 0);
            
            this.currentHero.gold += totalReward;
            window.game.systems.level.addExperience(this.currentHero, totalExperience);
            this.currentHero.monstersKilled = (this.currentHero.monstersKilled || 0) + this.currentMonsters.length;
            
            this.addBattleLog(`🎉 ПОБЕДА! +${totalReward} золота, +${totalExperience} опыта`);
        } else {
            // Поражение
            this.currentHero.currentHealth = 1;
            this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
            this.addBattleLog("💀 ПОРАЖЕНИЕ! Герой повержен");
        }
        
        // Сохранение игры
        if (window.game) window.game.saveGame();
        
        // Завершение движения на карте
        if (this.battleContext === 'movement' && window.game.systems.map) {
            window.game.systems.map.completeMovementAfterBattle(victory && !fled);
        }
        
        this.battleActive = false;
        this.showBattleResult(victory, fled);
    }

    showBattleResult(victory, fled = false) {
        const app = document.getElementById('app');
        if (!app) return;

        let resultHTML = '';
        
        if (fled) {
            resultHTML = `
                <div class="battle-result-screen">
                    <div class="result-content flee">
                        <h2>🏃 УСПЕШНОЕ ОТСТУПЛЕНИЕ</h2>
                        <div class="result-stats">
                            <div class="stat">Вы успешно сбежали с поля боя</div>
                            <div class="stat">Получены легкие ранения</div>
                            <div class="stat">Раундов: ${this.battleRound}</div>
                        </div>
                        <button class="btn-primary" onclick="game.systems.battle.returnToGame()">
                            Продолжить
                        </button>
                    </div>
                </div>
            `;
        } else if (victory) {
            const totalReward = this.currentMonsters.reduce((sum, monster) => sum + (monster.reward || 10), 0);
            const totalExperience = this.currentMonsters.reduce((sum, monster) => sum + (monster.experience || 5), 0);
            
            resultHTML = `
                <div class="battle-result-screen">
                    <div class="result-content victory">
                        <h2>🎉 ПОБЕДА!</h2>
                        <div class="result-stats">
                            <div class="stat">Убито монстров: ${this.currentMonsters.length}</div>
                            <div class="stat">Получено золота: ${totalReward}</div>
                            <div class="stat">Получено опыта: ${totalExperience}</div>
                            <div class="stat">Потрачено раундов: ${this.battleRound}</div>
                        </div>
                        <button class="btn-primary" onclick="game.systems.battle.returnToGame()">
                            Продолжить
                        </button>
                    </div>
                </div>
            `;
        } else {
            resultHTML = `
                <div class="battle-result-screen">
                    <div class="result-content defeat">
                        <h2>💀 ПОРАЖЕНИЕ</h2>
                        <div class="result-stats">
                            <div class="stat">Герой повержен в бою</div>
                            <div class="stat">Здоровье восстановлено до 1</div>
                            <div class="stat">Потрачено раундов: ${this.battleRound}</div>
                        </div>
                        <button class="btn-primary" onclick="game.systems.battle.returnToGame()">
                            Продолжить
                        </button>
                    </div>
                </div>
            `;
        }
        
        app.innerHTML = resultHTML;
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

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
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

    updateBattleDisplay() {
        const hintElement = document.getElementById('battleHint');
        if (hintElement) {
            hintElement.textContent = this.getBattleHint();
        }
        
        // Обновляем сетку
        const alliesGrid = document.querySelector('.allies-side .grid-positions');
        const enemiesGrid = document.querySelector('.enemies-side .grid-positions');
        
        if (alliesGrid) {
            alliesGrid.innerHTML = this.renderInteractiveGrid('allies');
        }
        if (enemiesGrid) {
            enemiesGrid.innerHTML = this.renderInteractiveGrid('enemies');
        }
        
        // Обновляем статус героя и врагов
        const enemiesStatus = document.querySelector('.enemies-status');
        if (enemiesStatus) {
            enemiesStatus.innerHTML = this.renderEnemiesStatus();
        }
        
        this.updateBattleLog();
    }

    // Старый метод для совместимости
    showTacticalBattleScreen() {
        this.showInteractiveBattle();
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
        this.showInteractiveBattle();
    }
}

window.BattleSystem = BattleSystem;
console.log("📦 BattleSystem модуль загружен с интерактивным интерфейсом");
