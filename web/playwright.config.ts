import {defineConfig} from "@playwright/test";
export default defineConfig({testDir:"./tests",testMatch:"*.spec.ts",workers:1,fullyParallel:false,timeout:45000,use:{baseURL:process.env.BASE_URL||"http://localhost:8088",channel:process.env.CI?"chromium":"chrome",trace:"retain-on-failure",screenshot:"only-on-failure"},reporter:"list"});
