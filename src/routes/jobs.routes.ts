import { Router } from "express";
import { deleteLinkedinJob, getLinkedinJobs, getAllScrappedJobs } from "../controllers/jobs.controller";

const router = Router();

router.get("/linkedin", getLinkedinJobs);
router.delete('/linkedin/:id', deleteLinkedinJob);
router.get("/scrapped", getAllScrappedJobs);

export default router;
