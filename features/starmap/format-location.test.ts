import { expect, it } from "vitest";

import { formatCoordinates } from "@/features/starmap/format-location";

it("북반구와 동경은 북위·동경으로 소수 둘째 자리까지 표시한다", () => {
  expect(formatCoordinates(37.5665, 126.978)).toBe("북위 37.57° · 동경 126.98°");
});

it("남반구는 남위로 표시한다", () => {
  expect(formatCoordinates(-33.8688, 151.2093)).toBe("남위 33.87° · 동경 151.21°");
});

it("서경은 부호 없이 서경으로 표시한다", () => {
  expect(formatCoordinates(40.7128, -74.006)).toBe("북위 40.71° · 서경 74.01°");
});
