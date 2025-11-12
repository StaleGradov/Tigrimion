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
            if (document.getElementById('game-styles')) {
                console.log("✅ Стили уже загружены");
                resolve(true);
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'style.css';
            link.id = 'game-styles';
            
            link.onload = () => {
                console.log("✅ Стили игры загружены");
                resolve(true);
            };
            
            link.onerror = () => {
                console.error("❌ Ошибка загрузки стилей");
                this.createFallbackStyles();
                resolve(true);
            };
            
            document.head.appendChild(link);
        });
    }

    createFallbackStyles() {
        const fallbackStyles = `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: Arial, sans-serif; 
                background: #1a1a2e; 
                color: white; 
                padding: 20px; 
            }
            .loading-screen { 
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                text-align: center; 
            }
            .btn-primary, .btn-secondary { 
                padding: 10px 20px; 
                margin: 5px; 
                border: none; 
                border-radius: 5px; 
                cursor: pointer; 
            }
            .btn-primary { background: #3b82f6; color: white; }
            .btn-secondary { background: #6b7280; color: white; }
            
            /* Стили для шкалы здоровья */
            .health-bar-container {
                width: 100%;
                background: #333;
                border-radius: 10px;
                margin: 10px 0;
                overflow: hidden;
                position: relative;
                border: 2px solid #444;
            }
            
            .health-bar {
                height: 30px;
                background: linear-gradient(90deg, #e74c3c, #f39c12);
                border-radius: 8px;
                transition: width 0.5s ease;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.7);
                min-width: 50px;
            }
            
            .health-bar.regening {
                background: linear-gradient(90deg, #2ecc71, #27ae60);
                animation: pulseHealth 1s infinite;
            }
            
            @keyframes pulseHealth {
                0% { opacity: 1; }
                50% { opacity: 0.8; }
                100% { opacity: 1; }
            }
            
            .health-numbers {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                font-size: 14px;
                font-weight: bold;
                z-index: 2;
            }
            
            /* Стили для экрана героя */
            .hero-overlay-panel {
                background: rgba(0, 0, 0, 0.8);
                padding: 20px;
                border-radius: 15px;
                margin: 20px;
                max-width: 500px;
            }
        `;
        
        const style = document.createElement('style');
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

// ========== МОДУЛЬ 2: ОСНОВНОЙ КЛАСС ИГРЫ С ИСПРАВЛЕННОЙ СИСТЕМОЙ ХАРАКТЕРИСТИК ==========
class SafeHeroGame {
    constructor() {
        this.moduleLoader = new ModuleLoader();
        this.systems = {};
        this.currentScreen = 'loading';
        this.currentHero = null;
        this.activeOverlay = null;
        this.isSaveLoaded = false;
        this.healthUpdateInterval = null;
        this.init();
    }

    async init() {
        try {
            console.log("🎮 Инициализация игры...");
            
            this.showLoadingScreen("Загрузка игровых модулей...");
            
            await this.moduleLoader.loadAllModules();
            
            await this.initializeSystems();
            
            await this.loadGameData();
            
            console.log("📂 Пытаемся загрузить сохранение...");
            const saveLoaded = this.loadSave();
            if (saveLoaded) {
                console.log("✅ Сохранение загружено");
                this.isSaveLoaded = true;
                
                if (this.currentHero) {
                    console.log(`🎯 Восстановлен герой: ${this.currentHero.name}`);
                    this.showHeroGameScreen();
                } else {
                    this.showHeroSelection();
                }
            } else {
                console.log("🆕 Сохранение не найдено, начинаем новую игру");
                this.showHeroSelection();
            }
            
            this.startAutosave();
            
            // ⭐ ЗАПУСКАЕМ РЕГЕНЕРАЦИЮ ЗДОРОВЬЯ С ВИЗУАЛЬНЫМ ОБНОВЛЕНИЕМ
            this.startHealthRegeneration();
            
        } catch (error) {
            console.error("💀 Критическая ошибка инициализации:", error);
            this.panic(error);
        }
    }

    async initializeSystems() {
        console.log("⚙️ Инициализация игровых систем...");
        
        try {
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

    // ========== УЛУЧШЕННАЯ СИСТЕМА РАСЧЕТА ХАРАКТЕРИСТИК ==========
    calculateHeroStats(hero = null) {
        const targetHero = hero || this.currentHero;
        if (!targetHero) return this.getEmptyStats();
        
        // ⭐ ИСПОЛЬЗУЕМ LevelSystem ДЛЯ ПРАВИЛЬНОГО РАСЧЕТА
        if (this.systems.level && this.systems.bonus) {
            return this.systems.level.calculateHeroStats(targetHero, this.systems.bonus);
        }
        
        // ⭐ РЕЗЕРВНЫЙ РАСЧЕТ ЕСЛИ СИСТЕМЫ НЕДОСТУПНЫ
        return this.calculateStatsFallback(targetHero);
    }

    calculateStatsFallback(hero) {
        // Базовые характеристики с учетом уровня
        const levelMultiplier = 1 + (hero.level - 1) * 0.1;
        
        let baseMaxHealth = Math.round(hero.baseHealth * levelMultiplier);
        let baseDamage = Math.round(hero.baseDamage * levelMultiplier);
        let baseArmor = Math.round(hero.baseArmor * levelMultiplier);
        
        // Бонусы от экипировки
        let equipmentHealth = 0;
        let equipmentDamage = 0;
        let equipmentArmor = 0;
        
        if (hero.equipment && this.systems.equipment) {
            Object.values(hero.equipment).forEach(itemId => {
                if (itemId) {
                    const item = this.systems.equipment.getItemById(itemId);
                    if (item) {
                        equipmentDamage += item.fixed_damage || 0;
                        equipmentArmor += item.fixed_armor || 0;
                        equipmentHealth += item.fixed_health || 0;
                    }
                }
            });
        }
        
        // Применяем бонусы от расы, класса, саги
        let finalHealth = baseMaxHealth + equipmentHealth;
        let finalDamage = baseDamage + equipmentDamage;
        let finalArmor = baseArmor + equipmentArmor;
        
        // Бонусы от расы, класса, саги (упрощенная версия)
        if (this.systems.bonus) {
            try {
                const totals = this.systems.bonus.calculateTotalBonuses(hero);
                
                finalHealth += baseMaxHealth * totals.health_mult;
                finalDamage += baseDamage * totals.damage_mult;
                finalArmor += baseArmor * totals.armor_mult;
                
            } catch (error) {
                console.warn("⚠️ Ошибка расчета бонусов:", error);
            }
        }
        
        // Убедимся что значения не отрицательные
        finalHealth = Math.max(1, Math.round(finalHealth));
        finalDamage = Math.max(1, Math.round(finalDamage));
        finalArmor = Math.max(0, Math.round(finalArmor));
        
        // Рассчитываем текущее здоровье
        const currentHealth = Math.min(hero.currentHealth || finalHealth, finalHealth);
        
        // Мощность героя
        const power = Math.round((finalHealth / 10) + (finalDamage * 1.5) + (finalArmor * 2));
        
        return {
            currentHealth: Math.floor(currentHealth),
            maxHealth: Math.round(finalHealth),
            damage: Math.round(finalDamage),
            armor: Math.round(finalArmor),
            power: power,
            // ⭐ ДОБАВЛЯЕМ ДОПОЛНИТЕЛЬНЫЕ ХАРАКТЕРИСТИКИ
            healthRegen: 1.0,
            critChance: 0.05,
            vampirism: 0.0
        };
    }

    getEmptyStats() {
        return {
            currentHealth: 0,
            maxHealth: 0,
            damage: 0,
            armor: 0,
            power: 0,
            healthRegen: 0,
            critChance: 0,
            vampirism: 0
        };
    }

    // ========== УЛУЧШЕННАЯ СИСТЕМА РЕГЕНЕРАЦИИ ЗДОРОВЬЯ ==========
    startHealthRegeneration() {
        // Останавливаем предыдущий интервал если есть
        if (this.healthUpdateInterval) {
            clearInterval(this.healthUpdateInterval);
        }
        
        this.healthUpdateInterval = setInterval(() => {
            if (this.currentHero && this.systems.level) {
                const stats = this.calculateHeroStats(this.currentHero);
                
                if (this.currentHero.currentHealth < stats.maxHealth) {
                    // Базовая регенерация + бонусы
                    const baseRegen = 1; // 1 хит в секунду
                    const bonusRegen = stats.healthRegen * baseRegen;
                    const totalRegen = baseRegen + bonusRegen;
                    
                    const oldHealth = this.currentHero.currentHealth;
                    this.currentHero.currentHealth = Math.min(
                        stats.maxHealth, 
                        this.currentHero.currentHealth + totalRegen
                    );
                    
                    // ⭐ ВИЗУАЛЬНОЕ ОБНОВЛЕНИЕ ЕСЛИ ЭКРАН ГЕРОЯ ОТКРЫТ
                    if (this.currentScreen === 'hero') {
                        this.updateHealthDisplay();
                    }
                    
                    // Логируем только если здоровье изменилось значительно
                    if (Math.floor(this.currentHero.currentHealth) !== Math.floor(oldHealth)) {
                        console.log(`❤️ Регенерация: +${totalRegen.toFixed(1)} HP (${Math.floor(this.currentHero.currentHealth)}/${stats.maxHealth})`);
                    }
                    
                    // Автосохранение при значительном восстановлении
                    if (Math.random() < 0.05) { // 5% шанс на автосохранение
                        this.saveGame();
                    }
                }
            }
        }, 1000); // Каждую секунду
    }

    // ========== ОБНОВЛЕНИЕ ОТОБРАЖЕНИЯ ЗДОРОВЬЯ В РЕАЛЬНОМ ВРЕМЕНИ ==========
    updateHealthDisplay() {
        if (!this.currentHero) return;
        
        const stats = this.calculateHeroStats(this.currentHero);
        const healthPercent = (stats.currentHealth / stats.maxHealth) * 100;
        
        // Обновляем шкалу здоровья
        const healthBar = document.querySelector('.health-bar');
        const healthNumbers = document.querySelector('.health-numbers');
        const statValueElements = document.querySelectorAll('.overlay-stat-value');
        
        if (healthBar) {
            healthBar.style.width = healthPercent + '%';
            
            // Добавляем анимацию регенерации
            if (stats.currentHealth < stats.maxHealth) {
                healthBar.classList.add('regening');
            } else {
                healthBar.classList.remove('regening');
            }
        }
        
        if (healthNumbers) {
            healthNumbers.textContent = `${Math.floor(stats.currentHealth)}/${stats.maxHealth}`;
        }
        
        // Обновляем цифры в статистике
        statValueElements.forEach(element => {
            const label = element.previousElementSibling;
            if (label && label.textContent.includes('❤️')) {
                element.textContent = `${Math.floor(stats.currentHealth)}/${stats.maxHealth}`;
            }
        });
    }

    // ========== СИСТЕМА СОХРАНЕНИЯ ==========
    saveGame() {
        try {
            if (this.currentHero && this.systems.equipment && this.systems.hero) {
                const saveData = {
                    currentHeroId: this.currentHero.id,
                    heroes: this.systems.hero.heroes.map(hero => ({
                        id: hero.id,
                        name: hero.name,
                        image: hero.image,
                        race: hero.race,
                        class: hero.class,
                        saga: hero.saga,
                        baseHealth: hero.baseHealth,
                        baseDamage: hero.baseDamage,
                        baseArmor: hero.baseArmor,
                        gold: hero.gold,
                        level: hero.level,
                        experience: hero.experience,
                        monstersKilled: hero.monstersKilled || 0,
                        deaths: hero.deaths || 0,
                        healthRegen: hero.healthRegen || 1.0,
                        inventory: [...hero.inventory],
                        equipment: {...hero.equipment},
                        unlocked: hero.unlocked,
                        currentHealth: hero.currentHealth || hero.baseHealth
                    })),
                    timestamp: Date.now(),
                    version: "1.0"
                };
                
                localStorage.setItem('tigrimionSave', JSON.stringify(saveData));
                console.log("💾 Игра сохранена", {
                    hero: this.currentHero.name,
                    gold: this.currentHero.gold,
                    health: `${Math.floor(this.currentHero.currentHealth)}/${this.calculateHeroStats().maxHealth}`
                });
                return true;
            }
        } catch (error) {
            console.error("❌ Ошибка сохранения:", error);
        }
        return false;
    }

    loadSave() {
        try {
            const save = localStorage.getItem('tigrimionSave');
            if (save) {
                const data = JSON.parse(save);
                console.log("📂 Загружаем сохранение:", data);
                
                if (data.heroes && this.systems.hero) {
                    data.heroes.forEach(savedHero => {
                        const existingHero = this.systems.hero.heroes.find(h => h.id === savedHero.id);
                        if (existingHero) {
                            const preservedFields = ['name', 'image', 'race', 'class', 'saga', 'story'];
                            
                            preservedFields.forEach(field => {
                                if (savedHero[field]) {
                                    existingHero[field] = savedHero[field];
                                }
                            });
                            
                            existingHero.gold = savedHero.gold || existingHero.gold;
                            existingHero.level = savedHero.level || existingHero.level;
                            existingHero.experience = savedHero.experience || existingHero.experience;
                            existingHero.monstersKilled = savedHero.monstersKilled || existingHero.monstersKilled;
                            existingHero.deaths = savedHero.deaths || existingHero.deaths;
                            existingHero.healthRegen = savedHero.healthRegen || existingHero.healthRegen;
                            existingHero.currentHealth = savedHero.currentHealth || existingHero.currentHealth;
                            
                            existingHero.inventory = savedHero.inventory || [];
                            existingHero.equipment = savedHero.equipment || {
                                main_hand: null,
                                off_hand: null,
                                helmet: null,
                                chest: null,
                                gloves: null,
                                legs: null,
                                boots: null
                            };
                            
                            existingHero.unlocked = savedHero.unlocked !== undefined ? savedHero.unlocked : existingHero.unlocked;
                            
                            console.log(`✅ Загружен герой: ${existingHero.name}`, {
                                level: existingHero.level,
                                gold: existingHero.gold,
                                health: `${Math.floor(existingHero.currentHealth)}/${this.calculateHeroStats(existingHero).maxHealth}`
                            });
                        }
                    });
                    
                    console.log("✅ Прогресс всех героев загружен");
                }
                
                if (data.currentHeroId && this.systems.hero) {
                    this.currentHero = this.systems.hero.heroes.find(h => h.id === data.currentHeroId);
                    if (this.currentHero && this.systems.equipment) {
                        this.systems.equipment.setCurrentHero(this.currentHero);
                    }
                    console.log("✅ Текущий герой восстановлен:", this.currentHero?.name);
                }
                
                return true;
            }
        } catch (error) {
            console.error("❌ Ошибка загрузки сохранения:", error);
            localStorage.removeItem('tigrimionSave');
            console.log("🗑️ Битое сохранение удалено");
        }
        return false;
    }

    startAutosave() {
        setInterval(() => {
            if (this.currentHero) {
                this.saveGame();
                console.log("💾 Автосохранение выполнено");
            }
        }, 30000);
        
        window.addEventListener('beforeunload', () => {
            if (this.currentHero) {
                this.saveGame();
                console.log("💾 Сохранение при закрытии страницы");
            }
        });
    }

    // ========== ОСНОВНЫЕ ЭКРАНЫ ИНТЕРФЕЙСА ==========
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

    showHeroSelection() {
        const app = document.getElementById('app');
        if (!app) return;

        const heroes = this.systems.hero.heroes;
        
        app.innerHTML = `
            <div class="hero-selection-screen">
                <header class="selection-header">
                    <!-- Заголовок скрыт как просили -->
                </header>
                
                <div class="heroes-grid">
                    ${heroes.map(hero => {
                        const isUnlocked = hero.unlocked || hero.id === 1;
                        const stats = this.calculateHeroStats(hero);
                        
                        return `
                            <div class="hero-card ${isUnlocked ? '' : 'locked'}" 
                                 onclick="${isUnlocked ? `game.selectHero(${hero.id})` : ''}">
                                <div class="hero-image">
                                    <img src="${hero.image}" alt="${hero.name}" 
                                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                                    ${!isUnlocked ? '<div class="locked-overlay">🔒</div>' : ''}
                                </div>
                                <div class="hero-info-tooltip">
                                    <div class="hero-header">
                                        <strong>${hero.name}</strong>
                                        <span class="hero-level">Ур. ${hero.level}</span>
                                    </div>
                                    <div class="hero-stats">
                                        <div class="stat-row">
                                            <span>❤️ ${Math.floor(stats.currentHealth)}/${stats.maxHealth}</span>
                                            <span>⚔️ ${stats.damage}</span>
                                            <span>🛡️ ${stats.armor}</span>
                                        </div>
                                        <div class="stat-row">
                                            <span>💰 ${hero.gold.toFixed(2)}</span>
                                            <span>🌟 ${stats.power}</span>
                                        </div>
                                    </div>
                                    <div class="hero-details">
                                        <span>🧬 ${this.getRaceName(hero.race)}</span>
                                        <span>⚔️ ${this.getClassName(hero.class)}</span>
                                        <span>📖 ${this.getSagaName(hero.saga)}</span>
                                    </div>
                                    ${!isUnlocked ? 
                                        '<small class="locked-text">Требуется уровень: ' + (hero.id * 5) + '</small>' : 
                                        '<small class="select-text">Кликните для выбора</small>'
                                    }
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="selection-actions">
                    <button class="btn-secondary" onclick="game.showMainMenu()">
                        ← Назад в меню
                    </button>
                </div>
            </div>
        `;
    }

    selectHero(heroId) {
        const hero = this.systems.hero.heroes.find(h => h.id === heroId);
        if (!hero) return;

        this.currentHero = hero;
        this.systems.hero.currentHero = hero;
        
        if (this.systems.equipment) {
            this.systems.equipment.setCurrentHero(hero);
        }
        
        console.log(`🎯 Выбран герой: ${hero.name}`);
        
        this.saveGame();
        
        this.showHeroGameScreen();
    }

    showHeroGameScreen() {
        if (!this.currentHero) return;

        this.currentScreen = 'hero'; // Устанавливаем флаг что экран героя активен
        
        const app = document.getElementById('app');
        const stats = this.calculateHeroStats(this.currentHero);
        const healthPercent = (stats.currentHealth / stats.maxHealth) * 100;
        
        app.innerHTML = `
            <div class="hero-game-screen">
                <!-- Верхняя панель кнопок -->
                <div class="top-action-bar">
                    <button class="btn-top" onclick="game.showOverlay('global-map')">
                        🗺️ Глобальная карта
                    </button>
                    <button class="btn-top" onclick="game.showOverlay('local-map')">
                        📍 Локальная карта
                    </button>
                    <button class="btn-top" onclick="game.showOverlay('tactical-map')">
                        🎲 Тактическая карта
                    </button>
                    <button class="btn-top" onclick="game.showOverlay('inventory')">
                        🎒 Инвентарь
                    </button>
                    <button class="btn-top" onclick="game.showOverlay('shop')">
                        🏪 Магазин
                    </button>
                    <button class="btn-top" onclick="game.showHeroSelection()">
                        🔁 Сменить героя
                    </button>
                </div>

                <!-- Основное окно героя (полноэкранное) -->
                <div class="hero-main-window">
                    <div class="hero-fullscreen">
                        <!-- Фон - картинка героя -->
                        <div class="hero-background">
                            <img src="${this.currentHero.image}" alt="${this.currentHero.name}" 
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzg4OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                        </div>
                        
                        <!-- Панель параметров поверх картинки -->
                        <div class="hero-overlay-panel">
                            <!-- Верхняя строка - имя и уровень -->
                            <div class="hero-overlay-header">
                                <div class="hero-overlay-name">${this.currentHero.name}</div>
                                <div class="hero-overlay-level">⚡ Ур. ${this.currentHero.level}</div>
                            </div>
                            
                            <!-- ⭐ БОЛЬШАЯ ШКАЛА ЗДОРОВЬЯ С АНИМАЦИЕЙ -->
                            <div class="health-display-section">
                                <h4>❤️ Здоровье</h4>
                                <div class="health-bar-container">
                                    <div class="health-bar ${stats.currentHealth < stats.maxHealth ? 'regening' : ''}" 
                                         style="width: ${healthPercent}%">
                                        <div class="health-numbers">${Math.floor(stats.currentHealth)}/${stats.maxHealth}</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Основные параметры -->
                            <div class="hero-overlay-stats">
                                <div class="overlay-stat-group">
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">⚔️ Мощь</span>
                                        <span class="overlay-stat-value">${stats.damage}</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">🛡️ Защита</span>
                                        <span class="overlay-stat-value">${stats.armor}</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">💰 Золото</span>
                                        <span class="overlay-stat-value">${this.currentHero.gold.toFixed(2)}</span>
                                    </div>
                                </div>
                                
                                <div class="overlay-stat-group">
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">🌟 Сила</span>
                                        <span class="overlay-stat-value">${stats.power}</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">🧬 Раса</span>
                                        <span class="overlay-stat-value">${this.getRaceName(this.currentHero.race)}</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">⚔️ Класс</span>
                                        <span class="overlay-stat-value">${this.getClassName(this.currentHero.class)}</span>
                                    </div>
                                </div>

                                <!-- ⭐ ДОПОЛНИТЕЛЬНЫЕ ХАРАКТЕРИСТИКИ -->
                                <div class="overlay-stat-group">
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">🎯 Крит</span>
                                        <span class="overlay-stat-value">${(stats.critChance * 100).toFixed(1)}%</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">❤️ Реген</span>
                                        <span class="overlay-stat-value">+${(stats.healthRegen * 100).toFixed(1)}%</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">🩸 Вампир</span>
                                        <span class="overlay-stat-value">${(stats.vampirism * 100).toFixed(1)}%</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Экипировка -->
                            <div class="hero-overlay-equipment">
                                <h4>🎒 Экипировка</h4>
                                <div class="equipment-slots-mini">
                                    ${['main_hand', 'off_hand', 'helmet', 'chest', 'gloves', 'legs', 'boots'].map(slot => {
                                        const itemId = this.currentHero.equipment[slot];
                                        const item = itemId && this.systems.equipment ? 
                                            this.systems.equipment.getItemById(itemId) : null;
                                        return `
                                            <div class="equipment-slot-mini ${slot} ${item ? 'equipped' : 'empty'}"
                                                 onclick="game.handleEquipmentSlotClick('${slot}')"
                                                 ${item ? `data-rarity="${item.rarity || 'common'}"` : ''}>
                                                <div class="slot-icon-mini">
                                                    ${item ? 
                                                        `<img src="${item.image}" alt="${item.name}" 
                                                              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                                                         <div class="item-fallback" style="display: none;">
                                                             <span>${this.getSlotIcon(slot)}</span>
                                                         </div>` : 
                                                        this.getSlotIcon(slot)
                                                    }
                                                </div>
                                                <div class="slot-label-mini">${this.getSlotName(slot)}</div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Область для оверлеев (открывается поверх героя) -->
                <div id="overlay-container" class="overlay-container"></div>
            </div>
        `;
    }

    // ========== ОБРАБОТЧИК КЛИКА ПО СЛОТУ ЭКИПИРОВКИ ==========
    handleEquipmentSlotClick(slot) {
        const itemId = this.currentHero.equipment[slot];
        
        if (itemId) {
            this.systems.equipment.unequipItem(slot);
        } else {
            this.showEquipmentForSlot(slot);
        }
    }

    // ========== СИСТЕМА УПРАВЛЕНИЯ ОКНАМИ ==========
    showOverlay(overlayType) {
        const container = document.getElementById('overlay-container');
        if (!container) return;

        this.activeOverlay = overlayType;

        switch(overlayType) {
            case 'global-map':
                container.innerHTML = `
                    <div class="overlay-content map-overlay">
                        <div class="overlay-header">
                            <h3>🗺️ Глобальная карта</h3>
                            <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                        </div>
                        <div class="overlay-body">
                            ${this.systems.map ? this.systems.map.renderGlobalMap() : 'Карта загружается...'}
                        </div>
                    </div>
                `;
                break;

            case 'local-map':
                container.innerHTML = `
                    <div class="overlay-content map-overlay">
                        <div class="overlay-header">
                            <h3>📍 Локальная карта</h3>
                            <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                        </div>
                        <div class="overlay-body">
                            ${this.systems.map ? this.systems.map.renderLocalMap() : 'Карта загружается...'}
                        </div>
                    </div>
                `;
                break;

            case 'tactical-map':
                // ⭐ ИСПРАВЛЕНИЕ: Используем правильный метод MapSystem
                if (this.systems.map) {
                    this.systems.map.setCurrentHero(this.currentHero);
                    this.systems.map.showOverlay('tactical-map');
                } else {
                    container.innerHTML = '<div class="map-error">Система карт не загружена</div>';
                }
                break;

            case 'inventory':
                container.innerHTML = this.systems.equipment.showInventory();
                break;

            case 'shop':
                const currentCategory = this.systems.equipment.currentCategory || 'all';
                const currentSubcategory = this.systems.equipment.currentSubcategory || 'all';
                container.innerHTML = this.systems.equipment.showShop(currentCategory, currentSubcategory);
                
                setTimeout(() => this.attachShopItemHandlers(), 100);
                break;
        }

        container.style.display = 'block';
    }

    attachShopItemHandlers() {
        const shopItems = document.querySelectorAll('.shop-item');
        console.log(`Найдено предметов в магазине: ${shopItems.length}`);
        
        shopItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = item.getAttribute('data-item-id');
                console.log(`Клик по предмету ID: ${itemId}`);
                if (itemId) {
                    this.showItemDetailModal(parseInt(itemId));
                }
            });
        });
    }

    showItemDetailModal(itemId) {
        console.log(`Открываем модалку для предмета ID: ${itemId}`);
        const item = this.systems.equipment.getItemById(itemId);
        if (!item) {
            console.error(`Предмет с ID ${itemId} не найден!`);
            return;
        }

        const canBuy = this.currentHero.gold >= item.price;
        const isOwned = this.systems.equipment.isItemOwned(itemId);

        const modalHTML = `
            <div class="item-detail-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4>🔍 Детали предмета</h4>
                        <button class="close-modal" onclick="game.closeItemDetailModal()">✕</button>
                    </div>
                    <div class="item-detail-content">
                        <div class="item-detail-image">
                            <div class="detail-item-background rarity-${item.rarity || 'common'}">
                                <img src="${item.image}" alt="${item.name}" 
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
                                     class="item-detail-image-zoom">
                                <div class="item-fallback-large" style="display: none;">
                                    <span>${this.getItemIcon(item.type)}</span>
                                </div>
                            </div>
                            <div class="item-rarity ${item.rarity || 'common'}">
                                ${this.getRarityName(item.rarity)}
                            </div>
                        </div>
                        
                        <div class="item-detail-info">
                            <div class="item-name rarity-${item.rarity || 'common'}">${item.name}</div>
                            <div class="item-type">${this.getItemTypeName(item.type)}</div>
                            
                            <div class="item-description">
                                <p>${item.description || 'Описание отсутствует.'}</p>
                            </div>
                            
                            ${item.flavorText ? `
                                <div class="item-flavor">
                                    "${item.flavorText}"
                                </div>
                            ` : ''}
                            
                            ${item.bonus && item.bonus.type !== 'none' ? `
                                <div class="item-bonus-info">
                                    <h5>🎯 Бонус предмета:</h5>
                                    <div class="bonus-display">
                                        ${this.systems.equipment.formatBonus(item.bonus)}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="item-stats-detailed">
                                <h5>📊 Характеристики</h5>
                                ${item.stats ? Object.entries(item.stats).map(([key, value]) => `
                                    <div class="stat-line">
                                        <span>${this.getStatLabel(key)}</span>
                                        <span class="stat-value">+${value}</span>
                                    </div>
                                `).join('') : ''}
                                ${item.fixed_damage ? `<div class="stat-line"><span>⚔️ Урон:</span> <span class="stat-value">+${item.fixed_damage}</span></div>` : ''}
                                ${item.fixed_armor ? `<div class="stat-line"><span>🛡️ Броня:</span> <span class="stat-value">+${item.fixed_armor}</span></div>` : ''}
                                ${item.fixed_health ? `<div class="stat-line"><span>❤️ Здоровье:</span> <span class="stat-value">+${item.fixed_health}</span></div>` : ''}
                            </div>
                            
                            ${item.setName && this.systems.equipment.itemSets[item.setName] ? `
                                <div class="item-set-details">
                                    <h5>✨ Бонус сета:</h5>
                                    <div class="set-info">
                                        <strong>${this.systems.equipment.itemSets[item.setName].name}</strong>
                                        <div class="set-bonus">${this.systems.equipment.formatBonus(this.systems.equipment.itemSets[item.setName].bonus)}</div>
                                        <div class="set-description">${this.systems.equipment.itemSets[item.setName].description}</div>
                                        <div class="set-requirements">Требуется предметов: ${this.systems.equipment.itemSets[item.setName].requiredPieces}/6</div>
                                    </div>
                                </div>
                            ` : ''}
                            
                            ${item.requirements ? `
                                <div class="item-requirements">
                                    <h5>⚡ Требования</h5>
                                    ${Object.entries(item.requirements).map(([key, value]) => `
                                        <div class="stat-line">
                                            <span>${this.getRequirementLabel(key)}</span>
                                            <span class="stat-value">${value}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : ''}
                            
                            <div class="item-actions">
                                <div class="price-section">
                                    <span class="buy-price">💰 ${item.price} золота</span>
                                    ${item.sellPrice ? `<span class="sell-price">💸 ${item.sellPrice} золота</span>` : ''}
                                </div>
                                
                                ${!isOwned ? `
                                    <button class="btn-primary ${!canBuy ? 'disabled' : ''}" 
                                            onclick="game.buyItemFromModal(${itemId})" 
                                            ${!canBuy ? 'disabled' : ''}>
                                        🛒 Купить
                                    </button>
                                    ${!canBuy ? `
                                        <div class="purchase-error">
                                            ❌ Недостаточно золота
                                        </div>
                                    ` : ''}
                                ` : `
                                    <button class="btn-primary owned" disabled>
                                        ✅ Уже куплено
                                    </button>
                                `}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const container = document.getElementById('overlay-container');
        if (container) {
            container.innerHTML = modalHTML;
            
            setTimeout(() => {
                const zoomableImage = document.querySelector('.item-detail-image-zoom');
                if (zoomableImage) {
                    zoomableImage.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.showZoomedImage(item.image, item.name);
                    });
                }
            }, 100);
        }
    }

    showZoomedImage(imageSrc, itemName) {
        const zoomOverlay = document.createElement('div');
        zoomOverlay.className = 'item-image-zoom-overlay';
        
        zoomOverlay.innerHTML = `
            <div class="close-zoom" onclick="this.parentElement.remove()">×</div>
            <img src="${imageSrc}" alt="${itemName}" class="item-image-zoomed"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
        `;
        
        zoomOverlay.addEventListener('click', (e) => {
            if (e.target === zoomOverlay) {
                zoomOverlay.remove();
            }
        });
        
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                zoomOverlay.remove();
                document.removeEventListener('keydown', handleKeyDown);
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        document.body.appendChild(zoomOverlay);
    }

    buyItemFromModal(itemId) {
        const item = this.systems.equipment.getItemById(itemId);
        if (!item) return;

        if (this.currentHero.gold >= item.price) {
            this.currentHero.gold -= item.price;
            this.systems.equipment.addItemToInventory(itemId);
            
            this.saveGame();
            
            this.showNotification(`✅ Предмет "${item.name}" куплен!`, 'success');
            this.closeItemDetailModal();
            
            this.refreshShop();
            
        } else {
            this.showNotification('❌ Недостаточно золота!', 'error');
        }
    }

    closeItemDetailModal() {
        const container = document.getElementById('overlay-container');
        if (container && this.systems.equipment) {
            const currentCategory = this.systems.equipment.currentCategory || 'all';
            const currentSubcategory = this.systems.equipment.currentSubcategory || 'all';
            container.innerHTML = this.systems.equipment.showShop(currentCategory, currentSubcategory);
            setTimeout(() => this.attachShopItemHandlers(), 100);
        }
    }

    hideOverlay() {
        const container = document.getElementById('overlay-container');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
            this.activeOverlay = null;
        }
    }

    showEquipmentForSlot(slot) {
        this.showOverlay('inventory');
        setTimeout(() => {
            const inventoryOverlay = document.querySelector('.inventory-overlay');
            if (inventoryOverlay) {
                const filterInfo = document.createElement('div');
                filterInfo.className = 'filter-info';
                filterInfo.innerHTML = `
                    <strong>🎯 Выбор предмета для: ${this.getSlotName(slot)}</strong>
                    <div>Показаны только подходящие предметы</div>
                `;
                const overlayBody = inventoryOverlay.querySelector('.overlay-body');
                if (overlayBody) {
                    overlayBody.insertBefore(filterInfo, overlayBody.firstChild);
                }
            }
        }, 100);
    }

    // ========== СИСТЕМА УВЕДОМЛЕНИЙ ==========
    showNotification(message, type = 'info') {
        const existingNotifications = document.querySelectorAll('.game-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `game-notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">OK</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    getRaceName(race) {
        const races = {
            'human': 'Человек',
            'elf': 'Эльф',
            'dwarf': 'Гном',
            'ork': 'Орк',
            'laitar': 'Лайтар',
            'dragon': 'Дракон',
            'fairy': 'Фея',
            'halfling': 'Полурослик'
        };
        return races[race] || race;
    }

    getClassName(className) {
        const classes = {
            'warrior': 'Воин',
            'hunter': 'Охотник',
            'mage': 'Маг',
            'bounty_hunter': 'Охотник за головами',
            'merchant': 'Торговец',
            'thief': 'Вор',
            'fighter': 'Кулачный боец',
            'antiquarian': 'Искатель древностей',
            'death_mage': 'Волхв смерти',
            'sorcerer': 'Колдун',
            'archer': 'Лучник',
            'healer': 'Знахарь',
            'gladiator': 'Гладиатор',
            'blacksmith': 'Кузнец'
        };
        return classes[className] || className;
    }

    getSagaName(saga) {
        const sagas = {
            'golden_egg': 'Золотое Яйцо',
            'vulkanor': 'Вулканор',
            'well': 'Колодец',
            'pets': 'Питомец',
            'following_sun': 'Вслед за солнцем',
            'vampire_crown': 'Корона вампиров',
            'tiger_eye': 'Желтый Глаз тигра',
            'sky_phenomena': 'Небесные явления'
        };
        return sagas[saga] || saga;
    }

    getSlotIcon(slot) {
        const icons = {
            'main_hand': '⚔️',
            'off_hand': '🛡️',
            'helmet': '⛑️',
            'chest': '👕',
            'gloves': '🧤',
            'legs': '👖',
            'boots': '👢'
        };
        return icons[slot] || '📦';
    }

    getSlotName(slot) {
        const names = {
            'main_hand': 'Правая рука',
            'off_hand': 'Левая рука',
            'helmet': 'Шлем',
            'chest': 'Доспех',
            'gloves': 'Перчатки',
            'legs': 'Поножи',
            'boots': 'Ботинки'
        };
        return names[slot] || slot;
    }

    getItemTypeName(type) {
        const names = {
            'weapon': 'Оружие',
            'armor': 'Броня',
            'potion': 'Зелье',
            'scroll': 'Свиток', 
            'misc': 'Предмет'
        };
        return names[type] || type;
    }

    getStatLabel(stat) {
        const labels = {
            'health': 'Здоровье',
            'damage': 'Урон',
            'armor': 'Защита',
            'speed': 'Скорость',
            'magic': 'Магия',
            'strength': 'Сила',
            'agility': 'Ловкость', 
            'intelligence': 'Интеллект'
        };
        return labels[stat] || stat;
    }

    getItemIcon(itemType) {
        const icons = {
            'weapon': '⚔️',
            'armor': '🛡️',
            'potion': '🧪',
            'scroll': '📜',
            'misc': '📦'
        };
        return icons[itemType] || '📦';
    }

    getRarityName(rarity) {
        const names = {
            'common': 'Обычный',
            'uncommon': 'Необычный',
            'rare': 'Редкий',
            'epic': 'Эпический',
            'legendary': 'Легендарный',
            'mythic': 'Мифический'
        };
        return names[rarity] || 'Обычный';
    }

    getRequirementLabel(requirement) {
        const labels = {
            'level': 'Уровень',
            'strength': 'Сила',
            'agility': 'Ловкость',
            'intelligence': 'Интеллект'
        };
        return labels[requirement] || requirement;
    }

    showMainMenu() {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="main-screen">
                <header class="game-header">
                    <h1>🎮 TIGRIMION RPG</h1>
                    <p class="game-subtitle">Модульная RPG система</p>
                </header>
                
                <div class="main-actions">
                    <button class="btn-primary" onclick="game.showHeroSelection()">
                        🚀 Начать игру
                    </button>
                    <button class="btn-secondary" onclick="game.showDebugInfo()">
                        🐛 Информация о системе
                    </button>
                </div>
            </div>
        `;
    }

    // ========== ОТЛАДОЧНЫЕ МЕТОДЫ ДЛЯ КАРТ ==========
    debugMapSystem() {
        if (this.systems.map) {
            const status = this.systems.map.checkSystemStatus();
            console.log("=== MAP SYSTEM DEBUG ===", status);
            
            if (!status.currentHero) {
                console.error("❌ Герой не установлен в MapSystem!");
            }
            if (!status.currentTacticalMap) {
                console.error("❌ Текущая тактическая карта не установлена!");
            }
            if (status.tacticalMaps === 0) {
                console.error("❌ Нет загруженных тактических карт!");
            }
            
            return status;
        } else {
            console.error("❌ MapSystem не инициализирован!");
            return null;
        }
    }

    showDebugInfo() {
        console.log("=== ДЕБАГ ИНФОРМАЦИЯ ===");
        console.log("Загруженные модули:", this.moduleLoader.loadedModules);
        console.log("Системы:", this.systems);
        console.log("Текущий герой:", this.currentHero);
        
        // Добавляем отладку карт
        this.debugMapSystem();
        
        if (this.currentHero) {
            const stats = this.calculateHeroStats();
            console.log("Характеристики героя:", stats);
            console.log("Инвентарь:", this.currentHero.inventory);
            console.log("Экипировка:", this.currentHero.equipment);
        }
        
        const save = localStorage.getItem('tigrimionSave');
        if (save) {
            const data = JSON.parse(save);
            console.log("Данные в сохранении:", data);
        } else {
            console.log("Сохранение не найдено");
        }
        
        alert("Информация выведена в консоль (F12)");
    }

    panic(error) {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="error-screen">
                <div class="error-content">
                    <h1>🚨 КРИТИЧЕСКАЯ ОШИБКА</h1>
                    <div class="error-details">
                        <strong>Сообщение:</strong> ${error.message}
                    </div>
                    <div class="error-stack">
                        <strong>Стек:</strong> ${error.stack}
                    </div>
                    <div class="error-actions">
                        <button onclick="location.reload()" class="btn-reload">
                            🔄 Перезагрузить игру
                        </button>
                        <button onclick="game.showMainMenu()" class="btn-main-menu">
                            🏠 В главное меню
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        console.error("💀 ПАНИКА:", error);
    }

    refreshShop() {
        const container = document.getElementById('overlay-container');
        if (container && this.activeOverlay === 'shop') {
            const currentCategory = this.systems.equipment.currentCategory || 'all';
            const currentSubcategory = this.systems.equipment.currentSubcategory || 'all';
            container.innerHTML = this.systems.equipment.showShop(currentCategory, currentSubcategory);
            setTimeout(() => this.attachShopItemHandlers(), 100);
        }
    }

    updateLoadingProgress(percent, message) {
        const progress = document.getElementById('loadingProgress');
        const status = document.getElementById('moduleStatus');
        
        if (progress) progress.style.width = percent + '%';
        if (status) status.textContent = message;
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ИГРЫ ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log("🎮 Запуск Tigrimion RPG...");
    window.game = new SafeHeroGame();
});

// ========== ГЛОБАЛЬНЫЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// ========== ПОЛИФИЛЛЫ ДЛЯ СТАРЫХ БРАУЗЕРОВ ==========
if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
        if (typeof start !== 'number') {
            start = 0;
        }
        if (start + search.length > this.length) {
            return false;
        }
        return this.indexOf(search, start) !== -1;
    };
}

if (!Array.prototype.includes) {
    Array.prototype.includes = function(searchElement, fromIndex) {
        if (this == null) {
            throw new TypeError('Array.prototype.includes called on null or undefined');
        }
        var O = Object(this);
        var len = O.length >>> 0;
        if (len === 0) {
            return false;
        }
        var n = fromIndex | 0;
        var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
        while (k < len) {
            if (O[k] === searchElement) {
                return true;
            }
            k++;
        }
        return false;
    };
}
