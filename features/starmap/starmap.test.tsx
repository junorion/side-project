import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

// Base UI 메뉴는 포인터를 누를 때 열리므로 실제 포인터 이벤트 순서를 흉내 낸다.
function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { pointerType: "mouse", button: 0 });
  fireEvent.mouseDown(trigger, { button: 0 });
  fireEvent.pointerUp(trigger, { pointerType: "mouse", button: 0 });
  fireEvent.mouseUp(trigger, { button: 0 });
  fireEvent.click(trigger, { button: 0 });
}

afterEach(() => {
  // 메뉴(Base UI)는 언마운트될 때도 ResizeObserver를 쓰므로, 스텁을 풀기 전에 먼저 언마운트한다.
  cleanup();
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

test("메뉴의 옵션을 누르면 옵션 창이 열리고, 지표별 추가 체크 상태는 창을 다시 열어도 유지된다", async () => {
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: (_: PositionCallback, failure: PositionErrorCallback) =>
        failure({ code: 1 } as GeolocationPositionError),
    },
  });

  render(<Starmap />);

  async function openOptions() {
    openMenu(await screen.findByRole("button", { name: "메뉴" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "옵션" }));
    return screen.findByRole("dialog", { name: "옵션" });
  }

  await openOptions();
  const checkbox = screen.getByRole("checkbox", { name: "지표별 추가" });
  expect(checkbox).not.toBeChecked();

  fireEvent.click(checkbox);
  expect(screen.getByRole("checkbox", { name: "지표별 추가" })).toBeChecked();

  fireEvent.click(screen.getByRole("button", { name: "닫기" }));
  expect(screen.queryByRole("dialog", { name: "옵션" })).not.toBeInTheDocument();

  await openOptions();
  expect(screen.getByRole("checkbox", { name: "지표별 추가" })).toBeChecked();
});

test("별자리 외 별 표시는 처음에 켜져 있고, 끈 상태는 옵션 창을 다시 열어도 유지된다", async () => {
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: (_: PositionCallback, failure: PositionErrorCallback) =>
        failure({ code: 1 } as GeolocationPositionError),
    },
  });

  render(<Starmap />);

  async function openOptions() {
    openMenu(await screen.findByRole("button", { name: "메뉴" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "옵션" }));
    await screen.findByRole("dialog", { name: "옵션" });
  }

  await openOptions();
  const checkbox = screen.getByRole("checkbox", { name: "별자리 외 별 표시" });
  expect(checkbox).toBeChecked();

  fireEvent.click(checkbox);
  expect(screen.getByRole("checkbox", { name: "별자리 외 별 표시" })).not.toBeChecked();

  fireEvent.click(screen.getByRole("button", { name: "닫기" }));
  await openOptions();
  expect(screen.getByRole("checkbox", { name: "별자리 외 별 표시" })).not.toBeChecked();
});

test("현재 위치로 버튼은 확대를 처음 배율로 되돌리고 위치를 다시 받는다", async () => {
  const getCurrentPosition = vi.fn((success: PositionCallback) =>
    success({ coords: { latitude: 35.1796, longitude: 129.0756 } } as GeolocationPosition)
  );
  vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });

  render(<Starmap />);

  // jsdom에서는 지도 크기가 0이라 처음 배율은 1배이고, 그래서 축소 버튼이 비활성화되어 있다.
  const zoomOutButton = await screen.findByRole("button", { name: "축소" });
  expect(zoomOutButton).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "확대" }));
  expect(screen.getByRole("button", { name: "축소" })).toBeEnabled();

  fireEvent.click(screen.getByRole("button", { name: "현재 위치로" }));
  expect(screen.getByRole("button", { name: "축소" })).toBeDisabled();
  expect(getCurrentPosition).toHaveBeenCalledTimes(2);
});

test("옵션 창은 Esc로 닫힌다", async () => {
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: (_: PositionCallback, failure: PositionErrorCallback) =>
        failure({ code: 1 } as GeolocationPositionError),
    },
  });

  render(<Starmap />);

  openMenu(await screen.findByRole("button", { name: "메뉴" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: "옵션" }));
  await screen.findByRole("dialog", { name: "옵션" });

  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "옵션" })).not.toBeInTheDocument();
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
