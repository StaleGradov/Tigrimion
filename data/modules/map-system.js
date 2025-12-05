"use strict";

class MapSystem {
    constructor() {
        // Основные карты
        this.globalMaps = [];
        this.localMaps = [];
        this.tacticalMaps = [];
        
        this.currentGlobalMap = null;
        this.currentLocalMap = null;
        this.currentTacticalMap = null;
        
        this.playerGlobalPosition = {x: 0, y: 0};
        this.playerLocalPosition = {x: 0, y: 0};
        this.playerTacticalPosition = {x: 0, y: 0};
        
        this.currentHero = null;
        
        this.loadedJSONMaps = new Map();
        this.activeOverlay = null;
        
        // Canvas и отрисовка
        this.canvas = null;
        this.ctx = null;
        this.hexSize = 40;
        this.showGrid = false;
        this.hoveredHex = null;
        
        this.zoomLevel = 1.0;
        this.minZoom = 0.1;
        this.maxZoom = 5.0;
        this.zoomStep = 0.2;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.mapOffset = { x: 0, y: 0 };
        
        this.lastHoveredHex = null;
        this.animationFrame = null;
        
        this.pendingMovement = null;
        
        this.canvasInitialized = false;
        
        // Навигация по картам
        this.mapStack = [];
        this.currentMapType = 'local';
        
        // ========== СИСТЕМА БИОМОВ И ДЕЙСТВИЙ ==========
        this.biomeSystem = new BiomeSystem();
        this.cellTypes = {};
        this.resources = {};
        this.currentCellData = null;
        this.selectedCell = null;
        this.currentCellActions = [];
        
        // Все доступные действия (расширенный список)
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
            'make_fire',
            'set_bait',
            'hunt',
            'guard_caravan',
            'assassination'
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
            'make_fire': {
                icon: '🔥',
                name: 'Разжечь костёр',
                description: 'Создать источник тепла и света',
                class: 'action-fire',
                resource_type: 'fire'
            },
            'set_bait': {
                icon: '🥩',
                name: 'Установить приманку',
                description: 'Привлечь животных приманкой',
                class: 'action-bait',
                resource_type: 'bait'
            },
            'hunt': {
                icon: '🏹',
                name: 'Охота',
                description: 'Выследить и добыть дичь',
                class: 'action-hunt',
                resource_type: 'hunt'
            },
            'guard_caravan': {
                icon: '🛡️',
                name: 'Охранять караван',
                description: 'Защищать торговый путь',
                class: 'action-guard',
                resource_type: 'guard'
            },
            'assassination': {
                icon: '🗡️',
                name: 'Подготовить убийство',
                description: 'Планировать скрытную ликвидацию',
                class: 'action-assassination',
                resource_type: 'assassination'
            }
        };
        
        this.locationImages = {};
        this.locationImageCache = new Map();
        
        // Лут таблицы
        this.lootTables = {
            1: {
                gold: { weight: 60, min: 5, max: 20 },
                common_items: { weight: 30, items: ['health_potion', 'mana_potion', 'bread', 'torch'] },
                information: { weight: 10, messages: [
                    "Местный житель рассказал о подозрительной активности в лесу...",
                    "Вы нашли старую карту с отметкой тайника",
                    "Надпись на стене: 'Остерегайтесь теней ночью'"
                ]}
            },
            2: {
                gold: { weight: 50, min: 10, max: 35 },
                common_items: { weight: 35, items: ['health_potion', 'mana_potion', 'antidote', 'torch'] },
                rare_items: { weight: 5, items: ['iron_sword', 'leather_armor'] },
                information: { weight: 10, messages: [
                    "Записка: 'Сокровище спрятано под старым дубом'",
                    "Вы нашли дневник путешественника с полезными заметками"
                ]}
            },
            3: {
                gold: { weight: 40, min: 25, max: 60 },
                common_items: { weight: 30, items: ['health_potion', 'mana_potion', 'antidote'] },
                rare_items: { weight: 15, items: ['steel_sword', 'chain_armor', 'magic_ring'] },
                information: { weight: 15, messages: [
                    "Древние письмена рассказывают о затерянном артефакте",
                    "Карта с отметками скрытых проходов"
                ]}
            },
            4: {
                gold: { weight: 30, min: 40, max: 100 },
                common_items: { weight: 25, items: ['greater_health_potion', 'greater_mana_potion'] },
                rare_items: { weight: 25, items: ['magic_sword', 'plate_armor', 'amulet_protection'] },
                epic_items: { weight: 10, items: ['ancient_artifact', 'dragon_scale'] },
                information: { weight: 10, messages: [
                    "Тайные знания о магических ритуалах",
                    "Координаты легендарного сокровища"
                ]}
            },
            5: {
                gold: { weight: 20, min: 75, max: 200 },
                common_items: { weight: 20, items: ['greater_health_potion', 'greater_mana_potion'] },
                rare_items: { weight: 30, items: ['vampire_blade', 'shadow_armor', 'crystal_amulet'] },
                epic_items: { weight: 25, items: ['ancient_artifact', 'dragon_scale', 'phoenix_feather'] },
                legendary_items: { weight: 5, items: ['vampire_heart', 'eternal_crown'] },
                information: { weight: 5, messages: [
                    "Древние секреты бессмертия",
                    "Местоположение сердца вампирского лорда"
                ]}
            }
        };
        
        // Символы объектов
        this.objectSymbols = {
            'player_start': '⭐',
            'monster': '👹',
            'chest': '📦',
            'npc': '🧙',
            'exit': '🚪',
            'obstacle': '🪨',
            'inactive': '🔴',
            'tree': '🌲',
            'elegant_tree': '🎄',
            'cave': '🕳️',
            'lava_crack': '🌋',
            'graveyard_cross': '⚰️',
            'bandit_camp': '⚔️',
            'orc_camp': '👹',
            'black_monolith': '⬛',
            'weapon': '⚔️',
            'armor': '🛡️',
            'village': '🏘️',
            'castle': '🏰',
            'water': '💧',
            'campfire': '🔥',
            'merchant': '🛒',
            'cart': '🛒',
            'traveler': '🚶',
            'portal': '🌀',
            'ancient_rune': '🔰',
            'magic_crystal': '💎',
            'tavern': '🍻',
            'shop': '🏪',
            'dungeon': '🏰',
            'temple': '⛪',
            'bridge': '🌉',
            'mountain': '⛰️'
        };
        
        // Tooltip
        this.tooltipElement = null;
        this.currentTooltip = null;
        this.tooltipTimeout = null;
        this.resizeTimeout = null;
        
        // История посещений (для восстановления клеток через 24 шага)
        this.visitedCellsHistory = [];
        this.maxVisitedCells = 24;
        
        console.log("✅ MapSystem инициализирован с интеграцией BiomeSystem");
    }

    // ========== ИНИЦИАЛИЗАЦИЯ И ЗАГРУЗКА ==========

    async init() {
        console.log("🔄 Инициализация MapSystem...");
        
        try {
            // Загружаем данные биомов
            await this.biomeSystem.loadData();
            console.log("✅ BiomeSystem загружен");
            
            // Загружаем карты
            await this.loadMapData();
            
            // Загружаем остальные данные
            await this.loadCellData();
            await this.loadLocationImages();
            
            // Восстанавливаем состояние
            this.biomeSystem.loadState();
            
            console.log("✅ MapSystem полностью инициализирован");
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка инициализации MapSystem:", error);
            this.createFallbackMaps();
            return false;
        }
    }

    async loadMapData() {
        try {
            console.log("📥 Загружаем данные карт...");
            
            await this.loadJSONMaps();
            
            this.debugLoadedMaps();
            
            // Инициализируем типы клеток для всех загруженных карт
            await this.initializeCellSystem();
            
            if (this.localMaps.length > 0) {
                this.forceSetLocalMap();
            }
            else if (this.tacticalMaps.length === 0 && this.localMaps.length === 0) {
                console.log("⚠️ Нет загруженных карт, создаем тестовые...");
                this.createTestMaps();
                if (this.localMaps.length > 0) {
                    this.forceSetLocalMap();
                }
            }
            
            this.setStartPositions();
            
            console.log(`✅ Карты загружены: Глобальных=${this.globalMaps.length}, Локальных=${this.localMaps.length}, Тактических=${this.tacticalMaps.length}`);
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных карт:", error);
            this.createFallbackMaps();
            if (this.localMaps.length > 0) {
                this.forceSetLocalMap();
            }
            return true;
        }
    }

    async loadJSONMaps() {
        try {
            console.log("🔄 Загружаем JSON карты...");
            
            const tacticalMapPaths = [
                'data/maps/tactical/tactical-maps.json',
                'data/maps/tactical-maps.json',
                'maps/tactical-maps.json', 
                'data/tactical-maps.json',
                'tactical-maps.json',
                'data/modules/maps/tactical-maps.json'
            ];
            
            const localMapPaths = [
                'data/maps/local/local-maps.json',
                'data/maps/local-maps.json', 
                'maps/local-maps.json',
                'data/local-maps.json',
                'local-maps.json',
                'data/modules/maps/local-maps.json'
            ];
            
            let tacticalLoaded = false;
            for (const path of tacticalMapPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processTigrimionJSONMaps(mapData, 'tactical');
                        console.log(`✅ Тактические карты загружены из: ${path}`);
                        tacticalLoaded = true;
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить тактические карты из ${path}:`, e.message);
                }
            }
            
            let localLoaded = false;
            for (const path of localMapPaths) {
                try {
                    const response = await fetch(path);
                    if (response.ok) {
                        const mapData = await response.json();
                        await this.processTigrimionJSONMaps(mapData, 'local');
                        console.log(`✅ Локальные карты загружены из: ${path}`);
                        localLoaded = true;
                        break;
                    }
                } catch (e) {
                    console.log(`❌ Не удалось загрузить локальные карты из ${path}:`, e.message);
                }
            }
            
            console.log(`ℹ️ Итог загрузки: Тактические: ${tacticalLoaded}, Локальные: ${localLoaded}`);
            
        } catch (error) {
            console.error("❌ Ошибка загрузки JSON карт:", error);
        }
    }

    async processTigrimionJSONMaps(mapData, mapType = 'tactical') {
        if (!mapData || !mapData.meta) {
            console.warn("❌ Неверный формат JSON карты Tigrimion");
            return;
        }

        try {
            const convertedMap = this.convertTigrimionJSONToMap(mapData, mapType);
            if (convertedMap) {
                if (mapType === 'tactical') {
                    this.tacticalMaps.push(convertedMap);
                } else if (mapType === 'local') {
                    this.localMaps.push(convertedMap);
                }
                
                this.loadedJSONMaps.set(convertedMap.id, convertedMap);
                console.log(`✅ Обработана ${mapType} карта: ${convertedMap.name}`);
            }
        } catch (error) {
            console.error(`❌ Ошибка обработки ${mapType} карты:`, error);
        }
    }

    convertTigrimionJSONToMap(jsonMap, mapType = 'tactical') {
        if (!jsonMap.game || !jsonMap.game.grid || !jsonMap.game.grid.cells) {
            console.warn("❌ Неверная структура карты Tigrimion");
            return null;
        }

        const cells = jsonMap.game.grid.cells;
        const convertedCells = {};
        
        console.log(`📥 Импортируем ${mapType} карту: ${jsonMap.meta?.name || 'Без названия'}`);
        console.log(`📊 Клеток в импорте: ${cells.length}`);
        
        cells.forEach(cell => {
            const key = `${cell.col},${cell.row}`;
            
            convertedCells[key] = {
                type: cell.type,
                passable: cell.passable !== false,
                visible: cell.visible !== false,
                originalX: cell.x,
                originalY: cell.y,
                x: cell.x,
                y: cell.y,
                row: cell.row,
                col: cell.col,
                monster_id: cell.monster_id,
                tacticalMap: cell.tacticalMap,
                localMap: cell.localMap,
                globalMap: cell.globalMap,
                targetPosition: cell.targetPosition,
                returnX: cell.returnX,
                returnY: cell.returnY,
                tooltip: cell.tooltip,
                hasLoot: cell.hasLoot || false,
                shopName: cell.shopName,
                merchantName: cell.merchantName,
                shopItems: cell.shopItems || [],
                shopId: cell.shopId,
                restockTimer: cell.restockTimer,
                // Поля для системы биомов
                explored: false,
                hasAction: true,
                isSelected: false,
                originalData: cell
            };
        });

        let startPosition = {x: 0, y: 0};
        const startCell = cells.find(cell => cell.type === 'player_start');
        if (startCell) {
            startPosition = {x: startCell.col, y: startCell.row};
            console.log(`🎯 Стартовая позиция: [${startCell.col},${startCell.row}]`);
        }

        const originalCanvasWidth = jsonMap.visual?.canvasWidth || 1024;
        const originalCanvasHeight = jsonMap.visual?.canvasHeight || 1024;

        console.log(`📐 Original canvas: ${originalCanvasWidth}x${originalCanvasHeight}`);

        return {
            id: mapType === 'tactical' ? this.tacticalMaps.length + 1 : this.localMaps.length + 1,
            name: jsonMap.meta?.name || `${mapType === 'tactical' ? 'Тактическая' : 'Локальная'} карта`,
            image: jsonMap.visual?.backgroundImage || "",
            width: 20,
            height: 20,
            startPosition: startPosition,
            description: jsonMap.meta?.description || `Создана в редакторе карт Tigrimion`,
            localPosition: {x: 0, y: 0},
            cells: convertedCells,
            jsonData: jsonMap,
            gameData: jsonMap.game,
            renderType: 'hex',
            cellSize: jsonMap.game.grid.cellSize || 40,
            originalCanvasWidth: originalCanvasWidth,
            originalCanvasHeight: originalCanvasHeight,
            mapType: mapType
        };
    }

    async loadCellData() {
        try {
            console.log("📥 Загружаем данные типов клеток и ресурсов...");
            
            const [cellTypesResponse, resourcesResponse] = await Promise.all([
                fetch('data/cell_types.json').catch(() => null),
                fetch('data/resources.json').catch(() => null)
            ]);
            
            if (cellTypesResponse && cellTypesResponse.ok) {
                const cellData = await cellTypesResponse.json();
                this.cellTypes = cellData.cell_types || {};
                console.log(`✅ Загружено типов клеток: ${Object.keys(this.cellTypes).length}`);
            } else {
                console.warn("❌ cell_types.json не загружен, создаем базовые типы");
                this.createDefaultCellTypes();
            }
            
            if (resourcesResponse && resourcesResponse.ok) {
                const resourcesData = await resourcesResponse.json();
                this.resources = resourcesData;
                console.log(`✅ Загружено ресурсов: ${Object.keys(this.resources).length} категорий`);
            } else {
                console.warn("❌ resources.json не загружен, создаем базовые ресурсы");
                this.createDefaultResources();
            }
            
            return true;
            
        } catch (error) {
            console.error("❌ Ошибка загрузки данных клеток:", error);
            this.createDefaultCellTypes();
            this.createDefaultResources();
            return false;
        }
    }

    createDefaultCellTypes() {
        // Базовые типы клеток для особых локаций
        this.cellTypes = {
            'grave': {
                name: "Старая каменная гробница",
                description: "Массивная каменная плита с высеченными рунами.",
                suggestion: "Это захоронение знатного воина или мага.",
                icon: '⚰️',
                image: 'images/locations/grave.jpg'
            },
            'small_stream': {
                name: "Хрустальный ручей",
                description: "Прозрачная вода струится по гладким камням.",
                suggestion: "Идеальное место для пополнения запасов.",
                icon: '💧',
                image: 'images/locations/small_stream.jpg'
            }
        };
    }

    createDefaultResources() {
        this.resources = {
            treasure: [
                { id: 'gold_coins', name: '💰 Золотые монеты', type: 'treasure', rarity: 'common' }
            ],
            water: [
                { id: 'fresh_water', name: '💧 Пресная вода', type: 'water', rarity: 'common' }
            ],
            berries: [
                { id: 'wild_berries', name: '🫐 Дикие ягоды', type: 'berries', rarity: 'common' }
            ],
            mushrooms: [
                { id: 'common_mushrooms', name: '🍄 Обычные грибы', type: 'mushrooms', rarity: 'common' }
            ],
            herbs: [
                { id: 'healing_herbs', name: '🌿 Целебные травы', type: 'herbs', rarity: 'common' }
            ],
            ores: [
                { id: 'iron_ore', name: '⛏️ Железная руда', type: 'ores', rarity: 'common' }
            ],
            stones: [
                { id: 'common_stone', name: '🪨 Обычный камень', type: 'stones', rarity: 'common' }
            ],
            traps: [
                { id: 'snare_trap', name: '🪤 Петля-ловушка', type: 'traps', rarity: 'common' }
            ],
            ambush: [
                { id: 'ambush_position', name: '🎯 Позиция для засады', type: 'ambush', rarity: 'common' }
            ]
        };
    }

    async loadLocationImages() {
        try {
            console.log("🖼️ Загружаем картинки локаций...");
            
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

    // ========== СИСТЕМА БИОМОВ И ВЗАИМОДЕЙСТВИЙ ==========

    async initializeCellSystem() {
        console.log("🔄 Инициализация системы клеток...");
        
        [this.localMaps, this.tacticalMaps].forEach(mapArray => {
            mapArray.forEach(map => {
                if (map && map.cells) {
                    Object.values(map.cells).forEach(cell => {
                        // Инициализируем поля, если их нет
                        if (cell.explored === undefined) cell.explored = false;
                        if (cell.hasAction === undefined) cell.hasAction = true;
                        if (cell.isSelected === undefined) cell.isSelected = false;
                    });
                }
            });
        });
        
        console.log("✅ Система клеток инициализирована");
        return true;
    }

    forceSetLocalMap() {
        if (this.localMaps.length > 0) {
            const localMap = this.localMaps[0];
            this.currentLocalMap = localMap;
            this.currentTacticalMap = localMap;
            this.playerLocalPosition = {...localMap.startPosition};
            this.playerTacticalPosition = {...localMap.startPosition};
            this.currentMapType = 'local';
            
            console.log("✅ Локальная карта принудительно установлена:", {
                name: localMap.name,
                cells: Object.keys(localMap.cells).length,
                startPosition: localMap.startPosition
            });
            
            return true;
        }
        console.log("❌ Нет локальных карт для установки");
        return false;
    }

    setStartPositions() {
        console.log("🎯 Устанавливаем стартовые позиции...");
        
        if (this.localMaps.length > 0 && this.currentLocalMap) {
            console.log(`📍 Используем установленную локальную карту: ${this.currentLocalMap.name}`);
        }
        else if (this.tacticalMaps.length > 0) {
            this.currentTacticalMap = this.tacticalMaps[0];
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
            this.currentMapType = 'tactical';
            console.log(`🎯 Установлена стартовая тактическая карта: ${this.currentTacticalMap.name}`);
        }
        
        if (this.globalMaps.length > 0) {
            this.currentGlobalMap = this.globalMaps[0];
            this.playerGlobalPosition = {...this.currentGlobalMap.startPosition};
            console.log(`🗺️ Установлена глобальная карта: ${this.currentGlobalMap.name}`);
        }
        
        console.log("✅ Стартовые позиции установлены:", {
            global: this.playerGlobalPosition,
            local: this.playerLocalPosition, 
            tactical: this.playerTacticalPosition,
            mapType: this.currentMapType
        });
    }

    // ========== ОБРАБОТКА ВЗАИМОДЕЙСТВИЙ С КЛЕТКАМИ ==========

    handleCanvasClick(e) {
        if (!this.currentTacticalMap) {
            console.error("❌ Нет текущей тактической карты");
            return;
        }

        console.log("🎯 ОБРАБОТКА КЛИКА ПО КАРТЕ");

        const canvasRect = this.canvas.getBoundingClientRect();
        
        const computedStyle = getComputedStyle(this.canvas);
        const transform = computedStyle.transform;
        let scale = 1;
        
        if (transform && transform !== 'none') {
            const matrix = new DOMMatrix(transform);
            scale = matrix.a;
        }
        
        const logicalX = (e.clientX - canvasRect.left) / scale;
        const logicalY = (e.clientY - canvasRect.top) / scale;
        
        console.log(`🎯 Клик: экран [${e.clientX}, ${e.clientY}] -> логические [${logicalX}, ${logicalY}] scale: ${scale}`);
        
        const hex = this.getHexAtLogicalPosition(logicalX, logicalY);
        if (!hex) {
            console.log("❌ Клетка не найдена по координатам");
            return;
        }
        
        console.log(`🎲 Клик по клетке: [${hex.col}, ${hex.row}] тип: ${hex.type}`);
        
        // Проверяем специальные типы клеток
        if (this.isSpecialCell(hex)) {
            this.handleSpecialCellClick(hex);
            return;
        }
        
        // Проверяем переходы
        if (this.isTransitionCell(hex)) {
            this.handleTransitionClick(hex);
            return;
        }
        
        // Обычная клетка - показываем действия
        if (hex.passable !== false) {
            console.log("🎯 Клик для просмотра действий");
            
            const isReachable = this.isCellReachable(hex);
            
            if (isReachable) {
                console.log(`✅ Клетка достижима, показываем действия`);
                this.showCellActions(hex);
            } else {
                console.log(`❌ Клетка недостижима для взаимодействия`);
                this.showNotification("❌ Подойдите блише к клетке для взаимодействия!", 'warning');
            }
        } else {
            console.log(`❌ Клетка непроходима: ${hex.type}`);
        }
    }

    isSpecialCell(cell) {
        const specialTypes = ['water', 'merchant', 'tavern', 'shop', 'campfire', 'village', 'castle'];
        return specialTypes.includes(cell.type);
    }

    handleSpecialCellClick(cell) {
        console.log(`🎯 Обработка специальной клетки: ${cell.type}`);
        
        switch(cell.type) {
            case 'water':
                this.handleWaterCell(cell);
                break;
            case 'merchant':
                this.handleMerchantClick(cell);
                break;
            case 'tavern':
                this.handleTavernVisit(cell);
                break;
            case 'shop':
                this.handleMerchantClick(cell);
                break;
            case 'campfire':
                this.handleCampfire(cell);
                break;
            case 'village':
            case 'castle':
                this.handleSettlement(cell);
                break;
            default:
                console.warn(`⚠️ Неизвестный тип специальной клетки: ${cell.type}`);
        }
    }

    handleWaterCell(cell) {
        if (!this.currentHero) return;
        
        if (!this.isPlayerAdjacentToWater(cell)) {
            this.showTransitionWarning(cell);
            return;
        }
        
        const battleSystem = window.game?.systems?.battle;
        if (battleSystem && battleSystem.flask) {
            const heroSystem = window.game?.systems?.hero;
            if (heroSystem) {
                const stats = heroSystem.calculateHeroStats(this.currentHero);
                const oldHealth = this.currentHero.currentHealth;
                this.currentHero.currentHealth = stats.maxHealth;
                console.log(`❤️ Здоровье восстановлено: ${oldHealth} → ${stats.maxHealth}`);
            }
            
            const oldCharges = battleSystem.flask.currentCharges;
            battleSystem.flask.currentCharges = battleSystem.flask.capacity;
            battleSystem.flask.content = 'water';
            
            if (battleSystem.updateFlaskUI) {
                battleSystem.updateFlaskUI();
            }
            if (battleSystem.updateFlaskChargesDisplay) {
                battleSystem.updateFlaskChargesDisplay();
            }
            
            if (window.game) {
                window.game.showNotification(
                    `💧 Фляга наполнена водой: ${oldCharges}→${battleSystem.flask.capacity} зарядов! ` +
                    `Здоровье восстановлено до максимума.`, 
                    'success'
                );
                window.game.saveGame();
            }
            
            console.log(`💧 Герой ${this.currentHero.name} пополнил флягу у воды: ${oldCharges}→${battleSystem.flask.capacity}`);
            
            this.drawTacticalMap();
        }
    }

    handleMerchantClick(merchantCell) {
        if (!this.isPlayerAdjacentToTransition(merchantCell)) {
            this.showTransitionWarning(merchantCell);
            return;
        }

        if (!merchantCell.shopItems || merchantCell.shopItems.length === 0) {
            console.warn("🛒 Магазин пуст - нет товаров в shopItems");
            if (window.game) {
                window.game.showNotification("🛒 Магазин пуст!", 'warning');
            }
            return;
        }

        const shopSystem = window.game?.systems?.shop;
        if (shopSystem && shopSystem.openShop) {
            console.log(`🛒 Открываем магазин: ${merchantCell.shopName || 'Неизвестный магазин'}`);
            shopSystem.openShop(merchantCell);
        } else {
            console.error("❌ ShopSystem не доступна или нет метода openShop");
            if (window.game) {
                window.game.showNotification("❌ Система магазинов недоступна", 'error');
            }
        }
    }

    handleTavernVisit(cell) {
        console.log("🍻 Начало обработки посещения таверны:", cell);
        
        if (!this.currentHero) {
            console.error("❌ Нет текущего героя для посещения таверны");
            return;
        }
        
        if (!this.isPlayerAdjacentToTransition(cell)) {
            console.log("❌ Герой не рядом с таверной");
            this.showTransitionWarning(cell);
            return;
        }
        
        console.log("✅ Герой рядом с таверной, начинаем обработку...");
        
        const heroSystem = window.game?.systems?.hero;
        if (!heroSystem) {
            console.error("❌ HeroSystem не доступна");
            return;
        }
        
        const stats = heroSystem.calculateHeroStats(this.currentHero);
        
        const oldHealth = this.currentHero.currentHealth;
        this.currentHero.currentHealth = stats.maxHealth;
        
        const battleSystem = window.game?.systems?.battle;
        if (battleSystem && battleSystem.flask) {
            const oldCharges = battleSystem.flask.currentCharges;
            battleSystem.flask.currentCharges = battleSystem.flask.capacity;
            battleSystem.flask.content = 'water';
            
            console.log(`💧 Фляга пополнена: ${oldCharges} -> ${battleSystem.flask.currentCharges}`);
            
            if (battleSystem.updateFlaskUI) {
                battleSystem.updateFlaskUI();
            }
            if (battleSystem.updateFlaskChargesDisplay) {
                battleSystem.updateFlaskChargesDisplay();
            }
            
            setTimeout(() => {
                if (battleSystem.updateFlaskChargesDisplay) {
                    battleSystem.updateFlaskChargesDisplay();
                    console.log("💧 Интерфейс фляги обновлен после таверны");
                }
            }, 100);
        }
        
        if (window.game) {
            window.game.saveGame();
            window.game.showNotification(`🍻 Таверна: здоровье ${oldHealth}→${stats.maxHealth}, фляга пополнена!`, 'success');
        }
        
        console.log(`🍻 Герой ${this.currentHero.name} посетил таверну, здоровье восстановлено`);
        
        this.drawTacticalMap();
    }

    handleCampfire(cell) {
        if (!this.currentHero) return;
        
        if (!this.isPlayerAdjacentToTransition(cell)) {
            this.showTransitionWarning(cell);
            return;
        }
        
        console.log("🔥 Использование костра");
        
        const heroSystem = window.game?.systems?.hero;
        if (heroSystem) {
            const stats = heroSystem.calculateHeroStats(this.currentHero);
            const healAmount = Math.floor(stats.maxHealth * 0.3);
            const oldHealth = this.currentHero.currentHealth;
            this.currentHero.currentHealth = Math.min(stats.maxHealth, oldHealth + healAmount);
            
            if (window.game) {
                window.game.showNotification(`🔥 У костра: восстановлено ${this.currentHero.currentHealth - oldHealth} HP`, 'success');
                window.game.saveGame();
            }
        }
        
        this.drawTacticalMap();
    }

    handleSettlement(cell) {
        console.log(`🏘️ Поселение: ${cell.type}`);
        
        if (!this.isPlayerAdjacentToTransition(cell)) {
            this.showTransitionWarning(cell);
            return;
        }
        
        if (cell.tacticalMap) {
            this.activateTransition(cell);
        } else {
            this.showNotification(`🏘️ Вы в ${cell.type === 'village' ? 'деревне' : 'замке'}. Здесь можно отдохнуть и пообщаться.`, 'info');
        }
    }

    isPlayerAdjacentToWater(waterCell) {
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        
        return neighbors.some(neighbor => 
            neighbor.row === waterCell.row && 
            neighbor.col === waterCell.col
        );
    }

    isPlayerAdjacentToTransition(transitionCell) {
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        
        return neighbors.some(neighbor => 
            neighbor.row === transitionCell.row && 
            neighbor.col === transitionCell.col
        );
    }

    showTransitionWarning(transitionCell) {
        const transitionName = this.getTransitionName(transitionCell);
        let message = `Чтобы использовать ${transitionName}, нужно подойти вплотную!`;
        
        if (transitionCell.type === 'water') {
            message = "💧 Чтобы использовать источник воды, нужно подойти к нему вплотную!";
        }
        
        console.log(`🚫 ${message}`);
        
        if (window.game) {
            window.game.showNotification(message, 'warning');
        }
        
        this.highlightTransition(transitionCell);
    }

    getTransitionName(transitionCell) {
        if (transitionCell.tacticalMap) {
            return this.getLocationNameFromPath(transitionCell.tacticalMap) || "помещение";
        }
        if (transitionCell.localMap) {
            return this.getLocationNameFromPath(transitionCell.localMap) || "локацию";
        }
        if (transitionCell.globalMap) {
            return this.getLocationNameFromPath(transitionCell.globalMap) || "регион";
        }
        if (transitionCell.type === 'exit') {
            return "выход";
        }
        if (transitionCell.type === 'water') {
            return "источник воды";
        }
        
        return "переход";
    }

    highlightTransition(transitionCell) {
        if (!transitionCell) return;
        
        const originalColor = transitionCell.highlightColor;
        transitionCell.highlightColor = '#ff4444';
        transitionCell.isHighlighted = true;
        
        this.drawTacticalMap();
        
        setTimeout(() => {
            transitionCell.highlightColor = originalColor;
            transitionCell.isHighlighted = false;
            this.drawTacticalMap();
        }, 1000);
    }

    // ========== СИСТЕМА БИОМОВ - ОСНОВНОЙ МЕТОД ==========

    async showCellActions(cell) {
        console.log("=== НАЧАЛО showCellActions ===");
        
        // Обновляем историю посещений
        this.updateVisitedCellsHistory(cell);
        
        // Получаем или генерируем данные биома для клетки
        const cellData = await this.getCellBiomeData(cell);
        
        if (!cellData) {
            console.error("❌ Не удалось получить данные биома для клетки");
            return;
        }
        
        this.currentCellData = cellData;
        this.selectedCell = cell;
        
        // Проверяем, исследована ли уже клетка
        if (cell.explored) {
            this.showExploredCellUI(cell, cellData);
            return;
        }
        
        // Определяем доступные действия
        this.currentCellActions = this.getAvailableActionsForBiome(cellData);
        
        // Показываем UI с действиями
        this.updateCellActionsUI(cell, cellData);
        
        console.log(`✅ Показаны действия для клетки [${cell.col},${cell.row}]: ${this.currentCellActions.length} действий`);
        console.log("=== КОНЕЦ showCellActions ===");
    }

    async getCellBiomeData(cell) {
        try {
            // Получаем данные клетки из BiomeSystem
            const cellData = this.biomeSystem.getCellData(cell.col, cell.row, cell);
            
            if (!cellData) {
                console.warn("⚠️ BiomeSystem не вернул данные, создаем временные");
                return this.createTemporaryBiomeData(cell);
            }
            
            console.log(`✅ Данные биома получены: ${cellData.biome?.name}`, {
                oddity: cellData.oddity?.name,
                event: cellData.event?.name,
                dangerLevel: cellData.calculatedModifiers?.dangerLevel
            });
            
            return cellData;
            
        } catch (error) {
            console.error("❌ Ошибка получения данных биома:", error);
            return this.createTemporaryBiomeData(cell);
        }
    }

    createTemporaryBiomeData(cell) {
        // Временные данные для отладки
        return {
            position: { col: cell.col, row: cell.row },
            biome: {
                id: 1,
                name: "Лесная опушка",
                icon: "🌲",
                danger_level: 3,
                description: "Тихая лесная опушка."
            },
            oddity: null,
            event: null,
            explored: false,
            calculatedModifiers: {
                actionChances: {
                    'search_treasure': 25,
                    'search_water': 30,
                    'search_berries': 35,
                    'search_mushrooms': 30,
                    'search_herbs': 40,
                    'search_ore': 20,
                    'search_stone': 25,
                    'set_trap': 50,
                    'prepare_ambush': 45,
                    'make_fire': 50,
                    'set_bait': 40,
                    'hunt': 35,
                    'guard_caravan': 10,
                    'assassination': 20
                },
                encounterChance: 25,
                dangerLevel: 3
            }
        };
    }

    getAvailableActionsForBiome(cellData) {
        // Фильтруем действия, которые имеют шанс > 0 в этом биоме
        const availableActions = this.allActions.filter(action => {
            const chance = this.getActionChance(action, cellData);
            return chance > 0;
        });
        
        console.log(`🎯 Доступно действий: ${availableActions.length} из ${this.allActions.length}`);
        return availableActions;
    }

    getActionChance(action, cellData) {
        if (!cellData || !cellData.calculatedModifiers || !cellData.calculatedModifiers.actionChances) {
            return 50; // Шанс по умолчанию
        }
        
        const baseChance = cellData.calculatedModifiers.actionChances[action] || 0;
        
        // Учитываем уровень опасности
        const dangerLevel = cellData.calculatedModifiers.dangerLevel || 5;
        const dangerModifier = (dangerLevel - 5) * -5; // Чем опаснее, тем сложнее
        
        let finalChance = baseChance + dangerModifier;
        
        // Ограничиваем значения 0-100
        finalChance = Math.max(0, Math.min(100, finalChance));
        
        console.log(`🎯 Шанс ${action}: база=${baseChance}, опасность=${dangerModifier}, итого=${finalChance}%`);
        
        return finalChance;
    }

    // ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ДЕЙСТВИЙ ==========

    updateCellActionsUI(cell, cellData) {
        console.log("=== НАЧАЛО updateCellActionsUI ===");
        
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) {
            console.error("❌ Контейнер действий не найден!");
            this.createActionsContainerFallback();
            const newContainer = document.getElementById('cellActionsContainer');
            if (newContainer) {
                this.updateCellActionsUI(cell, cellData);
            }
            return;
        }
        
        // Получаем размеры карты
        const mapVisual = document.querySelector('.tactical-map-visual');
        const mapRect = mapVisual ? mapVisual.getBoundingClientRect() : null;
        
        // ФИКСИРОВАННЫЕ РАЗМЕРЫ
        const panelWidth = 1150;
        const panelHeight = mapRect ? mapRect.height - 30 : window.innerHeight * 0.8;
        
        console.log(`📐 Размеры панели: ${panelWidth}x${panelHeight}px`);
        
        // Устанавливаем размеры панели
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
            background: linear-gradient(135deg, #1a1a2e, #16213e) !important;
            border: 2px solid #00ffff !important;
            border-radius: 10px !important;
            padding: 20px !important;
            margin: 0 !important;
            position: relative !important;
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.4) !important;
            flex-shrink: 0 !important;
        `;
        
        // Исправляем родительскую панель
        const panel = actionsContainer.closest('.cell-actions-panel');
        if (panel) {
            panel.style.cssText = `
                overflow: visible !important;
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
        
        // Создаем HTML для панели
        try {
            actionsContainer.innerHTML = this.createBiomeActionsHTML(cell, cellData);
        } catch (error) {
            console.error("❌ Ошибка создания HTML:", error);
            actionsContainer.innerHTML = `<div style="color: red; padding: 10px;">Ошибка: ${error.message}</div>`;
        }
        
        // Оптимизируем размеры после вставки HTML
        setTimeout(() => {
            this.optimizeActionsPanel(actionsContainer, cellData);
        }, 50);
        
        // Назначаем обработчики событий
        this.setupActionEventListeners();
        
        // Обновляем ресурсы героя
        this.updateHeroResourcesUI();
        
        console.log("✅ Панель действий обновлена");
        console.log("=== КОНЕЦ updateCellActionsUI ===");
    }

    createBiomeActionsHTML(cell, cellData) {
        const biome = cellData.biome;
        const oddity = cellData.oddity;
        const event = cellData.event;
        const modifiers = cellData.calculatedModifiers;
        
        let html = `
            <div class="biome-header">
                <div class="location-visual-container">
                    <div class="location-image-wrapper" id="locationImageWrapper">
                        <div class="image-loading">${biome.icon} Загрузка...</div>
                    </div>
                    <div class="location-icon-overlay">
                        <div class="cell-icon-large">${biome.icon}</div>
                    </div>
                </div>
                
                <h4 class="cell-name">${biome.name}</h4>
                
                <div class="cell-position-info">
                    <span class="cell-coords">Позиция: [${cell.col}, ${cell.row}]</span>
                    <span class="danger-level" style="color: ${this.getDangerColor(modifiers.dangerLevel)};">
                        Уровень опасности: ${modifiers.dangerLevel}/10
                    </span>
                </div>
                
                <div class="biome-description-text">
                    ${biome.description}
                </div>
                
                ${oddity ? `
                    <div class="oddity-info" style="background: rgba(255, 215, 0, 0.1); border-left: 3px solid #ffd700; padding: 10px; margin: 10px 0; border-radius: 5px;">
                        <div style="display: flex; align-items: center; margin-bottom: 5px;">
                            <span style="font-size: 18px; margin-right: 8px;">${oddity.icon}</span>
                            <strong style="color: #ffd700;">${oddity.name}</strong>
                        </div>
                        <div style="font-size: 13px; color: #ccc;">${oddity.description}</div>
                    </div>
                ` : ''}
                
                ${event ? `
                    <div class="event-info" style="background: rgba(138, 43, 226, 0.1); border-left: 3px solid #8a2be2; padding: 10px; margin: 10px 0; border-radius: 5px;">
                        <div style="display: flex; align-items: center; margin-bottom: 5px;">
                            <span style="font-size: 18px; margin-right: 8px;">${event.icon}</span>
                            <strong style="color: #8a2be2;">${event.name}</strong>
                        </div>
                        <div style="font-size: 13px; color: #ccc;">${event.description}</div>
                    </div>
                ` : ''}
            </div>
            
            <div class="actions-section" style="margin-top: 20px;">
                <h3 style="color: #00ffcc; margin-bottom: 15px; text-align: center;">
                    ⚡ Доступные действия
                </h3>
        `;
        
        // Создаем сетку действий
        html += `<div class="actions-grid" style="
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        ">`;
        
        this.currentCellActions.forEach(action => {
            const config = this.actionConfigs[action] || {
                icon: '❓',
                name: action.replace(/_/g, ' '),
                description: 'Неизвестное действие',
                class: 'action-unknown'
            };
            
            const chance = this.getActionChance(action, cellData);
            const chancePercent = Math.round(chance);
            const chanceColor = this.getChanceColor(chance);
            
            html += `
                <div class="action-card" style="
                    background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9));
                    border: 1px solid #00aaff;
                    border-radius: 8px;
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    transition: all 0.2s ease;
                    cursor: pointer;
                " onclick="game.systems.map.performCellAction('${action}')">
                    <div style="display: flex; align-items: center; margin-bottom: 8px;">
                        <div class="action-icon" style="
                            font-size: 20px;
                            margin-right: 10px;
                            color: #00ffff;
                            flex-shrink: 0;
                        ">
                            ${config.icon}
                        </div>
                        <div class="action-name" style="
                            font-weight: bold;
                            color: #ffffff;
                            font-size: 13px;
                            flex: 1;
                        ">
                            ${config.name}
                        </div>
                    </div>
                    
                    <div class="action-description" style="
                        color: #b0b0ff;
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
                </div>
            `;
        });
        
        html += `</div>`; // Закрываем actions-grid
        
        // Добавляем легенду шансов
        html += `
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
        
        html += `</div>`; // Закрываем actions-section
        
        return html;
    }

    getDangerColor(level) {
        const colors = [
            '#4ade80', // 1-2: зеленый
            '#a3e635', // 2-3
            '#facc15', // 3-4: желтый
            '#fb923c', // 4-6: оранжевый
            '#f87171', // 6-8: красный
            '#dc2626', // 8-9: темно-красный
            '#991b1b'  // 10: бордовый
        ];
        
        const index = Math.min(Math.floor(level) - 1, colors.length - 1);
        return colors[Math.max(0, index)];
    }

    getChanceColor(chance) {
        if (chance >= 90) return '#00ffaa';
        if (chance >= 70) return '#44ff44';
        if (chance >= 40) return '#ffaa00';
        return '#ff4444';
    }

    optimizeActionsPanel(container, cellData) {
        // 1. БОЛЬШАЯ КВАДРАТНАЯ КАРТИНКА (300px)
        const imageWrapper = container.querySelector('.location-visual-container');
        if (imageWrapper) {
            imageWrapper.style.cssText = `
                height: 300px !important;
                width: 300px !important;
                max-height: 300px !important;
                max-width: 300px !important;
                min-height: 300px !important;
                min-width: 300px !important;
                overflow: hidden !important;
                margin: 0 auto 20px auto !important;
                position: relative !important;
                border: 2px solid #00ffff !important;
                border-radius: 10px !important;
                align-self: center !important;
            `;
        }
        
        // 2. ОПТИМАЛЬНЫЕ СТИЛИ ДЛЯ ТЕКСТА
        const description = container.querySelector('.biome-description-text');
        if (description) {
            description.style.cssText = `
                display: block !important;
                color: #e2e8f0 !important;
                background: rgba(0, 0, 0, 0.6) !important;
                padding: 12px !important;
                border-radius: 8px !important;
                margin: 10px 0 !important;
                max-height: 140px !important;
                overflow-y: auto !important;
                font-size: 14px !important;
                line-height: 1.5 !important;
                text-align: justify !important;
            `;
        }
        
        // 3. ОПТИМАЛЬНЫЕ СТИЛИ ДЛЯ КАРТОЧЕК ДЕЙСТВИЙ
        const actionCards = container.querySelectorAll('.action-card');
        actionCards.forEach(card => {
            card.style.cssText = `
                background: linear-gradient(135deg, rgba(30, 30, 46, 0.9), rgba(20, 25, 45, 0.9)) !important;
                border: 1px solid #00aaff !important;
                border-radius: 8px !important;
                padding: 12px !important;
                display: flex !important;
                flex-direction: column !important;
                height: 100% !important;
                transition: all 0.2s ease !important;
                margin: 0 !important;
                cursor: pointer !important;
            `;
            
            card.onmouseenter = () => {
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 5px 15px rgba(0, 170, 255, 0.3)';
            };
            card.onmouseleave = () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = 'none';
            };
        });
        
        // 4. НАЗВАНИЕ ЛОКАЦИИ
        const locationName = container.querySelector('.cell-name');
        if (locationName) {
            locationName.style.cssText = `
                font-size: 20px !important;
                margin: 15px 0 !important;
                color: #00ffff !important;
                text-align: center !important;
                font-weight: bold !important;
                text-shadow: 0 0 10px rgba(0, 255, 255, 0.5) !important;
            `;
        }
        
        // Автоматически скроллим вверх
        container.scrollTop = 0;
        
        console.log(`✅ Панель оптимизирована: ${actionCards.length} карточек действий`);
    }

    showExploredCellUI(cell, cellData) {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        actionsContainer.innerHTML = `
            <div class="cell-explored">
                <div class="explored-icon">✓</div>
                <h5 style="color: #00ffff; margin: 10px 0;">Местность исследована</h5>
                <p style="color: #ccc; margin-bottom: 10px;">Вы уже исследовали эту местность и совершили доступные действия.</p>
                <p style="color: #888; font-size: 13px;">Перейдите на другую клетку для новых действий.</p>
                
                <div style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px;">
                    <div style="color: #00ffcc; margin-bottom: 5px;">📊 Информация о локации:</div>
                    <div style="color: #aaa; font-size: 12px;">
                        Биом: ${cellData.biome?.name || 'Неизвестно'}<br>
                        Уровень опасности: ${cellData.calculatedModifiers?.dangerLevel || '?'}/10<br>
                        Координаты: [${cell.col}, ${cell.row}]
                    </div>
                </div>
            </div>
        `;
    }

    // ========== ВЫПОЛНЕНИЕ ДЕЙСТВИЙ ==========

    async performCellAction(action) {
        console.log(`🎯 Начало выполнения действия: ${action}`);
        
        if (!this.currentHero) {
            this.showNotification("❌ Нужен герой для совершения действий!", 'error');
            return;
        }
        
        if (!this.selectedCell) {
            this.showNotification("❌ Не выбрана клетка для действия!", 'error');
            return;
        }
        
        if (this.selectedCell.explored) {
            this.showNotification("❌ Эта клетка уже исследована!", 'warning');
            return;
        }
        
        const cell = this.selectedCell;
        const cellData = this.currentCellData;
        
        if (!cellData) {
            this.showNotification("❌ Ошибка данных клетки!", 'error');
            return;
        }
        
        // Проверяем доступность клетки
        const isReachable = this.isCellReachable(cell);
        if (!isReachable) {
            this.showNotification("❌ Клетка недоступна для исследования! Подойдите ближе.", 'warning');
            return;
        }
        
        const chance = this.getActionChance(action, cellData);
        
        // Показываем анимацию выполнения
        this.showActionProcessingUI(action, chance);
        
        // Задержка для анимации
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Проверяем успешность действия
        const roll = Math.random() * 100;
        const success = roll <= chance;
        
        console.log(`🎲 Бросок удачи: ${roll.toFixed(1)}/${chance} - ${success ? 'УСПЕХ' : 'ПРОВАЛ'}`);
        
        if (success) {
            await this.handleActionSuccess(action, cell, cellData);
        } else {
            await this.handleActionFailure(action, cell, cellData);
        }
        
        // Помечаем клетку как исследованную
        this.markCellAsExplored(cell.row, cell.col);
        
        // Обновляем UI
        setTimeout(() => {
            if (cell.explored) {
                this.showExploredCellUI(cell, cellData);
            }
        }, 1000);
    }

    showActionProcessingUI(action, chance) {
        const actionsContainer = document.getElementById('cellActionsContainer');
        if (!actionsContainer) return;
        
        const config = this.actionConfigs[action] || { icon: '⚡', name: action };
        
        actionsContainer.innerHTML = `
            <div class="action-processing" style="text-align: center; padding: 40px 20px;">
                <div class="processing-icon" style="font-size: 48px; margin-bottom: 20px;">${config.icon}</div>
                <h4 style="color: #00ffff; margin-bottom: 10px;">Выполняется действие...</h4>
                <p style="color: #ccc; margin-bottom: 20px;">${config.name}</p>
                <div class="chance-display-processing" style="margin-bottom: 30px;">
                    <span style="color: #aaa;">Шанс успеха:</span>
                    <span style="color: #00ffcc; font-weight: bold; margin-left: 5px;">${Math.round(chance)}%</span>
                </div>
                <div class="processing-progress" style="width: 100%; height: 6px; background: #333; border-radius: 3px; overflow: hidden; margin: 0 auto 20px;">
                    <div class="progress-fill" style="height: 100%; background: #00ffcc; width: 0%; transition: width 0.8s ease;"></div>
                </div>
                <div class="processing-hint" style="color: #888; font-size: 12px;">Результат зависит от удачи и особенностей местности</div>
            </div>
        `;
        
        setTimeout(() => {
            const progressFill = actionsContainer.querySelector('.progress-fill');
            if (progressFill) {
                progressFill.style.width = '100%';
            }
        }, 50);
    }

    async handleActionSuccess(action, cell, cellData) {
        const config = this.actionConfigs[action];
        
        // Определяем тип ресурса для награды
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
            'make_fire': 'fire',
            'set_bait': 'bait',
            'hunt': 'hunt',
            'guard_caravan': 'guard',
            'assassination': 'assassination'
        };
        
        const resourceType = resourceMap[action];
        
        // Выдаем награду
        if (resourceType && this.resources[resourceType]) {
            this.giveRandomResource(resourceType, cell);
        } else {
            // Базовая награда за действия без ресурсов
            this.giveBasicReward(action);
        }
        
        // Сообщение об успехе
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
            'make_fire': "🔥 Костер разожжен!",
            'set_bait': "🥩 Приманка установлена!",
            'hunt': "🏹 Удачная охота!",
            'guard_caravan': "🛡️ Караван под защитой!",
            'assassination': "🗡️ Цель устранена!"
        };
        
        const message = successMessages[action] || "✅ Действие успешно!";
        this.showNotification(message, 'success');
        
        // Проверяем активацию события
        if (cellData.event) {
            await this.checkEventActivation(action, cellData);
        }
    }

    async handleActionFailure(action, cell, cellData) {
        // Сообщение о провале
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
            'make_fire': "❌ Не удалось разжечь костер",
            'set_bait': "❌ Приманка не сработала",
            'hunt': "❌ Охота не удалась",
            'guard_caravan': "❌ Не удалось защитить караван",
            'assassination': "❌ Не удалось устранить цель"
        };
        
        const message = failureMessages[action] || "❌ Действие не увенчалось успехом";
        this.showNotification(message, 'warning');
        
        // При провале проверяем встречу с монстром
        const encounterChance = cellData.calculatedModifiers?.encounterChance || 30;
        const roll = Math.random() * 100;
        
        if (roll <= encounterChance) {
            console.log(`👹 Провал действия вызвал встречу с монстром! (${roll.toFixed(1)}/${encounterChance})`);
            await this.startMonsterEncounter(cellData);
        }
    }

    async startMonsterEncounter(cellData) {
        if (!window.game?.systems?.battle || !this.currentHero) {
            console.error("❌ BattleSystem или герой не доступны");
            return;
        }
        
        // Получаем случайного монстра из биома
        const monsterIds = cellData.calculatedModifiers?.monsterIds || [];
        if (monsterIds.length === 0) {
            console.warn("⚠️ Нет монстров в этом биоме");
            return;
        }
        
        const randomMonsterId = monsterIds[Math.floor(Math.random() * monsterIds.length)];
        
        console.log(`👹 Запускаем бой с монстром ID: ${randomMonsterId} из биома ${cellData.biome.name}`);
        
        // Показываем уведомление
        this.showNotification("👹 Вас атакует монстр!", 'danger');
        
        // Запускаем бой
        window.game.systems.battle.startBattleWithMonster(this.currentHero, randomMonsterId, 'action_failure');
    }

    async checkEventActivation(action, cellData) {
        if (!cellData.event || !cellData.event.activation_condition) {
            return;
        }
        
        const event = cellData.event;
        
        // Проверяем условия активации
        if (event.activation_condition.action === action) {
            const chance = event.activation_condition.chance || 50;
            if (Math.random() * 100 < chance) {
                console.log(`🎭 Событие активировано: ${event.name}`);
                await this.handleEventTrigger(event);
            }
        }
    }

    async handleEventTrigger(event) {
        if (!event.triggered_choices) {
            return;
        }
        
        // Показываем диалог с выбором
        if (window.game && window.game.showDialog) {
            window.game.showDialog({
                title: event.name,
                message: event.description,
                choices: event.triggered_choices.map(choice => ({
                    text: choice.name,
                    callback: () => this.handleEventChoice(choice)
                }))
            });
        }
    }

    handleEventChoice(choice) {
        const roll = Math.random() * 100;
        const success = roll <= (choice.chance || 50);
        
        if (success && choice.success) {
            this.showNotification(choice.success.message, 'success');
            // Обработка награды
            if (choice.success.reward) {
                this.processEventReward(choice.success.reward);
            }
        } else if (choice.failure) {
            this.showNotification(choice.failure.message, 'warning');
            // Обработка последствий
            if (choice.failure.consequence) {
                this.processEventConsequence(choice.failure.consequence);
            }
        }
    }

    processEventReward(reward) {
        if (reward.gold) {
            const goldAmount = this.parseRange(reward.gold);
            this.currentHero.gold += goldAmount;
            this.showNotification(`💰 Получено ${goldAmount} золота!`, 'success');
        }
    }

    processEventConsequence(consequence) {
        if (consequence.type === 'combat') {
            // Запускаем бой
            if (window.game?.systems?.battle) {
                window.game.systems.battle.startBattleWithMonster(
                    this.currentHero, 
                    consequence.monster_id, 
                    'event_consequence'
                );
            }
        }
    }

    parseRange(rangeStr) {
        if (typeof rangeStr === 'number') return rangeStr;
        
        const parts = rangeStr.split('-').map(p => parseInt(p.trim()));
        if (parts.length === 1) return parts[0];
        if (parts.length === 2) {
            return Math.floor(Math.random() * (parts[1] - parts[0] + 1)) + parts[0];
        }
        return 0;
    }

    giveRandomResource(resourceType, cell) {
        const resources = this.resources[resourceType];
        if (!resources || resources.length === 0) {
            console.warn(`⚠️ Ресурсы типа ${resourceType} не найдены`);
            return;
        }
        
        const randomResource = resources[Math.floor(Math.random() * resources.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        
        this.addResourceToHero(randomResource.id, randomResource.name, quantity, resourceType);
    }

    giveBasicReward(action) {
        // Базовая награда золотом
        const baseRewards = {
            'make_fire': { min: 1, max: 5 },
            'set_bait': { min: 2, max: 8 },
            'hunt': { min: 5, max: 15 },
            'guard_caravan': { min: 10, max: 30 },
            'assassination': { min: 20, max: 50 }
        };
        
        const reward = baseRewards[action];
        if (reward) {
            const goldAmount = Math.floor(Math.random() * (reward.max - reward.min + 1)) + reward.min;
            this.currentHero.gold += goldAmount;
            this.showNotification(`💰 Получено ${goldAmount} золота!`, 'success');
        }
    }

    addResourceToHero(resourceId, resourceName, quantity, resourceType) {
        if (!this.currentHero.resources) {
            this.currentHero.resources = {};
        }
        
        if (!this.currentHero.resources[resourceId]) {
            this.currentHero.resources[resourceId] = {
                id: resourceId,
                name: resourceName,
                count: 0,
                type: resourceType
            };
        }
        
        this.currentHero.resources[resourceId].count += quantity;
        
        console.log(`📦 Добавлен ресурс ${resourceId}: ${quantity} шт. Всего: ${this.currentHero.resources[resourceId].count}`);
        
        this.updateHeroResourcesUI();
        this.showNotification(`📦 Получено: ${resourceName} x${quantity}`, 'success');
        
        if (window.game) {
            window.game.saveGame();
        }
    }

    updateHeroResourcesUI() {
        const resourcesList = document.getElementById('heroResourcesList');
        if (!resourcesList || !this.currentHero) return;
        
        if (!this.currentHero.resources || Object.keys(this.currentHero.resources).length === 0) {
            resourcesList.innerHTML = '<div class="no-resources" style="color: #888; padding: 10px; text-align: center;">Ресурсов пока нет</div>';
            return;
        }
        
        let resourcesHTML = '';
        Object.values(this.currentHero.resources).forEach(resource => {
            const icon = this.getResourceIcon(resource.type);
            resourcesHTML += `
                <div class="resource-item" style="display: flex; align-items: center; margin-bottom: 8px; padding: 5px; background: rgba(0,0,0,0.2); border-radius: 4px;">
                    <span class="resource-icon" style="font-size: 16px; margin-right: 8px;">${icon}</span>
                    <span class="resource-name" style="flex: 1; color: #ccc; font-size: 12px;">${resource.name}</span>
                    <span class="resource-count" style="color: #00ffcc; font-weight: bold; font-size: 12px;">x${resource.count}</span>
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
            'fire': '🔥',
            'bait': '🥩',
            'hunt': '🏹',
            'guard': '🛡️',
            'assassination': '🗡️'
        };
        return icons[resourceType] || '📦';
    }

    setupActionEventListeners() {
        // Обработчики уже назначены через onclick в HTML
        console.log("✅ Обработчики действий настроены");
    }

    // ========== СИСТЕМА ПОСЕЩЕНИЙ И ВОССТАНОВЛЕНИЯ ==========

    updateVisitedCellsHistory(cell) {
        const cellKey = `${cell.col},${cell.row}`;
        
        // Удаляем если уже есть в истории
        const existingIndex = this.visitedCellsHistory.findIndex(c => c.key === cellKey);
        if (existingIndex !== -1) {
            this.visitedCellsHistory.splice(existingIndex, 1);
        }
        
        // Добавляем в начало
        this.visitedCellsHistory.unshift({
            key: cellKey,
            cell: cell,
            timestamp: Date.now()
        });
        
        // Ограничиваем размер истории
        if (this.visitedCellsHistory.length > this.maxVisitedCells) {
            const removed = this.visitedCellsHistory.pop();
            this.restoreCell(removed.cell);
        }
        
        console.log(`📊 История посещений: ${this.visitedCellsHistory.length}/${this.maxVisitedCells}`);
    }

    restoreCell(cell) {
        // Восстанавливаем клетку через 24 шага
        if (cell.explored) {
            cell.explored = false;
            cell.hasAction = true;
            console.log(`🔄 Клетка [${cell.col},${cell.row}] восстановлена`);
            
            // Также очищаем данные биома для этой клетки
            this.biomeSystem.markCellAsUnexplored(cell.col, cell.row);
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    isCellReachable(cell) {
        if (!cell || !this.playerTacticalPosition) return false;
        
        // Если это текущая позиция игрока
        if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
            return true;
        }
        
        // Проверяем соседние клетки
        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        const isNeighbor = neighbors.some(neighbor => 
            neighbor.row === cell.row && neighbor.col === cell.col
        );
        
        return isNeighbor;
    }

    markCellAsExplored(row, col) {
        const cellKey = `${col},${row}`;
        if (this.currentTacticalMap && this.currentTacticalMap.cells[cellKey]) {
            this.currentTacticalMap.cells[cellKey].explored = true;
            this.currentTacticalMap.cells[cellKey].hasAction = false;
            this.currentTacticalMap.cells[cellKey].isSelected = false;
            
            // Также отмечаем в BiomeSystem
            this.biomeSystem.markCellAsExplored(col, row);
            
            this.drawTacticalMap();
        }
    }

    getHexAtLogicalPosition(x, y) {
        console.log(`🔍 Поиск клетки по координатам: [${x}, ${y}]`);
        
        if (!this.currentTacticalMap) return null;
        
        let closestHex = null;
        let minDistance = Infinity;

        const cells = Object.values(this.currentTacticalMap.cells);
        
        for (const cell of cells) {
            const cellX = cell.x || cell.originalX || 0;
            const cellY = cell.y || cell.originalY || 0;
            
            const distance = Math.sqrt(
                Math.pow(x - cellX, 2) + 
                Math.pow(y - cellY, 2)
            );
            
            if (distance <= 40 && distance < minDistance) {
                minDistance = distance;
                closestHex = cell;
            }
        }
        
        return closestHex;
    }

    getHexNeighbors(currentRow, currentCol) {
        if (!this.currentTacticalMap) return [];
        
        const neighbors = [];
        const currentCell = this.currentTacticalMap.cells[`${currentCol},${currentRow}`];
        
        if (!currentCell) return [];
        
        const hexSize = this.currentTacticalMap.cellSize || 40;
        
        Object.values(this.currentTacticalMap.cells).forEach(potentialNeighbor => {
            if (potentialNeighbor.col === currentCol && potentialNeighbor.row === currentRow) {
                return;
            }
            
            const centerX = potentialNeighbor.x || potentialNeighbor.originalX || 0;
            const centerY = potentialNeighbor.y || potentialNeighbor.originalY || 0;
            const currentCenterX = currentCell.x || currentCell.originalX || 0;
            const currentCenterY = currentCell.y || currentCell.originalY || 0;
            
            const dx = centerX - currentCenterX;
            const dy = centerY - currentCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Проверяем соседство (расстояние примерно равно размеру гекса)
            const isAdjacent = distance <= hexSize * 1.8;
            
            if (isAdjacent && potentialNeighbor.visible) {
                neighbors.push({
                    row: potentialNeighbor.row,
                    col: potentialNeighbor.col,
                    cell: potentialNeighbor,
                    distance: distance
                });
            }
        });
        
        return neighbors;
    }

    isTransitionCell(cell) {
        return cell.tacticalMap || cell.localMap || cell.globalMap || cell.type === 'exit';
    }

    async handleTransitionClick(transitionCell) {
        if (!this.isPlayerAdjacentToTransition(transitionCell)) {
            this.showTransitionWarning(transitionCell);
            return;
        }
        
        await this.activateTransition(transitionCell);
    }

    getLocationNameFromPath(filePath) {
        if (!filePath) return null;
        const filename = filePath.split('/').pop().replace('.json', '').replace(/_/g, ' ');
        return filename.charAt(0).toUpperCase() + filename.slice(1);
    }

    // ========== ПЕРЕХОДЫ МЕЖДУ КАРТАМИ ==========

    async activateTransition(transitionCell) {
        console.log(`🚪 АКТИВАЦИЯ ПЕРЕХОДА:`, {
            type: transitionCell.type,
            tacticalMap: transitionCell.tacticalMap,
            localMap: transitionCell.localMap, 
            globalMap: transitionCell.globalMap,
            targetPosition: transitionCell.targetPosition
        });

        if (transitionCell.type === 'exit' && !transitionCell.tacticalMap && !transitionCell.localMap && !transitionCell.globalMap) {
            console.log("🚪 Простой выход с карты через exit-гекс");
            this.exitToPreviousMap();
            return;
        }

        this._lastTransitionCell = transitionCell;
        this.saveCurrentMapToStack();
        
        try {
            let newMap = null;
            
            if (transitionCell.tacticalMap) {
                console.log(`🎲 Переход на тактическую карту: ${transitionCell.tacticalMap}`);
                newMap = await this.loadTacticalMapFile(transitionCell.tacticalMap);
                this.currentMapType = 'tactical';
                
                if (transitionCell.targetPosition) {
                    this.playerTacticalPosition = {...transitionCell.targetPosition};
                    console.log(`📍 Игрок установлен на targetPosition:`, this.playerTacticalPosition);
                }
                
            } else if (transitionCell.localMap) {
                console.log(`🌍 Переход на локальную карту: ${transitionCell.localMap}`);
                newMap = await this.loadLocalMapFile(transitionCell.localMap);
                this.currentMapType = 'local';
                
                if (transitionCell.targetPosition) {
                    this.playerTacticalPosition = {...transitionCell.targetPosition};
                    console.log(`📍 Игрок установлен на targetPosition:`, this.playerTacticalPosition);
                } else {
                    this.setPlayerToStartPosition();
                }
                
            } else if (transitionCell.globalMap) {
                console.log(`🗺️ Переход на глобальную карту: ${transitionCell.globalMap}`);
                newMap = await this.loadGlobalMapFile(transitionCell.globalMap);
                this.currentMapType = 'global';
            }
            
            if (newMap) {
                await this.forceMapUpdate(newMap);
            }
            
            this._lastTransitionCell = null;
            
        } catch (error) {
            console.error("❌ Ошибка перехода между картами:", error);
            this._lastTransitionCell = null;
            this.exitToPreviousMap();
        }
    }

    async loadTacticalMapFile(mapPath) {
        console.log(`🔍 ЗАГРУЗКА КАРТЫ: ${mapPath}`);
        
        try {
            const response = await fetch(mapPath);
            if (!response.ok) throw new Error(`Не удалось загрузить карту: ${mapPath}`);
            
            const mapData = await response.json();
            console.log(`✅ Карта "${mapData.meta?.name}" загружена`);
            
            const tacticalMap = this.convertTigrimionJSONToMap(mapData, 'tactical');
            
            if (tacticalMap) {
                this.currentTacticalMap = tacticalMap;
                
                if (!this._lastTransitionCell || !this._lastTransitionCell.targetPosition) {
                    this.setPlayerToStartPosition();
                }
                
                console.log(`📍 Текущая позиция игрока:`, this.playerTacticalPosition);
                return tacticalMap;
            }
        } catch (error) {
            console.error(`❌ Ошибка загрузки тактической карты:`, error);
            
            console.log("🔄 Создаем тестовую таверну...");
            const tavernMap = this.createTestTavernMap();
            this.currentTacticalMap = tavernMap;
            
            if (!this._lastTransitionCell || !this._lastTransitionCell.targetPosition) {
                this.setPlayerToStartPosition();
            }
            
            return tavernMap;
        }
        return null;
    }

    createTestTavernMap() {
        console.log("🍻 Создаем тестовую таверну...");
        
        const tavernMap = {
            id: 1001,
            name: "Таверна 'Веселый Гном'",
            image: "",
            width: 6,
            height: 6,
            startPosition: {x: 3, y: 3},
            description: "Уютная таверна, где можно отдохнуть и послушать новости",
            cells: {
                "3,3": {
                    type: "player_start", 
                    passable: true, 
                    row: 3, 
                    col: 3, 
                    visible: true, 
                    x: 300, 
                    y: 300,
                    explored: false,
                    hasAction: true,
                    isSelected: false
                },
                "3,2": {
                    type: "exit", 
                    passable: true, 
                    row: 2, 
                    col: 3, 
                    visible: true, 
                    x: 300, 
                    y: 250,
                    tooltip: "🚪 Выход из таверны\n(Вернуться на улицу)",
                    explored: false,
                    hasAction: true,
                    isSelected: false
                },
                "2,3": {
                    type: "npc", 
                    passable: true, 
                    row: 3, 
                    col: 2, 
                    visible: true, 
                    x: 250, 
                    y: 300,
                    tooltip: "🧙 Хозяин таверны\n(Может рассказать новости)",
                    explored: false,
                    hasAction: true,
                    isSelected: false
                },
                "4,3": {
                    type: "merchant", 
                    passable: true, 
                    row: 3, 
                    col: 4, 
                    visible: true, 
                    x: 350, 
                    y: 300,
                    shopName: "Таверный магазин",
                    merchantName: "Бармен Грог",
                    shopItems: [1, 2, 3],
                    tooltip: "🛒 Бармен\n(Купить выпивку и еду)",
                    explored: false,
                    hasAction: true,
                    isSelected: false
                },
                "3,4": {
                    type: "campfire", 
                    passable: true, 
                    row: 4, 
                    col: 3, 
                    visible: true, 
                    x: 300, 
                    y: 350,
                    tooltip: "🔥 Камин\n(Тепло и уют)",
                    explored: false,
                    hasAction: true,
                    isSelected: false
                }
            },
            cellSize: 40,
            originalCanvasWidth: 600,
            originalCanvasHeight: 600,
            mapType: 'tactical'
        };
        
        console.log("✅ Тестовая таверна создана с магазином");
        return tavernMap;
    }

    saveCurrentMapToStack() {
        const mapState = {
            map: this.currentTacticalMap,
            playerPosition: {...this.playerTacticalPosition},
            mapType: this.currentMapType,
            localMap: this.currentLocalMap
        };
        this.mapStack.push(mapState);
        console.log(`💾 Сохранено состояние карты в стек (глубина: ${this.mapStack.length})`);
    }

    exitToPreviousMap() {
        if (this.mapStack.length === 0) {
            console.log("🚫 Нет предыдущей карты для возврата");
            return;
        }
        
        const savedState = this.mapStack.pop();
        if (savedState) {
            this.currentTacticalMap = savedState.map;
            this.playerTacticalPosition = savedState.playerPosition;
            this.currentMapType = savedState.mapType;
            
            if (savedState.mapType === 'local') {
                this.currentLocalMap = savedState.map;
            }
            
            console.log(`🚪 Возврат на ${savedState.mapType} карту: ${savedState.map.name}`);
            
            this.calculateCSSScale();
            this.drawTacticalMap();
        }
    }

    async loadLocalMapFile(mapPath) {
        try {
            console.log(`📥 Загружаем локальную карту: ${mapPath}`);
            
            const response = await fetch(mapPath);
            if (!response.ok) {
                throw new Error(`Не удалось загрузить локальную карту: ${mapPath}`);
            }
            
            const mapData = await response.json();
            const localMap = this.convertTigrimionJSONToMap(mapData, 'local');
            
            if (localMap) {
                this.setCurrentLocalMap(localMap);
                console.log(`✅ Локальная карта загружена: ${localMap.name}`);
                return localMap;
            }
        } catch (error) {
            console.error(`❌ Ошибка загрузки локальной карты:`, error);
            
            console.log("🔄 Создаем тестовую локацию...");
            const locationMap = this.createTestLocationMap();
            this.setCurrentLocalMap(locationMap);
            return locationMap;
        }
        return null;
    }

    createTestLocationMap() {
        console.log("🌍 Создаем тестовую локацию...");
        
        const locationMap = {
            id: 1002,
            name: "Тестовая Локация",
            image: "",
            width: 8,
            height: 8,
            startPosition: {x: 4, y: 4},
            description: "Тестовая локация для отладки переходов",
            cells: {
                "4,4": {
                    type: "player_start", 
                    passable: true, 
                    row: 4, 
                    col: 4, 
                    visible: true, 
                    x: 200, 
                    y: 200,
                    explored: false,
                    hasAction: true,
                    isSelected: false
                },
                "4,3": {
                    type: "exit", 
                    passable: true, 
                    row: 3, 
                    col: 4, 
                    visible: true, 
                    x: 200, 
                    y: 150,
                    explored: false,
                    hasAction: true,
                    isSelected: false
                }
            },
            cellSize: 40,
            originalCanvasWidth: 400,
            originalCanvasHeight: 400,
            mapType: 'local'
        };
        
        console.log("✅ Тестовая локация создана");
        return locationMap;
    }

    async loadGlobalMapFile(mapPath) {
        console.log(`🌍 Загрузка глобальной карта: ${mapPath}`);
        return null;
    }

    setCurrentLocalMap(localMap) {
        if (!localMap) {
            console.error("❌ Попытка установить пустую локальную карту");
            return;
        }
        
        this.currentLocalMap = localMap;
        this.currentTacticalMap = localMap;
        this.playerLocalPosition = {...localMap.startPosition};
        this.playerTacticalPosition = {...localMap.startPosition};
        this.currentMapType = 'local';
        
        console.log(`📍 Установлена локальная карта: ${localMap.name}`, {
            startPosition: localMap.startPosition,
            cellsCount: Object.keys(localMap.cells).length
        });
        
        if (this.canvasInitialized) {
            this.calculateCSSScale();
            this.drawTacticalMap();
        }
    }

    setPlayerToStartPosition() {
        if (!this.currentTacticalMap) return;
        
        const startCell = Object.values(this.currentTacticalMap.cells)
            .find(cell => cell.type === 'player_start');
        
        if (startCell) {
            this.playerTacticalPosition = {x: startCell.col, y: startCell.row};
            console.log(`🎯 Герой установлен на стартовую позицию: [${startCell.col}, ${startCell.row}]`);
        } else {
            this.playerTacticalPosition = {...this.currentTacticalMap.startPosition};
        }
    }

    async forceMapUpdate(newMap) {
        console.log("🔄 Принудительное обновление карты...");
        
        if (this.currentMapType === 'local') {
            this.currentLocalMap = newMap;
        }
        this.currentTacticalMap = newMap;
        
        if (this.canvasInitialized) {
            this.calculateCSSScale();
            this.drawTacticalMap();
            this.updateMovementInfo();
            console.log("✅ Карта немедленно обновлена");
            
            setTimeout(() => {
                const cellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
                const currentCell = this.currentTacticalMap.cells[cellKey];
                
                if (currentCell) {
                    console.log(`📍 Показываем описание клетки после обновления карты`);
                    this.showCellActions(currentCell);
                }
            }, 200);
        } else {
            setTimeout(() => {
                this.initCanvas();
            }, 100);
        }
        
        this.updateMapInterface();
    }

    // ========== ПЕРЕМЕЩЕНИЕ И БОЙ ==========

    moveOnTacticalMap(x, y) {
        if (!this.currentHero) {
            console.error("❌ Герой не выбран!");
            if (window.game) {
                window.game.showNotification("❌ Герой не выбран! Пожалуйста, выберите героя сначала.", 'error');
            }
            return;
        }

        if (!this.currentTacticalMap) return;

        const cellKey = `${x},${y}`;
        const cellData = this.currentTacticalMap.cells[cellKey];
        
        if (!cellData) {
            console.log("🚫 Клетка не существует");
            if (window.game) {
                window.game.showNotification("Эта клетка не существует!", 'error');
            }
            return;
        }

        if (this.isTransitionCell(cellData)) {
            this.handleTransitionClick(cellData);
            return;
        }

        if (cellData.passable === false) {
            console.log("🚫 Клетка непроходима");
            if (window.game) {
                window.game.showNotification("Эта клетка непроходима!", 'error');
            }
            return;
        }

        const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x);
        const isReachable = neighbors.some(neighbor => 
            neighbor.row === y && neighbor.col === x
        );

        if (!isReachable) {
            console.log("🚫 Нельзя переместиться на эту клетку - она недоступна");
            if (window.game) {
                window.game.showNotification("Нельзя переместиться на эту клетку!", 'error');
            }
            return;
        }

        const mapType = this.currentTacticalMap.jsonData?.meta?.mapType || 'combat';
        
        console.log(`🎯 Начало перемещения на [${x}, ${y}], тип карты: ${mapType}`);
        
        if (mapType === 'peaceful') {
            this.handlePeacefulMovement(x, y, cellData);
        } else {
            setTimeout(() => {
                this.startTacticalBattleForMovement(x, y, cellData);
            }, 50);
        }
    }

    handlePeacefulMovement(targetX, targetY, cellData) {
        console.log(`🌿 Мирное перемещение на [${targetX}, ${targetY}]`);
        
        if (cellData.hasLoot) {
            console.log(`🎁 Найден лут на клетке [${targetX}, ${targetY}]`);
            this.collectLoot(cellData, targetX, targetY);
        } else {
            console.log(`➡️ Перемещение без лута на [${targetX}, ${targetY}]`);
            this.completePeacefulMovement(targetX, targetY);
        }
    }

    collectLoot(cellData, col, row) {
        const lootLevel = this.currentTacticalMap?.jsonData?.meta?.lootLevel || 1;
        
        console.log(`🎲 Генерация лута уровня ${lootLevel} для клетке [${col},${row}]`);
        
        const reward = this.generateRandomReward(lootLevel);
        
        this.processRewardWithMovement(reward, col, row, cellData);
    }

    generateRandomReward(lootLevel) {
        const lootTable = this.lootTables[lootLevel] || this.lootTables[1];
        
        const rewardType = this.selectRewardType(lootTable);
        const rewardData = lootTable[rewardType];
        
        console.log(`🎯 Выбран тип награды: ${rewardType} для уровня ${lootLevel}`);
        
        switch(rewardType) {
            case 'gold':
                const amount = Math.floor(Math.random() * (rewardData.max - rewardData.min + 1)) + rewardData.min;
                return {
                    type: 'gold',
                    amount: amount,
                    message: `Вы нашли ${amount} золотых монет!`
                };
                
            case 'common_items':
            case 'rare_items':
            case 'epic_items':
            case 'legendary_items':
                const items = rewardData.items;
                const randomItem = items[Math.floor(Math.random() * items.length)];
                return {
                    type: 'item',
                    itemId: randomItem,
                    message: `Вы нашли: ${this.getItemName(randomItem)}!`
                };
                
            case 'information':
                const messages = rewardData.messages;
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                return {
                    type: 'information',
                    message: randomMessage
                };
                
            default:
                return {
                    type: 'gold',
                    amount: 10,
                    message: 'Вы нашли 10 золотых монет!'
                };
        }
    }

    selectRewardType(lootTable) {
        const types = Object.keys(lootTable);
        const weights = types.map(type => lootTable[type].weight);
        
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        
        let random = Math.random() * totalWeight;
        
        for (let i = 0; i < types.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                return types[i];
            }
        }
        
        return types[0];
    }

    processRewardWithMovement(reward, col, row, cellData) {
        let showNotification = true;
        let completed = false;
        
        try {
            switch(reward.type) {
                case 'gold':
                    this.currentHero.gold += reward.amount;
                    console.log(`💰 Добавлено золото: ${reward.amount}`);
                    completed = true;
                    break;
                    
                case 'item':
                    const itemSystem = window.game?.systems?.equipment;
                    if (itemSystem && itemSystem.addItemToHero) {
                        const lootItem = this.getLootItemById(reward.itemId);
                        if (!lootItem) {
                            console.warn(`⚠️ Предмет лута не найден: ${reward.itemId}`);
                            reward.message = `Найдено что-то странное... (${reward.itemId})`;
                        } else {
                            const itemAdded = itemSystem.addItemToHero(this.currentHero, reward.itemId);
                            if (!itemAdded) {
                                reward.message = "Инвентарь полен! Награда потеряна.";
                            } else {
                                reward.message = `Вы нашли: ${lootItem.name}!`;
                            }
                        }
                        completed = true;
                    }
                    break;
                    
                case 'information':
                    if (this.isImportantInformation(reward.message)) {
                        this.showInformationDialog(reward.message);
                        showNotification = false;
                        this.delayedMovementAfterDialog(col, row, reward.message);
                        return;
                    }
                    completed = true;
                    break;
            }
            
            if (completed) {
                this.syncHeroWithOtherSystems();
                
                if (showNotification && window.game) {
                    window.game.showNotification(reward.message, 'success');
                }
                
                this.completePeacefulMovement(col, row);
                
                console.log(`🎁 Награда обработана и перемещение завершено:`, reward);
            }
            
        } catch (error) {
            console.error("❌ Ошибка обработки награды:", error);
            if (window.game) {
                window.game.showNotification("Ошибка при получении награды", 'error');
            }
            this.completePeacefulMovement(col, row);
        }
    }

    delayedMovementAfterDialog(col, row, message) {
        setTimeout(() => {
            this.completePeacefulMovement(col, row);
            console.log(`💡 Перемещение после диалога: ${message}`);
        }, 100);
    }

    getItemName(itemId) {
        const itemSystem = window.game?.systems?.equipment;
        if (itemSystem) {
            const item = itemSystem.getItemById(itemId);
            return item ? item.name : itemId;
        }
        return itemId;
    }

    isImportantInformation(message) {
        const importantKeywords = ['артефакт', 'сокровищ', 'координат', 'секрет', 'тайн', 'легендарн'];
        return importantKeywords.some(keyword => message.toLowerCase().includes(keyword));
    }

    showInformationDialog(message) {
        if (window.game && window.game.showDialog) {
            window.game.showDialog({
                title: "Важная информация",
                message: message,
                type: "information"
            });
        } else {
            window.game.showNotification("💡 " + message, 'info');
        }
    }

    completePeacefulMovement(targetX, targetY) {
        const oldPosition = {...this.playerTacticalPosition};
        this.playerTacticalPosition = {x: targetX, y: targetY};
        
        console.log(`✅ Мирное перемещение героя ${this.currentHero.name} с [${oldPosition.x}, ${oldPosition.y}] на: [${targetX}, ${targetY}]`);
        
        this.syncHeroWithOtherSystems();
        
        if (this.activeOverlay === 'tactical-map' || this.activeOverlay === 'local-map') {
            this.calculateCSSScale();
            this.drawTacticalMap();
            
            setTimeout(() => {
                const cellKey = `${targetX},${targetY}`;
                const currentCell = this.currentTacticalMap?.cells[cellKey];
                
                if (currentCell) {
                    console.log(`🎯 Автоматически показываем действия для новой клетки [${targetX}, ${targetY}]`);
                    this.showCellActions(currentCell);
                }
                
                if (window.game) {
                    window.game.showNotification(`✅ Перемещение на [${targetX}, ${targetY}]`, 'success');
                }
            }, 300);
        }
        
        this.updateMovementInfo();
    }

    startTacticalBattleForMovement(x, y, cellData) {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) {
            console.error("❌ BattleSystem не доступна");
            return;
        }

        if (!this.currentHero) {
            console.error("❌ Не могу начать бой: герой не выбран");
            return;
        }

        this.pendingMovement = { x: x, y: y };
        
        const specificMonster = this.getMonsterFromCell(cellData);
        
        console.log("🎲 Начинаем бой поверх тактической карты...");
        
        if (specificMonster && cellData.monster_id) {
            console.log(`🎯 Бой с ЗАПРОГРАММИРОВАННЫМ монстром: ${specificMonster.name}`);
            battleSystem.startBattleWithSpecificMonster(this.currentHero, specificMonster, 'movement');
        } else {
            const randomMonster = this.getRandomMonster();
            if (!randomMonster) {
                console.error("❌ Не удалось начать бой: нет случайных монстров");
                if (window.game) {
                    window.game.showNotification("❌ Нет доступных монстров для боя!", 'error');
                }
                return;
            }
            
            console.log(`🎲 Бой со СЛУЧАЙНЫМ монстром: ${randomMonster.name}`);
            battleSystem.startBattleWithMonster(this.currentHero, randomMonster.id, 'movement');
        }
    }

    getRandomMonster() {
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem || !battleSystem.getRandomMonsterForMovement) {
            console.error("❌ BattleSystem не доступна для получения случайного монстра");
            return null;
        }
        
        const randomMonster = battleSystem.getRandomMonsterForMovement();
        
        if (!randomMonster) {
            console.error("❌ Не удалось получить случайного монстра");
            return null;
        }
        
        return randomMonster;
    }

    completeMovementAfterBattle(victory, escape = false) {
        if (!this.pendingMovement) return;

        console.log(`🎲 Завершение движения после боя: победа=${victory}, побег=${escape}`);

        let targetX, targetY;
        
        if (victory) {
            targetX = this.pendingMovement.x;
            targetY = this.pendingMovement.y;
            const oldPosition = {...this.playerTacticalPosition};
            this.playerTacticalPosition = {x: targetX, y: targetY};
            
            console.log(`✅ Успешное перемещение героя ${this.currentHero.name} после боя: [${oldPosition.x}, ${oldPosition.y}] → [${targetX}, ${targetY}]`);
            
            if (window.game) {
                window.game.showNotification(`✅ Успешное перемещение на [${targetX}, ${targetY}]`, 'success');
            }
        } else {
            if (escape) {
                targetX = this.playerTacticalPosition.x;
                targetY = this.playerTacticalPosition.y;
                console.log(`🏃 Побег! Герой ${this.currentHero.name} остался на позиции: [${targetX}, ${targetY}]`);
                
                if (window.game) {
                    window.game.showNotification(`🏃 Побег успешен! Герой остался на своей позиции.`, 'warning');
                }
            } else {
                const startPosition = this.currentTacticalMap.startPosition;
                targetX = startPosition.x;
                targetY = startPosition.y;
                const oldPosition = {...this.playerTacticalPosition};
                this.playerTacticalPosition = {x: targetX, y: targetY};
                
                console.log(`💀 Поражение! Возврат героя ${this.currentHero.name} на стартовую позицию: [${oldPosition.x}, ${oldPosition.y}] → [${targetX}, ${targetY}]`);
                
                if (window.game) {
                    window.game.showNotification(`💀 Поражение! Возврат на стартовую позицию.`, 'error');
                }
            }
        }
        
        this.pendingMovement = null;
        
        if (this.activeOverlay === 'tactical-map' || this.activeOverlay === 'local-map') {
            this.calculateCSSScale();
            this.drawTacticalMap();
            this.updateMovementInfo();
            
            setTimeout(() => {
                const cellKey = `${targetX},${targetY}`;
                const currentCell = this.currentTacticalMap?.cells[cellKey];
                
                if (currentCell) {
                    console.log(`🎯 После боя показываем действия для клетки [${targetX}, ${targetY}]`);
                    this.showCellActions(currentCell);
                }
            }, 500);
        }
        
        if (this.currentHero && window.game && window.game.systems && window.game.systems.hero) {
            window.game.systems.hero.currentHero = this.currentHero;
            window.game.systems.hero.calculateHeroStats(this.currentHero);
        }
    }
    
    getMonsterFromCell(cellData) {
        if (!cellData || cellData.type !== 'monster' || !cellData.monster_id) {
            return null;
        }
        
        const battleSystem = window.game?.systems?.battle;
        if (!battleSystem) return null;
        
        return battleSystem.getMonsterById(cellData.monster_id);
    }

    // ========== ГЕРОЙ И СИНХРОНИЗАЦИЯ ==========

    syncHeroWithOtherSystems() {
        if (!this.currentHero) return;
        
        if (window.game) {
            window.game.currentHero = this.currentHero;
            
            if (window.game.systems.hero) {
                window.game.systems.hero.currentHero = this.currentHero;
                console.log("✅ Герой синхронизирован с HeroSystem");
            }
            
            if (window.game.systems.equipment) {
                window.game.systems.equipment.setCurrentHero(this.currentHero);
            }
            
            if (window.game.systems.battle) {
                window.game.systems.battle.currentHero = this.currentHero;
            }

            if (window.game.systems.shop) {
                window.game.systems.shop.currentHero = this.currentHero;
            }
        }
    }

    setCurrentHero(hero) {
        this.currentHero = hero;
        console.log(`🎯 Установлен герой для карты: ${hero?.name || 'нет'}`);
        
        if (hero) {
            this.updatePlayerPositionsFromHero(hero);
            this.syncHeroWithOtherSystems();
        }
    }

    updatePlayerPositionsFromHero(hero) {
        if (hero.mapPosition) {
            this.playerGlobalPosition = hero.mapPosition.global || this.playerGlobalPosition;
            this.playerLocalPosition = hero.mapPosition.local || this.playerLocalPosition;
            this.playerTacticalPosition = hero.mapPosition.tactical || this.playerTacticalPosition;
        }
        
        console.log(`📍 Позиции обновлены для героя: ${hero.name}`);
    }

    updateHeroInterface() {
        if (window.game?.systems?.hero) {
            this.syncHeroWithOtherSystems();
            
            setTimeout(() => {
                if (window.game.systems.hero.currentHero) {
                    window.game.systems.hero.updateHeroDisplay();
                } else {
                    console.warn("⚠️ Не удалось обновить интерфейс: герой не установлен в HeroSystem");
                }
            }, 10);
        } else {
            console.warn("⚠️ HeroSystem не доступен для обновления интерфейс");
        }
    }

    // ========== CANVAS И ОТРИСОВКА ==========

    initCanvas() {
        const container = document.querySelector('.tactical-map-visual');
        if (!container) {
            console.log("❌ Контейнер для карты не найден");
            return;
        }

        container.innerHTML = '';

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'tacticalMapCanvas';
        
        this.canvas.width = 1024;
        this.canvas.height = 1024;
        
        this.canvas.style.width = '1024px';
        this.canvas.style.height = '1024px';
        this.canvas.style.position = 'relative';
        this.canvas.style.background = '#1a1a2e';
        this.canvas.style.border = '2px solid #00ffff';
        this.canvas.style.cursor = 'pointer';
        container.appendChild(this.canvas);

        this.ctx = this.canvas.getContext('2d');
        
        this.zoomLevel = 1.0;
        this.mapOffset = { x: 0, y: 0 };
        
        this.calculateCSSScale();
        this.setupCanvasEventListeners();
        
        this.canvasInitialized = true;
        console.log("✅ Canvas инициализирован с CSS масштабированием");
        this.drawTacticalMap();
    }

    calculateCSSScale() {
        const container = document.querySelector('.tactical-map-visual');
        if (!container || !this.canvas) return;

        const rect = container.getBoundingClientRect();
        
        const scaleX = rect.width / 1024;
        const scaleY = rect.height / 1024;
        
        const scale = Math.min(scaleX, scaleY) * 0.85;
        
        console.log(`📏 CSS Scale: ${scale.toFixed(3)} (container: ${rect.width}x${rect.height})`);
        
        this.canvas.style.transform = `scale(${scale})`;
        this.canvas.style.transformOrigin = 'center center';
        
        this.zoomLevel = scale;
    }
    
    setupCanvasEventListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
        this.canvas.addEventListener('mouseleave', () => this.hideTooltip());

        window.addEventListener('resize', () => {
            setTimeout(() => {
                if (this.canvasInitialized) {
                    this.handleResize();
                }
            }, 100);
        });
    }

    zoomIn() {
        if (this.zoomLevel < this.maxZoom) {
            this.zoomLevel += this.zoomStep;
            this.applyZoom();
        }
    }

    zoomOut() {
        if (this.zoomLevel > this.minZoom) {
            this.zoomLevel -= this.zoomStep;
            this.applyZoom();
        }
    }

    resetZoom() {
        this.zoomLevel = 1.0;
        this.applyZoom();
    }

    applyZoom() {
        if (!this.currentTacticalMap || !this.canvasInitialized) return;
        
        const zoomElement = document.getElementById('currentZoom');
        if (zoomElement) {
            zoomElement.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
        
        this.canvas.style.transform = `scale(${this.zoomLevel})`;
        this.drawTacticalMap();
        
        console.log(`🔍 Масштаб изменен: ${Math.round(this.zoomLevel * 100)}%`);
    }

    drawTacticalMap() {
        if (!this.ctx || !this.currentTacticalMap) {
            console.log("❌ Canvas context или карта не доступна");
            return;
        }

        const canvas = this.canvas;
        this.ctx.clearRect(0, 0, canvas.width, canvas.height);

        this.drawBackground();
    }

    drawBackground() {
        const map = this.currentTacticalMap;
        
        if (!map.image) {
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.drawHexes();
            if (this.showGrid) {
                this.drawHexGrid();
            }
            return;
        }

        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.drawImage(
                img, 
                0, 
                0, 
                this.canvas.width, 
                this.canvas.height
            );
            
            this.drawHexes();
            
            if (this.showGrid) {
                this.drawHexGrid();
            }
            
            console.log("✅ Фон отрисован");
        };
        
        img.onerror = () => {
            console.error("❌ Ошибка загрузки фона карты");
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.drawHexes();
            if (this.showGrid) {
                this.drawHexGrid();
            }
        };
        
        img.src = map.image;
    }

    handleResize() {
        if (!this.canvasInitialized) return;
        
        console.log("🔄 Адаптация к изменению размеров окна");
        
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this.calculateCSSScale();
            this.drawTacticalMap();
            this.updateMovementInfo();
        }, 100);
    }

    drawHexGrid() {
        const cells = Object.values(this.currentTacticalMap.cells);
        const hexSize = this.currentTacticalMap.cellSize || 40;
        
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.6)';
        this.ctx.lineWidth = 1;
        
        cells.forEach(cell => {
            if (cell.visible) {
                const centerX = cell.x || cell.originalX || 0;
                const centerY = cell.y || cell.originalY || 0;
                
                if (!centerX || !centerY) return;
                
                this.ctx.beginPath();
                for (let i = 0; i < 6; i++) {
                    const angle = Math.PI / 3 * i + Math.PI / 6;
                    const x = centerX + hexSize * Math.cos(angle);
                    const y = centerY + hexSize * Math.sin(angle);
                    
                    if (i === 0) this.ctx.moveTo(x, y);
                    else this.ctx.lineTo(x, y);
                }
                this.ctx.closePath();
                this.ctx.stroke();
            }
        });
        this.ctx.restore();
    }

    drawHexes() {
        const cells = Object.values(this.currentTacticalMap.cells);
        
        cells.forEach(cell => {
            if (cell.visible) {
                this.drawSingleHex(cell);
                this.drawHexContent(cell);
            }
        });
    }

    drawSingleHex(cell) {
        const hexSize = this.currentTacticalMap.cellSize || 40;
        
        const centerX = cell.x || cell.originalX || 0;
        const centerY = cell.y || cell.originalY || 0;

        if (!centerX || !centerY) return;

        this.ctx.save();
        this.ctx.beginPath();
        
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = centerX + hexSize * Math.cos(angle);
            const y = centerY + hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();

        if (this.showGrid) {
            this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.3)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }

    drawHexContent(cell) {
        const centerX = cell.x || cell.originalX || 0;
        const centerY = cell.y || cell.originalY || 0;
        
        if (!centerX || !centerY) return;

        this.ctx.save();
        
        const hexSize = this.currentTacticalMap.cellSize || 40;
        
        if (cell.isHighlighted) {
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i + Math.PI / 6;
                const x = centerX + hexSize * Math.cos(angle);
                const y = centerY + hexSize * Math.sin(angle);
                
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            
            if (this.isTransitionCell(cell)) {
                this.ctx.fillStyle = cell.highlightColor || 'rgba(255, 215, 0, 0.4)';
            } else {
                this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            }
            this.ctx.fill();
        }
        
        if (cell.isSelected) {
            this.ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = Math.PI / 3 * i + Math.PI / 6;
                const x = centerX + hexSize * Math.cos(angle);
                const y = centerY + hexSize * Math.sin(angle);
                
                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }
            this.ctx.closePath();
            
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 15;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }
        
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        let fontSize = 16;
        let symbol = '·';
        let color = '#ffffff';

        if (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) {
            symbol = '🎯';
            fontSize = 20;
        } 
        else if (cell.hasLoot) {
            const lootLevel = this.currentTacticalMap?.jsonData?.meta?.lootLevel || 1;
            symbol = this.getLootSymbol(lootLevel);
            color = this.getLootColor(lootLevel);
            fontSize = 18;
        }
        else {
            symbol = this.objectSymbols[cell.type] || '·';
            color = this.getCellColor(cell.type);
        }

        fontSize = Math.max(8, Math.min(30, fontSize));
        
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(symbol, centerX, centerY);
        
        if (cell.explored) {
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
            this.ctx.fillText('✓', centerX + hexSize * 0.6, centerY - hexSize * 0.6);
        }
        
        this.ctx.restore();
    }

    getCellColor(cellType) {
        const colors = {
            'monster': '#ef4444',
            'chest': '#f59e0b',
            'npc': '#3b82f6',
            'exit': '#8b5cf6',
            'tavern': '#fbbf24',
            'shop': '#fbbf24',
            'obstacle': '#6b7280',
            'water': '#0ea5e9',
            'campfire': '#dc2626',
            'merchant': '#3b82f6',
            'village': '#fbbf24',
            'castle': '#fbbf24',
            'tree': '#6b7280',
            'cave': '#8b5cf6',
            'lava_crack': '#dc2626',
            'graveyard_cross': '#d6d3d1',
            'bandit_camp': '#ef4444',
            'orc_camp': '#ef4444',
            'weapon': '#f59e0b',
            'armor': '#f59e0b',
            'portal': '#8b5cf6',
            'magic_crystal': '#f59e0b',
            'temple': '#fbbf24',
            'bridge': '#0ea5e9',
            'mountain': '#6b7280'
        };
        
        return colors[cellType] || '#ffffff';
    }

    getLootSymbol(lootLevel) {
        const symbols = ['💎', '⭐', '🔮', '👑', '🏆'];
        return symbols[lootLevel - 1] || symbols[0];
    }

    getLootColor(lootLevel) {
        const colors = ['#f59e0b', '#eab308', '#a855f7', '#ec4899', '#ef4444'];
        return colors[lootLevel - 1] || colors[0];
    }

    handleCanvasHover(e) {
        if (!this.currentTacticalMap) return;

        const canvasRect = this.canvas.getBoundingClientRect();
        
        const computedStyle = getComputedStyle(this.canvas);
        const transform = computedStyle.transform;
        let scale = 1;
        
        if (transform && transform !== 'none') {
            const matrix = new DOMMatrix(transform);
            scale = matrix.a;
        }
        
        const logicalX = (e.clientX - canvasRect.left) / scale;
        const logicalY = (e.clientY - canvasRect.top) / scale;

        const hex = this.getHexAtLogicalPosition(logicalX, logicalY);
        
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }

        const prevHex = this.currentTooltip;
        
        if (!hex || (prevHex && hex && (prevHex.col !== hex.col || prevHex.row !== hex.row))) {
            this.hideTooltip();
        }

        if (hex && (!prevHex || prevHex.col !== hex.col || prevHex.row !== hex.row)) {
            this.tooltipTimeout = setTimeout(() => {
                this.showTooltipForHex(hex, e.clientX, e.clientY);
            }, 200);
        }
    }

    showTooltipForHex(hex, mouseX, mouseY) {
        const tooltipText = this.getTooltipTextForHex(hex);
        if (!tooltipText) {
            this.hideTooltip();
            return;
        }

        if (!this.tooltipElement) {
            this.createTooltipElement();
        }

        this.removeHighlight();
        
        this.currentTooltip = hex;
        hex.isHighlighted = true;
        
        this.tooltipElement.textContent = tooltipText;
        this.tooltipElement.style.display = 'block';

        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = mouseX + 15;
        let top = mouseY + 15;

        if (left + tooltipRect.width > viewportWidth - 10) {
            left = mouseX - tooltipRect.width - 15;
        }
        if (top + tooltipRect.height > viewportHeight - 10) {
            top = mouseY - tooltipRect.height - 15;
        }

        this.tooltipElement.style.left = left + 'px';
        this.tooltipElement.style.top = top + 'px';

        this.drawTacticalMap();
    }
    
    getTooltipTextForHex(hex) {
        if (!hex.visible) return null;

        if (hex.tooltip) {
            return hex.tooltip;
        }

        if (hex.type === 'village' && hex.tacticalMap) {
            return `🍻 Таверна "${hex.tooltip || 'Уютное заведение'}"\n(Кликните для отдыха и пополнения фляги)`;
        }

        if (hex.type === 'water') {
            const isAccessible = this.isPlayerAdjacentToWater(hex);
            const accessibilityInfo = isAccessible ? "\n✅ Кликните для использования" : "\n❌ Подойдите ближе";
            return `💧 Источник воды\n(Восстановление здоровья и пополнение фляги)${accessibilityInfo}`;
        }

        if (hex.type === 'merchant') {
            const itemCount = hex.shopItems ? hex.shopItems.length : 0;
            const shopName = hex.shopName || "Магазин";
            const merchantName = hex.merchantName || "Торговец";
            return `🛒 ${shopName}\nТорговец: ${merchantName}\nТоваров: ${itemCount}\n(Кликните для торговли)`;
        }

        if (this.isTransitionCell(hex)) {
            const isAccessible = this.isPlayerAdjacentToTransition(hex);
            const accessibilityInfo = isAccessible ? "\n✅ Доступно для входа" : "\n❌ Подойдите ближе";
            
            if (hex.tacticalMap) {
                const locationName = this.getLocationNameFromPath(hex.tacticalMap);
                return `🚪 Вход в ${locationName}\n(Кликните для входа)${accessibilityInfo}`;
            }
            if (hex.localMap) {
                const locationName = this.getLocationNameFromPath(hex.localMap);
                return `🌍 Переход в ${locationName}\n(Кликните для перехода)${accessibilityInfo}`;
            }
            if (hex.globalMap) {
                const locationName = this.getLocationNameFromPath(hex.globalMap);
                return `🗺️ Переход в ${locationName}\n(Кликните для перехода)${accessibilityInfo}`;
            }
            if (hex.type === 'exit') {
                return `🚪 Выход\n(Кликните для возврата)${accessibilityInfo}`;
            }
        }

        if (hex.hasLoot) {
            const lootLevel = this.currentTacticalMap?.jsonData?.meta?.lootLevel || 1;
            const levelNames = ['Обычный', 'Хороший', 'Редкий', 'Эпический', 'Легендарный'];
            return `💎 Возможная награда\nУровень: ${levelNames[lootLevel - 1] || 'Обычный'}\n(Кликните для исследования)`;
        }

        if (hex.explored) {
            return `✓ Исследованная клетка\n(Действия уже выполнены)`;
        }

        // Для обычных клеток показываем информацию о биоме
        if (!this.isSpecialCell(hex) && !this.isTransitionCell(hex)) {
            return `🌿 Обычная местность\n(Кликните для взаимодействия)`;
        }

        const defaultTooltips = {
            'player_start': '⭐ Стартовая позиция',
            'monster': '👹 Враждебная территория\n(Возможен бой)',
            'chest': '📦 Тайный сундук\n(Может содержать сокровища)',
            'npc': '🧙 Таинственный незнакомец\n(Возможно, даст задание)',
            'exit': '🚪 Выход с карты\n(Вернуться на предыдущую карту)',
            'obstacle': '🪨 Препятствие\n(Непроходимо)',
            'tree': '🌲 Дерево\n(Непроходимо)',
            'elegant_tree': '🎄 Изящное дерево\n(Непроходимо)',
            'cave': '🕳️ Пещера\n(Возможен вход)',
            'lava_crack': '🌋 Лавовый разлом\n(Опасно)',
            'graveyard_cross': '⚰️ Кладбищенский крест\n(Место силы)',
            'bandit_camp': '⚔️ Лагерь разбойников\n(Опасно)',
            'orc_camp': '👹 Лагерь орков\n(Очень опасно)',
            'black_monolith': '⬛ Черный монолит\n(Загадочный артефакт)',
            'weapon': '⚔️ Оружие\n(Можно найти)',
            'armor': '🛡️ Доспех\n(Можно найти)',
            'campfire': '🔥 Костер\n(Можно отдохнуть)',
            'cart': '🛒 Телега\n(Возможна торговля)',
            'traveler': '🚶 Путник\n(Может дать информацию)',
            'portal': '🌀 Магический портал\n(Телепортация)',
            'ancient_rune': '🔰 Древняя руна\n(Магический символ)',
            'magic_crystal': '💎 Магический кристалл\n(Источник магии)',
            'temple': '⛪ Храм\n(Священное место)',
            'bridge': '🌉 Мост\n(Переправа через препятствие)',
            'mountain': '⛰️ Гора\n(Непроходимо)'
        };

        return defaultTooltips[hex.type] || 'Неизвестная местность';
    }

    createTooltipElement() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.id = 'mapTooltip';
        this.tooltipElement.style.cssText = `
            position: fixed;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid #00ffff;
            font-size: 12px;
            font-family: Arial, sans-serif;
            z-index: 10000;
            pointer-events: none;
            white-space: pre-line;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            display: none;
            max-width: 250px;
            line-height: 1.4;
        `;
        document.body.appendChild(this.tooltipElement);
    }

    hideTooltip() {
        if (this.tooltipElement) {
            this.tooltipElement.style.display = 'none';
        }
        
        this.removeHighlight();
        
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }
    }
    
    highlightHex(hex) {
        if (!hex || hex.isHighlighted) return;
        
        hex.isHighlighted = true;
        this.drawSingleHexWithHighlight(hex);
    }
    
    removeHighlight() {
        let needsRedraw = false;
        
        if (this.currentTacticalMap) {
            Object.values(this.currentTacticalMap.cells).forEach(cell => {
                if (cell.isHighlighted) {
                    cell.isHighlighted = false;
                    needsRedraw = true;
                }
            });
        }
        
        this.currentTooltip = null;
        
        if (needsRedraw && this.canvasInitialized) {
            this.drawTacticalMap();
        }
    }

    drawSingleHexWithHighlight(hex) {
        if (!this.ctx || !hex) return;
        
        const hexSize = this.currentTacticalMap.cellSize || 40;
        const centerX = hex.x || hex.originalX || 0;
        const centerY = hex.y || hex.originalY || 0;
        
        if (!centerX || !centerY) return;

        this.ctx.save();
        this.ctx.beginPath();
        
        for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 3 * i + Math.PI / 6;
            const x = centerX + hexSize * Math.cos(angle);
            const y = centerY + hexSize * Math.sin(angle);
            
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        this.ctx.fill();
        
        this.ctx.restore();
        
        this.drawHexContent(hex);
    }

    // ========== ОТОБРАЖЕНИЕ ОВЕРЛЕЯ КАРТЫ ==========

    showMapOverlay(overlayType, container) {
        console.log(`🗺️ MapSystem: Показываем ${overlayType}`);
        
        let targetMap = null;
        let displayName = '';
        
        if (overlayType === 'local-map') {
            targetMap = this.currentLocalMap;
            displayName = '📍 Локальная карта';
            
            if (!targetMap && this.localMaps.length > 0) {
                targetMap = this.localMaps[0];
                this.currentLocalMap = targetMap;
                console.log(`🔄 Автоматически установлена локальная карта: ${targetMap.name}`);
            }
        } else {
            targetMap = this.currentTacticalMap;
            displayName = '🎲 Тактическая карта';
        }
        
        if (!targetMap) {
            console.error(`❌ ${overlayType} карта не загружена`);
            container.innerHTML = `
                <div class="overlay-content tactical-map-overlay">
                    <div class="tactical-map-header">
                        <h4>${displayName}</h4>
                        <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                    </div>
                    <div class="map-error" style="padding: 20px; text-align: center;">
                        Карта не загружена. Возможно, нужно создать тестовые карты.
                        <br><br>
                        <button class="btn-control" onclick="game.systems.map.createFallbackMaps(); game.systems.map.showOverlay('${overlayType}')">
                            🛠️ Создать тестовые карты
                        </button>
                    </div>
                </div>
            `;
            container.style.display = 'block';
            return;
        }
        
        console.log(`✅ Показываем карту: ${targetMap.name} (тип: ${overlayType}, клеток: ${Object.keys(targetMap.cells).length})`);
        
        this.currentTacticalMap = targetMap;
        
        if (overlayType === 'local-map') {
            this.currentMapType = 'local';
            this.playerTacticalPosition = {...this.playerLocalPosition};
            this.currentLocalMap = targetMap;
        } else {
            this.currentMapType = 'tactical';
        }
        
        container.innerHTML = `
            <div class="overlay-content tactical-map-overlay">
                <div class="tactical-map-header">
                    <h4>${targetMap.name}</h4>
                    <div class="map-type-badge">${overlayType === 'local-map' ? '📍 Локальная' : '🎲 Тактическая'}</div>
                    
                    <div class="zoom-controls">
                        <button class="btn-control" onclick="game.systems.map.zoomOut()" title="Уменьшить">
                            🔍−
                        </button>
                        <span class="zoom-info">${Math.round(this.zoomLevel * 100)}%</span>
                        <button class="btn-control" onclick="game.systems.map.zoomIn()" title="Увеличить">
                            🔍+
                        </button>
                        <button class="btn-control" onclick="game.systems.map.resetZoom()" title="Сбросить масштаб">
                            🔄
                        </button>
                        <button class="btn-control" onclick="game.systems.map.toggleFullscreen()" title="Полноэкранный режим">
                            📱
                        </button>
                    </div>
                    
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
                
                <div class="tactical-map-controls">
                    <button class="btn-control" onclick="game.systems.map.toggleGrid()">
                        ${this.showGrid ? '🔲 Скрыть сетку' : '🔳 Показать сетку'}
                    </button>
                    <button class="btn-control" onclick="game.systems.map.debugInfo()">
                        🐛 Отладка
                    </button>
                    <button class="btn-control" onclick="game.systems.map.testPeacefulMovement()">
                        🧪 Тест перемещения
                    </button>
                    <div class="position-info">
                        Позиция: [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]
                        ${overlayType === 'local-map' ? ' (локальная)' : ' (тактическая)'}
                    </div>
                </div>
                
                <div class="tactical-map-content-with-actions">
                    <div class="map-main-area">
                        <div class="tactical-map-visual">
                            <!-- Canvas будет добавлен автоматически -->
                        </div>
                    </div>
                    
                    <div class="cell-actions-panel">
                        <h4 class="actions-panel-title">⚡ Действия на клетке</h4>
                        <div class="cell-actions-container" id="cellActionsContainer">
                            <div class="actions-placeholder">
                                Выберите клетку для просмотра доступных действий
                            </div>
                        </div>
                        
                        <div class="cell-info-footer">
                            <div class="action-hint">
                                ℹ️ Каждая клетка позволяет совершить одно действие
                            </div>
                            <div class="resource-info">
                                <h5>📦 Ресурсы героя:</h5>
                                <div class="resource-list" id="heroResourcesList">
                                    <!-- Ресурсы будут загружены динамически -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="tactical-map-info">
                    <div class="map-description">
                        ${targetMap.description || 'Описание отсутствует'}
                    </div>
                    <div class="map-stats">
                        <span>Клеток: ${Object.keys(targetMap.cells).length}</span>
                        <span>Размер: ${targetMap.width}x${targetMap.height}</span>
                        <span>Масштаб: <span id="currentZoom">${Math.round(this.zoomLevel * 100)}%</span></span>
                        <span id="availableMoves">Доступных ходов: 0</span>
                    </div>
                </div>
            </div>
        `;
        
        container.style.display = 'block';
        
        setTimeout(() => {
            console.log("🎨 Инициализируем Canvas для карты...");
            
            if (!this.currentTacticalMap) {
                console.error("❌ currentTacticalMap не установлена для Canvas");
                return;
            }
            
            try {
                this.initCanvas();
                this.updateMovementInfo();
                this.updateHeroResourcesUI();
                
                const cellKey = `${this.playerTacticalPosition.x},${this.playerTacticalPosition.y}`;
                const currentCell = this.currentTacticalMap.cells[cellKey];
                
                if (currentCell) {
                    console.log(`📍 Автоматически показываем описание текущей клетки [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}]`);
                    setTimeout(() => {
                        this.showCellActions(currentCell);
                    }, 100);
                }
                
                console.log("✅ Canvas успешно инициализирован");
                
            } catch (error) {
                console.error("❌ Ошибка инициализации Canvas:", error);
            }
        }, 50);
    }
    
    showOverlay(overlayType) {
        console.log(`🎯 MapSystem: Показываем оверлей: ${overlayType}`);
        
        const container = document.getElementById('overlay-container');
        if (!container) {
            console.error("❌ Контейнер оверлея не найден");
            return;
        }

        this.activeOverlay = overlayType;

        this.hideTooltip();
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        switch(overlayType) {
            case 'tactical-map':
            case 'local-map':
                this.showMapOverlay(overlayType, container);
                break;

            case 'global-map':
                container.innerHTML = `
                    <div class="overlay-content map-overlay">
                        <div class="overlay-header">
                            <h3>🗺️ Глобальная карта</h3>
                            <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                        </div>
                        <div class="overlay-body">
                            ${this.renderGlobalMap()}
                        </div>
                    </div>
                `;
                container.style.display = 'block';
                break;

            default:
                console.warn(`⚠️ Неизвестный тип оверлея в MapSystem: ${overlayType}`);
                container.innerHTML = `<div class="map-error">Неизвестный тип окна: ${overlayType}</div>`;
                container.style.display = 'block';
        }
    }

    hideOverlay() {
        console.log("👋 MapSystem: Скрываем оверлей");
        
        const container = document.getElementById('overlay-container');
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
            this.activeOverlay = null;
            this.hoveredHex = null;
            this.lastHoveredHex = null;
            this.hideTooltip();
            
            if (this.animationFrame) {
                cancelAnimationFrame(this.animationFrame);
                this.animationFrame = null;
            }
            
            console.log("✅ Оверлей скрыт");
        }
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.drawTacticalMap();
    }

    showTacticalMapEditor() {
        if (!this.currentHero) {
            console.error("❌ Герой не выбран для тактической карты!");
            if (window.game) {
                window.game.showNotification("❌ Сначала выберите героя!", 'error');
                setTimeout(() => {
                    window.game.showHeroSelection();
                }, 1000);
            }
            return;
        }
        
        this.showOverlay('tactical-map');
    }

    forceRedraw() {
        if (this.canvasInitialized) {
            this.calculateCSSScale();
            this.drawTacticalMap();
        }
    }

    updateMovementInfo() {
        const availableMoves = this.getAvailableMoves();
        
        const movesElement = document.getElementById('availableMoves');
        if (movesElement) {
            movesElement.textContent = `Доступных ходов: ${availableMoves.length}`;
        }
    }

    getAvailableMoves() {
        if (!this.currentTacticalMap) return [];
        
        const currentRow = this.playerTacticalPosition.y;
        const currentCol = this.playerTacticalPosition.x;
        const neighbors = this.getHexNeighbors(currentRow, currentCol);
        
        console.log(`📍 Текущая позиция: [${currentCol}, ${currentRow}]`);
        console.log(`🎯 Доступные ходы:`, neighbors.map(n => `[${n.col}, ${n.row}]`));
        
        return neighbors;
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========

    createActionsContainerFallback() {
        console.log("🛠️ Создаем резервный контейнер для действий");
        
        const mapContent = document.querySelector('.tactical-map-content-with-actions');
        if (!mapContent) {
            console.error("❌ Основной контейнер карты не найден");
            return;
        }
        
        let actionsPanel = document.querySelector('.cell-actions-panel');
        if (!actionsPanel) {
            actionsPanel = document.createElement('div');
            actionsPanel.className = 'cell-actions-panel';
            actionsPanel.style.cssText = `
                flex: 1;
                min-width: 320px;
                max-width: 350px;
                background: rgba(30, 41, 59, 0.95);
                border: 2px solid #475569;
                border-radius: 10px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                overflow: visible !important;
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
                margin-left: 20px;
            `;
            mapContent.appendChild(actionsPanel);
        }
        
        const actionsContainer = document.createElement('div');
        actionsContainer.id = 'cellActionsContainer';
        actionsContainer.className = 'cell-actions-container';
        actionsContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            margin-bottom: 20px;
            padding-right: 5px;
            display: block;
            visibility: visible;
            opacity: 1;
        `;
        
        actionsPanel.innerHTML = '';
        actionsPanel.appendChild(actionsContainer);
        
        console.log("✅ Резервный контейнер создан");
    }

    debugInfo() {
        console.group("🗺️ MapSystem Debug Info");
        console.log("Глобальная позиция:", this.playerGlobalPosition);
        console.log("Локальная позиция:", this.playerLocalPosition);
        console.log("Тактическая позиция:", this.playerTacticalPosition);
        console.log("Текущая глобальная карта:", this.currentGlobalMap?.name);
        console.log("Текущая локальная карта:", this.currentLocalMap?.name);
        console.log("Текущая тактическая карта:", this.currentTacticalMap?.name);
        console.log("Тип текущей карты:", this.currentMapType);
        console.log("Глубина стека карт:", this.mapStack.length);
        console.log("Загружено JSON карт:", this.loadedJSONMaps.size);
        console.log("Canvas инициализирован:", this.canvasInitialized);
        console.log("Текущий герой:", this.currentHero?.name || 'нет');
        console.log("Масштаб:", `${Math.round(this.zoomLevel * 100)}%`);
        console.log("Смещение карты:", this.mapOffset);
        
        const availableMoves = this.getAvailableMoves();
        console.log("Доступные ходы:", availableMoves.length);
        
        console.log("BiomeSystem состояние:");
        this.biomeSystem.debugInfo();
        
        console.groupEnd();
    }

    testPeacefulMovement() {
        if (!this.currentTacticalMap) {
            console.error("❌ Нет текущей карты");
            return;
        }
        
        console.log("🧪 Тестирование мирное перемещение...");
        
        const availableMoves = this.getAvailableMoves();
        console.log("Доступные ходы:", availableMoves);
        
        if (availableMoves.length > 0) {
            const targetMove = availableMoves[0];
            console.log(`Пытаемся переместиться на: [${targetMove.col}, ${targetMove.row}]`);
            
            const cellData = this.currentTacticalMap.cells[`${targetMove.col},${targetMove.row}`];
            if (cellData) {
                this.handlePeacefulMovement(targetMove.col, targetMove.row, cellData);
            } else {
                console.error("❌ Клетка не найдена");
            }
        } else {
            console.log("❌ Нет доступных ходов для тестирования");
        }
    }

    updateMapInterface() {
        const header = document.querySelector('.tactical-map-header h4');
        const mapTypeBadge = document.querySelector('.map-type-badge');
        const positionInfo = document.querySelector('.position-info');
        const description = document.querySelector('.map-description');
        const stats = document.querySelector('.map-stats');
        
        if (header && this.currentTacticalMap) {
            const lootLevel = this.currentTacticalMap.jsonData?.meta?.lootLevel;
            const lootLevelText = lootLevel ? ` [Уровень лута: ${lootLevel}]` : '';
            header.textContent = this.currentTacticalMap.name + lootLevelText;
        }
        
        if (mapTypeBadge) {
            mapTypeBadge.textContent = this.currentMapType === 'local' ? '📍 Локальная' : '🎲 Тактическая';
        }
        
        if (positionInfo) {
            positionInfo.textContent = `Позиция: [${this.playerTacticalPosition.x}, ${this.playerTacticalPosition.y}] ${this.currentMapType === 'local' ? ' (локальная)' : ' (тактическая)'}`;
        }
        
        if (description && this.currentTacticalMap) {
            description.textContent = this.currentTacticalMap.description || 'Описание отсутствует';
        }
        
        if (stats && this.currentTacticalMap) {
            const cellsCount = Object.keys(this.currentTacticalMap.cells).length;
            stats.innerHTML = `
                <span>Клеток: ${cellsCount}</span>
                <span>Размер: ${this.currentTacticalMap.width}x${this.currentTacticalMap.height}</span>
                <span>Масштаб: <span id="currentZoom">${Math.round(this.zoomLevel * 100)}%</span></span>
                <span id="availableMoves">Доступных ходов: 0</span>
            `;
        }
        
        this.updateMovementInfo();
    }

    getLootItemById(itemId) {
        const itemSystem = window.game?.systems?.equipment;
        if (!itemSystem) {
            console.error("❌ EquipmentSystem не доступна");
            return null;
        }
        
        const item = itemSystem.getItemById(itemId);
        if (!item) {
            console.warn(`⚠️ Предмет с ID ${itemId} не найден в системе`);
            return null;
        }
        
        return item;
    }

    createTestMaps() {
        this.globalMaps = [{
            id: 1,
            name: "Континент Арканиум",
            image: "images/maps/global/arcanium.jpg",
            width: 10,
            height: 10,
            startPosition: {x: 5, y: 5},
            description: "Древний континент, полный загадок и опасностей",
            localMaps: [
                {globalX: 5, globalY: 5, localMapId: 1}
            ]
        }];

        this.localMaps = [{
            id: 1,
            name: "Долина Начала",
            image: "images/maps/local/valley.jpg",
            width: 8,
            height: 8,
            startPosition: {x: 4, y: 4},
            globalPosition: {x: 5, y: 5},
            description: "Мирная долина, где начинаются приключения",
            globalConnections: {
                north: {globalX: 5, globalY: 4},
                south: {globalX: 5, globalY: 6},
                east: {globalX: 6, globalY: 5},
                west: {globalX: 4, globalY: 5}
            },
            tacticalMaps: [
                {localX: 4, localY: 4, tacticalMapId: 1}
            ]
        }];

        this.tacticalMaps = [{
            id: 1,
            name: "Лесная Тропа",
            image: "images/maps/tactical/forest_path.jpg",
            width: 6,
            height: 6,
            startPosition: {x: 3, y: 3},
            localPosition: {x: 4, y: 4},
            description: "Извилистая тропа через древний лес",
            cells: {
                "3,3": {type: "start", passable: true, row: 3, col: 3, visible: true, x: 300, y: 300, explored: false, hasAction: true, isSelected: false},
                "3,2": {type: "exit", passable: true, row: 2, col: 3, visible: true, x: 300, y: 250, explored: false, hasAction: true, isSelected: false},
                "2,3": {type: "monster", passable: false, row: 3, col: 2, visible: true, x: 250, y: 300, explored: false, hasAction: true, isSelected: false},
                "4,3": {type: "chest", passable: true, row: 3, col: 4, visible: true, x: 350, y: 300, explored: false, hasAction: true, isSelected: false},
                "3,4": {type: "npc", passable: true, row: 4, col: 3, visible: true, x: 300, y: 350, explored: false, hasAction: true, isSelected: false}
            }
        }];
    }

    createFallbackMaps() {
        this.globalMaps = [{
            id: 1,
            name: "Тестовый Мир",
            image: "",
            width: 5,
            height: 5,
            startPosition: {x: 2, y: 2},
            description: "Тестовый мир для разработки"
        }];

        this.localMaps = [{
            id: 1,
            name: "Тестовая Зона",
            image: "",
            width: 4,
            height: 4,
            startPosition: {x: 2, y: 2},
            globalPosition: {x: 2, y: 2}
        }];

        this.tacticalMaps = [{
            id: 1,
            name: "Тестовая Комната",
            image: "",
            width: 3,
            height: 3,
            startPosition: {x: 1, y: 1},
            localPosition: {x: 2, y: 2},
            cells: {
                "1,1": {type: "start", passable: true, row: 1, col: 1, visible: true, x: 100, y: 100, explored: false, hasAction: true, isSelected: false}
            }
        }];
    }

    toggleFullscreen() {
        const canvas = this.canvas;
        if (!canvas) return;

        if (!document.fullscreenElement) {
            if (canvas.requestFullscreen) {
                canvas.requestFullscreen();
            } else if (canvas.webkitRequestFullscreen) {
                canvas.webkitRequestFullscreen();
            } else if (canvas.msRequestFullscreen) {
                canvas.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    showNotification(message, type = 'info') {
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

window.MapSystem = MapSystem;
console.log("📦 MapSystem полностью переписан с интеграцией BiomeSystem");
