// ========== MODULE: HeroSystem ==========
class HeroSystem {
    constructor() {
        this.heroes = [];
        this.currentHero = null;
        console.log("✅ HeroSystem инициализирован");
    }

    async loadHeroData() {
        try {
            console.log("📥 Загружаем данные героев...");
            
            const response = await fetch('data/heroes.json');
            if (!response.ok) {
                throw new Error(`Ошибка загрузки heroes.json: ${response.status}`);
            }
            
            this.heroes = await response.json();
            
            if (this.heroes.length > 0) {
                const firstHero = this.heroes.find(h => h.id === 1);
                if (firstHero) {
                    firstHero.unlocked = true;
                }
            }
            
            console.log(`✅ Загружено героев: ${this.heroes.length}`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных героев:", error);
            this.createFallbackHero();
            return true;
        }
    }

    createFallbackHero() {
        this.heroes = [{
            id: 1,
            name: "Начальный герой",
            image: "images/heroes/hero1.jpg",
            race: "human",
            class: "warrior",
            saga: "golden_egg",
            baseHealth: 100,
            baseDamage: 20,
            baseArmor: 10,
            gold: 500.00,
            level: 1,
            experience: 0,
            monstersKilled: 0,
            deaths: 0,
            healthRegen: 100/60,
            inventory: [],
            equipment: {
                main_hand: null,
                off_hand: null,
                helmet: null,
                chest: null,
                gloves: null,
                legs: null,
                boots: null
            },
            unlocked: true,
            story: "Простой воин из далекой деревни..."
        }];
        
        console.log("🔄 Создан тестовый герой");
    }

    calculateHeroStats(hero = null) {
        const targetHero = hero || this.currentHero;
        if (!targetHero) return {};
        
        // Базовая логика расчета характеристик
        const levelMultiplier = 1 + (targetHero.level - 1) * 0.1;
        
        let health = Math.round(targetHero.baseHealth * levelMultiplier);
        let damage = Math.round(targetHero.baseDamage * levelMultiplier);
        let armor = Math.round(targetHero.baseArmor * levelMultiplier);
        
        // Применяем бонусы от экипировки
        if (window.game && window.game.systems.bonus) {
            const totals = window.game.systems.bonus.calculateTotalBonuses(targetHero);
            
            health += targetHero.baseHealth * totals.health_mult;
            damage += targetHero.baseDamage * totals.damage_mult;
            armor += targetHero.baseArmor * totals.armor_mult;
            
            // ФИКСИРОВАННЫЕ характеристики от экипировки
            Object.values(targetHero.equipment).forEach(itemId => {
                if (itemId && window.game.systems.equipment) {
                    const item = window.game.systems.equipment.getItemById(itemId);
                    if (item) {
                        damage += item.fixed_damage || 0;
                        armor += item.fixed_armor || 0;
                        health += item.fixed_health || 0;
                    }
                }
            });
        }
        
        const power = Math.round((health / 10) + (damage * 1.5) + (armor * 2));
        const currentHealth = this.getCurrentHealthForDisplay(targetHero);
        
        return {
            health: Math.round(health),
            currentHealth: Math.floor(currentHealth),
            maxHealth: Math.round(health),
            damage: Math.round(damage),
            armor: Math.round(armor),
            power: power
        };
    }

    getCurrentHealthForDisplay(hero = null) {
        const targetHero = hero || this.currentHero;
        if (!targetHero) return 0;
        
        if (!targetHero.currentHealth) {
            const stats = this.calculateHeroStats(targetHero);
            targetHero.currentHealth = stats.maxHealth;
        }
        
        return targetHero.currentHealth;
    }

    getRaceName(race) {
        const races = {
            'human': 'Человек',
            'elf': 'Эльф',
            'dwarf': 'Гном',
            'ork': 'Орк'
        };
        return races[race] || race;
    }

    getClassName(className) {
        const classes = {
            'warrior': 'Воин',
            'hunter': 'Охотник',
            'mage': 'Маг'
        };
        return classes[className] || className;
    }

    getSagaName(saga) {
        const sagas = {
            'golden_egg': 'Золотое Яйцо',
            'vulkanor': 'Вулканор'
        };
        return sagas[saga] || saga;
    }

    showHeroSelection() {
        const app = document.getElementById('app');
        if (!app) return;

        const heroesHTML = this.heroes.map(hero => {
            const isUnlocked = hero.id === 1 ? true : (hero.unlocked || false);
            const stats = this.calculateHeroStats(hero);
            
            return `
                <div class="hero-option ${isUnlocked ? '' : 'locked'}" 
                     onclick="${isUnlocked ? `game.systems.hero.selectHero(${hero.id})` : ''}">
                    <div class="hero-option-image">
                        <img src="${hero.image}" alt="${hero.name}" 
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                        ${!isUnlocked ? '<div class="locked-overlay">🔒</div>' : ''}
                    </div>
                    <div class="hero-option-info">
                        <div class="hero-option-header">
                            <strong>${hero.name}</strong>
                            <span class="hero-level">Ур. ${hero.level}</span>
                        </div>
                        <div class="hero-option-stats">
                            <div class="stat-row">
                                <span>❤️ ${stats.health}</span>
                                <span>⚔️ ${stats.damage}</span>
                                <span>🛡️ ${stats.armor}</span>
                            </div>
                            <div class="stat-row">
                                <span>💰 ${hero.gold.toFixed(2)}</span>
                                <span>🌟 ${stats.power}</span>
                            </div>
                        </div>
                        <div class="hero-option-details">
                            <div>🧬 ${this.getRaceName(hero.race)}</div>
                            <div>⚔️ ${this.getClassName(hero.class)}</div>
                            <div>📖 ${this.getSagaName(hero.saga)}</div>
                        </div>
                        ${!isUnlocked ? 
                            '<small class="locked-text">Требуется уровень: ' + (hero.id * 5) + '</small>' : 
                            '<small class="select-text">Кликните для выбора</small>'
                        }
                    </div>
                </div>
            `;
        }).join('');

        app.innerHTML = `
            <div class="hero-select-screen">
                <header class="screen-header">
                    <h1>🎯 Выберите героя</h1>
                    <p>Выберите героя для начала приключения</p>
                </header>
                
                <div class="heroes-grid">
                    ${heroesHTML}
                </div>
                
                <div class="screen-actions">
                    <button class="btn-secondary" onclick="game.renderMainScreen()">
                        ← Назад в меню
                    </button>
                </div>
            </div>
        `;
    }

    selectHero(heroId) {
        const hero = this.heroes.find(h => h.id === heroId);
        if (!hero) {
            console.error('Герой не найден:', heroId);
            return;
        }

        const isUnlocked = hero.id === 1 ? true : (hero.unlocked || false);
        if (!isUnlocked) {
            console.log('Герой заблокирован:', hero.name);
            return;
        }

        this.currentHero = hero;
        console.log(`🎯 Выбран герой: ${hero.name}`);
        
        // Сохраняем в основной игре
        if (window.game) {
            window.game.currentHero = hero;
        }
        
        this.showHeroGameScreen();
    }

    showHeroGameScreen() {
        if (!this.currentHero) return;

        const app = document.getElementById('app');
        const stats = this.calculateHeroStats(this.currentHero);
        
        // Получаем бонусы если система доступна
        let bonuses = { race: [], class: [], saga: [], equipment: [], sets: [] };
        if (window.game && window.game.systems.bonus) {
            bonuses = window.game.systems.bonus.getAllActiveBonuses(this.currentHero);
        }
        
        // Получаем отрисованные карты из MapSystem
        const globalMapHTML = window.game && window.game.systems.map ? 
            window.game.systems.map.renderGlobalMap() : 
            '<div class="map-placeholder">🗺️ Глобальная карта<br><small>(Модуль карт загружается...)</small></div>';
        
        const localMapHTML = window.game && window.game.systems.map ? 
            window.game.systems.map.renderLocalMap() : 
            '<div class="map-placeholder">📍 Локальная карта<br><small>(Модуль карт загружается...)</small></div>';
        
        const tacticalMapHTML = window.game && window.game.systems.map ? 
            window.game.systems.map.renderTacticalMap() : 
            '<div class="map-placeholder">🎲 Тактическая карта<br><small>(Модуль карт загружается...)</small></div>';

        app.innerHTML = `
            <div class="hero-game-screen">
                <!-- Верхняя панель действий -->
                <div class="action-buttons-top">
                    <button class="btn-primary" onclick="game.startAdventure()">🎲 Путешествие</button>
                    <button class="btn-secondary" onclick="game.systems.hero.showInventory()">🎒 Инвентарь</button>
                    <button class="btn-secondary" onclick="game.systems.equipment.showMerchant()">🏪 Магазин</button>
                    <button class="btn-danger" onclick="game.systems.hero.resetHero()">🔄 Сброс</button>
                    <button class="btn-secondary" onclick="game.systems.hero.showHeroSelection()">🔁 Герои</button>
                </div>

                <!-- Основной layout с 4 колонками -->
                <div class="hero-main-layout">
                    <!-- Колонка 1: Герой -->
                    <div class="layout-column hero-column">
                        <div class="column-header">
                            <h3>🎯 ${this.currentHero.name}</h3>
                            <div class="hero-quick-info">
                                <span>💰 ${this.currentHero.gold.toFixed(2)}</span>
                                <span>⚡ Ур. ${this.currentHero.level}</span>
                            </div>
                        </div>
                        
                        <div class="hero-display">
                            <img src="${this.currentHero.image}" alt="${this.currentHero.name}" 
                                 class="hero-portrait"
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                            
                            <!-- Здоровье -->
                            <div class="health-display">
                                <div class="health-bar">
                                    <div class="health-bar-fill" style="width: ${(stats.currentHealth / stats.maxHealth) * 100}%"></div>
                                </div>
                                <div class="health-text">
                                    ❤️ ${stats.currentHealth}/${stats.maxHealth}
                                </div>
                            </div>

                            <!-- Основные характеристики -->
                            <div class="hero-main-stats">
                                <div class="main-stat">
                                    <span class="stat-icon">⚔️</span>
                                    <span class="stat-value">${stats.damage}</span>
                                </div>
                                <div class="main-stat">
                                    <span class="stat-icon">🛡️</span>
                                    <span class="stat-value">${stats.armor}</span>
                                </div>
                                <div class="main-stat">
                                    <span class="stat-icon">🌟</span>
                                    <span class="stat-value">${stats.power}</span>
                                </div>
                            </div>

                            <!-- Бонусы -->
                            <div class="bonuses-section">
                                <h4>🎯 Активные бонусы</h4>
                                ${bonuses.race.length > 0 ? `
                                    <div class="bonus-group">
                                        <strong>🧬 ${this.getRaceName(this.currentHero.race)}</strong>
                                        ${bonuses.race.map(bonus => `
                                            <div class="bonus-item">${this.getBonusIcon(bonus.type)} +${Math.round(bonus.value * 100)}%</div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                ${bonuses.class.length > 0 ? `
                                    <div class="bonus-group">
                                        <strong>⚔️ ${this.getClassName(this.currentHero.class)}</strong>
                                        ${bonuses.class.map(bonus => `
                                            <div class="bonus-item">${this.getBonusIcon(bonus.type)} +${Math.round(bonus.value * 100)}%</div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                ${bonuses.sets.length > 0 ? `
                                    <div class="bonus-group">
                                        <strong>✨ Бонусы сетов</strong>
                                        ${bonuses.sets.map(bonus => `
                                            <div class="bonus-item">${this.getBonusIcon(bonus.type)} +${Math.round(bonus.value * 100)}%</div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                                ${bonuses.race.length === 0 && bonuses.class.length === 0 && bonuses.sets.length === 0 ? 
                                    '<div class="no-bonuses">Нет активных бонусов</div>' : ''}
                            </div>

                            <!-- Экипировка -->
                            <div class="equipment-preview">
                                <h4>🎒 Экипировка</h4>
                                <div class="equipment-slots">
                                    ${Object.entries(this.currentHero.equipment).map(([slot, itemId]) => {
                                        const item = itemId && window.game.systems.equipment ? 
                                            window.game.systems.equipment.getItemById(itemId) : null;
                                        return `
                                            <div class="equipment-slot ${slot} ${item ? 'equipped' : 'empty'}"
                                                 onclick="game.systems.hero.showInventory('${slot}')"
                                                 ${item ? `data-rarity="${item.rarity || 'common'}"` : ''}>
                                                <div class="equipment-icon">
                                                    ${item ? `<img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">` : this.getSlotIcon(slot)}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Колонка 2: Глобальная карта -->
                    <div class="layout-column global-map-column">
                        <div class="column-header">
                            <h3>🗺️ Глобальная карта</h3>
                        </div>
                        ${globalMapHTML}
                    </div>
                    
                    <!-- Колонка 3: Локальная карта -->
                    <div class="layout-column local-map-column">
                        <div class="column-header">
                            <h3>📍 Локальная карта</h3>
                        </div>
                        ${localMapHTML}
                    </div>
                    
                    <!-- Колонка 4: Тактическая карта -->
                    <div class="layout-column tactical-map-column">
                        <div class="column-header">
                            <h3>🎲 Тактическая карта</h3>
                        </div>
                        ${tacticalMapHTML}
                    </div>
                </div>
                
                <!-- Лог событий -->
                <div class="game-log" id="game-log">
                    <h4>📜 Журнал событий</h4>
                    <div class="log-entries">
                        <div class="log-entry">🎮 Добро пожаловать в игру! Выберите действие чтобы начать.</div>
                    </div>
                </div>
            </div>
        `;
    }

    getBonusIcon(bonusType) {
        const icons = {
            'health_mult': '❤️',
            'damage_mult': '⚔️',
            'armor_mult': '🛡️',
            'gold_mult': '💰',
            'health_regen_mult': '⚡',
            'crit_chance': '💥',
            'armor_penetration': '⚡',
            'vampirism': '🩸'
        };
        return icons[bonusType] || '🎯';
    }

    showInventory(targetSlot = null) {
        if (!this.currentHero) return;

        const app = document.getElementById('app');
        const equipmentSystem = window.game ? window.game.systems.equipment : null;
        
        let filteredItems = this.currentHero.inventory;
        let filterInfo = '';
        
        if (targetSlot && equipmentSystem) {
            filteredItems = equipmentSystem.getItemsForSlot(targetSlot, this.currentHero);
            filterInfo = `
                <div class="inventory-filter-info">
                    <strong>🎯 Выбор для: ${this.getSlotName(targetSlot)}</strong>
                    <small>${filteredItems.length} подходящих предметов</small>
                </div>
            `;
        }

        const inventoryHTML = filteredItems.map(itemId => {
            const item = equipmentSystem ? equipmentSystem.getItemById(itemId) : null;
            if (!item) return '';
            
            const isEquipped = Object.values(this.currentHero.equipment).includes(itemId);
            
            return `
                <div class="inventory-item" onclick="game.systems.equipment.equipItem(${itemId})" data-rarity="${item.rarity || 'common'}">
                    <div class="inventory-item-image">
                        <img src="${item.image}" alt="${item.name}" 
                             onerror="this.style.display='none'">
                    </div>
                    <div class="inventory-item-info">
                        <strong>${item.name}</strong>
                        <div class="item-stats">
                            ${item.fixed_damage ? `<span>⚔️ +${item.fixed_damage}</span>` : ''}
                            ${item.fixed_armor ? `<span>🛡️ +${item.fixed_armor}</span>` : ''}
                            ${item.fixed_health ? `<span>❤️ +${item.fixed_health}</span>` : ''}
                        </div>
                        <small>${item.description}</small>
                        ${isEquipped ? '<div class="equipped-badge">✅ Надето</div>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        app.innerHTML = `
            <div class="inventory-screen">
                <header class="screen-header">
                    <h2>🎒 Инвентарь</h2>
                    <div class="inventory-stats">
                        <span>💰 ${this.currentHero.gold.toFixed(2)}</span>
                        <span>📦 ${this.currentHero.inventory.length}/10</span>
                    </div>
                </header>
                
                ${filterInfo}
                
                <div class="inventory-grid">
                    ${inventoryHTML || '<div class="empty-inventory">📭 Инвентарь пуст</div>'}
                </div>
                
                <div class="screen-actions">
                    ${targetSlot ? `
                        <button class="btn-secondary" onclick="game.systems.hero.showInventory()">
                            📦 Показать все предметы
                        </button>
                    ` : ''}
                    <button class="btn-secondary" onclick="game.systems.hero.showHeroGameScreen()">
                        ← Назад к герою
                    </button>
                </div>
            </div>
        `;
    }

    resetHero() {
        if (!this.currentHero) return;
        
        if (!confirm("⚠️ Вы уверены что хотите сбросить героя?\n\nВсе характеристики, предметы и прогресс будут сброшены к базовым значениям.")) {
            return;
        }
        
        const baseConfig = {
            race: "human",
            class: "warrior", 
            saga: "golden_egg",
            baseHealth: 100,
            baseDamage: 20,
            baseArmor: 10,
            gold: 500.00,
            level: 1,
            experience: 0,
            monstersKilled: 0,
            deaths: 0,
            inventory: [],
            equipment: {
                main_hand: null,
                off_hand: null,
                helmet: null,
                chest: null,
                gloves: null,
                legs: null,
                boots: null
            }
        };
        
        const heroName = this.currentHero.name;
        const heroImage = this.currentHero.image;
        
        Object.assign(this.currentHero, baseConfig);
        this.currentHero.name = heroName;
        this.currentHero.image = heroImage;
        
        this.addToLog("🔄 Герой сброшен к базовым настройкам");
        this.showHeroGameScreen();
    }

    addToLog(message) {
        const log = document.getElementById('game-log');
        if (log) {
            const entries = log.querySelector('.log-entries');
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = message;
            entries.appendChild(entry);
            entries.scrollTop = entries.scrollHeight;
        }
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
            'chest': 'Нагрудник',
            'gloves': 'Перчатки',
            'legs': 'Поножи',
            'boots': 'Ботинки'
        };
        return names[slot] || slot;
    }
}

// Регистрируем систему в глобальной области
window.HeroSystem = HeroSystem;
console.log("📦 HeroSystem модуль загружен");
