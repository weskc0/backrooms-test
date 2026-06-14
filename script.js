const player = document.getElementById('player');
const echo   = document.getElementById('echo');
const frag   = document.getElementById('fragment');
const sanityFill = document.querySelector('#sanity .fill');

let sanity = 100;               // 0‑100
const sanityDecrease = 0.05;   // per second
let sanityTimer = setInterval(() => {
  sanity = Math.max(0, sanity - sanityDecrease);
  updateSanity();
}, 1000);

let posX = 50, posY = 50;        // percent of container

function move(dx, dy) {
  const step = 5;
  let nx = posX + dx * step;
  let ny = posY + dy * step;
  nx = Math.max(0, Math.min(100, nx));
  ny = Math.max(0, Math.min(100, ny));
  posX = nx; posY = ny;
  player.style.left = posX + '%';
  player.style.top  = posY + '%';
  checkCollision();
}

// arrow keys
document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowUp':    move(0, -1); break;
    case 'ArrowDown':  move(0,  1); break;
    case 'ArrowLeft':  move(-1,0); break;
    case 'ArrowRight': move( 1,0); break;
    case 'f':
    case 'F':
      bindEcho();
  }
});

function bindEcho() {
  // simple visual feedback: shrink then return
  echo.style.transition = 'transform 0.3s';
  echo.style.transform = 'scale(0.5)';
  setTimeout(() => {
    echo.style.transition = '';
    echo.style.transform = '';
  }, 300);
}

// random fragment spawn
function spawnFragment() {
  const maxX = 95, maxY = 95;
  const x = Math.random() * maxX + 2;
  const y = Math.random() * maxY + 2;
  frag.style.left = x + '%';
  frag.style.top  = y + '%';
  frag.style.display = 'block';
}
frag.addEventListener('click', () => {
  alert('Fragment collected!');
  frag.style.display = 'none';
});

function updateSanity() {
  const pct = sanity / 100;
  sanityFill.style.width = pct * 100 + '%';
  sanityFill.style.background = pct < 0.3 ? '#f00' : '#0f0';
}

// simple echo AI – random walk
function moveEcho() {
  const step = 2;
  const ex = parseFloat(echo.style.left);
  const ey = parseFloat(echo.style.top);
  const dirX = Math.random() > 0.5 ? 1 : -1;
  const dirY = Math.random() > 0.5 ? 1 : -1;
  const nx = Math.max(0, Math.min(100, ex + dirX * step));
  const ny = Math.max(0, Math.min(100, ey + dirY * step));
  echo.style.left = nx + '%';
  echo.style.top  = ny + '%';
}

// collision check (player ↔ echo)
function checkCollision() {
  const px = posX, py = posY;
  const ex = parseFloat(echo.style.left);
  const ey = parseFloat(echo.style.top);
  if (Math.abs(px - ex) < 30 && Math.abs(py - ey) < 30) {
    // hit echo → lose sanity & echo chases player
    sanity = Math.max(0, sanity - 10);
    updateSanity();
    const dirX = posX > ex ? 1 : -1;
    const dirY = posY > ey ? 1 : -1;
    echo.style.left = (ex + dirX * 5) + '%';
    echo.style.top  = (ey + dirY * 5) + '%';
  }
}

// start the game
spawnFragment();
setInterval(moveEcho, 1000);
