import { describe, expect, it } from "vitest";

import {
  findConstellationAt,
  horizontalCoords,
  projectConstellationLines,
  projectToChart,
  starSize,
  visibleConstellationIds,
} from "@/features/starmap/sky-math";

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

describe("starSize", () => {
  it("밝을수록 크고 6등급은 최소 크기로 고정된다", () => {
    expect(starSize(0)).toBeCloseTo(3.5, 8);
    expect(starSize(1.97)).toBeCloseTo(3.5 - 0.6 * 1.97, 8);
    expect(starSize(6)).toBe(0.5);
  });
});

describe("projectConstellationLines", () => {
  const view = { lstDeg: 100, latDeg: SEOUL_LAT, radius: 100 };

  it("끝점이 모두 지평선 위에 있는 선분만 남긴다", () => {
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

    expect(segments).toHaveLength(1);
    expect(segments[0].id).toBe("Tst");
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

describe("visibleConstellationIds", () => {
  const sky = { lstDeg: 100, latDeg: SEOUL_LAT };

  it("지평선 위에 그릴 선분이 있는 별자리만 보인다고 판단한다", () => {
    const ids = visibleConstellationIds(
      [
        { id: "Up", geometry: { coordinates: [[[100, 40], [110, 20]]] } },
        { id: "Down", geometry: { coordinates: [[[280, -40], [290, -20]]] } },
      ],
      sky
    );

    expect(ids.has("Up")).toBe(true);
    expect(ids.has("Down")).toBe(false);
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
