import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearSearch } from "../../../store/slices/searchSlice";
import { Navbar } from "./Navbar/Navbar";
import { AppNavBar } from "./Navbar/AppNavBar";
import { Sidebar } from "./Sidebar";
import { InboxList } from "./InboxList";
import { MailView } from "./MailViewSection/MailView";
import { RightSidebar } from "./RightSidebar";
import { useSmoothNavigation } from "../../../hooks/useSmoothNavigation";
import {
  getDraftMails,
  getInboxMails,
  getSentMails,
  getOutboxMails,
  getSpamMails,
  getArchivedMails,
  getTrashMails,
  toggleReadMail,
  getStarredMails,
  archiveMail,
  deleteMail,
  unarchiveMail,
  toggleStarMail,
  restoreMail,
  getLabels,
  getLabelMails,
  markAsSpam,
  unmarkAsSpam,
  globalSearch,
  togglePinMail,
  getSnoozedMails,   // <-- Snooze API
  snoozeMail         // <-- Snooze API
} from "../../../api/api";

import { ComposeModal } from "./ComposeSection/ComposeModal";
import { getOutboxItems, addToOutbox, updateOutboxItemStatus, removeFromOutbox } from "../../../utils/outboxStore";
import SoundNotificationManager, { dispatchNewMailEvent } from "./SoundNotificationManager";
import newMailSound from "../../../assets/sounds/new_mail.mp3";

const defaultCustomLabels = [
  { name: "Events", parent: null },
  { name: "Meetings", parent: null },
  { name: "Promotions", parent: null },
  // { name: "Others", parent: null },
];

const normalizeLabels = (labels = []) => {
  const labelsById = new Map(labels.map((label) => [label.id, label]));

  return labels.map((label) => ({
    id: label.id,
    name: label.name,
    parent_id: label.parent_id ?? null,
    parent: label.parent_id ? labelsById.get(label.parent_id)?.name || null : null,
    show_in_label_list: label.show_in_label_list,
    show_in_message_list: label.show_in_message_list,
  }));
};

const Home = () => {
  const [defaultLabelsVisibility, setDefaultLabelsVisibility] = useState({
    Archive: "show",
    Snoozed: "show",
    "Sent mail": "show",
    Outbox: "show",
    Junk: "show",
    Trash: "show",
    Drafts: "show",
    Favourite: "show",

    //Labels
    Events: "show",
    Meetings: "show",
    Promotions: "show",
    // Others: "show",
  });

  const [customLabels, setCustomLabels] = useState(defaultCustomLabels);

  const { visible, smoothNavigate } = useSmoothNavigation(1000);
  
  const dispatch = useDispatch();
  const searchState = useSelector((state) => state.search || { isSearchTriggered: false });
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  const [inboxMails, setInboxMails] = useState([]);
  const [sentMails, setSentMails] = useState([]);
  const [outboxMails, setOutboxMails] = useState([]);
  const [draftMails, setDraftMails] = useState([]);
  const [spamMails, setSpamMails] = useState([]);
  const [archivedMails, setArchivedMails] = useState([]);
  const [trashMails, setTrashMails] = useState([]);
  const [favoriteMails, setFavoriteMails] = useState([]);
  const [snoozedMails, setSnoozedMails] = useState([]); // <-- Snooze State
  const [labelMails, setLabelMails] = useState([]);
  const [selectedMail, setSelectedMail] = useState(null);
  const [taskRefreshTrigger, setTaskRefreshTrigger] = useState(0);
  const [selectedMailbox, setSelectedMailbox] = useState("inbox");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [draftData, setDraftData] = useState(null);
  const currentUser = JSON.parse(sessionStorage.getItem("user"));
  const prevInboxCountRef = useRef(null);
  const prevInboxIdsRef = useRef(null);
  // Reverted back to your original setup
  const normalizeMail = (mail) => {
    let fromField = mail.from;
    let toField = mail.to;

    // Handle stringified JSON arrays
    if (typeof fromField === "string" && fromField.startsWith("[") && fromField.endsWith("]")) {
      try { fromField = JSON.parse(fromField); } catch (e) {}
    }
    if (typeof toField === "string" && toField.startsWith("[") && toField.endsWith("]")) {
      try { toField = JSON.parse(toField); } catch (e) {}
    }

    // Fallback if array is empty
    if (Array.isArray(fromField) && fromField.length === 0) {
      fromField = mail.sender || mail.sender_email || mail.sender_id || "";
    }
    if (Array.isArray(toField) && toField.length === 0) {
      toField = mail.receiver || mail.receiver_email || mail.receiver_id || "";
    }

    return {
      ...mail,
      id: mail.id || mail.mail_id || mail.email_id,
      from: fromField || mail.sender || mail.sender_email || mail.sender_id || "",
      to: toField || mail.receiver || mail.receiver_email || mail.receiver_id || "",
      date: mail.date || mail.created_at || mail.updated_at || null,
    };
  };

  // Clear the reading pane whenever the user switches folders/tabs
  useEffect(() => {
    setSelectedMail(null);
  }, [selectedMailbox]);

  useEffect(() => {
    if (searchState.isSearchTriggered && searchState.activeModule === "mail") {
      const fetchSearchResults = async () => {
        setIsSearchLoading(true);
        try {
          const response = await globalSearch(searchState.query, "mail");
          const fetchedResults = (response.data?.data?.mail || []).map(normalizeMail);
          setSearchResults(fetchedResults);
          setSelectedMail(null); 
        } catch (error) {
          console.error("Search failed:", error);
          setSearchResults([]);
        } finally {
          setIsSearchLoading(false);
        }
      };
      fetchSearchResults();
    }
  }, [searchState.query, searchState.activeModule, searchState.isSearchTriggered]);

  const loadMailbox = async (mailbox, bypassCache = false) => {
    try {
      let response;

      switch (mailbox) {
        case "inbox":
          if (!bypassCache && inboxMails.length > 0) return;
          response = await getInboxMails();
          setInboxMails(response.data.map(normalizeMail));
          break;

        case "sent":
          response = await getSentMails();
          setSentMails(response.data.map(normalizeMail));
          break;

        case "outbox":
          response = await getOutboxMails();
          setOutboxMails(response.data.map(normalizeMail));
          break;

        case "drafts":
          if (!bypassCache && draftMails.length > 0) return;
          response = await getDraftMails();
          setDraftMails(response.data.map(normalizeMail));
          break;

        case "junk":
          if (!bypassCache && spamMails.length > 0) return;
          response = await getSpamMails();
          setSpamMails(response.data.map(normalizeMail));
          break;

        case "archived":
          if (!bypassCache && archivedMails.length > 0) return;
          response = await getArchivedMails();
          setArchivedMails(response.data.map(normalizeMail));
          break;

        case "trash":
          if (!bypassCache && trashMails.length > 0) return;
          response = await getTrashMails();
          setTrashMails(response.data.map(normalizeMail));
          break;

        case "favorite":
          if (!bypassCache && favoriteMails.length > 0) return;
          response = await getStarredMails();
          setFavoriteMails(response.data.map(normalizeMail));
          break;

        case "snoozed": // <-- Snooze Fetch
          if (!bypassCache && snoozedMails.length > 0) return;
          response = await getSnoozedMails();
          setSnoozedMails(response.data.map(normalizeMail));
          break;

        case "outbox": {
          const items = getOutboxItems();
          setOutboxMails(items);
          break;
        }

        default:
          return;
      }
    } catch (error) {
      console.error("Failed to load mailbox:", error);
    }
  };

  const loadLabelMailbox = async (label) => {
    try {
      const labelKey = `label:${label.id || label.name}`;
      setSelectedMailbox(labelKey);
      setSelectedMail(null);

      const response = await getLabelMails(label);
      setLabelMails(response.data.map(normalizeMail));
    } catch (error) {
      console.error("Failed to load label mailbox:", error);
    }
  };

  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const response = await getLabels();
        const apiLabels = normalizeLabels(response.data);

        setCustomLabels((prev) => {
          const merged = [...defaultCustomLabels];

          [...apiLabels, ...prev.filter((label) => label.id)].forEach(
            (label) => {
              const existingIndex = merged.findIndex(
                (item) => item.name.toLowerCase() === label.name.toLowerCase(),
              );

              if (existingIndex >= 0) {
                merged[existingIndex] = {
                  ...merged[existingIndex],
                  ...label,
                };
              } else {
                merged.push(label);
              }
            },
          );

          return merged;
        });

        setDefaultLabelsVisibility((prev) => {
          const updated = { ...prev };
          apiLabels.forEach((label) => {
            updated[label.name] = label.show_in_label_list || "show";
          });
          return updated;
        });
      } catch (error) {
        console.error("Failed to load labels:", error);
      }
    };

    fetchLabels();
  }, []);



  useEffect(() => {
    const checkPendingMail = async () => {
      const pendingMailId = sessionStorage.getItem("selected_mail_id");
      if (!pendingMailId) return;

      let currentList = [...inboxMails];
      let found = currentList.find((m) => String(m.id) === String(pendingMailId));
      
      if (!found) {
        try {
          const response = await getInboxMails();
          currentList = response.data.map(normalizeMail);
          found = currentList.find((m) => String(m.id) === String(pendingMailId));
        } catch (e) {
          console.error("Failed to fetch fresh inbox for pending mail", e);
        }
      }

      if (found) {
        const isCurrentlyRead = found.isRead !== undefined ? found.isRead : found.is_read;
        let finalMail = found;

        if (!isCurrentlyRead) {
          finalMail = { ...found, isRead: true, is_read: true };
          currentList = currentList.map(m => String(m.id) === String(found.id) ? finalMail : m);
          toggleReadMail(finalMail.id).catch(err => console.error("Failed to mark mail as read", err));
        }

        // Force UI to show the email correctly
        setIsComposeOpen(false);
        dispatch(clearSearch());
        setSelectedMailbox("inbox");
        setInboxMails(currentList);
        setSelectedMail(finalMail);
        sessionStorage.removeItem("selected_mail_id");
      }
    };

    checkPendingMail();
    window.addEventListener("stackly_mail_selected", checkPendingMail);
    return () => window.removeEventListener("stackly_mail_selected", checkPendingMail);
  }, [inboxMails]);

  // Main effect: initial mailbox load + periodic refresh for outbox, sent, inbox, snoozed
useEffect(() => {
    if (selectedMailbox && selectedMailbox !== "inbox") {
      loadMailbox(selectedMailbox, true);
    }

    const fetchDraftsForBadge = async () => {
      if (draftMails.length === 0) {
        try {
          const response = await getDraftMails();
          setDraftMails(response.data.map(normalizeMail));
        } catch (err) {}
      }
    };
    fetchDraftsForBadge();
  }, [selectedMailbox, dispatch]);

  useEffect(() => {
    let interval = null;

    const initialize = async () => {
      try {
        const response = await getInboxMails();
        const rawMails = response.data;
        const freshMails = rawMails.map(normalizeMail);
        prevInboxIdsRef.current = new Set(freshMails.map(m => String(m.id)));
        prevInboxCountRef.current = freshMails.length;
        setInboxMails(freshMails);
      } catch (err) {
        console.error("Failed to initialize inbox:", err);
        prevInboxIdsRef.current = new Set();
      }

      interval = setInterval(async () => {
        loadMailbox("outbox", true);
        loadMailbox("sent", true);
        loadMailbox("snoozed", true);

        try {
          const response = await getInboxMails();
          const rawMails = response.data;
          const freshMails = rawMails.map(normalizeMail);
          const freshIds = new Set(freshMails.map(m => String(m.id)));

          const newlyArrivedRaw = rawMails.filter(
            m => !prevInboxIdsRef.current.has(
              String(m.id || m.mail_id || m.email_id)
            )
          );

          if (newlyArrivedRaw.length > 0) {
            const currentUserFirstName = (
              sessionStorage.getItem("user_first_name") || ""
            ).toLowerCase().trim();

            const currentUserLastName = (
              sessionStorage.getItem("user_last_name") || ""
            ).toLowerCase().trim();

            const currentUserFullName =
              `${currentUserFirstName} ${currentUserLastName}`.trim();

            const currentUserEmail = (
              sessionStorage.getItem("user_email") || ""
            ).toLowerCase().trim();

            const currentUserUsername = (
              JSON.parse(sessionStorage.getItem("user") || "null")?.username || ""
            ).toLowerCase().trim();

            const hasMailFromOther = newlyArrivedRaw.some(rawMail => {
              const fromStr = (rawMail.from || "").toLowerCase().trim();

              if (!fromStr) return false;

              const isSender =
                (currentUserFullName && fromStr === currentUserFullName) ||
                (currentUserFirstName && fromStr === currentUserFirstName) ||
                (currentUserUsername && fromStr.includes(currentUserUsername)) ||
                (currentUserEmail && fromStr.includes(currentUserEmail));
              return !isSender;
            });
            if (hasMailFromOther) {
  const firstNewMail = newlyArrivedRaw.find(rawMail => {
    const fromStr = (rawMail.from || "").toLowerCase().trim();
    if (!fromStr) return false;
    const isSender =
      (currentUserFullName && fromStr === currentUserFullName) ||
      (currentUserFirstName && fromStr === currentUserFirstName) ||
      (currentUserUsername && fromStr.includes(currentUserUsername)) ||
      (currentUserEmail && fromStr.includes(currentUserEmail));
    return !isSender;
  });

  dispatchNewMailEvent({
    sender: firstNewMail?.from || firstNewMail?.sender || "New Mail",
    subject: firstNewMail?.subject || "(No subject)",
    body:
      firstNewMail?.body_preview ||
      firstNewMail?.snippet ||
      firstNewMail?.preview ||
      firstNewMail?.body ||
      "You have a new message",
  });
}
          }

          prevInboxIdsRef.current = freshIds;
          prevInboxCountRef.current = freshMails.length;
          setInboxMails(freshMails);
        } catch (err) {
          console.error("Failed to refresh inbox:", err);
        }
      }, 5000);
    };

    initialize();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const standardMails =
    selectedMailbox === "inbox"
      ? inboxMails
      : selectedMailbox === "sent"
        ? sentMails
        : selectedMailbox === "outbox"
          ? outboxMails
          : selectedMailbox === "drafts"
            ? draftMails
            : selectedMailbox === "junk"
              ? spamMails
              : selectedMailbox === "archived"
                ? archivedMails
                : selectedMailbox === "trash"
                  ? trashMails
                  : selectedMailbox === "favorite"
                    ? favoriteMails
                    : selectedMailbox === "snoozed"
                      ? snoozedMails // <-- Render snoozed mails
                    : selectedMailbox?.startsWith("label:")
                      ? labelMails
                    : [];

  const mails = searchState.isSearchTriggered ? searchResults : standardMails;

  const handleArchive = async (mailId) => {
    try {
      const mailToArchive =
        inboxMails.find((m) => m.id === mailId) ||
        sentMails.find((m) => m.id === mailId) ||
        draftMails.find((m) => m.id === mailId) ||
        spamMails.find((m) => m.id === mailId) ||
        trashMails.find((m) => m.id === mailId) ||
        favoriteMails.find((m) => m.id === mailId) ||
        snoozedMails.find((m) => m.id === mailId) ||
        searchResults.find((m) => m.id === mailId); 

      if (mailToArchive) {
        setArchivedMails((prev) => [mailToArchive, ...prev]);
      }

      if (selectedMailbox === "inbox") setInboxMails((prev) => prev.filter((m) => m.id !== mailId));
      if (selectedMailbox === "sent") setSentMails((prev) => prev.filter((m) => m.id !== mailId));
      if (selectedMailbox === "drafts") setDraftMails((prev) => prev.filter((m) => m.id !== mailId));
      if (selectedMailbox === "junk") setSpamMails((prev) => prev.filter((m) => m.id !== mailId));
      if (selectedMailbox === "trash") setTrashMails((prev) => prev.filter((m) => m.id !== mailId));
      if (selectedMailbox === "favorite") setFavoriteMails((prev) => prev.filter((m) => m.id !== mailId));
      if (selectedMailbox === "snoozed") setSnoozedMails((prev) => prev.filter((m) => m.id !== mailId));
      
      if (searchState.isSearchTriggered) {
        setSearchResults((prev) => prev.filter((m) => m.id !== mailId));
      }

      setSelectedMail(null);
      await archiveMail(mailId);
    } catch (err) {
      console.error("Archive failed", err);
    }
  };

  const handleUnarchive = async (mailId) => {
    try {
      if (selectedMailbox === "archived") {
        setArchivedMails((prev) => prev.filter((m) => m.id !== mailId));
      }
      setSelectedMail(null);
      await unarchiveMail(mailId);
    } catch (err) {
      console.error("Unarchive failed", err);
    }
  };

  const handleDelete = async (mailId) => {
    if (!mailId) return;

    try {
      const mailToDelete =
        inboxMails.find((m) => m.id === mailId) ||
        sentMails.find((m) => m.id === mailId) ||
        draftMails.find((m) => m.id === mailId) ||
        spamMails.find((m) => m.id === mailId) ||
        archivedMails.find((m) => m.id === mailId) ||
        favoriteMails.find((m) => m.id === mailId) ||
        snoozedMails.find((m) => m.id === mailId) ||
        searchResults.find((m) => m.id === mailId);

      if (mailToDelete) {
        setTrashMails((prev) => [mailToDelete, ...prev]);
      }

      if (selectedMailbox === "inbox") setInboxMails((prev) => prev.filter((m) => m.id !== mailId));
      if (selectedMailbox === "sent") setSentMails((prev) => prev.filter((m) => m.id !== mailId));
      if (selectedMailbox === "drafts") setDraftMails((prev) => prev.filter((m) => m.id !== mailId));
      if (selectedMailbox === "archived") setArchivedMails((prev) => prev.filter((m) => m.id !== mailId));
      if (selectedMailbox === "junk") setSpamMails((prev) => prev.filter((m) => m.id !== mailId));
      if (selectedMailbox === "favorite") setFavoriteMails((prev) => prev.filter((m) => m.id !== mailId));
      if (selectedMailbox === "snoozed") setSnoozedMails((prev) => prev.filter((m) => m.id !== mailId));

      if (searchState.isSearchTriggered) {
        setSearchResults((prev) => prev.filter((m) => m.id !== mailId));
      }

      setSelectedMail(null);
      await deleteMail(mailId);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // <-- SNOOZE LOGIC (full implementation) -->
  const handleSnooze = async (mailIds, scheduledTime) => {
    const ids = Array.isArray(mailIds) ? mailIds : [mailIds];
    try {
      for (const mailId of ids) {
        // 1. Find the mail being snoozed
        const mailToSnooze =
          inboxMails.find((m) => m.id === mailId) ||
          sentMails.find((m) => m.id === mailId) ||
          searchResults.find((m) => m.id === mailId);

        // 2. Optimistically add it to the snoozed list and force it to be Unread
        if (mailToSnooze) {
          setSnoozedMails((prev) => [{ 
            ...mailToSnooze, 
            isRead: false, 
            is_read: false 
          }, ...prev]);
        }

        // 3. Remove it from the current view
        if (selectedMailbox === "inbox") setInboxMails((prev) => prev.filter((m) => m.id !== mailId));
        if (selectedMailbox === "sent") setSentMails((prev) => prev.filter((m) => m.id !== mailId));
        if (selectedMailbox === "drafts") setDraftMails((prev) => prev.filter((m) => m.id !== mailId));
        if (selectedMailbox === "junk") setSpamMails((prev) => prev.filter((m) => m.id !== mailId));
        if (selectedMailbox === "trash") setTrashMails((prev) => prev.filter((m) => m.id !== mailId));
        if (selectedMailbox === "favorite") setFavoriteMails((prev) => prev.filter((m) => m.id !== mailId));
        if (selectedMailbox === "archived") setArchivedMails((prev) => prev.filter((m) => m.id !== mailId));
        
        if (searchState.isSearchTriggered) {
          setSearchResults((prev) => prev.filter((m) => m.id !== mailId));
        }

        if (selectedMail?.id === mailId) {
          setSelectedMail(null);
        }

        // 4. Optimistically update the badge counts
        if (typeof setCounts === 'function') {
          setCounts((prev) => ({
            ...prev,
            inbox: Math.max(0, prev.inbox - 1),
            snoozed: (prev.snoozed || 0) + 1
          }));
        }

        // 5. Fire backend API
        await snoozeMail(mailId, scheduledTime);
      }
    } catch (err) {
      console.error("Snooze failed", err);
    }
  };

  const handleToggleRead = async (mailId) => {
    try {
      const mail =
        inboxMails.find((m) => m.id === mailId) ||
        sentMails.find((m) => m.id === mailId) ||
        draftMails.find((m) => m.id === mailId) ||
        spamMails.find((m) => m.id === mailId) ||
        archivedMails.find((m) => m.id === mailId) ||
        trashMails.find((m) => m.id === mailId) ||
        favoriteMails.find((m) => m.id === mailId) ||
        snoozedMails.find((m) => m.id === mailId) ||
        searchResults.find((m) => m.id === mailId); 

      if (!mail) return;

      const currentValue = mail.isRead !== undefined ? mail.isRead : mail.is_read;
      const newValue = !currentValue;

      const updateMailList = (prev) => prev.map((m) => m.id === mailId ? { ...m, isRead: newValue, is_read: newValue } : m);

      setInboxMails(updateMailList);
      setSentMails(updateMailList);
      setDraftMails(updateMailList);
      setSpamMails(updateMailList);
      setArchivedMails(updateMailList);
      setTrashMails(updateMailList);
      setFavoriteMails(updateMailList);
      setSnoozedMails(updateMailList);
      
      if (searchState.isSearchTriggered) {
        setSearchResults(updateMailList);
      }

      if (selectedMail?.id === mailId) {
        setSelectedMail((prev) => ({
          ...prev,
          isRead: newValue,
          is_read: newValue,
        }));
      }

      if (!newValue) {
        setSelectedMail(null);
      }

      await toggleReadMail(mailId, newValue);
    } catch (err) {
      console.error("Read toggle failed", err);
    }
  };

  const handleToggleStar = async (mailId) => {
    try {
      const mail =
        inboxMails.find((m) => m.id === mailId) ||
        sentMails.find((m) => m.id === mailId) ||
        draftMails.find((m) => m.id === mailId) ||
        spamMails.find((m) => m.id === mailId) ||
        archivedMails.find((m) => m.id === mailId) ||
        trashMails.find((m) => m.id === mailId) ||
        favoriteMails.find((m) => m.id === mailId) ||
        snoozedMails.find((m) => m.id === mailId) ||
        searchResults.find((m) => m.id === mailId);

      if (!mail) return;

      const newValue = !mail.is_favorite;

      const updateFn = (prev) => prev.map((m) => m.id === mailId ? { ...m, is_favorite: newValue } : m);
      
      setInboxMails(updateFn);
      setSentMails(updateFn);
      setSnoozedMails(updateFn);
      
      if (searchState.isSearchTriggered) {
        setSearchResults(updateFn);
      }

      if (selectedMail?.id === mailId) {
        setSelectedMail((prev) => ({ ...prev, is_favorite: newValue }));
      }

      if (newValue) {
        setFavoriteMails((prev) =>
          prev.some((m) => m.id === mailId) ? prev : [...prev, { ...mail, is_favorite: true }]
        );
      } else {
        setFavoriteMails((prev) => prev.filter((m) => m.id !== mailId));
      }

      await toggleStarMail(mailId, newValue);
    } catch (err) {
      console.error("Star failed", err);
    }
  };

  const handleRestore = async (mailId) => {
    try {
      const restoredMail = trashMails.find((m) => m.id === mailId);
      if (!restoredMail) return;

      setTrashMails((prev) => prev.filter((m) => m.id !== mailId));
      setInboxMails((prev) => [restoredMail, ...prev]);
      setSelectedMail(null);

      await restoreMail(mailId);
    } catch (err) {
      console.error("Restore failed", err);
    }
  };

  const getIsUnread = (m) => {
    const read = m.isRead !== undefined ? m.isRead : m.is_read;
    return !read;
  };

  const unreadCounts = {
    inbox: inboxMails.filter(getIsUnread).length,
    drafts: draftMails.length,
    junk: spamMails.filter(getIsUnread).length,
    trash: trashMails.filter(getIsUnread).length,
    archived: archivedMails.filter(getIsUnread).length,
    favorite: favoriteMails.filter(getIsUnread).length,
    snoozed: snoozedMails.filter(getIsUnread).length,
  };

  const handleSelectMail = async (mail) => {
    if (!mail) {
      setSelectedMail(null);
      return;
    }

    const isCurrentlyRead = mail.isRead !== undefined ? mail.isRead : mail.is_read;
    if (!isCurrentlyRead) {
      const updatedMail = { ...mail, isRead: true, is_read: true };
      const updateMailList = (prev) => prev.map((m) => (m.id === mail.id ? updatedMail : m));

      setInboxMails(updateMailList);
      setSentMails(updateMailList);
      setDraftMails(updateMailList);
      setSpamMails(updateMailList);
      setArchivedMails(updateMailList);
      setTrashMails(updateMailList);
      setFavoriteMails(updateMailList);
      setSnoozedMails(updateMailList);
      
      if (searchState.isSearchTriggered) {
        setSearchResults(updateMailList);
      }

      setSelectedMail(updatedMail);

      try {
        await toggleReadMail(mail.id);
      } catch (err) {
        console.error("Failed to mark mail as read on open", err);
      }
    } else {
      setSelectedMail(mail);
    }
  };

  const selectNextMail = (removedId) => {
    const targetList = searchState.isSearchTriggered ? searchResults 
      : selectedMailbox === "inbox" ? inboxMails 
      : selectedMailbox === "sent" ? sentMails 
      : selectedMailbox === "drafts" ? draftMails 
      : [];

    const updated = targetList.filter((m) => m.id !== removedId);
    handleSelectMail(updated[0] || null);
  };

  const handleTogglePin = async (mailId, newStatus) => {
    const updateList = (listSetter) => {
      listSetter((prev) => prev.map((m) => m.id === mailId ? { ...m, is_important: newStatus } : m));
    };

    // Optimistic UI updates
    updateList(setInboxMails);
    updateList(setSentMails);
    updateList(setDraftMails);
    updateList(setSpamMails);
    updateList(setArchivedMails);
    updateList(setTrashMails);
    updateList(setFavoriteMails);
    updateList(setSnoozedMails);
    
    if (searchState.isSearchTriggered) {
      updateList(setSearchResults);
    }

    if (selectedMail?.id === mailId) {
      setSelectedMail((prev) => ({
        ...prev,
        is_important: newStatus,
      }));
    }

    // <-- 2. Execute the backend call to persist the change -->
    try {
      await togglePinMail(mailId, newStatus);
    } catch (err) {
      console.error("Failed to sync pin status with server", err);
      // Optional: Revert the UI state here if the API request fails
    }
  };

  const handleReportJunk = async (mailId) => {
    try {
      // 1. Find the mail in the current lists
      const mailToJunk =
        inboxMails.find((m) => m.id === mailId) ||
        searchResults.find((m) => m.id === mailId);

      // 2. Optimistically add it to the spam list
      if (mailToJunk) {
        setSpamMails((prev) => [{ 
          ...mailToJunk, 
          isRead: false,   // <-- Force to unread
          is_read: false   // <-- Force to unread
        }, ...prev]);
      }

      // 3. Remove it from the current view
      if (selectedMailbox === "inbox") setInboxMails((prev) => prev.filter((m) => m.id !== mailId));
      if (searchState.isSearchTriggered) {
        setSearchResults((prev) => prev.filter((m) => m.id !== mailId));
      }

      // 4. Clear the reading pane
      setSelectedMail(null);

      // Optimistically update the badge counts 
      if (typeof setCounts === 'function') {
        setCounts((prev) => ({
          ...prev,
          inbox: Math.max(0, prev.inbox - 1),
          spam: (prev.spam || 0) + 1  // The backend returns this as "spam", not "junk"
        }));
      }

      // 5. Fire the backend API
      await markAsSpam(mailId);
      await toggleReadMail(mailId, false);
    } catch (err) {
      console.error("Report Junk failed", err);
      // Optional: Handle error / revert state if needed
    }
  };

  const handleNotJunk = async (mailId) => {
    try {
      const mailToRestore = spamMails.find((m) => m.id === mailId);
      if (!mailToRestore) return;

      // 1. Remove it from the junk list
      setSpamMails((prev) => prev.filter((m) => m.id !== mailId));
      
      // 2. Add it back to the inbox list
      setInboxMails((prev) => [{ ...mailToRestore, is_spam: false }, ...prev]);

      // 3. Clear the reading pane
      setSelectedMail(null);

      // Optimistically update the badge counts
      if (typeof setCounts === 'function') {
        setCounts((prev) => ({
          ...prev,
          spam: Math.max(0, prev.spam - 1),
          inbox: (prev.inbox || 0) + 1
        }));
      }

      // 4. Fire the backend API
      await unmarkAsSpam(mailId);
    } catch (err) {
      console.error("Failed to unmark as junk", err);
    }
  };

  return (
    <>
      <div
        className={`w-full flex flex-col overflow-hidden transition-all duration-1000 ease-in-out
          ${visible ? "opacity-100" : "opacity-0"}`}
      >
        <Navbar />
        <AppNavBar setIsComposeOpen={setIsComposeOpen} />
        <div className="flex h-175  overflow-hidden">
          <Sidebar
            selectedMailbox={selectedMailbox}
            setSelectedMailbox={setSelectedMailbox}
            loadMailbox={loadMailbox}
            unreadCounts={unreadCounts}
            defaultLabelsVisibility={defaultLabelsVisibility}
            customLabels={customLabels}
            loadLabelMailbox={loadLabelMailbox}
          />
          <InboxList
            mails={mails}
            selectedMail={selectedMail}
            setSelectedMail={handleSelectMail}
            selectedMailbox={selectedMailbox}
            setIsComposeOpen={setIsComposeOpen}
            setDraftData={setDraftData}
            onToggleStar={handleToggleStar}
            isComposeOpen={isComposeOpen}
          />
          <MailView
            mail={selectedMail}
            mails={mails}
            selectedMailbox={selectedMailbox}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onToggleStar={handleToggleStar}
            onToggleRead={handleToggleRead}
            onUnarchive={handleUnarchive}
            setSelectedMail={handleSelectMail}
            onRestore={handleRestore}
            onSnooze={handleSnooze}
            onTogglePin={handleTogglePin}
            onReportJunk={handleReportJunk}
            onNotJunk={handleNotJunk}
            defaultLabelsVisibility={defaultLabelsVisibility}
            setDefaultLabelsVisibility={setDefaultLabelsVisibility}
            taskRefreshTrigger={taskRefreshTrigger}
            setTaskRefreshTrigger={setTaskRefreshTrigger}
            customLabels={customLabels}
            setCustomLabels={setCustomLabels}
            onMailMovedToLabel={(mailId) => {
              if (!mailId) return;

              setInboxMails((prev) => prev.filter((m) => m.id !== mailId));

              if (selectedMailbox === "inbox") {
                setSelectedMail(null);
              }
            }}
          />
          <RightSidebar taskRefreshTrigger={taskRefreshTrigger} />
          <ComposeModal
            isOpen={isComposeOpen}
            onClose={async () => {
              setIsComposeOpen(false);
              setDraftData(null);
              await loadMailbox("drafts", true);
            }}
            onSendSuccess={async () => {
              await loadMailbox("outbox", true);
              await loadMailbox("sent", true);
            }}
            onDeleteSuccess={async (deletedId) => {
              setDraftMails((prev) => prev.filter((m) => m.id !== deletedId));
              if (selectedMail?.id === deletedId) setSelectedMail(null);
            }}
            draftData={draftData}
          />
        </div>
        <SoundNotificationManager sfxSrc={newMailSound} />
      </div>
    </>
  );
};
export default Home;