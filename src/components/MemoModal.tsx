import React from 'react';
import { Trash2, X } from 'lucide-react';
import { SavedMemo } from '../types';
import { ReportView } from './ReportView';

interface MemoModalProps {
  memo: SavedMemo | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  onFollowUpInAdvisor: (prompt: string) => void;
}

export const MemoModal: React.FC<MemoModalProps> = ({
  memo,
  onClose,
  onDelete,
  onFollowUpInAdvisor,
}) => {
  if (!memo) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#141E2B]/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-[#F7F6F2] border border-[#E4E1DA] rounded-md flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white border-b border-[#E4E1DA] px-6 py-3.5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#64748B] truncate">
            <span className="font-semibold text-[#141E2B]">已归档诊断备忘录</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{memo.createdAt}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onDelete(memo.id);
                onClose();
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] rounded transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除</span>
            </button>
            <button
              type="button"
              aria-label="关闭备忘录"
              onClick={onClose}
              className="p-1.5 text-[#64748B] hover:text-[#141E2B] rounded hover:bg-[#F7F6F2] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          <ReportView
            report={memo.report}
            entityType={memo.entityType}
            industry={memo.industry}
            dateLabel={memo.createdAt}
            isSaved
            onFollowUp={(q) => {
              onClose();
              onFollowUpInAdvisor(q);
            }}
          />
        </div>
      </div>
    </div>
  );
};
