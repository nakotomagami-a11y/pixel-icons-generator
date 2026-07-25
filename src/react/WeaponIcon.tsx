/**
 * React wrapper for the pixel-icons generator.
 *
 * Icons are static (no animation), so this just draws once into a canvas on
 * mount and whenever the config or size changes. The internal canvas is sized
 * to `dimension` native pixels (default 32) and scaled up to `size` CSS pixels
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
  /** Display size in CSS pixels. @default 32 */
  size?: number;
  /** Native render resolution in pixels. @default 32 */
  dimension?: number;
  /** Forwarded to the canvas element. */
  className?: string;
}

export const WeaponIcon = memo(function WeaponIcon({
  config,
  size = 32,
  dimension = 32,
  className,
}: WeaponIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, dimension, dimension);
    new IconGenerator(ctx, dimension).generate(config);
  }, [config, dimension]);

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
