"use strict";

// ========== МОДУЛЬ 1: СИСТЕМА ДИНАМИЧЕСКОЙ ЗАГРУЗКИ МОДУЛЕЙ ==========
class ModuleLoader {
    constructor() {
        this.modules = {};
        this.loadedModules = new Set();
        this.requiredModules = [
            'BonusSystem',
            'LevelSystem', 
            'BattleSystem',
            'EquipmentSystem',
            'HeroSystem',
            'MapSystem'
        ];
    }

    // Загрузка отдельного модуля
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

    // Проверка доступности модуля в глобальной области
    isModuleAvailable(moduleName) {
        return typeof window[moduleName] !== 'undefined';
    }

    // Ожидание всех необходимых модулей
    async waitForAllModules() {
        const maxAttempts = 100; // 10 секунд
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

    // Последовательная загрузка всех модулей
    async loadAllModules() {
        console.log("🚀 Начинаем загрузку модулей...");
        
        const loadPromises = this.requiredModules.map(async (moduleName) => {
            // Сначала проверяем, может модуль уже загружен
            if (!this.isModuleAvailable(moduleName)) {
                return await this.loadModule(moduleName);
            }
            return true;
        });
        
        const results = await Promise.allSettled(loadPromises);
        
        // Проверяем результаты загрузки
        const failedModules = results
            .map((result, index) => ({ result, module: this.requiredModules[index] }))
            .filter(({ result }) => result.status === 'rejected' || result.value === false);
        
        if (failedModules.length > 0) {
            console.error("❌ Не удалось загрузить модули:", failedModules.map(f => f.module));
            throw new Error(`Не удалось загрузить модули: ${failedModules.map(f => f.module).join(', ')}`);
        }
        
        // Дополнительная проверка, что все модули действительно доступны
        return await this.waitForAllModules();
    }
}

// ========== МОДУЛЬ 2: ОСНОВНОЙ КЛАСС ИГРЫ С МОДУЛЬНОЙ АРХИТЕКТУРОЙ ==========
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
            
            // Показываем экран загрузки
            this.showLoadingScreen("Загрузка игровых модулей...");
            
            // Загружаем все модули
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
            // Инициализируем каждую систему через ее модуль
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
            // Загрузка данных будет в соответствующих модулях
            // Здесь только базовая проверка
            await Promise.all([
                this.systems.hero.loadHeroData(),
                this.systems.equipment.loadItemData(),
                this.systems.map.loadMapData()
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
        // Запуск основной игры через систему героев
        if (this.systems.hero && typeof this.systems.hero.showHeroSelection === 'function') {
            this.systems.hero.showHeroSelection();
        } else {
            alert("Система героев еще не готова!");
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

// Добавляем базовые стили для загрузки
const loadStyles = () => {
    const styles = `
        .loading-screen {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background: linear-gradient(135deg, #1f2937, #374151);
            color: white;
            font-family: Arial, sans-serif;
        }
        
        .loading-content {
            text-align: center;
            max-width: 500px;
            padding: 2rem;
        }
        
        .progress-container {
            margin: 2rem 0;
        }
        
        .progress-bar {
            width: 100%;
            height: 10px;
            background: #374151;
            border-radius: 5px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #3b82f6, #60a5fa);
            border-radius: 5px;
            transition: width 0.3s ease;
            width: 0%;
        }
        
        .module-status {
            font-size: 0.9rem;
            color: #9ca3af;
            margin-top: 1rem;
        }
        
        .main-screen {
            padding: 2rem;
            background: #1f2937;
            color: white;
            min-height: 100vh;
        }
        
        .game-header {
            text-align: center;
            margin-bottom: 2rem;
        }
        
        .systems-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        
        .system-card {
            background: #374151;
            padding: 1rem;
            border-radius: 8px;
            text-align: center;
        }
        
        .btn-primary, .btn-secondary {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            margin: 0.5rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .btn-primary {
            background: #10b981;
            color: white;
        }
        
        .btn-secondary {
            background: #f59e0b;
            color: white;
        }
        
        .error-screen {
            padding: 2rem;
            background: #dc2626;
            color: white;
            min-height: 100vh;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    loadStyles();
    console.log("🎮 Запуск Tigrimion RPG...");
    window.game = new SafeHeroGame();
});
