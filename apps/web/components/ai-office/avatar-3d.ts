// 3D アバター組み立て（Phase 4 Stream D・roadmap77）。
// AiCharacterProfile（@hokko/shared のキャラクター設定）から、JRPG 調のデフォルメ人型を
// Three.js プリミティブだけで組み立てる（外部モデル・外部 texture・CDN 不使用）。
// すべてのメッシュは1つの Group の「直接の子」にする（raycaster の hit.object.parent = group 前提）。
import * as THREE from 'three';
import type { AiCharacterProfile } from '@hokko/shared';

const OUTLINE_DARK = '#141821';

function darken(hex: string, f: number): string {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
}

function lambert(color: string) {
  return new THREE.MeshLambertMaterial({ color });
}

export interface BuiltCharacter {
  group: THREE.Group;
  clickable: THREE.Object3D[];
}

export function buildCharacter(profile: AiCharacterProfile, stateColor: string): BuiltCharacter {
  const a = profile.appearance;
  const fem = a.genderStyle === 'fem';
  const group = new THREE.Group();
  const clickable: THREE.Object3D[] = [];
  const add = (mesh: THREE.Mesh) => {
    group.add(mesh);
    return mesh;
  };

  const suitDark = darken(a.suitColor, 0.6);

  // ---- 足元: 状態リング（色＋位置で状態を示す。ラベルにも文字で併記＝色だけに依存しない） ----
  const ring = add(
    new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.64, 40),
      new THREE.MeshBasicMaterial({ color: stateColor, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
    ),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  const glow = add(
    new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 40),
      new THREE.MeshBasicMaterial({ color: stateColor, transparent: true, opacity: 0.14, side: THREE.DoubleSide }),
    ),
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.015;

  // ---- 靴・脚 ----
  for (const sx of [-1, 1]) {
    const shoe = add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.34), lambert(OUTLINE_DARK)));
    shoe.position.set(0.13 * sx, 0.05, 0.03);
    const leg = add(
      new THREE.Mesh(
        new THREE.CylinderGeometry(fem ? 0.06 : 0.085, fem ? 0.07 : 0.095, fem ? 0.52 : 0.6, 10),
        lambert(fem ? '#2a2f3c' : suitDark),
      ),
    );
    leg.position.set(0.13 * sx, fem ? 0.36 : 0.4, 0);
  }
  if (fem) {
    // A ラインのスカート
    const skirt = add(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.45, 0.34, 14), lambert(a.suitColor)));
    skirt.position.y = 0.72;
  }

  // ---- 胴（ジャケット）・シャツ・アクセント ----
  const torso = add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(fem ? 0.26 : 0.3, fem ? 0.3 : 0.36, 0.62, 14),
      lambert(a.suitColor),
    ),
  );
  torso.position.y = 1.14;
  clickable.push(torso);
  const shirt = add(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.24, 0.05), lambert('#f8fafc')));
  shirt.position.set(0, 1.3, fem ? 0.24 : 0.29);
  if (fem) {
    // リボン
    const ribbon = add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.04), lambert(a.accentColor)));
    ribbon.position.set(0, 1.32, 0.27);
    const knot = add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), lambert(darken(a.accentColor, 0.75))));
    knot.position.set(0, 1.32, 0.29);
  } else {
    // ネクタイ
    const tie = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.26, 0.03), lambert(a.accentColor)));
    tie.position.set(0, 1.22, 0.31);
  }
  // 肩章ふうのライン（キャラ色）
  for (const sx of [-1, 1]) {
    const pad = add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.2), lambert(darken(a.suitColor, 0.8))));
    pad.position.set((fem ? 0.28 : 0.33) * sx, 1.44, 0);
  }

  // ---- 腕・手 ----
  for (const sx of [-1, 1]) {
    const arm = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.4, 4, 10), lambert(a.suitColor)));
    arm.position.set((fem ? 0.32 : 0.38) * sx, 1.14, 0);
    arm.rotation.z = 0.16 * sx;
    const hand = add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), lambert(a.skinTone)));
    hand.position.set((fem ? 0.37 : 0.44) * sx, 0.88, 0);
  }

  // ---- 首・頭 ----
  const neck = add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.12, 10), lambert(a.skinTone)));
  neck.position.y = 1.5;
  const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), lambert(a.skinTone)));
  head.position.y = 1.82;
  head.scale.set(0.96, 1.04, 0.92);
  clickable.push(head);

  // ---- 顔（メッシュで描く: テクスチャ歪みなし・遠目でも視認できる大きめの瞳） ----
  // 頭部球の前面（scale.z=0.92 → 表面 z≈0.276）より確実に前へ出す（埋まると暗く見える）。
  for (const sx of [-1, 1]) {
    const white = add(new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' })));
    white.position.set(0.105 * sx, 1.83, 0.262);
    white.scale.set(1, 1.15, 0.42);
    const iris = add(new THREE.Mesh(new THREE.SphereGeometry(0.037, 12, 10), new THREE.MeshBasicMaterial({ color: a.eyeColor })));
    iris.position.set(0.105 * sx, 1.825, 0.286);
    iris.scale.set(1, 1.2, 0.4);
    const pupil = add(new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 8), new THREE.MeshBasicMaterial({ color: OUTLINE_DARK })));
    pupil.position.set(0.105 * sx, 1.825, 0.302);
    const light = add(new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })));
    light.position.set(0.105 * sx - 0.014, 1.845, 0.312);
    // 眉
    const brow = add(new THREE.Mesh(new THREE.BoxGeometry(0.095, fem ? 0.012 : 0.02, 0.02), new THREE.MeshBasicMaterial({ color: a.hairShadow })));
    brow.position.set(0.105 * sx, 1.92, 0.278);
    brow.rotation.z = -0.12 * sx;
  }
  const mouth = add(new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.017, 0.02), new THREE.MeshBasicMaterial({ color: '#b3552f' })));
  mouth.position.set(0, 1.68, 0.26);

  // ---- 眼鏡 ----
  if (a.glasses) {
    const glassMat = new THREE.MeshBasicMaterial({ color: '#cbd5e1' });
    for (const sx of [-1, 1]) {
      const rim = add(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 8, 20), glassMat));
      rim.position.set(0.105 * sx, 1.825, 0.305);
    }
    const bridge = add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.01, 0.01), glassMat));
    bridge.position.set(0, 1.835, 0.31);
  }

  // ---- 髪（スタイル別・すべてプリミティブ合成） ----
  const hairMat = lambert(a.hairColor);
  const hairDarkMat = lambert(a.hairShadow);
  // キャップは後ろへオフセットして顔前面を覆わない。前髪は眉上の細いバンドのみ（目を隠さない）。
  const capTheta: Record<string, number> = { short: 0.5, parted: 0.52, long: 0.56, ponytail: 0.52, bob: 0.68, wavy: 0.55 };
  const cap = add(
    new THREE.Mesh(new THREE.SphereGeometry(0.325, 24, 16, 0, Math.PI * 2, 0, Math.PI * (capTheta[a.hairStyle] ?? 0.52)), hairMat),
  );
  cap.position.set(0, 1.86, -0.05);
  cap.scale.set(0.99, 1.04, 0.96);
  // 前髪（額に沿う薄いバンド・眉より上で止める）
  const fringe = add(
    new THREE.Mesh(new THREE.SphereGeometry(0.322, 20, 10, Math.PI * 0.72, Math.PI * 0.56, Math.PI * 0.06, Math.PI * 0.24), hairMat),
  );
  fringe.position.set(0, 1.845, 0.015);

  if (a.hairStyle === 'long') {
    const back = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.78, 14), hairDarkMat));
    back.position.set(0, 1.42, -0.16);
    for (const sx of [-1, 1]) {
      const strand = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.42, 4, 8), hairMat));
      strand.position.set(0.26 * sx, 1.52, 0.1);
    }
  } else if (a.hairStyle === 'ponytail') {
    const tail = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.5, 4, 10), hairMat));
    tail.position.set(0, 1.6, -0.3);
    tail.rotation.x = 0.5;
    const tie = add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), lambert(a.accentColor)));
    tie.position.set(0, 1.92, -0.24);
  } else if (a.hairStyle === 'bob') {
    for (const sx of [-1, 1]) {
      const side = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.2, 4, 8), hairMat));
      side.position.set(0.25 * sx, 1.68, 0.02);
    }
  } else if (a.hairStyle === 'wavy') {
    for (const sx of [-1, 1]) {
      const puff = add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), hairMat));
      puff.position.set(0.24 * sx, 1.7, -0.05);
    }
  } else if (a.hairStyle === 'parted') {
    const sweep = add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.12), hairMat));
    sweep.position.set(-0.06, 1.99, 0.22);
    sweep.rotation.z = -0.18;
  }

  return { group, clickable };
}

/** 執務デスク（ゾーン装飾・emissive モニタ付き）。戻り値をシーンに追加する。 */
export function buildDesk(accent: string): THREE.Group {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.9), lambert('#4b3a2b'));
  top.position.y = 0.78;
  g.add(top);
  for (const [sx, sz] of [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), lambert('#33281e'));
    leg.position.set(1.2 * sx, 0.39, 0.38 * sz);
    g.add(leg);
  }
  // モニタ（うっすら発光＝オフィスの生活感。データ表示ではない）
  for (const sx of [-0.7, 0.7]) {
    const screen = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.36, 0.03),
      new THREE.MeshLambertMaterial({ color: '#0b1220', emissive: new THREE.Color(accent), emissiveIntensity: 0.35 }),
    );
    screen.position.set(sx, 1.08, -0.18);
    screen.rotation.x = -0.08;
    g.add(screen);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.06), lambert('#1f2430'));
    stand.position.set(sx, 0.9, -0.18);
    g.add(stand);
  }
  return g;
}
