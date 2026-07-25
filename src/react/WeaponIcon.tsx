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
import type { IconConfig } from "../types";
import { IconGenerator } from "../generator";

export interface WeaponIconProps {
  /** Icon configuration (seed + class). Same config → same icon everywhere. */
  config: IconConfig;
  /** Display size in CSS pixels. @default 48 */
  size?: number;
  /**
   * Native render resolution in pixels. Higher = smoother edges / finer detail
   * (48 is a good balance; ≥96 can distort the composition). @default 48
   */
  dimension?: number;
  /**
   * Outline color [r, g, b] 0–255. Omit for the original pure black; a dark
   * desaturated tone (e.g. [26, 22, 34]) reads softer against dark UIs.
   */
  border?: [number, number, number];
  /** Forwarded to the canvas element. */
  className?: string;
}

export const WeaponIcon = memo(function WeaponIcon({
  config,
  size = 48,
  dimension = 48,
  border,
  className,
}: WeaponIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, dimension, dimension);
    new IconGenerator(ctx, dimension, { border }).generate(config);
  }, [config, dimension, border]);

  return (
    <canvas
      ref={canvasRef}
      width={dimension}
      height={dimension}
      className={className}
      style={{
        width: size,
        height: size,
        imageRendering: "pixelated",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
});
