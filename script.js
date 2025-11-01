// Основной класс игры
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
        
        this.init();
    }

    async init() {
        console.log('🎮 Игра инициализируется...');
        await this.loadGameData();
        this.renderHeroSelect();
    }

    async loadGameData() {
        try {
            // Создаем тестовых героев
            this.heroes = [
                {
                    id: 1,
                    name: "Воин Света",
                    image: "https://via.placeholder.com/300x400/336699/ffffff?text=Hero+1",
                    race: "human",
                    class: "warrior",
                    level: 1,
                    gold: 100,
                    experience: 0,
                    unlocked: true,
                    baseHealth: 100,
                    baseDamage: 20,
                    baseArmor: 10,
                    healthRegen: 100/60,
                    inventory: [],
                    equipment: { main_hand: null, chest: null }
                },
                {
                    id: 2,
                    name: "Эльфийский Лучник",
                    image: "https://via.placeholder.com/300x400/339966/ffffff?text=Hero+2",
                    race: "elf",
                    class: "archer",
                    level: 1,
                    gold: 80,
                    experience: 0,
                    unlocked: true,
                    baseHealth: 80,
                    baseDamage: 25,
                    baseArmor: 8,
                    healthRegen: 80/60,
                    inventory: [],
                    equipment: { main_hand: null, chest: null }
                },
                {
                    id: 3,
                    name: "Гномий Кузнец",
                    image: "https://via.placeholder.com/300x400/996633/ffffff?text=Hero+3",
                    race: "dwarf",
                    class: "blacksmith",
                    level: 1,
                    gold: 120,
                    experience: 0,
                    unlocked: false,
                    baseHealth: 120,
                    baseDamage: 15,
                    baseArmor: 15,
                    healthRegen: 120/60,
                    inventory: [],
                    equipment: { main_hand: null, chest: null }
                }
            ];

            console.log('✅ Данные загружены, героев:', this.heroes.length);
            
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
        }
    }

    // ПРОСТАЯ ВЕРСИЯ ВЫБОРА ГЕРОЯ
    selectHero(heroId) {
        console.log('🖱️ Нажатие на героя:', heroId);
        
        const hero = this.heroes.find(h => h.id === heroId);
        if (!hero) {
            console.error('Герой не найден');
            return;
        }
        
        // ПРОСТАЯ ПРОВЕРКА - всегда разрешаем выбор
        this.currentHero = hero;
        this.showScreen('main');
        this.renderHeroScreen();
        
        console.log('✅ Герой выбран:', hero.name);
    }

    showScreen(screenName) {
        this.currentScreen = screenName;
        console.log('🖥️ Переключение на экран:', screenName);
    }

    renderHeroSelect() {
        console.log('🎨 Отрисовка выбора героя');
        const container = document.getElementById('app');
        
        if (!container) {
            console.error('❌ Контейнер app не найден!');
            return;
        }

        const heroesHTML = this.heroes.map(hero => {
            const isUnlocked = hero.unlocked === true;
            
            return `
                <div class="hero-option ${isUnlocked ? '' : 'locked'}" 
                     onclick="game.selectHero(${hero.id})">
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
                                <span>❤️ ${hero.baseHealth}</span>
                                <span>⚔️ ${hero.baseDamage}</span>
                                <span>🛡️ ${hero.baseArmor}</span>
                            </div>
                            <div class="stat-row">
                                <span>💰 ${hero.gold}</span>
                                <span>🏹 ${hero.race}</span>
                            </div>
                        </div>
                        ${!isUnlocked ? '<small class="locked-text">Заблокирован</small>' : ''}
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
                <div style="text-align: center; margin-top: 20px; color: #888;">
                    <small>Для отладки: откройте консоль (F12)</small>
                </div>
            </div>
        `;
        
        console.log('✅ Выбор героя отрендерен');
    }

    renderHeroScreen() {
        if (!this.currentHero) return;
        
        console.log('🎨 Отрисовка экрана героя:', this.currentHero.name);
        
        const container = document.getElementById('app');
        container.innerHTML = `
            <div class="screen active" id="screen-main">
                <div class="action-buttons">
                    <button class="btn-primary" onclick="game.startAdventure()">🎲 Путешествие</button>
                    <button class="btn-secondary" onclick="game.showInventory()">🎒 Инвентарь</button>
                    <button class="btn-secondary" onclick="game.renderHeroSelect()">🔁 Назад к героям</button>
                </div>
                
                <div style="background: rgba(0,0,0,0.8); padding: 20px; border-radius: 10px; margin: 20px; text-align: center;">
                    <h1>🎯 ${this.currentHero.name}</h1>
                    <p>Добро пожаловать в игру!</p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 20px;">
                        <div class="hero-stat">
                            <div>❤️ Здоровье</div>
                            <div class="stat-value">${this.currentHero.baseHealth}</div>
                        </div>
                        <div class="hero-stat">
                            <div>⚔️ Урон</div>
                            <div class="stat-value">${this.currentHero.baseDamage}</div>
                        </div>
                        <div class="hero-stat">
                            <div>🛡️ Броня</div>
                            <div class="stat-value">${this.currentHero.baseArmor}</div>
                        </div>
                    </div>
                    <div style="margin-top: 20px;">
                        <p>💰 Золото: ${this.currentHero.gold}</p>
                        <p>📊 Уровень: ${this.currentHero.level}</p>
                    </div>
                </div>
                
                <div class="battle-log" id="battle-log">
                    <div class="log-entry">✅ Герой "${this.currentHero.name}" успешно выбран!</div>
                </div>
            </div>
        `;
    }

    // Заглушки для остальных методов
    startAdventure() {
        this.addToLog('🚀 Начато путешествие!');
    }

    showInventory() {
        this.addToLog('🎒 Открыт инвентарь!');
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
}

// Запуск игры
console.log('🚀 Загрузка игры...');

let game;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM загружен');
        game = new HeroGame();
        window.game = game;
    });
} else {
    console.log('✅ DOM уже готов');
    game = new HeroGame();
    window.game = game;
}

// Простые функции для отладки
window.debugGame = function() {
    if (window.game) {
        console.log('=== ДЕБАГ ИНФОРМАЦИЯ ===');
        console.log('Текущий герой:', game.currentHero?.name || 'Нет');
        console.log('Текущий экран:', game.currentScreen);
        console.log('Всего героев:', game.heroes.length);
    }
};

window.unlockAll = function() {
    if (window.game) {
        game.heroes.forEach(hero => hero.unlocked = true);
        game.renderHeroSelect();
        console.log('🔓 Все герои разблокированы');
    }
};
