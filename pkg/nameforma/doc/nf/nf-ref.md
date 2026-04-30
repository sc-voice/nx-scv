# NAMEFORMA (NF) TASK & ACTION SYSTEM

This is the reference document 
for the Nameforma task management system used to 
coordinate work between Agents and Humans.

## Formas

Forma is an abstract Identifiable named object.
All manipulable objects in the nf task system are Formas.

The Forma for joint work is a **Task**.

- **World** Forma shared context for tasks in local folder (@.nameforma/world.json)
- **Task** contextually complete Forma that represents a high-level goal with: 
-- **Action** stateful Forma a specific piece of work within the task.
-- **Reference** Forma that is an named, annotated source reference

World, Task, Action and Reference instances are globally identifiable 
using UUID64 (@src/uuid64.ts)

### Task

- **name**: short descriptive name
- **summary**: extended description
- array of Actions ordered by time added
- array of References ordered by decreasing relevance

### Action 

- **name**: short descriptive name
- **summary**: extended description
- **status**: ActionStatus with sequential states:
-- **Req**: Enumerate and clarify what needs to be done.
-- **Spec**: Plan formal specifications and technical approaches together.
-- **Work**: Perform the required work using best practices.
-- **Test**: Verify that work meets specifications and existing standards.
-- **Manage**: A strategic decision point where the Agent consults with the Human in "Plan Mode".
-- **Done**: The stable, final state for an action.
- **statusNote**: (automatic) timestamp of most recent status change

Action status has a linear lifecycle. 
Unless otherwise specified, all transitions require Formal Consensus:

```
  req → spec → work → test → manage → done
```

### Reference 

- **name**: short descriptive name
- **summary**: extended description
- **relevance**: relevance to task (1:high, 0:no)
- **source**: URI to source

## CLI Usage

Agents must use the nf CLI to read/edit nf objects:

```bash
nf doc
nf -help task
nf -help action
nf -help reference
```



