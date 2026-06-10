const AllMailIcon = ({
  size = 20,
  className = "",
  color = "black",
  strokeWidth = 1,
  ...props
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 15 15"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <path
        d="M2.49866 3.83301L1.68666 4.37501C1.10399 4.76301 0.81266 4.95701 0.65466 5.25301C0.49666 5.54967 0.497993 5.89767 0.50066 6.59301C0.503327 7.43167 0.511327 8.28501 0.53266 9.14901C0.583993 11.199 0.609327 12.2237 1.36333 12.977C2.11666 13.7303 3.15533 13.757 5.23266 13.809C6.52113 13.8412 7.81019 13.8412 9.09866 13.809C11.176 13.757 12.2147 13.731 12.968 12.977C13.7213 12.2237 13.7473 11.199 13.7987 9.14901C13.82 8.28501 13.828 7.43167 13.8307 6.59367C13.8327 5.89767 13.834 5.54967 13.676 5.25367C13.5187 4.95701 13.2273 4.76301 12.6447 4.37501L11.832 3.83301"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />

      <path
        d="M0.499054 5.83301L5.10772 8.59834C6.11039 9.19967 6.61172 9.49967 7.16572 9.49967C7.71972 9.49967 8.22105 9.19967 9.22372 8.59767L13.8324 5.83301"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />

      <path
        d="M2.49905 7.16667V3.16667C2.49905 1.90933 2.49905 1.28133 2.88972 0.890667C3.28039 0.5 3.90839 0.5 5.16572 0.5H9.16572C10.4231 0.5 11.0511 0.5 11.4417 0.890667C11.8324 1.28133 11.8324 1.90933 11.8324 3.16667V7.16667"
        stroke={color}
        strokeWidth={strokeWidth}
      />

      <path
        d="M5.83206 5.83268H8.49873M5.83206 3.16602H8.49873"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default AllMailIcon;