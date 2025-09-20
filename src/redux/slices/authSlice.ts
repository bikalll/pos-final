import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { StaffRole } from "../../utils/types";
import { appLifecycleManager } from "../../services/AppLifecycleManager";

type AuthState = {
  isLoggedIn: boolean;
  role: StaffRole;
  userName?: string;
  userId?: string;
  restaurantId?: string;
  restaurantName?: string;
  designation?: string;
  logoUrl?: string;
  panVatImageUrl?: string;
  userPhotoUrl?: string;
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
      panVatImageUrl?: string;
      userPhotoUrl?: string;
    }>) => {
      console.log('🔍 REDUX DEBUG - Login action received:');
      console.log('  payload.role:', action.payload.role, '(type:', typeof action.payload.role, ')');
      console.log('  current state.role:', state.role, '(type:', typeof state.role, ')');
      
      state.isLoggedIn = true;
      state.userName = action.payload.userName;
      state.role = action.payload.role || state.role;
      state.userId = action.payload.userId;
      state.restaurantId = action.payload.restaurantId;
      state.restaurantName = action.payload.restaurantName;
      state.designation = action.payload.designation;
      state.logoUrl = action.payload.logoUrl;
      state.panVatImageUrl = action.payload.panVatImageUrl;
      state.userPhotoUrl = action.payload.userPhotoUrl;
      
      console.log('  final state.role:', state.role, '(type:', typeof state.role, ')');
    },
    logout: (state) => {
      console.log('👤 User logout - triggering cleanup');
      appLifecycleManager.onUserLogout();
      
      state.isLoggedIn = false;
      state.userName = undefined;
      state.userId = undefined;
      state.restaurantId = undefined;
      state.restaurantName = undefined;
      state.designation = undefined;
      // Keep logo and PAN/VAT data for persistence across logout/login
      // state.logoUrl = undefined;
      // state.panVatImageUrl = undefined;
      state.userPhotoUrl = undefined;
    },
    setLogoUrl: (state, action: PayloadAction<string | undefined>) => {
      state.logoUrl = action.payload;
    },
    setPanVatImageUrl: (state, action: PayloadAction<string | undefined>) => {
      state.panVatImageUrl = action.payload;
    },
    setRestaurant: (state, action: PayloadAction<{ restaurantId: string; restaurantName: string }>) => {
      console.log('🏪 Restaurant switch - triggering cleanup');
      appLifecycleManager.onRestaurantSwitch();
      
      state.restaurantId = action.payload.restaurantId;
      state.restaurantName = action.payload.restaurantName;
    },
    setUserPhotoUrl: (state, action: PayloadAction<string | undefined>) => {
      state.userPhotoUrl = action.payload;
    },
  },
});

export const { login, logout, setRestaurant, setLogoUrl, setPanVatImageUrl, setUserPhotoUrl } = authSlice.actions;
export default authSlice.reducer;
