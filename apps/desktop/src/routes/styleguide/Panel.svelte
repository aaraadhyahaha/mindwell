<script lang="ts">
  import {
    Page, SectionLabel, Card, PromptCard, Field, Scale, Choice, Button, WhySheet, LineChart
  } from '$lib/ui';

  let { theme }: { theme: 'day' | 'night' } = $props();

  const tokens = ['--bg', '--surface', '--ink', '--muted', '--rule', '--accent', '--accent-soft'];
  const sizes = [12, 14, 16, 19, 24, 32];
  const spaces = [4, 8, 12, 16, 24, 40, 64];

  let root: HTMLDivElement | undefined = $state();
  let hexes = $state<Record<string, string>>({});
  $effect(() => {
    if (!root) return;
    const cs = getComputedStyle(root);
    hexes = Object.fromEntries(tokens.map((t) => [t, cs.getPropertyValue(t).trim()]));
  });

  const opts = [
    { value: 'a', label: 'Morning' },
    { value: 'b', label: 'Midday' },
    { value: 'c', label: 'Evening' }
  ];
  let single0 = $state<string | null>(null);
  let single1 = $state<string | null>('b');
  let multi0 = $state<string[] | null>(null);
  let multi1 = $state<string[] | null>(['a', 'c']);
  let s150 = $state<number | null>(null);
  let s151 = $state<number | null>(3);
  let s1000 = $state<number | null>(null);
  let s1001 = $state<number | null>(62);
  let f0 = $state('');
  let f1 = $state('Slow start, then a clear hour.');
  let f2 = $state('');
  let t0 = $state('');
  let t1 = $state('Wrote about the meeting.\nThen walked.');
  let fb0 = $state<'useful' | 'not-useful' | null>(null);
  let fb1 = $state<'useful' | 'not-useful' | null>('useful');
  let fb2 = $state<'useful' | 'not-useful' | null>('not-useful');
  let sheetOpen = $state(false);

  const one = [{ label: 'Focus', points: [{ x: 1, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 2.5 }, { x: 4, y: 4 }] }];
  const two = [
    ...one,
    { label: 'Energy', points: [{ x: 1, y: 3 }, { x: 2, y: 2 }, { x: 3, y: 3.5 }, { x: 4, y: 3 }] }
  ];
  const prompt = 'What is one thing you could set down for an hour, and what would that make room for?';
</script>

<div class="panel" data-theme={theme} bind:this={root}>
  <Page label="STYLEGUIDE" title="{theme === 'day' ? 'Day' : 'Night'} panel">
    <section>
      <SectionLabel as="h2">Colour</SectionLabel>
      <div class="swatches">
        {#each tokens as t (t)}
          <div class="sw">
            <span class="chip" style:background="var({t})"></span>
            <span class="meta">{t}<br />{hexes[t] ?? ''}</span>
          </div>
        {/each}
      </div>
    </section>

    <section>
      <SectionLabel as="h2">Type scale</SectionLabel>
      {#each sizes as s (s)}
        <div class="type">
          <span class="px">{s}px</span>
          <span style:font-family="var(--font-serif)" style:font-size="{s}px">Clear mind, steady work</span>
          <span style:font-family="var(--font-sans)" style:font-size="{s}px">Clear mind, steady work 0123</span>
        </div>
      {/each}
      <SectionLabel>Section label style</SectionLabel>
    </section>

    <section>
      <SectionLabel as="h2">Space and radius</SectionLabel>
      {#each spaces as s (s)}
        <div class="space"><span class="px">{s}px</span><span class="bar" style:width="{s}px"></span></div>
      {/each}
      <div class="radii">
        <span class="r" style:border-radius="var(--radius)">6px</span>
        <span class="r" style:border-radius="var(--radius-pill)">pill</span>
      </div>
    </section>

    <section>
      <SectionLabel as="h2">Button</SectionLabel>
      <div class="row">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="quiet">Quiet</Button>
      </div>
      <div class="row">
        <Button variant="primary" disabled>Primary</Button>
        <Button variant="secondary" disabled>Secondary</Button>
        <Button variant="quiet" disabled>Quiet</Button>
      </div>
    </section>

    <section>
      <SectionLabel as="h2">Choice</SectionLabel>
      <Choice label="Single, none selected" options={opts} bind:value={single0} />
      <Choice label="Single, one selected" options={opts} bind:value={single1} />
      <Choice label="Multi, none selected" options={opts} multiple bind:value={multi0} />
      <Choice label="Multi, some selected" options={opts} multiple bind:value={multi1} />
    </section>

    <section>
      <SectionLabel as="h2">Scale</SectionLabel>
      <Scale label="1 to 5, empty" mode="1-5" minLabel="Low" maxLabel="High" bind:value={s150} />
      <Scale label="1 to 5, with value" mode="1-5" minLabel="Low" maxLabel="High" bind:value={s151} />
      <Scale label="0 to 100, empty" mode="0-100" minLabel="None" maxLabel="All" bind:value={s1000} />
      <Scale label="0 to 100, with value" mode="0-100" minLabel="None" maxLabel="All" bind:value={s1001} />
    </section>

    <section>
      <SectionLabel as="h2">Field</SectionLabel>
      <Field label="Input, empty" placeholder="A few words" bind:value={f0} />
      <Field label="Input, filled" bind:value={f1} />
      <Field label="Input, with hint" hint="One line is enough." bind:value={f2} />
      <Field label="Textarea, empty" multiline placeholder="Write here" bind:value={t0} />
      <Field label="Textarea, filled with hint" multiline hint="Only you see this." bind:value={t1} />
    </section>

    <section>
      <SectionLabel as="h2">Card</SectionLabel>
      <Card>A plain card: surface, one-pixel rule, no shadow.</Card>
    </section>

    <section>
      <SectionLabel as="h2">PromptCard</SectionLabel>
      <PromptCard text={prompt} bind:feedback={fb0} />
      <PromptCard text={prompt} bind:feedback={fb1} />
      <PromptCard text={prompt} bind:feedback={fb2} />
    </section>

    <section>
      <SectionLabel as="h2">WhySheet</SectionLabel>
      <div class="row">
        <Button variant="secondary" onclick={() => (sheetOpen = true)}>Why this prompt?</Button>
      </div>
      <WhySheet bind:open={sheetOpen} title="Why this prompt">
        <p>It was chosen because you marked chapter 2 as read and rated focus low yesterday.</p>
      </WhySheet>
    </section>

    <section>
      <SectionLabel as="h2">LineChart</SectionLabel>
      <LineChart label="Focus over four days" series={one} yMin={0} yMax={5} />
      <LineChart label="Focus and energy over four days" series={two} yMin={0} yMax={5} />
      <LineChart label="Empty chart" series={[]} empty="Ratings will gather here after your first evening check-in." />
    </section>
  </Page>
</div>

<style>
  .panel {
    background: var(--bg);
    color: var(--ink);
    min-width: 0;
  }
  section {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }
  .swatches {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }
  .sw {
    display: flex;
    gap: var(--space-3);
    align-items: center;
  }
  .chip {
    width: 40px;
    height: 40px;
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    flex: none;
  }
  .meta,
  .px {
    font-family: var(--font-sans);
    font-size: var(--text-12);
    color: var(--muted);
  }
  .type {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-bottom: var(--space-3);
  }
  .space {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
  .space .px {
    width: 40px;
  }
  .bar {
    height: 8px;
    background: var(--accent);
  }
  .radii {
    display: flex;
    gap: var(--space-4);
  }
  .r {
    font-family: var(--font-sans);
    font-size: var(--text-12);
    color: var(--muted);
    border: 1px solid var(--muted);
    padding: var(--space-3) var(--space-5);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
</style>
