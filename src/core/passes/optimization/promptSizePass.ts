import { TokenLintPass } from '../../engine/pass';

export const promptSizePass: TokenLintPass = {
  id: 'optimization.promptSize',

  run(ir) {
    const findings = [];

    if (ir.tokens > 8000) {
      findings.push({
        ruleId: this.id,
        title: 'Critical prompt size',
        message: `This file contains approximately ${ir.tokens} tokens. This is likely too large for stable agent behavior.`,
        severity: 'error' as const,
        loc: ir.loc,
        metadata: { tokens: ir.tokens }
      });
    } else if (ir.tokens > 4000) {
      findings.push({
        ruleId: this.id,
        title: 'Large prompt detected',
        message: `This file contains approximately ${ir.tokens} tokens. Consider splitting, deduplicating, or compacting it.`,
        severity: 'warning' as const,
        loc: ir.loc,
        metadata: { tokens: ir.tokens }
      });
    }

    return findings;
  }
};
