"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapper = void 0;
const action_utils_1 = require("@/utils/action.utils");
const playwright_extra_1 = require("playwright-extra");
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
playwright_extra_1.chromium.use((0, puppeteer_extra_plugin_stealth_1.default)());
const scrapper = async (config, role, maxJobs = 5, platform) => {
    try {
        const browser = await playwright_extra_1.chromium.launch({
            headless: true
        });
        const page = await browser.newPage();
        let updatedRole = role;
        if (platform === "internshala") {
            updatedRole = role.replace(" ", "-");
        }
        else if (platform === "cuvette") {
            updatedRole = role.replace(" ", "%20");
        }
        else {
            updatedRole = role.replace(" ", "-");
        }
        const url = config.loadType === 'pagination' ? config.searchUrl(updatedRole) : config.baseUrl;
        await page.goto(url, {
            waitUntil: 'networkidle'
        });
        // If site requires search form:
        if (config.selectors.searchInput) {
            await page.fill(config.selectors.searchInput, role);
            await page.click(config.selectors.searchButton);
            await page.waitForLoadState('networkidle');
        }
        // Wait for container with retry
        // await waitForSelectorWithRetry(page, config.selectors.container, 30000);
        // If infinite scroll:
        if (config.loadType === 'scroll') {
            await (0, action_utils_1.autoScrollUntil)(page, config.selectors.container, maxJobs);
        }
        if (config.loadType === 'pagination') {
            await (0, action_utils_1.paginateUntil)(page, config, maxJobs);
        }
        const jobs = await page.$$eval(config.selectors.container, (elements, { limit }) => {
            return elements.slice(0, limit).map(el => el.outerHTML);
        }, {
            limit: maxJobs,
            selectors: config.selectors,
            platform: config.baseUrl,
        });
        await browser.close();
        return jobs;
    }
    catch (err) {
        console.log("Error in scrapper...", err);
        return [];
    }
};
exports.scrapper = scrapper;
