import { describe, expect, it } from "vitest";

import { ASTERISMS, projectAsterisms, type Asterism } from "@/features/starmap/asterisms";
import { IDENTITY_ORIENTATION, rotateOrientation } from "@/features/starmap/sphere-orientation";

const SEOUL_LAT = 37.5;
const RADIUS = 100;
const summer = ASTERISMS.filter((a) => a.id === "summer-triangle");

describe("ASTERISMS", () => {
  it("계절별 지표 도형 네 가지를 담고 있다", () => {
    expect(ASTERISMS.map((a) => [a.name, a.stars.length])).toEqual([
      ["봄의 대삼각형", 3],
      ["여름의 대삼각형", 3],
      ["가을의 대사각형", 4],
      ["겨울의 대삼각형", 3],
    ]);
  });
});

describe("projectAsterisms", () => {
  it("모든 꼭짓점이 지평선 위면 닫힌 도형의 변, 별 이름, 도형 이름을 모두 돌려준다", () => {
    // 지방항성시 295도(약 19시 40분)에는 여름의 대삼각형이 서울 하늘 높이 떠 있다.
    const result = projectAsterisms(summer, { lstDeg: 295, latDeg: SEOUL_LAT, radius: RADIUS });

    expect(result.edges).toHaveLength(3);
    expect(result.stars.map((s) => s.name)).toEqual(["베가", "데네브", "알타이르"]);
    expect(result.labels).toHaveLength(1);
    expect(result.labels[0].name).toBe("여름의 대삼각형");

    const cx = result.stars.reduce((sum, s) => sum + s.x, 0) / 3;
    const cy = result.stars.reduce((sum, s) => sum + s.y, 0) / 3;
    expect(result.labels[0].x).toBeCloseTo(cx, 8);
    expect(result.labels[0].y).toBeCloseTo(cy, 8);
  });

  it("하늘을 돌리면 지표별도 함께 움직이고, 보이는 별의 수는 그대로다", () => {
    const view = { lstDeg: 295, latDeg: SEOUL_LAT, radius: RADIUS };
    const plain = projectAsterisms(summer, view);
    const turned = projectAsterisms(summer, {
      ...view,
      orientation: rotateOrientation(IDENTITY_ORIENTATION, 100, 50),
    });

    expect(turned.stars).toHaveLength(plain.stars.length);
    expect(turned.stars[0].x).not.toBeCloseTo(plain.stars[0].x, 3);
  });

  it("꼭짓점이 모두 지평선 아래면 아무것도 그리지 않는다", () => {
    // 반대편 시각(지방항성시 115도)에는 세 별 모두 서울 지평선 아래에 있다.
    const result = projectAsterisms(summer, { lstDeg: 115, latDeg: SEOUL_LAT, radius: RADIUS });

    expect(result).toEqual({ edges: [], stars: [], labels: [] });
  });

  it("지평선 아래 별과 그 별에 이어진 변은 빼고, 이름은 보이는 별의 가운데에 둔다", () => {
    const lstDeg = 100;
    const partial: Asterism[] = [
      {
        id: "test",
        name: "시험 도형",
        stars: [
          { name: "A", ra: lstDeg, dec: 40 },
          { name: "B", ra: lstDeg, dec: 20 },
          { name: "C", ra: lstDeg + 180, dec: -60 },
        ],
      },
    ];

    const result = projectAsterisms(partial, { lstDeg, latDeg: SEOUL_LAT, radius: RADIUS });

    expect(result.edges).toHaveLength(1);
    expect(result.stars.map((s) => s.name)).toEqual(["A", "B"]);
    expect(result.labels[0].x).toBeCloseTo((result.stars[0].x + result.stars[1].x) / 2, 8);
    expect(result.labels[0].y).toBeCloseTo((result.stars[0].y + result.stars[1].y) / 2, 8);
  });
});
