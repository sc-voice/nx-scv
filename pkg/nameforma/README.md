# Nameforma Architecture

NameForma is world model for human/agentic use as a planning tool

## Primary Domain Components

### Identifiable
- Base class providing UUID64 generation and validation. 

### Forma
- Base class for identifiable named objects. 

### Task
- Extends Forma for tracking task progress and duration. See [task.md](task.md)

## Dependencies

```
External:
├── avro-js (Avro schema parsing/encoding)
└── @sc-voice/tools (Fraction, Text utilities)

Internal:
├── defines.mjs (Debug flags)
└── index.mjs (Public exports)
```
