# Beauty Booking — MERN + MUI Starter

A production-ready starter for a beauty appointments app with:
- **MongoDB Atlas + Mongoose** backend (Express API)
- **React + Vite + MUI** frontend with Date Picker and a modern theme

## Run locally
### 1) Backend (API)
```bash
cd server
cp .env.example .env   # put your MongoDB Atlas URI and DB name
npm install
npm start
```

Seed some services (via HTTP):
```bash
curl -X POST http://localhost:4000/api/services -H "Content-Type: application/json" -d '{
  "name":"Signature Facial","description":"Deep cleanse, exfoliation, and mask","durationMinutes":60,"price":109
}'
curl -X POST http://localhost:4000/api/services -H "Content-Type: application/json" -d '{
  "name":"Relaxation Massage","description":"Full-body 60 minute massage","durationMinutes":60,"price":129
}'
```

### 2) Frontend
```bash
cd ../client
npm install
npm run dev
```

Open http://localhost:5173 and book an appointment.
