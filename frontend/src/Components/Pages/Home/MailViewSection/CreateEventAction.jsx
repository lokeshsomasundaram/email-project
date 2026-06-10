import React from "react";
import { useNavigate } from "react-router-dom";
import { CreateEventCalendarIcon } from "../../../../assets/icons/IconRegistry";

const CreateEventAction = ({
  mail,
  setIsDropdownOpen,
  className = "",
}) => {
  const navigate = useNavigate();

  const handleCreateEvent = () => {
    setIsDropdownOpen?.(false);

    navigate("/calendar", {
      state: {
        openCreateEvent: true,
        mailData: mail,
      },
    });
  };

  return (
    <div
      onClick={handleCreateEvent}
      className={`px-[16px] py-[10px] flex flex-row items-center gap-[12px] hover:bg-[#F5F5F5] cursor-pointer transition-colors ${className}`}
    >
      <CreateEventCalendarIcon />
      <span className="inter-regular text-[14px] text-[#040B23]">
        Create event
      </span>
    </div>
  );
};

export default CreateEventAction;