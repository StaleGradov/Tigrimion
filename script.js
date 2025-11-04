// ========== МОДУЛЬ 1.1: ОСНОВНОЙ КЛАСС ИГРЫ С ПОЛНОЙ ИНТЕГРАЦИЕЙ ==========
class HeroGame {
    constructor() {
        // Массивы данных игры
        this.heroes = [];
        this.items = [];
        this.monsters = [];
        this.maps = [];
        this.locations = [];
        
        // Флаги отображения
        this.showReward = false;
        this.lastReward = 0;
        this.currentHero = null;
        this.currentScreen = 'hero-select';
        this.currentMap = null;
        this.currentLocation = null;
        this.currentMonster = null;
        
        // Свойства для системы боя
        this.battleActive = false;
        this.battleRound = 0;
        this.battleLog = [];
        this.lastHealthUpdate = Date.now();
        this.healthInterval = null;
        
        // Результат последнего боя
        this.battleResult = null;
        
        // Общий инвентарь
        this.globalInventory = [];
        
        // Система прогресса локаций
        this.locationProgress = {};
        this.monsterKillCount = {};
        
        // Видео для каждого героя
        this.heroVideos = {
            1: 'https://www.youtube.com/embed/mfziNIhX9mo',
            2: 'https://www.youtube.com/embed/dQw4w9WgXcQ',  
            3: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        };
        
        // Видео для карт
        this.videos = {
            map: 'https://www.youtube.com/embed/4gSmkjlEO_Q',
            location: 'https://www.youtube.com/embed/ytr51kwNLPo'
        };
        
        // Флаги показа видео
        this.showVideo = {
            hero: false,
            map: false,
            location: false
        };
        
        // НОВАЯ СИСТЕМА КАРТ - ПОЛНАЯ ИНТЕГРАЦИЯ
        this.mapSystem = {
            currentGlobalMap: null,
            currentLocalMap: null,
            currentTacticalMap: null,
            playerPosition: {
                global: { x: 2, y: 2 },
                local: { x: 4, y: 4 },
                tactical: { x: 5, y: 5 }
            },
            // Расширенные данные карт
            globalMaps: [
                { 
                    id: 1, 
                    name: "Арканиум", 
                    grid: { width: 5, height: 5 },
                    image: "images/maps/arcanium.jpg",
                    description: "Земля древней магии",
                    multiplier: 1.0,
                    unlocked: true
                }
            ],
            localMaps: [
                { 
                    id: 1, 
                    name: "Стартовая зона", 
                    grid: { width: 8, height: 8 },
                    image: "images/locations/level10.jpg",
                    monsterRange: [1, 5],
                    artifactChance: 0.01
                }
            ],
            tacticalMaps: [
                { 
                    id: 1, 
                    name: "Лесная поляна", 
                    grid: { width: 10, height: 10 },
                    image: "images/locations/level10.jpg",
                    encounterChance: 0.7,
                    treasureChance: 0.3
                }
            ]
        };
        
        // Запуск инициализации игры
        this.init();
    }

    // ========== МОДУЛЬ 1.2: ОСНОВНОЙ МЕТОД ИНИЦИАЛИЗАЦИИ ==========
    async init() {
        await this.loadGameData();
        this.initMapSystem(); // Инициализация новой системы карт
        this.initLocationSystem();
        this.loadSave();
        
        // Разблокировка первого героя по умолчанию
        if (this.heroes.length > 0) {
            const firstHero = this.heroes.find(h => h.id === 1);
            if (firstHero) {
                firstHero.unlocked = true;
            }
        }
        
        this.renderHeroSelect();
    }

    // ========== МОДУЛЬ 1.3: ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ КАРТ ==========
    initMapSystem() {
        // Устанавливаем текущие карты
        this.mapSystem.currentGlobalMap = this.mapSystem.globalMaps[0];
        this.mapSystem.currentLocalMap = this.mapSystem.localMaps[0];
        this.mapSystem.currentTacticalMap = this.mapSystem.tacticalMaps[0];
        
        console.log('✅ Система карт инициализирована:', {
            global: this.mapSystem.currentGlobalMap.name,
            local: this.mapSystem.currentLocalMap.name,
            tactical: this.mapSystem.currentTacticalMap.name
        });
    }

    // ========== МОДУЛЬ 1.4: ИНИЦИАЛИЗАЦИЯ СИСТЕМЫ ЛОКАЦИЙ (АДАПТИРОВАННАЯ) ==========
    initLocationSystem() {
        // Используем локальные карты вместо локаций
        this.mapSystem.localMaps.forEach(localMap => {
            const locationId = localMap.id;
            
            if (!this.locationProgress[locationId]) {
                this.locationProgress[locationId] = {
                    unlocked: locationId === 1, // Первая локация доступна
                    monstersKilled: new Set(),
                    totalMonsters: localMap.monsterRange ? localMap.monsterRange[1] - localMap.monsterRange[0] + 1 : 5
                };
            }
        });
        
        // Инициализация счетчиков убийств для каждого монстра
        this.monsters.forEach(monster => {
            if (!this.monsterKillCount[monster.id]) {
                this.monsterKillCount[monster.id] = 0;
            }
        });
    }
}
// ========== МОДУЛЬ 2.1: ИССЛЕДОВАНИЕ ТАКТИЧЕСКОЙ КАРТЫ С ПОЛНОЙ ИНТЕГРАЦИЕЙ ==========
HeroGame.prototype.exploreTacticalMap = function() {
    if (!this.currentHero) return;
    
    const pos = this.mapSystem.playerPosition.tactical;
    const map = this.mapSystem.currentTacticalMap;
    
    // Случайное перемещение на тактической карте
    pos.x = Math.floor(Math.random() * map.grid.width);
    pos.y = Math.floor(Math.random() * map.grid.height);
    
    this.addToLog(`⚔️ Исследование тактической карты: [${pos.x}, ${pos.y}]`);
    
    // Полная система событий при исследовании
    const eventRoll = Math.random();
    
    if (eventRoll < map.encounterChance) {
        this.encounterMonsterFromMap();
    } else if (eventRoll < map.encounterChance + map.treasureChance) {
        this.findTreasureOnMap();
    } else if (eventRoll < 0.9) {
        this.findItemOnMap();
    } else {
        this.findSpecialEvent();
    }
    
    this.saveGame();
    this.renderHeroScreen();
};

// ========== МОДУЛЬ 2.2: ВСТРЕЧА С МОНСТРОМ С УЧЕТОМ ЛОКАЦИИ ==========
HeroGame.prototype.encounterMonsterFromMap = function() {
    if (this.monsters.length === 0) {
        this.createFallbackMonsters();
    }
    
    const localMap = this.mapSystem.currentLocalMap;
    let availableMonsters = this.monsters;
    
    // Фильтрация монстров по диапазону текущей локальной карты
    if (localMap.monsterRange) {
        const [minId, maxId] = localMap.monsterRange;
        availableMonsters = this.monsters.filter(monster => 
            monster.id >= minId && monster.id <= maxId
        );
    }
    
    if (availableMonsters.length === 0) {
        availableMonsters = this.monsters;
    }
    
    const randomMonster = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
    const globalMap = this.mapSystem.currentGlobalMap;
    
    // Создание текущего монстра с учетом множителя карты
    this.currentMonster = {
        id: randomMonster.id,
        name: randomMonster.name,
        image: randomMonster.image,
        description: randomMonster.description,
        health: Math.round(randomMonster.health * globalMap.multiplier),
        damage: Math.round(randomMonster.damage * globalMap.multiplier),
        armor: Math.round(randomMonster.armor * globalMap.multiplier),
        reward: parseFloat((randomMonster.reward * globalMap.multiplier).toFixed(2)),
        power: Math.round(((randomMonster.health / 10) + (randomMonster.damage * 1.5) + (randomMonster.armor * 2)) * globalMap.multiplier),
        maxHealth: Math.round(randomMonster.health * globalMap.multiplier)
    };

    this.addToLog(`🎭 Встречен монстр: ${this.currentMonster.name}`);
    this.addToLog(`💪 Сила: ${this.currentMonster.power} | 💰 Награда: ${this.currentMonster.reward.toFixed(2)}`);
};

// ========== МОДУЛЬ 2.3: НАЙТИ СОКРОВИЩЕ С УЧЕТОМ КАРТЫ ==========
HeroGame.prototype.findTreasureOnMap = function() {
    const goldFound = Math.floor(Math.random() * 50) + 10;
    const mapMultiplier = this.mapSystem.currentGlobalMap.multiplier;
    const finalGold = Math.round(goldFound * mapMultiplier);
    
    this.currentHero.gold += finalGold;
    this.addToLog(`💰 Найдено сокровище! +${finalGold} золота`);
    this.saveGame();
};

// ========== МОДУЛЬ 2.4: НАЙТИ ПРЕДМЕТ НА КАРТЕ ==========
HeroGame.prototype.findItemOnMap = function() {
    if (this.currentHero.inventory.length >= 10) {
        this.addToLog('🎒 Инвентарь полон! Нельзя подобрать предмет.');
        return;
    }
    
    if (this.items.length === 0) return;
    
    const randomItem = this.items[Math.floor(Math.random() * this.items.length)];
    
    // Проверяем, есть ли уже такой предмет в инвентаре
    if (!this.currentHero.inventory.includes(randomItem.id)) {
        this.currentHero.inventory.push(randomItem.id);
        this.addToLog(`🎁 Найден предмет: ${randomItem.name}`);
    } else {
        this.addToLog(`🔍 Найден дубликат предмета: ${randomItem.name}`);
    }
    
    this.saveGame();
};

// ========== МОДУЛЬ 2.5: ОСОБОЕ СОБЫТИЕ ==========
HeroGame.prototype.findSpecialEvent = function() {
    const events = [
        "Вы нашли древний алтарь. Он излучает магическую энергию...",
        "Таинственный незнакомец предлагает вам сделку...",
        "Вы обнаружили скрытую пещеру с древними письменами...",
        "Вас озарило внезапное прозрение! Получено +10 опыта",
        "Вы нашли источник чистой энергии. Здоровье восстановлено!"
    ];
    
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    this.addToLog(`🌟 Особое событие: ${randomEvent}`);
    
    // Эффекты особых событий
    if (randomEvent.includes("опыта")) {
        this.addExperience(10);
    } else if (randomEvent.includes("Здоровье")) {
        this.currentHero.currentHealth = this.calculateMaxHealth();
        this.addToLog("❤️ Здоровье полностью восстановлено!");
    }
};

// ========== МОДУЛЬ 2.6: ПЕРЕМЕЩЕНИЕ ПО ЛОКАЛЬНОЙ КАРТЕ С ПРОГРЕССОМ ==========
HeroGame.prototype.moveOnLocalMap = function() {
    const pos = this.mapSystem.playerPosition.local;
    const map = this.mapSystem.currentLocalMap;
    
    // Случайное перемещение
    pos.x = Math.floor(Math.random() * map.grid.width);
    pos.y = Math.floor(Math.random() * map.grid.height);
    
    this.addToLog(`📍 Исследование локальной карты: [${pos.x}, ${pos.y}]`);
    
    // Шанс встретить монстра при исследовании с учетом прогресса
    const progress = this.locationProgress[map.id];
    const explorationChance = progress && progress.monstersKilled.size >= progress.totalMonsters ? 0.3 : 0.7;
    
    if (Math.random() < explorationChance) {
        this.encounterMonsterFromMap();
    } else {
        this.addToLog("🌿 Эта область кажется безопасной...");
    }
    
    this.saveGame();
    this.renderHeroScreen();
};
// ========== МОДУЛЬ 3.1: ОБНОВЛЕННЫЙ РЕНДЕР ГЕРОЯ С ПОЛНОЙ ИНФОРМАЦИЕЙ ==========
HeroGame.prototype.renderHeroScreen = function() {
    if (!this.currentHero) {
        this.currentHero = this.heroes.find(h => h.unlocked) || this.heroes[0];
        if (!this.currentHero) return;
    }

    const stats = this.calculateHeroStats(this.currentHero);
    const bonuses = this.getBonuses();
    const activeBonuses = this.getAllActiveBonuses(this.currentHero);
    
    const healthPercent = (stats.currentHealth / stats.maxHealth) * 100;
    const nextLevelExp = this.getLevelRequirements()[this.currentHero.level + 1];
    const expProgress = nextLevelExp ? (this.currentHero.experience / nextLevelExp) * 100 : 100;

    // Получение экипированных предметов
    const getEquippedItemWithRarity = (slot) => {
        const itemId = this.currentHero.equipment[slot];
        if (!itemId) return null;
        
        const item = this.items.find(item => item.id === itemId);
        if (!item) return null;
        
        return {
            item: item,
            rarity: item.rarity || 'common'
        };
    };

    const weaponMain = getEquippedItemWithRarity('main_hand');
    const weaponOff = getEquippedItemWithRarity('off_hand');
    const armorHelmet = getEquippedItemWithRarity('helmet');
    const armorChest = getEquippedItemWithRarity('chest');
    const armorGloves = getEquippedItemWithRarity('gloves');
    const armorLegs = getEquippedItemWithRarity('legs');
    const armorBoots = getEquippedItemWithRarity('boots');

    const raceName = bonuses.races[this.currentHero.race]?.name || 'Неизвестно';
    const className = bonuses.classes[this.currentHero.class]?.name || 'Неизвестно';
    const sagaName = bonuses.sagas[this.currentHero.saga]?.name || 'Неизвестно';

    const container = document.getElementById('app');
    
    container.innerHTML = `
        <div class="screen active" id="screen-main">
            <!-- Кнопки действий -->
            <div class="action-buttons">
                <button class="btn-primary" onclick="game.startAdventure()">🎲 Путешествие</button>
                <button class="btn-secondary" onclick="game.showInventory()">🎒 Инвентарь</button>
                <button class="btn-secondary" onclick="game.showMerchant()">🏪 Магазин</button>
                <button class="btn-danger" onclick="game.resetHero()">🔄 Сброс</button>
                <button class="btn-secondary" onclick="game.renderHeroSelect()">🔁 Герои</button>
            </div>

            <!-- Основной layout с 4 колонками -->
            <div class="hero-layout">
                <!-- Колонка 1: Герой -->
                <div class="hero-column">
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">🎯 ${this.currentHero.name}</div>
                        
                        <!-- Информация о здоровье -->
                        <div class="hero-info">
                            <div class="health-display">
                                <div class="health-bar-container">
                                    <div class="health-bar">
                                        <div class="health-bar-fill" style="width: ${healthPercent}%"></div>
                                    </div>
                                    <div class="health-text">
                                        ❤️ <span id="current-health">${stats.currentHealth}</span>/<span id="max-health">${stats.maxHealth}</span>
                                    </div>
                                </div>
                                <div class="health-regen">
                                    ⚡ ${Math.round(this.currentHero.healthRegen * 60 * (1 + stats.bonuses.health_regen_mult))}/мин
                                </div>
                            </div>

                            <!-- Основные характеристики -->
                            <div class="hero-main-stats">
                                <div class="main-stat">
                                    <span class="stat-icon">⚔️</span>
                                    <span class="stat-value">${stats.damage}</span>
                                    ${stats.bonuses.damage_mult > 0 ? `<div class="bonus-value">+${Math.round(stats.bonuses.damage_mult * 100)}%</div>` : ''}
                                </div>
                                <div class="main-stat">
                                    <span class="stat-icon">🛡️</span>
                                    <span class="stat-value">${stats.armor}</span>
                                    ${stats.bonuses.armor_mult > 0 ? `<div class="bonus-value">+${Math.round(stats.bonuses.armor_mult * 100)}%</div>` : ''}
                                </div>
                                <div class="main-stat">
                                    <span class="stat-icon">🌟</span>
                                    <span class="stat-value">${stats.power}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Секция бонусов -->
                        <div class="bonuses-section">
                            <h3>🎯 Активные бонусы</h3>
                            <!-- Бонусы расы -->
                            ${activeBonuses.race.length > 0 ? `
                                <div class="bonus-source-group">
                                    <div class="bonus-source-title">🧬 Раса (${raceName})</div>
                                    <div class="bonus-display">
                                        ${activeBonuses.race.map(bonus => `
                                            <div class="bonus-badge race-bonus" title="${bonus.description}">
                                                ${this.getBonusIcon(bonus.type)} ${Math.round(bonus.value * 100)}%
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- Бонусы класса -->
                            ${activeBonuses.class.length > 0 ? `
                                <div class="bonus-source-group">
                                    <div class="bonus-source-title">⚔️ Класс (${className})</div>
                                    <div class="bonus-display">
                                        ${activeBonuses.class.map(bonus => `
                                            <div class="bonus-badge class-bonus" title="${bonus.description}">
                                                ${this.getBonusIcon(bonus.type)} ${Math.round(bonus.value * 100)}%
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <!-- Бонусы саги -->
                            ${activeBonuses.saga.length > 0 ? `
                                <div class="bonus-source-group">
                                    <div class="bonus-source-title">📖 Сага (${sagaName})</div>
                                    <div class="bonus-display">
                                        ${activeBonuses.saga.map(bonus => `
                                            <div class="bonus-badge saga-bonus" title="${bonus.description}">
                                                ${this.getBonusIcon(bonus.type)} ${Math.round(bonus.value * 100)}%
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>

                        <!-- Секция экипировки -->
                        <div class="equipment-section">
                            <div class="equipment-slot weapon-slot main-hand ${weaponMain ? 'equipped' : 'empty'}" 
                                 ${weaponMain ? `data-rarity="${weaponMain.rarity}"` : ''}
                                 onclick="game.openInventoryFromSlot('main_hand')">
                                <div class="equipment-icon">
                                    ${weaponMain ? '<img src="' + weaponMain.item.image + '" alt="' + weaponMain.item.name + '">' : '⚔️'}
                                </div>
                            </div>
                            
                            <div class="equipment-slot weapon-slot off-hand ${weaponOff ? 'equipped' : 'empty'}" 
                                 ${weaponOff ? `data-rarity="${weaponOff.rarity}"` : ''}
                                 onclick="game.openInventoryFromSlot('off_hand')">
                                <div class="equipment-icon">
                                    ${weaponOff ? '<img src="' + weaponOff.item.image + '" alt="' + weaponOff.item.name + '">' : '🛡️'}
                                </div>
                            </div>
                            
                            <div class="equipment-slot armor-slot helmet-slot ${armorHelmet ? 'equipped' : 'empty'}" 
                                 ${armorHelmet ? `data-rarity="${armorHelmet.rarity}"` : ''}
                                 onclick="game.openInventoryFromSlot('helmet')">
                                <div class="equipment-icon">
                                    ${armorHelmet ? '<img src="' + armorHelmet.item.image + '" alt="' + armorHelmet.item.name + '">' : '⛑️'}
                                </div>
                            </div>
                            
                            <div class="equipment-slot armor-slot chest-slot ${armorChest ? 'equipped' : 'empty'}" 
                                 ${armorChest ? `data-rarity="${armorChest.rarity}"` : ''}
                                 onclick="game.openInventoryFromSlot('chest')">
                                <div class="equipment-icon">
                                    ${armorChest ? '<img src="' + armorChest.item.image + '" alt="' + armorChest.item.name + '">' : '👕'}
                                </div>
                            </div>
                            
                            <div class="equipment-slot empty" onclick="game.openInventoryFromSlot('inventory')" title="Открыть инвентарь">
                                <div class="equipment-icon">🎒</div>
                            </div>
                        </div>
                        
                        <!-- Прогресс уровня -->
                        <div class="level-progress">
                            <div class="level-progress-fill" style="width: ${expProgress}%"></div>
                        </div>
                        <div class="hero-progress">
                            <span>Ур.${this.currentHero.level}</span>
                            <span>💰${this.currentHero.gold.toFixed(2)}</span>
                            <span>⚡${this.currentHero.experience}/${nextLevelExp || 'MAX'}</span>
                        </div>
                        
                        <!-- Статистика героя -->
                        <div class="hero-stats">
                            <div class="stat-item">
                                <span class="stat-icon">💀</span>
                                <span class="stat-label">Убийств:</span>
                                <span class="stat-value">${this.currentHero.monstersKilled || 0}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-icon">☠️</span>
                                <span class="stat-label">Смертей:</span>
                                <span class="stat-value">${this.currentHero.deaths || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Колонка 2: Глобальная карта -->
                <div class="monster-column">
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">🗺️ Глобальная карта</div>
                        ${this.renderGlobalMapColumn()}
                    </div>
                </div>

                <!-- Колонка 3: Локальная карта -->
                <div class="map-column">
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">📍 Локальная карта</div>
                        ${this.renderLocalMapColumn()}
                    </div>
                </div>

                <!-- Колонка 4: Тактическая карта -->
                <div class="location-column">
                    <div class="column-overlay"></div>
                    <div class="column-content">
                        <div class="column-title">⚔️ Тактическая карта</div>
                        ${this.renderTacticalMapColumn()}
                    </div>
                </div>
            </div>

            <!-- Лог событий и бой -->
            <div class="battle-log-container">
                ${this.renderBattleInterface()}
                <div class="battle-log" id="battle-log">
                    <div class="log-entry">Добро пожаловать в игру! Исследуйте карты чтобы найти приключения.</div>
                </div>
            </div>
        </div>
    `;

    this.startHealthAnimation();
};
// ========== МОДУЛЬ 4.1: ПОКАЗАТЬ МАГАЗИН (ПОЛНАЯ ВЕРСИЯ) ==========
HeroGame.prototype.showMerchant = function() {
    // Удаляем только существующие экраны магазина и инвентаря
    const existingScreens = document.querySelectorAll('#screen-merchant, #screen-inventory');
    existingScreens.forEach(screen => screen.remove());
    
    const availableItems = this.items.filter(item => item.requiredLevel <= (this.currentHero?.level || 1));
    
    // Группировка предметов по типам
    const categorizedItems = this.categorizeItems(availableItems);
    
    const merchantHTML = this.renderCategorizedShop(categorizedItems);
    
    const container = document.getElementById('app');
    container.innerHTML += `
        <div class="screen active" id="screen-merchant">
            <div class="merchant-header">
                <h3 class="text-center">🏪 Магазин снаряжения</h3>
                <div class="hero-merchant-info">
                    <div class="merchant-stats">
                        <span class="gold-amount">💰 ${this.currentHero?.gold.toFixed(2) || 0}</span>
                        <span class="inventory-space">🎒 ${10 - (this.currentHero?.inventory?.length || 0)}/10</span>
                    </div>
                </div>
            </div>
            
            <div class="shop-categories">
                <button class="category-tab active" data-category="all">Все предметы</button>
                <button class="category-tab" data-category="weapon">⚔️ Оружие</button>
                <button class="category-tab" data-category="helmet">⛑️ Шлемы</button>
                <button class="category-tab" data-category="chest">👕 Броня</button>
            </div>
            
            <div class="merchant-items-container">
                ${merchantHTML}
            </div>
            
            <div class="action-buttons">
                <button class="btn-secondary" onclick="game.closeMerchant()">← Назад к герою</button>
            </div>
        </div>
    `;

    this.initializeShopFilters();
    this.showScreen('merchant');
};

// ========== МОДУЛЬ 4.2: ПОКАЗАТЬ ИНВЕНТАРЬ (ПОЛНАЯ ВЕРСИЯ) ==========
HeroGame.prototype.showInventory = function(targetSlot = null) {
    if (!this.currentHero) return;

    // Удаляем только существующие экраны магазина и инвентаря
    const existingScreens = document.querySelectorAll('#screen-merchant, #screen-inventory');
    existingScreens.forEach(screen => screen.remove());

    // ОБНОВЛЯЕМ ОТОБРАЖЕНИЕ ЭКИПИРОВКИ ПЕРЕД ПОКАЗОМ ИНВЕНТАРЯ
    this.updateEquipmentDisplay();

    // Фильтрация предметов для выбранного слота
    let filteredItems = this.currentHero.inventory;
    let filterInfo = '';
    
    if (targetSlot && targetSlot !== 'inventory') {
        filteredItems = this.getItemsForSlot(targetSlot);
        filterInfo = `
            <div style="text-align: center; margin-bottom: 10px; background: rgba(76, 201, 240, 0.2); padding: 8px; border-radius: 8px; border: 1px solid #4cc9f0;">
                <strong>🎯 Выбор предмета для: ${this.getSlotName(targetSlot)}</strong>
                <div style="font-size: 0.8em; margin-top: 4px; color: #4cc9f0;">
                    Показано: ${filteredItems.length} подходящих предметов
                </div>
            </div>
        `;
    }

    const inventoryHTML = filteredItems.map(itemId => {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return '';
        
        const isEquipped = Object.values(this.currentHero.equipment).includes(itemId);
        const frameColor = this.getItemFrameColor(item.rarity);
        
        return `
            <div class="inventory-item" onclick="game.equipItem(${itemId})" style="border-color: ${frameColor};">
                <div class="inventory-item-image">
                    <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
                </div>
                <div class="inventory-item-info">
                    <strong style="color: ${frameColor};">${item.name}</strong>
                    <div class="item-stats">
                        ${item.fixed_damage ? `<span>⚔️ Урон: +${item.fixed_damage}</span>` : ''}
                        ${item.fixed_armor ? `<span>🛡️ Броня: +${item.fixed_armor}</span>` : ''}
                        ${item.heal ? `<span>❤️ Лечение: +${item.heal}</span>` : ''}
                        ${item.bonus ? `<span>🎯 ${this.formatBonus(item.bonus)}</span>` : ''}
                        ${item.fixed_health ? `<span>❤️ Здоровье: +${item.fixed_health}</span>` : ''}
                    </div>
                    <small>${item.description}</small>
                    ${isEquipped ? '<small style="color: #4ade80;">✓ Надето</small>' : '<small style="color: #4cc9f0;">📦 В инвентаре</small>'}
                    ${item.setName ? `<small style="color: #f59e0b;">✨ Часть сета: ${this.getItemSetConfig()[item.setName]?.name || item.setName}</small>` : ''}
                    ${targetSlot && targetSlot !== 'inventory' ? `<small style="color: #ffd700;">🎯 Подходит для: ${this.getSlotName(targetSlot)}</small>` : ''}
                </div>
            </div>
        `;
    }).join('');

    const container = document.getElementById('app');
    container.innerHTML += `
        <div class="screen active" id="screen-inventory">
            <h3 class="text-center">🎒 Инвентарь</h3>
            ${filterInfo}
            <div class="inventory-info" style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 8px;">
                    <span>💰 Ваше золото: ${this.currentHero?.gold.toFixed(2) || 0}</span>
                    <span>🎒 Свободно мест: ${10 - (this.currentHero?.inventory?.length || 0)}/10</span>
                </div>
            </div>
            <div class="inventory-grid">
                ${inventoryHTML || '<div class="text-center">Инвентарь пуст</div>'}
            </div>
            <div class="action-buttons">
                ${targetSlot ? `
                    <button class="btn-secondary" onclick="game.showInventory()">📦 Показать все предметы</button>
                ` : ''}
                <button class="btn-secondary" onclick="game.closeInventory()">← Назад к герою</button>
            </div>
        </div>
    `;

    this.showScreen('inventory');
};

// ========== МОДУЛЬ 4.3: ЭКИПИРОВКА ПРЕДМЕТА (ПОЛНАЯ ВЕРСИЯ) ==========
HeroGame.prototype.equipItem = function(itemId) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;

    // Использование зелья
    if (item.type === 'potion') {
        this.usePotion(item);
        return;
    }

    // Проверка совместимости оружия
    if (!this.canEquipWeapon(item, this.currentHero.equipment)) {
        this.addToLog(`❌ Нельзя экипировать ${item.name} - несовместимо с текущим оружием`);
        return;
    }

    let slot = item.slot;
    if (!slot) {
        slot = this.getEquipmentSlot(item);
    }

    // Особые случаи для двуручного оружия
    if (item.weaponType === 'two_handed') {
        // Снимаем всё что было в руках
        this.unequipToInventory('main_hand');
        this.unequipToInventory('off_hand');
        
        // Экипируем в обе руки
        this.currentHero.equipment.main_hand = itemId;
        this.currentHero.equipment.off_hand = itemId;
        
    } else {
        // Стандартная экипировка
        const currentEquipped = this.currentHero.equipment[slot];
        if (currentEquipped) {
            this.unequipToInventory(slot);
        }
        this.currentHero.equipment[slot] = itemId;
    }

    // Убираем из инвентаря
    this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);

    this.addToLog(`🎯 Надето: ${item.name}`);
    
    // Проверяем бонусы сетов
    this.checkSetBonuses();
    
    this.saveGame();
    
    // ОБНОВЛЯЕМ ИНТЕРФЕЙС
    this.updateEquipmentDisplay();
    
    // ОБНОВЛЯЕМ ИНВЕНТАРЬ
    const targetSlot = this.getEquipmentSlot(item);
    this.showInventory(targetSlot);
};
// ========== МОДУЛЬ 5.1: НАЧАТЬ БОЙ С ИНТЕГРАЦИЕЙ КАРТ ==========
HeroGame.prototype.startBattle = function() {
    if (!this.currentMonster || this.battleActive) return;
    
    this.battleActive = true;
    this.battleRound = 0;
    this.battleLog = [];
    this.currentHero.stamina = 0;
    this.currentMonster.currentHealth = this.currentMonster.health;
    
    this.addBattleLog({
        message: `⚔️ Бой начался! ${this.currentHero.name} против ${this.currentMonster.name}`,
        type: 'battle-start'
    });
    
    this.renderHeroScreen();
};

// ========== МОДУЛЬ 5.2: ЗАВЕРШЕНИЕ БОЯ С ОБНОВЛЕНИЕМ ПРОГРЕССА КАРТ ==========
HeroGame.prototype.endBattle = function(victory) {
    if (victory) {
        // Расчет награды за победу
        const totals = this.calculateTotalBonuses();
        const baseReward = this.currentMonster.reward;
        const goldMultiplier = 1 + totals.gold_mult;
        const reward = parseFloat((baseReward * goldMultiplier).toFixed(2));
        
        this.currentHero.gold = parseFloat((this.currentHero.gold + reward).toFixed(2));
        this.lastReward = reward;
        
        const baseExperience = Math.max(10, Math.floor(this.currentMonster.power / 2));
        const experienceGained = baseExperience;
        
        this.addExperience(experienceGained);
        this.currentHero.monstersKilled = (this.currentHero.monstersKilled || 0) + 1;
        
        // Обновление прогресса локальной карты
        this.updateMapProgress(this.currentMonster.id);
        
        this.addBattleLog({
            message: `🎉 ПОБЕДА! Получено ${reward.toFixed(2)} золота (база: ${baseReward} + бонусы) и ${experienceGained} опыта`,
            type: 'victory'
        });
        
        this.addToLog(`🎯 Побежден ${this.currentMonster.name}! Получено ${reward.toFixed(2)} золота и ${experienceGained} опыта`);
        
        this.checkSpecialDrops();
        
        this.battleResult = {
            victory: true,
            reward: reward,
            experience: experienceGained,
            monsterName: this.currentMonster.name
        };
        
    } else {
        // Обработка поражения
        this.currentHero.currentHealth = 1;
        this.currentHero.deaths = (this.currentHero.deaths || 0) + 1;
        
        this.addBattleLog({
            message: '💀 ПОРАЖЕНИЕ! Герой повержен. Здоровье восстанавливается с 1 единицы.',
            type: 'defeat'
        });
        
        this.addToLog('💥 Проигран бой с ' + this.currentMonster.name + '. Здоровье восстанавливается с 1 единицы.');
        
        this.battleResult = {
            victory: false,
            monsterName: this.currentMonster.name
        };
    }
    
    // Сброс состояния боя
    this.battleActive = false;
    this.currentMonster = null;
    this.battleRound = 0;
    this.battleLog = [];
    this.currentHero.stamina = 0;
    
    this.saveGame();
    this.renderHeroScreen();
};

// ========== МОДУЛЬ 5.3: ОБНОВЛЕНИЕ ПРОГРЕССА КАРТ ==========
HeroGame.prototype.updateMapProgress = function(monsterId) {
    const localMap = this.mapSystem.currentLocalMap;
    if (!localMap) return;
    
    const progress = this.locationProgress[localMap.id];
    
    if (progress) {
        progress.monstersKilled.add(monsterId);
        this.monsterKillCount[monsterId] = (this.monsterKillCount[monsterId] || 0) + 1;
        
        const allMonstersKilled = this.checkIfAllMonstersKilledOnMap(localMap.id);
        if (allMonstersKilled) {
            this.completeLocalMap(localMap.id);
        }
        
        this.saveGame();
    }
};

// ========== МОДУЛЬ 5.4: ПРОВЕРКА УБИТЫ ЛИ ВСЕ МОНСТРЫ НА КАРТЕ ==========
HeroGame.prototype.checkIfAllMonstersKilledOnMap = function(mapId) {
    const localMap = this.mapSystem.localMaps.find(m => m.id === mapId);
    if (!localMap || !localMap.monsterRange) return false;
    
    const progress = this.locationProgress[mapId];
    if (!progress) return false;
    
    const [startMonster, endMonster] = localMap.monsterRange;
    for (let monsterId = startMonster; monsterId <= endMonster; monsterId++) {
        if (!progress.monstersKilled.has(monsterId)) {
            return false;
        }
    }
    
    return true;
};

// ========== МОДУЛЬ 5.5: ЗАВЕРШЕНИЕ ЛОКАЛЬНОЙ КАРТЫ ==========
HeroGame.prototype.completeLocalMap = function(mapId) {
    const nextMapId = mapId + 1;
    const nextProgress = this.locationProgress[nextMapId];
    
    if (nextProgress) {
        nextProgress.unlocked = true;
        this.addToLog('🎉 Локальная карта "' + this.getMapName(mapId) + '" завершена!');
        this.addToLog('🔓 Открыта новая локальная карта: "' + this.getMapName(nextMapId) + '"');
    }
    
    this.saveGame();
};

// ========== МОДУЛЬ 5.6: ПОЛУЧЕНИЕ НАЗВАНИЯ КАРТЫ ==========
HeroGame.prototype.getMapName = function(mapId) {
    const map = this.mapSystem.localMaps.find(m => m.id === mapId);
    return map ? map.name : 'Неизвестная карта';
};
// ========== МОДУЛЬ 6.1: ЗАПУСК ПОЛНОЙ ИГРЫ ==========
console.log('🚀 HeroGame с полной интеграцией системы карт загружен!');

let game;

// Запуск игры после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('✅ DOM загружен');
        game = new HeroGame();
        window.game = game;
    });
} else {
    console.log('✅ DOM уже готов');
    game = new HeroGame();
    window.game = game;
}
