import "./App.css";
import "../src/assets/fonts/fonts.css";
import React, { useState, useEffect, useRef } from "react";
import ErrorBoundary from "./Components/ErrorBoundary";
import { AppRoutes } from "./routes/AppRoutes";
import { getAccountActivities, getAccountSettings, getCalendarSettings, getGeneralSettings, getPeopleSettings, getUserProfile } from "./api/api";

function App() {
  // Detect minimal chat route
  const isMinimal = /^\/chat\/[^/]+\/minimal$/.test(
  window.location.pathname
);
  const [sessionExpired, setSessionExpired] = useState(false);
  const redirectingRef = useRef(false);

  useEffect(() => {
    const localToken = localStorage.getItem("access_token");
    const sessionToken = sessionStorage.getItem("access_token");
    if (!sessionToken && localToken) {
      sessionStorage.setItem("access_token", localToken);
    }
    const handleStorageLogout = (event) => {
      if (event.key === "force_logout") {
        redirectingRef.current = true;

        setSessionExpired(true);

        localStorage.clear();
        sessionStorage.clear();

        document.cookie.split(";").forEach((cookie) => {
          document.cookie = cookie
            .replace(/^ +/, "")
            .replace(
              /=.*/,
              "=;expires=" + new Date(0).toUTCString() + ";path=/",
            );
        });

        window.location.href = "/";
      }
    };

    window.addEventListener("storage", handleStorageLogout);

    const validateAuth = async () => {
      const isPublicRoute =
  window.location.pathname === "/" ||
  window.location.pathname.startsWith("/signup") ||
  isMinimal;

      if (isPublicRoute || redirectingRef.current) {
        return;
      }

    try {

      const res = await getUserProfile();
const alreadyLoaded = sessionStorage.getItem('email_pref_loaded');
    if (!alreadyLoaded) {
      getAccountSettings()
        .then(data => {
          const emailVal = data.data.email_notifications_account ?? true;
          sessionStorage.setItem('email_notifications', JSON.stringify(emailVal));
          window.dispatchEvent(new Event('storage'));
          sessionStorage.setItem('email_pref_loaded', 'true');
        })
        .catch(() => {});
        getPeopleSettings()
    .then(data => {
      const contactSuggestionsVal = data.data.contact_suggestions ?? true;
      sessionStorage.setItem('contact_suggestions', JSON.stringify(contactSuggestionsVal));
      const showProfilePhotosVal = data.data.show_profile_photos ?? true;
      sessionStorage.setItem('show_profile_photos', JSON.stringify(showProfilePhotosVal));
      sessionStorage.setItem('email_pref_loaded', 'true');
      })
      .catch(() => {});

      getCalendarSettings()
        .then(res => {
          const weekVal = res?.data?.start_week_on || 'Sunday';
          sessionStorage.setItem('calendar_start_week', weekVal);
          const viewVal = (res?.data?.default_view || 'Week').toLowerCase();
          sessionStorage.setItem('calendar_default_view', viewVal);
          const weekendsVal = res?.data?.show_weekends ?? true;
          sessionStorage.setItem('calendar_show_weekends', JSON.stringify(weekendsVal));
      })
      .catch(() => {});
      getGeneralSettings()
        .then(data => {
          const soundVal = data?.soundNotifications ?? true;
          sessionStorage.setItem('sound_notifications', JSON.stringify(soundVal));
          const user = JSON.parse(sessionStorage.getItem('user'));
          const key = `sound_notifications_${user?.id || 'default'}`;
          localStorage.setItem(key, JSON.stringify(soundVal));

          if (!localStorage.getItem("userTimezone")) {
        localStorage.setItem("userTimezone", "(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi");
        localStorage.setItem("userIanaTimezone", "Asia/Kolkata");
      }
        })
        .catch(() => {});
        getProfile()
          .then(data => {
            const fmt = data.date_format || "DD/MM/YYYY";
            localStorage.setItem('date_format', fmt);
            sessionStorage.setItem('date_format', fmt);
          })
          .catch(() => {});
    }
    } catch (error) {

      console.log("SESSION FAILED", error);

      if (error.response?.status === 401) {

        redirectingRef.current = true;

          setSessionExpired(true);

          localStorage.removeItem("access_token");
          sessionStorage.clear();

          document.cookie.split(";").forEach((cookie) => {
            document.cookie = cookie
              .replace(/^ +/, "")
              .replace(
                /=.*/,
                "=;expires=" + new Date(0).toUTCString() + ";path=/",
              );
          });

          clearInterval(interval);

          window.location.href = "/";
        }
      }
    };

    setTimeout(() => {
  validateAuth();
}, 50);

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        validateAuth();
      }
    }, 30000);

    return () => {
      clearInterval(interval);

      window.removeEventListener("storage", handleStorageLogout);
    };
  }, []);

  if (sessionExpired) {
    return null;
  }
  return (
    <ErrorBoundary>
      {isMinimal ? (
        <AppRoutes />
      ) : (
        <div className="w-full scrollbar-hide">
          <AppRoutes />
        </div>
      )}
    </ErrorBoundary>
  );
}
export default App;
