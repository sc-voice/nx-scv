# Clock

## Overview

- Async generator-based timing control
- Tracks time-in and time-out for scheduling
- Supports start/stop and async iteration
- Used by Kafka1 Consumer for message polling

## Clock State Machine

```mermaid
stateDiagram-v2
    [*] --> Idle: new Clock()

    Idle --> Running: start()
    Running --> Polling: next() called
    Polling --> Idle_Wait: timeIn == timeOut
    Idle_Wait --> Polling: idle() completes,<br/>update(timestamp)
    Polling --> Running: timeIn > timeOut

    Running --> Stopped: stop()
    Stopped --> [*]

    note right of Idle
        Initial state
        referenceTime set
        idle function ready
    end note

    note right of Running
        _running = true
        _generator created
        _referenceBase set
    end note

    note right of Polling
        Async generator loop
        timeOut = timeIn
        yields timestamp
    end note

    note right of Idle_Wait
        timeIn == timeOut
        Waits in idle()
        ~500ms default
    end note
```
