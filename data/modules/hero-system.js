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
            
            // Инициализируем героев с нашими правилами разблокировки
            this.heroes = loadedHeroes.map(hero => ({
                ...hero,
                // ИГНОРИРУЕМ поле unlocked из JSON, будем вычислять сами
                unlocked: false, // Временно все заблокированы
                
                inventory: hero.inventory || [],
                equipment: {
                    main_hand: hero.equipment?.main_hand || null,
                    off_hand: hero.equipment?.off_hand || null,
                    helmet: hero.equipment?.helmet || null,
                    chest: hero.equipment?.chest || null,
                    gloves: hero.equipment?.gloves || null,
                    legs: hero.equipment?.legs || null,
                    boots: hero.equipment?.boots || null,
                    relic: hero.equipment?.relic || null
                },
                currentHealth: hero.currentHealth || hero.baseHealth,
                monstersKilled: hero.monstersKilled || 0,
                deaths: hero.deaths || 0,
                healthRegen: hero.healthRegen || 1.0,
                isInPostDeathRegeneration: hero.isInPostDeathRegeneration || false
            }));
            
            console.log(`✅ Загружено героев: ${this.heroes.length}`);
            
            // После загрузки инициализируем систему разблокировки
            this.initializeUnlockSystem();
            
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных героев:", error);
            this.createFallbackHero();
            return true;
        }
    }

    initializeUnlockSystem() {
        console.log("🔄 Инициализация системы разблокировки героев...");
        
        // Сортируем героев по ID для последовательной проверки
        const sortedHeroes = [...this.heroes].sort((a, b) => a.id - b.id);
        
        for (let i = 0; i < sortedHeroes.length; i++) {
            const hero = sortedHeroes[i];
            
            if (hero.id === 1) {
                // Герой 1 всегда разблокирован
                hero.unlocked = true;
                console.log(`✅ Герой 1 "${hero.name}" разблокирован по умолчанию`);
                continue;
            }
            
            // Находим предыдущего героя
            const prevHero = sortedHeroes.find(h => h.id === hero.id - 1);
            if (!prevHero) {
                console.warn(`⚠️ Не найден предыдущий герой для ID ${hero.id}`);
                hero.unlocked = false;
                continue;
            }
            
            // Проверяем условие: предыдущий герой должен быть >= 9 уровня
            const shouldBeUnlocked = prevHero.level >= 9;
            hero.unlocked = shouldBeUnlocked;
            
            if (shouldBeUnlocked) {
                console.log(`✅ Герой ${hero.id} "${hero.name}" разблокирован (${prevHero.name} ${prevHero.level}/9 ур.)`);
            } else {
                console.log(`🔒 Герой ${hero.id} "${hero.name}" заблокирован (${prevHero.name} ${prevHero.level}/9 ур.)`);
            }
        }
        
        console.log("🎯 Система разблокировки инициализирована", {
            всего: this.heroes.length,
            разблокировано: this.heroes.filter(h => h.unlocked).length,
            список: this.heroes.filter(h => h.unlocked).map(h => `${h.id}:${h.name}`)
        });
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
                boots: null,
                relic: null
            },
            unlocked: true,
            currentHealth: 100,
            story: "Простой воин из далекой деревни...",
            isInPostDeathRegeneration: false
        }];
        
        console.log("🔄 Создан тестовый герой");
    }

    // ========== МЕТОДЫ РАЗБЛОКИРОВКИ ==========
    canUnlockHero(heroId) {
        const hero = this.heroes.find(h => h.id === heroId);
        if (!hero) {
            console.warn(`❌ Герой с ID ${heroId} не найден`);
            return false;
        }
        
        // Герой 1 всегда доступен
        if (heroId === 1) return true;
        
        // Находим предыдущего героя
        const prevHero = this.heroes.find(h => h.id === heroId - 1);
        if (!prevHero) {
            console.warn(`❌ Не найден предыдущий герой для ID ${heroId}`);
            return false;
        }
        
        // Проверяем уровень предыдущего героя
        const canUnlock = prevHero.level >= 9;
        
        // Также проверяем, разблокирован ли предыдущий герой
        const prevUnlocked = prevHero.unlocked;
        
        return canUnlock && prevUnlocked;
    }

   getHeroUnlockStatus(heroId) {
    const hero = this.heroes.find(h => h.id === heroId);
    if (!hero) return "❌ Герой не найден";
    
    if (hero.unlocked) return "✅ Разблокирован";
    
    if (heroId === 1) return "✅ Доступен изначально";
    
    const prevHero = this.heroes.find(h => h.id === heroId - 1);
    if (!prevHero) return "❌ Ошибка: нет предыдущего героя";
    
    if (!prevHero.unlocked) {
        return `🔒 Требуется разблокировать ${prevHero.name} (ID: ${prevHero.id})`;
    }
    
    if (prevHero.level < 9) {
        return `🎯 Требуется ${prevHero.name} 9 ур. (сейчас ${prevHero.level})`;
    }
    
    return "⚠️ Ошибка проверки";
}

    unlockHero(heroId, reason = "") {
        const hero = this.heroes.find(h => h.id === heroId);
        if (!hero) {
            console.error(`❌ Не удалось разблокировать: герой ${heroId} не найден`);
            return false;
        }
        
        if (hero.unlocked) {
            console.log(`ℹ️ Герой ${hero.name} уже разблокирован`);
            return true;
        }
        
        // Проверяем условия
        if (!this.canUnlockHero(heroId)) {
            console.warn(`❌ Условия не выполнены для разблокировки героя ${heroId}`);
            return false;
        }
        
        // Разблокируем героя
        hero.unlocked = true;
        
        // Обновляем sharedResources
        if (window.game?.sharedResources) {
            if (!window.game.sharedResources.unlockedHeroes.includes(heroId)) {
                window.game.sharedResources.unlockedHeroes.push(heroId);
                console.log(`📋 Добавлен герой ${heroId} в unlockedHeroes`);
            }
        }
        
        // Показываем уведомление
        const message = reason ? 
            `🎉 Герой "${hero.name}" разблокирован! ${reason}` : 
            `🎉 Герой "${hero.name}" разблокирован!`;
        
        this.showNotification(message);
        
        // Сохраняем игру
        if (window.game) {
            window.game.saveGame();
        }
        
        console.log(`✅ Герой ${hero.name} (ID: ${heroId}) успешно разблокирован! Причина: ${reason || "выполнены условия"}`);
        
        return true;
    }

    checkHeroUnlocks() {
        console.log("🔍 Проверка разблокировки всех героев...");
        
        const sortedHeroes = [...this.heroes].sort((a, b) => a.id - b.id);
        let unlockedCount = 0;
        
        for (let i = 0; i < sortedHeroes.length; i++) {
            const hero = sortedHeroes[i];
            
            if (hero.id === 1) {
                // Герой 1 всегда должен быть разблокирован
                if (!hero.unlocked) {
                    hero.unlocked = true;
                    console.log(`🔄 Исправление: Герой 1 "${hero.name}" разблокирован`);
                }
                continue;
            }
            
            const prevHero = sortedHeroes.find(h => h.id === hero.id - 1);
            if (!prevHero) continue;
            
            // Проверяем, должен ли герой быть разблокирован
            const shouldBeUnlocked = prevHero.unlocked && prevHero.level >= 9;
            
            if (shouldBeUnlocked && !hero.unlocked) {
                // Автоматически разблокируем
                hero.unlocked = true;
                unlockedCount++;
                
                if (window.game?.sharedResources && !window.game.sharedResources.unlockedHeroes.includes(hero.id)) {
                    window.game.sharedResources.unlockedHeroes.push(hero.id);
                }
                
                console.log(`🔄 Автоматическая разблокировка: ${hero.name} (${prevHero.name} ${prevHero.level}/9 ур.)`);
                
                // Показываем уведомление
                this.showNotification(`🎉 Открыт новый герой: ${hero.name}!`);
            }
        }
        
        if (unlockedCount > 0) {
            console.log(`✅ Автоматически разблокировано героев: ${unlockedCount}`);
            
            // Обновляем sharedResources
            if (window.game?.sharedResources) {
                window.game.sharedResources.unlockedHeroes = [...new Set(window.game.sharedResources.unlockedHeroes)]
                    .sort((a, b) => a - b);
            }
            
            // Сохраняем изменения
            if (window.game) {
                window.game.saveGame();
            }
        } else {
            console.log("ℹ️ Новых героев для разблокировки не найдено");
        }
        
        return unlockedCount;
    }

    // ========== ВЫБОР ГЕРОЯ ==========
    selectHero(heroId) {
        const hero = this.heroes.find(h => h.id === heroId);
        if (!hero) {
            console.error(`❌ Герой с ID ${heroId} не найден`);
            this.showNotification("❌ Герой не найден!", 'error');
            return;
        }
        
        // Проверяем разблокировку
        if (!hero.unlocked && !this.canUnlockHero(heroId)) {
            const status = this.getHeroUnlockStatus(heroId);
            console.warn(`❌ Попытка выбрать заблокированного героя: ${hero.name}`, { status });
            this.showNotification(`🔒 ${hero.name} еще не разблокирован!\n${status}`, 'warning');
            return;
        }
        
        // Если герой может быть разблокирован, но еще не помечен
        if (!hero.unlocked && this.canUnlockHero(heroId)) {
            this.unlockHero(heroId, "Автоматическая разблокировка при выборе");
        }
        
        // Синхронизируем золото с общим ресурсом
        if (window.game?.sharedResources) {
            hero.gold = window.game.sharedResources.gold;
        }
        
        // Устанавливаем текущего героя
        this.currentHero = hero;
        console.log(`🎯 Выбран герой: ${hero.name}`, {
            id: hero.id,
            level: hero.level,
            unlocked: hero.unlocked,
            gold: hero.gold
        });
        
        // Настраиваем системы под текущего героя
        this.setupHeroForSystems(hero);
        
        // Сохраняем выбор
        if (window.game) {
            window.game.saveGame();
        }
        
        // Показываем экран героя
        this.showHeroGameScreen();
        
        this.showNotification(`✅ Выбран герой: ${hero.name}!`, 'success');
    }

    setupHeroForSystems(hero) {
        // Устанавливаем героя в других системах
        if (window.game?.systems?.equipment) {
            window.game.systems.equipment.setCurrentHero(hero);
        }
        
        if (window.game?.systems?.battle) {
            window.game.systems.battle.currentHero = hero;
        }
        
        if (window.game?.systems?.shop) {
            window.game.systems.shop.currentHero = hero;
        }
        
        if (window.game?.systems?.map) {
            window.game.systems.map.setCurrentHero(hero);
        }
        
        if (window.game?.systems?.action) {
            window.game.systems.action.mapSystem?.setCurrentHero(hero);
        }
        
        if (window.game?.systems?.resources) {
            window.game.systems.resources.sharedResources = window.game.sharedResources;
        }
        
        console.log(`⚙️ Герой ${hero.name} настроен для всех систем`);
    }

    // ========== РАСЧЕТ ХАРАКТЕРИСТИК ==========
    calculateHeroStats(hero = null) {
        const targetHero = hero || this.currentHero || window.game?.currentHero;
        
        if (!targetHero) {
            console.error("❌ calculateHeroStats: Герой не найден!");
            return { 
                currentHealth: 0, 
                maxHealth: 0, 
                damage: 0, 
                armor: 0, 
                power: 0,
                activeBonuses: []
            };
        }
        
        // Базовые характеристики с учетом уровня
        const levelMultiplier = 1 + (targetHero.level - 1) * 0.1;
        
        let baseMaxHealth = Math.round(targetHero.baseHealth * levelMultiplier);
        let baseDamage = Math.round(targetHero.baseDamage * levelMultiplier);
        let baseArmor = Math.round(targetHero.baseArmor * levelMultiplier);
        
        // Бонусы от экипировки
        let equipmentHealth = 0;
        let equipmentDamage = 0;
        let equipmentArmor = 0;
        let equipmentPercentBonuses = [];
        
        // Применяем бонусы от предметов
        Object.values(targetHero.equipment || {}).forEach(itemId => {
            if (itemId && window.game?.systems?.equipment) {
                const item = window.game.systems.equipment.getItemById(itemId);
                if (item) {
                    equipmentDamage += item.fixed_damage || 0;
                    equipmentArmor += item.fixed_armor || 0;
                    equipmentHealth += item.fixed_health || 0;
                    
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
        
        // Промежуточные значения
        let intermediateHealth = baseMaxHealth + equipmentHealth;
        let intermediateDamage = baseDamage + equipmentDamage;
        let intermediateArmor = baseArmor + equipmentArmor;
        
        // Активные бонусы для отображения
        let activeBonuses = [];
        let finalHealth = intermediateHealth;
        let finalDamage = intermediateDamage;
        let finalArmor = intermediateArmor;
        
        // Расчет процентных бонусов
        if (window.game?.systems?.bonus) {
            try {
                const tempHeroForBonusCalc = {
                    ...targetHero,
                    baseHealth: intermediateHealth,
                    baseDamage: intermediateDamage, 
                    baseArmor: intermediateArmor
                };
                
                const totals = window.game.systems.bonus.calculateTotalBonuses(tempHeroForBonusCalc, []);
                
                finalHealth = Math.round(intermediateHealth * (1 + totals.health_mult));
                finalDamage = Math.round(intermediateDamage * (1 + totals.damage_mult));
                finalArmor = Math.round(intermediateArmor * (1 + totals.armor_mult));
                
                // Формируем активные бонусы
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
                        label: '⚔️ Урон',
                        display: `+${(totals.damage_mult * 100).toFixed(1)}%`
                    },
                    {
                        type: 'armor_mult',
                        value: totals.armor_mult,
                        label: '🛡️ Броня',
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
                ].filter(bonus => bonus.value > 0);
                
            } catch (error) {
                console.error("💥 Ошибка расчета бонусов:", error);
                finalHealth = intermediateHealth;
                finalDamage = intermediateDamage;
                finalArmor = intermediateArmor;
            }
        }
        
        // Рассчитываем текущее здоровье
        const currentHealth = Math.min(targetHero.currentHealth || finalHealth, finalHealth);
        
        // Мощность героя
        const power = Math.round((finalHealth / 10) + (finalDamage * 1.5) + (finalArmor * 2));
        
        const result = {
            currentHealth: Math.floor(currentHealth),
            maxHealth: Math.round(finalHealth),
            damage: Math.round(finalDamage),
            armor: Math.round(finalArmor),
            power: power,
            activeBonuses: activeBonuses
        };
        
        // Обновляем интерфейс если это текущий герой
        if (targetHero === (this.currentHero || window.game?.currentHero)) {
            setTimeout(() => {
                this.updateHeroDisplay(result);
            }, 0);
        }
        
        return result;
    }

  showHeroSelection() {
    const app = document.getElementById('app');
    if (!app) return;

    // Сортируем героев по ID
    const sortedHeroes = [...this.heroes].sort((a, b) => a.id - b.id);
    
    const heroesHTML = sortedHeroes.map(hero => {
        const stats = this.calculateHeroStats(hero);
        const isSelectable = hero.unlocked;
        
        // Получаем информацию о предыдущем герое для отображения прогресса
        let progressInfo = '';
        let progressPercent = 0;
        
        if (hero.id > 1) {
            const prevHero = this.heroes.find(h => h.id === hero.id - 1);
            if (prevHero) {
                progressPercent = Math.min(100, (prevHero.level / 9) * 100);
                progressInfo = `
                    <div class="unlock-progress-info">
                        <div class="progress-label">
                            <span>${prevHero.name}: ${prevHero.level}/9 ур.</span>
                            <span>${progressPercent.toFixed(0)}%</span>
                        </div>
                        <div class="progress-bar-small">
                            <div class="progress-fill-small" style="width: ${progressPercent}%"></div>
                        </div>
                    </div>
                `;
            }
        }
        
        return `
            <div class="hero-card ${isSelectable ? '' : 'locked'}" 
                 onclick="${isSelectable ? `game.systems.hero.selectHero(${hero.id})` : ''}">
                <div class="hero-image">
                    <img src="${hero.image}" alt="${hero.name}" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMTgiIGZpbGw9IiM4ODgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4='">
                    ${!isSelectable ? '<div class="locked-overlay">🔒</div>' : ''}
                    <div class="hero-card-badge">
                        <span class="badge-level">${hero.level}</span>
                        ${hero.unlocked ? '<span class="badge-unlocked">🔓</span>' : '<span class="badge-locked">🔒</span>'}
                    </div>
                </div>
                
                <div class="hero-info-tooltip">
                    <div class="hero-header">
                        <strong>${hero.name}</strong>
                        <span class="hero-id">ID: ${hero.id}</span>
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
                    
                    ${progressInfo}
                    
                    <div class="hero-status ${hero.unlocked ? 'unlocked' : 'locked'}">
                        ${hero.unlocked ? '✅ Разблокирован' : '🔒 Заблокирован'}
                    </div>
                    
                    ${!isSelectable ? 
                        `<div class="unlock-hint">
                            <small>🎯 Прокачайте предыдущего героя до 9 уровня</small>
                        </div>` : 
                        `<div class="select-hint">
                            <small>👉 Нажмите для выбора</small>
                        </div>`
                    }
                </div>
            </div>
        `;
    }).join('');

    app.innerHTML = `
        <div class="hero-selection-screen">
            <!-- УБРАН header с информацией -->
            
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
    
    console.log("✅ Экран выбора героя отображен");
}

    showUnlockProgress() {
        const app = document.getElementById('app');
        if (!app) return;

        // Сортируем героев по ID
        const sortedHeroes = [...this.heroes].sort((a, b) => a.id - b.id);
        
        const progressHTML = sortedHeroes.map(hero => {
            const isUnlocked = hero.unlocked;
            const prevHero = hero.id > 1 ? this.heroes.find(h => h.id === hero.id - 1) : null;
            const progressPercent = prevHero ? Math.min(100, (prevHero.level / 9) * 100) : 100;
            
            return `
                <div class="unlock-progress-card ${isUnlocked ? 'unlocked' : 'locked'}">
                    <div class="progress-card-header">
                        <div class="hero-icon">
                            <img src="${hero.image}" alt="${hero.name}"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block'">
                            <div class="icon-fallback" style="display: none;">${hero.id}</div>
                        </div>
                        <div class="hero-info">
                            <h4>${hero.name} <small>(ID: ${hero.id})</small></h4>
                            <p class="hero-desc">${this.getRaceName(hero.race)} • ${this.getClassName(hero.class)}</p>
                            <p class="hero-level">Уровень: ${hero.level} | Золото: ${hero.gold.toFixed(2)}</p>
                        </div>
                        <div class="unlock-status">
                            <span class="status-badge ${isUnlocked ? 'unlocked' : 'locked'}">
                                ${isUnlocked ? '🔓 Разблокирован' : '🔒 Заблокирован'}
                            </span>
                        </div>
                    </div>
                    
                    <div class="progress-card-body">
                        ${hero.id === 1 ? 
                            `<div class="requirement-info success">
                                <p>🎯 <strong>Доступен изначально</strong></p>
                                <p class="tip">Начните игру с этого героя!</p>
                            </div>` : 
                            `<div class="requirement-info ${isUnlocked ? 'success' : 'pending'}">
                                <p>⚡ <strong>Требование для разблокировки:</strong></p>
                                <p>Достичь 9 уровня с героем "${prevHero?.name || 'Предыдущий'}"</p>
                            </div>`
                        }
                        
                        ${hero.id > 1 && prevHero ? `
                            <div class="progress-section">
                                <div class="progress-label">
                                    <span>Прогресс героя "${prevHero.name}":</span>
                                    <span>${prevHero.level}/9 (${progressPercent.toFixed(0)}%)</span>
                                </div>
                                <div class="progress-bar-large">
                                    <div class="progress-fill-large" style="width: ${progressPercent}%"></div>
                                </div>
                                <div class="progress-details">
                                    <div class="detail-item">
                                        <span>Текущий уровень:</span>
                                        <span class="value ${prevHero.level >= 9 ? 'completed' : ''}">${prevHero.level}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span>Требуется:</span>
                                        <span class="value required">9</span>
                                    </div>
                                    <div class="detail-item">
                                        <span>Осталось:</span>
                                        <span class="value ${prevHero.level >= 9 ? 'completed' : 'remaining'}">${Math.max(0, 9 - prevHero.level)} уровней</span>
                                    </div>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${isUnlocked ? 
                            `<div class="unlock-actions">
                                <button class="btn-select" onclick="game.systems.hero.selectHero(${hero.id})">
                                    Выбрать этого героя
                                </button>
                            </div>` : 
                            `<div class="unlock-hint">
                                <p>💡 <em>Играйте за героя "${prevHero?.name || 'Предыдущий'}" и повышайте его уровень до 9!</em></p>
                                ${hero.id > 1 ? 
                                    `<button class="btn-play-prev" onclick="game.systems.hero.selectHero(${hero.id - 1})">
                                        Играть за ${prevHero?.name || 'Предыдущего героя'}
                                    </button>` : ''
                                }
                            </div>`
                        }
                    </div>
                </div>
            `;
        }).join('');

        const unlockedCount = this.heroes.filter(h => h.unlocked).length;
        const totalCount = this.heroes.length;
        const highestLevel = Math.max(...this.heroes.map(h => h.level));
        
        app.innerHTML = `
            <div class="unlock-progress-screen">
                <div class="top-action-bar">
                    <button class="btn-top" onclick="game.systems.hero.showHeroSelection()">
                        ← Назад к выбору героя
                    </button>
                </div>
                
                <div class="progress-container">
                    <header class="progress-header">
                        <h1>📊 Прогресс разблокировки героев</h1>
                        <p class="subtitle">Каждый следующий герой открывается при достижении 9 уровня предыдущим героем</p>
                        
                        <div class="summary-stats">
                            <div class="stat-card">
                                <div class="stat-value">${unlockedCount}</div>
                                <div class="stat-label">Разблокировано</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${totalCount}</div>
                                <div class="stat-label">Всего героев</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${highestLevel}</div>
                                <div class="stat-label">Макс. уровень</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${this.heroes.filter(h => h.level >= 9).length}</div>
                                <div class="stat-label">Героев ≥9 ур.</div>
                            </div>
                        </div>
                    </header>
                    
                    <div class="progress-list">
                        ${progressHTML}
                    </div>
                    
                    <div class="progress-tips">
                        <h3>💡 Советы по прокачке:</h3>
                        <ul>
                            <li>Сосредоточьтесь на одном герое до 9 уровня</li>
                            <li>Используйте экипировку для увеличения характеристик</li>
                            <li>Сражайтесь с монстрами на карте для получения опыта</li>
                            <li>Выполняйте задания для быстрого роста</li>
                            <li>Каждый новый герой имеет уникальные способности!</li>
                        </ul>
                    </div>
                    
                    <div class="progress-legend">
                        <div class="legend-item">
                            <div class="legend-color unlocked"></div>
                            <span>Разблокирован - можно выбрать</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color locked"></div>
                            <span>Заблокирован - требуются условия</span>
                        </div>
                        <div class="legend-item">
                            <div class="legend-color in-progress"></div>
                            <span>В процессе разблокировки</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        console.log("✅ Экран прогресса разблокировки отображен");
    }

    refreshHeroList() {
        console.log("🔄 Обновление списка героев...");
        this.checkHeroUnlocks();
        this.showHeroSelection();
        this.showNotification("✅ Список героев обновлен!", 'info');
    }

    // ========== ОСНОВНЫЕ ИНТЕРФЕЙСНЫЕ МЕТОДЫ ==========
    showHeroGameScreen() {
        console.log("🎮 HeroSystem: Показываем экран героя...");
        
        // Синхронизируем currentHero
        if (!this.currentHero && window.game?.currentHero) {
            this.currentHero = window.game.currentHero;
            console.log("✅ Герой синхронизирован из window.game");
        }
        
        const currentHero = this.currentHero || window.game?.currentHero;
        
        if (!currentHero) {
            console.error("❌ Не могу показать экран героя: currentHero не установлен");
            this.showHeroSelection();
            return;
        }
        
        const app = document.getElementById('app');
        if (!app) {
            console.error("❌ Элемент app не найден");
            return;
        }
        
        const stats = this.calculateHeroStats(currentHero);
        
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
                    <button class="btn-top" onclick="game.systems.hero.showHeroStory()">
                        📖 История Героя
                    </button>
                    <button class="btn-top" onclick="game.systems.hero.showHeroSelection()">
                        🔁 Сменить героя
                    </button>
                    <button class="btn-top" onclick="game.systems.hero.resetCurrentHero()" 
                            style="background: #ef4444;">
                        🔄 Сбросить героя
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
                                <div class="hero-overlay-id">ID: ${currentHero.id}</div>
                            </div>
                            
                            <!-- Полоска здоровья -->
                            <div class="health-display-section">
                                <h4>❤️ Здоровье</h4>
                                <div class="health-bar-container">
                                    <div class="health-bar" id="heroHealthBar" 
                                         style="width: ${(stats.currentHealth / stats.maxHealth) * 100}%; 
                                                background: linear-gradient(90deg, #ef4444, #f59e0b);">
                                        ${stats.currentHealth}/${stats.maxHealth}
                                    </div>
                                </div>
                            </div>

                            <!-- Полоска опыта -->
                            <div class="experience-display-section">
                                <h4>🌟 Опыт</h4>
                                <div class="experience-bar-container">
                                    <div class="experience-bar" id="heroExperienceBar" 
                                         style="width: ${this.getExperiencePercent(currentHero)}%; 
                                                background: linear-gradient(90deg, #3b82f6, #8b5cf6);">
                                        ${(() => {
                                            const expProgress = this.getExperienceProgress(currentHero);
                                            return expProgress.next === 'MAX' ? 
                                                'MAX Уровень' : 
                                                `${expProgress.current}/${expProgress.next}`;
                                        })()}
                                    </div>
                                </div>
                            </div>

                            <!-- Информация о происхождении -->
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
                                        <span class="overlay-stat-label">🎯 Убито</span>
                                        <span class="overlay-stat-value">${currentHero.monstersKilled || 0}</span>
                                    </div>
                                </div>

                                <!-- Активные бонусы -->
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
                                    ${['main_hand', 'off_hand', 'helmet', 'chest', 'gloves', 'legs', 'boots', 'relic'].map(slot => {
                                        const itemId = currentHero.equipment[slot];
                                        const item = itemId && window.game?.systems?.equipment ? 
                                            window.game.systems.equipment.getItemById(itemId) : null;
                                        return `
                                            <div class="equipment-slot-mini ${slot} ${item ? 'equipped' : 'empty'}"
                                                 onclick="game.handleEquipmentSlotClick('${slot}')"
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
                            
                            <!-- Информация о разблокировке следующего героя -->
                            ${currentHero.id < this.heroes.length ? `
                                <div class="next-hero-info">
                                    <h4>🔓 Следующий герой</h4>
                                    <div class="next-hero-details">
                                        ${(() => {
                                            const nextHero = this.heroes.find(h => h.id === currentHero.id + 1);
                                            if (!nextHero) return 'Нет следующего героя';
                                            
                                            const progressPercent = Math.min(100, (currentHero.level / 9) * 100);
                                            const isUnlocked = nextHero.unlocked;
                                            
                                            return `
                                                <div class="next-hero-card ${isUnlocked ? 'unlocked' : 'locked'}">
                                                    <div class="next-hero-header">
                                                        <span>${nextHero.name}</span>
                                                        <span class="next-hero-status">${isUnlocked ? '🔓 Разблокирован' : '🔒 Заблокирован'}</span>
                                                    </div>
                                                    <div class="next-hero-progress">
                                                        <div class="progress-text">
                                                            ${currentHero.name}: ${currentHero.level}/9 ур.
                                                            <span>(${progressPercent.toFixed(0)}%)</span>
                                                        </div>
                                                        <div class="progress-bar-next">
                                                            <div class="progress-fill-next" style="width: ${progressPercent}%"></div>
                                                        </div>
                                                        ${!isUnlocked ? 
                                                            `<div class="next-hero-hint">
                                                                Прокачайте ${currentHero.name} до 9 уровня, чтобы открыть ${nextHero.name}!
                                                            </div>` : 
                                                            `<div class="next-hero-action">
                                                                <button class="btn-small" onclick="game.systems.hero.selectHero(${nextHero.id})">
                                                                    Выбрать ${nextHero.name}
                                                                </button>
                                                            </div>`
                                                        }
                                                    </div>
                                                </div>
                                            `;
                                        })()}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Область для оверлеев -->
                <div id="overlay-container" class="overlay-container"></div>
            </div>
        `;
        
        // Запускаем обновление полосок
        this.startHealthBarUpdates();
        
        setTimeout(() => {
            this.updateHealthAndExperienceBars();
        }, 100);

        console.log("✅ Экран героя успешно показан");
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    updateHeroDisplay(stats) {
        const currentHero = this.currentHero || window.game?.currentHero;
        if (!currentHero) return;
        
        // Обновляем полоску здоровья
        const healthBar = document.getElementById('heroHealthBar');
        if (healthBar) {
            const maxHealth = stats.maxHealth || 1;
            const currentHealth = stats.currentHealth || currentHero.currentHealth || 0;
            const healthPercent = Math.max(0, Math.min(100, (currentHealth / maxHealth) * 100));
            
            healthBar.style.width = `${healthPercent}%`;
            healthBar.textContent = `${Math.floor(currentHealth)}/${Math.floor(maxHealth)}`;
            
            if (currentHealth < maxHealth) {
                healthBar.classList.add('regening');
            } else {
                healthBar.classList.remove('regening');
            }
        }
        
        // Обновляем полоску опыта
        const expBar = document.getElementById('heroExperienceBar');
        if (expBar) {
            const expProgress = this.getExperienceProgress(currentHero);
            expBar.style.width = `${expProgress.percent}%`;
            
            if (expProgress.next === 'MAX') {
                expBar.textContent = `MAX Уровень`;
            } else {
                expBar.textContent = `${expProgress.current}/${expProgress.next}`;
            }
        }
    }

    startHealthBarUpdates() {
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
            const healthPercent = Math.max(1, (stats.currentHealth / stats.maxHealth) * 100);
            healthBar.style.width = `${healthPercent}%`;
            healthBar.textContent = `${Math.floor(stats.currentHealth)}/${Math.floor(stats.maxHealth)}`;
            
            healthBar.classList.remove('health-high', 'health-medium', 'health-low');
            if (healthPercent > 70) {
                healthBar.classList.add('health-high');
            } else if (healthPercent > 30) {
                healthBar.classList.add('health-medium');
            } else {
                healthBar.classList.add('health-low');
            }
            
            if (currentHero.currentHealth < stats.maxHealth) {
                healthBar.classList.add('regening');
            } else {
                healthBar.classList.remove('regening');
            }
        }
        
        // Обновляем полоску опыта
        const expBar = document.getElementById('heroExperienceBar');
        if (expBar) {
            const expProgress = this.getExperienceProgress(currentHero);
            expBar.style.width = `${expProgress.percent}%`;
            
            if (expProgress.next === 'MAX') {
                expBar.textContent = `MAX Уровень`;
            } else {
                expBar.textContent = `${expProgress.current}/${expProgress.next}`;
            }
        }
    }

    getExperiencePercent(hero) {
        if (!hero || !window.game?.systems?.level) {
            return 0;
        }
        return window.game.systems.level.getExperiencePercent(hero);
    }

    getExperienceProgress(hero) {
        if (!hero || !window.game?.systems?.level) {
            return { percent: 0, current: 0, next: 0, totalForNext: 0 };
        }
        return window.game.systems.level.getExperienceProgress(hero);
    }

    // ========== МЕТОДЫ ДЛЯ РАБОТЫ С УРОВНЯМИ ==========
    levelUp(hero) {
        const targetHero = hero || this.currentHero || window.game?.currentHero;
        if (!targetHero) return 0;

        const oldLevel = targetHero.level;
        
        // Используем LevelSystem
        if (window.game?.systems?.level) {
            window.game.systems.level.addExperience(targetHero, 0);
        } else {
            // Резервный код
            targetHero.level++;
            targetHero.experience = 0;
            
            targetHero.baseHealth = Math.round(targetHero.baseHealth * 1.1);
            targetHero.baseDamage = Math.round(targetHero.baseDamage * 1.1);
            targetHero.baseArmor = Math.round(targetHero.baseArmor * 1.05);
            
            const stats = this.calculateHeroStats(targetHero);
            targetHero.currentHealth = stats.maxHealth;
        }
        
        const newLevel = targetHero.level;
        
        // ⭐ КЛЮЧЕВОЕ: Проверяем разблокировку следующего героя при достижении 9 уровня
        if (newLevel >= 9 && oldLevel < 9) {
            const nextHeroId = targetHero.id + 1;
            this.checkAndUnlockNextHero(nextHeroId, targetHero);
        }
        
        this.showNotification(`🎉 ${targetHero.name} достиг ${targetHero.level} уровня!`);
        
        // Обновляем интерфейс
        this.showHeroGameScreen();
        
        // Проверяем разблокировку новых героев
        this.checkHeroUnlocks();
        
        // Сохраняем
        if (window.game) window.game.saveGame();
        
        return targetHero.level;
    }

    checkAndUnlockNextHero(nextHeroId, currentHero) {
        const nextHero = this.heroes.find(h => h.id === nextHeroId);
        if (!nextHero) return;
        
        if (!nextHero.unlocked) {
            this.unlockHero(nextHeroId, `${currentHero.name} достиг 9 уровня!`);
            
            // Показываем специальное уведомление
            this.showNotification(`🎊 Поздравляем! Открыт новый герой: ${nextHero.name}!`, 'success');
        }
    }

    addExperience(hero, exp) {
        const targetHero = hero || this.currentHero || window.game?.currentHero;
        if (!targetHero) return 0;

        // Используем LevelSystem
        if (window.game?.systems?.level) {
            window.game.systems.level.addExperience(targetHero, exp);
        } else {
            // Резервный код
            targetHero.experience += exp;
            const neededExp = this.getExperienceForNextLevel(targetHero.level);
            
            if (targetHero.experience >= neededExp) {
                this.levelUp(targetHero);
            }
        }
        
        // Обновляем интерфейс
        this.calculateHeroStats();
        
        // Сохраняем
        if (window.game) window.game.saveGame();
        
        return exp;
    }

    getExperienceForNextLevel(level) {
        if (!window.game?.systems?.level) {
            return 'MAX';
        }
        return window.game.systems.level.getExperienceForNextLevel(level);
    }

    // ========== МЕТОДЫ УПРАВЛЕНИЯ ГЕРОЕМ ==========
    resetCurrentHero() {
        const currentHero = this.currentHero || window.game?.currentHero;
        if (!currentHero) {
            this.showNotification("❌ Нет текущего героя для сброса");
            return;
        }
        
        if (!confirm(`⚠️ Вы уверены что хотите сбросить героя "${currentHero.name}"?\n\nВсе характеристики, предметы и прогресс будут сброшены к базовым значениям.`)) {
            return;
        }
        
        // Находим оригинальные данные
        const originalHero = this.heroes.find(h => h.id === currentHero.id);
        if (!originalHero) {
            this.showNotification("❌ Не удалось найти оригинальные данные героя");
            return;
        }
        
        // Сбрасываем характеристики
        Object.assign(currentHero, {
            baseHealth: originalHero.baseHealth,
            baseDamage: originalHero.baseDamage,
            baseArmor: originalHero.baseArmor,
            gold: originalHero.gold,
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
                boots: null,
                relic: null
            },
            currentHealth: originalHero.baseHealth,
            healthRegen: originalHero.healthRegen || 1.0,
            isInPostDeathRegeneration: false
        });
        
        this.showNotification(`🔄 ${currentHero.name} сброшен к начальным значениям`);
        
        // Обновляем интерфейс
        this.showHeroGameScreen();
        
        // Сохраняем
        if (window.game) window.game.saveGame();
    }

    takeDamage(hero, damage) {
        const targetHero = hero || this.currentHero || window.game?.currentHero;
        if (!targetHero) return 0;

        const stats = this.calculateHeroStats(targetHero);
        const actualDamage = Math.max(1, damage - stats.armor);
        const newHealth = Math.max(0, stats.currentHealth - actualDamage);
        
        targetHero.currentHealth = newHealth;
        
        if (newHealth <= 0) {
            this.handleHeroDeath(targetHero);
        } else {
            this.calculateHeroStats();
        }
        
        if (window.game) window.game.saveGame();
        
        return actualDamage;
    }

    heal(hero, amount) {
        const targetHero = hero || this.currentHero || window.game?.currentHero;
        if (!targetHero) return 0;

        const stats = this.calculateHeroStats(targetHero);
        targetHero.currentHealth = Math.min(stats.maxHealth, (targetHero.currentHealth || stats.currentHealth) + amount);
        
        this.calculateHeroStats();
        
        if (window.game) window.game.saveGame();
        
        return amount;
    }

    handleHeroDeath(hero = null) {
        const targetHero = hero || this.currentHero || window.game?.currentHero;
        if (!targetHero) return;
        
        targetHero.currentHealth = 1;
        targetHero.deaths = (targetHero.deaths || 0) + 1;
        
        this.calculateHeroStats(targetHero);
        
        if (window.game) {
            window.game.saveGame();
        }
        
        this.showNotification(`💀 ${targetHero.name} повержен! Здоровье восстановится до 1.`, 'warning');
        
        this.startPostDeathRegeneration(targetHero);
    }

    startPostDeathRegeneration(hero = null) {
        const targetHero = hero || this.currentHero || window.game?.currentHero;
        if (!targetHero) return;
        
        let regenerationInterval;
        let regenerationAttempts = 0;
        const maxRegenerationAttempts = 300;
        
        const regenerate = () => {
            regenerationAttempts++;
            
            if (regenerationAttempts > maxRegenerationAttempts) {
                clearInterval(regenerationInterval);
                return;
            }
            
            const stats = this.calculateHeroStats(targetHero);
            
            if (targetHero.currentHealth >= stats.maxHealth) {
                clearInterval(regenerationInterval);
                return;
            }
            
            const baseRegen = 2;
            const bonusRegen = (stats.healthRegen || 1) * baseRegen;
            const totalRegen = baseRegen + bonusRegen;
            
            const newHealth = Math.min(
                stats.maxHealth,
                targetHero.currentHealth + totalRegen
            );
            
            if (newHealth !== targetHero.currentHealth) {
                targetHero.currentHealth = newHealth;
                
                this.updateHealthAndExperienceBars();
                
                if (regenerationAttempts % 10 === 0 && window.game) {
                    window.game.saveGame();
                }
            }
        };
        
        regenerationInterval = setInterval(regenerate, 1000);
        this.postDeathRegenerationInterval = regenerationInterval;
    }

    // ========== ЭКИПИРОВКА ==========
    equipItem(itemId, slot = null) {
        const currentHero = this.currentHero || window.game?.currentHero;
        if (!currentHero) return false;

        const equipmentSystem = window.game ? window.game.systems.equipment : null;
        if (!equipmentSystem) return false;

        const item = equipmentSystem.getItemById(itemId);
        if (!item) return false;

        if (!slot) {
            slot = equipmentSystem.getEquipmentSlot(item);
        }

        if (!slot) {
            this.showNotification(`❌ Нельзя экипировать ${item.name}`);
            return false;
        }

        if (!equipmentSystem.canEquipItem(item, currentHero)) {
            this.showNotification(`❌ ${item.name} нельзя экипировать`);
            return false;
        }

        const currentItemId = currentHero.equipment[slot];
        if (currentItemId) {
            this.unequipItem(slot);
        }

        currentHero.equipment[slot] = itemId;
        currentHero.inventory = currentHero.inventory.filter(id => id !== itemId);

        this.showNotification(`🎯 Надето: ${item.name}`);
        
        this.calculateHeroStats();
        this.showHeroGameScreen();
        
        if (window.game) window.game.saveGame();
        
        return true;
    }

    unequipItem(slot) {
        const currentHero = this.currentHero || window.game?.currentHero;
        if (!currentHero) return false;

        const itemId = currentHero.equipment[slot];
        if (!itemId) return false;

        if (currentHero.inventory.length >= 10) {
            this.showNotification('❌ Инвентарь полон! Максимум 10 предметов');
            return false;
        }

        currentHero.equipment[slot] = null;
        currentHero.inventory.push(itemId);

        this.calculateHeroStats();
        this.showHeroGameScreen();

        if (window.game) window.game.saveGame();
        
        return true;
    }

    // ========== ИСТОРИЯ ГЕРОЯ ==========
    showHeroStory() {
        const currentHero = this.currentHero || window.game?.currentHero;
        if (!currentHero) {
            this.showNotification("❌ Герой не выбран");
            return;
        }

        const videoId = "RMSFR6cbb9c";
        
        const app = document.getElementById('app');
        if (!app) return;

        app.innerHTML = `
            <div class="hero-story-screen">
                <div class="top-action-bar">
                    <button class="btn-top" id="backToHeroBtn">
                        ← Назад к герою
                    </button>
                    <button class="btn-top" id="changeHeroBtn">
                        🔁 Сменить героя
                    </button>
                    <button class="btn-top" id="reloadVideoBtn">
                        🔄 Перезагрузить видео
                    </button>
                </div>

                <div class="hero-story-container">
                    <div class="story-header">
                        <h1>📖 История Героя: ${currentHero.name}</h1>
                        <p class="hero-description">${currentHero.story || 'История этого героя пока не написана...'}</p>
                    </div>
                    
                    <div class="video-container">
                        <iframe 
                            id="heroVideo"
                            width="100%" 
                            height="100%" 
                            src="https://www.youtube.com/embed/${videoId}?autoplay=0&mute=0&controls=1&rel=0"
                            title="История ${currentHero.name}"
                            frameborder="0" 
                            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" 
                            allowfullscreen>
                        </iframe>
                    </div>
                    
                    <div class="story-info">
                        <div class="info-card">
                            <h3>🧬 Происхождение</h3>
                            <p><strong>Раса:</strong> ${this.getRaceName(currentHero.race)}</p>
                            <p><strong>Профессия:</strong> ${this.getClassName(currentHero.class)}</p>
                            <p><strong>Сага:</strong> ${this.getSagaName(currentHero.saga)}</p>
                        </div>
                        
                        <div class="info-card">
                            <h3>📊 Статистика</h3>
                            <p><strong>Уровень:</strong> ${currentHero.level}</p>
                            <p><strong>Убито монстров:</strong> ${currentHero.monstersKilled || 0}</p>
                            <p><strong>Смертей:</strong> ${currentHero.deaths || 0}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.setupStoryEventHandlers();
    }

    setupStoryEventHandlers() {
        const backBtn = document.getElementById('backToHeroBtn');
        const changeHeroBtn = document.getElementById('changeHeroBtn');
        const reloadBtn = document.getElementById('reloadVideoBtn');
        
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.showHeroGameScreen();
            });
        }
        
        if (changeHeroBtn) {
            changeHeroBtn.addEventListener('click', () => {
                this.showHeroSelection();
            });
        }
        
        if (reloadBtn) {
            reloadBtn.addEventListener('click', () => {
                this.reloadVideo();
            });
        }
    }

    reloadVideo() {
        const video = document.getElementById('heroVideo');
        if (video) {
            const currentSrc = video.src;
            video.src = '';
            setTimeout(() => {
                video.src = currentSrc;
                this.showNotification("🔄 Видео перезагружено");
            }, 100);
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ ОТОБРАЖЕНИЯ ==========
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
            'gladiator': '+20% к урону',
            'blacksmith': '+15% к броне'
        };
        return bonuses[className] || 'Нет бонуса';
    }

    getSagaBonusDescription(saga) {
        const bonuses = {
            'golden_egg': '+30% к здоровью',
            'vulkanor': '25% пенетрации брони',
            'well': '+30% к золоту',
            'pets': '+20% к урону',
            'following_sun': '+30% к регенерации',
            'vampire_crown': '5% вампиризма',
            'tiger_eye': '20% шанс крита',
            'sky_phenomena': '+15% к броне'
        };
        return bonuses[saga] || 'Нет бонуса';
    }

    getSlotIcon(slot) {
        const icons = {
            'main_hand': '⚔️',
            'off_hand': '🛡️',
            'helmet': '⛑️',
            'chest': '👕',
            'gloves': '🧤',
            'legs': '👖',
            'boots': '👢',
            'relic': '✨'
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
            'boots': 'Ботинки',
            'relic': 'Реліквія'
        };
        return names[slot] || slot;
    }

    showNotification(message, type = 'info') {
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Регистрируем систему в глобальной области
window.HeroSystem = HeroSystem;
console.log("📦 HeroSystem модуль загружен");
