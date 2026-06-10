const AddPeopleIcon = ({
  size = 28,
  color = "#A881E6",
  plusColor = "#00C853",
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    className={className}
    preserveAspectRatio="xMidYMid meet"
    {...props}
  >
    <path
      d="M12 14c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 3c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z"
      fill={color}
    />

    <path
      d="M22 14c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-.52 0-1.06.07-1.58.19C21.84 17.38 23 18.99 23 21v1h7v-1c0-2.66-5.33-4-8-4z"
      fill={color}
    />

    <circle
      cx="24"
      cy="22"
      r="6"
      fill={plusColor}
    />

    <path
      d="M23 19v2h-2v2h2v2h2v-2h2v-2h-2v-2h-2z"
      fill="white"
    />
  </svg>
);

export default AddPeopleIcon;