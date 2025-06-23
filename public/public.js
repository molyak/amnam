// public.js для Amnam Client с плавной анимацией, АмНямом, ключами, товарами, профилем

let users = JSON.parse(localStorage.getItem('users')) || {};
let keys = JSON.parse(localStorage.getItem('activation_keys')) || [];
let currentUser = localStorage.getItem("amnam_user");

function generateUID() {
  return Math.random().toString(36).substring(2, 10);
}

function register() {
  const username = document.getElementById("regNick").value;
  const password = document.getElementById("regPass").value;
  const uid = generateUID();

  if (users[username]) return alert("Пользователь уже существует");

  users[username] = {
    username,
    password,
    uid,
    regDate: new Date().toISOString(),
    purchases: [],
    isAdmin: false,
    isBlocked: false
  };
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("amnam_user", username);
  location.reload();
}

function login() {
  const username = document.getElementById("loginNick").value;
  const password = document.getElementById("loginPass").value;

  if (!users[username] || users[username].password !== password || users[username].isBlocked) {
    return alert("Неверный ник, пароль или вы заблокированы");
  }
  localStorage.setItem("amnam_user", username);
  location.reload();
}

function logout() {
  localStorage.removeItem("amnam_user");
  location.reload();
}

function showMain() {
  document.getElementById('mainBlock').classList.remove('hidden');
  document.getElementById('products').classList.add('hidden');
  document.getElementById('profile').classList.add('hidden');
}

function showProducts() {
  if (!currentUser) return alert("Сначала войдите в аккаунт");
  document.getElementById('mainBlock').classList.add('hidden');
  document.getElementById('products').classList.remove('hidden');
  document.getElementById('profile').classList.add('hidden');
}

function showProfile() {
  if (!currentUser) return alert("Сначала войдите в аккаунт");
  document.getElementById('mainBlock').classList.add('hidden');
  document.getElementById('products').classList.add('hidden');
  document.getElementById('profile').classList.remove('hidden');
}

function activateKey() {
  const enteredKey = document.getElementById("keyInput").value.trim();
  if (!enteredKey) return;
  const index = keys.indexOf(enteredKey);
  if (index === -1) return alert("Неверный ключ");
  users[currentUser].purchases.push("Активирован по ключу");
  keys.splice(index, 1);
  localStorage.setItem("activation_keys", JSON.stringify(keys));
  localStorage.setItem("users", JSON.stringify(users));
  alert("Ключ активирован! Товар выдан.");
  showProfile();
}

window.onload = () => {
  if (currentUser && users[currentUser]) {
    document.getElementById("loginBtn").style.display = "none";
    document.getElementById("registerBtn").style.display = "none";
    const user = users[currentUser];
    document.getElementById("profileInfo").innerHTML = `👤 ${user.username} <button onclick="logout()" class="underline ml-2">Выйти</button>`;
    const profileContent = document.getElementById("profileContent");
    profileContent.innerHTML = `
      <p><b>Ник:</b> ${user.username}</p>
      <p><b>UID:</b> ${user.uid}</p>
      <p><b>Дата регистрации:</b> ${new Date(user.regDate).toLocaleDateString()}</p>
      <p><b>Пароль:</b> <span id="hiddenPass">••••••••</span> <button onclick="document.getElementById('hiddenPass').innerText='${user.password}'" class="underline">Показать</button></p>
      <p><b>Купленные товары:</b> ${user.purchases.length > 0 ? user.purchases.join(", ") : "—"}</p>
    `;
  }
};
