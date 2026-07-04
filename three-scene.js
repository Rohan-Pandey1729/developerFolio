/**
 * Deep Space Observatory — immersive 3D hero scene.
 * Shader nebula, twinkling starfield, ringed planet, asteroid belt,
 * a low-poly rocket flying a lissajous orbit with a particle exhaust trail,
 * and a neural constellation (a nod to the NeuroAI work).
 *
 * Interactions: mouse parallax, scroll fade, click-to-boost.
 * Fallbacks: dispatches `space3d:failed` so script.js can start the 2D starfield.
 */
import * as THREE from 'three';

const container = document.getElementById('space-scene');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function fail() {
    window.__space3d = 'failed';
    window.dispatchEvent(new Event('space3d:failed'));
}

function webglSupported() {
    try {
        const c = document.createElement('canvas');
        return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (_) {
        return false;
    }
}

if (!container || prefersReducedMotion || !webglSupported()) {
    fail();
} else {
    try {
        init();
    } catch (err) {
        console.warn('space3d init failed, falling back to 2D starfield', err);
        if (container) container.innerHTML = '';
        fail();
    }
}

function init() {
    const isLowPower =
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 4) ||
        window.innerWidth < 720;

    const NAVY = new THREE.Color(0x0c1222);
    const AMBER = new THREE.Color(0xf59e0b);
    const AMBER_SOFT = new THREE.Color(0xfbbf24);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(NAVY, 20, 60);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    const CAM_BASE = new THREE.Vector3(0, 0.6, 16);
    camera.position.copy(CAM_BASE);

    const renderer = new THREE.WebGLRenderer({ antialias: !isLowPower, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isLowPower ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0x8899bb, 0.8));
    const key = new THREE.DirectionalLight(0xfff2dd, 1.3);
    key.position.set(6, 9, 7);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x4a6fa5, 0.55);
    fill.position.set(-7, 2, 4);
    scene.add(fill);

    // ---------------------------------------------------------------- Nebula
    const nebulaMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uOctaves: { value: isLowPower ? 3 : 4 }
        },
        vertexShader: /* glsl */`
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            varying vec2 vUv;
            uniform float uTime;
            uniform float uOctaves;

            float hash(vec2 p) {
                return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
            }
            float noise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                vec2 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
            }
            float fbm(vec2 p) {
                float v = 0.0;
                float a = 0.5;
                for (int i = 0; i < 4; i++) {
                    if (float(i) >= uOctaves) break;
                    v += a * noise(p);
                    p = p * 2.03 + vec2(11.3, 7.7);
                    a *= 0.5;
                }
                return v;
            }

            void main() {
                vec2 p = vUv * vec2(4.0, 2.2);
                float t = uTime * 0.015;
                // domain-warped fbm for wispy structure
                vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
                float n = fbm(p + 1.6 * q);

                vec3 deepBlue = vec3(0.05, 0.09, 0.20);
                vec3 dustBlue = vec3(0.10, 0.17, 0.34);
                vec3 ember    = vec3(0.96, 0.62, 0.04);

                vec3 col = mix(deepBlue, dustBlue, smoothstep(0.25, 0.75, n));
                col += ember * pow(max(n - 0.58, 0.0), 2.0) * 2.2;

                // fade toward plane edges so the quad never shows
                float edge = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x)
                           * smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.78, vUv.y);
                float alpha = edge * (0.16 + 0.5 * smoothstep(0.35, 0.85, n));
                gl_FragColor = vec4(col, alpha);
            }
        `
    });
    const nebula = new THREE.Mesh(new THREE.PlaneGeometry(160, 90), nebulaMat);
    nebula.position.set(0, 4, -48);
    scene.add(nebula);

    // ----------------------------------------------------------------- Stars
    const STAR_COUNT = isLowPower ? 1200 : 2400;
    const starGeo = new THREE.BufferGeometry();
    {
        const pos = new Float32Array(STAR_COUNT * 3);
        const size = new Float32Array(STAR_COUNT);
        const phase = new Float32Array(STAR_COUNT);
        const col = new Float32Array(STAR_COUNT * 3);
        const white = new THREE.Color(0xe6ecf7);
        const blue = new THREE.Color(0x9db8e8);
        for (let i = 0; i < STAR_COUNT; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 120;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 70;
            pos[i * 3 + 2] = -5 - Math.random() * 50;
            size[i] = 0.35 + Math.pow(Math.random(), 2.5) * 1.6;
            phase[i] = Math.random() * Math.PI * 2;
            const r = Math.random();
            const c = r < 0.12 ? AMBER_SOFT : (r < 0.45 ? blue : white);
            col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        starGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
        starGeo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
        starGeo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    }
    const starMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */`
            attribute float aSize;
            attribute float aPhase;
            attribute vec3 aColor;
            uniform float uTime;
            varying vec3 vColor;
            varying float vTwinkle;
            void main() {
                vColor = aColor;
                vTwinkle = 0.65 + 0.35 * sin(uTime * (0.6 + aPhase * 0.25) + aPhase * 7.0);
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = aSize * vTwinkle * (140.0 / -mv.z);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */`
            varying vec3 vColor;
            varying float vTwinkle;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                float a = smoothstep(0.5, 0.05, d) * vTwinkle;
                gl_FragColor = vec4(vColor, a);
            }
        `
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ---------------------------------------------------------------- Planet
    const planetGroup = new THREE.Group();
    planetGroup.position.set(10.5, 4.6, -18);
    scene.add(planetGroup);

    const planet = new THREE.Mesh(
        new THREE.SphereGeometry(2.4, 48, 48),
        new THREE.MeshStandardMaterial({ color: 0x2e4368, roughness: 0.85, metalness: 0.1 })
    );
    planetGroup.add(planet);

    // fresnel atmosphere glow
    const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(2.62, 48, 48),
        new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.BackSide,
            vertexShader: /* glsl */`
                varying float vRim;
                void main() {
                    vec3 n = normalize(normalMatrix * normal);
                    vec3 viewDir = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
                    vRim = pow(0.72 + dot(n, viewDir), 3.5);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: /* glsl */`
                varying float vRim;
                void main() {
                    gl_FragColor = vec4(vec3(0.96, 0.62, 0.08) * vRim, vRim * 0.55);
                }
            `
        })
    );
    planetGroup.add(atmosphere);

    // ring — canvas gradient texture
    {
        const rc = document.createElement('canvas');
        rc.width = 256; rc.height = 8;
        const rctx = rc.getContext('2d');
        const grad = rctx.createLinearGradient(0, 0, 256, 0);
        grad.addColorStop(0.0, 'rgba(245,158,11,0)');
        grad.addColorStop(0.25, 'rgba(245,158,11,0.55)');
        grad.addColorStop(0.45, 'rgba(251,191,36,0.15)');
        grad.addColorStop(0.62, 'rgba(245,158,11,0.65)');
        grad.addColorStop(0.8, 'rgba(226,232,240,0.28)');
        grad.addColorStop(1.0, 'rgba(245,158,11,0)');
        rctx.fillStyle = grad;
        rctx.fillRect(0, 0, 256, 8);
        const ringTex = new THREE.CanvasTexture(rc);

        const ringGeo = new THREE.RingGeometry(3.1, 5.0, 96);
        // remap uv.x to radius so gradient runs across ring width
        const uv = ringGeo.attributes.uv;
        const rpos = ringGeo.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < uv.count; i++) {
            v.fromBufferAttribute(rpos, i);
            uv.setXY(i, (v.length() - 3.1) / 1.9, 0.5);
        }
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
            map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false
        }));
        ring.rotation.x = Math.PI / 2.35;
        ring.rotation.y = 0.25;
        planetGroup.add(ring);
    }

    // ------------------------------------------------------------- Asteroids
    const ASTEROID_COUNT = isLowPower ? 30 : 64;
    const asteroidGeo = new THREE.IcosahedronGeometry(0.16, 0);
    const asteroidMat = new THREE.MeshStandardMaterial({ color: 0x53627c, roughness: 0.95, metalness: 0.05, flatShading: true });
    const asteroids = new THREE.InstancedMesh(asteroidGeo, asteroidMat, ASTEROID_COUNT);
    const asteroidData = [];
    for (let i = 0; i < ASTEROID_COUNT; i++) {
        asteroidData.push({
            angle: Math.random() * Math.PI * 2,
            radius: 5.6 + Math.random() * 1.8,
            yJitter: (Math.random() - 0.5) * 0.7,
            speed: 0.03 + Math.random() * 0.05,
            scale: 0.4 + Math.random() * 1.5,
            spinAxis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
            spin: Math.random() * 2
        });
    }
    planetGroup.add(asteroids);

    // ---------------------------------------------------------------- Rocket
    // Palette mirrors the loader SVG: slate body, amber band, dark window.
    const rocket = new THREE.Group();
    {
        const body = new THREE.Mesh(
            new THREE.CylinderGeometry(0.16, 0.19, 0.72, 20),
            new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.4, metalness: 0.35 })
        );
        rocket.add(body);

        const nose = new THREE.Mesh(
            new THREE.ConeGeometry(0.16, 0.34, 20),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.4 })
        );
        nose.position.y = 0.53;
        rocket.add(nose);

        const band = new THREE.Mesh(
            new THREE.CylinderGeometry(0.175, 0.185, 0.12, 20),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45, metalness: 0.3, emissive: 0x7c4a00, emissiveIntensity: 0.4 })
        );
        band.position.y = 0.12;
        rocket.add(band);

        const window_ = new THREE.Mesh(
            new THREE.SphereGeometry(0.07, 16, 16),
            new THREE.MeshStandardMaterial({ color: 0x0c1222, roughness: 0.15, metalness: 0.8 })
        );
        window_.position.set(0, -0.05, 0.16);
        rocket.add(window_);

        const finMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide });
        const finShape = new THREE.Shape();
        finShape.moveTo(0, 0);
        finShape.lineTo(0.16, -0.22);
        finShape.lineTo(0, -0.3);
        finShape.lineTo(0, 0);
        const finGeo = new THREE.ShapeGeometry(finShape);
        for (let i = 0; i < 3; i++) {
            const fin = new THREE.Mesh(finGeo, finMat);
            const a = (i / 3) * Math.PI * 2;
            fin.position.set(Math.cos(a) * 0.17, -0.28, Math.sin(a) * 0.17);
            fin.rotation.y = -a + Math.PI / 2;
            rocket.add(fin);
        }

        const bell = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.14, 0.14, 16),
            new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.5 })
        );
        bell.position.y = -0.42;
        rocket.add(bell);

        // engine glow sprite + light
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = glowCanvas.height = 64;
        const gctx = glowCanvas.getContext('2d');
        const g = gctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(251,191,36,1)');
        g.addColorStop(0.35, 'rgba(245,158,11,0.6)');
        g.addColorStop(1, 'rgba(245,158,11,0)');
        gctx.fillStyle = g;
        gctx.fillRect(0, 0, 64, 64);
        const glowTex = new THREE.CanvasTexture(glowCanvas);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({
            map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
        }));
        glow.scale.setScalar(0.55);
        glow.position.y = -0.52;
        rocket.add(glow);
        rocket.userData.glow = glow;

        const engineLight = new THREE.PointLight(0xf59e0b, 2.2, 7, 2);
        engineLight.position.y = -0.6;
        rocket.add(engineLight);
        rocket.userData.engineLight = engineLight;
    }
    const rocketPivot = new THREE.Group();
    rocketPivot.add(rocket);
    scene.add(rocketPivot);

    // ---------------------------------------------------------- Exhaust trail
    const TRAIL_COUNT = isLowPower ? 90 : 180;
    const trailGeo = new THREE.BufferGeometry();
    const trailPos = new Float32Array(TRAIL_COUNT * 3);
    const trailLife = new Float32Array(TRAIL_COUNT); // 0 = dead, 1 = fresh
    const trailSeed = new Float32Array(TRAIL_COUNT);
    for (let i = 0; i < TRAIL_COUNT; i++) {
        trailLife[i] = 0;
        trailSeed[i] = Math.random();
        trailPos[i * 3 + 1] = -999;
    }
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute('aLife', new THREE.BufferAttribute(trailLife, 1));
    trailGeo.setAttribute('aSeed', new THREE.BufferAttribute(trailSeed, 1));
    const trailMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */`
            attribute float aLife;
            attribute float aSeed;
            varying float vLife;
            varying float vSeed;
            void main() {
                vLife = aLife;
                vSeed = aSeed;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = (0.5 + aSeed * 1.4) * aLife * (110.0 / -mv.z);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */`
            varying float vLife;
            varying float vSeed;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                float a = smoothstep(0.5, 0.0, d) * vLife;
                // fresh = near-white hot, old = deep amber
                vec3 hot = vec3(1.0, 0.86, 0.55);
                vec3 cool = vec3(0.96, 0.5, 0.03);
                gl_FragColor = vec4(mix(cool, hot, vLife * (0.7 + 0.3 * vSeed)), a);
            }
        `
    });
    const trail = new THREE.Points(trailGeo, trailMat);
    trail.frustumCulled = false;
    scene.add(trail);
    let trailCursor = 0;

    // ---------------------------------------------------- Neural constellation
    const neuralGroup = new THREE.Group();
    neuralGroup.position.set(-11, 4.8, -14);
    scene.add(neuralGroup);
    {
        const NODES = 34;
        const nodePos = [];
        for (let i = 0; i < NODES; i++) {
            // loose ellipsoid cluster
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = Math.pow(Math.random(), 0.6);
            nodePos.push(new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta) * 3.4 * r,
                Math.sin(phi) * Math.sin(theta) * 2.1 * r,
                Math.cos(phi) * 1.6 * r
            ));
        }
        const nGeo = new THREE.BufferGeometry().setFromPoints(nodePos);
        const nodes = new THREE.Points(nGeo, new THREE.PointsMaterial({
            color: 0xfbbf24, size: 0.09, transparent: true, opacity: 0.9,
            blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
        }));
        neuralGroup.add(nodes);

        const linePts = [];
        for (let i = 0; i < NODES; i++) {
            for (let j = i + 1; j < NODES; j++) {
                if (nodePos[i].distanceTo(nodePos[j]) < 1.7) {
                    linePts.push(nodePos[i], nodePos[j]);
                }
            }
        }
        const lGeo = new THREE.BufferGeometry().setFromPoints(linePts);
        const lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
            color: 0xf59e0b, transparent: true, opacity: 0.22,
            blending: THREE.AdditiveBlending, depthWrite: false
        }));
        neuralGroup.add(lines);
        neuralGroup.userData.lines = lines;
    }

    // ------------------------------------------------------------ Interaction
    const mouse = { x: 0, y: 0 };
    window.addEventListener('pointermove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });

    let boost = 0;
    const hero = document.getElementById('hero');
    if (hero) {
        hero.addEventListener('click', (e) => {
            if (e.target.closest('a, button, input, textarea')) return;
            boost = 1;
        });
    }

    let scrollFade = 1;
    window.addEventListener('scroll', () => {
        const vh = window.innerHeight || 1;
        scrollFade = Math.max(0, 1 - (window.scrollY / vh) * 1.25);
        container.style.opacity = scrollFade.toFixed(3);
    }, { passive: true });

    // ------------------------------------------------------------------ Loop
    const clock = new THREE.Clock();
    let elapsed = 0;
    let running = true;
    let rafId = 0;

    const dummy = new THREE.Object3D();
    const rocketPos = new THREE.Vector3();
    const rocketNext = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const tailWorld = new THREE.Vector3();
    const tailOffset = new THREE.Vector3(0, -0.55, 0);
    let flightT = 0;

    function rocketPath(t, out) {
        out.set(
            9.5 * Math.sin(t * 0.32),
            2.6 * Math.sin(t * 0.21 + 1.3) - 0.4,
            -5 + 6 * Math.sin(t * 0.45 + 0.4)
        );
        return out;
    }

    function tick() {
        if (!running) return;
        rafId = requestAnimationFrame(tick);

        const dt = Math.min(clock.getDelta(), 0.05);
        elapsed += dt;
        boost *= Math.pow(0.2, dt); // exponential decay, framerate independent

        // shaders
        nebulaMat.uniforms.uTime.value = elapsed;
        starMat.uniforms.uTime.value = elapsed;

        // planet system
        planet.rotation.y += dt * 0.05;
        for (let i = 0; i < ASTEROID_COUNT; i++) {
            const a = asteroidData[i];
            a.angle += dt * a.speed * (1 + boost * 0.6);
            dummy.position.set(
                Math.cos(a.angle) * a.radius,
                a.yJitter + Math.sin(a.angle * 3) * 0.15,
                Math.sin(a.angle) * a.radius * 0.55
            );
            dummy.scale.setScalar(a.scale);
            dummy.quaternion.setFromAxisAngle(a.spinAxis, elapsed * a.spin);
            dummy.updateMatrix();
            asteroids.setMatrixAt(i, dummy.matrix);
        }
        asteroids.instanceMatrix.needsUpdate = true;

        // rocket flight
        flightT += dt * (1 + boost * 2.4);
        rocketPath(flightT, rocketPos);
        rocketPath(flightT + 0.08, rocketNext);
        rocketPivot.position.copy(rocketPos);
        dir.subVectors(rocketNext, rocketPos).normalize();
        quat.setFromUnitVectors(UP, dir);
        rocketPivot.quaternion.slerp(quat, 0.12);
        rocket.rotation.y += dt * (0.6 + boost * 9); // barrel roll on boost

        const flicker = 0.85 + Math.random() * 0.3;
        rocket.userData.glow.scale.setScalar((0.45 + boost * 0.5) * flicker);
        rocket.userData.engineLight.intensity = (2 + boost * 4) * flicker;

        // exhaust trail: spawn at tail, age everything
        tailWorld.copy(tailOffset).applyQuaternion(rocketPivot.quaternion).add(rocketPos);
        const spawnCount = 2 + Math.round(boost * 4);
        for (let s = 0; s < spawnCount; s++) {
            const i = trailCursor;
            trailCursor = (trailCursor + 1) % TRAIL_COUNT;
            trailPos[i * 3] = tailWorld.x + (Math.random() - 0.5) * 0.1;
            trailPos[i * 3 + 1] = tailWorld.y + (Math.random() - 0.5) * 0.1;
            trailPos[i * 3 + 2] = tailWorld.z + (Math.random() - 0.5) * 0.1;
            trailLife[i] = 1;
        }
        const decay = dt * 1.1;
        for (let i = 0; i < TRAIL_COUNT; i++) {
            if (trailLife[i] > 0) trailLife[i] = Math.max(0, trailLife[i] - decay);
        }
        trailGeo.attributes.position.needsUpdate = true;
        trailGeo.attributes.aLife.needsUpdate = true;

        // neural pulse
        neuralGroup.userData.lines.material.opacity = 0.14 + 0.12 * (0.5 + 0.5 * Math.sin(elapsed * 1.7));
        neuralGroup.rotation.y = Math.sin(elapsed * 0.1) * 0.3;

        // camera: mouse parallax + gentle drift + boost fov punch
        camera.position.x += (mouse.x * 1.6 - camera.position.x) * 0.04;
        camera.position.y += (CAM_BASE.y - mouse.y * 1.0 - camera.position.y) * 0.04;
        camera.position.z = CAM_BASE.z + Math.sin(elapsed * 0.08) * 0.5;
        camera.fov += ((55 + boost * 7) - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
        camera.lookAt(0, 0.4, -8);

        renderer.render(scene, camera);
    }

    function resize() {
        const w = container.clientWidth || 1;
        const h = container.clientHeight || 1;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', resize);
    resize();

    // pause offscreen / hidden tab
    function setRunning(on) {
        if (running === on) return;
        running = on;
        if (running) {
            clock.getDelta(); // swallow the pause gap
            rafId = requestAnimationFrame(tick);
        } else if (rafId) {
            cancelAnimationFrame(rafId);
        }
    }
    document.addEventListener('visibilitychange', () => {
        setRunning(!document.hidden && heroVisible);
    });
    let heroVisible = true;
    if (hero) {
        new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                heroVisible = entry.isIntersecting;
                setRunning(heroVisible && !document.hidden);
            });
        }, { threshold: 0.02 }).observe(hero);
    }

    renderer.domElement.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        setRunning(false);
        fail();
        container.style.display = 'none';
    });

    document.documentElement.classList.add('space3d');
    window.__space3d = 'ready';
    window.dispatchEvent(new Event('space3d:ready'));
    rafId = requestAnimationFrame(tick);
}
