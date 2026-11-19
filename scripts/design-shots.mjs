// Design check: screenshots the approved mockups and the running app (Vite on :1420)
// at the same window size, and reports which font file renders a node.
//
// The app runs in plain Chromium with the Tauri IPC mocked: `plugin:sql|*` goes to a
// real SQLite file (node:sqlite) in .design-shots/, everything else returns null.
//
//   node scripts/design-shots.mjs mockup today            -> .design-shots/mockup-today.png
//   node scripts/design-shots.mjs app / today             -> .design-shots/app-today.png
//   node scripts/design-shots.mjs seed                    -> fills .design-shots/mindwell.db
//   node scripts/design-shots.mjs fonts <path|mockup:name> <selector>...
//
// Env: SHOT_W / SHOT_H (default 1440 × 900), SHOT_AT (page clock, default today 08:30).
import { chromium } from 'playwright';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.design-shots');
mkdirSync(out, { recursive: true });
const W = Number(process.env.SHOT_W ?? 1440);
const H = Number(process.env.SHOT_H ?? 900);
const APP = 'http://localhost:1420';
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const AT = new Date(process.env.SHOT_AT ?? `${todayIso}T08:30:00`);

const mockupUrl = (name) => pathToFileURL(join(root, 'docs/design/mockups', `${name}.html`)).href;

const TAURI_MOCK = `
  window.__TAURI_INTERNALS__ = {
    metadata: { currentWindow: { label: 'main' }, currentWebview: { windowLabel: 'main', label: 'main' } },
    transformCallback(cb) { const id = Math.floor(Math.random() * 1e9); window['_' + id] = cb; return id; },
    unregisterCallback() {},
    convertFileSrc: (p) => p,
    async invoke(cmd, args) {
      if (cmd.startsWith('plugin:sql|')) return window.__mwSql(cmd, JSON.stringify(args ?? {}));
      return null;
    },
  };
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} };
`;

function sqlHandler(db) {
  return (cmd, json) => {
    const a = JSON.parse(json);
    const values = a.values ?? [];
    switch (cmd) {
      case 'plugin:sql|load':
        return a.db;
      case 'plugin:sql|close':
        return true;
      case 'plugin:sql|execute': {
        if (values.length === 0) db.exec(a.query);
        else db.prepare(a.query).run(...values);
        const r = db.prepare('SELECT changes() AS c, last_insert_rowid() AS r').get();
        return [Number(r.c), Number(r.r)];
      }
      case 'plugin:sql|select':
        return db.prepare(a.query).all(...values).map((row) => ({ ...row }));
      default:
        throw new Error(`unmocked ${cmd}`);
    }
  };
}

async function openApp(browser, { fresh = false } = {}) {
  const file = join(out, 'mindwell.db');
  if (fresh) for (const f of [file, `${file}-wal`, `${file}-shm`]) rmSync(f, { force: true });
  const db = new DatabaseSync(file);
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.clock.setFixedTime(AT);
  await page.exposeFunction('__mwSql', sqlHandler(db));
  await page.addInitScript(TAURI_MOCK);
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  return { page, db };
}

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

/** Seeds the "morning check-in" state the Today mockup shows, through the app's own code. */
async function seed(browser) {
  const { page } = await openApp(browser, { fresh: true });
  await page.goto(`${APP}/`);
  await settle(page);
  await page.evaluate(async (rootDir) => {
    const fs = (p) => `/@fs${rootDir}/${p}`;
    const { getStore } = await import('/src/lib/db.ts');
    const { activation } = await import('/src/lib/activation.svelte.ts');
    const core = await import(fs('packages/core/src/index.ts'));
    const ch01 = await import(fs('packages/modules/ch01-notice-name/repo.ts'));
    const intro = await import(fs('packages/modules/intro-experiments/repo.ts'));
    const store = await getStore();
    const today = core.localDay(new Date());
    const ago = (n) => core.addDays(today, -n);
    await activation.markRead(0);
    await activation.markRead(1);
    await store.insert(core.CORE_TABLES.days, {
      day: ago(1), types: '["heavy_study"]', energy: 3, intent_prompt_id: null,
      intent_text: 'Finish the chemistry worksheet before dinner.', intent_result: 'kept',
      rating: 3, checkin_at: new Date().toISOString(), closed_at: new Date().toISOString(),
    });
    const stories = [["I'll fail", 4], ['Not good enough', 2], ["Everyone's ahead of me", 1]];
    let d = 1;
    for (const [name, n] of stories) {
      const s = await ch01.createStory(store, name, ago(6));
      for (let i = 0; i < n; i++) {
        const at = new Date(`${ago(d++ % 6 + 1)}T15:00:00`);
        const c = await ch01.addCapture(store, { text: `${name} (${i + 1})`, intensity: 3, at });
        await ch01.linkCapture(store, c.id, s.id);
      }
    }
    await intro.startExperiment(store, {
      module: 'ch01', technique: 'notice_name', label: 'Notice and name daily',
      hypothesis: 'Naming the story will make it quieter.', days: 21, day: ago(5),
    });
  }, root);
  // The morning check-in itself goes through the page, as a person would.
  await page.goto(`${APP}/`);
  await settle(page);
  for (const label of [/^Exam/, /^Stressful/]) await page.getByRole('button', { name: label }).click();
  await page.getByRole('radio', { name: '4' }).click();
  await page.getByRole('button', { name: /^Continue/ }).click();
  await page.waitForTimeout(500);
  const intent = page.getByLabel(/intent/i).first();
  await intent.fill('Walk into the physics test calm, and treat the nerves as fuel.');
  await intent.blur();
  await page.waitForTimeout(300);
  console.log('seeded', join(out, 'mindwell.db'));
}

async function shoot(browser, url, name, isApp) {
  const { page } = isApp ? await openApp(browser) : { page: await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 }) };
  await page.goto(url);
  await settle(page);
  const file = join(out, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

async function fonts(browser, target, selectors) {
  const isMockup = target.startsWith('mockup:');
  const { page } = isMockup ? { page: await browser.newPage({ viewport: { width: W, height: H } }) } : await openApp(browser);
  await page.goto(isMockup ? mockupUrl(target.slice(7)) : `${APP}${target}`);
  await settle(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root: doc } = await cdp.send('DOM.getDocument', { depth: -1 });
  for (const sel of selectors) {
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: doc.nodeId, selector: sel });
    if (!nodeId) {
      console.log(`${sel}: not found`);
      continue;
    }
    // Platform fonts are reported for text nodes' parent element.
    const { fonts: used } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    const family = await page.$eval(sel, (el) => getComputedStyle(el).fontFamily);
    const desc = used.map((f) => `${f.familyName}${f.postScriptName ? ` [${f.postScriptName}]` : ''}${f.isCustomFont ? ' (bundled @font-face)' : ' (SYSTEM)'} ×${f.glyphCount}`);
    console.log(`${sel}\n  css: ${family}\n  rendered: ${desc.join(', ') || '(no text)'}`);
  }
}

const [mode, ...rest] = process.argv.slice(2);
const browser = await chromium.launch();
try {
  if (mode === 'seed') await seed(browser);
  else if (mode === 'mockup') await shoot(browser, mockupUrl(rest[0]), `mockup-${rest[0]}`, false);
  else if (mode === 'app') await shoot(browser, `${APP}${rest[0] ?? '/'}`, `app-${rest[1] ?? 'page'}`, true);
  else if (mode === 'fonts') await fonts(browser, rest[0], rest.slice(1));
  else console.log('usage: design-shots.mjs seed | mockup <name> | app <path> <name> | fonts <path|mockup:name> <selector>...');
} finally {
  await browser.close();
}
