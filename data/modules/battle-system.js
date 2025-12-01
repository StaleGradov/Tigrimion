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
        
        // Проверяем восстановление при создании
        setTimeout(() => {
            this.recoverFromCrash();
        }, 2000);
        
        // Тактическая система
        this.currentPlayer = 1;
        this.players = {
            1: { 
                ap: 3, 
                currentAction: null,
                combo: { type: null, count: 0 },
                previousActions: [],
                patterns: []
            }
        };
        
        // Система фляги
        this.flask = {
            capacity: 10,
            currentCharges: 10,
            content: 'water',
            contentEffects: {
                water: { healPercent: 0.25, color: '#3b82f6' },
                potion: { healPercent: 0.50, color: '#ef4444' },
                elixir: { healPercent: 1.00, color: '#f59e0b' }
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
        
        // Новая система ИИ
        this.aiMemory = {
            playerPatterns: [],
            successfulCombos: [],
            failedTactics: [],
            heroWeaknesses: new Map(),
            roundAnalysis: []
        };
        
        console.log("✅ BattleSystem инициализирован с продвинутым ИИ");
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
            
            this.monsters = [...this.randomMonsters];
            
            if (this.programmedMonsters.size > 0) {
                this.monsters.push(...Array.from(this.programmedMonsters.values()));
            }
            
            console.log(`🎯 Всего монстров: ${this.monsters.length} (${this.randomMonsters.length} случайных, ${this.programmedMonsters.size} запрограммированных)`);
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
        if (!window.game.systems.map || !window.game.systems.map.currentTacticalMap) {
            console.log("🗺️ Карта не активна, используем случайных монстров");
            return this.randomMonsters;
        }

        const currentMap = window.game.systems.map.currentTacticalMap;
        
        if (!currentMap.jsonData?.meta?.monsters || !Array.isArray(currentMap.jsonData.meta.monsters)) {
            console.log("🗺️ У карты нет своих монстров, используем случайных");
            return this.randomMonsters;
        }

        const mapMonsters = currentMap.jsonData.meta.monsters
            .map(monsterId => {
                if (this.programmedMonsters.has(monsterId)) {
                    return this.programmedMonsters.get(monsterId);
                }
                const randomMonster = this.randomMonsters.find(m => m.id === monsterId);
                if (randomMonster) {
                    return randomMonster;
                }
                console.warn(`❌ Монстр с ID ${monsterId} не найден ни в запрограммированных, ни в случайных!`);
                return null;
            })
            .filter(monster => monster !== null);

        console.log(`🗺️ Загружено монстров для карты "${currentMap.name}": ${mapMonsters.length}`);
        
        if (mapMonsters.length === 0) {
            console.log("🗺️ Для карты нет валидных монстров, используем случайных");
            return this.randomMonsters;
        }
        
        return mapMonsters;
    }

    getRandomMonsterForMovement() {
        const mapMonsters = this.getMonstersForCurrentMap();
        
        if (mapMonsters.length === 0) {
            console.error("❌ Нет монстров для текущей карты!");
            return this.randomMonsters[0] || null;
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

        const monsterCountProbabilities = {
            1: 90,
            2: 5,
            3: 2,
            4: 1.5,
            5: 1,
            6: 0.5
        };

        let monsterCount = 1;
        
        const roll = Math.random() * 100;
        let probabilitySum = 0;
        
        for (let count = 1; count <= 6; count++) {
            probabilitySum += monsterCountProbabilities[count];
            if (roll <= probabilitySum) {
                monsterCount = count;
                break;
            }
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
                ai: new AdvancedTacticalAI(this, selectedMonster, this.aiMemory),
                ap: 3,
                currentAction: null,
                combo: { type: null, count: 0 },
                previousActions: [],
                role: this.determineMonsterRole(selectedMonster),
                coordination: {
                    leader: i === 0,
                    groupId: Math.floor(Math.random() * 2),
                    lastCoordinationRound: -1
                }
            };
            monsterGroup.push(monsterCopy);
        }

        console.log(`🎲 Сгенерирована группа из ${monsterCount} монстров (шанс: ${monsterCountProbabilities[monsterCount]}%):`, 
                    monsterGroup.map(m => `${m.name} [${m.role}]`));
        return monsterGroup;
    }

    determineMonsterRole(monster) {
        const damageRatio = monster.damage / (monster.health || 10);
        const defenseRatio = (monster.armor || 0) / 10;
        
        if (damageRatio > 1.5 && monster.health < 30) {
            return 'assassin';
        } else if (defenseRatio > 0.5 && monster.health > 40) {
            return 'tank';
        } else if (monster.attackType === 'ranged') {
            return 'sniper';
        } else if (damageRatio > 1.0) {
            return 'bruiser';
        } else {
            return 'support';
        }
    }

    startBattleWithMonster(hero, monsterId, context = 'movement') {
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
            previousActions: [],
            patterns: []
        };
        
        this.initializeAIMemory();
        
        const heroStats = this.getHeroStatsForBattle();
        this.setupTacticalGrid(hero, monsterGroup, heroStats);
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        this.battleContext = context;
        this.selectedTarget = null;
        this.pendingAction = null;
        
        console.log(`🎲 Контекст боя установлен: ${this.battleContext}`);
        
        if (window.game) {
            window.game.markBattleAsActive();
            console.log("🎲 Бой отмечен как активный для защиты от перезагрузки");
        }
        
        this.saveBattleState();
        
        console.log(`⚔️ Начинаем тактический бой с ${monsterGroup.length} монстрами`);
        this.showTacticalBattleInterface();
    }

    initializeAIMemory() {
        this.aiMemory = {
            playerPatterns: [],
            successfulCombos: [],
            failedTactics: [],
            heroWeaknesses: new Map(),
            roundAnalysis: [],
            teamCoordination: {
                lastSynchronizedRound: -1,
                plannedCombos: [],
                assignedTargets: new Map()
            }
        };
    }

    startBattleWithSpecificMonster(hero, specificMonster, context = 'movement') {
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
            previousActions: [],
            patterns: []
        };
        
        this.initializeAIMemory();
        
        const heroStats = this.getHeroStatsForBattle();
        this.setupTacticalGrid(hero, monsterGroup, heroStats);
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        this.battleContext = context;
        this.selectedTarget = null;
        this.pendingAction = null;
        
        console.log(`🎲 Контекст боя с конкретным монстром: ${this.battleContext}`);
        
        if (window.game) {
            window.game.markBattleAsActive();
            console.log("🎲 Бой с конкретным монстром отмечен как активный");
        }
        
        this.saveBattleState();
        
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
                ai: new AdvancedTacticalAI(this, specificMonster, this.aiMemory),
                ap: 3,
                currentAction: null,
                combo: { type: null, count: 0 },
                previousActions: [],
                role: this.determineMonsterRole(specificMonster),
                coordination: {
                    leader: i === 0,
                    groupId: 0,
                    lastCoordinationRound: -1
                }
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
        
        this.battleGrid.allies[3] = {
            type: 'hero',
            data: hero,
            position: 3,
            maxHealth: heroStats.maxHealth,
            currentHealth: heroStats.currentHealth,
            attackType: this.getHeroAttackType(hero),
            row: 'front'
        };

        this.placeMonstersOnGrid(monsters);
        this.updateAvailableTargets();
    }

    placeMonstersOnGrid(monsters) {
        this.battleGrid.enemies = [null, null, null, null, null, null];
        
        const meleeMonsters = monsters.filter(m => m.attackType === 'melee');
        const rangedMonsters = monsters.filter(m => m.attackType === 'ranged');
        
        console.log(`🎯 Размещение: ${meleeMonsters.length} ближних, ${rangedMonsters.length} дальних`);
        
        const priorityPositions = [2, 0, 4, 1, 3, 5];
        
        meleeMonsters.forEach((monster, index) => {
            let position;
            if (index < priorityPositions.length) {
                position = priorityPositions[index];
            } else {
                position = this.findFirstEmptyPosition();
            }
            
            this.placeMonsterAtPosition(monster, position, 'front');
        });
        
        rangedMonsters.forEach((monster, index) => {
            let position;
            
            for (const pos of priorityPositions) {
                if (!this.battleGrid.enemies[pos]) {
                    position = pos;
                    break;
                }
            }
            
            if (position === undefined) {
                position = this.findFirstEmptyPosition();
            }
            
            this.placeMonsterAtPosition(monster, position, 'back');
        });
        
        console.log('🎯 Итоговое размещение монстров:', this.battleGrid.enemies.map((u, i) => 
            u ? `${u.data.name} (${u.row})` : 'empty'
        ));
    }

    placeMonsterAtPosition(monster, position, row) {
        this.battleGrid.enemies[position] = {
            type: 'monster',
            data: monster,
            position: position,
            maxHealth: monster.health,
            currentHealth: monster.currentHealth,
            attackType: monster.attackType,
            row: row
        };
    }

    findFirstEmptyPosition() {
        for (let i = 0; i < 6; i++) {
            if (!this.battleGrid.enemies[i]) return i;
        }
        return 0;
    }

    getRowByPosition(position) {
        const backRowPositions = [0, 2, 4];
        const frontRowPositions = [1, 3, 5];
        
        if (frontRowPositions.includes(position)) return 'front';
        if (backRowPositions.includes(position)) return 'back';
        
        return 'front';
    }

    getAllyRowByPosition(position) {
        return [0, 2, 4].includes(position) ? 'back' : 'front';
    }

    useFlask() {
        if (this.flask.currentCharges <= 0) {
            this.addBattleLog("❌ Фляга пуста!");
            return false;
        }

        const hero = this.battleGrid.allies[3];
        if (!hero || hero.currentHealth <= 0) {
            this.addBattleLog("❌ Герой не может использовать флягу!");
            return false;
        }

        const effect = this.flask.contentEffects[this.flask.content];
        const healAmount = Math.floor(hero.maxHealth * effect.healPercent);
        const actualHeal = Math.min(healAmount, hero.maxHealth - hero.currentHealth);

        if (actualHeal <= 0) {
            this.addBattleLog("❌ Здоровье уже максимальное!");
            return false;
        }

        const oldCharges = this.flask.currentCharges;
        
        hero.currentHealth += actualHeal;
        this.flask.currentCharges -= 1;

        this.addBattleLog(`💧 Выпит глоток из фляги! +${actualHeal} HP`);
        this.updateHealthBar('allies', 3, hero.currentHealth, hero.maxHealth);
        
        setTimeout(() => {
            this.updateFlaskChargesDisplay();
        }, 100);

        console.log(`💧 Flask used: ${oldCharges} -> ${this.flask.currentCharges} charges`);
        return true;
    }

    updateFlaskChargesDisplay() {
        const flaskBar = document.querySelector('.flask-bar');
        if (!flaskBar) {
            console.log("❌ Flask bar not found in DOM");
            return;
        }

        const charges = flaskBar.querySelectorAll('.flask-charge');
        const effect = this.flask.contentEffects[this.flask.content];
        
        console.log(`🔄 Updating flask charges: ${this.flask.currentCharges}/${this.flask.capacity}`);
        
        charges.forEach((charge, index) => {
            if (index < this.flask.currentCharges) {
                charge.classList.add('active');
                charge.classList.remove('empty');
                charge.style.backgroundColor = effect.color;
                charge.style.opacity = '1';
            } else {
                charge.classList.remove('active');
                charge.classList.add('empty');
                charge.style.backgroundColor = '#4b5563';
                charge.style.opacity = '0.3';
            }
        });

        const flaskChargesText = document.getElementById('flaskCharges');
        if (flaskChargesText) {
            flaskChargesText.textContent = `${this.flask.currentCharges}/${this.flask.capacity}`;
        }
        
        const useFlaskBtn = document.getElementById('useFlaskBtn');
        if (useFlaskBtn) {
            useFlaskBtn.disabled = this.flask.currentCharges <= 0;
        }
    }

    refillFlask(content = 'water') {
        this.flask.currentCharges = this.flask.capacity;
        this.flask.content = content;
        this.addBattleLog(`🔄 Фляга наполнена ${this.getContentName(content)}`);
        this.updateFlaskUI();
    }

    getContentName(content) {
        const names = {
            water: 'водой',
            potion: 'зельем лечения',
            elixir: 'эликсиром жизни'
        };
        return names[content] || content;
    }

    updateFlaskUI() {
        const flaskContainer = document.getElementById('flaskContainer');
        const flaskContent = document.getElementById('flaskContent');
        const useFlaskBtn = document.getElementById('useFlaskBtn');

        if (flaskContainer) {
            const effect = this.flask.contentEffects[this.flask.content];
            flaskContainer.style.borderColor = effect.color;
        }

        if (flaskContent) {
            flaskContent.textContent = this.getContentName(this.flask.content);
            flaskContent.style.color = this.flask.contentEffects[this.flask.content].color;
        }

        if (useFlaskBtn) {
            useFlaskBtn.disabled = this.flask.currentCharges <= 0;
        }

        this.updateFlaskChargesDisplay();
    }

    showTacticalBattleInterface() {
        const app = document.getElementById('app');
        if (!app) return;

        const heroStats = this.getHeroStatsForBattle();
        const flaskEffect = this.flask.contentEffects[this.flask.content];
        
        app.innerHTML = `
            <div class="battle-screen-fullscreen">
                <header class="battle-header">
                    <div class="header-left">
                        <h2>⚔️ ТАКТИЧЕСКАЯ ДУЭЛЬ</h2>
                        <div class="battle-round">Раунд: ${this.battleRound}</div>
                    </div>
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
                        
                        <!-- СИСТЕМА ФЛЯГИ -->
                        <div class="flask-container" id="flaskContainer">
                            <div class="flask-header">
                                <span class="flask-title">💧 Фляга</span>
                                <span class="flask-content" id="flaskContent">${this.getContentName(this.flask.content)}</span>
                            </div>
                            <div class="flask-charges" id="flaskCharges">${this.flask.currentCharges}/${this.flask.capacity}</div>
                            <div class="flask-bar" id="flaskBar">
                                ${Array.from({length: this.flask.capacity}, (_, i) => {
                                    const isActive = i < this.flask.currentCharges;
                                    const color = isActive ? flaskEffect.color : '#4b5563';
                                    const opacity = isActive ? '1' : '0.3';
                                    return `<div class="flask-charge ${isActive ? 'active' : 'empty'}" 
                                                 style="background-color: ${color}; opacity: ${opacity}"></div>`;
                                }).join('')}
                            </div>
                            <div class="flask-actions">
                                <button class="tactical-btn flask-btn" id="useFlaskBtn" 
                                        onclick="game.systems.battle.useFlask()"
                                        ${this.flask.currentCharges <= 0 ? 'disabled' : ''}>
                                    <span class="btn-icon">💧</span>
                                    <span class="btn-text">Выпить глоток</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="tactical-actions">
                            <button class="tactical-btn attack" onclick="game.systems.battle.handlePlayerAction('attack')">
                                <span class="btn-icon">⚔️</span>
                                <span class="btn-text">Атака</span>
                                <span class="btn-cost">(1 ОД)</span>
                                <div class="tooltip">
                                    <div class="tooltip-title">⚔️ Атака</div>
                                    <div class="tooltip-desc">Базовая атака оружием</div>
                                    <div class="tooltip-cost">Стоимость: 1 ОД</div>
                                    <div class="tooltip-combo">
                                        <div class="combo-stage"><span class="combo-count">x1:</span><span class="combo-effect">100% урона</span></div>
                                        <div class="combo-stage"><span class="combo-count">x2:</span><span class="combo-effect">200% урона</span></div>
                                        <div class="combo-stage"><span class="combo-count">x3:</span><span class="combo-effect">400% урона</span></div>
                                        <div class="combo-stage"><span class="combo-count">x4:</span><span class="combo-effect">800% урона</span></div>
                                    </div>
                                </div>
                            </button>
                            
                            <button class="tactical-btn strong-attack" onclick="game.systems.battle.handlePlayerAction('strongAttack')">
                                <span class="btn-icon">💥</span>
                                <span class="btn-text">Силовая</span>
                                <span class="btn-cost">(2 ОД)</span>
                                <div class="tooltip">
                                    <div class="tooltip-title">💥 Силовая атака</div>
                                    <div class="tooltip-desc">Мощный удар с повышенным уроном</div>
                                    <div class="tooltip-cost">Стоимость: 2 ОД</div>
                                    <div class="tooltip-combo">
                                        <div class="combo-stage"><span class="combo-count">x1:</span><span class="combo-effect">250% урона</span></div>
                                        <div class="combo-stage"><span class="combo-count">x2:</span><span class="combo-effect">500% урона</span></div>
                                        <div class="combo-stage"><span class="combo-count">x3:</span><span class="combo-effect">1000% урона</span></div>
                                        <div class="combo-stage"><span class="combo-count">x4:</span><span class="combo-effect">2000% урона</span></div>
                                    </div>
                                </div>
                            </button>
                            
                            <button class="tactical-btn crushing-attack" onclick="game.systems.battle.handlePlayerAction('crushingAttack')">
                                <span class="btn-icon">💢</span>
                                <span class="btn-text">Сокрушительная</span>
                                <span class="btn-cost">(4 ОД)</span>
                                <div class="tooltip">
                                    <div class="tooltip-title">💢 Сокрушительная атака</div>
                                    <div class="tooltip-desc">Сверхмощный удар, пробивающий любую защиту</div>
                                    <div class="tooltip-cost">Стоимость: 4 ОД</div>
                                    <div class="tooltip-combo">
                                        <div class="combo-stage"><span class="combo-count">x1:</span><span class="combo-effect">750% урона</span></div>
                                        <div class="combo-stage"><span class="combo-count">x2:</span><span class="combo-effect">1500% урона</span></div>
                                        <div class="combo-stage"><span class="combo-count">x3:</span><span class="combo-effect">3000% урона</span></div>
                                        <div class="combo-stage"><span class="combo-count">x4:</span><span class="combo-effect">6000% урона</span></div>
                                    </div>
                                    <div class="special-effect">Игнорирует блок противника</div>
                                </div>
                            </button>
                            
                            <button class="tactical-btn block" onclick="game.systems.battle.handlePlayerAction('block')">
                                <span class="btn-icon">🛡️</span>
                                <span class="btn-text">Блок</span>
                                <span class="btn-cost">(1 ОД)</span>
                                <div class="tooltip">
                                    <div class="tooltip-title">🛡️ Блок</div>
                                    <div class="tooltip-desc">Защитная стойка, снижает получаемый урон</div>
                                    <div class="tooltip-cost">Стоимость: 1 ОД</div>
                                    <div class="tooltip-combo">
                                        <div class="combo-stage"><span class="combo-count">x1:</span><span class="combo-effect">50% блок +25% отражение +1ОД</span></div>
                                        <div class="combo-stage"><span class="combo-count">x2:</span><span class="combo-effect">75% блок +50% отражение +2ОД</span></div>
                                        <div class="combo-stage"><span class="combo-count">x3:</span><span class="combo-effect">100% блок +75% отражение +3ОД</span></div>
                                        <div class="combo-stage"><span class="combo-count">x4:</span><span class="combo-effect">100% блок +100% отражение +4ОД</span></div>
                                    </div>
                                    <div class="special-effect">Отраженный урон возвращается атакующему</div>
                                </div>
                            </button>
                            
                            <button class="tactical-btn break-block" onclick="game.systems.battle.handlePlayerAction('breakBlock')">
                                <span class="btn-icon">⚡</span>
                                <span class="btn-text">Пробитие</span>
                                <span class="btn-cost">(1 ОД)</span>
                                <div class="tooltip">
                                    <div class="tooltip-title">⚡ Пробитие блока</div>
                                    <div class="tooltip-desc">Специальная атака, эффективная против защиты</div>
                                    <div class="tooltip-cost">Стоимость: 1 ОД</div>
                                    <div class="tooltip-combo">
                                        <div class="combo-stage"><span class="combo-count">x1:</span><span class="combo-effect">50%/200% урона</span></div>
                                        <div class="combo-stage"><span class="combo-count">x2:</span><span class="combo-effect">100%/300% урона</span></div>
                                        <div class="combo-stage"><span class="combo-count">x3:</span><span class="combo-effect">150%/400% урона</span></div>
                                        <div class="combo-stage"><span class="combo-count">x4:</span><span class="combo-effect">200%/500% урона</span></div>
                                    </div>
                                    <div class="special-effect">Без блока/С блоком противника</div>
                                </div>
                            </button>
                            
                            <button class="tactical-btn rest" onclick="game.systems.battle.handlePlayerAction('rest')">
                                <span class="btn-icon">🌀</span>
                                <span class="btn-text">Отдых</span>
                                <span class="btn-cost">(1 ОД)</span>
                                <div class="tooltip">
                                    <div class="tooltip-title">🌀 Отдых</div>
                                    <div class="tooltip-desc">Восстановление сил и здоровья</div>
                                    <div class="tooltip-cost">Стоимость: 1 ОД</div>
                                    <div class="tooltip-combo">
                                        <div class="combo-stage"><span class="combo-count">x1:</span><span class="combo-effect">+1 ОД +5% HP</span></div>
                                        <div class="combo-stage"><span class="combo-count">x2:</span><span class="combo-effect">+2 ОД +10% HP</span></div>
                                        <div class="combo-stage"><span class="combo-count">x3:</span><span class="combo-effect">+3 ОД +15% HP</span></div>
                                        <div class="combo-stage"><span class="combo-count">x4:</span><span class="combo-effect">+4 ОД +20% HP</span></div>
                                    </div>
                                </div>
                            </button>
                            
                            <button class="tactical-btn heal" onclick="game.systems.battle.handlePlayerAction('heal')">
                                <span class="btn-icon">❤️</span>
                                <span class="btn-text">Лечение</span>
                                <span class="btn-cost">(1 ОД)</span>
                                <div class="tooltip">
                                    <div class="tooltip-title">❤️ Лечение</div>
                                    <div class="tooltip-desc">Восстановление здоровья</div>
                                    <div class="tooltip-cost">Стоимость: 1 ОД</div>
                                    <div class="tooltip-combo">
                                        <div class="combo-stage"><span class="combo-count">x1:</span><span class="combo-effect">10% от макс. HP</span></div>
                                        <div class="combo-stage"><span class="combo-count">x2:</span><span class="combo-effect">20% от макс. HP</span></div>
                                        <div class="combo-stage"><span class="combo-count">x3:</span><span class="combo-effect">40% от макс. HP</span></div>
                                        <div class="combo-stage"><span class="combo-count">x4:</span><span class="combo-effect">80% от макс. HP</span></div>
                                    </div>
                                </div>
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

        setTimeout(() => {
            console.log("🔧 Применяем экстренное исправление полосок здоровья...");
            
            const healthContainers = document.querySelectorAll('.unit-health-container');
            const healthBars = document.querySelectorAll('.health-bar-fullscreen');
            const healthFills = document.querySelectorAll('.health-fill');
            const healthTexts = document.querySelectorAll('.health-text');
            
            healthContainers.forEach(el => {
                el.style.display = 'flex';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
            });
            
            healthBars.forEach(el => {
                el.style.display = 'block';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
            });
            
            healthFills.forEach(el => {
                el.style.display = 'block';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
            });
            
            healthTexts.forEach(el => {
                el.style.display = 'block';
                el.style.visibility = 'visible';
                el.style.opacity = '1';
            });
            
            console.log(`🔧 Исправлено: ${healthContainers.length} контейнеров, ${healthFills.length} полосок`);
        }, 100);

        this.updateTacticalUI();
        this.updateFlaskChargesDisplay();
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
        
        const aliveFrontRowMonsters = this.battleGrid.enemies.filter((unit, position) => 
            unit && unit.currentHealth > 0 && unit.row === 'front'
        ).length;
        
        console.log(`🎯 Живых монстров в переднем ряду: ${aliveFrontRowMonsters}`);
        
        this.battleGrid.enemies.forEach((unit, position) => {
            if (unit && unit.currentHealth > 0) {
                if (heroAttackType === 'melee') {
                    if (unit.row === 'front') {
                        this.availableTargets.push(position);
                    }
                    else if (aliveFrontRowMonsters === 0) {
                        this.availableTargets.push(position);
                    }
                } else {
                    this.availableTargets.push(position);
                }
            }
        });
        
        console.log(`🎯 Доступные цели для ${heroAttackType} атаки:`, this.availableTargets.map(pos => {
            const unit = this.battleGrid.enemies[pos];
            return unit ? `${unit.data.name} (${unit.row})` : 'unknown';
        }));
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
        
        if (action === 'block') {
            const blockAPBonus = this.getBlockAPBonus(player.combo.count);
            player.ap += blockAPBonus;
            this.addBattleLog(`🛡️ Блок дает +${blockAPBonus} ОД!`);
        }
        
        if (action === 'heal') {
            this.executeHealAction(player);
        }
        
        if (action === 'rest') {
            this.executeRestAction(player);
        }
        
        setTimeout(() => {
            this.executeEnemyTurns();
        }, 800);
        
        this.updateTacticalUI();
    }

    executeHealAction(player) {
        const hero = this.battleGrid.allies[3];
        if (!hero) return;
        
        const healEfficiency = this.getHealEfficiency(player.combo.count);
        const healAmount = Math.floor(hero.maxHealth * healEfficiency);
        const actualHeal = Math.min(healAmount, hero.maxHealth - hero.currentHealth);
        
        hero.currentHealth += actualHeal;
        
        this.addBattleLog(`❤️ Вы лечитесь на ${actualHeal} HP (${healEfficiency * 100}% от макс. здоровья)`);
        
        this.updateHealthBar('allies', 3, hero.currentHealth, hero.maxHealth);
    }

    executeRestAction(player) {
        const hero = this.battleGrid.allies[3];
        if (!hero) return;
        
        const restEfficiency = this.getRestEfficiency(player.combo.count);
        
        player.ap += restEfficiency.ap;
        
        if (restEfficiency.healPercent > 0) {
            const healAmount = Math.floor(hero.maxHealth * restEfficiency.healPercent);
            const actualHeal = Math.min(healAmount, hero.maxHealth - hero.currentHealth);
            
            if (actualHeal > 0) {
                hero.currentHealth += actualHeal;
                this.updateHealthBar('allies', 3, hero.currentHealth, hero.maxHealth);
                this.addBattleLog(`🌀 Вы отдыхаете (+${restEfficiency.ap} ОД) и восстанавливаете ${actualHeal} HP`);
            } else {
                this.addBattleLog(`🌀 Вы отдыхаете (+${restEfficiency.ap} ОД)`);
            }
        } else {
            this.addBattleLog(`🌀 Вы отдыхаете (+${restEfficiency.ap} ОД)`);
        }
    }

    executeEnemyTurns() {
        const aliveMonsters = this.battleGrid.enemies.filter(unit => 
            unit && unit.currentHealth > 0
        );
        
        if (aliveMonsters.length === 0) {
            this.resolveTacticalTurn();
            return;
        }
        
        this.analyzeBattleSituation();
        this.coordinateMonsterActions(aliveMonsters);
        this.executeCoordinatedMonsterTurns(aliveMonsters);
    }

    analyzeBattleSituation() {
        const hero = this.battleGrid.allies[3];
        if (!hero) return;
        
        const analysis = {
            round: this.battleRound,
            heroHealthPercent: hero.currentHealth / hero.maxHealth,
            heroAction: this.players[1].currentAction,
            heroCombo: this.players[1].combo,
            heroAP: this.players[1].ap,
            monsterCount: this.currentMonsters.filter(m => m.currentHealth > 0).length,
            threats: [],
            opportunities: []
        };
        
        const heroCombo = this.players[1].combo;
        if (heroCombo.count >= 2) {
            analysis.threats.push({
                type: 'player_combo',
                severity: heroCombo.count / 4,
                action: heroCombo.type
            });
        }
        
        if (this.players[1].ap >= 3) {
            analysis.threats.push({
                type: 'player_high_ap',
                severity: this.players[1].ap / 10
            });
        }
        
        if (hero.currentHealth / hero.maxHealth < 0.4) {
            analysis.opportunities.push({
                type: 'hero_low_health',
                value: 1 - (hero.currentHealth / hero.maxHealth)
            });
        }
        
        if (hero.currentHealth / hero.maxHealth > 0.8 && this.players[1].ap <= 2) {
            analysis.opportunities.push({
                type: 'hero_resting',
                value: 0.7
            });
        }
        
        this.aiMemory.roundAnalysis.push(analysis);
        if (this.aiMemory.roundAnalysis.length > 3) {
            this.aiMemory.roundAnalysis.shift();
        }
        
        return analysis;
    }

    coordinateMonsterActions(aliveMonsters) {
        if (aliveMonsters.length <= 1) return;
        
        const currentRound = this.battleRound;
        const lastSync = this.aiMemory.teamCoordination.lastSynchronizedRound;
        
        if (currentRound - lastSync >= 2 || 
            aliveMonsters.length < this.currentMonsters.length) {
            
            console.log(`🤝 Координация действий монстров (раунд ${currentRound})`);
            
            const tanks = aliveMonsters.filter(m => m.data.role === 'tank');
            const assassins = aliveMonsters.filter(m => m.data.role === 'assassin');
            const snipers = aliveMonsters.filter(m => m.data.role === 'sniper');
            const supporters = aliveMonsters.filter(m => m.data.role === 'support');
            
            const plannedCombo = this.planTeamCombo(tanks, assassins, snipers, supporters);
            this.aiMemory.teamCoordination.plannedCombos = plannedCombo;
            
            this.assignTargets(aliveMonsters);
            
            this.aiMemory.teamCoordination.lastSynchronizedRound = currentRound;
        }
    }

    planTeamCombo(tanks, assassins, snipers, supporters) {
        const combos = [];
        const hero = this.battleGrid.allies[3];
        
        if (!hero) return combos;
        
        if (tanks.length > 0 && assassins.length > 0) {
            combos.push({
                type: 'tank_assassin',
                tank: tanks[0].data.battleId,
                assassin: assassins[0].data.battleId,
                sequence: ['block', 'strongAttack']
            });
        }
        
        if (supporters.length > 0 && snipers.length > 0) {
            combos.push({
                type: 'support_sniper',
                support: supporters[0].data.battleId,
                sniper: snipers[0].data.battleId,
                sequence: ['heal', 'crushingAttack']
            });
        }
        
        if (this.players[1].currentAction === 'block') {
            const breakers = [...assassins, ...snipers].slice(0, 2);
            if (breakers.length >= 2) {
                combos.push({
                    type: 'double_break',
                    breakers: breakers.map(m => m.data.battleId),
                    sequence: ['breakBlock', 'breakBlock']
                });
            }
        }
        
        return combos;
    }

    assignTargets(aliveMonsters) {
        const hero = this.battleGrid.allies[3];
        if (!hero) return;
        
        this.aiMemory.teamCoordination.assignedTargets.clear();
        
        aliveMonsters.forEach(monsterUnit => {
            const monster = monsterUnit.data;
            let targetStrategy;
            
            switch(monster.role) {
                case 'assassin':
                    targetStrategy = 'finish_low_health';
                    break;
                case 'tank':
                    const weakestAlly = this.findWeakestMonster(aliveMonsters);
                    targetStrategy = weakestAlly ? 'protect_ally' : 'draw_attention';
                    break;
                case 'sniper':
                    targetStrategy = 'safe_damage';
                    break;
                case 'support':
                    targetStrategy = 'heal_ally';
                    break;
                default:
                    targetStrategy = 'default_attack';
            }
            
            this.aiMemory.teamCoordination.assignedTargets.set(
                monster.battleId,
                targetStrategy
            );
        });
    }

    findWeakestMonster(aliveMonsters) {
        let weakest = null;
        let lowestHealth = Infinity;
        
        aliveMonsters.forEach(monsterUnit => {
            const healthPercent = monsterUnit.currentHealth / monsterUnit.maxHealth;
            if (healthPercent < lowestHealth && healthPercent < 0.5) {
                lowestHealth = healthPercent;
                weakest = monsterUnit.data;
            }
        });
        
        return weakest;
    }

    executeCoordinatedMonsterTurns(aliveMonsters) {
        const executionOrder = this.determineExecutionOrder(aliveMonsters);
        this.executeNextMonsterInOrder(executionOrder, 0);
    }

    determineExecutionOrder(aliveMonsters) {
        const order = [...aliveMonsters];
        
        order.sort((a, b) => {
            const rolePriority = {
                'support': 0,
                'tank': 1,
                'assassin': 2,
                'sniper': 3,
                'bruiser': 4
            };
            
            const priorityA = rolePriority[a.data.role] || 5;
            const priorityB = rolePriority[b.data.role] || 5;
            
            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }
            
            const healthPercentA = a.currentHealth / a.maxHealth;
            const healthPercentB = b.currentHealth / b.maxHealth;
            
            return healthPercentA - healthPercentB;
        });
        
        return order;
    }

    executeNextMonsterInOrder(monsters, index) {
        if (index >= monsters.length) {
            setTimeout(() => {
                this.resolveTacticalTurn();
            }, 500);
            return;
        }
        
        const monsterUnit = monsters[index];
        const monster = monsterUnit.data;
        
        // ПРОВЕРЯЕМ НАЛИЧИЕ ИИ
        if (!monster.ai) {
            console.error(`❌ У монстра ${monster.name} нет ИИ! Создаем базовый ИИ...`);
            monster.ai = new AdvancedTacticalAI(this, monster, this.aiMemory);
        }
        
        try {
            const coordinatedAction = this.getCoordinatedAction(monster, monsters);
            
            monster.currentAction = coordinatedAction;
            monster.ap -= this.actionsCost[coordinatedAction];
            
            if (monster.combo.type === coordinatedAction && monster.combo.count < 4) {
                monster.combo.count++;
            } else {
                monster.combo.type = coordinatedAction;
                monster.combo.count = 1;
            }

            monster.previousActions.unshift(this.getActionName(coordinatedAction));
            if (monster.previousActions.length > 2) {
                monster.previousActions.pop();
            }

            this.addBattleLog(`👹 ${monster.name} использует: ${this.getActionName(coordinatedAction)}`);
            
            this.executeMonsterAction(monster, monsterUnit);
            this.updateMonsterPanel(monster.battleId);
            this.analyzeActionResult(monster, coordinatedAction);
            
            setTimeout(() => {
                this.executeNextMonsterInOrder(monsters, index + 1);
            }, 800);
        } catch (error) {
            console.error(`❌ Ошибка при выполнении хода монстра ${monster.name}:`, error);
            // В случае ошибки используем базовое действие
            monster.currentAction = 'attack';
            monster.ap -= this.actionsCost.attack;
            
            this.addBattleLog(`👹 ${monster.name} атакует (ошибка ИИ)`);
            this.executeMonsterAction(monster, monsterUnit);
            
            setTimeout(() => {
                this.executeNextMonsterInOrder(monsters, index + 1);
            }, 800);
        }
    }

    getCoordinatedAction(monster, allMonsters) {
        const hero = this.battleGrid.allies[3];
        const heroHealthPercent = hero ? hero.currentHealth / hero.maxHealth : 1;
        
        // ПРОВЕРЯЕМ ПЛАНИРОВАННЫЕ КОМБО
        const plannedCombo = this.aiMemory?.teamCoordination?.plannedCombos?.find(
            combo => combo.tank === monster.battleId || 
                    combo.assassin === monster.battleId ||
                    combo.support === monster.battleId ||
                    combo.sniper === monster.battleId ||
                    (combo.breakers && combo.breakers.includes(monster.battleId))
        );
        
        if (plannedCombo) {
            let actionIndex = 0;
            if (plannedCombo.tank === monster.battleId) actionIndex = 0;
            else if (plannedCombo.assassin === monster.battleId) actionIndex = 1;
            else if (plannedCombo.support === monster.battleId) actionIndex = 0;
            else if (plannedCombo.sniper === monster.battleId) actionIndex = 1;
            else if (plannedCombo.breakers && plannedCombo.breakers.includes(monster.battleId)) {
                actionIndex = plannedCombo.breakers.indexOf(monster.battleId);
            }
            
            if (actionIndex < plannedCombo.sequence.length) {
                console.log(`🤝 ${monster.name} выполняет координированное действие: ${plannedCombo.sequence[actionIndex]}`);
                return plannedCombo.sequence[actionIndex];
            }
        }
        
        // ИСПРАВЛЕНИЕ: Если ИИ не инициализирован, создаем его
        if (!monster.ai) {
            console.warn(`⚠️ ИИ для ${monster.name} не инициализирован, создаем...`);
            monster.ai = new AdvancedTacticalAI(this, monster, this.aiMemory);
        }
        
        try {
            return monster.ai.decideOptimalAction(allMonsters);
        } catch (error) {
            console.error(`❌ Ошибка в decideOptimalAction для ${monster.name}:`, error);
            // Возвращаем безопасное действие по умолчанию
            return monster.ap >= 1 ? 'attack' : 'rest';
        }
    }

    // ... [остальной код BattleSystem без изменений] ...
}

// ============================================================================
// ИСПРАВЛЕННАЯ СИСТЕМА ИИ
// ============================================================================

class AdvancedTacticalAI {
    constructor(battleSystem, monster, aiMemory) {
        this.bs = battleSystem;
        this.monster = monster;
        this.aiMemory = aiMemory || { playerPatterns: [], successfulCombos: [], failedTactics: [], heroWeaknesses: new Map(), roundAnalysis: [] };
        this.personality = this.definePersonality();
        this.decisionHistory = [];
    }
    
    definePersonality() {
        try {
            const basePersonality = {
                aggressive: (this.monster.damage || 10) / 20,
                defensive: ((this.monster.armor || 0) / 10) + ((this.monster.health || 30) / 100),
                tactical: 0.5,
                adaptive: 0.3
            };
            
            const total = Object.values(basePersonality).reduce((a, b) => a + b, 0);
            const normalized = {};
            Object.keys(basePersonality).forEach(key => {
                normalized[key] = basePersonality[key] / total;
            });
            
            let dominant = 'tactical';
            let maxValue = 0;
            
            Object.keys(normalized).forEach(key => {
                if (normalized[key] > maxValue) {
                    maxValue = normalized[key];
                    dominant = key;
                }
            });
            
            this.personalityProfile = {
                type: dominant,
                traits: normalized,
                aggression: Math.min(1, (this.monster.damage || 10) / 30),
                caution: Math.min(1, ((this.monster.health || 30) / 80) + ((this.monster.armor || 0) / 20)),
                learningRate: 0.7
            };
            
            return this.personalityProfile;
        } catch (error) {
            console.error("❌ Ошибка в definePersonality:", error);
            return {
                type: 'tactical',
                traits: { aggressive: 0.25, defensive: 0.25, tactical: 0.25, adaptive: 0.25 },
                aggression: 0.5,
                caution: 0.5,
                learningRate: 0.5
            };
        }
    }
    
    decideOptimalAction(allMonsters = null) {
        try {
            const gameState = this.analyzeGameState(allMonsters);
            const availableActions = this.getAvailableActions();
            
            if (availableActions.length === 0) return 'rest';
            
            const actionScores = {};
            availableActions.forEach(action => {
                try {
                    let score = this.evaluateAction(action, gameState);
                    
                    score = this.applyPersonalityModifiers(score, action, gameState);
                    
                    score = this.applyAntiPatternPenalty(score, action);
                    
                    if (allMonsters && allMonsters.length > 1) {
                        score = this.applyTeamSynergy(score, action, allMonsters);
                    }
                    
                    actionScores[action] = score;
                } catch (error) {
                    console.error(`❌ Ошибка при оценке действия ${action}:`, error);
                    actionScores[action] = 0.1;
                }
            });
            
            const bestAction = this.selectBestAction(actionScores, gameState);
            
            this.recordDecision(bestAction, gameState, actionScores[bestAction] || 0);
            
            return bestAction;
        } catch (error) {
            console.error("❌ Ошибка в decideOptimalAction:", error);
            // Возвращаем безопасное действие по умолчанию
            return this.monster.ap >= 1 ? 'attack' : 'rest';
        }
    }
    
    analyzeGameState(allMonsters) {
        try {
            const hero = this.bs.battleGrid?.allies?.[3];
            const heroStats = this.bs.getHeroStatsForBattle ? this.bs.getHeroStatsForBattle() : { 
                damage: 10, armor: 0, maxHealth: 100, currentHealth: 100 
            };
            
            // БАЗОВЫЙ ОБЪЕКТ СОСТОЯНИЯ
            const state = {
                hero: {
                    health: hero?.currentHealth || 100,
                    maxHealth: hero?.maxHealth || 100,
                    healthPercent: hero ? (hero.currentHealth / (hero.maxHealth || 100)) : 1,
                    action: this.bs.players?.[1]?.currentAction || null,
                    combo: this.bs.players?.[1]?.combo || { type: null, count: 0 },
                    ap: this.bs.players?.[1]?.ap || 3,
                    stats: heroStats,
                    attackType: this.bs.getHeroAttackType ? this.bs.getHeroAttackType(this.bs.currentHero) : 'melee',
                    isBlocking: this.bs.players?.[1]?.currentAction === 'block',
                    blockCombo: this.bs.players?.[1]?.combo?.count || 0
                },
                
                self: {
                    health: this.monster.currentHealth || this.monster.health || 30,
                    maxHealth: this.monster.health || 30,
                    healthPercent: (this.monster.currentHealth || 30) / (this.monster.health || 30),
                    ap: this.monster.ap || 3,
                    combo: this.monster.combo || { type: null, count: 0 },
                    role: this.monster.role || 'bruiser',
                    position: this.getMonsterPosition(),
                    damage: this.monster.damage || 10,
                    armor: this.monster.armor || 0
                },
                
                team: {
                    aliveCount: allMonsters ? allMonsters.length : 1,
                    totalHealth: 0,
                    averageHealth: 0,
                    weakestAlly: null,
                    strongestAlly: null
                },
                
                tactical: {
                    round: this.bs.battleRound || 0,
                    threatLevel: this.calculateThreatLevel(),
                    opportunityLevel: this.calculateOpportunityLevel(),
                    predictedPlayerAction: this.predictPlayerAction()
                },
                
                memory: {
                    playerPatterns: this.aiMemory?.playerPatterns?.slice(-3) || [],
                    successfulActions: this.getSuccessfulActions(),
                    heroWeaknesses: this.getHeroWeaknesses(),
                    recentAnalysis: this.aiMemory?.roundAnalysis?.slice(-2) || []
                }
            };
            
            // Анализ команды
            if (allMonsters && allMonsters.length > 0) {
                let totalHealth = 0;
                let minHealth = Infinity;
                let maxHealth = 0;
                let weakest = null;
                let strongest = null;
                
                allMonsters.forEach(monsterUnit => {
                    if (!monsterUnit) return;
                    
                    const health = monsterUnit.currentHealth || monsterUnit.data?.health || 30;
                    totalHealth += health;
                    
                    if (monsterUnit.data?.battleId !== this.monster.battleId) {
                        if (health < minHealth) {
                            minHealth = health;
                            weakest = monsterUnit.data || monsterUnit;
                        }
                        
                        if (health > maxHealth) {
                            maxHealth = health;
                            strongest = monsterUnit.data || monsterUnit;
                        }
                    }
                });
                
                state.team.totalHealth = totalHealth;
                state.team.averageHealth = totalHealth / allMonsters.length;
                state.team.weakestAlly = weakest;
                state.team.strongestAlly = strongest;
            }
            
            return state;
        } catch (error) {
            console.error("❌ Ошибка в analyzeGameState:", error);
            // Возвращаем минимально работоспособное состояние
            return {
                hero: { healthPercent: 0.5, isBlocking: false, blockCombo: 0, health: 50, maxHealth: 100 },
                self: { healthPercent: 0.5, ap: 3, combo: { type: null, count: 0 } },
                tactical: { threatLevel: 0.5, opportunityLevel: 0.5, predictedPlayerAction: { action: 'attack', confidence: 0.3 } },
                memory: { playerPatterns: [], successfulActions: [], heroWeaknesses: [], recentAnalysis: [] },
                team: { aliveCount: 1, totalHealth: 30, averageHealth: 30 }
            };
        }
    }
    
    getMonsterPosition() {
        try {
            for (let i = 0; i < (this.bs.battleGrid?.enemies?.length || 0); i++) {
                const unit = this.bs.battleGrid.enemies[i];
                if (unit && unit.data?.battleId === this.monster.battleId) {
                    return {
                        index: i,
                        row: unit.row || 'front',
                        isFrontline: unit.row === 'front'
                    };
                }
            }
            return { index: -1, row: 'back', isFrontline: false };
        } catch (error) {
            console.error("❌ Ошибка в getMonsterPosition:", error);
            return { index: -1, row: 'back', isFrontline: false };
        }
    }
    
    calculateThreatLevel() {
        try {
            const hero = this.bs.battleGrid?.allies?.[3];
            if (!hero) return 0.5;
            
            let threat = 0;
            
            const playerCombo = this.bs.players?.[1]?.combo;
            if (playerCombo && playerCombo.count >= 2) {
                threat += playerCombo.count * 0.2;
                
                if (playerCombo.type === 'crushingAttack') threat += 0.3;
                if (playerCombo.type === 'strongAttack') threat += 0.2;
            }
            
            if (this.bs.players?.[1]?.ap >= 4) threat += 0.3;
            else if (this.bs.players?.[1]?.ap >= 2) threat += 0.15;
            
            const healthPercent = (this.monster.currentHealth || 30) / (this.monster.health || 30);
            if (healthPercent < 0.3) threat += 0.4;
            else if (healthPercent < 0.5) threat += 0.2;
            
            return Math.min(Math.max(threat, 0), 1);
        } catch (error) {
            console.error("❌ Ошибка в calculateThreatLevel:", error);
            return 0.5;
        }
    }
    
    calculateOpportunityLevel() {
        try {
            const hero = this.bs.battleGrid?.allies?.[3];
            if (!hero) return 0.5;
            
            let opportunity = 0;
            
            const heroHealthPercent = hero.currentHealth / (hero.maxHealth || 100);
            if (heroHealthPercent < 0.3) opportunity += 0.5;
            else if (heroHealthPercent < 0.5) opportunity += 0.3;
            
            if (this.bs.players?.[1]?.currentAction === 'block') {
                opportunity += 0.2;
            }
            
            if (this.bs.players?.[1]?.ap <= 1) opportunity += 0.2;
            
            return Math.min(Math.max(opportunity, 0), 1);
        } catch (error) {
            console.error("❌ Ошибка в calculateOpportunityLevel:", error);
            return 0.5;
        }
    }
    
    predictPlayerAction() {
        try {
            const player = this.bs.players?.[1];
            if (!player) return { action: 'attack', confidence: 0.3 };
            
            const history = player.previousActions || [];
            
            if (history.length < 2) return { action: 'attack', confidence: 0.3 };
            
            const lastAction = history[0] || '';
            const secondLastAction = history[1] || '';
            
            if (lastAction.includes('Блок') && secondLastAction.includes('Блок')) {
                return { action: 'block', confidence: 0.7 };
            }
            
            if (lastAction.includes('Атака') && secondLastAction.includes('Атака')) {
                return { action: 'attack', confidence: 0.6 };
            }
            
            if (lastAction.includes('Отдых')) {
                return { action: 'attack', confidence: 0.5 };
            }
            
            if (player.ap >= 4) {
                return { action: 'crushingAttack', confidence: 0.4 };
            }
            
            if (player.ap >= 2 && player.ap < 4) {
                return { action: 'strongAttack', confidence: 0.5 };
            }
            
            return { action: 'attack', confidence: 0.3 };
        } catch (error) {
            console.error("❌ Ошибка в predictPlayerAction:", error);
            return { action: 'attack', confidence: 0.3 };
        }
    }
    
    getSuccessfulActions() {
        try {
            if (!this.aiMemory?.successfulCombos) return [];
            
            return this.aiMemory.successfulCombos
                .filter(combo => combo && combo.monsterId === this.monster.battleId)
                .map(combo => combo.action)
                .filter(action => action);
        } catch (error) {
            console.error("❌ Ошибка в getSuccessfulActions:", error);
            return [];
        }
    }
    
    getHeroWeaknesses() {
        try {
            const weaknesses = [];
            
            if (this.aiMemory?.heroWeaknesses instanceof Map) {
                this.aiMemory.heroWeaknesses.forEach((count, key) => {
                    if (count >= 2) {
                        weaknesses.push({
                            type: key,
                            severity: Math.min(1, count / 5)
                        });
                    }
                });
            }
            
            return weaknesses;
        } catch (error) {
            console.error("❌ Ошибка в getHeroWeaknesses:", error);
            return [];
        }
    }
    
    evaluateAction(action, gameState) {
        try {
            // ПРОВЕРЯЕМ НАЛИЧИЕ gameState.tactic
            if (!gameState || !gameState.tactic) {
                console.warn("⚠️ gameState.tactic не определен, используем базовую оценку");
                return this.getBaseActionScore(action);
            }
            
            let score = 0;
            
            switch(action) {
                case 'attack':
                    score = this.evaluateAttackAction(gameState);
                    break;
                case 'strongAttack':
                    score = this.evaluateStrongAttackAction(gameState);
                    break;
                case 'crushingAttack':
                    score = this.evaluateCrushingAttackAction(gameState);
                    break;
                case 'block':
                    score = this.evaluateBlockAction(gameState);
                    break;
                case 'breakBlock':
                    score = this.evaluateBreakBlockAction(gameState);
                    break;
                case 'rest':
                    score = this.evaluateRestAction(gameState);
                    break;
                case 'heal':
                    score = this.evaluateHealAction(gameState);
                    break;
                default:
                    score = 0.1;
            }
            
            return Math.max(0, score);
        } catch (error) {
            console.error(`❌ Ошибка в evaluateAction для ${action}:`, error);
            return this.getBaseActionScore(action);
        }
    }
    
    getBaseActionScore(action) {
        // Базовые оценки действий без сложной логики
        const baseScores = {
            'attack': 0.5,
            'strongAttack': 0.4,
            'crushingAttack': 0.3,
            'block': 0.4,
            'breakBlock': 0.3,
            'rest': 0.3,
            'heal': 0.2
        };
        
        return baseScores[action] || 0.1;
    }
    
    evaluateAttackAction(state) {
        try {
            let score = 0.5;
            
            // Безопасные проверки
            if (state.self?.ap >= 1) score += 0.1;
            
            if (state.hero?.healthPercent < 0.4) score += 0.2;
            if (state.tactic?.threatLevel < 0.3) score += 0.15;
            if (state.self?.combo?.type === 'attack' && state.self.combo.count < 4) {
                score += state.self.combo.count * 0.1;
            }
            
            if (state.hero?.isBlocking && state.hero.blockCombo >= 2) score -= 0.3;
            if (state.self?.healthPercent < 0.3) score -= 0.2;
            
            return Math.max(0, score);
        } catch (error) {
            console.error("❌ Ошибка в evaluateAttackAction:", error);
            return 0.5;
        }
    }
    
    evaluateStrongAttackAction(state) {
        try {
            let score = 0.4;
            
            if (state.self?.ap >= 2) score += 0.2;
            
            if (state.hero?.healthPercent < 0.5 && !state.hero?.isBlocking) score += 0.3;
            if (state.tactic?.opportunityLevel > 0.6) score += 0.2;
            
            if (state.self?.combo?.type === 'strongAttack' && state.self.combo.count < 4) {
                score += state.self.combo.count * 0.15;
            }
            
            if (state.hero?.isBlocking) score -= 0.2;
            if (state.self?.healthPercent < 0.4) score -= 0.15;
            
            return Math.max(0, score);
        } catch (error) {
            console.error("❌ Ошибка в evaluateStrongAttackAction:", error);
            return 0.4;
        }
    }
    
    evaluateCrushingAttackAction(state) {
        try {
            let score = 0.3;
            
            if (state.self?.ap >= 4) score += 0.3;
            
            if (state.hero?.isBlocking && state.hero.blockCombo >= 2) score += 0.4;
            
            if (state.hero?.healthPercent < 0.3) score += 0.3;
            
            if (state.self?.combo?.type === 'crushingAttack' && state.self.combo.count < 4) {
                score += state.self.combo.count * 0.2;
            }
            
            if (state.self?.ap <= 3) score = 0;
            if (state.self?.healthPercent < 0.5) score -= 0.2;
            
            return Math.max(0, score);
        } catch (error) {
            console.error("❌ Ошибка в evaluateCrushingAttackAction:", error);
            return 0.3;
        }
    }
    
    evaluateBlockAction(state) {
        try {
            let score = 0.4;
            
            if (state.tactic?.threatLevel > 0.5) score += 0.3;
            if (state.self?.healthPercent < 0.6) score += 0.2;
            
            const predictedAction = state.tactic?.predictedPlayerAction?.action;
            if (predictedAction && ['attack', 'strongAttack', 'crushingAttack'].includes(predictedAction)) {
                score += 0.25;
            }
            
            if (state.self?.combo?.type === 'block' && state.self.combo.count < 4) {
                score += state.self.combo.count * 0.15;
            }
            
            if (state.hero?.isBlocking) score -= 0.2;
            if (state.tactic?.opportunityLevel > 0.7) score -= 0.3;
            
            return Math.max(0, score);
        } catch (error) {
            console.error("❌ Ошибка в evaluateBlockAction:", error);
            return 0.4;
        }
    }
    
    evaluateBreakBlockAction(state) {
        try {
            let score = 0.3;
            
            if (state.hero?.isBlocking) {
                score += 0.4;
                
                if (state.hero.blockCombo >= 2) score += 0.2;
                if (state.hero.blockCombo >= 3) score += 0.3;
            }
            
            if (state.hero?.action === 'rest') score += 0.2;
            
            if (state.self?.combo?.type === 'breakBlock' && state.self.combo.count < 4) {
                score += state.self.combo.count * 0.15;
            }
            
            if (!state.hero?.isBlocking && state.hero?.action !== 'rest') score -= 0.2;
            
            return Math.max(0, score);
        } catch (error) {
            console.error("❌ Ошибка в evaluateBreakBlockAction:", error);
            return 0.3;
        }
    }
    
    evaluateRestAction(state) {
        try {
            let score = 0.3;
            
            if (state.self?.ap <= 2) score += 0.3;
            if (state.self?.healthPercent < 0.7) score += 0.2;
            if (state.tactic?.threatLevel < 0.4) score += 0.15;
            
            if (state.tactic?.opportunityLevel > 0.6) score -= 0.3;
            if (state.hero?.healthPercent < 0.4) score -= 0.2;
            
            return Math.max(0, score);
        } catch (error) {
            console.error("❌ Ошибка в evaluateRestAction:", error);
            return 0.3;
        }
    }
    
    evaluateHealAction(state) {
        try {
            let score = 0.2;
            
            if (state.self?.healthPercent < 0.3) score += 0.5;
            if (state.self?.healthPercent < 0.5) score += 0.3;
            
            if (this.monster.role === 'support' && state.team?.weakestAlly) {
                const allyHealthPercent = state.team.weakestAlly.currentHealth / state.team.weakestAlly.health;
                if (allyHealthPercent < 0.4) score += 0.4;
            }
            
            if (state.self?.combo?.type === 'heal' && state.self.combo.count < 4) {
                score += state.self.combo.count * 0.2;
            }
            
            if (state.self?.healthPercent > 0.8) score -= 0.3;
            if (state.tactic?.threatLevel > 0.7) score -= 0.2;
            
            return Math.max(0, score);
        } catch (error) {
            console.error("❌ Ошибка в evaluateHealAction:", error);
            return 0.2;
        }
    }
    
    applyPersonalityModifiers(baseScore, action, state) {
        try {
            let modifiedScore = baseScore;
            const personality = this.personalityProfile;
            
            if (!personality) return baseScore;
            
            switch(personality.type) {
                case 'aggressive':
                    if (['attack', 'strongAttack', 'crushingAttack', 'breakBlock'].includes(action)) {
                        modifiedScore *= (1 + (personality.aggression || 0) * 0.5);
                    } else {
                        modifiedScore *= (1 - (personality.aggression || 0) * 0.3);
                    }
                    break;
                    
                case 'defensive':
                    if (['block', 'heal', 'rest'].includes(action)) {
                        modifiedScore *= (1 + (personality.caution || 0) * 0.5);
                    } else if (['crushingAttack', 'breakBlock'].includes(action)) {
                        modifiedScore *= (1 - (personality.caution || 0) * 0.4);
                    }
                    break;
                    
                case 'tactical':
                    const predictedAction = state.tactic?.predictedPlayerAction?.action;
                    if ((predictedAction === 'block' && action === 'breakBlock') ||
                        (predictedAction === 'attack' && action === 'block') ||
                        (predictedAction === 'rest' && action === 'attack')) {
                        modifiedScore *= 1.4;
                    }
                    break;
                    
                case 'adaptive':
                    const successfulActions = this.getSuccessfulActions();
                    if (successfulActions.includes(action)) {
                        modifiedScore *= (1 + (personality.learningRate || 0) * 0.3);
                    }
                    break;
            }
            
            return modifiedScore;
        } catch (error) {
            console.error("❌ Ошибка в applyPersonalityModifiers:", error);
            return baseScore;
        }
    }
    
    applyAntiPatternPenalty(score, action) {
        try {
            const recentDecisions = this.decisionHistory.slice(-3);
            const sameActionCount = recentDecisions.filter(d => d && d.action === action).length;
            
            if (sameActionCount >= 2) {
                return score * Math.pow(0.7, sameActionCount - 1);
            }
            
            return score;
        } catch (error) {
            console.error("❌ Ошибка в applyAntiPatternPenalty:", error);
            return score;
        }
    }
    
    applyTeamSynergy(score, action, allMonsters) {
        try {
            const otherMonsters = allMonsters.filter(m => 
                m && m.data && m.data.battleId !== this.monster.battleId
            );
            
            if (otherMonsters.length === 0) return score;
            
            const allyActions = otherMonsters.map(m => m.data?.currentAction).filter(a => a);
            
            const synergies = {
                'block': ['strongAttack', 'crushingAttack'],
                'breakBlock': ['breakBlock', 'attack'],
                'heal': ['block', 'rest']
            };
            
            for (const [key, compatibleActions] of Object.entries(synergies)) {
                if (allyActions.includes(key) && compatibleActions.includes(action)) {
                    return score * 1.3;
                }
            }
            
            return score;
        } catch (error) {
            console.error("❌ Ошибка в applyTeamSynergy:", error);
            return score;
        }
    }
    
    selectBestAction(actionScores, gameState) {
        try {
            const scoredActions = Object.entries(actionScores)
                .map(([action, score]) => ({ action, score: score || 0 }));
            
            scoredActions.sort((a, b) => b.score - a.score);
            
            if (scoredActions.length === 0) {
                return this.monster.ap >= 1 ? 'attack' : 'rest';
            }
            
            const topScore = scoredActions[0].score;
            const topActions = scoredActions.filter(a => a.score >= topScore * 0.9);
            
            if (topActions.length > 1 && Math.random() < 0.3) {
                const randomIndex = Math.floor(Math.random() * topActions.length);
                return topActions[randomIndex].action;
            }
            
            return scoredActions[0].action;
        } catch (error) {
            console.error("❌ Ошибка в selectBestAction:", error);
            return this.monster.ap >= 1 ? 'attack' : 'rest';
        }
    }
    
    recordDecision(action, gameState, score) {
        try {
            this.decisionHistory.push({
                round: gameState?.tactic?.round || 0,
                action: action,
                score: score,
                heroHealth: gameState?.hero?.healthPercent || 0.5,
                selfHealth: gameState?.self?.healthPercent || 0.5,
                threatLevel: gameState?.tactic?.threatLevel || 0.5
            });
            
            if (this.decisionHistory.length > 10) {
                this.decisionHistory.shift();
            }
        } catch (error) {
            console.error("❌ Ошибка в recordDecision:", error);
        }
    }
    
    getAvailableActions() {
        try {
            const actions = [];
            const ap = this.monster.ap || 0;
            const currentHealth = this.monster.currentHealth || 0;
            const maxHealth = this.monster.health || 30;
            
            if (ap >= 1) {
                actions.push('attack', 'block', 'breakBlock', 'rest');
            }
            
            if (ap >= 1 && currentHealth < maxHealth) {
                actions.push('heal');
            }
            
            if (ap >= 2) actions.push('strongAttack');
            if (ap >= 4) actions.push('crushingAttack');
            
            return actions.length > 0 ? actions : ['rest'];
        } catch (error) {
            console.error("❌ Ошибка в getAvailableActions:", error);
            return ['rest'];
        }
    }
}

// УДАЛЯЕМ PredictionModel или делаем его безопасным
class PredictionModel {
    constructor() {
        this.patterns = new Map();
    }
    
    predictNextAction(history, currentState) {
        return { action: 'attack', confidence: 0.3 };
    }
    
    learnPattern(action, previousActions) {
        // Пустой метод для совместимости
    }
}

window.BattleSystem = BattleSystem;
window.AdvancedTacticalAI = AdvancedTacticalAI;

console.log("🧠 BattleSystem с ИСПРАВЛЕННЫМ ИИ загружен!");
