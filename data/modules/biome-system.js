// biome-system.js
class BiomeSystem {
    constructor() {
        this.biomes = new Map();      // id -> biome
        this.oddities = new Map();    // id -> oddity
        this.events = new Map();      // id -> event
        
        this.cellRegistry = new Map(); // "col,row" -> {biomeId, oddityId, eventId, explored}
        
        this.currentCellData = null;   // Данные текущей клетки
        this.modifierCache = new Map(); // Кэш расчётов
        
        console.log("✅ BiomeSystem инициализирован");
    }
    
    async loadData() {
        console.log("📥 BiomeSystem: Загрузка данных...");
        
        try {
            // Загрузка всех JSON файлов
            const [biomesData, odditiesData, eventsData] = await Promise.all([
                fetch('data/biomes.json').then(r => r.json()),
                fetch('data/oddities.json').then(r => r.json()),
                fetch('data/events.json').then(r => r.json())
            ]);
            
            // Заполняем карты
            biomesData.biomes?.forEach(biome => {
                this.biomes.set(biome.id, biome);
            });
            
            odditiesData.oddities?.forEach(oddity => {
                this.oddities.set(oddity.id, oddity);
            });
            
            eventsData.events?.forEach(event => {
                this.events.set(event.id, event);
            });
            
            console.log(`✅ Данные загружены: ${this.biomes.size} биомов, ${this.oddities.size} странностей, ${this.events.size} событий`);
            
            return true;
        } catch (error) {
            console.error("❌ Ошибка загрузки данных BiomeSystem:", error);
            this.createFallbackData();
            return false;
        }
    }
    
    createFallbackData() {
        // Создаём минимальные тестовые данные
        this.biomes.set(1, {
            id: 1,
            name: "Тестовый биом",
            icon: "🌲",
            danger_level: 5,
            action_base_chances: {
                "search_treasure": 50,
                "search_water": 50,
                "search_berries": 50,
                "search_mushrooms": 50,
                "search_herbs": 50,
                "search_ore": 50,
                "search_stone": 50,
                "set_trap": 50,
                "prepare_ambush": 50,
                "hunt": 50,
                "make_fire": 50,
                "set_bait": 50,
                "guard_caravan": 50,
                "assassination": 50
            },
            encounter_chance: 30,
            monster_ids: [1, 2, 3]
        });
        
        console.log("🔄 Созданы тестовые данные BiomeSystem");
    }
    
    // ========== ОСНОВНЫЕ МЕТОДЫ ==========
    
    /**
     * Получить или сгенерировать данные для клетки
     */
    getCellData(col, row, existingCell = null) {
        const key = `${col},${row}`;
        
        // Если уже есть в регистре и не исследована - возвращаем
        if (this.cellRegistry.has(key)) {
            const data = this.cellRegistry.get(key);
            if (!data.explored || data.explored === false) {
                this.currentCellData = data;
                return data;
            }
        }
        
        // Генерируем новые данные
        const cellData = this.generateCellData(col, row, existingCell);
        this.cellRegistry.set(key, cellData);
        this.currentCellData = cellData;
        
        return cellData;
    }
    
    /**
     * Генерация данных клетки
     */
    generateCellData(col, row, existingCell = null) {
        console.log(`🎲 Генерация данных для клетки [${col}, ${row}]`);
        
        // 1. Выбираем случайный биом (пока случайно, позже по карте)
        const biome = this.getRandomBiome();
        
        // 2. Шанс странности: 30%
        let oddity = null;
        if (Math.random() < 0.3) {
            oddity = this.getRandomOddity();
        }
        
        // 3. Шанс события: 20%
        let event = null;
        if (Math.random() < 0.2) {
            event = this.getRandomEvent();
        }
        
        // 4. Если есть существующая клетка с монстром - добавляем
        let customMonster = null;
        if (existingCell?.type === 'monster' && existingCell.monster_id) {
            customMonster = {
                type: 'scripted',
                id: existingCell.monster_id,
                data: existingCell
            };
        }
        
        const cellData = {
            position: { col, row },
            biome: biome,
            oddity: oddity,
            event: event,
            customMonster: customMonster,
            explored: false,
            lastVisited: Date.now(),
            
            // Кэшированные модификаторы
            calculatedModifiers: this.calculateAllModifiers(biome, oddity, event)
        };
        
        console.log(`✅ Сгенерировано: ${biome.name}${oddity ? ' + ' + oddity.name : ''}${event ? ' + событие' : ''}`);
        
        return cellData;
    }
    
    /**
     * Расчёт всех модификаторов для клетки
     */
    calculateAllModifiers(biome, oddity, event) {
        const modifiers = {
            actionChances: {...biome.action_base_chances},
            encounterChance: biome.encounter_chance || 30,
            dangerLevel: biome.danger_level || 5,
            monsterIds: [...(biome.monster_ids || [])]
        };
        
        // Применяем странность
        if (oddity && oddity.modifiers) {
            // Модификаторы шансов действий
            if (oddity.modifiers.action_chances) {
                Object.keys(oddity.modifiers.action_chances).forEach(action => {
                    if (modifiers.actionChances[action] !== undefined) {
                        modifiers.actionChances[action] += oddity.modifiers.action_chances[action];
                    }
                });
            }
            
            // Глобальные модификаторы
            if (oddity.modifiers.global) {
                if (oddity.modifiers.global.encounter_chance_modifier) {
                    modifiers.encounterChance += oddity.modifiers.global.encounter_chance_modifier;
                }
                if (oddity.modifiers.global.danger_level) {
                    modifiers.dangerLevel += oddity.modifiers.global.danger_level;
                }
            }
            
            // Модификаторы опасности
            if (oddity.modifiers.danger_level) {
                modifiers.dangerLevel += oddity.modifiers.danger_level;
            }
        }
        
        // Применяем событие (пассивные эффекты)
        if (event && event.passive_effects) {
            // Здесь можно добавить пассивные модификаторы событий
        }
        
        // Ограничиваем значения 0-100
        Object.keys(modifiers.actionChances).forEach(action => {
            modifiers.actionChances[action] = Math.max(0, Math.min(100, modifiers.actionChances[action]));
        });
        
        modifiers.encounterChance = Math.max(0, Math.min(100, modifiers.encounterChance));
        modifiers.dangerLevel = Math.max(1, Math.min(10, modifiers.dangerLevel));
        
        return modifiers;
    }
    
    /**
     * Получить итоговый шанс для действия
     */
    getActionChance(action, cellData = null) {
        if (!cellData) cellData = this.currentCellData;
        if (!cellData) return 50;
        
        // Базовый шанс из расчётов
        let chance = cellData.calculatedModifiers.actionChances[action] || 50;
        
        // Влияние уровня опасности (опаснее = сложнее)
        const dangerMod = (cellData.calculatedModifiers.dangerLevel - 5) * 5;
        chance -= dangerMod;
        
        // Ограничиваем
        return Math.max(5, Math.min(95, Math.round(chance)));
    }
    
    /**
     * Проверка встречи с монстром
     */
    checkMonsterEncounter(cellData = null, action = null) {
        if (!cellData) cellData = this.currentCellData;
        if (!cellData) return null;
        
        // Если есть заскриптованный монстр - сразу бой
        if (cellData.customMonster) {
            return {
                type: 'scripted',
                monsterId: cellData.customMonster.id,
                monsterData: cellData.customMonster.data
            };
        }
        
        // Базовый шанс встречи
        let encounterChance = cellData.calculatedModifiers.encounterChance;
        
        // Некоторые действия увеличивают шанс
        const riskyActions = {
            'search_treasure': 20,
            'make_fire': 15,
            'hunt': 10
        };
        
        if (action && riskyActions[action]) {
            encounterChance += riskyActions[action];
        }
        
        // Проверка
        if (Math.random() * 100 < encounterChance) {
            const monsterIds = cellData.calculatedModifiers.monsterIds;
            if (monsterIds.length > 0) {
                const randomId = monsterIds[Math.floor(Math.random() * monsterIds.length)];
                return {
                    type: 'random',
                    monsterId: randomId,
                    biome: cellData.biome.name
                };
            }
        }
        
        return null;
    }
    
    /**
     * Проверка активации события при действии
     */
    checkEventActivation(action, cellData = null) {
        if (!cellData) cellData = this.currentCellData;
        if (!cellData || !cellData.event) return null;
        
        const event = cellData.event;
        
        // Проверяем условия активации
        if (event.activation_condition) {
            // Проверка по действию
            if (event.activation_condition.action === action) {
                const chance = event.activation_condition.chance || 50;
                if (Math.random() * 100 < chance) {
                    return event;
                }
            }
        }
        
        // Пассивные события всегда активны
        if (event.level === 1) {
            return event;
        }
        
        return null;
    }
    
    /**
     * Получить случайный биом
     */
    getRandomBiome() {
        const ids = Array.from(this.biomes.keys());
        const randomId = ids[Math.floor(Math.random() * ids.length)];
        return this.biomes.get(randomId);
    }
    
    /**
     * Получить случайную странность
     */
    getRandomOddity() {
        const ids = Array.from(this.oddities.keys());
        const randomId = ids[Math.floor(Math.random() * ids.length)];
        return this.oddities.get(randomId);
    }
    
    /**
     * Получить случайное событие
     */
    getRandomEvent() {
        const ids = Array.from(this.events.keys());
        const randomId = ids[Math.floor(Math.random() * ids.length)];
        return this.events.get(randomId);
    }
    
    /**
     * Отметить клетку как исследованную
     */
    markCellAsExplored(col, row) {
        const key = `${col},${row}`;
        if (this.cellRegistry.has(key)) {
            const data = this.cellRegistry.get(key);
            data.explored = true;
            data.lastVisited = Date.now();
            this.cellRegistry.set(key, data);
        }
    }
    
    /**
     * Получить визуальное представление клетки
     */
    getCellDisplayData(cellData) {
        if (!cellData) return null;
        
        return {
            name: cellData.biome.name,
            icon: cellData.biome.icon,
            color: cellData.biome.color || '#ffffff',
            dangerLevel: cellData.calculatedModifiers.dangerLevel,
            dangerColor: this.getDangerColor(cellData.calculatedModifiers.dangerLevel),
            
            oddity: cellData.oddity ? {
                name: cellData.oddity.name,
                icon: cellData.oddity.icon,
                description: cellData.oddity.description
            } : null,
            
            event: cellData.event ? {
                name: cellData.event.name,
                icon: cellData.event.icon,
                description: cellData.event.description,
                level: cellData.event.level || 1
            } : null,
            
            customMonster: cellData.customMonster
        };
    }
    
    /**
     * Получить цвет опасности
     */
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
    
    /**
     * Сохранить состояние
     */
    saveState() {
        try {
            const state = {
                cellRegistry: Array.from(this.cellRegistry.entries()),
                timestamp: Date.now()
            };
            localStorage.setItem('biome_system_state', JSON.stringify(state));
            console.log("💾 Состояние BiomeSystem сохранено");
        } catch (error) {
            console.error("❌ Ошибка сохранения BiomeSystem:", error);
        }
    }
    
    /**
     * Загрузить состояние
     */
    loadState() {
        try {
            const saved = localStorage.getItem('biome_system_state');
            if (saved) {
                const state = JSON.parse(saved);
                this.cellRegistry = new Map(state.cellRegistry);
                console.log("💾 Состояние BiomeSystem загружено:", this.cellRegistry.size, "клеток");
                return true;
            }
        } catch (error) {
            console.error("❌ Ошибка загрузки BiomeSystem:", error);
        }
        return false;
    }
    
    /**
     * Очистить состояние
     */
    clearState() {
        this.cellRegistry.clear();
        localStorage.removeItem('biome_system_state');
        console.log("🗑️ Состояние BiomeSystem очищено");
    }
    
    /**
     * Отладочная информация
     */
    debugInfo() {
        console.group("🌍 BiomeSystem Debug");
        console.log("Загружено биомов:", this.biomes.size);
        console.log("Загружено странностей:", this.oddities.size);
        console.log("Загружено событий:", this.events.size);
        console.log("Клеток в регистре:", this.cellRegistry.size);
        
        if (this.currentCellData) {
            console.log("Текущая клетка:", this.currentCellData.position);
            console.log("Биом:", this.currentCellData.biome.name);
            console.log("Странность:", this.currentCellData.oddity?.name || "нет");
            console.log("Событие:", this.currentCellData.event?.name || "нет");
        }
        
        console.groupEnd();
    }
}

// Экспортируем для использования
window.BiomeSystem = BiomeSystem;
console.log("📦 BiomeSystem модуль загружен");
