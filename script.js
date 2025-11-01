// Основной класс игры
class HeroGame {
    constructor() {
        this.heroes = [];
        this.items = [];
        this.monsters = [];
        this.maps = [];
        this.locations = [];
        
        this.showReward = false;
        this.lastReward = 0;
        this.currentHero = null;
        this.currentScreen = 'hero-select';
        this.currentMap = null;
        this.currentLocation = null;
        this.currentMonster = null;
        
        // Свойства для боя
        this.battleActive = false;
        this.battleRound = 0;
        this.battleLog = [];
        this.lastHealthUpdate = Date.now();
        this.healthInterval = null;
        
        // Результат боя
        this.battleResult = null;
        
        // Общий инвентарь
        this.globalInventory = [];
        
        // Видео для каждого героя
        this.heroVideos = {
            1: 'https://www.youtube.com/watch?v=mfziNIhX9mo',
            2: 'https://www.youtube.com/embed/dQw4w9WgXcQ',  
            3: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            4: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            5: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            6: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            7: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            8: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
        };
        
        this.videos = {
            map: 'https://www.youtube.com/watch?v=4gSmkjlEO_Q',
            location: 'https://www.youtube.com/watch?v=ytr51kwNLPo'
        };
        
        this.showVideo = {
            hero: false,
            map: false,
            location: false
        };
        
        // Новая система прогресса локаций - убийство монстров
        this.locationProgress = {
            10: { 
                unlocked: true, 
                monstersKilled: Array(10).fill(0),
                totalMonsters: 10,
                name: "Начальные земли"
            },
            9: { 
                unlocked: false, 
                monstersKilled: Array(10).fill(0),
                totalMonsters: 10,
                name: "Лесные тропы" 
            },
            8: { 
                unlocked: false, 
                monstersKilled: Array(10).fill(0),
                totalMonsters: 10,
                name: "Горные ущелья"
            },
            7: { 
                unlocked: false, 
                monstersKilled: Array(10).fill(0),
                totalMonsters: 10,
                name: "Подземелья"
            },
            6: { 
                unlocked: false, 
                monstersKilled: Array(10).fill(0),
                totalMonsters: 10,
                name: "Болота"
            },
            5: { 
                unlocked: false, 
                monstersKilled: Array(10).fill(0),
                totalMonsters: 10,
                name: "Вулканы"
            },
            4: { 
                unlocked: false, 
                monstersKilled: Array(10).fill(0),
                totalMonsters: 10,
                name: "Ледяные пустоши"
            },
            3: { 
                unlocked: false, 
                monstersKilled: Array(10).fill(0),
                totalMonsters: 10,
                name: "Небесные острова"
            },
            2: { 
                unlocked: false, 
                monstersKilled: Array(10).fill(0),
                totalMonsters: 10,
                name: "Храмы древних"
            },
            1: { 
                unlocked: false, 
                monstersKilled: Array(10).fill(0),
                totalMonsters: 10,
                name: "Тронный зал"
            }
        };
        
        this.init();
    }

    async init() {
        await this.loadGameData();
        this.loadSave();
        
        if (this.heroes.length > 0) {
            const firstHero = this.heroes.find(h => h.id === 1);
            if (firstHero) {
                firstHero.unlocked = true;
            }
        }
        
        this.renderHeroSelect();
    }

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

    async loadGameData() {
        try {
            const [heroes, enemies, items, mapsData, locationsData] = await Promise.all([
                this.loadJSON('data/heroes.json'),
                this.loadJSON('data/enemies.json'),
                this.loadJSON('data/items.json'),
                this.loadJSON('data/maps.json'),
                this.loadJSON('data/locations.json')
            ]);

            this.heroes = heroes || [];
            this.monsters = enemies || [];
            this.items = items || [];
            this.maps = mapsData || [];
            this.locations = locationsData || [];

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
            this.createFallbackData();
        }
    }

    createFallbackData() {
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
            gold: 500,
            level: 1,
            experience: 0,
            healthRegen: 100/60,
            inventory: [],
            equipment: { main_hand: null, chest: null },
            unlocked: true,
            story: "Простой воин из далекой деревни..."
        }];

        // Создаем 100 монстров для системы локаций
        this.monsters = [];
        for (let i = 1; i <= 100; i++) {
            this.monsters.push({
                id: i,
                name: `Монстр ${i}`,
                image: "images/monsters/monster1.jpg",
                description: `Монстр уровня ${Math.ceil(i/10)}`,
                health: 20 + (i * 3),
                maxHealth: 20 + (i * 3),
                damage: 5 + i,
                attack: 5 + i,
                defense: 2 + Math.floor(i/2),
                armor: 2 + Math.floor(i/3),
                speed: 3 + Math.floor(i/5),
                experience: 5 + (i * 2),
                reward: 10 + (i * 3),
                power: 15 + (i * 4)
            });
        }

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

        this.maps = [{
            id: 1, 
            name: "Арканиум", 
            image: "images/maps/arcanium.jpg", 
            description: "Земля древней магии", 
            multiplier: 1.0, 
            unlocked: true 
        }];

        // Создаем локации для новой системы
        this.locations = [];
        const locationNames = {
            10: "Начальные земли",
            9: "Лесные тропы", 
            8: "Горные ущелья",
            7: "Подземелья",
            6: "Болота",
            5: "Вулканы",
            4: "Ледяные пустоши",
            3: "Небесные острова",
            2: "Храмы древних",
            1: "Тронный зал"
        };

        for (let level = 10; level >= 1; level--) {
            this.locations.push({
                level: level,
                name: locationNames[level],
                description: `Локация уровня ${level}`,
                image: "images/locations/level10.jpg",
                monsterRange: [((10 - level) * 10 + 1), ((10 - level) * 10 + 10)],
                artifactChance: 0.005 + (0.001 * (10 - level)),
                relicChance: 0.0005 + (0.0001 * (10 - level))
            });
        }
    }

    // НОВАЯ СИСТЕМА БОНУСОВ
    getBonuses() {
        return {
            races: {
                elf: { type: "damage_mult", value: 0.2, name: "Эльф", description: "Урон +20%" },
                halfling: { type: "crit_chance", value: 0.2, name: "Полурослик", description: "20% шанс двойного урона" },
                human: { type: "gold_mult", value: 0.3, name: "Человек", description: "+30% золота за противника" },
                laitar: { type: "vampirism", value: 0.05, name: "Лайтар", description: "5% урона восстанавливает здоровье" },
                ork: { type: "health_regen_mult", value: 0.3, name: "Орк", description: "+30% к регенерации здоровья" },
                dwarf: { type: "health_mult", value: 0.3, name: "Гном", description: "+30% к здоровью" },
                dragon: { type: "armor_mult", value: 0.15, name: "Дракон", description: "+15% к броне" },
                fairy: { type: "armor_penetration", value: 0.25, name: "Фея", description: "25% шанс игнорировать броню" }
            },
            classes: {
                hunter: { type: "armor_penetration", value: 0.25, name: "Охотник", description: "25% шанс игнорировать броню" },
                warrior: { type: "armor_mult", value: 0.15, name: "Воин", description: "+15% к броне" },
                bounty_hunter: { type: "crit_chance", value: 0.2, name: "Охотник за головами", description: "20% шанс двойного урона" },
                merchant: { type: "gold_mult", value: 0.3, name: "Торговец", description: "+30% золота за противника" },
                thief: { type: "gold_mult", value: 0.3, name: "Вор", description: "+30% золота за противника" },
                fighter: { type: "health_regen_mult", value: 0.3, name: "Кулачный боец", description: "+30% к регенерации" },
                antiquarian: { type: "gold_mult", value: 0.3, name: "Искатель древностей", description: "+30% золота за противника" },
                death_mage: { type: "vampirism", value: 0.05, name: "Волхв смерти", description: "5% урона восстанавливает здоровье" },
                sorcerer: { type: "damage_mult", value: 0.2, name: "Колдун", description: "Урон +20%" },
                archer: { type: "crit_chance", value: 0.2, name: "Лучник", description: "20% шанс двойного урона" },
                healer: { type: "health_mult", value: 0.3, name: "Знахарь", description: "+30% к здоровью" },
                gladiator: { type: "damage_mult", value: 0.2, name: "Гладиатор", description: "Урон +20%" },
                blacksmith: { type: "armor_mult", value: 0.15, name: "Кузнец", description: "+15% к броне" }
            },
            sagas: {
                golden_egg: { type: "health_mult", value: 0.3, name: "Золотое Яйцо", description: "+30% к здоровью" },
                vulkanor: { type: "armor_penetration", value: 0.25, name: "Вулканор", description: "25% шанс игнорировать броню" },
                well: { type: "gold_mult", value: 0.3, name: "Колодец", description: "+30% золота за противника" },
                pets: { type: "damage_mult", value: 0.2, name: "Питомец", description: "Урон +20%" },
                following_sun: { type: "health_regen_mult", value: 0.3, name: "Вслед за солнцем", description: "+30% к регенерации" },
                vampire_crown: { type: "vampirism", value: 0.05, name: "Корона короля вампиров", description: "5% урона восстанавливает здоровье" },
                tiger_eye: { type: "crit_chance", value: 0.2, name: "Желтый Глаз тигра", description: "20% шанс двойного урона" },
                sky_phenomena: { type: "armor_mult", value: 0.15, name: "Небесные явления", description: "+15% к броне" }
            }
        };
    }

    // Сбор всех активных бонусов с источниками
    getBonusesWithSources(hero) {
        hero = hero || this.currentHero;
        if (!hero) return [];
        
        const bonuses = this.getBonuses();
        const bonusesWithSources = [];
        
        // Бонусы расы
        if (bonuses.races[hero.race]) {
            bonusesWithSources.push({
                ...bonuses.races[hero.race],
                source: 'race',
                sourceName: bonuses.races[hero.race].name
            });
        }
        
        // Бонусы класса
        if (bonuses.classes[hero.class]) {
            bonusesWithSources.push({
                ...bonuses.classes[hero.class],
                source: 'class',
                sourceName: bonuses.classes[hero.class].name
            });
        }
        
        // Бонусы саги
        if (bonuses.sagas[hero.saga]) {
            bonusesWithSources.push({
                ...bonuses.sagas[hero.saga],
                source: 'saga',
                sourceName: bonuses.sagas[hero.saga].name
            });
        }
        
        // Бонусы от оружия
        if (hero.equipment.main_hand) {
            const weapon = this.items.find(item => item.id === hero.equipment.main_hand);
            if (weapon && weapon.bonus) {
                bonusesWithSources.push({
                    ...weapon.bonus,
                    source: 'weapon',
                    sourceName: weapon.name
                });
            }
        }
        
        // Бонусы от брони
        if (hero.equipment.chest) {
            const armor = this.items.find(item => item.id === hero.equipment.chest);
            if (armor && armor.bonus) {
                bonusesWithSources.push({
                    ...armor.bonus,
                    source: 'armor',
                    sourceName: armor.name
                });
            }
        }
        
        return bonusesWithSources;
    }

    // Расчет суммарных бонусов по типам
    calculateTotalBonuses(hero) {
        const activeBonuses = this.getBonusesWithSources(hero);
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
        
        activeBonuses.forEach(bonus => {
            if (totals.hasOwnProperty(bonus.type)) {
                totals[bonus.type] += bonus.value;
            }
        });
        
        return totals;
    }

    // Система уровней
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

    addExperience(amount) {
        if (!this.currentHero) return;
        
        const oldLevel = this.currentHero.level;
        this.currentHero.experience += amount;
        
        const levelRequirements = this.getLevelRequirements();
        let newLevel = oldLevel;
        
        while (this.currentHero.experience >= levelRequirements[newLevel + 1] && levelRequirements[newLevel + 1]) {
            newLevel++;
        }
        
        if (newLevel > oldLevel) {
            this.levelUp(newLevel);
        }
        
        this.saveGame();
    }

    levelUp(newLevel) {
        const levelsGained = newLevel - this.currentHero.level;
        this.currentHero.level = newLevel;
        
        const healthIncrease = 10 * levelsGained;
        const damageIncrease = 2 * levelsGained;
        const armorIncrease = 1 * levelsGained;
        
        this.currentHero.baseHealth += healthIncrease;
        this.currentHero.baseDamage += damageIncrease;
        this.currentHero.baseArmor += armorIncrease;
        
        // Восстанавливаем здоровье до нового максимума
        this.currentHero.currentHealth = this.calculateMaxHealth();
        
        this.addToLog('🎉 Уровень повышен! Теперь уровень ' + newLevel);
        this.addToLog('❤️ +' + healthIncrease + ' здоровья');
        this.addToLog('⚔️ +' + damageIncrease + ' урона');
        this.addToLog('🛡️ +' + armorIncrease + ' брони');
        
        this.checkHeroUnlocks();
    }

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

    // НОВЫЙ РАСЧЕТ ХАРАКТЕРИСТИК С УЧЕТОМ АДДИТИВНЫХ БОНУСОВ
    calculateMaxHealth(hero) {
        hero = hero || this.currentHero;
        if (!hero) return 0;
        
        const totals = this.calculateTotalBonuses(hero);
        
        // База с учетом уровня
        const levelMultiplier = 1 + (hero.level - 1) * 0.1;
        let health = hero.baseHealth * levelMultiplier;
        
        // Аддитивные бонусы от базы
        health += hero.baseHealth * totals.health_mult;
        
        return Math.round(health);
    }

    calculateHeroStats(hero) {
        hero = hero || this.currentHero;
        if (!hero) return {};
        
        const totals = this.calculateTotalBonuses(hero);
        
        // База с учетом уровня
        const levelMultiplier = 1 + (hero.level - 1) * 0.1;
        let baseHealth = hero.baseHealth * levelMultiplier;
        let baseDamage = hero.baseDamage * levelMultiplier;
        let baseArmor = hero.baseArmor * levelMultiplier;
        
        // Аддитивные бонусы от базы
        let health = baseHealth + (hero.baseHealth * totals.health_mult);
        let damage = baseDamage + (hero.baseDamage * totals.damage_mult);
        let armor = baseArmor + (hero.baseArmor * totals.armor_mult);
        
        // Экипировка
        if (hero.equipment.main_hand) {
            const weapon = this.items.find(item => item.id === hero.equipment.main_hand);
            damage += (weapon && weapon.fixed_damage) ? weapon.fixed_damage : 0;
        }
        
        if (hero.equipment.chest) {
            const armorItem = this.items.find(item => item.id === hero.equipment.chest);
            armor += (armorItem && armorItem.fixed_armor) ? armorItem.fixed_armor : 0;
        }
        
        const power = Math.round((health / 10) + (damage * 1.5) + (armor * 2));
        
        // Текущее здоровье с учетом регенерации
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

    // НОВАЯ МЕХАНИКА КРИТИЧЕСКОГО УДАРА
    calculateAttackDamage(isHeroAttack = true) {
        const stats = this.calculateHeroStats();
        const totals = this.calculateTotalBonuses();
        
        let baseDamage = stats.damage;
        let isCritical = false;
        let isArmorPenetrated = false;
        let finalDamage = baseDamage;
        
        // Проверка крита
        if (isHeroAttack && Math.random() < totals.crit_chance) {
            isCritical = true;
            finalDamage *= 2; // Двойной урон при крите
            this.addBattleLog({
                message: '💥 КРИТИЧЕСКИЙ УДАР! Двойной урон!',
                type: 'critical'
            });
        }
        
        // Проверка пенетрации
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

    // ОБНОВЛЕННАЯ МЕХАНИКА БОЯ С НОВЫМИ БОНУСАМИ
    battleAttack() {
        if (!this.battleActive) return;
        
        this.battleRound++;
        const stats = this.calculateHeroStats(this.currentHero);
        const totals = this.calculateTotalBonuses();
        
        // Ход героя
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
        
        if (this.currentMonster.currentHealth <= 0) {
            this.endBattle(true);
            return;
        }
        
        // Ход монстра
        const monsterDamage = Math.max(1, this.currentMonster.damage - stats.armor);
        this.updateHealth(-monsterDamage);
        
        this.addBattleLog({
            message: '👹 ' + this.currentMonster.name + ' наносит ' + monsterDamage + ' урона!',
            type: 'monster-attack'
        });
        
        if (this.currentHero.currentHealth <= 0) {
            this.endBattle(false);
            return;
        }
        
        this.saveGame();
        this.renderHeroScreen();
    }

    // ОБНОВЛЕННОЕ ЗАВЕРШЕНИЕ БОЯ С УЧЕТОМ БОНУСОВ
    endBattle(victory) {
        if (victory) {
            const totals = this.calculateTotalBonuses();
            const baseReward = this.currentMonster.reward;
            const goldMultiplier = 1 + totals.gold_mult;
            const reward = Math.round(baseReward * goldMultiplier);
            
            this.currentHero.gold += reward;
            this.lastReward = reward;
            
            const baseExperience = Math.max(10, Math.floor(this.currentMonster.power / 2));
            const experienceGained = baseExperience;
            
            this.addExperience(experienceGained);
            
            // Обновляем прогресс локации
            if (this.currentLocation) {
                this.updateLocationProgress();
            }
            
            this.addBattleLog({
                message: `🎉 ПОБЕДА! Получено ${reward} золота (база: ${baseReward} + бонусы) и ${experienceGained} опыта`,
                type: 'victory'
            });
            
            this.addToLog(`🎯 Побежден ${this.currentMonster.name}! Получено ${reward} золота и ${experienceGained} опыта`);
            
            this.checkSpecialDrops();
            
            this.battleResult = {
                victory: true,
                reward: reward,
                experience: experienceGained,
                monsterName: this.currentMonster.name
            };
            
        } else {
            // ГЕРОЙ УМЕР - здоровье сбрасывается в 0 и начинает восстанавливаться с нуля
            this.currentHero.currentHealth = 0;
            this.lastHealthUpdate = Date.now(); // Сбрасываем таймер регенерации
            
            this.addBattleLog({
                message: '💀 ПОРАЖЕНИЕ! Герой повержен. Здоровье сброшено и начинает восстанавливаться с 0.',
                type: 'defeat'
            });
            
            this.addToLog('💥 Проигран бой с ' + this.currentMonster.name + '. Здоровье восстанавливается с 0.');
            
            this.battleResult = {
                victory: false,
                monsterName: this.currentMonster.name
            };
        }
        
        this.battleActive = false;
        this.currentMonster = null;
        this.renderHeroScreen();
    }

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
        
        // Регенерация здоровья (работает даже если здоровье = 0)
        if (currentHealth < maxHealth) {
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
        
        return currentHealth;
    }

    updateHealth(change) {
        if (!this.currentHero) return;
        
        if (!this.currentHero.currentHealth) {
            this.currentHero.currentHealth = this.calculateMaxHealth();
        }
        
        this.currentHero.currentHealth += change;
        const maxHealth = this.calculateMaxHealth();
        
        // Ограничиваем здоровье в пределах 0 - максимум
        this.currentHero.currentHealth = Math.max(0, Math.min(maxHealth, this.currentHero.currentHealth));
        
        // Обновляем время регенерации только если здоровье изменилось
        if (change !== 0) {
            this.lastHealthUpdate = Date.now();
        }
        
        this.saveGame();
    }

    // НОВАЯ СИСТЕМА ЛОКАЦИЙ - ВСТРЕЧА МОНСТРОВ
    encounterMonster() {
        if (!this.currentLocation || !this.currentMap) {
            console.error('❌ Не выбрана локация или карта');
            return;
        }

        const locationLevel = this.currentLocation.level;
        
        // Определяем диапазон монстров для локации
        // Локация 10: монстры 1-10, локация 9: монстры 11-20, и т.д.
        const startMonsterId = (10 - locationLevel) * 10 + 1;
        const endMonsterId = startMonsterId + 9;
        
        const monsterId = Math.floor(Math.random() * 10) + startMonsterId;
        
        let monster = this.monsters.find(m => m.id === monsterId);
        if (!monster) {
            // Если монстр не найден, берем первого из диапазона
            monster = this.monsters.find(m => m.id >= startMonsterId && m.id <= endMonsterId);
            if (!monster) {
                console.error('❌ Нет доступных монстров в диапазоне:', startMonsterId, '-', endMonsterId);
                return;
            }
        }

        this.currentMonster = {
            id: monster.id,
            name: monster.name,
            image: monster.image,
            description: monster.description,
            health: Math.round(monster.health * this.currentMap.multiplier),
            damage: Math.round(monster.damage * this.currentMap.multiplier),
            armor: Math.round(monster.armor * this.currentMap.multiplier),
            reward: Math.round(monster.reward * this.currentMap.multiplier),
            power: Math.round(((monster.health / 10) + (monster.damage * 1.5) + (monster.armor * 2)) * this.currentMap.multiplier)
        };

        this.addToLog('🎭 Встречен: ' + this.currentMonster.name);
        this.renderHeroScreen();
    }

    // ОБНОВЛЕНИЕ ПРОГРЕССА ЛОКАЦИИ
    updateLocationProgress() {
        if (!this.currentLocation || !this.currentMonster) return;
        
        const locationLevel = this.currentLocation.level;
        const progress = this.locationProgress[locationLevel];
        
        if (progress) {
            const monsterIndex = this.currentMonster.id - ((10 - locationLevel) * 10 + 1);
            
            if (monsterIndex >= 0 && monsterIndex < 10) {
                // Увеличиваем счетчик убийств для этого монстра
                progress.monstersKilled[monsterIndex]++;
                
                // Проверяем завершение локации (все монстры убиты хотя бы по разу)
                const allMonstersKilled = progress.monstersKilled.every(kills => kills > 0);
                
                if (allMonstersKilled) {
                    this.completeLocation(locationLevel);
                }
                
                this.saveGame();
            }
        }
    }

    // ЗАВЕРШЕНИЕ ЛОКАЦИИ
    completeLocation(locationLevel) {
        const nextLocationLevel = locationLevel - 1;
        const nextProgress = this.locationProgress[nextLocationLevel];
        
        if (nextProgress) {
            nextProgress.unlocked = true;
            this.addToLog('🎉 Локация "' + this.getLocationName(locationLevel) + '" завершена!');
            this.addToLog('🔓 Открыта новая локация: "' + this.getLocationName(nextLocationLevel) + '"');
        }
        
        this.saveGame();
    }

    getLocationName(level) {
        const location = this.locations.find(l => l.level === level);
        return location ? location.name : 'Локация ' + level;
    }

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

    renderHeroSelect() {
        const container = document.getElementById('app');
        const heroesHTML = this.heroes.map(hero => {
            const isUnlocked = hero.id === 1 ? true : (hero.unlocked || false);
            const stats = this.calculateHeroStats(hero);
            const bonuses = this.getBonuses();
            
            const activeBonuses = this.getBonusesWithSources(hero);
            const bonusDisplay = activeBonuses.map(bonus => {
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
                                <span>💰 ${hero.gold}</span>
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

    // Показать экран
    showScreen(screenName) {
        this.currentScreen = screenName;
        if (this.healthInterval) {
            clearInterval(this.healthInterval);
            this.healthInterval = null;
        }
    }

    // Новая функция для анимации здоровья
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

        // Обновляем отображение здоровья каждую секунду
        this.healthInterval = setInterval(updateHealthDisplay, 1000);
    }

    // Рендер основного экрана героя с новой системой бонусов
    renderHeroScreen() {
        if (!this.currentHero) return;

        const stats = this.calculateHeroStats(this.currentHero);
        const bonuses = this.getBonuses();
        const activeBonuses = this.getBonusesWithSources();

        // Группируем бонусы по источникам
        const bonusesBySource = {
            race: activeBonuses.filter(b => b.source === 'race'),
            class: activeBonuses.filter(b => b.source === 'class'),
            saga: activeBonuses.filter(b => b.source === 'saga'),
            weapon: activeBonuses.filter(b => b.source === 'weapon'),
            armor: activeBonuses.filter(b => b.source === 'armor')
        };

        const weapon = this.currentHero.equipment.main_hand ? 
            this.items.find(item => item.id === this.currentHero.equipment.main_hand) : null;
        const armor = this.currentHero.equipment.chest ? 
            this.items.find(item => item.id === this.currentHero.equipment.chest) : null;

        const nextLevelExp = this.getLevelRequirements()[this.currentHero.level + 1];
        const expProgress = nextLevelExp ? (this.currentHero.experience / nextLevelExp) * 100 : 100;
        const healthPercent = (stats.currentHealth / stats.maxHealth) * 100;

        // Получаем URL картинок и видео
        const heroBackground = this.currentHero.image;
        const heroVideo = this.heroVideos[this.currentHero.id] || this.videos.hero;
        
        const monsterBackground = this.currentMonster ? this.currentMonster.image : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWExYTJlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7QktGA0L7QtNC90YvQtSDQv9C10YDRjNC80LA8L3RleHQ+PC9zdmc+';
        const mapBackground = this.currentMap ? this.currentMap.image : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTYyMTNlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7QmtCw0YDRgtCwPC90ZXh0Pjwvc3ZnPg==';
        const locationBackground = this.currentLocation ? this.currentLocation.image : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWExYTJlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7Qm9C+0LrRg9C/0YPRjiDQv9C+0LrQsNC30YvQstCw0YLRjDwvdGV4dD48L3N2Zz4=';

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

                <!-- 4 КОЛОНКИ С КАРТИНКАМИ НА ВЕСЬ ЭКРАН -->
                <div class="hero-layout">
                    <!-- Колонка 1: Герой -->
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
                                
                                <div class="equipment-section">
                                    <div class="equipment-slot ${weapon ? 'equipped' : 'empty'}" onclick="game.showInventory()">
                                        <div class="equipment-icon">
                                            ${weapon ? '<img src="' + weapon.image + '" alt="' + weapon.name + '" onerror="this.style.display=\'none\'">' : '⚔️'}
                                        </div>
                                        <div>
                                            <div><strong>Оружие</strong></div>
                                            <div>${weapon ? weapon.name : 'Пусто'}</div>
                                        </div>
                                    </div>
                                    
                                    <div class="equipment-slot ${armor ? 'equipped' : 'empty'}" onclick="game.showInventory()">
                                        <div class="equipment-icon">
                                            ${armor ? '<img src="' + armor.image + '" alt="' + armor.name + '" onerror="this.style.display=\'none\'">' : '🛡️'}
                                        </div>
                                        <div>
                                            <div><strong>Броня</strong></div>
                                            <div>${armor ? armor.name : 'Пусто'}</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="level-progress">
                                    <div class="level-progress-fill" style="width: ${expProgress}%"></div>
                                </div>
                                <div class="hero-progress">
                                    <span>Ур.${this.currentHero.level}</span>
                                    <span>💰${this.currentHero.gold}</span>
                                    <span>⚡${this.currentHero.experience}/${nextLevelExp || 'MAX'}</span>
                                </div>
                            </div>

                            <div class="bonuses-section">
                                <h3>🎯 Активные бонусы</h3>
                                
                                <!-- Бонусы расы -->
                                ${bonusesBySource.race.length > 0 ? `
                                    <div class="bonus-source-group">
                                        <div class="bonus-source-title">🧬 Раса (${raceName})</div>
                                        <div class="bonus-display">
                                            ${bonusesBySource.race.map(bonus => `
                                                <div class="bonus-badge race-bonus" title="${bonus.description}">
                                                    ${this.getBonusIcon(bonus.type)} ${Math.round(bonus.value * 100)}%
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- Бонусы класса -->
                                ${bonusesBySource.class.length > 0 ? `
                                    <div class="bonus-source-group">
                                        <div class="bonus-source-title">⚔️ Класс (${className})</div>
                                        <div class="bonus-display">
                                            ${bonusesBySource.class.map(bonus => `
                                                <div class="bonus-badge class-bonus" title="${bonus.description}">
                                                    ${this.getBonusIcon(bonus.type)} ${Math.round(bonus.value * 100)}%
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- Бонусы саги -->
                                ${bonusesBySource.saga.length > 0 ? `
                                    <div class="bonus-source-group">
                                        <div class="bonus-source-title">📖 Сага (${sagaName})</div>
                                        <div class="bonus-display">
                                            ${bonusesBySource.saga.map(bonus => `
                                                <div class="bonus-badge saga-bonus" title="${bonus.description}">
                                                    ${this.getBonusIcon(bonus.type)} ${Math.round(bonus.value * 100)}%
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- Бонусы оружия -->
                                ${bonusesBySource.weapon.length > 0 ? `
                                    <div class="bonus-source-group">
                                        <div class="bonus-source-title">🗡️ Оружие (${weapon?.name || 'Неизвестно'})</div>
                                        <div class="bonus-display">
                                            ${bonusesBySource.weapon.map(bonus => `
                                                <div class="bonus-badge weapon-bonus" title="${bonus.description}">
                                                    ${this.getBonusIcon(bonus.type)} ${Math.round(bonus.value * 100)}%
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                                
                                <!-- Бонусы брони -->
                                ${bonusesBySource.armor.length > 0 ? `
                                    <div class="bonus-source-group">
                                        <div class="bonus-source-title">🛡️ Броня (${armor?.name || 'Неизвестно'})</div>
                                        <div class="bonus-display">
                                            ${bonusesBySource.armor.map(bonus => `
                                                <div class="bonus-badge armor-bonus" title="${bonus.description}">
                                                    ${this.getBonusIcon(bonus.type)} ${Math.round(bonus.value * 100)}%
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Колонка 2: Монстр -->
                    <div class="monster-column" style="background-image: url('${monsterBackground}')">
                        <div class="column-overlay"></div>
                        <div class="column-content">
                            <div class="column-title">🎭 Враг</div>
                            ${this.renderMonsterColumn()}
                        </div>
                    </div>

                    <!-- Колонка 3: Карта -->
                    <div class="map-column" style="background-image: url('${mapBackground}')">
                        <div class="column-overlay"></div>
                        <div class="column-content">
                            <div class="column-title">🗺️ Карта</div>
                            ${this.renderMapSelection()}
                        </div>
                    </div>

                    <!-- Колонка 4: Локация -->
                    <div class="location-column" style="background-image: url('${locationBackground}')">
                        <div class="column-overlay"></div>
                        <div class="column-content">
                            <div class="column-title">📍 Локация</div>
                            ${this.renderLocationSelection()}
                        </div>
                    </div>
                </div>

                <!-- Журнал событий -->
                <div class="battle-log" id="battle-log"></div>
            </div>
        `;

        this.startHealthAnimation();
    }

    renderMonsterColumn() {
        if (this.battleResult) {
            return this.renderBattleResult();
        }
        
        if (this.currentMonster) {
            const stats = this.calculateHeroStats(this.currentHero);
            const powerComparison = stats.power >= this.currentMonster.power ? '✅ ПРЕИМУЩЕСТВО' : '⚠️ РИСК';

            return `
                <div class="monster-info">
                    <h4>${this.currentMonster.name}</h4>
                    <p>${this.currentMonster.description}</p>
                    
                    <div class="monster-stats-grid">
                        <div class="monster-stat-card">
                            <div>❤️ Здоровье</div>
                            <div class="monster-stat-value">${this.currentMonster.health}</div>
                        </div>
                        <div class="monster-stat-card">
                            <div>⚔️ Урон</div>
                            <div class="monster-stat-value">${this.currentMonster.damage}</div>
                        </div>
                        <div class="monster-stat-card">
                            <div>🛡️ Броня</div>
                            <div class="monster-stat-value">${this.currentMonster.armor}</div>
                        </div>
                        <div class="monster-stat-card">
                            <div>🌟 Мощь</div>
                            <div class="monster-stat-value">${this.currentMonster.power}</div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin: 12px 0; font-size: 1em;">
                        <p><strong>Сравнение:</strong> ${powerComparison}</p>
                        <p>💰 Награда: ${this.currentMonster.reward} золота</p>
                    </div>

                    <!-- КНОПКИ ДЕЙСТВИЙ -->
                    <div class="monster-actions">
                        <button class="btn-primary" onclick="game.startBattle()">⚔️ Сражаться</button>
                        <button class="btn-secondary" onclick="game.attemptStealth()">👻 Скрыться</button>
                        <button class="btn-secondary" onclick="game.attemptEscape()">🏃 Убежать</button>
                    </div>
                </div>
                ${this.battleActive ? this.renderBattleInMonsterColumn() : ''}
            `;
        } else {
            return `
                <div class="monster-info" style="text-align: center; padding: 20px;">
                    <h4>Врага нет</h4>
                    <p>Начните путешествие, чтобы встретить противника</p>
                    <div style="margin-top: 20px;">
                        <button class="btn-primary" onclick="game.startAdventure()">🎲 Начать путешествие</button>
                    </div>
                </div>
            `;
        }
    }

    renderBattleResult() {
        if (!this.battleResult) return '';
        
        const victory = this.battleResult.victory;
        const reward = this.battleResult.reward;
        const experience = this.battleResult.experience;
        
        if (victory) {
            return `
                <div class="battle-result">
                    <div class="battle-result-image">🎉</div>
                    <h4>ПОБЕДА!</h4>
                    <p>Вы победили ${this.battleResult.monsterName}!</p>
                    <div class="reward-amount">
                        +${reward} золота<br>
                        +${experience} опыта
                    </div>
                    <button class="btn-primary" onclick="game.continueAfterBattle()">Продолжить</button>
                </div>
            `;
        } else {
            return `
                <div class="battle-result">
                    <div class="battle-result-image">💀</div>
                    <h4>ПОРАЖЕНИЕ</h4>
                    <p>Вы проиграли бой с ${this.battleResult.monsterName}</p>
                    <button class="btn-primary" onclick="game.continueAfterBattle()">Продолжить</button>
                </div>
            `;
        }
    }

    renderBattleInMonsterColumn() {
        if (!this.battleActive) return '';
        
        const stats = this.calculateHeroStats(this.currentHero);
        const heroHealthPercent = (this.currentHero.currentHealth / stats.maxHealth) * 100;
        const monsterHealthPercent = (this.currentMonster.currentHealth / this.currentMonster.health) * 100;
        
        return `
            <div class="battle-in-monster-column">
                <div class="battle-header">
                    <h4>⚔️ БОЙ</h4>
                    <div class="battle-round">Раунд: ${this.battleRound}</div>
                </div>
                
                <div class="battle-combatants-compact">
                    <!-- Герой -->
                    <div class="combatant-compact" style="border: 2px solid #4cc9f0;">
                        <div class="combatant-image-compact" style="border-color: #4cc9f0;">
                            <img src="${this.currentHero.image}" alt="${this.currentHero.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                        </div>
                        <div class="combatant-info-compact">
                            <div class="health-bar-compact">
                                <div class="health-bar-fill-compact" style="width: ${heroHealthPercent}%; background: linear-gradient(90deg, #4ade80, #22c55e);"></div>
                            </div>
                            <div class="health-text-compact">${Math.ceil(this.currentHero.currentHealth)}/${stats.maxHealth}</div>
                        </div>
                    </div>
                    
                    <div class="vs-compact">VS</div>
                    
                    <!-- Монстр -->
                    <div class="combatant-compact" style="border: 2px solid #f87171;">
                        <div class="combatant-image-compact" style="border-color: #f87171;">
                            <img src="${this.currentMonster.image}" alt="${this.currentMonster.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTIiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                        </div>
                        <div class="combatant-info-compact">
                            <div class="health-bar-compact">
                                <div class="health-bar-fill-compact" style="width: ${monsterHealthPercent}%; background: linear-gradient(90deg, #f87171, #ef4444);"></div>
                            </div>
                            <div class="health-text-compact">${Math.ceil(this.currentMonster.currentHealth)}/${this.currentMonster.health}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Лог боя -->
                <div class="battle-log-compact">
                    ${this.battleLog.slice(-3).map(entry => {
                        return '<div class="battle-log-entry-compact ' + (entry.type || '') + '">' + entry.message + '</div>';
                    }).join('')}
                </div>
                
                <!-- Кнопки действий в бою -->
                <div class="battle-actions-compact">
                    <button class="btn-battle-attack-compact" onclick="game.battleAttack()">
                        ⚔️ Атака
                    </button>
                    <button class="btn-battle-escape-compact" onclick="game.attemptEscapeFromBattle()">
                        🏃 Бегство
                    </button>
                </div>
            </div>
        `;
    }

    renderMapSelection() {
        if (this.currentMap) {
            return `
                <div class="map-info">
                    ${this.showVideo.map ? `
                        <button class="video-toggle" onclick="game.toggleVideo('map')">🖼️ Показать картинку</button>
                    ` : `
                        <button class="video-toggle" onclick="game.toggleVideo('map')">🎬 Включить видео</button>
                    `}
                    <h4>${this.currentMap.name}</h4>
                    <p>${this.currentMap.description}</p>
                    <div style="background: rgba(0,0,0,0.6); padding: 10px; border-radius: 8px; margin: 10px 0; border: 2px solid rgba(74, 222, 128, 0.5);">
                        <strong>Множитель силы: x${this.currentMap.multiplier}</strong>
                    </div>
                    <button class="btn-secondary" onclick="game.showMapSelection()">Сменить карту</button>
                </div>
            `;
        } else {
            return `
                <div class="map-info" style="text-align: center; padding: 20px;">
                    <h4>Карта не выбрана</h4>
                    <p>Выберите карту для путешествия</p>
                    <div style="margin-top: 20px;">
                        <button class="btn-primary" onclick="game.showMapSelection()">🗺️ Выбрать карту</button>
                    </div>
                </div>
            `;
        }
    }

    renderLocationSelection() {
        if (this.currentLocation) {
            const progress = this.locationProgress[this.currentLocation.level];
            const killedCount = progress ? progress.monstersKilled.filter(kills => kills > 0).length : 0;
            
            return `
                <div class="location-info">
                    ${this.showVideo.location ? `
                        <button class="video-toggle" onclick="game.toggleVideo('location')">🖼️ Показать картинку</button>
                    ` : `
                        <button class="video-toggle" onclick="game.toggleVideo('location')">🎬 Включить видео</button>
                    `}
                    <h4>${this.currentLocation.name} (Ур. ${this.currentLocation.level})</h4>
                    <p>${this.currentLocation.description}</p>
                    <div style="background: rgba(0,0,0,0.6); padding: 10px; border-radius: 8px; margin: 10px 0; border: 2px solid rgba(245, 158, 11, 0.5);">
                        <div><strong>Монстры:</strong> Убивайте всех монстров локации</div>
                        <div><strong>Прогресс:</strong> ${killedCount}/10 монстров убито</div>
                        <div><strong>Артефакты:</strong> ${(this.currentLocation.artifactChance * 100).toFixed(2)}%</div>
                        <div><strong>Реликвии:</strong> ${(this.currentLocation.relicChance * 100).toFixed(2)}%</div>
                    </div>
                    <button class="btn-secondary" onclick="game.showLocationSelection()">Сменить локацию</button>
                </div>
            `;
        } else {
            return `
                <div class="location-info" style="text-align: center; padding: 20px;">
                    <h4>Локация не выбрана</h4>
                    <p>Выберите локацию для исследования</p>
                    <div style="margin-top: 20px;">
                        <button class="btn-primary" onclick="game.showLocationSelection()">📍 Выбрать локацию</button>
                    </div>
                </div>
            `;
        }
    }

    toggleVideo(type) {
        this.showVideo[type] = !this.showVideo[type];
        this.renderHeroScreen();
    }

    showLocationSelection() {
        if (!this.currentMap) {
            this.addToLog('❌ Сначала выберите карту');
            return;
        }

        const locationsHTML = this.locations.map(location => {
            const progress = this.locationProgress[location.level];
            const isUnlocked = progress ? progress.unlocked : false;
            const killedCount = progress ? progress.monstersKilled.filter(kills => kills > 0).length : 0;

            return `
                <div class="location-option ${isUnlocked ? '' : 'locked'}" 
                     onclick="${isUnlocked ? 'game.selectLocation(' + location.level + ')' : ''}">
                    <div class="location-option-image">
                                             <img src="${location.image}" alt="${location.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                        ${!isUnlocked ? '<div class="locked-overlay">🔒</div>' : ''}
                    </div>
                    <div class="location-option-info">
                        <strong>${location.name} (Ур. ${location.level})</strong>
                        <div>${location.description}</div>
                        <small>Монстры: №${((10 - location.level) * 10 + 1)}-${((10 - location.level) * 10 + 10)}</small>
                        ${isUnlocked ? `
                            <div class="location-progress">
                                <div class="location-progress-fill" style="width: ${(killedCount / 10) * 100}%"></div>
                            </div>
                            <small>Прогресс: ${killedCount}/10 монстров</small>
                        ` : ''}
                        ${!isUnlocked ? '<small class="locked-text">Завершите предыдущую локацию</small>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        const container = document.getElementById('app');
        container.innerHTML += `
            <div class="screen active" id="screen-location-select">
                <h3 class="text-center">📍 Выберите локацию</h3>
                <div class="locations-grid">
                    ${locationsHTML}
                </div>
                <div class="action-buttons">
                    <button class="btn-secondary" onclick="game.renderHeroScreen()">← Назад к герою</button>
                </div>
            </div>
        `;

        this.showScreen('location-select');
    }

    selectLocation(level) {
        this.currentLocation = this.locations.find(l => l.level === level);
        this.addToLog('📍 Выбрана локация: ' + this.currentLocation.name + ' (Ур. ' + level + ')');
        this.renderHeroScreen();
    }

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

    startBattle() {
        if (!this.currentMonster || this.battleActive) return;
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        this.battleResult = null;
        
        if (!this.currentHero.currentHealth) {
            this.currentHero.currentHealth = this.calculateMaxHealth();
        }
        
        this.currentMonster.currentHealth = this.currentMonster.health;
        
        this.addToLog('⚔️ Начало боя с ' + this.currentMonster.name + '!');
        this.renderHeroScreen();
    }

    addBattleLog(entry) {
        this.battleLog.push(entry);
        if (this.battleLog.length > 10) {
            this.battleLog.shift();
        }
    }

    continueAfterBattle() {
        this.battleResult = null;
        this.renderHeroScreen();
    }

    checkSpecialDrops() {
        if (!this.currentLocation) return;
        
        if (Math.random() < this.currentLocation.artifactChance) {
            this.dropArtifact();
        }
        
        if (Math.random() < this.currentLocation.relicChance) {
            this.dropRelic();
        }
    }

    dropArtifact() {
        this.addToLog('✨ Найден редкий артефакт!');
    }

    dropRelic() {
        this.addToLog('🌟 Найдена легендарная реликвия!');
    }

    attemptEscapeFromBattle() {
        const stats = this.calculateHeroStats(this.currentHero);
        const escapeRoll = this.rollDice(stats.skills?.escape || 0, 10);
        
        if (escapeRoll.success) {
            this.addBattleLog({
                message: '🏃 Успешный побег из боя!',
                type: 'escape'
            });
            this.battleActive = false;
            this.completeEncounter();
        } else {
            this.addBattleLog({
                message: '❌ Не удалось сбежать! Монстр атакует',
                type: 'escape-failed'
            });
            const monsterDamage = Math.max(1, this.currentMonster.damage - stats.armor);
            this.updateHealth(-monsterDamage);
            
            if (this.currentHero.currentHealth <= 0) {
                this.endBattle(false);
            } else {
                this.saveGame();
                this.renderHeroScreen();
            }
        }
    }

    attemptStealth() {
        const stats = this.calculateHeroStats(this.currentHero);
        const stealthRoll = this.rollDice(stats.skills?.stealth || 0, 8);
        
        if (stealthRoll.success) {
            this.addToLog(`✅ Успешно скрылись от ${this.currentMonster.name}!`);
        } else {
            this.addToLog(`❌ Не удалось скрыться! Монстр вас заметил`);
        }
        
        this.completeEncounter();
    }

    attemptEscape() {
        const stats = this.calculateHeroStats(this.currentHero);
        const escapeRoll = this.rollDice(stats.skills?.escape || 0, 10);
        
        if (escapeRoll.success) {
            this.addToLog(`✅ Успешно сбежали от ${this.currentMonster.name}!`);
        } else {
            this.addToLog(`❌ Не удалось сбежать! Придётся сражаться`);
            this.startBattle();
            return;
        }
        
        this.completeEncounter();
    }

    rollDice(bonusDice, targetNumber) {
        let total = 0;
        let rolls = [];
        
        const baseRoll = Math.floor(Math.random() * 6) + 1;
        rolls.push(baseRoll);
        total += baseRoll;
        
        for (let i = 0; i < bonusDice; i++) {
            const bonusRoll = Math.floor(Math.random() * 6) + 1;
            rolls.push(bonusRoll);
            total += bonusRoll;
        }
        
        const success = total >= targetNumber;
        
        this.addToLog(`🎲 Бросок: [${rolls.join(', ')}] = ${total} (нужно ${targetNumber}+) - ${success ? 'УСПЕХ' : 'НЕУДАЧА'}`);
        
        return { success, total, rolls };
    }

    completeEncounter() {
        this.currentMonster = null;
        this.battleActive = false;
        this.battleResult = null;
        
        this.addToLog(`🏁 Встреча завершена`);
        this.saveGame();
        this.renderHeroScreen();
    }

    showMapSelection() {
        const mapsHTML = this.maps.map(map => `
            <div class="map-option ${map.unlocked ? '' : 'locked'}" 
                 onclick="${map.unlocked ? `game.selectMap(${map.id})` : ''}">
                <div class="map-option-image">
                    <img src="${map.image}" alt="${map.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                    ${!map.unlocked ? '<div class="locked-overlay">🔒</div>' : ''}
                </div>
                <div class="map-option-info">
                    <strong>${map.name}</strong>
                    <div>${map.description}</div>
                    <small>Множитель: x${map.multiplier}</small>
                    ${!map.unlocked ? '<small class="locked-text">Недоступно</small>' : ''}
                </div>
            </div>
        `).join('');

        const container = document.getElementById('app');
        container.innerHTML += `
            <div class="screen active" id="screen-map-select">
                <h3 class="text-center">🗺️ Выберите карту</h3>
                <div class="maps-grid">
                    ${mapsHTML}
                </div>
                <div class="action-buttons">
                    <button class="btn-secondary" onclick="game.renderHeroScreen()">← Назад к герою</button>
                </div>
            </div>
        `;

        this.showScreen('map-select');
    }

    selectMap(mapId) {
        this.currentMap = this.maps.find(m => m.id === mapId);
        this.addToLog(`🗺️ Выбрана карта: ${this.currentMap.name}`);
        this.renderHeroScreen();
    }

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
                        <span>💰 Купить: ${item.price}</span>
                        <span>💸 Продать: ${item.sellPrice || Math.floor(item.price * 0.5)}</span>
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
                        <span>💰 Ваше золото: ${this.currentHero?.gold || 0}</span>
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

        this.currentHero.gold -= item.price;
        this.currentHero.inventory.push(itemId);
        
        this.addToLog(`🛒 Куплено: ${item.name} за ${item.price} золота`);
        this.saveGame();
        this.showMerchant();
    }

    sellItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        if (!this.currentHero.inventory.includes(itemId)) {
            this.addToLog(`❌ Предмет ${item.name} не найден в инвентаре`);
            return;
        }

        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);
        this.currentHero.gold += (item.sellPrice || Math.floor(item.price * 0.5));
        
        if (this.currentHero.equipment.main_hand === itemId) {
            this.currentHero.equipment.main_hand = null;
        }
        if (this.currentHero.equipment.chest === itemId) {
            this.currentHero.equipment.chest = null;
        }

        this.addToLog(`💰 Продано: ${item.name} за ${item.sellPrice || Math.floor(item.price * 0.5)} золота`);
        this.saveGame();
        this.showMerchant();
    }

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
                    <strong>${item.name}</strong>
                    <div>${this.formatBonus(item.bonus)}</div>
                    <div>Урон: +${item.fixed_damage || 0} | Броня: +${item.fixed_armor || 0}</div>
                    ${isEquipped ? '<small>✓ Надето</small>' : '<small>📦 В инвентаре</small>'}
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

    equipItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        if (item.type === 'potion') {
            this.usePotion(item);
            return;
        }

        let slot = 'main_hand';
        if (item.type === 'armor') slot = 'chest';
        if (item.slot) slot = item.slot;

        const currentEquipped = this.currentHero.equipment[slot];
        if (currentEquipped) {
            if (!this.currentHero.inventory.includes(currentEquipped)) {
                this.currentHero.inventory.push(currentEquipped);
            }
        }

        this.currentHero.equipment[slot] = itemId;
        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);

        if (item.bonus && item.bonus.type === 'health_mult') {
            const oldMaxHealth = this.calculateMaxHealth({...this.currentHero, equipment: {...this.currentHero.equipment, [slot]: currentEquipped}});
            const newMaxHealth = this.calculateMaxHealth();
            const healthRatio = this.currentHero.currentHealth / oldMaxHealth;
            this.currentHero.currentHealth = Math.floor(newMaxHealth * healthRatio);
        }

        this.addToLog(`🎯 Надето: ${item.name}`);
        this.saveGame();
        this.renderHeroScreen();
    }

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
            gold: 500,
            level: 1,
            experience: 0,
            inventory: [],
            equipment: {
                main_hand: null,
                chest: null
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

    saveGame() {
        if (this.currentHero) {
            localStorage.setItem('heroGameSave', JSON.stringify({
                currentHeroId: this.currentHero.id,
                heroes: this.heroes,
                currentMap: this.currentMap,
                currentLocation: this.currentLocation,
                lastHealthUpdate: this.lastHealthUpdate,
                globalInventory: this.globalInventory,
                locationProgress: this.locationProgress,
                showVideo: this.showVideo
            }));
        }
    }

    loadSave() {
        try {
            const save = localStorage.getItem('heroGameSave');
            if (save) {
                const data = JSON.parse(save);
                
                const savedHeroProgress = data.heroes || [];
                const currentHeroId = data.currentHeroId;
                
                const progressMap = new Map();
                savedHeroProgress.forEach(hero => {
                    progressMap.set(hero.id, {
                        gold: hero.gold,
                        level: hero.level,
                        experience: hero.experience,
                        inventory: hero.inventory,
                        equipment: hero.equipment,
                        currentHealth: hero.currentHealth,
                        unlocked: hero.unlocked
                    });
                });
                
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
                
                this.currentMap = data.currentMap || null;
                this.currentLocation = data.currentLocation || null;
                this.lastHealthUpdate = data.lastHealthUpdate || Date.now();
                this.globalInventory = data.globalInventory || [];
                this.locationProgress = data.locationProgress || this.locationProgress;
                this.showVideo = data.showVideo || this.showVideo;
                
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
}

// ========== ЗАПУСК ИГРЫ ==========
console.log('🚀 Script.js загружен!');

let game;

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
