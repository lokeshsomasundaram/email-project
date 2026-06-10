import React from "react";
import {
  stringToPastelColor,
  stringToDarkColor,
  resolveAttachmentUrl,
  isImageUrl,
  getAttachmentDisplayName,
  isImageAttachmentMessage,
} from "./ChatMessageArea/ChatMessageArea";

const getBubbleAttachments = (message) => {
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

const isImageAttachment = (attachment) => {
  const resolvedUrl = resolveAttachmentUrl(attachment?.url || "");
  const fileName = attachment?.filename || "";
  return (
    !!resolvedUrl &&
    (isImageUrl(resolvedUrl) ||
      /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(fileName))
  );
};

const AttachmentPreview = ({ attachment }) => {
  const fileUrl = resolveAttachmentUrl(attachment.url);
  const fileName = attachment.filename || "Attachment";

  if (!fileUrl) return null;

  if (isImageAttachment(attachment)) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block"
      >
        <img
          src={fileUrl}
          alt={fileName}
          style={{
            width: "56px",
            height: "56px",
            marginBottom: "0px",
            borderRadius: "8.27px",
            objectFit: "cover",
            opacity: 1,
          }}
        />
      </a>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block max-w-[220px] p-2 rounded bg-white border border-gray-200 hover:bg-gray-50 text-xs break-words"
    >
      Attachment: {fileName}
    </a>
  );
};

const splitAttachmentsByKind = (attachments) => ({
  images: attachments.filter(isImageAttachment),
  documents: attachments.filter((attachment) => !isImageAttachment(attachment)),
});

const ChatMessageBubble = ({
  message,
  isFromMe,
  currentUserEmail,
  imageBatch,
}) => {
  const batchMessages =
    Array.isArray(imageBatch) && imageBatch.length > 0 ? imageBatch : null;
  let isStarred = false;
  if (batchMessages) {
    isStarred = batchMessages.some(
      (m) => m?.is_starred || m?.is_saved || m?.starred,
    );
  } else {
    isStarred = message?.is_starred || message?.is_saved || message?.starred;
  }
  // Use the first message in the batch for sender info
  const mainMessage = batchMessages ? batchMessages[0] : message;
  const senderName =
  `${mainMessage.sender_first_name || ""} ${
    mainMessage.sender_last_name || ""
  }`.trim() ||
  mainMessage.sender_name ||
  mainMessage.displayName ||
  (mainMessage.sender_email
    ? mainMessage.sender_email.split("@")[0]
    : currentUserEmail?.split("@")[0] || "Unknown");
  const profileImage = mainMessage.sender_profile_image;
  const formattedTime = mainMessage.hideTimestamp
    ? ""
    : mainMessage.timestamp
      ? new Date(mainMessage.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";
  const colorKey = mainMessage.sender_email
    ? mainMessage.sender_email.toLowerCase()
    : mainMessage.room_id
      ? String(mainMessage.room_id)
      : senderName;
  const batchAttachments = batchMessages
    ? batchMessages.flatMap(getBubbleAttachments)
    : [];
  const { images: batchImageAttachments, documents: batchDocumentAttachments } =
    splitAttachmentsByKind(batchAttachments);
  const singleAttachments = !batchMessages ? getBubbleAttachments(message) : [];
  const {
    images: singleImageAttachments,
    documents: singleDocumentAttachments,
  } = splitAttachmentsByKind(singleAttachments);

  if (batchMessages) {
    return (
      <div
        className={`flex ${isFromMe ? "justify-end" : "justify-start"} mb-2 group`}
      >
        <div
          className={`flex flex-row max-w-[70%] ${isFromMe ? "items-end" : "items-start"} relative`}
        >
          {/* Avatar rendering */}
          {!isFromMe &&
            (profileImage ? (
              <img
                src={profileImage}
                alt={senderName}
                className="w-[30px] h-[30px] rounded-full object-cover mr-3"
              />
            ) : (
              <div
                className="w-[30px] h-[30px] rounded-full text-[11px] font-semibold flex items-center justify-center uppercase mr-3"
                style={{
                  background: stringToPastelColor(colorKey),
                  color: stringToDarkColor(colorKey),
                }}
              >
                {senderName.charAt(0).toUpperCase()}
              </div>
            ))}
          <div className="flex flex-col flex-1">
            {/* Sender name and time */}
            {!isFromMe && (
              <span className="inter-bold text-[11px] mb-3 ml-2 flex items-center gap-2">
                {senderName}
                <span className="inter-regular text-[9px] text-[#898989] ml-2">
                  {formattedTime}
                </span>
              </span>
            )}
            {isFromMe && (
              <div className="flex justify-end gap-[10px] mb-1">
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
                <span className="inter-regular text-[9px] text-[#898989]">
                  {formattedTime}
                </span>
              </div>
            )}
            {/* Image batch bubble */}
            <div className="relative w-fit">
              <div className="px-3 py-2 rounded-[10px] bg-[#EDEDED] text-[#000000]">
                {isStarred && (
                  <span className="absolute -top-2 -right-2">
                    {/* <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.31912 1.4625L9.49245 3.8285C9.65245 4.15783 10.0791 4.47383 10.4391 4.53383L12.5651 4.8905C13.9251 5.11917 14.2451 6.11383 13.2651 7.09517L11.6118 8.76183C11.3318 9.04383 11.1785 9.5885 11.2651 9.9785L11.7385 12.0418C12.1118 13.6752 11.2518 14.3065 9.81845 13.4532L7.82512 12.2632C7.46512 12.0485 6.87179 12.0485 6.50512 12.2632L4.51312 13.4532C3.08645 14.3065 2.21979 13.6678 2.59312 12.0418L3.06645 9.9785C3.15312 9.5885 2.99979 9.04383 2.71979 8.76183L1.06645 7.09517C0.0937881 6.11317 0.407121 5.11917 1.76645 4.8905L3.89312 4.53383C4.24645 4.47383 4.67312 4.15783 4.83312 3.8285L6.00645 1.4625C6.64645 0.179167 7.68579 0.179167 8.31912 1.4625Z" fill="#6A37F5" stroke="#6A37F5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg> */}
                  </span>
                )}
                <div className="flex flex-row gap-1 overflow-x-auto">
                  {batchImageAttachments.map((attachment, idx) => (
                    <AttachmentPreview
                      key={`${attachment.url}-${idx}`}
                      attachment={attachment}
                    />
                  ))}
                </div>
                {/* Show content if any of the batch messages has content (not just attachment label or file label) */}
                {batchMessages.some(
                  (m) =>
                    m.content &&
                    !/^([📎]|sent a file:)/i.test(String(m.content).trim()),
                ) && (
                  <div className="mt-2">
                    {batchMessages.map((m, idx) =>
                      m.content &&
                      !/^([📎]|sent a file:)/i.test(
                        String(m.content).trim(),
                      ) ? (
                        <p
                          key={`img-batch-content-${idx}`}
                          className="text-sm break-words whitespace-pre-wrap"
                        >
                          {m.content}
                        </p>
                      ) : null,
                    )}
                  </div>
                )}
              </div>
            </div>
            {batchDocumentAttachments.length > 0 && (
              <div className="mt-[-2px] px-3 py-2 rounded-[10px] bg-[#EDEDED] text-[#000000] relative w-fit">
                <div className="flex flex-col gap-1">
                  {batchDocumentAttachments.map((attachment, idx) => (
                    <AttachmentPreview
                      key={`${attachment.url}-${idx}`}
                      attachment={attachment}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Right side avatar for sent messages */}
          {isFromMe &&
            (profileImage ? (
              <img
                src={profileImage}
                alt={senderName}
                className="w-[30px] h-[30px] rounded-full object-cover ml-2"
              />
            ) : (
              <div
                className="w-[30px] h-[30px] rounded-full text-[11px] font-semibold flex items-center justify-center uppercase ml-2"
                style={{
                  background: stringToPastelColor(colorKey),
                  color: stringToDarkColor(colorKey),
                }}
              >
                {senderName.charAt(0).toUpperCase()}
              </div>
            ))}
        </div>
      </div>
    );
  }

  // Fallback: single image or normal message
  if (singleImageAttachments.length > 0) {
    return (
      <div
        className={`flex ${isFromMe ? "justify-end" : "justify-start"} mb-2 group`}
      >
        <div
          className={`flex flex-row max-w-[70%] ${isFromMe ? "items-end" : "items-start"} relative`}
        >
          {!isFromMe &&
            (profileImage ? (
              <img
                src={profileImage}
                alt={senderName}
                className="w-[30px] h-[30px] rounded-full object-cover mr-3"
              />
            ) : (
              <div
                className="w-[30px] h-[30px] rounded-full text-[11px] font-semibold flex items-center justify-center uppercase mr-3"
                style={{
                  background: stringToPastelColor(colorKey),
                  color: stringToDarkColor(colorKey),
                }}
              >
                {senderName.charAt(0).toUpperCase()}
              </div>
            ))}
          <div className="flex flex-col flex-1">
            {!isFromMe && (
              <span className="inter-bold text-[11px] mb-3 ml-2 flex items-center gap-2">
                {senderName}
                <span className="inter-regular text-[9px] text-[#898989] ml-2">
                  {formattedTime}
                </span>
              </span>
            )}
            {isFromMe && (
              <div className="flex justify-end gap-[10px] mb-1">
                <span className="inter-regular text-[9px] text-[#898989]">
                  {formattedTime}
                </span>
              </div>
            )}
            <div className="px-3 py-2 rounded-[10px] bg-[#EDEDED] text-[#000000] relative w-fit">
              <div className="flex flex-row gap-1 overflow-x-auto">
                {singleImageAttachments.map((attachment, index) => (
                  <AttachmentPreview
                    key={`${attachment.url}-${index}`}
                    attachment={attachment}
                  />
                ))}
              </div>
              {message.content &&
              !String(message.content).trim().startsWith("ðŸ“Ž") ? (
                <p className="text-sm break-words whitespace-pre-wrap mt-2">
                  {message.content}
                </p>
              ) : null}
            </div>
            {singleDocumentAttachments.length > 0 && (
              <div className="mt-[-2px] px-3 py-2 rounded-[10px] bg-[#EDEDED] text-[#000000] relative w-fit">
                <div className="flex flex-col gap-1">
                  {singleDocumentAttachments.map((attachment, index) => (
                    <AttachmentPreview
                      key={`${attachment.url}-${index}`}
                      attachment={attachment}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          {isFromMe &&
            (profileImage ? (
              <img
                src={profileImage}
                alt={senderName}
                className="w-[30px] h-[30px] rounded-full object-cover ml-2"
              />
            ) : (
              <div
                className="w-[30px] h-[30px] rounded-full text-[11px] font-semibold flex items-center justify-center uppercase ml-2"
                style={{
                  background: stringToPastelColor(colorKey),
                  color: stringToDarkColor(colorKey),
                }}
              >
                {senderName.charAt(0).toUpperCase()}
              </div>
            ))}
        </div>
      </div>
    );

    // return (
    //   <div
    //     className={`flex ${isFromMe ? "justify-end" : "justify-start"} mb-2 group`}
    //   >
    //     <div
    //       className={`flex flex-row max-w-[70%] ${isFromMe ? "items-end" : "items-start"} relative`}
    //     >
    //       {/* Avatar rendering */}
    //       {!isFromMe &&
    //         (profileImage ? (
    //           <img
    //             src={profileImage}
    //             alt={senderName}
    //             className="w-[30px] h-[30px] rounded-full object-cover mr-3"
    //           />
    //         ) : (
    //           <div className="w-[30px] h-[30px] rounded-full bg-gray-500 text-white text-[11px] font-semibold flex items-center justify-center uppercase mr-3">
    //             {senderName.charAt(0).toUpperCase()}
    //           </div>
    //         ))}
    //       <div className="flex flex-col flex-1">
    //         {/* Sender name and time */}
    //         {!isFromMe && (
    //           <span className="inter-bold text-[11px] mb-3 ml-2 flex items-center gap-2">
    //             {senderName}
    //             <span className="inter-regular text-[9px] text-[#898989] ml-2">
    //               {formattedTime}
    //             </span>
    //           </span>
    //         )}
    //         {isFromMe && (
    //           <div className="flex justify-end gap-[10px] mb-1">
    //             <svg
    //               width="15"
    //               height="15"
    //               viewBox="0 0 15 15"
    //               fill="none"
    //               xmlns="http://www.w3.org/2000/svg"
    //             >
    //               <path
    //                 d="M8.31912 1.4625L9.49245 3.8285C9.65245 4.15783 10.0791 4.47383 10.4391 4.53383L12.5651 4.8905C13.9251 5.11917 14.2451 6.11383 13.2651 7.09517L11.6118 8.76183C11.3318 9.04383 11.1785 9.5885 11.2651 9.9785L11.7385 12.0418C12.1118 13.6752 11.2518 14.3065 9.81845 13.4532L7.82512 12.2632C7.46512 12.0485 6.87179 12.0485 6.50512 12.2632L4.51312 13.4532C3.08645 14.3065 2.21979 13.6678 2.59312 12.0418L3.06645 9.9785C3.15312 9.5885 2.99979 9.04383 2.71979 8.76183L1.06645 7.09517C0.0937881 6.11317 0.407121 5.11917 1.76645 4.8905L3.89312 4.53383C4.24645 4.47383 4.67312 4.15783 4.83312 3.8285L6.00645 1.4625C6.64645 0.179167 7.68579 0.179167 8.31912 1.4625Z"
    //                 fill="#6A37F5"
    //                 stroke="#6A37F5"
    //                 stroke-linecap="round"
    //                 stroke-linejoin="round"
    //               />
    //             </svg>
    //             <span className="inter-regular text-[9px] text-[#898989]">
    //               {formattedTime}
    //             </span>
    //           </div>
    //         )}
    //         {isFromMe && (
    //           <div className="flex justify-end gap-[6px] mb-1 items-center">
    //             <span className="inter-regular text-[9px] text-[#898989]">
    //               {formattedTime}
    //             </span>
    //             {isStarred && (
    //               <svg
    //                 width="15"
    //                 height="15"
    //                 viewBox="0 0 15 15"
    //                 fill="none"
    //                 xmlns="http://www.w3.org/2000/svg"
    //               >
    //                 <path
    //                   d="M8.31912 1.4625L9.49245 3.8285C9.65245 4.15783 10.0791 4.47383 10.4391 4.53383L12.5651 4.8905C13.9251 5.11917 14.2451 6.11383 13.2651 7.09517L11.6118 8.76183C11.3318 9.04383 11.1785 9.5885 11.2651 9.9785L11.7385 12.0418C12.1118 13.6752 11.2518 14.3065 9.81845 13.4532L7.82512 12.2632C7.46512 12.0485 6.87179 12.0485 6.50512 12.2632L4.51312 13.4532C3.08645 14.3065 2.21979 13.6678 2.59312 12.0418L3.06645 9.9785C3.15312 9.5885 2.99979 9.04383 2.71979 8.76183L1.06645 7.09517C0.0937881 6.11317 0.407121 5.11917 1.76645 4.8905L3.89312 4.53383C4.24645 4.47383 4.67312 4.15783 4.83312 3.8285L6.00645 1.4625C6.64645 0.179167 7.68579 0.179167 8.31912 1.4625Z"
    //                   fill="#6A37F5"
    //                   stroke="#6A37F5"
    //                   stroke-linecap="round"
    //                   stroke-linejoin="round"
    //                 />
    //               </svg>
    //             )}
    //           </div>
    //         )}
    //         {/* Image bubble */}
    //         <div className="px-3 py-2 rounded-[10px] bg-[#EDEDED] text-[#000000] relative w-fit">
    //           {isStarred && (
    //             <span className="absolute -top-2 -right-2">
    //               {/* <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
    //               <path d="M8.31912 1.4625L9.49245 3.8285C9.65245 4.15783 10.0791 4.47383 10.4391 4.53383L12.5651 4.8905C13.9251 5.11917 14.2451 6.11383 13.2651 7.09517L11.6118 8.76183C11.3318 9.04383 11.1785 9.5885 11.2651 9.9785L11.7385 12.0418C12.1118 13.6752 11.2518 14.3065 9.81845 13.4532L7.82512 12.2632C7.46512 12.0485 6.87179 12.0485 6.50512 12.2632L4.51312 13.4532C3.08645 14.3065 2.21979 13.6678 2.59312 12.0418L3.06645 9.9785C3.15312 9.5885 2.99979 9.04383 2.71979 8.76183L1.06645 7.09517C0.0937881 6.11317 0.407121 5.11917 1.76645 4.8905L3.89312 4.53383C4.24645 4.47383 4.67312 4.15783 4.83312 3.8285L6.00645 1.4625C6.64645 0.179167 7.68579 0.179167 8.31912 1.4625Z" fill="#6A37F5" stroke="#6A37F5" stroke-linecap="round" stroke-linejoin="round"/>
    //             </svg> */}
    //             </span>
    //           )}
    //           <div className="flex flex-row gap-2 overflow-x-auto">
    //             <div className="space-y-2">
    //               {attachments.map((attachment, index) => {
    //                 const fileUrl = resolveAttachmentUrl(attachment.url);
    //                 const fileName = attachment.filename;

    //                 return (
    //                   <a
    //                     key={`${fileUrl}-${index}`}
    //                     href={fileUrl}
    //                     target="_blank"
    //                     rel="noopener noreferrer"
    //                     className="block p-2 rounded bg-white border border-gray-200 hover:bg-gray-50"
    //                   >
    //                     📎 {fileName}
    //                   </a>
    //                 );
    //               })}
    //             </div>
    //           </div>
    //           {message.content &&
    //           !String(message.content).trim().startsWith("📎") ? (
    //             <p className="text-sm break-words whitespace-pre-wrap mt-2">
    //               {message.content}
    //             </p>
    //           ) : null}
    //         </div>
    //       </div>
    //       {/* Right side avatar for sent messages */}
    //       {isFromMe &&
    //         (profileImage ? (
    //           <img
    //             src={profileImage}
    //             alt={senderName}
    //             className="w-[30px] h-[30px] rounded-full object-cover ml-2"
    //           />
    //         ) : (
    //           <div className="w-[30px] h-[30px] rounded-full bg-gray-500 text-white text-[11px] font-semibold flex items-center justify-center uppercase ml-2">
    //             {senderName.charAt(0).toUpperCase()}
    //           </div>
    //         ))}
    //     </div>
    //   </div>
    // );
  }
  // Fallback: render text, file, or other message types
  const attachments = getBubbleAttachments(message);
  const isFile = attachments.length > 0;
  return (
    <div
      className={`flex ${isFromMe ? "justify-end" : "justify-start"} mb-2 group`}
    >
      <div
        className={`flex flex-row max-w-[70%] ${isFromMe ? "items-end" : "items-start"} relative`}
      >
        {/* Avatar rendering */}
        {!isFromMe &&
          (profileImage ? (
            <img
              src={profileImage}
              alt={senderName}
              className="w-[30px] h-[30px] rounded-full object-cover mr-3"
            />
          ) : (
            <div
              className="w-[30px] h-[30px] rounded-full text-[11px] font-semibold flex items-center justify-center uppercase mr-3"
              style={{
                background: stringToPastelColor(colorKey),
                color: stringToDarkColor(colorKey),
              }}
            >
              {senderName.charAt(0).toUpperCase()}
            </div>
          ))}
        <div className="flex flex-col flex-1">
          {/* Sender name and time */}
          {!isFromMe && (
            <span className="inter-bold text-[11px] mb-3 ml-2 flex items-center gap-2.5">
              {senderName}
              <span className="inter-regular text-[9px] text-[#898989] ml-2">
                {formattedTime}
              </span>
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
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          )}
          {isFromMe && (
            <div className="flex justify-end gap-[10px] mb-1">
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
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span className="inter-regular text-[9px] text-[#898989]">
                {formattedTime}
              </span>
            </div>
          )}
          {/* Message bubble for text/file */}
          <div className="px-3 py-2 rounded-[10px] bg-[#EDEDED] text-[#000000] relative w-fit">
            {isStarred && (
              <span className="absolute -top-2 -right-2">
                {/* <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.31912 1.4625L9.49245 3.8285C9.65245 4.15783 10.0791 4.47383 10.4391 4.53383L12.5651 4.8905C13.9251 5.11917 14.2451 6.11383 13.2651 7.09517L11.6118 8.76183C11.3318 9.04383 11.1785 9.5885 11.2651 9.9785L11.7385 12.0418C12.1118 13.6752 11.2518 14.3065 9.81845 13.4532L7.82512 12.2632C7.46512 12.0485 6.87179 12.0485 6.50512 12.2632L4.51312 13.4532C3.08645 14.3065 2.21979 13.6678 2.59312 12.0418L3.06645 9.9785C3.15312 9.5885 2.99979 9.04383 2.71979 8.76183L1.06645 7.09517C0.0937881 6.11317 0.407121 5.11917 1.76645 4.8905L3.89312 4.53383C4.24645 4.47383 4.67312 4.15783 4.83312 3.8285L6.00645 1.4625C6.64645 0.179167 7.68579 0.179167 8.31912 1.4625Z" fill="#6A37F5" stroke="#6A37F5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg> */}
              </span>
            )}
            {/* Show file link if file is present and not an image */}
            {isFile && !isImageAttachmentMessage(message) && (
              <div className="flex flex-col gap-2 mb-1">
                {attachments.map((attachment, index) => (
                  <AttachmentPreview
                    key={`${attachment.url}-${index}`}
                    attachment={attachment}
                  />
                ))}
              </div>
            )}
            {/* Show text content if present and not a file label */}
            {message.content &&
              !/^([📎]|sent a file:)/i.test(String(message.content).trim()) && (
                <p className="text-sm break-words whitespace-pre-wrap">
                  {message.content}
                </p>
              )}
          </div>
        </div>
        {/* Right side avatar for sent messages */}
        {isFromMe &&
          (profileImage ? (
            <img
              src={profileImage}
              alt={senderName}
              className="w-[30px] h-[30px] rounded-full object-cover ml-2"
            />
          ) : (
            <div
              className="w-[30px] h-[30px] rounded-full text-[11px] font-semibold flex items-center justify-center uppercase ml-2"
              style={{
                background: stringToPastelColor(colorKey),
                color: stringToDarkColor(colorKey),
              }}
            >
              {senderName.charAt(0).toUpperCase()}
            </div>
          ))}
      </div>
    </div>
  );
};

export default ChatMessageBubble;
