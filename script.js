// Добавьте в начало файла
console.log('🚀 Script.js загружен!');

// Создание экземпляра игры
let game;
document.addEventListener('DOMContentLoaded', () => {
    console.log('✅ DOM загружен');
    game = new HeroGame();
    console.log('✅ Игра инициализирована');
});


// Основной класс игры
class HeroGame {
    constructor() {
        this.heroes = [];
        this.items = [];
        this.monsters = [];
        this.maps = [];
        this.locations = [];
        this.movementStyles = [];
        this.merchants = [];
        
        this.showReward = false;
        this.lastReward = 0;
        this.currentHero = null;
        this.currentScreen = 'hero-select';
        this.currentMap = null;
        this.currentLocation = null;
        this.currentMonster = null;
        this.selectedMovement = null;
        
        // Новые свойства для боя
        this.battleActive = false;
        this.battleRound = 0;
        this.battleLog = [];
        this.lastHealthUpdate = Date.now();
        this.healthRegenRate = 100 / 60;
        
        // Общий инвентарь
        this.globalInventory = [];
        
        this.init();
    }

async init() {
    await this.loadGameData();
    this.loadSave();
    
    // ГАРАНТИРУЕМ ЧТО ПЕРВЫЙ ГЕРОЙ РАЗБЛОКИРОВАН
    if (this.heroes.length > 0) {
        const firstHero = this.heroes.find(h => h.id === 1);
        if (firstHero) {
            firstHero.unlocked = true;
        }
    }
    
    this.checkHeroUnlocks();
    this.renderHeroSelect();
}

    // Базовая функция загрузки JSON
    async loadJSON(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`❌ Ошибка загрузки ${filePath}:`, error);
            return null;
        }
    }

  async loadGameData() {
    try {
        const [heroes, enemies, items, mapsData, locationsData, movement] = await Promise.all([
            this.loadJSON('data/heroes.json'),
            this.loadJSON('data/enemies.json'),
            this.loadJSON('data/items.json'),
            this.loadJSON('data/maps.json'),
            this.loadJSON('data/locations.json'),
            this.loadJSON('data/movement.json')
        ]);

        this.heroes = heroes || this.getDefaultHeroes();
        this.monsters = enemies || this.getDefaultEnemies();
        this.items = items || this.getDefaultItems();
        this.maps = mapsData || this.getDefaultMaps();
        this.locations = locationsData || this.getDefaultLocations();
        this.movementStyles = movement || this.getDefaultMovement();

        // ПРИНУДИТЕЛЬНО РАЗБЛОКИРУЕМ ПЕРВОГО ГЕРОЯ
        if (this.heroes.length > 0) {
            const firstHero = this.heroes.find(h => h.id === 1);
            if (firstHero) {
                firstHero.unlocked = true;
            }
        }

        console.log('✅ Все данные загружены');

    } catch (error) {
        console.error('❌ Критическая ошибка загрузки данных:', error);
        this.heroes = this.getDefaultHeroes();
        this.monsters = this.getDefaultEnemies();
        this.items = this.getDefaultItems();
        this.maps = this.getDefaultMaps();
        this.locations = this.getDefaultLocations();
        this.movementStyles = this.getDefaultMovement();
    }
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
        
        this.currentHero.currentHealth = this.currentHero.baseHealth;
        
        this.addToLog(`🎉 Уровень повышен! Теперь уровень ${newLevel}`);
        this.addToLog(`❤️ +${healthIncrease} здоровья`);
        this.addToLog(`⚔️ +${damageIncrease} урона`);
        this.addToLog(`🛡️ +${armorIncrease} брони`);
        
        this.checkHeroUnlocks();
    }

    checkHeroUnlocks() {
        const heroUnlockLevels = {
            2: 10,
            3: 15,
            4: 20,
            5: 25,
            6: 30,
            7: 35,
            8: 40
        };
        
        Object.entries(heroUnlockLevels).forEach(([heroId, requiredLevel]) => {
            const hero = this.heroes.find(h => h.id === parseInt(heroId));
            if (hero && !hero.unlocked && this.currentHero.level >= requiredLevel) {
                hero.unlocked = true;
                this.addToLog(`🔓 Разблокирован новый герой: ${hero.name}!`);
            }
        });
    }

    // Данные по умолчанию
    getDefaultHeroes() {
        return [
            {
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
                equipment: {
                    main_hand: null,
                    chest: null
                },
                unlocked: true,
                story: "Простой воин из далекой деревни...",
                videoUrl: "https://youtube.com/embed/..."
            },
            {
                id: 2,
                name: "Опытный искатель",
                image: "images/heroes/hero2.jpg",
                race: "elf",
                class: "archer",
                saga: "vulkanor",
                baseHealth: 120,
                baseDamage: 25,
                baseArmor: 8,
                gold: 0,
                level: 1,
                experience: 0,
                healthRegen: 100/45,
                inventory: [],
                equipment: {
                    main_hand: null,
                    chest: null
                },
                unlocked: false,
                story: "Эльфийский следопыт с острым взглядом...",
                videoUrl: "https://youtube.com/embed/..."
            }
        ];
    }

    getDefaultEnemies() {
        return [
            {
                id: 1,
                name: "Слабый монстр",
                health: 30,
                maxHealth: 30,
                attack: 5,
                defense: 2,
                speed: 3,
                experience: 5,
                reward: 10
            }
        ];
    }

    getDefaultItems() {
        return [
            {
                id: 1,
                name: "Малое зелье здоровья",
                type: "potion",
                value: 20,
                price: 25,
                heal: 20
            }
        ];
    }

    getDefaultMaps() {
        return [
            { 
                id: 1, 
                name: "Арканиум", 
                image: "images/maps/arcanium.jpg", 
                description: "Земля древней магии", 
                multiplier: 1.0, 
                unlocked: true 
            },
            { 
                id: 2, 
                name: "Хобблтон", 
                image: "images/maps/hobbleton.jpg", 
                description: "Мирный сельский край", 
                multiplier: 1.5, 
                unlocked: false 
            },
            { 
                id: 3, 
                name: "Фелисар", 
                image: "images/maps/felisar.jpg", 
                description: "Лесные тропики", 
                multiplier: 2.0, 
                unlocked: false 
            },
            { 
                id: 4, 
                name: "Илверин", 
                image: "images/maps/ilverin.jpg", 
                description: "Зачарованный лес", 
                multiplier: 2.5, 
                unlocked: false 
            },
            { 
                id: 5, 
                name: "Варгош", 
                image: "images/maps/vargosh.jpg", 
                description: "Вулканические земли", 
                multiplier: 3.0, 
                unlocked: false 
            },
            { 
                id: 6, 
                name: "Дунгарн", 
                image: "images/maps/dungarn.jpg", 
                description: "Подземные пещеры", 
                multiplier: 3.5, 
                unlocked: false 
            },
            { 
                id: 7, 
                name: "Люминэль", 
                image: "images/maps/luminel.jpg", 
                description: "Сверкающие равнины", 
                multiplier: 4.0, 
                unlocked: false 
            },
            { 
                id: 8, 
                name: "Астрарион", 
                image: "images/maps/astarion.jpg", 
                description: "Небесные просторы", 
                multiplier: 4.5, 
                unlocked: false 
            },
            { 
                id: 9, 
                name: "Эльфарион", 
                image: "images/maps/elfarion.jpg", 
                description: "Древнее королевство эльфов", 
                multiplier: 5.0, 
                unlocked: false 
            }
        ];
    }

    getDefaultLocations() {
        return [
            { 
                level: 10, 
                name: "Начальные земли", 
                description: "Мягкий климат, слабые монстры", 
                image: "images/locations/level10.jpg",
                monsterRange: [1, 10], 
                artifactChance: 0.005, 
                relicChance: 0.0005 
            },
            { 
                level: 9, 
                name: "Глубокий лес", 
                description: "Густые заросли", 
                image: "images/locations/level9.jpg",
                monsterRange: [1, 20], 
                artifactChance: 0.01, 
                relicChance: 0.001 
            },
            { 
                level: 8, 
                name: "Скалистые утесы", 
                description: "Крутые обрывы", 
                image: "images/locations/level8.jpg",
                monsterRange: [1, 30], 
                artifactChance: 0.015, 
                relicChance: 0.0015 
            },
            { 
                level: 7, 
                name: "Заброшенные руины", 
                description: "Древние постройки", 
                image: "images/locations/level7.jpg",
                monsterRange: [1, 40], 
                artifactChance: 0.02, 
                relicChance: 0.002 
            },
            { 
                level: 6, 
                name: "Темные пещеры", 
                description: "Мрак и опасность", 
                image: "images/locations/level6.jpg",
                monsterRange: [1, 50], 
                artifactChance: 0.025, 
                relicChance: 0.0025 
            },
            { 
                level: 5, 
                name: "Магические земли", 
                description: "Сила магии", 
                image: "images/locations/level5.jpg",
                monsterRange: [1, 60], 
                artifactChance: 0.03, 
                relicChance: 0.003 
            },
            { 
                level: 4, 
                name: "Ледяные пустоши", 
                description: "Вечная мерзлота", 
                image: "images/locations/level4.jpg",
                monsterRange: [1, 70], 
                artifactChance: 0.035, 
                relicChance: 0.0035 
            },
            { 
                level: 3, 
                name: "Огненные земли", 
                description: "Жар и пламя", 
                image: "images/locations/level3.jpg",
                monsterRange: [1, 80], 
                artifactChance: 0.04, 
                relicChance: 0.004 
            },
            { 
                level: 2, 
                name: "Небесные пути", 
                description: "Высоко в облаках", 
                image: "images/locations/level2.jpg",
                monsterRange: [1, 90], 
                artifactChance: 0.045, 
                relicChance: 0.0045 
            },
            { 
                level: 1, 
                name: "Тронный зал", 
                description: "Обитель могущественных существ", 
                image: "images/locations/level1.jpg",
                monsterRange: [1, 100], 
                artifactChance: 0.05, 
                relicChance: 0.005 
            }
        ];
    }

    getDefaultMovement() {
        return [
            {
                id: "walk",
                name: "Пешком",
                description: "Обычная ходьба",
                movement: 2,
                stealthBonus: 0,
                escapeBonus: 0
            }
        ];
    }

    // Бонусы рас, профессий и саг
    getBonuses() {
        return {
            races: {
                elf: { bonus: {type: "escape_bonus", value: 1}, name: "Эльф", description: "Проворный и неуловимый" },
                dwarf: { bonus: {type: "health_mult", value: 0.3}, name: "Гном", description: "Выносливый и крепкий" },
                halfling: { bonus: {type: "stealth_bonus", value: 1}, name: "Полурослик", description: "Маленький и незаметный" },
                fairy: { bonus: {type: "luck_bonus", value: 1}, name: "Фея", description: "Везение и магия" },
                laitar: { bonus: {type: "survival_bonus", value: 1}, name: "Лайтар", description: "Мастер выживания" },
                ork: { bonus: {type: "damage_mult", value: 0.2}, name: "Орк", description: "Сильный и свирепый" },
                human: { bonus: {type: "gold_mult", value: 0.3}, name: "Человек", description: "Предприимчивый и богатый" },
                dragon: { bonus: {type: "armor_mult", value: 0.15}, name: "Дракон", description: "Могучий и защищённый" }
            },
            classes: {
                archer: { bonus: {type: "damage_mult", value: 0.2}, name: "Лучник", description: "Мастер дальнего боя" },
                warrior: { bonus: {type: "damage_mult", value: 0.2}, name: "Воин", description: "Сильный и отважный" },
                thief: { bonus: {type: "stealth_bonus", value: 1}, name: "Вор", description: "Тихий и незаметный" },
                merchant: { bonus: {type: "gold_mult", value: 0.3}, name: "Торговец", description: "Искусный торговец" },
                fighter: { bonus: {type: "luck_bonus", value: 1}, name: "Кулачный боец", description: "Удачливый боец" },
                healer: { bonus: {type: "health_mult", value: 0.3}, name: "Знахарь", description: "Мастер исцеления" },
                sorcerer: { bonus: {type: "escape_bonus", value: 1}, name: "Колдун", description: "Магическая защита" },
                death_mage: { bonus: {type: "stealth_bonus", value: 1}, name: "Волхв смерти", description: "Тёмные искусства" },
                hunter: { bonus: {type: "survival_bonus", value: 1}, name: "Охотник", description: "Следопыт и выживальщик" },
                bounty_hunter: { bonus: {type: "damage_mult", value: 0.1}, name: "Охотник за головами", description: "Специалист по преследованию" },
                gladiator: { bonus: {type: "damage_mult", value: 0.2}, name: "Гладиатор", description: "Мастер любого оружия" },
                blacksmith: { bonus: {type: "armor_mult", value: 0.15}, name: "Кузнец", description: "Мастер брони" },
                antiquarian: { bonus: {type: "gold_mult", value: 0.3}, name: "Искатель древностей", description: "Знаток сокровищ" }
            },
            sagas: {
                golden_egg: { bonus: {type: "health_mult", value: 0.3}, name: "Золотое Яйцо", description: "Обладатель древнего артефакта" },
                vulkanor: { bonus: {type: "damage_mult", value: 0.2}, name: "Вулканор", description: "Прошедший огненные испытания" },
                well: { bonus: {type: "gold_mult", value: 0.3}, name: "Колодец", description: "Нашедший источник богатства" },
                pets: { bonus: {type: "luck_bonus", value: 1}, name: "Питомцы", description: "Верные спутники приносят удачу" },
                following_sun: { bonus: {type: "survival_bonus", value: 1}, name: "Вслед за солнцем", description: "Прошедший через пустыни" },
                vampire_crown: { bonus: {type: "stealth_bonus", value: 1}, name: "Корона короля вампиров", description: "Носитель тёмной короны" },
                tiger_eye: { bonus: {type: "armor_mult", value: 0.15}, name: "Желтый Глаз тигра", description: "Обладатель мистической защиты" },
                sky_phenomena: { bonus: {type: "escape_bonus", value: 1}, name: "Небесные явления", description: "Свидетель небесных чудес" }
            }
        };
    }

    // Расчёт характеристик героя
    calculateHeroStats(hero) {
        const bonuses = this.getBonuses();
        
        const raceBonus = bonuses.races[hero.race]?.bonus || {type: "none", value: 0};
        const classBonus = bonuses.classes[hero.class]?.bonus || {type: "none", value: 0};
        const sagaBonus = bonuses.sagas[hero.saga]?.bonus || {type: "none", value: 0};
        
        let weaponBonus = {type: "none", value: 0};
        let armorBonus = {type: "none", value: 0};
        
        if (hero.equipment.main_hand) {
            const weapon = this.items.find(item => item.id === hero.equipment.main_hand);
            weaponBonus = weapon?.bonus || {type: "none", value: 0};
        }
        
        if (hero.equipment.chest) {
            const armor = this.items.find(item => item.id === hero.equipment.chest);
            armorBonus = armor?.bonus || {type: "none", value: 0};
        }

        const allBonuses = [raceBonus, classBonus, sagaBonus, weaponBonus, armorBonus];

        // База с учетом уровня
        const levelMultiplier = 1 + (hero.level - 1) * 0.1;
        let health = hero.baseHealth * levelMultiplier;
        let damage = hero.baseDamage * levelMultiplier;
        let armor = hero.baseArmor * levelMultiplier;

        // Экипировка
        if (hero.equipment.main_hand) {
            const weapon = this.items.find(item => item.id === hero.equipment.main_hand);
            damage += weapon?.fixed_damage || 0;
        }
        
        if (hero.equipment.chest) {
            const armorItem = this.items.find(item => item.id === hero.equipment.chest);
            armor += armorItem?.fixed_armor || 0;
        }

        // Бонусы
        allBonuses.forEach(bonus => {
            switch(bonus.type) {
                case 'health_mult': health *= (1 + bonus.value); break;
                case 'damage_mult': damage *= (1 + bonus.value); break;
                case 'armor_mult': armor *= (1 + bonus.value); break;
            }
        });

        const power = Math.round((health / 10) + (damage * 1.5) + (armor * 2));

        const skills = {
            escape: 0,
            stealth: 0,
            luck: 0,
            survival: 0,
            wealth: 0
        };

        allBonuses.forEach(bonus => {
            if (bonus.type.includes('_bonus')) {
                const skill = bonus.type.replace('_bonus', '');
                if (skills.hasOwnProperty(skill)) {
                    skills[skill] += bonus.value;
                }
            }
            else if (bonus.type === 'gold_mult') {
                skills.wealth += bonus.value;
            }
        });

        const currentHealth = this.getCurrentHealth();

        return {
            health: Math.round(health),
            currentHealth: currentHealth,
            maxHealth: Math.round(health),
            damage: Math.round(damage),
            armor: Math.round(armor),
            power: power,
            skills: skills,
            bonuses: {
                race: raceBonus,
                class: classBonus,
                saga: sagaBonus,
                weapon: weaponBonus,
                armor: armorBonus
            }
        };
    }

    // Система здоровья с регенерацией
    getCurrentHealth() {
        if (!this.currentHero) return 0;
        
        const now = Date.now();
        const timePassed = (now - this.lastHealthUpdate) / 1000;
        const healthToRegen = timePassed * this.currentHero.healthRegen;
        
        let currentHealth = this.currentHero.currentHealth || this.currentHero.baseHealth;
        
        if (currentHealth < this.currentHero.baseHealth) {
            currentHealth = Math.min(
                this.currentHero.baseHealth,
                currentHealth + healthToRegen
            );
            this.currentHero.currentHealth = currentHealth;
            this.lastHealthUpdate = now;
            this.saveGame();
        }
        
        return Math.floor(currentHealth);
    }

 renderHeroSelect() {
    const container = document.getElementById('app');
    container.innerHTML = `
        <div class="screen active" id="screen-hero-select">
            <h2 class="text-center">Выберите героя</h2>
            <div class="hero-list">
                ${this.heroes.map(hero => {
                    // ПЕРВЫЙ ГЕРОЙ ВСЕГДА ДОСТУПЕН, остальные по unlocked
                    const isUnlocked = hero.id === 1 ? true : (hero.unlocked || false);
                    
                    const stats = this.calculateHeroStats(hero);
                    const bonuses = this.getBonuses();
                    
                    const activeSkills = [];
                    
                    if (stats.skills.stealth > 0) activeSkills.push({icon: '👻', name: 'Скрытность', value: stats.skills.stealth});
                    if (stats.skills.escape > 0) activeSkills.push({icon: '🏃', name: 'Побег', value: stats.skills.escape});
                    if (stats.skills.luck > 0) activeSkills.push({icon: '🍀', name: 'Удача', value: stats.skills.luck});
                    if (stats.skills.survival > 0) activeSkills.push({icon: '🌿', name: 'Выживание', value: stats.skills.survival});
                    if (stats.skills.wealth > 0) activeSkills.push({icon: '💰', name: 'Богатство', value: stats.skills.wealth});
                    
                    if (stats.bonuses.race.value > 0 && stats.bonuses.race.type.includes('health_mult')) 
                        activeSkills.push({icon: '❤️', name: 'Здоровье', value: Math.round(stats.bonuses.race.value * 100) + '%'});
                    if (stats.bonuses.race.value > 0 && stats.bonuses.race.type.includes('damage_mult')) 
                        activeSkills.push({icon: '⚔️', name: 'Урон', value: Math.round(stats.bonuses.race.value * 100) + '%'});
                    if (stats.bonuses.race.value > 0 && stats.bonuses.race.type.includes('armor_mult')) 
                        activeSkills.push({icon: '🛡️', name: 'Броня', value: Math.round(stats.bonuses.race.value * 100) + '%'});
                    
                    if (stats.bonuses.class.value > 0 && stats.bonuses.class.type.includes('health_mult')) 
                        activeSkills.push({icon: '❤️', name: 'Здоровье', value: Math.round(stats.bonuses.class.value * 100) + '%'});
                    if (stats.bonuses.class.value > 0 && stats.bonuses.class.type.includes('damage_mult')) 
                        activeSkills.push({icon: '⚔️', name: 'Урон', value: Math.round(stats.bonuses.class.value * 100) + '%'});
                    if (stats.bonuses.class.value > 0 && stats.bonuses.class.type.includes('armor_mult')) 
                        activeSkills.push({icon: '🛡️', name: 'Броня', value: Math.round(stats.bonuses.class.value * 100) + '%'});
                    
                    if (stats.bonuses.saga.value > 0 && stats.bonuses.saga.type.includes('health_mult')) 
                        activeSkills.push({icon: '❤️', name: 'Здоровье', value: Math.round(stats.bonuses.saga.value * 100) + '%'});
                    if (stats.bonuses.saga.value > 0 && stats.bonuses.saga.type.includes('damage_mult')) 
                        activeSkills.push({icon: '⚔️', name: 'Урон', value: Math.round(stats.bonuses.saga.value * 100) + '%'});
                    if (stats.bonuses.saga.value > 0 && stats.bonuses.saga.type.includes('armor_mult')) 
                        activeSkills.push({icon: '🛡️', name: 'Броня', value: Math.round(stats.bonuses.saga.value * 100) + '%'});

                    return `
                        <div class="hero-option ${isUnlocked ? '' : 'locked'}" 
                             onclick="${isUnlocked ? `game.selectHero(${hero.id})` : ''}">
                            <div class="hero-option-image">
                                <img src="${hero.image}" alt="${hero.name}">
                                ${!isUnlocked ? '<div class="locked-overlay">🔒</div>' : ''}
                            </div>
                            <div class="hero-option-info">
                                <div class="hero-option-header">
                                    <strong>${hero.name}</strong>
                                    <span class="hero-level">Ур. ${hero.level}</span>
                                </div>
                                <div class="hero-option-stats">
                                    <div class="stat-row">
                                        <span>❤️ ${stats.currentHealth}/${stats.maxHealth}</span>
                                        <span>⚔️ ${stats.damage}</span>
                                        <span>🛡️ ${stats.armor}</span>
                                        <span>🌟 ${stats.power}</span>
                                    </div>
                                    <div class="stat-row">
                                        <span>💰 ${hero.gold}</span>
                                        <span>⚡ ${hero.experience}/${this.getLevelRequirements()[hero.level + 1] || 'MAX'}</span>
                                    </div>
                                </div>
                                ${activeSkills.length > 0 ? `
                                    <div class="hero-option-skills">
                                        ${activeSkills.map(skill => `
                                            <span title="${skill.name}">${skill.icon} ${skill.value}${typeof skill.value === 'number' ? 'd6' : ''}</span>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                <div class="hero-option-bonuses">
                                    <small>${bonuses.races[hero.race]?.name} - ${bonuses.classes[hero.class]?.name} - ${bonuses.sagas[hero.saga]?.name}</small>
                                </div>
                                ${!isUnlocked ? '<small class="locked-text">Требуется уровень: ' + (hero.id * 5) + '</small>' : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Выбор героя
selectHero(heroId) {
    console.log('Выбор героя:', heroId); // Для отладки
    
    const hero = this.heroes.find(h => h.id === heroId);
    if (!hero) {
        console.error('Герой не найден:', heroId);
        return;
    }
    
    // Проверяем разблокирован ли герой
    const isUnlocked = hero.id === 1 ? true : (hero.unlocked || false);
    if (!isUnlocked) {
        console.log('Герой заблокирован:', hero.name);
        return;
    }
    
    this.currentHero = hero;
    this.showScreen('main');
    this.renderHeroScreen();
    this.saveGame();
    
    console.log('Герой выбран:', hero.name);
}

// Показать экран
showScreen(screenName) {
    this.currentScreen = screenName;
    console.log('Переход на экран:', screenName);
}

    // Показать экран
    showScreen(screenName) {
        this.currentScreen = screenName;
    }

    // Рендер основного экрана героя
    renderHeroScreen() {
        if (!this.currentHero) return;

        const stats = this.calculateHeroStats(this.currentHero);
        const bonuses = this.getBonuses();

        const weapon = this.currentHero.equipment.main_hand ? 
            this.items.find(item => item.id === this.currentHero.equipment.main_hand) : null;
        const armor = this.currentHero.equipment.chest ? 
            this.items.find(item => item.id === this.currentHero.equipment.chest) : null;

        const nextLevelExp = this.getLevelRequirements()[this.currentHero.level + 1];
        const expProgress = nextLevelExp ? (this.currentHero.experience / nextLevelExp) * 100 : 100;

        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="screen active" id="screen-main">
                <!-- Новый макет с тремя колонками -->
                <div class="hero-layout">
                    <!-- Левая колонка - Герой -->
                    <div class="hero-column">
                        <div class="column-title">🎯 ВАШ ГЕРОЙ</div>
                        <div class="hero-image">
                            <img src="${this.currentHero.image}" alt="${this.currentHero.name}">
                        </div>
                        <div class="hero-info">
                            <h2>${this.currentHero.name}</h2>
                            <div class="hero-main-stats">
                                <div class="main-stat">
                                    <span class="stat-icon">❤️</span>
                                    <span class="stat-value">${stats.currentHealth}/${stats.maxHealth}</span>
                                </div>
                                <div class="main-stat">
                                    <span class="stat-icon">⚔️</span>
                                    <span class="stat-value">${stats.damage}</span>
                                </div>
                                <div class="main-stat">
                                    <span class="stat-icon">🛡️</span>
                                    <span class="stat-value">${stats.armor}</span>
                                </div>
                                <div class="main-stat">
                                    <span class="stat-icon">🌟</span>
                                    <span class="stat-value">${stats.power}</span>
                                </div>
                            </div>
                            <div class="hero-regen">
                                <span>⚡ Регенерация: ${Math.round(this.currentHero.healthRegen * 60)}/мин</span>
                            </div>
                            <div class="level-progress">
                                <div class="level-progress-fill" style="width: ${expProgress}%"></div>
                            </div>
                            <div class="hero-progress">
                                <span>Ур. ${this.currentHero.level}</span>
                                <span>💰 ${this.currentHero.gold}</span>
                                <span>⚡ ${this.currentHero.experience}/${nextLevelExp || 'MAX'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Центральная колонка - Карта -->
                    <div class="map-column">
                        <div class="column-title">🗺️ ВЫБОР КАРТЫ</div>
                        ${this.renderMapSelection()}
                    </div>

                    <!-- Правая колонка - Локация -->
                    <div class="location-column">
                        <div class="column-title">📍 ВЫБОР ЛОКАЦИИ</div>
                        ${this.renderLocationSelection()}
                    </div>
                </div>

                <!-- Нижняя часть - монстр/бой -->
                <div class="battle-section">
                    <div class="monster-reward-column">
                        <div class="column-title">🎭 ВРАГ / 🎁 НАГРАДА</div>
                        ${this.renderMonsterRewardColumn()}
                    </div>
                </div>

                <!-- Секция экипировки -->
                <div class="equipment-section">
                    <div class="equipment-slot ${weapon ? 'equipped' : 'empty'}" onclick="game.showInventory()">
                        <div class="equipment-icon">
                            ${weapon ? `<img src="${weapon.image}" alt="${weapon.name}">` : ''}
                        </div>
                        <div>
                            <strong>⚔️ Оружие</strong>
                            <div>${weapon ? weapon.name : 'Пусто'}</div>
                            ${weapon ? `<small>${this.formatBonus(weapon.bonus)}</small>` : ''}
                        </div>
                    </div>
                    
                    <div class="equipment-slot ${armor ? 'equipped' : 'empty'}" onclick="game.showInventory()">
                        <div class="equipment-icon">
                            ${armor ? `<img src="${armor.image}" alt="${armor.name}">` : ''}
                        </div>
                        <div>
                            <strong>🛡️ Броня</strong>
                            <div>${armor ? armor.name : 'Пусто'}</div>
                            ${armor ? `<small>${this.formatBonus(armor.bonus)}</small>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Бонусы -->
                <div class="bonuses-section">
                    <h3>🎯 Бонусы:</h3>
                    <div class="bonus-item">
                        <strong>Раса:</strong> ${bonuses.races[this.currentHero.race]?.name} 
                        (${this.formatBonus(stats.bonuses.race)})
                    </div>
                    <div class="bonus-item">
                        <strong>Профессия:</strong> ${bonuses.classes[this.currentHero.class]?.name}
                        (${this.formatBonus(stats.bonuses.class)})
                    </div>
                    <div class="bonus-item">
                        <strong>Сага:</strong> ${bonuses.sagas[this.currentHero.saga]?.name}
                        (${this.formatBonus(stats.bonuses.saga)})
                    </div>
                </div>

                <!-- Кнопки действий -->
                <div class="action-buttons">
                    <button class="btn-primary" onclick="game.startAdventure()">🎲 Начать путешествие</button>
                    <button class="btn-secondary" onclick="game.showInventory()">🎒 Инвентарь</button>
                    <button class="btn-secondary" onclick="game.showMerchant()">🏪 Магазин</button>
                    <button class="btn-danger" onclick="game.resetHero()">🔄 Сбросить героя</button>
                    <button class="btn-secondary" onclick="game.renderHeroSelect()">🔁 Сменить героя</button>
                </div>

                <!-- Журнал событий -->
                <div class="battle-log" id="battle-log"></div>
            </div>
        `;

        if (this.battleActive) {
            this.renderBattleScreen();
        }
    }

    // Рендер выбора карты
    renderMapSelection() {
        if (this.currentMap) {
            return `
                <div class="map-info">
                    <div class="map-image-large">
                        <img src="${this.currentMap.image}" alt="${this.currentMap.name}">
                    </div>
                    <h4>${this.currentMap.name}</h4>
                    <p>${this.currentMap.description}</p>
                    <div class="map-multiplier">
                        Множитель силы: x${this.currentMap.multiplier}
                    </div>
                    <button class="btn-secondary" onclick="game.showMapSelection()">Сменить карту</button>
                </div>
            `;
        } else {
            return `
                <div class="map-info">
                    <div class="map-image-large">
                        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                            <div style="font-size: 3em; margin-bottom: 10px;">🗺️</div>
                            <div>Выберите карту</div>
                        </div>
                    </div>
                    <button class="btn-primary" onclick="game.showMapSelection()">Выбрать карту</button>
                </div>
            `;
        }
    }

    // Рендер выбора локации
    renderLocationSelection() {
        if (this.currentLocation) {
            return `
                <div class="location-info">
                    <div class="location-image-large">
                        <img src="${this.currentLocation.image}" alt="${this.currentLocation.name}">
                    </div>
                    <h4>${this.currentLocation.name} (Ур. ${this.currentLocation.level})</h4>
                    <p>${this.currentLocation.description}</p>
                    <div class="location-stats">
                        <div>Монстры: №${this.currentLocation.monsterRange[0]}-${this.currentLocation.monsterRange[1]}</div>
                        <div>Артефакты: ${(this.currentLocation.artifactChance * 100).toFixed(2)}%</div>
                        <div>Реликвии: ${(this.currentLocation.relicChance * 100).toFixed(2)}%</div>
                    </div>
                    <button class="btn-secondary" onclick="game.showLocationSelection()">Сменить локацию</button>
                </div>
            `;
        } else {
            return `
                <div class="location-info">
                    <div class="location-image-large">
                        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                            <div style="font-size: 3em; margin-bottom: 10px;">📍</div>
                            <div>Выберите локацию</div>
                        </div>
                    </div>
                    <button class="btn-primary" onclick="game.showLocationSelection()">Выбрать локацию</button>
                </div>
            `;
        }
    }

    // Рендер колонки монстра/награды
    renderMonsterRewardColumn() {
        if (this.showReward) {
            return this.renderRewardDisplay();
        } else if (this.currentMonster) {
            const monsterDisplay = this.renderMonsterDisplay();
            setTimeout(() => {
                this.showMonsterActions();
            }, 100);
            return monsterDisplay;
        } else {
            return `
                <div class="monster-info">
                    <div class="monster-image-large">
                        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                            <div style="font-size: 3em; margin-bottom: 10px;">⚔️</div>
                            <div>Встретьте монстра</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Рендер награды
    renderRewardDisplay() {
        return `
            <div class="reward-info">
                <div class="reward-image">
                    💰
                </div>
                <div style="text-align: center; margin-top: 10px;">
                    <h4>🎉 ПОБЕДА!</h4>
                    <p>Получено: ${this.lastReward} золота</p>
                    <button class="btn-primary" onclick="game.hideReward()">Продолжить</button>
                </div>
            </div>
        `;
    }

    // Рендер монстра
    renderMonsterDisplay() {
        if (!this.currentMonster) return '';
        
        const stats = this.calculateHeroStats(this.currentHero);
        const powerComparison = stats.power >= this.currentMonster.power ? '✅ ПРЕИМУЩЕСТВО' : '⚠️ РИСК';

        return `
            <div class="monster-info">
                <div class="monster-image-large">
                    <img src="${this.currentMonster.image}" alt="${this.currentMonster.name}">
                </div>
                <h4>${this.currentMonster.name}</h4>
                <p>${this.currentMonster.description}</p>
                
                <div class="stats-grid" style="grid-template-columns: 1fr 1fr;">
                    <div class="stat-card">
                        <div>❤️ Здоровье</div>
                        <div class="stat-value">${this.currentMonster.health}</div>
                    </div>
                    <div class="stat-card">
                        <div>⚔️ Урон</div>
                        <div class="stat-value">${this.currentMonster.damage}</div>
                    </div>
                    <div class="stat-card">
                        <div>🛡️ Броня</div>
                        <div class="stat-value">${this.currentMonster.armor}</div>
                    </div>
                    <div class="stat-card">
                        <div>🌟 Мощь</div>
                        <div class="stat-value">${this.currentMonster.power}</div>
                    </div>
                </div>
                
                <div style="text-align: center; margin: 10px 0;">
                    <p><strong>Сравнение:</strong> ${powerComparison}</p>
                    <p>💰 Награда: ${this.currentMonster.reward} золота</p>
                </div>
            </div>
        `;
    }

    // Показать выбор карты
    showMapSelection() {
        const mapsHTML = this.maps.map(map => `
            <div class="map-option ${map.unlocked ? '' : 'locked'}" 
                 onclick="${map.unlocked ? `game.selectMap(${map.id})` : ''}">
                <div class="map-option-image">
                    <img src="${map.image}" alt="${map.name}">
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

    // Выбор карты
    selectMap(mapId) {
        this.currentMap = this.maps.find(m => m.id === mapId);
        this.addToLog(`🗺️ Выбрана карта: ${this.currentMap.name}`);
        this.renderHeroScreen();
    }

    // Показать выбор локации
    showLocationSelection() {
        if (!this.currentMap) {
            this.addToLog('❌ Сначала выберите карту');
            return;
        }

        const locationsHTML = this.locations.map(location => `
            <div class="location-option" onclick="game.selectLocation(${location.level})">
                <div class="location-option-image">
                    <img src="${location.image}" alt="${location.name}">
                </div>
                <div class="location-option-info">
                    <strong>${location.name} (Ур. ${location.level})</strong>
                    <div>${location.description}</div>
                    <small>Монстры: №${location.monsterRange[0]}-${location.monsterRange[1]}</small>
                </div>
            </div>
        `).join('');

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

    // Выбор локации
    selectLocation(level) {
        this.currentLocation = this.locations.find(l => l.level === level);
        this.addToLog(`📍 Выбрана локация: ${this.currentLocation.name} (Ур. ${level})`);
        this.renderHeroScreen();
    }

    // Начать путешествие
    startAdventure() {
        if (!this.currentMap || !this.currentLocation) {
            this.addToLog('❌ Сначала выберите карту и локацию');
            return;
        }

        this.addToLog(`🚀 Начато путешествие по карте ${this.currentMap.name}, локация: ${this.currentLocation.name}`);
        this.encounterMonster();
    }

    // Встреча с монстром
    encounterMonster() {
        if (!this.currentLocation || !this.currentMap) return;

        const [minId, maxId] = this.currentLocation.monsterRange;
        const monsterId = Math.floor(Math.random() * (maxId - minId + 1)) + minId;
        
        let monster = this.monsters.find(m => m.id === monsterId);
        if (!monster) {
            monster = this.monsters[0]; // fallback
        }

        // Применяем множитель карты
        this.currentMonster = {
            ...monster,
            health: Math.round(monster.health * this.currentMap.multiplier),
            damage: Math.round(monster.damage * this.currentMap.multiplier),
            armor: Math.round(monster.armor * this.currentMap.multiplier),
            reward: Math.round(monster.reward * this.currentMap.multiplier),
            power: Math.round(monster.power * this.currentMap.multiplier)
        };

        this.addToLog(`🎭 Встречен: ${this.currentMonster.name}`);
        this.renderHeroScreen();
        this.showMonsterActions();
    }

    // Показать действия для монстра
    showMonsterActions() {
        if (!this.currentMonster) return;
        
        const container = document.getElementById('app');
        const oldActions = container.querySelector('.monster-actions');
        if (oldActions) {
            oldActions.remove();
        }
        
        const actionsHTML = `
            <div class="monster-actions" style="margin-top: 15px;">
                <button class="btn-primary" onclick="game.startBattle()">⚔️ Сражаться</button>
                <button class="btn-secondary" onclick="game.attemptStealth()">👻 Скрыться</button>
                <button class="btn-secondary" onclick="game.attemptEscape()">🏃 Убежать</button>
            </div>
        `;
        
        container.innerHTML += actionsHTML;
    }

    // ========== СИСТЕМА БОЯ ==========

    // Начать бой
    startBattle() {
        if (!this.currentMonster || this.battleActive) return;
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        
        if (!this.currentHero.currentHealth) {
            const stats = this.calculateHeroStats(this.currentHero);
            this.currentHero.currentHealth = stats.health;
        }
        
        this.currentMonster.currentHealth = this.currentMonster.health;
        
        this.addToLog(`⚔️ Начало боя с ${this.currentMonster.name}!`);
        this.renderBattleScreen();
    }

    // Рендер экрана боя
    renderBattleScreen() {
        if (!this.battleActive) return;
        
        const stats = this.calculateHeroStats(this.currentHero);
        const heroHealthPercent = (this.currentHero.currentHealth / stats.maxHealth) * 100;
        const monsterHealthPercent = (this.currentMonster.currentHealth / this.currentMonster.health) * 100;
        
        const battleHTML = `
            <div class="battle-screen">
                <div class="battle-header">
                    <h3>⚔️ БОЙ</h3>
                    <div class="battle-round">Раунд: ${this.battleRound}</div>
                </div>
                
                <div class="battle-combatants">
                    <!-- Герой -->
                    <div class="combatant hero-combatant">
                        <div class="combatant-image">
                            <img src="${this.getRaceImage(this.currentHero.race)}" alt="${this.currentHero.race}">
                        </div>
                        <div class="combatant-info">
                            <h4>${this.currentHero.name}</h4>
                            <div class="health-bar">
                                <div class="health-bar-fill" style="width: ${heroHealthPercent}%"></div>
                                <div class="health-bar-text">
                                    ${Math.ceil(this.currentHero.currentHealth)}/${stats.maxHealth}
                                </div>
                            </div>
                            <div class="combatant-stats">
                                <span>⚔️ ${stats.damage}</span>
                                <span>🛡️ ${stats.armor}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="vs">VS</div>
                    
                    <!-- Монстр -->
                    <div class="combatant monster-combatant">
                        <div class="combatant-image">
                            <img src="${this.currentMonster.image}" alt="${this.currentMonster.name}">
                        </div>
                        <div class="combatant-info">
                            <h4>${this.currentMonster.name}</h4>
                            <div class="health-bar">
                                <div class="health-bar-fill" style="width: ${monsterHealthPercent}%"></div>
                                <div class="health-bar-text">
                                    ${Math.ceil(this.currentMonster.currentHealth)}/${this.currentMonster.health}
                                </div>
                            </div>
                            <div class="combatant-stats">
                                <span>⚔️ ${this.currentMonster.damage}</span>
                                <span>🛡️ ${this.currentMonster.armor}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Лог боя -->
                <div class="battle-log-container">
                    ${this.battleLog.map(entry => `
                        <div class="battle-log-entry ${entry.type || ''}">${entry.message}</div>
                    `).join('')}
                </div>
                
                <!-- Кнопки действий -->
                <div class="battle-actions">
                    <button class="btn-battle-attack" onclick="game.battleAttack()">
                        ⚔️ Нанести удар
                    </button>
                    <button class="btn-battle-escape" onclick="game.attemptEscapeFromBattle()">
                        🏃 Попытаться сбежать
                    </button>
                </div>
            </div>
        `;
        
        const container = document.getElementById('app');
        const existingBattle = container.querySelector('.battle-screen');
        if (existingBattle) {
            existingBattle.remove();
        }
        container.innerHTML += battleHTML;
    }

    // Получить изображение расы
    getRaceImage(race) {
        const raceImages = {
            human: 'images/races/human.png',
            elf: 'images/races/elf.png',
            dwarf: 'images/races/dwarf.png',
            ork: 'images/races/ork.png',
            dragon: 'images/races/dragon.png',
            halfling: 'images/races/halfling.png',
            fairy: 'images/races/fairy.png',
            laitar: 'images/races/laitar.png'
        };
        return raceImages[race] || 'images/races/human.png';
    }

    // Атака в бою
    battleAttack() {
        if (!this.battleActive) return;
        
        this.battleRound++;
        const stats = this.calculateHeroStats(this.currentHero);
        
        // Ход героя
        const heroDamage = Math.max(1, stats.damage - this.currentMonster.armor);
        this.currentMonster.currentHealth -= heroDamage;
        
        this.addBattleLog({
            message: `🗡️ ${this.currentHero.name} наносит ${heroDamage} урона!`,
            type: 'hero-attack'
        });
        
        if (this.currentMonster.currentHealth <= 0) {
            this.endBattle(true);
            return;
        }
        
        // Ход монстра
        const monsterDamage = Math.max(1, this.currentMonster.damage - stats.armor);
        this.currentHero.currentHealth -= monsterDamage;
        
        this.addBattleLog({
            message: `👹 ${this.currentMonster.name} наносит ${monsterDamage} урона!`,
            type: 'monster-attack'
        });
        
        if (this.currentHero.currentHealth <= 0) {
            this.endBattle(false);
            return;
        }
        
        this.saveGame();
        this.renderBattleScreen();
    }

    // Добавить запись в лог боя
    addBattleLog(entry) {
        this.battleLog.push(entry);
        if (this.battleLog.length > 10) {
            this.battleLog.shift();
        }
    }

    // Завершение боя
    endBattle(victory) {
        if (victory) {
            const reward = this.currentMonster.reward;
            this.currentHero.gold += reward;
            
            const baseExperience = Math.max(10, Math.floor(this.currentMonster.power / 2));
            const experienceGained = baseExperience;
            
            this.addExperience(experienceGained);
            
            this.addBattleLog({
                message: `🎉 ПОБЕДА! Получено ${reward} золота и ${experienceGained} опыта`,
                type: 'victory'
            });
            
            this.addToLog(`🎯 Побежден ${this.currentMonster.name}! Получено ${reward} золота и ${experienceGained} опыта`);
            
            this.checkSpecialDrops();
            
        } else {
            this.addBattleLog({
                message: `💀 ПОРАЖЕНИЕ! Герой повержен`,
                type: 'defeat'
            });
            
            this.addToLog(`💥 Проигран бой с ${this.currentMonster.name}`);
        }
        
        this.battleActive = false;
        this.currentMonster = null;
        this.selectedMovement = null;
        
        setTimeout(() => {
            this.renderHeroScreen();
        }, 3000);
    }

    // Проверка дропа особых предметов
    checkSpecialDrops() {
        if (!this.currentLocation) return;
        
        if (Math.random() < this.currentLocation.artifactChance) {
            this.dropArtifact();
        }
        
        if (Math.random() < this.currentLocation.relicChance) {
            this.dropRelic();
        }
    }

    // Дроп артефакта
    dropArtifact() {
        this.addToLog(`✨ Найден редкий артефакт!`);
    }

    // Дроп реликвии
    dropRelic() {
        this.addToLog(`🌟 Найдена легендарная реликвия!`);
    }

    // Побег из боя
    attemptEscapeFromBattle() {
        const stats = this.calculateHeroStats(this.currentHero);
        const escapeRoll = this.rollDice(stats.skills.escape, 10);
        
        if (escapeRoll.success) {
            this.addBattleLog({
                message: `🏃 Успешный побег из боя!`,
                type: 'escape'
            });
            this.battleActive = false;
            this.completeEncounter();
        } else {
            this.addBattleLog({
                message: `❌ Не удалось сбежать! Монстр атакует`,
                type: 'escape-failed'
            });
            const monsterDamage = Math.max(1, this.currentMonster.damage - stats.armor);
            this.currentHero.currentHealth -= monsterDamage;
            
            if (this.currentHero.currentHealth <= 0) {
                this.endBattle(false);
            } else {
                this.saveGame();
                this.renderBattleScreen();
            }
        }
    }

    // ========== КОНЕЦ СИСТЕМЫ БОЯ ==========

    // Попытка скрыться
    attemptStealth() {
        const stats = this.calculateHeroStats(this.currentHero);
        const stealthRoll = this.rollDice(stats.skills.stealth, 8);
        
        if (stealthRoll.success) {
            this.addToLog(`✅ Успешно скрылись от ${this.currentMonster.name}!`);
        } else {
            this.addToLog(`❌ Не удалось скрыться! Монстр вас заметил`);
        }
        
        this.completeEncounter();
    }

    // Попытка побега
    attemptEscape() {
        const stats = this.calculateHeroStats(this.currentHero);
        const escapeRoll = this.rollDice(stats.skills.escape, 10);
        
        if (escapeRoll.success) {
            this.addToLog(`✅ Успешно сбежали от ${this.currentMonster.name}!`);
        } else {
            this.addToLog(`❌ Не удалось сбежать! Придётся сражаться`);
            this.startBattle();
            return;
        }
        
        this.completeEncounter();
    }

    // Бросок кубиков
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

    // Завершение встречи
    completeEncounter() {
        this.currentMonster = null;
        this.selectedMovement = null;
        
        const container = document.getElementById('app');
        const monsterActions = container.querySelector('.monster-actions');
        if (monsterActions) {
            monsterActions.remove();
        }
        
        this.addToLog(`🏁 Встреча завершена`);
        this.saveGame();
        setTimeout(() => {
            this.renderHeroScreen();
        }, 2000);
    }

    // Показать награду
    showReward(amount) {
        this.showReward = true;
        this.lastReward = amount;
        this.renderHeroScreen();
    }

    // Скрыть награду
    hideReward() {
        this.showReward = false;
        this.lastReward = 0;
        
        const container = document.getElementById('app');
        const monsterActions = container.querySelector('.monster-actions');
        if (monsterActions) {
            monsterActions.remove();
        }
        
        this.renderHeroScreen();
    }

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
                        <span>💰 Купить: ${item.price}</span>
                        <span>💸 Продать: ${item.sellPrice}</span>
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

    // Покупка предмета
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

    // Продать предмет
    sellItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        if (!this.currentHero.inventory.includes(itemId)) {
            this.addToLog(`❌ Предмет ${item.name} не найден в инвентаре`);
            return;
        }

        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);
        this.currentHero.gold += item.sellPrice;
        
        if (this.currentHero.equipment.main_hand === itemId) {
            this.currentHero.equipment.main_hand = null;
        }
        if (this.currentHero.equipment.chest === itemId) {
            this.currentHero.equipment.chest = null;
        }

        this.addToLog(`💰 Продано: ${item.name} за ${item.sellPrice} золота`);
        this.saveGame();
        this.showMerchant();
    }

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
                        <img src="${item.image}" alt="${item.name}">
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

    // Экипировать предмет
    equipItem(itemId) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return;

        if (item.type === 'potion') {
            this.usePotion(item);
            return;
        }

        const currentEquipped = this.currentHero.equipment[item.slot];
        if (currentEquipped) {
            if (!this.currentHero.inventory.includes(currentEquipped)) {
                this.currentHero.inventory.push(currentEquipped);
            }
        }

        this.currentHero.equipment[item.slot] = itemId;
        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);

        this.addToLog(`🎯 Надето: ${item.name}`);
        this.saveGame();
        this.renderHeroScreen();
    }

    // Использовать зелье
    usePotion(item) {
        if (item.type !== 'potion') return;

        if (item.heal) {
            this.currentHero.baseHealth += item.heal;
            this.addToLog(`❤️ Использовано: ${item.name} (+${item.heal} здоровья)`);
        }

        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== item.id);
        
        this.saveGame();
        this.showInventory();
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

    // Добавить запись в журнал
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

    // Форматирование бонуса
    formatBonus(bonus) {
        if (!bonus || bonus.type === 'none') return 'Нет бонуса';
        
        const bonusNames = {
            'health_mult': '+% к здоровью',
            'damage_mult': '+% к урону', 
            'armor_mult': '+% к броне',
            'gold_mult': '+% к золоту',
            'escape_bonus': 'Побег +',
            'stealth_bonus': 'Скрытность +',
            'luck_bonus': 'Удача +',
            'survival_bonus': 'Выживание +'
        };

        const value = bonus.type.includes('_mult') ? 
            Math.round(bonus.value * 100) : bonus.value;
            
        return bonusNames[bonus.type] ? 
            `${bonusNames[bonus.type]}${value}${bonus.type.includes('_mult') ? '%' : ''}` : 
            `Бонус: ${value}`;
    }

    // Сохранение игры
    saveGame() {
        if (this.currentHero) {
            localStorage.setItem('heroGameSave', JSON.stringify({
                currentHeroId: this.currentHero.id,
                heroes: this.heroes,
                currentMap: this.currentMap,
                currentLocation: this.currentLocation,
                lastHealthUpdate: this.lastHealthUpdate,
                globalInventory: this.globalInventory
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

// Создание экземпляра игры
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new HeroGame();
});
