import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { ConstellationPopup } from "@/features/starmap/constellation-popup";

const orion = {
  id: "Ori",
  properties: { ko: "오리온자리", en: "Orion" },
  geometry: { coordinates: [83.8, -1.2] as [number, number] },
};

test("한글명, 영문명, 설명을 보여준다", () => {
  render(<ConstellationPopup constellation={orion} description="겨울 대표 별자리" onClose={() => {}} />);

  expect(screen.getByText("오리온자리")).toBeInTheDocument();
  expect(screen.getByText("Orion")).toBeInTheDocument();
  expect(screen.getByText("겨울 대표 별자리")).toBeInTheDocument();
});

test("설명이 없으면 설명 준비 중을 보여준다", () => {
  render(<ConstellationPopup constellation={orion} description={undefined} onClose={() => {}} />);

  expect(screen.getByText("설명 준비 중")).toBeInTheDocument();
});

test("닫기 버튼을 누르면 onClose를 부른다", () => {
  const onClose = vi.fn();
  render(<ConstellationPopup constellation={orion} description="설명" onClose={onClose} />);

  fireEvent.click(screen.getByRole("button", { name: "닫기" }));

  expect(onClose).toHaveBeenCalledTimes(1);
});
