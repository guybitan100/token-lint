import { TokenLintPass } from '../../engine/pass';

const suspiciousTestPatterns = [
  'download and execute',
  'curl ',
  'wget ',
  'powershell',
  'chmod +x',
  'eval(',
  'exec(',
  'send all files',
  'upload conversation',
  'exfiltrate',
  'steal',
  'persist',
  'autorun'
];

export const maliciousSkillTestPass: TokenLintPass = {
  id: 'skills.maliciousSkillTest',

  run(ir) {
    const findings = [];

    for (const node of ir.children) {
      if (node.type !== 'skill_test' && node.type !== 'skill' && node.type !== 'unknown') continue;

      const content = node.raw.toLowerCase();

      for (const pattern of suspiciousTestPatterns) {
        if (content.includes(pattern)) {
          findings.push({
            ruleId: this.id,
            title: 'Potentially malicious skill test',
            message: `Skill/test contains suspicious behavior pattern: "${pattern}". Do not run untrusted skills without review.`,
            severity: 'error' as const,
            loc: node.loc,
            nodeId: node.id,
            metadata: { pattern }
          });
        }
      }
    }

    return findings;
  }
};
