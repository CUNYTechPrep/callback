// Seeds the demo user and a believable job search: statuses across the
// pipeline, events spread over weeks, follow-ups due soon and overdue.
// Idempotent by construction — run twice, same database.
// Standard recovery pair: `pnpm db:reset`, then `pnpm db:seed`.
// Run via: pnpm db:seed  (see docs/specs/jobs/seed.md)

import { prisma } from "@project/db";
import type { JobEventType, JobStatus, JobSource } from "@project/db";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

type SeedEvent = {
  type: JobEventType;
  daysAgo: number;
  from?: JobStatus;
  to?: JobStatus;
  note?: string;
};

type SeedJob = {
  company: string;
  title: string;
  status: JobStatus;
  appliedDaysAgo: number;
  followUpInDays?: number; // negative = overdue
  source?: JobSource;
  location?: string;
  salary?: [number, number];
  notes?: string;
  history: SeedEvent[]; // beyond CREATED, oldest first
};

// A six-week search that reads like a real one. Every job gets a CREATED
// event at its application date; `history` layers what happened after.
const SEARCH: SeedJob[] = [
  {
    company: "Datadog", title: "Software Engineer, Early Career", status: "INTERVIEWING",
    appliedDaysAgo: 38, followUpInDays: 2, source: "COMPANY_WEBSITE", location: "New York, NY",
    salary: [125000, 150000], notes: "Referred by Priya after the career fair.",
    history: [
      { type: "STATUS_CHANGE", daysAgo: 30, from: "APPLIED", to: "INTERVIEWING" },
      { type: "NOTE_ADDED", daysAgo: 12, note: "Phone screen went well — systems round next." },
    ],
  },
  {
    company: "Mongo Consulting", title: "Junior Full-Stack Developer", status: "OFFER",
    appliedDaysAgo: 41, followUpInDays: 1, source: "REFERRAL", location: "Remote (US)",
    salary: [95000, 105000],
    history: [
      { type: "STATUS_CHANGE", daysAgo: 33, from: "APPLIED", to: "INTERVIEWING" },
      { type: "STATUS_CHANGE", daysAgo: 4, from: "INTERVIEWING", to: "OFFER" },
      { type: "NOTE_ADDED", daysAgo: 3, note: "Offer expires Friday — negotiate?" },
    ],
  },
  {
    company: "Spotify", title: "Associate Engineer, Platform", status: "REJECTED",
    appliedDaysAgo: 35, source: "LINKEDIN", location: "New York, NY",
    history: [
      { type: "STATUS_CHANGE", daysAgo: 28, from: "APPLIED", to: "INTERVIEWING" },
      { type: "STATUS_CHANGE", daysAgo: 14, from: "INTERVIEWING", to: "REJECTED" },
      { type: "NOTE_ADDED", daysAgo: 14, note: "Asked for feedback; recruiter said try again next cycle." },
    ],
  },
  {
    company: "MTA IT Bureau", title: "Web Developer I", status: "APPLIED",
    appliedDaysAgo: 25, followUpInDays: -3, source: "JOB_BOARD", location: "Brooklyn, NY",
    notes: "Civil service posting — long timeline expected.",
    history: [],
  },
  {
    company: "Ramp", title: "Software Engineer — New Grad", status: "INTERVIEWING",
    appliedDaysAgo: 21, followUpInDays: 5, source: "RECRUITER", location: "New York, NY",
    salary: [130000, 160000],
    history: [
      { type: "STATUS_CHANGE", daysAgo: 9, from: "APPLIED", to: "INTERVIEWING" },
    ],
  },
  {
    company: "Vimeo", title: "Frontend Engineer, Growth", status: "WITHDRAWN",
    appliedDaysAgo: 19, source: "LINKEDIN",
    history: [
      { type: "NOTE_ADDED", daysAgo: 11, note: "Role reposted at lower band." },
      { type: "STATUS_CHANGE", daysAgo: 10, from: "APPLIED", to: "WITHDRAWN" },
    ],
  },
  {
    company: "NYC Health + Hospitals", title: "Junior Application Developer", status: "APPLIED",
    appliedDaysAgo: 12, followUpInDays: 6, source: "JOB_BOARD", location: "Manhattan, NY",
    history: [],
  },
  {
    company: "Etsy", title: "Software Engineer I", status: "APPLIED",
    appliedDaysAgo: 8, followUpInDays: -1, source: "COMPANY_WEBSITE", location: "Brooklyn, NY",
    salary: [115000, 135000],
    history: [{ type: "NOTE_ADDED", daysAgo: 6, note: "Take-home received — due next week." }],
  },
  {
    company: "Grow Therapy", title: "Associate Software Engineer", status: "APPLIED",
    appliedDaysAgo: 5, source: "LINKEDIN", location: "Remote (US)",
    history: [],
  },
  {
    company: "Bloomberg", title: "Software Engineer 2026 Graduate", status: "APPLIED",
    appliedDaysAgo: 2, followUpInDays: 12, source: "COMPANY_WEBSITE", location: "New York, NY",
    salary: [140000, 165000],
    history: [],
  },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: { id: "demo-user", name: "Demo User", email: "demo@example.edu" },
  });

  const existing = await prisma.job.count({ where: { userId: user.id } });
  if (existing > 0) {
    console.log(`seed: ${existing} jobs already present, leaving them alone`);
    return;
  }

  for (const s of SEARCH) {
    const applied = daysAgo(s.appliedDaysAgo);
    const job = await prisma.job.create({
      data: {
        userId: user.id,
        company: s.company,
        title: s.title,
        status: s.status,
        dateApplied: applied,
        followUpDate: s.followUpInDays != null ? daysFromNow(s.followUpInDays) : null,
        source: s.source,
        location: s.location,
        salaryMin: s.salary?.[0],
        salaryMax: s.salary?.[1],
        notes: s.notes ?? "",
        createdAt: applied,
      },
    });
    await prisma.jobEvent.create({
      data: { jobId: job.id, type: "CREATED", toStatus: "APPLIED", createdAt: applied },
    });
    for (const e of s.history) {
      await prisma.jobEvent.create({
        data: {
          jobId: job.id,
          type: e.type,
          fromStatus: e.from,
          toStatus: e.to,
          note: e.note,
          createdAt: daysAgo(e.daysAgo),
        },
      });
    }
  }
  console.log(`seed: created ${SEARCH.length} jobs for ${user.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
