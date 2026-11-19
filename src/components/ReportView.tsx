import React, { useState } from 'react';
import {
  Bookmark,
  BookmarkCheck,
  Check,
  Copy,
  Download,
  ArrowRight,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { EntityType, IndustryTrack, StructuredAdvisoryReport } from '../types';
import { ENTITY_LABELS, INDUSTRY_LABELS } from '../data/domainData';
import { downloadMarkdownFile, reportToMarkdown } from '../utils/exportMarkdown';

interface ReportViewProps {
  report: StructuredAdvisoryReport;
  entityType?: EntityType;
  industry?: IndustryTrack;
  dateLabel?: string;
  isSaved?: boolean;
  onSaveMemo?: () => void;
  onFollowUp?: (question: string) => void;
  compact?: boolean;
}

export const ReportView: React.FC<ReportViewProps> = ({
  report,
  entityType,
  industry,
  dateLabel,
  isSaved = false,
  onSaveMemo,
  onFollowUp,
  compact = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const md = reportToMarkdown(report, { entityType, industry, date: dateLabel });
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback copy via textarea
      const ta = document.createElement('textarea');
      ta.value = md;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDownload = () => {
    const md = reportToMarkdown(report, { entityType, industry, date: dateLabel });
    const safeName = report.headline.replace(/[\\/:*?"<>|]/g, '').slice(0, 28) || '企管研判简报';
    downloadMarkdownFile(`${safeName}.md`, md);
  };

  return (
    <article
      className={`bg-white border border-[#E4E1DA] rounded-md ${
        compact ? 'p-5 sm:p-6' : 'p-6 sm:p-8'
      }`}
    >
      {/* Report Header */}
      <div className="flex flex-col gap-4 pb-6 border-b border-[#E4E1DA]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
            <span>实操诊断研报</span>
            {entityType && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-[#141E2B] font-medium">{ENTITY_LABELS[entityType]}</span>
              </>
            )}
            {industry && (
              <>
                <span aria-hidden="true">·</span>
                <span>{INDUSTRY_LABELS[industry]}</span>
              </>
            )}
            {dateLabel && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{dateLabel}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onSaveMemo && (
              <button
                type="button"
                onClick={onSaveMemo}
                disabled={isSaved}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                  isSaved
                    ? 'border-[#166534]/30 bg-[#166534]/5 text-[#166534]'
                    : 'border-[#E4E1DA] bg-white text-[#141E2B] hover:bg-[#F7F6F2]'
                }`}
              >
                {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                <span>{isSaved ? '已存备忘录' : '保存备忘录'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-[#E4E1DA] bg-white text-[#141E2B] hover:bg-[#F7F6F2] transition-colors whitespace-nowrap shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#166534]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制汇报稿'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-[#E4E1DA] bg-white text-[#141E2B] hover:bg-[#F7F6F2] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出 MD</span>
            </button>
          </div>
        </div>

        <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#141E2B] leading-snug">
          {report.headline}
        </h2>

        <p className="text-sm sm:text-[15px] text-[#334155] leading-relaxed">
          {report.executiveSummary}
        </p>

        {/* SOE vs Private differentiation callout — clean neutral surface, no thick left border */}
        <div className="bg-[#F7F6F2] border border-[#E4E1DA] rounded p-4 text-xs sm:text-[13px] text-[#334155] leading-relaxed space-y-2.5">
          <div>
            <span className="font-semibold text-[#1B365D] mr-2">国企与民营管控差异提示</span>
            <span>{report.entityDiffNote}</span>
          </div>
          {report.leadershipAlignmentTip && (
            <div className="pt-2.5 border-t border-[#E4E1DA]">
              <span className="font-semibold text-[#141E2B] mr-2">向上汇报与可研平衡技巧</span>
              <span>{report.leadershipAlignmentTip}</span>
            </div>
          )}
        </div>
      </div>

      {/* Section 01: Core Diagnosis */}
      <section className="py-6 border-b border-[#E4E1DA]">
        <h3 className="font-editorial text-base font-bold text-[#141E2B] mb-4">
          01. 一线实操诊断
        </h3>
        <ol className="space-y-3">
          {report.diagnosisPoints.map((point, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-[#334155] leading-relaxed">
              <span className="font-mono tabular-nums text-xs font-semibold text-[#1B365D] mt-0.5 shrink-0">
                {String(index + 1).padStart(2, '0')}.
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Section 02: Actionable Options */}
      <section className="py-6 border-b border-[#E4E1DA]">
        <h3 className="font-editorial text-base font-bold text-[#141E2B] mb-4">
          02. 可选落地实操方案
        </h3>
        <div className="divide-y divide-[#E4E1DA] border border-[#E4E1DA] rounded">
          {report.options.map((opt, index) => (
            <div key={index} className="p-4 sm:p-5 bg-white">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
                <h4 className="text-sm sm:text-[15px] font-semibold text-[#141E2B]">
                  {opt.title}
                </h4>
                <span className="text-xs font-medium text-[#1B365D]">{opt.fitLabel}</span>
              </div>
              <p className="text-sm text-[#334155] leading-relaxed mb-4">{opt.mechanism}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-[#F0EDE6] text-xs leading-relaxed">
                <div>
                  <div className="text-[#64748B] mb-1">资金占用与撬动</div>
                  <div className="text-[#141E2B] font-medium">{opt.capitalRequirement}</div>
                </div>
                <div>
                  <div className="text-[#64748B] mb-1">人力配置与外包分工</div>
                  <div className="text-[#141E2B] font-medium">{opt.staffingNeed}</div>
                </div>
                <div>
                  <div className="text-[#64748B] mb-1">必守合规边界</div>
                  <div className="text-[#141E2B] font-medium">{opt.complianceBoundary}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 03: Risk Alerts */}
      <section className="py-6 border-b border-[#E4E1DA]">
        <h3 className="font-editorial text-base font-bold text-[#141E2B] mb-4">
          03. 风险点与合规红线预警
        </h3>
        <div className="space-y-3">
          {report.riskAlerts.map((risk, index) => {
            const isHigh = risk.level === 'high';
            return (
              <div
                key={index}
                className={`p-4 rounded border ${
                  isHigh
                    ? 'border-[#B91C1C]/25 bg-[#FEF2F2]/40'
                    : 'border-[#B45309]/25 bg-[#FFFBEB]/50'
                }`}
              >
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  {isHigh ? (
                    <ShieldAlert className="w-4 h-4 text-[#B91C1C] shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
                  )}
                  <span
                    className={`text-xs font-semibold ${
                      isHigh ? 'text-[#B91C1C]' : 'text-[#B45309]'
                    }`}
                  >
                    {isHigh ? '红线高危' : '审慎预警'}
                  </span>
                  <span className="text-[#CBD5E1]" aria-hidden="true">
                    ·
                  </span>
                  <h4 className="text-sm font-semibold text-[#141E2B]">{risk.title}</h4>
                </div>
                <p className="text-sm text-[#334155] leading-relaxed mb-2">{risk.detail}</p>
                <div className="text-xs text-[#64748B]">
                  监管与风控依据：<span className="text-[#475569]">{risk.redlineBasis}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 04: Execution Levers Table */}
      <section className="py-6 border-b border-[#E4E1DA]">
        <h3 className="font-editorial text-base font-bold text-[#141E2B] mb-4">
          04. 分阶段落地抓手与交付底稿
        </h3>
        <div className="overflow-x-auto border border-[#E4E1DA] rounded">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-[#F7F6F2] border-b border-[#E4E1DA] text-xs text-[#64748B]">
                <th className="py-2.5 px-3.5 font-medium whitespace-nowrap">实施阶段</th>
                <th className="py-2.5 px-3.5 font-medium">落地动作</th>
                <th className="py-2.5 px-3.5 font-medium whitespace-nowrap">留痕交付物</th>
                <th className="py-2.5 px-3.5 font-medium whitespace-nowrap">牵头角色</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E1DA]">
              {report.actionLevers.map((lever, index) => (
                <tr key={index} className="hover:bg-[#FAF9F6] transition-colors">
                  <td className="py-3 px-3.5 font-mono tabular-nums text-xs font-medium text-[#1B365D] whitespace-nowrap align-top">
                    {lever.phase}
                  </td>
                  <td className="py-3 px-3.5 text-[#334155] leading-relaxed align-top">
                    {lever.action}
                  </td>
                  <td className="py-3 px-3.5 text-xs font-medium text-[#141E2B] align-top">
                    {lever.deliverable}
                  </td>
                  <td className="py-3 px-3.5 text-xs text-[#475569] whitespace-nowrap align-top">
                    {lever.owner}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 05: Key Precautions */}
      <section className="py-6 border-b border-[#E4E1DA]">
        <h3 className="font-editorial text-base font-bold text-[#141E2B] mb-3.5">
          05. 关键操盘注意事项
        </h3>
        <ul className="space-y-2.5">
          {report.precautions.map((item, index) => (
            <li key={index} className="flex items-start gap-2.5 text-sm text-[#334155] leading-relaxed">
              <span className="font-mono tabular-nums text-xs text-[#64748B] mt-0.5 shrink-0">
                —
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Section 06: Jargon Plain-Language Translation (Beginner Guided) */}
      {report.jargonGlossary && report.jargonGlossary.length > 0 && (
        <section className="py-6 border-b border-[#E4E1DA]">
          <h3 className="font-editorial text-base font-bold text-[#141E2B] mb-1.5">
            06. 本议题行话与金融黑话白话速译
          </h3>
          <p className="text-xs text-[#64748B] mb-4">
            帮非专业小团队快速听懂银行、供应链或跨界产业方嘴里的专业术语与暗藏门道
          </p>
          <div className="divide-y divide-[#E4E1DA] border border-[#E4E1DA] rounded">
            {report.jargonGlossary.map((item, idx) => (
              <div key={idx} className="p-4 bg-[#FAF9F6]/60 grid grid-cols-1 md:grid-cols-12 gap-3 text-xs sm:text-[13px]">
                <div className="md:col-span-3 font-semibold text-[#1B365D]">
                  {item.term}
                </div>
                <div className="md:col-span-5 text-[#141E2B] leading-relaxed">
                  <span className="text-[#64748B] mr-1">白话：</span>
                  {item.plainMeaning}
                </div>
                <div className="md:col-span-4 text-[#B45309] leading-relaxed">
                  <span className="font-medium mr-1">避坑：</span>
                  {item.watchOut}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 07: Guided Discovery Questions for Next Meeting */}
      {report.guidedDiscoveryQuestions && report.guidedDiscoveryQuestions.length > 0 && (
        <section className="py-6 border-b border-[#E4E1DA]">
          <h3 className="font-editorial text-base font-bold text-[#141E2B] mb-1.5">
            07. 下一场对外沟通 / 尽调必问底牌
          </h3>
          <p className="text-xs text-[#64748B] mb-3.5">
            去见工厂老板、算力合作方或银行客户经理时，直接照着这几个问题问，快速摸清虚实
          </p>
          <ol className="space-y-2.5">
            {report.guidedDiscoveryQuestions.map((q, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 p-3 rounded bg-[#F7F6F2] border border-[#E4E1DA] text-sm text-[#141E2B] leading-relaxed"
              >
                <span className="font-mono tabular-nums text-xs font-semibold text-[#1B365D] mt-0.5 shrink-0">
                  Q{idx + 1}
                </span>
                <span>{q}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Follow-up prompts for interactive discussion */}
      {onFollowUp && report.followUpQuestions && report.followUpQuestions.length > 0 && (
        <section className="pt-6">
          <div className="text-xs font-medium text-[#64748B] mb-2.5">
            下一步循序深入研讨（点击直接向顾问追问）
          </div>
          <div className="flex flex-col gap-2">
            {report.followUpQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onFollowUp(q)}
                className="group flex items-center justify-between gap-3 w-full text-left px-3.5 py-2.5 rounded border border-[#E4E1DA] bg-[#FAF9F6] hover:bg-white hover:border-[#1B365D]/40 transition-colors text-xs sm:text-sm text-[#141E2B]"
              >
                <span className="leading-snug">{q}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#1B365D] shrink-0 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
