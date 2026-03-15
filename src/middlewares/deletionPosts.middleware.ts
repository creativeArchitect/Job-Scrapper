import { PrismaClient } from "@/generated/prisma";

const prisma = new PrismaClient();

export const deleteLinkedinPosts = async () => {
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    const deletePrevAllLinkedinPosts = await prisma.linkedinJobPosts.deleteMany(
      {
        where: {
          createdAt: { lt: fiveDaysAgo },
        },
      }
    );

    return deletePrevAllLinkedinPosts;
  } catch (err) {
    console.log("Error in linkedin post deletion method");
    return;
  }
};

export const deleteExpJobs = async () => {
  try {
    const now = new Date();
    const deletedJobs = await prisma.scrappedJobs.deleteMany({
      where: {
        expiredAt: { lt: now },
      },
    });

    return deletedJobs;
  } catch (err) {
    console.log("Error in deletion of expired jobs method");
    return;
  }
};
