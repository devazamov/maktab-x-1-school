# MAKTAB X — 1 SCHOOL

A full-stack school operating platform with student, teacher, parent and admin areas.

## Included
- Secure login with hashed passwords + JWT sessions (email or phone)
- Student / Teacher / Parent / Admin / Oshpaz (canteen chef) roles
- Electronic diary (real timetable) and grades 1–10
- Attendance
- Homework with student submission + reward
- X Coin economy and transaction history
- CoinShop, inventory and purchases
- **Oshxona (canteen) QR coin-exchange**: student picks food, gets a one-time QR, the chef scans it (camera-based scanner, jsQR) or types the code, coins move from student to chef instantly; chef and admin get a coins-collected report (settlement/cash payout happens outside the app)
- Challenges, leaderboard and achievements
- Events and QR-ready attendance flow
- Announcements and notifications (with an in-app bell dropdown)
- FREE / PRO / MAX subscription architecture
- AI Assistant endpoint (provider-neutral; configure env vars)
- Activity sessions with explicit user-started timer
- Admin console: users, classes/subjects, timetable, CoinShop products, canteen items & report, audit log
- Responsive white Apple-inspired EdTech UI
- Original MAKTAB X visual asset slots

## Run locally / Render
1. `npm install`
2. Copy `.env.example` to `.env`
3. Set a strong `JWT_SECRET`
4. `npm start`
5. Open port 3000

## First run (no demo data)
There is **no seeded demo data**. On first boot the server creates exactly one
`SUPER_ADMIN` account and prints its password to the server console/logs
**once**:
- Email: `ADMIN_EMAIL` env var, or `admin@maktabx.local` by default
- Password: `ADMIN_PASSWORD` env var if set, otherwise a random password is
  generated and printed to the logs on first boot only — copy it from there
  and change it immediately from Profile → "Parolni o'zgartirish".

Everything else (classes, subjects, students, teachers, the canteen chef
account, CoinShop products, canteen menu items) is created afterwards from
the Admin panel.

## Voice welcome greeting
Drop an audio file at `public/assets/audio/welcome.mp3` and it will play
automatically every time someone logs in (browser autoplay allows this
because login is a user click). No file there yet = silently skipped.

Change demo passwords before production.

## Database
For the first runnable version, the backend uses a transactional JSON database adapter (file-backed database for the demo/starter deployment) so the project runs immediately on Replit without native database compilation. The data layer is isolated in `server/db.js`, making PostgreSQL migration straightforward.

For production, place the database behind a managed PostgreSQL service and replace the adapter while preserving the route/service contracts.

## Image uploads
Product uploads go to `uploads/products/`. Character and UI assets are in `public/assets/`.

## AI
Set `AI_API_URL` and `AI_API_KEY` if you want to connect an OpenAI-compatible provider. Without them, the UI uses a safe local educational assistant response.

## Security notes
- Passwords are hashed with bcrypt.
- JWT is stored in an HttpOnly cookie.
- Role checks happen server-side.
- Coin balance is calculated and changed on the server.
- Purchase and reward operations use a database lock/atomic write.
- No hidden screen recording, camera or microphone functionality exists.

## Original visual asset pack
The project includes original vector illustrations (SVG) created for MAKTAB X rather than copied third-party characters:
- `public/assets/characters/x-boy-3d.svg`
- `public/assets/characters/x-girl-3d.svg`
- `public/assets/school-hero.svg`
- `public/assets/shop/water-bottle.svg`
- `public/assets/shop/hoodie.svg`
- `public/assets/shop/star-badge.svg`
- `public/assets/shop/medal-3d.svg`

These are designed in a clean, friendly 3D-inspired EdTech style and can be replaced later with generated PNG/WebP art.

## Important activity privacy behavior
Activity sessions are explicitly started by the student. The starter project does **not** secretly record screens, cameras, microphones, or other apps. A future screen-sharing feature should use a visible browser permission prompt and clear consent.
