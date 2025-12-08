import { internshalaConfig } from "@/config/internshala.config";
import { linkedinConfig } from "@/config/linkedin.config";
import { naukriConfig } from "@/config/naukri.config";
import { PrismaClient } from "@/generated/prisma";
import {
  deleteExpJobs,
  deleteLinkedinPosts,
} from "@/middlewares/deletionPosts.middleware";
import unstopSrappedJobs from "@/middlewares/unstop.middleware";
import { linkedinScrapper } from "@/scripts/linkedinScrapper";
import { scrapper } from "@/scripts/scrapper";
import { aiFilteration } from "@/utils/aiFilter.utils";
import { chunkData } from "@/utils/chunking.utils";
import { linkedinPostFilter } from "@/utils/postFilter.utils";
import axios from "axios";
import { Request, Response, NextFunction } from "express";

const prisma = new PrismaClient();

export const getScrappedJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { platform, role, maxJobs } = req.body;
    if (!platform) {
      return res.status(200).json({
        success: false,
        message: "Platform is not exists",
      });
    }

    if (platform === "internshala") {
      const scrappedHtmlArr = await scrapper(
        internshalaConfig,
        role,
        maxJobs,
        "internshala"
      );

      if (!scrappedHtmlArr || scrappedHtmlArr.length === 0) {
        return res.status(200).json({
          success: false,
          message: "Jobs are not found after scrapping",
        });
      }

      const chunksLimit = 10;
      const chunkedData = chunkData(scrappedHtmlArr, chunksLimit);

      const aiFormattedData = await aiFilteration(chunkedData);

      if (aiFormattedData.length === 0) {
        return res.status(200).json({
          success: false,
          message: "Jobs are not found after scrapping",
        });
      }

      console.log("internshala formatted jobs: ", aiFormattedData);

      const newJob = await prisma.scrappedJobs.createMany({
        data: aiFormattedData,
        skipDuplicates: true,
      });

      res.status(200).json({
        success: true,
        message: "Jobs are scrapped successfully",
        data: newJob,
      });
    } else if (platform === "cuvette") {
      let page = 1;

      const roleParamFormat = role.replace(" ", "%20");

      while (Math.ceil(maxJobs / 10) >= page) {
        const jobs: any[] = await axios.get(
          `https://api.cuvette.tech/api/v1/externaljobs?search=${roleParamFormat}&page=${page}`
        );

        await prisma.scrappedJobs.createMany({
          data: jobs,
          skipDuplicates: true,
        });

        page++;
      }

      res.status(200).json({
        success: true,
        message: "Jobs are scrapped successfully",
      });
    } else if (platform === "naukri") {
      const scrappedHtmlArr = await scrapper(
        naukriConfig,
        role,
        maxJobs,
        platform
      );

      if (!scrappedHtmlArr || scrappedHtmlArr.length === 0) {
        return res.status(200).json({
          success: false,
          message: "Jobs are not found after scrapping",
        });
      }

      const chunksLimit = 5;
      const chunkedData = chunkData(scrappedHtmlArr, chunksLimit);

      const aiFormattedData = await aiFilteration(chunkedData);

      if (aiFormattedData.length === 0) {
        return res.status(200).json({
          success: false,
          message: "Jobs are not found after scrapping",
        });
      }

      const newJobs = await prisma.scrappedJobs.createMany({
        data: aiFormattedData,
      });

      res.status(200).json({
        success: true,
        message: "Jobs are scrapped successfully",
        data: newJobs.count,
      });
    } else if (platform === "unstop") {
      let { jobType, exprience, jobPostedDays, maxJobs } = req.body;

      if (!jobType) jobType = "Full Time";
      if (!exprience) exprience = "fresher";
      if (!jobPostedDays) jobPostedDays = 1;
      if (!maxJobs) maxJobs = 30;

      const jobs: any[] = await unstopSrappedJobs(
        maxJobs,
        exprience,
        role,
        jobPostedDays,
        jobType
      );
      if (Array.isArray(jobs) && jobs.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Jobs are not found from unstop",
          data: [],
        });
      }

      const newJobs = await prisma.scrappedJobs.createMany({
        data: [...jobs],
        skipDuplicates: true,
      });

      return res.status(200).json({
        success: true,
        message: "Jobs fetched from Unstop successfully",
        total: newJobs.count,
        data: newJobs.count,
      });
    } else if (platform === "linkedin") {
      const { inputQuery } = req.body;

      const result = await linkedinScrapper(
        linkedinConfig,
        maxJobs,
        inputQuery
      );

      const cleanPost = (text: string) => {
        return text
          .replace(/^Feed post/gi, "")
          .replace(/Follow/gi, "")
          .replace(/hashtag/gi, "")
          .replace(/…more/gi, "")
          .replace(/\d+\scomments?/gi, "")
          .replace(/\d+\sreposts?/gi, "")
          .replace(/\d+\slikes?/gi, "")
          .replace(/^\s+|\s+$/g, "")
          .replace(/\n{2,}/g, "\n")
          .trim();
      };

      const cleanedDetails = result.map((res) => cleanPost(res));
      console.log("clean details of the job: ", cleanedDetails);

      const chunkedData = chunkData(cleanedDetails as any, maxJobs as number);

      console.log("chunkedData: ", chunkedData);

      const formattedPosts = (await linkedinPostFilter(chunkedData)) as any;
      console.log("formated posts: ", formattedPosts);

      const posts = await prisma.linkedinJobPosts.createMany({
        data: formattedPosts,
        skipDuplicates: true
      });

      console.log("posts: ", posts);

      return res.status(200).json({
        message: "jobs posts are fetched successfully from linkedin",
        totalPosts: posts.count
      });
    }
  } catch (err) {
    console.log("Error in scrapping jobs", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during job scraping",
      error: err,
    });
  }
};

export const deleteExpiredJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const deletedJobs: any = deleteExpJobs();

    res.status(200).json({
      message: "Expired jobs are deleted successfully",
      totalDeletePosts: deletedJobs?.count,
    });
  } catch (err) {
    console.log("Error in expired delete route");
    return res.status(500).json({
      message: "Server error in deletion of expired jobs",
    });
  }
};

export const autoDeleteLinkedPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const deletePrevAllLinkedinPosts: any = deleteLinkedinPosts();

    res.status(200).json({
      message: "All 5 days ago posted posts are deleted successfully",
      totalDeletedPosts: deletePrevAllLinkedinPosts?.count,
    });
  } catch (err) {
    console.log("Server error in the auto deletion of the linkedin posts");
    return res.status(500).json({
      message: "Server error in auto deletion of the linkedin posts",
    });
  }
};
