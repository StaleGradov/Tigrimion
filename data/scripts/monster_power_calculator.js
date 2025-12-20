"use strict";

class MonsterPowerCalculator {
    constructor() {
        this.powerFormula = {
            healthWeight: 0.1,
            armorWeight: 2.0,
            damageWeight: 1.5
        };
    }

    /**
     * Рассчитывает мощность монстра по формуле: 0.1 * здоровье + 2 * броня + 1.5 * урон
     */
    calculatePower(monster) {
        if (!monster) return 0;
        
        const health = monster.health || 0;
        const armor = monster.armor || 0;
        const damage = monster.damage || 0;
        
        return (this.powerFormula.healthWeight * health) +
               (this.powerFormula.armorWeight * armor) +
               (this.powerFormula.damageWeight * damage);
    }

    /**
     * Выбирает монстра по заданному диапазону мощности и сложности
     */
    selectMonsterForHex(powerRange, difficulty) {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem || !battleSystem.monsters) {
            console.error("❌ BattleSystem или монстры не доступны");
            return this.getFallbackMonster();
        }

        const allMonsters = battleSystem.monsters;
        if (allMonsters.length === 0) {
            console.error("❌ Нет доступных монстров");
            return this.getFallbackMonster();
        }

        const [minPower, maxPower] = powerRange;
        const difficultyMultipliers = {
            'green': 0.7,
            'yellow': 1.0,
            'red': 1.5,
            'blue': 2.0
        };
        
        const multiplier = difficultyMultipliers[difficulty] || 1.0;
        const targetPower = (minPower + maxPower) / 2;

        console.log(`🔍 Поиск монстра: мощность ${minPower}-${maxPower}, сложность ${difficulty}, множитель ${multiplier}`);

        // 1. Ищем идеально подходящих монстров
        const perfectMatches = allMonsters.filter(monster => {
            const basePower = this.calculatePower(monster);
            const adjustedPower = basePower * multiplier;
            return adjustedPower >= minPower && adjustedPower <= maxPower;
        });

        if (perfectMatches.length > 0) {
            const selected = perfectMatches[Math.floor(Math.random() * perfectMatches.length)];
            console.log(`✅ Найден идеальный монстр: ${selected.name} (мощность: ${this.calculatePower(selected)})`);
            return this.scaleMonster(selected, multiplier);
        }

        // 2. Ищем ближайших по мощности
        const sortedByPower = [...allMonsters].sort((a, b) => {
            const powerA = this.calculatePower(a) * multiplier;
            const powerB = this.calculatePower(b) * multiplier;
            const diffA = Math.abs(powerA - targetPower);
            const diffB = Math.abs(powerB - targetPower);
            return diffA - diffB;
        });

        const closest = sortedByPower[0];
        console.log(`⚠️ Идеальный монстр не найден, берём ближайшего: ${closest.name} (мощность: ${this.calculatePower(closest)})`);
        return this.scaleMonster(closest, multiplier);
    }

    /**
     * Масштабирует монстра под сложность
     */
    scaleMonster(monster, multiplier) {
        if (multiplier === 1.0) return { ...monster };

        const scaled = {
            ...monster,
            original_health: monster.health,
            original_armor: monster.armor,
            original_damage: monster.damage,
            difficulty_multiplier: multiplier,
            base_power: this.calculatePower(monster)
        };

        // Масштабируем характеристики
        scaled.health = Math.floor(monster.health * multiplier);
        scaled.armor = Math.floor(monster.armor * multiplier);
        scaled.damage = Math.floor(monster.damage * multiplier);
        
        // Пересчитываем мощность
        scaled.scaled_power = this.calculatePower(scaled);

        console.log(`📈 Монстр масштабирован: ${monster.name}`);
        console.log(`   Здоровье: ${monster.health} → ${scaled.health}`);
        console.log(`   Броня: ${monster.armor} → ${scaled.armor}`);
        console.log(`   Урон: ${monster.damage} → ${scaled.damage}`);
        console.log(`   Мощность: ${scaled.base_power.toFixed(1)} → ${scaled.scaled_power.toFixed(1)}`);

        return scaled;
    }

    /**
     * Запасной монстр на случай ошибки
     */
    getFallbackMonster() {
        return {
            id: "fallback_wolf",
            name: "Серый волк",
            image: "",
            role: "dd_melee",
            attackType: "melee",
            health: 60,
            armor: 5,
            damage: 15,
            reward: 0.1,
            experience: 1,
            loot: {
                guaranteed: [
                    { "id": "small_bone", "quantity": 1 },
                    { "id": "thin_hide", "quantity": 1 }
                ]
            },
            is_fallback: true
        };
    }

    /**
     * Возвращает описание сложности на основе мощности
     */
    getDifficultyDescription(power) {
        if (power < 100) return { level: "легкий", color: "#4ade80", description: "Можно собрать всё" };
        if (power < 200) return { level: "средний", color: "#fbbf24", description: "Нужно выбирать" };
        if (power < 350) return { level: "сложный", color: "#ef4444", description: "Жёсткие ограничения" };
        return { level: "эпический", color: "#3b82f6", description: "Критически важно каждое действие" };
    }
}

// Регистрация глобально
if (typeof window !== 'undefined') {
    window.MonsterPowerCalculator = MonsterPowerCalculator;
    console.log("📊 MonsterPowerCalculator зарегистрирован");
}
