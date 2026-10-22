# 지평선 아래로 내려간 선택이 다시 뜨면 되살아남

- **증상:** 선택한 별자리가 지평선 아래로 내려가면 패널이 안내 문구로 돌아가지만, `selectedId`는 그대로 남아 있다. 같은 별자리가 다시 떠오르면 클릭 없이 패널과 강조가 다시 나타난다.
- **근거:** `features/starmap/starmap.tsx`의 `selected`는 `useMemo`로 가려 보이게만 할 뿐 `selectedId`를 지우지 않는다. 리뷰(`code-review low`)가 지적했고 코드 읽기로만 확인했으며 런타임에서 재현하지는 않았다.
- **스펙 기준:** `docs/specs/starmap-sky-chart/spec.md`의 가정 "선택된 별자리가 지평선 아래로 내려가면 선택은 풀린다".
- **다음 조치:** 보이지 않게 된 시점에 선택을 비우거나(예: 갱신 시 `setSelectedId(null)`), 되살아나도 괜찮다고 스펙 가정을 고친다.
