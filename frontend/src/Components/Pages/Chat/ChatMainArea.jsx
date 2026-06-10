import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import ChatMessageArea from "./ChatMessageArea/ChatMessageArea";
import {
  startCall,
  sendMessageToRoom,
  uploadChatAttachment,
  uploadMultipleChatAttachments,
  getOnlineStatus,
} from "../../../api/api";
import {
  ChatProfileSearchIcon,
  ChatAddReactionIcon,
  ChatAttachIcon,
  ChatSendIcon,
  ChatProfileCallIcon,
  ChatProfileDropdownIcon,
} from "../../../assets/icons/Icons1";

// Constants for file validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/zip",
];
const ONLINE_STATUS_REFRESH_INTERVAL = 30000; // 30 seconds

const normalizeEmail = (value) => (value || "").toString().trim().toLowerCase();
const normalizeId = (value) =>
  value === undefined || value === null ? "" : String(value).trim();
const getSenderEmail = (message) =>
  normalizeEmail(message?.sender_email || message?.sender?.email || message?.user_email);
const getSenderId = (message) =>
  normalizeId(message?.sender_id || message?.sender?.id || message?.user_id);
const isPresenceOnline = (presence) => {
  if (typeof presence !== "string") return false;
  return presence.trim().toLowerCase() !== "offline";
};
const sanitizeFileNameInput = (value) =>
  (value || "")
    .toString()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/[\r\n]+/g, " ");
const getCommittedFileName = (value, fallback = "attachment") => {
  const sanitized = sanitizeFileNameInput(value).trim();
  return sanitized || fallback || "attachment";
};
const isImageFileObject = (fileObject) =>
  (fileObject?.type || fileObject?.file?.type || "").startsWith("image/") ||
  /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(
    fileObject?.name || fileObject?.file?.name || "",
  );
// Helper function
const getUserInitials = (firstName, lastName, name, email) => {
  if (firstName && lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  if (firstName) {
    return firstName.charAt(0).toUpperCase();
  }
  if (lastName) {
    return lastName.charAt(0).toUpperCase();
  }
  if (name && name !== "Unknown User") {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }
  if (email && email !== "Unknown") {
    return email.charAt(0).toUpperCase();
  }
  return "U";
};

// Avatar component
const UserAvatar = ({
  image,
  firstName,
  lastName,
  name,
  email,
  size = "96px",
  className = "",
}) => {
  const [imageError, setImageError] = useState(false);
  const initials = getUserInitials(firstName, lastName, name, email);

  if (size === "96px") {
    if (image && !imageError) {
      return (
        <img
          src={image}
          alt={name || "User"}
          className={`w-24 h-24 rounded-full mx-auto mb-4 border-2 border-gray-300 ${className}`}
          onError={() => setImageError(true)}
          loading="lazy"
        />
      );
    }

    return (
      <div className="w-24 h-24 rounded-full mx-auto mb-4 border-2 border-gray-300 bg-gray-300 flex items-center justify-center">
        <span className="text-gray-600 text-3xl font-semibold">{initials}</span>
      </div>
    );
  }

  if (image && !imageError) {
    return (
      <img
        src={image}
        alt={name || "User"}
        className={`w-[30px] h-[30px] rounded-[50%] border-[1px] border-[#9D9D9D] ${className}`}
        onError={() => setImageError(true)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`w-[30px] h-[30px] rounded-[50%] border-[1px] border-[#9D9D9D] bg-gray-300 flex items-center justify-center ${className}`}
    >
      <span className="text-gray-600 text-xs font-medium">{initials}</span>
    </div>
  );
};

const ChatMainArea = ({
  chatList = [],
  selectedChatIdx = 0,
  handleAttachClick = () => {},
  handleFileChange = () => {},
  fileInputRef = { current: null },
  uploadedFiles = [],
  isUploading = false,
  setUploadedFiles = () => {},
  setIsUploading = () => {},
  selectedChatOverride = null,
  input = "",
  handleInputChange,
  handleKeyDown,
  handleSend,
  messages = [],
  setMessages = () => {},
  selectedUser = null,
  setInput = () => {},
  setChatList = () => {},
  setFilteredChats = null,
  setAllChatRooms = null,
  currentUser = {},
  getSenderDisplayName,
  formatMessageTime = () => "",
  typingUsers = {},
  chatSocket = null,
  onlineUserEmails = [],
  minimalMode = false,
  typingClientId = null,
}) => {
  // minimalMode = false
  // State
 
  const [uploadProgress, setUploadProgress] = useState({});
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState({});

  // Refs
  const textInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isSendingRef = useRef(false);
  const isUploadingFilesRef = useRef(false);
  const typingKeepAliveIntervalRef = useRef(null);
  const onlineStatusIntervalRef = useRef(null);
  const abortControllersRef = useRef(new Map());

  // Computed values
  const selectedChat = useMemo(() => {
    if (selectedChatOverride) {
      return selectedChatOverride;
    }

    if (
      !Array.isArray(chatList) ||
      selectedChatIdx === null ||
      selectedChatIdx === undefined
    ) {
      return null;
    }
    return selectedChatIdx >= 0 && selectedChatIdx < chatList.length
      ? chatList[selectedChatIdx]
      : null;
  }, [selectedChatOverride, chatList, selectedChatIdx]);

  // Memoized helper functions
  const getRoomId = useCallback((chat) => {
    if (!chat) return null;
    const possibleIds = [
      "id",
      "_id",
      "roomId",
      "room_id",
      "chatId",
      "roomID",
      "chat_id",
    ];
    for (const key of possibleIds) {
      if (chat[key]) return chat[key];
    }
    return null;
  }, []);

  const getOtherParticipant = useCallback(() => {
    if (!selectedChat) return null;

    const currentUserEmail = normalizeEmail(currentUser?.email);
    const currentUserId = currentUser?.id != null ? String(currentUser.id) : "";

    if (selectedChat.is_group) {
      return {
        email: null,
        name: selectedChat.name || selectedChat.displayName || "Group",
        profile_image: selectedChat.displayImage || null,
        id: null,
        first_name: "",
        last_name: "",
      };
    }

    if (selectedChat.otherParticipant) {
      const p = selectedChat.otherParticipant;
      return {
        email: p.email,
        name:
          p.name ||
          `${p.first_name || ""} ${p.last_name || ""}`.trim() ||
          p.email ||
          "Unknown User",
        profile_image: p.profile_image,
        id: p.id,
        first_name: p.first_name || "",
        last_name: p.last_name || "",
      };
    }

    if (
      selectedChat.participant_details &&
      Array.isArray(selectedChat.participant_details)
    ) {
      const other = selectedChat.participant_details.find(
        (p) =>
          normalizeEmail(p?.email) !== currentUserEmail &&
          (p?.id == null || String(p.id) !== currentUserId),
      );

      if (other) {
        return {
          email: other.email,
          name:
            `${other.first_name || ""} ${other.last_name || ""}`.trim() ||
            other.email ||
            "Unknown User",
          profile_image: other.profile_image,
          id: other.id,
          first_name: other.first_name || "",
          last_name: other.last_name || "",
        };
      }
    }

    if (
      selectedChat.otherParticipantFirstName ||
      selectedChat.otherParticipantLastName
    ) {
      const firstName = selectedChat.otherParticipantFirstName || "";
      const lastName = selectedChat.otherParticipantLastName || "";
      const name = `${firstName} ${lastName}`.trim();
      const email =
        selectedChat.otherParticipantEmail || selectedChat.displayEmail;

      return {
        email: email,
        name: name || email || "Unknown User",
        profile_image:
          selectedChat.otherParticipantImage || selectedChat.displayImage,
        id: selectedChat.otherParticipantId,
        first_name: firstName,
        last_name: lastName,
      };
    }

    if (selectedChat.participants && Array.isArray(selectedChat.participants)) {
      const otherParticipant = selectedChat.participants.find((participant) => {
        if (typeof participant === "string") {
          return normalizeEmail(participant) !== currentUserEmail;
        }

        const participantEmail = normalizeEmail(
          participant?.email || participant?.user_email,
        );
        const participantId =
          participant?.id != null ? String(participant.id) : "";
        return (
          participantEmail !== currentUserEmail &&
          (!participantId || participantId !== currentUserId)
        );
      });

      if (otherParticipant) {
        const participantEmail =
          typeof otherParticipant === "string"
            ? otherParticipant
            : otherParticipant.email || otherParticipant.user_email || "";
        const participantFirstName =
          typeof otherParticipant === "string"
            ? ""
            : otherParticipant.first_name || "";
        const participantLastName =
          typeof otherParticipant === "string"
            ? ""
            : otherParticipant.last_name || "";
        const participantName =
          typeof otherParticipant === "string"
            ? (participantEmail || "").split("@")[0] || "User"
            : `${participantFirstName} ${participantLastName}`.trim() ||
              otherParticipant.name ||
              (participantEmail || "").split("@")[0] ||
              "User";

        return {
          email: participantEmail || "Unknown",
          name: participantName,
          profile_image:
            typeof otherParticipant === "string"
              ? null
              : otherParticipant.profile_image || null,
          id:
            typeof otherParticipant === "string"
              ? null
              : otherParticipant.id || null,
          first_name: participantFirstName,
          last_name: participantLastName,
        };
      }
    }

    return {
  email:
    selectedChat?.email ||
    selectedChat?.user_email ||
    "",

  name:
    selectedChat?.name ||
    selectedChat?.group_name ||
    selectedChat?.title ||
    selectedChat?.displayName ||
    selectedChat?.sender_name ||
    `${selectedChat?.first_name || ""} ${
      selectedChat?.last_name || ""
    }`.trim() ||
    selectedChat?.email?.split("@")[0] ||
    "Chat",

  profile_image:
    selectedChat?.profile_image ||
    selectedChat?.displayImage ||
    selectedChat?.img ||
    null,

  id:
    selectedChat?.id ||
    selectedChat?.user_id ||
    null,

  first_name:
    selectedChat?.first_name || "",

  last_name:
    selectedChat?.last_name || "",
};
  }, [selectedChat, currentUser]);

  const otherParticipant = useMemo(
    () => getOtherParticipant(),
    [getOtherParticipant],
  );

  const handleDeleteMessageFromUi = useCallback(
    (messageId) => {
      if (messageId === undefined || messageId === null) return;
      setMessages((prev) =>
        prev.map((msg) => {
          if (String(msg?.id) !== String(messageId)) return msg;

          return {
            ...msg,
            is_deleted: true,
            content: "This message has been deleted",
            text: "This message has been deleted",
            attachment_url: null,
            fileUrl: null,
            fileName: null,
            isFile: false,
          };
        }),
      );
    },
    [setMessages],
  );

  const isChatSelected = useMemo(() => {
    return (
      selectedChat &&
      (selectedChat.id ||
        selectedChat._id ||
        selectedChat.name ||
        selectedChat.username)
    );
  }, [selectedChat]);

  const isUserOnline = useCallback(
    (email) => {
      if (!email) return false;
      return onlineStatus[normalizeEmail(email)] === true;
    },
    [onlineStatus],
  );

  const isEmailOnlineFromList = useCallback(
    (email) => {
      const normalized = normalizeEmail(email);
      if (!normalized) return false;
      return Array.isArray(onlineUserEmails)
        ? onlineUserEmails.some((value) => normalizeEmail(value) === normalized)
        : false;
    },
    [onlineUserEmails],
  );

  // Cleanup function for object URLs
  const cleanupObjectURLs = useCallback(() => {
    (uploadedFiles || []).forEach((file) => {
      if (file.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }
    });
  }, [uploadedFiles]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // File validation
  const validateFile = useCallback((file) => {
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File ${file.name} is too large (max 10MB)`,
      };
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return { valid: false, error: `File type ${file.type} not allowed` };
    }
    return { valid: true, error: null };
  }, []);

  // Fetch online status
  const fetchSpecificUserStatus = useCallback(
    async (userIdentifier, userEmail) => {
      const normalizedIdentifier = normalizeEmail(userIdentifier);
      if (
        !userIdentifier ||
        normalizedIdentifier === "unknown" ||
        normalizedIdentifier === "unknown user"
      )
        return;

      // Cancel any ongoing request for this user
      if (abortControllersRef.current.has(userIdentifier)) {
        abortControllersRef.current.get(userIdentifier).abort();
      }

      const abortController = new AbortController();
      abortControllersRef.current.set(userIdentifier, abortController);

      try {
        const response = await getOnlineStatus(userIdentifier, {
          signal: abortController.signal,
        });

        if (response && response.is_online !== undefined && userEmail) {
          const normalizedOnline =
            response.is_online === true ||
            response.is_online === 1 ||
            response.is_online === "1" ||
            response.is_online === "true";

          setOnlineStatus((prev) => ({
            ...prev,
            [normalizeEmail(userEmail)]:
              prev[normalizeEmail(userEmail)] === true || normalizedOnline,
          }));
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Error fetching online status:", error);
        }
      } finally {
        abortControllersRef.current.delete(userIdentifier);
      }
    },
    [],
  );

  // Effects
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      cleanupObjectURLs();
    };
  }, [cleanupObjectURLs]);

  // Cleanup typing keep-alive on unmount
  useEffect(() => {
    return () => {
      if (typingKeepAliveIntervalRef.current) {
        clearInterval(typingKeepAliveIntervalRef.current);
      }
    };
  }, []);

  // Cleanup online status interval and abort controllers on unmount
  useEffect(() => {
    return () => {
      if (onlineStatusIntervalRef.current) {
        clearInterval(onlineStatusIntervalRef.current);
      }
      // Abort all pending requests
      abortControllersRef.current.forEach((controller) => controller.abort());
      abortControllersRef.current.clear();
    };
  }, []);

  // Fetch online status for other participant
  useEffect(() => {
  if (minimalMode) return;

  if (selectedChat?.is_group) return;

    const userIdentifier = otherParticipant?.id || otherParticipant?.email;
    const userEmail = otherParticipant?.email;

    if (!userIdentifier || !userEmail) return;

    setOnlineStatus((prev) => ({
      ...prev,
      [normalizeEmail(userEmail)]: false,
    }));

    fetchSpecificUserStatus(userIdentifier, userEmail);

    // Set up interval to refresh status
    onlineStatusIntervalRef.current = setInterval(() => {
      fetchSpecificUserStatus(userIdentifier, userEmail);
    }, ONLINE_STATUS_REFRESH_INTERVAL);

    return () => {
      if (onlineStatusIntervalRef.current) {
        clearInterval(onlineStatusIntervalRef.current);
      }
    };
  }, [
    selectedChat?.is_group,
    otherParticipant?.id,
    otherParticipant?.email,
    fetchSpecificUserStatus,
  ]);

  // Fetch online status for selected user
    useEffect(() => {
  if (minimalMode) return;

  if (!selectedUser?.id && !selectedUser?.email) return;

    const userIdentifier = selectedUser.id || selectedUser.email;
    if (selectedUser?.email) {
      const knownOnline =
        isEmailOnlineFromList(selectedUser.email) ||
        selectedUser?.is_online_resolved === true ||
        selectedUser?.is_online === true ||
        isPresenceOnline(selectedUser?.current_status);

      setOnlineStatus((prev) => ({
        ...prev,
        [normalizeEmail(selectedUser.email)]: knownOnline,
      }));
    }
    fetchSpecificUserStatus(userIdentifier, selectedUser.email);
  }, [
    selectedUser?.id,
    selectedUser?.email,
    selectedUser?.is_online_resolved,
    selectedUser?.is_online,
    selectedUser?.current_status,
    fetchSpecificUserStatus,
    isEmailOnlineFromList,
  ]);

  // Header info
  const headerInfo = useMemo(() => {
    if (selectedUser) {
      const userName =
  `${selectedUser.first_name || ""} ${
    selectedUser.last_name || ""
  }`.trim() ||
  selectedUser.name ||
  selectedUser.group_name ||
  selectedUser.title ||
  selectedUser.displayName ||
  selectedUser.email?.split("@")[0];
      const isOnline =
        isEmailOnlineFromList(selectedUser.email) ||
        selectedUser?.is_online_resolved === true ||
        selectedUser?.is_online === true ||
        isPresenceOnline(selectedUser?.current_status) ||
        isUserOnline(selectedUser.email);

      return {
        name:
  userName ||
  selectedUser.name ||
  selectedUser.group_name ||
  selectedUser.title ||
  selectedUser.displayName ||
  selectedUser.email ||
  "Unknown User",
        image: selectedUser.profile_image || selectedUser.avatar || null,
        email: selectedUser.email,
        isSelectedUser: true,
        isOnline: isOnline,
        id: selectedUser.id,
        first_name: selectedUser.first_name || "",
        last_name: selectedUser.last_name || "",
      };
    } else if (selectedChat && otherParticipant) {
      const isOnline =
        isUserOnline(otherParticipant.email) ||
        isEmailOnlineFromList(otherParticipant.email);
      const displayName =
        otherParticipant.name ||
        `${otherParticipant.first_name || ""} ${otherParticipant.last_name || ""}`.trim() ||
        otherParticipant.email ||
        "Unknown User";

      return {
        name: displayName,
        image: otherParticipant.profile_image || selectedChat.img || null,
        email: otherParticipant.email,
        isSelectedUser: false,
        isOnline: isOnline,
        isGroup: !!selectedChat.is_group,
        id: otherParticipant.id,
        first_name: otherParticipant.first_name || "",
        last_name: otherParticipant.last_name || "",
      };
    }
    return null;
  }, [
    selectedUser,
    selectedChat,
    otherParticipant,
    isUserOnline,
    isEmailOnlineFromList,
  ]);

  // Typing text
  const remoteTypingText = useMemo(() => {
    const currentUserId = currentUser?.id != null ? String(currentUser.id) : "";
    const selectedRoomId = getRoomId(selectedChat);
    const activeTypingEntries = Object.entries(typingUsers || {}).filter(
      ([, value]) => {
        if (value === true) return true;
        if (value?.isTyping !== true) return false;
        if (currentUserId && String(value?.user_id || "") === currentUserId)
          return false;

        const typingRoomId = value?.room_id ?? value?.roomId;
        if (
          selectedRoomId &&
          typingRoomId &&
          String(typingRoomId) !== String(selectedRoomId)
        ) {
          return false;
        }

        return true;
      },
    );
    if (activeTypingEntries.length === 0) return null;

    const typingNames = activeTypingEntries
      .map(([id, value]) => {
        const userId = value?.user_id ?? id;
        const explicitName =
          value?.name || value?.user_name || value?.sender_name;
        if (explicitName) return explicitName;

        if (
          userId === otherParticipant?.email ||
          String(userId) === String(otherParticipant?.id)
        ) {
          return otherParticipant.name;
        }
        return "Someone";
      })
      .filter(Boolean);

    if (typingNames.length === 1) {
      return `${typingNames[0]} is typing...`;
    } else if (typingNames.length === 2) {
      return `${typingNames[0]} and ${typingNames[1]} are typing...`;
    } else if (typingNames.length > 2) {
      return "Several people are typing...";
    }
    return null;
  }, [typingUsers, currentUser?.id, otherParticipant, selectedChat, getRoomId]);

  const currentUserTypingName = useMemo(() => {
    return (
      currentUser?.fullName ||
      `${currentUser?.first_name || ""} ${currentUser?.last_name || ""}`.trim() ||
      currentUser?.email?.split("@")[0] ||
      "Someone"
    );
  }, [
    currentUser?.fullName,
    currentUser?.first_name,
    currentUser?.last_name,
    currentUser?.email,
  ]);

  const typingText = remoteTypingText;

  // Event handlers
  // const handleAttachClick = useCallback(() => {
  //   if (!isChatSelected && !selectedUser) return;
  //   if (fileInputRef.current) {
  //     fileInputRef.current.click();
  //   }
  // }, [isChatSelected, selectedUser]);

  // const handleFileChange = useCallback(
  //   (event) => {
  //     const files = Array.from(event.target.files);

  //     if (files.length === 0) return;
  //     if (!isChatSelected && !selectedUser) return;

  //     // Validate files
  //     const validFiles = [];
  //     const errors = [];

  //     for (const file of files) {
  //       const validation = validateFile(file);
  //       if (validation.valid) {
  //         validFiles.push(file);
  //       } else {
  //         errors.push(validation.error);
  //       }
  //     }

  //     // Show errors to user
  //     if (errors.length > 0) {
  //       alert(errors.join("\n"));
  //     }

  //     if (validFiles.length === 0) return;

  //     const roomId = selectedChat ? getRoomId(selectedChat) : null;

  //     validFiles.forEach((file, index) => {
  //       const fileId = `${Date.now()}-${Math.random()}-${index}`;
  //       const isImage = file.type.startsWith("image/");
  //       const previewUrl = isImage ? URL.createObjectURL(file) : null;

  //       const fileObject = {
  //         id: fileId,
  //         name: file.name,
  //         originalName: file.name,
  //         type: file.type,
  //         size: file.size,
  //         status: "selected",
  //         roomId: roomId || "local-demo",
  //         file: file,
  //         previewUrl,
  //         progress: 0,
  //       };

  //       setUploadedFiles((prev) => [...prev, fileObject]);
  //     });

  //     // Clear file input
  //     setTimeout(() => {
  //       if (fileInputRef.current) {
  //         fileInputRef.current.value = "";
  //       }
  //       if (textInputRef.current) {
  //         textInputRef.current.focus();
  //       }
  //     }, 100);
  //   },
  //   [isChatSelected, selectedUser, selectedChat, getRoomId, validateFile],
  // );

  const handleRemoveFile = useCallback((fileId) => {
    setUploadedFiles((prev) => {
      const removedFile = prev.find((f) => f.id === fileId);
      if (removedFile?.previewUrl) {
        URL.revokeObjectURL(removedFile.previewUrl);
      }
      return prev.filter((file) => file.id !== fileId);
    });
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  }, []);

  const handleCallClick = useCallback(async () => {
    if (!isChatSelected) return;
    const roomId = getRoomId(selectedChat);
    if (!roomId) return;
    try {
      await startCall(roomId);
    } catch (error) {
      console.error("Call failed:", error);
      alert("Failed to start call. Please try again.");
    }
  }, [isChatSelected, selectedChat, getRoomId]);

  const uploadSingleFile = useCallback(async (fileObject, roomId, content = '') => {
    const abortController = new AbortController();
    const uploadName = getCommittedFileName(
      fileObject.name,
      fileObject.originalName || fileObject.file?.name || "attachment",
    );

    try {
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileObject.id
            ? { ...f, name: uploadName, status: "uploading" }
            : f,
        ),
      );

      const response = await uploadChatAttachment(
        roomId,
        fileObject.file,
        content,
        (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );

            setUploadProgress((prev) => ({
              ...prev,
              [fileObject.id]: percentCompleted,
            }));
          }
        },
        {
          signal: abortController.signal,
          filename: uploadName,
        },
      );

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === fileObject.id
            ? {
                ...f,
                name: response?.filename || uploadName,
                status: "uploaded",
                url: response?.url,
                serverResponse: response,
              }
            : f,
        ),
      );

      return response;
    } catch (error) {
      if (error.name !== "AbortError") {
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === fileObject.id
              ? { ...f, status: "failed", error: error.message }
              : f,
          ),
        );
      }
      throw error;
    }
  }, []);

  

const handleFileUpload = useCallback(async (messageText = "") => {
  if (
    isUploadingFilesRef.current ||
    uploadedFiles.length === 0 ||
    !isChatSelected
  ) {
    return;
  }

  const roomId = getRoomId(selectedChat);
  if (!roomId) return;

  isUploadingFilesRef.current = true;
  setIsUploading(true);

  try {
    for (const fileObject of uploadedFiles) {
      if (
        fileObject.status === "selected" ||
        fileObject.status === "failed"
      ) {
        const response = await uploadSingleFile(
  fileObject,
  roomId,
  messageText
);

const fileUrl =
  response?.attachment_url ||
  response?.file_url ||
  response?.url ||
  response?.attachment;

if (response && fileUrl) {
  const tempId = `temp-file-${Date.now()}-${Math.random()}`;

  setMessages((prev) => [
    ...prev,
    {
      id: response.id || tempId,
      content: messageText,
      attachment_url: fileUrl,
      fileUrl: fileUrl,
      attachment: fileUrl,
      fileName: response.filename || fileObject.name,
      filename: response.filename || fileObject.name,
      isFile: true,
      sender_email: currentUser.email,
      sender_first_name: currentUser.first_name || "",
      sender_last_name: currentUser.last_name || "",
      timestamp: response.timestamp || new Date().toISOString(),
      fromMe: true,
      status: "sent",
      displayName: "You",
      formattedTime: formatMessageTime(
        response.timestamp || new Date().toISOString()
      ),
    },
  ]);
}
      }
    }

    if (setInput) setInput("");

    setTimeout(() => {
      setUploadedFiles((prev) => {
        const filtered = prev.filter(
          (f) => f.status !== "uploaded"
        );

        prev.forEach((f) => {
          if (
            f.status === "uploaded" &&
            f.previewUrl
          ) {
            URL.revokeObjectURL(f.previewUrl);
          }
        });

        return filtered;
      });

      setUploadProgress({});
      setIsUploading(false);
    }, 2000);
  } catch (error) {
    console.error("File upload failed:", error);
    setIsUploading(false);
  } finally {
    isUploadingFilesRef.current = false;
  }
}, [
  uploadedFiles,
  isChatSelected,
  selectedChat,
  getRoomId,
  setInput,
  uploadSingleFile,
  currentUser,
  formatMessageTime,
  setMessages,
]);


/*
const handleSendClickLegacy = async () => {
  // Do nothing if both text and attachments are empty
  if (!input.trim() && uploadedFiles.length === 0) {
    return;
  }

  const roomId = getRoomId(selectedChat);
  if (!roomId) return;

     const hasFiles = uploadedFiles.length > 0;
  const hasText = !!input?.trim();
 
  if (!hasFiles && !hasText) return;

   isSendingRef.current = true;
   setIsUploading(true);
   let tempId=null;
   try {
    // 1. Upload files first (if any)
    // 1. Upload files first (if any)
    if (hasFiles) {
      const textToAttach = hasText ? input.trim() : '';
      const filesToUpload = uploadedFiles
        .filter((fileObject) => fileObject.status === 'selected' || fileObject.status === 'failed')
        .map((fileObject) => ({
          ...fileObject,
          name: getCommittedFileName(
            fileObject.name,
            fileObject.originalName || fileObject.file?.name || "attachment",
          ),
        }));

      if (filesToUpload.length > 0) {
        setUploadedFiles((prev) =>
          prev.map((fileObject) =>
            filesToUpload.some((fileToUpload) => fileToUpload.id === fileObject.id)
              ? { ...fileObject, status: "uploading" }
              : fileObject,
          ),
        );

        const response = await uploadMultipleChatAttachments(
          roomId,
          filesToUpload,
          textToAttach,
        );

        const timestamp = response?.timestamp || new Date().toISOString();
        setMessages(prev => [...prev, {
          id: response?.id || `temp-file-${Date.now()}-${Math.random()}`,
          content: response?.content ?? textToAttach,
          attachment_url: response?.attachment_url,
          fileUrl: response?.attachment_url,
          fileName: response?.filename,
          filename: response?.filename,
          attachments: response?.attachments || [],
          sender_email: response?.sender_email || currentUser.email,
          sender_first_name: response?.sender_first_name || currentUser.first_name || '',
          sender_last_name: response?.sender_last_name || currentUser.last_name || '',
          timestamp,
          fromMe: true,
          status: 'sent',
          displayName: 'You',
          formattedTime: formatMessageTime(timestamp)
        }]);

        setUploadedFiles((prev) =>
          prev.map((fileObject) =>
            filesToUpload.some((fileToUpload) => fileToUpload.id === fileObject.id)
              ? { ...fileObject, status: "uploaded" }
              : fileObject,
          ),
        );
      }

      for (const fileObject of []) {
        if (fileObject.status === 'selected' || fileObject.status === 'failed') {
          const response = await uploadSingleFile(fileObject, roomId, textToAttach);
          if (response && response.url) {
            const tempId = `temp-file-${Date.now()}-${Math.random()}`;
            setMessages(prev => [...prev, {
              id: tempId,
              content: textToAttach || `📎 ${response.filename || fileObject.name}`,
              fileUrl: response.url,
              fileName: response.filename || fileObject.name,
              sender_email: currentUser.email,
              sender_first_name: currentUser.first_name || '',
              sender_last_name: currentUser.last_name || '',
              timestamp: response.timestamp || new Date().toISOString(),
              fromMe: true,
              status: 'sent',
              displayName: 'You',
              formattedTime: formatMessageTime(response.timestamp || new Date().toISOString())
            }]);
          }
        }
      }

      setUploadedFiles(prev => {
        prev.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
        return [];
      });
      setUploadProgress({});
      if (setInput) setInput("");  // ← clear text, it was sent with the file
    }

    // 2. Send text ONLY if there are no files (files already carry the text above)
    if (hasText && !hasFiles) {
      const messageContent = input;
      const tempId = `temp-${Date.now()}-${Math.random()}`;

      const optimisticMessage = {
        id: tempId,
        content: messageContent,
        sender_email: currentUser.email,
        sender_first_name: currentUser.first_name || "",
        sender_last_name: currentUser.last_name || "",
        timestamp: new Date().toISOString(),
        fromMe: true,
        status: "sending",
        displayName: "You",
        formattedTime: formatMessageTime(new Date().toISOString()),
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      if (setInput) setInput("");

      const response = await sendMessageToRoom(roomId, {
        content: messageContent,
      });
    }

    // Clear input and attachments only after successful send
    setInput("");
    setUploadedFiles([]);
  } catch (error) {
    console.error("Failed to send message:", error);
  } finally {
    isSendingRef.current = false;
    setIsUploading(false);
    requestAnimationFrame(() => {
      textInputRef.current?.focus();
    });
  }
};


*/
const handleSendClick = async () => {
  if (!input.trim() && uploadedFiles.length === 0) return;

  const roomId = getRoomId(selectedChat);
  if (!roomId) return;

  const hasFiles = uploadedFiles.length > 0;
  const hasText = !!input?.trim();
  if (!hasFiles && !hasText) return;

  isSendingRef.current = true;
  setIsUploading(true);

  try {
    if (hasFiles) {
      const textToAttach = hasText ? input.trim() : "";
      const filesToUpload = uploadedFiles
        .filter((fileObject) => fileObject.status === "selected" || fileObject.status === "failed")
        .map((fileObject) => ({
          ...fileObject,
          name: getCommittedFileName(
            fileObject.name,
            fileObject.originalName || fileObject.file?.name || "attachment",
          ),
        }));

      if (filesToUpload.length > 0) {
        const uploadGroups = [
          { files: filesToUpload, content: textToAttach, hideTimestamp: false },
        ].filter((group) => group.files.length > 0);

        setUploadedFiles((prev) =>
          prev.map((fileObject) =>
            filesToUpload.some((fileToUpload) => fileToUpload.id === fileObject.id)
              ? { ...fileObject, status: "uploading" }
              : fileObject,
          ),
        );

        const attachmentBatchId = `attachment-batch-${Date.now()}-${Math.random()}`;
        const sentMessages = [];

        for (const group of uploadGroups) {
          const response = await uploadMultipleChatAttachments(roomId, group.files, group.content);
          const timestamp = response?.timestamp || new Date().toISOString();

          sentMessages.push({
            id: response?.id || `temp-file-${Date.now()}-${Math.random()}`,
            content: response?.content ?? group.content,
            attachment_url: response?.attachment_url,
            fileUrl: response?.attachment_url,
            fileName: response?.filename,
            filename: response?.filename,
            attachments: response?.attachments || [],
            sender_email: response?.sender_email || currentUser.email,
            sender_first_name: response?.sender_first_name || currentUser.first_name || "",
            sender_last_name: response?.sender_last_name || currentUser.last_name || "",
            
            timestamp,
            fromMe: true,
            status: "sent",
            displayName: "You",
            formattedTime: formatMessageTime(timestamp),
            attachmentBatchId,
            hideTimestamp: group.hideTimestamp,
          });
        }

        if (sentMessages.length > 0) {
          setMessages((prev) => {
            const nextMessages = [...prev];

            sentMessages.forEach((sentMessage) => {
              const sentId =
                sentMessage.id !== undefined && sentMessage.id !== null
                  ? String(sentMessage.id)
                  : "";
              const sentAttachmentKey = (sentMessage.attachments || [])
                .map(
                  (attachment) =>
                    `${attachment.filename || ""}:${attachment.url || ""}`,
                )
                .join("|");

              const existingIndex = nextMessages.findIndex((message) => {
                const messageId =
                  message.id !== undefined && message.id !== null
                    ? String(message.id)
                    : "";
                if (sentId && messageId === sentId) return true;

                const messageAttachmentKey = (message.attachments || [])
                  .map(
                    (attachment) =>
                      `${attachment.filename || ""}:${attachment.url || ""}`,
                  )
                  .join("|");

                return (
                  sentAttachmentKey &&
                  messageAttachmentKey === sentAttachmentKey &&
                  message.content === sentMessage.content &&
                  message.fromMe === true
                );
              });

              if (existingIndex >= 0) {
                nextMessages[existingIndex] = {
                  ...nextMessages[existingIndex],
                  ...sentMessage,
                  fromMe: true,
                  displayName: "You",
                };
              } else {
                nextMessages.push(sentMessage);
              }
            });

            return nextMessages;
          });
        }
      }

      setUploadedFiles((prev) => {
        prev.forEach((fileObject) => {
          if (fileObject.previewUrl) URL.revokeObjectURL(fileObject.previewUrl);
        });
        return [];
      });
      setUploadProgress({});
      if (setInput) setInput("");
    }

    if (hasText && !hasFiles) {
  const messageContent = input;
  const sentAt = new Date().toISOString();

  const tempId = `temp-${Date.now()}-${Math.random()}`;

  setMessages((prev) => [
    ...prev,
    {
      id: tempId,
      client_temp_id: tempId,

      content: messageContent,

      sender_email: currentUser.email,

      sender_first_name:
        currentUser.first_name || "",

      sender_last_name:
        currentUser.last_name || "",

      sender_name:
        `${currentUser.first_name || ""} ${
          currentUser.last_name || ""
        }`.trim() || currentUser.email,

      timestamp: sentAt,

      fromMe: true,

      status: "sending",

      displayName: "You",

      formattedTime: formatMessageTime(sentAt),
    },
  ]);

  if (setInput) setInput("");

  const response = await sendMessageToRoom(roomId, {
    content: messageContent,
  });

 setMessages((prev) => {
  const updatedMessages = prev.map((msg) =>
    msg.client_temp_id === tempId
      ? {
          ...msg,
          ...response,

          sender_email:
            response?.sender_email || msg.sender_email,

          sender_first_name:
            response?.sender_first_name || msg.sender_first_name,

          sender_last_name:
            response?.sender_last_name || msg.sender_last_name,

          sender_name:
            response?.sender_name || msg.sender_name,

          fromMe: true,

          status: "sent",

          id: response?.id || msg.id,
        }
      : msg
  );

  // REMOVE DUPLICATES
  return updatedMessages.filter(
    (message, index, self) =>
      index ===
      self.findIndex(
        (m) =>
          String(m.id) === String(message.id) ||
          (
            m.content === message.content &&
            m.timestamp === message.timestamp
          )
      )
  );
});
}

    setInput("");
    setUploadedFiles([]);
  } catch (error) {
    console.error("Failed to send message:", error);
  } finally {
    isSendingRef.current = false;
    setIsUploading(false);
    requestAnimationFrame(() => {
      textInputRef.current?.focus();
    });
  }
};


  const handleKeyDownHandler = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (
          (selectedChat || selectedUser) &&
          !isSendingRef.current &&
          !isUploading
        ) {
          handleSendClick();
        }
      } else if (handleKeyDown) {
        handleKeyDown(e);
      }
    },
    [selectedChat, selectedUser, isUploading, handleSendClick, handleKeyDown],
  );

  const sendTypingStatus = useCallback(
    (isTypingActive) => {
      if (
        !chatSocket ||
        chatSocket.readyState !== WebSocket.OPEN ||
        !selectedChat ||
        !currentUser?.id
      )
        return;

      chatSocket.send(
        JSON.stringify({
          type: "typing",
          user_id: currentUser.id,
          user_name: currentUserTypingName,
          sender_email: currentUser.email,
          room_id: getRoomId(selectedChat),
          is_typing: isTypingActive,
          client_id: typingClientId,
        }),
      );
    },
    [
      chatSocket,
      selectedChat,
      currentUser?.id,
      currentUser?.email,
      currentUserTypingName,
      getRoomId,
      typingClientId,
    ],
  );

  useEffect(() => {
    if (!isInputFocused) return undefined;

    sendTypingStatus(true);
    if (typingKeepAliveIntervalRef.current) {
      clearInterval(typingKeepAliveIntervalRef.current);
    }

    typingKeepAliveIntervalRef.current = setInterval(() => {
      sendTypingStatus(true);
    }, 3000);

    return () => {
      if (typingKeepAliveIntervalRef.current) {
        clearInterval(typingKeepAliveIntervalRef.current);
        typingKeepAliveIntervalRef.current = null;
      }
      sendTypingStatus(false);
    };
  }, [isInputFocused, sendTypingStatus]);

  const handleInputFocusHandler = useCallback(() => {
    setIsInputFocused(true);
  }, []);

  const handleInputBlurHandler = useCallback(() => {
    setIsInputFocused(false);
  }, []);

  const handleInputChangeHandler = useCallback(
  (e) => {
    if (!isInputFocused) {
      setIsInputFocused(true);
    }

    if (handleInputChange) {
      handleInputChange(e);
    }
  },
  [isInputFocused, handleInputChange]
);

  const isMessageFromCurrentUser = useCallback(
    (message) => {
      if (!message || !currentUser) return false;
      if (message.fromMe === true || message.is_own_message === true) return true;

      const senderEmail = getSenderEmail(message);
      const userEmail = normalizeEmail(currentUser.email || currentUser.user_email);
      const senderId = getSenderId(message);
      const userId = normalizeId(currentUser.id || currentUser.user_id);

      return (
        (senderEmail && userEmail && senderEmail === userEmail) ||
        (senderId && userId && senderId === userId)
      );
    },
    [currentUser],
  );

  const formatMessageDate = useCallback((timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      } else {
        return date.toLocaleDateString([], {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
    } catch {
      return "";
    }
  }, []);

  const groupMessagesByDate = useCallback(() => {
    const groups = {};
    messages.forEach((message) => {
      const date = formatMessageDate(message.timestamp);
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
    });
    return groups;
  }, [messages, formatMessageDate]);

  // Render empty state
  if (!headerInfo) {
    return (
      <div className="flex flex-col mt-[25%] flex-1 items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-lg mb-2">Welcome to Chats</p>
          <p className="text-sm">
            Select a conversation or search for users to start chatting
          </p>
        </div>
      </div>
    );
  }

  // Render selected user (no chat history)
  if (selectedUser && !selectedChat) {
    return (
      <div
        className="flex flex-col flex-1 w-full h-screen min-h-0 border-l border-r"
        style={{ borderLeftColor: "#E2E2E2", borderRightColor: "#E2E2E2" }}
      >
        <div className="flex flex-row items-center justify-between w-full h-[64px] shrink-0 bg-[#040B23] px-[25px]">
          <div className="flex flex-row w-full h-[30px] gap-[10px]">
            <UserAvatar
              image={headerInfo.image}
              firstName={headerInfo.first_name}
              lastName={headerInfo.last_name}
              name={headerInfo.name}
              email={headerInfo.email}
              size="30px"
            />
            <div className="flex flex-col justify-center w-[200px] h-[30px]">
              <span className="inter-bold text-[12px] tracking-[0.07em] text-white whitespace-nowrap">
                {headerInfo.name}
              </span>
              <div className="flex items-center gap-1 mt-1">
                <span
                  className={`w-2 h-2 rounded-full ${headerInfo.isOnline ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}
                />
                <span
                  className={`text-[8px] ${headerInfo.isOnline ? "text-green-400" : "text-gray-500"}`}
                >
                  {headerInfo.isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-row items-center justify-between gap-[15px] w-auto h-[20px]">
            <button
              onClick={handleCallClick}
              disabled={!selectedUser}
              className="cursor-pointer focus:outline-none hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              title="Start call"
            >
              <ChatProfileCallIcon />
            </button>
            <button
              className="cursor-pointer focus:outline-none hover:opacity-80 transition-opacity"
              title="More options"
            >
              <ChatProfileDropdownIcon />
            </button>
            <ChatProfileSearchIcon />
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex items-center justify-center flex-1 min-h-0 overflow-y-auto px-4">
            <div className="text-center">
              <UserAvatar
                image={selectedUser.profile_image || selectedUser.avatar}
                firstName={selectedUser.first_name}
                lastName={selectedUser.last_name}
                name={selectedUser.first_name}
                email={selectedUser.email}
                size="96px"
              />
              <div className="text-gray-800 text-xl font-semibold mb-2">
                {selectedUser.first_name} {selectedUser.last_name}
              </div>
              <div className="text-gray-500 text-sm mb-2">
                {selectedUser.email}
              </div>
              <div className="flex items-center justify-center gap-2 mb-4">
                <span
                  className={`w-3 h-3 rounded-full ${headerInfo.isOnline ? "bg-green-500 animate-pulse" : "bg-gray-500"}`}
                />
                <span
                  className={`text-sm ${headerInfo.isOnline ? "text-green-500" : "text-gray-500"}`}
                >
                  {headerInfo.isOnline ? "Online" : "Offline"}
                </span>
              </div>
              <div className="text-gray-400 text-sm mt-4">
                No chat history yet. Start a conversation by sending a message
                below!
              </div>
            </div>
          </div>

          <div className="h-[24px] shrink-0 flex items-center px-6">
            {typingText && (
              <span className="text-sm text-gray-500 italic">{typingText}</span>
            )}
          </div>

          <div className="shrink-0 pt-4 pb-6 px-4">
            <div className="w-full h-[52px] rounded-lg p-[14px] bg-[#F4F4F4]">
              <div className="flex items-center h-full">
                <button
                  onClick={handleAttachClick}
                  disabled={isUploading}
                  className={`mr-2 focus:outline-none ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"}`}
                  title="Attach file"
                >
                  <ChatAttachIcon />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.txt,.zip"
                  disabled={isUploading}
                />
                <input
                  className="flex-1 bg-transparent outline-none text-sm px-2 disabled:opacity-50"
                  type="text"
                  placeholder="Type a message..."
                  value={input || ""}
                  onChange={handleInputChangeHandler}
                  onKeyDown={handleKeyDownHandler}
                  onFocus={handleInputFocusHandler}
                  onBlur={handleInputBlurHandler}
                  disabled={isUploading}
                />
                <button
                  onClick={handleSendClick}
                  disabled={
                    (!input?.trim() && uploadedFiles.length === 0) ||
                    isUploading ||
                    isSendingRef.current
                  }
                  className={`focus:outline-none ${(!input?.trim() && uploadedFiles.length === 0) || isUploading || isSendingRef.current ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:opacity-80"}`}
                  title="Send message"
                >
                  <ChatSendIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main chat area
  return (
    <ChatMessageArea
      headerInfo={headerInfo}
      typingText={typingText}
      uploadedFiles={uploadedFiles}
      uploadProgress={uploadProgress}
      handleRemoveFile={handleRemoveFile}
      handleFileUpload={handleFileUpload}
      isUploading={isUploading}
      selectedChat={selectedChat}
      messages={messages}
      groupMessagesByDate={groupMessagesByDate}
      isMessageFromCurrentUser={isMessageFromCurrentUser}
      getSenderDisplayName={getSenderDisplayName}
      handleAttachClick={handleAttachClick}
      fileInputRef={fileInputRef}
      handleFileChange={handleFileChange}
      textInputRef={textInputRef}
      input={input}
      handleInputChangeHandler={handleInputChangeHandler}
      handleKeyDownHandler={handleKeyDownHandler}
      handleInputFocusHandler={handleInputFocusHandler}
      handleInputBlurHandler={handleInputBlurHandler}
      handleSendClick={handleSendClick}
      setInput={setInput}
      currentUser={currentUser}
      formatMessageTime={formatMessageTime}
      messagesEndRef={messagesEndRef}
      ChatAddReactionIcon={ChatAddReactionIcon}
      ChatAttachIcon={ChatAttachIcon}
      ChatSendIcon={ChatSendIcon}
      isSendingRef={isSendingRef}
      onDeleteMessage={handleDeleteMessageFromUi}
      minimalMode={minimalMode}
      setMessages={setMessages}
      setChatList={setChatList}
      setFilteredChats={setFilteredChats}
      setAllChatRooms={setAllChatRooms}
    />
  );
};

export default ChatMainArea;
