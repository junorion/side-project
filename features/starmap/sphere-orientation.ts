// 하늘(천구)을 지구본처럼 돌려서 보는 방향을 바꾸기 위한 3×3 회전 행렬(행 우선, 길이 9).
//
// 화면 좌표계: x는 오른쪽, y는 아래, z는 화면 쪽이다. 처음(회전 전)에는 천정이 (0,0,1)로 화면 가운데,
// 북쪽 지평선이 위(0,-1,0), 동쪽 지평선이 왼쪽(-1,0,0)에 놓인다.
export type Orientation = readonly number[];
export type Vec3 = [number, number, number];

export const IDENTITY_ORIENTATION: Orientation = [1, 0, 0, 0, 1, 0, 0, 0, 1];

const DEG = Math.PI / 180;
// 화면 크기를 아직 모를 때 쓰는, 끈 거리 1px당 돌리는 기본 각도.
export const DEFAULT_DEGREES_PER_PIXEL = 0.4;

// 화면 가운데 근처의 별이 포인터와 같은 속도(1:1)로 따라오도록 하는, 끈 거리 1px당 돌리는 각도.
// 입체투영에서 가운데 근처는 1도당 (반지름 × 배율 × π/180 / 2)px 움직이므로 배율과 반지름에 반비례한다.
export function degreesPerPixel(radius: number, zoom: number): number {
  if (radius <= 0 || zoom <= 0) return DEFAULT_DEGREES_PER_PIXEL;
  return 360 / (Math.PI * radius * zoom);
}

// 고도·방위(도)를 화면 좌표계의 단위 벡터로 바꾼다.
export function horizontalToVector({ alt, az }: { alt: number; az: number }): Vec3 {
  const horizontal = Math.cos(alt * DEG);
  return [-horizontal * Math.sin(az * DEG), -horizontal * Math.cos(az * DEG), Math.sin(alt * DEG)];
}

export function applyOrientation(m: Orientation, [x, y, z]: Vec3): Vec3 {
  return [
    m[0] * x + m[1] * y + m[2] * z,
    m[3] * x + m[4] * y + m[5] * z,
    m[6] * x + m[7] * y + m[8] * z,
  ];
}

// (dx, dy)px만큼 끈 것처럼 하늘을 돌린다. 끄는 방향으로 하늘이 따라온다
// (화면 가운데에 있던 점이 끄는 방향으로 움직인다). degPerPx는 끈 거리 1px당 돌리는 각도다.
export function rotateOrientation(
  m: Orientation,
  dx: number,
  dy: number,
  degPerPx = DEFAULT_DEGREES_PER_PIXEL
): Orientation {
  const distance = Math.hypot(dx, dy);
  if (distance === 0) return m;

  const angle = distance * degPerPx * DEG;
  // 끄는 방향에 수직인 화면 평면 위의 축.
  return multiply(rotationAboutScreenAxis(-dy / distance, dx / distance, Math.cos(angle), Math.sin(angle)), m);
}

// 화면 평면 위의 단위 축 (ux, uy, 0)을 중심으로 돌리는 로드리게스 회전 행렬. c = cos, s = sin.
function rotationAboutScreenAxis(ux: number, uy: number, c: number, s: number): number[] {
  const t = 1 - c;
  return [
    c + t * ux * ux, t * ux * uy, s * uy,
    t * ux * uy, c + t * uy * uy, -s * ux,
    -s * uy, s * ux, c,
  ];
}

// 3×3 행렬 곱 a × b
function multiply(a: readonly number[], b: readonly number[]): number[] {
  const result: number[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      result.push(a[row * 3] * b[col] + a[row * 3 + 1] * b[3 + col] + a[row * 3 + 2] * b[6 + col]);
    }
  }
  return result;
}

// 고도·방위(도)의 방향이 화면 가운데에 오도록 하는 가장 작은 회전(처음 모습에서 그 방향으로 돌린 것).
export function orientationToCenter(target: { alt: number; az: number }): Orientation {
  const [vx, vy, vz] = horizontalToVector(target);
  const sin = Math.hypot(vx, vy);

  if (sin < 1e-9) {
    // 천정이면 돌릴 필요가 없고, 천저면 어느 축으로든 반 바퀴 돌린다.
    return vz > 0 ? IDENTITY_ORIENTATION : [1, 0, 0, 0, -1, 0, 0, 0, -1];
  }
  // v를 (0,0,1)로 보내는 축은 v × z = (vy, -vx, 0).
  return rotationAboutScreenAxis(vy / sin, -vx / sin, vz, sin);
}

// 지금 화면 가운데에 보이는 하늘의 고도·방위(도).
export function viewCenter(m: Orientation): { alt: number; az: number } {
  const [x, y, z] = [m[6], m[7], m[8]];
  const alt = Math.asin(Math.max(-1, Math.min(1, z))) / DEG;
  // 천정이나 천저를 바라보면 방위가 정해지지 않으므로 북쪽(0°)으로 둔다.
  if (Math.hypot(x, y) < 1e-9) return { alt, az: 0 };
  return { alt, az: (Math.atan2(-x, -y) / DEG + 360) % 360 };
}
