"use strict";

// 🔥 ВАЖНО: Проверяем, существует ли уже класс
if (typeof ResourcesSystem === 'undefined') {
    console.log("🔄 Определяем класс ResourcesSystem...");
    
    class ResourcesSystem {
        constructor() {
            console.log("✅ ResourcesSystem создан!");
            this.resources = {};
            this.craftingRecipes = {};
            this.loaded = false;
        }

        async loadResourcesData() {
            console.log("🌿 Загружаем данные ресурсов...");
            
            // Временная заглушка
            this.resources = {
                herbs: [{id: "test", name: "🌿 Тестовая трава"}],
                berries: [],
                mushrooms: [],
                ores: [],
                stones: [],
                woods: []
            };
            
            this.craftingRecipes = {};
            this.loaded = true;
            
            console.log("✅ Данные ресурсов загружены");
            return true;
        }

        showResourcesInventory() {
            return `
                <div class="overlay-content">
                    <div class="overlay-header">
                        <h3>📦 Ресурсы</h3>
                        <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                    </div>
                    <div class="overlay-body">
                        <h4>Система ресурсов загружена!</h4>
                        <p>Версия: 1.0.0</p>
                        <p>Здесь будут отображаться материалы для крафта.</p>
                    </div>
                </div>
            `;
        }

        showCrafting() {
            return this.showResourcesInventory();
        }

        getResourceData() { return null; }
        isItemResource() { return false; }
        getResourceIdFromItem() { return ''; }
        sellResource() { console.log("Продажа ресурса"); }
        craftItem() { console.log("Крафт предмета"); }
    }

    // 🔥 КРИТИЧЕСКИ ВАЖНО: Регистрируем класс в глобальной области
    window.ResourcesSystem = ResourcesSystem;
    console.log("✅ ResourcesSystem зарегистрирован в window");
    
} else {
    console.log("ℹ️ ResourcesSystem уже определен");
}
