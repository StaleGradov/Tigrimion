// ========== MODULE: BonusSystem ==========
class BonusSystem {
    constructor() {
        this.bonuses = {};
        this.itemSetConfig = {};
        console.log("✅ BonusSystem инициализирован");
    }

    async loadBonusData() {
        try {
            console.log("📥 Загружаем данные бонусов...");
            this.loadAllBonuses();
            this.loadItemSetConfig();
            console.log("✅ Данные бонусов загружены");
            return true;
        } catch (error) {
            console.error("❌ Ошибка загрузки данных бонусов:", error);
            this.createFallbackBonuses();
            return true;
        }
    }

    loadAllBonuses() {
        this.bonuses = {
            races: {
                elf: { type: "damage_mult", value: 0.2, name: "Эльф", description: "Урон +20%", source: "race" },
                halfling: { type: "crit_chance", value: 0.2, name: "Полурослик", description: "20% шанс двойного урона", source: "race" },
                human: { type: "gold_mult", value: 0.3, name: "Человек", description: "+30% золота за противника", source: "race" },
                laitar: { type: "vampirism", value: 0.05, name: "Лайтар", description: "5% урона восстанавливает здоровье", source: "race" },
                ork: { type: "health_regen_mult", value: 0.3, name: "Орк", description: "+30% к регенерации здоровья", source: "race" },
                dwarf: { type: "health_mult", value: 0.3, name: "Гном", description: "+30% к здоровью", source: "race" },
                dragon: { type: "armor_mult", value: 0.15, name: "Дракон", description: "+15% к броне", source: "race" },
                fairy: { type: "armor_penetration", value: 0.25, name: "Фея", description: "25% шанс игнорировать броню", source: "race" }
            },
            classes: {
                hunter: { type: "armor_penetration", value: 0.25, name: "Охотник", description: "25% шанс игнорировать броню", source: "class" },
                warrior: { type: "armor_mult", value: 0.15, name: "Воин", description: "+15% к броне", source: "class" },
                bounty_hunter: { type: "crit_chance", value: 0.2, name: "Охотник за головами", description: "20% шанс двойного урона", source: "class" },
                merchant: { type: "gold_mult", value: 0.3, name: "Торговец", description: "+30% золота за противника", source: "class" },
                thief: { type: "gold_mult", value: 0.3, name: "Вор", description: "+30% золота за противника", source: "class" },
                fighter: { type: "health_regen_mult", value: 0.3, name: "Кулачный боец", description: "+30% к регенерации", source: "class" },
                antiquarian: { type: "gold_mult", value: 0.3, name: "Искатель древностей", description: "+30% золота за противника", source: "class" },
                death_mage: { type: "vampirism", value: 0.05, name: "Волхв смерти", description: "5% урона восстанавливает здоровье", source: "class" },
                sorcerer: { type: "damage_mult", value: 0.2, name: "Колдун", description: "Урон +20%", source: "class" },
                archer: { type: "crit_chance", value: 0.2, name: "Лучник", description: "20% шанс двойного урона", source: "class" },
                healer: { type: "health_mult", value: 0.3, name: "Знахарь", description: "+30% к здоровью", source: "class" },
                gladiator: { type: "damage_mult", value: 0.2, name: "Гладиатор", description: "Урон +20%", source: "class" },
                blacksmith: { type: "armor_mult", value: 0.15, name: "Кузнец", description: "+15% к броне", source: "class" }
            },
            sagas: {
                golden_egg: { type: "health_mult", value: 0.3, name: "Золотое Яйцо", description: "+30% к здоровью", source: "saga" },
                vulkanor: { type: "armor_penetration", value: 0.25, name: "Вулканор", description: "25% шанс игнорировать броню", source: "saga" },
                well: { type: "gold_mult", value: 0.3, name: "Колодец", description: "+30% золота за противника", source: "saga" },
                pets: { type: "damage_mult", value: 0.2, name: "Питомец", description: "Урон +20%", source: "saga" },
                following_sun: { type: "health_regen_mult", value: 0.3, name: "Вслед за солнцем", description: "+30% к регенерации", source: "saga" },
                vampire_crown: { type: "vampirism", value: 0.05, name: "Корона короля вампиров", description: "5% урона восстанавливает здоровье", source: "saga" },
                tiger_eye: { type: "crit_chance", value: 0.2, name: "Желтый Глаз тигра", description: "20% шанс двойного урона", source: "saga" },
                sky_phenomena: { type: "armor_mult", value: 0.15, name: "Небесные явления", description: "+15% к броне", source: "saga" }
            }
        };
    }

    loadItemSetConfig() {
        this.itemSetConfig = {
            "set_beginner": {
                name: "Крестьянина Арканиума",
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.05 },
                description: "Комплект из 6 вещей даст +5% к урону"
            },
            "set_warrior": {
                name: "Ополченца Арканиума", 
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.1 },
                description: "Комплект из 6 вещей даст +10% к урону"
            },
            "set_guardian": {
                name: "Милитанта Арканиума",
                requiredPieces: 6, 
                bonus: { type: "damage_mult", value: 0.15 },
                description: "Комплект из 6 вещей даст +15% к урону"
            },
            "set_hunter": {
                name: "Ветерана Арканиума",
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.2 },
                description: "Комплект из 6 вещей даст +20% к урону"
            },
            "set_complete": {
                name: "Командира ополчения Арканиума",
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.25 },
                description: "Комплект из 6 вещей даст +25% к урону"
            },
            "set_king": {
                name: "Стратегоса Арканиума",
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.3 },
                description: "Комплект из 6 вещей даст +30% к урону"
            },
            "set_crit1": {
                name: "Охотника Арканиума",
                requiredPieces: 6,
                bonus: { type: "crit_chance", value: 0.05 },
                description: "Комплект из 6 вещей даст +5% к шансу критического удара(наносящего х2 урона)"
            },
            "set_crit2": {
                name: "Разведчика Арканиума",
                requiredPieces: 6,
                bonus: { type: "crit_chance", value: 0.1 },
                description: "Комплект из 6 вещей даст +10% к шансу критического удара(наносящего х2 урона)"
            },
            "set_crit3": {
                name: "Лучника Арканиума",
                requiredPieces: 6,
                bonus: { type: "crit_chance", value: 0.15 },
                description: "Комплект из 6 вещей даст +15% к шансу критического удара(наносящего х2 урона)"
            },
            "set_crit4": {
                name: "Элитного стрелка Арканиума",
                requiredPieces: 6,
                bonus: { type: "crit_chance", value: 0.2 },
                description: "Комплект из 6 вещей даст +20% к шансу критического удара(наносящего х2 урона)"
            },
            "set_crit5": {
                name: "Командира лучников Арканиума",
                requiredPieces: 6,
                bonus: { type: "crit_chance", value: 0.25 },
                description: "Комплект из 6 вещей даст +25% к шансу критического удара(наносящего х2 урона)"
            },
            "set_crit6": {
                name: "Легендарного стрелка Арканиума",
                requiredPieces: 6,
                bonus: { type: "crit_chance", value: 0.3 },
                description: "Комплект из 6 вещей даст +30% к шансу критического удара(наносящего х2 урона)"
            },
            "set_penetration1": {
                name: "Стрелка Арканиума",
                requiredPieces: 6,
                bonus: { type: "armor_penetration", value: 0.06 },
                description: "Комплект из 6 вещей даст +6% к шансу игрорирования брони соперника"
            },
            "set_penetration2": {
                name: "Следопыта Арканиума",
                requiredPieces: 6,
                bonus: { type: "armor_penetration", value: 0.12 },
                description: "Комплект из 6 вещей даст +12% к шансу игрорирования брони соперника"
            },
            "set_penetration3": {
                name: "Охотника на монстров Арканиума",
                requiredPieces: 6,
                bonus: { type: "armor_penetration", value: 0.18 },
                description: "Комплект из 6 вещей даст +18% к шансу игрорирования брони соперника"
            },
            "set_penetration4": {
                name: "Наемного убийцы Магнатов Арканиума",
                requiredPieces: 6,
                bonus: { type: "armor_penetration", value: 0.24 },
                description: "Комплект из 6 вещей даст +24% к шансу игрорирования брони соперника"
            },
            "set_penetration5": {
                name: "Командира арбалетчиков Арканиума",
                requiredPieces: 6,
                bonus: { type: "armor_penetration", value: 0.3 },
                description: "Комплект из 6 вещей даст +30% к шансу игрорирования брони соперника"
            },
            "set_penetration6": {
                name: "Мастера над арбалетами Арканиума",
                requiredPieces: 6,
                bonus: { type: "armor_penetration", value: 0.36 },
                description: "Комплект из 6 вещей даст +36% к шансу игрорирования брони соперника"
            },
            "set_rich1": {
                name: "Сборщика трофеев Арканиума",
                requiredPieces: 6,
                bonus: { type: "gold_mult", value: 0.05 },
                description: "Комплект из 6 вещей даст +5% к награде в золоте за убийство монстра"
            },
            "set_rich2": {
                name: "Охотник на редких животных Арканиума",
                requiredPieces: 6,
                bonus: { type: "gold_mult", value: 0.1 },
                description: "Комплект из 6 вещей даст +10% к награде в золоте за убийство монстра"
            },
            "set_rich3": {
                name: "Профессионального истребителя опасных существ Арканиума",
                requiredPieces: 6,
                bonus: { type: "gold_mult", value: 0.15 },
                description: "Комплект из 6 вещей даст +15% к награде в золоте за убийство монстра"
            },
            "set_rich4": {
                name: "Коллекционера Арканиума",
                requiredPieces: 6,
                bonus: { type: "gold_mult", value: 0.2 },
                description: "Комплект из 6 вещей даст +20% к награде в золоте за убийство монстра"
            },
            "set_rich5": {
                name: "Ловца королевских тварей Арканиума",
                requiredPieces: 6,
                bonus: { type: "gold_mult", value: 0.25 },
                description: "Комплект из 6 вещей даст +25% к награде в золоте за убийство монстра"
            },
            "set_rich6": {
                name: "Легендарного зверолова Арканиума",
                requiredPieces: 6,
                bonus: { type: "gold_mult", value: 0.3 },
                description: "Комплект из 6 вещей даст +30% к награде в золоте за убийство монстра"
            },
            "set_vampire1": {
                name: "Убийцы Арканиума",
                requiredPieces: 6,
                bonus: { type: "vampirism", value: 0.01 },
                description: "Комплект из 6 вещей даст +1% к вампиризму"
            },
            "set_vampire2": {
                name: "Наемного убийцы Арканиума",
                requiredPieces: 6,
                bonus: { type: "vampirism", value: 0.02 },
                description: "Комплект из 6 вещей даст +2% к вампиризму"
            },
            "set_vampire3": {
                name: "Темного стража Арканиума",
                requiredPieces: 6,
                bonus: { type: "vampirism", value: 0.03 },
                description: "Комплект из 6 вещей даст +3% к вампиризму"
            },
            "set_vampire4": {
                name: "Легендарного зверолова Арканиума",
                requiredPieces: 6,
                bonus: { type: "vampirism", value: 0.04 },
                description: "Комплект из 6 вещей даст +4% к вампиризму"
            },
            "set_vampire5": {
                name: "Охотника на вампиров, ставшего вампиром",
                requiredPieces: 6,
                bonus: { type: "vampirism", value: 0.05 },
                description: "Комплект из 6 вещей даст +5% к вампиризму"
            },
            "set_vampire6": {
                name: "Лорда вампиров...Арканиума? Откуда у лорда вампиров могли взяться доспехи из костей драконов..? Неужели драконы были здесь во времена вампиров?  ",
                requiredPieces: 6,
                bonus: { type: "vampirism", value: 0.06 },
                description: "Комплект из 6 вещей даст +6% к вампиризму"
            },
            "set_regen1": {
                name: "Грабителя Арканиума",
                requiredPieces: 6,
                bonus: { type: "health_regen_mult", value: 0.05 },
                description: "Комплект из 6 вещей даст +5% к регенерации здоровья"
            },
            "set_regen2": {
                name: "Бандита Арканиума",
                requiredPieces: 6,
                bonus: { type: "health_regen_mult", value: 0.1 },
                description: "Комплект из 6 вещей даст +10% к регенерации здоровья"
            },
            "set_regen3": {
                name: "Опытного разбойника",
                requiredPieces: 6,
                bonus: { type: "health_regen_mult", value: 0.2 },
                description: "Комплект из 6 вещей даст +20% к регенерации здоровья"
            },
            "set_regen4": {
                name: "Вожака банды Арканиума",
                requiredPieces: 6,
                bonus: { type: "health_regen_mult", value: 0.4 },
                description: "Комплект из 6 вещей даст +40% к регенерации здоровья"
            },
            "set_regen5": {
                name: "Берсерка, лучшего бойца воровской гильдии Арканиума",
                requiredPieces: 6,
                bonus: { type: "health_regen_mult", value: 0.8 },
                description: "Комплект из 6 вещей даст +80% к регенерации здоровья"
            },
            "set_regen6": {
                name: "Короля воров Арканиума",
                requiredPieces: 6,
                bonus: { type: "health_regen_mult", value: 1.6 },
                description: "Комплект из 6 вещей даст +160% к регенерации здоровья"
            }
        };
    }

    createFallbackBonuses() {
        this.loadAllBonuses();
        this.loadItemSetConfig();
    }

    getBonuses() {
        return this.bonuses;
    }

    getItemSetConfig() {
        return this.itemSetConfig;
    }

    getAllActiveBonuses(hero) {
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

    getActiveSetBonuses(hero, items) {
        if (!hero || !items) return [];
        
        const equippedItems = Object.values(hero.equipment)
            .filter(itemId => itemId !== null)
            .map(itemId => items.find(item => item.id === itemId))
            .filter(item => item !== undefined);
        
        const setCounts = {};
        equippedItems.forEach(item => {
            if (item.setName) {
                setCounts[item.setName] = (setCounts[item.setName] || 0) + 1;
            }
        });
        
        const activeSetBonuses = [];
        
        Object.keys(setCounts).forEach(setName => {
            const setConfig = this.itemSetConfig[setName];
            if (setConfig && setCounts[setName] >= setConfig.requiredPieces) {
                activeSetBonuses.push({
                    setName: setName,
                    pieces: setCounts[setName],
                    bonus: setConfig.bonus,
                    description: setConfig.description
                });
            }
        });
        
        return activeSetBonuses;
    }

   calculateTotalBonuses(hero, items = []) {
    const activeBonuses = this.getAllActiveBonuses(hero);
    const setBonuses = this.getActiveSetBonuses(hero, items);
    
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
    
    // Суммирование обычных бонусов (без округления)
    Object.values(activeBonuses).forEach(bonusGroup => {
        bonusGroup.forEach(bonus => {
            if (totals.hasOwnProperty(bonus.type)) {
                totals[bonus.type] += bonus.value; // Просто складываем значения
            }
        });
    });
    
    // Добавление бонусов от сетов (без округления)
    setBonuses.forEach(setBonus => {
        if (setBonus.bonus && totals.hasOwnProperty(setBonus.bonus.type)) {
            totals[setBonus.bonus.type] += setBonus.bonus.value; // Просто складываем значения
        }
    });
    
    // Применение бонуса "все характеристики" к отдельным статам
    if (totals.all_stats_mult > 0) {
        totals.health_mult += totals.all_stats_mult;
        totals.damage_mult += totals.all_stats_mult;
        totals.armor_mult += totals.all_stats_mult;
        totals.health_regen_mult += totals.all_stats_mult;
    }
    
    return totals;
}
        
        // Суммирование обычных бонусов
        Object.values(activeBonuses).forEach(bonusGroup => {
            bonusGroup.forEach(bonus => {
                if (totals.hasOwnProperty(bonus.type)) {
                    totals[bonus.type] += bonus.value;
                }
            });
        });
        
        // Добавление бонусов от сетов
        setBonuses.forEach(setBonus => {
            if (setBonus.bonus && totals.hasOwnProperty(setBonus.bonus.type)) {
                totals[setBonus.bonus.type] += setBonus.bonus.value;
            }
        });
        
        // Применение бонуса "все характеристики" к отдельным статам
        if (totals.all_stats_mult > 0) {
            totals.health_mult += totals.all_stats_mult;
            totals.damage_mult += totals.all_stats_mult;
            totals.armor_mult += totals.all_stats_mult;
            totals.health_regen_mult += totals.all_stats_mult;
        }
        
        return totals;
    }

    getBonusIcon(bonusType) {
        const icons = {
            'health_mult': '❤️',
            'damage_mult': '⚔️',
            'armor_mult': '🛡️',
            'gold_mult': '💰',
            'health_regen_mult': '⚡',
            'crit_chance': '💥',
            'armor_penetration': '⚡',
            'vampirism': '🩸'
        };
        return icons[bonusType] || '🎯';
    }

  formatBonus(bonus) {
    if (!bonus || bonus.type === 'none') return 'Нет бонуса';
    
    const bonusNames = {
        'health_mult': 'Здоровье',
        'damage_mult': 'Урон', 
        'armor_mult': 'Броня',
        'gold_mult': 'Золото',
        'health_regen_mult': 'Регенерация',
        'crit_chance': 'Криты',
        'armor_penetration': 'Пенетрация',
        'vampirism': 'Вампиризм'
    };

    // Изменяем форматирование для отображения десятичных долей
    const value = bonus.type.includes('_mult') ? 
        (bonus.value * 100).toFixed(1) : (bonus.value * 100).toFixed(1);
        
    return bonusNames[bonus.type] ? 
        `${bonusNames[bonus.type]} +${value}%` : 
        `Бонус: +${value}%`;
}

        const value = bonus.type.includes('_mult') ? 
            Math.round(bonus.value * 100) : Math.round(bonus.value * 100);
            
        return bonusNames[bonus.type] ? 
            `${bonusNames[bonus.type]} +${value}%` : 
            `Бонус: +${value}%`;
    }

    // Метод для получения бонусов от экипировки (будет использоваться основным классом)
    getEquipmentBonuses(hero, items) {
        if (!hero || !items) return [];
        
        const equipmentBonuses = [];
        Object.values(hero.equipment).forEach(itemId => {
            if (itemId) {
                const item = items.find(item => item.id === itemId);
                if (item && item.bonus) {
                    equipmentBonuses.push({
                        ...item.bonus,
                        source: "equipment",
                        itemName: item.name
                    });
                }
            }
        });
        
        return equipmentBonuses;
    }

    // Комплексный метод для получения всех бонусов (раса, класс, сага, экипировка, сеты)
    getAllBonusesWithEquipment(hero, items) {
        if (!hero) return { race: [], class: [], saga: [], equipment: [], sets: [] };
        
        const baseBonuses = this.getAllActiveBonuses(hero);
        const equipmentBonuses = this.getEquipmentBonuses(hero, items);
        const setBonuses = this.getActiveSetBonuses(hero, items);
        
        const setBonusObjects = setBonuses.map(setBonus => ({
            ...setBonus.bonus,
            source: "set",
            setName: setBonus.setName,
            pieces: setBonus.pieces,
            description: setBonus.description
        }));
        
        return {
            race: baseBonuses.race,
            class: baseBonuses.class,
            saga: baseBonuses.saga,
            equipment: equipmentBonuses,
            sets: setBonusObjects
        };
    }

    // Метод для расчета характеристик с учетом всех бонусов
    calculateStatsWithBonuses(baseStats, hero, items = []) {
        const totals = this.calculateTotalBonuses(hero, items);
        
        let health = baseStats.health || 0;
        let damage = baseStats.damage || 0;
        let armor = baseStats.armor || 0;
        
        // Применение процентных бонусов
        if (baseStats.baseHealth) health += baseStats.baseHealth * totals.health_mult;
        if (baseStats.baseDamage) damage += baseStats.baseDamage * totals.damage_mult;
        if (baseStats.baseArmor) armor += baseStats.baseArmor * totals.armor_mult;
        
        return {
            health: Math.round(health),
            damage: Math.round(damage),
            armor: Math.round(armor),
            bonuses: totals
        };
    }
}

// Регистрируем систему в глобальной области
window.BonusSystem = BonusSystem;
console.log("📦 BonusSystem модуль загружен");
