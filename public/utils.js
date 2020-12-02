document.addEventListener("DOMContentLoaded", (_) => {
  form = document.getElementById("myform");
  // document.getElementById("redirect").addEventListener("click", handleRedirect);
  form.addEventListener("submit", handleSubmit);
});

function handleRedirect() {
  console.log(localStorage.setItem("TOKEN", ""));
}

function handleSubmit(event) {
  event.preventDefault();
  form = document.querySelector("myform");
  var data = new FormData(document.getElementById("myform"));
  console.log();
  axios
    .post(`http://localhost:3000/login`, {
      data: {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
      },
    })
    .then((response) => {
      localStorage.setItem("TOKEN", response.data);
      document.location.href = "http://localhost:3000/inicio.html";
    })
    .catch((err) => {
      console.log(err);
      //div.innerHTML = "NO EXISTE";
    });
}
