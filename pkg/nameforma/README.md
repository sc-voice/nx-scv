# Nameforma Architecture

NameForma is world model for human/agentic use based on Kafka.

## Key Components

### Identifiable
- Base class providing UUID v7 generation and validation. See [identifiable.md](identifiable.md)

### Forma
- Base class for identifiable named objects. See [forma.md](forma.md)

### Task
- Extends Forma for tracking task progress and duration. See [task.md](task.md)

### Rational
- Represents fractional values with units. See [rational.md](rational.md)

### Clock
- Async generator-based timing control for scheduling and polling. See [clock.md](clock.md)

### Schema
- Avro schema registry and management. See [schema.md](schema.md)

### Kafka1 (Mock Kafka)
- In-memory Kafka implementation compatible with kafkajs API. See [kafka1.md](kafka1.md)

## Dependencies

```
External:
├── uuid (UUID v7 generation)
├── avro-js (Avro schema parsing/encoding)
└── @sc-voice/tools (Fraction, Text utilities)

Internal:
├── defines.mjs (Debug flags)
└── index.mjs (Public exports)
```
