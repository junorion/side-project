"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  canZoomIn,
  canZoomOut,
  fitZoom,
  panBy,
  screenToChart,
  zoomIn,
  zoomOut,
  type Viewport,
} from "@/features/starmap/chart-viewport";
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
const DRAG_THRESHOLD = 4;
const MARGIN = 28;

type SkyChartProps = {
  data: StarmapData;
  latDeg: number;
  lstDeg: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  // 지도 화면 맨 위에 지도와 겹치지 않게 놓는 정보 줄.
  header?: React.ReactNode;
  // 지도 화면 안 아래쪽에 떠 있는 팝업창.
  popup?: React.ReactNode;
};

export function SkyChart({
  data,
  latDeg,
  lstDeg,
  selectedId,
  onSelect,
  header,
  popup,
}: SkyChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  // 사용자가 확대·축소·이동하기 전에는 화면 크기에 맞춘 초기 배율을 쓴다.
  const [userViewport, setUserViewport] = useState<Viewport | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const observer = new ResizeObserver(([entry]) =>
      setBox({
        width: Math.floor(entry.contentRect.width),
        height: Math.floor(entry.contentRect.height),
      })
    );
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, []);

  // 하늘 원은 화면의 짧은 변에 맞춰 한가운데에 놓는다.
  const radius = Math.min(box.width, box.height) / 2 - MARGIN;

  const viewport = useMemo<Viewport>(
    () => userViewport ?? { zoom: fitZoom(box.width, box.height, MARGIN), panX: 0, panY: 0 },
    [userViewport, box.width, box.height]
  );

  function updateViewport(change: (view: Viewport) => Viewport) {
    setUserViewport((current) => change(current ?? viewport));
  }

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
    if (!canvas || box.width === 0 || box.height === 0) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = box.width * ratio;
    canvas.height = box.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#0b1020";
    ctx.fillRect(0, 0, box.width, box.height);
    ctx.translate(box.width / 2 + viewport.panX, box.height / 2 + viewport.panY);
    ctx.scale(viewport.zoom, viewport.zoom);
    // 확대해도 선 굵기, 별 크기, 글자 크기는 화면 기준으로 유지한다.
    const px = 1 / viewport.zoom;

    ctx.fillStyle = "#0b1020";
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
    ctx.lineWidth = px;
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
    ctx.lineWidth = px;
    ctx.beginPath();
    for (const { id, a, b } of scene.segments) {
      if (id === selectedId) continue;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();

    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2.5 * px;
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
      ctx.arc(x, y, starRadius * px, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = `${12 * px}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const { id, name, x, y } of scene.labels) {
      ctx.fillStyle = id === selectedId ? "#fbbf24" : "rgba(226, 232, 240, 0.75)";
      ctx.fillText(name, x, y);
    }

    ctx.font = `bold ${14 * px}px sans-serif`;
    ctx.fillStyle = "#94a3b8";
    const edge = radius + 16 * px;
    ctx.fillText("N", 0, -edge);
    ctx.fillText("S", 0, edge);
    ctx.fillText("E", -edge, 0);
    ctx.fillText("W", edge, 0);
  }, [scene, selectedId, box, radius, viewport]);

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY };
    suppressClick.current = false;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const last = drag.current;
    if (!last) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    // 작은 흔들림은 클릭으로 남겨 두고, 문턱을 넘으면 그 순간부터 이동으로 본다.
    if (!suppressClick.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    suppressClick.current = true;
    drag.current = { x: event.clientX, y: event.clientY };
    updateViewport((view) => panBy(view, dx, dy, radius));
  }

  function handlePointerEnd() {
    drag.current = null;
  }

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const point = screenToChart(
      {
        x: event.clientX - rect.left - box.width / 2,
        y: event.clientY - rect.top - box.height / 2,
      },
      viewport
    );
    const id = findConstellationAt(point, scene.segments, HIT_DISTANCE / viewport.zoom);
    if (id) onSelect(id);
  }

  return (
    <div className="relative mx-auto flex aspect-[9/19.5] w-full max-w-[390px] flex-col overflow-hidden rounded-xl bg-[#0b1020]">
      {header}
      <div ref={wrapperRef} className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          className="size-full cursor-grab touch-none active:cursor-grabbing"
          aria-label="현재 하늘의 별자리 지도"
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        />
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="확대"
            disabled={!canZoomIn(viewport)}
            onClick={() => updateViewport((view) => zoomIn(view, radius))}
          >
            <PlusIcon />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="축소"
            disabled={!canZoomOut(viewport)}
            onClick={() => updateViewport((view) => zoomOut(view, radius))}
          >
            <MinusIcon />
          </Button>
        </div>
      </div>
      {popup && <div className="absolute inset-x-3 bottom-3">{popup}</div>}
    </div>
  );
}
