import {
  IDENTITY_ORIENTATION,
  applyOrientation,
  horizontalToVector,
  type Orientation,
} from "@/features/starmap/sphere-orientation";

const DEG = Math.PI / 180;

export type EquatorialCoords = { ra: number; dec: number };
export type HorizontalCoords = { alt: number; az: number };
export type Point = { x: number; y: number };
// hidden: 끝점 중 하나라도 지평선 아래에 있는 선분(살짝 어둡게 그린다).
export type ChartSegment = { id: string; a: Point; b: Point; hidden?: boolean };

export type SkyView = { lstDeg: number; latDeg: number; radius: number; orientation?: Orientation };

type ConstellationLines = {
  id: string;
  geometry: { coordinates: number[][][] };
};

// RA/Dec(도)를 관측지의 고도·방위(북=0°, 동=90°)로 바꾼다.
export function horizontalCoords(
  { ra, dec }: EquatorialCoords,
  { lstDeg, latDeg }: { lstDeg: number; latDeg: number }
): HorizontalCoords {
  const h = (lstDeg - ra) * DEG;
  const d = dec * DEG;
  const phi = latDeg * DEG;

  const sinAlt = Math.sin(d) * Math.sin(phi) + Math.cos(d) * Math.cos(phi) * Math.cos(h);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG;
  const az =
    Math.atan2(
      -Math.sin(h) * Math.cos(d),
      Math.sin(d) * Math.cos(phi) - Math.cos(d) * Math.sin(phi) * Math.cos(h)
    ) / DEG;

  return { alt, az: ((az % 360) + 360) % 360 };
}

// 입체투영. 처음에는 중심이 천정, 테두리(반지름)가 지평선이며 위쪽이 북, 왼쪽이 동이다.
// orientation으로 하늘을 돌리면 보는 방향이 바뀌고, 지평선 아래 하늘은 원 바깥으로 이어진다.
// 보는 방향의 정반대(천구의 반대편)는 무한히 멀어서 좌표가 Infinity가 된다.
export function projectToChart(
  coords: HorizontalCoords,
  radius: number,
  orientation: Orientation = IDENTITY_ORIENTATION
): Point {
  const [x, y, z] = applyOrientation(orientation, horizontalToVector(coords));
  const denominator = 1 + z;
  if (denominator < 1e-9) return { x: Infinity, y: Infinity };
  return { x: (radius * x) / denominator, y: (radius * y) / denominator };
}

// 하늘 원 반지름의 이 배수 밖은 화면 밖이라 그리지 않는다(선분이 끝없이 길어지는 것도 막는다).
const MAX_CHART_RADIUS_FACTOR = 6;

export function isOnChart(point: Point, radius: number): boolean {
  return Math.hypot(point.x, point.y) <= MAX_CHART_RADIUS_FACTOR * radius;
}

// 같은 고도의 점들을 이은 고리(지평선은 고도 0°)를 화면 좌표로 바꾼다.
// 화면에 둘 수 없는 점을 만나면 거기서 끊어, 이어진 구간(2점 이상)별로 나눠 돌려준다.
export function projectAltitudeRing(
  alt: number,
  radius: number,
  orientation: Orientation = IDENTITY_ORIENTATION,
  stepDeg = 3
): Point[][] {
  const runs: Point[][] = [];
  let run: Point[] = [];

  for (let az = 0; az <= 360; az += stepDeg) {
    const point = projectToChart({ alt, az }, radius, orientation);
    if (isOnChart(point, radius)) {
      run.push(point);
    } else {
      if (run.length >= 2) runs.push(run);
      run = [];
    }
  }
  if (run.length >= 2) runs.push(run);

  return runs;
}

// 북·동·남·서 글씨를 놓을 자리. 지평선 위의 해당 방위 지점에서 지평선의 바깥쪽,
// 곧 고도가 낮아지는 가려진 하늘 쪽으로 offset(차트 좌표)만큼 띄운다.
// 하늘을 돌려 지평선이 휘어도 글씨는 언제나 가려진 하늘 쪽에 붙는다. 놓을 수 없으면 null.
export function compassLabelPoint(
  az: number,
  radius: number,
  orientation: Orientation,
  offset: number
): Point | null {
  const edge = projectToChart({ alt: 0, az }, radius, orientation);
  const below = projectToChart({ alt: -2, az }, radius, orientation);
  if (!isOnChart(edge, radius) || !isOnChart(below, radius)) return null;

  const dx = below.x - edge.x;
  const dy = below.y - edge.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-9) return null;
  return { x: edge.x + (dx / length) * offset, y: edge.y + (dy / length) * offset };
}

export function starSize(mag: number): number {
  return Math.max(0.5, 3.5 - 0.6 * mag);
}

// 별자리 선을 화면 좌표의 선분으로 바꾼다. 지평선 아래 하늘의 선분도 포함하고 hidden으로 표시한다.
export function projectConstellationLines(
  features: ConstellationLines[],
  { lstDeg, latDeg, radius, orientation }: SkyView
): ChartSegment[] {
  const segments: ChartSegment[] = [];

  for (const { id, geometry } of features) {
    for (const line of geometry.coordinates) {
      for (let i = 0; i < line.length - 1; i++) {
        const a = horizontalCoords({ ra: line[i][0], dec: line[i][1] }, { lstDeg, latDeg });
        const b = horizontalCoords({ ra: line[i + 1][0], dec: line[i + 1][1] }, { lstDeg, latDeg });
        const pa = projectToChart(a, radius, orientation);
        const pb = projectToChart(b, radius, orientation);
        if (!isOnChart(pa, radius) || !isOnChart(pb, radius)) continue;
        segments.push({ id, a: pa, b: pb, hidden: a.alt <= 0 || b.alt <= 0 });
      }
    }
  }

  return segments;
}

// 별자리마다 그려지는 선분이 가로·세로 중 더 길게 뻗은 길이(차트 좌표).
export function constellationExtents(segments: ChartSegment[]): Map<string, number> {
  const bounds = new Map<string, { minX: number; maxX: number; minY: number; maxY: number }>();

  for (const { id, a, b } of segments) {
    const box = bounds.get(id) ?? { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    box.minX = Math.min(box.minX, a.x, b.x);
    box.maxX = Math.max(box.maxX, a.x, b.x);
    box.minY = Math.min(box.minY, a.y, b.y);
    box.maxY = Math.max(box.maxY, a.y, b.y);
    bounds.set(id, box);
  }

  const extents = new Map<string, number>();
  for (const [id, box] of bounds) {
    extents.set(id, Math.max(box.maxX - box.minX, box.maxY - box.minY));
  }
  return extents;
}

// 차트 길이를 배율만큼 키운 화면 길이가 minPx 이상이면 충분히 크다고 본다.
export function isLargeEnough(extent: number, zoom: number, minPx: number): boolean {
  return extent * zoom >= minPx;
}

const coordKey = ([ra, dec]: number[]) => `${ra},${dec}`;

// 별자리 선의 꼭짓점 좌표 집합. 별 데이터의 좌표와 같으면 그 별은 별자리에 속한 별이다.
export function constellationStarKeys(features: ConstellationLines[]): Set<string> {
  const keys = new Set<string>();
  for (const { geometry } of features) {
    for (const line of geometry.coordinates) {
      for (const coord of line) keys.add(coordKey(coord));
    }
  }
  return keys;
}

export function isConstellationStar(coord: number[], keys: Set<string>): boolean {
  return keys.has(coordKey(coord));
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// 클릭 지점에서 maxDistance 이내에 있는 가장 가까운 선분의 별자리 ID를 돌려준다.
export function findConstellationAt(
  point: Point,
  segments: ChartSegment[],
  maxDistance: number
): string | null {
  let bestId: string | null = null;
  let best = maxDistance;

  for (const { id, a, b } of segments) {
    const distance = distanceToSegment(point, a, b);
    if (distance <= best) {
      best = distance;
      bestId = id;
    }
  }

  return bestId;
}
