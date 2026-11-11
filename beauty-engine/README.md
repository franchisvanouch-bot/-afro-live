# AFRO LIVE Beauty Engine (test branch)

This folder contains isolated GPU face-retouching modules adapted from
[ctbot000/face-beautifier](https://github.com/ctbot000/face-beautifier),
licensed under MIT. The original license is preserved in THIRD_PARTY_LICENSE.

These files are an integration foundation only. They are not yet connected to
the AFRO LIVE camera, recording, or LiveKit publishing pipeline. No production
deployment has been made.

Planned integration:
- reuse AFRO LIVE's existing MediaPipe FaceLandmarker landmarks;
- generate a face-region mask that excludes eyes, brows, and lips from skin smoothing;
- render the camera through WebGL2 with texture-preserving smoothing and subtle tone correction;
- add independent user controls and an automatic natural preset;
- keep the original camera/audio path as a safe fallback if WebGL2 is unavailable.

Before release, test on iPhone Safari and Android across a range of skin tones.
