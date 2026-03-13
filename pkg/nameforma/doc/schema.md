# Schema

## Overview

- Avro schema registry and management
- Schema parsing via avro-js
- Converts JavaScript objects to Avro format
- Registers schemas with namespace tracking

## Features

1. **Schema Registry**
   - Static registry for all registered schemas
   - Namespace-aware schema management
   - Prevents duplicate schema registration

2. **Schema Parsing**
   - Uses avro-js to parse schema definitions
   - Supports nested schema references
   - Validates schema structure

3. **JavaScript to Avro Conversion**
   - `toAvro(jsObj, opts)` converts JS objects to Avro format
   - Uses `type.clone()` for encoding
   - Supports union wrapping

4. **Full Name Resolution**
   - Combines namespace and name
   - Format: `namespace.name` or just `name`
   - Used for schema lookups in registry
