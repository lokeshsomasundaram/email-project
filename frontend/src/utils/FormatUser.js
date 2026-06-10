export const formatUser = (user,type="name") => {
  if (!user) return "";
  if (typeof user === "string" && user.startsWith("[") && user.endsWith("]")) {
    try { user = JSON.parse(user); } catch (e) {}
  }

  if (Array.isArray(user)) {
    user = user[0];
  }

  if (!user) return "";
  if (typeof user === "string") return type === "email" ? "" : user;

  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  const foundEmail = user.email || user.user_email || user.receiver_email || user.sender_email || "";

  if (type === "email") {
    return foundEmail;
  }

  return fullName || foundEmail || "";
};