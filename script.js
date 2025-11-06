"use strict";

// ========== МОДУЛЬ 1: СИСТЕМА ДИНАМИЧЕСКОЙ ЗАГРУЗКИ МОДУЛЕЙ И СТИЛЕЙ ==========
class ModuleLoader {
    constructor() {
        this.modules = {};
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

    async loadStyles() {
        return new Promise((resolve, reject) => {
            // Если стили уже загружены
            if (document.getElementById('game-styles')) {
                console.log("✅ Стили уже загружены");
                resolve(true);
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'style.css';
            link.id = 'game-styles';
            
            let stylesLoaded = false;

            // Таймаут для стилей
            const styleTimeout = setTimeout(() => {
                if (!stylesLoaded) {
                    console.warn("⚠️ Таймаут загрузки стилей, используем резервные");
                    this.createFallbackStyles();
                    resolve(false);
                }
            }, 3000); // 3 секунды на загрузку стилей

            link.onload = () => {
                clearTimeout(styleTimeout);
                stylesLoaded = true;
                console.log("✅ Внешние стили загружены");
                resolve(true);
            };
            
            link.onerror = () => {
                clearTimeout(styleTimeout);
                stylesLoaded = true;
                console.warn("❌ Ошибка загрузки внешних стилей, используем резервные");
                this.createFallbackStyles();
                resolve(false);
            };
            
            document.head.appendChild(link);
        });
    }

    // Базовые стили на случай если файл стилей не найден
    createFallbackStyles() {
        // Проверяем, не добавлены ли уже fallback стили
        if (document.getElementById('fallback-styles')) {
            return;
        }

        const fallbackStyles = `
            /* Базовые сбросы */
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            /* Основные стили игры */
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                color: white;
                line-height: 1.6;
                min-height: 100vh;
                padding: 20px;
            }
            
            /* Экран загрузки */
            .loading-screen { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                text-align: center; 
            }
            
            /* Основные кнопки */
            .btn-primary, .btn-secondary { 
                padding: 12px 24px; 
                margin: 8px; 
                border: none; 
                border-radius: 8px; 
                cursor: pointer; 
                font-size: 16px;
                font-weight: bold;
                transition: all 0.3s ease;
            }
            
            .btn-primary { 
                background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
                color: white; 
            }
            .btn-primary:hover { 
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(59, 130, 246, 0.4);
            }
            
            .btn-secondary { 
                background: rgba(107, 114, 128, 0.7); 
                color: white; 
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            .btn-secondary:hover { 
                background: rgba(107, 114, 128, 0.9);
                transform: translateY(-2px);
            }
            
            /* Контейнеры */
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 20px;
            }
            
            /* Карточки систем */
            .systems-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin: 20px 0;
            }
            
            .system-card {
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 10px;
                text-align: center;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
        `;
        
        const style = document.createElement('style');
        style.id = 'fallback-styles';
        style.textContent = fallbackStyles;
        document.head.appendChild(style);
        console.log("🔄 Загружены резервные стили");
    }

    async loadModule(moduleName) {
        if (this.loadedModules.has(moduleName)) {
            console.log(`✅ Модуль ${moduleName} уже загружен`);
            return true;
        }

        try {
            const modulePath = `data/modules/${moduleName}.js`;
            console.log(`📥 Загружаем модуль: ${modulePath}`);
            
            const response = await fetch(modulePath);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} - ${response.statusText}`);
            }
            
            const moduleCode = await response.text();
            
            // Выполняем код модуля
            const script = document.createElement('script');
            script.textContent = moduleCode;
            document.head.appendChild(script);
            document.head.removeChild(script);
            
            this.loadedModules.add(moduleName);
            console.log(`✅ Модуль ${moduleName} успешно загружен`);
            return true;
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки модуля ${moduleName}:`, error);
            return false;
        }
    }

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
        const maxAttempts = 100;
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
                console.log("⏳ Ожидание модулей...");
            }
            
            if (attempt % 10 === 0) {
                console.log(`⏳ Попытка ${attempt}/${maxAttempts}...`);
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        throw new Error(`Модули не загрузились за ${maxAttempts/10} секунд`);
    }

    async loadAllModules() {
        console.log("🚀 Начинаем загрузку модулей...");
        
        // Сначала загружаем стили
        await this.loadStyles();
        
        const loadPromises = this.requiredModules.map(async (moduleName) => {
            if (!this.isModuleAvailable(moduleName)) {
                return await this.loadModule(moduleName);
            }
            return true;
        });
        
        const results = await Promise.allSettled(loadPromises);
        
        const failedModules = results
            .map((result, index) => ({ result, module: this.requiredModules[index] }))
            .filter(({ result }) => result.status === 'rejected' || result.value === false);
        
        if (failedModules.length > 0) {
            console.error("❌ Не удалось загрузить модули:", failedModules.map(f => f.module));
            throw new Error(`Не удалось загрузить модули: ${failedModules.map(f => f.module).join(', ')}`);
        }
        
        return await this.waitForAllModules();
    }
}

// ========== МОДУЛЬ 2: ОСНОВНОЙ КЛАСС ИГРЫ ==========
class SafeHeroGame {
    constructor() {
        this.moduleLoader = new ModuleLoader();
        this.systems = {};
        this.currentScreen = 'loading';
        this.init();
    }

    async init() {
        try {
            console.log("🎮 Инициализация игры...");
            
            // Показываем экран загрузки ДО загрузки стилей
            this.showLoadingScreen("Загрузка игровых модулей...");
            
            // Сначала загружаем стили
            const stylesLoaded = await this.moduleLoader.loadStyles();
            console.log(stylesLoaded ? "✅ Стили загружены" : "⚠️ Используются резервные стили");
            
            // Ждем немного чтобы стили применились
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Затем загружаем модули
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
            // Используем правильные имена классов (PascalCase)
            this.systems.bonus = new BonusSystem();
            this.systems.level = new LevelSystem();
            this.systems.battle = new BattleSystem();
            this.systems.equipment = new EquipmentSystem();
            this.systems.hero = new HeroSystem();
            this.systems.map = new MapSystem();
            
            console.log("✅ Все системы инициализированы");
            
        } catch (error) {
            throw new Error(`Ошибка инициализации систем: ${error.message}`);
        }
    }

    async loadGameData() {
        console.log("📂 Загрузка игровых данных...");
        
        try {
            await Promise.all([
                this.systems.hero.loadHeroData(),
                this.systems.equipment.loadItemData(),
                this.systems.battle.loadBattleData(),
                this.systems.map.loadMapData(),
                this.systems.bonus.loadBonusData(),
                this.systems.level.loadLevelData()
            ]);
            
            console.log("✅ Все игровые данные загружены");
            
        } catch (error) {
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
        if (!app) return;

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
    }

    startGame() {
        console.log("🔄 Проверяем системы...", this.systems);
        
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
        
        alert("Информация выведена в консоль (F12)");
    }

    panic(error) {
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
        
        document.body.innerHTML = errorHtml;
        console.error("💀 ПАНИКА:", error);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log("🎮 Запуск Tigrimion RPG...");
    window.game = new SafeHeroGame();
});
