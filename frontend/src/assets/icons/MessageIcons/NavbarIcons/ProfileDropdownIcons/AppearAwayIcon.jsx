const AppearAwayIcon = ({
  size = 17,
  className = "",
  circleColor = "#F89F00",
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
        d="M8.5 4.5V8.5H11"
        stroke={iconColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default AppearAwayIcon;
