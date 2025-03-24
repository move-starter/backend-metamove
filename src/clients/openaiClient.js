import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // Ensure this environment variable is set
});

export const openaiClient = {
  async createAssistant(data) {
    try {
      // Use the appropriate OpenAI API endpoint to create a chat or similar functionality
      // This is a placeholder for the correct API call
      const response = await client.chat.completions.create({
        model: data.model,
        messages: [{ role: 'system', content: `Create an assistant named ${data.name}` }],
      });
      console.log('OpenAI Response:', response); // Log the response to inspect its structure

      // Check if the response contains the expected structure
      if (!response || !response.data || !response.data.id) {
        throw new Error('OpenAI response does not contain an assistant ID');
      }

      const openaiAssistantId = response.data.id; // Extract the assistant ID
      return openaiAssistantId; // Return the assistant ID
    } catch (error) {
      console.error('Error creating assistant in OpenAI:', error);
      throw error;
    }
  },

  async sendMessage(model, message) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: message }],
      });
      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error communicating with OpenAI:', error);
      throw error;
    }
  },
};

export const sendMessage = async (threadId, message) => {
  if (!threadId) {
    throw new Error("Invalid 'thread_id': 'undefined'. Expected an ID that begins with 'thread'.");
  }

  console.log('Using thread ID:', threadId);

  // Proceed with sending the message using the threadId
  // ...
}; 