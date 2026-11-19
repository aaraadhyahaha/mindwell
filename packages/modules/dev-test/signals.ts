import type { SignalDef } from '@mindwell/core';

export const signals: SignalDef[] = [
  {
    key: 'dev.notes_today',
    async compute({ store, day }) {
      const rows = await store.list('dev_notes', { where: { day } });
      return rows.length;
    },
  },
];
