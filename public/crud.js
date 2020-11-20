document.addEventListener("DOMContentLoaded", (_) => {
  form = document.getElementById("myform2");
  form.addEventListener("submit", handleAddItem);
});

function handleAddItem(event) {
  event.preventDefault();
  axios
    .post(`http://localhost:3000/additem`, {
      data: {
        name: document.getElementById("name").value,
        price: document.getElementById("price").value,
        collection: document.getElementById("collection").value,
      },
    })
    .then((response) => {
      console.log(response);
    })
    .catch((err) => {
      console.log(err);
      //div.innerHTML = "NO EXISTE";
    });
}
