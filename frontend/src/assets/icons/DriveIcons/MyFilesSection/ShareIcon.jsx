const ShareIcon = ({
  size = 16,
  className = "",
  color = "#555",
  strokeWidth = 1.5,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    preserveAspectRatio="xMidYMid meet"
    {...props}
  >
    <circle cx="18" cy="5" r="3" stroke={color} strokeWidth={strokeWidth} />
    <circle cx="6" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} />
    <circle cx="18" cy="19" r="3" stroke={color} strokeWidth={strokeWidth} />
    <line
      x1="8.59"
      y1="13.51"
      x2="15.42"
      y2="17.49"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
    <line
      x1="15.41"
      y1="6.51"
      x2="8.59"
      y2="10.49"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

export default ShareIcon;
