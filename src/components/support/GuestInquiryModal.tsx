import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { BaseModal } from '../common/BaseModal';
import { InquiryForm } from './InquiryForm';
import { Inquiry } from '../../types';

/** Lets someone who cannot sign in (no account, forgotten password, …) reach the operators. */
export const GuestInquiryModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [sent, setSent] = useState<Inquiry | null>(null);

  const close = () => {
    onClose();
    setSent(null);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={close}
      title={sent ? undefined : '운영팀에 문의하기'}
      subtitle={sent ? undefined : '로그인이 안 되거나 계정이 없을 때 이용해 주세요.'}
      maxWidth="xl"
      headerBorder={!sent}
    >
      {sent ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-brand-600" strokeWidth={1.5} />
          <h3 className="mt-4 text-lg font-bold text-neutral-900">문의가 접수되었어요</h3>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            운영팀이 확인한 뒤 <span className="font-medium text-neutral-900">{sent.userEmail}</span>
            <br />
            으로 답변을 보내 드릴게요.
          </p>
          <button type="button" onClick={close} className="lms-btn lms-btn-primary mt-6 w-full sm:w-auto sm:px-8">
            확인
          </button>
        </div>
      ) : (
        <InquiryForm onSubmitted={setSent} onCancel={close} />
      )}
    </BaseModal>
  );
};
