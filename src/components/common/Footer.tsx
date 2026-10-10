import React from 'react';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from './BrandLogo';
import { openPolicyModal } from './PolicyModal';

interface FooterProps {
  onNavigate?: (view: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { isAuthenticated, isAdmin } = useAuth();
  const settings = storage.getSettings();
  const contactEmail = settings?.contactEmail || 'teamdevstudiont@gmail.com';

  const go = (view: string) => {
    onNavigate?.(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const linkClass = 'text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer';
  const columns: { title: string; links: { label: string; onClick?: () => void; href?: string }[] }[] = [
    {
      title: '학습',
      links: [
        { label: '강의 둘러보기', onClick: () => go('home') },
        ...(isAuthenticated ? [{ label: '내 학습', onClick: () => go('dashboard') }] : []),
      ],
    },
    ...(isAdmin
      ? [
          {
            title: '관리',
            links: [
              { label: '관리자 콘솔', onClick: () => go('admin-dashboard') },
              { label: '강의 관리', onClick: () => go('admin-courses') },
              { label: '사용자 관리', onClick: () => go('admin-users') },
            ],
          },
        ]
      : []),
    {
      title: '지원',
      links: [
        { label: '문의하기', onClick: () => go('support') },
        { label: '개인정보처리방침', onClick: () => openPolicyModal('privacy') },
        { label: '운영 규정', onClick: () => openPolicyModal('terms') },
      ],
    },
  ];

  return (
    <footer className="mt-16 border-t border-neutral-200 bg-white pb-[calc(80px+env(safe-area-inset-bottom,0px))] text-sm md:pb-0">
      <div className="lms-container flex flex-col gap-10 py-10 md:flex-row md:justify-between">
        <div className="max-w-xs space-y-3">
          <BrandLogo />
          <p className="text-[13px] leading-relaxed text-neutral-500">
            TDS 본사 임직원의 사내 교육과 직무 역량 개발을 지원하는 학습 플랫폼입니다.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:gap-16">
          {columns.map((col) => (
            <div key={col.title} className="space-y-3">
              <h4 className="text-[13px] font-semibold text-neutral-900">{col.title}</h4>
              <ul className="space-y-2 text-[13px]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href ? (
                      <a href={l.href} className={linkClass}>
                        {l.label}
                      </a>
                    ) : (
                      <button type="button" onClick={l.onClick} className={linkClass}>
                        {l.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-neutral-100">
        <div className="lms-container flex flex-col gap-1 py-5 text-xs text-neutral-500 sm:flex-row sm:justify-between">
          <span>© 2026 TDSNTLMS. All rights reserved.</span>
          <span>
            운영 시간 평일 09:00–18:00 · {contactEmail}
          </span>
        </div>
      </div>
    </footer>
  );
};
