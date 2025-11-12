// ========== MODULE: BattleSystem ==========
class BattleSystem {
    constructor() {
        this.monsters = [];
        this.isBattleActive = false;
        this.currentBattle = null;
        this.battleLog = [];
        
        console.log("✅ BattleSystem инициализирован");
    }

    async loadBattleData() {
        try {
            console.log("📥 Загружаем данные боевой системы...");
            
            // Загружаем монстров
            await this.loadMonsters();
            
            console.log(`✅ Данные боевой системы загружены: Монстров=${this.monsters.length}`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных боевой системы:", error);
            this.createFallbackMonsters();
            return true;
        }
    }

    async loadMonsters() {
        try {
            const monsterPaths = [
                'data/monsters/monsters.json',
                'data/monsters.json',
                'monsters.json',
                'data/modules/monsters.json'
            ];
            
            for (const path of monsterPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const monsterData = await response.json();
                        this.monsters = monsterData.monsters || monsterData;
                        console.log(`✅ Монстры загружены из: ${path}`);
                        return;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить монстров из ${path}:`, e.message);
                }
            }
            
            console.log("ℹ️ Монстры не найдены, создаем тестовых");
            this.createFallbackMonsters();
            
        } catch (error) {
            console.error("❌ Ошибка загрузки монстров:", error);
            this.createFallbackMonsters();
        }
    }

    createFallbackMonsters() {
        this.monsters = [
            {
                id: 1,
                name: "Гоблин",
                health: 30,
                maxHealth: 30,
                damage: 5,
                armor: 2,
                reward: 10,
                experience: 5,
                image: "images/monsters/goblin.jpg"
            },
            {
                id: 2,
                name: "Орк",
                health: 50,
                maxHealth: 50,
                damage: 8,
                armor: 4,
                reward: 20,
                experience: 10,
                image: "images/monsters/orc.jpg"
            },
            {
                id: 3,
                name: "Тролль",
                health: 80,
                maxHealth: 80,
                damage: 12,
                armor: 6,
                reward: 35,
                experience: 20,
                image: "images/monsters/troll.jpg"
            }
        ];
    }

    // ========== ОСНОВНЫЕ МЕТОДЫ БОЯ ==========
    startBattleWithMonster(hero, monsterId, context = 'manual') {
        if (this.isBattleActive) {
            console.log("⚔️ Бой уже активен!");
            return;
        }

        const monster = this.monsters.find(m => m.id === monsterId);
        if (!monster) {
            console.error("❌ Монстр не найден:", monsterId);
            return;
        }

        this.isBattleActive = true;
        this.currentBattle = {
            hero: hero,
            monster: {...monster},
            heroHealth: hero.currentHealth,
            monsterHealth: monster.health,
            turn: 0,
            context: context,
            reward: monster.reward,
            experience: monster.experience
        };

        this.battleLog = [];
        this.addToLog(`⚔️ Начинается бой между ${hero.name} и ${monster.name}!`);

        console.log(`⚔️ Начат бой: ${hero.name} vs ${monster.name} (${context})`);

        // Показываем экран боя
        this.showBattleScreen();
    }

    showBattleScreen() {
        const app = document.getElementById('app');
        if (!app) return;

        const battle = this.currentBattle;
        if (!battle) return;

        const heroHealthPercent = (battle.heroHealth / battle.hero.maxHealth) * 100;
        const monsterHealthPercent = (battle.monsterHealth / battle.monster.maxHealth) * 100;

        app.innerHTML = `
            <div class="battle-screen-with-map">
                <div class="tactical-map-side">
                    <!-- Здесь будет тактическая карта -->
                    <div style="color: white; padding: 20px; text-align: center;">
                        <h3>🎲 Тактическая карта</h3>
                        <p>Бой происходит на текущей карте</p>
                    </div>
                </div>
                
                <div class="battle-side">
                    <div class="battle-container">
                        <h3>⚔️ БОЙ!</h3>
                        
                        <div class="battle-combatants">
                            <div class="combatant hero-combatant">
                                <div class="combatant-image">
                                    <img src="${battle.hero.image}" alt="${battle.hero.name}" 
                                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjODg4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SGVybzwvdGV4dD48L3N2Zz4='">
                                </div>
                                <div class="combatant-name">${battle.hero.name}</div>
                                <div class="health-bar">
                                    <div class="health-fill" style="width: ${heroHealthPercent}%"></div>
                                </div>
                                <div class="health-text">${Math.floor(battle.heroHealth)}/${battle.hero.maxHealth}</div>
                                <div class="combatant-stats">
                                    <span>⚔️ ${battle.hero.damage}</span>
                                    <span>🛡️ ${battle.hero.armor}</span>
                                </div>
                            </div>
                            
                            <div class="vs-divider">VS</div>
                            
                            <div class="combatant monster-combatant">
                                <div class="combatant-image">
                                    <img src="${battle.monster.image}" alt="${battle.monster.name}"
                                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iIzU1NSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSIjYWFhIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TW9uc3RlcjwvdGV4dD48L3N2Zz4='">
                                </div>
                                <div class="combatant-name">${battle.monster.name}</div>
                                <div class="health-bar">
                                    <div class="health-fill" style="width: ${monsterHealthPercent}%"></div>
                                </div>
                                <div class="health-text">${Math.floor(battle.monsterHealth)}/${battle.monster.maxHealth}</div>
                                <div class="combatant-stats">
                                    <span>⚔️ ${battle.monster.damage}</span>
                                    <span>🛡️ ${battle.monster.armor}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="battle-log">
                            <h4>📜 Ход боя:</h4>
                            <div class="log-entries">
                                ${this.battleLog.map(entry => `
                                    <div class="log-entry">${entry}</div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <div class="battle-actions">
                            <button class="btn-battle-attack" onclick="game.systems.battle.playerAttack()">
                                ⚔️ Атаковать
                            </button>
                            <button class="btn-battle-block" onclick="game.systems.battle.playerBlock()">
                                🛡️ Защищаться
                            </button>
                            <button class="btn-battle-flee" onclick="game.systems.battle.playerFlee()">
                                🏃 Бежать
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    playerAttack() {
        if (!this.isBattleActive || !this.currentBattle) return;

        const battle = this.currentBattle;
        battle.turn++;

        // Герой атакует
        const heroDamage = Math.max(1, battle.hero.damage - battle.monster.armor);
        battle.monsterHealth -= heroDamage;
        this.addToLog(`🗡️ ${battle.hero.name} атакует и наносит ${heroDamage} урона!`);

        // Проверяем победу
        if (battle.monsterHealth <= 0) {
            battle.monsterHealth = 0;
            this.addToLog(`🎉 ${battle.monster.name} повержен!`);
            this.completeBattle(true);
            return;
        }

        // Монстр атакует в ответ
        this.monsterAttack();
    }

    playerBlock() {
        if (!this.isBattleActive || !this.currentBattle) return;

        const battle = this.currentBattle;
        battle.turn++;

        // Герой защищается - получает меньше урона
        this.addToLog(`🛡️ ${battle.hero.name} принимает защитную стойку!`);

        // Монстр атакует с уменьшенным уроном
        const monsterDamage = Math.max(1, Math.floor(battle.monster.damage * 0.5) - battle.hero.armor);
        battle.heroHealth -= monsterDamage;
        this.addToLog(`👹 ${battle.monster.name} атакует, но наносит только ${monsterDamage} урона!`);

        // Проверяем поражение
        if (battle.heroHealth <= 0) {
            battle.heroHealth = 0;
            this.addToLog(`💀 ${battle.hero.name} пал в бою...`);
            this.completeBattle(false);
            return;
        }

        this.updateBattleScreen();
    }

    playerFlee() {
        if (!this.isBattleActive || !this.currentBattle) return;

        const success = Math.random() > 0.3; // 70% шанс успеха

        if (success) {
            this.addToLog(`🏃 ${this.currentBattle.hero.name} успешно сбежал из боя!`);
            this.completeBattle(false); // Сбежал - не победа
        } else {
            this.addToLog(`❌ ${this.currentBattle.hero.name} не смог сбежать!`);
            this.monsterAttack();
        }
    }

    monsterAttack() {
        const battle = this.currentBattle;
        if (!battle) return;

        const monsterDamage = Math.max(1, battle.monster.damage - battle.hero.armor);
        battle.heroHealth -= monsterDamage;
        this.addToLog(`👹 ${battle.monster.name} атакует и наносит ${monsterDamage} урона!`);

        // Проверяем поражение
        if (battle.heroHealth <= 0) {
            battle.heroHealth = 0;
            this.addToLog(`💀 ${battle.hero.name} пал в бою...`);
            this.completeBattle(false);
            return;
        }

        this.updateBattleScreen();
    }

    updateBattleScreen() {
        const battle = this.currentBattle;
        if (!battle) return;

        const heroHealthPercent = (battle.heroHealth / battle.hero.maxHealth) * 100;
        const monsterHealthPercent = (battle.monsterHealth / battle.monster.maxHealth) * 100;

        // Обновляем здоровье
        const heroHealthFill = document.querySelector('.hero-combatant .health-fill');
        const monsterHealthFill = document.querySelector('.monster-combatant .health-fill');
        const heroHealthText = document.querySelector('.hero-combatant .health-text');
        const monsterHealthText = document.querySelector('.monster-combatant .health-text');

        if (heroHealthFill) heroHealthFill.style.width = heroHealthPercent + '%';
        if (monsterHealthFill) monsterHealthFill.style.width = monsterHealthPercent + '%';
        if (heroHealthText) heroHealthText.textContent = `${Math.floor(battle.heroHealth)}/${battle.hero.maxHealth}`;
        if (monsterHealthText) monsterHealthText.textContent = `${Math.floor(battle.monsterHealth)}/${battle.monster.maxHealth}`;

        // Обновляем лог
        const logEntries = document.querySelector('.log-entries');
        if (logEntries) {
            logEntries.innerHTML = this.battleLog.map(entry => `
                <div class="log-entry">${entry}</div>
            `).join('');
            logEntries.scrollTop = logEntries.scrollHeight;
        }
    }

    addToLog(message) {
        this.battleLog.push(message);
        console.log(`📜 Бой: ${message}`);
        
        // Ограничиваем длину лога
        if (this.battleLog.length > 20) {
            this.battleLog.shift();
        }
    }

    // ИСПРАВЛЕННЫЙ МЕТОД завершения боя
    completeBattle(victory) {
        console.log(`🎯 Завершение боя: ${victory ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}`);
        
        // Сохраняем состояние боя
        this.isBattleActive = false;
        this.currentBattle = null;
        
        // ⭐ ВАЖНО: Получаем ссылку на MapSystem ДО скрытия экрана боя
        const mapSystem = window.game?.systems?.map;
        
        if (victory) {
            this.handleVictory();
            
            // ⭐ ИСПРАВЛЕНИЕ: передаем управление карте перед скрытием боя
            if (mapSystem) {
                mapSystem.completeMovementAfterBattle(true);
            }
            
            // Показываем экран победы
            this.showVictoryScreen();
            
        } else {
            this.handleDefeat();
            
            // ⭐ ИСПРАВЛЕНИЕ: передаем управление карте перед скрытием боя
            if (mapSystem) {
                mapSystem.completeMovementAfterBattle(false);
            }
            
            // Возвращаем на экран героя
            setTimeout(() => {
                if (window.game && window.game.currentHero) {
                    window.game.showHeroGameScreen();
                }
            }, 3000);
        }
        
        // ⭐ ИСПРАВЛЕНИЕ: НЕ скрываем оверлей здесь - это сделает MapSystem
    }

    handleVictory() {
        const battle = this.currentBattle;
        if (!battle) return;

        const hero = battle.hero;
        
        // Награда за победу
        hero.gold += battle.reward;
        hero.experience += battle.experience;
        hero.monstersKilled = (hero.monstersKilled || 0) + 1;

        // Проверяем повышение уровня
        if (window.game.systems.level) {
            const leveledUp = window.game.systems.level.addExperience(hero, battle.experience);
            if (leveledUp) {
                this.addToLog(`🎉 ${hero.name} повысил уровень! Теперь уровень ${hero.level}`);
            }
        }

        this.addToLog(`💰 Получено: ${battle.reward} золота и ${battle.experience} опыта`);

        // Сохраняем игру
        if (window.game) {
            window.game.saveGame();
        }
    }

    handleDefeat() {
        const battle = this.currentBattle;
        if (!battle) return;

        const hero = battle.hero;
        
        // Штраф за поражение
        hero.deaths = (hero.deaths || 0) + 1;
        const goldLoss = Math.floor(hero.gold * 0.1); // Теряем 10% золота
        hero.gold = Math.max(0, hero.gold - goldLoss);

        this.addToLog(`💀 Поражение! Потеряно ${goldLoss} золота`);

        // Восстанавливаем немного здоровья после поражения
        hero.currentHealth = Math.floor(hero.maxHealth * 0.3);

        // Сохраняем игру
        if (window.game) {
            window.game.saveGame();
        }
    }

    // ИСПРАВЛЕННЫЙ МЕТОД показа экрана победы
    showVictoryScreen() {
        const battle = this.currentBattle;
        if (!battle) return;

        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="victory-screen">
                <div class="victory-content">
                    <h2>🎉 ПОБЕДА!</h2>
                    <div class="victory-message">
                        Вы победили ${battle.monster.name}!
                    </div>
                    
                    <div class="victory-rewards">
                        <div class="reward-item">
                            <div class="reward-icon">💰</div>
                            <div class="reward-text">+${battle.reward} золота</div>
                        </div>
                        <div class="reward-item">
                            <div class="reward-icon">⭐</div>
                            <div class="reward-text">+${battle.experience} опыта</div>
                        </div>
                    </div>
                    
                    <button class="btn-primary" onclick="game.returnToTacticalMapAfterBattle()">
                        ➡️ Продолжить исследование
                    </button>
                </div>
            </div>
        `;
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    getMonsterById(id) {
        return this.monsters.find(monster => monster.id === id);
    }

    getRandomMonster() {
        if (this.monsters.length === 0) {
            this.createFallbackMonsters();
        }
        const randomIndex = Math.floor(Math.random() * this.monsters.length);
        return this.monsters[randomIndex];
    }

    // ========== ДЕБАГ ИНФОРМАЦИЯ ==========
    debugInfo() {
        console.group("⚔️ BattleSystem Debug Info");
        console.log("Активен ли бой:", this.isBattleActive);
        console.log("Текущий бой:", this.currentBattle);
        console.log("Загружено монстров:", this.monsters.length);
        console.log("Последние записи лога:", this.battleLog.slice(-3));
        console.groupEnd();
    }
}

// Регистрируем систему в глобальной области
window.BattleSystem = BattleSystem;
console.log("📦 BattleSystem модуль загружен");
