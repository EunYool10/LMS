import React from 'react';
import { Award, BookOpen, LineChart, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { storage } from '../services/storage';
import { BrandLogo } from '../components/common/BrandLogo';
import { openPolicyModal } from '../components/common/PolicyModal';

/**
 * Shown to visitors who are not signed in. The LMS is for TDS employees only,
 * so no courses, announcements or other content are rendered before login.
 */
export const LoginGatePage: React.FC = () => {
  const { openAuthModal } = useAuth();
  const settings = storage.getSettings();
  const allowRegistration = settings?.allowRegistration !== false;

  const features = [
    { icon: BookOpen, title: '필수 교육부터 직무 역량까지', desc: '온보딩, 법정 의무 교육, 실무 과정을 한곳에서 수강합니다.' },
    { icon: LineChart, title: '진도와 학습 기록 자동 관리', desc: '어느 기기에서든 이어서 학습하고 진도가 기록됩니다.' },
    { icon: Award, title: '수료증 발급', desc: '과정을 마치면 인증번호가 있는 수료증이 발급됩니다.' },
  ];

  return (
    <div className="grid min-h-screen-dvh bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-navy-950 px-12 py-12 text-white lg:flex lg:flex-col">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden="true">
          <defs>
            <pattern id="gate-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gate-grid)" />
        </svg>
        <BrandLogo inverted />
        <div className="relative mt-auto max-w-md space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-snug">
              TDS 임직원을 위한
              <br />
              사내 학습 플랫폼
            </h1>
            <p className="text-[15px] leading-relaxed text-white/70">일하는 방식과 직무 역량을 배우고, 성장 기록을 한곳에 모으세요.</p>
          </div>
          <ul className="space-y-5">
            {features.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-[18px] w-[18px] text-brand-300" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="mt-0.5 block text-[13px] text-white/60">{desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-white/40">© 2026 TDSNT. All rights reserved.</p>
      </section>

      {/* Sign-in panel */}
      <section className="flex flex-col px-6 py-8 sm:px-12">
        <div className="lg:hidden">
          <BrandLogo />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h2 className="text-2xl font-bold text-neutral-900">로그인</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">
            TDSNT LMS는 사내 임직원 전용 서비스입니다. 강의를 보려면 로그인해 주세요.
          </p>

          <div className="mt-8 space-y-3">
            <button type="button" onClick={() => openAuthModal('login')} className="lms-btn lms-btn-primary h-11 w-full text-[15px]">
              <LogIn className="h-[18px] w-[18px]" />
              로그인
            </button>
            {allowRegistration && (
              <button type="button" onClick={() => openAuthModal('register')} className="lms-btn lms-btn-secondary h-11 w-full text-[15px]">
                <UserPlus className="h-[18px] w-[18px]" />
                회원가입
              </button>
            )}
          </div>

          <p className="mt-6 text-[13px] leading-relaxed text-neutral-500">
            계정이 없거나 로그인이 안 되면{' '}
            <a href={`mailto:${settings?.contactEmail || 'teamdevstudiont@gmail.com'}`} className="font-medium text-brand-700 hover:underline">
              관리자에게 문의
            </a>
            해 주세요.
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-sm gap-4 text-xs text-neutral-500">
          <button type="button" onClick={() => openPolicyModal('terms')} className="hover:text-neutral-900 cursor-pointer">
            운영 규정
          </button>
          <button type="button" onClick={() => openPolicyModal('privacy')} className="hover:text-neutral-900 cursor-pointer">
            개인정보처리방침
          </button>
        </div>
      </section>
    </div>
  );
};
