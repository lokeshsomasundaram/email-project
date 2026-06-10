const ProfileSettingsEditicon = ({
  size = 10,
  className = "",
  color = "black",
  strokeWidth = 1,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      fill="none"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <path
        d="M2 2.5H1.5C1.23478 2.5 0.98043 2.60536 0.792893 2.79289C0.605357 2.98043 0.5 3.23478 0.5 3.5V8C0.5 8.26522 0.605357 8.51957 0.792893 8.70711C0.98043 8.89464 1.23478 9 1.5 9H6C6.26522 9 6.51957 8.89464 6.70711 8.70711C6.89464 8.51957 7 8.26522 7 8V7.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M6.5 1.50005L8 3.00005M8.6925 2.29255C8.88942 2.09563 9.00005 1.82855 9.00005 1.55005C9.00005 1.27156 8.88942 1.00448 8.6925 0.807554C8.49558 0.61063 8.22849 0.5 7.95 0.5C7.67151 0.5 7.40442 0.61063 7.2075 0.807554L3 5.00005V6.50005H4.5L8.6925 2.29255Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ProfileSettingsEditicon;