const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let myPlayer = null;
let players = {};
let keys = {};
let touchTarget = null;
let isTouching = false;

// Keyboard controls
document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
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

  const speed = 4;
  let moved = false;

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

  // Touch/Mouse movement
  if (isTouching && touchTarget) {
    const dx = touchTarget.x - myPlayer.x;
    const dy = touchTarget.y - myPlayer.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Move towards touch point if it's far enough away
    if (distance > 5) {
      const moveSpeed = Math.min(speed, distance * 0.1);
      myPlayer.x += (dx / distance) * moveSpeed;
      myPlayer.y += (dy / distance) * moveSpeed;
      moved = true;
    }
  }

  // Keep player within canvas bounds
  myPlayer.x = Math.max(20, Math.min(canvas.width - 20, myPlayer.x));
  myPlayer.y = Math.max(20, Math.min(canvas.height - 20, myPlayer.y));

  // Only emit move event if player actually moved
  if (moved) {
    socket.emit('move', { x: myPlayer.x, y: myPlayer.y });
  }
}

function draw() {
  update();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw all players
  for (let id in players) {
    const p = players[id];
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
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

  requestAnimationFrame(draw);
}

socket.on('init', (data) => {
  myPlayer = data.players[data.id];
  players = data.players;
});

socket.on('new-player', ({ id, data }) => {
  players[id] = data;
});

socket.on('player-moved', ({ id, x, y }) => {
  if (players[id]) {
    players[id].x = x;
    players[id].y = y;
  }
});

socket.on('player-disconnected', (id) => {
  delete players[id];
});

draw();
