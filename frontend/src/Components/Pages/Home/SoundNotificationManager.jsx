import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { updateGeneralSettings } from "../../../api/api";

const getSoundPrefKey = () => {
  const user = sessionStorage.getItem("user");
  const userId = user ? JSON.parse(user)?.id || "default" : "default";
  return `sound_notifications_${userId}`;
};

const getDesktopPrefKey = () => {
  const user = sessionStorage.getItem("user");
  const userId = user ? JSON.parse(user)?.id || "default" : "default";
  return `desktop_notifications_${userId}`;
};


export const dispatchNewMailEvent = (mailData = {}) => {
  window.dispatchEvent(new CustomEvent("newMailReceived", { detail: mailData }));
};

export const saveSoundNotificationPref = async (enabled) => {
  sessionStorage.setItem("sound_notifications", JSON.stringify(enabled));
  localStorage.setItem(getSoundPrefKey(), JSON.stringify(enabled));
  window.dispatchEvent(
    new CustomEvent("soundNotificationPrefChanged", { detail: enabled })
  );
  try {
    await updateGeneralSettings({ soundNotifications: enabled });
  } catch (err) {
    console.error("Failed to save sound notification preference:", err);
  }
};

export const getSoundNotificationPref = () => {
  const session = sessionStorage.getItem("sound_notifications");
  if (session !== null) return JSON.parse(session);
  const local = localStorage.getItem(getSoundPrefKey());
  if (local !== null) return JSON.parse(local);
  return true;
};


export const saveDesktopNotificationPref = async (enabled) => {
  localStorage.setItem(getDesktopPrefKey(), JSON.stringify(enabled));
  sessionStorage.setItem("desktop_notifications", JSON.stringify(enabled));
  window.dispatchEvent(
    new CustomEvent("desktopNotificationPrefChanged", { detail: enabled })
  );
  try {
    await updateGeneralSettings({ desktopNotifications: enabled });
  } catch (err) {
    console.error("Failed to save desktop notification preference:", err);
  }
};

export const getDesktopNotificationPref = () => {
  const local = localStorage.getItem(getDesktopPrefKey());
  if (local !== null) return JSON.parse(local);
  const session = sessionStorage.getItem("desktop_notifications");
  if (session !== null) return JSON.parse(session);
  return true;
};

export const requestNotificationPermission = async () => {
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
};

const getRelativeTime = (timestamp) => {
  const now = Date.now();
  const diff = Math.floor((now - timestamp) / 1000); // seconds
  if (diff < 60) return diff <= 1 ? "just now" : `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const StacklyLogo = () => (
  <svg width="120" height="20" viewBox="0 0 120 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text
      x="0"
      y="16"
      fontFamily="Inter, sans-serif"
      fontWeight="800"
      fontSize="16"
      letterSpacing="2"
      fill="#000000"
    >
      STACKLY
    </text>
  </svg>
);

const MailNotificationPopup = ({ notification, onClose }) => {
  const [timeStr, setTimeStr] = useState(() => getRelativeTime(notification.timestamp));
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setVisible(true);
    const interval = setInterval(() => {
      setTimeStr(getRelativeTime(notification.timestamp));
    }, 30000);
    return () => clearInterval(interval);
  }, [notification.timestamp]);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    setLeaving(true);
    setTimeout(() => {
      onClose();
    }, 400);
  }, [onClose]);

  const { sender, subject, body } = notification;

  const plainBody = body
    ? body.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim()
    : "";

  return (
    <div
      className="fixed bottom-8 right-8 w-[400px]"
      style={{
        zIndex: 99999,
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: visible && !leaving ? "translateY(0) scale(1)" : "translateY(30px) scale(0.95)",
        opacity: visible && !leaving ? 1 : 0,
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      <div
        className="relative w-[400px] bg-white rounded-[20px] overflow-hidden"
        style={{ boxShadow: "0 8px 40px rgba(106, 55, 245, 0.18), 0 2px 12px rgba(0,0,0,0.08)" }}
      >
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            top: "-30px",
            left: "-60px",
            width: "520px",
            height: "80px",
            background: "#D8CAFF",
            filter: "blur(38px)",
            zIndex: 0,
          }}
        />

        <div className="relative z-10 p-5">

          <div className="flex items-center justify-between mb-3.5">
            <StacklyLogo />
            <button
              onClick={handleClose}
              className="flex items-center justify-center bg-transparent border-none p-0 cursor-pointer shrink-0"
              aria-label="Close notification"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1L9 9M9 1L1 9" stroke="#888888" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="font-bold text-base leading-6 text-black mb-0.5 truncate max-w-[340px]">
            {sender || "Unknown Sender"}
          </div>

          <div className="font-bold text-sm leading-6 text-black mb-1.5 truncate max-w-[340px]">
            {subject || "(No subject)"}
          </div>

          <div className="flex items-end justify-between gap-2">
            <div className="text-[13px] leading-5 text-black line-clamp-2 flex-1 min-w-0">
              {plainBody || ""}
            </div>

            <div className="text-[13px] leading-5 text-black whitespace-nowrap shrink-0 self-end">
              {timeStr}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const SoundNotificationManager = ({ sfxSrc = "/assets/sounds/new_mail.mp3" }) => {
  const audioRef = useRef(null);
  const pendingPlayRef = useRef(false);
  const [activeNotification, setActiveNotification] = useState(null);
  const notifIdRef = useRef(0);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const unlock = () => {
      if (!audioRef.current) {
        audioRef.current = new Audio(sfxSrc);
        audioRef.current.volume = 0.6;
      }
      audioRef.current
        .play()
        .then(() => {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          if (pendingPlayRef.current) {
            pendingPlayRef.current = false;
            audioRef.current.play().catch(() => {});
          }
        })
        .catch(() => {});

      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("mousedown", unlock);
    };

    document.addEventListener("click", unlock);
    document.addEventListener("keydown", unlock);
    document.addEventListener("mousedown", unlock);

    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("mousedown", unlock);
    };
  }, [sfxSrc]);

  useEffect(() => {
    const handleNewMail = (e) => {
      const mailData = e?.detail || {};

      if (getSoundNotificationPref()) {
        if (!audioRef.current) {
          audioRef.current = new Audio(sfxSrc);
          audioRef.current.volume = 0.6;
        }
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => { pendingPlayRef.current = false; })
            .catch(() => { pendingPlayRef.current = true; });
        }
      }

      if (getDesktopNotificationPref()) {
        const id = ++notifIdRef.current;
        setActiveNotification({
          id,
          sender: mailData.sender || mailData.from || "New Mail",
          subject: mailData.subject || "(No subject)",
          body: mailData.body || mailData.snippet || "You have a new message",
          timestamp: Date.now(),
        });
      }

    };

    window.addEventListener("newMailReceived", handleNewMail);
    return () => window.removeEventListener("newMailReceived", handleNewMail);
  }, [sfxSrc]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = sfxSrc;
    }
  }, [sfxSrc]);

  useEffect(() => {
    const handler = (e) => {
      if (!e.detail) setActiveNotification(null);
    };
    window.addEventListener("desktopNotificationPrefChanged", handler);
    return () => window.removeEventListener("desktopNotificationPrefChanged", handler);
  }, []);

  return (
    <>
      {activeNotification &&
        createPortal(
          <MailNotificationPopup
            key={activeNotification.id}
            notification={activeNotification}
            onClose={() => setActiveNotification(null)}
          />,
          document.body
        )}
    </>
  );
};

export default SoundNotificationManager;