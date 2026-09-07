import { MotionProjectSchema } from './schema';
import type { MotionProject } from './types';

export type ProjectOpenErrorCode = 'invalid_json' | 'unsupported_version' | 'invalid_project';

export type ParseProjectResult =
  | { ok: true; project: MotionProject }
  | { ok: false; code: ProjectOpenErrorCode; message: string };

const formatIssues = (issues: Array<{ message: string; path: Array<string | number> }>): string => (
  issues.map(({ message, path }) => `${path.join('.') || 'project'}: ${message}`).join('；')
);

export function parseProject(serialized: string): ParseProjectResult {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return { ok: false, code: 'invalid_json', message: '工程文件不是有效的 JSON。' };
  }

  if (
    value !== null
    && typeof value === 'object'
    && 'schemaVersion' in value
    && value.schemaVersion !== 1
  ) {
    return {
      ok: false,
      code: 'unsupported_version',
      message: `不支持的工程版本：${String(value.schemaVersion)}。`,
    };
  }

  const parsed = MotionProjectSchema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'invalid_project',
      message: `工程文件格式无效：${formatIssues(parsed.error.issues)}。`,
    };
  }

  return { ok: true, project: parsed.data };
}

export function serializeProject(project: MotionProject): string {
  const parsed = MotionProjectSchema.safeParse(project);
  if (!parsed.success) {
    throw new Error(`Invalid project: ${formatIssues(parsed.error.issues)}`);
  }
  return JSON.stringify(parsed.data, null, 2);
}
