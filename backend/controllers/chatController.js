require('dotenv').config();
const axios = require('axios');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const handleChat = async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ response: "No message provided." });
  }

  // Simple rule-based responses
  const rules = [
    { keywords: ["pricing", "cost", "price"], response: "You can find our pricing details at https://prakritimitra.com/pricing." },
    { keywords: ["hello", "hi", "hey"], response: "Hello! How can I assist you today?" },
    { keywords: ["reset password", "forgot password"], response: "To reset your password, click on 'Forgot Password' on the login page." },
    { keywords: ["contact", "support"], response: "You can contact our support at support@prakritimitra.com." },
    { keywords: ["features", "what can you do"], response: "I can help you with information about our platform, onboarding, and troubleshooting." },
    // New rules below:
    { keywords: ["register", "sign up", "create account"], response: "To register, click the 'Sign Up' button on the top right and fill in your details." },
    { keywords: ["login", "log in", "sign in"], response: "To log in, click the 'Login' button and enter your credentials." },
    { keywords: ["events", "upcoming events"], response: "You can view upcoming events on our Events page." },
    { keywords: ["volunteer", "join as volunteer"], response: "To become a volunteer, visit the Volunteer section and complete the registration form." },
    { keywords: ["organization", "partner"], response: "Organizations can partner with us by filling out the Organization Registration form." },
    { keywords: ["faq", "frequently asked questions"], response: "Check out our FAQ page for answers to common questions." },
    { keywords: ["location", "where are you based"], response: "We are based in India, but our platform is accessible globally." },
    { keywords: ["donate", "contribute"], response: "Thank you for your interest in supporting us! Please visit our Donate page for more information." },
    // ...add more as needed
  ];

  const lowerMsg = message.toLowerCase();
  for (const rule of rules) {
    if (rule.keywords.some((kw) => lowerMsg.includes(kw))) {
      return res.json({ response: rule.response });
    }
  }

  // Fallback: Gemini 1.5 Pro
  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key not set in .env");
    }
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;
    const body = {
      contents: [
        { parts: [{ text: message }] }
      ]
    };
    const response = await axios.post(url, body, {
      headers: { 'Content-Type': 'application/json' }
    });
    const data = response.data;
    const geminiReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't get a response from Gemini.";
    return res.json({ response: geminiReply });
  } catch (error) {
    console.error("Gemini error:", error.response?.data || error.message);
    return res.json({ response: "Sorry, I'm having trouble reaching my AI brain right now. Please try again later." });
  }
};

module.exports = { handleChat }; 