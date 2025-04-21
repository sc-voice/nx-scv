import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;
import { DBG } from '../defines.mjs';

let ROLE_CONSTRUCTOR = false;

class Timestamp { // Does Kafka REALLY store timestamps as strigs???
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
    return this; // does kafkajs do this?
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
    this.messages = [];
    this.consumers = [];
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
  constructor(cfg={}){
    let {
      groupId = 'no-group-id',
      topics = [],
    } = cfg;

    Object.assign(this, cfg, {
      groupId,
      topics,
    });
    Object.defineProperty(this, 'consumers', {
      value: [],
    });
  }
}

export class Consumer extends Role {
  constructor(cfg = {}) {
    const { kafka, groupId = 'no-group-id' } = cfg;
    const { groupMap } = kafka;
    super({ tla: 'c6r', kafka });
    const msg = 'c6r.ctor';
    const dbg = DBG.C6R_CTOR;

    Object.assign(this, {
      groupId,
    });

    let group = groupMap[groupId];
    if (group == null) {
      group = new ConsumerGroup({ groupId, });
      group.consumers.push(this);
      groupMap[groupId] = group;
    }

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
    let {
      topics = [],
      fromBeginning = false,
    } = cfg;
    const { kafka, groupId, } = this;
    const { group } = this;
    for (let i = 0; i < topics.length; i++) {
      let topicName = topics[i];
      let topic = kafka._topicOfName(topicName);
      topic.consumers.push(this);
      if (group.topics.indexOf(topicName) < 0) {
        group.topics.push(topicName);
        dbg && cc.fyi(msg+2.1, groupId, JSON.stringify(group.topics));
      }
    }
    dbg && cc.ok1(msg+9, groupId, topics);

    return this; // does kafkajs do this?
  }

  async run(cfg={}) {
    const msg = 'c6r.run';
    const dbg = DBG.K3A_RUN;
    let {
      eachMessage,
    } = cfg;
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
    let { topicMap } = kafka;
    let {
      topic: topicName = 'no-topic',
      messages = [],
      timestamp = Timestamp.now(),
    } = request;

    let topic = kafka._topicOfName(topicName);
    topic.messages = [
      ...topic.messages,
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
    let { topicMap } = this.kafka;

    return Object.keys(topicMap);
  }

  async createTopics(cfg={}) { 
    const msg = 'a3n.createTopics';
    const dbg = DBG.K3A_CREATE_TOPICS;
    cc.bad1(msg, 'UNTESTED');

    const { kafka } = this;
    const { topicMap } = kafka;
    const { topics } = cfg;

    if (topics == null) {
      cc.bad1(msg+-1, 'topics?');
      throw new Error(`${msg} topics?`);
    }

    const created = [];
    for (let i = 0; i < topics.length; i++) {
      let topicName = topics[i];
      let topic = topicMap[topicName];
      if (topic == null) {
        cc.ok(msg+2, topicName);
        topic = new Topic({ name: topicName });
        topicMap[topicName] = topic;
        created.push[topicName];
      }
    }

    dbg && cc.ok1(msg+9, created);
    return this; // does kafkajs do this?
  }

  async fetchOffsets(args={}) {
    const msg = 'a3n.fetchOffsets';
    const dbg = DBG.K3A_FETCH_OFFSETS;
    const { kafka } = this;
    const { groupMap } = kafka;
    const {
      groupId,
      topics,
    } = args;

    let group = groupMap[groupId];

    if (group == null) {
      dbg && cc.bad(msg+-9, 'no-group:', groupId);
      return [];
    }

    return group.topics.map(t=>{
      return {
        topic: t.name,
        offset: t.groupOffset,
      }
    });
  }
}

export class Kafka {
  constructor(cfg = {}) {
    const msg = 'k3a.ctor';
    const dbg = DBG.K3A_CTOR;
    let { clientId = 'no-client-id' } = cfg;

    Object.assign(this, cfg, {
      clientId,
      topicMap: {},
      groupMap: {},
    });

    dbg && cc.ok1(msg);
  }

  _topicOfName(topicName) {
    const msg = 'k3a._topicOfName';
    const dbg = DBG.K3A_TOPIC_OF_NAME;
    let { topicMap } = this;
    let topic = topicMap[topicName];
    if (topic == null) {
      topic = new Topic({ name: topicName });
      topicMap[topicName] = topic;
      dbg && cc.ok1(msg+9.1, 'created:', topicName);
    } else {
      dbg && cc.ok1(msg+9.2, 'existing:', topicName);
    }
    return topic;
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
