var form;

document.addEventListener("DOMContentLoaded", (_) => {
  form = document.getElementById("myform");
  function handleForm(event) {}
  form.addEventListener("submit", handleSubmit);
});
console.log("HOLA");

function handleSubmit(event) {
  event.preventDefault();
  form = document.querySelector("myform");
  var data = new FormData(form);

  // axios
  //   .post(`http://localhost:3000/login`, {
  //     params: {
  //       id: localStorage.getItem("GameID"),
  //     },
  //   })
  //   .then((response) => {
  //     console.log("DRAW CARDS");
  //     console.log("Request update por draw");
  //     updateStatus();
  //   })
  //   .catch((err) => {
  //     //div.innerHTML = "NO EXISTE";
  //   });
}
