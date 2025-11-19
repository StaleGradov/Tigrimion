«use strict»; 

 

Class MapSystem { 

    Constructor() { 

        This.globalMaps = []; 

        This.localMaps = []; 

        This.tacticalMaps = []; // Хранит загруженные карты 

         

        // Активная карта для отрисовки (может быть и локальной, и тактической) 

        This.currentTacticalMap = null;  

         

        This.currentGlobalMap = null; 

        This.currentLocalMap = null; 

         

        This.playerGlobalPosition = {x: 0, y: 0}; 

        This.playerLocalPosition = {x: 0, y: 0}; 

        This.playerTacticalPosition = {x: 0, y: 0}; 

         

        This.currentHero = null; 

        This.loadedJSONMaps = new Map(); 

        This.activeOverlay = null; 

        This.canvas = null; 

        This.ctx = null; 

        This.hexSize = 40; 

        This.showGrid = false; 

        This.hoveredHex = null; 

        This.mapOffset = { x: 0, y: 0 }; 

        This.lastHoveredHex = null; 

        This.animationFrame = null; 

        This.pendingMovement = null; 

        This.canvasInitialized = false; 

 

        // Новые свойства для навигации 

        This.mapStack = []; // Стек для хранения состояний карт (вход/выход) 

        This.currentMapType = 'local'; // 'local' или 'tactical' 

 

        // Новые свойства для подсказок 

        This.tooltipElement = null; 

        This.currentTooltip = null; 

        This.tooltipTimeout = null; 

 

        // Словарь символов для всех типов объектов 

        This.objectSymbols = { 

            'player_start': '⭐', 

            'monster': '👹', 

            'chest': '📦', 

            'npc': '🧙', 

            'exit': '🚪', 

            'obstacle': '🪨', 

            // 'active': '🟢', // Убираем эмодзи для обычных клеток 

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

            'magic_crystal': '💎' 

        }; 

 

        Console.log(«✅ MapSystem инициализирован с системой переходов (Local <-> Tactical)»); 

    } 

 

    setCurrentHero(hero) { 

        this.currentHero = hero; 

        console.log(`🎯 Установлен герой для карты: ${hero?.name || 'нет'}`); 

        if (hero) { 

            this.updatePlayerPositionsFromHero(hero); 

        } 

    } 

 

    updatePlayerPositionsFromHero(hero) { 

        if (hero.mapPosition) { 

            this.playerGlobalPosition = hero.mapPosition.global || this.playerGlobalPosition; 

            this.playerLocalPosition = hero.mapPosition.local || this.playerLocalPosition; 

            this.playerTacticalPosition = hero.mapPosition.tactical || this.playerTacticalPosition; 

        } 

        Console.log(`📍 Позиции обновлены для героя: ${hero.name}`); 

    } 

 

    Async loadMapData() { 

        Try { 

            Console.log(«📥 Загружаем данные карт…»); 

            Await this.loadJSONMaps(); 

             

            If (this.localMaps.length === 0 && this.tacticalMaps.length === 0) { 

                This.createTestMaps(); 

            } 

             

            This.setStartPositions(); 

            Console.log(`✅ Карты загружены: Локальных=${this.localMaps.length}, Тактических=${this.tacticalMaps.length}`); 

            Return true; 

        } catch (error) { 

            Console.error(«❌ Ошибка загрузки данных карт:», error); 

            This.createFallbackMaps(); 

            Return true; 

        } 

    } 

 

    Async loadJSONMaps() { 

        Try { 

            Console.log(«🔄 Загружаем JSON карты…»); 

 

            // 1. ПУТИ ДЛЯ ЛОКАЛЬНЫХ КАРТ 

            Const localMapPaths = [ 

                'data/maps/local/local-maps.json', 

                'data/maps/local-maps.json', 

                'maps/local-maps.json', 

                'data/local-maps.json' 

            ]; 

 

            // 2. ПУТИ ДЛЯ ТАКТИЧЕСКИХ КАРТ 

            Const tacticalMapPaths = [ 

                'data/maps/tactical/tactical-maps.json', 

                'data/maps/tactical-maps.json', 

                'maps/tactical-maps.json', 

                'data/tactical-maps.json' 

            ]; 

 

            // Загрузка локальных карт 

            For (const path of localMapPaths) { 

                Try { 

                    Const response = await fetch(path); 

                    If (response.ok) { 

                        Const mapData = await response.json(); 

                        Await this.processTigrimionJSONMaps(mapData, 'local'); 

                        Console.log(`✅ Локальные карты загружены из: ${path}`); 

                        Break;  

                    } 

                } catch € { 

                    Console.log(`❌ Не удалось загрузить локальные карты из ${path}:`, e.message); 

                } 

            } 

 

            // Загрузка тактических карт 

            For (const path of tacticalMapPaths) { 

                Try { 

                    Const response = await fetch(path); 

                    If (response.ok) { 

                        Const mapData = await response.json(); 

                        Await this.processTigrimionJSONMaps(mapData, 'tactical'); 

                        Console.log(`✅ Тактические карты загружены из: ${path}`); 

                        Break; 

                    } 

                } catch € { 

                    Console.log(`❌ Не удалось загрузить тактические карты из ${path}:`, e.message); 

                } 

            } 

 

            Console.log(«ℹ️ Загрузка JSON карт завершена»); 

 

        } catch (error) { 

            Console.error(«❌ Ошибка загрузки JSON карт:», error); 

        } 

    } 

 

    Async processTigrimionJSONMaps(mapData, mapType = 'tactical') { 

        If (!mapData || !mapData.meta) { 

            Console.warn(`❌ Неверный формат JSON карты Tigrimion (${mapType})`); 

            Return; 

        } 

 

        Try { 

            Const convertedMap = this.convertTigrimionJSONToMap(mapData, mapType); 

            If (convertedMap) { 

                If (mapType === 'local') { 

                    This.localMaps.push(convertedMap); 

                    // Если это первая локальная карта, делаем её активной по умолчанию 

                    If (this.localMaps.length === 1) { 

                        This.setCurrentLocalMap(convertedMap); 

                    } 

                } else { 

                    This.tacticalMaps.push(convertedMap); 

                } 

                 

                This.loadedJSONMaps.set(convertedMap.id, convertedMap); 

                Console.log(`✅ Обработана ${mapType} карта: ${convertedMap.name}`); 

            } 

        } catch (error) { 

            Console.error(`❌ Ошибка обработки карты (${mapType}):`, error); 

        } 

    } 

 

    convertTigrimionJSONToMap(jsonMap, mapType = 'tactical') { 

        if (!jsonMap.game || !jsonMap.game.grid || !jsonMap.game.grid.cells) { 

            console.warn(«❌ Неверная структура карты Tigrimion»); 

            return null; 

        } 

 

        Const cells = jsonMap.game.grid.cells; 

        Const convertedCells = {}; 

         

        Console.log(`📥 Импортируем ${mapType} карту: ${jsonMap.meta?.name || 'Без названия'}`); 

        Console.log(`📊 Клеток в импорте: ${cells.length}`); 

 

        Cells.forEach(cell => { 

            Const key = `${cell.col},${cell.row}`; 

             

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

                // СВОЙСТВА ДЛЯ ПЕРЕХОДОВ И ПОДСКАЗОК 

                tacticalMap: cell.tacticalMap, // Путь к файлу карты для входа 

                returnX: cell.returnX,         // Позиция возврата (опционально) 

                returnY: cell.returnY, 

                tooltip: cell.tooltip, 

                originalData: cell 

            }; 

        }); 

 

        Let startPosition = {x: 0, y: 0}; 

        Const startCell = cells.find(cell => cell.type === 'player_start'); 

        If (startCell) { 

            startPosition = {x: startCell.col, y: startCell.row}; 

            console.log(`🎯 Стартовая позиция: [${startCell.col},${startCell.row}]`); 

        } 

 

        Const originalCanvasWidth = jsonMap.visual?.canvasWidth || 1024; 

        Const originalCanvasHeight = jsonMap.visual?.canvasHeight || 1024; 

 

        Console.log(`📐 Original canvas: ${originalCanvasWidth}x${originalCanvasHeight}`); 

 

        Return { 

            Id: mapType === 'local' ? `local_${this.localMaps.length + 1}` : `tactical_${this.tacticalMaps.length + 1}`, 

            Name: jsonMap.meta?.name || `${mapType === 'local' ? 'Локальная' : 'Тактическая'} карта`, 

            Image: jsonMap.visual?.backgroundImage || «», 

            Width: 20,  

            Height: 20, 

            startPosition: startPosition, 

            description: jsonMap.meta?.description || «Создана в редакторе карт Tigrimion», 

            localPosition: {x: 0, y: 0}, 

            cells: convertedCells, 

            jsonData: jsonMap, 

            gameData: jsonMap.game, 

            renderType: 'hex', 

            cellSize: jsonMap.game.grid.cellSize || 40, 

            originalCanvasWidth: originalCanvasWidth, 

            originalCanvasHeight: originalCanvasHeight, 

            mapType: mapType // Сохраняем тип карты 

        }; 

    } 

 

    getMonsterFromCell(cellData) { 

        if (!cellData || cellData.type !== 'monster' || !cellData.monster_id) { 

            return null; 

        } 

        Const battleSystem = window.game?.systems?.battle; 

        If (!battleSystem) return null; 

        Return battleSystem.getMonsterById(cellData.monster_id); 

    } 

 

    initCanvas() { 

        const container = document.querySelector('.tactical-map-visual'); 

        if (!container) { 

            console.log(«❌ Контейнер для карты не найден»); 

            return; 

        } 

 

        Container.innerHTML = ''; 

        This.canvas = document.createElement('canvas'); 

        This.canvas.id = 'tacticalMapCanvas'; 

        This.canvas.style.width = '100%'; 

        This.canvas.style.height = '100%'; 

        This.canvas.style.position = 'absolute'; 

        This.canvas.style.top = '0'; 

        This.canvas.style.left = '0'; 

        This.canvas.style.cursor = 'pointer'; 

         

        Container.appendChild(this.canvas); 

         

        This.ctx = this.canvas.getContext('2d'); 

         

        This.calculateMapPositioning(); 

        This.setupCanvasEventListeners(); 

         

        This.canvasInitialized = true; 

        Console.log(«✅ Canvas инициализирован»); 

         

        This.drawTacticalMap(); 

    } 

 

    calculateMapPositioning() { 

        // Используем currentTacticalMap для отрисовки, даже если это Локальная карта 

        If (!this.currentTacticalMap || !this.canvas) return; 

 

        Const container = document.querySelector('.tactical-map-visual'); 

        If (!container) return; 

 

        Const rect = container.getBoundingClientRect(); 

         

        Const editorWidth = this.currentTacticalMap.originalCanvasWidth || 1024; 

        Const editorHeight = this.currentTacticalMap.originalCanvasHeight || 1024; 

         

        Console.log(`🎯 Editor canvas: ${editorWidth}x${editorHeight}`); 

        Console.log(`📐 Container: ${rect.width}x${rect.height}`); 

 

        Const scaleX = rect.width / editorWidth; 

        Const scaleY = rect.height / editorHeight; 

         

        // Используем scale, чтобы карта вписывалась полностью 

        Const scale = Math.min(scaleX, scaleY, 1.0); 

         

        Const offsetX = (rect.width – editorWidth * scale) / 2; 

        Const offsetY = (rect.height – editorHeight * scale) / 2; 

 

        Console.log(`📏 Scale: ${scale.toFixed(3)}, Offset: [${offsetX.toFixed(1)}, ${offsetY.toFixed(1)}]`); 

 

        This.currentTacticalMap.displayScale = scale; 

        This.currentTacticalMap.displayOffsetX = offsetX; 

        This.currentTacticalMap.displayOffsetY = offsetY; 

 

        Object.values(this.currentTacticalMap.cells).forEach(cell => { 

            Const originalX = cell.originalX || cell.x; 

            Const originalY = cell.originalY || cell.y; 

             

            Cell.displayX = originalX * scale + offsetX; 

            Cell.displayY = originalY * scale + offsetY; 

        }); 

 

        This.canvas.width = rect.width; 

        This.canvas.height = rect.height; 

    } 

 

    setupCanvasEventListeners() { 

        if (!this.canvas) return; 

         

        this.canvas.addEventListener('click', € => this.handleCanvasClick€); 

        this.canvas.addEventListener('mousemove', € => this.handleCanvasHover€); 

        this.canvas.addEventListener('mouseleave', () => this.hideTooltip()); 

         

        window.addEventListener('resize', () => { 

            setTimeout(() => { 

                if (this.canvasInitialized) { 

                    this.calculateMapPositioning(); 

                    this.forceRedraw(); 

                } 

            }, 100); 

        }); 

    } 

 

    // ========== ОБРАБОТКА КЛИКОВ И ПЕРЕХОДОВ ========== 

     

    handleCanvasClick€ { 

        if (!this.currentTacticalMap) return; 

 

        const rect = this.canvas.getBoundingClientRect(); 

        const x = e.clientX – rect.left; 

        const y = e.clientY – rect.top; 

 

        const hex = this.getHexAtCanvasPosition(x, y); 

         

        if (!hex) return; 

 

        console.log(`🎲 Клик по клетке: [${hex.col}, ${hex.row}] тип: ${hex.type}`); 

 

        // 1. ПРОВЕРКА НА ВХОД В ЗДАНИЕ/ТАКТИЧЕСКУЮ КАРТУ 

        // Если мы на локальной карте и у клетки есть свойство tacticalMap 

        If (this.currentMapType === 'local' && hex.tacticalMap) { 

            This.enterTacticalMap(hex); 

            Return; 

        } 

         

        // 2. ПРОВЕРКА НА ВЫХОД ИЗ ТАКТИЧЕСКОЙ КАРТЫ 

        // Если мы на тактической карте и кликнули на «exit» 

        If (this.currentMapType === 'tactical' && hex.type === 'exit') { 

            This.exitToLocalMap(); 

            Return; 

        } 

 

        // 3. ОБЫЧНОЕ ПЕРЕМЕЩЕНИЕ / БОЙ 

        If (hex.passable !== false || hex.type === 'monster') { 

            This.moveOnTacticalMap(hex.col, hex.row); 

        } 

    } 

 

    // --- МЕТОДЫ НАВИГАЦИИ (ВХОД / ВЫХОД) --- 

 

    Async enterTacticalMap(entranceCell) { 

        If (!entranceCell.tacticalMap) return; 

         

        Console.log(`🚪 Попытка входа в: ${entranceCell.tacticalMap}`); 

 

        // 1. Сохраняем текущее состояние (Локальную карту) в стек 

        This.saveCurrentMapToStack(); 

 

        // 2. Пытаемся загрузить тактическую карту 

        Await this.loadTacticalMapFile(entranceCell.tacticalMap); 

    } 

 

    exitToLocalMap() { 

        if (this.mapStack.length === 0) { 

            console.log(«🚫 Стек карт пуст, некуда выходить»); 

            return; 

        } 

 

        Console.log(«🚪 Выход из тактической карты…»); 

 

        // 1. Восстанавливаем состояние из стека 

        This.restoreLocalMapFromStack(); 

    } 

 

    saveCurrentMapToStack() { 

        const mapState = { 

            map: this.currentTacticalMap, 

            playerPosition: {…this.playerTacticalPosition}, // Копируем позицию 

            mapType: this.currentMapType, 

            // Можно добавить состояние монстров, если нужно 

        }; 

        This.mapStack.push(mapState); 

        Console.log(`💾 Карта сохранена в стек. Размер стека: ${this.mapStack.length}`); 

    } 

 

    restoreLocalMapFromStack() { 

        const savedState = this.mapStack.pop(); 

        if (savedState) { 

            this.currentTacticalMap = savedState.map; 

            this.playerTacticalPosition = savedState.playerPosition; 

            this.currentMapType = savedState.mapType; 

             

            console.log(`♻️ Восстановлена карта: ${this.currentTacticalMap.name}`); 

             

            // Перерисовываем 

            If (this.canvasInitialized) { 

                This.calculateMapPositioning(); 

                This.drawTacticalMap(); 

            } 

             

            // Обновляем UI 

            If (window.game) { 

                Window.game.showNotification(`Возврат в ${this.currentTacticalMap.name}`, 'info'); 

            } 

        } 

    } 

 

    Async loadTacticalMapFile(mapPath) { 

        Try { 

            Console.log(`📥 Загрузка файла тактической карты: ${mapPath}`); 

             

            // Проверяем, может это не полный путь 

            Let fullPath = mapPath; 

            If (!mapPath.includes('/') && !mapPath.includes('.json')) { 

                 // Если передано просто имя, например «tavern» 

                 fullPath = `data/maps/tactical/${mapPath}.json`; 

            } 

 

            Const response = await fetch(fullPath); 

            If (!response.ok) { 

                Throw new Error(`HTTP error ${response.status}`); 

            } 

             

            Const mapData = await response.json(); 

            Const tacticalMap = this.convertTigrimionJSONToMap(mapData, 'tactical'); 

             

            If (tacticalMap) { 

                This.currentTacticalMap = tacticalMap; 

                This.currentMapType = 'tactical'; 

                This.setPlayerToStartPosition(); // Ставим на player_start новой карты 

                 

                // Перерисовка 

                If (this.canvasInitialized) { 

                    This.calculateMapPositioning(); 

                    This.drawTacticalMap(); 

                } 

                 

                Console.log(`✅ Вход выполнен в: ${tacticalMap.name}`); 

                If (window.game) window.game.showNotification(`Вход: ${tacticalMap.name}`, 'success'); 

            } 

 

        } catch (error) { 

            Console.error(`❌ Ошибка при загрузке тактической карты ${mapPath}:`, error); 

            If (window.game) window.game.showNotification(«Ошибка загрузки карты», 'error'); 

        } 

    } 

 

    setPlayerToStartPosition() { 

        if (!this.currentTacticalMap) return; 

         

        // Ищем клетку player_start 

        Const startCell = Object.values(this.currentTacticalMap.cells) 

            .find(cell => cell.type === 'player_start'); 

         

        If (startCell) { 

            This.playerTacticalPosition = {x: startCell.col, y: startCell.row}; 

            Console.log(`🎯 Герой перемещен на старт: [${startCell.col}, ${startCell.row}]`); 

        } 

    } 

 

    // --- КОНЕЦ МЕТОДОВ НАВИГАЦИИ --- 

 

    handleCanvasHover€ { 

        if (!this.currentTacticalMap) return; 

 

        const rect = this.canvas.getBoundingClientRect(); 

        const x = e.clientX – rect.left; 

        const y = e.clientY – rect.top; 

 

        const hex = this.getHexAtCanvasPosition(x, y); 

 

        if (this.tooltipTimeout) { 

            clearTimeout(this.tooltipTimeout); 

            this.tooltipTimeout = null; 

        } 

 

        Const prevHex = this.currentTooltip; 

 

        If (!hex || (prevHex && hex && (prevHex.col !== hex.col || prevHex.row !== hex.row))) { 

            This.hideTooltip(); 

        } 

 

        If (hex && (!prevHex || prevHex.col !== hex.col || prevHex.row !== hex.row)) { 

            This.tooltipTimeout = setTimeout(() => { 

                This.showTooltipForHex(hex, e.clientX, e.clientY); 

            }, 200); 

        } 

    } 

 

    getHexAtCanvasPosition(canvasX, canvasY) { 

        if (!this.currentTacticalMap) return null; 

         

        const hexSize = (this.currentTacticalMap.cellSize || 40) * 0.8; 

 

        // Кэшируем результат поиска если координаты похожи 

        If (this.lastHoveredHex) { 

            Const centerX = this.lastHoveredHex.displayX; 

            Const centerY = this.lastHoveredHex.displayY; 

            If (centerX && centerY) { 

                Const distance = Math.sqrt( 

                    Math.pow(canvasX – centerX, 2) + Math.pow(canvasY – centerY, 2) 

                ); 

                If (distance <= hexSize) { 

                    Return this.lastHoveredHex; 

                } 

            } 

        } 

 

        For (const cell of Object.values(this.currentTacticalMap.cells)) { 

            Const centerX = cell.displayX; 

            Const centerY = cell.displayY; 

             

            If (!centerX || !centerY) continue; 

 

            Const distance = Math.sqrt( 

                Math.pow(canvasX – centerX, 2) + Math.pow(canvasY – centerY, 2) 

            ); 

 

            If (distance <= hexSize) { 

                This.lastHoveredHex = cell; 

                Return cell; 

            } 

        } 

 

        This.lastHoveredHex = null; 

        Return null; 

    } 

 

    showTooltipForHex(hex, mouseX, mouseY) { 

        const tooltipText = this.getTooltipTextForHex(hex); 

        if (!tooltipText) { 

            this.hideTooltip(); 

            return; 

        } 

 

        If (!this.tooltipElement) { 

            This.createTooltipElement(); 

        } 

 

        This.removeHighlight(); 

        This.currentTooltip = hex; 

        Hex.isHighlighted = true; 

 

        This.tooltipElement.textContent = tooltipText; 

        This.tooltipElement.style.display = 'block'; 

 

        Const tooltipRect = this.tooltipElement.getBoundingClientRect(); 

        Const viewportWidth = window.innerWidth; 

        Const viewportHeight = window.innerHeight; 

 

        Let left = mouseX + 15; 

        Let top = mouseY + 15; 

 

        If (left + tooltipRect.width > viewportWidth – 10) { 

            Left = mouseX – tooltipRect.width – 15; 

        } 

        If (top + tooltipRect.height > viewportHeight – 10) { 

            Top = mouseY – tooltipRect.height – 15; 

        } 

 

        This.tooltipElement.style.left = left + 'px'; 

        This.tooltipElement.style.top = top + 'px'; 

 

        This.drawTacticalMap(); 

    } 

 

    getTooltipTextForHex(hex) { 

        if (!hex.visible) return null; 

 

        // ПРИОРИТЕТ 1: Кастомная подсказка из JSON 

        If (hex.tooltip) return hex.tooltip; 

 

        // ПРИОРИТЕТ 2: Подсказка о переходе 

        If (hex.tacticalMap) return `🚪 Вход: ${hex.type}\n(Нажмите для входа)`; 

 

        // ПРИОРИТЕТ 3: Стандартные подсказки 

        Const defaultTooltips = { 

            'player_start': '⭐ Стартовая позиция', 

            'monster': '👹 Враждебная территория', 

            'chest': '📦 Тайный сундук', 

            'npc': '🧙 Таинственный незнакомец', 

            'exit': '🚪 Выход с карты', 

            'obstacle': '🪨 Препятствие', 

            'active': '🟢 Проходимая местность', 

            'inactive': '🔴 Непроходимая местность', 

            'tree': '🌲 Дерево', 

            'elegant_tree': '🎄 Изящное дерево', 

            'cave': '🕳️ Пещера', 

            'lava_crack': '🌋 Лавовый разлом', 

            'graveyard_cross': '⚰️ Кладбищенский крест', 

            'bandit_camp': '⚔️ Лагерь разбойников', 

            'orc_camp': '👹 Лагерь орков', 

            'black_monolith': '⬛ Черный монолит', 

            'weapon': '⚔️ Оружие', 

            'armor': '🛡️ Доспех', 

            'village': '🏘️ Деревня', 

            'castle': '🏰 Замок', 

            'water': '💧 Водная поверхность', 

            'campfire': '🔥 Костер', 

            'merchant': '🛒 Торговец', 

            'cart': '🛒 Телега', 

            'traveler': '🚶 Путник', 

            'portal': '🌀 Магический портал', 

            'ancient_rune': '🔰 Древняя руна', 

            'magic_crystal': '💎 Магический кристалл' 

        }; 

 

        Return defaultTooltips[hex.type] || null; 

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

        Document.body.appendChild(this.tooltipElement); 

    } 

 

    hideTooltip() { 

        if (this.tooltipElement) { 

            this.tooltipElement.style.display = 'none'; 

        } 

        This.removeHighlight(); 

        If (this.tooltipTimeout) { 

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

                If (cell.isHighlighted) { 

                    Cell.isHighlighted = false; 

                    needsRedraw = true; 

                } 

            }); 

        } 

        This.currentTooltip = null; 

        If (needsRedraw && this.canvasInitialized) { 

            This.drawTacticalMap(); 

        } 

    } 

 

    drawTacticalMap() { 

        if (!this.ctx || !this.currentTacticalMap) { 

            console.log(«❌ Canvas context или карта не доступна»); 

            return; 

        } 

 

        Const canvas = this.canvas; 

        This.ctx.clearRect(0, 0, canvas.width, canvas.height); 

         

        This.drawBackground(); 

        This.drawHexes(); 

         

        If (this.showGrid) { 

            This.drawHexGrid(); 

        } 

    } 

 

    drawBackground() { 

        const map = this.currentTacticalMap; 

        if (!map.image) { 

            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height); 

            gradient.addColorStop(0, '#1a1a2e'); 

            gradient.addColorStop(1, '#16213e'); 

            this.ctx.fillStyle = gradient; 

            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); 

            return; 

        } 

 

        // Используем уже вычисленные параметры из calculateMapPositioning 

        Const editorWidth = map.originalCanvasWidth || 1024; 

        Const editorHeight = map.originalCanvasHeight || 1024; 

        Const scale = map.displayScale || 1; 

        Const offsetX = map.displayOffsetX || 0; 

        Const offsetY = map.displayOffsetY || 0; 

 

        Const img = new Image(); 

        Img.onload = () => { 

            // Проверяем, не сменилась ли карта пока грузилась картинка 

            If (this.currentTacticalMap !== map) return; 

             

            This.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); 

            This.ctx.drawImage( 

                Img,  

                offsetX,  

                offsetY,  

                editorWidth * scale,  

                editorHeight * scale 

            ); 

            This.drawHexes(); 

            If (this.showGrid) { 

                This.drawHexGrid(); 

            } 

        }; 

        Img.onerror = () => { 

            Console.error(«❌ Ошибка загрузки фона карты»); 

            Const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height); 

            Gradient.addColorStop(0, '#1a1a2e'); 

            Gradient.addColorStop(1, '#16213e'); 

            This.ctx.fillStyle = gradient; 

            This.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); 

            This.drawHexes(); 

        }; 

        Img.src = map.image; 

    } 

 

    drawHexGrid() { 

        const cells = Object.values(this.currentTacticalMap.cells); 

        const hexSize = this.currentTacticalMap.cellSize || 40; 

         

        this.ctx.save(); 

        this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.6)'; 

        this.ctx.lineWidth = 1; 

         

        cells.forEach(cell => { 

            if (cell.visible) { 

                const centerX = cell.displayX; 

                const centerY = cell.displayY; 

                 

                if (!centerX || !centerY) return; 

 

                this.ctx.beginPath(); 

                for (let i = 0; i < 6; i++) { 

                    const angle = Math.PI / 3 * i + Math.PI / 6; 

                    const x = centerX + hexSize * Math.cos(angle); 

                    const y = centerY + hexSize * Math.sin(angle); 

                    if (i === 0) this.ctx.moveTo(x, y); 

                    else this.ctx.lineTo(x, y); 

                } 

                This.ctx.closePath(); 

                This.ctx.stroke(); 

            } 

        }); 

        This.ctx.restore(); 

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

        const centerX = cell.displayX; 

        const centerY = cell.displayY; 

         

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

        This.ctx.closePath(); 

         

        If (this.showGrid) { 

            This.ctx.strokeStyle = 'rgba(76, 201, 240, 0.3)'; 

            This.ctx.lineWidth = 1; 

            This.ctx.stroke(); 

        } 

        This.ctx.restore(); 

    } 

 

    drawHexContent(cell) { 

        const centerX = cell.displayX; 

        const centerY = cell.displayY; 

         

        if (!centerX || !centerY) return; 

 

        this.ctx.save(); 

 

        // Рисуем подсветку если гекс выделен 

        If (cell.isHighlighted) { 

            Const hexSize = this.currentTacticalMap.cellSize || 40; 

            This.ctx.beginPath(); 

            For (let i = 0; i < 6; i++) { 

                Const angle = Math.PI / 3 * i + Math.PI / 6; 

                Const x = centerX + hexSize * Math.cos(angle); 

                Const y = centerY + hexSize * Math.sin(angle); 

                If (i === 0) this.ctx.moveTo(x, y); 

                Else this.ctx.lineTo(x, y); 

            } 

            This.ctx.closePath(); 

            This.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)'; 

            This.ctx.fill(); 

        } 

 

        This.ctx.textAlign = 'center'; 

        This.ctx.textBaseline = 'middle'; 

         

        Let symbol = '·'; 

        Let color = '#ffffff'; 

        Let fontSize = 16; 

 

        // Проверяем позицию игрока 

        If (cell.col === this.playerTacticalPosition.x && cell.row === this.playerTacticalPosition.y) { 

            Symbol = '🎯'; 

            fontSize = 20; 

        } else { 

            If (cell.type === 'active' && !cell.objectType) { 

                Symbol = '·'; 

                Color = '#ffffff'; 

                fontSize = 24; 

            } else { 

                Symbol = this.objectSymbols[cell.type] || '·'; 

                 

                Switch(cell.type) { 

                    Case 'monster': 

                    Case 'orc_camp': 

                        Color = '#ef4444'; break; 

                    Case 'chest': 

                        Color = '#f59e0b'; break; 

                    Case 'npc': 

                    Case 'merchant': 

                    Case 'traveler': 

                        Color = '#3b82f6'; break; 

                    Case 'exit': 

                    Case 'portal': 

                        Color = '#8b5cf6'; break; 

                    Case 'obstacle': 

                    Case 'tree': 

                    Case 'elegant_tree': 

                    Case 'cave': 

                    Case 'black_monolith': 

                        Color = '#6b7280'; break; 

                    Case 'lava_crack': 

                        Color = '#dc2626'; break; 

                    Case 'graveyard_cross': 

                        Color = '#d6d3d1'; break; 

                    Case 'bandit_camp': 

                        Color = '#ca8a04'; break; 

                    Case 'weapon': 

                        Color = '#94a3b8'; break; 

                    Case 'armor': 

                        Color = '#60a5fa'; break; 

                    Case 'village': 

                        Color = '#fbbf24'; break; 

                    Case 'castle': 

                        Color = '#c084fc'; break; 

                    Case 'water': 

                        Color = '#0ea5e9'; break; 

                    Case 'campfire': 

                        Color = '#ea580c'; break; 

                    Case 'cart': 

                        Color = '#78350f'; break; 

                    Case 'ancient_rune': 

                        Color = '#fde047'; break; 

                    Case 'magic_crystal': 

                        Color = '#c4b5fd'; break; 

                    Case 'inactive': 

                        Color = '#ef4444'; break; 

                    Default: 

                        Color = '#ffffff'; 

                } 

            } 

        } 

 

        This.ctx.font = `bold ${fontSize}px Arial`; 

        This.ctx.fillStyle = color; 

        This.ctx.fillText(symbol, centerX, centerY); 

         

        This.ctx.restore(); 

    } 

 

    // ========== СИСТЕМА ПЕРЕМЕЩЕНИЯ ========== 

     

    moveOnTacticalMap(x, y) { 

        if (!this.currentHero) { 

            console.error(«❌ Герой не выбран!»); 

            if (window.game) { 

                window.game.showNotification(«❌ Герой не выбран!», 'error'); 

            } 

            Return; 

        } 

 

        If (!this.currentTacticalMap) return; 

 

        Const cellKey = `${x},${y}`; 

        Const cellData = this.currentTacticalMap.cells[cellKey]; 

 

        If (!cellData) { 

            If (window.game) window.game.showNotification(«Эта клетка не существует!», 'error'); 

            Return; 

        } 

 

        // Проверка на соседство 

        Const neighbors = this.getHexNeighbors(this.playerTacticalPosition.y, this.playerTacticalPosition.x); 

        Const isReachable = neighbors.some(neighbor => neighbor.row === y && neighbor.col === x); 

 

        If (!isReachable) { 

            If (window.game) window.game.showNotification(«Слишком далеко!», 'error'); 

            Return; 

        } 

 

        This.hideOverlay(); 

        setTimeout(() => { 

            this.startTacticalBattleForMovement(x, y, cellData); 

        }, 50); 

    } 

 

    startTacticalBattleForMovement(targetX, targetY, cellData) { 

        const battleSystem = window.game?.systems?.battle; 

        if (!battleSystem) return; 

 

        this.pendingMovement = { x: targetX, y: targetY }; 

 

        const specificMonster = this.getMonsterFromCell(cellData); 

         

        if (specificMonster && cellData.monster_id) { 

            console.log(`🎯 Бой с монстром: ${specificMonster.name}`); 

            battleSystem.startBattleWithSpecificMonster(this.currentHero, specificMonster, 'movement'); 

        } else { 

            Const randomMonster = this.getRandomMonster(); 

            If (!randomMonster) { 

                // Если монстров нет (или не загрузились), просто перемещаем 

                This.completeMovementAfterBattle(true);  

                Return; 

            } 

            Console.log(`🎲 Случайный бой: ${randomMonster.name}`); 

            battleSystem.startBattleWithMonster(this.currentHero, randomMonster.id, 'movement'); 

        } 

    } 

 

    getRandomMonster() { 

        const battleSystem = window.game?.systems?.battle; 

        if (!battleSystem || !battleSystem.getRandomMonsterForMovement) return null; 

        return battleSystem.getRandomMonsterForMovement(); 

    } 

 

    completeMovementAfterBattle(victory) { 

        if (!this.pendingMovement) return; 

 

        const targetX = this.pendingMovement.x; 

        const targetY = this.pendingMovement.y; 

 

        if (!this.currentHero) return; 

 

        if (victory) { 

            this.playerTacticalPosition = {x: targetX, y: targetY}; 

            console.log(`✅ Перемещение успешно: [${targetX}, ${targetY}]`); 

        } else { 

            // При поражении возвращаем на старт текущей карты 

            Const startPosition = this.currentTacticalMap.startPosition; 

            This.playerTacticalPosition = {…startPosition}; 

            If (window.game) window.game.showNotification(«Поражение! Возврат на старт.», 'error'); 

        } 

 

        This.saveMapState(); 

         

        // Восстанавливаем отображение карты 

        If (this.activeOverlay === 'tactical-map') { 

            This.calculateMapPositioning(); 

            This.drawTacticalMap(); 

        } 

         

        This.pendingMovement = null; 

    } 

 

    getHexNeighbors(currentRow, currentCol) { 

        if (!this.currentTacticalMap) return []; 

        const neighbors = []; 

        const currentCell = this.currentTacticalMap.cells[`${currentCol},${currentRow}`]; 

         

        if (!currentCell) return []; 

 

        const hexSize = this.currentTacticalMap.cellSize || 40; 

        const geometry = this.getHexGeometry(hexSize); 

 

        Object.values(this.currentTacticalMap.cells).forEach(potentialNeighbor => { 

            If (potentialNeighbor.col === currentCol && potentialNeighbor.row === currentRow) return; 

 

            Const centerX = potentialNeighbor.displayX || potentialNeighbor.x; 

            Const centerY = potentialNeighbor.displayY || potentialNeighbor.y; 

            Const currentCenterX = currentCell.displayX || currentCell.x; 

            Const currentCenterY = currentCell.displayY || currentCell.y; 

             

            Const dx = centerX – currentCenterX; 

            Const dy = centerY – currentCenterY; 

            Const distance = Math.sqrt(dx * dx + dy * dy); 

 

            If (this.areHexesAdjacent(currentCell, potentialNeighbor, hexSize)) { 

                If (potentialNeighbor.visible) { 

                    // Монстры и проходимые клетки считаются соседями 

                    If (potentialNeighbor.type === 'monster' || potentialNeighbor.passable !== false) { 

                        Neighbors.push({ 

                            Row: potentialNeighbor.row,  

                            Col: potentialNeighbor.col,  

                            Cell: potentialNeighbor, 

                            Distance: distance 

                        }); 

                    } 

                } 

            } 

        }); 

        Return neighbors; 

    } 

 

    getHexGeometry(hexSize) { 

        return { 

            size: hexSize, 

            horizontalDistance: Math.sqrt(3) * hexSize, 

            verticalDistance: 1.5 * hexSize, 

            diagonalDistance: Math.sqrt(3.25) * hexSize, 

            tolerance: hexSize * 0.4 

        }; 

    } 

 

    areHexesAdjacent(cell1, cell2, hexSize) { 

        if (!cell1 || !cell2) return false; 

        const geometry = this.getHexGeometry(hexSize); 

         

        const dx = (cell2.displayX || cell2.x) – (cell1.displayX || cell1.x); 

        const dy = (cell2.displayY || cell2.y) – (cell1.displayY || cell1.y); 

        const distance = Math.sqrt(dx * dx + dy * dy); 

         

        const isHorizontalAdjacent = Math.abs(distance – geometry.horizontalDistance) < geometry.tolerance; 

        const isVerticalAdjacent = Math.abs(distance – geometry.verticalDistance) < geometry.tolerance; 

        const isDiagonalAdjacent = Math.abs(distance – geometry.diagonalDistance) < geometry.tolerance; 

         

        return isHorizontalAdjacent || isVerticalAdjacent || isDiagonalAdjacent; 

    } 

 

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ И ИНИЦИАЛИЗАЦИЯ ========== 

 

    createTestMaps() { 

        // Создаем тестовую карту, если ничего не загрузилось 

        This.localMaps = [{ 

            Id: 'test_local_1', 

            Name: «Тестовая Долина», 

            Width: 8, 

            Height: 8, 

            startPosition: {x: 4, y: 4}, 

            cells: {}, // Пустой объект, должен быть заполнен в реальной карте 

            cellSize: 40 

        }]; 

    } 

 

    createFallbackMaps() { 

        this.createTestMaps(); 

    } 

 

    setCurrentLocalMap(localMap) { 

        if (!localMap) return; 

        this.currentLocalMap = localMap; 

        this.currentTacticalMap = localMap; // Локальная карта используется в «тактическом» режиме просмотра 

        this.playerLocalPosition = {…localMap.startPosition}; 

        this.playerTacticalPosition = {…localMap.startPosition}; 

        this.currentMapType = 'local'; 

         

        console.log(`📍 Установлена активная локальная карта: ${localMap.name}`); 

         

        if (this.canvasInitialized) { 

            this.calculateMapPositioning(); 

            this.drawTacticalMap(); 

        } 

    } 

 

    setStartPositions() { 

        // ПРИОРИТЕТ 1: Локальные карты 

        If (this.localMaps.length > 0) { 

            Const localMap = this.localMaps[0]; 

            This.setCurrentLocalMap(localMap); 

        } 

        // ПРИОРИТЕТ 2: Тактические карты (если нет локальных) 

        Else if (this.tacticalMaps.length > 0) { 

            This.currentTacticalMap = this.tacticalMaps[0]; 

            This.playerTacticalPosition = {…this.currentTacticalMap.startPosition}; 

            This.currentMapType = 'tactical'; 

            Console.log(`🎯 Установлена стартовая тактическая карта: ${this.currentTacticalMap.name}`); 

        } 

    } 

 

    // РЕНДЕРИНГ HTML 

     

    renderTigrimionTacticalMap() { 

        const map = this.currentTacticalMap; 

        if (!map) return '<div class=»map-error»>Карта не выбрана</div>'; 

         

        return ` 

            <div class=»tactical-map-header»> 

                <h4>${map.name}</h4> 

                <button class=»btn-close» onclick=»game.hideOverlay()»>✕</button> 

            </div> 

            <div class=»tactical-map-content»> 

                <div class=»tactical-map-visual»> 

                    </div> 

            </div> 

        `; 

    } 

 

    renderLocalMap() { 

        // Используем тот же рендерер, так как механика едина 

        If (this.currentLocalMap) { 

            Return this.renderTigrimionTacticalMap(); 

        } 

        Return '<div class=»map-error»>Локальная карта не загружена</div>'; 

    } 

 

    renderGlobalMap() { 

        return '<div class=»map-error»>Глобальная карта пока не доступна</div>'; 

    } 

 

    showOverlay(overlayType) { 

        const container = document.getElementById('overlay-container'); 

        if (!container) return; 

 

        this.activeOverlay = overlayType; 

 

        if (overlayType === 'tactical-map' || overlayType === 'local-map') { 

            // Если нажали «Тактическая» или «Локальная», показываем currentTacticalMap 

            // (который может быть и локальной картой) 

            Container.innerHTML = ` 

                <div class=»overlay-content tactical-map-overlay»> 

                    ${this.renderTigrimionTacticalMap()} 

                </div> 

            `; 

            Container.style.display = 'block'; 

            setTimeout(() => { 

                this.initCanvas(); 

            }, 50); 

        } 

    } 

 

    hideOverlay() { 

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

        } 

    } 

 

    toggleGrid() { 

        this.showGrid = !this.showGrid; 

        this.drawTacticalMap(); 

    } 

 

    showTacticalMapEditor() { 

        if (!this.currentHero) { 

            if (window.game) { 

                window.game.showNotification(«❌ Сначала выберите героя!», 'error'); 

                setTimeout(() => { window.game.showHeroSelection(); }, 1000); 

            } 

            Return; 

        } 

        This.showOverlay('tactical-map'); 

    } 

 

    forceRedraw() { 

        if (this.canvasInitialized) { 

            this.calculateMapPositioning(); 

            this.drawTacticalMap(); 

        } 

    } 

 

    saveMapState() { 

        const state = { 

            playerTacticalPosition: this.playerTacticalPosition, 

            currentMapStack: this.mapStack, // Сохраняем стек переходов 

            currentMapId: this.currentTacticalMap?.id, 

            currentMapType: this.currentMapType 

        }; 

        localStorage.setItem('mapSystemState', JSON.stringify(state)); 

        console.log(«💾 Состояние карт сохранено»); 

    } 

 

    loadMapState() { 

        try { 

            const saved = localStorage.getItem('mapSystemState'); 

            if (!saved) return false; 

             

            const state = JSON.parse(saved); 

             

            if (state.playerTacticalPosition) { 

                this.playerTacticalPosition = state.playerTacticalPosition; 

            } 

             

            If (state.currentMapStack) { 

                This.mapStack = state.currentMapStack; 

            } 

 

            If (state.currentMapType) { 

                This.currentMapType = state.currentMapType; 

            } 

 

            // Пытаемся восстановить текущую карту по ID 

            Let restoredMap = null; 

            If (state.currentMapType === 'local') { 

                restoredMap = this.localMaps.find(m => m.id === state.currentMapId); 

            } else { 

                restoredMap = this.tacticalMaps.find(m => m.id === state.currentMapId); 

            } 

 

            If (restoredMap) { 

                This.currentTacticalMap = restoredMap; 

            } 

 

            Console.log(«💾 Состояние карт загружено»); 

            Return true; 

        } catch (error) { 

            Console.error(«❌ Ошибка загрузки состояния карт:», error); 

            Return false; 

        } 

    } 

 

    debugInfo() { 

        console.group(«🗺️ MapSystem Debug Info»); 

        console.log(«Тип карты:», this.currentMapType); 

        console.log(«Тактическая позиция:», this.playerTacticalPosition); 

        console.log(«Стек карт:», this.mapStack); 

        console.log(«Текущая карта:», this.currentTacticalMap?.name); 

        console.log(«Всего локальных карт:», this.localMaps.length); 

        console.log(«Всего тактических карт:», this.tacticalMaps.length); 

        console.groupEnd(); 

    } 

} 

 

Window.MapSystem = MapSystem; 

Console.log(«📦 MapSystem модуль загружен»); 

 
