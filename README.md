# Study Library - Admin App

This is a private, owner-only web app for running your study library: seats,
students, and (soon) fees. There is no public sign-up and no student login -
you are the only person who ever logs into this app.

You do **not** need to know how to code to get this running. Just follow the
steps below in order. Anything in a ```code box``` is a command to type into
a terminal.

---

## 1. What you need before you start

- A computer with [Node.js](https://nodejs.org) installed (version 20 or
  newer). If you're not sure, open a terminal and run `node -v` - if that
  prints a version number, you're set.
- A free [Neon](https://neon.tech) or [Supabase](https://supabase.com)
  account for the database (instructions below).
- A free [Vercel](https://vercel.com) account for hosting the app online
  (instructions in section 5).
- A free [GitHub](https://github.com) account, so Vercel can deploy your code.

## 2. Get a free Postgres database

Pick **one** of these (Neon is simplest):

### Option A: Neon (recommended)

1. Go to [neon.tech](https://neon.tech) and sign up (free).
2. Create a new project (any name, e.g. "study-library").
3. On the project dashboard, find "Connection Details" and make sure it's
   showing the **Pooled connection** string (the hostname will contain
   `-pooler`). Copy it - it looks like:
   `postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/dbname?sslmode=require`

### Option B: Supabase

1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. Create a new project (pick a database password and remember it).
3. Go to Project Settings -> Database -> "Connection string" and choose the
   **Transaction** pooling mode (port 6543). Copy that string.

Either way, you'll paste this into `DATABASE_URL` in the next step.

## 3. Run the app on your own computer (first time setup)

Open a terminal in this project folder and run:

```bash
npm install
```

Then create your own environment file by copying the example:

```bash
cp .env.example .env
```

Open `.env` in any text editor and fill in the values:

- `DATABASE_URL` - the connection string you copied in step 2.
- `NEXTAUTH_SECRET` - run this command and paste the output:
  ```bash
  openssl rand -base64 32
  ```
- `NEXTAUTH_URL` - leave as `http://localhost:3000` for now.
- `ADMIN_USERNAME` - pick a username for yourself, e.g. `owner`.
- `ADMIN_PASSWORD_HASH` - this is your password, but scrambled so it's never
  stored in plain text. Run this command, replacing `YOUR_REAL_PASSWORD`
  with the password you want to log in with:
  ```bash
  node -e "console.log(require('bcryptjs').hashSync('YOUR_REAL_PASSWORD', 10))"
  ```
  It will print something like `$2b$10$abcxyz...` - copy that whole thing
  into `ADMIN_PASSWORD_HASH` (with quotes around it).

Now set up the database tables and add your 90 seats:

```bash
npx prisma migrate dev --name init
npm run db:seed
```

(If your library has a different number of seats, open
`prisma/seed.ts` first and change the `TOTAL_SEATS` number at the top, then
run the two commands above.)

Finally, start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser and log
in with the username/password you set above.

## 4. Everyday commands

| What you want to do | Command |
| --- | --- |
| Start the app locally | `npm run dev` |
| Open a visual database browser | `npm run db:studio` |
| Apply a schema change (only if a future update changes `prisma/schema.prisma`) | `npx prisma migrate dev` |

## 5. Put the app online for free (so you can use it on your phone)

1. Push this project to a GitHub repository (ask a technical friend to help
   with this one step if you've never used git/GitHub before - it's a
   one-time thing).
2. Go to [vercel.com](https://vercel.com), sign up with your GitHub account,
   and click "Add New Project", then pick this repository.
3. Before deploying, click "Environment Variables" and add the same values
   from your `.env` file: `DATABASE_URL`, `NEXTAUTH_SECRET`, `ADMIN_USERNAME`,
   `ADMIN_PASSWORD_HASH`. For `NEXTAUTH_URL`, use the `https://...vercel.app`
   URL Vercel gives you (you can add/update this after the first deploy).
4. Click Deploy. Vercel will build and host the app for free.
5. Once deployed, open the site on your phone and use your browser's "Add to
   Home Screen" option - the app is installable (a PWA), so it'll behave
   like a normal app icon on your phone.

You will **not** need to run `npx prisma migrate dev` again on Vercel for
this initial version - just run it once from your own computer against the
same `DATABASE_URL`, and both your local app and the deployed app will use
the same database.

## 6. What's in this app right now

- **Dashboard**: total seats, vacant seats, active students, and a seat
  occupancy chart.
- **Seats**: a color-coded grid of all seats. Tap a seat to assign a new
  student, mark the current student as left, or move them to another seat.
- **Students**: search/filter all students, view/edit their details and fee
  override, and see their payment history.
- **Fees, Reports, Settings**: placeholder pages for now - see below.

## 7. What's NOT built yet (next milestone)

This first version focused on getting Seats and Students working solidly.
Still to come:

- Recording payments (the Fees page is currently a placeholder)
- Bulk "mark paid" for multiple students at once
- Advance payments covering multiple months
- Automatic enforcement of the custom fee override when calculating dues
- Printable/PDF receipts
- Reports (monthly revenue, overdue students, exports)
- Full revenue/dues charts on the dashboard
- Due-soon / overdue color states on the Seats grid (currently just
  vacant/occupied)

None of this data is faked in the meantime - the Dashboard and Seats pages
only show real numbers from your database.
