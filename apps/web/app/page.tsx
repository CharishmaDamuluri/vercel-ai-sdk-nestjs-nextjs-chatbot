"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState } from "react";

type GatewayModel = {
  id: string;
  name: string;
};

export default function Home() {
  const [models, setModels] = useState<GatewayModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        modelMenuRef.current &&
        !modelMenuRef.current.contains(event.target as Node)
      ) {
        setIsModelMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const loadModels = async () => {
      try {
        setModelsLoading(true);
        setModelsError(null);
        const response = await fetch("/api/chat/models");
        if (!response.ok) {
          throw new Error(`Failed to load models (${response.status})`);
        }

        const data = (await response.json()) as GatewayModel[];
        setModels(data);

        if (data.length > 0) {
          setSelectedModel(
            (current) => current || (data[0] && data[0].id) || "",
          );
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load models";
        setModelsError(message);
      } finally {
        setModelsLoading(false);
      }
    };

    void loadModels();
  }, []);

  const { messages, sendMessage, regenerate, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({ model: selectedModel }),
    }),
  });
  const [input, setInput] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const selectedModelLabel =
    models.find((model) => model.id === selectedModel)?.name || selectedModel;

  const getMessageText = (parts: readonly { type: string; text?: string }[]) => {
    return parts
      .map((part) => (part.type === "text" ? (part.text ?? "") : ""))
      .filter(Boolean)
      .join("\n");
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4">
      <div className="mb-4">
        {/* Model selector */}
        <label
          htmlFor="model-input"
          className="block text-sm font-medium text-gray-400 mb-2"
        >
          Model
        </label>
        <div ref={modelMenuRef} className="relative">
          <button
            id="model-input"
            type="button"
            disabled={modelsLoading || models.length === 0}
            onClick={() => setIsModelMenuOpen((open) => !open)}
            className="w-full h-9 px-3 text-left text-sm bg-gray-900 border border-gray-700 rounded-lg text-white disabled:opacity-60 truncate"
          >
            {modelsLoading
              ? "Loading models..."
              : selectedModelLabel || "Select model"}
          </button>

          {isModelMenuOpen && !modelsLoading && models.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
              <ul className="max-h-48 overflow-y-auto py-1">
                {models.map((model) => (
                  <li key={model.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedModel(model.id);
                        setIsModelMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-800 ${selectedModel === model.id ? "bg-gray-800" : ""}`}
                    >
                      {model.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {modelsError && (
          <p className="mt-2 text-sm text-red-400">{modelsError}</p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {/* Messages */}
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            Start a conversation by typing something below
          </div>
        )}
        {messages.map((op) => (
          <div
            id={op.id}
            key={op.id}
            className={`flex ${op.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${op.role === "user" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-100"}`}
            >
              <div className="text-xs font-semibold mb-1 opacity-70 flex items-center justify-between gap-3">
                <span>{op.role === "user" ? "You" : "Assistant"}</span>
                {op.role === "assistant" && (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await regenerate({
                          messageId: op.id,
                          body: { model: selectedModel },
                        });
                      }}
                      disabled={status !== "ready" || !selectedModel}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Regenerate response"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-3.5 w-3.5"
                      >
                        <path d="M21 12a9 9 0 1 1-3-6.7" />
                        <polyline points="21 3 21 9 15 9" />
                      </svg>
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const text = getMessageText(op.parts);
                        if (!text) return;

                        await navigator.clipboard.writeText(text);
                        setCopiedMessageId(op.id);
                        setTimeout(() => setCopiedMessageId(null), 1200);
                      }}
                      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] hover:bg-gray-700 transition-colors"
                      title="Copy response"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-3.5 w-3.5"
                      >
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      {copiedMessageId === op.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {op.parts.map((part, index) => {
                  if (part.type === "text") {
                    return (
                      <div key={index} className="whitespace-pre-wrap">
                        {part.text}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        ))}

        {status !== "ready" && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center space-x-2">
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) {
            sendMessage({ text: input }, { body: { model: selectedModel } });
            setInput("");
          }
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
        />
        <button
          type="submit"
          disabled={status !== "ready" || !input.trim() || !selectedModel}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
