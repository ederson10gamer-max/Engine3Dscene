// =============================================//
// Motor 3D por Software (Canvas 2D) - FIX      //
// =============================================//
const canvas = document.getElementById('renderCanvas'); 
const ctx = canvas.getContext('2d'); 

let sceneObjects = []; 
let selectedObject = null;
let idCounter = 0; 

let modoCamara = 'free'; 
let modoCulling = 'normal3d'; 
let fov = 400; 
let anguloX = 0, anguloY = 0; 
let camX = 0, camY = 0, camZ = 0; 

function resize() { 
    canvas.width = window.innerWidth; 
    canvas.height = window.innerHeight; 
} 
window.addEventListener('resize', resize); 
resize(); 

// ========================================== // 
//  PIPELINE DE CARREGAMENTO MULTI-OBJECTO    // 
// ========================================== // 
async function loadAndAppendModel(url, posX = 0, posY = 0, posZ = 0) { 
    const meuId = idCounter++; 
    
    const newInstance = {
        id: meuId,
        geometry: { vertices: [], faces: [] },
        name: `A carregar... #${meuId + 1}`,
        x: posX, y: posY, z: posZ,
        rotY: 0,
        autoRot: 0.005 
    };

    sceneObjects.push(newInstance);
    selectObject(newInstance);

    try { 
        const response = await fetch(url); 
        const modelData = await response.json(); 
        
        if (!modelData.vertices || !modelData.faces) {
            throw new Error("Formato de geometria inválido no JSON.");
        }

        newInstance.geometry = modelData;
        newInstance.name = `${modelData.name || 'Objeto'} #${meuId + 1}`;
        
        if (selectedObject && selectedObject.id === meuId) {
            const nameDiv = document.getElementById('selected-name');
            if (nameDiv) nameDiv.innerText = newInstance.name;
        }
        console.log(`Modelo ${newInstance.name} injetado com sucesso.`); 
    } catch (err) { 
        console.error("Erro crítico na pipeline de carregamento do objeto JSON:", err); 
        sceneObjects = sceneObjects.filter(item => item.id !== meuId);
        if (selectedObject && selectedObject.id === meuId) selectObject(null);
    } 
}

loadAndAppendModel('./sphere.json', -150, 0, 0); 
loadAndAppendModel('./sphere.json', 150, 0, 0); 

function selectObject(obj) {
    selectedObject = obj;
    const nameDiv = document.getElementById('selected-name');
    const deleteBtn = document.getElementById('deleteBtn');
    if (!nameDiv) return;
    if (obj) {
        nameDiv.innerText = obj.name;
        if (deleteBtn) deleteBtn.style.display = "block";
    } else {
        nameDiv.innerText = "Nenhum (Clique num objeto)";
        if (deleteBtn) deleteBtn.style.display = "none";
    }
}

function removeSelectedObject() {
    if (!selectedObject) return;
    sceneObjects = sceneObjects.filter(item => item.id !== selectedObject.id);
    selectObject(null);
}

const deleteBtn = document.getElementById('deleteBtn');
if (deleteBtn) deleteBtn.addEventListener('click', removeSelectedObject);

const cameraMode = document.getElementById('cameraMode');
if (cameraMode) {
    cameraMode.addEventListener('change', (e) => { 
        modoCamara = e.target.value; 
        if (modoCamara === 'fixed') { 
            camX = 0; camY = 0; camZ = 0; 
            anguloX = 0.3; anguloY = 0.5; 
        } 
    }); 
}

const cullingMode = document.getElementById('cullingMode');
if (cullingMode) cullingMode.addEventListener('change', (e) => modoCulling = e.target.value);

const modelSelector = document.getElementById('modelSelector');
if (modelSelector) {
    modelSelector.addEventListener('change', (e) => {
        if (e.target.value) {
            const randX = (Math.random() - 0.5) * 300;
            const randY = (Math.random() - 0.5) * 150;
            loadAndAppendModel(e.target.value, randX, randY, 0);
            e.target.value = ""; 
        }
    });
}

const fovInput = document.getElementById('fovInput');
if (fovInput) fovInput.addEventListener('input', (e) => fov = parseInt(e.target.value) || 400); 

// ========================================== // 
// 2. MÓDULO DE INPUTS                        // 
// ========================================== // 
let arrastando = false, ultimoX = 0, ultimoY = 0; 
let cliqueX = 0, cliqueY = 0;

canvas.addEventListener('mousedown', (e) => {
    cliqueX = e.clientX;
    cliqueY = e.clientY;
    if (modoCamara !== 'fixed') { 
        arrastando = true; 
        ultimoX = e.clientX; ultimoY = e.clientY; 
    } 
});

window.addEventListener('mousemove', (e) => { 
    if (!arrastando) return; 
    anguloY += (e.clientX - ultimoX) * 0.007; 
    anguloX += (e.clientY - ultimoY) * 0.007; 
    ultimoX = e.clientX; ultimoY = e.clientY; 
}); 

window.addEventListener('mouseup', (e) => { 
    arrastando = false;
    if (Math.abs(e.clientX - cliqueX) < 3 && Math.abs(e.clientY - cliqueY) < 3) {
        verificarCliqueObjeto(e.clientX, e.clientY);
    }
}); 

canvas.addEventListener('touchstart', (e) => { 
    if(e.touches.length === 1) {
        cliqueX = e.touches[0].clientX; 
        cliqueY = e.touches[0].clientY;
        if (modoCamara !== 'fixed') { 
            arrastando = true; 
            ultimoX = cliqueX; ultimoY = cliqueY; 
        }
    }
}, { passive: true }); 

canvas.addEventListener('touchmove', (e) => { 
    if(e.touches.length === 1 && arrastando) {
        anguloY += (e.touches[0].clientX - ultimoX) * 0.007; 
        anguloX += (e.touches[0].clientY - ultimoY) * 0.007; 
        ultimoX = e.touches[0].clientX; ultimoY = e.touches[0].clientY; 
    }
}, { passive: true }); 

canvas.addEventListener('touchend', () => { 
    arrastando = false; 
    verificarCliqueObjeto(cliqueX, cliqueY);
}); 

const teclas = {}; 
window.addEventListener('keydown', (e) => {
    teclas[e.key.toLowerCase()] = true;
    if (e.key === "Delete" || e.key === "Backspace") removeSelectedObject();
});
window.addEventListener('keyup', (e) => teclas[e.key.toLowerCase()] = false); 

function processarInputs() { 
    if (modoCamara !== 'fixed') {
        const velCam = 6; 
        if (teclas['w']) camZ += velCam; 
        if (teclas['s']) camZ -= velCam; 
        if (teclas['a']) camX += velCam; 
        if (teclas['d']) camX -= velCam; 
    }
    if (selectedObject) {
        const velObj = 4;
        if (teclas['i']) selectedObject.y -= velObj;
        if (teclas['k']) selectedObject.y += velObj;
        if (teclas['j']) selectedObject.x -= velObj;
        if (teclas['l']) selectedObject.x += velObj;
    }
} 

// Raycasting de clique
let facesDoUltimoFrame = [];

function verificarCliqueObjeto(mx, my) {
    let objetoDetetado = null;
    let menorZ = Infinity;
    facesDoUltimoFrame.forEach(face => {
        if (face.tipo === 'linha_grade') return;   // ignora grid
        if (pontoNaFace(mx, my, face.p0, face.p1, face.p2, face.p3)) {
            if (face.zMedio < menorZ) {
                menorZ = face.zMedio;
                objetoDetetado = face.owner;
            }
        }
    });
    if (objetoDetetado) selectObject(objetoDetetado);
}

function pontoNaFace(x, y, p0, p1, p2, p3) {
    if (!p0 || !p1 || !p2 || !p3) return false;
    const pts = [[p0.x2d, p0.y2d], [p1.x2d, p1.y2d], [p2.x2d, p2.y2d], [p3.x2d, p3.y2d]];
    let dentro = false;
    for (let i = 0, j = 3; i < 4; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        const intersecta = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersecta) dentro = !dentro;
    }
    return dentro;
}

// ========================================== //
// FUNÇÕES DO GRID (AQUI ESTAVA O BUG FATAL)  //
// ========================================== //
function gerarLinhasGradeChao(centroX, centroY, buffer) {
    const tamanho = 400; 
    const passos = 10; 
    const espacamento = tamanho / passos;
    const alturaChao = 100;

    for (let i = 0; i <= passos; i++) {
        const coord = -tamanho / 2 + i * espacamento;
        processarLinhaGrade(coord, alturaChao, -tamanho / 2, coord, alturaChao, tamanho / 2, centroX, centroY, buffer);
        processarLinhaGrade(-tamanho / 2, alturaChao, coord, tamanho / 2, alturaChao, coord, centroX, centroY, buffer);
    }
}

function processarLinhaGrade(x1, y1, z1, x2, y2, z2, centroX, centroY, buffer) {
    let cx1 = x1 * Math.cos(anguloY) - z1 * Math.sin(anguloY); 
    let cz1 = x1 * Math.sin(anguloY) + z1 * Math.cos(anguloY); 
    let cy1 = y1 * Math.cos(anguloX) - cz1 * Math.sin(anguloX); 
    let cz1_f = y1 * Math.sin(anguloX) + cz1 * Math.cos(anguloX); 
    let fX1 = cx1 + camX, fY1 = cy1, fZ1 = cz1_f + camZ + 500;

    let cx2 = x2 * Math.cos(anguloY) - z2 * Math.sin(anguloY); 
    let cz2 = x2 * Math.sin(anguloY) + z2 * Math.cos(anguloY); 
    let cy2 = y2 * Math.cos(anguloX) - cz2 * Math.sin(anguloX); 
    let cz2_f = y2 * Math.sin(anguloX) + cz2 * Math.cos(anguloX); 
    let fX2 = cx2 + camX, fY2 = cy2, fZ2 = cz2_f + camZ + 500;

    if (fZ1 > 40 && fZ2 > 40) {
        const esc1 = fov / fZ1;
        const esc2 = fov / fZ2;
        buffer.push({
            tipo: 'linha_grade',
            zMedio: (fZ1 + fZ2) / 2,
            p0: { x2d: centroX + fX1 * esc1, y2d: centroY + fY1 * esc1 },
            p1: { x2d: centroX + fX2 * esc2, y2d: centroY + fY2 * esc2 }
        });
    }
}

// ========================================== //
// 3. CORE GRAPHICS LOOP                      //
// ========================================== //
function renderLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); 
    processarInputs(); 

    const centroX = canvas.width / 2; 
    const centroY = canvas.height / 2; 
    const globalFacesBuffer = [];

    // Grid SEMPRE desenhada, mesmo sem modelos
    gerarLinhasGradeChao(centroX, centroY, globalFacesBuffer);

    sceneObjects.forEach(obj => {
        if (!obj || !obj.geometry || !obj.geometry.vertices || obj.geometry.vertices.length === 0) return;

        obj.rotY += obj.autoRot; 
        const transformVertices = []; 
        
        obj.geometry.vertices.forEach(v => { 
            // Aceita {x,y,z} OU [x,y,z]
            const vx = v.x ?? v[0];
            const vy = v.y ?? v[1];
            const vz = v.z ?? v[2];
            if (vx === undefined || vy === undefined || vz === undefined) return;

            let lx = vx * Math.cos(obj.rotY) - vz * Math.sin(obj.rotY); 
            let lz = vx * Math.sin(obj.rotY) + vz * Math.cos(obj.rotY); 
            let ly = vy;

            let wx = lx + obj.x;
            let wy = ly + obj.y;
            let wz = lz + obj.z;

            let cx1 = wx * Math.cos(anguloY) - wz * Math.sin(anguloY); 
            let cz1 = wx * Math.sin(anguloY) + wz * Math.cos(anguloY); 
            let cy2 = wy * Math.cos(anguloX) - cz1 * Math.sin(anguloX); 
            let cz2 = wy * Math.sin(anguloX) + cz1 * Math.cos(anguloX); 

            let finalX = cx1 + camX;
            let finalY = cy2;
            let finalZ = cz2 + camZ + 500; 

            if (finalZ > 40) { 
                const esc = fov / finalZ; 
                transformVertices.push({ 
                    x2d: centroX + finalX * esc, 
                    y2d: centroY + finalY * esc, 
                    x3d: finalX, y3d: finalY, z3d: finalZ,
                    ok: true 
                }); 
            } else { 
                transformVertices.push({ ok: false }); 
            } 
        }); 

        if (!obj.geometry.faces) return;
        obj.geometry.faces.forEach(f => { 
            if (!f || f.length < 4) return;
            const p0 = transformVertices[f[0]], 
                  p1 = transformVertices[f[1]], 
                  p2 = transformVertices[f[2]], 
                  p3 = transformVertices[f[3]]; 

            if (p0?.ok && p1?.ok && p2?.ok && p3?.ok) { 
                let renderizarFace = false;

                if (modoCulling === 'normal3d') {
                    const ax = p1.x3d - p0.x3d, ay = p1.y3d - p0.y3d, az = p1.z3d - p0.z3d;
                    const bx = p2.x3d - p0.x3d, by = p2.y3d - p0.y3d, bz = p2.z3d - p0.z3d;
                    const nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
                    const dot = nx * p0.x3d + ny * p0.y3d + nz * p0.z3d;
                    if (dot < 0) renderizarFace = true;
                } else if (modoCulling === 'winding2d') {
                    const cross2d = ((p1.x2d - p0.x2d) * (p2.y2d - p0.y2d)) - ((p1.y2d - p0.y2d) * (p2.x2d - p0.x2d));
                    if (cross2d < 0) renderizarFace = true;
                } else {
                    renderizarFace = true;
                }

                if (renderizarFace) {
                    const zMedio = (p0.z3d + p1.z3d + p2.z3d + p3.z3d) / 4;
                    globalFacesBuffer.push({ p0, p1, p2, p3, zMedio, owner: obj });
                }
            }
        });
    });

    globalFacesBuffer.sort((a, b) => b.zMedio - a.zMedio);
    facesDoUltimoFrame = globalFacesBuffer;

    globalFacesBuffer.forEach((item) => {
        if (item.tipo === 'linha_grade') {
            ctx.beginPath();
            ctx.moveTo(item.p0.x2d, item.p0.y2d);
            ctx.lineTo(item.p1.x2d, item.p1.y2d);
            ctx.strokeStyle = "rgba(0, 255, 204, 0.25)";
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            const lum = Math.max(0.2, Math.min(1, 480 / item.zMedio));
            const isSelected = selectedObject && item.owner && (item.owner.id === selectedObject.id);

            ctx.beginPath();
            ctx.moveTo(item.p0.x2d, item.p0.y2d);
            ctx.lineTo(item.p1.x2d, item.p1.y2d);
            ctx.lineTo(item.p2.x2d, item.p2.y2d);
            ctx.lineTo(item.p3.x2d, item.p3.y2d);
            ctx.closePath();

            if (isSelected) {
                ctx.fillStyle = `rgb(${Math.floor(255 * lum)}, ${Math.floor(215 * lum)}, 0)`;
                ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
                ctx.lineWidth = 1.5;
            } else {
                ctx.fillStyle = `rgb(0, ${Math.floor(255 * lum)}, ${Math.floor(204 * lum)})`;
                ctx.strokeStyle = "rgba(16, 16, 20, 0.4)";
                ctx.lineWidth = 0.5;
            }
            ctx.fill();
            ctx.stroke();
        }
    });

    if (sceneObjects.length === 0) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "14px system-ui";
        ctx.fillText("Nenhum modelo na cena. Injete um novo modelo usando o menu acima.", 30, canvas.height / 2);
    }

    requestAnimationFrame(renderLoop);
}

// KICKOFF — sem esta linha, NADA renderiza
renderLoop();