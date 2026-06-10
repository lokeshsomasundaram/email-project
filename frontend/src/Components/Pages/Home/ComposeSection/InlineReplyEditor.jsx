import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { EmailEditor } from "./EmailEditor";
import { CloseIcon, ArrowIcon } from "../../../../assets/icons/IconRegistry";

// Static Chip implementation matching Reply_4.png
const StaticEmailChip = ({ name }) => (
  <div className="inline-flex items-center justify-center bg-[#F3F4F6] h-[26px] rounded-[6px] px-[10px] py-[4px] text-[13px] inter-regular text-[#000000]">
    <span>{name}</span>
    <button type="button" className="ml-2 focus:outline-none text-[#767676] text-[11px] hover:text-black">
      ✕
    </button>
  </div>
);

const EmbeddedAttachmentSection = ({ attachments, onRemove, formatFileSize }) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length === 3 ? "." : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="px-3 pb-3 pt-2 flex flex-wrap gap-[12px] bg-white border-t border-[#EAEAEA]">
      {attachments.map((file) => {
        const ext = file.name.split(".").pop().toLowerCase();
        const isImage = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);

        return (
          <div
            key={file.id}
            className="relative flex items-center gap-2 bg-[#F0F1F8] rounded-[6px] px-2 py-2 w-[169px] min-w-[169px] h-[63px] border border-[#040B23]/3"
          >
            <div className="w-[43px] h-[43px] bg-white rounded overflow-hidden flex items-center justify-center shrink-0">
              {isImage ? (
                <img src={file.previewUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[14px]">📄</span>
              )}
            </div>

            <div className="flex flex-col overflow-hidden text-left flex-1">
              <span className="text-[11px] font-semibold truncate text-black">{file.name}</span>
              <span className="text-[10px] text-[#A0A0A0]">
                {file.uploading ? `Uploading${dots}` : formatFileSize(file.size)}
              </span>
            </div>

            <button
              type="button"
              className="text-gray-400 font-bold px-1 hover:text-black cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuPosition({ top: rect.bottom + 5, left: Math.min(rect.right - 130, window.innerWidth - 140) });
                setActiveMenu(activeMenu === file.id ? null : file.id);
              }}
            >
              ⋮
            </button>

            {activeMenu === file.id &&
              createPortal(
                <div
                  className="bg-white shadow-lg rounded-[10px] text-[12px] w-[130px] border border-[#EAEAEA] py-1 fixed z-[9999]"
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                  <button
                    type="button"
                    onClick={() => onRemove(file.id)}
                    className="block w-full text-left px-3 py-2 hover:bg-gray-100 text-red-500 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>,
                document.body
              )}
          </div>
        );
      })}
    </div>
  );
};

export const InlineReplyEditor = ({ mode, onDiscard }) => {
  const [editorValue, setEditorValue] = useState("");
  const [showCC, setShowCC] = useState(mode === "reply_all");
  const [showBCC, setShowBCC] = useState(mode === "reply_all");
  const [attachments, setAttachments] = useState([]);

  const forwardTemplate = `
    <p><strong>Subject</strong></p>
    <br/><br/>
    <hr style="border: none; border-top: 1px solid #D9D9D9; margin: 16px 0;" />
    <div style="font-family: Inter, sans-serif; font-size: 13px; color: #000000; line-height: 28px; text-align: left;">
      <p><strong>From:</strong> <span style="background-color: #F3F4F6; padding: 3px 8px; border-radius: 6px; margin-left: 4px; display: inline-flex; items-center: center;">Aravind Prakash <span style="color: #767676; font-size: 10px; margin-left: 6px;">✕</span></span></p>
      <p><strong>Sent:</strong> Wednesday, May 20, 2026 14:05</p>
      <p><strong>To:</strong> 
        <span style="background-color: #F3F4F6; padding: 3px 8px; border-radius: 6px; margin-left: 4px; display: inline-flex; items-center: center;">Aravind Prakash <span style="color: #767676; font-size: 10px; margin-left: 6px;">✕</span></span>
        <span style="background-color: #F3F4F6; padding: 3px 8px; border-radius: 6px; margin-left: 6px; display: inline-flex; items-center: center;">Sanjeev Wills <span style="color: #767676; font-size: 10px; margin-left: 6px;">✕</span></span>
      </p>
      <p><strong>Subject: Bug list</strong></p>
      <p><strong>Cc:</strong> <span style="background-color: #F3F4F6; padding: 3px 8px; border-radius: 6px; margin-left: 4px; display: inline-flex; items-center: center;">Sanjeev Wills <span style="color: #767676; font-size: 10px; margin-left: 6px;">✕</span></span></p>
      <br/><br/>
      <p><strong>Thanks & Regards,</strong></p>
      <p><strong>xxxxxxx</strong></p>
    </div>
  `;

  useEffect(() => {
    if (mode === "forward") {
      setEditorValue(forwardTemplate);
    } else {
      setEditorValue("");
    }
  }, [mode]);

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i];
  };

  const handleAttachmentClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar";
    input.click();

    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      const newAttachments = files.map((file) => ({
        id: Date.now() + Math.random(),
        file,
        name: file.name,
        size: file.size,
        uploading: true,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      }));
      
      setAttachments((prev) => [...prev, ...newAttachments]);

      newAttachments.forEach((fileObj) => {
        setTimeout(() => {
          setAttachments((prev) =>
            prev.map((att) => (att.id === fileObj.id ? { ...att, uploading: false } : att))
          );
        }, 1500);
      });
    };
  };

  const handleRemoveAttachment = (id) => {
    setAttachments((prev) => {
      const target = prev.find((att) => att.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((att) => att.id !== id);
    });
  };

  const labelStyle = "w-[35px] shrink-0 inter-bold text-[14px] text-black text-left";
  const inputWrapperStyle = "flex-1 border border-[#D9D9D9] rounded-[8px] p-[6px] flex items-center min-h-[42px] bg-white focus-within:border-[#6A37F5]";
  const rightColumnStyle = "w-[60px] shrink-0 flex items-center justify-end gap-2 text-[14px] inter-regular text-black select-none pl-2";
  const showRightColumn = mode !== 'reply_all';

  return (
    <div className="w-full flex flex-col bg-white rounded-[6px] animate-[slideDown_0.15s_ease-out] relative">
      
      {/* --- TOP ACTIONS: SPECIFIC TO FORWARD_4.PNG --- */}
      {mode === "forward" && (
        <div className="flex justify-end items-center gap-[24px] pb-4 pr-1 select-none">
          <button 
            type="button" 
            onClick={onDiscard} 
            className="inter-bold text-[15px] text-[#6A37F5] bg-transparent border-none cursor-pointer hover:underline"
          >
            Cancel
          </button>
          
          <div className="flex items-center bg-[#6A37F5] rounded-full h-[36px] shadow-[0_4px_12px_rgba(106,55,245,0.2)]">
            <button className="text-white inter-regular text-[15px] px-[20px] h-full rounded-l-full hover:bg-[#5a2ed5] transition-colors border-none cursor-pointer">
              Send
            </button>
            <div className="w-[1px] h-[20px] bg-[#FFFFFF40]"></div>
            <div className="flex items-center justify-center px-3 h-full rounded-r-full hover:bg-[#5a2ed5] cursor-pointer transition-colors">
              <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                <ArrowIcon size={6} color="#6A37F5" direction="down" strokeWidth={1} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- INPUT GRID FRAME --- */}
      <div className="flex flex-col gap-3 pb-4">
        
        {/* To Field Row */}
        <div className="flex items-center w-full">
          <span className={labelStyle}>To</span>
          <div className={inputWrapperStyle}>
            <StaticEmailChip name="Aravind Prakash" />
          </div>
          {showRightColumn && (
            <div className={rightColumnStyle}>
              <span onClick={() => setShowCC(!showCC)} className="cursor-pointer hover:underline">Cc</span>
              <span onClick={() => setShowBCC(!showBCC)} className="cursor-pointer hover:underline">Bcc</span>
            </div>
          )}
        </div>

        {/* CC Row */}
        {showCC && (
          <div className="flex items-center w-full">
            <span className={labelStyle}>CC</span>
            <div className={inputWrapperStyle}>
              <StaticEmailChip name="Sanjeev Wills" />
            </div>
            {showRightColumn && <div className="w-[60px] shrink-0"></div>}
          </div>
        )}

        {/* BCC Row */}
        {showBCC && (
          <div className="flex items-center w-full">
            <span className={labelStyle}>BCC</span>
            <div className={inputWrapperStyle}>
              <StaticEmailChip name="Aravind Prakash" />
            </div>
            {showRightColumn && <div className="w-[60px] shrink-0"></div>}
          </div>
        )}

        {/* Mapped below BCC to dynamically shift layouts based on active selection filters */}
        {mode === "forward" && (
          <div className="text-[14px] inter-regular text-black text-left pl-[51px] pt-1">
            Fwd :Bug list
          </div>
        )}
      </div>

      {/* --- WORKSPACE TEXT EDITOR --- */}
      <div className="flex-1 flex flex-col border border-[#C6C6C6] rounded-[8px] min-h-[220px] max-h-[450px] overflow-hidden bg-[#FEFDFD]">
        <EmailEditor
          value={editorValue}
          onChange={setEditorValue}
          handleAttachmentClick={handleAttachmentClick}
          attachments={attachments}
          handleRemoveAttachment={handleRemoveAttachment}
          formatFileSize={formatFileSize}
          expanded={false}
          className="flex-1"
        />
        
        <EmbeddedAttachmentSection 
          attachments={attachments} 
          onRemove={handleRemoveAttachment} 
          formatFileSize={formatFileSize} 
        />
      </div>

      {/* --- ACTION BAR FOOTER --- */}
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="bg-[#F3F4F6] hover:bg-[#E2E4E8] rounded-full px-3.5 py-1 flex items-center justify-center cursor-pointer transition-colors">
          <span className="text-[16px] font-bold text-[#767676] tracking-widest leading-none pb-[6px]">...</span>
        </div>

        {mode !== "forward" && (
          <div className="flex items-center gap-[24px]">
            <button 
              type="button" 
              onClick={onDiscard} 
              className="inter-bold text-[15px] text-[#6A37F5] bg-transparent border-none cursor-pointer hover:underline"
            >
              Cancel
            </button>
            
            <div className="flex items-center bg-[#6A37F5] rounded-full h-[36px] shadow-[0_4px_12px_rgba(106,55,245,0.2)]">
              <button className="text-white inter-regular text-[15px] px-[20px] h-full rounded-l-full hover:bg-[#5a2ed5] transition-colors border-none cursor-pointer">
                Send
              </button>
              <div className="w-[1px] h-[20px] bg-[#FFFFFF40]"></div>
              <div className="flex items-center justify-center px-3 h-full rounded-r-full hover:bg-[#5a2ed5] cursor-pointer transition-colors">
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                  <ArrowIcon size={6} color="#6A37F5" direction="down" strokeWidth={1} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};