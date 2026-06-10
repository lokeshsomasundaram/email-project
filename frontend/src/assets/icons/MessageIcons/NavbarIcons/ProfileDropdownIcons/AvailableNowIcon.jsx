const AvailableNowIcon = ({
  size = 17,
  className = "",
  circleColor = "#1EAF53",
  iconColor = "#FFFFFF",
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 17 17"
      fill="none"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <circle cx="8.5" cy="8.5" r="8.5" fill={circleColor} />

      <path
        d="M5 8.7L7.2 10.8L12 5.8"
        stroke={iconColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default AvailableNowIcon;
