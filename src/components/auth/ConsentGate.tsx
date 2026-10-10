import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storage } from '../../services/storage';
import { needsConsent, newAgreements, takeSocialConsent } from '../../services/consent';
import { ConsentChecklist, ConsentValue } from './ConsentChecklist';
import { BrandLogo } from '../common/BrandLogo';

/**
 * Accounts created by an SNS sign-in skip the sign-up form, so they are asked to agree here before
 * using the service. Consent ticked on the sign-up tab right before the SNS sign-in is applied silently.
 */
export const ConsentGate: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState<ConsentValue>({ terms: false, privacy: false });
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!user || !needsConsent(user)) {
      setOpen(false);
      return;
    }
    const pending = takeSocialConsent();
    if (pending) {
      storage.recordAgreements(user.id, pending);
      refreshUser();
      setOpen(false);
      return;
    }
    setConsent({ terms: false, privacy: false });
    setInvalid(false);
    setOpen(true);
  }, [user?.id, user?.agreements?.terms]);

  // The startup sync may bring in the stored account (older, or already agreed) after the gate opened.
  useEffect(() => {
    if (!open) return;
    const recheck = () => {
      if (!needsConsent(user)) setOpen(false);
    };
    window.addEventListener('storage', recheck);
    return () => window.removeEventListener('storage', recheck);
  }, [open, user]);

  if (!open || !user) return null;

  const agree = () => {
    if (!consent.terms || !consent.privacy) {
      setInvalid(true);
      return;
    }
    storage.recordAgreements(user.id, newAgreements());
    refreshUser();
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-neutral-950/50 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-gate-title"
        className="max-h-[94vh] w-full overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-w-[420px] sm:rounded-2xl"
      >
        <BrandLogo />
        <h2 id="consent-gate-title" className="mt-6 text-xl font-bold text-neutral-900">
          서비스 이용 동의
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600">
          {user.name}님, TDSNT LMS를 이용하려면 아래 약관에 동의해 주세요.
        </p>
        <div className="mt-5">
          <ConsentChecklist
            value={consent}
            onChange={(v) => {
              setConsent(v);
              if (v.terms && v.privacy) setInvalid(false);
            }}
            invalid={invalid}
          />
        </div>
        <button type="button" onClick={agree} className="lms-btn lms-btn-primary mt-5 h-11 w-full text-[15px]">
          동의하고 시작하기
        </button>
        <button type="button" onClick={logout} className="lms-btn lms-btn-ghost mt-2 w-full text-neutral-500">
          동의하지 않고 로그아웃
        </button>
      </div>
    </div>
  );
};
