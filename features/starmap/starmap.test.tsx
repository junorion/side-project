import { readFileSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { Starmap } from "@/features/starmap";

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    disconnect() {}
  });
  vi.stubGlobal("fetch", async (path: string) => ({
    ok: true,
    json: async () => JSON.parse(readFileSync(join(process.cwd(), "public", path), "utf8")),
  }));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("위치 권한을 허용하면 그 위치 기준이라고 알린다", async () => {
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: (success: PositionCallback) =>
        success({ coords: { latitude: 35.1796, longitude: 129.0756 } } as GeolocationPosition),
    },
  });

  render(<Starmap />);

  const status = await screen.findByTestId("sky-status");
  expect(status).toHaveTextContent("현재 위치");
  expect(status).toHaveTextContent("북위 35.18° · 동경 129.08°");
});

test("오른쪽 아래에 메뉴 버튼이 있다", async () => {
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: (_: PositionCallback, failure: PositionErrorCallback) =>
        failure({ code: 1 } as GeolocationPositionError),
    },
  });

  render(<Starmap />);

  expect(await screen.findByRole("button", { name: "메뉴" })).toBeInTheDocument();
});

test("위치를 얻지 못하면 서울 기준으로 알린다", async () => {
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: (_: PositionCallback, failure: PositionErrorCallback) =>
        failure({ code: 1 } as GeolocationPositionError),
    },
  });

  render(<Starmap />);

  const status = await screen.findByTestId("sky-status");
  expect(status).toHaveTextContent("서울 (위치를 확인하지 못해 기본값 사용)");
  expect(status).toHaveTextContent("북위 37.57° · 동경 126.98°");
});
