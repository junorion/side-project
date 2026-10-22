"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { StarmapData } from "@/features/starmap/starmap-data";
import {
  findConstellationAt,
  horizontalCoords,
  projectConstellationLines,
  projectToChart,
  starSize,
  type SkyView,
} from "@/features/starmap/sky-math";

const HIT_DISTANCE = 20;
const MARGIN = 28;

type SkyChartProps = {
  data: StarmapData;
  latDeg: number;
  lstDeg: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function SkyChart({ data, latDeg, lstDeg, selectedId, onSelect }: SkyChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState(0);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(([entry]) => setSize(Math.floor(entry.contentRect.width)));
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  const radius = size / 2 - MARGIN;

  const scene = useMemo(() => {
    const view: SkyView = { lstDeg, latDeg, radius };
    const stars = data.stars.flatMap(({ geometry, properties }) => {
      const [ra, dec] = geometry.coordinates;
      const horizontal = horizontalCoords({ ra, dec }, view);
      if (horizontal.alt <= 0) return [];
      return [{ ...projectToChart(horizontal, radius), size: starSize(properties.mag) }];
    });
    const labels = data.constellations.flatMap(({ id, properties, geometry }) => {
      const [ra, dec] = geometry.coordinates;
      const horizontal = horizontalCoords({ ra, dec }, view);
      if (horizontal.alt <= 0) return [];
      return [{ id, name: properties.ko, ...projectToChart(horizontal, radius) }];
    });
    return { stars, labels, segments: projectConstellationLines(data.lines, view) };
  }, [data, latDeg, lstDeg, radius]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size === 0) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.translate(size / 2, size / 2);

    ctx.fillStyle = "#0b1020";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
    ctx.lineWidth = 1;
    for (const alt of [30, 60]) {
      const { y } = projectToChart({ alt, az: 0 }, radius);
      ctx.beginPath();
      ctx.arc(0, 0, Math.abs(y), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(147, 197, 253, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const { id, a, b } of scene.segments) {
      if (id === selectedId) continue;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (const { id, a, b } of scene.segments) {
      if (id !== selectedId) continue;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    for (const { x, y, size: starRadius } of scene.stars) {
      ctx.beginPath();
      ctx.arc(x, y, starRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const { id, name, x, y } of scene.labels) {
      ctx.fillStyle = id === selectedId ? "#fbbf24" : "rgba(226, 232, 240, 0.75)";
      ctx.fillText(name, x, y);
    }

    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#94a3b8";
    const edge = radius + 16;
    ctx.fillText("N", 0, -edge);
    ctx.fillText("S", 0, edge);
    ctx.fillText("E", -edge, 0);
    ctx.fillText("W", edge, 0);
  }, [scene, selectedId, size, radius]);

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = {
      x: event.clientX - rect.left - size / 2,
      y: event.clientY - rect.top - size / 2,
    };
    const id = findConstellationAt(point, scene.segments, HIT_DISTANCE);
    if (id) onSelect(id);
  }

  return (
    <div ref={wrapperRef} className="mx-auto aspect-square w-full max-w-[640px]">
      <canvas
        ref={canvasRef}
        className="size-full cursor-pointer"
        aria-label="현재 하늘의 별자리 지도"
        onClick={handleClick}
      />
    </div>
  );
}
