import { TokenLintFinding } from '../engine/finding';
import { TokenLintFix } from './fix';

export function fixesFromFindings(findings: TokenLintFinding[]): TokenLintFix[] {
  const fixes: TokenLintFix[] = [];

  for (const finding of findings) {
    if (!finding.fix) continue;

    fixes.push({
      id: `${finding.ruleId}:${finding.loc.startLine}`,
      title: finding.fix.title,
      safety: inferSafety(finding.ruleId),
      loc: finding.loc,
      replacement: finding.fix.replacement ?? '',
      explanation: buildExplanation(finding.ruleId)
    });
  }

  return fixes;
}

function inferSafety(ruleId: string): 'safe' | 'review_required' | 'unsafe' {
  if (ruleId.includes('duplicateInstruction')) return 'safe';
  if (ruleId.includes('retrieval.topKRisk')) return 'review_required';
  if (ruleId.includes('promptInjection')) return 'review_required';
  if (ruleId.includes('externalEndpoint')) return 'review_required';
  if (ruleId.includes('encodedPayload')) return 'review_required';
  if (ruleId.includes('maliciousSkillTest')) return 'review_required';

  return 'review_required';
}

function buildExplanation(ruleId: string): string {
  if (ruleId.includes('duplicateInstruction')) {
    return 'Removes an exact duplicate instruction. Safe because the same instruction already exists earlier.';
  }

  if (ruleId.includes('retrieval.topKRisk')) {
    return 'Lowers top_k to reduce retrieval amplification. Review because retrieval quality depends on evals.';
  }

  if (ruleId.includes('promptInjection')) {
    return 'Neutralizes a suspicious prompt-injection phrase. Review before applying.';
  }

  if (ruleId.includes('externalEndpoint')) {
    return 'Comments out an external endpoint so a developer can review possible exfiltration risk.';
  }

  if (ruleId.includes('encodedPayload')) {
    return 'Replaces a suspicious encoded payload with a review marker.';
  }

  if (ruleId.includes('maliciousSkillTest')) {
    return 'Disables a suspicious skill test by commenting it out for review.';
  }

  return 'Review this change before applying.';
}
