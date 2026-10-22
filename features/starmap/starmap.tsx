"use client";

import { useEffect, useMemo, useState } from "react";
import * as Astronomy from "astronomy-engine";
import { MapPinIcon } from "lucide-react";

import { ConstellationPopup } from "@/features/starmap/constellation-popup";
import { formatCoordinates } from "@/features/starmap/format-location";
import { SkyChart } from "@/features/starmap/sky-chart";
import { visibleConstellationIds } from "@/features/starmap/sky-math";
import { loadStarmapData, type StarmapData } from "@/features/starmap/starmap-data";

const SEOUL = { latDeg: 37.5665, lonDeg: 126.978 };
const REFRESH_MS = 60_000;
const GEOLOCATION_TIMEOUT_MS = 10_000;

type Observer = { latDeg: number; lonDeg: number; isFallback: boolean };

function lstDegrees(date: Date, lonDeg: number): number {
  return (((Astronomy.SiderealTime(date) * 15 + lonDeg) % 360) + 360) % 360;
}

function useObserver(): Observer | null {
  const [observer, setObserver] = useState<Observer | null>(null);

  useEffect(() => {
    const fallback = () => setObserver({ ...SEOUL, isFallback: true });
    if (!navigator.geolocation) {
      queueMicrotask(fallback);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setObserver({ latDeg: coords.latitude, lonDeg: coords.longitude, isFallback: false }),
      fallback,
      { timeout: GEOLOCATION_TIMEOUT_MS }
    );
  }, []);

  return observer;
}

function useNow(): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    queueMicrotask(tick);
    const timer = setInterval(tick, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  return now;
}

function useStarmapData(): { data: StarmapData | null; failed: boolean } {
  const [state, setState] = useState<{ data: StarmapData | null; failed: boolean }>({
    data: null,
    failed: false,
  });

  useEffect(() => {
    loadStarmapData().then(
      (data) => setState({ data, failed: false }),
      () => setState({ data: null, failed: true })
    );
  }, []);

  return state;
}

export function Starmap() {
  const observer = useObserver();
  const now = useNow();
  const { data, failed } = useStarmapData();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const lstDeg = observer && now ? lstDegrees(now, observer.lonDeg) : null;

  // 선택한 별자리가 지평선 아래로 내려가면 선택은 풀린다.
  const selected = useMemo(() => {
    if (!data || !selectedId || !observer || lstDeg === null) return null;
    const visible = visibleConstellationIds(data.lines, { lstDeg, latDeg: observer.latDeg });
    if (!visible.has(selectedId)) return null;
    return data.constellations.find((c) => c.id === selectedId) ?? null;
  }, [data, selectedId, observer, lstDeg]);

  if (failed) {
    return <p className="text-sm text-destructive">별 데이터를 불러오지 못했습니다. 새로고침해 주세요.</p>;
  }

  if (!observer || !now || !data || lstDeg === null) {
    return <p className="text-sm text-muted-foreground">하늘을 계산하는 중입니다…</p>;
  }

  return (
    <SkyChart
      data={data}
      latDeg={observer.latDeg}
      lstDeg={lstDeg}
      selectedId={selectedId}
      onSelect={setSelectedId}
      header={
        <div
          className="flex items-start justify-between gap-3 px-3 pt-3 pb-1 text-xs text-slate-100"
          data-testid="sky-status"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-1.5 font-medium">
              <MapPinIcon aria-hidden className="size-3.5 shrink-0" />
              {observer.isFallback ? "서울 (위치를 확인하지 못해 기본값 사용)" : "현재 위치"}
            </span>
            <span className="text-slate-400">
              {formatCoordinates(observer.latDeg, observer.lonDeg)}
            </span>
          </div>
          <div className="flex shrink-0 flex-col gap-0.5 text-right">
            <span className="font-medium">
              {now.toLocaleTimeString("ko-KR", { timeStyle: "short" })}
            </span>
            <span className="text-slate-400">
              {now.toLocaleDateString("ko-KR", { dateStyle: "medium" })}
            </span>
          </div>
        </div>
      }
      popup={
        selected ? (
          <ConstellationPopup
            constellation={selected}
            lines={data.lines
              .filter((line) => line.id === selected.id)
              .flatMap((line) => line.geometry.coordinates)}
            description={data.descriptions[selected.id]}
            onClose={() => setSelectedId(null)}
          />
        ) : null
      }
    />
  );
}
