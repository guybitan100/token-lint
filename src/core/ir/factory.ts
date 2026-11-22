import { SourceLocation } from './sourceLocation';
import {
  InstructionNode,
  PolicyNode,
  ExampleNode,
  RetrievalNode,
  MemoryNode,
  ToolNode,
  SkillNode,
  SkillTestNode,
  UnknownNode
} from './nodes';
import { normalizeInstruction } from '../parser/normalizer';
import { tokenCount } from '../tokenizer/tokenizer';

export { tokenCount };

let counter = 0;

function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}_${counter}`;
}

export function resetIdCounter(): void {
  counter = 0;
}

export function loc(line: number, text: string): SourceLocation {
  return {
    startLine: line,
    startColumn: 0,
    endLine: line,
    endColumn: Math.max(text.length, 1)
  };
}

export function instruction(content: string, line: number): InstructionNode {
  return {
    id: nextId('instruction'),
    type: 'instruction',
    raw: content,
    content,
    normalized: normalizeInstruction(content),
    tokens: tokenCount(content),
    loc: loc(line, content)
  };
}

export function policy(content: string, line: number): PolicyNode {
  return {
    id: nextId('policy'),
    type: 'policy',
    raw: content,
    content,
    tokens: tokenCount(content),
    loc: loc(line, content)
  };
}

export function example(content: string, line: number): ExampleNode {
  return {
    id: nextId('example'),
    type: 'example',
    raw: content,
    content,
    tokens: tokenCount(content),
    loc: loc(line, content)
  };
}

export function retrieval(raw: string, line: number, topK?: number, source?: string): RetrievalNode {
  return {
    id: nextId('retrieval'),
    type: 'retrieval',
    raw,
    topK,
    source,
    tokens: tokenCount(raw),
    loc: loc(line, raw)
  };
}

export function memory(content: string, line: number): MemoryNode {
  return {
    id: nextId('memory'),
    type: 'memory',
    raw: content,
    content,
    tokens: tokenCount(content),
    loc: loc(line, content)
  };
}

export function tool(raw: string, line: number, name: string, permissions: string[] = []): ToolNode {
  return {
    id: nextId('tool'),
    type: 'tool',
    raw,
    name,
    permissions,
    tokens: tokenCount(raw),
    loc: loc(line, raw)
  };
}

export function skill(raw: string, line: number, name: string): SkillNode {
  return {
    id: nextId('skill'),
    type: 'skill',
    raw,
    name,
    tools: [],
    instructions: [],
    tests: [],
    tokens: tokenCount(raw),
    loc: loc(line, raw)
  };
}

export function skillTest(raw: string, line: number, name: string): SkillTestNode {
  return {
    id: nextId('skilltest'),
    type: 'skill_test',
    raw,
    name,
    content: raw,
    tokens: tokenCount(raw),
    loc: loc(line, raw)
  };
}

export function unknown(content: string, line: number): UnknownNode {
  return {
    id: nextId('unknown'),
    type: 'unknown',
    raw: content,
    content,
    tokens: tokenCount(content),
    loc: loc(line, content)
  };
}
