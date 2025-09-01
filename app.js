import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());

// Allow requests only from your deployed frontend
app.use(cors({
  origin: "https://kid-edu-bot.onrender.com"
}));

// Kid-safe words
const bannedWords = [
  "sex", "violence", "drugs", "hate", "blood", "kill", "murder",
  "porn", "nsfw", "terrorist", "racist"
];

// Function to filter text for kids
function filterText(text) {
  const lower = text.toLowerCase();
  if (bannedWords.some(word => lower.includes(word))) {
    return "Sorry, I cannot answer that question.";
  }
  return text;
}

// API endpoint
app.post("/api/generate", async (req, res) => {
  try {
    const prompt = req.body.prompt || "";

    // Call Hugging Face GPT-2 model
    const response = await fetch("https://api-inference.huggingface.co/models/gpt2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    const data = await response.json();

    // Safely extract generated text
    const answer = Array.isArray(data) && data[0]?.generated_text
      ? filterText(data[0].generated_text)
      : "Sorry, no response.";

    res.json({ answer });

  } catch (err) {
    console.error("Backend error:", err);
    res.status(500).json({ answer: "Error contacting server." });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));

