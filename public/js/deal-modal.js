import { findProduct, formatMoney } from "./products.js";
import { addToCart } from "./cart.js";
import { showToast } from "./toast.js";

export function initDealModal() {
  const dealModal = document.querySelector("[data-deal-modal]");
  const specialCard = document.querySelector("[data-special-card]");

  if (!dealModal || !specialCard) {
    return {
      openSpecial: () => {},
      closeSpecial: () => {}
    };
  }

  function renderSpecialCard(productId = "bagel") {
    const product = findProduct(productId) || findProduct("bagel");
    specialCard.innerHTML = `
      ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ""}
      <img class="product-image" src="${product.image}" alt="${product.name}">
      <div class="product-row">
        <h3>${product.name}</h3>
        <strong>${formatMoney(product.price)}</strong>
      </div>
      <button class="add-button" type="button" data-special-add="${product.id}">Add to Cart</button>
    `;

    specialCard.querySelector("[data-special-add]").addEventListener("click", () => {
      addToCart(product.id);
      showToast(`${product.name} added to cart.`);
      closeSpecial();
    });
  }

  function openSpecial(productId = "bagel") {
    renderSpecialCard(productId);
    dealModal.classList.add("open");
    dealModal.setAttribute("aria-hidden", "false");
  }

  function closeSpecial() {
    dealModal.classList.remove("open");
    dealModal.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll("[data-open-special]").forEach((button) => {
    button.addEventListener("click", () => openSpecial());
  });

  document.querySelectorAll("[data-close-special]").forEach((button) => {
    button.addEventListener("click", closeSpecial);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSpecial();
  });

  renderSpecialCard();
  return { openSpecial, closeSpecial };
}
