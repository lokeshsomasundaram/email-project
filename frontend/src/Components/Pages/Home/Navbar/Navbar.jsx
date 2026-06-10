import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setSearchState } from "../../../../store/slices/searchSlice";
 
import profileimg from "../../../../assets/images/profileimg.png";
import profileimg1 from "../../../../assets/images/profileimg1.png";
import profileimg2 from "../../../../assets/images/profileimg2.png";
import { getUserProfile, getInboxMails, getChatRooms, getRoomMessages, listEventsForDay, listEventsForWeek, getMyDriveFiles, getSharedWithMe, getSnoozedMails } from "../../../../api/api";
import ProfileDropdown from "./ProfileDropdown";
import { ArrowIcon, CalendarIcon, ChatsIcon, DriveIcon, MessageIcon, SearchIcon, SettingsIcon, TodolistBellIcon } from "../../../../assets/icons/IconRegistry";
import Settings from "../../Settings/Settings";
import { statusTextColor } from "../../../../constants/StatusList";
import { StatusIcon } from "../../../../assets/icons/IconRegistry";
import { NotificationDropdown } from "./NotificationDropdown";
import { dispatchNewMailEvent } from "../SoundNotificationManager";
 

 
const DropdownArrowIcon = ({ isOpen }) => (
<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white/70" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
<polyline points="6 9 12 15 18 9"></polyline>
</svg>
);
 
export const Navbar = () => {
  const [profile, setProfile] = useState({
    name: "",
    img: profileimg,
    email: "",
  });
  const [loading, setLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const profileRef = useRef(null);
  const currentStatus = useSelector((state) => state.status.currentStatus);
  const dispatch = useDispatch(); 
  const navigate = useNavigate();
  const location = useLocation();
 
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(""); 
  const searchDropdownRef = useRef(null);
 
  const getInitialSearchOption = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/drive')) return "Drive";
    if (path.includes('/chat')) return "Chat";
    if (path.includes('/calendar')) return "Calendar";
    return "Mail";
  };
  const [selectedSearchOption, setSelectedSearchOption] = useState(getInitialSearchOption());
 
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes("/drive")) {
      setSelectedSearchOption("Drive");
    } else if (path.includes("/chat")) {
      setSelectedSearchOption("Chat");
    } else if (path.includes("/calendar")) {
      setSelectedSearchOption("Calendar");
    } else {
      setSelectedSearchOption("Mail");
    }
  }, [location.pathname]);
 
  const searchOptions = [
    { label: "Mail", icon: /*<DropdownMailIcon />*/ <MessageIcon color="#8D8D8D" size={16}/> },
    { label: "Calendar", icon: /*<DropdownCalendarIcon />*/ <CalendarIcon color="#8D8D8D" size={16}/>},
    { label: "Chat", icon: /*<DropdownChatIcon />*/ <ChatsIcon color="#8D8D8D" size={16}/> },
    { label: "Drive", icon: /*<DropdownDriveIcon />*/ <DriveIcon color="#8D8D8D" size={16}/> },
  ];
 
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getUserProfile();
        let username = "User";
        if (data) {
          if (data.first_name && data.last_name) {
            username = `${data.first_name} ${data.last_name}`;
          } else if (data.first_name) {
            username = data.first_name;
          } else if (data.email) {
            username = data.email.split("@")[0];
          }
        }
        let profileImage = profileimg;
        if (data) {
          profileImage = data.profile_picture || data.avatar || profileimg;
        }
        setProfile({ name: username, img: profileImage, email: data?.email || "" });
      } catch (error) {
        setProfile({ name: "User", img: profileimg });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);
 
  const profileDropdownHandler = (e) => {
    e.stopPropagation();
    setDropdownOpen(!dropdownOpen);
  };
  const [showSettings, setShowSettings] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState('Profile');
 
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!profile.email) return;
    const userKey = profile.email;
    const storageKey = `stackly_notifications_${userKey}`;

    const handleStorageChange = (e) => {
      if (e.key === storageKey) {
        try {
          setNotifications(JSON.parse(e.newValue || "[]"));
        } catch {}
      }
    };
    
    // Load initial notifications for this user
    try {
      const stored = localStorage.getItem(storageKey);
      setNotifications(stored ? JSON.parse(stored) : []);
    } catch {
      setNotifications([]);
    }

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [profile.email]);

  useEffect(() => {
    if (!profile.email) return;

    const checkNewItems = async () => {
      try {
        const userKey = profile.email;
        const notifKey = `stackly_notifications_${userKey}`;
        const mailKey = `stackly_notified_mail_ids_${userKey}`;
        const chatKey = `stackly_notified_chat_ids_${userKey}`;
        const calKey = `stackly_notified_calendar_ids_${userKey}`;
        const driveKey = `stackly_notified_drive_ids_${userKey}`;

        let currentNotifications = [];
        try {
          const stored = localStorage.getItem(notifKey);
          currentNotifications = stored ? JSON.parse(stored) : [];
        } catch {}

        let notifiedMailIds = [];
        try {
          const stored = localStorage.getItem(mailKey);
          notifiedMailIds = stored ? JSON.parse(stored) : [];
        } catch {}

        let notifiedChatIds = [];
        try {
          const stored = localStorage.getItem(chatKey);
          notifiedChatIds = stored ? JSON.parse(stored) : [];
        } catch {}

        let notifiedCalendarIds = [];
        try {
          const stored = localStorage.getItem(calKey);
          notifiedCalendarIds = stored ? JSON.parse(stored) : [];
        } catch {}

        let notifiedDriveIds = [];
        try {
          const stored = localStorage.getItem(driveKey);
          notifiedDriveIds = stored ? JSON.parse(stored) : [];
        } catch {}

        let newNotifs = [...currentNotifications];
        let hasChanges = false;
        let inboxList = [];

        // 1. Fetch unread emails
        try {
          const emailResponse = await getInboxMails();
          inboxList = emailResponse.data || [];
          const unreadMails = inboxList.filter(mail => {
            const isUnread = !(mail.isRead !== undefined ? mail.isRead : mail.is_read);
            return isUnread;
          });

          unreadMails.forEach(mail => {
            const mailId = String(mail.id || mail.mail_id || mail.email_id);
            if (!notifiedMailIds.includes(mailId)) {
              let senderName = "Someone";
              const sender = mail.from || mail.sender || mail.sender_email || "";
              if (typeof sender === "object") {
                senderName = `${sender.first_name || ""} ${sender.last_name || ""}`.trim() || sender.email || "Someone";
              } else if (typeof sender === "string") {
                senderName = sender.split("@")[0] || sender;
              }
              const dateObj = new Date(mail.date || mail.created_at);
              const formattedTime = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const notif = {
                id: `mail-${mailId}`,
                module: "mail",
                actionType: "new_email",
                user: senderName,
                avatar: profileimg1,
                statusColor: "bg-blue-400",
                time: formattedTime,
                actionPrefix: senderName,
                action: "sent you an email:",
                target: mail.subject || "(No Subject)",
                type: "mail",
                mailId: mailId,
                isRead: false,
                timestamp: dateObj.getTime()
              };
              newNotifs.unshift(notif);
              notifiedMailIds.push(mailId);
              hasChanges = true;
            }
          });
        } catch (e) {
          console.error("Error polling mails:", e);
        }

        // 1b. Check for snoozed emails returning to inbox
        try {
          const snoozeKey = `stackly_snoozed_mail_ids_${userKey}`;
          let previouslySnoozedIds = [];
          let isFirstRun = false;
          try {
            const stored = localStorage.getItem(snoozeKey);
            if (stored === null) {
              isFirstRun = true;
            }
            previouslySnoozedIds = stored ? JSON.parse(stored) : [];
          } catch {}

          const snoozedResponse = await getSnoozedMails();
          const snoozedMails = snoozedResponse.data || snoozedResponse || [];
          const currentSnoozedIds = snoozedMails.map(mail => String(mail.id || mail.mail_id || mail.email_id));

          if (!isFirstRun && previouslySnoozedIds.length > 0) {
            previouslySnoozedIds.forEach(mailId => {
              if (!currentSnoozedIds.includes(mailId)) {
                // The mail is no longer snoozed. Check if it's currently in the inbox.
                const returnedMail = inboxList.find(mail => String(mail.id || mail.mail_id || mail.email_id) === mailId);
                if (returnedMail) {
                  let senderName = "Someone";
                  const sender = returnedMail.from || returnedMail.sender || returnedMail.sender_email || "";
                  if (typeof sender === "object") {
                    senderName = `${sender.first_name || ""} ${sender.last_name || ""}`.trim() || sender.email || "Someone";
                  } else if (typeof sender === "string") {
                    senderName = sender.split("@")[0] || sender;
                  }
                  const dateObj = new Date(returnedMail.date || returnedMail.created_at || Date.now());
                  const formattedTime = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  // Generate custom snooze reminder notification
                  const notif = {
                    id: `snooze-reminder-${mailId}-${Date.now()}`,
                    module: "mail",
                    actionType: "snoozed_mail_reminder",
                    user: senderName,
                    avatar: profileimg1,
                    statusColor: "bg-yellow-400",
                    time: formattedTime,
                    actionPrefix: "Snooze ended:",
                    action: `Email from ${senderName}`,
                    target: returnedMail.subject || "(No Subject)",
                    type: "mail",
                    mailId: mailId,
                    isRead: false,
                    timestamp: Date.now()
                  };

                  newNotifs.unshift(notif);
                  hasChanges = true;

                  // Make sure this mail ID is also marked as notified so it doesn't trigger standard "new_email" notif
                  if (!notifiedMailIds.includes(mailId)) {
                    notifiedMailIds.push(mailId);
                  }

                  // Dispatch new mail event to trigger notification sound
                  dispatchNewMailEvent();
                }
              }
            });
          }

          // Save the current snoozed mail IDs for the next poll
          localStorage.setItem(snoozeKey, JSON.stringify(currentSnoozedIds));
        } catch (e) {
          console.error("Error checking snoozed mail notifications:", e);
        }

        // 2. Fetch unread chat messages
        try {
          const chatRooms = await getChatRooms();
          const roomsData = Array.isArray(chatRooms)
            ? chatRooms
            : chatRooms?.data || chatRooms?.rooms || [];

          for (const room of roomsData) {
            if (Number(room.unread_count) > 0) {
              const roomId = room.id || room._id;
              const messages = await getRoomMessages(roomId);
              if (messages && messages.length > 0) {
                const latestMsg = [...messages].reverse().find(msg => {
                  const senderEmail = msg.sender_email || msg.sender?.email || "";
                  return senderEmail.toLowerCase() !== profile.email.toLowerCase();
                });
                if (latestMsg) {
                  const msgId = String(latestMsg.id);
                  if (!notifiedChatIds.includes(msgId)) {
                    let senderName = "Someone";
                    const sender = latestMsg.sender || "";
                    if (typeof sender === "object") {
                      senderName = `${sender.first_name || ""} ${sender.last_name || ""}`.trim() || sender.email || "Someone";
                    } else if (latestMsg.sender_first_name || latestMsg.sender_last_name) {
                      senderName = `${latestMsg.sender_first_name || ""} ${latestMsg.sender_last_name || ""}`.trim();
                    } else {
                      senderName = latestMsg.sender_email?.split("@")[0] || "Someone";
                    }
                    const dateObj = new Date(latestMsg.timestamp);
                    const formattedTime = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                    const notif = {
                      id: `chat-${msgId}`,
                      module: "chat",
                      actionType: "direct_message",
                      user: senderName,
                      avatar: profileimg2,
                      statusColor: "bg-green-400",
                      time: formattedTime,
                      actionPrefix: senderName,
                      action: "sent you a message:",
                      target: latestMsg.content || "Attachment 📎",
                      type: "chat",
                      roomId: roomId,
                      isRead: false,
                      timestamp: dateObj.getTime()
                    };
                    newNotifs.unshift(notif);
                    notifiedChatIds.push(msgId);
                    hasChanges = true;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("Error polling chats:", e);
        }

        // 3. Fetch today's calendar events (upcoming reminders)
        try {
          const todayStr = new Date().toISOString().split("T")[0];
          const calResponse = await listEventsForDay(todayStr);
          const events = calResponse?.data || calResponse || [];
          const eventList = Array.isArray(events) ? events : (events?.events || events?.data || []);
          const now = Date.now();
          eventList.forEach(event => {
            const eventId = String(event.id || event.event_id);
            if (!notifiedCalendarIds.includes(eventId)) {
              const startTime = event.start_time || event.start || event.starts_at;
              const eventStart = startTime ? new Date(startTime) : new Date();
              const diffMs = eventStart.getTime() - now;
              const diffMin = Math.floor(diffMs / 60000);
              // Notify for events within next 60 min or events created today
              const isUpcoming = diffMin >= 0 && diffMin <= 60;
              const isCreatedToday = event.created_at ? new Date(event.created_at).toDateString() === new Date().toDateString() : false;
              if (!isUpcoming && !isCreatedToday) return;
              const actionType = isUpcoming ? "meeting_reminder" : "event_created";
              const timeLabel = isUpcoming
                ? (diffMin === 0 ? "starting now" : `in ${diffMin} min`)
                : eventStart.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const notif = {
                id: `calendar-${eventId}`,
                module: "calendar",
                actionType,
                user: "Calendar",
                avatar: profileimg,
                statusColor: isUpcoming ? "bg-purple-400" : "bg-green-400",
                time: timeLabel,
                actionPrefix: isUpcoming ? "Reminder:" : "New event:",
                action: event.title || event.name || "Untitled Event",
                target: isUpcoming ? `starts ${timeLabel}` : "",
                type: "calendar",
                eventId,
                isRead: false,
                timestamp: eventStart.getTime()
              };
              newNotifs.unshift(notif);
              notifiedCalendarIds.push(eventId);
              hasChanges = true;
            }
          });
        } catch (e) {
          console.error("Error polling calendar:", e);
        }

        // 4. Fetch recently uploaded/shared Drive files
        try {
          const [myFilesRes, sharedRes] = await Promise.allSettled([
            getMyDriveFiles(),
            getSharedWithMe(),
          ]);
          const myFiles = myFilesRes.status === "fulfilled"
            ? (myFilesRes.value?.data || myFilesRes.value || [])
            : [];
          const sharedFiles = sharedRes.status === "fulfilled"
            ? (sharedRes.value?.data || sharedRes.value || [])
            : [];
          const myFileList = Array.isArray(myFiles) ? myFiles : (myFiles?.files || myFiles?.data || []);
          const sharedFileList = Array.isArray(sharedFiles) ? sharedFiles : (sharedFiles?.files || sharedFiles?.data || []);

          // Notify for files uploaded/shared in the last 30 minutes
          const cutoff = Date.now() - 30 * 60 * 1000;

          myFileList.forEach(file => {
            const fileId = String(file.id || file.file_id);
            if (!notifiedDriveIds.includes(`my-${fileId}`)) {
              const createdAt = file.created_at || file.uploaded_at || file.date;
              if (!createdAt) return;
              const fileDate = new Date(createdAt);
              if (fileDate.getTime() < cutoff) return;
              const formattedTime = fileDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const notif = {
                id: `drive-my-${fileId}`,
                module: "drive",
                actionType: "file_uploaded",
                user: "Drive",
                avatar: profileimg,
                statusColor: "bg-orange-400",
                time: formattedTime,
                actionPrefix: "You",
                action: "uploaded",
                target: file.name || file.filename || "a file",
                type: "drive",
                fileId,
                isRead: false,
                timestamp: fileDate.getTime()
              };
              newNotifs.unshift(notif);
              notifiedDriveIds.push(`my-${fileId}`);
              hasChanges = true;
            }
          });

          sharedFileList.forEach(file => {
            const fileId = String(file.id || file.file_id);
            if (!notifiedDriveIds.includes(`shared-${fileId}`)) {
              const sharedAt = file.shared_at || file.created_at || file.date;
              if (!sharedAt) return;
              const fileDate = new Date(sharedAt);
              if (fileDate.getTime() < cutoff) return;
              const sharedBy = file.shared_by_name || file.owner_name ||
                (file.shared_by_email ? file.shared_by_email.split("@")[0] : "Someone");
              const formattedTime = fileDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              const notif = {
                id: `drive-shared-${fileId}`,
                module: "drive",
                actionType: "file_shared",
                user: sharedBy,
                avatar: profileimg1,
                statusColor: "bg-orange-400",
                time: formattedTime,
                actionPrefix: sharedBy,
                action: "shared",
                target: file.name || file.filename || "a file",
                type: "drive",
                fileId,
                isRead: false,
                timestamp: fileDate.getTime()
              };
              newNotifs.unshift(notif);
              notifiedDriveIds.push(`shared-${fileId}`);
              hasChanges = true;
            }
          });
        } catch (e) {
          console.error("Error polling drive:", e);
        }

        if (hasChanges) {
          // Sort all by timestamp descending
          newNotifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          // Keep max 50
          const trimmed = newNotifs.slice(0, 50);
          setNotifications(trimmed);
          localStorage.setItem(notifKey, JSON.stringify(trimmed));
          localStorage.setItem(mailKey, JSON.stringify(notifiedMailIds));
          localStorage.setItem(chatKey, JSON.stringify(notifiedChatIds));
          localStorage.setItem(calKey, JSON.stringify(notifiedCalendarIds));
          localStorage.setItem(driveKey, JSON.stringify(notifiedDriveIds));
        }
      } catch (err) {
        console.error("Background checking failed:", err);
      }
    };

    // Run check immediately, then poll every 15s
    checkNewItems();
    const interval = setInterval(checkNewItems, 15000);
    return () => clearInterval(interval);
  }, [profile.email]);

  const handleClearAll = () => {
    if (!profile.email) return;
    const userKey = profile.email;
    const notifKey = `stackly_notifications_${userKey}`;
    setNotifications([]);
    localStorage.setItem(notifKey, JSON.stringify([]));
  };

  const handleNotificationClick = (notif) => {
    if (!profile.email) return;
    const userKey = profile.email;
    const notifKey = `stackly_notifications_${userKey}`;

    const updated = notifications.filter(n => n.id !== notif.id);
    setNotifications(updated);
    localStorage.setItem(notifKey, JSON.stringify(updated));

    const module = notif.module || notif.type;
    if (module === "mail" && notif.mailId) {
      sessionStorage.setItem("selected_mail_id", notif.mailId);
      window.dispatchEvent(new Event("stackly_mail_selected"));
      navigate("/home");
    } else if (module === "chat" && notif.roomId) {
      navigate(`/chat/${notif.roomId}`);
    } else if (module === "calendar") {
      navigate("/calendar");
    } else if (module === "drive") {
      navigate("/drive");
    } else if (module === "mail") {
      navigate("/home");
    }
    setNotificationOpen(false);
    setShowSettings(false);
  };
 
  return (
<>
      {showSettings && (
<div className="fixed inset-0 bg-[#00000040] z-50 flex items-center justify-center" onClick={() => setShowSettings(false)}>
<div onClick={(e) => e.stopPropagation()}>
<Settings onClose={() => setShowSettings(false)} defaultTab={settingsDefaultTab} />
</div>
</div>
      )}
<header className="w-full h-[67px] px-[42px] bg-[#040B23] flex items-center justify-between text-white">
<div className="h-full flex items-center w-full">
<div className="w-[100px]">
<span className="krona-one-regular text-[#FFFFFF] text-[12px]">STACKLY</span>
</div>
<div className="flex items-center">
<div className="flex items-center h-[28px] w-[302px] rounded-[6px] ml-[20px] bg-white/10 border border-white/20 group relative" ref={searchDropdownRef}>
<div 
                className="flex items-center justify-center px-[10px] gap-[8px] cursor-pointer"
                onClick={() => setSearchDropdownOpen(!searchDropdownOpen)}
>
<SearchIcon color="#8D8D8D"/>
<span className="text-white/70 text-[13px] outline-none select-none">{selectedSearchOption}</span>
<DropdownArrowIcon isOpen={searchDropdownOpen} />
</div>
 
              {searchDropdownOpen && (
<div className="absolute top-[35px] left-0 w-[140px] bg-white rounded-[8px] shadow-[0px_4px_20px_0px_#00000014] py-2 z-50">
                  {searchOptions.map((option, index) => (
<div 
                      key={index}
                      className="flex items-center px-4 py-[10px] gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        setSelectedSearchOption(option.label);
                        setSearchDropdownOpen(false);
                        const moduleMap = { "Mail": "mail", "Chat": "chats", "Drive": "drive", "Calendar": "calendar" };
                        if (searchInput.trim() !== "" && moduleMap[option.label]) {
                          dispatch(setSearchState({ query: searchInput.trim(), module: moduleMap[option.label], isTriggered: true }));
                        }
                        if (option.label === "Mail") navigate("/home");
                        else if (option.label === "Chat") navigate("/chat");
                        else if (option.label === "Drive") navigate("/drive");
                        else if (option.label === "Calendar") navigate("/calendar");
                      }}
>
<div className="w-[16px] h-[16px] flex items-center justify-center">{option.icon}</div>
<span className="text-[#8D8D8D] text-[13px] inter-medium tracking-wide">{option.label}</span>
</div>
                  ))}
</div>
              )}
<div className="w-px h-4 bg-white/20 border-[#8D8D8D]" />
<input
                type="text"
                placeholder="Search here"
                className="bg-transparent outline-none text-white/70 text-[13px] w-full placeholder:text-white/50 pl-[12px]"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchInput.trim() !== "") {
                    const moduleMap = { "Mail": { module: "mail", route: "/home" }, "Chat": { module: "chats", route: "/chat" }, "Drive": { module: "drive", route: "/drive" }, "Calendar": { module: "calendar", route: "/calendar" } };
                    const target = moduleMap[selectedSearchOption];
                    if (target) {
                      dispatch(setSearchState({ query: searchInput.trim(), module: target.module, isTriggered: true }));
                      navigate(target.route);
                    }
                  }
                }}
              />
</div>
</div>
<div className="flex items-center ml-auto gap-6">
<div className="relative flex items-center justify-center bell-icon-container">
<div className="cursor-pointer relative" onClick={(e) => { e.stopPropagation(); setNotificationOpen(!notificationOpen); }}>
<TodolistBellIcon size={24} />
{notifications.length > 0 && (
  <span className="absolute -top-1 -right-1 flex h-[16px] w-[16px] items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white border border-[#040B23]">
    {notifications.length}
  </span>
)}
</div>
              {notificationOpen && (
                <NotificationDropdown 
                  onClose={() => setNotificationOpen(false)} 
                  notifications={notifications}
                  onNotificationClick={handleNotificationClick}
                  onClearAll={handleClearAll}
                />
              )}
</div>
<div onClick={() => { setSettingsDefaultTab('Account'); setShowSettings(true); }} className="cursor-pointer">
<SettingsIcon size={24} color="currentColor" />
</div>
<div className="relative" ref={profileRef}>
<div className="flex items-center justify-center w-[179px] h-[44px] rounded-[22px] bg-[#1C1D3B] cursor-pointer" onClick={profileDropdownHandler}>
                {loading ? <div className="w-[28px] h-[28px] rounded-full bg-gray-700 animate-pulse"></div> : (
<div className="flex flex-row items-center justify-between w-[159px] h-[28px] gap-[10px]">
<div className="flex flex-row w-[120px] gap-[5px]">
<img src={profile.img} alt="Profile" className="w-[28px] h-[28px] rounded-full object-cover" onError={(e) => e.target.src = profileimg} />
<div className="flex flex-col">
<span className="inter-bold text-[12px] truncate" title={profile.name}>{profile.name}</span>
<div className="flex items-center gap-[4px]">
<StatusIcon status={currentStatus?.value} size={8} iconSize={4} variant="plain" />
<span className="text-[8px] inter-medium whitespace-nowrap" style={{ color: statusTextColor[currentStatus?.value] }}>{currentStatus?.label}</span>
</div>
</div>
</div>
<ArrowIcon direction={dropdownOpen ? "up" : "down"} />
</div>
                )}
</div>
              {dropdownOpen && <ProfileDropdown profile={profile} onClose={() => setDropdownOpen(false)} openSettings={(tab) => { setSettingsDefaultTab(tab || 'Profile'); setShowSettings(true); }} />}
</div>
</div>
</div>
</header>
</>
  );
};