import { TAX_RATE, findProduct, formatMoney } from "./products.js";
import { clearCart, getCart, subscribe, updateQuantity } from "./cart.js";
import { showToast } from "./toast.js";

export function initCartPanel() {
  const cartPanel = document.querySelector("[data-cart-panel]");
  const cartItems = document.querySelector("[data-cart-items]");
  const cartCount = document.querySelector("[data-cart-count]");
  const subtotalEl = document.querySelector("[data-subtotal]");
  const taxEl = document.querySelector("[data-tax]");
  const totalEl = document.querySelector("[data-total]");
  const checkoutForm = document.querySelector("[data-checkout-form]");

  function createCartLine(item) {
    const product = findProduct(item.id);
    const lineTotal = product.price * item.quantity;

    return `
      <article class="cart-line">
        <div>
          <h3>${product.name}</h3>
          <p>${formatMoney(product.price)} each</p>
        </div>
        <div class="qty-controls" aria-label="${product.name} quantity controls">
          <button type="button" data-decrease="${product.id}" aria-label="Remove one ${product.name}">-</button>
          <strong>${item.quantity}</strong>
          <button type="button" data-increase="${product.id}" aria-label="Add one ${product.name}">+</button>
        </div>
        <strong>${formatMoney(lineTotal)}</strong>
      </article>
    `;
  }

  function renderCart() {
    const cart = getCart();

    cartItems.innerHTML =
      cart.length === 0
        ? `<div class="empty-cart">Your cart is empty. Add something fresh from the menu.</div>`
        : cart.map(createCartLine).join("");

    cartItems.querySelectorAll("[data-decrease]").forEach((button) => {
      button.addEventListener("click", () => updateQuantity(button.dataset.decrease, -1));
    });

    cartItems.querySelectorAll("[data-increase]").forEach((button) => {
      button.addEventListener("click", () => updateQuantity(button.dataset.increase, 1));
    });

    const subtotal = cart.reduce((sum, item) => {
      const product = findProduct(item.id);
      return sum + product.price * item.quantity;
    }, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax;
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    cartCount.textContent = itemCount;
    subtotalEl.textContent = formatMoney(subtotal);
    taxEl.textContent = formatMoney(tax);
    totalEl.textContent = formatMoney(total);
    checkoutForm.querySelector("button[type='submit']").disabled = cart.length === 0;
  }

  function openCart() {
    cartPanel.classList.add("open");
    cartPanel.setAttribute("aria-hidden", "false");
  }

  function closeCart() {
    cartPanel.classList.remove("open");
    cartPanel.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll("[data-open-cart]").forEach((button) => {
    button.addEventListener("click", openCart);
  });

  document.querySelectorAll("[data-close-cart]").forEach((button) => {
    button.addEventListener("click", closeCart);
  });

  checkoutForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const cart = getCart();
    if (cart.length === 0) {
      showToast("Your cart is empty.");
      return;
    }

    const formData = new FormData(checkoutForm);
    const name = formData.get("name").toString().trim();
    const pickup = formData.get("pickup").toString();

    clearCart();
    checkoutForm.reset();
    closeCart();
    showToast(`Thanks, ${name}! Your order will be ready in ${pickup}.`);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCart();
  });

  subscribe(renderCart);
  renderCart();

  return { openCart, closeCart };
}
