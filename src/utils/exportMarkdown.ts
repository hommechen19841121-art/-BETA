import { ENTITY_LABELS, INDUSTRY_LABELS } from '../data/domainData';
import {
  EntityType,
  FeasibilityDraftReport,
  FeasibilityFinancialSummary,
  FeasibilityReviewReport,
  IndustryTrack,
  StructuredAdvisoryReport,
} from '../types';

export function reportToMarkdown(
  report: StructuredAdvisoryReport,
  meta?: { entityType?: EntityType; industry?: IndustryTrack; date?: string }
): string {
  const lines: string[] = [];
  lines.push(`# ${report.headline}`);
  lines.push('');

  const metaParts: string[] = [];
  if (meta?.entityType) metaParts.push(`主体属性：${ENTITY_LABELS[meta.entityType]}`);
  if (meta?.industry) metaParts.push(`业务赛道：${INDUSTRY_LABELS[meta.industry]}`);
  metaParts.push(`生成时间：${meta?.date || new Date().toLocaleString('zh-CN')}`);
  lines.push(`> ${metaParts.join(' · ')}`);
  lines.push('');

  lines.push('## 核心总评');
  lines.push(report.executiveSummary);
  lines.push('');

  lines.push('## 国企 / 民营管控口径差异提示');
  lines.push(report.entityDiffNote);
  lines.push('');

  if (report.leadershipAlignmentTip) {
    lines.push('## 向上汇报与可研平衡建议');
    lines.push(report.leadershipAlignmentTip);
    lines.push('');
  }

  lines.push('## 一、核心问题诊断');
  report.diagnosisPoints.forEach((p, idx) => {
    lines.push(`${idx + 1}. ${p}`);
  });
  lines.push('');

  lines.push('## 二、可选实操方案');
  report.options.forEach((opt, idx) => {
    lines.push(`### ${idx + 1}. ${opt.title}（${opt.fitLabel}）`);
    lines.push(`- **运转机制**：${opt.mechanism}`);
    lines.push(`- **资金与金融撬动**：${opt.capitalRequirement}`);
    lines.push(`- **精简人力配置**：${opt.staffingNeed}`);
    lines.push(`- **合规边界与口径**：${opt.complianceBoundary}`);
    lines.push('');
  });

  lines.push('## 三、高危风险预警');
  report.riskAlerts.forEach((r) => {
    const tag = r.level === 'high' ? '高危红线' : '审慎关注';
    lines.push(`- **【${tag}】${r.title}**：${r.detail}（依据：${r.redlineBasis}）`);
  });
  lines.push('');

  lines.push('## 四、分阶段落地抓手');
  report.actionLevers.forEach((l) => {
    lines.push(`- **${l.phase}**｜${l.action}｜交付物：${l.deliverable}｜牵头：${l.owner}`);
  });
  lines.push('');

  lines.push('## 五、一线操盘注意事项');
  report.precautions.forEach((p, idx) => {
    lines.push(`${idx + 1}. ${p}`);
  });

  if (report.jargonGlossary && report.jargonGlossary.length > 0) {
    lines.push('');
    lines.push('## 六、涉及行话与金融黑话白话速译');
    report.jargonGlossary.forEach((j) => {
      lines.push(`- **${j.term}**：${j.plainMeaning}（避坑提示：${j.watchOut}）`);
    });
  }

  if (report.guidedDiscoveryQuestions && report.guidedDiscoveryQuestions.length > 0) {
    lines.push('');
    lines.push('## 七、下一场对外谈判 / 尽调必问清单');
    report.guidedDiscoveryQuestions.forEach((q, idx) => {
      lines.push(`${idx + 1}. ${q}`);
    });
  }

  return lines.join('\n');
}

export function feasibilityDraftToMarkdown(
  draft: FeasibilityDraftReport,
  financials?: FeasibilityFinancialSummary
): string {
  const lines: string[] = [];
  lines.push(`# ${draft.documentTitle}`);
  lines.push('');
  lines.push(`> ${draft.docNumberHint} · ${draft.reportingLine}`);
  lines.push('');
  lines.push('## 一页纸核心汇报摘要（结论前置）');
  lines.push(`- **核心决策建议**：${draft.executiveOnePager.conclusion}`);
  lines.push(`- **政策与战略契合**：${draft.executiveOnePager.strategicFit}`);
  lines.push(`- **财务与回本测算**：${draft.executiveOnePager.financialHighlight}`);
  lines.push(`- **风控安全阀机制**：${draft.executiveOnePager.riskControlShield}`);
  lines.push('');

  if (financials) {
    lines.push('## 附表：三情景 IRR 与回本压力回归测试');
    lines.push('| 情景 | 核心假设 | 全投资 IRR | 静态回本 | 动态回本 | NPV（8%折现） | 研判 |');
    lines.push('| :--- | :--- | :---: | :---: | :---: | :---: | :---: |');
    financials.stressScenarios.forEach((s) => {
      lines.push(
        `| ${s.name} | ${s.assumption} | ${s.irrPct !== null ? `${s.irrPct}%` : '未收回'} | ${s.staticPaybackYears !== null ? `${s.staticPaybackYears}年` : '超期'} | ${s.dynamicPaybackYears !== null ? `${s.dynamicPaybackYears}年` : '超期'} | ${s.npvWan}万 | ${s.verdict} |`
      );
    });
    lines.push('');
  }

  draft.chapters.forEach((ch) => {
    lines.push(`## ${ch.chapterNo} ${ch.title}`);
    lines.push(`> 核心要旨：${ch.keyTakeaway}`);
    lines.push('');
    ch.paragraphs.forEach((p) => {
      lines.push(p);
      lines.push('');
    });
    ch.bulletPoints.forEach((b) => {
      lines.push(`- ${b}`);
    });
    lines.push('');
  });

  lines.push('## 拟写入决议的出资先决条件（CP 安全阀）');
  draft.conditionsPrecedent.forEach((cp, idx) => {
    lines.push(`${idx + 1}. ${cp}`);
  });
  lines.push('');

  lines.push('## 提请领导及投委会审议协调事项');
  draft.leadershipRequests.forEach((req, idx) => {
    lines.push(`${idx + 1}. ${req}`);
  });

  return lines.join('\n');
}

export function feasibilityReviewToMarkdown(review: FeasibilityReviewReport): string {
  const lines: string[] = [];
  lines.push(`# ${review.reportTitle}`);
  lines.push('');
  lines.push(`> 上会就绪度评估：**${review.overallReadiness}**`);
  lines.push('');
  lines.push('## 审改总评');
  lines.push(review.executiveVerdict);
  lines.push('');
  lines.push('## 上会前必须解决的三大硬伤');
  review.topThreeBlockers.forEach((b, i) => lines.push(`${i + 1}. ${b}`));
  lines.push('');

  lines.push('## 一、数据可信度与交叉验证');
  lines.push(review.dataCredibilityAudit.summary);
  review.dataCredibilityAudit.items.forEach((it) => {
    lines.push(
      `- **【${it.credibilityLevel}】${it.claimOrMetric}**：交叉验证（${it.crossValidationBasis}）；修改建议：${it.suggestedFix}`
    );
  });
  lines.push('');

  lines.push('## 二、政策与国资合规匹配度');
  lines.push(review.policyMatchAudit.summary);
  review.policyMatchAudit.items.forEach((it) => {
    lines.push(
      `- **【${it.matchStatus}】${it.policyDimension}**：${it.finding}；补强建议：${it.alignmentSuggestion}`
    );
  });
  lines.push('');

  lines.push('## 三、国企/政府公文行文流程与阅读习惯');
  lines.push(review.flowAndHabitAudit.summary);
  review.flowAndHabitAudit.items.forEach((it) => {
    lines.push(
      `- **${it.sectionArea}**：存在问题（${it.readingHabitProblem}）；公文规范（${it.govSoeStandardRule}）；优化动作：${it.improvementAction}`
    );
  });
  lines.push('');

  lines.push('## 四、逐段公文改写对照（可直接替换原文）');
  review.rewriteComparisons.forEach((rw, idx) => {
    lines.push(`### ${idx + 1}. ${rw.section}`);
    lines.push(`- **原文问题**：${rw.originalIssue}`);
    lines.push(`- **修改后国企/政府标准表述**：${rw.revisedExecutiveText}`);
    lines.push(`- **修改逻辑**：${rw.rationale}`);
    lines.push('');
  });

  return lines.join('\n');
}

export function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.md') ? filename : `${filename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
