"use strict";

class ResourcesSystem {
    constructor() {
        this.resources = {};
        this.craftingRecipes = {};
        this.loaded = false;
    }

    async loadResourcesData() {
        try {
            console.log("🌿 Загружаем данные ресурсов...");
            
            const response = await fetch('data/resources.json');
            if (!response.ok) {
                throw new Error(`Ошибка загрузки resources.json: ${response.status}`);
            }
            
            this.resources = await response.json();
            
            // Загружаем рецепты крафта
            await this.loadCraftingRecipes();
            
            console.log("✅ Ресурсы загружены:", {
                herbs: this.resources.herbs?.length || 0,
                berries: this.resources.berries?.length || 0,
                mushrooms: this.resources.mushrooms?.length || 0,
                ores: this.resources.ores?.length || 0,
                stones: this.resources.stones?.length || 0,
                woods: this.resources.woods?.length || 0
            });
            
            this.loaded = true;
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки ресурсов:", error);
            this.createFallbackResources();
            return true;
        }
    }

    async loadCraftingRecipes() {
        try {
            const response = await fetch('data/crafting.json');
            if (!response.ok) {
                throw new Error(`Ошибка загрузки crafting.json: ${response.status}`);
            }
            
            this.craftingRecipes = await response.json();
            console.log(`✅ Загружено рецептов крафта: ${Object.keys(this.craftingRecipes).length}`);
            
        } catch (error) {
            console.warn("⚠️ Файл рецептов не найден, создаем базовые...");
            this.createFallbackRecipes();
        }
    }

    createFallbackResources() {
        console.log("🔄 Создаем резервные ресурсы...");
        
        this.resources = {
            herbs: [
                { id: "arnica", name: "🌿 Арника", type: "herb", rarity: "common", value: 10, price: 5 },
                { id: "willow_bark", name: "🍂 Кора Ивы", type: "herb", rarity: "common", value: 12, price: 6 }
            ],
            berries: [
                { id: "elderberry", name: "🫐 Бузина", type: "berry", rarity: "common", value: 8, price: 4 },
                { id: "rosehip", name: "🌰 Шиповник", type: "berry", rarity: "common", value: 15, price: 8 }
            ],
            mushrooms: [
                { id: "tea_mushroom", name: "🍄 Чайный гриб", type: "mushroom", rarity: "uncommon", value: 25, price: 12 }
            ],
            ores: [
                { id: "iron_ore", name: "⛏️ Железная руда", type: "ore", rarity: "common", value: 20, price: 10 },
                { id: "copper_ore", name: "⛏️ Медная руда", type: "ore", rarity: "common", value: 30, price: 15 }
            ],
            stones: [
                { id: "flint", name: "🪨 Кремень", type: "stone", rarity: "common", value: 5, price: 2 },
                { id: "quartz", name: "🪨 Кварц", type: "stone", rarity: "uncommon", value: 50, price: 25 }
            ],
            woods: [
                { id: "oak_wood", name: "🪵 Дубовая древесина", type: "wood", rarity: "common", value: 15, price: 8 },
                { id: "pine_wood", name: "🪵 Сосновая древесина", type: "wood", rarity: "common", value: 10, price: 5 }
            ]
        };
        
        this.createFallbackRecipes();
        this.loaded = true;
    }

    createFallbackRecipes() {
        this.craftingRecipes = {
            "potion_health_minor": {
                id: "potion_health_minor",
                name: "Малое зелье здоровья",
                resultItemId: 1, // ID малого зелья здоровья из items.json
                ingredients: [
                    { type: "herb", id: "arnica", amount: 2 },
                    { type: "berry", id: "elderberry", amount: 1 }
                ],
                time: 10, // секунд на крафт
                requiredLevel: 1,
                description: "Восстанавливает 20 здоровья"
            },
            "healing_salve": {
                id: "healing_salve",
                name: "Целебная мазь",
                resultItemId: 1001, // ID для нового предмета
                ingredients: [
                    { type: "herb", id: "arnica", amount: 3 },
                    { type: "mushroom", id: "tea_mushroom", amount: 1 }
                ],
                time: 20,
                requiredLevel: 2,
                description: "Восстанавливает 50 здоровья"
            }
        };
    }

    // ========== ОТОБРАЖЕНИЕ ИНВЕНТАРЯ РЕСУРСОВ ==========
 showResourcesInventory() {
    if (!window.game || !window.game.sharedResources) {
        return '<div class="error-message">Система не готова</div>';
    }

    // Получаем ресурсы из sharedResources.resources
    const resources = window.game.sharedResources.resources || {};
    
    // Также проверяем инвентарь на предметы-ресурсы для совместимости
    const inventory = window.game.sharedResources.inventory || [];
    inventory.forEach(itemId => {
        if (this.isItemResource(itemId)) {
            const resourceId = this.getResourceIdFromItem(itemId);
            if (!resources[resourceId]) {
                resources[resourceId] = {
                    id: resourceId,
                    count: 1
                };
            } else {
                resources[resourceId].count++;
            }
        }
    });

    // Группируем по типам
    const groupedResources = {};
    Object.entries(resources).forEach(([id, data]) => {
        const resourceData = this.getResourceData(id);
        if (!resourceData) return;
        
        const type = resourceData.type;
        if (!groupedResources[type]) groupedResources[type] = [];
        groupedResources[type].push({ 
            id, 
            count: data.count,
            data: resourceData 
        });
    });

    // Если нет ресурсов, но есть старый формат, пытаемся преобразовать
    if (Object.keys(resources).length === 0 && window.game.currentHero?.resources) {
        const heroResources = window.game.currentHero.resources;
        Object.entries(heroResources).forEach(([id, data]) => {
            const resourceData = this.getResourceData(id);
            if (!resourceData) return;
            
            const type = resourceData.type;
            if (!groupedResources[type]) groupedResources[type] = [];
            groupedResources[type].push({ 
                id, 
                count: data.count || 1,
                data: resourceData 
            });
        });
    }

    let html = `
        <div class="overlay-content resources-overlay">
            <div class="overlay-header">
                <h3>📦 Ресурсы и материалы</h3>
                <button class="btn-close" onclick="game.hideOverlay()">✕</button>
            </div>
            
            <div class="resources-stats">
                <span>💰 Золото: ${window.game.sharedResources.gold ? window.game.sharedResources.gold.toFixed(2) : '0.00'}</span>
                <span>📦 Всего ресурсов: ${this.getTotalResourceCount()} шт.</span>
                <button class="btn-craft" onclick="game.systems.resources.showCrafting()">
                    ⚗️ Перейти к крафту
                </button>
            </div>
            
            <div class="resources-categories">
                <button class="resource-category-btn active" data-category="all">Все</button>
                <button class="resource-category-btn" data-category="herb">🌿 Травы</button>
                <button class="resource-category-btn" data-category="berry">🫐 Ягоды</button>
                <button class="resource-category-btn" data-category="mushroom">🍄 Грибы</button>
                <button class="resource-category-btn" data-category="ore">⛏️ Руда</button>
                <button class="resource-category-btn" data-category="stone">🪨 Камни</button>
                <button class="resource-category-btn" data-category="wood">🪵 Древесина</button>
            </div>
            
            <div class="resources-grid">
    `;

    // Отображаем ресурсы по группам
    if (Object.keys(groupedResources).length > 0) {
        Object.entries(groupedResources).forEach(([type, resources]) => {
            const typeName = this.getResourceTypeName(type);
            
            html += `
                <div class="resource-category-section">
                    <h4 class="resource-category-title">${typeName}</h4>
                    <div class="resource-category-grid">
            `;
            
            resources.forEach(resource => {
                const resourceData = resource.data;
                const sellPrice = Math.floor(resourceData.price * 0.7);
                
                html += `
                    <div class="resource-item" data-resource-id="${resource.id}">
                        <div class="resource-icon">
                            ${resourceData.name.split(' ')[0]} <!-- Эмодзи -->
                        </div>
                        <div class="resource-info">
                            <div class="resource-name">${resourceData.name.split(' ').slice(1).join(' ')}</div>
                            <div class="resource-description">${resourceData.description || 'Нет описания'}</div>
                            <div class="resource-stats">
                                <span class="resource-count">📦 ${resource.count} шт.</span>
                                <span class="resource-value">💰 ${sellPrice} за шт.</span>
                            </div>
                        </div>
                        <div class="resource-actions">
                            <button class="btn-sell-resource" onclick="game.systems.resources.sellResource('${resource.id}', 1)">
                                💰 Продать 1
                            </button>
                            <button class="btn-sell-all" onclick="game.systems.resources.sellResource('${resource.id}', ${resource.count})">
                                📦 Продать все
                            </button>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
    } else {
        html += `
            <div class="empty-resources">
                <div>📭 Нет ресурсов в инвентаре</div>
                <div class="hint">Ресурсы можно найти в боях, на карте или купить у торговцев</div>
            </div>
        `;
    }

    html += `
            </div>
        </div>
    `;

    return html;
}


// ========== НОВЫЕ МЕТОДЫ ДЛЯ ИНТЕГРАЦИИ С БОЕВОЙ СИСТЕМОЙ ==========

getTotalResourceCount() {
    if (!window.game || !window.game.sharedResources) return 0;
    
    const resources = window.game.sharedResources.resources || {};
    let total = 0;
    
    Object.values(resources).forEach(resource => {
        total += resource.count || 0;
    });
    
    // Также считаем ресурсы в инвентаре
    const inventory = window.game.sharedResources.inventory || [];
    inventory.forEach(itemId => {
        if (this.isItemResource(itemId)) {
            total++;
        }
    });
    
    return total;
}

getResourceById(resourceId) {
    return this.getResourceData(resourceId);
}

getResourceData(resourceId) {
    // Ищем ресурс во всех категориях
    for (const category in this.resources) {
        if (Array.isArray(this.resources[category])) {
            const found = this.resources[category].find(r => r.id === resourceId);
            if (found) return found;
        }
    }
    return null;
}

// Обновленный метод для получения типа ресурса
getResourceTypeName(type) {
    const names = {
        'herb': '🌿 Лечебные травы',
        'berry': '🫐 Ягоды и плоды',
        'mushroom': '🍄 Грибы',
        'ore': '⛏️ Руды и минералы',
        'stone': '🪨 Камни и кристаллы',
        'wood': '🪵 Древесина',
        'leathers': '🪢 Кожи',
        'hides': '🐅 Шкуры', 
        'bones': '🦴 Кости',
        'furs': '🧥 Меха'
    };
    return names[type] || type;
}

// Обновленный метод для создания дефолтных ресурсов
createFallbackResources() {
    console.log("🔄 Создаем резервные ресурсы...");
    
    this.resources = {
        herbs: [
            { id: "arnica", name: "🌿 Арника", type: "herb", rarity: "common", value: 10, price: 5 },
            { id: "willow_bark", name: "🍂 Кора Ивы", type: "herb", rarity: "common", value: 12, price: 6 },
            { id: "grass", name: "🌿 Трава", type: "herb", rarity: "common", value: 5, price: 2 }
        ],
        berries: [
            { id: "elderberry", name: "🫐 Бузина", type: "berry", rarity: "common", value: 8, price: 4 },
            { id: "rosehip", name: "🌰 Шиповник", type: "berry", rarity: "common", value: 15, price: 8 }
        ],
        mushrooms: [
            { id: "tea_mushroom", name: "🍄 Чайный гриб", type: "mushroom", rarity: "uncommon", value: 25, price: 12 }
        ],
        ores: [
            { id: "iron_ore", name: "⛏️ Железная руда", type: "ore", rarity: "common", value: 20, price: 10 },
            { id: "copper_ore", name: "⛏️ Медная руда", type: "ore", rarity: "common", value: 30, price: 15 }
        ],
        stones: [
            { id: "flint", name: "🪨 Кремень", type: "stone", rarity: "common", value: 5, price: 2 },
            { id: "quartz", name: "🪨 Кварц", type: "stone", rarity: "uncommon", value: 50, price: 25 },
            { id: "stone", name: "🪨 Камень", type: "stone", rarity: "common", value: 3, price: 1 }
        ],
        woods: [
            { id: "oak_wood", name: "🪵 Дубовая древесина", type: "wood", rarity: "common", value: 15, price: 8 },
            { id: "pine_wood", name: "🪵 Сосновая древесина", type: "wood", rarity: "common", value: 10, price: 5 }
        ],
        leathers: [
            { id: "thin_leather", name: "🪢 Тонкая кожа", type: "leathers", rarity: "common", value: 8, price: 4 },
            { id: "thick_leather", name: "🪢 Толстая кожа", type: "leathers", rarity: "uncommon", value: 20, price: 10 }
        ],
        hides: [
            { id: "thin_hide", name: "🐅 Тонкая шкура", type: "hides", rarity: "common", value: 10, price: 5 },
            { id: "thick_hide", name: "🐅 Толстая шкура", type: "hides", rarity: "uncommon", value: 25, price: 12 }
        ],
        bones: [
            { id: "small_bone", name: "🦴 Малая кость", type: "bones", rarity: "common", value: 5, price: 2 },
            { id: "large_bone", name: "🦴 Большая кость", type: "bones", rarity: "uncommon", value: 15, price: 8 }
        ],
        furs: [
            { id: "fox_fur", name: "🧥 Лисья шкура", type: "furs", rarity: "uncommon", value: 30, price: 15 },
            { id: "wolf_fur", name: "🧥 Волчий мех", type: "furs", rarity: "rare", value: 50, price: 25 }
        ]
    };
    
    this.createFallbackRecipes();
    this.loaded = true;
}
    

    // ========== ПРОДАЖА РЕСУРСОВ ==========
    sellResource(resourceId, amount) {
        if (!window.game || !window.game.sharedResources) {
            console.error("❌ Система не готова");
            return;
        }

        const resourceData = this.getResourceData(resourceId);
        if (!resourceData) {
            console.error(`❌ Ресурс ${resourceId} не найден`);
            return;
        }

        // Находим все предметы этого ресурса в инвентаре
        const inventory = window.game.sharedResources.inventory;
        const resourceItemIds = [];
        
        for (let i = 0; i < inventory.length; i++) {
            if (this.isItemResource(inventory[i]) && this.getResourceIdFromItem(inventory[i]) === resourceId) {
                resourceItemIds.push(inventory[i]);
                if (resourceItemIds.length >= amount) break;
            }
        }

        if (resourceItemIds.length < amount) {
            window.game.showNotification(`❌ Недостаточно ресурсов ${resourceData.name}`, 'error');
            return;
        }

        const totalPrice = Math.floor(resourceData.price * 0.7 * amount);
        
        if (!confirm(`Продать ${amount} ${resourceData.name} за ${totalPrice} золота?`)) {
            return;
        }

        // Удаляем ресурсы из инвентаря
        resourceItemIds.forEach(itemId => {
            const index = inventory.indexOf(itemId);
            if (index > -1) {
                inventory.splice(index, 1);
            }
        });

        // Добавляем золото
        window.game.sharedResources.gold += totalPrice;
        if (window.game.currentHero) {
            window.game.currentHero.gold = window.game.sharedResources.gold;
        }

        // Сохраняем игру
        window.game.saveGame();
        
        window.game.showNotification(`💰 Продано ${amount} ${resourceData.name} за ${totalPrice} золота`, 'success');
        
        // Обновляем интерфейс
        const overlay = document.getElementById('overlay-container');
        if (overlay) {
            overlay.innerHTML = this.showResourcesInventory();
            this.attachResourceHandlers();
        }
    }

    // ========== СИСТЕМА КРАФТА ==========
    showCrafting() {
        let html = `
            <div class="overlay-content crafting-overlay">
                <div class="overlay-header">
                    <h3>⚗️ Крафт предметов</h3>
                    <button class="btn-close" onclick="game.showOverlay('resources')">✕</button>
                </div>
                
                <div class="crafting-info">
                    <p>Здесь вы можете создавать предметы из собранных ресурсов</p>
                </div>
                
                <div class="crafting-recipes">
        `;

        Object.values(this.craftingRecipes).forEach(recipe => {
            const canCraft = this.canCraftRecipe(recipe);
            
            html += `
                <div class="crafting-recipe ${canCraft ? 'available' : 'unavailable'}">
                    <div class="recipe-header">
                        <h4>${recipe.name}</h4>
                        <span class="recipe-level">Ур. ${recipe.requiredLevel}</span>
                    </div>
                    
                    <div class="recipe-description">${recipe.description}</div>
                    
                    <div class="recipe-ingredients">
                        <h5>Ингредиенты:</h5>
                        ${recipe.ingredients.map(ing => {
                            const resource = this.getResourceData(ing.id);
                            const hasAmount = this.getResourceCount(ing.id) >= ing.amount;
                            return `
                                <div class="ingredient ${hasAmount ? 'has' : 'missing'}">
                                    <span>${resource?.name || ing.id}</span>
                                    <span>${this.getResourceCount(ing.id)}/${ing.amount}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="recipe-actions">
                        <button class="btn-craft-recipe" 
                                onclick="game.systems.resources.craftItem('${recipe.id}')"
                                ${!canCraft ? 'disabled' : ''}>
                            ${canCraft ? '⚗️ Создать' : '❌ Недостаточно ресурсов'}
                        </button>
                        <span class="craft-time">⏱️ ${recipe.time} сек.</span>
                    </div>
                </div>
            `;
        });

        if (Object.keys(this.craftingRecipes).length === 0) {
            html += '<div class="empty-recipes">Рецепты не найдены</div>';
        }

        html += `
                </div>
            </div>
        `;

        return html;
    }

    craftItem(recipeId) {
        const recipe = this.craftingRecipes[recipeId];
        if (!recipe) {
            console.error(`❌ Рецепт ${recipeId} не найден`);
            return;
        }

        if (!this.canCraftRecipe(recipe)) {
            window.game.showNotification('❌ Недостаточно ресурсов для крафта', 'error');
            return;
        }

        // Потребляем ресурсы
        recipe.ingredients.forEach(ing => {
            this.consumeResource(ing.id, ing.amount);
        });

        // Добавляем созданный предмет в инвентарь
        // Здесь нужно добавить логику создания уникального ID для предмета
        const newItemId = this.generateItemId(recipe.resultItemId);
        window.game.sharedResources.inventory.push(newItemId);

        // Сохраняем игру
        window.game.saveGame();

        window.game.showNotification(`✅ Создано: ${recipe.name}`, 'success');
        
        // Обновляем интерфейс
        const overlay = document.getElementById('overlay-container');
        if (overlay) {
            overlay.innerHTML = this.showCrafting();
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    isItemResource(itemId) {
        // Проверяем, является ли предмет ресурсом
        // Здесь можно добавить логику проверки по типу или ID
        return typeof itemId === 'string' && itemId.includes('resource_');
    }

    getResourceIdFromItem(itemId) {
        // Извлекаем ID ресурса из ID предмета
        return itemId.replace('resource_', '');
    }

    getResourceData(resourceId) {
        // Ищем ресурс во всех категориях
        for (const category in this.resources) {
            const found = this.resources[category].find(r => r.id === resourceId);
            if (found) return found;
        }
        return null;
    }

    getResourceTypeName(type) {
        const names = {
            'herb': '🌿 Лечебные травы',
            'berry': '🫐 Ягоды и плоды',
            'mushroom': '🍄 Грибы',
            'ore': '⛏️ Руды и минералы',
            'stone': '🪨 Камни и кристаллы',
            'wood': '🪵 Древесина'
        };
        return names[type] || type;
    }

    getResourceCount(resourceId) {
        if (!window.game || !window.game.sharedResources) return 0;
        
        const inventory = window.game.sharedResources.inventory;
        let count = 0;
        
        inventory.forEach(itemId => {
            if (this.isItemResource(itemId) && this.getResourceIdFromItem(itemId) === resourceId) {
                count++;
            }
        });
        
        return count;
    }

    consumeResource(resourceId, amount) {
        if (!window.game || !window.game.sharedResources) return false;
        
        const inventory = window.game.sharedResources.inventory;
        let consumed = 0;
        
        for (let i = inventory.length - 1; i >= 0; i--) {
            if (this.isItemResource(inventory[i]) && this.getResourceIdFromItem(inventory[i]) === resourceId) {
                inventory.splice(i, 1);
                consumed++;
                if (consumed >= amount) break;
            }
        }
        
        return consumed >= amount;
    }

    canCraftRecipe(recipe) {
        // Проверяем уровень
        if (window.game.currentHero.level < recipe.requiredLevel) {
            return false;
        }
        
        // Проверяем ингредиенты
        for (const ing of recipe.ingredients) {
            if (this.getResourceCount(ing.id) < ing.amount) {
                return false;
            }
        }
        
        return true;
    }

    generateItemId(baseId) {
        // Генерируем уникальный ID для созданного предмета
        return `crafted_${baseId}_${Date.now()}`;
    }

    attachResourceHandlers() {
        // Обработчики для фильтрации ресурсов по категориям
        const categoryBtns = document.querySelectorAll('.resource-category-btn');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.target.dataset.category;
                this.filterResourcesByCategory(category);
            });
        });
    }

    filterResourcesByCategory(category) {
        // Логика фильтрации ресурсов по категории
        console.log(`Фильтр ресурсов по категории: ${category}`);
        // Реализуй по необходимости
    }
}
window.ResourcesSystem = ResourcesSystem;
console.log("✅ ResourcesSystem экспортирован в window");
