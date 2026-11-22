import { PromptNode } from '../ir/nodes';
import { TokenLintFinding } from './finding';

export interface TokenLintPass {
  id: string;
  run(ir: PromptNode): TokenLintFinding[];
}
