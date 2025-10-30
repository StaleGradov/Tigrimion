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
        
        // Новые свойства для боя
        this.battleActive = false;
        this.battleRound = 0;
        this.battleLog = [];
        this.lastHealthUpdate = Date.now();
        this.healthRegenRate = 100 / 60;
        
        // Прогресс убийств монстров
        this.monsterKills = {};
        
        this.init();
    }

    async init() {
        await this.loadGameData();
        this.loadSave();
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

            // Просто присваиваем данные из JSON
            this.heroes = heroes || [];
            this.monsters = enemies || [];
            this.items = items || [];
            this.maps = mapsData || [];
            this.locations = locationsData || [];

            console.log('✅ Все данные загружены из JSON файлов');

        } catch (error) {
            console.error('❌ Критическая ошибка загрузки данных:', error);
            this.heroes = [];
            this.monsters = [];
            this.items = [];
            this.maps = [];
            this.locations = [];
        }
    }

    // Система уровней
    getLevelRequirements() {
        return {
            1: 0,
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

    // Проверка доступности локации
    isLocationUnlocked(locationLevel) {
        if (locationLevel === 10) return true; // Первая локация всегда доступна
        
        const nextLocation = locationLevel + 1;
        if (!this.monsterKills[nextLocation]) return false;
        
        // Проверяем, убиты ли все монстры в предыдущей локации
        const location = this.locations.find(l => l.level === nextLocation);
        if (!location) return false;
        
        const [minId, maxId] = location.monsterRange;
        for (let i = minId; i <= maxId; i++) {
            if (!this.monsterKills[nextLocation][i]) {
                return false;
            }
        }
        return true;
    }

    // Отметить убийство монстра
    markMonsterKill(locationLevel, monsterId) {
        if (!this.monsterKills[locationLevel]) {
            this.monsterKills[locationLevel] = {};
        }
        this.monsterKills[locationLevel][monsterId] = true;
        this.saveGame();
    }

    // Бонусы рас, профессий и саг
    getBonuses() {
        return {
            races: {
                elf: { 
                    bonus: {type: "escape_bonus", value: 1}, 
                    name: "Эльф", 
                    description: "Проворный и неуловимый" 
                },
                dwarf: { 
                    bonus: {type: "health_mult", value: 0.3}, 
                    name: "Гном", 
                    description: "Выносливый и крепкий" 
                },
                halfling: { 
                    bonus: {type: "stealth_bonus", value: 1}, 
                    name: "Полурослик", 
                    description: "Маленький и незаметный" 
                },
                fairy: { 
                    bonus: {type: "luck_bonus", value: 1}, 
                    name: "Фея", 
                    description: "Везение и магия" 
                },
                laitar: { 
                    bonus: {type: "survival_bonus", value: 1}, 
                    name: "Лайтар", 
                    description: "Мастер выживания" 
                },
                ork: { 
                    bonus: {type: "damage_mult", value: 0.2}, 
                    name: "Орк", 
                    description: "Сильный и свирепый" 
                },
                human: { 
                    bonus: {type: "gold_mult", value: 0.3}, 
                    name: "Человек", 
                    description: "Предприимчивый и богатый" 
                },
                dragon: { 
                    bonus: {type: "armor_mult", value: 0.15}, 
                    name: "Дракон", 
                    description: "Могучий и защищённый" 
                }
            },
            classes: {
                archer: { 
                    bonus: {type: "damage_mult", value: 0.2}, 
                    name: "Лучник", 
                    description: "Мастер дальнего боя" 
                },
                warrior: { 
                    bonus: {type: "damage_mult", value: 0.2}, 
                    name: "Воин", 
                    description: "Сильный и отважный" 
                },
                thief: { 
                    bonus: {type: "stealth_bonus", value: 1}, 
                    name: "Вор", 
                    description: "Тихий и незаметный" 
                },
                merchant: { 
                    bonus: {type: "gold_mult", value: 0.3}, 
                    name: "Торговец", 
                    description: "Искусный торговец" 
                },
                fighter: { 
                    bonus: {type: "luck_bonus", value: 1}, 
                    name: "Кулачный боец", 
                    description: "Удачливый боец" 
                },
                healer: { 
                    bonus: {type: "health_mult", value: 0.3}, 
                    name: "Знахарь", 
                    description: "Мастер исцеления" 
                },
                sorcerer: { 
                    bonus: {type: "escape_bonus", value: 1}, 
                    name: "Колдун", 
                    description: "Магическая защита" 
                },
                death_mage: { 
                    bonus: {type: "stealth_bonus", value: 1}, 
                    name: "Волхв смерти", 
                    description: "Тёмные искусства" 
                },
                hunter: { 
                    bonus: {type: "survival_bonus", value: 1}, 
                    name: "Охотник", 
                    description: "Следопыт и выживальщик" 
                },
                bounty_hunter: { 
                    bonus: {type: "damage_mult", value: 0.1}, 
                    name: "Охотник за головами", 
                    description: "Специалист по преследованию" 
                },
                gladiator: { 
                    bonus: {type: "damage_mult", value: 0.2}, 
                    name: "Гладиатор", 
                    description: "Мастер любого оружия" 
                },
                blacksmith: { 
                    bonus: {type: "armor_mult", value: 0.15}, 
                    name: "Кузнец", 
                    description: "Мастер брони" 
                },
                antiquarian: { 
                    bonus: {type: "gold_mult", value: 0.3}, 
                    name: "Искатель древностей", 
                    description: "Знаток сокровищ" 
                }
            },
            sagas: {
                golden_egg: { 
                    bonus: {type: "health_mult", value: 0.3}, 
                    name: "Золотое Яйцо", 
                    description: "Обладатель древнего артефакта" 
                },
                vulkanor: { 
                    bonus: {type: "damage_mult", value: 0.2}, 
                    name: "Вулканор", 
                    description: "Прошедший огненные испытания" 
                },
                well: { 
                    bonus: {type: "gold_mult", value: 0.3}, 
                    name: "Колодец", 
                    description: "Нашедший источник богатства" 
                },
                pets: { 
                    bonus: {type: "luck_bonus", value: 1}, 
                    name: "Питомцы", 
                    description: "Верные спутники приносят удачу" 
                },
                following_sun: { 
                    bonus: {type: "survival_bonus", value: 1}, 
                    name: "Вслед за солнцем", 
                    description: "Прошедший через пустыни" 
                },
                vampire_crown: { 
                    bonus: {type: "stealth_bonus", value: 1}, 
                    name: "Корона короля вампиров", 
                    description: "Носитель тёмной короны" 
                },
                tiger_eye: { 
                    bonus: {type: "armor_mult", value: 0.15}, 
                    name: "Желтый Глаз тигра", 
                    description: "Обладатель мистической защиты" 
                },
                sky_phenomena: { 
                    bonus: {type: "escape_bonus", value: 1}, 
                    name: "Небесные явления", 
                    description: "Свидетель небесных чудес" 
                }
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

        // Навыки
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

    // Рендер выбора героя
    renderHeroSelect() {
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="screen active" id="screen-hero-select">
                <h2 class="text-center">Выберите героя</h2>
                <div class="hero-list">
                    ${this.heroes.map(hero => {
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

                        return `
                            <div class="hero-option ${hero.unlocked ? '' : 'locked'}" 
                                 onclick="${hero.unlocked ? `game.selectHero(${hero.id})` : ''}">
                                <div class="hero-option-image">
                                    <img src="${hero.image}" alt="${hero.name}" onerror="this.src='images/heroes/default.jpg'">
                                    ${!hero.unlocked ? '<div class="locked-overlay">🔒</div>' : ''}
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
                                    ${!hero.unlocked ? '<small class="locked-text">Требуется уровень: ' + (hero.id * 5) + '</small>' : ''}
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
        this.currentHero = this.heroes.find(h => h.id === heroId);
        // Автоматически выбираем первую карту и локацию
        this.currentMap = this.maps.find(m => m.unlocked);
        this.currentLocation = this.locations.find(l => l.unlocked);
        
        this.showScreen('main');
        this.renderHeroScreen();
        this.saveGame();
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
                            <img src="${this.currentHero.image}" alt="${this.currentHero.name}" onerror="this.src='images/heroes/default.jpg'">
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
                        <div class="column-title">🗺️ КАРТА</div>
                        ${this.renderMapSelection()}
                    </div>

                    <!-- Правая колонка - Локация -->
                    <div class="location-column">
                        <div class="column-title">📍 ЛОКАЦИЯ</div>
                        ${this.renderLocationSelection()}
                    </div>
                </div>

                <!-- Нижняя часть - монстр/бой -->
                <div class="battle-section">
                    <div class="monster-reward-column">
                        <div class="column-title">🎭 ВРАГ</div>
                        ${this.renderMonsterColumn()}
                    </div>
                </div>

                <!-- Секция экипировки -->
                <div class="equipment-section">
                    <div class="equipment-slot ${weapon ? 'equipped' : 'empty'}" onclick="game.showInventory()">
                        <div class="equipment-icon">
                            ${weapon ? `<img src="${weapon.image}" alt="${weapon.name}" onerror="this.style.display='none'">` : ''}
                        </div>
                        <div>
                            <strong>⚔️ Оружие</strong>
                            <div>${weapon ? weapon.name : 'Пусто'}</div>
                        </div>
                    </div>
                    
                    <div class="equipment-slot ${armor ? 'equipped' : 'empty'}" onclick="game.showInventory()">
                        <div class="equipment-icon">
                            ${armor ? `<img src="${armor.image}" alt="${armor.name}" onerror="this.style.display='none'">` : ''}
                        </div>
                        <div>
                            <strong>🛡️ Броня</strong>
                            <div>${armor ? armor.name : 'Пусто'}</div>
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
                    <button class="btn-primary" onclick="game.encounterMonster()">🎲 Искать монстра</button>
                    <button class="btn-secondary" onclick="game.showLocationSelection()">📍 Сменить локацию</button>
                    <button class="btn-secondary" onclick="game.showInventory()">🎒 Инвентарь</button>
                    <button class="btn-secondary" onclick="game.showMerchant()">🏪 Магазин</button>
                    <button class="btn-danger" onclick="game.resetHero()">🔄 Сбросить героя</button>
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
                        <img src="${this.currentMap.image}" alt="${this.currentMap.name}" onerror="this.src='images/maps/default.jpg'">
                    </div>
                    <h4>${this.currentMap.name}</h4>
                    <p>${this.currentMap.description}</p>
                    <div class="map-multiplier">
                        Сложность: x${this.currentMap.multiplier}
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="map-info">
                    <div class="map-image-large">
                        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                            <div style="font-size: 3em; margin-bottom: 10px;">🗺️</div>
                            <div>Карта не выбрана</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Рендер выбора локации
    renderLocationSelection() {
        if (this.currentLocation) {
            const progress = this.getLocationProgress(this.currentLocation.level);
            return `
                <div class="location-info">
                    <div class="location-image-large">
                        <img src="${this.currentLocation.image}" alt="${this.currentLocation.name}" onerror="this.src='images/locations/default.jpg'">
                    </div>
                    <h4>${this.currentLocation.name} (Ур. ${this.currentLocation.level})</h4>
                    <p>${this.currentLocation.description}</p>
                    <div class="location-stats">
                        <div>Прогресс: ${progress}%</div>
                        <div>Монстры: №${this.currentLocation.monsterRange[0]}-${this.currentLocation.monsterRange[1]}</div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="location-info">
                    <div class="location-image-large">
                        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                            <div style="font-size: 3em; margin-bottom: 10px;">📍</div>
                            <div>Локация не выбрана</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Получить прогресс локации
    getLocationProgress(locationLevel) {
        if (!this.monsterKills[locationLevel]) return 0;
        
        const location = this.locations.find(l => l.level === locationLevel);
        if (!location) return 0;
        
        const [minId, maxId] = location.monsterRange;
        const totalMonsters = maxId - minId + 1;
        let killedMonsters = 0;
        
        for (let i = minId; i <= maxId; i++) {
            if (this.monsterKills[locationLevel][i]) {
                killedMonsters++;
            }
        }
        
        return Math.round((killedMonsters / totalMonsters) * 100);
    }

    // Рендер колонки монстра
    renderMonsterColumn() {
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
                            <div>Нажмите "Искать монстра"</div>
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
                    <img src="${this.currentMonster.image}" alt="${this.currentMonster.name}" onerror="this.src='images/monsters/default.jpg'">
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

    // Показать выбор локации
    showLocationSelection() {
        const locationsHTML = this.locations.map(location => {
            const unlocked = this.isLocationUnlocked(location.level);
            const progress = this.getLocationProgress(location.level);
            
            return `
                <div class="location-option ${unlocked ? '' : 'locked'}" 
                     onclick="${unlocked ? `game.selectLocation(${location.level})` : ''}">
                    <div class="location-option-image">
                        <img src="${location.image}" alt="${location.name}" onerror="this.src='images/locations/default.jpg'">
                        ${!unlocked ? '<div class="locked-overlay">🔒</div>' : ''}
                    </div>
                    <div class="location-option-info">
                        <strong>${location.name} (Ур. ${location.level})</strong>
                        <div>${location.description}</div>
                        <small>Прогресс: ${progress}%</small>
                        ${!unlocked ? '<small class="locked-text">Завершите предыдущую локацию</small>' : ''}
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

    // Встреча с монстром
    encounterMonster() {
        if (!this.currentLocation) {
            this.addToLog('❌ Сначала выберите локацию');
            return;
        }

        const [minId, maxId] = this.currentLocation.monsterRange;
        const monsterId = Math.floor(Math.random() * (maxId - minId + 1)) + minId;
        
        let monster = this.monsters.find(m => m.id === monsterId);
        if (!monster) {
            monster = this.monsters[0]; // fallback
        }

        // Применяем множитель карты
        const mapMultiplier = this.currentMap ? this.currentMap.multiplier : 1;
        this.currentMonster = {
            ...monster,
            health: Math.round(monster.health * mapMultiplier),
            damage: Math.round(monster.damage * mapMultiplier),
            armor: Math.round(monster.armor * mapMultiplier),
            reward: Math.round(monster.reward * mapMultiplier),
            power: Math.round((monster.health + monster.damage * 2 + monster.armor * 1.5) * mapMultiplier)
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
                <button class="btn-primary" onclick="game.startBattle()">⚔️ Атаковать</button>
            </div>
        `;
        
        container.innerHTML += actionsHTML;
    }

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
                            <img src="${this.getRaceImage(this.currentHero.race)}" alt="${this.currentHero.race}" onerror="this.src='images/races/default.jpg'">
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
                            <img src="${this.currentMonster.image}" alt="${this.currentMonster.name}" onerror="this.src='images/monsters/default.jpg'">
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
            human: 'images/races/human.jpg',
            elf: 'images/races/elf.jpg',
            dwarf: 'images/races/dwarf.jpg',
            ork: 'images/races/ork.jpg'
        };
        return raceImages[race] || 'images/races/default.jpg';
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
            
            // Отмечаем убийство монстра
            this.markMonsterKill(this.currentLocation.level, this.currentMonster.id);
            
            this.addBattleLog({
                message: `🎉 ПОБЕДА! Получено ${reward} золота и ${experienceGained} опыта`,
                type: 'victory'
            });
            
            this.addToLog(`🎯 Побежден ${this.currentMonster.name}! Получено ${reward} золота и ${experienceGained} опыта`);
            
        } else {
            this.addBattleLog({
                message: `💀 ПОРАЖЕНИЕ! Герой повержен`,
                type: 'defeat'
            });
            
            this.addToLog(`💥 Проигран бой с ${this.currentMonster.name}`);
        }
        
        this.battleActive = false;
        this.currentMonster = null;
        
        setTimeout(() => {
            this.renderHeroScreen();
        }, 3000);
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
                    </div>
                    <div class="item-price">
                        <span>💰 Цена: ${item.price}</span>
                    </div>
                    <div class="merchant-actions">
                        <button class="btn-primary" onclick="game.buyItem(${item.id})">Купить</button>
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

        this.currentHero.gold -= item.price;
        this.currentHero.inventory.push(itemId);
        
        this.addToLog(`🛒 Куплено: ${item.name} за ${item.price} золота`);
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
            this.currentHero.currentHealth = Math.min(
                this.currentHero.baseHealth,
                this.currentHero.currentHealth + item.heal
            );
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
                monsterKills: this.monsterKills
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
                
                this.currentMap = data.currentMap || this.maps.find(m => m.unlocked);
                this.currentLocation = data.currentLocation || this.locations.find(l => l.unlocked);
                this.lastHealthUpdate = data.lastHealthUpdate || Date.now();
                this.monsterKills = data.monsterKills || {};
                
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
