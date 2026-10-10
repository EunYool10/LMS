import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Inquiry, InquiryCategory, User } from '../../types';
import { useToast } from '../../context/ToastContext';
import { INQUIRY_CATEGORIES, INQUIRY_CONTENT_MAX, INQUIRY_TITLE_MAX, submitInquiry } from '../../services/inquiries';
import { AttachmentPicker } from './AttachmentPicker';

interface InquiryFormProps {
  /** Signed-in member. When missing, the form asks for a name and an email to reply to. */
  user?: User | null;
  defaultCategory?: InquiryCategory;
  onSubmitted: (inquiry: Inquiry) => void;
  onCancel?: () => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PLACEHOLDERS: Record<InquiryCategory, string> = {
  learning: '어떤 강의의 어떤 부분이 궁금한지 적어 주세요.',
  account: '어떤 계정(이메일)으로 무엇을 하려다 문제가 생겼는지 적어 주세요.',
  certificate: '수료증이 필요한 과정과 상황을 적어 주세요.',
  bug: '어떤 화면에서 무엇을 했을 때 문제가 생겼는지 순서대로 적어 주세요.',
  other: '문의 내용을 자세히 적어 주세요.',
};

export const InquiryForm: React.FC<InquiryFormProps> = ({ user, defaultCategory, onSubmitted, onCancel }) => {
  const { showToast } = useToast();
  const isGuest = !user;
  const [category, setCategory] = useState<InquiryCategory>(defaultCategory || (isGuest ? 'account' : 'learning'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadRatio, setUploadRatio] = useState<number | null>(null);

  const errors = {
    name: isGuest && name.trim().length < 2 ? '이름을 2자 이상 입력해 주세요.' : '',
    email: isGuest && !EMAIL_RE.test(email.trim()) ? '답변 받을 이메일 주소를 정확히 입력해 주세요.' : '',
    title: title.trim().length < 2 ? '제목을 2자 이상 입력해 주세요.' : '',
    content: content.trim().length < 10 ? '내용을 10자 이상 입력해 주세요.' : '',
  };
  const hasError = Object.values(errors).some(Boolean);
  const err = (k: keyof typeof errors) => (touched && errors[k] ? <p className="mt-1.5 text-xs text-rose-600">{errors[k]}</p> : null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (hasError) return;
    setSending(true);
    try {
      const inquiry = await submitInquiry({
        category,
        title,
        content,
        userId: user?.id,
        userName: user ? user.name : name,
        userEmail: user ? user.email : email,
        files,
        onUploadProgress: files.length ? setUploadRatio : undefined,
      });
      onSubmitted(inquiry);
    } catch (error) {
      console.warn('[Inquiry] submit failed', error);
      showToast('문의를 보내지 못했어요. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setSending(false);
      setUploadRatio(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-neutral-800">문의 유형</legend>
        <div className="flex flex-wrap gap-2">
          {INQUIRY_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`h-8 rounded-full border px-3.5 text-[13px] font-medium transition-colors cursor-pointer ${
                category === c.id
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:border-neutral-400 hover:text-neutral-900'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </fieldset>

      {isGuest && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="inq-name" className="mb-1.5 block text-[13px] font-medium text-neutral-800">
              이름
            </label>
            <input id="inq-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="lms-input" placeholder="홍길동" />
            {err('name')}
          </div>
          <div>
            <label htmlFor="inq-email" className="mb-1.5 block text-[13px] font-medium text-neutral-800">
              답변 받을 이메일
            </label>
            <input
              id="inq-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="lms-input"
              placeholder="name@company.com"
            />
            {err('email')}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="inq-title" className="text-[13px] font-medium text-neutral-800">
            제목
          </label>
          <span className="text-xs tabular-nums text-neutral-400">
            {title.length}/{INQUIRY_TITLE_MAX}
          </span>
        </div>
        <input
          id="inq-title"
          value={title}
          maxLength={INQUIRY_TITLE_MAX}
          onChange={(e) => setTitle(e.target.value)}
          className="lms-input"
          placeholder="한 줄로 요약해 주세요"
        />
        {err('title')}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="inq-content" className="text-[13px] font-medium text-neutral-800">
            내용
          </label>
          <span className="text-xs tabular-nums text-neutral-400">
            {content.length}/{INQUIRY_CONTENT_MAX}
          </span>
        </div>
        <textarea
          id="inq-content"
          value={content}
          maxLength={INQUIRY_CONTENT_MAX}
          onChange={(e) => setContent(e.target.value)}
          rows={7}
          className="lms-input h-auto resize-y py-2.5 leading-relaxed"
          placeholder={PLACEHOLDERS[category]}
        />
        {err('content')}
      </div>

      <AttachmentPicker files={files} onChange={setFiles} disabled={sending} />

      <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-neutral-500">
          {isGuest ? '운영팀이 확인 후 입력한 이메일로 답변을 보내 드려요.' : `운영팀에 전달되며, 답변은 ‘내 문의 내역’에서 확인할 수 있어요. (${user!.email})`}
        </p>
        <div className="flex shrink-0 gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="lms-btn lms-btn-secondary flex-1 sm:flex-none">
              취소
            </button>
          )}
          <button type="submit" disabled={sending} className="lms-btn lms-btn-primary flex-1 sm:flex-none">
            {sending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="h-4 w-4" />}
            {sending && uploadRatio !== null && uploadRatio < 1 ? `파일 올리는 중 ${Math.round(uploadRatio * 100)}%` : '문의 보내기'}
          </button>
        </div>
      </div>
    </form>
  );
};
