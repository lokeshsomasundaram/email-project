const CopyIcon = ({
  size = 13,
  color = "black",
  strokeWidth = 0.875,
  className = "",
  onClick,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 13 13"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    onClick={onClick}
    preserveAspectRatio="xMidYMid meet"
    {...props}
  >
    <path
      d="M4.52148 8.02148C4.52148 6.37182 4.52148 5.5464 5.03423 5.03423C5.5464 4.52148 6.37182 4.52148 8.02148 4.52148H8.60482C10.2545 4.52148 11.0799 4.52148 11.5921 5.03423C12.1048 5.5464 12.1048 6.37182 12.1048 8.02148V8.60482C12.1048 10.2545 12.1048 11.0799 11.5921 11.5921C11.0799 12.1048 10.2545 12.1048 8.60482 12.1048H8.02148C6.37182 12.1048 5.5464 12.1048 5.03423 11.5921C4.52148 11.0799 4.52148 10.2545 4.52148 8.60482V8.02148Z"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.1875 4.52083C9.18575 2.79592 9.16008 1.90225 8.65783 1.29033C8.56094 1.1723 8.4527 1.06405 8.33467 0.967167C7.68833 0.4375 6.7305 0.4375 4.8125 0.4375C2.89508 0.4375 1.93608 0.4375 1.29033 0.967167C1.1723 1.06405 1.06405 1.1723 0.967167 1.29033C0.4375 1.93667 0.4375 2.8945 0.4375 4.8125C0.4375 6.72992 0.4375 7.68892 0.967167 8.33467C1.06405 8.4527 1.1723 8.56094 1.29033 8.65783C1.90283 9.1595 2.79533 9.18633 4.52083 9.1875"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default CopyIcon;