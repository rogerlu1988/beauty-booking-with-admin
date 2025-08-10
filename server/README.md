# Beauty Booking API (Express + MongoDB Atlas)

## Quick start
1. Create `.env` from `.env.example` and fill in your Atlas `MONGODB_URI` and optional `DB_NAME`.
2. Install deps and run:
   ```bash
   npm install
   npm start
   ```
3. Endpoints:
   - `GET /api/health`
   - `GET /api/services`
   - `POST /api/services` (body: `{ name, description, durationMinutes, price }`)
   - `GET /api/availability?date=YYYY-MM-DD&serviceId=<id>`
   - `GET /api/bookings?date=YYYY-MM-DD`
   - `POST /api/bookings` (body includes `serviceId`, `clientName`, `clientEmail`, `start` ISO string)
