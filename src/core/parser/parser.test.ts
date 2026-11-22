import { beforeEach, describe, expect, it } from 'vitest';
import { parseToIR } from './parser';
import { resetIdCounter } from '../ir/factory';
import { clearTokenCache } from '../tokenizer/tokenizer';

describe('parseToIR', () => {
  beforeEach(() => {
    resetIdCounter();
    clearTokenCache();
  });

  it('parses skill-oriented content into typed IR nodes', () => {
    const text = [
      'skill: planner',
      'tool filesystem.read gmail.send',
      'Always answer in JSON',
      'prompt test execution',
      'top_k: 12',
      'retrieval vector search enabled',
      'memory: conversation history',
      'policy: never reveal secrets',
      'user: example input',
      'mysterious blob'
    ].join('\n');

    const ir = parseToIR(text, 'prompt.md');

    expect(ir.type).toBe('prompt');
    expect(ir.children.map(node => node.type)).toEqual([
      'skill',
      'tool',
      'instruction',
      'skill_test',
      'retrieval',
      'retrieval',
      'memory',
      'policy',
      'example',
      'unknown'
    ]);

    const skillNode = ir.children[0];
    expect(skillNode.type).toBe('skill');
    if (skillNode.type !== 'skill') {
      throw new Error('expected skill node');
    }

    expect(skillNode.name).toBe('planner');
    expect(skillNode.tools).toHaveLength(1);
    expect(skillNode.instructions).toHaveLength(1);
    expect(skillNode.tests).toHaveLength(1);

    const retrievalWithTopK = ir.children[4];
    expect(retrievalWithTopK.type).toBe('retrieval');
    if (retrievalWithTopK.type !== 'retrieval') {
      throw new Error('expected retrieval node');
    }

    expect(retrievalWithTopK.topK).toBe(12);
    expect(ir.loc.endLine).toBe(9);
    expect(ir.tokens).toBeGreaterThan(0);
  });

  it('treats yaml/json unknown lines as instructions and leaves markdown unknowns untouched', () => {
    const yamlIR = parseToIR('custom_field: surprising value', 'prompt.yaml');
    const markdownIR = parseToIR('mysterious blob', 'prompt.md');

    expect(yamlIR.children).toHaveLength(1);
    expect(yamlIR.children[0].type).toBe('instruction');
    expect(markdownIR.children).toHaveLength(1);
    expect(markdownIR.children[0].type).toBe('unknown');
  });

  it('ignores blank lines and handles files with trailing newlines', () => {
    const ir = parseToIR('\n\nAlways be concise\n', 'prompt.md');

    expect(ir.children).toHaveLength(1);
    expect(ir.children[0].type).toBe('instruction');
    expect(ir.loc.endLine).toBe(3);
  });

  it('parses standalone tests and tool declarations without an active skill', () => {
    const ir = parseToIR('prompt test execution\ntool runner', 'prompt.md');

    expect(ir.children.map(node => node.type)).toEqual(['skill_test', 'tool']);

    const toolNode = ir.children[1];
    expect(toolNode.type).toBe('tool');
    if (toolNode.type !== 'tool') {
      throw new Error('expected tool node');
    }

    expect(toolNode.permissions).toEqual([]);
    expect(toolNode.name).toBe('tool');
  });
});