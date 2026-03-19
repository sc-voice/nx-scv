# NameForma CLI

Command-line interface for NameForma package. Built with Commander.js.

## Installation

```bash
npm install
```

## Usage

### Via bin executable
```bash
nameforma [command] [options]
```

### Via node directly
```bash
node bin/nameforma.mjs [command] [options]
```

### Via npm script (requires -- before arguments)
```bash
npm run cli -- [command] [options]
```

**Note:** When using `npm run cli`, you must use `--` to separate npm options from CLI arguments:
```bash
npm run cli -- task create --title "My Task"
```

## Commands

### task - Manage tasks

#### task create
Create a new task.

```bash
nameforma task create --title "My Task" [options]
```

Options:
- `-t, --title <title>` (required) - Task title
- `-n, --name <name>` - Task name (auto-generated if not provided)
- `-p, --progress <progress>` - Task progress as fraction (default: 0/1)
- `-d, --duration <duration>` - Task duration as fraction (e.g., 5/60)

Examples:
```bash
nameforma task create --title "Cook egg"
nameforma task create --title "Weekly report" --progress 1/3 --duration 5/60
nameforma task create -t "Fix bug" -n "bug-123" -p 0/1
```

#### task list
List all tasks created in current session.

```bash
nameforma task list
```

#### task show
Show details of a specific task.

```bash
nameforma task show <task-id>
```

#### task update
Update task properties.

```bash
nameforma task update <task-id> [options]
```

Options:
- `-t, --title <title>` - Update task title
- `-p, --progress <progress>` - Update progress (e.g., 2/3)
- `-d, --duration <duration>` - Update duration

Examples:
```bash
nameforma task update abc123 --title "New title" --progress 1/3
```

#### task delete
Delete a task.

```bash
nameforma task delete <task-id>
```

### forma - Manage formas

Formas are named identifiable objects that can store custom properties.

#### forma create
Create a new forma.

```bash
nameforma forma create --name <name> [--prop key=value ...]
```

Options:
- `-n, --name <name>` (required) - Forma name
- `--prop <key=value>` - Custom properties (repeatable)

Examples:
```bash
nameforma forma create --name "my-forma"
nameforma forma create --name "project-x" --prop version=1.0 --prop owner=alice
```

#### forma list
List all formas created in current session.

```bash
nameforma forma list
```

#### forma show
Show forma details.

```bash
nameforma forma show <forma-id>
```

#### forma update
Update forma properties.

```bash
nameforma forma update <forma-id> [options]
```

Options:
- `-n, --name <name>` - Update name
- `--prop <key=value>` - Update properties (repeatable)

Examples:
```bash
nameforma forma update abc123 --name "new-name" --prop version=2.0
```

#### forma delete
Delete a forma.

```bash
nameforma forma delete <forma-id>
```

### schema - Manage Avro schemas

#### schema list
List all registered Avro schemas.

```bash
nameforma schema list
```

#### schema show
Show schema details.

```bash
nameforma schema show <schema-name>
```

#### schema info
Display schema registry information.

```bash
nameforma schema info
```

## Global Options

- `-d, --debug` - Enable debug output
- `-h, --help` - Show help for command

## Examples

### Complete workflow

```bash
# Create a task
nameforma task create --title "Build feature X" --progress 0/3

# Create another task
nameforma task create --title "Review PR" --name "code-review" --progress 1/1

# List tasks
nameforma task list

# Update task progress
nameforma task update <task-id> --progress 2/3

# Create a forma for project metadata
nameforma forma create --name "project-metadata" --prop version=1.0 --prop team=backend

# List all formas
nameforma forma list

# Check schema registry
nameforma schema info
```

## Notes

1. **Session storage** - Tasks and formas are stored in memory during CLI session. They are not persisted.
2. **Rational values** - Progress and duration use rational number format (numerator/denominator).
3. **UUID64** - All objects receive unique UUID64 identifiers.
4. **Debug mode** - Use `-d` flag to see detailed debug output.

See: bin/nameforma.mjs, src/cli/commands/
