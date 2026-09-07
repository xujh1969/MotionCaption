import { describe, expect, it } from 'vitest';
import type { MotionProject } from './types';
import { parseProject, serializeProject } from './serialize';

const validProject: MotionProject = {
  kind: 'captionforge.project',
  schemaVersion: 1,
  video: { width: 1920, height: 1080, fps: 30, durationInFrames: 300 },
  cues: [{ cueId: 'cue-1', startMs: 0, endMs: 1000, text: '字幕' }],
  effects: [],
};

describe('project serialization', () => {
  it('writes the strict captionforge.project document only', () => {
    const serialized = serializeProject(validProject);
    expect(JSON.parse(serialized)).toEqual(validProject);
    expect(serialized).toContain('"kind": "captionforge.project"');
  });

  it('rejects runtime-only or unknown fields instead of persisting them', () => {
    const projectWithFile = {
      ...validProject,
      sourceFile: { name: 'private.mp4', absolutePath: 'C:\\private\\video.mp4' },
    };

    expect(() => serializeProject(projectWithFile as MotionProject)).toThrow(/Invalid project/);
  });
});

describe('project parsing', () => {
  it('returns a displayable error for malformed JSON', () => {
    expect(parseProject('{')).toEqual({
      ok: false,
      code: 'invalid_json',
      message: '工程文件不是有效的 JSON。',
    });
  });

  it('returns a displayable error for unknown schema versions', () => {
    expect(parseProject(JSON.stringify({ ...validProject, schemaVersion: 2 }))).toEqual({
      ok: false,
      code: 'unsupported_version',
      message: '不支持的工程版本：2。',
    });
  });

  it('strictly rejects unknown and invalid fields', () => {
    const unknown = parseProject(JSON.stringify({ ...validProject, extra: true }));
    expect(unknown).toMatchObject({ ok: false, code: 'invalid_project' });
    if (!unknown.ok) expect(unknown.message).toContain('工程文件格式无效');

    const invalid = parseProject(JSON.stringify({
      ...validProject,
      video: { ...validProject.video, fps: 0 },
    }));
    expect(invalid).toMatchObject({ ok: false, code: 'invalid_project' });
  });

  it('returns a validated project value', () => {
    expect(parseProject(JSON.stringify(validProject))).toEqual({ ok: true, project: validProject });
  });
});
