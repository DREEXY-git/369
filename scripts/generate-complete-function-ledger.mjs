import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXPECTED_SOURCE_SHA256 =
  "a07458fb3fdd9218ce3473a87246ff14c8fecc42b0a24e0c21e68a1a71884667";
const BT = String.fromCharCode(96);
const SEPARATOR = "⸻";

const CATEGORY_NAMES = [
  "Core OS / Tenant基盤",
  "Enterprise Identity / Admin",
  "Permission / Approval / Audit",
  "AI Governance / Agent Control Plane",
  "AI Safety / Evaluation / Red Team",
  "Data Governance / Semantic Layer",
  "Company Brain / Knowledge OS",
  "CRM / Customer 360",
  "SFA / Sales OS",
  "Quote / Pricing / Product Master",
  "Contract / Legal Ops",
  "Invoice / Billing",
  "Payment / Reconciliation",
  "Accounting / Finance",
  "ERP / Operations",
  "EC / POS / Reservation",
  "Procurement / PLUG / Price Compare",
  "AD OS / Growth Engine",
  "Ads Management",
  "SNS / LINE / Email / DM",
  "SEO / Content / PR",
  "Referral / Affiliate / Creator",
  "HR / Recruiting",
  "Labor / People Ops",
  "Education / Academy",
  "Customer Support / CS",
  "Project / Task / Workflow",
  "BI / Dashboard / Reporting",
  "Business Simulator / Digital Twin",
  "AI Employee Platform",
  "AI Employee Development Environment",
  "AI Employee Marketplace",
  "Developer Platform",
  "Integration Hub / Adapter",
  "Browser Extension / Desktop / Mobile",
  "Billing / Metering / FinOps",
  "Trust Center / Compliance Center",
  "Consent / Privacy / Data Protection",
  "Security / Zero Trust",
  "Observability / SRE / Incident",
  "Onboarding / Migration",
  "Vertical Template Factory",
  "White-label / Embedded",
  "International / Multi-region",
  "Physical AI / IoT / Robotics",
  "Governance Docs / GitHub / Obsidian",
  "Sales / Partner / Go-to-market Ops",
  "Risk / Insurance / Liability",
  "App Review / Marketplace Governance",
  "Community / Ecosystem Analytics",
];

const EXPECTED_CATEGORY_COUNTS = [
  62, 50, 73, 97, 60, 79, 60, 90, 62, 65,
  54, 56, 34, 49, 57, 69, 52, 71, 53, 60,
  54, 54, 38, 49, 39, 53, 51, 52, 36, 57,
  52, 50, 38, 63, 45, 50, 57, 41, 45, 43,
  52, 40, 25, 24, 32, 49, 36, 39, 0, 36,
];

const CATEGORY_DETAIL_HEADINGS = new Map([
  ["C22", "Referral / Affiliate / Creator / Business Network"],
]);

const B_SECTION_DEFINITIONS = [
  [0, "0", "結論", "OPERATING_GOVERNANCE"],
  [1, "1", "最重要安全ルール", "OPERATING_GOVERNANCE"],
  [2, "2", "Scout: 編集前に必ず確認すること", "OPERATING_GOVERNANCE"],
  [3, "3", "作業モード", "OPERATING_GOVERNANCE"],
  [4, "4", "Definition of Ready", "OPERATING_GOVERNANCE"],
  [5, "5", "GitHub / Obsidian / Claude Code / ChatGPT の役割分担", "OPERATING_GOVERNANCE"],
  [6, "6", "推奨GitHub docs構造", "OPERATING_GOVERNANCE"],
  [7, "7", "IKEZAKI OS / 369 の本質", "PRODUCT_ARCHITECTURE"],
  [8, "8", "369は何ではないか", "PRODUCT_ARCHITECTURE"],
  [9, "9", "5つの中核思想", "PRODUCT_ARCHITECTURE"],
  [10, "10", "10の理念", "PRODUCT_ARCHITECTURE"],
  [11, "11", "AI社員 / AI補助社員 / ツール", "PRODUCT_ARCHITECTURE"],
  [12, "12", "Company Brain", "PRODUCT_ARCHITECTURE"],
  [13, "13", "8層構造", "PRODUCT_ARCHITECTURE"],
  [14, "1", "4層インフラ構造", "PRODUCT_ARCHITECTURE"],
  [15, "2", "ロードマップの接続ルール", "ROADMAP_STRATEGY"],
  [16, "16", "PDFロードマップ Phase 2.5-18", "ROADMAP_STRATEGY"],
  [17, "17", "戦略構想ロードマップ Phase 18.5-26", "ROADMAP_STRATEGY"],
  [18, "18", "事業ロードマップ Phase 0-20", "ROADMAP_STRATEGY"],
  [19, "19", "時系列ロードマップ", "ROADMAP_STRATEGY"],
  [20, "20", "Developer Cloud 詳細", "PRODUCT_ARCHITECTURE"],
  [21, "21", "AI社員パッケージ標準構造", "PRODUCT_ARCHITECTURE"],
  [22, "22", "Permission & Approval Protocol", "SAFETY_REQUIREMENT"],
  [23, "23", "Evaluation Framework", "SAFETY_REQUIREMENT"],
  [24, "24", "課金 / Metering / Billing", "PRODUCT_ARCHITECTURE"],
  [25, "25", "Marketplace", "PRODUCT_ARCHITECTURE"],
  [26, "26", "Safety Review / Certification", "SAFETY_REQUIREMENT"],
  [27, "27", "Developer Portal", "PRODUCT_ARCHITECTURE"],
  [28, "28", "PLUG型システムの価値", "PRODUCT_ARCHITECTURE"],
  [29, "29", "369 Employee App", "PRODUCT_ARCHITECTURE"],
  [30, "30", "知財 / moat 戦略", "STRATEGY_REQUIREMENT"],
  [31, "31", "Function Master", "FUNCTION_MASTER"],
  [32, "32", "231-252 Candidate の詳細反映方針", "CANDIDATE_DETAIL"],
  [33, "33", "広告費ゼロ成長ループ", "GROWTH_REQUIREMENT"],
  [34, "34", "導入必然性トリガー", "GROWTH_REQUIREMENT"],
  [35, "35", "紹介したくなる動機", "GROWTH_REQUIREMENT"],
  [36, "36", "入れてはいけない機能", "PROHIBITED_REQUIREMENT"],
  [37, "37", "安全な代替機能", "SAFETY_REQUIREMENT"],
  [38, "38", "Obsidian Markdown ルール", "OPERATING_GOVERNANCE"],
  [39, "39", "今回作成・更新する成果物", "OPERATING_GOVERNANCE"],
  [40, "40", "検証", "OPERATING_GOVERNANCE"],
  [41, "41", "Definition of Done", "OPERATING_GOVERNANCE"],
  [42, "42", "最終報告形式", "OPERATING_GOVERNANCE"],
  [43, "43", "最新値ブロック", "OPERATING_GOVERNANCE"],
  [44, "44", "自己採点", "OPERATING_GOVERNANCE"],
  [45, "45", "Context Budget / Prompt Compression", "OPERATING_GOVERNANCE"],
  [46, "46", "最終指示", "OPERATING_GOVERNANCE"],
].map(function (entry) {
  return {
    number: entry[0],
    sourceNumber: entry[1],
    title: entry[2],
    classification: entry[3],
  };
});

const FUNCTION_MASTER_GROUPS = [
  ["CORE", "既存コア領域:", 24, "OFFICIAL_EXISTING"],
  ["V21", "v2.1追加50領域:", 50, "OFFICIAL_ADDITION"],
  ["V40", "v4.0 Growth追加領域:", 20, "OFFICIAL_ADDITION"],
  ["V50", "v5.0 GitHub / Obsidian追加領域:", 10, "OFFICIAL_ADDITION"],
  ["V51", "v5.1 Candidate:", 9, "CANDIDATE"],
  ["V52", "v5.2 Candidate:", 13, "CANDIDATE"],
].map(function (entry) {
  return {
    code: entry[0],
    heading: entry[1],
    expectedCount: entry[2],
    status: entry[3],
  };
});

const USER_REQUIREMENTS = [
  ["USR-001", "単一コピペ統合プロンプト", "Claude Codeへ一度貼るだけで使える、分割されていないMarkdown統合プロンプトを維持する。"],
  ["USR-002", "ロードマップ現在地コックピット", "全体ロードマップ、現在の進捗、できるようになったこと、次に可能にすることを毎回明示する。"],
  ["USR-003", "3Dバーチャルオフィス", "AI社員がどこで何をしているか、状態・担当・進捗・承認待ち・異常を3D空間で直感的に確認できるようにする。"],
  ["USR-004", "Outcome & Human Time Ledger", "人間の労働時間削減と成果増加を、推測ではなく証拠付き指標として継続計測する。"],
  ["USR-005", "GitHub・Obsidian毎回同期", "各作業でGitHub正本とObsidian閲覧鏡像の更新要否を判定し、変更時は両方の同期証拠を残す。"],
  ["USR-006", "WIP制限と確実な前進", "WIPを原則1に制限し、Definition of Ready、完了ゲート、Evidence Map、停止条件で行き当たりばったりを防ぐ。"],
  ["USR-007", "既知Critical・High脆弱性0", "既知のCritical・High脆弱性0を出荷条件とし、未検証を0件として扱わずUNKNOWNを明示する。"],
  ["USR-008", "世界一の証拠ゲート", "世界シェア1位など未検証の主張を禁止し、指標・比較対象・計測日・出典・達成条件を定義して証明する。"],
  ["USR-009", "完全機能台帳の必須同期", "原典の全機能を安定ID付きで正本化し、統合プロンプト、ロードマップ、実装証拠から必須参照する。"],
].map(function (entry) {
  return { id: entry[0], title: entry[1], requirement: entry[2] };
});

function parseArgs(argv) {
  let source = process.env.FUNCTION_LEDGER_SOURCE || null;
  let check = false;

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--check") {
      check = true;
    } else if (argv[index] === "--source") {
      source = argv[index + 1];
      if (!source) {
        throw new Error("--source requires an absolute path to the canonical pasted-text.txt");
      }
      index += 1;
    } else {
      throw new Error("Unknown argument: " + argv[index]);
    }
  }

  if (!source) {
    throw new Error(
      "Canonical source is required. Pass --source /absolute/path/to/pasted-text.txt " +
      "or set FUNCTION_LEDGER_SOURCE.",
    );
  }

  return { source: path.resolve(source), check: check };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function canonicalLine(value) {
  return value.trim().replace(/\s+/g, " ");
}

function stripListHeading(value) {
  return canonicalLine(value).replace(/^\d+\.\s*/, "");
}

function isSeparator(value) {
  const normalized = canonicalLine(value);
  return normalized === "" || normalized === SEPARATOR;
}

function cleanRecordText(value) {
  return canonicalLine(value).replace(/^•\s*/, "");
}

function recordKind(value) {
  const normalized = canonicalLine(value);
  if (normalized.startsWith("•")) {
    return "BULLET";
  }
  if (normalized.endsWith(":") || normalized.endsWith("：")) {
    return "LABEL";
  }
  return "TEXT";
}

function escapeTableCell(value) {
  return String(value)
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>");
}

function sourceRef(lineNumber) {
  return "normalized-line:" + lineNumber;
}

function pad(value, width) {
  return String(value).padStart(width, "0");
}

function findExactLine(lines, expected, startIndex, endIndex) {
  const start = startIndex === undefined ? 0 : startIndex;
  const end = endIndex === undefined ? lines.length : endIndex;
  for (let index = start; index < end; index += 1) {
    if (canonicalLine(lines[index]) === expected) {
      return index;
    }
  }
  return -1;
}

function findContainingLine(lines, expected, startIndex) {
  const start = startIndex === undefined ? 0 : startIndex;
  for (let index = start; index < lines.length; index += 1) {
    if (lines[index].includes(expected)) {
      return index;
    }
  }
  return -1;
}

function extractGenericRecords(lines, startIndex, endIndex, prefix, classification) {
  const records = [];
  for (let index = startIndex; index < endIndex; index += 1) {
    if (isSeparator(lines[index])) {
      continue;
    }
    records.push({
      id: prefix + "-" + pad(records.length + 1, 3),
      classification: classification,
      kind: recordKind(lines[index]),
      text: cleanRecordText(lines[index]),
      sourceLine: index + 1,
    });
  }
  return records;
}

function collectStableIds(data) {
  const ids = [];
  data.categories.forEach(function (category) {
    ids.push(category.id);
    category.functions.forEach(function (item) {
      ids.push(item.id);
    });
  });
  data.globalRules.forEach(function (item) {
    ids.push(item.id);
  });
  data.appendixASupplement.forEach(function (item) {
    ids.push(item.id);
  });
  data.functionMasterRegions.forEach(function (item) {
    ids.push(item.id);
  });
  data.candidates.forEach(function (candidate) {
    ids.push(candidate.id);
    candidate.details.forEach(function (item) {
      ids.push(item.id);
    });
  });
  data.appendixBRequirements.forEach(function (section) {
    section.records.forEach(function (item) {
      ids.push(item.id);
    });
  });
  data.userRequirements.forEach(function (item) {
    ids.push(item.id);
  });
  return ids;
}

function parseSource(sourcePath) {
  assert(fs.existsSync(sourcePath), "Source attachment not found: " + sourcePath);
  const raw = fs.readFileSync(sourcePath, "utf8");
  const normalized = raw
    .replace(/\r\n/g, "\n")
    .replace(/[\u2028\u2029]/g, "\n")
    .replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const sourceSha256 = crypto.createHash("sha256").update(raw).digest("hex");
  const normalizedSha256 = crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex");
  assert(
    sourceSha256 === EXPECTED_SOURCE_SHA256,
    "The v1 source fingerprint changed. Create a new ledger version instead of overwriting v1.",
  );

  const appendixAStart = findContainingLine(lines, "BEGIN APPENDIX A RAW SOURCE");
  const appendixAEnd = findContainingLine(lines, "END APPENDIX A RAW SOURCE", appendixAStart + 1);
  const appendixBStart = findContainingLine(lines, "BEGIN APPENDIX B RAW SOURCE", appendixAEnd + 1);
  const appendixBEnd = findContainingLine(lines, "END APPENDIX B RAW SOURCE", appendixBStart + 1);

  assert(appendixAStart >= 0 && appendixAEnd > appendixAStart, "Appendix A markers are invalid");
  assert(appendixBStart >= 0 && appendixBEnd > appendixBStart, "Appendix B markers are invalid");

  const categorySummaryHeading = findExactLine(
    lines,
    "1. 全体カテゴリ一覧",
    appendixAStart,
    appendixAEnd,
  );
  assert(categorySummaryHeading >= 0, "Appendix A category summary heading is missing");

  const categories = CATEGORY_NAMES.map(function (name, index) {
    const number = index + 1;
    const categoryId = "C" + pad(number, 2);
    const summaryPrefix = String(number) + " " + name + " ";
    let summaryLine = -1;
    let description = "";

    for (
      let lineIndex = categorySummaryHeading + 1;
      lineIndex < appendixAEnd;
      lineIndex += 1
    ) {
      const value = canonicalLine(lines[lineIndex]);
      if (value.startsWith(summaryPrefix)) {
        summaryLine = lineIndex;
        description = value.slice(summaryPrefix.length);
        break;
      }
    }

    assert(summaryLine >= 0, categoryId + " summary line is missing");

    let detailHeading = -1;
    const detailHeadingName = CATEGORY_DETAIL_HEADINGS.get(categoryId) || name;
    for (
      let lineIndex = summaryLine + 1;
      lineIndex < appendixAEnd;
      lineIndex += 1
    ) {
      if (stripListHeading(lines[lineIndex]) === detailHeadingName) {
        detailHeading = lineIndex;
        break;
      }
    }

    return {
      id: categoryId,
      number: number,
      name: name,
      description: description,
      summaryLine: summaryLine + 1,
      detailHeadingIndex: detailHeading,
      sourceStatus: detailHeading >= 0 ? "SOURCE_DETAIL_PRESENT" : "SOURCE_DETAIL_MISSING",
      functions: [],
    };
  });

  const globalRulesHeading = findExactLine(
    lines,
    "1. 全体に共通する絶対ルール",
    categorySummaryHeading,
    appendixAEnd,
  );
  const finalShapeHeading = findExactLine(
    lines,
    "1. 369の最終完成形",
    globalRulesHeading + 1,
    appendixAEnd,
  );
  assert(globalRulesHeading >= 0 && finalShapeHeading > globalRulesHeading, "Appendix A global rule boundaries are invalid");

  categories.forEach(function (category, categoryIndex) {
    if (category.detailHeadingIndex < 0) {
      return;
    }

    let endIndex = globalRulesHeading;
    for (let nextIndex = categoryIndex + 1; nextIndex < categories.length; nextIndex += 1) {
      if (categories[nextIndex].detailHeadingIndex >= 0) {
        endIndex = categories[nextIndex].detailHeadingIndex;
        break;
      }
    }

    let context = "";
    for (
      let lineIndex = category.detailHeadingIndex + 1;
      lineIndex < endIndex;
      lineIndex += 1
    ) {
      const value = canonicalLine(lines[lineIndex]);
      if (isSeparator(value)) {
        continue;
      }
      if (value.startsWith("•")) {
        category.functions.push({
          id: category.id + "-" + pad(category.functions.length + 1, 3),
          context: context,
          text: cleanRecordText(value),
          sourceLine: lineIndex + 1,
        });
      } else {
        context = stripListHeading(value);
      }
    }

    assert(
      category.functions.length === EXPECTED_CATEGORY_COUNTS[categoryIndex],
      category.id +
        " expected " +
        EXPECTED_CATEGORY_COUNTS[categoryIndex] +
        " functions but found " +
        category.functions.length,
    );
  });

  const categoryFunctionCount = categories.reduce(function (total, category) {
    return total + category.functions.length;
  }, 0);
  assert(categoryFunctionCount === 2553, "Expected 2553 Appendix A atomic functions");

  const missingCategories = categories.filter(function (category) {
    return category.sourceStatus === "SOURCE_DETAIL_MISSING";
  });
  assert(
    missingCategories.length === 1 && missingCategories[0].id === "C49",
    "Only C49 may have a missing Appendix A detail section",
  );

  const globalRules = extractGenericRecords(
    lines,
    globalRulesHeading + 1,
    finalShapeHeading,
    "GAR",
    "GLOBAL_AI_RULE",
  );
  const appendixASupplement = extractGenericRecords(
    lines,
    finalShapeHeading,
    appendixAEnd,
    "A-SUP",
    "APPENDIX_A_SUPPLEMENT",
  );
  assert(globalRules.length === 51, "Expected 51 Global AI Rule records");
  assert(
    appendixASupplement.length === 1963,
    "Expected 1963 Appendix A supplement records",
  );

  let searchFrom = appendixBStart + 1;
  const bSections = B_SECTION_DEFINITIONS.map(function (definition) {
    const expected =
      definition.sourceNumber + ". " + definition.title;
    const headingIndex = findExactLine(lines, expected, searchFrom, appendixBEnd);
    assert(
      headingIndex >= 0,
      "Appendix B section heading is missing: " + expected,
    );
    searchFrom = headingIndex + 1;
    return Object.assign({}, definition, { headingIndex: headingIndex });
  });

  bSections.forEach(function (section, index) {
    section.endIndex =
      index + 1 < bSections.length
        ? bSections[index + 1].headingIndex
        : appendixBEnd;
  });

  const section31 = bSections.find(function (section) {
    return section.number === 31;
  });
  const functionMasterRegions = [];
  let groupSearchFrom = section31.headingIndex + 1;

  FUNCTION_MASTER_GROUPS.forEach(function (group, groupIndex) {
    const headingIndex = findExactLine(
      lines,
      group.heading,
      groupSearchFrom,
      section31.endIndex,
    );
    assert(headingIndex >= 0, "Function Master group is missing: " + group.heading);

    let endIndex = section31.endIndex;
    if (groupIndex + 1 < FUNCTION_MASTER_GROUPS.length) {
      const nextHeading = FUNCTION_MASTER_GROUPS[groupIndex + 1].heading;
      endIndex = findExactLine(
        lines,
        nextHeading,
        headingIndex + 1,
        section31.endIndex,
      );
      assert(endIndex >= 0, "Function Master next group is missing: " + nextHeading);
    }

    const groupRecords = [];
    for (let lineIndex = headingIndex + 1; lineIndex < endIndex; lineIndex += 1) {
      const value = canonicalLine(lines[lineIndex]);
      if (isSeparator(value) || value === "v2.1追加50領域") {
        continue;
      }
      if (group.code === "V52" && /^231-252/.test(value)) {
        continue;
      }
      if (group.code === "V52" && /^DB化・/.test(value)) {
        continue;
      }
      groupRecords.push({
        id: "FMR-" + group.code + "-" + pad(groupRecords.length + 1, 3),
        group: group.heading.replace(/:$/, ""),
        status: group.status,
        text: cleanRecordText(value),
        sourceLine: lineIndex + 1,
      });
    }

    assert(
      groupRecords.length === group.expectedCount,
      group.code +
        " expected " +
        group.expectedCount +
        " Function Master regions but found " +
        groupRecords.length,
    );
    functionMasterRegions.push.apply(functionMasterRegions, groupRecords);
    groupSearchFrom = headingIndex + 1;
  });

  assert(functionMasterRegions.length === 126, "Expected 126 Function Master region records");

  const section32 = bSections.find(function (section) {
    return section.number === 32;
  });
  const candidateHeadings = [];
  for (
    let lineIndex = section32.headingIndex + 1;
    lineIndex < section32.endIndex;
    lineIndex += 1
  ) {
    const match = canonicalLine(lines[lineIndex]).match(/^(23[1-9]|24[0-9]|25[0-2])\s+(.+)$/);
    if (match) {
      candidateHeadings.push({
        number: Number(match[1]),
        title: match[2],
        headingIndex: lineIndex,
      });
    }
  }

  assert(candidateHeadings.length === 22, "Expected FM231-FM252 candidate groups");
  candidateHeadings.forEach(function (candidate, index) {
    assert(candidate.number === 231 + index, "FM candidate sequence is not contiguous");
    const endIndex =
      index + 1 < candidateHeadings.length
        ? candidateHeadings[index + 1].headingIndex
        : section32.endIndex;
    candidate.details = [];
    for (
      let lineIndex = candidate.headingIndex + 1;
      lineIndex < endIndex;
      lineIndex += 1
    ) {
      const value = canonicalLine(lines[lineIndex]);
      if (isSeparator(value) || value === "含める:") {
        continue;
      }
      candidate.details.push({
        id:
          "FM" +
          String(candidate.number) +
          "-" +
          pad(candidate.details.length + 1, 3),
        text: cleanRecordText(value),
        kind: recordKind(value),
        sourceLine: lineIndex + 1,
      });
    }
    candidate.id = "FM" + String(candidate.number);
    candidate.sourceLine = candidate.headingIndex + 1;
    delete candidate.headingIndex;
  });
  assert(
    candidateHeadings.reduce(function (total, candidate) {
      return total + candidate.details.length;
    }, 0) === 349,
    "Expected 349 FM231-FM252 candidate detail records",
  );

  const appendixBRequirements = [];
  bSections.forEach(function (section) {
    if (section.number === 31 || section.number === 32) {
      return;
    }
    const records = extractGenericRecords(
      lines,
      section.headingIndex + 1,
      section.endIndex,
      "B" + pad(section.number, 2),
      section.classification,
    );
    appendixBRequirements.push({
      id: "B" + pad(section.number, 2),
      number: section.number,
      title: section.title,
      classification: section.classification,
      sourceLine: section.headingIndex + 1,
      records: records,
    });
  });
  assert(
    appendixBRequirements.reduce(function (total, section) {
      return total + section.records.length;
    }, 0) === 2362,
    "Expected 2362 Appendix B requirement records",
  );

  const result = {
    schemaVersion: "1.0",
    source: {
      filename: path.basename(sourcePath),
      rawSha256: sourceSha256,
      normalizedSha256: normalizedSha256,
      normalizedLineCount: lines.length,
      appendixA: {
        startLine: appendixAStart + 1,
        endLine: appendixAEnd + 1,
      },
      appendixB: {
        startLine: appendixBStart + 1,
        endLine: appendixBEnd + 1,
      },
    },
    categories: categories.map(function (category) {
      const copy = Object.assign({}, category);
      delete copy.detailHeadingIndex;
      return copy;
    }),
    globalRules: globalRules,
    appendixASupplement: appendixASupplement,
    functionMasterRegions: functionMasterRegions,
    candidates: candidateHeadings,
    appendixBRequirements: appendixBRequirements,
    userRequirements: USER_REQUIREMENTS,
  };
  const stableIds = collectStableIds(result);
  assert(stableIds.length === 7485, "Expected 7485 stable IDs");
  assert(
    new Set(stableIds).size === stableIds.length,
    "Stable Function IDs must be globally unique",
  );
  result.stableIdCount = stableIds.length;
  return result;
}

function categoryFilename(category) {
  return (
    category.id +
    "_" +
    category.name
      .replace(/\//g, " - ")
      .replace(/:/g, " -")
      .replace(/\s+/g, " ")
      .trim() +
    ".md"
  );
}

function categoryWikiName(category) {
  return categoryFilename(category).replace(/\.md$/, "");
}

function markdownTable(records, columns) {
  const output = [];
  output.push("| " + columns.map(function (column) { return column.label; }).join(" | ") + " |");
  output.push("| " + columns.map(function () { return "---"; }).join(" | ") + " |");
  records.forEach(function (record) {
    output.push(
      "| " +
        columns
          .map(function (column) {
            return escapeTableCell(column.value(record));
          })
          .join(" | ") +
        " |",
    );
  });
  return output.join("\n");
}

function frontmatter(title, area) {
  return [
    "---",
    "title: " + JSON.stringify(title),
    "status: generated-canonical-mirror",
    "area: " + area,
    "source: github-function-master",
    "tags:",
    "  - 369",
    "  - function-ledger",
    "  - generated",
    "---",
    "",
  ].join("\n");
}

function renderCanonicalMarkdown(data) {
  const categoryFunctionCount = data.categories.reduce(function (total, category) {
    return total + category.functions.length;
  }, 0);
  const candidateDetailCount = data.candidates.reduce(function (total, candidate) {
    return total + candidate.details.length;
  }, 0);
  const appendixBRecordCount = data.appendixBRequirements.reduce(function (total, section) {
    return total + section.records.length;
  }, 0);
  const lines = [];

  lines.push("# 369 / IKEZAKI OS 完全機能台帳 v1.0");
  lines.push("");
  lines.push("> GENERATED FILE: 手動編集禁止。原典または会話追加要件を変更し、生成スクリプトを再実行してください。");
  lines.push("");
  lines.push("## 正本ルール");
  lines.push("");
  lines.push("- 本ファイルはGitHub上の人間可読な機能正本です。機械可読版は " + BT + "COMPLETE_FUNCTION_LEDGER_V1.json" + BT + " です。");
  lines.push("- 実装済みかどうかは本台帳から推測せず、" + BT + "FUNCTION_IMPLEMENTATION_EVIDENCE_V1.md" + BT + " の証拠だけで判定します。");
  lines.push("- 新規タスク、Issue、PR、ロードマップ項目、統合プロンプトは、対象Function IDを最低1つ参照します。");
  lines.push("- C49の詳細機能は原典欠落です。FM237など別系列を根拠に、C49の欠落を勝手に埋めてはいけません。");
  lines.push("");
  lines.push("## 原典指紋");
  lines.push("");
  lines.push("- ファイル名: " + BT + data.source.filename + BT);
  lines.push("- raw SHA-256: " + BT + data.source.rawSha256 + BT);
  lines.push("- normalized SHA-256: " + BT + data.source.normalizedSha256 + BT);
  lines.push("- normalized lines: " + data.source.normalizedLineCount);
  lines.push("- Appendix A: lines " + data.source.appendixA.startLine + "-" + data.source.appendixA.endLine);
  lines.push("- Appendix B: lines " + data.source.appendixB.startLine + "-" + data.source.appendixB.endLine);
  lines.push("");
  lines.push("## 抽出集計");
  lines.push("");
  lines.push("- Appendix Aカテゴリ: 50");
  lines.push("- Appendix A原子機能: " + categoryFunctionCount);
  lines.push("- 詳細節欠落カテゴリ: 1（C49）");
  lines.push("- Appendix A共通AIルール記録: " + data.globalRules.length);
  lines.push("- Appendix A補足記録: " + data.appendixASupplement.length);
  lines.push("- Function Master領域: " + data.functionMasterRegions.length);
  lines.push("- FM231-FM252候補グループ: " + data.candidates.length);
  lines.push("- FM231-FM252候補詳細: " + candidateDetailCount);
  lines.push("- Appendix Bその他要件記録: " + appendixBRecordCount);
  lines.push("- 会話追加要件: " + data.userRequirements.length);
  lines.push("- 全系列の一意な安定ID: " + data.stableIdCount);
  lines.push("");
  lines.push("## 50カテゴリ索引");
  lines.push("");
  lines.push(
    markdownTable(data.categories, [
      { label: "Category", value: function (item) { return item.id; } },
      { label: "名称", value: function (item) { return item.name; } },
      { label: "役割", value: function (item) { return item.description; } },
      { label: "原子機能数", value: function (item) { return item.functions.length; } },
      { label: "原典状態", value: function (item) { return item.sourceStatus; } },
      { label: "原典", value: function (item) { return sourceRef(item.summaryLine); } },
    ]),
  );

  data.categories.forEach(function (category) {
    lines.push("");
    lines.push("## " + category.id + " " + category.name);
    lines.push("");
    lines.push(category.description);
    lines.push("");
    if (category.sourceStatus === "SOURCE_DETAIL_MISSING") {
      lines.push(
        "> SOURCE_DETAIL_MISSING: カテゴリ一覧には存在しますが、Appendix Aに詳細節がありません。未定義を実装済み・網羅済みとして扱わないでください。",
      );
      return;
    }
    lines.push(
      markdownTable(category.functions, [
        { label: "Function ID", value: function (item) { return item.id; } },
        { label: "小分類・文脈", value: function (item) { return item.context; } },
        { label: "原典機能", value: function (item) { return item.text; } },
        { label: "原典", value: function (item) { return sourceRef(item.sourceLine); } },
      ]),
    );
  });

  lines.push("");
  lines.push("## Global AI Rules");
  lines.push("");
  lines.push(
    markdownTable(data.globalRules, [
      { label: "Rule ID", value: function (item) { return item.id; } },
      { label: "種別", value: function (item) { return item.kind; } },
      { label: "原典要件", value: function (item) { return item.text; } },
      { label: "原典", value: function (item) { return sourceRef(item.sourceLine); } },
    ]),
  );

  lines.push("");
  lines.push("## Appendix A 補足機能・戦略記録");
  lines.push("");
  lines.push("50カテゴリ詳細後にある追加機能、追加19領域、差別化、MVP制約、設計docs候補を省略せず保持します。");
  lines.push("");
  lines.push(
    markdownTable(data.appendixASupplement, [
      { label: "Record ID", value: function (item) { return item.id; } },
      { label: "種別", value: function (item) { return item.kind; } },
      { label: "原典記録", value: function (item) { return item.text; } },
      { label: "原典", value: function (item) { return sourceRef(item.sourceLine); } },
    ]),
  );

  lines.push("");
  lines.push("## Function Master 126領域");
  lines.push("");
  lines.push(
    markdownTable(data.functionMasterRegions, [
      { label: "Function ID", value: function (item) { return item.id; } },
      { label: "系列", value: function (item) { return item.group; } },
      { label: "状態", value: function (item) { return item.status; } },
      { label: "領域", value: function (item) { return item.text; } },
      { label: "原典", value: function (item) { return sourceRef(item.sourceLine); } },
    ]),
  );

  lines.push("");
  lines.push("## FM231-FM252 Candidate");
  lines.push("");
  lines.push("> Candidateのまま保持します。DB・API・画面・正式Function Masterへの昇格は別承認です。");
  data.candidates.forEach(function (candidate) {
    lines.push("");
    lines.push("### " + candidate.id + " " + candidate.title);
    lines.push("");
    lines.push("- group source: " + sourceRef(candidate.sourceLine));
    lines.push("");
    lines.push(
      markdownTable(candidate.details, [
        { label: "Function ID", value: function (item) { return item.id; } },
        { label: "種別", value: function (item) { return item.kind; } },
        { label: "候補機能", value: function (item) { return item.text; } },
        { label: "原典", value: function (item) { return sourceRef(item.sourceLine); } },
      ]),
    );
  });

  lines.push("");
  lines.push("## Appendix B 要件");
  lines.push("");
  lines.push("Function MasterとFM231-FM252以外の、製品構造、ロードマップ、成長、安全、禁止、運用ガバナンスを節別に保持します。");
  data.appendixBRequirements.forEach(function (section) {
    lines.push("");
    lines.push("### " + section.id + " " + section.title);
    lines.push("");
    lines.push("- classification: " + BT + section.classification + BT);
    lines.push("- heading source: " + sourceRef(section.sourceLine));
    lines.push("");
    lines.push(
      markdownTable(section.records, [
        { label: "Requirement ID", value: function (item) { return item.id; } },
        { label: "種別", value: function (item) { return item.kind; } },
        { label: "原典要件", value: function (item) { return item.text; } },
        { label: "原典", value: function (item) { return sourceRef(item.sourceLine); } },
      ]),
    );
  });

  lines.push("");
  lines.push("## 会話追加要件");
  lines.push("");
  lines.push(
    markdownTable(data.userRequirements, [
      { label: "Function ID", value: function (item) { return item.id; } },
      { label: "名称", value: function (item) { return item.title; } },
      { label: "必須要件", value: function (item) { return item.requirement; } },
      { label: "原典", value: function () { return "user-conversation:2026-07-11"; } },
    ]),
  );
  lines.push("");

  return lines.join("\n");
}

function renderCategoryNote(category, data) {
  const lines = [];
  lines.push(frontmatter(category.id + " " + category.name, category.id));
  lines.push("# " + category.id + " " + category.name);
  lines.push("");
  lines.push("> GitHub正本 " + BT + "docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md" + BT + " からの生成鏡像です。手動編集禁止。");
  lines.push("");
  lines.push("## 役割");
  lines.push("");
  lines.push(category.description);
  lines.push("");
  lines.push("## 原典状態");
  lines.push("");
  lines.push("- status: " + BT + category.sourceStatus + BT);
  lines.push("- summary source: " + sourceRef(category.summaryLine));
  lines.push("- source SHA-256: " + BT + data.source.rawSha256 + BT);
  lines.push("");
  lines.push("## 機能");
  lines.push("");
  if (category.sourceStatus === "SOURCE_DETAIL_MISSING") {
    lines.push(
      "> C49は原典に詳細節がありません。FM237は別系列のCandidateであり、C49の欠落を自動補完するものではありません。",
    );
  } else {
    lines.push(
      markdownTable(category.functions, [
        { label: "Function ID", value: function (item) { return item.id; } },
        { label: "小分類・文脈", value: function (item) { return item.context; } },
        { label: "原典機能", value: function (item) { return item.text; } },
        { label: "原典", value: function (item) { return sourceRef(item.sourceLine); } },
      ]),
    );
  }
  lines.push("");
  lines.push("## 関連");
  lines.push("");
  lines.push("- [[00_完全機能台帳インデックス]]");
  lines.push("- [[案Bプラス並行前進とPhase3.5_Phase4開始]]");
  lines.push("");
  return lines.join("\n");
}

function renderObsidianIndex(data) {
  const lines = [];
  const functionCount = data.categories.reduce(function (total, category) {
    return total + category.functions.length;
  }, 0);
  lines.push(frontmatter("369 完全機能台帳インデックス", "function-master"));
  lines.push("# 369 完全機能台帳インデックス");
  lines.push("");
  lines.push("> GitHub正本の生成鏡像です。Obsidian側は閲覧専用とし、手動修正しません。");
  lines.push("");
  lines.push("## 正本");
  lines.push("");
  lines.push("- GitHub: " + BT + "docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.md" + BT);
  lines.push("- machine-readable: " + BT + "docs/function-master/COMPLETE_FUNCTION_LEDGER_V1.json" + BT);
  lines.push("- implementation evidence: " + BT + "docs/function-master/FUNCTION_IMPLEMENTATION_EVIDENCE_V1.md" + BT);
  lines.push("- raw SHA-256: " + BT + data.source.rawSha256 + BT);
  lines.push("");
  lines.push("## 集計");
  lines.push("");
  lines.push("- 50カテゴリ");
  lines.push("- Appendix A原子機能: " + functionCount);
  lines.push("- C49詳細節: " + BT + "SOURCE_DETAIL_MISSING" + BT);
  lines.push("- Function Master領域: " + data.functionMasterRegions.length);
  lines.push("- FM231-FM252: " + data.candidates.length + " Candidate groups");
  lines.push("- 会話追加要件: " + data.userRequirements.length);
  lines.push("");
  lines.push("## カテゴリ");
  lines.push("");
  data.categories.forEach(function (category) {
    lines.push(
      "- [[" +
        categoryWikiName(category) +
        "|" +
        category.id +
        " " +
        category.name +
        "]]: " +
        category.functions.length +
        " / " +
        category.sourceStatus,
    );
  });
  lines.push("");
  lines.push("## 横断台帳");
  lines.push("");
  lines.push("- [[90_Global_AI_Rules]]");
  lines.push("- [[91_AppendixA_Supplement]]");
  lines.push("- [[92_Function_Master_Regions]]");
  lines.push("- [[93_FM231_252_Candidates]]");
  lines.push("- [[94_AppendixB_Requirements]]");
  lines.push("- [[95_User_Additional_Requirements]]");
  lines.push("");
  lines.push("## 関連");
  lines.push("");
  lines.push("- [[完全機能台帳正本化とカテゴリ番号整合]]");
  lines.push("- [[案Bプラス並行前進とPhase3.5_Phase4開始]]");
  lines.push("");
  return lines.join("\n");
}

function renderSimpleMirror(title, area, intro, body) {
  return (
    frontmatter(title, area) +
    "# " +
    title +
    "\n\n" +
    "> GitHub完全機能台帳からの生成鏡像です。手動編集禁止。\n\n" +
    intro +
    "\n\n" +
    body +
    "\n\n## 関連\n\n- [[00_完全機能台帳インデックス]]\n"
  );
}

function renderOutputs(data) {
  const outputs = new Map();
  const githubDir = path.join(ROOT, "docs/function-master");
  const vaultDir = path.join(ROOT, "369-vault/知識/完全機能台帳");
  const canonicalMarkdown = renderCanonicalMarkdown(data);
  const machineReadable = JSON.stringify(data, null, 2) + "\n";

  outputs.set(
    path.join(githubDir, "COMPLETE_FUNCTION_LEDGER_V1.md"),
    canonicalMarkdown.replace(/\n*$/, "\n"),
  );
  outputs.set(
    path.join(githubDir, "COMPLETE_FUNCTION_LEDGER_V1.json"),
    machineReadable,
  );
  outputs.set(
    path.join(githubDir, "SOURCE_MANIFEST_V1.json"),
    JSON.stringify(
      {
        schemaVersion: data.schemaVersion,
        source: data.source,
        counts: {
          categories: data.categories.length,
          categoryFunctions: data.categories.reduce(function (total, category) {
            return total + category.functions.length;
          }, 0),
          globalRules: data.globalRules.length,
          appendixASupplement: data.appendixASupplement.length,
          functionMasterRegions: data.functionMasterRegions.length,
          candidateGroups: data.candidates.length,
          candidateDetails: data.candidates.reduce(function (total, candidate) {
            return total + candidate.details.length;
          }, 0),
          appendixBRequirements: data.appendixBRequirements.reduce(function (total, section) {
            return total + section.records.length;
          }, 0),
          userRequirements: data.userRequirements.length,
          stableIds: data.stableIdCount,
        },
        knownSourceGaps: [
          {
            id: "C49",
            status: "SOURCE_DETAIL_MISSING",
            note: "Appendix A category summary exists, but its detailed category section is absent.",
          },
        ],
      },
      null,
      2,
    ) + "\n",
  );

  outputs.set(
    path.join(vaultDir, "00_完全機能台帳インデックス.md"),
    renderObsidianIndex(data),
  );
  data.categories.forEach(function (category) {
    outputs.set(
      path.join(vaultDir, categoryFilename(category)),
      renderCategoryNote(category, data),
    );
  });

  outputs.set(
    path.join(vaultDir, "90_Global_AI_Rules.md"),
    renderSimpleMirror(
      "Global AI Rules",
      "ai-safety",
      "AIが行えることと、人間承認なしに行ってはいけないことの原典記録です。",
      markdownTable(data.globalRules, [
        { label: "Rule ID", value: function (item) { return item.id; } },
        { label: "種別", value: function (item) { return item.kind; } },
        { label: "原典要件", value: function (item) { return item.text; } },
        { label: "原典", value: function (item) { return sourceRef(item.sourceLine); } },
      ]),
    ),
  );
  outputs.set(
    path.join(vaultDir, "91_AppendixA_Supplement.md"),
    renderSimpleMirror(
      "Appendix A 補足機能・戦略記録",
      "function-master",
      "50カテゴリ詳細後の追加機能、追加19領域、差別化、MVP制約、設計docs候補です。",
      markdownTable(data.appendixASupplement, [
        { label: "Record ID", value: function (item) { return item.id; } },
        { label: "種別", value: function (item) { return item.kind; } },
        { label: "原典記録", value: function (item) { return item.text; } },
        { label: "原典", value: function (item) { return sourceRef(item.sourceLine); } },
      ]),
    ),
  );
  outputs.set(
    path.join(vaultDir, "92_Function_Master_Regions.md"),
    renderSimpleMirror(
      "Function Master 126領域",
      "function-master",
      "既存コア、v2.1、v4.0、v5.0、v5.1 Candidate、v5.2 Candidateを状態付きで保持します。",
      markdownTable(data.functionMasterRegions, [
        { label: "Function ID", value: function (item) { return item.id; } },
        { label: "系列", value: function (item) { return item.group; } },
        { label: "状態", value: function (item) { return item.status; } },
        { label: "領域", value: function (item) { return item.text; } },
        { label: "原典", value: function (item) { return sourceRef(item.sourceLine); } },
      ]),
    ),
  );

  const candidateLines = [];
  candidateLines.push("> Candidateのまま保持します。正式昇格は別承認です。");
  data.candidates.forEach(function (candidate) {
    candidateLines.push("");
    candidateLines.push("## " + candidate.id + " " + candidate.title);
    candidateLines.push("");
    candidateLines.push(
      markdownTable(candidate.details, [
        { label: "Function ID", value: function (item) { return item.id; } },
        { label: "種別", value: function (item) { return item.kind; } },
        { label: "候補機能", value: function (item) { return item.text; } },
        { label: "原典", value: function (item) { return sourceRef(item.sourceLine); } },
      ]),
    );
  });
  outputs.set(
    path.join(vaultDir, "93_FM231_252_Candidates.md"),
    renderSimpleMirror(
      "FM231-FM252 Candidate",
      "function-master",
      "22候補領域の詳細機能を安定ID付きで保持します。",
      candidateLines.join("\n"),
    ),
  );

  const bLines = [];
  data.appendixBRequirements.forEach(function (section) {
    bLines.push("## " + section.id + " " + section.title);
    bLines.push("");
    bLines.push("- classification: " + BT + section.classification + BT);
    bLines.push("");
    bLines.push(
      markdownTable(section.records, [
        { label: "Requirement ID", value: function (item) { return item.id; } },
        { label: "種別", value: function (item) { return item.kind; } },
        { label: "原典要件", value: function (item) { return item.text; } },
        { label: "原典", value: function (item) { return sourceRef(item.sourceLine); } },
      ]),
    );
    bLines.push("");
  });
  outputs.set(
    path.join(vaultDir, "94_AppendixB_Requirements.md"),
    renderSimpleMirror(
      "Appendix B 製品・戦略・安全・運用要件",
      "function-master",
      "Function MasterとFM231-FM252以外のAppendix B要件です。",
      bLines.join("\n"),
    ),
  );
  outputs.set(
    path.join(vaultDir, "95_User_Additional_Requirements.md"),
    renderSimpleMirror(
      "会話追加要件",
      "function-master",
      "原典添付後にユーザーが明示した必須機能・運用要件です。",
      markdownTable(data.userRequirements, [
        { label: "Function ID", value: function (item) { return item.id; } },
        { label: "名称", value: function (item) { return item.title; } },
        { label: "必須要件", value: function (item) { return item.requirement; } },
      ]),
    ),
  );

  return outputs;
}

function writeOrCheck(outputs, check) {
  const problems = [];
  outputs.forEach(function (content, outputPath) {
    if (check) {
      if (!fs.existsSync(outputPath)) {
        problems.push("MISSING " + path.relative(ROOT, outputPath));
        return;
      }
      const actual = fs.readFileSync(outputPath, "utf8");
      if (actual !== content) {
        problems.push("OUT_OF_SYNC " + path.relative(ROOT, outputPath));
      }
      return;
    }
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, content, "utf8");
  });

  if (problems.length > 0) {
    throw new Error("Generated ledger check failed:\n" + problems.join("\n"));
  }
}

const options = parseArgs(process.argv.slice(2));
const data = parseSource(options.source);
const outputs = renderOutputs(data);
writeOrCheck(outputs, options.check);

const summary = {
  mode: options.check ? "check" : "write",
  sourceSha256: data.source.rawSha256,
  categories: data.categories.length,
  categoryFunctions: data.categories.reduce(function (total, category) {
    return total + category.functions.length;
  }, 0),
  functionMasterRegions: data.functionMasterRegions.length,
  candidateGroups: data.candidates.length,
  candidateDetails: data.candidates.reduce(function (total, candidate) {
    return total + candidate.details.length;
  }, 0),
  stableIds: data.stableIdCount,
  outputFiles: outputs.size,
};

process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
