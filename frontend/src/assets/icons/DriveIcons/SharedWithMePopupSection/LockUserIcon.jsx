const LockUserIcon = ({
  size = 15,
  color = "black",
  strokeWidth = 1,
  className = "",
  ...props
}) => (
  <svg
    width={(size * 12) / 15}
    height={size}
    viewBox="0 0 12 15"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      d="M0.678667 11.7294C0.828667 12.8427 1.75067 13.7154 2.87333 13.7667C3.81733 13.8101 4.77667 13.8327 5.83333 13.8327C6.89 13.8327 7.84933 13.8101 8.79333 13.7661C9.916 13.7154 10.838 12.8427 10.988 11.7294C11.086 11.0027 11.1667 10.2581 11.1667 9.49939C11.1667 8.74072 11.086 7.99605 10.988 7.26939C10.838 6.15605 9.916 5.28339 8.79333 5.23205C7.80732 5.18699 6.82038 5.16498 5.83333 5.16605C4.77667 5.16605 3.81733 5.18872 2.87333 5.23272C1.75067 5.28339 0.828667 6.15605 0.678667 7.26939C0.58 7.99605 0.5 8.74072 0.5 9.49939C0.5 10.2581 0.580667 11.0027 0.678667 11.7294Z"
      stroke={color}
      strokeWidth={strokeWidth}
    />
    <path
      d="M2.83203 5.16667V3.5C2.83203 2.70435 3.1481 1.94129 3.71071 1.37868C4.27332 0.81607 5.03638 0.5 5.83203 0.5C6.62768 0.5 7.39074 0.81607 7.95335 1.37868C8.51596 1.94129 8.83203 2.70435 8.83203 3.5V5.16667"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.83008 9.5H5.83758"
      stroke={color}
      strokeWidth="1.33333"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default LockUserIcon;