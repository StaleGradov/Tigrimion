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
        
        const healthIncrease = 10 * levelsGained;
        const damageIncrease = 2 * levelsGained;
        const armorIncrease = 1 * levelsGained;
        
        hero.baseHealth += healthIncrease;
        hero.baseDamage += damageIncrease;
        hero.baseArmor += armorIncrease;
        
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

    // ⭐ УЛУЧШЕННЫЙ РАСЧЕТ ХАРАКТЕРИСТИК С УЧЕТОМ ВСЕХ БОНУСОВ
    calculateHeroStats(hero, bonusSystem) {
        if (!hero) return this.getEmptyStats();
        
        // ⭐ ПРАВИЛЬНЫЙ РАСЧЕТ: база + фиксированные + (база * сумма_процентов)
        const levelMultiplier = 1 + (hero.level - 1) * 0.1;
        
        // БАЗОВЫЕ характеристики (только от героя и уровня)
        let baseHealth = Math.round(hero.baseHealth * levelMultiplier);
        let baseDamage = Math.round(hero.baseDamage * levelMultiplier);
        let baseArmor = Math.round(hero.baseArmor * levelMultiplier);
        
        // ФИКСИРОВАННЫЕ бонусы от экипировки
        let itemHealth = 0;
        let itemDamage = 0;
        let itemArmor = 0;
        
        if (hero.equipment && window.game?.systems?.equipment) {
            Object.values(hero.equipment).forEach(itemId => {
                if (itemId) {
                    const item = window.game.systems.equipment.getItemById(itemId);
                    if (item) {
                        itemHealth += item.fixed_health || 0;
                        itemDamage += item.fixed_damage || 0;
                        itemArmor += item.fixed_armor || 0;
                    }
                }
            });
        }
        
        // ⭐ ПРОЦЕНТНЫЕ бонусы (аддитивные)
        const items = window.game?.systems?.equipment?.items || [];
        const totals = bonusSystem ? bonusSystem.calculateTotalBonuses(hero, items) : {
            health_mult: 0, damage_mult: 0, armor_mult: 0,
            health_regen_mult: 0, crit_chance: 0, armor_penetration: 0, 
            vampirism: 0, gold_mult: 0
        };
        
        // ⭐ ПРАВИЛЬНЫЙ ПОРЯДОК: база + фиксированные + (база * сумма_процентов)
        let finalHealth = baseHealth + itemHealth + (baseHealth * totals.health_mult);
        let finalDamage = baseDamage + itemDamage + (baseDamage * totals.damage_mult);
        let finalArmor = baseArmor + itemArmor + (baseArmor * totals.armor_mult);
        
        // Округляем только конечные значения
        finalHealth = Math.round(finalHealth);
        finalDamage = Math.round(finalDamage);
        finalArmor = Math.round(finalArmor);
        
        // Расчет общей силы
        const power = Math.round((finalHealth / 10) + (finalDamage * 1.5) + (finalArmor * 2));
        
        // ⭐ ТЕКУЩЕЕ ЗДОРОВЬЕ - не может превышать максимальное
        const currentHealth = Math.min(hero.currentHealth || finalHealth, finalHealth);
        
        return {
            health: finalHealth,
            currentHealth: Math.floor(currentHealth),
            maxHealth: finalHealth,
            damage: finalDamage,
            armor: finalArmor,
            power: power,
            baseHealth: Math.round(baseHealth),
            baseDamage: Math.round(baseDamage), 
            baseArmor: Math.round(baseArmor),
            
            // ⭐ ДРОБНЫЕ ЗНАЧЕНИЯ для бонусов (без округления)
            healthRegen: totals.health_regen_mult,
            critChance: totals.crit_chance,
            armorPenetration: totals.armor_penetration,
            vampirism: totals.vampirism,
            goldMultiplier: totals.gold_mult,
            
            // ⭐ ИНФОРМАЦИЯ О БОНУСАХ ДЛЯ ОТЛАДКИ
            _bonuses: totals,
            _baseValues: {
                health: baseHealth,
                damage: baseDamage,
                armor: baseArmor
            },
            _itemBonuses: {
                health: itemHealth,
                damage: itemDamage, 
                armor: itemArmor
            }
        };
    }

    getEmptyStats() {
        return {
            health: 0,
            currentHealth: 0,
            maxHealth: 0,
            damage: 0,
            armor: 0,
            power: 0,
            baseHealth: 0,
            baseDamage: 0,
            baseArmor: 0,
            healthRegen: 0,
            critChance: 0,
            armorPenetration: 0,
            vampirism: 0,
            goldMultiplier: 0
        };
    }
}

// Регистрируем систему в глобальной области
window.LevelSystem = LevelSystem;
console.log("📦 LevelSystem модуль загружен");
