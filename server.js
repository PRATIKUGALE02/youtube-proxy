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

// --- Read/Write Quota File ---
function readQuotaFile() {
  try {
    if (!fs.existsSync(QUOTA_FILE)) {
      const newData = { date: today(), usage: CHANNELS.map(() => 0) };
      fs.writeFileSync(QUOTA_FILE, JSON.stringify(newData, null, 2));
      return newData;
    }

    const data = JSON.parse(fs.readFileSync(QUOTA_FILE, "utf8"));
    if (data.date !== today()) {
      const reset = { date: today(), usage: CHANNELS.map(() => 0) };
      fs.writeFileSync(QUOTA_FILE, JSON.stringify(reset, null, 2));
      return reset;
    }

    return data;
  } catch (e) {
    console.error("Error reading quota file:", e);
    return { date: today(), usage: CHANNELS.map(() => 0) };
  }
}

function saveQuotaFile(data) {
  fs.writeFileSync(QUOTA_FILE, JSON.stringify(data, null, 2));
}

function today() {
  return new Date().toISOString().split("T")[0];
}

// --- Update quota ---
function incrementQuota(index, cost = 1) {
  const q = readQuotaFile();
  q.usage[index] = (q.usage[index] || 0) + cost;
  saveQuotaFile(q);
}

// --- API: Get YouTube stats ---
app.get("/api/channels", async (req, res) => {
  try {
    const results = [];
    const quota = readQuotaFile();

    for (let i = 0; i < CHANNELS.length; i++) {
      const ch = CHANNELS[i];
      const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ch.id}&key=${ch.key}`;

      const response = await fetch(url);
      const data = await response.json();
      const stats = data.items?.[0]?.statistics || {};

      results.push({
        name: ch.name,
        subscribers: stats.subscriberCount || "N/A",
        views: stats.viewCount || "N/A",
        videos: stats.videoCount || "N/A"
      });

      incrementQuota(i, 1); // 1 API unit used
      await new Promise(r => setTimeout(r, 80)); // delay to prevent quota spikes
    }

    res.json({ channels: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch channel data" });
  }
});

// --- API: Quota Tracker ---
app.get("/api/quota", (req, res) => {
  const quota = readQuotaFile();
  const channels = CHANNELS.map((ch, i) => {
    const used = quota.usage[i];
    const remaining = Math.max(0, DAILY_LIMIT - used);
    const status =
      remaining < 1000 ? "red" : remaining < 2000 ? "orange" : "green";
    return { name: ch.name, used, remaining, status };
  });

  res.json({ date: quota.date, daily_limit: DAILY_LIMIT, channels });
});

// --- Root ---
app.get("/", (req, res) => {
  res.json({
    message: "✅ YouTube Proxy + Real Quota Tracker is live",
    endpoints: ["/api/channels", "/api/quota"]
  });
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));


