import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Simple ID generator to replace nanoid
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
import { AttendanceRecord, StaffMember } from "../../utils/types";

type StaffState = {
staffById: Record<string, StaffMember>;
attendanceById: Record<string, AttendanceRecord>;
};

const initialState: StaffState = {
staffById: {
"owner": { id: "owner", name: "Owner", role: "Owner" },
"waiter1": { id: "waiter1", name: "Waiter 1", role: "Waiter" },
},
attendanceById: {},
};

const staffSlice = createSlice({
name: "staff",
initialState,
reducers: {
addOrUpdateStaff: (state, action: PayloadAction<StaffMember>) => {
state.staffById[action.payload.id] = action.payload;
},
clockIn: {
prepare: (staffId: string, latitude?: number, longitude?: number, photoUri?: string) => ({
payload: { id: generateId(), staffId, timestamp: Date.now(), latitude, longitude, photoUri, type: "in" as const },
}),
reducer: (state, action: PayloadAction<AttendanceRecord>) => {
state.attendanceById[action.payload.id] = action.payload;
},
},
clockOut: {
prepare: (staffId: string, latitude?: number, longitude?: number, photoUri?: string) => ({
payload: { id: generateId(), staffId, timestamp: Date.now(), latitude, longitude, photoUri, type: "out" as const },
}),
reducer: (state, action: PayloadAction<AttendanceRecord>) => {
state.attendanceById[action.payload.id] = action.payload;
},
},
},
});

export const { addOrUpdateStaff, clockIn, clockOut } = staffSlice.actions;
export default staffSlice.reducer;
