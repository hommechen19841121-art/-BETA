import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Search,
  X,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';
import { INDUSTRY_LABELS, LIGHT_ASSET_MODELS } from '../data/domainData';
import { IndustryTrack, LightAssetModel } from '../types';

interface MatrixViewProps {
  highlightedModelId: string | null;
  onClearHighlightedModel: () => void;
  onSendToAdvisor: (prompt: string, industry: IndustryTrack) => void;
}

export const MatrixView: React.FC<MatrixViewProps> = ({
  highlightedModelId,
  onClearHighlightedModel,
  onSendToAdvisor,
}) => {
  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState<IndustryTrack | 'all'>('all');
  const [capitalFilter, setCapitalFilter] = useState<'all' | 'very_low' | 'low' | 'medium'>(
    'all'
  );
  const [consolidationFilter, setConsolidationFilter] = useState<
    'all' | '不并表' | '表内自营' | '可选并表'
  >('all');
  const [selectedModel, setSelectedModel] = useState<LightAssetModel | null>(null);

  useEffect(() => {
    if (highlightedModelId) {
      const found = LIGHT_ASSET_MODELS.find((m) => m.id === highlightedModelId);
      if (found) {
        setSelectedModel(found);
      }
      onClearHighlightedModel();
    }
  }, [highlightedModelId, onClearHighlightedModel]);

  const filteredModels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return LIGHT_ASSET_MODELS.filter((m) => {
      if (trackFilter !== 'all' && !m.applicableTracks.includes(trackFilter)) return false;
      if (capitalFilter !== 'all' && m.capitalLevel !== capitalFilter) return false;
      if (
        consolidationFilter !== 'all' &&
        m.consolidationImpact !== consolidationFilter
      ) {
        return false;
      }
      if (
        q &&
        !`${m.name} ${m.subtitle} ${m.coreLogic} ${m.revenueAccounting}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [search, trackFilter, capitalFilter, consolidationFilter]);

  const getRiskStyle = (risk: LightAssetModel['soeRiskLevel']) => {
    if (risk === '低') return 'text-[#166534] font-medium';
    if (risk === '中') return 'text-[#B45309] font-medium';
    return 'text-[#B91C1C] font-semibold';
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <section className="pb-5 border-b border-[#E4E1DA]">
        <div className="text-xs text-[#64748B] mb-1.5">
          轻资产模式比选 · 资金占用 / 人力负荷 / 并表口径 / 国资红线横向对照
        </div>
        <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#141E2B]">
          轻资产投融与涉外贸易链路方案对比矩阵
        </h1>
        <p className="mt-2 text-sm text-[#475569] max-w-3xl leading-relaxed">
          专为“国资信用好、账面现金紧、编制人员少”的主体整理 6 套主流实操架构。点击任意一行可穿透查看“业务流—资金流—货权流—合同流”四流闭环与国资“十不准”红线核验要点。
        </p>
      </section>

      {/* Filter Toolbar */}
      <section className="bg-white border border-[#E4E1DA] rounded-md p-4 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索模式名称、中信保、SPV、保理、配额..."
            className="w-full h-9 pl-9 pr-3 text-xs sm:text-[13px] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label="按赛道筛选"
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value as IndustryTrack | 'all')}
            className="h-9 px-3 text-xs font-medium text-[#141E2B] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
          >
            <option value="all">全部行业赛道</option>
            {(Object.keys(INDUSTRY_LABELS) as IndustryTrack[]).map((t) => (
              <option key={t} value={t}>
                {INDUSTRY_LABELS[t]}
              </option>
            ))}
          </select>

          <select
            aria-label="按资金门槛筛选"
            value={capitalFilter}
            onChange={(e) =>
              setCapitalFilter(e.target.value as 'all' | 'very_low' | 'low' | 'medium')
            }
            className="h-9 px-3 text-xs font-medium text-[#141E2B] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
          >
            <option value="all">全部资金门槛</option>
            <option value="very_low">极低（≤300万）</option>
            <option value="low">低（300–1000万）</option>
            <option value="medium">中低（1000–2000万）</option>
          </select>

          <select
            aria-label="按并表口径筛选"
            value={consolidationFilter}
            onChange={(e) =>
              setConsolidationFilter(
                e.target.value as 'all' | '不并表' | '表内自营' | '可选并表'
              )
            }
            className="h-9 px-3 text-xs font-medium text-[#141E2B] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
          >
            <option value="all">全部并表口径</option>
            <option value="不并表">不并表（风险隔离）</option>
            <option value="表内自营">表内自营</option>
            <option value="可选并表">可选并表</option>
          </select>
        </div>
      </section>

      {/* High-Density Institutional Comparison Table */}
      <section className="bg-white border border-[#E4E1DA] rounded-md overflow-hidden">
        {filteredModels.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-[#475569]">当前筛选条件下没有匹配的轻资产模式。</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setTrackFilter('all');
                setCapitalFilter('all');
                setConsolidationFilter('all');
              }}
              className="px-4 py-2 text-xs font-medium text-[#1B365D] border border-[#1B365D]/30 rounded hover:bg-[#1B365D]/5 transition-colors"
            >
              重置全部筛选条件
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-[#F7F6F2] border-b border-[#E4E1DA] text-xs text-[#64748B]">
                  <th className="py-3 px-4 font-medium whitespace-nowrap">编号 / 实操架构</th>
                  <th className="py-3 px-3.5 font-medium whitespace-nowrap">资金占用</th>
                  <th className="py-3 px-3.5 font-medium whitespace-nowrap">人力配置</th>
                  <th className="py-3 px-3.5 font-medium whitespace-nowrap">杠杆与周期</th>
                  <th className="py-3 px-3.5 font-medium whitespace-nowrap">收入核算 / 并表</th>
                  <th className="py-3 px-3.5 font-medium whitespace-nowrap">国资合规风险</th>
                  <th className="py-3 px-4 font-medium text-right whitespace-nowrap">穿透详情</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E1DA]">
                {filteredModels.map((model) => {
                  const isSelected = selectedModel?.id === model.id;
                  return (
                    <tr
                      key={model.id}
                      onClick={() => setSelectedModel(model)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#1B365D]/[0.04]' : 'hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <td className="py-4 px-4 align-top max-w-sm">
                        <div className="flex items-center gap-2 text-xs text-[#64748B] mb-0.5">
                          <span className="font-mono tabular-nums font-medium text-[#1B365D]">
                            {model.code}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {model.applicableTracks
                              .map((t) => INDUSTRY_LABELS[t].slice(0, 4))
                              .join(' / ')}
                          </span>
                        </div>
                        <div className="font-semibold text-[#141E2B] text-sm">
                          {model.name}
                        </div>
                        <div className="text-xs text-[#64748B] mt-0.5 line-clamp-1">
                          {model.subtitle}
                        </div>
                      </td>
                      <td className="py-4 px-3.5 align-top whitespace-nowrap font-mono tabular-nums text-xs text-[#141E2B]">
                        {model.capitalBand}
                      </td>
                      <td className="py-4 px-3.5 align-top whitespace-nowrap text-xs text-[#334155]">
                        {model.headcountBand}
                      </td>
                      <td className="py-4 px-3.5 align-top whitespace-nowrap text-xs">
                        <div className="font-mono tabular-nums font-medium text-[#1B365D]">
                          {model.leverageRatio}
                        </div>
                        <div className="text-[#64748B] mt-0.5">{model.cycleMonths}</div>
                      </td>
                      <td className="py-4 px-3.5 align-top whitespace-nowrap text-xs">
                        <div className="text-[#141E2B]">{model.revenueAccounting}</div>
                        <div className="text-[#64748B] mt-0.5">
                          {model.consolidationImpact}
                        </div>
                      </td>
                      <td className="py-4 px-3.5 align-top whitespace-nowrap text-xs">
                        <span className={getRiskStyle(model.soeRiskLevel)}>
                          {model.soeRiskLevel}
                        </span>
                      </td>
                      <td className="py-4 px-4 align-top text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#1B365D]">
                          <span>四流拆解</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Slide-over Detail Drawer for Selected Light-Asset Model */}
      {selectedModel && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-[#141E2B]/35"
          onClick={() => setSelectedModel(null)}
        >
          <aside
            className="w-full max-w-2xl bg-white h-full overflow-y-auto border-l border-[#E4E1DA] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-[#E4E1DA] px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#64748B] mb-1">
                  <span className="font-mono tabular-nums font-semibold text-[#1B365D]">
                    {selectedModel.code}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedModel.capitalBand}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedModel.consolidationImpact}</span>
                </div>
                <h2 className="font-editorial text-xl font-bold text-[#141E2B]">
                  {selectedModel.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="关闭详情抽屉"
                onClick={() => setSelectedModel(null)}
                className="p-1.5 text-[#64748B] hover:text-[#141E2B] rounded hover:bg-[#F7F6F2] transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1">
              <p className="text-sm text-[#334155] leading-relaxed">
                {selectedModel.coreLogic}
              </p>

              {/* Key Quantitative Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 border border-[#E4E1DA] rounded divide-y sm:divide-y-0 sm:divide-x divide-[#E4E1DA] bg-[#FAF9F6] text-xs">
                <div className="p-3">
                  <div className="text-[#64748B]">资金杠杆</div>
                  <div className="font-mono tabular-nums font-semibold text-[#1B365D] mt-1">
                    {selectedModel.leverageRatio}
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-[#64748B]">回款周期</div>
                  <div className="font-mono tabular-nums font-semibold text-[#141E2B] mt-1">
                    {selectedModel.cycleMonths}
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-[#64748B]">人力要求</div>
                  <div className="font-semibold text-[#141E2B] mt-1">
                    {selectedModel.headcountBand}
                  </div>
                </div>
                <div className="p-3">
                  <div className="text-[#64748B]">核算方式</div>
                  <div className="font-semibold text-[#141E2B] mt-1">
                    {selectedModel.revenueAccounting}
                  </div>
                </div>
              </div>

              {/* Four-Flow Architecture Diagram */}
              <div>
                <h3 className="font-editorial text-base font-bold text-[#141E2B] mb-3">
                  四流闭环运转结构（业务 · 资金 · 货权 · 合同）
                </h3>
                <div className="divide-y divide-[#E4E1DA] border border-[#E4E1DA] rounded">
                  {(
                    [
                      { label: '01 业务流', text: selectedModel.fourFlows.business },
                      { label: '02 资金流', text: selectedModel.fourFlows.fund },
                      { label: '03 货权流', text: selectedModel.fourFlows.goods },
                      { label: '04 合同流', text: selectedModel.fourFlows.contract },
                    ] as const
                  ).map((flow) => (
                    <div key={flow.label} className="p-3.5 flex flex-col sm:flex-row gap-2 sm:gap-4 text-sm">
                      <span className="font-mono tabular-nums text-xs font-semibold text-[#1B365D] w-20 shrink-0 pt-0.5">
                        {flow.label}
                      </span>
                      <span className="text-[#334155] leading-relaxed">{flow.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SASAC Redlines */}
              <div className="p-4 rounded border border-[#B91C1C]/25 bg-[#FEF2F2]/40">
                <div className="flex items-center gap-2 mb-2.5">
                  <ShieldAlert className="w-4 h-4 text-[#B91C1C]" />
                  <h3 className="text-sm font-semibold text-[#991B1B]">
                    国资合规红线校验要点
                  </h3>
                </div>
                <ul className="space-y-2 text-xs sm:text-[13px] text-[#334155] leading-relaxed">
                  {selectedModel.sasacRedlines.map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="font-mono text-[#B91C1C] shrink-0">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Lean Team Division */}
              <div>
                <h3 className="font-editorial text-base font-bold text-[#141E2B] mb-2.5">
                  精简团队最小分工
                </h3>
                <ul className="space-y-2 text-sm text-[#334155] leading-relaxed">
                  {selectedModel.leanTeamDivision.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="font-mono text-xs text-[#64748B] mt-0.5 shrink-0">
                        —
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Real-world Case Reference */}
              <div className="p-4 rounded bg-[#F7F6F2] border border-[#E4E1DA]">
                <div className="text-xs font-semibold text-[#1B365D] mb-1.5">
                  同类国资四级平台实操参考案例
                </div>
                <p className="text-xs sm:text-[13px] text-[#334155] leading-relaxed">
                  {selectedModel.typicalCase}
                </p>
              </div>
            </div>

            {/* Sticky Drawer Footer CTA */}
            <div className="sticky bottom-0 bg-white border-t border-[#E4E1DA] px-6 py-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedModel(null)}
                className="px-4 py-2 text-xs font-medium text-[#475569] border border-[#E4E1DA] rounded hover:bg-[#F7F6F2] transition-colors whitespace-nowrap"
              >
                返回对比矩阵
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedModel;
                  setSelectedModel(null);
                  onSendToAdvisor(
                    target.advisorPromptSeed,
                    target.applicableTracks[0] || 'agriculture'
                  );
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#1B365D] rounded hover:bg-[#132847] transition-colors whitespace-nowrap"
              >
                <span>带入 AI 顾问定制合同与治理条款</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};
