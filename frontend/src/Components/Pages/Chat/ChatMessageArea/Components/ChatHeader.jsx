import React, { useMemo } from "react";
import {
  ChatProfileCallIcon,
  ChatProfileDropdownIcon,
  ChatProfileSearchIcon,
} from "../../../../../assets/icons/Icons1";

const avatarPositions = [
  "top-0 left-0",
  "top-0 right-0",
  "bottom-0 left-0",
  "bottom-0 right-0",
];

const ChatHeader = ({
  headerInfo,
  avatarLoadFailed,
  setAvatarLoadFailed,
  showSearchBox,
  setShowSearchBox,
  setShowDotsPopup,
  handleCallClick,
  isCallLoading,
  participantsButtonRef,
  setShowParticipantsPanel,
  showParticipantsPanel,
  stringToPastelColor,
  stringToDarkColor,
  getInitials,
  selectedChat,
}) => {

  const getGroupHeaderInitials = () => {
    if (!headerInfo?.isGroup) return [];

    const initials = [];
    const seenKeys = new Set();

    const addInitial = (displayValue, uniqueKey) => {
      const letter = (displayValue || "")
        .trim()
        .charAt(0)
        .toUpperCase();

      if (!letter) return;

      const key = (uniqueKey || displayValue || "")
        .toString()
        .toLowerCase();

      if (!key || seenKeys.has(key)) return;

      seenKeys.add(key);
      initials.push(letter);
    };

    if (
      Array.isArray(selectedChat?.participant_details) &&
      selectedChat.participant_details.length > 0
    ) {
      selectedChat.participant_details.forEach((participant) => {

        const email =
          participant?.email ||
          participant?.user_email ||
          "";

        const firstName =
          participant?.first_name ||
          participant?.firstName ||
          "";

        const lastName =
          participant?.last_name ||
          participant?.lastName ||
          "";

        const fullName =
          `${firstName} ${lastName}`.trim();

        const displayValue =
          fullName ||
          email.split("@")[0] ||
          "";

        addInitial(
          displayValue,
          email || participant?.id || displayValue,
        );
      });
    }

    return initials.slice(0, 4);
  };

  const groupHeaderInitials = useMemo(
    () => getGroupHeaderInitials(),
    [selectedChat?.participant_details, headerInfo?.isGroup],
  );

  const handleToggleSearch = () => {
    setShowSearchBox((prev) => !prev);
  };

  const handleToggleParticipants = () => {
    setShowParticipantsPanel((prev) => !prev);
  };

  const handleToggleDropdown = () => {
    setShowDotsPopup((prev) => !prev);
  };

  return (
    <div className="flex flex-row items-center justify-between w-full h-[64px] bg-[#040B23] px-[25px]">

      {/* Left Section */}
      <div className="flex flex-row items-center gap-[10px]">

        {/* Group Avatar */}
        {headerInfo?.isGroup ? (

          <div className="relative w-[42px] h-[42px]">

            {groupHeaderInitials.map((initial, index) => {

              const colorKey =
                selectedChat?.participant_details?.[index]?.email ||
                initial;

              return (
                <div
                  key={index}
                  className={`absolute ${avatarPositions[index]}
                    w-[20px] h-[20px] rounded-full
                    flex items-center justify-center
                    text-[10px] font-semibold`}
                  style={{
                    backgroundColor:
                      stringToPastelColor(colorKey),

                    color:
                      stringToDarkColor(colorKey),
                  }}
                >
                  {initial}
                </div>
              );
            })}

          </div>

        ) : headerInfo?.image && !avatarLoadFailed ? (

          <img
            src={headerInfo.image}
            alt={headerInfo.name || "User"}
            onError={() => setAvatarLoadFailed(true)}
            className="w-[42px] h-[42px] rounded-full object-cover"
          />

        ) : (

          <div
            className="w-[42px] h-[42px] rounded-full
            flex items-center justify-center
            text-[14px] font-semibold"
            style={{
              backgroundColor:
                stringToPastelColor(headerInfo?.name),

              color:
                stringToDarkColor(headerInfo?.name),
            }}
          >
            {getInitials(
              headerInfo?.firstName,
              headerInfo?.lastName,
              headerInfo?.name,
            )}
          </div>

        )}

        {/* User Info */}
        <div className="flex flex-col">

          <span className="text-[#FFFFFF] text-[14px] inter-medium">
            {headerInfo?.name}
          </span>

          <span className="text-[#A5A5A5] text-[11px]">
            {headerInfo?.isOnline
              ? "Online"
              : "Offline"}
          </span>

        </div>

      </div>

      {/* Right Section */}
      <div className="flex flex-row items-center gap-[16px]">

        {/* Search */}
        <button
          onClick={handleToggleSearch}
          className="cursor-pointer"
        >
          <ChatProfileSearchIcon />
        </button>

        {/* Call */}
        <button
          onClick={handleCallClick}
          disabled={isCallLoading}
          className="cursor-pointer"
        >
          <ChatProfileCallIcon />
        </button>

        {/* Participants */}
        {headerInfo?.isGroup && (
          <button
            ref={participantsButtonRef}
            onClick={handleToggleParticipants}
            className="text-white text-[13px]"
          >
            Participants
          </button>
        )}

        {/* Dropdown */}
        <button
          onClick={handleToggleDropdown}
          className="cursor-pointer"
        >
          <ChatProfileDropdownIcon />
        </button>

      </div>

    </div>
  );
};

export default ChatHeader;