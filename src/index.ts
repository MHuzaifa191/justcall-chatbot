import express, { Request, Response } from "express";
import OpenAI from "openai";
import axios from 'axios';
import dotenv from "dotenv";

dotenv.config();

// JustCall API credentials
const JUSTCALL_API_URL = 'https://api.justcall.io/v1/texts/new'; 
const FROM_NUMBER = process.env.JUSTCALL_FROM_NUMBER || '';
const API_KEY = process.env.JUSTCALL_API_KEY || '';  
const API_SECRET = process.env.JUSTCALL_API_SECRET || ''; 

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory conversation storage. Use a database for production.
const conversationHistory: Record<string, Array<{ role: string; content: string }>> = {};

// Helper function to update a user's conversation history
const updateConversationHistory = (userId: string, role: string, content: string) => {
  if (!conversationHistory[userId]) {
    conversationHistory[userId] = [];
  }
  conversationHistory[userId].push({ role, content });

  // Keep only the last 5 messages in history for this user
  if (conversationHistory[userId].length > 5) {
    conversationHistory[userId] = conversationHistory[userId].slice(-5);
  }
};

// Function to retrieve assistant instructions
const runAssistant = async () => {
  const assistant = await openai.beta.assistants.retrieve(process.env.OPENAI_ASSISTANT_KEY || '');
  return assistant?.instructions || "Default instructions if none provided.";
}

// Base route to return "Hello World"
app.get("/", (req: Request, res: Response) => {
  res.send("Just Call API Server V6");
});

// Function to send SMS via JustCall API
const sendJustCallSMS = async (to: string, body: string) => {
  const payload = {
    from: FROM_NUMBER,
    to: to,
    body: body,
  };

  const options = {
    method: 'post',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    data: JSON.stringify(payload),
  };

  try {
    const response = await axios(JUSTCALL_API_URL, options);
    console.log(`Reply sent:`, JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("Error sending reply:", error instanceof Error ? error.message : error);
  }
};

// Endpoint to handle incoming SMS messages
app.post("/sms", async (req: Request, res: Response) => {
  console.log(req.body);
  const userId = req.body.data.contact_number || "unknown_user"; // Unique identifier per user
  const incomingMessage = req.body.data.sms_info.body;

  console.log(`Received message from ${userId}: ${incomingMessage}`);
  
  // Add the user's message to the conversation history
  updateConversationHistory(userId, "user", incomingMessage);
  
  try {
    // Retrieve recent conversation history to maintain context
    const messages = (conversationHistory[userId] || []).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    // Retrieve assistant instructions
    const assistantInstructions = await runAssistant();
    messages.unshift({ role: "assistant", content: assistantInstructions });

    // Generate a response from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      max_tokens: 150,
      temperature: 0.8,
    });
  
    // Extract and clean the response text
    const responseText = completion.choices[0].message?.content?.trim() || "Sorry, I couldn't generate a response.";
    console.log(`Sending to ${userId}: ${responseText}`);

    // Send the reply via JustCall API
    await sendJustCallSMS(userId, responseText);
    console.log(`Reply sent: ${responseText}`);
  
    // Add OpenAI's response to conversation history
    updateConversationHistory(userId, "assistant", responseText);
  
    // Send the plaintext response
    res.status(200).type("text/plain").send(responseText);
  } catch (error) {
    console.error("Error generating response:", error instanceof Error ? error.message : error);
    res.status(200).type("text/plain").send("Sorry, there was an error processing your message.");
  }
});

// Start the Express server
// const port = process.env.PORT || 3001;
// app.listen(port, () => console.log(`Server ready on port ${port}.`));

// Export the app instance
export default app;
