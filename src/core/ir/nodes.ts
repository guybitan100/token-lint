import { SourceLocation } from './sourceLocation';

export type IRNode =
  | PromptNode
  | InstructionNode
  | PolicyNode
  | ExampleNode
  | RetrievalNode
  | MemoryNode
  | ToolNode
  | SkillNode
  | SkillTestNode
  | UnknownNode;

export interface BaseNode {
  id: string;
  type: string;
  raw: string;
  tokens: number;
  loc: SourceLocation;
  metadata?: Record<string, unknown>;
}

export interface PromptNode extends BaseNode {
  type: 'prompt';
  children: IRNode[];
}

export interface InstructionNode extends BaseNode {
  type: 'instruction';
  content: string;
  normalized: string;
}

export interface PolicyNode extends BaseNode {
  type: 'policy';
  content: string;
}

export interface ExampleNode extends BaseNode {
  type: 'example';
  content: string;
}

export interface RetrievalNode extends BaseNode {
  type: 'retrieval';
  topK?: number;
  source?: string;
}

export interface MemoryNode extends BaseNode {
  type: 'memory';
  content: string;
}

export interface ToolNode extends BaseNode {
  type: 'tool';
  name: string;
  permissions: string[];
}

export interface SkillNode extends BaseNode {
  type: 'skill';
  name: string;
  tools: ToolNode[];
  instructions: InstructionNode[];
  tests: SkillTestNode[];
}

export interface SkillTestNode extends BaseNode {
  type: 'skill_test';
  name: string;
  content: string;
}

export interface UnknownNode extends BaseNode {
  type: 'unknown';
  content: string;
}
