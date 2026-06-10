const OfflineStatusIcon = ({
  size = 17,
  circleColor = "#FFFFFF",
  borderColor = "#9CA3AF",
  iconColor = "#6B7280",
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="8"
        cy="8"
        r="7"
        fill={circleColor}
        stroke={borderColor}
        strokeWidth="1.5"
      />

      <path
        d="M5.5 5.5L10.5 10.5"
        stroke={iconColor}
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="M10.5 5.5L5.5 10.5"
        stroke={iconColor}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default OfflineStatusIcon;
