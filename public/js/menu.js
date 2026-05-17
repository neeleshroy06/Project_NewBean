import { formatMoney, products } from "./products.js";
import { addToCart } from "./cart.js";
import { initToast, showToast } from "./toast.js";
import { initCartPanel } from "./cart-panel.js";
import { initDealModal } from "./deal-modal.js";
import { initVoiceOrder } from "./voice-order.js";

const state = { filter: "all" };
const menuGrid = document.querySelector("[data-menu-grid]");

initToast(document.querySelector("[data-toast]"));
const cartUi = initCartPanel();
const dealModal = initDealModal();

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((filterButton) => {
      filterButton.classList.toggle("active", filterButton === button);
    });
    renderMenu();
  });
});

function renderMenu() {
  const visibleProducts = products.filter((product) => {
    if (state.filter === "all") return true;
    if (state.filter === "deal") return product.deal;
    return product.category === state.filter;
  });

  menuGrid.innerHTML = visibleProducts.map(createProductCard).join("");

  menuGrid.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const product = products.find((item) => item.id === button.dataset.add);
      addToCart(product.id);
      showToast(`${product.name} added to cart.`);
      if (product.deal) dealModal.openSpecial(product.id);
    });
  });
}

function createProductCard(product) {
  return `
    <article class="product-card">
      ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ""}
      <img class="product-image" src="${product.image}" alt="${product.name}" loading="lazy">
      <div class="product-row">
        <h3>${product.name}</h3>
        <strong>${formatMoney(product.price)}</strong>
      </div>
      <button class="add-button" type="button" data-add="${product.id}">Add to Cart</button>
    </article>
  `;
}

renderMenu();
initVoiceOrder({
  onSuccess: (result) => {
    showToast(result.message);
    if (result.actions?.length) cartUi.openCart();
  },
  onError: (message) => showToast(message)
});
