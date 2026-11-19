import type { SqlValue } from '@mindwell/core';

/** Driver values after binding: booleans become 0/1, as in the other drivers. */
export type BoundValue = string | number | null;

export function bind(params: SqlValue[] = []): BoundValue[] {
  return params.map((p) => (typeof p === 'boolean' ? (p ? 1 : 0) : p));
}

/** One SQL call from one tab (`client`). `id` is unique per client. */
export interface SqlRequest {
  client: string;
  id: number;
  op: 'execute' | 'select';
  sql: string;
  params: BoundValue[];
}

export type SqlResponse =
  | { client: string; id: number; ok: true; rowsAffected: number; rows: unknown[] }
  | { client: string; id: number; ok: false; error: string };

/** Main thread → worker. */
export type ToWorker = { type: 'sql'; req: SqlRequest } | { type: 'drop'; client: string };

/** Worker → main thread. */
export type FromWorker =
  | { type: 'ready' }
  | { type: 'fatal'; error: string; busy: boolean }
  | { type: 'sql'; res: SqlResponse };

/** Between tabs, over a BroadcastChannel. */
export type TabMessage =
  | { kind: 'hello' }
  | { kind: 'leader'; leader: string }
  | { kind: 'leader-gone'; leader: string }
  | { kind: 'req'; req: SqlRequest }
  | { kind: 'res'; res: SqlResponse }
  | { kind: 'bye'; client: string };
