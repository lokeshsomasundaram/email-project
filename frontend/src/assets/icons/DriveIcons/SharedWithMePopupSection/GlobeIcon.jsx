const GlobeIcon = ({
  size = 15,
  color = "black",
  strokeWidth = 1,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 15 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="xMidYMid meet"
    {...props}
  >
    <path
      d="M7.16667 13.8333C10.8486 13.8333 13.8333 10.8486 13.8333 7.16667C13.8333 3.48477 10.8486 0.5 7.16667 0.5C3.48477 0.5 0.5 3.48477 0.5 7.16667C0.5 10.8486 3.48477 13.8333 7.16667 13.8333Z"
      stroke={color}
      strokeWidth={strokeWidth}
    />

    <path
      d="M4.5 7.16667C4.5 11.1667 7.16667 13.8333 7.16667 13.8333C7.16667 13.8333 9.83333 11.1667 9.83333 7.16667C9.83333 3.16667 7.16667 0.5 7.16667 0.5C7.16667 0.5 4.5 3.16667 4.5 7.16667Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
    />

    <path
      d="M13.167 9.16602H1.16699M13.167 5.16602H1.16699"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default GlobeIcon;