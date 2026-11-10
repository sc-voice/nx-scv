---
type: "nameforma.md"
collection: world
zuid: 07Wqg2BvVhfCXB2fQ3oLge
title: "07Wqg2-ZUID:-A-FuzzyID-for-Humans"
description: "Specification of the ZUID identifier: a UUIDv7 with a 22-character text form that sorts by time and supports prefix time windows."
status: "draft"
tags: ["zuid", "uuidv7", "specification"]
author: "Karl Lew"
updated: 2026-11-09
---

# ZUID: A FuzzyID for Humans

## 1. Requirements

Humans generally want several things from an ID:

- Uniqueness
- URL safe (i.e., A-Z a-z 0-9 - _.~)
- Recognizable (e.g., 01a1c2c7-f5e2-7968-980e-669c1b5de4b6)
- Time (i.e., when was this?)
- Usefully sortable (vs. UUIDv4)
- Mnemonic nicknames (e.g., 07Wq vs. 07WqhSW4MFHB7pwLeBp9P6)
- Brevity (vs. 01a1c2c7-f5e2-7968-980e-669c1b5de4b6)
- Double-clickable (alphanumeric with underscores)
- Audio fidelity (e.g., I hear "abc123")

And in today's world, Humans have to deal with UUIDs, which are useful but unwieldy in everyday use. 
For example, we would never put a UUID on a license plate:

| Requirement | UUID? | Why |
|-------------|------------------|-----|
| Uniqueness | ✅ | UUIDv4 128 bits (~122 random) |
| URL safe | ✅ | Hex digits and hyphens are unreserved characters |
| Recognizable | ✅ | clusters of hex |
| Time | ✅  | UUIDv7 |
| Usefully sortable | ✅ | UUIDv7 |
| Mnemonic nicknames | ❌  | UUIDv7 (e.g., 01a1c2c7-f5e2-...) |
| Brevity | ❌ | 36 characters, including 4 hyphens |
| Double-clickable | ❌ | Hyphens break word selection in many editors |
| Audio fidelity | ❌ | 36 character UUIDv7 |

### ZUID: A User Friendly ID

Compared to a phone number, UUIDs are monsters that sprawl across the page.
They are hard to read, type and copy. And they rudely displace all words in their neighborhood, cluttering up pages and lists of things Humans need to work with.
Time is also important to Humans, and we might consider using UUIDv7s, but they are 36 character monsters.
UUIDs are just not friendly to users.
Humans prefer shorter things. 

Can a UUIDv7 be shorter?

Yes, we can use a different encoding.
We can use the OPB63_64 encoding:

  UUIDv7: 01a1c2c7-f5e2-7968-980e-669c1b5de4b6 
  ZUID:   07WqhSW4MFHB7pwLeBp9P6

The OPB63_64 encoding simply uses a larger alphabet (63 vs 16 characters) to encode 128 bits more efficiently
as 22 characters instead of 36.

| Requirement | ZUID | Why |
|-------------|------------------|-----|
| Uniqueness | ✅ | ZUID <=> 128 bits (~122 variable) |
| URL safe | ✅ | ZUID is URL safe |
| Recognizable | ✅ | ZUID: 07WqhSW4MFHB7pwLeBp9P6 |
| Time | ✅  | UUIDv7-based |
| Usefully sortable | ✅ | ZUIDs are sorted by time |
| Mnemonic nicknames | ✅ | 07Wq, 07Wqh, ..., 07WqhSW4MFHB7pwLeBp9P6 |
| Brevity | ✅ | 4,5,6,...,22 character mnemonics |
| Double-clickable | ✅ | ZUIDs are "double click words" |
| Audio fidelity | ✅ | speakable mnemonics (e.g., 07Wq) |

### What is a ZUID?

A ZUID is the OPB63_64 encoding of a UUIDv7.
ZUIDs are 22 characters long and are organized as two substrings:
* Timestamp (11-character) 07WqmMo51lB
* Signature (11-character) DSbfGu0pgu6

The timestamp prefix allows ZUIDs to be time-sorted down to the millisecond.
The signature string can be used to relate a group of identifiable things (e.g. a todo list and its actions).

To understand how these two substrings can be used, we introduce mnemonic subsets (nicknames).

### Mnemonic Subsets (Nicknames)

Even though ZUIDs are much shorter than UUIDv7s, they are still too long to remember and that is why Humans use numbered lists. The list numbers are easy references:

* #  ZUID                   PRODUCT
* 1. 07WqmMo51lBDSbfGu0pgu6 Bag of bolts 
* 2. 07WqmO4lynHDFXG1oZR0Km Swiss cheese, 8oz
* 3. ...

Humans then can talk about "Item 1".
And that is fine as long as we work with one list only.
With two or more lists, we encounter ambiguity of reference ("Which Item 1?").

But ZUIDs are informationally dense, which means that short subsets of a ZUID will
tend to be unique in a list, and we could simplify our list to:

* Mo51l Bag of bolts 
* O4lyn Swiss cheese, 8oz
* ...

In the above list, we use Mo51l as a nickname for 07WqmMo51lBDSbfGu0pgu6.
We no longer need to think about "Item 1" on "List A". 
The mnemonic Mo51l is visually distinct: it is unique in the list, 
and probably even across two or more lists. 

### Variable Entropy

We can also choose different mnemonic subsets according to purpose.
In particular, we note that the ZUID timestamp has variable entropy.
We can use the ZUID timestamp prefix to tag a document 07WqmMo51lBDSbfGu0pgu6 with its creation date:

* title: "07Wqg2-ZUID:-A-FuzzyID-for-Humans"

But if we create a ZUID agenda with ZUID action items, the ZUID prefixes will likely be identical,
so we can use the timestamp suffixes, which have higher entropy:

* Mo51l Walk the cat
* Zxmm2 Feed the dog

### ZUIDs for Agents

Agents also use ZUIDs with ease. 
Their density and encoding stand out enough for an agent to recognize 
07Wq or 07WqmMo51lBDSbfGu0pgu6 as the same reference.

In fact, ZUIDs are designed specifically for Human/Agentic interaction.
ZUID mnemonics have proven to work quite effectively within a chat session. 
Humans can double-click copy and paste ZUID mnemonics with ease into a prompt and
the Agent will immediately associate the mnemonic with the full ZUID independently.
ZUID mnemonics are handles for both Agent and Human.

## 1.1 Scope

This document specifies ZUID, a 128-bit identifier. It defines:

- the binary form, which is a standard UUIDv7 (RFC 9562);
- the text form, a 22-character string;
- the operations in `src/zuid.ts`, and the OPB63_64 codec in `src/opb63_64.ts` that the text form uses.

Where this document and the code disagree, the code and its tests in `test/zuid.ts` and `test/opb63_64.ts` are authoritative. Those tests are the conformance suite.

## 2. Binary Form

A ZUID is 16 bytes. Bits are numbered from the most significant bit of byte 0.

| Bytes | Bits | Field | Value |
|-------|------|-------|-------|
| 0–5 | 48 | Unix time | Milliseconds since 1970-01-01T00:00:00Z, big-endian |
| 6 (high nibble) | 4 | Version | `0111` (7) |
| 6 (low nibble) and 7 | 12 | Sequence | 0–4095, big-endian |
| 8 (top 2 bits) | 2 | Variant | `10` |
| 8 (low 6 bits) and 9–15 | 62 | Signature | Caller-supplied, or random |

The buffer is a valid UUIDv7. The constructor rejects any buffer that is not 16 bytes, or whose version is not 7 or whose variant is not `10`.

### 2.1 Creation

`ZUID.create(millis?, sequence?, signature?)`

- `millis` defaults to `Date.now()`. It is written as 48 bits.
- `sequence` defaults to 12 random bits. A supplied value is masked to its low 12 bits; it is not range-checked.
- `signature` defaults to 62 random bits. A supplied value is masked to its low 62 bits, so bits 62 and 63 are dropped.

`ZUID.forSignature(sig)` is `create(Date.now(), undefined, sig)`.

### 2.2 Accessors

| Member | Result |
|--------|--------|
| `timestamp` | Unix milliseconds, from bytes 0–5 |
| `sequence` | 12-bit sequence |
| `signature` | 62-bit signature, as a bigint |
| `toBuffer()`, `toUUIDv7()` | A copy of the 16 bytes |
| `compare(other)` | Byte-wise comparison of the 16-byte buffers: −1, 0 or 1 |
| `equals(other)` | True if the 16 bytes are identical |

Comparison orders by time, then sequence, then signature, because those fields are laid out in that order in the buffer.

## 3. Text Form

The text form is 22 characters with no hyphens or other punctuation. It is two 11-character blocks:

- **hi block** (characters 0–10): the 64-bit value of bytes 0–7, with the version nibble replaced by `15`.
- **lo block** (characters 11–21): the 64-bit value of bytes 8–15, unchanged.

Each block is encoded with OPB63_64 (section 5). `toString()` produces this form.

### 3.1 Version Nibble

The binary version nibble is `7`. In the text form it is `15` (`F`). The nibble occupies bits 12–15 of the hi value, which is below the 48-bit timestamp (bits 16–63). Changing it therefore never changes a prefix's time window.

Every ZUID uses the same text version, so text comparison and binary comparison give the same order. This is tested in `test/zuid.ts`.

### 3.2 Parsing

`ZUID.fromString(text)`:

- requires exactly 22 characters, otherwise throws `RangeError`;
- decodes each block with OPB63_64, which throws `Error` for a character outside the alphabet and `RangeError` for a block whose value exceeds 2^64 − 1;
- requires the hi block's version nibble to be `15`, otherwise throws `RangeError`;
- sets the binary version nibble to `7` and builds the 16-byte buffer.

`timeId()` returns the first 11 characters of `toString()`.

## 4. Time Windows

`ZUID.timeRangeOf(prefix)` returns `{ start, end }` in Unix milliseconds for a text prefix of 1 to 11 characters. Every ZUID whose text begins with `prefix` has a timestamp in `[start, end)`.

- The window is the exact range of the prefix, rounded outward to whole milliseconds. Each end can be up to 1 ms wider than the exact bounds.
- The exact width of an n-character prefix is 63^(11−n) / 2^16 ms.
- `timeRangeOf` throws `RangeError` for a prefix of length 0 or above 11, or one whose value exceeds 2^64 − 1. It throws `Error` for a character outside the alphabet.

| Prefix length | Approximate width |
|---------------|-------------------|
| 6 | 15 s |
| 7 | 240 ms |
| 8 | 3.8 ms |

Prefixes nest: a longer prefix's window lies inside a shorter prefix's window (tested).

## 5. OPB63_64 Codec

OPB63_64 encodes an unsigned 64-bit value as a fixed-width, order-preserving base-63 string.

- **Alphabet**, in digit order: `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz`. This is ASCII code-point order, so string comparison of equal-length encodings equals numeric comparison.
- **Width**: every encoding is exactly 11 characters, because 63^10 < 2^64 ≤ 63^11.
- **Encoding**: most significant digit first. `encode(value)` takes a bigint in [0, 2^64 − 1] and throws `RangeError` otherwise, including for non-bigint input.
- **Decoding**: `decode(s)` requires exactly 11 characters, otherwise `RangeError`. A character outside the alphabet throws `Error`. A value of 2^64 or more throws `RangeError`, so `zzzzzzzzzzz` is rejected.

## 6. Ordering and Uniqueness

- **Time order.** IDs sort first by their 48-bit millisecond timestamp.
- **No monotonic guarantee from `create()`.** Two IDs created in the same millisecond with default arguments have random sequences, so their order is arbitrary.
- **Strictly increasing chains.** `after(msSys = Date.now())` returns an ID that compares strictly greater than the receiver and keeps its signature:
  - if `msSys` is later than the receiver's time, the result has time `msSys` and sequence 0;
  - otherwise, if the receiver's sequence is below 4095, the result has the same time and sequence + 1;
  - otherwise the result has time + 1 ms and sequence 0.
- **Collisions.** Two IDs are equal only if time, sequence and signature all match. With default arguments, the 74 random bits (12 sequence, 62 signature) per millisecond make collisions unlikely, but they are not excluded. Callers that need uniqueness must supply signatures or use `after()`.

## 7. Errors

| Condition | Error |
|-----------|-------|
| Buffer not 16 bytes | `Error` |
| Buffer version not 7 or variant not `10` | `Error` |
| Text not 22 characters | `RangeError` |
| Text version nibble not 15 | `RangeError` |
| Character outside the alphabet | `Error` |
| Block value above 2^64 − 1 | `RangeError` |

## 8. Worked Example

Inputs: `millis = 1800000000000` (2027-01-15T08:00:00.000Z), `sequence = 291` (0x123), `signature = 0x1234567890abcdef`.

Binary (32 hex digits):

```
01 a3 18 5c 50 00 71 23 92 34 56 78 90 ab cd ef
└───── time ─────┘ │  │ │  └──── signature ───────┘
                   │  │ └ variant 10, signature top bits
                   │  └ sequence 0x123
                   └ version 7
```

Text:

```
07YN3KPKtvi AgrjVXN7do5
└── hi ───┘ └── lo ───┘
```

The hi block decodes to the binary hi with version nibble 15. `fromString(text)` returns an ID equal to the original.

Prefix windows for the text above:

| Prefix | Window `[start, end)` |
|--------|------------------------|
| `07YN3K` | 1799999993911 – 1800000009056 |
| `07YN3KP` | 1799999999921 – 1800000000162 |
| `07YN3KPK` | 1799999999997 – 1800000000002 |

`after()` with the same millisecond gives sequence 292, and its text is `07YN3KPKtvj AgrjVXN7do5`.

## 9. Use in Practice

- **Copying.** A ZUID is one unbroken string of letters, digits and `_`.
- **URLs.** The alphabet contains only letters, digits and `_`. Those are unreserved characters in RFC 3986, so a ZUID needs no percent-encoding in a path or query.
- **Prefixes.** A prefix names a time window, not a unique ID. A 6-character prefix covers about 15 seconds and may match many IDs. Use the full 22 characters where identity matters.

## 10. References

- RFC 9562, Universally Unique IDentifiers (UUIDv7)
- RFC 3986, Uniform Resource Identifier: Generic Syntax (unreserved characters)
- Implementation: `src/zuid.ts`, tests `test/zuid.ts`
- Codec: `src/opb63_64.ts`, tests `test/opb63_64.ts`
