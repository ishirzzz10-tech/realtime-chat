# ⚡ Realtime Chat

A polished **realtime chat app** built with **Expo (React Native)** and **Supabase**.
No custom backend server — Supabase provides the database and the Realtime
service. Runs on Android & iOS through the free **Expo Go** app.

| | |
|---|---|
| **Frontend** | Expo / React Native |
| **Backend** | Supabase (Postgres + Realtime + Edge Functions) |
| **Sign-in** | Username only — pick a name and chat |
| **Realtime** | Live messages, online presence, typing indicator |

---

## ✨ Features

- **Live messages** — new messages appear instantly on every device (Supabase Realtime / Postgres changes).
- **Online presence** — see who's currently in the room (Supabase Realtime Presence).
- **Typing indicator** — animated dots when someone else is typing (Supabase Realtime Broadcast).
- **Username login** — no passwords; a stable device id keeps "you" as you.
- **Polished UI** — gradient header, colored avatars, chat bubbles, keyboard-aware composer, dark theme.
- **Graceful setup** — until Supabase credentials are added, the app shows a friendly "Connect Supabase" screen instead of crashing.

---

## 🚀 Quick start

### 1. Install dependencies
```bash
cd D:\Ishika
npm install
```

### 2. Create the Supabase backend
1. Make a free project at **[supabase.com](https://supabase.com)**.
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), and **Run**.
   (Creates the `messages` table, security policies, and turns on Realtime.)

### 3. Add your credentials
Open **Project Settings → API** and copy the **Project URL** and the **anon public** key
into the `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...your-anon-key...
```

### 4. Run it
```bash
npx expo start
```
Open **Expo Go** on your phone and scan the QR code (or press `a` for an Android
emulator / `i` for an iOS simulator).

> 💡 Open the app on **two phones** (or a phone + an emulator) to watch messages,
> presence, and the typing indicator update live.

> ⚠️ After editing `.env`, restart with `npx expo start -c` to clear the cache so
> the new values are picked up.

---

## 🧩 How the realtime works

Supabase Realtime gives us three things over one WebSocket channel (`room:lobby`):

| Capability | Mechanism | Used for |
|---|---|---|
| New messages | **Postgres Changes** (`INSERT` on `messages`) | Delivering chat messages live |
| Who's online | **Presence** | The "N online" header |
| Typing dots | **Broadcast** (ephemeral event) | "X is typing…" |

Messages are stored in Postgres; presence and typing are ephemeral (not saved).

---

## 🛠 Optional: send via the Edge Function

By default the app inserts messages directly (simplest, works as soon as the SQL
is run). An Edge Function is included if you'd rather route sends through a
serverless function (validation, moderation, etc.):

```bash
# one-time
npm i -g supabase
supabase login
supabase link --project-ref YOUR-REF

# deploy
supabase functions deploy send-message --no-verify-jwt
```
Then set `EXPO_PUBLIC_USE_EDGE_FUNCTION=true` in `.env` and restart.

---

## 📦 Build an installable APK

Expo Go is great for development, but to **install/share a standalone app** you
build an APK. Easiest way is **EAS Build** (cloud — no Android Studio needed).

> ⚠️ **Add your Supabase creds first.** They're baked in at build time. Put them
> in the `preview` profile's `env` block in `eas.json` (the anon key is a public
> client key, safe to embed). An APK built with blank creds can't connect.

```bash
# 1. one-time
npm install -g eas-cli
eas login                      # free Expo account (run this yourself)

# 2. fill in eas.json -> build.preview.env with your real URL + anon key

# 3. build an APK in the cloud (~10-15 min)
eas build -p android --profile preview
```
EAS prints a download link when done. Open it on the Android phone, tap the APK,
allow "install from unknown sources", and it installs like a normal app.

**Local alternative** (needs Android Studio + JDK + Android SDK installed):
```bash
npx expo run:android        # builds & installs a debug APK on a connected device/emulator
```

> iOS note: a shareable `.ipa` requires an Apple Developer account ($99/yr) and
> `eas build -p ios`. For iPhones during development, Expo Go is the easy path.

---

## 📁 Project structure

```
App.js                        App entry: device identity + screen routing
index.js                      Registers the root component
lib/
  supabase.js                 Supabase client (AsyncStorage + url polyfill)
  colors.js                   Theme + avatar colors
components/
  NameGate.js                 "Pick a display name" screen
  Setup.js                    Shown until Supabase creds are added
  ChatScreen.js               Header + message list + composer + realtime
  MessageBubble.js            Single message bubble
  TypingIndicator.js          Animated typing dots
supabase/
  migrations/0001_init.sql    Table + RLS + realtime (run this)
  functions/send-message/     Optional Edge Function
  config.toml                 Supabase CLI config
```

---

## 🔒 A note on security

The demo uses **open RLS policies** (anyone with the anon key can read/post),
which is fine for a username-only class project. To make it production-grade,
add Supabase Auth and tighten the policies in `0001_init.sql` to check
`auth.uid()`.

---

Made with ⚡ — happy chatting!
