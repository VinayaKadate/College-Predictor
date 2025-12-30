import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const ChatBot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your college admission assistant. Ask me about colleges, CET cutoffs, admissions, or any college-related information! I can help you with college rankings, cutoff trends, admission procedures, and more.",
      sender: "bot",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const messagesEndRef = useRef(null);

  // Create axios instance for backend API
  const api = axios.create({
    baseURL: "/api", // Use relative path with proxy
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    timeout: 30000, // 30 second timeout
  });

  // Check backend connection on component mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  // Update the checkBackendConnection function:
const checkBackendConnection = async () => {
    try {
        console.log('🔍 Checking backend connection...');
        
        let mainHealth = null;
        let chatStatus = null;
        
        // Try main health endpoint
        try {
            mainHealth = await api.get('/health');
            console.log('✅ Main backend health:', mainHealth.data);
        } catch (healthError) {
            console.log('⚠️ Main health endpoint failed:', healthError.message);
        }
        
        // Try chat status endpoint - FIXED TYPO
        try {
            chatStatus = await api.get('/chat/status'); // Fixed: /chat/status not /charkstatus
            console.log('✅ Chat service status:', chatStatus.data);
            
            if (chatStatus.data.available) {
                setBackendStatus('connected');
            } else {
                setBackendStatus('gemini_unavailable');
            }
        } catch (chatError) {
            console.log('⚠️ Chat status endpoint failed:', chatError.message);
            setBackendStatus('gemini_unavailable');
        }
        
        // If we got main health but no chat status, check what endpoints are available
        if (mainHealth && !chatStatus) {
            console.log('⚠️ Main backend is running but chat endpoints might not be registered');
            
            // Try to see what endpoints are available
            try {
                const homeResponse = await api.get('/');
                console.log('📋 Available endpoints from home:', homeResponse.data.endpoints);
                
                // Check if chat endpoint exists
                if (homeResponse.data.endpoints && homeResponse.data.endpoints.chat) {
                    console.log('✅ Chat endpoint is registered:', homeResponse.data.endpoints.chat);
                    setBackendStatus('chat_endpoint_exists');
                } else {
                    setBackendStatus('chat_endpoint_missing');
                }
            } catch (homeError) {
                console.log('⚠️ Could not fetch home endpoint');
                setBackendStatus('unknown');
            }
        }
        
        // If both failed, show disconnected
        if (!mainHealth && !chatStatus) {
            setBackendStatus('disconnected');
        }
        
    } catch (error) {
        console.error('❌ Backend connection error:', error);
        setBackendStatus('disconnected');
    }
};

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: userMessage,
        sender: "user",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setIsLoading(true);

    try {
      console.log("📤 Sending message:", userMessage);

      const response = await api.post("/chat", {
        message: userMessage,
        history: messages
          .slice(-10)
          .map((msg) => ({
            user: msg.sender === "user" ? msg.text : "",
            bot: msg.sender === "bot" ? msg.text : "",
          }))
          .filter((msg) => msg.user || msg.bot),
      });

      console.log("✅ Chat response received");

      if (response.data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            text: response.data.response,
            sender: "bot",
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
      } else {
        throw new Error(response.data.error || "Unknown error");
      }
    } catch (error) {
      console.error("❌ Chat error:", error);

      let errorMessage =
        "I apologize, but I'm having trouble processing your request. ";

      if (error.code === "ECONNABORTED") {
        errorMessage += "The request timed out. Please try again.";
      } else if (error.response) {
        // Server responded with error status
        const status = error.response.status;

        if (status === 404) {
          errorMessage =
            "Chat service endpoint not found. Please check backend configuration.";
        } else if (status === 500) {
          errorMessage =
            "Server error. This might be due to Gemini API configuration issues.";
        } else if (status === 503) {
          errorMessage =
            "Chat service is temporarily unavailable. Please check if Gemini API key is set.";
        } else {
          errorMessage += `Server returned status: ${status}`;
        }

        console.error("Response error:", status, error.response.data);
      } else if (error.request) {
        // Request was made but no response
        errorMessage =
          "Cannot connect to the server. Please ensure the backend is running.";

        // Offer troubleshooting tips
        errorMessage +=
          "\n\n**Troubleshooting Tips:**\n1. Check if backend server is running on port 5000\n2. Run 'python app.py' in backend folder\n3. Check console for backend errors";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          text: errorMessage,
          sender: "bot",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      // Try to reconnect
      await checkBackendConnection();
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Get status display
  const getStatusDisplay = () => {
    switch (backendStatus) {
      case "connected":
        return {
          text: "Connected to AI Assistant",
          color: "text-green-600",
          bg: "bg-green-100",
          dot: "bg-green-500",
        };
      case "disconnected":
        return {
          text: "Backend Disconnected",
          color: "text-red-600",
          bg: "bg-red-100",
          dot: "bg-red-500",
        };
      case "gemini_unavailable":
        return {
          text: "AI Service Unavailable",
          color: "text-yellow-600",
          bg: "bg-yellow-100",
          dot: "bg-yellow-500",
        };
      case "direct_available":
        return {
          text: "Backend Available (Proxy Issue)",
          color: "text-orange-600",
          bg: "bg-orange-100",
          dot: "bg-orange-500",
        };
      case "checking":
        return {
          text: "Checking Connection...",
          color: "text-blue-600",
          bg: "bg-blue-100",
          dot: "bg-blue-500 animate-pulse",
        };
      default:
        return {
          text: "Unknown Status",
          color: "text-gray-600",
          bg: "bg-gray-100",
          dot: "bg-gray-500",
        };
    }
  };

  const status = getStatusDisplay();

  // Suggested questions
  const suggestedQuestions = [
    "What are the cutoff for Computer Engineering?",
    "Tell me about top colleges in Mumbai",
    "Which colleges accept CET percentile?",
    "What is the admission process for engineering?",
  ];

  const handleSuggestedQuestion = (question) => {
    setInputMessage(question);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Status Bar */}
      <div
        className={`px-4 py-2 ${status.bg} border-b border-gray-200 flex items-center justify-between`}
      >
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${status.dot}`}></div>
          <span className={`text-sm font-medium ${status.color}`}>
            {status.text}
          </span>
        </div>
        <button
          onClick={checkBackendConnection}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          disabled={backendStatus === "checking"}
        >
          {backendStatus === "checking" ? "Checking..." : "Refresh"}
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white scrollbar-thin">
        {backendStatus === "disconnected" && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
            <p className="text-red-700 text-sm font-medium">
              ⚠️ Backend server not found
            </p>
            <div className="mt-2 text-xs text-red-600">
              <p className="mb-1">To fix this:</p>
              <code className="bg-red-100 p-2 rounded block">
                cd backend
                <br />
                python app.py
              </code>
              <p className="mt-2">
                Make sure the backend is running on port 5000
              </p>
            </div>
          </div>
        )}

        {backendStatus === "gemini_unavailable" && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg animate-fade-in">
            <p className="text-yellow-700 text-sm font-medium">
              ⚠️ AI Assistant Configuration Required
            </p>
            <div className="mt-2 text-xs text-yellow-600">
              <p>Please ensure:</p>
              <ol className="list-decimal ml-4 mt-1 space-y-1">
                <li>Google Gemini API key is set in backend/.env file</li>
                <li>
                  Run:{" "}
                  <code className="bg-yellow-100 px-1 rounded">
                    pip install google-generativeai python-dotenv
                  </code>
                </li>
                <li>Check services/gemini_service.py exists</li>
              </ol>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-4 animate-fade-in ${
              message.sender === "user" ? "text-right" : ""
            }`}
          >
            <div className="flex flex-col">
              <div
                className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.sender === "user"
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-none self-end"
                    : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-bl-none self-start"
                }`}
              >
                <div className="whitespace-pre-wrap">{message.text}</div>
              </div>
              {message.timestamp && (
                <span
                  className={`text-xs text-gray-500 mt-1 ${
                    message.sender === "user" ? "text-right" : "text-left"
                  }`}
                >
                  {message.timestamp}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="flex items-center space-x-2 mb-4">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex space-x-1">
                <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
                <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
                <div className="typing-dot w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
            </div>
          </div>
        )}

        {/* Suggested Questions */}
        {messages.length <= 2 && backendStatus === "connected" && (
          <div className="mt-6 animate-fade-in">
            <p className="text-sm text-gray-600 mb-3 font-medium">
              💡 Try asking me:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestedQuestion(question)}
                  className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 border border-blue-200"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex space-x-2 chat-input-responsive">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              backendStatus === "connected"
                ? "Ask about colleges, cutoffs, admissions..."
                : "Waiting for backend connection..."
            }
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            rows="2"
            disabled={isLoading || backendStatus !== "connected"}
          />
          <button
            onClick={handleSend}
            disabled={
              isLoading || !inputMessage.trim() || backendStatus !== "connected"
            }
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 btn-hover-effect font-semibold shadow-sm hover:shadow-md"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Thinking...
              </div>
            ) : (
              "Send"
            )}
          </button>
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-gray-500">
            Press{" "}
            <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300">
              Enter
            </kbd>{" "}
            to send • Press{" "}
            <kbd className="px-2 py-1 bg-gray-100 rounded border border-gray-300 ml-2">
              Shift + Enter
            </kbd>{" "}
            for new line
          </p>
          <div className="text-xs text-gray-500">{inputMessage.length}/500</div>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
