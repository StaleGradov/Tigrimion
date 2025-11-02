// ========== МОДУЛЬ 1: ОСНОВНОЙ КЛАСС И ИНИЦИАЛИЗАЦИЯ ==========

// Основной класс игры - главный контроллер
class HeroGame {
    constructor() {
        // Массивы данных игры
        this.heroes = [];        // Список всех героев
        this.items = [];         // Список всех предметов
        this.monsters = [];      // Список всех монстров
        this.maps = [];          // Список всех карт
        this.locations = [];     // Список всех локаций
        
        // Флаги отображения
        this.showReward = false;         // Показывать ли награду
        this.lastReward = 0;             // Последняя полученная награда
        this.currentHero = null;         // Текущий выбранный герой
        this.currentScreen = 'hero-select'; // Текущий экран игры
        this.currentMap = null;          // Текущая выбранная карта
        this.currentLocation = null;     // Текущая выбранная локация
        this.currentMonster = null;      // Текущий встреченный монстр
        
        // Свойства для системы боя
        this.battleActive = false;       // Активен ли бой
        this.battleRound = 0;            // Текущий раунд боя
        this.battleLog = [];             // Лог событий боя
        this.lastHealthUpdate = Date.now(); // Время последнего обновления здоровья
        this.healthInterval = null;      // Интервал для анимации здоровья
        
        // Результат последнего боя
        this.battleResult = null;
        
        // Общий инвентарь (для всех героев)
        this.globalInventory = [];
        
        // Видео для каждого героя (заглушки)
        this.heroVideos = {
            1: 'https://www.youtube.com/embed/mfziNIhX9mo',
            2: 'https://www.youtube.com/embed/dQw4w9WgXcQ',  
            3: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            // ... остальные герои
        };
        
        // Видео для карт и локаций
        this.videos = {
            map: 'https://www.youtube.com/embed/4gSmkjlEO_Q',
            location: 'https://www.youtube.com/embed/ytr51kwNLPo'
        };
        
        // Флаги показа видео вместо изображений
        this.showVideo = {
            hero: false,      // Показывать видео героя
            map: false,       // Показывать видео карты
            location: false   // Показывать видео локации
        };
        
        // Система прогресса локаций
        this.locationProgress = {};      // Прогресс по каждой локации
        this.monsterKillCount = {};      // Счетчик убийств каждого монстра
        
        // Запуск инициализации игры
        this.init();
    }

    // ========== МОДУЛЬ 2: ИНИЦИАЛИЗАЦИЯ И ЗАГРУЗКА ДАННЫХ ==========
    
    // Основной метод инициализации игры
    async init() {
        await this.loadGameData();    // Загрузка всех данных игры
        this.initLocationSystem();    // Инициализация системы локаций
        this.loadSave();              // Загрузка сохраненной игры
        
        // Разблокировка первого героя по умолчанию
        if (this.heroes.length > 0) {
            const firstHero = this.heroes.find(h => h.id === 1);
            if (firstHero) {
                firstHero.unlocked = true;
            }
        }
        
        this.renderHeroSelect();      // Показ экрана выбора героя
    }

    // Инициализация системы прогресса локаций
    initLocationSystem() {
        // Для каждой локации создаем запись прогресса
        this.locations.forEach(location => {
            const locationId = location.level;
            
            if (!this.locationProgress[locationId]) {
                this.locationProgress[locationId] = {
                    unlocked: locationId === 10,    // Только локация 10 доступна сначала
                    monstersKilled: new Set(),      // Множество убитых монстров
                    totalMonsters: location.monsterRange[1] - location.monsterRange[0] + 1
                };
            }
        });
        
        // Инициализация счетчиков убийств для каждого монстра
        this.monsters.forEach(monster => {
            if (!this.monsterKillCount[monster.id]) {
                this.monsterKillCount[monster.id] = 0;
            }
        });
    }

    // Загрузка JSON файла
    async loadJSON(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            return await response.json();
        } catch (error) {
            console.error('Ошибка загрузки ' + filePath + ':', error);
            return null;
        }
    }

    // Загрузка всех данных игры
    async loadGameData() {
        try {
            // Параллельная загрузка всех JSON файлов
            const [heroes, enemies, items, mapsData, locationsData] = await Promise.all([
                this.loadJSON('data/heroes.json'),
                this.loadJSON('data/enemies.json'),
                this.loadJSON('data/items.json'),
                this.loadJSON('data/maps.json'),
                this.loadJSON('data/locations.json')
            ]);

            // Заполнение данных игры
            this.heroes = heroes || [];
            this.monsters = enemies || [];
            this.items = items || [];
            this.maps = mapsData || [];
            this.locations = locationsData || [];

            // Разблокировка первого героя
            if (this.heroes.length > 0) {
                const firstHero = this.heroes.find(h => h.id === 1);
                if (firstHero) {
                    firstHero.unlocked = true;
                }
            }

            console.log('✅ Все данные загружены:', {
                heroes: this.heroes.length,
                monsters: this.monsters.length,
                items: this.items.length,
                maps: this.maps.length,
                locations: this.locations.length
            });

        } catch (error) {
            console.error('❌ Критическая ошибка загрузки данных:', error);
            this.createFallbackData();  // Создание тестовых данных при ошибке
        }
    }

    // Создание тестовых данных при ошибке загрузки
    createFallbackData() {
        // Создание базового героя
        this.heroes = [{
            id: 1,
            name: "Начальный герой",
            image: "images/heroes/hero1.jpg",
            race: "human",
            class: "warrior",
            saga: "golden_egg",
            baseHealth: 100,
            baseDamage: 20,
            baseArmor: 10,
            gold: 500.00,
            level: 1,
            experience: 0,
            monstersKilled: 0,
            deaths: 0,
            healthRegen: 100/60,
            inventory: [],
            equipment: {
                main_hand: null,
                off_hand: null,
                helmet: null,
                chest: null,
                gloves: null,
                legs: null,
                boots: null
            },
            unlocked: true,
            story: "Простой воин из далекой деревни..."
        }];

        // Создание тестовых монстров
        this.monsters = [];
        for (let i = 1; i <= 55; i++) {
            this.monsters.push({
                id: i,
                name: `Монстр ${i}`,
                image: "images/monsters/monster1.jpg",
                description: `Монстр уровня ${Math.ceil(i/10)}`,
                health: 20 + i * 5,
                maxHealth: 20 + i * 5,
                damage: 5 + i * 2,
                attack: 5 + i,
                defense: 2 + Math.floor(i/2),
                armor: 2 + Math.floor(i/3),
                speed: 3 + Math.floor(i/5),
                experience: 5 + i * 2,
                reward: 10 + i * 3,
                power: 15 + i * 4
            });
        }

        // Создание тестовых предметов
        this.items = [{
            id: 1,
            name: "Малое зелье здоровья",
            type: "potion",
            value: 20,
            price: 25,
            heal: 20,
            image: "images/items/potion1.jpg",
            description: "Восстанавливает 20 здоровья"
        }];

        // Создание тестовых карт
        this.maps = [{
            id: 1, 
            name: "Арканиум", 
            image: "images/maps/arcanium.jpg", 
            description: "Земля древней магии", 
            multiplier: 1.0, 
            unlocked: true 
        }];

        // Создание тестовых локаций
        this.locations = [];
        for (let level = 10; level >= 1; level--) {
            const startMonster = (10 - level) * 10 + 1;
            const endMonster = startMonster + 9;
            
            this.locations.push({
                level: level,
                name: `Локация ${11 - level}`,
                description: `Уровень сложности: ${level}`,
                image: "images/locations/level10.jpg",
                monsterRange: [startMonster, endMonster],
                artifactChance: 0.005 + (10 - level) * 0.001,
                relicChance: 0.0005 + (10 - level) * 0.0001
            });
        }
    }

    // ========== МОДУЛЬ 3: СИСТЕМА БОНУСОВ И ХАРАКТЕРИСТИК ==========

    // Получение всех доступных бонусов
    getBonuses() {
        return {
            races: {
                elf: { type: "damage_mult", value: 0.2, name: "Эльф", description: "Урон +20%", source: "race" },
                halfling: { type: "crit_chance", value: 0.2, name: "Полурослик", description: "20% шанс двойного урона", source: "race" },
                // ... другие расы
            },
            classes: {
                hunter: { type: "armor_penetration", value: 0.25, name: "Охотник", description: "25% шанс игнорировать броню", source: "class" },
                warrior: { type: "armor_mult", value: 0.15, name: "Воин", description: "+15% к броне", source: "class" },
                // ... другие классы
            },
            sagas: {
                golden_egg: { type: "health_mult", value: 0.3, name: "Золотое Яйцо", description: "+30% к здоровью", source: "saga" },
                vulkanor: { type: "armor_penetration", value: 0.25, name: "Вулканор", description: "25% шанс игнорировать броню", source: "saga" },
                // ... другие саги
            }
        };
    }

    // Получение всех активных бонусов героя
    getAllActiveBonuses(hero) {
        hero = hero || this.currentHero;
        if (!hero) return { race: [], class: [], saga: [], equipment: [] };
        
        const bonuses = this.getBonuses();
        const activeBonuses = {
            race: [],
            class: [],
            saga: [],
            equipment: []
        };
        
        // Бонусы от расы
        if (bonuses.races[hero.race]) {
            activeBonuses.race.push(bonuses.races[hero.race]);
        }
        
        // Бонусы от класса
        if (bonuses.classes[hero.class]) {
            activeBonuses.class.push(bonuses.classes[hero.class]);
        }
        
        // Бонусы от саги
        if (bonuses.sagas[hero.saga]) {
            activeBonuses.saga.push(bonuses.sagas[hero.saga]);
        }
        
        // Бонусы от экипировки
        Object.values(hero.equipment).forEach(itemId => {
            if (itemId) {
                const item = this.items.find(item => item.id === itemId);
                if (item && item.bonus) {
                    activeBonuses.equipment.push({
                        ...item.bonus,
                        source: "equipment",
                        itemName: item.name
                    });
                }
            }
        });
        
        return activeBonuses;
    }

    // Расчет суммарных бонусов
    calculateTotalBonuses(hero) {
        const activeBonuses = this.getAllActiveBonuses(hero);
        const totals = {
            health_mult: 0,
            damage_mult: 0,
            armor_mult: 0,
            gold_mult: 0,
            health_regen_mult: 0,
            crit_chance: 0,
            armor_penetration: 0,
            vampirism: 0
        };
        
        // Суммирование всех бонусов
        Object.values(activeBonuses).forEach(bonusGroup => {
            bonusGroup.forEach(bonus => {
                if (totals.hasOwnProperty(bonus.type)) {
                    totals[bonus.type] += bonus.value;
                }
            });
        });
        
        return totals;
    }

    // ========== МОДУЛЬ 4: СИСТЕМА УРОВНЕЙ И ОПЫТА ==========

    // Требования опыта для уровней
    getLevelRequirements() {
        return {
            1: 1,
            2: 100,
            3: 250,
            4: 500,
            5: 1000,
            6: 2000,
            7: 4000,
            8: 8000,
            9: 16000,
            10: 32000,
            11: 64000,
            12: 128000,
            13: 256000,
            14: 512000,
            15: 1024000,
        };
    }

    // Добавление опыта герою
    addExperience(amount) {
        if (!this.currentHero) return;
        
        const oldLevel = this.currentHero.level;
        this.currentHero.experience += amount;
        
        const levelRequirements = this.getLevelRequirements();
        let newLevel = oldLevel;
        
        // Проверка повышения уровня
        while (this.currentHero.experience >= levelRequirements[newLevel + 1] && levelRequirements[newLevel + 1]) {
            newLevel++;
        }
        
        if (newLevel > oldLevel) {
            this.levelUp(newLevel);
        }
        
        this.saveGame();
    }

    // Повышение уровня героя
    levelUp(newLevel) {
        const levelsGained = newLevel - this.currentHero.level;
        this.currentHero.level = newLevel;
        
        // Увеличение характеристик
        const healthIncrease = 10 * levelsGained;
        const damageIncrease = 2 * levelsGained;
        const armorIncrease = 1 * levelsGained;
        
        this.currentHero.baseHealth += healthIncrease;
        this.currentHero.baseDamage += damageIncrease;
        this.currentHero.baseArmor += armorIncrease;
        
        this.currentHero.currentHealth = this.calculateMaxHealth();
        
        this.addToLog('🎉 Уровень повышен! Теперь уровень ' + newLevel);
        this.addToLog('❤️ +' + healthIncrease + ' здоровья');
        this.addToLog('⚔️ +' + damageIncrease + ' урона');
        this.addToLog('🛡️ +' + armorIncrease + ' брони');
        
        this.checkHeroUnlocks();
    }

    // Проверка разблокировки новых героев
    checkHeroUnlocks() {
        if (!this.currentHero) return;
        
        const heroUnlockLevels = {
            2: 10,
            3: 15,
            4: 20,
            5: 25,
            6: 30,
            7: 35,
            8: 40
        };
        
        Object.keys(heroUnlockLevels).forEach(heroId => {
            const requiredLevel = heroUnlockLevels[heroId];
            const hero = this.heroes.find(h => h.id === parseInt(heroId));
            if (hero && !hero.unlocked && this.currentHero.level >= requiredLevel) {
                hero.unlocked = true;
                this.addToLog('🔓 Разблокирован новый герой: ' + hero.name + '!');
            }
        });
    }

    // ========== МОДУЛЬ 5: РАСЧЕТ ХАРАКТЕРИСТИК ==========

    // Расчет максимального здоровья
    calculateMaxHealth(hero) {
        hero = hero || this.currentHero;
        if (!hero) return 0;
        
        const totals = this.calculateTotalBonuses(hero);
        const levelMultiplier = 1 + (hero.level - 1) * 0.1;
        let health = hero.baseHealth * levelMultiplier;
        health += hero.baseHealth * totals.health_mult;
        
        return Math.round(health);
    }

    // Расчет всех характеристик героя
    calculateHeroStats(hero) {
        hero = hero || this.currentHero;
        if (!hero) return {};
        
        const totals = this.calculateTotalBonuses(hero);
        const levelMultiplier = 1 + (hero.level - 1) * 0.1;
        
        // Базовые характеристики
        let baseHealth = hero.baseHealth * levelMultiplier;
        let baseDamage = hero.baseDamage * levelMultiplier;
        let baseArmor = hero.baseArmor * levelMultiplier;
        
        // Применение бонусов
        let health = baseHealth + (hero.baseHealth * totals.health_mult);
        let damage = baseDamage + (hero.baseDamage * totals.damage_mult);
        let armor = baseArmor + (hero.baseArmor * totals.armor_mult);
        
        // Добавление характеристик от экипировки
        Object.values(hero.equipment).forEach(itemId => {
            if (itemId) {
                const item = this.items.find(item => item.id === itemId);
                if (item) {
                    damage += item.fixed_damage || 0;
                    armor += item.fixed_armor || 0;
                }
            }
        });
        
        // Расчет общей силы
        const power = Math.round((health / 10) + (damage * 1.5) + (armor * 2));
        const currentHealth = this.getCurrentHealthForDisplay(hero);
        
        return {
            health: Math.round(health),
            currentHealth: Math.floor(currentHealth),
            maxHealth: Math.round(health),
            damage: Math.round(damage),
            armor: Math.round(armor),
            power: power,
            bonuses: totals,
            baseHealth: Math.round(baseHealth),
            baseDamage: Math.round(baseDamage),
            baseArmor: Math.round(baseArmor)
        };
    }

    // Расчет урона атаки
    calculateAttackDamage(isHeroAttack = true) {
        const stats = this.calculateHeroStats();
        const totals = this.calculateTotalBonuses();
        
        let baseDamage = stats.damage;
        let isCritical = false;
        let isArmorPenetrated = false;
        let finalDamage = baseDamage;
        
        // Проверка критического удара
        if (isHeroAttack && Math.random() < totals.crit_chance) {
            isCritical = true;
            finalDamage *= 2;
            this.addBattleLog({
                message: '💥 КРИТИЧЕСКИЙ УДАР! Двойной урон!',
                type: 'critical'
            });
        }
        
        // Проверка проникновения брони
        if (isHeroAttack && Math.random() < totals.armor_penetration) {
            isArmorPenetrated = true;
            this.addBattleLog({
                message: '⚡ ПРОНИКНОВЕНИЕ! Броня противника проигнорирована!',
                type: 'penetration'
            });
        }
        
        return {
            damage: Math.round(finalDamage),
            isCritical,
            isArmorPenetrated
        };
    }

    // ========== МОДУЛЬ 6: СИСТЕМА БОЯ ==========

    // Основная атака в бою
    battleAttack() {
        if (!this.battleActive) return;
        
        this.battleRound++;
        const stats = this.calculateHeroStats(this.currentHero);
        const totals = this.calculateTotalBonuses();
        
        // Атака героя
        const heroAttack = this.calculateAttackDamage(true);
        let monsterDamageReduction = heroAttack.isArmorPenetrated ? 0 : this.currentMonster.armor;
        const heroDamage = Math.max(1, heroAttack.damage - monsterDamageReduction);
        
        this.currentMonster.currentHealth -= heroDamage;
        
        this.addBattleLog({
            message: `🗡️ ${this.currentHero.name} наносит ${heroDamage} урона!` + 
                     (heroAttack.isCritical ? ' 💥' : '') +
                     (heroAttack.isArmorPenetrated ? ' ⚡' : ''),
            type: 'hero-attack'
        });
        
        // Вампиризм - восстановление здоровья от урона
        if (totals.vampirism > 0 && heroDamage > 0) {
            const healAmount = Math.round(heroDamage * totals.vampirism);
            this.updateHealth(healAmount);
            this.addBattleLog({
                message: `🩸 Вампиризм! +${healAmount} здоровья`,
                type: 'vampirism'
            });
        }
        
        // Проверка смерти монстра
        if (this.currentMonster.currentHealth <= 0) {
            this.endBattle(true);
            return;
        }
        
        // Атака монстра
        const monsterDamage = Math.max(1, this.currentMonster.damage - stats.armor);
        this.updateHealth(-monsterDamage);
        
        this.addBattleLog({
            message: '👹 ' + this.currentMonster.name + ' наносит ' + monsterDamage + ' урона!',
            type: 'monster-attack'
        });
        
        // Проверка смерти героя
        if (this.currentHero.currentHealth <= 0) {
            this.endBattle(false);
            return;
        }
        
        this.saveGame();
        this.renderHeroScreen();
    }

    // Завершение боя
    endBattle(victory) {
        if (victory) {
            // Расчет награды за победу
            const totals = this.calculateTotalBonuses();
            const baseReward = this.currentMonster.reward;
            const goldMultiplier = 1 + totals.gold_mult;
            const reward = parseFloat((baseReward * goldMultiplier).toFixed(2));
            
            this.currentHero.gold = parseFloat((this.currentHero.gold + reward).toFixed(2));
            this.lastReward = reward;
            
            const baseExperience = Math.max(10, Math.floor(this.currentMonster.power / 2));
            const experienceGained = baseExperience;
            
            this.addExperience(experienceGained);
            this.currentHero.monstersKilled = (this.currentHero.monstersKilled || 0) + 1;
            this.updateLocationProgress(this.currentMonster.id);
            
            this.addBattleLog({
                message: `🎉 ПОБЕДА! Получено ${reward.toFixed(2)} золота (база: ${baseReward} + бонусы) и ${experienceGained} опыта`,
                type: 'victory'
            });
            
            this.addToLog(`🎯 Побежден ${this.currentMonster.name}! Получено ${reward.toFixed(2)} золота и ${experienceGained} опыта`);
            
            this.checkSpecialDrops();
            
            this.battleResult = {
                victory: true,
                reward: reward,
                experience: experienceGained,
                monsterName: this.currentMonster.name
            };
            
        } else {
            // Обработка поражения
            this.currentHero.currentHealth = 1;
            this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
            
            this.addBattleLog({
                message: '💀 ПОРАЖЕНИЕ! Герой повержен. Здоровье восстанавливается с 1 единицы.',
                type: 'defeat'
            });
            
            this.addToLog('💥 Проигран бой с ' + this.currentMonster.name + '. Здоровье восстанавливается с 1 единицы.');
            
            this.battleResult = {
                victory: false,
                monsterName: this.currentMonster.name
            };
        }
        
        // Сброс состояния боя
        this.battleActive = false;
        this.currentMonster = null;
        this.battleRound = 0;
        this.battleLog = [];
        
        this.saveGame();
        this.renderHeroScreen();
    }

    // ========== МОДУЛЬ 7: СИСТЕМА ЛОКАЦИЙ И ПРОГРЕССА ==========

    // Обновление прогресса локации
    updateLocationProgress(monsterId) {
        if (!this.currentLocation) return;
        
        const locationId = this.currentLocation.level;
        const progress = this.locationProgress[locationId];
        
        if (progress) {
            progress.monstersKilled.add(monsterId);
            this.monsterKillCount[monsterId] = (this.monsterKillCount[monsterId] || 0) + 1;
            
            const allMonstersKilled = this.checkIfAllMonstersKilled(locationId);
            if (allMonstersKilled) {
                this.completeLocation(locationId);
            }
            
            this.saveGame();
        }
    }

    // Проверка убиты ли все монстры в локации
    checkIfAllMonstersKilled(locationId) {
        const location = this.locations.find(l => l.level === locationId);
        if (!location) return false;
        
        const progress = this.locationProgress[locationId];
        if (!progress) return false;
        
        const [startMonster, endMonster] = location.monsterRange;
        for (let monsterId = startMonster; monsterId <= endMonster; monsterId++) {
            if (!progress.monstersKilled.has(monsterId)) {
                return false;
            }
        }
        
        return true;
    }

    // Завершение локации
    completeLocation(locationId) {
        const nextLocationId = locationId - 1;
        const nextProgress = this.locationProgress[nextLocationId];
        
        if (nextProgress) {
            nextProgress.unlocked = true;
            this.addToLog('🎉 Локация "' + this.getLocationName(locationId) + '" завершена!');
            this.addToLog('🔓 Открыта новая локация: "' + this.getLocationName(nextLocationId) + '"');
        }
        
        this.saveGame();
    }

    // ========== МОДУЛЬ 8: СИСТЕМА ЗДОРОВЬЯ И РЕГЕНЕРАЦИИ ==========

    // Получение текущего здоровья для отображения
    getCurrentHealthForDisplay(hero) {
        hero = hero || this.currentHero;
        if (!hero) return 0;
        
        const now = Date.now();
        const timePassed = (now - this.lastHealthUpdate) / 1000;
        
        if (!hero.currentHealth) {
            hero.currentHealth = this.calculateMaxHealth(hero);
        }
        
        let currentHealth = hero.currentHealth;
        const maxHealth = this.calculateMaxHealth(hero);
        
        // Регенерация здоровья со временем
        if (currentHealth > 0 && currentHealth < maxHealth) {
            const totals = this.calculateTotalBonuses(hero);
            const regenMultiplier = 1 + totals.health_regen_mult;
            const baseRegen = hero.healthRegen || 100/60;
            const healthToRegen = timePassed * baseRegen * regenMultiplier;
            currentHealth = Math.min(maxHealth, currentHealth + healthToRegen);
            
            if (currentHealth > hero.currentHealth) {
                this.lastHealthUpdate = now;
                hero.currentHealth = currentHealth;
                this.saveGame();
            }
        }
        
        // Защита от смерти - минимальное здоровье 1
        if (currentHealth <= 0 && this.currentHero) {
            currentHealth = 1;
            hero.currentHealth = 1;
        }
        
        return currentHealth;
    }

    // Обновление здоровья (лечение/урон)
    updateHealth(change) {
        if (!this.currentHero) return;
        
        if (!this.currentHero.currentHealth) {
            this.currentHero.currentHealth = this.calculateMaxHealth();
        }
        
        this.currentHero.currentHealth += change;
        const maxHealth = this.calculateMaxHealth();
        this.currentHero.currentHealth = Math.max(0, Math.min(maxHealth, this.currentHero.currentHealth));
        this.lastHealthUpdate = Date.now();
        this.saveGame();
    }

    // ========== МОДУЛЬ 9: СИСТЕМА ОТОБРАЖЕНИЯ И ИНТЕРФЕЙСА ==========

    // Отрисовка экрана выбора героя
    renderHeroSelect() {
        const container = document.getElementById('app');
        const heroesHTML = this.heroes.map(hero => {
            const isUnlocked = hero.id === 1 ? true : (hero.unlocked || false);
            const stats = this.calculateHeroStats(hero);
            const bonuses = this.getBonuses();
            
            const activeBonuses = this.getAllActiveBonuses(hero);
            const allBonuses = [...activeBonuses.race, ...activeBonuses.class, ...activeBonuses.saga, ...activeBonuses.equipment];
            const bonusDisplay = allBonuses.map(bonus => {
                const value = bonus.type.includes('_mult') ? Math.round(bonus.value * 100) + '%' : Math.round(bonus.value * 100) + '%';
                return `<span title="${bonus.description}">${this.getBonusIcon(bonus.type)} ${value}</span>`;
            }).join('');
            
            const raceName = bonuses.races[hero.race]?.name || 'Неизвестно';
            const className = bonuses.classes[hero.class]?.name || 'Неизвестно';
            const sagaName = bonuses.sagas[hero.saga]?.name || 'Неизвестно';

            return `
                <div class="hero-option ${isUnlocked ? '' : 'locked'}" 
                     onclick="${isUnlocked ? 'game.selectHero(' + hero.id + ')' : ''}">
                    <div class="hero-option-image">
                        <img src="${hero.image}" alt="${hero.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                        ${!isUnlocked ? '<div class="locked-overlay">🔒</div>' : ''}
                    </div>
                    <div class="hero-option-info">
                        <div class="hero-option-header">
                            <strong>${hero.name}</strong>
                            <span class="hero-level">Ур. ${hero.level}</span>
                        </div>
                        <div class="hero-option-stats">
                            <div class="stat-row">
                                <span>❤️ ${Math.floor(this.getCurrentHealthForDisplay(hero))}/${this.calculateMaxHealth(hero)}</span>
                                <span>⚔️ ${stats.damage}</span>
                                <span>🛡️ ${stats.armor}</span>
                                <span>🌟 ${stats.power}</span>
                            </div>
                            <div class="stat-row">
                                <span>💰 ${hero.gold.toFixed(2)}</span>
                                <span>⚡ ${hero.experience}/${this.getLevelRequirements()[hero.level + 1] || 'MAX'}</span>
                            </div>
                        </div>
                        ${bonusDisplay ? `
                            <div class="hero-option-skills">
                                ${bonusDisplay}
                            </div>
                        ` : ''}
                        <div class="hero-option-bonuses">
                            <small>${raceName} - ${className} - ${sagaName}</small>
                        </div>
                        ${!isUnlocked ? '<small class="locked-text">Требуется уровень: ' + (hero.id * 5) + '</small>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="screen active" id="screen-hero-select">
                <h2 class="text-center">Выберите героя</h2>
                <div class="hero-list">
                    ${heroesHTML}
                </div>
            </div>
        `;
    }

    // Получение иконки для бонуса
    getBonusIcon(bonusType) {
        const icons = {
            'health_mult': '❤️',
            'damage_mult': '⚔️',
            'armor_mult': '🛡️',
            'gold_mult': '💰',
            'health_regen_mult': '⚡',
            'crit_chance': '💥',
            'armor_penetration': '⚡',
            'vampirism': '🩸'
        };
        return icons[bonusType] || '🎯';
    }

    // Выбор героя
    selectHero(heroId) {
        const hero = this.heroes.find(h => h.id === heroId);
        if (!hero) {
            console.error('Герой не найден:', heroId);
            return;
        }
        
        const isUnlocked = hero.id === 1 ? true : (hero.unlocked || false);
        if (!isUnlocked) {
            console.log('Герой заблокирован:', hero.name);
            return;
        }
        
        this.currentHero = hero;
        this.showScreen('main');
        this.renderHeroScreen();
        this.saveGame();
    }

    // Переключение экранов
    showScreen(screenName) {
        this.currentScreen = screenName;
        if (this.healthInterval) {
            clearInterval(this.healthInterval);
            this.healthInterval = null;
        }
    }

    // Запуск анимации здоровья
    startHealthAnimation() {
        if (!this.currentHero) return;

        const updateHealthDisplay = () => {
            const stats = this.calculateHeroStats(this.currentHero);
            const healthPercent = (stats.currentHealth / stats.maxHealth) * 100;
            
            const healthFill = document.querySelector('.health-bar-fill');
            const currentHealthEl = document.getElementById('current-health');
            const maxHealthEl = document.getElementById('max-health');
            
            if (healthFill && currentHealthEl && maxHealthEl) {
                healthFill.style.width = healthPercent + '%';
                currentHealthEl.textContent = stats.currentHealth;
                maxHealthEl.textContent = stats.maxHealth;
            }
        };

        this.healthInterval = setInterval(updateHealthDisplay, 1000);
    }

    // Отрисовка главного экрана героя
    renderHeroScreen() {
        if (!this.currentHero) return;

        const stats = this.calculateHeroStats(this.currentHero);
        const bonuses = this.getBonuses();
        const activeBonuses = this.getAllActiveBonuses();

        // Получение экипированных предметов
        const weaponMain = this.currentHero.equipment.main_hand ? 
            this.items.find(item => item.id === this.currentHero.equipment.main_hand) : null;
        const weaponOff = this.currentHero.equipment.off_hand ? 
            this.items.find(item => item.id === this.currentHero.equipment.off_hand) : null;
        // ... остальные слоты экипировки

        const nextLevelExp = this.getLevelRequirements()[this.currentHero.level + 1];
        const expProgress = nextLevelExp ? (this.currentHero.experience / nextLevelExp) * 100 : 100;
        const healthPercent = (stats.currentHealth / stats.maxHealth) * 100;

        // Фоновые изображения
        const heroBackground = this.currentHero.image;
        const heroVideo = this.heroVideos[this.currentHero.id] || this.videos.hero;
        
        const monsterBackground = this.currentMonster ? this.currentMonster.image : 'default_monster_bg';
        const mapBackground = this.currentMap ? this.currentMap.image : 'default_map_bg';
        const locationBackground = this.currentLocation ? this.currentLocation.image : 'default_location_bg';

        const raceName = bonuses.races[this.currentHero.race]?.name || 'Неизвестно';
        const className = bonuses.classes[this.currentHero.class]?.name || 'Неизвестно';
        const sagaName = bonuses.sagas[this.currentHero.saga]?.name || 'Неизвестно';

        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="screen active" id="screen-main">
                <!-- Кнопки действий -->
                <div class="action-buttons">
                    <button class="btn-primary" onclick="game.startAdventure()">🎲 Путешествие</button>
                    <button class="btn-secondary" onclick="game.showInventory()">🎒 Инвентарь</button>
                    <button class="btn-secondary" onclick="game.showMerchant()">🏪 Магазин</button>
                    <button class="btn-danger" onclick="game.resetHero()">🔄 Сброс</button>
                    <button class="btn-secondary" onclick="game.renderHeroSelect()">🔁 Герои</button>
                </div>

                <!-- Основной layout с 4 колонками -->
                <div class="hero-layout">
                    <!-- Колонка героя -->
                    <div class="hero-column" style="background-image: url('${heroBackground}')">
                        ${this.showVideo.hero ? `
                            <div class="video-container">
                                <iframe src="${heroVideo}?autoplay=1&mute=1" 
                                        allow="autoplay; encrypted-media" 
                                        allowfullscreen>
                                </iframe>
                            </div>
                        ` : ''}
                        <div class="column-overlay"></div>
                        <div class="column-content">
                            <div class="column-title">🎯 ${this.currentHero.name}</div>
                            ${!this.showVideo.hero ? `
                                <button class="video-toggle" onclick="game.toggleVideo('hero')">🎬 Видео</button>
                            ` : `
                                <button class="video-toggle" onclick="game.toggleVideo('hero')">🖼️ Фото</button>
                            `}
                            
                            <!-- Информация о здоровье -->
                            <div class="hero-info">
                                <div class="health-display">
                                    <div class="health-bar-container">
                                        <div class="health-bar">
                                            <div class="health-bar-fill" style="width: ${healthPercent}%"></div>
                                        </div>
                                        <div class="health-text">
                                            ❤️ <span id="current-health">${stats.currentHealth}</span>/<span id="max-health">${stats.maxHealth}</span>
                                        </div>
                                    </div>
                                    <div class="health-regen">
                                        ⚡ ${Math.round(this.currentHero.healthRegen * 60 * (1 + stats.bonuses.health_regen_mult))}/мин
                                    </div>
                                </div>

                                <!-- Основные характеристики -->
                                <div class="hero-main-stats">
                                    <div class="main-stat">
                                        <span class="stat-icon">⚔️</span>
                                        <span class="stat-value">${stats.damage}</span>
                                        ${stats.bonuses.damage_mult > 0 ? `<div class="bonus-value">+${Math.round(stats.bonuses.damage_mult * 100)}%</div>` : ''}
                                    </div>
                                    <div class="main-stat">
                                        <span class="stat-icon">🛡️</span>
                                        <span class="stat-value">${stats.armor}</span>
                                        ${stats.bonuses.armor_mult > 0 ? `<div class="bonus-value">+${Math.round(stats.bonuses.armor_mult * 100)}%</div>` : ''}
                                    </div>
                                    <div class="main-stat">
                                        <span class="stat-icon">🌟</span>
                                        <span class="stat-value">${stats.power}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Секция бонусов -->
                            <div class="bonuses-section">
                                <h3>🎯 Активные бонусы</h3>
                                <!-- Бонусы расы -->
                                ${activeBonuses.race.length > 0 ? `
                                    <div class="bonus-source-group">
                                        <div class="bonus-source-title">🧬 Раса (${raceName})</div>
                                        <div class="bonus-display">
                                            ${activeBonuses.race.map(bonus => `
                                                <div class="bonus-badge race-bonus" title="${bonus.description}">
                                                    ${this.getBonusIcon(bonus.type)} ${Math.round(bonus.value * 100)}%
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- Бонусы класса -->
                                ${activeBonuses.class.length > 0 ? `
                                    <div class="bonus-source-group">
                                        <div class="bonus-source-title">⚔️ Класс (${className})</div>
                                        <div class="bonus-display">
                                            ${activeBonuses.class.map(bonus => `
                                                <div class="bonus-badge class-bonus" title="${bonus.description}">
                                                    ${this.getBonusIcon(bonus.type)} ${Math.round(bonus.value * 100)}%
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- Бонусы саги -->
                                ${activeBonuses.saga.length > 0 ? `
                                    <div class="bonus-source-group">
                                        <div class="bonus-source-title">📖 Сага (${sagaName})</div>
                                        <div class="bonus-display">
                                            ${activeBonuses.saga.map(bonus => `
                                                <div class="bonus-badge saga-bonus" title="${bonus.description}">
                                                    ${this.getBonusIcon(bonus.type)} ${Math.round(bonus.value * 100)}%
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- Бонусы экипировки -->
                                ${activeBonuses.equipment.length > 0 ? `
                                    <div class="bonus-source-group">
                                        <div class="bonus-source-title">🎒 Экипировка</div>
                                        <div class="bonus-display">
                                            ${activeBonuses.equipment.map(bonus => `
                                                <div class="bonus-badge equipment-bonus" title="${bonus.description} (${bonus.itemName})">
                                                    ${this.getBonusIcon(bonus.type)} ${Math.round(bonus.value * 100)}%
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                ${activeBonuses.race.length === 0 && activeBonuses.class.length === 0 && 
                                  activeBonuses.saga.length === 0 && activeBonuses.equipment.length === 0 ? `
                                    <div class="no-bonuses">Нет активных бонусов</div>
                                ` : ''}
                            </div>

                            <!-- Секция экипировки -->
                            <div class="equipment-section">
                                <!-- Слоты экипировки -->
                                <div class="equipment-slot weapon-slot ${weaponMain ? 'equipped' : 'empty'}" 
                                     onclick="game.unequipItem('main_hand')"
                                     onmouseover="game.showEquipmentTooltip(event, 'main_hand')"
                                     onmouseout="game.hideEquipmentTooltip()">
                                    <div class="equipment-icon">
                                        ${weaponMain ? '<img src="' + weaponMain.image + '" alt="' + weaponMain.name + '">' : '⚔️'}
                                    </div>
                                </div>
                                
                                <!-- ... остальные слоты экипировки -->
                                
                                <div class="equipment-slot empty" onclick="game.showInventory()" title="Открыть инвентарь">
                                    <div class="equipment-icon">🎒</div>
                                </div>
                            </div>
                            
                            <!-- Прогресс уровня -->
                            <div class="level-progress">
                                <div class="level-progress-fill" style="width: ${expProgress}%"></div>
                            </div>
                            <div class="hero-progress">
                                <span>Ур.${this.currentHero.level}</span>
                                <span>💰${this.currentHero.gold.toFixed(2)}</span>
                                <span>⚡${this.currentHero.experience}/${nextLevelExp || 'MAX'}</span>
                            </div>
                            
                            <!-- Статистика героя -->
                            <div class="hero-stats">
                                <div class="stat-item">
                                    <span class="stat-icon">💀</span>
                                    <span class="stat-label">Убийств:</span>
                                    <span class="stat-value">${this.currentHero.monstersKilled || 0}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-icon">☠️</span>
                                    <span class="stat-label">Смертей:</span>
                                    <span class="stat-value">${this.currentHero.deaths || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Колонка монстра -->
                    <div class="monster-column" style="background-image: url('${monsterBackground}')">
                        <div class="column-overlay"></div>
                        <div class="column-content">
                            <div class="column-title">🎭 Враг</div>
                            ${this.renderMonsterColumn()}
                        </div>
                    </div>

                    <!-- Колонка карты -->
                    <div class="map-column" style="background-image: url('${mapBackground}')">
                        <div class="column-overlay"></div>
                        <div class="column-content">
                            <div class="column-title">🗺️ Карта</div>
                            ${this.renderMapSelection()}
                        </div>
                    </div>

                    <!-- Колонка локации -->
                    <div class="location-column" style="background-image: url('${locationBackground}')">
                        <div class="column-overlay"></div>
                        <div class="column-content">
                            <div class="column-title">📍 Локация</div>
                            ${this.renderLocationSelection()}
                        </div>
                    </div>
                </div>

                <!-- Лог событий -->
                <div class="battle-log" id="battle-log"></div>
            </div>
        `;

        this.startHealthAnimation();
    }

    // ========== МОДУЛЬ 10: СИСТЕМА ЭКИПИРОВКИ И ИНВЕНТАРЯ ==========

    // Показать подсказку для слота экипировки
    showEquipmentTooltip(event, slot) {
        this.hideEquipmentTooltip();
        
        const slotNames = {
            'main_hand': '⚔️ Правая рука',
            'off_hand': '🛡️ Левая рука', 
            'helmet': '⛑️ Шлем',
            'chest': '👕 Нагрудник',
            'gloves': '🧤 Перчатки',
            'legs': '👖 Поножи',
            'boots': '👢 Ботинки'
        };
        
        const itemId = this.currentHero.equipment[slot];
        let tooltipContent = '';
        
        if (itemId) {
            const item = this.items.find(i => i.id === itemId);
            if (item) {
                tooltipContent = `
                    <div class="slot-name">${slotNames[slot]}</div>
                    <div class="item-stats">
                        <div><strong>${item.name}</strong></div>
                        ${item.fixed_damage ? `<div>⚔️ Урон: +${item.fixed_damage}</div>` : ''}
                        ${item.fixed_armor ? `<div>🛡️ Броня: +${item.fixed_armor}</div>` : ''}
                        ${item.bonus ? `<div>🎯 ${this.formatBonus(item.bonus)}</div>` : ''}
                        <div><em>${item.description}</em></div>
                        <div style="margin-top: 6px; color: #ff6b6b; font-size: 0.75em;">Кликните чтобы снять</div>
                    </div>
                `;
            }
        } else {
            tooltipContent = `
                <div class="slot-name">${slotNames[slot]}</div>
                <div class="empty-slot">Пустой слот</div>
                <div style="margin-top: 6px; color: #4cc9f0; font-size: 0.75em;">Откройте инвентарь чтобы экипировать</div>
            `;
        }
        
        const tooltip = document.createElement('div');
        tooltip.className = 'equipment-tooltip';
        tooltip.innerHTML = tooltipContent;
        
        event.currentTarget.appendChild(tooltip);
    }

    // Скрыть подсказки экипировки
    hideEquipmentTooltip() {
        const existingTooltips = document.querySelectorAll('.equipment-tooltip');
        existingTooltips.forEach(tooltip => tooltip.remove());
    }

    // Снять предмет
    unequipItem(slot) {
        const itemId = this.currentHero.equipment[slot];
        if (!itemId) {
            this.showInventory();
            return;
        }
        
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;
        
        // Проверка места в инвентаре
        if (this.currentHero.inventory.length >= 10) {
            this.addToLog('❌ Инвентарь полон! Максимум 10 предметов');
            return;
        }
        
        // Снятие предмета
        this.currentHero.equipment[slot] = null;
        this.currentHero.inventory.push(itemId);
        
        this.addToLog(`📦 Снято: ${item.name} (${this.getSlotName(slot)})`);
        this.saveGame();
        this.renderHeroScreen();
    }

    // ========== МОДУЛЬ 11: СИСТЕМА ПУТЕШЕСТВИЙ И ВСТРЕЧ ==========

    // Начать путешествие
    startAdventure() {
        if (!this.currentMap || !this.currentLocation) {
            this.addToLog('❌ Сначала выберите карту и локацию');
            return;
        }

        this.addToLog('🚀 Начато путешествие по карте ' + this.currentMap.name + ', локация: ' + this.currentLocation.name);
        
        setTimeout(() => {
            this.encounterMonster();
        }, 1000);
    }

    // Встретить монстра
    encounterMonster() {
        if (!this.currentLocation || !this.currentMap) {
            console.error('❌ Не выбрана локация или карта');
            return;
        }

        const minId = this.currentLocation.monsterRange[0];
        const maxId = this.currentLocation.monsterRange[1];
        
        if (!minId || !maxId) {
            console.error('❌ Неверный диапазон монстров в локации:', this.currentLocation);
            return;
        }
        
        // Создание списка доступных монстров
        const availableMonsters = [];
        for (let monsterId = minId; monsterId <= maxId; monsterId++) {
            availableMonsters.push(monsterId);
        }
        
        // Случайный выбор монстра
        const randomMonsterId = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
        
        let monster = this.monsters.find(m => m.id === randomMonsterId);
        if (!monster) {
            monster = this.monsters[0];
            if (!monster) {
                console.error('❌ Нет доступных монстров');
                return;
            }
        }

        // Создание текущего монстра с учетом множителя карты
        this.currentMonster = {
            id: monster.id,
            name: monster.name,
            image: monster.image,
            description: monster.description,
            health: Math.round(monster.health * this.currentMap.multiplier),
            damage: Math.round(monster.damage * this.currentMap.multiplier),
            armor: Math.round(monster.armor * this.currentMap.multiplier),
            reward: parseFloat((monster.reward * this.currentMap.multiplier).toFixed(2)),
            power: Math.round(((monster.health / 10) + (monster.damage * 1.5) + (monster.armor * 2)) * this.currentMap.multiplier)
        };

        this.addToLog('🎭 Встречен: ' + this.currentMonster.name);
        this.renderHeroScreen();
    }

    // ========== МОДУЛЬ 12: СИСТЕМА МАГАЗИНА И ТОРГОВЛИ ==========

    // Показать магазин
    showMerchant() {
        const availableItems = this.items.filter(item => item.requiredLevel <= (this.currentHero?.level || 1));
        
        const merchantHTML = availableItems.map(item => `
            <div class="merchant-item">
                <div class="merchant-item-image">
                    <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
                </div>
                <div class="merchant-item-info">
                    <strong>${item.name}</strong>
                    <div class="item-stats">
                        ${item.fixed_damage ? `<span>⚔️ Урон: +${item.fixed_damage}</span>` : ''}
                        ${item.fixed_armor ? `<span>🛡️ Броня: +${item.fixed_armor}</span>` : ''}
                        ${item.heal ? `<span>❤️ Лечение: +${item.heal}</span>` : ''}
                        ${item.bonus ? `<span>🎯 ${this.formatBonus(item.bonus)}</span>` : ''}
                    </div>
                    <div class="item-price">
                        <span>💰 Купить: ${item.price.toFixed(2)}</span>
                        <span>💸 Продать: ${(item.sellPrice || Math.floor(item.price * 0.5)).toFixed(2)}</span>
                    </div>
                    <small>${item.description}</small>
                    <div class="merchant-actions">
                        <button class="btn-primary" onclick="game.buyItem(${item.id})">Купить</button>
                        ${this.currentHero.inventory.includes(item.id) ? 
                            `<button class="btn-secondary" onclick="game.sellItem(${item.id})">Продать</button>` : 
                            ''
                        }
                    </div>
                </div>
            </div>
        `).join('');

        const container = document.getElementById('app');
        container.innerHTML += `
            <div class="screen active" id="screen-merchant">
                <h3 class="text-center">🏪 Магазин</h3>
                <div class="hero-info" style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span>💰 Ваше золото: ${this.currentHero?.gold.toFixed(2) || 0}</span>
                        <span>🎒 Свободно мест: ${10 - (this.currentHero?.inventory?.length || 0)}/10</span>
                    </div>
                </div>
                <div class="merchant-list">
                    ${merchantHTML || '<div class="text-center">Товаров нет</div>'}
                </div>
                <div class="action-buttons">
                    <button class="btn-secondary" onclick="game.renderHeroScreen()">← Назад к герою</button>
                </div>
            </div>
        `;

        this.showScreen('merchant');
    }

    // Купить предмет
    buyItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        if (this.currentHero.gold < item.price) {
            this.addToLog(`❌ Недостаточно золота для покупки ${item.name}`);
            return;
        }

        if (this.currentHero.inventory.length >= 10) {
            this.addToLog(`❌ Инвентарь полон! Максимум 10 предметов`);
            return;
        }

        if (this.currentHero.inventory.includes(itemId)) {
            this.addToLog(`❌ У вас уже есть ${item.name}`);
            return;
        }

        this.currentHero.gold = parseFloat((this.currentHero.gold - item.price).toFixed(2));
        this.currentHero.inventory.push(itemId);
        
        this.addToLog(`🛒 Куплено: ${item.name} за ${item.price.toFixed(2)} золота`);
        this.saveGame();
        this.showMerchant();
    }

    // Продать предмет
    sellItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        if (!this.currentHero.inventory.includes(itemId)) {
            this.addToLog(`❌ Предмет ${item.name} не найден в инвентаре`);
            return;
        }

        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);
        const sellPrice = item.sellPrice || Math.floor(item.price * 0.5);
        this.currentHero.gold = parseFloat((this.currentHero.gold + sellPrice).toFixed(2));
        
        // Снятие предмета если он был экипирован
        Object.keys(this.currentHero.equipment).forEach(slot => {
            if (this.currentHero.equipment[slot] === itemId) {
                this.currentHero.equipment[slot] = null;
            }
        });

        this.addToLog(`💰 Продано: ${item.name} за ${sellPrice.toFixed(2)} золота`);
        this.saveGame();
        this.showMerchant();
    }

    // ========== МОДУЛЬ 13: СИСТЕМА ИНВЕНТАРЯ ==========

    // Показать инвентарь
    showInventory() {
        if (!this.currentHero) return;

        const inventoryHTML = this.currentHero.inventory.map(itemId => {
            const item = this.items.find(i => i.id === itemId);
            if (!item) return '';
            
            const isEquipped = Object.values(this.currentHero.equipment).includes(itemId);
            
            return `
                <div class="inventory-item" onclick="game.equipItem(${itemId})">
                    <div class="inventory-item-image">
                        <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
                    </div>
                    <div class="inventory-item-info">
                        <strong>${item.name}</strong>
                        <div class="item-stats">
                            ${item.fixed_damage ? `<span>⚔️ Урон: +${item.fixed_damage}</span>` : ''}
                            ${item.fixed_armor ? `<span>🛡️ Броня: +${item.fixed_armor}</span>` : ''}
                            ${item.heal ? `<span>❤️ Лечение: +${item.heal}</span>` : ''}
                            ${item.bonus ? `<span>🎯 ${this.formatBonus(item.bonus)}</span>` : ''}
                        </div>
                        <small>${item.description}</small>
                        ${isEquipped ? '<small style="color: #4ade80;">✓ Надето</small>' : '<small style="color: #4cc9f0;">📦 В инвентаре</small>'}
                    </div>
                </div>
            `;
        }).join('');

        const container = document.getElementById('app');
        container.innerHTML += `
            <div class="screen active" id="screen-inventory">
                <h3 class="text-center">🎒 Инвентарь</h3>
                <div class="inventory-grid">
                    ${inventoryHTML || '<div class="text-center">Инвентарь пуст</div>'}
                </div>
                <div class="action-buttons">
                    <button class="btn-secondary" onclick="game.renderHeroScreen()">← Назад к герою</button>
                </div>
            </div>
        `;

        this.showScreen('inventory');
    }

    // Экипировать предмет
    equipItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        // Использование зелья
        if (item.type === 'potion') {
            this.usePotion(item);
            return;
        }

        let slot = this.getEquipmentSlot(item);
        if (!slot) {
            this.addToLog(`❌ Неизвестный тип предмета: ${item.type}`);
            return;
        }

        // Снятие текущего предмета если есть
        const currentEquipped = this.currentHero.equipment[slot];
        if (currentEquipped) {
            if (!this.currentHero.inventory.includes(currentEquipped)) {
                this.currentHero.inventory.push(currentEquipped);
            }
        }

        // Экипировка нового предмета
        this.currentHero.equipment[slot] = itemId;
        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);

        this.addToLog(`🎯 Надето: ${item.name} (${this.getSlotName(slot)})`);
        this.saveGame();
        this.renderHeroScreen();
    }

    // Получить слот для предмета
    getEquipmentSlot(item) {
        const slotMap = {
            'weapon': ['main_hand', 'off_hand'],
            'helmet': ['helmet'],
            'chest': ['chest'], 
            'gloves': ['gloves'],
            'legs': ['legs'],
            'boots': ['boots']
        };
        
        return slotMap[item.type] ? slotMap[item.type][0] : null;
    }

    // Получить название слота
    getSlotName(slot) {
        const slotNames = {
            'main_hand': 'Правая рука',
            'off_hand': 'Левая рука', 
            'helmet': 'Шлем',
            'chest': 'Нагрудник',
            'gloves': 'Перчатки',
            'legs': 'Поножи',
            'boots': 'Ботинки'
        };
        
        return slotNames[slot] || 'Неизвестный слот';
    }

    // Использовать зелье
    usePotion(item) {
        if (item.type !== 'potion') return;

        if (item.heal) {
            this.updateHealth(item.heal);
            this.addToLog(`❤️ Использовано: ${item.name} (+${item.heal} здоровья)`);
        }

        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== item.id);
        
        this.saveGame();
        this.showInventory();
    }

    // ========== МОДУЛЬ 14: СИСТЕМА СОХРАНЕНИЯ И ЗАГРУЗКИ ==========

    // Сохранение игры
    saveGame() {
        if (this.currentHero) {
            // Преобразование Set в Array для сохранения
            const locationProgressForSave = {};
            Object.keys(this.locationProgress).forEach(locationId => {
                const progress = this.locationProgress[locationId];
                locationProgressForSave[locationId] = {
                    ...progress,
                    monstersKilled: Array.from(progress.monstersKilled)
                };
            });

            localStorage.setItem('heroGameSave', JSON.stringify({
                currentHeroId: this.currentHero.id,
                heroes: this.heroes,
                currentMap: this.currentMap,
                currentLocation: this.currentLocation,
                lastHealthUpdate: this.lastHealthUpdate,
                globalInventory: this.globalInventory,
                locationProgress: locationProgressForSave,
                monsterKillCount: this.monsterKillCount,
                showVideo: this.showVideo
            }));
        }
    }

    // Загрузка сохранения
    loadSave() {
        try {
            const save = localStorage.getItem('heroGameSave');
            if (save) {
                const data = JSON.parse(save);
                
                const savedHeroProgress = data.heroes || [];
                const currentHeroId = data.currentHeroId;
                
                // Создание карты прогресса героев
                const progressMap = new Map();
                savedHeroProgress.forEach(hero => {
                    progressMap.set(hero.id, {
                        gold: hero.gold,
                        level: hero.level,
                        experience: hero.experience,
                        inventory: hero.inventory,
                        equipment: hero.equipment,
                        currentHealth: hero.currentHealth,
                        unlocked: hero.unlocked,
                        monstersKilled: hero.monstersKilled || 0,
                        deaths: hero.deaths || 0
                    });
                });
                
                // Обновление героев сохраненным прогрессом
                this.heroes = this.heroes.map(freshHero => {
                    const progress = progressMap.get(freshHero.id);
                    if (progress) {
                        return {
                            ...freshHero,
                            ...progress
                        };
                    }
                    return freshHero;
                });
                
                // Загрузка остальных данных
                this.currentMap = data.currentMap || null;
                this.currentLocation = data.currentLocation || null;
                this.lastHealthUpdate = data.lastHealthUpdate || Date.now();
                this.globalInventory = data.globalInventory || [];
                this.monsterKillCount = data.monsterKillCount || {};
                this.showVideo = data.showVideo || this.showVideo;
                
                // Восстановление прогресса локаций
                if (data.locationProgress) {
                    Object.keys(data.locationProgress).forEach(locationId => {
                        const progress = data.locationProgress[locationId];
                        this.locationProgress[locationId] = {
                            ...progress,
                            monstersKilled: new Set(progress.monstersKilled || [])
                        };
                    });
                }
                
                // Восстановление текущего героя
                if (currentHeroId) {
                    this.currentHero = this.heroes.find(h => h.id === currentHeroId);
                    if (this.currentHero) {
                        this.showScreen('main');
                        this.renderHeroScreen();
                    }
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки сохранения:', error);
        }
    }

    // ========== МОДУЛЬ 15: ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    // Добавление сообщения в лог
    addToLog(message) {
        const log = document.getElementById('battle-log');
        if (log) {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = message;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        }
    }

    // Добавление сообщения в лог боя
    addBattleLog(entry) {
        this.battleLog.push(entry);
        if (this.battleLog.length > 10) {
            this.battleLog.shift();
        }
    }

    // Форматирование бонуса для отображения
    formatBonus(bonus) {
        if (!bonus || bonus.type === 'none') return 'Нет бонуса';
        
        const bonusNames = {
            'health_mult': 'Здоровье',
            'damage_mult': 'Урон', 
            'armor_mult': 'Броня',
            'gold_mult': 'Золото',
            'health_regen_mult': 'Регенерация',
            'crit_chance': 'Криты',
            'armor_penetration': 'Пенетрация',
            'vampirism': 'Вампиризм'
        };

        const value = bonus.type.includes('_mult') ? 
            Math.round(bonus.value * 100) : Math.round(bonus.value * 100);
            
        return bonusNames[bonus.type] ? 
            `${bonusNames[bonus.type]} +${value}%` : 
            `Бонус: +${value}%`;
    }

    // Переключение видео/изображения
    toggleVideo(type) {
        this.showVideo[type] = !this.showVideo[type];
        this.renderHeroScreen();
    }

    // Сброс героя
    resetHero() {
        if (!this.currentHero) return;
        
        const confirmed = confirm("⚠️ Вы уверены что хотите сбросить героя?\n\nВсе характеристики, предметы и прогресс будут сброшены к базовым значениям. Это действие нельзя отменить.");
        
        if (!confirmed) {
            this.addToLog("❌ Сброс героя отменен");
            return;
        }
        
        const baseConfig = {
            race: "human",
            class: "warrior", 
            saga: "golden_egg",
            baseHealth: 100,
            baseDamage: 20,
            baseArmor: 10,
            gold: 500.00,
            level: 1,
            experience: 0,
            monstersKilled: 0,
            deaths: 0,
            inventory: [],
            equipment: {
                main_hand: null,
                off_hand: null,
                helmet: null,
                chest: null,
                gloves: null,
                legs: null,
                boots: null
            }
        };
        
        const heroName = this.currentHero.name;
        const heroImage = this.currentHero.image;
        
        Object.assign(this.currentHero, baseConfig);
        this.currentHero.name = heroName;
        this.currentHero.image = heroImage;
        
        this.addToLog("🔄 Герой сброшен к базовым настройкам");
        this.saveGame();
        this.renderHeroScreen();
    }

    // Проверка специальных дропов
    checkSpecialDrops() {
        if (!this.currentLocation) return;
        
        if (Math.random() < this.currentLocation.artifactChance) {
            this.dropArtifact();
        }
        
        if (Math.random() < this.currentLocation.relicChance) {
            this.dropRelic();
        }
    }

    // Выпадение артефакта
    dropArtifact() {
        this.addToLog('✨ Найден редкий артефакт!');
    }

    // Выпадение реликвии
    dropRelic() {
        this.addToLog('🌟 Найдена легендарная реликвия!');
    }
}

// ========== МОДУЛЬ 16: ЗАПУСК ИГРЫ ==========

console.log('🚀 Script.js загружен!');

let game;

// Запуск игры после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM загружен');
        game = new HeroGame();
        window.game = game;
    });
} else {
    console.log('✅ DOM уже готов');
    game = new HeroGame();
    window.game = game;
}
