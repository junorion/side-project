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

// 메뉴를 열고 "옵션" 항목을 누른다. 합성 포인터 이벤트로는 메뉴가 가끔 열리지 않아서, 열리지 않으면 다시 누른다.
async function clickOptionsMenuItem() {
  const trigger = await screen.findByRole("button", { name: "메뉴" });
  for (let attempt = 0; attempt < 4; attempt++) {
    openMenu(trigger);
    try {
      fireEvent.click(await screen.findByRole("menuitem", { name: "옵션" }, { timeout: 1500 }));
      return;
    } catch {
      // 메뉴가 열리지 않았다면 한 번 더 시도한다.
    }
  }
  throw new Error("메뉴를 열 수 없었습니다.");
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
    await clickOptionsMenuItem();
    return screen.findByRole("dialog", { name: "옵션" }, { timeout: 4000 });
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
    await clickOptionsMenuItem();
    await screen.findByRole("dialog", { name: "옵션" }, { timeout: 4000 });
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

test("지도 위에서 휠을 굴리면 페이지 스크롤 없이 확대·축소된다", async () => {
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: (_: PositionCallback, failure: PositionErrorCallback) =>
        failure({ code: 1 } as GeolocationPositionError),
    },
  });

  render(<Starmap />);

  const map = await screen.findByLabelText("현재 하늘의 별자리 지도");
  // jsdom에서는 지도 크기가 0이라 처음 배율이 1배이고, 그래서 축소 버튼이 비활성화되어 있다.
  expect(screen.getByRole("button", { name: "축소" })).toBeDisabled();

  // 위로 굴리면(deltaY < 0) 확대. 기본 동작(페이지 스크롤)이 막혀야 한다.
  const notPrevented = fireEvent.wheel(map, { deltaY: -200 });
  expect(notPrevented).toBe(false);
  expect(screen.getByRole("button", { name: "축소" })).toBeEnabled();

  // 충분히 확대하면 확대 버튼이 비활성화되고(8배 한계), 아래로 많이 굴리면 1배로 돌아온다.
  fireEvent.wheel(map, { deltaY: -100000 });
  expect(screen.getByRole("button", { name: "확대" })).toBeDisabled();
  fireEvent.wheel(map, { deltaY: 100000 });
  expect(screen.getByRole("button", { name: "축소" })).toBeDisabled();
});

function stubSeoulFallback() {
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: (_: PositionCallback, failure: PositionErrorCallback) =>
        failure({ code: 1 } as GeolocationPositionError),
    },
  });
}

// 지금 화면 가운데에 보이는 하늘의 고도·방위. 돌리기 전에는 천정(고도 90°)이다.
const viewOf = (map: HTMLElement) => ({
  alt: Number(map.getAttribute("data-view-alt")),
  az: Number(map.getAttribute("data-view-az")),
});

function pointer(
  map: HTMLElement,
  type: "pointerDown" | "pointerMove" | "pointerUp",
  init: { id: number; x: number; y?: number; button?: number; pointerType?: string }
) {
  fireEvent[type](map, {
    pointerId: init.id,
    clientX: init.x,
    clientY: init.y ?? 100,
    button: init.button ?? 0,
    pointerType: init.pointerType ?? "mouse",
  });
}

// 오른쪽 버튼으로 (0,0)에서 (dx, dy)만큼 끈다.
function rightDrag(map: HTMLElement, id: number, dx: number, dy: number) {
  pointer(map, "pointerDown", { id, x: 100, y: 100, button: 2 });
  pointer(map, "pointerMove", { id, x: 100 + dx, y: 100 + dy, button: 2 });
  pointer(map, "pointerUp", { id, x: 100 + dx, y: 100 + dy, button: 2 });
}

// 225px = 90도(1px당 0.4도).
test("마우스 오른쪽 버튼으로 끌면 끄는 방향의 하늘이 가운데로 오고, 왼쪽 버튼으로 끌면 돌지 않는다", async () => {
  stubSeoulFallback();
  render(<Starmap />);
  const map = await screen.findByLabelText("현재 하늘의 별자리 지도");
  expect(viewOf(map)).toEqual({ alt: 90, az: 0 });

  // 왼쪽 버튼 드래그는 지도 이동이지 하늘 돌리기가 아니다.
  pointer(map, "pointerDown", { id: 1, x: 100 });
  pointer(map, "pointerMove", { id: 1, x: 325 });
  pointer(map, "pointerUp", { id: 1, x: 325 });
  expect(viewOf(map)).toEqual({ alt: 90, az: 0 });

  // 오른쪽으로 끌면 왼쪽(동쪽)에 있던 하늘이 가운데로 온다.
  rightDrag(map, 2, 225, 0);
  expect(viewOf(map)).toEqual({ alt: 0, az: 90 });

  // 이어서 왼쪽으로 같은 거리를 끌면 다시 천정으로 돌아온다.
  rightDrag(map, 3, -225, 0);
  expect(viewOf(map)).toEqual({ alt: 90, az: 0 });
});

test("위아래로 끌어도 하늘이 돌아서 북쪽·남쪽 지평선과 지평선 아래까지 가운데로 올 수 있다", async () => {
  stubSeoulFallback();
  render(<Starmap />);
  const map = await screen.findByLabelText("현재 하늘의 별자리 지도");

  rightDrag(map, 1, 0, 225); // 아래로: 북쪽 하늘이 가운데로
  expect(viewOf(map)).toEqual({ alt: 0, az: 0 });

  rightDrag(map, 2, 0, 225); // 같은 방향으로 더 끌면: 지평선을 지나 천정의 반대편(천저)까지
  expect(viewOf(map).alt).toBe(-90);

  rightDrag(map, 3, 0, 225); // 더 끌면 남쪽 지평선 쪽을 지나 올라온다
  expect(viewOf(map)).toEqual({ alt: 0, az: 180 });
});

test("확대할수록 같은 거리를 끌어도 하늘이 덜 돈다 (배율에 맞춰 손에 붙는 속도)", async () => {
  stubSeoulFallback();
  // 지도 크기를 390×795로 알려 줘서 실제 배율과 반지름이 계산되게 한다.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private callback: ResizeObserverCallback) {}
      observe() {
        this.callback(
          [{ contentRect: { width: 390, height: 795 } } as ResizeObserverEntry],
          this as unknown as ResizeObserver
        );
      }
      disconnect() {}
    }
  );
  render(<Starmap />);
  const map = await screen.findByLabelText("현재 하늘의 별자리 지도");

  // 처음 배율(약 2.2배)에서 오른쪽으로 100px: 가운데 하늘이 약 31도 멀어진다(고도 90° → 약 59°).
  rightDrag(map, 1, 100, 0);
  const atInitialZoom = viewOf(map).alt;
  expect(atInitialZoom).toBeGreaterThan(55);
  expect(atInitialZoom).toBeLessThan(63);

  // 처음으로 돌아가 3단계 확대(약 7.5배)한 뒤 같은 100px을 끌면 훨씬 덜 돈다(약 9도).
  fireEvent.click(screen.getByRole("button", { name: "현재 위치로" }));
  for (let step = 0; step < 3; step++) fireEvent.click(screen.getByRole("button", { name: "확대" }));
  rightDrag(map, 2, 100, 0);
  const zoomedIn = viewOf(map).alt;
  expect(zoomedIn).toBeGreaterThan(atInitialZoom);
  expect(zoomedIn).toBeGreaterThan(78);
});

test("지도 위에서는 오른쪽 클릭 메뉴가 뜨지 않는다", async () => {
  stubSeoulFallback();
  render(<Starmap />);
  const map = await screen.findByLabelText("현재 하늘의 별자리 지도");

  expect(fireEvent.contextMenu(map)).toBe(false);
});

test("두 손가락을 같은 방향으로 움직이면 하늘이 돌고, 간격을 벌리면 돌지 않고 확대한다", async () => {
  stubSeoulFallback();
  render(<Starmap />);
  const map = await screen.findByLabelText("현재 하늘의 별자리 지도");
  const touch = { pointerType: "touch" };

  // 나란히 오른쪽으로 40px씩 이동 (손가락마다 이벤트가 따로 들어온다).
  pointer(map, "pointerDown", { id: 1, x: 100, ...touch });
  pointer(map, "pointerDown", { id: 2, x: 160, ...touch });
  for (let step = 1; step <= 8; step++) {
    pointer(map, "pointerMove", { id: 1, x: 100 + step * 5, ...touch });
    pointer(map, "pointerMove", { id: 2, x: 160 + step * 5, ...touch });
  }
  pointer(map, "pointerUp", { id: 1, x: 140, ...touch });
  pointer(map, "pointerUp", { id: 2, x: 200, ...touch });
  expect(viewOf(map).alt).toBeLessThan(90);
  expect(screen.getByRole("button", { name: "축소" })).toBeDisabled();

  // 간격을 벌리면(핀치) 확대되고 보는 방향은 바뀌지 않는다.
  const before = viewOf(map);
  pointer(map, "pointerDown", { id: 3, x: 100, ...touch });
  pointer(map, "pointerDown", { id: 4, x: 140, ...touch });
  for (let step = 1; step <= 8; step++) {
    pointer(map, "pointerMove", { id: 3, x: 100 - step * 5, ...touch });
    pointer(map, "pointerMove", { id: 4, x: 140 + step * 5, ...touch });
  }
  pointer(map, "pointerUp", { id: 3, x: 60, ...touch });
  pointer(map, "pointerUp", { id: 4, x: 180, ...touch });
  expect(viewOf(map)).toEqual(before);
  expect(screen.getByRole("button", { name: "축소" })).toBeEnabled();
});

test("현재 위치로 버튼은 보는 방향도 처음(천정이 가운데)으로 되돌린다", async () => {
  stubSeoulFallback();
  render(<Starmap />);
  const map = await screen.findByLabelText("현재 하늘의 별자리 지도");

  rightDrag(map, 1, 200, 80);
  expect(viewOf(map).alt).toBeLessThan(90);

  fireEvent.click(screen.getByRole("button", { name: "현재 위치로" }));
  expect(viewOf(map)).toEqual({ alt: 90, az: 0 });
});

test("옵션 창은 Esc로 닫힌다", async () => {
  vi.stubGlobal("navigator", {
    geolocation: {
      getCurrentPosition: (_: PositionCallback, failure: PositionErrorCallback) =>
        failure({ code: 1 } as GeolocationPositionError),
    },
  });

  render(<Starmap />);

  await clickOptionsMenuItem();
  await screen.findByRole("dialog", { name: "옵션" }, { timeout: 4000 });

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
