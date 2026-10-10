import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PolicyDocument } from '../../data/policyData';
import { getPolicyDocument, POLICY_LABELS, PolicyType } from '../../services/policies';

export type { PolicyType } from '../../services/policies';

const OPEN_EVENT = 'open-policy-modal';

/**
 * Opens the policy viewer from anywhere. Pass `preview` to show an unsaved draft (admin settings).
 */
export const openPolicyModal = (type: PolicyType = 'terms', preview?: PolicyDocument) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { type, preview } }));
  }
};

const isListLine = (p: string) => /^(\d+\.|-|·|\*)\s/.test(p);

/** Mounted once at the app root; listens for openPolicyModal(). */
export const PolicyModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PolicyType>('terms');
  const [preview, setPreview] = useState<PolicyDocument | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ type?: PolicyType; preview?: PolicyDocument }>).detail;
      setActiveTab(detail?.type || 'terms');
      setPreview(detail?.preview || null);
      setIsOpen(true);
    };
    window.addEventListener(OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [activeTab, isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const doc = preview || getPolicyDocument(activeTab);
  const anchorId = (i: number) => `policy-article-${i}`;
  const scrollToArticle = (i: number) => {
    const el = document.getElementById(anchorId(i));
    if (el && bodyRef.current) {
      bodyRef.current.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' });
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-neutral-950/50" onClick={() => setIsOpen(false)} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-modal-title"
        className="relative flex h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:h-[min(88vh,860px)] sm:max-w-4xl sm:rounded-2xl"
      >
        {/* Header */}
        <div className="shrink-0 border-b border-neutral-200 px-5 pb-4 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            {preview ? (
              <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">미리보기 · 저장 전 문구</span>
            ) : (
              <div className="inline-flex rounded-lg bg-neutral-100 p-1" role="tablist">
                {(['terms', 'privacy'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === t}
                    onClick={() => setActiveTab(t)}
                    className={`h-8 rounded-md px-3 text-[13px] font-medium transition-colors cursor-pointer ${
                      activeTab === t ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    {POLICY_LABELS[t]}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="-mr-2 rounded-md p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <h2 id="policy-modal-title" className="mt-4 text-lg font-bold text-neutral-900 sm:text-xl">
            {doc.title}
          </h2>
          <p className="mt-1 text-[13px] text-neutral-500">
            시행일 {doc.effectiveDate}
            {doc.lastUpdated && doc.lastUpdated !== doc.effectiveDate && <> · 최종 수정 {doc.lastUpdated}</>}
          </p>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 md:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="조항 목차" className="hidden overflow-y-auto border-r border-neutral-100 bg-neutral-50/60 px-3 py-4 md:block">
            <p className="px-2 pb-2 text-xs font-medium text-neutral-400">목차</p>
            <ol className="space-y-0.5">
              {doc.articles.map((a, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => scrollToArticle(i)}
                    className="flex w-full gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-neutral-600 hover:bg-white hover:text-neutral-900 cursor-pointer"
                  >
                    {a.number && <span className="shrink-0 tabular-nums text-neutral-400">{a.number}</span>}
                    <span className="min-w-0 truncate">{a.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div ref={bodyRef} className="relative overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
            {doc.overview && <p className="rounded-lg bg-neutral-50 px-4 py-3 text-[13px] leading-relaxed text-neutral-600">{doc.overview}</p>}
            <div className="mt-6 space-y-7">
              {doc.articles.map((a, i) => (
                <section key={i} id={anchorId(i)} className="scroll-mt-4">
                  <h3 className="text-[15px] font-semibold text-neutral-900">
                    {a.number && <span className="mr-1.5 text-brand-700">{a.number}</span>}
                    {a.title}
                  </h3>
                  <div className="mt-2 space-y-1.5 text-sm leading-relaxed text-neutral-700">
                    {a.content.map((p, j) => (
                      <p key={j} className={isListLine(p) ? 'pl-3' : ''}>
                        {p}
                      </p>
                    ))}
                  </div>
                </section>
              ))}
              {doc.articles.length === 0 && <p className="py-10 text-center text-sm text-neutral-400">등록된 조항이 없습니다.</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-neutral-200 px-5 py-3 sm:px-6">
          <p className="hidden text-xs text-neutral-500 sm:block">궁금한 점은 「문의하기」로 운영팀에 물어보세요.</p>
          <button type="button" onClick={() => setIsOpen(false)} className="lms-btn lms-btn-primary ml-auto">
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
