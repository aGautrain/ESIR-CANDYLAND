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
  return setTimeout(() => {
    return 1;
  }, time);
}

async function checkElement(selector, name, page, expectingIt) {
  if (expectingIt && (await page.$(selector)) !== null) {
    console.log(
      `[TEST] ✓ - Element ${name}(${selector}) found successfully`.green
    );
    return 1;
  } else if (!expectingIt && (await page.$(selector)) !== null) {
    console.log(
      `[TEST] ⚠ - Element ${name}(${selector}) found while not expected`.red
    );
    return 0;
  } else if (!expectingIt && (await page.$(selector)) === null) {
    console.log(
      `[TEST] ✓ - Element ${name}(${selector}) not found as expected`.green
    );
    return 1;
  } else {
    console.log(`[TEST] ⚠ - Element ${name}(${selector}) not found`.red);
    return 0;
  }
}

/*async function assertNumberOfPlayersEquals(nbPlayers, stateDescription, checkClientSide, checkServerSide) {
  if (checkClientSide && clientDebugMessages.length > 0) {
    if (clientDebugMessages[0].eventData // && to complete) {

    }
  }
  return 3;
}*/

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

  await page.keyboard.press("ArrowDown");

  //await browser.close();
  //serverInstance.kill();
})();

// serverInstance.kill();
