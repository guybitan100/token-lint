import { TokenLintPass } from '../../engine/pass';
import { RetrievalNode } from '../../ir/nodes';

export const contextAmplificationPass: TokenLintPass = {
  id: 'retrieval.contextAmplification',

  run(ir) {
    const retrievalNodes = ir.children.filter(n => n.type === 'retrieval') as RetrievalNode[];
    if (retrievalNodes.length === 0) return [];

    const estimatedRetrievalTokens = retrievalNodes.reduce((sum, r) => {
      const assumedChunkTokens = 750;
      return sum + (r.topK || 5) * assumedChunkTokens;
    }, 0);

    const estimatedFinalContext = ir.tokens + estimatedRetrievalTokens;
    const amplification = ir.tokens > 0 ? estimatedFinalContext / ir.tokens : 1;

    if (amplification >= 8) {
      return [{
        ruleId: this.id,
        title: 'Context amplification risk',
        message: `Estimated context amplification is ${amplification.toFixed(1)}x. Retrieval may dominate runtime cost.`,
        severity: 'warning' as const,
        loc: ir.loc,
        metadata: {
          baseTokens: ir.tokens,
          estimatedRetrievalTokens,
          amplification
        }
      }];
    }

    return [];
  }
};
