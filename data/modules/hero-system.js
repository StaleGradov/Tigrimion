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

        this.addHeroSelectionStyles();
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
        
        this.showHeroGameScreen();
    }

    showHeroGameScreen() {
        if (!this.currentHero) return;

        const app = document.getElementById('app');
        const stats = this.calculateHeroStats(this.currentHero);
        const bonuses = window.game.systems.bonus.getAllActiveBonuses(this.currentHero);
        
        // Получаем отрисованные карты из MapSystem
        const globalMapHTML = window.game.systems.map ? 
            window.game.systems.map.renderGlobalMap() : 
            '<div class="map-placeholder">Глобальная карта<br><small>(Модуль карт загружается...)</small></div>';
        
        const localMapHTML = window.game.systems.map ? 
            window.game.systems.map.renderLocalMap() : 
            '<div class="map-placeholder">Локальная карта<br><small>(Модуль карт загружается...)</small></div>';
        
        const tacticalMapHTML = window.game.systems.map ? 
            window.game.systems.map.renderTacticalMap() : 
            '<div class="map-placeholder">Тактическая карта<br><small>(Модуль карт загружается...)</small></div>';

        app.innerHTML = `
            <div class="hero-game-screen">
                <!-- Верхняя панель действий -->
                <div class="action-buttons-top">
                    <button class="btn-primary" onclick="game.systems.map.startAdventure()">🎲 Путешествие</button>
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
                                 class="hero-portrait">
                            
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
                                            <div class="bonus-item">${window.game.systems.bonus.getBonusIcon(bonus.type)} +${Math.round(bonus.value * 100)}%</div>
                                        `).join('')}
                                    </div>
                                ` : ''}
                            </div>

                            <!-- Экипировка -->
                            <div class="equipment-preview">
                                <h4>🎒 Экипировка</h4>
                                <div class="equipment-slots">
                                    ${Object.entries(this.currentHero.equipment).map(([slot, itemId]) => {
                                        const item = itemId ? window.game.systems.equipment.getItemById(itemId) : null;
                                        return `
                                            <div class="equipment-slot ${slot} ${item ? 'equipped' : 'empty'}"
                                                 onclick="game.systems.hero.showInventory('${slot}')">
                                                ${item ? '✅' : this.getSlotIcon(slot)}
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
                        <div class="log-entry">Добро пожаловать в игру!</div>
                    </div>
                </div>
            </div>
        `;

        // Инжектим стили карт если MapSystem доступен
        if (window.game.systems.map) {
            window.game.systems.map.injectMapStyles();
        }
        
        this.addHeroGameStyles();
    }

    showInventory(targetSlot = null) {
        if (!this.currentHero) return;

        const app = document.getElementById('app');
        const equipmentSystem = window.game.systems.equipment;
        
        let filteredItems = this.currentHero.inventory;
        let filterInfo = '';
        
        if (targetSlot) {
            filteredItems = equipmentSystem.getItemsForSlot(targetSlot, this.currentHero.equipment);
            filterInfo = `
                <div class="inventory-filter-info">
                    <strong>🎯 Выбор для: ${this.getSlotName(targetSlot)}</strong>
                    <small>${filteredItems.length} подходящих предметов</small>
                </div>
            `;
        }

        const inventoryHTML = filteredItems.map(itemId => {
            const item = equipmentSystem.getItemById(itemId);
            if (!item) return '';
            
            const isEquipped = Object.values(this.currentHero.equipment).includes(itemId);
            
            return `
                <div class="inventory-item" onclick="game.systems.equipment.equipItem(${itemId})">
                    <div class="item-image">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="item-info">
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
                    ${inventoryHTML || '<div class="empty-inventory">Инвентарь пуст</div>'}
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

        this.addInventoryStyles();
    }

    // ... остальные методы (calculateHeroStats, getRaceName, и т.д.) ...

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

    addHeroGameStyles() {
        const styles = `
            .hero-game-screen {
                padding: 1rem;
                background: #1f2937;
                color: white;
                min-height: 100vh;
            }
            
            .action-buttons-top {
                display: flex;
                gap: 0.5rem;
                margin-bottom: 1rem;
                flex-wrap: wrap;
            }
            
            .btn-primary, .btn-secondary, .btn-danger {
                padding: 10px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 0.9rem;
                transition: all 0.3s ease;
            }
            
            .btn-primary { background: #10b981; color: white; }
            .btn-secondary { background: #6b7280; color: white; }
            .btn-danger { background: #ef4444; color: white; }
            
            .hero-main-layout {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1fr;
                gap: 1rem;
                margin-bottom: 2rem;
            }
            
            .layout-column {
                background: #374151;
                border-radius: 10px;
                padding: 1rem;
                min-height: 500px;
            }
            
            .column-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1rem;
                padding-bottom: 0.5rem;
                border-bottom: 1px solid #4b5563;
            }
            
            .hero-portrait {
                width: 100%;
                max-width: 200px;
                border-radius: 10px;
                margin-bottom: 1rem;
            }
            
            .health-bar {
                width: 100%;
                height: 20px;
                background: #4b5563;
                border-radius: 10px;
                overflow: hidden;
                margin: 0.5rem 0;
            }
            
            .health-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #ef4444, #f59e0b);
                transition: width 0.3s ease;
            }
            
            .hero-main-stats {
                display: flex;
                justify-content: space-around;
                margin: 1rem 0;
            }
            
            .main-stat {
                text-align: center;
            }
            
            .equipment-slots {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 0.5rem;
                margin-top: 0.5rem;
            }
            
            .equipment-slot {
                aspect-ratio: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #4b5563;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1.2rem;
            }
            
            .equipment-slot:hover {
                background: #6b7280;
            }
            
            .game-log {
                background: #374151;
                padding: 1rem;
                border-radius: 10px;
                max-height: 150px;
                overflow-y: auto;
            }
        `;
        
        this.injectStyles(styles);
    }

    addInventoryStyles() {
        const styles = `
            .inventory-screen {
                padding: 2rem;
                background: #1f2937;
                color: white;
                min-height: 100vh;
            }
            
            .inventory-stats {
                display: flex;
                gap: 1rem;
            }
            
            .inventory-filter-info {
                background: #3b82f6;
                padding: 1rem;
                border-radius: 8px;
                margin: 1rem 0;
                text-align: center;
            }
            
            .inventory-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 1rem;
                margin: 2rem 0;
            }
            
            .inventory-item {
                background: #374151;
                padding: 1rem;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.3s ease;
                border: 2px solid #4b5563;
            }
            
            .inventory-item:hover {
                border-color: #3b82f6;
                transform: translateY(-2px);
            }
            
            .item-image img {
                width: 50px;
                height: 50px;
                border-radius: 8px;
                margin-bottom: 0.5rem;
            }
            
            .equipped-badge {
                color: #10b981;
                font-weight: bold;
                margin-top: 0.5rem;
            }
            
            .empty-inventory {
                grid-column: 1 / -1;
                text-align: center;
                padding: 2rem;
                background: #4b5563;
                border-radius: 10px;
                opacity: 0.7;
            }
        `;
        
        this.injectStyles(styles);
    }

    injectStyles(css) {
        const style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }
}

// Регистрируем систему в глобальной области
window.HeroSystem = HeroSystem;
console.log("📦 HeroSystem модуль загружен");
