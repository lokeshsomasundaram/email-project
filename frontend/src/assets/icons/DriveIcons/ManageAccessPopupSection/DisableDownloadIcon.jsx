const DisableDownloadIcon = ({
  size = 21,
  color = "#0078D3",
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 21 21"
    fill="none"
    className={className}
    preserveAspectRatio="xMidYMid meet"
    {...props}
  >
    <path
      d="M21 19.73L1.28 0L0 1.27L6 7.27H3.89L10.89 14.27L11.95 13.22L15 16.27H3.89V18.27H17L19.73 21L21 19.73ZM9.89 3.27H11.89V8.07L14.49 10.67L17.89 7.27H13.89V1.27H7.89V4.07L9.89 6.07V3.27Z"
      fill={color}
    />
  </svg>
);

export default DisableDownloadIcon;