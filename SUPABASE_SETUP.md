# Supabase Realtime Setup Guide

This project now uses **Supabase Realtime** for online multiplayer instead of a custom Node.js server. This is the cleanest, most reliable, and truly free long-term solution.

## Step 1: Create a Supabase Project (Free)

1. Go to [https://supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Create a new organization if needed
4. Fill in:
   - Project name: `cribbage` (or whatever you want)
   - Database Password: (save this somewhere safe)
   - Region: Choose something close to you
5. Click **Create new project**

## Step 2: Get Your API Keys

Once the project is created:

1. Go to **Project Settings** → **API**
2. Copy these two values:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

## Step 3: Add Environment Variables

Create a file called `.env` in the root of the project (next to `package.json`):

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:** Never commit your `.env` file.

## Step 4: (Optional but Recommended) Create a Rooms Table

While not strictly required for basic functionality, creating a simple table helps with room management:

1. Go to **Table Editor** in your Supabase dashboard
2. Click **"New Table"**
3. Create a table called `rooms` with these columns:

| Name          | Type     | Default Value          | Notes                     |
|---------------|----------|------------------------|---------------------------|
| id            | uuid     | uuid_generate_v4()     | Primary key               |
| code          | text     |                        | Unique, indexed           |
| created_at    | timestamp| now()                  |                           |
| host_name     | text     |                        |                           |
| player_count  | int      | 1                      |                           |
| is_active     | boolean  | true                   |                           |

You can also enable Row Level Security later if you want.

## Step 5: Run the Game

```bash
npm run dev
```

Click **"Online Room"** in the menu. You should now be able to:
- Create a room (gets a 5-character code)
- Join a room using the code
- Play with other people in real time

## How It Works

- Each room uses a Supabase Realtime channel (`game:ABC12`)
- Game actions are broadcast to everyone in the channel
- Every client runs the same pure game engine locally
- Presence is used to show who is in the room

This architecture is very reliable and scales well on Supabase's free tier.

## Free Tier Limits (as of 2026)

Supabase's free tier is quite generous for a game like this:
- 500 MB database
- 2 GB bandwidth per month
- Good realtime limits for small groups

For a casual cribbage game with friends, you will almost certainly stay well within the free limits.

## Next Improvements (Future Work)

- Add a proper `rooms` table + expiry logic
- Add reconnection handling
- Add chat in rooms
- Show list of public rooms (optional)
- Rate limiting on actions

---

You're now using one of the cleanest free multiplayer architectures possible for a game like this.
