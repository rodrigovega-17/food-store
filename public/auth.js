function authjs() {
  return axios
    .get(`http://localhost:3000/autorizacion`, {
      headers: {
        token: localStorage.getItem("TOKEN"),
      },
    })
    .then((response) => {
      localStorage.setItem("identifier", response.data.email);
      return response;
      console.log(response);
    })
    .catch((err) => {
      document.location.href = "http://localhost:3000/login.html";
    });
}
document.addEventListener("DOMContentLoaded", (_) => {
  document.getElementById("Logout").addEventListener("click", handleLogout);
});

function handleLogout() {
  localStorage.setItem("TOKEN", "");
  document.location.href = "http://localhost:3000/login.html";
}
