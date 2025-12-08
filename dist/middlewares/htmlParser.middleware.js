"use strict";
// import * as cheerio from "cheerio";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobContainer = JobContainer;
// export const findJobContainer = (completeHTML: any, position: string) => {
//   const $ = cheerio.load(completeHTML);
//   const selectors = [
//     `[class*=${position}]`,
//     `[id*=${position}]`,
//     '[class*="job"]',
//     '[id*="job"]',
//     '[class*="career"]',
//     '[id*="career"]',
//     '[class*="opening"]',
//     '[class*="vacancy"]',
//   ];
//   let results: string[] = [];
//   selectors.forEach((s) => {
//     $(s).each((_, el) => {
//       const text = $(el).text().trim();
//       if (text.length > 50) {
//         results.push($.html(el)!);
//       }
//     });
//   });
//   console.log("totalJOBS FOUND: ", results);
//   const uniqueJobs = Array.from(new Set(results));  // array <- array like OBJECT.
//   return uniqueJobs;
// };
const cheerio = __importStar(require("cheerio"));
function JobContainer(html) {
    try {
        const $ = cheerio.load(html);
        const probableContainers = [];
        $("div, section, ul, article").each((_, el) => {
            const attr = ($(el).attr("class") || "") + ($(el).attr("id") || "");
            const text = $(el).text().trim().toLowerCase();
            // Detect job-like containers either by attribute or visible text
            if (/job|career|opening|position|vacancy|role|opportunit|hiring/i.test(attr) ||
                (/apply/i.test(text) && /developer|engineer|manager|intern|designer|sales|marketing/.test(text))) {
                const childCount = $(el).children().length;
                const textLen = text.length;
                probableContainers.push({
                    tag: el.tagName,
                    class: $(el).attr("class"),
                    id: $(el).attr("id"),
                    childCount,
                    textLen,
                    html: $.html(el),
                });
            }
        });
        probableContainers.sort((a, b) => {
            // Sort by both text length and child count
            return b.textLen - a.textLen || b.childCount - a.childCount;
        });
        console.log(`🔍 Found ${probableContainers.length} potential job containers`);
        // Return top few probable HTML blocks
        return probableContainers.slice(0, 3);
    }
    catch (err) {
        console.error("Error parsing job container:", err);
        return [];
    }
}
