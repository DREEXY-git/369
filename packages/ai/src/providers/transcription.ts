import type {
  TranscriptionInput,
  TranscriptionProvider,
  TranscriptionResult,
  TranscriptionSegment,
} from './types.js';

/**
 * APIキー不要の文字起こし。
 * 文字起こし済みテキスト（貼り付け/txt）をそのまま使い、
 * 行頭の「話者:」形式があれば話者分離する。音声ファイルはプレースホルダ。
 */
export class FakeTranscriptionProvider implements TranscriptionProvider {
  readonly name = 'fake';

  async transcribe(input: TranscriptionInput): Promise<TranscriptionResult> {
    const raw =
      input.text ??
      '【デモ文字起こし】音声ファイルを受領しました。本番では TranscriptionProvider（Whisper 等）に差し替えます。';
    const lines = raw.split('\n').filter((l) => l.trim());
    const segments: TranscriptionSegment[] = [];
    let t = 0;
    for (const line of lines) {
      const m = line.match(/^\s*([^:：]{1,12})[:：]\s*(.*)$/);
      if (m && m[2]) {
        segments.push({ speaker: m[1]!.trim(), startSec: t, text: m[2]!.trim() });
      } else {
        segments.push({ speaker: '不明', startSec: t, text: line.trim() });
      }
      t += Math.max(5, Math.ceil(line.length / 6));
    }
    return { text: raw, segments, provider: this.name };
  }
}
