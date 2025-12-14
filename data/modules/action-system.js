// ========== ПРЕДВАРИТЕЛЬНАЯ РЕГИСТРАЦИЯ ДЛЯ ЗАГРУЗЧИКА ==========
if (typeof window !== 'undefined') {
    if (!window.ActionSystem) {
        window.ActionSystem = class ActionSystemPlaceholder {
            constructor(mapSystem) {
                console.log("📦 ActionSystemPlaceholder создан для загрузчика");
                this.mapSystem = mapSystem;
            }
            init() { return Promise.resolve(true); }
        };
        console.log("✅ ActionSystem предварительно зарегистрирован");
    }
}

"use strict";

class ActionSystem {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        
        // ========== КОНФИГУРАЦИЯ ДЕЙСТВИЙ ==========
        this.cellTypes = {};
        this.resources = {};
        this.currentCellType = null;
        this.selectedCell = null;
        this.currentCellActions = [];
        
        // Универсальные действия с базовыми шансами
        this.baseActionChances = {
            'search_treasure': 25,
            'search_water': 30,
            'search_berries': 35,
            'search_mushrooms': 30,
            'search_herbs': 40,
            'search_ore': 20,
            'search_stone': 25,
            'set_trap': 50,
            'prepare_ambush': 45,
            'hunt': 70,
            'hunt_caravan': 30,
            'take_assassination_contract': 20,
            'light_campfire': 80,
            'guard_caravan': 40,
            'gather_wood': 60,
            'stealth_movement': 85
        };
        
        // Все доступные действия
        this.allActions = [
            'search_treasure',
            'search_water', 
            'search_berries',
            'search_mushrooms',
            'search_herbs',
            'search_ore',
            'search_stone',
            'set_trap',
            'prepare_ambush',
            'hunt',
            'hunt_caravan',
            'take_assassination_contract',
            'light_campfire',
            'guard_caravan',
            'gather_wood',
            'stealth_movement'
        ];
        
        // Конфигурация действий
        this.actionConfigs = {
            'search_treasure': {
                icon: '💰',
                name: 'Искать сокровища',
                description: 'Тщательно обыскать местность в поисках ценностей',
                class: 'action-treasure',
                resource_type: 'treasure'
            },
            'search_water': {
                icon: '💧',
                name: 'Искать воду',
                description: 'Найти источники воды или следы влаги',
                class: 'action-water',
                resource_type: 'water'
            },
            'search_berries': {
                icon: '🫐',
                name: 'Собирать ягоды',
                description: 'Собрать съедобные ягоды и плоды',
                class: 'action-berries',
                resource_type: 'berries'
            },
            'search_mushrooms': {
                icon: '🍄',
                name: 'Собирать грибы',
                description: 'Найти и собрать грибы',
                class: 'action-mushrooms',
                resource_type: 'mushrooms'
            },
            'search_herbs': {
                icon: '🌿',
                name: 'Собирать травы',
                description: 'Найти лекарственные и полезные растения',
                class: 'action-herbs',
                resource_type: 'herbs'
            },
            'search_ore': {
                icon: '⛏️',
                name: 'Искать руду',
                description: 'Поиск металлических руд и минералов',
                class: 'action-ore',
                resource_type: 'ores'
            },
            'search_stone': {
                icon: '🪨',
                name: 'Собирать камни',
                description: 'Найти строительные и полезные камни',
                class: 'action-stone',
                resource_type: 'stones'
            },
            'set_trap': {
                icon: '🪤',
                name: 'Установить ловушку',
                description: 'Создать ловушку для мелкой дичи',
                class: 'action-trap',
                resource_type: 'traps'
            },
            'prepare_ambush': {
                icon: '🎯',
                name: 'Подготовить засаду',
                description: 'Подготовить позицию для неожиданной атаки',
                class: 'action-ambush',
                resource_type: 'ambush'
            },
            'hunt': {
                icon: '🏹',
                name: 'Охотиться',
                description: 'Выследить и добыть дичь. Приводит к бою с монстром. Награда: двойной лут с монстра',
                class: 'action-hunt',
                resource_type: 'loot',
                triggers_monster: true,
                monster_level_multiplier: 1.0,
                always_monster: true,
                double_loot: true,
                is_hunt_action: true // Флаг для идентификации действия охоты
            },
            'hunt_caravan': {
                icon: '🏹',
                name: 'Охотиться на караван',
                description: 'Подкараулить торговый караван для нападения',
                class: 'action-hunt',
                resource_type: 'loot',
                triggers_monster: true,
                monster_level_multiplier: 1.5
            },
            'take_assassination_contract': {
                icon: '🗡️',
                name: 'Взять контракт на убийство',
                description: 'Получить задание на устранение цели',
                class: 'action-assassination',
                resource_type: 'contracts',
                triggers_monster: true,
                monster_level_multiplier: 2.0
            },
            'light_campfire': {
                icon: '🔥',
                name: 'Разжечь костёр',
                description: 'Создать укрытие и место для отдыха',
                class: 'action-campfire',
                resource_type: 'shelter'
            },
            'guard_caravan': {
                icon: '🛡️',
                name: 'Охранять караван',
                description: 'Наняться для защиты торгового каравана',
                class: 'action-guard',
                resource_type: 'gold',
                triggers_monster: true,
                monster_level_multiplier: 1.2
            },
            'gather_wood': {
                icon: '🪵',
                name: 'Собирать дрова',
                description: 'Найти и собрать сухие ветки для костра и строительства',
                class: 'action-wood',
                resource_type: 'woods'
            },
            'stealth_movement': {
                icon: '👣',
                name: 'Скрытное перемещение',
                description: 'Тихо и незаметно передвинуться на соседнюю клетку без риска боя',
                class: 'action-stealth',
                requires_player_here: true,
                special: 'movement'
            }
        };
        
        this.locationImages = {};
        this.locationImageCache = new Map();
        
        // Модули действий (загружаются динамически)
        this.actionModules = {};
        
        console.log("✅ ActionSystem инициализирован");
        console.log("   mapSystem:", mapSystem);
    }

    // ========== ИНИЦИАЛИЗАЦИЯ МОДУЛЕЙ ДЕЙСТВИЙ ==========

    async initializeActionModules() {
        console.log("🔄 ActionSystem: Инициализация модулей действий...");
        
        try {
            // Проверяем, не является ли текущий модуль охоты заглушкой
            const currentHuntModule = this.actionModules['hunt'];
            if (currentHuntModule) {
                const isStub = currentHuntModule.execute && 
                              currentHuntModule.execute.toString().includes('Заглушка охоты');
                
                if (isStub) {
                    console.log("⚠️ Обнаружена заглушка модуля охоты, удаляем её");
                    delete this.actionModules['hunt'];
                } else if (currentHuntModule.showHuntTargetSelection) {
                    console.log("✅ Настоящий модуль охоты уже загружен");
                    return true;
                }
            }
            
            // Загружаем модуль охоты если он существует глобально
            if (window.HuntAction) {
                console.log("✅ Глобальный класс HuntAction найден, создаем экземпляр");
                this.actionModules['hunt'] = new window.HuntAction(this);
                return true;
            }
            
            console.log("ℹ️ Модуль охоты будет загружен при первом использовании");
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка инициализации модулей действий:", error);
            return false;
        }
    }

    // ========== РЕГИСТРАЦИЯ ВНЕШНИХ МОДУЛЕЙ ==========

    registerModule(moduleName, moduleInstance) {
        this.actionModules[moduleName] = moduleInstance;
        console.log(`✅ Модуль ${moduleName} зарегистрирован в ActionSystem`);
    }

    // ========== МЕТОДЫ ДЛЯ ЗАГРУЗКИ ДАННЫХ ==========

    async loadCellData() {
        try {
            console.log("📥 ActionSystem: Загружаем данные типов клеток и ресурсов...");
            
            // Используем Promise.all для параллельной загрузки
            const [cellTypesResponse, resourcesResponse] = await Promise.all([
                fetch('data/cell_types.json').catch(() => null),
                fetch('data/resources.json').catch(() => null)
            ]);
            
            // Загружаем типы клеток
            if (cellTypesResponse && cellTypesResponse.ok) {
                const cellData = await cellTypesResponse.json();
                this.cellTypes = cellData.cell_types || {};
                console.log(`✅ Загружено типов клеток: ${Object.keys(this.cellTypes).length}`);
            } else {
                console.warn("⚠️ cell_types.json не загружен, создаем базовые типы");
                this.createDefaultCellTypes();
            }
            
            // Загружаем ресурсы
            if (resourcesResponse && resourcesResponse.ok) {
                const resourcesData = await resourcesResponse.json();
                this.resources = resourcesData;
                console.log(`✅ Загружено ресурсов: ${Object.keys(this.resources).length} категорий`);
            } else {
                console.warn("⚠️ resources.json не загружен, создаем базовые ресурсы");
                this.createDefaultResources();
            }
            
            // Инициализируем модули действий ПОСЛЕ загрузки данных
            await this.initializeActionModules();
            
            // Загружаем картинки локаций
            await this.loadLocationImages().catch(error => {
                console.error("❌ Ошибка загрузки картинок локаций:", error);
            });
            
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных клеток:", error);
            
            // Создаем базовые данные при ошибке
            this.createDefaultCellTypes();
            this.createDefaultResources();
            
            // Пробуем инициализировать модули даже при ошибке
            try {
                await this.initializeActionModules();
            } catch (moduleError) {
                console.error("❌ Ошибка инициализации модулей:", moduleError);
            }
            
            return false;
        }
    }

    createDefaultCellTypes() {
        this.cellTypes = {
            'grave': {
                name: "Старая каменная гробница",
                description: "Массивная каменная плита с высеченными рунами, явно не крестьянского происхождения. Земля вокруг оседала неравномерно, будто под ней пустота.",
                suggestion: "Это захоронение знатного воина или мага — слишком дорогая отделка для простолюдина.",
                icon: '⚰️',
                image: 'images/locations/grave.jpg',
                action_chances: {
                    search_treasure: 85,
                    search_water: 10,
                    search_berries: 5,
                    search_mushrooms: 15,
                    search_herbs: 20,
                    search_ore: 25,
                    search_stone: 60,
                    set_trap: 40,
                    prepare_ambush: 55,
                    hunt: 70,
                    hunt_caravan: 30,
                    take_assassination_contract: 20,
                    light_campfire: 70,
                    guard_caravan: 35,
                    gather_wood: 20,
                    stealth_movement: 90
                },
                special_notes: "Высокий шанс найти сокровища, но будьте осторожны — такие места часто охраняются проклятиями.",
                failure_monster_chance: 70,
                monster_level: 2
            },
            
            'small_stream': {
                name: "Хрустальный ручей",
                description: "Прозрачная вода струится по гладким камням, образуя небольшие водовороты. Рыбки серебрятся на дне.",
                suggestion: "Идеальное место для пополнения запасов — вода здесь не застаивается.",
                icon: '💧',
                image: 'images/locations/small_stream.jpg',
                action_chances: {
                    search_treasure: 15,
                    search_water: 95,
                    search_berries: 45,
                    search_mushrooms: 25,
                    search_herbs: 50,
                    search_ore: 10,
                    search_stone: 40,
                    set_trap: 75,
                    prepare_ambush: 30,
                    hunt: 60,
                    hunt_caravan: 10,
                    take_assassination_contract: 5,
                    light_campfire: 90,
                    guard_caravan: 25,
                    gather_wood: 30,
                    stealth_movement: 85
                },
                special_notes: "Почти гарантированно можно найти чистую воду. Животные часто приходят на водопой.",
                failure_monster_chance: 40,
                monster_level: 1
            }
        };
    }

    createDefaultResources() {
        this.resources = {
            treasure: [
                { id: 'gold_coins', name: '💰 Золотые монеты', type: 'treasure', rarity: 'common', description: 'Древние монеты, все еще имеющие ценность' },
                { id: 'silver_goblet', name: '🥈 Серебряный кубок', type: 'treasure', rarity: 'uncommon', description: 'Изысканный кубок с гравировкой' },
                { id: 'jewelry', name: '💎 Драгоценности', type: 'treasure', rarity: 'rare', description: 'Бриллианты и изумруды' }
            ],
            water: [
                { id: 'fresh_water', name: '💧 Пресная вода', type: 'water', rarity: 'common', description: 'Чистая питьевая вода' },
                { id: 'mineral_water', name: '💎 Минеральная вода', type: 'water', rarity: 'uncommon', description: 'Вода с полезными минералами' },
                { id: 'magical_spring', name: '✨ Вода из магического источника', type: 'water', rarity: 'rare', description: 'Вода с лечебными свойствами' }
            ],
            // Охотничьи ресурсы (для модуля охоты)
            bones: [
                { id: 'small_bone', name: '🦴 Маленькая кость', type: 'bones', rarity: 'common', description: 'Кость мелкого животного', price: 5 },
                { id: 'wolf_bone', name: '🐺 Волчья кость', type: 'bones', rarity: 'uncommon', description: 'Кость волка, прочная и крепкая', price: 15 },
                { id: 'horse_bone', name: '🐴 Конская кость', type: 'bones', rarity: 'rare', description: 'Кость лошади, большая и тяжелая', price: 25 }
            ],
            leathers: [
                { id: 'thin_leather', name: '🐂 Тонкая кожа', type: 'leathers', rarity: 'common', description: 'Кожа мелкого животного', price: 10 },
                { id: 'strong_leather', name: '🦌 Прочная кожа', type: 'leathers', rarity: 'uncommon', description: 'Кожа оленя, хорошего качества', price: 20 },
                { id: 'thick_leather', name: '🐗 Толстая кожа', type: 'leathers', rarity: 'rare', description: 'Кожа кабана, очень прочная', price: 30 }
            ],
            hides: [
                { id: 'thin_hide', name: '🐇 Тонкая шкура', type: 'hides', rarity: 'common', description: 'Шкурка кролика', price: 8 },
                { id: 'strong_hide', name: '🦊 Лисья шкура', type: 'hides', rarity: 'uncommon', description: 'Шкурка лисы, красивая и теплая', price: 40 },
                { id: 'thick_hide', name: '🐻 Медвежья шкура', type: 'hides', rarity: 'rare', description: 'Шкура медведя, очень ценная', price: 100 }
            ],
            furs: [
                { id: 'hare_fur', name: '🐰 Заячий мех', type: 'furs', rarity: 'common', description: 'Мягкий мех зайца', price: 12 },
                { id: 'marten_fur', name: '🦡 Куний мех', type: 'furs', rarity: 'uncommon', description: 'Мех куницы, очень ценный', price: 50 },
                { id: 'arctic_fox_fur', name: '🦊 Мех песца', type: 'furs', rarity: 'rare', description: 'Белый мех песца, роскошный', price: 80 }
            ]
        };
    }

    async loadLocationImages() {
        try {
            console.log("🖼️ ActionSystem: Загружаем картинки локаций...");
            
            const fallbackImg = this.createFallbackImage();
            this.locationImageCache.set('fallback', fallbackImg);
            
            console.log("✅ Картинки локаций готовы");
            return true;
        } catch (error) {
            console.error("❌ Ошибка загрузки картинок:", error);
            return false;
        }
    }

    createFallbackImage() {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 400, 400);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 400);
        
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Изображение', 200, 180);
        ctx.fillText('локации', 200, 220);
        
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 380, 380);
        
        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    }

    // ========== МЕТОДЫ ОПРЕДЕЛЕНИЯ ТИПОВ КЛЕТОК ==========

    determineCellType(cell) {
        if (!cell || !this.mapSystem.currentTacticalMap) return 'grave';
        
        const cellKey = `${cell.col},${cell.row}`;
        
        // Если тип уже определен и есть в загруженных данных
        if (cell.cellType && this.cellTypes[cell.cellType]) {
            return cell.cellType;
        }
        
        // Маппинг типов клеток на типы локаций
        const typeMapping = {
            'water': 'small_stream',
            'graveyard_cross': 'haunted_cemetery',
            'cave': 'crystal_cave',
            'tree': 'ancient_tree',
            'elegant_tree': 'ancient_tree',
            'mountain': 'rocky_outcrop',
            'campfire': 'abandoned_camp',
            'berry_clearing': 'berry_clearing',
            'rocky_outcrop': 'rocky_outcrop',
            'ruined_shrine': 'ruined_shrine',
            'crystal_cave': 'crystal_cave',
            'herb_garden': 'herb_garden',
            'haunted_cemetery': 'haunted_cemetery',
            'sunken_ship': 'sunken_ship',
            'abandoned_camp': 'abandoned_camp',
            'player_start': 'ancient_tree',
            'npc': 'village',
            'merchant': 'village',
            'tavern': 'village',
            'shop': 'village',
            'village': 'village',
            'castle': 'ruined_shrine',
            'bandit_camp': 'bandit_camp',
            'orc_camp': 'bandit_camp',
            'monster': 'beast_lair',
            'chest': 'smugglers_cache',
            'obstacle': 'petrified_forest',
            'portal': 'fairy_ring',
            'ancient_rune': 'druid_stone_circle',
            'magic_crystal': 'crystal_cave',
            'bridge': 'bridge_troll_toll',
            'lava_crack': 'mineral_spring',
            'traveler': 'abandoned_camp',
            'cart': 'abandoned_camp',
            'inactive': 'petrified_forest'
        };
        
        // Определяем тип клетки
        if (cell.type && typeMapping[cell.type]) {
            const mappedType = typeMapping[cell.type];
            if (this.cellTypes[mappedType]) {
                cell.cellType = mappedType;
            } else {
                cell.cellType = this.getDefaultCellType(cell);
            }
        } else {
            cell.cellType = this.getDefaultCellType(cell);
        }
        
        console.log(`🔍 ActionSystem: Определен тип клетки [${cell.col},${cell.row}]: ${cell.cellType} (исходный тип: ${cell.type})`);
        return cell.cellType;
    }

    getDefaultCellType(cell) {
        if (cell.hasLoot) {
            const lootLocations = ['smugglers_cache', 'abandoned_camp', 'sunken_ship'];
            const seed = cell.col * 47 + cell.row * 29;
            return lootLocations[seed % lootLocations.length];
        } else if (cell.passable === false) {
            return 'petrified_forest';
        } else {
            const availableTypes = Object.keys(this.cellTypes);
            if (availableTypes.length > 0) {
                const seed = cell.col * 47 + cell.row * 29;
                const randomIndex = seed % availableTypes.length;
                return availableTypes[randomIndex];
            } else {
                return 'grave';
            }
        }
    }

    getActionChance(action, cellType) {
        const cellTypeData = this.cellTypes[cellType];
        
        if (!cellTypeData) {
            const baseChance = this.baseActionChances[action] || 25;
            return baseChance;
        }
        
        if (cellTypeData.action_chances && cellTypeData.action_chances[action] !== undefined) {
            return cellTypeData.action_chances[action];
        }
        
        return this.baseActionChances[action] || 25;
    }

    getAvailableActionsForCellType(cellType) {
        const cellTypeData = this.cellTypes[cellType];
        if (!cellTypeData || !cellTypeData.action_chances) {
            return this.allActions.filter(action => (this.baseActionChances[action] || 25) > 0);
        }
        
        const availableActions = Object.keys(cellTypeData.action_chances)
            .filter(action => cellTypeData.action_chances[action] > 0)
            .sort((a, b) => cellTypeData.action_chances[b] - cellTypeData.action_chances[a]);
        
        return availableActions;
    }

    // ========== МЕТОДЫ ДЛЯ ОБНОВЛЕНИЯ ИНТЕРФЕЙСА ==========

    updateCellActionsUI(cell) {
        console.log("=== НАЧАЛО updateCellActionsUI ===");
        
        const mapContent = document.querySelector('.tactical-map-content-with-actions');
        if (!mapContent) {
            console.error("❌ Основной контейнер карты не найден!");
            return;
        }
        
        // Создаем левую панель если ее нет
        let leftPanel = document.querySelector('.cell-info-left-panel');
        if (!leftPanel) {
            leftPanel = document.createElement('div');
            leftPanel.className = 'cell-info-left-panel';
            mapContent.insertBefore(leftPanel, mapContent.firstChild);
        }
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) {
            console.error("❌ Контейнер действий не найден!");
            this.createActionsContainerFallback();
            return;
        }
        
        const mapVisual = document.querySelector('.tactical-map-visual');
        const mapRect = mapVisual ? mapVisual.getBoundingClientRect() : null;
        
        const panelWidth = 1150;
        const panelHeight = mapRect ? mapRect.height - 30 : window.innerHeight * 0.8;
        
        console.log(`📐 Размеры панелей: ${panelWidth}x${panelHeight}px`);
        
        // ========== ЛЕВАЯ ПАНЕЛЬ ==========
        leftPanel.style.cssText = `
            display: flex !important;
            flex-direction: column !important;
            visibility: visible !important;
            opacity: 1 !important;
            height: ${panelHeight}px !important;
            max-height: ${panelHeight}px !important;
            min-height: ${panelHeight}px !important;
            width: ${panelWidth}px !important;
            max-width: ${panelWidth}px !important;
            min-width: ${panelWidth}px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
            border: 2px solid #00ffcc !important;
            border-radius: 10px !important;
            padding: 20px !important;
            margin-right: 20px !important;
            position: relative !important;
            box-shadow: 0 0 20px rgba(0, 255, 204, 0.4) !important;
            flex-shrink: 0 !important;
            align-self: flex-start !important;
        `;
        
        // ========== ПРАВАЯ ПАНЕЛЬ ==========
        actionsContainer.style.cssText = `
            display: flex !important;
            flex-direction: column !important;
            visibility: visible !important;
            opacity: 1 !important;
            height: ${panelHeight}px !important;
            max-height: ${panelHeight}px !important;
            min-height: ${panelHeight}px !important;
            width: ${panelWidth}px !important;
            max-width: ${panelWidth}px !important;
            min-width: ${panelWidth}px !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            background: linear-gradient(135deg, #16213e, #1a1a2e) !important;
            border: 2px solid #00ffff !important;
            border-radius: 10px !important;
            padding: 20px !important;
            margin-left: 20px !important;
            position: relative !important;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.4) !important;
            flex-shrink: 0 !important;
            align-self: flex-start !important;
        `;
        
        const panel = actionsContainer.closest('.cell-actions-panel');
        if (panel) {
            panel.style.cssText = `
                display: flex !important;
                flex-direction: column !important;
                height: ${panelHeight + 30}px !important;
                max-height: ${panelHeight + 30}px !important;
                min-height: ${panelHeight + 30}px !important;
                width: ${panelWidth + 30}px !important;
                max-width: ${panelWidth + 30}px !important;
                min-width: ${panelWidth + 30}px !important;
                margin-left: 20px !important;
                align-self: flex-start !important;
                flex-shrink: 0 !important;
            `;
        }
        
        mapContent.style.cssText = `
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: flex-start !important;
            height: ${panelHeight + 40}px !important;
            gap: 20px !important;
            padding: 0 20px !important;
            overflow: visible !important;
            width: 100% !important;
        `;
        
        const mapMainArea = document.querySelector('.map-main-area');
        if (mapMainArea) {
            mapMainArea.style.cssText = `
                flex: 1 !important;
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                height: ${panelHeight}px !important;
                min-width: 600px !important;
                max-width: 800px !important;
                margin: 0 20px !important;
            `;
        }
        
        if (cell.explored === undefined) cell.explored = false;
        if (cell.hasAction === undefined) cell.hasAction = true;
        
        this.selectedCell = cell;
        this.currentCellType = this.determineCellType(cell);
        const cellTypeData = this.cellTypes[this.currentCellType];
        
        if (!cellTypeData) {
            console.error(`❌ Данные типа клетки не найдены: ${this.currentCellType}`);
            leftPanel.innerHTML = `<div class="cell-error">Ошибка загрузки типа клетки</div>`;
            actionsContainer.innerHTML = `<div class="cell-error">Ошибка загрузки типа клетки</div>`;
            return;
        }
        
        const cellIcon = this.mapSystem.objectSymbols[cell.type] || cellTypeData.icon || '❓';
        
        const isCurrentPosition = (cell.col === this.mapSystem.playerTacticalPosition.x && 
                           cell.row === this.mapSystem.playerTacticalPosition.y);
        const isReachable = this.mapSystem.isCellReachable(cell);
        const isExplored = cell.explored === true;
        
        this.currentCellActions = this.getAvailableActionsForCellType(this.currentCellType);
        
        console.log(`🎯 Доступные действия: ${this.currentCellActions.length} шт.`);
        
        // ========== HTML ЛЕВОЙ ПАНЕЛИ ==========
        let leftHTML = '';
        
        try {
            leftHTML = this.createLeftPanelHTML(cell, cellTypeData, cellIcon, isCurrentPosition, isExplored);
        } catch (error) {
            console.error("❌ Ошибка создания информации о клетке:", error);
            leftHTML = `<div style="color: red; padding: 10px;">Ошибка: ${error.message}</div>`;
        }
        
        leftPanel.innerHTML = leftHTML;
        
        // ========== HTML ПРАВОЙ ПАНЕЛИ ==========
        let rightHTML = '';
        
        rightHTML += `
            <div class="actions-section" style="margin-bottom: 20px;">
                <h3 style="color: #00ffff; margin-bottom: 15px; text-align: center;">
                    ⚔️ Доступные действия
                </h3>
        `;
        
        if (!isExplored && cell.hasAction !== false) {
            if (this.currentCellActions.length > 0) {
                try {
                    rightHTML += this.createActionsButtonsHTML(cell, isCurrentPosition, isReachable);
                    
                    rightHTML += `
                        <div class="cell-completion-controls" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #475569;">
                            <button class="btn-control complete-exploration-btn" 
                                    onclick="game.systems.map.completeCellExploration(${cell.row}, ${cell.col})"
                                    title="Отметить клетку как полностью исследованную"
                                    style="width: 100%; padding: 12px; background: linear-gradient(135deg, #10b981, #059669);">
                                ✓ Завершить исследование
                            </button>
                            <p class="hint" style="text-align: center; margin-top: 10px; color: #94a3b8; font-size: 12px;">
                                После завершения исследования вы не сможете выполнять здесь действия
                            </p>
                        </div>
                    `;
                } catch (error) {
                    console.error("❌ Ошибка создания списка действий:", error);
                    rightHTML += `<div style="color: red; padding: 5px;">Ошибка действий</div>`;
                }
            } else {
                rightHTML += this.createNoActionsHTML();
            }
        } else if (isExplored) {
            rightHTML += this.createExploredCellHTML();
        } else if (cell.hasAction === false) {
            rightHTML += this.createNoActionsHTML();
        }
        
        rightHTML += `</div>`;
        
        rightHTML += `
            <div class="chance-legend" style="
                background: rgba(0, 0, 0, 0.4);
                border-radius: 8px;
                padding: 12px;
                font-size: 12px;
                color: #ccc;
                margin-top: 15px;
            ">
                <strong style="color: #00ffcc;">Легенда шансов:</strong>
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <span style="color: #ff4444;">0-39% - Плохой</span>
                    <span style="color: #ffaa00;">40-69% - Средний</span>
                    <span style="color: #44ff44;">70-89% - Хороший</span>
                    <span style="color: #00ffaa;">90-100% - Отличный</span>
                </div>
            </div>
        `;
        
        rightHTML += `
            <div class="resource-info" style="margin-top: auto; padding-top: 20px; border-top: 1px solid #475569;">
                <h5 style="color: #00ffff; margin-bottom: 10px; text-align: center;">📦 Ресурсы героя:</h5>
                <div class="resource-list" id="heroResourcesListRight">
                    <!-- Ресурсы будут загружены динамически -->
                </div>
            </div>
        `;
        
        actionsContainer.innerHTML = rightHTML;
        
        // ========== ОПТИМИЗАЦИЯ ==========
        setTimeout(() => {
            const leftImageWrapper = leftPanel.querySelector('.location-visual-container');
            if (leftImageWrapper) {
                leftImageWrapper.style.cssText = `
                    height: 300px !important;
                    width: 300px !important;
                    max-height: 300px !important;
                    max-width: 300px !important;
                    min-height: 300px !important;
                    min-width: 300px !important;
                    overflow: hidden !important;
                    margin: 0 auto 20px auto !important;
                    position: relative !important;
                    border: 2px solid #00ffcc !important;
                    border-radius: 10px !important;
                    align-self: center !important;
                `;
            }
            
            if (cellTypeData) {
                try {
                    this.displayRealLocationImage(cellTypeData, leftPanel);
                } catch (error) {
                    console.error("❌ Ошибка загрузки картинки:", error);
                }
            }
            
            const actionCards = actionsContainer.querySelectorAll('.action-card');
            actionCards.forEach(card => {
                card.style.cssText = `
                    background: linear-gradient(135deg, rgba(30, 30, 46, 0.95), rgba(20, 25, 45, 0.95)) !important;
                    border: 1px solid #00aaff !important;
                    border-radius: 8px !important;
                    padding: 12px !important;
                    display: flex !important;
                    flex-direction: column !important;
                    height: 100% !important;
                    transition: all 0.2s ease !important;
                    margin: 0 !important;
                `;
                
                if (!card.style.opacity || card.style.opacity !== '0.6') {
                    card.onmouseenter = () => {
                        card.style.transform = 'translateY(-3px) scale(1.02)';
                        card.style.boxShadow = '0 8px 20px rgba(0, 170, 255, 0.4)';
                    };
                    card.onmouseleave = () => {
                        card.style.transform = 'translateY(0) scale(1)';
                        card.style.boxShadow = 'none';
                    };
                }
            });
            
            const actionsGrid = actionsContainer.querySelector('.actions-grid');
            if (actionsGrid) {
                actionsGrid.style.cssText = `
                    display: grid !important;
                    grid-template-columns: repeat(3, 1fr) !important;
                    gap: 12px !important;
                    margin-bottom: 20px !important;
                `;
            }
            
            this.updateHeroResourcesUI('heroResourcesListRight');
            
            console.log(`✅ Панели созданы: левая ${panelWidth}x${panelHeight}px, карта по центру, правая ${panelWidth}x${panelHeight}px`);
            
        }, 50);
        
        if (!isExplored && cell.hasAction !== false && this.currentCellActions.length > 0) {
            try {
                this.setupActionEventListeners();
            } catch (error) {
                console.error("❌ Ошибка назначения обработчиков:", error);
            }
        }
        
        console.log("✅ Панели обновлены");
        console.log("=== КОНЕЦ updateCellActionsUI ===");
    }

    createLeftPanelHTML(cell, cellTypeData, cellIcon, isCurrentPosition, isExplored) {
        return `
            <div class="cell-info-header-left">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 20px; border-bottom: 2px solid rgba(0, 255, 204, 0.3); padding-bottom: 10px;">
                    📍 Информация о локации
                </h3>
                
                <div class="location-visual-container">
                    <div class="location-image-wrapper" id="locationImageWrapperLeft">
                        <div class="image-loading">🖼️ Загрузка изображения...</div>
                    </div>
                    <div class="location-icon-overlay">
                        <div class="cell-icon-large">${cellIcon}</div>
                    </div>
                </div>
                
                <h4 class="cell-name" style="color: #00ffcc; text-align: center; margin: 15px 0; font-size: 1.3rem;">
                    ${cellTypeData.name}
                </h4>
                
                <div class="cell-position-info" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 10px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 6px;
                    margin-bottom: 15px;
                ">
                    <span class="cell-coords" style="color: #94a3b8; font-size: 14px;">
                        Позиция: [${cell.col}, ${cell.row}]
                    </span>
                    ${isCurrentPosition ? 
                        '<span class="current-position-badge" style="background: rgba(0, 255, 204, 0.2); color: #00ffcc; padding: 4px 8px; border-radius: 4px; font-size: 12px;">📍 Вы здесь</span>' : ''}
                    ${isExplored ? 
                        '<span class="explored-badge" style="background: rgba(0, 255, 0, 0.2); color: #00ff00; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✓ Исследовано</span>' : ''}
                </div>
                
                <div class="cell-description-text" style="
                    color: #cbd5e1;
                    font-size: 14px;
                    line-height: 1.6;
                    padding: 15px;
                    background: rgba(0, 0, 0, 0.4);
                    border-radius: 8px;
                    margin-bottom: 15px;
                    border-left: 3px solid #00ffcc;
                    max-height: 200px;
                    overflow-y: auto;
                ">
                    ${cellTypeData.description}
                </div>
                
                ${cellTypeData.suggestion ? `
                    <div class="cell-suggestion" style="
                        background: rgba(251, 191, 36, 0.1);
                        border: 1px solid rgba(251, 191, 36, 0.3);
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 15px;
                        color: #fbbf24;
                        font-size: 13px;
                    ">
                        <strong>💡 Совет:</strong> ${cellTypeData.suggestion}
                    </div>
                ` : ''}
                
                ${cellTypeData.special_notes ? `
                    <div class="special-notes" style="
                        background: rgba(245, 158, 11, 0.1);
                        border: 1px solid rgba(245, 158, 11, 0.3);
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 15px;
                        color: #fbbf24;
                        font-size: 13px;
                    ">
                        <strong>📝 Особенности:</strong> ${cellTypeData.special_notes}
                    </div>
                ` : ''}
                
                <div class="danger-level-info" style="
                    background: rgba(255, 100, 100, 0.1);
                    border: 1px solid rgba(255, 100, 100, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 15px;
                    color: #ffcccc;
                    font-size: 14px;
                ">
                    <strong style="color: #ff6666; display: block; margin-bottom: 8px;">⚠️ Уровень опасности: ${cellTypeData.monster_level || 1}/5</strong>
                    <div class="danger-bar" style="
                        width: 100%;
                        height: 8px;
                        background: rgba(255, 100, 100, 0.2);
                        border-radius: 4px;
                        overflow: hidden;
                        margin: 8px 0;
                    ">
                        <div class="danger-fill" style="
                            width: ${(cellTypeData.monster_level || 1) * 20}%;
                            height: 100%;
                            background: linear-gradient(90deg, #ff6666, #ff4444);
                            border-radius: 4px;
                        "></div>
                    </div>
                    <small style="color: #ff9999; font-size: 12px;">
                        Шанс монстра при неудаче: ${cellTypeData.failure_monster_chance || 50}%
                    </small>
                </div>
                
                <div class="cell-stats-left" style="
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 8px;
                    padding: 15px;
                    border: 1px solid rgba(0, 255, 204, 0.2);
                    margin-top: auto;
                ">
                    <h5 style="color: #00ffcc; margin-bottom: 10px; text-align: center;">📊 Статистика клетки</h5>
                    <div class="stat-item" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <span style="color: #94a3b8;">Тип:</span>
                        <span class="stat-value" style="color: #00ffcc; font-weight: bold;">${cell.type || 'Обычная'}</span>
                    </div>
                    <div class="stat-item" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <span style="color: #94a3b8;">Проходимость:</span>
                        <span class="stat-value" style="color: ${cell.passable !== false ? '#00ff00' : '#ff4444'}; font-weight: bold;">
                            ${cell.passable !== false ? '✅ Проходима' : '❌ Непроходима'}
                        </span>
                    </div>
                    <div class="stat-item" style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                        <span style="color: #94a3b8;">Видимость:</span>
                        <span class="stat-value" style="color: ${cell.visible !== false ? '#00ffcc' : '#ffaa00'}; font-weight: bold;">
                            ${cell.visible !== false ? '👁️ Видима' : '👻 Скрыта'}
                        </span>
                    </div>
                    ${cell.hasLoot ? `
                        <div class="stat-item" style="display: flex; justify-content: space-between; padding: 6px 0;">
                            <span style="color: #94a3b8;">Лут:</span>
                            <span class="stat-value" style="color: #f59e0b; font-weight: bold;">💎 Возможен</span>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    createActionsButtonsHTML(cell, isCurrentPosition, isReachable) {
        let html = `<div class="actions-grid" style="
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        ">`;
        
        this.currentCellActions.forEach((action, index) => {
            const chance = this.getActionChance(action, this.currentCellType);
            const chancePercent = Math.round(chance);
            const config = this.actionConfigs[action] || {
                icon: '❓',
                name: action.replace(/_/g, ' '),
                description: 'Неизвестное действие'
            };
            
            let chanceColor = '#ff4444';
            if (chance >= 40) chanceColor = '#ffaa00';
            if (chance >= 70) chanceColor = '#44ff44';
            if (chance >= 90) chanceColor = '#00ffaa';
            
            let isDisabled = false;
            let disabledReason = '';
            
            if (!isReachable) {
                isDisabled = true;
                disabledReason = 'Клетка недоступна';
            } else if (!isCurrentPosition && config.requires_player_here) {
                isDisabled = true;
                disabledReason = 'Нужно быть в клетке';
            }
            
            const triggersMonster = config.triggers_monster ? '⚠️ Может вызвать монстра!' : '';
            const alwaysMonster = config.always_monster ? '🏹 Всегда приводит к бою' : '';
            const doubleLoot = config.double_loot ? '💰 Двойной лут!' : '';
            
            // Создаем обработчик клика
            let onClickHandler = '';
            if (!isDisabled) {
                onClickHandler = `onclick="window.game.systems.action.performCellAction('${action}', ${cell.row}, ${cell.col})"`;
            }
            
            html += `
                <div class="action-card" style="
                    background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9));
                    border: 1px solid ${isDisabled ? '#666' : '#00aaff'};
                    border-radius: 8px;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    transition: all 0.2s ease;
                    ${!isDisabled ? 'cursor: pointer;' : 'opacity: 0.6;'}
                " ${onClickHandler}>
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <div class="action-icon" style="
                            font-size: 20px;
                            margin-right: 10px;
                            color: ${chanceColor};
                            flex-shrink: 0;
                        ">
                            ${config.icon || '⚡'}
                        </div>
                        <div class="action-name" style="
                            font-weight: bold;
                            color: ${isDisabled ? '#888' : '#ffffff'};
                            font-size: 13px;
                            flex: 1;
                        ">
                            ${config.name}
                        </div>
                    </div>
                    
                    <div class="action-description" style="
                        color: ${isDisabled ? '#777' : '#b0b0ff'};
                        font-size: 11px;
                        margin-bottom: 10px;
                        line-height: 1.3;
                        flex: 1;
                    ">
                        ${config.description}
                        ${triggersMonster ? `<br><small style="color: #ff4444;">${triggersMonster}</small>` : ''}
                        ${alwaysMonster ? `<br><small style="color: #ffaa00;">${alwaysMonster}</small>` : ''}
                        ${doubleLoot ? `<br><small style="color: #f59e0b;">${doubleLoot}</small>` : ''}
                    </div>
                    
                    <div class="action-chance-display" style="
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 11px;
                        margin-top: auto;
                    ">
                        <span style="color: #aaa;">Шанс:</span>
                        <div style="display: flex; align-items: center;">
                            <div style="
                                width: 40px;
                                height: 6px;
                                background: #333;
                                border-radius: 3px;
                                margin-right: 8px;
                                overflow: hidden;
                            ">
                                <div style="
                                    width: ${chancePercent}%;
                                    height: 100%;
                                    background: ${chanceColor};
                                    border-radius: 3px;
                                "></div>
                            </div>
                            <span style="color: ${chanceColor}; font-weight: bold;">
                                ${chancePercent}%
                            </span>
                        </div>
                    </div>
                    
                    ${isDisabled ? `
                        <div style="
                            font-size: 10px;
                            color: #ff6666;
                            margin-top: 8px;
                            padding-top: 8px;
                            border-top: 1px dashed #444;
                        ">
                            ${disabledReason}
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        html += `</div>`;
        return html;
    }

    createNoActionsHTML() {
        return `
            <div class="no-available-actions">
                <div class="no-actions-icon">🚫</div>
                <p>Для этой локации нет доступных действий</p>
                <p class="hint">Выберите другую клетку для взаимодействия.</p>
            </div>
        `;
    }

    createExploredCellHTML() {
        return `
            <div class="cell-explored">
                <div class="explored-icon">✓</div>
                <h5>Местность исследована</h5>
                <p>Вы уже исследовали эту местность и совершили доступные действия.</p>
                <p class="hint">Перейдите на другую клетку для новых действий.</p>
            </div>
        `;
    }

    createActionsContainerFallback() {
        console.log("🛠️ ActionSystem: Создаем контейнеры слева и справа");
        
        const mapContent = document.querySelector('.tactical-map-content-with-actions');
        if (!mapContent) {
            console.error("❌ Основной контейнер карты не найден");
            return;
        }
        
        const leftPanel = document.createElement('div');
        leftPanel.className = 'cell-info-left-panel';
        leftPanel.id = 'cellInfoLeftPanel';
        
        const actionsPanel = document.createElement('div');
        actionsPanel.className = 'cell-actions-panel';
        
        const actionsContainer = document.createElement('div');
        actionsContainer.id = 'cellActionsContainer';
        actionsContainer.className = 'cell-actions-container';
        
        actionsPanel.appendChild(actionsContainer);
        
        mapContent.innerHTML = '';
        mapContent.appendChild(leftPanel);
        mapContent.appendChild(actionsPanel);
        
        console.log("✅ Контейнеры созданы слева и справа");
    }

    displayRealLocationImage(cellTypeData, leftContainer) {
        const imageWrapper = leftContainer?.querySelector('#locationImageWrapperLeft');
        if (!imageWrapper) return;
        
        const img = new Image();
        
        img.onload = () => {
            imageWrapper.innerHTML = '';
            img.className = 'location-image';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            imageWrapper.appendChild(img);
            
            const overlay = document.createElement('div');
            overlay.className = 'image-dark-overlay';
            imageWrapper.appendChild(overlay);
            
            console.log(`🖼️ Картинка локации загружена в левую панель: ${cellTypeData.name}`);
        };
        
        img.onerror = () => {
            console.error(`❌ Ошибка загрузки картинки: ${cellTypeData.image}`);
            this.displayFallbackLocationImage(cellTypeData, leftContainer);
        };
        
        img.src = cellTypeData.image || '';
    }

    displayFallbackLocationImage(cellTypeData, container) {
        const imageWrapper = container?.querySelector('#locationImageWrapperLeft') || 
                            document.getElementById('locationImageWrapperLeft');
        if (!imageWrapper) return;
        
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 250;
        const ctx = canvas.getContext('2d');
        
        const gradient = ctx.createLinearGradient(0, 0, 400, 250);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(0.5, '#16213e');
        gradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 400, 250);
        
        ctx.fillStyle = 'rgba(0, 255, 204, 0.05)';
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * 400;
            const y = Math.random() * 250;
            const size = Math.random() * 3 + 1;
            ctx.fillRect(x, y, size, size);
        }
        
        ctx.fillStyle = '#00ffcc';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(cellTypeData.name, 200, 35);
        
        ctx.font = 'bold 64px Arial';
        ctx.fillText(cellTypeData.icon || '❓', 200, 120);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px Arial';
        ctx.fillText('Изображение локации', 200, 160);
        
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 380, 230);
        
        const img = new Image();
        img.src = canvas.toDataURL();
        
        img.onload = () => {
            imageWrapper.innerHTML = '';
            const imgElement = img.cloneNode();
            imgElement.className = 'location-image';
            imgElement.style.width = '100%';
            imgElement.style.height = '100%';
            imgElement.style.objectFit = 'cover';
            imageWrapper.appendChild(imgElement);
            
            const overlay = document.createElement('div');
            overlay.className = 'image-dark-overlay';
            imageWrapper.appendChild(overlay);
            
            console.log(`🖼️ Fallback картинка локации создана: ${cellTypeData.name}`);
        };
    }

    setupActionEventListeners() {
        const actionButtons = document.querySelectorAll('.cell-action-btn:not(.disabled)');
        console.log(`🎯 ActionSystem: Найдено ${actionButtons.length} доступных кнопок действий`);
        
        actionButtons.forEach(button => {
            const action = button.dataset.action;
            const row = parseInt(button.dataset.cellRow);
            const col = parseInt(button.dataset.cellCol);
            
            button.removeEventListener('click', this.handleActionClick);
            
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log(`🎯 Клик по действию: ${action} на клетке [${col}, ${row}]`);
                this.performCellAction(action, row, col);
            });
        });
    }

    // ========== ОСНОВНОЙ МЕТОД ВЫПОЛНЕНИЯ ДЕЙСТВИЙ ==========

    async performCellAction(action, row, col) {
        console.log(`🎯 ActionSystem.performCellAction: ${action} на [${col},${row}]`);
        
        // Получаем конфигурацию действия
        const config = this.actionConfigs[action];
        if (!config) {
            console.error(`❌ Конфигурация для действия ${action} не найдена`);
            return;
        }
        
        // ========== СПЕЦИАЛЬНАЯ ОБРАБОТКА ОХОТЫ ==========
        if (config.is_hunt_action) {
            console.log(`🏹 === ЗАПУСК ОХОТЫ ===`);
            
            // Проверяем, загружен ли модуль охоты
            if (!this.actionModules['hunt']) {
                console.log("🔄 Модуль охоты не загружен, пробуем загрузить...");
                
                if (window.HuntAction) {
                    this.actionModules['hunt'] = new window.HuntAction(this);
                    console.log("✅ Модуль охоты загружен из глобального класса");
                } else {
                    console.error("❌ Класс HuntAction не найден в глобальной области видимости");
                    this.showNotification("❌ Система охоты не доступна!", 'error');
                    return;
                }
            }
            
            const huntModule = this.actionModules['hunt'];
            if (!huntModule || typeof huntModule.execute !== 'function') {
                console.error("❌ Модуль охоты не найден или не имеет метода execute");
                this.showNotification("❌ Ошибка модуля охоты!", 'error');
                return;
            }
            
            // Проверяем клетку
            const cellKey = `${col},${row}`;
            const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
            
            if (!cell) {
                console.error(`❌ Клетка [${col}, ${row}] не найдена`);
                this.showNotification("❌ Клетка не найдена!", 'error');
                return;
            }
            
            if (cell.explored === true) {
                console.warn(`⚠️ Клетка [${col}, ${row}] уже исследована`);
                this.showNotification("❌ Эта клетка уже исследована!", 'warning');
                return;
            }
            
            const isReachable = this.mapSystem.isCellReachable(cell);
            if (!isReachable) {
                console.warn(`⚠️ Клетка [${col}, ${row}] недостижима`);
                this.showNotification("❌ Клетка недостижима для охоты!", 'warning');
                return;
            }
            
            // Запускаем модуль охоты
            console.log(`✅ Вызываем huntModule.execute(${row}, ${col})`);
            return huntModule.execute(row, col);
        }
        
        // ========== СКРЫТНОЕ ПЕРЕМЕЩЕНИЕ ==========
        if (action === 'stealth_movement') {
            this.handleStealthMovement(row, col);
            return;
        }
        
        // ========== РЕСУРСНЫЕ ДЕЙСТВИЯ ==========
        const resourceActions = [
            'search_treasure', 'search_water', 'search_berries', 
            'search_mushrooms', 'search_herbs', 'search_ore', 
            'search_stone', 'gather_wood', 'set_trap'
        ];
        
        if (resourceActions.includes(action)) {
            this.performResourceAction(action, row, col);
            return;
        }
        
        // ========== СТАНДАРТНАЯ ОБРАБОТКА ОСТАЛЬНЫХ ДЕЙСТВИЙ ==========
        this.performStandardAction(action, row, col);
    }

    performStandardAction(action, row, col) {
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        if (!cell) return;
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (actionsContainer) {
            const config = this.actionConfigs[action];
            const chance = this.getActionChance(action, this.currentCellType);
            
            actionsContainer.innerHTML = `
                <div class="action-processing">
                    <div class="processing-icon">${config.icon || '⚡'}</div>
                    <h4>Выполняется действие...</h4>
                    <p>${config.name} на клетке [${col}, ${row}]</p>
                    <div class="chance-display-processing">
                        <span class="chance-label">Шанс успеха:</span>
                        <span class="chance-value">${chance}%</span>
                    </div>
                    <div class="processing-progress">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                    </div>
                    <div class="processing-hint">Результат зависит от удачи и особенностей местности</div>
                </div>
            `;
            
            setTimeout(() => {
                const progressFill = actionsContainer.querySelector('.progress-fill');
                if (progressFill) {
                    progressFill.style.width = '100%';
                }
            }, 50);
        }
        
        // Имитация выполнения действия
        setTimeout(() => {
            const chance = this.getActionChance(action, this.currentCellType);
            const roll = Math.random() * 100;
            const success = roll <= chance;
            
            console.log(`🎲 Бросок удачи: ${roll.toFixed(1)}/${chance} - ${success ? 'УСПЕХ' : 'ПРОВАЛ'}`);
            
            if (success) {
                this.handleActionSuccess(action, row, col);
            } else {
                const cellTypeData = this.cellTypes[this.currentCellType];
                
                let monsterChance = cellTypeData?.failure_monster_chance || 50;
                
                const config = this.actionConfigs[action];
                if (config && config.triggers_monster) {
                    monsterChance *= (config.monster_level_multiplier || 1);
                }
                
                const monsterRoll = Math.random() * 100;
                
                if (monsterRoll <= monsterChance) {
                    console.log(`👹 Неудача вызвала появление монстра! Шанс: ${monsterChance}%, Выпало: ${monsterRoll}`);
                    this.handleActionFailureWithMonster(action, row, col, cellTypeData);
                } else {
                    this.handleActionFailure(action);
                }
            }
            
            // Обновляем интерфейс клетки после завершения действия
            setTimeout(() => {
                if (cell && !cell.explored) {
                    this.updateCellActionsUI(cell);
                }
            }, 1000);
            
        }, 800);
    }

    // ========== ОБРАБОТКА РЕЗУЛЬТАТОВ ДЕЙСТВИЙ ==========

    handleActionSuccess(action, row, col) {
        const config = this.actionConfigs[action];
        
        const successMessages = {
            'search_treasure': "💰 Найдены ценности!",
            'search_water': "💧 Найдена вода!",
            'search_berries': "🫐 Собраны ягоды!",
            'search_mushrooms': "🍄 Собраны грибы!",
            'search_herbs': "🌿 Собраны травы!",
            'search_ore': "⛏️ Найдена руда!",
            'search_stone': "🪨 Собраны камни!",
            'set_trap': "🪤 Ловушка установлена!",
            'prepare_ambush': "🎯 Позиция для засады подготовлена!",
            'hunt': "🏹 Успешная охота! Начинается бой с монстром.",
            'hunt_caravan': "🏹 Успешная охота на караван!",
            'take_assassination_contract': "🗡️ Контракт на убийство получен!",
            'light_campfire': "🔥 Костёр разожжён!",
            'guard_caravan': "🛡️ Найм на охрану каравана успешен!",
            'gather_wood': "🪵 Дрова собраны!",
            'stealth_movement': "👣 Вы тихо переместились!"
        };
        
        const message = successMessages[action] || "✅ Действие успешно!";
        
        // Охота обрабатывается через модуль, так что здесь не запускаем бой
        if (action === 'hunt') {
            // Этот код не должен выполняться, так как охота обрабатывается через модуль
            console.warn("⚠️ Охота не должна обрабатываться через handleActionSuccess!");
            return;
        }
        
        const resourceMap = {
            'search_treasure': 'treasure',
            'search_water': 'water',
            'search_berries': 'berries',
            'search_mushrooms': 'mushrooms',
            'search_herbs': 'herbs',
            'search_ore': 'ores',
            'search_stone': 'stones',
            'set_trap': 'traps',
            'prepare_ambush': 'ambush',
            'hunt': 'loot',
            'hunt_caravan': 'loot',
            'take_assassination_contract': 'contracts',
            'light_campfire': 'shelter',
            'guard_caravan': 'gold',
            'gather_wood': 'woods'
        };
        
        const resourceType = resourceMap[action];
        if (resourceType) {
            if (resourceType === 'gold') {
                const goldAmount = Math.floor(Math.random() * 50) + 25;
                this.mapSystem.currentHero.gold += goldAmount;
                this.showNotification(`${message} Получено ${goldAmount} золота.`, 'success');
                console.log(`💰 Добавлено золото: ${goldAmount}`);
            } else {
                this.giveRandomResource(resourceType, row, col);
            }
        }
        
        this.showNotification(message, 'success');
        
        console.log(`✅ Клетка [${col},${row}] остаётся доступной для других действий`);
    }

    handleActionFailure(action) {
        const failureMessages = {
            'search_treasure': "❌ Ничего ценного не найдено...",
            'search_water': "❌ Вода оказалась непригодной для питья",
            'search_berries': "❌ Ягоды оказались неспелыми или ядовитыми",
            'search_mushrooms': "❌ Грибы оказались несъедобными",
            'search_herbs': "❌ Травы оказались бесполезными",
            'search_ore': "❌ Руда слишком бедная для добычи",
            'search_stone': "❌ Камни слишком хрупкие",
            'set_trap': "❌ Ловушка сломалась при установке",
            'prepare_ambush': "❌ Позиция оказалась неподходящей",
            'hunt': "❌ Не удалось найти дичь для охоты",
            'hunt_caravan': "❌ Караван оказался слишком хорошо охраняем",
            'take_assassination_contract': "❌ Заказчик передумал или конкуренты перебили цену",
            'light_campfire': "❌ Дрова оказались сырыми, не удалось разжечь огонь",
            'guard_caravan': "❌ Вас не взяли на работу - недостаточно опыта или репутации",
            'gather_wood': "❌ Не найдено подходящих дров",
            'stealth_movement': "❌ Вас заметили во время перемещения!"
        };
        
        this.showNotification(failureMessages[action] || "❌ Действие не увенчалось успехом", 'warning');
    }

    handleActionFailureWithMonster(action, row, col, cellTypeData) {
        console.log(`👹 Действие ${action} провалилось и привлекло внимание монстра!`);
        
        const config = this.actionConfigs[action] || {};
        const monsterLevel = cellTypeData.monster_level || 1;
        
        const adjustedMonsterLevel = Math.min(
            5,
            Math.max(1, Math.floor(monsterLevel * (config.monster_level_multiplier || 1)))
        );
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            this.showNotification("❌ Не удалось начать бой с монстром", 'error');
            return;
        }
        
        const randomMonster = this.getMonsterByLevel(adjustedMonsterLevel);
        
        if (!randomMonster) {
            console.error(`❌ Не найден монстр уровня ${adjustedMonsterLevel}`);
            this.handleActionFailure(action);
            return;
        }
        
        this.mapSystem.pendingAction = {
            action: action,
            row: row,
            col: col,
            cellTypeData: cellTypeData,
            wasFailure: true
        };
        
        console.log(`⚔️ Начинаем бой с ${randomMonster.name} (уровень ${adjustedMonsterLevel})`);
        battleSystem.startBattleWithMonster(this.mapSystem.currentHero, randomMonster.id, 'action_failure');
        
        this.showNotification(`👹 Провал привлёк ${randomMonster.name}! Готовьтесь к бою!`, 'warning');
    }

    // ========== РЕСУРСНЫЕ ДЕЙСТВИЯ ==========

    performResourceAction(action, row, col) {
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        if (!cell) return;
        
        const config = this.actionConfigs[action];
        const baseChance = this.getActionChance(action, this.currentCellType);
        
        this.showResourceChanceWindow(action, config, baseChance, row, col);
    }

    showResourceChanceWindow(action, config, baseChance, row, col) {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        const resourceCategory = config.resource_type;
        const resources = this.resources[resourceCategory] || [];
        
        if (resources.length === 0) {
            console.error(`Нет ресурсов для категории: ${resourceCategory}`);
            return;
        }
        
        const resourceChances = this.calculateResourceProbabilities(resources, baseChance);
        
        let html = `
            <div class="resource-gathering">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 15px;">
                    ${config.icon} ${config.name}
                </h3>
                
                <div class="base-chance-info" style="
                    background: rgba(0, 0, 0, 0.4);
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                ">
                    <strong>Общая вероятность успеха:</strong> 
                    <span style="color: ${baseChance >= 70 ? '#44ff44' : baseChance >= 40 ? '#ffaa00' : '#ff4444'}; font-size: 18px;">
                        ${baseChance}%
                    </span>
                </div>
                
                <div class="resource-probabilities">
                    <h4 style="color: #00aaff; margin: 20px 0 10px 0;">Вероятности находок:</h4>
        `;
        
        resourceChances.forEach(({resource, chance}) => {
            html += `
                <div class="resource-chance-item" style="
                    background: rgba(30, 30, 46, 0.7);
                    border-left: 4px solid ${chance >= 30 ? '#44ff44' : chance >= 15 ? '#ffaa00' : '#ff4444'};
                    padding: 10px 15px;
                    margin-bottom: 8px;
                    border-radius: 4px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div>
                        <span style="font-size: 18px; margin-right: 10px;">${resource.name}</span>
                        <span style="color: #aaa; font-size: 12px;">${resource.description}</span>
                    </div>
                    <div style="
                        font-weight: bold;
                        color: ${chance >= 30 ? '#44ff44' : chance >= 15 ? '#ffaa00' : '#ff4444'};
                        font-size: 16px;
                    ">
                        ${chance}%
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <button class="btn-control" onclick="window.game.systems.action.executeResourceGathering('${action}', ${row}, ${col})"
                            style="padding: 15px 30px; font-size: 16px;">
                        🎲 Попробовать удачу!
                    </button>
                </div>
                
                <div style="margin-top: 20px; color: #888; font-size: 12px; text-align: center;">
                    <em>Примечание: Более дорогие ресурсы имеют меньшую вероятность выпадения</em>
                </div>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
    }

    calculateResourceProbabilities(resources, baseChance) {
        const sortedResources = [...resources].sort((a, b) => {
            const priceA = a.price || a.value || 0;
            const priceB = b.price || b.value || 0;
            return priceA - priceB;
        });
        
        const totalWeight = sortedResources.reduce((sum, resource, index) => {
            const weight = Math.max(1, 10 - index * 2);
            return sum + weight;
        }, 0);
        
        return sortedResources.map((resource, index) => {
            const weight = Math.max(1, 10 - index * 2);
            const chance = Math.round((weight / totalWeight) * baseChance);
            return {
                resource,
                chance: Math.min(100, Math.max(1, chance))
            };
        });
    }

    executeResourceGathering(action, row, col) {
        const baseChance = this.getActionChance(action, this.currentCellType);
        const roll = Math.random() * 100;
        const success = roll <= baseChance;
        
        if (success) {
            const config = this.actionConfigs[action];
            const resourceCategory = config.resource_type;
            const resources = this.resources[resourceCategory] || [];
            
            if (resources.length > 0) {
                const resourceChances = this.calculateResourceProbabilities(resources, baseChance);
                
                let totalChance = 0;
                const randomValue = Math.random() * 100;
                
                for (const {resource, chance} of resourceChances) {
                    totalChance += chance;
                    if (randomValue <= totalChance) {
                        this.addResourceToHero(resource.id, resource.name, 1, resourceCategory);
                        this.showNotification(`✅ ${config.name} успешно! Найден: ${resource.name}`, 'success');
                        break;
                    }
                }
            } else {
                this.handleActionSuccess(action, row, col);
            }
        } else {
            this.handleActionFailure(action);
        }
        
        setTimeout(() => {
            const cellKey = `${col},${row}`;
            const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
            if (cell) {
                this.updateCellActionsUI(cell);
            }
        }, 1000);
    }

    // ========== СКРЫТНОЕ ПЕРЕМЕЩЕНИЕ ==========

    handleStealthMovement(row, col) {
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        if (!cell) return;
        
        const neighbors = this.mapSystem.getHexNeighbors(this.mapSystem.playerTacticalPosition.y, this.mapSystem.playerTacticalPosition.x);
        
        const availableCells = neighbors.filter(neighbor => {
            const neighborCell = this.mapSystem.currentTacticalMap.cells[`${neighbor.col},${neighbor.row}`];
            return neighborCell && neighborCell.passable !== false;
        });
        
        if (availableCells.length === 0) {
            this.showNotification("❌ Нет доступных клеток для перемещения", 'warning');
            return;
        }
        
        this.showStealthMovementSelection(availableCells, cell);
    }

    showStealthMovementSelection(availableCells, currentCell) {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        const baseChance = this.getActionChance('stealth_movement', this.currentCellType);
        
        let html = `
            <div class="stealth-movement">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 15px;">
                    👣 Скрытное перемещение
                </h3>
                
                <div class="base-chance-info" style="
                    background: rgba(0, 0, 0, 0.4);
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                    text-align: center;
                ">
                    <strong>Базовая вероятность успеха:</strong> 
                    <span style="color: ${baseChance >= 70 ? '#44ff44' : baseChance >= 40 ? '#ffaa00' : '#ff4444'}; font-size: 18px;">
                        ${baseChance}%
                    </span>
                    <p style="margin-top: 10px; font-size: 12px; color: #aaa;">
                        Вероятность тихо переместиться без риска боя
                    </p>
                </div>
                
                <div class="available-targets">
                    <h4 style="color: #00aaff; margin: 20px 0 10px 0;">Доступные направления:</h4>
        `;
        
        availableCells.forEach(targetCell => {
            const neighborHex = this.mapSystem.currentTacticalMap.cells[`${targetCell.col},${targetCell.row}`];
            if (!neighborHex) return;
            
            html += `
                <div class="movement-target" onclick="window.game.systems.action.attemptStealthMovement(${targetCell.row}, ${targetCell.col})">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <span style="font-size: 16px;">Направление: ${targetCell.direction}</span>
                            <div style="color: #aaa; font-size: 12px;">
                                Клетка [${targetCell.col}, ${targetCell.row}]
                            </div>
                        </div>
                        <div style="
                            font-weight: bold;
                            color: ${baseChance >= 70 ? '#44ff44' : baseChance >= 40 ? '#ffaa00' : '#ff4444'};
                        ">
                            ${baseChance}%
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
                
                <button class="btn-control" onclick="window.game.systems.action.updateCellActionsUI(this.selectedCell)" 
                        style="margin-top: 20px; width: 100%;">
                    ↩️ Отмена
                </button>
            </div>
        `;
        
        actionsContainer.innerHTML = html;
        
        setTimeout(() => {
            const items = actionsContainer.querySelectorAll('.movement-target');
            items.forEach(item => {
                item.style.cssText = `
                    background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9));
                    border: 1px solid #00aaff;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                `;
                
                item.onmouseenter = () => {
                    item.style.transform = 'translateY(-2px)';
                    item.style.boxShadow = '0 5px 15px rgba(0, 170, 255, 0.3)';
                };
                item.onmouseleave = () => {
                    item.style.transform = 'translateY(0)';
                    item.style.boxShadow = 'none';
                };
            });
        }, 50);
    }

    attemptStealthMovement(targetRow, targetCol) {
        const baseChance = this.getActionChance('stealth_movement', this.currentCellType);
        const roll = Math.random() * 100;
        const success = roll <= baseChance;
        
        if (success) {
            this.mapSystem.handlePeacefulMovement(targetCol, targetRow, null);
            this.showNotification("👣 Вы тихо переместились на соседнюю клетку", 'success');
        } else {
            this.showNotification("🚨 Вас заметили! Готовьтесь к бою!", 'warning');
            
            const battleSystem = window.game?.systems?.battle;
            if (battleSystem) {
                this.mapSystem.pendingMovement = { x: targetCol, y: targetRow };
                battleSystem.startBattleWithMonster(this.mapSystem.currentHero, null, 'movement');
            }
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    getMonsterByLevel(level) {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return null;
        
        const allMonsters = battleSystem.monsters || [];
        if (!allMonsters || allMonsters.length === 0) return null;
        
        const suitableMonsters = allMonsters.filter(monster => {
            const monsterLevel = monster.level || 1;
            return Math.abs(monsterLevel - level) <= 1;
        });
        
        if (suitableMonsters.length > 0) {
            return suitableMonsters[Math.floor(Math.random() * suitableMonsters.length)];
        }
        
        return allMonsters[Math.floor(Math.random() * allMonsters.length)];
    }

    giveRandomResource(resourceType, row, col) {
        const resources = this.resources[resourceType];
        if (!resources || resources.length === 0) {
            console.warn(`⚠️ Ресурсы типа ${resourceType} не найдены`);
            return;
        }
        
        const randomResource = resources[Math.floor(Math.random() * resources.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        
        this.addResourceToHero(randomResource.id, randomResource.name, quantity, resourceType);
    }

    addResourceToHero(resourceId, resourceName, quantity, resourceType) {
        if (!this.mapSystem.currentHero.resources) {
            this.mapSystem.currentHero.resources = {};
        }
        
        if (!this.mapSystem.currentHero.resources[resourceId]) {
            this.mapSystem.currentHero.resources[resourceId] = {
                id: resourceId,
                name: resourceName,
                count: 0,
                type: resourceType
            };
        }
        
        this.mapSystem.currentHero.resources[resourceId].count += quantity;
        
        console.log(`📦 ActionSystem: Добавлен ресурс ${resourceId}: ${quantity} шт. Всего: ${this.mapSystem.currentHero.resources[resourceId].count}`);
        
        this.updateHeroResourcesUI();
        
        if (window.game) {
            window.game.saveGame();
        }
    }

    updateHeroResourcesUI(containerId = 'heroResourcesList') {
        const resourcesList = document.getElementById(containerId);
        if (!resourcesList || !this.mapSystem.currentHero) return;
        
        if (!this.mapSystem.currentHero.resources || Object.keys(this.mapSystem.currentHero.resources).length === 0) {
            resourcesList.innerHTML = '<div class="no-resources" style="text-align: center; color: #94a3b8; padding: 20px;">Ресурсов пока нет</div>';
            return;
        }
        
        let resourcesHTML = '';
        Object.values(this.mapSystem.currentHero.resources).forEach(resource => {
            const icon = this.getResourceIcon(resource.type);
            resourcesHTML += `
                <div class="resource-item" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 6px;
                    margin-bottom: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                ">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 18px;">${icon}</span>
                        <span style="color: #cbd5e1; font-size: 14px;">${resource.name}</span>
                    </div>
                    <span style="color: #f59e0b; font-weight: bold; font-size: 16px;">x${resource.count}</span>
                </div>
            `;
        });
        
        resourcesList.innerHTML = resourcesHTML;
    }

    getResourceIcon(resourceType) {
        const icons = {
            'treasure': '💰',
            'water': '💧',
            'berries': '🫐',
            'mushrooms': '🍄',
            'herbs': '🌿',
            'ores': '⛏️',
            'stones': '🪨',
            'traps': '🪤',
            'ambush': '🎯',
            'loot': '📦',
            'contracts': '📜',
            'shelter': '🏕️',
            'food': '🍖',
            'woods': '🪵',
            'bones': '🦴',
            'leathers': '🐂',
            'hides': '🐅',
            'furs': '🦊'
        };
        return icons[resourceType] || '📦';
    }

    showNotification(message, type = 'info') {
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    markCellAsExplored(row, col) {
        const cellKey = `${col},${row}`;
        if (this.mapSystem.currentTacticalMap && this.mapSystem.currentTacticalMap.cells[cellKey]) {
            this.mapSystem.currentTacticalMap.cells[cellKey].explored = true;
            this.mapSystem.currentTacticalMap.cells[cellKey].hasAction = false;
            this.mapSystem.currentTacticalMap.cells[cellKey].isSelected = false;
            
            this.mapSystem.drawTacticalMap();
            this.clearCellActionsUI();
        }
    }

    completeCellExploration(row, col) {
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        
        if (cell) {
            cell.explored = true;
            cell.hasAction = false;
            
            this.showNotification("✅ Вы полностью исследовали эту местность", 'success');
            this.mapSystem.drawTacticalMap();
            this.clearCellActionsUI();
        }
    }

    clearCellActionsUI() {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (actionsContainer) {
            actionsContainer.innerHTML = '<div class="actions-placeholder">Выберите клетку для просмотра доступных действий</div>';
        }
    }

    highlightSelectedCell(cell) {
        if (!this.mapSystem.currentTacticalMap) return;
        
        Object.values(this.mapSystem.currentTacticalMap.cells).forEach(c => {
            c.isSelected = false;
        });
        
        cell.isSelected = true;
        this.mapSystem.drawTacticalMap();
    }
}

// Глобальная регистрация
if (typeof window !== 'undefined') {
    window.ActionSystem = ActionSystem;
    console.log("📦 ActionSystem зарегистрирован глобально");
}
