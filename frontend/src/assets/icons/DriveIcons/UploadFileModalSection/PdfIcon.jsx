const PdfIcon = ({
  size = 20,
  color = "#EF5350",
  accentColor = "#FF8A80",
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={(size * 28) / 20}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    <path
      d="M6 2H14L20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z"
      fill={color}
    />
    <path d="M14 2V8H20" fill={accentColor} />
    <path
      d="M7 15C10 8 10 8 12 5C13 9 14 12 17 15M6 13C10 15 14 15 18 13"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default PdfIcon;