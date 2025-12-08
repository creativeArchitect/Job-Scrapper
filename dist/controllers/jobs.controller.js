"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllScrappedJobs = exports.deleteLinkedinJob = exports.getLinkedinJobs = void 0;
const prisma_1 = require("@/generated/prisma");
const prisma = new prisma_1.PrismaClient();
const getLinkedinJobs = async (req, res, next) => {
    try {
        const linkedinJobs = await prisma.linkedinJobPosts.findMany();
        res.status(200).json({
            success: true,
            message: "Linkedin jobs fetched successfully",
            data: linkedinJobs,
        });
    }
    catch (err) {
        console.log("Error in fetching linkedin jobs");
        return res.status(500).json({
            success: false,
            message: "Error in fetching linkedin jobs",
        });
    }
};
exports.getLinkedinJobs = getLinkedinJobs;
const deleteLinkedinJob = async (req, res, next) => {
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
    }
    catch (err) {
        console.log("Error in deleting linkedin job");
        return res.status(500).json({
            success: false,
            message: "Error in deleting linkedin job",
        });
    }
};
exports.deleteLinkedinJob = deleteLinkedinJob;
const getAllScrappedJobs = async (req, res, next) => {
    try {
        const currTime = new Date();
        const allJobPosts = await prisma.scrappedJobs.findMany({
            where: {
                postedAt: {
                    gte: currTime,
                },
            },
        });
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
    }
    catch (err) {
        console.log("Error in fetching all scrapped jobs");
        return res.status(500).json({
            success: false,
            message: "Error in fetching all scrapped jobs",
        });
    }
};
exports.getAllScrappedJobs = getAllScrappedJobs;
