import { GoogleGenAI, Type } from '@google/genai';
import type {
  FeasibilityDraftInput,
  FeasibilityDraftReport,
  FeasibilityFinancialSummary,
  FeasibilityReviewReport,
  IndustryTrack,
  ReportAudience,
} from '../src/types.ts';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      '服务端尚未配置 GEMINI_API_KEY，请在 Settings > Secrets 中检查密钥配置。'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const AUDIENCE_DESC: Record<ReportAudience, string> = {
  gov_leader: '地方政府分管领导、发改委及园区管委会（重点关注产业带动、税收就业、政策落地、合规示范与风险可控）',
  soe_exec: '国企集团党委会、董事会及投委会高层（重点关注国有资产保值增值、IRR与回本底线、74号文合规、负债并表影响及尽职免责闭环）',
  joint_committee: '政企联合决策专班（需同时兼顾地方政府战略导向与国资投资收益、现金流安全阀）',
};

const INDUSTRY_DESC: Record<IndustryTrack, string> = {
  agriculture: '现代农业与跨区域农产品产销嫁接',
  new_energy: '新能源、分布式绿电与储能配套',
  compute_ai: '智算中心（如1000P算力舱）、GPU/HBM供应链与数字基建',
  policy_infra: '政策导向与地方园区配套基建',
  general_trade: '涉外贸易与供应链金融统筹',
};

const DRAFT_SYSTEM_INSTRUCTION = `你是一位曾任大型国企战略投资部总经理兼政府产业规划评审专家的“产业可研报告主笔总顾问”。
你精通中国政府公文规范与国资委投资项目可行性研究报告标准格式（参照国家发改委《政府投资项目可行性研究报告编写通用大纲》及央国企“三重一大”投资评审规范）。

行文铁律（面向政府领导与国企高层）：
1. **结论前置，站位高远**：开篇《一页纸核心摘要》直接亮明“是否可行、怎么分期落地、投多少钱、几年回本、底线如何兜住”，绝不让领导翻十几页才找结论。
2. **语言克制、庄重、平实、有数据支撑**：杜绝互联网营销体、空洞口号或盲目乐观大饼；统一使用规范政企公文表述（如“拟采取‘总体规划、分期实施、以销定投’策略”“经敏感性回归压力测试”“建议附条件立项”）。
3. **直面风险但转化为“可控先决条件（CP）”**：绝不隐瞒行业竞争（如菌棒龙头60%份额）或技术卡脖子（如GPU/HBM受限、算力消纳不确定），而是高情商地把风险转化为分期建设节点、订单前置锁定、国产替代备选、无追索金融工具等可落地的管控闭环，既贯彻领导战略意图又保护四级公司不背锅。
4. **严格引用传入的财务与回归测试真实数据**：所有 IRR、静动态投资回收期、保本利用率、基准/审慎/极端三情景数据必须与系统测算完全一致，不得随意编造夸大。
5. 严格按照 JSON Schema 输出标准七章结构化可研报告初稿。`;

const DRAFT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    documentTitle: { type: Type.STRING, description: '规范的政企汇报公文主标题，如《关于……项目的可行性分析报告（初稿）》' },
    docNumberHint: { type: Type.STRING, description: '文稿属性说明，如“供集团投委会及地方专题会审议 · 讨论初稿”' },
    reportingLine: { type: Type.STRING, description: '呈报对象称谓与汇报定位说明' },
    executiveOnePager: {
      type: Type.OBJECT,
      properties: {
        conclusion: { type: Type.STRING, description: '一句话核心决策建议（如建议采取“总规分期、附先决条件”方式稳妥推进）' },
        strategicFit: { type: Type.STRING, description: '战略与政策契合度高度凝练（60-100字）' },
        financialHighlight: { type: Type.STRING, description: '投资规模、IRR、回本周期及压力测试核心数字摘要（60-100字）' },
        riskControlShield: { type: Type.STRING, description: '针对核心痛点的风控安全阀与国资底线兜底机制（60-100字）' },
      },
      required: ['conclusion', 'strategicFit', 'financialHighlight', 'riskControlShield'],
    },
    chapters: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          chapterNo: { type: Type.STRING, description: '如“第一章”、“第二章”……至“第七章”' },
          title: { type: Type.STRING, description: '标准国企/政府可研章节标题' },
          keyTakeaway: { type: Type.STRING, description: '本章核心观点提炼（方便领导快速扫读，1-2句话）' },
          paragraphs: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '2-3段规范、严谨、可直接粘贴进 Word 汇报的政企公文正文段落',
          },
          bulletPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: '3-4条结构化关键要点、数据支撑或管控举措',
          },
        },
        required: ['chapterNo', 'title', 'keyTakeaway', 'paragraphs', 'bulletPoints'],
      },
      description: '完整 7 个标准章节：1.项目概况与决策建议 2.政策契合度与建设必要性 3.市场格局、痛点破局与商业模式 4.建设/运营方案与成本结构 5.财务测算、IRR回归压力测试与回本模型 6.国资合规审查、风险识别与先决条件 7.组织保障、90天排期与请示事项',
    },
    conditionsPrecedent: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '4-5条写入立项决议的“正式出资先决条件（CP安全阀）”',
    },
    leadershipRequests: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3条清晰克制的“提请领导/投委会审议及协调事项”',
    },
    writingRulesApplied: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3-4条说明本初稿遵循了哪些国企/政府公文行文规范（方便初学者边用边学）',
    },
  },
  required: [
    'documentTitle',
    'docNumberHint',
    'reportingLine',
    'executiveOnePager',
    'chapters',
    'conditionsPrecedent',
    'leadershipRequests',
    'writingRulesApplied',
  ],
};

const REVIEW_SYSTEM_INSTRUCTION = `你是一位长期担任省级国资委投资项目评审专家与发改委可研评估组长的资深审稿顾问。
你的任务是对用户上传或粘贴的可行性研究报告（或草稿节选）进行极端客观、犀利、可落地的三大核心维度交叉审改：
1. **数据可信度与交叉验证**：揪出拍脑袋假设、违背行业常识的单价/上架率/折旧/回本周期、漏算刚性成本（如算力电费/PUE/折旧、农业冷链损耗、融资利息与税费），并给出真实行业基准区间与具体交叉验证渠道。
2. **与国家/地方政策及国资合规匹配度**：对照最新产业政策（东数西算/国产替代、乡村振兴、双碳绿电）以及国资刚性红线（74号文十不准、严禁超股比或全额连带担保、严禁灰渠违规采购受限芯片、三重一大、尽职免责），明确标出契合点与致命红线冲突。
3. **行文流程与国企/政府领导阅读习惯**：审查是否满足“结论前置、逻辑严密、克制客观、先讲战略政策与商业闭环再讲财务细节、风险表述必须配对可落地缓释措施”，避免把“大饼式招商PPT语言”直接呈报给领导。

必须输出可直接替换原文的【逐段公文改写对照表】，让非专业团队照着改就能拿去上会！严格按 JSON Schema 输出简体中文。`;

const REVIEW_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reportTitle: { type: Type.STRING, description: '审改意见书标题，如《关于〈……〉可研初稿的三大维度交叉审改意见书》' },
    overallReadiness: {
      type: Type.STRING,
      description: '仅允许 "具备上会基础" | "需重点修订后上会" | "存在硬伤暂缓上会"',
    },
    executiveVerdict: { type: Type.STRING, description: '给经办人的直白总评（80-140字），指出当前稿件最大的亮点与最危险的硬伤' },
    topThreeBlockers: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '上会前必须立即改掉的 3 个头号硬伤',
    },
    dataCredibilityAudit: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: '数据可信度总体评价' },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              claimOrMetric: { type: Type.STRING, description: '原文涉及的关键数据或财务假设' },
              credibilityLevel: {
                type: Type.STRING,
                description: '仅允许 "可信" | "存疑需核验" | "明显偏乐观/矛盾"',
              },
              crossValidationBasis: { type: Type.STRING, description: '行业真实基准对比与交叉验证依据' },
              suggestedFix: { type: Type.STRING, description: '具体修正口径与压力测试建议' },
            },
            required: ['claimOrMetric', 'credibilityLevel', 'crossValidationBasis', 'suggestedFix'],
          },
        },
      },
      required: ['summary', 'items'],
    },
    policyMatchAudit: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: '政策与国资合规匹配度总体评价' },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              policyDimension: { type: Type.STRING, description: '对照的政策或国资监管条线' },
              matchStatus: {
                type: Type.STRING,
                description: '仅允许 "高度契合" | "需补强依据" | "存在红线冲突"',
              },
              finding: { type: Type.STRING, description: '原文具体吻合点或冲突问题' },
              alignmentSuggestion: { type: Type.STRING, description: '如何补充政策文件依据或调整合规架构' },
            },
            required: ['policyDimension', 'matchStatus', 'finding', 'alignmentSuggestion'],
          },
        },
      },
      required: ['summary', 'items'],
    },
    flowAndHabitAudit: {
      type: Type.OBJECT,
      properties: {
        summary: { type: Type.STRING, description: '行文逻辑与国企/政府领导阅读习惯总体评价' },
        items: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sectionArea: { type: Type.STRING, description: '对应章节或行文位置' },
              readingHabitProblem: { type: Type.STRING, description: '不符合领导阅读习惯的具体毛病' },
              govSoeStandardRule: { type: Type.STRING, description: '国企/政府公文标准行文法则' },
              improvementAction: { type: Type.STRING, description: '结构重排或语态调整动作' },
            },
            required: ['sectionArea', 'readingHabitProblem', 'govSoeStandardRule', 'improvementAction'],
          },
        },
      },
      required: ['summary', 'items'],
    },
    rewriteComparisons: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          section: { type: Type.STRING, description: '所属章节' },
          originalIssue: { type: Type.STRING, description: '原文中存在风险或表述不规范的片段摘录/概括' },
          revisedExecutiveText: { type: Type.STRING, description: '修改后的国企/政府标准汇报公文表述（可直接复制使用）' },
          rationale: { type: Type.STRING, description: '这样改为什么更受领导认可且更合规' },
        },
        required: ['section', 'originalIssue', 'revisedExecutiveText', 'rationale'],
      },
      description: '3-4组高价值逐段公文改写对照',
    },
    nextStepChecklist: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3-4条上会前最终核查清单',
    },
  },
  required: [
    'reportTitle',
    'overallReadiness',
    'executiveVerdict',
    'topThreeBlockers',
    'dataCredibilityAudit',
    'policyMatchAudit',
    'flowAndHabitAudit',
    'rewriteComparisons',
    'nextStepChecklist',
  ],
};

async function runStructuredJson<T>(
  systemInstruction: string,
  schema: Record<string, unknown>,
  contents: string | { parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> }
): Promise<T> {
  const ai = getAiClient();
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('模型返回为空，请稍后重试。');
      }
      return JSON.parse(rawText) as T;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('API_KEY_INVALID') ||
        msg.includes('PERMISSION_DENIED') ||
        msg.includes('NOT_FOUND') ||
        msg.includes('GEMINI_API_KEY')
      ) {
        break;
      }
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('产业可研助手生成失败');
}

export async function generateFeasibilityDraft(params: {
  input: FeasibilityDraftInput;
  financials: FeasibilityFinancialSummary;
}): Promise<FeasibilityDraftReport> {
  const { input, financials } = params;

  const stressLines = financials.stressScenarios
    .map(
      (s) =>
        `- ${s.name}（${s.assumption}）：IRR=${s.irrPct !== null ? `${s.irrPct}%` : '未收回'}，静态回本=${s.staticPaybackYears !== null ? `${s.staticPaybackYears}年` : '超期未回本'}，动态回本=${s.dynamicPaybackYears !== null ? `${s.dynamicPaybackYears}年` : '超期未回本'}，NPV=${s.npvWan}万元，累计净现金流=${s.cumulativeNetCashWan}万元，研判：${s.verdict}`
    )
    .join('\n');

  const regLines = financials.regressionTable
    .map(
      (r) =>
        `- ${r.factor}（${r.deltaLabel}）：IRR=${r.irrPct !== null ? `${r.irrPct}%` : '未收回'}（变动 ${r.irrDeltaPct !== null ? `${r.irrDeltaPct > 0 ? '+' : ''}${r.irrDeltaPct}%` : '—'}），静态回本=${r.paybackYears !== null ? `${r.paybackYears}年` : '超期'}`
    )
    .join('\n');

  const prompt = `请根据以下经财务模型严格测算的参数，起草一份符合【国企投委会与地方政府领导汇报标准】的《项目可行性分析报告初稿》。

【基础项目信息】
- 项目名称：${input.projectName}
- 实施地点：${input.location}
- 所属行业：${INDUSTRY_DESC[input.industry]}
- 核心呈报对象：${AUDIENCE_DESC[input.audience]}
- 项目规模与分期策略：${input.projectScale}
- 最新产业及地方政策背景：${input.policyContext}
- 商业模式、消纳/渠道嫁接与风控思路：${input.businessModelNote}

【资金与成本结构】
- 总投资额（CapEx）：${input.totalCapexWan} 万元（其中四级国资自有出资 ${input.ownEquityWan} 万元，外部银行/金租/协同融资 ${financials.leverageDebtWan} 万元，综合融资成本 ${input.financingRatePct}%）
- 达产年预计营收：${input.annualRevenueWan} 万元；达产年刚性运营成本（OpEx）：${input.annualOpexWan} 万元
- 核心敏感驱动因素：${input.keyDriverLabel}（基准假设 ${input.utilizationPct}%，首年爬坡 ${input.rampUpYear1Pct}%，测算周期 ${input.horizonYears} 年）

【系统已核算的 IRR、回本与回归压力测试真实数据（行文必须精准引用，不可篡改）】
- 基准全投资 IRR：${financials.baseIrrPct !== null ? `${financials.baseIrrPct}%` : '测算周期内未达正回报'}
- 基准静态投资回收期：${financials.staticPaybackYears !== null ? `${financials.staticPaybackYears} 年` : '超出测算周期'}；动态回收期（8%折现）：${financials.dynamicPaybackYears !== null ? `${financials.dynamicPaybackYears} 年` : '超出测算周期'}
- 净现值 NPV（8%折现）：${financials.npvWan} 万元；盈亏平衡保本${input.keyDriverLabel}：约 ${financials.breakevenUtilizationPct}%
- 三情景压力测试：
${stressLines}
- 单因素回归敏感性测算：
${regLines}

请严格按国企/政府公文习惯输出完整 7 章内容，并在“第六章”与“先决条件”中把行业卡点与压力测试底线写成保护公司的合规安全阀。`;

  return runStructuredJson<FeasibilityDraftReport>(
    DRAFT_SYSTEM_INSTRUCTION,
    DRAFT_SCHEMA,
    prompt
  );
}

export async function reviewFeasibilityDocument(params: {
  audience: ReportAudience;
  industry: IndustryTrack;
  documentText?: string;
  fileName?: string;
  pdfBase64?: string;
  focusNotes?: string;
}): Promise<FeasibilityReviewReport> {
  const headerPrompt = `请对用户提供的可行性研究报告文稿进行【三大核心维度交叉审改】：
1. 数据可信度（必须做行业基准交叉验证，指出乐观假设、漏项成本或财务逻辑矛盾）
2. 政策与国资合规匹配度（对照最新行业政策及国资监管红线）
3. 行文流程与阅读习惯（对照国企集团高层与政府领导标准公文习惯，指出结构与语气问题）

【背景设定】
- 目标呈报对象：${AUDIENCE_DESC[params.audience]}
- 项目所属行业：${INDUSTRY_DESC[params.industry]}
${params.fileName ? `- 上传文件名：${params.fileName}` : ''}
${params.focusNotes ? `- 用户额外关注的审查重点：${params.focusNotes}` : ''}

请给出犀利务实的审改意见，并在 rewriteComparisons 中提供 3–4 组可直接粘贴替换原文的标准政企公文改写对照。`;

  if (params.pdfBase64) {
    return runStructuredJson<FeasibilityReviewReport>(REVIEW_SYSTEM_INSTRUCTION, REVIEW_SCHEMA, {
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: params.pdfBase64,
          },
        },
        {
          text: `${headerPrompt}\n\n请仔细阅读所附 PDF 可研报告文件内容并完成全面审查。`,
        },
      ],
    });
  }

  const trimmed = (params.documentText || '').trim().slice(0, 28000);
  return runStructuredJson<FeasibilityReviewReport>(
    REVIEW_SYSTEM_INSTRUCTION,
    REVIEW_SCHEMA,
    `${headerPrompt}\n\n【待审查可研报告原文内容】\n${trimmed}`
  );
}

const EXTRACT_SYSTEM_INSTRUCTION = `你是一位国资投资项目财务建模与可研结构化提取专家。
你的任务是从用户上传或粘贴的外部可研报告（PDF 或文本）中，精准抽取出核心产业参数与财务建模数字，转换成系统可管理的标准项目数据结构，以便立即进行 IRR 测算、回归压力测试与重新起草国企/政府汇报版初稿。

提取规则：
1. 凡原文明确提到的数字（总投资、自有出资、融资利率、年营收、年成本、测算周期、利用率等），必须准确换算为“万元”和百分比（%）。
2. 若原文遗漏了某项关键财务参数（如未写融资利率、未写运营成本或测算周期），请结合该行业常规国资审慎基准补齐合理估算值，并在 extractionNotes 中明确告知用户“哪些数字是原文提取、哪些是按行业基准暂估、建议人工复核”。
3. industry 仅允许输出 "agriculture" | "new_energy" | "compute_ai" | "policy_infra" | "general_trade"；audience 仅允许输出 "gov_leader" | "soe_exec" | "joint_committee"。
4. 严格按照 JSON Schema 输出简体中文。`;

const EXTRACT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    projectName: { type: Type.STRING, description: '提炼出的项目全称' },
    location: { type: Type.STRING, description: '项目实施地点或市场区域' },
    industry: {
      type: Type.STRING,
      description: '仅允许 "agriculture" | "new_energy" | "compute_ai" | "policy_infra" | "general_trade"',
    },
    audience: {
      type: Type.STRING,
      description: '仅允许 "gov_leader" | "soe_exec" | "joint_committee"',
    },
    projectScale: { type: Type.STRING, description: '项目规模、产能或分期建设计划摘要' },
    policyContext: { type: Type.STRING, description: '提取或匹配到的最新产业与地方政策背景' },
    businessModelNote: { type: Type.STRING, description: '商业模式、盈利逻辑、渠道或订单消纳说明' },
    totalCapexWan: { type: Type.NUMBER, description: '总投资额（万元），正数' },
    ownEquityWan: { type: Type.NUMBER, description: '企业自有出资额（万元），非负数且不超过总投资' },
    financingRatePct: { type: Type.NUMBER, description: '年化融资利率（%），如 4.5' },
    annualRevenueWan: { type: Type.NUMBER, description: '达产年预计营业收入（万元）' },
    annualOpexWan: { type: Type.NUMBER, description: '达产年运营成本含电费运维（万元）' },
    utilizationPct: { type: Type.NUMBER, description: '基准利用率/上架率（%），20-100' },
    horizonYears: { type: Type.INTEGER, description: '项目测算周期（年），3-15' },
    rampUpYear1Pct: { type: Type.NUMBER, description: '首年爬坡达产比例（%），20-100' },
    keyDriverLabel: { type: Type.STRING, description: '核心敏感变量名称，如“算力实际消纳上架率”或“年出货达标率”' },
    extractionNotes: {
      type: Type.STRING,
      description: '向用户简要说明哪些核心数据直接来自原文、哪些缺失参数由系统按国资审慎口径暂估，便于入库后复核修改（80-150字）',
    },
  },
  required: [
    'projectName',
    'location',
    'industry',
    'audience',
    'projectScale',
    'policyContext',
    'businessModelNote',
    'totalCapexWan',
    'ownEquityWan',
    'financingRatePct',
    'annualRevenueWan',
    'annualOpexWan',
    'utilizationPct',
    'horizonYears',
    'rampUpYear1Pct',
    'keyDriverLabel',
    'extractionNotes',
  ],
};

export async function extractFeasibilityProjectFromDoc(params: {
  audience: ReportAudience;
  industry: IndustryTrack;
  documentText?: string;
  fileName?: string;
  pdfBase64?: string;
}): Promise<{ input: FeasibilityDraftInput; extractionNotes: string }> {
  const instructionText = `请从这份可研报告中提取标准项目参数并转换为可管理的财务测算项目：
- 默认呈报对象倾向：${params.audience}
- 默认行业倾向：${params.industry}
${params.fileName ? `- 原始文件名：${params.fileName}` : ''}`;

  const raw = params.pdfBase64
    ? await runStructuredJson<FeasibilityDraftInput & { extractionNotes: string }>(
        EXTRACT_SYSTEM_INSTRUCTION,
        EXTRACT_SCHEMA,
        {
          parts: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: params.pdfBase64,
              },
            },
            { text: `${instructionText}\n\n请读取 PDF 全文提取结构化项目参数。` },
          ],
        }
      )
    : await runStructuredJson<FeasibilityDraftInput & { extractionNotes: string }>(
        EXTRACT_SYSTEM_INSTRUCTION,
        EXTRACT_SCHEMA,
        `${instructionText}\n\n【上传/粘贴的可研报告正文】\n${(params.documentText || '').trim().slice(0, 28000)}`
      );

  const validIndustries: IndustryTrack[] = [
    'agriculture',
    'new_energy',
    'compute_ai',
    'policy_infra',
    'general_trade',
  ];
  const validAudiences: ReportAudience[] = ['gov_leader', 'soe_exec', 'joint_committee'];

  const totalCapexWan = Math.max(50, Math.round(Number(raw.totalCapexWan) || 1000));
  const ownEquityWan = Math.max(
    0,
    Math.min(totalCapexWan, Math.round(Number(raw.ownEquityWan) || Math.round(totalCapexWan * 0.2)))
  );

  const sanitizedInput: FeasibilityDraftInput = {
    projectName: (raw.projectName || params.fileName || '导入可研项目').trim(),
    location: (raw.location || '待补充实施区域').trim(),
    industry: validIndustries.includes(raw.industry) ? raw.industry : params.industry,
    audience: validAudiences.includes(raw.audience) ? raw.audience : params.audience,
    projectScale: (raw.projectScale || '待补充项目建设规模与分期安排').trim(),
    policyContext: (raw.policyContext || '待结合最新地方与国资产业政策补充').trim(),
    businessModelNote: (raw.businessModelNote || '待补充商业闭环与回款路径').trim(),
    totalCapexWan,
    ownEquityWan,
    financingRatePct: Math.max(0, Math.min(15, Number(raw.financingRatePct) || 4.5)),
    annualRevenueWan: Math.max(0, Math.round(Number(raw.annualRevenueWan) || 500)),
    annualOpexWan: Math.max(0, Math.round(Number(raw.annualOpexWan) || 260)),
    utilizationPct: Math.max(20, Math.min(100, Math.round(Number(raw.utilizationPct) || 75))),
    horizonYears: Math.max(3, Math.min(15, Math.round(Number(raw.horizonYears) || 6))),
    rampUpYear1Pct: Math.max(20, Math.min(100, Math.round(Number(raw.rampUpYear1Pct) || 70))),
    keyDriverLabel: (raw.keyDriverLabel || '核心业务利用率').trim(),
  };

  return {
    input: sanitizedInput,
    extractionNotes:
      raw.extractionNotes || '已自动提取原文核心参数，建议入库后核对投资、营收与成本口径。',
  };
}

