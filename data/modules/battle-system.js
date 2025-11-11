// ========== MODULE: BattleSystem ==========
class BattleSystem {
    constructor() {
        this.monsters = [];
        this.battleActive = false;
        this.currentMonster = null;
        this.currentHero = null; // ⭐ ДОБАВЛЯЕМ СВОЙСТВО ДЛЯ ТЕКУЩЕГО ГЕРОЯ
        this.battleLog = [];
        this.battleRound = 0;
        this.battleType = 'normal'; // 'normal' или 'movement'
        this.battleContext = 'normal'; // ⭐ ДОБАВЛЯЕМ КОНТЕКСТ БОЯ
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

    // ⭐ ОБНОВЛЕННЫЙ МЕТОД: принимает героя и контекст
    startBattleWithMonster(hero, monsterId, context = 'normal') {
        if (!hero) {
            console.error("❌ Не могу начать бой: герой не передан");
            return;
        }

        const monster = this.monsters.find(m => m.id === monsterId);
        if (!monster) {
            console.error("❌ Монстр не найден:", monsterId);
            return;
        }

        this.currentHero = hero; // ⭐ СОХРАНЯЕМ ГЕРОЯ
        this.currentMonster = {
            ...monster,
            currentHealth: monster.health
        };
        
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        this.battleType = context; // 'normal' или 'movement'
        this.battleContext = context; // ⭐ СОХРАНЯЕМ КОНТЕКСТ
        
        this.addBattleLog(`⚔️ Бой начался! Противник: ${monster.name}`);
        console.log(`⚔️ Начинаем бой героя ${hero.name} с: ${monster.name}, тип: ${context}`);
        
        this.showBattleScreen();
    }

    showBattleScreen() {
        const app = document.getElementById('app');
        if (!app) return;

        if (!this.battleActive || !this.currentMonster || !this.currentHero) {
            app.innerHTML = '<div class="battle-error">Бой не активен или герой не выбран</div>';
            return;
        }

        const heroStats = window.game.systems.level.calculateHeroStats(
            this.currentHero, 
            window.game.systems.bonus
        );

        const heroHealthPercent = (heroStats.currentHealth / heroStats.maxHealth) * 100;
        const monsterHealthPercent = (this.currentMonster.currentHealth / this.currentMonster.health) * 100;

        // Если это бой при перемещении, показываем разделенный экран
        if (this.battleType === 'movement') {
            this.showBattleWithMapScreen(heroStats, heroHealthPercent, monsterHealthPercent);
        } else {
            this.showStandardBattleScreen(heroStats, heroHealthPercent, monsterHealthPercent);
        }
    }

    // НОВЫЙ МЕТОД: бой с картой
    showBattleWithMapScreen(heroStats, heroHealthPercent, monsterHealthPercent) {
        const app = document.getElementById('app');
        
        app.innerHTML = `
            <div class="battle-screen-with-map">
                <div class="tactical-map-side">
                    ${window.game.systems.map.renderTacticalMap()}
                </div>
                
                <div class="battle-side">
                    <div class="battle-container">
                        <header class="battle-header">
                            <h2>⚔️ БОЙ ПРИ ПЕРЕМЕЩЕНИИ</h2>
                            <div class="battle-round">Раунд: ${this.battleRound}</div>
                        </header>
                        
                        <div class="battle-combatants">
                            <div class="combatant hero-combatant">
                                <div class="combatant-image">
                                    <img src="${this.currentHero.image}" alt="${this.currentHero.name}">
                                </div>
                                <div class="combatant-info">
                                    <h4>${this.currentHero.name}</h4>
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
                </div>
            </div>
        `;

        this.injectBattleWithMapStyles();
    }

    // СТАРЫЙ МЕТОД: стандартный бой
    showStandardBattleScreen(heroStats, heroHealthPercent, monsterHealthPercent) {
        const app = document.getElementById('app');

        app.innerHTML = `
            <div class="battle-screen">
                <header class="battle-header">
                    <h2>⚔️ БОЙ</h2>
                    <div class="battle-round">Раунд: ${this.battleRound}</div>
                </header>
                
                <div class="battle-combatants">
                    <div class="combatant hero-combatant">
                        <div class="combatant-image">
                            <img src="${this.currentHero.image}" alt="${this.currentHero.name}">
                        </div>
                        <div class="combatant-info">
                            <h4>${this.currentHero.name}</h4>
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
        if (!this.battleActive || !this.currentMonster || !this.currentHero) return;

        this.battleRound++;
        const heroStats = window.game.systems.level.calculateHeroStats(
            this.currentHero, 
            window.game.systems.bonus
        );

        // Атака героя
        const heroDamage = Math.max(1, heroStats.damage - this.currentMonster.armor);
        this.currentMonster.currentHealth -= heroDamage;
        
        this.addBattleLog(`🗡️ ${this.currentHero.name} наносит ${heroDamage} урона!`);

        // Проверка смерти монстра
        if (this.currentMonster.currentHealth <= 0) {
            this.endBattle(true);
            return;
        }

        // Атака монстра
        const monsterDamage = Math.max(1, this.currentMonster.damage - heroStats.armor);
        this.currentHero.currentHealth = (this.currentHero.currentHealth || heroStats.maxHealth) - monsterDamage;
        
        this.addBattleLog(`👹 ${this.currentMonster.name} наносит ${monsterDamage} урона!`);

        // Проверка смерти героя
        if (this.currentHero.currentHealth <= 0) {
            this.endBattle(false);
            return;
        }

        this.showBattleScreen();
    }

    battleBlock() {
        if (!this.battleActive || !this.currentMonster || !this.currentHero) return;

        this.battleRound++;
        const heroStats = window.game.systems.level.calculateHeroStats(
            this.currentHero, 
            window.game.systems.bonus
        );

        // Блокирование снижает урон
        const baseMonsterDamage = Math.max(1, this.currentMonster.damage - heroStats.armor);
        const blockedDamage = Math.max(1, Math.floor(baseMonsterDamage * 0.5)); // 50% снижение
        
        this.currentHero.currentHealth = (this.currentHero.currentHealth || heroStats.maxHealth) - blockedDamage;
        
        this.addBattleLog(`🛡️ ${this.currentHero.name} блокирует атаку! Получено ${blockedDamage} урона`);

        // Проверка смерти героя
        if (this.currentHero.currentHealth <= 0) {
            this.endBattle(false);
            return;
        }

        this.showBattleScreen();
    }

    fleeBattle() {
        if (!this.battleActive || !this.currentHero) return;

        this.addBattleLog("🏃 Герой пытается сбежать...");
        
        if (Math.random() < 0.7) { // 70% шанс успешного побега
            this.addBattleLog("✅ Успешный побег!");
            this.endBattle(false, true);
        } else {
            this.addBattleLog("❌ Не удалось сбежать!");
            // Монстр атакует при неудачном побеге
            const heroStats = window.game.systems.level.calculateHeroStats(
                this.currentHero, 
                window.game.systems.bonus
            );
            
            const monsterDamage = Math.max(1, this.currentMonster.damage - heroStats.armor);
            this.currentHero.currentHealth = (this.currentHero.currentHealth || heroStats.maxHealth) - monsterDamage;
            
            this.addBattleLog(`👹 ${this.currentMonster.name} атакует в спину! ${monsterDamage} урона`);
            
            if (this.currentHero.currentHealth <= 0) {
                this.endBattle(false);
            } else {
                this.showBattleScreen();
            }
        }
    }

    endBattle(victory, fled = false) {
        if (!this.currentHero) {
            console.error("❌ Не могу завершить бой: герой не установлен");
            return;
        }

        const mapSystem = window.game.systems.map;
        
        if (victory) {
            const reward = this.currentMonster.reward;
            const experience = this.currentMonster.experience;
            
            this.currentHero.gold += reward;
            window.game.systems.level.addExperience(this.currentHero, experience);
            this.currentHero.monstersKilled = (this.currentHero.monstersKilled || 0) + 1;
            
            this.addBattleLog(`🎉 ПОБЕДА! +${reward} золота, +${experience} опыта`);
            
            // Сохраняем игру после победы
            if (window.game) {
                window.game.saveGame();
            }
            
            // Если это бой при перемещении, завершаем перемещение
            if (this.battleContext === 'movement' && mapSystem) {
                setTimeout(() => {
                    mapSystem.completeMovementAfterBattle(true);
                    this.showVictoryScreen(reward, experience);
                }, 2000);
            } else {
                setTimeout(() => {
                    this.showVictoryScreen(reward, experience);
                }, 2000);
            }
            
        } else if (fled) {
            this.addBattleLog("🏃 Бой окончен - успешный побег");
            // Сохраняем игру после побега
            if (window.game) {
                window.game.saveGame();
            }
            // При побеге не перемещаемся
            setTimeout(() => {
                this.returnToTacticalMap();
            }, 2000);
        } else {
            this.currentHero.currentHealth = 1; // Оставляем 1 HP при поражении
            this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
            
            this.addBattleLog("💀 ПОРАЖЕНИЕ! Герой повержен");
            
            // Сохраняем игру после поражения
            if (window.game) {
                window.game.saveGame();
            }
            
            // Если это бой при перемещении, возвращаем на старт
            if (this.battleContext === 'movement' && mapSystem) {
                setTimeout(() => {
                    mapSystem.completeMovementAfterBattle(false);
                    this.returnToTacticalMap();
                }, 2000);
            } else {
                setTimeout(() => {
                    this.returnToTacticalMap();
                }, 2000);
            }
        }

        this.battleActive = false;
        this.currentMonster = null;
        this.currentHero = null; // ⭐ ОЧИЩАЕМ ГЕРОЯ ПОСЛЕ БОЯ
    }

    // ⭐ НОВЫЙ МЕТОД: завершение боя (для вызова извне)
    completeBattle(victory) {
        if (this.battleContext === 'movement' && window.game?.systems?.map) {
            // Сообщаем системе карт о результате боя
            window.game.systems.map.completeMovementAfterBattle(victory);
        }
        
        this.endBattle(victory);
    }

    // НОВЫЙ МЕТОД: экран победы
    showVictoryScreen(reward, experience) {
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="battle-screen victory-screen">
                <header class="battle-header">
                    <h2>🎉 ПОБЕДА!</h2>
                </header>
                
                <div class="victory-content">
                    <div class="victory-rewards">
                        <div class="reward-item">
                            <span class="reward-icon">💰</span>
                            <span class="reward-text">+${reward} золота</span>
                        </div>
                        <div class="reward-item">
                            <span class="reward-icon">🌟</span>
                            <span class="reward-text">+${experience} опыта</span>
                        </div>
                    </div>
                    
                    <div class="victory-message">
                        ${this.battleContext === 'movement' ? 
                            'Монстр повержен! Вы успешно достигли клетки.' : 
                            'Монстр повержен! Вы победили в бою.'}
                    </div>
                    
                    <button class="btn-primary" onclick="game.systems.battle.returnToTacticalMap()">
                        ${this.battleContext === 'movement' ? 'Продолжить исследование' : 'Вернуться к игре'}
                    </button>
                </div>
            </div>
        `;

        this.injectVictoryStyles();
    }

    // НОВЫЙ МЕТОД: возврат к тактической карте
    returnToTacticalMap() {
        if (window.game && window.game.systems.hero) {
            window.game.systems.hero.showHeroGameScreen();
        }
    }

    addBattleLog(message) {
        this.battleLog.push(message);
        if (this.battleLog.length > 10) {
            this.battleLog.shift();
        }
    }

    // НОВЫЙ МЕТОД: стили для боя с картой
    injectBattleWithMapStyles() {
        const styles = `
            .battle-screen-with-map {
                display: grid;
                grid-template-columns: 1fr 400px;
                height: 100vh;
                background: #1f2937;
            }
            
            .tactical-map-side {
                background: #000;
                overflow: hidden;
                position: relative;
            }
            
            .battle-side {
                background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
                border-left: 2px solid #4b5563;
                display: flex;
                flex-direction: column;
            }
            
            .battle-container {
                flex: 1;
                padding: 1rem;
                display: flex;
                flex-direction: column;
            }
            
            .battle-combatants {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin: 1rem 0;
            }
            
            .combatant {
                background: rgba(55, 65, 81, 0.8);
                border-radius: 10px;
                padding: 1rem;
                text-align: center;
                backdrop-filter: blur(10px);
            }
            
            .combatant-image img {
                width: 80px;
                height: 80px;
                border-radius: 10px;
                object-fit: cover;
                border: 2px solid #4b5563;
            }
            
            .vs-divider {
                text-align: center;
                font-size: 1.5rem;
                font-weight: bold;
                color: #f59e0b;
                margin: 0.5rem 0;
                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            }
            
            .health-bar {
                width: 100%;
                height: 15px;
                background: #4b5563;
                border-radius: 8px;
                overflow: hidden;
                margin: 0.5rem 0;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .health-fill {
                height: 100%;
                background: linear-gradient(90deg, #ef4444, #f59e0b);
                transition: width 0.3s ease;
            }
            
            .health-text {
                font-size: 0.9rem;
                color: #cbd5e1;
                margin: 0.3rem 0;
            }
            
            .combatant-stats {
                display: flex;
                justify-content: space-around;
                font-size: 0.8rem;
                color: #9ca3af;
            }
            
            .battle-log {
                flex: 1;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                padding: 1rem;
                margin: 1rem 0;
                overflow-y: auto;
                max-height: 200px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .battle-log h4 {
                color: #f59e0b;
                margin-bottom: 0.5rem;
                font-size: 1rem;
            }
            
            .log-entries {
                font-size: 0.9rem;
            }
            
            .log-entry {
                padding: 0.25rem 0;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                color: #e5e7eb;
            }
            
            .battle-actions {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .btn-battle-attack, .btn-battle-block, .btn-battle-flee {
                padding: 12px;
                border: none;
                border-radius: 6px;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: bold;
            }
            
            .btn-battle-attack { 
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
            }
            
            .btn-battle-block { 
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white;
            }
            
            .btn-battle-flee { 
                background: linear-gradient(135deg, #6b7280, #4b5563);
                color: white;
            }
            
            .btn-battle-attack:hover { 
                background: linear-gradient(135deg, #dc2626, #b91c1c);
                transform: translateY(-2px);
            }
            
            .btn-battle-block:hover { 
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                transform: translateY(-2px);
            }
            
            .btn-battle-flee:hover { 
                background: linear-gradient(135deg, #4b5563, #374151);
                transform: translateY(-2px);
            }
        `;
        
        const style = document.createElement('style');
        style.textContent = styles;
        document.head.appendChild(style);
    }

    // СТАРЫЙ МЕТОД: стили для стандартного боя
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

    // НОВЫЙ МЕТОД: стили для экрана победы
    injectVictoryStyles() {
        const styles = `
            .victory-screen {
                background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }
            
            .victory-content {
                text-align: center;
                padding: 2rem;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 15px;
                backdrop-filter: blur(10px);
                border: 2px solid rgba(255, 255, 255, 0.2);
                max-width: 500px;
            }
            
            .victory-rewards {
                display: flex;
                justify-content: center;
                gap: 2rem;
                margin: 2rem 0;
            }
            
            .reward-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                background: rgba(255, 255, 255, 0.2);
                padding: 1rem;
                border-radius: 10px;
                min-width: 120px;
                border: 1px solid rgba(255, 255, 255, 0.3);
            }
            
            .reward-icon {
                font-size: 2rem;
                margin-bottom: 0.5rem;
            }
            
            .reward-text {
                font-weight: bold;
                font-size: 1.1rem;
                color: white;
            }
            
            .victory-message {
                font-size: 1.2rem;
                margin: 2rem 0;
                color: white;
                font-weight: bold;
            }
        `;
        
        const style = document.createElement('style');
        style.textContent = styles;
        document.head.appendChild(style);
    }
}

// Регистрируем систему в глобальной области
window.BattleSystem = BattleSystem;
console.log("📦 BattleSystem модуль загружен с системой боев при перемещении");
