import { HfInference } from "@huggingface/inference";

const hf = new HfInference();

export async function getChatResponse2(inputText) {
  try {
    const response = await hf.chatCompletion({
      model: "mistralai/Mistral-7B-Instruct-v0.2", // Free, widely available model
      messages: [
        {
          role: "system",
          content: "You are an helpful assistant with friendly nature.",
        },
        {
          role: "user",
          content: inputText,
        },
      ],
      max_tokens: 512,
    });

    console.log("Raw API response:", response.choices[0].message.content);
    return response.choices[0].message.content; // Adjust based on actual response structure
  } catch (error) {
    console.error("Error getting chat response:", error);
    return null;
  }
}

// Example usage
getChatResponse2("What is the capital of France?");
