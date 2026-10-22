import { describe, expect, it } from "vitest";

import {
  INITIAL_VIEWPORT,
  MAX_ZOOM,
  MIN_ZOOM,
  canZoomIn,
  canZoomOut,
  panBy,
  screenToChart,
  zoomIn,
  zoomOut,
} from "@/features/starmap/chart-viewport";

const RADIUS = 100;

describe("zoom", () => {
  it("한 단계에 1.5배씩 확대하고 축소한다", () => {
    const zoomed = zoomIn(INITIAL_VIEWPORT, RADIUS);
    expect(zoomed.zoom).toBeCloseTo(1.5, 8);
    expect(zoomOut(zoomed, RADIUS).zoom).toBeCloseTo(1, 8);
  });

  it("1배보다 작아지지 않고 8배보다 커지지 않는다", () => {
    expect(zoomOut(INITIAL_VIEWPORT, RADIUS).zoom).toBe(MIN_ZOOM);

    let view = INITIAL_VIEWPORT;
    for (let i = 0; i < 20; i++) view = zoomIn(view, RADIUS);
    expect(view.zoom).toBe(MAX_ZOOM);
  });

  it("한계에서는 해당 방향의 확대·축소를 할 수 없다고 알린다", () => {
    expect(canZoomOut(INITIAL_VIEWPORT)).toBe(false);
    expect(canZoomIn(INITIAL_VIEWPORT)).toBe(true);
    expect(canZoomIn({ ...INITIAL_VIEWPORT, zoom: MAX_ZOOM })).toBe(false);
    expect(canZoomOut({ ...INITIAL_VIEWPORT, zoom: MAX_ZOOM })).toBe(true);
  });

  it("지금 화면 가운데에 보이던 지점을 그대로 가운데에 둔다", () => {
    const before = { zoom: 2, panX: 30, panY: -20 };
    const center = screenToChart({ x: 0, y: 0 }, before);

    const after = zoomIn(before, RADIUS);
    const centerAfter = screenToChart({ x: 0, y: 0 }, after);

    expect(centerAfter.x).toBeCloseTo(center.x, 8);
    expect(centerAfter.y).toBeCloseTo(center.y, 8);
  });

  it("1배로 돌아오면 이동량이 0으로 돌아온다", () => {
    const back = zoomOut({ zoom: 1.5, panX: 40, panY: 10 }, RADIUS);
    expect(back).toEqual({ zoom: 1, panX: 0, panY: 0 });
  });
});

describe("panBy", () => {
  it("1배에서는 하늘 전체가 이미 보이므로 이동하지 않는다", () => {
    expect(panBy(INITIAL_VIEWPORT, 30, 30, RADIUS)).toEqual(INITIAL_VIEWPORT);
  });

  it("확대한 상태에서는 끈 만큼 이동한다", () => {
    const moved = panBy({ zoom: 2, panX: 0, panY: 0 }, 30, -20, RADIUS);
    expect(moved).toEqual({ zoom: 2, panX: 30, panY: -20 });
  });

  it("하늘 원의 가장자리가 화면 가장자리를 넘어가지 않게 제한한다", () => {
    const moved = panBy({ zoom: 2, panX: 0, panY: 0 }, 1000, 0, RADIUS);
    // 최대 이동량 = 반지름 × (배율 − 1)
    expect(moved.panX).toBeCloseTo(RADIUS * (2 - 1), 8);
    expect(moved.panY).toBe(0);
  });
});

describe("screenToChart", () => {
  it("화면 좌표를 배율과 이동량을 걷어낸 지도 좌표로 바꾼다", () => {
    const p = screenToChart({ x: 50, y: 20 }, { zoom: 2, panX: 10, panY: 0 });
    expect(p.x).toBeCloseTo(20, 8);
    expect(p.y).toBeCloseTo(10, 8);
  });
});
