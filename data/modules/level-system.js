// ========== MODULE: LevelSystem ==========
class LevelSystem {
    constructor() {
        this.levelThresholds = {};
        console.log("✅ LevelSystem инициализирован");
    }

    async loadLevelData() {
    try {
        console.log("📊 Загружаем данные уровней...");
        
        // Пробуем несколько путей
        const paths = [
            'data/levels.json',
            'levels.json',
            '../data/levels.json'
        ];
        
        let success = false;
        
        for (const path of paths) {
            try {
                console.log(`   Пробуем путь: ${path}`);
                const response = await fetch(path);
                
                if (response.ok) {
                    this.levelThresholds = await response.json();
                    console.log(`✅ Данные уровней загружены с ${path}: ${Object.keys(this.levelThresholds).length} уровней`);
                    success = true;
                    break;
                }
            } catch (e) {
                console.log(`   ❌ Ошибка с ${path}: ${e.message}`);
                continue;
            }
        }
        
        if (!success) {
            console.warn("⚠️ Не удалось загрузить levels.json, создаем стандартные значения");
            this.createFallbackLevels();
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ Ошибка загрузки данных уровней:", error);
        this.createFallbackLevels();
        return true;
    }
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
