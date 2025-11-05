// ========== MODULE: LevelSystem ==========
class LevelSystem {
    constructor() {
        this.levelRequirements = {};
        console.log("✅ LevelSystem инициализирован");
    }

    async loadLevelData() {
        try {
            console.log("📥 Загружаем данные уровней...");
            this.loadLevelRequirements();
            console.log("✅ Данные уровней загружены");
            return true;
        } catch (error) {
            console.error("❌ Ошибка загрузки данных уровней:", error);
            this.createFallbackLevels();
            return true;
        }
    }

    loadLevelRequirements() {
        this.levelRequirements = {
            1: 1,
            2: 100,
            3: 250,
            4: 500,
            5: 1000,
            6: 2000,
            7: 4000,
            8: 8000,
            9: 16000,
            10: 32000,
            11: 64000,
            12: 128000,
            13: 256000,
            14: 512000,
            15: 1024000,
        };
    }

    createFallbackLevels() {
        this.loadLevelRequirements();
    }

    getLevelRequirements() {
        return this.levelRequirements;
    }

    addExperience(hero, amount) {
        if (!hero) return;
        
        const oldLevel = hero.level;
        hero.experience += amount;
        
        let newLevel = oldLevel;
        
        // Проверка повышения уровня
        while (hero.experience >= this.levelRequirements[newLevel + 1] && this.levelRequirements[newLevel + 1]) {
            newLevel++;
        }
        
        if (newLevel > oldLevel) {
            this.levelUp(hero, newLevel);
        }
    }

    levelUp(hero, newLevel) {
        const levelsGained = newLevel - hero.level;
        hero.level = newLevel;
        
        // Увеличение характеристик
        const healthIncrease = 10 * levelsGained;
        const damageIncrease = 2 * levelsGained;
        const armorIncrease = 1 * levelsGained;
        
        hero.baseHealth += healthIncrease;
        hero.baseDamage += damageIncrease;
        hero.baseArmor += armorIncrease;
        
        // Восстанавливаем здоровье при повышении уровня
        if (hero.currentHealth) {
            hero.currentHealth += healthIncrease;
        }
        
        console.log(`🎉 ${hero.name} повышен до уровня ${newLevel}!`);
        
        this.checkHeroUnlocks(hero);
    }

    checkHeroUnlocks(hero) {
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
        
        // Здесь будет логика разблокировки новых героев
        // Пока просто логируем
        Object.keys(heroUnlockLevels).forEach(heroId => {
            const requiredLevel = heroUnlockLevels[heroId];
            if (hero.level >= requiredLevel) {
                console.log(`🔓 Разблокирован герой ID: ${heroId} (требовался уровень ${requiredLevel})`);
            }
        });
    }

    getExperienceProgress(hero) {
        const currentExp = hero.experience;
        const currentLevelReq = this.levelRequirements[hero.level] || 0;
        const nextLevelReq = this.levelRequirements[hero.level + 1];
        
        if (!nextLevelReq) {
            return { percent: 100, current: currentExp, next: 'MAX' };
        }
        
        const expForNextLevel = nextLevelReq - currentLevelReq;
        const expProgress = currentExp - currentLevelReq;
        const percent = (expProgress / expForNextLevel) * 100;
        
        return { 
            percent: Math.min(100, percent), 
            current: expProgress, 
            next: expForNextLevel 
        };
    }

    calculateHeroStats(hero, bonusSystem) {
        if (!hero) return {};
        
        const totals = bonusSystem ? bonusSystem.calculateTotalBonuses(hero) : {
            health_mult: 0, damage_mult: 0, armor_mult: 0
        };
        
        const levelMultiplier = 1 + (hero.level - 1) * 0.1;
        
        // Базовые характеристики (уровень)
        let baseHealth = hero.baseHealth * levelMultiplier;
        let baseDamage = hero.baseDamage * levelMultiplier; 
        let baseArmor = hero.baseArmor * levelMultiplier;
        
        // Применение процентных бонусов
        let health = baseHealth + (hero.baseHealth * totals.health_mult);
        let damage = baseDamage + (hero.baseDamage * totals.damage_mult);
        let armor = baseArmor + (hero.baseArmor * totals.armor_mult);
        
        // Расчет общей силы
        const power = Math.round((health / 10) + (damage * 1.5) + (armor * 2));
        
        return {
            health: Math.round(health),
            currentHealth: hero.currentHealth || Math.round(health),
            maxHealth: Math.round(health),
            damage: Math.round(damage),
            armor: Math.round(armor),
            power: power,
            baseHealth: Math.round(baseHealth),
            baseDamage: Math.round(baseDamage), 
            baseArmor: Math.round(baseArmor)
        };
    }
}

// Регистрируем систему в глобальной области
window.LevelSystem = LevelSystem;
console.log("📦 LevelSystem модуль загружен");
