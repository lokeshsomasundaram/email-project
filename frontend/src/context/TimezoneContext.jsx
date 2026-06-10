import { createContext, useContext, useState } from "react";

const TimezoneContext = createContext();

export function TimezoneProvider({ children }) {
  const [timezone, setTimezone] = useState(
    localStorage.getItem("userTimezone") || "(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi"
  );
  const [ianaTimezone, setIanaTimezone] = useState(
    localStorage.getItem("userIanaTimezone") || "Asia/Kolkata"
  );

  const updateTimezone = (displayValue, ianaValue) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: ianaValue });
  } catch {
    ianaValue = "UTC";
  }
  setTimezone(displayValue);
  setIanaTimezone(ianaValue);
  localStorage.setItem("userTimezone", displayValue);
  localStorage.setItem("userIanaTimezone", ianaValue);
};

  return (
    <TimezoneContext.Provider value={{ timezone, ianaTimezone, updateTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  return useContext(TimezoneContext);
}