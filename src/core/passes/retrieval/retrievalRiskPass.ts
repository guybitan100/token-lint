import { TokenLintPass } from '../../engine/pass';
import { RetrievalNode } from '../../ir/nodes';

export const retrievalRiskPass: TokenLintPass = {
  id: 'retrieval.topKRisk',

  run(ir) {
    const findings = [];

    for (const node of ir.children) {
      if (node.type !== 'retrieval') continue;

      const retrieval = node as RetrievalNode;

      if (retrieval.topK && retrieval.topK > 20) {
        findings.push({
          ruleId: this.id,
          title: 'Critical retrieval amplification risk',
          message: `top_k=${retrieval.topK} may inject excessive context and cause token amplification.`,
          severity: 'error' as const,
          loc: retrieval.loc,
          metadata: { topK: retrieval.topK }
        });
      } else if (retrieval.topK && retrieval.topK > 10) {
        findings.push({
          ruleId: this.id,
          title: 'High retrieval amplification risk',
          message: `top_k=${retrieval.topK} is high. Consider starting with 4-8 unless evals prove otherwise.`,
          severity: 'warning' as const,
          loc: retrieval.loc,
          fix: {
            title: 'Reduce top_k to 6',
            replacement: retrieval.raw.replace(/top_k\s*[:=]\s*\d+/i, 'top_k: 6')
          },
          metadata: { topK: retrieval.topK }
        });
      }
    }

    return findings;
  }
};
