import { TokenLintPass } from '../../engine/pass';
import { InstructionNode } from '../../ir/nodes';

export const duplicateInstructionPass: TokenLintPass = {
  id: 'optimization.duplicateInstruction',

  run(ir) {
    const findings = [];
    const seen = new Map<string, InstructionNode>();

    for (const node of ir.children) {
      if (node.type !== 'instruction') continue;

      const current = node as InstructionNode;
      if (current.normalized.length < 12) continue;

      const existing = seen.get(current.normalized);

      if (existing) {
        findings.push({
          ruleId: this.id,
          title: 'Duplicate instruction detected',
          message: `This instruction duplicates an earlier instruction. Estimated waste: ${current.tokens} tokens.`,
          severity: 'warning' as const,
          loc: current.loc,
          nodeId: current.id,
          fix: {
            title: 'Remove duplicate instruction',
            replacement: ''
          },
          metadata: {
            duplicateOf: existing.id,
            wastedTokens: current.tokens
          }
        });
      } else {
        seen.set(current.normalized, current);
      }
    }

    return findings;
  }
};
