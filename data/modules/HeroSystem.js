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
            
            // Загружаем heroes.json
            const response = await fetch('data/heroes.json');
            if (!response.ok) {
                throw new Error(`Ошибка загрузки heroes.json: ${response.status}`);
            }
            
            this.heroes = await response.json();
            
            // Разблокируем первого героя по умолчанию
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
            // Создаем тестового героя при ошибке
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
                        ← Назад
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
        
        // Переходим к главному игровому экрану
        this.showHeroGameScreen();
    }

    showHeroGameScreen() {
        if (!this.currentHero) return;

        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="hero-game-screen">
                <header class="game-header">
                    <h1>🎮 ${this.currentHero.name}</h1>
                    <div class="hero-quick-stats">
                        <span>💰 ${this.currentHero.gold.toFixed(2)}</span>
                        <span>⚡ Ур. ${this.currentHero.level}</span>
                        <span>❤️ ${this.calculateHeroStats().health}</span>
                    </div>
                </header>
                
                <div class="hero-main-layout">
                    <!-- Здесь будут 4 колонки: Герой, Глобальная карта, Локальная карта, Тактическая карта -->
                    <div class="layout-column hero-column">
                        <h3>🎯 Герой</h3>
                        <div class="hero-display">
                            <img src="${this.currentHero.image}" alt="${this.currentHero.name}" 
                                 class="hero-portrait">
                            <div class="hero-stats">
                                <div>⚔️ Урон: ${this.calculateHeroStats().damage}</div>
                                <div>🛡️ Броня: ${this.calculateHeroStats().armor}</div>
                                <div>❤️ Здоровье: ${this.calculateHeroStats().health}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="layout-column global-map-column">
                        <h3>🗺️ Глобальная карта</h3>
                        <div class="map-placeholder">
                            Глобальная карта<br>
                            <small>(Модуль карт загружается...)</small>
                        </div>
                    </div>
                    
                    <div class="layout-column local-map-column">
                        <h3>📍 Локальная карта</h3>
                        <div class="map-placeholder">
                            Локальная карта<br>
                            <small>(Модуль карт загружается...)</small>
                        </div>
                    </div>
                    
                    <div class="layout-column tactical-map-column">
                        <h3>🎲 Тактическая карта</h3>
                        <div class="map-placeholder">
                            Тактическая карта<br>
                            <small>(Модуль карт загружается...)</small>
                        </div>
                    </div>
                </div>
                
                <div class="game-actions">
                    <button class="btn-primary" onclick="game.systems.hero.showHeroSelection()">
                        🔁 Сменить героя
                    </button>
                    <button class="btn-secondary" onclick="game.renderMainScreen()">
                        🏠 Главное меню
                    </button>
                </div>
            </div>
        `;

        this.addHeroGameStyles();
    }

    calculateHeroStats() {
        if (!this.currentHero) return { health: 0, damage: 0, armor: 0 };
        
        // Базовая логика расчета характеристик
        // Позже будет интегрирована с BonusSystem
        const levelMultiplier = 1 + (this.currentHero.level - 1) * 0.1;
        
        return {
            health: Math.round(this.currentHero.baseHealth * levelMultiplier),
            damage: Math.round(this.currentHero.baseDamage * levelMultiplier),
            armor: Math.round(this.currentHero.baseArmor * levelMultiplier)
        };
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

    addHeroSelectionStyles() {
        const styles = `
            .hero-select-screen {
                padding: 2rem;
                background: #1f2937;
                color: white;
                min-height: 100vh;
            }
            
            .heroes-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1rem;
                margin: 2rem 0;
            }
            
            .hero-option {
                background: #374151;
                border-radius: 10px;
                padding: 1rem;
                cursor: pointer;
                transition: all 0.3s ease;
                border: 2px solid #4b5563;
            }
            
            .hero-option:hover {
                border-color: #3b82f6;
                transform: translateY(-2px);
            }
            
            .hero-option.locked {
                opacity: 0.6;
                cursor: not-allowed;
            }
            
            .hero-option-image {
                position: relative;
                width: 100%;
                height: 200px;
                border-radius: 8px;
                overflow: hidden;
                margin-bottom: 1rem;
            }
            
            .hero-option-image img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .locked-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 3rem;
            }
            
            .hero-option-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.5rem;
            }
            
            .locked-text {
                color: #ef4444;
            }
            
            .select-text {
                color: #10b981;
            }
        `;
        
        this.injectStyles(styles);
    }

    addHeroGameStyles() {
        const styles = `
            .hero-game-screen {
                padding: 1rem;
                background: #1f2937;
                color: white;
                min-height: 100vh;
            }
            
            .hero-main-layout {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr 1fr;
                gap: 1rem;
                margin: 2rem 0;
            }
            
            .layout-column {
                background: #374151;
                border-radius: 10px;
                padding: 1rem;
                min-height: 400px;
            }
            
            .hero-portrait {
                width: 100%;
                max-width: 200px;
                border-radius: 10px;
                margin-bottom: 1rem;
            }
            
            .map-placeholder {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 300px;
                background: #4b5563;
                border-radius: 8px;
                text-align: center;
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
