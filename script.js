// ========== СИГНАЛ ЖИЗНИ ==========
console.log("🚨 SCRIPT.JS НАЧАЛ ВЫПОЛНЯТЬСЯ");

// ========== ПРИНУДИТЕЛЬНАЯ ПРОВЕРКА ==========
alert("Script.js загружен! Нажми OK чтобы продолжить");

// ========== ПРОСТЕЙШАЯ ИГРА ДЛЯ ТЕСТА ==========
class HeroGame {
    constructor() {
        console.log("🎮 HeroGame создан");
        this.init();
    }
    
    init() {
        console.log("🎮 Инициализация игры");
        this.renderTestScreen();
    }
    
    renderTestScreen() {
        console.log("🎮 Отрисовка экрана");
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div style="padding: 20px; background: #333; color: white;">
                    <h1>🎯 ИГРА РАБОТАЕТ!</h1>
                    <p>Script.js выполняется нормально</p>
                    <button onclick="game.testButton()">ТЕСТ КНОПКА</button>
                </div>
            `;
            console.log("🎮 Экран отрисован");
        } else {
            console.error("🎮 ОШИБКА: app элемент не найден");
        }
    }
    
    testButton() {
        alert("Кнопка работает! Игра функционирует!");
    }
}

// ========== ЗАПУСК ==========
console.log("🚨 ЗАПУСК ИГРЫ...");
let game;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log("🚨 DOM ЗАГРУЖЕН");
        game = new HeroGame();
        window.game = game;
    });
} else {
    console.log("🚨 DOM УЖЕ ЗАГРУЖЕН");
    game = new HeroGame();
    window.game = game;
}

console.log("🚨 SCRIPT.JS ВЫПОЛНЕН ДО КОНЦА");
