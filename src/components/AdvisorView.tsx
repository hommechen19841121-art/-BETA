import React, { useEffect, useRef, useState } from 'react';
import {
  Send,
  RotateCcw,
  AlertCircle,
  MessageSquareText,
  ArrowUpRight,
  BookOpen,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ADVISOR_PRESET_PROMPTS,
  ENTITY_LABELS,
  INDUSTRY_LABELS,
  TOPIC_LABELS,
} from '../data/domainData';
import {
  AdvisoryTopic,
  ChatTurn,
  EntityType,
  GuidanceMode,
  IndustryTrack,
  StructuredAdvisoryReport,
} from '../types';
import { ReportView } from './ReportView';
import { FeasibilityAssistant } from './FeasibilityAssistant';

interface AdvisorViewProps {
  turns: ChatTurn[];
  onChangeTurns: React.Dispatch<React.SetStateAction<ChatTurn[]>>;
  entityType: EntityType;
  onChangeEntityType: (v: EntityType) => void;
  industry: IndustryTrack;
  onChangeIndustry: (v: IndustryTrack) => void;
  topic: AdvisoryTopic;
  onChangeTopic: (v: AdvisoryTopic) => void;
  guidanceMode: GuidanceMode;
  onChangeGuidanceMode: (v: GuidanceMode) => void;
  pendingPrompt: string | null;
  onClearPendingPrompt: () => void;
  onOpenJargon: () => void;
  onSaveMemo: (
    report: StructuredAdvisoryReport,
    source: 'advisor',
    entity: EntityType,
    ind: IndustryTrack
  ) => void;
  savedMemoHeadlines: Set<string>;
}

export const AdvisorView: React.FC<AdvisorViewProps> = ({
  turns,
  onChangeTurns,
  entityType,
  onChangeEntityType,
  industry,
  onChangeIndustry,
  topic,
  onChangeTopic,
  guidanceMode,
  onChangeGuidanceMode,
  pendingPrompt,
  onClearPendingPrompt,
  onOpenJargon,
  onSaveMemo,
  savedMemoHeadlines,
}) => {
  const [advisorMode, setAdvisorMode] = useState<'consult' | 'feasibility'>('consult');
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (pendingPrompt) {
      setAdvisorMode('consult');
      setInput(pendingPrompt);
      onClearPendingPrompt();
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [pendingPrompt, onClearPendingPrompt]);

  useEffect(() => {
    if (advisorMode === 'consult' && (turns.length > 0 || isLoading)) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [turns.length, isLoading, advisorMode]);

  const buildHistorySummary = (existingTurns: ChatTurn[]): string => {
    const recent = existingTurns.slice(-4);
    return recent
      .map((t) => {
        if (t.role === 'user' && t.userText) {
          return `用户提问：${t.userText.slice(0, 300)}`;
        }
        if (t.role === 'advisor' && t.report) {
          return `顾问研判（${t.report.headline}）：${t.report.executiveSummary.slice(0, 260)}`;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  };

  const submitConsultation = async (
    promptText: string,
    overrideContext?: {
      entityType?: EntityType;
      industry?: IndustryTrack;
      topic?: AdvisoryTopic;
    }
  ) => {
    const trimmed = promptText.trim();
    if (!trimmed || isLoading) return;

    const effectiveEntity = overrideContext?.entityType ?? entityType;
    const effectiveIndustry = overrideContext?.industry ?? industry;
    const effectiveTopic = overrideContext?.topic ?? topic;

    if (overrideContext?.entityType) onChangeEntityType(overrideContext.entityType);
    if (overrideContext?.industry) onChangeIndustry(overrideContext.industry);
    if (overrideContext?.topic) onChangeTopic(overrideContext.topic);

    const userTurn: ChatTurn = {
      id: `u_${Date.now()}`,
      role: 'user',
      timestamp: new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      userText: trimmed,
    };

    const historySummary = buildHistorySummary(turns);
    onChangeTurns((prev) => [...prev, userTurn]);
    setInput('');
    setIsLoading(true);

    try {
      const resp = await fetch('/api/advisor/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: effectiveEntity,
          industry: effectiveIndustry,
          topic: effectiveTopic,
          guidanceMode,
          userPrompt: trimmed,
          historySummary,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.report) {
        throw new Error(data.error || '顾问研判返回异常，请重试。');
      }

      const advisorTurn: ChatTurn = {
        id: `a_${Date.now()}`,
        role: 'advisor',
        timestamp: new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        report: data.report as StructuredAdvisoryReport,
      };
      onChangeTurns((prev) => [...prev, advisorTurn]);
    } catch (err) {
      const errorTurn: ChatTurn = {
        id: `e_${Date.now()}`,
        role: 'advisor',
        timestamp: new Date().toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        error: err instanceof Error ? err.message : '网络请求异常，请稍后重试。',
      };
      onChangeTurns((prev) => [...prev, errorTurn]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitConsultation(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      submitConsultation(input);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Top Module Switcher */}
      <section className="pb-5 border-b border-[#E4E1DA] space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <div className="text-xs text-[#64748B] mb-1.5">
              跨界综合顾问 · 初学者循序引导 · 产业可研生成与交叉审改
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#141E2B]">
              交互式 AI 专题顾问
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onOpenJargon}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1B365D] bg-white border border-[#E4E1DA] rounded hover:bg-[#F2F0EA] transition-colors whitespace-nowrap shrink-0"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>速查银行/行业黑话</span>
            </button>
            {advisorMode === 'consult' && turns.length > 0 && (
              <button
                type="button"
                onClick={() => onChangeTurns([])}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#475569] bg-white border border-[#E4E1DA] rounded hover:bg-[#F2F0EA] transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>清空当前研讨</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Mode Tabs inside Interactive Advisor */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAdvisorMode('consult')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium rounded border transition-colors whitespace-nowrap ${
              advisorMode === 'consult'
                ? 'border-[#1B365D] bg-[#1B365D] text-white'
                : 'border-[#E4E1DA] bg-white text-[#334155] hover:bg-[#FAF9F6]'
            }`}
          >
            <MessageSquareText className="w-4 h-4" />
            <span>专题互动研讨（自由问答 / 案例引导）</span>
          </button>
          <button
            type="button"
            onClick={() => setAdvisorMode('feasibility')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium rounded border transition-colors whitespace-nowrap ${
              advisorMode === 'feasibility'
                ? 'border-[#1B365D] bg-[#1B365D] text-white'
                : 'border-[#E4E1DA] bg-white text-[#334155] hover:bg-[#FAF9F6]'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>产业可研助手（IRR 回归模型 · 标准初稿 · 上传审改）</span>
          </button>
        </div>

        {/* Entity / Industry / Topic + Guidance Mode Controls (Only in Consult mode) */}
        {advisorMode === 'consult' && (
          <div className="bg-white border border-[#E4E1DA] rounded-md p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#F0EDE6]">
            <div>
              <div className="text-xs font-semibold text-[#141E2B]">顾问带路方式</div>
              <div className="text-[11px] text-[#64748B] mt-0.5">
                {guidanceMode === 'beginner_guided'
                  ? '零基础循序引导：全程讲人话、自动翻译银行与行业黑话、给出下场会谈必问问题与向上汇报话术'
                  : '资深实操直出：默认熟悉基础概念，直接切入交易结构、国资红线与条款博弈'}
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#F2F0EA] rounded shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => onChangeGuidanceMode('beginner_guided')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  guidanceMode === 'beginner_guided'
                    ? 'bg-[#1B365D] text-white'
                    : 'text-[#475569] hover:text-[#141E2B]'
                }`}
              >
                零基础循序引导（推荐）
              </button>
              <button
                type="button"
                onClick={() => onChangeGuidanceMode('expert_direct')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                  guidanceMode === 'expert_direct'
                    ? 'bg-[#1B365D] text-white'
                    : 'text-[#475569] hover:text-[#141E2B]'
                }`}
              >
                资深实操直出
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="advisor-entity"
                className="block text-xs font-medium text-[#64748B] mb-1.5"
              >
                主体属性（决定合规与管控口径）
              </label>
              <select
                id="advisor-entity"
                value={entityType}
                onChange={(e) => onChangeEntityType(e.target.value as EntityType)}
                className="w-full h-9 px-3 text-xs sm:text-[13px] font-medium text-[#141E2B] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
              >
                {(Object.keys(ENTITY_LABELS) as EntityType[]).map((key) => (
                  <option key={key} value={key}>
                    {ENTITY_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="advisor-industry"
                className="block text-xs font-medium text-[#64748B] mb-1.5"
              >
                项目 / 行业赛道
              </label>
              <select
                id="advisor-industry"
                value={industry}
                onChange={(e) => onChangeIndustry(e.target.value as IndustryTrack)}
                className="w-full h-9 px-3 text-xs sm:text-[13px] font-medium text-[#141E2B] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
              >
                {(Object.keys(INDUSTRY_LABELS) as IndustryTrack[]).map((key) => (
                  <option key={key} value={key}>
                    {INDUSTRY_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="advisor-topic"
                className="block text-xs font-medium text-[#64748B] mb-1.5"
              >
                本次研讨切入点
              </label>
              <select
                id="advisor-topic"
                value={topic}
                onChange={(e) => onChangeTopic(e.target.value as AdvisoryTopic)}
                className="w-full h-9 px-3 text-xs sm:text-[13px] font-medium text-[#141E2B] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
              >
                {(Object.keys(TOPIC_LABELS) as AdvisoryTopic[]).map((key) => (
                  <option key={key} value={key}>
                    {TOPIC_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        )}
      </section>

      {advisorMode === 'feasibility' ? (
        <FeasibilityAssistant />
      ) : (
        <>
          {/* Conversation Stream or Empty State with User's Exact Real-World Scenarios */}
          {turns.length === 0 ? (
        <section className="space-y-5">
          <div className="bg-white border border-[#E4E1DA] rounded-md p-6">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#141E2B] mb-2">
              <MessageSquareText className="w-4 h-4 text-[#1B365D]" />
              <span>不用怕外行，把您刚考察完的项目或遇到的卡点直接抛给我</span>
            </div>
            <p className="text-sm text-[#475569] leading-relaxed">
              现阶段团队只有几个人、什么跨界事都要干（看地方农业厂房、写 1000P 算力可研、跑银行谈供应链授信），完全正常。在
              <span className="text-[#141E2B] font-medium">「零基础循序引导模式」</span>
              下，我会把行业底层逻辑、银行黑话、谈判必问底牌、以及怎么既落实领导意见又装好风控安全阀，一步步掰开揉碎讲清楚。
            </p>
          </div>

          <div>
            <div className="text-xs font-medium text-[#64748B] mb-3">
              贴合贵司当前业务的一键引导研讨（点击直接开始）
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {ADVISOR_PRESET_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    submitConsultation(preset.prompt, {
                      entityType: preset.entityType,
                      industry: preset.industry,
                      topic: preset.topic,
                    })
                  }
                  className="group text-left bg-white border border-[#E4E1DA] hover:border-[#1B365D]/45 rounded-md p-4 transition-colors flex flex-col justify-between gap-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs text-[#64748B]">
                        {INDUSTRY_LABELS[preset.industry]} · {TOPIC_LABELS[preset.topic]}
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#1B365D] shrink-0" />
                    </div>
                    <h3 className="text-sm font-semibold text-[#141E2B] group-hover:text-[#1B365D] transition-colors">
                      {preset.title}
                    </h3>
                    <div className="text-xs font-medium text-[#1B365D]/85 mt-1">
                      {preset.subtitle}
                    </div>
                    <p className="text-xs text-[#475569] mt-1.5 line-clamp-2 leading-relaxed">
                      {preset.prompt}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-6">
          {turns.map((turn) => {
            if (turn.role === 'user') {
              return (
                <div
                  key={turn.id}
                  className="bg-[#F2F0EA] border border-[#E4E1DA] rounded-md p-5"
                >
                  <div className="flex items-center justify-between text-xs text-[#64748B] mb-2">
                    <span className="font-semibold text-[#141E2B]">企业提问与现场情况</span>
                    <span className="font-mono tabular-nums">{turn.timestamp}</span>
                  </div>
                  <p className="text-sm sm:text-[15px] text-[#141E2B] leading-relaxed whitespace-pre-wrap">
                    {turn.userText}
                  </p>
                </div>
              );
            }

            if (turn.error) {
              return (
                <div
                  key={turn.id}
                  className="flex items-start gap-3 p-4 rounded-md border border-[#B91C1C]/30 bg-[#FEF2F2] text-sm text-[#991B1B]"
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium">研判请求未完成</div>
                    <div className="mt-1 text-xs sm:text-sm">{turn.error}</div>
                  </div>
                </div>
              );
            }

            if (turn.report) {
              return (
                <ReportView
                  key={turn.id}
                  report={turn.report}
                  entityType={entityType}
                  industry={industry}
                  dateLabel={turn.timestamp}
                  isSaved={savedMemoHeadlines.has(turn.report.headline)}
                  onSaveMemo={() =>
                    onSaveMemo(turn.report!, 'advisor', entityType, industry)
                  }
                  onFollowUp={(q) => submitConsultation(q)}
                />
              );
            }

            return null;
          })}

          {isLoading && (
            <div className="bg-white border border-[#E4E1DA] rounded-md p-6 sm:p-8 space-y-5 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 w-56 bg-[#E4E1DA] rounded" />
                <span className="text-xs text-[#64748B]">
                  {guidanceMode === 'beginner_guided'
                    ? '正在为您拆解行业门道、翻译黑话并生成谈判必问清单...'
                    : '正在结合国资/跨境实务规则深度研判...'}
                </span>
              </div>
              <div className="h-6 w-3/4 bg-[#E4E1DA] rounded" />
              <div className="space-y-2">
                <div className="h-4 w-full bg-[#F2F0EA] rounded" />
                <div className="h-4 w-11/12 bg-[#F2F0EA] rounded" />
                <div className="h-4 w-3/4 bg-[#F2F0EA] rounded" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="h-24 bg-[#F7F6F2] rounded border border-[#E4E1DA]" />
                <div className="h-24 bg-[#F7F6F2] rounded border border-[#E4E1DA]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </section>
      )}

      {/* Persistent Bottom Consultation Input Composer */}
      <form
        onSubmit={handleFormSubmit}
        className="bg-white border border-[#D8D4CA] focus-within:border-[#1B365D] rounded-md p-4 transition-colors"
      >
        <textarea
          ref={textareaRef}
          rows={4}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="把您遇到的真实事情用大白话写进来（例如：去外地考察了一个菌棒厂 / 领导要求写1000P算力可研 / 明天要见银行客户经理不知道怎么谈授信与防坑...）"
          className="w-full resize-y bg-transparent text-sm text-[#141E2B] placeholder:text-[#94A3B8] focus:outline-none leading-relaxed"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-2 border-t border-[#F0EDE6]">
          <span className="text-xs text-[#64748B]">
            按 Ctrl / ⌘ + Enter 快速提交 · 当前：
            {guidanceMode === 'beginner_guided' ? '零基础循序引导' : '资深实操直出'}
          </span>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-medium text-white bg-[#1B365D] rounded hover:bg-[#132847] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isLoading ? '研判生成中...' : '提交顾问诊断'}</span>
          </button>
        </div>
      </form>
        </>
      )}
    </div>
  );
};
