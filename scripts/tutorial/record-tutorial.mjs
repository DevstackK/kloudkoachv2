// One-off script to record the in-app tutorial video. Not part of the app
// build - run manually with `node scripts/tutorial/record-tutorial.mjs`.
// Scene durations (SCENES_MS) must match the padded narration segments in
// scripts/tutorial/build-narration.sh so the final muxed video stays in sync.
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

// Deliberately targets a production build (`next start`), not `next dev` -
// the app's CSP (script-src 'self' 'unsafe-inline', no 'unsafe-eval')
// blocks Next dev mode's eval-based module execution, which silently
// breaks React state updates (inputs fill visually but onChange never
// fires) without throwing anywhere obvious.
const BASE_URL = "http://localhost:3001";
const OUT_DIR = path.resolve("tutorial-video-tmp");
fs.mkdirSync(OUT_DIR, { recursive: true });

const SCENES_MS = {
  intro: 9200,
  dashboard: 9800,
  liveCopilot: 12300,
  interviewPrep: 10700,
  aiInterviewer: 12300,
  resumeAndMore: 14600,
  outro: 6400,
};

async function typeSlow(locator, text, delay = 35) {
  await locator.click();
  await locator.pressSequentially(text, { delay });
}

async function scene(name, totalMs, fn) {
  const start = Date.now();
  console.log(`\n>>> scene: ${name} (target ${totalMs}ms)`);
  await fn();
  const elapsed = Date.now() - start;
  const remaining = totalMs - elapsed;
  console.log(`    elapsed ${elapsed}ms, padding ${Math.max(remaining, 0)}ms`);
  if (remaining > 0) {
    await new Promise((r) => setTimeout(r, remaining));
  } else {
    console.warn(`    ! scene "${name}" overran target by ${-remaining}ms`);
  }
}

const runId = Date.now();
const demoEmail = `tutorial.demo+${runId}@kloudkoach.app`;

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    recordVideo: { dir: OUT_DIR, size: { width: 1280, height: 800 } },
  });
  const page = await context.newPage();

  await scene("intro", SCENES_MS.intro, async () => {
    await page.goto(`${BASE_URL}/register`, { waitUntil: "load" });
    await page.waitForTimeout(400);
    await typeSlow(page.getByLabel("Full Name"), "Alex Morgan");
    await typeSlow(page.getByLabel("Email Address"), demoEmail);
    await typeSlow(page.getByLabel("Password"), "TutorialDemo123!");
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: "Get Started" }).click();
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 15000 });
  });

  await scene("dashboard", SCENES_MS.dashboard, async () => {
    await page.waitForTimeout(700);
    await page.mouse.wheel(0, 250);
    await page.waitForTimeout(600);
    await page.mouse.wheel(0, -250);
  });

  await scene("liveCopilot", SCENES_MS.liveCopilot, async () => {
    await page.goto(`${BASE_URL}/dashboard/interview`, { waitUntil: "load" });
    await page.waitForTimeout(500);
    await typeSlow(page.getByLabel("Job Role"), "Product Manager");
    await typeSlow(page.getByLabel("Job Description"), "Leading a cross-functional team shipping a B2B SaaS analytics product.");
    await page.locator('input[type="checkbox"]').first().check();
    await page.waitForTimeout(700);
  });

  await scene("interviewPrep", SCENES_MS.interviewPrep, async () => {
    await page.goto(`${BASE_URL}/dashboard/interview-preparation`, { waitUntil: "load" });
    await page.waitForTimeout(500);
    await typeSlow(page.getByLabel("Job Role"), "Software Engineer");
    await typeSlow(page.getByLabel("Job Description"), "Backend role focused on distributed systems and API design.");
    await page.waitForTimeout(700);
  });

  await scene("aiInterviewer", SCENES_MS.aiInterviewer, async () => {
    await page.goto(`${BASE_URL}/dashboard/ai-interviewer`, { waitUntil: "load" });
    await page.waitForTimeout(500);
    await typeSlow(page.getByLabel("Job Role"), "Data Analyst");
    await typeSlow(page.getByLabel("Job Description"), "SQL-heavy analytics role supporting the growth team.");
    await page.locator('input[type="checkbox"]').first().check();
    await page.waitForTimeout(700);
  });

  await scene("resumeAndMore", SCENES_MS.resumeAndMore, async () => {
    await page.goto(`${BASE_URL}/dashboard/resume-builder`, { waitUntil: "load" });
    await page.waitForTimeout(3800);
    await page.goto(`${BASE_URL}/dashboard/exam-preparation`, { waitUntil: "load" });
    await page.waitForTimeout(3200);
    await page.goto(`${BASE_URL}/dashboard/history`, { waitUntil: "load" });
    await page.waitForTimeout(3000);
    await page.goto(`${BASE_URL}/dashboard/upgrade`, { waitUntil: "load" });
    await page.waitForTimeout(3200);
  });

  await scene("outro", SCENES_MS.outro, async () => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "load" });
    await page.waitForTimeout(2000);
  });

  await page.close();
  await context.close();
  await browser.close();

  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith(".webm"));
  console.log("\nRecorded video file(s):", files);
  console.log("demoEmail used:", demoEmail);
})();
