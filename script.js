// ========== ОТЛАДКА: ПРОВЕРКА ЗАГРУЗКИ СКРИПТОВ ==========
console.log("🎯 1. Script.js ЗАГРУЖЕН");

// Проверка модулей
console.log("🎯 2. BonusSystem:", typeof BonusSystem);
console.log("🎯 3. LevelSystem:", typeof LevelSystem);
console.log("🎯 4. BattleSystem:", typeof BattleSystem);
console.log("🎯 5. EquipmentSystem:", typeof EquipmentSystem);

// ========== МОДУЛЬ 1: ОСНОВНОЙ КЛАСС И ИНИЦИАЛИЗАЦИЯ ==========

class HeroGame {
    constructor() {
        console.log("🎯 6. КОНСТРУКТОР HeroGame ВЫЗВАН");
        
        // ========== ИНИЦИАЛИЗАЦИЯ МОДУЛЕЙ ==========
        console.log("🎯 7. Инициализация модулей...");
        this.bonusSystem = new BonusSystem();
        this.levelSystem = new LevelSystem();
        this.battleSystem = new BattleSystem();
        this.equipmentSystem = new EquipmentSystem();
        console.log("🎯 8. Модули инициализированы");
        
        // ========== МАССИВЫ ДАННЫХ ИГРЫ ==========
        this.heroes = [];
        this.items = [];
        this.monsters = [];
        
        // ========== ТЕКУЩЕЕ СОСТОЯНИЕ ==========
        this.currentHero = null;
        this.currentMonster = null;
        this.currentScreen = 'hero-select';
        
        // ========== СИСТЕМА БОЯ ==========
        this.battleActive = false;
        this.battleResult = null;
        this.battleLog = [];
        this.battleRound = 0;
        
        // ========== ОТОБРАЖЕНИЕ ==========
        this.showReward = false;
        this.lastReward = 0;
        this.healthInterval = null;
        this.lastHealthUpdate = Date.now();
        
        // ========== ВИДЕО И ИЗОБРАЖЕНИЯ ==========
        this.showVideo = {
            hero: false,
            map: false,
            location: false
        };
        
        this.heroVideos = {
            1: 'https://www.youtube.com/embed/mfziNIhX9mo',
            2: 'https://www.youtube.com/embed/dQw4w9WgXcQ',  
            3: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        };
        
        // Запуск инициализации
        this.init();
    }

    async init() {
        console.log("🎯 9. INIT() ВЫЗВАН");
        
        await this.loadGameData();
        console.log("🎯 10. Данные загружены");
        
        this.renderHeroSelect();
        console.log("🎯 11. Интерфейс отрисован");
    }

    async loadGameData() {
        console.log("🎯 12. LOAD GAME DATA ВЫЗВАН");
        try {
            const [heroes, monsters, items] = await Promise.all([
                this.loadJSON('data/heroes.json'),
                this.loadJSON('data/enemies.json'), 
                this.loadJSON('data/items.json')
            ]);
            console.log("🎯 13. JSON файлы загружены");

            this.heroes = heroes || [];
            this.monsters = monsters || [];
            this.items = items || [];
            console.log("🎯 14. Данные присвоены");

            // Разблокировка первого героя
            if (this.heroes.length > 0) {
                const firstHero = this.heroes.find(h => h.id === 1);
                if (firstHero) {
                    firstHero.unlocked = true;
                }
            }

            console.log('✅ Данные загружены:', {
                heroes: this.heroes.length,
                monsters: this.monsters.length,
                items: this.items.length
            });

        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
            this.createFallbackData();
        }
    }

    async loadJSON(filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error('HTTP error! status: ' + response.status);
            return await response.json();
        } catch (error) {
            console.error('Ошибка загрузки ' + filePath + ':', error);
            return null;
        }
    }

    createFallbackData() {
        console.log("🎯 15. СОЗДАНИЕ ТЕСТОВЫХ ДАННЫХ");
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
        console.log("🎯 16. Тестовые данные созданы");
    }

    // ========== СИСТЕМА ХАРАКТЕРИСТИК И БОНУСОВ ==========

    calculateHeroStats(hero) {
        hero = hero || this.currentHero;
        if (!hero) return {};
        
        const totals = this.bonusSystem.calculateTotalBonuses(hero, this.items);
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
            activeSets: this.bonusSystem.getActiveSetBonuses(hero, this.items)
        };
    }

    getAllActiveBonuses(hero) {
        return this.bonusSystem.getAllActiveBonuses(hero, this.items);
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
        
        // Регенерация здоровья со временем
        if (currentHealth > 0 && currentHealth < maxHealth) {
            const totals = this.bonusSystem.calculateTotalBonuses(hero, this.items);
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

    calculateMaxHealth(hero) {
        hero = hero || this.currentHero;
        if (!hero) return 0;
        
        const totals = this.bonusSystem.calculateTotalBonuses(hero, this.items);
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
    }

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
}

// ========== ЗАПУСК ИГРЫ С ОТЛАДКОЙ ==========
console.log("🎯 15. ЗАПУСК ИГРЫ...");
let game;
document.addEventListener('DOMContentLoaded', () => {
    console.log("🎯 16. DOM ЗАГРУЖЕН");
    try {
        game = new HeroGame();
        window.game = game;
        console.log("🎯 17. ИГРА СОЗДАНА УСПЕШНО!");
    } catch (error) {
        console.error("🎯 17. ОШИБКА СОЗДАНИЯ ИГРЫ:", error);
    }
});
console.log("🎯 18. Script.js ВЫПОЛНЕН ДО КОНЦА");
