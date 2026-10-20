// ==============================================================================
// GHANA JHS ASSESSMENT PORTAL: EXCEL BROADSHEET EXPORT ENGINE
// Aligned with Ghana Education Service (GES) & NaCCA Continuous Assessment Standard
// Implements 50% Class Continuous Assessment (CATs, Quizzes, Projects) + 50% Exam
// WAEC BECE 2026 Stanine Grading (Grade 1 - 9) with Class Ranking
// ==============================================================================

import * as XLSX from "xlsx";

export interface LearnerRecord {
  id: string;
  student_id?: string;
  full_name: string;
  class_level?: string;
  gender?: string;
  email?: string;
  [key: string]: any;
}

export interface AssessmentRecord {
  id: string;
  title: string;
  subject?: string;
  class_level?: string;
  assessment_type?: string;
  max_score?: number;
  weight?: number;
  [key: string]: any;
}

export interface SubmissionRecord {
  id?: string;
  learner_id: string;
  assessment_id: string;
  score: number;
  max_score?: number;
  assessments?: AssessmentRecord;
  [key: string]: any;
}

export interface BroadsheetRow {
  sn: number;
  name: string;
  studentId: string;
  classLevel: string;
  classScore50: number; // Continuous assessment cumulated & scaled to 50%
  examsScore50: number; // Terminal exam scaled to 50%
  totalScore: number;   // Class Score (50%) + Exams Score (50%) = 100%
  rankNumber: number;
  rankString: string;   // e.g. "1st", "2nd", "3rd"
  grade: string;        // BECE 2026 stanine grade & remark, e.g. "Grade 1 (Excellent)"
}

/**
 * Ghana BECE 2026 Stanine Grading System
 * Grade 1: 90 - 100% -> Excellent
 * Grade 2: 80 - 89%  -> Very Good
 * Grade 3: 70 - 79%  -> Good
 * Grade 4: 60 - 69%  -> Credit
 * Grade 5: 55 - 59%  -> Credit
 * Grade 6: 50 - 54%  -> Pass
 * Grade 7: 45 - 49%  -> Pass
 * Grade 8: 40 - 44%  -> Pass
 * Grade 9:  0 - 39%  -> Fail
 */
export function getBECE2026Grade(totalScore: number): { grade: number; remark: string; fullRemark: string } {
  const s = Math.round(totalScore * 10) / 10;
  if (s >= 90) return { grade: 1, remark: "Excellent", fullRemark: "Grade 1 (Excellent)" };
  if (s >= 80) return { grade: 2, remark: "Very Good", fullRemark: "Grade 2 (Very Good)" };
  if (s >= 70) return { grade: 3, remark: "Good", fullRemark: "Grade 3 (Good)" };
  if (s >= 60) return { grade: 4, remark: "Credit", fullRemark: "Grade 4 (Credit)" };
  if (s >= 55) return { grade: 5, remark: "Credit", fullRemark: "Grade 5 (Credit)" };
  if (s >= 50) return { grade: 6, remark: "Pass", fullRemark: "Grade 6 (Pass)" };
  if (s >= 45) return { grade: 7, remark: "Pass", fullRemark: "Grade 7 (Pass)" };
  if (s >= 40) return { grade: 8, remark: "Pass", fullRemark: "Grade 8 (Pass)" };
  return { grade: 9, remark: "Fail", fullRemark: "Grade 9 (Fail)" };
}

/**
 * Format ordinal string (e.g. 1 -> 1st, 2 -> 2nd, 3 -> 3rd, 4 -> 4th)
 */
export function formatOrdinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * Aggregates scores for a list of learners based on their submissions and assessments.
 * - Class Score (50%): Cumulative marks of all CATs, quizzes, projects, and home assignments converted to 50%
 * - Exams Score (50%): Terminal examination converted to 50%
 * - Total (100%): Class Score + Exams Score
 * - Rank: Calculated within the specified class group (or across all)
 */
export function calculateBroadsheetData(
  learners: LearnerRecord[],
  assessments: AssessmentRecord[],
  submissions: SubmissionRecord[]
): BroadsheetRow[] {
  // Map submissions by learner_id
  const subsByLearner = new Map<string, SubmissionRecord[]>();
  submissions.forEach((sub) => {
    if (!sub.learner_id) return;
    const list = subsByLearner.get(sub.learner_id) || [];
    list.push(sub);
    subsByLearner.set(sub.learner_id, list);
  });

  // Map assessments by ID
  const asmtMap = new Map<string, AssessmentRecord>();
  assessments.forEach((a) => {
    if (a.id) asmtMap.set(a.id, a);
  });

  const rawRows = learners.map((learner) => {
    const learnerSubs = subsByLearner.get(learner.id) || [];

    let totalClassScoreEarned = 0;
    let totalClassMaxScore = 0;
    let examScoreEarned = 0;
    let examMaxScore = 0;
    let hasExam = false;

    // Track processed assessment IDs to prevent duplicates
    const processedAsmtIds = new Set<string>();

    learnerSubs.forEach((sub) => {
      const asmt = sub.assessments || asmtMap.get(sub.assessment_id);
      const asmtId = sub.assessment_id || asmt?.id;
      if (asmtId && processedAsmtIds.has(asmtId)) return;
      if (asmtId) processedAsmtIds.add(asmtId);

      // Strictly isolate assessment scoring by class stream (e.g. 9A only for 9A, 9B only for 9B)
      if (asmt?.class_level && learner.class_level && asmt.class_level.trim().toLowerCase() !== learner.class_level.trim().toLowerCase()) {
        return;
      }

      const asmtType = (asmt?.assessment_type || "").toUpperCase();
      const asmtTitle = (asmt?.title || "").toLowerCase();
      const score = Number(sub.score) || 0;
      const maxScore = Number(sub.max_score || asmt?.max_score || 20);

      // Check if this is a Terminal Exam
      if (asmtType === "EXAM" || asmtTitle.includes("end of term") || asmtTitle.includes("examination") || asmtTitle.includes("terminal exam")) {
        examScoreEarned = score;
        examMaxScore = maxScore > 0 ? maxScore : 50;
        hasExam = true;
      } else {
        // Continuous Assessment: CATs, Quizzes, Practical Projects, Homework
        totalClassScoreEarned += score;
        totalClassMaxScore += maxScore;
      }
    });

    // Determine baseline continuous assessment maximum if none submitted or incomplete
    // In Ghana standard, the curriculum has CAT 1 (20), CAT 2 (20), Project Work (30), Quizzes (20) = ~90 marks total.
    // If learner submitted assignments, convert earned / max to 50%.
    let classScore50 = 0;
    if (totalClassMaxScore > 0) {
      classScore50 = (totalClassScoreEarned / totalClassMaxScore) * 50;
    } else if (totalClassScoreEarned > 0) {
      // Fallback if max was somehow 0
      classScore50 = Math.min(50, totalClassScoreEarned);
    }

    // Convert exam to 50%
    let examsScore50 = 0;
    if (hasExam && examMaxScore > 0) {
      examsScore50 = (examScoreEarned / examMaxScore) * 50;
    }

    // Cap at 50 each
    classScore50 = Math.min(50, Math.max(0, classScore50));
    examsScore50 = Math.min(50, Math.max(0, examsScore50));

    // Round scores cleanly
    const roundedClassScore = Math.round(classScore50 * 100) / 100;
    const roundedExamsScore = Math.round(examsScore50 * 100) / 100;
    const roundedTotal = Math.round((roundedClassScore + roundedExamsScore) * 100) / 100;

    return {
      learner,
      classScore50: roundedClassScore,
      examsScore50: roundedExamsScore,
      totalScore: roundedTotal,
    };
  });

  // Calculate Ranking (Standard Competition Ranking within the list)
  // Sort descending by total score, then by class score
  rawRows.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.classScore50 - a.classScore50;
  });

  let currentRank = 1;
  const result: BroadsheetRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    if (i > 0) {
      const prev = rawRows[i - 1];
      const curr = rawRows[i];
      if (curr.totalScore < prev.totalScore) {
        currentRank = i + 1;
      }
    }

    const item = rawRows[i];
    const bece = getBECE2026Grade(item.totalScore);

    result.push({
      sn: i + 1,
      name: item.learner.full_name || "Unknown Learner",
      studentId: item.learner.student_id || "",
      classLevel: item.learner.class_level || "Basic 9A",
      classScore50: item.classScore50,
      examsScore50: item.examsScore50,
      totalScore: item.totalScore,
      rankNumber: currentRank,
      rankString: formatOrdinal(currentRank),
      grade: bece.fullRemark,
    });
  }

  return result;
}

/**
 * Builds an XLSX Worksheet for a set of Broadsheet rows
 */
function createClassWorksheet(rows: BroadsheetRow[], classTitle: string): XLSX.WorkSheet {
  const currentDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const headerData: any[][] = [
    // Row 1: Merged Banner Title (A1:G1)
    [{ t: "s", v: "GHANA EDUCATION SERVICE - NATIONAL BASIC EDUCATION ASSESSMENT" }],
    // Row 2: Merged Class Broadsheet Heading (A2:G2)
    [{ t: "s", v: `CONTINUOUS ASSESSMENT & TERMINAL BROADSHEET (BECE 2026 COMPLIANT) - ${classTitle.toUpperCase()}` }],
    // Row 3: Merged Metadata & Weighting Standard (A3:G3)
    [{ t: "s", v: `Subject: Computing | Weighting: Class Continuous Assessment (50%) + Terminal Exam (50%) = 100% | Generated: ${currentDate}` }],
    // Row 4: Blank Spacer Row
    [],
    // Row 5: Column Headers (Col A to G)
    [
      "S/N",
      "Name of Learner",
      "Class Score (converted to 50%)",
      "Exams Score (converted to 50%)",
      "Total",
      "Rank (Position)",
      "Remarks (Grade)",
    ],
  ];

  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // Row 1 Title A1:G1
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }, // Row 2 Heading A2:G2
    { s: { r: 2, c: 0 }, e: { r: 2, c: 6 } }, // Row 3 Metadata A3:G3
  ];

  const startRow = 6; // 1-indexed Excel row for first data row (Header is Row 5)
  const endRow = rows.length > 0 ? startRow + rows.length - 1 : startRow;

  if (rows.length === 0) {
    headerData.push([{ t: "s", v: "No registered learners found in this class stream yet." }]);
    merges.push({ s: { r: 5, c: 0 }, e: { r: 5, c: 6 } }); // Merge across empty notice
  } else {
    rows.forEach((r, idx) => {
      const rowNum = startRow + idx;
      headerData.push([
        // Col A: S/N
        idx + 1,
        // Col B: Name of Learner
        r.name,
        // Col C: Class Score (converted to 50%) - Raw numeric mark for continuous assessment
        Number(r.classScore50.toFixed(2)),
        // Col D: Exams Score (converted to 50%) - Raw numeric mark for terminal examination
        Number(r.examsScore50.toFixed(2)),
        // Col E: Total Score Formula: =ROUND(C{rowNum}+D{rowNum}, 2)
        // Automatically recomputes if teacher edits Class Score or Exam Score manually
        {
          t: "n",
          f: `ROUND(C${rowNum}+D${rowNum},2)`,
          v: Number(r.totalScore.toFixed(2)),
        },
        // Col F: Rank (Position) Formula: =RANK(E{rowNum}, $E${startRow}:$E${endRow})
        // Automatically ranks the student relative to their classmates
        {
          t: "n",
          f: `RANK(E${rowNum},$E$${startRow}:$E$${endRow})`,
          v: r.rankNumber,
        },
        // Col G: Remarks (Grade) Formula - Official Ghana WAEC BECE 2026 Stanine Grading Scale
        // Automatically calculates Grade 1 to Grade 9 based on the live Total Score cell
        {
          t: "s",
          f: `IF(E${rowNum}>=90,"Grade 1 (Excellent)",IF(E${rowNum}>=80,"Grade 2 (Very Good)",IF(E${rowNum}>=70,"Grade 3 (Good)",IF(E${rowNum}>=60,"Grade 4 (Credit)",IF(E${rowNum}>=55,"Grade 5 (Credit)",IF(E${rowNum}>=50,"Grade 6 (Pass)",IF(E${rowNum}>=45,"Grade 7 (Pass)",IF(E${rowNum}>=40,"Grade 8 (Pass)","Grade 9 (Fail)"))))))))`,
          v: r.grade,
        },
      ]);
    });

    // Summary Statistics Rows at the Bottom
    const totalMarksSum = rows.reduce((acc, curr) => acc + curr.totalScore, 0);
    const avgScore = totalMarksSum / rows.length;
    const highestScore = Math.max(...rows.map((r) => r.totalScore));
    const lowestScore = Math.min(...rows.map((r) => r.totalScore));

    const summaryHeaderRowIdx = endRow + 1; // 0-indexed row index
    headerData.push([]); // Spacer row
    headerData.push([{ t: "s", v: "--- CLASS SUMMARY STATISTICS ---" }]);
    merges.push({ s: { r: summaryHeaderRowIdx, c: 0 }, e: { r: summaryHeaderRowIdx, c: 6 } }); // Merge summary title

    const rLearnersIdx = summaryHeaderRowIdx + 1;
    headerData.push([
      "Total Registered Learners:",
      "",
      { t: "n", f: `COUNTA(B${startRow}:B${endRow})`, v: rows.length },
      "", "", "", "",
    ]);
    merges.push({ s: { r: rLearnersIdx, c: 0 }, e: { r: rLearnersIdx, c: 1 } });

    const rMeanIdx = rLearnersIdx + 1;
    const rMeanExcelRow = rMeanIdx + 1; // 1-indexed
    headerData.push([
      "Class Mean (Average Total):",
      "",
      { t: "n", f: `ROUND(AVERAGE(E${startRow}:E${endRow}),2)`, v: Number(avgScore.toFixed(2)) },
      {
        t: "s",
        f: `IF(C${rMeanExcelRow}>=90,"Grade 1 (Excellent)",IF(C${rMeanExcelRow}>=80,"Grade 2 (Very Good)",IF(C${rMeanExcelRow}>=70,"Grade 3 (Good)",IF(C${rMeanExcelRow}>=60,"Grade 4 (Credit)",IF(C${rMeanExcelRow}>=55,"Grade 5 (Credit)",IF(C${rMeanExcelRow}>=50,"Grade 6 (Pass)",IF(C${rMeanExcelRow}>=45,"Grade 7 (Pass)",IF(C${rMeanExcelRow}>=40,"Grade 8 (Pass)","Grade 9 (Fail)"))))))))`,
        v: getBECE2026Grade(avgScore).fullRemark,
      },
      "", "", "",
    ]);
    merges.push({ s: { r: rMeanIdx, c: 0 }, e: { r: rMeanIdx, c: 1 } });
    merges.push({ s: { r: rMeanIdx, c: 3 }, e: { r: rMeanIdx, c: 6 } });

    const rHighIdx = rMeanIdx + 1;
    const rHighExcelRow = rHighIdx + 1;
    headerData.push([
      "Highest Total Score Achieved:",
      "",
      { t: "n", f: `MAX(E${startRow}:E${endRow})`, v: Number(highestScore.toFixed(2)) },
      {
        t: "s",
        f: `IF(C${rHighExcelRow}>=90,"Grade 1 (Excellent)",IF(C${rHighExcelRow}>=80,"Grade 2 (Very Good)",IF(C${rHighExcelRow}>=70,"Grade 3 (Good)",IF(C${rHighExcelRow}>=60,"Grade 4 (Credit)",IF(C${rHighExcelRow}>=55,"Grade 5 (Credit)",IF(C${rHighExcelRow}>=50,"Grade 6 (Pass)",IF(C${rHighExcelRow}>=45,"Grade 7 (Pass)",IF(C${rHighExcelRow}>=40,"Grade 8 (Pass)","Grade 9 (Fail)"))))))))`,
        v: getBECE2026Grade(highestScore).fullRemark,
      },
      "", "", "",
    ]);
    merges.push({ s: { r: rHighIdx, c: 0 }, e: { r: rHighIdx, c: 1 } });
    merges.push({ s: { r: rHighIdx, c: 3 }, e: { r: rHighIdx, c: 6 } });

    const rLowIdx = rHighIdx + 1;
    const rLowExcelRow = rLowIdx + 1;
    headerData.push([
      "Lowest Total Score Achieved:",
      "",
      { t: "n", f: `MIN(E${startRow}:E${endRow})`, v: Number(lowestScore.toFixed(2)) },
      {
        t: "s",
        f: `IF(C${rLowExcelRow}>=90,"Grade 1 (Excellent)",IF(C${rLowExcelRow}>=80,"Grade 2 (Very Good)",IF(C${rLowExcelRow}>=70,"Grade 3 (Good)",IF(C${rLowExcelRow}>=60,"Grade 4 (Credit)",IF(C${rLowExcelRow}>=55,"Grade 5 (Credit)",IF(C${rLowExcelRow}>=50,"Grade 6 (Pass)",IF(C${rLowExcelRow}>=45,"Grade 7 (Pass)",IF(C${rLowExcelRow}>=40,"Grade 8 (Pass)","Grade 9 (Fail)"))))))))`,
        v: getBECE2026Grade(lowestScore).fullRemark,
      },
      "", "", "",
    ]);
    merges.push({ s: { r: rLowIdx, c: 0 }, e: { r: rLowIdx, c: 1 } });
    merges.push({ s: { r: rLowIdx, c: 3 }, e: { r: rLowIdx, c: 6 } });
  }

  const ws = XLSX.utils.aoa_to_sheet(headerData);

  // Apply merged ranges
  ws["!merges"] = merges;

  // Set column widths for optimal display
  ws["!cols"] = [
    { wch: 8 },  // Col A: S/N
    { wch: 32 }, // Col B: Name of Learner
    { wch: 32 }, // Col C: Class Score (converted to 50%)
    { wch: 32 }, // Col D: Exams Score (converted to 50%)
    { wch: 16 }, // Col E: Total
    { wch: 18 }, // Col F: Rank (Position)
    { wch: 28 }, // Col G: Remarks (Grade)
  ];

  return ws;
}

/**
 * Generates and triggers download of the complete multi-class Excel workbook
 * containing dedicated sheets for Basic 9A, Basic 9B, and All Classes.
 */
export function exportBroadsheetExcel(
  learners: LearnerRecord[],
  assessments: AssessmentRecord[],
  submissions: SubmissionRecord[],
  targetClass: string = "ALL"
): { filename: string; totalExported: number } {
  const wb = XLSX.utils.book_new();

  // If a specific class was requested
  if (targetClass && targetClass !== "ALL" && targetClass !== "ONLINE") {
    const classLearners = learners.filter((l) => (l.class_level || "").toLowerCase() === targetClass.toLowerCase());
    const classRows = calculateBroadsheetData(classLearners, assessments, submissions);
    const ws = createClassWorksheet(classRows, targetClass);
    XLSX.utils.book_append_sheet(wb, ws, targetClass.slice(0, 31));

    const cleanName = targetClass.replace(/\s+/g, "_");
    const filename = `Ghana_JHS_${cleanName}_Broadsheet_2026.xlsx`;
    XLSX.writeFile(wb, filename);
    return { filename, totalExported: classRows.length };
  }

  // Otherwise, create Master Broadsheet + individual sheets for each class stream
  // Group learners by class_level
  const classes = ["Basic 9A", "Basic 9B"];
  learners.forEach((l) => {
    const c = l.class_level || "Basic 9A";
    if (!classes.includes(c)) classes.push(c);
  });

  // 1. Master Sheet for All Learners
  const allRows = calculateBroadsheetData(learners, assessments, submissions);
  const masterWs = createClassWorksheet(allRows, "All Registered Classes");
  XLSX.utils.book_append_sheet(wb, masterWs, "All Classes Master");

  // 2. Individual Stream Sheets (Basic 9A, Basic 9B, etc.)
  classes.forEach((cLevel) => {
    const classLearners = learners.filter((l) => (l.class_level || "").toLowerCase() === cLevel.toLowerCase());
    if (classLearners.length > 0) {
      const classRows = calculateBroadsheetData(classLearners, assessments, submissions);
      const ws = createClassWorksheet(classRows, cLevel);
      // Sheet names max 31 characters in Excel
      const sheetName = cLevel.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
  });

  const filename = `Ghana_JHS_Broadsheet_BECE2026_All_Classes.xlsx`;
  XLSX.writeFile(wb, filename);

  return { filename, totalExported: allRows.length };
}
