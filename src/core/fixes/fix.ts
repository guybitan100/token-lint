import { SourceLocation } from '../ir/sourceLocation';

export type FixSafety = 'safe' | 'review_required' | 'unsafe';

export interface TokenLintFix {
  id: string;
  title: string;
  safety: FixSafety;
  loc: SourceLocation;
  replacement: string;
  explanation: string;
}
