import { useMemo } from "react";
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
import { constellationShape } from "@/features/starmap/constellation-shape";
import type { ConstellationFeature } from "@/features/starmap/starmap-data";

type ConstellationPopupProps = {
  constellation: ConstellationFeature;
  // 이 별자리의 선(RA/Dec 도). 모양 그림에 쓴다.
  lines: number[][][];
  description: string | undefined;
  onClose: () => void;
};

export function ConstellationPopup({
  constellation,
  lines,
  description,
  onClose,
}: ConstellationPopupProps) {
  const shape = useMemo(() => constellationShape(lines), [lines]);

  return (
    <Card
      role="dialog"
      aria-label={`${constellation.properties.ko} 정보`}
      className="bg-slate-950/60 text-white shadow-lg ring-white/15 [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]"
    >
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>{constellation.properties.ko}</CardTitle>
            <CardDescription className="text-slate-300">
              {constellation.properties.en}
            </CardDescription>
          </div>
          <svg
            role="img"
            aria-label={`${constellation.properties.ko} 모양`}
            viewBox="-6 -6 112 112"
            className="size-14 shrink-0 text-amber-300"
          >
            {shape.segments.map((s, i) => (
              <line
                key={i}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                opacity={0.8}
              />
            ))}
            {shape.points.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={3.5} fill="white" />
            ))}
          </svg>
        </div>
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
