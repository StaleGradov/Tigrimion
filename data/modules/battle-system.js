class BattleSystem {
    constructor() {
        this.battleActive = false;
        this.battleRound = 0;
        this.battleLog = [];
    }

    startBattle(hero, monster) {
        this.battleActive = true;
        this.battleRound = 0;
        this.battleLog = [];
        
        // Сброс выносливости в начале боя
        if (hero) hero.stamina = 0;
        
        // Установка текущего здоровья монстра
        if (monster) {
            monster.currentHealth = monster.health;
        }
        
        this.addBattleLog({
            message: `⚔️ Бой начался! ${hero?.name || 'Герой'} против ${monster?.name || 'Монстра'}`,
            type: 'battle-start'
        });
        
        return true;
    }

    calculateAttackDamage(attacker, isHeroAttack, bonusSystem, items) {
        if (!attacker) return { damage: 0, isCritical: false, isArmorPenetrated: false };
        
        let baseDamage = isHeroAttack ? 
            this.calculateHeroDamage(attacker, bonusSystem, items) : 
            attacker.damage;
        
        // Расчет критического удара и пенетрации будет позже
        return {
            damage: baseDamage,
            isCritical: false,
            isArmorPenetrated: false
        };
    }

    calculateHeroDamage(hero, bonusSystem, items) {
        if (!hero) return 0;
        
        const totals = bonusSystem.calculateTotalBonuses(hero, items);
        const levelMultiplier = 1 + (hero.level - 1) * 0.1;
        
        let damage = hero.baseDamage * levelMultiplier;
        damage += hero.baseDamage * totals.damage_mult;
        
        // Добавление урона от экипировки
        Object.values(hero.equipment).forEach(itemId => {
            if (itemId) {
                const item = items.find(item => item.id === itemId);
                if (item) {
                    damage += item.fixed_damage || 0;
                }
            }
        });
        
        return Math.round(damage);
    }

    addBattleLog(entry) {
        this.battleLog.push(entry);
        if (this.battleLog.length > 10) {
            this.battleLog.shift();
        }
    }

    getBattleLog() {
        return this.battleLog;
    }

    endBattle() {
        this.battleActive = false;
        this.battleRound = 0;
        this.battleLog = [];
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BattleSystem;
} else {
    window.BattleSystem = BattleSystem;
}
