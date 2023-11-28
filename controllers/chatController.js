import * as chatModel from '../models/chatModel.js';
import UserModel from '../models/user.js';
import ChatHistoryModel from '../models/chatHistory.js';
import jwt from 'jsonwebtoken';
import { EventEmitter } from 'events'; // Add this import for EventEmitter

const signupKey = 'Tschuggmall'
const userEmitters = new Map();
let language = 'de';

// create json web token
const maxAge = 3 * 24 * 60 * 60; // three days in seconds
const createToken = (id) => {
    return jwt.sign({ id }, 'sRkv:C9/h)X@qd4>}JM;=ZtrP#F8QgBT', {
        expiresIn: maxAge
    });
};

// New function to handle SSE connections
export const chat_sse = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    const userId = req.user.email;
    if (!userId) {
        res.status(401).end(); // Unauthorized
        return;
    }

    // Get or create an emitter for the user
    let chatEmitter = userEmitters.get(userId);
    if (!chatEmitter) {
        chatEmitter = new EventEmitter();
        userEmitters.set(userId, chatEmitter);
    }

    const onChatResponse = (response) => {
        res.write(`data: ${JSON.stringify(response)}\n\n`);
    };

    // Listen for chat responses
    chatEmitter.on('chatResponse', onChatResponse);

    // Close the connection when the client disconnects
    req.on('close', () => {
        chatEmitter.removeListener('chatResponse', onChatResponse);
    });
};

export const home_get = async (req, res) => {
    const chatHistory = await getUserChatHistory(req);
    const chatLog = [];
    res.render('index', { title: 'Home', chatHistory, chatLog, subject: '', topic: '', language, curSession: -1 });
};

export const chat_get = async (req, res) => {
    const chatHistory = await getUserChatHistory(req);
    const chatSession = await getUserChatSession(req);
    if (req.user.currentSession >= 0) {
        res.render('index', {
            title: 'chat', chatHistory, chatLog: chatSession.messages, subject: chatSession.subject,
            topic: chatSession.topic, language, curSession: req.user.currentSession
        });
    } else {
        const chatLog = [];
        if (language === 'en') {
            chatLog.push({
                role: 'info',
                content: 'This topic is not clear to me. Please choose another topic.'
            });
        } else if (language === 'de') {
            chatLog.push({
                role: 'info',
                content: 'Dieses Thema ist mir nicht ganz klar. Bitte wähle ein anderes Thema.'
            });
        }
        res.render('index', {
            title: 'chat', chatHistory, chatLog: chatLog, subject: '',
            topic: '', language, curSession: req.user.currentSession
        });
    }
};

export const chat_post = async (req, res) => {
    const subject = req.body.subject;
    const topic = req.body.topic;
    const chatLog = [];
    // New chat opened
    if (topic != null) {
        const isValidTopic = await chatModel.checkTopic(req, language);
        if (!isValidTopic) {
            const log = chatModel.initChatLog(subject, topic, language);
            log.forEach(prompt => {
                chatLog.push(prompt);
            });
        } else {
            const log = chatModel.initChatLog(subject, topic, language);
            log.forEach(prompt => {
                chatLog.push(prompt);
            });
            await generateChatResponse('', chatLog, req.user.email);
            await ChatHistoryModel.addToChatHistory(req, subject, topic, chatLog);
        }
    } else if (req.body.input != null) {
        const chatSession = await getUserChatSession(req);
        const userInput = req.body.input;

        chatSession.messages.forEach(m => {
            chatLog.push({
                role: m.role,
                content: m.content,
            })
        });
        chatLog.push({
            role: 'user',
            content: userInput
        });

        await generateChatResponse(userInput, chatLog, req.user.email);
        await ChatHistoryModel.addToChatHistory(req, chatSession.subject, chatSession.topic, chatLog);
    } else {
        return res.redirect('/');
    }
    res.redirect('/chat');
};

async function generateChatResponse(userInput, chatLog, userEmail) {
    try {
        let greeting = '';
        const chatEmitter = userEmitters.get(userEmail);
        if (userInput !== '') {
            chatEmitter.emit('chatResponse', { type: 'input', content: userInput });
        } else {
            greeting = chatModel.greeting(language);
            chatEmitter.emit('chatResponse', { type: 'answer', content: greeting });
        }

        const chatCompletion = await chatModel.generateAnswer(chatLog);
        let rLog = '';
        let sentence = '';

        for await (const part of chatCompletion) {
            const response = part.choices[0].delta.content;

            if (response !== undefined && response !== null) {
                sentence += response;

                if (response.includes('.') || response.includes('\n')) {
                    chatEmitter.emit('chatResponse', { type: 'answer', content: sentence });
                    rLog += sentence;
                    sentence = '';
                }
            }
        }

        if (sentence.length > 0) {
            rLog += sentence;
        }
        chatLog.pop();
        chatLog.push({
            role: 'user',
            content: userInput
        });

        chatLog.push({
            role: 'assistant',
            content: greeting + rLog
        });

        return chatLog;
    } catch (error) {
        console.error('Error generating chat completion:', error);
        // Handle the error as needed
    }
}

export const chatLookup_post = async (req, res) => {
    try {
        const session = req.body.sessionID;
        const userEmail = req.userEmail;

        await ChatHistoryModel.setChatSession(userEmail, session);
        res.status(200).json({ session });
    }
    catch (errors) {
        res.status(400).json({ errors });
    }
};

export const delete_history_post = async (req, res) => {
    try {
        const sessionID = req.body.sessionID;
        const userEmail = req.userEmail; // Assuming you have access to the user's email
        await ChatHistoryModel.deleteChatSession(userEmail, sessionID);

        res.status(200).json({ session: sessionID });
    } catch (error) {
        console.error('Error deleting chat session:', error);
        res.status(400).json({ errors: 'An error occurred while deleting the chat session.' });
    }
};

export const help_get = (req, res) => {
    res.render('help', { title: 'Help', language });
}

export const about_get = (req, res) => {
    res.render('about', { title: 'About', language });

}

export const signup_get = (req, res) => {
    res.render('signup', { title: 'Sign Up', language });
}

export const login_get = (req, res) => {
    res.render('login', { title: 'Log In', language });
}

let keyAttempts = 0; // change later --------------------------
export const signup_post = async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const key = req.body.key;
    // Change later -------------------------------
    if (key === signupKey) {
        keyAttempts = 0;
        try {
            const user = await UserModel.create({ email, password });
            const token = createToken(user._id);
            res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
            res.status(201).json({ user: user._id });
        }
        catch (err) {
            const errors = handleErrors(err);
            res.status(400).json({ errors });
        }
    } else {
        keyAttempts++
        if (keyAttempts < 10) {
            let errors = { email: '', password: '' };
            errors.email = 'Wrong access-key. Account not created!';
            res.status(400).json({ errors });
        } else {
            let errors = { email: '', password: '' };
            errors.email = 'Too many wrong attempts! Try again tomorrow';
            res.status(400).json({ errors });
        }

    }
}

export const login_post = async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    try {
        const user = await UserModel.login(email, password);
        const token = createToken(user._id);
        res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
        res.status(200).json({ user: user._id });
    } catch (err) {
        const errors = handleErrors(err);
        res.status(400).json({ errors });
    }
}

export const logout_get = async (req, res) => {
    const userId = req.user.id;
    userEmitters.delete(userId);
    res.cookie('jwt', '', { maxAge: 1 });
    res.redirect('/');
}

export const language_post = async (req, res) => {
    language = req.body.selectedLanguage;
    res.status(202).json({});
}

const handleErrors = (err) => {
    let errors = { email: '', password: '' };

    // incorrect email
    if (err.message === 'incorrect email') {
        errors.email = 'Account does not exist';
    }

    // incorrect password
    if (err.message === 'incorrect password') {
        errors.password = 'Password incorrect';
    }

    // duplicate email error
    if (err.code === 11000) {
        errors.email = 'Account already exists';
        return errors;
    }

    // validation errors
    if (err.message.includes('user validation failed')) {
        Object.values(err.errors).forEach(({ properties }) => {
            errors[properties.path] = properties.message;
        });
    }

    return errors;
}

async function getUserChatHistory(req) {
    const chatHistory = [];
    const userChatHistory = req.userChatHistory;
    if (userChatHistory) {
        const chats = userChatHistory.chats;
        if (chats) {
            chats.forEach(c => {
                const sessionID = c.sessionID;
                const subject = c.subject;
                const topic = c.topic;
                const createdAt = c.createdAt;
                chatHistory.push({
                    sessionID,
                    subject,
                    topic,
                    createdAt,
                });
            });
        }
    }
    return chatHistory;
}

async function getUserChatSession(req) {
    let chatSession = [];
    const userChatHistory = req.userChatHistory;
    if (userChatHistory && userChatHistory.chats) {
        chatSession = userChatHistory.chats[req.user.currentSession];
    }
    return chatSession;
}
