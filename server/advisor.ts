import { GoogleGenAI, Type } from '@google/genai';
import type {
  AdvisoryTopic,
  EntityType,
  GuidanceMode,
  IndustryTrack,
  SandboxConfig,
  StructuredAdvisoryReport,
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

const ADVISOR_SYSTEM_INSTRUCTION = `你是一位深耕外贸与跨境投资（覆盖现代农业、新能源、算力数字基建及政策相关行业）的资深企业管理实操总顾问，同时非常擅长带“人手少、跨界摸索、专业度尚在积累期的精简团队”。

你的核心定位与实战特质：
1. 综合能力极强：横跨公司治理、国资监管（74号文“十不准”、三重一大、净额法/全额法、严禁超股比担保、尽职免责）、银行授信与供应链杠杆（信用证L/C、保函、无追索保理、中信保、独立监管仓）、农业/消费渠道嫁接（防跳单、轻资产试销、拒盲目重资产建基地）以及算力中心/政策项目可研实务（1000P算力拆解、GPU/HBM受限与国产替代、上架消纳率、分期先决条件）。
2. 不讲空泛制造端理论，句句紧扣“低资金、少人员、国资合规底线、真实回款闭环”。
3. 极其理解国企一线干事的真实处境：既要守住合规与本金安全，有时又必须承接领导意图推进可研或地方合作。你会教用户如何用“分期试点 + 先决条件（CP）+ 轻资产验证”的高情商专业办法，既推进领导关切、又给公司装好安全阀。
4. 面对新手/初学者模式（beginner_guided）时：
   - 必须像经验老道的导师手把手带徒弟一样，用大白话把行业与金融黑话翻译透（填写 jargonGlossary）；
   - 明确列出“下一场会面/谈判必须问对方哪 3–4 个关键底牌”（填写 guidedDiscoveryQuestions）；
   - 给出具体的“向上汇报与可研平衡话术”（填写 leadershipAlignmentTip）。
5. 严格区分“国企/国资四级主体”与“民营涉外主体”的管控口径差异，严格按给定 JSON Schema 输出完整的中文简体结构化报告。`;

const REPORT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    headline: {
      type: Type.STRING,
      description: '简洁有力的研报主标题（15-28字，无符号装饰）',
    },
    executiveSummary: {
      type: Type.STRING,
      description: '一段直击本质、通俗易懂的核心总评（80-150字），直接点出该走哪条路、别踩哪个坑',
    },
    entityDiffNote: {
      type: Type.STRING,
      description: '明确指出本议题下国企（尤其国资四级公司）与民营涉外主体的管控及合规差异（60-120字）',
    },
    leadershipAlignmentTip: {
      type: Type.STRING,
      description: '向上汇报、可研推进或平衡领导意图与风控底线的务实话术与架构技巧（60-120字）',
    },
    diagnosisPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3-4条直指痛点、行业真相与核心卡点的白话诊断结论',
    },
    options: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: '方案名称' },
          fitLabel: { type: Type.STRING, description: '定位简标，如“首选轻资试水”' },
          mechanism: { type: Type.STRING, description: '通俗易懂的具体运转步骤、交易结构与落地逻辑' },
          capitalRequirement: { type: Type.STRING, description: '资金占用与银行/金融杠杆撬动方式' },
          staffingNeed: { type: Type.STRING, description: '精简非专业团队怎么分工、哪些环节借外脑外包' },
          complianceBoundary: { type: Type.STRING, description: '必须严守的合规边界与会计/监管口径' },
        },
        required: [
          'title',
          'fitLabel',
          'mechanism',
          'capitalRequirement',
          'staffingNeed',
          'complianceBoundary',
        ],
      },
      description: '2-3套可对比、适合小团队落地的备选方案',
    },
    riskAlerts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          level: {
            type: Type.STRING,
            description: '仅允许 "high" 或 "medium"',
          },
          title: { type: Type.STRING, description: '风险点或卡点名称' },
          detail: { type: Type.STRING, description: '触发场景、新手容易掉进去的坑与避坑说明' },
          redlineBasis: { type: Type.STRING, description: '对应国资/银行/行业实务依据或风控准则' },
        },
        required: ['level', 'title', 'detail', 'redlineBasis'],
      },
      description: '3-4条高危或关键风险预警',
    },
    actionLevers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          phase: { type: Type.STRING, description: '实施阶段，如“第 1 周 · 摸底核验”' },
          action: { type: Type.STRING, description: '手把手的具体执行步骤' },
          deliverable: { type: Type.STRING, description: '形成的可留痕交付物/表单/底稿' },
          owner: { type: Type.STRING, description: '建议牵头岗位或低成本外包协作方' },
        },
        required: ['phase', 'action', 'deliverable', 'owner'],
      },
      description: '3-4个分阶段落地抓手',
    },
    precautions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3-4条一线操盘最容易忽略的关键注意事项',
    },
    jargonGlossary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          term: { type: Type.STRING, description: '涉及到的银行/供应链/算力/农业专业黑话术语' },
          plainMeaning: { type: Type.STRING, description: '给零基础初学者听得懂的大白话解释' },
          watchOut: { type: Type.STRING, description: '这个黑话背后最容易隐藏的坑或谈判要点' },
        },
        required: ['term', 'plainMeaning', 'watchOut'],
      },
      description: '2-4条本议题涉及的关键黑话白话速译（帮助非专业团队快速听懂行话）',
    },
    guidedDiscoveryQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3-4个“下一场跟合作方/银行/专家开会时直接照着问的核查问题”，帮初学者快速摸清对方底牌',
    },
    followUpQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3个循序渐进引导用户下一步深入研讨的高价值追问',
    },
  },
  required: [
    'headline',
    'executiveSummary',
    'entityDiffNote',
    'leadershipAlignmentTip',
    'diagnosisPoints',
    'options',
    'riskAlerts',
    'actionLevers',
    'precautions',
    'jargonGlossary',
    'guidedDiscoveryQuestions',
    'followUpQuestions',
  ],
};

async function generateWithRetry(prompt: string): Promise<StructuredAdvisoryReport> {
  const ai = getAiClient();
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction: ADVISOR_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: REPORT_RESPONSE_SCHEMA,
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        throw new Error('模型返回为空，请稍后重试。');
      }

      const parsed = JSON.parse(rawText) as StructuredAdvisoryReport;
      if (Array.isArray(parsed.riskAlerts)) {
        parsed.riskAlerts = parsed.riskAlerts.map((r) => ({
          ...r,
          level: r.level === 'high' ? 'high' : 'medium',
        }));
      }
      return parsed;
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

  throw lastError instanceof Error ? lastError : new Error('顾问研判服务调用失败');
}

const ENTITY_MAP: Record<EntityType, string> = {
  soe_tier4: '国资四级子公司（拥有自主投资权限，但资金少、人手紧、受国资监管全口径约束）',
  soe_group: '国企二级/三级产业平台公司',
  private_crossborder: '民营涉外贸易与跨境投资主体',
};

const INDUSTRY_MAP: Record<IndustryTrack, string> = {
  agriculture: '现代农业与农产品涉外/跨区域产销嫁接',
  new_energy: '新能源、光伏与储能跨境业务',
  compute_ai: '算力中心（如1000P算力舱）、GPU/HBM供应链与数字基建可研',
  policy_infra: '政策导向、地方园区及涉外配套项目',
  general_trade: '综合外贸、供应链金融与银行杠杆统筹',
};

const TOPIC_MAP: Record<AdvisoryTopic, string> = {
  asset_revitalization: '项目考察摸底与轻资产盘活破局',
  org_lean_control: '人少非专业团队的分工、借外脑与风控架构',
  contract_review: '可研编制、合同条款与交易结构审查',
  supply_chain: '涉外供应链与独立货权控制',
  fund_trade_chain: '银行授信对接、金融黑话拆解与杠杆统筹',
  crossborder_compliance: '国资红线与跨境合规审查',
};

export async function runInteractiveConsultation(params: {
  entityType: EntityType;
  industry: IndustryTrack;
  topic: AdvisoryTopic;
  guidanceMode?: GuidanceMode;
  userPrompt: string;
  historySummary?: string;
}): Promise<StructuredAdvisoryReport> {
  const isBeginner = (params.guidanceMode ?? 'beginner_guided') === 'beginner_guided';

  const contextLines = [
    `【咨询主体属性】${ENTITY_MAP[params.entityType] || params.entityType}`,
    `【核心业务赛道】${INDUSTRY_MAP[params.industry] || params.industry}`,
    `【本次研讨议题】${TOPIC_MAP[params.topic] || params.topic}`,
    `【沟通引导模式】${
      isBeginner
        ? '零基础循序引导模式（用户团队人少且跨界，对具体行业/银行供应链尚不熟悉。请务必用大白话拆解黑话、一步步引导路线、手把手给出下一场跟合作方或银行谈判必问的底牌问题，并兼顾国企向上汇报与风控平衡）'
        : '资深实操直出模式（直接切入核心交易架构、合规条款、财务核算口径与谈判筹码，精炼犀利）'
    }`,
  ];

  if (params.historySummary) {
    contextLines.push(`【前序研讨上下文摘要】\n${params.historySummary}`);
  }

  contextLines.push(`【用户抛出的具体实操问题】\n${params.userPrompt}`);
  contextLines.push(
    '请以一线综合实力极强的资深企业管理与投融顾问身份，输出结构清晰、接地气、可直接照着执行和拿去开会的结构化诊断研报。'
  );

  return generateWithRetry(contextLines.join('\n\n'));
}

export async function runSandboxBrief(params: {
  config: SandboxConfig;
  computedSummary: string;
}): Promise<StructuredAdvisoryReport> {
  const prompt = [
    '用户正在【国资四级公司资产盘活推演沙盘】中调节了本企业真实约束参数，请据此生成一份可直接提交给公司班子/上级主管领导研讨、且对非专业小团队也通俗易懂的定制化《轻资产盘活与合规落地研判简报》。',
    `【企业当前参数】
- 可动用自有资金：${params.config.liquidCapitalWan} 万元
- 核心专职编制人数：${params.config.headcount} 人
- 自主投资单笔权限上限：${params.config.investAuthorityLimitWan} 万元
- 具备的可盘活存量资源：${params.config.resources.join('、') || '暂无勾选'}
- 重点聚焦行业赛道：${INDUSTRY_MAP[params.config.industry]}
- 国资合规监管口径：${params.config.strictness === 'strict_sasac' ? '强监管（严守74号文十不准、净额法、三重一大）' : params.config.strictness === 'balanced' ? '均衡稳健（合规底线优先，兼顾灵活激励）' : '市场化敏捷（在授权边界内追求高效试水）'}
- 并表与财务诉求：${params.config.consolidationPreference === 'no_consolidate' ? '优先不并表/轻资产，控负债与风险隔离' : params.config.consolidationPreference === 'consolidate_revenue' ? '兼顾合规表内业绩与现金流' : '灵活权衡，以利润与回款质量优先'}`,
    `【沙盘已测算的关键边界指标】\n${params.computedSummary}`,
    '请围绕该参数组合，输出精准的路线卡点诊断、2-3套最优轻资产组合方案、高危合规预警、90天落地排期、关键黑话白话翻译以及下一轮对外谈判必问清单。',
  ].join('\n\n');

  return generateWithRetry(prompt);
}

export async function runComplianceRemediation(params: {
  entityType: EntityType;
  gaps: { code: string; title: string; status: string; note: string }[];
}): Promise<StructuredAdvisoryReport> {
  const gapLines = params.gaps
    .map(
      (g) =>
        `- [${g.code}] ${g.title}（当前状态：${g.status === 'high_risk' ? '高危缺口' : '待整改'}${g.note ? `；企业自注：${g.note}` : ''}）`
    )
    .join('\n');

  const prompt = [
    `【主体属性】${ENTITY_MAP[params.entityType]}`,
    '用户在【涉外合规风控自检库】中标记了以下尚未落实的高危缺口或待整改项：',
    gapLines,
    '请以人少事多、团队专业度一般但必须守住底线的务实风格，针对上述具体缺口生成一份通俗易懂的《风控缺口专项整改与尽职免责补漏方案》，明确整改优先级、低成本替代抓手（外包/标准表单/银行工具）以及绝不可妥协的红线。',
  ].join('\n\n');

  return generateWithRetry(prompt);
}
