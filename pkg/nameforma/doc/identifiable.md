# Identifiable

## Overview

- Provides UUID v7 generation and validation
- Immutable `id` property with getter
- Static methods: `uuid()`, `uuidToTime()`

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

    Identifiable <|-- Forma
    Identifiable <|-- Patch
    Forma <|-- Task
    Forma <|-- Clock
```

## Features

1. **Automatic UUID v7 Generation**
   - Creates time-ordered UUIDs using `uuidV7()`
   - Immutable private field `#id`
   - Exposed via enumerable getter property

2. **UUID Validation**
   - Validates UUID format
   - Verifies UUID version 7

3. **Time Extraction**
   - `uuidToTime(id)` converts UUID v7 to timestamp
   - Extracts first 12 hex digits as milliseconds
