// an Avro schema
export class Schema {
  constructor(cfg = {}) {
    let sCfg = JSON.stringify(cfg);
    Object.assign(this, JSON.parse(sCfg));
    this.name = this.name || 'UnnamedSchema';
  }

  get fullName() {
    let { namespace, name } = this;
    return namespace == null ? name : `${namespace}.${name}`;
  }
}
