// Custom Canvas Editor for Flyer Generator
class CanvasEditor {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.objects = [];
        this.selectedObject = null;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.zoom = 1;
        this.history = [];
        this.historyStep = 0;
        this.snapToGrid = false;
        this.gridSize = 20;
        this.isResizing = false;
        this.resizeHandle = null;
        
        this.initEvents();
        this.render();
        this.saveState();
    }
    
    initEvents() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    }
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom;
        const y = (e.clientY - rect.top) / this.zoom;
        
        // Check for resize handles first
        if (this.selectedObject && this.selectedObject.type !== 'text') {
            const handle = this.getResizeHandle(x, y);
            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
                this.dragStart = { x, y };
                return;
            }
        }
        
        // Check if clicking on an object
        const clickedObject = this.getObjectAt(x, y);
        
        if (clickedObject) {
            this.selectedObject = clickedObject;
            this.isDragging = true;
            this.dragStart = {
                x: x - clickedObject.x,
                y: y - clickedObject.y
            };
        } else {
            this.selectedObject = null;
        }
        
        this.render();
        this.updatePropertiesPanel();
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom;
        const y = (e.clientY - rect.top) / this.zoom;
        
        if (this.isResizing && this.selectedObject) {
            this.resizeObject(x, y);
            this.render();
        } else if (this.isDragging && this.selectedObject) {
            let newX = x - this.dragStart.x;
            let newY = y - this.dragStart.y;
            
            if (this.snapToGrid) {
                newX = Math.round(newX / this.gridSize) * this.gridSize;
                newY = Math.round(newY / this.gridSize) * this.gridSize;
            }
            
            this.selectedObject.x = newX;
            this.selectedObject.y = newY;
            this.render();
        }
    }
    
    handleMouseUp() {
        if (this.isDragging || this.isResizing) {
            this.saveState();
        }
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
    }
    
    handleDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom;
        const y = (e.clientY - rect.top) / this.zoom;
        
        const obj = this.getObjectAt(x, y);
        if (obj && obj.type === 'text') {
            const newText = prompt('Enter text:', obj.text);
            if (newText !== null) {
                obj.text = newText;
                this.render();
                this.saveState();
            }
        }
    }
    
    getObjectAt(x, y) {
        for (let i = this.objects.length - 1; i >= 0; i--) {
            const obj = this.objects[i];
            if (this.isPointInObject(x, y, obj)) {
                return obj;
            }
        }
        return null;
    }
    
    isPointInObject(x, y, obj) {
        switch(obj.type) {
            case 'rect':
                return x >= obj.x && x <= obj.x + obj.width &&
                       y >= obj.y && y <= obj.y + obj.height;
            case 'circle':
                const dx = x - obj.x;
                const dy = y - obj.y;
                return Math.sqrt(dx * dx + dy * dy) <= obj.radius;
            case 'triangle':
                return x >= obj.x - obj.width/2 && x <= obj.x + obj.width/2 &&
                       y >= obj.y - obj.height && y <= obj.y;
            case 'text':
                this.ctx.font = this.getFont(obj);
                const metrics = this.ctx.measureText(obj.text);
                const textHeight = obj.fontSize * 1.2;
                return x >= obj.x && x <= obj.x + metrics.width &&
                       y >= obj.y - textHeight && y <= obj.y;
            case 'image':
                return x >= obj.x && x <= obj.x + obj.width &&
                       y >= obj.y && y <= obj.y + obj.height;
        }
        return false;
    }
    
    getResizeHandle(x, y) {
        if (!this.selectedObject) return null;
        
        const handles = this.getResizeHandles(this.selectedObject);
        const threshold = 8;
        
        for (const [name, pos] of Object.entries(handles)) {
            if (Math.abs(x - pos.x) < threshold && Math.abs(y - pos.y) < threshold) {
                return name;
            }
        }
        return null;
    }
    
    getResizeHandles(obj) {
        const handles = {};
        if (obj.type === 'rect' || obj.type === 'image') {
            handles.se = { x: obj.x + obj.width, y: obj.y + obj.height };
            handles.sw = { x: obj.x, y: obj.y + obj.height };
            handles.ne = { x: obj.x + obj.width, y: obj.y };
            handles.nw = { x: obj.x, y: obj.y };
        } else if (obj.type === 'circle') {
            handles.e = { x: obj.x + obj.radius, y: obj.y };
            handles.w = { x: obj.x - obj.radius, y: obj.y };
            handles.n = { x: obj.x, y: obj.y - obj.radius };
            handles.s = { x: obj.x, y: obj.y + obj.radius };
        }
        return handles;
    }
    
    resizeObject(x, y) {
        const obj = this.selectedObject;
        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;
        
        if (obj.type === 'rect' || obj.type === 'image') {
            if (this.resizeHandle.includes('e')) {
                obj.width = Math.max(20, obj.width + dx);
            }
            if (this.resizeHandle.includes('w')) {
                const newWidth = Math.max(20, obj.width - dx);
                if (newWidth > 20) {
                    obj.x += dx;
                    obj.width = newWidth;
                }
            }
            if (this.resizeHandle.includes('s')) {
                obj.height = Math.max(20, obj.height + dy);
            }
            if (this.resizeHandle.includes('n')) {
                const newHeight = Math.max(20, obj.height - dy);
                if (newHeight > 20) {
                    obj.y += dy;
                    obj.height = newHeight;
                }
            }
        } else if (obj.type === 'circle') {
            const newRadius = Math.max(10, obj.radius + (dx + dy) / 2);
            obj.radius = newRadius;
        }
        
        this.dragStart = { x, y };
    }
    
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw background
        if (this.background) {
            if (typeof this.background === 'string') {
                this.ctx.fillStyle = this.background;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            } else if (this.background.type === 'gradient') {
                const grad = this.background;
                const gradient = this.ctx.createLinearGradient(
                    grad.x0, grad.y0, grad.x1, grad.y1
                );
                grad.stops.forEach(stop => {
                    gradient.addColorStop(stop.offset, stop.color);
                });
                this.ctx.fillStyle = gradient;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            } else if (this.background.type === 'pattern') {
                const pattern = this.ctx.createPattern(this.background.canvas, 'repeat');
                this.ctx.fillStyle = pattern;
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }
        
        // Draw all objects
        this.objects.forEach(obj => {
            this.drawObject(obj);
        });
        
        // Draw selection
        if (this.selectedObject) {
            this.drawSelection(this.selectedObject);
        }
    }
    
    drawObject(obj) {
        this.ctx.save();
        this.ctx.globalAlpha = obj.opacity !== undefined ? obj.opacity : 1;
        
        switch(obj.type) {
            case 'rect':
                this.ctx.fillStyle = obj.fill;
                this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
                if (obj.strokeWidth > 0) {
                    this.ctx.strokeStyle = obj.stroke;
                    this.ctx.lineWidth = obj.strokeWidth;
                    this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
                }
                break;
            case 'circle':
                this.ctx.beginPath();
                this.ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = obj.fill;
                this.ctx.fill();
                if (obj.strokeWidth > 0) {
                    this.ctx.strokeStyle = obj.stroke;
                    this.ctx.lineWidth = obj.strokeWidth;
                    this.ctx.stroke();
                }
                break;
            case 'triangle':
                this.ctx.beginPath();
                this.ctx.moveTo(obj.x, obj.y - obj.height);
                this.ctx.lineTo(obj.x - obj.width/2, obj.y);
                this.ctx.lineTo(obj.x + obj.width/2, obj.y);
                this.ctx.closePath();
                this.ctx.fillStyle = obj.fill;
                this.ctx.fill();
                if (obj.strokeWidth > 0) {
                    this.ctx.strokeStyle = obj.stroke;
                    this.ctx.lineWidth = obj.strokeWidth;
                    this.ctx.stroke();
                }
                break;
            case 'text':
                this.ctx.font = this.getFont(obj);
                this.ctx.fillStyle = obj.fill;
                this.ctx.textAlign = obj.textAlign || 'left';
                this.ctx.fillText(obj.text, obj.x, obj.y);
                
                if (obj.underline) {
                    const metrics = this.ctx.measureText(obj.text);
                    this.ctx.strokeStyle = obj.fill;
                    this.ctx.lineWidth = Math.max(1, obj.fontSize / 20);
                    this.ctx.beginPath();
                    this.ctx.moveTo(obj.x, obj.y + 2);
                    this.ctx.lineTo(obj.x + metrics.width, obj.y + 2);
                    this.ctx.stroke();
                }
                break;
            case 'image':
                if (obj.image) {
                    this.ctx.drawImage(obj.image, obj.x, obj.y, obj.width, obj.height);
                }
                break;
        }
        
        this.ctx.restore();
    }
    
    getFont(obj) {
        let font = '';
        if (obj.fontStyle === 'italic') font += 'italic ';
        if (obj.fontWeight === 'bold') font += 'bold ';
        font += obj.fontSize + 'px ';
        font += obj.fontFamily || 'Arial';
        return font;
    }
    
    drawSelection(obj) {
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        if (obj.type === 'rect' || obj.type === 'image') {
            this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
            this.drawResizeHandles(obj);
        } else if (obj.type === 'circle') {
            this.ctx.beginPath();
            this.ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
            this.ctx.stroke();
            this.drawResizeHandles(obj);
        } else if (obj.type === 'triangle') {
            this.ctx.beginPath();
            this.ctx.moveTo(obj.x, obj.y - obj.height);
            this.ctx.lineTo(obj.x - obj.width/2, obj.y);
            this.ctx.lineTo(obj.x + obj.width/2, obj.y);
            this.ctx.closePath();
            this.ctx.stroke();
        } else if (obj.type === 'text') {
            this.ctx.font = this.getFont(obj);
            const metrics = this.ctx.measureText(obj.text);
            const textHeight = obj.fontSize * 1.2;
            this.ctx.strokeRect(obj.x, obj.y - textHeight, metrics.width, textHeight);
        }
        
        this.ctx.setLineDash([]);
    }
    
    drawResizeHandles(obj) {
        const handles = this.getResizeHandles(obj);
        this.ctx.fillStyle = '#667eea';
        
        for (const pos of Object.values(handles)) {
            this.ctx.fillRect(pos.x - 4, pos.y - 4, 8, 8);
        }
    }
    
    addText(text = 'Double click to edit') {
        const obj = {
            type: 'text',
            x: 100,
            y: 100,
            text: text,
            fontFamily: 'Arial',
            fontSize: 24,
            fill: '#000000',
            fontWeight: 'normal',
            fontStyle: 'normal',
            underline: false,
            textAlign: 'left'
        };
        this.objects.push(obj);
        this.selectedObject = obj;
        this.render();
        this.saveState();
    }
    
    addRect() {
        const obj = {
            type: 'rect',
            x: 100,
            y: 100,
            width: 200,
            height: 150,
            fill: '#3498db',
            stroke: '#000000',
            strokeWidth: 2,
            opacity: 1
        };
        this.objects.push(obj);
        this.selectedObject = obj;
        this.render();
        this.saveState();
    }
    
    addCircle() {
        const obj = {
            type: 'circle',
            x: 200,
            y: 175,
            radius: 75,
            fill: '#e74c3c',
            stroke: '#000000',
            strokeWidth: 2,
            opacity: 1
        };
        this.objects.push(obj);
        this.selectedObject = obj;
        this.render();
        this.saveState();
    }
    
    addTriangle() {
        const obj = {
            type: 'triangle',
            x: 175,
            y: 200,
            width: 150,
            height: 150,
            fill: '#2ecc71',
            stroke: '#000000',
            strokeWidth: 2,
            opacity: 1
        };
        this.objects.push(obj);
        this.selectedObject = obj;
        this.render();
        this.saveState();
    }
    
    addImage(src) {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(300 / img.width, 300 / img.height);
            const obj = {
                type: 'image',
                x: 100,
                y: 100,
                width: img.width * scale,
                height: img.height * scale,
                image: img,
                opacity: 1
            };
            this.objects.push(obj);
            this.selectedObject = obj;
            this.render();
            this.saveState();
        };
        img.src = src;
    }
    
    deleteSelected() {
        if (this.selectedObject) {
            const index = this.objects.indexOf(this.selectedObject);
            if (index > -1) {
                this.objects.splice(index, 1);
                this.selectedObject = null;
                this.render();
                this.saveState();
            }
        }
    }
    
    setBackground(bg) {
        this.background = bg;
        this.render();
        this.saveState();
    }
    
    clear() {
        this.objects = [];
        this.selectedObject = null;
        this.background = '#ffffff';
        this.render();
    }
    
    setZoom(zoom) {
        this.zoom = Math.max(0.1, Math.min(5, zoom));
        this.canvas.style.transform = `scale(${this.zoom})`;
        this.canvas.style.transformOrigin = 'top left';
    }
    
    saveState() {
        const state = {
            objects: JSON.parse(JSON.stringify(this.objects.map(obj => {
                if (obj.type === 'image') {
                    return { ...obj, image: obj.image ? obj.image.src : null };
                }
                return obj;
            }))),
            background: this.background
        };
        
        this.history = this.history.slice(0, this.historyStep + 1);
        this.history.push(JSON.stringify(state));
        this.historyStep++;
        
        if (this.history.length > 50) {
            this.history.shift();
            this.historyStep--;
        }
    }
    
    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            this.loadState(JSON.parse(this.history[this.historyStep]));
        }
    }
    
    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            this.loadState(JSON.parse(this.history[this.historyStep]));
        }
    }
    
    loadState(state) {
        this.objects = state.objects.map(obj => {
            if (obj.type === 'image' && obj.image) {
                const img = new Image();
                img.src = obj.image;
                return { ...obj, image: img };
            }
            return obj;
        });
        this.background = state.background;
        this.selectedObject = null;
        this.render();
    }
    
    toJSON() {
        return {
            objects: this.objects.map(obj => {
                if (obj.type === 'image') {
                    return { ...obj, image: obj.image ? obj.image.src : null };
                }
                return obj;
            }),
            background: this.background
        };
    }
    
    fromJSON(data) {
        this.objects = data.objects.map(obj => {
            if (obj.type === 'image' && obj.image) {
                const img = new Image();
                img.src = obj.image;
                return { ...obj, image: img };
            }
            return obj;
        });
        this.background = data.background || '#ffffff';
        this.selectedObject = null;
        this.render();
        this.saveState();
    }
    
    updatePropertiesPanel() {
        const event = new CustomEvent('selectionChanged', {
            detail: { object: this.selectedObject }
        });
        document.dispatchEvent(event);
    }
}

// Initialize application
let editor;

document.addEventListener('DOMContentLoaded', function() {
    editor = new CanvasEditor('canvas');
    initEventListeners();
    updateLayersList();
});

function initEventListeners() {
    // Tool buttons
    document.getElementById('addText').addEventListener('click', () => {
        editor.addText();
        updateLayersList();
    });
    
    document.getElementById('addImage').addEventListener('click', () => {
        document.getElementById('imageUpload').click();
    });
    
    document.getElementById('addRect').addEventListener('click', () => {
        editor.addRect();
        updateLayersList();
    });
    
    document.getElementById('addCircle').addEventListener('click', () => {
        editor.addCircle();
        updateLayersList();
    });
    
    document.getElementById('addTriangle').addEventListener('click', () => {
        editor.addTriangle();
        updateLayersList();
    });
    
    // Image upload
    document.getElementById('imageUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                editor.addImage(event.target.result);
                updateLayersList();
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    });
    
    // Templates
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            loadTemplate(this.dataset.template);
        });
    });
    
    // Background
    document.getElementById('bgColor').addEventListener('change', function(e) {
        editor.setBackground(e.target.value);
    });
    
    document.getElementById('addGradient').addEventListener('click', () => {
        editor.setBackground({
            type: 'gradient',
            x0: 0, y0: 0,
            x1: editor.canvas.width,
            y1: editor.canvas.height,
            stops: [
                { offset: 0, color: '#667eea' },
                { offset: 0.5, color: '#764ba2' },
                { offset: 1, color: '#f093fb' }
            ]
        });
    });
    
    document.getElementById('addPattern').addEventListener('click', () => {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 20;
        patternCanvas.height = 20;
        const ctx = patternCanvas.getContext('2d');
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 20, 20);
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, 10, 10);
        ctx.fillRect(10, 10, 10, 10);
        
        editor.setBackground({
            type: 'pattern',
            canvas: patternCanvas
        });
    });
    
    // Toolbar
    document.getElementById('undo').addEventListener('click', () => editor.undo());
    document.getElementById('redo').addEventListener('click', () => editor.redo());
    document.getElementById('zoomIn').addEventListener('click', () => editor.setZoom(editor.zoom * 1.1));
    document.getElementById('zoomOut').addEventListener('click', () => editor.setZoom(editor.zoom * 0.9));
    document.getElementById('zoomReset').addEventListener('click', () => editor.setZoom(1));
    document.getElementById('snapToGrid').addEventListener('change', function(e) {
        editor.snapToGrid = e.target.checked;
    });
    document.getElementById('deleteSelected').addEventListener('click', () => {
        editor.deleteSelected();
        updateLayersList();
    });
    
    // Export
    document.getElementById('exportPNG').addEventListener('click', exportPNG);
    document.getElementById('exportPDF').addEventListener('click', exportPDF);
    
    // Project management
    document.getElementById('newProject').addEventListener('click', newProject);
    document.getElementById('saveProject').addEventListener('click', saveProject);
    document.getElementById('loadProject').addEventListener('click', loadProject);
    
    // Properties
    document.addEventListener('selectionChanged', updatePropertiesPanel);
    
    document.getElementById('fontFamily').addEventListener('change', updateTextFont);
    document.getElementById('fontSize').addEventListener('change', updateTextSize);
    document.getElementById('textColor').addEventListener('change', updateTextColor);
    document.getElementById('boldBtn').addEventListener('click', toggleBold);
    document.getElementById('italicBtn').addEventListener('click', toggleItalic);
    document.getElementById('underlineBtn').addEventListener('click', toggleUnderline);
    document.querySelectorAll('.align-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            updateTextAlign(this.dataset.align);
        });
    });
    
    document.getElementById('fillColor').addEventListener('change', updateFillColor);
    document.getElementById('strokeColor').addEventListener('change', updateStrokeColor);
    document.getElementById('strokeWidth').addEventListener('change', updateStrokeWidth);
    document.getElementById('opacity').addEventListener('input', updateOpacity);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                editor.undo();
            } else if (e.key === 'z' && e.shiftKey || e.key === 'y') {
                e.preventDefault();
                editor.redo();
            } else if (e.key === 's') {
                e.preventDefault();
                saveProject();
            }
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                editor.deleteSelected();
                updateLayersList();
            }
        }
    });
}

// Templates
function loadTemplate(templateName) {
    editor.clear();
    
    switch(templateName) {
        case 'event':
            createEventTemplate();
            break;
        case 'sale':
            createSaleTemplate();
            break;
        case 'business':
            createBusinessCardTemplate();
            break;
        case 'blank':
            editor.setBackground('#ffffff');
            break;
    }
    
    updateLayersList();
}

function createEventTemplate() {
    editor.setBackground({
        type: 'gradient',
        x0: 0, y0: 0,
        x1: 0, y1: editor.canvas.height,
        stops: [
            { offset: 0, color: '#667eea' },
            { offset: 1, color: '#764ba2' }
        ]
    });
    
    editor.objects.push({
        type: 'text',
        x: 400,
        y: 120,
        text: 'EVENT NAME',
        fontFamily: 'Impact',
        fontSize: 60,
        fill: '#ffffff',
        textAlign: 'center'
    });
    
    editor.objects.push({
        type: 'text',
        x: 400,
        y: 220,
        text: 'DATE & TIME',
        fontFamily: 'Arial',
        fontSize: 30,
        fill: '#ffffff',
        textAlign: 'center'
    });
    
    editor.objects.push({
        type: 'text',
        x: 400,
        y: 280,
        text: 'LOCATION',
        fontFamily: 'Arial',
        fontSize: 24,
        fill: '#ffffff',
        textAlign: 'center'
    });
    
    editor.objects.push({
        type: 'circle',
        x: 380,
        y: 450,
        radius: 80,
        fill: 'rgba(255, 255, 255, 0.2)',
        stroke: '#ffffff',
        strokeWidth: 3
    });
    
    editor.render();
    editor.saveState();
}

function createSaleTemplate() {
    editor.setBackground('#ffffff');
    
    editor.objects.push({
        type: 'rect',
        x: 50,
        y: 50,
        width: 700,
        height: 500,
        fill: '#f8f9fa',
        stroke: '#e74c3c',
        strokeWidth: 5
    });
    
    editor.objects.push({
        type: 'text',
        x: 400,
        y: 140,
        text: 'BIG SALE!',
        fontFamily: 'Impact',
        fontSize: 80,
        fill: '#e74c3c',
        textAlign: 'center'
    });
    
    editor.objects.push({
        type: 'text',
        x: 400,
        y: 250,
        text: 'UP TO 50% OFF',
        fontFamily: 'Arial',
        fontSize: 40,
        fill: '#333333',
        textAlign: 'center'
    });
    
    editor.objects.push({
        type: 'text',
        x: 400,
        y: 340,
        text: 'Limited Time Offer',
        fontFamily: 'Arial',
        fontSize: 24,
        fill: '#666666',
        textAlign: 'center'
    });
    
    editor.render();
    editor.saveState();
}

function createBusinessCardTemplate() {
    editor.setBackground('#2c3e50');
    
    editor.objects.push({
        type: 'text',
        x: 100,
        y: 170,
        text: 'YOUR NAME',
        fontFamily: 'Georgia',
        fontSize: 36,
        fill: '#ffffff'
    });
    
    editor.objects.push({
        type: 'text',
        x: 100,
        y: 230,
        text: 'Professional Title',
        fontFamily: 'Arial',
        fontSize: 20,
        fill: '#ecf0f1'
    });
    
    editor.objects.push({
        type: 'rect',
        x: 100,
        y: 240,
        width: 200,
        height: 3,
        fill: '#3498db',
        stroke: '#3498db',
        strokeWidth: 0
    });
    
    editor.objects.push({
        type: 'text',
        x: 100,
        y: 300,
        text: 'email@example.com',
        fontFamily: 'Arial',
        fontSize: 16,
        fill: '#bdc3c7'
    });
    
    editor.objects.push({
        type: 'text',
        x: 100,
        y: 330,
        text: '(123) 456-7890',
        fontFamily: 'Arial',
        fontSize: 16,
        fill: '#bdc3c7'
    });
    
    editor.render();
    editor.saveState();
}

// Export functions
function exportPNG() {
    const link = document.createElement('a');
    link.download = 'flyer.png';
    link.href = editor.canvas.toDataURL('image/png');
    link.click();
}

function exportPDF() {
    const imgData = editor.canvas.toDataURL('image/png');
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write('<html><head><title>Flyer PDF</title></head><body>');
    printWindow.document.write('<img src="' + imgData + '" style="width:100%;"/>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// Project management
function newProject() {
    if (confirm('Create a new project? Unsaved changes will be lost.')) {
        editor.clear();
        editor.setBackground('#ffffff');
        editor.history = [];
        editor.historyStep = 0;
        editor.saveState();
        updateLayersList();
    }
}

function saveProject() {
    const project = {
        data: editor.toJSON(),
        timestamp: new Date().toISOString()
    };
    
    const projectData = JSON.stringify(project);
    
    // Save to localStorage
    const projects = JSON.parse(localStorage.getItem('flyerProjects') || '[]');
    projects.push(project);
    localStorage.setItem('flyerProjects', JSON.stringify(projects));
    
    // Download as file
    const blob = new Blob([projectData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `flyer-project-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    
    alert('Project saved successfully!');
}

function loadProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const project = JSON.parse(event.target.result);
                    editor.fromJSON(project.data);
                    updateLayersList();
                    alert('Project loaded successfully!');
                } catch (error) {
                    alert('Error loading project: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    
    input.click();
}

// Properties panel
function updatePropertiesPanel(e) {
    const obj = e ? e.detail.object : editor.selectedObject;
    
    if (!obj) {
        document.getElementById('textProperties').style.display = 'none';
        document.getElementById('shapeProperties').style.display = 'none';
        return;
    }
    
    if (obj.type === 'text') {
        document.getElementById('textProperties').style.display = 'flex';
        document.getElementById('shapeProperties').style.display = 'none';
        
        document.getElementById('fontFamily').value = obj.fontFamily || 'Arial';
        document.getElementById('fontSize').value = obj.fontSize || 24;
        document.getElementById('textColor').value = obj.fill || '#000000';
        
        document.getElementById('boldBtn').classList.toggle('active', obj.fontWeight === 'bold');
        document.getElementById('italicBtn').classList.toggle('active', obj.fontStyle === 'italic');
        document.getElementById('underlineBtn').classList.toggle('active', obj.underline);
    } else {
        document.getElementById('textProperties').style.display = 'none';
        document.getElementById('shapeProperties').style.display = 'flex';
        
        document.getElementById('fillColor').value = obj.fill || '#3498db';
        document.getElementById('strokeColor').value = obj.stroke || '#000000';
        document.getElementById('strokeWidth').value = obj.strokeWidth || 2;
        document.getElementById('opacity').value = obj.opacity !== undefined ? obj.opacity : 1;
        document.getElementById('opacityValue').textContent = Math.round((obj.opacity !== undefined ? obj.opacity : 1) * 100) + '%';
    }
}

// Text property updates
function updateTextFont(e) {
    if (editor.selectedObject && editor.selectedObject.type === 'text') {
        editor.selectedObject.fontFamily = e.target.value;
        editor.render();
        editor.saveState();
    }
}

function updateTextSize(e) {
    if (editor.selectedObject && editor.selectedObject.type === 'text') {
        editor.selectedObject.fontSize = parseInt(e.target.value);
        editor.render();
        editor.saveState();
    }
}

function updateTextColor(e) {
    if (editor.selectedObject && editor.selectedObject.type === 'text') {
        editor.selectedObject.fill = e.target.value;
        editor.render();
        editor.saveState();
    }
}

function toggleBold() {
    if (editor.selectedObject && editor.selectedObject.type === 'text') {
        const isBold = editor.selectedObject.fontWeight === 'bold';
        editor.selectedObject.fontWeight = isBold ? 'normal' : 'bold';
        document.getElementById('boldBtn').classList.toggle('active', !isBold);
        editor.render();
        editor.saveState();
    }
}

function toggleItalic() {
    if (editor.selectedObject && editor.selectedObject.type === 'text') {
        const isItalic = editor.selectedObject.fontStyle === 'italic';
        editor.selectedObject.fontStyle = isItalic ? 'normal' : 'italic';
        document.getElementById('italicBtn').classList.toggle('active', !isItalic);
        editor.render();
        editor.saveState();
    }
}

function toggleUnderline() {
    if (editor.selectedObject && editor.selectedObject.type === 'text') {
        editor.selectedObject.underline = !editor.selectedObject.underline;
        document.getElementById('underlineBtn').classList.toggle('active', editor.selectedObject.underline);
        editor.render();
        editor.saveState();
    }
}

function updateTextAlign(align) {
    if (editor.selectedObject && editor.selectedObject.type === 'text') {
        editor.selectedObject.textAlign = align;
        document.querySelectorAll('.align-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.align === align);
        });
        editor.render();
        editor.saveState();
    }
}

// Shape property updates
function updateFillColor(e) {
    if (editor.selectedObject) {
        editor.selectedObject.fill = e.target.value;
        editor.render();
        editor.saveState();
    }
}

function updateStrokeColor(e) {
    if (editor.selectedObject) {
        editor.selectedObject.stroke = e.target.value;
        editor.render();
        editor.saveState();
    }
}

function updateStrokeWidth(e) {
    if (editor.selectedObject) {
        editor.selectedObject.strokeWidth = parseInt(e.target.value);
        editor.render();
        editor.saveState();
    }
}

function updateOpacity(e) {
    if (editor.selectedObject) {
        const opacity = parseFloat(e.target.value);
        editor.selectedObject.opacity = opacity;
        document.getElementById('opacityValue').textContent = Math.round(opacity * 100) + '%';
        editor.render();
        editor.saveState();
    }
}

// Layers management
function updateLayersList() {
    const layersList = document.getElementById('layersList');
    layersList.innerHTML = '';
    
    if (editor.objects.length === 0) {
        layersList.innerHTML = '<p style="color: #999; font-size: 0.85rem;">No layers yet</p>';
        return;
    }
    
    editor.objects.forEach((obj, index) => {
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        
        const layerName = document.createElement('span');
        layerName.className = 'layer-name';
        layerName.textContent = getObjectName(obj, index);
        
        const layerActions = document.createElement('div');
        layerActions.className = 'layer-actions';
        
        const upBtn = document.createElement('button');
        upBtn.className = 'layer-btn';
        upBtn.textContent = '↑';
        upBtn.title = 'Move up';
        upBtn.onclick = (e) => {
            e.stopPropagation();
            if (index < editor.objects.length - 1) {
                [editor.objects[index], editor.objects[index + 1]] = [editor.objects[index + 1], editor.objects[index]];
                editor.render();
                editor.saveState();
                updateLayersList();
            }
        };
        
        const downBtn = document.createElement('button');
        downBtn.className = 'layer-btn';
        downBtn.textContent = '↓';
        downBtn.title = 'Move down';
        downBtn.onclick = (e) => {
            e.stopPropagation();
            if (index > 0) {
                [editor.objects[index], editor.objects[index - 1]] = [editor.objects[index - 1], editor.objects[index]];
                editor.render();
                editor.saveState();
                updateLayersList();
            }
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'layer-btn';
        deleteBtn.textContent = '🗑';
        deleteBtn.title = 'Delete';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            editor.objects.splice(index, 1);
            if (editor.selectedObject === obj) {
                editor.selectedObject = null;
            }
            editor.render();
            editor.saveState();
            updateLayersList();
        };
        
        layerActions.appendChild(upBtn);
        layerActions.appendChild(downBtn);
        layerActions.appendChild(deleteBtn);
        
        layerItem.appendChild(layerName);
        layerItem.appendChild(layerActions);
        
        layerItem.onclick = () => {
            editor.selectedObject = obj;
            editor.render();
            editor.updatePropertiesPanel();
            updateLayersList();
        };
        
        if (editor.selectedObject === obj) {
            layerItem.classList.add('active');
        }
        
        layersList.appendChild(layerItem);
    });
}

function getObjectName(obj, index) {
    if (obj.type === 'text') {
        return `Text: ${obj.text.substring(0, 20)}${obj.text.length > 20 ? '...' : ''}`;
    } else if (obj.type === 'image') {
        return `Image ${index + 1}`;
    } else if (obj.type === 'rect') {
        return `Rectangle ${index + 1}`;
    } else if (obj.type === 'circle') {
        return `Circle ${index + 1}`;
    } else if (obj.type === 'triangle') {
        return `Triangle ${index + 1}`;
    } else {
        return `Object ${index + 1}`;
    }
}
