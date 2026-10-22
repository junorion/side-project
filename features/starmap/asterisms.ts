import { horizontalCoords, projectToChart, type Point, type SkyView } from "@/features/starmap/sky-math";

export type AsterismStar = { name: string; ra: number; dec: number };
// 꼭짓점을 순서대로 이어 마지막 별에서 첫 별로 닫는 도형.
export type Asterism = { id: string; name: string; stars: AsterismStar[] };

// 별자리를 찾을 때 길잡이가 되는 계절별 지표 도형. 좌표는 J2000 RA/Dec(도).
export const ASTERISMS: Asterism[] = [
  {
    id: "spring-triangle",
    name: "봄의 대삼각형",
    stars: [
      { name: "아르크투루스", ra: 213.9153, dec: 19.1824 },
      { name: "스피카", ra: 201.2983, dec: -11.1613 },
      { name: "데네볼라", ra: 177.2649, dec: 14.5721 },
    ],
  },
  {
    id: "summer-triangle",
    name: "여름의 대삼각형",
    stars: [
      { name: "베가", ra: 279.2347, dec: 38.7837 },
      { name: "데네브", ra: 310.358, dec: 45.2803 },
      { name: "알타이르", ra: 297.6958, dec: 8.8683 },
    ],
  },
  {
    id: "autumn-square",
    name: "가을의 대사각형",
    stars: [
      { name: "마르카브", ra: 346.1902, dec: 15.2053 },
      { name: "셰아트", ra: 345.9436, dec: 28.0828 },
      { name: "알페라츠", ra: 2.0969, dec: 29.0904 },
      { name: "알게니브", ra: 3.309, dec: 15.1836 },
    ],
  },
  {
    id: "winter-triangle",
    name: "겨울의 대삼각형",
    stars: [
      { name: "베텔게우스", ra: 88.7929, dec: 7.4071 },
      { name: "시리우스", ra: 101.2872, dec: -16.7161 },
      { name: "프로키온", ra: 114.8255, dec: 5.225 },
    ],
  },
];

export type ProjectedAsterisms = {
  edges: { a: Point; b: Point }[];
  stars: (Point & { name: string })[];
  labels: (Point & { name: string })[];
};

// 지평선 위에 있는 꼭짓점과 그 사이의 변만 화면 좌표로 바꾼다.
// 도형 이름은 보이는 꼭짓점들의 가운데에 둔다.
export function projectAsterisms(asterisms: Asterism[], view: SkyView): ProjectedAsterisms {
  const result: ProjectedAsterisms = { edges: [], stars: [], labels: [] };

  for (const asterism of asterisms) {
    const points = asterism.stars.map((star) => {
      const horizontal = horizontalCoords(star, view);
      return horizontal.alt > 0
        ? { name: star.name, ...projectToChart(horizontal, view.radius, view.orientation) }
        : null;
    });

    points.forEach((a, i) => {
      const b = points[(i + 1) % points.length];
      if (a && b) result.edges.push({ a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } });
    });

    const visible = points.filter((p) => p !== null);
    if (visible.length === 0) continue;
    result.stars.push(...visible);
    result.labels.push({
      name: asterism.name,
      x: visible.reduce((sum, p) => sum + p.x, 0) / visible.length,
      y: visible.reduce((sum, p) => sum + p.y, 0) / visible.length,
    });
  }

  return result;
}
