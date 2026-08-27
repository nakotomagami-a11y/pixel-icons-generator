import { jsx as _jsx } from "react/jsx-runtime";
/**
 * React wrapper for the pixel-icons generator.
 *
 * Icons are static (no animation), so this just draws once into a canvas on
 * mount and whenever the config or size changes. The internal canvas is sized
 * to `dimension` native pixels (default 48) and scaled up to `size` CSS pixels
 * with `image-rendering: pixelated` for crisp pixel art.
 *
 * No "use client" directive — this component is framework-agnostic. Under
 * Next.js (RSC), re-export it from a thin client module:
 *
 *     "use client";
 *     export { WeaponIcon } from "@agent-office/pixel-icons/react";
 */
import { memo, useEffect, useRef } from "react";
import { IconGenerator } from "../generator";
export const WeaponIcon = memo(function WeaponIcon({ config, size = 48, dimension, border, particles, className, }) {
    const canvasRef = useRef(null);
    // Chunky-by-design: a fixed-ish low native res (28–44) upscaled to the display
    // size gives the tiny-swords pack's deliberate blocky edges. Supersampling to
    // 48–96 (the old default) rendered fine pixels that just amplified the
    // procedural edge noise and read as rough. The generator is scale-invariant,
    // so a lower native res only coarsens the pixels — it never reshapes the icon.
    const nativeDim = dimension ?? Math.min(60, Math.max(40, Math.round(size * 0.7)));
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas)
            return;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            return;
        ctx.clearRect(0, 0, nativeDim, nativeDim);
        new IconGenerator(ctx, nativeDim, { border, particles }).generate(config);
    }, [config, nativeDim, border, particles]);
    return (_jsx("canvas", { ref: canvasRef, width: nativeDim, height: nativeDim, className: className, style: {
            width: size,
            height: size,
            imageRendering: "pixelated",
            display: "block",
            flexShrink: 0,
        } }));
});
