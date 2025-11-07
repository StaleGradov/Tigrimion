// ========== MODULE: EquipmentSystem ==========
class EquipmentSystem {
    constructor() {
        this.items = [];
        this.itemSets = {};
        this.currentHero = null;
        this.currentCategory = 'all';
        this.currentSubcategory = 'all';
        console.log("✅ EquipmentSystem инициализирован");
    }

   async loadItemData() {
    try {
        console.log("📥 Загружаем данные предметов...");
        
        const response = await fetch('data/items.json');
        if (!response.ok) {
            throw new Error(`Ошибка загрузки items.json: ${response.status}`);
        }
        
        this.items = await response.json();
        this.loadItemSetConfig();
        
        console.log(`✅ Загружено предметов: ${this.items.length}`);
        
        // Отладка
        this.debugItems();
        
        return true;
        
    } catch (error) {
        console.error("❌ Ошибка загрузки данных предметов:", error);
        this.createFallbackItems();
        return true;
    }
}
    // ========== СИСТЕМА СЕТОВ ПРЕДМЕТОВ ==========
    loadItemSetConfig() {
        this.itemSets = {
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
            bonus: { type: "damage_mult", value: 0.1 },
            description: "Комплект из 6 вещей даст +10% к шансу критического удара(наносящего х2 урона)"
        },
     "set_crit3": {
            name: "Лучника Арканиума",
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.15 },
            description: "Комплект из 6 вещей даст +15% к шансу критического удара(наносящего х2 урона)"
        },
     "set_crit4": {
            name: "Элитного стрелка Арканиума",
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.2 },
            description: "Комплект из 6 вещей даст +20% к шансу критического удара(наносящего х2 урона)"
        },
     "set_crit5": {
            name: "Командира лучников Арканиума",
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.25 },
            description: "Комплект из 6 вещей даст +25% к шансу критического удара(наносящего х2 урона)"
        },
     "set_crit6": {
            name: "Легендарного стрелка Арканиума",
            requiredPieces: 6,
            bonus: { type: "damage_mult", value: 0.3 },
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
            bonus: { type: "health_regen_mult", value: 0.5 },
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
            description: "Комплект из 6 вещей даст +40% к регенерации здоровьяу"
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



    
// Добавьте этот метод в класс EquipmentSystem для отладки
debugItems() {
    console.log('=== ДЕБАГ ПРЕДМЕТОВ ===');
    console.log(`Всего предметов: ${this.items.length}`);
    
    const categories = {};
    this.items.forEach(item => {
        if (!categories[item.type]) categories[item.type] = 0;
        categories[item.type]++;
        
        if (item.type === 'weapon') {
            console.log(`Оружие: ${item.name} (${item.weaponType})`);
        } else if (item.material) {
            console.log(`${item.type}: ${item.name} (${item.material})`);
        }
    });
    
    console.log('Распределение по категориям:', categories);
}
    // ========== МАГАЗИН И ФИЛЬТРАЦИЯ ==========
showShop(category = 'all', subcategory = 'all') {
    if (!this.currentHero) return '';

    this.currentCategory = category;
    this.currentSubcategory = subcategory;

    const filteredItems = this.filterItemsByCategory(category, subcategory);
    const subcategories = this.getSubcategoriesForCategory(category);

    console.log('🔍 Подкатегории для отображения:', subcategories);
    console.log('📦 Количество подкатегорий:', Object.keys(subcategories).length);

    const subcategoriesHTML = Object.keys(subcategories).length > 0 ? `
        <div class="shop-subcategories">
            <div class="subcategory-tabs">
                ${Object.entries(subcategories).map(([key, name]) => {
                    const count = this.getSubcategoryItemCount(category, key);
                    console.log(`📋 Подкатегория: ${key} -> ${name}, количество: ${count}`);
                    return `
                        <button class="subcategory-tab ${subcategory === key ? 'active' : ''}" 
                                onclick="game.systems.equipment.showShop('${category}', '${key}')">
                            ${name}
                            <span class="subcategory-count">${count}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        </div>
    ` : '';

    console.log('🔄 HTML подкатегорий:', subcategoriesHTML);

    const html = `
        <div class="overlay-content shop-overlay">
            <div class="overlay-header">
                <h3>🏪 Магазин снаряжения</h3>
                <button class="btn-close" onclick="game.hideOverlay()">✕</button>
            </div>
            
            <div class="merchant-info">
                <div class="merchant-stats">
                    <span class="gold-amount">💰 ${this.currentHero.gold.toFixed(2)}</span>
                    <span class="inventory-space">🎒 ${10 - this.currentHero.inventory.length}/10</span>
                </div>
            </div>
            
            <div class="shop-categories">
                <button class="category-tab ${category === 'all' ? 'active' : ''}" 
                        onclick="game.systems.equipment.showShop('all')">Все предметы</button>
                <button class="category-tab ${category === 'weapon' ? 'active' : ''}" 
                        onclick="game.systems.equipment.showShop('weapon')">⚔️ Оружие</button>
                <button class="category-tab ${category === 'helmet' ? 'active' : ''}" 
                        onclick="game.systems.equipment.showShop('helmet')">⛑️ Шлемы</button>
                <button class="category-tab ${category === 'chest' ? 'active' : ''}" 
                        onclick="game.systems.equipment.showShop('chest')">👕 Броня</button>
                <button class="category-tab ${category === 'gloves' ? 'active' : ''}" 
                        onclick="game.systems.equipment.showShop('gloves')">🧤 Перчатки</button>
                <button class="category-tab ${category === 'legs' ? 'active' : ''}" 
                        onclick="game.systems.equipment.showShop('legs')">👖 Поножи</button>
                <button class="category-tab ${category === 'boots' ? 'active' : ''}" 
                        onclick="game.systems.equipment.showShop('boots')">👢 Ботинки</button>
            </div>
            
            ${subcategoriesHTML}
            
            <div class="shop-content">
                <div class="items-grid">
                    ${filteredItems.map(item => this.renderShopItem(item)).join('')}
                    ${filteredItems.length === 0 ? 
                        '<div class="empty-category">📭 Нет предметов в этой категории</div>' : 
                        ''}
                </div>
            </div>
        </div>
    `;

    console.log('🎯 Финальный HTML магазина:', html);
    return html;
}

 filterItemsByCategory(category, subcategory = 'all') {
    console.log(`🔍 Фильтрация: категория=${category}, подкатегория=${subcategory}`);
    
    // Сначала фильтруем по уровню
    let filteredItems = this.items.filter(item => 
        item.requiredLevel <= (this.currentHero?.level || 1)
    );

    console.log(`📊 После фильтра по уровню: ${filteredItems.length} предметов`);

    // Фильтрация по основной категории
    if (category !== 'all') {
        if (category === 'weapon') {
            filteredItems = filteredItems.filter(item => item.type === 'weapon');
        } else {
            filteredItems = filteredItems.filter(item => item.type === category);
        }
    }

    console.log(`📊 После фильтра по категории ${category}: ${filteredItems.length} предметов`);

    // Фильтрация по подкатегории
    if (subcategory !== 'all') {
        if (category === 'weapon') {
            // Фильтрация оружия по типу
            filteredItems = filteredItems.filter(item => {
                if (subcategory === 'one_handed') return item.weaponType === 'one_handed';
                if (subcategory === 'two_handed') return item.weaponType === 'two_handed';
                if (subcategory === 'shield') return item.weaponType === 'shield';
                return true;
            });
        } else if (['helmet', 'chest', 'gloves', 'legs', 'boots'].includes(category)) {
            // Фильтрация брони по материалу
            filteredItems = filteredItems.filter(item => {
                const itemMaterial = item.material || 'cloth'; // значение по умолчанию
                return itemMaterial === subcategory;
            });
        }
    }

    console.log(`📊 После фильтра по подкатегории ${subcategory}: ${filteredItems.length} предметов`);
    console.log('📦 Отфильтрованные предметы:', filteredItems.map(item => ({id: item.id, name: item.name, type: item.type, material: item.material})));

    return filteredItems;
}

getSubcategoriesForCategory(category) {
    console.log('🎯 Получаем подкатегории для:', category);
    
    const weaponSubcategories = {
        'all': 'Все оружие',
        'one_handed': 'Одноручное',
        'two_handed': 'Двуручное', 
        'shield': 'Щиты'
    };
    
    const armorSubcategories = {
        'all': 'Все материалы',
        'cloth': 'Ткань',
        'leather': 'Кожа',
        'hide': 'Шкура',
        'fur': 'Мех',
        'bone': 'Кость',
        'plate': 'Пластины',
        'chain': 'Кольчуга',
        'plate_mail': 'Латы'
    };

    const subcategoriesMap = {
        'weapon': weaponSubcategories,
        'helmet': armorSubcategories,
        'chest': armorSubcategories,
        'gloves': armorSubcategories,
        'legs': armorSubcategories,
        'boots': armorSubcategories
    };
    
    const result = subcategoriesMap[category] || {};
    console.log('📋 Результат подкатегорий:', result);
    return result;
}
    
    const armorSubcategories = {
        'all': 'Все материалы',
        'cloth': 'Ткань',
        'leather': 'Кожа',
        'hide': 'Шкура',
        'fur': 'Мех',
        'bone': 'Кость',
        'plate': 'Пластины',
        'chain': 'Кольчуга',
        'plate_mail': 'Латы'
    };

    const subcategoriesMap = {
        'weapon': weaponSubcategories,
        'helmet': armorSubcategories,
        'chest': armorSubcategories,
        'gloves': armorSubcategories,
        'legs': armorSubcategories,
        'boots': armorSubcategories
    };
    
    return subcategoriesMap[category] || {};
}

getArmorSubcategories() {
    return {
        'all': 'Все материалы',
        'cloth': 'Ткань',
        'leather': 'Кожа',
        'hide': 'Шкура',
        'fur': 'Мех',
        'bone': 'Кость',
        'plate': 'Пластины',
        'chain': 'Кольчуга',
        'plate_mail': 'Латы'
    };
}
    getArmorSubcategories() {
        return {
            'all': 'Все материалы',
            'cloth': 'Ткань',
            'leather': 'Кожа',
            'hide': 'Шкура',
            'fur': 'Мех',
            'plate': 'Пластины',
            'chain': 'Кольчуга',
            'plate_mail': 'Латы'
        };
    }

getSubcategoryItemCount(category, subcategory) {
    const items = this.filterItemsByCategory(category, subcategory);
    return items.length;
}

    categorizeItems(items) {
        const categories = {
            all: { name: "Все предметы", items: [] },
            weapon: { name: "Оружие", items: [] },
            helmet: { name: "Шлемы", items: [] },
            chest: { name: "Броня", items: [] },
            gloves: { name: "Перчатки", items: [] },
            legs: { name: "Поножи", items: [] },
            boots: { name: "Ботинки", items: [] }
        };
        
        const sortedItems = items.sort((a, b) => a.price - b.price);
        
        sortedItems.forEach(item => {
            categories.all.items.push(item);
            
            if (item.type === 'weapon' && item.weaponType !== 'shield') {
                categories.weapon.items.push(item);
            } else if (item.type in categories) {
                categories[item.type].items.push(item);
            }
        });
        
        return categories;
    }

    renderShopItem(item) {
        const isOwned = this.currentHero.inventory.includes(item.id);
        const canAfford = this.currentHero.gold >= item.price;
        const hasSpace = this.currentHero.inventory.length < 10;
        const canBuy = !isOwned && canAfford && hasSpace;
        const frameColor = this.getItemFrameColor(item.rarity);
        
        return `
            <div class="shop-item rarity-${item.rarity}" onclick="game.systems.equipment.showItemDetails(${item.id})">
                <div class="item-background" style="border-color: ${frameColor};">
                    <div class="item-image-container">
                        <img src="${item.image}" alt="${item.name}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="item-fallback" style="display: none;">
                            <span class="item-icon">${this.getItemTypeIcon(item.type)}</span>
                        </div>
                    </div>
                    
                    <div class="item-rarity-bar" style="background: ${frameColor};"></div>
                    
                    <div class="item-info">
                        <div class="item-name" style="color: ${frameColor};">${item.name}</div>
                        <div class="item-type">${this.getItemTypeName(item.type)}</div>
                        
                        <div class="item-stats-compact">
                            ${item.fixed_damage ? `<span>⚔️${item.fixed_damage}</span>` : ''}
                            ${item.fixed_armor ? `<span>🛡️${item.fixed_armor}</span>` : ''}
                            ${item.fixed_health ? `<span>❤️${item.fixed_health}</span>` : ''}
                        </div>
                        
                        <div class="item-price-tag">
                            <span class="price">💰 ${item.price}</span>
                            ${isOwned ? 
                                `<span class="owned-badge">✓ В инвентаре</span>` :
                                `<span class="buy-status ${canBuy ? 'can-buy' : 'cannot-buy'}">${canBuy ? 'Купить' : 'Недоступно'}</span>`
                            }
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ========== ДЕТАЛИ ПРЕДМЕТА И ПОКУПКА ==========
    showItemDetails(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        const isOwned = this.currentHero.inventory.includes(item.id);
        const canAfford = this.currentHero.gold >= item.price;
        const hasSpace = this.currentHero.inventory.length < 10;
        const canBuy = !isOwned && canAfford && hasSpace;
        const frameColor = this.getItemFrameColor(item.rarity);
        
        const modalHTML = `
            <div class="item-detail-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 style="color: ${frameColor};">${item.name}</h4>
                        <button class="close-modal" onclick="game.systems.equipment.closeItemModal()">×</button>
                    </div>
                    
                    <div class="item-detail-content">
                        <div class="item-detail-image">
                            <div class="detail-item-background" style="border-color: ${frameColor};">
                                <img src="${item.image}" alt="${item.name}" 
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"
                                     class="item-detail-image-zoom">
                                <div class="item-fallback-large" style="display: none;">
                                    <span class="item-icon-large">${this.getItemTypeIcon(item.type)}</span>
                                </div>
                            </div>
                            <div class="item-rarity ${item.rarity}" style="background: ${frameColor};">
                                ${this.getRarityName(item.rarity)}
                            </div>
                        </div>
                        
                        <div class="item-detail-info">
                            <div class="item-description">${item.description}</div>
                            
                            <div class="item-stats-detailed">
                                <h5>Характеристики:</h5>
                                ${item.fixed_damage ? `<div class="stat-line"><span>⚔️ Урон:</span> <span>+${item.fixed_damage}</span></div>` : ''}
                                ${item.fixed_armor ? `<div class="stat-line"><span>🛡️ Броня:</span> <span>+${item.fixed_armor}</span></div>` : ''}
                                ${item.fixed_health ? `<div class="stat-line"><span>❤️ Здоровье:</span> <span>+${item.fixed_health}</span></div>` : ''}
                                ${item.bonus && item.bonus.type !== 'none' ? 
                                    `<div class="stat-line"><span>🎯 Бонус:</span> <span>${this.formatBonus(item.bonus)}</span></div>` : ''}
                                ${item.setName ? `<div class="stat-line"><span>✨ Сет:</span> <span>${this.itemSets[item.setName]?.name || item.setName}</span></div>` : ''}
                            </div>
                            
                            <div class="item-requirements">
                                <h5>Требования:</h5>
                                <div class="stat-line"><span>📊 Уровень:</span> <span>${item.requiredLevel}</span></div>
                            </div>
                            
                            <div class="item-actions">
                                <div class="price-section">
                                    <span class="buy-price">💰 Купить: ${item.price.toFixed(2)}</span>
                                    <span class="sell-price">💸 Продать: ${(item.sellPrice || Math.floor(item.price * 0.5)).toFixed(2)}</span>
                                </div>
                                
                                <div class="action-buttons">
                                    ${isOwned ? 
                                        `<button class="btn-secondary" onclick="game.systems.equipment.sellItem(${item.id})">Продать</button>` :
                                        `<button class="btn-primary ${!canBuy ? 'disabled' : ''}" 
                                                ${!canBuy ? 'disabled' : ''}
                                                onclick="game.systems.equipment.buyItem(${item.id})">
                                            Купить
                                        </button>`
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    closeItemModal() {
        const modal = document.querySelector('.item-detail-modal');
        if (modal) modal.remove();
    }

    buyItem(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        if (this.currentHero.gold < item.price) {
            this.showNotification('❌ Недостаточно золота');
            return;
        }

        if (this.currentHero.inventory.length >= 10) {
            this.showNotification('❌ Инвентарь полон! Максимум 10 предметов');
            return;
        }

        if (this.currentHero.inventory.includes(itemId)) {
            this.showNotification('❌ У вас уже есть этот предмет');
            return;
        }

        this.currentHero.gold = parseFloat((this.currentHero.gold - item.price).toFixed(2));
        this.currentHero.inventory.push(itemId);
        
        this.showNotification(`🛒 Куплено: ${item.name} за ${item.price.toFixed(2)} золота`);
        this.closeItemModal();
        game.hideOverlay();
        game.showOverlay('shop');
    }

    sellItem(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        if (!this.currentHero.inventory.includes(itemId)) {
            this.showNotification('❌ Предмет не найден в инвентаре');
            return;
        }

        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== itemId);
        const sellPrice = item.sellPrice || Math.floor(item.price * 0.5);
        this.currentHero.gold = parseFloat((this.currentHero.gold + sellPrice).toFixed(2));
        
        // Снятие предмета если он был экипирован
        Object.keys(this.currentHero.equipment).forEach(slot => {
            if (this.currentHero.equipment[slot] === itemId) {
                this.currentHero.equipment[slot] = null;
            }
        });

        this.showNotification(`💰 Продано: ${item.name} за ${sellPrice.toFixed(2)} золота`);
        this.closeItemModal();
        game.hideOverlay();
        game.showOverlay('shop');
    }

    // ========== ИНВЕНТАРЬ И ЭКИПИРОВКА ==========
    showInventory(targetSlot = null) {
        if (!this.currentHero) return '';

        let filteredItems = this.currentHero.inventory;
        let filterInfo = '';
        
        if (targetSlot && targetSlot !== 'inventory') {
            filteredItems = this.getItemsForSlot(targetSlot);
            filterInfo = `
                <div class="filter-info">
                    <strong>🎯 Выбор предмета для: ${this.getSlotName(targetSlot)}</strong>
                    <div>Показано: ${filteredItems.length} подходящих предметов</div>
                </div>
            `;
        }

        const inventoryHTML = filteredItems.map(itemId => {
            const item = this.getItemById(itemId);
            if (!item) return '';
            
            const isEquipped = Object.values(this.currentHero.equipment).includes(itemId);
            const frameColor = this.getItemFrameColor(item.rarity);
            
            return `
                <div class="inventory-item" onclick="game.systems.equipment.equipItem(${itemId})" 
                     data-rarity="${item.rarity}" style="border-color: ${frameColor};">
                    <div class="inventory-item-image">
                        <img src="${item.image}" alt="${item.name}" onerror="this.style.display='none'">
                    </div>
                    <div class="inventory-item-info">
                        <strong style="color: ${frameColor};">${item.name}</strong>
                        <div class="item-stats">
                            ${item.fixed_damage ? `<span>⚔️ +${item.fixed_damage}</span>` : ''}
                            ${item.fixed_armor ? `<span>🛡️ +${item.fixed_armor}</span>` : ''}
                            ${item.fixed_health ? `<span>❤️ +${item.fixed_health}</span>` : ''}
                        </div>
                        <small>${item.description}</small>
                        ${isEquipped ? 
                            '<small style="color: #4ade80;">✓ Надето</small>' : 
                            '<small style="color: #4cc9f0;">📦 В инвентаре</small>'
                        }
                        ${targetSlot && targetSlot !== 'inventory' ? 
                            `<small style="color: #ffd700;">🎯 Подходит для: ${this.getSlotName(targetSlot)}</small>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="overlay-content inventory-overlay">
                <div class="overlay-header">
                    <h3>🎒 Инвентарь</h3>
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
                <div class="overlay-body">
                    <div class="inventory-stats">
                        <span>💰 Золото: ${this.currentHero.gold.toFixed(2)}</span>
                        <span>📦 Предметы: ${this.currentHero.inventory.length}/10</span>
                    </div>
                    ${filterInfo}
                    <div class="inventory-grid">
                        ${inventoryHTML || '<div class="empty-inventory">📭 Инвентарь пуст</div>'}
                    </div>
                    ${targetSlot ? `
                        <div class="inventory-actions">
                            <button class="btn-secondary" onclick="game.showOverlay(\'inventory\')">
                                📦 Показать все предметы
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    equipItem(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        // Использование зелья
        if (item.type === 'potion') {
            this.usePotion(item);
            return;
        }

        // Определяем слот для предмета
        const slot = this.getEquipmentSlot(item);
        if (!slot) {
            this.showNotification(`❌ Нельзя экипировать ${item.name}`);
            return;
        }

        // Проверка совместимости оружия
        if (!this.canEquipWeapon(item, this.currentHero.equipment)) {
            this.showNotification(`❌ Нельзя экипировать ${item.name} - несовместимо с текущим оружием`);
            return;
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

        this.showNotification(`🎯 Надето: ${item.name}`);
        
        // Обновляем интерфейс
        game.hideOverlay();
        game.showHeroGameScreen();
    }

    unequipToInventory(slot) {
        const itemId = this.currentHero.equipment[slot];
        if (!itemId) return false;

        const item = this.getItemById(itemId);
        if (!item) return false;

        // Проверяем место в инвентаре
        if (this.currentHero.inventory.length >= 10) {
            this.showNotification('❌ Инвентарь полон! Максимум 10 предметов');
            return false;
        }

        // Особый случай: если снимаем двуручное оружие
        if (item.weaponType === 'two_handed') {
            this.currentHero.equipment.main_hand = null;
            this.currentHero.equipment.off_hand = null;
        } else {
            this.currentHero.equipment[slot] = null;
        }

        this.currentHero.inventory.push(itemId);
        return true;
    }

    usePotion(item) {
        if (item.type !== 'potion') return;

        if (item.heal) {
            // Здесь нужно добавить логику лечения героя
            this.showNotification(`❤️ Использовано: ${item.name} (+${item.heal} здоровья)`);
        }

        this.currentHero.inventory = this.currentHero.inventory.filter(id => id !== item.id);
        this.showNotification(`❤️ Использовано: ${item.name}`);
        game.hideOverlay();
        game.showOverlay('inventory');
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    getItemById(itemId) {
        return this.items.find(item => item.id === itemId);
    }

    getItemsForSlot(slot) {
        return this.currentHero.inventory.filter(itemId => {
            const item = this.getItemById(itemId);
            if (!item) return false;
            
            const suitableSlots = this.getSuitableSlotsForItem(item);
            return suitableSlots.includes(slot);
        });
    }

    getSuitableSlotsForItem(item) {
        const slotMap = {
            'weapon': {
                'one_handed': ['main_hand', 'off_hand'],
                'two_handed': ['main_hand'],
                'shield': ['off_hand']
            },
            'helmet': ['helmet'],
            'chest': ['chest'],
            'gloves': ['gloves'],
            'legs': ['legs'],
            'boots': ['boots']
        };

        if (item.type === 'weapon' && slotMap.weapon[item.weaponType]) {
            return slotMap.weapon[item.weaponType];
        }
        
        return slotMap[item.type] || [];
    }

    getEquipmentSlot(item) {
        if (item.type === 'weapon') {
            if (item.weaponType === 'shield') {
                return 'off_hand';
            } else if (item.weaponType === 'two_handed') {
                return 'main_hand';
            } else {
                return 'main_hand';
            }
        }
        
        const slotMap = {
            'helmet': 'helmet',
            'chest': 'chest', 
            'gloves': 'gloves',
            'legs': 'legs',
            'boots': 'boots'
        };
        
        return slotMap[item.type] || null;
    }

    canEquipWeapon(item, currentEquipment) {
        if (item.type !== 'weapon') return true;
        
        const mainHand = currentEquipment.main_hand;
        const offHand = currentEquipment.off_hand;
        
        if (item.weaponType === 'two_handed') {
            return !mainHand && !offHand;
        }
        
        if (item.weaponType === 'one_handed') {
            if (item.slot === 'main_hand') {
                const mainHandItem = mainHand ? this.getItemById(mainHand) : null;
                return !(mainHandItem && mainHandItem.weaponType === 'two_handed');
            }
            if (item.slot === 'off_hand') {
                const mainHandItem = mainHand ? this.getItemById(mainHand) : null;
                return !(mainHandItem && mainHandItem.weaponType === 'two_handed');
            }
        }
        
        if (item.weaponType === 'shield') {
            const mainHandItem = mainHand ? this.getItemById(mainHand) : null;
            return !(mainHandItem && mainHandItem.weaponType === 'two_handed');
        }
        
        return true;
    }

    getItemFrameColor(rarity) {
        const colors = {
            'common': '#9ca3af',
            'uncommon': '#4ade80',
            'rare': '#4cc9f0',
            'epic': '#a855f7',
            'legendary': '#f59e0b',
            'mythic': '#ff6b6b'
        };
        return colors[rarity] || '#9ca3af';
    }

    getItemTypeIcon(type) {
        const icons = {
            'weapon': '⚔️',
            'shield': '🛡️',
            'helmet': '⛑️',
            'chest': '👕',
            'gloves': '🧤',
            'legs': '👖',
            'boots': '👢'
        };
        return icons[type] || '🎁';
    }

    getItemTypeName(type) {
        const names = {
            'weapon': 'Оружие',
            'shield': 'Щит',
            'helmet': 'Шлем',
            'chest': 'Броня',
            'gloves': 'Перчатки',
            'legs': 'Поножи',
            'boots': 'Ботинки'
        };
        return names[type] || 'Предмет';
    }

    getRarityName(rarity) {
        const names = {
            'common': 'Обычный',
            'uncommon': 'Необычный',
            'rare': 'Редкий',
            'epic': 'Эпический',
            'legendary': 'Легендарный',
            'mythic': 'Мифический'
        };
        return names[rarity] || 'Обычный';
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

        const value = Math.round(bonus.value * 100);
        return bonusNames[bonus.type] ? 
            `${bonusNames[bonus.type]} +${value}%` : 
            `Бонус: +${value}%`;
    }

    showNotification(message) {
        console.log("🔔", message);
        if (window.game && window.game.showNotification) {
            window.game.showNotification(message);
        } else {
            alert(message);
        }
    }

    createFallbackItems() {
        this.items = [
            {
                id: 1,
                name: "Малое зелье здоровья",
                type: "potion",
                value: 20,
                price: 25,
                heal: 20,
                image: "images/items/potion1.jpg",
                description: "Восстанавливает 20 здоровья",
                rarity: "common"
            },
            {
                id: 2,
                name: "Простой меч",
                type: "weapon",
                weaponType: "one_handed",
                slot: "main_hand",
                fixed_damage: 5,
                price: 100,
                image: "images/items/sword1.jpg",
                description: "Простой железный меч",
                requiredLevel: 1,
                rarity: "common"
            },
            {
                id: 3,
                name: "Деревянный щит",
                type: "weapon",
                weaponType: "shield",
                slot: "off_hand",
                fixed_armor: 3,
                price: 80,
                image: "images/items/shield1.jpg",
                description: "Простой деревянный щит",
                requiredLevel: 1,
                rarity: "common"
            },
            {
                id: 4,
                name: "Кожаный шлем",
                type: "helmet",
                slot: "helmet",
                fixed_armor: 2,
                fixed_health: 10,
                price: 120,
                image: "images/items/helmet1.jpg",
                description: "Кожаный шлем",
                requiredLevel: 1,
                material: "leather",
                rarity: "common"
            }
        ];
        
        this.loadItemSetConfig();
        console.log("🔄 Созданы тестовые предметы");
    }

    // Метод для установки текущего героя
    setCurrentHero(hero) {
        this.currentHero = hero;
    }
}

// Регистрируем систему в глобальной области
window.EquipmentSystem = EquipmentSystem;
console.log("📦 EquipmentSystem модуль загружен");
