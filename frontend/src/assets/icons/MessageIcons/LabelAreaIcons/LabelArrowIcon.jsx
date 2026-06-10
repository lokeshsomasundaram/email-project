const LabelArrowIcon = ({
  size = 13,
  color = "#FFFFFF",
  className = "",
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 13 13"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="xMidYMid meet"
    {...props}
  >
    <path
      d="M7.85352 11.6452L10.8327 8.66602L7.85352 5.68685L7.08977 6.4506L8.7581 8.12435H5.68685C4.33268 8.12435 3.24935 7.04102 3.24935 5.68685V2.16602H2.16602V5.68685C2.16602 6.62063 2.53696 7.51617 3.19724 8.17645C3.85753 8.83674 4.75307 9.20768 5.68685 9.20768H8.7581L7.08435 10.8814L7.85352 11.6452Z"
      fill={color}
    />
  </svg>
);

export default LabelArrowIcon;