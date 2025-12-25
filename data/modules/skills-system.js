"use strict";

// ========== MODULE: SkillsSystem ==========
class SkillsSystem {
    constructor(game) {
        this.game = game;
        this.skills = [];
        this.unlockedSkills = new Set();
        this.availableSkillPoints = 0;
        this.selectedSkill = null;
        this.skillIcons = {
            'health': '❤️',
            'damage': '⚔️',
            'crit': '🎯',
            'vampire': '🩸',
            'armor': '🛡️',
            'gold': '💰',
            'regen': '⚡',
            'penetration': '💥'
        };
        
        this.initializeSkills();
        console.log("✅ SkillsSystem инициализирован");
    }

    // ========== ИНИЦИАЛИЗАЦИЯ НАВЫКОВ ==========
    initializeSkills() {
        // Создаем матрицу навыков 8x8
        this.skills = [];
        let skillId = 1;
        
        // 8 типов бонусов
        const bonusTypes = ['health', 'damage', 'crit', 'vampire', 'armor', 'gold', 'regen', 'penetration'];
        const bonusNames = {
            'health': 'Здоровье',
            'damage': 'Урон',
            'crit': 'Крит. удар',
            'vampire': 'Вампиризм',
            'armor': 'Броня',
            'gold': 'Золото',
            'regen': 'Регенерация',
            'penetration': 'Пробитие брони'
        };
        
        // Создаем 8 строк по 8 навыков
        for (let row = 1; row <= 8; row++) {
            for (let col = 1; col <= 8; col++) {
                // Каждая колонка соответствует типу бонуса
                const bonusType = bonusTypes[col - 1];
                const bonusValue = this.calculateBonusValue(row, bonusType);
                
                // Определяем требования
                const requirements = this.calculateRequirements(row, col);
                
                // Определяем зависимости от других навыков
                const dependencies = this.calculateDependencies(row, col);
                
                // Определяем альтернативные навыки на том же уровне
                const alternatives = this.calculateAlternatives(row, col);
                
                this.skills.push({
                    id: skillId++,
                    row: row,
                    column: col,
                    name: `${bonusNames[bonusType]} ${row}`,
                    type: bonusType,
                    bonusValue: bonusValue,
                    description: this.getSkillDescription(bonusType, bonusValue),
                    icon: this.skillIcons[bonusType],
                    requirements: requirements,
                    dependencies: dependencies,
                    alternatives: alternatives,
                    level: row,
                    isChoiceNode: row === 1 || row === 2 || row === 4 || row === 8,
                    requiredSkillPoints: row, // Для разблокировки навыка на уровне N требуется N очков навыков
                    unlockOrder: row // Порядок разблокировки (от 1 до 8)
                });
            }
        }
        
        console.log(`📊 Навыки инициализированы: ${this.skills.length} навыков создано`);
    }

    calculateBonusValue(level, bonusType) {
        // Базовые значения бонусов в зависимости от уровня и типа
        const baseValues = {
            'health': 2,    // % к здоровью за уровень
            'damage': 1.5,  // % к урону за уровень
            'crit': 0.5,    // % к криту за уровень
            'vampire': 0.3, // % к вампиризму за уровень
            'armor': 1,     // % к броне за уровень
            'gold': 1.5,    // % к золоту за уровень
            'regen': 2,     // % к регенерации за уровень
            'penetration': 0.5 // % к пробитию брони за уровень
        };
        
        return parseFloat((baseValues[bonusType] * level).toFixed(1));
    }

    calculateRequirements(row, col) {
        const requirements = {
            heroLevel: row, // Требуемый уровень героя равен номеру строки
            skillPoints: row, // Требуемое количество очков навыков
            previousSkills: []
        };
        
        // Для строки 2 и выше требуются навыки из предыдущей строки
        if (row > 1) {
            // Требуется хотя бы один навык из предыдущей строки
            requirements.previousSkills = {
                row: row - 1,
                count: 1
            };
        }
        
        // Для выборочных нод (уровни 1, 2, 4, 8) дополнительные требования
        if (row === 1) {
            requirements.skillPoints = 1;
        } else if (row === 2) {
            requirements.skillPoints = 2;
        } else if (row === 4) {
            requirements.skillPoints = 4;
        } else if (row === 8) {
            requirements.skillPoints = 8;
        }
        
        return requirements;
    }

    calculateDependencies(row, col) {
        const dependencies = [];
        
        if (row > 1) {
            // Зависимость от навыков в предыдущей строке
            // Навык зависит от навыков в том же столбце или соседних столбцах
            for (let prevCol = Math.max(1, col - 1); prevCol <= Math.min(8, col + 1); prevCol++) {
                const prevSkill = this.getSkillByPosition(row - 1, prevCol);
                if (prevSkill) {
                    dependencies.push(prevSkill.id);
                }
            }
        }
        
        return dependencies;
    }

    calculateAlternatives(row, col) {
        const alternatives = [];
        
        // Альтернативные навыки находятся в той же строке
        if (row === 1) {
            // На первом уровне - все навыки в строке альтернативны
            for (let altCol = 1; altCol <= 8; altCol++) {
                if (altCol !== col) {
                    const altSkill = this.getSkillByPosition(row, altCol);
                    if (altSkill) {
                        alternatives.push(altSkill.id);
                    }
                }
            }
        } else if (row === 2) {
            // На втором уровне - группы по 2 навыка
            const group = Math.floor((col - 1) / 2);
            for (let altCol = group * 2 + 1; altCol <= group * 2 + 2; altCol++) {
                if (altCol !== col) {
                    const altSkill = this.getSkillByPosition(row, altCol);
                    if (altSkill) {
                        alternatives.push(altSkill.id);
                    }
                }
            }
        } else if (row === 4) {
            // На четвертом уровне - группы по 2 навыка, но выбор между всеми нижними
            // Это специальный случай, обрабатывается отдельно
        } else if (row === 8) {
            // На восьмом уровне - все навыки в строке
            for (let altCol = 1; altCol <= 8; altCol++) {
                if (altCol !== col) {
                    const altSkill = this.getSkillByPosition(row, altCol);
                    if (altSkill) {
                        alternatives.push(altSkill.id);
                    }
                }
            }
        }
        
        return alternatives;
    }

    getSkillDescription(bonusType, value) {
        const descriptions = {
            'health': `Увеличивает максимальное здоровье на ${value}%`,
            'damage': `Увеличивает наносимый урон на ${value}%`,
            'crit': `Увеличивает шанс критического удара на ${value}%`,
            'vampire': `Увеличивает вампиризм на ${value}% от наносимого урона`,
            'armor': `Увеличивает броню на ${value}%`,
            'gold': `Увеличивает получаемое золото на ${value}%`,
            'regen': `Увеличивает регенерацию здоровья на ${value}%`,
            'penetration': `Увеличивает шанс пробития брони на ${value}%`
        };
        
        return descriptions[bonusType] || `Дает бонус: ${value}%`;
    }

    // ========== ОСНОВНЫЕ МЕТОДЫ ==========
    getSkillByPosition(row, column) {
        return this.skills.find(skill => skill.row === row && skill.column === column);
    }

    getSkillById(skillId) {
        return this.skills.find(skill => skill.id === skillId);
    }

    getUnlockedSkills() {
        return Array.from(this.unlockedSkills).map(id => this.getSkillById(id)).filter(skill => skill);
    }

    calculateTotalBonuses() {
        const totals = {
            health: 0,
            damage: 0,
            crit: 0,
            vampire: 0,
            armor: 0,
            gold: 0,
            regen: 0,
            penetration: 0
        };
        
        this.getUnlockedSkills().forEach(skill => {
            if (totals.hasOwnProperty(skill.type)) {
                totals[skill.type] += skill.bonusValue;
            }
        });
        
        return totals;
    }

    applyBonusesToHero(hero) {
        const bonuses = this.calculateTotalBonuses();
        
        // Применяем бонусы к герою через систему бонусов
        if (this.game.systems.bonus) {
            // Здесь можно добавить логику применения бонусов
            console.log("📊 Применены бонусы навыков:", bonuses);
        }
        
        return bonuses;
    }

    // ========== ПРОВЕРКИ ДОСТУПНОСТИ ==========
    canLearnSkill(skillId) {
        const skill = this.getSkillById(skillId);
        if (!skill) return false;
        
        // Уже разблокирован
        if (this.unlockedSkills.has(skillId)) {
            return false;
        }
        
        // Проверяем уровень героя
        const heroLevel = this.game.currentHero?.level || 0;
        if (heroLevel < skill.requirements.heroLevel) {
            return false;
        }
        
        // Проверяем очки навыков
        if (this.availableSkillPoints < skill.requirements.skillPoints) {
            return false;
        }
        
        // Проверяем зависимости (навыки из предыдущих строк)
        if (skill.dependencies.length > 0) {
            const hasDependency = skill.dependencies.some(depId => 
                this.unlockedSkills.has(depId)
            );
            
            if (!hasDependency) {
                return false;
            }
        }
        
        // Проверяем альтернативные пути (для выборочных нод)
        if (skill.isChoiceNode) {
            return this.canLearnChoiceSkill(skill);
        }
        
        return true;
    }

    canLearnChoiceSkill(skill) {
        // Для выборочных нод проверяем специальные правила
        
        if (skill.row === 1) {
            // Первый уровень: можно выбрать любой навык
            return this.availableSkillPoints >= 1;
        }
        
        if (skill.row === 2) {
            // Второй уровень: нужно выбрать между двумя в группе
            const group = Math.floor((skill.column - 1) / 2);
            const groupSkills = this.skills.filter(s => 
                s.row === 2 && 
                Math.floor((s.column - 1) / 2) === group
            );
            
            // Проверяем, не выбран ли уже навык из этой группы
            const alreadyUnlockedInGroup = groupSkills.some(s => 
                this.unlockedSkills.has(s.id)
            );
            
            return !alreadyUnlockedInGroup && this.availableSkillPoints >= 2;
        }
        
        if (skill.row === 4) {
            // Четвертый уровень: особые правила
            // Нужно иметь навыки из предыдущих уровней
            const hasRequiredFromRow3 = this.skills.some(s => 
                s.row === 3 && 
                this.unlockedSkills.has(s.id)
            );
            
            return hasRequiredFromRow3 && this.availableSkillPoints >= 4;
        }
        
        if (skill.row === 8) {
            // Восьмой уровень: можно выбрать любой, но требуется много очков
            return this.availableSkillPoints >= 8;
        }
        
        return false;
    }

    // ========== ОПЕРАЦИИ С НАВЫКАМИ ==========
    learnSkill(skillId) {
        const skill = this.getSkillById(skillId);
        if (!skill) {
            this.showNotification("❌ Навык не найден", "error");
            return false;
        }
        
        if (!this.canLearnSkill(skillId)) {
            this.showNotification("❌ Нельзя изучить этот навык", "error");
            return false;
        }
        
        // Для выборочных нод проверяем конфликты
        if (skill.isChoiceNode && skill.alternatives.length > 0) {
            const conflictSkill = skill.alternatives.find(altId => 
                this.unlockedSkills.has(altId)
            );
            
            if (conflictSkill) {
                this.showNotification("❌ Уже выбран альтернативный навык на этом уровне", "error");
                return false;
            }
        }
        
        // Тратим очки навыков
        this.availableSkillPoints -= skill.requirements.skillPoints;
        
        // Разблокируем навык
        this.unlockedSkills.add(skillId);
        
        // Применяем бонусы
        this.applyBonusesToHero(this.game.currentHero);
        
        // Сохраняем
        this.saveSkills();
        
        this.showNotification(`✅ Изучен навык: ${skill.name}`, "success");
        
        // Обновляем интерфейс
        if (this.game.currentHero) {
            this.game.systems.hero.calculateHeroStats(this.game.currentHero);
        }
        
        return true;
    }

    resetSkills() {
        if (this.unlockedSkills.size === 0) {
            this.showNotification("❌ Нет изученных навыков для сброса", "warning");
            return false;
        }
        
        if (!confirm("⚠️ Вы уверены, что хотите сбросить все навыки?\n\nВсе изученные навыки будут забыты, и очки навыков вернутся.")) {
            return false;
        }
        
        // Возвращаем очки навыков
        const spentPoints = Array.from(this.unlockedSkills).reduce((total, skillId) => {
            const skill = this.getSkillById(skillId);
            return total + (skill?.requirements.skillPoints || 0);
        }, 0);
        
        this.availableSkillPoints += spentPoints;
        
        // Очищаем изученные навыки
        this.unlockedSkills.clear();
        
        // Сохраняем
        this.saveSkills();
        
        this.showNotification("🔄 Все навыки сброшены", "success");
        
        // Обновляем интерфейс
        if (this.game.currentHero) {
            this.game.systems.hero.calculateHeroStats(this.game.currentHero);
        }
        
        return true;
    }

    // ========== СИСТЕМА ОЧКОВ НАВЫКОВ ==========
    addSkillPoints(points) {
        this.availableSkillPoints += points;
        this.saveSkills();
        
        if (points > 0) {
            this.showNotification(`✨ Получено ${points} очков навыков!`, "success");
        }
        
        return this.availableSkillPoints;
    }

    calculateSkillPointsFromLevel(level) {
        // Герой получает 1 очко навыков за каждый уровень
        // И дополнительные бонусы на определенных уровнях
        let totalPoints = level;
        
        // Бонусные очки на ключевых уровнях
        if (level >= 5) totalPoints += 1;
        if (level >= 10) totalPoints += 2;
        if (level >= 15) totalPoints += 3;
        if (level >= 20) totalPoints += 5;
        
        return totalPoints;
    }

    updateSkillPointsFromHeroLevel() {
        if (!this.game.currentHero) return;
        
        const expectedPoints = this.calculateSkillPointsFromLevel(this.game.currentHero.level);
        const spentPoints = Array.from(this.unlockedSkills).reduce((total, skillId) => {
            const skill = this.getSkillById(skillId);
            return total + (skill?.requirements.skillPoints || 0);
        }, 0);
        
        this.availableSkillPoints = expectedPoints - spentPoints;
        
        // Не даем отрицательные очки
        if (this.availableSkillPoints < 0) {
            this.availableSkillPoints = 0;
        }
        
        this.saveSkills();
    }

    // ========== СОХРАНЕНИЕ И ЗАГРУЗКА ==========
    saveSkills() {
        try {
            const saveData = {
                unlockedSkills: Array.from(this.unlockedSkills),
                availableSkillPoints: this.availableSkillPoints,
                version: "1.0"
            };
            
            localStorage.setItem('tigrimionSkills', JSON.stringify(saveData));
            console.log("💾 Навыки сохранены");
            return true;
        } catch (error) {
            console.error("❌ Ошибка сохранения навыков:", error);
            return false;
        }
    }

    loadSkills() {
        try {
            const saved = localStorage.getItem('tigrimionSkills');
            if (saved) {
                const data = JSON.parse(saved);
                
                this.unlockedSkills = new Set(data.unlockedSkills || []);
                this.availableSkillPoints = data.availableSkillPoints || 0;
                
                console.log(`📂 Навыки загружены: ${this.unlockedSkills.size} изучено, ${this.availableSkillPoints} очков доступно`);
                return true;
            }
        } catch (error) {
            console.error("❌ Ошибка загрузки навыков:", error);
        }
        
        // Инициализация для нового героя
        this.unlockedSkills = new Set();
        this.availableSkillPoints = 0;
        
        if (this.game.currentHero) {
            this.updateSkillPointsFromHeroLevel();
        }
        
        return false;
    }

showSkillsScreen() {
    const app = document.getElementById('app');
    if (!app) return;

    // Обновляем очки навыков на основе уровня героя
    this.updateSkillPointsFromHeroLevel();
    
    // Получаем текущего героя
    const hero = this.game.currentHero;
    if (!hero) {
        this.showNotification("❌ Герой не выбран", "error");
        return;
    }

    // Генерируем матрицу навыков в виде сетки 8x8
    const skillsMatrix = this.generateSkillsMatrix();
    const selectedSkillInfo = this.selectedSkill ? this.generateSelectedSkillInfo() : this.generateEmptySkillInfo();
    const totalBonuses = this.calculateTotalBonuses();

    app.innerHTML = `
        <div class="hero-game-screen">
            <div class="top-action-bar">
                <button class="btn-top" onclick="game.showHeroGameScreen()">
                    ← Назад к герою
                </button>
                <button class="btn-top" onclick="game.systems.skills.resetSkills()" 
                        style="background: #ef4444;">
                    🔄 Сбросить навыки
                </button>
            </div>

            <div class="skills-overlay overlay-content">
                <div class="skills-header">
                    <h2>🎯 Древо Навыков (8x8)</h2>
                    <div class="skills-info">
                        <div class="skill-points-display ${this.availableSkillPoints === 0 ? 'low' : ''}">
                            ✨ Очков навыков: ${this.availableSkillPoints}
                        </div>
                        <div style="color: #9ca3af;">
                            Уровень героя: ${hero.level}
                        </div>
                        <div style="color: #9ca3af;">
                            Изучено: ${this.unlockedSkills.size}/64
                        </div>
                    </div>
                </div>
                
                <div class="skill-path-info">
                    <div class="skill-path-title">📖 Как работает матрица навыков:</div>
                    <div class="skill-path-description">
                        • Строки (1-8) - требуемый уровень героя<br>
                        • Колонки - тип бонуса: ❤️ Здоровье, ⚔️ Урон, 🎯 Крит и т.д.<br>
                        • На уровнях 1, 2, 4 и 8 нужно выбрать только один навык в строке<br>
                        • Для изучения навыка нужны предыдущие навыки в том же столбце<br>
                        • Зеленый ✓ - изучен, Серый - доступен, Красный - недоступен
                    </div>
                </div>
                
                <div class="skills-grid-container">
                    <!-- Панель информации о выбранном навыке -->
                    <div class="skills-info-panel">
                        ${selectedSkillInfo}
                    </div>
                    
                    <!-- Шахматная доска 8x8 -->
                    <div class="skills-matrix">
                        ${skillsMatrix}
                    </div>
                </div>
                
                <!-- Общая информация о бонусах -->
                <div class="skills-help">
                    <h4>📊 Итоговые бонусы от изученных навыков:</h4>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px;">
                        ${Object.entries(totalBonuses).map(([type, value]) => `
                            <div style="background: #1f2937; padding: 10px; border-radius: 6px; border-left: 4px solid ${this.getBonusColor(type)};">
                                <div style="font-size: 0.9rem; color: #9ca3af;">${this.getBonusName(type)}</div>
                                <div style="font-size: 1.2rem; font-weight: bold; color: ${this.getBonusColor(type)};">
                                    +${value.toFixed(1)}%
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Ключевые правила -->
                <div class="skills-help">
                    <h4>🎮 Правила выбора навыков:</h4>
                    <ul>
                        <li><span style="color: #10b981;">Уровень 1:</span> Выберите 1 из 8 навыков для старта</li>
                        <li><span style="color: #10b981;">Уровень 2:</span> Выберите 2 навыка (по одному в каждой группе из 2)</li>
                        <li><span style="color: #10b981;">Уровень 4:</span> Специальный выбор - можно взять до 4 навыков</li>
                        <li><span style="color: #10b981;">Уровень 8:</span> Финальный выбор - можно взять до 8 навыков</li>
                        <li>На уровнях 3, 5, 6, 7 можно изучать все доступные навыки</li>
                        <li>Для изучения навыка на уровне N нужен хотя бы один навык на уровне N-1</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    // Добавляем обработчики событий для навыков
    this.attachSkillEventHandlers();
    
    // Добавляем линии связей между навыками
    setTimeout(() => this.drawSkillConnections(), 100);
}

// Метод для рисования линий связей между навыками
drawSkillConnections() {
    // Этот метод можно реализовать для визуализации зависимостей между навыками
    // Например, показать линии от изученных навыков к доступным для изучения
    const container = document.querySelector('.skills-matrix');
    if (!container) return;
    
    // Очищаем предыдущие линии
    const existingLines = container.querySelectorAll('.skill-dependency-line');
    existingLines.forEach(line => line.remove());
    
    // Рисуем линии только для изученных навыков
    Array.from(this.unlockedSkills).forEach(skillId => {
        const skill = this.getSkillById(skillId);
        if (!skill || skill.row >= 8) return; // Не рисуем для последнего уровня
        
        // Находим DOM элемент навыка
        const skillElement = container.querySelector(`[data-skill-id="${skillId}"]`);
        if (!skillElement) return;
        
        const skillRect = skillElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Находим доступные для изучения навыки в следующей строке
        const nextRowSkills = this.skills.filter(s => 
            s.row === skill.row + 1 && 
            this.canLearnSkill(s.id) &&
            Math.abs(s.column - skill.column) <= 1 // Только соседние колонки
        );
        
        // Рисуем линии к доступным навыкам
        nextRowSkills.forEach(nextSkill => {
            const nextElement = container.querySelector(`[data-skill-id="${nextSkill.id}"]`);
            if (!nextElement) return;
            
            const nextRect = nextElement.getBoundingClientRect();
            
            // Создаем линию
            const line = document.createElement('div');
            line.className = 'skill-dependency-line';
            
            // Рассчитываем координаты
            const startX = skillRect.left - containerRect.left + skillRect.width / 2;
            const startY = skillRect.top - containerRect.top + skillRect.height;
            const endX = nextRect.left - containerRect.left + nextRect.width / 2;
            const endY = nextRect.top - containerRect.top;
            
            // Устанавливаем позицию и размер
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
            
            line.style.position = 'absolute';
            line.style.left = `${startX}px`;
            line.style.top = `${startY}px`;
            line.style.width = `${length}px`;
            line.style.transform = `rotate(${angle}deg)`;
            line.style.transformOrigin = '0 0';
            line.style.height = '3px';
            line.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
            line.style.zIndex = '1';
            
            container.appendChild(line);
        });
    });
}


    
// ========== ОБНОВЛЕННЫЙ МЕТОД ГЕНЕРАЦИИ СЕТКИ 8x8 ==========
generateSkillsMatrix() {
    let matrixHTML = '';
    
    const bonusTypes = ['health', 'damage', 'crit', 'vampire', 'armor', 'gold', 'regen', 'penetration'];
    const bonusIcons = ['❤️', '⚔️', '🎯', '🩸', '🛡️', '💰', '⚡', '💥'];
    const bonusNames = ['Здоровье', 'Урон', 'Крит', 'Вампир', 'Броня', 'Золото', 'Реген', 'Пробитие'];
    
    // Цвета для границ каждой колонки
    const columnColors = [
        '#ef4444', '#f59e0b', '#ec4899', '#dc2626', 
        '#3b82f6', '#fbbf24', '#10b981', '#8b5cf6'
    ];
    
    // Заголовки колонок с уникальными цветами границ
    matrixHTML += `
        <div class="skills-matrix-container">
            <div class="skills-grid-header">
                <div class="grid-header-spacer"></div>
                ${bonusTypes.map((type, index) => `
                    <div class="grid-column-header skill-bonus-${type}" 
                         style="border-color: ${columnColors[index]} !important;">
                        ${bonusIcons[index]}
                        <div class="column-name">${bonusNames[index]}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="skills-grid-rows">
    `;
    
    // Генерируем 8 строк (уровней)
    for (let row = 1; row <= 8; row++) {
        matrixHTML += `<div class="skills-grid-row">`;
        
        // Заголовок строки (уровень) с градиентной рамкой
        const levelGradient = row === 1 ? '#dc2626' : 
                             row === 2 ? '#ea580c' : 
                             row === 3 ? '#d97706' : 
                             row === 4 ? '#f59e0b' : 
                             row === 5 ? '#fbbf24' : 
                             row === 6 ? '#10b981' : 
                             row === 7 ? '#3b82f6' : 
                             '#8b5cf6';
        
        matrixHTML += `
            <div class="grid-row-header" style="border-color: ${levelGradient} !important;">
                <div class="level-badge">${row}</div>
                <div class="level-label">Уровень ${row}</div>
            </div>
        `;
        
        // Генерируем 8 ячеек (по одной на каждый тип бонуса)
        for (let col = 1; col <= 8; col++) {
            const skill = this.getSkillByPosition(row, col);
            if (!skill) {
                matrixHTML += `<div class="skill-cell empty" data-column="${col}"></div>`;
                continue;
            }
            
            const isUnlocked = this.unlockedSkills.has(skill.id);
            const canLearn = this.canLearnSkill(skill.id);
            const isSelected = this.selectedSkill?.id === skill.id;
            const hero = this.game.currentHero;
            
            // Определяем состояние ячейки
            let cellClass = 'skill-cell';
            let cellTitle = skill.name;
            
            if (isUnlocked) {
                cellClass += ' unlocked';
                cellTitle += ' (Изучено)';
            } else if (canLearn) {
                cellClass += ' available';
                cellTitle += ' (Доступно)';
            } else {
                cellClass += ' locked';
                
                // Проверяем требования
                if (hero && hero.level < skill.requirements.heroLevel) {
                    cellClass += ' requirements-not-met';
                    cellTitle += ' (Требуется уровень ' + skill.requirements.heroLevel + ')';
                } else if (this.availableSkillPoints < skill.requirements.skillPoints) {
                    cellTitle += ' (Нужно ' + skill.requirements.skillPoints + ' очков)';
                } else {
                    cellTitle += ' (Требуются предыдущие навыки)';
                }
            }
            
            if (isSelected) {
                cellClass += ' selected';
                cellTitle += ' (Выбрано)';
            }
            
            // Определяем является ли это выборочной нодой
            const isChoiceNode = row === 1 || row === 2 || row === 4 || row === 8;
            if (isChoiceNode) {
                cellTitle += ' (Выбор пути)';
            }
            
            // Цвет для этой колонки
            const columnColor = columnColors[col - 1];
            const bonusColor = this.getBonusColor(skill.type);
            
            matrixHTML += `
                <div class="${cellClass} skill-bonus-${skill.type}" 
                     data-skill-id="${skill.id}"
                     data-column="${col}"
                     data-row="${row}"
                     data-type="${skill.type}"
                     data-is-choice="${isChoiceNode}"
                     onclick="game.systems.skills.selectSkill(${skill.id})"
                     title="${cellTitle}
                     
${skill.description}
                     
📊 Бонус: +${skill.bonusValue}% к ${this.getBonusName(skill.type).toLowerCase()}
⚡ Требуется: Уровень ${skill.requirements.heroLevel}
🎯 Стоимость: ${skill.requirements.skillPoints} очков навыков"
                     style="border-color: ${columnColor} !important;">
                    
                    <div class="skill-cell-content">
                        <!-- Основная иконка навыка -->
                        <div class="skill-cell-icon" style="color: ${bonusColor} !important;">
                            ${skill.icon}
                        </div>
                        
                        <!-- Значение бонуса -->
                        <div class="skill-cell-bonus" style="color: ${bonusColor} !important;">
                            +${skill.bonusValue}%
                        </div>
                        
                        <!-- Индикатор выборочной ноды (для уровней 1, 2, 4, 8) -->
                        ${isChoiceNode ? `
                            <div class="choice-indicator" style="border-color: ${bonusColor} !important;">
                                ⚡
                            </div>
                        ` : ''}
                        
                        <!-- Индикатор изученности -->
                        ${isUnlocked ? `
                            <div class="unlocked-indicator">
                                ✓
                            </div>
                        ` : ''}
                        
                        <!-- Требуемый уровень (только если не доступно и не изучено) -->
                        ${!isUnlocked && !canLearn && hero && hero.level < skill.requirements.heroLevel ? `
                            <div class="level-requirement">
                                ${skill.requirements.heroLevel}
                            </div>
                        ` : ''}
                        
                        <!-- Индикатор стоимости для доступных навыков -->
                        ${!isUnlocked && canLearn ? `
                            <div class="cost-indicator" style="position: absolute; bottom: 5px; left: 5px; background: rgba(59, 130, 246, 0.9); color: white; font-size: 0.8rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #3b82f6;">
                                ${skill.requirements.skillPoints}
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Эффект выбора (только для выбранной ячейки) -->
                    ${isSelected ? `
                        <div class="selection-effect" style="border-color: ${columnColor} !important;"></div>
                        
                        <!-- Дополнительный эффект свечения -->
                        <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 14px; box-shadow: inset 0 0 20px ${columnColor}; pointer-events: none; z-index: 1;"></div>
                    ` : ''}
                    
                    <!-- Эффект при наведении -->
                    <div class="hover-effect" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at center, rgba(255,255,255,0.1) 0%, transparent 70%); opacity: 0; transition: opacity 0.3s; pointer-events: none;"></div>
                    
                    <!-- Фоновый градиент -->
                    <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 50%); border-radius: 14px; pointer-events: none;"></div>
                </div>
            `;
        }
        
        matrixHTML += `</div>`;
    }
    
    matrixHTML += `
            </div>
        </div>
        
        <!-- Скрипт для обработки наведения -->
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const skillCells = document.querySelectorAll('.skill-cell:not(.empty)');
                
                skillCells.forEach(cell => {
                    // Эффект при наведении
                    cell.addEventListener('mouseenter', function() {
                        const hoverEffect = this.querySelector('.hover-effect');
                        if (hoverEffect) hoverEffect.style.opacity = '1';
                        
                        // Подсветка ячеек в той же колонке
                        const column = this.getAttribute('data-column');
                        const sameColumnCells = document.querySelectorAll('.skill-cell[data-column="' + column + '"]:not(.empty)');
                        sameColumnCells.forEach(c => {
                            if (c !== this) {
                                c.style.filter = 'brightness(1.3)';
                            }
                        });
                    });
                    
                    cell.addEventListener('mouseleave', function() {
                        const hoverEffect = this.querySelector('.hover-effect');
                        if (hoverEffect) hoverEffect.style.opacity = '0';
                        
                        // Сброс подсветки
                        const column = this.getAttribute('data-column');
                        const sameColumnCells = document.querySelectorAll('.skill-cell[data-column="' + column + '"]:not(.empty)');
                        sameColumnCells.forEach(c => {
                            c.style.filter = 'brightness(1)';
                        });
                    });
                    
                    // Клик для выбора
                    cell.addEventListener('click', function() {
                        // Убираем выделение со всех ячеек
                        skillCells.forEach(c => {
                            c.classList.remove('selected');
                            const selectionEffect = c.querySelector('.selection-effect');
                            if (selectionEffect) selectionEffect.style.display = 'none';
                        });
                        
                        // Добавляем выделение текущей
                        this.classList.add('selected');
                        const selectionEffect = this.querySelector('.selection-effect');
                        if (selectionEffect) selectionEffect.style.display = 'block';
                        
                        // Обновляем информацию о выбранном навыке
                        const skillId = this.getAttribute('data-skill-id');
                        if (skillId && window.game && window.game.systems && window.game.systems.skills) {
                            window.game.systems.skills.selectSkill(parseInt(skillId));
                        }
                    });
                });
                
                // Добавляем CSS для hover эффектов
                const style = document.createElement('style');
                style.textContent = \`
                    .skill-cell:not(.empty):hover {
                        transform: scale(1.1) !important;
                        z-index: 100 !important;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
                    }
                    
                    .skill-cell.available:hover {
                        animation: shake-available 0.5s ease !important;
                    }
                    
                    .skill-cell.unlocked:hover {
                        animation: shake-unlocked 0.5s ease !important;
                    }
                    
                    @keyframes shake-available {
                        0%, 100% { transform: translateX(0) scale(1.1); }
                        25% { transform: translateX(-2px) scale(1.1); }
                        75% { transform: translateX(2px) scale(1.1); }
                    }
                    
                    @keyframes shake-unlocked {
                        0%, 100% { transform: translateY(0) scale(1.1); }
                        25% { transform: translateY(-2px) scale(1.1); }
                        75% { transform: translateY(2px) scale(1.1); }
                    }
                \`;
                document.head.appendChild(style);
            });
        </script>
    `;
    
    return matrixHTML;
}

// ========== ДОПОЛНИТЕЛЬНЫЙ МЕТОД ДЛЯ ОБНОВЛЕНИЯ СТИЛЕЙ ИЗ КОНСОЛИ ==========
applyEnhancedStyles() {
    // Создаем или обновляем стили
    const styleId = 'skills-enhanced-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
    }
    
    styleElement.textContent = `
        /* Увеличенные размеры */
        .skills-grid-header,
        .skills-grid-row {
            grid-template-columns: 120px repeat(8, 100px) !important;
            gap: 12px !important;
            min-width: 1200px !important;
        }
        
        .skill-cell {
            width: 100px !important;
            height: 100px !important;
            border-width: 4px !important;
            border-radius: 14px !important;
        }
        
        .skill-cell-icon {
            font-size: 2.8rem !important;
        }
        
        .skill-cell-bonus {
            font-size: 1.1rem !important;
        }
        
        .skills-overlay {
            max-width: 1600px !important;
            max-height: 95vh !important;
        }
        
        /* Уникальные границы для колонок */
        .skill-cell[data-column="1"] { border-color: #ef4444 !important; }
        .skill-cell[data-column="2"] { border-color: #f59e0b !important; }
        .skill-cell[data-column="3"] { border-color: #ec4899 !important; }
        .skill-cell[data-column="4"] { border-color: #dc2626 !important; }
        .skill-cell[data-column="5"] { border-color: #3b82f6 !important; }
        .skill-cell[data-column="6"] { border-color: #fbbf24 !important; }
        .skill-cell[data-column="7"] { border-color: #10b981 !important; }
        .skill-cell[data-column="8"] { border-color: #8b5cf6 !important; }
        
        /* Эффект градиентной границы при наведении */
        .skill-cell:not(.empty):hover::before {
            content: '';
            position: absolute;
            top: -4px;
            left: -4px;
            right: -4px;
            bottom: -4px;
            border-radius: 16px;
            background: conic-gradient(
                from 0deg,
                var(--border-start),
                var(--border-middle),
                var(--border-end),
                var(--border-middle),
                var(--border-start)
            );
            z-index: -1;
            opacity: 1;
            animation: rotate-border 3s linear infinite;
        }
        
        /* Градиенты для каждой колонки */
        .skill-cell[data-column="1"]:hover::before {
            --border-start: #ef4444;
            --border-middle: #f87171;
            --border-end: #fca5a5;
        }
        
        .skill-cell[data-column="2"]:hover::before {
            --border-start: #f59e0b;
            --border-middle: #fbbf24;
            --border-end: #fde68a;
        }
        
        .skill-cell[data-column="3"]:hover::before {
            --border-start: #ec4899;
            --border-middle: #f472b6;
            --border-end: #f9a8d4;
        }
        
        .skill-cell[data-column="4"]:hover::before {
            --border-start: #dc2626;
            --border-middle: #ef4444;
            --border-end: #f87171;
        }
        
        .skill-cell[data-column="5"]:hover::before {
            --border-start: #3b82f6;
            --border-middle: #60a5fa;
            --border-end: #93c5fd;
        }
        
        .skill-cell[data-column="6"]:hover::before {
            --border-start: #fbbf24;
            --border-middle: #fcd34d;
            --border-end: #fde68a;
        }
        
        .skill-cell[data-column="7"]:hover::before {
            --border-start: #10b981;
            --border-middle: #34d399;
            --border-end: #6ee7b7;
        }
        
        .skill-cell[data-column="8"]:hover::before {
            --border-start: #8b5cf6;
            --border-middle: #a78bfa;
            --border-end: #c4b5fd;
        }
        
        @keyframes rotate-border {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* Эффект выбора */
        .skill-cell.selected {
            box-shadow: 
                0 0 20px rgba(59, 130, 246, 0.6),
                0 0 40px rgba(59, 130, 246, 0.3),
                inset 0 0 20px rgba(255, 255, 255, 0.1) !important;
            animation: pulse-selected 2s infinite !important;
        }
        
        @keyframes pulse-selected {
            0% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1); }
            50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.2); }
            100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 40px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1); }
        }
    `;
    
    console.log('✅ Улучшенные стили с уникальными границами применены!');
    return true;
}

    

// Также нужно добавить метод getSkillByPosition:
getSkillByPosition(row, column) {
    return this.skills.find(skill => skill.row === row && skill.column === column);
}

generateSelectedSkillInfo() {
    const skill = this.selectedSkill;
    if (!skill) return this.generateEmptySkillInfo();
    
    const isUnlocked = this.unlockedSkills.has(skill.id);
    const canLearn = this.canLearnSkill(skill.id);
    const hero = this.game.currentHero;
    
    // Определяем позицию в сетке
    const positionText = `Строка ${skill.row}, Колонка ${skill.column}`;
    
    // Определяем тип позиции
    let positionType = "Обычный навык";
    if (skill.row === 1) positionType = "Стартовый выбор (только 1)";
    else if (skill.row === 2) positionType = "Выбор 2 уровня (1 из 2 в группе)";
    else if (skill.row === 4) positionType = "Специальный выбор (до 4 навыков)";
    else if (skill.row === 8) positionType = "Финальный выбор (до 8 навыков)";
    
    return `
        <div class="selected-skill-info">
            <div class="selected-skill-header">
                <div class="selected-skill-icon" style="font-size: 48px; color: ${this.getBonusColor(skill.type)};">
                    ${skill.icon}
                </div>
                <div class="selected-skill-name">
                    ${skill.name}
                </div>
                <div class="selected-skill-type">
                    ${positionType}
                </div>
                <div class="selected-skill-position" style="color: #9ca3af; font-size: 0.9rem;">
                    ${positionText}
                </div>
            </div>
            
            <div class="selected-skill-description">
                ${skill.description}
            </div>
            
            <!-- Индикаторы требований -->
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin: 15px 0;">
                <div style="background: #374151; padding: 10px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 0.8rem; color: #9ca3af;">Требуемый уровень</div>
                    <div style="font-size: 1.2rem; font-weight: bold; color: ${hero && hero.level >= skill.requirements.heroLevel ? '#10b981' : '#ef4444'}">
                        ${skill.requirements.heroLevel}
                    </div>
                </div>
                
                <div style="background: #374151; padding: 10px; border-radius: 6px; text-align: center;">
                    <div style="font-size: 0.8rem; color: #9ca3af;">Стоимость</div>
                    <div style="font-size: 1.2rem; font-weight: bold; color: ${this.availableSkillPoints >= skill.requirements.skillPoints ? '#10b981' : '#ef4444'}">
                        ${skill.requirements.skillPoints} очков
                    </div>
                </div>
            </div>
            
            <!-- Кнопка изучения -->
            <div class="skill-actions">
                ${isUnlocked ? `
                    <button class="btn-learn-skill" disabled style="background: #10b981;">
                        ✅ Уже изучен
                    </button>
                ` : canLearn ? `
                    <button class="btn-learn-skill" 
                            onclick="game.systems.skills.learnSkill(${skill.id})"
                            style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                        ✨ Изучить навык
                    </button>
                ` : `
                    <button class="btn-learn-skill" disabled>
                        ❌ Требования не выполнены
                    </button>
                `}
            </div>
            
            <!-- Информация о бонусе -->
            <div style="margin-top: 20px; padding: 15px; background: rgba(31, 41, 55, 0.5); border-radius: 8px; border-left: 4px solid ${this.getBonusColor(skill.type)};">
                <div style="font-weight: bold; margin-bottom: 10px;">Бонус навыка:</div>
                <div style="font-size: 1.3rem; color: ${this.getBonusColor(skill.type)}; font-weight: bold;">
                    +${skill.bonusValue}% к ${this.getBonusName(skill.type).toLowerCase()}
                </div>
            </div>
            
            <!-- Зависимости -->
            ${skill.dependencies.length > 0 ? `
                <div style="margin-top: 20px; padding: 15px; background: rgba(55, 65, 81, 0.5); border-radius: 8px;">
                    <div style="font-weight: bold; margin-bottom: 10px;">🔗 Требуются предыдущие навыки:</div>
                    <div style="font-size: 0.9rem; color: #d1d5db;">
                        Нужен хотя бы один навык на уровне ${skill.row - 1}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

    generateEmptySkillInfo() {
        return `
            <div class="selected-skill-info">
                <div class="selected-skill-header">
                    <div class="selected-skill-icon">🌟</div>
                    <div class="selected-skill-name">Выберите навык</div>
                    <div class="selected-skill-type">Нажмите на любой навык для просмотра информации</div>
                </div>
                
                <div class="selected-skill-description">
                    Система навыков позволяет улучшать характеристики вашего героя. 
                    Каждый уровень дает 1 очко навыков, которое можно потратить на изучение новых умений.
                    
                    <div style="margin-top: 20px;">
                        <strong>Цвета навыков:</strong>
                        <div style="display: flex; flex-direction: column; gap: 5px; margin-top: 10px;">
                            <div><span style="color: #10b981;">●</span> Зеленый - уже изучен</div>
                            <div><span style="color: #6b7280;">●</span> Серый - можно изучить</div>
                            <div><span style="color: #7c2d12;">●</span> Красный - требования не выполнены</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding: 15px; background: #111827; border-radius: 8px;">
                    <div style="font-weight: bold; color: #3b82f6; margin-bottom: 10px;">
                        💡 Советы:
                    </div>
                    <div style="font-size: 0.9rem; color: #d1d5db; line-height: 1.5;">
                        1. Сначала изучайте навыки, соответствующие вашему стилю игры<br>
                        2. Обращайте внимание на альтернативные пути развития<br>
                        3. Не бойтесь экспериментировать - навыки можно сбросить<br>
                        4. Планируйте развитие заранее, особенно на высоких уровнях
                    </div>
                </div>
            </div>
        `;
    }

    // ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========
    selectSkill(skillId) {
        const skill = this.getSkillById(skillId);
        if (!skill) return;
        
        this.selectedSkill = skill;
        
        // Обновляем интерфейс
        const app = document.getElementById('app');
        if (app) {
            // Просто обновляем панель информации
            const infoPanel = app.querySelector('.skills-info-panel');
            if (infoPanel) {
                infoPanel.innerHTML = this.generateSelectedSkillInfo();
            }
            
            // Обновляем выделение на нодах
            const allNodes = app.querySelectorAll('.skill-node');
            allNodes.forEach(node => {
                node.classList.remove('selected');
                if (parseInt(node.getAttribute('data-skill-id')) === skillId) {
                    node.classList.add('selected');
                }
            });
        }
    }

    attachSkillEventHandlers() {
        // Обработчики уже добавлены через onclick в HTML
        // Этот метод можно использовать для дополнительной инициализации
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    getBonusName(bonusType) {
        const names = {
            'health': 'Здоровье',
            'damage': 'Урон',
            'crit': 'Крит. удар',
            'vampire': 'Вампиризм',
            'armor': 'Броня',
            'gold': 'Золото',
            'regen': 'Регенерация',
            'penetration': 'Пробитие брони'
        };
        return names[bonusType] || bonusType;
    }

    getBonusColor(bonusType) {
        const colors = {
            'health': '#ef4444',
            'damage': '#f59e0b',
            'crit': '#ec4899',
            'vampire': '#dc2626',
            'armor': '#3b82f6',
            'gold': '#fbbf24',
            'regen': '#10b981',
            'penetration': '#8b5cf6'
        };
        return colors[bonusType] || '#9ca3af';
    }

    showNotification(message, type = 'info') {
        if (this.game && this.game.showNotification) {
            this.game.showNotification(message, type);
        } else {
            console.log(`${type}: ${message}`);
        }
    }

    // ========== ИНТЕГРАЦИЯ С УРОВНЯМИ ==========
    onHeroLevelUp(oldLevel, newLevel) {
        console.log(`🎮 SkillsSystem: Герой повысил уровень с ${oldLevel} до ${newLevel}`);
        
        // Добавляем очки навыков за новый уровень
        const pointsForThisLevel = this.calculateSkillPointsFromLevel(newLevel) - 
                                   this.calculateSkillPointsFromLevel(oldLevel);
        
        if (pointsForThisLevel > 0) {
            this.addSkillPoints(pointsForThisLevel);
        }
        
        // Сохраняем изменения
        this.saveSkills();
    }

    // ========== ПРОВЕРКА КОНФЛИКТОВ ДЛЯ ВЫБОРОЧНЫХ НОД ==========
    checkChoiceConflicts(skillId) {
        const skill = this.getSkillById(skillId);
        if (!skill || !skill.isChoiceNode) return false;
        
        // Проверяем, не выбран ли уже альтернативный навык
        const conflict = skill.alternatives.find(altId => 
            this.unlockedSkills.has(altId)
        );
        
        return conflict !== undefined;
    }

    // ========== МЕТОД ДЛЯ ПОКАЗА МОДАЛЬНОГО ОКНА ВЫБОРА ПУТИ ==========
    showPathChoiceModal(row, availableSkills) {
        // Этот метод можно использовать для особых случаев выбора
        // Например, на уровне 4, где нужен выбор между несколькими путями
        
        const modalHTML = `
            <div class="path-choice-overlay" id="pathChoiceModal">
                <div class="path-choice-modal">
                    <div class="path-choice-header">
                        <h2>🛤️ Выбор пути развития</h2>
                        <p>Вы достигли уровня ${row}. Выберите направление развития:</p>
                    </div>
                    
                    <div class="path-choice-options">
                        ${availableSkills.map(skill => `
                            <div class="path-option" data-skill-id="${skill.id}" 
                                 onclick="game.systems.skills.selectPathOption(${skill.id})">
                                <div class="path-option-header">
                                    <div class="path-option-icon">${skill.icon}</div>
                                    <div class="path-option-name">${skill.name}</div>
                                </div>
                                <div class="path-option-description">
                                    ${skill.description}
                                </div>
                                <div class="path-option-bonus">
                                    <span>Бонус:</span>
                                    <span class="skill-bonus-${skill.type}">+${skill.bonusValue}%</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="path-choice-actions">
                        <button class="btn-secondary" onclick="game.systems.skills.closePathChoiceModal()">
                            ⏳ Решить позже
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    selectPathOption(skillId) {
        // Закрываем модальное окно
        this.closePathChoiceModal();
        
        // Пытаемся изучить навык
        this.learnSkill(skillId);
    }

    closePathChoiceModal() {
        const modal = document.getElementById('pathChoiceModal');
        if (modal) {
            modal.remove();
        }
    }
}

// Регистрируем систему в глобальной области
window.SkillsSystem = SkillsSystem;
console.log("📦 SkillsSystem модуль загружен");
