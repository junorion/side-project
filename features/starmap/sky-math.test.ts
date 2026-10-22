import { describe, expect, it } from "vitest";

import {
  constellationExtents,
  constellationStarKeys,
  findConstellationAt,
  isConstellationStar,
  isLargeEnough,
  horizontalCoords,
  isOnChart,
  projectAltitudeRing,
  projectConstellationLines,
  projectToChart,
  starSize,
} from "@/features/starmap/sky-math";
import { IDENTITY_ORIENTATION, rotateOrientation } from "@/features/starmap/sphere-orientation";

const SEOUL_LAT = 37.5;

describe("horizontalCoords", () => {
  it("북극성의 고도는 어느 시각이든 관측지 위도와 거의 같다", () => {
    for (const lstDeg of [0, 90, 180, 270]) {
      const { alt } = horizontalCoords(
        { ra: 37.95, dec: 89.26 },
        { lstDeg, latDeg: SEOUL_LAT }
      );
      // 북극성은 천구 북극에서 약 0.74° 떨어져 있어 고도가 위도 ±0.74° 안에서 움직인다.
      expect(Math.abs(alt - SEOUL_LAT)).toBeLessThan(1);
    }
  });

  it("적위가 위도와 같고 자오선 위에 있으면 천정(고도 90°)이다", () => {
    const { alt } = horizontalCoords(
      { ra: 100, dec: SEOUL_LAT },
      { lstDeg: 100, latDeg: SEOUL_LAT }
    );
    expect(alt).toBeCloseTo(90, 5);
  });

  it("적도 위의 천체가 남중하면 정남쪽(방위 180°)에 위도 보각만큼 떠 있다", () => {
    const { alt, az } = horizontalCoords(
      { ra: 100, dec: 0 },
      { lstDeg: 100, latDeg: SEOUL_LAT }
    );
    expect(alt).toBeCloseTo(90 - SEOUL_LAT, 5);
    expect(az).toBeCloseTo(180, 5);
  });

  it("적도 위의 천체가 막 떠오를 때는 정동쪽(방위 90°) 지평선에 있다", () => {
    const { alt, az } = horizontalCoords(
      { ra: 100, dec: 0 },
      { lstDeg: 10, latDeg: SEOUL_LAT }
    );
    expect(alt).toBeCloseTo(0, 5);
    expect(az).toBeCloseTo(90, 5);
  });

  it("RA가 −180~180 범위로 와도 같은 결과를 낸다", () => {
    const a = horizontalCoords(
      { ra: -120, dec: 20 },
      { lstDeg: 30, latDeg: SEOUL_LAT }
    );
    const b = horizontalCoords(
      { ra: 240, dec: 20 },
      { lstDeg: 30, latDeg: SEOUL_LAT }
    );
    expect(a.alt).toBeCloseTo(b.alt, 8);
    expect(a.az).toBeCloseTo(b.az, 8);
  });
});

describe("projectToChart", () => {
  const R = 100;

  it("천정은 원의 중심이다", () => {
    const p = projectToChart({ alt: 90, az: 123 }, R);
    expect(p.x).toBeCloseTo(0, 8);
    expect(p.y).toBeCloseTo(0, 8);
  });

  it("북쪽 지평선은 위쪽 테두리다", () => {
    const p = projectToChart({ alt: 0, az: 0 }, R);
    expect(p.x).toBeCloseTo(0, 8);
    expect(p.y).toBeCloseTo(-R, 8);
  });

  it("동쪽 지평선은 왼쪽 테두리다", () => {
    const p = projectToChart({ alt: 0, az: 90 }, R);
    expect(p.x).toBeCloseTo(-R, 8);
    expect(p.y).toBeCloseTo(0, 8);
  });

  it("남쪽은 아래, 서쪽은 오른쪽이다", () => {
    expect(projectToChart({ alt: 0, az: 180 }, R).y).toBeCloseTo(R, 8);
    expect(projectToChart({ alt: 0, az: 270 }, R).x).toBeCloseTo(R, 8);
  });

  it("입체투영 거리를 따른다 (고도 45°는 R·tan(22.5°))", () => {
    const p = projectToChart({ alt: 45, az: 0 }, R);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(R * Math.tan(Math.PI / 8), 8);
  });
});

describe("projectToChart 하늘 돌리기와 지평선 아래", () => {
  const R = 100;
  // 오른쪽으로 225px(= 90도) 끌어 동쪽 하늘이 가운데로 오게 한 상태.
  const turnedRight = rotateOrientation(IDENTITY_ORIENTATION, 225, 0);

  it("오른쪽으로 끌면 동쪽 지평선이 가운데로, 천정이 오른쪽 가장자리로 간다", () => {
    const east = projectToChart({ alt: 0, az: 90 }, R, turnedRight);
    expect(east.x).toBeCloseTo(0, 8);
    expect(east.y).toBeCloseTo(0, 8);

    const zenith = projectToChart({ alt: 90, az: 0 }, R, turnedRight);
    expect(zenith.x).toBeCloseTo(R, 8);
    expect(zenith.y).toBeCloseTo(0, 8);
  });

  it("끄는 방향에 수직인 축은 움직이지 않는다 (북쪽 지평선은 위쪽 그대로)", () => {
    const north = projectToChart({ alt: 0, az: 0 }, R, turnedRight);
    expect(north.x).toBeCloseTo(0, 8);
    expect(north.y).toBeCloseTo(-R, 8);
  });

  it("지평선 아래 하늘은 하늘 원 바깥으로 이어진다 (고도 −30도는 반지름의 약 1.73배)", () => {
    const p = projectToChart({ alt: -30, az: 0 }, R);
    expect(p.x).toBeCloseTo(0, 8);
    expect(p.y).toBeCloseTo(-R * Math.tan((120 * Math.PI) / 360), 8);
  });

  it("보는 방향의 정반대(천구의 반대편)는 무한히 멀어서 화면에 둘 수 없다", () => {
    const nadir = projectToChart({ alt: -90, az: 0 }, R);
    expect(isOnChart(nadir, R)).toBe(false);
    expect(isOnChart(projectToChart({ alt: 10, az: 40 }, R), R)).toBe(true);
    expect(isOnChart(projectToChart({ alt: -30, az: 40 }, R), R)).toBe(true);
  });

  it("방향을 주지 않으면 돌리지 않은 것과 같다", () => {
    expect(projectToChart({ alt: 20, az: 70 }, R)).toEqual(
      projectToChart({ alt: 20, az: 70 }, R, IDENTITY_ORIENTATION)
    );
  });
});

describe("projectAltitudeRing", () => {
  const R = 100;

  it("돌리지 않았을 때 지평선은 반지름 R인 하나로 이어진 닫힌 원이다", () => {
    const runs = projectAltitudeRing(0, R, IDENTITY_ORIENTATION);

    expect(runs).toHaveLength(1);
    expect(runs[0].every((p) => Math.abs(Math.hypot(p.x, p.y) - R) < 1e-8)).toBe(true);
    expect(runs[0][0].x).toBeCloseTo(runs[0][runs[0].length - 1].x, 8);
    expect(runs[0][0].y).toBeCloseTo(runs[0][runs[0].length - 1].y, 8);
  });

  it("하늘을 돌리면 지평선은 가운데를 지나는 원이 된다", () => {
    const runs = projectAltitudeRing(0, R, rotateOrientation(IDENTITY_ORIENTATION, 225, 0));
    const distances = runs.flat().map((p) => Math.hypot(p.x, p.y));

    expect(Math.min(...distances)).toBeLessThan(1e-6);
  });

  it("화면에 둘 수 없을 만큼 먼 고리는 그리지 않는다", () => {
    expect(projectAltitudeRing(-80, R, IDENTITY_ORIENTATION)).toEqual([]);
  });

  it("고리가 화면 밖으로 나갔다 들어오면 이어진 구간별로 나눠 돌려준다", () => {
    // 지평선 아래 −60도 고리는 반지름의 약 3.7배라 돌려도 일부는 화면 한도(6배)를 넘나든다.
    const turned = rotateOrientation(IDENTITY_ORIENTATION, 150, 80);
    const runs = projectAltitudeRing(-60, R, turned);

    expect(runs.length).toBeGreaterThanOrEqual(1);
    for (const run of runs) {
      expect(run.length).toBeGreaterThanOrEqual(2);
      expect(run.every((p) => isOnChart(p, R))).toBe(true);
    }
  });
});

describe("starSize", () => {
  it("밝을수록 크고 6등급은 최소 크기로 고정된다", () => {
    expect(starSize(0)).toBeCloseTo(3.5, 8);
    expect(starSize(1.97)).toBeCloseTo(3.5 - 0.6 * 1.97, 8);
    expect(starSize(6)).toBe(0.5);
  });
});

describe("projectConstellationLines", () => {
  const view = { lstDeg: 100, latDeg: SEOUL_LAT, radius: 100 };

  it("지평선 아래로 걸친 선분도 위쪽 선분과 똑같이 포함한다", () => {
    const segments = projectConstellationLines(
      [
        {
          id: "Tst",
          geometry: {
            coordinates: [
              [
                [100, 40], // 천정 근처 (고도 약 87°)
                [110, 20], // 지평선 위
                [100, -80], // 지평선 아래
              ],
            ],
          },
        },
      ],
      view
    );

    expect(segments).toHaveLength(2);
    expect(segments.every((s) => s.id === "Tst")).toBe(true);
  });

  it("끝점이 화면에 둘 수 없을 만큼 먼 선분은 그리지 않는다", () => {
    // 지방항성시 100도, 위도 37.5도에서 (280, −37.5)는 정확히 천저(고도 −90도)다.
    const segments = projectConstellationLines(
      [{ id: "Tst", geometry: { coordinates: [[[280, -37.5], [281, -37]]] } }],
      view
    );

    expect(segments).toEqual([]);
  });

  it("하늘을 돌리면 선분의 화면 좌표가 바뀐다", () => {
    const lines = [{ id: "Tst", geometry: { coordinates: [[[100, 40], [110, 20]]] } }];
    const [plain] = projectConstellationLines(lines, view);
    const [turned] = projectConstellationLines(lines, {
      ...view,
      orientation: rotateOrientation(IDENTITY_ORIENTATION, 225, 0),
    });

    expect(turned.a).not.toEqual(plain.a);
  });

  it("각 선분에 별자리 ID와 화면 좌표 두 점을 담는다", () => {
    const [segment] = projectConstellationLines(
      [
        {
          id: "Tst",
          geometry: {
            coordinates: [
              [
                [100, 40],
                [110, 20],
              ],
            ],
          },
        },
      ],
      view
    );

    expect(Object.keys(segment).sort()).toEqual(["a", "b", "id"]);
    expect(Number.isFinite(segment.a.x + segment.a.y + segment.b.x + segment.b.y)).toBe(true);
  });
});

describe("constellationExtents", () => {
  it("별자리마다 선이 가로·세로 중 더 길게 뻗은 길이를 구한다", () => {
    const extents = constellationExtents([
      { id: "A", a: { x: 0, y: 0 }, b: { x: 30, y: 0 } },
      { id: "A", a: { x: 30, y: 0 }, b: { x: 30, y: 40 } },
      { id: "B", a: { x: 100, y: 100 }, b: { x: 104, y: 103 } },
    ]);

    expect(extents.get("A")).toBe(40);
    expect(extents.get("B")).toBe(4);
    expect(extents.size).toBe(2);
  });
});

describe("isLargeEnough", () => {
  it("차트 길이에 배율을 곱한 화면 길이가 기준 이상일 때만 충분히 크다고 본다", () => {
    expect(isLargeEnough(30, 1, 60)).toBe(false);
    expect(isLargeEnough(30, 2, 60)).toBe(true);
    expect(isLargeEnough(30, 1.99, 60)).toBe(false);
  });
});

describe("constellationStarKeys", () => {
  const features = [
    { id: "A", geometry: { coordinates: [[[10, 20], [11, 21]], [[11, 21], [12, 22]]] } },
    { id: "B", geometry: { coordinates: [[[100, -5], [101, -6]]] } },
  ];

  it("별자리 선의 꼭짓점 좌표를 중복 없이 모은다", () => {
    expect(constellationStarKeys(features).size).toBe(5);
  });

  it("꼭짓점과 좌표가 같은 별만 별자리에 속한 별로 판단한다", () => {
    const keys = constellationStarKeys(features);

    expect(isConstellationStar([11, 21], keys)).toBe(true);
    expect(isConstellationStar([100, -5], keys)).toBe(true);
    expect(isConstellationStar([11.0001, 21], keys)).toBe(false);
    expect(isConstellationStar([50, 50], keys)).toBe(false);
  });
});

describe("findConstellationAt", () => {
  const segments = [
    { id: "Aaa", a: { x: 0, y: 0 }, b: { x: 100, y: 0 } },
    { id: "Bbb", a: { x: 0, y: 30 }, b: { x: 100, y: 30 } },
  ];

  it("20px 이내의 가장 가까운 선분의 별자리를 고른다", () => {
    expect(findConstellationAt({ x: 50, y: 8 }, segments, 20)).toBe("Aaa");
    expect(findConstellationAt({ x: 50, y: 24 }, segments, 20)).toBe("Bbb");
  });

  it("선분 끝점 너머는 끝점까지의 거리로 판단한다", () => {
    expect(findConstellationAt({ x: 115, y: 0 }, segments, 20)).toBe("Aaa");
    expect(findConstellationAt({ x: 125, y: 0 }, segments, 20)).toBeNull();
  });

  it("20px 안에 선분이 없으면 null이다", () => {
    expect(findConstellationAt({ x: 50, y: 200 }, segments, 20)).toBeNull();
  });
});
