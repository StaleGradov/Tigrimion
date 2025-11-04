// ========== МОДУЛЬ 1: ОСНОВНОЙ КЛАСС И ИНИЦИАЛИЗАЦИЯ ==========
// ========== МОДУЛЬ 1: ОСНОВНОЙ КЛАСС И ИНИЦИАЛИЗАЦИЯ ==========
class HeroGame {
    constructor() {
        // Массивы данных игры
        this.heroes = [];        // Список всех героев
        this.items = [];         // Список всех предметов
        this.monsters = [];      // Список всех монстров
        
        // УДАЛЕНО: maps и locations
        // this.maps = [];       // УДАЛЕНО
        // this.locations = [];  // УДАЛЕНО
        
        // Флаги отображения
        this.showReward = false;         // Показывать ли награду
        this.lastReward = 0;             // Последняя полученная награда
        this.currentHero = null;         // Текущий выбранный герой
        this.currentScreen = 'hero-select'; // Текущий экран игры
        
        // УДАЛЕНО: текущие карта, локация и связанные системы
        // this.currentMap = null;       // УДАЛЕНО
        // this.currentLocation = null;  // УДАЛЕНО
        // this.locationProgress = {};   // УДАЛЕНО
        // this.monsterKillCount = {};   // УДАЛЕНО
        
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
        };
        
        // УДАЛЕНО: видео для карт и локаций
        // this.videos = { ... };  // УДАЛЕНО
        
        // Флаги показа видео вместо изображений
        this.showVideo = {
            hero: false      // Показывать видео героя
        };
        
        // Запуск инициализации игры
        this.init();
    }

    // ========== МОДУЛЬ 1.2: ОСНОВНОЙ МЕТОД ИНИЦИАЛИЗАЦИИ ==========
    async init() {
        await this.loadGameData();    // Загрузка всех данных игры
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
}



// ========== МОДУЛЬ 2: ИНИЦИАЛИЗАЦИЯ И ЗАГРУЗКА ДАННЫХ ==========

// ========== МОДУЛЬ 2.1: ЗАГРУЗКА JSON ФАЙЛА ==========
HeroGame.prototype.loadJSON = async function(filePath) {
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
};

// ========== МОДУЛЬ 2.2: ЗАГРУЗКА ВСЕХ ДАННЫХ ИГРЫ ==========
HeroGame.prototype.loadGameData = async function() {
    try {
        // Загружаем только героев, монстров и предметы
        const [heroes, enemies, items] = await Promise.all([
            this.loadJSON('data/heroes.json'),
            this.loadJSON('data/enemies.json'),
            this.loadJSON('data/items.json')
        ]);

        // Заполнение данных игры
        this.heroes = heroes || [];
        this.monsters = enemies || [];
        this.items = items || [];

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
            items: this.items.length
        });

    } catch (error) {
        console.error('❌ Критическая ошибка загрузки данных:', error);
        this.createFallbackData();
    }
};

// ========== МОДУЛЬ 2.3: СОЗДАНИЕ ТЕСТОВЫХ ДАННЫХ ==========
HeroGame.prototype.createFallbackData = function() {
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
    for (let i = 1; i <= 20; i++) {
        this.monsters.push({
            id: i,
            name: `Монстр ${i}`,
            image: "images/monsters/monster1.jpg",
            description: `Монстр уровня ${Math.ceil(i/5)}`,
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
};

// ========== МОДУЛЬ 3: СИСТЕМА БОНУСОВ, СЕТОВ И ХАРАКТЕРИСТИК ==========

// ========== МОДУЛЬ 3.1: ПОЛУЧЕНИЕ ВСЕХ ДОСТУПНЫХ БОНУСОВ ==========
HeroGame.prototype.getBonuses = function() {
    return {
        races: {
            elf: { type: "damage_mult", value: 0.2, name: "Эльф", description: "Урон +20%", source: "race" },
            halfling: { type: "crit_chance", value: 0.2, name: "Полурослик", description: "20% шанс двойного урона", source: "race" },
            human: { type: "gold_mult", value: 0.3, name: "Человек", description: "+30% золота за противника", source: "race" },
            laitar: { type: "vampirism", value: 0.05, name: "Лайтар", description: "5% урона восстанавливает здоровье", source: "race" },
            ork: { type: "health_regen_mult", value: 0.3, name: "Орк", description: "+30% к регенерации здоровья", source: "race" },
            dwarf: { type: "health_mult", value: 0.3, name: "Гном", description: "+30% к здоровью", source: "race" },
            dragon: { type: "armor_mult", value: 0.15, name: "Дракон", description: "+15% к броне", source: "race" },
            fairy: { type: "armor_penetration", value: 0.25, name: "Фея", description: "25% шанс игнорировать броню", source: "race" }
        },
        classes: {
            hunter: { type: "armor_penetration", value: 0.25, name: "Охотник", description: "25% шанс игнорировать броню", source: "class" },
            warrior: { type: "armor_mult", value: 0.15, name: "Воин", description: "+15% к броне", source: "class" },
            bounty_hunter: { type: "crit_chance", value: 0.2, name: "Охотник за головами", description: "20% шанс двойного урона", source: "class" },
            merchant: { type: "gold_mult", value: 0.3, name: "Торговец", description: "+30% золота за противника", source: "class" },
            thief: { type: "gold_mult", value: 0.3, name: "Вор", description: "+30% золота за противника", source: "class" },
            fighter: { type: "health_regen_mult", value: 0.3, name: "Кулачный боец", description: "+30% к регенерации", source: "class" },
            antiquarian: { type: "gold_mult", value: 0.3, name: "Искатель древностей", description: "+30% золота за противника", source: "class" },
            death_mage: { type: "vampirism", value: 0.05, name: "Волхв смерти", description: "5% урона восстанавливает здоровье", source: "class" },
            sorcerer: { type: "damage_mult", value: 0.2, name: "Колдун", description: "Урон +20%", source: "class" },
            archer: { type: "crit_chance", value: 0.2, name: "Лучник", description: "20% шанс двойного урона", source: "class" },
            healer: { type: "health_mult", value: 0.3, name: "Знахарь", description: "+30% к здоровью", source: "class" },
            gladiator: { type: "damage_mult", value: 0.2, name: "Гладиатор", description: "Урон +20%", source: "class" },
            blacksmith: { type: "armor_mult", value: 0.15, name: "Кузнец", description: "+15% к броне", source: "class" }
        },
        sagas: {
            golden_egg: { type: "health_mult", value: 0.3, name: "Золотое Яйцо", description: "+30% к здоровью", source: "saga" },
            vulkanor: { type: "armor_penetration", value: 0.25, name: "Вулканор", description: "25% шанс игнорировать броню", source: "saga" },
            well: { type: "gold_mult", value: 0.3, name: "Колодец", description: "+30% золота за противника", source: "saga" },
            pets: { type: "damage_mult", value: 0.2, name: "Питомец", description: "Урон +20%", source: "saga" },
            following_sun: { type: "health_regen_mult", value: 0.3, name: "Вслед за солнцем", description: "+30% к регенерации", source: "saga" },
            vampire_crown: { type: "vampirism", value: 0.05, name: "Корона короля вампиров", description: "5% урона восстанавливает здоровье", source: "saga" },
            tiger_eye: { type: "crit_chance", value: 0.2, name: "Желтый Глаз тигра", description: "20% шанс двойного урона", source: "saga" },
            sky_phenomena: { type: "armor_mult", value: 0.15, name: "Небесные явления", description: "+15% к броне", source: "saga" }
        }
    };
};

// ========== МОДУЛЬ 3.2: КОНФИГУРАЦИЯ СЕТОВ ПРЕДМЕТОВ ==========
HeroGame.prototype.getItemSetConfig = function() {
    return {
        "set_beginner": {
            name: "Крестьянина Арканиума",
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.05 },
            description: "Комплект из 6 вещей даст +5% к урону"
        },
        "set_warrior": {
            name: "Ополченца Арканиума", 
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.1 },
            description: "Комплект из 6 вещей даст +10% к урону"
        },
        "set_guardian": {
            name: "Милитанта Арканиума",
            requiredPieces: 6, 
            bonus: { type: "damage_mult", value: 0.15 },
            description: "Комплект из 6 вещей даст +15% к урону"
        },
        "set_hunter": {
            name: "Ветерана Арканиума",
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.2 },
            description: "Комплект из 6 вещей даст +20% к урону"
        },
        "set_complete": {
            name: "Командира ополчения Арканиума",
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.25 },
            description: "Комплект из 6 вещей даст +25% к урону"
        },
          "set_king": {
            name: "Стратегоса Арканиума",
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.3 },
            description: "Комплект из 6 вещей даст +30% к урону"
        },
         "set_crit1": {
            name: "Охотника Арканиума",
            requiredPieces: 6,
            bonus: { type: "crit_chance", value: 0.05 },
            description: "Комплект из 6 вещей даст +5% к шансу критического удара(наносящего х2 урона)"
        },
     "set_crit2": {
            name: "Разведчика Арканиума",
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.1 },
            description: "Комплект из 6 вещей даст +10% к шансу критического удара(наносящего х2 урона)"
        },
     "set_crit3": {
            name: "Лучника Арканиума",
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.15 },
            description: "Комплект из 6 вещей даст +15% к шансу критического удара(наносящего х2 урона)"
        },
     "set_crit4": {
            name: "Элитного стрелка Арканиума",
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.2 },
            description: "Комплект из 6 вещей даст +20% к шансу критического удара(наносящего х2 урона)"
        },
     "set_crit5": {
            name: "Командира лучников Арканиума",
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.25 },
            description: "Комплект из 6 вещей даст +25% к шансу критического удара(наносящего х2 урона)"
        },
     "set_crit6": {
            name: "Легендарного стрелка Арканиума",
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.3 },
            description: "Комплект из 6 вещей даст +30% к шансу критического удара(наносящего х2 урона)"
        },
             "set_penetration1": {
            name: "Стрелка Арканиума",
            requiredPieces: 6,
            bonus: { type: "armor_penetration", value: 0.06 },
            description: "Комплект из 6 вещей даст +6% к шансу игрорирования брони соперника"
        },
         "set_penetration2": {
            name: "Следопыта Арканиума",
            requiredPieces: 6,
            bonus: { type: "armor_penetration", value: 0.12 },
            description: "Комплект из 6 вещей даст +12% к шансу игрорирования брони соперника"
        },
         "set_penetration3": {
            name: "Охотника на монстров Арканиума",
            requiredPieces: 6,
            bonus: { type: "armor_penetration", value: 0.18 },
            description: "Комплект из 6 вещей даст +18% к шансу игрорирования брони соперника"
        },
         "set_penetration4": {
            name: "Наемного убийцы Магнатов Арканиума",
            requiredPieces: 6,
            bonus: { type: "armor_penetration", value: 0.24 },
            description: "Комплект из 6 вещей даст +24% к шансу игрорирования брони соперника"
        },
         "set_penetration5": {
            name: "Командира арбалетчиков Арканиума",
            requiredPieces: 6,
            bonus: { type: "armor_penetration", value: 0.3 },
            description: "Комплект из 6 вещей даст +30% к шансу игрорирования брони соперника"
        },
         "set_penetration6": {
            name: "Мастера над арбалетами Арканиума",
            requiredPieces: 6,
            bonus: { type: "armor_penetration", value: 0.36 },
            description: "Комплект из 6 вещей даст +36% к шансу игрорирования брони соперника"
        },
           "set_rich1": {
            name: "Сборщика трофеев Арканиума",
            requiredPieces: 6,
            bonus: { type: "gold_mult", value: 0.05 },
            description: "Комплект из 6 вещей даст +5% к награде в золоте за убийство монстра"
        },
           "set_rich2": {
            name: "Охотник на редких животных Арканиума",
            requiredPieces: 6,
            bonus: { type: "gold_mult", value: 0.1 },
            description: "Комплект из 6 вещей даст +10% к награде в золоте за убийство монстра"
        },
           "set_rich3": {
            name: "Профессионального истребителя опасных существ Арканиума",
            requiredPieces: 6,
            bonus: { type: "gold_mult", value: 0.15 },
            description: "Комплект из 6 вещей даст +15% к награде в золоте за убийство монстра"
        },
           "set_rich4": {
            name: "Коллекционера Арканиума",
            requiredPieces: 6,
            bonus: { type: "gold_mult", value: 0.2 },
            description: "Комплект из 6 вещей даст +20% к награде в золоте за убийство монстра"
        },
           "set_rich5": {
            name: "Ловца королевских тварей Арканиума",
            requiredPieces: 6,
            bonus: { type: "gold_mult", value: 0.25 },
            description: "Комплект из 6 вещей даст +25% к награде в золоте за убийство монстра"
        },
           "set_rich6": {
            name: "Легендарного зверолова Арканиума",
            requiredPieces: 6,
            bonus: { type: "gold_mult", value: 0.3 },
            description: "Комплект из 6 вещей даст +30% к награде в золоте за убийство монстра"
        },
            "set_vampire1": {
            name: "Убийцы Арканиума",
            requiredPieces: 6,
            bonus: { type: "vampirism", value: 0.01 },
            description: "Комплект из 6 вещей даст +1% к вампиризму"
        },
           "set_vampire2": {
            name: "Наемного убийцы Арканиума",
            requiredPieces: 6,
            bonus: { type: "vampirism", value: 0.02 },
            description: "Комплект из 6 вещей даст +2% к вампиризму"
        },
            "set_vampire3": {
            name: "Темного стража Арканиума",
            requiredPieces: 6,
            bonus: { type: "vampirism", value: 0.03 },
            description: "Комплект из 6 вещей даст +3% к вампиризму"
        },
               "set_vampire4": {
            name: "Легендарного зверолова Арканиума",
            requiredPieces: 6,
            bonus: { type: "vampirism", value: 0.04 },
            description: "Комплект из 6 вещей даст +4% к вампиризму"
        },
               "set_vampire5": {
            name: "Охотника на вампиров, ставшего вампиром",
            requiredPieces: 6,
            bonus: { type: "vampirism", value: 0.05 },
            description: "Комплект из 6 вещей даст +5% к вампиризму"
        },
               "set_vampire6": {
            name: "Лорда вампиров...Арканиума? Откуда у лорда вампиров могли взяться доспехи из костей драконов..? Неужели драконы были здесь во времена вампиров?  ",
            requiredPieces: 6,
            bonus: { type: "vampirism", value: 0.06 },
            description: "Комплект из 6 вещей даст +6% к вампиризму"
        },
            "set_regen1": {
            name: "Грабителя Арканиума",
            requiredPieces: 6,
            bonus: { type: "health_regen_mult", value: 0.5 },
            description: "Комплект из 6 вещей даст +5% к регенерации здоровья"
        },
            "set_regen2": {
            name: "Бандита Арканиума",
            requiredPieces: 6,
            bonus: { type: "health_regen_mult", value: 0.1 },
            description: "Комплект из 6 вещей даст +10% к регенерации здоровья"
        },
            "set_regen3": {
            name: "Опытного разбойника",
            requiredPieces: 6,
            bonus: { type: "health_regen_mult", value: 0.2 },
            description: "Комплект из 6 вещей даст +20% к регенерации здоровья"
        },
                   "set_regen4": {
            name: "Вожака банды Арканиума",
            requiredPieces: 6,
            bonus: { type: "health_regen_mult", value: 0.4 },
            description: "Комплект из 6 вещей даст +40% к регенерации здоровьяу"
        },
                   "set_regen5": {
            name: "Берсерка, лучшего бойца воровской гильдии Арканиума",
            requiredPieces: 6,
            bonus: { type: "health_regen_mult", value: 0.8 },
            description: "Комплект из 6 вещей даст +80% к регенерации здоровья"
        },
                   "set_regen6": {
            name: "Короля воров Арканиума",
            requiredPieces: 6,
            bonus: { type: "health_regen_mult", value: 1.6 },
            description: "Комплект из 6 вещей даст +160% к регенерации здоровья"
        }
    };
};

// ========== МОДУЛЬ 3.3: ПОЛУЧЕНИЕ АКТИВНЫХ СЕТОВ ==========
HeroGame.prototype.getActiveSetBonuses = function(hero) {
    hero = hero || this.currentHero;
    if (!hero) return [];
    
    const equippedItems = Object.values(hero.equipment)
        .filter(itemId => itemId !== null)
        .map(itemId => this.items.find(item => item.id === itemId))
        .filter(item => item !== undefined);
    
    // Группируем предметы по сетам
    const setCounts = {};
    equippedItems.forEach(item => {
        if (item.setName) {
            setCounts[item.setName] = (setCounts[item.setName] || 0) + 1;
        }
    });
    
    const activeSetBonuses = [];
    
    // Проверяем условия для каждого сета
    Object.keys(setCounts).forEach(setName => {
        const setConfig = this.getItemSetConfig()[setName];
        if (setConfig && setCounts[setName] >= setConfig.requiredPieces) {
            activeSetBonuses.push({
                setName: setName,
                pieces: setCounts[setName],
                bonus: setConfig.bonus,
                description: setConfig.description
            });
        }
    });
    
    return activeSetBonuses;
};

// ========== МОДУЛЬ 3.4: ПОЛУЧЕНИЕ ВСЕХ АКТИВНЫХ БОНУСОВ ==========
HeroGame.prototype.getAllActiveBonuses = function(hero) {
    hero = hero || this.currentHero;
    if (!hero) return { race: [], class: [], saga: [], equipment: [], sets: [] };
    
    const bonuses = this.getBonuses();
    const activeBonuses = {
        race: [],
        class: [],
        saga: [], 
        equipment: [],
        sets: [] // НОВОЕ: бонусы от сетов
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
    
    // НОВОЕ: Бонусы от сетов
    const setBonuses = this.getActiveSetBonuses(hero);
    setBonuses.forEach(setBonus => {
        activeBonuses.sets.push({
            ...setBonus.bonus,
            source: "set",
            setName: setBonus.setName,
            pieces: setBonus.pieces,
            description: setBonus.description
        });
    });
    
    return activeBonuses;
};

// ========== МОДУЛЬ 3.5: РАСЧЕТ СУММАРНЫХ БОНУСОВ ==========
HeroGame.prototype.calculateTotalBonuses = function(hero) {
    hero = hero || this.currentHero;
    const activeBonuses = this.getAllActiveBonuses(hero);
    const setBonuses = this.getActiveSetBonuses(hero);
    
    const totals = {
        health_mult: 0,
        damage_mult: 0, 
        armor_mult: 0,
        gold_mult: 0,
        health_regen_mult: 0,
        crit_chance: 0,
        armor_penetration: 0,
        vampirism: 0,
        all_stats_mult: 0
    };
    
    // Суммирование обычных бонусов
    Object.values(activeBonuses).forEach(bonusGroup => {
        bonusGroup.forEach(bonus => {
            if (totals.hasOwnProperty(bonus.type)) {
                totals[bonus.type] += bonus.value;
            }
        });
    });
    
    // Добавление бонусов от сетов
    setBonuses.forEach(setBonus => {
        if (setBonus.bonus && totals.hasOwnProperty(setBonus.bonus.type)) {
            totals[setBonus.bonus.type] += setBonus.bonus.value;
        }
    });
    
    // Применение бонуса "все характеристики" к отдельным статам
    if (totals.all_stats_mult > 0) {
        totals.health_mult += totals.all_stats_mult;
        totals.damage_mult += totals.all_stats_mult;
        totals.armor_mult += totals.all_stats_mult;
        totals.health_regen_mult += totals.all_stats_mult;
    }
    
    return totals;
};

// ========== МОДУЛЬ 4: СИСТЕМА УРОВНЕЙ И ОПЫТА ==========

// ========== МОДУЛЬ 4.1: ТРЕБОВАНИЯ ОПЫТА ДЛЯ УРОВНЕЙ ==========
HeroGame.prototype.getLevelRequirements = function() {
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
};

// ========== МОДУЛЬ 4.2: ДОБАВЛЕНИЕ ОПЫТА ГЕРОЮ ==========
HeroGame.prototype.addExperience = function(amount) {
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
};

// ========== МОДУЛЬ 4.3: ПОВЫШЕНИЕ УРОВНЯ ГЕРОЯ ==========
HeroGame.prototype.levelUp = function(newLevel) {
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
};

// ========== МОДУЛЬ 4.4: ПРОВЕРКА РАЗБЛОКИРОВКИ ГЕРОЕВ ==========
HeroGame.prototype.checkHeroUnlocks = function() {
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
};

// ========== МОДУЛЬ 5: РАСЧЕТ ХАРАКТЕРИСТИК С УЧЕТОМ СЕТОВ ==========

// ========== МОДУЛЬ 5.1: РАСЧЕТ МАКСИМАЛЬНОГО ЗДОРОВЬЯ ==========
HeroGame.prototype.calculateMaxHealth = function(hero) {
    hero = hero || this.currentHero;
    if (!hero) return 0;
    
    const totals = this.calculateTotalBonuses(hero);
    const levelMultiplier = 1 + (hero.level - 1) * 0.1;
    let health = hero.baseHealth * levelMultiplier;
    health += hero.baseHealth * totals.health_mult;
    
    // Добавление ФИКСИРОВАННЫХ характеристик от экипировки
    Object.values(hero.equipment).forEach(itemId => {
        if (itemId) {
            const item = this.items.find(item => item.id === itemId);
            if (item) {
                health += item.fixed_health || 0;
            }
        }
    });
    
    return Math.round(health);
};

// ========== МОДУЛЬ 5.2: РАСЧЕТ ВСЕХ ХАРАКТЕРИСТИК ГЕРОЯ ==========
HeroGame.prototype.calculateHeroStats = function(hero) {
    hero = hero || this.currentHero;
    if (!hero) return {};
    
    const totals = this.calculateTotalBonuses(hero);
    const levelMultiplier = 1 + (hero.level - 1) * 0.1;
    
    // Базовые характеристики (уровень)
    let baseHealth = hero.baseHealth * levelMultiplier;
    let baseDamage = hero.baseDamage * levelMultiplier; 
    let baseArmor = hero.baseArmor * levelMultiplier;
    
    // Применение процентных бонусов
    let health = baseHealth + (hero.baseHealth * totals.health_mult);
    let damage = baseDamage + (hero.baseDamage * totals.damage_mult);
    let armor = baseArmor + (hero.baseArmor * totals.armor_mult);
    
    // Добавление ФИКСИРОВАННЫХ характеристик от экипировки
    Object.values(hero.equipment).forEach(itemId => {
        if (itemId) {
            const item = this.items.find(item => item.id === itemId);
            if (item) {
                damage += item.fixed_damage || 0;
                armor += item.fixed_armor || 0;
                health += item.fixed_health || 0;
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
        baseArmor: Math.round(baseArmor),
        // НОВОЕ: информация о сетах
        activeSets: this.getActiveSetBonuses(hero)
    };
};

// ========== МОДУЛЬ 6: СИСТЕМА БОЯ С ВЫНОСЛИВОСТЬЮ ==========

// ========== МОДУЛЬ 6.1: НАЧАТЬ БОЙ ==========
HeroGame.prototype.startBattle = function() {
    if (!this.currentMonster || this.battleActive) return;
    
    this.battleActive = true;
    this.battleRound = 0;
    this.battleLog = [];
    this.currentHero.stamina = 0; // Сброс выносливости в начале боя
    this.currentMonster.currentHealth = this.currentMonster.health;
    
    this.addBattleLog({
        message: `⚔️ Бой начался! ${this.currentHero.name} против ${this.currentMonster.name}`,
        type: 'battle-start'
    });
    
    this.renderHeroScreen();
};

// ========== МОДУЛЬ 6.2: ОСНОВНАЯ АТАКА В БОЮ ==========
HeroGame.prototype.battleAttack = function() {
    if (!this.battleActive || !this.currentMonster) return;
    
    this.battleRound++;
    const stats = this.calculateHeroStats(this.currentHero);
    const totals = this.calculateTotalBonuses();
    
    // Расчет количества атак на основе выносливости
    const attackCount = 1 + (this.currentHero.stamina || 0);
    
    let totalHeroDamage = 0;
    
    // Выполняем все атаки
    for (let i = 0; i < attackCount; i++) {
        const heroAttack = this.calculateAttackDamage(true);
        let monsterDamageReduction = heroAttack.isArmorPenetrated ? 0 : this.currentMonster.armor;
        const heroDamage = Math.max(1, heroAttack.damage - monsterDamageReduction);
        
        this.currentMonster.currentHealth -= heroDamage;
        totalHeroDamage += heroDamage;
        
        this.addBattleLog({
            message: `🗡️ ${this.currentHero.name} наносит ${heroDamage} урона!` + 
                     (heroAttack.isCritical ? ' 💥' : '') +
                     (heroAttack.isArmorPenetrated ? ' ⚡' : '') +
                     (attackCount > 1 ? ` (${i + 1}/${attackCount})` : ''),
            type: 'hero-attack'
        });
        
        // Проверка смерти монстра после каждой атаки
        if (this.currentMonster.currentHealth <= 0) {
            break;
        }
    }
    
    // Вампиризм - восстановление здоровья от общего урона
    if (totals.vampirism > 0 && totalHeroDamage > 0) {
        const healAmount = Math.round(totalHeroDamage * totals.vampirism);
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
    
    // Сброс выносливости после атаки
    this.currentHero.stamina = 0;
    
    // Проверка смерти героя
    if (this.currentHero.currentHealth <= 0) {
        this.endBattle(false);
        return;
    }
    
    this.saveGame();
    this.renderHeroScreen();
};

// ========== МОДУЛЬ 6.3: БЛОКИРОВАНИЕ АТАКИ ==========
HeroGame.prototype.battleBlock = function() {
    if (!this.battleActive || !this.currentMonster) return;
    
    this.battleRound++;
    const stats = this.calculateHeroStats(this.currentHero);
    
    // Расчет снижения урона в зависимости от экипировки
    let damageReduction = 0.5; // 50% по умолчанию для двуручного оружия/дуалов
    
    const mainHandItem = this.currentHero.equipment.main_hand ? 
        this.items.find(item => item.id === this.currentHero.equipment.main_hand) : null;
    const offHandItem = this.currentHero.equipment.off_hand ? 
        this.items.find(item => item.id === this.currentHero.equipment.off_hand) : null;
    
    // Проверяем, экипирован ли щит
    const hasShield = offHandItem && offHandItem.weaponType === 'shield';
    
    if (hasShield) {
        damageReduction = 0.75; // 75% снижение урона со щитом
    }
    
    // Атака монстра с учетом блокирования
    const baseMonsterDamage = Math.max(1, this.currentMonster.damage - stats.armor);
    const reducedDamage = Math.max(1, Math.floor(baseMonsterDamage * (1 - damageReduction)));
    this.updateHealth(-reducedDamage);
    
    // Накопление выносливости
    this.currentHero.stamina = (this.currentHero.stamina || 0) + 1;
    
    this.addBattleLog({
        message: `🛡️ ${this.currentHero.name} блокирует атаку! Получено ${reducedDamage} урона (было бы: ${baseMonsterDamage})` +
                 ` | Выносливость: ${this.currentHero.stamina}`,
        type: 'block'
    });
    
    // Проверка смерти героя
    if (this.currentHero.currentHealth <= 0) {
        this.endBattle(false);
        return;
    }
    
    this.saveGame();
    this.renderHeroScreen();
};

// ========== МОДУЛЬ 6.4: РАСЧЕТ УРОНА АТАКИ ==========
HeroGame.prototype.calculateAttackDamage = function(isHeroAttack) {
    const attacker = isHeroAttack ? this.currentHero : this.currentMonster;
    const totals = this.calculateTotalBonuses();
    
    let baseDamage = isHeroAttack ? 
        this.calculateHeroStats().damage : 
        this.currentMonster.damage;
    
    // Критический удар
    const isCritical = Math.random() < totals.crit_chance;
    if (isCritical) {
        baseDamage = Math.floor(baseDamage * 2);
    }
    
    // Игнорирование брони
    const isArmorPenetrated = Math.random() < totals.armor_penetration;
    
    return {
        damage: baseDamage,
        isCritical: isCritical,
        isArmorPenetrated: isArmorPenetrated
    };
};

// ========== МОДУЛЬ 6.5: ЗАВЕРШЕНИЕ БОЯ ==========
HeroGame.prototype.endBattle = function(victory) {
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
    this.currentHero.stamina = 0;
    
    this.saveGame();
    this.renderHeroScreen();
};

// ========== МОДУЛЬ 6.6: ПРОДОЛЖИТЬ ПОСЛЕ БОЯ ==========
HeroGame.prototype.continueAfterBattle = function() {
    this.battleResult = null;
    this.renderHeroScreen();
};

// УДАЛЕНЫ ВСЕ МЕТОДЫ СИСТЕМЫ ЛОКАЦИЙ:
// HeroGame.prototype.updateLocationProgress = function() { ... } // УДАЛЕНО
// HeroGame.prototype.checkIfAllMonstersKilled = function() { ... } // УДАЛЕНО  
// HeroGame.prototype.completeLocation = function() { ... } // УДАЛЕНО
// HeroGame.prototype.getLocationName = function() { ... } // УДАЛЕНО

// ========== МОДУЛЬ 8: СИСТЕМА ЗДОРОВЬЯ И РЕГЕНЕРАЦИИ ==========

// ========== МОДУЛЬ 8.1: ПОЛУЧЕНИЕ ТЕКУЩЕГО ЗДОРОВЬЯ ДЛЯ ОТОБРАЖЕНИЯ ==========
HeroGame.prototype.getCurrentHealthForDisplay = function(hero) {
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
};

// ========== МОДУЛЬ 8.2: ОБНОВЛЕНИЕ ЗДОРОВЬЯ (ЛЕЧЕНИЕ/УРОН) ==========
HeroGame.prototype.updateHealth = function(change) {
    if (!this.currentHero) return;
    
    if (!this.currentHero.currentHealth) {
        this.currentHero.currentHealth = this.calculateMaxHealth();
    }
    
    this.currentHero.currentHealth += change;
    const maxHealth = this.calculateMaxHealth();
    this.currentHero.currentHealth = Math.max(0, Math.min(maxHealth, this.currentHero.currentHealth));
    this.lastHealthUpdate = Date.now();
    this.saveGame();
};

// ========== МОДУЛЬ 9: СИСТЕМА ОТОБРАЖЕНИЯ И ИНТЕРФЕЙСА ==========

// ========== МОДУЛЬ 9.1: ОТРИСОВКА ЭКРАНА ВЫБОРА ГЕРОЯ ==========
HeroGame.prototype.renderHeroSelect = function() {
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
};

// ========== МОДУЛЬ 9.2: ПОЛУЧЕНИЕ ИКОНКИ ДЛЯ БОНУСА ==========
HeroGame.prototype.getBonusIcon = function(bonusType) {
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
};

// ========== МОДУЛЬ 9.3: ВЫБОР ГЕРОЯ ==========
HeroGame.prototype.selectHero = function(heroId) {
    console.log('Попытка выбрать героя:', heroId);
    
    const hero = this.heroes.find(h => h.id === heroId);
    if (!hero) {
        console.error('Герой не найден:', heroId);
        return;
    }
    
    // Упрощенная проверка разблокировки
    const isUnlocked = hero.id === 1 || (hero.unlocked === true);
    if (!isUnlocked) {
        console.log('Герой заблокирован:', hero.name);
        alert('❌ Этот герой еще заблокирован!');
        return;
    }
    
    this.currentHero = hero;
    
    // Инициализируем здоровье если его нет
    if (!this.currentHero.currentHealth) {
        this.currentHero.currentHealth = this.calculateMaxHealth();
    }
    
    console.log('✅ Выбран герой:', this.currentHero.name);
    this.showScreen('main');
    this.renderHeroScreen();
    this.saveGame();
};

// ========== МОДУЛЬ 9.4: ПЕРЕКЛЮЧЕНИЕ ЭКРАНОВ ==========
HeroGame.prototype.showScreen = function(screenName) {
    this.currentScreen = screenName;
    
    if (this.healthInterval) {
        clearInterval(this.healthInterval);
        this.healthInterval = null;
    }
};
// ========== МОДУЛЬ 9.5: ЗАПУСК АНИМАЦИИ ЗДОРОВЬЯ ==========
HeroGame.prototype.startHealthAnimation = function() {
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
};
// ========== МОДУЛЬ 9.6: ОСНОВНОЙ РЕНДЕР ЭКРАНА ГЕРОЯ (ОБНОВЛЕННЫЙ) ==========
HeroGame.prototype.renderHeroScreen = function() {
    if (!this.currentHero) return;

    const stats = this.calculateHeroStats(this.currentHero);
    const bonuses = this.getBonuses();
    const activeBonuses = this.getAllActiveBonuses(this.currentHero);

    // Получение экипированных предметов
    const getEquippedItemWithRarity = (slot) => {
        const itemId = this.currentHero.equipment[slot];
        if (!itemId) return null;
        
        const item = this.items.find(item => item.id === itemId);
        if (!item) return null;
        
        return {
            item: item,
            rarity: item.rarity || 'common'
        };
    };

    const weaponMain = getEquippedItemWithRarity('main_hand');
    const weaponOff = getEquippedItemWithRarity('off_hand');
    const armorHelmet = getEquippedItemWithRarity('helmet');
    const armorChest = getEquippedItemWithRarity('chest');
    const armorGloves = getEquippedItemWithRarity('gloves');
    const armorLegs = getEquippedItemWithRarity('legs');
    const armorBoots = getEquippedItemWithRarity('boots');

    const nextLevelExp = this.getLevelRequirements()[this.currentHero.level + 1];
    const expProgress = nextLevelExp ? (this.currentHero.experience / nextLevelExp) * 100 : 100;
    const healthPercent = (stats.currentHealth / stats.maxHealth) * 100;

    // Фоновые изображения
    const heroBackground = this.currentHero.image;
    const heroVideo = this.heroVideos[this.currentHero.id];
    
    const monsterBackground = this.currentMonster ? this.currentMonster.image : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMWExYTJlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7QktGA0L7QtNC90YvQtSDQv9C10YDRjNC80LA8L3RleHQ+PC9zdmc+';
    
    // УДАЛЕНО: фоны карт и локаций
    const emptyBackground = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMTYyMTNlIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7QndC10YIg0L3QsCDQv9GA0L7QtNCw0LbQsCDQutCw0YDRgtCwPC90ZXh0Pjwvc3ZnPg==';

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
                        
                        <!-- Вся информация о герое остается здесь -->
                        ${this.renderHeroColumnContent(stats, activeBonuses, raceName, className, sagaName, healthPercent, expProgress, weaponMain, weaponOff, armorHelmet, armorChest, armorGloves, armorLegs, armorBoots)}
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

                <!-- Колонка карты (ПУСТАЯ) -->
                <div class="map-column" style="background-image: url('${emptyBackground}')">
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">🗺️ Карта</div>
                        ${this.renderEmptyMapColumn()}
                    </div>
                </div>

                <!-- Колонка локации (ПУСТАЯ) -->
                <div class="location-column" style="background-image: url('${emptyBackground}')">
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">📍 Локация</div>
                        ${this.renderEmptyLocationColumn()}
                    </div>
                </div>
            </div>

            <!-- Лог событий -->
            <div class="battle-log" id="battle-log"></div>
        </div>
    `;

    this.startHealthAnimation();
};

// ========== МОДУЛЬ 9.6.1: РЕНДЕР СОДЕРЖИМОГО КОЛОНКИ ГЕРОЯ ==========
HeroGame.prototype.renderHeroColumnContent = function(stats, activeBonuses, raceName, className, sagaName, healthPercent, expProgress, weaponMain, weaponOff, armorHelmet, armorChest, armorGloves, armorLegs, armorBoots) {
    return `
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
            
            <!-- Бонусы сетов -->
            ${activeBonuses.sets.length > 0 ? `
                <div class="bonus-source-group">
                    <div class="bonus-source-title">✨ Бонусы сетов</div>
                    <div class="bonus-display">
                        ${activeBonuses.sets.map(bonus => `
                            <div class="bonus-badge equipment-bonus" title="${bonus.description}">
                                ${this.getBonusIcon(bonus.type)} ${Math.round(bonus.value * 100)}%
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${activeBonuses.race.length === 0 && activeBonuses.class.length === 0 && 
              activeBonuses.saga.length === 0 && activeBonuses.equipment.length === 0 && 
              activeBonuses.sets.length === 0 ? `
                <div class="no-bonuses">Нет активных бонусов</div>
            ` : ''}
        </div>

        <!-- Секция экипировки -->
        <div class="equipment-section">
            <!-- Слоты экипировки -->
            <div class="equipment-slot weapon-slot main-hand ${weaponMain ? 'equipped' : 'empty'}" 
                 ${weaponMain ? `data-rarity="${weaponMain.rarity}"` : ''}
                 onclick="game.openInventoryFromSlot('main_hand')"
                 onmouseover="game.showEquipmentTooltip(event, 'main_hand')"
                 onmouseout="game.hideEquipmentTooltip()">
                <div class="equipment-icon">
                    ${weaponMain ? '<img src="' + weaponMain.item.image + '" alt="' + weaponMain.item.name + '">' : '⚔️'}
                </div>
            </div>
            
            <div class="equipment-slot weapon-slot off-hand ${weaponOff ? 'equipped' : 'empty'}" 
                 ${weaponOff ? `data-rarity="${weaponOff.rarity}"` : ''}
                 onclick="game.openInventoryFromSlot('off_hand')"
                 onmouseover="game.showEquipmentTooltip(event, 'off_hand')"
                 onmouseout="game.hideEquipmentTooltip()">
                <div class="equipment-icon">
                    ${weaponOff ? '<img src="' + weaponOff.item.image + '" alt="' + weaponOff.item.name + '">' : '🛡️'}
                </div>
            </div>
            
            <div class="equipment-slot armor-slot helmet-slot ${armorHelmet ? 'equipped' : 'empty'}" 
                 ${armorHelmet ? `data-rarity="${armorHelmet.rarity}"` : ''}
                 onclick="game.openInventoryFromSlot('helmet')"
                 onmouseover="game.showEquipmentTooltip(event, 'helmet')"
                 onmouseout="game.hideEquipmentTooltip()">
                <div class="equipment-icon">
                    ${armorHelmet ? '<img src="' + armorHelmet.item.image + '" alt="' + armorHelmet.item.name + '">' : '⛑️'}
                </div>
            </div>
            
            <div class="equipment-slot armor-slot chest-slot ${armorChest ? 'equipped' : 'empty'}" 
                 ${armorChest ? `data-rarity="${armorChest.rarity}"` : ''}
                 onclick="game.openInventoryFromSlot('chest')"
                 onmouseover="game.showEquipmentTooltip(event, 'chest')"
                 onmouseout="game.hideEquipmentTooltip()">
                <div class="equipment-icon">
                    ${armorChest ? '<img src="' + armorChest.item.image + '" alt="' + armorChest.item.name + '">' : '👕'}
                </div>
            </div>
            
            <div class="equipment-slot armor-slot gloves-slot ${armorGloves ? 'equipped' : 'empty'}" 
                 ${armorGloves ? `data-rarity="${armorGloves.rarity}"` : ''}
                 onclick="game.openInventoryFromSlot('gloves')"
                 onmouseover="game.showEquipmentTooltip(event, 'gloves')"
                 onmouseout="game.hideEquipmentTooltip()">
                <div class="equipment-icon">
                    ${armorGloves ? '<img src="' + armorGloves.item.image + '" alt="' + armorGloves.item.name + '">' : '🧤'}
                </div>
            </div>
            
            <div class="equipment-slot armor-slot legs-slot ${armorLegs ? 'equipped' : 'empty'}" 
                 ${armorLegs ? `data-rarity="${armorLegs.rarity}"` : ''}
                 onclick="game.openInventoryFromSlot('legs')"
                 onmouseover="game.showEquipmentTooltip(event, 'legs')"
                 onmouseout="game.hideEquipmentTooltip()">
                <div class="equipment-icon">
                    ${armorLegs ? '<img src="' + armorLegs.item.image + '" alt="' + armorLegs.item.name + '">' : '👖'}
                </div>
            </div>
            
            <div class="equipment-slot armor-slot boots-slot ${armorBoots ? 'equipped' : 'empty'}" 
                 ${armorBoots ? `data-rarity="${armorBoots.rarity}"` : ''}
                 onclick="game.openInventoryFromSlot('boots')"
                 onmouseover="game.showEquipmentTooltip(event, 'boots')"
                 onmouseout="game.hideEquipmentTooltip()">
                <div class="equipment-icon">
                    ${armorBoots ? '<img src="' + armorBoots.item.image + '" alt="' + armorBoots.item.name + '">' : '👢'}
                </div>
            </div>
            
            <div class="equipment-slot empty" onclick="game.openInventoryFromSlot('inventory')" title="Открыть инвентарь">
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
    `;
};

// ========== МОДУЛЬ 9.6.2: РЕНДЕР ПУСТОЙ КОЛОНКИ КАРТЫ ==========
HeroGame.prototype.renderEmptyMapColumn = function() {
    return `
        <div class="map-info" style="text-align: center; padding: 20px;">
            <h4>Система карт</h4>
            <p>В разработке</p>
            <div style="margin-top: 20px; opacity: 0.7;">
                <p>🗺️ Карты будут добавлены в будущем обновлении</p>
            </div>
        </div>
    `;
};

// ========== МОДУЛЬ 9.6.3: РЕНДЕР ПУСТОЙ КОЛОНКИ ЛОКАЦИИ ==========
HeroGame.prototype.renderEmptyLocationColumn = function() {
    return `
        <div class="location-info" style="text-align: center; padding: 20px;">
            <h4>Система локаций</h4>
            <p>В разработке</p>
            <div style="margin-top: 20px; opacity: 0.7;">
                <p>📍 Локации будут добавлены в будущем обновлении</p>
            </div>
        </div>
    `;
};

// ========== МОДУЛЬ 9.7: ПОКАЗАТЬ ПОДСКАЗКУ ДЛЯ ЭКИПИРОВКИ ==========
HeroGame.prototype.showEquipmentTooltip = function(event, slot) {
    // Удаляем существующие подсказки
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
            const rarityColors = {
                'common': '#9ca3af',
                'uncommon': '#4cc9f0', 
                'rare': '#a855f7',
                'epic': '#f59e0b',
                'legendary': '#ffd700'
            };
            
            const rarityNames = {
                'common': 'Обычный',
                'uncommon': 'Необычный',
                'rare': 'Редкий',
                'epic': 'Эпический',
                'legendary': 'Легендарный'
            };
            
            const frameColor = rarityColors[item.rarity] || '#9ca3af';
            const rarityName = rarityNames[item.rarity] || 'Обычный';
            
            tooltipContent = `
                <div class="slot-name">${slotNames[slot]}</div>
                <div class="item-stats">
                    <div><strong style="color: ${frameColor}">${item.name}</strong></div>
                    <div style="color: ${frameColor}; font-size: 0.8em; margin-bottom: 5px;">${rarityName}</div>
                    ${item.fixed_damage ? `<div>⚔️ Урон: +${item.fixed_damage}</div>` : ''}
                    ${item.fixed_armor ? `<div>🛡️ Броня: +${item.fixed_armor}</div>` : ''}
                    ${item.fixed_health ? `<div>❤️ Здоровье: +${item.fixed_health}</div>` : ''}
                    ${item.bonus ? `<div>🎯 ${this.formatBonus(item.bonus)}</div>` : ''}
                    ${item.setName ? `<div>✨ Сет: ${this.getItemSetConfig()[item.setName]?.name || item.setName}</div>` : ''}
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
};

// ========== МОДУЛЬ 9.8: СКРЫТЬ ПОДСКАЗКИ ЭКИПИРОВКИ ==========
HeroGame.prototype.hideEquipmentTooltip = function() {
    const existingTooltips = document.querySelectorAll('.equipment-tooltip');
    existingTooltips.forEach(tooltip => tooltip.remove());
};

// ========== МОДУЛЬ 9.9: ОТРИСОВКА КОЛОНКИ МОНСТРА ==========
HeroGame.prototype.renderMonsterColumn = function() {
    if (this.battleResult) {
        return this.renderBattleResult();
    }
    
    if (this.battleActive && this.currentMonster) {
        return this.renderBattleInMonsterColumn();
    }
    
    if (this.currentMonster && !this.battleActive) {
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
                    <p>💰 Награда: ${this.currentMonster.reward.toFixed(2)} золота</p>
                </div>

                <div class="monster-actions">
                    <button class="btn-primary" onclick="game.startBattle()">⚔️ Сражаться</button>
                </div>
            </div>
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
};

// ========== МОДУЛЬ 9.10: ОТРИСОВКА РЕЗУЛЬТАТА БОЯ ==========
HeroGame.prototype.renderBattleResult = function() {
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
                    +${reward.toFixed(2)} золота<br>
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
};

// ========== МОДУЛЬ 9.11: ОТРИСОВКА БОЯ В КОЛОНКЕ МОНСТРА ==========
HeroGame.prototype.renderBattleInMonsterColumn = function() {
    if (!this.battleActive) return '';
    
    const stats = this.calculateHeroStats(this.currentHero);
    const heroHealthPercent = (this.currentHero.currentHealth / stats.maxHealth) * 100;
    const monsterHealthPercent = (this.currentMonster.currentHealth / this.currentMonster.health) * 100;
    const stamina = this.currentHero.stamina || 0;
    
    return `
        <div class="battle-in-monster-column">
            <div class="battle-header">
                <h4>⚔️ БОЙ</h4>
                <div class="battle-round">Раунд: ${this.battleRound}</div>
            </div>
            
            <!-- Индикатор выносливости -->
            <div class="stamina-display" style="background: rgba(0,0,0,0.6); padding: 6px; border-radius: 5px; margin-bottom: 8px; text-align: center; border: 1px solid #f59e0b;">
                <strong>💪 Выносливость: ${stamina}</strong>
                <div style="font-size: 0.8em; color: #f59e0b;">
                    ${stamina > 0 ? `Следующая атака: ${1 + stamina} удара(ов)` : 'Блокируйте чтобы накапливать выносливость'}
                </div>
            </div>
            
            <div class="battle-combatants-compact">
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
            
            <div class="battle-log-compact">
                ${this.battleLog.slice(-3).map(entry => {
                    return '<div class="battle-log-entry-compact ' + (entry.type || '') + '">' + entry.message + '</div>';
                }).join('')}
            </div>
            
            <div class="battle-actions-compact">
                <button class="btn-battle-attack-compact" onclick="game.battleAttack()">
                    ⚔️ Атака ${stamina > 0 ? `(${1 + stamina}x)` : ''}
                </button>
                <button class="btn-battle-block-compact" onclick="game.battleBlock()">
                    🛡️ Блок
                </button>
            </div>
        </div>
    `;
};

// ========== МОДУЛЬ 9.12: ОТРИСОВКА ВЫБОРА КАРТЫ ==========
HeroGame.prototype.renderMapSelection = function() {
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
};

// ========== МОДУЛЬ 9.13: ОТРИСОВКА ВЫБОРА ЛОКАЦИИ ==========
HeroGame.prototype.renderLocationSelection = function() {
    if (this.currentLocation) {
        const progress = this.locationProgress[this.currentLocation.level];
        const killedCount = progress ? progress.monstersKilled.size : 0;
        const totalMonsters = progress ? progress.totalMonsters : 10;
        const progressPercent = (killedCount / totalMonsters) * 100;
        
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
                    <div><strong>Монстры:</strong> №${this.currentLocation.monsterRange[0]}-${this.currentLocation.monsterRange[1]}</div>
                    <div><strong>Прогресс:</strong> ${killedCount}/${totalMonsters} уникальных монстров</div>
                    <div class="location-progress">
                        <div class="location-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
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
};

// ========== МОДУЛЬ 9.14: ПЕРЕКЛЮЧЕНИЕ ВИДЕО/ИЗОБРАЖЕНИЯ (ОБНОВЛЕННЫЙ) ==========
HeroGame.prototype.toggleVideo = function(type) {
    // Разрешаем переключение только для героя
    if (type === 'hero') {
        this.showVideo[type] = !this.showVideo[type];
        this.renderHeroScreen();
    }
};
// ========== МОДУЛЬ 9.15: ОБНОВЛЕННЫЙ РЕНДЕР ПОДСКАЗКИ ДЛЯ ЭКИПИРОВКИ ==========

HeroGame.prototype.showEquipmentTooltip = function(event, slot) {
    // Удаляем существующие подсказки
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
            const rarityColors = {
                'common': '#9ca3af',
                'uncommon': '#4cc9f0', 
                'rare': '#a855f7',
                'epic': '#f59e0b',
                'legendary': '#ffd700'
            };
            
            const rarityNames = {
                'common': 'Обычный',
                'uncommon': 'Необычный',
                'rare': 'Редкий',
                'epic': 'Эпический',
                'legendary': 'Легендарный'
            };
            
            const frameColor = rarityColors[item.rarity] || '#9ca3af';
            const rarityName = rarityNames[item.rarity] || 'Обычный';
            
            tooltipContent = `
                <div class="slot-name">${slotNames[slot]}</div>
                <div class="item-stats">
                    <div><strong style="color: ${frameColor}">${item.name}</strong></div>
                    <div style="color: ${frameColor}; font-size: 0.8em; margin-bottom: 5px;">${rarityName}</div>
                    ${item.fixed_damage ? `<div>⚔️ Урон: +${item.fixed_damage}</div>` : ''}
                    ${item.fixed_armor ? `<div>🛡️ Броня: +${item.fixed_armor}</div>` : ''}
                    ${item.fixed_health ? `<div>❤️ Здоровье: +${item.fixed_health}</div>` : ''}
                    ${item.bonus ? `<div>🎯 ${this.formatBonus(item.bonus)}</div>` : ''}
                    ${item.setName ? `<div>✨ Сет: ${this.getItemSetConfig()[item.setName]?.name || item.setName}</div>` : ''}
                    <div><em>${item.description}</em></div>
                    <div style="margin-top: 6px; color: #ff6b6b; font-size: 0.75em;">Кликните чтобы снять</div>
                </div>
            `;
        }
    } else {
        tooltipContent = `
            <div class="slot-name">${slotNames[slot]}</div>
            <div class="empty-slot">Пустой слот</div>
            <div style="margin-top: 6px; color: #4cc9f0; font-size: 0.75em;">Кликните чтобы экипировать предмет</div>
        `;
    }
    
    const tooltip = document.createElement('div');
    tooltip.className = 'equipment-tooltip';
    tooltip.innerHTML = tooltipContent;
    
    event.currentTarget.appendChild(tooltip);
};
// ========== МОДУЛЬ 10: СИСТЕМА ЭКИПИРОВКИ С НОВЫМИ ТИПАМИ ОРУЖИЯ ==========

// ========== МОДУЛЬ 10.1: ПРОВЕРКА СОВМЕСТИМОСТИ ОРУЖИЯ ==========
HeroGame.prototype.canEquipWeapon = function(item, currentEquipment) {
    if (item.type !== 'weapon') return true;
    
    const mainHand = currentEquipment.main_hand;
    const offHand = currentEquipment.off_hand;
    
    // Если предмет двуручный
    if (item.weaponType === 'two_handed') {
        // Нельзя экипировать если уже есть что-то в любой руке
        if (mainHand || offHand) {
            return false;
        }
        return true;
    }
    
    // Если предмет одноручный
    if (item.weaponType === 'one_handed') {
        // Проверяем куда пытаемся надеть
        if (item.slot === 'main_hand') {
            // Если в главной руке уже двуручное оружие - нельзя
            const mainHandItem = mainHand ? this.items.find(i => i.id === mainHand) : null;
            if (mainHandItem && mainHandItem.weaponType === 'two_handed') {
                return false;
            }
            return true;
        }
        if (item.slot === 'off_hand') {
            // Если в главной руке двуручное оружие - нельзя
            const mainHandItem = mainHand ? this.items.find(i => i.id === mainHand) : null;
            if (mainHandItem && mainHandItem.weaponType === 'two_handed') {
                return false;
            }
            // Если в левой руке уже щит - можно заменить
            return true;
        }
    }
    
    // Если предмет - щит
    if (item.weaponType === 'shield') {
        // Если в главной руке двуручное оружие - нельзя
        const mainHandItem = mainHand ? this.items.find(i => i.id === mainHand) : null;
        if (mainHandItem && mainHandItem.weaponType === 'two_handed') {
            return false;
        }
        return true;
    }
    
    return true;
};

// ========== МОДУЛЬ 10.2: ЭКИПИРОВКА ПРЕДМЕТА ==========
HeroGame.prototype.equipItem = function(itemId) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;

    // Использование зелья
    if (item.type === 'potion') {
        this.usePotion(item);
        return;
    }

    // Проверка совместимости оружия
    if (!this.canEquipWeapon(item, this.currentHero.equipment)) {
        this.addToLog(`❌ Нельзя экипировать ${item.name} - несовместимо с текущим оружием`);
        return;
    }

    let slot = item.slot;
    if (!slot) {
        slot = this.getEquipmentSlot(item);
    }

    // Особые случаи для двуручного оружия
    if (item.weaponType === 'two_handed') {
        // Снимаем всё что было в руках
        this.unequipToInventory('main_hand');
        this.unequipToInventory('off_hand');
        
        // Экипируем в обе руки
        this.currentHero.equipment.main_hand = itemId;
        this.currentHero.equipment.off_hand = itemId;
        
    } else {
        // Стандартная экипировка
        const currentEquipped = this.currentHero.equipment[slot];
        if (currentEquipped) {
            this.unequipToInventory(slot);
        }
        this.currentHero.equipment[slot] = itemId;
    }

    // Убираем из инвентаря
    this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);

    this.addToLog(`🎯 Надето: ${item.name}`);
    
    // Проверяем бонусы сетов
    this.checkSetBonuses();
    
    this.saveGame();
    this.renderHeroScreen();
};

// ========== МОДУЛЬ 10.3: СНЯТЬ ПРЕДМЕТ В ИНВЕНТАРЬ ==========
HeroGame.prototype.unequipToInventory = function(slot) {
    const itemId = this.currentHero.equipment[slot];
    if (!itemId) return;

    const item = this.items.find(i => i.id === itemId);
    if (!item) return;

    // Проверяем место в инвентаре
    if (this.currentHero.inventory.length >= 10) {
        this.addToLog('❌ Инвентарь полон! Максимум 10 предметов');
        return false;
    }

    // Особый случай: если снимаем двуручное оружие
    if (item.weaponType === 'two_handed') {
        this.currentHero.equipment.main_hand = null;
        this.currentHero.equipment.off_hand = null;
    } else {
        this.currentHero.equipment[slot] = null;
    }

    this.currentHero.inventory.push(itemId);
    return true;
};

// ========== МОДУЛЬ 10.4: ПРОВЕРКА И ПРИМЕНЕНИЕ БОНУСОВ СЕТОВ ==========
HeroGame.prototype.checkSetBonuses = function() {
    const activeSets = this.getActiveSetBonuses(this.currentHero);
    if (activeSets.length > 0) {
        activeSets.forEach(set => {
            this.addToLog(`✨ Активирован бонус сета: ${set.description}`);
        });
    }
};


// ========== МОДУЛЬ 10.6: ПОЛУЧЕНИЕ СЛОТА ДЛЯ ПРЕДМЕТА ==========
HeroGame.prototype.getEquipmentSlot = function(item) {
    if (item.type === 'weapon') {
        if (item.weaponType === 'shield') {
            return 'off_hand';
        } else if (item.weaponType === 'two_handed') {
            return 'main_hand'; // Двуручное оружие занимает оба слота, но возвращаем основной
        } else {
            return 'main_hand'; // Одноручное оружие
        }
    }
    
    // Для брони возвращаем соответствующий слот
    const slotMap = {
        'helmet': 'helmet',
        'chest': 'chest', 
        'gloves': 'gloves',
        'legs': 'legs',
        'boots': 'boots'
    };
    
    return slotMap[item.type] || null;
};
// ========== МОДУЛЬ 10.7: ИСПОЛЬЗОВАТЬ ЗЕЛЬЕ ==========
HeroGame.prototype.usePotion = function(item) {
    if (item.type !== 'potion') return;

    if (item.heal) {
        this.updateHealth(item.heal);
        this.addToLog(`❤️ Использовано: ${item.name} (+${item.heal} здоровья)`);
    }

    this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== item.id);
    
    this.saveGame();
    this.showInventory();
};
HeroGame.prototype.openInventoryFromSlot = function(slot) {
    // Если слот не пустой - снимаем предмет
    if (this.currentHero.equipment[slot] && slot !== 'inventory') {
        this.unequipItem(slot);
        return;
    }
    
    // Если слот пустой или это инвентарь - открываем инвентарь с фильтром
    this.showInventory(slot);
};

HeroGame.prototype.unequipItem = function(slot) {
    const itemId = this.currentHero.equipment[slot];
    if (!itemId) return;

    const item = this.items.find(i => i.id === itemId);
    if (!item) return;

    // Проверяем место в инвентаре
    if (this.currentHero.inventory.length >= 10) {
        this.addToLog('❌ Инвентарь полон! Максимум 10 предметов');
        return;
    }

    // Особый случай: если снимаем двуручное оружие
    if (item.weaponType === 'two_handed') {
        this.currentHero.equipment.main_hand = null;
        this.currentHero.equipment.off_hand = null;
    } else {
        this.currentHero.equipment[slot] = null;
    }

    // Добавляем предмет в инвентарь
    this.currentHero.inventory.push(itemId);
    
    this.addToLog(`📦 Снято: ${item.name}`);
    
    // Проверяем обновление бонусов сетов
    this.checkSetBonuses();
    
    this.saveGame();
    
    // ОБНОВЛЯЕМ ОТОБРАЖЕНИЕ ЭКИПИРОВКИ ПЕРЕД ОТКРЫТИЕМ ИНВЕНТАРЯ
    this.updateEquipmentDisplay();
    
    // ОТКРЫВАЕМ ИНВЕНТАРЬ ПОСЛЕ СНЯТИЯ ПРЕДМЕТА
    this.showInventory(slot);
};
//========== МОДУЛЬ 10.10: МЕТОД ОБНОВЛЕНИЯ ОТОБРАЖЕНИЯ ЭКИПИРОВКИ ==========

HeroGame.prototype.updateEquipmentDisplay = function() {
    if (!this.currentHero) return;
    
    // Обновляем отображение слотов экипировки
    const equipmentSlots = document.querySelectorAll('.equipment-slot');
    
    equipmentSlots.forEach(slotElement => {
        const slotType = this.getSlotTypeFromElement(slotElement);
        if (!slotType) return;
        
        const itemId = this.currentHero.equipment[slotType];
        const slotIcon = slotElement.querySelector('.equipment-icon');
        
        if (itemId) {
            const item = this.items.find(i => i.id === itemId);
            if (item) {
                // Обновляем иконку предмета
                slotIcon.innerHTML = `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`;
                
                // Устанавливаем классы редкости
                slotElement.classList.add('equipped');
                slotElement.setAttribute('data-rarity', item.rarity || 'common');
                
                // Убираем fallback иконку
                const fallback = slotIcon.querySelector('.equipment-fallback');
                if (fallback) fallback.style.display = 'none';
            }
        } else {
            // Слот пустой - показываем стандартную иконку
            const defaultIcons = {
                'main_hand': '⚔️',
                'off_hand': '🛡️',
                'helmet': '⛑️',
                'chest': '👕',
                'gloves': '🧤',
                'legs': '👖',
                'boots': '👢'
            };
            
            slotIcon.innerHTML = defaultIcons[slotType] || '🎒';
            slotElement.classList.remove('equipped');
            slotElement.removeAttribute('data-rarity');
        }
    });
    
    // Обновляем статистику героя
    this.updateHeroStatsDisplay();
};
//========== МОДУЛЬ 10.11: ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА ==========

HeroGame.prototype.getSlotTypeFromElement = function(element) {
    if (element.classList.contains('weapon-slot')) {
        if (element.classList.contains('main-hand')) return 'main_hand';
        if (element.classList.contains('off-hand')) return 'off_hand';
        // Определяем по позиции или другим атрибутам
        const slots = Array.from(document.querySelectorAll('.weapon-slot'));
        const index = slots.indexOf(element);
        return index === 0 ? 'main_hand' : 'off_hand';
    }
    
    // Для брони определяем по классам
    const slotMap = {
        'helmet-slot': 'helmet',
        'chest-slot': 'chest',
        'gloves-slot': 'gloves', 
        'legs-slot': 'legs',
        'boots-slot': 'boots'
    };
    
    for (const [className, slotType] of Object.entries(slotMap)) {
        if (element.classList.contains(className)) {
            return slotType;
        }
    }
    
    return null;
};

HeroGame.prototype.updateHeroStatsDisplay = function() {
    const stats = this.calculateHeroStats(this.currentHero);
    
    // Обновляем здоровье
    const healthPercent = (stats.currentHealth / stats.maxHealth) * 100;
    const healthFill = document.querySelector('.health-bar-fill');
    const currentHealthEl = document.getElementById('current-health');
    const maxHealthEl = document.getElementById('max-health');
    
    if (healthFill) healthFill.style.width = healthPercent + '%';
    if (currentHealthEl) currentHealthEl.textContent = stats.currentHealth;
    if (maxHealthEl) maxHealthEl.textContent = stats.maxHealth;
    
    // Обновляем основные характеристики
    const statElements = {
        'damage': '.hero-main-stats .main-stat:nth-child(1) .stat-value',
        'armor': '.hero-main-stats .main-stat:nth-child(2) .stat-value', 
        'power': '.hero-main-stats .main-stat:nth-child(3) .stat-value'
    };
    
    for (const [stat, selector] of Object.entries(statElements)) {
        const element = document.querySelector(selector);
        if (element) {
            element.textContent = stats[stat];
        }
    }
};
// ========== МОДУЛЬ 11.1: НАЧАТЬ ПУТЕШЕСТВИЕ (ОБНОВЛЕННЫЙ) ==========
HeroGame.prototype.startAdventure = function() {
    // УДАЛЕНО: проверка карты и локации
    // if (!this.currentMap || !this.currentLocation) {
    //     this.addToLog('❌ Сначала выберите карту и локацию');
    //     return;
    // }

    this.addToLog('🚀 Начато путешествие по миру Арканиума');
    
    setTimeout(() => {
        this.encounterMonster();
    }, 1000);
};

// ========== МОДУЛЬ 11.2: ВСТРЕТИТЬ МОНСТРА (ОБНОВЛЕННЫЙ) ==========
HeroGame.prototype.encounterMonster = function() {
    // УДАЛЕНО: логика выбора монстра на основе локации
    
    // Простой случайный выбор монстра из всех доступных
    const availableMonsters = this.monsters.filter(monster => 
        monster.id <= 10 // Ограничиваем монстров для начала игры
    );
    
    if (availableMonsters.length === 0) {
        console.error('❌ Нет доступных монстров');
        return;
    }
    
    const randomMonster = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
    
    // Создание текущего монстра
    this.currentMonster = {
        id: randomMonster.id,
        name: randomMonster.name,
        image: randomMonster.image,
        description: randomMonster.description,
        health: randomMonster.health,
        damage: randomMonster.damage,
        armor: randomMonster.armor,
        reward: parseFloat(randomMonster.reward.toFixed(2)),
        power: randomMonster.power
    };

    this.addToLog('🎭 Встречен: ' + this.currentMonster.name);
    this.renderHeroScreen();
};

// ========== МОДУЛЬ 12: СИСТЕМА МАГАЗИНА И ТОРГОВЛИ ==========

HeroGame.prototype.showMerchant = function() {
    // Удаляем только существующие экраны магазина и инвентаря
    const existingScreens = document.querySelectorAll('#screen-merchant, #screen-inventory');
    existingScreens.forEach(screen => screen.remove());
    
    const availableItems = this.items.filter(item => item.requiredLevel <= (this.currentHero?.level || 1));
    
    // Группировка предметов по типам и редкости
    const categorizedItems = this.categorizeItems(availableItems);
    
    const merchantHTML = this.renderCategorizedShop(categorizedItems);
    
    const container = document.getElementById('app');
    container.innerHTML += `
        <div class="screen active" id="screen-merchant">
            <div class="merchant-header">
                <h3 class="text-center">🏪 Магазин снаряжения</h3>
                <div class="hero-merchant-info">
                    <div class="merchant-stats">
                        <span class="gold-amount">💰 ${this.currentHero?.gold.toFixed(2) || 0}</span>
                        <span class="inventory-space">🎒 ${10 - (this.currentHero?.inventory?.length || 0)}/10</span>
                    </div>
                </div>
            </div>
            
            <div class="shop-categories">
                <button class="category-tab active" data-category="all">Все предметы</button>
                <button class="category-tab" data-category="weapon">⚔️ Оружие</button>
                <!-- УДАЛЕНА КНОПКА ЩИТОВ -->
                <button class="category-tab" data-category="helmet">⛑️ Шлемы</button>
                <button class="category-tab" data-category="chest">👕 Броня</button>
                <button class="category-tab" data-category="gloves">🧤 Перчатки</button>
                <button class="category-tab" data-category="legs">👖 Поножи</button>
                <button class="category-tab" data-category="boots">👢 Ботинки</button>
            </div>
            
            <div class="shop-subcategories" id="shop-subcategories" style="display: none;">
                <!-- Подкатегории будут добавляться динамически -->
            </div>
            
            <div class="merchant-items-container">
                ${merchantHTML}
            </div>
            
            <div class="action-buttons">
                <button class="btn-secondary" onclick="game.closeMerchant()">← Назад к герою</button>
            </div>
        </div>
    `;

    this.initializeShopFilters();
    this.showScreen('merchant');
};

// ========== МОДУЛЬ 12.2: КАТЕГОРИЗАЦИЯ ПРЕДМЕТОВ ==========
HeroGame.prototype.categorizeItems = function(items) {
    const categories = {
        all: { name: "Все предметы", items: [] },
        weapon: { name: "Оружие", items: [] },
        shield: { name: "Щиты", items: [] },
        helmet: { name: "Шлемы", items: [] },
        chest: { name: "Броня", items: [] },
        gloves: { name: "Перчатки", items: [] },
        legs: { name: "Поножи", items: [] }
    };
    
    // Сортируем предметы по цене (качеству)
    const sortedItems = items.sort((a, b) => a.price - b.price);
    
    sortedItems.forEach(item => {
        // Добавляем во все категории
        categories.all.items.push(item);
        
        // Добавляем в специфические категории
        if (item.type === 'weapon' && item.weaponType !== 'shield') {
            categories.weapon.items.push(item);
        } else if (item.weaponType === 'shield') {
            categories.shield.items.push(item);
        } else if (item.type in categories) {
            categories[item.type].items.push(item);
        }
    });
    
    return categories;
};

// ========== МОДУЛЬ 12.3: РЕНДЕР СТРУКТУРИРОВАННОГО МАГАЗИНА ==========
HeroGame.prototype.renderCategorizedShop = function(categories) {
    return `
        <div class="shop-content">
            ${Object.entries(categories).map(([categoryKey, category]) => `
                <div class="shop-category ${categoryKey}" style="${categoryKey !== 'all' ? 'display: none;' : ''}">
                    <h4 class="category-title">${category.name}</h4>
                    <div class="items-grid">
                        ${category.items.map(item => this.renderShopItem(item)).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
};

// ========== МОДУЛЬ 12.4: РЕНДЕР ОТДЕЛЬНОГО ПРЕДМЕТА В МАГАЗИНЕ ==========
HeroGame.prototype.renderShopItem = function(item) {
    const isOwned = this.currentHero.inventory.includes(item.id);
    const canAfford = this.currentHero.gold >= item.price;
    const hasSpace = this.currentHero.inventory.length < 10;
    const canBuy = !isOwned && canAfford && hasSpace;
    
    // Определяем цвет рамки на основе качества предмета
    const rarityClass = `rarity-${item.rarity}`;
    const itemTypeClass = `item-type-${item.type}`;
    const frameColor = this.getItemFrameColor(item.rarity);
    
    return `
        <div class="shop-item ${rarityClass} ${itemTypeClass} ${isOwned ? 'owned' : ''} ${!canBuy && !isOwned ? 'cannot-buy' : ''}" 
             onclick="game.showItemDetails(${item.id})">
            
            <div class="item-background" style="border-color: ${frameColor};">
                <div class="item-image-container">
                    <img src="${item.image}" alt="${item.name}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                    <div class="item-fallback" style="display: none;">
                        <span class="item-icon">${this.getItemTypeIcon(item.type)}</span>
                    </div>
                </div>
                
                <div class="item-rarity-bar" style="background: ${frameColor};"></div>
                
                <div class="item-info">
                    <div class="item-name" style="color: ${frameColor};">${item.name}</div>
                    <div class="item-type">${this.getItemTypeName(item.type)}</div>
                    
                    <div class="item-stats-compact">
                        ${item.fixed_damage ? `<span>⚔️${item.fixed_damage}</span>` : ''}
                        ${item.fixed_armor ? `<span>🛡️${item.fixed_armor}</span>` : ''}
                        ${item.fixed_health ? `<span>❤️${item.fixed_health}</span>` : ''}
                    </div>
                    
                    <div class="item-price-tag">
                        <span class="price">💰 ${item.price}</span>
                        ${isOwned ? 
                            `<span class="owned-badge">✓ В инвентаре</span>` :
                            `<span class="buy-status ${canBuy ? 'can-buy' : 'cannot-buy'}">${canBuy ? 'Купить' : 'Недоступно'}</span>`
                        }
                    </div>
                </div>
            </div>
        </div>
    `;
};

// ========== МОДУЛЬ 12.5: ПОЛУЧЕНИЕ ЦВЕТА РАМКИ НА ОСНОВЕ РЕДКОСТИ ПРЕДМЕТА ==========
HeroGame.prototype.getItemFrameColor = function(rarity) {
    const colors = {
        'common': '#9ca3af',      // Серый
        'uncommon': '#4cc9f0',    // Синий
        'rare': '#a855f7',        // Фиолетовый
        'epic': '#f59e0b',        // Оранжевый
        'legendary': '#ffd700',   // Золотой
        'mythic': '#ff6b6b'       // Красный для мифических предметов
    };
    return colors[rarity] || '#9ca3af';
};
// ========== МОДУЛЬ 12.6: ИНИЦИАЛИЗАЦИЯ ФИЛЬТРОВ МАГАЗИНА ==========
HeroGame.prototype.initializeShopFilters = function() {
    const tabs = document.querySelectorAll('.category-tab');
    const categories = document.querySelectorAll('.shop-category');
    const subcategoriesContainer = document.getElementById('shop-subcategories');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Убираем активный класс со всех вкладок
            tabs.forEach(t => t.classList.remove('active'));
            // Добавляем активный класс текущей вкладке
            tab.classList.add('active');
            
            // Скрываем все категории
            categories.forEach(cat => cat.style.display = 'none');
            
            // Показываем/скрываем подкатегории
            const category = tab.dataset.category;
            const hasSubcategories = ['helmet', 'chest', 'gloves', 'legs', 'boots'].includes(category);
            
            if (hasSubcategories) {
                this.renderSubcategories(category, subcategoriesContainer);
                subcategoriesContainer.style.display = 'block';
            } else {
                subcategoriesContainer.style.display = 'none';
            }
            
            // Показываем выбранную категорию
            const targetCategory = document.querySelector(`.shop-category.${category}`);
            if (targetCategory) {
                targetCategory.style.display = 'block';
                
                // Если есть активная подкатегория, применяем фильтр
                const activeSubcategory = subcategoriesContainer.querySelector('.subcategory-tab.active');
                if (activeSubcategory) {
                    this.filterCategoryBySubcategory(category, activeSubcategory.dataset.subcategory);
                }
            }
        });
    });
    
    // Инициализируем первую категорию
    if (tabs.length > 0) {
        tabs[0].click();
    }
};
// ========== МОДУЛЬ 12.7: ПОКАЗАТЬ ДЕТАЛИ ПРЕДМЕТА ==========
HeroGame.prototype.showItemDetails = function(itemId) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;
    
    const isOwned = this.currentHero.inventory.includes(item.id);
    const canAfford = this.currentHero.gold >= item.price;
    const hasSpace = this.currentHero.inventory.length < 10;
    const canBuy = !isOwned && canAfford && hasSpace;
    const frameColor = this.getItemFrameColor(item.rarity);
    
    const modalHTML = `
        <div class="item-detail-modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h4 style="color: ${frameColor};">${item.name}</h4>
                    <button class="close-modal" onclick="game.closeItemModal()">×</button>
                </div>
                
                <div class="item-detail-content">
                    <div class="item-detail-image">
                        <div class="detail-item-background ${this.getItemTypeClass(item.type)}" style="border-color: ${frameColor};">
                            <img src="${item.image}" alt="${item.name}" 
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
                                 class="item-detail-image-zoom"
                                 onmouseover="game.zoomItemImage(this)"
                                 onmouseout="game.unzoomItemImage(this)">
                            <div class="item-fallback-large" style="display: none;">
                                <span class="item-icon-large">${this.getItemTypeIcon(item.type)}</span>
                            </div>
                        </div>
                        <div class="item-rarity ${item.rarity}" style="background: ${frameColor};">${this.getRarityName(item.rarity)}</div>
                    </div>
                    
                    <div class="item-detail-info">
                        <div class="item-description">${item.description}</div>
                        <div class="item-flavor">"${item.flavorText}"</div>
                        
                        <div class="item-stats-detailed">
                            <h5>Характеристики:</h5>
                            ${item.fixed_damage ? `<div class="stat-line"><span>⚔️ Урон:</span> <span>+${item.fixed_damage}</span></div>` : ''}
                            ${item.fixed_armor ? `<div class="stat-line"><span>🛡️ Броня:</span> <span>+${item.fixed_armor}</span></div>` : ''}
                            ${item.fixed_health ? `<div class="stat-line"><span>❤️ Здоровье:</span> <span>+${item.fixed_health}</span></div>` : ''}
                            ${item.bonus && item.bonus.type !== 'none' ? 
                                `<div class="stat-line"><span>🎯 Бонус:</span> <span>${this.formatBonus(item.bonus)}</span></div>` : ''}
                            ${item.setName ? `<div class="stat-line"><span>✨ Сет:</span> <span>${this.getItemSetConfig()[item.setName]?.name || item.setName}</span></div>` : ''}
                        </div>
                        
                        <div class="item-requirements">
                            <h5>Требования:</h5>
                            <div class="stat-line"><span>📊 Уровень:</span> <span>${item.requiredLevel}</span></div>
                            ${item.requiredClass.length > 0 ? 
                                `<div class="stat-line"><span>⚔️ Классы:</span> <span>${item.requiredClass.join(', ')}</span></div>` : ''}
                            ${item.requiredRace.length > 0 ? 
                                `<div class="stat-line"><span>🧬 Расы:</span> <span>${item.requiredRace.join(', ')}</span></div>` : ''}
                        </div>
                        
                        <div class="item-actions">
                            <div class="price-section">
                                <span class="buy-price">💰 Купить: ${item.price.toFixed(2)}</span>
                                <span class="sell-price">💸 Продать: ${(item.sellPrice || Math.floor(item.price * 0.5)).toFixed(2)}</span>
                            </div>
                            
                            <div class="action-buttons">
                                ${isOwned ? 
                                    `<button class="btn-secondary" onclick="game.sellItem(${item.id}); game.closeItemModal()">Продать</button>` :
                                    `<button class="btn-primary ${!canBuy ? 'disabled' : ''}" 
                                            ${!canBuy ? 'disabled' : ''}
                                            onclick="game.buyItem(${item.id}); game.closeItemModal()">
                                        Купить
                                    </button>`
                                }
                                ${!canBuy && !isOwned ? 
                                    `<div class="purchase-error">
                                        ${!canAfford ? '❌ Недостаточно золота' : ''}
                                        ${!hasSpace ? '❌ Инвентарь полон' : ''}
                                    </div>` : ''
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// ========== МОДУЛЬ 12.7.1: УВЕЛИЧЕНИЕ ИЗОБРАЖЕНИЯ ПРЕДМЕТА ==========
HeroGame.prototype.zoomItemImage = function(imgElement) {
    imgElement.style.transform = 'scale(2.5)'; // Увеличение в 2.5 раза
    imgElement.style.transition = 'transform 0.3s ease';
    imgElement.style.zIndex = '1000';
    imgElement.style.position = 'relative';
};

// ========== МОДУЛЬ 12.7.2: ВОЗВРАТ ИЗОБРАЖЕНИЯ К НОРМАЛЬНОМУ РАЗМЕРУ ==========
HeroGame.prototype.unzoomItemImage = function(imgElement) {
    imgElement.style.transform = 'scale(1)';
    imgElement.style.transition = 'transform 0.3s ease';
};

// ========== МОДУЛЬ 12.8: ЗАКРЫТЬ МОДАЛЬНОЕ ОКНО ПРЕДМЕТА ==========
HeroGame.prototype.closeItemModal = function() {
    const modal = document.querySelector('.item-detail-modal');
    if (modal) {
        modal.remove();
    }
};

// ========== МОДУЛЬ 12.9: ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ МАГАЗИНА ==========

HeroGame.prototype.getItemTypeIcon = function(type) {
    const icons = {
        'weapon': '⚔️',
        'shield': '🛡️',
        'helmet': '⛑️',
        'chest': '👕',
        'gloves': '🧤',
        'legs': '👖',
        'boots': '👢'
    };
    return icons[type] || '🎁';
};

HeroGame.prototype.getItemTypeName = function(type) {
    const names = {
        'weapon': 'Оружие',
        'shield': 'Щит',
        'helmet': 'Шлем',
        'chest': 'Броня',
        'gloves': 'Перчатки',
        'legs': 'Поножи',
        'boots': 'Ботинки'
    };
    return names[type] || 'Предмет';
};

HeroGame.prototype.getItemTypeClass = function(type) {
    return `item-type-${type}`;
};

HeroGame.prototype.getRarityName = function(rarity) {
    const names = {
        'common': 'Обычный',
        'uncommon': 'Необычный',
        'rare': 'Редкий',
        'epic': 'Эпический',
        'legendary': 'Легендарный',
        'mythic': 'Мифический' // Добавлено для мифических предметов
    };
    return names[rarity] || 'Обычный';
};

// ========== МОДУЛЬ 12.10: КУПИТЬ ПРЕДМЕТ ==========
HeroGame.prototype.buyItem = function(itemId) {
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
};

// ========== МОДУЛЬ 12.11: ПРОДАТЬ ПРЕДМЕТ ==========
HeroGame.prototype.sellItem = function(itemId) {
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
};
// ========== МОДУЛЬ 12.12: СИСТЕМА ПОДКАТЕГОРИЙ ==========
HeroGame.prototype.getSubcategories = function() {
    return {
        'helmet': {
            'cloth': 'Ткань',
            'leather': 'Кожа', 
            'hide': 'Шкура',
            'fur': 'Мех',
            'bone': 'Кости',
            'plate': 'Пластины',
            'chain': 'Кольчуга',
            'plate_mail': 'Латы'
        },
        'chest': {
            'cloth': 'Ткань',
            'leather': 'Кожа',
            'hide': 'Шкура', 
            'fur': 'Мех',
            'bone': 'Кости',
            'plate': 'Пластины',
            'chain': 'Кольчуга',
            'plate_mail': 'Латы'
        },
        'gloves': {
            'cloth': 'Ткань',
            'leather': 'Кожа',
            'hide': 'Шкура',
            'fur': 'Мех', 
            'bone': 'Кости',
            'plate': 'Пластины',
            'chain': 'Кольчуга',
            'plate_mail': 'Латы'
        },
        'legs': {
            'cloth': 'Ткань',
            'leather': 'Кожа',
            'hide': 'Шкура',
            'fur': 'Меф',
            'bone': 'Кости',
            'plate': 'Пластины', 
            'chain': 'Кольчуга',
            'plate_mail': 'Латы'
        },
        'boots': {
            'cloth': 'Ткань',
            'leather': 'Кожа',
            'hide': 'Шкура',
            'fur': 'Мех',
            'bone': 'Кости',
            'plate': 'Пластины',
            'chain': 'Кольчуга',
            'plate_mail': 'Латы'
        }
    };
};

// ========== МОДУЛЬ 12.13: ФИЛЬТРАЦИЯ ПО ПОДКАТЕГОРИЯМ ==========
HeroGame.prototype.filterItemsBySubcategory = function(items, category, subcategory) {
    if (!subcategory || subcategory === 'all') return items;
    
    return items.filter(item => {
        if (item.type !== category) return false;
        
        // Проверяем материал предмета
        const itemMaterial = item.material || 'cloth'; // По умолчанию ткань
        return itemMaterial === subcategory;
    });
};
// ========== МОДУЛЬ 12.14: РЕНДЕР ПОДКАТЕГОРИЙ ==========
HeroGame.prototype.renderSubcategories = function(category, container) {
    const subcategories = this.getSubcategories()[category];
    if (!subcategories) return;
    
    let html = `<div class="subcategory-tabs">`;
    html += `<button class="subcategory-tab active" data-subcategory="all">Все</button>`;
    
    Object.entries(subcategories).forEach(([key, name]) => {
        html += `<button class="subcategory-tab" data-subcategory="${key}">${name}</button>`;
    });
    
    html += `</div>`;
    container.innerHTML = html;
    
    // Добавляем обработчики для подкатегорий
    const subTabs = container.querySelectorAll('.subcategory-tab');
    subTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            subTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const activeCategory = document.querySelector('.category-tab.active');
            if (activeCategory) {
                this.filterCategoryBySubcategory(activeCategory.dataset.category, tab.dataset.subcategory);
            }
        });
    });
};

// ========== МОДУЛЬ 12.15: ФИЛЬТРАЦИЯ КАТЕГОРИИ ПО ПОДКАТЕГОРИИ ==========
HeroGame.prototype.filterCategoryBySubcategory = function(category, subcategory) {
    const categoryElement = document.querySelector(`.shop-category.${category}`);
    if (!categoryElement) return;
    
    const allItems = this.items.filter(item => 
        item.requiredLevel <= (this.currentHero?.level || 1) && 
        this.doesItemMatchCategory(item, category)
    );
    
    const filteredItems = this.filterItemsBySubcategory(allItems, category, subcategory);
    
    // Обновляем отображение предметов в категории
    const itemsGrid = categoryElement.querySelector('.items-grid');
    if (itemsGrid) {
        itemsGrid.innerHTML = filteredItems.map(item => this.renderShopItem(item)).join('');
    }
};

// ========== МОДУЛЬ 12.16: ПРОВЕРКА СООТВЕТСТВИЯ ПРЕДМЕТА КАТЕГОРИИ ==========
HeroGame.prototype.doesItemMatchCategory = function(item, category) {
    if (category === 'all') return true;
    if (category === 'weapon') return item.type === 'weapon' && item.weaponType !== 'shield';
    if (category === 'shield') return item.weaponType === 'shield';
    return item.type === category;
};
// ========== МОДУЛЬ 12.17: ОБНОВЛЕННЫЙ МЕТОД ЗАКРЫТИЯ МАГАЗИНА ==========

HeroGame.prototype.closeMerchant = function() {
    const merchantScreen = document.getElementById('screen-merchant');
    if (merchantScreen) {
        merchantScreen.remove();
    }
    // ВОССТАНАВЛИВАЕМ ГЛАВНЫЙ ЭКРАН ГЕРОЯ
    this.renderHeroScreen();
};

HeroGame.prototype.showInventory = function(targetSlot = null) {
    if (!this.currentHero) return;

    // Удаляем только существующие экраны магазина и инвентаря
    const existingScreens = document.querySelectorAll('#screen-merchant, #screen-inventory');
    existingScreens.forEach(screen => screen.remove());

    // ОБНОВЛЯЕМ ОТОБРАЖЕНИЕ ЭКИПИРОВКИ ПЕРЕД ПОКАЗОМ ИНВЕНТАРЯ
    this.updateEquipmentDisplay();

    // Фильтрация предметов для выбранного слота
    let filteredItems = this.currentHero.inventory;
    let filterInfo = '';
    
    if (targetSlot && targetSlot !== 'inventory') {
        filteredItems = this.getItemsForSlot(targetSlot);
        filterInfo = `
            <div style="text-align: center; margin-bottom: 10px; background: rgba(76, 201, 240, 0.2); padding: 8px; border-radius: 8px; border: 1px solid #4cc9f0;">
                <strong>🎯 Выбор предмета для: ${this.getSlotName(targetSlot)}</strong>
                <div style="font-size: 0.8em; margin-top: 4px; color: #4cc9f0;">
                    Показано: ${filteredItems.length} подходящих предметов
                </div>
            </div>
        `;
    }

    const inventoryHTML = filteredItems.map(itemId => {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return '';
        
        const isEquipped = Object.values(this.currentHero.equipment).includes(itemId);
        const frameColor = this.getItemFrameColor(item.rarity);
        
        return `
            <div class="inventory-item" onclick="game.equipItem(${itemId})" style="border-color: ${frameColor};">
                <div class="inventory-item-image">
                    <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
                </div>
                <div class="inventory-item-info">
                    <strong style="color: ${frameColor};">${item.name}</strong>
                    <div class="item-stats">
                        ${item.fixed_damage ? `<span>⚔️ Урон: +${item.fixed_damage}</span>` : ''}
                        ${item.fixed_armor ? `<span>🛡️ Броня: +${item.fixed_armor}</span>` : ''}
                        ${item.heal ? `<span>❤️ Лечение: +${item.heal}</span>` : ''}
                        ${item.bonus ? `<span>🎯 ${this.formatBonus(item.bonus)}</span>` : ''}
                        ${item.fixed_health ? `<span>❤️ Здоровье: +${item.fixed_health}</span>` : ''}
                    </div>
                    <small>${item.description}</small>
                    ${isEquipped ? '<small style="color: #4ade80;">✓ Надето</small>' : '<small style="color: #4cc9f0;">📦 В инвентаре</small>'}
                    ${item.setName ? `<small style="color: #f59e0b;">✨ Часть сета: ${this.getItemSetConfig()[item.setName]?.name || item.setName}</small>` : ''}
                    ${targetSlot && targetSlot !== 'inventory' ? `<small style="color: #ffd700;">🎯 Подходит для: ${this.getSlotName(targetSlot)}</small>` : ''}
                </div>
            </div>
        `;
    }).join('');

    const container = document.getElementById('app');
    container.innerHTML += `
        <div class="screen active" id="screen-inventory">
            <h3 class="text-center">🎒 Инвентарь</h3>
            ${filterInfo}
            <div class="inventory-info" style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 8px;">
                    <span>💰 Ваше золото: ${this.currentHero?.gold.toFixed(2) || 0}</span>
                    <span>🎒 Свободно мест: ${10 - (this.currentHero?.inventory?.length || 0)}/10</span>
                </div>
            </div>
            <div class="inventory-grid">
                ${inventoryHTML || '<div class="text-center">Инвентарь пуст</div>'}
            </div>
            <div class="action-buttons">
                ${targetSlot ? `
                    <button class="btn-secondary" onclick="game.showInventory()">📦 Показать все предметы</button>
                ` : ''}
                <button class="btn-secondary" onclick="game.closeInventory()">← Назад к герою</button>
            </div>
        </div>
    `;

    this.showScreen('inventory');
};

// ========== МОДУЛЬ 12.19: ПОЛУЧЕНИЕ ПРЕДМЕТОВ ДЛЯ КОНКРЕТНОГО СЛОТА ==========

HeroGame.prototype.getItemsForSlot = function(slot) {
    return this.currentHero.inventory.filter(itemId => {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return false;
        
        // Определяем подходящие слоты для предмета
        const suitableSlots = this.getSuitableSlotsForItem(item);
        return suitableSlots.includes(slot);
    });
};
// ========== МОДУЛЬ 12.20: ПОЛУЧЕНИЕ ПРЕДМЕТОВ ДЛЯ КОНКРЕТНОГО СЛОТА ==========

HeroGame.prototype.getSuitableSlotsForItem = function(item) {
    const slotMap = {
        'weapon': {
            'one_handed': ['main_hand', 'off_hand'],
            'two_handed': ['main_hand'], // Двуручное занимает оба слота
            'shield': ['off_hand']
        },
        'helmet': ['helmet'],
        'chest': ['chest'],
        'gloves': ['gloves'],
        'legs': ['legs'],
        'boots': ['boots']
    };

    if (item.type === 'weapon' && slotMap.weapon[item.weaponType]) {
        return slotMap.weapon[item.weaponType];
    }
    
    return slotMap[item.type] || [];
};

//========== МОДУЛЬ 12.21: ОБНОВЛЕННАЯ КАТЕГОРИЗАЦИЯ ПРЕДМЕТОВ С ПОДКАТЕГОРИЯМИ ОРУЖИЯ ==========

HeroGame.prototype.categorizeItems = function(items) {
    const categories = {
        all: { name: "Все предметы", items: [], hasSubcategories: false },
        weapon: { 
            name: "⚔️ Оружие", 
            items: [],
            hasSubcategories: true,
            subcategories: {
                'all': { name: "Всё оружие", items: [] },
                'one_handed': { name: "Одноручное", items: [] },
                'two_handed': { name: "Двуручное", items: [] },
                'shield': { name: "🛡️ Щиты", items: [] }
            }
        },
        helmet: { 
            name: "⛑️ Шлемы", 
            items: [],
            hasSubcategories: true,
            subcategories: this.getArmorSubcategories()
        },
        chest: { 
            name: "👕 Броня", 
            items: [],
            hasSubcategories: true,
            subcategories: this.getArmorSubcategories()
        },
        gloves: { 
            name: "🧤 Перчатки", 
            items: [],
            hasSubcategories: true,
            subcategories: this.getArmorSubcategories()
        },
        legs: { 
            name: "👖 Поножи", 
            items: [],
            hasSubcategories: true,
            subcategories: this.getArmorSubcategories()
        },
        boots: { 
            name: "👢 Ботинки", 
            items: [],
            hasSubcategories: true,
            subcategories: this.getArmorSubcategories()
        }
    };
    
    // Сортируем предметы по цене (качеству)
    const sortedItems = items.sort((a, b) => a.price - b.price);
    
    sortedItems.forEach(item => {
        // Добавляем во все категории
        categories.all.items.push(item);
        
        // Добавляем в специфические категории
        if (item.type === 'weapon') {
            categories.weapon.items.push(item);
            
            // Добавляем в подкатегории оружия
            if (item.weaponType === 'shield') {
                categories.weapon.subcategories.shield.items.push(item);
                categories.weapon.subcategories.all.items.push(item);
            } else {
                categories.weapon.subcategories[item.weaponType]?.items.push(item);
                categories.weapon.subcategories.all.items.push(item);
            }
        } else if (item.type in categories) {
            categories[item.type].items.push(item);
            
            // Добавляем в подкатегории брони
            if (categories[item.type].hasSubcategories) {
                const material = item.material || 'cloth';
                categories[item.type].subcategories[material]?.items.push(item);
                categories[item.type].subcategories.all.items.push(item);
            }
        }
    });
    
    return categories;
};
//========== МОДУЛЬ 12.22: ПОЛУЧЕНИЕ ПОДКАТЕГОРИЙ БРОНИ ==========

HeroGame.prototype.getArmorSubcategories = function() {
    return {
        'all': { name: "Все материалы", items: [] },
        'cloth': { name: "Ткань", items: [] },
        'leather': { name: "Кожа", items: [] },
        'hide': { name: "Шкура", items: [] },
        'fur': { name: "Мех", items: [] },
        'bone': { name: "Кости", items: [] },
        'plate': { name: "Пластины", items: [] },
        'chain': { name: "Кольчуга", items: [] },
        'plate_mail': { name: "Латы", items: [] }
    };
};

//========== МОДУЛЬ 12.23: ОБНОВЛЕННЫЙ РЕНДЕР СТРУКТУРИРОВАННОГО МАГАЗИНА ==========

HeroGame.prototype.renderCategorizedShop = function(categories) {
    return `
        <div class="shop-content">
            ${Object.entries(categories).map(([categoryKey, category]) => `
                <div class="shop-category ${categoryKey}" style="${categoryKey !== 'all' ? 'display: none;' : ''}">
                    <h4 class="category-title">${category.name}</h4>
                    
                    ${category.hasSubcategories ? `
                        <div class="shop-subcategories" id="subcategories-${categoryKey}" 
                             style="${categoryKey === 'all' ? 'display: none;' : ''}">
                            <div class="subcategory-tabs">
                                ${Object.entries(category.subcategories).map(([subKey, subcategory]) => `
                                    <button class="subcategory-tab ${subKey === 'all' ? 'active' : ''}" 
                                            data-subcategory="${subKey}">
                                        ${subcategory.name}
                                        <span class="subcategory-count">${subcategory.items.length}</span>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="items-grid" id="items-${categoryKey}">
                        ${category.items.map(item => this.renderShopItem(item)).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
};
//========== МОДУЛЬ 12.24: ОБНОВЛЕННАЯ ИНИЦИАЛИЗАЦИЯ ФИЛЬТРОВ МАГАЗИНА ==========
HeroGame.prototype.initializeShopFilters = function() {
    const tabs = document.querySelectorAll('.category-tab');
    const categories = document.querySelectorAll('.shop-category');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Убираем активный класс со всех вкладок
            tabs.forEach(t => t.classList.remove('active'));
            // Добавляем активный класс текущей вкладке
            tab.classList.add('active');
            
            // Скрываем все категории
            categories.forEach(cat => cat.style.display = 'none');
            
            // Показываем/скрываем подкатегории
            const category = tab.dataset.category;
            const targetCategory = document.querySelector(`.shop-category.${category}`);
            const subcategoriesContainer = document.getElementById(`subcategories-${category}`);
            
            if (targetCategory) {
                targetCategory.style.display = 'block';
                
                // Показываем подкатегории если они есть
                if (subcategoriesContainer) {
                    subcategoriesContainer.style.display = 'block';
                    
                    // Инициализируем подкатегории
                    this.initializeSubcategoryFilters(category);
                }
            }
        });
    });
    
    // Инициализируем первую категорию
    if (tabs.length > 0) {
        tabs[0].click();
    }
};
//========== МОДУЛЬ 12.25: ИНИЦИАЛИЗАЦИЯ ФИЛЬТРОВ ПОДКАТЕГОРИЙ ==========
HeroGame.prototype.initializeSubcategoryFilters = function(category) {
    const subTabs = document.querySelectorAll(`#subcategories-${category} .subcategory-tab`);
    const itemsGrid = document.getElementById(`items-${category}`);
    
    subTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Убираем активный класс со всех подвкладок
            subTabs.forEach(t => t.classList.remove('active'));
            // Добавляем активный класс текущей подвкладке
            tab.classList.add('active');
            
            const subcategory = tab.dataset.subcategory;
            this.filterCategoryBySubcategory(category, subcategory);
        });
    });
    
    // Активируем первую подкатегорию
    if (subTabs.length > 0) {
        subTabs[0].click();
    }
};
//========== МОДУЛЬ 12.26: ФИЛЬТРАЦИЯ КАТЕГОРИИ ПО ПОДКАТЕГОРИИ ==========
HeroGame.prototype.filterCategoryBySubcategory = function(category, subcategory) {
    const categories = this.categorizeItems(this.items.filter(item => 
        item.requiredLevel <= (this.currentHero?.level || 1)
    ));
    
    const categoryData = categories[category];
    if (!categoryData || !categoryData.hasSubcategories) return;
    
    const itemsToShow = subcategory === 'all' ? 
        categoryData.items : 
        categoryData.subcategories[subcategory]?.items || [];
    
    const itemsGrid = document.getElementById(`items-${category}`);
    if (itemsGrid) {
        itemsGrid.innerHTML = itemsToShow.map(item => this.renderShopItem(item)).join('');
    }
};
// ========== МОДУЛЬ 13.1: ПОКАЗАТЬ ИНВЕНТАРЬ ==========
HeroGame.prototype.showInventory = function() {
    if (!this.currentHero) return;

    // Удаляем только существующие экраны магазина и инвентаря
    const existingScreens = document.querySelectorAll('#screen-merchant, #screen-inventory');
    existingScreens.forEach(screen => screen.remove());

    const inventoryHTML = this.currentHero.inventory.map(itemId => {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return '';
        
        const isEquipped = Object.values(this.currentHero.equipment).includes(itemId);
        const frameColor = this.getItemFrameColor(item.rarity);
        
        return `
            <div class="inventory-item" onclick="game.equipItem(${itemId})" style="border-color: ${frameColor};">
                <div class="inventory-item-image">
                    <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
                </div>
                <div class="inventory-item-info">
                    <strong style="color: ${frameColor};">${item.name}</strong>
                    <div class="item-stats">
                        ${item.fixed_damage ? `<span>⚔️ Урон: +${item.fixed_damage}</span>` : ''}
                        ${item.fixed_armor ? `<span>🛡️ Броня: +${item.fixed_armor}</span>` : ''}
                        ${item.heal ? `<span>❤️ Лечение: +${item.heal}</span>` : ''}
                        ${item.bonus ? `<span>🎯 ${this.formatBonus(item.bonus)}</span>` : ''}
                        ${item.fixed_health ? `<span>❤️ Здоровье: +${item.fixed_health}</span>` : ''}
                    </div>
                    <small>${item.description}</small>
                    ${isEquipped ? '<small style="color: #4ade80;">✓ Надето</small>' : '<small style="color: #4cc9f0;">📦 В инвентаре</small>'}
                    ${item.setName ? `<small style="color: #f59e0b;">✨ Часть сета: ${this.getItemSetConfig()[item.setName]?.name || item.setName}</small>` : ''}
                </div>
            </div>
        `;
    }).join('');

    const container = document.getElementById('app');
    container.innerHTML += `
        <div class="screen active" id="screen-inventory">
            <h3 class="text-center">🎒 Инвентарь</h3>
            <div class="inventory-info" style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 8px;">
                    <span>💰 Ваше золото: ${this.currentHero?.gold.toFixed(2) || 0}</span>
                    <span>🎒 Свободно мест: ${10 - (this.currentHero?.inventory?.length || 0)}/10</span>
                </div>
            </div>
            <div class="inventory-grid">
                ${inventoryHTML || '<div class="text-center">Инвентарь пуст</div>'}
            </div>
            <div class="action-buttons">
                <button class="btn-secondary" onclick="game.closeInventory()">← Назад к герою</button>
            </div>
        </div>
    `;

    this.showScreen('inventory');
};
// ========== МОДУЛЬ 13.2: СНЯТЬ ПРЕДМЕТ ==========
HeroGame.prototype.unequipItem = function(slot) {
    const success = this.unequipToInventory(slot);
    if (success) {
        this.saveGame();
        this.renderHeroScreen();
    }
};
HeroGame.prototype.closeInventory = function() {
    const inventoryScreen = document.getElementById('screen-inventory');
    if (inventoryScreen) {
        inventoryScreen.remove();
    }
    // ВОССТАНАВЛИВАЕМ ГЛАВНЫЙ ЭКРАН ГЕРОЯ
    this.renderHeroScreen();
};
// ========== МОДУЛЬ 14: СИСТЕМА СОХРАНЕНИЯ И ЗАГРУЗКИ ==========

// ========== МОДУЛЬ 14.1: СОХРАНЕНИЕ ИГРЫ (ОБНОВЛЕННЫЙ) ==========
HeroGame.prototype.saveGame = function() {
    if (this.currentHero) {
        // УДАЛЕНО: преобразование Set в Array для локаций
        
        localStorage.setItem('heroGameSave', JSON.stringify({
            currentHeroId: this.currentHero.id,
            heroes: this.heroes,
            // УДАЛЕНО: currentMap, currentLocation, locationProgress, monsterKillCount
            lastHealthUpdate: this.lastHealthUpdate,
            globalInventory: this.globalInventory,
            showVideo: this.showVideo,
            heroStamina: this.currentHero.stamina || 0
        }));
    }
};

// ========== МОДУЛЬ 14.2: ЗАГРУЗКА СОХРАНЕНИЯ (ОБНОВЛЕННЫЙ) ==========
HeroGame.prototype.loadSave = function() {
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
                    deaths: hero.deaths || 0,
                    stamina: hero.stamina || 0
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
            
            // Загрузка остальных данных (УДАЛЕНО: карты и локации)
            this.lastHealthUpdate = data.lastHealthUpdate || Date.now();
            this.globalInventory = data.globalInventory || [];
            this.showVideo = data.showVideo || this.showVideo;
            
            // УДАЛЕНО: восстановление прогресса локаций
            
            // Восстановление текущего героя
            if (currentHeroId) {
                this.currentHero = this.heroes.find(h => h.id === currentHeroId);
                if (this.currentHero) {
                    // Восстанавливаем выносливость из отдельного поля если есть
                    if (data.heroStamina !== undefined) {
                        this.currentHero.stamina = data.heroStamina;
                    }
                    this.showScreen('main');
                    this.renderHeroScreen();
                }
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки сохранения:', error);
    }
};

// ========== МОДУЛЬ 15: ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

// ========== МОДУЛЬ 15.1: ДОБАВЛЕНИЕ СООБЩЕНИЯ В ЛОГ ==========
HeroGame.prototype.addToLog = function(message) {
    const log = document.getElementById('battle-log');
    if (log) {
        const entry = document.createElement('div');
        entry.className = 'log-entry';
        entry.textContent = message;
        log.appendChild(entry);
        log.scrollTop = log.scrollHeight;
    }
};

// ========== МОДУЛЬ 15.2: ДОБАВЛЕНИЕ СООБЩЕНИЯ В ЛОГ БОЯ ==========
HeroGame.prototype.addBattleLog = function(entry) {
    this.battleLog.push(entry);
    if (this.battleLog.length > 10) {
        this.battleLog.shift();
    }
};

// ========== МОДУЛЬ 15.3: ФОРМАТИРОВАНИЕ БОНУСА ==========
HeroGame.prototype.formatBonus = function(bonus) {
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
};

// ========== МОДУЛЬ 15.4: СБРОС ГЕРОЯ ==========
HeroGame.prototype.resetHero = function() {
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
};

// УДАЛЕНЫ МЕТОДЫ ПРОВЕРКИ СПЕЦИАЛЬНЫХ ДРОПОВ:
// HeroGame.prototype.checkSpecialDrops = function() { ... } // УДАЛЕНО
// HeroGame.prototype.dropArtifact = function() { ... } // УДАЛЕНО  
// HeroGame.prototype.dropRelic = function() { ... } // УДАЛЕНО

// ========== МОДУЛЬ 16: СИСТЕМА РЕДКОСТЕЙ ПРЕДМЕТОВ И УЛУЧШЕННЫЙ ИНТЕРФЕЙС ==========

// ========== МОДУЛЬ 16.1: КОНФИГУРАЦИЯ СИСТЕМЫ РЕДКОСТЕЙ ==========
HeroGame.prototype.getRarityConfig = function() {
    return {
        'common': {
            name: 'Обычный',
            color: '#9ca3af',      // Серый
            multiplier: 1.0,
            chance: 0.40
        },
        'uncommon': {
            name: 'Необычный', 
            color: '#4ade80',      // Зеленый
            multiplier: 1.3,
            chance: 0.25
        },
        'rare': {
            name: 'Редкий',
            color: '#4cc9f0',      // Голубой
            multiplier: 1.7,
            chance: 0.15
        },
        'epic': {
            name: 'Эпический',
            color: '#a855f7',      // Фиолетовый
            multiplier: 2.2,
            chance: 0.10
        },
        'legendary': {
            name: 'Легендарный',
            color: '#f59e0b',      // Оранжевый
            multiplier: 3.0,
            chance: 0.07
        },
        'mythic': {
            name: 'Мифический',
            color: '#ff6b6b',      // Красный
            multiplier: 4.0,
            chance: 0.03
        }
    };
};

// ========== МОДУЛЬ 16.2: ГЕНЕРАЦИЯ ПРЕДМЕТА С УЧЕТОМ РЕДКОСТИ ==========
HeroGame.prototype.generateItemWithRarity = function(baseItem, forceRarity = null) {
    const rarityConfig = this.getRarityConfig();
    let selectedRarity = forceRarity;
    
    if (!selectedRarity) {
        const rand = Math.random();
        let cumulativeChance = 0;
        
        for (const [rarity, config] of Object.entries(rarityConfig)) {
            cumulativeChance += config.chance;
            if (rand <= cumulativeChance) {
                selectedRarity = rarity;
                break;
            }
        }
    }
    
    const config = rarityConfig[selectedRarity];
    const multiplier = config.multiplier;
    
    // Создаем улучшенный предмет на основе редкости
    const enhancedItem = {
        ...baseItem,
        id: Date.now() + Math.random(), // Уникальный ID
        rarity: selectedRarity,
        name: this.getEnhancedItemName(baseItem.name, selectedRarity),
        price: Math.round(baseItem.price * multiplier),
        fixed_damage: baseItem.fixed_damage ? Math.round(baseItem.fixed_damage * multiplier) : 0,
        fixed_armor: baseItem.fixed_armor ? Math.round(baseItem.fixed_armor * multiplier) : 0,
        fixed_health: baseItem.fixed_health ? Math.round(baseItem.fixed_health * multiplier) : 0,
        bonus: this.enhanceBonus(baseItem.bonus, multiplier)
    };
    
    return enhancedItem;
};

// ========== МОДУЛЬ 16.3: УЛУЧШЕНИЕ НАЗВАНИЯ ПРЕДМЕТА ==========
HeroGame.prototype.getEnhancedItemName = function(baseName, rarity) {
    const prefixes = {
        'common': ['', 'Простой'],
        'uncommon': ['Улучшенный', 'Качественный'],
        'rare': ['Редкий', 'Искусный'],
        'epic': ['Эпический', 'Могущественный'],
        'legendary': ['Легендарный', 'Великий'],
        'mythic': ['Мифический', 'Божественный']
    };
    
    const prefix = prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];
    return prefix ? `${prefix} ${baseName}` : baseName;
};

// ========== МОДУЛЬ 16.4: УЛУЧШЕНИЕ БОНУСА ПРЕДМЕТА ==========
HeroGame.prototype.enhanceBonus = function(bonus, multiplier) {
    if (!bonus || bonus.type === 'none') return bonus;
    
    return {
        ...bonus,
        value: bonus.value * multiplier
    };
};

// ========== МОДУЛЬ 16.5: ВСПЛЫВАЮЩЕЕ УВЕДОМЛЕНИЕ ==========
HeroGame.prototype.showNotification = function(message, type = 'info') {
    // Удаляем существующие уведомления
    const existingNotifications = document.querySelectorAll('.game-notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = `game-notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">OK</button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
};

// ВАШ СУЩЕСТВУЮЩИЙ КОД...

// ========== ДОБАВЛЯЕМ ОТСУТТСТВУЮЩИЕ МЕТОДЫ ==========

// Метод для получения имени слота
HeroGame.prototype.getSlotName = function(slot) {
    const slotNames = {
        'main_hand': '⚔️ Правая рука',
        'off_hand': '🛡️ Левая рука', 
        'helmet': '⛑️ Шлем',
        'chest': '👕 Нагрудник',
        'gloves': '🧤 Перчатки',
        'legs': '👖 Поножи',
        'boots': '👢 Ботинки'
    };
    return slotNames[slot] || 'Слот';
};

// Метод для получения подходящих слотов для предмета
HeroGame.prototype.getSuitableSlotsForItem = function(item) {
    if (!item) return [];
    
    const slotMap = {
        'weapon': {
            'one_handed': ['main_hand', 'off_hand'],
            'two_handed': ['main_hand'],
            'shield': ['off_hand']
        },
        'helmet': ['helmet'],
        'chest': ['chest'],
        'gloves': ['gloves'],
        'legs': ['legs'],
        'boots': ['boots']
    };

    if (item.type === 'weapon' && item.weaponType && slotMap.weapon[item.weaponType]) {
        return slotMap.weapon[item.weaponType];
    }
    
    return slotMap[item.type] || [];
};

// Заглушки для удаленных методов
HeroGame.prototype.updateLocationProgress = function() {
    // Метод удален, но оставляем заглушку
};

HeroGame.prototype.getItemsForSlot = function(slot) {
    if (!this.currentHero || !this.currentHero.inventory) return [];
    
    return this.currentHero.inventory.filter(itemId => {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return false;
        const suitableSlots = this.getSuitableSlotsForItem(item);
        return suitableSlots.includes(slot);
    });
};

// Метод для получения типа слота из элемента
HeroGame.prototype.getSlotTypeFromElement = function(element) {
    if (element.classList.contains('main-hand')) return 'main_hand';
    if (element.classList.contains('off-hand')) return 'off_hand';
    if (element.classList.contains('helmet-slot')) return 'helmet';
    if (element.classList.contains('chest-slot')) return 'chest';
    if (element.classList.contains('gloves-slot')) return 'gloves';
    if (element.classList.contains('legs-slot')) return 'legs';
    if (element.classList.contains('boots-slot')) return 'boots';
    return null;
};

// Метод обновления отображения экипировки
HeroGame.prototype.updateEquipmentDisplay = function() {
    if (!this.currentHero) return;
    
    // Обновляем отображение слотов экипировки
    const equipmentSlots = document.querySelectorAll('.equipment-slot');
    
    equipmentSlots.forEach(slotElement => {
        const slotType = this.getSlotTypeFromElement(slotElement);
        if (!slotType) return;
        
        const itemId = this.currentHero.equipment[slotType];
        const slotIcon = slotElement.querySelector('.equipment-icon');
        
        if (itemId) {
            const item = this.items.find(i => i.id === itemId);
            if (item) {
                // Обновляем иконку предмета
                slotIcon.innerHTML = `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">`;
                
                // Устанавливаем классы редкости
                slotElement.classList.add('equipped');
                slotElement.setAttribute('data-rarity', item.rarity || 'common');
            }
        } else {
            // Слот пустой - показываем стандартную иконку
            const defaultIcons = {
                'main_hand': '⚔️',
                'off_hand': '🛡️',
                'helmet': '⛑️',
                'chest': '👕',
                'gloves': '🧤',
                'legs': '👖',
                'boots': '👢'
            };
            
            slotIcon.innerHTML = defaultIcons[slotType] || '🎒';
            slotElement.classList.remove('equipped');
            slotElement.removeAttribute('data-rarity');
        }
    });
};

// Метод обновления статистики героя
HeroGame.prototype.updateHeroStatsDisplay = function() {
    if (!this.currentHero) return;
    
    const stats = this.calculateHeroStats(this.currentHero);
    
    // Обновляем здоровье
    const healthPercent = (stats.currentHealth / stats.maxHealth) * 100;
    const healthFill = document.querySelector('.health-bar-fill');
    const currentHealthEl = document.getElementById('current-health');
    const maxHealthEl = document.getElementById('max-health');
    
    if (healthFill) healthFill.style.width = healthPercent + '%';
    if (currentHealthEl) currentHealthEl.textContent = stats.currentHealth;
    if (maxHealthEl) maxHealthEl.textContent = stats.maxHealth;
};
// ========== ОТЛАДОЧНЫЙ МЕТОД ==========
HeroGame.prototype.debugHeroes = function() {
    console.log('=== ОТЛАДОЧНАЯ ИНФОРМАЦИЯ О ГЕРОЯХ ===');
    this.heroes.forEach(hero => {
        console.log(`Герой ${hero.id}: ${hero.name}`, {
            unlocked: hero.unlocked,
            level: hero.level,
            health: this.calculateMaxHealth(hero)
        });
    });
    
    // Принудительно разблокируем первого героя если нужно
    const firstHero = this.heroes.find(h => h.id === 1);
    if (firstHero) {
        firstHero.unlocked = true;
        console.log('✅ Первый герой принудительно разблокирован');
        this.renderHeroSelect();
    }
};
// ========== МОДУЛЬ 17: ЗАПУСК ИГРЫ ==========
console.log('🚀 Script.js загружен!');

let game;

// Запуск игры после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM загружен');
        try {
            game = new HeroGame();
            window.game = game;
            console.log('✅ Игра успешно инициализирована');
        } catch (error) {
            console.error('❌ Ошибка инициализации игры:', error);
        }
    });
} else {
    console.log('✅ DOM уже готов');
    try {
        game = new HeroGame();
        window.game = game;
        console.log('✅ Игра успешно инициализирована');
    } catch (error) {
        console.error('❌ Ошибка инициализации игры:', error);
    }
}
