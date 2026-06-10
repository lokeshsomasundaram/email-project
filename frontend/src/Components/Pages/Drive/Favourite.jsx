import React, { useState, useEffect } from "react";
import {
  DriveFileIcon,
  DriveUploadDropdownIcon,
  SearchIcon,
  StarIcon,
  VerticalThreeDotsIcon,
  MenuCopyIcon,
  MenuUserIcon,
  MenuEditIcon,
  MenuRemoveIcon,
} from "../../../assets/icons/IconRegistry";
import { UploadFileModal } from "./Modals/UploadFileModal"; 
import { ActionMenu } from "./Modals/ActionMenu"; 
import { getFavoriteFiles, toggleFavorite, moveToTrash, api } from "../../../api/api";
import LinkCreatedModal from "./Modals/LinkCreatedModal";
import { Rename } from "./Modals/Rename"; // Added Rename modal import
import { ManageAccessPopup } from "./Modals/ManageAccessPopup"; // <-- Added ManageAccessPopup import
import { copyFileLink } from "../../../api/api";

// Date formatter
const formatDate = (dateString) => {
  if (!dateString) return "N/A"; 
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const Favourite = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [files, setFiles] = useState([]);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");

  // Modal States
  const [manageAccessOpen, setManageAccessOpen] = useState(false); // <-- Added Manage Access Modal State
  const [selectedFile, setSelectedFile] = useState(null);          // <-- Added Selected File State
  
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState(null);

  const fetchFiles = async () => {
    try {
      const response = await getFavoriteFiles();
      setFiles(response.data);
    } catch (error) {
      // Handled silently per request
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleCloseModal = () => {
    setShowUploadModal(false);
    fetchFiles(); 
  };

  // --- Preview File in New Tab ---
  const handlePreview = async (file) => {
    try {
      const response = await api.get(file.url, { responseType: 'blob' });
      
      const contentType = response.headers['content-type'] || response.data.type || 'application/pdf';
      const fileBlob = new Blob([response.data], { type: contentType });
      const fileURL = window.URL.createObjectURL(fileBlob);
      
      window.open(fileURL, "_blank");
      
      setTimeout(() => window.URL.revokeObjectURL(fileURL), 10000);
    } catch (error) {
      alert("Unable to open this file.");
    }
  };

  const handleToggleFavorite = async (file) => {
    try {
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      await toggleFavorite(file.id);
    } catch (error) {
      fetchFiles(); 
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      await moveToTrash(fileId);
    } catch (error) {
      fetchFiles(); 
    }
  };

  // const handleCopyLink = (file) => {
  //   const fullUrl = window.location.origin + file.url;
  //   setGeneratedLink(fullUrl);
  //   setLinkModalOpen(true);
  // };

  const handleCopyLink = async (file) => {
    try {
      const res = await copyFileLink(file.id);

      console.log("API RESPONSE:", res.data); // debug

      const link = res.data?.share_link; // ✅ FIXED

      setGeneratedLink(link);
      setLinkModalOpen(true);

      navigator.clipboard.writeText(link);
    } catch (err) {
      console.error("Copy link failed", err);
    }
  };

   // Upgraded search to filter by file name, modified by, and owned by
  const filteredFiles = files.filter(file => {
    const lowerQuery = searchQuery.toLowerCase();
    const fileName = (file.title || file.original_name || "").toLowerCase();
    const modifiedBy = (file.modified_by || "").toLowerCase();
    const ownedBy = (file.owned_by || "").toLowerCase();
    
    return fileName.includes(lowerQuery) || modifiedBy.includes(lowerQuery) || ownedBy.includes(lowerQuery);
  });

  const getDropdownOptions = (file) => [
    {
      label: (<div className="flex items-center gap-[12px]"><MenuCopyIcon /><span>Copy link</span></div>),
      onClick: () => handleCopyLink(file),
    },
    {
      label: (<div className="flex items-center gap-[12px]"><MenuUserIcon /><span>Manage access</span></div>),
      onClick: () => {
        setSelectedFile(file); // <-- Updated to open Manage Access Popup
        setManageAccessOpen(true);
      },
    },
    {
      label: (<div className="flex items-center gap-[12px]"><StarIcon isActive /><span>Remove from favourites</span></div>),
      onClick: () => handleToggleFavorite(file),
    },
    {
      label: (<div className="flex items-center gap-[12px]"><MenuEditIcon /><span>Rename</span></div>),
      onClick: () => {
        setFileToRename(file);
        setRenameModalOpen(true);
      },
    },
    {
      label: (<div className="flex items-center gap-[12px]"><MenuRemoveIcon /><span>Remove file</span></div>),
      onClick: () => handleDeleteFile(file.id),
    }
  ];

  return (
    <>
      <div
        className="flex-1 flex flex-col gap-[20px] p-5 w-full"
        style={{ marginLeft: "10px" }}
      >
        {/* Header Area */}
        <div className="flex flex-row items-center justify-between w-full">
          <span className="inter-bold text-[20px] text-[#040B23]">
            Your favourites
          </span>

          {/* Search Bar */}
          <div className="flex flex-row items-center w-[250px] h-[36px] rounded-[18px] border-[1px] border-[#EAEAEA] bg-white px-[14px] gap-[8px]">
            <SearchIcon color="#9A9A9B" />
            <input
              type="text"
              placeholder="Search by file name or person"
              className="flex-1 outline-none border-none inter-regular text-[11px] bg-transparent text-[#222]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table Area */}
        <div className="flex flex-col w-full h-[550px] rounded-[8px] border-[1px] border-[#EAEAEA] bg-white mt-[10px]">
          {/* Table Header */}
          <div className="w-full h-[46px] bg-[#F9F9F9] rounded-tl-[8px] rounded-tr-[8px] flex items-center px-6 border-b border-[#EAEAEA]">
            <div className="flex-[3] inter-bold text-[11px] text-[#040B23]">
              Title
            </div>
            <div className="flex-[2] inter-bold text-[11px] text-[#040B23]">
              Favourited on
            </div>
            <div className="flex-[2] inter-bold text-[11px] text-[#040B23]">
              Modified by
            </div>
            <div className="flex-[2] inter-bold text-[11px] text-[#040B23]">
              Owned by
            </div>
            <div className="flex-[2] inter-bold text-[11px] text-[#040B23]">
              Activity
            </div>
            <div className="flex-[1] inter-bold text-[11px] text-[#040B23] pl-2">
              Action
            </div>
          </div>

          {/* Table Body */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {filteredFiles.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <span className="inter-medium text-[13px] text-[#9A9A9B]">
                  No favourite files found.
                </span>
              </div>
            ) : (
              filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center px-6 border-b border-[#EAEAEA] h-[70px] hover:bg-[#FDFDFD] cursor-pointer"
                  onClick={() => handlePreview(file)}
                >
                  {/* Title (Dynamic) */}
                  <div className="flex-[3] flex flex-row items-center gap-[12px]">
                    <div className="flex items-center justify-center w-[34px] h-[34px] rounded-[7px] bg-[#EEE8FF]">
                      <DriveFileIcon />
                    </div>
                    <div className="flex flex-col gap-[2px] justify-center">
                      <span className="inter-medium text-[13px] text-[#222]">
                        {file.title || file.original_name}
                      </span>
                      <span className="inter-regular text-[11px] text-[#939393]">
                        {file.size ? file.size : "Size N/A"}
                      </span>
                    </div>
                  </div>

                  {/* Favourited On (Dynamic) */}
                  <div className="flex-[2] inter-regular text-[13px] text-[#444]">
                    {file.favorited_on ? formatDate(file.favorited_on) : "N/A"}
                  </div>

                  {/* Modified By (Dynamic) */}
                  <div className="flex-[2] inter-regular text-[13px] text-[#444]">
                    {file.modified_by || "You"}
                  </div>

                  {/* Owned By (Dynamic) */}
                  <div className="flex-[2] inter-regular text-[13px] text-[#444]">
                    {file.owned_by || "You"}
                  </div>

                  {/* Activity (Dynamic) */}
                  <div className="flex-[2] flex flex-col justify-center">
                    <span className="inter-regular text-[12px] tracking-[0.05em] text-[#333]">
                      {file.activity || "Only you"}
                    </span>
                  </div>

                  {/* Action Columns */}
                  <div className="flex-[1] flex flex-row items-center pl-2 relative">
                    <button
                      className={`cursor-pointer hover:opacity-70 flex items-center justify-center w-[24px] h-[24px] rounded-[4px] ${activeMenuId === file.id ? "bg-[#EEE8FF]" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(
                          activeMenuId === file.id ? null : file.id,
                        );
                      }}
                    >
                      <VerticalThreeDotsIcon className="cursor-pointer text-[#555] transition-transform hover:scale-110" />
                    </button>

                    <ActionMenu
                      isOpen={activeMenuId === file.id}
                      onClose={() => setActiveMenuId(null)}
                      options={getDropdownOptions(file)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <button
        className="absolute flex flex-row items-center gap-[10px] justify-center cursor-pointer"
        style={{
          width: "132px",
          height: "36px",
          top: "777px",
          left: "700px",
          borderRadius: "18px",
          background: "#040B23",
          boxShadow: "0px 4px 4px 0px #49494959",
          opacity: 1,
          zIndex: 50,
        }}
        onClick={() => setShowUploadModal(true)}
      >
        <span
          className="text-white inter-regular text-[11px] cursor-pointer"
          style={{ borderRadius: "18px", background: "transparent" }}
        >
          Upload file
        </span>
        <div className="flex items-center justify-center w-[30px] h-[30px] rounded-[50%] mr-[-30px] bg-[#FFFFFF1F]">
          <DriveUploadDropdownIcon />
        </div>
      </button>

      <UploadFileModal open={showUploadModal} onClose={handleCloseModal} />

      <LinkCreatedModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        linkUrl={generatedLink}
      />

      {/* --- ADDED MANAGE ACCESS POPUP --- */}
      <ManageAccessPopup
        isOpen={manageAccessOpen}
        onClose={() => setManageAccessOpen(false)}
        file={selectedFile}
      />

      <Rename
        isOpen={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        file={fileToRename}
        onUpdate={(id, newName) => {
          fetchFiles(); // Refresh list to show the new name
        }}
      />
    </>
  );
};

export default Favourite;