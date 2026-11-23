import { parseToIR } from '../parser/parser';
import { TokenLintFinding } from './finding';
import { TokenLintPass } from './pass';

import { retrievalRiskPass } from '../passes/retrieval/retrievalRiskPass';
import { contextAmplificationPass } from '../passes/retrieval/contextAmplificationPass';

import { promptInjectionPass } from '../passes/security/promptInjectionPass';
import { encodedPayloadPass } from '../passes/security/encodedPayloadPass';
import { externalEndpointPass } from '../passes/security/externalEndpointPass';
import { unsafePermissionPass } from '../passes/security/unsafePermissionPass';

import { maliciousSkillTestPass } from '../passes/skills/maliciousSkillTestPass';

export interface AnalysisResult {
  ir: ReturnType<typeof parseToIR>;
  findings: TokenLintFinding[];
  metrics: {
    totalTokens: number;
    findingCount: number;
    errorCount: number;
    warningCount: number;
  };
}

export function analyze(text: string, fileName: string): AnalysisResult {
  const ir = parseToIR(text, fileName);

  const passes: TokenLintPass[] = [
    retrievalRiskPass,
    contextAmplificationPass,
    promptInjectionPass,
    encodedPayloadPass,
    externalEndpointPass,
    unsafePermissionPass,
    maliciousSkillTestPass
  ];

  const findings: TokenLintFinding[] = [];

  for (const pass of passes) {
    findings.push(...pass.run(ir));
  }

  return {
    ir,
    findings,
    metrics: {
      totalTokens: ir.tokens,
      findingCount: findings.length,
      errorCount: findings.filter(f => f.severity === 'error').length,
      warningCount: findings.filter(f => f.severity === 'warning').length
    }
  };
}
