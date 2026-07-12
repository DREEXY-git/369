# 実装前Gateプロンプトの型

> 目次に戻る → [[index]] ／ 関連 → [[フェーズ実装プロンプトの型]] ・ [[安全第一の哲学]] ・ [[ControlTowerV0設計と実装前Gate]]

## 用途

設計が終わった機能を**実装に入る前**に、「既存の schema・RBAC・seed だけで成立するか」を紙の上（docs-only）で最終判定させる型。成立しないなら **STOP して別承認**に送る。P3-CT-4（FakeLLM 下書き生成）などで実証済み。

## 骨子

```
# 0. 目的
<設計doc> を受け、実装に入る前の Gate 判定を docs-only で行う。実装コードは書かない。

# Scout（前提整合・乖離があれば STOP）
- HEAD / origin/feature / origin/main / 未push / tree clean / 369-vault 差分 0
- 前提 CI run <run-id> が green（可能ならログ本文まで）

# Gate 判定（A〜I。各項目に証跡を付ける）
A. 既存 schema だけで成立するか（新テーブル・新列・migration 不要か）
B. 既存 RBAC だけで成立するか（新ロール・新アクション不要か）
C. 既存 seed だけで成立するか
D. 状態永続化（dismiss/snooze/pin 等）が不要か
E. 新 DataAccessAction / 新 UsageEvent eventType が不要か
F. redaction 不変か（担当者に金額実値・finance 件数を見せないままか）
G. PII 非増加か
H. 外部送信・実LLM・課金・本番に触れないか
I. 既存 e2e を壊さない追加方針があるか

# 重要ルール
「既存 schema だけで成立」と**推定で断定しない**。対象テーブル・関数を
read-only で実査してから判定する。1つでも NO なら STOP・別承認事項として明記。

# 出力
roadmap<N>（Gate 判定・最小実装計画・触らないファイル一覧・STOP条件）＋audit<N> を作成。
commit-only（push は別承認）。
```

## 効果

- 実装が始まってから「schema が要る」と発覚する事故がゼロになる。
- STOP 条件が先に文書化されるので、実装ミッションは計画どおりの最小差分だけで完走できる。
