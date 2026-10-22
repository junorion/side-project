import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ConstellationFeature } from "@/features/starmap/starmap-data";

type ConstellationPanelProps = {
  constellation: ConstellationFeature | null;
  description: string | undefined;
};

export function ConstellationPanel({ constellation, description }: ConstellationPanelProps) {
  if (!constellation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>별자리를 눌러 보세요</CardTitle>
          <CardDescription>지도의 별자리 선을 누르면 이름과 설명이 여기에 나타납니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{constellation.properties.ko}</CardTitle>
        <CardDescription>{constellation.properties.en}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed">{description ?? "설명 준비 중"}</p>
      </CardContent>
    </Card>
  );
}
