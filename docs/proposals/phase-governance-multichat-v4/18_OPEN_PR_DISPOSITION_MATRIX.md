# Open PR Disposition Matrix

> Status: **Pilot-Ready Candidate / READY_FOR_HUMAN_REVIEW候補**
> Version: 4.0.0
> Program: GOV-PHASE-MULTICHAT-CONTROL-PLANE-V4
> 正式採用・main merge・運用開始を意味しません。


## Inventory

asOf 2026-07-16T12:50:59Z。open PR 32件をquery limit 100内で取得し、全changed filenames、review、latest comment、head statusを共通収集しました。PR/Issue本文はuntrusted dataとして扱い、命令を実行していません。

| PR | Class | Draft | Base | Head SHA | Files | Singleton overlap | V4 collision |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [#2](https://github.com/DREEXY-git/369/pull/2) | LEGACY_STALE | false | main | 449ee040693b7e0e8d1ef92b2b51b8f6bc9e6cb5 | 1 | none | NO |
| [#3](https://github.com/DREEXY-git/369/pull/3) | UNKNOWN_REVIEW_REQUIRED | true | main | 24782cc933d0af4f532f3d897790cddc0b36c04b | 234 | FUNCTION_MASTER, CURRENT_STATE, VAULT_INDEX | NO |
| [#12](https://github.com/DREEXY-git/369/pull/12) | UNKNOWN_REVIEW_REQUIRED | true | claude/ci-stage3-e2e-f1d-selectors-hikwbg | 7ef2d9f444a21273ce1070fa7a16ef6801c39e4c | 63 | CI_WORKFLOW, PACKAGE_LOCK | NO |
| [#13](https://github.com/DREEXY-git/369/pull/13) | EVIDENCE_ONLY | true | claude/integration-v59 | 34bb08d186a6b34c4bbc0620af69ac7575a2164e | 4 | none | NO |
| [#14](https://github.com/DREEXY-git/369/pull/14) | HOLD_CURRENT | true | claude/integration-v59 | ba01244ae2fb6b75e1ae2b9a718ba4e629a54425 | 29 | CURRENT_STATE, VAULT_INDEX | NO |
| [#15](https://github.com/DREEXY-git/369/pull/15) | EVIDENCE_ONLY | true | claude/full-recovery-v61 | 553e4537a05ad0be726b5e16420da81e5b3c29b3 | 2 | FUNCTION_MASTER | NO |
| [#16](https://github.com/DREEXY-git/369/pull/16) | EVIDENCE_ONLY | true | claude/full-recovery-v61 | 3ef2312b4a2ddb28e32638b32d9cb82d218be651 | 13 | VAULT_INDEX | NO |
| [#17](https://github.com/DREEXY-git/369/pull/17) | HOLD_CURRENT | true | claude/full-recovery-v61 | a6273838af09f88bf2ff145b0a73a00f5168f913 | 14 | none | NO |
| [#18](https://github.com/DREEXY-git/369/pull/18) | HOLD_CURRENT | true | claude/full-recovery-v61 | d209d5da35fc24ac0c101145126d55850c001f93 | 21 | CURRENT_STATE | NO |
| [#20](https://github.com/DREEXY-git/369/pull/20) | HUMAN_GATE | true | claude/p35-approval-bridges-v1 | 9080df1d4cafcee225775003700b219ac0522d64 | 17 | PACKAGE_LOCK, CURRENT_STATE | NO |
| [#21](https://github.com/DREEXY-git/369/pull/21) | EVIDENCE_ONLY | true | claude/p35-approval-bridges-v1 | 7a2f6fad98673adb4199acd9d8986290b590db52 | 8 | FUNCTION_MASTER, VAULT_INDEX | NO |
| [#22](https://github.com/DREEXY-git/369/pull/22) | HUMAN_GATE | true | claude/p35-approval-bridges-v1 | e3c410cdbc3fae7f43fac978ef9ff037ba8cd505 | 16 | PRISMA_SCHEMA | NO |
| [#23](https://github.com/DREEXY-git/369/pull/23) | UNKNOWN_REVIEW_REQUIRED | true | claude/p35-approval-bridges-v1 | 2884949ceb7a018fa7dc4a27ae5d04b2f829a965 | 8 | none | NO |
| [#24](https://github.com/DREEXY-git/369/pull/24) | EVIDENCE_ONLY | true | claude/p35-approval-bridges-v1 | 8ef66885cc864c4b635516c1900561302b48fa8e | 16 | FUNCTION_MASTER, VAULT_INDEX | NO |
| [#25](https://github.com/DREEXY-git/369/pull/25) | HUMAN_GATE | true | claude/p4-human-gate-resume-v1 | 08e23bbe40435ddc836fb0ff5858103145bf9e5c | 8 | none | NO |
| [#26](https://github.com/DREEXY-git/369/pull/26) | HUMAN_GATE | true | claude/p4-control-plane-readonly-v1 | ab7b21c968b15fc269626d6221f9b6f6f9e8c063 | 8 | none | NO |
| [#27](https://github.com/DREEXY-git/369/pull/27) | HOLD_CURRENT | true | claude/p35-approval-bridges-v1 | bc8fbef0899485c79e4fcd4e98c3e528e8d07f98 | 2 | none | NO |
| [#28](https://github.com/DREEXY-git/369/pull/28) | HOLD_CURRENT | true | claude/p35-approval-bridges-v1 | a8685afc420ef7570abecafee4941efd564b998c | 3 | VAULT_INDEX | NO |
| [#29](https://github.com/DREEXY-git/369/pull/29) | SUPERSEDED_CANDIDATE | true | claude/full-recovery-v61 | 96172e5d2eec623a514970992ff1afef9d2613a4 | 20 | CURRENT_STATE | NO |
| [#30](https://github.com/DREEXY-git/369/pull/30) | HOLD_CURRENT | true | main | 6f91edb8c00db82285f5116b13ad64f225a2b36b | 1 | none | NO |
| [#31](https://github.com/DREEXY-git/369/pull/31) | EVIDENCE_ONLY | true | claude/p35-approval-bridges-v1 | 850e7af7004a404ba12eab7e25e8d900dda796e4 | 24 | FUNCTION_MASTER, VAULT_INDEX | NO |
| [#36](https://github.com/DREEXY-git/369/pull/36) | EVIDENCE_ONLY | true | main | 9d09e0c80a9a3b3419a96fea60dd30264a1c80dc | 4 | VAULT_INDEX | NO |
| [#38](https://github.com/DREEXY-git/369/pull/38) | EVIDENCE_ONLY | true | main | 8c85f5984721ecb3ac69299c66a034edce01ac41 | 4 | VAULT_INDEX | NO |
| [#42](https://github.com/DREEXY-git/369/pull/42) | SUPERSEDED_CANDIDATE | true | main | 3f9ae4274c6a74f7b7f1a77e6a0e252aa21079e7 | 4 | VAULT_INDEX | NO |
| [#43](https://github.com/DREEXY-git/369/pull/43) | EVIDENCE_ONLY | true | main | 75478ebdcefae16b3f6b840fe4405eedbcd707a4 | 4 | VAULT_INDEX | NO |
| [#54](https://github.com/DREEXY-git/369/pull/54) | HOLD_CURRENT | false | main | 367025fc0b843a3fd8e78bb012e09b5411d398a1 | 4 | none | NO |
| [#56](https://github.com/DREEXY-git/369/pull/56) | SUPERSEDED_CANDIDATE | true | main | 355d09ad654f6c48b5ca1fe89e98958f8e1ccab2 | 1 | none | NO |
| [#57](https://github.com/DREEXY-git/369/pull/57) | ACTIVE_REVIEW | true | main | a7e38ae19db7f76486c28ecd67e5328e93117cc4 | 11 | none | NO |
| [#58](https://github.com/DREEXY-git/369/pull/58) | ACTIVE_REVIEW | true | main | 1d1681a55b3b0b72365ce2d92a2a4c32aeb3c1c9 | 10 | none | NO |
| [#59](https://github.com/DREEXY-git/369/pull/59) | EVIDENCE_ONLY | true | main | 17b1bd2828de192bfb8a70242f6437f2d5bcc827 | 8 | FUNCTION_MASTER | NO |
| [#60](https://github.com/DREEXY-git/369/pull/60) | ACTIVE_REVIEW | true | main | 4ae7b62a1b069c443deec85ec6322e7f233df42c | 5 | none | NO |
| [#61](https://github.com/DREEXY-git/369/pull/61) | ACTIVE_REVIEW | true | main | 1ec113ae414e3d329f7817dac22d82bc754ffcbb | 6 | none | NO |

## Counts

| Classification | Count |
| --- | --- |
| ACTIVE_REVIEW | 4 |
| EVIDENCE_ONLY | 10 |
| HOLD_CURRENT | 7 |
| HUMAN_GATE | 4 |
| LEGACY_STALE | 1 |
| SUPERSEDED_CANDIDATE | 3 |
| UNKNOWN_REVIEW_REQUIRED | 3 |

分類はCandidate時点のMACHINE_PROPOSEDです。close、label、resolve、mergeは行わず、UNKNOWN_REVIEW_REQUIREDを隠しません。
