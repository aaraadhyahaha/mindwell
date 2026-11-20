// Checks docs/FEATURE_MAP.md against the repo: every backticked path must exist,
// every symbol must appear in a file listed on its line, every spec anchor must
// match a heading. Run from `pnpm check`. Exits 1 and prints one line per problem:
//   FEATURE_MAP.md:<line>: <problem>
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAP_REL = 'docs/FEATURE_MAP.md';
const IDENT = /^[A-Za-z_$][\w$]*$/;
const TABLE_PREFIXES = ['packages/', 'apps/', 'docs/', 'scripts/'];
const SEP = ' → ';

// GitHub-style heading slug: lowercase, drop everything but letters, digits, spaces, hyphens; spaces become hyphens.
export function slugify(heading) {
  return heading.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').replace(/ /g, '-');
}

function backticked(text) {
  return [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim()).filter(Boolean);
}

// `—` means none; otherwise only backticked tokens count.
function tokensOf(field) {
  if (field.trim() === '—') return [];
  return backticked(field);
}

function isTableRef(token) {
  return TABLE_PREFIXES.some((p) => token.startsWith(p)) && !token.includes('*');
}

// Pure parse: no filesystem access.
// Returns feature lines (5 fields each), table references to check, and parse problems.
export function parseFeatureMap(text) {
  const features = [];
  const refs = [];
  const problems = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    if (raw.startsWith('- ')) {
      const fields = raw.split(SEP);
      if (fields.length !== 5) {
        problems.push({ line, message: `feature line has ${fields.length} fields, expected 5` });
        return;
      }
      const [name, files, symbols, tests, spec] = fields;
      features.push({
        line,
        name: name.slice(2).trim(),
        files: tokensOf(files),
        symbols: tokensOf(symbols),
        tests: tokensOf(tests),
        spec: tokensOf(spec),
      });
    } else if (raw.startsWith('|')) {
      for (const token of backticked(raw)) {
        if (isTableRef(token)) refs.push({ line, token });
      }
    }
  });
  return { features, refs, problems };
}

function headingSlugs(text) {
  const slugs = new Set();
  let fenced = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const m = /^#{1,6}\s+(.+?)\s*$/.exec(line);
    if (m) slugs.add(slugify(m[1]));
  }
  return slugs;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentions(text, symbol) {
  if (IDENT.test(symbol)) {
    return new RegExp(`(?<![\\w$])${escapeRe(symbol)}(?![\\w$])`).test(text);
  }
  return text.includes(symbol);
}

// Full check: parse, then verify paths, anchors and symbols against the repo at `root`.
export function checkFeatureMap(text, root = ROOT) {
  const parsed = parseFeatureMap(text);
  const out = [...parsed.problems];
  const fileCache = new Map();
  const readRel = (rel) => {
    if (!fileCache.has(rel)) fileCache.set(rel, readFileSync(join(root, rel), 'utf8'));
    return fileCache.get(rel);
  };
  const exists = (rel) => existsSync(join(root, rel));
  const isDir = (rel) => {
    try {
      return statSync(join(root, rel)).isDirectory();
    } catch {
      return false;
    }
  };

  const checkSpec = (line, token) => {
    const hash = token.indexOf('#');
    const path = hash === -1 ? token : token.slice(0, hash);
    const anchor = hash === -1 ? null : token.slice(hash + 1);
    if (!path || !exists(path)) {
      out.push({ line, message: `path not found \`${path}\`` });
      return;
    }
    if (anchor === null) return;
    if (isDir(path)) {
      out.push({ line, message: `anchor \`#${anchor}\` on a directory \`${path}\`` });
      return;
    }
    if (!headingSlugs(readRel(path)).has(anchor)) {
      out.push({ line, message: `no heading matches anchor \`#${anchor}\` in \`${path}\`` });
    }
  };

  for (const f of parsed.features) {
    for (const file of f.files) {
      if (!exists(file)) out.push({ line: f.line, message: `file not found \`${file}\`` });
    }
    for (const test of f.tests) {
      if (!exists(test)) out.push({ line: f.line, message: `test not found \`${test}\`` });
    }

    const searchFiles = [];
    for (const file of f.files) {
      if (!exists(file)) continue;
      if (isDir(file)) {
        for (const e of readdirSync(join(root, file), { withFileTypes: true })) {
          if (e.isFile()) searchFiles.push(`${file}/${e.name}`);
        }
      } else {
        searchFiles.push(file);
      }
    }
    const texts = searchFiles.map(readRel);
    for (const sym of f.symbols) {
      if (!texts.some((t) => mentions(t, sym))) {
        out.push({ line: f.line, message: `symbol \`${sym}\` not found in listed files` });
      }
    }

    for (const token of f.spec) checkSpec(f.line, token);
  }

  for (const ref of parsed.refs) checkSpec(ref.line, ref.token);

  return out.sort((a, b) => a.line - b.line);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  const problems = checkFeatureMap(readFileSync(join(ROOT, MAP_REL), 'utf8'), ROOT);
  for (const p of problems) console.log(`FEATURE_MAP.md:${p.line}: ${p.message}`);
  process.exit(problems.length ? 1 : 0);
}
