import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
 testDir: "./tests",
 timeout: 30_000,
 expect: { timeout: 10_000 },
 retries: process.env.CI ? 1 : 0,
 reporter: process.env.CI ? [["github"], ["html", { open:"never", outputFolder:"playwright-report" }]] : "list",
 use: { baseURL:"http://127.0.0.1:3100", trace:"retain-on-failure", screenshot:"only-on-failure" },
 projects: [{ name:"chromium", use:devices["Desktop Chrome"] }, {name:"mobile-chromium",use:devices["Pixel 7"]}],
 webServer: {
  command:"npm run start -- --hostname 127.0.0.1 --port 3100",
  port:3100,
  reuseExistingServer:!process.env.CI,
  timeout:120_000,
  env:{
   NEXT_PUBLIC_SUPABASE_URL:"https://wvipkluopmptwuvihecz.supabase.co",
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"ci-placeholder-not-a-secret"
  }
 }
});
