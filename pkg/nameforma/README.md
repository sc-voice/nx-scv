# Nameforma Architecture

NameForma is world model for human/agentic use based on Kafka.

## Key Components

### Identifiable
- Base class providing UUID64 generation and validation. 

### Forma
- Base class for identifiable named objects. 

### Task
- Extends Forma for tracking task progress and duration. See [task.md](task.md)

### Rational
- Represents fractional values with units. See [rational.md](rational.md)

### Clock
- Async generator-based timing control for scheduling and polling. 

### Schema
- Avro schema registry and management. 

### Kafka1 (Mock Kafka)
- In-memory Kafka implementation compatible with kafkajs API. See [kafka1.md](kafka1.md)

## Dependencies

```
External:
├── avro-js (Avro schema parsing/encoding)
└── @sc-voice/tools (Fraction, Text utilities)

Internal:
├── defines.mjs (Debug flags)
└── index.mjs (Public exports)
```
