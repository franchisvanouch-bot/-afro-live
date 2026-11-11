# AFRO LIVE Beauty Engine (test branch)

This folder contains GPU face-retouching modules adapted from
[ctbot000/face-beautifier](https://github.com/ctbot000/face-beautifier),
licensed under MIT. The original license is preserved in THIRD_PARTY_LICENSE.

## Current test-branch integration

- The WebGL2 renderer and face-region mask are connected to the AFRO LIVE
  creator camera preview.
- AFRO LIVE reuses its existing MediaPipe FaceLandmarker; it does not start a
  second face-detection model.
- Controls include skin smoothing, imperfection/tone evening, texture
  preservation, subtle face light, eye brightness, and background blur.
- Background blur uses MediaPipe ImageSegmenter with the SelfieSegmenter
  person/background model. The model labels background as category 0 and
  person as category 1. Segmentation is requested about 8-9 times per second;
  the latest mask is composited locally between model updates.
- The transformed preview canvas is also used by the existing photo capture
  and recording canvas paths.
- Camera frames are processed in the browser; this module does not upload
  frames to a beauty service.

## Not finished / not verified

- Background blur quality, mask edges, and frame rate have not been verified
  on real iPhone Safari or Android devices.
- The transformed video is not yet published as the LiveKit creator camera.
- Photo export and recording need device verification before release.
- These changes are only on feature/snap-camera-home; nothing was deployed to
  the public AFRO LIVE site.
- A segmentation failure falls back to the original camera image rather than
  showing a broken or blank preview.

The natural defaults intentionally avoid global whitening. The face-light
control starts at zero and background blur starts at zero; the user chooses
whether to enable them.
