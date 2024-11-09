import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import * as fs from "fs";
import * as path from "path";

const OpenAI = require('openai'); // Import OpenAI from openai v4
const plantumlEncoder = require('plantuml-encoder')
const axios = require('axios');

// Configure OpenAI API
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // This is the default, so you can omit it if it is already set
});

export async function GenerateUml(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
        const requestBody: { prompt?: string; isUpdate?: boolean; lastPlantUmlCode?: string } = await request.json();
        const { prompt, isUpdate, lastPlantUmlCode } = requestBody;

        // Define the path to the file
        const filePath = path.join(__dirname, 'resources', 'plantUML-keywords.txt');
        let data;
        try {
            data = fs.readFileSync(filePath, 'utf8');
            context.log('File contents:', data);
        } catch (err) {
            context.log('Error reading file:', err);
        }

        // Determine the prompt based on whether it's an update
        let finalPrompt = prompt;
        let keywords = `Valid PlantUML keywords: \n\`\`\`ascii\n${data}\n\`\`\`\n`;
        if (isUpdate && lastPlantUmlCode) {
            const decodedLastPlantUML = plantumlEncoder.decode(lastPlantUmlCode);
            finalPrompt = `${keywords}\nHere is the existing PlantUML diagram:\n\`\`\`plantuml\n${decodedLastPlantUML}\n\`\`\`\nPlease make the following changes, ensuring no syntax errors: ${prompt}`;
        } else {
            finalPrompt = `${keywords}\nGenerate a valid PlantUML diagram for: ${prompt}. It should be free from syntax errors.`;
        }

        context.log('Final prompt:', finalPrompt);

        // Create a chat completion
        const openaiResponse = await openai.chat.completions.create({
            model: 'gpt-4o-2024-08-06',
            messages: [{ role: 'user', content: finalPrompt }],
            max_tokens: 1500,
        });

        const { language, code: plantUmlCode } = extractCodeBlock(openaiResponse.choices[0].message.content.trim());

        context.log(plantUmlCode);

        if (plantUmlCode) {
            // Step 2: Encode the PlantUML code
            const encodedPlantUml = plantumlEncoder.encode(plantUmlCode);

            try {
                // Step 3: Request the SVG from the PlantUML server
                const plantUmlSvgUrl = `http://www.plantuml.com/plantuml/svg/${encodedPlantUml}`;
                const plantUmlResponse = await axios.get(plantUmlSvgUrl, { responseType: 'arraybuffer' });

                // Step 4: Send both the SVG and encoded PlantUML back to the client
                return {
                    jsonBody: {
                        svgData: Buffer.from(plantUmlResponse.data, 'binary').toString('utf8'),
                        encodedDiagram: encodedPlantUml
                    }
                };
            } catch (error) {
                context.log('Error generating SVG from PlantUML:', error);
                // Return only the encoded diagram if SVG generation fails
                return {
                    jsonBody: {
                        svgData: null,
                        encodedDiagram: encodedPlantUml
                    }
                };
            }
        } else {
            return {
                status: 400,
                body: 'No valid PlantUML code found in response'
            };
        }
    } catch (error) {
        if (error instanceof OpenAI.APIError) {
            context.log(error.status);  // e.g. 401
            context.log(error.message); // e.g. The authentication token you passed was invalid...
            context.log(error.code);    // e.g. 'invalid_api_key'
            context.log(error.type);    // e.g. 'invalid_request_error'
        } else {
            // Non-API error
            context.log(error);
        }
        return {
            status: 500,
            body: 'Error generating UML diagram'
        };
    }
};

function extractCodeBlock(response) {
    const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/;
    const match = response.match(codeBlockRegex);
  
    if (match) {
      const language = match[1];
      const code = match[2];
      return { language, code };
    } else {
      return null;
    }
}

app.http('GenerateUml', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: GenerateUml
});
