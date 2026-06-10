import React, { useState, useEffect } from 'react';
import ProfileSettings from './ProfileSettings/ProfileSettings';
import SettingsGeneral from './SettingsGeneral';
import SettingsPeople from './SettingsPeople';
import SettingsCalendar from './SettingsCalendar';
import { fetchAccountSettings, getAccountSettings, updateAccountSettings } from '../../../api/api';
import { CloseIcon, SearchIcon, ProfileSettingsIcon, AccountUserIcon, PeopleIcon, ProfileSettingsCalendarSidebarIcon, ProfileSidebarIcon } from '../../../assets/icons/IconRegistry';
import { getUserProfile } from '../../../api/api';

// Removed the static height from here so we can apply it dynamically in the component
const popupStyle = {
  position: 'absolute',
  width: '715px',
  top: '167px',
  left: '415px',
  background: '#FFFFFF',
  opacity: 1,
  borderWidth: '0px 0px 0px 0px',
  borderStyle: 'solid',
  borderColor: '#EAEAEA',
  boxSizing: 'border-box',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
};

function Settings({ centered = false, onClose, defaultTab = 'Profile' }) {
  const [twoFactor, setTwoFactor] = useState(false);
  const [emailNotif, setEmailNotif] = useState(false);
  const [search, setSearch] = useState('');
  const [activeSidebar, setActiveSidebar] = useState(defaultTab);
  
  useEffect(() => {
    setActiveSidebar(defaultTab);
  }, [defaultTab]);
  
  const [user, setUser] = useState(null);

  useEffect(() => {
    getUserProfile()
      .then(data => setUser(data))
      .catch(err => console.error(err));
      
    const sessionLoaded = sessionStorage.getItem('settings_loaded');
    if (!sessionLoaded) {
      getAccountSettings()
        .then(res => {
          const data = res.data; 
          const emailVal = data.email_notifications_account ?? true;
          const twoFaVal = data.two_fa ?? false;
          setTwoFactor(twoFaVal);
          setEmailNotif(emailVal);
          sessionStorage.setItem('email_notifications', JSON.stringify(emailVal));
          window.dispatchEvent(new Event('storage'));
          sessionStorage.setItem('settings_loaded', 'true');
        })
        .catch(err => console.error(err));
    } else {
      const emailVal = JSON.parse(sessionStorage.getItem('email_notifications') ?? 'true');
      setEmailNotif(emailVal);
    }
  }, []);

  // Set height conditionally based on the active tab
  const currentHeight = activeSidebar === "Profile" ? "650px" : "499px";

  const resolvedPopupStyle = centered
    ? { ...popupStyle, position: 'relative', top: 'auto', left: 'auto', height: currentHeight }
    : { ...popupStyle, height: currentHeight };

  return (
    // Added transition classes for a smooth height change
    <div style={resolvedPopupStyle} className="transition-[height] duration-300 ease-in-out">
      <div className="relative w-full h-[60px] shrink-0 border-b-[1px] border-[#EAEAEA]">
        <div
          className="absolute top-0 left-0 right-0 h-[100px] pointer-events-none"
          style={{
            background: ` linear-gradient( to bottom, rgba(185,160,255,0.54) 0%, rgba(78,115,255,0.26) 40%, rgba(255,255,255,0) 100% )`,
          }}
        />
        <h1 className="inter-bold text-[18px] text-[#03081B] px-[25px] pt-[25px]">
          Settings
        </h1>
        <button
          onClick={onClose}
          className="absolute top-[18px] right-[18px] w-[32px] h-[32px] flex items-center justify-center cursor-pointer"
        >
          <CloseIcon size={24} />
        </button>
      </div>
      <div className="flex-grow flex flex-row overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[240px] shrink-0 h-full flex flex-col border-r-[1px] border-[#EAEAEA] gap-[20px] pl-[30px] py-[25px] pt-[70px] overflow-y-auto">
          <div className="flex flex-col w-[88px] h-full gap-[10px]">
            {/* Account */}
            <div
              className={`flex flex-row items-center gap-[12px] cursor-pointer ${activeSidebar === "Account" ? "bg-[#6A37F5] rounded-[9px] w-[190px] h-[44px] px-[15px] py-[10px]" : "w-[190px] h-[44px] px-[15px] py-[10px]"} `}
              onClick={() => setActiveSidebar("Account")}
            >
              <AccountUserIcon isActive={activeSidebar === "Account"} />
              <span className={`inter-regular text-[14px] ${activeSidebar === "Account" ? "text-white" : "text-[#70707C]"}`}>
                Account
              </span>
            </div>
            {/* General */}
            <div
              className={`flex flex-row items-center gap-[12px] cursor-pointer ${activeSidebar === "General" ? "bg-[#6A37F5] rounded-[9px] w-[190px] h-[44px] px-[15px] py-[10px]" : "w-[190px] h-[44px] px-[15px] py-[10px]"} `}
              onClick={() => setActiveSidebar("General")}
            >
              <ProfileSettingsIcon isActive={activeSidebar === "General"} />
              <span className={`inter-regular text-[14px] ${activeSidebar === "General" ? "text-white" : "text-[#70707C]"}`}>
                General
              </span>
            </div>
            {/* People */}
            <div
              className={`flex flex-row items-center gap-[12px] cursor-pointer ${activeSidebar === "People" ? "bg-[#6A37F5] rounded-[9px] w-[190px] h-[44px] px-[15px] py-[10px]" : "w-[190px] h-[44px] px-[15px] py-[10px]"} `}
              onClick={() => setActiveSidebar("People")}
            >
              <PeopleIcon isActive={activeSidebar === "People"} />
              <span className={`inter-regular text-[14px] ${activeSidebar === "People" ? "text-white" : "text-[#70707C]"}`}>
                People
              </span>
            </div>
            {/* Calendar */}
            <div
              className={`flex flex-row items-center gap-[12px] cursor-pointer ${activeSidebar === "Calendar" ? "bg-[#6A37F5] rounded-[9px] w-[190px] h-[44px] px-[15px] py-[10px]" : "w-[190px] h-[44px] px-[15px] py-[10px]"} `}
              onClick={() => setActiveSidebar("Calendar")}
            >
              <ProfileSettingsCalendarSidebarIcon isActive={activeSidebar === "Calendar"} />
              <span className={`inter-regular text-[14px] ${activeSidebar === "Calendar" ? "text-white" : "text-[#70707C]"}`}>
                Calendar
              </span>
            </div>
            {/* Profile Settings */}
            <div
              className={`flex flex-row items-center gap-[12px] cursor-pointer ${activeSidebar === "Profile" ? "bg-[#6A37F5] rounded-[9px] w-[190px] h-[44px] px-[15px] py-[10px]" : "w-[190px] h-[44px] px-[15px] py-[10px]"} `}
              onClick={() => setActiveSidebar("Profile")}
            >
              <ProfileSidebarIcon isActive={activeSidebar === "Profile"}/>
              <span className={`inter-regular text-[14px] ${activeSidebar === "Profile" ? "text-white" : "text-[#70707C]"}`}>
                Profile Settings
              </span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-grow h-full overflow-y-auto">
          {activeSidebar === "Account" && (
            <div className="flex flex-col h-full gap-[42px] px-[20px] py-[10px]">
              <h1 className="inter-bold text-[18px] text-[black]">
                Account Settings
              </h1>
              <div className="flex flex-col w-full gap-[20px]">
                <div className="w-full flex flex-col h-[60px] border-b-[1px] border-[#EAEAEA] gap-[5px]">
                  <h2 className="inter-medium text-[12px] text-[black]">
                    Email Address
                  </h2>
                  <span className="inter-regular text-[12px] text-[#70707C]">
                    {user ? user.email : "Loading..."}
                  </span>
                </div>
                <div className="w-full flex flex-col h-[60px] border-b-[1px] border-[#EAEAEA] gap-[5px]">
                  <h2 className="inter-medium text-[12px] text-[black]">
                    User Name
                  </h2>
                  <span className="inter-regular text-[12px] text-[#70707C]">
                    {user ? user.username : "Loading..."}
                  </span>
                </div>
                <div className="w-full flex flex-row items-center justify-between h-[60px] border-b-[1px] border-[#EAEAEA] gap-[5px]">
                  <div className="flex flex-col gap-[5px]">
                    <h2 className="inter-medium text-[12px] text-[black]">
                      Two-factor authentication
                    </h2>
                    <span className="inter-regular text-[12px] text-[#70707C]">
                      Add an extra layer of security
                    </span>
                  </div>
                  <button
                    className={`flex items-center w-[42px] h-[23px] rounded-[12px] px-[2px] transition-colors duration-200 ${
                      twoFactor ? "bg-[#6A37F5]" : "bg-[#EDECFF]"
                    }`}
                    onClick={() => {
                      const newValue = !twoFactor;
                      setTwoFactor(newValue);
                      updateAccountSettings({ two_fa: newValue }).catch((err) =>
                        console.error(err),
                      );
                    }}
                    aria-pressed={twoFactor}
                    type="button"
                  >
                    <div
                      className={`w-[19px] h-[19px] rounded-full transition-all duration-200 ${
                        twoFactor ? "bg-white" : "bg-[#6A37F5]"
                      }`}
                      style={{
                        transform: twoFactor ? "translateX(19px)" : "translateX(0)",
                      }}
                    ></div>
                  </button>
                </div>
                <div className="w-full flex flex-row items-center justify-between h-[60px] border-b-[1px] border-[#EAEAEA] gap-[5px]">
                  <div className="flex flex-col gap-[5px]">
                    <h2 className="inter-medium text-[12px] text-[black]">
                      Email notification
                    </h2>
                    <span className="inter-regular text-[12px] text-[#70707C]">
                      Receive email updates about your account
                    </span>
                  </div>
                  <button
                    className={`flex items-center w-[42px] h-[23px] rounded-[12px] px-[2px] cursor-pointer transition-colors duration-200 ${
                      emailNotif ? "bg-[#6A37F5]" : "bg-[#EDECFF]"
                    }`}
                    onClick={() => {
                      const newValue = !emailNotif;
                      setEmailNotif(newValue);
                      sessionStorage.setItem('email_notifications', JSON.stringify(newValue));
                      window.dispatchEvent(new Event('storage'));
                      updateAccountSettings({ email_notifications_account: newValue })
                        .then(res => console.log('✅ Saved to backend:', res))
                        .catch(err => console.error('❌ Failed to save:', err));
                    }}
                    aria-pressed={emailNotif}
                    type="button"
                  >
                    <div
                      className={`w-[19px] h-[19px] rounded-full transition-all duration-200 ${
                        emailNotif ? "bg-white" : "bg-[#6A37F5]"
                      }`}
                      style={{
                        transform: emailNotif ? "translateX(19px)" : "translateX(0)",
                      }}
                    ></div>
                  </button>
                </div>
              </div>
            </div>
          )}
          {activeSidebar === "General" && <SettingsGeneral />}
          {activeSidebar === "People" && <SettingsPeople />}
          {activeSidebar === "Calendar" && <SettingsCalendar />}
          {activeSidebar === "Profile" && <ProfileSettings />}
        </div>
      </div>
    </div>
  );
}

export default Settings;