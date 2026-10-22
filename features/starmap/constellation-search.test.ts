import { describe, expect, it } from "vitest";

import { searchConstellations } from "@/features/starmap/constellation-search";

const make = (id: string, ko: string, en: string) => ({
  id,
  properties: { ko, en },
  geometry: { coordinates: [0, 0] as [number, number] },
});

const constellations = [
  make("Ori", "오리온자리", "Orion"),
  make("Oph", "뱀주인자리", "Ophiuchus"),
  make("Ser", "뱀자리", "Serpent"),
  make("Ser", "뱀자리", "Serpent"), // 두 부분으로 나뉜 별자리는 데이터에 두 번 들어 있다
  make("Lyr", "거문고자리", "Lyre"),
  make("Leo", "사자자리", "Lion"),
  make("Lib", "천칭자리", "Balance"),
  make("Lep", "토끼자리", "Hare"),
  make("UMa", "큰곰자리", "Big Dipper"),
  make("UMi", "작은곰자리", "Little Dipper"),
];

const ids = (query: string, limit?: number) =>
  searchConstellations(query, constellations, limit).map((c) => c.id);

describe("searchConstellations", () => {
  it("이름의 일부만 써도 찾는다", () => {
    expect(ids("오리온")).toEqual(["Ori"]);
    expect(ids("거문고")).toEqual(["Lyr"]);
  });

  it("영문 이름과 약어로도 찾고, 대소문자는 구분하지 않는다", () => {
    expect(ids("orion")).toEqual(["Ori"]);
    expect(ids("LYRE")).toEqual(["Lyr"]);
    expect(ids("umi")).toEqual(["UMi"]);
  });

  it("이름이 입력으로 시작하는 별자리를 앞에 두고, 그 뒤에 포함하는 별자리를 둔다", () => {
    // "곰자리"는 큰곰·작은곰 모두 중간에 들어 있다. "뱀"은 뱀자리·뱀주인자리가 모두 이름 앞에서 시작한다.
    expect(ids("곰자리")).toEqual(["UMa", "UMi"]);
    expect(ids("뱀")).toEqual(["Ser", "Oph"]);
    // "자리" 검색에서는 이름이 "자리"로 시작하는 것이 없으니 모두 포함 결과다.
    expect(ids("lib")).toEqual(["Lib"]);
  });

  it("앞뒤 공백은 무시하고 비어 있으면 아무것도 찾지 않는다", () => {
    expect(ids("  오리온  ")).toEqual(["Ori"]);
    expect(ids("")).toEqual([]);
    expect(ids("   ")).toEqual([]);
  });

  it("맞는 별자리가 없으면 빈 목록이다", () => {
    expect(ids("없는이름")).toEqual([]);
  });

  it("같은 별자리가 두 번 나오지 않는다", () => {
    expect(ids("뱀자리")).toEqual(["Ser"]);
  });

  it("목록은 최대 8개까지만 돌려준다", () => {
    const many = Array.from({ length: 20 }, (_, i) => make(`X${i}`, `별자리${i}`, `Star${i}`));
    expect(searchConstellations("별자리", many)).toHaveLength(8);
    expect(searchConstellations("별자리", many, 3)).toHaveLength(3);
  });
});
