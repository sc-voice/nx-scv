import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;
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

let ROLE_CONSTRUCTOR = false;

class Timestamp {
  // Does Kafka REALLY store timestamps as strigs???
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
    let { name = 'no-topic', created = Date.now() } = cfg;

    this.name = name;
    this.created = created;
    this.partitions = [
      {
        partitionId: SINGLETON_PARTITION,
      },
    ];

    Object.defineProperty(this, '_messages', {
      writable: true,
      value: [], // hack for mock kafka
    });
    Object.defineProperty(this, '_consumers', {
      value: [], // hack for mock kafka
    });
  }
}

export class Message {
  constructor(cfg = {}) {
    let {
      key = 'no-key',
      value = null,
      timestamp = Timestamp.now(),
      headers = null,
    } = cfg;

    if (
      value !== null &&
      !(value instanceof Buffer) &&
      typeof value !== 'string'
    ) {
      throw new Error(`${msg} value?`);
    }

    Object.assign(this, { key, value, headers, timestamp });
  }
}

class ConsumerGroup {
  constructor(cfg = {}) {
    let { groupId = 'no-group-id', topics = [] } = cfg;

    Object.assign(this, cfg, {
      groupId,
      topics,
    });
    Object.defineProperty(this, '_topicMap', {
      value: [], // hack for mock kafka
    });
    Object.defineProperty(this, '_consumers', {
      value: [], // hack for mock kafka
    });
  }

  _topicOfName(topicName) {
    const msg = 'c11p._topicOfName';
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
}

export class Consumer extends Role {
  constructor(cfg = {}) {
    const { kafka, groupId = 'no-group-id' } = cfg;
    super({ tla: 'c6r', kafka });
    const msg = 'c6r.ctor';
    const dbg = DBG.C6R_CTOR;

    Object.assign(this, {
      groupId,
    });

    let group = kafka._groupOfId(groupId);
    group._consumers.push(this);

    this.running = false;
    this.eachMessage = null;
    Object.defineProperty(this, 'group', {
      value: group,
    });

    dbg && cc.ok1(msg);
  }

  async subscribe(cfg = {}) {
    const msg = 'c6r.subscribe';
    const dbg = DBG.K3A_SUBSCRIBE;
    let { topics = [], fromBeginning = false } = cfg;
    const { kafka, groupId } = this;
    const { group } = this;
    for (let i = 0; i < topics.length; i++) {
      let topicName = topics[i];
      let topic = group._topicOfName(topicName);
      topic._consumers.push(this);
      if (group.topics.indexOf(topicName) < 0) {
        group.topics.push(topicName);
        dbg &&
          cc.fyi(msg + 2.1, groupId, JSON.stringify(group.topics));
      }
    }
    dbg && cc.ok1(msg + 9, groupId, topics);

    //return this; // WARNING: kafkajs does not chain
  }

  async run(cfg = {}) {
    const msg = 'c6r.run';
    const dbg = DBG.K3A_RUN;
    let { eachMessage } = cfg;
    if (eachMessage == null) {
      cc.bad1(msg, 'eachMessage?');
      throw new Error(`${msg} eachMessage?`);
    }

    cc.ok1(msg, 'END');
  }
}

export class Producer extends Role {
  constructor(cfg = {}) {
    let { kafka } = cfg;
    super({ tla: 'p6r', kafka });
    const msg = 'p6r.ctor';
    const dbg = DBG.P6R_CTOR;
    dbg && cc.ok1(msg);
  }

  async send(request = {}) {
    const msg = 'p6r.send';
    const dbg = DBG.K3A_SEND;
    let { kafka } = this;
    let {
      topic: topicName = 'no-topic',
      messages = [],
      timestamp = Timestamp.now(),
    } = request;

    let topic = kafka._topicOfName(topicName);
    let partition = topic.partitions[SINGLETON_PARTITION];
    topic._messages = [
      ...topic._messages,
      ...messages.map((m) => {
        if (m.timestamp == null) {
          m.timestamp = timestamp;
        }
        return m;
      }),
    ];

    if (dbg) {
      let ts = Timestamp.asDate(timestamp).toLocaleTimeString();
      cc.ok1(
        msg,
        'send',
        ts,
        topicName,
        'messages:',
        messages.length,
      );
    }
  }
}

export class Admin extends Role {
  constructor(cfg = {}) {
    let { kafka } = cfg;
    super({ tla: 'a3n', kafka });
    const msg = 'p6r.ctor';
    const dbg = DBG.P6R_CTOR;
    dbg && cc.ok1(msg);
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
    const { groupId, topics } = args;

    let group = kafka._groupOfId(groupId);
    if (group == null) {
      dbg && cc.bad(msg + -9, 'no-group:', groupId);
      return [];
    }

    return group.topics.map((topicName) => {
      let topic = group._topicOfName[topicName];
      cc.fyi1(msg, 'topic:', topic);
      return {
        topic: topicName,
        partitions: [
          {
            partition: SINGLETON_PARTITION,
            offset: 0,
          },
        ],
      };
    });
  }
}

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

  _groupOfId(groupId) {
    const msg = 'k7e._groupOfId';
    const dbg = DBG.K3A_GROUP_OF_ID;
    let { _groupMap } = this;
    let group = _groupMap[groupId];
    if (group == null) {
      group = new ConsumerGroup({ groupId });
      _groupMap[groupId] = group;
      dbg && cc.ok1(msg + 9.1, 'created:', groupId);
    } else {
      dbg && cc.ok1(msg + 9.2, 'existing:', groupId);
    }
    return group;
  }
}

export class Kafka1 extends KRaftNode {
  constructor(cfg = {}) {
    super();
    const msg = 'k3a.ctor';
    const dbg = DBG.K3A_CTOR;
    let { 
      clientId = 'no-client-id',
    } = cfg;

    Object.assign(this, {
      clientId,
    });

    dbg && cc.ok1(msg);
  }

  consumer(cfg = {}) {
    ROLE_CONSTRUCTOR = true;
    let role = new Consumer(
      Object.assign(
        {
          kafka: this,
        },
        cfg,
      ),
    );
    ROLE_CONSTRUCTOR = false;
    return role;
  }

  producer(cfg = {}) {
    ROLE_CONSTRUCTOR = true;
    let role = new Producer(
      Object.assign(
        {
          kafka: this,
        },
        cfg,
      ),
    );
    ROLE_CONSTRUCTOR = false;
    return role;
  }

  admin(cfg = {}) {
    ROLE_CONSTRUCTOR = true;
    let role = new Admin(
      Object.assign(
        {
          kafka: this,
        },
        cfg,
      ),
    );
    ROLE_CONSTRUCTOR = false;
    return role;
  }
}
