/**
 * Generation of the EventSnapshot JSON shape. Bump this whenever the snapshot
 * gains or changes fields (e.g. subgroups arrived in v2.4.0). Every write stamps
 * it into the blob (see SupabaseEventRepository) and a server-side trigger
 * rejects writes carrying a lower value — so a stale cached client running an
 * older schema can no longer silently drop fields it doesn't know about.
 */
export const SCHEMA_VERSION = 2
