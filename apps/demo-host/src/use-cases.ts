export interface UseCase {
  id: string;
  title: string;
  description: string;
  prompt: string;
  triggerMode: "prompt" | "interaction" | "feedPoll";
  recommendedSkills: string[];
  interactionHint?: string;
  feedSimulator?: { dataSourceId: string; initialData: unknown; updatedData: unknown };
}

export const useCases: UseCase[] = [
  {
    id: "A",
    title: "매출 대시보드 → 드릴다운",
    description: "첫 프롬프트로 대시보드를 만들고, 차트를 클릭하면 드릴다운 패널이 추가됩니다",
    prompt: "이번 분기 SaaS 매출 대시보드 만들어줘. 지역별 KPI와 월별 추세.",
    triggerMode: "prompt",
    recommendedSkills: ["data-research"],
    interactionHint: "Try: '북미 지역 드릴다운해줘'"
  },
  {
    id: "B",
    title: "논문 대시보드 vs 주말 가계부",
    description: "같은 구조인데 mood가 달라 시각적으로 전혀 다른 UI",
    prompt: "대학원 논문 진행 대시보드 만들어줘. 일정, 참고문헌, 할 일.",
    triggerMode: "prompt",
    recommendedSkills: ["data-research", "dev-tools"]
  },
  {
    id: "C",
    title: "주문 급증 피드 감지",
    description: "시뮬레이션 데이터가 급증하면 자동으로 알림 배너 생성",
    prompt: "전자상거래 실시간 주문 모니터링 대시보드 보여줘.",
    triggerMode: "prompt",
    recommendedSkills: ["data-research", "sales-ops"],
    feedSimulator: {
      dataSourceId: "orders-live",
      initialData: { ordersLastHour: 42 },
      updatedData: { ordersLastHour: 180 }
    }
  },
  {
    id: "D",
    title: "음성/텍스트 — 근처 카페",
    description: "멀티모달 입력으로 지도와 리스트를 동시에 생성",
    prompt: "강남역 근처 분위기 좋은 카페 찾아줘. 지도랑 리스트 같이.",
    triggerMode: "prompt",
    recommendedSkills: ["geo-maps"]
  },
  {
    id: "E",
    title: "스마트 피드백 — 이 데이터 이상해 보여",
    description: "사용자 질문으로 이상치 강조가 patch로 추가",
    prompt: "지난 7일 서비스 호출 수 그래프 보여줘.",
    triggerMode: "prompt",
    recommendedSkills: ["data-research"],
    interactionHint: "Try: '이 구간 이상해 보이는데?'"
  },
  {
    id: "F",
    title: "코드 에디터 + 실시간 차트 patch",
    description: "코드 에디터에서 데이터 변환 코드를 고치면 차트가 patch로 갱신",
    prompt: "CSV 데이터로 간단한 분석 워크벤치 만들어줘.",
    triggerMode: "prompt",
    recommendedSkills: ["dev-tools", "data-research"],
    interactionHint: "Try: '컬럼을 로그 스케일로 변환해줘'"
  },
  {
    id: "G",
    title: "프레젠테이션 모드 전환",
    description: "밀도 변환으로 같은 콘텐츠가 프레젠테이션 레이아웃으로",
    prompt: "팀 주간 리포트 보여줘. 이번주 성과, 다음주 계획, 리스크.",
    triggerMode: "prompt",
    recommendedSkills: ["data-research"],
    interactionHint: "Try: '이걸 프레젠테이션 모드로 바꿔줘'"
  },
  {
    id: "H",
    title: "한영 혼합 입력",
    description: "Korean과 English가 섞인 프롬프트도 문제없이 UI로",
    prompt: "Make a retention cohort chart 보여줘 with weekly breakdown",
    triggerMode: "prompt",
    recommendedSkills: ["data-research"]
  },
  {
    id: "I",
    title: "스킬팩 조합 (data + geo)",
    description: "지능적으로 두 스킬팩을 조합해 지오 분석 대시보드",
    prompt: "서울 구별 매출 데이터를 지도에 히트맵으로, 옆에 랭킹 테이블.",
    triggerMode: "prompt",
    recommendedSkills: ["data-research", "geo-maps"]
  },
  {
    id: "J",
    title: "DevTools — 왜 이런 UI?",
    description: "생성된 UI 옆에 DevTools 패널을 열어 GPT의 판단을 검토",
    prompt: "마케팅 캠페인 성과 대시보드 보여줘.",
    triggerMode: "prompt",
    recommendedSkills: ["marketing-ops", "data-research"],
    interactionHint: "DevTools 패널에서 Request/Response/Cost 확인"
  }
];
