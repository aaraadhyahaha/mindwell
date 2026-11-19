<script lang="ts">
  import Card from './Card.svelte';
  import Button from './Button.svelte';

  type Feedback = 'useful' | 'not-useful';
  let {
    text,
    feedback = $bindable(null),
    onfeedback,
    onanother
  }: {
    text: string;
    feedback?: Feedback | null;
    onfeedback?: (f: Feedback) => void;
    onanother?: () => void;
  } = $props();

  function pick(f: Feedback) {
    feedback = f;
    onfeedback?.(f);
  }
</script>

<Card>
  <p class="text">{text}</p>
  <div class="actions">
    <Button variant="quiet" pressed={feedback === 'useful'} onclick={() => pick('useful')}>Useful</Button>
    <Button variant="quiet" pressed={feedback === 'not-useful'} onclick={() => pick('not-useful')}>Not useful</Button>
    <Button variant="quiet" onclick={() => onanother?.()}>Show another</Button>
  </div>
</Card>

<style>
  .text {
    font-family: var(--font-serif);
    font-size: var(--text-19);
    line-height: var(--leading-body);
    padding: var(--space-4) 0 var(--space-5);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
</style>
