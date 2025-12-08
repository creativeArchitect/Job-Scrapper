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
import {
  autoDeleteLinkedPosts,
  deleteExpiredJobs,
} from "../controllers/ai.controller";
import {
  deleteExpJobs,
  deleteLinkedinPosts,
} from "@/middlewares/deletionPosts.middleware";

let isRunning = false;

cron.schedule("0 */6 * * *", async () => {
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
      }

      if (internshalaJobs.length > 0) {
        const chunks = chunkData(internshalaJobs, 10);
        internshalaJobs = await aiFilteration(chunks);
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
      const cuvetteJobs = cuvetteJobsResponse.data.data;

      // jobs from unstop
      await randomDelay();
      const unstopJobs = await retry(
        () => unstopSrappedJobs(20, "fresher", role, 7, "Full Time"),
        3,
        1000
      );

      console.log(`✅ ${role}: Naukri ${naukriJobs.length} jobs`);
      console.log(`✅ ${role}: Internshala ${internshalaJobs.length} jobs`);
      console.log(`✅ ${role}: Cuvette ${cuvetteJobs.length} jobs`);
      console.log(`✅ ${role}: Unstop ${unstopJobs.length} jobs`);
    }

    console.log("🎉 Scraping completed for all roles!");

    deleteExpJobs();
    deleteLinkedinPosts();

    console.log("Expired jobs are deleted successfully");
    console.log("linkedin posts are deleted successfully");
  } catch (err) {
    console.error("❌ Scraper error:", err);
  } finally {
    isRunning = false;
  }
});
