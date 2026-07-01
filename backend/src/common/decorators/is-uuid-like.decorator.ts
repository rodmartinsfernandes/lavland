import { Matches } from 'class-validator';

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Aceita UUIDs canônicos, inclusive IDs fixos do seed (ex.: 00000000-...). */
export function IsUuidLike() {
  return Matches(UUID_LIKE, { message: 'must be a UUID' });
}
