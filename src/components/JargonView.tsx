import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { JARGON_CATEGORY_LABELS, JARGON_DICTIONARY } from '../data/domainData';
import { DictionaryEntry, IndustryTrack } from '../types';

interface JargonViewProps {
  onAskAdvisor: (prompt: string, industry?: IndustryTrack) => void;
}

export const JargonView: React.FC<JargonViewProps> = ({ onAskAdvisor }) => {
  const [category, setCategory] = useState<DictionaryEntry['category'] | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return JARGON_DICTIONARY.filter((item) => {
      if (category !== 'all' && item.category !== category) return false;
      if (
        q &&
        !`${item.term} ${item.alias} ${item.plainExplanation} ${item.howToUseLeverage} ${item.riskTrap}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [category, search]);

  const mapCategoryToIndustry = (cat: DictionaryEntry['category']): IndustryTrack => {
    if (cat === 'cross_industry') return 'compute_ai';
    return 'general_trade';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="pb-5 border-b border-[#E4E1DA]">
        <div className="text-xs text-[#64748B] mb-1.5">
          非专业精简团队速查手册 · 听懂银行与跨界行话 · 现场谈判直接照着问
        </div>
        <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-[#141E2B]">
          银行授信、供应链与跨界项目黑话白话词典
        </h1>
        <p className="mt-2 text-sm text-[#475569] max-w-3xl leading-relaxed">
          把银行客户经理、供应链贸易商、算力集成商和地方园区嘴里的高频术语翻译成大白话，标明“怎么借它用足杠杆”“隐藏红线在哪”以及“见面直接怎么反问”。
        </p>
      </section>

      {/* Filter & Search Bar */}
      <section className="bg-white border border-[#E4E1DA] rounded-md p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: '全部术语' },
              { id: 'bank_leverage', label: '银行授信与资金杠杆' },
              { id: 'supply_chain', label: '供应链与国资风控' },
              { id: 'cross_industry', label: '跨界（算力 / 农业 / 可研）' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                category === tab.id
                  ? 'bg-[#1B365D] text-white'
                  : 'text-[#475569] hover:bg-[#F2F0EA] hover:text-[#141E2B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索敞口、保理、HBM、菌棒、可研..."
            className="w-full h-9 pl-9 pr-3 text-xs sm:text-[13px] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
          />
        </div>
      </section>

      {/* Dictionary Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#E4E1DA] rounded-md p-10 text-center space-y-3">
          <p className="text-sm text-[#475569]">未找到匹配的术语词条。</p>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCategory('all');
            }}
            className="px-4 py-2 text-xs font-medium text-[#1B365D] border border-[#1B365D]/30 rounded hover:bg-[#1B365D]/5 transition-colors"
          >
            重置搜索
          </button>
        </div>
      ) : (
        <section className="space-y-4">
          {filtered.map((entry) => (
            <article
              key={entry.id}
              className="bg-white border border-[#E4E1DA] rounded-md p-5 sm:p-6 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3.5 border-b border-[#F0EDE6]">
                <div>
                  <div className="text-xs text-[#64748B] mb-1">
                    {JARGON_CATEGORY_LABELS[entry.category]} · 通俗理解：{entry.alias}
                  </div>
                  <h2 className="font-editorial text-lg font-bold text-[#141E2B]">
                    {entry.term}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onAskAdvisor(entry.advisorPrompt, mapCategoryToIndustry(entry.category))
                  }
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#1B365D] border border-[#1B365D]/30 rounded hover:bg-[#1B365D]/5 transition-colors whitespace-nowrap shrink-0 self-start"
                >
                  <span>请顾问手把手教我怎么用</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs sm:text-[13px] leading-relaxed">
                <div className="space-y-1">
                  <div className="font-semibold text-[#141E2B]">大白话解释</div>
                  <p className="text-[#334155]">{entry.plainExplanation}</p>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-[#166534]">怎么用它撬动杠杆 / 降本</div>
                  <p className="text-[#334155]">{entry.howToUseLeverage}</p>
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-[#B91C1C]">最容易踩的坑与红线</div>
                  <p className="text-[#334155]">{entry.riskTrap}</p>
                </div>
              </div>

              <div className="p-3.5 rounded bg-[#FAF9F6] border border-[#E4E1DA] text-xs sm:text-[13px] text-[#141E2B] leading-relaxed">
                <span className="font-semibold text-[#1B365D] mr-2">
                  见面谈判时直接这么问
                </span>
                <span>{entry.whatToAsk}</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};
