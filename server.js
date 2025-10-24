// ✅ Final Render-Ready YouTube Proxy Server
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import fs from "fs";
import path from "path";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 10000;
const DAILY_LIMIT = 10000;
const QUOTA_FILE = path.resolve("quota.json");

// ✅ Render Secret File Path (Your credentials.json is stored here)
const CREDENTIALS_FILE = "/etc/secrets/credentials.json";

// --- Load credentials.json (from Render secret file) ---
function loadCredentials() {
  try {
    const data = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf8"));
    console.log("✅ Loaded credentials.json successfully");
    return data.channels || [];
  } catch (err) {
    console.error("❌ Error loading credentials.json:", err);
    return [];
  }
}

const CHANNELS = loadCredentials();

// --- Helper functions ---
function today() {
  return new Date().toISOString().split("T")[0];
}
function nowISO() {
  return new Date().toISOString();
}
function hoursUntilReset() {
  const now = new Date();
  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);
  const diffMs = endOfDay - now;
  return Math.round(diffMs / (1000 * 60 * 60)); // remaining hours in the day
}

// --- Read / Write quota file ---
function readQuotaFile() {
  try {
    if (!fs.existsSync(QUOTA_FILE)) {
      const newData = {
        date: today(),
        usage: CHANNELS.map(() => 0),
        last_updated: nowISO()
      };
      fs.writeFileSync(QUOTA_FILE, JSON.stringify(newData, null, 2));
      return newData;
    }

    const data = JSON.parse(fs.readFileSync(QUOTA_FILE, "utf8"));
    if (data.date !== today()) {
      const reset = {
        date: today(),
        usage: CHANNELS.map(() => 0),
        last_updated: nowISO()
      };
      fs.writeFileSync(QUOTA_FILE, JSON.stringify(reset, null, 2));
      return reset;
    }

    return data;
  } catch (err) {
    console.error("Error reading quota file:", err);
    return { date: today(), usage: CHANNELS.map(() => 0), last_updated: nowISO() };
  }
}

function saveQuotaFile(data) {
  fs.writeFileSync(QUOTA_FILE, JSON.stringify(data, null, 2));
}

function incrementQuota(index, cost = 1) {
  const q = readQuotaFile();
  q.usage[index] = (q.usage[index] || 0) + cost;
  q.last_updated = nowISO();
  saveQuotaFile(q);
}

// --- /api/channels ---
app.get("/api/channels", async (req, res) => {
  try {
    const results = [];
    const quota = readQuotaFile();

    for (let i = 0; i < CHANNELS.length; i++) {
      const ch = CHANNELS[i];
      if (!ch.apiKey || !ch.channelId) continue;

      const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ch.channelId}&key=${ch.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();
      const stats = data.items?.[0]?.statistics || {};

      results.push({
        name: ch.name,
        subscribers: stats.subscriberCount || "N/A",
        views: stats.viewCount || "N/A",
        videos: stats.videoCount || "N/A"
      });

      incrementQuota(i, 1);
      await new Promise(r => setTimeout(r, 100)); // small delay to prevent rate limit
    }

    res.json({ channels: results });
  } catch (err) {
    console.error("❌ Error fetching channel data:", err);
    res.status(500).json({ error: "Failed to fetch channel data" });
  }
});

// --- /api/quota ---
app.get("/api/quota", (req, res) => {
  const quota = readQuotaFile();
  const channels = CHANNELS.map((ch, i) => {
    const used = quota.usage[i];
    const remaining = Math.max(0, DAILY_LIMIT - used);
    const status =
      remaining < 1000 ? "red" : remaining < 2000 ? "orange" : "green";
    return { name: ch.name, used, remaining, status };
  });

  res.json({
    date: quota.date,
    daily_limit: DAILY_LIMIT,
    last_updated_time: quota.last_updated,
    reset_in_hours: hoursUntilReset(),
    channels
  });
});

// --- Root endpoint ---
app.get("/", (req, res) => {
  res.json({
    message: "✅ YouTube Proxy + Real-Time Quota Tracker (with credentials.json integration on Render)",
    endpoints: ["/api/channels", "/api/quota"]
  });
});

// --- Start Server ---
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
