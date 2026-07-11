'use client';

// AI 社員プロフィールカード（v6.1・AI社員と3D Office の人物正本統一）。
// 人物・外見・静的プロフィールの唯一の正本は @hokko/shared の getAiCharacter(key)。
// このカードは /ai-agents/[id] と 3D オフィス詳細の双方で同じ AiCharacterProfile を描画するための共有表示層。
// 実測の稼働状態・実行・成果はここには含めない（キャラクター設定と実測を分離する）。
import type { AiCharacterProfile } from '@hokko/shared';
import { AiPortrait } from './portrait';

export function AiProfileCard({ profile, portraitSize = 84 }: { profile: AiCharacterProfile; portraitSize?: number }) {
  const hasProfile = profile.fullName !== '（設定未作成）';
  return (
    <div className="space-y-3 text-sm" data-testid="ai-profile-card">
      {/* 人物ヘッダー（ポートレート＋名前・二つ名） */}
      <div className="flex items-start gap-3">
        <span className="shrink-0 overflow-hidden rounded-lg shadow-md">
          <AiPortrait profile={profile} size={portraitSize} />
        </span>
        <div className="min-w-0">
          {profile.epithet ? (
            <div className="text-xs font-medium" style={{ color: profile.appearance.accentColor }} data-testid="ai-profile-epithet">
              ― {profile.epithet} ―
            </div>
          ) : null}
          <div className="text-base font-bold leading-tight" data-testid="ai-profile-name">
            {profile.fullName}
          </div>
          {profile.kana ? (
            <div className="text-xs text-muted-foreground">
              {profile.kana}（{profile.codeName}）
            </div>
          ) : null}
        </div>
      </div>

      {!hasProfile ? (
        <p className="rounded-md bg-secondary/40 p-2.5 text-xs text-muted-foreground">
          この AI 社員のキャラクター設定はまだ作成されていません（key: {profile.key}）。
        </p>
      ) : (
        <div className="space-y-2.5">
          <div>
            <div className="text-xs font-medium">性格</div>
            <p className="text-xs text-muted-foreground" data-testid="ai-profile-personality">{profile.personality}</p>
          </div>
          {profile.skills.length > 0 ? (
            <div>
              <div className="mb-1 text-xs font-medium">スキル（設定値・実測ではない）</div>
              <div className="space-y-1" data-testid="ai-profile-skills">
                {profile.skills.map((s) => (
                  <div key={s.name} className="grid grid-cols-[7.5rem_1fr_1.6rem] items-center gap-2" data-skill={`${s.name}:${s.level}`}>
                    <div className="truncate text-xs text-muted-foreground">{s.name}</div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${(Math.max(1, Math.min(5, s.level)) / 5) * 100}%` }}
                      />
                    </div>
                    <div className="text-right text-[11px] text-muted-foreground">Lv{s.level}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {profile.traits.length > 0 ? (
            <div>
              <div className="mb-1 text-xs font-medium">クセ・特徴</div>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground" data-testid="ai-profile-traits">
                {profile.traits.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {profile.commonMistakes.length > 0 ? (
            <div>
              <div className="mb-1 text-xs font-medium">よくあるミス（人間がレビューで見る所）</div>
              <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground" data-testid="ai-profile-mistakes">
                {profile.commonMistakes.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {profile.evaluationNote ? (
            <div>
              <div className="text-xs font-medium">評価コメント（設定・実測の成果主張ではない）</div>
              <p className="text-xs text-muted-foreground" data-testid="ai-profile-eval">{profile.evaluationNote}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
