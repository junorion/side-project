import { describe, expect, it } from "vitest";

import {
  IDENTITY_ORIENTATION,
  applyOrientation,
  horizontalToVector,
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
