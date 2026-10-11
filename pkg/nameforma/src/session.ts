import { Forma } from './forma.js';
import { ZidSpace } from './zid-space.js';

export class Session extends Forma {
  readonly zidSpace: ZidSpace;

  constructor(cfg: Partial<Session> = {}) {
    super(cfg);

    this.zidSpace = cfg.zidSpace ?? new ZidSpace();
  }

  /**
   * Serialize session with its zid table as plain data.
   * Formas are not included; persist them separately.
   */
  override toJSON(): object {
    return { ...super.toJSON(), zidSpace: this.zidSpace.toJSON() };
  }

  static fromJSON(json: Record<string, any>): Session {
    const zidSpace = ZidSpace.fromJSON(json.zidSpace);
    const { id, name, summary } = json;
    return new Session({ id, name, summary, zidSpace });
  }
}
