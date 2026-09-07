# Transparent render backend decision

## Decision

**Web Renderer is not approved as the primary export backend.** Keep the
`RenderBackend` boundary and use a Node/Remotion sidecar as the next backend
candidate.

The browser can encode transparent VP9/WebM, and the text and card samples were
acceptable. However, the exported `t7-06` gauge drops its SVG track and progress
arc at representative frames. This is a perceptible visual degradation, so the
three-component pass criterion is not met.

## Candidate under test

- Package: `@remotion/web-renderer` `4.0.518`
- Settings: `container: 'webm'`, `videoCodec: 'vp9'`, `transparent: true`
- Browser support probe runs before rendering. A failed probe throws with its
  reasons; it does not fall back to an opaque render.
- Shared picture source: `ProjectComposition`

## User-confirmed samples

| Component | Category | Result |
| --- | --- | --- |
| `t1-05` | Pure text | No perceptible mismatch found in the four sampled frames |
| `t2-02` | Glow/shadow card | No perceptible mismatch found in the four sampled frames |
| `t7-06` | Chart | **Fail:** exported SVG gauge arcs are missing |

## Browser acceptance evidence

Acceptance ran in a real Chromium browser on Windows 10:

`Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36`

`checkSupport()` returned `{supported: true, reasons: []}`. Each sample was a
1920×1080, 30 fps, 60-frame project rendered through the production backend.
All three calls completed with progress `1` and returned `video/webm` blobs:

| Component | Blob size |
| --- | ---: |
| `t1-05` | 190,927 bytes |
| `t2-02` | 281,494 bytes |
| `t7-06` | 175,533 bytes |

The compared frames were 0 (entry), 10 (mid-entry), 30 (settled), and 58
(before end). Player and decoded export were displayed side-by-side on a black
background and checked for font, gradient, shadow, border, opacity, position,
and scale.

- `t1-05`: title, subtitle, underline, placement, scale, and entry progression
  matched at the four sampled frames.
- `t2-02`: card geometry, border/glow, tag, title, placement, scale, and staged
  entry matched at the four sampled frames.
- `t7-06`: Player shows the gray track and blue progress arc from entry onward;
  the decoded export omits both SVG arcs at frames 10, 30, and 58. The percentage,
  label, and endpoint remain, which makes the loss unambiguous.

For Alpha validation, each exported WebM was played over white, black, and
magenta backgrounds at frame 58. The backgrounds remained visible outside the
graphics, with no opaque black fill or obvious edge-color contamination. Canvas
sampling also found alpha-zero pixels in every sampled frame. Alpha therefore
passed; visual parity failed independently.

The browser console contained Remotion license-configuration warnings but no
Web Renderer CSS warnings. A production integration still needs an appropriate
license key or an explicit, valid free-license declaration; this bake-off did
not assume license eligibility.

## Consequence

Do not connect `webRendererBackend` to the editor's shipping export action. The
implementation remains an isolated, replaceable candidate and demonstrates the
required fail-closed support behavior. The next bake-off should implement the
same `RenderBackend` interface with the Node/Remotion sidecar and repeat these
three samples, four frames, and three Alpha backgrounds.
