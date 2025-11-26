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
        
        // Система фляги
        this.flask = {
            capacity: 10,
            currentCharges: 10,
            content: 'water', // water, potion, elixir, etc.
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
        
        console.log("✅ BattleSystem инициализирован с системой фляги");
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
                ai: new TacticalAI(this, selectedMonster),
                ap: 3,
                currentAction: null,
                combo: { type: null, count: 0 },
                previousActions: []
            };
            monsterGroup.push(monsterCopy);
        }

        console.log(`🎲 Сгенерирована группа из ${monsterCount} монстров (шанс: ${monsterCountProbabilities[monsterCount]}%):`, monsterGroup.map(m => m.name));
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

    // Сохраняем старое значение для анимации
    const oldCharges = this.flask.currentCharges;
    
    hero.currentHealth += actualHeal;
    this.flask.currentCharges -= 1;

    this.addBattleLog(`💧 Выпит глоток из фляги! +${actualHeal} HP`);
    this.updateHealthBar('allies', 3, hero.currentHealth, hero.maxHealth);
    
    // ОБНОВЛЯЕМ ВИЗУАЛЬНОЕ ОТОБРАЖЕНИЕ ЗАРЯДОВ С ЗАДЕРЖКОЙ ДЛЯ АНИМАЦИИ
    setTimeout(() => {
        this.updateFlaskChargesDisplay();
    }, 100);

    console.log(`💧 Flask used: ${oldCharges} -> ${this.flask.currentCharges} charges`);
    return true;
}

    // НОВЫЙ МЕТОД ДЛЯ ОБНОВЛЕНИЯ ВИЗУАЛЬНОГО ОТОБРАЖЕНИЯ ЗАРЯДОВ
updateFlaskChargesDisplay() {
    const flaskBar = document.querySelector('.flask-bar');
    if (!flaskBar) {
        console.log("❌ Flask bar not found in DOM");
        return;
    }

    // Получаем все элементы зарядов
    const charges = flaskBar.querySelectorAll('.flask-charge');
    const effect = this.flask.contentEffects[this.flask.content];
    
    console.log(`🔄 Updating flask charges: ${this.flask.currentCharges}/${this.flask.capacity}`);
    
    // Обновляем каждый заряд
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

    // Также обновляем текстовое отображение
    const flaskChargesText = document.getElementById('flaskCharges');
    if (flaskChargesText) {
        flaskChargesText.textContent = `${this.flask.currentCharges}/${this.flask.capacity}`;
    }
    
    // Обновляем состояние кнопки
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

    // ОБНОВЛЯЕМ ВИЗУАЛЬНОЕ ОТОБРАЖЕНИЕ ЗАРЯДОВ - ДОБАВЛЕН ВЫЗОВ
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
    this.updateFlaskChargesDisplay(); // ДОБАВЛЕН ВЫЗОВ ДЛЯ ПЕРВОНАЧАЛЬНОГО ОТОБРАЖЕНИЯ
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
        const hero = this.battleGrid.allies[3];
        if (!hero || hero.currentHealth <= 0) return;

        const isHeroBlocking = this.players[1].currentAction === 'block';
        console.log(`🤖 ИИ ${monster.name}: действие=${monster.currentAction}, герой блокирует=${isHeroBlocking}, комбо блока=${this.players[1].combo.count}`);
        
        let damage = 0;
        let message = '';
        
        switch(monster.currentAction) {
            case 'attack':
            case 'strongAttack':
            case 'crushingAttack':
                damage = this.calculateMonsterDamage(monster, monsterUnit);
                const heroStats = this.getHeroStatsForBattle();
                
                const isHeroBlocking = this.players[1].currentAction === 'block';
                let finalDamage = damage;
                
                if (monster.currentAction === 'crushingAttack') {
                    finalDamage = Math.max(1, damage - heroStats.armor);
                    message = `💢 ${monster.name} использует сокрушительную атаку, игнорирующую защиту, и наносит ${finalDamage} урона!`;
                }
                else if (isHeroBlocking) {
                    const blockEfficiency = this.getBlockEfficiency(this.players[1].combo.count);
                    const blockedDamage = Math.floor(damage * blockEfficiency);
                    finalDamage = Math.max(1, damage - blockedDamage - heroStats.armor);
                    
                    const reflectionPercent = this.getBlockReflectionPercent(this.players[1].combo.count);
                    const reflectedDamage = Math.floor(damage * reflectionPercent);
                    
                    if (reflectedDamage > 0) {
                        const oldMonsterHealth = monsterUnit.currentHealth;
                        monsterUnit.currentHealth = Math.max(0, monsterUnit.currentHealth - reflectedDamage);
                        this.updateHealthBar('enemies', monsterUnit.position, monsterUnit.currentHealth, monsterUnit.maxHealth);
                        
                        message = `👹 ${monster.name} атакует, но вы блокируете ${blockedDamage} урона и отражаете ${reflectedDamage} урона!`;
                        
                        if (monsterUnit.currentHealth <= 0) {
                            this.addBattleLog(`💀 ${monster.name} погибает от отраженного урона!`);
                        }
                    } else {
                        message = `👹 ${monster.name} атакует, но вы блокируете ${blockedDamage} урона!`;
                    }
                } else {
                    finalDamage = Math.max(1, damage - heroStats.armor);
                    message = `👹 ${monster.name} атакует и наносит ${finalDamage} урона!`;
                }
                
                console.log(`👹 МОНСТР АТАКУЕТ: ${monster.name}, урон: ${finalDamage}`);
                
                const oldHealth = hero.currentHealth;
                hero.currentHealth = Math.max(0, hero.currentHealth - finalDamage);
                
                console.log(`👹 ДО атаки: ${oldHealth}, ПОСЛЕ: ${hero.currentHealth}`);
                
                this.updateHealthBar('allies', 3, hero.currentHealth, hero.maxHealth);
                
                if (hero.currentHealth <= 0) {
                    hero.currentHealth = 0;
                    this.updateHealthBar('allies', 3, 0, hero.maxHealth);
                    this.addBattleLog(`💀 Герой повержен атакой ${monster.name}!`);
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
                const blockAPBonus = this.getBlockAPBonus(monster.combo.count);
                monster.ap += blockAPBonus;
                message += ` и получает +${blockAPBonus} ОД`;
                break;
                
            case 'rest':
                const restEfficiency = this.getRestEfficiency(monster.combo.count);
                monster.ap += restEfficiency.ap;
                
                if (restEfficiency.healPercent > 0) {
                    const restHeal = Math.floor(monsterUnit.maxHealth * restEfficiency.healPercent);
                    const actualRestHeal = Math.min(restHeal, monsterUnit.maxHealth - monsterUnit.currentHealth);
                    if (actualRestHeal > 0) {
                        monsterUnit.currentHealth += actualRestHeal;
                        this.updateHealthBar('enemies', monsterUnit.position, monsterUnit.currentHealth, monsterUnit.maxHealth);
                        message = `🌀 ${monster.name} отдыхает (+${restEfficiency.ap} ОД) и восстанавливает ${actualRestHeal} HP`;
                    } else {
                        message = `🌀 ${monster.name} отдыхает (+${restEfficiency.ap} ОД)`;
                    }
                } else {
                    message = `🌀 ${monster.name} отдыхает (+${restEfficiency.ap} ОД)`;
                }
                break;
                
            case 'breakBlock':
                const isHeroBlockingBreak = this.players[1].currentAction === 'block';
                damage = this.calculateMonsterDamage(monster, monsterUnit);
                
                let breakBlockDamage;
                if (isHeroBlockingBreak) {
                    const breakMultiplier = this.getBreakBlockMultiplier(monster.combo.count, true);
                    breakBlockDamage = Math.floor(damage * breakMultiplier);
                    message = `⚡ ${monster.name} пробивает вашу защиту и наносит ${breakBlockDamage} урона!`;
                } else {
                    const breakMultiplier = this.getBreakBlockMultiplier(monster.combo.count, false);
                    breakBlockDamage = Math.floor(damage * breakMultiplier);
                    message = `⚡ ${monster.name} использует пробитие и наносит ${breakBlockDamage} урона!`;
                }
                
                const heroStatsBreak = this.getHeroStatsForBattle();
                const finalBreakDamage = Math.max(1, breakBlockDamage - heroStatsBreak.armor);
                
                const oldBreakHealth = hero.currentHealth;
                hero.currentHealth = Math.max(0, hero.currentHealth - finalBreakDamage);
                
                console.log(`⚡ ПРОБИТИЕ: ДО атаки: ${oldBreakHealth}, ПОСЛЕ: ${hero.currentHealth}`);
                
                this.updateHealthBar('allies', 3, hero.currentHealth, hero.maxHealth);
                
                if (hero.currentHealth <= 0) {
                    hero.currentHealth = 0;
                    this.updateHealthBar('allies', 3, 0, hero.maxHealth);
                    this.addBattleLog(`💀 Герой повержен пробивающей атакой ${monster.name}!`);
                }
                break;
                
            default:
                message = `👹 ${monster.name} совершает неизвестное действие`;
                console.warn(`❌ Неизвестное действие монстра: ${monster.currentAction}`);
        }
        
        if (message) {
            this.addBattleLog(message);
        }
        
        setTimeout(() => {
            this.debugHealthBars();
        }, 100);
        
        this.updateMonsterPanel(monster.battleId);
    }

    calculateMonsterDamage(monster, monsterUnit) {
        let baseDamage = monster.damage || 10;
        
        const comboMultiplier = this.getComboMultiplier(monster.currentAction, monster.combo.count);
        let damage = Math.floor(baseDamage * comboMultiplier);
        
        const variation = 0.9 + Math.random() * 0.2;
        damage = Math.floor(damage * variation);
        
        console.log(`🎯 Урон монстра ${monster.name}: база=${baseDamage}, комбо=${comboMultiplier}x, вариация=${variation.toFixed(2)}, итого=${damage}`);
        
        return damage;
    }

    updateHealthBar(side, position, currentHealth, maxHealth) {
        const healthPercent = Math.max(0, (currentHealth / maxHealth) * 100);
        
        console.log(`🔄 ОБНОВЛЕНИЕ ПОЛОСКИ: ${side} ${position} = ${currentHealth}/${maxHealth} (${healthPercent}%)`);
        
        const cellSelector = `.grid-cell-fullscreen[data-position="${position}"][data-side="${side}"]`;
        const cell = document.querySelector(cellSelector);
        
        if (!cell) {
            console.log(`❌ Ячейка не найдена: ${cellSelector}`);
            return;
        }
        
        let healthBar = cell.querySelector('.health-bar-fullscreen');
        let healthFill = cell.querySelector('.health-fill');
        
        if (!healthBar) {
            console.log("📝 Создаем отсутствующие элементы здоровья...");
            healthBar = document.createElement('div');
            healthBar.className = 'health-bar-fullscreen';
            
            healthFill = document.createElement('div');
            healthFill.className = 'health-fill health-high';
            
            const healthText = document.createElement('div');
            healthText.className = 'health-text';
            
            healthBar.appendChild(healthFill);
            healthBar.appendChild(healthText);
            
            const healthContainer = cell.querySelector('.unit-health-container');
            if (healthContainer) {
                healthContainer.appendChild(healthBar);
            } else {
                const newContainer = document.createElement('div');
                newContainer.className = 'unit-health-container';
                newContainer.appendChild(healthBar);
                cell.appendChild(newContainer);
            }
        }
        
        if (healthFill) {
            console.log(`✅ Полоска найдена/создана, устанавливаем ширину: ${healthPercent}%`);
            
            requestAnimationFrame(() => {
                healthFill.style.width = '0%';
                healthFill.offsetHeight;
                
                healthFill.style.width = `${healthPercent}%`;
                
                healthFill.className = 'health-fill health-updating';
                if (healthPercent > 60) {
                    healthFill.classList.add('health-high');
                } else if (healthPercent > 25) {
                    healthFill.classList.add('health-medium');
                } else {
                    healthFill.classList.add('health-low');
                }
                
                console.log(`🎨 Установлена ширина: ${healthFill.style.width}, computed: ${window.getComputedStyle(healthFill).width}`);
                
                setTimeout(() => {
                    healthFill.classList.remove('health-updating');
                }, 300);
            });
            
        } else {
            console.log(`❌ Не удалось создать/найти полоску здоровья`);
        }
        
        const healthText = cell.querySelector('.health-text');
        if (healthText) {
            healthText.textContent = `${Math.ceil(currentHealth)}/${maxHealth}`;
        }
    }

    updateAllHealthBars() {
        console.log("🔄 Принудительное обновление всех полосок здоровья...");
        
        const hero = this.battleGrid.allies[3];
        if (hero) {
            console.log(`❤️ Герой: ${hero.currentHealth}/${hero.maxHealth}`);
            this.updateHealthBar('allies', 3, hero.currentHealth, hero.maxHealth);
        }
        
        this.battleGrid.enemies.forEach((monster, position) => {
            if (monster) {
                console.log(`👹 Монстр ${position}: ${monster.currentHealth}/${monster.maxHealth}`);
                this.updateHealthBar('enemies', position, monster.currentHealth, monster.maxHealth);
            }
        });
    }

    debugHealthBars() {
        console.log("🔍 ДИАГНОСТИКА ПОЛОСОК ЗДОРОВЬЯ:");
        
        const hero = this.battleGrid.allies[3];
        if (hero) {
            const healthPercent = (hero.currentHealth / hero.maxHealth) * 100;
            console.log(`❤️ Герой: ${hero.currentHealth}/${hero.maxHealth} (${healthPercent}%)`);
            
            const heroCell = document.querySelector('.grid-cell-fullscreen[data-position="3"][data-side="allies"]');
            if (heroCell) {
                const healthFill = heroCell.querySelector('.health-fill');
                console.log(`🎯 Найдена полоска героя:`, healthFill);
                if (healthFill) {
                    console.log(`📏 Текущая ширина: ${healthFill.style.width}`);
                    console.log(`🎨 Текущие классы: ${healthFill.className}`);
                }
            }
        }
        
        this.battleGrid.enemies.forEach((monster, position) => {
            if (monster) {
                const healthPercent = (monster.currentHealth / monster.maxHealth) * 100;
                console.log(`👹 Монстр ${position}: ${monster.currentHealth}/${monster.maxHealth} (${healthPercent}%)`);
                
                const monsterCell = document.querySelector(`.grid-cell-fullscreen[data-position="${position}"][data-side="enemies"]`);
                if (monsterCell) {
                    const healthFill = monsterCell.querySelector('.health-fill');
                    console.log(`🎯 Найдена полоска монстра ${position}:`, healthFill);
                    if (healthFill) {
                        console.log(`📏 Текущая ширина: ${healthFill.style.width}`);
                    }
                }
            }
        });
    }

    debugDOMStructure() {
        console.log("🔍 ДИАГНОСТИКА DOM СТРУКТУРЫ:");
        
        const heroCell = document.querySelector('.grid-cell-fullscreen[data-position="3"][data-side="allies"]');
        if (heroCell) {
            console.log("❤️ СТРУКТУРА ГЕРОЯ:");
            console.log("Весь HTML:", heroCell.outerHTML);
            
            const healthBar = heroCell.querySelector('.health-bar-fullscreen');
            const healthFill = heroCell.querySelector('.health-fill');
            
            console.log("Полоска здоровья найдена:", !!healthFill);
            if (healthFill) {
                console.log("Стили полоски:", {
                    width: healthFill.style.width,
                    display: healthFill.style.display,
                    computedWidth: window.getComputedStyle(healthFill).width,
                    parentWidth: healthBar ? window.getComputedStyle(healthBar).width : 'no parent'
                });
            }
        }
        
        const monsterCell = document.querySelector('.grid-cell-fullscreen[data-position="0"][data-side="enemies"]');
        if (monsterCell) {
            console.log("👹 СТРУКТУРА МОНСТРА:");
            const healthFill = monsterCell.querySelector('.health-fill');
            console.log("Полоска здоровья найдена:", !!healthFill);
            if (healthFill) {
                console.log("Стили полоски:", {
                    width: healthFill.style.width,
                    computedWidth: window.getComputedStyle(healthFill).width
                });
            }
        }
    }

    handleCellClick(position, side) {
        if (side === 'enemies' && this.pendingAction) {
            this.selectTarget(position);
        }
    }

    getComboMultiplier(action, comboCount) {
        const baseMultipliers = {
            attack: [1.0, 2.0, 4.0, 8.0],
            strongAttack: [2.5, 5.0, 10.0, 20.0],
            crushingAttack: [7.5, 15.0, 30.0, 60.0],
            breakBlock: [0.5, 1.0, 1.5, 2.0],
            block: [0.5, 0.75, 1.0, 1.0],
            heal: [0.10, 0.20, 0.40, 0.80],
            rest: [0.05, 0.10, 0.15, 0.20]
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

    getBlockReflectionPercent(comboCount) {
        const reflectionPercents = [0.25, 0.50, 0.75, 1.0];
        return reflectionPercents[Math.min(comboCount - 1, 3)];
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

resolveTacticalTurn() {
    const playerAction = this.players[1].currentAction;
    
    this.battleRound++;
    this.addBattleLog(`--- РАУНД ${this.battleRound} ЗАВЕРШЕН ---`);
    
    this.executeTacticalDamage(playerAction);
    
    this.players[1].currentAction = null;
    this.players[1].ap = Math.min(this.players[1].ap + 1, 10);
    
    this.currentMonsters.forEach(monster => {
        if (monster.currentHealth > 0) {
            monster.ap = Math.min(monster.ap + 1, 10);
        }
    });
    
    this.selectedTarget = null;
    this.pendingAction = null;
    
    setTimeout(() => {
        console.log("🔄 ОБНОВЛЕНИЕ ПОСЛЕ ХОДА");
        this.updateAllHealthBars();
        this.updateTacticalUI();
        this.updateFlaskChargesDisplay(); // ДОБАВЛЕН ВЫЗОВ ОБНОВЛЕНИЯ ФЛЯГИ
        
        this.debugHealthBars();
        
        if (this.checkBattleEnd()) {
            setTimeout(() => {
                this.endTacticalBattle(this.isPlayerVictory());
            }, 1500);
        }
    }, 300);
}

    executeTacticalDamage(playerAction) {
        if (this.isAttackAction(playerAction) && this.selectedTarget !== null) {
            const targetUnit = this.battleGrid.enemies[this.selectedTarget];
            if (targetUnit && targetUnit.currentHealth > 0) {
                const heroStats = this.getHeroStatsForBattle();
                const player = this.players[1];
                
                let damage = heroStats.damage;
                
                const comboMultiplier = this.getComboMultiplier(playerAction, player.combo.count);
                damage = Math.floor(damage * comboMultiplier);
                
                let finalDamage = damage;
                
                const isMonsterBlocking = targetUnit.data.currentAction === 'block';
                
                if (playerAction === 'crushingAttack') {
                    finalDamage = Math.max(1, damage - (targetUnit.data.armor || 0));
                    this.addBattleLog(`💢 Сокрушительная атака игнорирует защиту ${targetUnit.data.name} и наносит ${finalDamage} урона!`);
                }
                else if (playerAction === 'breakBlock') {
                    const breakMultiplier = this.getBreakBlockMultiplier(player.combo.count, isMonsterBlocking);
                    finalDamage = Math.floor(damage * breakMultiplier);
                    
                    if (isMonsterBlocking) {
                        this.addBattleLog(`⚡ Вы пробиваете защиту ${targetUnit.data.name} и наносите ${finalDamage} урона!`);
                    } else {
                        this.addBattleLog(`⚡ Вы используете пробитие по ${targetUnit.data.name} и наносите ${finalDamage} урона!`);
                    }
                }
                else if (isMonsterBlocking) {
                    const blockEfficiency = this.getBlockEfficiency(targetUnit.data.combo.count);
                    const blockedDamage = Math.floor(damage * blockEfficiency);
                    finalDamage = Math.max(1, damage - blockedDamage - (targetUnit.data.armor || 0));
                    
                    const reflectionPercent = this.getBlockReflectionPercent(targetUnit.data.combo.count);
                    const reflectedDamage = Math.floor(damage * reflectionPercent);
                    
                    if (reflectedDamage > 0) {
                        const hero = this.battleGrid.allies[3];
                        const oldHeroHealth = hero.currentHealth;
                        hero.currentHealth = Math.max(0, hero.currentHealth - reflectedDamage);
                        this.updateHealthBar('allies', 3, hero.currentHealth, hero.maxHealth);
                        
                        this.addBattleLog(`🎯 Вы атакуете, но ${targetUnit.data.name} блокирует ${blockedDamage} урона и отражает ${reflectedDamage} урона!`);
                        
                        if (hero.currentHealth <= 0) {
                            this.addBattleLog(`💀 Вы погибаете от отраженного урона!`);
                        }
                    } else {
                        this.addBattleLog(`🎯 Вы атакуете, но ${targetUnit.data.name} блокирует ${blockedDamage} урона!`);
                    }
                }
                else {
                    finalDamage = Math.max(1, damage - (targetUnit.data.armor || 0));
                    this.addBattleLog(`🎯 Вы наносите ${finalDamage} урона ${targetUnit.data.name}!`);
                }
                
                const oldHealth = targetUnit.currentHealth;
                targetUnit.currentHealth = Math.max(0, targetUnit.currentHealth - finalDamage);
                
                console.log(`🎯 ИГРОК АТАКУЕТ: ${targetUnit.data.name}, урон: ${finalDamage}`);
                console.log(`🎯 ДО атаки: ${oldHealth}, ПОСЛЕ: ${targetUnit.currentHealth}`);
                
                this.updateHealthBar('enemies', this.selectedTarget, targetUnit.currentHealth, targetUnit.maxHealth);
                
                setTimeout(() => {
                    this.debugHealthBars();
                }, 100);
                
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
            
            if (this.isAttackAction(action)) {
                const multiplier = this.getComboMultiplier(action, count);
                multiplierText = ` (x${multiplier})`;
            } else if (action === 'breakBlock') {
                multiplierText = ` (${this.getBreakBlockMultiplier(count, false) * 100}%/${this.getBreakBlockMultiplier(count, true) * 100}% урона)`;
            } else if (action === 'block') {
                const blockPercent = this.getBlockEfficiency(count) * 100;
                const reflectionPercent = this.getBlockReflectionPercent(count) * 100;
                const apBonus = this.getBlockAPBonus(count);
                multiplierText = ` (${blockPercent}% блок + ${reflectionPercent}% отражение +${apBonus}ОД)`;
            } else if (action === 'rest') {
                const restEff = this.getRestEfficiency(count);
                multiplierText = ` (+${restEff.ap}ОД +${restEff.healPercent * 100}% HP)`;
            } else if (action === 'heal') {
                const healPercent = this.getHealEfficiency(count) * 100;
                multiplierText = ` (${healPercent}% HP)`;
            }
            
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
    
    // ОБНОВЛЯЕМ ФЛЯГУ - ДОБАВЛЕН ВЫЗОВ
    this.updateFlaskChargesDisplay();
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
            
            let healthColor = 'health-high';
            if (healthPercent <= 25) healthColor = 'health-low';
            else if (healthPercent <= 60) healthColor = 'health-medium';
            
            const attackType = unit.attackType;
            const attackTypeText = attackType === 'ranged' ? '🏹 Дальний' : '🥊 Ближний';
            
            let damage, armor;
            if (isEnemy) {
                damage = unit.data.damage || 10;
                armor = unit.data.armor || 0;
            } else {
                const heroStats = this.getHeroStatsForBattle();
                damage = heroStats.damage;
                armor = heroStats.armor;
            }
            
            const rowText = isEnemy ? 
                (unit.row === 'front' ? '🥊 Передний' : '🏹 Задний') :
                (unit.row === 'front' ? '🥊 Передний' : '🏹 Задний');
            
            content = `
                <div class="unit-image-container">
                    <img class="unit-image" src="${unit.data.image}" alt="${unit.data.name}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                    <div class="image-fallback" style="display: none;">
                        ${isEnemy ? '👹' : '🎯'}
                    </div>
                    
                    <div class="unit-info-overlay">
                        <div class="overlay-unit-header">
                            <div class="overlay-unit-name">${unit.data.name}</div>
                            <div class="overlay-unit-level">${isEnemy ? 'Lvl 1' : 'Lvl ' + (unit.data.level || 1)}</div>
                        </div>
                        <div class="overlay-simple-stats">
                            <div class="overlay-health">
                                <span class="overlay-health-label">❤️ Здоровье:</span>
                                <span class="overlay-health-numbers">${Math.ceil(unit.currentHealth)}/${unit.maxHealth}</span>
                            </div>
                            <div class="overlay-main-stats">
                                <span class="overlay-damage">⚔️ ${damage}</span>
                                <span class="overlay-armor">🛡️ ${armor}</span>
                                <span class="overlay-type">${attackTypeText}</span>
                                <span class="overlay-row">${rowText}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="unit-health-container">
                    <div class="health-bar-fullscreen">
                        <div class="health-fill ${healthColor}" style="width: ${healthPercent}%"></div>
                        <div class="health-text">${Math.ceil(unit.currentHealth)}/${unit.maxHealth}</div>
                    </div>
                </div>
            `;
            
            if (!isAlive) {
                cellClass += ' dead';
                content += '<div class="dead-overlay">💀</div>';
            }
        }
        
        return `
            <div class="${cellClass}" data-position="${position}" data-side="${side}" 
                 onclick="game.systems.battle.handleCellClick(${position}, '${side}')">
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
        const hero = this.battleGrid.allies[3];
        
        if (hero && hero.currentHealth <= 0) {
            hero.currentHealth = 0;
            this.addBattleLog("💀 Герой пал в бою!");
            return true;
        }
        
        if (aliveMonsters.length === 0) {
            this.addBattleLog("🎉 Все противники повержены!");
            return true;
        }
        
        return false;
    }

    isPlayerVictory() {
        const hero = this.battleGrid.allies[3];
        const aliveMonsters = this.battleGrid.enemies.filter(unit => unit && unit.currentHealth > 0);
        
        return hero && hero.currentHealth > 0 && aliveMonsters.length === 0;
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
            this.currentHero.currentHealth = this.battleGrid.allies[3]?.currentHealth || this.currentHero.currentHealth;
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
        
        const hero = this.bs.battleGrid.allies[3];
        if (!hero || hero.currentHealth <= 0) return 'rest';
        
        const heroHealthPercent = hero.currentHealth / hero.maxHealth;
        const monsterHealthPercent = this.monster.currentHealth / this.monster.health;
        const isHeroBlocking = this.bs.players[1].currentAction === 'block';
        const heroBlockCombo = this.bs.players[1].combo.count;
        
        const strategy = this.analyzeSituation(heroHealthPercent, monsterHealthPercent, isHeroBlocking, heroBlockCombo);
        
        if (isHeroBlocking && availableActions.includes('breakBlock')) {
            let breakBlockChance = strategy.breakBlockChance;
            
            if (this.monster.ap <= 2) breakBlockChance += 0.15;
            if (heroBlockCombo >= 2) breakBlockChance += 0.2;
            if (monsterHealthPercent > 0.7) breakBlockChance += 0.1;
            
            if (Math.random() < Math.min(breakBlockChance, 0.95)) {
                console.log(`🤖 ${this.monster.name} выбирает пробитие блока (шанс: ${breakBlockChance.toFixed(2)})`);
                return 'breakBlock';
            }
        }
        
        if (monsterHealthPercent < 0.25 && availableActions.includes('heal')) {
            const healChance = 0.8 - (monsterHealthPercent * 0.5);
            if (Math.random() < healChance) {
                console.log(`🤖 ${this.monster.name} срочно лечится (HP: ${(monsterHealthPercent*100).toFixed(0)}%)`);
                return 'heal';
            }
        }
        
        if (heroHealthPercent < 0.3 && availableActions.includes('strongAttack') && this.monster.ap >= 2) {
            if (Math.random() < 0.6) {
                console.log(`🤖 ${this.monster.name} добивает слабого героя`);
                return 'strongAttack';
            }
        }
        
        if (monsterHealthPercent < 0.5 && availableActions.includes('block') && !isHeroBlocking) {
            const blockChance = 0.5 - (monsterHealthPercent * 0.4);
            if (Math.random() < blockChance) {
                console.log(`🤖 ${this.monster.name} защищается (HP: ${(monsterHealthPercent*100).toFixed(0)}%)`);
                return 'block';
            }
        }
        
        if (this.monster.ap >= 1) {
            const attackRoll = Math.random();
            
            if (this.monster.ap >= 4 && attackRoll < 0.25) {
                console.log(`🤖 ${this.monster.name} использует сокрушительную атаку`);
                return 'crushingAttack';
            }
            
            if (this.monster.ap >= 2 && attackRoll < 0.45) {
                console.log(`🤖 ${this.monster.name} использует силовую атаку`);
                return 'strongAttack';
            }
            
            if (attackRoll < 0.8) {
                console.log(`🤖 ${this.monster.name} атакует`);
                return 'attack';
            }
        }
        
        if (this.monster.ap <= 2 && availableActions.includes('rest')) {
            const restChance = 0.7 - (this.monster.ap * 0.2);
            if (Math.random() < restChance) {
                console.log(`🤖 ${this.monster.name} отдыхает для восстановления ОД`);
                return 'rest';
            }
        }
        
        const fallbackActions = availableActions.filter(action => 
            ['attack', 'strongAttack', 'breakBlock', 'rest'].includes(action)
        );
        
        const selectedAction = fallbackActions.length > 0 
            ? fallbackActions[Math.floor(Math.random() * fallbackActions.length)]
            : 'rest';
            
        console.log(`🤖 ${this.monster.name} выбирает резервное действие: ${selectedAction}`);
        return selectedAction;
    }
    
    analyzeSituation(heroHealthPercent, monsterHealthPercent, isHeroBlocking, heroBlockCombo) {
        const strategy = {
            breakBlockChance: 0.3,
            aggression: 0.5,
            defense: 0.5
        };
        
        if (isHeroBlocking) {
            strategy.breakBlockChance += 0.2;
            
            if (heroBlockCombo >= 2) strategy.breakBlockChance += 0.3;
            if (heroBlockCombo >= 3) strategy.breakBlockChance += 0.4;
            
            if (this.monster.ap >= 3) strategy.breakBlockChance += 0.1;
        }
        
        if (heroHealthPercent < 0.4) {
            strategy.aggression += 0.3;
            strategy.breakBlockChance += 0.1;
        }
        
        if (monsterHealthPercent < 0.4) {
            strategy.defense += 0.3;
            strategy.aggression -= 0.2;
        }
        
        if (monsterHealthPercent > 0.7) {
            strategy.aggression += 0.2;
        }
        
        return strategy;
    }
    
    getAvailableActions() {
        const actions = [];
        
        if (this.monster.ap >= 1) {
            actions.push('attack', 'block', 'breakBlock', 'rest');
        }
        
        if (this.monster.ap >= 1 && this.monster.currentHealth < this.monster.health) {
            actions.push('heal');
        }
        
        if (this.monster.ap >= 2) actions.push('strongAttack');
        if (this.monster.ap >= 4) actions.push('crushingAttack');
        
        return actions;
    }
}

window.BattleSystem = BattleSystem;
console.log("📦 BattleSystem полностью переписан с системой фляги и улучшенным ИИ");
