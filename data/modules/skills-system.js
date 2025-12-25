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

    // ========== ИНТЕРФЕЙС ==========
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

        // Генерируем матрицу навыков
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
                        <h2>🌟 Древо Навыков</h2>
                        <div class="skills-info">
                            <div class="skill-points-display ${this.availableSkillPoints === 0 ? 'low' : ''}">
                                ✨ Очков навыков: ${this.availableSkillPoints}
                            </div>
                            <div style="color: #9ca3af;">
                                Уровень героя: ${hero.level}
                            </div>
                        </div>
                    </div>
                    
                    <div class="skills-grid-container">
                        <!-- Панель информации о выбранном навыке -->
                        <div class="skills-info-panel">
                            ${selectedSkillInfo}
                        </div>
                        
                        <!-- Матрица навыков -->
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
                    
                    <!-- Справка -->
                    <div class="skills-help">
                        <h4>📖 Как работает система навыков:</h4>
                        <ul>
                            <li>Каждый уровень героя дает 1 очко навыков</li>
                            <li>Навыки расположены в виде матрицы 8x8 (8 уровней, 8 типов бонусов)</li>
                            <li>Для изучения навыка нужен соответствующий уровень героя</li>
                            <li>Некоторые навыки требуют изучения предыдущих навыков</li>
                            <li>На уровнях 1, 2, 4 и 8 нужно делать выбор между альтернативными путями</li>
                            <li>Красная рамка - нельзя изучить, зеленая - можно, синяя - уже изучен</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем обработчики событий для навыков
        this.attachSkillEventHandlers();
    }

  // ========== ОБНОВЛЕННЫЙ МЕТОД ДЛЯ ШАХМАТНОГО ПОЛЯ 8x8 ==========
generateSkillsMatrix() {
    let matrixHTML = '';
    
    // Создаем сетку 8x8
    // Каждая строка представляет уровень (1-8)
    // Каждая колонка представляет тип бонуса (здоровье, урон и т.д.)
    
    // Заголовок колонок (типы бонусов)
    const bonusTypes = ['health', 'damage', 'crit', 'vampire', 'armor', 'gold', 'regen', 'penetration'];
    const bonusIcons = ['❤️', '⚔️', '🎯', '🩸', '🛡️', '💰', '⚡', '💥'];
    const bonusNames = ['Здоровье', 'Урон', 'Крит', 'Вампир', 'Броня', 'Золото', 'Реген', 'Пробитие'];
    
    matrixHTML += `
        <div class="skills-grid-header">
            <div class="grid-header-spacer"></div>
            ${bonusTypes.map((type, index) => `
                <div class="grid-column-header" title="${bonusNames[index]}">
                    ${bonusIcons[index]}
                    <div class="column-name">${bonusNames[index]}</div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Генерируем 8 строк (уровней)
    for (let row = 1; row <= 8; row++) {
        matrixHTML += `<div class="skills-grid-row">`;
        
        // Заголовок строки (уровень)
        matrixHTML += `
            <div class="grid-row-header" title="Уровень ${row}">
                <div class="level-badge">${row}</div>
                <div class="level-label">Ур. ${row}</div>
            </div>
        `;
        
        // Генерируем 8 ячеек (по одной на каждый тип бонуса)
        for (let col = 1; col <= 8; col++) {
            const skill = this.getSkillByPosition(row, col);
            if (!skill) {
                matrixHTML += `<div class="skill-cell empty"></div>`;
                continue;
            }
            
            const isUnlocked = this.unlockedSkills.has(skill.id);
            const canLearn = this.canLearnSkill(skill.id);
            const isSelected = this.selectedSkill?.id === skill.id;
            
            // Определяем классы для ячейки
            let cellClass = 'skill-cell';
            if (isUnlocked) {
                cellClass += ' unlocked';
            } else if (canLearn) {
                cellClass += ' available';
            } else {
                cellClass += ' locked';
                
                // Проверяем, не выполнены ли требования
                const hero = this.game.currentHero;
                if (hero && hero.level < skill.requirements.heroLevel) {
                    cellClass += ' requirements-not-met';
                }
            }
            
            if (isSelected) {
                cellClass += ' selected';
            }
            
            // Определяем стиль для ячейки в зависимости от типа бонуса
            const bonusColor = this.getBonusColor(skill.type);
            
            // Определяем, является ли это выборочной нодой
            const isChoiceNode = row === 1 || row === 2 || row === 4 || row === 8;
            
            matrixHTML += `
                <div class="${cellClass}" 
                     data-skill-id="${skill.id}"
                     onclick="game.systems.skills.selectSkill(${skill.id})"
                     title="${skill.name}
${skill.description}
Требуется: Уровень ${skill.requirements.heroLevel}, ${skill.requirements.skillPoints} очков навыков"
                     style="border-color: ${bonusColor}; ${isChoiceNode ? 'box-shadow: 0 0 15px rgba(255, 255, 255, 0.3);' : ''}">
                    
                    <div class="skill-cell-content">
                        <div class="skill-cell-icon" style="color: ${bonusColor};">
                            ${skill.icon}
                        </div>
                        
                        <div class="skill-cell-bonus" style="color: ${bonusColor};">
                            +${skill.bonusValue}%
                        </div>
                        
                        <!-- Индикатор выборочной ноды -->
                        ${isChoiceNode ? `
                            <div class="choice-indicator" style="background: ${bonusColor};">
                                ⚡
                            </div>
                        ` : ''}
                        
                        <!-- Индикатор изученности -->
                        ${isUnlocked ? `
                            <div class="unlocked-indicator">
                                ✓
                            </div>
                        ` : ''}
                        
                        <!-- Требуемый уровень -->
                        ${!isUnlocked && !canLearn ? `
                            <div class="level-requirement">
                                ${skill.requirements.heroLevel}
                            </div>
                        ` : ''}
                    </div>
                    
                    <!-- Эффект выбора -->
                    ${isSelected ? `
                        <div class="selection-effect" style="border-color: ${bonusColor};"></div>
                    ` : ''}
                </div>
            `;
        }
        
        matrixHTML += `</div>`;
    }
    
    return matrixHTML;
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
        
        // Проверяем требования
        const levelMet = hero && hero.level >= skill.requirements.heroLevel;
        const pointsMet = this.availableSkillPoints >= skill.requirements.skillPoints;
        
        // Проверяем зависимости
        const dependenciesMet = skill.dependencies.length === 0 || 
            skill.dependencies.some(depId => this.unlockedSkills.has(depId));
        
        // Проверяем альтернативы (для выборочных нод)
        let alternativesInfo = '';
        if (skill.isChoiceNode && skill.alternatives.length > 0) {
            const alternativeSkills = skill.alternatives
                .map(id => this.getSkillById(id))
                .filter(s => s);
            
            if (alternativeSkills.length > 0) {
                alternativesInfo = `
                    <div style="margin-top: 15px; padding: 10px; background: #374151; border-radius: 6px;">
                        <div style="font-weight: bold; color: #fbbf24; margin-bottom: 5px;">
                            ⚠️ Альтернативные пути:
                        </div>
                        ${alternativeSkills.map(alt => `
                            <div style="font-size: 0.9rem; color: ${this.unlockedSkills.has(alt.id) ? '#34d399' : '#9ca3af'};">
                                ${this.unlockedSkills.has(alt.id) ? '✓ ' : '○ '}${alt.name}
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }
        
        return `
            <div class="selected-skill-info">
                <div class="selected-skill-header">
                    <div class="selected-skill-icon">
                        ${skill.icon}
                    </div>
                    <div class="selected-skill-name">
                        ${skill.name}
                    </div>
                    <div class="selected-skill-type">
                        ${this.getBonusName(skill.type)} • Уровень ${skill.level}
                    </div>
                </div>
                
                <div class="selected-skill-description">
                    ${skill.description}
                </div>
                
                <div class="selected-skill-bonus">
                    <div style="font-weight: bold; margin-bottom: 5px;">Бонус:</div>
                    <div class="bonus-value skill-bonus-${skill.type}">
                        +${skill.bonusValue}% к ${this.getBonusName(skill.type).toLowerCase()}
                    </div>
                </div>
                
                <div class="selected-skill-requirements">
                    <div style="font-weight: bold; margin-bottom: 10px;">Требования:</div>
                    
                    <div class="requirement-item">
                        <span>Уровень героя:</span>
                        <span class="${levelMet ? 'requirement-met' : 'requirement-not-met'}">
                            ${hero?.level || 0}/${skill.requirements.heroLevel}
                        </span>
                    </div>
                    
                    <div class="requirement-item">
                        <span>Очков навыков:</span>
                        <span class="${pointsMet ? 'requirement-met' : 'requirement-not-met'}">
                            ${this.availableSkillPoints}/${skill.requirements.skillPoints}
                        </span>
                    </div>
                    
                    ${skill.dependencies.length > 0 ? `
                        <div class="requirement-item">
                            <span>Предыдущие навыки:</span>
                            <span class="${dependenciesMet ? 'requirement-met' : 'requirement-not-met'}">
                                ${dependenciesMet ? '✓ Выполнено' : '❌ Не выполнено'}
                            </span>
                        </div>
                    ` : ''}
                </div>
                
                ${alternativesInfo}
                
                <div class="skill-actions">
                    ${isUnlocked ? `
                        <button class="btn-learn-skill" disabled style="background: #10b981;">
                            ✅ Уже изучен
                        </button>
                    ` : canLearn ? `
                        <button class="btn-learn-skill" 
                                onclick="game.systems.skills.learnSkill(${skill.id})">
                            ✨ Изучить навык (${skill.requirements.skillPoints} очков)
                        </button>
                    ` : `
                        <button class="btn-learn-skill" disabled>
                            ❌ Требования не выполнены
                        </button>
                    `}
                </div>
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
