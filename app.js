// app.js

// Fabric.js canvas initialization
const canvas = new fabric.Canvas('c');

// Event listeners for tools
document.getElementById('textTool').addEventListener('click', () => {
    const text = new fabric.Textbox('Sample Text', {
        left: 100,
        top: 100,
        fontSize: 20,
        editable: true
    });
    canvas.add(text);
});

// Function to add shapes
document.getElementById('shapeTool').addEventListener('click', () => {
    const rect = new fabric.Rect({
        left: 100,
        top: 100,
        fill: 'red',
        width: 50,
        height: 50
    });
    canvas.add(rect);
});

// Drag-and-drop interface
canvas.on('object:moving', function (e) {
    const obj = e.target;
    obj.setCoords();
});

// Rich text editing and font customization
// (Additional setup needed)

// Image upload and manipulation
document.getElementById('uploadImage').addEventListener('change', (e) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const imgObj = new Image();
        imgObj.src = event.target.result;
        imgObj.onload = () => {
            const img = new fabric.Image(imgObj);
            canvas.add(img);
        };
    };
    reader.readAsDataURL(e.target.files[0]);
});

// Layer management, properties panel updates, undo/redo history, zoom controls, etc.
// (Additional setup needed)

// Background controls with gradient support
// (Additional setup needed)

// Template loading
// (Additional setup needed)

// PDF and PNG export
document.getElementById('exportPDF').addEventListener('click', () => {
    const pdf = new jsPDF();
    const dataUrl = canvas.toDataURL({
        format: 'png'
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0);
    pdf.save('flyer.pdf');
});

// Save and load project functionality using localStorage
document.getElementById('saveProject').addEventListener('click', () => {
    const json = canvas.toJSON();
    localStorage.setItem('flyerProject', JSON.stringify(json));
});

document.getElementById('loadProject').addEventListener('click', () => {
    const json = localStorage.getItem('flyerProject');
    if (json) {
        canvas.loadFromJSON(json, canvas.renderAll.bind(canvas), (o, object) => {
            console.log('Loaded', object);
        });
    }
});

// Additional functionalities can be added
