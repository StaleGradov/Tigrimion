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
        
        // Общий инвентарь
        this.globalInventory = [];
        
        // Система прогресса локаций
        this.locationProgress = {
            10: { unlocked: true, monstersKilled: 0, totalMonsters: 10 },
            9: { unlocked: false, monstersKilled: 0, totalMonsters: 15 },
            8: { unlocked: false, monstersKilled: 0, totalMonsters: 20 },
            7: { unlocked: false, monstersKilled: 0, totalMonsters: 25 },
            6: { unlocked: false, monstersKilled: 0, totalMonsters: 30 },
            5: { unlocked: false, monstersKilled: 0, totalMonsters: 35 },
            4: { unlocked: false, monstersKilled: 0, totalMonsters: 40 },
            3: { unlocked: false, monstersKilled: 0, totalMonsters: 45 },
            2: { unlocked: false, monstersKilled: 0, totalMonsters: 50 },
            1: { unlocked: false, monstersKilled: 0, totalMonsters: 55 }
        };
        
        this.init();
    }

    async init() {
        await this.loadGameData();
        this.loadSave();
        
        // Гарантируем что первый герой разблокирован
        if (this.heroes.length > 0) {
            const firstHero = this.heroes.find(h => h.id === 1);
            if (firstHero) {
                firstHero.unlocked = true;
            }
        }
        
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

            // Принудительно разблокируем первого героя
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

    // Создание минимальных данных при ошибке загрузки
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

        this.monsters = [{
            id: 1,
            name: "Слабый монстр",
            health: 30,
            maxHealth: 30,
            attack: 5,
            defense: 2,
            speed: 3,
            experience: 5,
            reward: 10
        }];

        this.items = [{
            id: 1,
            name: "Малое зелье здоровья",
            type: "potion",
            value: 20,
            price: 25,
            heal: 20
        }];

        this.maps = [{
            id: 1, 
            name: "Арканиум", 
            image: "images/maps/arcanium.jpg", 
            description: "Земля древней магии", 
            multiplier: 1.0, 
            unlocked: true 
        }];

        this.locations = [{
            level: 10, 
            name: "Начальные земли", 
            description: "Мягкий климат, слабые монстры", 
            image: "images/locations/level10.jpg",
            monsterRange: [1, 10], 
            artifactChance: 0.005, 
            relicChance: 0.0005 
        }];
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
        
        this.addToLog(`🎉 Уровень повышен! Теперь уровень ${newLevel}`);
        this.addToLog(`❤️ +${healthIncrease} здоровья`);
        this.addToLog(`⚔️ +${damageIncrease} урона`);
        this.addToLog(`🛡️ +${armorIncrease} брони`);
        
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
        
        Object.entries(heroUnlockLevels).forEach(([heroId, requiredLevel]) => {
            const hero = this.heroes.find(h => h.id === parseInt(heroId));
            if (hero && !hero.unlocked && this.currentHero.level >= requiredLevel) {
                hero.unlocked = true;
                this.addToLog(`🔓 Разблокирован новый герой: ${hero.name}!`);
            }
        });
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

    // Метод для расчета максимального здоровья (с учетом всех бонусов)
    calculateMaxHealth(hero = this.currentHero) {
        if (!hero) return 0;
        
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

        // Бонусы к здоровью
        allBonuses.forEach(bonus => {
            if (bonus.type === 'health_mult') {
                health *= (1 + bonus.value);
            }
        });

        return Math.round(health);
    }

    // Новый метод для отображения здоровья в реальном времени (ИСПРАВЛЕННЫЙ)
    getCurrentHealthForDisplay(hero = this.currentHero) {
        if (!hero) return 0;
        
        const now = Date.now();
        const timePassed = (now - this.lastHealthUpdate) / 1000;
        
        if (!hero.currentHealth) {
            hero.currentHealth = this.calculateMaxHealth(hero);
        }
        
        let currentHealth = hero.currentHealth;
        const maxHealth = this.calculateMaxHealth(hero);
        
        if (currentHealth < maxHealth) {
            const healthToRegen = timePassed * (hero.healthRegen || 100/60);
            currentHealth = Math.min(maxHealth, currentHealth + healthToRegen);
            
            // Обновляем время только если была регенерация
            if (currentHealth > hero.currentHealth) {
                this.lastHealthUpdate = now;
                hero.currentHealth = currentHealth;
                this.saveGame();
            }
        }
        
        return currentHealth;
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

        // Текущее здоровье рассчитывается с учетом регенерации
        const currentHealth = this.getCurrentHealthForDisplay(hero);

        return {
            health: Math.round(health),
            currentHealth: Math.floor(currentHealth),
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

    renderHeroSelect() {
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="screen active" id="screen-hero-select">
                <h2 class="text-center">Выберите героя</h2>
                <div class="hero-list">
                    ${this.heroes.map(hero => {
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
                healthFill.style.width = `${healthPercent}%`;
                currentHealthEl.textContent = stats.currentHealth;
                maxHealthEl.textContent = stats.maxHealth;
            }
        };

        // Обновляем отображение здоровья каждую секунду
        this.healthInterval = setInterval(updateHealthDisplay, 1000);
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

    // Рассчитываем процент здоровья для прогресс-бара
    const healthPercent = (stats.currentHealth / stats.maxHealth) * 100;

    const container = document.getElementById('app');
    container.innerHTML = `
        <div class="screen active" id="screen-main">
            <!-- Кнопки действий - ТЕПЕРЬ В САМОМ ВЕРХУ -->
            <div class="action-buttons">
                <button class="btn-primary" onclick="game.startAdventure()">🎲 Начать путешествие</button>
                <button class="btn-secondary" onclick="game.showInventory()">🎒 Инвентарь</button>
                <button class="btn-secondary" onclick="game.showMerchant()">🏪 Магазин</button>
                <button class="btn-danger" onclick="game.resetHero()">🔄 Сбросить героя</button>
                <button class="btn-secondary" onclick="game.renderHeroSelect()">🔁 Сменить героя</button>
            </div>

            <!-- Секция боя - ТЕПЕРЬ ВЫШЕ ОСНОВНОГО КОНТЕНТА -->
            <div class="battle-section">
                <div class="monster-reward-column">
                    <div class="column-title">🎭 ВРАГ / 🎁 НАГРАДА</div>
                    ${this.renderMonsterRewardColumn()}
                </div>
            </div>

            <div class="hero-layout">
                <!-- Левая колонка - Герой (РАСШИРЕНА) -->
                <div class="hero-column">
                    <div class="column-title">🎯 ВАШ ГЕРОЙ</div>
                    <div class="hero-image">
                        <img src="${this.currentHero.image}" alt="${this.currentHero.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                    </div>
                    <div class="hero-info">
                        <h2>${this.currentHero.name}</h2>
                        
                        <!-- Анимированная шкала здоровья -->
                        <div class="health-display">
                            <div class="health-bar-container">
                                <div class="health-bar">
                                    <div class="health-bar-fill" style="width: ${healthPercent}%"></div>
                                </div>
                                <div class="health-text">
                                    ❤️ <span id="current-health">${stats.currentHealth}</span> / <span id="max-health">${stats.maxHealth}</span>
                                </div>
                            </div>
                            <div class="health-regen">
                                ⚡ Регенерация: ${Math.round(this.currentHero.healthRegen * 60)}/мин
                            </div>
                        </div>

                        <div class="hero-main-stats">
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
                        
                        <!-- ЭКИПИРОВКА ПЕРЕМЕЩЕНА СЮДА -->
                        <div class="equipment-section">
                            <div class="equipment-slot ${weapon ? 'equipped' : 'empty'}" onclick="game.showInventory()">
                                <div class="equipment-icon">
                                    ${weapon ? `<img src="${weapon.image}" alt="${weapon.name}" onerror="this.style.display='none'">` : ''}
                                </div>
                                <div>
                                    <strong>⚔️ Оружие</strong>
                                    <div>${weapon ? weapon.name : 'Пусто'}</div>
                                    ${weapon ? `<small>${this.formatBonus(weapon.bonus)}</small>` : ''}
                                </div>
                            </div>
                            
                            <div class="equipment-slot ${armor ? 'equipped' : 'empty'}" onclick="game.showInventory()">
                                <div class="equipment-icon">
                                    ${armor ? `<img src="${armor.image}" alt="${armor.name}" onerror="this.style.display='none'">` : ''}
                                </div>
                                <div>
                                    <strong>🛡️ Броня</strong>
                                    <div>${armor ? armor.name : 'Пусто'}</div>
                                    ${armor ? `<small>${this.formatBonus(armor.bonus)}</small>` : ''}
                                </div>
                            </div>
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

            <!-- Журнал событий -->
            <div class="battle-log" id="battle-log"></div>
        </div>
    `;

    // Запускаем анимацию обновления здоровья
    this.startHealthAnimation();

    if (this.battleActive) {
        this.renderBattleInMonsterColumn();
    }
}

    // Рендер выбора карты
    renderMapSelection() {
        if (this.currentMap) {
            return `
                <div class="map-info">
                    <div class="map-image-large">
                        <img src="${this.currentMap.image}" alt="${this.currentMap.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
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
            const progress = this.locationProgress[this.currentLocation.level];
            const progressText = progress ? `Прогресс: ${progress.monstersKilled}/${progress.totalMonsters}` : '';
            
            return `
                <div class="location-info">
                    <div class="location-image-large">
                        <img src="${this.currentLocation.image}" alt="${this.currentLocation.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                    </div>
                    <h4>${this.currentLocation.name} (Ур. ${this.currentLocation.level})</h4>
                    <p>${this.currentLocation.description}</p>
                    <div class="location-stats">
                        <div>Монстры: №${this.currentLocation.monsterRange[0]}-${this.currentLocation.monsterRange[1]}</div>
                        <div>Артефакты: ${(this.currentLocation.artifactChance * 100).toFixed(2)}%</div>
                        <div>Реликвии: ${(this.currentLocation.relicChance * 100).toFixed(2)}%</div>
                        ${progressText ? `<div>${progressText}</div>` : ''}
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

    // Показать выбор локации с проверкой доступности
    showLocationSelection() {
        if (!this.currentMap) {
            this.addToLog('❌ Сначала выберите карту');
            return;
        }

        const locationsHTML = this.locations.map(location => {
            const progress = this.locationProgress[location.level];
            const isUnlocked = progress ? progress.unlocked : false;
            const progressText = progress ? `(${progress.monstersKilled}/${progress.totalMonsters})` : '';

            return `
                <div class="location-option ${isUnlocked ? '' : 'locked'}" 
                     onclick="${isUnlocked ? `game.selectLocation(${location.level})` : ''}">
                    <div class="location-option-image">
                        <img src="${location.image}" alt="${location.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                        ${!isUnlocked ? '<div class="locked-overlay">🔒</div>' : ''}
                    </div>
                    <div class="location-option-info">
                        <strong>${location.name} (Ур. ${location.level})</strong>
                        <div>${location.description}</div>
                        <small>Монстры: №${location.monsterRange[0]}-${location.monsterRange[1]}</small>
                        ${isUnlocked ? `<small>Прогресс: ${progressText}</small>` : ''}
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

// В классе HeroGame находим метод encounterMonster и исправляем его:

// Встреча с монстром
encounterMonster() {
    if (!this.currentLocation || !this.currentMap) {
        console.error('❌ Не выбрана локация или карта');
        return;
    }

    const [minId, maxId] = this.currentLocation.monsterRange;
    
    // Фиксим баг: проверяем что диапазон монстров существует
    if (!minId || !maxId) {
        console.error('❌ Неверный диапазон монстров в локации:', this.currentLocation);
        return;
    }
    
    const monsterId = Math.floor(Math.random() * (maxId - minId + 1)) + minId;
    
    let monster = this.monsters.find(m => m.id === monsterId);
    if (!monster) {
        // Если монстр не найден, берем первого доступного
        monster = this.monsters[0];
        if (!monster) {
            console.error('❌ Нет доступных монстров');
            return;
        }
    }

    // Применяем множитель карты
    this.currentMonster = {
        ...monster,
        health: Math.round(monster.health * this.currentMap.multiplier),
        damage: Math.round(monster.damage * this.currentMap.multiplier),
        armor: Math.round(monster.armor * this.currentMap.multiplier),
        reward: Math.round(monster.reward * this.currentMap.multiplier),
        power: Math.round(((monster.health / 10) + (monster.damage * 1.5) + (monster.armor * 2)) * this.currentMap.multiplier)
    };

    this.addToLog(`🎭 Встречен: ${this.currentMonster.name}`);
    this.renderHeroScreen();
    this.showMonsterActions();
}

// Также проверяем метод startAdventure:
startAdventure() {
    if (!this.currentMap || !this.currentLocation) {
        this.addToLog('❌ Сначала выберите карту и локацию');
        return;
    }

    this.addToLog(`🚀 Начато путешествие по карте ${this.currentMap.name}, локация: ${this.currentLocation.name}`);
    
    // Добавляем небольшую задержку для лучшего UX
    setTimeout(() => {
        this.encounterMonster();
    }, 1000);
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

    // ========== СИСТЕМА БОЯ В ОКНЕ МОНСТРА ==========

    // Начать бой
    startBattle() {
        if (!this.currentMonster || this.battleActive) return;
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        
        if (!this.currentHero.currentHealth) {
            this.currentHero.currentHealth = this.calculateMaxHealth();
        }
        
        this.currentMonster.currentHealth = this.currentMonster.health;
        
        this.addToLog(`⚔️ Начало боя с ${this.currentMonster.name}!`);
        this.renderBattleInMonsterColumn();
    }

    // Рендер боя в колонке монстра
    renderBattleInMonsterColumn() {
        if (!this.battleActive) return;
        
        const stats = this.calculateHeroStats(this.currentHero);
        const heroHealthPercent = (this.currentHero.currentHealth / stats.maxHealth) * 100;
        const monsterHealthPercent = (this.currentMonster.currentHealth / this.currentMonster.health) * 100;
        
        const battleHTML = `
            <div class="battle-in-monster-column">
                <div class="battle-header">
                    <h4>⚔️ БОЙ С ${this.currentMonster.name.toUpperCase()}</h4>
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
                            <div>⚔️${stats.damage} 🛡️${stats.armor}</div>
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
                            <div>⚔️${this.currentMonster.damage} 🛡️${this.currentMonster.armor}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Лог боя -->
                <div class="battle-log-compact">
                    ${this.battleLog.slice(-3).map(entry => `
                        <div class="battle-log-entry-compact ${entry.type || ''}">${entry.message}</div>
                    `).join('')}
                </div>
                
                <!-- Кнопки действий -->
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
        
        // Заменяем содержимое колонки монстра на бой
        const monsterColumn = document.querySelector('.monster-reward-column');
        if (monsterColumn) {
            monsterColumn.innerHTML = `
                <div class="column-title">⚔️ БОЙ</div>
                ${battleHTML}
            `;
        }
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
        this.updateHealth(-monsterDamage);
        
        this.addBattleLog({
            message: `👹 ${this.currentMonster.name} наносит ${monsterDamage} урона!`,
            type: 'monster-attack'
        });
        
        if (this.currentHero.currentHealth <= 0) {
            this.endBattle(false);
            return;
        }
        
        this.saveGame();
        this.renderBattleInMonsterColumn();
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
            this.lastReward = reward;
            
            const baseExperience = Math.max(10, Math.floor(this.currentMonster.power / 2));
            const experienceGained = baseExperience;
            
            this.addExperience(experienceGained);
            
            // ОБНОВЛЯЕМ ПРОГРЕСС ЛОКАЦИИ
            if (this.currentLocation) {
                this.updateLocationProgress();
            }
            
            this.addBattleLog({
                message: `🎉 ПОБЕДА! Получено ${reward} золота и ${experienceGained} опыта`,
                type: 'victory'
            });
            
            this.addToLog(`🎯 Побежден ${this.currentMonster.name}! Получено ${reward} золота и ${experienceGained} опыта`);
            
            this.checkSpecialDrops();
            
            // Показываем награду в колонке монстра
            this.showRewardInMonsterColumn(reward);
            
        } else {
            this.addBattleLog({
                message: `💀 ПОРАЖЕНИЕ! Герой повержен`,
                type: 'defeat'
            });
            
            this.addToLog(`💥 Проигран бой с ${this.currentMonster.name}`);
            
            // Показываем поражение в колонке монстра
            this.showDefeatInMonsterColumn();
        }
        
        this.battleActive = false;
        this.currentMonster = null;
    }

    // Показать награду в колонке монстра
    showRewardInMonsterColumn(reward) {
        const experienceGained = Math.max(10, Math.floor(this.currentMonster.power / 2));
        
        const monsterColumn = document.querySelector('.monster-reward-column');
        if (monsterColumn) {
            monsterColumn.innerHTML = `
                <div class="column-title">🎁 НАГРАДА</div>
                <div class="reward-display">
                    <div class="reward-image-large">
                        💰
                    </div>
                    <div class="reward-info">
                        <h4>🎉 ПОБЕДА!</h4>
                        <p>Вы победили ${this.currentMonster ? this.currentMonster.name : 'монстра'}!</p>
                        <div class="reward-amount">
                            +${reward} золота<br>
                            +${experienceGained} опыта
                        </div>
                        <button class="btn-primary" onclick="game.continueAfterBattle()">Продолжить</button>
                    </div>
                </div>
            `;
        }
    }

    // Показать поражение в колонке монстра
    showDefeatInMonsterColumn() {
        const monsterColumn = document.querySelector('.monster-reward-column');
        if (monsterColumn) {
            monsterColumn.innerHTML = `
                <div class="column-title">💀 ПОРАЖЕНИЕ</div>
                <div class="defeat-display">
                    <div class="defeat-image">
                        💀
                    </div>
                    <div class="defeat-info">
                        <h4>Вы проиграли бой!</h4>
                        <p>Герой повержен и нуждается в лечении.</p>
                        <button class="btn-primary" onclick="game.continueAfterBattle()">Продолжить</button>
                    </div>
                </div>
            `;
        }
    }

    // Продолжить после боя
    continueAfterBattle() {
        this.renderHeroScreen();
    }

    // Обновление здоровья (ИСПРАВЛЕННЫЙ метод)
    updateHealth(change) {
        if (!this.currentHero) return;
        
        if (!this.currentHero.currentHealth) {
            this.currentHero.currentHealth = this.calculateMaxHealth();
        }
        
        this.currentHero.currentHealth += change;
        const maxHealth = this.calculateMaxHealth();
        
        // Ограничиваем здоровье в пределах 0 - максимум (с учетом всех бонусов)
        this.currentHero.currentHealth = Math.max(0, Math.min(maxHealth, this.currentHero.currentHealth));
        
        this.lastHealthUpdate = Date.now();
        this.saveGame();
    }

    // Обновление прогресса локации
    updateLocationProgress() {
        if (!this.currentLocation) return;
        
        const locationLevel = this.currentLocation.level;
        const progress = this.locationProgress[locationLevel];
        
        if (progress) {
            progress.monstersKilled++;
            
            // Проверяем завершение локации
            if (progress.monstersKilled >= progress.totalMonsters) {
                this.completeLocation(locationLevel);
            }
            
            this.saveGame();
        }
    }

    // Завершение локации и открытие следующей
    completeLocation(locationLevel) {
        const nextLocationLevel = locationLevel - 1;
        const nextProgress = this.locationProgress[nextLocationLevel];
        
        if (nextProgress) {
            nextProgress.unlocked = true;
            this.addToLog(`🎉 Локация "${this.getLocationName(locationLevel)}" завершена!`);
            this.addToLog(`🔓 Открыта новая локация: "${this.getLocationName(nextLocationLevel)}"`);
        }
        
        this.saveGame();
    }

    // Вспомогательная функция для получения названия локации
    getLocationName(level) {
        const location = this.locations.find(l => l.level === level);
        return location ? location.name : `Локация ${level}`;
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
            this.updateHealth(-monsterDamage);
            
            if (this.currentHero.currentHealth <= 0) {
                this.endBattle(false);
            } else {
                this.saveGame();
                this.renderBattleInMonsterColumn();
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

    // Рендер колонки монстра/награды
    renderMonsterRewardColumn() {
        if (this.currentMonster) {
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

    // Рендер монстра
    renderMonsterDisplay() {
        if (!this.currentMonster) return '';
        
        const stats = this.calculateHeroStats(this.currentHero);
        const powerComparison = stats.power >= this.currentMonster.power ? '✅ ПРЕИМУЩЕСТВО' : '⚠️ РИСК';

        return `
            <div class="monster-info">
                <div class="monster-image-large">
                                    <img src="${this.currentMonster.image}" alt="${this.currentMonster.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
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

    // Выбор карты
    selectMap(mapId) {
        this.currentMap = this.maps.find(m => m.id === mapId);
        this.addToLog(`🗺️ Выбрана карта: ${this.currentMap.name}`);
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

        // Определяем слот предмета
        let slot = 'main_hand'; // по умолчанию
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

        // При экипировке предмета с бонусом к здоровью, обновляем текущее здоровье
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
                globalInventory: this.globalInventory,
                locationProgress: this.locationProgress
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
                this.locationProgress = data.locationProgress || this.locationProgress;
                
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

// Создание экземпляра игры
let game;

// Запускаем игру когда DOM готов
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM загружен');
        game = new HeroGame();
        window.game = game; // Делаем глобально доступным
    });
} else {
    console.log('✅ DOM уже готов');
    game = new HeroGame();
    window.game = game; // Делаем глобально доступным
}
