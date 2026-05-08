import { EventEmitter } from "events";
import { World } from "../../world.js";
import { ZenoCoord } from "../../navigable-view.js";

export class NfContext extends EventEmitter {
    private static _shared: NfContext;

    public zenoCoord?: ZenoCoord;
    public world: World;

    private constructor(world: World) {
        super();
        this.world = world;
    }

    public static get shared(): NfContext {
        if (!NfContext._shared) {
            throw new Error("NfContext.shared accessed before NfContext.init() was called");
        }
        return NfContext._shared;
    }

    public static init(): NfContext {
        if (NfContext._shared) {
            throw new Error("NfContext already initialized");
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
        NfContext._shared = new NfContext(world as World);
        return NfContext._shared;
    }
}
