import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// --- YouTube Channels ---
const CHANNELS = [
  { name: "Himalayan Explorers Ok", id: "UCdBzhz1YzrAykvjR30gj7hQ", key: "AIzaSyAK0Nw4hxjwxdX0d4eVPylo4M8efV2AEpA" },
  { name: "News Creator", id: "UCw8m7zEUpKS3WARtAQ4h0PQ", key: "AIzaSyDvsMJv2osF5PUqb1Fxmexd6BoV4a_cms0" },
  { name: "संवाद चक्र", id: "UCpk8Yj5SnqsKuNoxkQ8Bo6A", key: "AIzaSyDIWEqP0UzhNGULDF7BwpNDb9GMqjv040A" },
  { name: "JOB _WALLA", id: "UCbVK4klQ_bERYbqCmVvtEpA", key: "AIzaSyBYrJvHoAsNi1bJ-wSaQ6iD_7DZUlHZMvE" },
  { name: "लोक हित न्यूज़", id: "UC1bD2N2BfDg3sHB-jsyK5CA", key: "AIzaSyAlmxjINRnMUVrYaOtudRvYG62YK0tb75k" },
  { name: "game mode", id: "UCRQIK7YCFHjBleu0G45IDmA", key: "AIzaSyD1Ayjyvm5LftsUc3_0JqKdtrRz3UbG8pU" },
  { name: "Greater maharashtra", id: "UCH_y_zKr_dZQczj6og0sK-A", key: "AIzaSyDBUS1jwD-tg9Mz4RdBlxcpzLxdyxH_3F8" },
  { name: "Job & Internship", id: "UCclBB3vmIpFfALS2N_wZ1QA", key: "AIzaSyDRmSgUzT3k_PHTaJHsfoDgbgP0udjjvjk" },
  { name: "Media Creation", id: "UCpZVGobfqofJaRHoLHLxcFA", key: "AIzaSyDT0Dr1sNyjXIsWpszKPqki6gU5wPKh9KQ" }
];

// --- Quota Tracking Memory ---
const DAILY_LIMIT = 10000;
let quotaUsage = CHANNELS.map(() => 0);
let lastReset = new Date().toISOString().split("T")[0];

// Reset daily
function checkReset() {
  const today = new Date().toISOString().split("T")[0];
  if (today !== lastReset) {
    quotaUsage = CHANNELS.map(() => 0);
    lastReset = today;
  }
}

// --- YouTube Data Fetch ---
app.get("/api/channels", async (req, res) => {
  try {
    checkReset();
    const results = [];

    for (let i = 0; i < CHANNELS.length; i++) {
      const ch = CHANNELS[i];
      const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ch.id}&key=${ch.key}`;
      quotaUsage[i] += 1; // Each request costs 1 unit

      const response = await fetch(url);
      const data = await response.json();
      const stats = data.items?.[0]?.statistics || {};

      results.push({
        name: ch.name,
        subscribers: stats.subscriberCount || "N/A",
        views: stats.viewCount || "N/A",
        videos: stats.videoCount || "N/A"
      });
    }

    res.json({ channels: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

// --- Quota Endpoint ---
app.get("/api/quota", (req, res) => {
  checkReset();
  const quotaData = CHANNELS.map((ch, i) => ({
    name: ch.name,
    used: quotaUsage[i],
    remaining: Math.max(0, DAILY_LIMIT - quotaUsage[i]),
    status:
      quotaUsage[i] > 9000
        ? "red"
        : quotaUsage[i] > 8000
        ? "orange"
        : "green"
  }));

  res.json({
    date: lastReset,
    daily_limit: DAILY_LIMIT,
    channels: quotaData
  });
});

// --- Root Endpoint ---
app.get("/", (req, res) => {
  res.json({
    message: "✅ YouTube Proxy Server is live",
    endpoints: ["/api/channels", "/api/quota"]
  });
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
