import express from "express";
import dotenv from "dotenv";
import cors from 'cors';
import morgan from "morgan";

const app = express();

dotenv.config();
app.use(express.json());

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3030"],
  })
);

app.use(morgan('dev'));

import jobsRouter from "./routes/jobs.routes";
import uploadRouter from "./routes/upload.routes";
import scrappedJobs from "./routes/scrapeJob.routes";
import aiScrapperRoutes from "./routes/ai.routes";
import "@/utils/scheduler.utils";

app.use('/jobs', jobsRouter);
app.use('/upload', uploadRouter);
app.use('/job/scrapped/data', scrappedJobs);
app.use('/job-board/scrape/jobs', aiScrapperRoutes);



const port = 8080;
app.listen(port, () => {
  console.log(`Server is running on PORT: ${port} ✅`);
});
