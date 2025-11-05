"use strict";

// ========== МОДУЛЬ 1: ОЖИДАНИЕ МОДУЛЕЙ ==========
function waitForModules() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;
        
        const checkModules = () => {
            attempts++;
            
            const modulesLoaded = 
                typeof BonusSystem !== 'undefined' &&
                typeof LevelSystem !== 'undefined' && 
                typeof BattleSystem !== 'undefined' &&
                typeof EquipmentSystem !== 'undefined';
            
            if (modulesLoaded) {
                console.log("✅ Все модули загружены!");
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error(`Модули не загрузились за ${maxAttempts/10} секунд`));
            } else {
                console.log(`⏳ Ожидание модулей... (${attempts}/${maxAttempts})`);
                setTimeout(checkModules, 100);
            }
        };
        
        checkModules();
    });
}

// ========== МОДУЛЬ 2: ОСНОВНОЙ КЛАСС ИГРЫ ==========
class SafeHeroGame {
    constructor() {
        try {
            console.log("🛡️ 1. Конструктор начался");
            
            // Ждем загрузки модулей
            this.showLoadingScreen("Загрузка модулей...");
            
            waitForModules().then(() => {
                console.log("🛡️ 2. Модули готовы, инициализируем игру");
                this.initializeGame();
            }).catch(error => {
                this.panic(new Error(`Не удалось загрузить модули: ${error.message}`));
            });
            
        } catch (error) {
            console.error("🛡️ ОШИБКА В КОНСТРУКТОРЕ:", error);
            this.panic(error);
        }
    }
    
    initializeGame() {
        try {
            console.log("🛡️ 3. Инициализация модулей...");
            
            this.bonusSystem = new BonusSystem();
            this.levelSystem = new LevelSystem();
            this.battleSystem = new BattleSystem();
            this.equipmentSystem = new EquipmentSystem();
            
            console.log("🛡️ 4. Модули созданы");
            
            this.init();
            
        } catch (error) {
            console.error("🛡️ ОШИБКА ИНИЦИАЛИЗАЦИИ:", error);
            this.panic(error);
        }
    }
    
    showLoadingScreen(message) {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div style="padding: 20px; background: #1f2937; color: white; text-align: center;">
                    <h2>🔄 Загрузка игры</h2>
                    <p>${message}</p>
                    <div style="margin: 20px;">
                        <div style="width: 100%; background: #374151; border-radius: 10px;">
                            <div id="loadingBar" style="height: 10px; background: #3b82f6; border-radius: 10px; width: 0%; transition: width 0.3s;"></div>
                        </div>
                    </div>
                    <div id="moduleStatus" style="font-size: 14px; color: #9ca3af;">
                        Ожидание модулей...
                    </div>
                </div>
            `;
        }
    }
    
    updateLoadingProgress(percent, message) {
        const bar = document.getElementById('loadingBar');
        const status = document.getElementById('moduleStatus');
        
        if (bar) bar.style.width = percent + '%';
        if (status) status.textContent = message;
    }
    
    init() {
        try {
            console.log("🛡️ 5. Init начался");
            
            this.updateLoadingProgress(100, "Запуск игры...");
            
            // Задержка чтобы увидеть прогресс
            setTimeout(() => {
                this.renderMainScreen();
            }, 500);
            
        } catch (error) {
            console.error("🛡️ ОШИБКА В INIT:", error);
            throw error;
        }
    }
    
    renderMainScreen() {
        try {
            console.log("🛡️ 6. Отрисовка главного экрана...");
            
            const app = document.getElementById('app');
            if (!app) throw new Error("Элемент app не найден");
            
            app.innerHTML = `
                <div style="padding: 20px; background: #2d3748; color: white; border-radius: 10px; max-width: 600px; margin: 0 auto;">
                    <h1>🎮 TIGRIMION RPG</h1>
                    <p style="color: #a0aec0;">Игра успешно загружена!</p>
                    
                    <div style="margin: 20px 0; padding: 15px; background: #4a5568; border-radius: 5px;">
                        <h3>✅ Системы игры:</h3>
                        <ul style="text-align: left;">
                            <li>Бонусы: ${typeof this.bonusSystem}</li>
                            <li>Уровни: ${typeof this.levelSystem}</li>
                            <li>Бой: ${typeof this.battleSystem}</li>
                            <li>Экипировка: ${typeof this.equipmentSystem}</li>
                        </ul>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <button onclick="game.startAdventure()" style="padding: 12px 24px; background: #4ade80; border: none; border-radius: 5px; color: white; font-size: 16px; margin: 5px;">
                            🚀 Начать игру
                        </button>
                        <button onclick="game.showDebug()" style="padding: 12px 24px; background: #f59e0b; border: none; border-radius: 5px; color: white; font-size: 16px; margin: 5px;">
                            🐛 Отладка
                        </button>
                    </div>
                </div>
            `;
            
            console.log("🛡️ 7. Главный экран отрисован");
            
        } catch (error) {
            console.error("🛡️ ОШИБКА ОТРИСОВКИ:", error);
            throw error;
        }
    }
    
    startAdventure() {
        alert("🎯 Приключение начинается! (функция в разработке)");
    }
    
    showDebug() {
        console.log("=== ДЕБАГ ИНФОРМАЦИЯ ===");
        console.log("BonusSystem:", BonusSystem);
        console.log("LevelSystem:", LevelSystem);
        console.log("BattleSystem:", BattleSystem);
        console.log("EquipmentSystem:", EquipmentSystem);
        console.log("game:", this);
        alert("Информация в консоли (F12)");
    }
    
    panic(error) {
        const errorHtml = `
            <div style="padding: 20px; background: #dc2626; color: white; font-family: Arial;">
                <h1>🚨 КРИТИЧЕСКАЯ ОШИБКА</h1>
                <div style="background: #b91c1c; padding: 15px; margin: 10px 0; border-radius: 5px;">
                    <strong>Сообщение:</strong> ${error.message}
                </div>
                <div style="background: #991b1b; padding: 15px; margin: 10px 0; border-radius: 5px;">
                    <strong>Детали:</strong><br>
                    <div style="font-size: 14px;">
                        BonusSystem: ${typeof BonusSystem}<br>
                        LevelSystem: ${typeof LevelSystem}<br>
                        BattleSystem: ${typeof BattleSystem}<br>
                        EquipmentSystem: ${typeof EquipmentSystem}
                    </div>
                </div>
                <button onclick="location.reload()" style="padding: 10px 20px; background: white; color: #dc2626; border: none; border-radius: 5px; font-weight: bold; margin: 5px;">
                    🔄 Перезагрузить
                </button>
                <button onclick="game.showDebug()" style="padding: 10px 20px; background: #f59e0b; color: white; border: none; border-radius: 5px; font-weight: bold; margin: 5px;">
                    🐛 Отладка
                </button>
            </div>
        `;
        
        document.body.innerHTML = errorHtml;
        console.error("💀 ПАНИКА:", error);
    }
}

// ЗАПУСК ИГРЫ
console.log("🚀 ЗАПУСК ИГРЫ...");

try {
    window.game = new SafeHeroGame();
} catch (error) {
    console.error("💀 ИГРА НЕ ЗАПУСТИЛАСЬ:", error);
    document.body.innerHTML = `<div style="padding: 20px; background: #7f1d1d; color: white;"><h1>💀 ФАТАЛЬНАЯ ОШИБКА</h1><p>${error.message}</p></div>`;
}
