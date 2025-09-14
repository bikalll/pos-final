import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";

// Simple ID generator to replace nanoid
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
import { AttendanceRecord, StaffMember } from "../../utils/types";
import { getFirebaseService } from "../../services/firebaseService";

type StaffState = {
  staffById: Record<string, StaffMember>;
  attendanceById: Record<string, AttendanceRecord>;
  isLoading: boolean;
  error: string | null;
};

const initialState: StaffState = {
  staffById: {},
  attendanceById: {},
  isLoading: false,
  error: null,
};

// Async thunks for Firebase operations
export const loadStaffMembers = createAsyncThunk(
  'staff/loadStaffMembers',
  async (_, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      const staff = await firebaseService.getStaffMembers();
      return staff;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load staff members');
    }
  }
);

export const saveStaffMemberToFirebase = createAsyncThunk(
  'staff/saveStaffMemberToFirebase',
  async (staff: StaffMember, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      await firebaseService.saveStaffMember(staff);
      return staff;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save staff member');
    }
  }
);

export const loadAttendanceRecords = createAsyncThunk(
  'staff/loadAttendanceRecords',
  async (_, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      const attendance = await firebaseService.getAttendanceRecords();
      return attendance;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load attendance records');
    }
  }
);

export const saveAttendanceRecordToFirebase = createAsyncThunk(
  'staff/saveAttendanceRecordToFirebase',
  async (attendance: AttendanceRecord, { rejectWithValue }) => {
    try {
      const firebaseService = getFirebaseService();
      await firebaseService.saveAttendanceRecord(attendance);
      return attendance;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to save attendance record');
    }
  }
);

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
    // Real-time update handlers
    updateStaffMemberFromFirebase: (state, action: PayloadAction<StaffMember>) => {
      const staff = action.payload;
      state.staffById[staff.id] = staff;
    },
    removeStaffMemberFromFirebase: (state, action: PayloadAction<string>) => {
      const staffId = action.payload;
      delete state.staffById[staffId];
    },
    updateAttendanceRecordFromFirebase: (state, action: PayloadAction<AttendanceRecord>) => {
      const attendance = action.payload;
      state.attendanceById[attendance.id] = attendance;
    },
    removeAttendanceRecordFromFirebase: (state, action: PayloadAction<string>) => {
      const attendanceId = action.payload;
      delete state.attendanceById[attendanceId];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadStaffMembers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadStaffMembers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.staffById = action.payload;
      })
      .addCase(loadStaffMembers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(saveStaffMemberToFirebase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveStaffMemberToFirebase.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveStaffMemberToFirebase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(loadAttendanceRecords.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadAttendanceRecords.fulfilled, (state, action) => {
        state.isLoading = false;
        state.attendanceById = action.payload;
      })
      .addCase(loadAttendanceRecords.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(saveAttendanceRecordToFirebase.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveAttendanceRecordToFirebase.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(saveAttendanceRecordToFirebase.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  addOrUpdateStaff, 
  clockIn, 
  clockOut,
  updateStaffMemberFromFirebase,
  removeStaffMemberFromFirebase,
  updateAttendanceRecordFromFirebase,
  removeAttendanceRecordFromFirebase,
  clearError
} = staffSlice.actions;

export default staffSlice.reducer;
