/** Resolve ESM public export conditions relative to the isolated runtime, never the user project. */
export function resolvePublicEntry(specifier) { return import.meta.resolve(specifier); }
