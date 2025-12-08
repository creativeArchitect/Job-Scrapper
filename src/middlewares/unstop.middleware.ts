import axios from "axios";

const unstopSrappedJobs = async (
  maxJobs: number,
  experience: string,
  role: string,
  jobPostedDays: string,
  jobType: string
) => {
  let page = 1;
  const totalJobs: any[] = [];

  const position = role.toLowerCase().replace(" ", "+");
  const jobTimings = jobType.toLowerCase().replace(" ", "_");

  let experienceLevel = "";
  if (experience !== "fresher" && experience !== "students") {
    experienceLevel = "corporate";
  }

  while (totalJobs.length < maxJobs) {
    const response = await axios.get(
      `https://unstop.com/api/public/opportunity/search-result?opportunity=jobs&page=${page}&per_page=10&searchTerm=${position}&job_timing=${jobTimings}&datePosted=${jobPostedDays}&usertype=${experienceLevel}&oppstatus=recent`
    );

    const jobs = response?.data?.data?.data || [];
    if (jobs.length === 0) break;

    const mappedJobs = jobs.map((job: any) => {
      const eligibleFilters = Array.isArray(job.filters)
        ? job.filters.filter((f: any) => f.type === "eligible")
        : [];

      const allowedBatchNames = eligibleFilters.map((f: any) => f.name);

      const finalAllowedBatches =
        allowedBatchNames.length > 0 ? allowedBatchNames : [];

      const allowedBranches =
        eligibleFilters.length > 0
          ? eligibleFilters.map((f: any) => f.name)
          : [];

      let salary = "Not disclosed";
      if (
        job.jobDetail?.not_disclosed === false &&
        job.jobDetail?.min_salary &&
        job.jobDetail?.max_salary
      ) {
        salary = `${job.jobDetail.min_salary} - ${job.jobDetail.max_salary}`;
      }

      const locations = Array.isArray(job.jobDetail?.locations)
        ? job.jobDetail.locations.join(", ")
        : "Unknown";

      return {
        title: job.title,
        companyName: job.organisation?.name || "",
        description: job.details || "No description",

        requiredSkills: Array.isArray(job.required_skills)
          ? job.required_skills.map((s: any) => s.skill_name)
          : [],

        allowedBatches: finalAllowedBatches, // Array<String>

        allowedBranches: allowedBranches, // Array<String>

        salary: salary,

        location: locations,

        requiredExperience:
          job.jobDetail?.min_experience || job.jobDetail?.max_experience
            ? `${job.jobDetail?.min_experience || 0}-${job.jobDetail?.max_experience || 0} years`
            : "0 years",

        jobUrl:
          job.short_url ||
          (job.seo_url ? job.seo_url : `https://unstop.com/${job.public_url}`),

        postPlatform: "unstop",

        postedAt:
          job.approved_date && new Date(job.approved_date)
            ? new Date(job.approved_date)
            : new Date(job.updated_at),

        isDeadlineGiven: job.end_date ? true : false,
        expiredAt: job.end_date ? new Date(job.end_date) : null,
      };
    });

    totalJobs.push(...mappedJobs);

    if (jobs.length < 10) break;
    page++;
  }

  return totalJobs;
};

export default unstopSrappedJobs;
