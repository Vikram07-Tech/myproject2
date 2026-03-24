import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import fs from "fs/promises";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const ALERTS_FILE = "alerts.json";
const USERS_FILE = "users.json";

app.use(cors());
app.use(express.json());

let alerts = [];
let users = [];

async function loadAlerts() {
  try {
    const data = await fs.readFile(ALERTS_FILE, "utf-8");
    alerts = JSON.parse(data);
  } catch (err) {
    alerts = [];
  }
}

async function saveAlerts() {
  await fs.writeFile(ALERTS_FILE, JSON.stringify(alerts, null, 2));
}

async function loadUsers() {
  try {
    const data = await fs.readFile(USERS_FILE, "utf-8");
    users = JSON.parse(data);
  } catch (err) {
    users = [];
  }
}

async function saveUsers() {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

function normalizeSymbol(symbol) {
  return symbol.trim().toUpperCase();
}

async function getStockPrice(symbol) {
  const key = process.env.ALPHA_VANTAGE_API_KEY || "demo";
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${key}`;
  const response = await fetch(url);
  const data = await response.json();
  const price = Number(data["Global Quote"]?.["05. price"] || 0);
  return price;
}

async function checkAndTrigger(symbol) {
  const normalized = normalizeSymbol(symbol);
  const currentPrice = await getStockPrice(normalized);
  const triggered = alerts.filter(a => a.symbol === normalized && !a.triggered && ((a.type === "above" && currentPrice >= a.targetPrice) || (a.type === "below" && currentPrice <= a.targetPrice)));

  if (triggered.length > 0) {
    triggered.forEach(a => (a.triggered = true));
    await saveAlerts();
  }

  return { normalized, currentPrice, triggeredAlerts: triggered };
}

app.get("/", (req, res) => {
  res.json({ message: "Stock Alert API running" });
});

app.get("/status", (req, res) => {
  const count = alerts.length;
  const pending = alerts.filter(a => !a.triggered).length;
  const triggered = count - pending;
  const usersCount = users.length;
  res.json({ count, pending, triggered, users: usersCount });
});

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });

  const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) return res.status(409).json({ error: "user already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: Date.now().toString(), email: email.toLowerCase(), passwordHash, createdAt: new Date().toISOString() };
  users.push(user);
  await saveUsers();

  res.status(201).json({ id: user.id, email: user.email, createdAt: user.createdAt });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "invalid credentials" });

  res.json({ id: user.id, email: user.email, message: "login successful" });
});

app.get("/users", (req, res) => {
  res.json(users.map(u => ({ id: u.id, email: u.email, createdAt: u.createdAt })));
});

app.post("/alerts", async (req, res) => {
  const { symbol, targetPrice, type } = req.body;
  if (!symbol || !targetPrice || !type) {
    return res.status(400).json({ error: "symbol,targetPrice,type are required" });
  }
  const normalized = normalizeSymbol(symbol);
  const alert = {
    id: Date.now().toString(),
    symbol: normalized,
    targetPrice: Number(targetPrice),
    type: type === "below" ? "below" : "above",
    triggered: false,
    createdAt: new Date().toISOString(),
  };

  alerts.push(alert);
  await saveAlerts();

  res.status(201).json(alert);
});

app.get("/alerts", (req, res) => {
  const { symbol } = req.query;
  if (symbol) {
    const normalized = normalizeSymbol(symbol);
    return res.json(alerts.filter((a) => a.symbol === normalized));
  }
  res.json(alerts);
});

app.delete("/alerts/:id", async (req, res) => {
  const index = alerts.findIndex((a) => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Alert not found" });
  const removed = alerts.splice(index, 1)[0];
  await saveAlerts();
  res.json(removed);
});

app.post("/check", async (req, res) => {
  const { symbol } = req.body;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  try {
    const result = await checkAndTrigger(symbol);
    res.json(result);
  } catch (err) {
    res.status(503).json({ error: "price provider unavailable" });
  }
});

app.post("/check-all", async (req, res) => {
  const symbols = [...new Set(alerts.filter((a) => !a.triggered).map((a) => a.symbol))];
  const results = [];

  for (const symbol of symbols) {
    try {
      const r = await checkAndTrigger(symbol);
      results.push(r);
    } catch (err) {
      results.push({ symbol, error: err.message });
    }
  }

  res.json({ results });
});

await Promise.all([loadAlerts(), loadUsers()]);

setInterval(async () => {
  try {
    const toCheck = [...new Set(alerts.filter(a => !a.triggered).map(a => a.symbol))];
    for (const symbol of toCheck) {
      const result = await checkAndTrigger(symbol);
      if (result.triggeredAlerts.length > 0) {
        console.log(`Triggered ${result.triggeredAlerts.length} alert(s) for ${symbol} at ${result.currentPrice}`);
      }
    }
  } catch (err) {
    console.error("Scheduled check failed", err.message);
  }
}, Number(process.env.CHECK_INTERVAL_MS || 60000));

app.listen(port, () => {
  console.log(`Stock alert backend listening at http://localhost:${port}`);
});
