// DNHS MealHub Firebase setup
const firebaseConfig = {
  apiKey: "AIzaSyA6htOpoLQFKzLwXuHFpADjzymcAKXBRZU",
  authDomain: "dnhs-mealhub.firebaseapp.com",
  projectId: "dnhs-mealhub",
  storageBucket: "dnhs-mealhub.firebasestorage.app",
  messagingSenderId: "890490482703",
  appId: "1:890490482703:web:8627555c12525bb216f37a",
  measurementId: "G-P0SC5F2G4Z"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

const MENU_COLLECTION = "menu";
const ORDERS_COLLECTION = "orders";

function money(value) {
  return Number(value || 0).toLocaleString("en-PH", {
    maximumFractionDigits: 2
  });
}

async function getMenuItems() {
  const snapshot = await db.collection(MENU_COLLECTION).get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function saveMenuItem(item) {
  const id = item.id
    ? String(item.id)
    : db.collection(MENU_COLLECTION).doc().id;

  const food = {
    name: String(item.name || "").trim(),
    description: String(item.description || "").trim(),
    category: String(item.category || "Meals"),
    price: Number(item.price),
    emoji: String(item.emoji || "🍽️"),
    image: String(item.image || ""),
    available: item.available !== false,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (!food.name || !Number.isFinite(food.price) || food.price < 0) {
    throw new Error("Enter a food name and a valid price.");
  }

  await db.collection(MENU_COLLECTION).doc(id).set(food, {
    merge: true
  });

  return id;
}

async function setMenuAvailability(id, available) {
  await db.collection(MENU_COLLECTION).doc(String(id)).update({
    available: Boolean(available)
  });
}

async function deleteMenuItem(id) {
  await db.collection(MENU_COLLECTION).doc(String(id)).delete();
}

async function createOrder(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const menu = await getMenuItems();

  const items = cartItems.map(cartItem => {
    const food = menu.find(
      item => String(item.id) === String(cartItem.id)
    );

    if (!food || food.available === false) {
      throw new Error(`${cartItem.name} is unavailable.`);
    }

    const quantity = Math.floor(Number(cartItem.quantity));

    if (quantity < 1 || quantity > 50) {
      throw new Error("Invalid quantity.");
    }

    return {
      id: String(food.id),
      name: food.name,
      price: Number(food.price),
      emoji: food.emoji || "🍽️",
      quantity
    };
  });

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const orderRef = db.collection(ORDERS_COLLECTION).doc();

  await orderRef.set({
    items,
    total,
    status: "Pending",
    createdAtMs: Date.now(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  localStorage.setItem("latestOrderId", orderRef.id);
  localStorage.removeItem("cart");

  return orderRef.id;
}
