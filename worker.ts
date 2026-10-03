import cron from "node-cron";
import { searchAndStoreJobs } from "./lib/job-search";
import { processApplyQueue } from "./lib/apply";
import { prisma } from "./lib/prisma";

async function tick() {
  const settings = await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });
  if (settings.autoSearch) {
    const search = await searchAndStoreJobs();
    console.log("[worker] search", search);
  }
  const queue = await processApplyQueue();
  console.log("[worker] queue", queue);
}

const expr = process.env.SEARCH_CRON || "0 */6 * * *";
console.log(`[worker] starting, cron ${expr}`);
cron.schedule(expr, () => {
  tick().catch((err) => console.error("[worker]", err));
});
tick().catch((err) => console.error("[worker]", err));
