# UUID64

UUID64 is a high-performance, monotonic, and order-preserving identifier system used within Nameforma. 

It is based on the **UUIDv7** standard but optimized for lexicographical sorting in base64 (OPB64) format.

## Structure

A UUID64 consists of 128 bits (16 bytes), structured to ensure that identifiers are both time-sortable and unique.

### Bit Breakdown

The 128 bits are divided as follows:

- **Timestamp (48 bits)**: Milliseconds since the epoch.
- **Sequence (12 bits)**: A monotonic counter used to prevent collisions when multiple UUIDs are generated within the same mill    millisecond.
- **Randomness (68 bits)**: Randomly generated bits to ensure global uniqueness and prevent predictability.

## Key Features

### 1. Monotonicity
The implementation uses a `MonotonicityState` to ensure that even if multiple IDs are generated in rapid succession, the timestamp and sequence components always increase. This prevents "backward" time jumps during high-frequency generation.

### 2. Order-Preserving Base64 (OPB64)
Unlike standard Base64, which uses an alphabet that does not sort numerically, UUID64 utilizes a custom **Order-Preserving Base64** alphabet:
`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_`

Because the alphabet is ordered by numeric value, a simple lexicographical (string) sort on the encoded ID will result in a correct temporal sort. This allows for highly efficient database indexing and retrieval.

### 3. UUIDv7 Compatibility
While optimized for Nameforma's needs, the underlying byte structure remains compatible with the **UUIDv7** standard, allowing interoperability with other systems that implement RFC 9562.

## Implementation Details (TypeScript)

The `src/uuid64.ts` implementation provides:

- **Type Safety**: A branded `UUID64String` type to prevent accidental use of regular strings as IDs.
- **Efficient Encoding/Decoding**: High-performance bit manipulation for converting between 16-byte buffers, UUIDv7 formats, and OPB64 strings.
- **Avro Integration**: Built-in support for Avro schema registration, making it easy to include UUID64 in data streams (e.g., Kafka).

### Usage Example

```typescript
import UUID64 from '@sc-voice/nameforma/uuid64';

// Generate a new monotonic ID
const id = new UUID64();
console.log(id.base64); // e.g., "0PtBEiXO0086He8W1bcddW"

// Create an ID related to another (sharing random bits)
const relatedId = UUID64.createRelatedId(id);

// Parse from a string
const parsed = UUID64.fromString("0PtBEiXO0086He8W1bcddW");

// Validate format
const isValid = UUID64.validate(parsed.base64); // true
```
