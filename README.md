# MAKTAB X — 1 SCHOOL

A full-stack school operating platform with student, teacher, parent and admin areas.

## Included
- Secure login with hashed passwords + JWT sessions
- Student / Teacher / Parent / Admin roles
- Electronic diary and grades 1–10
- Attendance
- Homework
- X Coin economy and transaction history
- CoinShop, inventory and purchases
- Challenges, leaderboard and achievements
- Events and QR-ready attendance flow
- Announcements and notifications
- FREE / PRO / MAX subscription architecture
- AI Assistant endpoint (provider-neutral; configure env vars)
- Activity sessions with explicit user-started timer
- Admin analytics, user management and audit log
- Responsive white Apple-inspired EdTech UI
- Original MAKTAB X visual asset slots

## Run locally / Replit
1. `npm install`
2. Copy `.env.example` to `.env`
3. Set a strong `JWT_SECRET`
4. `npm start`
5. Open port 3000

Demo accounts are seeded automatically:
- Admin: `admin@maktabx.local` / `Admin123!`
- Teacher: `teacher@maktabx.local` / `Teacher123!`
- Student: `student@maktabx.local` / `Student123!`
- Parent: `parent@maktabx.local` / `Parent123!`

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
