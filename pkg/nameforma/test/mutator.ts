import { describe, it, expect } from '@sc-voice/vitest';
import {
  Mutator,
  Command,
  SetCommand,
  PushCommand,
  PopCommand,
} from '@sc-voice/nameforma';

describe('Command classes', () => {
  it('SetCommand stores id and value', () => {
    const id = 'test-id';
    const value = { name: 'Joe', age: 30 };
    const cmd = new SetCommand(id, value);

    expect(cmd.id).toBe(id);
    expect(cmd.value).toEqual(value);
    expect(cmd).toBeInstanceOf(Command);
  });

  it('PushCommand stores id and value', () => {
    const id = 'test-id';
    const value = { tags: 'new-tag' };
    const cmd = new PushCommand(id, value);

    expect(cmd.id).toBe(id);
    expect(cmd.value).toEqual(value);
    expect(cmd).toBeInstanceOf(Command);
  });

  it('PopCommand stores id and value', () => {
    const id = 'test-id';
    const value = { tags: -1 };
    const cmd = new PopCommand(id, value);

    expect(cmd.id).toBe(id);
    expect(cmd.value).toEqual(value);
    expect(cmd).toBeInstanceOf(Command);
  });
});

describe('Mutator.fromJson() — valid input', () => {
  it('parses $set operator', () => {
    const json = {
      id: 'entity-1',
      $set: { name: 'Joe' },
    };

    const mutator = Mutator.fromJson(json);
    expect(mutator.commands).toHaveLength(1);
    expect(mutator.commands[0]).toBeInstanceOf(SetCommand);
    expect(mutator.commands[0].id).toBe('entity-1');
    expect(mutator.commands[0].value).toEqual({ name: 'Joe' });
  });

  it('parses $push operator', () => {
    const json = {
      id: 'entity-1',
      $push: { tags: 'new-tag' },
    };

    const mutator = Mutator.fromJson(json);
    expect(mutator.commands).toHaveLength(1);
    expect(mutator.commands[0]).toBeInstanceOf(PushCommand);
    expect(mutator.commands[0].value).toEqual({ tags: 'new-tag' });
  });

  it('parses $pop operator', () => {
    const json = {
      id: 'entity-1',
      $pop: { tags: -1 },
    };

    const mutator = Mutator.fromJson(json);
    expect(mutator.commands).toHaveLength(1);
    expect(mutator.commands[0]).toBeInstanceOf(PopCommand);
    expect(mutator.commands[0].value).toEqual({ tags: -1 });
  });

  it('parses multiple operators in single JSON', () => {
    const json = {
      id: 'entity-1',
      $set: { name: 'Joe' },
      $push: { tags: 'tag1' },
      $pop: { items: 0 },
    };

    const mutator = Mutator.fromJson(json);
    expect(mutator.commands).toHaveLength(3);
    expect(
      mutator.commands.find((c) => c instanceof SetCommand),
    ).toBeDefined();
    expect(
      mutator.commands.find((c) => c instanceof PushCommand),
    ).toBeDefined();
    expect(
      mutator.commands.find((c) => c instanceof PopCommand),
    ).toBeDefined();
  });

  it('commands property is readonly', () => {
    const json = { id: 'e1', $set: { x: 1 } };
    const mutator = Mutator.fromJson(json);
    const original = mutator.commands;

    expect(() => {
      (mutator as any).commands = [];
    }).toThrow();

    expect(mutator.commands).toBe(original);
  });

  it('parses implicit $set field', () => {
    const json = {
      id: 'entity-1',
      name: 'Joe',
    };

    const mutator = Mutator.fromJson(json);
    expect(mutator.commands).toHaveLength(1);
    expect(mutator.commands[0]).toBeInstanceOf(SetCommand);
    expect(mutator.commands[0].value).toEqual({ name: 'Joe' });
  });

  it('merges implicit $set fields with explicit $set', () => {
    const json = {
      id: 'entity-1',
      $set: { a: 1 },
      b: 2,
      c: 3,
    };

    const mutator = Mutator.fromJson(json);
    expect(mutator.commands).toHaveLength(1);
    expect(mutator.commands[0]).toBeInstanceOf(SetCommand);
    expect(mutator.commands[0].value).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('parses implicit $set with other operators', () => {
    const json = {
      id: 'entity-1',
      $push: { tags: 'tag1' },
      name: 'Joe',
    };

    const mutator = Mutator.fromJson(json);
    expect(mutator.commands).toHaveLength(2);
    const setCmd = mutator.commands.find((c) => c instanceof SetCommand);
    const pushCmd = mutator.commands.find((c) => c instanceof PushCommand);
    expect(setCmd).toBeDefined();
    expect(pushCmd).toBeDefined();
    expect((setCmd as SetCommand).value).toEqual({ name: 'Joe' });
    expect((pushCmd as PushCommand).value).toEqual({ tags: 'tag1' });
  });
});

describe('Mutator.fromJson() — error cases', () => {
  it('throws on missing id', () => {
    const json = { $set: { name: 'Joe' } };
    expect(() => Mutator.fromJson(json)).toThrow('id field is required');
  });

  it('throws on falsy id', () => {
    const json = { id: '', $set: { name: 'Joe' } };
    expect(() => Mutator.fromJson(json)).toThrow('id field is required');
  });

  it('throws on null input', () => {
    expect(() => Mutator.fromJson(null)).toThrow(
      'input must be a non-null object',
    );
  });

  it('throws on non-object input', () => {
    expect(() => Mutator.fromJson('string')).toThrow(
      'input must be a non-null object',
    );
    expect(() => Mutator.fromJson(42)).toThrow(
      'input must be a non-null object',
    );
  });

  it('throws on unknown operator key starting with $', () => {
    const json = { id: 'e1', $unknown: { x: 1 } };
    expect(() => Mutator.fromJson(json)).toThrow(
      'unknown operator "$unknown"',
    );
  });

  it('throws on $pop with non-object value', () => {
    const json = { id: 'e1', $pop: 5 };
    expect(() => Mutator.fromJson(json)).toThrow(
      '$pop value must be an object',
    );
  });

  it('throws on $pop with non-number field value', () => {
    const json = { id: 'e1', $pop: { tags: 'not-a-number' } };
    expect(() => Mutator.fromJson(json)).toThrow(
      'expected number $pop.tags index: not-a-number',
    );
  });

  it('throws on $pop with array value', () => {
    const json = { id: 'e1', $pop: [1, 2, 3] };
    expect(() => Mutator.fromJson(json)).toThrow(
      '$pop value must be an object',
    );
  });

  it('throws on duplicate field between explicit and implicit $set', () => {
    const json = {
      id: 'e1',
      $set: { name: 'Alice' },
      name: 'Bob',
    };
    expect(() => Mutator.fromJson(json)).toThrow(
      'field "name" set both explicitly and implicitly',
    );
  });

  it('throws on unknown $ operator with implicit fields present', () => {
    const json = {
      id: 'e1',
      $unknown: { x: 1 },
      name: 'Joe',
    };
    expect(() => Mutator.fromJson(json)).toThrow(
      'unknown operator "$unknown"',
    );
  });
});
