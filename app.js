import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());

// Allow requests only from your deployed frontend
app.use(cors({
  origin: "https://huggingface-frontend.onrender.com"
}));

// Kid-safe words
const bannedWords = [
  "sex", "violence", "drugs", "hate", "blood", "kill", "murder",
  "porn", "nsfw", "terrorist", "racist"
];

function filterText(text) {
  const lower = text.toLowerCase();
  if (bannedWords.some(word => lower.includes(word))) {
    return "Sorry, I cannot answer that question.";
  }
  return text;
}

app.post("/api/generate", async (req, res) => {
  try {
    const prompt = req.body.prompt || "";
    const response = await fetch("https://api-inference.huggingface.co/models/gpt2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    const data = await response.json();

    // Extract generated text and apply kid-safe filter
    let answer = data[0]?.generated_text || "Sorry, no response.";
    answer = filterText(answer);

    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

