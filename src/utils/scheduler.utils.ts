import { internshalaConfig } from "@/config/internshala.config";
import { naukriConfig } from "@/config/naukri.config";
import unstopSrappedJobs from "@/middlewares/unstop.middleware";
import { scrapper } from "@/scripts/scrapper";
import axios from "axios";
import cron from "node-cron";
import randomDelay from "./rateLimit.utils";
import { retry } from "./retry.utils";
import { chunkData } from "./chunking.utils";
import { aiFilteration } from "./aiFilter.utils";
import { PrismaClient } from "@/generated/prisma";
import {
  deleteExpJobs,
  deleteLinkedinPosts,
} from "@/middlewares/deletionPosts.middleware";

const prisma = new PrismaClient();
let isRunning = false;

cron.schedule("*/1 * * * *", async () => {
  if (isRunning) return console.log("⏳ Previous job still running...");
  isRunning = true;

  try {
    console.log("🚀 Starting scheduled job scraping...");

    const roles = [
      "frontend developer",
      "backend developer",
      "data analyst",
      "video editor",
      "full stack developer",
      "software developer",
      "machine learning engineer",
      "data scientist",
    ];

    for (const role of roles) {
      console.log(`\n⚙️ Scraping for role: ${role}`);

      // jobs from naukri.com
      await randomDelay();
      let naukriJobs = await retry(
        () => scrapper(naukriConfig, role, 10, "naukri"),
        3,
        1000
      );

      // internshala jobs
      await randomDelay();
      let internshalaJobs = await retry(
        () => scrapper(internshalaConfig, role, 10, "internshala"),
        3,
        1000
      );

      if (naukriJobs.length > 0) {
        const chunks = chunkData(naukriJobs, 5);
        naukriJobs = await aiFilteration(chunks);
        
        if (naukriJobs.length > 0) {
          await prisma.scrappedJobs.createMany({
            data: naukriJobs,
            skipDuplicates: true
          });
        }
      }

      if (internshalaJobs.length > 0) {
        const chunks = chunkData(internshalaJobs, 10);
        internshalaJobs = await aiFilteration(chunks);

        if (internshalaJobs.length > 0) {
          await prisma.scrappedJobs.createMany({
            data: internshalaJobs,
            skipDuplicates: true
          });
        }
      }

      // jobs from cuvette
      await randomDelay();
      const cuvetteJobsResponse = await retry(
        () =>
          axios.get(
            `https://api.cuvette.tech/api/v1/externaljobs?search=${role}&page=1`
          ),
        3,
        1000
      );
      const cuvetteJobsRaw = cuvetteJobsResponse.data.data || [];
      const now = new Date();
      const mappedCuvetteJobs = cuvetteJobsRaw.map((job: any) => ({
        title: job.title || "",
        companyName: job.companyName || "",
        description: job.description || "",
        requiredSkills: job.skills || [],
        allowedBatches: job.batches || [],
        allowedBranches: job.branches || [],
        salary: job.salary || "Not disclosed",
        jobUrl: job.link || "",
        location: job.location || "Remote",
        requiredExperience: job.experience || "0 years",
        postPlatform: "cuvette",
        postedAt: job.postedAt ? new Date(job.postedAt) : now,
        isDeadlineGiven: !!job.deadline,
        expiredAt: job.deadline ? new Date(job.deadline) : now,
        createdAt: now,
        updatedAt: now,
      }));

      if (mappedCuvetteJobs.length > 0) {
        await prisma.scrappedJobs.createMany({
          data: mappedCuvetteJobs,
          skipDuplicates: true
        });
      }

      // jobs from unstop
      await randomDelay();
      const unstopJobs = await retry(
        () => unstopSrappedJobs(10, "fresher", role, 1, "Full Time"),
        3,
        1000
      );

      if (unstopJobs.length > 0) {
        await prisma.scrappedJobs.createMany({
          data: unstopJobs,
          skipDuplicates: true
        });
      }

      console.log(`✅ ${role}: Naukri ${naukriJobs.length} jobs saved`);
      console.log(`✅ ${role}: Internshala ${internshalaJobs.length} jobs saved`);
      console.log(`✅ ${role}: Cuvette ${mappedCuvetteJobs.length} jobs saved`);
      console.log(`✅ ${role}: Unstop ${unstopJobs.length} jobs saved`);
    }

    console.log("🎉 Scraping completed for all roles!");

    await deleteExpJobs();
    await deleteLinkedinPosts();

    console.log("Expired jobs are deleted successfully");
    console.log("linkedin posts are deleted successfully");
  } catch (err) {
    console.error("❌ Scraper error:", err);
  } finally {
    isRunning = false;
  }
});
