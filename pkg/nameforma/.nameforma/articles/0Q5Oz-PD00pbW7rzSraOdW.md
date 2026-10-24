# Notebook design: current understanding

## Scope

- A personal notebook of Markdown documents for one person.
- Each person classifies knowledge differently, so classification is open-ended and user-defined.
- Sharing is possible, so the design must keep shared documents self-describing. Sharing is not a current requirement.

## Storage

- MongoDB is the source of truth.
- Each document is keyed by its UUID64, stored as `_id`.
- A local `mongod` listens only on localhost by default. It persists across reboots as long as its data directory is kept. It starts manually or at login via a LaunchAgent.

## Identity and links

- The UUID64 is the permanent key. Renaming a document does not affect it.
- The title is a display field, not an identifier.
- A link stores the target's UUID64. Its label may show the title at the time of writing. Resolution always uses the UUID64, so renames never break links.
- Wikipedia's model (title as key, redirects on rename) is deliberately not followed.

## Classification

- Labels are data, not schema. A document can carry any number of user-defined labels, such as `chat-session` or `idea`.
- Two mechanisms do most of the work: tags (attributes) and links (relationships).
- Folders, PARA, Johnny.Decimal, and Zettelkasten were considered as reference points. None is adopted yet.

## Import from Wikipedia

- A Wikipedia article becomes a document with its own UUID64.
- The article text is wikitext, so it must be converted to Markdown. Templates, infoboxes, and internal links need separate handling.
- Each imported document carries provenance: source URL, revision ID, retrieved date, license (CC BY-SA 4.0, and GFDL, since Wikipedia text is dual-licensed), and a link to the page history for authors.
- The text is adapted, not copied. Edits make it a different work over time, but any retained passages stay derived from the article.
- Provenance is recorded per document, with a link to the source and a note of which passages came from it.
- Attribution is required on every imported document, because the design is shareable.

Attribution line, generated from the stored fields:

> Adapted from "Hamlet", Wikipedia, revision 1234567, CC BY-SA 4.0 (https://en.wikipedia.org/w/index.php?oldid=1234567)

- References are not copied from the article unless they are themselves stored documents with UUID64s.

## Export and import

- Two formats: JSON and Markdown.
- JSON is the lossless serialization of the document. It is the reference when the formats disagree.
- Markdown is a readable view: the `markdown` field is the body, and the other fields go in YAML front matter.
- Details are deferred: date encoding, front matter quoting, and import rules.

## Open

- Date encoding, front matter quoting, and import rules.
- How classification is organized in practice.
- Whether a single attribution line or the structured fields are the stored form. The structured fields are stored, and the line is generated from them.

## Not legal advice

I am not a lawyer. Check the license terms before sharing any document derived from Wikipedia.
