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
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  AI_WORKFORCE_STATES,
  AI_WORKFORCE_STATE_LABEL,
  AI_WORKFORCE_STATE_COLOR,
  type AiWorkforceState,
} from '@hokko/shared';
import type { AiWorkforceReadModel, AiWorkforceAgentView } from '@/lib/domains/ai-workforce/read-model';

const STATE_ICON: Record<AiWorkforceState, string> = {
  idle: '💤',
  planning: '📋',
  working: '⚙️',
  waiting_approval: '✋',
  blocked: '🚧',
  error: '⚠️',
  offline: '⏸',
  unknown: '❓',
};

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

export function AiOffice({ model }: { model: AiWorkforceReadModel }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
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

  // Three.js シーン構築（計測前・狭幅では構築しない）。
  useEffect(() => {
    if (!measured || isNarrow) return;
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

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(8, 16, 8);
    scene.add(dir);

    // 床とゾーン（外部 texture なし・単色マテリアルのみ）。
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 20), new THREE.MeshLambertMaterial({ color: '#1e293b' }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    scene.add(new THREE.GridHelper(26, 26, 0x334155, 0x263248));

    const makeTextSprite = (text: string, opts: { size?: number; color?: string } = {}) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 512;
      canvas.height = 128;
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = opts.color ?? '#e2e8f0';
      ctx.fillText(text, 256, 78);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      const s = opts.size ?? 4;
      sprite.scale.set(s, s / 4, 1);
      return sprite;
    };

    for (const z of ZONES) {
      const pad = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), new THREE.MeshLambertMaterial({ color: z.color, transparent: true, opacity: 0.55 }));
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(z.x, 0.01, z.z);
      scene.add(pad);
      const label = makeTextSprite(z.label, { size: 5 });
      label.position.set(z.x, 2.6, z.z - 2.2);
      scene.add(label);
    }
    // 人間の承認デスク。
    const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.4), new THREE.MeshLambertMaterial({ color: '#b45309' }));
    desk.position.set(APPROVAL_DESK.x, 0.45, APPROVAL_DESK.z);
    scene.add(desk);
    const deskLabel = makeTextSprite('人間の承認デスク', { size: 5, color: '#fbbf24' });
    deskLabel.position.set(APPROVAL_DESK.x, 2.2, APPROVAL_DESK.z);
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

      const group = new THREE.Group();
      const color = AI_WORKFORCE_STATE_COLOR[a.state];
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 4, 12), new THREE.MeshLambertMaterial({ color }));
      body.position.y = 0.95;
      group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), new THREE.MeshLambertMaterial({ color: '#e2e8f0' }));
      head.position.y = 1.85;
      group.add(head);
      const nameLabel = makeTextSprite(`${STATE_ICON[a.state]} ${a.name.slice(0, 10)}`, { size: 3.4 });
      nameLabel.position.y = 2.7;
      group.add(nameLabel);
      group.position.set(px, 0, pz);
      group.userData = { agentId: a.id, state: a.state };
      scene.add(group);
      meshes.set(a.id, group);
      clickable.push(body, head);

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

    // アニメーション: working は小さく上下動（レイアウトは不変・メッシュのみ動く）。
    let raf = 0;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      for (const [, g] of meshes) {
        if ((g.userData.state as string) === 'working') g.position.y = Math.sin(t * 3) * 0.08;
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
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose();
      });
    };
    // model はサーバ描画ごとに固定。フィルタは可視切替 effect で別処理。
  }, [model, isNarrow, measured]);

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
          label={`${STATE_ICON[s]} ${AI_WORKFORCE_STATE_LABEL[s]}（${model.totals.byState[s] ?? 0}）`}
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
              3D 表示を初期化できませんでした（WebGL 不可）。下の 2D 一覧をご利用ください。
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
                          className="text-left font-medium text-primary hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setSelectedId(a.id)}
                        >
                          {a.name}
                        </button>
                        <div className="text-[11px] text-muted-foreground">{a.role}</div>
                      </td>
                      <td className="px-3 py-2 text-xs">{a.department}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: `${AI_WORKFORCE_STATE_COLOR[a.state]}22`, color: AI_WORKFORCE_STATE_COLOR[a.state] }}>
                          <span aria-hidden>{STATE_ICON[a.state]}</span>
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
        <div className="min-h-[320px] rounded-md border p-4" data-testid="ai-office-detail">
          {selected ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <div className="text-base font-bold">{selected.name}</div>
                <span className="text-lg" aria-hidden>{STATE_ICON[selected.state]}</span>
              </div>
              <div className="text-xs text-muted-foreground">{selected.role} ／ {selected.department}</div>
              <Row k="状態" v={`${AI_WORKFORCE_STATE_LABEL[selected.state]}`} />
              <Row k="根拠" v={selected.stateReason} />
              {selected.blockedReason ? <Row k="ブロック理由" v={selected.blockedReason} /> : null}
              <Row k="現在のタスク" v={selected.currentTask ?? '—'} />
              <Row k="最終活動" v={selected.lastActivityLabel} />
              <Row k="承認待ち" v={selected.pendingApprovals > 0 ? `${selected.pendingApprovals} 件` : 'なし'} />
              <Row k="実行回数" v={String(selected.runCount)} />
              <Row k="権限レベル" v={selected.permissionLevel} />
              <Row k="データ鮮度" v={selected.lastActivityLabel} />
              <Row k="次の推奨" v={selected.nextRecommendedAction} />
              <div className="flex gap-2 pt-2 text-xs">
                <Link className="text-primary hover:underline" href={`/ai-agents/${selected.id}`}>活動ログを見る</Link>
                {selected.pendingApprovals > 0 ? <Link className="text-primary hover:underline" href="/approvals">承認待ち一覧へ</Link> : null}
              </div>
              <p className="pt-1 text-[11px] text-muted-foreground">この画面から実行・承認・削除はできません（read-only）。</p>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              AI 社員（3D の人形または一覧）を選択すると詳細を表示します。
              <div className="mt-3 space-y-1 text-xs">
                {AI_WORKFORCE_STATES.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <span aria-hidden>{STATE_ICON[s]}</span>
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

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition focus-visible:ring-2 focus-visible:ring-ring ${active ? 'border-primary bg-primary/10 font-medium text-primary' : 'hover:bg-secondary'}`}
    >
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
