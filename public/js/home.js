import { initToast } from "./toast.js";
import { initCartPanel } from "./cart-panel.js";
import { initDealModal } from "./deal-modal.js";

initToast(document.querySelector("[data-toast]"));
initCartPanel();
initDealModal();
