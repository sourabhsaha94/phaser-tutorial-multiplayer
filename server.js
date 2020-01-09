/* game server
Keeps track of:
- position of players
- position of stars
- position of platforms
- score of each player
- whether player is dead or not
*/

var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io').listen(server);
var players = {};
var star = {
    x: Math.floor(Math.random() * 700) + 50,
    y: Math.floor(Math.random() * 500) + 50
};

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    console.log('a user connected');

    players[socket.id] = {
        rotation: 0,
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        playerId: socket.id
    };

    socket.emit('currentPlayers', players);

    // send the star object to the new player
    socket.emit('starLocation', star);

    socket.broadcast.emit('newPlayer', players[socket.id]);

    socket.on('disconnect', function() {
        console.log('user disconnected');
        delete players[socket.id];
        io.emit('disconnect', socket.id);
    });

    // when a player moves, update the player data
    socket.on('playerMovement', function (movementData) {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].rotation = movementData.rotation;
        // emit a message to all players about the player that moved
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });

    socket.on('starCollected', function () {
        star.x = Math.floor(Math.random() * 700) + 50;
        star.y = Math.floor(Math.random() * 500) + 50;
        io.emit('starLocation', star);
    });

});

server.listen(8081, function() {
    console.log(`listening on ${server.address().port}`);
});