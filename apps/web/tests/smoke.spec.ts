import { test, expect } from "@playwright/test";

test("public landing page works without authentication", async ({page})=>{
 await page.goto("/");
 await expect(page.getByRole("heading",{name:/learn new skills/i})).toBeVisible();
 await expect(page.getByRole("link",{name:/Explore programs/i}).first()).toBeVisible();
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+5);
 expect(overflow).toBe(false);
});

test("programs page does not disclose internal QA batches", async ({page})=>{
 await page.goto("/programs");
 await expect(page.getByRole("heading",{name:/Train with mentors/i})).toBeVisible();
 await expect(page.locator("body")).not.toContainText("Internal QA test");
});

test("login form is available", async ({page})=>{
 await page.goto("/login");
 await expect(page.getByRole("heading",{name:/Welcome to HackSphere/i})).toBeVisible();
 await expect(page.getByRole("button",{name:/Continue with Google/i})).toBeVisible();
});

test("every workspace rejects unauthenticated visitors",async({page})=>{
 for (const path of ["/workspace","/workspace/admin","/workspace/mentor","/workspace/student",
  "/workspace/admin/payments","/workspace/mentor/classes","/workspace/student/learning"]) {
  await page.goto(path);
  await expect(page).toHaveURL(/\/login(?:\?|$)/);
 }
});

test("OAuth callback without code fails closed",async({page})=>{
 await page.goto("/auth/callback?next=https://evil.example");
 await expect(page).toHaveURL(/\/login\?error=missing_code/);
});
