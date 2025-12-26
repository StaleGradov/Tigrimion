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
            'health': 30,    // % к здоровью за уровень
            'damage': 30,  // % к урону за уровень
            'crit': 30,    // % к криту за уровень
            'vampire': 6, // % к вампиризму за уровень
            'armor': 30,     // % к броне за уровень
            'gold': 30,    // % к золоту за уровень
            'regen': 16,     // % к регенерации за уровень
            'penetration': 36 // % к пробитию брони за уровень
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
        <div class="hero-game-screen" style="max-width: 100%; margin: 0;">
            <div class="top-action-bar">
                <button class="btn-top" onclick="game.showHeroGameScreen()">
                    ← Назад к герою
                </button>
                <button class="btn-top" onclick="game.systems.skills.resetSkills()" 
                        style="background: #ef4444;">
                    🔄 Сбросить навыки
                </button>
            </div>

            <div class="skills-overlay overlay-content" style="
                max-width: 98vw !important;
                width: 98vw !important;
                margin: 10px auto !important;
                padding: 15px !important;
            ">
                <div class="skills-header" style="
                    margin-bottom: 20px;
                    padding: 15px 25px;
                    width: 100%;
                ">
                    <h2 style="font-size: 1.8rem; margin: 0;">🎯 Древо Навыков (8x8)</h2>
                    <div class="skills-info">
                        <div class="skill-points-display ${this.availableSkillPoints === 0 ? 'low' : ''}" style="
                            padding: 10px 20px;
                            font-size: 1.2rem;
                        ">
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
                
                <div class="skill-path-info" style="
                    margin-bottom: 25px;
                    padding: 15px;
                    background: rgba(31, 41, 55, 0.8);
                    border-radius: 12px;
                    border-left: 4px solid #3b82f6;
                    width: 100%;
                ">
                    <div class="skill-path-title" style="
                        font-weight: bold;
                        font-size: 1.1rem;
                        margin-bottom: 8px;
                        color: #60a5fa;
                    ">📖 Как работает матрица навыков:</div>
                    <div class="skill-path-description" style="color: #d1d5db; line-height: 1.6;">
                        • Строки (1-8) - требуемый уровень героя<br>
                        • Колонки - тип бонуса: ❤️ Здоровье, ⚔️ Урон, 🎯 Крит и т.д.<br>
                        • На уровнях 1, 2, 4 и 8 нужно выбрать только один навык в строке<br>
                        • Для изучения навыка нужны предыдущие навыки в том же столбце<br>
                        • Зеленый ✓ - изучен, Серый - доступен, Красный - недоступен
                    </div>
                </div>
                
                <div class="skills-grid-container" style="
                    display: flex;
                    flex-direction: column;
                    width: 100%;
                    max-width: none;
                ">
                    <!-- Панель информации о выбранном навыке -->
                    <div class="skills-info-panel" style="
                        width: 100%;
                        margin-bottom: 25px;
                        padding: 20px;
                    ">
                        ${selectedSkillInfo}
                    </div>
                    
                    <!-- Контейнер для шахматной доски -->
                    <div style="
                        width: 100%;
                        overflow-x: auto;
                        padding: 20px 0;
                        background: rgba(31, 41, 55, 0.9);
                        border-radius: 15px;
                        margin-bottom: 25px;
                    ">
                        <!-- Шахматная доска 8x8 -->
                        <div style="
                            min-width: fit-content;
                            width: fit-content;
                            margin: 0 auto;
                            padding: 0 20px;
                        ">
                            ${skillsMatrix}
                        </div>
                    </div>
                </div>
                
                <!-- Общая информация о бонусах -->
                <div class="skills-help" style="
                    margin-top: 25px;
                    padding: 20px;
                    background: rgba(31, 41, 55, 0.8);
                    border-radius: 12px;
                    width: 100%;
                ">
                    <h4 style="margin-top: 0; margin-bottom: 15px;">📊 Итоговые бонусы от изученных навыков:</h4>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-top: 10px;">
                        ${Object.entries(totalBonuses).map(([type, value]) => `
                            <div style="
                                background: #1f2937; 
                                padding: 15px; 
                                border-radius: 8px; 
                                border-left: 5px solid ${this.getBonusColor(type)};
                                transition: all 0.3s;
                            ">
                                <div style="font-size: 0.9rem; color: #9ca3af; margin-bottom: 5px;">
                                    ${this.getBonusName(type)}
                                </div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: ${this.getBonusColor(type)};">
                                    +${value.toFixed(1)}%
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Ключевые правила -->
                <div class="skills-help" style="
                    margin-top: 20px;
                    padding: 20px;
                    background: rgba(31, 41, 55, 0.8);
                    border-radius: 12px;
                    width: 100%;
                ">
                    <h4 style="margin-top: 0; margin-bottom: 15px;">🎮 Правила выбора навыков:</h4>
                    <ul style="
                        margin: 0;
                        padding-left: 20px;
                        line-height: 1.8;
                        color: #d1d5db;
                    ">
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


// ========== ИСПРАВЛЕННЫЙ МЕТОД ГЕНЕРАЦИИ СЕТКИ С УВЕЛИЧЕННЫМИ ЯЧЕЙКАМИ ==========
generateSkillsMatrix() {
    console.log('🔄 Генерация сетки 8x8 с увеличенными ячейками...');
    
    const bonusTypes = ['health', 'damage', 'crit', 'vampire', 'armor', 'gold', 'regen', 'penetration'];
    const bonusIcons = ['❤️', '⚔️', '🎯', '🩸', '🛡️', '💰', '⚡', '💥'];
    const bonusNames = ['Здоровье', 'Урон', 'Крит', 'Вампир', 'Броня', 'Золото', 'Реген', 'Пробитие'];
    const columnColors = ['#ef4444', '#f59e0b', '#ec4899', '#dc2626', '#3b82f6', '#fbbf24', '#10b981', '#8b5cf6'];
    
    // Увеличенные размеры ячеек
    const cellWidth = 140; // Увеличено с 100px
    const cellHeight = 140; // Увеличено с 100px
    const gapSize = 15; // Увеличено с 10px
    
    // Создаем HTML для сетки с увеличенными ячейками
    let html = `
        <div class="skills-grid-large" style="
            display: grid;
            grid-template-columns: repeat(8, ${cellWidth}px);
            grid-template-rows: repeat(8, ${cellHeight}px);
            gap: ${gapSize}px;
            margin: 25px auto;
            width: fit-content;
            padding: 35px;
            background: rgba(31, 41, 55, 0.97);
            border-radius: 18px;
            border: 4px solid #374151;
            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6);
        ">
    `;
    
    // Генерируем 64 ячейки (8x8)
    for (let row = 1; row <= 8; row++) {
        for (let col = 1; col <= 8; col++) {
            const skill = this.getSkillByPosition(row, col);
            const columnColor = columnColors[col - 1];
            
            if (!skill) {
                html += `<div style="
                    width: ${cellWidth}px;
                    height: ${cellHeight}px;
                    background: rgba(55, 65, 81, 0.6);
                    border-radius: 12px;
                    border: 3px dashed #4b5563;
                "></div>`;
                continue;
            }
            
            const isUnlocked = this.unlockedSkills.has(skill.id);
            const canLearn = this.canLearnSkill(skill.id);
            const isSelected = this.selectedSkill?.id === skill.id;
            
            // Определяем стили ячейки
            let backgroundColor = '#374151';
            let borderColor = columnColor;
            let borderWidth = '4px';
            let borderStyle = 'solid';
            let opacity = '1';
            let cursor = 'pointer';
            let transform = '';
            let boxShadow = '0 6px 18px rgba(0, 0, 0, 0.4)';
            let textColor = 'white';
            
            if (isUnlocked) {
                backgroundColor = '#10b981';
                borderColor = '#34d399';
                boxShadow = '0 0 25px rgba(16, 185, 129, 0.6), 0 6px 18px rgba(0, 0, 0, 0.4)';
                transform = 'scale(1.05)';
                textColor = '#ffffff';
            } else if (canLearn) {
                backgroundColor = '#6b7280';
                borderColor = '#9ca3af';
                boxShadow = '0 0 20px rgba(156, 163, 175, 0.5), 0 6px 18px rgba(0, 0, 0, 0.4)';
                textColor = '#f3f4f6';
            } else {
                opacity = '0.7';
                cursor = 'not-allowed';
                backgroundColor = '#1f2937';
                textColor = '#9ca3af';
            }
            
            if (isSelected) {
                borderWidth = '6px';
                boxShadow = '0 0 35px rgba(59, 130, 246, 0.8), 0 8px 25px rgba(0, 0, 0, 0.5)';
                transform = 'scale(1.12)';
            }
            
            // Создаем ячейку с увеличенными размерами
            html += `
                <div class="skill-cell-large skill-cell-${skill.id}" 
                     onclick="${isUnlocked || !canLearn ? '' : `game.systems.skills.selectSkill(${skill.id}); game.systems.skills.learnSkill(${skill.id})`}"
                     style="
                        width: ${cellWidth}px;
                        height: ${cellHeight}px;
                        background: ${backgroundColor};
                        border: ${borderWidth} ${borderStyle} ${borderColor};
                        border-radius: 14px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        cursor: ${cursor};
                        opacity: ${opacity};
                        transform: ${transform};
                        box-shadow: ${boxShadow};
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                        color: ${textColor};
                     "
                     onmouseover="if('${cursor}' === 'pointer') { 
                         this.style.transform='scale(1.15)'; 
                         this.style.boxShadow='0 0 30px ${borderColor}aa, 0 8px 25px rgba(0,0,0,0.5)';
                     }"
                     onmouseout="this.style.transform='${transform}'; this.style.boxShadow='${boxShadow}'"
                     title="${skill.name}
${skill.description}
📊 Бонус: +${skill.bonusValue}%
⚡ Требуется: Уровень ${skill.requirements.heroLevel}
🎯 Стоимость: ${skill.requirements.skillPoints} очков">
                    
                    <!-- Иконка навыка (увеличенная) -->
                    <div style="font-size: 2.8rem; margin-bottom: 8px; color: inherit; text-shadow: 0 3px 8px rgba(0,0,0,0.6);">
                        ${skill.icon}
                    </div>
                    
                    <!-- Значение бонуса (увеличенное) -->
                    <div style="font-size: 1.1rem; font-weight: bold; color: inherit; background: rgba(0,0,0,0.4); padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2);">
                        +${skill.bonusValue}%
                    </div>
                    
                    <!-- Название навыка (новое) -->
                    <div style="font-size: 0.85rem; margin-top: 6px; color: inherit; opacity: 0.9; font-weight: 500;">
                        ${bonusNames[col - 1]}
                    </div>
                    
                    <!-- Индикатор изученности (увеличенный) -->
                    ${isUnlocked ? `
                        <div style="position: absolute; top: 8px; right: 8px; background: #34d399; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: bold; box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 2px solid #6ee7b7;">
                            ✓
                        </div>
                    ` : ''}
                    
                    <!-- Индикатор выборочной ноды (увеличенный) -->
                    ${(row === 1 || row === 2 || row === 4 || row === 8) ? `
                        <div style="position: absolute; top: 8px; left: 8px; background: #f59e0b; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 2px solid #fbbf24;">
                            ⚡
                        </div>
                    ` : ''}
                    
                    <!-- Требуемый уровень (увеличенный) -->
                    ${!isUnlocked && !canLearn ? `
                        <div style="position: absolute; bottom: 8px; left: 8px; background: #ef4444; color: white; font-size: 0.9rem; padding: 4px 8px; border-radius: 6px; font-weight: bold; box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 2px solid #f87171;">
                            Lvl ${skill.requirements.heroLevel}
                        </div>
                    ` : ''}
                    
                    <!-- Стоимость для доступных навыков (увеличенная) -->
                    ${!isUnlocked && canLearn ? `
                        <div style="position: absolute; bottom: 8px; right: 8px; background: #3b82f6; color: white; font-size: 0.9rem; padding: 4px 8px; border-radius: 6px; font-weight: bold; box-shadow: 0 3px 8px rgba(0,0,0,0.4); border: 2px solid #93c5fd;">
                            ${skill.requirements.skillPoints}pt
                        </div>
                    ` : ''}
                    
                    <!-- Уровень навыка (новый индикатор) -->
                    <div style="position: absolute; top: 8px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.5); color: white; font-size: 0.8rem; padding: 2px 8px; border-radius: 10px; font-weight: bold; border: 1px solid rgba(255,255,255,0.2);">
                        ${row}
                    </div>
                </div>
            `;
        }
    }
    
    html += `</div>`;
    
    // Добавляем заголовки колонок (увеличенные)
    const headersHtml = `
        <div style="
            display: grid;
            grid-template-columns: ${cellWidth + 40}px repeat(8, ${cellWidth}px);
            gap: ${gapSize}px;
            margin: 0 auto 20px auto;
            width: fit-content;
            padding: 0 35px;
        ">
            <div style="width: ${cellWidth + 40}px;"></div>
            ${bonusTypes.map((type, index) => `
                <div style="
                    width: ${cellWidth}px;
                    height: 80px;
                    background: ${columnColors[index]};
                    border-radius: 10px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    border: 3px solid ${columnColors[index]}cc;
                    box-shadow: 0 6px 15px rgba(0,0,0,0.3);
                    position: relative;
                    overflow: hidden;
                ">
                    <div style="font-size: 1.8rem; margin-bottom: 8px;">${bonusIcons[index]}</div>
                    <div style="font-size: 0.95rem; text-align: center; padding: 0 5px;">${bonusNames[index]}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Добавляем заголовки строк (увеличенные)
    const rowsHeadersHtml = `
        <div style="
            position: absolute;
            left: 35px;
            top: ${35 + 80 + 20}px;
            display: flex;
            flex-direction: column;
            gap: ${gapSize}px;
        ">
            ${Array.from({length: 8}, (_, i) => i + 1).map(level => `
                <div style="
                    width: ${cellWidth + 40}px;
                    height: ${cellHeight}px;
                    background: linear-gradient(135deg, #1e40af, #3b82f6);
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: bold;
                    border: 3px solid #60a5fa;
                    box-shadow: 0 6px 15px rgba(0,0,0,0.3);
                    position: relative;
                    overflow: hidden;
                ">
                    <div style="font-size: 2.2rem; color: #fbbf24; font-weight: 800; margin-bottom: 8px;">${level}</div>
                    <div style="font-size: 1.1rem;">Уровень</div>
                    <div style="position: absolute; bottom: 8px; font-size: 0.85rem; color: #dbeafe;">
                        ${level === 1 ? 'Старт' : 
                          level === 2 ? 'Выбор' : 
                          level === 4 ? 'Спец.' : 
                          level === 8 ? 'Финальный' : 'Развитие'}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Финальный HTML с увеличенными размерами
    const finalHtml = `
        <div style="position: relative; width: 100%; min-width: ${(cellWidth * 8) + (gapSize * 7) + 200}px;">
            ${headersHtml}
            ${rowsHeadersHtml}
            ${html}
        </div>
        
        <style>
            /* Инлайн стили чтобы гарантированно работали */
            .skills-grid-large {
                display: grid !important;
                grid-template-columns: repeat(8, ${cellWidth}px) !important;
                grid-template-rows: repeat(8, ${cellHeight}px) !important;
                gap: ${gapSize}px !important;
                margin: 25px auto !important;
                width: fit-content !important;
                padding: 35px !important;
                background: rgba(31, 41, 55, 0.97) !important;
                border-radius: 18px !important;
                border: 4px solid #374151 !important;
                box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6) !important;
            }
            
            /* Анимация при наведении */
            .skills-grid-large > div[onclick]:hover {
                transform: scale(1.15) !important;
                z-index: 10 !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            
            /* Анимация для изученных навыков */
            @keyframes pulse-green-large {
                0% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.6); }
                50% { box-shadow: 0 0 30px rgba(16, 185, 129, 0.9); }
                100% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.6); }
            }
            
            .skills-grid-large > div[style*="background: #10b981"] {
                animation: pulse-green-large 2.5s infinite !important;
            }
            
            /* Анимация для выбранных навыков */
            @keyframes pulse-blue-large {
                0% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.7); }
                50% { box-shadow: 0 0 40px rgba(59, 130, 246, 1); }
                100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.7); }
            }
            
            .skills-grid-large > div[style*="box-shadow: 0 0 35px rgba(59, 130, 246, 0.8)"] {
                animation: pulse-blue-large 2s infinite !important;
            }
            
            /* Анимация для доступных навыков */
            @keyframes pulse-gray-large {
                0% { box-shadow: 0 0 15px rgba(156, 163, 175, 0.5); }
                50% { box-shadow: 0 0 25px rgba(156, 163, 175, 0.8); }
                100% { box-shadow: 0 0 15px rgba(156, 163, 175, 0.5); }
            }
            
            .skills-grid-large > div[style*="background: #6b7280"]:not([style*="scale(1.12)"]) {
                animation: pulse-gray-large 3s infinite !important;
            }
            
            /* Градиентные границы при наведении */
            .skill-cell-large:hover::after {
                content: '';
                position: absolute;
                top: -4px;
                left: -4px;
                right: -4px;
                bottom: -4px;
                border-radius: 16px;
                background: conic-gradient(
                    from 0deg,
                    var(--hover-color-1, currentColor),
                    var(--hover-color-2, currentColor),
                    var(--hover-color-3, currentColor),
                    var(--hover-color-4, currentColor)
                );
                z-index: -1;
                opacity: 0.7;
                animation: rotate-hover 3s linear infinite;
            }
            
            @keyframes rotate-hover {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Адаптивность для разных экранов */
            @media (max-width: 1600px) {
                .skills-grid-large {
                    grid-template-columns: repeat(8, 120px) !important;
                    grid-template-rows: repeat(8, 120px) !important;
                    padding: 30px !important;
                }
                
                .skills-grid-large > div {
                    width: 120px !important;
                    height: 120px !important;
                }
            }
            
            @media (max-width: 1400px) {
                .skills-grid-large {
                    grid-template-columns: repeat(8, 110px) !important;
                    grid-template-rows: repeat(8, 110px) !important;
                    padding: 25px !important;
                    gap: 12px !important;
                }
                
                .skills-grid-large > div {
                    width: 110px !important;
                    height: 110px !important;
                }
            }
        </style>
    `;
    
    console.log('✅ Сетка 8x8 с увеличенными ячейками сгенерирована');
    return finalHtml;
}

// ========== МЕТОД ДЛЯ ПРИМЕНЕНИЯ СТИЛЕЙ ИЗ КОНСОЛИ ==========
applyFixedStyles() {
    const style = document.createElement('style');
    style.id = 'skills-fixed-styles';
    style.textContent = `
        /* ГАРАНТИРОВАННЫЕ СТИЛИ ДЛЯ СЕТКИ */
        .skills-grid-debug,
        .skills-matrix-container,
        .skills-grid-container > div {
            display: grid !important;
            grid-template-columns: repeat(8, 100px) !important;
            grid-template-rows: repeat(8, 100px) !important;
            gap: 10px !important;
            margin: 20px auto !important;
            width: fit-content !important;
            padding: 25px !important;
            background: rgba(31, 41, 55, 0.95) !important;
            border-radius: 15px !important;
            border: 3px solid #374151 !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
            position: relative !important;
        }
        
        /* Сброс всех возможных переопределений */
        .skill-cell,
        .skills-grid-row,
        .skills-grid-header,
        .grid-column-header,
        .grid-row-header {
            all: unset !important;
        }
        
        /* Ячейки навыков */
        div[class*="skill-cell"],
        .skills-grid-debug > div {
            width: 100px !important;
            height: 100px !important;
            min-width: 100px !important;
            min-height: 100px !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            border-radius: 12px !important;
            border: 3px solid !important;
            cursor: pointer !important;
            position: relative !important;
            transition: all 0.3s ease !important;
        }
        
        /* Запрещаем флекс-бокс ломать сетку */
        .skills-overlay,
        .overlay-content,
        .overlay-body,
        .skills-grid-container {
            display: block !important;
        }
        
        /* Отключаем все мешающие стили */
        * {
            box-sizing: border-box;
        }
        
        /* Принудительная сетка */
        .skills-grid-fixed {
            display: grid !important;
            grid-template-columns: repeat(8, 100px) !important;
            grid-template-rows: repeat(8, 100px) !important;
            gap: 10px !important;
        }
    `;
    
    // Удаляем старые стили если есть
    const oldStyle = document.getElementById('skills-fixed-styles');
    if (oldStyle) oldStyle.remove();
    
    document.head.appendChild(style);
    console.log('✅ Гарантированные стили применены');
    
    // Также добавляем инлайн стили в body для надежности
    const inlineStyle = document.createElement('div');
    inlineStyle.style.cssText = `
        position: fixed;
        pointer-events: none;
        opacity: 0;
    `;
    inlineStyle.innerHTML = `
        <style>
            /* Последняя попытка - !important везде */
            .skills-matrix-container { display: grid !important; }
            .skills-grid-rows { display: contents !important; }
            .skills-grid-row { display: contents !important; }
            .skill-cell { 
                display: block !important; 
                float: none !important;
                clear: none !important;
            }
        </style>
    `;
    document.body.appendChild(inlineStyle);
    
    return true;
}

// Добавь этот метод в класс SkillsSystem

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
