"use strict";

class CraftingSystem {
    constructor() {
        this.recipes = {};
        this.stations = {};
        this.craftingSkills = {};
        this.activeCrafts = [];
        this.loaded = false;
        
        // Портативные станции (как часть инвентаря)
        this.portableStations = {
            'hand_craft': true, // Всегда доступно
            'campfire': false,
            'furnace': false,
            'workbench': false,
            'alchemy_cauldron': false
        };
        
        // Уровни станций
        this.stationLevels = {};
        
        // Навыки крафта
        this.initializeSkills();
    }

    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    async initialize() {
        try {
            await this.loadRecipes();
            await this.loadPlayerData();
            this.loaded = true;
            console.log("✅ Система крафта инициализирована");
            return true;
        } catch (error) {
            console.error("❌ Ошибка инициализации системы крафта:", error);
            return false;
        }
    }

async loadRecipes() {
    try {
        console.log("🔨 Загружаем рецепты крафта...");
        
        // Пробуем только рабочий путь
        const path = 'data/crafting.json';
        console.log(`🔍 Пробуем путь: ${path}`);
        
        const response = await fetch(path);
        
        if (!response.ok) {
            throw new Error(`Не удалось загрузить crafting.json: ${response.status} ${response.statusText}`);
        }
        
        console.log(`✅ Файл найден по пути: ${path}`);
        const rawData = await response.json();
        
        // ИСПРАВЛЕНИЕ: Правильно получаем данные из структуры файла
        if (rawData.crafting_system) {
            // Если данные в поле crafting_system (как в вашем файле)
            this.recipes = rawData.crafting_system;
            console.log("📁 Данные получены из поля 'crafting_system'");
        } else {
            // Если данные уже на верхнем уровне
            this.recipes = rawData;
            console.log("📁 Данные получены с верхнего уровня");
        }
        
        // ⭐ ВАЖНОЕ ИСПРАВЛЕНИЕ: Устанавливаем флаг loaded в true
        this.loaded = true;
        
        console.log(`✅ Загружено рецептов крафта:`);
        console.log(`  🛠️  Станции: ${this.recipes.stations ? Object.keys(this.recipes.stations).length : 0}`);
        console.log(`  ⚗️  Расходники: ${this.recipes.consumables ? Object.keys(this.recipes.consumables).length : 0}`);
        console.log(`  🧱 Компоненты: ${this.recipes.basic_components ? Object.keys(this.recipes.basic_components).length : 0}`);
        console.log(`  🔨 Инструменты: ${this.recipes.tools ? Object.keys(this.recipes.tools).length : 0}`);
        
        return true;
        
    } catch (error) {
        console.error("❌ Ошибка загрузки рецептов:", error);
        
        // Создаем простые тестовые рецепты
        this.createFallbackRecipes();
        this.loaded = true;
        
        return true; // ⭐ ВАЖНО: Всегда возвращаем true для продолжения работы
    }
}

    async loadPlayerData() {
        // Загружаем данные игрока из сохранения
        const saveData = localStorage.getItem('tigrimion_save');
        if (saveData) {
            try {
                const parsed = JSON.parse(saveData);
                if (parsed.crafting) {
                    this.craftingSkills = parsed.crafting.skills || {};
                    this.portableStations = parsed.crafting.portableStations || this.portableStations;
                    this.stationLevels = parsed.crafting.stationLevels || {};
                }
            } catch (e) {
                console.warn("⚠️ Не удалось загрузить данные крафта из сохранения");
            }
        }
    }

    initializeSkills() {
        // Инициализируем навыки крафта
        this.craftingSkills = {
            'blacksmithing': { level: 1, xp: 0, xpToNext: 100 },
            'alchemy': { level: 1, xp: 0, xpToNext: 100 },
            'leatherworking': { level: 1, xp: 0, xpToNext: 100 },
            'tailoring': { level: 1, xp: 0, xpToNext: 100 },
            'woodworking': { level: 1, xp: 0, xpToNext: 100 },
            'jewelcrafting': { level: 1, xp: 0, xpToNext: 100 }
        };
    }

    createFallbackRecipes() {
        // Резервные рецепты на случай ошибки
        this.recipes = {
            stations: {
                'hand_craft': { id: 'hand_craft', name: 'Ручной крафт', description: 'Простейшие рецепты' },
                'campfire': { id: 'campfire', name: 'Костёр', description: 'Базовая станция' }
            },
            basic_components: {
                'string': {
                    id: 'string',
                    name: '🧵 Нить',
                    description: 'Скрученная нить из травы',
                    craft: {
                        station: 'hand_craft',
                        ingredients: [{ id: 'grass', count: 3 }],
                        time: 60
                    }
                }
            },
            tools: {
                'stone_knife': {
                    id: 'stone_knife',
                    name: '🔪 Каменный нож',
                    description: 'Инструмент для разделки',
                    craft: {
                        station: 'hand_craft',
                        ingredients: [
                            { id: 'small_bone', count: 1 },
                            { id: 'stone', count: 2 }
                        ],
                        time: 180
                    }
                }
            }
        };
    }

    // ========== СОХРАНЕНИЕ ДАННЫХ ==========
    savePlayerData() {
        if (!window.game || !window.game.saveGame) return;
        
        // Добавляем данные крафта в сохранение
        const saveData = {
            skills: this.craftingSkills,
            portableStations: this.portableStations,
            stationLevels: this.stationLevels,
            unlockedRecipes: this.getUnlockedRecipes()
        };
        
        // Вызываем сохранение игры
        window.game.saveGame();
    }

    // ========== СИСТЕМА СТАНЦИЙ ==========
    hasStation(stationId) {
        // Проверяем, есть ли у игрока станция
        if (stationId === 'hand_craft') return true; // Ручной крафт всегда доступен
        
        // Проверяем портативные станции
        if (this.portableStations[stationId]) {
            return true;
        }
        
        // Проверяем построенные станции (для будущей реализации)
        return this.stations[stationId] || false;
    }

    unlockStation(stationId) {
        if (this.portableStations[stationId]) {
            console.warn(`⚠️ Станция ${stationId} уже разблокирована`);
            return false;
        }
        
        this.portableStations[stationId] = true;
        this.stationLevels[stationId] = 1; // Начинаем с уровня 1
        
        console.log(`🎉 Разблокирована станция: ${this.getStationName(stationId)}`);
        
        if (window.game) {
            window.game.showNotification(`🎉 Получена портативная станция: ${this.getStationName(stationId)}`);
            this.savePlayerData();
        }
        
        return true;
    }

    upgradeStation(stationId) {
        if (!this.hasStation(stationId)) {
            console.error(`❌ Нельзя улучшить станцию ${stationId} - она не разблокирована`);
            return false;
        }
        
        const currentLevel = this.stationLevels[stationId] || 1;
        const upgradeCost = this.getStationUpgradeCost(stationId, currentLevel);
        
        // Проверяем ресурсы для улучшения
        if (!this.hasResources(upgradeCost)) {
            if (window.game) {
                window.game.showNotification('❌ Недостаточно ресурсов для улучшения станции');
            }
            return false;
        }
        
        // Потребляем ресурсы
        this.consumeResources(upgradeCost);
        
        // Улучшаем станцию
        this.stationLevels[stationId] = currentLevel + 1;
        
        console.log(`⬆️ Улучшена станция ${stationId} до уровня ${this.stationLevels[stationId]}`);
        
        if (window.game) {
            window.game.showNotification(`⬆️ Станция улучшена до уровня ${this.stationLevels[stationId]}`);
            this.savePlayerData();
        }
        
        return true;
    }

    getStationUpgradeCost(stationId, level) {
        // Стоимость улучшения станции
        const costs = {
            'campfire': [{ id: 'common_wood', count: 5 * level }, { id: 'stone', count: 3 * level }],
            'furnace': [{ id: 'stone', count: 10 * level }, { id: 'clay', count: 5 * level }],
            'workbench': [{ id: 'common_wood', count: 8 * level }, { id: 'iron_ingot', count: 2 * level }],
            'alchemy_cauldron': [{ id: 'copper_ingot', count: 3 * level }, { id: 'clay', count: 4 * level }]
        };
        
        return costs[stationId] || [];
    }

    getStationName(stationId) {
        const names = {
            'hand_craft': 'Ручной крафт',
            'campfire': '🔥 Костёр',
            'furnace': '🔥 Очаг с печью',
            'workbench': '⚒️ Верстак',
            'alchemy_cauldron': '🏺 Алхимический котёл'
        };
        return names[stationId] || stationId;
    }

    // ========== СИСТЕМА НАВЫКОВ ==========
    getSkillLevel(skillName) {
        return this.craftingSkills[skillName]?.level || 1;
    }

    addSkillXP(skillName, xpAmount) {
        if (!this.craftingSkills[skillName]) {
            console.error(`❌ Навык ${skillName} не найден`);
            return;
        }
        
        const skill = this.craftingSkills[skillName];
        skill.xp += xpAmount;
        
        // Проверяем уровень
        while (skill.xp >= skill.xpToNext) {
            skill.xp -= skill.xpToNext;
            skill.level++;
            skill.xpToNext = Math.floor(skill.xpToNext * 1.5); // Увеличиваем требования
            
            console.log(`🎉 Навык ${skillName} повышен до уровня ${skill.level}`);
            
            if (window.game) {
                window.game.showNotification(`🎉 ${this.getSkillDisplayName(skillName)} повышен до уровня ${skill.level}`);
            }
        }
        
        this.savePlayerData();
    }

    getSkillDisplayName(skillName) {
        const names = {
            'blacksmithing': '⚒️ Кузнечное дело',
            'alchemy': '⚗️ Алхимия',
            'leatherworking': '🧤 Кожевничество',
            'tailoring': '🧵 Портняжное дело',
            'woodworking': '🪵 Деревообработка',
            'jewelcrafting': '💎 Ювелирное дело'
        };
        return names[skillName] || skillName;
    }

    // ========== СИСТЕМА РЕСУРСОВ ==========
    getResourceCount(resourceId) {
        if (!window.game || !window.game.sharedResources) return 0;
        
        // Проверяем в resources
        const resources = window.game.sharedResources.resources || {};
        if (resources[resourceId]) {
            return resources[resourceId].count || 0;
        }
        
        // Проверяем в инвентаре
        const inventory = window.game.sharedResources.inventory || [];
        let count = 0;
        
        inventory.forEach(itemId => {
            if (this.isResourceItem(itemId, resourceId)) {
                count++;
            }
        });
        
        return count;
    }

    isResourceItem(itemId, resourceId) {
        // Проверяем, является ли предмет ресурсом
        const item = window.game?.systems?.equipment?.getItemById?.(itemId);
        if (!item) return false;
        
        // Проверяем по имени или описанию
        return item.name.includes(resourceId) || item.description.includes(resourceId);
    }

    hasResources(resources) {
        if (!Array.isArray(resources)) return true;
        
        for (const res of resources) {
            const count = this.getResourceCount(res.id);
            if (count < res.count) {
                return false;
            }
        }
        return true;
    }

    consumeResources(resources) {
        if (!Array.isArray(resources)) return true;
        if (!window.game || !window.game.sharedResources) return false;
        
        const inventory = window.game.sharedResources.inventory;
        
        for (const res of resources) {
            let needed = res.count;
            
            // Удаляем из инвентаря
            for (let i = inventory.length - 1; i >= 0 && needed > 0; i--) {
                if (this.isResourceItem(inventory[i], res.id)) {
                    inventory.splice(i, 1);
                    needed--;
                }
            }
            
            if (needed > 0) {
                console.error(`❌ Не удалось потреблить все ресурсы ${res.id}`);
                return false;
            }
        }
        
        return true;
    }

    // ========== ОСНОВНОЙ ИНТЕРФЕЙС КРАФТА ==========
    showCraftingUI(stationFilter = 'all', categoryFilter = 'all') {
        return `
            <div class="overlay-content crafting-overlay">
                <div class="overlay-header">
                    <h3>⚒️ Система крафта</h3>
                    <button class="btn-close" onclick="game.showOverlay('resources')">✕</button>
                </div>
                
                <div class="crafting-info-panel">
                    <div class="crafting-stats">
                        <div class="skills-display">
                            <h4>🎯 Навыки крафта:</h4>
                            ${this.renderSkills()}
                        </div>
                        <div class="stations-display">
                            <h4>🛠️ Портативные станции:</h4>
                            ${this.renderStations()}
                        </div>
                    </div>
                    
                    <div class="crafting-filters">
                        <div class="station-filter">
                            <h5>Фильтр станций:</h5>
                            <div class="filter-buttons">
                                <button class="filter-btn ${stationFilter === 'all' ? 'active' : ''}" 
                                        onclick="game.systems.crafting.showCraftingUI('all', '${categoryFilter}')">
                                    Все
                                </button>
                                ${this.renderStationFilters(stationFilter)}
                            </div>
                        </div>
                        
                        <div class="category-filter">
                            <h5>Категории:</h5>
                            <div class="filter-buttons">
                                ${this.renderCategoryFilters(categoryFilter, stationFilter)}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="crafting-recipes-grid">
                    ${this.renderAvailableRecipes(stationFilter, categoryFilter)}
                </div>
            </div>
        `;
    }

    renderSkills() {
        let html = '<div class="skills-list">';
        for (const [skill, data] of Object.entries(this.craftingSkills)) {
            const progress = (data.xp / data.xpToNext * 100).toFixed(1);
            html += `
                <div class="skill-item">
                    <span class="skill-name">${this.getSkillDisplayName(skill)}</span>
                    <div class="skill-level">Ур. ${data.level}</div>
                    <div class="skill-progress">
                        <div class="progress-bar" style="width: ${progress}%"></div>
                        <span class="progress-text">${data.xp}/${data.xpToNext}</span>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        return html;
    }

    renderStations() {
        let html = '<div class="stations-grid">';
        for (const [stationId, unlocked] of Object.entries(this.portableStations)) {
            const level = this.stationLevels[stationId] || 1;
            const stationName = this.getStationName(stationId);
            
            html += `
                <div class="station-item ${unlocked ? 'unlocked' : 'locked'}">
                    <div class="station-icon">${stationName.split(' ')[0]}</div>
                    <div class="station-info">
                        <div class="station-name">${stationName.split(' ').slice(1).join(' ')}</div>
                        <div class="station-status">
                            ${unlocked ? 
                                `<span class="station-level">Ур. ${level}</span>` :
                                '<span class="locked-text">🔒 Заблокировано</span>'
                            }
                        </div>
                    </div>
                    ${unlocked && level < 5 ? `
                        <button class="btn-upgrade" onclick="game.systems.crafting.upgradeStation('${stationId}')">
                            ⬆️ Улучшить
                        </button>
                    ` : ''}
                </div>
            `;
        }
        html += '</div>';
        return html;
    }

    renderStationFilters(activeFilter) {
        let html = '';
        for (const stationId in this.portableStations) {
            if (!this.portableStations[stationId]) continue;
            
            html += `
                <button class="filter-btn ${activeFilter === stationId ? 'active' : ''}" 
                        onclick="game.systems.crafting.showCraftingUI('${stationId}', 'all')">
                    ${this.getStationName(stationId)}
                </button>
            `;
        }
        return html;
    }

    renderCategoryFilters(activeCategory, stationFilter) {
        const categories = {
            'all': 'Все',
            'consumables': '⚗️ Расходники',
            'basic_components': '🧱 Компоненты',
            'tools': '🔨 Инструменты',
            'weapons': '⚔️ Оружие',
            'armor': '🛡️ Броня',
            'helmets': '⛑️ Шлемы',
            'stations': '🛠️ Станции'
        };
        
        let html = '';
        for (const [category, name] of Object.entries(categories)) {
            html += `
                <button class="filter-btn ${activeCategory === category ? 'active' : ''}" 
                        onclick="game.systems.crafting.showCraftingUI('${stationFilter}', '${category}')">
                    ${name}
                </button>
            `;
        }
        return html;
    }

    renderAvailableRecipes(stationFilter, categoryFilter) {
        const availableRecipes = this.getAvailableRecipes(stationFilter, categoryFilter);
        
        if (availableRecipes.length === 0) {
            return '<div class="no-recipes">📭 Нет доступных рецептов</div>';
        }
        
        let html = '<div class="recipes-list">';
        
        availableRecipes.forEach(recipe => {
            const canCraft = this.canCraftRecipe(recipe.id);
            const qualityBonus = this.calculateQualityBonus(recipe);
            
            html += `
                <div class="recipe-card ${canCraft ? 'craftable' : 'uncraftable'}">
                    <div class="recipe-header">
                        <h4 class="recipe-name">${recipe.name}</h4>
                        <span class="recipe-station">${this.getStationName(recipe.craft.station)}</span>
                    </div>
                    
                    <div class="recipe-description">${recipe.description}</div>
                    
                    ${qualityBonus ? `
                        <div class="recipe-quality">
                            <span class="quality-bonus">🎯 Качество: +${qualityBonus}%</span>
                        </div>
                    ` : ''}
                    
                    <div class="recipe-ingredients">
                        <h5>Ингредиенты:</h5>
                        ${recipe.craft.ingredients.map(ing => {
                            const hasAmount = this.getResourceCount(ing.id) >= ing.count;
                            const resourceData = window.game?.systems?.resources?.getResourceData?.(ing.id);
                            return `
                                <div class="ingredient ${hasAmount ? 'has' : 'missing'}">
                                    <span class="ingredient-icon">${resourceData?.name?.split(' ')[0] || '📦'}</span>
                                    <span class="ingredient-name">${resourceData?.name?.split(' ').slice(1).join(' ') || ing.id}</span>
                                    <span class="ingredient-count">${this.getResourceCount(ing.id)}/${ing.count}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="recipe-actions">
                        <button class="btn-craft ${canCraft ? '' : 'disabled'}" 
                                onclick="game.systems.crafting.craftItem('${recipe.id}')"
                                ${!canCraft ? 'disabled' : ''}>
                            ${canCraft ? '⚒️ Создать' : '❌ Недостаточно ресурсов'}
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }

    // ========== ЛОГИКА КРАФТА ==========
    getAvailableRecipes(stationFilter = 'all', categoryFilter = 'all') {
        const availableRecipes = [];
        
        const recipeCategories = ['consumables', 'basic_components', 'tools', 'weapons', 'helmets', 'stations', 'materials', 'weapon_recipes', 'boots_recipes', 'legs_recipes', 'chest_armor', 'gloves'];
        
        recipeCategories.forEach(category => {
            if (categoryFilter !== 'all' && categoryFilter !== category && !category.includes(categoryFilter)) {
                return; // Пропускаем невыбранные категории
            }
            
            const recipes = this.recipes[category];
            if (!recipes) return;
            
            for (const [recipeId, recipeData] of Object.entries(recipes)) {
                // Проверяем станцию
                const station = recipeData.craft?.station || 'hand_craft';
                if (stationFilter !== 'all' && stationFilter !== station) {
                    continue;
                }
                
                // Проверяем, есть ли у игрока станция
                if (!this.hasStation(station)) {
                    continue;
                }
                
                // Проверяем требования (если есть)
                const requirements = recipeData.craft?.requires || [];
                if (requirements.length > 0) {
                    const hasRequirements = requirements.every(req => this.hasStation(req));
                    if (!hasRequirements) continue;
                }
                
                // Добавляем рецепт
                availableRecipes.push({
                    id: recipeId,
                    category: category,
                    ...recipeData
                });
            }
        });
        
        return availableRecipes;
    }

    canCraftRecipe(recipeId) {
        // Находим рецепт
        const recipe = this.findRecipeById(recipeId);
        if (!recipe || !recipe.craft) return false;
        
        // Проверяем станцию
        const station = recipe.craft.station || 'hand_craft';
        if (!this.hasStation(station)) return false;
        
        // Проверяем требования
        const requirements = recipe.craft.requires || [];
        if (!requirements.every(req => this.hasStation(req))) {
            return false;
        }
        
        // Проверяем инструменты (если нужны)
        const tools = recipe.craft.tools || [];
        if (tools.length > 0) {
            // Проверяем, есть ли инструменты в инвентаре
            const hasTools = tools.every(toolId => {
                return window.game?.sharedResources?.inventory?.some(itemId => {
                    const item = window.game.systems.equipment?.getItemById?.(itemId);
                    return item && item.name.includes(toolId);
                });
            });
            
            if (!hasTools) return false;
        }
        
        // Проверяем ресурсы
        return this.hasResources(recipe.craft.ingredients);
    }

    findRecipeById(recipeId) {
        // Ищем рецепт во всех категориях
        for (const category in this.recipes) {
            if (this.recipes[category] && this.recipes[category][recipeId]) {
                return { id: recipeId, category, ...this.recipes[category][recipeId] };
            }
        }
        return null;
    }

    craftItem(recipeId) {
        if (!window.game) return;
        
        const recipe = this.findRecipeById(recipeId);
        if (!recipe) {
            window.game.showNotification('❌ Рецепт не найден', 'error');
            return;
        }
        
        if (!this.canCraftRecipe(recipeId)) {
            window.game.showNotification('❌ Нельзя создать этот предмет', 'error');
            return;
        }
        
        // Потребляем ресурсы
        if (!this.consumeResources(recipe.craft.ingredients)) {
            window.game.showNotification('❌ Не удалось использовать ресурсы', 'error');
            return;
        }
        
        // Потребляем расходники станции (если есть)
        const consumes = recipe.craft.consumes || {};
        for (const [itemId, count] of Object.entries(consumes)) {
            // Здесь можно добавить логику потребления расходников
            console.log(`Потребляется ${count} ${itemId}`);
        }
        
        // Определяем навык для прокачки
        const skill = this.getSkillForRecipe(recipe);
        if (skill) {
            // Даём опыт за крафт
            const xpAmount = this.calculateCraftXP(recipe);
            this.addSkillXP(skill, xpAmount);
        }
        
        // Создаём предмет
        const craftedItem = this.createCraftedItem(recipe);
        if (!craftedItem) {
            window.game.showNotification('❌ Ошибка создания предмета', 'error');
            return;
        }
        
        // Добавляем предмет в инвентарь
        if (craftedItem.id) {
            // Добавляем ID предмета в инвентарь
            window.game.sharedResources.inventory.push(craftedItem.id);
            console.log(`✅ Создан предмет: ${craftedItem.name}`);
            
            window.game.showNotification(`✅ Создано: ${craftedItem.name}`, 'success');
        } else if (craftedItem.resourceId) {
            // Для ресурсов добавляем в общий пул
            window.game.sharedResources.resources[craftedItem.resourceId] = {
                id: craftedItem.resourceId,
                count: (window.game.sharedResources.resources[craftedItem.resourceId]?.count || 0) + 1
            };
            console.log(`✅ Создан ресурс: ${craftedItem.name}`);
            
            window.game.showNotification(`✅ Создано: ${craftedItem.name}`, 'success');
        }
        
        // Сохраняем игру
        window.game.saveGame();
        
        // Обновляем интерфейс
        const overlay = document.getElementById('overlay-container');
        if (overlay) {
            overlay.innerHTML = this.showCraftingUI();
            this.attachCraftingHandlers();
        }
    }

    getSkillForRecipe(recipe) {
        // Определяем навык по категории рецепта
        const skillMap = {
            'weapons': 'blacksmithing',
            'tools': 'blacksmithing',
            'consumables': 'alchemy',
            'helmets': 'tailoring',
            'leathers': 'leatherworking',
            'basic_components': 'woodworking'
        };
        
        for (const [category, skill] of Object.entries(skillMap)) {
            if (recipe.category.includes(category)) {
                return skill;
            }
        }
        
        return null;
    }

    calculateCraftXP(recipe) {
        // Базовый опыт за крафт
        const baseXP = 10;
        
        // Множитель сложности рецепта
        const complexity = this.getRecipeComplexity(recipe);
        
        // Множитель уровня станции
        const stationLevel = this.stationLevels[recipe.craft.station] || 1;
        
        return Math.floor(baseXP * complexity * (stationLevel * 0.5));
    }

    getRecipeComplexity(recipe) {
        // Сложность рецепта на основе ингредиентов
        const ingredientCount = recipe.craft.ingredients?.length || 1;
        const totalIngredients = recipe.craft.ingredients?.reduce((sum, ing) => sum + ing.count, 0) || 1;
        
        return Math.max(1, (ingredientCount * totalIngredients) / 10);
    }

    calculateQualityBonus(recipe) {
        // Бонус качества на основе:
        // 1. Уровня станции
        // 2. Уровня навыка
        // 3. Улучшений станции
        
        const stationLevel = this.stationLevels[recipe.craft.station] || 1;
        const skill = this.getSkillForRecipe(recipe);
        const skillLevel = skill ? this.getSkillLevel(skill) : 1;
        
        // Базовый бонус 0%
        // Каждый уровень станции даёт +2%
        // Каждый уровень навыка даёт +1%
        let qualityBonus = 0;
        qualityBonus += (stationLevel - 1) * 2; // 0% на уровне 1, +2% на уровне 2 и т.д.
        qualityBonus += (skillLevel - 1) * 1; // 0% на уровне 1, +1% на уровне 2 и т.д.
        
        // Максимальный бонус 50%
        qualityBonus = Math.min(qualityBonus, 50);
        
        return qualityBonus > 0 ? qualityBonus : null;
    }

    createCraftedItem(recipe) {
        // Создаём предмет на основе рецепта
        
        if (recipe.item_id) {
            // Для предметов с фиксированными ID
            const item = window.game.systems.equipment?.getItemById?.(recipe.item_id);
            if (item) {
                return {
                    ...item,
                    crafted: true,
                    quality: this.calculateQualityBonus(recipe)
                };
            }
        }
        
        // Для ресурсов и компонентов
        return {
            id: `crafted_${recipe.id}_${Date.now()}`,
            name: recipe.name,
            description: recipe.description,
            type: 'resource',
            resourceId: recipe.id,
            quality: this.calculateQualityBonus(recipe)
        };
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    getUnlockedRecipes() {
        // Получаем список разблокированных рецептов
        const unlocked = [];
        const availableRecipes = this.getAvailableRecipes();
        
        availableRecipes.forEach(recipe => {
            if (this.canCraftRecipe(recipe.id)) {
                unlocked.push(recipe.id);
            }
        });
        
        return unlocked;
    }

    attachCraftingHandlers() {
        // Привязываем обработчики для интерфейса крафта
        const craftButtons = document.querySelectorAll('.btn-craft');
        craftButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recipeId = e.target.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                if (recipeId) {
                    this.craftItem(recipeId);
                }
            });
        });
        
        const upgradeButtons = document.querySelectorAll('.btn-upgrade');
        upgradeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const stationId = e.target.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                if (stationId) {
                    this.upgradeStation(stationId);
                }
            });
        });
    }

    // ========== ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ ИНТЕГРАЦИИ ==========
    unlockDefaultStations() {
        // Разблокировать базовые станции при старте игры
        this.unlockStation('campfire');
        this.unlockStation('workbench');
    }

    // ========== МЕТОДЫ ОТЛАДКИ ==========
    debugCraftingSystem() {
        console.log("=== DEBUG CRAFTING SYSTEM ===");
        console.log("1. Система загружена:", this.loaded);
        console.log("2. Рецепты:", this.recipes);
        console.log("3. Количество станций:", Object.keys(this.recipes.stations || {}).length);
        console.log("4. Станции:", this.recipes.stations);
        console.log("5. Портативные станции:", this.portableStations);
        console.log("6. Метод showCraftingUI существует:", typeof this.showCraftingUI);
        console.log("7. Метод getAvailableRecipes существует:", typeof this.getAvailableRecipes);
        
        // Пробуем получить доступные рецепты
        const availableRecipes = this.getAvailableRecipes('all', 'all');
        console.log("8. Доступные рецепты:", availableRecipes.length);
        console.log("9. Пример рецепта:", availableRecipes[0]);
        
        return {
            loaded: this.loaded,
            recipesCount: Object.keys(this.recipes).length,
            stations: Object.keys(this.recipes.stations || {}),
            availableRecipes: availableRecipes.length
        };
    }

    // Метод для проверки пути к файлу
    async testFilePaths() {
        const testPaths = [
            'data/crafting.json',
            'crafting.json',
            './crafting.json',
            '/crafting.json',
            'crafting-recipes.json',
            'data/crafting-recipes.json'
        ];
        
        console.log("🔍 Тестирование путей к файлу рецептов:");
        
        for (const path of testPaths) {
            try {
                const response = await fetch(path);
                console.log(`${response.ok ? '✅' : '❌'} ${path}: ${response.status} ${response.statusText}`);
                if (response.ok) {
                    const text = await response.text();
                    console.log(`   Размер файла: ${text.length} байт`);
                    console.log(`   Первые 200 символов: ${text.substring(0, 200)}...`);
                }
            } catch (error) {
                console.log(`❌ ${path}: ${error.message}`);
            }
        }
    }

    // ========== ПУБЛИЧНЫЕ МЕТОДЫ ДЛЯ ИНТЕГРАЦИИ ==========
    unlockDefaultStations() {
        // Разблокировать базовые станции при старте игры
        this.unlockStation('campfire');
        this.unlockStation('workbench');
    }

    addCraftingToResources() {
        console.log("🔗 Привязываем кнопку крафта к ресурсам...");
        
        // Проверяем, что игра существует
        if (!window.game || !window.game.systems || !window.game.systems.resources) {
            console.warn("⚠️ Игра или система ресурсов не доступны");
            return;
        }
        
        const resourcesSystem = window.game.systems.resources;
        
        // Сохраняем оригинальный метод
        if (!resourcesSystem.originalShowResourcesInventory) {
            resourcesSystem.originalShowResourcesInventory = resourcesSystem.showResourcesInventory;
        }
        
        // Создаем новый метод с кнопкой крафта
        resourcesSystem.showResourcesInventory = function() {
            // Вызываем оригинальный метод
            let html = this.originalShowResourcesInventory();
            
            // Находим последний закрывающий div и добавляем перед ним кнопку
            const buttonHTML = `
                <div class="crafting-button-section" style="margin-top: 20px; text-align: center;">
                    <button class="btn-crafting-main" 
                            onclick="if(window.game && window.game.showCrafting) { window.game.showCrafting(); } else { alert('Система крафта не загружена'); }"
                            style="padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        ⚒️ Перейти к крафту
                    </button>
                    <p style="margin-top: 8px; font-size: 12px; color: #aaa;">
                        Создание предметов и ресурсов
                    </p>
                </div>
            `;
            
            // Добавляем кнопку перед последним закрывающим div
            return html.replace(/(<\/div>\s*<\/div>\s*<\/div>\s*$)/, buttonHTML + "$1");
        };
        
        console.log("✅ Кнопка крафта добавлена в интерфейс ресурсов");
    }
}

// Экспортируем систему
window.CraftingSystem = CraftingSystem;
console.log("✅ CraftingSystem экспортирован в window");

