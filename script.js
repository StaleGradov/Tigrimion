// Основной класс игры
class HeroGame {
    constructor() {
        this.heroes = [];
        this.items = [];
        this.monsters = [];
        this.locations = [];
        this.movementStyles = [];
        this.merchants = [];
        this.showReward = false;
        this.lastReward = 0;
        this.currentHero = null;
        this.currentScreen = 'hero-select';
        this.currentLocation = null;
        this.currentMonster = null;
        this.selectedMovement = null;
        this.merchantsUnlocked = 1;
        
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
        const [heroes, enemies, items, locations, movement] = await Promise.all([
            this.loadJSON('data/heroes.json'),
            this.loadJSON('data/enemies.json'),
            this.loadJSON('data/items.json'),
            this.loadJSON('data/locations.json'),
            this.loadJSON('data/movement.json')
        ]);

        // Если какой-то файл не загрузился, используем резервные данные
        this.heroes = heroes || this.getDefaultHeroes();
        this.monsters = enemies || this.getDefaultEnemies();
        this.items = items || this.getDefaultItems();
        this.locations = locations || this.getDefaultLocations();
        this.movementStyles = movement || this.getDefaultMovement();

        console.log('✅ Все данные загружены:', {
            heroes: this.heroes,
            monsters: this.monsters,
            items: this.items,
            locations: this.locations,
            movementStyles: this.movementStyles
        });

    } catch (error) {
        console.error('❌ Критическая ошибка загрузки данных:', error);
        this.heroes = this.getDefaultHeroes();
        this.monsters = this.getDefaultEnemies();
        this.items = this.getDefaultItems();
        this.locations = this.getDefaultLocations();
        this.movementStyles = this.getDefaultMovement();
    }
}

    getDefaultHeroes() {
        return [
            {
                id: 1,
                name: "Резервный герой",
                health: 100,
                maxHealth: 100,
                attack: 10,
                defense: 5,
                speed: 5,
                level: 1,
                experience: 0,
                skills: ["Базовый удар"]
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
                experience: 5
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
                price: 25
            }
        ];
    }

    // Сброс героя к базовым настройкам с подтверждением
    resetHero() {
        if (!this.currentHero) return;
        
        // Подтверждение действия
        const confirmed = confirm("⚠️ Вы уверены что хотите сбросить героя?\n\nВсе характеристики, предметы и прогресс будут сброшены к базовым значениям. Это действие нельзя отменить.");
        
        if (!confirmed) {
            this.addToLog("❌ Сброс героя отменен");
            return;
        }
        
        // Базовая конфигурация для расы/класса/саги
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
        
        // Сохраняем только имя и изображение
        const heroName = this.currentHero.name;
        const heroImage = this.currentHero.image;
        
        // Сбрасываем настройки
        Object.assign(this.currentHero, baseConfig);
        this.currentHero.name = heroName;
        this.currentHero.image = heroImage;
        
        this.addToLog("🔄 Герой сброшен к базовым настройкам");
        this.addToLog("🎯 Теперь вы: Человек-Воин (Золотое Яйцо)");
        this.saveGame();
        this.renderHeroScreen();
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
        
        // Получаем бонусы
        const raceBonus = bonuses.races[hero.race]?.bonus || {type: "none", value: 0};
        const classBonus = bonuses.classes[hero.class]?.bonus || {type: "none", value: 0};
        const sagaBonus = bonuses.sagas[hero.saga]?.bonus || {type: "none", value: 0};
        
        // Бонусы от экипировки
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

        // Собираем все бонусы
        const allBonuses = [raceBonus, classBonus, sagaBonus, weaponBonus, armorBonus];

        // База
        let health = hero.baseHealth;
        let damage = hero.baseDamage;
        let armor = hero.baseArmor;

        // Добавляем фиксированные значения от экипировки
        if (hero.equipment.main_hand) {
            const weapon = this.items.find(item => item.id === hero.equipment.main_hand);
            damage += weapon?.fixed_damage || 0;
        }
        
        if (hero.equipment.chest) {
            const armorItem = this.items.find(item => item.id === hero.equipment.chest);
            armor += armorItem?.fixed_armor || 0;
        }

        // Применяем множители
        allBonuses.forEach(bonus => {
            switch(bonus.type) {
                case 'health_mult':
                    health *= (1 + bonus.value);
                    break;
                case 'damage_mult':
                    damage *= (1 + bonus.value);
                    break;
                case 'armor_mult':
                    armor *= (1 + bonus.value);
                    break;
            }
        });

        // Рассчитываем мочь
        const power = Math.round((health / 10) + (damage * 1.5) + (armor * 2));

        // Собираем навыки
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
        });

        return {
            health: Math.round(health),
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

    // Рендер выбора героя
    renderHeroSelect() {
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="screen active" id="screen-hero-select">
                <h2 class="text-center">Выберите героя</h2>
                <div class="hero-list">
                    ${this.heroes.map(hero => `
                        <div class="hero-option" onclick="game.selectHero(${hero.id})">
                            <div class="hero-option-image">
                                <img src="${hero.image}" alt="${hero.name}">
                            </div>
                            <div class="hero-option-info">
                                <strong>${hero.name}</strong>
                                <div>Ур. ${hero.level} | 💰 ${hero.gold}</div>
                                <small>${this.getBonuses().races[hero.race]?.name} - ${this.getBonuses().classes[hero.class]?.name}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // Выбор героя
    selectHero(heroId) {
        this.currentHero = this.heroes.find(h => h.id === heroId);
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

    // Получаем информацию об экипировке
    const weapon = this.currentHero.equipment.main_hand ? 
        this.items.find(item => item.id === this.currentHero.equipment.main_hand) : null;
    const armor = this.currentHero.equipment.chest ? 
        this.items.find(item => item.id === this.currentHero.equipment.chest) : null;

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
                        <div class="hero-stats">
                            <span>Ур. ${this.currentHero.level}</span>
                            <span>💰 ${this.currentHero.gold}</span>
                            <span>⚡ ${this.currentHero.experience}/100</span>
                        </div>
                    </div>
                </div>

                <!-- Центральная колонка - Локация -->
                <div class="location-column">
                    <div class="column-title">📍 ЛОКАЦИЯ</div>
                    ${this.renderLocationColumn()}
                </div>

                <!-- Правая колонка - Монстр/Награда -->
                <div class="monster-column">
                    <div class="column-title">🎭 ВРАГ / 🎁 НАГРАДА</div>
                    ${this.renderMonsterRewardColumn()}
                </div>
            </div>

            <!-- Остальная часть интерфейса остается без изменений -->
            <!-- Секция экипировки -->
            <div class="equipment-section">
                <div class="equipment-slot ${weapon ? 'equipped' : 'empty'}" onclick="game.showInventory()">
                    <div class="equipment-icon">
                        ${weapon ? 
                            `<img src="${weapon.image}" alt="${weapon.name}">` : 
                            ''
                        }
                    </div>
                    <div>
                        <strong>⚔️ Оружие</strong>
                        <div>${weapon ? weapon.name : 'Пусто'}</div>
                        ${weapon ? `<small>${this.formatBonus(weapon.bonus)}</small>` : ''}
                    </div>
                </div>
                
                <div class="equipment-slot ${armor ? 'equipped' : 'empty'}" onclick="game.showInventory()">
                    <div class="equipment-icon">
                        ${armor ? 
                            `<img src="${armor.image}" alt="${armor.name}">` : 
                            ''
                        }
                    </div>
                    <div>
                        <strong>🛡️ Броня</strong>
                        <div>${armor ? armor.name : 'Пусто'}</div>
                        ${armor ? `<small>${this.formatBonus(armor.bonus)}</small>` : ''}
                    </div>
                </div>
            </div>

            <!-- Характеристики и остальной интерфейс... -->
            <!-- ... остальной код без изменений ... -->
        </div>
    `;
}
// Рендер колонки локации
renderLocationColumn() {
    if (this.currentLocation) {
        return `
            <div class="location-info">
                <div class="location-image-large">
                    <img src="${this.currentLocation.image}" alt="${this.currentLocation.name}">
                </div>
                <h4>${this.currentLocation.name}</h4>
                <p>${this.currentLocation.description}</p>
                <div class="location-effects">
                    ${this.currentLocation.movementBonus ? `<div>📏 Движение: +${this.currentLocation.movementBonus}</div>` : ''}
                    ${this.currentLocation.movementPenalty ? `<div>📏 Движение: ${this.currentLocation.movementPenalty}</div>` : ''}
                    ${this.currentLocation.stealthBonus ? `<div>👻 Скрытность: +${this.currentLocation.stealthBonus}</div>` : ''}
                    ${this.currentLocation.stealthPenalty ? `<div>👻 Скрытность: ${this.currentLocation.stealthPenalty}</div>` : ''}
                    ${this.currentLocation.escapeBonus ? `<div>🏃 Побег: +${this.currentLocation.escapeBonus}</div>` : ''}
                    ${this.currentLocation.escapePenalty ? `<div>🏃 Побег: ${this.currentLocation.escapePenalty}</div>` : ''}
                </div>
                ${this.currentLocation.deathRisk ? `<div class="risk-badge">☠️ Шанс смерти: 1/${this.currentLocation.deathRisk}</div>` : ''}
            </div>
        `;
    } else {
        return `
            <div class="location-info">
                <div class="location-image-large">
                    <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                        <div style="font-size: 3em; margin-bottom: 10px;">🌍</div>
                        <div>Бросьте кубик локации</div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Рендер колонки монстра/награды
renderMonsterRewardColumn() {
    if (this.showReward) {
        return this.renderRewardDisplay();
    } else if (this.currentMonster) {
        return this.renderMonsterDisplay();
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

// Рендер монстра (обновленная версия)
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
    this.renderHeroScreen();
}
    // Окно локации/монстра
    renderLocationMonsterContainer() {
        if (this.currentMonster) {
            return this.renderMonsterDisplay();
        } else if (this.currentLocation) {
            return this.renderLocationDisplay();
        } else {
            return `
                <div class="location-info">
                    <div class="location-image-placeholder">
                        <div style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                            <div style="font-size: 3em; margin-bottom: 10px;">🌍</div>
                            <div>Бросьте кубик локации чтобы начать путешествие</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Отображение локации
    renderLocationDisplay() {
        if (!this.currentLocation) return '';
        
        return `
            <div class="location-info">
                <h3>📍 ${this.currentLocation.name}</h3>
                <div class="location-image-large">
                    <img src="${this.currentLocation.image}" alt="${this.currentLocation.name}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 10px; margin-bottom: 10px;">
                </div>
                <p>${this.currentLocation.description}</p>
                <div class="location-effects">
                    ${this.currentLocation.movementBonus ? `<div>📏 Движение: +${this.currentLocation.movementBonus}</div>` : ''}
                    ${this.currentLocation.movementPenalty ? `<div>📏 Движение: ${this.currentLocation.movementPenalty}</div>` : ''}
                    ${this.currentLocation.stealthBonus ? `<div>👻 Скрытность: +${this.currentLocation.stealthBonus}</div>` : ''}
                    ${this.currentLocation.stealthPenalty ? `<div>👻 Скрытность: ${this.currentLocation.stealthPenalty}</div>` : ''}
                    ${this.currentLocation.escapeBonus ? `<div>🏃 Побег: +${this.currentLocation.escapeBonus}</div>` : ''}
                    ${this.currentLocation.escapePenalty ? `<div>🏃 Побег: ${this.currentLocation.escapePenalty}</div>` : ''}
                </div>
                <div class="location-risks">
                    ${this.currentLocation.deathRisk ? `<span class="risk-badge">☠️ Шанс смерти: 1/${this.currentLocation.deathRisk}</span>` : ''}
                </div>
            </div>
        `;
    }

    // Отображение монстра
    renderMonsterDisplay() {
        if (!this.currentMonster) return '';
        
        const stats = this.calculateHeroStats(this.currentHero);
        const powerComparison = stats.power >= this.currentMonster.power ? '✅ ПРЕИМУЩЕСТВО' : '⚠️ РИСК';

        return `
            <div class="location-info">
                <h3>🎭 ${this.currentMonster.name}</h3>
                <div class="monster-image-large">
                    <img src="${this.currentMonster.image}" alt="${this.currentMonster.name}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 10px; margin-bottom: 10px;">
                </div>
                <p>${this.currentMonster.description}</p>
                
                <div class="stats-grid">
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
                
                <div style="text-align: center; margin: 15px 0;">
                    <p><strong>Сравнение:</strong> ${powerComparison}</p>
                    <p>💰 Награда: ${this.currentMonster.reward} золота</p>
                    <p>🏃 Сложность побега: ${this.currentMonster.escapeDifficulty}+</p>
                </div>

                ${this.selectedMovement ? this.renderCalculationsPanel() : ''}
            </div>
        `;
    }

    // Панель расчётов
    renderCalculationsPanel() {
        if (!this.currentMonster || !this.selectedMovement) return '';
        
        const stats = this.calculateHeroStats(this.currentHero);
        const movement = this.movementStyles.find(s => s.id === this.selectedMovement);
        
        // Расчёт дальности
        let movementRange = typeof movement.movement === 'string' ? movement.movement : movement.movement;
        if (this.currentLocation.movementBonus) {
            movementRange = this.calculateMovementRange(movementRange, this.currentLocation.movementBonus);
        }
        if (this.currentLocation.movementPenalty && !movement.ignoresPenalties) {
            movementRange = this.calculateMovementRange(movementRange, this.currentLocation.movementPenalty);
        }

        // Расчёт скрытности
        let stealthChance = stats.skills.stealth;
        if (movement.stealthBonus) stealthChance += movement.stealthBonus;
        if (movement.stealthPenalty) stealthChance += movement.stealthPenalty;
        if (this.currentLocation.stealthBonus) stealthChance += this.currentLocation.stealthBonus;
        if (this.currentLocation.stealthPenalty) stealthChance += this.currentLocation.stealthPenalty;

        // Расчёт побега
        let escapeChance = stats.skills.escape;
        if (movement.escapeBonus) escapeChance += movement.escapeBonus;
        if (movement.escapePenalty) escapeChance += movement.escapePenalty;
        if (this.currentLocation.escapeBonus) escapeChance += this.currentLocation.escapeBonus;
        if (this.currentLocation.escapePenalty) escapeChance += this.currentLocation.escapePenalty;

        return `
            <div class="calculations-panel">
                <h3>📊 Расчёты для ${this.currentMonster.name}:</h3>
                <div class="calculation-row">
                    <span>📏 Дальность хода:</span>
                    <span class="calculation-value">${movementRange} клеток</span>
                </div>
                <div class="calculation-row">
                    <span>👻 Шанс скрытности:</span>
                    <span class="calculation-value">${this.calculateSuccessChance(stealthChance, 3)}%</span>
                </div>
                <div class="calculation-row">
                    <span>🏃 Шанс побега:</span>
                    <span class="calculation-value">${this.calculateSuccessChance(escapeChance, this.currentMonster.escapeDifficulty)}%</span>
                </div>
                <div class="calculation-row">
                    <span>⚔️ Шанс победы:</span>
                    <span class="calculation-value ${stats.power >= this.currentMonster.power ? 'power-advantage' : 'power-risk'}">
                        ${stats.power >= this.currentMonster.power ? 'Высокий' : 'Низкий'}
                    </span>
                </div>
            </div>
        `;
    }

    // Расчёт дальности хода
    calculateMovementRange(base, modifier) {
        if (typeof base === 'string') {
            // Для dice notation типа "1d4"
            const [count, dice] = base.split('d').map(Number);
            const min = Math.max(1, count + modifier);
            const max = dice + modifier;
            return `${min}-${max}`;
        } else {
            return Math.max(1, base + modifier);
        }
    }

    // Расчёт шанса успеха
    calculateSuccessChance(bonusDice, targetNumber) {
        // Простая формула: каждый d6 даёт ~16.7% шанс на успех
        const baseChance = (7 - targetNumber) * 16.7;
        const bonusChance = bonusDice * 16.7;
        return Math.min(95, Math.max(5, Math.round(baseChance + bonusChance)));
    }

    // Бросок локации
    rollLocation() {
        const roll = Math.floor(Math.random() * this.locations.length);
        this.currentLocation = this.locations[roll];
        this.selectedMovement = null;
        this.currentMonster = null;
        
        this.addToLog(`🎲 Бросок локации: ${this.currentLocation.name}`);
        this.addToLog(`📍 ${this.currentLocation.description}`);
        if (this.currentLocation.deathRisk) {
            this.addToLog(`⚠️ Опасность: шанс смерти 1/${this.currentLocation.deathRisk}`);
        }
        
        this.renderHeroScreen();
        this.showMovementSelection();
    }

    // Выбор стиля движения
    showMovementSelection() {
        const container = document.getElementById('app');
        const movementHTML = this.movementStyles.map(style => `
            <div class="hero-option" onclick="game.selectMovement('${style.id}')">
                <strong>${style.name}</strong>
                <div>${style.description}</div>
                <small>Движение: ${typeof style.movement === 'string' ? style.movement : style.movement} клетки</small>
            </div>
        `).join('');

        container.innerHTML += `
            <div class="screen active" id="screen-movement">
                <h3 class="text-center">🚶 Выберите стиль движения</h3>
                <div class="hero-list">
                    ${movementHTML}
                </div>
            </div>
        `;

        this.showScreen('movement');
    }

    // Выбор движения
    selectMovement(styleId) {
        const style = this.movementStyles.find(s => s.id === styleId);
        this.selectedMovement = styleId;
        
        this.addToLog(`🚶 Выбрано: ${style.name}`);
        
        // Проверка шанса смерти
        if (this.checkDeathRisk()) {
            return; // Герой погиб
        }
        
        // Встреча с монстром
        this.encounterMonster();
    }

    // Проверка шанса смерти
    checkDeathRisk() {
        if (!this.currentLocation.deathRisk) return false;
        
        const deathRoll = Math.floor(Math.random() * this.currentLocation.deathRisk) + 1;
        if (deathRoll === 1) {
            this.addToLog(`💀 КРИТИЧЕСКАЯ НЕУДАЧА!`);
            this.addToLog(`☠️ ${this.currentLocation.deathMessage}`);
            this.addToLog(`🏥 Вы погибли и возродились у последней таверны`);
            
            // Сброс прогресса
            this.currentLocation = null;
            this.selectedMovement = null;
            this.currentMonster = null;
            this.saveGame();
            
            setTimeout(() => {
                this.renderHeroScreen();
            }, 3000);
            
            return true;
        }
        
        this.addToLog(`✅ Вам повезло! Шанс смерти не сработал (выпало ${deathRoll})`);
        return false;
    }

    // Встреча с монстром
    encounterMonster() {
        const roll = Math.floor(Math.random() * this.monsters.length);
        this.currentMonster = this.monsters[roll];
        
        this.addToLog(`🎭 Встречен: ${this.currentMonster.name}`);
        this.renderHeroScreen(); // Обновляем с изображением монстра
        
        // Показываем кнопки действий для монстра
        this.showMonsterActions();
    }

    // Показать действия для монстра
    showMonsterActions() {
        const container = document.getElementById('app');
        container.innerHTML += `
            <div class="action-buttons" style="margin-top: 15px;">
                <button class="btn-primary" onclick="game.startBattle()">⚔️ Сражаться</button>
                <button class="btn-secondary" onclick="game.attemptStealth()">👻 Скрыться</button>
                <button class="btn-secondary" onclick="game.attemptEscape()">🏃 Убежать</button>
            </div>
        `;
    }

// Начать бой
startBattle() {
    this.addToLog(`⚔️ Начало боя с ${this.currentMonster.name}`);
    const stats = this.calculateHeroStats(this.currentHero);
    
    if (stats.power >= this.currentMonster.power) {
        this.addToLog(`🎯 Вы победили ${this.currentMonster.name}!`);
        this.addToLog(`💰 Получено: ${this.currentMonster.reward} золота`);
        this.currentHero.gold += this.currentMonster.reward;
        
        // Показываем награду вместо монстра
        this.showReward(this.currentMonster.reward);
    } else {
        this.addToLog(`💥 Вы проиграли бой с ${this.currentMonster.name}`);
        this.addToLog(`🏥 Потеряно 20% здоровья`);
        this.completeEncounter();
    }
}
    // Попытка скрыться
    attemptStealth() {
        const stats = this.calculateHeroStats(this.currentHero);
        let stealthBonus = stats.skills.stealth;
        
        // Учитываем бонусы/штрафы
        const movement = this.movementStyles.find(s => s.id === this.selectedMovement);
        if (movement.stealthBonus) stealthBonus += movement.stealthBonus;
        if (movement.stealthPenalty) stealthBonus += movement.stealthPenalty;
        if (this.currentLocation.stealthBonus) stealthBonus += this.currentLocation.stealthBonus;
        if (this.currentLocation.stealthPenalty) stealthBonus += this.currentLocation.stealthPenalty;
        
        this.addToLog(`👻 Попытка скрыться... Бонус: +${stealthBonus}d6`);
        
        // Симуляция броска
        const stealthRoll = this.rollDice(stealthBonus, 3);
        
        if (stealthRoll.success) {
            this.addToLog(`✅ Успешно скрылись от ${this.currentMonster.name}!`);
        } else {
            this.addToLog(`❌ Не удалось скрыться! Монстр вас заметил`);
            // Можно добавить последствия
        }
        
        this.completeEncounter();
    }

    // Попытка побега
    attemptEscape() {
        const stats = this.calculateHeroStats(this.currentHero);
        let escapeBonus = stats.skills.escape;
        
        // Учитываем бонусы/штрафы
        const movement = this.movementStyles.find(s => s.id === this.selectedMovement);
        if (movement.escapeBonus) escapeBonus += movement.escapeBonus;
        if (movement.escapePenalty) escapeBonus += movement.escapePenalty;
        if (this.currentLocation.escapeBonus) escapeBonus += this.currentLocation.escapeBonus;
        if (this.currentLocation.escapePenalty) escapeBonus += this.currentLocation.escapePenalty;
        
        this.addToLog(`🏃 Попытка побега... Бонус: +${escapeBonus}d6`);
        
        // Симуляция броска
        const escapeRoll = this.rollDice(escapeBonus, this.currentMonster.escapeDifficulty);
        
        if (escapeRoll.success) {
            this.addToLog(`✅ Успешно сбежали от ${this.currentMonster.name}!`);
        } else {
            this.addToLog(`❌ Не удалось сбежать! Придётся сражаться`);
            // Автоматически начинаем бой
            this.startBattle();
            return;
        }
        
        this.completeEncounter();
    }

    // Бросок кубиков
    rollDice(bonusDice, targetNumber) {
        let total = 0;
        let rolls = [];
        
        // Базовый бросок
        const baseRoll = Math.floor(Math.random() * 6) + 1;
        rolls.push(baseRoll);
        total += baseRoll;
        
        // Бонусные броски
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
        this.addToLog(`🏁 Встреча завершена`);
        this.saveGame();
        setTimeout(() => {
            this.renderHeroScreen();
        }, 2000);
    }

    // Показать магазин
    showMerchant() {
        const availableItems = this.items.filter(item => item.merchant <= this.merchantsUnlocked);
        const merchantHTML = availableItems.map(item => `
            <div class="hero-option" onclick="game.buyItem(${item.id})">
                <div class="hero-option-image">
                    <img src="${item.image}" alt="${item.name}">
                </div>
                <div class="hero-option-info">
                    <strong>${item.name}</strong>
                    <div>${this.formatBonus(item.bonus)}</div>
                    <div>Урон: +${item.fixed_damage || 0} | Броня: +${item.fixed_armor || 0}</div>
                    <div>💰 ${item.price} золота | Ур. ${item.requiredLevel}</div>
                    <small>${item.description}</small>
                </div>
            </div>
        `).join('');

        const container = document.getElementById('app');
        container.innerHTML += `
            <div class="screen active" id="screen-merchant">
                <h3 class="text-center">🏪 Магазин (Торговец ${this.merchantsUnlocked})</h3>
                <div class="hero-list">
                    ${merchantHTML || '<div class="text-center">Товаров нет</div>'}
                </div>
                <div class="action-buttons">
                    <button class="btn-secondary" onclick="game.renderHeroScreen()">← Назад</button>
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

        if (this.currentHero.level < item.requiredLevel) {
            this.addToLog(`❌ Недостаточный уровень для покупки ${item.name}`);
            return;
        }

        this.currentHero.gold -= item.price;
        this.currentHero.inventory.push(itemId);
        
        this.addToLog(`🛒 Куплено: ${item.name} за ${item.price} золота`);
        this.saveGame();
        this.showMerchant(); // Обновляем магазин
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

        // Снимаем предыдущий предмет в этом слоте если есть
        const currentEquipped = this.currentHero.equipment[item.slot];
        if (currentEquipped) {
            // Возвращаем в инвентарь
            if (!this.currentHero.inventory.includes(currentEquipped)) {
                this.currentHero.inventory.push(currentEquipped);
            }
        }

        // Надеваем новый предмет
        this.currentHero.equipment[item.slot] = itemId;
        
        // Убираем из инвентаря
        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);

        this.addToLog(`🎯 Надето: ${item.name}`);
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

    // Форматирование бонуса для отображения
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

    // Получить название экипировки
    getEquipmentName(slot) {
        const itemId = this.currentHero.equipment[slot];
        if (!itemId) return null;
        const item = this.items.find(i => i.id === itemId);
        return item?.name || null;
    }

    // Сохранение игры
    saveGame() {
        if (this.currentHero) {
            localStorage.setItem('heroGameSave', JSON.stringify({
                currentHeroId: this.currentHero.id,
                heroes: this.heroes,
                currentLocation: this.currentLocation,
                merchantsUnlocked: this.merchantsUnlocked
            }));
        }
    }

    // Загрузка сохранения
    loadSave() {
        try {
            const save = localStorage.getItem('heroGameSave');
            if (save) {
                const data = JSON.parse(save);
                
                // Сохраняем только прогресс, а не сами данные героев
                const savedHeroProgress = data.heroes || [];
                const currentHeroId = data.currentHeroId;
                
                // Создаем карту прогресса героев
                const progressMap = new Map();
                savedHeroProgress.forEach(hero => {
                    progressMap.set(hero.id, {
                        gold: hero.gold,
                        level: hero.level,
                        experience: hero.experience,
                        inventory: hero.inventory,
                        equipment: hero.equipment
                    });
                });
                
                // Применяем прогресс к свежим данным из JSON
                this.heroes = this.heroes.map(freshHero => {
                    const progress = progressMap.get(freshHero.id);
                    if (progress) {
                        return {
                            ...freshHero, // Базовые данные из JSON
                            ...progress   // Прогресс из сохранения
                        };
                    }
                    return freshHero; // Новый герой без прогресса
                });
                
                this.currentLocation = data.currentLocation || null;
                this.merchantsUnlocked = data.merchantsUnlocked || 1;
                
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

// Создание экземпляра игры когда страница загружена
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new HeroGame();
});
