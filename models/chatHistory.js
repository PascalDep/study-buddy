import mongoose from 'mongoose';

const chatHistorySchema = new mongoose.Schema({
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
chatHistorySchema.statics.findByEmail = async function (email) {
    try {
        const chatHistory = await this.findOne({ email });
        if (chatHistory) {
            return chatHistory;
        }
        return [];
    } catch (error) {
        return [];
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

// What if more people share one account???------------------------
// Function to store or update chat history
chatHistorySchema.statics.addToChatHistory = async function (email, chatData, curSession) {
    const subject = chatData.subject;
    const topic = chatData.topic;
    let sessionID;

    try {
        // Find the chat history document based on the email
        let chatHistory = await ChatHistoryModel.findOne({ email });

        if (!chatHistory) {
            sessionID = 0;
            // If no chat history document exists for the email, create a new one
            chatHistory = new ChatHistoryModel({
                email,
                chats: [
                    {
                        sessionID,
                        subject,
                        topic,
                        createdAt: new Date(),
                        messages: chatData.messages,
                    },
                ],
            });
        } else {
            const chatEntry = await ChatHistoryModel.findOne(
                { email, 'chats.sessionID': curSession },
                { 'chats.$': 1 }
            );

            if (chatEntry) {
                const matchedChat = chatEntry.chats[0]; // Access the first (and only) matched chat entry
                if (matchedChat.sessionID === curSession.toString()) {
                    // Matched session ID, update the existing chat entry
                    sessionID = curSession;
                    chatHistory.chats[sessionID] = {
                        sessionID,
                        subject,
                        topic,
                        createdAt: new Date(),
                        messages: chatData.messages,
                    };
                }
            } else {
                // No matching chat entry found, add a new one
                sessionID = chatHistory.chats.length;
                chatHistory.chats.push({
                    sessionID,
                    subject,
                    topic,
                    createdAt: new Date(),
                    messages: chatData.messages,
                });
            }

            if (chatHistory.chats.length > 32) {
                chatHistory.chats.shift();
            }
        }
        // Save the chat history document to persist the changes
        const savedChatHistory = await chatHistory.save();

        // return savedChatHistory;
        return sessionID;
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
