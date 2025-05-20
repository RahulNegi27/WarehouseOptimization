
var main = document.querySelector(".main");
var addButton = document.querySelector("#AddProduct");
var retrieveButton = document.querySelector("#RetrieveProduct");
var popUpContentAdd = document.querySelector(".popupMenu");
var popUpContentRemove = document.querySelector(".RetrieveItems");
let flag = 0;
addButton.addEventListener('click', (e) => {
    e.stopPropagation();
    flag = 1;

    popUpContentAdd.style.display = "flex";
    setTimeout(() => {
        popUpContentAdd.classList.add("show");
    }, 10);
});

retrieveButton.addEventListener('click', (e) => {
    e.stopPropagation();
    flag = 1;

    popUpContentRemove.style.display = "flex";
    setTimeout(() => {
        popUpContentRemove.classList.add("show");
    }, 10);
});

document.addEventListener('click', () => {
    if (flag === 1) {
        flag = 0;

        
        popUpContentAdd.classList.remove("show");
        popUpContentRemove.classList.remove("show");

        
        setTimeout(() => {
            popUpContentAdd.style.display = "none";
            popUpContentRemove.style.display = "none";
        }, 300); 
    }
});

// Stop bubbling so clicks inside the popups don’t close them
popUpContentAdd.addEventListener('click', (e) => e.stopPropagation());
popUpContentRemove.addEventListener('click', (e) => e.stopPropagation());



const products = [];

  function addToList() {
    const name = document.getElementById("ProductName").value;
    const quant = +document.getElementById("quant").value;
    const size = +document.getElementById("size").value;
    const priority = document.getElementById("priority").value;
    const weight = +document.getElementById("weight").value;

    if (!name || !quant || !size || !priority || !weight) {
      alert("Please fill all fields.");
      return;
    }

    products.push({ name, quant, size, priority, weight });
    renderList();
  }

  function renderList() {
    const list = document.getElementById("productList");
    list.innerHTML = "";
    products.forEach((p, i) => {
      list.innerHTML += `
        <div class="product-card">
          <strong>#${i + 1}</strong> ${p.name} - ${p.quant} pcs
          <span>(${p.priority})</span>
        </div>`;
    });
  }

  function submitBatch() {
    if (products.length === 0) {
      alert("No products to submit.");
      return false;
    }
    document.getElementById("productsData").value = JSON.stringify(products);
    return true;
  }



  document.getElementById("retrieveForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const form = e.target;
    const data = new FormData(form);
    const productName = data.get("productName");

    const res = await fetch("/retrieve-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName })
    });

    const result = await res.json(); // Expect JSON
    const resultDiv = document.getElementById("productResult");

    if (result.success) {
      resultDiv.innerHTML = `
        <h1>Item is Found at <span>Rack ${result.rackName}</span> and <span>Bin: ${result.binName}</span></h1>
      `;
    } else {
      resultDiv.innerHTML = `<h1>${result.message}</h1>`;
    }
  });


document.addEventListener('click', () => {
    if (flag === 1) {
        flag = 0;
        popUpContentAdd.classList.remove("show");
        popUpContentRemove.classList.remove("show");
        const productFound = document.querySelector('.ProductFound');
        if (productFound) {
            productFound.classList.remove("show");
            setTimeout(() => productFound.style.display = 'none', 300);
        }
        setTimeout(() => {
            popUpContentAdd.style.display = "none";
            popUpContentRemove.style.display = "none";
        }, 300);
    }
});