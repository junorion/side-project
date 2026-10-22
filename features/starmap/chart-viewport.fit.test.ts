import { describe, expect, it } from "vitest";

import { MAX_ZOOM, fitZoom } from "@/features/starmap/chart-viewport";

const MARGIN = 28;

describe("fitZoom", () => {
  it("세로로 긴 화면에서는 하늘 원의 위아래가 화면 위아래에 닿는 배율이다", () => {
    const zoom = fitZoom(390, 845, MARGIN);
    // 원 반지름 = 195 − 28, 맞출 반지름 = 422.5 − 28
    expect(zoom).toBeCloseTo((845 - 2 * MARGIN) / (390 - 2 * MARGIN), 8);
    expect(zoom).toBeGreaterThan(2);
  });

  it("정사각형이거나 가로로 넓은 화면은 1배다", () => {
    expect(fitZoom(600, 600, MARGIN)).toBe(1);
    expect(fitZoom(800, 400, MARGIN)).toBe(1);
  });

  it("너무 길쭉한 화면도 최대 배율을 넘지 않는다", () => {
    expect(fitZoom(100, 5000, MARGIN)).toBe(MAX_ZOOM);
  });

  it("아직 크기를 모르면 1배다", () => {
    expect(fitZoom(0, 0, MARGIN)).toBe(1);
  });
});
