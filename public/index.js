var config = {
    type: Phaser.AUTO,
    width: 1000,
    height: 700,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y:0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var game = new Phaser.Game(config);
var scoreText;

// preloads the assets with key-value pairing
function preload ()
{
    this.load.image('starship', './assets/starship.svg');
    this.load.image('star','./assets/star.png');
}

// creates the scene, run only once
function create ()
{

    //initialize socket io
    var self = this;
    this.socket = io();
    this.otherPlayers = this.physics.add.group();
    this.socket.on('currentPlayers', function(players)
    {
        Object.keys(players).forEach(function (id){
            // to add self into the game
            if(players[id].playerId === self.socket.id)
            {
                addPlayer(self, players[id]);
            }
            // to add others into the game
            else
            {
                addOtherPlayers(self, players[id]);
            }
        });
    });

    this.socket.on('newPlayer', function(playerInfo)
    {
        addOtherPlayers(self, playerInfo);
    });

    this.socket.on('disconnect', function (playerId)
    {
        self.otherPlayers.getChildren().forEach(function (otherPlayer)
        {
            if(playerId === otherPlayer.playerId)
            {
                otherPlayer.destroy();
            }
        });
    });

    this.socket.on('playerMoved', function (playerInfo) {
        self.otherPlayers.getChildren().forEach(function (otherPlayer) 
        {
          if (playerInfo.playerId === otherPlayer.playerId) 
          {
            otherPlayer.setRotation(playerInfo.rotation);
            otherPlayer.setPosition(playerInfo.x, playerInfo.y);
          }
        });
    });

    this.socket.on('starLocation', function (starLocation) 
    {
        if (self.star) self.star.destroy();
        self.star = self.physics.add.image(starLocation.x, starLocation.y, 'star');
        self.physics.add.overlap(self.ship, self.star, function () 
        {
          this.socket.emit('starCollected');
        }, null, self);
    });

    scoreText = this.add.text(16, 16, 'Collect the stars!', {fontSize: '18px', fill: '#ffffff'});

    this.socket.on('scoreUpdate', function(scores){
        let text = "";
        Object.keys(scores).forEach(function(scoreId){
            text += "Player" + scores[scoreId]["id"] + ":" + scores[scoreId]["score"] + "\t";
        });
        scoreText.setText(text);
    })

    this.cursors = this.input.keyboard.createCursorKeys();
}

function addPlayer(self, playerInfo)
{
    self.ship= self.physics.add.sprite(playerInfo.x, playerInfo.y, 'starship');
    self.ship.setTint(playerInfo.color);
    self.ship.setDisplaySize(60,40);
    self.ship.setDrag(100);
    self.ship.setAngularDrag(100);
    self.ship.setMaxVelocity(200);
}

function addOtherPlayers(self, playerInfo)
{
    const otherPlayer = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'starship');
    otherPlayer.setTint(playerInfo.color);
    otherPlayer.setDisplaySize(60,40);
    otherPlayer.playerId = playerInfo.playerId;
    self.otherPlayers.add(otherPlayer);
}

// update loop [Main game loop]
function update ()
{
    if (this.ship) 
    {
        if (this.cursors.left.isDown) 
        {
          this.ship.setAngularVelocity(-150);
        } else if (this.cursors.right.isDown) 
        {
          this.ship.setAngularVelocity(150);
        } else 
        {
          this.ship.setAngularVelocity(0);
        }
      
        if (this.cursors.up.isDown) 
        {
          this.physics.velocityFromRotation(this.ship.rotation - 1.5, 200, this.ship.body.acceleration);
        } 
        else if (this.cursors.down.isDown) 
        {
            this.physics.velocityFromRotation(this.ship.rotation + 1.5, 200, this.ship.body.acceleration);
        } 
        else 
        {
            this.ship.setAcceleration(0);
        }
      
        this.physics.world.wrap(this.ship, 5);

        // emit player movement
        var x = this.ship.x;
        var y = this.ship.y;
        var r = this.ship.rotation;
        if (this.ship.oldPosition && (x !== this.ship.oldPosition.x || y !== this.ship.oldPosition.y || r !== this.ship.oldPosition.rotation)) 
        {
            this.socket.emit('playerMovement', { x: this.ship.x, y: this.ship.y, rotation: this.ship.rotation });
        }
        
        // save old position data
        this.ship.oldPosition = 
        {
            x: this.ship.x,
            y: this.ship.y,
            rotation: this.ship.rotation
        };
    }
}