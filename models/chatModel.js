import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const checkTopic = async (req, language) => {
    let chatHistory = [];
    let isValidTopic = false;
    let subject = req.body.subject;
    let topic = req.body.topic;

    /*    const completion = await openai.completions.create({
           model: "gpt-3.5-turbo-instruct",
           prompt: `Just answer with a simple YES or NO: Do you know what ${topic} is?`,
           temperature: 0.1,
           max_tokens: 3,
       });
       let responseText = completion.choices[0].text.toUpperCase().trim(); */
    let responseText = "Y"
    if (responseText && responseText.charAt(0) === 'Y') {
        isValidTopic = true;
        if (language === 'en') {
            chatHistory.push({
                role: 'system',
                content: `You are a more experienced peer that doesn't like distractions. 
                Help me explore my Zone of Proximal Development by scaffolding knowledge and staying focused on the topic.`
            });
            chatHistory.push({
                role: 'user',
                content: generateEvaluationQuestions(subject, topic, language)
            });
        } else if (language === 'de') {
            chatHistory.push({
                role: 'system',
                content: `Du bist ein erfahrener Fachkollege, der keine Ablenkungen mag. 
                Hilf mir, meine Zone der proximalen Entwicklung zu erkunden, indem du mein Wissen aufbaust und dich auf das Thema konzentrierst.`
            });
            chatHistory.push({
                role: 'user',
                content: generateEvaluationQuestions(subject, topic, language)
            });
        }
        /* const chatCompletion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            temperature: 0.2,
            messages: chatHistory
        });
        chatHistory.push(chatCompletion.choices[0].message); */
        chatHistory.push({
            role: 'assist',
            content: `This are the eval questionns\n1 and 2`
        });
    } else {
        if (language === 'en') {
            chatHistory.push({
                role: 'info',
                content: 'Your topic is not clear to me. Please try to reformulate it.'
            });
        } else if (language === 'de') {
            chatHistory.push({
                role: 'info',
                content: 'Dein Thema ist mir nicht ganz klar. Bitte formuliere es um.'
            });
        }
    }
    return { answers: chatHistory, isValidTopic };
};

export const generateAnswer = async (chatLog) => {
    /* const chatCompletion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    temperature: 0.2,
    messages: chatLog,
});
chatLog.push(chatCompletion.choices[0].message); */
    const answer = {
        role: 'assistant',
        content: 'Normal Answer'
    }
    return answer;
};

function generateEvaluationQuestions(subject, topic, language) {
    if (language === 'en') {
        if (subject !== '' && topic !== '') {
            return `Act as a more experienced peer! The subject is ${subject} and I want to learn about ${topic}. Ask me up to 4 questions to figure out my current knowledge level.`;
        } else {
            return 'Quote this: "Something went wrong, please reload the page."'
        }
    } else if (language === 'en') {
        if (subject !== '' && topic !== '') {
            return `Verhalte dich wie ein erfahrener Fachkollege! Das Schulfach ist ${subject} und ich möchte mehr über ${topic} erfahren. Stell mir bis zu 4 Fragen, um meinen aktuellen Wissensstand herauszufinden.`;
        } else {
            return 'Zitiere: "Etwas ist schief gelaufen, bitte lade die Seite neu."'
        }
    }
}