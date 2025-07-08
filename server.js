const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let players = {};

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  players[socket.id] = {
    x: Math.random() * 600 + 100,
    y: Math.random() * 400 + 100,
    color: Object.keys(players).length === 0 ? 'red' : 'blue'
  };

  socket.emit('init', players[socket.id]);
  socket.broadcast.emit('new-player', { id: socket.id, data: players[socket.id] });

  socket.on('move', data => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      socket.broadcast.emit('player-moved', { id: socket.id, x: data.x, y: data.y });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    delete players[socket.id];
    io.emit('player-disconnected', socket.id);
  });
});

http.listen(process.env.PORT || 3000, () => {
  console.log('Server running...');
});
