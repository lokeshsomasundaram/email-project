const VideoIcon = ({
  size = 20,
  color = "#F4511E",
  strokeWidth = 2,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={(size * 24) / 20}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    {...props}
  >
    {/* existing lines/rect with color and strokeWidth props */}
  </svg>
);

export default VideoIcon;