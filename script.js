"use strict";

// ========== МОДУЛЬ 1: СИСТЕМА ПРОВЕРКИ МОДУЛЕЙ ==========
class ModuleLoader {
    constructor() {
        this.loadedModules = new Set();
        this.requiredModules = [
            'bonuses-system',
            'level-system', 
            'battle-system',
            'equipment-system',
            'hero-system',
            'map-system'
        ];
    }

    // Просто проверяем, что стили загружены
    async loadStyles() {
        console.log("✅ Стили загружены через HTML");
        return true;
    }

    // Проверяем доступность модулей
    isModuleAvailable(moduleName) {
        return typeof window[this.getClassName(moduleName)] !== 'undefined';
    }

    // Преобразует имя файла в имя класса (kebab-case to PascalCase)
    getClassName(moduleName) {
        const classMap = {
            'bonuses-system': 'BonusSystem',
            'level-system': 'LevelSystem',
            'battle-system': 'BattleSystem',
            'equipment-system': 'EquipmentSystem',
            'hero-system': 'HeroSystem',
            'map-system': 'MapSystem'
        };
        return classMap[moduleName] || moduleName;
    }

    async waitForAllModules() {
        const maxAttempts = 50;
        const checkInterval = 100;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const loaded = this.requiredModules.every(module => 
                this.isModuleAvailable(module)
            );
            
            if (loaded) {
                console.log("🎉 Все модули загружены и готовы!");
                return true;
            }
            
            if (attempt === 1) {
                console.log("⏳ Ожидание инициализации модулей...");
            }
            
            if (attempt % 10 === 0) {
                console.log(`⏳ Попытка ${attempt}/${maxAttempts}...`);
                // Выводим информацию о том, какие модули еще не загружены
                const missingModules = this.requiredModules.filter(module => 
                    !this.isModuleAvailable(module)
                );
                console.log("❌ Отсутствуют модули:", missingModules);
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        const missingModules = this.requiredModules.filter(module => 
            !this.isModuleAvailable(module)
        );
        throw new Error(`Модули не загрузились за ${maxAttempts/10} секунд. Отсутствуют: ${missingModules.join(', ')}`);
    }

    async loadAllModules() {
        console.log("🔍 Проверка модулей...");
        
        // Просто ждем, когда модули станут доступны (они уже загружены в HTML)
        return await this.waitForAllModules();
    }
}

// ========== МОДУЛЬ 2: ОСНОВНОЙ КЛАСС ИГРЫ ==========
class SafeHeroGame {
    constructor() {
        this.moduleLoader = new ModuleLoader();
        this.systems = {};
        this.currentScreen = 'loading';
        
        // Запускаем инициализацию с небольшой задержкой, чтобы DOM точно был готов
        setTimeout(() => this.init(), 100);
    }

    async init() {
        try {
            console.log("🎮 Инициализация игры...");
            
            // Показываем экран загрузки
            this.showLoadingScreen("Инициализация игровых систем...");
            
            // Проверяем что стили загружены
            await this.moduleLoader.loadStyles();
            
            // Ждем загрузки модулей
            await this.moduleLoader.loadAllModules();
            
            // Инициализируем системы
            await this.initializeSystems();
            
            // Загружаем игровые данные
            await this.loadGameData();
            
            // Показываем главный экран
            this.renderMainScreen();
            
        } catch (error) {
            console.error("💀 Критическая ошибка инициализации:", error);
            this.panic(error);
        }
    }

    async initializeSystems() {
        console.log("⚙️ Инициализация игровых систем...");
        
        try {
            // Проверяем что все классы доступны
            const classes = {
                BonusSystem: typeof BonusSystem,
                LevelSystem: typeof LevelSystem,
                BattleSystem: typeof BattleSystem,
                EquipmentSystem: typeof EquipmentSystem,
                HeroSystem: typeof HeroSystem,
                MapSystem: typeof MapSystem
            };
            
            console.log("Доступные классы:", classes);
            
            // Создаем экземпляры систем
            this.systems.bonus = new BonusSystem();
            this.systems.level = new LevelSystem();
            this.systems.battle = new BattleSystem();
            this.systems.equipment = new EquipmentSystem();
            this.systems.hero = new HeroSystem();
            this.systems.map = new MapSystem();
            
            console.log("✅ Все системы инициализированы:", this.systems);
            
        } catch (error) {
            console.error("❌ Ошибка при создании систем:", error);
            throw new Error(`Ошибка инициализации систем: ${error.message}`);
        }
    }

    async loadGameData() {
        console.log("📂 Загрузка игровых данных...");
        
        try {
            // Проверяем что у систем есть методы загрузки
            const loadPromises = [];
            
            if (this.systems.hero && typeof this.systems.hero.loadHeroData === 'function') {
                loadPromises.push(this.systems.hero.loadHeroData());
            }
            
            if (this.systems.equipment && typeof this.systems.equipment.loadItemData === 'function') {
                loadPromises.push(this.systems.equipment.loadItemData());
            }
            
            if (this.systems.battle && typeof this.systems.battle.loadBattleData === 'function') {
                loadPromises.push(this.systems.battle.loadBattleData());
            }
            
            if (this.systems.map && typeof this.systems.map.loadMapData === 'function') {
                loadPromises.push(this.systems.map.loadMapData());
            }
            
            if (this.systems.bonus && typeof this.systems.bonus.loadBonusData === 'function') {
                loadPromises.push(this.systems.bonus.loadBonusData());
            }
            
            if (this.systems.level && typeof this.systems.level.loadLevelData === 'function') {
                loadPromises.push(this.systems.level.loadLevelData());
            }
            
            await Promise.all(loadPromises);
            
            console.log("✅ Все игровые данные загружены");
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных:", error);
            throw new Error(`Ошибка загрузки данных: ${error.message}`);
        }
    }

    showLoadingScreen(message) {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div class="loading-screen">
                    <div class="loading-content">
                        <h2>🔄 Tigrimion RPG</h2>
                        <p>${message}</p>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div class="progress-fill" id="loadingProgress"></div>
                            </div>
                        </div>
                        <div class="module-status" id="moduleStatus">
                            Инициализация...
                        </div>
                    </div>
                </div>
            `;
        }
    }

    updateLoadingProgress(percent, message) {
        const progress = document.getElementById('loadingProgress');
        const status = document.getElementById('moduleStatus');
        
        if (progress) progress.style.width = percent + '%';
        if (status) status.textContent = message;
    }

  renderMainScreen() {
    const app = document.getElementById('app');
    if (!app) {
        console.error("❌ Элемент #app не найден!");
        return;
    }

    app.innerHTML = `
        <div class="main-screen">
            <header class="game-header">
                <h1>🎮 TIGRIMION RPG</h1>
                <p class="game-subtitle">Модульная RPG система</p>
            </header>
            
            <!-- Основной layout с 4 колонками -->
            <div class="hero-layout">
                <!-- Колонка героя -->
                <div class="hero-column">
                    <div class="column-background" style="background-image: url('https://via.placeholder.com/400x600/1a1a2e/ffffff?text=Hero')"></div>
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">👤 ГЕРОЙ</div>
                        
                        <!-- Информация о герое -->
                        <div class="hero-info">
                            <h2>Йормунд</h2>
                            <div class="health-display">
                                <div class="health-bar-container">
                                    <div class="health-bar">
                                        <div class="health-bar-fill" style="width: 100%"></div>
                                    </div>
                                </div>
                                <div class="health-text">100/100 HP</div>
                                <div class="health-regen">+5 HP/ход</div>
                            </div>
                            
                            <div class="hero-main-stats">
                                <div class="main-stat">
                                    <div class="stat-icon">⚔️</div>
                                    <div class="stat-value">15</div>
                                    <small>Атака</small>
                                </div>
                                <div class="main-stat">
                                    <div class="stat-icon">🛡️</div>
                                    <div class="stat-value">12</div>
                                    <small>Защита</small>
                                </div>
                                <div class="main-stat">
                                    <div class="stat-icon">❤️</div>
                                    <div class="stat-value">100</div>
                                    <small>Здоровье</small>
                                </div>
                            </div>
                            
                            <div class="level-progress">
                                <div class="level-progress-fill" style="width: 45%"></div>
                            </div>
                            <div class="hero-progress">
                                <span>Ур. 5</span>
                                <span>Опыт: 245/500</span>
                            </div>
                            
                            <div class="hero-stats">
                                <div class="stat-item">
                                    <span class="stat-icon">🎯</span>
                                    <span class="stat-label">Крит:</span>
                                    <span class="stat-value">15%</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-icon">⚡</span>
                                    <span class="stat-label">Скор:</span>
                                    <span class="stat-value">12</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-icon">🔄</span>
                                    <span class="stat-label">Увор:</span>
                                    <span class="stat-value">8%</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Экипировка -->
                        <div class="equipment-section">
                            <div class="equipment-slot weapon-slot equipped" data-rarity="rare">
                                <div class="equipment-icon">⚔️</div>
                            </div>
                            <div class="equipment-slot armor-slot equipped" data-rarity="uncommon">
                                <div class="equipment-icon">🛡️</div>
                            </div>
                            <div class="equipment-slot armor-slot equipped" data-rarity="common">
                                <div class="equipment-icon">⛑️</div>
                            </div>
                            <div class="equipment-slot armor-slot equipped" data-rarity="common">
                                <div class="equipment-icon">🧥</div>
                            </div>
                            <div class="equipment-slot armor-slot empty">
                                <div class="equipment-icon">➕</div>
                            </div>
                            <div class="equipment-slot armor-slot empty">
                                <div class="equipment-icon">➕</div>
                            </div>
                        </div>
                        
                        <!-- Бонусы -->
                        <div class="bonuses-section">
                            <h3>🎁 БОНУСЫ</h3>
                            <div class="bonus-source-group race-bonus">
                                <div class="bonus-source-title">🧬 Раса: Человек</div>
                                <div class="bonus-display">
                                    <div class="bonus-badge race-bonus">+1 ко всем характеристикам</div>
                                </div>
                            </div>
                            <div class="bonus-source-group class-bonus">
                                <div class="bonus-source-title">⚔️ Класс: Воин</div>
                                <div class="bonus-display">
                                    <div class="bonus-badge class-bonus">+5 к атаке</div>
                                    <div class="bonus-badge class-bonus">+3 к защите</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Колонка монстра -->
                <div class="monster-column">
                    <div class="column-background" style="background-image: url('https://via.placeholder.com/400x600/2d1a2e/ffffff?text=Monster')"></div>
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">👹 МОНСТР</div>
                        
                        <!-- Статистика монстра -->
                        <div class="monster-stats-grid">
                            <div class="monster-stat-card">
                                <div>⚔️ Атака</div>
                                <div class="monster-stat-value">12</div>
                            </div>
                            <div class="monster-stat-card">
                                <div>🛡️ Защита</div>
                                <div class="monster-stat-value">8</div>
                            </div>
                            <div class="monster-stat-card">
                                <div>❤️ Здоровье</div>
                                <div class="monster-stat-value">80</div>
                            </div>
                            <div class="monster-stat-card">
                                <div>🎯 Крит</div>
                                <div class="monster-stat-value">10%</div>
                            </div>
                        </div>
                        
                        <!-- Бой -->
                        <div class="battle-in-monster-column">
                            <div class="battle-header">
                                <h4>⚔️ БОЙ</h4>
                                <div class="battle-round">Раунд 1</div>
                            </div>
                            
                            <div class="battle-combatants-compact">
                                <div class="combatant-compact" style="border-color: #4cc9f0;">
                                    <div class="combatant-image-compact">
                                        <div style="width:100%;height:100%;background:#4cc9f0;display:flex;align-items:center;justify-content:center;color:white">👤</div>
                                    </div>
                                    <div>Йормунд</div>
                                    <div class="health-bar-compact">
                                        <div class="health-bar-fill-compact" style="width: 100%; background: #4ade80;"></div>
                                    </div>
                                    <small>100/100</small>
                                </div>
                                
                                <div class="vs-compact">VS</div>
                                
                                <div class="combatant-compact" style="border-color: #f87171;">
                                    <div class="combatant-image-compact">
                                        <div style="width:100%;height:100%;background:#f87171;display:flex;align-items:center;justify-content:center;color:white">👹</div>
                                    </div>
                                    <div>Гоблин</div>
                                    <div class="health-bar-compact">
                                        <div class="health-bar-fill-compact" style="width: 100%; background: #4ade80;"></div>
                                    </div>
                                    <small>80/80</small>
                                </div>
                            </div>
                            
                            <div class="battle-log-compact">
                                <div class="battle-log-entry-compact">Бой начался!</div>
                                <div class="battle-log-entry-compact">Йормунд атакует Гоблина</div>
                                <div class="battle-log-entry-compact">Гоблин атакует в ответ</div>
                            </div>
                            
                            <div class="battle-actions-compact">
                                <button class="btn-battle-attack-compact">⚔️ Атаковать</button>
                                <button class="btn-battle-escape-compact">🏃 Сбежать</button>
                            </div>
                        </div>
                        
                        <!-- Действия с монстром -->
                        <div class="monster-actions">
                            <button class="btn-primary">🎯 Найти монстра</button>
                            <button class="btn-secondary">🏃 Сбежать из боя</button>
                            <button class="btn-danger">💀 Авто-бой</button>
                        </div>
                    </div>
                </div>
                
                <!-- Колонка карты -->
                <div class="map-column">
                    <div class="column-background" style="background-image: url('https://via.placeholder.com/400x600/1a2e2a/ffffff?text=Map')"></div>
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">🗺️ КАРТА</div>
                        
                        <!-- Видео контейнер -->
                        <div class="video-container">
                            <div style="width:100%;height:100%;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;color:white;font-size:1.2em">
                                🎥 Видео карты
                            </div>
                        </div>
                        <button class="video-toggle">🎬 Переключить видео</button>
                        
                        <!-- Выбор карты -->
                        <div style="margin-top: 20px;">
                            <h4 style="color: #ffd700; margin-bottom: 10px;">Доступные карты:</h4>
                            <div class="maps-grid">
                                <div class="map-option">
                                    <strong>Лес Теней</strong>
                                    <div>Уровень: 1-5</div>
                                    <div>Монстры: Гоблины, Волки</div>
                                </div>
                                <div class="map-option">
                                    <strong>Горный перевал</strong>
                                    <div>Уровень: 3-7</div>
                                    <div>Монстры: Орки, Тролли</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Колонка локации -->
                <div class="location-column">
                    <div class="column-background" style="background-image: url('https://via.placeholder.com/400x600/2e2a1a/ffffff?text=Location')"></div>
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">🏰 ЛОКАЦИЯ</div>
                        
                        <!-- Прогресс локации -->
                        <div style="background: rgba(0,0,0,0.7); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                            <h4 style="color: #f59e0b; margin-bottom: 10px;">Лес Теней</h4>
                            <div class="location-progress-text">Прогресс исследования: 65%</div>
                            <div class="location-progress">
                                <div class="location-progress-fill" style="width: 65%"></div>
                            </div>
                            <div style="margin-top: 8px; font-size: 0.9em;">
                                Исследовано: 13/20 зон
                            </div>
                        </div>
                        
                        <!-- Действия локации -->
                        <div class="action-buttons">
                            <button class="btn-primary">🏃 Исследовать</button>
                            <button class="btn-secondary">🛌 Отдохнуть</button>
                            <button class="btn-primary">🏪 Магазин</button>
                            <button class="btn-secondary">🎒 Инвентарь</button>
                            <button class="btn-primary">⚙️ Настройки</button>
                            <button class="btn-secondary">📊 Статистика</button>
                        </div>
                        
                        <!-- Журнал событий -->
                        <div style="margin-top: 15px;">
                            <h4 style="color: #ffd700; margin-bottom: 10px;">📜 ЖУРНАЛ СОБЫТИЙ</h4>
                            <div class="battle-log">
                                <div class="log-entry">Вы вошли в Лес Теней</div>
                                <div class="log-entry">Найден сундук с сокровищами</div>
                                <div class="log-entry">Побежден Гоблин-разведчик</div>
                                <div class="log-entry">Получено: 50 золота</div>
                                <div class="log-entry">Получен опыт: 25 очков</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    console.log("🎯 4-колоночный интерфейс отображен");
}

startGame() {
    console.log("🔄 Запуск игры...", this.systems);
    
    // Вместо выбора героя сразу показываем основной игровой интерфейс
    this.renderMainScreen();
    
    // Или если нужно сначала выбрать героя:
    // if (this.systems.hero && typeof this.systems.hero.showHeroSelection === 'function') {
    //     this.systems.hero.showHeroSelection();
    // } else {
    //     console.error("❌ HeroSystem не готова:", this.systems.hero);
    //     alert("Система героев еще не готова! Проверь консоль для деталей.");
    // }
}

    showDebugInfo() {
        console.log("=== ДЕБАГ ИНФОРМАЦИЯ ===");
        console.log("Загруженные модули:", this.moduleLoader.loadedModules);
        console.log("Системы:", this.systems);
        console.log("Глобальные классы:", {
            BonusSystem: typeof BonusSystem,
            LevelSystem: typeof LevelSystem,
            BattleSystem: typeof BattleSystem,
            EquipmentSystem: typeof EquipmentSystem,
            HeroSystem: typeof HeroSystem,
            MapSystem: typeof MapSystem
        });
        
        // Проверяем стили
        console.log("CSS файл загружен:", !!document.getElementById('game-styles'));
        console.log("Все стили в head:", document.head.querySelectorAll('link, style').length);
        
        alert("Информация выведена в консоль (F12)");
    }

    panic(error) {
        const app = document.getElementById('app');
        if (!app) {
            document.body.innerHTML = `
                <div style="padding: 20px; background: #dc2626; color: white; font-family: Arial, sans-serif;">
                    <h1>🚨 КРИТИЧЕСКАЯ ОШИБКА</h1>
                    <p><strong>Сообщение:</strong> ${error.message}</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; background: white; color: #dc2626; border: none; border-radius: 5px; cursor: pointer;">
                        🔄 Перезагрузить игру
                    </button>
                </div>
            `;
            return;
        }

        const errorHtml = `
            <div class="error-screen">
                <div class="error-content">
                    <h1>🚨 КРИТИЧЕСКАЯ ОШИБКА</h1>
                    <div class="error-details">
                        <strong>Сообщение:</strong> ${error.message}
                    </div>
                    <div class="error-modules">
                        <strong>Статус модулей:</strong>
                        <div class="modules-list">
                            ${this.moduleLoader.requiredModules.map(module => `
                                <div class="module-status ${this.moduleLoader.isModuleAvailable(module) ? 'loaded' : 'missing'}">
                                    ${module}: ${this.moduleLoader.isModuleAvailable(module) ? '✅' : '❌'}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="error-actions">
                        <button onclick="location.reload()" class="btn-reload">
                            🔄 Перезагрузить игру
                        </button>
                        <button onclick="game.showDebugInfo()" class="btn-debug">
                            🐛 Подробности ошибки
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        app.innerHTML = errorHtml;
        console.error("💀 ПАНИКА:", error);
    }
}

// Инициализация при полной загрузке страницы
window.addEventListener('load', () => {
    console.log("🎮 Запуск Tigrimion RPG...");
    console.log("DOM полностью загружен");
    
    // Проверяем что элемент app существует
    if (!document.getElementById('app')) {
        console.error("❌ Критическая ошибка: элемент #app не найден в DOM!");
        return;
    }
    
    window.game = new SafeHeroGame();
});
