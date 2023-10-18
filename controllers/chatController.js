import * as chatModel from '../models/chatModel.js';
import UserModel from '../models/user.js';
import ChatHistoryModel from '../models/chatHistory.js';
import jwt from 'jsonwebtoken';
import { EventEmitter } from 'events'; // Add this import for EventEmitter

const signupKey = 'Taiwan'
const maxChatLogEntries = 128;
const chatLog = [];
const chatHistory = [];
const chatEmitter = new EventEmitter();
let curSession = -1;
let subject = '';
let topic = '';
let language = 'en';

// create json web token
const maxAge = 3 * 24 * 60 * 60; // three days in seconds
const createToken = (id) => {
    return jwt.sign({ id }, 'sRkv:C9/h)X@qd4>}JM;=ZtrP#F8QgBT', {
        expiresIn: maxAge
    });
};

export const home_get = async (req, res) => {
    resetChat();
    await fillChatHistory(req);
    res.render('index', { title: 'Home', chatHistory, chatLog, subject, topic, language, curSession });
};

// New function to handle SSE connections
export const chat_sse = (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');

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

export const chat_get = async (req, res) => {
    if (chatLog.length === 0) {
        res.redirect('/');
    } else {
        await fillChatHistory(req);
        res.render('index', { title: 'chat', chatHistory, chatLog, subject, topic, language, curSession });
    }
};

export const chat_post = async (req, res) => {
    //await delay(2000);
    if (Object.keys(req.body).length === 0) {
        return res.redirect('/');
    }

    if (chatLog.length >= maxChatLogEntries) {
        chatLog.shift();
    }

    if (curSession < 0) {
        subject = req.body.subject;
        topic = req.body.topic;
        chatLog.length = 0;
        const isValidTopic = await chatModel.checkTopic(req, language);
        if (!isValidTopic) {
            curSession = -1;
            topic = '';
            subject = '';
            const log = chatModel.initChatLog(subject, topic, language);
            log.forEach(prompt => {
                chatLog.push(prompt);
            });
        } else {
            const log = chatModel.initChatLog(subject, topic, language);
            log.forEach(prompt => {
                chatLog.push(prompt);
            });
            await generateChatResponse('');
            await addToChatHistory(req, subject, topic);
        }
    } else if (curSession >= 0) {
        const userInput = req.body.input;
        chatLog.push({
            role: 'user',
            content: userInput
        });

        await generateChatResponse(userInput);

        /* const answer = await chatModel.generateAnswer(chatLog);
        chatLog.push(answer); */

        await addToChatHistory(req, subject, topic);
    }
    res.redirect('/chat');
};

async function generateChatResponse(userInput) {
    try {
        if(userInput !== ''){
            chatEmitter.emit('chatResponse', { type: 'input', content: userInput });
        } else {
            const greeting = chatModel.greeting(language);
            chatEmitter.emit('chatResponse', { type: 'answer', content: greeting });
        }

        const chatCompletion = await chatModel.generateAnswer(chatLog);
        let rLog = '';
        let sentence = '';

        for await (const part of chatCompletion) {
            const response = part.choices[0].delta.content;

            if (response !== undefined && response !== null) {
                sentence += response;

                if (response.includes('.')) {
                    chatEmitter.emit('chatResponse', { type: 'answer', content: sentence });
                    rLog += sentence;
                    sentence = '';
                }
            }
        }

        if (sentence.length > 0) {
            rLog += sentence;
        }

        chatLog.push({
            role: 'assistant',
            content: rLog
        });

        console.log(chatLog);
    } catch (error) {
        console.error('Error generating chat completion:', error);
        // Handle the error as needed
    }
}

export const chatLookup_post = async (req, res) => {
    try {
        const session = req.body.sessionID;
        const userEmail = req.userEmail;
        const userChatHistory = await ChatHistoryModel.findBySession(userEmail, session);
        if (userChatHistory) {
            curSession = session;
            subject = userChatHistory.chats[0].subject;
            topic = userChatHistory.chats[0].topic;
            chatLog.length = 0;
            userChatHistory.chats[0].messages.forEach(m => {
                chatLog.push(m);
            });
        }
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
    res.cookie('jwt', '', { maxAge: 1 });
    res.redirect('/');
}

export const language_post = async (req, res) => {
    language = req.body.selectedLanguage;
    console.log("-+ ", language);
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

// ------------------------------------------------------------- USE HTTPS!!!!!!!!!!!!!!!!!!!!!!!!!


async function addToChatHistory(req, subject, topic) {
    const email = req.userEmail;
    const chatData = {
        subject,
        topic,
        messages: chatLog,
    };
    try {
        curSession = await ChatHistoryModel.addToChatHistory(email, chatData, curSession);
        console.log('Chat history updated successfully.');
    } catch (error) {
        console.error('Error updating chat history:', error);
    }
}

async function fillChatHistory(req) {
    const userChatHistory = await ChatHistoryModel.findByEmail(req.userEmail);
    const chats = userChatHistory.chats;
    chatHistory.length = 0;
    if (userChatHistory && chats) {
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

function resetChat() {
    chatLog.length = 0;
    curSession = -1;
    subject = '';
    topic = '';
}
