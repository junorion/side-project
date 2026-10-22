import { Starmap } from "@/features/starmap";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Starmap</h1>
        <p className="text-muted-foreground">지금 이 시간, 이 위치의 하늘에 보이는 별자리 지도</p>
      </header>
      <Starmap />
    </main>
  );
}
