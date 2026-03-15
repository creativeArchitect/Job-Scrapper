import { autoScrollUntil } from "@/utils/action.utils";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import puppeteer from "puppeteer-extra";
import fs from "fs";
import path from "path";

puppeteer.use(StealthPlugin());

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

const parseRelativeTime = (text: string): Date | null => {
  if (!text) return null;

  const now = Date.now();
  const t = text.toLowerCase().trim();

  // just now
  if (/just now|a moment ago|now/.test(t)) return new Date(now);

  // seconds
  let s = t.match(/(\d+)\s*(?:s|sec|secs|second|seconds)\b/);
  if (s) return new Date(now - parseInt(s[1], 10) * 1000);

  // minutes
  let m = t.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/);
  if (m) return new Date(now - parseInt(m[1], 10) * 60 * 1000);

  // hours
  let h = t.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)\b/);
  if (h) return new Date(now - parseInt(h[1], 10) * 3600 * 1000);

  // days
  let d = t.match(/(\d+)\s*(?:d|day|days)\b/);
  if (d) return new Date(now - parseInt(d[1], 10) * 86400 * 1000);

  // weeks
  let w = t.match(/(\d+)\s*(?:w|wk|wks|week|weeks)\b/);
  if (w) return new Date(now - parseInt(w[1], 10) * 7 * 86400 * 1000);

  // months (approx 30 days)
  let mo = t.match(/(\d+)\s*(?:mo|mos|month|months)\b/);
  if (mo) return new Date(now - parseInt(mo[1], 10) * 30 * 86400 * 1000);

  // years (approx 365 days)
  let y = t.match(/(\d+)\s*(?:y|yr|yrs|year|years)\b/);
  if (y) return new Date(now - parseInt(y[1], 10) * 365 * 86400 * 1000);

  // fallback: direct date
  const parsed = Date.parse(text);
  if (!Number.isNaN(parsed)) return new Date(parsed);

  return null;
};


export const linkedinScrapper = async (
  linkedinConfig: any,
  maxPosts: number,
  inputQuery: any
) => {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox"],
    });

    const page = await browser.newPage();

    const cookiesPath = path.join(__dirname, "../../linkedin.cookies.json");
    const cookies = JSON.parse(fs.readFileSync(cookiesPath, "utf-8"));
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
    const scrollPause = 2000;
    let scrollAttempts = 0;
    let oldestLoadedPostTime: Date | null = null;

    const readLoadedPosts = async () => {
      return await page.$$eval(
        linkedinConfig.selectors.postContainer,
        (nodes: Element[]) =>
          nodes.map((el) => {
            const text = (el as HTMLElement).innerText || "";

            let timeAttr: string | null = null;
            const timeEl = el.querySelector("time");
            if (timeEl && timeEl.getAttribute("datetime")) {
              timeAttr = timeEl.getAttribute("datetime");
            } else {
              const meta = el.querySelector("[data-test-timestamp], .feed-shared-actor__sub-description, .feed-shared-actor__meta, span.visually-hidden" as any);
              if (meta) timeAttr = (meta.textContent || "").trim();
            }

            return {
              text,
              timeRaw: timeAttr,
            };
          })
      );
    };

    let collected: { text: string; timestamp: Date | null }[] = [];
    while (scrollAttempts < maxScrollAttempts) {
      const loaded = await readLoadedPosts();

      collected = loaded.map((p) => {
        let ts: Date | null = null;
        if (p.timeRaw) {
          const maybeISO = Date.parse(p.timeRaw);
          if (!Number.isNaN(maybeISO)) ts = new Date(maybeISO);
          else {
            ts = (function () {
              const t = (p.timeRaw || "").trim();
              return null;
            })();
          }
        }
        return { text: p.text, timeRaw: p.timeRaw || null, timestamp: null as Date | null };
      });

      const loadedNode = await page.$$eval(
        linkedinConfig.selectors.postContainer,
        (nodes: Element[]) =>
          nodes.map((el) => {
            const text = (el as HTMLElement).innerText || "";
            const timeEl = el.querySelector("time");
            const timeRaw = timeEl?.getAttribute("datetime") || (el.querySelector(".feed-shared-actor__sub-description, .feed-shared-actor__meta, span.visually-hidden" as any)?.textContent || "");
            return { text, timeRaw: (timeRaw || "").trim() };
          })
      );

      const parsed = loadedNode.map((p) => {
        let ts: Date | null = null;
        if (p.timeRaw) {
          const iso = Date.parse(p.timeRaw);
          if (!Number.isNaN(iso)) ts = new Date(iso);
          else {
            ts = parseRelativeTime(p.timeRaw);
            if (!ts) {
              const candidate = p.text.match(/\b(\d+)\s*(?:h|hr|hour|hours|m|min|minute|day|d)\b/i);
              if (candidate) {
                ts = parseRelativeTime(candidate[0]);
              }
            }
          }
        } else {
          const candidate = p.text.match(/\b(\d+)\s*(?:hours?|hrs?|h|minutes?|mins?|m|days?|d)\b/i);
          if (candidate) ts = parseRelativeTime(candidate[0]);
        }
        return { text: p.text, timestamp: ts };
      });

      const timestamps = parsed.map((x) => x.timestamp).filter(Boolean) as Date[];
      if (timestamps.length) {
        const minTs = new Date(Math.min(...timestamps.map((d) => d.getTime())));
        oldestLoadedPostTime = minTs;
      } else {
        oldestLoadedPostTime = null;
      }

      if (oldestLoadedPostTime && now - oldestLoadedPostTime.getTime() > cutoffMs + 5 * 60 * 1000) {
        break;
      }

      if (parsed.length >= maxPosts) break;

      await page.evaluate(() => window.scrollBy({ top: window.innerHeight, left: 0, behavior: "smooth" }));
      await wait(scrollPause + Math.floor(Math.random() * 800));
      scrollAttempts++;
    }

    const finalLoaded = await page.$$eval(
      linkedinConfig.selectors.postContainer,
      (nodes: Element[]) =>
        nodes.map((el) => {
          const text = (el as HTMLElement).innerText || "";
          const timeEl = el.querySelector("time");
          const timeRaw = timeEl?.getAttribute("datetime") || (el.querySelector(".feed-shared-actor__sub-description, .feed-shared-actor__meta, span.visually-hidden" as any)?.textContent || "");
          return { text, timeRaw: (timeRaw || "").trim() };
        })
    );

    const finalParsed = finalLoaded.map((p) => {
      let ts: Date | null = null;
      if (p.timeRaw) {
        const iso = Date.parse(p.timeRaw);
        if (!Number.isNaN(iso)) ts = new Date(iso);
        else ts = parseRelativeTime(p.timeRaw) || null;
      }
      if (!ts) {
        const candidate = p.text.match(/\b(\d+)\s*(?:hours?|hrs?|h|minutes?|mins?|m|days?|d)\b/i);
        if (candidate) ts = parseRelativeTime(candidate[0]);
      }
      return { description: p.text.trim(), timestamp: ts };
    });

    const cutoff = new Date(Date.now() - cutoffMs);

    const postsWithin24h = finalParsed.filter((p) => {
      if (!p.timestamp) return false;
      return Date.now() - p.timestamp.getTime() <= 24 * 60 * 60 * 1000;
    });
    

    await browser.close();
    return postsWithin24h.slice(0, maxPosts); 
  } catch (err) {
    console.log("Error in scrapper...", err);
    return [];
  }
};
