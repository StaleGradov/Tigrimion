/* ========== ОПТИМИЗИРОВАННЫЙ ИНТЕРФЕЙС ГЕРОЯ V4 ========== */
/* Версия с фоновым изображением */

.hero-game-screen {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background-image: url('https://raw.githubusercontent.com/StaleGradov/Tigrimion/GAME/images/locations/69.jpg');
    background-size: cover;
    background-position: center;
    background-attachment: fixed;
    background-repeat: no-repeat;
}

.top-action-bar {
    display: flex;
    justify-content: center;
    gap: 1rem;
    padding: 1rem;
    background: rgba(15, 23, 42, 0.9);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid #334155;
    flex-wrap: wrap;
    z-index: 100;
    position: relative;
}

.hero-main-window-v2 {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    gap: 2rem;
    max-width: 1700px;
    margin: 0 auto;
    width: 100%;
    padding: 2rem;
    min-height: 90vh;
}

/* Боковые колонки для экипировки */
.equipment-column-v2 {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 270px;
    flex-shrink: 0;
}

/* Центральная область */
.hero-center-area-v2 {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    flex: 1;
    max-width: 850px;
}

/* Контейнер для картинки героя */
.hero-image-container-v2 {
    width: 100%;
    height: 850px;
    position: relative;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 15px;
    overflow: hidden;
    border: 3px solid #334155;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-start;
    justify-content: center;
}

/* Сама картинка героя */
.hero-image-container-v2 img {
    width: 100%;
    height: 120%;
    object-fit: contain;
    display: block;
    margin-top: -18%;
    transform: translateY(-5%);
}

/* Слот экипировки */
.equipment-slot-column-v2 {
    background: rgba(30, 41, 59, 0.95);
    border: 3px solid #475569;
    border-radius: 15px;
    padding: 0;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
    height: 270px;
    width: 270px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    overflow: hidden;
}

.equipment-slot-column-v2:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.15);
    transform: translateY(-3px);
    box-shadow: 0 10px 25px rgba(59, 130, 246, 0.4);
}

.equipment-slot-column-v2.equipped {
    border-style: solid;
    padding: 0;
}

/* Цвета рамок в зависимости от редкости предмета */
.equipment-slot-column-v2[data-rarity="common"] { 
    border-color: #9ca3af !important;
    box-shadow: 0 6px 15px rgba(156, 163, 175, 0.3);
}
.equipment-slot-column-v2[data-rarity="uncommon"] { 
    border-color: #4cc9f0 !important;
    box-shadow: 0 6px 15px rgba(76, 201, 240, 0.4);
}
.equipment-slot-column-v2[data-rarity="rare"] { 
    border-color: #a855f7 !important;
    box-shadow: 0 6px 15px rgba(168, 85, 247, 0.5);
}
.equipment-slot-column-v2[data-rarity="epic"] { 
    border-color: #f59e0b !important;
    box-shadow: 0 6px 15px rgba(245, 158, 11, 0.6);
    animation: equipment-epic-pulse 2s ease-in-out infinite;
}
.equipment-slot-column-v2[data-rarity="legendary"] { 
    border-color: #ffd700 !important;
    box-shadow: 0 6px 15px rgba(255, 215, 0, 0.7);
    animation: equipment-legendary-glow 1.5s ease-in-out infinite alternate;
}
.equipment-slot-column-v2[data-rarity="mythic"] { 
    border-color: #ff6b6b !important;
    box-shadow: 0 6px 15px rgba(255, 107, 107, 0.7);
    animation: equipment-mythic-pulse 1s ease-in-out infinite;
}

/* Иконка слота */
.slot-icon-column-v2 {
    width: 100% !important;
    height: calc(100% - 35px) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 0 !important;
    margin: 0 !important;
    flex: 1 !important;
}

.slot-icon-column-v2 img {
    width: 100% !important;
    height: 100% !important;
    object-fit: contain !important;
    max-width: 100% !important;
    max-height: 100% !important;
    padding: 0 !important;
    display: block !important;
}

/* Подпись слота */
.slot-label-column-v2 {
    font-size: 0.9rem;
    color: #cbd5e1;
    font-weight: 600;
    text-align: center;
    line-height: 1.2;
    padding: 0.4rem;
    background: rgba(0, 0, 0, 0.6);
    width: 100%;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

/* Панель с полосками здоровья/опыта */
.hero-overlay-stats-v2 {
    position: absolute;
    bottom: 20px;
    left: 20px;
    right: 20px;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(15px);
    padding: 1rem;
    border: 2px solid #334155;
    border-radius: 12px;
    z-index: 10;
}

/* Контейнер для всей информации под картинкой */
.hero-full-info-v2 {
    width: 100%;
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

/* Секция с информацией о происхождении */
.hero-origins-section-v2 {
    background: rgba(255, 215, 0, 0.1);
    border: 1px solid rgba(255, 215, 0, 0.3);
    border-radius: 10px;
    padding: 0.6rem;
    margin: 0;
}

.origin-item-v2 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.3rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.9rem;
}

.origin-item-v2:last-child {
    border-bottom: none;
}

.origin-type-v2 {
    font-weight: bold;
    color: #cbd5e1;
    font-size: 0.9rem;
}

.origin-bonus-v2 {
    color: #4cc9f0;
    font-size: 0.8rem;
    text-align: right;
}

/* Секция с активными бонусами */
.hero-bonuses-section-v2 {
    background: rgba(76, 201, 240, 0.1);
    border: 1px solid rgba(76, 201, 240, 0.3);
    border-radius: 10px;
    padding: 0.6rem;
    margin: 0;
}

.bonuses-grid-v2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
}

.bonus-item-v2 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.3rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 0.8rem;
}

.bonus-item-v2:last-child {
    border-bottom: none;
}

.bonus-label-v2 {
    color: #cbd5e1;
    font-size: 0.8rem;
}

.bonus-value-v2 {
    font-weight: 600;
    color: white;
    font-size: 0.8rem;
}

/* Сетка для компактного отображения основных параметров */
.compact-stats-v2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    width: 100%;
    margin-bottom: 0.5rem;
}

.compact-stat-v2 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0;
    font-size: 0.85rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.compact-stat-v2:last-child {
    border-bottom: none;
}

.stat-label-v2 {
    color: #cbd5e1;
    font-size: 0.8rem;
}

.stat-value-v2 {
    font-weight: 700;
    color: white;
    font-size: 0.8rem;
}

/* Анимации для экипировки */
@keyframes equipment-epic-pulse {
    0% { 
        box-shadow: 0 6px 15px rgba(245, 158, 11, 0.6);
    }
    50% { 
        box-shadow: 0 6px 20px rgba(245, 158, 11, 0.9);
    }
    100% { 
        box-shadow: 0 6px 15px rgba(245, 158, 11, 0.6);
    }
}

@keyframes equipment-legendary-glow {
    from {
        box-shadow: 0 6px 15px rgba(255, 215, 0, 0.7);
    }
    to {
        box-shadow: 0 6px 20px rgba(255, 215, 0, 1);
    }
}

@keyframes equipment-mythic-pulse {
    0% { 
        box-shadow: 0 6px 15px rgba(255, 107, 107, 0.7);
    }
    50% { 
        box-shadow: 0 6px 20px rgba(255, 107, 107, 0.9);
    }
    100% { 
        box-shadow: 0 6px 15px rgba(255, 107, 107, 0.7);
    }
}

/* Стиль для тактической карты, которая теперь открывается ниже */
.tactical-map-container {
    width: 100%;
    background: rgba(15, 23, 42, 0.9);
    border-top: 2px solid #334155;
    padding: 2rem;
    margin-top: 2rem;
}

.tactical-map {
    max-width: 1200px;
    margin: 0 auto;
    background: rgba(30, 41, 59, 0.95);
    border-radius: 15px;
    padding: 2rem;
    border: 2px solid #475569;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}
