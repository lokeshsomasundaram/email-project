const TickMarkIcon = ({
  size = 10,
  color = "black",
  strokeWidth = 0.875,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={(size * 8) / 10}
    viewBox="0 0 10 8"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M0.4375 4.8125L2.47917 6.85417L8.60417 0.4375"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default TickMarkIcon;
