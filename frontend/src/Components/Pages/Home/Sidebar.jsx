import { useEffect, useState } from "react";
import {
  getInboxMails,
  getSentMails,
  getDraftMails,
  getStarredMails,
  getSpamMails,
  getTrashMails,
} from "../../../api/api";
import { LabelStatusColors } from "../../../constants/LabelStatusColors";
import { BulletCircleIcon, LabelArrowIcon, LabelStatusCircleIcon } from "../../../assets/icons/IconRegistry";

const items = [
  { label: "All Inbox", key: "inbox" },
  { label: "Sent mail", key: "sent" },
  { label: "Outbox", key: "outbox" },
  { label: "Drafts", key: "drafts" },
  { label: "Junk", key: "junk" },
  { label: "Trash", key: "trash" },
  { label: "Snoozed", key: "snoozed" },
  { label: "Archive", key: "archived" },
  { label: "Favourite", key: "favorite" },
];

const MAILBOX_API_MAP = {
  inbox: getInboxMails,
  sent: getSentMails,
  drafts: getDraftMails,
  favorite: getStarredMails,
  junk: getSpamMails,
  trash: getTrashMails,
};

export const Sidebar = ({
  selectedMailbox,
  setSelectedMailbox,
  loadMailbox,
  unreadCounts,
  defaultLabelsVisibility,
  customLabels,
  loadLabelMailbox,
}) => {
  const [, forceUpdate] = useState(0);

  const emailNotificationsEnabled = JSON.parse(
    sessionStorage.getItem("email_notifications") ?? "true",
  );

  useEffect(() => {
    const handleStorageChange = () => forceUpdate((n) => n + 1);
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  return (
    <div className="flex flex-col w-[158px] h-full bg-[#040B23]">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <div className="border-b-[2px] border-[#FFFFFF24] flex flex-col">
          <h2 className="inter-bold text-[12px] text-[#FFFFFF] px-[20px] pt-[30px] tracking-[0.07em]">
            Mailbox
          </h2>
          <div className="flex flex-col gap-[10px] py-[10px]">
            {items.map((item) => {
              const isActive = selectedMailbox === item.key;
              const currentUnreadCount = unreadCounts?.[item.key] || 0;

              const labelName = item.label;
              const visibility = defaultLabelsVisibility?.[labelName];

              if (visibility === "hide") return null;
              if (visibility === "show_if_unread" && currentUnreadCount === 0)
                return null;

              return (
                <div
                  key={item.key}
                  onClick={() => {
                    setSelectedMailbox(item.key);
                    loadMailbox(item.key);
                  }}
                  className={`flex items-center justify-between w-[158px] py-[1px] pr-[16px] pl-[28px] gap-[px] cursor-pointer ${isActive ? "h-[44px] bg-[#6A37F5] text-[#FFFFFF]" : ""}`}
                >
                  <span
                    className={`${isActive ? "inter-bold text-[12px] tracking-[0.07em] leading-[100%]" : "inter-regular text-[11px] text-[#FFFFFF]"} hover:text-[#FFFFFF]`}
                  >
                    {item.label}
                  </span>
                  {(item.key !== "inbox" || emailNotificationsEnabled) &&
                    currentUnreadCount > 0 && (
                      <div className="w-[28px] h-[18px] rounded-[9px] bg-[#4924B0] flex items-center justify-center">
                        <span className="inter-medium text-[9px] text-[#FFFFFF] tracking-[0.07em]">
                          {currentUnreadCount}
                        </span>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
        <div className="border-[#FFFFFF24] flex flex-col">
          <h2 className="inter-bold text-[12px] text-[#FFFFFF] px-[20px] pt-[30px] tracking-[0.07em]">
            Labels
          </h2>

          <div className="flex flex-col h-[200px] gap-[10px] py-[10px]">
            {customLabels
              .filter((label) => !label.parent)
              .map((parentLabel, index) => {
                const visibility = defaultLabelsVisibility?.[parentLabel.name];

                if (visibility === "hide") return null;

                const childLabels = customLabels.filter(
                  (label) => label.parent === parentLabel.name,
                );

                // Use custom color if available, otherwise use original colors
                const defaultColors = [
                  "#FFBF60", // Events
                  "#00C798", // Meetings
                  "#713CE1", // Promotions
                  "#FF7D6F", // Others
                ];

                const bulletColor =
                  parentLabel.color ||
                  defaultColors[index % defaultColors.length];

                const parentKey = `label:${parentLabel.id || parentLabel.name}`;
                const isParentActive = selectedMailbox === parentKey;

                return (
                  <div key={parentLabel.name}>
                    {/* Parent Label */}
                    <div
                      onClick={() => {
                        loadLabelMailbox(parentLabel);
                      }}
                      className={`flex items-center w-[158px] ${
                        isParentActive ? "h-[44px]" : ""
                      } py-[1px] pr-[16px] pl-[28px] gap-[11px] cursor-pointer ${
                        isParentActive ? "bg-[#6A37F5]" : ""
                      }`}
                    >
                      {/* Bullet Icon */}
                      {/* <svg
                        width="8"
                        height="8"
                        viewBox="0 0 8 8"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <circle
                          cx="4"
                          cy="4"
                          r="3"
                          stroke={bulletColor}
                          strokeWidth="2"
                        />
                      </svg> */}
                      <BulletCircleIcon color={bulletColor} />

                      <span
                        className={`${
                          isParentActive
                            ? "inter-bold text-[12px] tracking-[0.07em] leading-[100%] text-[#FFFFFF]"
                            : "inter-regular text-[11px] text-[#B6B6B6]"
                        } hover:text-[#FFFFFF]`}
                      >
                        {parentLabel.name}
                      </span>
                    </div>

                    {/* Child Labels */}
                    {childLabels.map((child, childIndex) => {
                      const childVisibility =
                        defaultLabelsVisibility?.[child.name];

                      if (childVisibility === "hide") return null;

                      const childKey = `label:${child.id || child.name}`;
                      const isChildActive = selectedMailbox === childKey;

                      return (
                        <div
                          key={child.name}
                          onClick={() => {
                            loadLabelMailbox(child);
                          }}
                          className={`flex items-center w-[158px] py-[1px] pr-[16px] pl-[48px] gap-[11px] cursor-pointer ${
                            isChildActive ? "h-[36px] bg-[#6A37F5]" : ""
                          }`}
                        >
                          {/* Child Bullet Icon */}
                          <div className="relative w-[14px] h-[18px] flex items-center justify-center">
                            {/* Vertical line */}
                            {/* {childIndex !== childLabels.length - 1 && (
                              <div
                                className="absolute left-[4px] top-[0px] h-[28px] w-[1px]"
                                style={{ backgroundColor: bulletColor }}
                              />
                            )} */}

                            {/* Last child shorter line */}
                            {/* {childIndex === childLabels.length - 1 && (
                              <div
                                className="absolute left-[4px] top-[-10px] h-[18px] w-[1px]"
                                style={{ backgroundColor: bulletColor }}
                              />
                            )} */}

                            {/* Horizontal line */}
                            {/* <div
                              className="absolute left-[4px] top-[9px] w-[7px] h-[1px]"
                              style={{ backgroundColor: bulletColor }}
                            /> */}

                            {/* Arrow head */}
                            {/* <div
                              className="absolute right-0 top-[6px] w-[5px] h-[5px] border-t border-r rotate-45"
                              style={{ borderColor: bulletColor }}
                            /> */}
                            <div className="absolute right-[-4px] top-[2px]">
                              <LabelArrowIcon color={bulletColor} />
                            </div>
                          </div>

                          <span
                            className={`${
                              isChildActive
                                ? "inter-bold text-[12px] tracking-[0.07em] leading-[100%] text-[#FFFFFF]"
                                : "inter-regular text-[11px] text-[#9E9E9E]"
                            } hover:text-[#FFFFFF]`}
                          >
                            {child.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};
