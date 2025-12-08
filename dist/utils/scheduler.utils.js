"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const internshala_config_1 = require("@/config/internshala.config");
const naukri_config_1 = require("@/config/naukri.config");
const unstop_middleware_1 = __importDefault(require("@/middlewares/unstop.middleware"));
const scrapper_1 = require("@/scripts/scrapper");
const axios_1 = __importDefault(require("axios"));
const node_cron_1 = __importDefault(require("node-cron"));
const rateLimit_utils_1 = __importDefault(require("./rateLimit.utils"));
const retry_utils_1 = require("./retry.utils");
const chunking_utils_1 = require("./chunking.utils");
const aiFilter_utils_1 = require("./aiFilter.utils");
const deletionPosts_middleware_1 = require("@/middlewares/deletionPosts.middleware");
let isRunning = false;
node_cron_1.default.schedule("0 */6 * * *", async () => {
    if (isRunning)
        return console.log("⏳ Previous job still running...");
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
            await (0, rateLimit_utils_1.default)();
            let naukriJobs = await (0, retry_utils_1.retry)(() => (0, scrapper_1.scrapper)(naukri_config_1.naukriConfig, role, 10, "naukri"), 3, 1000);
            // internshala jobs
            await (0, rateLimit_utils_1.default)();
            let internshalaJobs = await (0, retry_utils_1.retry)(() => (0, scrapper_1.scrapper)(internshala_config_1.internshalaConfig, role, 10, "internshala"), 3, 1000);
            if (naukriJobs.length > 0) {
                const chunks = (0, chunking_utils_1.chunkData)(naukriJobs, 5);
                naukriJobs = await (0, aiFilter_utils_1.aiFilteration)(chunks);
            }
            if (internshalaJobs.length > 0) {
                const chunks = (0, chunking_utils_1.chunkData)(internshalaJobs, 10);
                internshalaJobs = await (0, aiFilter_utils_1.aiFilteration)(chunks);
            }
            // jobs from cuvette
            await (0, rateLimit_utils_1.default)();
            const cuvetteJobsResponse = await (0, retry_utils_1.retry)(() => axios_1.default.get(`https://api.cuvette.tech/api/v1/externaljobs?search=${role}&page=1`), 3, 1000);
            const cuvetteJobs = cuvetteJobsResponse.data.data;
            // jobs from unstop
            await (0, rateLimit_utils_1.default)();
            const unstopJobs = await (0, retry_utils_1.retry)(() => (0, unstop_middleware_1.default)(20, "fresher", role, 7, "Full Time"), 3, 1000);
            console.log(`✅ ${role}: Naukri ${naukriJobs.length} jobs`);
            console.log(`✅ ${role}: Internshala ${internshalaJobs.length} jobs`);
            console.log(`✅ ${role}: Cuvette ${cuvetteJobs.length} jobs`);
            console.log(`✅ ${role}: Unstop ${unstopJobs.length} jobs`);
        }
        console.log("🎉 Scraping completed for all roles!");
        (0, deletionPosts_middleware_1.deleteExpJobs)();
        (0, deletionPosts_middleware_1.deleteLinkedinPosts)();
        console.log("Expired jobs are deleted successfully");
        console.log("linkedin posts are deleted successfully");
    }
    catch (err) {
        console.error("❌ Scraper error:", err);
    }
    finally {
        isRunning = false;
    }
});
