"use strict";

class SafeHeroGame {
    constructor() {
        try {
            console.log("🛡️ БЕЗОПАСНЫЙ ЗАПУСК");
            this.init();
        } catch (error) {
            this.panic(error);
        }
    }
    
    panic(error) {
        document.body.innerHTML = `
            <div style="padding: 20px; background: red; color: white;">
                <h1>🚨 ИГРА УПАЛА</h1>
                <p><strong>Ошибка:</strong> ${error.message}</p>
                <p><strong>Место:</strong> ${error.stack}</p>
                <button onclick="location.reload()">Перезагрузить</button>
            </div>
        `;
        throw error; // Все равно покажем в консоль
    }
}

// Запуск с максимальной защитой
try {
    window.game = new SafeHeroGame();
} catch (error) {
    console.error("💀 Игра не запустилась:", error);
}
