import ChatHistoryModel from '../models/chatHistory.js';

// Middleware to fetch user-specific chat data
const fetchChatData = async (req, res, next) => {
    try {
        const chatId = req.user.chatId;
        if (chatId != null) {
            // Fetch user's chat history from the database
            const userChatHistory = await ChatHistoryModel.getChatHistory(chatId);
            // Make the chat history available in the request object
            req.userChatHistory = userChatHistory;
        }
        // Continue to the next middleware or route handler
        next();
    } catch (error) {
        console.error('Error fetching chat data:', error);
        // Handle the error as needed, you might want to send an error response
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export { fetchChatData };
