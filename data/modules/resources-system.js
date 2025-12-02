"use strict";

class ResourcesSystem {
    constructor() {
        this.resources = {};
        this.craftingRecipes = {};
        this.loaded = false;
        console.log("✅ ResourcesSystem создан!");
    }

    async loadResourcesData() {
        console.log("🌿 Загружаем данные ресурсов...");
        
        // Пока просто заглушка для теста
        this.resources = {
            herbs: [{id: "test_herb", name: "🌿 Тестовая трава", type: "herb", rarity: "common"}],
            berries: [],
            mushrooms: [],
            ores: [],
            stones: [],
            woods: []
        };
        
        this.craftingRecipes = {};
        this.loaded = true;
        
        console.log("✅ Ресурсы загружены (тестовые)");
        return true;
    }

    showResourcesInventory() {
        return `
            <div class="overlay-content resources-overlay">
                <div class="overlay-header">
                    <h3>📦 Ресурсы (В РАЗРАБОТКЕ)</h3>
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
                <div class="overlay-body">
                    <div style="text-align: center; padding: 2rem;">
                        <h4>⚠️ Система ресурсов в разработке</h4>
                        <p>Эта функция будет доступна в следующем обновлении!</p>
                        <p>Здесь можно будет управлять материалами для крафта.</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Простые заглушки для остальных методов
    showCrafting() { return this.showResourcesInventory(); }
    getResourceData() { return null; }
    isItemResource() { return false; }
    getResourceIdFromItem() { return ''; }
    sellResource() { console.log("Продажа ресурса (в разработке)"); }
    craftItem() { console.log("Крафт (в разработке)"); }
}

// 🔥 ВАЖНО: Регистрируем в глобальной области
window.ResourcesSystem = ResourcesSystem;
