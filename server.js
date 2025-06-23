const currentUser = localStorage.getItem('amnam_user');

function register() {
  const username = document.getElementById('regNick').value;
  const password = document.getElementById('regPass').value;
  fetch('http://localhost:3000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) return alert(data.error);
      localStorage.setItem('amnam_user', username);
      location.reload();
    });
}

function login() {
  const username = document.getElementById('loginNick').value;
  const password = document.getElementById('loginPass').value;
  fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) return alert(data.error);
      localStorage.setItem('amnam_user', username);
      location.reload();
    });
}

function logout() {
  localStorage.removeItem('amnam_user');
  location.reload();
}

function showMain() {
  document.getElementById('mainBlock').classList.remove('hidden');
  document.getElementById('products').classList.add('hidden');
  document.getElementById('profile').classList.add('hidden');
}

function showProducts() {
  if (!currentUser) return alert('Сначала войдите в аккаунт');
  document.getElementById('mainBlock').classList.add('hidden');
  document.getElementById('products').classList.remove('hidden');
  document.getElementById('profile').classList.add('hidden');
}

function showProfile() {
  if (!currentUser) return alert('Сначала войдите в аккаунт');
  document.getElementById('mainBlock').classList.add('hidden');
  document.getElementById('products').classList.add('hidden');
  document.getElementById('profile').classList.remove('hidden');
}

function activateKey() {
  const enteredKey = document.getElementById('keyInput').value.trim();
  if (!enteredKey) return alert('Введите ключ');
  fetch('http://localhost:3000/api/activate-key', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: enteredKey, username: currentUser }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.error) return alert(data.error);
      alert('Ключ активирован! Товар выдан.');
      showProfile();
    });
}

window.onload = () => {
  if (currentUser) {
    fetch(`http://localhost:3000/api/user/${currentUser}`)
      .then((res) => res.json())
      .then((user) => {
        if (user.error) return alert(user.error);
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('registerBtn').style.display = 'none';
        document.getElementById('profileInfo').innerHTML = `👤 ${user.username} <button onclick="logout()" class="underline ml-2">Выйти</button>`;
        const profileContent = document.getElementById('profileContent');
        profileContent.innerHTML = `
          <p><b>Ник:</b> ${user.username}</p>
          <p><b>UID:</b> ${user.uid}</p>
          <p><b>Дата регистрации:</b> ${new Date(user.reg_date).toLocaleDateString()}</p>
          <p><b>Пароль:</b> <span id="hiddenPass">••••••••</span> <button onclick="document.getElementById('hiddenPass').innerText='${user.password}'" class="underline">Показать</button></p>
          <p><b>Купленные товары:</b> ${user.purchases.length > 0 ? user.purchases.join(', ') : '—'}</p>
        `;
      });
  }
};
