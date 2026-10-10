import { useEffect, useState } from 'react';
import { firestoreService } from './firebase';
import { Inquiry, InquiryCategory, User } from '../types';
import { isAdminRole } from '../utils/rbac';
import { notifyDiscord } from './discordNotify';

export const INQUIRY_CATEGORIES: { id: InquiryCategory; label: string }[] = [
  { id: 'learning', label: '강의 · 학습' },
  { id: 'account', label: '계정 · 로그인' },
  { id: 'certificate', label: '수료증' },
  { id: 'bug', label: '오류 신고' },
  { id: 'other', label: '기타' },
];

export const inquiryCategoryLabel = (category: InquiryCategory) =>
  INQUIRY_CATEGORIES.find((c) => c.id === category)?.label || '기타';

export const INQUIRY_TITLE_MAX = 80;

const pad = (n: number) => String(n).padStart(2, '0');

export function formatInquiryDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatRelative(iso?: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '';
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return formatInquiryDate(iso).slice(0, 10);
}
export const INQUIRY_CONTENT_MAX = 2000;

const UPDATED_EVENT = 'inquiries-updated';

const notifyUpdated = () => {
  summaryCache = null;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(UPDATED_EVENT));
};

export const hasUnreadAnswer = (inquiry: Inquiry) =>
  inquiry.status === 'answered' && !!inquiry.answeredAt && (!inquiry.answerSeenAt || inquiry.answerSeenAt < inquiry.answeredAt);

export async function submitInquiry(input: {
  category: InquiryCategory;
  title: string;
  content: string;
  userId?: string;
  userName: string;
  userEmail: string;
}): Promise<Inquiry> {
  const inquiry: Inquiry = {
    id: `inquiry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    category: input.category,
    title: input.title.trim().slice(0, INQUIRY_TITLE_MAX),
    content: input.content.trim().slice(0, INQUIRY_CONTENT_MAX),
    status: 'open',
    userId: input.userId,
    userName: input.userName.trim(),
    userEmail: input.userEmail.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };
  await firestoreService.saveInquiry(inquiry);
  notifyUpdated();
  notifyDiscord('inquiry', {
    inquiryId: inquiry.id,
    title: inquiry.title,
    categoryLabel: inquiryCategoryLabel(inquiry.category),
    userName: inquiry.userName,
    guest: !inquiry.userId,
  });
  return inquiry;
}

/** Admins get every inquiry; everyone else only their own. */
export const listInquiries = (userId?: string) => firestoreService.getInquiries(userId);

export async function answerInquiry(id: string, answer: string, admin: { id: string; name: string }): Promise<Partial<Inquiry>> {
  const patch: Partial<Inquiry> = {
    status: 'answered',
    answer: answer.trim(),
    answeredAt: new Date().toISOString(),
    answeredById: admin.id,
    answeredByName: admin.name,
  };
  await firestoreService.updateInquiry(id, patch);
  notifyUpdated();
  return patch;
}

export async function markAnswerSeen(id: string): Promise<string> {
  const answerSeenAt = new Date().toISOString();
  await firestoreService.updateInquiry(id, { answerSeenAt });
  notifyUpdated();
  return answerSeenAt;
}

export async function deleteInquiry(id: string): Promise<void> {
  await firestoreService.deleteInquiry(id);
  notifyUpdated();
}

// ── Badge counts ────────────────────────────────────────────────
// Admins see how many inquiries wait for an answer; members see how many answers they have not opened.

interface InquirySummary {
  key: string;
  openCount: number;
  unreadAnswers: number;
  at: number;
}

let summaryCache: InquirySummary | null = null;
let inflight: Promise<InquirySummary> | null = null;
const CACHE_MS = 30_000;

async function loadSummary(user: User): Promise<InquirySummary> {
  const admin = isAdminRole(user.role);
  const key = `${user.id}:${admin ? 'admin' : 'member'}`;
  if (summaryCache && summaryCache.key === key && Date.now() - summaryCache.at < CACHE_MS) return summaryCache;
  if (!inflight) {
    inflight = (async () => {
      const items = await listInquiries(admin ? undefined : user.id);
      const mine = admin ? items.filter((i) => i.userId === user.id) : items;
      summaryCache = {
        key,
        openCount: admin ? items.filter((i) => i.status === 'open').length : 0,
        unreadAnswers: mine.filter(hasUnreadAnswer).length,
        at: Date.now(),
      };
      return summaryCache;
    })().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export function useInquirySummary(user: User | null) {
  const [summary, setSummary] = useState({ openCount: 0, unreadAnswers: 0 });

  useEffect(() => {
    if (!user) {
      setSummary({ openCount: 0, unreadAnswers: 0 });
      return;
    }
    let alive = true;
    const refresh = () => {
      loadSummary(user)
        .then((s) => alive && setSummary({ openCount: s.openCount, unreadAnswers: s.unreadAnswers }))
        .catch(() => {});
    };
    refresh();
    const timer = window.setInterval(refresh, 120_000);
    window.addEventListener(UPDATED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener(UPDATED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [user?.id, user?.role]);

  return summary;
}
