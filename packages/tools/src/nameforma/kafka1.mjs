import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;
import { Unicode } from '../text/unicode.mjs';
const { 
  CHECKMARK:OK,
} = Unicode;
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
    let { name = 'no-topic', created = Date.now() } = cfg;

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

class Group {
  constructor(cfg = {}) {
    let { groupId = 'no-group-id', protocolType = 'consumer' } = cfg;

    Object.assign(this, {
      groupId,
    }, cfg);
    Object.defineProperty(this, '_topicOffsetsMap', {
      value: {}, // hack for mock kafka
    });
  }

  _topics(){
    return Object.keys(this._topicOffsetsMap);
  }

} // Group

export class Consumer extends Role {
  constructor(cfg = {}) {
    const { kafka, groupId = 'no-group-id' } = cfg;
    super({ tla: 'c6r', kafka });
    const msg = 'c6r.ctor';
    const dbg = DBG.C6R_CTOR;

    Object.assign(this, {
      groupId,
    });
    let group = this._group();

    this.running = false;
    this.eachMessage = null;

    dbg && cc.ok1(msg, groupId);
  }

  _group() {
    let { kafka, groupId } = this;
    return kafka._groupOfId(groupId);
  }

  async subscribe(cfg = {}) {
    const msg = 'c6r.subscribe';
    const dbg = DBG.K3A_SUBSCRIBE;
    let { topics = [], fromBeginning = false } = cfg;
    const { kafka, groupId } = this;
    const group = this._group();
    const { _topicOffsetsMap } = group;
    let subscribed = 0;
    for (let i = 0; i < topics.length; i++) {
      let topicName = topics[i];
      let topic = kafka._topicOfName(topicName);
      let t10s = _topicOffsetsMap[topicName];
      if (t10s) {
        dbg>1 && cc.ok(msg + 2.1, groupId+'=:', topicName);
      } else {
        let offset = 0;

        t10s = {
          topic: topicName,
          partitions: [{ partition: SINGLETON_PARTITION, offset }],
        };
        _topicOffsetsMap[topicName] = t10s;
        
        subscribed++;
        dbg>1 && cc.ok(msg + 2.2, groupId+'+:', topicName, JSON.stringify(_topicOffsetsMap));
      }
    }

    dbg && cc.ok1(msg + OK, `${groupId}:`, JSON.stringify(group._topics()));

    //return this; // WARNING: kafkajs does not chain
  } // subscribe

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
} // Consumer

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
    for (let i = 0; i < messages.length; i++) {
      let message = messages[i];
      let partitionId = Message._partitionOfKey(message.key);
      let partition = topic.partitions[partitionId];
      if (message.timestamp == null) {
        message.timestamp = timestamp;
      }
      partition._messages.push(message);
      if (dbg>1) {
        let ts = Timestamp.asDate(timestamp).toLocaleTimeString();
        cc.ok(msg, ts, `${topicName}.${partitionId}`, message.key+':', message.value);
      }
    }

    if (dbg) {
      let ts = Timestamp.asDate(timestamp).toLocaleTimeString();
      cc.ok1(msg, 'send', ts, topicName, 'messages:', messages.length);
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
    let { _topicOffsetsMap } = group;
    if (topics == null) {
      topics = Object.keys(_topicOffsetsMap);
    }
    let offsets = topics.reduce((a,topicName)=>{
      let t10s = _topicOffsetsMap[topicName];
      t10s && a.push(t10s);
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
      group = new Group({ groupId, protocolType });
      _groupMap[groupId] = group;
      dbg && cc.ok1(msg + OK+ '+', groupId);
    } else {
      dbg && cc.ok1(msg + OK + '=', groupId);
    }
    return group;
  }
} // KRaftNode

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
