import { StreamingTextResponse } from "ai";
import { ChatMessage, MessageContent, OpenAI } from "llamaindex";
import { NextRequest, NextResponse } from "next/server";
import { createChatEngine } from "./engine";
import { LlamaIndexStream } from "./llamaindex-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const convertMessageContent = (
  textMessage: string,
  imageUrl: string | undefined,
): MessageContent => {
  if (!imageUrl) return textMessage;
  return [
    {
      type: "text",
      text: textMessage,
    },
    {
      type: "image_url",
      image_url: {
        url: imageUrl,
      },
    },
  ];
};

const fireworks = async (message: string) => {
  let response = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Accept': "application/json",
      'Content-Type': "application/json",
      'Authorization': `Bearer ${process.env.FIREWORKS_API_KEY}`
    },
    body: JSON.stringify({
      model: "accounts/fireworks/models/firefunction-v1",
      max_tokens: 4096,
      top_p: 1,
      top_k: 40,
      presence_penalty: 0,
      frequency_penalty: 0,
      temperature: 0.6,
      messages: [
        {
          content: message,
          role: "user"
        }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "summarizer",
            description: "Summarize the input text into asking more relevant questions",
            parameters: {
            }
          }
        }
      ]
    })
  });
  response = await response.json()
  const completion = response.choices[0].message.content;

  return completion;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, data }: { messages: ChatMessage[]; data: any } = body;
    const userMessage = messages.pop();
    if (!messages || !userMessage || userMessage.role !== "user") {
      return NextResponse.json(
        {
          error:
            "messages are required in the request body and the last message must be from the user",
        },
        { status: 400 },
      );
    }

    const llm = new OpenAI({
      model: (process.env.MODEL as any) ?? "gpt-3.5-turbo",
      maxTokens: 512,
    });

    const chatEngine = await createChatEngine(llm);

    let response_fireworks = ''
    response_fireworks = await fireworks(userMessage.content)

    // Convert message content from Vercel/AI format to LlamaIndex/OpenAI format
    const userMessageContent = convertMessageContent(
      userMessage.content + response_fireworks,
      data?.imageUrl,
    );

    // Calling LlamaIndex's ChatEngine to get a streamed response
    const response = await chatEngine.chat({
      message: userMessageContent,
      chatHistory: messages,
      stream: true,
    });

    // Transform LlamaIndex stream to Vercel/AI format
    const { stream, data: streamData } = LlamaIndexStream(response, {
      parserOptions: {
        image_url: data?.imageUrl,
      },
    });

    // Return a StreamingTextResponse, which can be consumed by the Vercel/AI client
    return new StreamingTextResponse(stream, {}, streamData);
  } catch (error) {
    console.error("[LlamaIndex]", error);
    return NextResponse.json(
      {
        error: (error as Error).message,
      },
      {
        status: 500,
      },
    );
  }
}
