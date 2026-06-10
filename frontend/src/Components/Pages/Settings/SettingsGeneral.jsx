import React, { useState, useRef, useEffect } from 'react';
import { fetchGeneralSettings, updateGeneralSettings } from '../../../api/api';
import { ArrowIcon } from '../../../assets/icons/IconRegistry';
import {
  getSoundNotificationPref,
  saveSoundNotificationPref,
  getDesktopNotificationPref,
  saveDesktopNotificationPref,
  requestNotificationPermission,
} from '../Home/SoundNotificationManager';
import { useTimezone } from '../../../context/TimezoneContext';
import { TIMEZONES } from '../../../data/timezones';

const languageOptions = [
  'Acoli', 'Afrikaans', 'Akan', 'Aymara', 'azərbaycan', 'Balinese', 'Basa Sunda',
  'Bork, bork, bork!', 'bosanski', 'brezhoneg', 'català', 'Cebuano', 'Čeština',
  'chiShona', 'Corsican', 'Créole haïtien', 'Cymraeg', 'Dansk', 'Deutsch',
  'Èdè Yorùbá', 'Eesti', 'English (US)', 'Español', 'Esperanto', 'Euskara',
  'eʋegbe', 'Ewmew Fudd', 'Filipino', 'føroyskt', 'Français', 'Frysk', 'Gã',
  'Gaeilge', 'Gàidhlig', 'Galego', 'Hausa', 'Hrvatski', 'ʻŌlelo Hawaiʻi',
  'Ichibemba', 'Igbo', 'Ikinyarwanda', 'Ikirundi', 'Indonesia', 'Interlingua',
  'IsiXhosa', 'isiZulu', 'íslenska', 'Italiano', 'Jawa', 'Kiswahili', 'Klingon',
  'Kongo', 'kreol morisien', 'Krio', 'kurdî [kurmancî]', 'Latin', 'latviešu',
  'lea fakatonga', 'lietuvių', 'lingála', 'Lozi', 'Luba-Lulua', 'Luganda',
  'magyar', 'Malagasy', 'Malti', 'Māori', 'Melayu', 'Naijíriá Píjin', 'Nederlands',
  'Norsk', 'norsk nynorsk', 'Nyanja', 'Oʻzbek', 'occitan', 'Oromoo', 'Pirate',
  'Polski', 'Português', 'română', 'rumantsch', 'Runasimi', 'Runyankore',
  'Seselwa Creole French', 'Sesotho', 'Sesotho sa Leboa', 'Setswana', 'shqip',
  'Slovenčina', 'Slovenščina', 'Soomaali', 'srpski (latinica)', 'Suomi', 'Svenska',
  'Tiếng Việt', 'Tumbuka', 'Türkçe', 'türkmen dili', 'Wolof', 'Ελληνικά',
  'Български', 'Русский', 'Српски', 'Українська', 'монгол', 'татар', 'тоҷикӣ',
  'ქართული', 'Հայերեն', 'iei̱dish', '‫עברית‬‎', '‫ئۇيغۇرچە‬‎', 'ትግርኛ',
  'አማርኛ', 'नेपाली', 'भोजपुरी', 'मराठी', 'संस्कृत भाषा', 'हिन्दी', 'অসমীয়া',
  'বাংলা', 'ਪੰਜਾਬੀ', 'ગુજરાતી', 'ଓଡ଼ିଆ', 'தமிழ்', 'తెలుగు', 'ಕನ್ನಡ',
  'മലയാളം', 'සිංහල', 'Thai', 'ລາວ', 'မြန်မာ', 'ខ្មែរ', 'ᏣᎳᎩ', '한국어',
  '日本語', '简体中文', '粵語', '0|\\/|G |-|4xx0|2 !!!!111',
];

const SettingsGeneral = () => {
  const { timezone, updateTimezone } = useTimezone();
  const [desktopNotif, setDesktopNotif] = useState(() => getDesktopNotificationPref());
  const [soundNotif, setSoundNotif] = useState(() => getSoundNotificationPref());
  const [language, setLanguage] = useState('English (US)');
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  const [tzOpen, setTzOpen] = useState(false);
  const tzRef = useRef(null);

  // Fetch general settings on mount
  useEffect(() => {
    const token = sessionStorage.getItem('access_token');
    fetchGeneralSettings(token)
      .then(data => {
        if (data.language) setLanguage(data.language);
        if (data.timezone) {
          const found = TIMEZONES.find(tz => tz.value === data.timezone);
          updateTimezone(data.timezone, found?.ianaValue || 'Asia/Kolkata');
        } else if (!localStorage.getItem('userTimezone')) {
          updateTimezone(
            '(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi',
            'Asia/Kolkata'
          );
        }

        if (typeof data.desktop_notification === 'boolean') {
          setDesktopNotif(data.desktop_notification);
          const key = `desktop_notifications_${JSON.parse(sessionStorage.getItem('user') || '{}')?.id || 'default'}`;
          localStorage.setItem(key, JSON.stringify(data.desktop_notification));
        } else if (typeof data.desktopNotifications === 'boolean') {
          setDesktopNotif(data.desktopNotifications);
          const key = `desktop_notifications_${JSON.parse(sessionStorage.getItem('user') || '{}')?.id || 'default'}`;
          localStorage.setItem(key, JSON.stringify(data.desktopNotifications));
        }

        if (typeof data.soundNotifications === 'boolean') {
          setSoundNotif(data.soundNotifications);
          sessionStorage.setItem('sound_notifications', JSON.stringify(data.soundNotifications));
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleTimezoneChange = (tzValue) => {
    const selected = TIMEZONES.find(tz => tz.value === tzValue);
    updateTimezone(tzValue, selected?.ianaValue || 'UTC');
    updateGeneralSettings({ timezone: tzValue }).catch(err => console.error(err));
  };

  const handleDesktopNotifToggle = async () => {
    const newVal = !desktopNotif;
    setDesktopNotif(newVal);

    if (newVal) {
      await requestNotificationPermission();
    }

    await saveDesktopNotificationPref(newVal);
  };

  const handleSoundNotifToggle = () => {
    const newVal = !soundNotif;
    setSoundNotif(newVal);
    saveSoundNotificationPref(newVal);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (langRef.current && !langRef.current.contains(event.target)) {
        setLangOpen(false);
      }
      if (tzRef.current && !tzRef.current.contains(event.target)) {
        setTzOpen(false);
      }
    }
    if (langOpen || tzOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [langOpen, tzOpen]);

  return (
    <div className='flex-grow flex flex-col h-full gap-[42px] px-[20px] py-[10px]'>
      <h1 className='inter-bold text-[18px] text-[black]'>General Setting</h1>
      <div className='flex flex-col w-full h-[296px] gap-[20px]'>
        {/* Language Dropdown */}
        <div className='w-full flex flex-row items-center justify-between h-[60px] border-b-[1px] border-[#EAEAEA] gap-[5px]'>
          <div className='flex flex-col gap-[5px]'>
            <h2 className='inter-medium text-[12px] text-[black]'>Language</h2>
            <span className='inter-regular text-[12px] text-[#70707C]'>Choose your preferred language</span>
          </div>
          <div
            className='relative flex flex-row items-center justify-center w-[117px] h-[32px] text-[black] rounded-[12px] bg-[#EDECFF] gap-[10px] px-[10px] cursor-pointer select-none'
            onClick={() => setLangOpen((prev) => !prev)}
            ref={langRef}
          >
            <span className='inter-regular text-[12px]'>{language}</span>
            <ArrowIcon color="black" size={9} direction={langOpen ? 'up' : 'down'} />
            {langOpen && (
              <div className="absolute top-[36px] left-0 w-full bg-white rounded-[8px] shadow z-10 border border-[#EAEAEA] overflow-y-auto max-h-[200px] [&::-webkit-scrollbar]:hidden">
                {languageOptions.map((option) => (
                  <div
                    key={option}
                    className={`px-[10px] py-[6px] text-[12px] inter-regular hover:bg-[#EDECFF] cursor-pointer ${option === language ? 'text-[#6A37F5]' : 'text-[#03081B]'}`}
                    onClick={e => {
                      e.stopPropagation();
                      setLanguage(option);
                      setLangOpen(false);
                    }}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Time Zone Dropdown */}
        <div className='w-full flex flex-row items-center justify-between h-[60px] border-b-[1px] border-[#EAEAEA] gap-[5px]'>
          <div className='flex flex-col gap-[5px]'>
            <h2 className='inter-medium text-[12px] text-[black]'>Time Zone</h2>
            <span className='inter-regular text-[12px] text-[#70707C]'>Set your local time zone</span>
          </div>
          <div className='relative' ref={tzRef}>
            <div
              className='flex flex-row items-center justify-between w-[190px] h-[32px] text-[black] rounded-[12px] bg-[#EDECFF] gap-[6px] px-[10px] cursor-pointer select-none'
              onClick={() => setTzOpen((prev) => !prev)}
            >
              <span className='inter-regular text-[11px] truncate max-w-[140px]'>{timezone}</span>
              <ArrowIcon color="black" size={9} direction={tzOpen ? 'up' : 'down'} />
            </div>
            {tzOpen && (
              <div className="absolute top-[36px] right-0 z-[9999] w-[190px] max-h-[200px] bg-[#EDECFF] rounded-[12px] p-[10px] overflow-y-auto flex flex-col gap-[10px] [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
                {TIMEZONES.map((tz) => (
                  <div
                    key={tz.value}
                    className={`w-[170px] flex items-center inter-medium text-[12px] leading-[20px] cursor-pointer rounded-[4px] px-[4px] py-[2px] ${tz.value === timezone ? 'text-[#6A37F5] bg-[#6A37F5]/10' : 'text-[#000000] hover:bg-[#6A37F5]/10'}`}
                    onClick={e => {
                      e.stopPropagation();
                      handleTimezoneChange(tz.value);
                      setTzOpen(false);
                    }}
                  >
                    {tz.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Desktop Notification */}
        <div className='w-full flex flex-row items-center justify-between h-[60px] border-b-[1px] border-[#EAEAEA] gap-[5px]'>
          <div className='flex flex-col gap-[5px]'>
            <h2 className='inter-medium text-[12px] text-[black]'>Desktop Notification</h2>
            <span className='inter-regular text-[12px] text-[#70707C]'>Show notifications on your desktop</span>
          </div>
          <button
            className={`cursor-pointer flex items-center w-[42px] h-[23px] rounded-[12px] px-[2px] transition-colors duration-200 ${
              desktopNotif ? 'bg-[#6A37F5]' : 'bg-[#EDECFF]'
            }`}
            onClick={handleDesktopNotifToggle}
            aria-pressed={desktopNotif}
            type="button"
          >
            <div
              className={`w-[19px] h-[19px] rounded-full transition-all duration-200 ${
                desktopNotif ? 'bg-white' : 'bg-[#6A37F5]'
              }`}
              style={{
                transform: desktopNotif ? 'translateX(19px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>
        {/* Sound Notification */}
        <div className='w-full flex flex-row items-center justify-between h-[60px] border-b-[1px] border-[#EAEAEA] gap-[5px]'>
          <div className='flex flex-col gap-[5px]'>
            <h2 className='inter-medium text-[12px] text-[black]'>Sound Notification</h2>
            <span className='inter-regular text-[12px] text-[#70707C]'>Play sound for new messages</span>
          </div>
          <button
            className={`cursor-pointer flex items-center w-[42px] h-[23px] rounded-[12px] px-[2px] transition-colors duration-200 ${
              soundNotif ? 'bg-[#6A37F5]' : 'bg-[#EDECFF]'
            }`}
            onClick={handleSoundNotifToggle}
            aria-pressed={soundNotif}
            type="button"
          >
            <div
              className={`w-[19px] h-[19px] rounded-full transition-all duration-200 ${
                soundNotif ? 'bg-white' : 'bg-[#6A37F5]'
              }`}
              style={{
                transform: soundNotif ? 'translateX(19px)' : 'translateX(0)',
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsGeneral;