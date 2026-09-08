// End-to-end check: import a self-contained Agent draft into a brand-new empty
// project (no SRT imported, no video loaded, default 300-frame duration) and
// assert the program's own import pipeline accepts it.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const draftPath = process.argv[2] ?? resolve(projectRoot, '../../Desktop/captionforge.agent-draft.json');

const emptyProject = {
  kind: 'captionforge.project',
  schemaVersion: 1,
  video: { width: 1920, height: 1080, fps: 30, durationInFrames: 300 },
  cues: [],
  effects: [],
};

let draft;
try {
  draft = JSON.parse(await readFile(draftPath, 'utf8'));
} catch (error) {
  console.error(`Cannot read draft: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}

const server = await createServer({ root: projectRoot, appType: 'custom', server: { middlewareMode: true } });
try {
  const { importAgentSequence } = await server.ssrLoadModule('/src/agent/importAgentSequence.ts');
  const result = importAgentSequence(emptyProject, draft);

  if (!result.ok) {
    console.log('IMPORT FAILED:');
    for (const error of result.errors) console.log(`  - ${error.message}`);
    process.exitCode = 1;
  } else {
    const { project, warnings } = result;
    console.log('IMPORT OK');
    console.log(`  project duration: ${project.video.durationInFrames} frames @ ${project.video.fps}fps = ${(project.video.durationInFrames / project.video.fps).toFixed(1)}s`);
    console.log(`  cues: ${project.cues.length}`);
    for (const cue of project.cues) {
      console.log(`    ${cue.cueId}  ${(cue.startMs / 1000).toFixed(1)}s-${(cue.endMs / 1000).toFixed(1)}s  ${cue.text.slice(0, 40)}`);
    }
    console.log(`  effects: ${project.effects.length}`);
    for (const effect of project.effects.slice(0, 20)) {
      console.log(`    ${effect.componentId}  scene=${effect.sceneId}  track=${effect.track}  frame ${effect.startFrame}-${effect.startFrame + effect.durationInFrames}`);
    }
    if (warnings.length) {
      console.log('  warnings:');
      for (const warning of warnings) console.log(`    - ${warning.message}`);
    }
  }
} finally {
  await server.close();
}
