import React, { useState, useEffect } from 'react';
import { StudentNote } from '../../types';
import { storage } from '../../services/storage';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash2, Clock, StickyNote, Copy } from 'lucide-react';

interface NotesTabProps {
  courseId: string;
  lessonId: string;
  currentVideoTime?: number;
  onSeekTo?: (time: number) => void;
}

export const NotesTab: React.FC<NotesTabProps> = ({
  courseId,
  lessonId,
  currentVideoTime = 0,
  onSeekTo,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [newContent, setNewContent] = useState('');

  const loadNotes = () => {
    if (!user) return;
    setNotes(storage.getStudentNotes(user.id, courseId, lessonId));
  };

  useEffect(() => {
    loadNotes();
  }, [courseId, lessonId, user]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newContent.trim()) return;

    storage.addStudentNote(user.id, courseId, lessonId, Math.floor(currentVideoTime), newContent.trim());
    setNewContent('');
    loadNotes();
    showToast('학습 메모가 저장되었습니다.', 'success');
  };

  const handleDelete = (noteId: string) => {
    storage.deleteStudentNote(noteId);
    loadNotes();
    showToast('메모가 삭제되었습니다.', 'info');
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleCopyAll = () => {
    if (notes.length === 0) return;
    const text = notes.map((n) => `[${formatTime(n.timestampSeconds)}] ${n.content}`).join('\n');
    navigator.clipboard.writeText(text);
    showToast('전체 메모가 클립보드에 복사되었습니다.', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Note input form */}
      <form onSubmit={handleAddNote} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>현재 재생 시간: </span>
            <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-mono font-bold">
              {formatTime(currentVideoTime)}
            </span>
          </div>
          {notes.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAll}
              className="text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>전체 복사</span>
            </button>
          )}
        </div>

        <textarea
          rows={2}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="이 시점에 기억할 핵심 개념이나 질문을 기록하세요..."
          className="w-full p-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!newContent.trim()}
            className="py-1.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>메모 추가</span>
          </button>
        </div>
      </form>

      {/* Note list */}
      {notes.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs">
          <StickyNote className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
          <p>아직 작성된 학습 메모가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-3 bg-white rounded-xl border border-slate-200 flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-2.5">
                <button
                  type="button"
                  onClick={() => onSeekTo && onSeekTo(note.timestampSeconds)}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono font-bold px-2 py-1 rounded-md shrink-0 flex items-center gap-1 cursor-pointer"
                  title="해당 시간으로 이동"
                >
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(note.timestampSeconds)}</span>
                </button>
                <p className="text-slate-700 whitespace-pre-wrap leading-relaxed pt-0.5">{note.content}</p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(note.id)}
                className="text-slate-300 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                title="삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
