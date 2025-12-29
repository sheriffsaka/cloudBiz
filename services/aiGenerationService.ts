
import { GoogleGenAI } from "@google/genai";

export async function generateTextResponse(
    prompt: string,
    model: string, // Widened type to allow gemini-3 series models and resolve type mismatch
    systemInstruction?: string,
): Promise<string> {
    if (!process.env.API_KEY) {
        console.error("API_KEY environment variable not set.");
        return "Gemini AI is not configured. Please set your API key.";
    }

    try {
        // Create a new GoogleGenAI instance right before making an API call, as per guidelines.
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const config = systemInstruction ? { systemInstruction } : {};

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: config,
        });
        return response.text;
    } catch (error) {
        console.error(`Error calling Gemini API with model ${model}:`, error);
        return "Sorry, I encountered an error while processing your request.";
    }
}
