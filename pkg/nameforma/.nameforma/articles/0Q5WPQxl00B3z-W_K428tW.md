---
type: md
collection: world
zuid: 0Q5WPQxl00B3z-W_K428tW
title: User session management
description: User interaction context is preserved as a serializable Session that includes a ZidSpace that maps ZUIDs to context-specific "zid abbreviations" for a given ZUID universal identifier.
---

## Summary

A session is one human's interaction context, like a chat session with an LLM. It holds a `ZidSpace` that assigns short, speakable zids to entities. The session is saved to `.nameforma/session.json` so that a person's zids survive restarts.

## Design decisions

- **One session per human.** Sessions are individual. Sharing a session is not supported and is not designed for.
- **Zids are transient.** A zid is an alias scoped to one session. Permanent references use the full ZUID, which is universal.
- **The world is the source of truth.** A session zid can outlive its entity. Such a zid resolves as "deleted", the same as a zid for a removed entity.
- **Session is separate from World.** `World` decides when to save the session. The repository performs the write.
- **Location is hard-coded for now.** The path is `.nameforma/session.json`. `Session` has no knowledge of the path.
- **Reset is user-driven.** The user clears the session to reclaim tombstones. A reset touches only `session.json`, never the world.

## Current code

- [uuid64.ts](src/uuid64.ts): `UUID64` (128-bit UUIDv7) with order-preserving base64 (OPB64) encoding for temporal sorting.
- [identifiable.ts](src/identifiable.ts): `FuzzyId` type and identity logic used across the system.
- [forma.ts](src/forma.ts): base object type that all entities and session data extend.
- [zid-space.ts](src/zid-space.ts): `ZidSpace`, a namespace that allocates case-insensitive zids (3–4 chars) for `UUID64`s. Its `toJSON()` / `fromJSON()` save and restore zid tables only. Formas are persisted separately.
- [fuzzy-namespace.ts](src/fuzzy-namespace.ts): `FuzzyNamespace` for low-entropy UI, with masked `timeId` substrings and Levenshtein-based identity resolution.
- [session.ts](src/session.ts): `Session`, a serializable container for interaction context that owns a `ZidSpace`.
- [world.ts](src/world.ts): central singleton that manages entity persistence, global namespaces, and focus.

## Implementation plan

### 1. World state

- Add a private `#session: Session | undefined` to `World`.
- Add a public `get session(): Session | undefined` getter.
- Do not add the session to `World.toJSON()` or `World.fromJson()`. It lives in its own file.

### 2. Load and save

- **Load:** during `World.initialize()`, read `.nameforma/session.json` with `Session.fromJSON()`.
- **Fallback:** if the file is missing or unreadable, start a fresh `Session`. Do not stop initialization.
- **Save:** `saveSession()` writes `this.#session.toJSON()`. `World` calls it at explicit save points.
- **Ordering:** restore the session after the world has loaded its entities.

### 3. Re-registration

- `ZidSpace.fromJSON()` restores zids only. After load, call `addForma()` for every entity the world loaded.
- Until that step runs, restored zids do not resolve to entities.

### 4. Repository IO

- `WorldRepository` already names `session.json` in its documentation. It performs the read and write.
- The repository owns the file path. `Session` does not.

### 5. Reset

- Clearing the session writes a fresh `Session` to `session.json`.
- A reset must not modify the world.

## Deferred (YAGNI)

These are real but not needed now. Each is revisited when the need appears.

- **Auto-save** on every mutation. Start with explicit save points.
- **Version field** in `ZidSpaceJSON` and `session.json`. Add it at the first real format change.
- **Pruning tombstones.** Users reclaim space by clearing the session.
- **Extending `IRepository`** for sessions. `WorldRepository` writes the file directly.
- **Where the file lives and whether git tracks it.** The architecture supports either. This is a team decision.
- **Cross-process locking.** Add it if concurrent writes are observed.

## References

- [src/forma.ts](src/forma.ts): Base object type and mutator interface
- [src/fuzzy-namespace.ts](src/fuzzy-namespace.ts): **Deprecated.** Legacy namespace superseded by `ZidSpace` for sessions. Still used by other components; not part of this design.
- [src/identifiable.ts](src/identifiable.ts): FuzzyId and identity logic
- [src/repository.ts](src/repository.ts): Persistence abstraction
- [src/session.ts](src/session.ts): Session container and serialization
- [src/uuid64.ts](src/uuid64.ts): UUID64 and OPB64 logic
- [src/world.ts](src/world.ts): World singleton and orchestration
- [src/zid-space.ts](src/zid-space.ts): ZidSpace namespace and mapping logic
