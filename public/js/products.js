export const TAX_RATE = 0.115;

export const products = [
  {
    id: "bagel",
    name: "Bagel",
    price: 3.45,
    category: "food",
    badge: "Only 1 left",
    deal: true,
    image: "https://images.unsplash.com/photo-1603046891744-76e6300f82ef?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "croissant",
    name: "Croissant",
    price: 3.25,
    category: "food",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "muffin",
    name: "Muffin",
    price: 3.95,
    category: "food",
    badge: "Low price",
    deal: true,
    image: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "avocado-toast",
    name: "Avocado Toast",
    price: 5.5,
    category: "food",
    image: "https://images.unsplash.com/photo-1588137378633-dea1336ce1e2?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "americano",
    name: "Americano",
    price: 4.65,
    category: "drink",
    image: "https://images.unsplash.com/photo-1494314671902-399b18174975?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "cappuccino",
    name: "Cappuccino",
    price: 5,
    category: "drink",
    image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "latte",
    name: "Latte",
    price: 4,
    category: "drink",
    image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "hot-chocolate",
    name: "Hot Chocolate",
    price: 4,
    category: "drink",
    image: "https://images.unsplash.com/photo-1517578239113-b03992dcdd25?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "sandwich",
    name: "Sandwich",
    price: 6,
    category: "food",
    image: "https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=700&q=80"
  }
];

export function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

export function findProduct(productId) {
  return products.find((item) => item.id === productId);
}
