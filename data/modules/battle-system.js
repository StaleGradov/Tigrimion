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
        
        this.battleGrid = {
            allies: [null, null, null, null, null, null],
            enemies: [null, null, null, null, null, null]
        };
        this.selectedTarget = null;
        this.availableTargets = [];
        
        // ⭐ ДОБАВЛЯЕМ ЗАЩИТУ ОТ МНОЖЕСТВЕННЫХ СРАБАТЫВАНИЙ
        this.resultShown = false;
        this.battleEnding = false;
        
        console.log("✅ BattleSystem инициализирован");
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

    startBattleWithSpecificMonster(hero, specificMonster, context = 'normal') {
        if (!hero) {
            console.error("❌ Не могу начать бой: герой не передан");
            return;
        }

        // ⭐ СБРАСЫВАЕМ ФЛАГИ ПРИ НАЧАЛЕ НОВОГО БОЯ
        this.resultShown = false;
        this.battleEnding = false;

        const monsterGroup = this.generateSpecificMonsterGroup(specificMonster);
        if (!monsterGroup) return;

        this.currentHero = hero;
        this.currentMonsters = monsterGroup;
        
        // ⭐ ИСПРАВЛЕНИЕ: Используем актуальные статы героя
        const heroStats = this.getHeroStatsForBattle();
        
        this.setupBattleGrid(hero, monsterGroup, heroStats);
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        this.battleContext = context;
        
        console.log(`⚔️ Начинаем бой с конкретным монстром: ${specificMonster.name}`);
        this.showFullscreenBattle();
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

    startBattleWithMonster(hero, monsterId, context = 'normal') {
        if (!hero) {
            console.error("❌ Не могу начать бой: герой не передан");
            return;
        }

        // ⭐ СБРАСЫВАЕМ ФЛАГИ ПРИ НАЧАЛЕ НОВОГО БОЯ
        this.resultShown = false;
        this.battleEnding = false;

        const monsterGroup = this.generateMonsterGroup(monsterId);
        if (!monsterGroup) return;

        this.currentHero = hero;
        this.currentMonsters = monsterGroup;
        
        // ⭐ ИСПРАВЛЕНИЕ: Используем актуальные статы героя
        const heroStats = this.getHeroStatsForBattle();
        
        this.setupBattleGrid(hero, monsterGroup, heroStats);
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        this.battleContext = context;
        
        console.log(`⚔️ Начинаем бой с ${monsterGroup.length} монстрами`);
        this.showFullscreenBattle();
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

    showFullscreenBattle() {
        const app = document.getElementById('app');
        if (!app) return;

        // ⭐ ИСПРАВЛЕНИЕ: Получаем актуальные статы
        const heroStats = this.getHeroStatsForBattle();

        app.innerHTML = `
            <div class="battle-screen-fullscreen">
                <header class="battle-header">
                    <div class="header-left">
                        <h2>⚔️ ТАКТИЧЕСКИЙ БОЙ</h2>
                        <div class="battle-round">Раунд: ${this.battleRound}</div>
                    </div>
                    <button class="btn-battle-back" onclick="game.systems.battle.returnToGame()">
                        ← Назад к карте
                    </button>
                </header>
                
                <div class="battle-main-area">
                    <div class="battle-grid-fullscreen">
                        <div class="grid-side allies-side">
                            <h3 class="side-title">ВАШ ОТРЯД</h3>
                            <div class="grid-container-6x6">
                                ${this.renderFullscreenGrid('allies')}
                            </div>
                        </div>
                        
                        <div class="vs-separator">
                            <div class="vs-text">VS</div>
                        </div>
                        
                        <div class="grid-side enemies-side">
                            <h3 class="side-title">ПРОТИВНИКИ</h3>
                            <div class="grid-container-6x6">
                                ${this.renderFullscreenGrid('enemies')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="battle-controls-fullscreen">
                    <div class="battle-hint-fullscreen" id="battleHint">
                        ${this.getBattleHint()}
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
    }

    renderFullscreenGrid(side) {
        const grid = this.battleGrid[side];
        let html = '';
        
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const position = row * 2 + col;
                const unit = grid[position];
                html += this.renderFullscreenGridCell(unit, position, side);
            }
        }
        
        return html;
    }

    renderFullscreenGridCell(unit, position, side) {
        const isEnemy = side === 'enemies';
        const isEmpty = !unit;
        
        let cellClass = 'grid-cell-fullscreen';
        let content = '';
        let onClick = '';
        
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
                // ⭐ ИСПРАВЛЕНИЕ: Используем актуальные статы
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

    selectTarget(position) {
        // ⭐ ЗАЩИТА: Если бой уже заканчивается, игнорируем клики
        if (this.battleEnding || this.resultShown) {
            console.log("🛑 Бой уже завершается, игнорируем клик");
            return;
        }

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
        this.executeAttack(position);
    }

    executeAttack(targetPosition) {
        // ⭐ ЗАЩИТА: Если бой уже заканчивается, игнорируем клики
        if (this.battleEnding || this.resultShown) {
            console.log("🛑 Бой уже завершается, игнорируем клик");
            return;
        }

        const hero = this.battleGrid.allies[0];
        const target = this.battleGrid.enemies[targetPosition];
        
        if (!hero || !target) {
            console.error("❌ Ошибка атаки: герой или цель не найдены");
            return;
        }

        // ⭐ ЗАЩИТА: Если цель уже мертва, игнорируем
        if (target.currentHealth <= 0) {
            console.log("🛑 Цель уже мертва, игнорируем атаку");
            return;
        }

        this.battleRound++;
        
        const heroStats = this.getHeroStatsForBattle();
        const baseDamage = heroStats.damage;
        const targetArmor = target.data.armor || 0;
        
        const isCrit = Math.random() < (heroStats.critChance || 0.1);
        const critMultiplier = isCrit ? 2 : 1;
        const finalDamage = Math.max(1, Math.floor((baseDamage - targetArmor) * critMultiplier));
        
        target.currentHealth -= finalDamage;
        
        if (heroStats.vampirism && heroStats.vampirism > 0) {
            const healAmount = Math.floor(finalDamage * heroStats.vampirism);
            hero.currentHealth = Math.min(hero.currentHealth + healAmount, hero.maxHealth);
            if (healAmount > 0) {
                this.addBattleLog(`🩸 ${hero.data.name} поглощает ${healAmount} здоровья!`);
            }
        }
        
        if (isCrit) {
            this.addBattleLog(`💥 КРИТИЧЕСКИЙ УДАР! ${hero.data.name} атакует ${target.data.name} и наносит ${finalDamage} урона!`);
        } else {
            this.addBattleLog(`🗡️ ${hero.data.name} атакует ${target.data.name} и наносит ${finalDamage} урона!`);
        }
        
        if (target.currentHealth <= 0) {
            target.currentHealth = 0;
            this.addBattleLog(`💀 ${target.data.name} повержен!`);
            
            if (this.isBattleOver()) {
                // ⭐ ЗАЩИТА: Помечаем что бой завершается
                this.battleEnding = true;
                setTimeout(() => {
                    this.endTacticalBattle(true);
                    this.battleEnding = false;
                }, 1000);
                return;
            }
        }
        
        this.updateBattleDisplay();
        
        // ⭐ ЗАЩИТА: Добавляем задержку перед ходом монстров
        setTimeout(() => {
            if (!this.battleEnding && !this.resultShown) {
                this.executeMonsterTurns();
            }
        }, 1500);
    }

    executeMonsterTurns() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => unit && unit.currentHealth > 0);
        if (aliveMonsters.length === 0) {
            // ⭐ ЗАЩИТА: Помечаем что бой завершается
            this.battleEnding = true;
            setTimeout(() => {
                this.endTacticalBattle(true);
                this.battleEnding = false;
            }, 1000);
            return;
        }
        
        let monsterIndex = 0;
        const executeNextMonster = () => {
            if (monsterIndex >= aliveMonsters.length) {
                this.updateAvailableTargets();
                this.updateBattleDisplay();
                return;
            }
            
            const monster = aliveMonsters[monsterIndex];
            this.executeMonsterAttack(monster);
            monsterIndex++;
            
            setTimeout(executeNextMonster, 1000);
        };
        
        executeNextMonster();
    }

    executeMonsterAttack(monster) {
        const hero = this.battleGrid.allies[0];
        if (!hero) return;
        
        const monsterDamage = monster.data.damage || 5;
        // ⭐ ИСПРАВЛЕНИЕ: Используем актуальные статы
        const heroStats = this.getHeroStatsForBattle();
        const finalDamage = Math.max(1, monsterDamage - heroStats.armor);
        
        hero.currentHealth -= finalDamage;
        this.addBattleLog(`👹 ${monster.data.name} атакует героя и наносит ${finalDamage} урона!`);
        
        if (hero.currentHealth <= 0) {
            hero.currentHealth = 0;
            this.addBattleLog(`💀 ${hero.data.name} повержен!`);
            // ⭐ ЗАЩИТА: Помечаем что бой завершается
            this.battleEnding = true;
            setTimeout(() => {
                this.endTacticalBattle(false);
                this.battleEnding = false;
            }, 1000);
        }
    }

    updateAvailableTargets() {
        const hero = this.battleGrid.allies[0];
        if (!hero) return;

        const attackType = this.getHeroAttackType(hero.data);
        
        if (attackType === 'ranged') {
            this.availableTargets = [0, 1, 2, 3, 4, 5].filter(pos => {
                const unit = this.battleGrid.enemies[pos];
                return unit && unit.currentHealth > 0;
            });
        } else {
            this.availableTargets = [0, 2, 4].filter(pos => {
                const unit = this.battleGrid.enemies[pos];
                return unit && unit.currentHealth > 0;
            });
            
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
        const hero = this.battleGrid.allies[0];
        return aliveMonsters.length === 0 || (hero && hero.currentHealth <= 0);
    }

    tryToFlee() {
        // ⭐ ЗАЩИТА: Если бой уже заканчивается, игнорируем клики
        if (this.battleEnding || this.resultShown) {
            console.log("🛑 Бой уже завершается, игнорируем попытку сбежать");
            return;
        }

        const fleeChance = 0.4;
        
        if (Math.random() < fleeChance) {
            this.addBattleLog("🏃 Вам удалось сбежать с поля боя!");
            this.endTacticalBattle(false, true);
        } else {
            this.addBattleLog("❌ Попытка сбежать не удалась! Противники атакуют.");
            this.executeMonsterTurns();
        }
        
        this.updateBattleDisplay();
    }

    endTacticalBattle(victory, fled = false) {
    // ⭐ ЗАЩИТА: Если результат уже показан, выходим
    if (this.resultShown) {
        console.log("🛑 Результат боя уже показан, игнорируем");
        return;
    }
    
    this.resultShown = true;

    if (fled) {
        const hero = this.battleGrid.allies[0];
        if (hero) {
            const damage = Math.floor(hero.maxHealth * 0.1);
            hero.currentHealth = Math.max(1, hero.currentHealth - damage);
            this.addBattleLog(`🏃 Вы сбежали, получив ${damage} урона`);
        }
    } else if (victory) {
        const totalReward = this.currentMonsters.reduce((sum, monster) => sum + (monster.reward || 10), 0);
        const totalExperience = this.currentMonsters.reduce((sum, monster) => sum + (monster.experience || 5), 0);
        
        this.currentHero.gold += totalReward;
        window.game.systems.level.addExperience(this.currentHero, totalExperience);
        this.currentHero.monstersKilled = (this.currentHero.monstersKilled || 0) + this.currentMonsters.length;
        
        this.addBattleLog(`🎉 ПОБЕДА! +${totalReward} золота, +${totalExperience} опыта`);
    } else {
        // ⭐ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: Устанавливаем здоровье в 1 и запускаем специальную регенерацию
        this.currentHero.currentHealth = 1;
        this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
        this.addBattleLog("💀 ПОРАЖЕНИЕ! Герой повержен. Здоровье восстановится до 1 и начнет регенерировать.");
        
        // ⭐ ЗАПУСКАЕМ СПЕЦИАЛЬНУЮ РЕГЕНЕРАЦИЮ ПОСЛЕ СМЕРТИ
        if (window.game && window.game.handleHeroDeath) {
            window.game.handleHeroDeath();
        }
    }
    
    // ⭐ ВАЖНОЕ ИСПРАВЛЕНИЕ: Обновляем здоровье героя в основной системе
    if (this.currentHero && window.game.systems.hero) {
        // Синхронизируем здоровье из боевой системы в основную систему героя
        this.currentHero.currentHealth = this.battleGrid.allies[0]?.currentHealth || this.currentHero.currentHealth;
        
        // ⭐ ОБНОВЛЯЕМ ИНТЕРФЕЙС СРАЗУ
        window.game.systems.hero.calculateHeroStats(this.currentHero);
    }
    
    if (window.game) window.game.saveGame();
    
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
                <div class="battle-result-overlay">
                    <div class="battle-result-modal">
                        <h3>🏃 УСПЕШНОЕ ОТСТУПЛЕНИЕ</h3>
                        <div class="result-details">
                            <p>Вы успешно сбежали с поля боя</p>
                            <p>Получены легкие ранения</p>
                            <p>Раундов: ${this.battleRound}</p>
                        </div>
                        <button class="btn-primary" onclick="game.systems.battle.closeBattleResult()">
                            Продолжить
                        </button>
                    </div>
                </div>
            `;
        } else if (victory) {
            const totalReward = this.currentMonsters.reduce((sum, monster) => sum + (monster.reward || 10), 0);
            const totalExperience = this.currentMonsters.reduce((sum, monster) => sum + (monster.experience || 5), 0);
            
            resultHTML = `
                <div class="battle-result-overlay">
                    <div class="battle-result-modal">
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
                    <div class="battle-result-modal">
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
        
        // Добавляем поверх основного интерфейса боя
        const existingOverlay = document.querySelector('.battle-result-overlay');
        if (existingOverlay) existingOverlay.remove();
        
        app.insertAdjacentHTML('beforeend', resultHTML);
    }

    // Новый метод для закрытия окна результатов
    closeBattleResult() {
        const overlay = document.querySelector('.battle-result-overlay');
        if (overlay) overlay.remove();
        
        this.returnToGame();
    }

    returnToGame() {
        // ⭐ СБРАСЫВАЕМ ФЛАГИ ПРИ ВОЗВРАТЕ В ИГРУ
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
        
        const alliesGrid = document.querySelector('.allies-side .grid-container-6x6');
        const enemiesGrid = document.querySelector('.enemies-side .grid-container-6x6');
        
        if (alliesGrid) {
            alliesGrid.innerHTML = this.renderFullscreenGrid('allies');
        }
        if (enemiesGrid) {
            enemiesGrid.innerHTML = this.renderFullscreenGrid('enemies');
        }
        
        this.updateBattleLog();
    }

    showTacticalBattleScreen() {
        this.showFullscreenBattle();
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
        this.showFullscreenBattle();
    }
}

window.BattleSystem = BattleSystem;
console.log("📦 BattleSystem модуль загружен с исправлениями здоровья и защитой от мигания");
