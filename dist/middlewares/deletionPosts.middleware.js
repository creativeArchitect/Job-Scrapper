"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExpJobs = exports.deleteLinkedinPosts = void 0;
const prisma_1 = require("@/generated/prisma");
const prisma = new prisma_1.PrismaClient();
const deleteLinkedinPosts = async () => {
    try {
        const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        const deletePrevAllLinkedinPosts = await prisma.LinkedinJobPosts.deleteMany({
            where: {
                createdAt: { lt: fiveDaysAgo },
            },
        });
        return deletePrevAllLinkedinPosts;
    }
    catch (err) {
        console.log("Error in linkedin post deletion method");
        return;
    }
};
exports.deleteLinkedinPosts = deleteLinkedinPosts;
const deleteExpJobs = async () => {
    try {
        const currTime = new Date().getTime();
        const deletedJobs = await prisma.ScrappedJobs.deleteMany({
            where: {
                expiredAt: { lt: currTime },
            },
        });
        return deletedJobs;
    }
    catch (err) {
        console.log("Error in deletion of expired jobs method");
        return;
    }
};
exports.deleteExpJobs = deleteExpJobs;
