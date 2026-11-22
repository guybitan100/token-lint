import { SourceLocation } from '../ir/sourceLocation';

export type FindingSeverity = 'info' | 'warning' | 'error';

export interface TokenLintFinding {
  ruleId: string;
  title: string;
  message: string;
  severity: FindingSeverity;
  loc: SourceLocation;
  nodeId?: string;
  fix?: {
    title: string;
    replacement?: string;
  };
  metadata?: Record<string, unknown>;
}
