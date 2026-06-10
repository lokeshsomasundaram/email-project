const TickMarkCheckBoxIcon = ({
  checked = false,
  size = 17,
  color = "black",
  checkColor = "white",
  strokeWidth = 1.25,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 17 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {checked ? (
      <>
        <circle
          cx="8.5"
          cy="8.5"
          r="7.5"
          fill={color}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        <path
          d="M5.5 8.5L7.5 10.5L11.5 6.5"
          stroke={checkColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <circle
        cx="8.125"
        cy="8.125"
        r="7.5"
        stroke={color}
        strokeWidth={strokeWidth}
      />
    )}
  </svg>
);

export default TickMarkCheckBoxIcon;