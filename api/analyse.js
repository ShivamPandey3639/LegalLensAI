import { HfInference } from "@huggingface/inference";

const hf = new HfInference();

export async function getChatResponse(inputText) {
  try {
    const response = await hf.chatCompletion({
      model: "mistralai/Mistral-7B-Instruct-v0.2", // Free, widely available model
      messages: [
        {
          role: "system",
          content:
            "You are an assistant for Legal Lens. Carefully analyze the provided privacy terms and generate a comprehensive yet concise summary. Ensure the output is well-structured with clear formatting, including line breaks and consistent spacing. Specifically:\n\n" +
            "1. Use markdown formatting\n" +
            "2. Include clear section headings\n" +
            "3. Use bullet points for key findings\n" +
            "4. Provide precise numeric scores\n" +
            "5. Maintain a professional, legal-oriented tone\n\n" +
            "Your output should look like:\n\n" +
            "- Specific, concise observations about the policy\n\n" +
            "## Detailed Metrics\n" +
            "- Privacy Score: XX/100\n" +
            "- Data Usage Risk: Low/Medium/High\n" +
            "- Overall Security Level: Detailed assessment\n\n" +
            "## Recommendations\n" +
            "- Actionable insights for the user",
        },
        {
          role: "user",
          content: inputText,
        },
      ],
      max_tokens: 350,
    });

    console.log("Raw API response:", response.choices[0].message.content);
    return response.choices[0].message.content; // Adjust based on actual response structure
  } catch (error) {
    console.error("Error getting chat response:", error);
    return null;
  }
}

// Example usage
getChatResponse("What is the capital of France?");
