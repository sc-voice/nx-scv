import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Admin, Kafka, Producer, Consumer, logLevel } from 'kafkajs';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { World } from '../src/world.js';
import { FormaList, type IFormaItem } from '../src/forma-list.js';
import { Identifiable } from '../src/identifiable.js';
import UUID64 from '../src/uuid64.js';

/**
 * TestItem - Simple FormaItem for integration testing
 */
class TestItem extends Identifiable implements IFormaItem {
  name: string;

  constructor(cfg: any = {}) {
    super(cfg?.id);
    this.name = cfg.name || 'test';
  }

  toJSON(): any {
    return {
      id: this.id.base64,
      name: this.name,
    };
  }
}

describe('Kafka Integration Tests', () => {
  let kafka: Kafka;
  let admin: Admin;
  let producer: Producer;
  let consumer: Consumer;
  let world: World;
  let topicName: string;
  let tmpDir: string;

  beforeAll(async () => {
    // Create temp directory for test world
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nameforma-test-'));
    const worldPath = path.join(tmpDir, '.nameforma');

    // Create World with unique ID
    world = new World(worldPath);
    topicName = `world-${world.id.base64}`;

    // Initialize Kafka client
    kafka = new Kafka({
      clientId: 'nameforma-integration-test',
      brokers: ['localhost:9092'],
      logLevel: logLevel.ERROR,
    });

    admin = kafka.admin();
    producer = kafka.producer();
    consumer = kafka.consumer({ groupId: `nameforma-test-${world.id.base64}` });

    // Connect clients
    await admin.connect();
    await producer.connect();
    await consumer.connect();

    // Create topic
    try {
      await admin.createTopics({
        topics: [
          {
            topic: topicName,
            numPartitions: 1,
            replicationFactor: 1,
          },
        ],
        validateOnly: false,
      });
    } catch (error: any) {
      // Topic might already exist
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }, 30000);

  afterAll(async () => {
    // Cleanup
    await consumer.disconnect();
    await producer.disconnect();

    try {
      await admin.deleteTopics({ topics: [topicName], timeout: 5000 });
    } catch (error) {
      // Ignore cleanup errors
    }

    await admin.disconnect();

    // Remove temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('World should have unique ID for Kafka topic naming', () => {
    expect(world.id).toBeDefined();
    expect(world.id).toBeInstanceOf(UUID64);
    expect(topicName).toMatch(/^world-/);
    expect(topicName).toContain(world.id.base64);
  });

  it('should produce FormaList to Kafka', async () => {
    const itemsArray: TestItem[] = [];
    const list = new FormaList(itemsArray, TestItem, world.id);

    // Add test items
    const item1 = list.addItem({ name: 'item1' });
    const item2 = list.addItem({ name: 'item2' });

    expect(list.size).toBe(2);

    // Serialize list
    const message = {
      worldId: world.id.base64,
      items: list.items.map((item) => item.toJSON()),
    };

    // Produce to Kafka
    await producer.send({
      topic: topicName,
      messages: [
        {
          key: world.id.base64,
          value: JSON.stringify(message),
        },
      ],
    });

    expect(message.items).toHaveLength(2);
    expect(message.items[0].name).toBe('item1');
    expect(message.items[1].name).toBe('item2');
  });

  it('should perform full round-trip with replicating consumer verification', async () => {
    const itemsArray: TestItem[] = [];
    const list = new FormaList(itemsArray, TestItem, world.id);

    // Create test items
    const item1 = list.addItem({ name: 'round-trip-1' });
    const item2 = list.addItem({ name: 'round-trip-2' });

    const originalData = {
      worldId: world.id.base64,
      items: list.items.map((item) => item.toJSON()),
    };

    // Produce message
    await producer.send({
      topic: topicName,
      messages: [
        {
          key: world.id.base64,
          value: JSON.stringify(originalData),
        },
      ],
    });

    // Setup consumer
    let receivedMessage: any = null;

    await consumer.subscribe({ topic: topicName, fromBeginning: true });

    const messageReceived: Promise<void> = new Promise((resolve) => {
      consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          if (message.value && message.key?.toString() === world.id.base64) {
            const data = JSON.parse(message.value.toString());
            if (data.items[0]?.name === 'round-trip-1') {
              receivedMessage = data;
              resolve();
            }
          }
        },
      });
    });

    // Wait for message with timeout
    await Promise.race([
      messageReceived,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Consumer timeout')), 10000)
      ),
    ]);

    // Verify round-trip
    expect(receivedMessage).toBeDefined();
    expect(receivedMessage.worldId).toBe(world.id.base64);
    expect(receivedMessage.items).toHaveLength(2);

    // Verify item integrity
    const received1 = receivedMessage.items.find(
      (item: any) => item.name === 'round-trip-1'
    );
    const received2 = receivedMessage.items.find(
      (item: any) => item.name === 'round-trip-2'
    );

    expect(received1).toBeDefined();
    expect(received1.id).toBe(item1.id.base64);
    expect(received2).toBeDefined();
    expect(received2.id).toBe(item2.id.base64);

    // Replicate: deserialize and verify data matches original
    const replicatedArray: TestItem[] = [];
    const replicatedList = new FormaList(
      replicatedArray,
      TestItem,
      UUID64.fromString(receivedMessage.worldId)
    );

    for (const itemData of receivedMessage.items) {
      const item = new TestItem({
        id: itemData.id,
        name: itemData.name,
      });
      expect(item.id.base64).toBe(itemData.id);
      expect(item.name).toBe(itemData.name);
    }

    expect(replicatedList.size).toBe(0); // Empty until items added
  });

  it('World.fromPath should create persistent world with stable ID', () => {
    const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'world-persist-'));
    const worldPath = path.join(testDir, '.nameforma');

    // Create world via fromPath
    const world1 = World.fromPath(worldPath);
    const id1 = world1.id.base64;

    // Load same world again
    const world2 = World.fromPath(worldPath);
    const id2 = world2.id.base64;

    // IDs should match (persistent)
    expect(id1).toBe(id2);
    expect(world2.worldPath).toBe(worldPath);

    // Verify world.json exists
    const worldFile = path.join(worldPath, 'world.json');
    expect(fs.existsSync(worldFile)).toBe(true);

    // Cleanup
    fs.rmSync(testDir, { recursive: true, force: true });
  });
});
