import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const checkTopic = async (req, language) => {
    let isValidTopic = false;
    let subject = req.body.subject;
    let topic = req.body.topic;
    let responseText = 'N';
    if (language === 'en') {
        const completion = await openai.completions.create({
            model: "gpt-3.5-turbo-instruct",
            prompt: `Just answer with a simple YES or NO: Is ${topic} a valid topic for the school subject ${subject}?`,
            temperature: 0.5,
            max_tokens: 3,
        });
        responseText = completion.choices[0].text.toUpperCase().trim();
        /* console.log('EN --  ', topic, " ... ", responseText); */
    } else if (language === 'de') {
        const completion = await openai.completions.create({
            model: "gpt-3.5-turbo-instruct",
            prompt: `Antworte mit einem einfachen JA oder NEIN: Ist ${topic} ein gültiges Thema für das Fach ${subject}?`,
            temperature: 0.5,
            max_tokens: 3,
        });
        responseText = completion.choices[0].text.toUpperCase().trim();
        /* console.log('DE --  ', topic, " ... ", responseText); */
    }

    /* let responseText = "Y" */
    if (responseText && (responseText.charAt(0) === 'Y' || responseText.charAt(0) === 'J')) {
        isValidTopic = true;
    }
    return isValidTopic;
};

export const generateAnswer = async (chatLog) => {
    const chatCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        temperature: 0.2,
        messages: chatLog,
        stream: true,
    });

    return chatCompletion;
};

function generateEvaluationQuestions(subject, topic, language) {
    if (language === 'en') {
        if (subject !== '' && topic !== '') {
            return `As a more experienced peer, ask me up to 3 questions to figure out my current knowledge level.`;
        } else {
            return 'Quote this: "Something went wrong, please reload the page."'
        }
    } else if (language === 'de') {
        if (subject !== '' && topic !== '') {
            return `Als ein erfahrenerer Fachkollege, stell mir bis zu 3 Fragen, um meinen aktuellen Wissensstand herauszufinden.`;
        } else {
            return 'Zitiere: "Etwas ist schief gelaufen, bitte lade die Seite neu."'
        }
    }
}

export const initChatLog = (subject, topic, language) => {
    let chatLog = [];
    if (topic !== '') {
        if (language === 'en') {
            chatLog.push({
                role: 'system',
                content: `You are a more experienced peer that doesn't like distractions. The subject is ${subject} and I want to learn about ${topic}. 
                Help me explore my Zone of Proximal Development by scaffolding knowledge and staying focused on the topic.`
            });
            chatLog.push({
                role: 'user',
                content: generateEvaluationQuestions(subject, topic, language)
            });
        } else if (language === 'de') {
            chatLog.push({
                role: 'system',
                content: `Du bist ein erfahrenerer Fachkollege, der keine Ablenkungen mag. Das Fach ist ${subject} und ich möchte mehr über ${topic} erfahren.
                Hilf mir, meine Zone der proximalen Entwicklung zu erkunden, indem du mein Wissen aufbaust und dich auf das Thema konzentrierst.`
            });
            chatLog.push({
                role: 'user',
                content: generateEvaluationQuestions(subject, topic, language)
            });
        }
    } else {
        if (language === 'en') {
            chatLog.push({
                role: 'info',
                content: 'Your topic is not clear to me. Please check your subject and try to reformulate the topic.'
            });
        } else if (language === 'de') {
            chatLog.push({
                role: 'info',
                content: 'Dieses Thema ist mir nicht ganz klar. Bitte überprüfe das Fach und dein Thema nochmal.'
            });
        }
    }

    return chatLog;
}

export const greeting = (language) => {
    let customHeadertext = '';
    if (language === 'en') {
        customHeadertext = `Great! First, let's find out what you know right now.\n`;
    } else if (language === 'de') {
        customHeadertext = `Großartig! Lass uns zuerst herausfinden, was du bereits weißt.\n`;
    }
    return customHeadertext;
}
