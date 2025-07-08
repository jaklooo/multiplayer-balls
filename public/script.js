const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let myPlayer = null;
let players = {};
let projectiles = {};
let keys = {};
let touchTarget = null;
let isTouching = false;
let lastShot = 0;
const shotCooldown = 300; // 300ms between shots

// Keyboard controls
document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
  
  // Shoot with spacebar
  if (e.key === ' ') {
    e.preventDefault();
    shoot();
  }
});

document.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

// Touch controls
canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

// Mouse controls (for desktop testing)
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);

function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  touchTarget = {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
  isTouching = true;
}

function handleTouchMove(e) {
  e.preventDefault();
  if (!isTouching) return;
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  touchTarget = {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

function handleTouchEnd(e) {
  e.preventDefault();
  isTouching = false;
  touchTarget = null;
}

function handleMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  touchTarget = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
  isTouching = true;
}

function handleMouseMove(e) {
  if (!isTouching) return;
  const rect = canvas.getBoundingClientRect();
  touchTarget = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function handleMouseUp(e) {
  isTouching = false;
  touchTarget = null;
}

function update() {
  if (!myPlayer) return;

  const speed = 3;
  let moved = false;
  let newAngle = myPlayer.angle;

  // Keyboard movement (WASD)
  if (keys['w']) {
    myPlayer.y -= speed;
    moved = true;
  }
  if (keys['a']) {
    myPlayer.x -= speed;
    moved = true;
  }
  if (keys['s']) {
    myPlayer.y += speed;
    moved = true;
  }
  if (keys['d']) {
    myPlayer.x += speed;
    moved = true;
  }

  // Touch/Mouse movement and aiming
  if (isTouching && touchTarget) {
    const dx = touchTarget.x - myPlayer.x;
    const dy = touchTarget.y - myPlayer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate angle for tank barrel
    newAngle = calculateAngle(myPlayer.x, myPlayer.y, touchTarget.x, touchTarget.y);
    
    // Move towards touch point if it's far enough away
    if (distance > 30) {
      const moveSpeed = Math.min(speed, distance * 0.05);
      myPlayer.x += (dx / distance) * moveSpeed;
      myPlayer.y += (dy / distance) * moveSpeed;
      moved = true;
    }
  }

  // Keep player within canvas bounds
  myPlayer.x = Math.max(25, Math.min(canvas.width - 25, myPlayer.x));
  myPlayer.y = Math.max(25, Math.min(canvas.height - 25, myPlayer.y));

  // Update angle if changed
  if (Math.abs(newAngle - myPlayer.angle) > 0.1) {
    myPlayer.angle = newAngle;
    moved = true;
  }

  // Only emit move event if player actually moved
  if (moved) {
    socket.emit('move', { x: myPlayer.x, y: myPlayer.y, angle: myPlayer.angle });
  }
}

function draw() {
  update();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw all players as tanks
  for (let id in players) {
    const p = players[id];
    drawTank(p.x, p.y, p.color, p.angle || 0, p.health || 100);
  }

  // Draw projectiles
  for (let id in projectiles) {
    const proj = projectiles[id];
    drawProjectile(proj.x, proj.y, proj.color);
  }

  // Draw touch target indicator
  if (isTouching && touchTarget && myPlayer) {
    ctx.beginPath();
    ctx.arc(touchTarget.x, touchTarget.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
    ctx.strokeStyle = myPlayer.color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw scores
  ctx.fillStyle = 'black';
  ctx.font = '16px Arial';
  let yOffset = 20;
  for (let id in players) {
    const p = players[id];
    ctx.fillText(`${p.color}: ${p.score || 0}`, 10, yOffset);
    yOffset += 20;
  }

  requestAnimationFrame(draw);
}

function shoot() {
  if (!myPlayer) return;
  
  const now = Date.now();
  if (now - lastShot < shotCooldown) return;
  
  lastShot = now;
  socket.emit('shoot', {});
}

function calculateAngle(fromX, fromY, toX, toY) {
  return Math.atan2(toY - fromY, toX - fromX);
}

function drawTank(x, y, color, angle, health) {
  ctx.save();
  ctx.translate(x, y);
  
  // Draw tank body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw tank barrel
  ctx.rotate(angle);
  ctx.fillStyle = color === 'red' ? '#8B0000' : '#000080';
  ctx.fillRect(15, -3, 25, 6);
  
  ctx.restore();
  
  // Draw health bar
  ctx.fillStyle = 'red';
  ctx.fillRect(x - 15, y - 35, 30, 4);
  ctx.fillStyle = 'green';
  ctx.fillRect(x - 15, y - 35, (health / 100) * 30, 4);
}

function drawProjectile(x, y, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

socket.on('init', (data) => {
  myPlayer = data.players[data.id];
  players = data.players;
});

socket.on('new-player', ({ id, data }) => {
  players[id] = data;
});

socket.on('player-moved', ({ id, x, y, angle }) => {
  if (players[id]) {
    players[id].x = x;
    players[id].y = y;
    players[id].angle = angle || 0;
  }
});

socket.on('player-disconnected', (id) => {
  delete players[id];
});

// Socket events for game mechanics
socket.on('projectile-fired', (projectile) => {
  projectiles[projectile.id] = projectile;
});

socket.on('projectiles-update', (serverProjectiles) => {
  projectiles = serverProjectiles;
});

socket.on('projectile-destroyed', (projectileId) => {
  delete projectiles[projectileId];
});

socket.on('player-hit', (data) => {
  if (players[data.playerId]) {
    players[data.playerId].health = data.health;
  }
});

socket.on('player-killed', (data) => {
  if (players[data.victim]) {
    players[data.victim].x = data.newPos.x;
    players[data.victim].y = data.newPos.y;
    players[data.victim].health = 100;
  }
  if (players[data.killer]) {
    players[data.killer].score = (players[data.killer].score || 0) + 1;
  }
});

// Create fire button for mobile
function createFireButton() {
  const fireButton = document.createElement('button');
  fireButton.id = 'fire-btn';
  fireButton.textContent = 'FIRE';
  fireButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #ff4444;
    color: white;
    border: none;
    font-weight: bold;
    font-size: 14px;
    z-index: 1000;
    touch-action: manipulation;
    user-select: none;
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  `;
  
  fireButton.addEventListener('touchstart', (e) => {
    e.preventDefault();
    shoot();
  });
  
  fireButton.addEventListener('click', (e) => {
    e.preventDefault();
    shoot();
  });
  
  document.body.appendChild(fireButton);
}

// Check if it's a mobile device
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         window.innerWidth < 768;
}

// Initialize fire button on mobile
if (isMobile()) {
  createFireButton();
}

draw();
