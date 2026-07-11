---
title: "Appendix B 製品・戦略・安全・運用要件"
status: generated-canonical-mirror
area: function-master
source: github-function-master
tags:
  - 369
  - function-ledger
  - generated
---
# Appendix B 製品・戦略・安全・運用要件

> GitHub完全機能台帳からの生成鏡像です。手動編集禁止。

Function MasterとFM231-FM252以外のAppendix B要件です。

## B00 結論

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B00-001 | TEXT | 今やるべきことは、コード実装ではなく、GitHub docs の正本整備です。 | normalized-line:5587 |
| B00-002 | TEXT | IKEZAKI OS / 369 は、単なる多機能SaaSではありません。 | normalized-line:5588 |
| B00-003 | TEXT | 正しい定義は以下です。 | normalized-line:5589 |
| B00-004 | TEXT | 369 / IKEZAKI OS は、AI社員・AI補助社員・業務AIエージェントを、作成・配布・実行・管理・評価・課金・改善できる AI Workforce Infrastructure である。 | normalized-line:5590 |
| B00-005 | TEXT | 別の言い方では、 | normalized-line:5591 |
| B00-006 | TEXT | 会社の意思・情報・許可・行動・証跡を、AIが安全に使える形に変換する経営OSである。 | normalized-line:5592 |
| B00-007 | TEXT | 今回の作業では、この定義に沿って、以下をGitHub docs上で追える状態にしてください。 | normalized-line:5593 |
| B00-008 | TEXT | Core OS | normalized-line:5594 |
| B00-009 | TEXT | Company Brain | normalized-line:5595 |
| B00-010 | TEXT | AI社員 / AI補助社員 | normalized-line:5596 |
| B00-011 | TEXT | Human Certification Gate | normalized-line:5597 |
| B00-012 | TEXT | CRM / Salesforce Layer | normalized-line:5598 |
| B00-013 | TEXT | ERP / Oracle Layer | normalized-line:5599 |
| B00-014 | TEXT | AI Growth Engine | normalized-line:5600 |
| B00-015 | TEXT | PLUG Commerce / Procurement Network | normalized-line:5601 |
| B00-016 | TEXT | 369 Employee App | normalized-line:5602 |
| B00-017 | TEXT | Developer Cloud | normalized-line:5603 |
| B00-018 | TEXT | AI Employee Studio | normalized-line:5604 |
| B00-019 | TEXT | Agent Runtime | normalized-line:5605 |
| B00-020 | TEXT | Agent Manifest / Tool Manifest | normalized-line:5606 |
| B00-021 | TEXT | Safety Review / Certification | normalized-line:5607 |
| B00-022 | TEXT | AI社員 Marketplace | normalized-line:5608 |
| B00-023 | TEXT | Revenue Share / Billing Meter | normalized-line:5609 |
| B00-024 | TEXT | 特許・商標・営業秘密・Runtime依存による moat | normalized-line:5610 |
| B00-025 | TEXT | GitHub Evidence Repository | normalized-line:5611 |
| B00-026 | TEXT | Obsidian Knowledge Graph | normalized-line:5612 |
| B00-027 | TEXT | Zero Ad Growth / PR / SEO / Business Network / Advocate / Affiliate / Creator Growth | normalized-line:5613 |
| B00-028 | TEXT | Release / Supply Chain / SLO / Unit Economics / Data Classification / Enterprise Procurement | normalized-line:5614 |

## B01 最重要安全ルール

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B01-001 | TEXT | 以下は絶対です。 | normalized-line:5616 |
| B01-002 | TEXT | 明示承認なしに commit しない | normalized-line:5617 |
| B01-003 | TEXT | 明示承認なしに push しない | normalized-line:5618 |
| B01-004 | TEXT | 明示承認なしに deploy しない | normalized-line:5619 |
| B01-005 | TEXT | amend / rebase / force push をしない | normalized-line:5620 |
| B01-006 | TEXT | git reset --hard をしない | normalized-line:5621 |
| B01-007 | TEXT | git clean -fd / git clean -fdx をしない | normalized-line:5622 |
| B01-008 | TEXT | git restore / git checkout -- / git stash -u を勝手に使わない | normalized-line:5623 |
| B01-009 | TEXT | rm -rf を使わない | normalized-line:5624 |
| B01-010 | TEXT | chmod -R 777 / chown -R を使わない | normalized-line:5625 |
| B01-011 | TEXT | package一括更新をしない | normalized-line:5626 |
| B01-012 | TEXT | lockfileを無根拠に再生成しない | normalized-line:5627 |
| B01-013 | TEXT | npm audit fix --force をしない | normalized-line:5628 |
| B01-014 | TEXT | DB migration をしない | normalized-line:5629 |
| B01-015 | TEXT | Prisma migration をしない | normalized-line:5630 |
| B01-016 | TEXT | Supabase RLS を変更しない | normalized-line:5631 |
| B01-017 | TEXT | 認証・権限・tenantId条件を緩めない | normalized-line:5632 |
| B01-018 | TEXT | 本番DBへ接続しない | normalized-line:5633 |
| B01-019 | TEXT | 本番APIへ書き込まない | normalized-line:5634 |
| B01-020 | TEXT | 本番deployしない | normalized-line:5635 |
| B01-021 | TEXT | 実LLMキーを設定しない | normalized-line:5636 |
| B01-022 | TEXT | 実LLM APIを呼び出さない | normalized-line:5637 |
| B01-023 | TEXT | AIコストを発生させない | normalized-line:5638 |
| B01-024 | TEXT | 外部メール、Slack、LINE、Teams、SMS、PR配信、SEO公開、導入企業ページ公開をしない | normalized-line:5639 |
| B01-025 | TEXT | 顧客情報、個人情報、secrets、環境変数、OAuth token、cookie、private key、本番ログ生データを出力しない | normalized-line:5640 |
| B01-026 | TEXT | 既存audit docs、HOLD記録、release check記録を一括改変しない | normalized-line:5641 |
| B01-027 | TEXT | 既存audit docsへfrontmatterを一括適用しない | normalized-line:5642 |
| B01-028 | TEXT | 369-vaultを直接編集しない | normalized-line:5643 |
| B01-029 | TEXT | 369-vaultへファイルを移動しない | normalized-line:5644 |
| B01-030 | TEXT | 369-vaultをGitHub正本として扱わない | normalized-line:5645 |
| B01-031 | TEXT | Obsidianだけで正式判断を完結しない | normalized-line:5646 |
| B01-032 | TEXT | Function Master 231-252 を正式昇格しない | normalized-line:5647 |
| B01-033 | TEXT | Growth関連機能を一括実装しない | normalized-line:5648 |
| B01-034 | TEXT | PLUG型アフィリエイトを不透明なリンク差し替えとして設計しない | normalized-line:5649 |
| B01-035 | TEXT | 従業員の個人購買データを会社管理画面へ出す設計をしない | normalized-line:5650 |
| B01-036 | TEXT | AI社員が請求、送金、契約、外部送信、広告変更、採用評価、会計確定を単独実行する設計をしない | normalized-line:5651 |
| B01-037 | TEXT | 安全な代替は以下です。 | normalized-line:5652 |
| B01-038 | TEXT | mock / stub / dry-run | normalized-line:5653 |
| B01-039 | TEXT | read-only | normalized-line:5654 |
| B01-040 | TEXT | AI提案のみモード | normalized-line:5655 |
| B01-041 | TEXT | サンプルデータのみ | normalized-line:5656 |
| B01-042 | TEXT | 外部送信なしのdocs整理 | normalized-line:5657 |
| B01-043 | TEXT | env.exampleの環境変数名だけ更新 | normalized-line:5658 |
| B01-044 | TEXT | 実装ではなく設計候補docs化 | normalized-line:5659 |
| B01-045 | TEXT | Candidate扱い | normalized-line:5660 |
| B01-046 | TEXT | Human-in-the-loop | normalized-line:5661 |
| B01-047 | TEXT | Approval必須 | normalized-line:5662 |
| B01-048 | TEXT | AuditLog追記 | normalized-line:5663 |
| B01-049 | TEXT | Risk Register追記 | normalized-line:5664 |
| B01-050 | TEXT | HOLD記録 | normalized-line:5665 |

## B02 Scout: 編集前に必ず確認すること

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B02-001 | TEXT | 編集前に、まず以下だけを実行・確認してください。 | normalized-line:5667 |
| B02-002 | TEXT | pwd | normalized-line:5668 |
| B02-003 | TEXT | git status --short --branch | normalized-line:5669 |
| B02-004 | TEXT | git branch --show-current | normalized-line:5670 |
| B02-005 | TEXT | git rev-parse --short HEAD | normalized-line:5671 |
| B02-006 | TEXT | git rev-parse --short origin/main | normalized-line:5672 |
| B02-007 | TEXT | git log --oneline --decorate -n 10 | normalized-line:5673 |
| B02-008 | TEXT | git diff --stat | normalized-line:5674 |
| B02-009 | TEXT | 未コミット変更 | normalized-line:5675 |
| B02-010 | TEXT | 未追跡ファイル | normalized-line:5676 |
| B02-011 | TEXT | README / AGENTS.md / CLAUDE.md の有無 | normalized-line:5677 |
| B02-012 | TEXT | docs / tasks / audit / prompts / roadmap / obsidian 関連ディレクトリ | normalized-line:5678 |
| B02-013 | TEXT | .github/workflows の有無 | normalized-line:5679 |
| B02-014 | TEXT | package.json / lockfile の有無 | normalized-line:5680 |
| B02-015 | TEXT | 既存テスト構造 | normalized-line:5681 |
| B02-016 | TEXT | CURRENT_STATE / LAST_VERIFIED / OPEN_RISKS / NEXT_ACTIONS / CLAUDE_CODE_NEXT_PROMPT の有無 | normalized-line:5682 |
| B02-017 | TEXT | 既存ロードマップdocsの場所 | normalized-line:5683 |
| B02-018 | TEXT | 既存Function Master docsの場所 | normalized-line:5684 |
| B02-019 | TEXT | Function Master 231-252 Candidate の有無 | normalized-line:5685 |
| B02-020 | TEXT | docs/08_growth の有無 | normalized-line:5686 |
| B02-021 | TEXT | docs/10_obsidian の有無 | normalized-line:5687 |
| B02-022 | TEXT | OBSIDIAN_INDEX / OBSIDIAN_SYNC_RULES / OBSIDIAN_TAGS の有無 | normalized-line:5688 |
| B02-023 | TEXT | 369-vaultとの関係がdocsに明示されているか | normalized-line:5689 |
| B02-024 | TEXT | 既存audit docsの最大番号 | normalized-line:5690 |
| B02-025 | TEXT | GitHub正本とObsidianメモが衝突していないか | normalized-line:5691 |
| B02-026 | TEXT | 以下なら編集せず停止してください。 | normalized-line:5692 |
| B02-027 | TEXT | 対象リポジトリではない可能性がある | normalized-line:5693 |
| B02-028 | TEXT | docs構造が見つからない | normalized-line:5694 |
| B02-029 | TEXT | 正本docsの位置が判断できない | normalized-line:5695 |
| B02-030 | TEXT | working treeに大量の未確認変更がある | normalized-line:5696 |
| B02-031 | TEXT | ユーザー変更と今回作業が衝突する | normalized-line:5697 |
| B02-032 | TEXT | 実装、DB変更、外部送信、実LLM、AIコスト、本番影響が必要になりそう | normalized-line:5698 |
| B02-033 | TEXT | 既存audit docsの証拠性を壊しそう | normalized-line:5699 |
| B02-034 | TEXT | 369-vault直接編集が必要になりそう | normalized-line:5700 |
| B02-035 | TEXT | 法務・税務・特許・商標の専門判断が必要になりそう | normalized-line:5701 |

## B03 作業モード

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B03-001 | TEXT | 今回の主モードは Mode B: Docs整理 です。 | normalized-line:5703 |
| B03-002 | TEXT | ただし、参照チェックリストとして以下の要素も使ってください。 | normalized-line:5704 |
| B03-003 | TEXT | Mode C: GitHub / Obsidian整備 | normalized-line:5705 |
| B03-004 | TEXT | Mode F: Growth docs整理 | normalized-line:5706 |
| B03-005 | TEXT | Mode G: AI Safety設計 | normalized-line:5707 |
| B03-006 | TEXT | Mode K: Function Master Candidate整理 | normalized-line:5708 |
| B03-007 | TEXT | 今回は Mode B が主です。実装モードではありません。 | normalized-line:5709 |
| B03-008 | TEXT | Mode A: Read-only Audit | normalized-line:5710 |
| B03-009 | LABEL | やること: | normalized-line:5711 |
| B03-010 | TEXT | pwd | normalized-line:5712 |
| B03-011 | TEXT | git status | normalized-line:5713 |
| B03-012 | TEXT | branch / HEAD確認 | normalized-line:5714 |
| B03-013 | TEXT | diff確認 | normalized-line:5715 |
| B03-014 | TEXT | package.json確認 | normalized-line:5716 |
| B03-015 | TEXT | docs / tasks確認 | normalized-line:5717 |
| B03-016 | TEXT | CI確認 | normalized-line:5718 |
| B03-017 | TEXT | リスク整理 | normalized-line:5719 |
| B03-018 | LABEL | やらないこと: | normalized-line:5720 |
| B03-019 | TEXT | ファイル編集 | normalized-line:5721 |
| B03-020 | TEXT | 実装 | normalized-line:5722 |
| B03-021 | TEXT | DB変更 | normalized-line:5723 |
| B03-022 | TEXT | package追加 | normalized-line:5724 |
| B03-023 | TEXT | commit / push / deploy | normalized-line:5725 |
| B03-024 | TEXT | Mode B: Docs整理 | normalized-line:5726 |
| B03-025 | LABEL | やること: | normalized-line:5727 |
| B03-026 | TEXT | docs作成 | normalized-line:5728 |
| B03-027 | TEXT | docs追記 | normalized-line:5729 |
| B03-028 | TEXT | tasks整理 | normalized-line:5730 |
| B03-029 | TEXT | prompt履歴整理 | normalized-line:5731 |
| B03-030 | TEXT | Obsidianリンク候補作成 | normalized-line:5732 |
| B03-031 | LABEL | やらないこと: | normalized-line:5733 |
| B03-032 | TEXT | DB変更 | normalized-line:5734 |
| B03-033 | TEXT | 実装 | normalized-line:5735 |
| B03-034 | TEXT | 外部送信 | normalized-line:5736 |
| B03-035 | TEXT | 本番deploy | normalized-line:5737 |
| B03-036 | TEXT | 既存audit一括改変 | normalized-line:5738 |
| B03-037 | TEXT | Mode C: GitHub / Obsidian整備 | normalized-line:5739 |
| B03-038 | LABEL | やること: | normalized-line:5740 |
| B03-039 | TEXT | docs/10_obsidian作成 | normalized-line:5741 |
| B03-040 | TEXT | OBSIDIAN_SYNC_RULES作成 | normalized-line:5742 |
| B03-041 | TEXT | OBSIDIAN_TAGS作成 | normalized-line:5743 |
| B03-042 | TEXT | 369-vault関係設計案作成 | normalized-line:5744 |
| B03-043 | LABEL | やらないこと: | normalized-line:5745 |
| B03-044 | TEXT | 369-vault直接編集 | normalized-line:5746 |
| B03-045 | TEXT | 369-vault同期実行 | normalized-line:5747 |
| B03-046 | TEXT | secrets同期 | normalized-line:5748 |
| B03-047 | TEXT | 個人情報同期 | normalized-line:5749 |
| B03-048 | TEXT | Mode F: Growth docs整理 | normalized-line:5750 |
| B03-049 | LABEL | やること: | normalized-line:5751 |
| B03-050 | TEXT | docs/08_growth作成・更新 | normalized-line:5752 |
| B03-051 | TEXT | candidate整理 | normalized-line:5753 |
| B03-052 | TEXT | KPI整理 | normalized-line:5754 |
| B03-053 | TEXT | MVP案整理 | normalized-line:5755 |
| B03-054 | LABEL | やらないこと: | normalized-line:5756 |
| B03-055 | TEXT | 外部公開 | normalized-line:5757 |
| B03-056 | TEXT | SEOページ公開 | normalized-line:5758 |
| B03-057 | TEXT | PR配信 | normalized-line:5759 |
| B03-058 | TEXT | 個人情報共有 | normalized-line:5760 |
| B03-059 | TEXT | アフィリエイト報酬実装 | normalized-line:5761 |
| B03-060 | TEXT | Mode G: AI Safety設計 | normalized-line:5762 |
| B03-061 | LABEL | やること: | normalized-line:5763 |
| B03-062 | TEXT | AI Safety Policy整理 | normalized-line:5764 |
| B03-063 | TEXT | RAG権限設計 | normalized-line:5765 |
| B03-064 | TEXT | mock設計 | normalized-line:5766 |
| B03-065 | TEXT | Human Certification Gate設計 | normalized-line:5767 |
| B03-066 | LABEL | やらないこと: | normalized-line:5768 |
| B03-067 | TEXT | 実LLM API呼び出し | normalized-line:5769 |
| B03-068 | TEXT | 実LLMキー設定 | normalized-line:5770 |
| B03-069 | TEXT | AIコスト発生 | normalized-line:5771 |
| B03-070 | TEXT | 外部送信 | normalized-line:5772 |
| B03-071 | TEXT | Mode K: Function Master Candidate整理 | normalized-line:5773 |
| B03-072 | LABEL | やること: | normalized-line:5774 |
| B03-073 | TEXT | candidate docs作成 | normalized-line:5775 |
| B03-074 | TEXT | 重複整理 | normalized-line:5776 |
| B03-075 | TEXT | Phase分類 | normalized-line:5777 |
| B03-076 | TEXT | 承認ゲート整理 | normalized-line:5778 |
| B03-077 | TEXT | MVP候補整理 | normalized-line:5779 |
| B03-078 | LABEL | やらないこと: | normalized-line:5780 |
| B03-079 | TEXT | 正式Function Master昇格 | normalized-line:5781 |
| B03-080 | TEXT | DB化 | normalized-line:5782 |
| B03-081 | TEXT | 画面実装 | normalized-line:5783 |
| B03-082 | TEXT | API実装 | normalized-line:5784 |
| B03-083 | TEXT | 外部公開 | normalized-line:5785 |

## B04 Definition of Ready

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B04-001 | TEXT | 編集前に以下を満たしているか確認してください。 | normalized-line:5787 |
| B04-002 | TEXT | 今回目的が明確 | normalized-line:5788 |
| B04-003 | TEXT | 作業モードが Mode B として明確 | normalized-line:5789 |
| B04-004 | TEXT | Git状態が確認できる | normalized-line:5790 |
| B04-005 | TEXT | 対象Phaseが明確 | normalized-line:5791 |
| B04-006 | TEXT | 今回やることがdocs整備に限定されている | normalized-line:5792 |
| B04-007 | TEXT | 今回やらないことが明確 | normalized-line:5793 |
| B04-008 | TEXT | 承認ゲートが確認されている | normalized-line:5794 |
| B04-009 | TEXT | 検証コマンド候補が確認されている | normalized-line:5795 |
| B04-010 | TEXT | docs更新対象が明確 | normalized-line:5796 |
| B04-011 | TEXT | Obsidian同期対象が明確 | normalized-line:5797 |
| B04-012 | TEXT | 369-vaultに直接触らないことが明確 | normalized-line:5798 |
| B04-013 | TEXT | DB / 認証 / 権限 / 個人情報 / 外部送信 / AIコスト / 本番影響がない | normalized-line:5799 |
| B04-014 | TEXT | 231-252はCandidate扱い | normalized-line:5800 |
| B04-015 | TEXT | 既存audit docsへfrontmatter一括適用しない | normalized-line:5801 |
| B04-016 | TEXT | GitHub正本とObsidianの役割分担が明確 | normalized-line:5802 |
| B04-017 | TEXT | 満たしていない場合は、編集せず不足情報と次回用最小プロンプト案を出してください。 | normalized-line:5803 |

## B05 GitHub / Obsidian / Claude Code / ChatGPT の役割分担

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B05-001 | TEXT | GitHub | normalized-line:5805 |
| B05-002 | TEXT | GitHubは正本・証拠・変更履歴・実装管理です。 | normalized-line:5806 |
| B05-003 | LABEL | GitHubに置くもの: | normalized-line:5807 |
| B05-004 | TEXT | ソースコード | normalized-line:5808 |
| B05-005 | TEXT | package.json | normalized-line:5809 |
| B05-006 | TEXT | lockfile | normalized-line:5810 |
| B05-007 | TEXT | DBスキーマ | normalized-line:5811 |
| B05-008 | TEXT | Prisma schema | normalized-line:5812 |
| B05-009 | TEXT | migration | normalized-line:5813 |
| B05-010 | TEXT | テスト | normalized-line:5814 |
| B05-011 | TEXT | CI | normalized-line:5815 |
| B05-012 | TEXT | GitHub Actions | normalized-line:5816 |
| B05-013 | TEXT | Issue | normalized-line:5817 |
| B05-014 | TEXT | Pull Request | normalized-line:5818 |
| B05-015 | TEXT | 監査ログ | normalized-line:5819 |
| B05-016 | TEXT | docs | normalized-line:5820 |
| B05-017 | TEXT | tasks | normalized-line:5821 |
| B05-018 | TEXT | Claude Code実行記録 | normalized-line:5822 |
| B05-019 | TEXT | HOLD記録 | normalized-line:5823 |
| B05-020 | TEXT | 完了記録 | normalized-line:5824 |
| B05-021 | TEXT | 設計判断 | normalized-line:5825 |
| B05-022 | TEXT | ADR | normalized-line:5826 |
| B05-023 | TEXT | ロードマップ | normalized-line:5827 |
| B05-024 | TEXT | 変更履歴 | normalized-line:5828 |
| B05-025 | TEXT | 品質基準 | normalized-line:5829 |
| B05-026 | TEXT | Security / Privacy / AI Safety方針 | normalized-line:5830 |
| B05-027 | TEXT | Growth Strategy | normalized-line:5831 |
| B05-028 | TEXT | PR / SEO Growth Engine設計 | normalized-line:5832 |
| B05-029 | TEXT | Business Network設計 | normalized-line:5833 |
| B05-030 | TEXT | Advocate / Affiliate / Creator Growth設計 | normalized-line:5834 |
| B05-031 | TEXT | Obsidian同期ルール | normalized-line:5835 |
| B05-032 | TEXT | Release Governance | normalized-line:5836 |
| B05-033 | TEXT | Supply Chain Security | normalized-line:5837 |
| B05-034 | TEXT | Test Matrix | normalized-line:5838 |
| B05-035 | TEXT | SLO / SLA / Observability | normalized-line:5839 |
| B05-036 | TEXT | Unit Economics | normalized-line:5840 |
| B05-037 | TEXT | Data Classification | normalized-line:5841 |
| B05-038 | TEXT | Enterprise Procurement | normalized-line:5842 |
| B05-039 | TEXT | 次回Claude Codeプロンプト | normalized-line:5843 |
| B05-040 | LABEL | GitHubに置いてはいけないもの: | normalized-line:5844 |
| B05-041 | TEXT | secrets | normalized-line:5845 |
| B05-042 | TEXT | .envの実値 | normalized-line:5846 |
| B05-043 | TEXT | 実LLM APIキー | normalized-line:5847 |
| B05-044 | TEXT | OAuth token | normalized-line:5848 |
| B05-045 | TEXT | cookie | normalized-line:5849 |
| B05-046 | TEXT | session情報 | normalized-line:5850 |
| B05-047 | TEXT | private key | normalized-line:5851 |
| B05-048 | TEXT | 本番ログの生データ | normalized-line:5852 |
| B05-049 | TEXT | 個人情報 | normalized-line:5853 |
| B05-050 | TEXT | 顧客許諾なし情報 | normalized-line:5854 |
| B05-051 | TEXT | node_modules | normalized-line:5855 |
| B05-052 | TEXT | build成果物 | normalized-line:5856 |
| B05-053 | TEXT | .next | normalized-line:5857 |
| B05-054 | TEXT | dist | normalized-line:5858 |
| B05-055 | TEXT | coverageの巨大出力 | normalized-line:5859 |
| B05-056 | TEXT | 一時ファイル | normalized-line:5860 |
| B05-057 | TEXT | Obsidian | normalized-line:5861 |
| B05-058 | TEXT | Obsidianは思考整理・経営者向けダッシュボード・ロードマップ・監査ログ閲覧・ナレッジグラフです。 | normalized-line:5862 |
| B05-059 | LABEL | Obsidianで見るべきもの: | normalized-line:5863 |
| B05-060 | TEXT | 現在地 | normalized-line:5864 |
| B05-061 | TEXT | Phase別進捗 | normalized-line:5865 |
| B05-062 | TEXT | 機能マスター | normalized-line:5866 |
| B05-063 | TEXT | 開発ログ | normalized-line:5867 |
| B05-064 | TEXT | 監査ログ | normalized-line:5868 |
| B05-065 | TEXT | HOLD記録 | normalized-line:5869 |
| B05-066 | TEXT | リスク一覧 | normalized-line:5870 |
| B05-067 | TEXT | Claude Codeへの次回指示 | normalized-line:5871 |
| B05-068 | TEXT | 事業戦略 | normalized-line:5872 |
| B05-069 | TEXT | マーケティング戦略 | normalized-line:5873 |
| B05-070 | TEXT | PR / SEO / Business Network構想 | normalized-line:5874 |
| B05-071 | TEXT | Advocate / Affiliate / Creator Growth構想 | normalized-line:5875 |
| B05-072 | TEXT | AI社員構想 | normalized-line:5876 |
| B05-073 | TEXT | 重要な設計判断 | normalized-line:5877 |
| B05-074 | TEXT | 用語集 | normalized-line:5878 |
| B05-075 | TEXT | 競合比較 | normalized-line:5879 |
| B05-076 | TEXT | 非エンジニア向け説明 | normalized-line:5880 |
| B05-077 | TEXT | 経営判断メモ | normalized-line:5881 |
| B05-078 | LABEL | Obsidian最小入口: | normalized-line:5882 |
| B05-079 | TEXT | IKEZAKI_OS_HOME.md | normalized-line:5883 |
| B05-080 | TEXT | CURRENT_STATE.md | normalized-line:5884 |
| B05-081 | TEXT | NEXT_ACTION.md | normalized-line:5885 |
| B05-082 | TEXT | OPEN_RISKS.md | normalized-line:5886 |
| B05-083 | TEXT | CLAUDE_CODE_NEXT_PROMPT.md | normalized-line:5887 |
| B05-084 | LABEL | Obsidian禁止: | normalized-line:5888 |
| B05-085 | TEXT | Obsidianだけに正式情報を置かない | normalized-line:5889 |
| B05-086 | TEXT | Obsidian側draftをGitHub officialと混同しない | normalized-line:5890 |
| B05-087 | TEXT | 369-vaultをClaude Codeが勝手に編集しない | normalized-line:5891 |
| B05-088 | TEXT | secrets、個人情報、本番ログ生データを同期しない | normalized-line:5892 |
| B05-089 | TEXT | Obsidianのcandidateメモは、Claude Code経由でGitHubへ反映してからofficial扱いにする | normalized-line:5893 |
| B05-090 | TEXT | Claude Code | normalized-line:5894 |
| B05-091 | TEXT | Claude Codeは実装・監査・検証・docs更新の実行者です。 | normalized-line:5895 |
| B05-092 | TEXT | ChatGPT | normalized-line:5896 |
| B05-093 | TEXT | ChatGPTは Claude Codeに渡すプロンプト生成・戦略設計・非エンジニア向け判断補助です。 | normalized-line:5897 |

## B06 推奨GitHub docs構造

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B06-001 | TEXT | 既存構造がある場合は必ず既存を優先してください。 | normalized-line:5899 |
| B06-002 | TEXT | 存在しない場合は、以下を候補として作成・追記してください。 | normalized-line:5900 |
| B06-003 | TEXT | docs/00_current_state/CURRENT_STATE.md | normalized-line:5901 |
| B06-004 | TEXT | docs/00_current_state/LAST_VERIFIED.md | normalized-line:5902 |
| B06-005 | TEXT | docs/00_current_state/OPEN_RISKS.md | normalized-line:5903 |
| B06-006 | TEXT | docs/01_roadmap/ROADMAP.md | normalized-line:5904 |
| B06-007 | TEXT | docs/01_roadmap/PHASES.md | normalized-line:5905 |
| B06-008 | TEXT | docs/01_roadmap/NEXT_ACTIONS.md | normalized-line:5906 |
| B06-009 | TEXT | docs/01_roadmap/IKEZAKI_OS_ROADMAP_PHASE_0_26_CANDIDATE.md | normalized-line:5907 |
| B06-010 | TEXT | docs/02_function_master/FUNCTION_MASTER_000_150.md | normalized-line:5908 |
| B06-011 | TEXT | docs/02_function_master/FUNCTION_MASTER_151_200.md | normalized-line:5909 |
| B06-012 | TEXT | docs/02_function_master/FUNCTION_MASTER_201_220_GROWTH.md | normalized-line:5910 |
| B06-013 | TEXT | docs/02_function_master/FUNCTION_MASTER_221_230_GITHUB_OBSIDIAN.md | normalized-line:5911 |
| B06-014 | TEXT | docs/02_function_master/FUNCTION_MASTER_231_252_CANDIDATES.md | normalized-line:5912 |
| B06-015 | TEXT | docs/02_function_master/DO_NOT_BUILD.md | normalized-line:5913 |
| B06-016 | TEXT | docs/03_architecture/SYSTEM_OVERVIEW.md | normalized-line:5914 |
| B06-017 | TEXT | docs/03_architecture/COMPANY_IDENTITY.md | normalized-line:5915 |
| B06-018 | TEXT | docs/03_architecture/COMPANY_BRAIN.md | normalized-line:5916 |
| B06-019 | TEXT | docs/03_architecture/BUSINESS_EVENT_LEDGER.md | normalized-line:5917 |
| B06-020 | TEXT | docs/03_architecture/AI_EXECUTION_LEDGER.md | normalized-line:5918 |
| B06-021 | TEXT | docs/03_architecture/PERMISSION_APPROVAL_AUDIT.md | normalized-line:5919 |
| B06-022 | TEXT | docs/03_architecture/HUMAN_CERTIFICATION_GATE.md | normalized-line:5920 |
| B06-023 | TEXT | docs/03_architecture/AGENT_RUNTIME_AND_MANIFEST.md | normalized-line:5921 |
| B06-024 | TEXT | docs/03_architecture/DEVELOPER_CLOUD_ARCHITECTURE_CANDIDATE.md | normalized-line:5922 |
| B06-025 | TEXT | docs/03_architecture/INTEGRATION_HUB.md | normalized-line:5923 |
| B06-026 | TEXT | docs/04_quality/QUALITY_BASELINE.md | normalized-line:5924 |
| B06-027 | TEXT | docs/04_quality/CI_PLAN.md | normalized-line:5925 |
| B06-028 | TEXT | docs/04_quality/TEST_STRATEGY.md | normalized-line:5926 |
| B06-029 | TEXT | docs/04_quality/TEST_MATRIX.md | normalized-line:5927 |
| B06-030 | TEXT | docs/04_quality/SERVER_ACTIONS_NEGATIVE_TESTS.md | normalized-line:5928 |
| B06-031 | TEXT | docs/04_quality/PRODUCTION_CHECK_PLAYBOOK.md | normalized-line:5929 |
| B06-032 | TEXT | docs/04_quality/DOCUMENTATION_QUALITY_GATE.md | normalized-line:5930 |
| B06-033 | TEXT | docs/04_quality/SUPPLY_CHAIN_SECURITY.md | normalized-line:5931 |
| B06-034 | TEXT | docs/04_quality/RELEASE_GOVERNANCE.md | normalized-line:5932 |
| B06-035 | TEXT | docs/04_quality/SLO_SLA_OBSERVABILITY.md | normalized-line:5933 |
| B06-036 | TEXT | docs/05_security/SECURITY_POLICY.md | normalized-line:5934 |
| B06-037 | TEXT | docs/05_security/APPROVAL_GATES.md | normalized-line:5935 |
| B06-038 | TEXT | docs/05_security/PRIVACY_POLICY_NOTES.md | normalized-line:5936 |
| B06-039 | TEXT | docs/05_security/AI_SAFETY_POLICY.md | normalized-line:5937 |
| B06-040 | TEXT | docs/05_security/TRUST_CENTER_PLAN.md | normalized-line:5938 |
| B06-041 | TEXT | docs/05_security/AI_AGENT_RAG_SAFETY.md | normalized-line:5939 |
| B06-042 | TEXT | docs/05_security/DATA_CLASSIFICATION.md | normalized-line:5940 |
| B06-043 | TEXT | docs/06_audit/audit_YYYYMMDD_xxx.md | normalized-line:5941 |
| B06-044 | TEXT | docs/06_audit/hold_YYYYMMDD_xxx.md | normalized-line:5942 |
| B06-045 | TEXT | docs/06_audit/release_check_YYYYMMDD_xxx.md | normalized-line:5943 |
| B06-046 | TEXT | docs/07_prompts/META_PROMPT_LATEST.md | normalized-line:5944 |
| B06-047 | TEXT | docs/07_prompts/META_PROMPT_HISTORY.md | normalized-line:5945 |
| B06-048 | TEXT | docs/07_prompts/CLAUDE_CODE_NEXT_PROMPT.md | normalized-line:5946 |
| B06-049 | TEXT | docs/07_prompts/PROMPT_HISTORY.md | normalized-line:5947 |
| B06-050 | TEXT | docs/07_prompts/PROMPT_DECISION_LOG.md | normalized-line:5948 |
| B06-051 | TEXT | docs/08_growth/ZERO_AD_GROWTH_STRATEGY.md | normalized-line:5949 |
| B06-052 | TEXT | docs/08_growth/PR_SEO_GROWTH_ENGINE.md | normalized-line:5950 |
| B06-053 | TEXT | docs/08_growth/BUSINESS_NETWORK.md | normalized-line:5951 |
| B06-054 | TEXT | docs/08_growth/TRUST_PASSPORT.md | normalized-line:5952 |
| B06-055 | TEXT | docs/08_growth/ADVOCATE_AFFILIATE_ENGINE.md | normalized-line:5953 |
| B06-056 | TEXT | docs/08_growth/CREATOR_PORTAL.md | normalized-line:5954 |
| B06-057 | TEXT | docs/08_growth/WHITE_LABEL_DIAGNOSIS.md | normalized-line:5955 |
| B06-058 | TEXT | docs/08_growth/COMPLIANCE_DISCLOSURE_GUARD.md | normalized-line:5956 |
| B06-059 | TEXT | docs/08_growth/PUBLIC_IMPACT_DASHBOARD.md | normalized-line:5957 |
| B06-060 | TEXT | docs/08_growth/CHALLENGE_EVENT_ENGINE.md | normalized-line:5958 |
| B06-061 | TEXT | docs/08_growth/CREATOR_MARKETPLACE.md | normalized-line:5959 |
| B06-062 | TEXT | docs/08_growth/GROWTH_KPI.md | normalized-line:5960 |
| B06-063 | TEXT | docs/08_growth/ABUSE_RATE_LIMIT_GOVERNANCE.md | normalized-line:5961 |
| B06-064 | TEXT | docs/08_growth/PARTNER_PAYOUT_REVENUE_SHARE_CANDIDATE.md | normalized-line:5962 |
| B06-065 | TEXT | docs/08_growth/PLUG_COMMERCE_EMPLOYEE_APP_STRATEGY_CANDIDATE.md | normalized-line:5963 |
| B06-066 | TEXT | docs/08_growth/AI_WORKFORCE_ECONOMY_STRATEGY_CANDIDATE.md | normalized-line:5964 |
| B06-067 | TEXT | docs/09_decisions/ADR_0001_xxx.md | normalized-line:5965 |
| B06-068 | TEXT | docs/10_obsidian/OBSIDIAN_INDEX.md | normalized-line:5966 |
| B06-069 | TEXT | docs/10_obsidian/OBSIDIAN_SYNC_RULES.md | normalized-line:5967 |
| B06-070 | TEXT | docs/10_obsidian/OBSIDIAN_TAGS.md | normalized-line:5968 |
| B06-071 | TEXT | docs/10_obsidian/OBSIDIAN_369_VAULT_RELATIONSHIP_CANDIDATE.md | normalized-line:5969 |
| B06-072 | TEXT | docs/11_business/UNIT_ECONOMICS.md | normalized-line:5970 |
| B06-073 | TEXT | docs/11_business/ENTERPRISE_PROCUREMENT.md | normalized-line:5971 |
| B06-074 | TEXT | docs/11_business/GLOBAL_TAX_EINVOICING_CANDIDATE.md | normalized-line:5972 |
| B06-075 | TEXT | docs/11_business/AI_EMPLOYEE_MARKETPLACE_BUSINESS_MODEL_CANDIDATE.md | normalized-line:5973 |
| B06-076 | TEXT | docs/11_business/IP_MOAT_STRATEGY_CANDIDATE.md | normalized-line:5974 |
| B06-077 | TEXT | docs/11_business/DEVELOPER_CLOUD_MARKETPLACE_STRATEGY_CANDIDATE.md | normalized-line:5975 |
| B06-078 | TEXT | docs/11_business/RACI_OWNERSHIP.md | normalized-line:5976 |
| B06-079 | TEXT | docs/12_legal/LEGAL_EVIDENCE_EDISCOVERY_CANDIDATE.md | normalized-line:5977 |
| B06-080 | TEXT | docs/12_legal/TERMS_POLICY_CONSENT_GOVERNANCE_CANDIDATE.md | normalized-line:5978 |
| B06-081 | TEXT | docs/13_industry/SECTOR_DEEP_PACKS_CANDIDATE.md | normalized-line:5979 |
| B06-082 | TEXT | tasks/TODO.md | normalized-line:5980 |
| B06-083 | TEXT | tasks/BACKLOG.md | normalized-line:5981 |
| B06-084 | TEXT | tasks/HOLD.md | normalized-line:5982 |
| B06-085 | TEXT | tasks/DONE.md | normalized-line:5983 |
| B06-086 | TEXT | README.md | normalized-line:5984 |
| B06-087 | TEXT | AGENTS.md | normalized-line:5985 |
| B06-088 | TEXT | CLAUDE.md | normalized-line:5986 |
| B06-089 | TEXT | 作成ファイル数が多すぎる場合は、まず以下の最小セットに絞ってください。 | normalized-line:5987 |
| B06-090 | TEXT | docs/01_roadmap/IKEZAKI_OS_ROADMAP_PHASE_0_26_CANDIDATE.md | normalized-line:5988 |
| B06-091 | TEXT | docs/02_function_master/FUNCTION_MASTER_231_252_CANDIDATES.md | normalized-line:5989 |
| B06-092 | TEXT | docs/08_growth/AI_WORKFORCE_ECONOMY_STRATEGY_CANDIDATE.md | normalized-line:5990 |
| B06-093 | TEXT | docs/08_growth/PLUG_COMMERCE_EMPLOYEE_APP_STRATEGY_CANDIDATE.md | normalized-line:5991 |
| B06-094 | TEXT | docs/11_business/DEVELOPER_CLOUD_MARKETPLACE_STRATEGY_CANDIDATE.md | normalized-line:5992 |
| B06-095 | TEXT | docs/11_business/IP_MOAT_STRATEGY_CANDIDATE.md | normalized-line:5993 |
| B06-096 | TEXT | docs/10_obsidian/OBSIDIAN_369_VAULT_RELATIONSHIP_CANDIDATE.md | normalized-line:5994 |
| B06-097 | TEXT | docs/07_prompts/CLAUDE_CODE_NEXT_PROMPT.md | normalized-line:5995 |
| B06-098 | TEXT | docs/00_current_state/OPEN_RISKS.md | normalized-line:5996 |
| B06-099 | TEXT | docs/01_roadmap/NEXT_ACTIONS.md | normalized-line:5997 |

## B07 IKEZAKI OS / 369 の本質

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B07-001 | TEXT | 369 / IKEZAKI OS の本当の強みは、機能が多いことではありません。 | normalized-line:5999 |
| B07-002 | TEXT | 本質は以下です。 | normalized-line:6000 |
| B07-003 | TEXT | 会社の情報をAIが扱える構造に変換できる | normalized-line:6001 |
| B07-004 | TEXT | AIにやらせることだけでなく、AIにやらせない境界を設計している | normalized-line:6002 |
| B07-005 | TEXT | Company Brainによって、会社専用の判断基準をAIに持たせられる | normalized-line:6003 |
| B07-006 | TEXT | AI社員が安全に働くための権限・承認・監査・記憶の土台を作っている | normalized-line:6004 |
| B07-007 | TEXT | 使うほど会社の意思決定履歴が蓄積し、乗り換えづらい資産になる | normalized-line:6005 |
| B07-008 | TEXT | LeadMap AIやAI Growth Engineのような入口商品から、OS全体に拡張できる | normalized-line:6006 |
| B07-009 | TEXT | 便利さだけでなく、信用・安全・証跡・法務配慮を売れる | normalized-line:6007 |
| B07-010 | LABEL | 短い定義: | normalized-line:6008 |
| B07-011 | TEXT | AI社員を雇い、育て、働かせ、進化させる経営OS。 | normalized-line:6009 |
| B07-012 | LABEL | 中定義: | normalized-line:6010 |
| B07-013 | TEXT | 人間が主人公であり続けながら、AI社員が24時間365日、事業の全領域を稼働させる AI Workforce Ecosystem。 | normalized-line:6011 |
| B07-014 | LABEL | 事業モデル定義: | normalized-line:6012 |
| B07-015 | TEXT | 自社のあらゆる業務にAI社員を配置し、日々の営みがそのままプロダクト・データ・収益源に転化する自己増殖型ビジネス基盤。 | normalized-line:6013 |

## B08 369は何ではないか

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B08-001 | TEXT | 以下ではありません。 | normalized-line:6015 |
| B08-002 | TEXT | 単なる業務自動化ツールではない | normalized-line:6016 |
| B08-003 | TEXT | 単なるチャットボットではない | normalized-line:6017 |
| B08-004 | TEXT | 単なる生成AI活用ではない | normalized-line:6018 |
| B08-005 | TEXT | 単なるRPAではない | normalized-line:6019 |
| B08-006 | TEXT | 単なるSaaSの寄せ集めではない | normalized-line:6020 |
| B08-007 | TEXT | 単なる社内ナレッジシステムではない | normalized-line:6021 |
| B08-008 | TEXT | 単なるERPではない | normalized-line:6022 |
| B08-009 | TEXT | 人件費を置き換えて削るだけのコストカット装置ではない | normalized-line:6023 |
| B08-010 | TEXT | 個別プロジェクトごとに作る受託開発ではない | normalized-line:6024 |
| B08-011 | TEXT | 本質は以下です。 | normalized-line:6025 |
| B08-012 | TEXT | 会社そのものをOS化する | normalized-line:6026 |
| B08-013 | TEXT | 人間とAI社員が役割を分けて協働する | normalized-line:6027 |
| B08-014 | TEXT | 業務・データ・プロダクト・収益が1つのEcosystemとして循環する | normalized-line:6028 |
| B08-015 | TEXT | 「AIを使う」から「AIと働く」へ、経営の前提を書き換える | normalized-line:6029 |

## B09 5つの中核思想

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B09-001 | TEXT | 人間が主人公である | normalized-line:6031 |
| B09-002 | TEXT | AI社員は人間を代替しない、人間を強化する | normalized-line:6032 |
| B09-003 | TEXT | 24時間365日、事業は止まらない。ただし危険操作は人間承認必須 | normalized-line:6033 |
| B09-004 | TEXT | 解雇ではなく、停止・置換・再設計 | normalized-line:6034 |
| B09-005 | TEXT | 日々評価し、進化する | normalized-line:6035 |
| B09-006 | LABEL | 人間が決めるもの: | normalized-line:6036 |
| B09-007 | TEXT | 経営ビジョン | normalized-line:6037 |
| B09-008 | TEXT | 戦略・優先順位 | normalized-line:6038 |
| B09-009 | TEXT | 商品・サービスの魂 | normalized-line:6039 |
| B09-010 | TEXT | 価値観・文化 | normalized-line:6040 |
| B09-011 | TEXT | 危険操作の承認 | normalized-line:6041 |
| B09-012 | TEXT | AI社員の停止・置換 | normalized-line:6042 |
| B09-013 | TEXT | 組織構造・体制 | normalized-line:6043 |
| B09-014 | TEXT | 予算配分 | normalized-line:6044 |
| B09-015 | TEXT | 重要取引の合意 | normalized-line:6045 |
| B09-016 | TEXT | 採用と評価の最終判断 | normalized-line:6046 |
| B09-017 | TEXT | お客様との関係の質 | normalized-line:6047 |
| B09-018 | TEXT | 新規事業の意思決定 | normalized-line:6048 |
| B09-019 | TEXT | なぜこの会社が存在するのか | normalized-line:6049 |
| B09-020 | LABEL | AI社員が引き受けるもの: | normalized-line:6050 |
| B09-021 | TEXT | 定型作業 | normalized-line:6051 |
| B09-022 | TEXT | 繰り返し処理 | normalized-line:6052 |
| B09-023 | TEXT | 24時間監視 | normalized-line:6053 |
| B09-024 | TEXT | アラート | normalized-line:6054 |
| B09-025 | TEXT | レポート生成 | normalized-line:6055 |
| B09-026 | TEXT | データ集計 | normalized-line:6056 |
| B09-027 | TEXT | 数値整理 | normalized-line:6057 |
| B09-028 | TEXT | 情報検索 | normalized-line:6058 |
| B09-029 | TEXT | ドキュメント生成 | normalized-line:6059 |
| B09-030 | TEXT | 翻訳 | normalized-line:6060 |
| B09-031 | TEXT | スケジュール・タスク追跡 | normalized-line:6061 |
| B09-032 | LABEL | 危険操作: | normalized-line:6062 |
| B09-033 | TEXT | 送金・支払い実行 | normalized-line:6063 |
| B09-034 | TEXT | 契約締結・解除 | normalized-line:6064 |
| B09-035 | TEXT | 顧客への重要通知 | normalized-line:6065 |
| B09-036 | TEXT | 大量データ削除 | normalized-line:6066 |
| B09-037 | TEXT | 権限設定変更 | normalized-line:6067 |
| B09-038 | TEXT | 外部システムへの書込 | normalized-line:6068 |
| B09-039 | TEXT | 採用・評価確定 | normalized-line:6069 |
| B09-040 | TEXT | 高額購買 | normalized-line:6070 |

## B10 10の理念

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B10-001 | TEXT | 人間が主人公 | normalized-line:6072 |
| B10-002 | TEXT | AI社員は仲間 | normalized-line:6073 |
| B10-003 | TEXT | 日々進化する | normalized-line:6074 |
| B10-004 | TEXT | 24時間止まらない | normalized-line:6075 |
| B10-005 | TEXT | 危険操作は必ず承認 | normalized-line:6076 |
| B10-006 | TEXT | 記録は資産 | normalized-line:6077 |
| B10-007 | TEXT | 停止・置換・再設計 | normalized-line:6078 |
| B10-008 | TEXT | 現場から進化 | normalized-line:6079 |
| B10-009 | TEXT | 従量課金で公正 | normalized-line:6080 |
| B10-010 | TEXT | 自社を最初の顧客に | normalized-line:6081 |
| B10-011 | LABEL | 最終目的: | normalized-line:6082 |
| B10-012 | TEXT | 生産性最大化 | normalized-line:6083 |
| B10-013 | TEXT | 売上最大化 | normalized-line:6084 |
| B10-014 | TEXT | コスト最小化 | normalized-line:6085 |
| B10-015 | TEXT | 利益最大化 | normalized-line:6086 |
| B10-016 | LABEL | 削るべきコスト: | normalized-line:6087 |
| B10-017 | TEXT | 定型作業に費やす人件費 | normalized-line:6088 |
| B10-018 | TEXT | SaaSの重複契約 | normalized-line:6089 |
| B10-019 | TEXT | 部門ごとの外注コスト | normalized-line:6090 |
| B10-020 | TEXT | 情報探索・資料検索の時間ロス | normalized-line:6091 |
| B10-021 | TEXT | 会議参加コスト | normalized-line:6092 |
| B10-022 | TEXT | ミスによる手戻り・クレーム対応 | normalized-line:6093 |
| B10-023 | TEXT | 属人化による引継ぎコスト | normalized-line:6094 |
| B10-024 | TEXT | 承認遅延による機会損失 | normalized-line:6095 |
| B10-025 | TEXT | レポート作成工数 | normalized-line:6096 |
| B10-026 | TEXT | 教育・オンボーディング負荷 | normalized-line:6097 |

## B11 AI社員 / AI補助社員 / ツール

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B11-001 | TEXT | AI社員の16属性 | normalized-line:6099 |
| B11-002 | TEXT | 氏名 | normalized-line:6100 |
| B11-003 | TEXT | 役職・階層 | normalized-line:6101 |
| B11-004 | TEXT | 配属部門 | normalized-line:6102 |
| B11-005 | TEXT | 目的・ミッション | normalized-line:6103 |
| B11-006 | TEXT | 担当業務 | normalized-line:6104 |
| B11-007 | TEXT | 権限範囲 | normalized-line:6105 |
| B11-008 | TEXT | 上長・承認者 | normalized-line:6106 |
| B11-009 | TEXT | KPI | normalized-line:6107 |
| B11-010 | TEXT | スキル・能力 | normalized-line:6108 |
| B11-011 | TEXT | 性格・トーン | normalized-line:6109 |
| B11-012 | TEXT | 稼働ログ | normalized-line:6110 |
| B11-013 | TEXT | 利用料金 | normalized-line:6111 |
| B11-014 | TEXT | 教育履歴 | normalized-line:6112 |
| B11-015 | TEXT | 評価スコア | normalized-line:6113 |
| B11-016 | TEXT | 停止条件 | normalized-line:6114 |
| B11-017 | TEXT | 後継設計 | normalized-line:6115 |
| B11-018 | TEXT | AI補助社員の位置づけ | normalized-line:6116 |
| B11-019 | TEXT | AI社員が独立した働き手なら、AI補助社員は人に張り付く伴走者です。 | normalized-line:6117 |
| B11-020 | LABEL | 例: | normalized-line:6118 |
| B11-021 | TEXT | 営業補助 | normalized-line:6119 |
| B11-022 | TEXT | カスタマー補助 | normalized-line:6120 |
| B11-023 | TEXT | 経理補助 | normalized-line:6121 |
| B11-024 | TEXT | 現場作業補助 | normalized-line:6122 |
| B11-025 | TEXT | 企画補助 | normalized-line:6123 |
| B11-026 | TEXT | 会議補助 | normalized-line:6124 |
| B11-027 | TEXT | 執筆補助 | normalized-line:6125 |
| B11-028 | TEXT | 学習補助 | normalized-line:6126 |
| B11-029 | TEXT | 経営者補助 | normalized-line:6127 |
| B11-030 | TEXT | ツールの7つの役割 | normalized-line:6128 |
| B11-031 | TEXT | EXECUTE: 実行する | normalized-line:6129 |
| B11-032 | TEXT | RETRIEVE: 取得する | normalized-line:6130 |
| B11-033 | TEXT | TRANSFORM: 加工する | normalized-line:6131 |
| B11-034 | TEXT | MONITOR: 監視する | normalized-line:6132 |
| B11-035 | TEXT | GENERATE: 生成する | normalized-line:6133 |
| B11-036 | TEXT | DECIDE: 判定する | normalized-line:6134 |
| B11-037 | TEXT | DELIVER: 届ける | normalized-line:6135 |
| B11-038 | TEXT | 従量課金単位 | normalized-line:6136 |
| B11-039 | TEXT | AI社員稼働時間 | normalized-line:6137 |
| B11-040 | TEXT | タスク実行件数 | normalized-line:6138 |
| B11-041 | TEXT | トークン消費量 | normalized-line:6139 |
| B11-042 | TEXT | API呼び出し回数 | normalized-line:6140 |
| B11-043 | TEXT | 生成物サイズ | normalized-line:6141 |
| B11-044 | TEXT | 保存データ量 | normalized-line:6142 |
| B11-045 | TEXT | 承認処理件数 | normalized-line:6143 |
| B11-046 | TEXT | アカウント数 | normalized-line:6144 |
| B11-047 | TEXT | Company Brain蓄積量 | normalized-line:6145 |
| B11-048 | TEXT | 人間チェック案件 | normalized-line:6146 |
| B11-049 | LABEL | 注意: | normalized-line:6147 |
| B11-050 | TEXT | ピーク時の消費量スパイクには上限アラートが必要 | normalized-line:6148 |
| B11-051 | TEXT | 部門別コスト配賦ルールが必要 | normalized-line:6149 |
| B11-052 | TEXT | 見積提示時に参考消費量を提示するUIが必要 | normalized-line:6150 |
| B11-053 | TEXT | 稼働ゼロを許容する運用マインドセットが必要 | normalized-line:6151 |

## B12 Company Brain

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B12-001 | TEXT | Company Brain は会社の記憶です。 | normalized-line:6153 |
| B12-002 | LABEL | 取り込む対象: | normalized-line:6154 |
| B12-003 | TEXT | 会社方針 | normalized-line:6155 |
| B12-004 | TEXT | 商品・サービス | normalized-line:6156 |
| B12-005 | TEXT | 価格表 | normalized-line:6157 |
| B12-006 | TEXT | 営業プレイブック | normalized-line:6158 |
| B12-007 | TEXT | 顧客事例 | normalized-line:6159 |
| B12-008 | TEXT | FAQ | normalized-line:6160 |
| B12-009 | TEXT | マニュアル | normalized-line:6161 |
| B12-010 | TEXT | 会議 | normalized-line:6162 |
| B12-011 | TEXT | 議事録 | normalized-line:6163 |
| B12-012 | TEXT | 契約ルール | normalized-line:6164 |
| B12-013 | TEXT | ブランドルール | normalized-line:6165 |
| B12-014 | TEXT | 承認ルール | normalized-line:6166 |
| B12-015 | TEXT | 過去の判断履歴 | normalized-line:6167 |
| B12-016 | TEXT | 顧客情報 | normalized-line:6168 |
| B12-017 | TEXT | 案件情報 | normalized-line:6169 |
| B12-018 | TEXT | 売上情報 | normalized-line:6170 |
| B12-019 | TEXT | 失注理由 | normalized-line:6171 |
| B12-020 | TEXT | 社員フィードバック | normalized-line:6172 |
| B12-021 | TEXT | 市場・業界トレンド | normalized-line:6173 |
| B12-022 | TEXT | 競合情報 | normalized-line:6174 |
| B12-023 | TEXT | AI社員自身の稼働ログ | normalized-line:6175 |
| B12-024 | LABEL | 必要な管理: | normalized-line:6176 |
| B12-025 | TEXT | 出所管理 | normalized-line:6177 |
| B12-026 | TEXT | 鮮度管理 | normalized-line:6178 |
| B12-027 | TEXT | 機密ラベル | normalized-line:6179 |
| B12-028 | TEXT | PIIマスキング | normalized-line:6180 |
| B12-029 | TEXT | AI参照可否 | normalized-line:6181 |
| B12-030 | TEXT | 外部送信可否 | normalized-line:6182 |
| B12-031 | TEXT | 参照ログ | normalized-line:6183 |
| B12-032 | TEXT | 引用付き出力 | normalized-line:6184 |
| B12-033 | TEXT | Data Freshness | normalized-line:6185 |
| B12-034 | TEXT | Data Sufficiency | normalized-line:6186 |
| B12-035 | TEXT | Data Quality | normalized-line:6187 |
| B12-036 | TEXT | tenantId分離 | normalized-line:6188 |
| B12-037 | LABEL | 価値: | normalized-line:6189 |
| B12-038 | TEXT | 散らばった情報をAIが読める会社の状態へ変換する | normalized-line:6190 |
| B12-039 | TEXT | 会社専用の判断基準をAIに持たせる | normalized-line:6191 |
| B12-040 | TEXT | 使うほど学習資産が積み上がり、スイッチングコストが上がる | normalized-line:6192 |

## B13 8層構造

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B13-001 | TEXT | IKEZAKI OS / 369 は、以下の8層で整理してください。 | normalized-line:6194 |
| B13-002 | TEXT | Core OS | normalized-line:6195 |
| B13-003 | TEXT | 会社 | normalized-line:6196 |
| B13-004 | TEXT | ユーザー | normalized-line:6197 |
| B13-005 | TEXT | 権限 | normalized-line:6198 |
| B13-006 | TEXT | テナント | normalized-line:6199 |
| B13-007 | TEXT | 監査ログ | normalized-line:6200 |
| B13-008 | TEXT | 承認 | normalized-line:6201 |
| B13-009 | TEXT | 通知 | normalized-line:6202 |
| B13-010 | TEXT | 課金 | normalized-line:6203 |
| B13-011 | TEXT | データ分離 | normalized-line:6204 |
| B13-012 | TEXT | セキュリティ | normalized-line:6205 |
| B13-013 | TEXT | Company Brain | normalized-line:6206 |
| B13-014 | TEXT | 会社方針 | normalized-line:6207 |
| B13-015 | TEXT | 商品 | normalized-line:6208 |
| B13-016 | TEXT | 営業プレイブック | normalized-line:6209 |
| B13-017 | TEXT | 顧客事例 | normalized-line:6210 |
| B13-018 | TEXT | FAQ | normalized-line:6211 |
| B13-019 | TEXT | マニュアル | normalized-line:6212 |
| B13-020 | TEXT | 契約ルール | normalized-line:6213 |
| B13-021 | TEXT | ブランドルール | normalized-line:6214 |
| B13-022 | TEXT | Salesforce Layer | normalized-line:6215 |
| B13-023 | TEXT | CRM | normalized-line:6216 |
| B13-024 | TEXT | SFA | normalized-line:6217 |
| B13-025 | TEXT | MA | normalized-line:6218 |
| B13-026 | TEXT | Service | normalized-line:6219 |
| B13-027 | TEXT | Commerce | normalized-line:6220 |
| B13-028 | TEXT | CPQ | normalized-line:6221 |
| B13-029 | TEXT | Partner | normalized-line:6222 |
| B13-030 | TEXT | Customer Data | normalized-line:6223 |
| B13-031 | TEXT | Analytics | normalized-line:6224 |
| B13-032 | TEXT | Oracle Layer | normalized-line:6225 |
| B13-033 | TEXT | 会計 | normalized-line:6226 |
| B13-034 | TEXT | 請求 | normalized-line:6227 |
| B13-035 | TEXT | 入金 | normalized-line:6228 |
| B13-036 | TEXT | 仕訳候補 | normalized-line:6229 |
| B13-037 | TEXT | 調達 | normalized-line:6230 |
| B13-038 | TEXT | 購買 | normalized-line:6231 |
| B13-039 | TEXT | 在庫 | normalized-line:6232 |
| B13-040 | TEXT | 受発注 | normalized-line:6233 |
| B13-041 | TEXT | SCM | normalized-line:6234 |
| B13-042 | TEXT | 人事 | normalized-line:6235 |
| B13-043 | TEXT | 給与 | normalized-line:6236 |
| B13-044 | TEXT | 予算 | normalized-line:6237 |
| B13-045 | TEXT | 経営管理 | normalized-line:6238 |
| B13-046 | TEXT | GRC | normalized-line:6239 |
| B13-047 | TEXT | AI Employee Runtime | normalized-line:6240 |
| B13-048 | TEXT | AI社員 | normalized-line:6241 |
| B13-049 | TEXT | ツール権限 | normalized-line:6242 |
| B13-050 | TEXT | 実行ログ | normalized-line:6243 |
| B13-051 | TEXT | 承認ゲート | normalized-line:6244 |
| B13-052 | TEXT | Human Certification Gate | normalized-line:6245 |
| B13-053 | TEXT | AI評価 | normalized-line:6246 |
| B13-054 | TEXT | 失敗時補償 | normalized-line:6247 |
| B13-055 | TEXT | Developer Cloud | normalized-line:6248 |
| B13-056 | TEXT | SDK | normalized-line:6249 |
| B13-057 | TEXT | CLI | normalized-line:6250 |
| B13-058 | TEXT | テンプレート | normalized-line:6251 |
| B13-059 | TEXT | Agent Manifest | normalized-line:6252 |
| B13-060 | TEXT | Tool Manifest | normalized-line:6253 |
| B13-061 | TEXT | Sandbox | normalized-line:6254 |
| B13-062 | TEXT | テスト | normalized-line:6255 |
| B13-063 | TEXT | 審査 | normalized-line:6256 |
| B13-064 | TEXT | 配布 | normalized-line:6257 |
| B13-065 | TEXT | 従量課金 | normalized-line:6258 |
| B13-066 | TEXT | Marketplace / Economy | normalized-line:6259 |
| B13-067 | TEXT | AI社員マーケットプレイス | normalized-line:6260 |
| B13-068 | TEXT | 業界テンプレート | normalized-line:6261 |
| B13-069 | TEXT | プラグイン販売 | normalized-line:6262 |
| B13-070 | TEXT | 開発者収益分配 | normalized-line:6263 |
| B13-071 | TEXT | 企業導入 | normalized-line:6264 |
| B13-072 | TEXT | 利用量課金 | normalized-line:6265 |
| B13-073 | TEXT | PLUG Commerce / Procurement Network | normalized-line:6266 |
| B13-074 | TEXT | ブラウザ拡張 | normalized-line:6267 |
| B13-075 | TEXT | EC横断価格比較 | normalized-line:6268 |
| B13-076 | TEXT | クーポン | normalized-line:6269 |
| B13-077 | TEXT | ポイント | normalized-line:6270 |
| B13-078 | TEXT | 送料 | normalized-line:6271 |
| B13-079 | TEXT | 納期 | normalized-line:6272 |
| B13-080 | TEXT | 法人購買 | normalized-line:6273 |
| B13-081 | TEXT | 承認購買 | normalized-line:6274 |
| B13-082 | TEXT | アフィリエイト透明化 | normalized-line:6275 |
| B13-083 | TEXT | 社員配布 | normalized-line:6276 |

## B14 4層インフラ構造

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B14-001 | TEXT | IKEZAKI OSは「全部入りSaaS」ではなく、4層構造で評価してください。 | normalized-line:6278 |
| B14-002 | TEXT | 第1層: Core Infrastructure | normalized-line:6279 |
| B14-003 | TEXT | Company Identity | normalized-line:6280 |
| B14-004 | TEXT | Tenant / Company / User | normalized-line:6281 |
| B14-005 | TEXT | RBAC / ABAC | normalized-line:6282 |
| B14-006 | TEXT | Approval | normalized-line:6283 |
| B14-007 | TEXT | Audit Log | normalized-line:6284 |
| B14-008 | TEXT | Business Event Ledger | normalized-line:6285 |
| B14-009 | TEXT | AI Execution Ledger | normalized-line:6286 |
| B14-010 | TEXT | Data Contract | normalized-line:6287 |
| B14-011 | TEXT | Security Policy | normalized-line:6288 |
| B14-012 | TEXT | Billing / Entitlement | normalized-line:6289 |
| B14-013 | TEXT | Integration Hub | normalized-line:6290 |
| B14-014 | TEXT | Notification | normalized-line:6291 |
| B14-015 | TEXT | Records Management | normalized-line:6292 |
| B14-016 | TEXT | Trust Passport | normalized-line:6293 |
| B14-017 | TEXT | Growth Engine | normalized-line:6294 |
| B14-018 | TEXT | GitHub Evidence Repository | normalized-line:6295 |
| B14-019 | TEXT | Obsidian Knowledge Graph | normalized-line:6296 |
| B14-020 | TEXT | Release Governance | normalized-line:6297 |
| B14-021 | TEXT | Data Classification | normalized-line:6298 |
| B14-022 | TEXT | SLO / SLA | normalized-line:6299 |
| B14-023 | TEXT | Unit Economics | normalized-line:6300 |
| B14-024 | TEXT | 第2層: Business Modules | normalized-line:6301 |
| B14-025 | TEXT | CRM | normalized-line:6302 |
| B14-026 | TEXT | Sales | normalized-line:6303 |
| B14-027 | TEXT | Quote | normalized-line:6304 |
| B14-028 | TEXT | Contract | normalized-line:6305 |
| B14-029 | TEXT | Invoice | normalized-line:6306 |
| B14-030 | TEXT | Payment | normalized-line:6307 |
| B14-031 | TEXT | Accounting | normalized-line:6308 |
| B14-032 | TEXT | HR | normalized-line:6309 |
| B14-033 | TEXT | Inventory | normalized-line:6310 |
| B14-034 | TEXT | Purchase | normalized-line:6311 |
| B14-035 | TEXT | EC | normalized-line:6312 |
| B14-036 | TEXT | CS | normalized-line:6313 |
| B14-037 | TEXT | Marketing | normalized-line:6314 |
| B14-038 | TEXT | ITSM | normalized-line:6315 |
| B14-039 | TEXT | GRC | normalized-line:6316 |
| B14-040 | TEXT | PR / SEO | normalized-line:6317 |
| B14-041 | TEXT | Business Network | normalized-line:6318 |
| B14-042 | TEXT | Docs / Audit / Prompt Management | normalized-line:6319 |
| B14-043 | TEXT | Enterprise Procurement | normalized-line:6320 |
| B14-044 | TEXT | Customer Success | normalized-line:6321 |
| B14-045 | TEXT | Global Tax / E-invoicing | normalized-line:6322 |
| B14-046 | TEXT | 第3層: AI Agent Layer | normalized-line:6323 |
| B14-047 | TEXT | Sales AI | normalized-line:6324 |
| B14-048 | TEXT | Accounting AI | normalized-line:6325 |
| B14-049 | TEXT | HR AI | normalized-line:6326 |
| B14-050 | TEXT | Legal AI | normalized-line:6327 |
| B14-051 | TEXT | CS AI | normalized-line:6328 |
| B14-052 | TEXT | Executive AI | normalized-line:6329 |
| B14-053 | TEXT | Security AI | normalized-line:6330 |
| B14-054 | TEXT | Data AI | normalized-line:6331 |
| B14-055 | TEXT | PR AI | normalized-line:6332 |
| B14-056 | TEXT | SEO AI | normalized-line:6333 |
| B14-057 | TEXT | Growth AI | normalized-line:6334 |
| B14-058 | TEXT | Documentation AI | normalized-line:6335 |
| B14-059 | TEXT | Audit AI | normalized-line:6336 |
| B14-060 | TEXT | Agent Registry | normalized-line:6337 |
| B14-061 | TEXT | Agent Skills | normalized-line:6338 |
| B14-062 | TEXT | Agent Memory | normalized-line:6339 |
| B14-063 | TEXT | Agent Logs | normalized-line:6340 |
| B14-064 | TEXT | Human Approval | normalized-line:6341 |
| B14-065 | TEXT | Kill Switch | normalized-line:6342 |
| B14-066 | TEXT | AI Execution Ledger | normalized-line:6343 |
| B14-067 | TEXT | Model Router | normalized-line:6344 |
| B14-068 | TEXT | RAG Governance | normalized-line:6345 |
| B14-069 | TEXT | Prompt Injection Safety | normalized-line:6346 |
| B14-070 | TEXT | AI Cost Governance | normalized-line:6347 |
| B14-071 | TEXT | 第4層: Ecosystem | normalized-line:6348 |
| B14-072 | TEXT | API | normalized-line:6349 |
| B14-073 | TEXT | SDK | normalized-line:6350 |
| B14-074 | TEXT | MCP | normalized-line:6351 |
| B14-075 | TEXT | App Marketplace | normalized-line:6352 |
| B14-076 | TEXT | Agent Skill Marketplace | normalized-line:6353 |
| B14-077 | TEXT | Workflow Marketplace | normalized-line:6354 |
| B14-078 | TEXT | Industry Template Marketplace | normalized-line:6355 |
| B14-079 | TEXT | Creator Marketplace | normalized-line:6356 |
| B14-080 | TEXT | Affiliate / Advocate Network | normalized-line:6357 |
| B14-081 | TEXT | Certified Partners | normalized-line:6358 |
| B14-082 | TEXT | Developer Portal | normalized-line:6359 |
| B14-083 | TEXT | Creator Portal | normalized-line:6360 |
| B14-084 | TEXT | Advisor Directory | normalized-line:6361 |
| B14-085 | TEXT | Sandbox | normalized-line:6362 |
| B14-086 | TEXT | Trust Center | normalized-line:6363 |
| B14-087 | TEXT | Partner Review | normalized-line:6364 |
| B14-088 | TEXT | Business Network | normalized-line:6365 |
| B14-089 | TEXT | GitHub / Obsidian Knowledge Sharing | normalized-line:6366 |
| B14-090 | TEXT | Partner Payout Candidate | normalized-line:6367 |
| B14-091 | TEXT | Sector Deep Packs | normalized-line:6368 |

## B15 ロードマップの接続ルール

- classification: `ROADMAP_STRATEGY`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B15-001 | TEXT | 3種類のロードマップを混同しないでください。 | normalized-line:6370 |
| B15-002 | TEXT | PDF上の OS本体ロードマップ | normalized-line:6371 |
| B15-003 | TEXT | Phase 2.5 から Phase 18 | normalized-line:6372 |
| B15-004 | TEXT | 初期MVP、Brain確立、外部提供、エコシステム、自己進化、Marketplace公開 | normalized-line:6373 |
| B15-005 | TEXT | PDF上の 戦略構想ロードマップ | normalized-line:6374 |
| B15-006 | TEXT | Phase 18.5 から Phase 26 | normalized-line:6375 |
| B15-007 | TEXT | Runtime標準化、Company Brain API Public、AI Employee Studio、Block Builder、SDK & Developer Portal、Safety Review、Marketplace、Developer Ecosystem、Open AI Workforce Economy | normalized-line:6376 |
| B15-008 | TEXT | 事業ロードマップ | normalized-line:6377 |
| B15-009 | TEXT | Phase 0 から Phase 20 | normalized-line:6378 |
| B15-010 | TEXT | Salesforce / Oracle / PLUG / Developer Cloud / Marketplace / Enterprise / 369経済圏まで含む | normalized-line:6379 |
| B15-011 | TEXT | 既存docsがある場合は、既存ロードマップを壊さず、以下のように接続してください。 | normalized-line:6380 |
| B15-012 | TEXT | 現行ロードマップ | normalized-line:6381 |
| B15-013 | TEXT | 拡張候補ロードマップ | normalized-line:6382 |
| B15-014 | TEXT | Phase対応表 | normalized-line:6383 |
| B15-015 | TEXT | Candidate扱い | normalized-line:6384 |
| B15-016 | TEXT | 正式採用に必要な承認 | normalized-line:6385 |

## B16 PDFロードマップ Phase 2.5-18

- classification: `ROADMAP_STRATEGY`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B16-001 | TEXT | Phase 2.5: 初期MVP | normalized-line:6387 |
| B16-002 | LABEL | 主目的: | normalized-line:6388 |
| B16-003 | TEXT | 社内でAI社員を実運用する | normalized-line:6389 |
| B16-004 | TEXT | Company Brainの雛形を作る | normalized-line:6390 |
| B16-005 | LABEL | 完了条件: | normalized-line:6391 |
| B16-006 | TEXT | AI社員 5+ | normalized-line:6392 |
| B16-007 | TEXT | 稼働ログ整備 | normalized-line:6393 |
| B16-008 | TEXT | Phase 3: 承認・監査基盤 | normalized-line:6394 |
| B16-009 | LABEL | 主目的: | normalized-line:6395 |
| B16-010 | TEXT | 危険操作の承認と監査ログを実装 | normalized-line:6396 |
| B16-011 | LABEL | 完了条件: | normalized-line:6397 |
| B16-012 | TEXT | 監査ログ 100% | normalized-line:6398 |
| B16-013 | TEXT | 承認フロー稼働 | normalized-line:6399 |
| B16-014 | TEXT | Phase 4: Brain拡充 | normalized-line:6400 |
| B16-015 | LABEL | 主目的: | normalized-line:6401 |
| B16-016 | TEXT | Company Brainの取込対象を20項目まで拡張 | normalized-line:6402 |
| B16-017 | LABEL | 完了条件: | normalized-line:6403 |
| B16-018 | TEXT | 全部門データが流入 | normalized-line:6404 |
| B16-019 | TEXT | Phase 5: AI社員テンプレ化 | normalized-line:6405 |
| B16-020 | LABEL | 主目的: | normalized-line:6406 |
| B16-021 | TEXT | 再利用可能なAI社員テンプレを20+整備 | normalized-line:6407 |
| B16-022 | LABEL | 完了条件: | normalized-line:6408 |
| B16-023 | TEXT | テンプレライブラリ v1公開 | normalized-line:6409 |
| B16-024 | TEXT | Phase 6: 従量課金基盤 | normalized-line:6410 |
| B16-025 | LABEL | 主目的: | normalized-line:6411 |
| B16-026 | TEXT | 消費量計測と課金の全自動化 | normalized-line:6412 |
| B16-027 | LABEL | 完了条件: | normalized-line:6413 |
| B16-028 | TEXT | 請求まで自動連携 | normalized-line:6414 |
| B16-029 | TEXT | Phase 7: Fit-Gap Engine | normalized-line:6415 |
| B16-030 | LABEL | 主目的: | normalized-line:6416 |
| B16-031 | TEXT | 導入前診断を自動化し、標準/カスタム率を提示 | normalized-line:6417 |
| B16-032 | LABEL | 完了条件: | normalized-line:6418 |
| B16-033 | TEXT | 診断レポート自動生成 | normalized-line:6419 |
| B16-034 | TEXT | Phase 8: β外部提供 | normalized-line:6420 |
| B16-035 | LABEL | 主目的: | normalized-line:6421 |
| B16-036 | TEXT | 選定顧客に限定提供し、NPS・実利改善を実測 | normalized-line:6422 |
| B16-037 | LABEL | 完了条件: | normalized-line:6423 |
| B16-038 | TEXT | β顧客 5社 | normalized-line:6424 |
| B16-039 | TEXT | NPS 40+ | normalized-line:6425 |
| B16-040 | TEXT | Phase 9-10: GA / 一般提供 | normalized-line:6426 |
| B16-041 | LABEL | 主目的: | normalized-line:6427 |
| B16-042 | TEXT | 正式提供開始 | normalized-line:6428 |
| B16-043 | TEXT | 顧客支援体制の確立 | normalized-line:6429 |
| B16-044 | LABEL | 完了条件: | normalized-line:6430 |
| B16-045 | TEXT | SLA 99.9% | normalized-line:6431 |
| B16-046 | TEXT | 導入 30社 | normalized-line:6432 |
| B16-047 | TEXT | Phase 11: エコシステム始動 | normalized-line:6433 |
| B16-048 | LABEL | 主目的: | normalized-line:6434 |
| B16-049 | TEXT | パートナー開発SDKと外部AI社員の受入体制 | normalized-line:6435 |
| B16-050 | LABEL | 完了条件: | normalized-line:6436 |
| B16-051 | TEXT | SDK公開 | normalized-line:6437 |
| B16-052 | TEXT | パートナー 10社 | normalized-line:6438 |
| B16-053 | TEXT | Phase 12-13: Studio & Builder | normalized-line:6439 |
| B16-054 | LABEL | 主目的: | normalized-line:6440 |
| B16-055 | TEXT | 現場カスタマイズと独自ツール開発の民主化 | normalized-line:6441 |
| B16-056 | LABEL | 完了条件: | normalized-line:6442 |
| B16-057 | TEXT | 顧客の50%が自製 | normalized-line:6443 |
| B16-058 | TEXT | Phase 14: 自己進化稼働 | normalized-line:6444 |
| B16-059 | LABEL | 主目的: | normalized-line:6445 |
| B16-060 | TEXT | Self-Evolution Pipelineを全稼働し、成果指標を継続改善 | normalized-line:6446 |
| B16-061 | LABEL | 完了条件: | normalized-line:6447 |
| B16-062 | TEXT | 週次で改善リリース | normalized-line:6448 |
| B16-063 | TEXT | Phase 15: 品質・信頼 | normalized-line:6449 |
| B16-064 | LABEL | 主目的: | normalized-line:6450 |
| B16-065 | TEXT | セキュリティ認証 | normalized-line:6451 |
| B16-066 | TEXT | DR演習 | normalized-line:6452 |
| B16-067 | TEXT | 大手対応 | normalized-line:6453 |
| B16-068 | LABEL | 完了条件: | normalized-line:6454 |
| B16-069 | TEXT | SOC2 / ISO27001 取得候補 | normalized-line:6455 |
| B16-070 | TEXT | Phase 16: Marketplace | normalized-line:6456 |
| B16-071 | LABEL | 主目的: | normalized-line:6457 |
| B16-072 | TEXT | サードパーティ流通 | normalized-line:6458 |
| B16-073 | TEXT | 決済 | normalized-line:6459 |
| B16-074 | TEXT | 分配 | normalized-line:6460 |
| B16-075 | TEXT | 審査 | normalized-line:6461 |
| B16-076 | LABEL | 完了条件: | normalized-line:6462 |
| B16-077 | TEXT | 出品 200+ | normalized-line:6463 |
| B16-078 | TEXT | 流通額目標達成 | normalized-line:6464 |
| B16-079 | TEXT | Phase 18: 完成体 | normalized-line:6465 |
| B16-080 | LABEL | 主目的: | normalized-line:6466 |
| B16-081 | TEXT | Apple型経営OSの完成体 | normalized-line:6467 |

## B17 戦略構想ロードマップ Phase 18.5-26

- classification: `ROADMAP_STRATEGY`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B17-001 | TEXT | Phase 18.5: Agent Runtime Standardization | normalized-line:6469 |
| B17-002 | TEXT | Runtimeの標準化 | normalized-line:6470 |
| B17-003 | TEXT | カーネル層の確立 | normalized-line:6471 |
| B17-004 | TEXT | Phase 19: Company Brain API Public | normalized-line:6472 |
| B17-005 | TEXT | 企業知識APIを外部AI会社にも開放 | normalized-line:6473 |
| B17-006 | TEXT | ただし権限・スコープ・監査ログ必須 | normalized-line:6474 |
| B17-007 | TEXT | Phase 20: AI Employee Studio Template | normalized-line:6475 |
| B17-008 | TEXT | テンプレート型スタジオを非エンジニア向けにローンチ | normalized-line:6476 |
| B17-009 | TEXT | Phase 21: Block Builder | normalized-line:6477 |
| B17-010 | TEXT | ノーコード / ローコードのブロック型開発環境 | normalized-line:6478 |
| B17-011 | TEXT | Phase 22: SDK & Developer Portal | normalized-line:6479 |
| B17-012 | TEXT | AI会社・上級開発者向け開発基盤の一般公開 | normalized-line:6480 |
| B17-013 | TEXT | Phase 23: Safety Review & Certification | normalized-line:6481 |
| B17-014 | TEXT | 審査基盤 | normalized-line:6482 |
| B17-015 | TEXT | 認定バッジ制度 | normalized-line:6483 |
| B17-016 | TEXT | Phase 24: 369 Marketplace Launch | normalized-line:6484 |
| B17-017 | TEXT | 流通市場の一般公開 | normalized-line:6485 |
| B17-018 | TEXT | 決済 & 分配運用開始 | normalized-line:6486 |
| B17-019 | TEXT | Phase 25: Developer Ecosystem Expansion | normalized-line:6487 |
| B17-020 | TEXT | パートナー拡大 | normalized-line:6488 |
| B17-021 | TEXT | 国際化 | normalized-line:6489 |
| B17-022 | TEXT | 業界特化パッケージ強化 | normalized-line:6490 |
| B17-023 | TEXT | Phase 26: Open AI Workforce Economy | normalized-line:6491 |
| B17-024 | TEXT | 369経済圏の完成 | normalized-line:6492 |
| B17-025 | TEXT | AI社員経済インフラとして世界標準へ | normalized-line:6493 |
| B17-026 | LABEL | 実行順序: | normalized-line:6494 |
| B17-027 | TEXT | 369本体 | normalized-line:6495 |
| B17-028 | TEXT | Company Brain | normalized-line:6496 |
| B17-029 | TEXT | 従量課金ツール | normalized-line:6497 |
| B17-030 | TEXT | AI補助社員 | normalized-line:6498 |
| B17-031 | TEXT | AI社員 | normalized-line:6499 |
| B17-032 | TEXT | Runtime標準化 | normalized-line:6500 |
| B17-033 | TEXT | AI Employee Studio | normalized-line:6501 |
| B17-034 | TEXT | Marketplace | normalized-line:6502 |
| B17-035 | TEXT | Developer Ecosystem | normalized-line:6503 |

## B18 事業ロードマップ Phase 0-20

- classification: `ROADMAP_STRATEGY`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B18-001 | TEXT | Phase 0: Core OS / 安全基盤 | normalized-line:6505 |
| B18-002 | LABEL | 現在: | normalized-line:6506 |
| B18-003 | TEXT | かなり進行済み候補 | normalized-line:6507 |
| B18-004 | LABEL | 対象: | normalized-line:6508 |
| B18-005 | TEXT | 認証 | normalized-line:6509 |
| B18-006 | TEXT | ユーザー | normalized-line:6510 |
| B18-007 | TEXT | 会社 | normalized-line:6511 |
| B18-008 | TEXT | テナント分離 | normalized-line:6512 |
| B18-009 | TEXT | 権限 | normalized-line:6513 |
| B18-010 | TEXT | Role | normalized-line:6514 |
| B18-011 | TEXT | AuditLog | normalized-line:6515 |
| B18-012 | TEXT | DataAccessLog | normalized-line:6516 |
| B18-013 | TEXT | Approval | normalized-line:6517 |
| B18-014 | TEXT | 機密ラベル | normalized-line:6518 |
| B18-015 | TEXT | Consent | normalized-line:6519 |
| B18-016 | TEXT | Suppression | normalized-line:6520 |
| B18-017 | TEXT | 本番確認記録 | normalized-line:6521 |
| B18-018 | TEXT | CURRENT_STATE管理 | normalized-line:6522 |
| B18-019 | TEXT | テスト / CI | normalized-line:6523 |
| B18-020 | LABEL | 完了条件: | normalized-line:6524 |
| B18-021 | TEXT | tenantId分離 | normalized-line:6525 |
| B18-022 | TEXT | 権限管理 | normalized-line:6526 |
| B18-023 | TEXT | 監査ログ | normalized-line:6527 |
| B18-024 | TEXT | 承認ログ | normalized-line:6528 |
| B18-025 | TEXT | AIロール制限 | normalized-line:6529 |
| B18-026 | TEXT | 危険操作の人間承認 | normalized-line:6530 |
| B18-027 | TEXT | 本番確認の記録文化 | normalized-line:6531 |
| B18-028 | TEXT | 非エンジニアにも現在地が分かる | normalized-line:6532 |
| B18-029 | LABEL | 目安: | normalized-line:6533 |
| B18-030 | TEXT | Day 1-14 | normalized-line:6534 |
| B18-031 | TEXT | Phase 1: Company Brain 基盤 | normalized-line:6535 |
| B18-032 | LABEL | 対象: | normalized-line:6536 |
| B18-033 | TEXT | 会社方針 | normalized-line:6537 |
| B18-034 | TEXT | 商品 / サービスカタログ | normalized-line:6538 |
| B18-035 | TEXT | 営業プレイブック | normalized-line:6539 |
| B18-036 | TEXT | 匿名顧客事例 | normalized-line:6540 |
| B18-037 | TEXT | 社内FAQ | normalized-line:6541 |
| B18-038 | TEXT | 業務マニュアル | normalized-line:6542 |
| B18-039 | TEXT | AI参照ログ | normalized-line:6543 |
| B18-040 | TEXT | 外部送信禁止 | normalized-line:6544 |
| B18-041 | TEXT | 機密ラベル | normalized-line:6545 |
| B18-042 | LABEL | 完了条件: | normalized-line:6546 |
| B18-043 | TEXT | 人間がCompany Brainを書ける | normalized-line:6547 |
| B18-044 | TEXT | AIが安全条件つきで読める | normalized-line:6548 |
| B18-045 | TEXT | AIが勝手に編集できない | normalized-line:6549 |
| B18-046 | TEXT | 外部LLMへ無断送信しない | normalized-line:6550 |
| B18-047 | TEXT | 参照履歴が残る | normalized-line:6551 |
| B18-048 | TEXT | 営業 / 教育 / 提案に使える | normalized-line:6552 |
| B18-049 | LABEL | 目安: | normalized-line:6553 |
| B18-050 | TEXT | Day 7-30 | normalized-line:6554 |
| B18-051 | TEXT | Phase 2: Salesforce Mini / CRM基盤 | normalized-line:6555 |
| B18-052 | LABEL | 最初の完成形: | normalized-line:6556 |
| B18-053 | TEXT | 顧客 | normalized-line:6557 |
| B18-054 | TEXT | 商談 | normalized-line:6558 |
| B18-055 | TEXT | 見積 | normalized-line:6559 |
| B18-056 | TEXT | 契約 | normalized-line:6560 |
| B18-057 | TEXT | 請求候補 | normalized-line:6561 |
| B18-058 | TEXT | 売上 | normalized-line:6562 |
| B18-059 | TEXT | AI分析 | normalized-line:6563 |
| B18-060 | LABEL | 機能候補: | normalized-line:6564 |
| B18-061 | TEXT | 顧客管理 | normalized-line:6565 |
| B18-062 | TEXT | 連絡先管理 | normalized-line:6566 |
| B18-063 | TEXT | リード管理 | normalized-line:6567 |
| B18-064 | TEXT | 商談管理 | normalized-line:6568 |
| B18-065 | TEXT | パイプライン | normalized-line:6569 |
| B18-066 | TEXT | 活動履歴 | normalized-line:6570 |
| B18-067 | TEXT | タスク | normalized-line:6571 |
| B18-068 | TEXT | 見積 | normalized-line:6572 |
| B18-069 | TEXT | 契約 | normalized-line:6573 |
| B18-070 | TEXT | 請求候補 | normalized-line:6574 |
| B18-071 | TEXT | 営業KPI | normalized-line:6575 |
| B18-072 | TEXT | 失注理由 | normalized-line:6576 |
| B18-073 | TEXT | 顧客ランク | normalized-line:6577 |
| B18-074 | TEXT | 次アクション | normalized-line:6578 |
| B18-075 | TEXT | AI営業提案 | normalized-line:6579 |
| B18-076 | TEXT | SFA | normalized-line:6580 |
| B18-077 | TEXT | CPQ | normalized-line:6581 |
| B18-078 | TEXT | Revenue Lifecycle Management | normalized-line:6582 |
| B18-079 | TEXT | Partner管理 | normalized-line:6583 |
| B18-080 | TEXT | Service管理 | normalized-line:6584 |
| B18-081 | TEXT | Contact Center | normalized-line:6585 |
| B18-082 | TEXT | Field Service | normalized-line:6586 |
| B18-083 | TEXT | Marketing Automation | normalized-line:6587 |
| B18-084 | TEXT | CDP / 統合顧客データ | normalized-line:6588 |
| B18-085 | TEXT | Loyalty | normalized-line:6589 |
| B18-086 | TEXT | Commerce | normalized-line:6590 |
| B18-087 | TEXT | Order Management | normalized-line:6591 |
| B18-088 | TEXT | BI / Analytics | normalized-line:6592 |
| B18-089 | LABEL | 目安: | normalized-line:6593 |
| B18-090 | TEXT | Day 15-60: 営業デモ | normalized-line:6594 |
| B18-091 | TEXT | Day 60-120: 中小企業CRMとして販売可能 | normalized-line:6595 |
| B18-092 | TEXT | Day 180-365: Salesforce的広がり | normalized-line:6596 |
| B18-093 | TEXT | Phase 3: AI Growth Engine | normalized-line:6597 |
| B18-094 | LABEL | 位置づけ: | normalized-line:6598 |
| B18-095 | TEXT | Salesforce Layer と Oracle Layer の間 | normalized-line:6599 |
| B18-096 | LABEL | 機能候補: | normalized-line:6600 |
| B18-097 | TEXT | MarketingEvent | normalized-line:6601 |
| B18-098 | TEXT | ConversionEvent | normalized-line:6602 |
| B18-099 | TEXT | RevenueEvent | normalized-line:6603 |
| B18-100 | TEXT | CostEvent | normalized-line:6604 |
| B18-101 | TEXT | Growth Event Ledger | normalized-line:6605 |
| B18-102 | TEXT | 広告費 | normalized-line:6606 |
| B18-103 | TEXT | CV | normalized-line:6607 |
| B18-104 | TEXT | 売上 | normalized-line:6608 |
| B18-105 | TEXT | 粗利 | normalized-line:6609 |
| B18-106 | TEXT | LTV | normalized-line:6610 |
| B18-107 | TEXT | CPA | normalized-line:6611 |
| B18-108 | TEXT | ROAS | normalized-line:6612 |
| B18-109 | TEXT | 粗利ROAS | normalized-line:6613 |
| B18-110 | TEXT | 媒体別成果 | normalized-line:6614 |
| B18-111 | TEXT | キャンペーン別成果 | normalized-line:6615 |
| B18-112 | TEXT | AI Growth Report | normalized-line:6616 |
| B18-113 | TEXT | AI改善提案 | normalized-line:6617 |
| B18-114 | TEXT | Confidence Score | normalized-line:6618 |
| B18-115 | TEXT | Data Sufficiency | normalized-line:6619 |
| B18-116 | TEXT | Recommendation Outcome | normalized-line:6620 |
| B18-117 | LABEL | 完了条件: | normalized-line:6621 |
| B18-118 | TEXT | 数字が見える | normalized-line:6622 |
| B18-119 | TEXT | AIが根拠つきで提案する | normalized-line:6623 |
| B18-120 | TEXT | 成果保証しない | normalized-line:6624 |
| B18-121 | TEXT | データ不足を隠さない | normalized-line:6625 |
| B18-122 | TEXT | 外部実行しない | normalized-line:6626 |
| B18-123 | TEXT | Approvalに接続できる | normalized-line:6627 |
| B18-124 | LABEL | 目安: | normalized-line:6628 |
| B18-125 | TEXT | Day 30-90: MVP | normalized-line:6629 |
| B18-126 | TEXT | Day 90-180: 有料βの中核 | normalized-line:6630 |
| B18-127 | TEXT | Phase 4: Human Certification Gate / AI安全実行 | normalized-line:6631 |
| B18-128 | LABEL | 対象: | normalized-line:6632 |
| B18-129 | TEXT | Approval Inbox | normalized-line:6633 |
| B18-130 | TEXT | Human Certification Gate | normalized-line:6634 |
| B18-131 | TEXT | 二重承認 | normalized-line:6635 |
| B18-132 | TEXT | 差し戻し | normalized-line:6636 |
| B18-133 | TEXT | リスク表示 | normalized-line:6637 |
| B18-134 | TEXT | 承認者表示 | normalized-line:6638 |
| B18-135 | TEXT | 承認理由 | normalized-line:6639 |
| B18-136 | TEXT | AI信頼度 | normalized-line:6640 |
| B18-137 | TEXT | Data Sufficiency | normalized-line:6641 |
| B18-138 | TEXT | Consent Gate | normalized-line:6642 |
| B18-139 | TEXT | Compliance Guard | normalized-line:6643 |
| B18-140 | TEXT | Kill Switch | normalized-line:6644 |
| B18-141 | TEXT | 実行前プレビュー | normalized-line:6645 |
| B18-142 | TEXT | 実行後ログ | normalized-line:6646 |
| B18-143 | TEXT | 補償アクション | normalized-line:6647 |
| B18-144 | LABEL | 承認対象: | normalized-line:6648 |
| B18-145 | TEXT | 営業メール送信 | normalized-line:6649 |
| B18-146 | TEXT | LINE送信 | normalized-line:6650 |
| B18-147 | TEXT | SNS投稿 | normalized-line:6651 |
| B18-148 | TEXT | 広告予算変更 | normalized-line:6652 |
| B18-149 | TEXT | 請求書発行 | normalized-line:6653 |
| B18-150 | TEXT | 請求書送付 | normalized-line:6654 |
| B18-151 | TEXT | 入金消込 | normalized-line:6655 |
| B18-152 | TEXT | 会計仕訳 | normalized-line:6656 |
| B18-153 | TEXT | 値引き | normalized-line:6657 |
| B18-154 | TEXT | 契約変更 | normalized-line:6658 |
| B18-155 | TEXT | 顧客事例公開 | normalized-line:6659 |
| B18-156 | TEXT | 外部AI送信 | normalized-line:6660 |
| B18-157 | TEXT | データエクスポート | normalized-line:6661 |
| B18-158 | TEXT | AI社員による外部実行 | normalized-line:6662 |
| B18-159 | LABEL | 目安: | normalized-line:6663 |
| B18-160 | TEXT | Day 60-120: 初期版 | normalized-line:6664 |
| B18-161 | TEXT | Day 120-240: 本格版 | normalized-line:6665 |
| B18-162 | TEXT | Phase 5: Oracle Mini / ERP基盤 | normalized-line:6666 |
| B18-163 | LABEL | 財務 / 会計: | normalized-line:6667 |
| B18-164 | TEXT | 請求 | normalized-line:6668 |
| B18-165 | TEXT | 入金 | normalized-line:6669 |
| B18-166 | TEXT | 売掛 | normalized-line:6670 |
| B18-167 | TEXT | 買掛 | normalized-line:6671 |
| B18-168 | TEXT | 支払 | normalized-line:6672 |
| B18-169 | TEXT | 経費 | normalized-line:6673 |
| B18-170 | TEXT | 資産 | normalized-line:6674 |
| B18-171 | TEXT | 売上認識 | normalized-line:6675 |
| B18-172 | TEXT | 粗利 | normalized-line:6676 |
| B18-173 | TEXT | 資金繰り | normalized-line:6677 |
| B18-174 | TEXT | 仕訳候補 | normalized-line:6678 |
| B18-175 | TEXT | 会計連携 | normalized-line:6679 |
| B18-176 | TEXT | 月次締め | normalized-line:6680 |
| B18-177 | TEXT | 税区分候補 | normalized-line:6681 |
| B18-178 | LABEL | 調達 / 購買: | normalized-line:6682 |
| B18-179 | TEXT | 仕入先 | normalized-line:6683 |
| B18-180 | TEXT | 発注 | normalized-line:6684 |
| B18-181 | TEXT | 購買申請 | normalized-line:6685 |
| B18-182 | TEXT | 承認購買 | normalized-line:6686 |
| B18-183 | TEXT | 支払予定 | normalized-line:6687 |
| B18-184 | TEXT | 調達契約 | normalized-line:6688 |
| B18-185 | TEXT | 価格比較 | normalized-line:6689 |
| B18-186 | TEXT | 法人購買ポリシー | normalized-line:6690 |
| B18-187 | LABEL | プロジェクト管理: | normalized-line:6691 |
| B18-188 | TEXT | 案件原価 | normalized-line:6692 |
| B18-189 | TEXT | 工数 | normalized-line:6693 |
| B18-190 | TEXT | 外注費 | normalized-line:6694 |
| B18-191 | TEXT | 請求進捗 | normalized-line:6695 |
| B18-192 | TEXT | 利益率 | normalized-line:6696 |
| B18-193 | TEXT | プロジェクト別採算 | normalized-line:6697 |
| B18-194 | LABEL | EPM / 経営管理: | normalized-line:6698 |
| B18-195 | TEXT | 予算 | normalized-line:6699 |
| B18-196 | TEXT | 予実管理 | normalized-line:6700 |
| B18-197 | TEXT | 着地予測 | normalized-line:6701 |
| B18-198 | TEXT | 利益計画 | normalized-line:6702 |
| B18-199 | TEXT | 資金計画 | normalized-line:6703 |
| B18-200 | TEXT | 部門別PL | normalized-line:6704 |
| B18-201 | TEXT | KPI | normalized-line:6705 |
| B18-202 | TEXT | 経営会議レポート | normalized-line:6706 |
| B18-203 | LABEL | GRC / 内部統制: | normalized-line:6707 |
| B18-204 | TEXT | 権限分掌 | normalized-line:6708 |
| B18-205 | TEXT | 職務分離 | normalized-line:6709 |
| B18-206 | TEXT | 承認ルール | normalized-line:6710 |
| B18-207 | TEXT | 監査証跡 | normalized-line:6711 |
| B18-208 | TEXT | 不正検知 | normalized-line:6712 |
| B18-209 | TEXT | 異常取引検知 | normalized-line:6713 |
| B18-210 | TEXT | SOX / 内部統制対応の土台 | normalized-line:6714 |
| B18-211 | LABEL | 目安: | normalized-line:6715 |
| B18-212 | TEXT | Day 90-210: Oracle Mini | normalized-line:6716 |
| B18-213 | TEXT | Day 210-450: 中小企業ERPとして成立 | normalized-line:6717 |
| B18-214 | TEXT | Day 450以降: 大企業向けERP/GRC強化 | normalized-line:6718 |
| B18-215 | TEXT | Phase 6: PLUG型 Commerce / Affiliate / 購買エンジン | normalized-line:6719 |
| B18-216 | TEXT | これは単なるアフィリエイトではなく、導入企業の従業員の日常購買と法人購買に入り込む導線です。 | normalized-line:6720 |
| B18-217 | LABEL | B2C向け: | normalized-line:6721 |
| B18-218 | TEXT | ブラウザ拡張 | normalized-line:6722 |
| B18-219 | TEXT | 商品ページ認識 | normalized-line:6723 |
| B18-220 | TEXT | JAN / ASIN / 型番 / 商品名抽出 | normalized-line:6724 |
| B18-221 | TEXT | 複数ECサイト横断価格比較 | normalized-line:6725 |
| B18-222 | TEXT | 送料込み価格 | normalized-line:6726 |
| B18-223 | TEXT | ポイント込み実質価格 | normalized-line:6727 |
| B18-224 | TEXT | クーポン込み価格 | normalized-line:6728 |
| B18-225 | TEXT | 納期比較 | normalized-line:6729 |
| B18-226 | TEXT | 在庫比較 | normalized-line:6730 |
| B18-227 | TEXT | 価格履歴 | normalized-line:6731 |
| B18-228 | TEXT | 値下げ通知 | normalized-line:6732 |
| B18-229 | TEXT | 最安候補表示 | normalized-line:6733 |
| B18-230 | TEXT | 購入リンク | normalized-line:6734 |
| B18-231 | TEXT | アフィリエイト計測 | normalized-line:6735 |
| B18-232 | TEXT | ユーザー還元 | normalized-line:6736 |
| B18-233 | LABEL | B2B / 法人購買向け: | normalized-line:6737 |
| B18-234 | TEXT | 会社指定ショップ | normalized-line:6738 |
| B18-235 | TEXT | 購買ポリシー | normalized-line:6739 |
| B18-236 | TEXT | 承認購買 | normalized-line:6740 |
| B18-237 | TEXT | 部署別予算 | normalized-line:6741 |
| B18-238 | TEXT | 勘定科目候補 | normalized-line:6742 |
| B18-239 | TEXT | 経費精算連携 | normalized-line:6743 |
| B18-240 | TEXT | 請求書払い対応 | normalized-line:6744 |
| B18-241 | TEXT | 法人価格比較 | normalized-line:6745 |
| B18-242 | TEXT | 購買履歴 | normalized-line:6746 |
| B18-243 | TEXT | 購買コスト削減レポート | normalized-line:6747 |
| B18-244 | TEXT | 仕入先評価 | normalized-line:6748 |
| B18-245 | TEXT | 不正購買検知 | normalized-line:6749 |
| B18-246 | TEXT | 購買申請 → 承認 → 発注 → 請求 → 会計候補 | normalized-line:6750 |
| B18-247 | LABEL | 重要設計ルール: | normalized-line:6751 |
| B18-248 | TEXT | アフィリエイトリンク挿入は明示する | normalized-line:6752 |
| B18-249 | TEXT | ユーザーに利益がある時だけ表示する | normalized-line:6753 |
| B18-250 | TEXT | 元リンクを無断で奪う設計にしない | normalized-line:6754 |
| B18-251 | TEXT | どのリンクで誰に手数料が入るか透明化する | normalized-line:6755 |
| B18-252 | TEXT | 企業管理者が利用範囲を制御できる | normalized-line:6756 |
| B18-253 | TEXT | 購買履歴は個人情報・行動データとして慎重に扱う | normalized-line:6757 |
| B18-254 | TEXT | Chrome拡張の権限は最小化する | normalized-line:6758 |
| B18-255 | TEXT | 拡張機能のセキュリティ審査を必須にする | normalized-line:6759 |
| B18-256 | LABEL | 目安: | normalized-line:6760 |
| B18-257 | TEXT | Day 90-150: PLUG型ミニ版技術検証 | normalized-line:6761 |
| B18-258 | TEXT | Day 150-240: 法人購買版β | normalized-line:6762 |
| B18-259 | TEXT | Day 240-365: 従業員配布版 | normalized-line:6763 |
| B18-260 | TEXT | Day 365以降: 本格アフィリエイト / 購買ネットワーク | normalized-line:6764 |
| B18-261 | TEXT | Phase 7: Commerce / EC / Order Management | normalized-line:6765 |
| B18-262 | LABEL | 機能候補: | normalized-line:6766 |
| B18-263 | TEXT | 商品管理 | normalized-line:6767 |
| B18-264 | TEXT | 価格表 | normalized-line:6768 |
| B18-265 | TEXT | 見積 | normalized-line:6769 |
| B18-266 | TEXT | 注文 | normalized-line:6770 |
| B18-267 | TEXT | 受注 | normalized-line:6771 |
| B18-268 | TEXT | 決済候補 | normalized-line:6772 |
| B18-269 | TEXT | 請求 | normalized-line:6773 |
| B18-270 | TEXT | 発送 | normalized-line:6774 |
| B18-271 | TEXT | 返品 | normalized-line:6775 |
| B18-272 | TEXT | 交換 | normalized-line:6776 |
| B18-273 | TEXT | 在庫 | normalized-line:6777 |
| B18-274 | TEXT | ECページ | normalized-line:6778 |
| B18-275 | TEXT | B2B注文 | normalized-line:6779 |
| B18-276 | TEXT | 法人価格 | normalized-line:6780 |
| B18-277 | TEXT | クーポン | normalized-line:6781 |
| B18-278 | TEXT | キャンペーン | normalized-line:6782 |
| B18-279 | TEXT | 顧客別価格 | normalized-line:6783 |
| B18-280 | TEXT | ポイント / ロイヤルティ | normalized-line:6784 |
| B18-281 | TEXT | POS連携 | normalized-line:6785 |
| B18-282 | TEXT | PLUG連携 | normalized-line:6786 |
| B18-283 | LABEL | 目安: | normalized-line:6787 |
| B18-284 | TEXT | Day 120-240: 簡易版 | normalized-line:6788 |
| B18-285 | TEXT | Day 240-450: EC / Order Managementとして成立 | normalized-line:6789 |
| B18-286 | TEXT | Phase 8: Developer Cloud / 開発環境 | normalized-line:6790 |
| B18-287 | LABEL | 目的: | normalized-line:6791 |
| B18-288 | TEXT | 開発者が369上で作る方が儲かり、速く、安全で、顧客に届く状態を作る | normalized-line:6792 |
| B18-289 | LABEL | 開発者ポータル: | normalized-line:6793 |
| B18-290 | TEXT | 開発者登録 | normalized-line:6794 |
| B18-291 | TEXT | Organization | normalized-line:6795 |
| B18-292 | TEXT | 開発者プロフィール | normalized-line:6796 |
| B18-293 | TEXT | 収益管理 | normalized-line:6797 |
| B18-294 | TEXT | アプリ一覧 | normalized-line:6798 |
| B18-295 | TEXT | AI社員一覧 | normalized-line:6799 |
| B18-296 | TEXT | 審査状況 | normalized-line:6800 |
| B18-297 | TEXT | 利用状況 | normalized-line:6801 |
| B18-298 | TEXT | エラー状況 | normalized-line:6802 |
| B18-299 | TEXT | 売上状況 | normalized-line:6803 |
| B18-300 | LABEL | AI社員開発キット: | normalized-line:6804 |
| B18-301 | TEXT | Agent Template | normalized-line:6805 |
| B18-302 | TEXT | Plugin Template | normalized-line:6806 |
| B18-303 | TEXT | Skill Template | normalized-line:6807 |
| B18-304 | TEXT | Workflow Template | normalized-line:6808 |
| B18-305 | TEXT | Prompt Template | normalized-line:6809 |
| B18-306 | TEXT | Tool Connector Template | normalized-line:6810 |
| B18-307 | TEXT | Data Access Template | normalized-line:6811 |
| B18-308 | TEXT | Approval Template | normalized-line:6812 |
| B18-309 | TEXT | Billing Template | normalized-line:6813 |
| B18-310 | LABEL | SDK / CLI: | normalized-line:6814 |
| B18-311 | TEXT | 369 create agent | normalized-line:6815 |
| B18-312 | TEXT | 369 dev | normalized-line:6816 |
| B18-313 | TEXT | 369 test | normalized-line:6817 |
| B18-314 | TEXT | 369 validate | normalized-line:6818 |
| B18-315 | TEXT | 369 deploy | normalized-line:6819 |
| B18-316 | TEXT | 369 publish | normalized-line:6820 |
| B18-317 | TEXT | 369 logs | normalized-line:6821 |
| B18-318 | TEXT | 369 billing | normalized-line:6822 |
| B18-319 | TEXT | 369 rollback | normalized-line:6823 |
| B18-320 | LABEL | Agent Manifest: | normalized-line:6824 |
| B18-321 | TEXT | 名前 | normalized-line:6825 |
| B18-322 | TEXT | 説明 | normalized-line:6826 |
| B18-323 | TEXT | 対象業務 | normalized-line:6827 |
| B18-324 | TEXT | 必要権限 | normalized-line:6828 |
| B18-325 | TEXT | 読めるデータ | normalized-line:6829 |
| B18-326 | TEXT | 書けるデータ | normalized-line:6830 |
| B18-327 | TEXT | 外部送信有無 | normalized-line:6831 |
| B18-328 | TEXT | Human Certification必要条件 | normalized-line:6832 |
| B18-329 | TEXT | 課金単位 | normalized-line:6833 |
| B18-330 | TEXT | 実行ログ | normalized-line:6834 |
| B18-331 | TEXT | 失敗時処理 | normalized-line:6835 |
| B18-332 | TEXT | 禁止操作 | normalized-line:6836 |
| B18-333 | TEXT | 対応業種 | normalized-line:6837 |
| B18-334 | TEXT | バージョン | normalized-line:6838 |
| B18-335 | TEXT | 開発者情報 | normalized-line:6839 |
| B18-336 | LABEL | Sandbox: | normalized-line:6840 |
| B18-337 | TEXT | 架空データ | normalized-line:6841 |
| B18-338 | TEXT | テスト用テナント | normalized-line:6842 |
| B18-339 | TEXT | モック外部API | normalized-line:6843 |
| B18-340 | TEXT | 危険操作ブロック | normalized-line:6844 |
| B18-341 | TEXT | 請求 / 会計 / 外部送信の疑似実行 | normalized-line:6845 |
| B18-342 | TEXT | 審査前テスト | normalized-line:6846 |
| B18-343 | LABEL | Certification: | normalized-line:6847 |
| B18-344 | TEXT | セキュリティ審査 | normalized-line:6848 |
| B18-345 | TEXT | 個人情報審査 | normalized-line:6849 |
| B18-346 | TEXT | 外部送信審査 | normalized-line:6850 |
| B18-347 | TEXT | 課金審査 | normalized-line:6851 |
| B18-348 | TEXT | AI安全性審査 | normalized-line:6852 |
| B18-349 | TEXT | Human Certification対応審査 | normalized-line:6853 |
| B18-350 | TEXT | 業界別審査 | normalized-line:6854 |
| B18-351 | TEXT | 更新審査 | normalized-line:6855 |
| B18-352 | LABEL | 目安: | normalized-line:6856 |
| B18-353 | TEXT | Day 120-210: Developer Cloud Alpha | normalized-line:6857 |
| B18-354 | TEXT | Day 210-300: 外部開発者β | normalized-line:6858 |
| B18-355 | TEXT | Day 300-450: Marketplace連携 | normalized-line:6859 |
| B18-356 | TEXT | Day 450以降: 開発者経済圏 | normalized-line:6860 |
| B18-357 | TEXT | Phase 9: AI社員 Marketplace | normalized-line:6861 |
| B18-358 | LABEL | 機能候補: | normalized-line:6862 |
| B18-359 | TEXT | AI社員一覧 | normalized-line:6863 |
| B18-360 | TEXT | 業種別カテゴリ | normalized-line:6864 |
| B18-361 | TEXT | 職種別カテゴリ | normalized-line:6865 |
| B18-362 | TEXT | 価格 | normalized-line:6866 |
| B18-363 | TEXT | 評価 | normalized-line:6867 |
| B18-364 | TEXT | 導入数 | normalized-line:6868 |
| B18-365 | TEXT | 権限表示 | normalized-line:6869 |
| B18-366 | TEXT | データ利用範囲表示 | normalized-line:6870 |
| B18-367 | TEXT | 外部送信有無 | normalized-line:6871 |
| B18-368 | TEXT | Human Certification対応 | normalized-line:6872 |
| B18-369 | TEXT | 監査対応 | normalized-line:6873 |
| B18-370 | TEXT | 開発者プロフィール | normalized-line:6874 |
| B18-371 | TEXT | 無料トライアル | normalized-line:6875 |
| B18-372 | TEXT | 有料導入 | normalized-line:6876 |
| B18-373 | TEXT | 従量課金 | normalized-line:6877 |
| B18-374 | TEXT | 収益分配 | normalized-line:6878 |
| B18-375 | TEXT | 返金ルール | normalized-line:6879 |
| B18-376 | TEXT | バージョン管理 | normalized-line:6880 |
| B18-377 | TEXT | 更新通知 | normalized-line:6881 |
| B18-378 | TEXT | 企業管理者による承認導入 | normalized-line:6882 |
| B18-379 | LABEL | AI社員例: | normalized-line:6883 |
| B18-380 | TEXT | 営業AI社員 | normalized-line:6884 |
| B18-381 | TEXT | 問い合わせ対応AI社員 | normalized-line:6885 |
| B18-382 | TEXT | 広告改善AI社員 | normalized-line:6886 |
| B18-383 | TEXT | 請求チェックAI社員 | normalized-line:6887 |
| B18-384 | TEXT | 入金確認AI社員 | normalized-line:6888 |
| B18-385 | TEXT | 経費確認AI社員 | normalized-line:6889 |
| B18-386 | TEXT | 採用スクリーニングAI社員 | normalized-line:6890 |
| B18-387 | TEXT | 研修AI社員 | normalized-line:6891 |
| B18-388 | TEXT | 在庫最適化AI社員 | normalized-line:6892 |
| B18-389 | TEXT | 購買最適化AI社員 | normalized-line:6893 |
| B18-390 | TEXT | 法務チェックAI社員 | normalized-line:6894 |
| B18-391 | TEXT | コンプライアンスAI社員 | normalized-line:6895 |
| B18-392 | TEXT | EC改善AI社員 | normalized-line:6896 |
| B18-393 | TEXT | SNS下書きAI社員 | normalized-line:6897 |
| B18-394 | TEXT | カスタマーサクセスAI社員 | normalized-line:6898 |
| B18-395 | TEXT | 経営会議資料作成AI社員 | normalized-line:6899 |
| B18-396 | LABEL | 完了条件: | normalized-line:6900 |
| B18-397 | TEXT | 外部開発者がAI社員を作れる | normalized-line:6901 |
| B18-398 | TEXT | 審査できる | normalized-line:6902 |
| B18-399 | TEXT | 配布できる | normalized-line:6903 |
| B18-400 | TEXT | 課金できる | normalized-line:6904 |
| B18-401 | TEXT | 利用ログが取れる | normalized-line:6905 |
| B18-402 | TEXT | 企業管理者が導入可否を管理できる | normalized-line:6906 |
| B18-403 | TEXT | 危険操作はHuman Certification Gateに接続される | normalized-line:6907 |
| B18-404 | LABEL | 目安: | normalized-line:6908 |
| B18-405 | TEXT | Day 210-365: Marketplace β | normalized-line:6909 |
| B18-406 | TEXT | Day 365-540: 本格流通 | normalized-line:6910 |
| B18-407 | TEXT | Day 540以降: 経済圏化 | normalized-line:6911 |
| B18-408 | TEXT | Phase 10: Oracle SCM / 在庫 / 調達 / サプライチェーン | normalized-line:6912 |
| B18-409 | LABEL | 機能候補: | normalized-line:6913 |
| B18-410 | TEXT | 商品 / 資産管理 | normalized-line:6914 |
| B18-411 | TEXT | 在庫 | normalized-line:6915 |
| B18-412 | TEXT | 入庫 | normalized-line:6916 |
| B18-413 | TEXT | 出庫 | normalized-line:6917 |
| B18-414 | TEXT | 棚卸 | normalized-line:6918 |
| B18-415 | TEXT | 仕入先 | normalized-line:6919 |
| B18-416 | TEXT | 発注 | normalized-line:6920 |
| B18-417 | TEXT | 購買契約 | normalized-line:6921 |
| B18-418 | TEXT | 物流タスク | normalized-line:6922 |
| B18-419 | TEXT | 配送 | normalized-line:6923 |
| B18-420 | TEXT | 返品 | normalized-line:6924 |
| B18-421 | TEXT | 予約 | normalized-line:6925 |
| B18-422 | TEXT | リース | normalized-line:6926 |
| B18-423 | TEXT | メンテナンス | normalized-line:6927 |
| B18-424 | TEXT | 原価 | normalized-line:6928 |
| B18-425 | TEXT | 粗利 | normalized-line:6929 |
| B18-426 | TEXT | 需要予測 | normalized-line:6930 |
| B18-427 | TEXT | 発注候補 | normalized-line:6931 |
| B18-428 | TEXT | 在庫不足検知 | normalized-line:6932 |
| B18-429 | LABEL | PLUG接続: | normalized-line:6933 |
| B18-430 | TEXT | 社内在庫で足りない → PLUG型購買エンジンが最安/最適購入先を提案 → 購買申請 → 承認 → 発注 → 請求候補 → 会計候補 | normalized-line:6934 |
| B18-431 | LABEL | 目安: | normalized-line:6935 |
| B18-432 | TEXT | Day 180-360: 業種特化版 | normalized-line:6936 |
| B18-433 | TEXT | Day 360以降: SCM / 調達基盤 | normalized-line:6937 |
| B18-434 | TEXT | Phase 11: HCM / 採用 / 教育 / 人事 | normalized-line:6938 |
| B18-435 | LABEL | 機能候補: | normalized-line:6939 |
| B18-436 | TEXT | 求人 | normalized-line:6940 |
| B18-437 | TEXT | 応募者 | normalized-line:6941 |
| B18-438 | TEXT | 面接 | normalized-line:6942 |
| B18-439 | TEXT | 評価 | normalized-line:6943 |
| B18-440 | TEXT | 内定 | normalized-line:6944 |
| B18-441 | TEXT | 入社手続き | normalized-line:6945 |
| B18-442 | TEXT | 研修 | normalized-line:6946 |
| B18-443 | TEXT | マニュアル | normalized-line:6947 |
| B18-444 | TEXT | スキル | normalized-line:6948 |
| B18-445 | TEXT | シフト | normalized-line:6949 |
| B18-446 | TEXT | 勤怠 | normalized-line:6950 |
| B18-447 | TEXT | 休暇 | normalized-line:6951 |
| B18-448 | TEXT | 給与候補 | normalized-line:6952 |
| B18-449 | TEXT | 人件費 | normalized-line:6953 |
| B18-450 | TEXT | 1on1 | normalized-line:6954 |
| B18-451 | TEXT | 離職リスク | normalized-line:6955 |
| B18-452 | TEXT | AI教育担当 | normalized-line:6956 |
| B18-453 | LABEL | 注意: | normalized-line:6957 |
| B18-454 | TEXT | 初期は採用管理・教育・マニュアル・スキル管理に絞る | normalized-line:6958 |
| B18-455 | TEXT | 給与・評価・解雇・労務判断は後半 | normalized-line:6959 |
| B18-456 | TEXT | AI単独で採用合否、給与、評価を確定しない | normalized-line:6960 |
| B18-457 | LABEL | 目安: | normalized-line:6961 |
| B18-458 | TEXT | Day 210-360: 採用 / 教育MVP | normalized-line:6962 |
| B18-459 | TEXT | Day 360-540: HCM基盤 | normalized-line:6963 |
| B18-460 | TEXT | Phase 12: Data Cloud / BI / Analytics | normalized-line:6964 |
| B18-461 | LABEL | 機能候補: | normalized-line:6965 |
| B18-462 | TEXT | 統合データモデル | normalized-line:6966 |
| B18-463 | TEXT | 顧客360 | normalized-line:6967 |
| B18-464 | TEXT | 会社360 | normalized-line:6968 |
| B18-465 | TEXT | 従業員360 | normalized-line:6969 |
| B18-466 | TEXT | 商品360 | normalized-line:6970 |
| B18-467 | TEXT | 案件360 | normalized-line:6971 |
| B18-468 | TEXT | 購買360 | normalized-line:6972 |
| B18-469 | TEXT | 売上360 | normalized-line:6973 |
| B18-470 | TEXT | AI利用ログ | normalized-line:6974 |
| B18-471 | TEXT | Data Quality | normalized-line:6975 |
| B18-472 | TEXT | Data Freshness | normalized-line:6976 |
| B18-473 | TEXT | 指標定義 | normalized-line:6977 |
| B18-474 | TEXT | KPI辞書 | normalized-line:6978 |
| B18-475 | TEXT | BIダッシュボード | normalized-line:6979 |
| B18-476 | TEXT | 経営会議レポート | normalized-line:6980 |
| B18-477 | TEXT | 部門別ダッシュボード | normalized-line:6981 |
| B18-478 | TEXT | AI分析 | normalized-line:6982 |
| B18-479 | TEXT | 予測 | normalized-line:6983 |
| B18-480 | LABEL | 完了条件: | normalized-line:6984 |
| B18-481 | TEXT | どのデータが正本か分かる | normalized-line:6985 |
| B18-482 | TEXT | KPI定義が統一されている | normalized-line:6986 |
| B18-483 | TEXT | AIの根拠表示ができる | normalized-line:6987 |
| B18-484 | LABEL | 目安: | normalized-line:6988 |
| B18-485 | TEXT | Day 120-300: 初期BI | normalized-line:6989 |
| B18-486 | TEXT | Day 300-540: Data Cloud化 | normalized-line:6990 |
| B18-487 | TEXT | Phase 13: Service Cloud / Contact Center / Customer Success | normalized-line:6991 |
| B18-488 | LABEL | 機能候補: | normalized-line:6992 |
| B18-489 | TEXT | 問い合わせ管理 | normalized-line:6993 |
| B18-490 | TEXT | チケット | normalized-line:6994 |
| B18-491 | TEXT | SLA | normalized-line:6995 |
| B18-492 | TEXT | FAQ | normalized-line:6996 |
| B18-493 | TEXT | ナレッジ | normalized-line:6997 |
| B18-494 | TEXT | CSタスク | normalized-line:6998 |
| B18-495 | TEXT | 顧客満足度 | normalized-line:6999 |
| B18-496 | TEXT | NPS | normalized-line:7000 |
| B18-497 | TEXT | CSAT | normalized-line:7001 |
| B18-498 | TEXT | 解約予兆 | normalized-line:7002 |
| B18-499 | TEXT | 契約更新 | normalized-line:7003 |
| B18-500 | TEXT | サポートAI | normalized-line:7004 |
| B18-501 | TEXT | 音声 / チャット / メール統合 | normalized-line:7005 |
| B18-502 | TEXT | 対応品質管理 | normalized-line:7006 |
| B18-503 | TEXT | カスタマーオンボーディング | normalized-line:7007 |
| B18-504 | TEXT | Time to Value | normalized-line:7008 |
| B18-505 | LABEL | 目安: | normalized-line:7009 |
| B18-506 | TEXT | Day 150-300: Service MVP | normalized-line:7010 |
| B18-507 | TEXT | Day 300-540: CS / Contact Center基盤 | normalized-line:7011 |
| B18-508 | TEXT | Phase 14: Marketing Cloud / 広告代理店 / 共有ダッシュボード | normalized-line:7012 |
| B18-509 | LABEL | 機能候補: | normalized-line:7013 |
| B18-510 | TEXT | 広告アカウント連携 | normalized-line:7014 |
| B18-511 | TEXT | 広告費 | normalized-line:7015 |
| B18-512 | TEXT | CV | normalized-line:7016 |
| B18-513 | TEXT | CPA | normalized-line:7017 |
| B18-514 | TEXT | ROAS | normalized-line:7018 |
| B18-515 | TEXT | 粗利ROAS | normalized-line:7019 |
| B18-516 | TEXT | LP別成果 | normalized-line:7020 |
| B18-517 | TEXT | キャンペーン別成果 | normalized-line:7021 |
| B18-518 | TEXT | 代理店共有ダッシュボード | normalized-line:7022 |
| B18-519 | TEXT | AI改善案 | normalized-line:7023 |
| B18-520 | TEXT | PR / SEO Growth | normalized-line:7024 |
| B18-521 | TEXT | SNS下書き | normalized-line:7025 |
| B18-522 | TEXT | メルマガ下書き | normalized-line:7026 |
| B18-523 | TEXT | 顧客セグメント | normalized-line:7027 |
| B18-524 | TEXT | MA | normalized-line:7028 |
| B18-525 | TEXT | 導入事例 | normalized-line:7029 |
| B18-526 | LABEL | 注意: | normalized-line:7030 |
| B18-527 | TEXT | AIが広告予算を単独変更しない | normalized-line:7031 |
| B18-528 | TEXT | PR配信やSEO公開は人間承認 | normalized-line:7032 |
| B18-529 | LABEL | 目安: | normalized-line:7033 |
| B18-530 | TEXT | Day 90-240: 広告 / マーケMVP | normalized-line:7034 |
| B18-531 | TEXT | Day 240-450: Marketing Cloud的拡張 | normalized-line:7035 |
| B18-532 | TEXT | Phase 15: Industry Cloud / 業界別OS | normalized-line:7036 |
| B18-533 | LABEL | 候補業界: | normalized-line:7037 |
| B18-534 | TEXT | 建設 | normalized-line:7038 |
| B18-535 | TEXT | 医療 | normalized-line:7039 |
| B18-536 | TEXT | 美容 | normalized-line:7040 |
| B18-537 | TEXT | 飲食 | normalized-line:7041 |
| B18-538 | TEXT | 士業 | normalized-line:7042 |
| B18-539 | TEXT | EC | normalized-line:7043 |
| B18-540 | TEXT | 製造 | normalized-line:7044 |
| B18-541 | TEXT | 物流 | normalized-line:7045 |
| B18-542 | TEXT | 教育 | normalized-line:7046 |
| B18-543 | TEXT | 不動産 | normalized-line:7047 |
| B18-544 | TEXT | 介護 | normalized-line:7048 |
| B18-545 | TEXT | フランチャイズ | normalized-line:7049 |
| B18-546 | LABEL | 機能候補: | normalized-line:7050 |
| B18-547 | TEXT | 業界テンプレート | normalized-line:7051 |
| B18-548 | TEXT | 業界AI社員 | normalized-line:7052 |
| B18-549 | TEXT | 業界KPI | normalized-line:7053 |
| B18-550 | TEXT | 業界フォーム | normalized-line:7054 |
| B18-551 | TEXT | 業界ワークフロー | normalized-line:7055 |
| B18-552 | TEXT | 業界リスク | normalized-line:7056 |
| B18-553 | TEXT | 業界PR / SEOテンプレート | normalized-line:7057 |
| B18-554 | TEXT | 業界Business Networkカテゴリ | normalized-line:7058 |
| B18-555 | LABEL | 目安: | normalized-line:7059 |
| B18-556 | TEXT | Day 180-360: 3業界 | normalized-line:7060 |
| B18-557 | TEXT | Day 360-540: 10業界 | normalized-line:7061 |
| B18-558 | TEXT | Day 540以降: Marketplaceで拡張 | normalized-line:7062 |
| B18-559 | TEXT | Phase 16: 従業員配布基盤 | normalized-line:7063 |
| B18-560 | LABEL | 機能候補: | normalized-line:7064 |
| B18-561 | TEXT | 369 Employee App | normalized-line:7065 |
| B18-562 | TEXT | 今日のタスク | normalized-line:7066 |
| B18-563 | TEXT | 申請 | normalized-line:7067 |
| B18-564 | TEXT | 承認 | normalized-line:7068 |
| B18-565 | TEXT | 勤怠候補 | normalized-line:7069 |
| B18-566 | TEXT | FAQ | normalized-line:7070 |
| B18-567 | TEXT | AI相談 | normalized-line:7071 |
| B18-568 | TEXT | 社内ナレッジ | normalized-line:7072 |
| B18-569 | TEXT | 福利厚生 | normalized-line:7073 |
| B18-570 | TEXT | キャッシュバック | normalized-line:7074 |
| B18-571 | TEXT | 価格比較 | normalized-line:7075 |
| B18-572 | TEXT | クーポン | normalized-line:7076 |
| B18-573 | TEXT | 通知 | normalized-line:7077 |
| B18-574 | TEXT | 家族利用候補 | normalized-line:7078 |
| B18-575 | TEXT | 個人モード / 会社モード | normalized-line:7079 |
| B18-576 | LABEL | 重要: | normalized-line:7080 |
| B18-577 | TEXT | 会社購買と個人購買を分離する | normalized-line:7081 |
| B18-578 | TEXT | 従業員個人の私的購買履歴を会社が見られない | normalized-line:7082 |
| B18-579 | TEXT | 会社への表示は匿名集計レベルに留める | normalized-line:7083 |
| B18-580 | LABEL | 目安: | normalized-line:7084 |
| B18-581 | TEXT | Day 180-300: 従業員向けMVP | normalized-line:7085 |
| B18-582 | TEXT | Day 300-450: ブラウザ拡張 / 購買配布 | normalized-line:7086 |
| B18-583 | TEXT | Day 450以降: 企業全体に展開 | normalized-line:7087 |
| B18-584 | TEXT | Phase 17: External API / Integration Hub | normalized-line:7088 |
| B18-585 | LABEL | 機能候補: | normalized-line:7089 |
| B18-586 | TEXT | Public API | normalized-line:7090 |
| B18-587 | TEXT | Partner API | normalized-line:7091 |
| B18-588 | TEXT | Webhook | normalized-line:7092 |
| B18-589 | TEXT | Connector | normalized-line:7093 |
| B18-590 | TEXT | OAuth | normalized-line:7094 |
| B18-591 | TEXT | API key | normalized-line:7095 |
| B18-592 | TEXT | Event Bus | normalized-line:7096 |
| B18-593 | TEXT | Rate Limit | normalized-line:7097 |
| B18-594 | TEXT | API versioning | normalized-line:7098 |
| B18-595 | TEXT | Webhook retry | normalized-line:7099 |
| B18-596 | TEXT | Integration logs | normalized-line:7100 |
| B18-597 | TEXT | External App registry | normalized-line:7101 |
| B18-598 | TEXT | MCP候補 | normalized-line:7102 |
| B18-599 | TEXT | SDK | normalized-line:7103 |
| B18-600 | LABEL | 目安: | normalized-line:7104 |
| B18-601 | TEXT | Day 240-450: Partner API | normalized-line:7105 |
| B18-602 | TEXT | Day 450-720: Public API / Integration Hub | normalized-line:7106 |
| B18-603 | TEXT | Phase 18: Billing / Metering / Revenue Share | normalized-line:7107 |
| B18-604 | LABEL | 機能候補: | normalized-line:7108 |
| B18-605 | TEXT | Billing Meter | normalized-line:7109 |
| B18-606 | TEXT | Usage Meter | normalized-line:7110 |
| B18-607 | TEXT | API利用量 | normalized-line:7111 |
| B18-608 | TEXT | AI社員稼働量 | normalized-line:7112 |
| B18-609 | TEXT | Company Brain参照量 | normalized-line:7113 |
| B18-610 | TEXT | Tool API呼び出し量 | normalized-line:7114 |
| B18-611 | TEXT | Marketplace手数料 | normalized-line:7115 |
| B18-612 | TEXT | Revenue Share | normalized-line:7116 |
| B18-613 | TEXT | 開発者分配 | normalized-line:7117 |
| B18-614 | TEXT | Creator分配 | normalized-line:7118 |
| B18-615 | TEXT | Affiliate分配候補 | normalized-line:7119 |
| B18-616 | TEXT | 請求明細 | normalized-line:7120 |
| B18-617 | TEXT | コスト上限 | normalized-line:7121 |
| B18-618 | TEXT | AI Gross Margin | normalized-line:7122 |
| B18-619 | TEXT | 顧客別収益性 | normalized-line:7123 |
| B18-620 | LABEL | 目安: | normalized-line:7124 |
| B18-621 | TEXT | Day 180-300: 内部課金 / 利用量 | normalized-line:7125 |
| B18-622 | TEXT | Day 300-450: Marketplace課金 | normalized-line:7126 |
| B18-623 | TEXT | Day 450以降: 本格Revenue Share | normalized-line:7127 |
| B18-624 | TEXT | Phase 19: Enterprise Governance | normalized-line:7128 |
| B18-625 | LABEL | 機能候補: | normalized-line:7129 |
| B18-626 | TEXT | SSO | normalized-line:7130 |
| B18-627 | TEXT | SCIM | normalized-line:7131 |
| B18-628 | TEXT | Enterprise RBAC | normalized-line:7132 |
| B18-629 | TEXT | ABAC | normalized-line:7133 |
| B18-630 | TEXT | 権限棚卸 | normalized-line:7134 |
| B18-631 | TEXT | 監査ログ保全 | normalized-line:7135 |
| B18-632 | TEXT | SIEM連携 | normalized-line:7136 |
| B18-633 | TEXT | DLP | normalized-line:7137 |
| B18-634 | TEXT | データ保持 | normalized-line:7138 |
| B18-635 | TEXT | データ削除 | normalized-line:7139 |
| B18-636 | TEXT | 電子署名 | normalized-line:7140 |
| B18-637 | TEXT | 契約管理 | normalized-line:7141 |
| B18-638 | TEXT | SOX / 内部統制 | normalized-line:7142 |
| B18-639 | TEXT | 職務分掌 | normalized-line:7143 |
| B18-640 | TEXT | リスク管理 | normalized-line:7144 |
| B18-641 | TEXT | 事業継続 | normalized-line:7145 |
| B18-642 | TEXT | 法務レビュー | normalized-line:7146 |
| B18-643 | TEXT | AIガバナンス | normalized-line:7147 |
| B18-644 | TEXT | モデル利用ログ | normalized-line:7148 |
| B18-645 | LABEL | 目安: | normalized-line:7149 |
| B18-646 | TEXT | Day 360-720: Enterprise対応 | normalized-line:7150 |
| B18-647 | TEXT | Phase 20: 369経済圏 / AI社員OS | normalized-line:7151 |
| B18-648 | LABEL | 機能候補: | normalized-line:7152 |
| B18-649 | TEXT | AI社員開発環境 | normalized-line:7153 |
| B18-650 | TEXT | AI社員ストア | normalized-line:7154 |
| B18-651 | TEXT | 業界別AI社員 | normalized-line:7155 |
| B18-652 | TEXT | 企業別AI社員 | normalized-line:7156 |
| B18-653 | TEXT | 開発者収益 | normalized-line:7157 |
| B18-654 | TEXT | 従量課金 | normalized-line:7158 |
| B18-655 | TEXT | PLUG購買ネットワーク | normalized-line:7159 |
| B18-656 | TEXT | 企業データOS | normalized-line:7160 |
| B18-657 | TEXT | 社員向けブラウザ拡張 | normalized-line:7161 |
| B18-658 | TEXT | 法人購買ネットワーク | normalized-line:7162 |
| B18-659 | TEXT | CRM / ERP / BI / AI統合 | normalized-line:7163 |
| B18-660 | TEXT | パートナー制度 | normalized-line:7164 |
| B18-661 | TEXT | 認定開発者制度 | normalized-line:7165 |
| B18-662 | TEXT | 認定導入支援会社制度 | normalized-line:7166 |
| B18-663 | TEXT | AI社員評価制度 | normalized-line:7167 |
| B18-664 | TEXT | 安全認証制度 | normalized-line:7168 |

## B19 時系列ロードマップ

- classification: `ROADMAP_STRATEGY`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B19-001 | TEXT | Day 6-30: 営業デモの完成 | normalized-line:7170 |
| B19-002 | TEXT | Company Brainを見せやすくする | normalized-line:7171 |
| B19-003 | TEXT | CRM基本画面を整える | normalized-line:7172 |
| B19-004 | TEXT | AI参照元表示 | normalized-line:7173 |
| B19-005 | TEXT | 社長ダッシュボード | normalized-line:7174 |
| B19-006 | TEXT | 顧客 / 案件 / 商品 / 営業プレイブック連携 | normalized-line:7175 |
| B19-007 | TEXT | デモデータ | normalized-line:7176 |
| B19-008 | TEXT | 安全設計ページ | normalized-line:7177 |
| B19-009 | TEXT | 30分デモ導線 | normalized-line:7178 |
| B19-010 | TEXT | Day 31-60: CRM + AI Growth Engine MVP | normalized-line:7179 |
| B19-011 | TEXT | 顧客管理 | normalized-line:7180 |
| B19-012 | TEXT | 案件管理 | normalized-line:7181 |
| B19-013 | TEXT | 売上 / 粗利 | normalized-line:7182 |
| B19-014 | TEXT | 広告費 | normalized-line:7183 |
| B19-015 | TEXT | CV | normalized-line:7184 |
| B19-016 | TEXT | Growth Event Ledger | normalized-line:7185 |
| B19-017 | TEXT | AI Growth Report | normalized-line:7186 |
| B19-018 | TEXT | 基本ダッシュボード | normalized-line:7187 |
| B19-019 | TEXT | AI提案 | normalized-line:7188 |
| B19-020 | TEXT | データ不足表示 | normalized-line:7189 |
| B19-021 | TEXT | Day 61-90: Approval / Human Certification | normalized-line:7190 |
| B19-022 | TEXT | Approval Inbox | normalized-line:7191 |
| B19-023 | TEXT | Human Certification Gate | normalized-line:7192 |
| B19-024 | TEXT | AI提案の承認 | normalized-line:7193 |
| B19-025 | TEXT | 外部送信ブロック | normalized-line:7194 |
| B19-026 | TEXT | 請求 / 会計候補はまだ確定させない | normalized-line:7195 |
| B19-027 | TEXT | 監査ログ | normalized-line:7196 |
| B19-028 | TEXT | リスク表示 | normalized-line:7197 |
| B19-029 | TEXT | Consent Gate | normalized-line:7198 |
| B19-030 | TEXT | Day 91-150: PLUG型ミニ版 + Oracle Mini入口 | normalized-line:7199 |
| B19-031 | TEXT | 商品URL認識 | normalized-line:7200 |
| B19-032 | TEXT | 商品比較DB | normalized-line:7201 |
| B19-033 | TEXT | EC価格比較PoC | normalized-line:7202 |
| B19-034 | TEXT | 購買申請 | normalized-line:7203 |
| B19-035 | TEXT | 会社購買ポリシー | normalized-line:7204 |
| B19-036 | TEXT | 仕入先管理 | normalized-line:7205 |
| B19-037 | TEXT | 発注候補 | normalized-line:7206 |
| B19-038 | TEXT | 請求候補 | normalized-line:7207 |
| B19-039 | TEXT | 会計候補 | normalized-line:7208 |
| B19-040 | TEXT | 経費候補 | normalized-line:7209 |
| B19-041 | TEXT | Day 151-210: Developer Cloud Alpha | normalized-line:7210 |
| B19-042 | TEXT | AI社員テンプレート | normalized-line:7211 |
| B19-043 | TEXT | Plugin Template | normalized-line:7212 |
| B19-044 | TEXT | Agent Manifest | normalized-line:7213 |
| B19-045 | TEXT | Sandbox | normalized-line:7214 |
| B19-046 | TEXT | SDK / CLI初期版 | normalized-line:7215 |
| B19-047 | TEXT | 開発者ポータル | normalized-line:7216 |
| B19-048 | TEXT | 審査チェック | normalized-line:7217 |
| B19-049 | TEXT | AI社員の権限定義 | normalized-line:7218 |
| B19-050 | TEXT | 369 Runtime | normalized-line:7219 |
| B19-051 | TEXT | 監査ログ接続 | normalized-line:7220 |
| B19-052 | TEXT | Marketplace準備 | normalized-line:7221 |
| B19-053 | TEXT | Day 211-300: Marketplace β + PLUG法人購買β | normalized-line:7222 |
| B19-054 | TEXT | AI社員ストアβ | normalized-line:7223 |
| B19-055 | TEXT | 業界テンプレート | normalized-line:7224 |
| B19-056 | TEXT | 開発者登録 | normalized-line:7225 |
| B19-057 | TEXT | AI社員販売 | normalized-line:7226 |
| B19-058 | TEXT | 利用量計測 | normalized-line:7227 |
| B19-059 | TEXT | 収益分配 | normalized-line:7228 |
| B19-060 | TEXT | 法人購買ブラウザ拡張β | normalized-line:7229 |
| B19-061 | TEXT | 購買承認 | normalized-line:7230 |
| B19-062 | TEXT | アフィリエイト透明化 | normalized-line:7231 |
| B19-063 | TEXT | 従業員配布 | normalized-line:7232 |
| B19-064 | TEXT | Day 301-450: Salesforce / Oracle 拡張 | normalized-line:7233 |
| B19-065 | TEXT | Service Cloud的機能 | normalized-line:7234 |
| B19-066 | TEXT | Marketing Cloud的機能 | normalized-line:7235 |
| B19-067 | TEXT | Commerce Cloud的機能 | normalized-line:7236 |
| B19-068 | TEXT | ERP財務 | normalized-line:7237 |
| B19-069 | TEXT | 調達 | normalized-line:7238 |
| B19-070 | TEXT | 在庫 | normalized-line:7239 |
| B19-071 | TEXT | HCM | normalized-line:7240 |
| B19-072 | TEXT | EPM | normalized-line:7241 |
| B19-073 | TEXT | GRC | normalized-line:7242 |
| B19-074 | TEXT | BI | normalized-line:7243 |
| B19-075 | TEXT | API | normalized-line:7244 |
| B19-076 | TEXT | 外部連携 | normalized-line:7245 |
| B19-077 | TEXT | Day 451-720: Enterprise / Platform化 | normalized-line:7246 |
| B19-078 | TEXT | SSO | normalized-line:7247 |
| B19-079 | TEXT | SCIM | normalized-line:7248 |
| B19-080 | TEXT | Enterprise RBAC | normalized-line:7249 |
| B19-081 | TEXT | Public API | normalized-line:7250 |
| B19-082 | TEXT | Integration Hub | normalized-line:7251 |
| B19-083 | TEXT | Developer Marketplace本格化 | normalized-line:7252 |
| B19-084 | TEXT | Revenue Share | normalized-line:7253 |
| B19-085 | TEXT | AI社員認証 | normalized-line:7254 |
| B19-086 | TEXT | Industry Cloud | normalized-line:7255 |
| B19-087 | TEXT | 法人購買ネットワーク | normalized-line:7256 |
| B19-088 | TEXT | 大企業監査対応 | normalized-line:7257 |
| B19-089 | LABEL | 優先順位: | normalized-line:7258 |
| B19-090 | TEXT | Core OS / Company Brain | normalized-line:7259 |
| B19-091 | TEXT | CRM / 営業デモ | normalized-line:7260 |
| B19-092 | TEXT | AI Growth Engine | normalized-line:7261 |
| B19-093 | TEXT | Human Certification Gate | normalized-line:7262 |
| B19-094 | TEXT | PLUG型ミニ購買エンジン | normalized-line:7263 |
| B19-095 | TEXT | Oracle Mini / 財務・調達・請求候補 | normalized-line:7264 |
| B19-096 | TEXT | Developer Cloud Alpha | normalized-line:7265 |
| B19-097 | TEXT | AI社員Marketplace | normalized-line:7266 |
| B19-098 | TEXT | 従業員配布 | normalized-line:7267 |
| B19-099 | TEXT | Salesforce / Oracle拡張 | normalized-line:7268 |
| B19-100 | TEXT | Enterprise Governance | normalized-line:7269 |
| B19-101 | TEXT | 369経済圏 | normalized-line:7270 |

## B20 Developer Cloud 詳細

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B20-001 | TEXT | 3タイプ | normalized-line:7272 |
| B20-002 | TEXT | テンプレート型 | normalized-line:7273 |
| B20-003 | TEXT | 非エンジニア | normalized-line:7274 |
| B20-004 | TEXT | 業務担当者 | normalized-line:7275 |
| B20-005 | TEXT | 経営者 | normalized-line:7276 |
| B20-006 | TEXT | 質問に答えるだけでAI社員を調整 | normalized-line:7277 |
| B20-007 | TEXT | ブロックビルダー型 | normalized-line:7278 |
| B20-008 | TEXT | ノーコード制作者 | normalized-line:7279 |
| B20-009 | TEXT | 業務コンサル | normalized-line:7280 |
| B20-010 | TEXT | 情シス | normalized-line:7281 |
| B20-011 | TEXT | 12種ブロックを組み合わせる | normalized-line:7282 |
| B20-012 | TEXT | コード / SDK型 | normalized-line:7283 |
| B20-013 | TEXT | AI会社 | normalized-line:7284 |
| B20-014 | TEXT | 上級開発者 | normalized-line:7285 |
| B20-015 | TEXT | SIer | normalized-line:7286 |
| B20-016 | TEXT | 研究機関 | normalized-line:7287 |
| B20-017 | TEXT | Agent SDK / APIで自由設計 | normalized-line:7288 |
| B20-018 | TEXT | 9種のAI社員テンプレート | normalized-line:7289 |
| B20-019 | TEXT | AI営業 | normalized-line:7290 |
| B20-020 | TEXT | AIマーケター | normalized-line:7291 |
| B20-021 | TEXT | AI秘書 | normalized-line:7292 |
| B20-022 | TEXT | AI社長補佐 | normalized-line:7293 |
| B20-023 | TEXT | AI経理 | normalized-line:7294 |
| B20-024 | TEXT | AI法務 | normalized-line:7295 |
| B20-025 | TEXT | AI採用 | normalized-line:7296 |
| B20-026 | TEXT | AI教育 | normalized-line:7297 |
| B20-027 | TEXT | AI品質管理 | normalized-line:7298 |
| B20-028 | TEXT | 各テンプレートの12要素 | normalized-line:7299 |
| B20-029 | TEXT | 役割 | normalized-line:7300 |
| B20-030 | TEXT | 職務範囲 | normalized-line:7301 |
| B20-031 | TEXT | 権限 | normalized-line:7302 |
| B20-032 | TEXT | 使用ツール | normalized-line:7303 |
| B20-033 | TEXT | Company Brainスコープ | normalized-line:7304 |
| B20-034 | TEXT | KPI | normalized-line:7305 |
| B20-035 | TEXT | 禁止事項 | normalized-line:7306 |
| B20-036 | TEXT | 承認条件 | normalized-line:7307 |
| B20-037 | TEXT | 報告頻度 | normalized-line:7308 |
| B20-038 | TEXT | 出力形式 | normalized-line:7309 |
| B20-039 | TEXT | 評価基準 | normalized-line:7310 |
| B20-040 | TEXT | 課金単位 | normalized-line:7311 |
| B20-041 | TEXT | 12ブロック候補 | normalized-line:7312 |
| B20-042 | TEXT | Trigger | normalized-line:7313 |
| B20-043 | TEXT | Input | normalized-line:7314 |
| B20-044 | TEXT | Company Brain | normalized-line:7315 |
| B20-045 | TEXT | Tool | normalized-line:7316 |
| B20-046 | TEXT | Permission | normalized-line:7317 |
| B20-047 | TEXT | Approval | normalized-line:7318 |
| B20-048 | TEXT | Transform | normalized-line:7319 |
| B20-049 | TEXT | Generate | normalized-line:7320 |
| B20-050 | TEXT | Deliver | normalized-line:7321 |
| B20-051 | TEXT | Monitor | normalized-line:7322 |
| B20-052 | TEXT | Evaluate | normalized-line:7323 |
| B20-053 | TEXT | Billing | normalized-line:7324 |
| B20-054 | TEXT | コード基盤13コンポーネント | normalized-line:7325 |
| B20-055 | TEXT | Agent SDK | normalized-line:7326 |
| B20-056 | TEXT | Tool API | normalized-line:7327 |
| B20-057 | TEXT | Company Brain API | normalized-line:7328 |
| B20-058 | TEXT | Permission API | normalized-line:7329 |
| B20-059 | TEXT | Billing API | normalized-line:7330 |
| B20-060 | TEXT | Evaluation API | normalized-line:7331 |
| B20-061 | TEXT | Sandbox | normalized-line:7332 |
| B20-062 | TEXT | Developer Portal | normalized-line:7333 |
| B20-063 | TEXT | Agent Manifest | normalized-line:7334 |
| B20-064 | TEXT | Tool Manifest | normalized-line:7335 |
| B20-065 | TEXT | テスト環境 | normalized-line:7336 |
| B20-066 | TEXT | 審査フロー | normalized-line:7337 |
| B20-067 | TEXT | Marketplace配布機能 | normalized-line:7338 |

## B21 AI社員パッケージ標準構造

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B21-001 | TEXT | AI社員は「動く」だけでなく、「売れる・監査できる・課金できる」までを1パッケージで完結させてください。 | normalized-line:7340 |
| B21-002 | LABEL | 14要素: | normalized-line:7341 |
| B21-003 | TEXT | Agent Manifest | normalized-line:7342 |
| B21-004 | TEXT | Role Definition | normalized-line:7343 |
| B21-005 | TEXT | Tool Permissions | normalized-line:7344 |
| B21-006 | TEXT | Company Brain Scope | normalized-line:7345 |
| B21-007 | TEXT | Prompt Policy | normalized-line:7346 |
| B21-008 | TEXT | Workflow | normalized-line:7347 |
| B21-009 | TEXT | Approval Rules | normalized-line:7348 |
| B21-010 | TEXT | KPI | normalized-line:7349 |
| B21-011 | TEXT | Evaluation Rule | normalized-line:7350 |
| B21-012 | TEXT | Billing Rule | normalized-line:7351 |
| B21-013 | TEXT | Audit Rule | normalized-line:7352 |
| B21-014 | TEXT | Version | normalized-line:7353 |
| B21-015 | TEXT | Template Metadata | normalized-line:7354 |
| B21-016 | TEXT | Marketplace Metadata | normalized-line:7355 |
| B21-017 | LABEL | Agent Manifestには以下を含める候補: | normalized-line:7356 |
| B21-018 | TEXT | name | normalized-line:7357 |
| B21-019 | TEXT | version | normalized-line:7358 |
| B21-020 | TEXT | role | normalized-line:7359 |
| B21-021 | TEXT | runtime | normalized-line:7360 |
| B21-022 | TEXT | tools | normalized-line:7361 |
| B21-023 | TEXT | company_brain_scope | normalized-line:7362 |
| B21-024 | TEXT | permissions | normalized-line:7363 |
| B21-025 | TEXT | approval_required | normalized-line:7364 |
| B21-026 | TEXT | kpi | normalized-line:7365 |
| B21-027 | TEXT | billing | normalized-line:7366 |
| B21-028 | TEXT | audit | normalized-line:7367 |
| B21-029 | TEXT | forbidden_actions | normalized-line:7368 |
| B21-030 | TEXT | developer | normalized-line:7369 |
| B21-031 | TEXT | marketplace | normalized-line:7370 |
| B21-032 | LABEL | 権限は三値で扱う: | normalized-line:7371 |
| B21-033 | TEXT | ai_only | normalized-line:7372 |
| B21-034 | TEXT | human_approval | normalized-line:7373 |
| B21-035 | TEXT | forbidden | normalized-line:7374 |

## B22 Permission & Approval Protocol

- classification: `SAFETY_REQUIREMENT`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B22-001 | TEXT | 操作カテゴリごとに「AI単独 / 人間承認 / 禁止」を定義してください。 | normalized-line:7376 |
| B22-002 | LABEL | 例: | normalized-line:7377 |
| B22-003 | TEXT | 顧客情報読取: AI単独候補 | normalized-line:7378 |
| B22-004 | TEXT | 営業文下書き: AI単独候補 | normalized-line:7379 |
| B22-005 | TEXT | 外部メール送信: 人間承認 | normalized-line:7380 |
| B22-006 | TEXT | 契約リスク整理: AI単独候補 | normalized-line:7381 |
| B22-007 | TEXT | 広告改善案: AI単独候補 | normalized-line:7382 |
| B22-008 | TEXT | 請求下書き: 人間承認 | normalized-line:7383 |
| B22-009 | TEXT | 採用候補整理: 人間承認 | normalized-line:7384 |
| B22-010 | TEXT | 契約締結: 禁止または人間承認必須 | normalized-line:7385 |
| B22-011 | TEXT | 送金: 禁止または人間承認必須 | normalized-line:7386 |
| B22-012 | TEXT | 会計確定: 人間承認必須 | normalized-line:7387 |
| B22-013 | TEXT | 採用合否確定: AI単独禁止 | normalized-line:7388 |
| B22-014 | LABEL | 原則: | normalized-line:7389 |
| B22-015 | TEXT | AI社員が動くほど、監査ログと承認履歴が積み上がる構造にする。 | normalized-line:7390 |

## B23 Evaluation Framework

- classification: `SAFETY_REQUIREMENT`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B23-001 | LABEL | 13評価指標: | normalized-line:7392 |
| B23-002 | LABEL | 定量: | normalized-line:7393 |
| B23-003 | TEXT | タスク完了率 | normalized-line:7394 |
| B23-004 | TEXT | 応答時間 | normalized-line:7395 |
| B23-005 | TEXT | 承認通過率 | normalized-line:7396 |
| B23-006 | TEXT | エラー率 | normalized-line:7397 |
| B23-007 | TEXT | コスト効率 | normalized-line:7398 |
| B23-008 | LABEL | 定性: | normalized-line:7399 |
| B23-009 | TEXT | 回答品質スコア | normalized-line:7400 |
| B23-010 | TEXT | 口調・ブランド適合 | normalized-line:7401 |
| B23-011 | TEXT | 顧客満足度 | normalized-line:7402 |
| B23-012 | TEXT | 上長レビュー評価 | normalized-line:7403 |
| B23-013 | LABEL | 改善: | normalized-line:7404 |
| B23-014 | TEXT | エッジケース収集 | normalized-line:7405 |
| B23-015 | TEXT | A/Bテスト実行 | normalized-line:7406 |
| B23-016 | TEXT | プロンプト自動改善候補 | normalized-line:7407 |
| B23-017 | TEXT | バージョン差分評価 | normalized-line:7408 |
| B23-018 | LABEL | 注意: | normalized-line:7409 |
| B23-019 | TEXT | 自動改善は候補生成に留める | normalized-line:7410 |
| B23-020 | TEXT | 本番反映は人間承認 | normalized-line:7411 |
| B23-021 | TEXT | unsafe output、PII leakage、prompt injection、tool abuse のテストを含める | normalized-line:7412 |

## B24 課金 / Metering / Billing

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B24-001 | LABEL | 開発時課金: | normalized-line:7414 |
| B24-002 | TEXT | テンプレ利用料 | normalized-line:7415 |
| B24-003 | TEXT | ブロック使用量 | normalized-line:7416 |
| B24-004 | TEXT | SDK API呼出 | normalized-line:7417 |
| B24-005 | TEXT | Company Brain参照 | normalized-line:7418 |
| B24-006 | TEXT | Sandboxコンピュート | normalized-line:7419 |
| B24-007 | TEXT | テスト実行回数 | normalized-line:7420 |
| B24-008 | TEXT | LLM推論トークン | normalized-line:7421 |
| B24-009 | TEXT | 審査申請費 | normalized-line:7422 |
| B24-010 | TEXT | Marketplace登録費 | normalized-line:7423 |
| B24-011 | TEXT | 認定バッジ取得費 | normalized-line:7424 |
| B24-012 | LABEL | 稼働時課金: | normalized-line:7425 |
| B24-013 | TEXT | タスク実行数 | normalized-line:7426 |
| B24-014 | TEXT | ツール呼出数 | normalized-line:7427 |
| B24-015 | TEXT | Company Brain参照 | normalized-line:7428 |
| B24-016 | TEXT | 承認処理数 | normalized-line:7429 |
| B24-017 | TEXT | LLM推論トークン | normalized-line:7430 |
| B24-018 | TEXT | ストレージ容量 | normalized-line:7431 |
| B24-019 | TEXT | 監査ログ保存 | normalized-line:7432 |
| B24-020 | TEXT | 出力生成回数 | normalized-line:7433 |
| B24-021 | LABEL | 369の収益源: | normalized-line:7434 |
| B24-022 | TEXT | プラットフォーム基本料 | normalized-line:7435 |
| B24-023 | TEXT | 従量API手数料 | normalized-line:7436 |
| B24-024 | TEXT | Runtime稼働費 | normalized-line:7437 |
| B24-025 | TEXT | Marketplace販売手数料 | normalized-line:7438 |
| B24-026 | TEXT | 開発環境サブスク | normalized-line:7439 |
| B24-027 | TEXT | 審査認定料 | normalized-line:7440 |
| B24-028 | TEXT | データ・分析サービス | normalized-line:7441 |
| B24-029 | TEXT | 優先サポート契約 | normalized-line:7442 |
| B24-030 | LABEL | 開発者収益源: | normalized-line:7443 |
| B24-031 | TEXT | Marketplace販売収益 | normalized-line:7444 |
| B24-032 | TEXT | 稼働ロイヤリティ | normalized-line:7445 |
| B24-033 | TEXT | ツール利用料 | normalized-line:7446 |
| B24-034 | TEXT | テンプレ販売収益 | normalized-line:7447 |
| B24-035 | TEXT | カスタマイズ受託 | normalized-line:7448 |
| B24-036 | TEXT | 保守・改善契約 | normalized-line:7449 |
| B24-037 | TEXT | 認定バッジプレミアム | normalized-line:7450 |

## B25 Marketplace

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B25-001 | TEXT | Marketplaceは「WordPressのプラグイン市場 × AI社員」です。 | normalized-line:7452 |
| B25-002 | LABEL | 販売カテゴリ: | normalized-line:7453 |
| B25-003 | TEXT | AI社員パッケージ | normalized-line:7454 |
| B25-004 | TEXT | AI補助社員 | normalized-line:7455 |
| B25-005 | TEXT | 業務ツール | normalized-line:7456 |
| B25-006 | TEXT | テンプレート | normalized-line:7457 |
| B25-007 | TEXT | ブロック / ノード | normalized-line:7458 |
| B25-008 | TEXT | ワークフロー | normalized-line:7459 |
| B25-009 | TEXT | Company Brain拡張 | normalized-line:7460 |
| B25-010 | TEXT | 業界特化パッケージ | normalized-line:7461 |
| B25-011 | LABEL | 必要機能: | normalized-line:7462 |
| B25-012 | TEXT | 検索・カテゴリ | normalized-line:7463 |
| B25-013 | TEXT | プレビュー・デモ | normalized-line:7464 |
| B25-014 | TEXT | 認定バッジ表示 | normalized-line:7465 |
| B25-015 | TEXT | レビュー・評価 | normalized-line:7466 |
| B25-016 | TEXT | 価格・プラン | normalized-line:7467 |
| B25-017 | TEXT | ワンクリック導入 | normalized-line:7468 |
| B25-018 | TEXT | トライアル期間 | normalized-line:7469 |
| B25-019 | TEXT | バージョン管理 | normalized-line:7470 |
| B25-020 | TEXT | 互換性チェック | normalized-line:7471 |
| B25-021 | TEXT | 決済・課金統合 | normalized-line:7472 |
| B25-022 | TEXT | 権限表示 | normalized-line:7473 |
| B25-023 | TEXT | データ利用範囲表示 | normalized-line:7474 |
| B25-024 | TEXT | 外部送信有無表示 | normalized-line:7475 |
| B25-025 | TEXT | 返金ルール | normalized-line:7476 |
| B25-026 | TEXT | 企業管理者承認導入 | normalized-line:7477 |
| B25-027 | TEXT | Marketplaceは審査済みのみ。 | normalized-line:7478 |
| B25-028 | TEXT | 信頼が最大の資産です。 | normalized-line:7479 |

## B26 Safety Review / Certification

- classification: `SAFETY_REQUIREMENT`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B26-001 | LABEL | 10審査項目: | normalized-line:7481 |
| B26-002 | TEXT | Manifest整合性検査 | normalized-line:7482 |
| B26-003 | TEXT | ツール権限の妥当性 | normalized-line:7483 |
| B26-004 | TEXT | Company Brainスコープ | normalized-line:7484 |
| B26-005 | TEXT | Prompt Policy審査 | normalized-line:7485 |
| B26-006 | TEXT | エッジケーステスト | normalized-line:7486 |
| B26-007 | TEXT | 監査ログ完全性 | normalized-line:7487 |
| B26-008 | TEXT | 個人情報リーク耐性 | normalized-line:7488 |
| B26-009 | TEXT | 悪意入力耐性 | normalized-line:7489 |
| B26-010 | TEXT | コスト暴走防止 | normalized-line:7490 |
| B26-011 | TEXT | 業界特有規制の遵守 | normalized-line:7491 |
| B26-012 | LABEL | 認定バッジ候補: | normalized-line:7492 |
| B26-013 | TEXT | Safety Verified | normalized-line:7493 |
| B26-014 | TEXT | Privacy Ready | normalized-line:7494 |
| B26-015 | TEXT | SOC2 Ready | normalized-line:7495 |
| B26-016 | TEXT | Finance Certified | normalized-line:7496 |
| B26-017 | TEXT | Legal Approved | normalized-line:7497 |
| B26-018 | TEXT | Enterprise Ready | normalized-line:7498 |
| B26-019 | TEXT | Top Performer | normalized-line:7499 |
| B26-020 | TEXT | 369 Official | normalized-line:7500 |

## B27 Developer Portal

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B27-001 | LABEL | 17機能: | normalized-line:7502 |
| B27-002 | TEXT | アカウント / KYC | normalized-line:7503 |
| B27-003 | TEXT | APIキー管理 | normalized-line:7504 |
| B27-004 | TEXT | SDKダウンロード | normalized-line:7505 |
| B27-005 | TEXT | ドキュメント | normalized-line:7506 |
| B27-006 | TEXT | Sandbox環境 | normalized-line:7507 |
| B27-007 | TEXT | Playground | normalized-line:7508 |
| B27-008 | TEXT | テスト自動化 | normalized-line:7509 |
| B27-009 | TEXT | 審査申請 | normalized-line:7510 |
| B27-010 | TEXT | バージョン管理 | normalized-line:7511 |
| B27-011 | TEXT | Marketplace出品 | normalized-line:7512 |
| B27-012 | TEXT | 稼働モニタリング | normalized-line:7513 |
| B27-013 | TEXT | 収益ダッシュボード | normalized-line:7514 |
| B27-014 | TEXT | 請求・入金 | normalized-line:7515 |
| B27-015 | TEXT | サポートチケット | normalized-line:7516 |
| B27-016 | TEXT | コミュニティ | normalized-line:7517 |
| B27-017 | TEXT | パートナー認定 | normalized-line:7518 |
| B27-018 | TEXT | 導入企業マッチング | normalized-line:7519 |
| B27-019 | LABEL | 369がAI会社に選ばれる理由: | normalized-line:7520 |
| B27-020 | TEXT | エンタープライズ顧客に届く | normalized-line:7521 |
| B27-021 | TEXT | Company Brain APIで企業知識に安全アクセスできる | normalized-line:7522 |
| B27-022 | TEXT | Runtimeが監査ログ・承認履歴を蓄積する | normalized-line:7523 |
| B27-023 | TEXT | Billing Meter・決済・分配を代行する | normalized-line:7524 |
| B27-024 | TEXT | Evaluation Frameworkで評価・改善できる | normalized-line:7525 |
| B27-025 | TEXT | Safety Review + 認定バッジで信頼担保 | normalized-line:7526 |
| B27-026 | TEXT | 稼働ロイヤリティでストック収益化できる | normalized-line:7527 |

## B28 PLUG型システムの価値

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B28-001 | LABEL | 価値: | normalized-line:7529 |
| B28-002 | TEXT | 従業員に広がる | normalized-line:7530 |
| B28-003 | TEXT | 購買データが取れる | normalized-line:7531 |
| B28-004 | TEXT | 収益が発生する | normalized-line:7532 |
| B28-005 | TEXT | ただし、Honey型の批判を踏まえ、369版は透明性と企業統制を武器にする。 | normalized-line:7533 |
| B28-006 | LABEL | やるべきこと: | normalized-line:7534 |
| B28-007 | TEXT | 会社にも社員にも分かる | normalized-line:7535 |
| B28-008 | TEXT | 安く、正しく、承認された購買 | normalized-line:7536 |
| B28-009 | TEXT | ユーザー利益がある時だけ提示 | normalized-line:7537 |
| B28-010 | TEXT | 会社購買と個人購買を分離 | normalized-line:7538 |
| B28-011 | TEXT | アフィリエイト手数料を開示 | normalized-line:7539 |
| B28-012 | TEXT | 購買ポリシーと連動 | normalized-line:7540 |
| B28-013 | TEXT | 予算・承認・会計候補へ接続 | normalized-line:7541 |
| B28-014 | LABEL | やってはいけないこと: | normalized-line:7542 |
| B28-015 | TEXT | こっそりリンクを差し替える | normalized-line:7543 |
| B28-016 | TEXT | 元リンクを奪う | normalized-line:7544 |
| B28-017 | TEXT | ユーザーメリットなしにcookieを入れる | normalized-line:7545 |
| B28-018 | TEXT | 私的購買履歴を会社へ見せる | normalized-line:7546 |
| B28-019 | TEXT | 拡張機能に過剰権限を持たせる | normalized-line:7547 |

## B29 369 Employee App

- classification: `PRODUCT_ARCHITECTURE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B29-001 | TEXT | 369を企業向け業務OSで終わらせず、導入企業の従業員にも自然に広げる。 | normalized-line:7549 |
| B29-002 | LABEL | 価値: | normalized-line:7550 |
| B29-003 | TEXT | 経営者: 売上、利益、業務、社員、経費、請求、広告、顧客を一元管理 | normalized-line:7551 |
| B29-004 | TEXT | 管理部門: 経理、人事、労務、購買、承認、契約、請求が楽になる | normalized-line:7552 |
| B29-005 | TEXT | 現場社員: タスク、申請、ナレッジ、AI補助、社内手続きが楽になる | normalized-line:7553 |
| B29-006 | TEXT | 従業員個人: 福利厚生、割引、キャッシュバック、AI生活サポート | normalized-line:7554 |
| B29-007 | LABEL | 機能候補: | normalized-line:7555 |
| B29-008 | TEXT | 今日のタスク | normalized-line:7556 |
| B29-009 | TEXT | 自分の仕事 | normalized-line:7557 |
| B29-010 | TEXT | 申請 | normalized-line:7558 |
| B29-011 | TEXT | 承認待ち | normalized-line:7559 |
| B29-012 | TEXT | 勤怠候補 | normalized-line:7560 |
| B29-013 | TEXT | 社内FAQ | normalized-line:7561 |
| B29-014 | TEXT | マニュアル | normalized-line:7562 |
| B29-015 | TEXT | 研修資料 | normalized-line:7563 |
| B29-016 | TEXT | AI相談 | normalized-line:7564 |
| B29-017 | TEXT | 福利厚生ストア | normalized-line:7565 |
| B29-018 | TEXT | 社員限定キャッシュバック | normalized-line:7566 |
| B29-019 | TEXT | 最安値検索 | normalized-line:7567 |
| B29-020 | TEXT | クーポン自動通知 | normalized-line:7568 |
| B29-021 | TEXT | 給与日前節約サポート | normalized-line:7569 |
| B29-022 | TEXT | AI生活コンシェルジュ | normalized-line:7570 |
| B29-023 | TEXT | 社員紹介特典 | normalized-line:7571 |
| B29-024 | TEXT | 通知 | normalized-line:7572 |
| B29-025 | LABEL | データ分離: | normalized-line:7573 |
| B29-026 | TEXT | 会社購買: 会社管理者が確認可能 | normalized-line:7574 |
| B29-027 | TEXT | 個人購買: 従業員本人だけが確認 | normalized-line:7575 |
| B29-028 | TEXT | 会社への集計表示: 個人を特定しない範囲 | normalized-line:7576 |
| B29-029 | TEXT | キャッシュバック: 会社購買分は会社、個人購買分は従業員 | normalized-line:7577 |
| B29-030 | TEXT | ブラウザ拡張: 仕事用モード / 個人用モード | normalized-line:7578 |
| B29-031 | LABEL | 禁止: | normalized-line:7579 |
| B29-032 | TEXT | 会社が従業員の私的買い物履歴を見られる状態 | normalized-line:7580 |
| B29-033 | TEXT | 従業員個人の閲覧URLや購買履歴が会社管理画面に出る状態 | normalized-line:7581 |
| B29-034 | TEXT | 会社用アカウントで私的購買を強制追跡する状態 | normalized-line:7582 |

## B30 知財 / moat 戦略

- classification: `STRATEGY_REQUIREMENT`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B30-001 | TEXT | 知財は守りです。 | normalized-line:7584 |
| B30-002 | TEXT | 本当の強さは、知財 × データ × 実行基盤 × 開発者経済圏 × 価格戦略 × テンプレート資産 の組み合わせです。 | normalized-line:7585 |
| B30-003 | LABEL | 守るべき中核: | normalized-line:7586 |
| B30-004 | TEXT | テンプレート・ブロック・コードで369専用AI社員を作成し、そのAI社員が369 Runtime、Company Brain、Tool API、Permission Protocol、Evaluation Framework、Billing Meterに依存して稼働し、制作時と稼働時の両方で従量課金され、開発者と369に収益分配されるAI社員開発・流通・実行基盤。 | normalized-line:7587 |
| B30-005 | LABEL | 防御層: | normalized-line:7588 |
| B30-006 | TEXT | 特許 | normalized-line:7589 |
| B30-007 | TEXT | ビジネス関連発明 | normalized-line:7590 |
| B30-008 | TEXT | 商標 | normalized-line:7591 |
| B30-009 | TEXT | 営業秘密 | normalized-line:7592 |
| B30-010 | TEXT | Company Brain | normalized-line:7593 |
| B30-011 | TEXT | Runtime依存 | normalized-line:7594 |
| B30-012 | TEXT | Marketplace | normalized-line:7595 |
| B30-013 | TEXT | テンプレート資産 | normalized-line:7596 |
| B30-014 | TEXT | 認定制度 | normalized-line:7597 |
| B30-015 | TEXT | 価格戦略 | normalized-line:7598 |
| B30-016 | LABEL | 商標候補: | normalized-line:7599 |
| B30-017 | TEXT | 369 AI社員 | normalized-line:7600 |
| B30-018 | TEXT | 369 AI補助社員 | normalized-line:7601 |
| B30-019 | TEXT | 369 AI Employee Studio | normalized-line:7602 |
| B30-020 | TEXT | 369 Agent Runtime | normalized-line:7603 |
| B30-021 | TEXT | 369 Company Brain | normalized-line:7604 |
| B30-022 | TEXT | 369 AI社員マーケット | normalized-line:7605 |
| B30-023 | TEXT | IKEZAKI OS | normalized-line:7606 |
| B30-024 | TEXT | IKEZAKI Workforce OS | normalized-line:7607 |
| B30-025 | LABEL | 特許候補: | normalized-line:7608 |
| B30-026 | TEXT | Agent Manifest 標準仕様 | normalized-line:7609 |
| B30-027 | TEXT | Company Brain スコープ制御 | normalized-line:7610 |
| B30-028 | TEXT | 3値権限プロトコル | normalized-line:7611 |
| B30-029 | TEXT | 稼働単位ロイヤリティ分配 | normalized-line:7612 |
| B30-030 | TEXT | Tool Manifest 標準化 | normalized-line:7613 |
| B30-031 | TEXT | 評価 & 改善自動ループ | normalized-line:7614 |
| B30-032 | TEXT | Safety Review バッジ制度 | normalized-line:7615 |
| B30-033 | TEXT | 監査ログ改ざん耐性設計 | normalized-line:7616 |
| B30-034 | TEXT | テンプレ × ブロック × コードの統合UX | normalized-line:7617 |
| B30-035 | TEXT | 369専用AI社員 作成〜稼働 一貫プロセス | normalized-line:7618 |
| B30-036 | LABEL | 注意: | normalized-line:7619 |
| B30-037 | TEXT | これは法的判断ではない | normalized-line:7620 |
| B30-038 | TEXT | 正式出願は弁理士・弁護士確認が必要 | normalized-line:7621 |
| B30-039 | TEXT | 出願前に公開範囲を確認する | normalized-line:7622 |
| B30-040 | TEXT | 特許化する情報と営業秘密にする情報を分ける | normalized-line:7623 |

## B33 広告費ゼロ成長ループ

- classification: `GROWTH_REQUIREMENT`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B33-001 | TEXT | IKEZAKI OSは広告費なしでも広がる構造を持つ必要があります。 | normalized-line:8142 |
| B33-002 | LABEL | 成長ループ: | normalized-line:8143 |
| B33-003 | TEXT | AI経営診断ループ | normalized-line:8144 |
| B33-004 | TEXT | 請求書・見積書・契約書共有ループ | normalized-line:8145 |
| B33-005 | TEXT | 税理士・社労士・弁護士共有ループ | normalized-line:8146 |
| B33-006 | TEXT | 社員招待ループ | normalized-line:8147 |
| B33-007 | TEXT | 顧客ポータルループ | normalized-line:8148 |
| B33-008 | TEXT | 業種テンプレートSEOループ | normalized-line:8149 |
| B33-009 | TEXT | ベンチマーク共有ループ | normalized-line:8150 |
| B33-010 | TEXT | AI成果レポートループ | normalized-line:8151 |
| B33-011 | TEXT | Trust / 監査レポートループ | normalized-line:8152 |
| B33-012 | TEXT | Marketplace / テンプレート投稿ループ | normalized-line:8153 |
| B33-013 | TEXT | PR / プレスリリースループ | normalized-line:8154 |
| B33-014 | TEXT | SEO / 導入企業ページループ | normalized-line:8155 |
| B33-015 | TEXT | Business Network / 取引先招待ループ | normalized-line:8156 |
| B33-016 | TEXT | Advocate / Affiliateループ | normalized-line:8157 |
| B33-017 | TEXT | Creator / Influencerループ | normalized-line:8158 |
| B33-018 | TEXT | White-label Widgetループ | normalized-line:8159 |
| B33-019 | TEXT | Certification / Academyループ | normalized-line:8160 |
| B33-020 | TEXT | Challenge / Eventループ | normalized-line:8161 |
| B33-021 | TEXT | Public Impact Dashboardループ | normalized-line:8162 |
| B33-022 | TEXT | Build in Publicループ | normalized-line:8163 |
| B33-023 | TEXT | GitHub公開可能docs / 開発透明性ループ | normalized-line:8164 |
| B33-024 | TEXT | Obsidian Knowledge Map / 戦略整理ループ | normalized-line:8165 |
| B33-025 | TEXT | Industry Deep Packループ | normalized-line:8166 |
| B33-026 | TEXT | Customer Success教育ループ | normalized-line:8167 |
| B33-027 | TEXT | Enterprise Procurement Trustループ | normalized-line:8168 |
| B33-028 | LABEL | 重要: | normalized-line:8169 |
| B33-029 | TEXT | 広告を打つのではなく、プロダクトを使う行為そのものが、発信・紹介・招待・事例・診断・取引先導入・ドキュメント資産・知識資産につながる構造にする。 | normalized-line:8170 |

## B34 導入必然性トリガー

- classification: `GROWTH_REQUIREMENT`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B34-001 | TEXT | IKEZAKI OSには、導入企業が「入れた方がいい」ではなく「入れないと損している」と感じるトリガーを入れる。 | normalized-line:8172 |
| B34-002 | LABEL | トリガー候補: | normalized-line:8173 |
| B34-003 | TEXT | 未回収金 | normalized-line:8174 |
| B34-004 | TEXT | 請求漏れ | normalized-line:8175 |
| B34-005 | TEXT | 営業フォロー漏れ | normalized-line:8176 |
| B34-006 | TEXT | 粗利低下 | normalized-line:8177 |
| B34-007 | TEXT | 資金ショート予測 | normalized-line:8178 |
| B34-008 | TEXT | 労務リスク | normalized-line:8179 |
| B34-009 | TEXT | 契約期限 | normalized-line:8180 |
| B34-010 | TEXT | AI外部送信リスク | normalized-line:8181 |
| B34-011 | TEXT | 在庫・リース品リスク | normalized-line:8182 |
| B34-012 | TEXT | 経営判断遅れ | normalized-line:8183 |
| B34-013 | TEXT | SEO流入不足 | normalized-line:8184 |
| B34-014 | TEXT | PR未活用 | normalized-line:8185 |
| B34-015 | TEXT | Trust資料不足 | normalized-line:8186 |
| B34-016 | TEXT | 取引先連携不足 | normalized-line:8187 |
| B34-017 | TEXT | AI成果未可視化 | normalized-line:8188 |
| B34-018 | TEXT | 紹介機会損失 | normalized-line:8189 |
| B34-019 | TEXT | 採用広報不足 | normalized-line:8190 |
| B34-020 | TEXT | 導入事例未公開 | normalized-line:8191 |
| B34-021 | TEXT | 取引準備スコア低下 | normalized-line:8192 |
| B34-022 | TEXT | 競合導入済み | normalized-line:8193 |
| B34-023 | TEXT | GitHub docs未整理 | normalized-line:8194 |
| B34-024 | TEXT | Obsidian現在地不明 | normalized-line:8195 |
| B34-025 | TEXT | 次回Claude Codeプロンプト不明 | normalized-line:8196 |
| B34-026 | TEXT | 監査ログ散逸 | normalized-line:8197 |
| B34-027 | TEXT | 意思決定履歴不足 | normalized-line:8198 |
| B34-028 | TEXT | Release準備不足 | normalized-line:8199 |
| B34-029 | TEXT | SLO / SLA未定義 | normalized-line:8200 |
| B34-030 | TEXT | AI粗利悪化 | normalized-line:8201 |
| B34-031 | TEXT | 依存関係脆弱性 | normalized-line:8202 |
| B34-032 | TEXT | Enterprise調達資料不足 | normalized-line:8203 |
| B34-033 | TEXT | 恐怖訴求だけにしない。 | normalized-line:8204 |
| B34-034 | TEXT | 損失の可視化、改善方法、すぐ始める導線をセットにする。 | normalized-line:8205 |

## B35 紹介したくなる動機

- classification: `GROWTH_REQUIREMENT`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B35-001 | LABEL | 導入企業: | normalized-line:8207 |
| B35-002 | TEXT | 取引先も使うと見積・発注・請求・入金が楽になる | normalized-line:8208 |
| B35-003 | TEXT | 取引先連携率が上がる | normalized-line:8209 |
| B35-004 | TEXT | 自社がAI活用企業として認知される | normalized-line:8210 |
| B35-005 | TEXT | 導入企業ディレクトリに載る | normalized-line:8211 |
| B35-006 | TEXT | PR / SEO / 導入事例で自社集客に使える | normalized-line:8212 |
| B35-007 | TEXT | Network Creditsがもらえる | normalized-line:8213 |
| B35-008 | TEXT | 取引準備スコアが上がる | normalized-line:8214 |
| B35-009 | TEXT | Business Networkで取引機会が増える | normalized-line:8215 |
| B35-010 | LABEL | 士業: | normalized-line:8216 |
| B35-011 | TEXT | 顧問先管理が楽になる | normalized-line:8217 |
| B35-012 | TEXT | 顧問先に無料診断を配れる | normalized-line:8218 |
| B35-013 | TEXT | AI対応士業として認知される | normalized-line:8219 |
| B35-014 | TEXT | 士業プロフィールページができる | normalized-line:8220 |
| B35-015 | TEXT | 顧問先ダッシュボードが使える | normalized-line:8221 |
| B35-016 | TEXT | 士業認定バッジが得られる | normalized-line:8222 |
| B35-017 | TEXT | 顧問先向け提案書が作れる | normalized-line:8223 |
| B35-018 | LABEL | インフルエンサー: | normalized-line:8224 |
| B35-019 | TEXT | フォロワーに無料診断を配れる | normalized-line:8225 |
| B35-020 | TEXT | 投稿ネタになる | normalized-line:8226 |
| B35-021 | TEXT | 専用LPが持てる | normalized-line:8227 |
| B35-022 | TEXT | Public Impact Dashboardで実績化できる | normalized-line:8228 |
| B35-023 | TEXT | 認定バッジが得られる | normalized-line:8229 |
| B35-024 | TEXT | Content Kitが得られる | normalized-line:8230 |
| B35-025 | TEXT | オプトイン同意済み見込み客が増える | normalized-line:8231 |
| B35-026 | TEXT | 将来Marketplaceで収益化できる | normalized-line:8232 |
| B35-027 | LABEL | コンサル: | normalized-line:8233 |
| B35-028 | TEXT | 顧客診断が楽になる | normalized-line:8234 |
| B35-029 | TEXT | 提案書が作りやすい | normalized-line:8235 |
| B35-030 | TEXT | 導入支援案件につながる | normalized-line:8236 |
| B35-031 | TEXT | 認定AI業務設計士として見られる | normalized-line:8237 |
| B35-032 | TEXT | テンプレートを公開できる | normalized-line:8238 |
| B35-033 | LABEL | 開発者・テンプレート作者: | normalized-line:8239 |
| B35-034 | TEXT | Marketplaceに掲載できる | normalized-line:8240 |
| B35-035 | TEXT | テンプレート利用数が実績になる | normalized-line:8241 |
| B35-036 | TEXT | 作者ページができる | normalized-line:8242 |
| B35-037 | TEXT | 将来収益化できる | normalized-line:8243 |
| B35-038 | TEXT | 開発者認定が得られる | normalized-line:8244 |
| B35-039 | LABEL | 社員: | normalized-line:8245 |
| B35-040 | TEXT | 自分の作業が楽になる | normalized-line:8246 |
| B35-041 | TEXT | 個人AI補助が使える | normalized-line:8247 |
| B35-042 | TEXT | 社内貢献として評価される | normalized-line:8248 |
| B35-043 | TEXT | 部署に広げると業務が楽になる | normalized-line:8249 |

## B36 入れてはいけない機能

- classification: `PROHIBITED_REQUIREMENT`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B36-001 | LABEL | 絶対に機能化しないもの: | normalized-line:8251 |
| B36-002 | TEXT | AIによる虚偽口コミ投稿 | normalized-line:8252 |
| B36-003 | TEXT | AIによるなりすましレビュー投稿 | normalized-line:8253 |
| B36-004 | TEXT | AIによる口コミサイトへの量産投稿 | normalized-line:8254 |
| B36-005 | TEXT | AIによるGoogleプロフィールへの虚偽レビュー投稿 | normalized-line:8255 |
| B36-006 | TEXT | AIによるステルスマーケティング投稿 | normalized-line:8256 |
| B36-007 | TEXT | AIによる実体験でない体験談生成・投稿 | normalized-line:8257 |
| B36-008 | TEXT | AIによる採用合否の自動確定 | normalized-line:8258 |
| B36-009 | TEXT | AIによる法務判断の自動確定 | normalized-line:8259 |
| B36-010 | TEXT | AIによる給与・評価の自動確定 | normalized-line:8260 |
| B36-011 | TEXT | AIによる契約締結の自動実行 | normalized-line:8261 |
| B36-012 | TEXT | AIによる広告出稿の自動実行 | normalized-line:8262 |
| B36-013 | TEXT | AIによる高機密データの無承認送信 | normalized-line:8263 |
| B36-014 | TEXT | AIによる個人情報の外部送信 | normalized-line:8264 |
| B36-015 | TEXT | AIによる本番DB変更 | normalized-line:8265 |
| B36-016 | TEXT | AIによる決済・返金の自動実行 | normalized-line:8266 |
| B36-017 | TEXT | AIによる督促送信の無承認実行 | normalized-line:8267 |
| B36-018 | TEXT | AIによる請求書発行の無承認実行 | normalized-line:8268 |
| B36-019 | TEXT | AIによる契約書送信の無承認実行 | normalized-line:8269 |
| B36-020 | TEXT | AIによる株式・投資判断の自動実行 | normalized-line:8270 |
| B36-021 | TEXT | AIによる医療・法律・税務判断の断定 | normalized-line:8271 |
| B36-022 | TEXT | 監査ログを削除できる通常機能 | normalized-line:8272 |
| B36-023 | TEXT | 承認ログを改ざんできる機能 | normalized-line:8273 |
| B36-024 | TEXT | 権限変更を無承認で行う機能 | normalized-line:8274 |
| B36-025 | TEXT | 制裁・反社・輸出管理チェックを無承認で外す機能 | normalized-line:8275 |
| B36-026 | TEXT | Legal Hold対象データを通常削除できる機能 | normalized-line:8276 |
| B36-027 | TEXT | 通報者保護を回避できる機能 | normalized-line:8277 |
| B36-028 | TEXT | 顧客通知をAIが無承認で一斉送信する機能 | normalized-line:8278 |
| B36-029 | TEXT | Feature FlagをAIが無承認で本番有効化する機能 | normalized-line:8279 |
| B36-030 | TEXT | 本番deployをAIが無承認で実行する機能 | normalized-line:8280 |
| B36-031 | TEXT | force pushをAIが無承認で実行する機能 | normalized-line:8281 |
| B36-032 | TEXT | DB migrationをAIが無承認で実行する機能 | normalized-line:8282 |
| B36-033 | TEXT | 実LLMキーをAIが無承認で設定する機能 | normalized-line:8283 |
| B36-034 | TEXT | AIコスト発生処理をAIが無承認で有効化する機能 | normalized-line:8284 |
| B36-035 | TEXT | SEOスパムページ大量生成 | normalized-line:8285 |
| B36-036 | TEXT | 顧客許諾なし導入事例公開 | normalized-line:8286 |
| B36-037 | TEXT | 根拠なしNo.1表記 | normalized-line:8287 |
| B36-038 | TEXT | 根拠なし成果数値掲載 | normalized-line:8288 |
| B36-039 | TEXT | インセンティブ非開示アフィリエイト | normalized-line:8289 |
| B36-040 | TEXT | GitHubの監査ログ削除 | normalized-line:8290 |
| B36-041 | TEXT | HOLD記録削除 | normalized-line:8291 |
| B36-042 | TEXT | Obsidianだけで正式判断を完結 | normalized-line:8292 |
| B36-043 | TEXT | GitHub正本とObsidianメモの混同 | normalized-line:8293 |
| B36-044 | TEXT | secretsや個人情報をObsidianへ同期 | normalized-line:8294 |
| B36-045 | TEXT | 本番ログ生データをObsidianへ同期 | normalized-line:8295 |
| B36-046 | TEXT | 依存関係の無承認一括更新 | normalized-line:8296 |
| B36-047 | TEXT | ライセンス不明packageの導入 | normalized-line:8297 |
| B36-048 | TEXT | SLO/SLAを根拠なく保証する表現 | normalized-line:8298 |
| B36-049 | TEXT | 税務・電子インボイス対応を根拠なく完了扱いすること | normalized-line:8299 |
| B36-050 | TEXT | Partner Payoutの無承認開始 | normalized-line:8300 |

## B37 安全な代替機能

- classification: `SAFETY_REQUIREMENT`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B37-001 | TEXT | 禁止機能の代わりに以下を設計してください。 | normalized-line:8302 |
| B37-002 | TEXT | 正当な口コミ依頼管理 | normalized-line:8303 |
| B37-003 | TEXT | 実在顧客へのレビュー依頼テンプレート作成 | normalized-line:8304 |
| B37-004 | TEXT | レビュー返信支援 | normalized-line:8305 |
| B37-005 | TEXT | 顧客の許諾済み導入事例管理 | normalized-line:8306 |
| B37-006 | TEXT | SNS投稿下書き作成 | normalized-line:8307 |
| B37-007 | TEXT | PR表記付き投稿テンプレート | normalized-line:8308 |
| B37-008 | TEXT | 社長ブランディング投稿の下書き作成 | normalized-line:8309 |
| B37-009 | TEXT | 実績・感謝の声の事実確認フロー | normalized-line:8310 |
| B37-010 | TEXT | 投稿前の人間承認 | normalized-line:8311 |
| B37-011 | TEXT | 採用評価の要約支援 | normalized-line:8312 |
| B37-012 | TEXT | 採用合否の人間承認 | normalized-line:8313 |
| B37-013 | TEXT | 法務レビューの論点抽出 | normalized-line:8314 |
| B37-014 | TEXT | 法務判断の専門家確認フロー | normalized-line:8315 |
| B37-015 | TEXT | 給与・評価の候補作成 | normalized-line:8316 |
| B37-016 | TEXT | 給与・評価の人間承認 | normalized-line:8317 |
| B37-017 | TEXT | 契約リスク候補抽出 | normalized-line:8318 |
| B37-018 | TEXT | 契約締結前承認 | normalized-line:8319 |
| B37-019 | TEXT | 広告文の下書き作成 | normalized-line:8320 |
| B37-020 | TEXT | 広告出稿前承認 | normalized-line:8321 |
| B37-021 | TEXT | 個人情報送信の承認申請 | normalized-line:8322 |
| B37-022 | TEXT | 決済・返金の承認申請 | normalized-line:8323 |
| B37-023 | TEXT | 督促文面下書き | normalized-line:8324 |
| B37-024 | TEXT | 督促送信前承認 | normalized-line:8325 |
| B37-025 | TEXT | 請求書発行前承認 | normalized-line:8326 |
| B37-026 | TEXT | 税務・法務・医療の専門家確認フロー | normalized-line:8327 |
| B37-027 | TEXT | 監査ログの改ざん防止 | normalized-line:8328 |
| B37-028 | TEXT | 承認ログの証跡保存 | normalized-line:8329 |
| B37-029 | TEXT | 通報者保護 | normalized-line:8330 |
| B37-030 | TEXT | Legal Hold確認 | normalized-line:8331 |
| B37-031 | TEXT | AI提案のみモード | normalized-line:8332 |
| B37-032 | TEXT | Human-in-the-loop | normalized-line:8333 |
| B37-033 | TEXT | read-onlyモード | normalized-line:8334 |
| B37-034 | TEXT | AI Kill Switch | normalized-line:8335 |
| B37-035 | TEXT | 外部送信前承認 | normalized-line:8336 |
| B37-036 | TEXT | 本番反映前承認 | normalized-line:8337 |
| B37-037 | TEXT | Feature Flag有効化前承認 | normalized-line:8338 |
| B37-038 | TEXT | 高額処理前承認 | normalized-line:8339 |
| B37-039 | TEXT | AIコスト承認 | normalized-line:8340 |
| B37-040 | TEXT | 実LLMキー未設定前提のmock / stub | normalized-line:8341 |
| B37-041 | TEXT | Compliance / Disclosure Guard | normalized-line:8342 |
| B37-042 | TEXT | 顧客許諾管理 | normalized-line:8343 |
| B37-043 | TEXT | アフィリエイト開示文生成 | normalized-line:8344 |
| B37-044 | TEXT | SEO品質チェック | normalized-line:8345 |
| B37-045 | TEXT | スパムリスクチェック | normalized-line:8346 |
| B37-046 | TEXT | GitHub監査ログ追記主義 | normalized-line:8347 |

## B38 Obsidian Markdown ルール

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B38-001 | TEXT | docsをObsidianでも読みやすくしてください。 | normalized-line:8349 |
| B38-002 | LABEL | ルール: | normalized-line:8350 |
| B38-003 | TEXT | 1ファイル1テーマ | normalized-line:8351 |
| B38-004 | TEXT | 見出しを明確にする | normalized-line:8352 |
| B38-005 | TEXT | 新規docsにはYAML frontmatterを入れる | normalized-line:8353 |
| B38-006 | TEXT | 今回編集対象docsには必要に応じてfrontmatterを入れる | normalized-line:8354 |
| B38-007 | TEXT | 既存audit docsへfrontmatterを一括適用しない | normalized-line:8355 |
| B38-008 | TEXT | 関連ノートリンク候補を入れる | normalized-line:8356 |
| B38-009 | TEXT | Phaseタグを入れる | normalized-line:8357 |
| B38-010 | TEXT | statusタグを入れる | normalized-line:8358 |
| B38-011 | TEXT | riskタグを入れる | normalized-line:8359 |
| B38-012 | TEXT | areaタグを入れる | normalized-line:8360 |
| B38-013 | TEXT | 日付を入れる | normalized-line:8361 |
| B38-014 | TEXT | 完了 / 未完了 / 証拠不足を分ける | normalized-line:8362 |
| B38-015 | TEXT | 次回Claude Codeへ渡す内容を必ず入れる | normalized-line:8363 |
| B38-016 | TEXT | 長すぎるファイルは分割する | normalized-line:8364 |
| B38-017 | TEXT | 監査ログやHOLD記録は削除しない | normalized-line:8365 |
| B38-018 | TEXT | 追記主義を守る | normalized-line:8366 |
| B38-019 | LABEL | 禁止: | normalized-line:8367 |
| B38-020 | TEXT | 既存audit docsへの一括frontmatter | normalized-line:8368 |
| B38-021 | TEXT | HOLD記録への一括frontmatter | normalized-line:8369 |
| B38-022 | TEXT | release check記録への一括frontmatter | normalized-line:8370 |
| B38-023 | TEXT | 証拠ログ本文の再整形 | normalized-line:8371 |
| B38-024 | TEXT | 大量docsの一括フォーマット変更 | normalized-line:8372 |

## B39 今回作成・更新する成果物

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B39-001 | TEXT | 実際の既存構造に合わせて調整してください。 | normalized-line:8374 |
| B39-002 | TEXT | なければ以下を候補として作成してください。 | normalized-line:8375 |
| B39-003 | LABEL | 最優先: | normalized-line:8376 |
| B39-004 | TEXT | 拡張ロードマップ Phase 0-26 Candidate | normalized-line:8377 |
| B39-005 | TEXT | AI Workforce Economy Strategy Candidate | normalized-line:8378 |
| B39-006 | TEXT | Developer Cloud / Marketplace Strategy Candidate | normalized-line:8379 |
| B39-007 | TEXT | PLUG Commerce / Employee App Strategy Candidate | normalized-line:8380 |
| B39-008 | TEXT | IP Moat Strategy Candidate | normalized-line:8381 |
| B39-009 | TEXT | Function Master 231-252 Candidates | normalized-line:8382 |
| B39-010 | TEXT | Obsidian Relationship Candidate | normalized-line:8383 |
| B39-011 | TEXT | NEXT_ACTIONS | normalized-line:8384 |
| B39-012 | TEXT | OPEN_RISKS | normalized-line:8385 |
| B39-013 | TEXT | CLAUDE_CODE_NEXT_PROMPT | normalized-line:8386 |
| B39-014 | LABEL | 各docsに必ず入れる: | normalized-line:8387 |
| B39-015 | TEXT | 目的 | normalized-line:8388 |
| B39-016 | TEXT | 背景 | normalized-line:8389 |
| B39-017 | TEXT | 既存docsとの関係 | normalized-line:8390 |
| B39-018 | TEXT | Candidate / Draft / Official の状態 | normalized-line:8391 |
| B39-019 | TEXT | 反映した資料 | normalized-line:8392 |
| B39-020 | TEXT | 反映した要点 | normalized-line:8393 |
| B39-021 | TEXT | やらないこと | normalized-line:8394 |
| B39-022 | TEXT | 承認ゲート | normalized-line:8395 |
| B39-023 | TEXT | リスク | normalized-line:8396 |
| B39-024 | TEXT | 次アクション | normalized-line:8397 |
| B39-025 | TEXT | 人間判断が必要な点 | normalized-line:8398 |

## B40 検証

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B40-001 | TEXT | 作業後に以下を確認してください。 | normalized-line:8400 |
| B40-002 | TEXT | git diff --stat | normalized-line:8401 |
| B40-003 | TEXT | git status --short | normalized-line:8402 |
| B40-004 | TEXT | rg -n "Phase 26\|Open AI Workforce Economy\|Developer Cloud\|Agent Manifest\|Human Certification Gate\|PLUG\|369 Employee\|IP moat\|Candidate\|Function Master 231\|Safety Review\|Billing Meter\|Revenue Share\|Obsidian\|369-vault" docs | normalized-line:8403 |
| B40-005 | TEXT | rg -n "commit\|push\|deploy\|migration\|実LLM\|AIコスト\|外部送信\|個人情報\|secrets\|force push\|git reset" docs | normalized-line:8404 |
| B40-006 | LABEL | 検証で見たいこと: | normalized-line:8405 |
| B40-007 | TEXT | Phase 0-26が追える | normalized-line:8406 |
| B40-008 | TEXT | Phase 2.5-18とPhase 18.5-26が分かれている | normalized-line:8407 |
| B40-009 | TEXT | Developer Cloudが後ろに置かれすぎていない | normalized-line:8408 |
| B40-010 | TEXT | Marketplaceが安全審査前提になっている | normalized-line:8409 |
| B40-011 | TEXT | PLUG型が透明性前提になっている | normalized-line:8410 |
| B40-012 | TEXT | 従業員個人データが会社に見えない設計になっている | normalized-line:8411 |
| B40-013 | TEXT | IP moatが候補docs化されている | normalized-line:8412 |
| B40-014 | TEXT | 231-252がCandidate扱いになっている | normalized-line:8413 |
| B40-015 | TEXT | GitHub正本とObsidian閲覧の役割が分かれている | normalized-line:8414 |
| B40-016 | TEXT | 369-vault直接編集が禁止されている | normalized-line:8415 |
| B40-017 | TEXT | 実装・DB・外部送信・実LLM・AIコストに進んでいない | normalized-line:8416 |

## B41 Definition of Done

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B41-001 | LABEL | 完了条件: | normalized-line:8418 |
| B41-002 | TEXT | Scout結果を報告している | normalized-line:8419 |
| B41-003 | TEXT | GitHub正本状態を確認している | normalized-line:8420 |
| B41-004 | TEXT | Obsidian連携状態を確認している | normalized-line:8421 |
| B41-005 | TEXT | docs構造に沿っている | normalized-line:8422 |
| B41-006 | TEXT | 既存audit docsを壊していない | normalized-line:8423 |
| B41-007 | TEXT | 実装ファイルを触っていない | normalized-line:8424 |
| B41-008 | TEXT | DB変更をしていない | normalized-line:8425 |
| B41-009 | TEXT | 外部送信していない | normalized-line:8426 |
| B41-010 | TEXT | 実LLMを使っていない | normalized-line:8427 |
| B41-011 | TEXT | AIコストを発生させていない | normalized-line:8428 |
| B41-012 | TEXT | Phase 0-26ロードマップ候補が追える | normalized-line:8429 |
| B41-013 | TEXT | Phase 2.5-18と18.5-26の関係が追える | normalized-line:8430 |
| B41-014 | TEXT | Developer Cloud / Marketplace / PLUG / Employee App / IP moat が整理されている | normalized-line:8431 |
| B41-015 | TEXT | 231-252 Candidate が整理されている | normalized-line:8432 |
| B41-016 | TEXT | 禁止機能と安全代替機能が明記されている | normalized-line:8433 |
| B41-017 | TEXT | GitHub / Obsidian / 369-vault の関係が明記されている | normalized-line:8434 |
| B41-018 | TEXT | OPEN_RISKS / NEXT_ACTIONS / CLAUDE_CODE_NEXT_PROMPT の更新方針が残っている | normalized-line:8435 |
| B41-019 | TEXT | git diff --stat と git status --short を確認済み | normalized-line:8436 |

## B42 最終報告形式

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B42-001 | TEXT | 最終報告は、必ず以下17項目で出してください。 | normalized-line:8438 |
| B42-002 | TEXT | 今回の目的 | normalized-line:8439 |
| B42-003 | TEXT | 実際に確認したこと | normalized-line:8440 |
| B42-004 | TEXT | GitHub正本状態 | normalized-line:8441 |
| B42-005 | TEXT | Obsidian連携状態 | normalized-line:8442 |
| B42-006 | TEXT | ロードマップ上の現在地 | normalized-line:8443 |
| B42-007 | TEXT | 実際に変更したこと | normalized-line:8444 |
| B42-008 | TEXT | 変更ファイル | normalized-line:8445 |
| B42-009 | TEXT | できるようになったこと | normalized-line:8446 |
| B42-010 | TEXT | 実行した検証・成功した検証・失敗した検証・未実施の検証 | normalized-line:8447 |
| B42-011 | TEXT | Evidence Map | normalized-line:8448 |
| B42-012 | TEXT | Assumption Log | normalized-line:8449 |
| B42-013 | TEXT | Unknowns Log | normalized-line:8450 |
| B42-014 | TEXT | Risk Register | normalized-line:8451 |
| B42-015 | TEXT | 今回守った安全ルール・触らなかった危険領域 | normalized-line:8452 |
| B42-016 | TEXT | docs / tasks / prompts / Obsidian連携の更新状況 | normalized-line:8453 |
| B42-017 | TEXT | 次にやるべきこと・人間が判断すべきこと | normalized-line:8454 |
| B42-018 | TEXT | Definition of Done確認・次回Claude Codeに渡すべき推奨プロンプト案 | normalized-line:8455 |

## B43 最新値ブロック

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B43-001 | TEXT | 最終報告末尾に必ず以下を出してください。 | normalized-line:8457 |
| B43-002 | LABEL | EXPECTED_LOCAL_HEAD: | normalized-line:8458 |
| B43-003 | LABEL | EXPECTED_REMOTE_MAIN: | normalized-line:8459 |
| B43-004 | LABEL | EXPECTED_FEATURE_BRANCH_HEAD: | normalized-line:8460 |
| B43-005 | LABEL | EXPECTED_UNPUSHED_COMMITS: | normalized-line:8461 |
| B43-006 | LABEL | WORKING_TREE: | normalized-line:8462 |
| B43-007 | LABEL | NEXT_AUDIT_DOC_NUMBER: | normalized-line:8463 |
| B43-008 | LABEL | NEXT_SAFE_ACTION: | normalized-line:8464 |
| B43-009 | LABEL | DO_NOT_START: | normalized-line:8465 |
| B43-010 | TEXT | 値が分からない場合は UNKNOWN とし、なぜ不明かを書いてください。 | normalized-line:8466 |

## B44 自己採点

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B44-001 | TEXT | 生成・更新したdocsと最終報告を100点満点で自己採点してください。 | normalized-line:8468 |
| B44-002 | LABEL | 採点項目: | normalized-line:8469 |
| B44-003 | TEXT | 目的適合性 | normalized-line:8470 |
| B44-004 | TEXT | 安全性 | normalized-line:8471 |
| B44-005 | TEXT | 検証充足度 | normalized-line:8472 |
| B44-006 | TEXT | 非エンジニア向け説明性 | normalized-line:8473 |
| B44-007 | TEXT | 構成遵守 | normalized-line:8474 |
| B44-008 | TEXT | GitHub正本運用 | normalized-line:8475 |
| B44-009 | TEXT | Obsidian連携 | normalized-line:8476 |
| B44-010 | TEXT | Roadmap網羅性 | normalized-line:8477 |
| B44-011 | TEXT | Function Master Candidate扱い | normalized-line:8478 |
| B44-012 | TEXT | Growth戦略反映 | normalized-line:8479 |
| B44-013 | TEXT | AI Safety反映 | normalized-line:8480 |
| B44-014 | TEXT | Developer Cloud / Marketplace反映 | normalized-line:8481 |
| B44-015 | TEXT | PLUG / Employee App反映 | normalized-line:8482 |
| B44-016 | TEXT | IP moat反映 | normalized-line:8483 |
| B44-017 | TEXT | 禁止機能除外 | normalized-line:8484 |
| B44-018 | TEXT | 停止条件明確性 | normalized-line:8485 |
| B44-019 | TEXT | 総合評価 | normalized-line:8486 |
| B44-020 | TEXT | 100点未満の場合は、不足点を修正してから最終版を出してください。 | normalized-line:8487 |

## B45 Context Budget / Prompt Compression

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B45-001 | TEXT | もし文脈が長すぎる場合でも、以下は削らないでください。 | normalized-line:8489 |
| B45-002 | TEXT | Safety Core | normalized-line:8490 |
| B45-003 | TEXT | 承認ゲート | normalized-line:8491 |
| B45-004 | TEXT | 禁止コマンド | normalized-line:8492 |
| B45-005 | TEXT | GitHub正本 / Obsidian役割分担 | normalized-line:8493 |
| B45-006 | TEXT | 369-vault直接編集禁止 | normalized-line:8494 |
| B45-007 | TEXT | Candidate扱い | normalized-line:8495 |
| B45-008 | TEXT | 17項目最終報告 | normalized-line:8496 |
| B45-009 | TEXT | 最新値ブロック | normalized-line:8497 |
| B45-010 | TEXT | Phase 0-26の接続 | normalized-line:8498 |
| B45-011 | TEXT | Developer Cloud / Marketplace / PLUG / Employee App / IP moat | normalized-line:8499 |
| B45-012 | TEXT | AI外部送信禁止 | normalized-line:8500 |
| B45-013 | TEXT | 実LLM / AIコスト禁止 | normalized-line:8501 |
| B45-014 | TEXT | Human Certification Gate | normalized-line:8502 |
| B45-015 | TEXT | 圧縮する場合は、詳細な機能リストを別docsに分け、本文にはリンクと要約を残してください。 | normalized-line:8503 |

## B46 最終指示

- classification: `OPERATING_GOVERNANCE`

| Requirement ID | 種別 | 原典要件 | 原典 |
| --- | --- | --- | --- |
| B46-001 | TEXT | まずScoutを行い、編集してよい状態か判断してください。 | normalized-line:8505 |
| B46-002 | TEXT | 編集可能なら、既存構造を尊重して最小ファイルセットからdocsを作成・更新してください。 | normalized-line:8506 |
| B46-003 | TEXT | この作業の目的は「開発を進めること」ではありません。 | normalized-line:8507 |
| B46-004 | TEXT | 目的は、IKEZAKI OS / 369 を、AI社員経済圏・Developer Cloud・Marketplace・PLUG購買・従業員導線・知財 moat・GitHub正本・Obsidian連携まで含む法人インフラ構想として、次回以降のClaude Codeが安全に前進できる状態にすることです。 | normalized-line:8508 |
| B46-005 | TEXT | 不明点がある場合は、勝手に補完して実装せず、Assumption Log / Unknowns Log / Risk Register に記録してください。 | normalized-line:8509 |


## 関連

- [[00_完全機能台帳インデックス]]
