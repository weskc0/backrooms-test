/* --------------------------------------------------------------
   Backrooms 3D – Core Game Loop (Levels 0‑10 → Level 100)
   -------------------------------------------------------------- */

let scene, camera, renderer, controls, listener;
let playerControls = {
    forward: false,
    back: false,
    left: false,
    right: false,
    rotateLeft: false,
    rotateRight: false
};
let clock = new THREE.Clock();

/* --------------------------------------------------------------
   1️⃣ INITIALISATION
   -------------------------------------------------------------- */
function init() {
    // ----- Scene -----
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // black for Level 100, overridden per level

    // ----- Camera -----
    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.y = 1.6; // eye height

    // ----- Renderer -----
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('scene').appendChild(renderer.domElement);

    // ----- Audio Listener -----
    listener = new THREE.AudioListener();
    camera.add(listener);

    // ----- Controls (Orbit for debugging / free look) -----
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // smooth motion

    // ----- Lights -----
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // ----- Player (first‑person) -----
    const playerGeometry = new THREE.ConeGeometry(0.07, 0.2, 8);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.rotation.z = -Math.PI / 2; // tip points forward
    player.position.y = 1.6;
    scene.add(player);

    // ----- Keyboard controls -----
    window.addEventListener('keydown', e => {
        switch (e.code) {
            case 'KeyW': playerControls.forward = true; break;
            case 'KeyS': playerControls.back = true; break;
            case 'KeyA': playerControls.left = true; break;
            case 'KeyD': playerControls.right = true; break;
            case 'ArrowLeft': playerControls.rotateLeft = true; break;
            case 'ArrowRight': playerControls.rotateRight = true; break;
        }
    });

    window.addEventListener('keyup', e => {
        switch (e.code) {
            case 'KeyW': playerControls.forward = false; break;
            case 'KeyS': playerControls.back = false; break;
            case 'KeyA': playerControls.left = false; break;
            case 'KeyD': playerControls.right = false; break;
            case 'ArrowLeft': playerControls.rotateLeft = false; break;
            case 'ArrowRight': playerControls.rotateRight = false; break;
        }
    });

    // ----- Resize handling -----
    window.addEventListener('resize', onWindowResize);
}

/* --------------------------------------------------------------
   2️⃣ WINDOW RESIZE
   -------------------------------------------------------------- */
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

/* --------------------------------------------------------------
   3️⃣ MAIN LOOP
   -------------------------------------------------------------- */
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta(); // seconds since last frame

    // ----- Player rotation (damping) -----
    const rotSpeed = 1.5 * delta;
    if (playerControls.rotateLeft) camera.rotateOnWorldAxis(new THREE.Vector3(0, -1, 0), rotSpeed);
    if (playerControls.rotateRight) camera.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), rotSpeed);

    // ----- Translation (WASD) -----
    const moveSpeed = 400 * delta; // units per second
    const direction = new THREE.Vector3();

    if (playerControls.forward || playerControls.back) {
        direction.z -= playerControls.forward ? 1 : 0;
        direction.z += playerControls.back ? 1 : 0;
        direction.applyQuaternion(camera.quaternion);
        player.position.moveOnObjectSpace(direction, moveSpeed);
    }

    if (playerControls.left || playerControls.right) {
        direction.x -= playerControls.left ? 1 : 0;
        direction.x += playerControls.right ? 1 : 0;
        direction.applyQuaternion(camera.quaternion);
        player.position.moveOnObjectSpace(direction, moveSpeed);
    }

    // ----- Keep player inside simple bounds -----
    player.position.x = THREE.MathUtils.clamp(player.position.x, -500, 500);
    player.position.z = THREE.MathUtils.clamp(player.position.z, -500, 500);
    player.position.y = THREE.MathUtils.clamp(player.position.y, 0, 200);

    // ----- Trigger detection (portal) -----
    checkPortalTrigger();

    // ----- Render -----
    renderer.render(scene, camera);
    controls.update();
}

/* --------------------------------------------------------------
   4️⃣ LEVEL MANAGEMENT
   -------------------------------------------------------------- */
function createLevel(levelNumber) {
    const levelGroup = new THREE.Group();

    // ---- Floor (yellow carpet) ----
    const floorGeo = new THREE.PlaneGeometry(1000, 1000);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xffff00, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    levelGroup.add(floor);

    // ---- Portal (cylinder) – glowing exit ----
    const portalGeo = new THREE.CylinderGeometry(5, 5, 20, 16);
    const portalMat = new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        transparent: true,
        opacity: 0.7
    });
    const portal = new THREE.Mesh(portalGeo, portalMat);
    portal.position.y = 10; // raised above floor
    portal.name = 'Portal'; // used for trigger detection
    levelGroup.add(portal);

    // ---- Placeholder entity (e.g., rotating sphere) ----
    const entityGeo = new THREE.SphereGeometry(3, 12, 12);
    const entityMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const entity = new THREE.Mesh(entityGeo, entityMat);
    entity.position.set(0, 3, 0);
    levelGroup.add(entity);

    // ---- Add some simple props (boxes) ----
    addRandomProps(levelGroup, levelNumber);

    return levelGroup;
}

/* --------------------------------------------------------------
   5️⃣ Populate a level with random boxes (furniture, obstacles)
   -------------------------------------------------------------- */
function addRandomProps(group, levelNumber) {
    const boxGeo = new THREE.BoxGeometry(4, 2, 4);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    for (let i = 0; i < 8; i++) {
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.position.set(
            THREE.MathUtils.randFloatSpread(800),
            1,
            THREE.MathUtils.randFloatSpread(800)
        );
        group.add(box);
    }
}

/* --------------------------------------------------------------
   6️⃣ MUSIC & AUDIO (lightweight)
   -------------------------------------------------------------- */
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let currentMusic = null;

// Simple map – replace URLs with real tracks for each level
const levelMusicMap = {
    0: 'https://example.com/level0.mp3',
    1: 'https://example.com/level1.mp3',
    2: 'https://example.com/level2.mp3',
    // ... continue up to 10
    100: 'https://example.com/level100.mp3'
};

function playMusicForLevel(levelNumber) {
    // Stop previous track if any
    if (currentMusic) {
        currentMusic.stop();
        currentMusic = null;
    }

    const url = levelMusicMap[levelNumber];
    if (!url) return;

    const loader = new THREE.AudioLoader(audioContext);
    loader.load(url, buffer => {
        const sound = new THREE.Audio(listener);
        sound.setBuffer(buffer);
        sound.setLoop(true);
        sound.setVolume(0.5);
        sound.play();
        currentMusic = sound;
    });
}

/* --------------------------------------------------------------
   7️⃣ LEVEL PROGRESSION & STATE
   -------------------------------------------------------------- */
let currentLevel = 0;
let levelGroup = null; // holds the active level

function advanceLevel() {
    // Clean up old level geometry
    if (levelGroup) {
        levelGroup.traverse(child => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
        scene.remove(levelGroup);
    }

    // Move to the next level
    currentLevel++;
    levelGroup = createLevel(currentLevel);
    scene.add(levelGroup);

    // Play music for the new level
    playMusicForLevel(currentLevel);

    // Win condition – reached Level 100 (the “Null Void”)
    if (currentLevel >= 100) {
        const winOverlay = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 50),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                opacity: 0.8,
                transparent: true
            })
        );
        winOverlay.position.y = 50;
        scene.add(winOverlay);
    }
}

/* --------------------------------------------------------------
   8️⃣ TRIGGER DETECTION
   -------------------------------------------------------------- */
function checkPortalTrigger() {
    const portal = levelGroup?.children.find(c => c.isMesh && c.name === 'Portal');
    if (!portal) return;

    const distance = player.position.distanceTo(portal.position);
    if (distance < 8) { // 8 units = “touching” the portal
        advanceLevel();
    }
}

/* --------------------------------------------------------------
   9️⃣ START THE GAME – Level 0
   -------------------------------------------------------------- */
playMusicForLevel(0);
levelGroup = createLevel(0);
scene.add(levelGroup);
