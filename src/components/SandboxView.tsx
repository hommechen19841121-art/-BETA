import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  RotateCcw,
  Sparkles,
  AlertCircle,
  ShieldAlert,
  Check,
  BookOpen,
  Compass,
} from 'lucide-react';
import {
  DEFAULT_SANDBOX_CONFIG,
  INDUSTRY_LABELS,
  INITIAL_TIER4_SOE_DIAGNOSIS,
  RESOURCE_OPTIONS,
  ROADMAP_STAGES,
} from '../data/domainData';
import {
  ComplianceStrictness,
  IndustryTrack,
  ResourceKey,
  SandboxConfig,
  StructuredAdvisoryReport,
} from '../types';
import { computeSandboxProjection } from '../utils/sandboxEngine';
import { ReportView } from './ReportView';

interface SandboxViewProps {
  config: SandboxConfig;
  onChangeConfig: (next: SandboxConfig) => void;
  onInspectModelInMatrix: (modelId: string) => void;
  onSendToAdvisor: (prompt: string, industry: IndustryTrack) => void;
  onOpenJargon: () => void;
  onSaveMemo: (report: StructuredAdvisoryReport, source: 'sandbox') => void;
  savedMemoHeadlines: Set<string>;
}

export const SandboxView: React.FC<SandboxViewProps> = ({
  config,
  onChangeConfig,
  onInspectModelInMatrix,
  onSendToAdvisor,
  onOpenJargon,
  onSaveMemo,
  savedMemoHeadlines,
}) => {
  const [customBrief, setCustomBrief] = useState<StructuredAdvisoryReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeStageIdx, setActiveStageIdx] = useState(0);

  const projection = useMemo(() => computeSandboxProjection(config), [config]);
  const activeStage = ROADMAP_STAGES[activeStageIdx] || ROADMAP_STAGES[0];

  const toggleResource = (key: ResourceKey) => {
    const exists = config.resources.includes(key);
    const nextResources = exists
      ? config.resources.filter((r) => r !== key)
      : [...config.resources, key];
    onChangeConfig({ ...config, resources: nextResources });
  };

  const handleGenerateTailoredBrief = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const resp = await fetch('/api/advisor/sandbox-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          computedSummary: projection.summaryForAi,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.report) {
        throw new Error(data.error || '生成定制研判失败，请稍后重试。');
      }
      setCustomBrief(data.report as StructuredAdvisoryReport);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '请求失败，请检查网络连接。');
    } finally {
      setIsGenerating(false);
    }
  };

  const activeReport = customBrief ?? INITIAL_TIER4_SOE_DIAGNOSIS;

  return (
    <div className="space-y-8">
      {/* Executive Situation Header */}
      <section className="pb-6 border-b border-[#E4E1DA]">
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] mb-2">
          <span>首屏专题推演</span>
          <span aria-hidden="true">·</span>
          <span>国资四级子公司</span>
          <span aria-hidden="true">·</span>
          <span>存量资源基线：国资信用 / 资质牌照 / 跨区域渠道 / 少量资金</span>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#141E2B] tracking-tight">
              国资四级公司路线卡点与资产盘活沙盘
            </h1>
            <p className="mt-2.5 text-sm sm:text-[15px] text-[#475569] leading-relaxed">
              面向“人手少、跨界摸索农业/算力/供应链、不知道从哪一步起手”的四级国资团队：先通过 5 阶段推进路线排查卡点（避开盲目建基地、无订单重投算力与银行黑话陷阱），再结合下方参数沙盘测算安全敞口与杠杆空间。
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onChangeConfig(DEFAULT_SANDBOX_CONFIG);
                setCustomBrief(null);
                setErrorMsg(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#475569] bg-white border border-[#E4E1DA] rounded hover:bg-[#F2F0EA] transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>恢复默认参数</span>
            </button>
            <button
              type="button"
              onClick={handleGenerateTailoredBrief}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1B365D] rounded hover:bg-[#132847] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'AI 深度推演中...' : '按当前参数生成定制研报'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 4-Column Quantitative Boundary KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 border border-[#E4E1DA] rounded-md bg-white divide-y sm:divide-y-0 sm:divide-x divide-[#E4E1DA]">
        <div className="p-5">
          <div className="text-xs text-[#64748B]">单项目净风险敞口上限</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono tabular-nums text-2xl font-semibold text-[#141E2B]">
              {projection.singleProjectRiskCapWan.toLocaleString()}
            </span>
            <span className="text-xs text-[#64748B]">万元</span>
          </div>
          <div className="mt-1.5 text-xs text-[#475569]">
            严控现金占比与自主投权双红线，防止单点沉淀
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[#64748B]">表外信用/金融工具撬动区间</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono tabular-nums text-2xl font-semibold text-[#1B365D]">
              {projection.creditLeverageMinWan.toLocaleString()}–
              {projection.creditLeverageMaxWan.toLocaleString()}
            </span>
            <span className="text-xs text-[#64748B]">万元</span>
          </div>
          <div className="mt-1.5 text-xs text-[#475569]">
            依托信用证(L/C)、保函、中信保保单与无追索保理
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[#64748B]">精简团队安全并发项目数</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono tabular-nums text-2xl font-semibold text-[#141E2B]">
              {projection.maxConcurrentProjects}
            </span>
            <span className="text-xs text-[#64748B]">个（当前 {config.headcount} 人）</span>
          </div>
          <div className="mt-1.5 text-xs text-[#475569]">
            保障“业务—印章—资金复核”不相容岗位底线
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[#64748B]">当前首选盘活路径</div>
          <div className="mt-2 text-base font-semibold text-[#141E2B] leading-snug line-clamp-1">
            {projection.recommendedModels[0]?.model.name || '真实货权轻资产代理'}
          </div>
          <div className="mt-1.5 text-xs text-[#166534]">
            {projection.recommendedModels[0]?.model.revenueAccounting} ·{' '}
            {projection.recommendedModels[0]?.model.leverageRatio}
          </div>
        </div>
      </section>

      {/* NEW: Interactive 5-Stage 0-to-1 Route Map & Bottleneck Clinic */}
      <section className="bg-white border border-[#E4E1DA] rounded-md overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E4E1DA] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#1B365D]" />
            <div>
              <h2 className="font-editorial text-base sm:text-lg font-bold text-[#141E2B]">
                不知道怎么走？四级公司从 0 到 1 路线图与核心卡点推演
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                按真实推进顺序点击以下 5 个阶段，逐一排查“菌棒建基地、1000P算力可研、对接银行黑话”等典型卡点
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenJargon}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B365D] bg-[#FAF9F6] border border-[#E4E1DA] rounded hover:bg-[#F2F0EA] transition-colors whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>查银行与行业黑话词典</span>
          </button>
        </div>

        {/* 5-Stage Horizontal Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-5 border-b border-[#E4E1DA] divide-y sm:divide-y-0 sm:divide-x divide-[#E4E1DA] bg-[#FAF9F6]">
          {ROADMAP_STAGES.map((stage, idx) => {
            const active = idx === activeStageIdx;
            return (
              <button
                key={stage.step}
                type="button"
                onClick={() => setActiveStageIdx(idx)}
                className={`p-3.5 text-left transition-colors ${
                  active
                    ? 'bg-white text-[#141E2B]'
                    : 'text-[#64748B] hover:bg-[#F2F0EA]/70 hover:text-[#141E2B]'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums mb-1">
                  <span className={active ? 'text-[#1B365D] font-semibold' : ''}>
                    {stage.step}
                  </span>
                  {active && (
                    <span className="text-[11px] font-sans font-semibold text-[#1B365D]">
                      当前检视
                    </span>
                  )}
                </div>
                <div className="text-xs sm:text-[13px] font-semibold leading-snug line-clamp-2">
                  {stage.title.split('（')[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Stage Bottleneck & Beginner Action Panel */}
        <div className="p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="text-xs font-mono tabular-nums text-[#1B365D] font-semibold">
                {activeStage.step} · 阶段目标
              </div>
              <h3 className="font-editorial text-lg font-bold text-[#141E2B]">
                {activeStage.title}
              </h3>
              <p className="text-sm text-[#334155] leading-relaxed">{activeStage.goal}</p>
            </div>
            <button
              type="button"
              onClick={() =>
                onSendToAdvisor(activeStage.advisorSeedPrompt, activeStage.targetIndustry)
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1B365D] rounded hover:bg-[#132847] transition-colors whitespace-nowrap shrink-0 self-start"
            >
              <span>请 AI 顾问针对本阶段手把手引导</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs sm:text-[13px] leading-relaxed">
            <div className="p-4 rounded border border-[#B91C1C]/25 bg-[#FEF2F2]/40 space-y-2">
              <div className="font-semibold text-[#B91C1C]">本阶段最大卡点与踩坑警示</div>
              <p className="text-[#334155]">{activeStage.typicalBottleneck}</p>
              <p className="text-[#475569] pt-2 border-t border-[#B91C1C]/15">
                {activeStage.realCaseWarning}
              </p>
            </div>

            <div className="p-4 rounded border border-[#E4E1DA] bg-[#FAF9F6] space-y-2">
              <div className="font-semibold text-[#1B365D]">新手 / 精简团队破局做法</div>
              <p className="text-[#334155]">{activeStage.beginnerAction}</p>
            </div>

            <div className="p-4 rounded border border-[#166534]/25 bg-[#F0FDF4]/40 space-y-2">
              <div className="font-semibold text-[#166534]">进入下一阶段的通关底稿</div>
              <p className="text-[#334155]">{activeStage.passGate}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main 2-Column Interactive Sandbox Split */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Operational Constraints Control Panel */}
        <div className="xl:col-span-5 bg-white border border-[#E4E1DA] rounded-md p-6 space-y-6">
          <div className="pb-4 border-b border-[#E4E1DA]">
            <h2 className="font-editorial text-lg font-bold text-[#141E2B]">
              企业约束与存量资源参数
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              拖动或勾选贵司真实家底，右侧测算与落地路径实时联动
            </p>
          </div>

          {/* Slider 1: Liquid Capital */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <label htmlFor="capital-range" className="font-medium text-[#141E2B]">
                可动用自有资金规模
              </label>
              <span className="font-mono tabular-nums font-semibold text-[#1B365D]">
                {config.liquidCapitalWan.toLocaleString()} 万元
              </span>
            </div>
            <input
              id="capital-range"
              type="range"
              min={100}
              max={3000}
              step={50}
              value={config.liquidCapitalWan}
              onChange={(e) =>
                onChangeConfig({ ...config, liquidCapitalWan: Number(e.target.value) })
              }
              className="w-full editorial-range"
            />
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-[#64748B] mt-1.5">
              <span>100万</span>
              <span>500万</span>
              <span>1500万</span>
              <span>3000万</span>
            </div>
          </div>

          {/* Slider 2: Headcount */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <label htmlFor="headcount-range" className="font-medium text-[#141E2B]">
                核心专职配备人数
              </label>
              <span className="font-mono tabular-nums font-semibold text-[#1B365D]">
                {config.headcount} 人
              </span>
            </div>
            <input
              id="headcount-range"
              type="range"
              min={2}
              max={20}
              step={1}
              value={config.headcount}
              onChange={(e) =>
                onChangeConfig({ ...config, headcount: Number(e.target.value) })
              }
              className="w-full editorial-range"
            />
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-[#64748B] mt-1.5">
              <span>2人（极简）</span>
              <span>5人</span>
              <span>10人</span>
              <span>20人</span>
            </div>
          </div>

          {/* Slider 3: Investment Authority Limit */}
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <label htmlFor="authority-range" className="font-medium text-[#141E2B]">
                自主投资单笔权限上限
              </label>
              <span className="font-mono tabular-nums font-semibold text-[#1B365D]">
                {config.investAuthorityLimitWan.toLocaleString()} 万元
              </span>
            </div>
            <input
              id="authority-range"
              type="range"
              min={200}
              max={5000}
              step={100}
              value={config.investAuthorityLimitWan}
              onChange={(e) =>
                onChangeConfig({
                  ...config,
                  investAuthorityLimitWan: Number(e.target.value),
                })
              }
              className="w-full editorial-range"
            />
            <div className="flex justify-between text-[11px] font-mono tabular-nums text-[#64748B] mt-1.5">
              <span>200万</span>
              <span>1000万</span>
              <span>3000万</span>
              <span>5000万</span>
            </div>
          </div>

          {/* Industry Track Selector */}
          <div>
            <div className="text-sm font-medium text-[#141E2B] mb-2">主攻业务赛道</div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(INDUSTRY_LABELS) as IndustryTrack[]).map((track) => {
                const active = config.industry === track;
                return (
                  <button
                    key={track}
                    type="button"
                    onClick={() => onChangeConfig({ ...config, industry: track })}
                    className={`px-3 py-2 text-xs font-medium rounded border text-left transition-colors whitespace-nowrap truncate ${
                      active
                        ? 'border-[#1B365D] bg-[#1B365D] text-white'
                        : 'border-[#E4E1DA] bg-[#FAF9F6] text-[#334155] hover:bg-white'
                    }`}
                  >
                    {INDUSTRY_LABELS[track]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Compliance Strictness */}
          <div>
            <div className="text-sm font-medium text-[#141E2B] mb-2">国资监管与审计口径</div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F2F0EA] rounded">
              {(
                [
                  { id: 'strict_sasac', label: '严控红线' },
                  { id: 'balanced', label: '均衡稳健' },
                  { id: 'market_agile', label: '市场敏捷' },
                ] as { id: ComplianceStrictness; label: string }[]
              ).map((item) => {
                const active = config.strictness === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeConfig({ ...config, strictness: item.id })}
                    className={`py-1.5 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white text-[#141E2B] shadow-xs'
                        : 'text-[#64748B] hover:text-[#141E2B]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Consolidation Preference */}
          <div>
            <div className="text-sm font-medium text-[#141E2B] mb-2">财务并表与业绩诉求</div>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F2F0EA] rounded">
              {(
                [
                  { id: 'no_consolidate', label: '优先不并表' },
                  { id: 'flexible', label: '重利润回款' },
                  { id: 'consolidate_revenue', label: '兼顾表内营收' },
                ] as const
              ).map((item) => {
                const active = config.consolidationPreference === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onChangeConfig({ ...config, consolidationPreference: item.id })
                    }
                    className={`py-1.5 px-2 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white text-[#141E2B] shadow-xs'
                        : 'text-[#64748B] hover:text-[#141E2B]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stock Resources Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-sm font-medium text-[#141E2B]">
                手头可盘活的存量资源
              </span>
              <span className="font-mono tabular-nums text-xs text-[#64748B]">
                已选 {config.resources.length} / {RESOURCE_OPTIONS.length}
              </span>
            </div>
            <div className="space-y-2">
              {RESOURCE_OPTIONS.map((res) => {
                const checked = config.resources.includes(res.key);
                return (
                  <button
                    key={res.key}
                    type="button"
                    onClick={() => toggleResource(res.key)}
                    className={`w-full flex items-start gap-3 p-3 rounded border text-left transition-colors ${
                      checked
                        ? 'border-[#1B365D]/40 bg-[#1B365D]/[0.03]'
                        : 'border-[#E4E1DA] bg-white hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-xs border flex items-center justify-center shrink-0 transition-colors ${
                        checked
                          ? 'bg-[#1B365D] border-[#1B365D] text-white'
                          : 'border-[#CBD5E1] bg-white'
                      }`}
                    >
                      {checked && <Check className="w-3 h-3 stroke-[2.5]" />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-[13px] font-medium text-[#141E2B]">
                        {res.label}
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
                        {res.hint}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Live Ranked Playbooks, Governance Split & Redline Triggers */}
        <div className="xl:col-span-7 space-y-6">
          {/* Active Boundary Redline Alerts */}
          <div className="bg-white border border-[#E4E1DA] rounded-md p-6">
            <div className="flex items-center gap-2 mb-3.5">
              <ShieldAlert className="w-4 h-4 text-[#B91C1C]" />
              <h2 className="font-editorial text-base font-bold text-[#141E2B]">
                当前参数下的刚性风控边界提示
              </h2>
            </div>
            <ul className="space-y-2.5">
              {projection.redlineTriggers.map((trigger, idx) => (
                <li
                  key={idx}
                  className="text-sm text-[#334155] leading-relaxed pl-3 py-1 bg-[#FEF2F2]/40 border border-[#B91C1C]/15 rounded px-3.5 py-2.5"
                >
                  {trigger}
                </li>
              ))}
            </ul>
          </div>

          {/* Ranked Light-Asset Pathways */}
          <div className="bg-white border border-[#E4E1DA] rounded-md p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E4E1DA]">
              <div>
                <h2 className="font-editorial text-base font-bold text-[#141E2B]">
                  动态匹配的轻资产盘活路径排序
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  按当前资金、人员、资源组合实时筛选，点击可查看四流架构或直接咨询
                </p>
              </div>
            </div>

            <div className="divide-y divide-[#E4E1DA]">
              {projection.recommendedModels.map(({ model, priorityLabel, rationale }) => {
                const priorityColor =
                  priorityLabel === '优先落地'
                    ? 'text-[#166534]'
                    : priorityLabel === '协同备选'
                    ? 'text-[#1B365D]'
                    : 'text-[#B45309]';
                return (
                  <div key={model.id} className="py-4 first:pt-4 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs mb-1">
                          <span className="font-mono tabular-nums text-[#64748B]">
                            {model.code}
                          </span>
                          <span aria-hidden="true" className="text-[#CBD5E1]">
                            ·
                          </span>
                          <span className={`font-semibold ${priorityColor}`}>
                            {priorityLabel}
                          </span>
                          <span aria-hidden="true" className="text-[#CBD5E1]">
                            ·
                          </span>
                          <span className="text-[#64748B]">{model.capitalBand}</span>
                          <span aria-hidden="true" className="text-[#CBD5E1]">
                            ·
                          </span>
                          <span className="text-[#64748B]">{model.consolidationImpact}</span>
                        </div>
                        <h3 className="text-sm sm:text-[15px] font-semibold text-[#141E2B]">
                          {model.name}
                        </h3>
                        <p className="text-xs sm:text-[13px] text-[#475569] mt-1 leading-relaxed">
                          匹配理由：{rationale}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onInspectModelInMatrix(model.id)}
                          className="px-3 py-1.5 text-xs font-medium text-[#141E2B] bg-[#FAF9F6] border border-[#E4E1DA] rounded hover:bg-[#F2F0EA] transition-colors whitespace-nowrap"
                        >
                          查看四流架构
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onSendToAdvisor(model.advisorPromptSeed, config.industry)
                          }
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1B365D] border border-[#1B365D]/30 rounded hover:bg-[#1B365D]/5 transition-colors whitespace-nowrap"
                        >
                          <span>深入研讨</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lean Team Minimal Internal Control Matrix */}
          <div className="bg-white border border-[#E4E1DA] rounded-md p-6">
            <div className="pb-3.5 border-b border-[#E4E1DA] mb-4">
              <h2 className="font-editorial text-base font-bold text-[#141E2B]">
                {config.headcount} 人精简编制：最小内控闭环与外包分工建议
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                解决“人手少又要过审计”的核心原则：重执行外包给持牌方，内部死守投决、货权与资金复核
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
                <thead>
                  <tr className="border-b border-[#E4E1DA] text-[#64748B]">
                    <th className="py-2 pr-3 font-medium whitespace-nowrap">岗位 / 角色</th>
                    <th className="py-2 px-3 font-medium">内部必守职责</th>
                    <th className="py-2 pl-3 font-medium">外包 / 隔离边界</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDE6]">
                  {projection.leanGovernancePlan.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-3 pr-3 font-medium text-[#141E2B] whitespace-nowrap align-top">
                        {row.role}
                      </td>
                      <td className="py-3 px-3 text-[#334155] leading-relaxed align-top">
                        {row.internalAllocation}
                      </td>
                      <td className="py-3 pl-3 text-[#475569] leading-relaxed align-top">
                        {row.outsourceBoundary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Deep Executive Report Area (Pre-loaded + Live AI Custom Generation) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-editorial text-xl font-bold text-[#141E2B]">
              {customBrief ? '定制化沙盘推演研报（AI 实时生成）' : '四级国资资产盘活基准实操诊断'}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              {customBrief
                ? `已结合您设置的 ${config.liquidCapitalWan} 万元资金、${config.headcount} 人编制与 ${INDUSTRY_LABELS[config.industry]} 赛道生成`
                : '基于贵司首轮描述预先生成的完整五段式实操报告；调节上方参数后可一键重新生成专属定制版'}
            </p>
          </div>
          {customBrief && (
            <button
              type="button"
              onClick={() => setCustomBrief(null)}
              className="text-xs text-[#1B365D] hover:underline whitespace-nowrap"
            >
              切换回基准实操诊断
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2.5 p-4 rounded border border-[#B91C1C]/30 bg-[#FEF2F2] text-sm text-[#991B1B]">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div>{errorMsg}</div>
              <button
                type="button"
                onClick={handleGenerateTailoredBrief}
                className="mt-1.5 text-xs font-semibold underline"
              >
                重新尝试生成
              </button>
            </div>
          </div>
        )}

        {isGenerating ? (
          <div className="bg-white border border-[#E4E1DA] rounded-md p-8 space-y-5 animate-pulse">
            <div className="h-4 w-48 bg-[#ECE9E2] rounded" />
            <div className="h-7 w-2/3 bg-[#E4E1DA] rounded" />
            <div className="space-y-2.5 pt-2">
              <div className="h-4 w-full bg-[#F2F0EA] rounded" />
              <div className="h-4 w-11/12 bg-[#F2F0EA] rounded" />
              <div className="h-4 w-4/5 bg-[#F2F0EA] rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="h-28 bg-[#F7F6F2] rounded border border-[#E4E1DA]" />
              <div className="h-28 bg-[#F7F6F2] rounded border border-[#E4E1DA]" />
              <div className="h-28 bg-[#F7F6F2] rounded border border-[#E4E1DA]" />
            </div>
          </div>
        ) : (
          <ReportView
            report={activeReport}
            entityType="soe_tier4"
            industry={config.industry}
            dateLabel={customBrief ? '刚刚生成' : '基准实操稿'}
            isSaved={savedMemoHeadlines.has(activeReport.headline)}
            onSaveMemo={() => onSaveMemo(activeReport, 'sandbox')}
            onFollowUp={(q) => onSendToAdvisor(q, config.industry)}
          />
        )}
      </section>
    </div>
  );
};
