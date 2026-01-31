import { useState, useEffect, useRef } from "react";
import Markdown from "react-markdown";
import { Send, Activity, RefreshCcw, ShieldCheck, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const BACKEND_URL = 'https://health-agent-backend.bhraviteja799.workers.dev';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
};

const DISCLAIMER_MESSAGE = `
> ⚠️ **Disclaimer:** I am an AI assistant, not a medical professional. This information is for educational purposes only and is not a substitute for professional medical advice. Always consult with a qualified healthcare provider for any medical concerns.
`;

const STORAGE_KEY = 'medisense_chat_history';

function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse chat history", e);
        }
      }
    }
    return [{
      id: 'welcome',
      role: 'assistant',
      content: `# Welcome to MediSense AI 👋\n\nI can help you understand your symptoms using broad medical knowledge.\n\n${DISCLAIMER_MESSAGE}\n\n**To get started, please describe your symptoms in detail.**`
    }];
  });

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    // Quick health check
    fetch(BACKEND_URL, { method: 'GET', signal: AbortSignal.timeout(5000) }).catch(() => { });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const newMessage: Message = { id: Date.now().toString(), role: 'user', content: userText };
    setMessages(prev => [...prev, newMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();
      if (data && data.reply) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.reply
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I'm having trouble connecting to the server right now. Please try again in a moment.",
        isError: true
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Activity className="text-white w-5 h-5" />
        </div>
        <span className="font-bold text-lg text-slate-800 dark:text-slate-100">MediSense</span>
      </div>

      <div className="flex-1 px-4 py-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 mb-6 bg-white dark:bg-slate-800 shadow-sm"
          onClick={() => {
            setMessages([{
              id: Date.now().toString(),
              role: 'assistant',
              content: `# New Session\n\nHow can I help you regarding your health today?\n\n${DISCLAIMER_MESSAGE}`
            }]);
          }}
        >
          <RefreshCcw className="w-4 h-4" />
          New Chat
        </Button>

        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">Settings</h3>
        <Button variant="ghost" className="w-full justify-start gap-2 text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4" />
          Privacy & Security
        </Button>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50">
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong>Note:</strong> History is saved to your browser. Use "New Chat" to clear.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 overflow-hidden">

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-[280px] h-full shrink-0">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative min-w-0">

        {/* Mobile Header */}
        <header className="md:hidden h-14 border-b flex items-center justify-between px-4 bg-white dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-base">MediSense</span>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 scroll-smooth">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-4",
                  msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <Avatar className={cn(
                  "w-8 h-8 md:w-10 md:h-10 border shadow-sm mt-1",
                  msg.role === 'user' ? "bg-blue-600 border-blue-600" : "bg-white border-slate-200"
                )}>
                  <AvatarImage src={msg.role === 'assistant' ? "https://ui.shadcn.com/avatars/02.png" : undefined} />
                  <AvatarFallback className={msg.role === 'user' ? "bg-blue-600 text-white" : "bg-white text-slate-600"}>
                    {msg.role === 'user' ? "You" : <Activity className="w-5 h-5" />}
                  </AvatarFallback>
                </Avatar>

                <div className={cn(
                  "flex flex-col gap-1 min-w-0 max-w-[85%] md:max-w-[80%]",
                  msg.role === 'user' ? "items-end" : "items-start"
                )}>
                  {/* Name Label */}
                  <span className="text-xs text-slate-400 font-medium px-1">
                    {msg.role === 'user' ? 'You' : 'MediSense AI'}
                  </span>

                  <div className={cn(
                    "px-5 py-3.5 rounded-2xl shadow-sm text-sm md:text-base leading-relaxed break-words",
                    msg.role === 'user'
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : cn(
                        "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-sm",
                        msg.isError && "bg-red-50 border-red-200 text-red-900"
                      )
                  )}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 md:w-10 md:h-10" /> {/* Spacer for alignment */}
                <div className="flex items-center gap-1.5 p-4 bg-white border border-slate-200 rounded-2xl rounded-tl-sm shadow-sm">
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 md:pb-8">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900 transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your health concerns here..."
                className="min-h-[44px] max-h-[160px] resize-none border-0 focus-visible:ring-0 bg-transparent text-base py-2.5 px-3 shadow-none flex-1 placeholder:text-slate-500"
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isLoading || !input.trim()}
                className={cn(
                  "h-10 w-10 shrink-0 rounded-lg transition-all",
                  !input.trim() ? "bg-slate-200 text-slate-400 hover:bg-slate-200" : "bg-blue-600 hover:bg-blue-700 text-white"
                )}
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            <p className="text-center text-[10px] text-slate-400 mt-2">
              Protected by SSL. Your session is anonymous.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
