import React from "react";
import profileimage from "../../../../assets/images/profileimg.png";
import { formatUser } from "../../../../utils/FormatUser";

export const MailSenderInfo = ({ mail }) => {
  const senderName =
    mail?.sender_name ||
    formatUser(mail?.sender || mail?.from, "name");

  const senderEmail =
    formatUser(mail?.sender || mail?.from, "email");

  return (
    <div className="flex items-start gap-[12px]">
      <img
        src={profileimage}
        alt="Profile"
        className="w-[36px] h-[36px] rounded-full"
      />

      <div className="flex flex-col">
        <span className="inter-bold text-[10px]">
          {senderName}
        </span>

        <span className="inter-regular text-[10px] text-[#636775]">
          {senderEmail}
        </span>
      </div>
    </div>
  );
};