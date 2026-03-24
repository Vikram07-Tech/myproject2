# Stock Price Alert Backend

Express backend to track alerts and check stock prices using Alpha Vantage API.

## Setup

1. cd backend
2. npm install
3. Copy .env.example to .env and set ALPHA_VANTAGE_API_KEY
4. npm run dev or npm start

## API

- GET / - health
- GET /status - summary counts (includes number of users)
- GET /alerts - list alerts (by symbol: /alerts?symbol=AAPL)
- POST /alerts - create alert {symbol,type,targetPrice}
- DELETE /alerts/:id - remove alert
- POST /check - check symbol and trigger alerts {symbol}
- POST /check-all - check all pending symbols and trigger matching alerts
- POST /register - register user {email,password}
- POST /login - login user {email,password}
- GET /users - list registered users (safe fields only)

