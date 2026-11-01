// 시안의 화면 여덟 개를 375x812 PNG로 찍는다(screens/shots/).
// 앱에 설치된 Playwright를 쓴다. 실행: node shoot-screens.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(path.resolve(root, "../../app/package.json"));
const { chromium } = require("@playwright/test");

const IDS = ["landing", "home", "vote", "suggest", "stations", "summary", "sheet-nudge", "sheet-confirm"];
const out = path.join(root, "screens/shots");
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 3600, height: 1900 } });
await page.goto(`file://${path.join(root, "screens/mockups.html")}`);
await page.evaluate(() => document.fonts.ready);
for (const id of IDS) await page.locator(`#${id}`).screenshot({ path: path.join(out, `${id}.png`) });
await browser.close();
console.log(`시안 캡처: ${IDS.length}장`);
