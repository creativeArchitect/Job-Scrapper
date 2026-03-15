import { GoogleGenAI } from "@google/genai";

export const linkedinPostFilter = async (chunkedData: any[]) => {
  try {
    const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const processedResults: any[] = [];

    const promptBase = `
You are a strict and highly accurate data-extraction assistant.

You will receive raw text scraped from a LinkedIn post.

Extract ONLY this structured information:

{
  "postedPerson": String,
  "description": String,
  "batch": String,
  "location": String,
  "emailMentioned": String,
  "phoneMentioned": String,
  "linkMentioned": String
}

RULES:
- DO NOT generate or guess any datetime.
- DO NOT include postedAt, createdAt, updatedAt.
- Remove hashtags, “Feed post”, “Follow”, “…more”, reactions, likes/comments counts.
- Extract only meaningful job-related text.
- Extract emails, phone numbers, URLs, batches, locations.
- If missing, return "".
- Return ONLY a JSON object. No markdown. No explanation.
`;

    const isValidISO = (dateString: string) => {
      const d = new Date(dateString);
      return !isNaN(d.getTime());
    };

    for (const cdArr of chunkedData) {
      for (const cd of cdArr) {
        // ---- MUST HAVE SCRAPER TIMESTAMP ----
        if (!cd.timestamp) {
          console.warn("⚠️ Missing scraper timestamp. Skipping post.");
          continue;
        }

        const postedAtISO = new Date(cd.timestamp).toISOString();

        // ---- Check 24 hour rule ----
        const now = new Date();
        const twentyFourHoursAgo = new Date(
          now.getTime() - 24 * 60 * 60 * 1000
        );

        if (new Date(postedAtISO) < twentyFourHoursAgo) {
          console.log("⏭️ Skipping post older than 24h:", postedAtISO);
          continue;
        }

        const postText = cd?.description ?? JSON.stringify(cd);

        const prompt = `${promptBase}

<<<POST_START>>>
${postText}
<<<POST_END>>>
`;

        try {
          const result = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
          });

          let raw = "";

          if (!result) continue;

          if (typeof (result as any).text === "function") {
            raw = (result as any).text()?.trim() || "";
          } else {
            raw = String((result as any).text || "").trim();
          }

          raw = raw
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            console.warn("⚠️ No JSON found. Raw:", raw.slice(0, 200));
            continue;
          }

          let parsed: any;
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (err) {
            console.warn("⚠️ JSON parse error:", err);
            continue;
          }

          // ---- NOW SET DATES OURSELVES (NOT THE MODEL) ----
          parsed.postedAt = postedAtISO;
          parsed.createdAt = now.toISOString();
          parsed.updatedAt = now.toISOString();

          processedResults.push(parsed);
        } catch (err) {
          console.error("❌ Gemini processing error:", err);
          continue;
        }
      }
    }

    return processedResults;
  } catch (err) {
    console.error("Error in linkedin post filtration:", err);
    return [];
  }
};
