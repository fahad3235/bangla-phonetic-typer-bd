// Headless-Chrome smoke tests for bangla-phonetic-typer-bd (raw CDP, no deps).
// Run: node tests/smoke.mjs   (exit 0 = all pass)
import { spawn } from "child_process";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const CHROME = "/opt/meta-chromium/chrome";
const PAGE = "file:///home/hatch/workspace/muse-project-factory/builds/bangla-phonetic-typer-bd/index.html";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launchChrome() {
  const profile = mkdtempSync(join(tmpdir(), "bpt-"));
  const proc = spawn(CHROME, [
    "--headless=new", "--no-sandbox", "--disable-gpu",
    "--remote-debugging-port=0", "--user-data-dir=" + profile, "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  const url = await new Promise((resolve, reject) => {
    let buf = "";
    const to = setTimeout(() => reject(new Error("no devtools url")), 20000);
    proc.stderr.on("data", (d) => {
      buf += d.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) { clearTimeout(to); resolve(m[1]); }
    });
    proc.on("error", reject);
  });
  return { proc, wsUrl: url };
}

function cdp(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = [];
  const ready = new Promise((res, rej) => {
    ws.onopen = res; ws.onerror = rej;
  });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    else events.push(m);
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const cur = ++id;
    pending.set(cur, resolve);
    ws.send(JSON.stringify({ id: cur, method, params }));
  });
  const evaluate = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true });
    if (r.result && r.result.result) return r.result.result.value;
    throw new Error("eval failed: " + expr + " -> " + JSON.stringify(r).slice(0, 200));
  };
  return { ready, send, evaluate, events, close: () => ws.close() };
}

const results = [];
function check(name, cond, extra = "") {
  results.push([cond ? "PASS" : "FAIL", name, extra]);
  if (!cond) console.log("FAIL:", name, extra);
}

const T = async () => {
  const { proc, wsUrl } = await launchChrome();
  const base = wsUrl.replace(/\/devtools\/browser\/.*/, "").replace(/^ws:/, "http:");
  // new page target
  const tj = await (await fetch(base + "/json/new?" + encodeURIComponent(PAGE), { method: "PUT" })).json();
  const c = cdp(tj.webSocketDebuggerUrl);
  await c.ready;
  const errors = [];
  const httpReqs = [];
  const origOnmsg = c.evaluate; // keep ref (unused)
  // hook events: wrap by polling c.events after actions instead
  await c.send("Runtime.enable");
  await c.send("Page.enable");
  await c.send("Log.enable");
  await c.send("Network.enable");
  await c.send("Page.navigate", { url: PAGE });
  await sleep(2500);

  const drainEvents = () => {
    const evs = c.events.splice(0);
    for (const e of evs) {
      if (e.method === "Runtime.consoleAPICalled" && e.params.type === "error") errors.push("console.error");
      if (e.method === "Runtime.exceptionThrown") errors.push("exception: " + JSON.stringify(e.params.exceptionDetails).slice(0, 160));
      if (e.method === "Log.entryAdded" && ["error"].includes(e.params.entry.level)) errors.push("log.error: " + e.params.entry.text.slice(0, 120));
      if (e.method === "Network.requestWillBeSent" && /^https?:/.test(e.params.request.url)) httpReqs.push(e.params.request.url);
    }
  };
  drainEvents();

  // 1. title + hook present
  const title = await c.evaluate("document.title");
  check("page title", title.includes("Bangla Phonetic Typer"), title);
  check("test hook present", await c.evaluate("!!window.__typer"));

  // 2. live typing via the real input event path
  await c.evaluate(`__typer.setInput("kemon AchO?")`);
  const out1 = await c.evaluate(`__typer.getOutput()`);
  check("live transliteration", out1 === "কেমন আছো?", JSON.stringify(out1));
  drainEvents();

  // 3. example chip loads input
  await c.evaluate(`document.querySelector(".chip").click()`);
  const chipVal = await c.evaluate(`document.getElementById("romanInput").value`);
  check("example chip fills input", chipVal === "kemon AchO?", chipVal);
  const chipOut = await c.evaluate(`__typer.getOutput()`);
  check("chip output correct", chipOut === "কেমন আছো?", JSON.stringify(chipOut));

  // 4. clear button
  await c.evaluate(`document.getElementById("clearBtn").click()`);
  check("clear empties input", (await c.evaluate(`document.getElementById("romanInput").value`)) === "");
  drainEvents();

  // 5. copy button does not throw (clipboard may be denied headless; app must not crash)
  await c.evaluate(`__typer.setInput("Dhaka")`);
  await c.evaluate(`document.getElementById("copyBtn").click()`);
  await sleep(300);
  drainEvents();
  check("copy click no page error", !errors.some((e) => e.includes("copyBtn")));

  // 6. BN toggle flips lang + persists across reload
  await c.evaluate(`document.getElementById("langBtn").click()`);
  const langNow = await c.evaluate(`document.documentElement.lang`);
  const h1bn = await c.evaluate(`document.querySelector("h1").textContent`);
  check("BN toggle flips lang", langNow === "bn", langNow);
  check("BN heading renders", h1bn.includes("বাংলা"), h1bn.slice(0, 20));
  await c.send("Page.reload");
  await sleep(2000);
  const langAfter = await c.evaluate(`document.documentElement.lang`);
  check("BN persists after reload", langAfter === "bn", langAfter);
  // back to EN for remaining checks
  await c.evaluate(`document.getElementById("langBtn").click()`);
  drainEvents();

  // 7. chart tables rendered from engine tables
  const vRows = await c.evaluate(`document.querySelectorAll("#vowelTable tr").length`);
  const cRows = await c.evaluate(`document.querySelectorAll("#consTable tr").length`);
  check("vowel chart rows", vRows === 7, String(vRows));
  check("consonant chart rows", cRows === 8, String(cRows));
  const tips = await c.evaluate(`document.querySelectorAll("#tipsList li").length`);
  check("tips list", tips === 7, String(tips));

  // 8. counters
  await c.evaluate(`__typer.setInput("Ami bhalO")`);
  const cnt = await c.evaluate(`document.getElementById("outCount").textContent`);
  check("output counter", cnt.includes("chars"), cnt);

  // 9. mobile 390px: no horizontal overflow
  await c.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(800);
  const sw = await c.evaluate(`document.documentElement.scrollWidth`);
  check("390px no overflow", sw <= 390, "scrollWidth=" + sw);

  drainEvents();
  check("zero console/page errors", errors.length === 0, errors.join(" | ").slice(0, 300));
  check("zero http(s) requests", httpReqs.length === 0, httpReqs.join(",").slice(0, 200));

  c.close();
  proc.kill();
  await sleep(500);

  const fails = results.filter((r) => r[0] === "FAIL").length;
  console.log(`\n${results.length - fails}/${results.length} smoke checks passed`);
  process.exit(fails ? 1 : 0);
};

T().catch((e) => { console.error("SMOKE HARNESS ERROR:", e.message); process.exit(2); });
