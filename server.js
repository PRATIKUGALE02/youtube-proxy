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

app.get("/api/channels", async (req, res) => {
  try {
    const results = [];
    for (const ch of CHANNELS) {
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
    }
    res.json({ channels: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

