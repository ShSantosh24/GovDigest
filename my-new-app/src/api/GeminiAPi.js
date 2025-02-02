import { GoogleGenerativeAI } from "@google/generative-ai"; 

const API_KEY
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function summarizeAbstract(abstract) {
    try {
      const prompt = `Summarize the following policy abstract with a neutral tone. List the pros and cons without supporting any side. The summary should be easy to understand for a younger generation. Provide insights into both the advantages and disadvantages of the policy, without taking a stance: "${abstract}"`;
  
      const result = await model.generateContent(prompt);
      const response = await result.response;
  
      // Assuming the response contains a summary along with pros and cons in a structured format
      const parsedResponse = response.text().split("\n");
      const summary = parsedResponse[0]; // Assuming the first line is the summary
      const pros = parsedResponse.slice(1, parsedResponse.indexOf("Cons")).join("\n"); // Capture the pros section
      const cons = parsedResponse.slice(parsedResponse.indexOf("Cons") + 1).join("\n"); // Capture the cons section
  
      return {
        summary,
        pros,
        cons
      };
    } catch (error) {
      console.error("Error summarizing policy:", error);
      return {
        summary: "Summary unavailable.",
        pros: "Pros unavailable.",
        cons: "Cons unavailable."
      };
    }
  }
