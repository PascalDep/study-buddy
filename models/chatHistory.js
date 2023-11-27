import mongoose from 'mongoose';
import UserModel from '../models/user.js';

const chatHistorySchema = new mongoose.Schema({
    //_id: mongoose.Schema.Types.ObjectId,
    email: {
        type: String,
        lowercase: true,
        unique: true,
    },
    chats: [
        {
            sessionID: String, // Added sessionID field as a string
            subject: String,   // Added subject field as a string
            topic: String,     // Added topic field as a string
            createdAt: {
                type: Date,
                default: Date.now, // Set the default value to the current date and time
            },
            messages: [
                {
                    role: String,
                    content: String,
                },
            ],
        },
    ],
});

// static method to find chat session by email
chatHistorySchema.statics.getChatHistory = async function (objectId) {
    try {
        const chatHistory = await this.findOne({ "_id": objectId });
        if (chatHistory) {
            return chatHistory;
        }
        return [];
    } catch (error) {
        return [];
    }
};

chatHistorySchema.statics.setChatSession = async function (email, sessionID) {
    try {
        const filter = { email };
        const update = { currentSession: sessionID };
        const result = await UserModel.updateOne(filter, update);
    } catch (error) {
        console.error('Error finding chat session:', error);
        throw error;
    }
};

// static method to find chat session by email
chatHistorySchema.statics.findBySession = async function (email, sessionID) {
    try {
        const chatEntry = await ChatHistoryModel.findOne(
            { email, 'chats.sessionID': sessionID },
            { 'chats.$': 1 }
        );
        if (chatEntry) {
            return chatEntry;
        }
        return [];
    } catch (error) {
        return [];
    }
};

chatHistorySchema.statics.addToChatHistory = async function (req, subject, topic, chatLog) {
    try {
        const email = req.user.email;
        let chatHistoryId = req.user.chatId;
        let sessionID;
        let chatHistory;
        // No chatHistoryId was set
        if (chatHistoryId == "") {
            sessionID = 0;
            chatHistory = new ChatHistoryModel({
                //_id: new mongoose.Types.ObjectId(), // Explicitly generate an _id
                email,
                chats: [
                    {
                        sessionID,
                        subject,
                        topic,
                        createdAt: new Date(),
                        messages: chatLog,
                    },
                ],
            });
            await chatHistory.save();
            chatHistoryId = chatHistory._id;
            const filter = { email };
            const update = { chatId: chatHistoryId, currentSession: sessionID };
            const result = await UserModel.updateOne(filter, update);
            return chatHistory.chats[sessionID];
        }
        chatHistory = await ChatHistoryModel.findById(chatHistoryId);
        // If no chat history document exists, create a new one

        if (chatLog.length == 3) {
            // ChatHistory exists, but no matching chat session found, add a new one
            sessionID = chatHistory.chats.length;
            chatHistory.chats.push({
                sessionID,
                subject,
                topic,
                createdAt: new Date(),
                messages: chatLog,
            });
        } else {
            // Matched session ID, update the existing chat entry
            sessionID = req.user.currentSession;
            chatHistory.chats[sessionID] = {
                sessionID,
                subject,
                topic,
                createdAt: new Date(),
                messages: chatLog,
            };
        }
        if (chatHistory.chats.length > 32) {
            chatHistory.chats.shift();
        }
        const filter = { email };
        const update = { currentSession: sessionID };
        const result = await UserModel.updateOne(filter, update);

        // Save the chat history document to persist the changes
        const savedChatHistory = await chatHistory.save();
        return chatHistory.chats[req.user.currentSession];
    } catch (error) {
        console.error('Error storing or updating chat history:', error);
        throw error;
    }
}

// Modify the deleteChatSession function to update sessionIDs
chatHistorySchema.statics.deleteChatSession = async function (email, sessionID) {
    try {
        const chatHistory = await this.findOne({ email });
        if (!chatHistory) {
            throw new Error('Chat history not found for the specified email.');
        }
        const chatIndex = chatHistory.chats.findIndex(chat => chat.sessionID === sessionID);

        if (chatIndex === -1) {
            throw new Error('Chat session not found.');
        }

        // Remove the chat session from the array
        chatHistory.chats.splice(chatIndex, 1);

        // Update the sessionID values of the remaining chat sessions
        chatHistory.chats.forEach((chat, index) => {
            chat.sessionID = index; // Update sessionID to be the index
        });

        const savedChatHistory = await chatHistory.save();
        return savedChatHistory;
    } catch (error) {
        console.error('Error deleting chat session:', error);
        throw error;
    }
};

// Create a Mongoose model based on the schema
const ChatHistoryModel = mongoose.model('ChatHistory', chatHistorySchema);

export default ChatHistoryModel;
