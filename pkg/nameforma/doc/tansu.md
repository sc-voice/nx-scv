# Tansu Local Kafka Setup

This document describes the local Kafka setup using Tansu for nameforma integration testing.

## Overview

Tansu is a lightweight Kafka-compatible broker written in Rust with pluggable storage backends (SQLite, PostgreSQL, S3, memory). It's used for local development and integration testing, providing a simple way to test Kafka event emission patterns without requiring a full Kafka cluster.

## Architecture

- **World ID**: Each World instance extends Identifiable and has a unique UUID64 id
- **Topic Naming**: Topics use the pattern `world-${world.id.base64}`
- **Data Storage**: Tansu uses SQLite backend stored in `local/tansu-data/tansu.db`
- **Port**: Tansu runs on port 9092 (standard Kafka port, default)
- **Process Management**: Runs as background process with PID stored in `local/tansu.pid`

## Prerequisites

Tansu requires Rust/Cargo to be installed:

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Restart terminal to update PATH
# Verify installation
cargo --version
```

## Setup

### 1. Install Tansu

```bash
cd pkg/nameforma
npm run tansu:install
```

This command:
- Checks for Cargo installation
- Runs `cargo install tansu --features libsql` (SQLite support)
- Verifies tansu binary is in PATH
- Creates `local/tansu-data` directory

Installation takes several minutes as Cargo compiles from source.

### 2. Start Tansu Broker

```bash
npm run tansu:start
```

This command:
- Checks if Tansu is already running (idempotent)
- Starts Tansu in background: `tansu --storage-engine=sqlite://local/tansu-data/tansu.db`
- Saves PID to `local/tansu.pid`
- Logs output to `local/tansu.log`
- Waits for port 9092 to be ready

### 3. Stop Tansu Broker

```bash
npm run tansu:stop
```

This command:
- Reads PID from `local/tansu.pid`
- Sends graceful shutdown signal
- Waits up to 10 seconds
- Force kills if necessary

### 4. Run Integration Tests

```bash
npm run test:integration
```

This command:
- Automatically starts Tansu if not running (via `tansu:start`)
- Builds the project
- Runs only `*.integration.ts` test files
- Unit tests (`npm test`) exclude integration tests by default

## World Serialization

World instances are serializable with persistent IDs:

```typescript
import { World } from '@sc-voice/nameforma';

// Load or create world with persistent ID
const world = World.fromPath('/path/to/.nameforma');

// World ID is used for Kafka topic naming
const topicName = `world-${world.id.base64}`;

// World persists to .nameforma/world.json
// Subsequent calls to World.fromPath() restore same ID
```

## Integration Test Example

See `test/kafka.integration.ts` for full examples. Basic pattern:

```typescript
import { World } from '../src/world.js';
import { FormaCollection } from '../src/forma-collection.js';
import { Kafka } from 'kafkajs';

// Create test world with unique ID
const world = new World('/tmp/test-world');
const topicName = `world-${world.id.base64}`;

// Create collection and serialize
const collection = new FormaCollection(world.id, ItemClass);
const item = collection.addItem({ name: 'test' });

const message = {
  worldId: world.id.base64,
  items: collection.items().map(item => item.toJSON()),
};

// Produce to Kafka
await producer.send({
  topic: topicName,
  messages: [{
    key: world.id.base64,
    value: JSON.stringify(message),
  }],
});

// Consumer verifies round-trip
// See test/kafka.integration.ts for full example
```

## FormaCollection Serialization

FormaCollection items must implement `toJSON()` for Kafka serialization:

```typescript
class MyItem extends Identifiable implements IFormaItem {
  name: string;

  toJSON() {
    return {
      id: this.id.base64,  // UUID64 serialized as base64 string
      name: this.name,
    };
  }

  static createForParent(parentId: UUID64, cfg: any): MyItem {
    return new MyItem({ ...cfg, id: cfg.id || new UUID64() });
  }
}
```

## Production Migration

This setup is for local development only. For production:

1. Replace Tansu with production Kafka cluster
2. Update broker configuration in kafkajs client
3. Consider schema registry for Avro schemas
4. Add authentication (SASL/SSL) as needed

The `kafka:` npm script prefix is reserved for future production setup scripts.

## Troubleshooting

### Tansu won't start

Check if port 9092 is already in use:
```bash
lsof -i :9092
```

If another process is using the port, stop it or configure Tansu to use a different port (see Tansu documentation for listener configuration).

### Integration tests timeout

Verify Tansu is running:
```bash
ps aux | grep tansu
# Or check PID file
cat local/tansu.pid
```

Check Tansu logs for errors:
```bash
tail -f local/tansu.log
```

### Tansu won't stop

Manually kill the process:
```bash
# Find PID
cat local/tansu.pid
# Kill process
kill $(cat local/tansu.pid)
# Or force kill
pkill -9 tansu
```

### Cargo/Rust not installed

Install Rust toolchain:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

After installation, restart your terminal and run `npm run tansu:install` again.

### Tansu binary not in PATH

Cargo installs binaries to `~/.cargo/bin`. Ensure this is in your PATH:
```bash
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc  # or ~/.zshrc
source ~/.bashrc  # or ~/.zshrc
```

## References

- Tansu: https://tansu.io
- Tansu GitHub: https://github.com/tansu-io/tansu
- Tansu Docs: https://docs.tansu.io
- KafkaJS: https://kafka.js.org/
- FormaCollection: See `src/forma-collection.ts`
- World: See `src/world.ts`
