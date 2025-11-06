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
                
                <div class="systems-status">
                    <h3>✅ Загруженные системы:</h3>
                    <div class="systems-grid">
                        ${Object.keys(this.systems).map(system => `
                            <div class="system-card">
                                <strong>${system}</strong>
                                <span>✅ Готов</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="main-actions">
                    <button class="btn-primary" onclick="game.startGame()">
                        🚀 Начать игру
                    </button>
                    <button class="btn-secondary" onclick="game.showDebugInfo()">
                        🐛 Информация о системе
                    </button>
                </div>
            </div>
        `;
        
        console.log("🎯 Главный экран отображен");
    }

    startGame() {
        console.log("🔄 Запуск игры...", this.systems);
        
        if (this.systems.hero && typeof this.systems.hero.showHeroSelection === 'function') {
            this.systems.hero.showHeroSelection();
        } else {
            console.error("❌ HeroSystem не готова:", this.systems.hero);
            alert("Система героев еще не готова! Проверь консоль для деталей.");
        }
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
