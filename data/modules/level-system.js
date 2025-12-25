// ========== MODULE: LevelSystem ==========
class LevelSystem {
    constructor() {
        this.levelThresholds = {};
        console.log("✅ LevelSystem инициализирован");
    }

    async loadLevelData() {
        try {
            console.log("📊 Загружаем данные уровней...");
            
            // Загружаем пороги опыта для уровней
            const response = await fetch('data/levels.json');
            if (!response.ok) {
                throw new Error(`Ошибка загрузки levels.json: ${response.status}`);
            }
            
            this.levelThresholds = await response.json();
            console.log(`✅ Данные уровней загружены: ${Object.keys(this.levelThresholds).length} уровней`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных уровней:", error);
            this.createFallbackLevels();
            return true;
        }
    }

    createFallbackLevels() {
        // Резервные пороги опыта (уровень: требуемый опыт)
        this.levelThresholds = {
            1: 0,
            2: 100,
            3: 300,
            4: 600,
            5: 1000,
            6: 1500,
            7: 2100,
            8: 2800,
            9: 3600,
            10: 4500,
            11: 5500,
            12: 6600,
            13: 7800,
            14: 9100,
            15: 10500,
            16: 12000,
            17: 13600,
            18: 15300,
            19: 17100,
            20: 19000,
            21: 21000,
            22: 23100,
            23: 25300,
            24: 27600,
            25: 30000,
            26: 32500,
            27: 35100,
            28: 37800,
            29: 40600,
            30: 43500,
            31: 46500,
            32: 49600,
            33: 52800,
            34: 56100,
            35: 59500,
            36: 63000,
            37: 66600,
            38: 70300,
            39: 74100,
            40: 78000,
            41: 82000,
            42: 86100,
            43: 90300,
            44: 94600,
            45: 99000,
            46: 103500,
            47: 108100,
            48: 112800,
            49: 117600,
            50: 122500
        };
        
        console.log("🔄 Созданы резервные пороги уровней");
    }

    getExperienceForNextLevel(level) {
        return this.levelThresholds[level + 1] || 'MAX';
    }

    getExperiencePercent(hero) {
        if (!hero || hero.level >= 50) return 100;
        
        const currentExp = hero.experience;
        const currentLevelExp = this.levelThresholds[hero.level] || 0;
        const nextLevelExp = this.levelThresholds[hero.level + 1] || currentLevelExp + 1000;
        
        if (nextLevelExp === currentLevelExp) return 100;
        
        const progress = ((currentExp - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100;
        return Math.min(100, Math.max(0, Math.round(progress)));
    }

    getExperienceProgress(hero) {
        if (!hero) return { percent: 0, current: 0, next: 0, totalForNext: 0 };
        
        if (hero.level >= 50) {
            return {
                percent: 100,
                current: 'MAX',
                next: 'MAX',
                totalForNext: 0
            };
        }
        
        const currentExp = hero.experience;
        const currentLevelExp = this.levelThresholds[hero.level] || 0;
        const nextLevelExp = this.levelThresholds[hero.level + 1] || currentLevelExp + 1000;
        const neededForNext = nextLevelExp - currentLevelExp;
        const currentProgress = currentExp - currentLevelExp;
        
        const progress = neededForNext > 0 ? (currentProgress / neededForNext) * 100 : 100;
        
        return {
            percent: Math.min(100, Math.max(0, Math.round(progress))),
            current: currentProgress,
            next: neededForNext,
            totalForNext: neededForNext
        };
    }

    // ⭐ ОБНОВЛЕННЫЙ МЕТОД: Добавление опыта с уведомлением SkillsSystem
    addExperience(hero, exp) {
        if (!hero) return 0;
        
        const oldLevel = hero.level;
        hero.experience += exp;
        
        let levelsGained = 0;
        let newLevel = oldLevel;
        
        // Проверяем повышение уровней
        while (true) {
            const nextLevelExp = this.levelThresholds[newLevel + 1];
            if (!nextLevelExp || hero.experience < nextLevelExp) break;
            
            newLevel++;
            levelsGained++;
            
            // Увеличиваем базовые характеристики при повышении уровня
            hero.baseHealth = Math.round(hero.baseHealth * 1.1);
            hero.baseDamage = Math.round(hero.baseDamage * 1.1);
            hero.baseArmor = Math.round(hero.baseArmor * 1.05);
            
            // Восстанавливаем здоровье при повышении уровня
            if (window.game && window.game.systems && window.game.systems.hero) {
                const stats = window.game.systems.hero.calculateHeroStats(hero);
                hero.currentHealth = stats.maxHealth;
            }
            
            console.log(`🎉 ${hero.name} достиг ${newLevel} уровня!`);
            
            // Проверяем разблокировку новых героев
            if (window.game && window.game.systems && window.game.systems.hero) {
                window.game.systems.hero.checkHeroUnlocks();
            }
        }
        
        // Устанавливаем новый уровень
        hero.level = newLevel;
        
        // ⭐ ВАЖНОЕ ИЗМЕНЕНИЕ: Уведомляем SkillsSystem о повышении уровня
        if (levelsGained > 0 && window.game && window.game.systems && window.game.systems.skills) {
            console.log(`📊 Уведомляем SkillsSystem о повышении уровня с ${oldLevel} до ${newLevel}`);
            
            // Добавляем очки навыков за каждый полученный уровень
            for (let i = oldLevel + 1; i <= newLevel; i++) {
                const pointsForThisLevel = window.game.systems.skills.calculateSkillPointsFromLevel(i) - 
                                         window.game.systems.skills.calculateSkillPointsFromLevel(i - 1);
                
                if (pointsForThisLevel > 0) {
                    window.game.systems.skills.addSkillPoints(pointsForThisLevel);
                }
            }
            
            // Вызываем метод обработки повышения уровня
            window.game.systems.skills.onHeroLevelUp(oldLevel, newLevel);
        }
        
        // Сохраняем игру при повышении уровня
        if (levelsGained > 0 && window.game) {
            window.game.saveGame();
            
            if (window.game.showNotification) {
                if (levelsGained === 1) {
                    window.game.showNotification(`🎉 ${hero.name} достиг ${newLevel} уровня!`, 'success');
                } else {
                    window.game.showNotification(`🎉 ${hero.name} достиг ${newLevel} уровня (получено ${levelsGained} уровней!)`, 'success');
                }
            }
        }
        
        return levelsGained;
    }

    // Альтернативный метод для принудительной проверки повышения уровня
    checkLevelUp(hero) {
        if (!hero) return 0;
        
        const oldLevel = hero.level;
        let newLevel = oldLevel;
        
        // Находим максимальный достижимый уровень
        while (true) {
            const nextLevelExp = this.levelThresholds[newLevel + 1];
            if (!nextLevelExp || hero.experience < nextLevelExp) break;
            newLevel++;
        }
        
        const levelsGained = newLevel - oldLevel;
        
        if (levelsGained > 0) {
            // Повышаем уровень
            hero.level = newLevel;
            
            // ⭐ Уведомляем SkillsSystem
            if (window.game && window.game.systems && window.game.systems.skills) {
                window.game.systems.skills.onHeroLevelUp(oldLevel, newLevel);
            }
        }
        
        return levelsGained;
    }
}

// Регистрируем систему в глобальной области
window.LevelSystem = LevelSystem;
console.log("📦 LevelSystem модуль загружен");
