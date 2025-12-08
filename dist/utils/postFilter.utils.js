"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkedinPostFilter = void 0;
const genai_1 = require("@google/genai");
const linkedinPostFilter = async (chunkedData) => {
    try {
        const client = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const processedResults = [];
        const promptBase = `
    You are a strict data extraction assistant.
    
    You will receive raw text from a scraped LinkedIn post.
    
    Extract ONLY useful information needed by a college TPO.
    
    Return a SINGLE JSON object in this exact schema:
    
    {
      "postedPerson": String,
      "description": String,
      "batch": String,
      "location": String,
      "emailMentioned": String,
      "phoneMentioned": String,
      "linkMentioned": String,
      "postedAt": String,
      "createdAt": String,
      "updatedAt": String
    }
    
    Rules:
    - "postedAt" must be converted into an ACTUAL ISO datetime string.
      Examples:
        "1h", "1 hour ago", "12h", "12 hours ago" → NOW minus that many hours.
        "30m", "30 minutes ago" → NOW minus minutes.
        "2d", "2 days ago" → NOW minus days.
        "1w", "1 week ago" → NOW minus 7 days.
        "1mo", "1 month ago" → NOW minus 30 days.
        "2mo", "2 months ago" → NOW minus 60 days.
        "1y", "1 year ago" → NOW minus 365 days.
    - Assume "NOW" is the current datetime at the moment of processing.
    - Use ISO 8601 format: YYYY-MM-DDTHH:mm:ssZ.
    
    - Clean the description completely (remove repeated headers, hashtags, “Feed post”, “Follow”, “…more”, likes/comments, and timestamps).
    - Extract email, phone numbers, URLs, batch, companyName and things which is needed according to my defined format.
    - If any value is missing, return "" (empty string) or null according to type.
    - “createdAt” and “updatedAt” must both be the current datetime in ISO format.
    - Return only the JSON object. No markdown. No explanation.
    `;
        for (const cdArr of chunkedData) {
            for (const cd of cdArr) {
                const postText = typeof cd === "string" ? cd : cd?.text || String(cd);
                const prompt = `${promptBase}
          Here is the LinkedIn post between the markers. Extract only the JSON object:

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
                    if (!result) {
                        console.warn("⚠️ empty result from model");
                        continue;
                    }
                    //  to remove the output format issue if happens
                    if (typeof result.text === "function") {
                        raw = (result.text() || "").trim();
                    }
                    else {
                        raw = result.text
                            ? String(result.text).trim()
                            : "";
                    }
                    if (!raw) {
                        console.warn("⚠️ model returned empty text");
                        continue;
                    }
                    raw = raw
                        .replace(/```json/gi, "")
                        .replace(/```/g, "")
                        .trim();
                    // Gemini adds extra sentences
                    const jsonMatch = raw.match(/\{[\s\S]*\}/);
                    if (!jsonMatch) {
                        console.warn("⚠️ No JSON object found in model output. Raw:", raw.slice(0, 400));
                        continue;
                    }
                    const jsonText = jsonMatch[0];
                    let parsed;
                    try {
                        parsed = JSON.parse(jsonText);
                    }
                    catch (err) {
                        console.warn("⚠️ JSON.parse failed. Attempting minor fixes...");
                        const cleaned = jsonText
                            .replace(/,\s*}/g, "}")
                            .replace(/,\s*]}/g, "]}");
                        try {
                            parsed = JSON.parse(cleaned);
                        }
                        catch (err2) {
                            console.error("❌ JSON parse ultimately failed for post. Raw JSON:", jsonText.slice(0, 400));
                            continue;
                        }
                    }
                    const now = new Date().toISOString();
                    parsed.createdAt = parsed.createdAt || now;
                    parsed.updatedAt = parsed.updatedAt || now;
                    processedResults.push(parsed);
                }
                catch (err) {
                    console.error("❌ Gemini processing error:", err);
                    continue;
                }
            }
        }
        return processedResults;
    }
    catch (err) {
        console.error("Error in linkedin post filtration:", err);
        return [];
    }
};
exports.linkedinPostFilter = linkedinPostFilter;
