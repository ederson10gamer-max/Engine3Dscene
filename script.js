const canvas = document.getElementById('renderCanvas');
const ctx = canvas.getContext('2d');

let activeObject = null;
let modoCamara = 'free';
let fov = 400;
let anguloX = 0, anguloY = 0;
let camX = 0, camY = 0, camZ = 0;
let autoRotation = 0;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ==========================================
// CARREGAMENTO DO JSON EXTERNO (PIPELINE)
// ==========================================
async function loadTargetModel(url) {
    try {
        const response = await fetch(url);
        activeObject = await response.json();
        console.log(`Modelo ${activeObject.name} injetado com sucesso na Engine.`);
    } catch (err) {
        console.error("Erro crítico na pipeline de carregamento do objeto JSON:", err);
    }
}

// Inicializa a Engine carregando o Objeto Modular Externo
loadTargetModel('./venus.json');

// --- Controlos de Interface ---
document.getElementById('cameraMode').addEventListener('change', (e) => {
    modoCamara = e.target.value;
    if (modoCamara === 'fixed') { camX = 0; camY = 0; camZ = 0; anguloX = 0.3; anguloY = 0.5; }
});
document.getElementById('fovInput').addEventListener('input', (e) => fov = parseInt(e.target.value));

// --- Módulo de Inputs (Mouse/Touch/Key) ---
let arrastando = false, ultimoX = 0, ultimoY = 0;
function iniciarArraste(x, y) { if (modoCamara !== 'fixed') { arrastando = true; ultimoX = x; ultimoY = y; } }
function moverArraste(x, y) {
    if (!arrastando) return;
    anguloY += (x - ultimoX) * 0.007;
    anguloX += (y - ultimoY) * 0.007;
    ultimoX = x; ultimoY = y;
}
canvas.addEventListener('mousedown', (e) => iniciarArraste(e.clientX, e.clientY));
window.addEventListener('mousemove', (e) => moverArraste(e.clientX, e.clientY));
window.addEventListener('mouseup', () => arrastando = false);
canvas.addEventListener('touchstart', (e) => { if(e.touches.length === 1) iniciarArraste(e.touches[0].clientX, e.touches[0].clientY); });
canvas.addEventListener('touchmove', (e) => { if(e.touches.length === 1) moverArraste(e.touches[0].clientX, e.touches[0].clientY); });
canvas.addEventListener('touchend', () => arrastando = false);

const teclas = {};
window.addEventListener('keydown', (e) => teclas[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => teclas[e.key.toLowerCase()] = false);

function processarTeclado() {
    if (modoCamara === 'fixed') return;
    const vel = 6;
    if (teclas['w']) camZ += vel;
    if (teclas['s']) camZ -= vel;
    if (teclas['a']) camX += vel;
    if (teclas['d']) camX -= vel;
}

// ==========================================
// CORE GRAPHICS LOOP
// ==========================================
function renderLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    processarTeclado();
    autoRotation += 0.000;

    if (!activeObject) {
        ctx.fillStyle = "#ffffff";
        ctx.fillText("A carregar geometria JSON...", 20, canvas.height - 20);
        requestAnimationFrame(renderLoop);
        return;
    }

    const centroX = canvas.width / 2;
    const centroY = canvas.height / 2;
    const projectedVertices = [];

    activeObject.vertices.forEach(v => {
        let x1 = v.x * Math.cos(autoRotation) - v.z * Math.sin(autoRotation);
        let z1 = v.x * Math.sin(autoRotation) + v.z * Math.cos(autoRotation);
        let x2 = x1 * Math.cos(anguloY) - z1 * Math.sin(anguloY);
        let z2 = x1 * Math.sin(anguloY) + z1 * Math.cos(anguloY);
        let y3 = v.y * Math.cos(anguloX) - z2 * Math.sin(anguloX);
        let z3 = v.y * Math.sin(anguloX) + z2 * Math.cos(anguloX);

        let finalZ = z3 + camZ + 500;
        if (finalZ > 80) {
            const esc = fov / finalZ;
            projectedVertices.push({ x: centroX + (x2 + camX) * esc, y: centroY + y3 * esc, z: finalZ, ok: true });
        } else {
            projectedVertices.push({ ok: false });
        }
    });

    activeObject.faces.forEach(f => {
        const p0 = projectedVertices[f[0]], p1 = projectedVertices[f[1]], p2 = projectedVertices[f[2]], p3 = projectedVertices[f[3]];
        if (p0?.ok && p1?.ok && p2?.ok && p3?.ok) {
            if (((p1.x - p0.x) * (p2.y - p0.y)) - ((p1.y - p0.y) * (p2.x - p0.x)) > 0) {
                const zMedio = (p0.z + p1.z + p2.z + p3.z) / 4;
                const lum = Math.max(0.2, Math.min(1, 480 / zMedio));
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
                ctx.closePath();
                ctx.fillStyle = `rgb(0, ${Math.floor(255 * lum)}, ${Math.floor(204 * lum)})`;
                ctx.fill();
                ctx.strokeStyle = "rgba(16, 16, 20, 0.4)";
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
    });

    requestAnimationFrame(renderLoop);
}

renderLoop();
