const HasAttachmentsIcon = ({
  size = 20,
  className = "",
  color = "black",
  strokeWidth = 1,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 11 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <path
        d="M10.5 6.5V7.5C10.5 8.82608 9.97322 10.0979 9.03553 11.0355C8.09785 11.9732 6.82608 12.5 5.5 12.5C4.17392 12.5 2.90215 11.9732 1.96447 11.0355C1.02678 10.0979 0.5 8.82608 0.5 7.5V3.83333C0.5 2.94928 0.851189 2.10143 1.47631 1.47631C2.10143 0.851189 2.94928 0.5 3.83333 0.5C4.71739 0.5 5.56523 0.851189 6.19036 1.47631C6.81548 2.10143 7.16667 2.94928 7.16667 3.83333V7.5C7.16667 7.94203 6.99107 8.36595 6.67851 8.67851C6.36595 8.99107 5.94203 9.16667 5.5 9.16667C5.05797 9.16667 4.63405 8.99107 4.32149 8.67851C4.00893 8.36595 3.83333 7.94203 3.83333 7.5V4.83333"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default HasAttachmentsIcon;