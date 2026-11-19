export type WorkbenchTab = 'sandbox' | 'advisor' | 'matrix' | 'compliance' | 'jargon';

export type EntityType = 'soe_tier4' | 'soe_group' | 'private_crossborder';

export type IndustryTrack =
  | 'agriculture'
  | 'new_energy'
  | 'compute_ai'
  | 'policy_infra'
  | 'general_trade';

export type AdvisoryTopic =
  | 'asset_revitalization'
  | 'org_lean_control'
  | 'contract_review'
  | 'supply_chain'
  | 'fund_trade_chain'
  | 'crossborder_compliance';

export type GuidanceMode = 'beginner_guided' | 'expert_direct';

export type ResourceKey =
  | 'soe_credit'
  | 'licenses_quotas'
  | 'bank_credit_line'
  | 'policy_channel'
  | 'overseas_clients'
  | 'legacy_equity';

export type ComplianceStrictness = 'strict_sasac' | 'balanced' | 'market_agile';

export interface SandboxConfig {
  liquidCapitalWan: number; // 可动用自有资金（万元）
  headcount: number; // 核心专职人数（人）
  investAuthorityLimitWan: number; // 自主投资单笔权限上限（万元）
  resources: ResourceKey[];
  industry: IndustryTrack;
  strictness: ComplianceStrictness;
  consolidationPreference: 'no_consolidate' | 'flexible' | 'consolidate_revenue';
}

export interface AdvisoryOption {
  title: string;
  fitLabel: string;
  mechanism: string;
  capitalRequirement: string;
  staffingNeed: string;
  complianceBoundary: string;
}

export interface AdvisoryRiskAlert {
  level: 'high' | 'medium';
  title: string;
  detail: string;
  redlineBasis: string;
}

export interface AdvisoryActionLever {
  phase: string;
  action: string;
  deliverable: string;
  owner: string;
}

export interface JargonItem {
  term: string;
  plainMeaning: string;
  watchOut: string;
}

export interface StructuredAdvisoryReport {
  headline: string;
  executiveSummary: string;
  entityDiffNote: string;
  leadershipAlignmentTip?: string;
  diagnosisPoints: string[];
  options: AdvisoryOption[];
  riskAlerts: AdvisoryRiskAlert[];
  actionLevers: AdvisoryActionLever[];
  precautions: string[];
  jargonGlossary?: JargonItem[];
  guidedDiscoveryQuestions?: string[];
  followUpQuestions: string[];
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'advisor';
  timestamp: string;
  userText?: string;
  report?: StructuredAdvisoryReport;
  error?: string;
}

export interface SavedMemo {
  id: string;
  title: string;
  createdAt: string;
  source: 'advisor' | 'sandbox' | 'compliance';
  entityType: EntityType;
  industry: IndustryTrack;
  report: StructuredAdvisoryReport;
}

export interface LightAssetModel {
  id: string;
  code: string;
  name: string;
  subtitle: string;
  category: 'trade_chain' | 'equity_spv' | 'policy_finance' | 'license_platform';
  applicableTracks: IndustryTrack[];
  capitalBand: '极低（≤300万）' | '低（300–1000万）' | '中低（1000–2000万）';
  capitalLevel: 'very_low' | 'low' | 'medium';
  headcountBand: string;
  headcountLevel: 'lean' | 'moderate';
  revenueAccounting: '净额法（服务费/佣金）' | '权益法（投资收益）' | '全额法（需真实货权）';
  consolidationImpact: '不并表' | '可选并表' | '表内自营';
  soeRiskLevel: '低' | '中' | '中高（严守红线）';
  leverageRatio: string;
  cycleMonths: string;
  coreLogic: string;
  fourFlows: {
    business: string;
    fund: string;
    goods: string;
    contract: string;
  };
  sasacRedlines: string[];
  leanTeamDivision: string[];
  typicalCase: string;
  advisorPromptSeed: string;
}

export type AuditStatus = 'unchecked' | 'compliant' | 'in_progress' | 'high_risk';

export interface ComplianceAuditItem {
  id: string;
  category:
    | 'sasac_redline'
    | 'crossborder_fx'
    | 'contract_goods'
    | 'lean_governance';
  code: string;
  title: string;
  severity: 'redline' | 'high' | 'standard';
  soeRequirement: string;
  privateRequirement: string;
  practicalControl: string;
  evidenceDoc: string;
}

export interface AuditItemState {
  status: AuditStatus;
  note: string;
}

export interface RoadmapStage {
  step: string;
  title: string;
  goal: string;
  typicalBottleneck: string;
  realCaseWarning: string;
  beginnerAction: string;
  passGate: string;
  advisorSeedPrompt: string;
  targetIndustry: IndustryTrack;
}

export interface DictionaryEntry {
  id: string;
  category: 'bank_leverage' | 'supply_chain' | 'cross_industry';
  term: string;
  alias: string;
  plainExplanation: string;
  howToUseLeverage: string;
  riskTrap: string;
  whatToAsk: string;
  advisorPrompt: string;
}

export type ReportAudience = 'gov_leader' | 'soe_exec' | 'joint_committee';

export interface FeasibilityDraftInput {
  projectName: string;
  location: string;
  industry: IndustryTrack;
  audience: ReportAudience;
  projectScale: string; // 如：总体规划1000P，一期建设200P算力舱
  policyContext: string; // 对应最新产业/地方政策背景
  businessModelNote: string; // 商业模式、消纳/渠道嫁接说明
  totalCapexWan: number; // 总投资额（万元）
  ownEquityWan: number; // 自有资金出资（万元）
  financingRatePct: number; // 银行/金租年化融资成本（%）
  annualRevenueWan: number; // 达产年预计营收（万元）
  annualOpexWan: number; // 达产年刚性运营成本含电费运维（万元）
  utilizationPct: number; // 基准假设利用率/上架率/产能利用率（%）
  horizonYears: number; // 测算周期（年）
  rampUpYear1Pct: number; // 首年爬坡达产比例（%）
  keyDriverLabel: string; // 核心敏感变量说明（如：算力上架率 / 菌棒出货量）
}

export interface StressScenarioRow {
  name: string;
  assumption: string;
  irrPct: number | null;
  staticPaybackYears: number | null;
  dynamicPaybackYears: number | null;
  npvWan: number;
  cumulativeNetCashWan: number;
  verdict: '达标稳健' | '临界承压' | '触发红线';
}

export interface RegressionSensitivityRow {
  factor: string;
  deltaLabel: string;
  irrPct: number | null;
  irrDeltaPct: number | null;
  paybackYears: number | null;
  riskNote: string;
}

export interface FeasibilityFinancialSummary {
  baseIrrPct: number | null;
  staticPaybackYears: number | null;
  dynamicPaybackYears: number | null;
  npvWan: number;
  leverageDebtWan: number;
  annualDebtServiceWan: number;
  breakevenUtilizationPct: number;
  cashflowSeries: { year: number; netCashWan: number; cumulativeWan: number }[];
  stressScenarios: StressScenarioRow[];
  regressionTable: RegressionSensitivityRow[];
}

export interface FeasibilityDraftChapter {
  chapterNo: string;
  title: string;
  keyTakeaway: string;
  paragraphs: string[];
  bulletPoints: string[];
}

export interface FeasibilityDraftReport {
  documentTitle: string;
  docNumberHint: string;
  reportingLine: string;
  executiveOnePager: {
    conclusion: string;
    strategicFit: string;
    financialHighlight: string;
    riskControlShield: string;
  };
  chapters: FeasibilityDraftChapter[];
  conditionsPrecedent: string[];
  leadershipRequests: string[];
  writingRulesApplied: string[];
}

export interface FeasibilityDataCheckItem {
  claimOrMetric: string;
  credibilityLevel: '可信' | '存疑需核验' | '明显偏乐观/矛盾';
  crossValidationBasis: string;
  suggestedFix: string;
}

export interface FeasibilityPolicyCheckItem {
  policyDimension: string;
  matchStatus: '高度契合' | '需补强依据' | '存在红线冲突';
  finding: string;
  alignmentSuggestion: string;
}

export interface FeasibilityFlowIssue {
  sectionArea: string;
  readingHabitProblem: string;
  govSoeStandardRule: string;
  improvementAction: string;
}

export interface FeasibilityRewritePair {
  section: string;
  originalIssue: string;
  revisedExecutiveText: string;
  rationale: string;
}

export interface FeasibilityReviewReport {
  reportTitle: string;
  overallReadiness: '具备上会基础' | '需重点修订后上会' | '存在硬伤暂缓上会';
  executiveVerdict: string;
  topThreeBlockers: string[];
  dataCredibilityAudit: {
    summary: string;
    items: FeasibilityDataCheckItem[];
  };
  policyMatchAudit: {
    summary: string;
    items: FeasibilityPolicyCheckItem[];
  };
  flowAndHabitAudit: {
    summary: string;
    items: FeasibilityFlowIssue[];
  };
  rewriteComparisons: FeasibilityRewritePair[];
  nextStepChecklist: string[];
}

export type FeasibilityProjectStage =
  | 'modeling'
  | 'draft_ready'
  | 'under_review'
  | 'committee_ready';

export interface FeasibilityProject {
  id: string;
  code: string;
  stage: FeasibilityProjectStage;
  sourceType: 'manual' | 'preset' | 'uploaded_converted';
  sourceFileName?: string;
  extractionNotes?: string;
  createdAt: string;
  updatedAt: string;
  input: FeasibilityDraftInput;
  draft: FeasibilityDraftReport | null;
  review: FeasibilityReviewReport | null;
  originalUploadedText?: string;
}


