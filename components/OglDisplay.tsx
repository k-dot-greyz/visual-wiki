"use client";

import { useEffect, useRef, useState } from "react";
import { readFlexPref, shouldMountOgl, type FlexPref } from "@/lib/flex-gate";
import type { TreeNode } from "@/lib/github-hydrate";

function readSignals(pref: FlexPref) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const hover = window.matchMedia("(hover: hover)").matches;
  const saveData = Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
  );
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return { reducedMotion, finePointer, hover, saveData, deviceMemory, pref };
}

export default function OglDisplay({ tree }: { tree: TreeNode[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const compute = () => {
      const pref = readFlexPref(window.localStorage.getItem("gw-flex"));
      setAllowed(shouldMountOgl(readSignals(pref)));
    };
    compute();
    window.addEventListener("gw-flex", compute);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener("change", compute);
    return () => {
      window.removeEventListener("gw-flex", compute);
      mq.removeEventListener("change", compute);
    };
  }, []);

  useEffect(() => {
    if (!allowed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let cancelled = false;

    import("ogl").then(({ Renderer, Geometry, Program, Mesh }) => {
      if (cancelled || !canvas) return;
      const renderer = new Renderer({ canvas, dpr: 1, alpha: true });
      const gl = renderer.gl;
      const count = Math.min(Math.max(tree.length, 8), 64);
      const position = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        position[i * 3] = (i % 8) / 4 - 1;
        position[i * 3 + 1] = Math.floor(i / 8) / 4 - 0.5;
        position[i * 3 + 2] = 0;
      }
      const geometry = new Geometry(gl, { position: { size: 3, data: position } });
      const program = new Program(gl, {
        vertex: `attribute vec3 position; uniform float uTime; void main() {
          gl_Position = vec4(position.x + sin(uTime + position.y) * 0.05, position.y, 0.0, 1.0);
          gl_PointSize = 4.0;
        }`,
        fragment: `precision highp float; void main() { gl_FragColor = vec4(0.4, 0.45, 1.0, 0.85); }`,
        transparent: true,
        uniforms: { uTime: { value: 0 } },
      });
      const mesh = new Mesh(gl, { geometry, program, mode: gl.POINTS });
      renderer.setSize(canvas.clientWidth || 320, canvas.clientHeight || 160);
      const loop = (t: number) => {
        if (cancelled) return;
        program.uniforms.uTime.value = t * 0.001;
        renderer.render({ scene: mesh });
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [allowed, tree]);

  if (!allowed) return null;

  return (
    <div data-ogl="on" className="rounded-3xl border border-zinc-800 overflow-hidden h-40">
      <canvas ref={canvasRef} className="w-full h-full block" aria-hidden="true" />
    </div>
  );
}
