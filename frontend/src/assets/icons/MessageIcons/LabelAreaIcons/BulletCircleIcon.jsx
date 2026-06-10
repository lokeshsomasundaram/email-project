const BulletCircleIcon = ({
  size = 8,
  color = "#000",
  strokeWidth = 2,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 8 8"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="xMidYMid meet"
    {...props}
  >
    <circle
      cx="4"
      cy="4"
      r="3"
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </svg>
);

export default BulletCircleIcon;