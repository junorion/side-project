"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ArNoticeProps = {
  onClose: () => void;
};

// AR 모드는 아직 모바일 앱에서만 만들 예정이라, 웹에서는 지원하지 않는다는 안내만 한다.
// 카메라를 켜거나 카메라 권한을 요청하지 않는다.
export function ArNotice({ onClose }: ArNoticeProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <Card
      role="dialog"
      aria-label="AR 모드 안내"
      className="bg-slate-950/60 text-white shadow-lg ring-white/15 [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]"
    >
      <CardHeader>
        <CardTitle>AR 모드</CardTitle>
        <CardDescription className="text-slate-300">
          휴대폰 카메라로 밤하늘을 비추면 지표 별로 별자리 위치를 알려 주는 기능입니다. 현재는 웹에서는
          지원하지 않고, 모바일 앱에서 지원할 예정입니다.
        </CardDescription>
      </CardHeader>
      <CardFooter className="justify-end">
        <Button variant="secondary" onClick={onClose}>
          확인
        </Button>
      </CardFooter>
    </Card>
  );
}
