import { ColorConsole } from '../text/color-console.mjs';
const { cc } = ColorConsole;
import { DBG } from '../defines.mjs';

let ROLE_CONSTRUCTOR = false;

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
  constructor(cfg= {}) {
    let {
      topic = 'no-topic',
      created = Date.now(),
    } = cfg;

    this.topic = topic;
    this.created = created;
  }
}

export class Consumer extends Role {
  constructor(cfg = {}) {
    let { kafka } = cfg;
    super({ tla: 'c6r', kafka });
    const msg = 'c6r.ctor';
    const dbg = DBG.C6R_CTOR;
    dbg && cc.ok1(msg);
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

  async send(request={}) {
    const msg = 'p6r.send';
    const dbg = DBG.K3A_SEND;
    let { kafka } = this;
    let { topicMap } = kafka;
    let {
      topic = 'no-topic',
      messages = [],
      timestamp = Date.now(),
    } = request;

    if (topicMap[topic] == null) {
      topicMap[topic] = new Topic({topic});
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
}

export class Kafka {
  constructor(cfg = {}) {
    const msg = 'k3a.ctor';
    const dbg = DBG.K3A_CTOR;
    dbg && cc.ok1(msg);
    this.topicMap = {};
  }

  consumer() {
    ROLE_CONSTRUCTOR = true;
    let role = new Consumer({ kafka: this });
    ROLE_CONSTRUCTOR = false;
    return role;
  }

  producer() {
    ROLE_CONSTRUCTOR = true;
    let role = new Producer({ kafka: this });
    ROLE_CONSTRUCTOR = false;
    return role;
  }

  admin() {
    ROLE_CONSTRUCTOR = true;
    let role = new Admin({ kafka: this });
    ROLE_CONSTRUCTOR = false;
    return role;
  }
}
