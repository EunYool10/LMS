import { PRIVACY_POLICY, TERMS_OF_SERVICE, PolicyArticle, PolicyDocument } from '../data/policyData';
import { PolicyOverride, SystemSettings } from '../types';
import { storage } from './storage';

export type PolicyType = 'terms' | 'privacy';

export const POLICY_LABELS: Record<PolicyType, string> = {
  terms: '운영 규정',
  privacy: '개인정보처리방침',
};

export const defaultPolicy = (type: PolicyType): PolicyDocument => (type === 'terms' ? TERMS_OF_SERVICE : PRIVACY_POLICY);

/** Lines starting with "## " become article headings ("## 제1조 목적"); every other non-empty line is a paragraph. */
export function policyToText(articles: PolicyArticle[]): string {
  return articles.map((a) => [`## ${a.number} ${a.title}`.trim(), ...a.content].join('\n')).join('\n\n');
}

export function parsePolicyText(text: string): PolicyArticle[] {
  const articles: PolicyArticle[] = [];
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('## ')) {
      const heading = line.slice(3).trim();
      const m = heading.match(/^(제\s*\d+\s*조(?:의\s*\d+)?)\s*(.*)$/);
      const number = m ? m[1].replace(/\s+/g, '') : '';
      const title = (m ? m[2] : heading).replace(/^\((.*)\)$/, '$1').trim();
      articles.push({ number, title: title || heading, content: [] });
    } else if (articles.length > 0) {
      articles[articles.length - 1].content.push(line);
    } else {
      articles.push({ number: '', title: '', content: [line] });
    }
  }
  return articles;
}

export function overrideToDocument(type: PolicyType, override: PolicyOverride): PolicyDocument {
  const base = defaultPolicy(type);
  return {
    ...base,
    effectiveDate: override.effectiveDate || base.effectiveDate,
    lastUpdated: formatKoreanDate(override.updatedAt) || base.lastUpdated,
    overview: override.overview,
    articles: parsePolicyText(override.body),
  };
}

/** The policy as currently published: the admin-edited version when there is one, otherwise the built-in text. */
export function getPolicyDocument(type: PolicyType, settings: SystemSettings = storage.getSettings()): PolicyDocument {
  const override = settings?.policies?.[type];
  return override && override.body?.trim() ? overrideToDocument(type, override) : defaultPolicy(type);
}

export function formatKoreanDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
