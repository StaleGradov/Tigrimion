"use strict";

class MapRenderer {
    constructor(mapSystem) {
        this.mapSystem = mapSystem;
        
        this.canvas = null;
        this.ctx = null;
        this.hexSize = 40;
        this.showGrid = false;
        
        this.zoomLevel = 1.0;
        this.minZoom = 0.1;
        this.maxZoom = 5.0;
        this.zoomStep = 0.2;
        this.mapOffset = { x: 0, y: 0 };
        
        this.tooltipElement = null;
        this.currentTooltip = null;
        this.tooltipTimeout = null;
        this.resizeTimeout = null;
        
        this.objectSymbols = {
            'player_start': '⭐',
            'monster': '👹',
            'chest': '📦',
            'npc': '🧙',
            'exit': '🚪',
            'tree': '🌲',
            'cave': '🕳️',
            'merchant': '🛒',
            'water': '💧',
            'campfire': '🔥',
            'village': '🏘️',
            'castle': '🏰'
        };
        
        console.log("✅ MapRenderer инициализирован");
    }
    
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
        this.canvas.style.background = '#1a1a2e';
        this.canvas.style.border = '2px solid #00ffff';
        this.canvas.style.cursor = 'pointer';
        container.appendChild(this.canvas);
        
        this.ctx = this.canvas.getContext('2d');
        
        this.zoomLevel = 1.0;
        this.mapOffset = { x: 0, y: 0 };
        
        this.calculateCSSScale();
        this.setupCanvasEventListeners();
        
        console.log("✅ Canvas инициализирован");
        this.drawTacticalMap();
    }
    
    calculateCSSScale() {
        const container = document.querySelector('.tactical-map-visual');
        if (!container || !this.canvas) return;
        
        const rect = container.getBoundingClientRect();
        const scaleX = rect.width / 1024;
        const scaleY = rect.height / 1024;
        const scale = Math.min(scaleX, scaleY) * 0.85;
        
        this.zoomLevel = scale;
        this.canvas.style.transform = `scale(${scale})`;
        this.canvas.style.transformOrigin = 'center center';
    }
    
    setupCanvasEventListeners() {
        if (!this.canvas) return;
        
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
        this.canvas.addEventListener('mouseleave', () => this.hideTooltip());
        
        window.addEventListener('resize', () => {
            if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.calculateCSSScale();
                this.drawTacticalMap();
                this.mapSystem.updateMovementInfo();
            }, 100);
        });
    }
    
    handleCanvasClick(e) {
        if (!this.mapSystem.currentTacticalMap) return;
        
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
        if (!hex) return;
        
        // Обработка специальных клеток
        if (hex.type === 'water') {
            if (!this.mapSystem.isPlayerAdjacentToWater(hex)) {
                this.mapSystem.showNotification("❌ Подойдите ближе к воде!", 'warning');
                return;
            }
            this.mapSystem.handleWaterCell(hex);
            return;
        }
        
        if (hex.type === 'merchant') {
            this.mapSystem.handleMerchantClick(hex);
            return;
        }
        
        if (this.mapSystem.isTransitionCell(hex)) {
            this.mapSystem.handleTransitionClick(hex);
            return;
        }
        
        if (hex.passable !== false) {
            const neighbors = this.mapSystem.getHexNeighbors(
                this.mapSystem.playerTacticalPosition.y, 
                this.mapSystem.playerTacticalPosition.x
            );
            const isReachable = neighbors.some(neighbor => 
                neighbor.row === hex.row && neighbor.col === hex.col
            );
            
            if (isReachable) {
                this.mapSystem.moveOnTacticalMap(hex.col, hex.row);
            }
        }
        
        if (!this.mapSystem.isTransitionCell(hex)) {
            this.mapSystem.updateCellActionsUI(hex);
            this.mapSystem.highlightSelectedCell(hex);
        }
    }
    
    getHexAtLogicalPosition(x, y) {
        const cells = Object.values(this.mapSystem.currentTacticalMap.cells);
        let closestHex = null;
        let minDistance = Infinity;
        
        for (const cell of cells) {
            const cellX = cell.x || 0;
            const cellY = cell.y || 0;
            const distance = Math.sqrt(Math.pow(x - cellX, 2) + Math.pow(y - cellY, 2));
            
            if (distance <= 40 && distance < minDistance) {
                minDistance = distance;
                closestHex = cell;
            }
        }
        
        return closestHex;
    }
    
    // ========== ОТРИСОВКА ==========
    
    drawTacticalMap() {
        if (!this.ctx || !this.mapSystem.currentTacticalMap) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBackground();
    }
    
    drawBackground() {
        const map = this.mapSystem.currentTacticalMap;
        
        if (!map.image) {
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.drawHexes();
            if (this.showGrid) this.drawHexGrid();
            return;
        }
        
        const img = new Image();
        img.onload = () => {
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            this.drawHexes();
            if (this.showGrid) this.drawHexGrid();
        };
        img.onerror = () => {
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawHexes();
            if (this.showGrid) this.drawHexGrid();
        };
        img.src = map.image;
    }
    
    drawHexGrid() {
        const cells = Object.values(this.mapSystem.currentTacticalMap.cells);
        const hexSize = this.mapSystem.currentTacticalMap.cellSize || 40;
        
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(76, 201, 240, 0.6)';
        this.ctx.lineWidth = 1;
        
        cells.forEach(cell => {
            if (cell.visible) {
                const centerX = cell.x || 0;
                const centerY = cell.y || 0;
                
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
        const cells = Object.values(this.mapSystem.currentTacticalMap.cells);
        
        cells.forEach(cell => {
            if (cell.visible) {
                this.drawSingleHex(cell);
                this.drawHexContent(cell);
            }
        });
    }
    
    drawSingleHex(cell) {
        const hexSize = this.mapSystem.currentTacticalMap.cellSize || 40;
        const centerX = cell.x || 0;
        const centerY = cell.y || 0;
        
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
        
        if (cell.isHighlighted) {
            this.ctx.fillStyle = this.mapSystem.isTransitionCell(cell) ? 
                'rgba(255, 215, 0, 0.4)' : 'rgba(255, 255, 0, 0.3)';
            this.ctx.fill();
        }
        
        if (cell.isSelected) {
            this.ctx.strokeStyle = '#00ffff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            this.ctx.shadowColor = '#00ffff';
            this.ctx.shadowBlur = 15;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;
        }
        
        this.ctx.restore();
    }
    
    drawHexContent(cell) {
        const centerX = cell.x || 0;
        const centerY = cell.y || 0;
        
        this.ctx.save();
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        let fontSize = 16;
        let symbol = '·';
        let color = '#ffffff';
        
        if (cell.col === this.mapSystem.playerTacticalPosition.x && 
            cell.row === this.mapSystem.playerTacticalPosition.y) {
            symbol = '🎯';
            fontSize = 20;
        } else if (cell.hasLoot) {
            symbol = '💎';
            color = '#f59e0b';
            fontSize = 18;
        } else {
            symbol = this.objectSymbols[cell.type] || '·';
            
            switch(cell.type) {
                case 'monster': color = '#ef4444'; break;
                case 'chest': color = '#f59e0b'; break;
                case 'npc': case 'merchant': color = '#3b82f6'; break;
                case 'exit': color = '#8b5cf6'; break;
                case 'village': case 'castle': color = '#fbbf24'; break;
                case 'water': color = '#0ea5e9'; break;
                case 'campfire': color = '#dc2626'; break;
            }
        }
        
        this.ctx.font = `bold ${fontSize}px Arial`;
        this.ctx.fillStyle = color;
        this.ctx.fillText(symbol, centerX, centerY);
        
        if (cell.explored) {
            this.ctx.font = 'bold 14px Arial';
            this.ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
            this.ctx.fillText('✓', centerX + 20, centerY - 20);
        }
        
        this.ctx.restore();
    }
    
    // ========== HOVER И ТУЛТИПЫ ==========
    
    handleCanvasHover(e) {
        if (!this.mapSystem.currentTacticalMap) return;
        
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
        if (!tooltipText) return;
        
        if (!this.tooltipElement) {
            this.createTooltipElement();
        }
        
        this.removeHighlight();
        this.currentTooltip = hex;
        hex.isHighlighted = true;
        
        this.tooltipElement.textContent = tooltipText;
        this.tooltipElement.style.display = 'block';
        
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        let left = mouseX + 15;
        let top = mouseY + 15;
        
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = mouseX - tooltipRect.width - 15;
        }
        if (top + tooltipRect.height > window.innerHeight - 10) {
            top = mouseY - tooltipRect.height - 15;
        }
        
        this.tooltipElement.style.left = left + 'px';
        this.tooltipElement.style.top = top + 'px';
        
        this.drawTacticalMap();
    }
    
    getTooltipTextForHex(hex) {
        if (!hex.visible) return null;
        
        if (hex.tooltip) return hex.tooltip;
        
        const defaultTooltips = {
            'player_start': '⭐ Стартовая позиция',
            'monster': '👹 Враждебная территория\n(Возможен бой)',
            'chest': '📦 Тайный сундук\n(Может содержать сокровища)',
            'npc': '🧙 Таинственный незнакомец',
            'exit': '🚪 Выход с карты',
            'water': '💧 Водный источник\n(Пополнение фляги)',
            'merchant': '🛒 Магазин\n(Торговля)',
            'village': '🏘️ Деревня\n(Мирное поселение)',
            'campfire': '🔥 Костер\n(Место отдыха)'
        };
        
        let baseTooltip = defaultTooltips[hex.type];
        
        if (hex.explored) {
            baseTooltip = '✓ Исследованная клетка\n(Действия уже выполнены)';
        }
        
        return baseTooltip;
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
    
    removeHighlight() {
        let needsRedraw = false;
        
        if (this.mapSystem.currentTacticalMap) {
            Object.values(this.mapSystem.currentTacticalMap.cells).forEach(cell => {
                if (cell.isHighlighted) {
                    cell.isHighlighted = false;
                    needsRedraw = true;
                }
            });
        }
        
        this.currentTooltip = null;
        
        if (needsRedraw) {
            this.drawTacticalMap();
        }
    }
    
    // ========== ЗУМ ==========
    
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
        if (!this.mapSystem.currentTacticalMap) return;
        
        const zoomElement = document.getElementById('currentZoom');
        if (zoomElement) {
            zoomElement.textContent = `${Math.round(this.zoomLevel * 100)}%`;
        }
        
        this.canvas.style.transform = `scale(${this.zoomLevel})`;
        this.drawTacticalMap();
    }
    
    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.drawTacticalMap();
    }
    
    toggleFullscreen() {
        if (!this.canvas) return;
        
        if (!document.fullscreenElement) {
            if (this.canvas.requestFullscreen) {
                this.canvas.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
}
