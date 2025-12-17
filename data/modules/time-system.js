// ========== НОВЫЙ КЛАСС: TimeSystem ==========
"use strict";

class TimeSystem {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        this.gameTime = {
            day: 1,
            hour: 7, // 7:00 утра
            season: 'summer' // summer, autumn, winter, spring
        };
        
        // Длительность дня по сезонам (в часах)
        this.seasonalDayLength = {
            summer: 20, // 20 часов день, 4 часа ночь
            autumn: 16, // 16 часов день, 8 часов ночь
            winter: 8,  // 8 часов день, 16 часов ночь
            spring: 16  // 16 часов день, 8 часов ночь
        };
        
        this.currentHexTime = 0; // часов потрачено на текущем гексе
        this.maxHexTime = 16;    // максимум часов на исследование гекса
        
        // Состояние лагеря
        this.camp = {
            exists: false,
            location: null, // {x, y}
            protections: [],
            level: 0
        };
        
        console.log("🕐 TimeSystem инициализирован");
    }
    
    // === МЕТОДЫ ДЛЯ ВСТАВКИ В MapSystem ===
    
    // Этот метод вызывается при ЛЮБОМ действии на гексе
    spendHourOnHex(action) {
        console.log(`🕐 TimeSystem: Тратим час на действие: ${action}`);
        
        this.currentHexTime++;
        this.gameTime.hour++;
        
        // Проверка перехода через полночь
        if (this.gameTime.hour >= 24) {
            this.gameTime.hour = 0;
            this.gameTime.day++;
            console.log(`🌅 Наступил день ${this.gameTime.day}`);
        }
        
        // Проверка наступления ночи
        const dayLength = this.seasonalDayLength[this.gameTime.season];
        const isNight = this.gameTime.hour >= dayLength || this.gameTime.hour < 7;
        
        if (isNight && !this.isInCamp()) {
            console.log("🌙 НАСТУПИЛА НОЧЬ вне лагеря!");
            this.handleNightDanger();
        }
        
        this.updateTimeDisplay();
        return true;
    }
    
    // Проверка, находится ли герой в лагере
    isInCamp() {
        if (!this.camp.exists || !this.camp.location) return false;
        
        const heroPos = this.mapSystem.playerTacticalPosition;
        return heroPos.x === this.camp.location.x && 
               heroPos.y === this.camp.location.y;
    }
    
    // Обработка ночной опасности
    handleNightDanger() {
        console.log("⚠️ Опасно! Ночь застала вне лагеря!");
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return;
        
        // Базовая вероятность нападения 90%
        const attackChance = 90;
        const roll = Math.random() * 100;
        
        if (roll <= attackChance) {
            console.log("👹 Ночное нападение!");
            
            // Начинаем бой с монстром
            const randomMonster = this.getRandomMonsterForNight();
            if (randomMonster) {
                // Сохраняем текущую позицию для возврата после боя
                this.mapSystem.pendingMovement = {
                    x: this.mapSystem.playerTacticalPosition.x,
                    y: this.mapSystem.playerTacticalPosition.y
                };
                
                // Начинаем бой
                battleSystem.startBattleWithSpecificMonster(
                    this.mapSystem.currentHero,
                    randomMonster,
                    'night_survival'
                );
                
                // Показываем сообщение
                if (window.game) {
                    window.game.showNotification("🌙 Ночное нападение! Без костра вас легко нашли...", 'warning');
                }
            }
        } else {
            console.log("🕯️ Вам повезло - этой ночью нападения не было");
            if (window.game) {
                window.game.showNotification("🌙 Страшная ночь прошла без нападений... на этот раз.", 'info');
            }
        }
    }
    
    // Получаем монстра для ночной атаки (более сильные ночью)
    getRandomMonsterForNight() {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return null;
        
        const allMonsters = battleSystem.monsters || [];
        if (allMonsters.length === 0) return null;
        
        // Ночью появляются более опасные монстры
        const nightMonsters = allMonsters.filter(m => (m.level || 1) >= 2);
        
        if (nightMonsters.length > 0) {
            return nightMonsters[Math.floor(Math.random() * nightMonsters.length)];
        }
        
        return allMonsters[Math.floor(Math.random() * allMonsters.length)];
    }
    
    // Обновление отображения времени
    updateTimeDisplay() {
        const timeElement = document.getElementById('timeDisplay');
        if (!timeElement) return;
        
        const seasonNames = {
            summer: 'Лето',
            autumn: 'Осень', 
            winter: 'Зима',
            spring: 'Весна'
        };
        
        const hourDisplay = this.gameTime.hour.toString().padStart(2, '0');
        const isNight = this.gameTime.hour >= this.seasonalDayLength[this.gameTime.season] || 
                       this.gameTime.hour < 7;
        
        timeElement.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: ${isNight ? '#a78bfa' : '#fbbf24'}; font-weight: bold;">
                    ${isNight ? '🌙' : '☀️'} ${hourDisplay}:00
                </span>
                <span style="color: #94a3b8;">
                    День ${this.gameTime.day} (${seasonNames[this.gameTime.season] || this.gameTime.season})
                </span>
                ${this.camp.exists ? '<span style="color: #10b981;">🏕️ Лагерь</span>' : ''}
            </div>
        `;
    }
    
    // === МЕТОДЫ ДЛЯ СОЗДАНИЯ/УПРАВЛЕНИЯ ЛАГЕРЕМ ===
    
    // Создать лагерь на текущем гексе
    createCamp() {
        const heroPos = this.mapSystem.playerTacticalPosition;
        
        this.camp = {
            exists: true,
            location: {...heroPos},
            protections: ['basic_campfire'], // базовый костёр
            level: 1,
            createdDay: this.gameTime.day
        };
        
        console.log(`🏕️ Лагерь создан на [${heroPos.x}, ${heroPos.y}]`);
        
        if (window.game) {
            window.game.showNotification("🏕️ Лагерь создан! Теперь здесь можно безопасно переночевать.", 'success');
        }
        
        this.updateTimeDisplay();
        return true;
    }
    
    // Вернуться в лагерь
    returnToCamp() {
        if (!this.camp.exists) {
            console.log("❌ Лагерь не создан!");
            return false;
        }
        
        const heroPos = this.mapSystem.playerTacticalPosition;
        const distance = Math.abs(heroPos.x - this.camp.location.x) + 
                        Math.abs(heroPos.y - this.camp.location.y);
        
        // Тратим время на возвращение
        const hoursToReturn = distance; // 1 гекс = 1 час
        
        for (let i = 0; i < hoursToReturn; i++) {
            this.spendHourOnHex('travel_to_camp');
            
            // Если ночь наступила по пути - возможны нападения
            const dayLength = this.seasonalDayLength[this.gameTime.season];
            const isNight = this.gameTime.hour >= dayLength || this.gameTime.hour < 7;
            
            if (isNight) {
                console.log("🌙 Ночь застала в пути!");
                this.handleNightDanger();
                break;
            }
        }
        
        // Перемещаем героя в лагерь
        this.mapSystem.playerTacticalPosition = {...this.camp.location};
        
        console.log(`🏕️ Возвращение в лагерь заняло ${hoursToReturn} часов`);
        
        if (window.game) {
            window.game.showNotification(`🏕️ Вы вернулись в лагерь за ${hoursToReturn} часов`, 'success');
            this.mapSystem.drawTacticalMap();
        }
        
        return true;
    }
    
    // Провести ночь в лагере
    spendNightInCamp() {
        if (!this.isInCamp()) {
            console.log("❌ Не в лагере!");
            return false;
        }
        
        const currentHour = this.gameTime.hour;
        const dayLength = this.seasonalDayLength[this.gameTime.season];
        
        // Если ещё не ночь
        if (currentHour < dayLength && currentHour >= 7) {
            console.log("⏳ Ещё не ночь...");
            return false;
        }
        
        // Сколько часов до утра (7:00)
        let hoursToMorning;
        if (currentHour >= 7) {
            hoursToMorning = (24 - currentHour) + 7;
        } else {
            hoursToMorning = 7 - currentHour;
        }
        
        console.log(`🌙 Герой проводит ночь в лагере (${hoursToMorning} часов)`);
        
        // Проходим часы до утра
        for (let i = 0; i < hoursToMorning; i++) {
            this.gameTime.hour++;
            if (this.gameTime.hour >= 24) {
                this.gameTime.hour = 0;
                this.gameTime.day++;
            }
        }
        
        // Восстанавливаем здоровье
        if (this.mapSystem.currentHero) {
            const heroSystem = window.game?.systems?.hero;
            if (heroSystem) {
                const stats = heroSystem.calculateHeroStats(this.mapSystem.currentHero);
                const oldHealth = this.mapSystem.currentHero.currentHealth;
                this.mapSystem.currentHero.currentHealth = Math.min(
                    stats.maxHealth,
                    oldHealth + Math.floor(stats.maxHealth * 0.1 * hoursToMorning)
                );
                
                console.log(`❤️ Восстановлено здоровье: ${oldHealth} → ${this.mapSystem.currentHero.currentHealth}`);
            }
        }
        
        // Утром гекс считается исследованным
        this.markHexAsExplored();
        
        this.updateTimeDisplay();
        
        if (window.game) {
            window.game.showNotification(`🌅 Утро дня ${this.gameTime.day}. Вы хорошо отдохнули в лагере.`, 'success');
            this.mapSystem.drawTacticalMap();
        }
        
        return true;
    }
    
    // Отметить текущий гекс как исследованный
    markHexAsExplored() {
        const cellKey = `${this.mapSystem.playerTacticalPosition.x},${this.mapSystem.playerTacticalPosition.y}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (cell) {
            cell.explored = true;
            cell.hasAction = false;
            console.log(`✓ Гекс [${cell.col},${cell.row}] отмечен как исследованный`);
        }
    }
    
    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===
    
    getTimeStatus() {
        const dayLength = this.seasonalDayLength[this.gameTime.season];
        const isDay = this.gameTime.hour >= 7 && this.gameTime.hour < dayLength;
        const isNight = !isDay;
        
        return {
            hour: this.gameTime.hour,
            day: this.gameTime.day,
            season: this.gameTime.season,
            isDay: isDay,
            isNight: isNight,
            hoursUntilNight: isDay ? dayLength - this.gameTime.hour : 0,
            hoursUntilMorning: isNight ? (this.gameTime.hour < 7 ? 7 - this.gameTime.hour : (24 - this.gameTime.hour) + 7) : 0
        };
    }
    
    // Сохранение состояния
    saveState() {
        return {
            gameTime: {...this.gameTime},
            camp: {...this.camp},
            currentHexTime: this.currentHexTime
        };
    }
    
    // Загрузка состояния
    loadState(state) {
        if (state.gameTime) this.gameTime = state.gameTime;
        if (state.camp) this.camp = state.camp;
        if (state.currentHexTime) this.currentHexTime = state.currentHexTime;
        
        this.updateTimeDisplay();
        console.log("🕐 TimeSystem состояние загружено");
    }
}

// Глобальная регистрация
if (typeof window !== 'undefined') {
    window.TimeSystem = TimeSystem;
    console.log("📦 TimeSystem зарегистрирован глобально");
}
