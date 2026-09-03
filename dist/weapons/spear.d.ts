import type { Pen } from "../pen";
import type { SpearParts } from "../types";
import { Rng } from "../rng";
/** One of a few ribbon looks: straight, fluttering wave, twisting fold, or a
 *  forked swallowtail. Shared by spear + trident. */
export declare function ribbonStyle(r: Rng, dscale: number): {
    wave?: number;
    waveLen?: number;
    taper?: boolean;
    twist?: boolean;
    swallowtail?: boolean;
};
export declare function drawSpear(pen: Pen, parts?: SpearParts): void;
