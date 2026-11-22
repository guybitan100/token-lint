import { PromptNode, IRNode, SkillNode } from '../ir/nodes';
import {
  instruction,
  policy,
  example,
  retrieval,
  memory,
  tool,
  skill,
  skillTest,
  unknown,
  tokenCount,
  resetIdCounter
} from '../ir/factory';
import { detectKind } from './languageDetector';
import { looksLikeInstruction } from './normalizer';

export function parseToIR(text: string, fileName = 'unknown'): PromptNode {
  resetIdCounter();
  const kind = detectKind(fileName);
  const children: IRNode[] = [];

  const lines = text.split(/\r?\n/);
  let currentSkill: SkillNode | null = null;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const lower = trimmed.toLowerCase();

    if (!trimmed) return;

    const skillMatch =
      trimmed.match(/(?:name|skill)\s*[:=]\s*["']?([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/skill\s+([a-zA-Z0-9_-]+)/i);

    if (skillMatch && lower.includes('skill')) {
      currentSkill = skill(trimmed, index, skillMatch[1]);
      children.push(currentSkill);
      return;
    }

    if (lower.includes('test') && (lower.includes('skill') || lower.includes('prompt'))) {
      const test = skillTest(trimmed, index, extractName(trimmed, 'skill_test'));
      if (currentSkill) currentSkill.tests.push(test);
      children.push(test);
      return;
    }

    if (lower.includes('top_k')) {
      const topK = extractNumber(trimmed, /top_k\s*[:=]\s*(\d+)/i);
      children.push(retrieval(trimmed, index, topK));
      return;
    }

    if (lower.includes('retrieval') || lower.includes('vector') || lower.includes('rag')) {
      children.push(retrieval(trimmed, index));
      return;
    }

    if (lower.includes('memory') || lower.includes('conversation history')) {
      children.push(memory(trimmed, index));
      return;
    }

    if (lower.includes('policy') || lower.includes('constraint') || lower.includes('rule')) {
      children.push(policy(trimmed, index));
      return;
    }

    if (lower.includes('example') || lower.startsWith('user:') || lower.startsWith('assistant:')) {
      children.push(example(trimmed, index));
      return;
    }

    if (lower.includes('tool') || lower.includes('permission') || /[a-z]+\.[a-z]+/.test(lower)) {
      const permissions = extractPermissions(trimmed);
      const toolName = permissions[0] || extractName(trimmed, 'tool');
      const t = tool(trimmed, index, toolName, permissions);
      if (currentSkill) currentSkill.tools.push(t);
      children.push(t);
      return;
    }

    if (looksLikeInstruction(trimmed)) {
      const node = instruction(trimmed, index);
      if (currentSkill) currentSkill.instructions.push(node);
      children.push(node);
      return;
    }

    if (kind === 'json' || kind === 'yaml') {
      children.push(instruction(trimmed, index));
      return;
    }

    children.push(unknown(trimmed, index));
  });

  return {
    id: 'root',
    type: 'prompt',
    raw: text,
    tokens: tokenCount(text),
    loc: {
      startLine: 0,
      startColumn: 0,
      endLine: Math.max(lines.length - 1, 0),
      endColumn: lines[lines.length - 1]?.length || 1
    },
    children
  };
}

function extractNumber(text: string, regex: RegExp): number | undefined {
  const match = text.match(regex);
  return match ? Number(match[1]) : undefined;
}

function extractName(text: string, fallback: string): string {
  const match = text.match(/["']?([a-zA-Z0-9_-]{3,})["']?/);
  return match ? match[1] : fallback;
}

function extractPermissions(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g);
  return matches || [];
}
