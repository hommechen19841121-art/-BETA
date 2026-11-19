import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { CATEGORY_LABELS, COMPLIANCE_AUDIT_ITEMS } from '../data/domainData';
import {
  AuditItemState,
  AuditStatus,
  ComplianceAuditItem,
  EntityType,
  StructuredAdvisoryReport,
} from '../types';
import { ReportView } from './ReportView';

interface ComplianceViewProps {
  auditStates: Record<string, AuditItemState>;
  onUpdateAuditState: (id: string, next: AuditItemState) => void;
  onResetAuditStates: () => void;
  onSaveMemo: (
    report: StructuredAdvisoryReport,
    source: 'compliance',
    entity: EntityType
  ) => void;
  onFollowUpInAdvisor: (prompt: string) => void;
  savedMemoHeadlines: Set<string>;
}

type LensMode = 'dual' | 'soe' | 'private';

export const ComplianceView: React.FC<ComplianceViewProps> = ({
  auditStates,
  onUpdateAuditState,
  onResetAuditStates,
  onSaveMemo,
  onFollowUpInAdvisor,
  savedMemoHeadlines,
}) => {
  const [lens, setLens] = useState<LensMode>('dual');
  const [categoryFilter, setCategoryFilter] = useState<
    ComplianceAuditItem['category'] | 'all'
  >('all');
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const [remediationReport, setRemediationReport] =
    useState<StructuredAdvisoryReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const summary = useMemo(() => {
    let compliant = 0;
    let inProgress = 0;
    let highRisk = 0;
    let unchecked = 0;

    COMPLIANCE_AUDIT_ITEMS.forEach((item) => {
      const st = auditStates[item.id]?.status || 'unchecked';
      if (st === 'compliant') compliant++;
      else if (st === 'in_progress') inProgress++;
      else if (st === 'high_risk') highRisk++;
      else unchecked++;
    });

    return {
      total: COMPLIANCE_AUDIT_ITEMS.length,
      checked: COMPLIANCE_AUDIT_ITEMS.length - unchecked,
      compliant,
      inProgress,
      highRisk,
    };
  }, [auditStates]);

  const visibleItems = useMemo(() => {
    return COMPLIANCE_AUDIT_ITEMS.filter(
      (item) => categoryFilter === 'all' || item.category === categoryFilter
    );
  }, [categoryFilter]);

  const gapItems = useMemo(() => {
    return COMPLIANCE_AUDIT_ITEMS.filter((item) => {
      const st = auditStates[item.id]?.status;
      return st === 'high_risk' || st === 'in_progress';
    });
  }, [auditStates]);

  const handleGenerateRemediation = async () => {
    if (gapItems.length === 0) {
      setErrorMsg('请先将尚未落实的风险条目标记为“高危缺口”或“待整改”，再生成专项整改方案。');
      return;
    }
    setIsGenerating(true);
    setErrorMsg(null);
    const targetEntity: EntityType =
      lens === 'private' ? 'private_crossborder' : 'soe_tier4';

    try {
      const resp = await fetch('/api/advisor/remediation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: targetEntity,
          gaps: gapItems.map((g) => ({
            code: g.code,
            title: g.title,
            status: auditStates[g.id]?.status || 'in_progress',
            note: auditStates[g.id]?.note || '',
          })),
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.report) {
        throw new Error(data.error || '生成缺口整改方案失败，请重试。');
      }
      setRemediationReport(data.report as StructuredAdvisoryReport);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '网络异常，请稍后重试。');
    } finally {
      setIsGenerating(false);
    }
  };

  const setStatus = (id: string, status: AuditStatus) => {
    const existing = auditStates[id] || { status: 'unchecked', note: '' };
    onUpdateAuditState(id, {
      ...existing,
      status: existing.status === status ? 'unchecked' : status,
    });
  };

  const setNote = (id: string, note: string) => {
    const existing = auditStates[id] || { status: 'unchecked', note: '' };
    onUpdateAuditState(id, { ...existing, note });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="pb-5 border-b border-[#E4E1DA] flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="max-w-3xl">
          <div className="text-xs text-[#64748B] mb-1.5">
            涉外合规风控自检库 · 国企与民营管控差异对照 · 精简团队尽职免责底稿
          </div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#141E2B]">
            国企 / 民营涉外合规风控自检库
          </h1>
          <p className="mt-2 text-sm text-[#475569] leading-relaxed">
            围绕国资委“十不准”、三重一大、ODI 外汇监管、独立货权控制及精简团队不相容岗位分离，逐项核查并标记缺口，一键生成低成本可落地的专项整改方案。
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              onResetAuditStates();
              setRemediationReport(null);
              setErrorMsg(null);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#475569] bg-white border border-[#E4E1DA] rounded hover:bg-[#F2F0EA] transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>清空标记</span>
          </button>
          <button
            type="button"
            onClick={handleGenerateRemediation}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1B365D] rounded hover:bg-[#132847] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {isGenerating
                ? '正在生成整改方案...'
                : `针对 ${gapItems.length} 项缺口生成 AI 整改方案`}
            </span>
          </button>
        </div>
      </section>

      {/* Tabular Real-Count Audit Status Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 border border-[#E4E1DA] rounded-md bg-white divide-y lg:divide-y-0 divide-x divide-[#E4E1DA]">
        <div className="p-4 sm:p-5">
          <div className="text-xs text-[#64748B]">自检覆盖进度</div>
          <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-[#141E2B]">
            {summary.checked} <span className="text-sm font-normal text-[#64748B]">/ {summary.total}</span>
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="text-xs text-[#64748B]">已落实闭环</div>
          <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-[#166534]">
            {summary.compliant}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="text-xs text-[#64748B]">待整改项</div>
          <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-[#B45309]">
            {summary.inProgress}
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="text-xs text-[#64748B]">高危红线缺口</div>
          <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-[#B91C1C]">
            {summary.highRisk}
          </div>
        </div>
      </section>

      {/* Lens & Category Filter Controls */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-[#E4E1DA] rounded-md p-3.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: '全部条线' },
              { id: 'sasac_redline', label: '国资红线与十不准' },
              { id: 'crossborder_fx', label: '跨境外汇与ODI' },
              { id: 'contract_goods', label: '合同与货权闭环' },
              { id: 'lean_governance', label: '精简内控与免责' },
            ] as const
          ).map((tab) => {
            const active = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#1B365D] text-white'
                    : 'text-[#475569] hover:bg-[#F2F0EA] hover:text-[#141E2B]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F2F0EA] rounded shrink-0 self-start md:self-auto">
          {(
            [
              { id: 'dual', label: '国企 / 民营对照' },
              { id: 'soe', label: '仅看国资口径' },
              { id: 'private', label: '仅看民营口径' },
            ] as { id: LensMode; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setLens(m.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                lens === m.id
                  ? 'bg-white text-[#141E2B] shadow-xs'
                  : 'text-[#64748B] hover:text-[#141E2B]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </section>

      {errorMsg && (
        <div className="flex items-start gap-2.5 p-4 rounded-md border border-[#B91C1C]/30 bg-[#FEF2F2] text-sm text-[#991B1B]">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Remediation Report Output Area (if triggered) */}
      {isGenerating && (
        <div className="bg-white border border-[#E4E1DA] rounded-md p-6 space-y-4 animate-pulse">
          <div className="h-5 w-64 bg-[#E4E1DA] rounded" />
          <div className="h-4 w-full bg-[#F2F0EA] rounded" />
          <div className="h-4 w-5/6 bg-[#F2F0EA] rounded" />
        </div>
      )}

      {remediationReport && !isGenerating && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1B365D]">
              AI 专项缺口整改与尽职免责补漏方案
            </span>
            <button
              type="button"
              onClick={() => setRemediationReport(null)}
              className="text-xs text-[#64748B] hover:text-[#141E2B]"
            >
              收起整改方案
            </button>
          </div>
          <ReportView
            report={remediationReport}
            entityType={lens === 'private' ? 'private_crossborder' : 'soe_tier4'}
            dateLabel="专项整改稿"
            isSaved={savedMemoHeadlines.has(remediationReport.headline)}
            onSaveMemo={() =>
              onSaveMemo(
                remediationReport,
                'compliance',
                lens === 'private' ? 'private_crossborder' : 'soe_tier4'
              )
            }
            onFollowUp={onFollowUpInAdvisor}
          />
        </div>
      )}

      {/* Audit Checklist Items */}
      <section className="divide-y divide-[#E4E1DA] bg-white border border-[#E4E1DA] rounded-md">
        {visibleItems.map((item) => {
          const st = auditStates[item.id] || { status: 'unchecked', note: '' };
          const isExpanded = expandedNoteId === item.id;
          const severityLabel =
            item.severity === 'redline'
              ? '一票否决红线'
              : item.severity === 'high'
              ? '高危核查项'
              : '关键风控项';
          const severityColor =
            item.severity === 'redline'
              ? 'text-[#B91C1C]'
              : item.severity === 'high'
              ? 'text-[#B45309]'
              : 'text-[#475569]';

          return (
            <div key={item.id} className="p-5 sm:p-6 space-y-4">
              {/* Row Top: Code, Title & Interactive Status Controls */}
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                    <span className="font-mono tabular-nums font-semibold text-[#1B365D]">
                      {item.code}
                    </span>
                    <span aria-hidden="true" className="text-[#CBD5E1]">
                      ·
                    </span>
                    <span className="text-[#64748B]">{CATEGORY_LABELS[item.category]}</span>
                    <span aria-hidden="true" className="text-[#CBD5E1]">
                      ·
                    </span>
                    <span className={`font-medium ${severityColor}`}>{severityLabel}</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#141E2B]">{item.title}</h3>
                </div>

                {/* Interactive Status Segmented Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStatus(item.id, 'compliant')}
                    className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                      st.status === 'compliant'
                        ? 'border-[#166534] bg-[#166534] text-white'
                        : 'border-[#E4E1DA] bg-white text-[#475569] hover:border-[#166534]/50'
                    }`}
                  >
                    已落实
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(item.id, 'in_progress')}
                    className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                      st.status === 'in_progress'
                        ? 'border-[#B45309] bg-[#B45309] text-white'
                        : 'border-[#E4E1DA] bg-white text-[#475569] hover:border-[#B45309]/50'
                    }`}
                  >
                    待整改
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus(item.id, 'high_risk')}
                    className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                      st.status === 'high_risk'
                        ? 'border-[#B91C1C] bg-[#B91C1C] text-white'
                        : 'border-[#E4E1DA] bg-white text-[#475569] hover:border-[#B91C1C]/50'
                    }`}
                  >
                    高危缺口
                  </button>
                </div>
              </div>

              {/* SOE vs Private Comparison Columns */}
              <div
                className={`grid grid-cols-1 ${
                  lens === 'dual' ? 'md:grid-cols-2' : ''
                } gap-4 text-xs sm:text-[13px] leading-relaxed`}
              >
                {lens !== 'private' && (
                  <div className="p-3.5 rounded bg-[#FAF9F6] border border-[#E4E1DA]">
                    <div className="font-semibold text-[#1B365D] mb-1">
                      国企 / 国资四级公司口径
                    </div>
                    <p className="text-[#334155]">{item.soeRequirement}</p>
                  </div>
                )}
                {lens !== 'soe' && (
                  <div className="p-3.5 rounded bg-[#FAF9F6] border border-[#E4E1DA]">
                    <div className="font-semibold text-[#475569] mb-1">
                      民营涉外主体对照口径
                    </div>
                    <p className="text-[#334155]">{item.privateRequirement}</p>
                  </div>
                )}
              </div>

              {/* Practical Control & Evidence Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-[#475569]">
                <div className="space-y-1">
                  <div>
                    <span className="font-semibold text-[#141E2B]">最小风控抓手：</span>
                    <span>{item.practicalControl}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#64748B]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1B365D] shrink-0" />
                    <span>尽职免责留痕底稿：{item.evidenceDoc}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedNoteId(isExpanded ? null : item.id)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#1B365D] hover:underline whitespace-nowrap shrink-0 self-start sm:self-end"
                >
                  <span>{st.note ? '编辑现状备注' : '添加本司现状备注'}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {isExpanded && (
                <div className="pt-2">
                  <textarea
                    rows={2}
                    value={st.note}
                    onChange={(e) => setNote(item.id, e.target.value)}
                    placeholder="记录贵司当前实际卡点（例如：目前只有1名财务兼管公章和网银复核、或某笔代理贸易尚未引入独立监管仓），生成 AI 整改方案时将自动带入此说明..."
                    className="w-full p-3 text-xs sm:text-[13px] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
};
