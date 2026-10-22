"use client";

import { useEffect } from "react";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

type OptionsPanelProps = {
  showAsterisms: boolean;
  onShowAsterismsChange: (checked: boolean) => void;
  onClose: () => void;
};

export function OptionsPanel({ showAsterisms, onShowAsterismsChange, onClose }: OptionsPanelProps) {
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
      aria-label="옵션"
      className="bg-slate-950/60 text-white shadow-lg ring-white/15 [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]"
    >
      <CardHeader>
        <CardTitle>옵션</CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="닫기"
            className="text-white hover:bg-white/15 hover:text-white"
            onClick={onClose}
          >
            <XIcon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field orientation="horizontal">
            <Checkbox
              id="option-asterisms"
              className="border-white/60"
              checked={showAsterisms}
              onCheckedChange={(checked) => onShowAsterismsChange(checked === true)}
            />
            <FieldContent>
              <FieldLabel htmlFor="option-asterisms">지표별 추가</FieldLabel>
              <FieldDescription className="text-slate-300">
                계절별 대삼각형처럼 별자리를 찾는 길잡이 별을 지도에 표시합니다.
              </FieldDescription>
            </FieldContent>
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
