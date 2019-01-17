var express = require("express");
var app = require("express")();
var server = require("http").Server(app);
var io = require("socket.io")(server);
const path = require('path');

let nbLines = 20;
let nbColumns = 20;
let nbCandies = 10;
let launchingCountdown = 5;
let gameGrid = null;
let score = new Map();

// Starting the server
server.listen(3000, function() {
  console.log("Candyland server running");
  gameGrid = initGame(nbCandies);
});


app.use(express.static(path.join(__dirname, "..", "client")));
app.listen(80, () => {
  console.log("Client launched")
});

// When there is a connection request
io.on("connection", function(socket) {
  socket.on("ready", () => {
    // The socket (player) gets a new ID
    socket.id = guidGenerator();
    console.log(socket.id + " connected");

    // The player is added to the game
    [gameGrid, score] = addPlayer(gameGrid, score, socket.id);

    // We emit the changes after adding the player
    if (score.size == 1) {
      io.emit("starting", {
        grid: gameGrid,
        score: Array.from(score)
      });
    } else {
      io.emit("changes", {
        grid: gameGrid,
        score: Array.from(score)
      });
    }
  });

  // When there is a movement request
  socket.on("movement", data => {
    // We update the game
    [gameGrid, score] = move(gameGrid, socket.id, data.direction, score);

    // If someone won
    if (areAllCandiesEaten(gameGrid)) {
      // Tell the client who won
      io.emit("victory", {
        winner: Array.from(score).reduce(
          (acc, val) => (acc = acc[1] < val[1] ? val : acc)
        )[0]
      });

      let i = launchingCountdown;
      let interval = setInterval(() => {
        io.emit("launching", {
          count: i
        });
        if (i == 0) {
          clearInterval(interval);

          // Restart the game
          [gameGrid, score] = restartGame(Array.from(score.keys()));

          io.emit("starting", {
            grid: gameGrid,
            score: Array.from(score)
          });
        }
        i--;
      }, 1000);
    }
  });

  // When there is a disconnection request
  socket.on("disconnect", function() {
    // We update the game
    [gameGrid, score] = deletePlayer(gameGrid, socket.id, score);
    io.emit(socket.id + " disconnected");
    console.log(socket.id + " disconnected");
  });
});

// Restart a new game
restartGame = allPlayerIds => {
  let score = new Map();
  let gameGrid = initGame(nbCandies);
  allPlayerIds.forEach(
    playerId => ([gameGrid, score] = addPlayer(gameGrid, score, playerId))
  );
  return [gameGrid, score];
};

// Initializes a game with a given nb of candy
initGame = candyNb => {
  let grid = [];
  for (i = 0; i < nbLines; i++) {
    grid[i] = [];
    for (j = 0; j < nbColumns; j++) grid[i][j] = 0;
  }

  for (i = 0; i < candyNb; i++)
    grid[Math.floor(Math.random() * nbLines)][
      Math.floor(Math.random() * nbColumns)
    ] =
    "c";

  return grid;
};

// Check if all candies are eaten
areAllCandiesEaten = grid => {
  for (i = 0; i < nbLines; i++) {
    for (j = 0; j < nbColumns; j++) {
      if (grid[i][j] == "c") return false;
    }
  }
  return true;
};

// Adds a player to the game
addPlayer = (grid, score, playerId) => {
  score.set(playerId, 0);
  for (i = 0; i < nbLines; i++) {
    for (j = 0; j < nbColumns; j++) {
      if (grid[i][j] == 0) {
        grid[i][j] = playerId;
        return [grid, score];
      }
    }
  }
};

// Deletes a player from the game
deletePlayer = (grid, playerId, score) => {
  [x, y] = findPlayer(grid, playerId);
  if (x == null || y == null) return [grid, score];
  grid[x][y] = 0;
  score.delete(playerId);
  broadcastChanges(grid, score);
  return [grid, score];
};

// The player eats a candy
eatCandy = (player, score) => {
  score.set(player, score.get(player) + 1);
  return score;
};

// Moves the player on the grid depending on the user input
move = (grid, player, move, score) => {
  deltas = {
    up: [0, -1],
    down: [0, 1],
    right: [1, 0],
    left: [-1, 0]
  };
  [deltaX, deltaY] = deltas[move];
  [x, y] = findPlayer(grid, player);
  newX = x + deltaX;
  newY = y + deltaY;

  if (possibleMove(grid, newX, newY)) {
    if (grid[newX][newY] == "c") score = eatCandy(player, score);

    grid[x][y] = 0;
    grid[newX][newY] = player;

    broadcastChanges(grid, score);
  }

  return [grid, score];
};

// Check if the desired move is possible
possibleMove = (grid, newX, newY) => {
  let endNotReached = newX < nbLines && newY < nbColumns;
  let startNotReached = newX >= 0 && newY >= 0;

  if (!endNotReached || !startNotReached) return 0;

  let onEmptySquare = grid[newX][newY] == 0;
  let onCandySquare = grid[newX][newY] == "c";

  return onEmptySquare || onCandySquare;
};

// Returns position of a player in the grid
findPlayer = (grid, player) => {
  for (i = 0; i < nbLines; i++) {
    for (j = 0; j < nbColumns; j++) {
      if (grid[i][j] == player) return [i, j];
    }
  }
  return [null, null];
};

// Broadcasts changes to all other players
broadcastChanges = (grid, score) => {
  io.emit("changes", {
    grid: grid,
    score: Array.from(score)
  });
};

// Generates a hexadecimal ID
guidGenerator = () => {
  let S4 = () => {
    return (((1 + Math.random()) * 0x1000000) | 0).toString(16).substring(1);
  };
  return S4();
};