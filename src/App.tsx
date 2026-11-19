import React, { useEffect, useMemo, useState } from 'react';
import {
  SlidersHorizontal,
  MessageSquareText,
  Table2,
  ShieldCheck,
  BookOpen,
  Bookmark,
  Menu,
  X,
  Plus,
  Download,
} from 'lucide-react';
import {
  DEFAULT_SANDBOX_CONFIG,
  INITIAL_TIER4_SOE_DIAGNOSIS,
} from './data/domainData';
import {
  AdvisoryTopic,
  AuditItemState,
  ChatTurn,
  EntityType,
  GuidanceMode,
  IndustryTrack,
  SandboxConfig,
  SavedMemo,
  StructuredAdvisoryReport,
  WorkbenchTab,
} from './types';
import { SandboxView } from './components/SandboxView';
import { AdvisorView } from './components/AdvisorView';
import { MatrixView } from './components/MatrixView';
import { ComplianceView } from './components/ComplianceView';
import { JargonView } from './components/JargonView';
import { MemoModal } from './components/MemoModal';
import { downloadMarkdownFile, reportToMarkdown } from './utils/exportMarkdown';

const STORAGE_KEYS = {
  sandbox: 'jw_workbench_sandbox_v1',
  audit: 'jw_workbench_audit_v1',
  memos: 'jw_workbench_memos_v1',
  turns: 'jw_workbench_turns_v1',
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const NAV_ITEMS: {
  id: WorkbenchTab;
  label: string;
  breadcrumb: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'sandbox',
    label: '路线卡点与盘活沙盘',
    breadcrumb: '路线卡点与资产盘活沙盘',
    icon: SlidersHorizontal,
  },
  {
    id: 'advisor',
    label: 'AI 专题引导顾问',
    breadcrumb: '交互式 AI 专题引导顾问',
    icon: MessageSquareText,
  },
  {
    id: 'matrix',
    label: '轻资产方案对比矩阵',
    breadcrumb: '轻资产投融与贸易矩阵',
    icon: Table2,
  },
  {
    id: 'compliance',
    label: '涉外合规风控自检库',
    breadcrumb: '国企 / 民营涉外合规库',
    icon: ShieldCheck,
  },
  {
    id: 'jargon',
    label: '银行与跨界黑话词典',
    breadcrumb: '银行 / 供应链 / 跨界黑话速查',
    icon: BookOpen,
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('sandbox');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Persisted states
  const [sandboxConfig, setSandboxConfig] = useState<SandboxConfig>(() =>
    loadJson(STORAGE_KEYS.sandbox, DEFAULT_SANDBOX_CONFIG)
  );
  const [auditStates, setAuditStates] = useState<Record<string, AuditItemState>>(() =>
    loadJson(STORAGE_KEYS.audit, {
      audit_01: { status: 'compliant', note: '已明确严禁关联方指定上下游与原地货转' },
      audit_09: { status: 'high_risk', note: '目前人员仅5人，印章与网银复核岗位边界尚需进一步切分' },
    })
  );
  const [savedMemos, setSavedMemos] = useState<SavedMemo[]>(() =>
    loadJson(STORAGE_KEYS.memos, [])
  );
  const [advisorTurns, setAdvisorTurns] = useState<ChatTurn[]>(() =>
    loadJson(STORAGE_KEYS.turns, [])
  );

  // Advisor context states (defaults to beginner-guided coaching mode!)
  const [advisorEntity, setAdvisorEntity] = useState<EntityType>('soe_tier4');
  const [advisorIndustry, setAdvisorIndustry] = useState<IndustryTrack>('agriculture');
  const [advisorTopic, setAdvisorTopic] = useState<AdvisoryTopic>('asset_revitalization');
  const [guidanceMode, setGuidanceMode] = useState<GuidanceMode>('beginner_guided');
  const [pendingAdvisorPrompt, setPendingAdvisorPrompt] = useState<string | null>(null);

  // Cross-module links
  const [highlightedModelId, setHighlightedModelId] = useState<string | null>(null);
  const [viewingMemo, setViewingMemo] = useState<SavedMemo | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.sandbox, JSON.stringify(sandboxConfig));
    } catch {
      // ignore quota errors
    }
  }, [sandboxConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.audit, JSON.stringify(auditStates));
    } catch {
      // ignore quota errors
    }
  }, [auditStates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.memos, JSON.stringify(savedMemos));
    } catch {
      // ignore quota errors
    }
  }, [savedMemos]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.turns, JSON.stringify(advisorTurns.slice(-16)));
    } catch {
      // ignore quota errors
    }
  }, [advisorTurns]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 2400);
  };

  const savedMemoHeadlines = useMemo(
    () => new Set(savedMemos.map((m) => m.report.headline)),
    [savedMemos]
  );

  const handleSaveMemo = (
    report: StructuredAdvisoryReport,
    source: SavedMemo['source'],
    entity: EntityType = 'soe_tier4',
    ind: IndustryTrack = sandboxConfig.industry
  ) => {
    if (savedMemoHeadlines.has(report.headline)) return;
    const nextMemo: SavedMemo = {
      id: `memo_${Date.now()}`,
      title: report.headline,
      createdAt: new Date().toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      source,
      entityType: entity,
      industry: ind,
      report,
    };
    setSavedMemos((prev) => [nextMemo, ...prev].slice(0, 30));
    showToast('已归档至左侧诊断备忘录');
  };

  const handleDeleteMemo = (id: string) => {
    setSavedMemos((prev) => prev.filter((m) => m.id !== id));
    showToast('已删除该条备忘录');
  };

  const handleSendToAdvisor = (prompt: string, ind?: IndustryTrack) => {
    if (ind) setAdvisorIndustry(ind);
    setPendingAdvisorPrompt(prompt);
    setActiveTab('advisor');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInspectModelInMatrix = (modelId: string) => {
    setHighlightedModelId(modelId);
    setActiveTab('matrix');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenJargon = () => {
    setActiveTab('jargon');
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickExportCurrent = () => {
    const latestAdvisorReport = [...advisorTurns]
      .reverse()
      .find((t) => t.role === 'advisor' && t.report)?.report;

    const targetReport =
      activeTab === 'advisor' && latestAdvisorReport
        ? latestAdvisorReport
        : INITIAL_TIER4_SOE_DIAGNOSIS;

    const md = reportToMarkdown(targetReport, {
      entityType: activeTab === 'advisor' ? advisorEntity : 'soe_tier4',
      industry: activeTab === 'advisor' ? advisorIndustry : sandboxConfig.industry,
    });
    downloadMarkdownFile(`${targetReport.headline.slice(0, 24)}.md`, md);
    showToast('已导出 Markdown 研判汇报稿');
  };

  const currentNav = NAV_ITEMS.find((n) => n.id === activeTab) || NAV_ITEMS[0];

  const SidebarContent = (
    <div className="flex flex-col h-full bg-[#FBFBF9] border-r border-[#E4E1DA]">
      {/* Brand Wordmark (single clean line) */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-[#E4E1DA] shrink-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab('sandbox');
            setMobileMenuOpen(false);
          }}
          className="font-editorial text-lg font-bold tracking-tight text-[#141E2B] whitespace-nowrap shrink-0"
        >
          经纬研策
        </button>
        <button
          type="button"
          aria-label="关闭导航"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1 text-[#64748B] hover:text-[#141E2B]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Primary Workspace Navigation */}
      <nav className="p-3 space-y-1">
        <div className="px-2.5 pt-1 pb-2 text-[11px] font-medium text-[#64748B]">
          核心实操工作台
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[#1B365D] text-white'
                  : 'text-[#334155] hover:bg-[#EFECE5] hover:text-[#141E2B]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Saved Memos Archive */}
      <div className="flex-1 overflow-y-auto px-3 pt-4 pb-6 border-t border-[#E4E1DA] mt-2">
        <div className="px-2.5 pb-2.5 flex items-center justify-between text-[11px] font-medium text-[#64748B]">
          <span className="inline-flex items-center gap-1.5">
            <Bookmark className="w-3.5 h-3.5" />
            <span>已存诊断备忘录</span>
          </span>
          <span className="font-mono tabular-nums">{savedMemos.length}</span>
        </div>

        {savedMemos.length === 0 ? (
          <div className="px-2.5 py-3 text-xs text-[#64748B] leading-relaxed">
            暂无归档记录。在任意研判报告右上角点击“保存备忘录”，即可沉淀为长期复盘档案。
          </div>
        ) : (
          <div className="space-y-1">
            {savedMemos.map((memo) => (
              <button
                key={memo.id}
                type="button"
                onClick={() => {
                  setViewingMemo(memo);
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-2 rounded hover:bg-[#EFECE5] transition-colors"
              >
                <div className="text-xs font-medium text-[#141E2B] line-clamp-2 leading-snug">
                  {memo.title}
                </div>
                <div className="mt-1 font-mono tabular-nums text-[11px] text-[#64748B]">
                  {memo.createdAt}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quiet Footer */}
      <div className="px-5 py-3.5 border-t border-[#E4E1DA] text-[11px] text-[#64748B] shrink-0">
        外贸 · 跨境投融 · 国资企管实操
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#141E2B] flex">
      {/* Desktop Fixed Sidebar (256px) */}
      <aside className="hidden lg:block w-64 shrink-0 fixed inset-y-0 left-0 z-30">
        {SidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden flex bg-[#141E2B]/35"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="w-64 h-full" onClick={(e) => e.stopPropagation()}>
            {SidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 lg:pl-64 min-w-0 flex flex-col min-h-screen">
        {/* Top Bar Contract: Breadcrumb on left + 1-2 single-line primary actions on right */}
        <header className="sticky top-0 z-20 h-14 bg-[#F7F6F2]/95 backdrop-blur-xs border-b border-[#E4E1DA] px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="打开工作台导航"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-[#334155] hover:text-[#141E2B] rounded hover:bg-[#EFECE5]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0 truncate">
              <span className="text-[#64748B] hidden sm:inline whitespace-nowrap">
                经纬研策工作台
              </span>
              <span className="text-[#CBD5E1] hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-[#141E2B] truncate">
                {currentNav.breadcrumb}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleQuickExportCurrent}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#334155] bg-white border border-[#E4E1DA] rounded hover:bg-[#F2F0EA] transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出研判稿</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('advisor');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#1B365D] rounded hover:bg-[#132847] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>发起专题诊断</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 w-full max-w-[1220px] mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {activeTab === 'sandbox' && (
            <SandboxView
              config={sandboxConfig}
              onChangeConfig={setSandboxConfig}
              onInspectModelInMatrix={handleInspectModelInMatrix}
              onSendToAdvisor={handleSendToAdvisor}
              onOpenJargon={handleOpenJargon}
              onSaveMemo={(report) =>
                handleSaveMemo(report, 'sandbox', 'soe_tier4', sandboxConfig.industry)
              }
              savedMemoHeadlines={savedMemoHeadlines}
            />
          )}

          {activeTab === 'advisor' && (
            <AdvisorView
              turns={advisorTurns}
              onChangeTurns={setAdvisorTurns}
              entityType={advisorEntity}
              onChangeEntityType={setAdvisorEntity}
              industry={advisorIndustry}
              onChangeIndustry={setAdvisorIndustry}
              topic={advisorTopic}
              onChangeTopic={setAdvisorTopic}
              guidanceMode={guidanceMode}
              onChangeGuidanceMode={setGuidanceMode}
              pendingPrompt={pendingAdvisorPrompt}
              onClearPendingPrompt={() => setPendingAdvisorPrompt(null)}
              onOpenJargon={handleOpenJargon}
              onSaveMemo={(report, src, ent, ind) =>
                handleSaveMemo(report, src, ent, ind)
              }
              savedMemoHeadlines={savedMemoHeadlines}
            />
          )}

          {activeTab === 'matrix' && (
            <MatrixView
              highlightedModelId={highlightedModelId}
              onClearHighlightedModel={() => setHighlightedModelId(null)}
              onSendToAdvisor={handleSendToAdvisor}
            />
          )}

          {activeTab === 'compliance' && (
            <ComplianceView
              auditStates={auditStates}
              onUpdateAuditState={(id, next) =>
                setAuditStates((prev) => ({ ...prev, [id]: next }))
              }
              onResetAuditStates={() => setAuditStates({})}
              onSaveMemo={(report, src, ent) =>
                handleSaveMemo(report, src, ent, sandboxConfig.industry)
              }
              onFollowUpInAdvisor={(prompt) => handleSendToAdvisor(prompt)}
              savedMemoHeadlines={savedMemoHeadlines}
            />
          )}

          {activeTab === 'jargon' && (
            <JargonView onAskAdvisor={handleSendToAdvisor} />
          )}
        </main>
      </div>

      {/* Saved Memo Modal */}
      <MemoModal
        memo={viewingMemo}
        onClose={() => setViewingMemo(null)}
        onDelete={handleDeleteMemo}
        onFollowUpInAdvisor={(prompt) => handleSendToAdvisor(prompt)}
      />

      {/* Completion Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded bg-[#141E2B] text-white text-xs font-medium shadow-md"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
