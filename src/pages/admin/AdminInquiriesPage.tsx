import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Inbox, Mail, MessageSquareText, Pencil, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Inquiry, InquiryCategory } from '../../types';
import { AdminPageHeader, AdminStatStrip } from '../../components/admin/AdminPageHeader';
import { BaseModal } from '../../components/common/BaseModal';
import { InquiryStatusBadge } from '../../components/support/InquiryStatusBadge';
import {
  INQUIRY_CATEGORIES,
  answerInquiry,
  deleteInquiry,
  formatInquiryDate,
  formatRelative,
  inquiryCategoryLabel,
  listInquiries,
} from '../../services/inquiries';

type StatusFilter = 'open' | 'answered' | 'all';

function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 60) return `${Math.max(min, 1)}분`;
  const hours = min / 60;
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)}시간`;
  return `${(hours / 24).toFixed(1)}일`;
}

function replyMailto(inq: Inquiry): string {
  const subject = `[TDSNT LMS] 문의하신 「${inq.title}」에 대한 답변`;
  const body = `${inq.userName}님, 안녕하세요.\nTDSNT LMS 운영팀입니다.\n\n${inq.answer || ''}\n\n감사합니다.\n\n----- 문의 내용 (${formatInquiryDate(inq.createdAt)}) -----\n${inq.content}`;
  return `mailto:${inq.userEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export const AdminInquiriesPage: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [status, setStatus] = useState<StatusFilter>('open');
  const [category, setCategory] = useState<InquiryCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Inquiry | null>(null);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setItems(await listInquiries());
    } catch (e) {
      console.warn('[Inquiry] admin load failed', e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selected = items.find((i) => i.id === selectedId) || null;

  useEffect(() => {
    setDraft(selected?.answer || '');
    setEditing(!selected?.answer);
  }, [selectedId]);

  const openCount = items.filter((i) => i.status === 'open').length;
  const answered = items.filter((i) => i.status === 'answered' && i.answeredAt);
  const avgResponse = answered.length
    ? formatDuration(answered.reduce((sum, i) => sum + (Date.parse(i.answeredAt!) - Date.parse(i.createdAt)), 0) / answered.length)
    : '—';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (status !== 'all' && i.status !== status) return false;
      if (category !== 'all' && i.category !== category) return false;
      if (!q) return true;
      return [i.title, i.content, i.userName, i.userEmail].some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [items, status, category, search]);

  const handleAnswer = async () => {
    if (!selected || !user || !draft.trim()) return;
    setSaving(true);
    try {
      const patch = await answerInquiry(selected.id, draft, { id: user.id, name: user.name });
      setItems((prev) => prev.map((i) => (i.id === selected.id ? { ...i, ...patch } : i)));
      setEditing(false);
      showToast(
        selected.userId ? '답변을 등록했어요. 작성자의 ‘내 문의 내역’에 표시됩니다.' : '답변을 저장했어요. ‘메일로 보내기’로 이메일 답장을 보내 주세요.',
        'success'
      );
    } catch (e) {
      console.warn('[Inquiry] answer failed', e);
      showToast('답변을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInquiry(deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) setSelectedId(null);
      showToast('문의를 삭제했어요.', 'success');
    } catch {
      showToast('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const statusTabs: { id: StatusFilter; label: string; count?: number }[] = [
    { id: 'open', label: '답변 대기', count: openCount },
    { id: 'answered', label: '답변 완료' },
    { id: 'all', label: '전체' },
  ];

  return (
    <div className="min-w-0 space-y-6">
      <AdminPageHeader
        title="문의 관리"
        description="직원과 방문자가 보낸 문의를 확인하고 답변합니다. 회원에게는 답변이 ‘내 문의 내역’에 표시됩니다."
        actions={
          <button type="button" onClick={load} disabled={loading} className="lms-btn lms-btn-secondary lms-btn-sm">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        }
      />

      <AdminStatStrip
        loading={loading}
        stats={[
          { label: '답변 대기', value: <span className={openCount > 0 ? 'text-amber-600' : ''}>{openCount}</span>, hint: openCount > 0 ? '확인이 필요해요' : '모두 처리했어요' },
          { label: '답변 완료', value: answered.length },
          { label: '전체 문의', value: items.length },
          { label: '평균 답변 시간', value: avgResponse },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,400px)_minmax(0,1fr)] lg:items-start">
        {/* List */}
        <section className={`overflow-hidden rounded-xl border border-neutral-200 bg-white ${selected ? 'hidden lg:block' : ''}`}>
          <div className="space-y-3 border-b border-neutral-200 p-4">
            <div className="grid grid-cols-3 rounded-lg bg-neutral-100 p-1" role="tablist">
              {statusTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={status === t.id}
                  onClick={() => setStatus(t.id)}
                  className={`flex h-8 items-center justify-center gap-1 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
                    status === t.id ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  {t.label}
                  {!!t.count && <span className="tabular-nums text-amber-600">{t.count}</span>}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="제목, 내용, 이름, 이메일" className="lms-input h-9 pl-9 text-[13px]" />
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InquiryCategory | 'all')}
                className="lms-input h-9 w-auto pr-8 text-[13px]"
                aria-label="문의 유형"
              >
                <option value="all">전체 유형</option>
                {INQUIRY_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <ul className="divide-y divide-neutral-100">
              {[0, 1, 2, 3].map((i) => (
                <li key={i} className="space-y-2 px-4 py-3.5">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-neutral-100" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-neutral-100" />
                </li>
              ))}
            </ul>
          ) : loadError ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-neutral-600">문의를 불러오지 못했어요.</p>
              <button type="button" onClick={load} className="lms-btn lms-btn-secondary lms-btn-sm mt-3">
                다시 시도
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <Inbox className="mx-auto h-9 w-9 text-neutral-300" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-neutral-600">{status === 'open' && !search && category === 'all' ? '답변을 기다리는 문의가 없어요.' : '조건에 맞는 문의가 없어요.'}</p>
            </div>
          ) : (
            <ul className="max-h-[640px] divide-y divide-neutral-100 overflow-y-auto">
              {filtered.map((inq) => {
                const active = inq.id === selectedId;
                return (
                  <li key={inq.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(inq.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`block w-full px-4 py-3.5 text-left transition-colors cursor-pointer ${active ? 'bg-brand-50/70' : 'hover:bg-neutral-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        {inq.status === 'open' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-label="답변 대기" />}
                        <p className={`min-w-0 flex-1 truncate text-sm ${inq.status === 'open' ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-700'}`}>{inq.title}</p>
                        <span className="shrink-0 text-xs tabular-nums text-neutral-400">{formatRelative(inq.createdAt)}</span>
                      </div>
                      <p className="mt-1 truncate text-xs text-neutral-500">
                        {inq.userName}
                        {!inq.userId && <span className="ml-1 text-neutral-400">(비회원)</span>} · {inquiryCategoryLabel(inq.category)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Detail */}
        <section className={`min-w-0 overflow-hidden rounded-xl border border-neutral-200 bg-white ${selected ? '' : 'hidden lg:block'}`}>
          {!selected ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
              <MessageSquareText className="h-10 w-10 text-neutral-300" strokeWidth={1.5} />
              <p className="mt-3 text-sm text-neutral-500">목록에서 문의를 선택하면 내용을 보고 답변할 수 있어요.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-neutral-200 px-5 py-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-neutral-500 hover:text-neutral-900 lg:hidden cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" /> 목록
                </button>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600">{inquiryCategoryLabel(selected.category)}</span>
                  <InquiryStatusBadge inquiry={selected} />
                </div>
                <h2 className="mt-2 text-lg font-bold text-neutral-900">{selected.title}</h2>
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="text-neutral-400">보낸 사람</dt>
                    <dd className="text-neutral-800">
                      {selected.userName}
                      {!selected.userId && <span className="ml-1.5 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500">비회원</span>}
                    </dd>
                  </div>
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 text-neutral-400">이메일</dt>
                    <dd className="truncate text-neutral-800">{selected.userEmail}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-neutral-400">접수</dt>
                    <dd className="tabular-nums text-neutral-800">{formatInquiryDate(selected.createdAt)}</dd>
                  </div>
                </dl>
              </div>

              <div className="space-y-5 px-5 py-5 sm:px-6">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{selected.content}</p>

                <div className="border-t border-neutral-100 pt-5">
                  {!editing && selected.answer ? (
                    <div className="rounded-lg border-l-[3px] border-brand-600 bg-brand-50/60 px-4 py-3">
                      <p className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                        <span className="font-semibold text-brand-700">답변</span>
                        {selected.answeredByName && <span>{selected.answeredByName}</span>}
                        <span className="tabular-nums">{formatInquiryDate(selected.answeredAt)}</span>
                        {selected.userId && <span>{selected.answerSeenAt && selected.answerSeenAt >= (selected.answeredAt || '') ? '· 작성자 확인함' : '· 작성자 미확인'}</span>}
                      </p>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{selected.answer}</p>
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="inq-answer" className="mb-1.5 block text-[13px] font-medium text-neutral-800">
                        {selected.answer ? '답변 수정' : '답변 작성'}
                      </label>
                      <textarea
                        id="inq-answer"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={6}
                        className="lms-input h-auto resize-y py-2.5 leading-relaxed"
                        placeholder={selected.userId ? '작성자의 ‘내 문의 내역’에 표시될 답변을 입력하세요.' : '이메일로 보낼 답변을 입력하세요.'}
                      />
                      {!selected.userId && (
                        <p className="mt-1.5 text-xs text-neutral-500">로그인하지 않은 방문자의 문의예요. 답변을 저장한 뒤 ‘메일로 보내기’로 이메일 답장을 보내 주세요.</p>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {editing || !selected.answer ? (
                      <>
                        <button type="button" onClick={handleAnswer} disabled={saving || !draft.trim()} className="lms-btn lms-btn-primary">
                          {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                          {selected.answer ? '수정 저장' : '답변 등록'}
                        </button>
                        {selected.answer && (
                          <button
                            type="button"
                            onClick={() => {
                              setDraft(selected.answer || '');
                              setEditing(false);
                            }}
                            className="lms-btn lms-btn-secondary"
                          >
                            취소
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <button type="button" onClick={() => setEditing(true)} className="lms-btn lms-btn-secondary">
                          <Pencil className="h-4 w-4" />
                          답변 수정
                        </button>
                        <a href={replyMailto(selected)} className={`lms-btn ${selected.userId ? 'lms-btn-secondary' : 'lms-btn-primary'}`}>
                          <Mail className="h-4 w-4" />
                          메일로 보내기
                        </a>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(selected)}
                      className="lms-btn lms-btn-ghost ml-auto text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <BaseModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="문의를 삭제할까요?"
        maxWidth="sm"
        footerContent={
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className="lms-btn lms-btn-secondary">
              취소
            </button>
            <button type="button" onClick={handleDelete} className="lms-btn bg-rose-600 text-white hover:bg-rose-700">
              삭제
            </button>
          </div>
        }
      >
        <p className="text-sm leading-relaxed text-neutral-600">
          「{deleteTarget?.title}」 문의와 답변이 영구히 삭제되고, 작성자의 문의 내역에서도 사라집니다.
        </p>
      </BaseModal>
    </div>
  );
};
