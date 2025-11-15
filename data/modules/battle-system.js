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

    // ⭐ УПРОЩЕННЫЙ МЕТОД: Загрузка данных монстров
    async loadBattleData() {
        try {
            console.log("📥 Загружаем данные монстров...");
            
            // Загружаем обоих монстров - и enemies.json и monsters.json
            const [enemiesResponse, monstersResponse] = await Promise.all([
                fetch('data/enemies.json').catch(() => null),
                fetch('data/monsters.json').catch(() => null)
            ]);
            
            // ⭐ РАЗДЕЛЯЕМ МОНСТРОВ НА ДВА МАССИВА
            this.randomMonsters = [];  // Для случайных встреч
            this.programmedMonsters = new Map(); // Для запрограммированных монстров
            
            // Обрабатываем enemies.json (случайные монстры)
            if (enemiesResponse && enemiesResponse.ok) {
                this.randomMonsters = await enemiesResponse.json();
                console.log(`✅ Загружено случайных монстров: ${this.randomMonsters.length}`);
            } else {
                console.error("❌ enemies.json не загружен!");
                this.randomMonsters = [];
            }
            
            // Обрабатываем monsters.json (запрограммированные монстры)
            if (monstersResponse && monstersResponse.ok) {
                const programmedMonsters = await monstersResponse.json();
                programmedMonsters.forEach(monster => {
                    this.programmedMonsters.set(monster.id, monster);
                });
                console.log(`✅ Загружено запрограммированных монстров: ${programmedMonsters.length}`);
            } else {
                console.error("❌ monsters.json не загружен!");
            }
            
            // Для обратной совместимости оставляем общий массив
            this.monsters = [...this.randomMonsters, ...Array.from(this.programmedMonsters.values())];
            
            console.log(`🎯 Всего монстров: ${this.monsters.length} (случайных: ${this.randomMonsters.length}, запрограммированных: ${this.programmedMonsters.size})`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных монстров:", error);
            // ⭐ НЕ СОЗДАЕМ ТЕСТОВЫХ МОНСТРОВ
            this.randomMonsters = [];
            this.programmedMonsters = new Map();
            this.monsters = [];
            return false;
        }
    }

    // ⭐ НОВЫЙ МЕТОД: Получить случайного монстра ТОЛЬКО из enemies.json
    getRandomMonsterForMovement() {
        if (this.randomMonsters.length === 0) {
            console.error("❌ Нет случайных монстров в enemies.json!");
            return null;
        }
        
        const randomIndex = Math.floor(Math.random() * this.randomMonsters.length);
        const monster = this.randomMonsters[randomIndex];
        console.log(`🎲 Выбран случайный монстр: ${monster.name} (из enemies.json)`);
        return monster;
    }

    // ⭐ ОБНОВЛЕННЫЙ МЕТОД: Получить монстра по ID (из любого источника)
    getMonsterById(monsterId) {
        // Сначала ищем в запрограммированных монстрах
        if (this.programmedMonsters.has(monsterId)) {
            return this.programmedMonsters.get(monsterId);
        }
        
        // Затем в случайных монстрах
        const randomMonster = this.randomMonsters.find(m => m.id === monsterId);
        if (randomMonster) {
            return randomMonster;
        }
        
        console.warn(`❌ Монстр с ID ${monsterId} не найден!`);
        return null;
    }

    // ⭐ НОВЫЙ МЕТОД: Начать бой с конкретным монстром
    startBattleWithSpecificMonster(hero, specificMonster, context = 'normal') {
        if (!hero) {
            console.error("❌ Не могу начать бой: герой не передан");
            return;
        }

        // Создаем группу из конкретного монстра (обычно 1 монстр для запрограммированных встреч)
        const monsterGroup = this.generateSpecificMonsterGroup(specificMonster);
        if (!monsterGroup) return;

        this.currentHero = hero;
        this.currentMonsters = monsterGroup;
        this.setupBattleGrid(hero, monsterGroup);
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        this.battleContext = context;
        
        console.log(`⚔️ Начинаем бой с конкретным монстром: ${specificMonster.name}`);
        this.showFullscreenBattle();
    }

    // ⭐ НОВЫЙ МЕТОД: Генерация группы из конкретного монстра
    generateSpecificMonsterGroup(specificMonster) {
        if (!specificMonster) return null;

        // Для запрограммированных монстров обычно 1 монстр, но можно настроить
        const monsterCount = 1; // Можно добавить поле groupSize в будущем
        
        const monsterGroup = [];
        for (let i = 0; i < monsterCount; i++) {
            const monsterCopy = {
                ...specificMonster,
                battleId: i + 1,
                currentHealth: specificMonster.health,
                name: monsterCount > 1 ? `${specificMonster.name} ${i + 1}` : specificMonster.name,
                source: 'programmed' // Помечаем как запрограммированного монстра
            };
            monsterGroup.push(monsterCopy);
        }

        console.log(`🎯 Создана группа из ${monsterGroup.length} монстра(ов) для ${specificMonster.name}`);
        return monsterGroup;
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
        
        const baseMonster = this.getMonsterById(monsterId);
        console.log(`⚔️ Начинаем случайный бой с ${monsterGroup.length} монстрами на основе: ${baseMonster?.name || 'unknown'}`);
        this.showFullscreenBattle();
    }

    generateMonsterGroup(baseMonsterId) {
        let baseMonster = this.monsters.find(m => m.id === baseMonsterId);
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
                name: `${baseMonster.name} ${i + 1}`,
                source: 'random'
            };
            monsterGroup.push(monsterCopy);
        }

        return monsterGroup;
    }

    setupBattleGrid(hero, monsters) {
        this.battleGrid.allies = [null, null, null, null, null, null];
        this.battleGrid.enemies = [null, null, null, null, null, null];
        
        // Размещаем героя в левой части (позиции 0, 2, 4)
        this.battleGrid.allies[0] = {
            type: 'hero',
            data: hero,
            position: 0,
            maxHealth: hero.baseHealth,
            currentHealth: hero.currentHealth || hero.baseHealth
        };

        this.placeMonstersOnGrid(monsters);
        this.updateAvailableTargets();
    }

    placeMonstersOnGrid(monsters) {
        // Левая колонка (0, 2, 4) - ближний бой
        // Правая колонка (1, 3, 5) - дальний бой
        const meleePositions = [0, 2, 4];  // Левая колонка
        const rangedPositions = [1, 3, 5]; // Правая колонка
        
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
                // Если не хватает мест в нужном типе, размещаем в доступных
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

    // ========== ПОЛНОЭКРАННЫЙ ИНТЕРФЕЙС БОЯ ==========
    showFullscreenBattle() {
        const app = document.getElementById('app');
        if (!app) return;

        // ⭐ ИСПРАВЛЕНИЕ: Используем HeroSystem вместо LevelSystem
        const heroStats = window.game.systems.hero.calculateHeroStats(this.currentHero);

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
        
        // Создаем сетку 6x6 (2 колонки x 3 ряда)
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
                // ⭐ ИСПРАВЛЕНИЕ: Используем HeroSystem вместо LevelSystem
                const heroStats = window.game.systems.hero.calculateHeroStats(unit.data);
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
        const hero = this.battleGrid.allies[0]; // Герой теперь на позиции 0
        const target = this.battleGrid.enemies[targetPosition];
        
        if (!hero || !target) {
            console.error("❌ Ошибка атаки: герой или цель не найдены");
            return;
        }

        this.battleRound++;
        
        // ⭐ ИСПРАВЛЕНИЕ: Используем HeroSystem вместо LevelSystem
        const heroStats = window.game.systems.hero.calculateHeroStats(hero.data);
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
        const hero = this.battleGrid.allies[0];
        if (!hero) return;
        
        const monsterDamage = monster.data.damage || 5;
        // ⭐ ИСПРАВЛЕНИЕ: Используем HeroSystem вместо LevelSystem
        const heroArmor = window.game.systems.hero.calculateHeroStats(hero.data).armor;
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
        const hero = this.battleGrid.allies[0];
        if (!hero) return;

        const attackType = this.getHeroAttackType(hero.data);
        
        if (attackType === 'ranged') {
            // Дальний бой - можно атаковать любых врагов
            this.availableTargets = [0, 1, 2, 3, 4, 5].filter(pos => {
                const unit = this.battleGrid.enemies[pos];
                return unit && unit.currentHealth > 0;
            });
        } else {
            // Ближний бой - только левая колонка (0, 2, 4)
            this.availableTargets = [0, 2, 4].filter(pos => {
                const unit = this.battleGrid.enemies[pos];
                return unit && unit.currentHealth > 0;
            });
            
            // Если левая колонка пуста, можно атаковать любых врагов
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
            const hero = this.battleGrid.allies[0];
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
            
            // ⭐ ДОПОЛНИТЕЛЬНОЕ ЛОГИРОВАНИЕ ДЛЯ ЗАПРОГРАММИРОВАННЫХ МОНСТРОВ
            if (this.currentMonsters[0]?.source === 'programmed') {
                console.log(`🏆 Победа над запрограммированным монстром: ${this.currentMonsters[0].name}`);
            }
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

    // ⭐ НОВЫЙ МЕТОД: Отладочная информация о монстрах
    debugMonsterInfo() {
        console.group("🐛 BattleSystem Monster Debug");
        console.log("Всего монстров:", this.monsters.length);
        console.log("Текущие монстры в бою:", this.currentMonsters);
        console.log("Тип боя:", this.battleContext);
        
        if (this.currentMonsters.length > 0) {
            this.currentMonsters.forEach((monster, index) => {
                console.log(`Монстр ${index + 1}:`, {
                    id: monster.id,
                    name: monster.name,
                    health: monster.health,
                    damage: monster.damage,
                    source: monster.source || 'unknown'
                });
            });
        }
        console.groupEnd();
    }

    // Старый метод для совместимости
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
console.log("📦 BattleSystem модуль загружен с поддержкой конкретных монстров с карты");
