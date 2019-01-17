let tailleCase = 25;
let nbLignes = 20;
let nbColonnes = 20;
var canvas = document.getElementById("game_canvas");
var ctx = canvas.getContext("2d");
let currentlyPlaying = true;

var socket = io.connect("http://dev2.speed.yt:3000"); // Global variable (need for sniffer.js)

drawEmptyGrid = () => {
  ctx.fillStyle = "#e6e6e6";
  ctx.fillRect(0, 0, 500, 500);
  ctx.fillStyle = " #f2f2f2";
  for (i = 0; i < nbLignes; i++) {
    for (j = 0; j < nbColonnes; j++) {
      if ((i + j) % 2 == 0)
        ctx.fillRect(i * tailleCase, j * tailleCase, tailleCase, tailleCase);
    }
  }
};

drawGrid = grid => {
  drawEmptyGrid();
  for (i = 0; i < nbLignes; i++) {
    for (j = 0; j < nbColonnes; j++) {
      switch (grid[i][j]) {
        case "c":
          drawCandy(i, j);
          break;
        case 0:
          break;
        default:
          drawCharacter(i, j, "#" + grid[i][j]);
      }
    }
  }
};

drawCandy = (x, y) => {
  ctx.fillStyle = "orange";
  ctx.fillRect(x * tailleCase, y * tailleCase, tailleCase, tailleCase);
};

drawCharacter = (x, y, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(x * tailleCase, y * tailleCase, tailleCase, tailleCase);
};

updateScore = score => {
  document.getElementById("scores").innerHTML = "";
  for (player of score.keys()) {
    var innerDiv = document.createElement("div");
    innerDiv.id = player;
    innerDiv.innerHTML = player + " " + score.get(player);
    innerDiv.style.color = "#" + player;
    document.getElementById("scores").appendChild(innerDiv);
  }
};

document.getElementById("play_button").addEventListener("click", () => {
  //document.getElementById("play_button").style.visibility = "hidden";
  var elem = document.getElementById("play_button");
  elem.parentNode.removeChild(elem);

  socket.emit("ready", {});

  socket.on("waiting", data => {
    if (currentlyPlaying) currentlyPlaying = false;
    displayMessage("Waiting " + data.count);
  });

  socket.on("launching", data => {
    if (currentlyPlaying) currentlyPlaying = false;
    displayMessage("Launching " + data.count);
  });

  socket.on("starting", data => {
    currentlyPlaying = true;
    deleteMessage();
    drawGrid(data.grid);
    updateScore(new Map(data.score));
  });

  socket.on("changes", data => {
    drawGrid(data.grid);
    updateScore(new Map(data.score));
  });

  socket.on("victory", data => {
    currentlyPlaying = false;
    displayMessage(data.winner + " won", "#" + data.winner);
  });

  displayMessage = (message, color = "black") => {
    document.getElementById("game_canvas_overlay").style.opacity = 0.5;
    document.getElementById("game_canvas_overlay_text").style.color = color;
    document.getElementById("game_canvas_overlay_text").innerHTML = message;
  };

  deleteMessage = () => {
    document.getElementById("game_canvas_overlay").style.opacity = 0;
  };

  document.addEventListener("keydown", event => {
    if (currentlyPlaying) move(event.keyCode);
  });

  move = keyCode => {
    switch (keyCode) {
      case 37: //left
        socket.emit("movement", {
          direction: "left"
        });
        break;
      case 38: // up
        socket.emit("movement", {
          direction: "up"
        });
        break;
      case 39: // right
        socket.emit("movement", {
          direction: "right"
        });
        break;
      case 40: // down
        socket.emit("movement", {
          direction: "down"
        });
        break;
    }
  };
});