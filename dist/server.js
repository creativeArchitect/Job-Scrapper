"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const app = (0, express_1.default)();
dotenv_1.default.config();
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: ["http://localhost:5173", "http://localhost:3030"],
}));
app.use((0, morgan_1.default)('dev'));
const jobs_routes_1 = __importDefault(require("./routes/jobs.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const scrapeJob_routes_1 = __importDefault(require("./routes/scrapeJob.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
app.use('/jobs', jobs_routes_1.default);
app.use('/upload', upload_routes_1.default);
app.use('/job/scrapped/data', scrapeJob_routes_1.default);
app.use('/job-board/scrape/jobs', ai_routes_1.default);
const port = 8080;
app.listen(port, () => {
    console.log(`Server is running on PORT: ${port} ✅`);
});
