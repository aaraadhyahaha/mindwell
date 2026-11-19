import { monotonicFactory } from 'ulid';

const next = monotonicFactory();

/** A new ULID: 26 chars, sortable by creation time (monotonic within the same millisecond). */
export function newId(): string {
  return next();
}

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/** True if `value` looks like a ULID (Crockford base32, 26 chars). */
export function isId(value: string): boolean {
  return ULID_RE.test(value);
}
