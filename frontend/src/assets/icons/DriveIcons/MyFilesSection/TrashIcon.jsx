// const TrashIcon = ({
//   size = 16,
//   className = "",
//   color = "#555",
//   strokeWidth = 1.5,
//   ...props
// }) => (
//   <svg
//     width={size}
//     height={size}
//     viewBox="0 0 24 24"
//     fill="none"
//     className={className}
//     preserveAspectRatio="xMidYMid meet"
//     {...props}
//   >
//     <polyline
//       points="3 6 5 6 21 6"
//       stroke={color}
//       strokeWidth={strokeWidth}
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     />
//     <path
//       d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
//       stroke={color}
//       strokeWidth={strokeWidth}
//       strokeLinecap="round"
//       strokeLinejoin="round"
//     />
//   </svg>
// );

// export default TrashIcon;

const TrashIcon = ({
  size = 16,
  className = "",
  color = "#555",
  strokeWidth = 1.5,
  isDeleted = false,
  ...props
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    preserveAspectRatio="xMidYMid meet"
    {...props}
  >
    <polyline
      points="3 6 5 6 21 6"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <path
      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {isDeleted && (
      <line
        x1="4"
        y1="4"
        x2="20"
        y2="20"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    )}
  </svg>
);

export default TrashIcon;
