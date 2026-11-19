import { LIGHT_ASSET_MODELS } from '../data/domainData';
import { LightAssetModel, SandboxConfig } from '../types';

export interface SandboxProjection {
  singleProjectRiskCapWan: number;
  creditLeverageMinWan: number;
  creditLeverageMaxWan: number;
  maxConcurrentProjects: number;
  recommendedModels: {
    model: LightAssetModel;
    priorityLabel: '优先落地' | '协同备选' | '谨慎观察';
    rationale: string;
  }[];
  leanGovernancePlan: {
    role: string;
    internalAllocation: string;
    outsourceBoundary: string;
  }[];
  redlineTriggers: string[];
  summaryForAi: string;
}

export function computeSandboxProjection(config: SandboxConfig): SandboxProjection {
  const hasCredit = config.resources.includes('soe_credit');
  const hasLicenses = config.resources.includes('licenses_quotas');
  const hasBankLine = config.resources.includes('bank_credit_line');
  const hasPolicy = config.resources.includes('policy_channel');
  const hasOverseas = config.resources.includes('overseas_clients');

  // 1. 单笔净敞口上限：严控模式下不超过可动用资金 25% 且不突破自主投资上限
  const exposureRatio =
    config.strictness === 'strict_sasac'
      ? 0.25
      : config.strictness === 'balanced'
      ? 0.35
      : 0.45;
  const rawRiskCap = Math.round(config.liquidCapitalWan * exposureRatio);
  const singleProjectRiskCapWan = Math.max(
    50,
    Math.min(rawRiskCap, config.investAuthorityLimitWan)
  );

  // 2. 信用/金融工具撬动区间（表外授信、L/C、保函、中信保保单融资）
  let minMult = 1.5;
  let maxMult = 3.0;
  if (hasCredit) {
    minMult += 1.0;
    maxMult += 1.5;
  }
  if (hasBankLine) {
    minMult += 1.5;
    maxMult += 2.5;
  }
  if (hasPolicy) {
    minMult += 0.5;
    maxMult += 1.0;
  }
  if (config.strictness === 'strict_sasac') {
    maxMult = Math.min(maxMult, 7.0);
  }
  const creditLeverageMinWan = Math.round(config.liquidCapitalWan * minMult);
  const creditLeverageMaxWan = Math.round(config.liquidCapitalWan * maxMult);

  // 3. 精简团队并发承载项目上限（确保不相容岗位不坍塌）
  const maxConcurrentProjects =
    config.headcount <= 3
      ? 1
      : config.headcount <= 6
      ? 2
      : config.headcount <= 10
      ? 3
      : 5;

  // 4. 筛选并排序适配的轻资产盘活模式
  const scoredModels = LIGHT_ASSET_MODELS.map((model) => {
    let score = 0;
    const reasons: string[] = [];

    if (model.applicableTracks.includes(config.industry)) {
      score += 3;
      reasons.push('精准匹配所选赛道');
    }

    if (config.liquidCapitalWan <= 500 && model.capitalLevel === 'very_low') {
      score += 3;
      reasons.push('极低现金占用，契合当前资金池');
    } else if (config.liquidCapitalWan <= 1000 && model.capitalLevel !== 'medium') {
      score += 2;
      reasons.push('资金占用可控');
    } else if (config.liquidCapitalWan <= 400 && model.capitalLevel === 'medium') {
      score -= 3;
      reasons.push('出资门槛偏高，容易沉淀现金流');
    }

    if (config.headcount <= 6 && model.headcountLevel === 'lean') {
      score += 2;
      reasons.push('适配 6 人以内精简编制');
    }

    if (config.consolidationPreference === 'no_consolidate' && model.consolidationImpact === '不并表') {
      score += 2;
      reasons.push('不并表隔离经营风险');
    }

    if (hasCredit && hasBankLine && model.id === 'model_agency_sinosure') {
      score += 3;
      reasons.push('可充分放大国资信用与银行开证额度');
    }
    if (hasLicenses && model.id === 'model_quota_offshore') {
      score += 3;
      reasons.push('直接盘活存量牌照与配额');
    }
    if (hasPolicy && model.id === 'model_policy_consortium') {
      score += 3;
      reasons.push('紧扣政策预算，逆周期回款确定性高');
    }
    if (hasOverseas && model.id === 'model_agency_sinosure') {
      score += 2;
      reasons.push('既有海外买家可快速申批中信保限额');
    }
    if (config.strictness === 'strict_sasac' && model.soeRiskLevel === '中高（严守红线）') {
      score -= 2;
      reasons.push('需严防演变为指定上下游融资性贸易');
    }

    const priorityLabel: '优先落地' | '协同备选' | '谨慎观察' =
      score >= 7 ? '优先落地' : score >= 4 ? '协同备选' : '谨慎观察';

    return {
      model,
      score,
      priorityLabel,
      rationale: reasons.slice(0, 2).join('；') || '需结合具体项目对手方信用评估',
    };
  }).sort((a, b) => b.score - a.score);

  // 5. 按真实编制生成“内控底线 + 外部外包”分工表
  const leanGovernancePlan =
    config.headcount <= 5
      ? [
          {
            role: '总经理 / 投决牵头（1人）',
            internalAllocation: '统筹上级集团汇报、银行高层授信对接、外派参股董事及三重一大决策',
            outsourceBoundary: '不亲自下场做日常单证与琐碎执行',
          },
          {
            role: '业务与合规统筹（1–2人）',
            internalAllocation: '对接优质民企/核心央企渠道、主导对手方穿透核查与四流核验',
            outsourceBoundary: '前端获客与海外清关物流全部依托白名单合作方或持牌外综服',
          },
          {
            role: '财务与资金风控（1人）',
            internalAllocation: '独立保管网银复核盾、盯专户回款、银行保理/锁汇与净额法核算',
            outsourceBoundary: '严禁与业务经办、公章保管由同一人兼任',
          },
          {
            role: '常年外脑库（外包）',
            internalAllocation: '建立 1–2 家库内律所 + 1 家审计评估机构的低年费按单响应机制',
            outsourceBoundary: '承接涉外合同审查、股权尽调、资产评估及年度审计底稿',
          },
        ]
      : [
          {
            role: '管理层与投委（1–2人）',
            internalAllocation: '负责集团战略协同、自主投权边界把控、银行综合授信谈判与投后一票否决',
            outsourceBoundary: '严守集体决策程序，保留完整决策底稿',
          },
          {
            role: '涉外业务与供应链组（2–3人）',
            internalAllocation: '深耕农业/新能源/政策项目赛道，抓核心买方白名单与中信保限额落地',
            outsourceBoundary: '境外仓储、检验检疫（SGS/CCIC）及国际货代采用第三方持牌外包',
          },
          {
            role: '专职风控法务与单证（1–2人）',
            internalAllocation: '独立审单控货权、中登网质押核查、合同背靠背审签与预警止损台账',
            outsourceBoundary: '重大跨境架构、境外仲裁及专项尽调由外聘专业机构出具独立意见',
          },
          {
            role: '财务资金统筹（1–2人）',
            internalAllocation: '负责授信/保函池调度、外汇收付核销、远期锁汇与月度现金流压力测试',
            outsourceBoundary: '严格执行制单与复核分离、印章与资金分离',
          },
        ];

  // 6. 动态触发的刚性合规预警
  const redlineTriggers: string[] = [];
  if (config.liquidCapitalWan <= 500) {
    redlineTriggers.push(
      `自有可动用资金仅 ${config.liquidCapitalWan} 万元：严禁单笔重仓长期非上市股权，否则首单即耗尽全公司流动性。`
    );
  }
  if (config.headcount <= 5) {
    redlineTriggers.push(
      `当前编制仅 ${config.headcount} 人：同时推进项目数务必压控在 ${maxConcurrentProjects} 个以内，且必须落实“业务—印章—网银复核”三权分立。`
    );
  }
  if (config.strictness === 'strict_sasac') {
    redlineTriggers.push(
      '国资强监管口径下，任何代理/供应链业务均须按新收入准则采用“净额法”核算，严禁为冲营收规模触碰74号文“十不准”空转走单红线。'
    );
  }
  if (config.investAuthorityLimitWan > config.liquidCapitalWan) {
    redlineTriggers.push(
      `自主投资权限（${config.investAuthorityLimitWan} 万元）高于当前账面现金（${config.liquidCapitalWan} 万元）：切忌为用满权限而违规举债配资，应优先以“牌照/渠道估值折股 + 银行保函”替代现金出资。`
    );
  }

  const summaryForAi = [
    `单项目净风险敞口建议上限：${singleProjectRiskCapWan} 万元`,
    `依托国资信用与表外金融工具可撬动业务规模区间：${creditLeverageMinWan}–${creditLeverageMaxWan} 万元`,
    `当前精简编制（${config.headcount} 人）安全并发项目承载上限：${maxConcurrentProjects} 个`,
    `系统初筛优先级最高的前两项盘活模式：${scoredModels
      .slice(0, 2)
      .map((s) => `${s.model.name}（${s.rationale}）`)
      .join('；')}`,
    `当前触发的关键边界约束：${redlineTriggers.join(' ')}`,
  ].join('\n');

  return {
    singleProjectRiskCapWan,
    creditLeverageMinWan,
    creditLeverageMaxWan,
    maxConcurrentProjects,
    recommendedModels: scoredModels.slice(0, 4).map(({ model, priorityLabel, rationale }) => ({
      model,
      priorityLabel,
      rationale,
    })),
    leanGovernancePlan,
    redlineTriggers,
    summaryForAi,
  };
}
