import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateQuiz(context: string, type: string, numQuestions: number) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant that generates ${type} quizzes. Generate ${numQuestions} questions based on the following context: ${context}`
        },
        {
          role: "user",
          content: "Generate the quiz now."
        }
      ],
      response_format: { type: "json_object" }
    });

    const generatedQuiz = JSON.parse(completion.choices[0].message.content);
    return generatedQuiz.questions;
  } catch (error) {
    console.error('Failed to generate quiz:', error);
    throw error;
  }
}

export async function moderateContent(content: string) {
  try {
    const response = await openai.moderations.create({
      input: content,
    });

    return {
      isSafe: !response.results[0].flagged,
      categories: response.results[0].categories
    };
  } catch (error) {
    console.error('Content moderation failed:', error);
    throw error;
  }
}

export async function generateEmbeddings(text: string) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Failed to generate embeddings:', error);
    throw error;
  }
}