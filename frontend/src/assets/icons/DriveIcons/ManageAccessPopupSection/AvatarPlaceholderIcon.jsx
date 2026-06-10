const AvatarPlaceholderIcon = ({
  size = 40,
  backgroundColor = "#E0E0E0",
  iconColor = "#999",
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="xMidYMid meet"
    {...props}
  >
    <circle
      cx="20"
      cy="20"
      r="20"
      fill={backgroundColor}
    />

    <path
      d="M20 20c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 3c-4.42 0-12 2.21-12 6.63V33h24v-3.38C32 25.21 24.42 23 20 23z"
      fill={iconColor}
    />
  </svg>
);

export default AvatarPlaceholderIcon;