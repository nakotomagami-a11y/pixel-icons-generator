import { createRandomSeed } from "./rng";
/** Random config with the given selector (default "anyweapon"). */
export function randomIcon(iconClass = "anyweapon") {
    return { seed: createRandomSeed(), iconClass };
}
/** Random config pinned to one concrete class. */
export function randomIconOfClass(iconClass) {
    return { seed: createRandomSeed(), iconClass };
}
