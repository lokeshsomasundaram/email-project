// import {
//   AvailableNowIcon,
//   AppearAwayIcon,
//   OfflineStatusIcon,
//   OutOfOfficeIcon,
// } from "../../../../icons/IconRegistry";

// const StatusIcon = ({ status, size = 8, iconSize = 4 }) => {
//   const containerStyle = {
//     width: `${size}px`,
//     height: `${size}px`,
//   };
//   switch (status) {
//     case "available":
//       return (
//         <div
//           className="rounded-full flex items-center justify-center leading-none"
//           style={containerStyle}
//         >
//           <AvailableNowIcon width={size} height={size} />
//         </div>
//       );

//     case "busy":
//       return (
//         <div className="inline-grid *:[grid-area:1/1]">
//           <div
//             className="rounded-full bg-[#FC3737] leading-none "
//             style={containerStyle}
//           />
//         </div>
//       );

//     case "dnd":
//       return (
//         <div
//           className="rounded-full bg-[#FC3737] flex items-center justify-center leading-none"
//           style={containerStyle}
//         >
//           <div
//             className="bg-white rounded-full"
//             style={{
//               width: `${iconSize}px`,
//               height: `1.5px`,
//             }}
//           />
//         </div>
//       );

//     case "away":
//       return (
//         <div
//           className="rounded-full bg-[#F89F00] flex items-center justify-center leading-none"
//           style={containerStyle}
//         >
//           {/* <svg
//             xmlns="http://www.w3.org/2000/svg"
//             width={iconSize}
//             height={iconSize}
//             viewBox="0 0 24 24"
//           >
//             <path
//               fill="#F89F00"
//               d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10s10-4.49 10-10S17.51 2 12 2"
//             />

//             <path fill="#FFFFFF" d="M18 13h-6c-.55 0-1-.45-1-1V6h2v5h5z" />
//           </svg> */}
//           <AppearAwayIcon width={size} height={size} />
//         </div>
//       );

//     case "offline":
//       return (
//         <div
//           className="rounded-full bg-white border border-gray-400 flex items-center justify-center leading-none"
//           style={containerStyle}
//         >
//           {/* <svg
//             width={iconSize}
//             height={iconSize}
//             viewBox="0 0 16 16"
//             fill="none"
//           >
//             <path
//               d="M4 4L12 12"
//               stroke="#6B7280"
//               strokeWidth="2"
//               strokeLinecap="round"
//             />
//             <path
//               d="M12 4L4 12"
//               stroke="#6B7280"
//               strokeWidth="2"
//               strokeLinecap="round"
//             />
//           </svg> */}
//           <OfflineStatusIcon width={size} height={size} />
//         </div>
//       );
//     case "out_of_office":
//       return (
//         <div
//           className="flex items-center justify-center leading-none"
//           style={containerStyle}
//         >
//           <OutOfOfficeIcon width={size} height={size} />
//         </div>
//       );

//     default:
//       return null;
//   }
// };

// export default StatusIcon;

import {
  AvailableNowIcon,
  AppearAwayIcon,
  OfflineStatusIcon,
  OutOfOfficeIcon,
} from "../../../../icons/IconRegistry";

const StatusIcon = ({
  status,
  size = 8,
  iconSize = size,
  variant = "default",
}) => {
  const actualSize =
    status === "offline" || status === "out_of_office" ? 10 : size;
  switch (status) {
    case "available":
      return <AvailableNowIcon width={size} height={size} />;

    case "busy":
      return (
        <div
          className="rounded-full bg-[#FC3737]"
          style={{
            width: `${size}px`,
            height: `${size}px`,
          }}
        />
      );

    case "dnd":
      return (
        <div
          className="rounded-full bg-[#FC3737] flex items-center justify-center"
          style={{
            width: `${size}px`,
            height: `${size}px`,
          }}
        >
          <div
            className="bg-white rounded-full"
            style={{
              width: `${size / 2}px`,
              height: `1.5px`,
            }}
          />
        </div>
      );

    case "away":
      return <AppearAwayIcon width={size} height={size} />;

    case "offline":
      return <OfflineStatusIcon size={size} />;

    // case "out_of_office":
    //   return <OutOfOfficeIcon width={size} height={size} />;

    case "out_of_office":
      // profile dropdown/navbar
      if (variant === "plain") {
        return <OutOfOfficeIcon width={size} height={size} />;
      }

      // everywhere else
      return (
        <div
          className="rounded-full bg-white border border-[#FC3737] flex items-center justify-center"
          style={{
            width: `${actualSize}px`,
            height: `${actualSize}px`,
          }}
        >
          <OutOfOfficeIcon size={actualSize - 4} />
        </div>
      );

    default:
      return null;
  }
};

export default StatusIcon;
