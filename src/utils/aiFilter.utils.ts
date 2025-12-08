import { GoogleGenAI } from "@google/genai";

export const aiFilteration = async (chunkedData: any) => {
  const finalFormattedJsonArr: any = [];

  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const results = await Promise.all(
      chunkedData.map(async (cd: any) => {
        const prompt = `
You are a strict formatter assistant.

Your job is to take an array of **chunked raw data of html, scraped job html** and clean/normalize them and also remove the /n and other unnecessary things so that it fits in the following exact schema:

{
  title: string,
  description: string,
  companyName: string,
  requiredSkills: string[],
  allowedBatches: string[],
  allowedBranches: string[],
  salary: string,
  jobUrl: string,
  location: string,
  requiredExperience: string,
  postPlatform: string,
  isDeadlineGiven: boolean,
  expiredAt: string (ISO 8601),
  postedAt: string (ISO 8601 format),
  createdAt: string (ISO 8601),
  updatedAt: string (ISO 8601)
}

### Rules:
- Normalize \`requiredSkills\` to an array (e.g. split on commas).
- Keep \`salary\` as a string (e.g. "₹5-8 LPA", "Not disclosed").
- Ensure all date fields are ISO strings (e.g. "2025-10-20T00:00:00Z").
- Return only the JSON array. No markdown, no explanation.
- also if any field not having value then make it "" or according to its type.
- if expiredAt is not given in the the data then mark isDeadlineGiven as false and also give current dateTime value in expiredAt or if present then marks isDeadlineGiven as true.
- In the jobUrl add the whole url of the job so that i can directly goto that job by just searching on the google.
Here is the data:

${JSON.stringify(cd)}
`;

        try {
          const result = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
          });

          let raw = result?.text?.trim();

          // Remove markdown wrapping if present
          if (raw?.startsWith("```json")) {
            raw = raw
              .replace(/```json\s*/i, "")
              .replace(/```$/, "")
              .trim();
          }

          const parsed = JSON.parse(raw as string);
          return parsed;
        } catch (err) {
          console.error("❌ Error processing chunk:", err);
          return null;
        }
      })
    );

    // Filter out failed results
    for (const item of results) {
      if (item) {
        finalFormattedJsonArr.push(...item); // assuming each is an array
      }
    }

    return finalFormattedJsonArr;
  } catch (err) {
    console.error("❌ AI Filtration Failed:", err);
    return [];
  }
};
