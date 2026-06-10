// import React, { useState } from "react";

// export const MailRecipients = ({ mail, selectedMailbox }) => {
//   //   const [showDetails, setShowDetails] = useState(false);

//   const isSenderMailbox = ["sent", "outbox","drafts"].includes(selectedMailbox);

//   const formatRecipients = (value) => {
//     if (!value) return "-";

//     if (typeof value === "string") {
//       return value;
//     }

//     if (Array.isArray(value)) {
//       return value
//         .map((item) => {
//           if (typeof item === "string") return item;

//           const fullName = `${item?.first_name || ""} ${
//             item?.last_name || ""
//           }`.trim();

//           return fullName || item?.email || "-";
//         })
//         .join(", ");
//     }

//     // SINGLE OBJECT
//     if (typeof value === "object") {
//       const fullName = `${value?.first_name || ""} ${
//         value?.last_name || ""
//       }`.trim();

//       return fullName || value?.email || "-";
//     }

//     return "-";
//   };

//   const getSenderName = () => {
//     if (isSenderMailbox) {
//       return (
//         mail.sender_name ||
//         `${mail.sender?.first_name || ""} ${
//           mail.sender?.last_name || ""
//         }`.trim()
//       );
//     }

//     return mail.from || "-";
//   };

//   return (
//     <div className="mt-[4px]">
//       <div className="flex items-center gap-2">
//         <span className="text-[12px] text-[#636775]">
//           to {formatRecipients(mail.to)}
//         </span>

//         {/* <button
//           onClick={() => setShowDetails(!showDetails)}
//           className="text-[#6A37F5] text-[12px]"
//         >
//           {showDetails ? "▲" : "▼"}
//         </button> */}
//       </div>

//       {/* Expanded Details */}
//       {/* {showDetails && ( */}
//       <div className="mt-2 p-3">
//         {/* <div className="flex gap-3 text-[12px]">
//           <span className="inter-semibold w-[50px]">From</span>
//           <span>{getSenderName()}</span>
//         </div> */}

//         {mail.cc && (Array.isArray(mail.cc) ? mail.cc.length > 0 : true) && (
//           <div className="flex gap-3 text-[12px] mt-1">
//             <span className="inter-semibold w-[50px]">Cc</span>
//             <span>{formatRecipients(mail.cc)}</span>
//           </div>
//         )}

//         {showBcc && mail.bcc && (Array.isArray(mail.bcc) ? mail.bcc.length > 0 : true) && (
//           <div className="flex gap-3 text-[12px] mt-1">
//             <span className="inter-semibold w-[50px]">Bcc</span>
//             <span>{formatRecipients(mail.bcc)}</span>
//           </div>
//         )}

//         {/* <div className="flex gap-3 text-[12px] mt-1">
//             <span className="inter-semibold w-[50px]">
//               Date
//             </span>
//             <span>
//               {new Date(mail.date).toLocaleString()}
//             </span>
//           </div> */}
//       </div>
//       {/* )} */}
//     </div>
//   );
// };

import React from "react";

export const MailRecipients = ({ mail, showBcc=false }) => {
  const formatRecipients = (value) => {
    if (!value) return "";

    if (typeof value === "string") {
      return value;
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => {
          const fullName =
            `${item?.first_name || ""} ${
              item?.last_name || ""
            }`.trim();

          return fullName || item?.email;
        })
        .join(", ");
    }

    if (typeof value === "object") {
      const fullName =
        `${value?.first_name || ""} ${
          value?.last_name || ""
        }`.trim();

      return fullName || value?.email;
    }

    return "";
  };

  return (
    <div className="mt-[6px] ml-[44px] text-[10px] text-[#636775]">
      {!!formatRecipients(mail?.to) && (
        <div className="flex">
          <span className="w-[30px] inter-medium">To</span>
          <span>:</span>
          <span className="ml-[6px]">
            {formatRecipients(mail.to)}
          </span>
        </div>
      )}

      {!!formatRecipients(mail?.cc) && (
        <div className="flex">
          <span className="w-[30px] inter-medium">Cc</span>
          <span>:</span>
          <span className="ml-[6px]">
            {formatRecipients(mail.cc)}
          </span>
        </div>
      )}

      {showBcc && !!formatRecipients(mail?.bcc) && (
        <div className="flex">
          <span className="w-[30px] inter-medium">Bcc</span>
          <span>:</span>
          <span className="ml-[6px]">
            {formatRecipients(mail.bcc)}
          </span>
        </div>
      )}
    </div>
  );
};