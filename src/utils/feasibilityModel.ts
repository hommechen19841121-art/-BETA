import {
  FeasibilityDraftInput,
  FeasibilityFinancialSummary,
  RegressionSensitivityRow,
  ReportAudience,
  StressScenarioRow,
} from '../types';

export const AUDIENCE_LABELS: Record<ReportAudience, string> = {
  gov_leader: '汇报地方政府领导 / 发改与园区管委会',
  soe_exec: '汇报国企集团党委会 / 董事会 / 投委会',
  joint_committee: '政企联合专题汇报（兼顾地方产业与国资考核）',
};

export const FEASIBILITY_PRESETS: {
  id: string;
  label: string;
  tag: string;
  input: FeasibilityDraftInput;
}[] = [
  {
    id: 'preset_taierzhuang_1000p',
    label: '台儿庄 1000P 智算中心（一期 200P 算力舱试点）',
    tag: '算力基建 · 总规分期防风险',
    input: {
      projectName: '台儿庄区域绿色智算中心（总规1000P·一期200P试点）项目',
      location: '山东省枣庄市台儿庄区',
      industry: 'compute_ai',
      audience: 'joint_committee',
      projectScale: '总体规划 1000P（FP16），采用算力舱模块化分期建设；一期先行落地 200P 异构/国产算力试点',
      policyContext:
        '紧扣国家“东数西算”、全国一体化算力网、山东省绿色算力高质量发展及地方数字经济招商政策，优先论证绿电直供、电价补贴与国产自主可控算力适配。',
      businessModelNote:
        '一期依托算力舱缩短工期，采取“国资小股引导 + 产投/金融租赁分摊设备投入 + 前置锁定政务/高校/工业推理订单”模式；明确一期上架消纳率达 75% 后再触发二期扩容，避开受限海外 GPU/HBM 断供风险。',
      totalCapexWan: 4800,
      ownEquityWan: 600,
      financingRatePct: 4.5,
      annualRevenueWan: 2450,
      annualOpexWan: 1180,
      utilizationPct: 75,
      horizonYears: 6,
      rampUpYear1Pct: 65,
      keyDriverLabel: '算力实际消纳上架率',
    },
  },
  {
    id: 'preset_taierzhuang_mushroom',
    label: '台儿庄工业化菌棒轻资产渠道嫁接项目',
    tag: '现代农业 · 拒盲目建200亩基地',
    input: {
      projectName: '台儿庄工业化菌棒产销协同与沪滇渠道嫁接项目',
      location: '台儿庄（生产端）+ 上海 / 云南（销区端）',
      industry: 'agriculture',
      audience: 'soe_exec',
      projectScale: '暂缓新建 200 亩重资产基地，依托合作方现成无菌厂房年产 600 万棒富余产能，开展排他渠道嫁接与供应链服务',
      policyContext:
        '契合国家设施农业现代化、乡村振兴产业联农带农及跨区域农产品冷链保供政策，严格落实国资委“严控非主业重资产盲目扩张”及74号文“十不准”合规要求。',
      businessModelNote:
        '鉴于山东头部企业已占行业 60% 份额且竞争激烈，本项目不新建固定厂房，而是发挥我方上海/云南成熟营销通道与国资信用，先签 12 个月排他试销协议，货款走我方专户、质量与发菇损耗归厂方，验证稳定复购后再考虑轻股权绑定。',
      totalCapexWan: 450,
      ownEquityWan: 200,
      financingRatePct: 3.8,
      annualRevenueWan: 680,
      annualOpexWan: 495,
      utilizationPct: 80,
      horizonYears: 5,
      rampUpYear1Pct: 75,
      keyDriverLabel: '沪滇渠道实际出货达标率',
    },
  },
  {
    id: 'preset_new_energy_park',
    label: '外向型冷链园区分布式绿电与储能配套项目',
    tag: '新能源 · 政策预算与背靠背回款',
    input: {
      projectName: '涉农外贸冷链园区分布式光伏与工商业储能配套项目',
      location: '地方省级外贸转型升级基地园区',
      industry: 'new_energy',
      audience: 'gov_leader',
      projectScale: '屋顶分布式光伏 6MW + 工商业储能 8MWh，采用国资牵头联合体与背靠背专业分包模式',
      policyContext:
        '契合国家“双碳”目标、绿色外贸碳足迹认证需求及工商业峰谷电价差政策，符合政策性银行绿色信贷低息贴息支持方向。',
      businessModelNote:
        '依托园区冷链企业稳定高负荷用电需求（自发自用余电上网），叠加峰谷套利与绿色出口碳抵消价值；银行绿色贷款覆盖 70% 设备投资，回款纳入封闭电费共管专户。',
      totalCapexWan: 2400,
      ownEquityWan: 500,
      financingRatePct: 3.6,
      annualRevenueWan: 690,
      annualOpexWan: 210,
      utilizationPct: 88,
      horizonYears: 8,
      rampUpYear1Pct: 85,
      keyDriverLabel: '园区电费消纳与峰谷价差实现率',
    },
  },
];

export const SAMPLE_FLAWED_FEASIBILITY_TEXT = `关于在台儿庄新建1000P智算中心项目的可行性研究报告（草稿节选）

一、项目基本情况
本项目拟在台儿庄一次性建设1000P高端智算中心，采购国际顶级旗舰GPU集群及配套算力舱，总投资预计仅需8000万元，其中我四级公司自有资金出资500万元，其余7500万元全部由我公司提供全额连带担保向商业银行申请流动资金贷款解决。

二、市场前景与收益测算
目前人工智能爆发，算力供不应求，项目建成后首月即可实现100%上架满载运行。按每P每年租金18万元测算，年营业收入可达1.8亿元，年运营电费与运维成本仅需2000万元，年净利润高达1.6亿元，静态投资回收期仅0.5年，内部收益率（IRR）高达195%，几乎没有任何市场风险。

三、实施与采购计划
虽然海外芯片存在一定供货紧张，但某合作贸易商承诺可通过海外第三方个人渠道代采顶级GPU与HBM模块，保证现货交付，无需复杂审批流程。建议领导尽快批准一次性拨付全部资金，先建好机房再慢慢找大模型客户签约。`;

/**
 * 计算给定现金流序列的内部收益率（IRR，百分比）
 * 使用稳健二分法求解 [-50%, 300%] 区间，避免 Newton-Raphson 发散
 */
function solveIrrPct(cashflows: number[]): number | null {
  if (cashflows.length < 2 || cashflows[0] >= 0) return null;
  const totalInflow = cashflows.slice(1).reduce((acc, v) => acc + v, 0);
  if (totalInflow <= 0) return null;

  const npvAt = (rate: number) =>
    cashflows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);

  let low = -0.45;
  let high = 2.5;
  const npvLow = npvAt(low);
  const npvHigh = npvAt(high);

  if (npvLow * npvHigh > 0) {
    // 均大于0说明回报超高，均小于0说明严重亏损
    return npvLow < 0 ? -45 : 250;
  }

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    const val = npvAt(mid);
    if (Math.abs(val) < 1e-4) {
      return Number((mid * 100).toFixed(1));
    }
    if (val > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return Number((((low + high) / 2) * 100).toFixed(1));
}

function simulateProjectCashflows(params: {
  totalCapexWan: number;
  ownEquityWan: number;
  financingRatePct: number;
  annualRevenueWan: number;
  annualOpexWan: number;
  horizonYears: number;
  rampUpYear1Pct: number;
  revenueMultiplier?: number;
  opexMultiplier?: number;
  rampDelayExtra?: boolean;
}) {
  const {
    totalCapexWan,
    ownEquityWan,
    financingRatePct,
    annualRevenueWan,
    annualOpexWan,
    horizonYears,
    rampUpYear1Pct,
    revenueMultiplier = 1,
    opexMultiplier = 1,
    rampDelayExtra = false,
  } = params;

  const debtWan = Math.max(0, totalCapexWan - ownEquityWan);
  // 简化全投资现金流（用于项目全投资税前 IRR 与回本测算，更符合国资可研标准口径）
  // 同时考虑融资财务费用压力提示
  const annualInterestAvg = debtWan * (financingRatePct / 100) * 0.55;
  const discountRate = 0.08;

  const cashflows: number[] = [-totalCapexWan];
  const series: { year: number; netCashWan: number; cumulativeWan: number }[] = [
    { year: 0, netCashWan: -totalCapexWan, cumulativeWan: -totalCapexWan },
  ];

  let cumulative = -totalCapexWan;
  let cumulativeDiscounted = -totalCapexWan;
  let staticPayback: number | null = null;
  let dynamicPayback: number | null = null;
  let npv = -totalCapexWan;

  for (let y = 1; y <= horizonYears; y++) {
    let ramp = 1;
    if (y === 1) {
      ramp = Math.max(0.2, Math.min(1, rampUpYear1Pct / 100));
      if (rampDelayExtra) ramp = Math.max(0.2, ramp * 0.75);
    } else if (y === 2 && rampDelayExtra) {
      ramp = Math.min(1, (rampUpYear1Pct / 100 + 1) / 2);
    }

    const rev = annualRevenueWan * revenueMultiplier * ramp;
    // 运营成本按 65% 刚性固定 + 35% 随产能变动拆解，贴近真实算力/农业运营结构
    const opex = annualOpexWan * opexMultiplier * (0.65 + 0.35 * ramp);
    const ebitda = rev - opex;
    // 近似扣除财务费用与所得税（25% 仅对正利润计提）
    const taxable = Math.max(0, ebitda - totalCapexWan / horizonYears - annualInterestAvg);
    const tax = taxable * 0.25;
    const netCash = Number((ebitda - tax - annualInterestAvg * 0.5).toFixed(1));

    const prevCum = cumulative;
    cumulative = Number((cumulative + netCash).toFixed(1));
    if (staticPayback === null && cumulative >= 0 && netCash > 0) {
      staticPayback = Number((y - 1 + Math.abs(prevCum) / netCash).toFixed(1));
    }

    const discountedCf = netCash / Math.pow(1 + discountRate, y);
    const prevDiscCum = cumulativeDiscounted;
    cumulativeDiscounted += discountedCf;
    npv += discountedCf;
    if (dynamicPayback === null && cumulativeDiscounted >= 0 && discountedCf > 0) {
      dynamicPayback = Number((y - 1 + Math.abs(prevDiscCum) / discountedCf).toFixed(1));
    }

    cashflows.push(netCash);
    series.push({ year: y, netCashWan: netCash, cumulativeWan: cumulative });
  }

  const irrPct = solveIrrPct(cashflows);

  return {
    irrPct,
    staticPaybackYears: staticPayback,
    dynamicPaybackYears: dynamicPayback,
    npvWan: Math.round(npv),
    cumulativeNetCashWan: Math.round(cumulative),
    series,
  };
}

function classifyVerdict(
  irrPct: number | null,
  paybackYears: number | null,
  horizonYears: number
): StressScenarioRow['verdict'] {
  if (irrPct === null || irrPct < 4) return '触发红线';
  if (irrPct >= 8 && (paybackYears === null || paybackYears <= horizonYears * 0.85)) {
    return '达标稳健';
  }
  return '临界承压';
}

export function computeFeasibilityModel(
  input: FeasibilityDraftInput
): FeasibilityFinancialSummary {
  const safeCapex = Math.max(50, input.totalCapexWan);
  const safeOwn = Math.max(0, Math.min(safeCapex, input.ownEquityWan));
  const safeHorizon = Math.max(3, Math.min(15, input.horizonYears));
  const leverageDebtWan = Math.max(0, safeCapex - safeOwn);
  const annualDebtServiceWan = Math.round(
    leverageDebtWan > 0
      ? leverageDebtWan / Math.min(5, safeHorizon) +
          leverageDebtWan * (input.financingRatePct / 100) * 0.55
      : 0
  );

  // 基准情景
  const base = simulateProjectCashflows({
    totalCapexWan: safeCapex,
    ownEquityWan: safeOwn,
    financingRatePct: input.financingRatePct,
    annualRevenueWan: input.annualRevenueWan,
    annualOpexWan: input.annualOpexWan,
    horizonYears: safeHorizon,
    rampUpYear1Pct: input.rampUpYear1Pct,
  });

  // 审慎保守情景（营收 -15%，刚性成本 +10%）
  const conservative = simulateProjectCashflows({
    totalCapexWan: safeCapex,
    ownEquityWan: safeOwn,
    financingRatePct: input.financingRatePct,
    annualRevenueWan: input.annualRevenueWan,
    annualOpexWan: input.annualOpexWan,
    horizonYears: safeHorizon,
    rampUpYear1Pct: input.rampUpYear1Pct,
    revenueMultiplier: 0.85,
    opexMultiplier: 1.1,
  });

  // 极端承压情景（营收 -25%，成本 +15%，爬坡延迟）
  const extreme = simulateProjectCashflows({
    totalCapexWan: safeCapex,
    ownEquityWan: safeOwn,
    financingRatePct: input.financingRatePct,
    annualRevenueWan: input.annualRevenueWan,
    annualOpexWan: input.annualOpexWan,
    horizonYears: safeHorizon,
    rampUpYear1Pct: input.rampUpYear1Pct,
    revenueMultiplier: 0.75,
    opexMultiplier: 1.15,
    rampDelayExtra: true,
  });

  // 保本利用率测算（使年 EBITDA 刚好覆盖年折旧 + 年平均利息）
  const annualDepreciation = safeCapex / safeHorizon;
  const annualAvgInterest = leverageDebtWan * (input.financingRatePct / 100) * 0.55;
  const fixedOpex = input.annualOpexWan * 0.65;
  const varOpexAtBase = input.annualOpexWan * 0.35;
  const contributionAtBase = Math.max(1, input.annualRevenueWan - varOpexAtBase);
  const rawBreakevenRatio = (fixedOpex + annualDepreciation + annualAvgInterest) / contributionAtBase;
  const breakevenUtilizationPct = Math.min(
    100,
    Math.max(15, Math.round(rawBreakevenRatio * input.utilizationPct))
  );

  const stressScenarios: StressScenarioRow[] = [
    {
      name: '基准情景（正常达产）',
      assumption: `按 ${input.utilizationPct}% ${input.keyDriverLabel}、首年爬坡 ${input.rampUpYear1Pct}% 测算`,
      irrPct: base.irrPct,
      staticPaybackYears: base.staticPaybackYears,
      dynamicPaybackYears: base.dynamicPaybackYears,
      npvWan: base.npvWan,
      cumulativeNetCashWan: base.cumulativeNetCashWan,
      verdict: classifyVerdict(base.irrPct, base.staticPaybackYears, safeHorizon),
    },
    {
      name: '审慎情景（国资上会常用底线）',
      assumption: '营收/消纳下降 15%，运营成本上升 10%',
      irrPct: conservative.irrPct,
      staticPaybackYears: conservative.staticPaybackYears,
      dynamicPaybackYears: conservative.dynamicPaybackYears,
      npvWan: conservative.npvWan,
      cumulativeNetCashWan: conservative.cumulativeNetCashWan,
      verdict: classifyVerdict(
        conservative.irrPct,
        conservative.staticPaybackYears,
        safeHorizon
      ),
    },
    {
      name: '极端压力情景（逆周期黑天鹅）',
      assumption: '营收/消纳下降 25%，成本上升 15%，且前两年爬坡延迟',
      irrPct: extreme.irrPct,
      staticPaybackYears: extreme.staticPaybackYears,
      dynamicPaybackYears: extreme.dynamicPaybackYears,
      npvWan: extreme.npvWan,
      cumulativeNetCashWan: extreme.cumulativeNetCashWan,
      verdict: classifyVerdict(extreme.irrPct, extreme.staticPaybackYears, safeHorizon),
    },
  ];

  // 单因素回归敏感性测算
  const revDown10 = simulateProjectCashflows({
    totalCapexWan: safeCapex,
    ownEquityWan: safeOwn,
    financingRatePct: input.financingRatePct,
    annualRevenueWan: input.annualRevenueWan,
    annualOpexWan: input.annualOpexWan,
    horizonYears: safeHorizon,
    rampUpYear1Pct: input.rampUpYear1Pct,
    revenueMultiplier: 0.9,
  });
  const revUp10 = simulateProjectCashflows({
    totalCapexWan: safeCapex,
    ownEquityWan: safeOwn,
    financingRatePct: input.financingRatePct,
    annualRevenueWan: input.annualRevenueWan,
    annualOpexWan: input.annualOpexWan,
    horizonYears: safeHorizon,
    rampUpYear1Pct: input.rampUpYear1Pct,
    revenueMultiplier: 1.1,
  });
  const opexUp15 = simulateProjectCashflows({
    totalCapexWan: safeCapex,
    ownEquityWan: safeOwn,
    financingRatePct: input.financingRatePct,
    annualRevenueWan: input.annualRevenueWan,
    annualOpexWan: input.annualOpexWan,
    horizonYears: safeHorizon,
    rampUpYear1Pct: input.rampUpYear1Pct,
    opexMultiplier: 1.15,
  });
  const capexUp15 = simulateProjectCashflows({
    totalCapexWan: safeCapex * 1.15,
    ownEquityWan: safeOwn,
    financingRatePct: input.financingRatePct,
    annualRevenueWan: input.annualRevenueWan,
    annualOpexWan: input.annualOpexWan,
    horizonYears: safeHorizon,
    rampUpYear1Pct: input.rampUpYear1Pct,
  });

  const delta = (v: number | null) =>
    v !== null && base.irrPct !== null ? Number((v - base.irrPct).toFixed(1)) : null;

  const regressionTable: RegressionSensitivityRow[] = [
    {
      factor: `${input.keyDriverLabel} / 营收下行`,
      deltaLabel: '-10%',
      irrPct: revDown10.irrPct,
      irrDeltaPct: delta(revDown10.irrPct),
      paybackYears: revDown10.staticPaybackYears,
      riskNote: '第一敏感因子：订单或销量一旦不及预期，对 IRR 冲击最大',
    },
    {
      factor: `${input.keyDriverLabel} / 营收上行`,
      deltaLabel: '+10%',
      irrPct: revUp10.irrPct,
      irrDeltaPct: delta(revUp10.irrPct),
      paybackYears: revUp10.staticPaybackYears,
      riskNote: '需核实是否具备真实新增消纳客户或长协锁单支撑',
    },
    {
      factor: '年刚性运营成本（电费/运维/物流）上涨',
      deltaLabel: '+15%',
      irrPct: opexUp15.irrPct,
      irrDeltaPct: delta(opexUp15.irrPct),
      paybackYears: opexUp15.staticPaybackYears,
      riskNote: '须锁定长期电价补贴或将损耗/运维费写进背靠背分包上限',
    },
    {
      factor: '总投资 CapEx（设备/卡价/建安）超支',
      deltaLabel: '+15%',
      irrPct: capexUp15.irrPct,
      irrDeltaPct: delta(capexUp15.irrPct),
      paybackYears: capexUp15.staticPaybackYears,
      riskNote: '须签总价包干 EPC 或采用分期采购/融资租赁锁死初期投入',
    },
  ];

  return {
    baseIrrPct: base.irrPct,
    staticPaybackYears: base.staticPaybackYears,
    dynamicPaybackYears: base.dynamicPaybackYears,
    npvWan: base.npvWan,
    leverageDebtWan,
    annualDebtServiceWan,
    breakevenUtilizationPct,
    cashflowSeries: base.series,
    stressScenarios,
    regressionTable,
  };
}
