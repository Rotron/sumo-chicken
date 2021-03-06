var express     = require('express'),
    http        = require('http'),
    path        = require('path'),
    playerUtils = require('./playerUtils.js'),
    serverUtils = require('./serverUtils.js');

var app = express();
var server = http.Server(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, '../public')));

server.listen(port);

var connectedSockets = []; // keeps track of the socket.io connections

io.on('connection', function(socket) {
  console.log('Connected: ', socket.id);
  connectedSockets.push(socket.id);
  playerUtils.newPlayer(socket.id);

  socket.on('username', function(data) {
    playerUtils.setUsername(socket.id, data.username);
  });

  socket.on('sync', function(data) {
    playerUtils.updatePlayer(socket.id, data);
  });
  
  socket.on('death', function(data) {
    // console.log('Death: ', socket.id, 'Killed by: ', data.killer);
    playerUtils.resetKills(socket.id);
    if (data.killer !== null) playerUtils.incrementKills(data.killer);
    socket.emit('newLocation', playerUtils.getStartLoc());
    playerUtils.newPlayer(socket.id);
  });

  // Pause and unpause players
  socket.on('pause', function() {
    playerUtils.pausePlayer(socket.id,true);
  });
  socket.on('resume', function() {
    playerUtils.pausePlayer(socket.id,false);
  });
  
  socket.on('disconnect', function() {
    console.log('Disconnected: ', socket.id);
    connectedSockets.splice(connectedSockets.indexOf(socket.id), 1);
    playerUtils.dcPlayer(socket.id);
  });
});

// Tell the player to sync with ther server every 50ms (approx 2 frames)
// SENT: a hash with player information at corresponding socketIDs
setInterval(function() {
  connectedSockets.forEach(function(socketID) {
    io.sockets.connected[socketID].emit('sync', playerUtils.getPlayersByLobby(socketID));
  });
}, 50);
