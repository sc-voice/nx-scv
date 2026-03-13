# Rational

## Overview

- Extends Fraction from @sc-voice/tools
- Represents fractional values with units (e.g., "1/2 done", "10 s")
- Schema: numerator, denominator, units, isNull flag

## Avro Schema

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

## Features

1. **Fractional Values**
   - Inherits from `Fraction` class
   - Stores numerator and denominator separately
   - Supports standard fraction operations

2. **Units**
   - Attach units to fractional values
   - Examples: "s" (seconds), "done" (completion), etc.
   - Formatted in toString output

3. **Null State**
   - `isNull` flag indicates absence of value
   - Defaults to `false`
   - Used for optional/undefined rational values

## Usage Examples

- Task progress: `new Rational(3, 4, 'done')` → "3/4 done"
- Task duration: `new Rational(10, 1, 's')` → "10 s"
- Null value: `new Rational(null, 1, 's')` → isNull: true
