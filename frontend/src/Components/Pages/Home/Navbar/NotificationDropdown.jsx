import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import profileimg from "../../../../assets/images/profileimg.png";
import profileimg1 from "../../../../assets/images/profileimg1.png";
import profileimg2 from "../../../../assets/images/profileimg2.png";
import profileimg3 from "../../../../assets/images/profileimg3.png";
import profileimg4 from "../../../../assets/images/profileimg4.png";


const AtSymbolIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4.5 8.44"></path></svg>
);
const ChatBubbleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
);
const ArrowUturnLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>
);
const FaceSmileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
);
const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
);

const filterOptions = [
  { id: "mentions", label: "Mentions", icon: <AtSymbolIcon /> },
  { id: "comments", label: "Comments", icon: <ChatBubbleIcon /> },
  { id: "replies", label: "Replies", icon: <ArrowUturnLeftIcon /> },
  { id: "reactions", label: "Reactions", icon: <FaceSmileIcon /> },
  { id: "tasks", label: "Tasks", icon: <CheckCircleIcon /> },
];


// Module-specific notification type icons

// Mail Module Icons
const MailNewIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);
const MailReplyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 14 4 9 9 4"></polyline>
    <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
  </svg>
);
const MailMentionIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4.5 8.44"></path>
  </svg>
);
const MailAttachmentIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
  </svg>
);
const MailSharedIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
  </svg>
);
const MailImportantIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);
const MailScheduledIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);
const MailSnoozedIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
    <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
    <line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line>
  </svg>
);

// Calendar Module Icons
const CalMeetingIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);
const CalEventCreatedIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
    <line x1="12" y1="15" x2="12" y2="19"></line><line x1="10" y1="17" x2="14" y2="17"></line>
  </svg>
);
const CalEventUpdatedIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);
const CalCancelledIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>
  </svg>
);
const CalInviteAcceptedIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
const CalInviteRejectedIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
  </svg>
);
const CalTaskIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"></polyline>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
  </svg>
);
const CalDeadlineIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

// Chat Module Icons
const ChatDMIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);
const ChatGroupMentionIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);
const ChatReplyIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 14 4 9 9 4"></polyline>
    <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
  </svg>
);
const ChatReactionIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
    <line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line>
  </svg>
);
const ChatFileIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
  </svg>
);
const ChatVoiceIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5 19.79 19.79 0 0 1 1.61 4.93 2 2 0 0 1 3.6 2.73h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.3a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);
const ChatVideoIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);
const ChatMissedCallIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.69 13.5"></path>
    <line x1="17" y1="7" x2="23" y2="1"></line>
    <polyline points="17 1 23 1 23 7"></polyline>
  </svg>
);

// Drive Module Icons
const DriveUploadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);
const DriveSharedIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
  </svg>
);
const DriveCommentIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    <line x1="9" y1="10" x2="15" y2="10"></line><line x1="9" y1="14" x2="13" y2="14"></line>
  </svg>
);
const DriveEditedIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);
const DrivePermissionIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);
const DriveAccessRequestIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
    <line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line>
  </svg>
);
const DriveStorageIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
);

// ─────────────────────────────────────────────
// Module color map (badge background)
// ─────────────────────────────────────────────
const MODULE_COLORS = {
  mail:     { bg: "bg-blue-100",   text: "text-blue-600" },
  calendar: { bg: "bg-purple-100", text: "text-purple-600" },
  chat:     { bg: "bg-green-100",  text: "text-green-600" },
  drive:    { bg: "bg-orange-100", text: "text-orange-600" },
};

// Map action types → icons
const ACTION_ICONS = {
  // Mail
  new_email:              <MailNewIcon />,
  reply_received:         <MailReplyIcon />,
  mention_in_email:       <MailMentionIcon />,
  attachment_received:    <MailAttachmentIcon />,
  shared_email:           <MailSharedIcon />,
  important_mail:         <MailImportantIcon />,
  scheduled_mail_reminder:<MailScheduledIcon />,
  snoozed_mail_reminder:  <MailSnoozedIcon />,
  // Calendar
  meeting_reminder:       <CalMeetingIcon />,
  event_created:          <CalEventCreatedIcon />,
  event_updated:          <CalEventUpdatedIcon />,
  event_cancelled:        <CalCancelledIcon />,
  invite_accepted:        <CalInviteAcceptedIcon />,
  invite_rejected:        <CalInviteRejectedIcon />,
  task_reminder:          <CalTaskIcon />,
  deadline_alert:         <CalDeadlineIcon />,
  // Chat
  direct_message:         <ChatDMIcon />,
  group_mention:          <ChatGroupMentionIcon />,
  message_reply:          <ChatReplyIcon />,
  reaction_added:         <ChatReactionIcon />,
  shared_file:            <ChatFileIcon />,
  voice_call:             <ChatVoiceIcon />,
  video_call:             <ChatVideoIcon />,
  missed_call:            <ChatMissedCallIcon />,
  // Drive
  file_uploaded:          <DriveUploadIcon />,
  file_shared:            <DriveSharedIcon />,
  file_commented:         <DriveCommentIcon />,
  file_edited:            <DriveEditedIcon />,
  permission_changed:     <DrivePermissionIcon />,
  access_request:         <DriveAccessRequestIcon />,
  storage_warning:        <DriveStorageIcon />,
  // Legacy filter-based types
  mentions:               <AtSymbolIcon />,
  comments:               <ChatBubbleIcon />,
  replies:                <ArrowUturnLeftIcon />,
  reactions:              <FaceSmileIcon />,
  tasks:                  <CheckCircleIcon />,
};

// Action type → route mapping
const ACTION_ROUTES = {
  new_email:               "/home",
  reply_received:          "/home",
  mention_in_email:        "/home",
  attachment_received:     "/home",
  shared_email:            "/home",
  important_mail:          "/home",
  scheduled_mail_reminder: "/home",
  snoozed_mail_reminder:   "/home",
  meeting_reminder:        "/calendar",
  event_created:           "/calendar",
  event_updated:           "/calendar",
  event_cancelled:         "/calendar",
  invite_accepted:         "/calendar",
  invite_rejected:         "/calendar",
  task_reminder:           "/calendar",
  deadline_alert:          "/calendar",
  direct_message:          "/chat",
  group_mention:           "/chat",
  message_reply:           "/chat",
  reaction_added:          "/chat",
  shared_file:             "/chat",
  voice_call:              "/chat",
  video_call:              "/chat",
  missed_call:             "/chat",
  file_uploaded:           "/drive",
  file_shared:             "/drive",
  file_commented:          "/drive",
  file_edited:             "/drive",
  permission_changed:      "/drive",
  access_request:          "/drive",
  storage_warning:         "/drive",
};

// ─────────────────────────────────────────────
// Demo / seed notifications (used as fallback
// when no real notifications arrive from the API)
// ─────────────────────────────────────────────
const SEED_NOTIFICATIONS = [
  {
    id: "n-mail-1", module: "mail", actionType: "new_email",
    user: "Sarah Johnson", avatar: profileimg1, statusColor: "bg-green-400",
    actionPrefix: "Sarah", action: "sent you a", target: "New Email",
    time: "2m ago", isRead: false,
  },
  {
    id: "n-mail-2", module: "mail", actionType: "reply_received",
    user: "Mark Davis", avatar: profileimg2, statusColor: "bg-green-400",
    actionPrefix: "Mark", action: "replied to your email about", target: "Q3 Report",
    time: "10m ago", isRead: false,
  },
  {
    id: "n-mail-3", module: "mail", actionType: "mention_in_email",
    user: "Emily Chen", avatar: profileimg3, statusColor: "bg-yellow-400",
    actionPrefix: "Emily", action: "mentioned you in", target: "Project Alpha",
    time: "25m ago", isRead: true,
  },
  {
    id: "n-mail-4", module: "mail", actionType: "attachment_received",
    user: "Tom Wilson", avatar: profileimg4, statusColor: "bg-gray-300",
    actionPrefix: "Tom", action: "sent an attachment in", target: "Budget.xlsx",
    time: "1h ago", isRead: true,
  },
  {
    id: "n-mail-5", module: "mail", actionType: "important_mail",
    user: "HR Team", avatar: profileimg, statusColor: "bg-red-400",
    actionPrefix: "HR Team", action: "marked your email as", target: "Important",
    time: "2h ago", isRead: true,
  },
  {
    id: "n-cal-1", module: "calendar", actionType: "meeting_reminder",
    user: "Calendar", avatar: profileimg2, statusColor: "bg-purple-400",
    actionPrefix: "Reminder:", action: "Team Standup starts in", target: "15 minutes",
    time: "5m ago", isRead: false,
  },
  {
    id: "n-cal-2", module: "calendar", actionType: "event_created",
    user: "Alex Park", avatar: profileimg3, statusColor: "bg-green-400",
    actionPrefix: "Alex", action: "created event", target: "Product Review",
    time: "30m ago", isRead: false,
  },
  {
    id: "n-cal-3", module: "calendar", actionType: "invite_accepted",
    user: "Priya Sharma", avatar: profileimg1, statusColor: "bg-green-400",
    actionPrefix: "Priya", action: "accepted your invite to", target: "Design Sprint",
    time: "1h ago", isRead: true,
  },
  {
    id: "n-cal-4", module: "calendar", actionType: "deadline_alert",
    user: "Calendar", avatar: profileimg4, statusColor: "bg-red-400",
    actionPrefix: "Alert:", action: "Deadline for", target: "Website Redesign is tomorrow",
    time: "3h ago", isRead: true,
  },
  {
    id: "n-cal-5", module: "calendar", actionType: "event_cancelled",
    user: "David Lee", avatar: profileimg2, statusColor: "bg-gray-300",
    actionPrefix: "David", action: "cancelled", target: "Friday 1:1 Meeting",
    time: "4h ago", isRead: true,
  },
  {
    id: "n-chat-1", module: "chat", actionType: "direct_message",
    user: "Jessica Wu", avatar: profileimg3, statusColor: "bg-green-400",
    actionPrefix: "Jessica", action: "sent you a", target: "Direct Message",
    time: "1m ago", isRead: false,
  },
  {
    id: "n-chat-2", module: "chat", actionType: "group_mention",
    user: "Dev Team", avatar: profileimg1, statusColor: "bg-green-400",
    actionPrefix: "Dev Team", action: "mentioned you in", target: "#general",
    time: "15m ago", isRead: false,
  },
  {
    id: "n-chat-3", module: "chat", actionType: "reaction_added",
    user: "Raj Patel", avatar: profileimg4, statusColor: "bg-yellow-400",
    actionPrefix: "Raj", action: "reacted 👍 to your message in", target: "#design",
    time: "45m ago", isRead: true,
  },
  {
    id: "n-chat-4", module: "chat", actionType: "missed_call",
    user: "Lisa Monroe", avatar: profileimg2, statusColor: "bg-gray-300",
    actionPrefix: "Missed call from", action: "", target: "Lisa Monroe",
    time: "2h ago", isRead: false,
  },
  {
    id: "n-chat-5", module: "chat", actionType: "shared_file",
    user: "Carlos Ruiz", avatar: profileimg3, statusColor: "bg-green-400",
    actionPrefix: "Carlos", action: "shared a file", target: "mockup_v3.fig",
    time: "3h ago", isRead: true,
  },
  {
    id: "n-drive-1", module: "drive", actionType: "file_uploaded",
    user: "Nina Torres", avatar: profileimg1, statusColor: "bg-green-400",
    actionPrefix: "Nina", action: "uploaded", target: "Q4_Roadmap.pdf",
    time: "8m ago", isRead: false,
  },
  {
    id: "n-drive-2", module: "drive", actionType: "file_shared",
    user: "Ben Carter", avatar: profileimg2, statusColor: "bg-green-400",
    actionPrefix: "Ben", action: "shared", target: "Marketing Assets folder",
    time: "20m ago", isRead: false,
  },
  {
    id: "n-drive-3", module: "drive", actionType: "file_commented",
    user: "Anna Kim", avatar: profileimg4, statusColor: "bg-yellow-400",
    actionPrefix: "Anna", action: "commented on", target: "Brand_Guidelines.pdf",
    time: "1h ago", isRead: true,
  },
  {
    id: "n-drive-4", module: "drive", actionType: "access_request",
    user: "Liam Scott", avatar: profileimg3, statusColor: "bg-blue-400",
    actionPrefix: "Liam", action: "requested access to", target: "Confidential Docs",
    time: "2h ago", isRead: false,
  },
  {
    id: "n-drive-5", module: "drive", actionType: "storage_warning",
    user: "Drive", avatar: profileimg, statusColor: "bg-red-400",
    actionPrefix: "Warning:", action: "Storage is", target: "90% full",
    time: "5h ago", isRead: true,
  },
];

// ─────────────────────────────────────────────
// Normalise a raw API/WebSocket notification
// into the shape the component expects.
// ─────────────────────────────────────────────
export const normalizeNotification = (raw) => ({
  id:           raw.id          || raw.notification_id || `notif-${Date.now()}-${Math.random()}`,
  module:       raw.module      || raw.source          || "mail",
  actionType:   raw.action_type || raw.type            || "new_email",
  user:         raw.actor_name  || raw.user            || "System",
  avatar:       raw.actor_avatar|| raw.avatar          || profileimg,
  statusColor:  raw.status_color|| "bg-gray-300",
  actionPrefix: raw.action_prefix || raw.actor_name   || "",
  action:       raw.action      || raw.body            || "",
  target:       raw.target      || raw.object_name     || "",
  time:         raw.time        || raw.timestamp       || "just now",
  isRead:       raw.is_read     ?? raw.read            ?? false,
  metadata:     raw.metadata    || {},
  mailId:       raw.mailId      || raw.metadata?.mail_id || undefined,
  roomId:       raw.roomId      || raw.metadata?.room_id || undefined,
  eventId:      raw.eventId     || raw.metadata?.event_id || undefined,
  fileId:       raw.fileId      || raw.metadata?.file_id || undefined,
});

// ─────────────────────────────────────────────
// WebSocket hook (connects once, reconnects on drop)
// ─────────────────────────────────────────────
const useNotificationSocket = (onMessage, wsUrl) => {
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (!wsUrl) return;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const normalized = normalizeNotification(payload);
          onMessage(normalized);
        } catch (_) { /* non-JSON frame, ignore */ }
      };

      ws.onclose = () => {
        reconnectTimer.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws.close();
    } catch (_) { /* WebSocket not available in env */ }
  }, [wsUrl, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);
};

// ─────────────────────────────────────────────
// Tiny module badge
// ─────────────────────────────────────────────
const ModuleBadge = ({ module, actionType }) => {
  const colors = MODULE_COLORS[module] || MODULE_COLORS.mail;
  const icon   = ACTION_ICONS[actionType] || ACTION_ICONS[module] || <MailNewIcon />;
  return (
    <span className={`absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full border-[2px] border-white flex items-center justify-center ${colors.bg} ${colors.text}`}>
      {icon}
    </span>
  );
};

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export const NotificationDropdown = ({
  onClose,
  notifications: externalNotifications,
  wsUrl,               // optional: e.g. "wss://api.example.com/ws/notifications"
  onMarkRead,          // optional: callback(notifId) → API call
  onMarkAllRead,       // optional: callback() → API call
  onNotificationClick, // optional: parent-level nav handler(notif)
  onClearAll,          // optional: clear-all handler from parent
}) => {
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const filterRef   = useRef(null);

  const [activeFilters,    setActiveFilters]    = useState([]);
  const [isFilterOpen,     setIsFilterOpen]     = useState(false);
  const [activeModule,     setActiveModule]     = useState("all");

  // Use seed only when parent provides NO notifications prop at all (undefined).
  // If parent passes an empty array [], show empty state (real data loaded, nothing yet).
  const [notifications, setNotifications] = useState(() => {
    if (externalNotifications === undefined || externalNotifications === null) {
      return SEED_NOTIFICATIONS;
    }
    return externalNotifications.map(normalizeNotification);
  });

  // Sync whenever parent updates notifications prop
  useEffect(() => {
    if (externalNotifications === undefined || externalNotifications === null) return;
    setNotifications(externalNotifications.map(normalizeNotification));
  }, [externalNotifications]);

  // WebSocket – prepend incoming notifications
  const handleWsMessage = useCallback((notif) => {
    setNotifications((prev) => [notif, ...prev]);
  }, []);
  useNotificationSocket(handleWsMessage, wsUrl);

  // Click-outside to close entire dropdown
  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest(".bell-icon-container")) return;
      if (filterRef.current?.contains(e.target)) return;
      if (!dropdownRef.current?.contains(e.target)) onClose();
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [onClose]);

  // Close filter panel on outside click
  useEffect(() => {
    if (!isFilterOpen) return;
    const handler = (e) => {
      if (!filterRef.current?.contains(e.target)) setIsFilterOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [isFilterOpen]);

  const handleDropdownClick = (e) => {
    e.stopPropagation();
    if (isFilterOpen && !filterRef.current?.contains(e.target)) setIsFilterOpen(false);
  };

  const toggleFilter = (filterId) => {
    setActiveFilters((prev) =>
      prev.includes(filterId) ? prev.filter((id) => id !== filterId) : [...prev, filterId]
    );
  };

  // Mark a notification read and navigate
  const handleNotifClick = (notif) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    onMarkRead?.(notif.id);
    // If parent provides a navigation handler, delegate to it
    if (onNotificationClick) {
      onClose();
      onNotificationClick(notif);
      return;
    }
    const route = ACTION_ROUTES[notif.actionType] || "/home";
    onClose();
    navigate(route);
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    onMarkAllRead?.();
  };

  const handleClearAll = () => {
    setNotifications([]);
    onClearAll?.();
  };

  // Module tabs with color dots
  const MODULE_TABS = [
    { id: "all",      label: "All",      dot: null },
    { id: "mail",     label: "Mail",     dot: "bg-blue-500" },
    { id: "calendar", label: "Calendar", dot: "bg-purple-500" },
    { id: "chat",     label: "Chat",     dot: "bg-green-500" },
    { id: "drive",    label: "Drive",    dot: "bg-orange-500" },
  ];

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Filter pipeline: module tab → action-type filter chips
  const filtered = notifications
    .filter((n) => activeModule === "all" || n.module === activeModule)
    .filter((n) => activeFilters.length === 0 || activeFilters.includes(n.actionType) || activeFilters.includes(n.module));

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-[52px] z-50 w-[380px] rounded-[24px] bg-white opacity-100 shadow-[0_7px_16px_0px_rgba(0,0,0,0.10),0_29px_29px_0px_rgba(0,0,0,0.09),0_65px_39px_0px_rgba(0,0,0,0.05),0_115px_46px_0px_rgba(0,0,0,0.01),0_180px_50px_0px_rgba(0,0,0,0)]"
      onClick={handleDropdownClick}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 relative">
        <div className="flex items-center gap-2">
          <h3 className="inter-semibold text-[18px] text-black">Notifications</h3>
          {unreadCount > 0 && (
            <span className="flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#040B23] text-white text-[10px] inter-semibold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-[#4A4A4A]">
          {/* Clear all */}
          {notifications.length > 0 && (
            <button
              className="inter-medium text-[11px] text-red-400 hover:text-red-600 transition-colors whitespace-nowrap"
              onClick={(e) => { e.stopPropagation(); handleClearAll(); }}
              aria-label="Clear all notifications"
            >
              Clear all
            </button>
          )}
          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              className="inter-medium text-[11px] text-[#4A4A4A] hover:text-black transition-colors whitespace-nowrap"
              onClick={(e) => { e.stopPropagation(); handleMarkAllRead(); }}
              aria-label="Mark all as read"
            >
              Mark all read
            </button>
          )}

          {/* Filter dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              className={`hover:text-black transition-colors relative ${activeFilters.length > 0 ? "text-blue-500" : ""}`}
              onClick={(e) => { e.stopPropagation(); setIsFilterOpen(!isFilterOpen); }}
              aria-label="Filter notifications"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {activeFilters.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border-[1.5px] border-white"></span>
              )}
            </button>

            <div
              className={`absolute right-0 top-8 w-56 bg-white rounded-xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.12)] border border-gray-100 overflow-hidden transition-all duration-200 transform origin-top-right z-50 ${isFilterOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"}`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <h4 className="inter-medium text-[13px] text-gray-700">Filter by action</h4>
                {activeFilters.length > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveFilters([]); }}
                    className="inter-medium text-[11px] text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="p-1.5 flex flex-col gap-0.5">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={(e) => { e.stopPropagation(); toggleFilter(option.id); }}
                    className={`flex items-center w-full gap-3 px-3 py-2 rounded-lg text-left transition-colors duration-150 group ${activeFilters.includes(option.id) ? "bg-blue-50/50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}
                  >
                    <span className={`flex-shrink-0 ${activeFilters.includes(option.id) ? "text-blue-500" : "text-gray-400 group-hover:text-gray-600"}`}>
                      {option.icon}
                    </span>
                    <span className="inter-medium text-[13px] flex-1">{option.label}</span>
                    {activeFilters.includes(option.id) && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={onClose} className="hover:text-black transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Module Tabs ── */}
      <div className="flex items-center gap-1 px-6 pb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {MODULE_TABS.map((tab) => {
          const tabUnread = tab.id === "all"
            ? unreadCount
            : notifications.filter((n) => n.module === tab.id && !n.isRead).length;
          return (
            <button
              key={tab.id}
              onClick={(e) => { e.stopPropagation(); setActiveModule(tab.id); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] inter-medium transition-all duration-150 ${
                activeModule === tab.id
                  ? "bg-[#040B23] text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {tab.dot && (
                <span className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${activeModule === tab.id ? "bg-white opacity-70" : tab.dot}`} />
              )}
              {tab.label}
              {tabUnread > 0 && (
                <span className={`min-w-[16px] h-[16px] px-1 rounded-full text-[9px] inter-semibold flex items-center justify-center ${
                  activeModule === tab.id ? "bg-white text-[#040B23]" : "bg-[#040B23] text-white"
                }`}>
                  {tabUnread > 99 ? "99+" : tabUnread}
                </span>
              )}
            </button>
          );
        })}
      </div>


      {/* ── Notification list ── */}
      <div className="flex flex-col max-h-[440px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-4">
        {filtered.length > 0 ? (
          filtered.map((notif) => (
            <div
              key={notif.id}
              className={`flex items-start gap-4 px-6 py-[14px] cursor-pointer transition-colors ${
                notif.isRead ? "hover:bg-gray-50" : "bg-blue-50/30 hover:bg-blue-50/60"
              }`}
              onClick={() => handleNotifClick(notif)}
            >
              {/* Avatar with module badge */}
              <div className="relative flex-shrink-0">
                <img
                  src={notif.avatar}
                  alt={notif.user}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => { e.target.src = profileimg; }}
                />
                <div className={`absolute bottom-0 right-[-2px] w-[14px] h-[14px] rounded-full border-[2px] border-white ${notif.statusColor}`}></div>
                {/* Module icon badge — overlaid on top-left of avatar */}
                <span className={`absolute -top-1 -left-1 w-[18px] h-[18px] rounded-full border-[2px] border-white flex items-center justify-center ${MODULE_COLORS[notif.module]?.bg || "bg-gray-100"} ${MODULE_COLORS[notif.module]?.text || "text-gray-500"}`}>
                  {ACTION_ICONS[notif.actionType] || <MailNewIcon />}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-[2px]">
                <div className="flex items-center justify-between">
                  <h4 className="inter-semibold text-[14.5px] text-black">{notif.user}</h4>
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                    )}
                    <span className="inter-regular text-[11px] text-[#8D8D8D] whitespace-nowrap">
                      {notif.time}
                    </span>
                  </div>
                </div>
                <p className="inter-regular text-[13px] text-[#4A4A4A] mt-[3px] truncate">
                  <span className="inter-semibold text-black">{notif.actionPrefix}</span>
                  {notif.actionPrefix && notif.action ? " " : ""}
                  {notif.action}
                  {notif.action && notif.target ? " " : ""}
                  <span className="inter-semibold text-black">{notif.target}</span>
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z"></path>
              </svg>
            </div>
            <h4 className="inter-medium text-[14px] text-gray-900 mb-1">No notifications found</h4>
            <p className="inter-regular text-[13px] text-gray-500">Try adjusting your filters to see more results.</p>
            <button
              onClick={() => { setActiveFilters([]); setActiveModule("all"); }}
              className="mt-4 inter-medium text-[13px] text-blue-500 hover:text-blue-600 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
