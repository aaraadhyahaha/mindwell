// README screenshots: seeds a fresh browser profile with made-up demo data, then
// captures each screen at 1440×900 into docs/screenshots/.
//
//   pnpm build && node scripts/screenshots.mjs
//
// The demo data is built here as a mindwell JSON export (dated relative to today) and
// loaded through Settings → Restore from backup, the same path a user takes. Everything
// in it is invented. The script never reads an existing browser profile.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'screenshots');
const PORT = 4173;
const BASE = `http://localhost:${PORT}/mindwell`;
const VIEWPORT = { width: 1440, height: 900 };

// ---------- demo data ----------

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
let lastMs = 0;
let seq = 0;
/** A valid ULID whose time part is `ms` (monotonic within the script). */
function ulid(ms) {
  if (ms <= lastMs) ms = lastMs + 1;
  lastMs = ms;
  let t = '';
  for (let i = 0, n = ms; i < 10; i++, n = Math.floor(n / 32)) t = CROCKFORD[n % 32] + t;
  let r = '';
  for (let i = 0; i < 16; i++) r += CROCKFORD[(seq++ * 7 + i * 13 + ms) % 32];
  return t + r;
}

const pad = (n) => String(n).padStart(2, '0');
/** Local calendar day `offset` days from today, as YYYY-MM-DD. */
function day(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
/** ISO instant at local `hh:mm` on the day `offset` from today. */
function at(offset, hh, mm = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

const tables = {};
/** Adds a row with the shared columns; `when` is its creation time. */
function row(table, when, fields) {
  const r = {
    id: ulid(Date.parse(when)),
    created_at: when,
    updated_at: when,
    deleted_at: null,
    schema_version: 1,
    ...fields,
  };
  (tables[table] ??= []).push(r);
  return r;
}

function buildDemo() {
  // Chapters read: Introduction, 1, 2, 3.
  [[0, -20], [1, -18], [2, -12], [3, -6]].forEach(([chapter, off]) =>
    row('chapters', at(off, 20), { chapter, read_day: day(off) }),
  );

  const now = new Date().toISOString();
  row('settings', at(-20, 19), { key: 'name', value: JSON.stringify('Maya') });
  row('settings', at(-20, 19), { key: 'backup.since', value: JSON.stringify(at(-20, 19)) });
  row('settings', now, { key: 'backup.last_export_at', value: JSON.stringify(now) });

  // Past days: morning check-ins and evening closes.
  const intents = [
    'Start the literature review before checking messages.',
    'Ask one question in the seminar.',
    'Two focused hours on the problem set, phone in the other room.',
    'Finish the draft introduction, even if it is rough.',
    'Take a real lunch break away from the desk.',
    'Reply to the supervisor email by noon.',
    'Review the lecture notes for twenty minutes.',
  ];
  const types = [['heavy_study'], ['social'], ['heavy_study'], ['stressful_event'], ['light'], ['heavy_study'], ['exam']];
  const results = ['kept', 'partly', 'kept', 'not', 'kept', 'partly', 'kept'];
  for (let off = -13; off <= -1; off++) {
    const i = (off + 13) % intents.length;
    row('days', at(off, 7, 40), {
      day: day(off),
      types: JSON.stringify(types[i]),
      energy: [3, 4, 2, 3, 4, 3, 2][i],
      intent_prompt_id: null,
      intent_text: intents[i],
      intent_result: results[i],
      rating: [3, 4, 3, 2, 4, 3, 4][i],
      checkin_at: at(off, 7, 40),
      closed_at: at(off, 21, 35),
    });
  }

  // ch01: stories and captures.
  const stories = {
    behind: row('ch01_stories', at(-17, 9), { name: 'Falling behind', first_seen_day: day(-17), archived: 0 }),
    enough: row('ch01_stories', at(-16, 14), { name: 'Not good enough', first_seen_day: day(-16), archived: 0 }),
    judged: row('ch01_stories', at(-14, 11), { name: "They'll think I'm unprepared", first_seen_day: day(-14), archived: 0 }),
  };
  const captures = [
    [-13, 9, 12, 'Everyone else has already started the reading.', 'behind', 4],
    [-12, 16, 5, "My draft is nowhere near as clear as Priya's.", 'enough', 3],
    [-11, 10, 30, "If I ask that, they'll realise I didn't follow last week.", 'judged', 4],
    [-10, 8, 50, "Three deadlines next week and I haven't touched two of them.", 'behind', 5],
    [-9, 14, 20, 'That feedback means the whole chapter is wrong.', 'enough', 4],
    [-8, 11, 0, "I'll freeze when it's my turn to present.", 'judged', 4],
    [-7, 9, 40, 'I wasted the whole morning.', 'behind', 3],
    [-6, 15, 15, 'Someone who belonged here would find this easy.', 'enough', 4],
    [-5, 10, 5, 'The group chat is quiet because they think my part is late.', 'judged', 3],
    [-4, 9, 25, "I'm behind on the reading again.", 'behind', 3],
    [-3, 13, 45, 'My supervisor sounded disappointed.', 'enough', 3],
    [-2, 10, 10, "I'll never catch up before the exam.", 'behind', 4],
    [-1, 16, 30, 'They will notice I skipped the optional reading.', 'judged', 2],
    [-1, 20, 15, 'I should have done more today.', 'behind', 2],
    [0, 8, 20, 'The review this afternoon will show I have nothing new.', 'judged', 3],
  ];
  const caps = captures.map(([off, hh, mm, text, story, intensity]) =>
    row('ch01_captures', at(off, hh, mm), {
      text,
      story_id: stories[story].id,
      intensity,
      captured_at: at(off, hh, mm),
      day: day(off),
    }),
  );

  // ch02: thought records, intensity falling over time on "Falling behind".
  const records = [
    {
      off: -10, cap: 3, story: 'behind',
      situation: 'Sunday evening, looking at the calendar for next week.',
      automatic_thought: "Three deadlines next week and I haven't touched two of them.",
      feeling: 'Dread', before: 80, after: 50,
      evidence_for: 'Two of the three pieces are not started.',
      evidence_against: 'The essay is half done. The lab report is short and I have written four like it. I have caught up from worse in October.',
      p: [1, 1, 0],
      balanced_thought: 'Next week is full, not impossible. If I plan the two unstarted pieces tonight, I know where each hour goes.',
    },
    {
      off: -6, cap: 7, story: 'enough',
      situation: 'Reading the comments on my chapter draft.',
      automatic_thought: 'Someone who belonged here would find this easy.',
      feeling: 'Shame', before: 70, after: 45,
      evidence_for: 'There are a lot of comments.',
      evidence_against: 'Most comments are about structure, not ideas. My supervisor wrote "promising argument". Priya said her first draft came back the same way.',
      p: [1, 1, 1],
      balanced_thought: 'Lots of comments means the draft was read closely. Finding it hard is part of doing it, not proof I don’t belong.',
    },
    {
      off: -2, cap: 11, story: 'behind',
      situation: 'Library, after a slow morning on the problem set.',
      automatic_thought: "I'll never catch up before the exam.",
      feeling: 'Anxious', before: 60, after: 30,
      evidence_for: 'I am a week behind the schedule I made.',
      evidence_against: 'The schedule had no slack. There are nineteen days left. I finished two topics this week.',
      p: [1, 0, 0],
      balanced_thought: 'I am behind my plan, not hopelessly behind. A week of slack in the plan fixes most of it.',
    },
  ];
  let firstRecordId = null;
  for (const r of records) {
    const rec = row('ch02_thought_records', at(r.off, 20, 30), {
      day: day(r.off),
      capture_id: caps[r.cap].id,
      story_id: stories[r.story].id,
      situation: r.situation,
      automatic_thought: r.automatic_thought,
      feeling: r.feeling,
      intensity_before: r.before,
      evidence_for: r.evidence_for,
      evidence_against: r.evidence_against,
      ps_permanent: r.p[0],
      ps_pervasive: r.p[1],
      ps_personal: r.p[2],
      balanced_thought: r.balanced_thought,
      intensity_after: r.after,
      complete: 1,
    });
    firstRecordId ??= rec.id;
  }

  // Introduction: one running experiment with check-ins.
  const exp = row('intro_experiments', at(-11, 21), {
    module: 'ch02',
    technique: 'thought_records',
    label: 'A thought record whenever a thought hits 60 or more',
    hypothesis: 'Writing it out will take the edge off the big spikes within a day.',
    start_day: day(-11),
    end_day: day(10),
    status: 'active',
    verdict: null,
    note: null,
  });
  [[-9, 3], [-6, 3], [-3, 4], [-1, 4]].forEach(([off, rating]) =>
    row('intro_checkins', at(off, 21, 40), { experiment_id: exp.id, day: day(off), rating, note: null }),
  );

  // ch03: a reappraisal event today, rated past events, defusions, writing, gratitude.
  row('ch03_events', at(-1, 18), {
    title: 'Project review with my supervisor',
    starts_at: at(0, 15),
    day: day(0),
    reframe_helped: null,
    outcome_rating: null,
  });
  row('ch03_events', at(-5, 19), {
    title: 'Seminar presentation',
    starts_at: at(-4, 11),
    day: day(-4),
    reframe_helped: 'yes',
    outcome_rating: 4,
  });
  row('ch03_events', at(-3, 19), {
    title: 'Call with the lab group',
    starts_at: at(-2, 14),
    day: day(-2),
    reframe_helped: 'a_bit',
    outcome_rating: 3,
  });
  row('ch03_defusions', at(-4, 9, 30), { capture_id: caps[9].id, thought_text: "I'm behind on the reading again.", day: day(-4) });
  row('ch03_defusions', at(-2, 10, 20), { capture_id: null, thought_text: 'I am not cut out for this.', day: day(-2) });
  const series = row('ch03_series', at(-5, 20), {
    topic: 'The week the first draft came back',
    planned_days: 4,
    start_day: day(-5),
    status: 'active',
  });
  [[-5, 2, 3], [-4, 3, 3], [-3, 2, 4]].forEach(([off, before, after]) =>
    row('ch03_sessions', at(off, 20, 15), {
      series_id: series.id,
      day: day(off),
      minutes: 15,
      mood_before: before,
      mood_after: after,
    }),
  );
  [-6, -5, -3, -2, -1].forEach((off) => row('ch03_gratitude', at(off, 21, 50), { day: day(off) }));

  return { firstRecordId };
}

// ---------- browser ----------

async function waitForServer(url, ms = 30_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Preview server did not start at ${url}. Run pnpm build first.`);
}

async function main() {
  const { firstRecordId } = buildDemo();
  const backup = JSON.stringify(
    { app: 'mindwell', format: 1, exported_at: new Date().toISOString(), tables },
    null,
    2,
  );

  const server = spawn('pnpm', ['--filter', '@mindwell/web', 'exec', 'vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
    detached: true,
    shell: true,
  });
  const profile = await mkdtemp(join(tmpdir(), 'mindwell-shots-'));
  try {
    await waitForServer(`${BASE}/`);
    await mkdir(OUT, { recursive: true });
    const ctx = await chromium.launchPersistentContext(profile, {
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: 'light',
      serviceWorkers: 'block',
    });
    const page = ctx.pages()[0] ?? (await ctx.newPage());

    // Seed through the app's own restore flow.
    await page.goto(`${BASE}/settings`);
    await page.getByRole('button', { name: 'Choose a JSON export' }).waitFor();
    await page.locator('input[type=file]').setInputFiles({
      name: 'mindwell-demo.json',
      mimeType: 'application/json',
      buffer: Buffer.from(backup),
    });
    const alert = page.getByRole('alert');
    const replace = page.getByRole('button', { name: 'Replace my data' });
    await Promise.race([replace.waitFor(), alert.waitFor()]);
    if (await alert.isVisible()) throw new Error(`Demo backup rejected: ${await alert.innerText()}`);
    await Promise.all([page.waitForEvent('load'), replace.click()]);

    // `setup` runs on the loaded page before the capture; nothing it does is saved for long
    // (the profile is deleted afterwards).
    const shot = async (name, path, setup = async () => {}) => {
      await page.goto(`${BASE}${path}`);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      await setup();
      await page.waitForTimeout(400);
      await page.mouse.move(0, VIEWPORT.height - 1);
      await page.screenshot({ path: join(OUT, `${name}.png`) });
      console.log(`docs/screenshots/${name}.png`);
    };

    const checkIn = async () => {
      await page.getByRole('button', { name: 'Heavy study' }).click();
      await page.getByRole('button', { name: 'Stressful event' }).click();
      await page.getByRole('radio', { name: '3' }).first().click().catch(() => page.getByText('3', { exact: true }).first().click());
    };
    await shot('today-day', '/', checkIn);
    await shot('thoughts', '/m/ch01');
    await shot('thought-record', `/m/ch02/new?id=${firstRecordId}`, async () => {
      await page.getByRole('button', { name: /Balanced thought/ }).last().click();
    });
    await shot('chapter-3', '/m/ch03');
    await shot('library', '/library');
    await shot('capture', '/m/ch01/capture', async () => {
      await page.getByLabel('The thought').fill("I'll go blank in the review");
      await page.getByRole('radiogroup', { name: 'Intensity' }).getByRole('radio', { name: '4' }).click();
    });

    await page.emulateMedia({ colorScheme: 'dark' });
    await shot('today-night', '/', checkIn);

    await ctx.close();
  } finally {
    try {
      process.kill(-server.pid);
    } catch {
      // already gone
    }
    await rm(profile, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
