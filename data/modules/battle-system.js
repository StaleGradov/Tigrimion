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
                previousActions: []
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
        
        // ⭐ НОВОЕ: Конфигурация стратегического ИИ
        this.initStrategicAIConfig();
        
        console.log("✅ BattleSystem инициализирован с продвинутым стратегическим ИИ");
    }
    
    // ⭐ НОВЫЙ МЕТОД: Инициализация стратегического ИИ
    initStrategicAIConfig() {
        // Матрица контр-действий (как реагировать на действия героя)
        this.counterMatrix = {
            // Когда герой БЛОКИРУЕТ
            'hero_block': {
                recommended: ['breakBlock', 'crushingAttack', 'heal'],
                weights: {
                    'breakBlock': 50,
                    'crushingAttack': 40,
                    'heal': 25,
                    'rest': 15,
                    'attack': -20,
                    'strongAttack': -15,
                    'block': -30
                },
                description: "Герой защищается - нужно пробивать или лечиться"
            },
            
            // Когда герой АТАКУЕТ (базовая атака)
            'hero_attack': {
                recommended: ['block', 'heal', 'rest'],
                weights: {
                    'block': 40,
                    'heal': 30,
                    'rest': 20,
                    'breakBlock': 15,
                    'attack': 10,
                    'strongAttack': 5,
                    'crushingAttack': -10
                },
                description: "Герой атакует - нужно защищаться или восстанавливаться"
            },
            
            // Когда герой использует СИЛОВУЮ АТАКУ
            'hero_strongAttack': {
                recommended: ['block', 'heal', 'rest'],
                weights: {
                    'block': 60,
                    'heal': 35,
                    'rest': 25,
                    'breakBlock': 15,
                    'attack': -10,
                    'strongAttack': -20,
                    'crushingAttack': -30
                },
                description: "Герой использует мощную атаку - обязательно защищаться!"
            },
            
            // Когда герой использует СОКРУШИТЕЛЬНУЮ АТАКУ
            'hero_crushingAttack': {
                recommended: ['block', 'heal', 'rest'],
                weights: {
                    'block': 70,
                    'heal': 40,
                    'rest': 30,
                    'breakBlock': 10,
                    'attack': -30,
                    'strongAttack': -40,
                    'crushingAttack': -50
                },
                description: "Герой использует сокрушительную атаку - блокировать и лечиться!"
            },
            
            // Когда герой ЛЕЧИТСЯ
            'hero_heal': {
                recommended: ['attack', 'strongAttack', 'crushingAttack'],
                weights: {
                    'attack': 45,
                    'strongAttack': 40,
                    'crushingAttack': 35,
                    'breakBlock': 25,
                    'block': -20,
                    'heal': -40,
                    'rest': -30
                },
                description: "Герой лечится - нужно атаковать агрессивно!"
            },
            
            // Когда герой ОТДЫХАЕТ
            'hero_rest': {
                recommended: ['attack', 'breakBlock', 'strongAttack'],
                weights: {
                    'attack': 35,
                    'breakBlock': 30,
                    'strongAttack': 30,
                    'crushingAttack': 25,
                    'block': 5,
                    'heal': 0,
                    'rest': -50
                },
                description: "Герой отдыхает - идеальное время для атаки!"
            },
            
            // Когда герой ПРОБИВАЕТ БЛОК
            'hero_breakBlock': {
                recommended: ['attack', 'rest', 'heal'],
                weights: {
                    'attack': 30,
                    'rest': 25,
                    'heal': 20,
                    'block': -40,
                    'strongAttack': 15,
                    'crushingAttack': 10,
                    'breakBlock': 5
                },
                description: "Герой пробивает блок - не блокировать, атаковать в ответ!"
            }
        };
        
        // Профили ИИ для разных типов монстров
        this.aiProfiles = {
            // Агрессивные монстры (dd_melee, агрессивные)
            aggressive: {
                name: "Агрессор",
                baseWeights: {
                    attack: 70,
                    strongAttack: 60,
                    crushingAttack: 50,
                    breakBlock: 40,
                    block: 20,
                    heal: 5,
                    rest: 10
                },
                triggers: {
                    lowHealthHero: { threshold: 0.4, bonus: 40 },
                    highCombo: { minCombo: 2, bonus: 30 },
                    heroResting: { bonus: 25 },
                    selfHighHealth: { threshold: 0.7, bonus: 20 }
                },
                riskTolerance: 0.8, // Высокий риск
                patternAnalysis: false,
                healthPriority: 0.3 // Низкий приоритет здоровью
            },
            
            // Защитные монстры (танки)
            tank_armor: {
                name: "Защитник",
                baseWeights: {
                    attack: 30,
                    strongAttack: 25,
                    crushingAttack: 20,
                    breakBlock: 35,
                    block: 60,
                    heal: 40,
                    rest: 25
                },
                triggers: {
                    heroAggression: { attacksInRow: 2, bonus: 35 },
                    lowHealthSelf: { threshold: 0.6, bonus: 40 },
                    heroPowerAttack: { bonus: 50 }
                },
                riskTolerance: 0.2, // Низкий риск
                patternAnalysis: true,
                healthPriority: 0.8 // Высокий приоритет здоровью
            },
            
            // Дальнобойные монстры
            ranged_support: {
                name: "Снайпер",
                baseWeights: {
                    attack: 40,
                    strongAttack: 35,
                    crushingAttack: 30,
                    breakBlock: 50,
                    block: 30,
                    heal: 20,
                    rest: 15
                },
                triggers: {
                    heroBlockCombo: { minCombo: 2, bonus: 50 },
                    heroLowHealth: { threshold: 0.3, bonus: 40 },
                    safeDistance: { bonus: 20 }
                },
                riskTolerance: 0.4,
                patternAnalysis: true,
                healthPriority: 0.6
            },
            
            // Универсальные монстры
            universal: {
                name: "Универсал",
                baseWeights: {
                    attack: 50,
                    strongAttack: 45,
                    crushingAttack: 40,
                    breakBlock: 45,
                    block: 45,
                    heal: 30,
                    rest: 20
                },
                triggers: {
                    adaptive: { bonus: 25 },
                    counterOpportunity: { bonus: 30 }
                },
                riskTolerance: 0.5,
                patternAnalysis: true,
                healthPriority: 0.5
            },
            
            // Монстры с большим здоровьем (tank_health)
            tank_health: {
                name: "Танк",
                baseWeights: {
                    attack: 35,
                    strongAttack: 30,
                    crushingAttack: 25,
                    breakBlock: 40,
                    block: 55,
                    heal: 45,
                    rest: 30
                },
                triggers: {
                    heroSustainedDamage: { bonus: 30 },
                    selfHighHealthPool: { bonus: 25 },
                    enduranceBattle: { bonus: 20 }
                },
                riskTolerance: 0.3,
                patternAnalysis: false,
                healthPriority: 0.7
            }
        };
        
        // Формулы расчета эффективности
        this.effectivenessFormulas = {
            // Эффективность атаки
            attack: (attacker, defender) => {
                const baseDamage = attacker.damage || 10;
                const armorReduction = Math.min(defender.armor * 0.8, baseDamage * 0.7);
                const effectiveDamage = Math.max(1, baseDamage - armorReduction);
                
                // Учитываем здоровье цели
                const healthRatio = defender.currentHealth / defender.maxHealth;
                const pressure = healthRatio < 0.3 ? 1.5 : (healthRatio < 0.6 ? 1.2 : 1.0);
                
                return effectiveDamage * pressure;
            },
            
            // Эффективность силовой атаки
            strongAttack: (attacker, defender) => {
                const baseDamage = (attacker.damage || 10) * 2.5;
                const armorReduction = Math.min(defender.armor * 0.6, baseDamage * 0.5);
                const effectiveDamage = Math.max(1, baseDamage - armorReduction);
                
                // Силовые атаки эффективны против целей со средней броней
                const armorEffectiveness = 1 + (defender.armor / 100);
                
                return effectiveDamage * armorEffectiveness;
            },
            
            // Эффективность сокрушительной атаки
            crushingAttack: (attacker, defender) => {
                const baseDamage = (attacker.damage || 10) * 7.5;
                // Сокрушительная игнорирует 80% брони
                const armorReduction = defender.armor * 0.2;
                const effectiveDamage = Math.max(1, baseDamage - armorReduction);
                
                // Особенно эффективна против высокобронированных целей
                const antiArmorBonus = 1 + (defender.armor / 50);
                
                return effectiveDamage * antiArmorBonus;
            },
            
            // Эффективность блока
            block: (user, opponent) => {
                const blockEfficiency = 0.5 + (user.armor * 0.05);
                const opponentDamage = opponent.damage || 10;
                const damageReduction = opponentDamage * blockEfficiency;
                
                // Блок эффективнее против сильных атак
                const strengthRatio = opponentDamage / (user.armor + 10);
                const efficiencyBonus = 1 + Math.min(strengthRatio, 1.0);
                
                return damageReduction * efficiencyBonus;
            },
            
            // Эффективность пробития блока
            breakBlock: (attacker, defender) => {
                const isDefenderBlocking = defender.currentAction === 'block';
                const baseMultiplier = isDefenderBlocking ? 2.0 : 0.5;
                
                // Пробитие эффективнее против высокобронированных целей
                const armorPenetration = 1 + (defender.armor * 0.1);
                
                return (attacker.damage || 10) * baseMultiplier * armorPenetration;
            },
            
            // Эффективность лечения
            heal: (user, context) => {
                const missingHealth = user.maxHealth - user.currentHealth;
                const healEfficiency = missingHealth / user.maxHealth;
                
                // Лечение эффективнее при большом недостатке здоровья
                const criticalBonus = missingHealth > user.maxHealth * 0.5 ? 1.5 : 1.0;
                
                return healEfficiency * 100 * criticalBonus;
            },
            
            // Эффективность отдыха
            rest: (user, context) => {
                const apNeed = 10 - user.ap;
                const healthNeed = (user.maxHealth - user.currentHealth) / user.maxHealth;
                
                // Эффективность = нужда в ОД + нужда в здоровье
                return (apNeed * 15) + (healthNeed * 10);
            }
        };
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
            
            // ⭐ ОПРЕДЕЛЯЕМ ТИП ИИ НА ОСНОВЕ aiBehavior ИЛИ role
            let aiType = this.determineAIType(selectedMonster);
            
            const monsterCopy = {
                ...selectedMonster,
                battleId: i + 1,
                currentHealth: selectedMonster.health,
                maxHealth: selectedMonster.health,
                name: monsterCount > 1 ? `${selectedMonster.name} ${i + 1}` : selectedMonster.name,
                source: 'map',
                ai: new StrategicAI(this, selectedMonster, aiType), // ⭐ ИСПОЛЬЗУЕМ StrategicAI
                aiType: aiType,
                ap: 3,
                currentAction: null,
                combo: { type: null, count: 0 },
                previousActions: [],
                lastRestTurn: -10, // Начальное значение для ограничения отдыха
                memory: {
                    heroActions: [],
                    heroPatterns: {},
                    heroTendencies: {
                        aggressive: 0,
                        defensive: 0,
                        healing: 0,
                        predictable: 0
                    }
                }
            };
            monsterGroup.push(monsterCopy);
        }

        console.log(`🎲 Сгенерирована группа из ${monsterCount} монстров:`, monsterGroup.map(m => `${m.name} [${m.aiType}]`));
        return monsterGroup;
    }
    
    // ⭐ НОВЫЙ МЕТОД: Определение типа ИИ на основе характеристик монстра
    determineAIType(monster) {
        // Используем aiBehavior если есть, иначе определяем по role
        if (monster.aiBehavior) {
            return monster.aiBehavior;
        }
        
        // Определяем по role
        switch(monster.role) {
            case 'dd_melee':
            case 'dd_ranged':
                return 'aggressive';
            case 'tank_armor':
                return 'tank_armor';
            case 'tank_health':
                return 'tank_health';
            case 'universal':
                return 'universal';
            default:
                // Автоматическое определение по характеристикам
                const health = monster.health;
                const damage = monster.damage;
                const armor = monster.armor;
                
                if (damage > health * 0.3) return 'aggressive';
                if (armor > damage) return 'tank_armor';
                if (health > damage * 10) return 'tank_health';
                return 'universal';
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
        
        console.log(`🎲 Контекст боя установлен: ${this.battleContext}`);
        
        // Отмечаем что бой активен для защиты от перезагрузки
        if (window.game) {
            window.game.markBattleAsActive();
            console.log("🎲 Бой отмечен как активный для защиты от перезагрузки");
        }
        
        // Сохраняем в sessionStorage на случай аварийного закрытия
        this.saveBattleState();
        
        console.log(`⚔️ Начинаем тактический бой с ${monsterGroup.length} монстрами`);
        this.showTacticalBattleInterface();
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
        
        console.log(`🎲 Контекст боя с конкретным монстром: ${this.battleContext}`);
        
        // Отмечаем что бой активен для защиты от перезагрузки
        if (window.game) {
            window.game.markBattleAsActive();
            console.log("🎲 Бой с конкретным монстром отмечен как активный");
        }
        
        // Сохраняем в sessionStorage на случай аварийного закрытия
        this.saveBattleState();
        
        console.log(`⚔️ Начинаем бой с конкретным монстром: ${specificMonster.name}`);
        this.showTacticalBattleInterface();
    }

    generateSpecificMonsterGroup(specificMonster) {
        if (!specificMonster) return null;

        const monsterCount = 1;
        const monsterGroup = [];
        
        // Определяем тип ИИ
        let aiType = this.determineAIType(specificMonster);
        
        for (let i = 0; i < monsterCount; i++) {
            const monsterCopy = {
                ...specificMonster,
                battleId: i + 1,
                currentHealth: specificMonster.health,
                maxHealth: specificMonster.health,
                name: monsterCount > 1 ? `${specificMonster.name} ${i + 1}` : specificMonster.name,
                source: 'programmed',
                ai: new StrategicAI(this, specificMonster, aiType), // ⭐ ИСПОЛЬЗУЕМ StrategicAI
                aiType: aiType,
                ap: 3,
                currentAction: null,
                combo: { type: null, count: 0 },
                previousActions: [],
                lastRestTurn: -10,
                memory: {
                    heroActions: [],
                    heroPatterns: {},
                    heroTendencies: {
                        aggressive: 0,
                        defensive: 0,
                        healing: 0,
                        predictable: 0
                    }
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
            maxHealth: monster.maxHealth || monster.health,
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
        
        // Обновляем визуальное отображение зарядов с задержкой для анимации
        setTimeout(() => {
            this.updateFlaskChargesDisplay();
        }, 100);

        console.log(`💧 Flask used: ${oldCharges} -> ${this.flask.currentCharges} charges`);
        return true;
    }

    // Метод для обновления визуального отображение зарядов
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

        // Обновляем визуальное отображение зарядов
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
                <div class="enemy-ai-info">
                    <span class="ai-type">ИИ: ${monster.data.aiType || 'агрессивный'}</span>
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
        
        // ⭐ ОБНОВЛЯЕМ ПАМЯТЬ МОНСТРОВ О ДЕЙСТВИИ ГЕРОЯ
        this.currentMonsters.forEach(monster => {
            if (monster.currentHealth > 0 && monster.ai && monster.ai.updateMemory) {
                monster.ai.updateMemory(action, this.players[1]);
            }
        });
        
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
        
        const action = monster.ai.decideAction();
        
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
        console.log(`🤖 ИИ ${monster.name} [${monster.aiType}]: действие=${monster.currentAction}, герой блокирует=${isHeroBlocking}, комбо блока=${this.players[1].combo.count}`);
        
        let damage = 0;
        let message = '';
        
        switch(monster.currentAction) {
            case 'attack':
            case 'strongAttack':
            case 'crushingAttack':
                damage = this.calculateMonsterDamage(monster, monsterUnit);
                const heroStats = this.getHeroStatsForBattle();
                
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
            this.updateFlaskChargesDisplay();
            
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

    completeMovementAfterBattle(victory, escape = false) {
        if (!this.pendingMovement) return;

        if (victory) {
            // Победа - перемещаем на целевую клетку
            const targetX = this.pendingMovement.x;
            const targetY = this.pendingMovement.y;
            const oldPosition = {...this.playerTacticalPosition};
            this.playerTacticalPosition = {x: targetX, y: targetY};
            
            console.log(`✅ Успешное перемещение героя ${this.currentHero.name} после боя с [${oldPosition.x}, ${oldPosition.y}] на: [${targetX}, ${targetY}]`);
        } else {
            if (escape) {
                // Побег - остаемся на текущей позиции
                console.log(`🏃 Герой ${this.currentHero.name} остался на своей позиции после побега: [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]`);
            } else {
                // Смерть в бою - возвращаем на стартовую точку
                const startPosition = this.currentTacticalMap.startPosition;
                const oldPosition = {...this.playerTacticalPosition};
                this.playerTacticalPosition = {...startPosition};
                
                console.log(`💀 Поражение! Возврат героя ${this.currentHero.name} на стартовую позицию: [${oldPosition.x}, ${oldPosition.y}] → [${startPosition.x}, ${startPosition.y}]`);
            }
        }
        
        if (this.activeOverlay === 'tactical-map' || this.activeOverlay === 'local-map') {
            this.calculateCSSScale();
            this.drawTacticalMap();
        }
        
        this.pendingMovement = null;
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
        
        // Обновляем флягу
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

    endTacticalBattle(victory, escape = false) {
        if (this.resultShown) return;
        this.resultShown = true;
        this.battleActive = false;

        console.log(`🎲 Завершение боя: победа=${victory}, побег=${escape}`);
        console.log(`❤️ Текущее здоровье героя: ${this.currentHero?.currentHealth}`);
        console.log(`🗺️ Контекст боя: ${this.battleContext}`);

        // Снимаем отметку активного боя и очищаем состояние
        if (window.game) {
            window.game.markBattleAsInactive();
            console.log("🎲 Бой отмечен как завершенный");
        }
        
        // Очищаем состояние боя из sessionStorage
        this.clearBattleState();

        if (victory) {
            const totalReward = this.currentMonsters.reduce((sum, monster) => sum + (monster.reward || 10), 0);
            const totalExperience = this.currentMonsters.reduce((sum, monster) => sum + (monster.experience || 5), 0);
            
            this.currentHero.gold += totalReward;
            window.game.systems.level.addExperience(this.currentHero, totalExperience);
            this.currentHero.monstersKilled = (this.currentHero.monstersKilled || 0) + this.currentMonsters.length;
            
            this.addBattleLog(`🎉 ПОБЕДА! +${totalReward} золота, +${totalExperience} опыта`);
        } else {
            if (escape) {
                // Побег - здоровье уже отнято в tryToFlee(), герой остается на месте
                this.currentHero.deaths = (this.currentHero.deaths || 0) + 0;
                this.addBattleLog("🏃 Побег успешен! Герой остался на своей позиции.");
            } else {
                // Смерть в бою - перемещаем на стартовую точку
                this.currentHero.currentHealth = 1;
                this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
                this.addBattleLog("💀 Поражение! Герой повержен и возвращен на стартовую позицию.");
            }
        }
        
        // Сохраняем состояние героя
        if (this.currentHero && window.game.systems.hero) {
            this.currentHero.currentHealth = this.battleGrid.allies[3]?.currentHealth || this.currentHero.currentHealth;
            window.game.systems.hero.calculateHeroStats(this.currentHero);
        }
        
        // Сохраняем игру
        if (window.game) {
            window.game.saveGame();
        }
        
        // Уведомляем систему карт о завершении боя
        if (this.battleContext === 'movement' && window.game.systems.map) {
            console.log(`🗺️ Уведомляем MapSystem о завершении боя: победа=${victory}, побег=${escape}`);
            window.game.systems.map.completeMovementAfterBattle(victory, escape);
        }
        
        // Важно: Всегда показываем результат боя и возвращаем в игру
        this.showBattleResult(victory, escape);
    }

    showBattleResult(victory, escape = false) {
        const app = document.getElementById('app');
        if (!app) return;

        let resultHTML = '';
        
        if (victory) {
            const totalReward = this.currentMonsters.reduce((sum, monster) => sum + (monster.reward || 10), 0);
            const totalExperience = this.currentMonsters.reduce((sum, monster) => sum + (monster.experience || 5), 0);
            
            resultHTML = `
                <div class="battle-result-overlay" style="display: flex; justify-content: center; align-items: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000;">
                    <div class="battle-result-modal victory" style="background: #1a1a2e; padding: 30px; border-radius: 15px; border: 3px solid #00ff00; text-align: center; max-width: 500px; width: 90%;">
                        <h3 style="color: #00ff00; margin-bottom: 20px; font-size: 28px;">🎉 ПОБЕДА!</h3>
                        <div class="result-details" style="margin-bottom: 25px; line-height: 1.6;">
                            <p style="font-size: 18px;">Убито монстров: ${this.currentMonsters.length}</p>
                            <p style="font-size: 18px; color: gold;">💰 +${totalReward} золота</p>
                            <p style="font-size: 18px; color: #3b82f6;">🌟 +${totalExperience} опыта</p>
                            <p style="font-size: 16px;">Раундов: ${this.battleRound}</p>
                        </div>
                        <button class="btn-primary" onclick="game.systems.battle.closeBattleResult()" 
                                style="padding: 12px 30px; font-size: 18px; background: #00ff00; color: black; border: none; border-radius: 8px; cursor: pointer;">
                            Продолжить
                        </button>
                    </div>
                </div>
            `;
        } else {
            if (escape) {
                resultHTML = `
                    <div class="battle-result-overlay" style="display: flex; justify-content: center; align-items: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000;">
                        <div class="battle-result-modal escape" style="background: #1a1a2e; padding: 30px; border-radius: 15px; border: 3px solid #ffaa00; text-align: center; max-width: 500px; width: 90%;">
                            <h3 style="color: #ffaa00; margin-bottom: 20px; font-size: 28px;">🏃 УСПЕШНЫЙ ПОБЕГ</h3>
                            <div class="result-details" style="margin-bottom: 25px; line-height: 1.6;">
                                <p style="font-size: 18px;">Герой успешно сбежал с поля боя</p>
                                <p style="font-size: 18px; color: #ef4444;">Потеряно 50% здоровья</p>
                                <p style="font-size: 18px;">Герой остался на своей позиции</p>
                                <p style="font-size: 16px;">Раундов: ${this.battleRound}</p>
                            </div>
                            <button class="btn-primary" onclick="game.systems.battle.closeBattleResult()" 
                                    style="padding: 12px 30px; font-size: 18px; background: #ffaa00; color: black; border: none; border-radius: 8px; cursor: pointer;">
                                Продолжить
                            </button>
                        </div>
                    </div>
                `;
            } else {
                resultHTML = `
                    <div class="battle-result-overlay" style="display: flex; justify-content: center; align-items: center; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 10000;">
                        <div class="battle-result-modal defeat" style="background: #1a1a2e; padding: 30px; border-radius: 15px; border: 3px solid #ef4444; text-align: center; max-width: 500px; width: 90%;">
                            <h3 style="color: #ef4444; margin-bottom: 20px; font-size: 28px;">💀 ПОРАЖЕНИЕ</h3>
                            <div class="result-details" style="margin-bottom: 25px; line-height: 1.6;">
                                <p style="font-size: 18px;">Герой повержен в бою</p>
                                <p style="font-size: 18px; color: #00ff00;">Здоровье восстановлено до 1</p>
                                <p style="font-size: 18px;">Возврат на стартовую позицию</p>
                                <p style="font-size: 16px;">Раундов: ${this.battleRound}</p>
                            </div>
                            <button class="btn-primary" onclick="game.systems.battle.closeBattleResult()" 
                                    style="padding: 12px 30px; font-size: 18px; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer;">
                                Продолжить
                            </button>
                        </div>
                    </div>
                `;
            }
        }
        
        const existingOverlay = document.querySelector('.battle-result-overlay');
        if (existingOverlay) existingOverlay.remove();
        
        app.insertAdjacentHTML('beforeend', resultHTML);
    }

    closeBattleResult() {
        const overlay = document.querySelector('.battle-result-overlay');
        if (overlay) overlay.remove();
        
        this.returnToGameAfterBattle();
    }

    returnToGameAfterBattle() {
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

    // Метод: Сохранение состояния боя
    saveBattleState() {
        try {
            const battleState = {
                active: true,
                heroId: this.currentHero?.id,
                monsterCount: this.currentMonsters?.length || 0,
                round: this.battleRound,
                context: this.battleContext,
                timestamp: Date.now()
            };
            
            sessionStorage.setItem('battleState', JSON.stringify(battleState));
            console.log("💾 Состояние боя сохранено:", battleState);
        } catch (error) {
            console.error("❌ Ошибка сохранения состояния боя:", error);
        }
    }

    // Метод: Очистка состояния боя
    clearBattleState() {
        try {
            sessionStorage.removeItem('battleState');
            console.log("🗑️ Состояние боя очищено");
        } catch (error) {
            console.error("❌ Ошибка очистки состояния боя:", error);
        }
    }

    // Метод: Восстановление после аварийного завершения
    recoverFromCrash() {
        try {
            const battleState = sessionStorage.getItem('battleState');
            if (battleState) {
                const state = JSON.parse(battleState);
                console.log("🎲 Обнаружено незавершенное состояние боя:", state);
                
                if (state.active && window.game && window.game.currentHero) {
                    // Восстанавливаем героя
                    this.currentHero = window.game.currentHero;
                    
                    // Считаем это поражением
                    this.currentHero.currentHealth = 1;
                    this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
                    
                    // Уведомляем систему карт
                    if (window.game.systems.map) {
                        window.game.systems.map.completeMovementAfterBattle(false, false);
                    }
                    
                    // Сохраняем игру
                    window.game.saveGame();
                    
                    // Очищаем состояние
                    this.clearBattleState();
                    
                    console.log("✅ Восстановление после аварийного завершения боя выполнено");
                    return true;
                }
            }
        } catch (error) {
            console.error("❌ Ошибка восстановления после аварийного завершения:", error);
            this.clearBattleState();
        }
        return false;
    }
    
    tryToFlee() {
        if (!this.currentHero || this.battleEnding) return false;

        console.log("🏃 Попытка побега...");
        
        const heroStats = this.getHeroStatsForBattle();
        const halfHealth = Math.floor(heroStats.maxHealth / 2);
        
        console.log(`🏃 Здоровье: ${this.currentHero.currentHealth}/${heroStats.maxHealth}, половина: ${halfHealth}`);
        
        // Проверяем, достаточно ли здоровья для побега
        if (this.currentHero.currentHealth <= halfHealth) {
            this.addBattleLog("💀 Недостаточно здоровья для побега! Герой погибает при попытке бегства.");
            
            // Смерть при попытке побега
            this.currentHero.currentHealth = 0;
            this.battleEnding = true;
            
            setTimeout(() => {
                this.endTacticalBattle(false, false); // Поражение, не побег
            }, 1000);
            
            return false;
        }
        
        // Исправление: Убедимся что здоровье действительно уменьшается
        const oldHealth = this.currentHero.currentHealth;
        
        // Важное исправление: Уменьшаем здоровье СРАЗУ
        this.currentHero.currentHealth = Math.max(1, oldHealth - halfHealth);
        
        console.log(`🏃 Здоровье уменьшено: ${oldHealth} → ${this.currentHero.currentHealth}`);
        
        // Обновляем полоску здоровья в бою
        const heroUnit = this.battleGrid.allies[3];
        if (heroUnit) {
            heroUnit.currentHealth = this.currentHero.currentHealth;
            this.updateHealthBar('allies', 3, this.currentHero.currentHealth, heroStats.maxHealth);
        }
        
        this.addBattleLog(`🏃 Побег успешен! Потеряно ${halfHealth} здоровья (${oldHealth} → ${this.currentHero.currentHealth}).`);
        
        this.battleEnding = true;
        
        setTimeout(() => {
            this.endTacticalBattle(false, true); // Поражение, но побег
        }, 1000);
        
        return true;
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

// ⭐⭐⭐ ИСПРАВЛЕННЫЙ КЛАСС: StrategicAI ⭐⭐⭐
class StrategicAI {
    constructor(battleSystem, monster, aiType = null) {
        this.bs = battleSystem;
        this.monster = monster;
        this.aiType = aiType || monster.aiType || 'aggressive';
        
        // ⭐ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильная инициализация lastRestTurn
        if (typeof this.monster.lastRestTurn === 'undefined') {
            this.monster.lastRestTurn = 0; // ✅ ИСПРАВЛЕНО: было -10
        }
        
        // ⭐ ПАМЯТЬ И АНАЛИЗ ПАТТЕРНОВ
        this.memory = {
            heroActions: [],          // История действий героя (последние 5)
            heroPatterns: {},         // Обнаруженные паттерны
            heroTendencies: {         // Склонности героя
                aggressive: 0,        // 0-100 как часто атакует
                defensive: 0,         // 0-100 как часто защищается
                healing: 0,           // 0-100 как часто лечится
                predictable: 0        // 0-100 насколько предсказуем
            },
            roundStats: {
                heroDamageDealt: 0,
                heroDamageTaken: 0,
                heroBlocksUsed: 0,
                heroHealsUsed: 0
            },
            actionHistoryLength: 5,   // Анализировать последние 5 действий
            lastHeroAction: null,
            consecutiveHeroActions: {} // Подряд идущие действия героя
        };
        
        // Статистика монстра в этом бою
        this.stats = {
            damageDealt: 0,
            damageTaken: 0,
            blocksUsed: 0,
            healsUsed: 0,
            attacksUsed: 0,
            restsUsed: 0,
            turnsAlive: 0
        };
        
        console.log(`🤖 Создан StrategicAI для ${monster.name} [${this.aiType}]`);
        console.log(`   Начальный lastRestTurn: ${this.monster.lastRestTurn} (round: ${this.bs.battleRound || 0})`);
    }
    
    // ⭐ ОБНОВЛЕНИЕ ПАМЯТИ О ДЕЙСТВИЯХ ГЕРОЯ
    updateMemory(heroAction, heroState) {
        // Сохраняем последнее действие героя
        this.memory.lastHeroAction = heroAction;
        
        // Добавляем действие в историю
        this.memory.heroActions.unshift(heroAction);
        if (this.memory.heroActions.length > this.memory.actionHistoryLength) {
            this.memory.heroActions.pop();
        }
        
        // Обновляем статистику последовательных действий
        if (!this.memory.consecutiveHeroActions[heroAction]) {
            this.memory.consecutiveHeroActions[heroAction] = 0;
        }
        
        // Сбрасываем счетчики других действий и увеличиваем текущее
        Object.keys(this.memory.consecutiveHeroActions).forEach(action => {
            if (action === heroAction) {
                this.memory.consecutiveHeroActions[action]++;
            } else {
                this.memory.consecutiveHeroActions[action] = 0;
            }
        });
        
        // Анализируем паттерны
        this.analyzePatterns();
        
        // Обновляем тенденции героя
        this.updateTendencies();
        
        console.log(`🤖 ${this.monster.name} запомнил действие героя: ${heroAction}`);
        console.log(`   Последовательность:`, this.memory.consecutiveHeroActions);
    }
    
    // ⭐ АНАЛИЗ ПАТТЕРНОВ В ДЕЙСТВИЯХ ГЕРОЯ
    analyzePatterns() {
        const actions = this.memory.heroActions;
        if (actions.length < 3) return;
        
        // Ищем повторяющиеся последовательности
        for (let i = 0; i < actions.length - 2; i++) {
            const sequence = `${actions[i]}|${actions[i+1]}|${actions[i+2]}`;
            this.memory.heroPatterns[sequence] = (this.memory.heroPatterns[sequence] || 0) + 1;
        }
        
        // Вычисляем предсказуемость
        const totalPatterns = Object.values(this.memory.heroPatterns).reduce((a, b) => a + b, 0);
        if (totalPatterns > 0) {
            const maxPatternCount = Math.max(...Object.values(this.memory.heroPatterns));
            this.memory.heroTendencies.predictable = Math.round((maxPatternCount / totalPatterns) * 100);
        }
    }
    
    // ⭐ ОБНОВЛЕНИЕ ТЕНДЕНЦИЙ ГЕРОЯ
    updateTendencies() {
        const actions = this.memory.heroActions;
        if (actions.length === 0) return;
        
        const attackActions = ['attack', 'strongAttack', 'crushingAttack', 'breakBlock'];
        const defenseActions = ['block'];
        const healActions = ['heal', 'rest'];
        
        this.memory.heroTendencies.aggressive = Math.round(
            (actions.filter(a => attackActions.includes(a)).length / actions.length) * 100
        );
        
        this.memory.heroTendencies.defensive = Math.round(
            (actions.filter(a => defenseActions.includes(a)).length / actions.length) * 100
        );
        
        this.memory.heroTendencies.healing = Math.round(
            (actions.filter(a => healActions.includes(a)).length / actions.length) * 100
        );
    }
    
    // ⭐ ОСНОВНОЙ МЕТОД: ПРИНЯТИЕ РЕШЕНИЯ
    decideAction() {
        this.stats.turnsAlive++;
        
        console.log(`\n🤖 ===== ${this.monster.name} [${this.aiType}] РАУНД ${this.bs.battleRound || 0} =====`);
        console.log(`🤖 Здоровье: ${this.monster.currentHealth}/${this.monster.maxHealth} (${Math.round((this.monster.currentHealth / this.monster.maxHealth) * 100)}%)`);
        console.log(`🤖 AP: ${this.monster.ap}`);
        console.log(`🤖 lastRestTurn: ${this.monster.lastRestTurn}, turnsSinceLastRest: ${(this.bs.battleRound || 0) - this.monster.lastRestTurn}`);
        
        // Получаем доступные действия
        const availableActions = this.getAvailableActions();
        
        console.log(`🤖 ${this.monster.name} доступные действия:`, availableActions);
        
        if (availableActions.length === 0) {
            console.log(`🤖 ${this.monster.name} - нет доступных действий! Возвращаем 'rest'`);
            return 'rest';
        }
        
        // ✅ ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Если доступен только отдых, добавим другие действия
        if (availableActions.length === 1 && availableActions[0] === 'rest' && this.monster.ap >= 1) {
            console.log(`🤖 ДОБАВЛЯЕМ АЛЬТЕРНАТИВЫ: был только отдых`);
            availableActions.push('attack');
            availableActions.push('block');
        }
        
        // Рассчитываем веса для каждого действия
        const actionWeights = this.calculateActionWeights(availableActions);
        
        // Выбираем действие по весу
        const selectedAction = this.selectActionByWeights(actionWeights);
        
        // Обновляем статистику
        this.updateStats(selectedAction);
        
        // Запоминаем когда последний раз отдыхали
        if (selectedAction === 'rest') {
            this.monster.lastRestTurn = this.bs.battleRound || 0;
            console.log(`🤖 ${this.monster.name} отдыхает, следующий отдых возможен через 3 хода`);
        }
        
        console.log(`🤖 ${this.monster.name} [${this.aiType}] выбрал: ${selectedAction}`);
        console.log(`   Веса:`, actionWeights);
        console.log(`   AP: ${this.monster.ap}, Здоровье: ${Math.round((this.monster.currentHealth / this.monster.maxHealth) * 100)}%`);
        console.log(`   Тенденции героя: агрессивность=${this.memory.heroTendencies.aggressive}%, защита=${this.memory.heroTendencies.defensive}%`);
        
        return selectedAction;
    }
    
    // ⭐ ПОЛУЧЕНИЕ ДОСТУПНЫХ ДЕЙСТВИЙ
    getAvailableActions() {
        const actions = [];
        const ap = this.monster.ap;
        const healthPercent = this.monster.currentHealth / this.monster.maxHealth;
        const currentRound = this.bs.battleRound || 0;
        
        // ✅ ИСПРАВЛЕНО: Правильный расчет разницы в раундах
        const turnsSinceLastRest = currentRound - this.monster.lastRestTurn;
        
        console.log(`🤖 Расчет отдыха: battleRound=${currentRound}, lastRestTurn=${this.monster.lastRestTurn}, turnsSinceLastRest=${turnsSinceLastRest}`);
        
        const canRest = turnsSinceLastRest >= 3 && ap >= 1;
        
        // Всегда доступны основные действия если есть ОД
        if (ap >= 1) {
            actions.push('attack');
            actions.push('block');
            actions.push('breakBlock');
            
            // ✅ ОТДЫХ ТОЛЬКО ЕСЛИ МОЖНО
            if (canRest) {
                actions.push('rest');
                console.log(`🤖 Отдых доступен (прошло ${turnsSinceLastRest} раундов)`);
            } else {
                console.log(`🤖 Отдых НЕ доступен (прошло ${turnsSinceLastRest} раундов, нужно >=3)`);
            }
        }
        
        // Лечение доступно только если здоровье ниже 80%
        if (ap >= 1 && healthPercent < 0.8) {
            actions.push('heal');
        }
        
        // Сильные атаки доступны если достаточно AP
        if (ap >= 2) actions.push('strongAttack');
        if (ap >= 4) actions.push('crushingAttack');
        
        // Фильтруем действия, которые действительно можно выполнить
        const filteredActions = actions.filter(action => ap >= this.bs.actionsCost[action]);
        
        // ✅ ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Если все действия слишком дорогие
        if (filteredActions.length === 0 && ap >= 1) {
            console.log(`🤖 ВСЕ ДЕЙСТВИЯ ДОРОГИЕ! Добавляем базовую атаку`);
            filteredActions.push('attack');
        }
        
        return filteredActions;
    }
    
    // ⭐ РАСЧЕТ ВЕСОВ ДЕЙСТВИЙ
    calculateActionWeights(availableActions) {
        const hero = this.bs.battleGrid.allies[3];
        const heroHealthPercent = hero ? hero.currentHealth / hero.maxHealth : 1;
        const monsterHealthPercent = this.monster.currentHealth / this.monster.maxHealth;
        const heroArmor = hero ? this.bs.getHeroStatsForBattle().armor : 0;
        const currentRound = this.bs.battleRound || 0;
        const turnsSinceLastRest = currentRound - this.monster.lastRestTurn;
        
        console.log(`🤖 Расчет весов: доступно ${availableActions.length} действий`);
        console.log(`🤖 Здоровье монстра: ${Math.round(monsterHealthPercent * 100)}%, героя: ${Math.round(heroHealthPercent * 100)}%`);
        console.log(`🤖 Броня героя: ${heroArmor}, turnsSinceLastRest: ${turnsSinceLastRest}`);
        
        const weights = {};
        
        availableActions.forEach(action => {
            let weight = 0;
            
            // 1. Базовый вес по типу ИИ
            weight += this.getBaseWeight(action);
            console.log(`   ${action}: базовый вес = ${this.getBaseWeight(action)}`);
            
            // 2. Модификатор здоровья (свой и героя)
            const healthMod = this.getHealthModifier(action, monsterHealthPercent, heroHealthPercent);
            weight += healthMod;
            console.log(`   ${action}: здоровье = +${healthMod}`);
            
            // 3. Модификатор брони и урона
            const armorMod = this.getArmorDamageModifier(action, heroArmor);
            weight += armorMod;
            console.log(`   ${action}: броня = +${armorMod}`);
            
            // 4. Модификатор контр-действий (АНТИ-ДЕЙСТВИЯ!)
            const counterMod = this.getCounterModifier(action);
            weight += counterMod;
            console.log(`   ${action}: контр-действия = +${counterMod}`);
            
            // 5. Модификатор комбо
            const comboMod = this.getComboModifier(action);
            weight += comboMod;
            console.log(`   ${action}: комбо = +${comboMod}`);
            
            // 6. Модификатор эффективности (формулы)
            const effectMod = this.getEffectivenessModifier(action, hero);
            weight += effectMod;
            console.log(`   ${action}: эффективность = +${effectMod}`);
            
            // 7. Ситуационные модификаторы
            const situMod = this.getSituationalModifier(action);
            weight += situMod;
            console.log(`   ${action}: ситуация = +${situMod}`);
            
            // 8. Ограничения (отрицательные модификаторы)
            const restrictMod = this.applyRestrictions(action);
            weight += restrictMod;
            console.log(`   ${action}: ограничения = +${restrictMod}`);
            
            // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Специальная обработка отдыха
            if (action === 'rest') {
                // Если недавно уже отдыхали - сильно уменьшаем вес
                if (turnsSinceLastRest < 2) {
                    weight -= 70;
                    console.log(`   ${action}: НЕДАВНО ОТДЫХАЛИ = -70`);
                }
                // Если много AP - уменьшаем вес отдыха
                if (this.monster.ap >= 5) {
                    weight -= 40;
                    console.log(`   ${action}: МНОГО AP = -40`);
                }
                // Если здоровье почти полное - уменьшаем вес отдыха
                if (monsterHealthPercent > 0.9) {
                    weight -= 50;
                    console.log(`   ${action}: ПОЛНОЕ ЗДОРОВЬЕ = -50`);
                }
            }
            
            // ✅ КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Увеличиваем вес атакующих действий
            if (this.isAttackAction(action)) {
                weight += 25; // Всегда немного повышаем вес атак
                console.log(`   ${action}: АТАКА БОНУС = +25`);
                
                // Особенно если у героя мало здоровья
                if (heroHealthPercent < 0.4) {
                    weight += 35;
                    console.log(`   ${action}: ДОБИВАНИЕ = +35`);
                }
            }
            
            // 9. Случайность (небольшая)
            const randomMod = (Math.random() * 20) - 10;
            weight += randomMod;
            console.log(`   ${action}: случайность = +${Math.round(randomMod)}`);
            
            // Убеждаемся, что вес положительный
            weights[action] = Math.max(1, Math.min(200, Math.floor(weight)));
            
            console.log(`   ${action}: ИТОГО вес = ${weights[action]}\n`);
        });
        
        return weights;
    }
    
    // ⭐ БАЗОВЫЙ ВЕС ПО ТИПУ ИИ
    getBaseWeight(action) {
        const profile = this.bs.aiProfiles[this.aiType];
        if (!profile) return 30;
        
        // ✅ ИСПРАВЛЕНО: Увеличены базовые веса атакующих действий
        const enhancedWeights = {
            aggressive: {
                attack: 85,          // Было 70
                strongAttack: 75,    // Было 60
                crushingAttack: 65,  // Было 50
                breakBlock: 55,      // Было 40
                block: 15,           // Было 20
                heal: 5,             // Было 5
                rest: 10             // Было 10
            },
            tank_armor: {
                attack: 35,          // Было 30
                strongAttack: 30,    // Было 25
                crushingAttack: 25,  // Было 20
                breakBlock: 40,      // Было 35
                block: 65,           // Было 60
                heal: 45,            // Было 40
                rest: 30             // Было 25
            },
            ranged_support: {
                attack: 45,          // Было 40
                strongAttack: 40,    // Было 35
                crushingAttack: 35,  // Было 30
                breakBlock: 55,      // Было 50
                block: 35,           // Было 30
                heal: 25,            // Было 20
                rest: 20             // Было 15
            },
            universal: {
                attack: 55,          // Было 50
                strongAttack: 50,    // Было 45
                crushingAttack: 45,  // Было 40
                breakBlock: 50,      // Было 45
                block: 50,           // Было 45
                heal: 35,            // Было 30
                rest: 25             // Было 20
            },
            tank_health: {
                attack: 40,          // Было 35
                strongAttack: 35,    // Было 30
                crushingAttack: 30,  // Было 25
                breakBlock: 45,      // Было 40
                block: 60,           // Было 55
                heal: 50,            // Было 45
                rest: 35             // Было 30
            }
        };
        
        const weights = enhancedWeights[this.aiType] || profile.baseWeights;
        return weights[action] || 25;
    }
    
    // ⭐ МОДИФИКАТОР ЗДОРОВЬЯ
    getHealthModifier(action, selfHealth, heroHealth) {
        let modifier = 0;
        const profile = this.bs.aiProfiles[this.aiType];
        
        // Критические уровни своего здоровья
        if (selfHealth < 0.2) {
            // Критически низкое здоровье
            if (action === 'heal') modifier += 60;
            if (action === 'block') modifier += 40;
            if (action === 'rest') modifier += 20;
            if (this.isAttackAction(action)) modifier -= 30;
        }
        else if (selfHealth < 0.5) {
            // Среднее здоровье
            if (action === 'heal') modifier += 30;
            if (action === 'block') modifier += 20;
        }
        else if (selfHealth > 0.9) {
            // Полное здоровье
            if (action === 'heal') modifier -= 40;
            if (action === 'block' && profile && profile.healthPriority < 0.5) modifier -= 20;
        }
        
        // Здоровье героя влияет на агрессию
        if (heroHealth < 0.3 && this.isAttackAction(action)) {
            modifier += 40; // Добивание!
        }
        else if (heroHealth < 0.6 && this.isAttackAction(action)) {
            modifier += 20; // Герой ранен - давить
        }
        
        return modifier;
    }
    
    // ⭐ МОДИФИКАТОР БРОНИ И УРОНА
    getArmorDamageModifier(action, heroArmor) {
        let modifier = 0;
        const monsterArmor = this.monster.armor || 0;
        const monsterDamage = this.monster.damage || 10;
        
        // Если у героя высокая броня
        if (heroArmor > monsterDamage * 2) {
            // Герой хорошо защищен
            if (action === 'crushingAttack') modifier += 50; // Пробивать броню
            if (action === 'breakBlock') modifier += 30;
            if (action === 'attack') modifier -= 20; // Обычные атаки неэффективны
        }
        
        // Если у монстра высокая броня
        if (monsterArmor > heroArmor * 1.5) {
            // Монстр хорошо защищен - можно рисковать
            if (this.isAttackAction(action)) modifier += 15;
        }
        
        return modifier;
    }
    
    // ⭐ МОДИФИКАТОР КОНТР-ДЕЙСТВИЙ (САМОЕ ВАЖНОЕ!)
    getCounterModifier(action) {
        if (!this.memory.lastHeroAction) return 0;
        
        const heroAction = this.memory.lastHeroAction;
        const counterKey = `hero_${heroAction}`;
        const counterMatrix = this.bs.counterMatrix[counterKey];
        
        if (!counterMatrix || !counterMatrix.weights[action]) return 0;
        
        let modifier = counterMatrix.weights[action];
        
        // Усиливаем контр-действие если герой повторяет одно и то же
        const consecutiveCount = this.memory.consecutiveHeroActions[heroAction] || 0;
        if (consecutiveCount >= 2) {
            // Герой повторяет действие - усилить контр-действие
            modifier = Math.floor(modifier * 1.5);
            console.log(`🤖 УСИЛЕНИЕ КОНТР-ДЕЙСТВИЯ: герой ${heroAction} x${consecutiveCount}, ${action} получает +50%`);
        }
        
        // Учитываем предсказуемость героя
        if (this.memory.heroTendencies.predictable > 70) {
            modifier = Math.floor(modifier * 1.3); // Герой предсказуем - легче контролировать
        }
        
        return modifier;
    }
    
    // ⭐ МОДИФИКАТОР КОМБО
    getComboModifier(action) {
        if (this.monster.combo.type === action && this.monster.combo.count > 0) {
            // Продолжение комбо
            return this.monster.combo.count * 12;
        } else if (this.monster.combo.count >= 3) {
            // Прерывание большого комбо наказывается
            return -15;
        }
        return 0;
    }
    
    // ⭐ МОДИФИКАТОР ЭФФЕКТИВНОСТИ (ПО ФОРМУЛАМ)
    getEffectivenessModifier(action, hero) {
        const formula = this.bs.effectivenessFormulas[action];
        if (!formula || !hero) return 0;
        
        try {
            const effectiveness = formula(this.monster, hero.data || hero);
            // Преобразуем эффективность в модификатор веса
            return Math.floor(effectiveness / 10);
        } catch (error) {
            console.warn(`❌ Ошибка расчета эффективности для ${action}:`, error);
            return 0;
        }
    }
    
    // ⭐ СИТУАЦИОННЫЕ МОДИФИКАТОРЫ
    getSituationalModifier(action) {
        let modifier = 0;
        const profile = this.bs.aiProfiles[this.aiType];
        
        // Первый раунд
        if ((this.bs.battleRound || 0) === 0) {
            if (this.isAttackAction(action)) modifier += 15; // Начать с атаки
        }
        
        // Поздние раунды
        if ((this.bs.battleRound || 0) > 5) {
            if (action === 'block') modifier += 10; // Становиться осторожнее
        }
        
        // Если герой агрессивен
        if (this.memory.heroTendencies.aggressive > 70) {
            if (action === 'block') modifier += 25; // Чаще защищаться
            if (action === 'heal' && this.monster.currentHealth < this.monster.maxHealth * 0.7) modifier += 20;
        }
        
        // Если герой защищается
        if (this.memory.heroTendencies.defensive > 70) {
            if (action === 'breakBlock') modifier += 30; // Пробивать защиту
            if (action === 'crushingAttack') modifier += 25;
        }
        
        // Если герой лечится
        if (this.memory.heroTendencies.healing > 60) {
            if (this.isAttackAction(action)) modifier += 20; // Прерывать лечение
        }
        
        // Учитываем рискованность профиля
        const riskFactor = profile?.riskTolerance || 0.5;
        if (this.isAttackAction(action)) {
            modifier += Math.floor(riskFactor * 20); // Рискованные ИИ чаще атакуют
        }
        
        return modifier;
    }
    
    // ⭐ ОГРАНИЧЕНИЯ
    applyRestrictions(action) {
        let modifier = 0;
        const currentRound = this.bs.battleRound || 0;
        const turnsSinceLastRest = currentRound - this.monster.lastRestTurn;
        
        if (action === 'rest') {
            // ✅ ИСПРАВЛЕНО: Убраны слишком жесткие ограничения
            if (turnsSinceLastRest < 3) {
                modifier -= 40;  // Было -100
                console.log(`🤖 Ограничение на отдых: -40 (прошло ${turnsSinceLastRest} ходов)`);
            } else if (turnsSinceLastRest < 4) {
                modifier -= 15;  // Было -30
            } else if (turnsSinceLastRest > 5) {
                modifier += 20;  // Увеличиваем если давно не отдыхали
            }
        }
        
        // Если очень много ОД (>=6) - не отдыхать
        if (this.monster.ap >= 6 && action === 'rest') {
            modifier -= 30;  // Было -40
        }
        
        // Если мало ОД (<=1) - отдых полезен
        if (this.monster.ap <= 1 && action === 'rest') {
            modifier += 15;  // Было +20
        }
        
        // Если здоровье почти полное - не лечиться
        const healthPercent = this.monster.currentHealth / this.monster.maxHealth;
        if (action === 'heal' && healthPercent > 0.9) {
            modifier -= 50;
        }
        
        // Если здоровье почти полное - не отдыхать
        if (action === 'rest' && healthPercent > 0.95) {
            modifier -= 30;
        }
        
        return modifier;
    }
    
    // ⭐ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    isAttackAction(action) {
        return ['attack', 'strongAttack', 'crushingAttack', 'breakBlock'].includes(action);
    }
    
    // ⭐ ВЫБОР ДЕЙСТВИЯ ПО ВЕСУ
    selectActionByWeights(actionWeights) {
        const totalWeight = Object.values(actionWeights).reduce((sum, weight) => sum + weight, 0);
        
        console.log(`🤖 Выбор действия из весов:`, actionWeights);
        console.log(`🤖 Общий вес: ${totalWeight}`);
        
        if (totalWeight === 0 || Object.keys(actionWeights).length === 0) {
            console.log(`🤖 ВСЕ ВЕСА НУЛЕВЫЕ ИЛИ НЕТ ДЕЙСТВИЙ!`);
            
            // Аварийный выбор
            if (this.monster.ap >= 1) {
                console.log(`🤖 Аварийный выбор: 'attack'`);
                return 'attack';
            } else {
                console.log(`🤖 Аварийный выбор: 'rest'`);
                return 'rest';
            }
        }
        
        const rand = Math.random() * totalWeight;
        let cumulative = 0;
        
        console.log(`🤖 Случайное число: ${rand.toFixed(2)}`);
        
        for (const [action, weight] of Object.entries(actionWeights)) {
            cumulative += weight;
            console.log(`🤖 Проверка ${action}: вес=${weight}, cumulative=${cumulative.toFixed(2)}`);
            
            if (rand <= cumulative) {
                console.log(`🤖 Выбрано действие: ${action} (вес: ${weight}, cumulative: ${cumulative.toFixed(2)})`);
                
                // ✅ ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: Не выбирать отдых слишком часто
                if (action === 'rest') {
                    const currentRound = this.bs.battleRound || 0;
                    const turnsSinceLastRest = currentRound - this.monster.lastRestRest;
                    
                    if (turnsSinceLastRest < 2) {
                        console.log(`🤖 ОТДЫХ ОТМЕНЕН! Слишком часто. Выбираем атаку вместо этого.`);
                        // Выбираем другое действие (не отдых)
                        const otherActions = Object.keys(actionWeights).filter(a => a !== 'rest');
                        if (otherActions.length > 0) {
                            return otherActions[0];
                        }
                    }
                }
                
                return action;
            }
        }
        
        // Fallback - выбираем первое доступное действие
        const actions = Object.keys(actionWeights);
        const fallback = actions[0] || 'attack';
        console.log(`🤖 Fallback выбор: ${fallback}`);
        return fallback;
    }
    
    // ⭐ ОБНОВЛЕНИЕ СТАТИСТИКИ
    updateStats(action) {
        if (this.isAttackAction(action)) {
            this.stats.attacksUsed++;
        } else if (action === 'block') {
            this.stats.blocksUsed++;
        } else if (action === 'heal') {
            this.stats.healsUsed++;
        } else if (action === 'rest') {
            this.stats.restsUsed++;
        }
    }
    
}

window.BattleSystem = BattleSystem;
window.StrategicAI = StrategicAI; // ⭐ ДОБАВЛЯЕМ ЭТУ СТРОКУ!

console.log("📦 BattleSystem полностью переписан с продвинутым стратегическим ИИ");
console.log("🤖 StrategicAI добавлен в глобальную область видимости");
