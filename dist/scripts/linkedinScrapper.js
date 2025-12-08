"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkedinScrapper = void 0;
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
const wait = (ms) => new Promise((res) => setTimeout(res, ms));
const parseRelativeTime = (text) => {
    if (!text)
        return null;
    const now = Date.now();
    const t = text.toLowerCase();
    if (/just now|a moment ago/.test(t))
        return new Date(now);
    // minutes
    let m = t.match(/(\d+)\s*min(?:ute)?s?\b/);
    if (!m)
        m = t.match(/(\d+)\s*m\b/);
    if (m)
        return new Date(now - parseInt(m[1], 10) * 60 * 1000);
    // hours
    let h = t.match(/(\d+)\s*hour?s?\b/);
    if (!h)
        h = t.match(/(\d+)\s*h\b/);
    if (h)
        return new Date(now - parseInt(h[1], 10) * 60 * 60 * 1000);
    // days
    let d = t.match(/(\d+)\s*day?s?\b/);
    if (!d)
        d = t.match(/(\d+)\s*d\b/);
    if (d)
        return new Date(now - parseInt(d[1], 10) * 24 * 60 * 60 * 1000);
    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed))
        return new Date(parsed);
    return null;
};
const linkedinScrapper = async (linkedinConfig, maxPosts, inputQuery) => {
    try {
        const browser = await puppeteer_extra_1.default.launch({
            headless: false,
            args: ["--no-sandbox"],
        });
        const page = await browser.newPage();
        const cookiesPath = path_1.default.join(__dirname, "../../linkedin.cookies.json");
        const cookies = JSON.parse(fs_1.default.readFileSync(cookiesPath, "utf-8"));
        await page.setCookie(...cookies);
        const contentURL = `https://www.linkedin.com/search/results/content/?keywords=campus%20hiring%20OR%20on%20campus%20OR%20pool%20campus%20OR%20TPO%20OR%20placement%20cell%20OR%20campus%20drive`;
        await page.goto(contentURL, {
            waitUntil: "networkidle2",
        });
        await wait(2500);
        // 24 hour cutoff
        const cutoffMs = 24 * 60 * 60 * 1000;
        const now = Date.now();
        // control params
        const maxScrollAttempts = 20;
        const scrollPause = 1400;
        let scrollAttempts = 0;
        let oldestLoadedPostTime = null;
        const readLoadedPosts = async () => {
            return await page.$$eval(linkedinConfig.selectors.postContainer, (nodes) => nodes.map((el) => {
                const text = el.innerText || "";
                let timeAttr = null;
                const timeEl = el.querySelector("time");
                if (timeEl && timeEl.getAttribute("datetime")) {
                    timeAttr = timeEl.getAttribute("datetime");
                }
                else {
                    const meta = el.querySelector("[data-test-timestamp], .feed-shared-actor__sub-description, .feed-shared-actor__meta, span.visually-hidden");
                    if (meta)
                        timeAttr = (meta.textContent || "").trim();
                }
                return {
                    text,
                    timeRaw: timeAttr,
                };
            }));
        };
        let collected = [];
        while (scrollAttempts < maxScrollAttempts) {
            const loaded = await readLoadedPosts();
            collected = loaded.map((p) => {
                let ts = null;
                if (p.timeRaw) {
                    const maybeISO = Date.parse(p.timeRaw);
                    if (!Number.isNaN(maybeISO))
                        ts = new Date(maybeISO);
                    else {
                        ts = (function () {
                            const t = (p.timeRaw || "").trim();
                            return null;
                        })();
                    }
                }
                return { text: p.text, timeRaw: p.timeRaw || null, timestamp: null };
            });
            const loadedNode = await page.$$eval(linkedinConfig.selectors.postContainer, (nodes) => nodes.map((el) => {
                const text = el.innerText || "";
                const timeEl = el.querySelector("time");
                const timeRaw = timeEl?.getAttribute("datetime") || (el.querySelector(".feed-shared-actor__sub-description, .feed-shared-actor__meta, span.visually-hidden")?.textContent || "");
                return { text, timeRaw: (timeRaw || "").trim() };
            }));
            const parsed = loadedNode.map((p) => {
                let ts = null;
                if (p.timeRaw) {
                    const iso = Date.parse(p.timeRaw);
                    if (!Number.isNaN(iso))
                        ts = new Date(iso);
                    else {
                        ts = parseRelativeTime(p.timeRaw);
                        if (!ts) {
                            const candidate = p.text.match(/\b(\d+)\s*(?:h|hr|hour|hours|m|min|minute|day|d)\b/i);
                            if (candidate) {
                                ts = parseRelativeTime(candidate[0]);
                            }
                        }
                    }
                }
                else {
                    const candidate = p.text.match(/\b(\d+)\s*(?:hours?|hrs?|h|minutes?|mins?|m|days?|d)\b/i);
                    if (candidate)
                        ts = parseRelativeTime(candidate[0]);
                }
                return { text: p.text, timestamp: ts };
            });
            const timestamps = parsed.map((x) => x.timestamp).filter(Boolean);
            if (timestamps.length) {
                const minTs = new Date(Math.min(...timestamps.map((d) => d.getTime())));
                oldestLoadedPostTime = minTs;
            }
            else {
                oldestLoadedPostTime = null;
            }
            if (oldestLoadedPostTime && now - oldestLoadedPostTime.getTime() > cutoffMs + 5 * 60 * 1000) {
                break;
            }
            if (parsed.length >= maxPosts)
                break;
            await page.evaluate(() => window.scrollBy({ top: window.innerHeight, left: 0, behavior: "smooth" }));
            await wait(scrollPause + Math.floor(Math.random() * 800));
            scrollAttempts++;
        }
        const finalLoaded = await page.$$eval(linkedinConfig.selectors.postContainer, (nodes) => nodes.map((el) => {
            const text = el.innerText || "";
            const timeEl = el.querySelector("time");
            const timeRaw = timeEl?.getAttribute("datetime") || (el.querySelector(".feed-shared-actor__sub-description, .feed-shared-actor__meta, span.visually-hidden")?.textContent || "");
            return { text, timeRaw: (timeRaw || "").trim() };
        }));
        const finalParsed = finalLoaded.map((p) => {
            let ts = null;
            if (p.timeRaw) {
                const iso = Date.parse(p.timeRaw);
                if (!Number.isNaN(iso))
                    ts = new Date(iso);
                else
                    ts = parseRelativeTime(p.timeRaw) || null;
            }
            if (!ts) {
                const candidate = p.text.match(/\b(\d+)\s*(?:hours?|hrs?|h|minutes?|mins?|m|days?|d)\b/i);
                if (candidate)
                    ts = parseRelativeTime(candidate[0]);
            }
            return { description: p.text.trim(), timestamp: ts };
        });
        const cutoff = new Date(Date.now() - cutoffMs);
        const postsWithin24h = finalParsed.filter((p) => {
            if (!p.timestamp)
                return false;
            return p.timestamp.getTime() >= cutoff.getTime();
        }).map((p) => p.description);
        await browser.close();
        return postsWithin24h.slice(0, maxPosts);
    }
    catch (err) {
        console.log("Error in scrapper...", err);
        return [];
    }
};
exports.linkedinScrapper = linkedinScrapper;
