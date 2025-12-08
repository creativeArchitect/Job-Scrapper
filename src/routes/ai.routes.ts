import { getScrappedJobs } from "../controllers/ai.controller";
import { Router } from "express";

const aiScrapperRoutes = Router();

aiScrapperRoutes.get("/", getScrappedJobs);

export default aiScrapperRoutes;
