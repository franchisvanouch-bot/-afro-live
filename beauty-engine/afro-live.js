import { Renderer, ShaderError } from "./renderer.js";
import { MaskPainter } from "./mask.js";
import { computeFace } from "./face.js";
import { faceUniforms, blurScaleFor } from "./warp.js";

const DEFAULTS = Object.freeze({
  smooth: 38,
  texture: 62,
  even: 18,
  detail: 14,
  faceLight: 0,
  eyeLight: 12,
  underEye: 10,
  warmth: 0,
});

const clamp = (v, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, Number(v) || 0));

/**
 * AFRO LIVE adapter for the existing MediaPipe landmarks.
 * Camera frames stay in the browser; this module does not upload media.
 */
export class AfroBeautyEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.painter = new MaskPainter(320);
    this.points = new Float32Array(478 * 2);
    this.lastSize = "";
    this.enabled = true;
  }

  render(video, landmarks, options = {}) {
    if (!this.enabled || !video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return false;

    const width = video.videoWidth;
    const height = video.videoHeight;
    const size = width + "x" + height;
    if (size !== this.lastSize) {
      this.lastSize = size;
      this.renderer.resize(width, height);
      this.painter.setAspect(width / height);
    }

    let hasFace = Array.isArray(landmarks) && landmarks.length >= 478;
    if (hasFace) {
      for (let i = 0; i < 478; i++) {
        this.points[i * 2] = landmarks[i].x;
        this.points[i * 2 + 1] = landmarks[i].y;
      }
    }

    const facePoints = hasFace ? this.points : null;
    const face = computeFace(facePoints, width / height);
    const values = { ...DEFAULTS, ...options };
    const smooth = clamp(values.smooth) / 100;
    const texture = clamp(values.texture) / 100;
    const even = clamp(values.even) / 100;
    const detail = clamp(values.detail) / 100;

    const params = {
      smooth,
      texture,
      even,
      sharpen: detail * 0.22,
      radius: 1.25,
      bright: (clamp(values.faceLight) / 100) * 0.10,
      warmth: (clamp(values.warmth, -100, 100) / 100) * 0.18,
      vibrance: 0,
      contrast: 0,
      glow: 0,
      vignette: 0,
      grain: 0,
      eyeBright: (clamp(values.eyeLight) / 100) * 0.28,
      underEye: (clamp(values.underEye) / 100) * 0.22,
      lipColor: [0.77, 0.28, 0.37],
      lipAmount: 0,
      blushColor: [1, 0.5, 0.43],
      blushAmount: 0,
    };

    const source = options.source || video;
    this.renderer.uploadSource(source, width, height);
    this.renderer.uploadMask(facePoints ? this.painter.paint(facePoints) : this.painter.clear());
    this.renderer.render({
      params,
      warps: [],
      face: faceUniforms(face, face ? 1 : 0),
      blurScale: blurScaleFor(face, height, params.radius),
      mirror: options.mirror ? 1 : 0,
      compare: -1,
      showMask: false,
      time: performance.now() / 1000,
    });
    return true;
  }

  captureStream(fps = 30) {
    if (!this.canvas.captureStream) return null;
    return this.canvas.captureStream(fps);
  }

  toBlob(type = "image/jpeg", quality = 0.92) {
    return new Promise(resolve => this.canvas.toBlob(resolve, type, quality));
  }
}

export { ShaderError };
export const AFRO_BEAUTY_DEFAULTS = DEFAULTS;
