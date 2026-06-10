import React, { useEffect, useState, useRef } from 'react';
import ProfileSettingsPopup from './ProfileSettingsPopup';
import { getUserProfile, getMySettings, updateAllSettings, getProfile, updateProfile } from '../../../../api/api';
import { ProfileSettingsEditIcon, ProfileSettingsLockIcon } from '../../../../assets/icons/IconRegistry';

const ProfileSettings = () => {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [showFullNamePopup, setShowFullNamePopup] = useState(false);
  const [showDisplayNamePopup, setShowDisplayNamePopup] = useState(false);
  const [showPhonePopup, setShowPhonePopup] = useState(false);
  const [showDOBPopup, setShowDOBPopup] = useState(false);
  const [showLanguagePopup, setShowLanguagePopup] = useState(false);
  const [showDateFormatPopup, setShowDateFormatPopup] = useState(false);
  const [dateFormat, setDateFormat] = useState('');
  const [phoneData,setPhoneData]=useState({
    fullPhone: "",
    dialCode: "+91",
    countryCode: "IN",
    // flag: "",
  });

  // OTP State
  const [showOTPPopup, setShowOTPPopup] = useState(false);
  const [otpValue, setOtpValue] = useState('');

  const [settings, setSettings] = useState([]);
  const [userData, setUserData] = useState(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [language, setLanguage] = useState('');
  
  // Profile Picture State & Ref
  const [profilePic, setProfilePic] = useState(null);
  const fileInputRef = useRef(null);

  // Popup handlers
  const handleEditFullName = (idx) => {
    setSelectedIdx(idx);
    setShowFullNamePopup(true);
    const nameParts = (userData?.full_name || "").split(" ");
    setFirstName(nameParts[0] || "");
    setLastName(nameParts.slice(1).join(" ") || "");
  };

  const handleUpdate = async () => {
    try {
      await updateProfile({
        full_name: `${firstName} ${lastName}`
      });

      await fetchProfile();
      setShowFullNamePopup(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditDisplayName = (idx) => {
    setSelectedIdx(idx);
    setShowDisplayNamePopup(true);

    const value = settings[idx].value || "";
    setDisplayName(value);
  };

  const handleUpdateDisplayName = async () => {
    try {
      await updateProfile({
        display_name: displayName
      });

      await fetchProfile();
      setShowDisplayNamePopup(false);

    } catch (err) {
      console.error(err);
    }
  };

  const handleEditPhone = (idx) => {
    setSelectedIdx(idx);
    setShowPhonePopup(true);
    //setPhoneNumber(userData?.phone_number || "");
    setPhoneData({
      fullPhone: userData?.phone_number || "",
      dialCode: "+91",
      countryCode: "IN",
      // flag: "https://flagcdn.com/w20/in.png",
    });
    // Reset OTP state when opening phone popup
    setOtpValue('');
    setShowOTPPopup(false);
  };

  const handleUpdatePhone = () => {
    // Simulate sending OTP
    setTimeout(() => {
      // Show OTP popup after "sending" OTP
      setShowOTPPopup(true);
    }, 500);
  };

  const handleVerifyOTP = async (otp) => {
    if (otp && otp.length === 6) {

    await updateProfile({
      // phone_number: phoneNumber
       phone_number: phoneData.fullPhone
    });

      await fetchProfile();
      setShowPhonePopup(false);
      setShowOTPPopup(false);
    }
  };

  const handleResendOTP = () => {
    alert('OTP resent successfully!');
  };

  const handleEditDOB = (idx) => {
    setSelectedIdx(idx);
    setShowDOBPopup(true);
    const value = settings[idx].value;

    const parts = value.split('-');
    if (parts.length === 3) {
      setSelectedYear(parts[0]);
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      setSelectedMonth(monthNames[parseInt(parts[1], 10) - 1] || '');
      setSelectedDate(String(parseInt(parts[2], 10)));
    } else {
      setSelectedDate('');
      setSelectedMonth('');
      setSelectedYear('');
    }
  };

  const handleUpdateDOB = async () => {
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthNum = String(monthNames.indexOf(selectedMonth) + 1).padStart(2, '0');
    const dayNum = String(selectedDate).padStart(2, '0');
    const dob = `${selectedYear}-${monthNum}-${dayNum}`;

    await updateProfile({
      date_of_birth: dob
    });

    await fetchProfile();
    setShowDOBPopup(false);
  };

  const handleEditLanguage = (idx) => {
    setSelectedIdx(idx);
    setShowLanguagePopup(true);
    setLanguage(settings[idx].value);
  };

  const handleUpdateLanguage = async () => {
    await updateProfile({
      language: language
    });

    await fetchProfile();
    setShowLanguagePopup(false);
  };

  const handleEditDateFormat = (idx) => {
    setSelectedIdx(idx);
    setShowDateFormatPopup(true);
    setDateFormat(settings[idx].value);
  };

  const handleUpdateDateFormat = async () => {
    await updateProfile({ date_format: dateFormat });
    localStorage.setItem('date_format', dateFormat);
    sessionStorage.setItem('date_format', dateFormat);
    await fetchProfile();
    setShowDateFormatPopup(false);
  };

  const fetchProfile = async () => {
    try {
      const data = await getProfile(); 
      setUserData(data);

    const format = data.date_format || "DD/MM/YYYY";
    localStorage.setItem('date_format', format);
    sessionStorage.setItem('date_format', format);
    window.dispatchEvent(new Event('storage'));

      
      setSettings([
        {
          label: "Full name",
          value: data.full_name || "",
        },
        {
          label: "Display name",
          value: data.display_name || "",
        },
        {
          label: "Email",
          value: data.email || "",
        },
        {
          label: "Phone number",
          value: data.phone_number || "",
        },
        {
          label: "Date Of Birth",
          value: data.date_of_birth || "",
        },
        {
          label: "Language",
          value: data.language || "",
        },
        {
          label: "Date Format",
          value: data.date_format || "DD/MM/YYYY",
        },
      ]);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Profile Picture Handlers
  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfilePic(imageUrl);
    }
  };

  return (
    <div className='flex flex-col h-full gap-[10px] px-[20px] py-[20px] pb-[2px]'>
      <h1 className='inter-bold text-[18px] text-[black]'>Account Settings</h1>
      
      {/* Profile Picture Upload Section */}
      {/* Added shrink-0 so flexbox won't squeeze it out of being a perfect circle */}
      <div className="relative w-[130px] h-[130px] shrink-0 mt-4 mb-2">
        <div className="w-full h-full rounded-full overflow-hidden bg-[#F3F3F3] flex items-center justify-center border-[1px] border-[#EAEAEA]">
          {profilePic ? (
            <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[#70707C] text-[12px]">No Image</span>
          )}
        </div>
        
        {/* Adjusted position to 'bottom-[8px] right-[8px]' to bring it inside the edge */}
        <div 
          className="absolute bottom-[18px] right-[18px] cursor-pointer shadow-md rounded-full"
          onClick={handleImageClick}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="20" height="20" rx="10" fill="#6A37F5"/>
            <path d="M7.5 7.5H7C6.73478 7.5 6.48043 7.60536 6.29289 7.79289C6.10536 7.98043 6 8.23478 6 8.5V13C6 13.2652 6.10536 13.5196 6.29289 13.7071C6.48043 13.8946 6.73478 14 7 14H11.5C11.7652 14 12.0196 13.8946 12.2071 13.7071C12.3946 13.5196 12.5 13.2652 12.5 13V12.5" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 6.50005L13.5 8.00005M14.1925 7.29255C14.3894 7.09563 14.5001 6.82855 14.5001 6.55005C14.5001 6.27156 14.3894 6.00448 14.1925 5.80755C13.9956 5.61063 13.7285 5.5 13.45 5.5C13.1715 5.5 12.9044 5.61063 12.7075 5.80755L8.5 10.0001V11.5001H10L14.1925 7.29255Z" stroke="white" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {/* Hidden file input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleImageChange} 
          className="hidden" 
          accept="image/*"
        />
      </div>

      <div className="w-[96] max-w-full mt-2 opacity-100 my-0" />
      <div className="w-full overflow-hidden mt-0">
        <table className="min-w-full table-fixed border-collapse">
          <tbody>
            {settings.map((row, idx) => (
              <tr key={idx} className="h-[40px] text-left border-t border-[#E5E5E5]">
                <td className="py-3 px-4 inter-regular text-[14px] text-black align-middle text-start whitespace-nowrap">
                  {row.label}
                </td>
                <td className="py-2 px-4 inter-regular text-[14px] text-black align-middle text-start whitespace-nowrap">
                  {row.value}
                </td>
                <td className="py-2 px-4 inter-regular text-[14px] text-black align-middle text-start whitespace-nowrap">
                  <div
                    className={`flex items-center justify-center w-[16px] h-[16px] rounded-[3px] cursor-pointer ${
                      row.label !== "Email" && selectedIdx === idx ? 'bg-[#6A37F5]' : ''
                    }`}
                    onClick={() => {
                      if (row.label === "Full name") handleEditFullName(idx);
                      else if (row.label === "Display name") handleEditDisplayName(idx);
                      else if (row.label === "Phone number") handleEditPhone(idx);
                      else if (row.label === "Date Of Birth") handleEditDOB(idx);
                      else if (row.label === "Language") handleEditLanguage(idx);
                      else if (row.label === "Date Format") handleEditDateFormat(idx);
                    }}
                  >
                    {row.label === "Full name" ? (
                       <ProfileSettingsEditIcon size={10}  color={selectedIdx === idx ? "white" : "black"}/>
                    ) : row.label === "Email" ? (
                      <ProfileSettingsLockIcon size={10} color={selectedIdx === idx ? "white" : "black"} />
                    ) : (
                      <ProfileSettingsEditIcon size={10}  color={selectedIdx === idx ? "white" : "black"} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProfileSettingsPopup
        showFullNamePopup={showFullNamePopup}
        showDisplayNamePopup={showDisplayNamePopup}
        setShowFullNamePopup={setShowFullNamePopup}
        setShowDisplayNamePopup={setShowDisplayNamePopup}
        showPhonePopup={showPhonePopup}
        setShowPhonePopup={setShowPhonePopup}
        showDOBPopup={showDOBPopup}
        setShowDOBPopup={setShowDOBPopup}
        showLanguagePopup={showLanguagePopup}
        setShowLanguagePopup={setShowLanguagePopup}
        showDateFormatPopup={showDateFormatPopup}
        setShowDateFormatPopup={setShowDateFormatPopup}
        firstName={firstName}
        lastName={lastName}
        displayName={displayName}
        // phoneNumber={phoneNumber}
        phoneData={phoneData}
        selectedDate={selectedDate}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        language={language}
        dateFormat={dateFormat}
        handleUpdate={handleUpdate}
        handleUpdateDisplayName={handleUpdateDisplayName}
        handleUpdatePhone={handleUpdatePhone}
        handleUpdateDOB={handleUpdateDOB}
        handleUpdateLanguage={handleUpdateLanguage}
        handleUpdateDateFormat={handleUpdateDateFormat}
        setFirstName={setFirstName}
        setLastName={setLastName}
        setDisplayName={setDisplayName}
        // setPhoneNumber={setPhoneNumber}
        setPhoneData={setPhoneData}
        setSelectedDate={setSelectedDate}
        setSelectedMonth={setSelectedMonth}
        setSelectedYear={setSelectedYear}
        setLanguage={setLanguage}
        setDateFormat={setDateFormat}
        // OTP Props
        showOTPPopup={showOTPPopup}
        setShowOTPPopup={setShowOTPPopup}
        otpValue={otpValue}
        setOtpValue={setOtpValue}
        handleVerifyOTP={handleVerifyOTP}
        handleResendOTP={handleResendOTP}
      />
    </div>
  );
};

export default ProfileSettings;