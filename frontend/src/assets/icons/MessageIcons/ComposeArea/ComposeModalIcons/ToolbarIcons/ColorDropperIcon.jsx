const ColorDropperIcon = ({
  size = 10,
  className = "",
  color = "white",
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 9 9"
      fill="none"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <path
        d="M8.54928 1.27081L7.41968 0.141201C7.23141 -0.0470669 6.92729 -0.0470669 6.73902 0.141201L5.23288 1.64734L4.30119 0.725314L3.62053 1.40597L4.30602 2.09146L0 6.39748V8.69049H2.293L6.59903 4.38447L7.28451 5.06995L7.96517 4.38929L7.03832 3.46244L8.54446 1.9563C8.73755 1.7632 8.73755 1.45907 8.54928 1.27081Z"
        fill={color}
      />
    </svg>
  );
};

export default ColorDropperIcon;