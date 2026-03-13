# Task

## Overview

- Extends Forma with task-specific fields
- Manages task progress and duration as Rational numbers
- `toString()` formats task status with symbols (`.`, `>`, `✓`)
- `put()` and `patch()` methods for property updates

## Avro Schema

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

## Creation & Serialization Flow

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
