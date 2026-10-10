import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Clock, FileText, Inbox, Mail, MessageSquareText, Paperclip, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { storage } from '../services/storage';
import { Inquiry } from '../types';
import { InquiryForm } from '../components/support/InquiryForm';
import { InquiryStatusBadge } from '../components/support/InquiryStatusBadge';
import { InquiryAttachments } from '../components/support/InquiryAttachments';
import { openPolicyModal } from '../components/common/PolicyModal';
import {
  formatInquiryDate,
  hasUnreadAnswer,
  inquiryCategoryLabel,
  listInquiries,
  markAnswerSeen,
} from '../services/inquiries';

type Tab = 'new' | 'history';

export const SupportPage: React.FC<{ initialTab?: Tab }> = ({ initialTab }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<Tab>(initialTab || 'new');
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const contactEmail = storage.getSettings()?.contactEmail || 'teamdevstudiont@gmail.com';

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    try {
      setItems(await listInquiries(user.id));
    } catch (e) {
      console.warn('[Inquiry] load failed', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  if (!user) return null;

  const unread = items.filter(hasUnreadAnswer).length;

  const toggle = (inquiry: Inquiry) => {
    const next = expandedId === inquiry.id ? null : inquiry.id;
    setExpandedId(next);
    if (next && hasUnreadAnswer(inquiry)) {
      markAnswerSeen(inquiry.id)
        .then((seenAt) => setItems((prev) => prev.map((i) => (i.id === inquiry.id ? { ...i, answerSeenAt: seenAt } : i))))
        .catch(() => {});
    }
  };

  const handleSubmitted = (inquiry: Inquiry) => {
    setItems((prev) => [inquiry, ...prev]);
    setExpandedId(inquiry.id);
    setTab('history');
    showToast('문의가 운영팀에 전달되었어요. 답변이 오면 여기에서 확인할 수 있어요.', 'success', '문의 접수');
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'new', label: '새 문의' },
    { id: 'history', label: '내 문의 내역', count: items.length },
  ];

  return (
    <div className="min-w-0">
      <section className="border-b border-neutral-200 bg-white">
        <div className="lms-container pt-8">
          <p className="lms-eyebrow">고객 지원</p>
          <h1 className="mt-1.5 text-2xl font-bold text-neutral-900">문의하기</h1>
          <p className="mt-1 text-sm text-neutral-500">학습, 계정, 수료증, 오류 등 궁금한 점을 운영팀에 바로 보낼 수 있어요.</p>
          <div className="mt-6 flex gap-6" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-1.5 pb-3 text-[15px] font-medium transition-colors cursor-pointer ${
                  tab === t.id ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && <span className="text-sm tabular-nums text-neutral-400">{t.count}</span>}
                {t.id === 'history' && unread > 0 && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-label="새 답변" />}
                {tab === t.id && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand-600" />}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="lms-container grid gap-6 py-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0">
          {tab === 'new' && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
              <InquiryForm user={user} onSubmitted={handleSubmitted} />
            </div>
          )}

          {tab === 'history' && (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              {loading ? (
                <ul className="divide-y divide-neutral-100">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="space-y-2 px-5 py-4">
                      <div className="h-3 w-32 animate-pulse rounded bg-neutral-100" />
                      <div className="h-4 w-2/3 animate-pulse rounded bg-neutral-100" />
                    </li>
                  ))}
                </ul>
              ) : loadError ? (
                <div className="px-5 py-14 text-center">
                  <p className="text-sm text-neutral-600">문의 내역을 불러오지 못했어요.</p>
                  <button type="button" onClick={load} className="lms-btn lms-btn-secondary lms-btn-sm mt-4">
                    다시 시도
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <Inbox className="mx-auto h-10 w-10 text-neutral-300" strokeWidth={1.5} />
                  <p className="mt-3 text-sm font-medium text-neutral-800">아직 남긴 문의가 없어요</p>
                  <p className="mt-1 text-[13px] text-neutral-500">궁금한 점이 생기면 운영팀에 편하게 물어보세요.</p>
                  <button type="button" onClick={() => setTab('new')} className="lms-btn lms-btn-primary lms-btn-sm mt-5">
                    문의 작성하기
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {items.map((inq) => {
                    const open = expandedId === inq.id;
                    const isNew = hasUnreadAnswer(inq);
                    return (
                      <li key={inq.id}>
                        <button
                          type="button"
                          onClick={() => toggle(inq)}
                          aria-expanded={open}
                          className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-neutral-50 cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                              <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium text-neutral-600">{inquiryCategoryLabel(inq.category)}</span>
                              <span className="tabular-nums">{formatInquiryDate(inq.createdAt)}</span>
                              {isNew && <span className="font-semibold text-rose-600">새 답변</span>}
                            </div>
                            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                              <span className="truncate">{inq.title}</span>
                              {!!inq.attachments?.length && <Paperclip className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-label="첨부파일 있음" />}
                            </p>
                          </div>
                          <InquiryStatusBadge inquiry={inq} />
                          <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                        </button>
                        {open && (
                          <div className="space-y-3 px-5 pb-5">
                            <div className="space-y-3 rounded-lg border border-neutral-200 px-4 py-3">
                              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">{inq.content}</p>
                              <InquiryAttachments attachments={inq.attachments} />
                            </div>
                            {inq.status === 'answered' && inq.answer ? (
                              <div className="rounded-lg border-l-[3px] border-brand-600 bg-brand-50/60 px-4 py-3">
                                <p className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                                  <span className="font-semibold text-brand-700">운영팀 답변</span>
                                  {inq.answeredByName && <span>{inq.answeredByName}</span>}
                                  <span className="tabular-nums">{formatInquiryDate(inq.answeredAt)}</span>
                                </p>
                                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{inq.answer}</p>
                              </div>
                            ) : (
                              <p className="flex items-center gap-1.5 text-[13px] text-neutral-500">
                                <Clock className="h-4 w-4" />
                                운영팀이 확인하고 있어요. 답변이 등록되면 이곳에 표시돼요.
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <MessageSquareText className="h-4 w-4 text-neutral-400" />
              문의 안내
            </h2>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-neutral-600">
              <li>운영 시간: 평일 09:00–18:00</li>
              <li>접수된 문의는 관리자 콘솔로 바로 전달되고, 순서대로 확인해 답변해요.</li>
              <li>답변이 등록되면 ‘내 문의 내역’에 표시돼요.</li>
            </ul>
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {[
              { label: '운영 규정', icon: FileText, onClick: () => openPolicyModal('terms') },
              { label: '개인정보처리방침', icon: ShieldCheck, onClick: () => openPolicyModal('privacy') },
            ].map(({ label, icon: Icon, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className="flex w-full items-center gap-2.5 border-b border-neutral-100 px-5 py-3.5 text-left text-sm text-neutral-700 last:border-0 hover:bg-neutral-50 cursor-pointer"
              >
                <Icon className="h-4 w-4 text-neutral-400" />
                <span className="flex-1">{label}</span>
                <ChevronRight className="h-4 w-4 text-neutral-400" />
              </button>
            ))}
          </div>

          <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-neutral-500">
            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              급한 일은 이메일로도 연락할 수 있어요.{' '}
              <a href={`mailto:${contactEmail}`} className="font-medium text-brand-700 hover:underline">
                {contactEmail}
              </a>
            </span>
          </p>
        </aside>
      </div>
    </div>
  );
};
