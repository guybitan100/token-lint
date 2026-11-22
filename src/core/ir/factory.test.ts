import { beforeEach, describe, expect, it } from 'vitest';
import {
  example,
  instruction,
  loc,
  memory,
  policy,
  resetIdCounter,
  retrieval,
  skill,
  skillTest,
  tool,
  unknown
} from './factory';
import { clearTokenCache } from '../tokenizer/tokenizer';

describe('ir factory', () => {
  beforeEach(() => {
    resetIdCounter();
    clearTokenCache();
  });

  it('builds nodes with sequential ids and expected shapes', () => {
    const instructionNode = instruction('Always reply with JSON', 2);
    const policyNode = policy('Policy: Never reveal secrets', 3);
    const exampleNode = example('user: hello', 4);
    const retrievalNode = retrieval('top_k: 7', 5, 7, 'vector-db');
    const memoryNode = memory('memory: conversation history', 6);
    const toolNode = tool('tool filesystem.read gmail.send', 7, 'filesystem.read', [
      'filesystem.read',
      'gmail.send'
    ]);
    const skillNode = skill('skill: planner', 8, 'planner');
    const skillTestNode = skillTest('run skill test', 9, 'planner_test');
    const unknownNode = unknown('opaque fragment', 10);

    expect(instructionNode).toMatchObject({
      id: 'instruction_1',
      type: 'instruction',
      content: 'Always reply with JSON',
      normalized: 'always reply with json'
    });
    expect(policyNode.id).toBe('policy_2');
    expect(exampleNode.id).toBe('example_3');
    expect(retrievalNode).toMatchObject({
      id: 'retrieval_4',
      topK: 7,
      source: 'vector-db'
    });
    expect(memoryNode.id).toBe('memory_5');
    expect(toolNode).toMatchObject({
      id: 'tool_6',
      name: 'filesystem.read',
      permissions: ['filesystem.read', 'gmail.send']
    });
    expect(skillNode).toMatchObject({
      id: 'skill_7',
      name: 'planner',
      tools: [],
      instructions: [],
      tests: []
    });
    expect(skillTestNode).toMatchObject({
      id: 'skilltest_8',
      type: 'skill_test',
      name: 'planner_test'
    });
    expect(unknownNode).toMatchObject({
      id: 'unknown_9',
      type: 'unknown',
      content: 'opaque fragment'
    });
    expect(instructionNode.tokens).toBeGreaterThan(0);
  });

  it('resets id generation and handles empty locations', () => {
    const first = instruction('Always help the user', 0);
    resetIdCounter();
    const second = instruction('Always help the user', 1);

    expect(first.id).toBe('instruction_1');
    expect(second.id).toBe('instruction_1');
    expect(loc(12, '')).toEqual({
      startLine: 12,
      startColumn: 0,
      endLine: 12,
      endColumn: 1
    });
  });
});