"use client";

import React, { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { ChatMessage, MessageType, QuickAction } from "@/types/chatbot";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  disabled?: boolean;
  quickActions?: QuickAction[];
  assessmentComplete?: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  disabled = false,
  quickActions = [],
  assessmentComplete = false,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    if (!disabled && !assessmentComplete) {
      inputRef.current?.focus();
    }
  }, [disabled, assessmentComplete]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !isLoading && !disabled) {
      onSendMessage(trimmed);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    if (!isLoading && !disabled) {
      onSendMessage(action.value);
    }
  };

  return (
    <div className="flex flex-col h-full bg-terminal-black border border-terminal-dark-blue rounded overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Starting conversation...</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === MessageType.USER ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`
                max-w-[80%] rounded p-3
                ${
                  message.role === MessageType.USER
                    ? "bg-accent-financial-blue/20 border border-accent-financial-blue/30 text-gray-100"
                    : message.role === MessageType.ADVISOR
                    ? "bg-terminal-dark-blue/50 border border-terminal-dark-blue text-gray-200"
                    : "bg-alert-signal-red/20 border border-alert-signal-red/30 text-alert-signal-red"
                }
              `}
            >
              {/* Message header */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-70">
                  {message.role === MessageType.USER
                    ? "You"
                    : message.role === MessageType.ADVISOR
                    ? "Advisor"
                    : "System"}
                </span>
                <span className="text-xs opacity-40">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Message content */}
              <div className="whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-terminal-dark-blue/50 border border-terminal-dark-blue rounded p-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">Advisor is thinking...</span>
              </div>
            </div>
          </div>
        )}

        {/* Assessment complete indicator */}
        {assessmentComplete && !isLoading && (
          <div className="flex justify-center">
            <div className="bg-success-ag-green/20 border border-success-ag-green/30 rounded px-4 py-2 text-success-ag-green">
              <div className="flex items-center gap-2 text-sm font-semibold">
                ✓ Assessment Complete
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      {!disabled && !assessmentComplete && quickActions.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-800">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleQuickAction(action)}
                disabled={isLoading}
                className="
                  px-3 py-1.5 text-xs rounded
                  bg-terminal-dark-blue/50 border border-terminal-dark-blue
                  hover:bg-accent-cyan/20 hover:border-accent-cyan/50
                  text-gray-300 hover:text-accent-cyan
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      {!disabled && !assessmentComplete && (
        <div className="p-4 border-t border-gray-800 bg-terminal-dark-blue/20">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              disabled={isLoading}
              rows={2}
              className="
                flex-1 px-3 py-2 rounded
                bg-terminal-black border border-gray-700
                text-gray-200 text-sm font-mono
                placeholder-gray-500
                focus:outline-none focus:border-accent-cyan
                resize-none
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !inputValue.trim()}
              className="
                px-4 py-2 rounded
                bg-accent-cyan/20 border border-accent-cyan/50
                text-accent-cyan hover:bg-accent-cyan/30
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center
              "
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Enter</kbd> to send,
            <kbd className="px-1.5 py-0.5 bg-gray-800 rounded ml-1">Shift+Enter</kbd> for new line
          </div>
        </div>
      )}

      {/* Disabled / complete state */}
      {(disabled || assessmentComplete) && (
        <div className="p-4 border-t border-gray-800 bg-terminal-dark-blue/20 text-center text-gray-400 text-sm">
          {assessmentComplete
            ? "Assessment complete. Proceed to the next step."
            : "Chat is currently disabled."}
        </div>
      )}
    </div>
  );
}
