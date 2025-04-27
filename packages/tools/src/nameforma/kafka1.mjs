import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;
import { Unicode } from '../text/unicode.mjs';
const { CHECKMARK: OK } = Unicode;
import { DBG } from '../defines.mjs';

/*
 * Kafka1 is a single cluster, single node, single partition,
 * in-memory, local implementation of Kafka that can be used
 * to test application logic that uses Kafka protocols.
 *
 * Kafka1 uses a subset of kafkajs api and can be directly
 * replaced with a kafkajs instance.
 */
const SINGLETON_PARTITION = 0; // multiple partitions not supported
const SINGLETON_NODE_ID = '123'; // multiple brokers are not supported
const CLIENT_ID = 'kafka1';
const NO_TOPIC = 'no-topic';

let _consumerCount = 0;
let _producerCount = 0;
let ROLE_CONSTRUCTOR = false;

class Timestamp {
  // Does Kafka REALLY store timestamps as strings???
  static asDate(ts) {
    return new Date(ts);
  }

  static now() {
    return Date.now();
  }
}

class Role {
  constructor(opts = {}) {
    let { tla = 'tla?', kafka } = opts;
    const msg = `${tla}.r2e.ctor`;

    let warn;
    if (!ROLE_CONSTRUCTOR) {
      warn = `${msg} private ctor!`;
    } else if (kafka == null) {
      warn = `${msg} kafka?`;
    }
    if (warn) {
      cc.bad1(msg - 1, warn);
      throw new Error(warn);
    }

    this.tla = tla;
    this.kafka = kafka;
    this.connections = 0;
    this.created = Date.now();
  }

  async connect() {
    const { tla } = this;
    const msg = `${tla}.connect`;
    const dbg = DBG.K3A_CONNECT;
    this.connections++;

    dbg && cc.ok1(msg + 9.1, 'connections:', this.connections);
    //return this; // WARNING: kafkajs does not chain
  }

  async disconnect() {
    const { tla } = this;
    const msg = `${tla}.disconnect`;
    const dbg = DBG.K3A_DISCONNECT;
    if (this.connections > 0) {
      this.connections--;
      dbg && cc.ok1(msg + 9.1, 'connections:', this.connections);
    } else {
      cc.bad1(msg - 9.2, 'connections:', this.connections);
      throw new Error(msg, 'no connections?');
    }
  }
}

export class Topic {
  constructor(cfg = {}) {
    let { name = NO_TOPIC, created = Date.now() } = cfg;

    this.name = name;
    this.created = created;
    this.partitions = [
      {
        partitionId: SINGLETON_PARTITION,
        _messages: [],
      },
    ];
  }
}

export class Message {
  constructor(cfg = {}) {
    let {
      key = 'no-key',
      value = null,
      timestamp = Timestamp.now(),
      headers = null,
      partition,
    } = cfg;

    if (partition == null) {
      partition = Message._partitionOfKey(key);
    }

    if (
      value !== null &&
      !(value instanceof Buffer) &&
      typeof value !== 'string'
    ) {
      throw new Error(`${msg} value?`);
    }

    Object.assign(this, { key, value, headers, timestamp, partition });
  }

  static _partitionOfKey(key) {
    // Kafka assigns partition by hash of key for scalability
    // and parallel processing. Since Kafka1 doesn't care about
    // the above, we only use one partition.
    return SINGLETON_PARTITION;
  }
} // Message

export class _Runner {
  constructor(cfg = {}) {
    const msg = 'r4r.ctor';
    let {
      autoCommit = true,
      consumer,
      eachBatch,
      eachMessage,
      msSleep = 0,
      onCrash,
    } = cfg;

    if (!consumer) {
      throw new Error(`${msg} consumer?`);
    }
    if (!autoCommit) {
      throw new Error(`${msg} autoCommit TBD`);
    }
    if (eachBatch) {
      throw new Error(`${msg} eachBatch TBD`);
    }

    this.iterations = 0;
    this.running = false;
    Object.assign(this, {
      autoCommit,
      consumer,
      eachBatch,
      eachMessage,
      msSleep,
      onCrash,
    });
  }

  async start() {
    const msg = 'r4r.start';
    const dbg = DBG.K3A_R4R_RUNNING;
    let { consumer, eachMessage, msSleep } = this;

    if (this.running) {
      return;
    }
    this.running = true;
    dbg && cc.ok(msg + 1, 'running');

    let crashed = false;

    while (this.running) {
      try {
        this.iterations++;
        await consumer._processConsumer({ eachMessage });
        msSleep &&
          (await new Promise((res) => setTimeout(() => res(), msSleep)));
        dbg && cc.ok(msg, 'iterations:', this.iterations);
      } catch (e) {
        await this.stop();
        cc.bad1(`${msg} CRASH`, e.message);
        crashed = true;
        this.onCrash && this.onCrash(e);
      }
    }
    dbg && !crashed && cc.ok1(msg + OK, 'stopped');
  } // r4r.start

  async stop() {
    const msg = 'rfr.stop';
    const dbg = DBG.K3A_R4R_RUNNING;
    this.running = false;
    dbg && cc.ok1(msg + OK, 'stopped');
  }
} // _Runner

class ConsumerGroup {
  constructor(cfg = {}) {
    const msg = 'c11p.ctor';
    let {
      kafka,
      groupId = 'no-group-id',
      protocolType = 'consumer',
    } = cfg;

    Object.assign(this, { groupId, kafka }, cfg);
    Object.defineProperty(this, '_groupOffsetsetsMap', {
      value: {}, // hack for mock kafka
    });
    Object.defineProperty(this, '_consumers', {
      value: [],
    });
  }

  _topics() {
    return Object.keys(this._groupOffsetsetsMap);
  }

  _offsets() {
    return Object.values(this._groupOffsetsetsMap);
  }
} // ConsumerGroup

class GroupOffsets {
  constructor(cfg = {}) {
    const msg = 'g10s.ctor';
    let { topic, fromBeginning = false } = cfg;
    let partitions = topic.partitions.map((p, i) => {
      let offset = fromBeginning ? 0 : p._messages.length;
      return { partition: i, offset };
    });

    Object.assign(this, { topic: topic.name, partitions });
  }
} // GroupOffsets

export class Consumer extends Role {
  constructor(cfg = {}) {
    const msg = 'c6r.ctor';
    const dbg = DBG.K3A_CTOR || DBG.K3A_C6R_CTOR;
    const {
      kafka,
      groupId = 'no-group-id',
      heartbeatInterval = 3000, // ms
      sessionTimeout = 30000, // ms
    } = cfg;
    super({ tla: 'c6r', kafka });

    Object.assign(this, {
      groupId,
      heartbeatInterval,
      sessionTimeout,
    });
    let group = this._consumerGroup();
    group._consumers.push(this);
    _consumerCount++;
    Object.defineProperty(this, '_id', {
      value: `C6R-${('' + _consumerCount).padStart(3, '0')}`,
    });
    Object.defineProperty(this, '_runner', {
      writable: true,
      value: null,
    });

    this.eachMessage = null;

    dbg && cc.ok1(msg + OK, this._id, groupId);
  } // c6r.ctor

  get running() {
    let { _runner } = this;
    return _runner && _runner.running;
  }

  _consumerGroup() {
    let { kafka, groupId } = this;
    return kafka._groupOfId(groupId);
  }

  async subscribe(cfg = {}) {
    const msg = 'c6r.subscribe';
    const dbg = DBG.K3A_SUBSCRIBE;
    let { topics = [], fromBeginning = false } = cfg;
    const { kafka, groupId } = this;
    const group = this._consumerGroup();
    const { _groupOffsetsetsMap } = group;
    let subscribed = 0;
    for (let i = 0; i < topics.length; i++) {
      let topicName = topics[i];
      let topic = kafka._topicOfName(topicName);
      let g10s = _groupOffsetsetsMap[topicName];
      if (g10s) {
        dbg > 1 && cc.ok(msg + 2.1, groupId + '=:', topicName);
      } else {
        g10s = new GroupOffsets({ topic, fromBeginning });
        _groupOffsetsetsMap[topicName] = g10s;

        subscribed++;
        dbg > 1 &&
          cc.ok(
            msg + 2.2,
            groupId + '+:',
            topicName,
            JSON.stringify(_groupOffsetsetsMap),
          );
      }
    }

    dbg &&
      cc.ok1(msg + OK, `${groupId}:`, JSON.stringify(group._topics()));

    //return this; // WARNING: kafkajs does not chain
  } // subscribe

  async heartbeat() {
    const msg = 'c6r.heartbeat';
    cc.fyi(msg, Date.now());
  }

  async pause() {
    const msg = 'c6r.pause';
    cc.fyi(msg);
  }

  async _processConsumer(cfg = {}) {
    const msg = 'c6r._processConsumer';
    const dbg = DBG.K3A_PROCESS_CONSUMER;
    let { kafka } = this;
    let group = this._consumerGroup();
    let { eachMessage } = cfg;
    let { _groupOffsetsetsMap } = group;

    let committed = 0;
    for (const offsets of group._offsets()) {
      let { topic: topicName, partitions } = offsets;
      let topic = kafka._topicOfName(topicName);
      for (let i = 0; i < partitions.length; i++) {
        let { offset } = partitions[i];
        let messages = topic.partitions[i]._messages;
        let message = messages[offset];
        if (message) {
          dbg > 1 && cc.fyi(msg, `${topicName}.${i}:`, message);
          await eachMessage({
            topic: topicName,
            partition: i,
            message,
            heartbeat: this.heartbeat,
            pause: this.pause,
          });
          partitions[i].offset++; // commit
          committed++;
        }
      }
    }

    dbg && cc.ok1(msg + OK, this._id, 'committed:', committed);
    return { committed };
  }

  async run(cfg = {}) {
    const msg = 'c6r.run';
    const dbg = DBG.K3A_RUN;
    let { kafka, _runner } = this;
    if (_runner) {
      throw new Error(`${msg} _runner already exists`);
    }
    let { eachMessage, _msSleep } = cfg;
    if (eachMessage == null) {
      cc.bad1(msg, 'eachMessage?');
      throw new Error(`${msg} eachMessage?`);
    }
    this._runner = new _Runner({
      eachMessage,
      consumer: this,
      msSleep: _msSleep,
    });

    let promise = this._runner.start(); // do not await!
    dbg && cc.ok1(msg + ok, 'started');

    return promise;
  }

  async stop() {
    this._runner && this._runner.stop();
  }
} // Consumer

export class Producer extends Role {
  constructor(cfg = {}) {
    const msg = 'p6r.ctor';
    const dbg = DBG.K3A_CTOR || DBG.K3A_P6R_CTOR;
    let { kafka } = cfg;
    super({ tla: 'p6r', kafka });

    _producerCount++;
    Object.defineProperty(this, '_id', {
      value: `P6R-${('' + _producerCount).padStart(3, '0')}`,
    });
    dbg && cc.ok1(msg, this._id);
  }

  async send(request = {}) {
    const msg = 'p6r.send';
    const dbg = DBG.K3A_SEND;
    let { kafka } = this;
    let {
      topic: topicName = NO_TOPIC,
      messages = [],
      timestamp = Timestamp.now(),
    } = request;

    let topic = kafka._topicOfName(topicName);
    for (let i = 0; i < messages.length; i++) {
      let message = messages[i];
      let partitionId = Message._partitionOfKey(message.key);
      let partition = topic.partitions[partitionId];
      if (message.timestamp == null) {
        message.timestamp = timestamp;
      }
      partition._messages.push(message);
      if (dbg > 1) {
        let ts = Timestamp.asDate(timestamp).toLocaleTimeString();
        cc.ok(
          msg,
          ts,
          `${topicName}.${partitionId}`,
          message.key + ':',
          message.value,
        );
      }
    }

    if (dbg) {
      let ts = Timestamp.asDate(timestamp).toLocaleTimeString('en-US', {
        hour12: false,
      });
      cc.ok1(
        msg + OK,
        this._id,
        ts,
        topicName,
        'messages:',
        messages.length,
      );
    }
  } // send
} // Producer

export class Admin extends Role {
  constructor(cfg = {}) {
    let { kafka } = cfg;
    super({ tla: 'a3n', kafka });
    const msg = 'p6r.ctor';
    const dbg = DBG.P6R_CTOR;
    dbg && cc.ok1(msg);
  }

  async listGroups() {
    const msg = 'k3a.listGroups';
    const dbg = DBG.K3A_LIST_GROUPS;
    let { kafka } = this;
    let { _groupMap } = kafka;
    return Object.keys(_groupMap).map((groupId) => {
      let group = kafka._groupOfId(groupId);
      let { protocolType } = group;
      return {
        groupId,
        protocolType,
      };
    });
  }

  async listTopics() {
    const msg = 'a3n.listTopics';
    let { _topicMap } = this.kafka;

    return Object.keys(_topicMap);
  }

  async describeGroups(groupIds) {
    const msg = 'k3a.describeGroups';
    const dbg = DBG.K3A_DESCRIBE_GROUPS;
    let { kafka } = this;
    let { _groupMap } = kafka;

    if (groupIds == null) {
      groupIds = Object.keys(_groupMap);
    }

    let result = [];
    for (const groupId of groupIds) {
      let group = kafka._groupOfId(groupId);
      result.push({
        errorCode: 0,
        groupId,
        protocolType: 'consumer',
        state: 'stable',
      });
    }

    return result;
  }

  async fetchOffsets(args = {}) {
    const msg = 'a3n.fetchOffsets';
    const dbg = DBG.K3A_FETCH_OFFSETS;
    const { kafka } = this;
    let { groupId, topics } = args;

    let group = kafka._groupOfId(groupId);
    let { _groupOffsetsetsMap } = group;
    if (topics == null) {
      topics = Object.keys(_groupOffsetsetsMap);
    }
    let offsets = topics.reduce((a, topicName) => {
      let g10s = _groupOffsetsetsMap[topicName];
      g10s && a.push(g10s);
      return a;
    }, []);
    cc.ok1(msg + OK, groupId, JSON.stringify(offsets));

    return offsets;
  }
} // Admin

export class KRaftNode {
  // i.e., broker
  constructor(cfg = {}) {
    const msg = 'k7e.ctor';
    let { nodeId = SINGLETON_NODE_ID } = cfg;

    Object.assign(this, cfg, {
      nodeId,
    });
    Object.defineProperty(this, '_groupMap', {
      value: {}, // hack for mock kafka
    });
    Object.defineProperty(this, '_topicMap', {
      value: {}, // hack for mock kafka
    });
  }

  _topicOfName(topicName) {
    const msg = 'k7e._topicOfName';
    const dbg = DBG.K3A_TOPIC_OF_NAME;
    let { _topicMap } = this;
    let topic = _topicMap[topicName];
    if (topic == null) {
      topic = new Topic({ name: topicName });
      _topicMap[topicName] = topic;
      dbg && cc.ok1(msg + 9.1, 'created:', topicName);
    } else {
      dbg && cc.ok1(msg + 9.2, 'existing:', topicName);
    }
    return topic;
  }

  _groupOfId(groupId, opts = {}) {
    const msg = 'k7e._groupOfId';
    const dbg = DBG.K3A_GROUP_OF_ID;
    let { _groupMap } = this;
    let { protocolType = 'consumer' } = opts;
    let group = _groupMap[groupId];
    if (group == null) {
      // auto create
      group = new ConsumerGroup({ kafka: this, groupId, protocolType });
      _groupMap[groupId] = group;
      dbg && cc.ok1(msg + OK + '+', groupId);
    } else {
      dbg && cc.ok1(msg + OK + '=', groupId);
    }
    return group;
  }
} // KRaftNode

export class _MessageClock {
  static #privateCtor = false;
  constructor(cfg = {}) {
    const msg = 'm10k.ctor';
    if (!_MessageClock.#privateCtor) {
      throw Error(`${msg} create()!`);
    }
    let { msIdle = 10 } = cfg;
    this.running = false;
    this.timeIn = 0;
    this.timeOut = 0;
    this.msIdle = msIdle;
  }

  static create(cfg) {
    _MessageClock.#privateCtor = true;
    let clock = new _MessageClock(cfg);
    _MessageClock.#privateCtor = false;
    clock.generator = _MessageClock.#createGenerator(clock);
    return clock;
  }

  static async *#createGenerator(clock) {
    clock.running = true;
    while (clock.running) {
      await new Promise((res) =>
        setTimeout(() => res(), clock.msIdle),
      );
      if (clock.timeIn !== clock.timeOut) {
        clock.timeOut = clock.timeIn;
        yield clock.timeOut;
      }
    }
    return clock;
  }

  async next() {
    const msg = 'm10k.next';
    const dbg = DBG.K3A_MESSAGE_CLOCK;
    let { generator } = this;
    let result = await (generator && generator.next());
    dbg && cc.ok1(msg+OK, result);
    return result;
  }

  stop() {
    this.running = false;
    this.generator = null;
  }

  update(timestamp=Date.now()) {
    this.timeIn = timestamp;
  }
} // _MessageClock

export class Kafka1 extends KRaftNode {
  constructor(cfg = {}) {
    super();
    const msg = 'k3a.ctor';
    const dbg = DBG.K3A_CTOR;
    let { clientId = 'no-client-id' } = cfg;

    Object.assign(this, { clientId });

    dbg && cc.ok1(msg);
  }

  consumer(cfg = {}) {
    ROLE_CONSTRUCTOR = true;
    let role = new Consumer(Object.assign({ kafka: this }, cfg));
    ROLE_CONSTRUCTOR = false;
    return role;
  }

  producer(cfg = {}) {
    ROLE_CONSTRUCTOR = true;
    let role = new Producer(Object.assign({ kafka: this }, cfg));
    ROLE_CONSTRUCTOR = false;
    return role;
  }

  admin(cfg = {}) {
    ROLE_CONSTRUCTOR = true;
    let role = new Admin(Object.assign({ kafka: this }, cfg));
    ROLE_CONSTRUCTOR = false;
    return role;
  }
} // Kafka1
