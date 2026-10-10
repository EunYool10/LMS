import React from 'react';
import { Inquiry } from '../../types';

export const InquiryStatusBadge: React.FC<{ inquiry: Inquiry }> = ({ inquiry }) =>
  inquiry.status === 'answered' ? (
    <span className="inline-flex shrink-0 items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">답변 완료</span>
  ) : (
    <span className="inline-flex shrink-0 items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">답변 대기</span>
  );
