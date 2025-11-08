"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Send, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AIChatProps {
  getTaskInfo?: () => string | Promise<string>;
}

interface WalletData {
  address: string;
  publicKey: Uint8Array;
}

// Mock function - Replace this with actual task fetching logic
const mockGetTaskInfo = async (): Promise<string> => {
  return JSON.stringify({
    id: "task-1",
    title: "Complete project proposal",
    description: "Finish the Q4 project proposal",
    priority: "high",
    dueDate: "2025-12-15",
    status: "in-progress",
    assignee: "user@example.com",
  });
};

const getWalletFromStorage = (): WalletData | null => {
  try {
    const stored = localStorage.getItem("task_manage_wallet");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed.address ? parsed : null;
  } catch {
    return null;
  }
};

export function AIChat({ getTaskInfo }: AIChatProps) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const wallet = getWalletFromStorage();
    if (wallet?.address) {
      setWalletAddress(wallet.address);
    }
  }, []);

  if (!walletAddress) {
    return null;
  }

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: message };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Get task information
      const taskInfoFn = getTaskInfo || mockGetTaskInfo;
      const taskInfo = await taskInfoFn();

      // Check if task info is empty
      if (!taskInfo || taskInfo.trim() === "") {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "There is currently no data about the task. Please create or select a task to get started.",
          },
        ]);
        setIsLoading(false);
        return;
      }

      // Call OpenRouter API
      const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
            "HTTP-Referer": window.location.origin,
            "X-Title": "Task Manage AI",
          },
          body: JSON.stringify({
            model: "minimax/minimax-m2:free",
            messages: [
              {
                role: "system",
                content: `You are an assistant for task management. This is the user's current task information: ${String(
                  taskInfo
                )}. Use this information to provide helpful and relevant responses to the user's queries to bring great value. Don't answer questions unrelated to task management and make sure to answer following user's questions.`,
              },
              ...messages,
              userMessage,
            ],
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      const aiContent =
        data.choices?.[0]?.message?.content || "No response received";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: aiContent },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (input.trim()) {
      handleSendMessage(input);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="fixed bottom-6 right-6 z-40 rounded-full w-14 h-14 bg-black hover:cursor-pointer"
          aria-label="Open AI Chat"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-96 h-[500px] rounded-lg shadow-xl overflow-hidden">
          <Card className="h-full flex flex-col border-0">
            <CardHeader className="flex flex-row items-center justify-between border-b">
              <CardTitle className="text-sm font-semibold">Assistant</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="text-center text-xs text-muted-foreground pt-2">
                    Start a conversation about your tasks
                  </div>

                  {/* Quick Suggestions */}
                  <div className="space-y-2">
                    <button
                      onClick={() =>
                        handleSendMessage("Summary current task for me")
                      }
                      className="w-full text-left text-xs p-2 rounded border border-gray-300  transition"
                    >
                      Summary current task for me
                    </button>

                    <button
                      onClick={() =>
                        handleSendMessage(
                          "What is the task status and due date?"
                        )
                      }
                      className="w-full text-left text-xs p-2 rounded border border-gray-300  transition"
                    >
                      What is the task on due?
                    </button>

                    <button
                      onClick={() =>
                        handleSendMessage("What is my current task?")
                      }
                      className="w-full text-left text-xs p-2 rounded border border-gray-300  transition"
                    >
                      What is my current task?
                    </button>
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                      msg.role === "user"
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-gray-200 text-gray-900 rounded-bl-none"
                    }`}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p className="mb-2">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-bold">{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic">{children}</em>
                          ),
                          code: ({ children }) => (
                            <code className="bg-gray-800 text-white px-1 py-0.5 rounded text-xs">
                              {children}
                            </code>
                          ),
                          li: ({ children }) => (
                            <li className="ml-4 list-disc">{children}</li>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-inside">{children}</ul>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 underline"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 text-gray-900 px-3 py-2 rounded-lg text-sm rounded-bl-none">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask AI..."
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !isLoading && input.trim()) {
                      handleSend();
                    }
                  }}
                  disabled={isLoading}
                  className="text-sm h-9"
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  size="sm"
                  className="px-3 h-9"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
