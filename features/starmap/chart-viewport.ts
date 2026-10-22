import type { Point } from "@/features/starmap/sky-math";

// 화면 좌표(원점은 캔버스 중심) = 지도 좌표 × zoom + pan
export type Viewport = { zoom: number; panX: number; panY: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
const ZOOM_STEP = 1.5;

export const INITIAL_VIEWPORT: Viewport = { zoom: MIN_ZOOM, panX: 0, panY: 0 };

// 하늘 원의 위아래가 화면 위아래(여백 margin 제외)에 닿는 배율. 원은 짧은 변에 맞춰 그려지므로
// 세로로 긴 화면에서만 1보다 커진다.
export function fitZoom(width: number, height: number, margin: number): number {
  if (width <= 2 * margin || height <= 2 * margin) return MIN_ZOOM;
  const zoom = (height - 2 * margin) / (width - 2 * margin);
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

// 하늘 원의 가장자리가 화면 가장자리를 넘지 않는 범위까지만 이동할 수 있다.
function clampPan(zoom: number, panX: number, panY: number, radius: number): Viewport {
  const max = radius * (zoom - 1);
  const length = Math.hypot(panX, panY);
  if (max <= 0) return { zoom, panX: 0, panY: 0 };
  if (length <= max) return { zoom, panX, panY };
  const scale = max / length;
  return { zoom, panX: panX * scale, panY: panY * scale };
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function zoomTo(view: Viewport, nextZoom: number, radius: number): Viewport {
  const zoom = clampZoom(nextZoom);
  const ratio = zoom / view.zoom;
  // 화면 가운데에 보이는 지점이 그대로 가운데에 남도록 이동량을 같은 비율로 키운다.
  return clampPan(zoom, view.panX * ratio, view.panY * ratio, radius);
}

// 배율을 factor배로 바꾸되, anchor(화면 좌표) 아래의 지도 지점이 제자리에 남게 한다.
export function zoomAround(view: Viewport, factor: number, anchor: Point, radius: number): Viewport {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * factor));
  const ratio = zoom / view.zoom;
  return clampPan(
    zoom,
    anchor.x - (anchor.x - view.panX) * ratio,
    anchor.y - (anchor.y - view.panY) * ratio,
    radius
  );
}

export function zoomIn(view: Viewport, radius: number): Viewport {
  return zoomTo(view, view.zoom * ZOOM_STEP, radius);
}

export function zoomOut(view: Viewport, radius: number): Viewport {
  return zoomTo(view, view.zoom / ZOOM_STEP, radius);
}

export function canZoomIn(view: Viewport): boolean {
  return view.zoom < MAX_ZOOM;
}

export function canZoomOut(view: Viewport): boolean {
  return view.zoom > MIN_ZOOM;
}

export function panBy(view: Viewport, dx: number, dy: number, radius: number): Viewport {
  return clampPan(view.zoom, view.panX + dx, view.panY + dy, radius);
}

// 요청한 이동(dx, dy)에 비해 실제로 움직인 거리가 절반 미만이면 막힌 것으로 본다.
// 이동 한계에 닿았거나 1배라서 이동할 수 없을 때가 해당한다. 한계선을 따라 미끄러지는 움직임은 막힌 것이 아니다.
export function isPanBlocked(before: Viewport, after: Viewport, dx: number, dy: number): boolean {
  const requested = Math.hypot(dx, dy);
  if (requested === 0) return false;
  const moved = Math.hypot(after.panX - before.panX, after.panY - before.panY);
  return moved < requested / 2;
}

export function screenToChart(point: Point, view: Viewport): Point {
  return { x: (point.x - view.panX) / view.zoom, y: (point.y - view.panY) / view.zoom };
}
