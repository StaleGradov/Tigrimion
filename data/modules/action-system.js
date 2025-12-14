"use strict";

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

class ActionSystem {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        
        // Основная конфигурация системы
        this.cellTypes = {};
        this.resources = {};
        this.currentCellType = null;
        this.selectedCell = null;
        this.currentCellActions = [];
        
        // Хранилище модулей действий
        this.actionModules = {};
        
        // Реестр всех доступных действий
        this.actionsRegistry = {};
        
        // Кэш изображений локаций
        this.locationImageCache = new Map();
        
        // Конфигурация базовых действий (без логики, только метаданные)
        this.baseActionConfigs = {
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
                requires_module: 'hunt'
            },
            'hunt_caravan': {
                icon: '🏹',
                name: 'Охотиться на караван',
                description: 'Подкараулить торговый караван для нападения',
                class: 'action-hunt',
                requires_module: 'hunt_caravan'
            },
            'take_assassination_contract': {
                icon: '🗡️',
                name: 'Взять контракт на убийство',
                description: 'Получить задание на устранение цели',
                class: 'action-assassination',
                requires_module: 'assassination'
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
                requires_module: 'guard'
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
        
        // Шансы успеха для базовых действий
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
        
        console.log("✅ ActionSystem инициализирован как менеджер модулей");
        console.log("   mapSystem:", mapSystem);
    }

    // ========== МЕТОДЫ ЗАГРУЗКИ ДАННЫХ ==========

    async loadCellData() {
        try {
            console.log("📥 ActionSystem: Загружаем данные типов клеток и ресурсов...");
            
            // Используем Promise.all для параллельной загрузки
            const [cellTypesResponse, resourcesResponse] = await Promise.all([
                fetch('data/cell_types.json').catch(() => {
                    console.warn("⚠️ cell_types.json не загружен, создаем базовые типы");
                    return null;
                }),
                fetch('data/resources.json').catch(() => {
                    console.warn("⚠️ resources.json не загружен, создаем базовые ресурсы");
                    return null;
                })
            ]);
            
            // Загружаем типы клеток
            if (cellTypesResponse && cellTypesResponse.ok) {
                const cellData = await cellTypesResponse.json();
                this.cellTypes = cellData.cell_types || {};
                console.log(`✅ Загружено типов клеток: ${Object.keys(this.cellTypes).length}`);
            } else {
                console.warn("❌ cell_types.json не загружен, создаем базовые типы");
                this.createDefaultCellTypes();
            }
            
            // Загружаем ресурсы
            if (resourcesResponse && resourcesResponse.ok) {
                const resourcesData = await resourcesResponse.json();
                this.resources = resourcesData;
                console.log(`✅ Загружено ресурсов: ${Object.keys(this.resources).length} категорий`);
            } else {
                console.warn("❌ resources.json не загружен, создаем базовые ресурсы");
                this.createDefaultResources();
            }
            
            // Инициализируем базовые действия (те, что не требуют модулей)
            this.initializeBaseActions();
            
            // Загружаем картинки локаций
            await this.loadLocationImages();
            
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных клеток:", error);
            
            // Создаем базовые данные при ошибке
            this.createDefaultCellTypes();
            this.createDefaultResources();
            this.initializeBaseActions();
            
            return false;
        }
    }

    async loadLocationImages() {
        try {
            console.log("🖼️ ActionSystem: Инициализируем кэш картинок локаций...");
            
            // Создаем кэш для картинок
            this.locationImageCache = new Map();
            
            // Создаем fallback изображение
            const fallbackImg = this.createFallbackImage();
            this.locationImageCache.set('fallback', fallbackImg);
            
            console.log("✅ Кэш картинок локаций инициализирован");
            return true;
        } catch (error) {
            console.error("❌ Ошибка инициализации кэша картинок:", error);
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
            },
            
            'shallow_burrow': {
                name: "Лисья нора",
                description: "Аккуратный вход в подземное логово, окруженный выброшенной землей и костями мелких животных.",
                suggestion: "Нора слишком ухоженная для дикого зверя — кто-то мог использовать ее как тайник.",
                icon: '🕳️',
                image: 'images/locations/shallow_burrow.jpg',
                action_chances: {
                    search_treasure: 40,
                    search_water: 20,
                    search_berries: 10,
                    search_mushrooms: 35,
                    search_herbs: 30,
                    search_ore: 25,
                    search_stone: 50,
                    set_trap: 85,
                    prepare_ambush: 65,
                    hunt: 80,
                    hunt_caravan: 45,
                    take_assassination_contract: 35,
                    light_campfire: 50,
                    guard_caravan: 40,
                    gather_wood: 15,
                    stealth_movement: 70
                },
                special_notes: "Отличное место для засады — ограниченные пути отхода.",
                failure_monster_chance: 60,
                monster_level: 2
            },
            
            'berry_clearing': {
                name: "Ягодная поляна у опушки",
                description: "Солнечная поляна, усыпанная спелыми ягоды всех оттенков красного и синего.",
                suggestion: "Ягоды выглядят съедобными, но темно-синие у камня лучше не трогать.",
                icon: '🫐',
                image: 'images/locations/berry_clearing.jpg',
                action_chances: {
                    search_treasure: 25,
                    search_water: 35,
                    search_berries: 90,
                    search_mushrooms: 40,
                    search_herbs: 75,
                    search_ore: 5,
                    search_stone: 20,
                    set_trap: 60,
                    prepare_ambush: 45,
                    hunt: 50,
                    hunt_caravan: 20,
                    take_assassination_contract: 15,
                    light_campfire: 85,
                    guard_caravan: 30,
                    gather_wood: 40,
                    stealth_movement: 80
                },
                special_notes: "Обилие ягод и лекарственных трав.",
                failure_monster_chance: 35,
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
            berries: [
                { id: 'wild_berries', name: '🫐 Дикие ягоды', type: 'berries', rarity: 'common', description: 'Сладкие лесные ягоды' },
                { id: 'medicinal_berries', name: '🌿 Лечебные ягоды', type: 'berries', rarity: 'uncommon', description: 'Ягоды с целебными свойствами' },
                { id: 'nightshade', name: '☠️ Паслён', type: 'berries', rarity: 'rare', description: 'Ядовитые ягоды для создания ядов' }
            ],
            mushrooms: [
                { id: 'common_mushrooms', name: '🍄 Обычные грибы', type: 'mushrooms', rarity: 'common', description: 'Съедобные лесные грибы' },
                { id: 'healing_mushrooms', name: '❤️ Целебные грибы', type: 'mushrooms', rarity: 'uncommon', description: 'Грибы с лечебными свойствами' },
                { id: 'hallucinogenic_mushrooms', name: '🌀 Галлюциногенные грибы', type: 'mushrooms', rarity: 'rare', description: 'Грибы, изменяющие сознание' }
            ],
            herbs: [
                { id: 'healing_herbs', name: '🌿 Целебные травы', type: 'herbs', rarity: 'common', description: 'Травы для лечения ран' },
                { id: 'poison_herbs', name: '☠️ Ядовитые травы', type: 'herbs', rarity: 'uncommon', description: 'Травы для создания ядов' },
                { id: 'magical_herbs', name: '✨ Магические травы', type: 'herbs', rarity: 'rare', description: 'Редкие травы для алхимии' }
            ],
            ores: [
                { id: 'iron_ore', name: '⛏️ Железная руда', type: 'ores', rarity: 'common', description: 'Базовая руда для ковки' },
                { id: 'copper_ore', name: '🔶 Медная руда', type: 'ores', rarity: 'common', description: 'Руда для инструментов' },
                { id: 'silver_ore', name: '🥈 Серебряная руда', type: 'ores', rarity: 'uncommon', description: 'Руда для ценных предметов' }
            ],
            stones: [
                { id: 'common_stone', name: '🪨 Обычный камень', type: 'stones', rarity: 'common', description: 'Строительный материал' },
                { id: 'flint', name: '🔥 Кремень', type: 'stones', rarity: 'common', description: 'Для разжигания огня' },
                { id: 'obsidian', name: '⚫ Обсидиан', type: 'stones', rarity: 'uncommon', description: 'Вулканическое стекло' }
            ],
            traps: [
                { id: 'snare_trap', name: '🪤 Петля-ловушка', type: 'traps', rarity: 'common', description: 'Простая ловушка для мелкой дичи' },
                { id: 'pit_trap', name: '🕳️ Яма-ловушка', type: 'traps', rarity: 'uncommon', description: 'Глубокая яма, прикрытая ветками' },
                { id: 'bear_trap', name: '🐻 Капкан', type: 'traps', rarity: 'rare', description: 'Мощная ловушка для крупной дичи' }
            ],
            ambush: [
                { id: 'ambush_position', name: '🎯 Позиция для засады', type: 'ambush', rarity: 'common', description: 'Подготовленная позиция для атаки' },
                { id: 'hidden_position', name: '👁️ Скрытная позиция', type: 'ambush', rarity: 'uncommon', description: 'Отличное укрытие для наблюдения' },
                { id: 'killing_ground', name: '💀 Убийственная зона', type: 'ambush', rarity: 'rare', description: 'Идеальное место для засады' }
            ],
            loot: [
                { id: 'caravan_loot', name: '📦 Добыча с каравана', type: 'loot', rarity: 'uncommon', description: 'Товары и припасы с торгового каравана' },
                { id: 'bandit_loot', name: '⚔️ Добыча разбойников', type: 'loot', rarity: 'common', description: 'Награбленное добро' },
                { id: 'treasure_chest', name: '💰 Сундук с сокровищами', type: 'loot', rarity: 'rare', description: 'Богатая добыча' }
            ],
            contracts: [
                { id: 'assassination_contract', name: '📜 Контракт на убийство', type: 'contracts', rarity: 'rare', description: 'Задание на устранение цели' },
                { id: 'bounty_hunt', name: '🎯 Задание на поимку', type: 'contracts', rarity: 'uncommon', description: 'Охота на преступника' },
                { id: 'delivery_contract', name: '📦 Контракт на доставку', type: 'contracts', rarity: 'common', description: 'Доставка груза' }
            ],
            shelter: [
                { id: 'campfire_site', name: '🔥 Место для лагеря', type: 'shelter', rarity: 'common', description: 'Безопасное место для отдыха' },
                { id: 'hidden_camp', name: '🏕️ Скрытый лагерь', type: 'shelter', rarity: 'uncommon', description: 'Укрытие для длительного пребывания' },
                { id: 'fortified_camp', name: '🏰 Укрепленный лагерь', type: 'shelter', rarity: 'rare', description: 'Надежное укрытие с защитой' }
            ],
            food: [
                { id: 'venison', name: '🦌 Оленина', type: 'food', rarity: 'common', description: 'Свежее мясо оленя' },
                { id: 'rabbit', name: '🐇 Крольчатина', type: 'food', rarity: 'common', description: 'Мясо кролика' },
                { id: 'boar_meat', name: '🐗 Кабанятина', type: 'food', rarity: 'uncommon', description: 'Жирное мясо кабана' },
                { id: 'bird', name: '🐦 Птица', type: 'food', rarity: 'common', description: 'Мясо лесной птицы' }
            ],
            woods: [
                { id: 'twigs', name: '🌿 Веточки', type: 'woods', rarity: 'common', description: 'Мелкие сухие ветки' },
                { id: 'branches', name: '🪵 Ветки', type: 'woods', rarity: 'common', description: 'Крепкие ветки для костра' },
                { id: 'logs', name: '🪓 Поленья', type: 'woods', rarity: 'uncommon', description: 'Толстые поленья для длительного горения' }
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

    initializeBaseActions() {
        // Инициализируем реестр базовыми действиями
        Object.keys(this.baseActionConfigs).forEach(actionKey => {
            const config = this.baseActionConfigs[actionKey];
            
            // Если действие требует модуль, добавляем его в реестр без реализации
            if (config.requires_module) {
                this.actionsRegistry[actionKey] = {
                    config: config,
                    execute: async (row, col) => {
                        await this.executeModuleAction(actionKey, row, col);
                    },
                    requiresModule: true,
                    moduleName: config.requires_module
                };
            } else {
                // Для базовых действий создаем простую реализацию
                this.actionsRegistry[actionKey] = {
                    config: config,
                    execute: async (row, col) => {
                        await this.executeBasicAction(actionKey, row, col);
                    },
                    requiresModule: false
                };
            }
        });
        
        console.log(`✅ Зарегистрировано ${Object.keys(this.actionsRegistry).length} действий в реестре`);
    }

    // ========== РЕГИСТРАЦИЯ И ЗАГРУЗКА МОДУЛЕЙ ==========

    async loadActionModule(moduleName) {
        console.log(`🔄 Загрузка модуля действия: ${moduleName}`);
        
        try {
            const modulePaths = [
                `data/actions/${moduleName}-action.js`,
                `modules/actions/${moduleName}-action.js`,
                `${moduleName}-action.js`
            ];
            
            for (const path of modulePaths) {
                try {
                    console.log(`   Пробуем путь: ${path}`);
                    const response = await fetch(path);
                    
                    if (response.ok) {
                        const code = await response.text();
                        
                        // Выполняем код модуля
                        const blob = new Blob([code], { type: 'application/javascript' });
                        const url = URL.createObjectURL(blob);
                        
                        await new Promise((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = url;
                            script.onload = resolve;
                            script.onerror = reject;
                            document.head.appendChild(script);
                        });
                        
                        URL.revokeObjectURL(url);
                        
                        // После загрузки скрипта ищем соответствующий класс
                        const className = this.getModuleClassName(moduleName);
                        if (window[className]) {
                            // Создаем экземпляр модуля и регистрируем его
                            const moduleInstance = new window[className](this);
                            this.registerActionModule(moduleName, moduleInstance);
                            
                            console.log(`✅ Модуль ${moduleName} успешно загружен и зарегистрирован`);
                            return true;
                        } else {
                            console.warn(`⚠️ Класс ${className} не найден после загрузки скрипта`);
                        }
                    }
                } catch (error) {
                    console.log(`   ❌ Ошибка: ${error.message}`);
                }
            }
            
            console.error(`❌ Не удалось загрузить модуль ${moduleName}`);
            this.createModuleStub(moduleName);
            return false;
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки модуля ${moduleName}:`, error);
            this.createModuleStub(moduleName);
            return false;
        }
    }

    getModuleClassName(moduleName) {
        // Преобразуем snake_case в PascalCase
        return moduleName.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('') + 'Action';
    }

    registerActionModule(moduleName, moduleInstance) {
        this.actionModules[moduleName] = moduleInstance;
        
        // Обновляем реестр действий для этого модуля
        if (moduleInstance.getSupportedActions) {
            const supportedActions = moduleInstance.getSupportedActions();
            supportedActions.forEach(actionKey => {
                if (this.actionsRegistry[actionKey]) {
                    // Обновляем execute метод для использования модуля
                    this.actionsRegistry[actionKey].execute = (row, col) => {
                        return moduleInstance.execute(actionKey, row, col);
                    };
                    this.actionsRegistry[actionKey].moduleInstance = moduleInstance;
                    console.log(`✅ Действие ${actionKey} теперь использует модуль ${moduleName}`);
                }
            });
        }
        
        console.log(`✅ Модуль ${moduleName} зарегистрирован`);
    }

    createModuleStub(moduleName) {
        console.log(`🔄 Создаем заглушку для модуля ${moduleName}`);
        
        const stubModule = {
            execute: (actionKey, row, col) => {
                console.log(`📦 Заглушка ${moduleName}: действие ${actionKey} на [${col},${row}]`);
                this.showNotification(`⚠️ Модуль ${moduleName} не загружен. Заглушка активирована.`, 'warning');
                
                // Базовая логика как заглушка
                this.handleBasicAction(actionKey, row, col);
            },
            getSupportedActions: () => {
                // Возвращаем список действий, которые поддерживает этот модуль
                return Object.keys(this.baseActionConfigs)
                    .filter(key => this.baseActionConfigs[key].requires_module === moduleName);
            }
        };
        
        this.registerActionModule(moduleName, stubModule);
    }

    // ========== ВЫПОЛНЕНИЕ ДЕЙСТВИЙ ==========

    async executeModuleAction(actionKey, row, col) {
        console.log(`🔍 Выполнение модульного действия: ${actionKey}`);
        
        const config = this.baseActionConfigs[actionKey];
        if (!config || !config.requires_module) {
            console.error(`❌ Действие ${actionKey} не требует модуля или не найдено`);
            return;
        }
        
        const moduleName = config.requires_module;
        
        // Проверяем загружен ли модуль
        if (!this.actionModules[moduleName]) {
            console.log(`🔄 Модуль ${moduleName} не загружен, загружаем...`);
            const loaded = await this.loadActionModule(moduleName);
            
            if (!loaded) {
                console.error(`❌ Не удалось загрузить модуль ${moduleName}`);
                return;
            }
        }
        
        // Выполняем действие через модуль
        const moduleInstance = this.actionModules[moduleName];
        if (moduleInstance && typeof moduleInstance.execute === 'function') {
            try {
                await moduleInstance.execute(actionKey, row, col);
            } catch (error) {
                console.error(`❌ Ошибка выполнения действия ${actionKey}:`, error);
                this.showNotification(`❌ Ошибка выполнения действия`, 'error');
            }
        } else {
            console.error(`❌ Модуль ${moduleName} не имеет метода execute`);
        }
    }

    async executeBasicAction(actionKey, row, col) {
        console.log(`🔍 Выполнение базового действия: ${actionKey}`);
        
        // Базовые действия выполняем напрямую
        await this.handleBasicAction(actionKey, row, col);
    }

    async handleBasicAction(actionKey, row, col) {
        // Получаем клетку
        const cellKey = `${col},${row}`;
        const cell = this.mapSystem.currentTacticalMap?.cells[cellKey];
        if (!cell) return;
        
        // Проверяем шанс успеха
        const chance = this.getActionChance(actionKey, this.currentCellType);
        const roll = Math.random() * 100;
        const success = roll <= chance;
        
        // Показываем анимацию
        await this.showActionProcessing(actionKey, row, col, chance);
        
        if (success) {
            await this.handleActionSuccess(actionKey, row, col);
        } else {
            await this.handleActionFailure(actionKey, row, col);
        }
        
        // Обновляем интерфейс
        setTimeout(() => {
            if (cell && !cell.explored) {
                this.updateCellActionsUI(cell);
            }
        }, 1000);
    }

    async showActionProcessing(actionKey, row, col, chance) {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        const config = this.baseActionConfigs[actionKey] || {
            icon: '⚡',
            name: actionKey.replace(/_/g, ' '),
            description: 'Выполняется действие...'
        };
        
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
        
        // Анимация прогресса
        await new Promise(resolve => {
            setTimeout(() => {
                const progressFill = actionsContainer.querySelector('.progress-fill');
                if (progressFill) {
                    progressFill.style.width = '100%';
                }
                setTimeout(resolve, 300);
            }, 50);
        });
    }

    async handleActionSuccess(actionKey, row, col) {
        const config = this.baseActionConfigs[actionKey];
        if (!config) return;
        
        // Для ресурсных действий
        if (config.resource_type) {
            await this.giveRandomResource(config.resource_type);
            this.showNotification(`✅ ${config.name} успешно!`, 'success');
        }
        // Для специальных действий
        else if (actionKey === 'stealth_movement') {
            await this.handleStealthMovement(row, col);
        }
        else {
            this.showNotification(`✅ ${config.name} успешно!`, 'success');
        }
    }

    async handleActionFailure(actionKey, row, col) {
        const config = this.baseActionConfigs[actionKey];
        if (!config) return;
        
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
        
        const message = failureMessages[actionKey] || "❌ Действие не увенчалось успехом";
        this.showNotification(message, 'warning');
        
        // Проверяем, не привлекло ли неудача монстра
        await this.checkMonsterAfterFailure(actionKey, row, col);
    }

    async checkMonsterAfterFailure(actionKey, row, col) {
        const cellTypeData = this.cellTypes[this.currentCellType];
        if (!cellTypeData) return;
        
        let monsterChance = cellTypeData.failure_monster_chance || 50;
        const monsterRoll = Math.random() * 100;
        
        if (monsterRoll <= monsterChance) {
            console.log(`👹 Неудача привлекла монстра! Шанс: ${monsterChance}%, Выпало: ${monsterRoll}`);
            
            const battleSystem = window.game?.systems?.battle;
            if (battleSystem) {
                const monsterLevel = cellTypeData.monster_level || 1;
                const randomMonster = this.getMonsterByLevel(monsterLevel);
                
                if (randomMonster) {
                    this.mapSystem.pendingAction = {
                        action: actionKey,
                        row: row,
                        col: col,
                        cellTypeData: cellTypeData,
                        wasFailure: true
                    };
                    
                    this.showNotification(`👹 Провал привлёк ${randomMonster.name}! Готовьтесь к бою!`, 'warning');
                    battleSystem.startBattleWithMonster(this.mapSystem.currentHero, randomMonster.id, 'action_failure');
                }
            }
        }
    }

    async handleStealthMovement(row, col) {
        const neighbors = this.mapSystem.getHexNeighbors(this.mapSystem.playerTacticalPosition.y, this.mapSystem.playerTacticalPosition.x);
        const availableCells = neighbors.filter(neighbor => {
            const neighborCell = this.mapSystem.currentTacticalMap.cells[`${neighbor.col},${neighbor.row}`];
            return neighborCell && neighborCell.passable !== false;
        });
        
        if (availableCells.length > 0) {
            const randomCell = availableCells[Math.floor(Math.random() * availableCells.length)];
            this.mapSystem.handlePeacefulMovement(randomCell.col, randomCell.row, null);
            this.showNotification("👣 Вы тихо переместились на соседнюю клетку", 'success');
        } else {
            this.showNotification("❌ Нет доступных клеток для перемещения", 'warning');
        }
    }

    async giveRandomResource(resourceType) {
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

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

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

    determineCellType(cell) {
        if (!cell || !this.mapSystem.currentTacticalMap) return 'grave';
        
        const cellKey = `${cell.col},${cell.row}`;
        
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

    getAvailableActionsForCellType(cellType) {
        const cellTypeData = this.cellTypes[cellType];
        if (!cellTypeData || !cellTypeData.action_chances) {
            return Object.keys(this.baseActionChances)
                .filter(action => (this.baseActionChances[action] || 25) > 0);
        }
        
        return Object.keys(cellTypeData.action_chances)
            .filter(action => cellTypeData.action_chances[action] > 0);
    }

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

    // ========== ИНТЕРФЕЙС ПОЛЬЗОВАТЕЛЯ ==========

    updateCellActionsUI(cell) {
        console.log("=== НАЧАЛО updateCellActionsUI ===");
        
        const mapContent = document.querySelector('.tactical-map-content-with-actions');
        if (!mapContent) {
            console.error("❌ Основной контейнер карты не найден!");
            return;
        }
        
        // Создаем панели если их нет
        let leftPanel = document.querySelector('.cell-info-left-panel');
        if (!leftPanel) {
            leftPanel = document.createElement('div');
            leftPanel.className = 'cell-info-left-panel';
            mapContent.insertBefore(leftPanel, mapContent.firstChild);
        }
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) {
            console.error("❌ Контейнер действий не найден!");
            return;
        }
        
        // Устанавливаем размеры панелей
        const mapVisual = document.querySelector('.tactical-map-visual');
        const mapRect = mapVisual ? mapVisual.getBoundingClientRect() : null;
        const panelHeight = mapRect ? mapRect.height - 30 : window.innerHeight * 0.8;
        const panelWidth = 1150;
        
        // Настраиваем левую панель
        leftPanel.style.cssText = `
            display: flex !important;
            flex-direction: column !important;
            height: ${panelHeight}px !important;
            width: ${panelWidth}px !important;
            background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
            border: 2px solid #00ffcc !important;
            border-radius: 10px !important;
            padding: 20px !important;
            margin-right: 20px !important;
            overflow-y: auto !important;
            box-shadow: 0 0 20px rgba(0, 255, 204, 0.4) !important;
        `;
        
        // Настраиваем правую панель
        actionsContainer.style.cssText = `
            display: flex !important;
            flex-direction: column !important;
            height: ${panelHeight}px !important;
            width: ${panelWidth}px !important;
            background: linear-gradient(135deg, #16213e, #1a1a2e) !important;
            border: 2px solid #00ffff !important;
            border-radius: 10px !important;
            padding: 20px !important;
            margin-left: 20px !important;
            overflow-y: auto !important;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.4) !important;
        `;
        
        // Обновляем состояние
        this.selectedCell = cell;
        this.currentCellType = this.determineCellType(cell);
        this.currentCellActions = this.getAvailableActionsForCellType(this.currentCellType);
        
        const cellTypeData = this.cellTypes[this.currentCellType];
        const isExplored = cell.explored === true;
        
        // ========== ЛЕВАЯ ПАНЕЛЬ ==========
        let leftHTML = '';
        
        if (cellTypeData) {
            const cellIcon = this.mapSystem.objectSymbols[cell.type] || cellTypeData.icon || '❓';
            const isCurrentPosition = (cell.col === this.mapSystem.playerTacticalPosition.x && 
                               cell.row === this.mapSystem.playerTacticalPosition.y);
            
            leftHTML = this.createLeftPanelHTML(cell, cellTypeData, cellIcon, isCurrentPosition, isExplored);
        } else {
            leftHTML = `<div style="color: red; padding: 10px;">Ошибка: данные типа клетки не найдены</div>`;
        }
        
        leftPanel.innerHTML = leftHTML;
        
        // ========== ПРАВАЯ ПАНЕЛЬ ==========
        let rightHTML = `
            <div class="actions-section" style="margin-bottom: 20px;">
                <h3 style="color: #00ffff; margin-bottom: 15px; text-align: center;">
                    ⚔️ Доступные действия
                </h3>
        `;
        
        if (!isExplored && cell.hasAction !== false && this.currentCellActions.length > 0) {
            rightHTML += this.createActionsButtonsHTML(cell);
        } else if (isExplored) {
            rightHTML += `
                <div class="cell-explored">
                    <div class="explored-icon">✓</div>
                    <h5>Местность исследована</h5>
                    <p>Вы уже исследовали эту местность и совершили доступные действия.</p>
                </div>
            `;
        } else {
            rightHTML += `
                <div class="no-available-actions">
                    <div class="no-actions-icon">🚫</div>
                    <p>Для этой локации нет доступных действий</p>
                </div>
            `;
        }
        
        rightHTML += `</div>`;
        
        // Легенда шансов
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
        
        // Ресурсы героя
        rightHTML += `
            <div class="resource-info" style="margin-top: auto; padding-top: 20px; border-top: 1px solid #475569;">
                <h5 style="color: #00ffff; margin-bottom: 10px; text-align: center;">📦 Ресурсы героя:</h5>
                <div class="resource-list" id="heroResourcesListRight">
                    <!-- Ресурсы будут загружены динамически -->
                </div>
            </div>
        `;
        
        actionsContainer.innerHTML = rightHTML;
        
        // Обновляем ресурсы
        this.updateHeroResourcesUI('heroResourcesListRight');
        
        // Показываем изображение локации
        this.displayLocationImage(leftPanel, cellTypeData);
        
        console.log("✅ Панели обновлены");
        console.log("=== КОНЕЦ updateCellActionsUI ===");
    }

    createLeftPanelHTML(cell, cellTypeData, cellIcon, isCurrentPosition, isExplored) {
        return `
            <div class="cell-info-header-left">
                <h3 style="color: #00ffcc; text-align: center; margin-bottom: 20px;">
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
                
                <h4 class="cell-name" style="color: #00ffcc; text-align: center; margin: 15px 0;">
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
                        '<span style="background: rgba(0, 255, 204, 0.2); color: #00ffcc; padding: 4px 8px; border-radius: 4px; font-size: 12px;">📍 Вы здесь</span>' : ''}
                    ${isExplored ? 
                        '<span style="background: rgba(0, 255, 0, 0.2); color: #00ff00; padding: 4px 8px; border-radius: 4px; font-size: 12px;">✓ Исследовано</span>' : ''}
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
                
                <div class="danger-level-info" style="
                    background: rgba(255, 100, 100, 0.1);
                    border: 1px solid rgba(255, 100, 100, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 15px;
                    color: #ffcccc;
                    font-size: 14px;
                ">
                    <strong style="color: #ff6666; display: block; margin-bottom: 8px;">
                        ⚠️ Уровень опасности: ${cellTypeData.monster_level || 1}/5
                    </strong>
                    <small style="color: #ff9999; font-size: 12px;">
                        Шанс монстра при неудаче: ${cellTypeData.failure_monster_chance || 50}%
                    </small>
                </div>
            </div>
        `;
    }

    createActionsButtonsHTML(cell) {
        let html = `<div class="actions-grid" style="
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        ">`;
        
        this.currentCellActions.forEach(action => {
            const config = this.baseActionConfigs[action];
            if (!config) return;
            
            const chance = this.getActionChance(action, this.currentCellType);
            const chancePercent = Math.round(chance);
            
            let chanceColor = '#ff4444';
            if (chance >= 40) chanceColor = '#ffaa00';
            if (chance >= 70) chanceColor = '#44ff44';
            if (chance >= 90) chanceColor = '#00ffaa';
            
            const isReachable = this.mapSystem.isCellReachable(cell);
            const isCurrentPosition = (cell.col === this.mapSystem.playerTacticalPosition.x && 
                               cell.row === this.mapSystem.playerTacticalPosition.y);
            
            let isDisabled = false;
            let disabledReason = '';
            
            if (!isReachable) {
                isDisabled = true;
                disabledReason = 'Клетка недоступна';
            } else if (!isCurrentPosition && config.requires_player_here) {
                isDisabled = true;
                disabledReason = 'Нужно быть в клетке';
            }
            
            html += `
                <div class="action-card" onclick="${!isDisabled ? `game.systems.action.performAction('${action}', ${cell.row}, ${cell.col})` : ''}"
                     style="
                        background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9));
                        border: 1px solid ${isDisabled ? '#666' : '#00aaff'};
                        border-radius: 8px;
                        padding: 12px;
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                        transition: all 0.2s ease;
                        ${!isDisabled ? 'cursor: pointer;' : 'opacity: 0.6;'}
                     ">
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
        
        // Кнопка завершения исследования
        html += `
            <div class="cell-completion-controls" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #475569;">
                <button class="btn-control" 
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
        
        return html;
    }

    async performAction(actionKey, row, col) {
        console.log(`🎯 ActionSystem.performAction: ${actionKey} на [${col},${row}]`);
        
        const actionInfo = this.actionsRegistry[actionKey];
        if (!actionInfo) {
            console.error(`❌ Действие ${actionKey} не найдено в реестре`);
            return;
        }
        
        // Выполняем действие через зарегистрированный метод
        if (typeof actionInfo.execute === 'function') {
            await actionInfo.execute(row, col);
        } else {
            console.error(`❌ Действие ${actionKey} не имеет метода execute`);
        }
    }

    updateHeroResourcesUI(containerId = 'heroResourcesList') {
        const resourcesList = document.getElementById(containerId);
        if (!resourcesList || !this.mapSystem.currentHero) return;
        
        if (!this.mapSystem.currentHero.resources || Object.keys(this.mapSystem.currentHero.resources).length === 0) {
            resourcesList.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 20px;">Ресурсов пока нет</div>';
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

    displayLocationImage(container, cellTypeData) {
        const imageWrapper = container?.querySelector('#locationImageWrapperLeft');
        if (!imageWrapper) return;
        
        // Показываем fallback изображение
        const fallbackImg = this.locationImageCache.get('fallback');
        if (fallbackImg) {
            imageWrapper.innerHTML = '';
            const imgElement = fallbackImg.cloneNode();
            imgElement.className = 'location-image';
            imgElement.style.width = '100%';
            imgElement.style.height = '100%';
            imgElement.style.objectFit = 'cover';
            imageWrapper.appendChild(imgElement);
        }
        
        // Пробуем загрузить реальное изображение
        if (cellTypeData.image) {
            const realImg = new Image();
            realImg.onload = () => {
                imageWrapper.innerHTML = '';
                realImg.className = 'location-image';
                realImg.style.width = '100%';
                realImg.style.height = '100%';
                realImg.style.objectFit = 'cover';
                imageWrapper.appendChild(realImg);
            };
            realImg.onerror = () => {
                console.warn(`⚠️ Не удалось загрузить изображение: ${cellTypeData.image}`);
            };
            realImg.src = cellTypeData.image;
        }
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
            'woods': '🪵'
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

    // ========== МЕТОДЫ ДЛЯ ОТЛАДКИ ==========

    diagnoseModules() {
        console.group("🔍 ДИАГНОСТИКА МОДУЛЕЙ ДЕЙСТВИЙ");
        console.log("Загруженные модули:", Object.keys(this.actionModules));
        console.log("Реестр действий:", Object.keys(this.actionsRegistry));
        
        Object.entries(this.actionModules).forEach(([name, module]) => {
            console.log(`Модуль ${name}:`, {
                type: typeof module,
                hasExecute: typeof module.execute === 'function',
                supportedActions: module.getSupportedActions ? module.getSupportedActions() : 'N/A'
            });
        });
        
        console.groupEnd();
    }

    forceFixModules() {
        console.log("🛠️ Исправление модулей...");
        
        // Перезагружаем все модули
        Object.keys(this.actionModules).forEach(moduleName => {
            delete this.actionModules[moduleName];
        });
        
        // Пересоздаем реестр
        this.initializeBaseActions();
        
        console.log("✅ Модули сброшены и переинициализированы");
        this.showNotification("Модули действий перезагружены", 'info');
    }

    // ========== МЕТОДЫ ДЛЯ СОВМЕСТИМОСТИ ==========

    // Метод для обратной совместимости со старым кодом
    performCellAction(action, row, col) {
        return this.performAction(action, row, col);
    }

    // Метод для обратной совместимости со старым кодом
    initializeActionModules() {
        // Этот метод теперь ничего не делает, т.к. модули загружаются лениво
        console.log("🔄 ActionSystem: Модули действий будут загружены по требованию");
        return Promise.resolve(true);
    }

    // Метод для обратной совместимости со старым кодом
    testHuntSelection() {
        console.log("🧪 Тест выбора охоты...");
        
        // Пробуем загрузить модуль охоты
        if (!this.actionModules['hunt']) {
            console.log("🔄 Модуль охоты не загружен, пробуем загрузить...");
            this.loadActionModule('hunt').then(success => {
                if (success) {
                    this.showNotification("✅ Модуль охоты загружен для теста", 'success');
                    
                    // Тестируем модуль
                    if (this.selectedCell) {
                        this.actionModules['hunt'].execute('hunt', this.selectedCell.row, this.selectedCell.col);
                    }
                } else {
                    this.showNotification("❌ Не удалось загрузить модуль охоты", 'error');
                }
            });
        } else {
            // Модуль уже загружен, тестируем его
            if (this.selectedCell) {
                this.actionModules['hunt'].execute('hunt', this.selectedCell.row, this.selectedCell.col);
            }
        }
    }
}

// Глобальная регистрация
if (typeof window !== 'undefined') {
    window.ActionSystem = ActionSystem;
    console.log("📦 ActionSystem зарегистрирован глобально");
}
