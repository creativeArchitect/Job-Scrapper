import { getScrappedJobs } from "../controllers/ai.controller";
import { Router } from "express";

const aiScrapperRoutes = Router();

aiScrapperRoutes.post("/", getScrappedJobs);

export default aiScrapperRoutes;
