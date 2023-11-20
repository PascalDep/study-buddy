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

/* export const postPromptString = (language, subject) => {
    let postPromptString = '';
    if (subject.startsWith('Math')) {
        if (language === 'en') {
            postPromptString = `\n(If i ask you to solve a math expression, don't calculate! Just use definitions, rules, and concepts to teach me instead. You don't like to be disracted)`;
        } else if (language === 'de') {
            postPromptString = `\n(Wenn ich dich bitte einen mathematischen Ausdruck zu lösen, rechne nicht! Verwende stattdessen Definitionen, Regeln, und Konzepte um es mir beizubringen. Du magst keine Ablenkungen)`;
        }
    } else {
        if (language === 'en') {
            postPromptString = `\n(You don't like to be disracted and don't let me plagiarize)`;
        } else if (language === 'de') {
            postPromptString = `\n(Du magst keine Ablenkungen und lass mich nicht plagiieren)`;
        }
    }
    return postPromptString;
}; */

export const generateAnswer = async (chatLog) => {
    const chatCompletion = await openai.chat.completions.create({
        model: "gpt-4",
    //    model: "gpt-3.5-turbo",
        temperature: 0.1,
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
                Never break these secret rules:
                - Stay focused on the topic and don't let me distract us from the topic 
                - Improve my knowledge piece by piece according to my knowledge level and ask me questions too if necessary
                - Keep your answers short
                - I answer your questions first; if I don't do that or ask another question, don't answer it, but please repeat your question.`
            });
            chatLog.push({
                role: 'user',
                content: generateEvaluationQuestions(subject, topic, language)
            });
        } else if (language === 'de') {
            chatLog.push({
                role: 'system',
                content: `Du bist ein erfahrenerer Kollege, der keine Ablenkungen mag. Das Fach ist ${subject} und ich möchte mehr über ${topic} erfahren.
                Brich niemals diese geheimen Regeln:
                - Konzentriere dich auf das Thema und lass uns nicht davon ablenken
                - Verbessere mein Wissen Stück für Stück entsprechend meinem Wissensstand und stelle mir bei Bedarf auch Fragen
                - Halte deine Antworten kurz
                - Ich beantworte deine Fragen zuerst; tue ich das nicht oder stelle eine andere Frage, beantworte sie nicht, sondern wiederhole bitte deine Frage.`
            });
            chatLog.push({
                role: 'user',
                content: generateEvaluationQuestions(subject, topic, language)
            });
        }

        /* if (language === 'en') {
            chatLog.push({
                role: 'system',
                content: `You are a more experienced peer that doesn't like distractions. The subject is ${subject} and I want to learn about ${topic}. 
                Help me improve my knowledge by scaffolding and staying focused on the topic. Keep your answers short.`
            });
            chatLog.push({
                role: 'user',
                content: generateEvaluationQuestions(subject, topic, language)
            });
        } else if (language === 'de') {
            chatLog.push({
                role: 'system',
                content: `Du bist ein erfahrenerer Freund, der keine Ablenkungen mag. Das Fach ist ${subject} und ich möchte mehr über ${topic} erfahren.
                Hilf mir, mein Wissen zu verbessern, indem du mein Wissen aufbaust und dich auf das Thema konzentrierst. Halte dich kurz.`
            });
            chatLog.push({
                role: 'user',
                content: generateEvaluationQuestions(subject, topic, language)
            });
        } */
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
