import { describe, expect, it } from "vitest";

import { projectToChart } from "@/features/starmap/sky-math";
import {
  DEFAULT_DEGREES_PER_PIXEL,
  IDENTITY_ORIENTATION,
  applyOrientation,
  degreesPerPixel,
  horizontalToVector,
  orientationToCenter,
  rotateOrientation,
  viewCenter,
} from "@/features/starmap/sphere-orientation";

// 1px당 0.4도이므로 225px = 90도.
const QUARTER_TURN_PX = 225;

function expectVector(actual: number[], expected: number[]) {
  expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value, 8));
}

describe("horizontalToVector", () => {
  it("천정은 화면 쪽(0,0,1), 북쪽 지평선은 위(0,-1,0), 동쪽 지평선은 왼쪽(-1,0,0)이다", () => {
    expectVector(horizontalToVector({ alt: 90, az: 0 }), [0, 0, 1]);
    expectVector(horizontalToVector({ alt: 0, az: 0 }), [0, -1, 0]);
    expectVector(horizontalToVector({ alt: 0, az: 90 }), [-1, 0, 0]);
  });

  it("남쪽은 아래, 서쪽은 오른쪽, 천저는 화면 안쪽(0,0,-1)이다", () => {
    expectVector(horizontalToVector({ alt: 0, az: 180 }), [0, 1, 0]);
    expectVector(horizontalToVector({ alt: 0, az: 270 }), [1, 0, 0]);
    expectVector(horizontalToVector({ alt: -90, az: 0 }), [0, 0, -1]);
  });
});

describe("degreesPerPixel", () => {
  it("확대 배율이 커질수록 같은 거리를 끌어도 덜 돌도록 배율에 반비례한다", () => {
    expect(degreesPerPixel(167, 4)).toBeCloseTo(degreesPerPixel(167, 2) / 2, 8);
    expect(degreesPerPixel(167, 8)).toBeLessThan(degreesPerPixel(167, 1));
  });

  it("하늘 원이 클수록(반지름이 클수록) 덜 돈다", () => {
    expect(degreesPerPixel(200, 2)).toBeLessThan(degreesPerPixel(100, 2));
  });

  it("화면 크기를 아직 모르면(반지름이 0 이하) 기본 값으로 돈다", () => {
    expect(degreesPerPixel(-28, 1)).toBe(DEFAULT_DEGREES_PER_PIXEL);
    expect(degreesPerPixel(0, 3)).toBe(DEFAULT_DEGREES_PER_PIXEL);
  });

  it("어느 배율에서든 화면 가운데 근처의 별이 포인터와 거의 같은 거리만큼 따라온다", () => {
    const radius = 167;
    const dragPx = 10;
    const star = { alt: 89, az: 0 }; // 가운데 바로 옆의 별

    for (const zoom of [1, 2.2, 4, 8]) {
      const before = projectToChart(star, radius, IDENTITY_ORIENTATION);
      const turned = rotateOrientation(
        IDENTITY_ORIENTATION,
        dragPx,
        0,
        degreesPerPixel(radius, zoom)
      );
      const after = projectToChart(star, radius, turned);
      const movedPx = Math.hypot(after.x - before.x, after.y - before.y) * zoom;

      expect(movedPx / dragPx).toBeGreaterThan(0.93);
      expect(movedPx / dragPx).toBeLessThan(1.07);
    }
  });
});

describe("orientationToCenter", () => {
  const targets = [
    { alt: 90, az: 0 },
    { alt: 45, az: 120 },
    { alt: 0, az: 90 },
    { alt: -30, az: 200 },
    { alt: -75, az: 300 },
    { alt: 10, az: 359 },
    { alt: -90, az: 0 },
  ];

  it("그 방향이 화면 가운데에 오도록 돌린다", () => {
    for (const target of targets) {
      const m = orientationToCenter(target);
      expectVector(applyOrientation(m, horizontalToVector(target)), [0, 0, 1]);

      const center = viewCenter(m);
      expect(center.alt).toBeCloseTo(target.alt, 6);
      // 천정·천저에서는 방위가 정해지지 않으므로 고도가 ±90이 아닐 때만 방위를 비교한다.
      if (Math.abs(target.alt) < 89.9) expect(center.az).toBeCloseTo(target.az, 6);
    }
  });

  it("이미 천정을 보고 있으면 돌리지 않은 것과 같다", () => {
    const m = orientationToCenter({ alt: 90, az: 123 });
    m.forEach((value, i) => expect(value).toBeCloseTo(IDENTITY_ORIENTATION[i], 8));
  });

  it("돌려도 길이는 변하지 않는 회전이다 (행렬식 1, 직교)", () => {
    for (const target of targets) {
      const m = orientationToCenter(target);
      const det =
        m[0] * (m[4] * m[8] - m[5] * m[7]) -
        m[1] * (m[3] * m[8] - m[5] * m[6]) +
        m[2] * (m[3] * m[7] - m[4] * m[6]);
      expect(det).toBeCloseTo(1, 8);
    }
  });
});

describe("rotateOrientation", () => {
  it("돌리지 않은 처음에는 벡터가 그대로이고 보는 방향은 천정이다", () => {
    expectVector(applyOrientation(IDENTITY_ORIENTATION, [0.3, -0.4, 0.5]), [0.3, -0.4, 0.5]);
    expect(viewCenter(IDENTITY_ORIENTATION).alt).toBeCloseTo(90, 8);
  });

  it("오른쪽으로 끌면 왼쪽(동쪽)에 있던 하늘이 가운데로 온다", () => {
    const turned = rotateOrientation(IDENTITY_ORIENTATION, QUARTER_TURN_PX, 0);

    // 동쪽 지평선이 화면 가운데로, 천정은 오른쪽 가장자리로 간다.
    expectVector(applyOrientation(turned, horizontalToVector({ alt: 0, az: 90 })), [0, 0, 1]);
    expectVector(applyOrientation(turned, horizontalToVector({ alt: 90, az: 0 })), [1, 0, 0]);
    const center = viewCenter(turned);
    expect(center.alt).toBeCloseTo(0, 8);
    expect(center.az).toBeCloseTo(90, 8);
  });

  it("아래로 끌면 위쪽(북쪽)에 있던 하늘이 가운데로 온다", () => {
    const turned = rotateOrientation(IDENTITY_ORIENTATION, 0, QUARTER_TURN_PX);

    const center = viewCenter(turned);
    expect(center.alt).toBeCloseTo(0, 8);
    expect(center.az).toBeCloseTo(0, 8);
  });

  it("위로 끌면 남쪽 하늘이, 왼쪽으로 끌면 서쪽 하늘이 가운데로 온다", () => {
    const up = viewCenter(rotateOrientation(IDENTITY_ORIENTATION, 0, -QUARTER_TURN_PX));
    expect(up.alt).toBeCloseTo(0, 8);
    expect(up.az).toBeCloseTo(180, 8);

    const left = viewCenter(rotateOrientation(IDENTITY_ORIENTATION, -QUARTER_TURN_PX, 0));
    expect(left.alt).toBeCloseTo(0, 8);
    expect(left.az).toBeCloseTo(270, 8);
  });

  it("지평선 아래까지 돌리면 천저 쪽 하늘이 가운데로 온다", () => {
    const turned = rotateOrientation(IDENTITY_ORIENTATION, 2 * QUARTER_TURN_PX, 0);

    expect(viewCenter(turned).alt).toBeCloseTo(-90, 8);
  });

  it("천정이나 천저를 바라보면 방위는 북쪽(0°)으로 둔다", () => {
    expect(viewCenter(IDENTITY_ORIENTATION)).toEqual({ alt: 90, az: 0 });
    expect(viewCenter(rotateOrientation(IDENTITY_ORIENTATION, 0, 2 * QUARTER_TURN_PX)).az).toBe(0);
  });

  it("끌지 않으면 바뀌지 않고, 나눠서 끌어도 한 번에 끈 것과 같다", () => {
    expect(rotateOrientation(IDENTITY_ORIENTATION, 0, 0)).toEqual(IDENTITY_ORIENTATION);

    const half = rotateOrientation(IDENTITY_ORIENTATION, QUARTER_TURN_PX / 2, 0);
    const twice = rotateOrientation(half, QUARTER_TURN_PX / 2, 0);
    const once = rotateOrientation(IDENTITY_ORIENTATION, QUARTER_TURN_PX, 0);
    once.forEach((value, i) => expect(twice[i]).toBeCloseTo(value, 8));
  });

  it("돌려도 벡터의 길이는 변하지 않는다", () => {
    const turned = rotateOrientation(rotateOrientation(IDENTITY_ORIENTATION, 80, -30), -20, 140);
    const v = applyOrientation(turned, horizontalToVector({ alt: 33, az: 210 }));

    expect(Math.hypot(...v)).toBeCloseTo(1, 8);
  });
});
