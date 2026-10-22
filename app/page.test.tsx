import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import Home from "@/app/page";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("홈 화면은 Starmap 제목과 하늘 계산 중 상태를 보여준다", () => {
  vi.stubGlobal("fetch", () => new Promise(() => {}));
  render(<Home />);

  expect(screen.getByRole("heading", { level: 1, name: "Starmap" })).toBeInTheDocument();
  expect(screen.getByText(/하늘을 계산하는 중/)).toBeInTheDocument();
});
