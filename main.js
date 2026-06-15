// Backrooms Game - Three.js implementation
let scene, camera, renderer, controls;
let clock = new THREE.Clock();

let flashlight;
let footstepBuffer;

// Game state
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let canJump = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let flashlightOn = false;
let health = 100;
let sanity = 100;

// Audio
let listener, audioCtx;
let humSource, humGain;
let footstepTimer = 0;

// Maze generation
const mazeSize = 20; // number of segments
const segmentLength = 10;
const wallHeight = 3;
const wallThickness = 0.2;
const maze = [];

// Entity
let entity;
let entityTarget = new THREE.Vector3();
let entitySpeed = 1.5;
let entitySeePlayer = false;
let entityUpdateTimer = 0;

// Raycaster for entity vision
const raycaster = new THREE.Raycaster();
const playerHeight = 1.6;

// Initialize
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = playerHeight;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Listener for audio
    listener = new THREE.AudioListener();
    camera.add(listener);

    // Controls
    controls = new THREE.PointerLockControls(camera, document.body);

    const blocker = document.getElementById('blocker');
    const instructions = document.getElementById('instructions');

    instructions.addEventListener('click', function () {
        controls.lock();
    });

    controls.addEventListener('lock', function () {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
    });

    controls.addEventListener('unlock', function () {
        blocker.style.display = 'block';
        instructions.style.display = '';
    });

    scene.add(controls.getObject());

    // Lights
    createLights();

    // Maze
    createMaze();

    // Entity
    createEntity();

    // Audio
    initAudio();

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('keydown', onKeyDown, false);
    window.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('pointerlockchange', lockChangeAlert, false);
    document.addEventListener('pointerlockerror', lockChangeAlert, false);

    // Start animation
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function lockChangeAlert() {
    if (controls.isLocked) {
        document.body.style.cursor = 'none';
    } else {
        document.body.style.cursor = '';
    }
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW': moveForward = true; break;
        case 'KeyS': moveBackward = true; break;
        case 'KeyA': moveLeft = true; break;
        case 'KeyD': moveRight = true; break;
        case 'Space': if (canJump) velocity.y += 350; canJump = false; break;
        case 'KeyF': toggleFlashlight(); break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW': moveForward = false; break;
        case 'KeyS': moveBackward = false; break;
        case 'KeyA': moveLeft = false; break;
        case 'KeyD': moveRight = false; break;
    }
}

function toggleFlashlight() {
    flashlightOn = !flashlightOn;
    if (flashlightOn) flashlight.intensity = 2;
    else flashlight.intensity = 0;
}

// Audio initialization
function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Hum: low frequency sine wave
    humSource = audioCtx.createOscillator();
    humGain = audioCtx.createGain();
    humSource.type = 'sine';
    humSource.frequency.value = 60; // low hum
    humGain.gain.value = 0.1;
    humSource.connect(humGain).connect(audioCtx.destination);
    humSource.start();

    // Footstep buffer (simple noise)
    createFootstepBuffer();
}

function createFootstepBuffer() {
    const bufferSize = audioCtx.sampleRate * 0.1; // 0.1 sec
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // white noise
    }
    footstepBuffer = buffer;
}

function playFootstep() {
    if (!footstepBuffer) return;
    const source = audioCtx.createBufferSource();
    source.buffer = footstepBuffer;
    source.connect(audioCtx.destination);
    source.start();
}

// Maze generation
function createMaze() {
    const loader = new THREE.TextureLoader();
    // simple color textures
    const wallColor = 0x8B8B83; // beige
    const floorColor = 0x654321; // brown
    const ceilingColor = 0xFFFFFF; // white

    // Create a simple corridor with random turns
    const path = [];
    let pos = new THREE.Vector3(0, 0, 0);
    let dir = new THREE.Vector3(0, 0, 1); // initially forward

    for (let i = 0; i < mazeSize; i++) {
        // Decide turn: 0 straight, 1 left, 2 right
        const turn = Math.floor(Math.random() * 3);
        if (turn === 1) { // left
            dir = new THREE.Vector3(-dir.z, 0, dir.x);
        } else if (turn === 2) { // right
            dir = new THREE.Vector3(dir.z, 0, -dir.x);
        }
        // segment
        const segmentPos = pos.clone().add(dir.clone().multiplyScalar(segmentLength / 2));
        path.push({ pos: segmentPos.clone(), dir: dir.clone() });
        pos.add(dir.multiplyScalar(segmentLength));
    }

    // Build walls, floor, ceiling for each segment
    path.forEach(segment => {
        const { pos, dir } = segment;
        // Right wall
        const rightWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, segmentLength),
            new THREE.MeshStandardMaterial({ color: wallColor })
        );
        rightWall.position.copy(pos);
        rightWall.position.add(
            new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(segmentLength / 2 + wallThickness / 2)
        );
        rightWall.position.y = wallHeight / 2;
        scene.add(rightWall);
        // Left wall
        const leftWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, segmentLength),
            new THREE.MeshStandardMaterial({ color: wallColor })
        );
        leftWall.position.copy(pos);
        leftWall.position.add(
            new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(segmentLength / 2 + wallThickness / 2)
        );
        leftWall.position.y = wallHeight / 2;
        scene.add(leftWall);
        // Floor
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(segmentLength, wallThickness, segmentLength),
            new THREE.MeshStandardMaterial({ color: floorColor })
        );
        floor.position.copy(pos);
        floor.position.y = -wallThickness / 2;
        scene.add(floor);
        // Ceiling
        const ceiling = new THREE.Mesh(
            new THREE.BoxGeometry(segmentLength, wallThickness, segmentLength),
            new THREE.MeshStandardMaterial({ color: ceilingColor })
        );
        ceiling.position.copy(pos);
        ceiling.position.y = wallHeight + wallThickness / 2;
        scene.add(ceiling);

        // Lights along ceiling
        const lightSpacing = 5;
        for (let l = 0; l <= segmentLength; l += lightSpacing) {
            const lightPos = pos.clone().add(dir.clone().multiplyScalar(l - segmentLength / 2));
            lightPos.y = wallHeight + wallThickness / 2 + 0.5;
            const light = new THREE.PointLight(0xffffcc, 0.5, 10, 2);
            light.position.copy(lightPos);
            scene.add(light);
            // Add flicker effect
            light.userData = { baseIntensity: 0.5, flickerSpeed: 0.5 + Math.random() };
        }
    });

    // Add some random rooms
    for (let r = 0; r < 5; r++) {
        const roomSize = 8 + Math.random() * 4;
        const roomPos = new THREE.Vector3(
            (Math.random() - 0.5) * mazeSize * segmentLength,
            0,
            (Math.random() - 0.5) * mazeSize * segmentLength
        );
        // Four walls
        const wallMat = new THREE.MeshStandardMaterial({ color: wallColor });
        // North wall
        const northWall = new THREE.Mesh(
            new THREE.BoxGeometry(roomSize, wallHeight, wallThickness),
            wallMat
        );
        northWall.position.set(roomPos.x, wallHeight / 2, roomPos.z - roomSize / 2);
        scene.add(northWall);
        // South wall
        const southWall = northWall.clone();
        southWall.position.set(roomPos.x, wallHeight / 2, roomPos.z + roomSize / 2);
        scene.add(southWall);
        // East wall
        const eastWall = new THREE.Mesh(
            new THREE.BoxGeometry(wallThickness, wallHeight, roomSize),
            wallMat
        );
        eastWall.position.set(roomPos.x + roomSize / 2, wallHeight / 2, roomPos.z);
        scene.add(eastWall);
        // West wall
        const westWall = eastWall.clone();
        westWall.position.set(roomPos.x - roomSize / 2, wallHeight / 2, roomPos.z);
        scene.add(westWall);
        // Floor
        const floor = new THREE.Mesh(
            new THREE.BoxGeometry(roomSize, wallThickness, roomSize),
            new THREE.MeshStandardMaterial({ color: floorColor })
        );
        floor.position.set(roomPos.x, -wallThickness / 2, roomPos.z);
        scene.add(floor);
        // Ceiling
        const ceiling = floor.clone();
        ceiling.material = new THREE.MeshStandardMaterial({ color: ceilingColor });
        ceiling.position.set(roomPos.x, wallHeight + wallThickness / 2, roomPos.z);
        scene.add(ceiling);
    }
}

// Lights
function createLights() {
    const ambient = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambient);
    // Flashlight (spotlight)
    flashlight = new THREE.SpotLight(0xffffff, 0, 30, Math.PI / 8, 0.5, 1);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.width = 1024;
    flashlight.shadow.mapSize.height = 1024;
    camera.add(flashlight);
}

// Entity
function createEntity() {
    const geometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x000000 });
    entity = new THREE.Mesh(geometry, material);
    entity.position.set(
        (Math.random() - 0.5) * mazeSize * segmentLength,
        1,
        (Math.random() - 0.5) * mazeSize * segmentLength
    );
    scene.add(entity);
    entityTarget.copy(entity.position);
}

function updateEntity(delta) {
    entityUpdateTimer -= delta;
    if (entityUpdateTimer <= 0) {
        // Periodically pick new target
        if (Math.random() < 0.3) {
            // Wander randomly
            entityTarget.set(
                entity.position.x + (Math.random() - 0.5) * 20,
                1,
                entity.position.z + (Math.random() - 0.5) * 20
            );
        } else {
            // Chase player if sees them
            raycaster.set(entity.position.clone().add(new THREE.Vector3(0, 1, 0)),
                controls.getObject().position.clone().add(new THREE.Vector3(0, playerHeight/2, 0)).sub(entity.position.clone().add(new THREE.Vector3(0,1,0))).normalize());
            const intersects = raycaster.intersectObject(scene, true);
            if (intersects.length > 0 && intersects[0].distance < 15) {
                // line of sight
                entitySeePlayer = true;
                entityTarget.copy(controls.getObject().position);
                entityTarget.y = 1;
            } else {
                entitySeePlayer = false;
            }
        }
        entityUpdateTimer = 2 + Math.random() * 3;
    }

    // Move towards target
    const step = entitySpeed * delta;
    const direction = new THREE.Vector3().subVectors(entityTarget, entity.position).normalize();
    if (direction.length() > 0) {
        entity.position.addScaledVector(direction, step);
        // Rotate to face direction
        entity.lookAt(entityTarget);
    }

    // Check distance to player
    const playerPos = controls.getObject().position;
    const dist = entity.position.distanceTo(playerPos);
    if (dist < 3) {
        // Damage sanity
        sanity -= delta * 10;
        if (sanity < 0) sanity = 0;
        // Play growl
        playGrowl();
    }

    // Flicker effect on nearby lights
    scene.traverse(child => {
        if (child.isPointLight && child.userData) {
            const d = child.position.distanceTo(entity.position);
            if (d < 10) {
                child.intensity = child.userData.baseIntensity * (0.5 + Math.sin(performance.now() * child.userData.flickerSpeed) * 0.5);
            } else {
                child.intensity = child.userData.baseIntensity;
            }
        }
    });
}

// Sound effects
function playGrowl() {
    // Low rumble using noise burst
    const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 sec
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // noise
        // Apply low-pass filter shape
        const t = i / bufferSize;
        data[i] *= Math.sin(t * Math.PI * 4) * (1 - t);
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    source.connect(gain).connect(audioCtx.destination);
    source.start();
}

// Update function
function update(delta) {
    // Movement
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveLeft) - Number(moveRight);
    direction.normalize(); // ensures consistent speed in all directions

    if (moveForward || moveBackward || moveLeft || moveRight) {
        velocity.x -= direction.x * 200 * delta;
        velocity.z -= direction.z * 200 * delta;

        // Footsteps
        footstepTimer -= delta;
        if (footstepTimer <= 0) {
            playFootstep();
            footstepTimer = 0.3 + Math.random() * 0.2;
        }
    } else {
        velocity.x -= velocity.x * 10 * delta; // damping
        velocity.z -= velocity.z * 10 * delta;
    }

    // Gravity
    velocity.y -= 9.81 * 100 * delta; // 100 = mass factor

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    controls.getObject().position.y += velocity.y * delta; // new position

    if (controls.getObject().position.y < playerHeight) {
        velocity.y = 0;
        controls.getObject().position.y = playerHeight;
        canJump = true;
    }

    // Update entity
    updateEntity(delta);

    // Update info display
    const infoDiv = document.getElementById('info');
    infoDiv.innerHTML = `
        Health: ${Math.round(health)}<br>
        Sanity: ${Math.round(sanity)}<br>
        ${entitySeePlayer ? '<span style="color:red">ENTITY SEES YOU</span>' : ''}
    `;

    // Game over
    if (sanity <= 0) {
        infoDiv.innerHTML = '<span style="color:red">YOU HAVE LOST YOUR SANITY</span>';
        controls.enabled = false;
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    update(delta);
    renderer.render(scene, camera);
}

// Start game
init();