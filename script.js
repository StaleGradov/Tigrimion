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
        
        this.init();
    }

    // Инициализация игры
    async init() {
        await this.loadGameData();
        this.loadSave();
        this.renderHeroSelect();
        this.setupEventListeners();
    }

    // Загрузка данных из JSON файлов
    async loadGameData() {
        try {
            // В реальной игре здесь будут fetch запросы
            // Сейчас используем тестовые данные
            this.heroes = [
                {
                    id: 1,
                    name: "Леголас",
                    image: "images/heroes/argonat.webp",
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
                    image: "images/heroes/argonat.webp", // временно тот же
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
                    <button class="btn-primary" onclick="game.showInventory()">🎒 Инвентарь</button>
                    <button class="btn-secondary" onclick="game.renderHeroSelect()">🔁 Сменить героя</button>
                </div>
            </div>
        `;
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
                <div class="inventory-slot" onclick="game.equipItem(${itemId})">
                    ${item.name}
                    ${isEquipped ? '<br><small>✓ Надето</small>' : ''}
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

        this.saveGame();
        this.renderHeroScreen();
    }

    // Настройка обработчиков событий
    setupEventListeners() {
        // Будут добавлены позже
    }

    // Сохранение игры
    saveGame() {
        if (this.currentHero) {
            localStorage.setItem('heroGameSave', JSON.stringify({
                currentHeroId: this.currentHero.id,
                heroes: this.heroes
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
