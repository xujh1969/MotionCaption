export const WEBM_ALPHA_RENDER_OPTIONS = {
  container: 'webm',
  videoCodec: 'vp9',
  transparent: true,
  muted: true,
} as const;

export interface WebRendererSupportResult {
  canRender: boolean;
  issues: Array<{ message: string }>;
}

export type WebRendererSupportProbe = (
  options: typeof WEBM_ALPHA_RENDER_OPTIONS & { width: number; height: number },
) => Promise<WebRendererSupportResult>;

export async function evaluateWebmAlphaSupport(
  probe: WebRendererSupportProbe,
  width: number,
  height: number,
): Promise<{ supported: boolean; reasons: string[] }> {
  const result = await probe({
    ...WEBM_ALPHA_RENDER_OPTIONS,
    width,
    height,
  });

  if (result.canRender) return { supported: true, reasons: [] };

  const reasons = result.issues.map(({ message }) => message);
  return {
    supported: false,
    reasons: reasons.length > 0
      ? reasons
      : ['Browser cannot encode transparent VP9/WebM.'],
  };
}
