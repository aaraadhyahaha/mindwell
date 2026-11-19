import type { SqlDriver, SqlValue } from '@mindwell/core';
import { bind } from './protocol';
import type { SqlRequest, SqlResponse } from './protocol';

export interface RpcDriver extends SqlDriver {
  /** Feed a response addressed to this client. Others are ignored. */
  receive(res: SqlResponse): void;
  /** Reject every call still waiting for a response. */
  failPending(message: string): void;
}

/** SqlDriver that turns each call into a request and waits for the matching response. */
export function createRpcDriver(client: string, send: (req: SqlRequest) => void): RpcDriver {
  let next = 1;
  const pending = new Map<number, { resolve: (res: SqlResponse) => void; reject: (err: Error) => void }>();

  function call(op: SqlRequest['op'], sql: string, params?: SqlValue[]): Promise<SqlResponse> {
    const id = next++;
    return new Promise<SqlResponse>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      try {
        send({ client, id, op, sql, params: bind(params) });
      } catch (err) {
        pending.delete(id);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    }).then((res) => {
      if (!res.ok) throw new Error(res.error);
      return res;
    });
  }

  return {
    async execute(sql, params) {
      const res = await call('execute', sql, params);
      return { rowsAffected: res.ok ? res.rowsAffected : 0 };
    },
    async select<T>(sql: string, params?: SqlValue[]) {
      const res = await call('select', sql, params);
      return (res.ok ? res.rows : []) as T[];
    },
    receive(res) {
      if (res.client !== client) return;
      const p = pending.get(res.id);
      if (!p) return;
      pending.delete(res.id);
      p.resolve(res);
    },
    failPending(message) {
      const all = [...pending.values()];
      pending.clear();
      for (const p of all) p.reject(new Error(message));
    },
  };
}
