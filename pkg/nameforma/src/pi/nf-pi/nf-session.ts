import { EventEmitter } from 'events';
import { World } from '../../world.js';
import { ZenoCoord } from '../../navigable-view.js';
import { Task } from '../../task.js';

/**
 * NfSession stores shared context for the nf-pi extension.
 * The lifecycle spans only the lifetime of a pi invocation and
 * is not serialized.
 */
export class NfSession extends EventEmitter {
  private static _shared: NfSession;

  public zenoCoord?: ZenoCoord;
  public world: World;
  public anchor: any;
  public pivot: any;

  private constructor(world: World) {
    super();
    this.world = world;
    this.anchor = world;
    this.pivot = null;
  }

  public static get shared(): NfSession {
    if (!NfSession._shared) {
      throw new Error(
        'NfSession.shared accessed before NfSession.init() was called',
      );
    }
    return NfSession._shared;
  }

  public static init(): NfSession {
    if (NfSession._shared) {
      throw new Error('NfSession already initialized');
    }
    let world: World | undefined;
    try {
      const worldPath = World.findWorld();
      if (worldPath) {
        world = World.fromPath(worldPath);
      }
    } catch (error) {
      // World not found, context will work without anchor
    }
    const ctx = new NfSession(world as World);

    // Load focused task if one exists
    if (world) {
      const focusedTaskFocus = world.focusedForma('task');
      if (focusedTaskFocus) {
        try {
          ctx.pivot = world.loadEntity(Task, focusedTaskFocus.formaId);
        } catch (error) {
          // Task not found or load failed, pivot remains null
        }
      }
    }

    NfSession._shared = ctx;
    return NfSession._shared;
  }
}
