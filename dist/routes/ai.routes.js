"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_controller_1 = require("../../ai.controller");
const express_1 = require("express");
const aiScrapperRoutes = (0, express_1.Router)();
aiScrapperRoutes.get('/', ai_controller_1.getScrappedJobs);
exports.default = aiScrapperRoutes;
