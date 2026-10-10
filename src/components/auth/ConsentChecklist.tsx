import React from 'react';
import { ChevronRight } from 'lucide-react';
import { openPolicyModal } from '../common/PolicyModal';

export interface ConsentValue {
  terms: boolean;
  privacy: boolean;
}

interface ConsentChecklistProps {
  value: ConsentValue;
  onChange: (value: ConsentValue) => void;
  /** Highlights the box when the user tried to continue without agreeing. */
  invalid?: boolean;
}

const boxClass = 'h-[18px] w-[18px] shrink-0 cursor-pointer rounded accent-brand-600';

/** "전체 동의" plus the two required agreements, each with a link to the full text. */
export const ConsentChecklist: React.FC<ConsentChecklistProps> = ({ value, onChange, invalid }) => {
  const all = value.terms && value.privacy;

  const items: { key: keyof ConsentValue; label: string; policy: 'terms' | 'privacy' }[] = [
    { key: 'terms', label: '운영 규정(이용약관) 동의', policy: 'terms' },
    { key: 'privacy', label: '개인정보 수집·이용 동의', policy: 'privacy' },
  ];

  return (
    <div className={`rounded-lg border bg-white ${invalid && !all ? 'border-rose-300 ring-2 ring-rose-100' : 'border-neutral-200'}`}>
      <label className="flex cursor-pointer items-center gap-2.5 border-b border-neutral-100 px-3.5 py-3">
        <input
          type="checkbox"
          checked={all}
          onChange={(e) => onChange({ terms: e.target.checked, privacy: e.target.checked })}
          className={boxClass}
        />
        <span className="text-sm font-semibold text-neutral-900">약관 전체 동의</span>
      </label>

      <div className="space-y-2.5 px-3.5 py-3">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2.5">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={value[item.key]}
                onChange={(e) => onChange({ ...value, [item.key]: e.target.checked })}
                className={boxClass}
              />
              <span className="text-[13px] text-neutral-700">
                <span className="font-medium text-brand-700">[필수]</span> {item.label}
              </span>
            </label>
            <button
              type="button"
              onClick={() => openPolicyModal(item.policy)}
              className="inline-flex shrink-0 items-center text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer"
            >
              보기 <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        <dl className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-2 gap-y-1 rounded-md bg-neutral-50 px-3 py-2.5 text-[11.5px] leading-relaxed text-neutral-600">
          <dt className="font-medium text-neutral-500">수집 항목</dt>
          <dd>이름, 이메일 주소, 비밀번호(암호화 저장), SNS 가입 시 SNS 식별값·프로필 정보</dd>
          <dt className="font-medium text-neutral-500">이용 목적</dt>
          <dd>회원 식별, 수강·수료 기록 관리, 문의 응대</dd>
          <dt className="font-medium text-neutral-500">보유 기간</dt>
          <dd>회원 탈퇴 시까지 (법령상 보관 의무가 있으면 그 기간)</dd>
          <dd className="col-span-2 pt-0.5 text-neutral-500">동의를 거부할 수 있으나, 거부하면 회원가입을 할 수 없습니다.</dd>
        </dl>
      </div>

      {invalid && !all && (
        <p className="border-t border-rose-100 px-3.5 py-2 text-xs font-medium text-rose-600">필수 약관에 모두 동의해야 가입할 수 있어요.</p>
      )}
    </div>
  );
};
