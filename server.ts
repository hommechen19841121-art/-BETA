import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  runComplianceRemediation,
  runInteractiveConsultation,
  runSandboxBrief,
} from './server/advisor.ts';
import {
  extractFeasibilityProjectFromDoc,
  generateFeasibilityDraft,
  reviewFeasibilityDocument,
} from './server/feasibility.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // 1. Interactive Executive Management & Cross-Border Risk Consultation
  app.post('/api/advisor/consult', async (req, res) => {
    try {
      const { entityType, industry, topic, guidanceMode, userPrompt, historySummary } =
        req.body ?? {};

      if (!userPrompt || typeof userPrompt !== 'string' || !userPrompt.trim()) {
        res.status(400).json({ error: '请输入需要诊断的业务问题、架构或合同事项。' });
        return;
      }

      const report = await runInteractiveConsultation({
        entityType: entityType || 'soe_tier4',
        industry: industry || 'agriculture',
        topic: topic || 'asset_revitalization',
        guidanceMode: guidanceMode === 'expert_direct' ? 'expert_direct' : 'beginner_guided',
        userPrompt: userPrompt.trim(),
        historySummary:
          typeof historySummary === 'string' ? historySummary.slice(0, 3000) : undefined,
      });

      res.json({ report });
    } catch (err) {
      const message = formatAdvisorError(err);
      res.status(500).json({ error: message });
    }
  });

  // 2. Sandbox Tailored Executive Revitalization Brief
  app.post('/api/advisor/sandbox-brief', async (req, res) => {
    try {
      const { config, computedSummary } = req.body ?? {};
      if (!config || typeof computedSummary !== 'string') {
        res.status(400).json({ error: '缺少沙盘配置参数，无法生成定制简报。' });
        return;
      }

      const report = await runSandboxBrief({ config, computedSummary });
      res.json({ report });
    } catch (err) {
      const message = formatAdvisorError(err);
      res.status(500).json({ error: message });
    }
  });

  // 3. Compliance Gap Targeted Remediation Plan
  app.post('/api/advisor/remediation', async (req, res) => {
    try {
      const { entityType, gaps } = req.body ?? {};
      if (!Array.isArray(gaps) || gaps.length === 0) {
        res
          .status(400)
          .json({ error: '请先在清单中标记至少一条“高危缺口”或“待整改”条目。' });
        return;
      }

      const report = await runComplianceRemediation({
        entityType: entityType || 'soe_tier4',
        gaps: gaps.slice(0, 12),
      });
      res.json({ report });
    } catch (err) {
      const message = formatAdvisorError(err);
      res.status(500).json({ error: message });
    }
  });

  // 4. Industry Feasibility Study Draft Generator (SOE / Gov Executive Standard)
  app.post('/api/advisor/feasibility-draft', async (req, res) => {
    try {
      const { input, financials } = req.body ?? {};
      if (!input || !input.projectName || !financials) {
        res.status(400).json({ error: '请完整填写项目名称及财务测算参数后再生成可研初稿。' });
        return;
      }

      const draft = await generateFeasibilityDraft({ input, financials });
      res.json({ draft });
    } catch (err) {
      const message = formatAdvisorError(err);
      res.status(500).json({ error: message });
    }
  });

  // 5. Uploaded / Pasted Feasibility Study 3-Pillar Cross-Review
  app.post('/api/advisor/feasibility-review', async (req, res) => {
    try {
      const { audience, industry, documentText, fileName, pdfBase64, focusNotes } =
        req.body ?? {};

      const hasPdf = typeof pdfBase64 === 'string' && pdfBase64.length > 20;
      const hasText = typeof documentText === 'string' && documentText.trim().length > 20;

      if (!hasPdf && !hasText) {
        res
          .status(400)
          .json({ error: '请上传 PDF / 文本可研文件，或直接粘贴不少于 20 字的可研内容。' });
        return;
      }

      const review = await reviewFeasibilityDocument({
        audience: audience || 'joint_committee',
        industry: industry || 'compute_ai',
        documentText: hasText ? documentText : undefined,
        fileName: typeof fileName === 'string' ? fileName : undefined,
        pdfBase64: hasPdf ? pdfBase64 : undefined,
        focusNotes: typeof focusNotes === 'string' ? focusNotes : undefined,
      });

      res.json({ review });
    } catch (err) {
      const message = formatAdvisorError(err);
      res.status(500).json({ error: message });
    }
  });

  // 6. Convert Uploaded / Pasted Feasibility Study into Managed Project Record
  app.post('/api/advisor/feasibility-extract', async (req, res) => {
    try {
      const { audience, industry, documentText, fileName, pdfBase64 } = req.body ?? {};
      const hasPdf = typeof pdfBase64 === 'string' && pdfBase64.length > 20;
      const hasText = typeof documentText === 'string' && documentText.trim().length > 20;

      if (!hasPdf && !hasText) {
        res
          .status(400)
          .json({ error: '请先上传 PDF / 文本可研文件，或粘贴可研正文后再一键转入项目库。' });
        return;
      }

      const extracted = await extractFeasibilityProjectFromDoc({
        audience: audience || 'joint_committee',
        industry: industry || 'compute_ai',
        documentText: hasText ? documentText : undefined,
        fileName: typeof fileName === 'string' ? fileName : undefined,
        pdfBase64: hasPdf ? pdfBase64 : undefined,
      });

      res.json(extracted);
    } catch (err) {
      const message = formatAdvisorError(err);
      res.status(500).json({ error: message });
    }
  });

  // Mount Vite middleware in development, static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

function formatAdvisorError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
    return 'AI 服务鉴权失败，请在 Settings > Secrets 面板检查 GEMINI_API_KEY 配置。';
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return '当前调用配额已达上限，请稍后重试或在 Settings > Secrets 中检查配额设置。';
  }
  if (raw.includes('GEMINI_API_KEY')) {
    return raw;
  }
  return `顾问研判请求未能完成：${raw.slice(0, 160)}`;
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
