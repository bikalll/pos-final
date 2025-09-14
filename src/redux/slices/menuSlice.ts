import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  isAvailable: boolean;
  modifiers: string[];
  image?: string;
  orderType: 'KOT' | 'BOT'; // Kitchen Order Ticket or Bar Order Ticket
  ingredients?: Ingredient[];
};

export type Ingredient = {
  name: string;
  quantity: number;
  unit: string;
};

export type MenuState = {
  itemsById: Record<string, MenuItem>;
};

const initialState: MenuState = {
  itemsById: {
    "margherita": {
      id: "margherita",
      name: "Margherita Pizza",
      description: "Fresh mozzarella, tomato sauce, basil",
      price: 299,
      category: "Pizza",
      isAvailable: true,
      modifiers: ["Extra Cheese", "Extra Sauce", "Gluten Free"],
      image: "https://images.unsplash.com/photo-1604382354936-07c5d9983bd2?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "pepperoni": {
      id: "pepperoni",
      name: "Pepperoni Pizza",
      description: "Spicy pepperoni, mozzarella, tomato sauce",
      price: 349,
      category: "Pizza",
      isAvailable: true,
      modifiers: ["Extra Cheese", "Extra Pepperoni", "Thin Crust"],
      image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "caesar": {
      id: "caesar",
      name: "Chicken Caesar Salad",
      description: "Romaine lettuce, grilled chicken, parmesan",
      price: 249,
      category: "Salad",
      isAvailable: true,
      modifiers: ["No Croutons", "Extra Chicken", "Dressing on Side"],
      image: "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "greek": {
      id: "greek",
      name: "Greek Salad",
      description: "Mixed greens, feta, olives, cucumber, tomatoes",
      price: 229,
      category: "Salad",
      isAvailable: true,
      modifiers: ["Extra Feta", "No Olives", "Add Chicken"],
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "carbonara": {
      id: "carbonara",
      name: "Spaghetti Carbonara",
      description: "Pasta with eggs, cheese, pancetta",
      price: 329,
      category: "Pasta",
      isAvailable: true,
      modifiers: ["Extra Cheese", "No Pancetta", "Gluten Free Pasta"],
      image: "https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "alfredo": {
      id: "alfredo",
      name: "Fettuccine Alfredo",
      description: "Creamy parmesan sauce with fettuccine",
      price: 299,
      category: "Pasta",
      isAvailable: true,
      modifiers: ["Extra Sauce", "Add Chicken", "Gluten Free"],
      image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "burger": {
      id: "burger",
      name: "Beef Burger",
      description: "Angus beef with lettuce, tomato, onion",
      price: 279,
      category: "Burger",
      isAvailable: true,
      modifiers: ["Extra Patty", "No Onion", "Add Bacon"],
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "chicken_burger": {
      id: "chicken_burger",
      name: "Chicken Burger",
      description: "Grilled chicken breast with fresh vegetables",
      price: 259,
      category: "Burger",
      isAvailable: true,
      modifiers: ["Extra Cheese", "Spicy Mayo", "No Mayo"],
      image: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "steak": {
      id: "steak",
      name: "Grilled Ribeye Steak",
      description: "12oz ribeye with garlic butter and herbs",
      price: 899,
      category: "Main Course",
      isAvailable: true,
      modifiers: ["Medium Rare", "Medium", "Well Done", "Extra Garlic Butter"],
      image: "https://images.unsplash.com/photo-1546833999-b9f581a1996f?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "salmon": {
      id: "salmon",
      name: "Grilled Salmon",
      description: "Atlantic salmon with lemon herb sauce",
      price: 699,
      category: "Main Course",
      isAvailable: true,
      modifiers: ["Extra Sauce", "No Sauce", "Add Vegetables"],
      image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "cake": {
      id: "cake",
      name: "Chocolate Cake",
      description: "Rich chocolate cake with ganache",
      price: 179,
      category: "Dessert",
      isAvailable: true,
      modifiers: ["Extra Ice Cream", "No Nuts"],
      image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=150&h=150&fit=crop&crop=center",
      orderType: 'BOT',
    },
    "tiramisu": {
      id: "tiramisu",
      name: "Tiramisu",
      description: "Classic Italian dessert with coffee and mascarpone",
      price: 199,
      category: "Dessert",
      isAvailable: true,
      modifiers: ["Extra Coffee", "No Coffee", "Add Berries"],
      image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=150&h=150&fit=crop&crop=center",
      orderType: 'BOT',
    },
    "coffee": {
      id: "coffee",
      name: "Espresso",
      description: "Single shot of premium Italian espresso",
      price: 79,
      category: "Beverages",
      isAvailable: true,
      modifiers: ["Double Shot", "Extra Hot", "Iced"],
      image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150&h=150&fit=crop&crop=center",
      orderType: 'BOT',
    },
    "latte": {
      id: "latte",
      name: "Cappuccino",
      description: "Espresso with steamed milk and foam",
      price: 99,
      category: "Beverages",
      isAvailable: true,
      modifiers: ["Extra Shot", "Almond Milk", "Oat Milk", "Extra Foam"],
      image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=150&h=150&fit=crop&crop=center",
      orderType: 'BOT',
    },
    "wine_red": {
      id: "wine_red",
      name: "House Red Wine",
      description: "Glass of premium red wine",
      price: 159,
      category: "Beverages",
      isAvailable: true,
      modifiers: ["Bottle", "Extra Glass"],
      image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=150&h=150&fit=crop&crop=center",
      orderType: 'BOT',
    },
    "beer": {
      id: "beer",
      name: "Craft Beer",
      description: "Local craft beer on tap",
      price: 139,
      category: "Beverages",
      isAvailable: true,
      modifiers: ["Pint", "Half Pint", "Bottle"],
      image: "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=150&h=150&fit=crop&crop=center",
      orderType: 'BOT',
    },
    "butter_chicken": {
      id: "butter_chicken",
      name: "Butter Chicken",
      description: "Tender chicken in rich tomato-butter sauce",
      price: 379,
      category: "Indian",
      isAvailable: true,
      modifiers: ["Extra Spicy", "Mild", "Extra Sauce", "Add Naan"],
      image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "biryani": {
      id: "biryani",
      name: "Chicken Biryani",
      description: "Fragrant rice with tender chicken and spices",
      price: 329,
      category: "Indian",
      isAvailable: true,
      modifiers: ["Extra Spicy", "Mild", "Extra Raita", "Add Salad"],
      image: "https://images.unsplash.com/photo-1563379091339-3b21bbd4dc2f?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "naan": {
      id: "naan",
      name: "Garlic Naan",
      description: "Fresh baked garlic naan bread",
      price: 79,
      category: "Indian",
      isAvailable: true,
      modifiers: ["Extra Garlic", "Butter", "Plain"],
      image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "dal_makhani": {
      id: "dal_makhani",
      name: "Dal Makhani",
      description: "Creamy black lentils with spices",
      price: 259,
      category: "Indian",
      isAvailable: true,
      modifiers: ["Extra Spicy", "Mild", "Extra Cream", "Add Rice"],
      image: "https://images.unsplash.com/photo-1546833999-b9f581a1996f?w=150&h=150&fit=crop&crop=center",
      orderType: 'KOT',
    },
    "lassi": {
      id: "lassi",
      name: "Mango Lassi",
      description: "Sweet mango yogurt drink",
      price: 99,
      category: "Beverages",
      isAvailable: true,
      modifiers: ["Extra Sweet", "Less Sweet", "Add Ice Cream"],
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=150&h=150&fit=crop&crop=center",
      orderType: 'BOT',
    },
  },
};

const menuSlice = createSlice({
  name: "menu",
  initialState,
  reducers: {
    addMenuItem: (state, action: PayloadAction<MenuItem>) => {
      state.itemsById[action.payload.id] = action.payload;
    },
    updateMenuItem: (state, action: PayloadAction<MenuItem>) => {
      if (!state.itemsById[action.payload.id]) return;
      state.itemsById[action.payload.id] = action.payload;
    },
    removeMenuItem: (state, action: PayloadAction<string>) => {
      delete state.itemsById[action.payload];
    },
    toggleAvailability: (state, action: PayloadAction<string>) => {
      const item = state.itemsById[action.payload];
      if (!item) return;
      item.isAvailable = !item.isAvailable;
    },
  },
});

export const { addMenuItem, updateMenuItem, removeMenuItem, toggleAvailability } = menuSlice.actions;
export default menuSlice.reducer;



