const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let players = {};
let projectiles = {};
let projectileId = 0;

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  players[socket.id] = {
    x: Math.random() * 600 + 100,
    y: Math.random() * 400 + 100,
    color: Object.keys(players).length === 0 ? 'red' : 'blue',
    angle: 0,
    health: 100,
    score: 0
  };

  socket.emit('init', { id: socket.id, players: players });
  socket.broadcast.emit('new-player', { id: socket.id, data: players[socket.id] });

  socket.on('move', data => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].angle = data.angle || 0;
      socket.broadcast.emit('player-moved', { 
        id: socket.id, 
        x: data.x, 
        y: data.y, 
        angle: data.angle || 0 
      });
    }
  });

  socket.on('shoot', data => {
    if (players[socket.id]) {
      const player = players[socket.id];
      const id = projectileId++;
      
      projectiles[id] = {
        id: id,
        x: player.x,
        y: player.y,
        vx: Math.cos(player.angle) * 8,
        vy: Math.sin(player.angle) * 8,
        ownerId: socket.id,
        color: player.color
      };
      
      io.emit('projectile-fired', projectiles[id]);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
    io.emit('player-disconnected', socket.id);
  });
});

// Game loop for projectiles and collisions
setInterval(() => {
  // Update projectiles
  for (let id in projectiles) {
    const proj = projectiles[id];
    proj.x += proj.vx;
    proj.y += proj.vy;
    
    // Remove projectiles that are out of bounds
    if (proj.x < 0 || proj.x > 800 || proj.y < 0 || proj.y > 600) {
      delete projectiles[id];
      io.emit('projectile-destroyed', id);
      continue;
    }
    
    // Check collision with players
    for (let playerId in players) {
      if (playerId === proj.ownerId) continue; // Can't hit yourself
      
      const player = players[playerId];
      const dx = proj.x - player.x;
      const dy = proj.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 25) { // Tank radius + projectile radius
        // Hit!
        player.health -= 25;
        
        if (player.health <= 0) {
          // Player killed
          player.health = 100;
          player.x = Math.random() * 600 + 100;
          player.y = Math.random() * 400 + 100;
          
          if (players[proj.ownerId]) {
            players[proj.ownerId].score += 1;
          }
          
          io.emit('player-killed', { 
            victim: playerId, 
            killer: proj.ownerId,
            newPos: { x: player.x, y: player.y }
          });
        }
        
        io.emit('player-hit', { 
          playerId: playerId, 
          health: player.health,
          projectileId: id
        });
        
        delete projectiles[id];
        io.emit('projectile-destroyed', id);
        break;
      }
    }
  }
  
  // Send projectile updates
  io.emit('projectiles-update', projectiles);
}, 1000 / 60); // 60 FPS

http.listen(process.env.PORT || 3000, () => {
  console.log('Server running...');
});
