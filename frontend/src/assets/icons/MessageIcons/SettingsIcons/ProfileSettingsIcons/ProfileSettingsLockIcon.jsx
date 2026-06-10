const ProfileSettingsLockIcon = ({
  size = 10,
  className = "",
  color = "black",
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 8 10"
      fill="none"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <path
        d="M1.3 4H6.7C7.14 4 7.5 4.36 7.5 4.8V8.3C7.5 8.96 6.96 9.5 6.3 9.5H1.7C1.04 9.5 0.5 8.96 0.5 8.3V4.8C0.5 4.36 0.86 4 1.3 4Z"
        fill={color}
        fillOpacity="0.16"
      />

      <path
        d="M2 4V2.5C2 1.395 2.895 0.5 4 0.5C5.105 0.5 6 1.395 6 2.5V4M4 6.5C4.13261 6.5 4.25979 6.44732 4.35355 6.35355C4.44732 6.25979 4.5 6.13261 4.5 6C4.5 5.86739 4.44732 5.74021 4.35355 5.64645C4.25979 5.55268 4.13261 5.5 4 5.5C3.86739 5.5 3.74021 5.55268 3.64645 5.64645C3.55268 5.74021 3.5 5.86739 3.5 6C3.5 6.13261 3.55268 6.25979 3.64645 6.35355C3.74021 6.44732 3.86739 6.5 4 6.5ZM4 6.5V8M1.3 4H6.7C7.14 4 7.5 4.36 7.5 4.8V8.3C7.5 8.96 6.96 9.5 6.3 9.5H1.7C1.04 9.5 0.5 8.96 0.5 8.3V4.8C0.5 4.36 0.86 4 1.3 4Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ProfileSettingsLockIcon;