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

// Backup responses for fallback and basic Q&A
const backupResponses = [
  "Hello there! How can I help you today?",
  "Hi! Nice to meet you!",
  "I’m here to chat with you and answer your questions.",
  "Hey! That sounds interesting!",
  "I’m your friendly edu-bot! 😊",
  "I can help with basic math and facts!",
  "Let’s solve it together! 😊",
  "I’m not sure, but I can try my best to answer.",
  "That’s a great question!"
];

// Handle Kenyan greetings, casual Q&A, and basic questions
function handleBackup(prompt) {
  const lower = prompt.toLowerCase();

  // Kenyan greetings
  const greetings = ["jambo", "habari", "mambo", "sasa", "hujambo"];
  for (const g of greetings) {
    if (lower.includes(g)) {
      return "Sawa! Habari yako? 😊";
    }
  }

  // Name questions
  if (lower.includes("name") && lower.includes("?")) {
    return "I’m edu-bot! What’s your name?";
  }

  // How are you / How’s it going
  if (lower.includes("how are you") || lower.includes("how's it going") || lower.includes("how do you do")) {
    return "I’m great! How about you?";
  }

  // Basic math handling (very simple)
  try {
    if (/\d+\s*[\+\-\*\/]\s*\d+/.test(lower)) {
      // Evaluate safely
      const mathExpr = lower.match(/\d+\s*[\+\-\*\/]\s*\d+/)[0];
      // eslint-disable-next-line no-eval
      const result = eval(mathExpr);
      return `The answer is ${result}`;
    }
  } catch (err) {
    console.error("Math eval error:", err);
  }

  // Catch-all fallback
  return null;
}

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

    // First, check backup handler
    const backupAnswer = handleBackup(prompt);
    if (backupAnswer) {
      return res.json({ answer: backupAnswer });
    }

    // Call Hugging Face DistilGPT-2 model
    const response = await fetch("https://api-inference.huggingface.co/models/distilgpt2", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    const data = await response.json();

    // Extract generated text
    let answer = "Sorry, I cannot answer that question right now.";
    if (Array.isArray(data) && data[0]?.generated_text) {
      answer = data[0].generated_text;
    } else if (data.error) {
      console.error("Hugging Face API error:", data.error);
      // Pick random backup response if HF fails
      answer = backupResponses[Math.floor(Math.random() * backupResponses.length)];
    }

    // Apply kid-safe filter
    answer = filterText(answer);

    res.json({ answer });

  } catch (err) {
    console.error("Backend error:", err);
    // Fallback friendly response if server fails
    const answer = backupResponses[Math.floor(Math.random() * backupResponses.length)];
    res.status(200).json({ answer });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
