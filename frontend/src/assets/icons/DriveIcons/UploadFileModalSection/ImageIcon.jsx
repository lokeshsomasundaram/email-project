const ImageIcon = ({
  size = 20,
  color = "#8E24AA",
  strokeWidth = 2,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={(size * 24) / 20}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      ry="2"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <circle
      cx="8.5"
      cy="8.5"
      r="1.5"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <polyline
      points="21 15 16 10 5 21"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ImageIcon;