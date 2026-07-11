'use client';

// 3D バーチャルオフィス v0（Phase 4 Stream B・roadmap71）。
// - Three.js（バンドル同梱・外部 texture/CDN 不使用）で業務ゾーンと AI 社員を描画する。
// - 状態は色＋アイコン＋ラベルで冗長表現（色だけに依存しない）。
// - 承認待ちの AI 社員は「人間の承認デスク」へ視覚的な接続線を描く。
// - クリックで詳細パネル、部署/状態フィルタ、2D 一覧フォールバック、キーボード操作を提供する。
// - 危険操作（実行・承認・削除・外部送信）の導線は一切置かない（リンクも read-only 画面のみ）。
// - 状態更新でレイアウト全体を動かさない（canvas は固定高・パネルは固定幅の別領域）。
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Moon,
  ClipboardList,
  Cog,
  Hand,
  Ban,
  AlertTriangle,
  PauseCircle,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import {
  AI_WORKFORCE_STATES,
  AI_WORKFORCE_STATE_LABEL,
  AI_WORKFORCE_STATE_COLOR,
  getAiCharacter,
  type AiWorkforceState,
} from '@hokko/shared';
import type { AiWorkforceReadModel } from '@/lib/domains/ai-workforce/read-model';
import { AiPortrait } from './portrait';
import { buildCharacter, buildDesk } from './avatar-3d';

// v5.8 §6: DOM の状態アイコンは Unicode emoji ではなく Lucide（OS/headless で外観が揺れない・
// JRPG 調 UI とも整合）。Canvas 側は makeTextSprite が決定論的な図形（色付き丸）を描く。
const STATE_LUCIDE: Record<AiWorkforceState, LucideIcon> = {
  idle: Moon,
  planning: ClipboardList,
  working: Cog,
  waiting_approval: Hand,
  blocked: Ban,
  error: AlertTriangle,
  offline: PauseCircle,
  unknown: HelpCircle,
};

function StateIcon({ state, className }: { state: AiWorkforceState; className?: string }) {
  const Icon = STATE_LUCIDE[state];
  return <Icon className={className ?? 'h-3.5 w-3.5'} aria-hidden />;
}

// 業務ゾーン（部署 → 平面上の区画）。未定義の部署は「その他」ゾーンへ。
const ZONES: { key: string; label: string; x: number; z: number; color: string }[] = [
  { key: '営業部', label: '営業', x: -6, z: -3, color: '#1e3a8a' },
  { key: '経営管理部', label: '経営管理・財務', x: 6, z: -3, color: '#3f2d8a' },
  { key: '現場・在庫部', label: '運用・在庫', x: -6, z: 4, color: '#14532d' },
  { key: 'Growth', label: 'Growth', x: 0, z: -6, color: '#7c2d12' },
  { key: 'その他', label: 'その他', x: 0, z: 6, color: '#334155' },
];
const APPROVAL_DESK = { x: 6, z: 5 }; // 人間の承認デスク

function zoneFor(department: string) {
  return ZONES.find((z) => z.key === department) ?? ZONES[ZONES.length - 1]!;
}

export function AiOffice({ model, initialAgentId = null }: { model: AiWorkforceReadModel; initialAgentId?: string | null }) {
  // /ai-agents からの deep link（?agent=<id>）で初期選択。無効値はページ側で null 化済み。
  const [selectedId, setSelectedId] = useState<string | null>(initialAgentId);
  // v6.4 P2（AiOffice URL 同期）: client-nav（?agent=A→B）とブラウザ back/forward で選択を追従させる。
  const searchParams = useSearchParams();
  const agentParam = searchParams.get('agent');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [isNarrow, setIsNarrow] = useState(false);
  // viewport 計測が完了してから 3D を構築する（モバイル初回レンダで一瞬 3D を作らない）。
  const [measured, setMeasured] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<Map<string, THREE.Object3D>>(new Map());

  const departments = useMemo(
    () => Array.from(new Set(model.agents.map((a) => a.department))).sort(),
    [model.agents],
  );
  const visibleAgents = useMemo(
    () =>
      model.agents.filter(
        (a) => (deptFilter === 'all' || a.department === deptFilter) && (stateFilter === 'all' || a.state === stateFilter),
      ),
    [model.agents, deptFilter, stateFilter],
  );
  const selected = model.agents.find((a) => a.id === selectedId) ?? null;

  // モバイル簡略表示（操作可能な 2D 一覧のみ）。
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsNarrow(mq.matches);
    update();
    setMeasured(true);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // v6.4 P2: URL の ?agent= が「現テナントの実在 AI 社員」を指すときだけ選択へ反映する。
  // - client-nav（?agent=A → ?agent=B）: agentParam の変化で B に同期。
  // - ブラウザ back/forward: popstate で agentParam が戻る/進む → 選択も追従。
  // - 無効・別テナント ID（model.agents に無い）: 無視（存在を漏らさず・手動選択を上書きしない）。
  // - クエリ無し（agentParam == null）: 何もしない（手動選択を尊重）。下の「先頭自動選択」に委ねる。
  useEffect(() => {
    if (agentParam && model.agents.some((a) => a.id === agentParam)) {
      setSelectedId(agentParam);
    }
  }, [agentParam, model.agents]);

  // v5.8 §6: 初期表示で最初の可視 AI 社員を自動選択し、プロフィールを最初から見せる
  // （空の詳細パネルを第一印象にしない）。既にユーザーが選択済みなら上書きしない。
  useEffect(() => {
    if (selectedId == null && model.agents.length > 0) {
      setSelectedId(model.agents[0]!.id);
    }
    // 初回のみ（model はサーバ描画ごとに固定・ユーザー操作を尊重）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Three.js シーン構築（計測前・狭幅では構築しない）。
  useEffect(() => {
    // webglFailed を deps に含める: context lost で fallback へ切替えた際に cleanup（RAF停止・dispose）を
    // 確実に走らせるため（含めないと描画ループが lost context へ回り続ける）。
    if (!measured || isNarrow || webglFailed) return;
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      // preserveDrawingBuffer: e2e の canvas pixel check とスクリーンショットのため。
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch {
      setWebglFailed(true);
      return;
    }
    const width = mount.clientWidth;
    const height = 480;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('data-testid', 'ai-office-canvas');
    renderer.domElement.setAttribute('tabindex', '0');
    renderer.domElement.setAttribute('aria-label', '3Dバーチャルオフィス。矢印キーで視点移動、Tabで一覧操作。');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    camera.position.set(0, 14, 14);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 6;
    controls.maxDistance = 40;
    controls.listenToKeyEvents(renderer.domElement); // 矢印キーでパン（キーボード操作）

    // 照明: 環境光＋半球光（空色の回り込み）＋キーライト＋承認デスクの暖色。奥行きは fog で演出
    // （fog 色は背景と同じ #0f172a のため、e2e の「背景からの乖離ピクセル」検査条件は不変）。
    scene.fog = new THREE.Fog('#0f172a', 26, 62);
    scene.add(new THREE.AmbientLight(0xffffff, 0.62));
    scene.add(new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.15);
    dir.position.set(8, 16, 8);
    scene.add(dir);
    const deskLight = new THREE.PointLight(0xfbbf24, 0.7, 9);
    deskLight.position.set(APPROVAL_DESK.x, 2.4, APPROVAL_DESK.z);
    scene.add(deskLight);

    // 床とゾーン（外部 texture なし・単色マテリアルのみ）。
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 20), new THREE.MeshLambertMaterial({ color: '#1e293b' }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    scene.add(new THREE.GridHelper(26, 26, 0x334155, 0x263248));

    const makeTextSprite = (
      text: string,
      opts: { size?: number; color?: string; sub?: string; subColor?: string; plate?: boolean } = {},
    ) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 512;
      canvas.height = 160;
      if (opts.plate) {
        // ネームプレート: 角丸の半透明プレート＋キャラ色の下線（読みやすさ優先）。
        const w = 460;
        const x = (512 - w) / 2;
        ctx.fillStyle = 'rgba(8,12,24,0.72)';
        ctx.beginPath();
        ctx.roundRect(x, 18, w, 124, 26);
        ctx.fill();
        ctx.strokeStyle = 'rgba(226,232,240,0.35)';
        ctx.lineWidth = 3;
        ctx.stroke();
        if (opts.subColor) {
          ctx.fillStyle = opts.subColor;
          ctx.beginPath();
          ctx.roundRect(x + 24, 126, w - 48, 6, 3);
          ctx.fill();
        }
      }
      ctx.textAlign = 'center';
      ctx.font = 'bold 52px sans-serif';
      ctx.fillStyle = opts.color ?? '#e2e8f0';
      ctx.fillText(text, 256, opts.sub ? 74 : 96);
      if (opts.sub) {
        ctx.font = '30px sans-serif';
        ctx.fillStyle = opts.subColor ?? '#94a3b8';
        ctx.fillText(opts.sub, 256, 116);
        // 状態マーカー: 決定論的な色付き丸（emoji はレンダラ依存のため使わない）
        const tw = ctx.measureText(opts.sub).width;
        ctx.beginPath();
        ctx.arc(256 - tw / 2 - 18, 106, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      const s = opts.size ?? 4;
      sprite.scale.set(s, s * (160 / 512), 1);
      return sprite;
    };

    for (const z of ZONES) {
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshLambertMaterial({ color: z.color, transparent: true, opacity: 0.5 }));
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(z.x, 0.01, z.z);
      scene.add(pad);
      // ゾーンの縁取り（区画の輪郭を立たせる）
      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(8, 5)),
        new THREE.LineBasicMaterial({ color: '#64748b', transparent: true, opacity: 0.5 }),
      );
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(z.x, 0.02, z.z);
      scene.add(edge);
      const label = makeTextSprite(z.label, { size: 4.6 });
      label.position.set(z.x, 2.9, z.z - 2.2);
      scene.add(label);
      // 執務デスク（ゾーン奥・emissive モニタ。データ表示ではなく生活感の演出）
      const zoneDesk = buildDesk('#7dd3fc');
      zoneDesk.position.set(z.x, 0, z.z + 1.7);
      scene.add(zoneDesk);
    }
    // 人間の承認デスク（木製・暖色ライト・書類トレイ）。
    const approvalDesk = buildDesk('#fbbf24');
    approvalDesk.position.set(APPROVAL_DESK.x, 0, APPROVAL_DESK.z);
    scene.add(approvalDesk);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.36), new THREE.MeshLambertMaterial({ color: '#e7e0d0' }));
    tray.position.set(APPROVAL_DESK.x, 0.88, APPROVAL_DESK.z + 0.2);
    scene.add(tray);
    const deskLabel = makeTextSprite('人間の承認デスク', { size: 4.6, color: '#fbbf24', plate: true, subColor: '#f59e0b' });
    deskLabel.position.set(APPROVAL_DESK.x, 2.5, APPROVAL_DESK.z);
    scene.add(deskLabel);

    // AI 社員（部署ゾーン内に整列配置・状態色＋名前ラベル＋承認待ちは接続線）。
    const meshes = meshesRef.current;
    meshes.clear();
    const perZoneCount = new Map<string, number>();
    const clickable: THREE.Object3D[] = [];
    for (const a of model.agents) {
      const zone = zoneFor(a.department);
      const i = perZoneCount.get(zone.key) ?? 0;
      perZoneCount.set(zone.key, i + 1);
      const px = zone.x - 2.4 + (i % 3) * 2.4;
      const pz = zone.z - 0.6 + Math.floor(i / 3) * 1.8;

      // キャラクター設定（見た目・人物名）から JRPG 調アバターを組み立てる。
      // 状態は足元リングの色＋ネームプレートの文字で冗長表現（色だけに依存しない）。
      const profile = getAiCharacter(a.key);
      const color = AI_WORKFORCE_STATE_COLOR[a.state];
      const built = buildCharacter(profile, color);
      const group = built.group;
      const displayName = profile.fullName === '（設定未作成）' ? a.name : profile.fullName;
      const nameLabel = makeTextSprite(displayName, {
        size: 3.6,
        plate: true,
        sub: AI_WORKFORCE_STATE_LABEL[a.state],
        subColor: color,
      });
      nameLabel.position.y = 2.75;
      group.add(nameLabel);
      group.position.set(px, 0, pz);
      group.userData = { agentId: a.id, state: a.state };
      scene.add(group);
      meshes.set(a.id, group);
      // v5.9 M11 修正: ネームプレート（大きな当たり判定）もクリック選択の対象にする。
      // nameLabel は group の直接の子なので hit.object.parent = group の前提を保つ。
      clickable.push(...built.clickable, nameLabel);

      if (a.state === 'waiting_approval') {
        const points = [new THREE.Vector3(px, 1.4, pz), new THREE.Vector3(APPROVAL_DESK.x, 1.2, APPROVAL_DESK.z)];
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineDashedMaterial({ color: 0xf59e0b, dashSize: 0.4, gapSize: 0.25 }),
        );
        line.computeLineDistances();
        group.userData.line = line;
        scene.add(line);
      }
    }

    // クリック選択（raycaster）。
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onClick = (ev: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickable, false);
      const hit = hits[0]?.object.parent as THREE.Group | undefined;
      if (hit?.userData?.agentId) setSelectedId(hit.userData.agentId as string);
    };
    renderer.domElement.addEventListener('click', onClick);

    // v5.9 M11 回帰テスト用の読み取り専用フック（e2e からの照準と検証にのみ使用・状態変更なし）。
    // __nameplateProbe(i): i 番目の AI 社員のネームプレート位置（NDC）と agentId を返す。
    // __pickAt(x, y): その NDC で raycaster が選ぶ agentId を返す（実クリックはテスト側が別途発火する）。
    type TestHooks = HTMLCanvasElement & {
      __nameplateProbe?: (index: number) => { ndcX: number; ndcY: number; agentId: string } | null;
      __pickAt?: (ndcX: number, ndcY: number) => string | null;
    };
    (renderer.domElement as TestHooks).__nameplateProbe = (index: number) => {
      const entry = Array.from(meshes.entries())[index];
      if (!entry) return null;
      const [agentId, g] = entry;
      const v = new THREE.Vector3(g.position.x, g.position.y + 2.75, g.position.z).project(camera);
      return { ndcX: v.x, ndcY: v.y, agentId };
    };
    (renderer.domElement as TestHooks).__pickAt = (ndcX: number, ndcY: number) => {
      pointer.x = ndcX;
      pointer.y = ndcY;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickable, false);
      const hit = hits[0]?.object.parent as THREE.Group | undefined;
      return (hit?.userData?.agentId as string | undefined) ?? null;
    };

    // WebGL context lost（GPU リセット・タブ復帰等）: 描画ループを止めて 2D フォールバックへ切替（roadmap74 §9）。
    // preventDefault は restore を許可するための WebGL 仕様上の作法だが、restore を待たずフォールバックで固定する
    // （復帰タイミング依存の白画面より、常に読める 2D 一覧を優先）。
    const onContextLost = (ev: Event) => {
      ev.preventDefault();
      setWebglFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    // アニメーション: working は小さく上下動（レイアウトは不変・メッシュのみ動く）。
    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      for (const [, g] of meshes) {
        const st = g.userData.state as string;
        if (st === 'working') g.position.y = Math.sin(t * 3) * 0.08;
        else if (st === 'waiting_approval') g.rotation.y = Math.sin(t * 1.4) * 0.08; // 承認デスクの方をうかがう仕草
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      renderer.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        const disposeMat = (x: THREE.Material) => {
          // Material.dispose は map テクスチャを解放しないため、CanvasTexture を明示 dispose する。
          const map = (x as THREE.Material & { map?: THREE.Texture | null }).map;
          map?.dispose();
          x.dispose();
        };
        if (Array.isArray(mat)) mat.forEach(disposeMat);
        else if (mat) disposeMat(mat);
      });
    };
    // model はサーバ描画ごとに固定。フィルタは可視切替 effect で別処理。
  }, [model, isNarrow, measured, webglFailed]);

  // フィルタは再構築せずメッシュの可視のみ切替（レイアウト・カメラを動かさない）。
  useEffect(() => {
    if (isNarrow) return;
    const visible = new Set(visibleAgents.map((a) => a.id));
    for (const [id, g] of meshesRef.current) {
      g.visible = visible.has(id);
      const line = g.userData.line as THREE.Object3D | undefined;
      if (line) line.visible = visible.has(id);
    }
  }, [visibleAgents, isNarrow]);

  const stateChips = (
    <div className="flex flex-wrap gap-1.5" data-testid="ai-office-state-filter">
      <FilterChip active={stateFilter === 'all'} onClick={() => setStateFilter('all')} label="全状態" />
      {AI_WORKFORCE_STATES.map((s) => (
        <FilterChip
          key={s}
          active={stateFilter === s}
          onClick={() => setStateFilter(s)}
          icon={<StateIcon state={s} className="h-3 w-3" />}
          label={`${AI_WORKFORCE_STATE_LABEL[s]}（${model.totals.byState[s] ?? 0}）`}
        />
      ))}
    </div>
  );
  const deptChips = (
    <div className="flex flex-wrap gap-1.5" data-testid="ai-office-dept-filter">
      <FilterChip active={deptFilter === 'all'} onClick={() => setDeptFilter('all')} label="全部署" />
      {departments.map((d) => (
        <FilterChip key={d} active={deptFilter === d} onClick={() => setDeptFilter(d)} label={d} />
      ))}
    </div>
  );

  return (
    <div>
      <div className="mb-3 space-y-2">
        {stateChips}
        {deptChips}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {isNarrow ? (
            <div className="rounded-md border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground" data-testid="ai-office-mobile-note">
              モバイル簡略表示です。下の一覧から AI 社員を選択できます（3D 表示はデスクトップで利用できます）。
            </div>
          ) : webglFailed ? (
            <div className="rounded-md border bg-amber-50 px-3 py-2 text-sm text-amber-800">
              3D 表示を利用できません（WebGL の初期化失敗またはコンテキスト喪失）。下の 2D 一覧をご利用ください。
            </div>
          ) : (
            <div ref={mountRef} className="h-[480px] w-full overflow-hidden rounded-md border bg-slate-900" data-testid="ai-office-3d" />
          )}

          {/* 2D 一覧フォールバック（常時表示・キーボード操作可能）。 */}
          <div className="mt-4 overflow-x-auto rounded-md border" data-testid="ai-office-2d-list">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/50 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">AI社員</th>
                  <th className="px-3 py-2">部署</th>
                  <th className="px-3 py-2">状態</th>
                  <th className="px-3 py-2">最終活動</th>
                  <th className="px-3 py-2">承認待ち</th>
                </tr>
              </thead>
              <tbody>
                {visibleAgents.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">条件に一致する AI 社員がいません</td></tr>
                ) : (
                  visibleAgents.map((a) => (
                    <tr key={a.id} className={`border-b last:border-0 hover:bg-secondary/40 ${selectedId === a.id ? 'bg-secondary/60' : ''}`}>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="flex items-center gap-2.5 text-left focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setSelectedId(a.id)}
                        >
                          <span className="shrink-0 overflow-hidden rounded-md">
                            <AiPortrait profile={getAiCharacter(a.key)} size={36} />
                          </span>
                          <span>
                            <span className="block font-medium text-primary hover:underline">
                              {getAiCharacter(a.key).fullName === '（設定未作成）' ? a.name : getAiCharacter(a.key).fullName}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">{a.name} ／ {a.role}</span>
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2 text-xs">{a.department}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: `${AI_WORKFORCE_STATE_COLOR[a.state]}22`, color: AI_WORKFORCE_STATE_COLOR[a.state] }}>
                          <StateIcon state={a.state} className="h-3 w-3" />
                          {AI_WORKFORCE_STATE_LABEL[a.state]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{a.lastActivityLabel}</td>
                      <td className="px-3 py-2 text-xs">{a.pendingApprovals > 0 ? `${a.pendingApprovals} 件` : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 詳細パネル（固定領域・選択で本文のみ入れ替え＝レイアウト不変）。 */}
        <div
          className="min-h-[320px] scroll-mt-20 rounded-md border p-4"
          data-testid="ai-office-detail"
          data-agent-id={selected?.id ?? ''}
          data-agent-key={selected?.key ?? ''}
          data-agent-state={selected?.state ?? ''}
          data-agent-name={selected ? (getAiCharacter(selected.key).fullName !== '（設定未作成）' ? getAiCharacter(selected.key).fullName : selected.name) : ''}
        >
          {selected ? (
            <div className="space-y-3 text-sm">
              {(() => {
                const prof = getAiCharacter(selected.key);
                const hasProfile = prof.fullName !== '（設定未作成）';
                return (
                  <div data-testid="ai-office-profile">
                    {/* 人物ヘッダー（ポートレート＋名前・二つ名） */}
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 overflow-hidden rounded-lg shadow-md">
                        <AiPortrait profile={prof} size={84} />
                      </span>
                      <div className="min-w-0">
                        {prof.epithet ? (
                          <div className="text-xs font-medium" style={{ color: prof.appearance.accentColor }} data-testid="ai-office-profile-epithet">
                            ― {prof.epithet} ―
                          </div>
                        ) : null}
                        <div className="text-base font-bold leading-tight" data-testid="ai-office-profile-name">
                          {hasProfile ? prof.fullName : selected.name}
                          <span className="ml-1.5 inline-flex align-middle" style={{ color: AI_WORKFORCE_STATE_COLOR[selected.state] }}>
                            <StateIcon state={selected.state} className="h-4 w-4" />
                          </span>
                        </div>
                        {prof.kana ? <div className="text-xs text-muted-foreground">{prof.kana}（{prof.codeName}）</div> : null}
                        <div className="mt-0.5 text-xs text-muted-foreground">{selected.name} ／ {selected.role}</div>
                        <div className="text-xs text-muted-foreground">{selected.department}</div>
                        {/* v6.1: AI社員ページへの deep link（人物・プロフィール・状態は同一正本）。 */}
                        <Link
                          href={`/ai-agents/${selected.id}`}
                          className="mt-1 inline-block text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-300"
                          data-testid="to-ai-agent"
                        >
                          AI社員ページで詳細を見る →
                        </Link>
                      </div>
                    </div>

                    {/* 稼働状態（実測・証拠由来） */}
                    <div className="mt-3 rounded-md bg-secondary/40 p-2.5">
                      <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">稼働状態（実測・証拠由来）</div>
                      <div className="space-y-1.5">
                        <Row k="状態" v={AI_WORKFORCE_STATE_LABEL[selected.state]} />
                        <Row k="根拠" v={selected.stateReason} />
                        {selected.blockedReason ? <Row k="ブロック理由" v={selected.blockedReason} /> : null}
                        <Row k="現在のタスク" v={selected.currentTask ?? '—'} />
                        <Row k="最終活動" v={selected.lastActivityLabel} />
                        <Row k="承認待ち" v={selected.pendingApprovals > 0 ? `${selected.pendingApprovals} 件` : 'なし'} />
                        <Row k="実行回数" v={String(selected.runCount)} />
                        <Row k="権限レベル" v={selected.permissionLevel} />
                        <Row k="次の推奨" v={selected.nextRecommendedAction} />
                      </div>
                    </div>

                    {/* プロフィール（キャラクター設定） */}
                    <div className="mt-3">
                      <div className="mb-1.5 text-[11px] font-semibold text-muted-foreground">プロフィール（キャラクター設定）</div>
                      <div className="space-y-2.5">
                        <div>
                          <div className="text-xs font-medium">性格</div>
                          <p className="text-xs text-muted-foreground" data-testid="ai-office-profile-personality">{prof.personality}</p>
                        </div>
                        {prof.skills.length > 0 ? (
                          <div>
                            <div className="mb-1 text-xs font-medium">スキル</div>
                            <div className="space-y-1" data-testid="ai-office-profile-skills">
                              {prof.skills.map((s) => (
                                <div key={s.name} className="grid grid-cols-[7.5rem_1fr_1.6rem] items-center gap-2" data-skill={`${s.name}:${s.level}`}>
                                  <div className="truncate text-xs text-muted-foreground">{s.name}</div>
                                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${(s.level / 5) * 100}%`, backgroundColor: prof.appearance.accentColor }}
                                    />
                                  </div>
                                  <div className="text-right text-xs font-medium tabular-nums">{s.level}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {prof.traits.length > 0 ? (
                          <div>
                            <div className="text-xs font-medium">クセ・特徴・個性</div>
                            <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground" data-testid="ai-office-profile-traits">
                              {prof.traits.map((t) => <li key={t}>{t}</li>)}
                            </ul>
                          </div>
                        ) : null}
                        {prof.commonMistakes.length > 0 ? (
                          <div>
                            <div className="text-xs font-medium">よくあるミス（人間がレビューで見る所）</div>
                            <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-xs text-muted-foreground" data-testid="ai-office-profile-mistakes">
                              {prof.commonMistakes.map((t) => <li key={t}>{t}</li>)}
                            </ul>
                          </div>
                        ) : null}
                        <div>
                          <div className="text-xs font-medium">評価（人事コメント・設定）</div>
                          <p className="text-xs text-muted-foreground" data-testid="ai-office-profile-eval">{prof.evaluationNote}</p>
                        </div>
                        <p className="text-[11px] text-muted-foreground/80">
                          プロフィールはキャラクター設定です。稼働状態・実行回数などの実測データとは区別して表示しています。
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 text-xs">
                      <Link className="text-primary hover:underline" href={`/ai-agents/${selected.id}`}>活動ログを見る</Link>
                      {selected.pendingApprovals > 0 ? <Link className="text-primary hover:underline" href="/approvals">承認待ち一覧へ</Link> : null}
                    </div>
                    <p className="pt-1 text-[11px] text-muted-foreground">この画面から実行・承認・削除はできません（read-only）。</p>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              AI 社員（3D の人形または一覧）を選択すると詳細を表示します。
              <div className="mt-3 space-y-1 text-xs">
                {AI_WORKFORCE_STATES.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <StateIcon state={s} className="h-3.5 w-3.5" />
                    <span style={{ color: AI_WORKFORCE_STATE_COLOR[s] }}>■</span>
                    <span>{AI_WORKFORCE_STATE_LABEL[s]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition focus-visible:ring-2 focus-visible:ring-ring ${active ? 'border-primary bg-primary/10 font-medium text-primary' : 'hover:bg-secondary'}`}
    >
      {icon}
      {label}
    </button>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="text-xs">{v}</div>
    </div>
  );
}
