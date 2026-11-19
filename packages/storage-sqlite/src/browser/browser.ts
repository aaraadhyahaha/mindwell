// Browser SqlDriver. OPFS sync access handles can be held by one worker per origin, so tabs
// elect a leader with the Web Locks API. The leader runs the database worker; other tabs
// (for example one opened by the capture shortcut) send their calls over a BroadcastChannel
// and the leader relays them. When the leader tab closes, the lock passes to another tab,
// which starts its own worker.
import type { SqlDriver } from '@mindwell/core';
import { createRpcDriver } from './client';
import type { FromWorker, SqlRequest, TabMessage, ToWorker } from './protocol';

const LOCK = 'mindwell-sql-leader';
const CHANNEL = 'mindwell-sql';
const WORKER_ATTEMPTS = 8;

export interface BrowserDriverStatus {
  /** 'leader' runs the worker in this tab; 'follower' relays to another tab. */
  role: 'pending' | 'leader' | 'follower';
}

function startWorker(): Promise<Worker> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'mindwell-sql' });
    const onMessage = (e: MessageEvent<FromWorker>) => {
      if (e.data.type === 'ready') {
        worker.removeEventListener('message', onMessage);
        resolve(worker);
      } else if (e.data.type === 'fatal') {
        worker.removeEventListener('message', onMessage);
        worker.terminate();
        reject(Object.assign(new Error(e.data.error), { busy: e.data.busy }));
      }
    };
    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', (e) => {
      worker.terminate();
      reject(new Error(e.message || 'Database worker failed to load.'));
    });
  });
}

/** Starts the worker, retrying while a previous leader's worker still holds the files. */
async function startWorkerWithRetry(): Promise<Worker> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await startWorker();
    } catch (err) {
      const busy = (err as { busy?: boolean }).busy === true;
      if (!busy || attempt >= WORKER_ATTEMPTS) throw err;
      await new Promise((r) => setTimeout(r, 100 * attempt));
    }
  }
}

/**
 * A SqlDriver for this tab. Calls made before the tab knows where the database lives
 * are queued and sent once it does. A fatal worker error fails every call with its message.
 */
export function createBrowserDriver(): SqlDriver & { status: BrowserDriverStatus } {
  const me = crypto.randomUUID();
  const channel = new BroadcastChannel(CHANNEL);
  const status: BrowserDriverStatus = { role: 'pending' };
  let worker: Worker | null = null;
  let leader: string | null = null; // another tab's id while following
  let fatal: string | null = null;
  const queued: SqlRequest[] = [];

  const toWorker = (msg: ToWorker) => worker!.postMessage(msg);
  const tell = (msg: TabMessage) => channel.postMessage(msg);

  function send(req: SqlRequest) {
    if (fatal) throw new Error(fatal);
    if (worker) toWorker({ type: 'sql', req });
    else if (leader) tell({ kind: 'req', req });
    else queued.push(req);
  }

  function flush() {
    for (const req of queued.splice(0)) send(req);
  }

  const rpc = createRpcDriver(me, send);

  channel.onmessage = (e: MessageEvent<TabMessage>) => {
    const msg = e.data;
    switch (msg.kind) {
      case 'hello':
        if (worker) tell({ kind: 'leader', leader: me });
        break;
      case 'leader':
        if (worker || msg.leader === leader) break;
        // Calls sent to an earlier leader died with its connection (and any open transaction).
        if (leader) rpc.failPending('The database moved to another tab. Please try again.');
        leader = msg.leader;
        status.role = 'follower';
        flush();
        break;
      case 'leader-gone':
        if (msg.leader !== leader) break;
        leader = null;
        status.role = 'pending';
        rpc.failPending('The database tab closed. Please try again.');
        break;
      case 'req':
        if (worker) toWorker({ type: 'sql', req: msg.req });
        break;
      case 'res':
        rpc.receive(msg.res);
        break;
      case 'bye':
        if (worker) toWorker({ type: 'drop', client: msg.client });
        break;
    }
  };

  async function lead() {
    try {
      worker = await startWorkerWithRetry();
    } catch (err) {
      fatal = err instanceof Error ? err.message : String(err);
      queued.length = 0;
      rpc.failPending(fatal);
      return;
    }
    worker.onmessage = (e: MessageEvent<FromWorker>) => {
      if (e.data.type !== 'sql') return;
      const res = e.data.res;
      if (res.client === me) rpc.receive(res);
      else tell({ kind: 'res', res });
    };
    if (leader) rpc.failPending('The database moved to this tab. Please try again.');
    leader = null;
    status.role = 'leader';
    tell({ kind: 'leader', leader: me });
    flush();
  }

  void navigator.locks.request(LOCK, async () => {
    await lead();
    if (fatal) return; // release the lock so another tab can try
    await new Promise<never>(() => {}); // hold it for the life of the tab
  });

  addEventListener('pagehide', (e) => {
    if ((e as PageTransitionEvent).persisted) return;
    tell(worker ? { kind: 'leader-gone', leader: me } : { kind: 'bye', client: me });
  });

  // A tab that opens while a leader exists hears about it from this.
  tell({ kind: 'hello' });

  return { execute: rpc.execute, select: rpc.select, status };
}

/**
 * Asks the browser to keep this origin's storage (OPFS included) instead of evicting it
 * under pressure. Asks once per browser profile; later runs only report the state.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  const KEY = 'mindwell.persist-requested';
  try {
    if (localStorage.getItem(KEY)) return false;
    localStorage.setItem(KEY, new Date().toISOString());
  } catch {
    // storage blocked: still ask once this session
  }
  return navigator.storage.persist();
}
