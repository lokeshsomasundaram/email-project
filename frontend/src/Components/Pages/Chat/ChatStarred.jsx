import React, { useEffect, useState, useMemo } from "react";
import { getStarredMessages, getRoomMessages } from "../../../api/api";
import ChatMessageBubble from "./ChatMessageBubble";
import {
  isImageAttachmentMessage,
  buildMessageRenderItems,
  isImageUrl,
  resolveAttachmentUrl,
  getAttachmentDisplayName,
} from "./ChatMessageArea/ChatMessageArea";

// Pastel and dark color functions (copied from ChatMessageArea.jsx)
function stringToPastelColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 85%)`;
}
function stringToDarkColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 25%)`;
}

const ChatStarred = ({ onRoomSelect }) => {
  const [starredMessages, setStarredMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [roomMessages, setRoomMessages] = useState([]);
  const [isRoomLoading, setIsRoomLoading] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [chatRooms, setChatRooms] = useState([]);

  // Get current user email
  useEffect(() => {
    const email = sessionStorage.getItem("user_email");
    if (email) {
      setCurrentUserEmail(email.toLowerCase());
    }
  }, []);

  // Fetch chat rooms to get room details
  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        const { getChatRooms } = await import("../../../api/api");
        const rooms = await getChatRooms();
        setChatRooms(Array.isArray(rooms) ? rooms : []);
      } catch (error) {
        console.error("Failed to fetch chat rooms:", error);
      }
    };
    fetchChatRooms();
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const dt = new Date(timestamp);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const getMessagePreview = (message) => {
    const content = String(message?.content || "").trim();
    if (content) return content;
    if (message?.attachment_url || message?.fileUrl)
      return "Sent an attachment";
    return "(No content)";
  };

  const getSenderDisplayName = (message) => {
    const fullName = `${message?.sender_first_name || ""} ${
      message?.sender_last_name || ""
    }`.trim();
    return fullName || message?.sender_email?.split("@")[0] || "User";
  };

  const getSenderInitial = (message) => {
    const first = message?.sender_first_name?.charAt(0) || "";
    const last = message?.sender_last_name?.charAt(0) || "";
    const initials = `${first}${last}`.trim();
    return (initials || message?.sender_email?.charAt(0) || "U").toUpperCase();
  };

  const getMessageAttachments = (message) => {
    const attachments = Array.isArray(message?.attachments)
      ? message.attachments
          .map((attachment) => ({
            filename: attachment?.filename || attachment?.name || "Attachment",
            url:
              attachment?.url ||
              attachment?.attachment_url ||
              attachment?.fileUrl,
          }))
          .filter((attachment) => attachment.url)
      : [];

    if (attachments.length > 0) return attachments;

    const fallbackUrl = message?.fileUrl || message?.attachment_url;
    if (!fallbackUrl) return [];

    return [
      {
        filename: getAttachmentDisplayName(message),
        url: fallbackUrl,
      },
    ];
  };

  const hasImageAttachment = (message) =>
    getMessageAttachments(message).some((attachment) => {
      const url = resolveAttachmentUrl(attachment.url);
      return (
        isImageUrl(url || "") ||
        /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.filename || "")
      );
    });

  const hasOnlyDocumentAttachments = (message) => {
    const attachments = getMessageAttachments(message);
    return (
      attachments.length > 0 &&
      attachments.every((attachment) => {
        const url = resolveAttachmentUrl(attachment.url);
        return !(
          isImageUrl(url || "") ||
          /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.filename || "")
        );
      })
    );
  };

  const isSameAttachmentBurst = (firstMessage, secondMessage) => {
    if (!firstMessage || !secondMessage) return false;
    if ((firstMessage.sender_email || "") !== (secondMessage.sender_email || "")) {
      return false;
    }

    const firstTime = new Date(firstMessage.timestamp || 0).getTime();
    const secondTime = new Date(secondMessage.timestamp || 0).getTime();
    return (
      Number.isFinite(firstTime) &&
      Number.isFinite(secondTime) &&
      Math.abs(firstTime - secondTime) <= 15000
    );
  };

  // Get room details by room_id
  const getRoomDetails = (roomId) => {
    return chatRooms.find((room) => String(room.id) === String(roomId));
  };

  // Get display name for the chat room
  const getChatRoomDisplayName = (roomId) => {
    const room = getRoomDetails(roomId);

    if (!room) return "Chat";

    // If it's a group chat, return the group name
    if (room.is_group) {
      return room.name || "Group Chat";
    }

    // For 1-on-1 chat, find the other participant's name
    if (room.participants && Array.isArray(room.participants)) {
      const otherParticipant = room.participants.find(
        (p) => p.email?.toLowerCase() !== currentUserEmail,
      );
      if (otherParticipant) {
        const firstName = otherParticipant.first_name || "";
        const lastName = otherParticipant.last_name || "";
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) return fullName;
        if (otherParticipant.name) return otherParticipant.name;
        return otherParticipant.email?.split("@")[0] || "User";
      }
    }

    return "Chat";
  };

  // Get the latest message from a room (for preview)
  const getLatestStarredMessageForRoom = (roomId) => {
    const roomStarredMessages = starredMessages.filter(
      (msg) => msg.room_id === roomId,
    );
    if (roomStarredMessages.length === 0) return null;
    // Return the most recent message
    return roomStarredMessages.reduce((latest, current) => {
      return new Date(current.timestamp) > new Date(latest.timestamp)
        ? current
        : latest;
    }, roomStarredMessages[0]);
  };

  // Helper: batch messages for display using all room messages, but show the full batch if any message in the batch is starred
  const getBatchedRoomMessages = (allRoomMessages, starredMessages) => {
    if (!Array.isArray(allRoomMessages) || !Array.isArray(starredMessages))
      return [];
    const starredIds = new Set(starredMessages.map((m) => m.id));
    const batched = buildMessageRenderItems(allRoomMessages);

    const result = [];
    const consumed = new Set();

    batched.forEach((item, index) => {
      if (consumed.has(index)) return;

      if (item.type === "image_batch") {
        const nextItem = batched[index + 1];
        const lastImageMessage = item.messages[item.messages.length - 1];
        const nextDocumentMessage =
          nextItem?.type === "single" &&
          hasOnlyDocumentAttachments(nextItem.message) &&
          isSameAttachmentBurst(lastImageMessage, nextItem.message)
            ? nextItem.message
            : null;

        const mergedMessages = nextDocumentMessage
          ? [...item.messages, nextDocumentMessage]
          : item.messages;
        const hasStarred = mergedMessages.some((m) => starredIds.has(m.id));

        if (hasStarred) {
          result.push({ type: "image_batch", messages: mergedMessages });
          if (nextDocumentMessage) consumed.add(index + 1);
        }
        return;
      }

      if (item.type === "single") {
        const previousItem = batched[index - 1];
        const previousImageMessage =
          previousItem?.type === "image_batch"
            ? previousItem.messages[previousItem.messages.length - 1]
            : previousItem?.message;

        if (
          hasOnlyDocumentAttachments(item.message) &&
          previousImageMessage &&
          hasImageAttachment(previousImageMessage) &&
          isSameAttachmentBurst(previousImageMessage, item.message)
        ) {
          if (starredIds.has(item.message.id)) {
            result.push({
              type: "image_batch",
              messages:
                previousItem?.type === "image_batch"
                  ? [...previousItem.messages, item.message]
                  : [previousImageMessage, item.message],
            });
          }
          return;
        }

        if (starredIds.has(item.message.id)) {
          result.push(item);
        }
      }
    });

    return result;
  };

  useEffect(() => {
    const fetchStarred = async () => {
      setIsLoading(true);
      try {
        const data = await getStarredMessages();
        const messages = Array.isArray(data) ? data : [];
        console.log("Starred messages fetched:", messages);
        setStarredMessages(messages);
      } catch (error) {
        console.error("Failed to fetch starred messages:", error);
        setStarredMessages([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStarred();
  }, []);

  // Fetch all messages for the selected room for correct batching
  useEffect(() => {
    if (!selectedRoomId) {
      setRoomMessages([]);
      return;
    }
    setIsRoomLoading(true);
    getRoomMessages(selectedRoomId).then((allMsgs) => {
      const allRoomMsgs = Array.isArray(allMsgs) ? allMsgs : [];
      // Mark is_sent_by_me for each message
      const processedAll = allRoomMsgs.map((msg) => ({
        ...msg,
        is_sent_by_me:
          (msg.sender_email || "").toLowerCase() === currentUserEmail,
      }));
      // Only starred messages for this room
      const starred = starredMessages.filter(
        (msg) => msg.room_id === selectedRoomId,
      );
      setRoomMessages({ all: processedAll, starred });
      setIsRoomLoading(false);
    });
  }, [selectedRoomId, currentUserEmail, starredMessages]);

  // Group starred messages by room_id for unique chat rooms list
  const uniqueRooms = useMemo(() => {
    const roomsMap = new Map();

    starredMessages.forEach((msg) => {
      const roomId = msg.room_id;

      // Skip messages without room_id
      if (!roomId) {
        console.warn("Message missing room_id:", msg.id);
        return;
      }

      if (!roomsMap.has(roomId)) {
        roomsMap.set(roomId, {
          room_id: roomId,
          starredCount: 1,
          latestTimestamp: msg.timestamp,
        });
      } else {
        const existing = roomsMap.get(roomId);
        existing.starredCount++;
        // Update latest timestamp if this message is newer
        if (new Date(msg.timestamp) > new Date(existing.latestTimestamp)) {
          existing.latestTimestamp = msg.timestamp;
        }
      }
    });

    // Convert to array and sort by latest message timestamp (newest first)
    const rooms = Array.from(roomsMap.values()).sort(
      (a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp),
    );

    // Add the latest message for each room
    return rooms.map((room) => ({
      ...room,
      latestMessage: getLatestStarredMessageForRoom(room.room_id),
    }));
  }, [starredMessages]);

  return (
    <div className="flex-1 min-h-0 bg-white border-r border-[#F0F0F0] flex min-h-0">
      <div className="flex flex-col min-w-[470px] h-[700px] flex-1 min-h-0 border-l border-r border-[#EFEFEF]">
        <div className="flex items-center w-full px-[25px] h-[60px] border-b border-[#E2E2E2]">
          <h1 className="inter-bold text-[20px] tracking-[0.07em]">Starred</h1>
        </div>

        {/* Starred Messages List */}
        <div className="flex flex-col w-full flex-1 min-h-0 gap-[10px] px-[10px] py-[12px] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <button className="flex items-center justify-center w-[88px] h-[32px] rounded-[8px] border-[1px] border-[#D6D6D6] bg-[#FFFFFF] ">
            <span className="inter-regular text-[14px] tracking-[0.07em] text-[#949494]">
              Unread
            </span>
          </button>

          {isLoading ? (
            <div className="text-[12px] text-[#6D6D6D] px-[6px]">
              Loading starred messages...
            </div>
          ) : uniqueRooms.length === 0 ? (
            <div className="text-[12px] text-[#6D6D6D] px-[6px]">
              No starred messages found.
            </div>
          ) : (
            uniqueRooms.map((room) => {
              const latestMsg = room.latestMessage;
              const roomId = room.room_id;
              const starredCount = room.starredCount;
              const displayName = getChatRoomDisplayName(roomId);

              // Get the initial for display (first letter of chat name)
              const displayInitial = displayName
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part.charAt(0).toUpperCase())
                .join("") || "C";

              return (
                <div
                  key={roomId}
                  className={`flex flex-col w-full h-[114px] px-[5px] py-[10px] gap-[5px] rounded-[10px] ${selectedRoomId === roomId ? "bg-[#EDEDED]" : "bg-[white]"}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setSelectedRoomId(roomId);
                    if (onRoomSelect) onRoomSelect(roomId);
                  }}
                >
                  <div className="flex flex-row justify-between items-center w-full h-[30px] ">
                    <div className="flex flex-row items-center w-[140px] h-[30px] gap-[10px]">
                      {(() => {
                        const room = getRoomDetails(roomId);
                        if (room?.is_group) {
                          // Build group collage (up to 4 initials)
                          let groupInitials = [];
                          if (Array.isArray(room.participant_details)) {
                            groupInitials = room.participant_details
                              .slice(0, 4)
                              .map((p) => {
                                const name =
                                  p?.first_name ||
                                  p?.name ||
                                  p?.email ||
                                  p?.user_email ||
                                  "";
                                return name.charAt(0).toUpperCase();
                              });
                          } else if (Array.isArray(room.participants)) {
                            groupInitials = room.participants
                              .slice(0, 4)
                              .map((p) => {
                                if (typeof p === "string")
                                  return p.charAt(0).toUpperCase();
                                const name =
                                  p?.first_name ||
                                  p?.name ||
                                  p?.email ||
                                  p?.user_email ||
                                  "";
                                return name.charAt(0).toUpperCase();
                              });
                          } else {
                            groupInitials = [displayInitial];
                          }
                          return groupInitials.length === 3 ? (
                            <div className="relative w-[30px] h-[30px] overflow-hidden rounded-full">
                              <div
                                className="absolute left-0 top-0 flex h-[30px] w-[16px] items-center justify-center text-[8px] font-semibold"
                                style={{
                                  backgroundColor: stringToPastelColor(
                                    (() => {
                                      if (
                                        Array.isArray(
                                          room.participant_details,
                                        ) &&
                                        room.participant_details[0]
                                      ) {
                                        const p = room.participant_details[0];
                                        return (
                                          p.email ||
                                          p.user_email ||
                                          p.id ||
                                          p.name ||
                                          ""
                                        )
                                          .toString()
                                          .toLowerCase();
                                      }
                                      if (
                                        Array.isArray(room.participants) &&
                                        room.participants[0]
                                      ) {
                                        const p = room.participants[0];
                                        return typeof p === "string"
                                          ? p.toLowerCase()
                                          : (
                                              p.email ||
                                              p.user_email ||
                                              p.id ||
                                              ""
                                            )
                                              .toString()
                                              .toLowerCase();
                                      }
                                      return groupInitials[0];
                                    })(),
                                  ),
                                  color: stringToDarkColor(
                                    (() => {
                                      if (
                                        Array.isArray(
                                          room.participant_details,
                                        ) &&
                                        room.participant_details[0]
                                      ) {
                                        const p = room.participant_details[0];
                                        return (
                                          p.email ||
                                          p.user_email ||
                                          p.id ||
                                          p.name ||
                                          ""
                                        )
                                          .toString()
                                          .toLowerCase();
                                      }
                                      if (
                                        Array.isArray(room.participants) &&
                                        room.participants[0]
                                      ) {
                                        const p = room.participants[0];
                                        return typeof p === "string"
                                          ? p.toLowerCase()
                                          : (
                                              p.email ||
                                              p.user_email ||
                                              p.id ||
                                              ""
                                            )
                                              .toString()
                                              .toLowerCase();
                                      }
                                      return groupInitials[0];
                                    })(),
                                  ),
                                }}
                              >
                                {groupInitials[0]}
                              </div>
                              <div
                                className="absolute left-[16px] top-0 flex h-[15px] w-[14px] items-center justify-center text-[8px] font-semibold"
                                style={{
                                  backgroundColor: stringToPastelColor(
                                    (() => {
                                      if (
                                        Array.isArray(
                                          room.participant_details,
                                        ) &&
                                        room.participant_details[1]
                                      ) {
                                        const p = room.participant_details[1];
                                        return (
                                          p.email ||
                                          p.user_email ||
                                          p.id ||
                                          p.name ||
                                          ""
                                        )
                                          .toString()
                                          .toLowerCase();
                                      }
                                      if (
                                        Array.isArray(room.participants) &&
                                        room.participants[1]
                                      ) {
                                        const p = room.participants[1];
                                        return typeof p === "string"
                                          ? p.toLowerCase()
                                          : (
                                              p.email ||
                                              p.user_email ||
                                              p.id ||
                                              ""
                                            )
                                              .toString()
                                              .toLowerCase();
                                      }
                                      return groupInitials[1];
                                    })(),
                                  ),
                                  color: stringToDarkColor(
                                    (() => {
                                      if (
                                        Array.isArray(
                                          room.participant_details,
                                        ) &&
                                        room.participant_details[1]
                                      ) {
                                        const p = room.participant_details[1];
                                        return (
                                          p.email ||
                                          p.user_email ||
                                          p.id ||
                                          p.name ||
                                          ""
                                        )
                                          .toString()
                                          .toLowerCase();
                                      }
                                      if (
                                        Array.isArray(room.participants) &&
                                        room.participants[1]
                                      ) {
                                        const p = room.participants[1];
                                        return typeof p === "string"
                                          ? p.toLowerCase()
                                          : (
                                              p.email ||
                                              p.user_email ||
                                              p.id ||
                                              ""
                                            )
                                              .toString()
                                              .toLowerCase();
                                      }
                                      return groupInitials[1];
                                    })(),
                                  ),
                                }}
                              >
                                {groupInitials[1]}
                              </div>
                              <div
                                className="absolute left-[16px] top-[15px] flex h-[15px] w-[14px] items-center justify-center text-[8px] font-semibold"
                                style={{
                                  backgroundColor: stringToPastelColor(
                                    (() => {
                                      if (
                                        Array.isArray(
                                          room.participant_details,
                                        ) &&
                                        room.participant_details[2]
                                      ) {
                                        const p = room.participant_details[2];
                                        return (
                                          p.email ||
                                          p.user_email ||
                                          p.id ||
                                          p.name ||
                                          ""
                                        )
                                          .toString()
                                          .toLowerCase();
                                      }
                                      if (
                                        Array.isArray(room.participants) &&
                                        room.participants[2]
                                      ) {
                                        const p = room.participants[2];
                                        return typeof p === "string"
                                          ? p.toLowerCase()
                                          : (
                                              p.email ||
                                              p.user_email ||
                                              p.id ||
                                              ""
                                            )
                                              .toString()
                                              .toLowerCase();
                                      }
                                      return groupInitials[2];
                                    })(),
                                  ),
                                  color: stringToDarkColor(
                                    (() => {
                                      if (
                                        Array.isArray(
                                          room.participant_details,
                                        ) &&
                                        room.participant_details[2]
                                      ) {
                                        const p = room.participant_details[2];
                                        return (
                                          p.email ||
                                          p.user_email ||
                                          p.id ||
                                          p.name ||
                                          ""
                                        )
                                          .toString()
                                          .toLowerCase();
                                      }
                                      if (
                                        Array.isArray(room.participants) &&
                                        room.participants[2]
                                      ) {
                                        const p = room.participants[2];
                                        return typeof p === "string"
                                          ? p.toLowerCase()
                                          : (
                                              p.email ||
                                              p.user_email ||
                                              p.id ||
                                              ""
                                            )
                                              .toString()
                                              .toLowerCase();
                                      }
                                      return groupInitials[2];
                                    })(),
                                  ),
                                }}
                              >
                                {groupInitials[2]}
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`grid h-[30px] w-[30px] overflow-hidden rounded-full border border-[#EAEAEA] ${
                                groupInitials.length === 1
                                  ? "grid-cols-1"
                                  : "grid-cols-2"
                              } ${groupInitials.length > 2 ? "grid-rows-2" : "grid-rows-1"}`}
                            >
                              {groupInitials.map((initial, cellIdx) => {
                                let participantKey = "";
                                if (
                                  Array.isArray(room.participant_details) &&
                                  room.participant_details[cellIdx]
                                ) {
                                  const p = room.participant_details[cellIdx];
                                  participantKey = (
                                    p.email ||
                                    p.user_email ||
                                    p.id ||
                                    p.name ||
                                    ""
                                  )
                                    .toString()
                                    .toLowerCase();
                                } else if (
                                  Array.isArray(room.participants) &&
                                  room.participants[cellIdx]
                                ) {
                                  const p = room.participants[cellIdx];
                                  if (typeof p === "string") {
                                    participantKey = p.toLowerCase();
                                  } else if (p && typeof p === "object") {
                                    participantKey = (
                                      p.email ||
                                      p.user_email ||
                                      p.id ||
                                      p.name ||
                                      ""
                                    )
                                      .toString()
                                      .toLowerCase();
                                  }
                                } else if (initial) {
                                  participantKey = initial;
                                } else {
                                  participantKey = (room.id || room.name || "")
                                    .toString()
                                    .toLowerCase();
                                }
                                return (
                                  <div
                                    key={`group-initial-${room.id}-${cellIdx}`}
                                    className="flex h-full w-full items-center justify-center text-[8px] font-semibold"
                                    style={{
                                      backgroundColor:
                                        stringToPastelColor(participantKey),
                                      color: stringToDarkColor(participantKey),
                                    }}
                                  >
                                    {initial || ""}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        // 1-on-1: show the conversation participant, not the sender.
                        if (
                          room?.participants &&
                          Array.isArray(room.participants)
                        ) {
                          const other = room.participants.find(
                            (p) =>
                              (p.email?.toLowerCase?.() ||
                                p?.toLowerCase?.()) !== currentUserEmail,
                          );
                          const participantKey =
                            (typeof other === "string" ? other : other?.email) ||
                            displayName ||
                            String(roomId);
                          if (participantKey)
                            return (
                              <div
                                className="w-[30px] h-[30px] rounded-[50%] flex items-center justify-center text-[12px] font-semibold"
                                style={{
                                  backgroundColor: stringToPastelColor(
                                    participantKey.toString().toLowerCase(),
                                  ),
                                  color: stringToDarkColor(
                                    participantKey.toString().toLowerCase(),
                                  ),
                                }}
                              >
                                {displayInitial}
                              </div>
                            );
                        }
                        // fallback
                        return (
                          <div
                            className="w-[30px] h-[30px] rounded-[50%] flex items-center justify-center text-[12px] font-semibold"
                            style={{
                              backgroundColor: stringToPastelColor(
                                String(roomId),
                              ),
                              color: stringToDarkColor(String(roomId)),
                            }}
                          >
                            {displayInitial}
                          </div>
                        );
                      })()}
                      <span className="inter-regular text-[12px] tracking-[0.07em] whitespace-nowrap overflow-hidden text-ellipsis font-medium">
                        {displayName}
                      </span>
                    </div>
                    <div className="flex flex-row items-center justify-center w-[100px] h-[30px] gap-[10px]">
                      <div className="w-[16px] h-[16px]">
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 15 15"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M8.31912 1.4625L9.49245 3.8285C9.65245 4.15783 10.0791 4.47383 10.4391 4.53383L12.5651 4.8905C13.9251 5.11917 14.2451 6.11383 13.2651 7.09517L11.6118 8.76183C11.3318 9.04383 11.1785 9.5885 11.2651 9.9785L11.7385 12.0418C12.1118 13.6752 11.2518 14.3065 9.81845 13.4532L7.82512 12.2632C7.46512 12.0485 6.87179 12.0485 6.50512 12.2632L4.51312 13.4532C3.08645 14.3065 2.21979 13.6678 2.59312 12.0418L3.06645 9.9785C3.15312 9.5885 2.99979 9.04383 2.71979 8.76183L1.06645 7.09517C0.0937881 6.11317 0.407121 5.11917 1.76645 4.8905L3.89312 4.53383C4.24645 4.47383 4.67312 4.15783 4.83312 3.8285L6.00645 1.4625C6.64645 0.179167 7.68579 0.179167 8.31912 1.4625Z"
                            fill="#6A37F5"
                            stroke="#6A37F5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <span className="inter-regular text-[8px] tracking-[0.07em] ">
                        {formatTime(latestMsg?.timestamp)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-row gap-[5px] w-full h-full p-[5px]">
                    <div className="w-[30px] h-[30px] px-[16px]"></div>
                    <div className="flex flex-row items-center justify-between flex-1">
                      <span className="inter-regular text-[12px] w-[300px] tracking-[0.07em] whitespace-nowrap overflow-hidden text-ellipsis flex-1">
                        {getMessagePreview(latestMsg)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Starred Message View */}
      <div className="w-full h-[700px] py-8 flex flex-col items-center overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {selectedRoomId ? (
          isRoomLoading ? (
            <div className="text-center text-[#7A7A7A]">
              Loading chat room...
            </div>
          ) : roomMessages.length === 0 ? (
            <div className="text-center text-[#7A7A7A]">
              No messages in this chat room.
            </div>
          ) : (
            <div className="flex flex-col w-full max-w-[400px] gap-2 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {roomMessages.all &&
                roomMessages.starred &&
                getBatchedRoomMessages(
                  roomMessages.all,
                  roomMessages.starred,
                ).map((item, idx) => {
                  if (item.type === "image_batch") {
                    return (
                      <ChatMessageBubble
                        key={`image-batch-${idx}`}
                        message={item.messages[0]}
                        isFromMe={item.messages[0]?.is_sent_by_me}
                        currentUserEmail={currentUserEmail}
                        imageBatch={item.messages}
                      />
                    );
                  } else {
                    return (
                      <ChatMessageBubble
                        key={item.message.id || idx}
                        message={item.message}
                        isFromMe={item.message.is_sent_by_me}
                        currentUserEmail={currentUserEmail}
                      />
                    );
                  }
                })}
            </div>
          )
        ) : (
          <div className="flex flex-col items-center mt-[30%] gap-[28px] w-[323px] h-[90px]">
            <div className="w-[32px] h-[32px] flex items-center justify-center flex-shrink-0">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 4L19.708 11.528L28 12.764L22 18.612L23.416 26.868L16 23L8.584 26.868L10 18.612L4 12.764L12.292 11.528L16 4Z"
                  stroke="#5A5A5A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="inter-bold text-[12px] max-w-[200px] leading-[15px] tracking-[0.07em] text-[#000000] text-center w-[323px]">
              {" "}
              When you select an Starred it'll show up here{" "}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatStarred;
