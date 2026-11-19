import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Download,
  FilePlus2,
  FileSearch,
  FileText,
  FileUp,
  FolderKanban,
  Info,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  ChevronRight,
  Files,
} from 'lucide-react';
import { INDUSTRY_LABELS } from '../data/domainData';
import {
  FeasibilityDraftInput,
  FeasibilityDraftReport,
  FeasibilityProject,
  FeasibilityProjectStage,
  FeasibilityReviewReport,
  IndustryTrack,
  ReportAudience,
} from '../types';
import {
  AUDIENCE_LABELS,
  computeFeasibilityModel,
  FEASIBILITY_PRESETS,
  SAMPLE_FLAWED_FEASIBILITY_TEXT,
} from '../utils/feasibilityModel';
import {
  downloadMarkdownFile,
  feasibilityDraftToMarkdown,
  feasibilityReviewToMarkdown,
} from '../utils/exportMarkdown';

type SubMode = 'portfolio' | 'detail' | 'review';

interface UploadedFileState {
  name: string;
  sizeKb: number;
  kind: 'pdf' | 'text';
  pdfBase64?: string;
  textContent?: string;
}

const PROJECTS_STORAGE_KEY = 'jw_feasibility_projects_v1';

const STAGE_LABELS: Record<FeasibilityProjectStage, string> = {
  modeling: '测算建模中',
  draft_ready: '已出可研初稿',
  under_review: '交叉审改中',
  committee_ready: '具备上会条件',
};

const SOURCE_LABELS: Record<FeasibilityProject['sourceType'], string> = {
  preset: '模板建立',
  manual: '新建自建',
  uploaded_converted: '上传可研转化',
};

function nowLabel(): string {
  return new Date().toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function nextProjectCode(existing: FeasibilityProject[]): string {
  let maxNum = existing.length;
  existing.forEach((p) => {
    const match = p.code.match(/(\d+)$/);
    if (match) {
      const n = Number(match[1]);
      if (n > maxNum) maxNum = n;
    }
  });
  return `FS-${String(maxNum + 1).padStart(3, '0')}`;
}

function createBlankInput(): FeasibilityDraftInput {
  return {
    projectName: '未命名新建产业可研项目',
    location: '待填实施区域',
    industry: 'policy_infra',
    audience: 'joint_committee',
    projectScale: '请填写项目总规模与分期建设计划（建议采用总体规划、分期试点思路）',
    policyContext: '请填写契合的国家/地方最新产业政策、补贴口径与国资监管要求',
    businessModelNote: '请填写商业闭环、下游订单消纳/渠道嫁接及核心风控安全阀',
    totalCapexWan: 1000,
    ownEquityWan: 200,
    financingRatePct: 4.2,
    annualRevenueWan: 620,
    annualOpexWan: 310,
    utilizationPct: 75,
    horizonYears: 6,
    rampUpYear1Pct: 70,
    keyDriverLabel: '核心产能/业务利用率',
  };
}

function buildInitialProjects(): FeasibilityProject[] {
  const ts = nowLabel();
  return FEASIBILITY_PRESETS.map((preset, idx) => ({
    id: `proj_seed_${idx + 1}`,
    code: `FS-${String(idx + 1).padStart(3, '0')}`,
    stage: 'modeling',
    sourceType: 'preset',
    createdAt: ts,
    updatedAt: ts,
    input: { ...preset.input },
    draft: null,
    review: null,
  }));
}

function loadInitialProjects(): FeasibilityProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return buildInitialProjects();
    const parsed = JSON.parse(raw) as FeasibilityProject[];
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return buildInitialProjects();
  } catch {
    return buildInitialProjects();
  }
}

export const FeasibilityAssistant: React.FC = () => {
  const [projects, setProjects] = useState<FeasibilityProject[]>(loadInitialProjects);
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    const list = loadInitialProjects();
    return list[0]?.id || '';
  });
  const [subMode, setSubMode] = useState<SubMode>('portfolio');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Portfolio table filters & sort
  const [portfolioSearch, setPortfolioSearch] = useState('');
  const [portfolioIndustry, setPortfolioIndustry] = useState<IndustryTrack | 'all'>('all');
  const [portfolioStage, setPortfolioStage] = useState<FeasibilityProjectStage | 'all'>('all');
  const [portfolioSort, setPortfolioSort] = useState<'updated' | 'irr_desc' | 'capex_asc'>(
    'updated'
  );

  // Detail view UI state
  const [showMathGuide, setShowMathGuide] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftCopied, setDraftCopied] = useState(false);

  // Review / Upload view state
  const [reviewAudience, setReviewAudience] = useState<ReportAudience>('joint_committee');
  const [reviewIndustry, setReviewIndustry] = useState<IndustryTrack>('compute_ai');
  const [reviewText, setReviewText] = useState('');
  const [reviewFocusNotes, setReviewFocusNotes] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFileState | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [reviewResult, setReviewResult] = useState<FeasibilityReviewReport | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewCopied, setReviewCopied] = useState(false);
  const [copiedRewriteIdx, setCopiedRewriteIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    } catch {
      // ignore storage quota errors
    }
  }, [projects]);

  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0] || null;
  }, [projects, activeProjectId]);

  const activeFinancials = useMemo(() => {
    if (!activeProject) return null;
    return computeFeasibilityModel(activeProject.input);
  }, [activeProject]);

  // Compute live financial summaries for every project in the total portfolio table
  const portfolioRows = useMemo(() => {
    const q = portfolioSearch.trim().toLowerCase();
    const enriched = projects.map((proj) => ({
      project: proj,
      financials: computeFeasibilityModel(proj.input),
    }));

    const filtered = enriched.filter(({ project }) => {
      if (portfolioIndustry !== 'all' && project.input.industry !== portfolioIndustry) {
        return false;
      }
      if (portfolioStage !== 'all' && project.stage !== portfolioStage) {
        return false;
      }
      if (
        q &&
        !`${project.code} ${project.input.projectName} ${project.input.location} ${project.input.projectScale}`
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });

    if (portfolioSort === 'irr_desc') {
      filtered.sort(
        (a, b) => (b.financials.baseIrrPct ?? -999) - (a.financials.baseIrrPct ?? -999)
      );
    } else if (portfolioSort === 'capex_asc') {
      filtered.sort((a, b) => a.project.input.totalCapexWan - b.project.input.totalCapexWan);
    }

    return filtered;
  }, [projects, portfolioSearch, portfolioIndustry, portfolioStage, portfolioSort]);

  const portfolioTotals = useMemo(() => {
    const totalCapex = projects.reduce((sum, p) => sum + p.input.totalCapexWan, 0);
    const totalEquity = projects.reduce((sum, p) => sum + p.input.ownEquityWan, 0);
    const draftedCount = projects.filter((p) => !!p.draft).length;
    const reviewedCount = projects.filter((p) => !!p.review).length;
    return {
      count: projects.length,
      totalCapex,
      totalEquity,
      draftedCount,
      reviewedCount,
    };
  }, [projects]);

  const flashBanner = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((cur) => (cur === msg ? null : cur));
    }, 3200);
  };

  // --- Portfolio CRUD Actions ---
  const handleCreateNewProject = (fromPresetId?: string) => {
    const preset = fromPresetId
      ? FEASIBILITY_PRESETS.find((p) => p.id === fromPresetId)
      : null;
    const ts = nowLabel();
    const newProj: FeasibilityProject = {
      id: `proj_${Date.now()}`,
      code: nextProjectCode(projects),
      stage: 'modeling',
      sourceType: preset ? 'preset' : 'manual',
      createdAt: ts,
      updatedAt: ts,
      input: preset ? { ...preset.input } : createBlankInput(),
      draft: null,
      review: null,
    };
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setDraftError(null);
    setSubMode('detail');
    flashBanner(`已新建可研项目 ${newProj.code}，当前所有修改将自动归档至该项目`);
  };

  const handleDuplicateProject = (source: FeasibilityProject) => {
    const ts = nowLabel();
    const copyProj: FeasibilityProject = {
      ...source,
      id: `proj_${Date.now()}`,
      code: nextProjectCode(projects),
      stage: 'modeling',
      sourceType: 'manual',
      createdAt: ts,
      updatedAt: ts,
      input: {
        ...source.input,
        projectName: `${source.input.projectName}（副本）`,
      },
      draft: null,
    };
    setProjects((prev) => [copyProj, ...prev]);
    setActiveProjectId(copyProj.id);
    setSubMode('detail');
    flashBanner(`已复制生成新项目 ${copyProj.code}`);
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (activeProjectId === id) {
        setActiveProjectId(next[0]?.id || '');
      }
      return next;
    });
    flashBanner('已从项目总表中移除该项目');
  };

  const updateActiveProject = (
    updater: (prev: FeasibilityProject) => FeasibilityProject
  ) => {
    if (!activeProject) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProject.id ? { ...updater(p), updatedAt: nowLabel() } : p
      )
    );
  };

  const updateActiveInput = <K extends keyof FeasibilityDraftInput>(
    field: K,
    value: FeasibilityDraftInput[K]
  ) => {
    updateActiveProject((proj) => ({
      ...proj,
      input: { ...proj.input, [field]: value },
    }));
  };

  const updateActiveNum = (field: keyof FeasibilityDraftInput, raw: string) => {
    const val = Number(raw);
    if (Number.isNaN(val)) return;
    updateActiveInput(field, val as never);
  };

  // --- Draft Generation for Active Project ---
  const handleGenerateDraft = async () => {
    if (!activeProject || !activeFinancials) return;
    if (!activeProject.input.projectName.trim()) {
      setDraftError('请填写项目名称后再生成可研初稿。');
      return;
    }
    setIsDrafting(true);
    setDraftError(null);
    try {
      const resp = await fetch('/api/advisor/feasibility-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: activeProject.input,
          financials: activeFinancials,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.draft) {
        throw new Error(data.error || '生成可研初稿失败，请稍后重试。');
      }
      const nextDraft = data.draft as FeasibilityDraftReport;
      updateActiveProject((proj) => ({
        ...proj,
        draft: nextDraft,
        stage: proj.stage === 'modeling' ? 'draft_ready' : proj.stage,
      }));
      flashBanner(`已为 ${activeProject.code} 生成国企/政府汇报标准初稿并自动入库`);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : '网络请求异常，请重试。');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleSendActiveDraftToReview = () => {
    if (!activeProject || !activeProject.draft || !activeFinancials) return;
    const md = feasibilityDraftToMarkdown(activeProject.draft, activeFinancials);
    setUploadedFile(null);
    setReviewText(md);
    setReviewAudience(activeProject.input.audience);
    setReviewIndustry(activeProject.input.industry);
    setReviewFocusNotes(
      `请针对 ${activeProject.code}《${activeProject.input.projectName}》初稿重点交叉验证数据可信度、政策契合度及领导阅读流畅度`
    );
    setReviewResult(activeProject.review);
    setSubMode('review');
  };

  // --- Upload / Review / One-Click Convert to Managed Project ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);

    const maxBytes = 8 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFileError('文件大小超过 8MB 限制，请压缩 PDF 或直接复制关键章节粘贴到下方文本框。');
      e.target.value = '';
      return;
    }

    const lower = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf');
    const isTextLike =
      file.type.startsWith('text/') ||
      lower.endsWith('.txt') ||
      lower.endsWith('.md') ||
      lower.endsWith('.csv') ||
      lower.endsWith('.json');

    if (lower.endsWith('.doc') || lower.endsWith('.docx')) {
      setFileError(
        'Word（.docx/.doc）建议先在 WPS/Word 中“另存为 PDF”上传，或全选复制正文粘贴至下方文本框（确保表格与数据零乱码）。'
      );
      e.target.value = '';
      return;
    }

    if (!isPdf && !isTextLike) {
      setFileError('暂支持直接上传 PDF、TXT、Markdown（.md）或 CSV 文件，或直接粘贴正文内容。');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    if (isPdf) {
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        setUploadedFile({
          name: file.name,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          kind: 'pdf',
          pdfBase64: base64,
        });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        setUploadedFile({
          name: file.name,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          kind: 'text',
          textContent: text,
        });
        setReviewText(text);
      };
      reader.readAsText(file, 'utf-8');
    }
    e.target.value = '';
  };

  const handleRunReview = async () => {
    const hasPdf = uploadedFile?.kind === 'pdf' && !!uploadedFile.pdfBase64;
    const combinedText = reviewText.trim() || uploadedFile?.textContent?.trim() || '';

    if (!hasPdf && combinedText.length < 20) {
      setReviewError('请先上传 PDF/文本可研报告，或粘贴不少于 20 字的可研草稿内容。');
      return;
    }

    setIsReviewing(true);
    setReviewError(null);
    try {
      const resp = await fetch('/api/advisor/feasibility-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: reviewAudience,
          industry: reviewIndustry,
          fileName: uploadedFile?.name,
          pdfBase64: hasPdf ? uploadedFile.pdfBase64 : undefined,
          documentText: !hasPdf ? combinedText : undefined,
          focusNotes: reviewFocusNotes.trim() || undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.review) {
        throw new Error(data.error || '可研审改请求失败，请重试。');
      }
      setReviewResult(data.review as FeasibilityReviewReport);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : '网络请求异常，请重试。');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleConvertUploadedToProject = async () => {
    const hasPdf = uploadedFile?.kind === 'pdf' && !!uploadedFile.pdfBase64;
    const combinedText = reviewText.trim() || uploadedFile?.textContent?.trim() || '';

    if (!hasPdf && combinedText.length < 20) {
      setReviewError('请先上传 PDF/文本可研文件，或粘贴可研正文后再一键转入项目库管理。');
      return;
    }

    setIsConverting(true);
    setReviewError(null);
    try {
      const resp = await fetch('/api/advisor/feasibility-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: reviewAudience,
          industry: reviewIndustry,
          fileName: uploadedFile?.name,
          pdfBase64: hasPdf ? uploadedFile.pdfBase64 : undefined,
          documentText: !hasPdf ? combinedText : undefined,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.input) {
        throw new Error(data.error || '提取可研参数失败，请稍后重试。');
      }

      const ts = nowLabel();
      const convertedProject: FeasibilityProject = {
        id: `proj_${Date.now()}`,
        code: nextProjectCode(projects),
        stage: reviewResult ? 'under_review' : 'modeling',
        sourceType: 'uploaded_converted',
        sourceFileName: uploadedFile?.name || '粘贴文本导入',
        extractionNotes: data.extractionNotes,
        createdAt: ts,
        updatedAt: ts,
        input: data.input as FeasibilityDraftInput,
        draft: null,
        review: reviewResult,
        originalUploadedText: !hasPdf ? combinedText.slice(0, 8000) : undefined,
      };

      setProjects((prev) => [convertedProject, ...prev]);
      setActiveProjectId(convertedProject.id);
      setSubMode('detail');
      flashBanner(
        `已成功将上传可研转化为项目 ${convertedProject.code} 并入库，可直接调整 IRR 模型或重新生成标准初稿`
      );
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : '转换入库失败，请稍后重试。');
    } finally {
      setIsConverting(false);
    }
  };

  const copyText = async (text: string, onDone: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
      onDone();
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      onDone();
    }
  };

  const verdictColor = (v: '达标稳健' | '临界承压' | '触发红线') => {
    if (v === '达标稳健') return 'text-[#166534] font-semibold';
    if (v === '临界承压') return 'text-[#B45309] font-semibold';
    return 'text-[#B91C1C] font-semibold';
  };

  const stageColor = (st: FeasibilityProjectStage) => {
    if (st === 'committee_ready') return 'text-[#166534] font-semibold';
    if (st === 'draft_ready') return 'text-[#1B365D] font-semibold';
    if (st === 'under_review') return 'text-[#B45309] font-semibold';
    return 'text-[#64748B] font-medium';
  };

  return (
    <div className="space-y-6">
      {/* Top Bar of Feasibility Assistant: 3 Sub-views + Explicit "+ 新建可研项目" CTA */}
      <div className="bg-white border border-[#E4E1DA] rounded-md p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F2F0EA] rounded self-start">
          <button
            type="button"
            onClick={() => setSubMode('portfolio')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              subMode === 'portfolio'
                ? 'bg-[#1B365D] text-white'
                : 'text-[#475569] hover:text-[#141E2B]'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            <span>可研项目总表（{projects.length}）</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!activeProject && projects.length === 0) {
                handleCreateNewProject();
              } else {
                setSubMode('detail');
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              subMode === 'detail'
                ? 'bg-[#1B365D] text-white'
                : 'text-[#475569] hover:text-[#141E2B]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>
              {activeProject ? `当前项目 · ${activeProject.code}` : '项目测算与初稿'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSubMode('review')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              subMode === 'review'
                ? 'bg-[#1B365D] text-white'
                : 'text-[#475569] hover:text-[#141E2B]'
            }`}
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>上传可研审改与一键入库</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSubMode('review')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1B365D] bg-[#FAF9F6] border border-[#E4E1DA] rounded hover:bg-[#F2F0EA] transition-colors whitespace-nowrap"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>上传外部可研转项目</span>
          </button>
          <button
            type="button"
            onClick={() => handleCreateNewProject()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#1B365D] rounded hover:bg-[#132847] transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建可研项目</span>
          </button>
        </div>
      </div>

      {statusBanner && (
        <div
          role="status"
          className="px-4 py-2.5 rounded border border-[#166534]/25 bg-[#F0FDF4] text-xs font-medium text-[#166534] flex items-center justify-between gap-2"
        >
          <span>{statusBanner}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-[11px] underline shrink-0"
          >
            关闭
          </button>
        </div>
      )}

      {/* ================= VIEW 1: MULTI-PROJECT PORTFOLIO MASTER TABLE ================= */}
      {subMode === 'portfolio' && (
        <div className="space-y-6">
          {/* Portfolio Aggregate KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#E4E1DA] rounded-md bg-white divide-y lg:divide-y-0 divide-x divide-[#E4E1DA]">
            <div className="p-4 sm:p-5">
              <div className="text-xs text-[#64748B]">在库管理项目总数</div>
              <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-[#141E2B]">
                {portfolioTotals.count}{' '}
                <span className="text-xs font-sans font-normal text-[#64748B]">个项目</span>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <div className="text-xs text-[#64748B]">在库拟投总规模（CapEx）</div>
              <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-[#141E2B]">
                {portfolioTotals.totalCapex.toLocaleString()}{' '}
                <span className="text-xs font-sans font-normal text-[#64748B]">万元</span>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <div className="text-xs text-[#64748B]">合计四级自有资金占用</div>
              <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-[#1B365D]">
                {portfolioTotals.totalEquity.toLocaleString()}{' '}
                <span className="text-xs font-sans font-normal text-[#64748B]">万元</span>
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <div className="text-xs text-[#64748B]">已成稿 / 已交叉审改</div>
              <div className="mt-1.5 font-mono tabular-nums text-2xl font-semibold text-[#166534]">
                {portfolioTotals.draftedCount}
                <span className="text-sm font-normal text-[#64748B]">
                  {' '}
                  / {portfolioTotals.reviewedCount}
                </span>
              </div>
            </div>
          </div>

          {/* Filter / Search / Sort Toolbar */}
          <div className="bg-white border border-[#E4E1DA] rounded-md p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={portfolioSearch}
                onChange={(e) => setPortfolioSearch(e.target.value)}
                placeholder="按项目编号、名称、区域或规模关键词搜索..."
                className="w-full h-9 pl-9 pr-3 text-xs sm:text-[13px] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="按行业筛选"
                value={portfolioIndustry}
                onChange={(e) => setPortfolioIndustry(e.target.value as IndustryTrack | 'all')}
                className="h-9 px-3 text-xs font-medium text-[#141E2B] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
              >
                <option value="all">全部行业赛道</option>
                {(Object.keys(INDUSTRY_LABELS) as IndustryTrack[]).map((k) => (
                  <option key={k} value={k}>
                    {INDUSTRY_LABELS[k]}
                  </option>
                ))}
              </select>

              <select
                aria-label="按阶段筛选"
                value={portfolioStage}
                onChange={(e) =>
                  setPortfolioStage(e.target.value as FeasibilityProjectStage | 'all')
                }
                className="h-9 px-3 text-xs font-medium text-[#141E2B] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
              >
                <option value="all">全部推进阶段</option>
                {(Object.keys(STAGE_LABELS) as FeasibilityProjectStage[]).map((k) => (
                  <option key={k} value={k}>
                    {STAGE_LABELS[k]}
                  </option>
                ))}
              </select>

              <select
                aria-label="排序方式"
                value={portfolioSort}
                onChange={(e) =>
                  setPortfolioSort(e.target.value as 'updated' | 'irr_desc' | 'capex_asc')
                }
                className="h-9 px-3 text-xs font-medium text-[#141E2B] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
              >
                <option value="updated">按最近更新排序</option>
                <option value="irr_desc">按基准 IRR 由高到低</option>
                <option value="capex_asc">按总投资额由低到高</option>
              </select>
            </div>
          </div>

          {/* High-Density Multi-Project Master Table */}
          <div className="bg-white border border-[#E4E1DA] rounded-md overflow-hidden">
            {portfolioRows.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-sm text-[#475569]">
                  {projects.length === 0
                    ? '当前项目总表为空，您可以新建空白项目或直接上传外部可研一键转入管理。'
                    : '当前筛选条件下暂无匹配的可研项目。'}
                </p>
                <div className="flex items-center justify-center gap-2.5">
                  {projects.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPortfolioSearch('');
                        setPortfolioIndustry('all');
                        setPortfolioStage('all');
                      }}
                      className="px-4 py-2 text-xs font-medium text-[#1B365D] border border-[#1B365D]/30 rounded hover:bg-[#1B365D]/5"
                    >
                      重置筛选条件
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleCreateNewProject()}
                      className="px-4 py-2 text-xs font-medium text-white bg-[#1B365D] rounded hover:bg-[#132847]"
                    >
                      新建第一个可研项目
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F7F6F2] border-b border-[#E4E1DA] text-xs text-[#64748B]">
                      <th className="py-3 px-4 font-medium whitespace-nowrap">
                        编号 / 项目名称与来源
                      </th>
                      <th className="py-3 px-3 font-medium whitespace-nowrap">阶段与文档</th>
                      <th className="py-3 px-3 font-medium text-right whitespace-nowrap">
                        总投资 / 自有
                      </th>
                      <th className="py-3 px-3 font-medium text-right whitespace-nowrap">
                        基准 IRR / 回本
                      </th>
                      <th className="py-3 px-3 font-medium whitespace-nowrap">审慎情景研判</th>
                      <th className="py-3 px-4 font-medium text-right whitespace-nowrap">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4E1DA]">
                    {portfolioRows.map(({ project, financials }) => {
                      const cautiousVerdict =
                        financials.stressScenarios[1]?.verdict || '临界承压';
                      const isCurrent = project.id === activeProject?.id;
                      return (
                        <tr
                          key={project.id}
                          onClick={() => {
                            setActiveProjectId(project.id);
                            setDraftError(null);
                            setSubMode('detail');
                          }}
                          className={`cursor-pointer transition-colors ${
                            isCurrent ? 'bg-[#1B365D]/[0.03]' : 'hover:bg-[#FAF9F6]'
                          }`}
                        >
                          <td className="py-3.5 px-4 align-top max-w-md">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B] mb-0.5">
                              <span className="font-mono tabular-nums font-semibold text-[#1B365D]">
                                {project.code}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>{INDUSTRY_LABELS[project.input.industry]}</span>
                              <span aria-hidden="true">·</span>
                              <span>{SOURCE_LABELS[project.sourceType]}</span>
                            </div>
                            <div className="font-semibold text-[#141E2B] text-sm leading-snug">
                              {project.input.projectName}
                            </div>
                            <div className="text-xs text-[#64748B] mt-0.5 truncate">
                              {project.input.location} · 更新于{' '}
                              <span className="font-mono tabular-nums">{project.updatedAt}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 align-top whitespace-nowrap text-xs">
                            <div className={stageColor(project.stage)}>
                              {STAGE_LABELS[project.stage]}
                            </div>
                            <div className="text-[#64748B] mt-1">
                              {project.draft ? '已出初稿' : '未出初稿'} ·{' '}
                              {project.review ? '含审改单' : '待审改'}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 align-top text-right whitespace-nowrap font-mono tabular-nums text-xs">
                            <div className="font-semibold text-[#141E2B]">
                              {project.input.totalCapexWan.toLocaleString()} 万
                            </div>
                            <div className="text-[#64748B] mt-0.5">
                              自有 {project.input.ownEquityWan.toLocaleString()} 万
                            </div>
                          </td>
                          <td className="py-3.5 px-3 align-top text-right whitespace-nowrap font-mono tabular-nums text-xs">
                            <div
                              className={`font-semibold ${
                                financials.baseIrrPct !== null && financials.baseIrrPct >= 8
                                  ? 'text-[#166534]'
                                  : financials.baseIrrPct !== null && financials.baseIrrPct >= 4
                                  ? 'text-[#B45309]'
                                  : 'text-[#B91C1C]'
                              }`}
                            >
                              {financials.baseIrrPct !== null
                                ? `${financials.baseIrrPct}%`
                                : '未收回'}
                            </div>
                            <div className="text-[#64748B] mt-0.5">
                              {financials.staticPaybackYears !== null
                                ? `${financials.staticPaybackYears} 年回本`
                                : '超测算期'}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 align-top whitespace-nowrap text-xs">
                            <span className={verdictColor(cautiousVerdict)}>
                              {cautiousVerdict}
                            </span>
                            <div className="text-[11px] text-[#64748B] mt-0.5 font-mono tabular-nums">
                              保本率 {financials.breakevenUtilizationPct}%
                            </div>
                          </td>
                          <td
                            className="py-3.5 px-4 align-top text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveProjectId(project.id);
                                  setDraftError(null);
                                  setSubMode('detail');
                                }}
                                className="inline-flex items-center gap-0.5 px-2.5 py-1 text-xs font-medium text-[#1B365D] border border-[#1B365D]/30 rounded hover:bg-[#1B365D]/5 transition-colors"
                              >
                                <span>进入</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="复制为新项目"
                                onClick={() => handleDuplicateProject(project)}
                                className="p-1.5 text-[#64748B] hover:text-[#141E2B] rounded hover:bg-[#F2F0EA]"
                              >
                                <Files className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="删除项目"
                                onClick={() => handleDeleteProject(project.id)}
                                className="p-1.5 text-[#64748B] hover:text-[#B91C1C] rounded hover:bg-[#FEF2F2]"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Quick Create From Industry Templates */}
          <div className="bg-white border border-[#E4E1DA] rounded-md p-5 space-y-3">
            <div className="text-xs font-semibold text-[#141E2B]">
              按国资高频行业模板快速新建独立项目（不覆盖已有项目）
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {FEASIBILITY_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleCreateNewProject(p.id)}
                  className="group p-3.5 rounded border border-[#E4E1DA] bg-[#FAF9F6] hover:bg-white hover:border-[#1B365D]/45 text-left transition-colors flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="text-[11px] font-medium text-[#1B365D]">{p.tag}</div>
                    <div className="text-xs font-semibold text-[#141E2B] mt-1 leading-snug">
                      以此模板新建：{p.label}
                    </div>
                  </div>
                  <FilePlus2 className="w-4 h-4 text-[#64748B] group-hover:text-[#1B365D] shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= VIEW 2: ACTIVE PROJECT DETAIL + IRR + DRAFTING ================= */}
      {subMode === 'detail' && activeProject && activeFinancials && (
        <div className="space-y-6">
          {/* Active Project Context & Fast Project Switcher Bar */}
          <div className="bg-white border border-[#E4E1DA] rounded-md p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setSubMode('portfolio')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#475569] bg-[#FAF9F6] border border-[#E4E1DA] rounded hover:bg-[#F2F0EA] transition-colors whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>返回总表</span>
              </button>

              <select
                aria-label="快速切换当前项目"
                value={activeProject.id}
                onChange={(e) => {
                  setActiveProjectId(e.target.value);
                  setDraftError(null);
                }}
                className="h-8 px-2.5 text-xs font-semibold text-[#141E2B] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D] max-w-xs sm:max-w-md truncate"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.input.projectName}
                  </option>
                ))}
              </select>

              <span className="text-xs text-[#64748B] whitespace-nowrap">
                {SOURCE_LABELS[activeProject.sourceType]}
                {activeProject.sourceFileName ? `（${activeProject.sourceFileName}）` : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                aria-label="更新项目推进阶段"
                value={activeProject.stage}
                onChange={(e) =>
                  updateActiveProject((p) => ({
                    ...p,
                    stage: e.target.value as FeasibilityProjectStage,
                  }))
                }
                className="h-8 px-2.5 text-xs font-medium text-[#1B365D] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
              >
                {(Object.keys(STAGE_LABELS) as FeasibilityProjectStage[]).map((k) => (
                  <option key={k} value={k}>
                    阶段：{STAGE_LABELS[k]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleDuplicateProject(activeProject)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#475569] border border-[#E4E1DA] rounded hover:bg-[#F7F6F2] transition-colors whitespace-nowrap"
              >
                <Files className="w-3.5 h-3.5" />
                <span>复制为新项目</span>
              </button>
            </div>
          </div>

          {/* Extraction Notes Callout (if converted from uploaded document) */}
          {activeProject.extractionNotes && (
            <div className="p-4 rounded-md border border-[#1B365D]/25 bg-[#FAF9F6] text-xs sm:text-[13px] text-[#334155] leading-relaxed">
              <span className="font-semibold text-[#1B365D] mr-2">
                上传可研自动提取说明（建议复核后重新生成标准初稿）
              </span>
              <span>{activeProject.extractionNotes}</span>
            </div>
          )}

          {/* 2-Column Workspace: Guided Form (Left) + Real-time IRR & Regression Model (Right) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left: Guided Industry & Financial Parameters */}
            <div className="xl:col-span-6 bg-white border border-[#E4E1DA] rounded-md p-6 space-y-5">
              <div className="pb-3.5 border-b border-[#E4E1DA] flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-editorial text-base font-bold text-[#141E2B]">
                    项目产业参数与国资汇报口径
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    修改即自动保存至 {activeProject.code}，右侧 IRR 与回归压力表实时重算
                  </p>
                </div>
                <span className="font-mono tabular-nums text-[11px] text-[#64748B] shrink-0">
                  更新 {activeProject.updatedAt}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#475569] mb-1">
                    项目全称
                  </label>
                  <input
                    type="text"
                    value={activeProject.input.projectName}
                    onChange={(e) => updateActiveInput('projectName', e.target.value)}
                    className="w-full h-9 px-3 text-xs sm:text-[13px] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">
                    呈报对象（决定公文行文口径）
                  </label>
                  <select
                    value={activeProject.input.audience}
                    onChange={(e) =>
                      updateActiveInput('audience', e.target.value as ReportAudience)
                    }
                    className="w-full h-9 px-3 text-xs bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                  >
                    {(Object.keys(AUDIENCE_LABELS) as ReportAudience[]).map((k) => (
                      <option key={k} value={k}>
                        {AUDIENCE_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">
                    所属产业赛道
                  </label>
                  <select
                    value={activeProject.input.industry}
                    onChange={(e) =>
                      updateActiveInput('industry', e.target.value as IndustryTrack)
                    }
                    className="w-full h-9 px-3 text-xs bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                  >
                    {(Object.keys(INDUSTRY_LABELS) as IndustryTrack[]).map((k) => (
                      <option key={k} value={k}>
                        {INDUSTRY_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">
                    实施区域 / 市场对接地
                  </label>
                  <input
                    type="text"
                    value={activeProject.input.location}
                    onChange={(e) => updateActiveInput('location', e.target.value)}
                    className="w-full h-9 px-3 text-xs sm:text-[13px] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#475569] mb-1">
                    核心敏感变量名称（如上架率/出货量）
                  </label>
                  <input
                    type="text"
                    value={activeProject.input.keyDriverLabel}
                    onChange={(e) => updateActiveInput('keyDriverLabel', e.target.value)}
                    className="w-full h-9 px-3 text-xs sm:text-[13px] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#475569] mb-1">
                    项目规模与分期策略（建议体现总规分期/轻资产试水）
                  </label>
                  <textarea
                    rows={2}
                    value={activeProject.input.projectScale}
                    onChange={(e) => updateActiveInput('projectScale', e.target.value)}
                    className="w-full p-2.5 text-xs sm:text-[13px] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D] leading-relaxed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#475569] mb-1">
                    最新产业与地方政策依据（农业/算力/绿电/国资要求）
                  </label>
                  <textarea
                    rows={2}
                    value={activeProject.input.policyContext}
                    onChange={(e) => updateActiveInput('policyContext', e.target.value)}
                    className="w-full p-2.5 text-xs sm:text-[13px] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D] leading-relaxed"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#475569] mb-1">
                    商业模式与风控破局思路（消纳订单 / 渠道嫁接 / 防卡脖子）
                  </label>
                  <textarea
                    rows={2}
                    value={activeProject.input.businessModelNote}
                    onChange={(e) => updateActiveInput('businessModelNote', e.target.value)}
                    className="w-full p-2.5 text-xs sm:text-[13px] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D] leading-relaxed"
                  />
                </div>
              </div>

              {/* Financial Structure Inputs */}
              <div className="pt-4 border-t border-[#E4E1DA] space-y-3.5">
                <div className="text-xs font-semibold text-[#1B365D]">
                  成本结构与资金测算输入（自动计算 IRR、回本与回归压力测试）
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#64748B] mb-1">
                      总投资 CapEx（万）
                    </label>
                    <input
                      type="number"
                      min={50}
                      step={50}
                      value={activeProject.input.totalCapexWan}
                      onChange={(e) => updateActiveNum('totalCapexWan', e.target.value)}
                      className="w-full h-9 px-2.5 font-mono tabular-nums text-xs bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748B] mb-1">
                      四级自有出资（万）
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={activeProject.input.ownEquityWan}
                      onChange={(e) => updateActiveNum('ownEquityWan', e.target.value)}
                      className="w-full h-9 px-2.5 font-mono tabular-nums text-xs bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748B] mb-1">
                      融资利率（%/年）
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      step={0.1}
                      value={activeProject.input.financingRatePct}
                      onChange={(e) => updateActiveNum('financingRatePct', e.target.value)}
                      className="w-full h-9 px-2.5 font-mono tabular-nums text-xs bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748B] mb-1">
                      达产年营收（万）
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={activeProject.input.annualRevenueWan}
                      onChange={(e) => updateActiveNum('annualRevenueWan', e.target.value)}
                      className="w-full h-9 px-2.5 font-mono tabular-nums text-xs bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748B] mb-1">
                      达产年成本 OpEx（万）
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={activeProject.input.annualOpexWan}
                      onChange={(e) => updateActiveNum('annualOpexWan', e.target.value)}
                      className="w-full h-9 px-2.5 font-mono tabular-nums text-xs bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748B] mb-1">
                      测算周期（年）
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={15}
                      step={1}
                      value={activeProject.input.horizonYears}
                      onChange={(e) => updateActiveNum('horizonYears', e.target.value)}
                      className="w-full h-9 px-2.5 font-mono tabular-nums text-xs bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748B] mb-1">
                      基准利用率（%）
                    </label>
                    <input
                      type="number"
                      min={20}
                      max={100}
                      step={5}
                      value={activeProject.input.utilizationPct}
                      onChange={(e) => updateActiveNum('utilizationPct', e.target.value)}
                      className="w-full h-9 px-2.5 font-mono tabular-nums text-xs bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#64748B] mb-1">
                      首年爬坡达产（%）
                    </label>
                    <input
                      type="number"
                      min={20}
                      max={100}
                      step={5}
                      value={activeProject.input.rampUpYear1Pct}
                      onChange={(e) => updateActiveNum('rampUpYear1Pct', e.target.value)}
                      className="w-full h-9 px-2.5 font-mono tabular-nums text-xs bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="h-9 px-2.5 flex items-center justify-between bg-[#F7F6F2] border border-[#E4E1DA] rounded text-[11px]">
                      <span className="text-[#64748B]">外部融资</span>
                      <span className="font-mono tabular-nums font-semibold text-[#141E2B]">
                        {activeFinancials.leverageDebtWan}万
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={isDrafting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1B365D] rounded hover:bg-[#132847] disabled:opacity-60 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {isDrafting
                    ? '正在按国企/政府公文标准起草七章可研初稿...'
                    : activeProject.draft
                    ? '按最新参数重新生成标准可研初稿'
                    : '生成国企与政府汇报标准可研初稿'}
                </span>
              </button>
            </div>

            {/* Right: Deterministic IRR, Payback & Regression Stress-Test Workbench */}
            <div className="xl:col-span-6 space-y-5">
              <div className="bg-white border border-[#E4E1DA] rounded-md overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#E4E1DA] flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-editorial text-base font-bold text-[#141E2B]">
                      实时财务测算、IRR 回归测试与回本模型
                    </h3>
                    <p className="text-xs text-[#64748B]">
                      国资立项常用参考：全投资 IRR ≥ 8%（稳健线），审慎情景仍需正回报
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMathGuide((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1B365D] hover:underline whitespace-nowrap shrink-0"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{showMathGuide ? '收起白话教程' : '小白怎么看懂 IRR？'}</span>
                  </button>
                </div>

                {showMathGuide && (
                  <div className="px-5 py-4 bg-[#F7F6F2] border-b border-[#E4E1DA] text-xs text-[#334155] space-y-2 leading-relaxed">
                    <div>
                      <strong className="text-[#141E2B]">1. 什么是 IRR（内部收益率）？</strong>
                      相当于把钱投进项目里的“真实年化复利”。国企融资成本约 3.5%–5%，所以全投资 IRR 至少高于 8% 才算安全；低于 5% 说明赚的钱连利息都覆盖不住。
                    </div>
                    <div>
                      <strong className="text-[#141E2B]">2. 静态回本 vs 动态回本？</strong>
                      静态回本是“几年把投入本金挣回来”；动态回本按 8% 折现考虑了资金时间价值，须落在设备生命周期（如算力卡 4–5 年）内。
                    </div>
                    <div>
                      <strong className="text-[#141E2B]">3. 为什么要做数据回归压力测试？</strong>
                      把营收打折（-15%/-25%）、成本加压（+10%/+15%）反推回本与 IRR，直接找出“保本底线”写入可研，就是最硬的尽职免责护身符。
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x divide-[#E4E1DA]">
                  <div className="p-4">
                    <div className="text-[11px] text-[#64748B]">基准全投资 IRR</div>
                    <div
                      className={`mt-1 font-mono tabular-nums text-xl font-semibold ${
                        activeFinancials.baseIrrPct !== null &&
                        activeFinancials.baseIrrPct >= 8
                          ? 'text-[#166534]'
                          : activeFinancials.baseIrrPct !== null &&
                            activeFinancials.baseIrrPct >= 4
                          ? 'text-[#B45309]'
                          : 'text-[#B91C1C]'
                      }`}
                    >
                      {activeFinancials.baseIrrPct !== null
                        ? `${activeFinancials.baseIrrPct}%`
                        : '未收回'}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-[11px] text-[#64748B]">静态 / 动态回本</div>
                    <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-[#141E2B]">
                      {activeFinancials.staticPaybackYears !== null
                        ? `${activeFinancials.staticPaybackYears}`
                        : '>期'}
                      <span className="text-xs font-normal text-[#64748B]"> / </span>
                      {activeFinancials.dynamicPaybackYears !== null
                        ? `${activeFinancials.dynamicPaybackYears}年`
                        : '>期'}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-[11px] text-[#64748B]">净现值 NPV（8%）</div>
                    <div
                      className={`mt-1 font-mono tabular-nums text-lg font-semibold ${
                        activeFinancials.npvWan >= 0 ? 'text-[#1B365D]' : 'text-[#B91C1C]'
                      }`}
                    >
                      {activeFinancials.npvWan >= 0 ? '+' : ''}
                      {activeFinancials.npvWan.toLocaleString()}万
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-[11px] text-[#64748B]">盈亏保本利用率</div>
                    <div className="mt-1 font-mono tabular-nums text-xl font-semibold text-[#141E2B]">
                      {activeFinancials.breakevenUtilizationPct}%
                    </div>
                  </div>
                </div>
              </div>

              {/* 3-Scenario Stress Test Table */}
              <div className="bg-white border border-[#E4E1DA] rounded-md overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E4E1DA] text-xs font-semibold text-[#141E2B]">
                  三情景压力测试（基准 / 国资审慎底线 / 逆周期极端）
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F7F6F2] border-b border-[#E4E1DA] text-[#64748B]">
                        <th className="py-2.5 px-3.5 font-medium">测试情景</th>
                        <th className="py-2.5 px-3 font-medium text-right">IRR</th>
                        <th className="py-2.5 px-3 font-medium text-right">静态回本</th>
                        <th className="py-2.5 px-3 font-medium text-right">NPV(万)</th>
                        <th className="py-2.5 px-3.5 font-medium text-right">国资研判</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E1DA]">
                      {activeFinancials.stressScenarios.map((row) => (
                        <tr key={row.name}>
                          <td className="py-3 px-3.5 align-top">
                            <div className="font-medium text-[#141E2B]">{row.name}</div>
                            <div className="text-[11px] text-[#64748B] mt-0.5">
                              {row.assumption}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums font-medium text-[#141E2B] align-top whitespace-nowrap">
                            {row.irrPct !== null ? `${row.irrPct}%` : '未收回'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-[#334155] align-top whitespace-nowrap">
                            {row.staticPaybackYears !== null
                              ? `${row.staticPaybackYears} 年`
                              : '超周期'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-[#334155] align-top whitespace-nowrap">
                            {row.npvWan.toLocaleString()}
                          </td>
                          <td className="py-3 px-3.5 text-right align-top whitespace-nowrap">
                            <span className={verdictColor(row.verdict)}>{row.verdict}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Single-Factor Regression Sensitivity Table */}
              <div className="bg-white border border-[#E4E1DA] rounded-md overflow-hidden">
                <div className="px-5 py-3 border-b border-[#E4E1DA] text-xs font-semibold text-[#141E2B]">
                  单因素数据回归敏感性矩阵（测算哪项波动最致命）
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F7F6F2] border-b border-[#E4E1DA] text-[#64748B]">
                        <th className="py-2.5 px-3.5 font-medium">单一变动因子</th>
                        <th className="py-2.5 px-2.5 font-medium text-right">波动</th>
                        <th className="py-2.5 px-2.5 font-medium text-right">变动后IRR</th>
                        <th className="py-2.5 px-3.5 font-medium text-right">较基准冲击</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E1DA]">
                      {activeFinancials.regressionTable.map((r, i) => (
                        <tr key={i}>
                          <td className="py-2.5 px-3.5 align-top">
                            <div className="font-medium text-[#141E2B]">{r.factor}</div>
                            <div className="text-[11px] text-[#64748B] mt-0.5">{r.riskNote}</div>
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono tabular-nums text-[#475569] align-top whitespace-nowrap">
                            {r.deltaLabel}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono tabular-nums font-medium text-[#141E2B] align-top whitespace-nowrap">
                            {r.irrPct !== null ? `${r.irrPct}%` : '未收回'}
                          </td>
                          <td
                            className={`py-2.5 px-3.5 text-right font-mono tabular-nums font-medium align-top whitespace-nowrap ${
                              r.irrDeltaPct !== null && r.irrDeltaPct < 0
                                ? 'text-[#B91C1C]'
                                : 'text-[#166534]'
                            }`}
                          >
                            {r.irrDeltaPct !== null
                              ? `${r.irrDeltaPct > 0 ? '+' : ''}${r.irrDeltaPct}%`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {draftError && (
            <div className="flex items-start gap-2.5 p-4 rounded-md border border-[#B91C1C]/30 bg-[#FEF2F2] text-sm text-[#991B1B]">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{draftError}</span>
            </div>
          )}

          {isDrafting && (
            <div className="bg-white border border-[#E4E1DA] rounded-md p-8 space-y-4 animate-pulse">
              <div className="h-6 w-2/3 bg-[#E4E1DA] rounded" />
              <div className="h-4 w-full bg-[#F2F0EA] rounded" />
              <div className="h-4 w-5/6 bg-[#F2F0EA] rounded" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                <div className="h-24 bg-[#F7F6F2] rounded border border-[#E4E1DA]" />
                <div className="h-24 bg-[#F7F6F2] rounded border border-[#E4E1DA]" />
              </div>
            </div>
          )}

          {/* Attached Review Summary Banner (if this project was converted after review) */}
          {activeProject.review && !isDrafting && (
            <div className="bg-white border border-[#E4E1DA] rounded-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs text-[#64748B]">
                  本项目已关联三大维度审改意见书 · 结论：
                  <span className="font-semibold text-[#141E2B]">
                    {activeProject.review.overallReadiness}
                  </span>
                </div>
                <div className="text-sm font-semibold text-[#141E2B] mt-1">
                  {activeProject.review.reportTitle}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReviewResult(activeProject.review);
                  setReviewAudience(activeProject.input.audience);
                  setReviewIndustry(activeProject.input.industry);
                  if (activeProject.originalUploadedText) {
                    setReviewText(activeProject.originalUploadedText);
                  }
                  setSubMode('review');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B365D] border border-[#1B365D]/30 rounded hover:bg-[#1B365D]/5 transition-colors whitespace-nowrap shrink-0"
              >
                <span>查看关联审改意见书</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Rendered Formal SOE & Gov Executive Feasibility Study Draft for Active Project */}
          {activeProject.draft && !isDrafting && (
            <article className="bg-white border border-[#E4E1DA] rounded-md p-6 sm:p-8 space-y-6">
              <div className="pb-5 border-b border-[#E4E1DA] flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-[#64748B]">
                    <span className="font-mono font-semibold text-[#1B365D] mr-2">
                      {activeProject.code}
                    </span>
                    <span>{activeProject.draft.docNumberHint}</span>
                    <span className="mx-2" aria-hidden="true">
                      ·
                    </span>
                    <span className="text-[#141E2B] font-medium">
                      {activeProject.draft.reportingLine}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleSendActiveDraftToReview}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1B365D] border border-[#1B365D]/35 rounded hover:bg-[#1B365D]/5 transition-colors whitespace-nowrap"
                    >
                      <span>送入三大维度交叉审改</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(
                          feasibilityDraftToMarkdown(activeProject.draft!, activeFinancials),
                          () => {
                            setDraftCopied(true);
                            setTimeout(() => setDraftCopied(false), 1800);
                          }
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#141E2B] border border-[#E4E1DA] rounded hover:bg-[#F7F6F2] transition-colors whitespace-nowrap"
                    >
                      {draftCopied ? (
                        <Check className="w-3.5 h-3.5 text-[#166534]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{draftCopied ? '已复制公文稿' : '复制公文稿'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadMarkdownFile(
                          `${activeProject.code}_${activeProject.draft!.documentTitle.slice(0, 22)}.md`,
                          feasibilityDraftToMarkdown(activeProject.draft!, activeFinancials)
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#141E2B] border border-[#E4E1DA] rounded hover:bg-[#F7F6F2] transition-colors whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>导出 MD 初稿</span>
                    </button>
                  </div>
                </div>

                <h2 className="font-editorial text-2xl font-bold text-[#141E2B] leading-snug">
                  {activeProject.draft.documentTitle}
                </h2>

                {/* Executive One-Pager */}
                <div className="bg-[#FAF9F6] border border-[#E4E1DA] rounded p-5 space-y-3">
                  <div className="text-xs font-semibold text-[#1B365D]">
                    领导一页纸核心摘要（国企 / 政府公文结论前置规范）
                  </div>
                  <div className="text-sm font-semibold text-[#141E2B] leading-relaxed">
                    {activeProject.draft.executiveOnePager.conclusion}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#E4E1DA] text-xs leading-relaxed">
                    <div>
                      <div className="text-[#64748B] mb-1">政策与战略契合</div>
                      <div className="text-[#334155]">
                        {activeProject.draft.executiveOnePager.strategicFit}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#64748B] mb-1">财务与回归测试要点</div>
                      <div className="text-[#334155]">
                        {activeProject.draft.executiveOnePager.financialHighlight}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#64748B] mb-1">风控安全阀兜底</div>
                      <div className="text-[#334155]">
                        {activeProject.draft.executiveOnePager.riskControlShield}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Formal 7 Chapters */}
              <div className="divide-y divide-[#E4E1DA]">
                {activeProject.draft.chapters.map((ch, idx) => (
                  <section key={idx} className="py-5 first:pt-0 space-y-3">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-xs font-semibold text-[#1B365D]">
                        {ch.chapterNo}
                      </span>
                      <h3 className="font-editorial text-lg font-bold text-[#141E2B]">
                        {ch.title}
                      </h3>
                    </div>
                    <div className="text-xs sm:text-[13px] font-medium text-[#1B365D] bg-[#F7F6F2] px-3.5 py-2 rounded border border-[#E4E1DA]">
                      本章要旨：{ch.keyTakeaway}
                    </div>
                    <div className="space-y-2.5 text-sm text-[#334155] leading-relaxed">
                      {ch.paragraphs.map((para, pIdx) => (
                        <p key={pIdx}>{para}</p>
                      ))}
                    </div>
                    {ch.bulletPoints.length > 0 && (
                      <ul className="space-y-1.5 pt-1 text-xs sm:text-[13px] text-[#334155]">
                        {ch.bulletPoints.map((b, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2">
                            <span className="font-mono text-[#1B365D] shrink-0">•</span>
                            <span className="leading-relaxed">{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
              </div>

              {/* Conditions Precedent & Leadership Requests */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-[#E4E1DA]">
                <div className="p-4 rounded border border-[#B91C1C]/25 bg-[#FEF2F2]/35 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-[#991B1B]">
                    <ShieldAlert className="w-4 h-4" />
                    <span>拟写入决议的出资先决条件（CP 安全阀）</span>
                  </div>
                  <ol className="space-y-2 text-xs sm:text-[13px] text-[#334155] leading-relaxed">
                    {activeProject.draft.conditionsPrecedent.map((cp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-mono font-semibold text-[#B91C1C] shrink-0">
                          {i + 1}.
                        </span>
                        <span>{cp}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="p-4 rounded border border-[#E4E1DA] bg-[#FAF9F6] space-y-2.5">
                  <div className="text-sm font-semibold text-[#1B365D]">
                    提请领导 / 投委会审议协调事项
                  </div>
                  <ol className="space-y-2 text-xs sm:text-[13px] text-[#334155] leading-relaxed">
                    {activeProject.draft.leadershipRequests.map((req, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-mono font-semibold text-[#1B365D] shrink-0">
                          {i + 1}.
                        </span>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E4E1DA] text-xs text-[#64748B] space-y-1.5">
                <div className="font-semibold text-[#475569]">
                  本初稿已应用的国企 / 政府汇报行文规范：
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {activeProject.draft.writingRulesApplied.map((rule, i) => (
                    <span key={i}>· {rule}</span>
                  ))}
                </div>
              </div>
            </article>
          )}
        </div>
      )}

      {/* ================= VIEW 3: UPLOADED FEASIBILITY REVIEW & CONVERT TO PROJECT ================= */}
      {subMode === 'review' && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E4E1DA] rounded-md p-6 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#E4E1DA]">
              <div>
                <h3 className="font-editorial text-base sm:text-lg font-bold text-[#141E2B]">
                  上传可研三大维度交叉审改 · 一键转化为在库管理项目
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  可先做“数据交叉验证 / 政策匹配 / 行文习惯”审改，也可随时一键提取全文财务与产业参数转为独立可研项目纳入总表管理
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUploadedFile(null);
                  setReviewText(SAMPLE_FLAWED_FEASIBILITY_TEXT);
                  setReviewIndustry('compute_ai');
                  setReviewAudience('joint_committee');
                  setReviewFocusNotes('请重点核查投资额、100%上架率、灰渠买卡和全额担保风险');
                  setFileError(null);
                  setReviewError(null);
                }}
                className="px-3 py-1.5 text-xs font-medium text-[#1B365D] bg-[#FAF9F6] border border-[#E4E1DA] rounded hover:bg-[#F2F0EA] transition-colors whitespace-nowrap shrink-0"
              >
                填入《1000P算力问题草稿》体验审改与入库
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1.5">
                  该可研的呈报对象
                </label>
                <select
                  value={reviewAudience}
                  onChange={(e) => setReviewAudience(e.target.value as ReportAudience)}
                  className="w-full h-9 px-3 text-xs bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                >
                  {(Object.keys(AUDIENCE_LABELS) as ReportAudience[]).map((k) => (
                    <option key={k} value={k}>
                      {AUDIENCE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1.5">
                  所属产业赛道（用于匹配行业基准数据交叉验证）
                </label>
                <select
                  value={reviewIndustry}
                  onChange={(e) => setReviewIndustry(e.target.value as IndustryTrack)}
                  className="w-full h-9 px-3 text-xs bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
                >
                  {(Object.keys(INDUSTRY_LABELS) as IndustryTrack[]).map((k) => (
                    <option key={k} value={k}>
                      {INDUSTRY_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* File Upload Area */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,.csv,.json"
                onChange={handleFileChange}
                className="hidden"
              />
              {uploadedFile ? (
                <div className="flex items-center justify-between gap-3 p-4 rounded border border-[#1B365D]/35 bg-[#1B365D]/[0.03]">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[#141E2B] truncate">
                      已载入文件：{uploadedFile.name}
                    </div>
                    <div className="text-xs text-[#64748B] font-mono tabular-nums mt-0.5">
                      {uploadedFile.kind === 'pdf'
                        ? 'PDF 原件（AI 可直接审改并提取参数转为在库项目）'
                        : '纯文本 / Markdown 文件'}{' '}
                      · {uploadedFile.sizeKb} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedFile(null);
                      if (uploadedFile.kind === 'text') setReviewText('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] rounded transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>移除</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-5 rounded border border-dashed border-[#CBD5E1] bg-[#FAF9F6] hover:border-[#1B365D] hover:bg-white transition-colors flex flex-col items-center justify-center gap-1.5 text-center"
                >
                  <FileUp className="w-5 h-5 text-[#1B365D]" />
                  <span className="text-sm font-medium text-[#141E2B]">
                    点击上传可研报告文件（支持 PDF / TXT / Markdown，≤ 8MB）
                  </span>
                  <span className="text-xs text-[#64748B]">
                    Word 文档可另存为 PDF 上传，或直接将内容粘贴至下方文本框
                  </span>
                </button>
              )}

              {fileError && (
                <div className="mt-2 text-xs text-[#B45309] bg-[#FFFBEB] border border-[#B45309]/25 rounded px-3 py-2">
                  {fileError}
                </div>
              )}
            </div>

            {uploadedFile?.kind !== 'pdf' && (
              <div>
                <label className="block text-xs font-medium text-[#475569] mb-1.5">
                  或直接粘贴可研报告原文 / 合作方发来的方案节选
                </label>
                <textarea
                  rows={7}
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="将 Word / WPS 中的可研报告正文、财务收益测算段落或合作方给的项目建议书直接粘贴在此..."
                  className="w-full p-3.5 text-xs sm:text-[13px] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D] leading-relaxed"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#475569] mb-1.5">
                额外审查重点（选填，如领导特别关切某项指标或政策）
              </label>
              <input
                type="text"
                value={reviewFocusNotes}
                onChange={(e) => setReviewFocusNotes(e.target.value)}
                placeholder="例如：请重点核查对方的算力电费假设有没有偏低，以及我们四级公司担保条款有没有踩红线..."
                className="w-full h-9 px-3 text-xs sm:text-[13px] bg-[#FAF9F6] border border-[#E4E1DA] rounded focus:outline-none focus:border-[#1B365D]"
              />
            </div>

            {reviewError && (
              <div className="flex items-start gap-2.5 p-3.5 rounded border border-[#B91C1C]/30 bg-[#FEF2F2] text-xs sm:text-sm text-[#991B1B]">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{reviewError}</span>
              </div>
            )}

            {/* Dual Action Bar: 3-Pillar Cross Review + One-Click Convert to Managed Project */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleRunReview}
                disabled={isReviewing || isConverting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-[#1B365D] rounded hover:bg-[#132847] disabled:opacity-60 transition-colors"
              >
                <FileSearch className="w-4 h-4" />
                <span>
                  {isReviewing
                    ? '正在三维度交叉审改中...'
                    : '启动可研三大维度交叉审改'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleConvertUploadedToProject}
                disabled={isReviewing || isConverting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-[#1B365D] bg-white border border-[#1B365D] rounded hover:bg-[#1B365D]/5 disabled:opacity-60 transition-colors"
              >
                <FilePlus2 className="w-4 h-4" />
                <span>
                  {isConverting
                    ? '正在提取参数并转入项目总表...'
                    : '一键提取参数转为可研项目入库'}
                </span>
              </button>
            </div>
          </div>

          {(isReviewing || isConverting) && (
            <div className="bg-white border border-[#E4E1DA] rounded-md p-8 space-y-4 animate-pulse">
              <div className="text-xs text-[#64748B]">
                {isConverting
                  ? '正在从上传文档中提取投资规模、成本结构、政策依据并创建独立项目台账...'
                  : '正在从数据交叉验证、政策匹配、公文流程三维度深度审改...'}
              </div>
              <div className="h-6 w-1/2 bg-[#E4E1DA] rounded" />
              <div className="h-4 w-full bg-[#F2F0EA] rounded" />
              <div className="h-4 w-4/5 bg-[#F2F0EA] rounded" />
            </div>
          )}

          {/* Rendered 3-Pillar Feasibility Review Report */}
          {reviewResult && !isReviewing && !isConverting && (
            <article className="bg-white border border-[#E4E1DA] rounded-md p-6 sm:p-8 space-y-7">
              <div className="pb-5 border-b border-[#E4E1DA] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#64748B]">上会就绪度评审结论</span>
                    <span aria-hidden="true" className="text-[#CBD5E1]">
                      ·
                    </span>
                    <span
                      className={`font-semibold ${
                        reviewResult.overallReadiness === '具备上会基础'
                          ? 'text-[#166534]'
                          : reviewResult.overallReadiness === '需重点修订后上会'
                          ? 'text-[#B45309]'
                          : 'text-[#B91C1C]'
                      }`}
                    >
                      {reviewResult.overallReadiness}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleConvertUploadedToProject}
                      disabled={isConverting}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1B365D] rounded hover:bg-[#132847] transition-colors whitespace-nowrap"
                    >
                      <FilePlus2 className="w-3.5 h-3.5" />
                      <span>带着本审改单一键转入项目库</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        copyText(feasibilityReviewToMarkdown(reviewResult), () => {
                          setReviewCopied(true);
                          setTimeout(() => setReviewCopied(false), 1800);
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#141E2B] border border-[#E4E1DA] rounded hover:bg-[#F7F6F2] transition-colors whitespace-nowrap"
                    >
                      {reviewCopied ? (
                        <Check className="w-3.5 h-3.5 text-[#166534]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{reviewCopied ? '已复制意见书' : '复制意见书'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadMarkdownFile(
                          `${reviewResult.reportTitle.slice(0, 26)}.md`,
                          feasibilityReviewToMarkdown(reviewResult)
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#141E2B] border border-[#E4E1DA] rounded hover:bg-[#F7F6F2] transition-colors whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>导出 MD</span>
                    </button>
                  </div>
                </div>

                <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#141E2B]">
                  {reviewResult.reportTitle}
                </h2>
                <p className="text-sm text-[#334155] leading-relaxed">
                  {reviewResult.executiveVerdict}
                </p>

                <div className="p-4 rounded border border-[#B91C1C]/25 bg-[#FEF2F2]/40 space-y-2">
                  <div className="text-xs font-semibold text-[#991B1B]">
                    上会前必须立即修正的三大硬伤
                  </div>
                  <ol className="space-y-1.5 text-xs sm:text-[13px] text-[#334155]">
                    {reviewResult.topThreeBlockers.map((b, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="font-mono font-semibold text-[#B91C1C] shrink-0">
                          0{i + 1}.
                        </span>
                        <span className="leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Pillar 1 */}
              <section className="space-y-3.5 pb-6 border-b border-[#E4E1DA]">
                <h3 className="font-editorial text-base font-bold text-[#141E2B]">
                  01. 数据可信度与行业基准交叉验证
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  {reviewResult.dataCredibilityAudit.summary}
                </p>
                <div className="divide-y divide-[#E4E1DA] border border-[#E4E1DA] rounded">
                  {reviewResult.dataCredibilityAudit.items.map((item, idx) => (
                    <div key={idx} className="p-4 space-y-2 text-xs sm:text-[13px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-semibold ${
                            item.credibilityLevel === '可信'
                              ? 'text-[#166534]'
                              : item.credibilityLevel === '存疑需核验'
                              ? 'text-[#B45309]'
                              : 'text-[#B91C1C]'
                          }`}
                        >
                          {item.credibilityLevel}
                        </span>
                        <span aria-hidden="true" className="text-[#CBD5E1]">
                          ·
                        </span>
                        <span className="font-semibold text-[#141E2B]">
                          {item.claimOrMetric}
                        </span>
                      </div>
                      <div className="text-[#334155] leading-relaxed">
                        <span className="text-[#64748B]">交叉验证基准：</span>
                        {item.crossValidationBasis}
                      </div>
                      <div className="text-[#1B365D] leading-relaxed">
                        <span className="font-medium">建议修正：</span>
                        {item.suggestedFix}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Pillar 2 */}
              <section className="space-y-3.5 pb-6 border-b border-[#E4E1DA]">
                <h3 className="font-editorial text-base font-bold text-[#141E2B]">
                  02. 最新产业政策与国资合规匹配度审查
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  {reviewResult.policyMatchAudit.summary}
                </p>
                <div className="divide-y divide-[#E4E1DA] border border-[#E4E1DA] rounded">
                  {reviewResult.policyMatchAudit.items.map((item, idx) => (
                    <div key={idx} className="p-4 space-y-2 text-xs sm:text-[13px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-semibold ${
                            item.matchStatus === '高度契合'
                              ? 'text-[#166534]'
                              : item.matchStatus === '需补强依据'
                              ? 'text-[#B45309]'
                              : 'text-[#B91C1C]'
                          }`}
                        >
                          {item.matchStatus}
                        </span>
                        <span aria-hidden="true" className="text-[#CBD5E1]">
                          ·
                        </span>
                        <span className="font-semibold text-[#141E2B]">
                          {item.policyDimension}
                        </span>
                      </div>
                      <div className="text-[#334155] leading-relaxed">{item.finding}</div>
                      <div className="text-[#1B365D] leading-relaxed">
                        <span className="font-medium">补强与合规建议：</span>
                        {item.alignmentSuggestion}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Pillar 3 */}
              <section className="space-y-3.5 pb-6 border-b border-[#E4E1DA]">
                <h3 className="font-editorial text-base font-bold text-[#141E2B]">
                  03. 国企与政府公文行文流程及领导阅读习惯诊断
                </h3>
                <p className="text-sm text-[#475569] leading-relaxed">
                  {reviewResult.flowAndHabitAudit.summary}
                </p>
                <div className="overflow-x-auto border border-[#E4E1DA] rounded">
                  <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
                    <thead>
                      <tr className="bg-[#F7F6F2] border-b border-[#E4E1DA] text-[#64748B]">
                        <th className="py-2.5 px-3.5 font-medium whitespace-nowrap">章节位置</th>
                        <th className="py-2.5 px-3.5 font-medium">阅读与逻辑问题</th>
                        <th className="py-2.5 px-3.5 font-medium">政企标准公文法则</th>
                        <th className="py-2.5 px-3.5 font-medium">调整动作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4E1DA]">
                      {reviewResult.flowAndHabitAudit.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-3 px-3.5 font-medium text-[#141E2B] whitespace-nowrap align-top">
                            {item.sectionArea}
                          </td>
                          <td className="py-3 px-3.5 text-[#B45309] align-top leading-relaxed">
                            {item.readingHabitProblem}
                          </td>
                          <td className="py-3 px-3.5 text-[#334155] align-top leading-relaxed">
                            {item.govSoeStandardRule}
                          </td>
                          <td className="py-3 px-3.5 text-[#1B365D] align-top leading-relaxed">
                            {item.improvementAction}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Rewrite Comparisons */}
              <section className="space-y-4 pb-6 border-b border-[#E4E1DA]">
                <div>
                  <h3 className="font-editorial text-base font-bold text-[#141E2B]">
                    04. 逐段公文改写对照（可直接复制替换原文）
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    已将原文中偏乐观、偏口语或踩红线的段落改写为严谨的国企/政府汇报体
                  </p>
                </div>

                <div className="space-y-4">
                  {reviewResult.rewriteComparisons.map((rw, idx) => (
                    <div
                      key={idx}
                      className="border border-[#E4E1DA] rounded-md overflow-hidden"
                    >
                      <div className="px-4 py-2.5 bg-[#F7F6F2] border-b border-[#E4E1DA] flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-[#141E2B]">
                          {rw.section}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyText(rw.revisedExecutiveText, () => {
                              setCopiedRewriteIdx(idx);
                              setTimeout(() => setCopiedRewriteIdx(null), 1600);
                            })
                          }
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#1B365D] hover:underline whitespace-nowrap"
                        >
                          {copiedRewriteIdx === idx ? (
                            <Check className="w-3.5 h-3.5 text-[#166534]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {copiedRewriteIdx === idx ? '已复制改写段' : '复制修改后公文段'}
                          </span>
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E4E1DA] text-xs sm:text-[13px] leading-relaxed">
                        <div className="p-4 bg-[#FEF2F2]/25">
                          <div className="text-[11px] font-semibold text-[#B91C1C] mb-1.5">
                            原文问题表述
                          </div>
                          <p className="text-[#475569]">{rw.originalIssue}</p>
                        </div>
                        <div className="p-4 bg-white">
                          <div className="text-[11px] font-semibold text-[#166534] mb-1.5">
                            修改后国企 / 政府标准表述
                          </div>
                          <p className="text-[#141E2B]">{rw.revisedExecutiveText}</p>
                        </div>
                      </div>
                      <div className="px-4 py-2.5 bg-[#FAF9F6] border-t border-[#E4E1DA] text-xs text-[#64748B]">
                        改写逻辑：{rw.rationale}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-2.5">
                <h3 className="font-editorial text-base font-bold text-[#141E2B]">
                  05. 正式上会前最终核查清单
                </h3>
                <ul className="space-y-2 text-sm text-[#334155]">
                  {reviewResult.nextStepChecklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="font-mono text-xs text-[#1B365D] mt-0.5 shrink-0">
                        0{i + 1}.
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </article>
          )}
        </div>
      )}
    </div>
  );
};
