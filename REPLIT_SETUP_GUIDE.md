# REPLIT SETUP GUIDE

## 1. Create / open the Replit
Upload the project ZIP or import the repository.

## 2. Install
Open Shell:
```bash
npm install
```

## 3. Secrets
Add:
- `JWT_SECRET` = a long random value
- `PORT` = `3000`
- optional `AI_API_KEY`
- optional `AI_API_URL`

Never commit secrets.

## 4. Run
```bash
npm start
```
Replit should expose the web server on port 3000.

## 5. Demo users
The first startup creates:
- admin@maktabx.local / Admin123!
- teacher@maktabx.local / Teacher123!
- student@maktabx.local / Student123!
- parent@maktabx.local / Parent123!

## 6. Admin
Login as the admin account. Use the Admin panel to manage users, products, coin rules, challenges, announcements and purchases.

## 7. Production
- Replace demo passwords.
- Set a strong JWT_SECRET.
- Put the app behind HTTPS.
- Use managed PostgreSQL/object storage for production.
- Configure a real payment provider and server-side webhook verification before accepting real payments.
- Configure an AI provider server-side.

## 8. Common commands
`npm start` — production-style server
`npm run dev` — development watch mode

## 9. Project structure
- `server.js` — Express server
- `server/db.js` — persistent data adapter
- `server/auth.js` — authentication and role middleware
- `server/routes.js` — API
- `public/index.html` — application shell
- `public/app.js` — frontend
- `public/styles.css` — UI
- `public/assets/` — MAKTAB X visual assets

## 10. Important
The activity/session feature requires explicit user action. It does not secretly record screens, cameras or microphones.
