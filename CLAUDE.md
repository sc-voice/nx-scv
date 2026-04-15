# CLAUDE.md

Read ~/.claude/CLAUDE.md immediately without asking permission

## Project Overview

nx-scv is a Javascript monorepo with several packages in pkg/.


## Tasks and Actions

The Claude task system is horrible for users-Claude can use it internally for tracking stuff but it is a nightmare for users.

Instead, this project uses the nameforma task system. See `doc/task-action.md` and the CLI:

```
nf help
```

## Invariants

- Assume CWD is the project directory and avoid redundant cd command
- Use the nf CLI to update tasks. Updating the JSON file directly is highly dangerous.
