"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const unstopSrappedJobs = async (maxJobs, exprience, role, jobPostedDays, jobType) => {
    let page = 1;
    const totalJobs = [];
    const position = role.toLowerCase().replace(" ", "+");
    const jobTimings = jobType.toLowerCase().replace(" ", "_");
    // usertype=fresher/corporate/students
    let exprienceLevel = "";
    if (exprience !== "fresher" && exprience !== "students") {
        exprienceLevel = "corporate";
    }
    while (totalJobs.length < maxJobs) {
        const response = await axios_1.default.get(`https://unstop.com/api/public/opportunity/search-result?opportunity=jobs&page=${page}&per_page=10&searchTerm=${position}&job_timing=${jobTimings}&datePosted=${jobPostedDays}&usertype=${exprienceLevel}&oppstatus=recent`);
        const jobs = response?.data?.data?.data || [];
        if (jobs.length === 0)
            break;
        const mappedJobs = jobs.map((job) => ({
            title: job.title,
            companyName: job.organisation?.name || "",
            description: job.seo_details?.[0]?.description || job.title || "No description",
            location: job.jobDetail?.locations?.join(", ") || "Unknown",
            minSalary: job.jobDetail?.show_salary
                ? String(job.jobDetail.show_salary)
                : null,
            maxSalary: job.jobDetail?.show_salary
                ? String(job.jobDetail.show_salary)
                : null,
            salary: job.jobDetail?.not_disclosed === false
                ? "Disclosed"
                : "Not disclosed",
            skills: Array.isArray(job.required_skills)
                ? job.required_skills.map((s) => s.skill_name)
                : [],
            eligibleYear: Array.isArray(job.filters)
                ? job.filters
                    .filter((f) => f.type === "eligible")
                    .map((f) => f.name)
                    .join(", ")
                : null,
            requiredExp: job.jobDetail?.min_experience || job.jobDetail?.max_experience
                ? `${job.jobDetail?.min_experience || 0}-${job.jobDetail?.max_experience || 0} years`
                : "0 years",
            jobUrl: job.seo_url,
            postPlatform: "unstop",
            postedAt: new Date(job.created_at),
            experienceLevel: exprience,
            position: role
        }));
        totalJobs.push(...mappedJobs);
        if (jobs.length < 10)
            break;
        page++;
    }
    return totalJobs;
};
exports.default = unstopSrappedJobs;
