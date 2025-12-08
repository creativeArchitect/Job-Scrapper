import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export const getLinkedinJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const linkedinJobs = await prisma.linkedinJobPosts.findMany();
    res.status(200).json({
      success: true,
      message: "Linkedin jobs fetched successfully",
      data: linkedinJobs,
    });
  } catch (err) {
    console.log("Error in fetching linkedin jobs");
    return res.status(500).json({
      success: false,
      message: "Error in fetching linkedin jobs",
    });
  }
};

export const deleteLinkedinJob = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const deletedPost = await prisma.linkedinJobPosts.delete({
      where: { id: id },
    });

    res.status(200).json({
      success: true,
      message: "Linkedin job deleted successfully",
      deletedPost: deletedPost,
    });
  } catch (err) {
    console.log("Error in deleting linkedin job");
    return res.status(500).json({
      success: false,
      message: "Error in deleting linkedin job",
    });
  }
};

export const getAllScrappedJobs = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const currTime = new Date();
    const allJobPosts = await prisma.scrappedJobs.findMany();
    if (allJobPosts.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No jobs are present",
      });
    }

    res.status(200).json({
      success: true,
      message: "All scrapped jobs fetched successfully",
      data: allJobPosts,
    });
  } catch (err) {
    console.log("Error in fetching all scrapped jobs");
    return res.status(500).json({
      success: false,
      message: "Error in fetching all scrapped jobs",
    });
  }
};
