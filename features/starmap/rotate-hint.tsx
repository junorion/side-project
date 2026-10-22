"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";

type RotateHintProps = {
  // dontShowAgain: "더 이상 안내하지 않기"를 체크했는지.
  onEnable: (dontShowAgain: boolean) => void;
  onClose: (dontShowAgain: boolean) => void;
};

// 지도를 끌었는데 더 움직이지 않을 때, 하늘 돌리기(돌리기 모드)를 알려 주는 안내 창.
export function RotateHint({ onEnable, onClose }: RotateHintProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(dontShowAgain);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, dontShowAgain]);

  return (
    <Card
      role="dialog"
      aria-label="하늘 돌리기 안내"
      className="bg-slate-950/60 text-white shadow-lg ring-white/15 [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]"
    >
      <CardHeader>
        <CardTitle>하늘을 돌려 보세요</CardTitle>
        <CardDescription className="text-slate-300">
          지도가 더 움직이지 않네요. 가려진 하늘을 보려면 돌리기 모드를 켜고 끌어 보세요. 마우스는 오른쪽
          버튼을 누른 채 끌어도 됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Field orientation="horizontal">
          <Checkbox
            id="hint-dont-show-again"
            className="border-white/60"
            checked={dontShowAgain}
            onCheckedChange={(checked) => setDontShowAgain(checked === true)}
          />
          <FieldLabel htmlFor="hint-dont-show-again">더 이상 안내하지 않기</FieldLabel>
        </Field>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button
          variant="ghost"
          className="text-white hover:bg-white/15 hover:text-white"
          onClick={() => onClose(dontShowAgain)}
        >
          닫기
        </Button>
        <Button variant="secondary" onClick={() => onEnable(dontShowAgain)}>
          돌리기 켜기
        </Button>
      </CardFooter>
    </Card>
  );
}
