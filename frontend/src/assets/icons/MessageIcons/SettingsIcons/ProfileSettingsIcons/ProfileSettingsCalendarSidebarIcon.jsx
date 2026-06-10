const ProfileSettingsCalendarSidebarIcon = ({
  size = 15,
  className = "",
  color = "#70707C",
  activeColor = "white",
  isActive = false,
  strokeWidth = 1,
  ...props
}) => {
  const strokeColor = isActive ? activeColor : color;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 13 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <path
        d="M9.16667 0.5V3.16667M3.83333 0.5V3.16667M0.5 5.83333H12.5M7.16667 1.83333H5.83333C3.31933 1.83333 2.062 1.83333 1.28133 2.61467C0.500667 3.396 0.5 4.65267 0.5 7.16667V8.5C0.5 11.014 0.5 12.2713 1.28133 13.052C2.06267 13.8327 3.31933 13.8333 5.83333 13.8333H7.16667C9.68067 13.8333 10.938 13.8333 11.7187 13.052C12.4993 12.2707 12.5 11.014 12.5 8.5V7.16667C12.5 4.65267 12.5 3.39533 11.7187 2.61467C10.9373 1.834 9.68067 1.83333 7.16667 1.83333Z"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ProfileSettingsCalendarSidebarIcon;