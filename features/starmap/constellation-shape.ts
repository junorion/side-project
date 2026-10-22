export type ShapeSegment = { x1: number; y1: number; x2: number; y2: number };
export type ShapePoint = { x: number; y: number };
export type ConstellationShape = { segments: ShapeSegment[]; points: ShapePoint[] };

const DEG = Math.PI / 180;
const BOX = 100;

// 적경 차이를 −180~180도 범위의 좁은 쪽 값으로 바꾼다.
function wrapRa(delta: number): number {
  return ((((delta + 180) % 360) + 360) % 360) - 180;
}

// 별자리 선(RA/Dec 도)을 100×100 상자 안의 그림 좌표로 바꾼다.
// 올려다본 하늘처럼 북쪽이 위, 동쪽이 왼쪽이고 가로세로 비율을 유지한다.
export function constellationShape(lines: number[][][]): ConstellationShape {
  const coords = lines.flat();
  if (coords.length === 0) return { segments: [], points: [] };

  const ra0 = coords[0][0];
  const decs = coords.map(([, dec]) => dec);
  const cosDec = Math.cos(((Math.min(...decs) + Math.max(...decs)) / 2) * DEG);

  const project = ([ra, dec]: number[]): ShapePoint => ({
    x: -wrapRa(ra - ra0) * cosDec,
    y: -dec,
  });

  const projected = coords.map(project);
  const xs = projected.map((p) => p.x);
  const ys = projected.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const width = Math.max(...xs) - minX;
  const height = Math.max(...ys) - minY;
  const scale = Math.max(width, height) === 0 ? 1 : BOX / Math.max(width, height);
  const offsetX = (BOX - width * scale) / 2;
  const offsetY = (BOX - height * scale) / 2;

  const fit = (coord: number[]): ShapePoint => {
    const p = project(coord);
    return { x: (p.x - minX) * scale + offsetX, y: (p.y - minY) * scale + offsetY };
  };

  const segments: ShapeSegment[] = [];
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = fit(line[i]);
      const b = fit(line[i + 1]);
      segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }

  const seen = new Set<string>();
  const points: ShapePoint[] = [];
  for (const coord of coords) {
    const key = `${coord[0]},${coord[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push(fit(coord));
  }

  return { segments, points };
}
