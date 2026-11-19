// Design check: screenshots the approved mockups and the running app (Vite on :5173)
// at the same window size, and reports which font file renders a node.
//
// The app runs in Chromium with a persistent profile in .design-shots/profile, so the
// database the app keeps in OPFS (sqlite-wasm) survives between runs; `seed` starts it fresh.
//
//   node scripts/design-shots.mjs mockup today            -> .design-shots/mockup-today.png
//   node scripts/design-shots.mjs app / today             -> .design-shots/app-today.png
//   node scripts/design-shots.mjs seed                    -> fresh profile, seeded through the app
//   node scripts/design-shots.mjs fonts <path|mockup:name> <selector>...
//   node scripts/design-shots.mjs compare today /            -> every box/spacing/font difference
//
// Env: SHOT_W / SHOT_H (default 1440 × 900), SHOT_AT (page clock, default today 08:30).
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.design-shots');
mkdirSync(out, { recursive: true });
const W = Number(process.env.SHOT_W ?? 1440);
const H = Number(process.env.SHOT_H ?? 900);
const APP = 'http://localhost:5173';
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const AT = new Date(process.env.SHOT_AT ?? `${todayIso}T08:30:00`);

const mockupUrl = (name) => pathToFileURL(join(root, 'docs/design/mockups', `${name}.html`)).href;

async function openApp(browser) {
  const page = await browser.newPage();
  await page.setViewportSize({ width: W, height: H });
  await page.clock.setFixedTime(AT);
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  return { page };
}

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
}

/** Seeds the "morning check-in" state the Today mockup shows, through the app's own code. */
async function seed(browser) {
  const { page } = await openApp(browser);
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
  console.log('seeded', profile);
}

async function shoot(browser, url, name, isApp) {
  const { page } = isApp ? await openApp(browser) : { page: await browser.newPage() };
  await page.goto(url);
  await settle(page);
  // The app's main column scrolls inside a 100vh shell: grow the window to its content so the
  // shot shows the whole screen, like the mockup's full page.
  const tall = await page.evaluate(() => Math.max(...[...document.querySelectorAll('main, .main')].map((m) => m.scrollHeight), 0));
  if (tall > H) {
    await page.setViewportSize({ width: W, height: tall });
    await page.waitForTimeout(200);
  }
  const file = join(out, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
}

async function fonts(browser, target, selectors) {
  const isMockup = target.startsWith('mockup:');
  const { page } = isMockup ? { page: await browser.newPage() } : await openApp(browser);
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

/**
 * Measures every element that carries its own text (and every svg/input/hr), in the mockup
 * and in the app, pairs them by text (nth occurrence), and prints each box, spacing or font
 * value that differs by more than 0.5px. Boxes are relative to the main column's left edge
 * (`.main`) so a scroll container does not shift them.
 */
const MEASURE = () => {
  const props = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'textTransform', 'gap', 'borderTopWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRightWidth', 'borderRadius', 'color', 'backgroundColor'];
  const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
  const seen = {};
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('script,style,head')) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    let key = own(el);
    const tag = el.tagName.toLowerCase();
    if (!key && tag === 'input') key = `input:${el.value || el.placeholder}`;
    if (!key && tag === 'hr') key = 'hr';
    if (!key && tag === 'svg') key = `svg:${el.closest('[aria-label]')?.getAttribute('aria-label') ?? ''}:${own(el.parentElement) || el.parentElement.textContent.trim().slice(0, 30)}`;
    if (!key && el.matches('.dot,.track,.track>div,.progress,.progress>div')) key = `${el.className}`.replace(/svelte-\S+/g, '').trim() + ':' + (el.parentElement.textContent.trim().slice(0, 20));
    if (!key) continue;
    const n = (seen[key] = (seen[key] ?? 0) + 1);
    const cs = getComputedStyle(el);
    const s = {};
    for (const p of props) s[p] = cs[p];
    s.fontFamily = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
    out.push({ key: `${key}#${n}`, tag, x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height, s });
  }
  return out;
};

async function measure(page) {
  const items = await page.evaluate(MEASURE);
  // Re-base on the main column so the app's scrolling .main and the mockup's page agree.
  const origin = await page.evaluate(() => {
    const m = document.querySelector('.cw') ?? document.querySelector('main, .main');
    if (!m) return { x: 0, y: 0 };
    const r = m.getBoundingClientRect();
    return { x: r.left + window.scrollX - m.scrollLeft, y: r.top + window.scrollY - m.scrollTop };
  });
  return new Map(items.map((i) => [i.key, { ...i, x: i.x - origin.x, y: i.y - origin.y }]));
}

async function compare(browser, mockup, path) {
  const mp = await browser.newPage();
  await mp.goto(mockupUrl(mockup));
  await settle(mp);
  const { page: ap } = await openApp(browser);
  await ap.goto(`${APP}${path}`);
  await settle(ap);
  const tall = await ap.evaluate(() => Math.max(...[...document.querySelectorAll('main, .main')].map((m) => m.scrollHeight), 0));
  if (tall > H) await ap.setViewportSize({ width: W, height: tall });
  const mtall = await mp.evaluate(() => document.documentElement.scrollHeight);
  if (mtall > H) await mp.setViewportSize({ width: W, height: mtall });
  await ap.waitForTimeout(200);
  const [m, a] = [await measure(mp), await measure(ap)];
  let diffs = 0;
  const missing = [];
  for (const [key, mi] of m) {
    const ai = a.get(key);
    if (!ai) {
      missing.push(key);
      continue;
    }
    const d = [];
    for (const k of ['x', 'y', 'w', 'h']) if (Math.abs(mi[k] - ai[k]) > 0.5) d.push(`${k} ${mi[k].toFixed(1)}→${ai[k].toFixed(1)}`);
    for (const k of Object.keys(mi.s)) if (mi.s[k] !== ai.s[k]) d.push(`${k} ${mi.s[k]}→${ai.s[k]}`);
    if (d.length) {
      diffs++;
      console.log(`${mi.tag} "${key.slice(0, 60)}"  [mockup→app]\n   ${d.join('\n   ')}`);
    }
  }
  const extra = [...a.keys()].filter((k) => !m.has(k));
  console.log(`\n${m.size} mockup nodes, ${diffs} differ, ${missing.length} missing in app, ${extra.length} only in app`);
  if (missing.length) console.log('missing in app:\n  ' + missing.join('\n  '));
  if (extra.length) console.log('only in app:\n  ' + extra.join('\n  '));
}

const [mode, ...rest] = process.argv.slice(2);
const profile = join(out, 'profile');
if (mode === 'seed') rmSync(profile, { recursive: true, force: true });
const browser = await chromium.launchPersistentContext(profile, { viewport: { width: W, height: H }, deviceScaleFactor: 1 });
try {
  if (mode === 'seed') await seed(browser);
  else if (mode === 'mockup') await shoot(browser, mockupUrl(rest[0]), `mockup-${rest[0]}`, false);
  else if (mode === 'app') await shoot(browser, `${APP}${rest[0] ?? '/'}`, `app-${rest[1] ?? 'page'}`, true);
  else if (mode === 'fonts') await fonts(browser, rest[0], rest.slice(1));
  else if (mode === 'compare') await compare(browser, rest[0], rest[1] ?? '/');
  else console.log('usage: design-shots.mjs seed | mockup <name> | app <path> <name> | fonts <path|mockup:name> <selector>...');
} finally {
  await browser.close();
}
