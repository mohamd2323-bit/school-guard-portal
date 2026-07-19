# Render deployment

This project is prepared for Render with `render.yaml`.

## Services

- `school-guard-web`: public frontend URL.
- `school-guard-api`: API service used by the frontend.
- `school-guard-postgres`: PostgreSQL database.

## Deploy

1. Open Render Dashboard.
2. Create a new Blueprint.
3. Connect the GitHub repository:
   `https://github.com/mohamd2323-bit/school-guard-portal`
4. Select the `main` branch.
5. Render will read `render.yaml` and create the services.

The public app link will be the `school-guard-web` `onrender.com` URL.

## Notes

- The API creates the database schema on startup with `drizzle push`.
- No production database is contacted.
- No Replit service is used.
- The Render database starts empty until you import data into Render explicitly.
