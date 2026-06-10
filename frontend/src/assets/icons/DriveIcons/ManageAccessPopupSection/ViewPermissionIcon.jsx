const ViewPermissionIcon = ({
  size = 22,
  color = "#0078D3",
  strokeWidth = 1.5,
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={(size * 20) / 22}
    viewBox="0 0 22 20"
    fill="none"
    className={className}
    preserveAspectRatio="xMidYMid meet"
    {...props}
  >
    <path
      d="M0.75 5.75C0.75 5.75 5.227 0.75 10.75 0.75C16.273 0.75 20.75 5.75 20.75 5.75"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />

    <path
      d="M20.294 10.795C20.598 11.221 20.75 11.435 20.75 11.75C20.75 12.066 20.598 12.279 20.294 12.705C18.928 14.621 15.439 18.75 10.75 18.75C6.06 18.75 2.572 14.62 1.206 12.705C0.902 12.279 0.75 12.065 0.75 11.75C0.75 11.434 0.902 11.221 1.206 10.795C2.572 8.879 6.061 4.75 10.75 4.75C15.44 4.75 18.928 8.88 20.294 10.795Z"
      stroke={color}
      strokeWidth={strokeWidth}
    />

    <path
      d="M13.75 11.75C13.75 10.9544 13.4339 10.1913 12.8713 9.62868C12.3087 9.06607 11.5456 8.75 10.75 8.75C9.95435 8.75 9.19129 9.06607 8.62868 9.62868C8.06607 10.1913 7.75 10.9544 7.75 11.75C7.75 12.5456 8.06607 13.3087 8.62868 13.8713C9.19129 14.4339 9.95435 14.75 10.75 14.75C11.5456 14.75 12.3087 14.4339 12.8713 13.8713C13.4339 13.3087 13.75 12.5456 13.75 11.75Z"
      stroke={color}
      strokeWidth={strokeWidth}
    />
  </svg>
);

export default ViewPermissionIcon;