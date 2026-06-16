"use client";

import * as React from "react";

export type ConfettiHandle = { fire: () => void };

const PALETTE = [
  "#fb923c", "#f97316", "#fdba74",
  "#ef4444", "#dc2626", "#f87171",
  "#facc15", "#fde047", "#fef08a",
  "#3b82f6", "#22c55e", "#d946ef",
  "#ffffff",
];

type Shape = "rect" | "disc" | "ribbon" | "star" | "tri" | "coffee" | "toffee";
// coffee + toffee included so a couple of branded pieces fly with each burst
const SHAPES: Shape[] = ["rect", "disc", "ribbon", "star", "tri", "coffee", "toffee", "rect", "ribbon"];

type Particle = {
  x: number; y: number; vx: number; vy: number;
  rot: number; vrot: number;
  size: number; color: string; shape: Shape;
  grav: number; drag: number; wob: number; wobOff: number;
  life: number; maxLife: number; spin3d: number;
  sticky: boolean; stuck: boolean;
};

type Flash = { x: number; y: number; t: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[(Math.random() * arr.length) | 0];

function path(ctx: CanvasRenderingContext2D, p: Particle) {
  const s = p.size;
  ctx.fillStyle = p.color;
  switch (p.shape) {
    case "disc":
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "ribbon":
      ctx.fillRect(-s * 0.22, -s * 0.9, s * 0.44, s * 1.8);
      break;
    case "tri":
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.6);
      ctx.lineTo(s * 0.55, s * 0.5);
      ctx.lineTo(-s * 0.55, s * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    case "star": {
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k * 4 * Math.PI) / 5 - Math.PI / 2;
        const r = k % 2 === 0 ? s * 0.6 : s * 0.26;
        ctx[k === 0 ? "moveTo" : "lineTo"](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "coffee": {
      const c = s * 1.5;
      // mug body
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(-c * 0.42, -c * 0.4, c * 0.78, c * 0.8, c * 0.12);
        ctx.fill();
      } else {
        ctx.fillRect(-c * 0.42, -c * 0.4, c * 0.78, c * 0.8);
      }
      // handle
      ctx.lineWidth = c * 0.13;
      ctx.strokeStyle = p.color;
      ctx.beginPath();
      ctx.arc(c * 0.42, 0, c * 0.26, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.stroke();
      break;
    }
    case "toffee": {
      const c = s * 1.5;
      // wrapped candy: pillow + two wrapper twists
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(-c * 0.3, -c * 0.28, c * 0.6, c * 0.56, c * 0.14);
        ctx.fill();
      } else {
        ctx.fillRect(-c * 0.3, -c * 0.28, c * 0.6, c * 0.56);
      }
      ctx.beginPath();
      ctx.moveTo(-c * 0.3, 0); ctx.lineTo(-c * 0.58, -c * 0.3); ctx.lineTo(-c * 0.58, c * 0.3);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(c * 0.3, 0); ctx.lineTo(c * 0.58, -c * 0.3); ctx.lineTo(c * 0.58, c * 0.3);
      ctx.closePath(); ctx.fill();
      break;
    }
    default:
      ctx.fillRect(-s * 0.5, -s * 0.35, s, s * 0.7);
  }
}

/**
 * Two slingshot cannons, fired 0.5s apart: the bottom-left piece is launched at
 * the top-right corner and the bottom-right at the top-left — a slow, arcing
 * cross. Coffee & toffee icons ride along, and 5–10 pieces stick to the page
 * (drawn on a never-cleared layer) until the next refresh.
 */
export const ConfettiBurst = React.forwardRef<ConfettiHandle>(function ConfettiBurst(_props, ref) {
  const animRef = React.useRef<HTMLCanvasElement>(null);
  const stuckRef = React.useRef<HTMLCanvasElement>(null);
  const fireRef = React.useRef<() => void>(() => {});

  React.useImperativeHandle(ref, () => ({ fire: () => fireRef.current() }), []);

  React.useEffect(() => {
    const anim = animRef.current;
    const stuck = stuckRef.current;
    if (!anim || !stuck) return;
    const ctx = anim.getContext("2d")!;
    const sctx = stuck.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0, h = 0, dpr = 1;
    function size(cv: HTMLCanvasElement, c: CanvasRenderingContext2D) {
      cv.width = Math.floor(w * dpr);
      cv.height = Math.floor(h * dpr);
      cv.style.width = w + "px";
      cv.style.height = h + "px";
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      size(anim!, ctx);
      size(stuck!, sctx); // resize clears the stuck layer — acceptable, rare
    }
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    const flashes: Flash[] = [];
    let raf = 0;
    let stickBudget = 0; // how many more pieces should stick this celebration

    function spawn(ox: number, oy: number, aimDeg: number, spreadDeg: number, count: number) {
      for (let i = 0; i < count; i++) {
        const ang = ((aimDeg + rand(-spreadDeg, spreadDeg)) * Math.PI) / 180;
        // gym-rat energy: hard launch toward top-center, but with strong gravity
        // so the arc PEAKS near the top edge (they reach the top, hang, then rain
        // back down hard) instead of overshooting off-screen.
        const speed = rand(28, 46) * (reduce ? 0.5 : 1);
        const floaty = Math.random() < 0.22;
        const maxLife = rand(200, 340);
        const sticky = stickBudget > 0 && Math.random() < 0.06;
        if (sticky) stickBudget -= 1;
        particles.push({
          x: ox + rand(-6, 6),
          y: oy + rand(-6, 6),
          vx: Math.cos(ang) * speed * (floaty ? 0.8 : 1),
          vy: Math.sin(ang) * speed * (floaty ? 0.85 : 1),
          rot: rand(0, Math.PI * 2),
          vrot: rand(-0.2, 0.2),
          size: rand(6, 14),
          color: pick(PALETTE),
          shape: pick(SHAPES),
          grav: floaty ? rand(0.14, 0.22) : rand(0.44, 0.64),
          drag: floaty ? rand(0.995, 0.999) : rand(0.995, 0.999),
          wob: rand(0.5, 1.8),
          wobOff: rand(0, Math.PI * 2),
          life: maxLife,
          maxLife,
          spin3d: rand(0.04, 0.12),
          sticky,
          stuck: false,
        });
      }
    }

    function stamp(p: Particle) {
      sctx.save();
      sctx.globalAlpha = 1;
      sctx.translate(p.x, p.y);
      sctx.rotate(p.rot);
      path(sctx, p);
      sctx.restore();
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);

      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.t -= 1;
        if (f.t <= 0) { flashes.splice(i, 1); continue; }
        const a = f.t / 16;
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 170);
        grad.addColorStop(0, `rgba(255,255,255,${0.5 * a})`);
        grad.addColorStop(0.4, `rgba(253,224,71,${0.35 * a})`);
        grad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 170, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += p.grav;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.x += p.vx + Math.sin(p.life * 0.08 + p.wobOff) * p.wob;
        p.y += p.vy;
        p.rot += p.vrot;
        p.life -= 1;

        // sticky pieces settle onto the page mid-descent, then persist
        if (p.sticky && !p.stuck && p.vy > 0.4 && p.y > h * 0.12 && p.y < h * 0.92 && Math.random() < 0.045) {
          stamp(p);
          particles.splice(i, 1);
          continue;
        }
        if (p.life <= 0 || p.y > h + 40 || p.y < -140) {
          if (p.sticky && !p.stuck && p.y <= h + 40) stamp(p); // last chance before exit
          particles.splice(i, 1);
          continue;
        }

        const alpha = Math.min(1, p.life / 30);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha) * (p.color === "#ffffff" ? 0.7 + 0.3 * Math.sin(p.life * 0.4) : 1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(Math.cos(p.life * p.spin3d), 1); // fake 3D flip
        path(ctx, p);
        ctx.restore();
      }

      if (particles.length > 0 || flashes.length > 0) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = 0; // loop ends; canvas left clear
      }
    }

    // Always (re)start a single loop. No `running` flag — a stale flag surviving
    // a hot-reload while its rAF was cancelled would otherwise wedge the loop.
    function ensureRunning() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(frame);
    }

    function launch(side: "left" | "right") {
      const margin = 12;
      const ox = side === "left" ? margin : w - margin;
      const oy = h - margin;
      const tx = w / 2; // both cannons aim at the middle of the top edge (navbar center)
      const aim = (Math.atan2(-oy, tx - ox) * 180) / Math.PI;
      spawn(ox, oy, aim, reduce ? 26 : 16, reduce ? 40 : 160);
      flashes.push({ x: ox, y: oy, t: 16 });
      ensureRunning();
    }

    fireRef.current = () => {
      stickBudget += 5 + Math.floor(Math.random() * 6); // 5–10 will stick
      launch("left");
      window.setTimeout(() => launch("right"), 5);
    };

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <canvas ref={stuckRef} aria-hidden className="pointer-events-none fixed inset-0 z-[99]" />
      <canvas ref={animRef} aria-hidden className="pointer-events-none fixed inset-0 z-[100]" />
    </>
  );
});
