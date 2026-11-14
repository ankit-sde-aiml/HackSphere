# HackSphere — Google Sign-In and First Administrator setup

Current platform:
- Website: https://hacksphere.sipl-test-dev.workers.dev
- Supabase project: https://supabase.com/dashboard/project/wvipkluopmptwuvihecz
- Supabase Auth callback: https://wvipkluopmptwuvihecz.supabase.co/auth/v1/callback

## 1. Google Cloud owner setup (required)

1. Sign in to https://console.cloud.google.com/ and create/select a Google Cloud project named **HackSphere**.
2. Open **Google Auth Platform > Branding**. Set app name HackSphere, a real support/developer email, and finish the required setup fields.
3. Open **Audience**. Choose **External** if Google accounts outside your own organization will sign in. Keep **Testing** for an initial pilot; add the first administrator and tester Google addresses as test users. Google has testing-mode limitations; before broad public launch, review Google production/brand verification requirements.
4. **Data Access**: request only the standard identity scopes openid, email, profile for login. Do not request Google Meet API scopes here.
5. Open **Clients > Create Client > Web application**. Name: HackSphere Web Login.
6. **Authorized JavaScript origins**: https://hacksphere.sipl-test-dev.workers.dev
7. **Authorized redirect URIs**: https://wvipkluopmptwuvihecz.supabase.co/auth/v1/callback
8. Create the client; copy the Client ID and Client Secret into the **Supabase Dashboard only**. Do NOT put a Client Secret in this GitHub repo, a screenshot, or ChatGPT.
9. Google may require a verified custom domain and published privacy policy for public app brand verification. The `workers.dev` shared subdomain is best treated as a temporary pilot hostname, not guaranteed for verified production branding.

## 2. Supabase dashboard configuration

1. Open https://supabase.com/dashboard/project/wvipkluopmptwuvihecz/auth/providers
2. Select **Google** and Enable Google provider.
3. Paste Google OAuth **Client ID** and **Client Secret** from the Google Cloud project; save securely. Keep Skip Nonce Check OFF.
4. Open https://supabase.com/dashboard/project/wvipkluopmptwuvihecz/auth/url-configuration
5. **Site URL**: https://hacksphere.sipl-test-dev.workers.dev/
6. **Redirect URLs**: include https://hacksphere.sipl-test-dev.workers.dev/ (exact HTTPS root).
7. The web app uses Supabase `signInWithOAuth({provider:'google'})` and requests an explicit Google account chooser.
8. After Google sign-in is tested, disable unnecessary email/password or anonymous providers to enforce the agreed Google-only sign-in policy.

## 3. First administrator bootstrapping (NOT POSSIBLE BEFORE FIRST GOOGLE LOGIN)

1. Add the chosen administrator Google address as a Google Auth Platform test user.
2. Visit https://hacksphere.sipl-test-dev.workers.dev and click **Sign in / Continue with Google**.
3. Confirm you are signed into the intended Google account and successfully return to HackSphere. Its first login is a *Student* account until an admin is assigned.
4. Run **db/bootstrap_first_admin_template.sql** from the SQL editor, after replacing the placeholder with the exact Google address. The script validates that the user exists and has a verified Google identity.
5. Refresh HackSphere. The signed-in user now has **Administrator** in their role selector.
6. Do not bootstrap an admin using unverified profile fields or user-supplied metadata.

## 4. Required test checklist

- New Google identity reaches HackSphere and has no Admin rights.
- The selected verified Google identity gets Administrator after bootstrap.
- An uninvited Google identity cannot select Trainer/Guide.
- Admin can invite a Trainer and/or Guide to a Google email.
- Invitee must sign in using the same verified Google account to accept the role.
- Assigning both roles shows role switching; switching changes the dashboard, not the identity.
- A student does not see another student's programs or private future lessons.
- Only a verified UPI bank-credit approval activates enrollment.

## 5. Google Meet API is a DIFFERENT OAuth authorization

Student/Admin/Guide only require normal Google login. Trainer authorization for creating Google Meet spaces needs a separate consent flow and secure server-side OAuth callback, with per-trainer encrypted provider refresh tokens. DO NOT add Meet scopes to ordinary student login and DO NOT put the OAuth Client Secret in frontend code. This stage cannot be considered enabled until separately implemented and tested.

## Troubleshooting

- `redirect_uri_mismatch`: compare the Google **Supabase callback** exactly, including scheme, host and path.
- `requested path is not in redirect allow list`: add HackSphere's root HTTPS redirect URL in Supabase Auth URL Configuration.
- `access blocked: app has not completed verification`: check Google Auth Platform Audience and test user list.
- Default Google account chosen instead of invitation Google account: log out/switch on Google consent chooser and use exact invited identity.
- If the `workers.dev` domain is rejected for verified public branding, use a custom domain you own and repeat authorized origin, Supabase redirect URL, Site URL and Google verification.

Official documentation:
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/redirect-urls
- https://developers.google.com/identity/verification/authentication-policy-compliance
