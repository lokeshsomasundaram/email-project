const SortIcon = ({
  size = 14,
  className = "",
  color = "#040B23",
  activeColor = "#6A37F5",
  isActive = false,
  strokeWidth = 0.875,
  ...props
}) => {
  const strokeColor = isActive ? activeColor : color;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <path
        d="M6.41667 4.66667H11.0833M6.41667 7H9.33333M6.41667 9.33333H8.16667M6.41667 2.33333H12.25M3.20833 12.25V1.75M3.20833 12.25C2.8 12.25 2.037 11.0868 1.75 10.7917M3.20833 12.25C3.61667 12.25 4.37967 11.0868 4.66667 10.7917"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default SortIcon;