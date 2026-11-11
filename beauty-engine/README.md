# AFRO LIVE Beauty Engine (test branch)

This folder contains GPU face-retouching modules adapted from
[ctbot000/face-beautifier](https://github.com/ctbot000/face-beautifier),
licensed under MIT. The original license is preserved in THIRD_PARTY_LICENSE.

## Current test-branch integration

- The WebGL2 renderer and face-region mask are connected to the AFRO LIVE
  creator camera preview.
- AFRO LIVE reuses its existing MediaPipe FaceLandmarker; it does not start a
  second face-detection model.
- The controls currently include skin smoothing, imperfection/tone evening,
  texture preservation, subtle face light, and eye brightness.
- The camera video remains visible as a fallback if the beauty engine fails.
- The camera frame processing is local in the browser; this module does not
  send camera frames to a beauty service.

## Not finished / not verified

- Background blur needs a separate person-segmentation mask and is not active.
- The transformed video is not yet published as the LiveKit creator camera.
- iPhone Safari and Android device testing is still required, especially across
  different skin tones and lighting conditions.
- Photo export and recording need device verification before release.
- These changes are only on feature/snap-camera-home; nothing was deployed to
  the public AFRO LIVE site.

The natural defaults intentionally avoid global whitening. The brightness
control starts at zero so the user's natural complexion is not lifted by
default.
