import { describe, expect, it } from 'vitest';
import { oversizedExamplePass } from './optimization/oversizedExamplePass';
import { promptSizePass } from './optimization/promptSizePass';
import { contextAmplificationPass } from './retrieval/contextAmplificationPass';
import { retrievalRiskPass } from './retrieval/retrievalRiskPass';
import { encodedPayloadPass } from './security/encodedPayloadPass';
import { externalEndpointPass } from './security/externalEndpointPass';
import { unsafePermissionPass } from './security/unsafePermissionPass';
import { maliciousSkillTestPass } from './skills/maliciousSkillTestPass';

function createPrompt(children: Array<Record<string, unknown>>, tokens = 1000) {
  return {
    id: 'root',
    type: 'prompt',
    raw: 'raw',
    tokens,
    loc: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 10 },
    children
  } as never;
}

describe('coverage pass cases', () => {
  it('flags oversized examples and ignores smaller examples', () => {
    const result = oversizedExamplePass.run(
      createPrompt([
        {
          id: 'example_1',
          type: 'example',
          raw: 'small',
          content: 'small',
          tokens: 200,
          loc: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 5 }
        },
        {
          id: 'example_2',
          type: 'example',
          raw: 'large',
          content: 'large',
          tokens: 700,
          loc: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 5 }
        }
      ])
    );

    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('optimization.oversizedExample');
    expect(result[0].metadata).toEqual({ tokens: 700 });
  });

  it('reports prompt size as warning, critical, or clean', () => {
    expect(promptSizePass.run(createPrompt([], 3000))).toEqual([]);
    expect(promptSizePass.run(createPrompt([], 5000))[0]).toMatchObject({
      severity: 'warning',
      ruleId: 'optimization.promptSize'
    });
    expect(promptSizePass.run(createPrompt([], 9000))[0]).toMatchObject({
      severity: 'error',
      ruleId: 'optimization.promptSize'
    });
  });

  it('handles context amplification only when retrieval dominates the context budget', () => {
    const noRetrieval = contextAmplificationPass.run(createPrompt([], 2000));
    const modestAmplification = contextAmplificationPass.run(
      createPrompt([
        {
          id: 'retrieval_1',
          type: 'retrieval',
          raw: 'top_k: 2',
          topK: 2,
          tokens: 5,
          loc: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 8 }
        }
      ], 2000)
    );
    const highAmplification = contextAmplificationPass.run(
      createPrompt([
        {
          id: 'retrieval_2',
          type: 'retrieval',
          raw: 'top_k: 20',
          topK: 20,
          tokens: 5,
          loc: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 9 }
        }
      ], 1500)
    );
    const implicitTopK = contextAmplificationPass.run(
      createPrompt([
        {
          id: 'retrieval_3',
          type: 'retrieval',
          raw: 'retrieval enabled',
          tokens: 5,
          loc: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 17 }
        }
      ], 400)
    );

    expect(noRetrieval).toEqual([]);
    expect(modestAmplification).toEqual([]);
    expect(implicitTopK).toHaveLength(1);
    expect(highAmplification).toHaveLength(1);
    expect(highAmplification[0].metadata).toMatchObject({
      baseTokens: 1500,
      estimatedRetrievalTokens: 15000
    });
  });

  it('distinguishes high and critical retrieval risk thresholds', () => {
    const highRisk = retrievalRiskPass.run(
      createPrompt([
        {
          id: 'retrieval_1',
          type: 'retrieval',
          raw: 'top_k: 15',
          topK: 15,
          tokens: 5,
          loc: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 9 }
        }
      ])
    );
    const criticalRisk = retrievalRiskPass.run(
      createPrompt([
        {
          id: 'retrieval_2',
          type: 'retrieval',
          raw: 'top_k: 25',
          topK: 25,
          tokens: 5,
          loc: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 9 }
        }
      ])
    );
    const safe = retrievalRiskPass.run(
      createPrompt([
        {
          id: 'retrieval_3',
          type: 'retrieval',
          raw: 'retrieval enabled',
          tokens: 5,
          loc: { startLine: 2, startColumn: 0, endLine: 2, endColumn: 17 }
        }
      ])
    );

    expect(highRisk).toHaveLength(1);
    expect(highRisk[0].fix?.replacement).toBe('top_k: 6');
    expect(criticalRisk[0]).toMatchObject({ severity: 'error' });
    expect(safe).toEqual([]);
  });

  it('detects unsafe permission combinations and malicious skill tests', () => {
    const permissionFindings = unsafePermissionPass.run(
      createPrompt([
        {
          id: 'tool_1',
          type: 'tool',
          raw: 'filesystem.read gmail.send http.post',
          tokens: 10,
          loc: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 10 }
        }
      ])
    );

    const maliciousFindings = maliciousSkillTestPass.run(
      createPrompt([
        {
          id: 'skill_1',
          type: 'skill',
          raw: 'skill loader should download and execute remote binaries',
          tokens: 10,
          loc: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 10 }
        },
        {
          id: 'instruction_1',
          type: 'instruction',
          raw: 'download and execute',
          tokens: 5,
          loc: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 10 }
        }
      ])
    );

    expect(permissionFindings.length).toBeGreaterThanOrEqual(2);
    expect(permissionFindings[0].ruleId).toBe('security.unsafePermissions');
    expect(maliciousFindings).toHaveLength(1);
    expect(maliciousFindings[0].metadata).toEqual({ pattern: 'download and execute' });
  });

  it('detects encoded payload formats and suspicious versus ordinary external urls', () => {
    const encodedFindings = encodedPayloadPass.run(
      createPrompt([
        {
          id: 'payload_1',
          type: 'unknown',
          raw: 'A'.repeat(180),
          tokens: 10,
          loc: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 180 }
        },
        {
          id: 'payload_2',
          type: 'unknown',
          raw: `0x${'ab'.repeat(120)}`,
          tokens: 10,
          loc: { startLine: 1, startColumn: 0, endLine: 1, endColumn: 242 }
        }
      ])
    );
    const endpointFindings = externalEndpointPass.run(
      createPrompt([
        {
          id: 'endpoint_1',
          type: 'unknown',
          raw: 'send to https://webhook.site/abc and https://example.com/info',
          tokens: 10,
          loc: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 60 }
        }
      ])
    );

    expect(encodedFindings).toHaveLength(2);
    expect(endpointFindings).toHaveLength(2);
    expect(endpointFindings[0].severity).toBe('error');
    expect(endpointFindings[1].severity).toBe('warning');
  });
});