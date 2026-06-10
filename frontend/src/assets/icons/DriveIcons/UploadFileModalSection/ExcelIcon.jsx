const ExcelIcon = ({
  size = 20,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={(size * 24) / 20}
    viewBox="0 0 16 16"
    fill="none"
    className={className}
    {...props}
  >
    {/* existing paths unchanged */}
  </svg>
);

export default ExcelIcon;