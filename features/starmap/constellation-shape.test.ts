import { describe, expect, it } from "vitest";

import { constellationShape } from "@/features/starmap/constellation-shape";

function range(values: number[]) {
  return Math.max(...values) - Math.min(...values);
}

describe("constellationShape", () => {
  it("선이 없으면 빈 모양이다", () => {
    expect(constellationShape([])).toEqual({ segments: [], points: [] });
  });

  it("가로로만 이어진 선은 가로 폭을 가득 채우고 세로 가운데에 놓인다", () => {
    const { segments } = constellationShape([[[10, 0], [20, 0]]]);
    const xs = segments.flatMap((s) => [s.x1, s.x2]);

    expect(range(xs)).toBeCloseTo(100, 6);
    expect(segments[0].y1).toBeCloseTo(50, 6);
    expect(segments[0].y2).toBeCloseTo(50, 6);
  });

  it("북쪽(적위가 큰 쪽)이 위쪽이다", () => {
    const { segments } = constellationShape([[[0, 0], [0, 10]]]);
    const [s] = segments;

    expect(s.y2).toBeLessThan(s.y1);
  });

  it("동쪽(적경이 큰 쪽)이 왼쪽이다", () => {
    const { segments } = constellationShape([[[10, 0], [20, 0]]]);
    const [s] = segments;

    expect(s.x2).toBeLessThan(s.x1);
  });

  it("적경이 0도를 넘나드는 별자리도 좁은 쪽으로 이어 붙인다", () => {
    const { segments } = constellationShape([
      [[359, 0], [1, 0]],
      [[1, 0], [1, 10]],
    ]);
    const xs = segments.flatMap((s) => [s.x1, s.x2]);
    const ys = segments.flatMap((s) => [s.y1, s.y2]);

    // 가로 2도(중간 적위 5도의 cos만큼 줄어듦), 세로 10도이므로 세로가 가득 차고 가로는 약 1/5이다.
    expect(range(ys)).toBeCloseTo(100, 6);
    expect(range(xs)).toBeCloseTo(20 * Math.cos((5 * Math.PI) / 180), 6);
  });

  it("가로세로 비율을 지킨다 (적위 60도에서는 적경 간격이 cos 만큼 줄어든다)", () => {
    const { segments } = constellationShape([[[0, 60], [20, 60], [20, 70]]]);
    const xs = segments.flatMap((s) => [s.x1, s.x2]);
    const ys = segments.flatMap((s) => [s.y1, s.y2]);

    const expectedWidth = 20 * Math.cos((65 * Math.PI) / 180);
    expect(range(xs) / range(ys)).toBeCloseTo(expectedWidth / 10, 6);
  });

  it("별은 선의 끝점마다 한 번씩만 돌려준다", () => {
    const { points } = constellationShape([
      [[0, 0], [10, 0], [10, 10]],
      [[10, 0], [20, 0]],
    ]);

    expect(points).toHaveLength(4);
  });
});
