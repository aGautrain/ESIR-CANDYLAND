const { execSync, exec, spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const args = process.argv;

const PROJECT_PATH = args[1].split("\\tests")[0];
const INDEX_PATH = path.resolve(PROJECT_PATH, "./client/index.html");
const SERVER_PATH = path.resolve(PROJECT_PATH, "./server/server.js");

console.log("\n\nRUNNING AUTOMATED TEST SUITE\n\n");
console.log(`\t${PROJECT_PATH}\n\t${INDEX_PATH}\n\t${SERVER_PATH}\n\n`);

async function checkElement(selector, name, page) {
  if ((await page.$(selector)) !== null) {
    console.log(`[OK] Element ${name}(${selector}) found successfully`);
    return 1;
  } else {
    console.log(`[WARN] Element ${name}(${selector}) not found`);
    return 0;
  }
}

const serverInstance = spawn("node", ["./../server/server.js"]);
serverInstance.on("data", data => {
  console.log("server[INFO] ", data);
});
serverInstance.on("error", error => {
  console.log("server[ERR] ", error);
});

/*process.on("exit", () => {
  serverInstance.kill();
});*/

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  page.on("request", request => {
    if (request.resourceType() === "xhr") {
      // Exchange with server
    }
  });

  page.on("response", response => {
    if (response.request().resourceType() === "xhr") {
      // console.log(response);
    }
  });
  page.on("console", msg => {
    if (msg.type() === "debug") {
      console.log(JSON.parse(msg.text())["eventType"]);
    }
  });
  await page.goto(`file:///${INDEX_PATH}`);

  await page.evaluate(fs.readFileSync("./sniffer.js", "utf8"));

  await checkElement("#canvas_div", "canvas", page);
  await checkElement("#scores", "scores board", page);

  // await browser.close();
  // serverInstance.kill();
})();

// serverInstance.kill();
