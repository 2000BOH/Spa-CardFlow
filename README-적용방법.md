# Spa CardFlow 디자인 적용 방법

이 폴더의 파일들을 GitHub 저장소(`2000BOH/Spa-CardFlow`)에 **덮어쓰기** 하면 됩니다.
폴더 구조가 저장소와 똑같으니, 같은 경로에 그대로 올리시면 됩니다.

## 1. 덮어쓸 파일 (9개)

| 이 폴더 | 저장소 경로 |
| --- | --- |
| `src/index.css` | `src/index.css` |
| `src/App.tsx` | `src/App.tsx` |
| `src/components/Header.tsx` | `src/components/Header.tsx` |
| `src/components/Dashboard.tsx` | `src/components/Dashboard.tsx` |
| `src/components/ExpenseList.tsx` | `src/components/ExpenseList.tsx` |
| `src/components/ExpenseForm.tsx` | `src/components/ExpenseForm.tsx` |
| `src/components/ReportModal.tsx` | `src/components/ReportModal.tsx` |
| `src/components/ReceiptModal.tsx` | `src/components/ReceiptModal.tsx` |
| `src/data/mockExpenses.ts` | `src/data/mockExpenses.ts` |
| `src/utils/storage.ts` | `src/utils/storage.ts` |

## 2. 새로 추가할 파일 (1개)

| 이 폴더 | 저장소 경로 |
| --- | --- |
| `src/components/BottomTabs.tsx` | `src/components/BottomTabs.tsx` (새 파일) |

## 3. tailwind.config.js

기존 파일을 통째로 바꾸지 말고, **`theme.extend` 안의 내용만** 이 폴더의
`tailwind.config.js`에서 복사해 넣으세요. (`export default` / `module.exports` 중
기존 파일이 쓰던 형식을 그대로 유지해야 빌드가 깨지지 않습니다.)

## 4. 건드리지 않은 것

아래는 그대로 두세요. 동작 로직이라 손대지 않았습니다.

- `src/api/expenseApi.ts` (Supabase 연동)
- `src/lib/supabase.ts`, `src/utils/supabase.ts`
- `src/utils/ocrParser.ts` (영수증 인식)
- `src/utils/pdfExporter.ts` (PDF 내보내기)
- `src/types/expense.ts`
- `supabase/schema.sql`, `vercel.json`

## 5. 삭제해도 되는 파일

- `src/App.css` — Vite 기본 템플릿 CSS가 남아 있던 파일입니다. 어디서도 쓰지 않습니다.
  (`src/main.tsx`나 `App.tsx`에서 `import './App.css'` 줄이 있다면 함께 지우세요.)

---

## 무엇이 바뀌었나

**화면 크기에 따라 자동 전환** — 768px 기준입니다.

- **휴대폰**: 하단 탭바(홈 / 내역 / 등록 / 보고서), 한 화면에 한 가지 일만.
  홈 첫 화면 큰 버튼이 "영수증 찍어서 등록" → 누르면 카메라가 바로 열립니다.
- **PC**: 상단 요약 → 왼쪽 내역 표 + 오른쪽 고정 등록 폼 2열.

**디자인 규칙**

- 글자: 본문 15~16px, 라벨 13px (기존 9~11px은 휴대폰에서 읽히지 않았습니다)
- 숫자는 Space Grotesk, 한글·UI는 DM Sans + Noto Sans KR
- 색은 파랑 `#0052ff` 하나만 기능적으로 사용. 그라디언트·글로우 전부 제거
- 여백은 8px 배수만, 모서리는 10 / 12 / 16 / 999px 만 사용
- 그림자 없음 — 1px 보더와 배경 대비로 깊이를 만듭니다
- 모든 터치 영역 최소 44px

**데이터**

- 샘플 내역 전부 삭제 (빈 상태로 시작)
- 월 한도 **300,000원** (`src/data/mockExpenses.ts`의 `INITIAL_MONTHLY_BUDGET`에서 변경)
- localStorage 키를 v2로 올려서, 예전에 저장된 샘플 데이터도 사라집니다

**보고서**

- 결재란(기안 / 검토 / 승인), 기본 기안 정보, 비목별 집행 요약, 사용 내역 세부 명세, 서명문
- 기안 부서·기안자·카드 정보는 보고서 화면에서 **"기안 정보 입력"**을 눌러 한 번만 적으면
  브라우저에 저장됩니다

**영수증**

- 목록의 썸네일을 누르면 원본이 크게 뜹니다
- 등록 화면에서 촬영하면 자동 압축(최대 1200px) 후 OCR이 금액·결제처를 채웁니다
