// ========== МИНИМАЛЬНАЯ РАБОЧАЯ ВЕРСИЯ С СИСТЕМОЙ КАРТ ==========

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
        
        // НОВАЯ СИСТЕМА КАРТ - ПРОСТАЯ ВЕРСИЯ
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

    async init() {
        await this.loadGameData();
        this.initMapSystem(); // Простая инициализация карт
        this.loadSave();
        
        if (this.heroes.length > 0) {
            const firstHero = this.heroes.find(h => h.id === 1);
            if (firstHero) {
                firstHero.unlocked = true;
            }
        }
        
        this.renderHeroSelect();
    }

    // ПРОСТАЯ ИНИЦИАЛИЗАЦИЯ КАРТ
    initMapSystem() {
        // Базовые данные карт
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

            // Создаем тестового героя если данные не загрузились
            if (this.heroes.length === 0) {
                this.createFallbackData();
            }

        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.createFallbackData();
        }
    }

    createFallbackData() {
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
    }

    loadJSON(filePath) {
        return fetch(filePath)
            .then(response => {
                if (!response.ok) throw new Error('HTTP error');
                return response.json();
            })
            .catch(error => {
                console.log('Не удалось загрузить:', filePath);
                return null;
            });
    }

    loadSave() {
        try {
            const save = localStorage.getItem('heroGameSave');
            if (save) {
                const data = JSON.parse(save);
                // Простая загрузка сохранения
                if (data.currentHeroId) {
                    this.currentHero = this.heroes.find(h => h.id === data.currentHeroId);
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки сохранения:', error);
        }
    }

    // ОСНОВНОЙ РЕНДЕР ГЕРОЯ
    renderHeroScreen() {
        if (!this.currentHero) {
            this.currentHero = this.heroes[0];
        }

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
                            <div class="hero-info">
                                <h3>${this.currentHero.name}</h3>
                                <p>Уровень: ${this.currentHero.level}</p>
                                <p>Здоровье: ${this.currentHero.baseHealth}</p>
                                <p>Урон: ${this.currentHero.baseDamage}</p>
                                <p>Броня: ${this.currentHero.baseArmor}</p>
                                <p>Золото: ${this.currentHero.gold.toFixed(2)}</p>
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
    }

    // ПРОСТЫЕ МЕТОДЫ РЕНДЕРА КАРТ
    renderGlobalMapColumn() {
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
    }

    renderLocalMapColumn() {
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
    }

    renderTacticalMapColumn() {
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
    }

    renderSimpleGrid(width, height, mapType, playerPos) {
        let html = '';
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const isPlayer = playerPos.x === x && playerPos.y === y;
                html += `<div class="simple-map-cell ${isPlayer ? 'player' : ''}">${isPlayer ? '👤' : '·'}</div>`;
            }
        }
        return html;
    }

    // ПРОСТЫЕ МЕТОДЫ ВЗАИМОДЕЙСТВИЯ
    moveOnMap(type) {
        const pos = this.mapSystem.playerPosition[type];
        pos.x = (pos.x + 1) % 5;
        pos.y = (pos.y + 1) % 5;
        this.addToLog(`Перемещение на ${type} карте: [${pos.x}, ${pos.y}]`);
        this.renderHeroScreen();
    }

    exploreTactical() {
        this.addToLog('Исследование тактической карты...');
        // Простая встреча с монстром
        if (Math.random() > 0.5) {
            this.addToLog('🎭 Встречен монстр!');
        } else {
            this.addToLog('Ничего не найдено.');
        }
    }

    startAdventure() {
        this.addToLog('🚀 Начато путешествие!');
    }

    showInventory() {
        this.addToLog('🎒 Открыт инвентарь');
    }

    showMerchant() {
        this.addToLog('🏪 Открыт магазин');
    }

    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    renderHeroSelect() {
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
    }

    selectHero(heroId) {
        this.currentHero = this.heroes.find(h => h.id === heroId);
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

    resetHero() {
        this.addToLog('🔄 Герой сброшен');
    }
}

// ЗАПУСК ИГРЫ
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new HeroGame();
    window.game = game;
});
