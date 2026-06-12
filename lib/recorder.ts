// ============================================================
// Per-action video clip recorder (MediaRecorder on the camera stream)
// ============================================================

export interface CapturedClip {
  url: string;
  mimeType: string;
  pokemonName: string;
  pokemonEmoji: string;
  action: string;
  pokemonType: string;
}

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  // mp4 first so iPad/iPhone Safari clips save as playable files
  const candidates = [
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) || '';
}

export class ClipRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private mimeType = '';

  get supported(): boolean {
    return typeof MediaRecorder !== 'undefined' && pickMimeType() !== '';
  }

  start(stream: MediaStream) {
    if (!this.supported || this.recorder?.state === 'recording') return;
    try {
      this.mimeType = pickMimeType();
      this.chunks = [];
      this.recorder = new MediaRecorder(stream, {
        mimeType: this.mimeType,
        videoBitsPerSecond: 1_500_000,
      });
      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };
      this.recorder.start();
    } catch {
      this.recorder = null;
    }
  }

  /** Stop and return a blob URL for the clip, or null if nothing recorded. */
  stop(): Promise<{ url: string; mimeType: string } | null> {
    return new Promise((resolve) => {
      const rec = this.recorder;
      if (!rec || rec.state !== 'recording') { resolve(null); return; }
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mimeType });
        this.chunks = [];
        this.recorder = null;
        if (blob.size < 1000) { resolve(null); return; }
        resolve({ url: URL.createObjectURL(blob), mimeType: this.mimeType });
      };
      try { rec.stop(); } catch { resolve(null); }
    });
  }

  /** Stop and throw away whatever was recorded. */
  discard() {
    const rec = this.recorder;
    if (rec && rec.state === 'recording') {
      rec.onstop = null;
      try { rec.stop(); } catch { /* already stopped */ }
    }
    this.chunks = [];
    this.recorder = null;
  }
}

export function revokeClips(clips: CapturedClip[]) {
  clips.forEach((c) => URL.revokeObjectURL(c.url));
}
