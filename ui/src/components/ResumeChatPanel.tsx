import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { sendResumeChatStream } from '@/api';
import { DiffModal } from '@/components/DiffModal';
import {
  Bot,
  Check,
  Copy,
  Replace,
  Send,
  Sparkles,
  Trash2,
  User,
  Wand2,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

interface ResumeChatPanelProps {
  readonly resumeText: string;
  readonly onApplyText: (text: string) => void;
}

const STARTER_CHIPS = [
  'Critique my summary',
  'What achievements am I missing?',
  'Where is my resume too vague?',
  'What ATS keywords should I add?',
  'Is my experience section weak?',
  'What skills should I prove with examples?',
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-[11px] text-text-muted hover:text-cyan transition-colors cursor-pointer shrink-0"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function extractCodeBlocks(text: string): string[] {
  const regex = /```(?:resume)?\n([\s\S]*?)\n```/g;
  const blocks: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

function ChatMessage({
  msg,
  resumeText,
  onApply,
  onWriteIt,
}: {
  msg: Message;
  resumeText: string;
  onApply: (proposed: string) => void;
  onWriteIt: () => void;
}) {
  const isUser = msg.role === 'user';
  const codeBlocks = !isUser ? extractCodeBlocks(msg.content) : [];
  const hasCodeBlock = codeBlocks.length > 0;
  const [diffOpen, setDiffOpen] = useState(false);
  const [pendingProposal, setPendingProposal] = useState('');

  const handleApplyClick = (proposed: string) => {
    setPendingProposal(proposed);
    setDiffOpen(true);
  };

  return (
    <>
      <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
        {/* Avatar */}
        <div
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
            isUser
              ? 'bg-cyan text-white'
              : 'bg-cyan-dim text-cyan border border-cyan/20'
          )}
        >
          {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
        </div>

        {/* Bubble */}
        <div className={cn('flex flex-col gap-2 max-w-[85%]', isUser ? 'items-end' : 'items-start')}>
          <div
            className={cn(
              'rounded-2xl px-4 py-3 text-sm leading-relaxed',
              isUser
                ? 'bg-cyan text-white rounded-tr-sm selection-invert'
                : 'bg-surface-elevated border border-border-subtle text-text-primary rounded-tl-sm'
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            ) : (
              <div
                className={cn(
                  'prose prose-sm max-w-none',
                  'prose-headings:text-text-primary prose-headings:font-semibold prose-headings:text-base prose-headings:mt-4 prose-headings:mb-2',
                  'prose-p:text-text-secondary prose-p:leading-relaxed prose-p:my-1.5',
                  'prose-strong:text-text-primary prose-strong:font-semibold',
                  'prose-em:text-text-secondary prose-em:italic',
                  'prose-ul:text-text-secondary prose-ol:text-text-secondary prose-ul:my-1.5 prose-ol:my-1.5',
                  'prose-li:marker:text-text-muted',
                  'prose-code:text-cyan prose-code:bg-cyan-dim prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none',
                  'prose-pre:bg-surface prose-pre:border prose-pre:border-border-subtle prose-pre:rounded-lg prose-pre:p-3 prose-pre:text-xs prose-pre:my-2',
                  'prose-blockquote:border-l-2 prose-blockquote:border-cyan prose-blockquote:pl-3 prose-blockquote:text-text-secondary prose-blockquote:italic prose-blockquote:my-2',
                  'prose-hr:border-border-subtle prose-hr:my-3',
                  'prose-a:text-cyan prose-a:no-underline hover:prose-a:underline',
                )}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.streaming ? msg.content + '▋' : msg.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Action buttons — only for completed assistant messages */}
          {!isUser && !msg.streaming && (
            <div className="flex items-center gap-3 pl-1">
              <CopyButton text={msg.content} />
              <button
                onClick={onWriteIt}
                className="flex items-center gap-1 text-[11px] text-text-muted hover:text-cyan transition-colors cursor-pointer shrink-0"
                title="Ask AI to apply these suggestions to the resume"
              >
                <Wand2 className="w-3 h-3" />
                Write it
              </button>
              {hasCodeBlock && (
                <button
                  onClick={() => handleApplyClick(codeBlocks[0])}
                  className="flex items-center gap-1 text-[11px] text-text-muted hover:text-cyan transition-colors cursor-pointer shrink-0"
                  title="Review and apply changes"
                >
                  <Replace className="w-3 h-3" />
                  Apply
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <DiffModal
        open={diffOpen}
        onOpenChange={setDiffOpen}
        currentText={resumeText}
        proposedText={pendingProposal}
        onAccept={() => onApply(pendingProposal)}
      />
    </>
  );
}

export function ResumeChatPanel({ resumeText, onApplyText }: ResumeChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appliedId, setAppliedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamingMsgRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasSentMessage = messages.some((m) => m.role === 'user');

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            "I'm your AI resume coach — and I'm going to be honest with you.\n\nI won't just rewrite your resume on command. First, I'll **critique** what's weak, then I'll **ask you targeted questions** to uncover the real details (metrics, tools, outcomes). Only after we talk it through will I rewrite.\n\nClick a highlighted weak spot in your resume, or ask me about any section. Don't expect praise — expect pressure tests.",
        },
      ]);
    }
  }, []);

  // Scroll to top of the new streaming message when it first appears
  const streamingId = messages.find((m) => m.streaming)?.id ?? null;
  useEffect(() => {
    if (streamingId && streamingMsgRef.current) {
      streamingMsgRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [streamingId]);

  // Scroll to bottom only for non-streaming updates (user sent, stream finished)
  useEffect(() => {
    const hasStreaming = messages.some((m) => m.streaming);
    if (!hasStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isLoading]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text.trim() };
    const assistantId = `a-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ]);
    setInput('');
    setIsLoading(true);

    const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();

    try {
      await sendResumeChatStream(
        history,
        (accumulated) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
          );
        },
        abortRef.current.signal
      );
      // Mark streaming done
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      );
    } catch (err) {
      const msg = (err as Error).name === 'AbortError' ? 'Response cancelled.' : `Error: ${(err as Error).message}`;
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: msg, streaming: false } : m))
      );
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const onSubmit = (e: { preventDefault(): void }) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    handleSend(input);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  const handleApply = (text: string) => {
    onApplyText(text);
    setAppliedId('flash');
    setTimeout(() => setAppliedId(null), 1500);
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          "I'm your AI resume coach — and I'm going to be honest with you.\n\nI won't just rewrite your resume on command. First, I'll **critique** what's weak, then I'll **ask you targeted questions** to uncover the real details (metrics, tools, outcomes). Only after we talk it through will I rewrite.\n\nClick a highlighted weak spot in your resume, or ask me about any section. Don't expect praise — expect pressure tests.",
      },
    ]);
  };

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') handleSend(detail);
    };
    window.addEventListener('resume-chat-prefill', handler);
    return () => window.removeEventListener('resume-chat-prefill', handler);
  }, [messages, isLoading]);

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  return (
    <div className="glass-card rounded-xl flex flex-col overflow-hidden" style={{ height: '600px' }}>
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border-subtle flex items-center gap-2.5 shrink-0 bg-surface/50">
        <div className="w-7 h-7 rounded-lg bg-cyan-dim border border-cyan/20 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-cyan" />
        </div>
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-text-primary leading-none">AI Coach</h3>
          <span className="text-[11px] text-text-muted mt-0.5">Powered by OpenRouter</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {appliedId && (
            <span className="text-[11px] font-medium text-emerald bg-emerald-glow px-2 py-0.5 rounded-full">
              Applied!
            </span>
          )}
          <button
            onClick={handleClear}
            title="Clear chat to reduce token usage"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0">
        {/* Spacer pushes messages to the bottom when there are few of them */}
        <div className="flex flex-col justify-end min-h-full p-5 gap-5">
          {messages.map((msg) => (
            <div key={msg.id} ref={msg.streaming ? streamingMsgRef : undefined}>
              <ChatMessage
                msg={msg}
                resumeText={resumeText}
                onApply={handleApply}
                onWriteIt={() => handleSend(
                  'Apply your suggestions above to my resume. Return the complete updated resume in a ```resume code block.'
                )}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Starter chips */}
      {!hasSentMessage && !isLoading && (
        <div className="px-5 pb-4 flex flex-wrap gap-2">
          {STARTER_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-border-subtle text-text-secondary bg-surface hover:text-cyan hover:border-cyan hover:bg-cyan-dim transition-all cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={onSubmit}
        className="px-4 py-3 border-t border-border-subtle flex items-end gap-3 shrink-0 bg-surface/50"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            autoResize();
          }}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ask about your resume…"
          className="flex-1 bg-surface rounded-lg border border-border-subtle px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all resize-none overflow-hidden leading-relaxed"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="w-9 h-9 rounded-lg flex items-center justify-center bg-cyan text-white hover:bg-cyan/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
