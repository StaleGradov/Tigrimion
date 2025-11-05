// ========== МОДУЛЬ СИСТЕМЫ УРОВНЕЙ И ОПЫТА ==========

class LevelSystem {
    constructor() {
        this.levelRequirements = this.getLevelRequirements();
    }

    // ========== ТРЕБОВАНИЯ ОПЫТА ДЛЯ УРОВНЕЙ ==========
    getLevelRequirements() {
        return {
            1: 1,
            2: 100,
            3: 250,
            4: 500,
            5: 1000,
            6: 2000,
            7: 4000,
            8: 8000,
            9: 16000,
            10: 32000
        };
    }

    // ========== ДОБАВЛЕНИЕ ОПЫТА ГЕРОЮ ==========
    addExperience(hero, amount, onLevelUp) {
        if (!hero) return;
        
        const oldLevel = hero.level;
        hero.experience += amount;
        
        let newLevel = oldLevel;
        
        // Проверка повышения уровня
        while (hero.experience >= this.levelRequirements[newLevel + 1] && this.levelRequirements[newLevel + 1]) {
            newLevel++;
        }
        
        if (newLevel > oldLevel) {
            this.levelUp(hero, newLevel, onLevelUp);
        }
    }

    // ========== ПОВЫШЕНИЕ УРОВНЯ ГЕРОЯ ==========
    levelUp(hero, newLevel, onLevelUp) {
        const levelsGained = newLevel - hero.level;
        hero.level = newLevel;
        
        // Увеличение характеристик
        const healthIncrease = 10 * levelsGained;
        const damageIncrease = 2 * levelsGained;
        const armorIncrease = 1 * levelsGained;
        
        hero.baseHealth += healthIncrease;
        hero.baseDamage += damageIncrease;
        hero.baseArmor += armorIncrease;
        
        // Вызов callback для обновления интерфейса
        if (onLevelUp) {
            onLevelUp({
                newLevel,
                levelsGained,
                healthIncrease,
                damageIncrease,
                armorIncrease
            });
        }
    }

    // ========== ПРОВЕРКА РАЗБЛОКИРОВКИ ГЕРОЕВ ==========
    checkHeroUnlocks(hero, heroesList, onUnlock) {
        if (!hero) return;
        
        const heroUnlockLevels = {
            2: 10,
            3: 15,
            4: 20,
            5: 25,
            6: 30,
            7: 35,
            8: 40
        };
        
        Object.keys(heroUnlockLevels).forEach(heroId => {
            const requiredLevel = heroUnlockLevels[heroId];
            const targetHero = heroesList.find(h => h.id === parseInt(heroId));
            if (targetHero && !targetHero.unlocked && hero.level >= requiredLevel) {
                targetHero.unlocked = true;
                if (onUnlock) {
                    onUnlock(targetHero);
                }
            }
        });
    }
}

// ДОБАВЬТЕ ЭТУ СТРОКУ В КОНЕЦ ФАЙЛА:
window.LevelSystem = LevelSystem;
