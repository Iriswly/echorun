const USERS_KEY = "ECHORUN_USERS";
const CURRENT_USER_KEY = "ECHORUN_CURRENT_USER";
const TEST_ACCOUNT = {
  id: "user_test_demo",
  name: "Test User",
  email: "test@echorun.local",
  password: encodePassword("test123"),
  createdAt: "2026-04-28T00:00:00.000Z",
};

function ensureTestAccount(users) {
  const baseUsers = Array.isArray(users) ? users : [];
  const hasTestAccount = baseUsers.some((user) => normalizeEmail(user?.email) === TEST_ACCOUNT.email);

  if (hasTestAccount) {
    return baseUsers;
  }

  const nextUsers = [...baseUsers, TEST_ACCOUNT];
  localStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
  return nextUsers;
}

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return ensureTestAccount(raw ? JSON.parse(raw) : []);
  } catch {
    return ensureTestAccount([]);
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function encodePassword(password) {
  return btoa(unescape(encodeURIComponent(String(password))));
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

export function getCurrentUser() {
  try {
    const currentId = localStorage.getItem(CURRENT_USER_KEY);
    if (!currentId) return null;
    return publicUser(readUsers().find((user) => user.id === currentId) || null);
  } catch {
    return null;
  }
}

export function registerAccount({ name, email, password }) {
  const displayName = String(name || "").trim();
  const normalizedEmail = normalizeEmail(email);
  const rawPassword = String(password || "");

  if (displayName.length < 2) {
    return { ok: false, error: "Name must be at least 2 characters." };
  }
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (rawPassword.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }

  const users = readUsers();
  if (users.some((user) => normalizeEmail(user.email) === normalizedEmail)) {
    return { ok: false, error: "An account with this email already exists." };
  }

  const user = {
    id: `user_${Date.now()}`,
    name: displayName,
    email: normalizedEmail,
    password: encodePassword(rawPassword),
    createdAt: new Date().toISOString(),
  };

  saveUsers([...users, user]);
  localStorage.setItem(CURRENT_USER_KEY, user.id);
  window.dispatchEvent(new Event("echorun-auth-change"));
  return { ok: true, user: publicUser(user) };
}

export function loginAccount({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const encodedPassword = encodePassword(password || "");
  const user = readUsers().find(
    (item) => normalizeEmail(item.email) === normalizedEmail && item.password === encodedPassword,
  );

  if (!user) {
    return { ok: false, error: "Email or password is incorrect." };
  }

  localStorage.setItem(CURRENT_USER_KEY, user.id);
  window.dispatchEvent(new Event("echorun-auth-change"));
  return { ok: true, user: publicUser(user) };
}

export function logoutAccount() {
  localStorage.removeItem(CURRENT_USER_KEY);
  window.dispatchEvent(new Event("echorun-auth-change"));
}

export function getStorageKey(baseKey) {
  const user = getCurrentUser();
  return user ? `${baseKey}_${user.id}` : baseKey;
}
