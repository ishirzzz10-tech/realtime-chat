# ⚡ Realtime Chat

A full **realtime messenger** built with **Expo (React Native)** and **Supabase** —
private DMs, group channels, reactions, read receipts, image sharing, and
**push notifications when the app is closed**. No custom backend server: Supabase
provides the database, auth, realtime, storage, and serverless functions.

| | |
|---|---|
| **Frontend** | Expo / React Native + React Navigation |
| **Backend** | Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) |
| **Sign-in** | Anonymous Auth — just pick a username (a real `auth.uid()` under the hood) |
| **Privacy** | DMs enforced private by Row Level Security (not just the UI) |

---

## ✨ Features

- 🔎 **Find anyone** — search any user by username and start a private 1:1 **DM**.
- #️⃣ **Channels** — create / browse / join group channels; everyone joins **#general**.
- 💬 **Live messages** — instant delivery via Supabase Realtime (Postgres changes).
- 🟢 **Presence & typing** — see who's online and who's typing.
- 😀 **Reactions + edit/delete** — long-press a message to react, edit, or delete.
- ✓✓ **Read receipts + unread badges** — "seen" ticks in DMs, unread counts on the list.
- 🖼️ **Image sharing** — send photos (stored in a private Storage bucket, served via signed URLs).
- 🔔 **Push notifications** — get notified of new messages even when the app is closed.

---

## 🚀 Setup

### 1. Install
```bash
cd D:\Ishika
npm install
```

### 2. Supabase project
The database is already provisioned for the linked project. To set up a fresh
project, run the SQL files in `supabase/migrations/` **in order** (Dashboard →
SQL Editor, or `supabase db push`):
`0001` → `0002` → `0003` → `0004`.

Then enable two things in the Dashboard:
- **Authentication → Sign In / Providers → Anonymous → ON**  *(required — the app signs in anonymously)*
- The `chat-images` Storage bucket and push trigger are created by the migrations.

### 3. Credentials
Put your Project URL + anon key in `.env` (Dashboard → Project Settings → API):
```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 4. Run
```bash
npx expo start            # then scan the QR with Expo Go
```
Open it on **two devices** to watch DMs, presence, typing, receipts, and reactions live.

> ⚠️ After editing `.env`, restart with `npx expo start -c`.

---

## 🔔 Push notifications (important)

Real "app is closed" push **requires a build** — they don't fully work in Expo Go
(removed on SDK 53+). The server side is already done (an Edge Function +
database trigger send a push to every room member on each new message). To enable
the client side:

1. **Get an EAS project id** (writes it into `app.json`):
   ```bash
   npm install -g eas-cli
   eas login
   eas init
   ```
2. **Build the app** (see below). On first launch the app asks for notification
   permission and registers an Expo push token in the `push_tokens` table.

- **Android** → works out of the box once built with EAS (Expo configures FCM).
- **iOS** → additionally requires a paid **Apple Developer account** to send push.

---

## 📦 Build an installable APK
```bash
# fill eas.json -> build.preview.env with your URL + anon key first
eas build -p android --profile preview
```
EAS returns a download link; install the APK on the phone. (This build is also
what makes push notifications fully work.)

**📲 Prebuilt APK — ready to install:**
<https://expo.dev/accounts/flourasaransh/projects/realtime-chat/builds/60efee69-7028-4417-ac67-1f73ef211b7c>

Open that link on an Android phone → **Install / Download** → allow installing
from "unknown sources". Anyone you share the link with can install it.

---

## 🧱 Architecture

```
Auth        Anonymous sign-in -> profiles (searchable user directory)
Rooms       rooms (kind = 'dm' | 'channel') + room_members (+ last_read_at)
Messages    messages (room_id, sender_id, content, image_path, edited_at, deleted_at)
Reactions   reactions (message_id, user_id, emoji)
Realtime    one channel per room: postgres_changes + presence + broadcast(typing)
Privacy     RLS via a SECURITY DEFINER is_room_member() helper (no recursion)
Storage     private 'chat-images' bucket, room-scoped policies, signed URLs
Push        messages INSERT -> pg_net trigger -> notify-on-message Edge Function -> Expo Push API
```

### Project structure
```
App.js                       Auth gate + navigation stack
lib/
  supabase.js                Supabase client (AsyncStorage + url polyfill)
  auth.js                    AuthProvider: anonymous sign-in + profile
  api.js                     Data layer: rooms, messages, reactions, images
  notifications.js           Expo push registration + tap handling
  colors.js                  Theme + avatar colors
components/                  Avatar, NameGate, RoomListItem, MessageBubble,
                             Composer, MessageActionsSheet, TypingIndicator, Setup
screens/                     Conversations, Search (people/channels), ChatRoom, Profile
supabase/
  migrations/0001..0004.sql  Schema, RLS, RPCs, storage, push trigger
  functions/notify-on-message/  Push Edge Function
```

---

## 🔒 Security

DMs are **genuinely private**: Row Level Security only lets a user read messages,
members, reactions, and images for rooms they belong to — enforced by the
database, so even a direct API call with someone else's token can't read your DMs.
The membership check uses a `SECURITY DEFINER` helper kept out of the public API,
and the API RPCs are authenticated-only.

---

## 📑 Report & presentation

A full project report and a slide deck for this project live in **`report/`**:

- 📄 **`Realtime-Chat-Report.pdf`** — 49-page project report (introduction, literature
  review, requirements, system design with diagrams, implementation, testing,
  deployment, and conclusion).
- 📊 **`Realtime-Chat-Presentation.pptx`** — 18-slide presentation deck covering the
  same story end to end.

---

Made with ⚡ — happy chatting!
