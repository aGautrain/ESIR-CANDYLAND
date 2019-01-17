const { execSync, exec, spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const colors = require("colors");
const args = process.argv;

const PROJECT_PATH = args[1].split("\\tests")[0];
const INDEX_PATH = path.resolve(PROJECT_PATH, "./client/index.html");
const SERVER_PATH = path.resolve(PROJECT_PATH, "./server/server.js");

const serverDebugMessages = [];
const clientDebugMessages = [];

const arrowkeys = {
  UP: String.fromCharCode(38),
  LEFT: String.fromCharCode(37),
  RIGHT: String.fromCharCode(39),
  DOWN: String.fromCharCode(40)
};

console.log("\n\nRUNNING AUTOMATED TEST SUITE\n\n");
console.log(`\t${PROJECT_PATH}\n\t${INDEX_PATH}\n\t${SERVER_PATH}\n\n`);

async function delay(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, time);
  });
}

async function checkElement(selector, name, page, expectingIt) {
  if (expectingIt && (await page.$(selector)) !== null) {
    displayTestResultMessage(
      `Element ${name}(${selector}) found successfully`,
      false
    );
    return 1;
  } else if (!expectingIt && (await page.$(selector)) !== null) {
    displayTestResultMessage(
      `Element ${name}(${selector}) found while not expected`,
      true
    );
    return 0;
  } else if (!expectingIt && (await page.$(selector)) === null) {
    displayTestResultMessage(
      `Element ${name}(${selector}) not found as expected`,
      false
    );
    return 1;
  } else {
    displayTestResultMessage(
      `Element ${name}(${selector}) not found while expected`,
      true
    );
    return 0;
  }
}

function displayTestResultMessage(msg, error) {
  if (error) {
    console.log(`[TEST] ⚠ - ${msg}`.red);
  } else {
    console.log(`[TEST] ✓ - ${msg}`.green);
  }
}

async function assertNumberOfPlayersEquals(
  nbPlayers,
  checkClientSide,
  checkServerSide
) {
  if (checkClientSide && clientDebugMessages.length > 0) {
    if (
      clientDebugMessages[0].eventData &&
      clientDebugMessages[0].eventData.score
    ) {
      // Normal case, checking score board size
      const scoreBoard = clientDebugMessages[0].eventData.score;
      const playersFound = scoreBoard.length;
      const expectedNbPlayers = playersFound === nbPlayers;

      if (expectedNbPlayers) {
        displayTestResultMessage(
          `Client game contains ${nbPlayers} player(s) as expected`,
          false
        );
      } else {
        displayTestResultMessage(
          `Client game contains ${playersFound} in stead of ${nbPlayers} player(s)`,
          true
        );
      }
      return expectedNbPlayers;
    } else if (
      clientDebugMessages[0].eventData &&
      clientDebugMessages[0].eventData === "launching" &&
      clientDebugMessages[0].eventData.count
    ) {
      // Launching the game, can't get score board yet
      await delay(1000);
      return assertNumberOfPlayersEquals(
        nbPlayers,
        stateDescription,
        checkClientSide,
        checkServerSide
      );
    } else {
      displayTestResultMessage(
        "Last debug message is not a launching countdown nor a game indication",
        true
      );
      return false;
    }
  } else {
    displayTestResultMessage(
      "Can't observe debug messages from client. Is sniffer.js well injected ?",
      true
    );
    return false;
  }
}

// Return coords of a candy on the map (or -1/-1 if no candy left)
function getCandyCoords(grid) {
  const candy = {
    x: -1,
    y: -1
  };

  let candyFound = false;

  for (let i = 0; i < grid.length && !candyFound; i++) {
    for (let j = 0; j < grid.length && !candyFound; j++) {
      if (grid[i][j] === "c") {
        candyFound = true;
        candy.x = i;
        candy.y = j;
      }
    }
  }

  console.log(candy);
  return candy;
}

function getPlayerCoords(playerId, grid) {
  const player = {
    x: -1,
    y: -1
  };

  let playerFound = false;

  for (let i = 0; i < grid.length && !playerFound; i++) {
    for (let j = 0; j < grid.length && !playerFound; j++) {
      if (grid[i][j] === playerId) {
        playerFound = true;
        player.x = i;
        player.y = j;
      }
    }
  }

  console.log(player);
  return player;
}

async function assertFetchCandyWorks(page) {
  // First storing score
  if (clientDebugMessages.length > 0) {
    if (
      clientDebugMessages[0].eventData &&
      clientDebugMessages[0].eventData.score &&
      clientDebugMessages[0].eventData.score.length > 0
    ) {
      // WARNING - we consider first score found to be our score
      const playerScore = clientDebugMessages[0].eventData.score[0][1];
      const playerId = clientDebugMessages[0].eventData.score[0][0];

      const gameGrid = clientDebugMessages[0].eventData.grid;

      let randomCandy = getCandyCoords(gameGrid);
      let ourPlayer = getPlayerCoords(playerId, gameGrid);

      if (
        randomCandy.x !== -1 &&
        randomCandy.y !== -1 &&
        ourPlayer.x !== -1 &&
        ourPlayer.y !== -1
      ) {
        while (randomCandy.x > ourPlayer.x) {
          console.log("moving right");
          await page.keyboard.press("ArrowRight");
          await delay(500);
          ourPlayer = getPlayerCoords(playerId, gameGrid);
        }

        while (randomCandy.y > ourPlayer.y) {
          console.log("moving down");
          await page.keyboard.press("ArrowDown");
          ourPlayer = getPlayerCoords(playerId, gameGrid);
        }

        await delay(1000);
        const playerScoreAfterEating =
          clientDebugMessages[0].eventData.score[0][1];

        console.log(
          "before eating : ",
          playerScore,
          " after eating : ",
          playerScoreAfterEating
        );

        return (playerScoreAfterEating = playerScore + 1);
      } else {
        displayTestResultMessage("No candy/player found, can't continue", true);
        return false;
      }
    }
  } else {
    displayTestResultMessage(
      "Can't observe debug messages from client. Is sniffer.js well injected ?",
      true
    );
    return false;
  }
}

async function assertFinishGameWorks() {
  return true;
}

const serverInstance = spawn("node", ["./../server/server.js"]);
serverInstance.stdout.on("data", data => {
  console.log("[SERVER] ", data.toString("utf8").magenta);
});
/*serverInstance.on("error", error => {
  console.log("server[ERR] ", error);
});*/

/*process.on("exit", () => {
  serverInstance.kill();
});*/

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  page.on("console", msg => {
    if (msg.type() === "debug") {
      console.log("[CLIENT] ", JSON.parse(msg.text())["eventType"].cyan);

      // storing message
      clientDebugMessages.unshift(JSON.parse(msg.text()));
    }
  });
  await page.goto(`file:///${INDEX_PATH}`);

  await page.evaluate(fs.readFileSync("./sniffer.js", "utf8"));

  await checkElement("#canvas_div", "canvas", page, true);
  await checkElement("#scores", "scores board", page, true);
  await checkElement("#play_button", "button to start game", page, true);
  await checkElement("#unknownId", "unknown", page, false);

  await delay(1000);
  await page.click("#play_button");
  await delay(1000);
  await page.focus("#canvas_div");

  // await page.keyboard.press("ArrowDown");

  await delay(2000);
  await assertNumberOfPlayersEquals(1, true, false); // checking grid contains 1 player

  // adding 1 player
  const pageAux = await browser.newPage();
  await pageAux.goto(`file:///${INDEX_PATH}`);
  await pageAux.click("#play_button");

  await delay(2000);
  await assertNumberOfPlayersEquals(2, true, false); // checking grid now contains 2 players

  console.log(clientDebugMessages);

  await delay(1000);
  await page.bringToFront();
  await assertFetchCandyWorks(page);

  // Cleaning environment
  await browser.close();
  serverInstance.kill();
})();

// serverInstance.kill();
