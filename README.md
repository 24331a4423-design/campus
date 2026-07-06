# Campus Guardian – AI-Powered Lost & Found and Asset Protection System

Campus Guardian is a production-ready web application built for college campuses. It helps students and staff report lost and found items, query the registry, matching entries automatically using Google Gemini AI, and submit manual claim requests verified by administrators.

## Tech Stack
* **Frontend:** React.js (Vite), Bootstrap 5, Bootstrap Icons, React Router
* **Backend / Database:** Supabase PostgreSQL, Authentication, & Storage
* **AI Engine:** Google Gemini 1.5 Flash API (client-side description matching with smart heuristic fallback)
* **Deployment:** Ready for Vercel & Supabase Cloud

---

## 🛠️ Step 1: Supabase Database Setup

1. Go to [Supabase Console](https://supabase.com/) and create a new project.
2. Open the **SQL Editor** tab from the left navigation menu.
3. Click **New Query** and copy-paste the entire contents of the `schema.sql` file located in the root of this project.
4. Click **Run**. This will create:
   * Tables: `profiles`, `lost_items`, `found_items`, `ai_matches`, `claims`, `notifications`.
   * Indexes and helper functions (`is_admin()`).
   * Row Level Security (RLS) policies for all tables.
   * A Database Trigger (`on_auth_user_created`) to automatically sync newly registered users into public profile details.

---

## 📦 Step 2: Supabase Storage Configuration

1. Go to the **Storage** section from the left navigation menu in the Supabase console.
2. Click **New Bucket**.
3. Name the bucket: `item-images`.
4. Set the bucket privacy level to **Private**.
5. Inside the bucket, create two folders (optional, as the SDK handles folders automatically):
   * `lost/`
   * `found/`
6. Configure Row Level Security (RLS) policies for the storage bucket `item-images`:
   * **Select/Read Policy:** Allow read access to authenticated users (`auth.role() = 'authenticated'`).
   * **Insert/Upload Policy:** Allow uploads if authenticated (`auth.role() = 'authenticated'`).
   * **Update/Delete Policy:** Allow updates and deletes to own files, or give full storage permissions to administrators.

---

## 🔑 Step 3: Local Environment Setup

1. Clone or download this project workspace.
2. Open the `.env` file at the root and fill in your Supabase credentials and Google Gemini API key:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_GEMINI_API_KEY=AIzaSy...
```

* **VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY:** Found in the Supabase Console under **Settings > API**.
* **VITE_GEMINI_API_KEY:** Obtain from [Google AI Studio](https://aistudio.google.com/).
  * *Note: If no Gemini API Key is configured, the application automatically runs in fallback matching mode using advanced keyword overlap heuristics, preventing interface blockages.*

---

## 💻 Step 4: Running the App Locally

Ensure you have Node.js and npm installed, then run:

```bash
# 1. Install dependencies
npm install

# 2. Run the local Vite dev server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🔍 Step 5: AI Description Matching & Workflows

1. **Reporting an Item:**
   * Open the student dashboard and click **Report Lost** or **Report Found**.
   * Fill in the attributes and upload an image (JPG, PNG, JPEG, WEBP; Max 5MB).
   * Submit the report.
2. **AI Comparison:**
   * Campus Guardian pulls opposite open reports (e.g., if you submit a Lost item, it pulls all open Found items).
   * It calls the Google Gemini 1.5 Flash API with detailed specifications.
   * If Gemini reports a score $\ge 50\%$, the match is logged to the `ai_matches` table.
   * A real-time notification alerts the user of a possible match.
3. **Manual verification:**
   * The user opens **Suggested Matches** and clicks **Verify**.
   * It presents a **Split-Screen Layout**: Lost Item details on the left, Found Item details on the right.
   * The owner of the lost report can click **Request Claim**.
   * Administrators verify details from the **Verify Claims** page, input remarks, and click **Approve** (marks reports as resolved) or **Reject** (releases items for other claims).

---

## 🚀 Step 6: Deploying to Vercel

### Option A: Using Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy the project
vercel
```

### Option B: Deploying via GitHub Integration
1. Push this project code to a GitHub repository.
2. Go to the [Vercel Dashboard](https://vercel.com/) and click **Add New Project**.
3. Import the GitHub repository.
4. Under **Environment Variables**, add:
   * `VITE_SUPABASE_URL`
   * `VITE_SUPABASE_ANON_KEY`
   * `VITE_GEMINI_API_KEY`
5. Click **Deploy**. Vercel will build and serve your static client assets.
