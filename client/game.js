let tailleCase = 25;
let nbLignes = 20;
let nbColonnes = 20;

drawEmptyGrid = () => {
  ctx.fillStyle = '#e6e6e6';
  ctx.fillRect(0, 0, 500, 500);
  ctx.fillStyle = ' #f2f2f2';
  for (i = 0; i < nbLignes; i++) {
    for (j = 0; j < nbColonnes; j++) {
      if ((i + j) % 2 == 0)
        ctx.fillRect(i * tailleCase, j * tailleCase, tailleCase, tailleCase);
    }
  }
}

drawGrid = (grid) => {
  drawEmptyGrid();
  for (i = 0; i < nbLignes; i++) {
    for (j = 0; j < nbColonnes; j++) {
      switch (grid[i][j]) {
        case 'c':
          drawCandy(i, j);
          break;
        case 0:
          break;
        default:
          drawCharacter(i, j, '#' + grid[i][j])
      }
    }
  }
}

drawCandy = (x, y) => {
  ctx.fillStyle = 'orange';
  ctx.fillRect(x * tailleCase, y * tailleCase, tailleCase, tailleCase);
}

drawCharacter = (x, y, color) => {
  ctx.fillStyle = color;
  ctx.fillRect(x * tailleCase, y * tailleCase, tailleCase, tailleCase);
}

updateScore = (score) => {
  document.getElementById("scores").innerHTML = "";
  for (player of score.keys()) {
    var innerDiv = document.createElement('div');
    innerDiv.id = player;
    innerDiv.innerHTML = player + " " + score.get(player);
    innerDiv.style.color = '#' + player;
    document.getElementById("scores").appendChild(innerDiv);
  }
}

var socket = io.connect('http://localhost:3000');

socket.on("changes", data => {
  // console.log("Received changes :\n");
  drawGrid(data.grid);
  updateScore(new Map(data.score));
})

socket.on("victory", data => {
  document.getElementById("canvas_div").style.color = '#' + data.winner;
  document.getElementById("canvas_div").innerHTML = data.winner + " won";
})

var canvas = document.getElementById("game_canvas");
var ctx = canvas.getContext("2d");

document.addEventListener("keydown", event => {
  switch (event.keyCode) {
    case 37: //left
      socket.emit("movement", {
        direction: "left"
      })
      break;
    case 38: // up
      socket.emit("movement", {
        direction: "up"
      })
      break;
    case 39: // right
      socket.emit("movement", {
        direction: "right"
      })
      break;
    case 40: // down
      socket.emit("movement", {
        direction: "down"
      })
      break;
  }
})