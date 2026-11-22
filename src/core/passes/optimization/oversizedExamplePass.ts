import { TokenLintPass } from '../../engine/pass';
import { ExampleNode } from '../../ir/nodes';

export const oversizedExamplePass: TokenLintPass = {
  id: 'optimization.oversizedExample',

  run(ir) {
    const findings = [];

    for (const node of ir.children) {
      if (node.type !== 'example') continue;

      const example = node as ExampleNode;
      if (example.tokens > 500) {
        findings.push({
          ruleId: this.id,
          title: 'Oversized example detected',
          message: `This example uses ${example.tokens} tokens. Consider compressing it or replacing it with a shorter behavioral pattern.`,
          severity: 'warning' as const,
          loc: example.loc,
          nodeId: example.id,
          metadata: { tokens: example.tokens }
        });
      }
    }

    return findings;
  }
};
