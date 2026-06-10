import React, { useState, useEffect, useRef } from "react";
import {
  SnoozeIcon,
  SnoozeChevronLeftIcon,
  SnoozeChevronRightIcon,
  CloseIcon,
} from "../../../assets/icons/IconRegistry";

const Snooze = ({ mailId, onSnooze }) => {
  const [isSnoozeOpen, setIsSnoozeOpen] = useState(false);
  const snoozeRef = useRef(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [currentMonth, setCurrentMonth] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [dateError, setDateError] = useState("");

  // Initialize custom date picker with next hour
  useEffect(() => {
    if (showDatePicker) {
      const now = new Date();
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1);
      nextHour.setMinutes(0);
      const yyyy = nextHour.getFullYear();
      const mm = String(nextHour.getMonth() + 1).padStart(2, "0");
      const dd = String(nextHour.getDate()).padStart(2, "0");
      const HH = String(nextHour.getHours()).padStart(2, "0");
      const min = String(nextHour.getMinutes()).padStart(2, "0");

      setCustomDate(`${yyyy}-${mm}-${dd}`);
      setCustomTime(`${HH}:${min}`);
      setCurrentMonth(new Date(yyyy, nextHour.getMonth(), 1));
      setDateError("");
    }
  }, [showDatePicker]);

  const daysInMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  ).getDate();
  const firstDayOfMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  ).getDay();

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (snoozeRef.current && !snoozeRef.current.contains(event.target)) {
        setIsSnoozeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Keyboard navigation for dropdown
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsSnoozeOpen(false);
      }
    };
    if (isSnoozeOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSnoozeOpen]);

  const handleSnoozeOption = (optionId) => {
    let scheduledTime = new Date();
    if (optionId === "later_today") {
      scheduledTime.setHours(scheduledTime.getHours() + 3);
    } else if (optionId === "tomorrow") {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
      scheduledTime.setHours(9, 0, 0, 0);
    } else if (optionId === "end_of_week") {
      const daysUntilSaturday = (6 - scheduledTime.getDay() + 7) % 7 || 7;
      scheduledTime.setDate(scheduledTime.getDate() + daysUntilSaturday);
      scheduledTime.setHours(10, 0, 0, 0);
    } else if (optionId === "next_week") {
      const daysUntilMonday = (1 - scheduledTime.getDay() + 7) % 7 || 7;
      scheduledTime.setDate(scheduledTime.getDate() + daysUntilMonday);
      scheduledTime.setHours(9, 0, 0, 0);
    } else if (optionId === "choose_date") {
      setShowDatePicker(true);
      setIsSnoozeOpen(false);
      return;
    }

    if (onSnooze) {
      onSnooze(mailId, scheduledTime);
    }
    setIsSnoozeOpen(false);
  };

  const submitCustomDate = () => {
    if (!customDate || !customTime) return;
    const dt = new Date(`${customDate}T${customTime}`);
    if (dt <= new Date()) {
      setDateError("Please select a future date and time.");
      return;
    }
    setDateError("");
    if (onSnooze) {
      onSnooze(mailId, dt);
    }
    setShowDatePicker(false);
  };

  return (
    <>
      {/* Snooze Wrapper with clock icon */}
      <div
        className="relative flex items-center justify-center -mt-[1px]"
        ref={snoozeRef}
      >
        <SnoozeIcon
          className="cursor-pointer transition-transform hover:scale-110"
          onClick={() => setIsSnoozeOpen(!isSnoozeOpen)}
        />
        {/* Snooze Dropdown Panel */}
        {isSnoozeOpen && (
          <div className="absolute top-[24px] left-0 z-50 w-[180px] bg-white rounded-[12px] shadow-[0px_4px_24px_rgba(0,0,0,0.15)] border border-[#EAEAEA] py-[6px] flex flex-col transform origin-top transition-all animate-[slideDown_0.2s_ease-out]">
            <div className="px-[12px] py-[4px] text-[10px] text-[#767676] inter-medium uppercase tracking-wider">
              Snooze until
            </div>
            <div className="border-t border-[#EAEAEA] my-[2px]"></div>
            {[
              { id: "later_today", label: "Later today", timeStr: "18:00" },
              { id: "tomorrow", label: "Tomorrow", timeStr: "Tue 08:00" },
              {
                id: "end_of_week",
                label: "End of week",
                timeStr: "Fri 18:00",
              },
              { id: "next_week", label: "Next week", timeStr: "Mon 08:00" },
            ].map((option) => (
              <div
                key={option.id}
                onClick={() => handleSnoozeOption(option.id)}
                className="px-[12px] py-[8px] hover:bg-[#F5F5F5] cursor-pointer flex justify-between items-center group transition-colors"
              >
                <span className="inter-regular text-[13px] text-[#040B23]">
                  {option.label}
                </span>
                <span className="inter-regular text-[11px] text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity">
                  {option.timeStr}
                </span>
              </div>
            ))}
            <div className="border-t border-[#EAEAEA] my-[2px]"></div>
            <div
              onClick={() => handleSnoozeOption("choose_date")}
              className="px-[12px] py-[8px] hover:bg-[#F5F5F5] cursor-pointer flex justify-between items-center transition-colors"
            >
              <span className="inter-regular text-[13px] text-[#040B23]">
                Choose a date
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Custom Date Picker Modal */}
      {showDatePicker && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(0,0,0,0.4)] backdrop-blur-[2px]"
          onClick={() => setShowDatePicker(false)}
        >
          <div
            className="bg-white rounded-[12px] shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex flex-col animate-[slideUp_0.2s_ease-out] w-[500px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-[24px] py-[16px] border-b border-[#EAEAEA]">
              <h3 className="inter-semibold text-[16px] text-[#040B23]">
                Set custom date and time
              </h3>
              <button
                onClick={() => setShowDatePicker(false)}
                className="text-[#767676] hover:text-[#040B23] transition-colors cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-row p-[24px] gap-[24px] flex-wrap md:flex-nowrap">
              {/* Left Section (Calendar) */}
              <div className="flex-1 flex flex-col min-w-[210px]">
                <div className="flex justify-between items-center mb-[12px]">
                  <span className="inter-medium text-[14px] text-[#040B23] capitalize">
                    {currentMonth.toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <div className="flex gap-[8px]">
                    <button
                      onClick={() =>
                        setCurrentMonth(
                          new Date(
                            currentMonth.getFullYear(),
                            currentMonth.getMonth() - 1,
                            1
                          )
                        )
                      }
                      className="p-[4px] rounded-[4px] hover:bg-[#F5F5F5] text-[#767676] transition-colors cursor-pointer"
                    >
                      <SnoozeChevronLeftIcon />
                    </button>
                    <button
                      onClick={() =>
                        setCurrentMonth(
                          new Date(
                            currentMonth.getFullYear(),
                            currentMonth.getMonth() + 1,
                            1
                          )
                        )
                      }
                      className="p-[4px] rounded-[4px] hover:bg-[#F5F5F5] text-[#767676] transition-colors cursor-pointer"
                    >
                      <SnoozeChevronRightIcon />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-[2px] mb-[8px]">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                    <div
                      key={day}
                      className="text-center inter-medium text-[12px] text-[#767676] py-[4px]"
                    >
                      {day}
                    </div>
                  ))}
                  {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                    <div key={`empty-${idx}`}></div>
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dateNum = idx + 1;
                    const dateObj = new Date(
                      currentMonth.getFullYear(),
                      currentMonth.getMonth(),
                      dateNum
                    );
                    const dateStr = `${dateObj.getFullYear()}-${String(
                      dateObj.getMonth() + 1
                    ).padStart(2, "0")}-${String(dateObj.getDate()).padStart(
                      2,
                      "0"
                    )}`;
                    const isSelected = customDate === dateStr;
                    const isPast =
                      dateObj < new Date(new Date().setHours(0, 0, 0, 0));

                    return (
                      <button
                        key={dateNum}
                        onClick={() => {
                          if (!isPast) {
                            setCustomDate(dateStr);
                            setDateError("");
                          }
                        }}
                        disabled={isPast}
                        className={`h-[28px] w-full rounded-[4px] inter-regular text-[13px] flex items-center justify-center transition-colors cursor-pointer ${
                          isPast
                            ? "text-[#D9D9D9] cursor-not-allowed"
                            : isSelected
                            ? "bg-[#6A37F5] text-white hover:bg-[#5b2cd0]"
                            : "text-[#040B23] hover:bg-[#EAEAEA]"
                        }`}
                      >
                        {dateNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="w-[1px] bg-[#EAEAEA]"></div>

              {/* Right Section (Date & Time) */}
              <div className="flex-1 flex flex-col gap-[16px]">
                <div className="flex flex-col gap-[6px]">
                  <label className="inter-medium text-[12px] text-[#767676]">
                    Selected date
                  </label>
                  <div className="w-full border border-[#EAEAEA] rounded-[6px] px-[12px] py-[8px] inter-regular text-[13px] text-[#040B23] bg-[#F9F9F9]">
                    {customDate
                      ? new Date(customDate + "T00:00:00").toLocaleDateString(
                          "default",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )
                      : "None"}
                  </div>
                </div>

                <div className="flex flex-col gap-[6px]">
                  <label className="inter-medium text-[12px] text-[#767676]">
                    Time
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      value={customTime}
                      onChange={(e) => {
                        setCustomTime(e.target.value);
                        setDateError("");
                      }}
                      className="w-full border border-[#EAEAEA] rounded-[6px] px-[12px] py-[8px] inter-regular text-[13px] text-[#040B23] focus:outline-none focus:border-[#6A37F5] bg-white"
                    />
                  </div>
                </div>

                {dateError && (
                  <div className="text-[#FF4D4D] inter-medium text-[11px] mt-[4px]">
                    {dateError}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-[12px] px-[24px] py-[16px] border-t border-[#EAEAEA]">
              <button
                onClick={submitCustomDate}
                className="px-[16px] py-[8px] rounded-[16px] bg-[#6A37F5] inter-medium text-[13px] text-white shadow-[0_2px_8px_rgba(106,55,245,0.3)] hover:bg-[#5b2cd0] transition-colors cursor-pointer"
              >
                Save
              </button>

              <button
                onClick={() => setShowDatePicker(false)}
                className="px-[16px] py-[8px] rounded-[6px] inter-medium text-[13px] text-[#624ad8] bg-transparent hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Snooze;