import { useSelector } from "react-redux";
import { useState, useEffect, useRef } from "react";
import profileimage from "../../../../assets/images/profileimg.png";
import { StripHtml } from "../../../../utils/StripHtml";
import nomessagestoread from "../../../../assets/images/nomessagestoread.png";
import { togglePinMail } from "../../../../api/api";
import LabelAs from "../LabelAs";
import Snooze from "../Snooze";
import { formatUser } from "../../../../utils/FormatUser";
import { ArchiveIcon, AttachmentDownloadIcon, CheckListIcon, ChevronLeftIcon, ChevronRightIcon, CreateEventCalendarIcon, DocumentActionIcon, FolderIcon, ImageActionIcon, LabelAsIcon, MoreOptionsIcon, PinIcon, PrinterIcon, ReportIcon, StarIcon, TodolistBellIcon, TrashIcon, VerticalThreeDotsIcon } from "../../../../assets/icons/IconRegistry";
import { createTaskFromEmail } from "../../../../api/api";
import { MailSenderInfo } from "./MailSenderInfo";
import { MailRecipients } from "./MailRecipients";
import CreateEventAction from "./CreateEventAction";
import DOMPurify from 'dompurify';
import { InlineReplyEditor } from "../ComposeSection/InlineReplyEditor";

// 2. Add the Plain Text Highlighter (For the Subject)
const HighlightText = ({ text = "", highlight = "" }) => {
  if (!highlight || !highlight.trim()) return <>{text}</>;
  
  // Escape special characters in the search query to prevent regex crashes
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, "gi");
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-[#FFB800] text-black bg-opacity-40 rounded-[2px] px-[2px]">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

// 3. Add the Safe HTML Highlighter (For the Body)
const highlightHTML = (htmlString, highlight) => {
  if (!highlight || !highlight.trim() || !htmlString) return htmlString;

  // 1. Create a safe Regex just for the plain text
  const escapedHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, "gi");

  // 2. Parse the raw HTML string into a temporary DOM tree
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // 3. Create a TreeWalker to find ONLY pure text nodes (ignoring HTML tags entirely)
  const walker = document.createTreeWalker(
    doc.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    // Collect nodes that contain the searched text
    if (node.nodeValue.match(regex)) {
      textNodes.push(node);
    }
  }

  // 4. Safely replace the text inside those specific nodes
  textNodes.forEach((textNode) => {
    const parent = textNode.parentNode;
    
    // Safety check: don't highlight inside invisible tags
    if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return;

    // Create a temporary container to hold our new HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = textNode.nodeValue.replace(
      regex,
      '<mark style="background-color: rgba(255, 184, 0, 0.4); color: black; border-radius: 2px; padding: 0 2px;">$1</mark>'
    );

    // Swap the old text node with our new highlighted nodes
    while (tempDiv.firstChild) {
      parent.insertBefore(tempDiv.firstChild, textNode);
    }
    parent.removeChild(textNode);
  });

  // Return the newly modified HTML string
  return doc.body.innerHTML;
};

export const MailView = ({
  mail,
  mails,
  onArchive,
  onDelete,
  onToggleStar,
  onToggleRead,
  onUnarchive,
  selectedMailbox,
  setSelectedMail,
  onRestore,
  onSnooze,
  onTogglePin,
  onReportJunk,
  onNotJunk,
  defaultLabelsVisibility,
  setDefaultLabelsVisibility,
  taskRefreshTrigger,
  setTaskRefreshTrigger,
  customLabels,
  setCustomLabels,
  onMailMovedToLabel,
}) => {
  const searchQuery = useSelector((state) => state.search?.query || "");

  //Label As
  const [showLabelPopup, setShowLabelPopup] = useState(false);

  const [isActive, setIsActive] = useState(false);
  const [message, setMessage] = useState("");
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Dropdown state and ref
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [replyMode, setReplyMode] = useState(null); // 'reply', 'reply_all', 'forward'

  // 1. Create a reference anchor
  const replyScrollRef = useRef(null);

  // 2. Automatically scroll down when a mode is picked
  useEffect(() => {
    if (replyMode) {
      setTimeout(() => {
        replyScrollRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "nearest" // Pushes the popup perfectly into the visible area
        });
      }, 80); // Tiny timeout allows React to insert the DOM element first
    }
  }, [replyMode]);

    // Clear the reading pane whenever the user switches folders/tabs
  useEffect(() => {
    setSelectedMail(null);
  }, [selectedMailbox]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Keyboard navigation for dropdowns
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDropdownOpen]);

  if (!mails || mails.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        <img
          src={nomessagestoread}
          alt="No messages to read"
          className="w-[320px] opacity-80"
        />
      </div>
    );
  }

  const currentIndex = mails.findIndex((m) => m.id === mail?.id);
  const totalCount = mails.length;

  const goPrev = () => {
    if (currentIndex > 0) {
      setSelectedMail(mails[currentIndex - 1]);
    }
  };

  const goNext = () => {
    if (currentIndex < mails.length - 1) {
      setSelectedMail(mails[currentIndex + 1]);
    }
  };

  if (!mail || currentIndex === -1) {
    return (
      <div className="flex flex-1 items-center justify-center bg-white">
        Select a Mail to Preview
      </div>
    );
  }

  const downloadAllAttachments = async () => {
    if (!mail.attachments || mail.attachments.length === 0) return;
    setDownloadingAll(true);
    for (const att of mail.attachments) {
      try {
        const fileUrl = att.url;
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = att.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Failed to download ${att.filename}`, err);
      } finally {
        setDownloadingAll(false);
      }
    }
  };

  const previewFile = (att) => {
    const link = document.createElement("a");
    link.href = att.url;
    link.download = att.filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadFile = async (att) => {
    try {
      const fileUrl = att.url;
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = att.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  // Handle Pin Email
  const handlePin = async () => {
    setIsDropdownOpen(false);
    try {
      const newPinStatus = !mail.is_important;
      if (onTogglePin) {
        onTogglePin(mail.id, newPinStatus);
      } else {
        await togglePinMail(mail.id, newPinStatus);
        mail.is_important = newPinStatus;
        setSelectedMail({ ...mail, is_important: newPinStatus });
      }
    } catch (err) {
      console.error("Error toggling pin", err);
    }
  };

  // Handle Print Functionality
  const handlePrint = () => {
    setIsDropdownOpen(false);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      // Look for user_email directly as a key, or nested inside the 'user' object
      const directUserEmail = sessionStorage.getItem("user_email");
      const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
      const myEmail =
        directUserEmail ||
        currentUser?.user_email ||
        currentUser?.email ||
        "Me";

      const fromEmail = formatUser(mail.from) || myEmail;
      const toEmail = formatUser(mail.to) || "Unknown Recipient";

      const formattedDate = new Date(mail.date).toLocaleString("default", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Generate attachments HTML if any exist
      let attachmentsHtml = "";
      if (mail.attachments && mail.attachments.length > 0) {
        attachmentsHtml = `
          <div class="attachments-section">
            <div class="attachments-title">Attachments (${mail.attachments.length})</div>
            <ul class="attachments-list">
              ${mail.attachments
                .map((att) => {
                  const fileName =
                    att?.filename?.split("/")?.pop() || att?.name || "file";
                  const sizeKb = att?.size
                    ? (att.size / 1024).toFixed(0) + " KB"
                    : "Unknown size";
                  return `<li>📄 <strong>${fileName}</strong> <span class="attachment-size">(${sizeKb})</span></li>`;
                })
                .join("")}
            </ul>
          </div>
        `;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Print Email - ${mail.subject}</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto; }
              .header { border-bottom: 2px solid #eaeaea; padding-bottom: 20px; margin-bottom: 30px; }
              h1 { font-size: 24px; color: #000; margin-bottom: 10px; }
              .meta-info { font-size: 14px; color: #555; margin-bottom: 5px; }
              .meta-label { font-weight: bold; color: #777; width: 60px; display: inline-block; }
              .body-content { font-size: 15px; margin-top: 30px; }
              .attachments-section { margin-top: 40px; border-top: 1px dashed #eaeaea; padding-top: 20px; }
              .attachments-title { font-size: 16px; font-weight: bold; margin-bottom: 12px; color: #000; }
              .attachments-list { list-style-type: none; padding: 0; margin: 0; }
              .attachments-list li { background-color: #f9f9f9; padding: 10px 15px; border-radius: 6px; border: 1px solid #eee; margin-bottom: 8px; font-size: 14px; }
              .attachment-size { color: #888; font-size: 12px; margin-left: 6px; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${mail.subject}</h1>
              <div class="meta-info"><span class="meta-label">From:</span> ${fromEmail}</div>
              <div class="meta-info"><span class="meta-label">To:</span> ${toEmail}</div>
              <div class="meta-info"><span class="meta-label">Date:</span> ${formattedDate}</div>
            </div>
            <div class="body-content">${mail.body || ""}</div>
            ${attachmentsHtml}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleAddToTask = async () => {
    try {
      await createTaskFromEmail(mail.id);

      setTaskRefreshTrigger((prev) => prev + 1);

      setMessage("Task created successfully");

      setTimeout(() => {
        setMessage("");
      }, 2000);

      setIsDropdownOpen(false);
    } catch (err) {
      console.error("Failed to create task", err);
    }
  };

  const formatEmailList = (users) => {
    if (!users) return "";
    const userArray = Array.isArray(users) ? users : [users];
    return userArray.map(u => {
      if (typeof u === "string") return u;
      const name = formatUser(u, "name");
      const email = formatUser(u, "email");
      if (name && email && name !== email) {
        return `${name} <${email}>`;
      }
      return email || name || "";
    }).filter(Boolean).join(", ");
  };

  const directUserEmail = sessionStorage.getItem("user_email");
  const currentUser = JSON.parse(sessionStorage.getItem("user") || "{}");
  const myEmail = (directUserEmail || currentUser?.user_email || currentUser?.email || "").toLowerCase();
  
  const getEmailString = (u) => {
    if (!u) return "";
    if (typeof u === "string") return u.toLowerCase();
    return (u.email || "").toLowerCase();
  };
  
  const senderEmailStr = getEmailString(Array.isArray(mail?.from) ? mail.from[0] : mail?.from);
  const isSender = myEmail && senderEmailStr && myEmail === senderEmailStr;
console.log("Selected Mail", mail); 
console.log("TO:", mail.to);
console.log("CC:", mail.cc);
console.log("BCC:", mail.bcc);
console.log("FROM:", mail.from);
  return (
    <div className="flex flex-col flex-1 min-h-0 w-[672px] mr-[25px] mt-[9px] overflow-hidden ">
      {showLabelPopup && (
        <LabelAs
          onClose={() => setShowLabelPopup(false)}
          defaultLabelsVisibility={defaultLabelsVisibility}
          setDefaultLabelsVisibility={setDefaultLabelsVisibility}
          customLabels={customLabels}
          setCustomLabels={setCustomLabels}
          mailId={mail?.id}
          onLabelApplied={(labels) => {
            setSelectedMail({ ...mail, labels });
            onMailMovedToLabel?.(mail?.id);
            setMessage("Label applied successfully");
            setTimeout(() => {
              setMessage("");
            }, 2000);
          }}
        />
      )}

      {/*Top toolbar */}
      <div className="w-[672px] h-[45px] shrink-0 bg-[#040B23] px-[16px] flex items-center gap-[128px] rounded-[4px] relative z-20">
        <div className="flex flex-row w-[164px] h-[16px] gap-[21px] ">
          <ArchiveIcon
            className="cursor-pointer transition-transform hover:scale-110"
            isArchived={selectedMailbox === "archived"}
            onClick={() =>
              selectedMailbox === "archived"
                ? onUnarchive(mail.id)
                : onArchive(mail.id)
            }
          />

          {/* SNOOZE COMPONENT WITH UNSNOOZE BUTTON */}
          <div className="flex items-center gap-[10px]">
            <Snooze mailId={mail.id} onSnooze={onSnooze} />
            {selectedMailbox === "snoozed" && (
              <button
                onClick={() => onSnooze(mail.id, null)}
                className="flex items-center justify-center h-[22px] px-[8px] rounded-[4px] border border-[#FFFFFF] inter-regular text-[10px] text-[#FFFFFF] hover:bg-[#FFFFFF1A] transition-colors cursor-pointer"
              >
                Unsnooze
              </button>
            )}
          </div>

          <TodolistBellIcon
            size={15}
            isMuted
            className="transition-all duration-300"
            color="white"
          />
          {/* <svg
            width="13"
            height="15"
            viewBox="0 0 13 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            onClick={() => {
              if (selectedMailbox === "trash") {
                onRestore(mail.id);
              } else {
                onDelete(mail.id);
              }
            }}
            className="cursor-pointer transition-transform hover:scale-110"
          >
            <path
              d="M11.5 2.83333L11.0867 9.51667C10.9813 11.224 10.9287 12.078 10.5 12.692C10.2884 12.9954 10.0159 13.2515 9.7 13.444C9.062 13.8333 8.20667 13.8333 6.496 13.8333C4.78267 13.8333 3.926 13.8333 3.28667 13.4433C2.97059 13.2505 2.69814 12.9939 2.48667 12.69C2.05867 12.0753 2.00667 11.22 1.904 9.51L1.5 2.83333M0.5 2.83333H12.5M9.204 2.83333L8.74867 1.89467C8.44667 1.27067 8.29533 0.959333 8.03467 0.764667C7.97676 0.721544 7.91545 0.683195 7.85133 0.65C7.56267 0.5 7.216 0.5 6.52333 0.5C5.81267 0.5 5.45733 0.5 5.16333 0.656C5.09834 0.690807 5.03635 0.730945 4.978 0.776C4.71467 0.978 4.56733 1.30133 4.27267 1.94733L3.86867 2.83333"
              stroke="white"
              strokeLinecap="round"
            />
            {selectedMailbox === "trash" && (
              <line
                x1="1"
                y1="14"
                x2="12"
                y2="1"
                stroke="white"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            )}
          </svg> */}
          <TrashIcon
            size={15}
            isDeleted={selectedMailbox === "trash"}
            color="white"
            className="cursor-pointer transition-transform hover:scale-110"
            onClick={() => {
              if (selectedMailbox === "trash") {
                onRestore(mail.id);
              } else {
                onDelete(mail.id);
              }
            }}
          />
          {/* Dropdown Menu Wrapper */}
          <div
            className="relative flex items-center justify-center"
            ref={dropdownRef}
          >
            <VerticalThreeDotsIcon
              className="cursor-pointer text-white transition-transform hover:scale-110"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            />
            {/* The Dropdown Panel */}
            {isDropdownOpen && (
              <div className="absolute top-[20px] left-0 z-50 w-[240px] bg-white rounded-[12px] shadow-[0px_4px_24px_rgba(0,0,0,0.15)] border border-[#EAEAEA] py-[8px] flex flex-col gap-[2px]">
                {/* Pin this message */}
                <div
                  onClick={handlePin}
                  className="px-[16px] py-[10px] flex flex-row items-center gap-[12px] hover:bg-[#F5F5F5] cursor-pointer transition-colors"
                >
                  <PinIcon className="cursor-pointer" />
                  <span className="inter-regular text-[14px] text-[#040B23]">
                    {mail.is_important
                      ? "Unpin this message"
                      : "Pin this message"}
                  </span>
                </div>

                {/* Move to folder */}
                <div className="px-[16px] py-[10px] flex flex-row items-center gap-[12px] hover:bg-[#F5F5F5] cursor-pointer transition-colors">
                  <FolderIcon className="cursor-pointer" />
                  <span className="inter-regular text-[14px] text-[#040B23]">
                    Move to folder
                  </span>
                </div>

                {/* Add to tasks */}
                <div
                  onClick={handleAddToTask}
                  className="px-[16px] py-[10px] flex flex-row items-center gap-[12px] hover:bg-[#F5F5F5] cursor-pointer transition-colors"
                >
                  <CheckListIcon className="cursor-pointer" />
                  <span className="inter-regular text-[14px] text-[#040B23]">
                    Add to tasks
                  </span>
                </div>

                {/* Create event */}
                {/* <div className="px-[16px] py-[10px] flex flex-row items-center gap-[12px] hover:bg-[#F5F5F5] cursor-pointer transition-colors">
                  <CreateEventCalendarIcon className="cursor-pointer" />
                  <span className="inter-regular text-[14px] text-[#040B23]">
                    Create event
                  </span>
                </div> */}
                <CreateEventAction
                  mail={mail}
                  setIsDropdownOpen={setIsDropdownOpen}
                />

                <div className="h-[1px] w-full bg-[#EAEAEA] my-[4px]"></div>

                {/* Category as */}
                <div
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setShowLabelPopup(true);
                  }}
                  className="px-[16px] py-[10px] flex flex-row items-center gap-[12px] hover:bg-[#F5F5F5] cursor-pointer transition-colors"
                >
                  <LabelAsIcon className="cursor-pointer" />
                  <span className="inter-regular text-[14px] text-[#040B23]">
                    Label as
                  </span>
                </div>

                {/* Report junk or spam */}
                {selectedMailbox === "junk" ? (
                  <div
                    onClick={() => {
                      setIsDropdownOpen(false);
                      if (onNotJunk) {
                        onNotJunk(mail.id);
                      }
                    }}
                    className="px-[16px] py-[10px] flex flex-row items-center gap-[12px] hover:bg-[#F5F5F5] cursor-pointer transition-colors"
                  >
                    <ReportIcon className="cursor-pointer" />
                    <span className="inter-regular text-[14px] text-[#040B23]">
                      Not Junk
                    </span>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setIsDropdownOpen(false);
                      if (onReportJunk) {
                        onReportJunk(mail.id);
                      }
                    }}
                    className="px-[16px] py-[10px] flex flex-row items-center gap-[12px] hover:bg-[#F5F5F5] cursor-pointer transition-colors"
                  >
                    <ReportIcon className="cursor-pointer" />
                    <span className="inter-regular text-[14px] text-[#040B23]">
                      Report Junk
                    </span>
                  </div>
                )}

                {/* Print */}
                <div
                  onClick={handlePrint}
                  className="px-[16px] py-[10px] flex flex-row items-center gap-[12px] hover:bg-[#F5F5F5] cursor-pointer transition-colors"
                >
                  <PrinterIcon />
                  <span className="inter-regular text-[14px] text-[#040B23]">
                    Print
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-row items-center justify-between w-[89px] h-[12px] gap-[12px] ">
          <ChevronLeftIcon
            onClick={goPrev}
            className={`cursor-pointer text-white transition-transform hover:scale-110 ${
              currentIndex === 0 ? "opacity-40 pointer-events-none" : ""
            }`}
          />
          <span className="inter-regular text-[10px] text-[#FFFFFF]">
            {currentIndex + 1} / {totalCount}
          </span>
          <ChevronRightIcon
            onClick={goNext}
            className={`cursor-pointer text-white transition-transform hover:scale-110 ${
              currentIndex === mails.length - 1
                ? "opacity-40 pointer-events-none"
                : ""
            }`}
          />
        </div>

        <div className="flex flex-row items-center justify-center w-[132px] h-[29px] gap-[18px] ">
          {selectedMailbox === "inbox" && (
            <button
              className="flex items-center justify-center w-[98px] h-[29px] rounded-[4px] border border-[#FFFFFF] inter-regular text-[10px] text-[#FFFFFF]"
              onClick={() => onToggleRead(mail.id)}
            >
              {(mail.isRead !== undefined ? mail.isRead : mail.is_read)
                ? "Mark as unread"
                : "Mark as read"}
            </button>
          )}
          <StarIcon
            isActive={mail.is_favorite}
            onClick={() => onToggleStar(mail.id)}
            className="cursor-pointer transition-transform hover:scale-110 transition-transform active:scale-125"
          />
        </div>
      </div>

      <div className="relative w-[672px] flex-1 min-h-0 overflow-hidden mt-[10px] rounded-[6px] bg-white border border-[#EAEAEA]">
        <div className="h-full overflow-y-auto px-[30px] pt-[30px] pb-[200px] scrollbar-hide">
          <div className=" flex flex-col max-w-[612px]">
            {/* <div className="flex items-start gap-[8px] max-w-[562px]">
              <img
                src={profileimage}
                alt="Profile"
                className="w-[36px] h-[36px] rounded-full mt-1"
              />
              <div className="flex flex-col flex-1">
                <span className="inter-bold text-[10px]">
                  {" "}
                  {selectedMailbox === "sent"
                    ? mail.sender_name
                    : // formatUser(mail.to, "name")
                      formatUser(mail.from, "name")}
                </span>
                <span className="inter-regular text-[10px]">
                  {selectedMailbox === "sent"
                    ?  mail.sender?.email: formatUser(mail.to, "email") ||
                      formatUser(mail.from, "name")}{" "}
                </span>
                <MailRecipients mail={mail} selectedMailbox={selectedMailbox}/>
              </div>
            </div> */}
            <div className="flex flex-col">
              <MailSenderInfo mail={mail} />

              <MailRecipients mail={mail} showBcc={isSender} />
            </div>
            <div className="mt-[24px] max-w-[612px]">
              <h1 className="inter-semibold text-[22px] leading-[30px] break-words">
                <HighlightText text={mail.subject} highlight={searchQuery} />
              </h1>
            </div>

            <div
              className="mt-[16px] w-[612px] inter-regular text-[11px] text-[#5E5E5E] leading-[22px] whitespace-pre-line"
              dangerouslySetInnerHTML={{
                __html: highlightHTML(
                  DOMPurify.sanitize(mail.body || mail.snippet || ""),
                  searchQuery,
                ),
              }}
            />
            {/* {StripHtml(mail.body || mail.snippet || "")} */}
            {/* </div> */}
          </div>

          {mail?.attachments && mail?.attachments?.length > 0 && (
            <div className="flex flex-row justify-between w-full max-w-[612px] h-[23px] mt-[13px]">
              <span className="inter-bold text-[14px] leading-[23px]">
                Attachments ({mail.attachments.length})
              </span>
              {mail?.attachments?.length > 1 && (
                <button
                  onClick={downloadAllAttachments}
                  disabled={downloadingAll}
                  className="inter-regular text-[12px] leading-[23px] text-[#6231A5] cursor-pointer"
                >
                  {downloadingAll ? "Downloading..." : "Download all"}
                </button>
              )}
            </div>
          )}

          {mail?.attachments && mail.attachments.length > 0 && (
            <div className="flex flex-wrap gap-[12px] mt-[10px]">
              <div className="flex flex-wrap gap-[12px] mt-[10px]">
                {mail.attachments?.map((att) => {
                  const fileName = att?.filename?.split("/")?.pop() || "file";
                  const fileUrl = att?.url;
                  const ext = fileName.split(".").pop()?.toLowerCase() || "";
                  const isImage = [
                    "png",
                    "jpg",
                    "jpeg",
                    "gif",
                    "webp",
                  ].includes(ext);

                  return (
                    <div
                      key={fileName}
                      className="flex gap-[10px] w-[164px] h-[63px] rounded-[6px] border border-[#040B2308] bg-[#F0F1F8] p-[8px]"
                    >
                      {/* Preview */}
                      <div className="w-[43px] h-[43px] rounded-[6px] overflow-hidden bg-white flex items-center justify-center shrink-0">
                        {isImage ? (
                          <img
                            src={att.url}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[20px]">📄</span>
                        )}
                      </div>

                      {/* Right side content */}
                      <div className="flex flex-col gap-[3px] w-[68px]">
                        {/* File name */}
                        <span className="text-[10px] inter-semibold leading-[12px] line-clamp-2 break-all truncate">
                          {fileName}
                        </span>

                        {/* File size */}
                        <span className="text-[9px] leading-[11px] text-[#7E7E7E] inter-regular">
                          {att?.size
                            ? (att.size / 1024).toFixed(0) + " kb"
                            : "—"}
                        </span>

                        {/* Download icon */}
                        <button
                          onClick={() => downloadFile(att)}
                          className="flex items-start justify-start cursor-pointer"
                        >
                          <AttachmentDownloadIcon />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* DYNAMIC FOOTER CONTAINER */}
        <div
          className={`${
            replyMode
              ? "relative mt-[32px] mb-[40px] w-[612px] h-auto mx-auto"
              : "sticky top-[15px] bottom-[-5px] left-[28px] right-[30px] w-[614px] h-[152px] rounded-[6px] border border-[#EAEAEA] bg-[#FFFFFF] px-[20px] py-[12px] gap-[10px]"
          } flex flex-col transition-all duration-300`}
          style={!replyMode ? { boxShadow: "0px -4px 22px 0px rgba(233, 231, 231, 0.48)" } : {}}
        >
          <div className="mx-auto w-full max-w-[614px] flex flex-col gap-[10px] h-full justify-between">
            {!replyMode ? (
              <>
                {/* STATE 1: Closed (Showing default placeholder layout) */}
                <div className="text-[11px] text-[#7E7E7E] w-[558px] flex flex-col items-start justify-center gap-[12px]">
                  <MoreOptionsIcon className="cursor-pointer transition-transform hover:scale-110" />
                  <div className="w-full max-w-[558px] border rounded-[6px] border-[#D9D9D9] px-[24px] py-[15px] inter-regular text-[11px] text-[#7E7E7E] mt-[4px]">
                    Click here to
                    <span
                      onClick={() => setReplyMode("reply")}
                      className="text-[#6A37F5] cursor-pointer ml-1 hover:underline font-medium"
                    >
                      Reply
                    </span>
                    ,
                    <span
                      onClick={() => setReplyMode("reply_all")}
                      className="text-[#6A37F5] cursor-pointer ml-1 hover:underline font-medium"
                    >
                      Reply all
                    </span>{" "}
                    or
                    <span
                      onClick={() => setReplyMode("forward")}
                      className="text-[#6A37F5] cursor-pointer ml-1 hover:underline font-medium"
                    >
                      Forward
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#F9F9F9]">
                  <div className="flex gap-[10px]">
                    <DocumentActionIcon className="cursor-pointer transition-transform hover:scale-110" />
                    <ImageActionIcon className="cursor-pointer transition-transform hover:scale-110" />
                  </div>

                  <button
                    onClick={() => setReplyMode("reply")}
                    className="w-[70px] h-[28px] rounded-[14px] bg-[#6231A5] text-white text-[11px] cursor-pointer hover:bg-[#522590] transition-colors"
                  >
                    Send
                  </button>
                </div>
              </>
            ) : (
              /* STATE 2: Open (Becomes relative inline element below the email content) */
              <div className="w-full flex flex-col min-h-0 overflow-visible">
                <div
                  ref={replyScrollRef}
                  className="w-full flex justify-start pb-[20px]"
                >
                  <InlineReplyEditor
                    mode={replyMode}
                    mail={mail}
                    onDiscard={() => setReplyMode(null)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};