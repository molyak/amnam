let users = {};
let currentUser = null;

const storedUser = localStorage.getItem("amnam_user");
if (storedUser) {
  fetch('/user/' + storedUser)
    .then(res => res.json())
    .then(data => {
      if (data && data.username) {
        users[storedUser] = data;
        currentUser = storedUser;
        renderUserProfile();
      }
    });
}

function renderUserProfile() {
  console.log("Профиль", users[currentUser]);
}
