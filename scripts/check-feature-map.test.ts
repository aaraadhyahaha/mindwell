import { describe, expect, it } from "vitest";
import { parseFeatureMap, slugify } from "./check-feature-map.mjs";

const LINE = (name: string, files: string, symbols: string, tests: string, spec: string) =>
  `- ${name} → ${files} → ${symbols} → ${tests} → ${spec}`;

describe("slugify", () => {
  it("matches the spec examples", () => {
    expect(slugify("Key interfaces (in `packages/core`)")).toBe("key-interfaces-in-packagescore");
    expect(slugify("Core prompts (Phase 0)")).toBe("core-prompts-phase-0");
  });

  it("lowercases and keeps letters, digits and hyphens", () => {
    expect(slugify("Shell (every screen)")).toBe("shell-every-screen");
    expect(slugify("ch01 — Notice-and-name")).toBe("ch01--notice-and-name");
  });

  it("strips punctuation and underscores without collapsing spaces", () => {
    expect(slugify("Foo_bar: baz; qux")).toBe("foobar-baz-qux");
    expect(slugify("a  b")).toBe("a--b");
  });

  it("keeps unicode letters", () => {
    expect(slugify("Café Déjà")).toBe("café-déjà");
  });

  it("returns empty string for empty heading", () => {
    expect(slugify("")).toBe("");
  });
});

describe("parseFeatureMap", () => {
  it("returns empty results for empty text", () => {
    expect(parseFeatureMap("")).toEqual({ features: [], refs: [], problems: [] });
  });

  it("parses a five-field feature line with its line number", () => {
    const text = [
      "# Title",
      "",
      LINE(
        "Store interface",
        "`packages/core/src/store.ts`",
        "`BaseRecord`, `Store`",
        "`packages/core/src/store.test.ts`",
        "`docs/ARCHITECTURE.md#key-interfaces`",
      ),
    ].join("\n");
    const { features, refs, problems } = parseFeatureMap(text);
    expect(problems).toEqual([]);
    expect(refs).toEqual([]);
    expect(features).toEqual([
      {
        line: 3,
        name: "Store interface",
        files: ["packages/core/src/store.ts"],
        symbols: ["BaseRecord", "Store"],
        tests: ["packages/core/src/store.test.ts"],
        spec: ["docs/ARCHITECTURE.md#key-interfaces"],
      },
    ]);
  });

  it("treats an em dash as no entries", () => {
    const { features } = parseFeatureMap(LINE("Name", "`a.ts`", "—", "—", "—"));
    expect(features[0]).toMatchObject({ files: ["a.ts"], symbols: [], tests: [], spec: [] });
  });

  it("ignores backticks in the name field", () => {
    const { features } = parseFeatureMap(LINE("Uses `ghost.ts`", "`a.ts`", "—", "—", "—"));
    expect(features[0].files).toEqual(["a.ts"]);
    expect(features[0].name).toBe("Uses `ghost.ts`");
  });

  it("takes only backticked tokens and ignores plain text", () => {
    const { features } = parseFeatureMap(LINE("N", "plain a.ts `b.ts` text", "x `Y`", "—", "—"));
    expect(features[0].files).toEqual(["b.ts"]);
    expect(features[0].symbols).toEqual(["Y"]);
  });

  it("keeps symbols that contain spaces or CSS characters", () => {
    const { features } = parseFeatureMap(LINE("N", "`f.ts`", "`Schibsted Grotesk`, `--bg`", "—", "—"));
    expect(features[0].symbols).toEqual(["Schibsted Grotesk", "--bg"]);
  });

  it("reports lines with too few or too many fields and skips them", () => {
    const text = [
      "- only → three → fields",
      LINE("ok", "`a.ts`", "—", "—", "—"),
      "- six → a → b → c → d → e",
    ].join("\n");
    const { features, problems } = parseFeatureMap(text);
    expect(features.map((f) => f.line)).toEqual([2]);
    expect(problems).toEqual([
      { line: 1, message: "feature line has 3 fields, expected 5" },
      { line: 3, message: "feature line has 6 fields, expected 5" },
    ]);
  });

  it("reports a bare dash line as a field-count problem", () => {
    const { features, problems } = parseFeatureMap("- ");
    expect(features).toEqual([]);
    expect(problems).toEqual([{ line: 1, message: "feature line has 1 fields, expected 5" }]);
  });

  it("does not treat lines that merely contain a dash as feature lines", () => {
    const { features, problems } = parseFeatureMap("Index only - feature → x → y\n-no-space → a");
    expect(features).toEqual([]);
    expect(problems).toEqual([]);
  });

  it("collects table tokens with the checked prefixes and skips globs and others", () => {
    const text = [
      "| Task | Go to |",
      "| --- | --- |",
      "| Add a prompt | module `prompts.ts` (e.g. `packages/modules/ch02/prompts.ts`); spec `docs/PROMPTS.md#prompt-definition` |",
      "| Add a card | `packages/modules/ch01/ui/*Card.svelte`, `apps/web/src/lib/x.ts`, `scripts/a.mjs`, `node_modules/x` |",
    ].join("\n");
    const { refs, problems, features } = parseFeatureMap(text);
    expect(problems).toEqual([]);
    expect(features).toEqual([]);
    expect(refs).toEqual([
      { line: 3, token: "packages/modules/ch02/prompts.ts" },
      { line: 3, token: "docs/PROMPTS.md#prompt-definition" },
      { line: 4, token: "apps/web/src/lib/x.ts" },
      { line: 4, token: "scripts/a.mjs" },
    ]);
  });

  it("handles CRLF line endings", () => {
    const { features } = parseFeatureMap(`${LINE("N", "`a.ts`", "—", "—", "—")}\r\n`);
    expect(features[0]).toMatchObject({ line: 1, files: ["a.ts"] });
  });
});
