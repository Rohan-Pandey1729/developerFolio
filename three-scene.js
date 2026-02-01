/**
 * 3D Rubik's-style cube portfolio.
 * Click a face to open that section. Each new section you open moves the cube one step toward solved.
 * Once you've opened all 6 sections, the cube is solved.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const container = document.getElementById('canvas-container');
if (!container) throw new Error('canvas-container not found');

// Face index (0–5) → section id. BoxGeometry: 0=+x right, 1=-x left, 2=+y top, 3=-y bottom, 4=+z front, 5=-z back
const FACE_TO_SECTION = ['experience', 'hackathons', 'publications', 'contact', 'about', 'projects'];

let scene, camera, renderer, cube, controls, raycaster, mouse;
let initialEuler = new THREE.Euler(0.5, 0.65, 0.45);
let targetEuler = new THREE.Euler(0.5, 0.65, 0.45);
const sectionsViewed = new Set();
const LERP = 0.04;
let isSolved = false;

function init() {
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    if (w === 0 || h === 0) {
        requestAnimationFrame(init);
        return;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe8e9ed);
    scene.fog = new THREE.Fog(0xe8e9ed, 8, 22);

    camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 0, 4.5);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(4, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.width = 1024;
    key.shadow.mapSize.height = 1024;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-3, 2, 3);
    scene.add(fill);

    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
        color: 0xd8d9dd,
        metalness: 0.05,
        roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Classic Rubik's colors: right, left, top, bottom, front, back
    const colors = [0xe74c3c, 0xe67e22, 0xffffff, 0xf1c40f, 0x2ecc71, 0x3498db];
    const materials = colors.map(function (color) {
        return new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.05,
            roughness: 0.6
        });
    });

    const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    cube = new THREE.Mesh(geo, materials);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.rotation.copy(initialEuler);
    targetEuler.copy(initialEuler);
    scene.add(cube);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 2.5;
    controls.maxDistance = 10;
    controls.target.set(0, 0, 0);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    renderer.domElement.addEventListener('click', onPointerClick, false);
    window.addEventListener('resize', onResize);

    const loadingMsg = document.getElementById('loading-msg');
    if (loadingMsg) loadingMsg.remove();

    animate();
}

function getSectionFromFace(faceIndex) {
    const idx = Math.min(Math.floor(faceIndex / 2), 5);
    return FACE_TO_SECTION[idx];
}

function advanceSolve() {
    const n = sectionsViewed.size;
    if (n >= 6) {
        isSolved = true;
        targetEuler.set(0, 0, 0);
        const solvedEl = document.getElementById('solved-message');
        if (solvedEl) solvedEl.classList.remove('hidden');
        return;
    }
    const t = n / 6;
    targetEuler.x = initialEuler.x * (1 - t);
    targetEuler.y = initialEuler.y * (1 - t);
    targetEuler.z = initialEuler.z * (1 - t);
}

function onPointerClick(event) {
    if (isSolved) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObject(cube, true);
    if (hits.length > 0) {
        const hit = hits[0];
        let faceIndex = 0;
        if (hit.face != null && typeof hit.face.materialIndex === 'number') {
            faceIndex = hit.face.materialIndex;
        } else if (typeof hit.faceIndex === 'number') {
            faceIndex = Math.floor(hit.faceIndex / 2);
        }
        const section = getSectionFromFace(faceIndex);
        if (section && typeof window.openSection === 'function') {
            window.openSection(section);
            if (!sectionsViewed.has(section)) {
                sectionsViewed.add(section);
                advanceSolve();
            }
        }
    }
}

function onResize() {
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}

function animate() {
    requestAnimationFrame(animate);
    cube.rotation.x += (targetEuler.x - cube.rotation.x) * LERP;
    cube.rotation.y += (targetEuler.y - cube.rotation.y) * LERP;
    cube.rotation.z += (targetEuler.z - cube.rotation.z) * LERP;
    controls.update();
    renderer.render(scene, camera);
}

requestAnimationFrame(init);
