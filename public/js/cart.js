import { findProduct, products } from "./products.js";

const STORAGE_KEY = "new-bean-cart";

let cart = loadCart();
const listeners = new Set();

export function getCart() {
  return cart.map((item) => ({ ...item }));
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function addToCart(productId, quantity = 1) {
  const product = findProduct(productId);
  if (!product || quantity < 1) return null;

  const existingItem = cart.find((item) => item.id === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    cart.push({ id: productId, quantity });
  }

  saveCart();
  notify();
  return product;
}

export function applyCartAction(action) {
  const product = findProduct(action.productId);
  if (!product) return null;

  const existingItem = cart.find((item) => item.id === action.productId);
  if (action.type === "set") {
    if (existingItem) {
      existingItem.quantity = action.quantity;
    } else {
      cart.push({ id: action.productId, quantity: action.quantity });
    }
  } else if (action.type === "remove") {
    if (!existingItem) return product;
    existingItem.quantity -= action.quantity;
    if (existingItem.quantity <= 0) {
      cart = cart.filter((item) => item.id !== action.productId);
    }
  } else {
    return addToCart(action.productId, action.quantity);
  }

  saveCart();
  notify();
  return product;
}

export function applyCartActions(actions) {
  actions.forEach((action) => applyCartAction(action));
}

export function updateQuantity(productId, amount) {
  const item = cart.find((cartItem) => cartItem.id === productId);
  if (!item) return;

  item.quantity += amount;
  if (item.quantity <= 0) {
    cart = cart.filter((cartItem) => cartItem.id !== productId);
  }

  saveCart();
  notify();
}

export function clearCart() {
  cart = [];
  saveCart();
  notify();
}

function loadCart() {
  try {
    const savedCart = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(savedCart)) return [];

    return savedCart.filter((item) => {
      return products.some((product) => product.id === item.id) && Number.isInteger(item.quantity) && item.quantity > 0;
    });
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
}

function notify() {
  listeners.forEach((listener) => listener(getCart()));
}
