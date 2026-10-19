// ==============================================================================
// GHANA JHS CONTINUOUS ASSESSMENT PORTAL: AI PEDAGOGICAL & TARGET ENGINE
// Incorporates Vygotsky's Zone of Proximal Development (ZPD), Goal Setting Theory,
// and Carol Dweck's Growth Mindset for intelligent formative assessment feedback.
// ==============================================================================

import type { AIPotentialProfile, NextTestEvaluationResult } from "./types";

const STORAGE_KEY = "jhs_learner_ai_target_state";

/**
 * 1. Compute Zone of Proximal Development (ZPD) Realistic Target
 * Calculates a mathematically sound, non-intimidating target score
 * tailored to the learner's current performance tier.
 */
export function calculateZpdTarget(
  currentScore: number,
  maxScore: number = 20
): { targetScore: number; targetPercentage: number; deltaDescription: string } {
  const currentPct = (currentScore / maxScore) * 100;
  let incrementMarks = 2.0;

  if (currentPct < 50) {
    // Needs Support (<50%): Target pass/solid foundation (+15% to +20%)
    incrementMarks = Math.min(3.5, maxScore - currentScore);
  } else if (currentPct < 70) {
    // Developing (50-69%): Target credit milestone (+10% to +15%)
    incrementMarks = Math.min(2.5, maxScore - currentScore);
  } else if (currentPct < 85) {
    // Proficient (70-84%): Target distinction threshold (+8% to +12%)
    incrementMarks = Math.min(2.0, maxScore - currentScore);
  } else {
    // Mastery (85-100%): Target high consistency or perfect score
    incrementMarks = Math.min(1.0, maxScore - currentScore);
  }

  const rawTarget = Math.round((currentScore + incrementMarks) * 2) / 2;
  const targetScore = Math.min(maxScore, Math.max(currentScore + 0.5, rawTarget));
  const targetPercentage = Math.round((targetScore / maxScore) * 100);
  const questionsNeeded = Math.max(1, Math.ceil(targetScore - currentScore));

  return {
    targetScore,
    targetPercentage,
    deltaDescription: `Achieving this requires mastering just ${questionsNeeded} more multiple-choice item${questionsNeeded > 1 ? "s" : ""} on your next sitting.`
  };
}

/**
 * 2. Analyze Performance & Extract Potentials
 * Evaluates rating, score, and error distribution to unveil the learner's
 * innate cognitive potentials and prescribe high-yield study actions.
 */
export function generateLearnerAIPotentials(
  learnerName: string,
  submission: {
    score?: number;
    max_score?: number;
    assessment_id?: string;
    learner_id?: string;
    correct_count?: number;
    incorrect_count?: number;
    teacher_remarks?: string;
  },
  assessmentTitle: string = "Computing CAT"
): AIPotentialProfile {
  const score = parseFloat(String(submission.score ?? 0));
  const maxScore = parseFloat(String(submission.max_score ?? 20));
  const pct = Math.round((score / maxScore) * 100);
  const { targetScore, targetPercentage, deltaDescription } = calculateZpdTarget(score, maxScore);

  let potentials: string[] = [];
  let actionLevers: string[] = [];
  let headline = "";
  let noticeMsg = "";
  let badge = "";

  if (pct >= 80) {
    badge = "Mastery Candidate";
    headline = `Outstanding Analytical Mastery, ${learnerName}! 🌟`;
    potentials = [
      "Demonstrates high-order abstract reasoning and rapid conceptual synthesis across computing topics.",
      "Consistently parses technical vocabulary and algorithmic problem statements without hesitation.",
      "Strong precision in distinguishing fine distinctions between computing protocols and hardware."
    ];
    actionLevers = [
      "Challenge yourself to convert logic problems directly into structured pseudocode without drawing flowcharts first.",
      "Explore advanced concepts in quantum computing fundamentals and end-to-end data encryption protocols."
    ];
    noticeMsg = `Your ${score.toFixed(1)}/${maxScore} (${pct}%) on ${assessmentTitle} demonstrates remarkable computing logic. Set your sights on ${targetScore.toFixed(1)}/${maxScore} (${targetPercentage}%) in the upcoming test to seal your position at the very top of your class!`;
  } else if (pct >= 65) {
    badge = "Credit Achiever";
    headline = `Strong Foundation with Distinction Potential, ${learnerName}! 🚀`;
    potentials = [
      "Solid comprehension of core computer hardware, networking concepts, and systems software.",
      "Reliable problem-solving baseline with quick identification of standard computing workflows.",
      "Maintains focus under timed conditions with healthy pacing across multiple-choice questions."
    ];
    actionLevers = [
      "Focus revision on flowchart decision diamonds (branching conditions: YES/NO decision loops).",
      "Dedicate 10 minutes to trace-table practice: trace variable updates row-by-row before selecting answers."
    ];
    noticeMsg = `With ${score.toFixed(1)}/${maxScore} (${pct}%), you are right on the doorstep of Distinction. Your realistic target for the next sitting is ${targetScore.toFixed(1)}/${maxScore} (${targetPercentage}%). ${deltaDescription}`;
  } else if (pct >= 50) {
    badge = "Developing Scholar";
    headline = `Steady Progress with High Growth Potential, ${learnerName}! ⚡`;
    potentials = [
      "Grasps everyday computing applications and common productivity tools with confidence.",
      "Displays strong persistence through complex technical questions under test time limits.",
      "Receptive cognitive baseline ready to turn partial understanding into complete mastery."
    ];
    actionLevers = [
      "Create active-recall flashcards for core definitions (perceptual computing, system vs application software).",
      "Slow down on question prompts to identify negative qualifiers such as 'NOT', 'EXCEPT', or 'NEVER'."
    ];
    noticeMsg = `You scored ${score.toFixed(1)}/${maxScore} (${pct}%). You have clear latent talent that is ready to emerge! Let's aim for ${targetScore.toFixed(1)}/${maxScore} (${targetPercentage}%) on the next CAT. ${deltaDescription}`;
  } else {
    badge = "Growth Frontier";
    headline = `You Have Untapped Potential Waiting to Emerge, ${learnerName}! 🌱`;
    potentials = [
      "Shows courage and stamina by engaging through the complete continuous assessment.",
      "Natural curiosity for computing concepts and digital technologies.",
      "With targeted practice on high-frequency questions, significant score breakthroughs happen quickly."
    ];
    actionLevers = [
      "Review the NaCCA Computing syllabus summary for basic input-process-output cycles.",
      "Pair with a study partner to review the explanations of missed items before the next quiz."
    ];
    noticeMsg = `Every great computer scientist started with small steps. Your target for the next sitting is a very reachable ${targetScore.toFixed(1)}/${maxScore} (${targetPercentage}%). ${deltaDescription}`;
  }

  const profile: AIPotentialProfile = {
    learnerId: submission.learner_id || "lrn-default",
    learnerName,
    sourceAssessmentId: submission.assessment_id || "",
    sourceAssessmentTitle: assessmentTitle,
    score,
    maxScore,
    percentage: pct,
    potentials,
    actionLevers,
    targetScore,
    targetPercentage,
    targetTangibleDelta: deltaDescription,
    motivationalNotice: {
      title: headline,
      message: noticeMsg,
      badge
    },
    assuranceScripts: {
      onAchieved: `🎉 Spectacular achievement, ${learnerName}! You set a goal of ${targetScore.toFixed(1)}/${maxScore} and conquered it. Your deliberate study strategy and focus made the difference. Step up with confidence!`,
      onMissed: `💛 Keep your chin up, ${learnerName}! A test score is diagnostic feedback, not a measure of your worth or future capability. You showed real courage today, and we now know exactly which concepts to strengthen next.`
    },
    status: "ACTIVE_TARGET",
    createdAt: new Date().toISOString()
  };

  saveActiveTarget(profile);
  return profile;
}

/**
 * 3. Save Active Target in Browser Storage
 */
export function saveActiveTarget(profile: AIPotentialProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn("Could not save AI target to localStorage:", err);
  }
}

/**
 * 4. Retrieve Current Active Target
 */
export function getActiveTarget(): AIPotentialProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * 5. Clear Active Target
 */
export function clearActiveTarget(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/**
 * 6. Dual-Outcome Evaluator: When the Next Test Arrives
 * Evaluates the new score against the active target and returns tailored
 * emotional assurance, effort attribution, and recalibrated next targets.
 */
export function evaluateNextTestOutcome(
  newScore: number,
  newMaxScore: number = 20,
  newAssessmentTitle: string = "Next CAT"
): NextTestEvaluationResult | null {
  const activeTarget = getActiveTarget();
  if (!activeTarget || activeTarget.status !== "ACTIVE_TARGET") {
    return null;
  }

  const target = activeTarget.targetScore;
  const isAchieved = newScore >= target;
  const diff = Math.round((newScore - target) * 10) / 10;
  const newPct = Math.round((newScore / newMaxScore) * 100);

  let assuranceTitle = "";
  let assuranceMessage = "";
  let badgeStyle = "";
  let nextRecalibratedTarget = 0;

  if (isAchieved) {
    assuranceTitle = `🎯 Target Conquered: ${newScore.toFixed(1)} / ${newMaxScore}!`;
    assuranceMessage = `Incredible work, ${activeTarget.learnerName}! You targeted ${target.toFixed(1)} after ${activeTarget.sourceAssessmentTitle} and you achieved ${newScore.toFixed(1)} (${newPct}%) on ${newAssessmentTitle}${diff > 0 ? ` (+${diff} above target)` : ""}! Your preparation and deliberate practice paid off directly.`;
    badgeStyle = "bg-emerald-500/20 text-emerald-300 border-emerald-400/30";
    activeTarget.status = "EVALUATED_ACHIEVED";
    nextRecalibratedTarget = Math.min(newMaxScore, Math.round((newScore + 1.5) * 2) / 2);
  } else {
    assuranceTitle = `🌱 You're Gaining Ground, ${activeTarget.learnerName}!`;
    assuranceMessage = `You scored ${newScore.toFixed(1)} / ${newMaxScore} (${newPct}%). Even though you were just shy of the ${target.toFixed(1)} milestone, progress in learning is never lost. You demonstrated courage under timed pressure, and every mistake highlights exactly what to review for the final term exams. Be proud of your effort!`;
    badgeStyle = "bg-amber-500/20 text-amber-300 border-amber-400/30";
    activeTarget.status = "EVALUATED_MISSED";
    nextRecalibratedTarget = Math.min(newMaxScore, Math.max(newScore + 1.0, Math.round((target - 0.5) * 2) / 2));
  }

  saveActiveTarget(activeTarget);

  return {
    isTargetAchieved: isAchieved,
    targetScore: target,
    achievedScore: newScore,
    difference: diff,
    assuranceTitle,
    assuranceMessage,
    badgeStyle,
    nextRecalibratedTarget
  };
}

/**
 * 7. HTML Renderer: AI Potentials & Target Projection Card
 * Renders a rich glassmorphic card for modals and result screens.
 */
export function renderAIPotentialCardHTML(profile: AIPotentialProfile): string {
  return `
    <div class="mt-6 rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 p-5 sm:p-6 text-white border border-indigo-500/30 shadow-xl text-left">
      <div class="flex items-center justify-between gap-3 pb-3 border-b border-indigo-800/50">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-bold border border-indigo-400/30 shrink-0">
            <i class="fa-solid fa-brain"></i>
          </div>
          <div>
            <span class="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">AI Pedagogical Diagnosis</span>
            <h4 class="text-sm font-bold text-white leading-tight">Learner Potentials &amp; Next Target</h4>
          </div>
        </div>
        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shrink-0">
          ${profile.motivationalNotice.badge}
        </span>
      </div>

      <!-- Potentials List -->
      <div class="mt-4">
        <span class="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
          <i class="fa-solid fa-sparkles text-amber-400"></i> Identified Capabilities:
        </span>
        <ul class="space-y-1.5 text-xs text-slate-200">
          ${profile.potentials
            .map(
              (p) => `
            <li class="flex items-start gap-2">
              <i class="fa-solid fa-circle-check text-emerald-400 text-[11px] mt-0.5 shrink-0"></i>
              <span class="leading-relaxed">${p}</span>
            </li>
          `
            )
            .join("")}
        </ul>
      </div>

      <!-- Action Levers (How to do better) -->
      <div class="mt-4 pt-3 border-t border-slate-800">
        <span class="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
          <i class="fa-solid fa-compass text-sky-400"></i> High-Yield Growth Levers:
        </span>
        <ul class="space-y-1.5 text-xs text-slate-200">
          ${profile.actionLevers
            .map(
              (a) => `
            <li class="flex items-start gap-2">
              <i class="fa-solid fa-arrow-trend-up text-sky-400 text-[11px] mt-0.5 shrink-0"></i>
              <span class="leading-relaxed">${a}</span>
            </li>
          `
            )
            .join("")}
        </ul>
      </div>

      <!-- Target Box -->
      <div class="mt-5 p-4 rounded-xl bg-indigo-900/40 border border-indigo-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span class="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Realistic Next Sitting Target</span>
          <div class="flex items-baseline gap-2 mt-0.5">
            <span class="text-2xl font-black text-amber-400">${profile.targetScore.toFixed(1)} / ${profile.maxScore}</span>
            <span class="text-xs font-bold text-emerald-400">(${profile.targetPercentage}%)</span>
          </div>
          <p class="text-[11px] text-slate-300 mt-1 leading-relaxed">${profile.targetTangibleDelta}</p>
        </div>
        <div class="shrink-0">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow-sm">
            <i class="fa-solid fa-flag-checkered"></i> Milestone Active
          </span>
        </div>
      </div>
    </div>
  `;
}

/**
 * 8. HTML Renderer: Post-Test Outcome Assurance Banner
 * Renders celebratory or reassuring feedback when the next test is submitted.
 */
export function renderAssuranceCardHTML(evaluation: NextTestEvaluationResult): string {
  const isAchieved = evaluation.isTargetAchieved;
  const borderCol = isAchieved ? "border-emerald-500/40" : "border-amber-500/40";
  const iconCol = isAchieved ? "text-emerald-400 bg-emerald-500/20" : "text-amber-400 bg-amber-500/20";
  const icon = isAchieved ? "fa-award" : "fa-heart-pulse";

  return `
    <div class="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white border ${borderCol} shadow-xl text-left my-4">
      <div class="flex items-start gap-3.5">
        <div class="w-10 h-10 rounded-xl ${iconCol} flex items-center justify-center text-lg shrink-0 border border-current">
          <i class="fa-solid ${icon}"></i>
        </div>
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${evaluation.badgeStyle}">
              ${isAchieved ? "Milestone Conquered" : "Growth Mindset Assurance"}
            </span>
            <span class="text-xs text-slate-400">• Goal Evaluation</span>
          </div>
          <h3 class="text-sm sm:text-base font-bold text-white mt-1">
            ${evaluation.assuranceTitle}
          </h3>
          <p class="text-xs text-slate-300 mt-1.5 leading-relaxed">
            ${evaluation.assuranceMessage}
          </p>
          <div class="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
            <span class="text-slate-400">Next Recalibrated Milestone:</span>
            <span class="font-bold text-amber-400">${evaluation.nextRecalibratedTarget.toFixed(1)} Marks</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
