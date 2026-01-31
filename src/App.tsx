import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { Send, Activity, CheckCircle2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BACKEND_URL = 'https://health-agent-backend.bhraviteja799.workers.dev';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'normal' | 'error' | 'welcome';
};

type ConnectionStatus = 'checking' | 'online' | 'error' | 'offline';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initial setup
  useEffect(() => {
    checkBackendHealth();
    addWelcomeMessage();

    // Check health periodically
    const interval = setInterval(() => {
      if (navigator.onLine) checkBackendHealth();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    if (!isLoading) {
      textareaRef.current?.focus();
    }
  }, [isLoading]);

  const checkBackendHealth = async () => {
    setConnectionStatus('checking');
    try {
      const response = await fetch(BACKEND_URL, {
        method: 'GET',
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        setConnectionStatus('online');
      } else {
        setConnectionStatus('error');
      }
    } catch (error) {
      console.error("Health check failed:", error);
      setConnectionStatus('offline');
    }
  };

  const addWelcomeMessage = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: `# Welcome to your AI Health Symptom Checker! 👋\n\nI am here to help you understand your symptoms using up-to-date information from the web.\n\n> ⚠️ **Disclaimer:** I am an AI assistant, not a medical professional. This information is for educational purposes only and is not a substitute for professional medical advice. Always consult with a qualified healthcare provider for any medical concerns.\n\n**To get started, please describe your symptoms in detail below.**`,
      type: 'welcome'
    }]);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { id: Date.now().toString(), role: 'user', content: userMessage }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();

      if (data && data.reply) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.reply
        }]);
      } else {
        throw new Error('Invalid response format from backend.');
      }
    } catch (error: any) {
      console.error("Request failed:", error);
      setConnectionStatus('error');
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `**🚨 Apologies, I was unable to get a response.**\n\nThere seems to be a connection issue. Please check your internet and try again.\n\n*Details: ${error.message}*`,
        type: 'error'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'error': return 'bg-red-500';
      case 'offline': return 'bg-red-500';
      case 'checking': return 'bg-amber-500';
      default: return 'bg-slate-400';
    }
  };

  const getStatusText = (status: ConnectionStatus) => {
    switch (status) {
      case 'online': return 'Connected';
      case 'error': return 'Backend Error';
      case 'offline': return 'Offline';
      case 'checking': return 'Checking...';
      default: return 'Unknown';
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Header */}
      <header className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-10 px-6 py-4 flex flex-col items-center justify-center shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-6 h-6 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            AI Health Symptom Checker
          </h1>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground font-medium hidden sm:block">
          Personalized health insights powered by advanced AI
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          <div className={cn("w-2 h-2 rounded-full animate-pulse", getStatusColor(connectionStatus))} />
          <span className="text-muted-foreground">{getStatusText(connectionStatus)}</span>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
            >
              <Card className={cn(
                "max-w-[85%] md:max-w-[80%] p-4 shadow-sm border-0",
                msg.role === 'user'
                  ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                  : cn(
                    "rounded-2xl rounded-tl-sm",
                    msg.type === 'error' ? "bg-destructive/10 text-destructive-foreground border-destructive/20 border" :
                      msg.type === 'welcome' ? "bg-blue-50/80 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 border" :
                        "bg-card text-card-foreground border"
                  )
              )}>
                <div className={cn("prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed",
                  msg.role === 'user' ? "text-primary-foreground" : "text-card-foreground"
                )}>
                  {msg.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <Markdown>{msg.content}</Markdown>
                  )}
                </div>
              </Card>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start w-full animate-in fade-in">
              <Card className="bg-card border p-4 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.32s]"></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:-0.16s]"></div>
                    <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">Analyzing...</span>
                </div>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Footer Input Area */}
      <footer className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4 pb-6 md:pb-8">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="relative flex items-end gap-3 bg-muted/30 p-2 rounded-2xl border focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your symptoms in detail..."
              className="min-h-[50px] max-h-[150px] resize-none border-0 focus-visible:ring-0 bg-transparent text-base p-3 shadow-none flex-1"
              rows={1}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="h-10 w-10 shrink-0 rounded-xl mb-1 mr-1 transition-all"
            >
              <Send className="w-5 h-5" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
          <div className="text-center mt-3 text-xs text-muted-foreground flex items-center justify-center gap-4">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Secure & Private</span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:flex items-center gap-1"><RotateCw className="w-3 h-3" /> Updated Daily</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
