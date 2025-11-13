// ========== MODULE: HeroSystem ==========
class HeroSystem {
    constructor() {
        this.heroes = [];
        this.currentHero = null;
        console.log("✅ HeroSystem инициализирован");
    }

    async loadHeroData() {
        try {
            console.log("📥 Загружаем данные героев...");
            
            const response = await fetch('data/heroes.json');
            if (!response.ok) {
                throw new Error(`Ошибка загрузки heroes.json: ${response.status}`);
            }
            
            const loadedHeroes = await response.json();
            
            // Инициализируем поля которые могут отсутствовать в JSON
            this.heroes = loadedHeroes.map(hero => ({
                ...hero,
                inventory: hero.inventory || [],
                equipment: {
                    main_hand: hero.equipment?.main_hand || null,
                    off_hand: hero.equipment?.off_hand || null,
                    helmet: hero.equipment?.helmet || null,
                    chest: hero.equipment?.chest || null,
                    gloves: hero.equipment?.gloves || null,
                    legs: hero.equipment?.legs || null,
                    boots: hero.equipment?.boots || null
                },
                unlocked: hero.unlocked !== undefined ? hero.unlocked : (hero.id === 1),
                currentHealth: hero.currentHealth || hero.baseHealth,
                monstersKilled: hero.monstersKilled || 0,
                deaths: hero.deaths || 0,
                healthRegen: hero.healthRegen || 1.0
            }));
            
            console.log(`✅ Загружено героев: ${this.heroes.length}`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных героев:", error);
            this.createFallbackHero();
            return true;
        }
    }

    createFallbackHero() {
        this.heroes = [{
            id: 1,
            name: "Начальный герой",
            image: "images/heroes/hero1.jpg",
            race: "human",
            class: "warrior",
            saga: "golden_egg",
            baseHealth: 100,
            baseDamage: 20,
            baseArmor: 10,
            gold: 500.00,
            level: 1,
            experience: 0,
            monstersKilled: 0,
            deaths: 0,
            healthRegen: 1.0,
            inventory: [],
            equipment: {
                main_hand: null,
                off_hand: null,
                helmet: null,
                chest: null,
                gloves: null,
                legs: null,
                boots: null
            },
            unlocked: true,
            currentHealth: 100,
            story: "Простой воин из далекой деревни..."
        }];
        
        console.log("🔄 Создан тестовый герой");
    }

    // ========== ВЫБОР И УПРАВЛЕНИЕ ГЕРОЯМИ ==========
    selectHero(heroId) {
        const hero = this.heroes.find(h => h.id === heroId);
        if (!hero) {
            console.error('Герой не найден:', heroId);
            return;
        }

        const isUnlocked = hero.unlocked;
        if (!isUnlocked) {
            console.log('Герой заблокирован:', hero.name);
            this.showNotification(`❌ Герой ${hero.name} заблокирован!`);
            return;
        }

        this.currentHero = hero;
        console.log(`🎯 Выбран герой: ${hero.name}`);
        
        // Сохраняем в основной игре
        if (window.game) {
            window.game.currentHero = hero;
            window.game.systems.equipment.setCurrentHero(hero);
            
            // ⭐ СИНХРОНИЗАЦИЯ С ДРУГИМИ СИСТЕМАМИ
            if (window.game.systems.battle) {
                window.game.systems.battle.currentHero = hero;
            }
            if (window.game.systems.shop) {
                window.game.systems.shop.currentHero = hero;
            }
            
            // СОХРАНЯЕМ ПРИ СМЕНЕ ГЕРОЯ
            window.game.saveGame();
        }
        
        this.showHeroGameScreen();
    }

    unlockHero(heroId) {
        const hero = this.heroes.find(h => h.id === heroId);
        if (hero && !hero.unlocked) {
            hero.unlocked = true;
            this.showNotification(`🎉 Герой ${hero.name} разблокирован!`);
            // СОХРАНЯЕМ ПРИ РАЗБЛОКИРОВКЕ
            if (window.game) window.game.saveGame();
            
            // ⭐ ОБНОВЛЯЕМ ИНТЕРФЕЙС
            this.showHeroSelection();
            
            return true;
        }
        return false;
    }

    // ========== РАСЧЕТ ХАРАКТЕРИСТИК ==========
    calculateHeroStats(hero = null) {
        // ⭐ ИСПРАВЛЕНИЕ: Проверяем все возможные источники героя
        let targetHero = hero || this.currentHero || window.game?.currentHero;
        
        if (!targetHero) {
            console.error("❌ calculateHeroStats: Герой не найден!", {
                providedHero: hero,
                systemHero: this.currentHero,
                gameHero: window.game?.currentHero
            });
            return { 
                currentHealth: 0, maxHealth: 0, damage: 0, armor: 0, power: 0,
                activeBonuses: []
            };
        }
        
        console.log("🔍 calculateHeroStats вызван для героя:", targetHero.name);
        
        // Базовые характеристики с учетом уровня
        const levelMultiplier = 1 + (targetHero.level - 1) * 0.1;
        
        let baseMaxHealth = Math.round(targetHero.baseHealth * levelMultiplier);
        let baseDamage = Math.round(targetHero.baseDamage * levelMultiplier);
        let baseArmor = Math.round(targetHero.baseArmor * levelMultiplier);
        
        console.log("📊 Базовые статы:", { baseMaxHealth, baseDamage, baseArmor });
        
        // Бонусы от экипировки - ФИКСИРОВАННЫЕ значения
        let equipmentHealth = 0;
        let equipmentDamage = 0;
        let equipmentArmor = 0;
        
        // ПРОЦЕНТНЫЕ бонусы от экипировки (для отображения)
        let equipmentPercentBonuses = [];
        
        // Применяем бонусы от предметов
        Object.values(targetHero.equipment || {}).forEach(itemId => {
            if (itemId && window.game && window.game.systems.equipment) {
                const item = window.game.systems.equipment.getItemById(itemId);
                if (item) {
                    console.log("🎒 Предмет экипировки:", item.name, item.bonus);
                    
                    // ФИКСИРОВАННЫЕ бонусы
                    equipmentDamage += item.fixed_damage || 0;
                    equipmentArmor += item.fixed_armor || 0;
                    equipmentHealth += item.fixed_health || 0;
                    
                    // ПРОЦЕНТНЫЕ бонусы (добавляем в массив для системы бонусов)
                    if (item.bonus && item.bonus.type !== 'none') {
                        equipmentPercentBonuses.push({
                            ...item.bonus,
                            source: "equipment",
                            itemName: item.name
                        });
                    }
                }
            }
        });
        
        console.log("🎯 Бонусы от экипировки:", { 
            equipmentHealth, 
            equipmentDamage, 
            equipmentArmor,
            percentBonuses: equipmentPercentBonuses 
        });
        
        // Промежуточные значения с фиксированными бонусами
        let intermediateHealth = baseMaxHealth + equipmentHealth;
        let intermediateDamage = baseDamage + equipmentDamage;
        let intermediateArmor = baseArmor + equipmentArmor;
        
        console.log("📈 Промежуточные статы (после фикс. бонусов):", {
            health: intermediateHealth,
            damage: intermediateDamage, 
            armor: intermediateArmor
        });
        
        // Активные бонусы для отображения
        let activeBonuses = [];
        let finalHealth = intermediateHealth;
        let finalDamage = intermediateDamage;
        let finalArmor = intermediateArmor;
        
        if (window.game && window.game.systems.bonus) {
            try {
                console.log("🎲 Проверяем систему бонусов...");
                
                // Создаем временного героя с промежуточными статами для расчета процентных бонусов
                const tempHeroForBonusCalc = {
                    ...targetHero,
                    baseHealth: intermediateHealth,
                    baseDamage: intermediateDamage, 
                    baseArmor: intermediateArmor
                };
                
                // Проверяем бонусы расы/класса/саги
                const raceBonus = window.game.systems.bonus.bonuses.races[targetHero.race];
                const classBonus = window.game.systems.bonus.bonuses.classes[targetHero.class];
                const sagaBonus = window.game.systems.bonus.bonuses.sagas[targetHero.saga];
                
                console.log("🧬 Бонус расы:", raceBonus);
                console.log("⚔️ Бонус класса:", classBonus);
                console.log("📖 Бонус саги:", sagaBonus);
                
                // Получаем все предметы для расчета сетов
                const items = window.game.systems.equipment ? window.game.systems.equipment.items : [];
                
                // ⭐ КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: передаем промежуточные статы для процентных бонусов
                const totals = window.game.systems.bonus.calculateTotalBonuses(tempHeroForBonusCalc, items);
                
                console.log("📊 РАССЧИТАННЫЕ БОНУСЫ:", totals);
                
                // Применяем процентные бонусы к ПРОМЕЖУТОЧНЫМ характеристикам
                finalHealth = Math.round(intermediateHealth * (1 + totals.health_mult));
                finalDamage = Math.round(intermediateDamage * (1 + totals.damage_mult));
                finalArmor = Math.round(intermediateArmor * (1 + totals.armor_mult));
                
                console.log("📊 Статы после процентных бонусов:", {
                    health: finalHealth,
                    damage: finalDamage,
                    armor: finalArmor
                });
                
                // ⭐ ФИЛЬТРАЦИЯ БОНУСОВ: показываем только активные (value > 0)
                activeBonuses = [
                    {
                        type: 'health_mult',
                        value: totals.health_mult,
                        label: '💪 Здоровье',
                        display: `+${(totals.health_mult * 100).toFixed(1)}%`
                    },
                    {
                        type: 'damage_mult',
                        value: totals.damage_mult,
                        label: '⚔️ Урон', // ⭐ ИЗМЕНЕНО: "Мощь" → "Урон"
                        display: `+${(totals.damage_mult * 100).toFixed(1)}%`
                    },
                    {
                        type: 'armor_mult',
                        value: totals.armor_mult,
                        label: '🛡️ Броня', // ⭐ ИЗМЕНЕНО: "Защита" → "Броня"
                        display: `+${(totals.armor_mult * 100).toFixed(1)}%`
                    },
                    {
                        type: 'crit_chance',
                        value: totals.crit_chance,
                        label: '🎯 Крит',
                        display: `${(totals.crit_chance * 100).toFixed(1)}%`
                    },
                    {
                        type: 'health_regen_mult',
                        value: totals.health_regen_mult,
                        label: '❤️ Реген',
                        display: `+${(totals.health_regen_mult * 100).toFixed(1)}%`
                    },
                    {
                        type: 'vampirism',
                        value: totals.vampirism,
                        label: '🩸 Вампир',
                        display: `${(totals.vampirism * 100).toFixed(1)}%`
                    },
                    {
                        type: 'armor_penetration',
                        value: totals.armor_penetration,
                        label: '💥 Пенетрация',
                        display: `${(totals.armor_penetration * 100).toFixed(1)}%`
                    },
                    {
                        type: 'gold_mult',
                        value: totals.gold_mult,
                        label: '💰 Золото',
                        display: `+${(totals.gold_mult * 100).toFixed(1)}%`
                    }
                ].filter(bonus => bonus.value > 0); // ⭐ ФИЛЬТРУЕМ ТОЛЬКО АКТИВНЫЕ БОНУСЫ
                
                console.log("🎯 АКТИВНЫЕ БОНУСЫ ДЛЯ ОТОБРАЖЕНИЯ (после фильтрации):", activeBonuses);
                
            } catch (error) {
                console.error("💥 Ошибка расчета бонусов:", error);
                // В случае ошибки используем промежуточные значения
                finalHealth = intermediateHealth;
                finalDamage = intermediateDamage;
                finalArmor = intermediateArmor;
            }
        } else {
            console.warn("⚠️ Система бонусов не доступна!");
            // Если система бонусов недоступна, используем промежуточные значения
            finalHealth = intermediateHealth;
            finalDamage = intermediateDamage;
            finalArmor = intermediateArmor;
        }
        
        // Рассчитываем текущее здоровье (не может превышать максимальное)
        const currentHealth = Math.min(targetHero.currentHealth || finalHealth, finalHealth);
        
        // Мощность героя для сравнения
        const power = Math.round((finalHealth / 10) + (finalDamage * 1.5) + (finalArmor * 2));
        
        console.log("✅ ФИНАЛЬНЫЕ СТАТЫ:", {
            currentHealth, 
            maxHealth: finalHealth, 
            damage: finalDamage, 
            armor: finalArmor, 
            power
        });
        
        const result = {
            currentHealth: Math.floor(currentHealth),
            maxHealth: Math.round(finalHealth),
            damage: Math.round(finalDamage),
            armor: Math.round(finalArmor),
            power: power,
            activeBonuses: activeBonuses
        };
        
        // ⭐ ВАЖНОЕ ДОБАВЛЕНИЕ: Обновляем интерфейс если это текущий герой
        if (targetHero === (this.currentHero || window.game?.currentHero)) {
            setTimeout(() => {
                this.updateHeroDisplay(result);
            }, 0);
        }
        
        return result;
    }

    // ⭐ НОВЫЙ МЕТОД: Обновление отображения героя
    updateHeroDisplay(stats) {
        const currentHero = this.currentHero || window.game?.currentHero;
        if (!currentHero) return;
        
        console.log("🔄 Обновление интерфейса героя...");
        
        // Обновляем полоску здоровья
        const healthBar = document.getElementById('heroHealthBar');
        if (healthBar) {
            const healthPercent = (stats.currentHealth / stats.maxHealth) * 100;
            healthBar.style.width = `${healthPercent}%`;
            healthBar.textContent = `${stats.currentHealth}/${stats.maxHealth}`;
            
            if (currentHero.currentHealth < stats.maxHealth) {
                healthBar.classList.add('regening');
            } else {
                healthBar.classList.remove('regening');
            }
        }
        
        // Обновляем полоску опыта
        const expBar = document.getElementById('heroExperienceBar');
        if (expBar) {
            const expPercent = this.getExperiencePercent(currentHero);
            const neededExp = this.getExperienceForNextLevel(currentHero.level);
            expBar.style.width = `${expPercent}%`;
            expBar.textContent = `${currentHero.experience}/${neededExp}`;
        }
        
        // Находим элементы DOM для обновления
        const healthElements = document.querySelectorAll('.overlay-stat-row:nth-child(1) .overlay-stat-value');
        const damageElements = document.querySelectorAll('.overlay-stat-row:nth-child(2) .overlay-stat-value');
        const armorElements = document.querySelectorAll('.overlay-stat-row:nth-child(3) .overlay-stat-value');
        const powerElements = document.querySelectorAll('.overlay-stat-row:nth-child(5) .overlay-stat-value');
        
        // Обновляем значения в первой группе статов
        if (healthElements[0]) {
            healthElements[0].textContent = `${stats.currentHealth}/${stats.maxHealth}`;
            console.log("❤️ Здоровье обновлено:", `${stats.currentHealth}/${stats.maxHealth}`);
        }
        if (damageElements[0]) {
            damageElements[0].textContent = `${stats.damage}`;
            console.log("⚔️ Урон обновлен:", stats.damage);
        }
        if (armorElements[0]) {
            armorElements[0].textContent = `${stats.armor}`;
            console.log("🛡️ Броня обновлена:", stats.armor);
        }
        if (powerElements[0]) {
            powerElements[0].textContent = `${stats.power}`;
            console.log("🌟 Сила обновлена:", stats.power);
        }
        
        // Также обновляем бонусы если они есть
        this.updateBonusDisplay(stats.activeBonuses);
        
        console.log("✅ Интерфейс героя обновлен с новыми статами");
    }

    // ⭐ ДОПОЛНИТЕЛЬНЫЙ МЕТОД: Обновление отображения бонусов
    updateBonusDisplay(activeBonuses) {
        if (!activeBonuses || activeBonuses.length === 0) return;
        
        // Находим контейнер для бонусов
        const bonusContainer = document.querySelector('.overlay-stat-group:nth-child(3)');
        if (!bonusContainer) return;
        
        console.log("🎯 Обновление отображения бонусов...");
        
        // Очищаем текущие бонусы
        bonusContainer.innerHTML = '';
        
        // Добавляем бонусы (показываем первые 4 для компактности)
        const bonusesToShow = activeBonuses.slice(0, 4);
        
        bonusesToShow.forEach(bonus => {
            const bonusRow = document.createElement('div');
            bonusRow.className = 'overlay-stat-row';
            bonusRow.innerHTML = `
                <span class="overlay-stat-label">${bonus.label}</span>
                <span class="overlay-stat-value">${bonus.display}</span>
            `;
            bonusContainer.appendChild(bonusRow);
        });
        
        // Если бонусов больше 4, показываем индикатор
        if (activeBonuses.length > 4) {
            const moreRow = document.createElement('div');
            moreRow.className = 'overlay-stat-row';
            moreRow.innerHTML = `
                <span class="overlay-stat-label">✨ Ещё</span>
                <span class="overlay-stat-value">+${activeBonuses.length - 4}</span>
            `;
            bonusContainer.appendChild(moreRow);
        }
        
        console.log("✅ Бонусы обновлены, показано:", bonusesToShow.length);
    }

    // ========== МЕТОДЫ ДЛЯ ПОЛОСОК ЗДОРОВЬЯ И ОПЫТА ==========
    getExperiencePercent(hero) {
        const neededExp = this.getExperienceForNextLevel(hero.level);
        return neededExp > 0 ? Math.min(100, (hero.experience / neededExp) * 100) : 0;
    }

    getExperienceForNextLevel(level) {
        return Math.floor(100 * Math.pow(1.5, level - 1));
    }

    startHealthBarUpdates() {
        // Обновляем полоски каждую секунду
        setInterval(() => {
            if (this.currentHero) {
                this.updateHealthAndExperienceBars();
            }
        }, 1000);
    }

    updateHealthAndExperienceBars() {
        const currentHero = this.currentHero || window.game?.currentHero;
        if (!currentHero) return;

        const stats = this.calculateHeroStats(currentHero);
        
        // Обновляем полоску здоровья
        const healthBar = document.getElementById('heroHealthBar');
        if (healthBar) {
            const healthPercent = (stats.currentHealth / stats.maxHealth) * 100;
            healthBar.style.width = `${healthPercent}%`;
            healthBar.textContent = `${stats.currentHealth}/${stats.maxHealth}`;
            
            // Добавляем анимацию регенерации
            if (currentHero.currentHealth < stats.maxHealth) {
                healthBar.classList.add('regening');
            } else {
                healthBar.classList.remove('regening');
            }
        }
        
        // Обновляем полоску опыта
        const expBar = document.getElementById('heroExperienceBar');
        if (expBar) {
            const expPercent = this.getExperiencePercent(currentHero);
            const neededExp = this.getExperienceForNextLevel(currentHero.level);
            expBar.style.width = `${expPercent}%`;
            expBar.textContent = `${currentHero.experience}/${neededExp}`;
        }
    }

    // ========== ОТОБРАЖЕНИЕ ИНФОРМАЦИИ О РАСЕ, ПРОФЕССИИ И САГЕ ==========
    getRaceBonusDescription(race) {
        const bonuses = {
            'human': '+30% к золоту',
            'elf': '+20% к урону', 
            'dwarf': '+30% к здоровью',
            'ork': '+30% к регенерации',
            'laitar': '5% вампиризма',
            'dragon': '+15% к броне',
            'fairy': '25% пенетрации брони',
            'halfling': '20% шанс крита'
        };
        return bonuses[race] || 'Нет бонуса';
    }

    getClassBonusDescription(className) {
        const bonuses = {
            'warrior': '+15% к броне',
            'hunter': '25% пенетрации брони',
            'mage': '+20% к урону',
            'bounty_hunter': '20% шанс крита',
            'merchant': '+30% к золоту',
            'thief': '+30% к золоту',
            'fighter': '+30% к регенерации',
            'antiquarian': '+30% к золоту',
            'death_mage': '5% вампиризма',
            'sorcerer': '+20% к урону',
            'archer': '20% шанс крита',
            'healer': '+30% к здоровью',
            'gladiator': '+20% к урону', // ⭐ ГЛАДИАТОР
            'blacksmith': '+15% к броне'
        };
        return bonuses[className] || 'Нет бонуса';
    }

    getSagaBonusDescription(saga) {
        const bonuses = {
            'golden_egg': '+30% к здоровью',
            'vulkanor': '25% пенетрации брони', // ⭐ ВУЛКАНОР
            'well': '+30% к золоту',
            'pets': '+20% к урону',
            'following_sun': '+30% к регенерации',
            'vampire_crown': '5% вампиризма',
            'tiger_eye': '20% шанс крита',
            'sky_phenomena': '+15% к броне'
        };
        return bonuses[saga] || 'Нет бонуса';
    }

    // ========== УПРАВЛЕНИЕ ЗДОРОВЬЕМ ==========
    takeDamage(hero, damage) {
        const targetHero = hero || this.currentHero || window.game?.currentHero;
        if (!targetHero) return 0;

        const stats = this.calculateHeroStats(targetHero);
        const actualDamage = Math.max(1, damage - stats.armor);
        targetHero.currentHealth = Math.max(0, stats.currentHealth - actualDamage);
        
        // ⭐ ОБНОВЛЯЕМ ИНТЕРФЕЙС
        this.calculateHeroStats();
        
        // СОХРАНЯЕМ ПРИ ИЗМЕНЕНИИ ЗДОРОВЬЯ
        if (window.game) window.game.saveGame();
        
        return actualDamage;
    }

    heal(hero, amount) {
        const targetHero = hero || this.currentHero || window.game?.currentHero;
        if (!targetHero) return 0;

        const stats = this.calculateHeroStats(targetHero);
        targetHero.currentHealth = Math.min(stats.maxHealth, (targetHero.currentHealth || stats.currentHealth) + amount);
        
        // ⭐ ОБНОВЛЯЕМ ИНТЕРФЕЙС
        this.calculateHeroStats();
        
        // СОХРАНЯЕМ ПРИ ЛЕЧЕНИИ
        if (window.game) window.game.saveGame();
        
        return amount;
    }

    regenerateHealth(hero) {
        const targetHero = hero || this.currentHero || window.game?.currentHero;
        if (!targetHero || !targetHero.healthRegen) return 0;
        
        const stats = this.calculateHeroStats(targetHero);
        if (targetHero.currentHealth < stats.maxHealth) {
            const healAmount = Math.min(stats.maxHealth - targetHero.currentHealth, targetHero.healthRegen);
            targetHero.currentHealth += healAmount;
            
            // ⭐ ОБНОВЛЯЕМ ИНТЕРФЕЙС
            this.calculateHeroStats();
            
            // СОХРАНЯЕМ ПРИ РЕГЕНЕРАЦИИ
            if (window.game) window.game.saveGame();
            
            return healAmount;
        }
        return 0;
    }

    // ========== СИСТЕМА УРОВНЕЙ ==========
    addExperience(hero, exp) {
        const targetHero = hero || this.currentHero || window.game?.currentHero;
        if (!targetHero) return 0;

        targetHero.experience += exp;
        const neededExp = this.getExperienceForNextLevel(targetHero.level);
        
        if (targetHero.experience >= neededExp) {
            this.levelUp(targetHero);
        } else {
            // ⭐ ОБНОВЛЯЕМ ИНТЕРФЕЙС ДАЖЕ ЕСЛИ УРОВЕНЬ НЕ ПОВЫСИЛСЯ
            this.calculateHeroStats();
        }
        
        // СОХРАНЯЕМ ПРИ ПОЛУЧЕНИИ ОПЫТА
        if (window.game) window.game.saveGame();
        
        return exp;
    }

    levelUp(hero) {
        const targetHero = hero || this.currentHero || window.game?.currentHero;
        if (!targetHero) return 0;

        targetHero.level++;
        targetHero.experience = 0;
        
        // Улучшаем базовые характеристики
        targetHero.baseHealth = Math.round(targetHero.baseHealth * 1.1);
        targetHero.baseDamage = Math.round(targetHero.baseDamage * 1.1);
        targetHero.baseArmor = Math.round(targetHero.baseArmor * 1.05);
        
        // Восстанавливаем здоровье при уровне
        const stats = this.calculateHeroStats(targetHero);
        targetHero.currentHealth = stats.maxHealth;
        
        this.showNotification(`🎉 ${targetHero.name} достиг ${targetHero.level} уровня!`);
        
        // ⭐ ОБНОВЛЯЕМ ИНТЕРФЕЙС
        this.showHeroGameScreen();
        
        // Проверяем разблокировку новых героев
        this.checkHeroUnlocks();
        
        // СОХРАНЯЕМ ПРИ ПОВЫШЕНИИ УРОВНЯ
        if (window.game) window.game.saveGame();
        
        return targetHero.level;
    }

    checkHeroUnlocks() {
        const currentHero = this.currentHero || window.game?.currentHero;
        if (!currentHero) return;

        this.heroes.forEach(hero => {
            if (!hero.unlocked && currentHero.level >= hero.id * 5) {
                this.unlockHero(hero.id);
            }
        });
    }

    // ========== ЭКИПИРОВКА ==========
    equipItem(itemId, slot = null) {
        const currentHero = this.currentHero || window.game?.currentHero;
        if (!currentHero) return false;

        const equipmentSystem = window.game ? window.game.systems.equipment : null;
        if (!equipmentSystem) return false;

        const item = equipmentSystem.getItemById(itemId);
        if (!item) return false;

        // Определяем слот если не указан
        if (!slot) {
            slot = equipmentSystem.getEquipmentSlot(item);
        }

        if (!slot) {
            this.showNotification(`❌ Нельзя экипировать ${item.name}`);
            return false;
        }

        // Проверяем можно ли экипировать
        if (!equipmentSystem.canEquipItem(item, currentHero)) {
            this.showNotification(`❌ ${item.name} нельзя экипировать`);
            return false;
        }

        // Снимаем текущий предмет если есть
        const currentItemId = currentHero.equipment[slot];
        if (currentItemId) {
            this.unequipItem(slot);
        }

        // Экипируем новый предмет
        currentHero.equipment[slot] = itemId;
        
        // Убираем из инвентаря
        currentHero.inventory = currentHero.inventory.filter(id => id !== itemId);

        this.showNotification(`🎯 Надето: ${item.name}`);
        
        // ⭐ ОБНОВЛЯЕМ ИНТЕРФЕЙС
        this.calculateHeroStats();
        this.showHeroGameScreen();
        
        // СОХРАНЯЕМ ПРИ ЭКИПИРОВКЕ
        if (window.game) window.game.saveGame();
        
        return true;
    }

    unequipItem(slot) {
        const currentHero = this.currentHero || window.game?.currentHero;
        if (!currentHero) return false;

        const itemId = currentHero.equipment[slot];
        if (!itemId) return false;

        // Проверяем место в инвентаре
        if (currentHero.inventory.length >= 10) {
            this.showNotification('❌ Инвентарь полон! Максимум 10 предметов');
            return false;
        }

        currentHero.equipment[slot] = null;
        currentHero.inventory.push(itemId);

        // ⭐ ОБНОВЛЯЕМ ИНТЕРФЕЙС
        this.calculateHeroStats();
        this.showHeroGameScreen();

        // СОХРАНЯЕМ ПРИ СНЯТИИ
        if (window.game) window.game.saveGame();
        
        return true;
    }

    // ========== ИНТЕРФЕЙС ==========
    showHeroSelection() {
        const app = document.getElementById('app');
        if (!app) return;

        const heroesHTML = this.heroes.map(hero => {
            const isUnlocked = hero.unlocked;
            const stats = this.calculateHeroStats(hero);
            
            return `
                <div class="hero-card ${isUnlocked ? '' : 'locked'}" 
                     onclick="${isUnlocked ? `game.systems.hero.selectHero(${hero.id})` : ''}">
                    <div class="hero-image">
                        <img src="${hero.image}" alt="${hero.name}" 
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                        ${!isUnlocked ? '<div class="locked-overlay">🔒</div>' : ''}
                    </div>
                    <div class="hero-info-tooltip">
                        <div class="hero-header">
                            <strong>${hero.name}</strong>
                            <span class="hero-level">Ур. ${hero.level}</span>
                        </div>
                        <div class="hero-stats">
                            <div class="stat-row">
                                <span>❤️ ${stats.currentHealth}/${stats.maxHealth}</span>
                                <span>⚔️ ${stats.damage}</span>
                                <span>🛡️ ${stats.armor}</span>
                            </div>
                            <div class="stat-row">
                                <span>💰 ${hero.gold.toFixed(2)}</span>
                                <span>🌟 ${stats.power}</span>
                            </div>
                        </div>
                        <div class="hero-details">
                            <span>🧬 ${this.getRaceName(hero.race)}</span>
                            <span>⚔️ ${this.getClassName(hero.class)}</span>
                            <span>📖 ${this.getSagaName(hero.saga)}</span>
                        </div>
                        ${!isUnlocked ? 
                            `<small class="locked-text">Требуется уровень: ${hero.id * 5}</small>` : 
                            '<small class="select-text">Кликните для выбора</small>'
                        }
                    </div>
                </div>
            `;
        }).join('');

        app.innerHTML = `
            <div class="hero-selection-screen">
                <header class="selection-header">
                    <h1>🎯 Выберите героя</h1>
                    <p>Всего героев: ${this.heroes.length} | Разблокировано: ${this.heroes.filter(h => h.unlocked).length}</p>
                </header>
                
                <div class="heroes-grid">
                    ${heroesHTML}
                </div>
                
                <div class="selection-actions">
                    <button class="btn-secondary" onclick="game.showMainMenu()">
                        ← Назад в меню
                    </button>
                </div>
            </div>
        `;
    }

    showHeroGameScreen() {
        // ⭐ ВАЖНОЕ ИСПРАВЛЕНИЕ: Синхронизируем currentHero если он undefined
        if (!this.currentHero && window.game?.currentHero) {
            this.currentHero = window.game.currentHero;
            console.log("🔄 Синхронизирован currentHero из window.game");
        }
        
        const currentHero = this.currentHero || window.game?.currentHero;
        if (!currentHero) {
            console.error("❌ Не могу показать экран героя: currentHero не установлен");
            this.showHeroSelection();
            return;
        }

        const app = document.getElementById('app');
        
        // ⭐ ВАЖНО: Сначала рассчитываем статы, ПОТОМ рендерим
        const stats = this.calculateHeroStats(currentHero);
        
        console.log("🎯 Рендерим интерфейс с актуальными статами:", {
            health: `${stats.currentHealth}/${stats.maxHealth}`,
            damage: stats.damage,
            armor: stats.armor
        });
        
        app.innerHTML = `
            <div class="hero-game-screen">
                <!-- Верхняя панель кнопок -->
                <div class="top-action-bar">
                    <button class="btn-top" onclick="game.showOverlay('global-map')">
                        🗺️ Глобальная карта
                    </button>
                    <button class="btn-top" onclick="game.showOverlay('local-map')">
                        📍 Локальная карта
                    </button>
                    <button class="btn-top" onclick="game.showOverlay('tactical-map')">
                        🎲 Тактическая карта
                    </button>
                    <button class="btn-top" onclick="game.showOverlay('inventory')">
                        🎒 Инвентарь
                    </button>
                    <button class="btn-top" onclick="game.showOverlay('shop')">
                        🏪 Магазин
                    </button>
                    <button class="btn-top" onclick="game.systems.hero.showHeroSelection()">
                        🔁 Сменить героя
                    </button>
                </div>

                <!-- Основное окно героя -->
                <div class="hero-main-window">
                    <div class="hero-fullscreen">
                        <!-- Фон - картинка героя -->
                        <div class="hero-background">
                            <img src="${currentHero.image}" alt="${currentHero.name}" 
                                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzg4OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                        </div>
                        
                        <!-- Панель параметров поверх картинки -->
                        <div class="hero-overlay-panel">
                            <!-- Верхняя строка - имя и уровень -->
                            <div class="hero-overlay-header">
                                <div class="hero-overlay-name">${currentHero.name}</div>
                                <div class="hero-overlay-level">⚡ Ур. ${currentHero.level}</div>
                            </div>
                            
                            <!-- ⭐ БОЛЬШАЯ КРАСНАЯ ПОЛОСКА ЗДОРОВЬЯ -->
                            <div class="health-display-section">
                                <h4>❤️ Здоровье</h4>
                                <div class="health-bar-container">
                                    <div class="health-bar" id="heroHealthBar" 
                                         style="width: ${(stats.currentHealth / stats.maxHealth) * 100}%">
                                        ${stats.currentHealth}/${stats.maxHealth}
                                    </div>
                                </div>
                            </div>

                            <!-- ⭐ ПОЛОСКА ОПЫТА -->
                            <div class="experience-display-section">
                                <h4>🌟 Опыт</h4>
                                <div class="experience-bar-container">
                                    <div class="experience-bar" id="heroExperienceBar" 
                                         style="width: ${this.getExperiencePercent(currentHero)}%">
                                        ${currentHero.experience}/${this.getExperienceForNextLevel(currentHero.level)}
                                    </div>
                                </div>
                            </div>

                            <!-- ⭐ ИНФОРМАЦИЯ О РАСЕ, ПРОФЕССИИ И САГЕ -->
                            <div class="hero-origins-section">
                                <h4>🎭 Происхождение</h4>
                                <div class="origin-item">
                                    <span class="origin-type">🧬 Раса: ${this.getRaceName(currentHero.race)}</span>
                                    <span class="origin-bonus">${this.getRaceBonusDescription(currentHero.race)}</span>
                                </div>
                                <div class="origin-item">
                                    <span class="origin-type">⚔️ Профессия: ${this.getClassName(currentHero.class)}</span>
                                    <span class="origin-bonus">${this.getClassBonusDescription(currentHero.class)}</span>
                                </div>
                                <div class="origin-item">
                                    <span class="origin-type">📖 Сага: ${this.getSagaName(currentHero.saga)}</span>
                                    <span class="origin-bonus">${this.getSagaBonusDescription(currentHero.saga)}</span>
                                </div>
                            </div>

                            <!-- Основные параметры -->
                            <div class="hero-overlay-stats">
                                <div class="overlay-stat-group">
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">❤️ Здоровье</span>
                                        <span class="overlay-stat-value">${stats.currentHealth}/${stats.maxHealth}</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">⚔️ Урон</span>
                                        <span class="overlay-stat-value">${stats.damage}</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">🛡️ Броня</span>
                                        <span class="overlay-stat-value">${stats.armor}</span>
                                    </div>
                                </div>
                                
                                <div class="overlay-stat-group">
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">💰 Золото</span>
                                        <span class="overlay-stat-value">${currentHero.gold.toFixed(2)}</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">🌟 Сила</span>
                                        <span class="overlay-stat-value">${stats.power}</span>
                                    </div>
                                    <div class="overlay-stat-row">
                                        <span class="overlay-stat-label">🧬 Раса</span>
                                        <span class="overlay-stat-value">${this.getRaceName(currentHero.race)}</span>
                                    </div>
                                </div>

                                <!-- ⭐ АКТИВНЫЕ БОНУСЫ (ТОЛЬКО С value > 0) -->
                                <div class="overlay-stat-group">
                                    ${stats.activeBonuses.length > 0 ? 
                                        stats.activeBonuses.slice(0, 4).map(bonus => `
                                            <div class="overlay-stat-row">
                                                <span class="overlay-stat-label">${bonus.label}</span>
                                                <span class="overlay-stat-value">${bonus.display}</span>
                                            </div>
                                        `).join('') : 
                                        `<div class="overlay-stat-row">
                                            <span class="overlay-stat-label">🎯 Бонусы</span>
                                            <span class="overlay-stat-value">Нет активных</span>
                                        </div>`
                                    }
                                    ${stats.activeBonuses.length > 4 ? 
                                        `<div class="overlay-stat-row">
                                            <span class="overlay-stat-label">✨ Ещё</span>
                                            <span class="overlay-stat-value">+${stats.activeBonuses.length - 4}</span>
                                        </div>` : ''
                                    }
                                </div>
                            </div>
                            
                            <!-- Экипировка -->
                            <div class="hero-overlay-equipment">
                                <h4>🎒 Экипировка</h4>
                                <div class="equipment-slots-mini">
                                    ${['main_hand', 'off_hand', 'helmet', 'chest', 'gloves', 'legs', 'boots'].map(slot => {
                                        const itemId = currentHero.equipment[slot];
                                        const item = itemId && window.game.systems.equipment ? 
                                            window.game.systems.equipment.getItemById(itemId) : null;
                                        return `
                                            <div class="equipment-slot-mini ${slot} ${item ? 'equipped' : 'empty'}"
                                                 onclick="game.showEquipmentForSlot('${slot}')"
                                                 ${item ? `data-rarity="${item.rarity || 'common'}"` : ''}>
                                                <div class="slot-icon-mini">
                                                    ${item ? 
                                                        `<img src="${item.image}" alt="${item.name}" 
                                                              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                                                         <div class="item-fallback" style="display: none;">
                                                             <span>${this.getSlotIcon(slot)}</span>
                                                         </div>` : 
                                                        this.getSlotIcon(slot)
                                                    }
                                                </div>
                                                <div class="slot-label-mini">${this.getSlotName(slot)}</div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Область для оверлеев -->
                <div id="overlay-container" class="overlay-container"></div>
            </div>
        `;
        
        // Запускаем обновление полосок в реальном времени
        this.startHealthBarUpdates();
        
        console.log("✅ Интерфейс героя отрендерен с актуальными статами");
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    getRaceName(race) {
        const races = {
            'human': 'Человек',
            'elf': 'Эльф',
            'dwarf': 'Гном',
            'ork': 'Орк',
            'laitar': 'Лайтар',
            'dragon': 'Дракон',
            'fairy': 'Фея',
            'halfling': 'Полурослик'
        };
        return races[race] || race;
    }

    getClassName(className) {
        const classes = {
            'warrior': 'Воин',
            'hunter': 'Охотник',
            'mage': 'Маг',
            'bounty_hunter': 'Охотник за головами',
            'merchant': 'Торговец',
            'thief': 'Вор',
            'fighter': 'Кулачный боец',
            'antiquarian': 'Искатель древностей',
            'death_mage': 'Волхв смерти',
            'sorcerer': 'Колдун',
            'archer': 'Лучник',
            'healer': 'Знахарь',
            'gladiator': 'Гладиатор',
            'blacksmith': 'Кузнец'
        };
        return classes[className] || className;
    }

    getSagaName(saga) {
        const sagas = {
            'golden_egg': 'Золотое Яйцо',
            'vulkanor': 'Вулканор',
            'well': 'Колодец',
            'pets': 'Питомец',
            'following_sun': 'Вслед за солнцем',
            'vampire_crown': 'Корона вампиров',
            'tiger_eye': 'Желтый Глаз тигра',
            'sky_phenomena': 'Небесные явления'
        };
        return sagas[saga] || saga;
    }

    getSlotIcon(slot) {
        const icons = {
            'main_hand': '⚔️',
            'off_hand': '🛡️',
            'helmet': '⛑️',
            'chest': '👕',
            'gloves': '🧤',
            'legs': '👖',
            'boots': '👢'
        };
        return icons[slot] || '📦';
    }

    getSlotName(slot) {
        const names = {
            'main_hand': 'Правая рука',
            'off_hand': 'Левая рука',
            'helmet': 'Шлем',
            'chest': 'Доспех',
            'gloves': 'Перчатки',
            'legs': 'Поножи',
            'boots': 'Ботинки'
        };
        return names[slot] || slot;
    }

    showNotification(message) {
        console.log("🔔 HeroSystem:", message);
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message);
        }
    }

    // ========== СБРОС ГЕРОЯ ==========
    resetHero() {
        const currentHero = this.currentHero || window.game?.currentHero;
        if (!currentHero) return;
        
        if (!confirm("⚠️ Вы уверены что хотите сбросить героя?\n\nВсе характеристики, предметы и прогресс будут сброшены к базовым значениям.")) {
            return;
        }
        
        // Сохраняем неизменяемые поля
        const originalData = this.heroes.find(h => h.id === currentHero.id);
        if (!originalData) return;
        
        // Сбрасываем к базовым значениям
        Object.assign(currentHero, {
            baseHealth: originalData.baseHealth,
            baseDamage: originalData.baseDamage,
            baseArmor: originalData.baseArmor,
            gold: originalData.gold,
            level: 1,
            experience: 0,
            monstersKilled: 0,
            deaths: 0,
            inventory: [],
            equipment: {
                main_hand: null,
                off_hand: null,
                helmet: null,
                chest: null,
                gloves: null,
                legs: null,
                boots: null
            },
            currentHealth: originalData.baseHealth
        });
        
        this.showNotification(`🔄 ${currentHero.name} сброшен к начальным значениям`);
        
        // ⭐ ОБНОВЛЯЕМ ИНТЕРФЕЙС
        this.showHeroGameScreen();
        
        // СОХРАНЯЕМ ПРИ СБРОСЕ
        if (window.game) window.game.saveGame();
    }
}

// Регистрируем систему в глобальной области
window.HeroSystem = HeroSystem;
console.log("📦 HeroSystem модуль загружен");
