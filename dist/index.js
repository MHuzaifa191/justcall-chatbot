"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const openai_1 = __importDefault(require("openai"));
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// JustCall API credentials
const JUSTCALL_API_URL = 'https://api.justcall.io/v1/texts/new';
const FROM_NUMBER = process.env.JUSTCALL_FROM_NUMBER || '';
const API_KEY = process.env.JUSTCALL_API_KEY || '';
const API_SECRET = process.env.JUSTCALL_API_SECRET || '';
// Initialize OpenAI client
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// In-memory conversation storage. Use a database for production.
const conversationHistory = {};
// Helper function to update a user's conversation history
const updateConversationHistory = (userId, role, content) => {
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
const runAssistant = () => __awaiter(void 0, void 0, void 0, function* () {
    const assistant = yield openai.beta.assistants.retrieve(process.env.OPENAI_ASSISTANT_KEY || '');
    return (assistant === null || assistant === void 0 ? void 0 : assistant.instructions) || "Default instructions if none provided.";
});
// Base route to return "Hello World"
app.get("/", (req, res) => {
    res.send("Just Call API Server V6");
});
// Function to send SMS via JustCall API
const sendJustCallSMS = (to, body) => __awaiter(void 0, void 0, void 0, function* () {
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
        const response = yield (0, axios_1.default)(JUSTCALL_API_URL, options);
        console.log(`Reply sent:`, JSON.stringify(response.data, null, 2));
    }
    catch (error) {
        console.error("Error sending reply:", error instanceof Error ? error.message : error);
    }
});
// Endpoint to handle incoming SMS messages
app.post("/sms", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log(req.body);
    const userId = req.body.data.contact_number || "unknown_user"; // Unique identifier per user
    const incomingMessage = req.body.data.sms_info.body;
    console.log(`Received message from ${userId}: ${incomingMessage}`);
    // Add the user's message to the conversation history
    updateConversationHistory(userId, "user", incomingMessage);
    try {
        // Retrieve recent conversation history to maintain context
        const messages = (conversationHistory[userId] || []).map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));
        // Retrieve assistant instructions
        const assistantInstructions = yield runAssistant();
        messages.unshift({ role: "assistant", content: assistantInstructions });
        // Generate a response from OpenAI
        const completion = yield openai.chat.completions.create({
            model: "gpt-4",
            messages: messages,
            max_tokens: 150,
            temperature: 0.8,
        });
        // Extract and clean the response text
        const responseText = ((_b = (_a = completion.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.trim()) || "Sorry, I couldn't generate a response.";
        console.log(`Sending to ${userId}: ${responseText}`);
        // Send the reply via JustCall API
        yield sendJustCallSMS(userId, responseText);
        console.log(`Reply sent: ${responseText}`);
        // Add OpenAI's response to conversation history
        updateConversationHistory(userId, "assistant", responseText);
        // Send the plaintext response
        res.status(200).type("text/plain").send(responseText);
    }
    catch (error) {
        console.error("Error generating response:", error instanceof Error ? error.message : error);
        res.status(200).type("text/plain").send("Sorry, there was an error processing your message.");
    }
}));
// Start the Express server
// const port = process.env.PORT || 3001;
// app.listen(port, () => console.log(`Server ready on port ${port}.`));
// Export the app instance
exports.default = app;
