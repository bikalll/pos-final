import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { StaffRole } from "../../utils/types";

type AuthState = {
  isLoggedIn: boolean;
  role: StaffRole;
  userName?: string;
  userId?: string;
  restaurantId?: string;
  restaurantName?: string;
  designation?: string;
  logoUrl?: string;
};

const initialState: AuthState = {
  isLoggedIn: false,
  role: "Owner",
};

const authSlice = createSlice({
name: "auth",
initialState,
  reducers: {
    login: (state, action: PayloadAction<{ 
      userName: string; 
      role?: StaffRole; 
      userId?: string; 
      restaurantId?: string; 
      restaurantName?: string; 
      designation?: string;
      logoUrl?: string;
    }>) => {
      state.isLoggedIn = true;
      state.userName = action.payload.userName;
      state.role = action.payload.role || state.role;
      state.userId = action.payload.userId;
      state.restaurantId = action.payload.restaurantId;
      state.restaurantName = action.payload.restaurantName;
      state.designation = action.payload.designation;
      state.logoUrl = action.payload.logoUrl;
    },
    logout: (state) => {
      state.isLoggedIn = false;
      state.userName = undefined;
      state.userId = undefined;
      state.restaurantId = undefined;
      state.restaurantName = undefined;
      state.designation = undefined;
      state.logoUrl = undefined;
    },
    setLogoUrl: (state, action: PayloadAction<string | undefined>) => {
      state.logoUrl = action.payload;
    },
    setRestaurant: (state, action: PayloadAction<{ restaurantId: string; restaurantName: string }>) => {
      state.restaurantId = action.payload.restaurantId;
      state.restaurantName = action.payload.restaurantName;
    },
  },
});

export const { login, logout, setRestaurant, setLogoUrl } = authSlice.actions;
export default authSlice.reducer;
