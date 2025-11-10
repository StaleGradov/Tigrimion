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
                name: "Комплект Крестьянина Арканиума. Простые горожане, ученики гильдий, мобилизованные в ополчение. Этот комплект — удел тех, кто стоит в самом низу социальной пирамиды Арканиума. Собранный из того, что было, он символизирует надежду простого человека выжить в мире технологических чудес и политических бурь. Ношение полного сета говорит о готовности защищать свой дом, даже если в руках у тебя лишь медь и грубая ткань.",
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.05 },
                description: "Комплект из 6 вещей даст +5% к урону"
            },
            "set_warrior": {
                name: "Комплект Ополченца Арканиума. Опытные ополченцы, караванная стража, городские патрули низшего звена. Комплект для тех, кто ежедневно сталкивается с суровой реальностью границ Арканиума. Бронза и прочный лён — это материалы людей, которые знают, что выживание города зависит не только от Оракула и големов, но и от их бдительности на стенах и дорогах.", 
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.1 },
                description: "Комплект из 6 вещей даст +10% к урону"
            },
            "set_guardian": {
                name: "Комплект Милитанта Арканиума. Городская стража, офицеры ополчения. Обмундирование служителей закона в эпоху, когда закон всё чаще пишется алгоритмами. Железо и шёлк символизируют баланс между силой и дипломатией, необходимый для поддержания порядка в городе, разрываемом внутренними противоречиями.",
                requiredPieces: 6, 
                bonus: { type: "damage_mult", value: 0.15 },
                description: "Комплект из 6 вещей даст +15% к урону"
            },
            "set_hunter": {
                name: "Комплект Ветерана Арканиума. Ветераны военных кампаний, охотники на опасных существ, элитные отряды. Сет тех, кто видел истинный ужас за пределами стен Арканиума. Сталь, закалённая в аномальных зонах, и бархат, скрывающий следы битв, — это атрибуты профессионалов, борющихся с угрозами, против которых технологии бессильны.",
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.2 },
                description: "Комплект из 6 вещей даст +20% к урону"
            },
            "set_complete": {
                name: "Комплект Командира ополчения Арканиума. Высший командный состав ополчения, доверенные лица Стратегоса. Парча и мифрил отличают тех, на ком лежит ответственность за координацию человеческих ресурсов в армии, где всё большая роль отводится машинам. Этот сет — символ власти, данной людьми, а не машиной, и тяжести решений, которые приходится принимать без помощи Оракула.",
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.25 },
                description: "Комплект из 6 вещей даст +25% к урону"
            },
            "set_king": {
                name: "Комплект Стратегоса Арканиума. Стратегос (главнокомандующий). Легендарный сет, воплощающий высшую военную власть в Арканиуме. Адамант и арамид, материалы, чьи секреты известны лишь избранным, символизируют несокрушимую волю и стратегический гений, способный противостоять любой угрозе — будь то армия лайтаров, восстание машин или внутренний заговор.",
                requiredPieces: 6,
                bonus: { type: "damage_mult", value: 0.3 },
                description: "Комплект из 6 вещей даст +30% к урону"
            },
            "set_crit1": {
                name: "Комплект Охотника Арканиума. Начинающие охотники за головами, следопыты, разведчики караванов. Этот комплект из мягкой кожи — униформа тех, кто работает в тени великих инженерных проектов. Его носят те, для кого улицы Нижнего Города стали охотничьими угодьями. В мире, где Оракул отслеживает всё, эти люди находят работу там, где бессильны даже големы-стражи.",
                requiredPieces: 6,
                bonus: { type: "crit_chance", value: 0.05 },
                description: "Комплект из 6 вещей даст +5% к шансу критического удара(наносящего х2 урона)"
            },
            "set_crit2": {
                name: "Комплект Разведчика Арканиума. Опытные охотники, агенты гильдий, полевые разведчики. Более прочная козлиная кожа выдерживает не только удары кинжалов, но и долгие погони по крышам летающих доков. Владельцы этого сета — глаза и уши тех магнатов, кто предпочитает полагаться на людей, а не на данные Оракула, предвосхищая его решения или саботируя их.",
                requiredPieces: 6,
                bonus: { type: "crit_chance", value: 0.1 },
                description: "Комплект из 6 вещей даст +10% к шансу критического удара(наносящего х2 урона)"
            },
            "set_crit3": {
                name: "Комплект Лучника Арканиума. Лучники пограничных застав, охотники на крупную дичь. Элегантная телячья кожа не стесняет движений, необходимых для точного выстрела. Эти люди ценят тишину и терпение — качества, бесполезные для машин, но бесценные для тех, кто защищает подступы к городу или устраняет цели по приказу Совета Инженеров, минуя бюрократию Оракула.",
                requiredPieces: 6,
                bonus: { type: "crit_chance", value: 0.15 },
                description: "Комплект из 6 вещей даст +15% к шансу критического удара(наносящего х2 урона)"
            },
            "set_crit4": {
                name: "Комплект Элитного стрелка Арканиума. Элитные снайперы, личные охранники магнатов, специалисты по особым поручениям. Прочная бычья кожа и стальные вставки — это уже не просто униформа, а броня профессионала. Те, кто носит этот сет, работают на грани закона и политики. Их выстрелы могут изменить курс торговой сделки или остановить срыв поставок огненных ягод.",
                requiredPieces: 6,
                bonus: { type: "crit_chance", value: 0.2 },
                description: "Комплект из 6 вещей даст +20% к шансу критического удара(наносящего х2 урона)"
            },
            "set_crit5": {
                name: "Комплект Командира лучников Арканиума. Командиры разведывательных подразделений, мастера-наёмники, главы служб безопасности гильдий. Чешуя ящера, не поддающаяся ни клинку, ни яду, символизирует неуязвимость и адаптивность. Владельцы этого сета управляют невидимыми сетями влияния и информации, их критические решения (и выстрелы) способны повлиять на баланс сил между Царём, Оракулом и магнатами.",
                requiredPieces: 6,
                bonus: { type: "crit_chance", value: 0.25 },
                description: "Комплект из 6 вещей даст +25% к шансу критического удара(наносящего х2 урона)"
            },
            "set_crit6": {
                name: "Комплект Легендарного стрелка Арканиума. Легендарные ассасины, ветераны теневых войн, те, чьи имена известны лишь избранным. Кожа древнего дракона, подстраивающаяся под владельца — это вершина мастерства и роскоши в мире теней. Такие комплекты не выдаются, а заслуживаются. Их владельцы — живое оружие, последний аргумент в войне, которую не видят простые горожане, войне данных, алгоритмов и человеческой воли.",
                requiredPieces: 6,
                bonus: { type: "crit_chance", value: 0.3 },
                description: "Комплект из 6 вещей даст +30% к шансу критического удара(наносящего х2 урона)"
            },
            "set_penetration1": {
                name: "Комплект Стрелка Арканиума. Ополченцы-арбалетчики, охранники складов, начинающие инженеры-оружейники. Простой медный арбалет и тёплые доспехи из кроличьей шкуры — снаряжение тех, кто полагается на мощь метательного оружия, а не на магию или технологии. В уличных боях, где големы слишком громоздки, их болты находят щели в самой прочной броне.",
                requiredPieces: 6,
                bonus: { type: "armor_penetration", value: 0.06 },
                description: "Комплект из 6 вещей даст +6% к шансу игрорирования брони соперника"
            },
            "set_penetration2": {
                name: "Комплект Следопыта Арканиума. Лесные следопыты, охотники на бронированных тварей, специалисты по прорыву обороны. Бронзовый арбалет с улучшенными зубьями и волчья шкура — атрибуты тех, кто научился использовать силу природы против творений разума. Их болты пробивают не только стальные пластины, но и легендарную броню из древесины поющих деревьев, что делает их ценными специалистами в конфликтах с лайтарами.",
                requiredPieces: 6,
                bonus: { type: "armor_penetration", value: 0.12 },
                description: "Комплект из 6 вещей даст +12% к шансу игрорирования брони соперника"
            },
            "set_penetration3": {
                name: "Комплект Охотника на монстров Арканиума. Профессиональные охотники на троллей и грифонов, штурмовые отряды. Мощный железный арбалет этого сета предназначен для борьбы с существами, чья броня сравнима с корпусом летающего корабля на левитонах. Носящие его не верят в изящные решения Оракула — только в пробивную силу болта, способного остановить любую угрозу извне.",
                requiredPieces: 6,
                bonus: { type: "armor_penetration", value: 0.18 },
                description: "Комплект из 6 вещей даст +18% к шансу игрорирования брони соперника"
            },
            "set_penetration4": {
                name: "Комплект Наемного убийцы Магнатов Арканиума. Элитные наёмники, выполняющие заказы магнатов, диверсанты. Стальной арбалет с алмазными наконечниками и роскошная шуба из тигринной шкуры — оружие и броня классовых войн Арканиума. Их владельцы пробивают не столько физическую броню, сколько политическую защиту, устраняя ключевых сторонников Оракула или инженеров, слишком преданных идее прогресса.",
                requiredPieces: 6,
                bonus: { type: "armor_penetration", value: 0.24 },
                description: "Комплект из 6 вещей даст +24% к шансу игрорирования брони соперника"
            },
            "set_penetration5": {
                name: "Комплект Командира арбалетчиков Арканиума. Командиры осадных отрядов, ветераны войн, стратеги. Мифрильный арбалет, чьи болты не знают преград, и доспехи из шкуры медведя — символы высшего оперативного командования. Эти люди рассчитывают траектории, которые обеспечивают победу. Их пронзающие атаки — это воплощение военной доктрины Арканиума: технология и расчёт, преодолевающие любую защиту.",
                requiredPieces: 6,
                bonus: { type: "armor_penetration", value: 0.3 },
                description: "Комплект из 6 вещей даст +30% к шансу игрорирования брони соперника"
            },
            "set_penetration6": {
                name: "Комплект Мастера над арбалетами Арканиума. Легендарные инженеры-баллистики, мастера-оружейники, чьи имена вписаны в историю. Адамантовый арбалет, создающий собственные правила игры, и доспехи из шкуры дракона, хранящей память иных эпох. Это сет того, кто достиг апогея в искусстве баллистики. Его снаряды игнорируют не только броню, но и саму физическую реальность, предвосхищая расчёты Оракула и меняя ход сражений до их начала.",
                requiredPieces: 6,
                bonus: { type: "armor_penetration", value: 0.36 },
                description: "Комплект из 6 вещей даст +36% к шансу игрорирования брони соперника"
            },
            "set_rich1": {
                name: "Комплект Сборщика трофеев Арканиума. Начинающие сборщики налогов, мелкие торговцы, скупщики краденого. Медная булава и доспехи из заячьего меха — инструменты тех, кто крутится у подножия финансовых потоков Арканиума. Они не создают богатства, а подбирают его крошки, и их скромный бонус к доходам — награда за умение находить прибыль там, где её не видят другие.",
                requiredPieces: 6,
                bonus: { type: "gold_mult", value: 0.05 },
                description: "Комплект из 6 вещей даст +5% к награде в золоте за убийство монстра"
            },
            "set_rich2": {
                name: "Комплект Охотник на редких животных Арканиума. Успешные торговцы, охотники за контрактами, сборщики долгов средней руки. Бронзовая булава с позолотой и элегантные доспехи из куницы — атрибуты тех, кто понял, что настоящее богатство не в производстве, а в перераспределении. Их растущий доход — прямое следствие умения заключать сделки в обход или с использованием данных Оракула.",
                requiredPieces: 6,
                bonus: { type: "gold_mult", value: 0.1 },
                description: "Комплект из 6 вещей даст +10% к награде в золоте за убийство монстра"
            },
            "set_rich3": {
                name: "Комплект Состоятельного человека Арканиума. Владельцы небольших фабрик, ростовщики, успешные негоцианты. Железная булава сборщика долгов и роскошная шуба из песца — символы финансовой ответственности в её самом суровом проявлении. Эти люди — костяк старой экономики, которую Оракул пытается оптимизировать. Их благосостояние растёт вопреки алгоритмам, благодаря старым связям и жёсткому управлению.",
                requiredPieces: 6,
                bonus: { type: "gold_mult", value: 0.15 },
                description: "Комплект из 6 вещей даст +15% к награде в золоте за убийство монстра"
            },
            "set_rich4": {
                name: "Комплект Коллекционера Арканиума. Богатые торговцы, владельцы сетей лавок, финансисты. Стальная булава с ритуальными насечками и доспехи из меха рыси — инструменты и статусные символы новой аристократии, аристократии капитала. Они уже не работают с долгами, они работают с долями, акциями и преференциями, их богатство множится само собой, как предсказывают алгоритмы Оракула.",
                requiredPieces: 6,
                bonus: { type: "gold_mult", value: 0.2 },
                description: "Комплект из 6 вещей даст +20% к награде в золоте за убийство монстра"
            },
            "set_rich5": {
                name: "Комплект Олигарха Арканиума. Олигархи, члены советов гильдий, близкие к казне чиновники. Мифрильная церемониальная булава и доспех из меха барса — это уже не оружие и броня, а инсигнии власти. Их владельцы не столько зарабатывают деньги, сколько управляют финансовыми потоками Арканиума, оспаривая у Оракула право решать, куда течь этим потокам.",
                requiredPieces: 6,
                bonus: { type: "gold_mult", value: 0.25 },
                description: "Комплект из 6 вещей даст +25% к награде в золоте за убийство монстра"
            },
            "set_rich6": {
                name: "Комплект Магната Арканиума. Магнаты, легендарные финансисты, короли торговли, те, чьи состояния сравнимы с казной целого королевства. Адамантовая булава Короля Капитала и доспехи из меха мамонта — символы абсолютной финансовой власти. Тот, кто собрал этот сет, либо обошёл Оракула, либо поставил его себе на службу. Его богатство — не просто число, это сила, способная влиять на решения царя и направление технологиями прогресса всего Арканиума.",
                requiredPieces: 6,
                bonus: { type: "gold_mult", value: 0.3 },
                description: "Комплект из 6 вещей даст +30% к награде в золоте за убийство монстра"
            },
            "set_vampire1": {
                name: "Комплект Убийцы Арканиума. Ученики гильдии убийц, уличные налётчики, начинающие охотники за головами. Медные кинжалы и костяные доспехи этого сета — первые уроки в искусстве извлечения жизненной силы из противника. Это оружие тех, кто работает в тени летающих кораблей, понимая, что настоящая сила — не в богатстве, а в умении тихо забрать чужую жизнь. Их скромный вампиризм — отражение ранней, ещё не отточенной технологии вампиров, чьи знания были утеряны, но чьи принципы живы в подполье Арканиума.",
                requiredPieces: 6,
                bonus: { type: "vampirism", value: 0.01 },
                description: "Комплект из 6 вещей даст +1% к вампиризму"
            },
            "set_vampire2": {
                name: "Комплект Наемного убийцы Арканиума. Профессиональные убийцы, охотники за головами средней руки, агенты магнатов. Бронзовые стилеты и доспехи из волчьих костей — инструменты тех, кто превратил вампиризм в ремесло. Их владельцы — тени, скользящие между инженерными цехами и особняками магнатов. Усиленный вампиризм этого сета — наследие вампирской эпохи, когда технологии поглощения жизни были доведены до уровня прикладной науки, а не просто магии.",
                requiredPieces: 6,
                bonus: { type: "vampirism", value: 0.02 },
                description: "Комплект из 6 вещей даст +2% к вампиризму"
            },
            "set_vampire3": {
                name: "Комплект Темного стража Арканиума. Элитные ассасины, телохранители магнатов, специалисты по тихому решению проблем. Железные кинжалы с кровостоками и доспехи из лошадиных костей — атрибуты тех, кто работает на стыке старого и нового. Они используют технологии вампиров, чтобы противостоять технологиям Арканиума, высасывая жизнь из врагов своих господ или слишком любопытных инженеров. Их сила — прямое следствие древнего конфликта, в котором вампиры проиграли, но их искусство не было забыто.",
                requiredPieces: 6,
                bonus: { type: "vampirism", value: 0.03 },
                description: "Комплект из 6 вещей даст +3% к вампиризму"
            },
            "set_vampire4": {
                name: "Комплект Легендарного зверолова Арканиума. Мастера-убийцы, охотники на редчайших существ, личные решалы Крэйвена. Стальные стилеты, усиленные рунами, и доспехи из бычьих костей — это уже не просто оружие, а проводники воли. Их владельцы охотятся не только на людей, но и на искажённых тварей, рождённых от сбоев в работе механизмов или других аномалий. Мощный вампиризм этого сета — намёк на то, что легендарные вампиры прошлого могли питаться не только кровью, но и самой магической энергией, что делает их технологии бесценными в войне.",
                requiredPieces: 6,
                bonus: { type: "vampirism", value: 0.04 },
                description: "Комплект из 6 вещей даст +4% к вампиризму"
            },
            "set_vampire5": {
                name: "Комплект Вампира. Глава гильдии ассасинов, тайные советники царя, серые кардиналы. Мифрильные кинжалы, не оставляющие следов, и доспехи из черепа мамонта — символы абсолютной власти в теневом мире. Тот, кто носит этот сет, не просто использует наследие вампиров — он стал его частью. Он понимает, что для борьбы с монстрами прогресса иногда нужно самому стать монстром. Его вампиризм — это холодная, расчётливая сила, способная противостоять бездушной логике Оракула.",
                requiredPieces: 6,
                bonus: { type: "vampirism", value: 0.05 },
                description: "Комплект из 6 вещей даст +5% к вампиризму"
            },
            "set_vampire6": {
                name: "Комплект Лорда вампиров - Мурмилона. Легендарная личность, вампир, один из шести приближенных к Королю вампиров Алдукарасу. Доспех, чье существование ставит под сомнение официальную историю. Адамантовые стилеты и доспехи из драконьих костей — артефакты, не поддающиеся логике. Их существование задаёт пугающий вопрос: откуда у лорда вампиров могли взяться доспехи из костей драконов, если драконы появились тысячелетия спустя после падения вампиров? Этот сет — аномалия, возможное свидетельство того, что история Арканиума — это ложь, а истинная сила, возможно, всегда была скрыта в тени, ожидая своего часа. Его абсолютный вампиризм — не просто магия, а право сильного переписать реальность.  ",
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
            },
            "set_health1": {
                name: "Лесоруба Арканиума",
                requiredPieces: 6,
                bonus: { type: "health_mult", value: 0.5 },
                description: "Комплект из 6 вещей даст +5% к здоровью"
            },
            "set_health2": {
                name: "Дровосека Арканиума", 
                requiredPieces: 6,
                bonus: { type: "health_mult", value: 0.1 },
                description: "Комплект из 6 вещей даст +10% к здоровью"
            },
            "set_health3": {
                name: "Берсерка - воина гильдии воров Арканиума",
                requiredPieces: 6,
                bonus: { type: "health_mult", value: 0.15 },
                description: "Комплект из 6 вещей даст +15% к здоровью"
            },
            "set_healt4": {
                name: "Наемника Ветерана Арканиума",
                requiredPieces: 6,
                bonus: { type: "health_mult", value: 0.2 },
                description: "Комплект из 6 вещей даст +20% к здоровью"
            },
            "set_health5": {
                name: "Капитана стражи Арканиума",
                requiredPieces: 6,
                bonus: { type: "health_mult", value: 0.25 },
                description: "Комплект из 6 вещей даст +25% к здоровью"
            },
            "set_health6": {
                name: "Лорда Воина Арканиума",
                requiredPieces: 6,
                bonus: { type: "health_mult", value: 0.3 },
                description: "Комплект из 6 вещей даст +30% к здоровью"
            },
            "set_bron1": {
                name: "Тяжелого отряда личной гвардии Царя Арканиума - Щит Царя",
                requiredPieces: 6,
                bonus: { type: "armor_mult", value: 0.005 },
                description: "Комплект из 6 вещей даст +0,5% к броне"
            },
            "set_bron2": {
                name: "Штурмовые отряды прорыва личной гвардии Царя Арканиума - Гнев Вулкана", 
                requiredPieces: 6,
                bonus: { type: "armor_mult", value: 0.01 },
                description: "Комплект из 6 вещей даст +1% к броне"
            },
            "set_bron3": {
                name: "Быстрых ударных групп Царя Арканиума - Стальная Буря",
                requiredPieces: 6,
                bonus: { type: "armor_mult", value: 0.015 },
                description: "Комплект из 6 вещей даст +1,5% к броне"
            },
            "set_bron4": {
                name: "Защитников левитационных кристаллов Арканиума - Нерушимые",
                requiredPieces: 6,
                bonus: { type: "armor_mult", value: 0.02 },
                description: "Комплект из 6 вещей даст +2% к броне"
            },
            "set_bron5": {
                name: "Элита боевых подразделений Арканиума - Наследники Титанов",
                requiredPieces: 6,
                bonus: { type: "armor_mult", value: 0.025 },
                description: "Комплект из 6 вещей даст +2,5% к броне"
            },
            "set_bron6": {
                name: "Мистические стражи Арканиума - Воплощение Воли. Охраняющие самые ценные артефакты и реликвии человечества",
                requiredPieces: 6,
                bonus: { type: "armor_mult", value: 0.03 },
                description: "Комплект из 6 вещей даст +3% к броне"
            }
        };
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    isItemOwned(itemId) {
        return this.currentHero && this.currentHero.inventory.includes(itemId);
    }

    addItemToInventory(itemId) {
        if (this.currentHero && !this.currentHero.inventory.includes(itemId)) {
            this.currentHero.inventory.push(itemId);
            return true;
        }
        return false;
    }

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

        // Сохраняем текущее состояние
        this.currentCategory = category;
        this.currentSubcategory = subcategory;

        console.log('🔍 Открываем магазин:', { category, subcategory });

        const html = `
            <div class="overlay-content shop-overlay" style="max-width: 1200px; width: 95%;">
                <div class="overlay-header">
                    <h3>🏪 Магазин снаряжения</h3>
                    <button class="btn-close" onclick="game.hideOverlay()">✕</button>
                </div>
                
                <div class="merchant-info">
                    <div class="merchant-stats">
                        <span class="gold-amount">💰 ${this.currentHero.gold.toFixed(2)}</span>
                        <span class="inventory-space">🎒 ${this.currentHero.inventory.length}/10</span>
                    </div>
                </div>
                
                <div class="shop-categories">
                    <button class="category-tab ${category === 'all' ? 'active' : ''}" 
                            data-category="all"
                            onclick="game.systems.equipment.handleCategoryClick('all')">Все предметы</button>
                    <button class="category-tab ${category === 'weapon' ? 'active' : ''}" 
                            data-category="weapon"
                            onclick="game.systems.equipment.handleCategoryClick('weapon')">⚔️ Оружие</button>
                    <button class="category-tab ${category === 'helmet' ? 'active' : ''}" 
                            data-category="helmet"
                            onclick="game.systems.equipment.handleCategoryClick('helmet')">⛑️ Шлемы</button>
                    <button class="category-tab ${category === 'chest' ? 'active' : ''}" 
                            data-category="chest"
                            onclick="game.systems.equipment.handleCategoryClick('chest')">👕 Броня</button>
                    <button class="category-tab ${category === 'gloves' ? 'active' : ''}" 
                            data-category="gloves"
                            onclick="game.systems.equipment.handleCategoryClick('gloves')">🧤 Перчатки</button>
                    <button class="category-tab ${category === 'legs' ? 'active' : ''}" 
                            data-category="legs"
                            onclick="game.systems.equipment.handleCategoryClick('legs')">👖 Поножи</button>
                    <button class="category-tab ${category === 'boots' ? 'active' : ''}" 
                            data-category="boots"
                            onclick="game.systems.equipment.handleCategoryClick('boots')">👢 Ботинки</button>
                    <!-- НОВАЯ КАТЕГОРИЯ СЕТОВ -->
                    <button class="category-tab ${category === 'set' ? 'active' : ''}" 
                            data-category="set"
                            onclick="game.systems.equipment.handleCategoryClick('set')">✨ Сеты</button>
                </div>
                
                <div id="shop-subcategories-container"></div>
                
                <div class="shop-content" style="max-height: 60vh; overflow-y: auto;">
                    <div class="items-grid" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">
                        ${this.renderShopItems(category, subcategory)}
                    </div>
                </div>
            </div>
        `;

        // Откладываем инициализацию подкатегорий после рендера
        setTimeout(() => {
            this.initializeSubcategories(category, subcategory);
        }, 0);

        return html;
    }

    // Новая система подкатегорий
    getSubcategories() {
        return {
            'helmet': {
                'all': 'Все шлемы',
                'cloth': 'Ткань',
                'leather': 'Кожа', 
                'hide': 'Шкура',
                'fur': 'Мех',
                'bone': 'Кости',
                'plate': 'Пластины',
                'chain': 'Кольчуга',
                'plate_mail': 'Латы'
            },
            'chest': {
                'all': 'Вся броня',
                'cloth': 'Ткань',
                'leather': 'Кожа',
                'hide': 'Шкура', 
                'fur': 'Мех',
                'bone': 'Кости',
                'plate': 'Пластины',
                'chain': 'Кольчуга',
                'plate_mail': 'Латы'
            },
            'gloves': {
                'all': 'Все перчатки',
                'cloth': 'Ткань',
                'leather': 'Кожа',
                'hide': 'Шкура',
                'fur': 'Мех', 
                'bone': 'Кости',
                'plate': 'Пластины',
                'chain': 'Кольчуга',
                'plate_mail': 'Латы'
            },
            'legs': {
                'all': 'Все поножи',
                'cloth': 'Ткань',
                'leather': 'Кожа',
                'hide': 'Шкура',
                'fur': 'Мех',
                'bone': 'Кости',
                'plate': 'Пластины', 
                'chain': 'Кольчуга',
                'plate_mail': 'Латы'
            },
            'boots': {
                'all': 'Все ботинки',
                'cloth': 'Ткань',
                'leather': 'Кожа',
                'hide': 'Шкура',
                'fur': 'Мех',
                'bone': 'Кости',
                'plate': 'Пластины',
                'chain': 'Кольчуга',
                'plate_mail': 'Латы'
            },
            'weapon': {
                'all': 'Все оружие',
                'one_handed': 'Одноручное',
                'two_handed': 'Двуручное', 
                'shield': 'Щиты'
            },
            // НОВЫЕ ПОДКАТЕГОРИИ СЕТОВ
            'set': {
                'all': 'Все сеты',
                'damage': '⚔️ Урон',
                'crit': '🎯 Критический удар',
                'penetration': '💥 Игнор Брони', 
                'rich': '💰 Богатство',
                'vampire': '🩸 Вампиризм',
                'regen': '❤️ Регенерация',
                'health': '💪 Здоровье',
                'armor': '🛡️ Броня'
            }
        };
    }

    initializeSubcategories(category, currentSubcategory = 'all') {
        const container = document.getElementById('shop-subcategories-container');
        if (!container) return;

        const subcategories = this.getSubcategories()[category];
        if (!subcategories) {
            container.innerHTML = '';
            return;
        }

        let html = `<div class="shop-subcategories">
            <div class="subcategory-tabs">`;
        
        Object.entries(subcategories).forEach(([key, name]) => {
            const isActive = currentSubcategory === key;
            const count = this.getSubcategoryItemCount(category, key);
            html += `
                <button class="subcategory-tab ${isActive ? 'active' : ''}" 
                        data-subcategory="${key}"
                        onclick="game.systems.equipment.handleSubcategoryClick('${category}', '${key}')">
                    ${name}
                    <span class="subcategory-count">${count}</span>
                </button>
            `;
        });
        
        html += `</div></div>`;
        container.innerHTML = html;

        console.log('✅ Подкатегории инициализированы для:', category);
    }

    handleCategoryClick(category) {
        console.log('🎯 Нажата категория:', category);
        // Сохраняем состояние перед переходом
        this.currentCategory = category;
        this.currentSubcategory = 'all'; // Сбрасываем подкатегорию при смене категории
        this.showShop(category, 'all');
    }

    handleSubcategoryClick(category, subcategory) {
        console.log('🎯 Нажата подкатегория:', { category, subcategory });
        
        // Сохраняем состояние
        this.currentCategory = category;
        this.currentSubcategory = subcategory;
        
        // Обновляем активные вкладки
        const allSubTabs = document.querySelectorAll('.subcategory-tab');
        allSubTabs.forEach(tab => tab.classList.remove('active'));
        
        const clickedTab = document.querySelector(`[data-subcategory="${subcategory}"]`);
        if (clickedTab) {
            clickedTab.classList.add('active');
        }
        
        // Обновляем отображение предметов
        this.updateShopItems(category, subcategory);
    }

    updateShopItems(category, subcategory) {
        const itemsGrid = document.querySelector('.items-grid');
        if (!itemsGrid) return;

        itemsGrid.innerHTML = this.renderShopItems(category, subcategory);
    }

    renderShopItems(category, subcategory = 'all') {
        const filteredItems = this.filterItemsByCategory(category, subcategory);
        console.log(`📦 Отображаем ${filteredItems.length} предметов для:`, { category, subcategory });

        if (filteredItems.length === 0) {
            return '<div class="empty-category">📭 Нет предметов в этой категории</div>';
        }

        return filteredItems.map(item => this.renderShopItem(item)).join('');
    }

    // Улучшенная фильтрация
    filterItemsByCategory(category, subcategory = 'all') {
        console.log(`🔍 Фильтрация: категория=${category}, подкатегория=${subcategory}`);
        
        // Показываем ВСЕ предметы (без фильтра по уровню)
        let filteredItems = this.items;
        
        // Фильтрация по основной категории
        if (category !== 'all') {
            if (category === 'set') {
                // Для категории сетов фильтруем предметы, которые принадлежат какому-либо сету
                filteredItems = filteredItems.filter(item => item.setName && this.itemSets[item.setName]);
            } else {
                filteredItems = filteredItems.filter(item => this.doesItemMatchCategory(item, category));
            }
        }

        // Фильтрация по подкатегории сетов
        if (subcategory !== 'all' && category === 'set') {
            filteredItems = this.filterSetItemsBySubcategory(filteredItems, subcategory);
        }
        // Фильтрация по подкатегории для остальных категорий
        else if (subcategory !== 'all' && category !== 'all') {
            filteredItems = this.filterItemsBySubcategory(filteredItems, category, subcategory);
        }

        console.log(`📊 Результат фильтрации: ${filteredItems.length} предметов`);
        
        // Сортируем по цене для удобства
        return filteredItems.sort((a, b) => a.price - b.price);
    }

    // ========== ФИЛЬТРАЦИЯ СЕТОВ ПО ПОДКАТЕГОРИЯМ ==========
    filterSetItemsBySubcategory(items, subcategory) {
        const setBonusMap = {
            'damage': ['set_beginner', 'set_warrior', 'set_guardian', 'set_hunter', 'set_complete', 'set_king'],
            'crit': ['set_crit1', 'set_crit2', 'set_crit3', 'set_crit4', 'set_crit5', 'set_crit6'],
            'penetration': ['set_penetration1', 'set_penetration2', 'set_penetration3', 'set_penetration4', 'set_penetration5', 'set_penetration6'],
            'rich': ['set_rich1', 'set_rich2', 'set_rich3', 'set_rich4', 'set_rich5', 'set_rich6'],
            'vampire': ['set_vampire1', 'set_vampire2', 'set_vampire3', 'set_vampire4', 'set_vampire5', 'set_vampire6'],
            'regen': ['set_regen1', 'set_regen2', 'set_regen3', 'set_regen4', 'set_regen5', 'set_regen6'],
            'health': ['set_health1', 'set_health2', 'set_health3', 'set_healt4', 'set_health5', 'set_health6'],
            'armor': ['set_bron1', 'set_bron2', 'set_bron3', 'set_bron4', 'set_bron5', 'set_bron6']
        };

        if (subcategory === 'all') return items;
        
        const allowedSets = setBonusMap[subcategory] || [];
        return items.filter(item => {
            return item.setName && allowedSets.includes(item.setName);
        });
    }

    // Метод из старой версии - проверка соответствия категории
    doesItemMatchCategory(item, category) {
        if (category === 'all') return true;
        if (category === 'weapon') {
            // Включаем ВСЕ оружие включая щиты
            return item.type === 'weapon';
        }
        return item.type === category;
    }

    // Метод из старой версии - фильтрация по подкатегории
    filterItemsBySubcategory(items, category, subcategory) {
        if (!subcategory || subcategory === 'all') return items;
        
        return items.filter(item => {
            if (item.type !== category) return false;
            
            if (category === 'weapon') {
                // Для оружия фильтруем по weaponType
                return item.weaponType === subcategory;
            } else {
                // Для брони фильтруем по материалу
                const itemMaterial = item.material || 'cloth';
                return itemMaterial === subcategory;
            }
        });
    }

    getSubcategoryItemCount(category, subcategory) {
        const items = this.filterItemsByCategory(category, subcategory);
        return items.length;
    }

    renderShopItem(item) {
        const isOwned = this.isItemOwned(item.id);
        const canAfford = this.currentHero.gold >= item.price;
        const hasSpace = this.currentHero.inventory.length < 10;
        const canBuy = !isOwned && canAfford && hasSpace;
        const frameColor = this.getItemFrameColor(item.rarity);
        
        // Получаем информацию о бонусе предмета
        const bonusInfo = this.getBonusDisplayInfo(item);
        
        return `
            <div class="shop-item" data-item-id="${item.id}" onclick="game.showItemDetailModal(${item.id})">
                <div class="item-background rarity-${item.rarity}" style="border-color: ${frameColor};">
                    <div class="item-image-container">
                        <img src="${item.image}" alt="${item.name}" 
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                        <div class="item-fallback" style="display: none;">
                            <span class="item-icon">${this.getItemTypeIcon(item.type)}</span>
                        </div>
                    </div>
                    
                    <div class="item-info">
                        <div class="item-name" style="color: ${frameColor};">${item.name}</div>
                        <div class="item-type">${this.getItemTypeName(item.type)}</div>
                        
                        <div class="item-stats-compact">
                            ${item.fixed_damage ? `<span>⚔️${item.fixed_damage}</span>` : ''}
                            ${item.fixed_armor ? `<span>🛡️${item.fixed_armor}</span>` : ''}
                            ${item.fixed_health ? `<span>❤️${item.fixed_health}</span>` : ''}
                            <!-- ОТОБРАЖЕНИЕ БОНУСА ПРЕДМЕТА -->
                            ${bonusInfo ? `<span class="item-bonus-display">${bonusInfo}</span>` : ''}
                        </div>
                        
                        <!-- ОТОБРАЖЕНИЕ ИНФОРМАЦИИ О СЕТЕ -->
                        ${item.setName ? `
                            <div class="item-set-info">
                                ✨ ${this.itemSets[item.setName]?.name || 'Сет'}
                            </div>
                        ` : ''}
                        
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

    // ========== ПОЛУЧЕНИЕ ИНФОРМАЦИИ О БОНУСЕ ДЛЯ ОТОБРАЖЕНИЯ ==========
    getBonusDisplayInfo(item) {
        if (!item.bonus || item.bonus.type === 'none') return null;
        
        const bonusIcons = {
            'health_mult': '💪',
            'damage_mult': '⚔️',
            'armor_mult': '🛡️',
            'gold_mult': '💰',
            'health_regen_mult': '❤️',
            'crit_chance': '🎯',
            'armor_penetration': '💥',
            'vampirism': '🩸'
        };
        
        const value = Math.round(item.bonus.value * 100);
        const icon = bonusIcons[item.bonus.type] || '✨';
        
        return `${icon}+${value}%`;
    }

    // ========== ДЕТАЛИ ПРЕДМЕТА И ПОКУПКА ==========
    showItemDetails(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        const isOwned = this.isItemOwned(item.id);
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
                            
                            <!-- ИНФОРМАЦИЯ О БОНУСЕ ПРЕДМЕТА -->
                            ${item.bonus && item.bonus.type !== 'none' ? `
                                <div class="item-bonus-info">
                                    <h5>🎯 Бонус предмета:</h5>
                                    <div class="bonus-display" style="color: #4cc9f0; font-weight: bold;">
                                        ${this.formatBonus(item.bonus)}
                                    </div>
                                </div>
                            ` : ''}
                            
                            <div class="item-stats-detailed">
                                <h5>Характеристики:</h5>
                                ${item.fixed_damage ? `<div class="stat-line"><span>⚔️ Урон:</span> <span>+${item.fixed_damage}</span></div>` : ''}
                                ${item.fixed_armor ? `<div class="stat-line"><span>🛡️ Броня:</span> <span>+${item.fixed_armor}</span></div>` : ''}
                                ${item.fixed_health ? `<div class="stat-line"><span>❤️ Здоровье:</span> <span>+${item.fixed_health}</span></div>` : ''}
                            </div>
                            
                            <!-- ИНФОРМАЦИЯ О СЕТЕ -->
                            ${item.setName && this.itemSets[item.setName] ? `
                                <div class="item-set-details">
                                    <h5>✨ Бонус сета:</h5>
                                    <div class="set-info">
                                        <strong>${this.itemSets[item.setName].name}</strong>
                                        <div class="set-bonus">${this.formatBonus(this.itemSets[item.setName].bonus)}</div>
                                        <div class="set-description">${this.itemSets[item.setName].description}</div>
                                        <div class="set-requirements">Требуется предметов: ${this.itemSets[item.setName].requiredPieces}/6</div>
                                    </div>
                                </div>
                            ` : ''}
                            
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
        
        // ВОССТАНАВЛИВАЕМ магазин с сохраненной категорией
        if (window.game && window.game.showOverlay) {
            // Используем текущие сохраненные категории
            const currentCategory = this.currentCategory || 'all';
            const currentSubcategory = this.currentSubcategory || 'all';
            
            // Показываем магазин с сохраненным состоянием
            const container = document.getElementById('overlay-container');
            if (container) {
                container.innerHTML = this.showShop(currentCategory, currentSubcategory);
                setTimeout(() => {
                    if (window.game.attachShopItemHandlers) {
                        window.game.attachShopItemHandlers();
                    }
                }, 100);
            }
        }
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

        if (this.isItemOwned(itemId)) {
            this.showNotification('❌ У вас уже есть этот предмет');
            return;
        }

        this.currentHero.gold = parseFloat((this.currentHero.gold - item.price).toFixed(2));
        this.addItemToInventory(itemId);
        
        this.showNotification(`🛒 Куплено: ${item.name} за ${item.price.toFixed(2)} золота`);
        this.closeItemModal();
        // НЕ закрываем оверлей полностью, а обновляем магазин с сохраненным состоянием
        this.refreshShopWithSavedState();
    }

    sellItem(itemId) {
        const item = this.getItemById(itemId);
        if (!item) return;

        if (!this.isItemOwned(itemId)) {
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
        // НЕ закрываем оверлей полностью, а обновляем магазин с сохраненным состоянием
        this.refreshShopWithSavedState();
    }

    // Новый метод для обновления магазина с сохраненным состоянием
    refreshShopWithSavedState() {
        const currentCategory = this.currentCategory || 'all';
        const currentSubcategory = this.currentSubcategory || 'all';
        
        const container = document.getElementById('overlay-container');
        if (container) {
            container.innerHTML = this.showShop(currentCategory, currentSubcategory);
            setTimeout(() => {
                if (window.game && window.game.attachShopItemHandlers) {
                    window.game.attachShopItemHandlers();
                }
            }, 100);
        }
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
