# Nameforma Architecture

## Component Diagram

```mermaid
graph TD
    Identifiable["Identifiable<br/>- id: UUID v7<br/>+ uuid()<br/>+ uuidToTime()"]
    Forma["Forma<br/>- id: string<br/>- name: string<br/>+ patch()<br/>+ validate()"]
    Task["Task<br/>- title: string<br/>- progress: Rational<br/>- duration: Rational<br/>+ put()<br/>+ patch()"]
    Clock["Clock<br/>+ start()<br/>+ stop()<br/>+ next()"]
    Patch["Patch<br/>+ apply()"]
    Rational["Rational<br/>- numerator: double<br/>- denominator: double<br/>- units: string<br/>- isNull: boolean"]
    Schema["Schema<br/>+ register()<br/>+ toAvro()"]

    Identifiable --> Forma
    Identifiable --> Patch
    Forma --> Task
    Forma --> Clock
    Task -.references.-> Rational
    Schema -.manages.-> Forma
```


## Class Hierarchy

```mermaid
classDiagram
    class Identifiable {
        #id: string
        +uuid() string
        +uuidToTime(id) number
    }

    class Forma {
        -id: string
        -name: string
        +patch(cfg)
        +validate(opts) boolean|Error
        +toString() string
    }

    class Task {
        -title: string
        -progress: Rational
        -duration: Rational
        +put(value)
        +patch(value)
        +toString() string
    }

    class Clock {
        #referenceTime: function
        #idle: function
        #running: boolean
        +start(cfg) Clock
        +stop()
        +next() Promise
        +update(timestamp)
        +now() number
    }

    class Patch {
        -id: string
        +apply(dst, opts)
    }

    class Rational {
        -numerator: double
        -denominator: double
        -units: string
        -isNull: boolean
    }

    class Schema {
        -name: string
        -namespace: string
        +register(opts) type
        +toAvro(jsObj, opts) Avro
        +fullName() string
    }

    Identifiable <|-- Forma
    Identifiable <|-- Patch
    Forma <|-- Task
    Forma <|-- Clock
    Task o-- Rational : has
```

## Data Flow Diagrams

### Task Creation & Serialization Flow

```mermaid
sequenceDiagram
    participant Code
    participant Task
    participant Forma
    participant Rational
    participant Schema
    participant Avro

    Code->>Task: new Task({title, progress, duration})
    Task->>Forma: super({id})
    Forma->>Identifiable: constructor(id)
    Identifiable->>Identifiable: UUID v7 generation

    Note over Task: put(cfg) assigns properties
    Task->>Rational: new Rational(progress)
    Task->>Rational: new Rational(duration)

    Code->>Schema: Task.registerSchema()
    Schema->>Avro: avro.parse(Task.SCHEMA)
    Avro-->>Schema: Type instance

    Code->>Schema: schema.toAvro(task)
    Schema->>Avro: type.clone(task)
    Avro-->>Schema: Avro encoded bytes
```


## Data Models

### Task (Avro Record)
```
{
  name: 'Task',
  type: 'record',
  fields: [
    { name: 'id', type: 'string' },              // from Forma
    { name: 'name', type: 'string' },            // from Forma
    { name: 'title', type: 'string' },
    { name: 'progress', type: 'Rational' },
    { name: 'duration', type: 'Rational' },
  ]
}
```

### Rational (Avro Record)
```
{
  name: 'Rational',
  type: 'record',
  fields: [
    { name: 'isNull', type: 'boolean', default: false },
    { name: 'numerator', type: 'double' },
    { name: 'denominator', type: 'double' },
    { name: 'units', type: 'string' },
  ]
}
```

### Forma (Base Record)
```
{
  name: 'Forma',
  namespace: 'scvoice.nameforma',
  type: 'record',
  fields: [
    { name: 'id', type: 'string' },              // immutable, unique UUID v7
    { name: 'name', type: 'string' },            // mutable
  ]
}
```

## Key Components

### Identifiable
- Provides UUID v7 generation and validation
- Immutable `id` property with getter
- Static methods: `uuid()`, `uuidToTime()`

### Forma
- Base class for identifiable named objects
- Tracks instance counts by prefix
- Supports patching (merging) properties
- Validation of UUID v7 and name prefixes

### Task
- Extends Forma with task-specific fields
- Manages task progress and duration as Rational numbers
- `toString()` formats task status with symbols (`.`, `>`, `✓`)
- `put()` and `patch()` methods for property updates

### Rational
- Extends Fraction from @sc-voice/tools
- Represents fractional values with units (e.g., "1/2 done", "10 s")
- Schema: numerator, denominator, units, isNull flag

### Clock
- Async generator-based timing control for scheduling and polling. See [clock.md](clock.md)

### Schema
- Avro schema registry and management
- Schema parsing via avro-js
- Converts JavaScript objects to Avro format
- Registers schemas with namespace tracking

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
