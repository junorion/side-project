export function formatCoordinates(latDeg: number, lonDeg: number): string {
  const lat = `${latDeg >= 0 ? "북위" : "남위"} ${Math.abs(latDeg).toFixed(2)}°`;
  const lon = `${lonDeg >= 0 ? "동경" : "서경"} ${Math.abs(lonDeg).toFixed(2)}°`;
  return `${lat} · ${lon}`;
}
