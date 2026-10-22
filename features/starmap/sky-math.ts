const DEG = Math.PI / 180;

export type EquatorialCoords = { ra: number; dec: number };
export type HorizontalCoords = { alt: number; az: number };
export type Point = { x: number; y: number };
export type ChartSegment = { id: string; a: Point; b: Point };

export type SkyView = { lstDeg: number; latDeg: number; radius: number };

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

// 입체투영. 중심이 천정, 테두리가 지평선이며 위쪽이 북, 왼쪽이 동이다.
export function projectToChart({ alt, az }: HorizontalCoords, radius: number): Point {
  const r = radius * Math.tan(((90 - alt) * DEG) / 2);
  return { x: -r * Math.sin(az * DEG), y: -r * Math.cos(az * DEG) };
}

export function starSize(mag: number): number {
  return Math.max(0.5, 3.5 - 0.6 * mag);
}

// 끝점이 모두 지평선 위에 있는 선분만 화면 좌표로 바꿔 돌려준다.
export function projectConstellationLines(
  features: ConstellationLines[],
  { lstDeg, latDeg, radius }: SkyView
): ChartSegment[] {
  const segments: ChartSegment[] = [];

  for (const { id, geometry } of features) {
    for (const line of geometry.coordinates) {
      for (let i = 0; i < line.length - 1; i++) {
        const a = horizontalCoords({ ra: line[i][0], dec: line[i][1] }, { lstDeg, latDeg });
        const b = horizontalCoords({ ra: line[i + 1][0], dec: line[i + 1][1] }, { lstDeg, latDeg });
        if (a.alt <= 0 || b.alt <= 0) continue;
        segments.push({ id, a: projectToChart(a, radius), b: projectToChart(b, radius) });
      }
    }
  }

  return segments;
}

// 지평선 위에 그려지는 선분이 하나라도 있는 별자리의 ID 집합.
export function visibleConstellationIds(
  features: ConstellationLines[],
  { lstDeg, latDeg }: { lstDeg: number; latDeg: number }
): Set<string> {
  const segments = projectConstellationLines(features, { lstDeg, latDeg, radius: 1 });
  return new Set(segments.map(({ id }) => id));
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
