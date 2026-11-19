import type { SignalValue, SuggestionRule } from '@mindwell/core';
import { addDays, signalList } from '@mindwell/core';

type Obj = { readonly [k: string]: SignalValue };
const isObj = (v: SignalValue): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
const str = (o: Obj, k: string): string | undefined => (typeof o[k] === 'string' ? (o[k] as string) : undefined);

export const suggestions: SuggestionRule[] = [
  {
    id: 'intro.low_ratings',
    evaluate(signals) {
      for (const e of signalList(signals, 'intro.active')) {
        if (!isObj(e)) continue;
        const id = str(e, 'id');
        const label = str(e, 'label');
        const ratings = Array.isArray(e.recent_ratings) ? e.recent_ratings : [];
        if (!id || !label || ratings.length < 2) continue;
        if (ratings.every((r) => typeof r === 'number' && r <= 2)) {
          return {
            key: `intro.low_ratings:${id}`,
            text: `${label} hasn't been helping for two weeks. End it early?`,
            reason: `Your last two weekly check-ins rated it ${ratings.join(' and ')} out of 5.`,
          };
        }
      }
      return null;
    },
  },
  {
    id: 'intro.try_new',
    evaluate(signals, { day }) {
      const tried = new Set(signalList(signals, 'intro.modules_tried').filter((m) => typeof m === 'string'));
      const offering = new Set(
        signalList(signals, 'experiments.available')
          .filter(isObj)
          .map((e) => str(e, 'module'))
          .filter((m): m is string => m !== undefined),
      );
      const cutoff = addDays(day, -7);
      const candidates = signalList(signals, 'chapters.read')
        .filter(isObj)
        .map((c) => ({ module: str(c, 'module'), chapter: c.chapter, read_day: str(c, 'read_day') }))
        .filter(
          (c): c is { module: string; chapter: number; read_day: string } =>
            c.module !== undefined && typeof c.chapter === 'number' && c.read_day !== undefined,
        )
        .filter((c) => c.read_day <= cutoff && offering.has(c.module) && !tried.has(c.module))
        .sort((a, b) => a.chapter - b.chapter);
      const c = candidates[0];
      if (!c) return null;
      return {
        key: `intro.try_new:${c.module}`,
        text: `You unlocked Chapter ${c.chapter} a week ago. Try one of its techniques as an experiment?`,
        reason: `Chapter ${c.chapter} was marked read on ${c.read_day} and none of its techniques has been tried.`,
      };
    },
  },
];
