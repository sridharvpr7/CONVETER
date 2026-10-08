// ============================================================
// CONVETER — Media Tools (Audio / Video)
// Browser-side processing using Web APIs.
// True cross-format video transcoding and speech-to-text
// require a backend service (see BACKEND_URL env var).
// ============================================================

import type { ProcessorResult } from './processors';
import { ProcessorError } from './processors';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function basename(filename: string): string {
  return filename.replace(/\.[^.]+$/, '');
}

function guessMime(format: string): string {
  const map: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    gif: 'image/gif',
  };
  return map[format.toLowerCase()] ?? 'application/octet-stream';
}

// ─────────────────────────────────────────────────────────
// Video-to-Audio extraction using HTML5 + AudioContext
// Works for MP4, WebM, and MOV (browser-decoded) → WAV/OGG
// ─────────────────────────────────────────────────────────

export async function extractAudioFromVideo(
  file: File,
  targetFormat: 'wav' | 'ogg' | 'mp3' = 'wav'
): Promise<ProcessorResult> {
  // Decode audio using AudioContext
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();

  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch {
    throw new ProcessorError(
      'Could not decode audio from this file. The browser cannot decode this video format. ' +
      'Try converting to MP4 first, or use the backend-powered Video to Audio tool.',
      'DECODE_ERROR'
    );
  }

  // Render to WAV (PCM) — universally supported
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);
  const rendered = await offlineCtx.startRendering();
  await audioCtx.close();

  const wavBlob = encodeWav(rendered);
  const outFormat = targetFormat === 'wav' ? 'wav' : 'wav'; // Browser can only produce WAV natively
  const mimeType = 'audio/wav';
  const filename = `${basename(file.name)}_audio.wav`;

  return {
    blob: wavBlob,
    filename,
    mimeType,
    meta: {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      outputSize: wavBlob.size,
      note: outFormat !== targetFormat ? `Browser produced WAV (requested ${targetFormat} requires server)` : '',
    },
  };
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length;
  const bitDepth = 16;
  const blockAlign = (numChannels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const ab = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(ab);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([ab], { type: 'audio/wav' });
}

// ─────────────────────────────────────────────────────────
// Video-to-GIF — uses Canvas frame capture + gif.js-like
// encoding. We produce an animated WebP-in-a-GIF container
// using canvas frames. Real GIF encoding requires a worker;
// we produce a simple series of frames zipped as PNG.
// ─────────────────────────────────────────────────────────

export async function videoToGif(
  file: File,
  options: { fps?: number; durationSeconds?: number; width?: number } = {}
): Promise<ProcessorResult> {
  const { fps = 10, durationSeconds = 5, width = 480 } = options;

  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'metadata';
  const objectUrl = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new ProcessorError('Could not load video for frame extraction.', 'VIDEO_LOAD_ERROR'));
    video.src = objectUrl;
  });

  const totalDuration = Math.min(video.duration, durationSeconds);
  const totalFrames = Math.round(totalDuration * fps);
  const aspectRatio = video.videoHeight / video.videoWidth;
  const canvasWidth = width;
  const canvasHeight = Math.round(canvasWidth * aspectRatio);

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d')!;

  // Capture frames at each time point
  const frames: Blob[] = [];
  for (let i = 0; i < totalFrames; i++) {
    const time = (i / totalFrames) * totalDuration;
    await seekVideo(video, time);
    ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('frame blob failed'))), 'image/png')
    );
    frames.push(blob);
  }

  URL.revokeObjectURL(objectUrl);

  // Bundle frames as a ZIP (true GIF encoding requires a server-side library)
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  frames.forEach((frame, i) => zip.file(`frame_${String(i).padStart(4, '0')}.png`, frame));

  const note = [
    'Your browser cannot encode a binary GIF natively.',
    `These ${totalFrames} PNG frames at ${fps}fps cover the first ${totalDuration.toFixed(1)}s.`,
    'To combine them into a GIF, use a tool like ffmpeg:',
    `  ffmpeg -framerate ${fps} -i frame_%04d.png output.gif`,
    'Or upload to any online PNG-sequence-to-GIF converter.',
  ].join('\n');
  zip.file('HOW_TO_ASSEMBLE_GIF.txt', note);

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });

  return {
    blob: zipBlob,
    filename: `${basename(file.name)}_gif_frames.zip`,
    mimeType: 'application/zip',
    meta: {
      frames: frames.length,
      fps,
      width: canvasWidth,
      height: canvasHeight,
      duration: totalDuration,
      note: 'PNG frames zipped — see HOW_TO_ASSEMBLE_GIF.txt',
    },
  };
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    video.onseeked = () => resolve();
    video.currentTime = time;
  });
}

// ─────────────────────────────────────────────────────────
// Audio conversion — browser can re-encode WAV, OGG via
// MediaRecorder when the source can be decoded. For formats
// that the browser cannot decode, we provide a clear error.
// ─────────────────────────────────────────────────────────

export async function convertAudio(
  file: File,
  targetFormat: 'wav' | 'ogg' | 'webm' = 'wav'
): Promise<ProcessorResult> {
  // Decode the source audio
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  } catch {
    await audioCtx.close();
    throw new ProcessorError(
      `Your browser cannot decode ${file.name}. Supported formats: MP3, WAV, OGG, M4A, AAC, WebM audio. ` +
      'FLAC and some AAC/M4A variants may not be supported on all browsers.',
      'DECODE_ERROR'
    );
  }

  await audioCtx.close();
  const wavBlob = encodeWav(audioBuffer);
  const outFilename = `${basename(file.name)}.wav`;

  return {
    blob: wavBlob,
    filename: outFilename,
    mimeType: 'audio/wav',
    meta: {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      outputSize: wavBlob.size,
      note: targetFormat !== 'wav' ? `Produced WAV — ${targetFormat} encoding requires server-side FFmpeg` : '',
    },
  };
}

// ─────────────────────────────────────────────────────────
// Video "compression" — remux by re-encoding through canvas
// (reduces resolution → smaller file). True codec compression
// (H.264/H.265 etc.) requires FFmpeg on a server.
// ─────────────────────────────────────────────────────────

export async function compressVideoCanvas(
  file: File,
  options: { scalePercent?: number } = {}
): Promise<ProcessorResult> {
  const { scalePercent = 50 } = options;

  const video = document.createElement('video');
  video.muted = true;
  const objectUrl = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new ProcessorError('Could not load video.', 'VIDEO_LOAD_ERROR'));
    video.src = objectUrl;
  });

  const targetWidth = Math.round((video.videoWidth * scalePercent) / 100);
  const targetHeight = Math.round((video.videoHeight * scalePercent) / 100);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;

  // Use MediaRecorder to capture canvas stream
  const stream = canvas.captureStream(25);

  // Add audio track if MediaRecorder and captureStream support it
  const supported = typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/webm;codecs=vp8');
  if (!supported) {
    URL.revokeObjectURL(objectUrl);
    throw new ProcessorError(
      'Your browser does not support canvas-based video encoding. ' +
      'True video compression requires a server-side backend with FFmpeg.',
      'NOT_SUPPORTED'
    );
  }

  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  await new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new ProcessorError('MediaRecorder error during video compression.', 'RECORDER_ERROR'));
    recorder.start(100);

    video.onended = () => { recorder.stop(); URL.revokeObjectURL(objectUrl); };
    video.onerror = () => reject(new ProcessorError('Video playback error during processing.'));

    const drawFrame = () => {
      if (video.ended || video.paused) return;
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      requestAnimationFrame(drawFrame);
    };
    video.play().then(() => {
      requestAnimationFrame(drawFrame);
    }).catch(() => reject(new ProcessorError('Could not play video for processing.')));
  });

  const blob = new Blob(chunks, { type: 'video/webm' });
  return {
    blob,
    filename: `${basename(file.name)}_compressed.webm`,
    mimeType: 'video/webm',
    meta: {
      originalSize: file.size,
      outputSize: blob.size,
      width: targetWidth,
      height: targetHeight,
      scalePercent,
      note: 'Re-encoded as WebM VP8; audio track is not preserved in canvas mode.',
    },
  };
}
