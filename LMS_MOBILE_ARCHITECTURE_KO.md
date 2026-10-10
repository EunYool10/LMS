# TDSNT LMS 화면 구조 · 디자인 시스템 가이드

> 대상: 프론트엔드/풀스택 엔지니어, 신규 투입 개발자, 유지보수 담당자
> 기준: 2026년 10월 전면 디자인 개편 이후

---

## 1. 원칙

1. **데이터 계층은 하나입니다.** 인증(`AuthContext`), 권한(`utils/rbac.ts`), 저장소(`services/storage.ts`), API(`services/*Api.ts`)는 PC와 모바일이 같은 코드를 씁니다. 모바일 전용 백엔드나 목업 데이터는 만들지 않습니다.
2. **화면마다 반응형 컴포넌트 하나만 둡니다.** PC용과 모바일용 컴포넌트를 따로 만들어 JS로 분기하지 않습니다(예전의 `DesktopStudentDashboard` / `MobileStudentDashboard`와 `useResponsive` 훅은 삭제했습니다). 레이아웃 차이는 Tailwind 반응형 클래스(`sm:`, `md:`, `lg:`)로 처리합니다.
3. **색과 모양은 토큰으로만 바꿉니다.** 화면 코드에 hex 색을 직접 쓰지 않고 `src/index.css`의 `@theme` 토큰을 씁니다.
4. **PC 화면을 축소하지 않습니다.** `transform: scale`이나 페이지 전체 가로 스크롤을 쓰지 않습니다. 넓은 표만 자체 영역 안에서 가로 스크롤합니다.

---

## 2. 디자인 시스템

### 2.1 토큰 (`src/index.css` → `@theme`)

| 그룹 | 용도 | 비고 |
|---|---|---|
| `brand-50…950` | 주 색(버튼, 링크, 진행 막대, 선택 상태) | TDS 로고의 블루 |
| `navy-50…950` | 제목, 진한 면, 이니셜 아바타 | TDS 로고의 네이비 |
| `neutral-0…950` | 글자, 테두리, 배경 | 차가운 회색 |
| `emerald` / `amber` / `rose` | 완료 · 주의 · 위험 상태 | Tailwind 기본값 사용 |

- 옛 코드에 남아 있는 `indigo` · `blue` · `violet` 클래스는 `brand`로, `purple`은 `navy`로, `slate` · `gray`는 `neutral`로 **토큰 단계에서 다시 연결**되어 있습니다. 새 코드에는 `brand` / `navy` / `neutral`을 직접 쓰세요.
- 모서리: `rounded-lg`(8px) 입력·버튼, `rounded-xl`(10px) 카드·패널, `rounded-2xl`(12px) 이하만 사용합니다.
- 그림자는 거의 쓰지 않습니다. 카드는 `border border-neutral-200`으로 구분하고, 마우스를 올렸을 때만 `shadow-md`를 씁니다.
- 글꼴: Pretendard(`--font-sans`). `index.html`에서 CDN으로 불러옵니다.

### 2.2 공통 클래스 (`@layer components`)

| 클래스 | 설명 |
|---|---|
| `.lms-container` | 본문 폭 `min(100% - 32px, 1200px)` |
| `.lms-card`, `.lms-card-interactive` | 흰 배경 + 테두리 카드 |
| `.lms-input` | 입력창/셀렉트(높이 40px). `textarea`는 `h-auto`를 함께 씁니다 |
| `.lms-btn` + `-primary` / `-secondary` / `-ghost` / `-sm` | 버튼 |
| `.lms-section-title`, `.lms-eyebrow` | 섹션 제목, 작은 머리 문구 |

`@layer components` 안에 있으므로 Tailwind 유틸리티로 덮어쓸 수 있습니다(예: `lms-btn h-11`).

### 2.3 공통 컴포넌트

| 컴포넌트 | 위치 | 용도 |
|---|---|---|
| `BrandLogo`, `TDSNTWordmark` | `components/common/BrandLogo.tsx` | TDSNT 워드마크(SVG, `currentColor`) |
| `Avatar` | `components/common/Avatar.tsx` | 원형 프로필 사진, 없으면 이니셜 |
| `CourseCover` | `components/common/CourseCover.tsx` | 16:9 강의 표지. 썸네일이 없으면 카테고리 아이콘 표지 |
| `CategoryIcon` | `components/common/CategoryIcon.tsx` | 카테고리별 아이콘 |
| `CourseCard` | `components/student/CourseCard.tsx` | 강의 카드. 모바일(<640px)에서는 가로형 |
| `BaseModal` / `Modal` | `components/common/` | 모든 모달. 모바일에서는 바텀시트 |
| `AdminPageHeader`, `AdminStatStrip`, `AdminPanel` | `components/admin/AdminPageHeader.tsx` | 관리자 화면 머리말, 숫자 띠, 패널 |
| `EmptyState` | `components/common/EmptyState.tsx` | 빈 목록 안내 |

---

## 3. 화면 구조

### 3.1 라우팅
`src/App.tsx`의 `currentView` 문자열로 화면을 바꿉니다(URL 라우터 없음). `handleNavigate(view, param)`로 이동합니다.

### 3.2 전역 레이아웃

```text
┌─ Navbar (64px, sticky) ── 학습 화면(learn)에서는 숨김 ─────────┐
├─ AnnouncementBanner (홈 전용, 상단바 바로 아래 전체 폭 띠) ────┤
│  페이지 본문                                                    │
├─ Footer (학습 화면·관리자 화면에서는 숨김) ─────────────────────┤
└─ MobileBottomNav (<768px, 학습 화면에서는 숨김) ───────────────┘
```

### 3.3 수강생 화면

| view | 파일 | 구성 |
|---|---|---|
| `home` | `pages/HomePage.tsx` | 소개 띠(인사 + 검색 + 나의 학습 요약) → 이어서 학습 → 필수 교육 → 카테고리 탭 + 강의 목록 |
| `course-detail` | `pages/CourseDetailPage.tsx` | 머리 띠(경로·제목·메타·강사) + 본문(학습 목표·소개·커리큘럼·수강평) + 고정 수강 카드 |
| `learn` | `pages/LearnPage.tsx` | 강의 전용 상단바, 플레이어, 진도 막대, 탭(개요·메모·질문), 고정 커리큘럼 |
| `dashboard` | `pages/DashboardPage.tsx` → `components/student/StudentDashboard.tsx` | 숫자 띠 + 탭 목록(수강 중·수료·관심·메모·평가) + 이번 주 학습 |
| `account-settings` | `components/profile/AccountSettings.tsx` | 왼쪽 메뉴(기본 정보·보안·학습 현황) + 내용 |
| `user-profile` | `pages/UserProfilePage.tsx` | 프로필 머리 + 수강 과정 |

업적·배지·프로필 테두리 기능은 2026년 10월에 화면에서 제거했습니다(저장소 함수는 남아 있음).

### 3.4 관리자 화면

왼쪽 사이드바(`components/admin/AdminSidebar.tsx`, 모바일에서는 서랍) + 본문(최대 1280px).

| 메뉴 | view | 주요 기능 |
|---|---|---|
| 대시보드 | `admin-dashboard` | 통합 검색, 숫자 띠, 홈 공지 상태, 최근 강의, 최근 활동 |
| 공지사항 | `admin-announcements` | 전사 공지(홈 상단 띠) · 강의별 공지 |
| 강의 관리 | `admin-courses` | 목록, 일괄 삭제, **수강 배정**, 편집기(`admin-courses-create` / `admin-courses-edit`) |
| 문제 · 퀴즈 | `admin-questions` | 강의별 문제 은행 |
| 학습 현황 | `admin-analytics` | **과정별 이수**(미이수자, 수강 배정, 독려 메일, CSV) · 수강생 기록 · 통계 |
| 수료증 조회 | `admin-certificates` | 인증번호 진위 검증, 발급 대장 |
| 사용자 · 권한 | `admin-users` | 사용자 목록, 권한, 감사 로그 |
| 환경설정 | `admin-settings` | 정책 링크, 가입/점검 모드, 소셜 로그인 키(서비스 총괄 전용) |

**강의 편집기**(`pages/admin/AdminCourseEditorPage.tsx`)는 4단계입니다: 기본 정보 → 커리큘럼(`CurriculumManager`: 섹션·영상·퀴즈·평가) → 수강 설정(완료 기준·학습 목표·태그·강의 공지) → 검토·게시.

---

## 4. 반응형 규칙

| 폭 | 기준 | 적용 |
|---|---|---|
| `< 640px` | 기본 | 강의 카드 가로형, 표 → 카드 목록, 버튼 줄바꿈 허용 |
| `≥ 640px` (`sm`) | 태블릿 세로 | 카드 그리드 2열, 표 표시 |
| `< 768px` | `md` 미만 | 하단 탭 표시, 상단바 메뉴는 햄버거, 관리자 사이드바는 서랍 |
| `≥ 1024px` (`lg`) | PC | 2단 레이아웃(본문 + 고정 사이드 카드/메뉴) |

- 표는 `whitespace-nowrap` + 감싸는 `overflow-x-auto`를 씁니다. 모바일에서는 같은 데이터를 카드 목록으로 따로 그립니다(예: 관리자 대시보드 최근 강의, 강의 관리).
- 모달은 `BaseModal`을 쓰면 640px 미만에서 자동으로 바텀시트가 됩니다.
- 하단 탭이 있는 화면의 마지막 요소는 `pb-safe-nav`(80px + safe area)로 가려지지 않게 합니다.
- 터치 대상은 최소 40px(`h-10`) 이상으로 둡니다.

---

## 5. 데이터 흐름

1. 화면은 `storage`(localStorage 캐시)에서 동기적으로 읽습니다.
2. 쓰기는 `storage`가 localStorage에 저장하고 `firestoreService`로 Firestore에 비동기 반영합니다.
3. 앱 시작 시 `storage.syncFromFirestore()`가 사용자 · 강의 · 섹션 · 레슨 · 공지 · 설정을 내려받습니다.
4. 같은 동기화에서 **수강 등록(enrollments)과 레슨 진도(progress)** 도 내려받습니다. 관리자는 전체, 수강생은 본인 기록만 받습니다. 그래서 관리자가 배정한 강의가 직원 기기에 나타나고, 학습 현황이 실제 데이터로 계산됩니다(`storage.mergeRemoteLearningData`).
5. 앱 내 알림(`addNotification`)은 아직 해당 브라우저에만 저장됩니다. 직원에게 이수를 독려할 때는 학습 현황의 **독려 메일**(숨은 참조로 메일 앱을 엶)을 씁니다.

---

## 6. 수정 체크리스트

- [ ] 새 색은 `brand` / `navy` / `neutral` / 상태색만 썼는가? hex 직접 입력은 없는가?
- [ ] 버튼·입력은 `lms-btn` / `lms-input`을 썼는가?
- [ ] 390px 폭에서 가로 스크롤이 생기지 않는가?
- [ ] 표는 모바일 카드 목록이 있거나, 표 영역만 가로 스크롤되는가?
- [ ] 새 모달은 `BaseModal`을 쓰는가?
- [ ] 하단 탭에 가려지는 요소는 없는가(`pb-safe-nav`)?
- [ ] 관리자 화면은 `AdminPageHeader`로 시작하는가?
