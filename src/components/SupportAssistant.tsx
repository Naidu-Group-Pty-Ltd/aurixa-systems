/**
 * Support assistant — the /support screening gateway's chat panel.
 *
 * Sits in front of the ticket form so how-do-I questions get answered from
 * the NPC dashboard User Guide before anyone raises a ticket. Two rules the
 * markup here honours everywhere:
 *
 *  - answers render ONLY through `renderAssistantText`'s structure — there is
 *    no `dangerouslySetInnerHTML` anywhere, so markup in an answer stays
 *    literal text on the screen.
 *  - the only anchors on screen come from the contract's `sections[].url`,
 *    already sanitised by `parseGuideSections`; nothing the model wrote
 *    inline can become a link.
 *
 * Conversation state lives here and nowhere else. The page keeps this
 * component mounted (hidden, when need be) across the gateway's steps, so a
 * visitor who escalates, reads the form and comes back has lost nothing.
 */

import { useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowRight, BookOpen, Loader2, Sparkles } from "lucide-react";
import { controlClass } from "./FormControls";
import {
  MAX_ASSISTANT_MESSAGE,
  MIN_ASSISTANT_MESSAGE,
  buildAskPayload,
  buildTicketPrefill,
  renderAssistantText,
  type AssistantContext,
  type AssistantTextPart,
  type AssistantTurn,
  type AssistantMode,
  type GuideSection,
  type TicketPrefill,
} from "../lib/supportAssistant";
import { askSupportAssistant, sendAssistantFeedback } from "../lib/supportAssistantClient";

const EXAMPLE_QUESTIONS = [
  "I can't change my email or username",
  "How do I generate an investment report?",
  "Where do I see my billing usage?",
];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  sections?: GuideSection[];
  mode?: AssistantMode;
  escalate?: boolean;
  escalateReason?: string | null;
};

type SupportAssistantProps = {
  /** What the page read from its URL params — passed through to the contract. */
  context: AssistantContext;
  /** The visitor needs the ticket form, with the conversation attached. */
  onEscalate: (prefill: TicketPrefill) => void;
  /** The answer solved it — the page can show its closing state. */
  onResolved: () => void;
};

export default function SupportAssistant({
  context,
  onEscalate,
  onResolved,
}: SupportAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  /** Inline soft errors: throttled and invalid-request. */
  const [notice, setNotice] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  /** True once "Yes, solved" was clicked for the latest answer. */
  const [solved, setSolved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const asTurns = (list: ChatMessage[]): AssistantTurn[] =>
    list.map((message) => ({ role: message.role, content: message.content }));

  const ask = async (raw: string) => {
    const message = raw.trim();
    if (pending || message.length < MIN_ASSISTANT_MESSAGE) return;

    setNotice("");
    setUnavailable(false);
    setSolved(false);

    const history = asTurns(messages);
    const afterQuestion: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages(afterQuestion);
    setInput("");
    setPending(true);

    const result = await askSupportAssistant(buildAskPayload(message, history, context));
    setPending(false);

    if (result.ok === true) {
      const answer: ChatMessage = {
        role: "assistant",
        content: result.answerMarkdown,
        sections: result.sections,
        mode: result.mode,
        escalate: result.escalate,
        escalateReason: result.escalateReason,
      };
      const afterAnswer = [...afterQuestion, answer];
      setMessages(afterAnswer);
      if (result.escalate === true) {
        // The chat stays visible above the form; the notice under the answer
        // says why the form just opened.
        onEscalate(buildTicketPrefill(asTurns(afterAnswer)));
      }
      return;
    }

    if (result.kind === "throttled") {
      setNotice(
        result.retryAfterSeconds
          ? `A few too many questions at once. Please try again in about ${Math.max(1, Math.ceil(result.retryAfterSeconds))} seconds.`
          : "A few too many questions at once. Please try again shortly.",
      );
      return;
    }

    if (result.kind === "invalid") {
      setNotice("That question couldn't be processed. Please rephrase it and try again.");
      return;
    }

    setUnavailable(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void ask(input);
    }
  };

  const escalateFromConversation = () => onEscalate(buildTicketPrefill(asTurns(messages)));

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastAnswer = lastMessage && lastMessage.role === "assistant" ? lastMessage : null;
  const showFeedbackRow =
    lastAnswer !== null && !pending && !solved && lastAnswer.escalate !== true;

  const handleSolved = () => {
    if (!lastAnswer) return;
    sendAssistantFeedback(true, lastAnswer.mode ?? "model", context);
    setSolved(true);
  };

  const handleNotSolved = () => {
    if (lastAnswer) sendAssistantFeedback(false, lastAnswer.mode ?? "model", context);
    escalateFromConversation();
  };

  return (
    <div className="text-left">
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[#94A3B8]/70">
        <Sparkles className="h-3.5 w-3.5 text-[#5EDDE8]" aria-hidden="true" />
        <span>Support assistant · NPC User Guide</span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
        Ask about anything in the dashboard. Most questions are answered instantly from the User
        Guide.
      </p>

      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((question) => (
            <button
              key={question}
              type="button"
              onClick={() => {
                setInput(question);
                textareaRef.current?.focus();
              }}
              className="rounded-full border border-white/15 px-3.5 py-1.5 text-[12px] font-light text-[#B6C0D4] transition-colors hover:border-[#00A8B5]/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040B16]"
            >
              {question}
            </button>
          ))}
        </div>
      )}

      {(messages.length > 0 || pending) && (
        <div
          role="log"
          aria-live="polite"
          aria-label="Conversation with the support assistant"
          className="mt-6 space-y-4"
        >
          {messages.map((message, index) =>
            message.role === "user" ? (
              <div key={index} className="flex justify-end">
                <p className="max-w-[85%] whitespace-pre-wrap rounded-xl rounded-br-none border border-[#00A8B5]/30 bg-[#00A8B5]/10 px-4 py-3 text-sm leading-relaxed text-white">
                  {message.content}
                </p>
              </div>
            ) : (
              <div key={index} className="flex justify-start">
                <div className="max-w-[85%] rounded-xl rounded-bl-none border border-white/10 bg-[#040B16]/60 px-4 py-3">
                  <AssistantAnswer content={message.content} />
                  {message.sections && message.sections.length > 0 && (
                    <GuideSections sections={message.sections} />
                  )}
                  {message.escalate === true && (
                    <EscalateNotice reason={message.escalateReason ?? null} />
                  )}
                </div>
              </div>
            ),
          )}
          {pending && (
            <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#94A3B8]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Consulting the
              User Guide&hellip;
            </p>
          )}
        </div>
      )}

      {showFeedbackRow && lastAnswer && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-[#040B16]/40 px-4 py-3">
          <span className="text-[13px] text-[#94A3B8]">Did this solve it?</span>
          <button
            type="button"
            onClick={handleSolved}
            className="rounded-sm border border-[#00A8B5]/40 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#5EDDE8] transition-colors hover:border-[#00A8B5] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040B16]"
          >
            Yes, solved
          </button>
          <button
            type="button"
            onClick={handleNotSolved}
            className="rounded-sm border border-[#C89B3C]/40 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#E9C877] transition-colors hover:border-[#C89B3C] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040B16]"
          >
            No, raise a ticket
          </button>
        </div>
      )}

      {solved && (
        <div
          role="status"
          className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#00A8B5]/35 bg-[#00A8B5]/10 px-4 py-3"
        >
          <p className="text-[13px] text-white">Great, glad the guide had the answer.</p>
          <button
            type="button"
            onClick={onResolved}
            className="rounded-sm border border-[#00A8B5]/40 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#5EDDE8] transition-colors hover:border-[#00A8B5] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040B16]"
          >
            Close
          </button>
        </div>
      )}

      {notice && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-[#C89B3C]/40 bg-[#C89B3C]/10 px-4 py-3 text-sm text-[#F2DFA8]"
        >
          {notice}
        </p>
      )}

      {unavailable && (
        <div
          role="alert"
          className="mt-5 rounded-lg border border-[#C89B3C]/40 bg-[#C89B3C]/10 px-4 py-3"
        >
          <p className="text-sm text-[#F2DFA8]">
            The assistant is unavailable right now. You can raise a ticket below.
          </p>
          <button
            type="button"
            onClick={escalateFromConversation}
            className="mt-3 inline-flex items-center gap-2 rounded-sm border border-[#C89B3C]/40 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#E9C877] transition-colors hover:border-[#C89B3C] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040B16]"
          >
            Raise a ticket <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      )}

      <form
        className="mt-6"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void ask(input);
        }}
      >
        <label htmlFor="assistant-question" className="sr-only">
          Ask the support assistant a question
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="assistant-question"
            ref={textareaRef}
            rows={Math.min(3, Math.max(1, input.split("\n").length))}
            maxLength={MAX_ASSISTANT_MESSAGE}
            value={input}
            disabled={pending}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. How do I add a second property to a comparison report?"
            className={`${controlClass(false)} resize-none`}
          />
          <button
            type="submit"
            disabled={pending || input.trim().length < MIN_ASSISTANT_MESSAGE}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-sm bg-gradient-to-r from-[#00A8B5] to-[#5EDDE8] px-5 font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[#040B16] shadow-[0_0_32px_-10px] shadow-[#00A8B5]/70 transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5EDDE8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#040B16] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
          >
            Ask <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#94A3B8]/60">
          Enter to send · Shift+Enter for a new line
        </p>
      </form>
    </div>
  );
}

/* ─── pieces ─────────────────────────────────────────────────────────────── */

/**
 * Renders an answer purely from `renderAssistantText`'s structure. Consecutive
 * list items are grouped into one list so a screen reader announces "list,
 * three items" rather than three lists.
 */
function AssistantAnswer({ content }: { content: string }) {
  const blocks = renderAssistantText(content);
  const rendered: ReactNode[] = [];
  let listItems: AssistantTextPart[][] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    rendered.push(
      <ul key={`list-${rendered.length}`} className="list-disc space-y-1 pl-5">
        {listItems.map((parts, index) => (
          <li key={index}>
            <Parts parts={parts} />
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  for (const block of blocks) {
    if (block.kind === "li") {
      listItems.push(block.parts);
      continue;
    }
    flushList();
    rendered.push(
      <p key={`p-${rendered.length}`}>
        <Parts parts={block.parts} />
      </p>,
    );
  }
  flushList();

  return <div className="space-y-2 text-sm leading-relaxed text-[#D5DCE8]">{rendered}</div>;
}

function Parts({ parts }: { parts: AssistantTextPart[] }) {
  return (
    <>
      {parts.map((part, index) =>
        part.bold ? (
          <strong key={index} className="font-semibold text-white">
            {part.text}
          </strong>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** The citations under an answer — the only place a link may come from. */
function GuideSections({ sections }: { sections: GuideSection[] }) {
  return (
    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-[#94A3B8]/70">
        <BookOpen className="h-3 w-3" aria-hidden="true" /> From the User Guide
      </p>
      <ul className="mt-2 space-y-3">
        {sections.map((section, index) => (
          <li key={section.id || `${section.url}-${index}`}>
            <p className="text-[13px] font-medium text-white">
              {section.title || "User Guide"}
              {section.section_title && (
                <span className="font-normal text-[#94A3B8]">, {section.section_title}</span>
              )}
            </p>
            {section.snippet && (
              <p className="mt-0.5 text-[12px] font-light leading-relaxed text-[#94A3B8]">
                {section.snippet}
              </p>
            )}
            <a
              href={section.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[12px] text-[#5EDDE8] underline decoration-[#00A8B5]/40 underline-offset-4 transition-colors hover:text-white"
            >
              Open guide section ↗
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Amber: the assistant itself said this needs an engineer. */
function EscalateNotice({ reason }: { reason: string | null }) {
  return (
    <div
      role="status"
      className="mt-3 rounded-lg border border-[#C89B3C]/40 bg-[#C89B3C]/10 px-3.5 py-3"
    >
      <p className="text-[13px] font-medium text-[#F2DFA8]">
        This looks like something our engineers should handle.
      </p>
      {reason && <p className="mt-1 text-[12px] font-light text-[#F2DFA8]/80">{reason}</p>}
      <p className="mt-1 text-[12px] font-light text-[#F2DFA8]/80">
        The ticket form below has been opened with this conversation attached.
      </p>
    </div>
  );
}
