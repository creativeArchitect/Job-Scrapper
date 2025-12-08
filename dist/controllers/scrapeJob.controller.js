"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScrappedJob = void 0;
const googleSearch_script_1 = require("@/scripts/googleSearch.script");
const imageJobScrapper_1 = require("../scripts/imageJobScrapper");
const formatJobDetails_1 = require("../utils/formatJobDetails");
const processImg_utils_1 = require("../utils/processImg.utils");
const htmlParser_middleware_1 = require("@/middlewares/htmlParser.middleware");
const getScrappedJob = async (req, res, next) => {
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(404).json({
                success: false,
                message: "File img not found",
            });
        }
        const imgDetails = await (0, processImg_utils_1.extractJobDetailsFromImage)(image);
        if (!imgDetails) {
            return res.status(404).json({
                success: false,
                message: "Img details cannot found",
            });
        }
        const companyCareerData = await (0, googleSearch_script_1.findCareerPage)(imgDetails.companyName);
        if (!companyCareerData) {
            return res.status(404).json({
                success: false,
                message: "Company career webpage cannot found",
            });
        }
        const careerPageHtml = await (0, imageJobScrapper_1.findJobUrlAndHtmlContent)(companyCareerData.link);
        if (!careerPageHtml) {
            return res.status(404).json({
                success: false,
                message: "Job not found",
            });
        }
        const relevantJobContent = (0, htmlParser_middleware_1.JobContainer)(careerPageHtml);
        console.log("relevent job content: ", relevantJobContent);
        const formattedJob = await (0, formatJobDetails_1.formattedJobDetails)(careerPageHtml);
        console.log("formatted job: ", formattedJob);
        if (!formattedJob) {
            return res.status(404).json({
                success: false,
                message: "Formatted job not found",
            });
        }
        res.status(200).json({
            success: true,
            message: "Job-Link is found successfully",
            data: formattedJob,
        });
    }
    catch (err) {
        console.log("Error in the scrapping job details");
        return res.status(500).json({
            success: false,
            message: "Error in scrapping job details"
        });
    }
};
exports.getScrappedJob = getScrappedJob;
