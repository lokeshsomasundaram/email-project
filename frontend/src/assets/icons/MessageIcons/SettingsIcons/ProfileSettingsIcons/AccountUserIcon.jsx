const AccountUserIcon = ({
  size = 13,
  className = "",
  color = "#70707C",
  activeColor = "white",
  isActive = false,
  strokeWidth = 1,
  ...props
}) => {
  const strokeColor = isActive ? activeColor : color;

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
        d="M7.83333 3.16667C7.83333 3.87391 7.55238 4.55219 7.05229 5.05229C6.55219 5.55238 5.87391 5.83333 5.16667 5.83333C4.45942 5.83333 3.78115 5.55238 3.28105 5.05229C2.78095 4.55219 2.5 3.87391 2.5 3.16667C2.5 2.45942 2.78095 1.78115 3.28105 1.28105C3.78115 0.780951 4.45942 0.5 5.16667 0.5C5.87391 0.5 6.55219 0.780951 7.05229 1.28105C7.55238 1.78115 7.83333 2.45942 7.83333 3.16667Z"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      <path
        d="M6.5 7.83301H3.83333C2.94928 7.83301 2.10143 8.1842 1.47631 8.80932C0.851189 9.43444 0.5 10.2823 0.5 11.1663C0.5 11.52 0.640476 11.8591 0.890524 12.1092C1.14057 12.3592 1.47971 12.4997 1.83333 12.4997H8.5C8.85362 12.4997 9.19276 12.3592 9.44281 12.1092C9.69286 11.8591 9.83333 11.52 9.83333 11.1663C9.83333 10.2823 9.48214 9.43444 8.85702 8.80932C8.2319 8.1842 7.38406 7.83301 6.5 7.83301Z"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default AccountUserIcon;