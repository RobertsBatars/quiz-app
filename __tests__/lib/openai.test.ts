import { generateQuiz, moderateContent, generateEmbeddings } from '../../lib/openai';

describe('OpenAI Integration', () => {
  it('should generate quiz questions', async () => {
    const context = 'The capital of France is Paris. Paris is known for the Eiffel Tower.';
    const result = await generateQuiz(context, 'multiple-choice', 2);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          question: expect.any(String),
          options: expect.arrayContaining([expect.any(String)]),
          correctAnswer: expect.any(String)
        })
      ])
    );
  });

  it('should moderate content', async () => {
    const safeContent = 'This is a safe educational text about mathematics.';
    const result = await moderateContent(safeContent);

    expect(result).toEqual(
      expect.objectContaining({
        isSafe: expect.any(Boolean),
        categories: expect.any(Object)
      })
    );
  });

  it('should generate embeddings', async () => {
    const text = 'Sample text for embedding generation';
    const embeddings = await generateEmbeddings(text);

    expect(embeddings).toEqual(
      expect.arrayContaining([
        expect.any(Number)
      ])
    );
    expect(embeddings.length).toBe(1536); // OpenAI embedding dimension
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('API Error'));

    await expect(generateQuiz('test', 'multiple-choice', 1)).rejects.toThrow();
  });
});