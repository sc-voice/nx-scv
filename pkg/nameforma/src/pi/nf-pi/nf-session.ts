import { EventEmitter } from 'events';
import type { OverlayHandle } from '@earendil-works/pi-tui';
import { World } from '../../world.js';
import { FileRepository } from '../../file-repository.js';
import { WorldView } from '../../world-view.js';
import { ZenoCoord } from '../../navigable-view.js';
import type { NfWatch } from './nf-watch.js';

/**
 * NfSession stores shared context for the nf-pi extension.
 * The lifecycle spans only the lifetime of a pi invocation and
 * is not serialized.
 */
export class NfSession extends EventEmitter {
  private static _shared: NfSession;

  public view: WorldView;
  public watchInstance: NfWatch | null = null;
  public watchCount: number;

  private constructor(world: World) {
    super();
    this.view = new WorldView(world, 'nf-pi');
    this.view.setAnchor(world);
    this.watchCount = 0;
  }

  get anchor() {
    return this.view.anchor;
  }

  get pivot() {
    return this.view.pivot;
  }

  get zenoCoord() {
    return this.view.zenoCoord;
  }

  get world() {
    return this.view.world;
  }

  public static get shared(): NfSession {
    if (!NfSession._shared) {
      throw new Error(
        'NfSession.shared accessed before NfSession.init() was called',
      );
    }
    return NfSession._shared;
  }

  public static async init(): Promise<NfSession> {
    if (NfSession._shared) {
      throw new Error('NfSession already initialized');
    }
    let world: World | undefined;
    try {
      const worldPath = World.findWorld();
      if (worldPath) {
        world = await FileRepository.worldFromPath(worldPath);
      }
    } catch (error) {
      // World not found, context will work without anchor
    }
    const ctx = new NfSession(world as World);
    NfSession._shared = ctx;
    return NfSession._shared;
  }
}
