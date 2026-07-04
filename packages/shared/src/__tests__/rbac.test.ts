import { describe, it, expect } from 'vitest';
import {
  can,
  canForRoles,
  permissionsForRoles,
  ROLE_PERMISSIONS,
  isAiRole,
  isHumanUser,
} from '../rbac';
import { canAccessLabel } from '../labels';

describe('RBAC 権限判定', () => {
  it('OWNER は全権限を持つ', () => {
    expect(canForRoles(['OWNER'], 'finance', 'delete')).toBe(true);
    expect(canForRoles(['OWNER'], 'leadmap', 'external_send')).toBe(true);
    expect(canForRoles(['OWNER'], 'admin', 'approve')).toBe(true);
  });

  it('READ_ONLY は閲覧と AI 参照のみ', () => {
    expect(canForRoles(['READ_ONLY'], 'customer', 'read')).toBe(true);
    expect(canForRoles(['READ_ONLY'], 'customer', 'ai_read')).toBe(true);
    expect(canForRoles(['READ_ONLY'], 'customer', 'create')).toBe(false);
    expect(canForRoles(['READ_ONLY'], 'customer', 'delete')).toBe(false);
  });

  it('STAFF は作成・編集できるが承認と外部送信はできない', () => {
    expect(canForRoles(['STAFF'], 'deal', 'create')).toBe(true);
    expect(canForRoles(['STAFF'], 'deal', 'update')).toBe(true);
    expect(canForRoles(['STAFF'], 'deal', 'approve')).toBe(false);
    expect(canForRoles(['STAFF'], 'leadmap', 'external_send')).toBe(false);
  });

  it('AI ロールは外部送信・承認を構造的に持たない', () => {
    for (const role of ['AI_AGENT', 'AI_ASSISTANT'] as const) {
      const perms = ROLE_PERMISSIONS[role];
      expect(perms).not.toContain('*');
      expect(perms.some((p) => p.endsWith(':external_send'))).toBe(false);
      expect(perms.some((p) => p.endsWith(':approve'))).toBe(false);
      expect(isAiRole(role)).toBe(true);
    }
    expect(canForRoles(['AI_AGENT'], 'leadmap', 'external_send')).toBe(false);
    expect(canForRoles(['AI_AGENT'], 'customer', 'create')).toBe(true);
    expect(canForRoles(['AI_AGENT'], 'customer', 'ai_read')).toBe(true);
  });

  it('複数ロールの権限は和集合になる', () => {
    const perms = permissionsForRoles(['READ_ONLY', 'STAFF']);
    expect(can(perms, 'deal', 'create')).toBe(true);
  });

  it('ワイルドカードを解釈する', () => {
    expect(can(['customer:*'], 'customer', 'delete')).toBe(true);
    expect(can(['*:read'], 'finance', 'read')).toBe(true);
    expect(can(['customer:read'], 'finance', 'read')).toBe(false);
  });
});

describe('機密ラベルアクセス', () => {
  it('役員限定は OWNER/EXECUTIVE のみ', () => {
    expect(canAccessLabel(['OWNER'], 'EXECUTIVE_ONLY')).toBe(true);
    expect(canAccessLabel(['EXECUTIVE'], 'EXECUTIVE_ONLY')).toBe(true);
    expect(canAccessLabel(['STAFF'], 'EXECUTIVE_ONLY')).toBe(false);
  });

  it('人事機密は STAFF から見えない', () => {
    expect(canAccessLabel(['STAFF'], 'HR_CONFIDENTIAL')).toBe(false);
    expect(canAccessLabel(['ADMIN'], 'HR_CONFIDENTIAL')).toBe(true);
  });

  it('OWNER は常に全ラベルにアクセスできる', () => {
    expect(canAccessLabel(['OWNER'], 'STRICT_SECRET')).toBe(true);
    expect(canAccessLabel(['OWNER'], 'LEGAL_CONFIDENTIAL')).toBe(true);
  });

  it('外部士業は法務・財務機密を参照できる', () => {
    expect(canAccessLabel(['EXTERNAL_EXPERT'], 'LEGAL_CONFIDENTIAL')).toBe(true);
    expect(canAccessLabel(['EXTERNAL_EXPERT'], 'EXECUTIVE_ONLY')).toBe(false);
  });
});

describe('isHumanUser（AIロール拒否・Company Brain 書き込みの人間専用判定・Phase X-05-2）', () => {
  it('AI_AGENT は人間ではない（rbac 上 knowledge:create を持っていても書き込み層で拒否される）', () => {
    expect(isHumanUser({ roles: ['AI_AGENT'] })).toBe(false);
    // 前提の固定: AI_AGENT は rbac 上 knowledge:create を持つ（他機能の下書き用）。
    // だからこそ isHumanUser が actions 層の唯一の砦であることをテストで守る。
    expect(canForRoles(['AI_AGENT'], 'knowledge', 'create')).toBe(true);
  });

  it('AI_ASSISTANT は人間ではない', () => {
    expect(isHumanUser({ roles: ['AI_ASSISTANT'] })).toBe(false);
  });

  it('AIロールを含む混在 roles は安全側で人間扱いしない', () => {
    expect(isHumanUser({ roles: ['STAFF', 'AI_AGENT'] })).toBe(false);
    expect(isHumanUser({ roles: ['OWNER', 'AI_ASSISTANT'] })).toBe(false);
  });

  it('人間ロールのみなら人間扱いする', () => {
    expect(isHumanUser({ roles: ['OWNER'] })).toBe(true);
    expect(isHumanUser({ roles: ['STAFF'] })).toBe(true);
    expect(isHumanUser({ roles: ['ADMIN', 'STAFF'] })).toBe(true);
  });

  it('roles が空なら安全側で人間扱いしない', () => {
    expect(isHumanUser({ roles: [] })).toBe(false);
  });
});
