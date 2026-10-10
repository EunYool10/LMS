import { Category } from '../types';

export const CATEGORIES_DATA: Category[] = [
  {
    id: 'company-academy',
    name: '사내 아카데미',
    slug: 'company-academy',
    icon: 'Building2',
    description: '신입사원 온보딩, 필수 법정의무교육, 정보보안, 조직문화 및 사내 시스템/프로세스 교육',
    color: 'indigo',
    subcategories: [
      {
        id: 'sub_acad_onboarding',
        name: '신입사원 · 온보딩',
        subfields: ['신입사원 교육', '신규입사자 온보딩', '회사 소개', '회사 비전', '핵심가치', '사내 기본교육'],
      },
      {
        id: 'sub_acad_culture',
        name: '조직문화 · 가치',
        subfields: ['조직문화', '회사 소개', '회사 비전', '핵심가치', '경영진 메시지', '임직원 공통교육'],
      },
      {
        id: 'sub_acad_mandatory',
        name: '필수교육 · 법정의무',
        subfields: ['필수교육', '법정의무교육', '개인정보 보호', '정보보안', '안전교육', '사내 규정', '사내 정책', '직장 내 기본교육'],
      },
      {
        id: 'sub_acad_system',
        name: '사내 시스템 · 프로세스',
        subfields: ['사내 시스템 교육', '사내 프로그램 사용법', '업무 프로세스', '내부 매뉴얼 영상', '사내 포털'],
      },
      {
        id: 'sub_acad_dept',
        name: '부서별 교육 · 사내특강',
        subfields: ['부서별 교육', '사내 특강', '직무별 사내교육', '사내 세미나'],
      },
    ],
  },
  {
    id: 'job-competency',
    name: '직무 역량',
    slug: 'job-competency',
    icon: 'Target',
    description: '실무역량 강화, 비즈니스 커뮤니케이션, 협업, 리더십, 프로젝트 관리 및 문제해결',
    color: 'blue',
    subcategories: [
      {
        id: 'sub_comp_practical',
        name: '실무역량',
        subfields: ['직무교육', '직무별 교육', '업무역량', '비즈니스 문서', '보고서 작성', '프레젠테이션'],
      },
      {
        id: 'sub_comp_comm',
        name: '커뮤니케이션',
        subfields: ['커뮤니케이션', '비즈니스 커뮤니케이션', '협업', '회의 운영', '갈등관리'],
      },
      {
        id: 'sub_comp_collab',
        name: '협업',
        subfields: ['협업', '팀워크', '사내 협업 툴', '크로스펑셔널 협업'],
      },
      {
        id: 'sub_comp_leadership',
        name: '리더십',
        subfields: ['리더십', '관리자 교육', '조직관리', '리더 역량', '피드백 코칭'],
      },
      {
        id: 'sub_comp_pm',
        name: '프로젝트 관리',
        subfields: ['프로젝트 관리', '애자일', '일정관리', 'WBS', '자원관리'],
      },
      {
        id: 'sub_comp_ps',
        name: '문제해결',
        subfields: ['문제해결', '의사결정', '전략적 사고', '논리적 사고'],
      },
      {
        id: 'sub_comp_prod',
        name: '업무 생산성',
        subfields: ['업무 생산성', '시간관리', '업무 효율화', '스마트워크'],
      },
    ],
  },
  {
    id: 'ai-data',
    name: 'AI · 데이터',
    slug: 'ai-data',
    icon: 'BrainCircuit',
    description: '생성형 AI, ChatGPT, AI 업무 자동화, 데이터 분석, 머신러닝 및 딥러닝',
    color: 'purple',
    subcategories: [
      {
        id: 'sub_ai_gen',
        name: '생성형 AI',
        subfields: ['생성형 AI', 'ChatGPT', 'Claude', '프롬프트 엔지니어링', 'AI 에이전트'],
      },
      {
        id: 'sub_ai_work',
        name: '업무용 AI',
        subfields: ['AI 업무 활용', '업무 자동화', '스마트 오피스 AI', 'AI 도구 활용'],
      },
      {
        id: 'sub_ai_auto',
        name: 'AI 자동화',
        subfields: ['AI 자동화', 'AI 에이전트', 'RAG 시스템', '워크플로우 자동화'],
      },
      {
        id: 'sub_ai_content',
        name: 'AI 콘텐츠',
        subfields: ['AI 콘텐츠 제작', 'Midjourney', 'AI 이미지 생성', '생성형 영상'],
      },
      {
        id: 'sub_ai_data',
        name: '데이터 분석',
        subfields: ['데이터 분석', '데이터 시각화', 'Pandas', 'Tableau', 'Power BI', '빅데이터', '통계'],
      },
      {
        id: 'sub_ai_vis',
        name: '데이터 시각화',
        subfields: ['데이터 시각화', 'Tableau', 'Power BI', '차트 대시보드'],
      },
      {
        id: 'sub_ai_ml',
        name: '머신러닝',
        subfields: ['머신러닝', '딥러닝', '자연어 처리', '컴퓨터 비전', 'PyTorch', 'TensorFlow'],
      },
      {
        id: 'sub_ai_dev',
        name: 'AI 개발',
        subfields: ['AI 개발', 'AI 서비스', 'LLM 파인튜닝', 'RAG', 'AI 모델 배포'],
      },
    ],
  },
  {
    id: 'dev-it',
    name: '개발 · IT',
    slug: 'dev-it',
    icon: 'Code2',
    description: '프로그래밍 언어, 웹/앱 개발, 서버, 클라우드, 데이터베이스, DevOps 및 보안',
    color: 'indigo',
    subcategories: [
      {
        id: 'sub_dev_prog',
        name: '프로그래밍',
        subfields: ['프로그래밍', 'Python', 'Java', 'JavaScript', 'C', 'C++', 'TypeScript', 'Go', 'Rust', 'Kotlin', 'Swift'],
      },
      {
        id: 'sub_dev_web',
        name: '웹 개발',
        subfields: ['웹 개발', '프론트엔드', '백엔드', '풀스택', 'React', 'Next.js', 'Vue.js', 'Node.js', 'Spring Boot'],
      },
      {
        id: 'sub_dev_app',
        name: '앱 개발',
        subfields: ['앱 개발', '모바일 개발', 'iOS', 'Android', 'Flutter', 'React Native'],
      },
      {
        id: 'sub_dev_fe',
        name: '프론트엔드',
        subfields: ['프론트엔드', 'HTML/CSS', 'React', 'Next.js', 'Vue.js', '웹UI', 'TypeScript'],
      },
      {
        id: 'sub_dev_be',
        name: '백엔드',
        subfields: ['백엔드', 'Node.js', 'Spring Boot', 'Python', 'Django', 'API', '마이크로서비스'],
      },
      {
        id: 'sub_dev_infra',
        name: '서버·클라우드',
        subfields: ['서버', '클라우드', 'AWS', 'GCP', 'Azure', 'Linux', '서버 구축'],
      },
      {
        id: 'sub_dev_db',
        name: '데이터베이스',
        subfields: ['데이터베이스', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQL', 'ORM'],
      },
      {
        id: 'sub_dev_devops',
        name: 'DevOps',
        subfields: ['DevOps', 'Docker', 'Kubernetes', 'CI/CD', 'Git', 'GitHub'],
      },
      {
        id: 'sub_dev_sec',
        name: '보안',
        subfields: ['정보보안', '사이버보안', '네트워크', '시스템', '소프트웨어 개발'],
      },
      {
        id: 'sub_dev_iot',
        name: 'IoT',
        subfields: ['IoT', '임베디드', '하드웨어 제어', '센서 네트워크'],
      },
    ],
  },
  {
    id: 'design-content',
    name: '디자인 · 콘텐츠',
    slug: 'design-content',
    icon: 'Palette',
    description: 'UI/UX, Figma, 그래픽 디자인, 브랜딩, 일러스트, 3D 및 디지털 콘텐츠 디자인',
    color: 'rose',
    subcategories: [
      {
        id: 'sub_des_uiux',
        name: 'UI/UX',
        subfields: ['UI/UX', 'Figma', '디자인 시스템', '와이어프레임', '프로토타입', '모바일 UI'],
      },
      {
        id: 'sub_des_graphic',
        name: '그래픽 디자인',
        subfields: ['그래픽 디자인', 'Photoshop', 'Illustrator', '편집 디자인'],
      },
      {
        id: 'sub_des_web',
        name: '웹 디자인',
        subfields: ['웹 디자인', '반응형 디자인', '랜딩페이지', '웹 퍼블리싱'],
      },
      {
        id: 'sub_des_branding',
        name: '브랜딩',
        subfields: ['브랜딩', '로고 디자인', '캐릭터 디자인', '브랜드 아이덴티티'],
      },
      {
        id: 'sub_des_illust',
        name: '일러스트',
        subfields: ['일러스트', '디지털 드로잉', '캐릭터 디자인', '삽화'],
      },
      {
        id: 'sub_des_3d',
        name: '3D',
        subfields: ['3D', 'Blender', '3D 모델링', '렌더링'],
      },
      {
        id: 'sub_des_content',
        name: '콘텐츠 디자인',
        subfields: ['콘텐츠 디자인', '카드뉴스', '인포그래픽', '마케팅 배너', '디자인 시스템'],
      },
    ],
  },
  {
    id: 'video-media',
    name: '영상 · 미디어',
    slug: 'video-media',
    icon: 'Video',
    description: '영상 기획/촬영, Premiere Pro/After Effects 편집, 모션그래픽, 유튜브/숏폼, AI 영상 및 방송 미디어',
    color: 'red',
    subcategories: [
      {
        id: 'sub_vid_plan',
        name: '영상 기획',
        subfields: ['영상 기획', '영상 콘텐츠 기획', '스토리보드', '시나리오', '콘티', '영상 연출'],
      },
      {
        id: 'sub_vid_shoot',
        name: '촬영',
        subfields: ['영상 촬영', '촬영 기법', '카메라', '조명', '음향', '영상 제작 실무'],
      },
      {
        id: 'sub_vid_edit',
        name: '영상 편집',
        subfields: ['Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Final Cut Pro', '영상 컷 편집', '색보정', '자막', '음향 편집', '영상 후반작업'],
      },
      {
        id: 'sub_vid_motion',
        name: '모션그래픽',
        subfields: ['모션그래픽', 'VFX', '2D 모션', '3D 모션', '타이틀 디자인'],
      },
      {
        id: 'sub_vid_corp',
        name: '기업영상',
        subfields: ['기업 홍보영상', '사내교육 영상', '인터뷰 영상', '제품 소개 영상', '브랜드 영상', '강의 영상', '온라인 교육 콘텐츠'],
      },
      {
        id: 'sub_vid_content',
        name: '영상 콘텐츠',
        subfields: ['영상 콘텐츠', '콘텐츠 제작', '디지털 비디오', '웹 영상'],
      },
      {
        id: 'sub_vid_youtube',
        name: '유튜브·숏폼',
        subfields: ['유튜브', '숏폼', '릴스', '쇼츠', '틱톡', '1인 미디어'],
      },
      {
        id: 'sub_vid_aivid',
        name: 'AI 영상',
        subfields: ['AI 영상 제작', 'AI 이미지 생성', 'AI 아바타', 'AI 음성', 'AI 더빙', 'AI 자막', 'AI 영상 편집', '생성형 영상'],
      },
      {
        id: 'sub_vid_virtual',
        name: '버추얼 콘텐츠',
        subfields: ['버추얼 콘텐츠', '버추얼 아바타', '메타버스 비디오', '가상 스튜디오'],
      },
      {
        id: 'sub_vid_media',
        name: '방송·미디어',
        subfields: ['방송 제작', '라이브 스트리밍', '온라인 방송', '콘텐츠 운영', '미디어 기획', '영상 채널 운영'],
      },
    ],
  },
  {
    id: 'planning-business',
    name: '기획 · 비즈니스',
    slug: 'planning-business',
    icon: 'Briefcase',
    description: '서비스 기획, PM/PO, 사업기획, 스타트업, 비즈니스 모델 및 경영 전략',
    color: 'sky',
    subcategories: [
      {
        id: 'sub_biz_service',
        name: '서비스 기획 · PM',
        subfields: ['서비스 기획', '상품 기획', '프로젝트 기획', 'PM', 'PO', '기획서 작성', '역기획'],
      },
      {
        id: 'sub_biz_pm',
        name: '프로젝트 관리',
        subfields: ['프로젝트 관리', '애자일/스크럼', 'Jira', 'Notion'],
      },
      {
        id: 'sub_biz_startup',
        name: '사업 기획 · 스타트업',
        subfields: ['사업기획', '경영', '창업', '스타트업', '비즈니스 모델', '시장조사', '사업계획서', 'IR 피칭'],
      },
      {
        id: 'sub_biz_strat',
        name: '전략 · 의사결정',
        subfields: ['전략', '문제해결', '의사결정', '조직관리', '업무기획'],
      },
    ],
  },
  {
    id: 'marketing-pr',
    name: '마케팅 · 홍보',
    slug: 'marketing-pr',
    icon: 'TrendingUp',
    description: '디지털 마케팅, SNS 마케팅, 퍼포먼스 광고, 브랜드 홍보 및 마케팅 데이터 분석',
    color: 'amber',
    subcategories: [
      {
        id: 'sub_mkt_digital',
        name: '디지털 · 퍼포먼스 마케팅',
        subfields: ['디지털 마케팅', '퍼포먼스 마케팅', '검색광고', '온라인 광고', 'GA4', '메타 광고'],
      },
      {
        id: 'sub_mkt_sns',
        name: 'SNS · 콘텐츠 마케팅',
        subfields: ['SNS 마케팅', '콘텐츠 마케팅', '유튜브 마케팅', 'SNS 운영', '블로그', '인스타그램', '틱톡'],
      },
      {
        id: 'sub_mkt_brand',
        name: '브랜드 · 홍보 · PR',
        subfields: ['브랜드 마케팅', '브랜딩', '홍보', 'PR', '카피라이팅', '언론 홍보'],
      },
      {
        id: 'sub_mkt_data',
        name: '고객 분석 · 커머스',
        subfields: ['고객 분석', '마케팅 데이터', '쇼핑몰 마케팅', 'CRM', '그로스해킹'],
      },
    ],
  },
  {
    id: 'work-office',
    name: '업무 · 오피스',
    slug: 'work-office',
    icon: 'FileSpreadsheet',
    description: 'Excel, PowerPoint, Word, 한글, Google Workspace, Notion 및 실무 생산성 도구',
    color: 'emerald',
    subcategories: [
      {
        id: 'sub_off_excel',
        name: 'Excel · 스프레드시트',
        subfields: ['Excel', '스프레드시트', 'Google Workspace', '엑셀 함수', '피벗테이블', 'VBA/매크로'],
      },
      {
        id: 'sub_off_doc',
        name: '문서 작성 · 프레젠테이션',
        subfields: ['PowerPoint', 'Word', '한글', '문서작성', '보고서', '프레젠테이션', '비즈니스 문서'],
      },
      {
        id: 'sub_off_auto',
        name: '업무 자동화 · 협업 도구',
        subfields: ['Notion', '업무자동화', '협업도구', '일정관리', '자료관리', '업무 생산성'],
      },
    ],
  },
  {
    id: 'career-job',
    name: '취업 · 커리어',
    slug: 'career-job',
    icon: 'GraduationCap',
    description: '취업 준비, 자기소개서, 이력서, 포트폴리오, 면접 및 직장생활 역량 설계',
    color: 'cyan',
    subcategories: [
      {
        id: 'sub_car_doc',
        name: '서류 · 포트폴리오',
        subfields: ['취업 준비', '자기소개서', '이력서', '포트폴리오', '직무 역량'],
      },
      {
        id: 'sub_car_interview',
        name: '면접 대비 · 전략',
        subfields: ['면접', '모의면접', '취업 전략', '기술 면접', '임원 면접'],
      },
      {
        id: 'sub_car_path',
        name: '진로 · 커리어 설계',
        subfields: ['직무 탐색', '진로 탐색', '커리어 설계', '이직 준비', '연봉 협상'],
      },
      {
        id: 'sub_car_manner',
        name: '직장생활 · 비즈니스 매너',
        subfields: ['직장생활', '비즈니스 매너', '커뮤니케이션', '사내 관계'],
      },
    ],
  },
  {
    id: 'cert-exam',
    name: '자격증 · 시험',
    slug: 'cert-exam',
    icon: 'Award',
    description: '정보처리기사, 컴퓨터활용능력, 전산회계/세무 및 국가/민간 기술자격 시험 대비',
    color: 'teal',
    subcategories: [
      {
        id: 'sub_cert_it',
        name: 'IT · 국가기술자격',
        subfields: ['IT 자격증', '정보처리기사', '정보처리산업기사', 'SQLD', '리눅스마스터', '네트워크관리사'],
      },
      {
        id: 'sub_cert_office',
        name: '사무 · 전산 · 회계',
        subfields: ['컴퓨터활용능력', '워드프로세서', '전산회계', '전산세무', 'ERP정보관리사'],
      },
      {
        id: 'sub_cert_prep',
        name: '자격 시험 대비',
        subfields: ['국가기술자격', '민간자격', '필기', '실기', '시험 대비', '기출문제'],
      },
    ],
  },
  {
    id: 'etc',
    name: '기타',
    slug: 'etc',
    icon: 'MoreHorizontal',
    description: '외국어, 자기계발, 취미, 교양, 리더십 및 융합·특수 전문 교육',
    color: 'slate',
    subcategories: [
      {
        id: 'sub_etc_lang',
        name: '외국어 · 글로벌',
        subfields: ['외국어', '비즈니스 영어', '회화', '글로벌 역량'],
      },
      {
        id: 'sub_etc_growth',
        name: '자기계발 · 교양',
        subfields: ['자기계발', '취미', '교양', '생활', '리더십', '시간관리'],
      },
      {
        id: 'sub_etc_special',
        name: '신기술 · 특수교육',
        subfields: ['새로운 기술', '특수교육', '융합교육', '기타 전문교육', '교육'],
      },
    ],
  },
];

/**
 * Maps legacy category IDs to new comprehensive category taxonomy
 */
export const LEGACY_CATEGORY_MAP: Record<string, string> = {
  cat_dev: 'dev-it',
  cat_ai_data: 'ai-data',
  cat_design: 'design-content',
  cat_biz: 'planning-business',
  development: 'dev-it',
  design: 'design-content',
  business: 'planning-business',
  'ai-data': 'ai-data',
  'company-academy': 'company-academy',
  'in-house-academy': 'company-academy',
  'job-competency': 'job-competency',
  'video-media': 'video-media',
  'planning-business': 'planning-business',
  'marketing-pr': 'marketing-pr',
  'work-office': 'work-office',
  'career-job': 'career-job',
  'cert-exam': 'cert-exam',
  etc: 'etc',
};

/**
 * Returns matching category or fallback
 */
export function getCategoryById(id?: string): Category | undefined {
  if (!id) return undefined;
  const targetId = LEGACY_CATEGORY_MAP[id] || id;
  return CATEGORIES_DATA.find((c) => c.id === targetId || c.slug === targetId);
}

/**
 * Search category by keyword (checking name, subcategory names, and subfield keywords)
 */
export function findCategoriesByKeyword(query: string): Category[] {
  const q = query.trim().toLowerCase();
  if (!q) return CATEGORIES_DATA;

  return CATEGORIES_DATA.filter((cat) => {
    if (cat.name.toLowerCase().includes(q) || cat.description.toLowerCase().includes(q)) {
      return true;
    }
    return cat.subcategories?.some((sub) => {
      if (sub.name.toLowerCase().includes(q)) return true;
      return sub.subfields.some((field) => field.toLowerCase().includes(q));
    });
  });
}
