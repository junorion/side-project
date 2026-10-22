export type StarFeature = {
  geometry: { coordinates: [number, number] };
  properties: { mag: number };
};

export type ConstellationLineFeature = {
  id: string;
  geometry: { coordinates: number[][][] };
};

export type ConstellationFeature = {
  id: string;
  properties: { ko: string; en: string };
  geometry: { coordinates: [number, number] };
};

export type StarmapData = {
  stars: StarFeature[];
  lines: ConstellationLineFeature[];
  constellations: ConstellationFeature[];
  descriptions: Record<string, string>;
};

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

export async function loadStarmapData(): Promise<StarmapData> {
  const [stars, lines, constellations, descriptions] = await Promise.all([
    fetchJson<{ features: StarFeature[] }>("/data/stars.6.json"),
    fetchJson<{ features: ConstellationLineFeature[] }>("/data/constellations.lines.json"),
    fetchJson<{ features: ConstellationFeature[] }>("/data/constellations.json"),
    fetchJson<Record<string, string>>("/data/descriptions.json"),
  ]);

  return {
    stars: stars.features,
    lines: lines.features,
    constellations: constellations.features,
    descriptions,
  };
}
