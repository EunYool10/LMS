import React, { useState, useEffect, useMemo } from 'react';
import { TERMS_OF_SERVICE, PRIVACY_POLICY, PolicyDocument } from '../../data/policyData';
import {
  X,
  FileText,
  ShieldCheck,
  Search,
  CheckCircle2,
  Calendar,
  Info,
  ExternalLink,
} from 'lucide-react';

export type PolicyType = 'terms' | 'privacy';

/**
 * Global helper to open the policy modal from any component
 */
export const openPolicyModal = (type: PolicyType = 'terms') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-policy-modal', { detail: { type } }));
  }
};

interface PolicyModalProps {
  initialType?: PolicyType;
  isOpen?: boolean;
  onClose?: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  initialType = 'terms',
  isOpen: propIsOpen,
  onClose: propOnClose,
}) => {
  const [isOpen, setIsOpen] = useState(propIsOpen ?? false);
  const [activeTab, setActiveTab] = useState<PolicyType>(initialType);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync propIsOpen if controlled
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
    }
  }, [propIsOpen]);

  // Listen for global custom event
  useEffect(() => {
    const handleOpenEvent = (event: Event) => {
      const customEvent = event as CustomEvent<{ type?: PolicyType }>;
      if (customEvent.detail?.type) {
        setActiveTab(customEvent.detail.type);
      }
      setSearchQuery('');
      setIsOpen(true);
    };

    window.addEventListener('open-policy-modal', handleOpenEvent);
    return () => window.removeEventListener('open-policy-modal', handleOpenEvent);
  }, []);

  // Handle ESC key and scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    propOnClose?.();
  };

  const currentDocument: PolicyDocument = activeTab === 'terms' ? TERMS_OF_SERVICE : PRIVACY_POLICY;

  // Filter articles by search query
  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return currentDocument.articles;

    return currentDocument.articles.filter((article) => {
      const inNumber = article.number.toLowerCase().includes(query);
      const inTitle = article.title.toLowerCase().includes(query);
      const inContent = article.content.some((p) => p.toLowerCase().includes(query));
      return inNumber || inTitle || inContent;
    });
  }, [currentDocument, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs transition-opacity duration-150"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Centered Modal Card */}
      <div
        className="fixed z-[71] w-[calc(100%-2rem)] max-w-3xl max-h-[88vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-modal-title"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  activeTab === 'terms'
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                {activeTab === 'terms' ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2
                  id="policy-modal-title"
                  className="text-lg sm:text-xl font-black text-slate-900 tracking-tight"
                >
                  {currentDocument.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span className="flex items-center gap-1 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    시행일: {currentDocument.effectiveDate}
                  </span>
                  <span>•</span>
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    최신 공식 규정
                  </span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 -mr-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Switcher & Search Bar */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('terms');
                  setSearchQuery('');
                }}
                className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'terms'
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>운영 규정 (이용약관)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('privacy');
                  setSearchQuery('');
                }}
                className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'privacy'
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>개인정보처리방침</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="조항 또는 키워드 검색..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 max-h-[calc(88vh-10rem)] text-xs sm:text-sm text-slate-700 leading-relaxed">
          {/* Overview Info Callout */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              activeTab === 'terms'
                ? 'bg-indigo-50/50 border-indigo-100 text-indigo-950'
                : 'bg-emerald-50/50 border-emerald-100 text-emerald-950'
            }`}
          >
            <Info
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                activeTab === 'terms' ? 'text-indigo-600' : 'text-emerald-600'
              }`}
            />
            <p className="text-xs leading-relaxed font-normal">{currentDocument.overview}</p>
          </div>

          {/* Search Result Counter */}
          {searchQuery && (
            <div className="text-xs text-slate-500 font-medium">
              &lsquo;{searchQuery}&rsquo; 검색 결과: 총 {filteredArticles.length}개의 조항이
              발견되었습니다.
            </div>
          )}

          {/* Articles List */}
          <div className="space-y-4">
            {filteredArticles.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Search className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold">검색어와 일치하는 조항이 없습니다.</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  전체 조항 보기
                </button>
              </div>
            ) : (
              filteredArticles.map((article) => (
                <div
                  key={article.number}
                  className="p-4 sm:p-5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-colors shadow-2xs space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                        activeTab === 'terms'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {article.number}
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
                      {article.title}
                    </h3>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pl-1">
                    {article.content.map((paragraph, idx) => (
                      <p
                        key={idx}
                        className={`leading-relaxed ${
                          paragraph.startsWith('-') || paragraph.startsWith('1.') || paragraph.startsWith('2.') || paragraph.startsWith('3.') || paragraph.startsWith('4.') || paragraph.startsWith('5.')
                            ? 'font-normal'
                            : 'font-medium text-slate-800'
                        }`}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500 hidden sm:block">
            TDSNTLMS는 관련 법령 및 규정을 엄격히 준수합니다.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleClose}
              className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>확인 및 닫기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
