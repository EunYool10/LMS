import React from 'react';
import { ExternalLink, ShieldCheck, FileText } from 'lucide-react';
import { storage } from '../../services/storage';
import { TDSLogo } from './TDSLogo';
import { openPolicyModal } from './PolicyModal';

interface FooterProps {
  onNavigate?: (view: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const settings = storage.getSettings();
  const contactEmail = settings?.contactEmail || 'teamdevstudiont@gmail.com';
  const termsUrl = settings?.termsUrl || 'https://radial-fountain-d32.notion.site/TDSNTLMS-3ceb14babbb28029a472c28df462e57e';
  const privacyUrl = settings?.privacyUrl || 'https://radial-fountain-d32.notion.site/TDSNTLMS-3ceb14babbb280748ae9f28349550219';

  const handleLink = (view: string) => {
    if (onNavigate) {
      onNavigate(view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 text-xs pt-12 pb-[calc(80px+env(safe-area-inset-bottom,0px))] sm:pb-12 mt-12 sm:mt-16">
      <div className="lms-container">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand */}
          <div className="space-y-3 sm:pr-4">
            <div className="flex items-center gap-2.5 text-white font-bold text-base">
              <TDSLogo size="sm" />
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-white leading-none">TDSNTLMS</span>
                <span className="text-[10px] text-slate-400 font-medium mt-1 leading-none">Enterprise Learning Platform</span>
              </div>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              TDS 본사 공식 사내 교육 및 직무 역량 개발을 지원하는 올인원 기업용 LMS 서비스입니다.
            </p>
          </div>

          {/* Col 2: 서비스 */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm">서비스</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('home')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  강의 탐색
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('dashboard')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  내 학습
                </button>
              </li>
              <li>
                <span className="text-slate-400 hover:text-white transition-colors cursor-pointer">
                  공지사항
                </span>
              </li>
            </ul>
          </div>

          {/* Col 3: 관리 */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm">관리</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('admin-dashboard')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  관리자 콘솔
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('admin-courses')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  강의 관리
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleLink('admin-users')}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  사용자 관리
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: 고객지원 */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-sm">고객지원</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href={`mailto:${contactEmail}`} className="hover:text-white transition-colors">
                  문의하기 ({contactEmail})
                </a>
              </li>
              <li>
                <span className="text-slate-400">운영 안내 (평일 09:00 - 18:00)</span>
              </li>
              <li className="flex items-center gap-3 pt-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => openPolicyModal('privacy')}
                  className="hover:text-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer text-xs"
                  title="개인정보처리방침 열람"
                >
                  <ShieldCheck className="w-3 h-3 text-slate-400" />
                  <span>개인정보처리방침</span>
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => openPolicyModal('terms')}
                  className="hover:text-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer text-xs"
                  title="운영 규정 (이용약관) 열람"
                >
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>운영 규정</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-xs">
          <div>© 2026 TDSNTLMS. All rights reserved.</div>
          <div className="text-slate-400 font-medium">
            온라인 교육의 새로운 표준 — TDSNTLMS
          </div>
        </div>
      </div>
    </footer>
  );
};

