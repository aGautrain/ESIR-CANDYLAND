let nbLignes = 20;
let nbColonnes = 20;
let gameGrid;

initGame = () => {
  gameGrid = [];

  for (i = 0; i < nbLignes; i++) {
    for (j = 0; j < nbColonnes; j++) {
      gameGrid[i][j] = 0;
    }
  }
  return gameGrid;
}

addPlayer = (gameGrid, playerId) => {

}