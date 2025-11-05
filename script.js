"use strict";

class SafeHeroGame {
    constructor() {
        try {
            console.log("🛡️ 1. Конструктор начался");
            
            // Проверяем модули
            console.log("🛡️ 2. Проверка модулей...");
            if (typeof BonusSystem === 'undefined') throw new Error("BonusSystem не загружен");
            if (typeof LevelSystem === 'undefined') throw new Error("LevelSystem не загружен");
            if (typeof BattleSystem === 'undefined') throw new Error("BattleSystem не загружен");
            if (typeof EquipmentSystem === 'undefined') throw new Error("EquipmentSystem не загружен");
            
            console.log("🛡️ 3. Модули проверены");
            
            // Инициализация модулей
            console.log("🛡️ 4. Инициализация модулей...");
            this.bonusSystem = new BonusSystem();
            this.levelSystem = new LevelSystem();
            this.battleSystem = new BattleSystem();
            this.equipmentSystem = new EquipmentSystem();
            
            console.log("🛡️ 5. Модули созданы");
            
            this.init();
            
        } catch (error) {
            console.error("🛡️ ОШИБКА В КОНСТРУКТОРЕ:", error);
            this.panic(error);
        }
    }
    
    init() {
        try {
            console.log("🛡️ 6. Init начался");
            
            // Простая отрисовка для теста
            this.renderTestScreen();
            
            console.log("🛡️ 7. Init завершен");
            
        } catch (error) {
            console.error("🛡️ ОШИБКА В INIT:", error);
            throw error;
        }
    }
    
    renderTestScreen() {
        try {
            console.log("🛡️ 8. Отрисовка экрана...");
            
            const app = document.getElementById('app');
            if (!app) throw new Error("Элемент app не найден");
            
            app.innerHTML = `
                <div style="padding: 20px; background: #2d3748; color: white; border-radius: 10px;">
                    <h1>🎮 ИГРА РАБОТАЕТ!</h1>
                    <p>Все системы функционируют нормально</p>
                    <div style="margin: 10px 0;">
                        <button onclick="game.testAction()" style="padding: 10px; background: #4ade80; border: none; border-radius: 5px; color: white;">Тест кнопки</button>
                    </div>
                </div>
            `;
            
            console.log("🛡️ 9. Экран отрисован");
            
        } catch (error) {
            console.error("🛡️ ОШИБКА ОТРИСОВКИ:", error);
            throw error;
        }
    }
    
    testAction() {
        alert("✅ Кнопка работает! Игра функционирует!");
    }
    
    panic(error) {
        const errorHtml = `
            <div style="padding: 20px; background: #dc2626; color: white; font-family: Arial;">
                <h1>🚨 КРИТИЧЕСКАЯ ОШИБКА</h1>
                <div style="background: #b91c1c; padding: 15px; margin: 10px 0; border-radius: 5px;">
                    <strong>Сообщение:</strong> ${error.message}
                </div>
                <div style="background: #991b1b; padding: 15px; margin: 10px 0; border-radius: 5px;">
                    <strong>Место ошибки:</strong><br>
                    <pre style="font-size: 12px;">${error.stack}</pre>
                </div>
                <button onclick="location.reload()" style="padding: 10px 20px; background: white; color: #dc2626; border: none; border-radius: 5px; font-weight: bold;">
                    🔄 Перезагрузить игру
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
    console.log("✅ ИГРА УСПЕШНО ЗАПУЩЕНА!");
} catch (error) {
    console.error("💀 ИГРА НЕ ЗАПУСТИЛАСЬ:", error);
    
    // Аварийный экран
    document.body.innerHTML = `
        <div style="padding: 20px; background: #7f1d1d; color: white;">
            <h1>💀 ИГРА НЕ ЗАПУСТИЛАСЬ</h1>
            <p>${error.message}</p>
        </div>
    `;
}
