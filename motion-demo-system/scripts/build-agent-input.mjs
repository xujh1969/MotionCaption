#!/usr/bin/env node
// Builds a captionforge.agent-input JSON from an SRT subtitle file.
//
// The output is a valid Agent Input for the MotionCaption component skill:
//   - kind: captionforge.agent-input, schemaVersion: 1, componentLibraryVersion: 1
//   - video: 1920x1080 @ 30 fps by default; durationMs covers every cue's frame
//     end (validator requires round(durationMs * fps / 1000) >= last end frame).
//   - cues: each entry keeps the SAME cueId numbering as the application's own
//     parseSRT (cue-1, cue-2, ... with NO zero-padding, and empty text blocks
//     still consume an index).
//
// This script has zero runtime dependencies (Node only) so it can be shipped
// inside the skill folder and run on any machine.
//
// Usage:
//   node build-agent-input.mjs <captions.srt> [output.json] [--fps 30] [--width 1920] [--height 1080]
//
// With no output path the JSON is printed to stdout.

import { readFileSync, writeFileSync } from 'node:fs';

const timestampToMs = (value) => {
  const match = value.trim().match(/^(\d+):(\d{2}):(\d{2})[,.](\d{1,3})$/);
  if (!match) return undefined;
  const [, hours, minutes, seconds, fraction] = match;
  const ms = Number(fraction.padEnd(3, '0'));
  return ((Number(hours) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000 + ms;
};

// Mirror of the application's parseSRT: cues are numbered by their raw block
// index (a block with no text still occupies its index), times accept comma or
// dot fraction, and malformed blocks are dropped.
const parseSRTLike = (raw) => {
  if (!raw.trim()) return [];
  return raw.replace(/\r/g, '').trim().split(/\n\s*\n/).flatMap((block, blockIndex) => {
    const lines = block.split('\n');
    const timeIndex = lines.findIndex((line) => line.includes('-->'));
    if (timeIndex < 0) return [];

    const [startText, endText] = lines[timeIndex].split('-->');
    const startMs = timestampToMs(startText);
    const endMs = timestampToMs(endText);
    const text = lines.slice(timeIndex + 1).join('\n').trim();
    if (startMs === undefined || endMs === undefined || endMs <= startMs || !text) return [];

    return [{ cueId: `cue-${blockIndex + 1}`, startMs, endMs, text }];
  });
};

const parseArgs = (argv) => {
  const positional = [];
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--fps' || arg === '--width' || arg === '--height') {
      flags[arg.slice(2)] = Number(argv[index + 1]);
      index += 1;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
};

const main = () => {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  if (positional.length < 1) {
    process.stdout.write(
      'Usage: node build-agent-input.mjs <captions.srt> [output.json] [--fps 30] [--width 1920] [--height 1080]\n',
    );
    process.exitCode = 1;
    return;
  }

  const [srtPath, outputPath] = positional;
  const fps = flags.fps ?? 30;
  const width = flags.width ?? 1920;
  const height = flags.height ?? 1080;

  let raw;
  try {
    raw = readFileSync(srtPath, 'utf8');
  } catch (error) {
    process.stdout.write(`Cannot read SRT file: ${error.message}\n`);
    process.exitCode = 1;
    return;
  }

  const cues = parseSRTLike(raw);
  if (cues.length === 0) {
    process.stdout.write('No valid cues found in the SRT file.\n');
    process.exitCode = 1;
    return;
  }

  const lastEndMs = cues[cues.length - 1].endMs;
  const lastEndFrame = Math.ceil((lastEndMs * fps) / 1000);
  const durationMs = Math.ceil((lastEndFrame * 1000) / fps);

  const agentInput = {
    kind: 'captionforge.agent-input',
    schemaVersion: 1,
    componentLibraryVersion: 1,
    video: { width, height, fps, durationMs },
    cues,
  };

  const serialized = `${JSON.stringify(agentInput, null, 2)}\n`;
  if (outputPath) {
    try {
      writeFileSync(outputPath, serialized, 'utf8');
      process.stdout.write(`Wrote ${outputPath}\n`);
    } catch (error) {
      process.stdout.write(`Cannot write output: ${error.message}\n`);
      process.exitCode = 1;
    }
  } else {
    process.stdout.write(serialized);
  }
};

main();
