const MenuRemoveIcon = ({
  size = 16,
  className = "",
  color = "currentColor",
  strokeWidth = 2,
  sharp = false,
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
    <line
      x1="18"
      y1="6"
      x2="6"
      y2="18"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap={sharp ? "square" : "round"}
    />
    <line
      x1="6"
      y1="6"
      x2="18"
      y2="18"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap={sharp ? "square" : "round"}
    />
  </svg>
);
export default MenuRemoveIcon;
