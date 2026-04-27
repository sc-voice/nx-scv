# nf: NameForma URL Scheme

The `nf:` scheme is a private URI namespace for nameforma references. It is syntactically valid per RFC 3986 and designed for future IANA registration.

## Forms

### Project-local path
```
nf:./relative/path
```
Resolved relative to the active world root (the directory containing `.nameforma`). When worlds are nested, an active child world takes priority over its parent.

Example: `nf:./src/cli/cli-task.ts`

### Absolute entity reference
```
nf:/uuid64/GUID
```
A world-independent reference to a nameforma entity by UUID64. The GUID is globally unique and stable across worlds, enabling cross-world linking.

Example: `nf:/uuid64/0PtBEiXO0086He8W1bcddW`

## Source field conventions

The `source` field on a reference accepts any of the following:

| Form | Example | Behavior |
|------|---------|----------|
| `nf:` URI | `nf:./doc/nf-url.md` | nameforma-local reference |
| Standard URL | `https://example.com` | stored as-is |
| Any URI scheme | `pkg:npm/lodash` | stored as-is |
| Plain text | `apple docs` | stored as hint, to be resolved later |

## Example: NameForma URLS as reference sources

When the `<name>` argument to `ref add` looks like a relative file path (contains `/` or has a known file extension), nameforma auto-populates `source` with the NameForma URL for the path and derives a short name from the filename.
