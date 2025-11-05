// ========== МОДУЛЬ СИСТЕМЫ БОНУСОВ И СЕТОВ ==========

class BonusSystem {
    constructor() {
        this.bonuses = this.initializeBonuses();
        this.itemSets = this.initializeItemSets();
    }

    // ========== КОНФИГУРАЦИЯ БОНУСОВ ==========
    initializeBonuses() {
        return {
            races: {
                elf: { type: "damage_mult", value: 0.2, name: "Эльф", description: "Урон +20%", source: "race" },
                human: { type: "gold_mult", value: 0.3, name: "Человек", description: "+30% золота", source: "race" },
                dwarf: { type: "health_mult", value: 0.3, name: "Гном", description: "+30% к здоровью", source: "race" }
            },
            classes: {
                warrior: { type: "armor_mult", value: 0.15, name: "Воин", description: "+15% к броне", source: "class" },
                hunter: { type: "armor_penetration", value: 0.25, name: "Охотник", description: "25% шанс игнорировать броню", source: "class" }
            },
            sagas: {
                golden_egg: { type: "health_mult", value: 0.3, name: "Золотое Яйцо", description: "+30% к здоровью", source: "saga" }
            }
        };
    }

    // ========== КОНФИГУРАЦИЯ СЕТОВ ПРЕДМЕТОВ ==========
    initializeItemSets() {
        return {
            "set_beginner": {
                name: "Крестьянина Арканиума",
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.05 },
                description: "Комплект из 6 вещей даст +5% к урону"
            }
        };
    }

    // ========== ПОЛУЧЕНИЕ ВСЕХ АКТИВНЫХ БОНУСОВ ДЛЯ ГЕРОЯ ==========
    getAllActiveBonuses(hero, items) {
        if (!hero) return { race: [], class: [], saga: [], equipment: [], sets: [] };
        
        const activeBonuses = {
            race: [],
            class: [],
            saga: [], 
            equipment: [],
            sets: []
        };
        
        // Бонусы от расы
        if (this.bonuses.races[hero.race]) {
            activeBonuses.race.push(this.bonuses.races[hero.race]);
        }
        
        // Бонусы от класса
        if (this.bonuses.classes[hero.class]) {
            activeBonuses.class.push(this.bonuses.classes[hero.class]);
        }
        
        // Бонусы от саги
        if (this.bonuses.sagas[hero.saga]) {
            activeBonuses.saga.push(this.bonuses.sagas[hero.saga]);
        }
        
        return activeBonuses;
    }

    // ========== РАСЧЕТ СУММАРНЫХ БОНУСОВ ==========
    calculateTotalBonuses(hero, items) {
        const activeBonuses = this.getAllActiveBonuses(hero, items);
        
        const totals = {
            health_mult: 0,
            damage_mult: 0, 
            armor_mult: 0,
            gold_mult: 0,
            health_regen_mult: 0,
            crit_chance: 0,
            armor_penetration: 0,
            vampirism: 0,
            all_stats_mult: 0
        };
        
        // Суммирование бонусов
        Object.values(activeBonuses).forEach(bonusGroup => {
            bonusGroup.forEach(bonus => {
                if (totals.hasOwnProperty(bonus.type)) {
                    totals[bonus.type] += bonus.value;
                }
            });
        });
        
        return totals;
    }

    getActiveSetBonuses(hero, items) {
        return [];
    }
}

// ДОБАВЬТЕ ЭТУ СТРОКУ В КОНЕЦ ФАЙЛА:
window.BonusSystem = BonusSystem;
