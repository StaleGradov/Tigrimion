// ========== МОДУЛЬ 1.1: ОСНОВНОЙ КЛАСС ИГРЫ ==========
class HeroGame {
    constructor() {
        this.heroes = [];
        this.items = [];
        this.monsters = [];
        this.maps = [];
        this.locations = [];
        
        this.currentHero = null;
        this.currentScreen = 'hero-select';
        this.currentMap = null;
        this.currentLocation = null;
        this.currentMonster = null;
        
        this.battleActive = false;
        this.battleRound = 0;
        this.battleLog = [];
        
        // НОВАЯ СИСТЕМА КАРТ
        this.mapSystem = {
            currentGlobalMap: null,
            currentLocalMap: null,
            currentTacticalMap: null,
            playerPosition: {
                global: { x: 2, y: 2 },
                local: { x: 4, y: 4 },
                tactical: { x: 5, y: 5 }
            }
        };
        
        this.init();
    }

    // ========== МОДУЛЬ 1.2: ИНИЦИАЛИЗАЦИЯ ИГРЫ ==========
    async init() {
        await this.loadGameData();
        this.initMapSystem();
        this.loadSave();
        
        if (this.heroes.length > 0) {
            const firstHero = this.heroes.find(h => h.id === 1);
            if (firstHero) {
                firstHero.unlocked = true;
            }
        }
        
        this.renderHeroSelect();
    }
}
// ========== МОДУЛЬ 2.1: ЗАГРУЗКА ДАННЫХ ИГРЫ ==========
HeroGame.prototype.loadGameData = async function() {
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

        if (this.heroes.length === 0) {
            this.createFallbackData();
        }

    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        this.createFallbackData();
    }
};

// ========== МОДУЛЬ 2.2: СОЗДАНИЕ ТЕСТОВЫХ ДАННЫХ ==========
HeroGame.prototype.createFallbackData = function() {
    this.heroes = [{
        id: 1,
        name: "Тестовый герой",
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
};

// ========== МОДУЛЬ 2.3: ЗАГРУЗКА JSON ФАЙЛОВ ==========
HeroGame.prototype.loadJSON = function(filePath) {
    return fetch(filePath)
        .then(response => {
            if (!response.ok) throw new Error('HTTP error');
            return response.json();
        })
        .catch(error => {
            console.log('Не удалось загрузить:', filePath);
            return null;
        });
};

// ========== МОДУЛЬ 2.4: ЗАГРУЗКА СОХРАНЕНИЯ ==========
HeroGame.prototype.loadSave = function() {
    try {
        const save = localStorage.getItem('heroGameSave');
        if (save) {
            const data = JSON.parse(save);
            if (data.currentHeroId) {
                this.currentHero = this.heroes.find(h => h.id === data.currentHeroId);
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки сохранения:', error);
    }
};
// ========== МОДУЛЬ 3.1: ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ КАРТ ==========
HeroGame.prototype.initMapSystem = function() {
    this.mapSystem.globalMap = {
        name: "Арканиум",
        grid: { width: 5, height: 5 }
    };
    this.mapSystem.localMap = {
        name: "Стартовая зона", 
        grid: { width: 8, height: 8 }
    };
    this.mapSystem.tacticalMap = {
        name: "Лесная поляна",
        grid: { width: 10, height: 10 }
    };
};

// ========== МОДУЛЬ 3.2: РЕНДЕРИНГ ГЛОБАЛЬНОЙ КАРТЫ ==========
HeroGame.prototype.renderGlobalMapColumn = function() {
    const pos = this.mapSystem.playerPosition.global;
    return `
        <div class="map-info">
            <h4>${this.mapSystem.globalMap.name}</h4>
            <div class="simple-map-grid">
                ${this.renderSimpleGrid(5, 5, 'global', pos)}
            </div>
            <p>Позиция: [${pos.x}, ${pos.y}]</p>
            <button class="btn-primary" onclick="game.moveOnMap('global')">Переместиться</button>
        </div>
    `;
};

// ========== МОДУЛЬ 3.3: РЕНДЕРИНГ ЛОКАЛЬНОЙ КАРТЫ ==========
HeroGame.prototype.renderLocalMapColumn = function() {
    const pos = this.mapSystem.playerPosition.local;
    return `
        <div class="map-info">
            <h4>${this.mapSystem.localMap.name}</h4>
            <div class="simple-map-grid">
                ${this.renderSimpleGrid(8, 8, 'local', pos)}
            </div>
            <p>Позиция: [${pos.x}, ${pos.y}]</p>
        </div>
    `;
};

// ========== МОДУЛЬ 3.4: РЕНДЕРИНГ ТАКТИЧЕСКОЙ КАРТЫ ==========
HeroGame.prototype.renderTacticalMapColumn = function() {
    const pos = this.mapSystem.playerPosition.tactical;
    return `
        <div class="map-info">
            <h4>${this.mapSystem.tacticalMap.name}</h4>
            <div class="simple-map-grid">
                ${this.renderSimpleGrid(10, 10, 'tactical', pos)}
            </div>
            <p>Позиция: [${pos.x}, ${pos.y}]</p>
            <button class="btn-primary" onclick="game.exploreTactical()">Исследовать</button>
        </div>
    `;
};

// ========== МОДУЛЬ 3.5: РЕНДЕРИНГ СЕТКИ КАРТЫ ==========
HeroGame.prototype.renderSimpleGrid = function(width, height, mapType, playerPos) {
    let html = '';
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const isPlayer = playerPos.x === x && playerPos.y === y;
            html += `<div class="simple-map-cell ${isPlayer ? 'player' : ''}">${isPlayer ? '👤' : '·'}</div>`;
        }
    }
    return html;
};

// ========== МОДУЛЬ 3.6: ВЗАИМОДЕЙСТВИЯ С КАРТОЙ ==========
HeroGame.prototype.moveOnMap = function(type) {
    const pos = this.mapSystem.playerPosition[type];
    pos.x = (pos.x + 1) % 5;
    pos.y = (pos.y + 1) % 5;
    this.addToLog(`Перемещение на ${type} карте: [${pos.x}, ${pos.y}]`);
    this.renderHeroScreen();
};

HeroGame.prototype.exploreTactical = function() {
    this.addToLog('Исследование тактической карты...');
    if (Math.random() > 0.5) {
        this.addToLog('🎭 Встречен монстр!');
    } else {
        this.addToLog('Ничего не найдено.');
    }
};
// ========== МОДУЛЬ 4.1: РАСЧЕТ ХАРАКТЕРИСТИК ГЕРОЯ ==========
HeroGame.prototype.calculateHeroStats = function(hero) {
    hero = hero || this.currentHero;
    if (!hero) return {};
    
    return {
        health: hero.baseHealth,
        currentHealth: hero.baseHealth,
        maxHealth: hero.baseHealth,
        damage: hero.baseDamage,
        armor: hero.baseArmor,
        power: Math.round((hero.baseHealth / 10) + (hero.baseDamage * 1.5) + (hero.baseArmor * 2))
    };
};

// ========== МОДУЛЬ 4.2: КОНФИГУРАЦИЯ БОНУСОВ ==========
HeroGame.prototype.getBonuses = function() {
    return {
        races: {
            human: { type: "gold_mult", value: 0.3, name: "Человек", description: "+30% золота" }
        },
        classes: {
            warrior: { type: "armor_mult", value: 0.15, name: "Воин", description: "+15% к броне" }
        },
        sagas: {
            golden_egg: { type: "health_mult", value: 0.3, name: "Золотое Яйцо", description: "+30% к здоровью" }
        }
    };
};

// ========== МОДУЛЬ 4.3: ПОЛУЧЕНИЕ АКТИВНЫХ БОНУСОВ ==========
HeroGame.prototype.getAllActiveBonuses = function(hero) {
    hero = hero || this.currentHero;
    if (!hero) return { race: [], class: [], saga: [], equipment: [], sets: [] };
    
    const bonuses = this.getBonuses();
    return {
        race: bonuses.races[hero.race] ? [bonuses.races[hero.race]] : [],
        class: bonuses.classes[hero.class] ? [bonuses.classes[hero.class]] : [],
        saga: bonuses.sagas[hero.saga] ? [bonuses.sagas[hero.saga]] : [],
        equipment: [],
        sets: []
    };
};
// ========== МОДУЛЬ 5.1: ОТРИСОВКА ЭКРАНА ВЫБОРА ГЕРОЯ ==========
HeroGame.prototype.renderHeroSelect = function() {
    const container = document.getElementById('app');
    container.innerHTML = `
        <div class="screen active" id="screen-hero-select">
            <h2>Выберите героя</h2>
            <div class="hero-list">
                ${this.heroes.map(hero => `
                    <div class="hero-option" onclick="game.selectHero(${hero.id})">
                        <h3>${hero.name}</h3>
                        <p>Уровень: ${hero.level}</p>
                        <p>Класс: ${hero.class}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
};

// ========== МОДУЛЬ 5.2: ВЫБОР ГЕРОЯ ==========
HeroGame.prototype.selectHero = function(heroId) {
    this.currentHero = this.heroes.find(h => h.id === heroId);
    this.renderHeroScreen();
};

// ========== МОДУЛЬ 5.3: ОТРИСОВКА ОСНОВНОГО ЭКРАНА ГЕРОЯ ==========
HeroGame.prototype.renderHeroScreen = function() {
    if (!this.currentHero) {
        this.currentHero = this.heroes[0];
    }

    const stats = this.calculateHeroStats(this.currentHero);
    const activeBonuses = this.getAllActiveBonuses(this.currentHero);

    const container = document.getElementById('app');
    
    container.innerHTML = `
        <div class="screen active" id="screen-main">
            <div class="action-buttons">
                <button class="btn-primary" onclick="game.startAdventure()">🎲 Путешествие</button>
                <button class="btn-secondary" onclick="game.showInventory()">🎒 Инвентарь</button>
                <button class="btn-secondary" onclick="game.showMerchant()">🏪 Магазин</button>
                <button class="btn-secondary" onclick="game.renderHeroSelect()">🔁 Герои</button>
            </div>

            <div class="hero-layout">
                <!-- Колонка 1: Герой -->
                <div class="hero-column">
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">🎯 ${this.currentHero.name}</div>
                        
                        <!-- Информация о здоровье -->
                        <div class="hero-info">
                            <h3>${this.currentHero.name}</h3>
                            <div class="health-display">
                                <div class="health-bar-container">
                                    <div class="health-bar">
                                        <div class="health-bar-fill" style="width: 100%"></div>
                                    </div>
                                    <div class="health-text">
                                        ❤️ ${stats.currentHealth}/${stats.maxHealth}
                                    </div>
                                </div>
                            </div>

                            <!-- Основные характеристики -->
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
                        </div>

                        <!-- Секция бонусов -->
                        <div class="bonuses-section">
                            <h4>🎯 Активные бонусы</h4>
                            ${activeBonuses.race.length > 0 ? `
                                <div class="bonus-source-group">
                                    <div class="bonus-source-title">🧬 Раса</div>
                                    <div class="bonus-display">
                                        ${activeBonuses.race.map(bonus => `
                                            <div class="bonus-badge">${bonus.description}</div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${activeBonuses.class.length > 0 ? `
                                <div class="bonus-source-group">
                                    <div class="bonus-source-title">⚔️ Класс</div>
                                    <div class="bonus-display">
                                        ${activeBonuses.class.map(bonus => `
                                            <div class="bonus-badge">${bonus.description}</div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${activeBonuses.saga.length > 0 ? `
                                <div class="bonus-source-group">
                                    <div class="bonus-source-title">📖 Сага</div>
                                    <div class="bonus-display">
                                        ${activeBonuses.saga.map(bonus => `
                                            <div class="bonus-badge">${bonus.description}</div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Прогресс уровня -->
                        <div class="hero-progress">
                            <span>Ур.${this.currentHero.level}</span>
                            <span>💰${this.currentHero.gold.toFixed(2)}</span>
                            <span>⚡${this.currentHero.experience}/100</span>
                        </div>
                    </div>
                </div>

                <!-- Колонка 2: Глобальная карта -->
                <div class="monster-column">
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">🗺️ Глобальная карта</div>
                        ${this.renderGlobalMapColumn()}
                    </div>
                </div>

                <!-- Колонка 3: Локальная карта -->
                <div class="map-column">
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">📍 Локальная карта</div>
                        ${this.renderLocalMapColumn()}
                    </div>
                </div>

                <!-- Колонка 4: Тактическая карта -->
                <div class="location-column">
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">⚔️ Тактическая карта</div>
                        ${this.renderTacticalMapColumn()}
                    </div>
                </div>
            </div>

            <div class="battle-log" id="battle-log">
                <div class="log-entry">Игра загружена успешно!</div>
            </div>
        </div>
    `;
};
// ========== МОДУЛЬ 6.1: ДОБАВЛЕНИЕ СООБЩЕНИЙ В ЛОГ ==========
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

// ========== МОДУЛЬ 6.2: ОСНОВНЫЕ ДЕЙСТВИЯ ==========
HeroGame.prototype.startAdventure = function() {
    this.addToLog('🚀 Начато путешествие!');
};

HeroGame.prototype.showInventory = function() {
    this.addToLog('🎒 Открыт инвентарь');
};

HeroGame.prototype.showMerchant = function() {
    this.addToLog('🏪 Открыт магазин');
};

HeroGame.prototype.resetHero = function() {
    this.addToLog('🔄 Герой сброшен');
};
// ========== МОДУЛЬ 7.1: ИНИЦИАЛИЗАЦИЯ И ЗАПУСК ИГРЫ ==========
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new HeroGame();
    window.game = game;
});
