'use client';

// AI 社員のポートレート（Phase 4 Stream D・roadmap77）。
// 外部画像・外部フォント・既存作品のアセットは使用しない（CSP/ライセンス制約）。
// すべて手書きのベクター（SVG）で、上品な JRPG 調の「端正な」バストアップを描く。
// appearance（@hokko/shared の AiCharacterProfile）から髪型・配色を組み立てる決定論コンポーネント。
import { useId } from 'react';
import type { AiCharacterProfile } from '@hokko/shared';

const OUTLINE = '#241f2e';

export function AiPortrait({ profile, size = 96 }: { profile: AiCharacterProfile; size?: number }) {
  const uid = useId().replace(/[:]/g, '');
  const a = profile.appearance;
  const fem = a.genderStyle === 'fem';
  // v6.7: portrait の視覚 identity を決定論的に表す fingerprint（SVG 描画を駆動する全 appearance 値）。
  // E2E は getAiCharacter(key).appearance から同じ値を計算して照合できる（SVG 存在だけの合格を廃する）。
  const portraitFp = [
    profile.key,
    a.genderStyle,
    a.hairStyle,
    a.hairColor,
    a.hairShadow,
    a.skinTone,
    a.eyeColor,
    a.suitColor,
    a.accentColor,
    a.glasses ? 'glasses' : 'no-glasses',
  ].join('|');
  const irisId = `iris-${uid}`;
  const bgId = `bg-${uid}`;
  const hairId = `hair-${uid}`;
  const skinShadow = 'rgba(120,72,52,0.16)';

  const eye = (cx: number) => (
    <g>
      {/* 白目 */}
      <path
        d={`M${cx - 8.5},96.5 Q${cx},89.5 ${cx + 8.5},96.5 Q${cx},103.5 ${cx - 8.5},96.5 Z`}
        fill="#ffffff"
        stroke="rgba(36,31,46,0.25)"
        strokeWidth="0.6"
      />
      {/* 虹彩・瞳 */}
      <circle cx={cx} cy={96.6} r={5.6} fill={`url(#${irisId})`} />
      <circle cx={cx} cy={96.6} r={2.4} fill={OUTLINE} />
      {/* ハイライト（生気の要） */}
      <circle cx={cx - 2.1} cy={94.6} r={1.7} fill="#ffffff" opacity="0.95" />
      <circle cx={cx + 2.4} cy={98.6} r={0.9} fill="#ffffff" opacity="0.8" />
      {/* 上まつげ */}
      <path
        d={`M${cx - 9.5},95.6 Q${cx},87.6 ${cx + 9.5},95.4 Q${cx + 6},91.8 ${cx},91.4 Q${cx - 6},91.8 ${cx - 9.5},95.6 Z`}
        fill={OUTLINE}
      />
      {fem ? <path d={`M${cx + 8.6},94.4 q3.2,-1.8 4.6,-0.6`} stroke={OUTLINE} strokeWidth="1.1" fill="none" strokeLinecap="round" /> : null}
      {/* 下まぶた */}
      <path d={`M${cx - 6},101.8 Q${cx},104 ${cx + 6},101.8`} stroke="rgba(36,31,46,0.35)" strokeWidth="0.8" fill="none" />
      {/* 二重ライン */}
      <path d={`M${cx - 7},90.2 Q${cx},87 ${cx + 7},90.2`} stroke="rgba(36,31,46,0.28)" strokeWidth="0.8" fill="none" />
    </g>
  );

  const brow = (cx: number, flip: number) => (
    <path
      d={
        fem
          ? `M${cx - 8 * flip},84.4 Q${cx},81 ${cx + 8 * flip},83.6`
          : `M${cx - 8.5 * flip},85 Q${cx},81.6 ${cx + 8.5 * flip},84`
      }
      stroke={a.hairShadow}
      strokeWidth={fem ? 1.7 : 2.6}
      strokeLinecap="round"
      fill="none"
    />
  );

  // ---- 髪型（背面レイヤーと前髪レイヤー） ----
  const backHair = () => {
    switch (a.hairStyle) {
      case 'long':
        return (
          <path
            d="M100,42 C64,42 54,72 56,100 C57,124 50,150 44,168 L74,168 C70,146 72,124 72,108 L128,108 C128,124 130,146 126,168 L156,168 C150,150 143,124 144,100 C146,72 136,42 100,42 Z"
            fill={`url(#${hairId})`}
            stroke={OUTLINE}
            strokeWidth="1.2"
          />
        );
      case 'ponytail':
        return (
          <g>
            <path
              d="M100,44 C68,44 58,70 60,96 L140,96 C142,70 132,44 100,44 Z"
              fill={`url(#${hairId})`}
              stroke={OUTLINE}
              strokeWidth="1.2"
            />
            {/* 高い位置の一本結び（肩の後ろへ流れる） */}
            <path
              d="M136,62 C154,74 152,108 146,138 C144,150 138,160 132,164 C136,148 138,120 132,100 C130,88 132,72 136,62 Z"
              fill={`url(#${hairId})`}
              stroke={OUTLINE}
              strokeWidth="1.2"
            />
            <circle cx="137" cy="66" r="3.4" fill={a.accentColor} stroke={OUTLINE} strokeWidth="0.8" />
          </g>
        );
      case 'bob':
        return (
          <path
            d="M100,44 C66,44 56,70 58,98 C59,116 64,128 72,134 L128,134 C136,128 141,116 142,98 C144,70 134,44 100,44 Z"
            fill={`url(#${hairId})`}
            stroke={OUTLINE}
            strokeWidth="1.2"
          />
        );
      case 'wavy':
        return (
          <path
            d="M100,44 C66,44 57,70 59,94 C60,104 58,110 62,116 C66,111 68,106 68,100 L132,100 C132,106 134,111 138,116 C142,110 140,104 141,94 C143,70 134,44 100,44 Z"
            fill={`url(#${hairId})`}
            stroke={OUTLINE}
            strokeWidth="1.2"
          />
        );
      default:
        // short / parted は襟足のみ
        return (
          <path
            d="M100,46 C70,46 61,70 63,94 L137,94 C139,70 130,46 100,46 Z"
            fill={`url(#${hairId})`}
            stroke={OUTLINE}
            strokeWidth="1.2"
          />
        );
    }
  };

  const frontHair = () => {
    switch (a.hairStyle) {
      case 'long':
        return (
          <path
            d="M100,46 C74,46 64,64 66,86 C70,80 74,74 78,72 C80,78 79,86 77,92 C82,84 86,74 88,68 C92,74 96,77 100,77 C108,77 114,70 117,64 C120,70 122,80 121,90 C126,84 130,74 131,70 C134,76 135,84 134,88 C137,80 138,64 132,54 C124,46 112,46 100,46 Z"
            fill={`url(#${hairId})`}
            stroke={OUTLINE}
            strokeWidth="1.1"
          />
        );
      case 'short':
        return (
          <path
            d="M100,45 C76,45 65,62 66,84 C71,78 76,72 80,68 C82,73 82,79 81,84 C86,77 90,69 93,64 C97,70 103,72 108,70 C112,68 116,63 118,59 C122,65 124,74 123,82 C127,76 131,68 132,62 C130,52 118,45 100,45 Z"
            fill={`url(#${hairId})`}
            stroke={OUTLINE}
            strokeWidth="1.1"
          />
        );
      case 'parted':
        return (
          <path
            d="M100,45 C75,45 65,63 66,86 C70,78 75,70 82,66 C90,70 88,80 85,88 C92,80 96,70 97,63 C104,70 116,72 124,68 C130,72 132,80 132,86 C135,76 134,58 126,50 C118,44 108,45 100,45 Z"
            fill={`url(#${hairId})`}
            stroke={OUTLINE}
            strokeWidth="1.1"
          />
        );
      case 'bob':
        return (
          <path
            d="M100,45 C74,45 64,64 66,88 C70,84 73,80 76,78 C78,82 78,87 77,91 C82,86 85,79 87,73 C92,79 98,81 104,80 C110,79 115,74 118,69 C121,75 122,84 121,91 C125,86 128,79 129,74 C133,80 134,86 133,90 C137,80 136,60 128,52 C120,45 110,45 100,45 Z"
            fill={`url(#${hairId})`}
            stroke={OUTLINE}
            strokeWidth="1.1"
          />
        );
      case 'ponytail':
        return (
          <path
            d="M100,45 C76,45 66,62 66,84 C71,77 76,71 81,68 C83,74 82,81 80,87 C86,80 90,71 92,65 C97,71 104,73 110,71 C115,69 119,64 121,60 C125,67 126,77 124,86 C128,80 131,72 132,66 C133,58 124,45 100,45 Z"
            fill={`url(#${hairId})`}
            stroke={OUTLINE}
            strokeWidth="1.1"
          />
        );
      case 'wavy':
        return (
          <path
            d="M100,45 C75,45 64,64 66,88 C70,82 72,76 74,71 C78,75 78,82 76,88 C82,83 86,75 88,68 C93,75 100,78 106,76 C112,74 117,68 119,62 C123,68 124,78 122,87 C127,81 130,73 131,66 C134,74 134,82 132,88 C137,78 136,58 127,50 C119,44 109,45 100,45 Z"
            fill={`url(#${hairId})`}
            stroke={OUTLINE}
            strokeWidth="1.1"
          />
        );
    }
  };

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={`${profile.fullName}のポートレート`}
      data-testid="ai-portrait"
      data-portrait-fp={portraitFp}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id={irisId} cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="35%" stopColor={a.eyeColor} />
          <stop offset="100%" stopColor={OUTLINE} />
        </radialGradient>
        <radialGradient id={bgId} cx="50%" cy="34%" r="80%">
          <stop offset="0%" stopColor={a.accentColor} stopOpacity="0.5" />
          <stop offset="55%" stopColor="#1b2340" />
          <stop offset="100%" stopColor="#0e1226" />
        </radialGradient>
        <linearGradient id={hairId} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor={a.hairColor} />
          <stop offset="100%" stopColor={a.hairShadow} />
        </linearGradient>
        <clipPath id={`clip-${uid}`}>
          <rect x="0" y="0" width="200" height="200" rx="16" />
        </clipPath>
      </defs>

      <g clipPath={`url(#clip-${uid})`}>
        {/* 背景（キャラ色のオーラ＋装飾リング） */}
        <rect width="200" height="200" fill={`url(#${bgId})`} />
        <circle cx="100" cy="104" r="76" fill="none" stroke={a.accentColor} strokeOpacity="0.35" strokeWidth="1.4" />
        <circle cx="100" cy="104" r="86" fill="none" stroke={a.accentColor} strokeOpacity="0.16" strokeWidth="1" />
        <path d="M100,16 l3.2,7.4 L110.6,26 l-7.4,3.2 L100,36.6 l-3.2,-7.4 L89.4,26 l7.4,-2.6 Z" fill={a.accentColor} opacity="0.5" />

        {/* 背面の髪 */}
        {backHair()}

        {/* 首・肩（スーツ） */}
        <path d="M92,122 h16 v22 h-16 Z" fill={a.skinTone} stroke={OUTLINE} strokeWidth="1" />
        <path d="M92,122 h16 v8 c-5,4 -11,4 -16,0 Z" fill={skinShadow} stroke="none" />
        <path
          d="M34,200 C36,168 56,146 84,140 L100,152 L116,140 C144,146 164,168 166,200 Z"
          fill={a.suitColor}
          stroke={OUTLINE}
          strokeWidth="1.4"
        />
        {/* 襟（白シャツ）とラペル */}
        <path d="M86,140 L100,152 L96,166 L84,150 Z" fill="#f8fafc" stroke={OUTLINE} strokeWidth="0.9" />
        <path d="M114,140 L100,152 L104,166 L116,150 Z" fill="#f8fafc" stroke={OUTLINE} strokeWidth="0.9" />
        <path d="M84,140 L96,168 L86,178 L72,148 Z" fill="rgba(0,0,0,0.22)" />
        <path d="M116,140 L104,168 L114,178 L128,148 Z" fill="rgba(0,0,0,0.22)" />
        {fem ? (
          // リボン
          <g>
            <path d="M100,156 l-12,-5 -2,10 12,1 Z" fill={a.accentColor} stroke={OUTLINE} strokeWidth="0.9" />
            <path d="M100,156 l12,-5 2,10 -12,1 Z" fill={a.accentColor} stroke={OUTLINE} strokeWidth="0.9" />
            <circle cx="100" cy="157" r="3" fill={a.accentColor} stroke={OUTLINE} strokeWidth="0.9" />
          </g>
        ) : (
          // ネクタイ
          <g>
            <path d="M100,152 l-5,6 5,26 5,-26 Z" fill={a.accentColor} stroke={OUTLINE} strokeWidth="0.9" />
            <path d="M95,158 l10,0 -5,-6 Z" fill={a.accentColor} stroke={OUTLINE} strokeWidth="0.9" />
          </g>
        )}
        {/* 胸元の社章 */}
        <circle cx="128" cy="168" r="3.2" fill={a.accentColor} opacity="0.9" stroke={OUTLINE} strokeWidth="0.7" />

        {/* 耳 */}
        <ellipse cx="66" cy="97" rx="5" ry="7.5" fill={a.skinTone} stroke={OUTLINE} strokeWidth="1" />
        <ellipse cx="134" cy="97" rx="5" ry="7.5" fill={a.skinTone} stroke={OUTLINE} strokeWidth="1" />
        {fem ? <circle cx="134" cy="103" r="1.6" fill={a.accentColor} /> : null}

        {/* 顔 */}
        <path
          d="M100,52 C124,52 134,72 133,92 C132.5,108 122,124 100,130 C78,124 67.5,108 67,92 C66,72 76,52 100,52 Z"
          fill={a.skinTone}
          stroke={OUTLINE}
          strokeWidth="1.3"
        />
        {/* 頬の影と立体 */}
        <path d="M126,84 C130,94 128,106 120,116 C126,106 128,94 126,84 Z" fill={skinShadow} />
        {fem ? (
          <g opacity="0.5">
            <ellipse cx="80" cy="108" rx="5.5" ry="2.6" fill="#f5a3a3" />
            <ellipse cx="120" cy="108" rx="5.5" ry="2.6" fill="#f5a3a3" />
          </g>
        ) : null}

        {/* 目・眉・鼻・口 */}
        {brow(84, 1)}
        {brow(116, -1)}
        {eye(84)}
        {eye(116)}
        <path d="M99.4,103 q2 ,3.4 0.4,5.6" stroke="rgba(36,31,46,0.4)" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path
          d={fem ? 'M93.5,116.5 Q100,121 106.5,116.5' : 'M94,117 Q100,120 106,117'}
          stroke={OUTLINE}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M96,120.5 Q100,122.5 104,120.5" stroke="rgba(36,31,46,0.18)" strokeWidth="1" fill="none" />

        {/* 前髪 */}
        {frontHair()}
        {/* 髪の艶 */}
        <path d="M78,56 Q100,47 124,57 Q112,52 100,52 Q88,52 78,56 Z" fill="#ffffff" opacity="0.28" />

        {/* 眼鏡 */}
        {a.glasses ? (
          <g stroke="#8b93a5" strokeWidth="1.6" fill="none" opacity="0.95">
            <rect x="72.5" y="89" width="23" height="15" rx="6.5" />
            <rect x="104.5" y="89" width="23" height="15" rx="6.5" />
            <path d="M95.5,95.5 h9" />
            <path d="M72.5,95 L66,93" />
            <path d="M127.5,95 L134,93" />
          </g>
        ) : null}
      </g>
      <rect x="0.7" y="0.7" width="198.6" height="198.6" rx="15.5" fill="none" stroke={a.accentColor} strokeOpacity="0.45" strokeWidth="1.4" />
    </svg>
  );
}
