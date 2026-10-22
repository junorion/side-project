"use client";

import { useEffect, useMemo, useState } from "react";
import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchConstellations } from "@/features/starmap/constellation-search";
import type { ConstellationFeature } from "@/features/starmap/starmap-data";

type SearchPanelProps = {
  constellations: ConstellationFeature[];
  onPick: (id: string) => void;
  onClose: () => void;
};

// 이름을 입력하면 맞는 별자리 목록을 보여 주고, 고르면 그 별자리를 찾아 보여 주게 하는 찾기 창.
export function SearchPanel({ constellations, onPick, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchConstellations(query, constellations), [query, constellations]);
  const hasQuery = query.trim().length > 0;

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
      aria-label="별자리 찾기"
      className="bg-slate-950/60 text-white shadow-lg ring-white/15 [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]"
    >
      <CardHeader>
        <CardTitle>별자리 찾기</CardTitle>
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
      <CardContent className="flex flex-col gap-3">
        <Input
          autoFocus
          aria-label="별자리 이름"
          placeholder="별자리 이름 (예: 오리온)"
          value={query}
          className="border-white/30 bg-white/10 text-white placeholder:text-slate-400"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) onPick(results[0].id);
          }}
        />
        {!hasQuery && (
          <p className="text-sm text-slate-300">이름의 일부만 써도 찾을 수 있어요.</p>
        )}
        {hasQuery && results.length === 0 && (
          <p className="text-sm text-slate-300">찾을 수 없습니다</p>
        )}
        {results.length > 0 && (
          <ul className="flex flex-col gap-1" aria-label="찾은 별자리">
            {results.map((constellation) => (
              <li key={constellation.id}>
                <Button
                  variant="ghost"
                  className="w-full justify-between text-white hover:bg-white/15 hover:text-white"
                  onClick={() => onPick(constellation.id)}
                >
                  <span>{constellation.properties.ko}</span>
                  <span className="text-xs text-slate-300">{constellation.properties.en}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
