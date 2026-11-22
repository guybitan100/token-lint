import { TokenLintPass } from '../../engine/pass';

const base64Pattern = /[A-Za-z0-9+/]{160,}={0,2}/;
const hexPattern = /(?:0x)?[a-fA-F0-9]{200,}/;

export const encodedPayloadPass: TokenLintPass = {
  id: 'security.encodedPayload',

  run(ir) {
    const findings = [];

    for (const node of ir.children) {
      const text = node.raw || '';

      if (base64Pattern.test(text) || hexPattern.test(text)) {
        findings.push({
          ruleId: this.id,
          title: 'Suspicious encoded payload',
          message: 'This block contains a long encoded-looking payload. Review before trusting this skill or prompt.',
          severity: 'warning' as const,
          loc: node.loc,
          nodeId: node.id
        });
      }
    }

    return findings;
  }
};
