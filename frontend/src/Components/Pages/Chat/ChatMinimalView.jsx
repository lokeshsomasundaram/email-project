import React, { useState, useRef } from "react";
import ChatMainArea from "./ChatMainArea";

const ChatMinimalView = ({
  selectedChat,
  setSelectedChat,
  currentUser,
  chatSocket,
  typingUsers,
  typingClientId,
  formatMessageTime,
}) => {
  const [input, setInput] = useState("");

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const setMessages = (updater) => {
    setSelectedChat((prev) => {
      if (!prev) return prev;

      const nextMessages =
        typeof updater === "function" ? updater(prev.messages || []) : updater;

      return {
        ...prev,
        messages: Array.isArray(nextMessages) ? nextMessages : prev.messages,
      };
    });
  };

  // ChatMainArea owns the typing socket events.
  const handleInputChange = (event) => {
    setInput(event.target.value);
  };

  const fileInputRef = useRef(null);

  const handleAttachClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const newFiles = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      originalName: file.name,
      type: file.type,
      size: file.size,
      file,
      status: "selected",
      previewUrl: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getTypingText = () => {
    const activeTypers = Object.values(typingUsers || {}).filter(
      (t) => t?.isTyping && String(t.user_id) !== String(currentUser?.id),
    );

    if (activeTypers.length === 0) return null;

    const names = activeTypers.map((t) => t.name || "Someone");

    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`;
    }

    return "Several people are typing...";
  };

  const typingText = getTypingText();

  const getSenderDisplayName = (message) => {
    if (!message) return "Unknown";

    const isCurrentUser =
      (message.sender_email || "").toLowerCase() ===
      (currentUser?.email || "").toLowerCase();

    if (isCurrentUser) {
      return (
        `${currentUser?.first_name || ""} ${
          currentUser?.last_name || ""
        }`.trim() ||
        currentUser?.email?.split("@")[0] ||
        "You"
      );
    }

    const fullName = `${message.sender_first_name || ""} ${
      message.sender_last_name || ""
    }`.trim();

    return (
      fullName ||
      message.sender_name ||
      message.displayName ||
      message.sender_email?.split("@")[0] ||
      "Unknown"
    );
  };

  if (!selectedChat) {
    return (
      <div className="flex items-center justify-center h-screen">
        No chat found
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-white">
      <ChatMainArea
        chatList={[selectedChat]}
        selectedChatIdx={0}
        selectedChatOverride={selectedChat}
        input={input}
        handleInputChange={handleInputChange}
        handleKeyDown={undefined}
        handleSend={undefined}
        messages={selectedChat.messages || []}
        setMessages={setMessages}
        selectedUser={
          selectedChat?.other_user ||
          selectedChat?.participant_details?.[0] ||
          selectedChat
        }
        setInput={setInput}
        currentUser={currentUser}
        getSenderDisplayName={getSenderDisplayName}
        formatMessageTime={formatMessageTime}
        typingUsers={typingUsers}
        typingText={typingText}
        chatSocket={chatSocket}
        onlineUserEmails={[]}
        typingClientId={typingClientId}
        minimalMode={true}
        uploadedFiles={uploadedFiles}
        setUploadedFiles={setUploadedFiles}
        isUploading={isUploading}
        setIsUploading={setIsUploading}
        fileInputRef={fileInputRef}
        handleAttachClick={handleAttachClick}
        handleFileChange={handleFileChange}
      />
    </div>
  );
};

export default ChatMinimalView;
