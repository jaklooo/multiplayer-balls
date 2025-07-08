const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

let myPlayer = null;
let players = {};
let keys = {};

document.addEventListener('keydown', e => {
  keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', e => {
  keys[e.key.toLowerCase()] = false;
});

function update() {
  if (!myPlayer) return;

  const speed = 4;
  if (keys['w']) myPlayer.y -= speed;
  if (keys['a']) myPlayer.x -= speed;
  if (keys['s']) myPlayer.y += speed;
  if (keys['d']) myPlayer.x += speed;

  socket.emit('move', { x: myPlayer.x, y: myPlayer.y });
}

function draw() {
  update();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let id in players) {
    const p = players[id];
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }

  requestAnimationFrame(draw);
}

socket.on('init', (data) => {
  myPlayer = data;
  players[socket.id] = data;
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
