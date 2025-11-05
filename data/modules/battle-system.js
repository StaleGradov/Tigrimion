// ========== MODULE: BattleSystem ==========
class BattleSystem {
    constructor() {
        this.monsters = [];
        this.battleActive = false;
        this.currentMonster = null;
        this.battleLog = [];
        this.battleRound = 0;
        console.log("✅ BattleSystem инициализирован");
    }

    async loadBattleData() {
        try {
            console.log("📥 Загружаем данные монстров...");
            const response = await fetch('data/enemies.json');
            if (!response.ok) {
                throw new Error(`Ошибка загрузки enemies.json: ${response.status}`);
            }
            
            this.monsters = await response.json();
            console.log(`✅ Загружено монстров: ${this.monsters.length}`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных монстров:", error);
            this.createFallbackMonsters();
            return true;
        }
    }

    createFallbackMonsters() {
        this.monsters = [];
        for (let i = 1; i <= 20; i++) {
            this.monsters.push({
                id: i,
                name: `Монстр ${i}`,
                image: "images/monsters/monster1.jpg",
                description: `Монстр уровня ${Math.ceil(i/5)}`,
                health: 20 + i * 5,
                maxHealth: 20 + i * 5,
                damage: 5 + i * 2,
                attack: 5 + i,
                defense: 2 + Math.floor(i/2),
                armor: 2 + Math.floor(i/3),
                speed: 3 + Math.floor(i/5),
                experience: 5 + i * 2,
                reward: 10 + i * 3,
                power: 15 + i * 4
            });
        }
        console.log("🔄 Созданы тестовые монстры");
    }

    startBattleWithMonster(monsterId) {
        const monster = this.monsters.find(m => m.id === monsterId);
        if (!monster) {
            console.error("❌ Монстр не найден:", monsterId);
            return;
        }

        this.currentMonster = {
            ...monster,
            currentHealth: monster.health
        };
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        
        this.addBattleLog(`⚔️ Бой начался! Противник: ${monster.name}`);
        console.log(`⚔️ Начинаем бой с: ${monster.name}`);
        
        this.showBattleScreen();
    }

    showBattleScreen() {
        const app = document.getElementById('app');
        if (!app) return;

        if (!this.battleActive || !this.currentMonster) {
            app.innerHTML = '<div class="battle-error">Бой не активен</div>';
            return;
        }

        const hero = window.game?.systems?.hero?.currentHero;
        if (!hero) {
            app.innerHTML = '<div class="battle-error">Герой не выбран</div>';
            return;
        }

        const heroStats = window.game.systems.level.calculateHeroStats(
            hero, 
            window.game.systems.bonus
        );

        const heroHealthPercent = (heroStats.currentHealth / heroStats.maxHealth) * 100;
        const monsterHealthPercent = (this.currentMonster.currentHealth / this.currentMonster.health) * 100;

        app.innerHTML = `
            <div class="battle-screen">
                <header class="battle-header">
                    <h2>⚔️ БОЙ</h2>
                    <div class="battle-round">Раунд: ${this.battleRound}</div>
                </header>
                
                <div class="battle-combatants">
                    <div class="combatant hero-combatant">
                        <div class="combatant-image">
                            <img src="${hero.image}" alt="${hero.name}">
                        </div>
                        <div class="combatant-info">
                            <h4>${hero.name}</h4>
                            <div class="health-bar">
                                <div class="health-fill" style="width: ${heroHealthPercent}%"></div>
                            </div>
                            <div class="health-text">
                                ❤️ ${Math.ceil(heroStats.currentHealth)}/${heroStats.maxHealth}
                            </div>
                            <div class="combatant-stats">
                                <span>⚔️ ${heroStats.damage}</span>
                                <span>🛡️ ${heroStats.armor}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="vs-divider">VS</div>
                    
                    <div class="combatant monster-combatant">
                        <div class="combatant-image">
                            <img src="${this.currentMonster.image}" alt="${this.currentMonster.name}">
                        </div>
                        <div class="combatant-info">
                            <h4>${this.currentMonster.name}</h4>
                            <div class="health-bar">
                                <div class="health-fill" style="width: ${monsterHealthPercent}%"></div>
                            </div>
                            <div class="health-text">
                                ❤️ ${Math.ceil(this.currentMonster.currentHealth)}/${this.currentMonster.health}
                            </div>
                            <div class="combatant-stats">
                                <span>⚔️ ${this.currentMonster.damage}</span>
                                <span>🛡️ ${this.currentMonster.armor}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="battle-log">
                    <h4>Лог боя:</h4>
                    <div class="log-entries">
                        ${this.battleLog.map(entry => `
                            <div class="log-entry">${entry}</div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="battle-actions">
                    <button class="btn-battle-attack" onclick="game.systems.battle.battleAttack()">
                        ⚔️ Атаковать
                    </button>
                    <button class="btn-battle-block" onclick="game.systems.battle.battleBlock()">
                        🛡️ Блокировать
                    </button>
                    <button class="btn-battle-flee" onclick="game.systems.battle.fleeBattle()">
                        🏃 Бежать
                    </button>
                </div>
            </div>
        `;

        this.injectBattleStyles();
    }

    battleAttack() {
        if (!this.battleActive || !this.currentMonster) return;

        this.battleRound++;
        const hero = window.game.systems.hero.currentHero;
        const heroStats = window.game.systems.level.calculateHeroStats(
            hero, 
            window.game.systems.bonus
        );

        // Атака героя
        const heroDamage = Math.max(1, heroStats.damage - this.currentMonster.armor);
        this.currentMonster.currentHealth -= heroDamage;
        
        this.addBattleLog(`🗡️ ${hero.name} наносит ${heroDamage} урона!`);

        // Проверка смерти монстра
        if (this.currentMonster.currentHealth <= 0) {
            this.endBattle(true);
            return;
        }

        // Атака монстра
        const monsterDamage = Math.max(1, this.currentMonster.damage - heroStats.armor);
        hero.currentHealth = (hero.currentHealth || heroStats.maxHealth) - monsterDamage;
        
        this.addBattleLog(`👹 ${this.currentMonster.name} наносит ${monsterDamage} урона!`);

        // Проверка смерти героя
        if (hero.currentHealth <= 0) {
            this.endBattle(false);
            return;
        }

        this.showBattleScreen();
    }

    battleBlock() {
        if (!this.battleActive || !this.currentMonster) return;

        this.battleRound++;
        const hero = window.game.systems.hero.currentHero;
        const heroStats = window.game.systems.level.calculateHeroStats(
            hero, 
            window.game.systems.bonus
        );

        // Блокирование снижает урон
        const baseMonsterDamage = Math.max(1, this.currentMonster.damage - heroStats.armor);
        const blockedDamage = Math.max(1, Math.floor(baseMonsterDamage * 0.5)); // 50% снижение
        
        hero.currentHealth = (hero.currentHealth || heroStats.maxHealth) - blockedDamage;
        
        this.addBattleLog(`🛡️ ${hero.name} блокирует атаку! Получено ${blockedDamage} урона`);

        // Проверка смерти героя
        if (hero.currentHealth <= 0) {
            this.endBattle(false);
            return;
        }

        this.showBattleScreen();
    }

    fleeBattle() {
        if (!this.battleActive) return;

        this.addBattleLog("🏃 Герой пытается сбежать...");
        
        if (Math.random() < 0.7) { // 70% шанс успешного побега
            this.addBattleLog("✅ Успешный побег!");
            this.endBattle(false, true);
        } else {
            this.addBattleLog("❌ Не удалось сбежать!");
            // Монстр атакует при неудачном побеге
            const hero = window.game.systems.hero.currentHero;
            const heroStats = window.game.systems.level.calculateHeroStats(
                hero, 
                window.game.systems.bonus
            );
            
            const monsterDamage = Math.max(1, this.currentMonster.damage - heroStats.armor);
            hero.currentHealth = (hero.currentHealth || heroStats.maxHealth) - monsterDamage;
            
            this.addBattleLog(`👹 ${this.currentMonster.name} атакует в спину! ${monsterDamage} урона`);
            
            if (hero.currentHealth <= 0) {
                this.endBattle(false);
            } else {
                this.showBattleScreen();
            }
        }
    }

    endBattle(victory, fled = false) {
        const hero = window.game.systems.hero.currentHero;
        
        if (victory) {
            const reward = this.currentMonster.reward;
            const experience = this.currentMonster.experience;
            
            hero.gold += reward;
            window.game.systems.level.addExperience(hero, experience);
            hero.monstersKilled = (hero.monstersKilled || 0) + 1;
            
            this.addBattleLog(`🎉 ПОБЕДА! +${reward} золота, +${experience} опыта`);
            alert(`🎉 Победа над ${this.currentMonster.name}!\n+${reward} золота\n+${experience} опыта`);
            
        } else if (fled) {
            this.addBattleLog("🏃 Бой окончен - успешный побег");
            alert("🏃 Успешный побег из боя!");
        } else {
            hero.currentHealth = 1; // Оставляем 1 HP при поражении
            hero.deaths = (hero.deaths || 0) + 1;
            
            this.addBattleLog("💀 ПОРАЖЕНИЕ! Герой повержен");
            alert(`💀 Поражение от ${this.currentMonster.name}!\nЗдоровье восстановлено до 1.`);
        }

        this.battleActive = false;
        this.currentMonster = null;
        
        // Возвращаемся к игровому экрану
        if (window.game.systems.hero) {
            window.game.systems.hero.showHeroGameScreen();
        }
    }

    addBattleLog(message) {
        this.battleLog.push(message);
        if (this.battleLog.length > 10) {
            this.battleLog.shift();
        }
    }

    injectBattleStyles() {
        const styles = `
            .battle-screen {
                padding: 1rem;
                background: #1f2937;
                color: white;
                min-height: 100vh;
            }
            
            .battle-combatants {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                gap: 2rem;
                align-items: center;
                margin: 2rem 0;
            }
            
            .combatant {
                text-align: center;
                background: #374151;
                padding: 1rem;
                border-radius: 10px;
            }
            
            .combatant-image img {
                width: 120px;
                height: 120px;
                border-radius: 10px;
                object-fit: cover;
            }
            
            .health-bar {
                width: 100%;
                height: 20px;
                background: #4b5563;
                border-radius: 10px;
                overflow: hidden;
                margin: 0.5rem 0;
            }
            
            .health-fill {
                height: 100%;
                background: linear-gradient(90deg, #ef4444, #f59e0b);
                transition: width 0.3s ease;
            }
            
            .vs-divider {
                font-size: 2rem;
                font-weight: bold;
                color: #f59e0b;
            }
            
            .battle-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin: 2rem 0;
            }
            
            .btn-battle-attack, .btn-battle-block, .btn-battle-flee {
                padding: 12px 24px;
                border: none;
                border-radius: 6px;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .btn-battle-attack { background: #ef4444; color: white; }
            .btn-battle-block { background: #3b82f6; color: white; }
            .btn-battle-flee { background: #6b7280; color: white; }
            
            .battle-log {
                background: #374151;
                padding: 1rem;
                border-radius: 10px;
                max-height: 200px;
                overflow-y: auto;
            }
            
            .log-entry {
                padding: 0.25rem 0;
                border-bottom: 1px solid #4b5563;
            }
        `;
        
        const style = document.createElement('style');
        style.textContent = styles;
        document.head.appendChild(style);
    }
}

// Регистрируем систему в глобальной области
window.BattleSystem = BattleSystem;
console.log("📦 BattleSystem модуль загружен");
