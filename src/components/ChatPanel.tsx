import React, { useState, useRef, useEffect } from "react";
import { Channel, Message, User, Poll, Community } from "../types";
import { Send, Smile, Paperclip, MoreHorizontal, Globe, Trash2, Edit3, MessageSquare, AlertCircle, Sparkles, Languages, Check, X, Orbit, Volume2, Plus, UserCheck, Crown, Shield } from "lucide-react";

interface ChatPanelProps {
  currentUser: User;
  activeChannel: Channel;
  activeCommunity?: Community | null;
  communityMembers?: any[];
  messages: Message[];
  activeTypingUsers: { userId: string; username: string }[];
  onSendMessage: (text: string, attachment?: any) => Promise<void>;
  onEditMessage: (id: string, text: string) => Promise<void>;
  onDeleteMessage: (id: string) => Promise<void>;
  onToggleReaction: (id: string, emoji: string) => Promise<void>;
  onSendReply: (id: string, text: string) => Promise<void>;
  polls: Poll[];
  onCreatePoll: (question: string, options: string[]) => Promise<void>;
  onVotePoll: (pollId: string, optionIndex: number) => Promise<void>;
}

export default function ChatPanel({
  currentUser,
  activeChannel,
  activeCommunity,
  communityMembers = [],
  messages,
  activeTypingUsers,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onSendReply,
  polls,
  onCreatePoll,
  onVotePoll
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [replyingToMsg, setReplyingToMsg] = useState<Message | null>(null);

  // File drag & upload simulation states
  const [fileDragging, setFileDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // AI Tool states
  const [showSumModel, setShowSumModel] = useState(false);
  const [sumLoading, setSumLoading] = useState(false);
  const [summaryResult, setSummaryResult] = useState("");
  const [translatingMsgId, setTranslatingMsgId] = useState<string | null>(null);

  // Poll Creator modal
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  // Hover message options selector
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);

  // Keep chat bottom aligned on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTypingUsers]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() && !uploadedFile) return;

    if (replyingToMsg) {
      const formattedText = `[Ref @${replyingToMsg.userDisplayName}]: ${inputText}`;
      await onSendReply(replyingToMsg.id, formattedText);
      setReplyingToMsg(null);
    } else {
      await onSendMessage(inputText.trim(), uploadedFile || undefined);
    }

    setInputText("");
    setUploadedFile(null);
  };

  // Drag and Drop simulation triggers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setFileDragging(true);
  };

  const handleDragLeave = () => {
    setFileDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setFileDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const triggerFileManual = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    // Generate mock URL & preview representation
    const isImg = file.type.startsWith("image/");
    const isVid = file.type.startsWith("video/");
    setUploadedFile({
      name: file.name,
      url: isImg ? URL.createObjectURL(file) : "#",
      type: isImg ? "image" : isVid ? "video" : "file",
      size: (file.size / 1024).toFixed(1) + " KB"
    });
  };

  // Trigger Gemini channel summarizer
  const requestAISummary = async () => {
    setShowSumModel(true);
    setSumLoading(true);
    setSummaryResult("");

    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId: activeChannel.id })
      });
      const data = await res.json();
      setSummaryResult(data.summary || "Summary formulation empty.");
    } catch (err: any) {
      setSummaryResult("⚠️ Error compiling Gemini thread audit: " + err.message);
    } finally {
      setSumLoading(false);
    }
  };

  // Trigger Gemini Translation helper
  const translateMessage = async (msgId: string, lang: string) => {
    setTranslatingMsgId(msgId);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId, targetLang: lang })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Mutate local message translation object
      const targetMsg = messages.find(m => m.id === msgId);
      if (targetMsg) {
        if (!targetMsg.aiTranslated) targetMsg.aiTranslated = {};
        targetMsg.aiTranslated[lang] = data.translation;
      }
    } catch (err: any) {
      alert("AI translation process fault: " + err.message);
    } finally {
      setTranslatingMsgId(null);
    }
  };

  // Formulate dynamic poll dispatch
  const handleAddNewPoll = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOpts = pollOptions.filter(o => o.trim() !== "");
    if (!pollQuestion.trim() || cleanOpts.length < 2) return;

    onCreatePoll(pollQuestion.trim(), cleanOpts);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setShowPollCreator(false);
  };

  const appendOptionField = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, ""]);
    }
  };

  return (
    <div className="flex-1 flex flex-row h-full w-full items-stretch overflow-hidden">
      <div
        id="redcoad-chat-workspace"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 bg-zinc-950 flex flex-col items-stretch overflow-hidden relative select-text ${
          fileDragging ? "brightness-50 border-2 border-dashed border-red-500 rounded-lg" : ""
        }`}
      >
      {/* Drag & Drop Visual overlay shield */}
      {fileDragging && (
        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center p-6 text-center select-none z-50 animate-fade-in pointer-events-none">
          <Paperclip className="h-14 w-14 text-red-500 animate-bounce mb-3" />
          <h3 className="text-white text-lg font-bold font-sans">Drop to attach asset</h3>
          <p className="text-zinc-450 text-xs mt-1">Files automatically draft into standard REDCOAD message preview widgets.</p>
        </div>
      )}

      {/* Top Channel status bar */}
      <div className="h-14 border-b border-zinc-900 bg-zinc-900/40 px-6 flex items-center justify-between z-10 shrink-0 select-none">
        <div className="flex items-center space-x-2">
          <span className="text-zinc-500 font-bold text-lg select-none">#</span>
          <h3 className="text-white text-sm font-bold truncate leading-none">{activeChannel.name}</h3>
          
          <div className="h-4 w-[1px] bg-zinc-805 hidden sm:block" />
          <span className="text-xs text-zinc-500 max-w-sm truncate hidden sm:block">
            {activeChannel.description || "The general text log channel space representer."}
          </span>
        </div>

        {/* Global AI Action controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPollCreator(true)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg cursor-pointer flex items-center space-x-1 sm:px-4"
            title="Deploy interactive room poll"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Room Poll</span>
          </button>

          <button
            onClick={requestAISummary}
            className="px-3 py-1.5 bg-red-650/10 border border-red-900/60 hover:bg-red-950/20 text-red-400 text-xs font-extrabold rounded-lg cursor-pointer flex items-center space-x-1.5 animate-pulse select-none"
            title="Compile thread summarization via Gemini 3.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Summarize</span>
          </button>
        </div>
      </div>

      {/* Chat Messages flow log */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 no-scrollbar">
        
        {/* Welcome Channel Header Display */}
        <div className="p-4 bg-zinc-900/20 border border-zinc-900 rounded-2xl max-w-2xl select-none mb-6">
          <div className="h-12 w-12 bg-red-650/15 text-red-500 rounded-full flex items-center justify-center font-bold text-2xl mb-1.5 font-sans shadow-md">#</div>
          <h2 className="text-white text-xl font-extrabold">Welcome to #{activeChannel.name}!</h2>
          <p className="text-zinc-450 text-xs mt-1 leading-relaxed">This is the complete start of our #{activeChannel.name} category logs track. Feel free to use reactions, translations, and chat with AI bot.</p>
        </div>

        {/* Active room polls list */}
        {polls.map((pl) => {
          const totalVotes = Object.values(pl.votes).reduce((sum, vList) => sum + vList.length, 0);

          return (
            <div key={pl.id} className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl max-w-xl text-left space-y-3.5 shadow-lg animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="bg-red-950/40 border border-red-900/60 px-2 py-0.5 text-red-400 text-[9px] font-mono uppercase rounded">Active Server Poll</span>
                <span className="text-[10px] text-zinc-550 font-mono">Proposed by @{pl.creatorName}</span>
              </div>
              <h4 className="text-white text-sm font-bold leading-normal">{pl.question}</h4>
              
              <div className="space-y-2">
                {pl.options.map((opt, oIdx) => {
                  const oVotes = pl.votes[oIdx] || [];
                  const percent = totalVotes > 0 ? Math.round((oVotes.length / totalVotes) * 100) : 0;
                  const voted = oVotes.includes(currentUser.id);

                  return (
                    <button
                      key={oIdx}
                      onClick={() => onVotePoll(pl.id, oIdx)}
                      className={`w-full p-2.5 rounded-lg border text-left flex items-center justify-between relative overflow-hidden transition-all text-xs cursor-pointer group ${
                        voted 
                          ? "bg-red-950/10 border-red-900" 
                          : "bg-zinc-950 border-zinc-850 hover:border-zinc-700"
                      }`}
                    >
                      {/* Percent Fill bar background effect */}
                      <span
                        className="absolute inset-y-0 left-0 bg-red-600/10 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />

                      <span className="relative z-10 text-zinc-300 font-medium group-hover:text-white transition-colors">{opt}</span>
                      <div className="relative z-10 flex items-center space-x-2 font-mono text-[10px] text-zinc-500">
                        {voted && <UserCheck className="h-3 w-3 text-red-500" />}
                        <span>{oVotes.length} ({percent}%)</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Message bubbles array list layout */}
        {messages.map((msg) => {
          const isMe = msg.userId === currentUser.id;
          const displayTime = new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
          const isHovered = hoveredMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className="group flex items-start space-x-3.5 text-left relative p-1.5 rounded-xl hover:bg-zinc-900/20 transition-colors duration-200"
              onMouseEnter={() => setHoveredMsgId(msg.id)}
              onMouseLeave={() => setHoveredMsgId(null)}
            >
              
              {/* Profile Avatar identifier element */}
              <div className={`h-11 w-11 rounded-full shrink-0 flex items-center justify-center font-bold text-white text-sm shadow-inner relative selection-none ${msg.userAvatarColor}`}>
                {msg.userId === "user-ai-bot" ? "🤖" : msg.userDisplayName.substring(0, 2).toUpperCase()}
              </div>

              {/* Message core */}
              <div className="flex-1 space-y-1 truncate-none overflow-visible">
                <div className="flex items-center space-x-2 flex-wrap">
                  <span className={`text-xs font-bold leading-none ${msg.userId === 'user-ai-bot' ? 'text-red-500 font-extrabold' : 'text-white'}`}>
                    {msg.userDisplayName}
                  </span>
                  {activeCommunity && activeCommunity.ownerId === msg.userId && (
                    <Crown className="inline h-3 w-3 text-yellow-500 fill-yellow-500/40 shrink-0 ml-0.5" title="Server Owner" />
                  )}
                  <span className="text-[10px] font-mono text-zinc-600 select-none">
                    {displayTime}
                  </span>
                  {msg.isEdited && (
                    <span className="text-[9px] text-zinc-650 font-mono select-none" title="Message edited by author">(edited)</span>
                  )}
                  {msg.userId === "user-ai-bot" && (
                    <span className="bg-red-650/15 border border-red-900/60 text-red-500 px-1.5 py-[1.5px] text-[8px] font-mono tracking-widest uppercase font-bold rounded">AI BOT</span>
                  )}
                </div>

                {/* Body paragraph content */}
                {editingMsgId === msg.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      onEditMessage(msg.id, editText);
                      setEditingMsgId(null);
                    }}
                    className="flex space-x-2 max-w-xl pt-1"
                  >
                    <input
                      type="text"
                      className="flex-1 bg-zinc-950 border border-zinc-800 text-xs px-2.5 py-1.5 rounded text-white focus:outline-none"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <button type="submit" className="bg-red-600 hover:bg-red-500 text-white rounded p-1 h-7 text-[10px] uppercase font-bold px-2">Save</button>
                    <button type="button" onClick={() => setEditingMsgId(null)} className="bg-zinc-800 text-zinc-400 rounded p-1 h-7 text-[10px] px-2">Cancel</button>
                  </form>
                ) : (
                  <p className="text-zinc-300 text-xs leading-relaxed font-sans select-text break-words">
                    {msg.text}
                  </p>
                )}

                {/* AI Translated results banner overlay dynamically rendered */}
                {msg.aiTranslated && Object.keys(msg.aiTranslated).map(lang => (
                  <div key={lang} className="bg-zinc-900/70 border border-zinc-850 p-2.5 rounded-lg text-xs mt-2 max-w-xl text-left flex items-start space-x-2 animate-fade-in font-mono">
                    <Globe className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">AI translation ({lang}):</span>
                      <p className="text-zinc-400 mt-1 select-text leading-relaxed font-sans">{msg.aiTranslated[lang]}</p>
                    </div>
                  </div>
                ))}

                {/* File/Image Upload Simulator previews */}
                {msg.attachment && (
                  <div className="mt-2.5 border border-zinc-850/60 bg-zinc-950 p-3 rounded-lg max-w-xs animate-fade-in flex items-center space-x-3 text-left">
                    {msg.attachment.type === "image" ? (
                      <img
                        src={msg.attachment.url}
                        alt="attachment-preview"
                        className="h-14 w-14 object-cover rounded-lg bg-zinc-90 w-14 shrink-0 shadow-md border border-zinc-80"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 w-10 bg-red-650/15 rounded flex items-center justify-center shrink-0">
                        <Paperclip className="h-5 w-5 text-red-500" />
                      </div>
                    )}
                    <div className="truncate flex flex-col font-sans">
                      <span className="text-white text-xs truncate font-medium">{msg.attachment.name}</span>
                      <span className="text-[10px] text-zinc-600 mt-0.5">{msg.attachment.size}</span>
                    </div>
                  </div>
                )}

                {/* Reactions elements */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-1.5 select-none">
                    {msg.reactions.map((react, rIdx) => {
                      const userReacted = react.userIds.includes(currentUser.id);
                      return (
                        <button
                          key={rIdx}
                          onClick={() => onToggleReaction(msg.id, react.emoji)}
                          className={`px-2 py-0.5 rounded border text-[10px] font-mono flex items-center space-x-1 transition-all cursor-pointer ${
                            userReacted
                              ? "bg-red-950/20 border-red-500 text-red-400 font-bold"
                              : "bg-zinc-950 border-zinc-850 text-zinc-500 hover:border-zinc-700"
                          }`}
                        >
                          <span>{react.emoji}</span>
                          <span>{react.userIds.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Floating micro operations control card */}
              {isHovered && !editingMsgId && (
                <div className="absolute right-4 top-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 shadow-xl flex items-center space-x-2 z-10 animate-fade-in select-none">
                  {/* Reaction quickpicker triggers */}
                  {["👍", "❤️", "🔥", "🚀", "😂"].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => onToggleReaction(msg.id, emoji)}
                      className="p-1 text-xs hover:scale-110 active:scale-95 cursor-pointer hover:bg-zinc-800 rounded transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}

                  <div className="w-[1px] h-4 bg-zinc-800" />

                  {/* Actions context triggers */}
                  <button
                    onClick={() => setReplyingToMsg(msg)}
                    className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-850 cursor-pointer"
                    title="Reply / Thread message"
                  >
                    <MessageSquare className="h-4.5 w-4.5" />
                  </button>

                  <button
                    onClick={() => {
                      setEditingMsgId(msg.id);
                      setEditText(msg.text);
                    }}
                    className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-850 cursor-pointer"
                    title="Translate / Translate language"
                  >
                    <div className="relative group/lang flex items-center">
                      <Languages className="h-4 w-4" />
                      {/* Language dropdown hover picker */}
                      <div className="absolute bottom-6 right-0 bg-zinc-950 border border-zinc-800 rounded shadow-2xl p-1 space-y-1 hidden group-hover/lang:block z-30">
                        {["ES", "DE", "FR", "JA"].map((lg) => (
                          <span
                            key={lg}
                            onClick={(e) => {
                              e.stopPropagation();
                              translateMessage(msg.id, lg === "ES" ? "Spanish" : lg === "DE" ? "German" : lg === "FR" ? "French" : "Japanese");
                            }}
                            className="block px-2.5 py-1 hover:bg-zinc-900 text-[10px] text-zinc-300 hover:text-white rounded font-mono cursor-pointer"
                          >
                            To {lg}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>

                  {/* Edit Message clicker */}
                  {isMe && (
                    <button
                      onClick={() => {
                        setEditingMsgId(msg.id);
                        setEditText(msg.text);
                      }}
                      className="p-1 text-zinc-400 hover:text-emerald-500 rounded hover:bg-zinc-850 cursor-pointer"
                      title="Edit message"
                    >
                      <Edit3 className="h-4.5 w-4.5" />
                    </button>
                  )}

                  {/* Delete message option */}
                  {(isMe || currentUser.id === "user-alan" || currentUser.id === "user-ai-bot") && (
                    <button
                      onClick={() => onDeleteMessage(msg.id)}
                      className="p-1 text-zinc-400 hover:text-red-500 rounded hover:bg-zinc-850 cursor-pointer"
                      title="Delete message"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  )}
                </div>
              )}

            </div>
          );
        })}

        {/* Real-time sync writing indicators */}
        {activeTypingUsers.length > 0 && (
          <div className="flex items-center space-x-1.5 text-zinc-500 text-[10px] font-mono mt-1 pt-1 border-t border-zinc-900 select-none text-left">
            <Orbit className="h-3 w-3 text-red-500 animate-spin" />
            <span className="font-bold">{activeTypingUsers.map(u => `@${u.username}`).join(", ")}</span>
            <span> {activeTypingUsers.length === 1 ? "is inputting..." : "are writing..."}</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Reply bar context overlay */}
      {replyingToMsg && (
        <div className="bg-zinc-900/60 border-t border-zinc-850 px-6 py-2 flex items-center justify-between text-xs select-none">
          <div className="flex items-center space-x-1 truncate text-zinc-400">
            <MessageSquare className="h-3.5 w-3.5 text-red-500 shrink-0" />
            <span>Replying to <span className="font-bold text-zinc-200">@{replyingToMsg.userDisplayName}</span>: "{replyingToMsg.text.substring(0, 50)}..."</span>
          </div>
          <button
            onClick={() => setReplyingToMsg(null)}
            className="text-zinc-500 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Drafted uploaded file widget on bottom input header */}
      {uploadedFile && (
        <div className="bg-zinc-900/20 border-t border-zinc-850 px-6 py-2.5 flex items-center justify-between text-xs select-none animate-slide-up">
          <div className="flex items-center space-x-2 truncate">
            <Paperclip className="h-4 w-4 text-red-500" />
            <span className="text-zinc-300 font-mono font-bold truncate">{uploadedFile.name}</span>
            <span className="text-zinc-600 font-mono">{uploadedFile.size}</span>
          </div>
          <button
            onClick={() => setUploadedFile(null)}
            className="text-zinc-500 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Bottom Text Chat composer box on form */}
      <div className="p-4 bg-zinc-900/20 border-t border-zinc-900 select-none shrink-0">
        <form onSubmit={handleSend} className="flex space-x-2">
          {/* File input click triggers */}
          <button
            type="button"
            onClick={triggerFileManual}
            className="p-3 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-450 hover:text-white rounded-xl transition-all cursor-pointer shrink-0"
            title="Attach file payload"
          >
            <Paperclip className="h-4.5 w-4.5" />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <input
            type="text"
            className="flex-1 bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/10 font-sans"
            placeholder={`Message #${activeChannel.name}...`}
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              // Send typing ping triggers in background sync loop
              (window as any).isTypingRef = true;
            }}
          />

          <button
            type="submit"
            className="p-3 bg-red-650 hover:bg-red-550 text-white rounded-xl shadow cursor-pointer shadow-red-600/10 active:scale-95 transition-transform"
            title="Dispatch chat package"
          >
            <Send className="h-4.5 w-4.5 font-bold" />
          </button>
        </form>
      </div>

      {/* AI SUMMARIZE BOTTOM POPUP MODAL OVERLAY */}
      {showSumModel && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 select-none">
          <div className="max-w-xl w-full bg-zinc-900 border border-zinc-805 rounded-xl p-6 shadow-3xl text-left space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-red-500 animate-spin" />
                <h3 className="text-white text-base font-extrabold font-sans">Gemini 3.5 Summarizer</h3>
              </div>
              <button
                onClick={() => setShowSumModel(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-550 block">Audit Channel: #{activeChannel.name}</span>
              {sumLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2">
                  <div className="h-10 w-10 border-t-2 border-red-500 rounded-full animate-spin" />
                  <span className="text-xs text-zinc-500 font-mono">Running neural thread summarizer...</span>
                </div>
              ) : (
                <div className="text-zinc-350 leading-relaxed font-sans text-xs bg-zinc-950 p-4 rounded-xl border border-zinc-855 select-text overflow-y-auto max-h-[40vh] break-words">
                  {summaryResult}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-850">
              <button
                onClick={() => setShowSumModel(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-750 text-white rounded font-bold text-xs uppercase cursor-pointer"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POLL CREATOR DIALOG MODAL */}
      {showPollCreator && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 select-none">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-805 rounded-xl p-6 shadow-2xl text-left relative">
            <button
              onClick={() => setShowPollCreator(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-white mb-1.5">Launch Server Poll</h3>
            <p className="text-zinc-450 text-[11px] mb-4">Pose any multiple-choice question to your channel. Responses track instantly.</p>

            <form onSubmit={handleAddNewPoll} className="space-y-4">
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase font-mono tracking-wider mb-1.5">Question Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Which logo do you prefer?"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white placeholder-zinc-750 focus:outline-none focus:border-red-500 text-xs"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-zinc-500 text-[10px] uppercase font-mono tracking-wider">Option Answers</label>
                {pollOptions.map((opt, oIdx) => (
                  <input
                    key={oIdx}
                    type="text"
                    required={oIdx < 2}
                    placeholder={`Option ${oIdx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions];
                      updated[oIdx] = e.target.value;
                      setPollOptions(updated);
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-white placeholder-zinc-700 focus:outline-none focus:border-red-500 text-xs"
                  />
                ))}

                {pollOptions.length < 5 && (
                  <button
                    type="button"
                    onClick={appendOptionField}
                    className="text-xs text-red-500 hover:text-red-400 font-bold flex items-center space-x-1 cursor-pointer pt-1"
                  >
                    <span>+ Add Option</span>
                  </button>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-zinc-850 space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPollCreator(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white text-xs bg-zinc-850 hover:bg-zinc-800 rounded font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-650 hover:bg-red-550 text-white rounded font-bold text-xs uppercase shadow cursor-pointer"
                >
                  Post Poll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      </div>

      {/* Right column: Server Active Members sidebar */}
      {activeCommunity && communityMembers && communityMembers.length > 0 && (
        <div id="redcoad-server-members" className="w-56 bg-zinc-900 border-l border-zinc-950 flex flex-col shrink-0 select-none overflow-hidden h-full">
          {/* Header */}
          <div className="h-14 border-b border-zinc-950 px-4 flex items-center bg-zinc-90 w-full font-bold text-zinc-400 text-xs tracking-wider uppercase shrink-0">
            <span>Members — {communityMembers.length}</span>
          </div>

          {/* Members Scroller list */}
          <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4 no-scrollbar text-left">
            {/* Online Members section */}
            {(() => {
              const onlineM = communityMembers.filter(m => m.status && m.status !== "offline");
              return onlineM.length > 0 ? (
                <div className="space-y-1">
                  <span className="block text-[10px] text-zinc-550 font-mono uppercase tracking-wider pl-2 font-extrabold mb-1">Online — {onlineM.length}</span>
                  {onlineM.map((mObj) => {
                    const isOwner = mObj.role === "owner" || activeCommunity.ownerId === mObj.userId;
                    const isMod = mObj.role === "moderator" || mObj.role === "admin";
                    return (
                      <div key={mObj.userId} className="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-zinc-850/60 transition-colors duration-150">
                        <div className="relative shrink-0">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ${mObj.avatarColor || "bg-zinc-700"}`}>
                            {mObj.displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-zinc-950 ${
                            mObj.status === "idle" ? "bg-amber-500" : mObj.status === "dnd" ? "bg-red-500" : "bg-emerald-500"
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-zinc-200 font-bold truncate group-hover:text-white">
                              {mObj.displayName}
                            </span>
                            {isOwner && (
                              <Crown className="h-3 w-3 text-yellow-500 fill-yellow-500/40 shrink-0" title="Server Owner" />
                            )}
                            {isMod && !isOwner && (
                              <Shield className="h-3 w-3 text-red-500 fill-red-500/10 shrink-0" title="Server Staff" />
                            )}
                          </div>
                          {mObj.customStatus && (
                            <p className="text-[9px] text-zinc-500 truncate mt-0.5" title={mObj.customStatus}>
                              {mObj.customStatus}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null;
            })()}

            {/* Offline Members section */}
            {(() => {
              const offlineM = communityMembers.filter(m => !m.status || m.status === "offline");
              return offlineM.length > 0 ? (
                <div className="space-y-1 pt-2">
                  <span className="block text-[10px] text-zinc-550 font-mono uppercase tracking-wider pl-2 font-extrabold mb-1">Offline — {offlineM.length}</span>
                  {offlineM.map((mObj) => {
                    const isOwner = mObj.role === "owner" || activeCommunity.ownerId === mObj.userId;
                    const isMod = mObj.role === "moderator" || mObj.role === "admin";
                    return (
                      <div key={mObj.userId} className="flex items-center space-x-2 px-2 py-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-zinc-850/30 transition-colors duration-150">
                        <div className="relative shrink-0">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-zinc-400 text-[11px] font-bold ${mObj.avatarColor || "bg-zinc-700"}`}>
                            {mObj.displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-zinc-950 bg-zinc-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-zinc-400 font-medium truncate">
                              {mObj.displayName}
                            </span>
                            {isOwner && (
                              <Crown className="h-3 w-3 text-yellow-500 shrink-0" title="Server Owner" />
                            )}
                            {isMod && !isOwner && (
                              <Shield className="h-3 w-3 text-zinc-600 shrink-0" title="Server Staff" />
                            )}
                          </div>
                          {mObj.customStatus && (
                            <p className="text-[9px] text-zinc-650 truncate mt-0.5" title={mObj.customStatus}>
                              {mObj.customStatus}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
