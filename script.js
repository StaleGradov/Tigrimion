// Основной класс игры
class HeroGame {
    constructor() {
        this.heroes = [];
        this.items = [];
        this.monsters = [];
        this.locations = [];
        this.movementStyles = [];
        
        this.currentHero = null;
        this.currentScreen = 'hero-select';
        this.currentLocation = null;
        this.currentMonster = null;
        
        this.init();
    }

    // Инициализация игры
    async init() {
        await this.loadGameData();
        this.loadSave();
        this.renderHeroSelect();
    }

    // Загрузка данных из JSON файлов
    async loadGameData() {
        try {
            // Герои
            this.heroes = [
                {
                    id: 1,
                    name: "Леголас",
                    image: "https://raw.githubusercontent.com/StaleGradov/Tigrimion/main/Argonat.jpg",
                    race: "elf",
                    class: "archer",
                    saga: "vulkanor",
                    baseHealth: 90,
                    baseDamage: 22,
                    baseArmor: 8,
                    gold: 1000,
                    level: 3,
                    experience: 150,
                    inventory: [1, 2],
                    equipment: {
                        main_hand: null,
                        chest: null
                    }
                },
                {
                    id: 2,
                    name: "Гимли",
                    image: "https://raw.githubusercontent.com/StaleGradov/Tigrimion/main/Argonat.jpg",
                    race: "dwarf",
                    class: "warrior",
                    saga: "golden_egg",
                    baseHealth: 120,
                    baseDamage: 18,
                    baseArmor: 15,
                    gold: 800,
                    level: 2,
                    experience: 80,
                    inventory: [3],
                    equipment: {
                        main_hand: null,
                        chest: null
                    }
                }
            ];

            // Предметы
            this.items = [
                {
                    id: 1,
                    name: "Меч Вулканора",
                    type: "weapon",
                    slot: "main_hand",
                    image: "images/items/weapons/vulkanor_sword.jpg",
                    icon: "images/items/icons/sword_icon.png",
                    rarity: "rare",
                    fixed_damage: 25,
                    bonus: {type: "damage_mult", value: 0.2},
                    price: 300,
                    requiredLevel: 3,
                    description: "Меч, выкованный в лавовых кузницах Вулканора"
                },
                {
                    id: 2,
                    name: "Лук Теней",
                    type: "weapon",
                    slot: "main_hand",
                    image: "images/items/weapons/shadow_bow.jpg",
                    icon: "images/items/icons/bow_icon.png",
                    rarity: "uncommon",
                    fixed_damage: 20,
                    bonus: {type: "stealth_bonus", value: 1},
                    price: 250,
                    requiredLevel: 2,
                    description: "Бесшумный лук для скрытных атак"
                },
                {
                    id: 3,
                    name: "Доспех Гномов",
                    type: "armor",
                    slot: "chest",
                    image: "images/items/armor/dwarf_armor.jpg",
                    icon: "images/items/icons/armor_icon.png",
                    rarity: "rare",
                    fixed_armor: 15,
                    bonus: {type: "health_mult", value: 0.3},
                    price: 400,
                    requiredLevel: 3,
                    description: "Прочная броня, украшенная рунами"
                }
            ];

            // Монстры
            this.monsters = [
                {
                    id: 1,
                    name: "Клещ",
                    image: "https://via.placeholder.com/200x200/333/fff?text=Клещ",
                    health: 250,
                    armor: 10,
                    damage: 40,
                    power: 105,
                    reward: 24,
                    escapeDifficulty: 4,
                    description: "Отвратительное существо, питающееся кровью..."
                },
                {
                    id: 2,
                    name: "Гоблин",
                    image: "https://via.placeholder.com/200x200/333/fff?text=Гоблин",
                    health: 80,
                    armor: 5,
                    damage: 25,
                    power: 68,
                    reward: 15,
                    escapeDifficulty: 3,
                    description: "Мелкий и противный гуманоид"
                },
                {
                    id: 3,
                    name: "Волк",
                    image: "https://via.placeholder.com/200x200/333/fff?text=Волк",
                    health: 60,
                    armor: 3,
                    damage: 30,
                    power: 72,
                    reward: 12,
                    escapeDifficulty: 2,
                    description: "Быстрый и опасный хищник"
                }
            ];

            // Локации
            this.locations = [
                {
                    id: 1,
                    name: "Лавовые земли",
                    image: "https://via.placeholder.com/300x200/ff4400/fff?text=Лавовые+земли",
                    description: "Раскалённые пустоши с бурлящей лавой",
                    movementPenalty: -2,
                    escapePenalty: -2,
                    stealthPenalty: -2,
                    deathRisk: 4
                },
                {
                    id: 2,
                    name: "Великие Луга",
                    image: "https://via.placeholder.com/300x200/44ff44/fff?text=Великие+Луга",
                    description: "Бескрайние зелёные просторы",
                    movementBonus: 1,
                    stealthBonus: 2,
                    deathRisk: 20
                },
                {
                    id: 3,
                    name: "Древние Руины",
                    image: "https://via.placeholder.com/300x200/888844/fff?text=Древние+Руины",
                    description: "Заброшенные подземелья и гробницы",
                    movementPenalty: -1,
                    escapePenalty: -1,
                    stealthPenalty: -1,
                    deathRisk: 6
                }
            ];

            // Стили движения
            this.movementStyles = [
                {
                    id: "skip",
                    name: "Пропуск Хода",
                    movement: 0,
                    stealthBonus: 2,
                    escapeBonus: 2,
                    canReroll: true,
                    description: "Осторожное наблюдение за местностью"
                },
                {
                    id: "stealth",
                    name: "Скрытное Передвижение",
                    movement: 1,
                    ignoresPenalties: true,
                    stealthBonus: 2,
                    escapeBonus: 2,
                    canReroll: true,
                    description: "Тихие шаги в тени"
                },
                {
                    id: "step",
                    name: "Шаг",
                    movement: 2,
                    minMovement: 1,
                    stealthBonus: 1,
                    description: "Обычный осмотрительный шаг"
                },
                {
                    id: "fast",
                    name: "Быстрое Передвижение",
                    movement: "1d4",
                    stealthPenalty: 1,
                    escapePenalty: 2,
                    description: "Спешное движение с риском"
                },
                {
                    id: "run",
                    name: "Бег",
                    movement: "1d6",
                    noEscape: true,
                    noStealth: true,
                    description: "Стремительный бег без оглядки"
                }
            ];

        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }

    // Бонусы рас, профессий и саг
    getBonuses() {
        return {
            races: {
                elf: { bonus: {type: "escape_bonus", value: 1}, name: "Эльф", description: "Проворный и неуловимый" },
                dwarf: { bonus: {type: "health_mult", value: 0.3}, name: "Гном", description: "Выносливый и крепкий" }
            },
            classes: {
                archer: { bonus: {type: "damage_mult", value: 0.2}, name: "Лучник", description: "Мастер дальнего боя" },
                warrior: { bonus: {type: "damage_mult", value: 0.2}, name: "Воин", description: "Сильный и отважный" }
            },
            sagas: {
                vulkanor: { bonus: {type: "damage_mult", value: 0.2}, name: "Вулканор", description: "Прошедший огненные испытания" },
                golden_egg: { bonus: {type: "health_mult", value: 0.3}, name: "Золотое Яйцо", description: "Обладатель древнего артефакта" }
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
                            <strong>${hero.name}</strong>
                            <div>Ур. ${hero.level} | 💰 ${hero.gold}</div>
                            <small>${this.getBonuses().races[hero.race]?.name} - ${this.getBonuses().classes[hero.class]?.name}</small>
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

        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="screen active" id="screen-main">
                <!-- Заголовок героя -->
                <div class="hero-header">
                    <div class="hero-image">
                        <img src="${this.currentHero.image}" alt="${this.currentHero.name}">
                    </div>
                    <div class="hero-info">
                        <h1>${this.currentHero.name}</h1>
                        <div class="hero-stats">
                            <span>Ур. ${this.currentHero.level}</span>
                            <span>💰 ${this.currentHero.gold}</span>
                            <span>⚡ ${this.currentHero.experience}/100</span>
                        </div>
                    </div>
                </div>

                <!-- Текущая локация -->
                ${this.currentLocation ? `
                <div class="location-info">
                    <h3>📍 ${this.currentLocation.name}</h3>
                    <p>${this.currentLocation.description}</p>
                    ${this.currentLocation.movementBonus ? `<p>📏 Движение: +${this.currentLocation.movementBonus}</p>` : ''}
                    ${this.currentLocation.movementPenalty ? `<p>📏 Движение: ${this.currentLocation.movementPenalty}</p>` : ''}
                    ${this.currentLocation.stealthBonus ? `<p>👻 Скрытность: +${this.currentLocation.stealthBonus}</p>` : ''}
                    ${this.currentLocation.stealthPenalty ? `<p>👻 Скрытность: ${this.currentLocation.stealthPenalty}</p>` : ''}
                </div>
                ` : ''}

                <!-- Характеристики -->
                <div class="stats-grid">
                    <div class="stat-card">
                        <div>❤️ Здоровье</div>
                        <div class="stat-value">${stats.health}</div>
                    </div>
                    <div class="stat-card">
                        <div>⚔️ Урон</div>
                        <div class="stat-value">${stats.damage}</div>
                    </div>
                    <div class="stat-card">
                        <div>🛡️ Броня</div>
                        <div class="stat-value">${stats.armor}</div>
                    </div>
                    <div class="stat-card">
                        <div>🌟 Мощь</div>
                        <div class="stat-value">${stats.power}</div>
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
                    <div class="bonus-item ${!stats.bonuses.weapon.value ? 'bonus-empty' : ''}">
                        <strong>Оружие:</strong> ${this.getEquipmentName('main_hand') || 'Пусто'}
                        (${this.formatBonus(stats.bonuses.weapon)})
                    </div>
                    <div class="bonus-item ${!stats.bonuses.armor.value ? 'bonus-empty' : ''}">
                        <strong>Броня:</strong> ${this.getEquipmentName('chest') || 'Пусто'}
                        (${this.formatBonus(stats.bonuses.armor)})
                    </div>
                </div>

                <!-- Навыки -->
                <div class="bonuses-section">
                    <h3>🎯 Навыки:</h3>
                    <div>🏃 Побег: +${stats.skills.escape}d6</div>
                    <div>👻 Скрытность: +${stats.skills.stealth}d6</div>
                    <div>🍀 Удача: +${stats.skills.luck}d6</div>
                </div>

                <!-- Кнопки действий -->
                <div class="action-buttons">
                    <button class="btn-primary" onclick="game.rollLocation()">🎲 Бросить локацию</button>
                    <button class="btn-secondary" onclick="game.showInventory()">🎒 Инвентарь</button>
                    <button class="btn-secondary" onclick="game.renderHeroSelect()">🔁 Сменить героя</button>
                </div>

                <!-- Журнал событий -->
                <div class="battle-log" id="battle-log"></div>
            </div>
        `;
    }

    // Бросок локации
    rollLocation() {
        const roll = Math.floor(Math.random() * this.locations.length);
        this.currentLocation = this.locations[roll];
        
        this.addToLog(`🎲 Бросок локации: ${this.currentLocation.name}`);
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
        this.addToLog(`🚶 Выбрано: ${style.name}`);
        
        // Встреча с монстром
        this.encounterMonster();
    }

    // Встреча с монстром
    encounterMonster() {
        const roll = Math.floor(Math.random() * this.monsters.length);
        this.currentMonster = this.monsters[roll];
        
        this.addToLog(`🎭 Встречен: ${this.currentMonster.name}`);
        this.showMonsterEncounter();
    }

    // Показать встречу с монстром
    showMonsterEncounter() {
        const stats = this.calculateHeroStats(this.currentHero);
        const container = document.getElementById('app');
        
        const powerComparison = stats.power >= this.currentMonster.power ? '✅ ПРЕИМУЩЕСТВО' : '⚠️ РИСК';

        container.innerHTML += `
            <div class="screen active" id="screen-monster">
                <div class="location-info">
                    <h3>🎭 ${this.currentMonster.name}</h3>
                    <img src="${this.currentMonster.image}" alt="${this.currentMonster.name}" style="width: 100%; max-width: 200px; margin: 10px auto; display: block; border-radius: 10px;">
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
                    
                    <p><strong>Сравнение:</strong> ${powerComparison}</p>
                    <p>💰 Награда: ${this.currentMonster.reward} золота</p>
                </div>

                <div class="action-buttons">
                    <button class="btn-primary" onclick="game.startBattle()">⚔️ Сражаться</button>
                    <button class="btn-secondary" onclick="game.attemptStealth()">👻 Скрыться</button>
                    <button class="btn-secondary" onclick="game.attemptEscape()">🏃 Убежать</button>
                </div>
            </div>
        `;

        this.showScreen('monster');
    }

    // Начать бой
    startBattle() {
        this.addToLog(`⚔️ Начало боя с ${this.currentMonster.name}`);
        // Здесь будет логика боя
        this.simulateBattle();
    }

    // Попытка скрыться
    attemptStealth() {
        const stats = this.calculateHeroStats(this.currentHero);
        const stealthBonus = stats.skills.stealth;
        
        this.addToLog(`👻 Попытка скрыться... Бонус: +${stealthBonus}d6`);
        // Здесь будет логика скрытности
        this.addToLog(`✅ Успешно скрылись от ${this.currentMonster.name}`);
        this.completeEncounter();
    }

    // Попытка побега
    attemptEscape() {
        const stats = this.calculateHeroStats(this.currentHero);
        const escapeBonus = stats.skills.escape;
        
        this.addToLog(`🏃 Попытка побега... Бонус: +${escapeBonus}d6`);
        // Здесь будет логика побега
        this.addToLog(`✅ Успешно сбежали от ${this.currentMonster.name}`);
        this.completeEncounter();
    }

    // Симуляция боя (упрощённая)
    simulateBattle() {
        this.addToLog(`🎯 Бой начался!`);
        this.addToLog(`✅ Победа над ${this.currentMonster.name}!`);
        this.addToLog(`💰 Получено: ${this.currentMonster.reward} золота`);
        
        this.currentHero.gold += this.currentMonster.reward;
        this.completeEncounter();
    }

    // Завершение встречи
    completeEncounter() {
        this.currentMonster = null;
        this.addToLog(`🏁 Встреча завершена`);
        this.saveGame();
        setTimeout(() => {
            this.renderHeroScreen();
        }, 2000);
    }

    // Добавить запись в журнал
    addToLog(message) {
        const log = document.getElementById('battle-log');
        if (log) {
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = `[Ход ${this.getTurnNumber()}] ${message}`;
            log.appendChild(entry);
            log.scrollTop = log.scrollHeight;
        }
    }

    // Получить номер хода
    getTurnNumber() {
        return 1; // Временная заглушка
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

    // Показать инвентарь
    showInventory() {
        if (!this.currentHero) return;

        const inventoryHTML = this.currentHero.inventory.map(itemId => {
            const item = this.items.find(i => i.id === itemId);
            if (!item) return '';
            
            const isEquipped = Object.values(this.currentHero.equipment).includes(itemId);
            
            return `
                <div class="hero-option" onclick="game.equipItem(${itemId})">
                    <strong>${item.name}</strong>
                    <div>${this.formatBonus(item.bonus)}</div>
                    ${isEquipped ? '<small>✓ Надето</small>' : '<small>📦 В инвентаре</small>'}
                </div>
            `;
        }).join('');

        const container = document.getElementById('app');
        container.innerHTML += `
            <div class="screen active" id="screen-inventory">
                <h3 class="text-center">🎒 Инвентарь</h3>
                <div class="hero-list">
                    ${inventoryHTML || '<div class="text-center">Инвентарь пуст</div>'}
                </div>
                <div class="action-buttons">
                    <button class="btn-secondary" onclick="game.renderHeroScreen()">← Назад</button>
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

    // Сохранение игры
    saveGame() {
        if (this.currentHero) {
            localStorage.setItem('heroGameSave', JSON.stringify({
                currentHeroId: this.currentHero.id,
                heroes: this.heroes,
                currentLocation: this.currentLocation
            }));
        }
    }

    // Загрузка сохранения
    loadSave() {
        try {
            const save = localStorage.getItem('heroGameSave');
            if (save) {
                const data = JSON.parse(save);
                this.heroes = data.heroes || this.heroes;
                this.currentLocation = data.currentLocation || null;
                
                if (data.currentHeroId) {
                    this.currentHero = this.heroes.find(h => h.id === data.currentHeroId);
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
