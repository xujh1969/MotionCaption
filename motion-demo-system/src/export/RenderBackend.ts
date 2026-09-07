import type { MotionProject } from '../project/types';

export interface RenderBackend {
  checkSupport(): Promise<{ supported: boolean; reasons: string[] }>;
  render(
    project: MotionProject,
    options: { format: 'webm-alpha'; width: number; height: number; fps: number },
    onProgress: (value: number) => void,
  ): Promise<Blob>;
}
