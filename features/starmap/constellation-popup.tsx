import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ConstellationFeature } from "@/features/starmap/starmap-data";

type ConstellationPopupProps = {
  constellation: ConstellationFeature;
  description: string | undefined;
  onClose: () => void;
};

export function ConstellationPopup({ constellation, description, onClose }: ConstellationPopupProps) {
  return (
    <Card role="dialog" aria-label={`${constellation.properties.ko} 정보`} className="bg-slate-950/60 text-white shadow-lg ring-white/15 [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">
      <CardHeader>
        <CardTitle>{constellation.properties.ko}</CardTitle>
        <CardDescription className="text-slate-300">{constellation.properties.en}</CardDescription>
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
        <p className="text-sm leading-relaxed">{description ?? "설명 준비 중"}</p>
      </CardContent>
    </Card>
  );
}
