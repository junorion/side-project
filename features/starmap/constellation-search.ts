type Searchable = { id: string; properties: { ko: string; en: string } };

const DEFAULT_LIMIT = 8;

// 입력한 글자가 한글 이름, 영문 이름, 약어에 들어 있는 별자리를 찾는다(대소문자 구분 없음).
// 이름이 입력으로 시작하는 별자리를 앞에, 그 외에 포함하는 별자리를 뒤에 두고,
// 각 묶음 안에서는 이름이 짧은(더 정확히 맞는) 순서로 정렬한다. 같은 별자리는 한 번만 나온다.
export function searchConstellations<T extends Searchable>(
  query: string,
  constellations: T[],
  limit = DEFAULT_LIMIT
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const seen = new Set<string>();
  const startsWith: T[] = [];
  const includes: T[] = [];

  for (const constellation of constellations) {
    if (seen.has(constellation.id)) continue;
    const fields = [
      constellation.properties.ko,
      constellation.properties.en,
      constellation.id,
    ].map((field) => field.toLowerCase());

    if (fields.some((field) => field.startsWith(needle))) {
      startsWith.push(constellation);
      seen.add(constellation.id);
    } else if (fields.some((field) => field.includes(needle))) {
      includes.push(constellation);
      seen.add(constellation.id);
    }
  }

  const byNameLength = (a: T, b: T) => a.properties.ko.length - b.properties.ko.length;
  return [...startsWith.sort(byNameLength), ...includes.sort(byNameLength)].slice(0, limit);
}
