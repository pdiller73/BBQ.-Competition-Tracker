# Competition Pro — Deployment Guide
# From zero to live website in about 20 minutes

---

## What you'll set up

1. **Supabase** — free database + user accounts (5 minutes)
2. **GitHub** — free code storage (5 minutes)
3. **Vercel** — free hosting that auto-deploys from GitHub (5 minutes)

All three have free tiers that will cover you well past the point of needing to pay.

---

## PART 1 — Supabase (Database + Auth)

### Step 1: Create your Supabase account

1. Go to **https://supabase.com**
2. Click **Start your project** and sign up with GitHub or email
3. Click **New project**
4. Fill in:
   - **Name:** competition-pro (or whatever you want)
   - **Database Password:** make something strong, save it somewhere
   - **Region:** pick the one closest to you
5. Click **Create new project** — takes about 2 minutes to spin up

### Step 2: Run the database schema

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase-schema.sql` from this project
4. Copy the entire contents and paste into the SQL editor
5. Click **Run** (the green button)
6. You should see "Success. No rows returned" — that's correct

This creates your tables (competitions, recipes, user_settings) and sets up
security so each user can only ever see their own data.

### Step 3: Get your API keys

1. In your Supabase project, click **Settings** (gear icon) in the left sidebar
2. Click **API**
3. You'll see two values you need — copy both:
   - **Project URL** — looks like: https://abcdefgh.supabase.co
   - **anon public** key — a long string starting with "eyJ..."

Keep this browser tab open — you'll need these values in Part 3.

### Step 4: Enable email confirmations (optional but recommended)

By default Supabase requires users to confirm their email before signing in.
This is good for production. If you want to skip it during testing:

1. Go to **Authentication** → **Providers** → **Email**
2. Toggle off "Confirm email"
3. Save

You can turn it back on later once everything is working.

---

## PART 2 — GitHub (Code Storage)

### Step 1: Create a GitHub account

1. Go to **https://github.com**
2. Sign up for a free account if you don't have one

### Step 2: Create a new repository

1. Click the **+** icon (top right) → **New repository**
2. Fill in:
   - **Repository name:** competition-pro
   - **Visibility:** Private (recommended — keeps your code private)
   - Leave everything else as-is
3. Click **Create repository**

### Step 3: Upload your code

GitHub will show you a page with instructions. Use the "upload" method:

1. Click **uploading an existing file** link on the page
2. Open the `competition-pro` folder on your computer (from the zip you downloaded)
3. Select ALL files and folders inside it and drag them into the GitHub upload area
4. Important: make sure you upload the CONTENTS of the folder, not the folder itself
5. Scroll down, type a commit message like "Initial upload"
6. Click **Commit changes**

Your code is now on GitHub.

---

## PART 3 — Vercel (Hosting)

### Step 1: Create a Vercel account

1. Go to **https://vercel.com**
2. Click **Sign Up** and choose **Continue with GitHub**
3. Authorize Vercel to access your GitHub account

### Step 2: Deploy your project

1. On the Vercel dashboard, click **Add New** → **Project**
2. You'll see your GitHub repos listed — click **Import** next to **competition-pro**
3. Vercel will auto-detect that it's a Vite/React project
4. Before clicking Deploy, click **Environment Variables** to expand that section

### Step 3: Add your Supabase keys

Add these two environment variables (use the values from Supabase Part 1 Step 3):

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | https://your-project-id.supabase.co |
| `VITE_SUPABASE_ANON_KEY` | eyJ... (the long anon key) |

Click **Add** after each one.

### Step 4: Deploy

1. Click **Deploy**
2. Vercel builds and deploys — takes about 30-60 seconds
3. You'll see a success screen with a URL like: **competition-pro-abc123.vercel.app**
4. Click that URL — your app is live!

---

## PART 4 — Test it

1. Open your live URL
2. You should see the Competition Pro sign-in screen
3. Click "Don't have an account? Sign up"
4. Create an account with your email
5. If email confirmation is on, check your email and click the confirm link
6. Sign in — your app loads with an empty data set
7. Add a competition, save it, sign out, sign back in — data should persist

---

## PART 5 — Custom Domain (Optional)

If you have your own domain name (e.g. mybbqteam.com):

1. In Vercel, go to your project → **Settings** → **Domains**
2. Type your domain name and click **Add**
3. Vercel gives you DNS records to add at your domain registrar
4. Add those records (usually takes 10-30 minutes to propagate)
5. Vercel automatically handles SSL/HTTPS

---

## Ongoing Updates

Every time you want to update the app:

1. Make changes to your local files
2. Go to your GitHub repo → **Add file** → **Upload files**
3. Upload the changed files and commit
4. Vercel automatically detects the change and redeploys in ~30 seconds

Or if you get comfortable with Git, you can use `git push` and it's even faster.

---

## Troubleshooting

**"Missing Supabase environment variables" error**
→ Check that you added both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.
→ Redeploy after adding them (Vercel → Deployments → Redeploy).

**"Invalid API key" error**
→ Double-check you copied the **anon public** key, not the service_role key.

**Users can sign up but data doesn't save**
→ Make sure you ran the full supabase-schema.sql — especially the RLS policies at the bottom.

**Build fails on Vercel**
→ Check the build logs in Vercel → Deployments → click the failed deployment.
→ Most common cause: a typo in an environment variable name.

**Email confirmation emails not arriving**
→ Check spam folder. Or temporarily disable email confirmation in Supabase Auth settings.

---

## Security Notes

- Row Level Security (RLS) is enabled on all tables — users cannot access each other's data even if they tried
- The anon key is safe to expose in frontend code — it has no special permissions without a valid user session
- Never share or expose your Supabase service_role key — that one bypasses all security
- Your .env.local file is in .gitignore so it will never be uploaded to GitHub

---

## Free Tier Limits

**Supabase free tier:**
- 500MB database storage
- 2GB file storage
- 50,000 monthly active users
- Unlimited API requests

**Vercel free tier:**
- 100GB bandwidth/month
- Unlimited deployments
- Custom domain support

Both are more than enough for a competition BBQ team app.
