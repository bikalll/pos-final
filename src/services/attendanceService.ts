import { AttendanceRecord } from '../utils/types';
import { createFirestoreService } from './firestoreService';
import { imgbbService, ImageUploadResult } from './imgbbService';
import { getFirestore, collection, getDocs, query } from 'firebase/firestore';

export interface AttendanceService {
  recordAttendance(record: AttendanceRecord): Promise<void>;
  recordAttendanceWithPhoto(record: Omit<AttendanceRecord, 'photoUri'>, photoUri: string): Promise<void>;
  getTodayAttendance(restaurantId: string): Promise<AttendanceRecord[]>;
  getEmployeeAttendance(employeeId: string, restaurantId: string): Promise<AttendanceRecord[]>;
  getAttendanceSummary(restaurantId: string, date?: Date): Promise<EmployeeAttendanceSummary[]>;
  canUserCheckIn(employeeId: string, restaurantId: string): Promise<boolean>;
  canUserCheckOut(employeeId: string, restaurantId: string): Promise<boolean>;
}

export interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeName: string;
  checkInTime?: number;
  checkOutTime?: number;
  checkInLocation?: string;
  checkOutLocation?: string;
  checkInPhoto?: string; // ImgBB URL
  checkOutPhoto?: string; // ImgBB URL
  status: 'checked-in' | 'checked-out' | 'not-checked-in';
  totalHours?: number;
}

export class FirebaseAttendanceService implements AttendanceService {
  private firestoreService: ReturnType<typeof createFirestoreService>;
  private restaurantId: string;
  private db: any;

  constructor(restaurantId: string) {
    this.firestoreService = createFirestoreService(restaurantId);
    this.restaurantId = restaurantId;
    this.db = getFirestore();
  }

  private async readAllFromCollection(collectionName: string): Promise<any[]> {
    try {
      const col = collection(this.db, "restaurants", this.restaurantId, collectionName);
      const q = query(col);
      const snap = await getDocs(q);
      const out: any[] = [];
      snap.forEach(docSnap => {
        out.push({ id: docSnap.id, ...docSnap.data() });
      });
      return out;
    } catch (error) {
      console.error('Error reading collection:', collectionName, error);
      throw error;
    }
  }

  async recordAttendance(record: AttendanceRecord): Promise<void> {
    try {
      // Add restaurant ID to the record for data isolation
      const attendanceRecord = {
        ...record,
        restaurantId: this.firestoreService.restaurantId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await this.firestoreService.create('attendance', attendanceRecord);
      
      console.log('Attendance recorded successfully:', record.id);
    } catch (error) {
      console.error('Error recording attendance:', error);
      throw new Error('Failed to record attendance');
    }
  }

  async recordAttendanceWithPhoto(record: Omit<AttendanceRecord, 'photoUri'>, photoUri: string): Promise<void> {
    try {
      // photoUri is already an ImgBB URL from takePhotoAndUpload()
      // No need to upload again
      
      // Create attendance record with ImgBB URL
      const attendanceRecord: AttendanceRecord = {
        ...record,
        photoUri: photoUri, // This is already the ImgBB URL
        restaurantId: this.firestoreService.restaurantId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await this.firestoreService.create('attendance', attendanceRecord);
      
      console.log('Attendance with photo recorded successfully:', record.id);
    } catch (error) {
      console.error('Error recording attendance with photo:', error);
      throw new Error('Failed to record attendance with photo');
    }
  }

  async getTodayAttendance(restaurantId: string): Promise<AttendanceRecord[]> {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1;

      const attendanceRecords = await this.readAllFromCollection('attendance');
      
      return attendanceRecords.filter(record => 
        record.restaurantId === restaurantId &&
        record.timestamp >= todayStart && 
        record.timestamp <= todayEnd
      ).sort((a, b) => a.timestamp - b.timestamp); // Sort by time ascending for proper sequence
    } catch (error) {
      console.error('Error getting today\'s attendance:', error);
      throw new Error('Failed to get today\'s attendance');
    }
  }

  async getEmployeeAttendance(employeeId: string, restaurantId: string): Promise<AttendanceRecord[]> {
    try {
      const attendanceRecords = await this.readAllFromCollection('attendance');
      
      return attendanceRecords.filter(record => 
        record.restaurantId === restaurantId &&
        record.staffId === employeeId
      ).sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting employee attendance:', error);
      throw new Error('Failed to get employee attendance');
    }
  }

  async getAttendanceSummary(restaurantId: string, date?: Date): Promise<EmployeeAttendanceSummary[]> {
    try {
      const targetDate = date || new Date();
      const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
      const dayEnd = dayStart + (24 * 60 * 60 * 1000) - 1;

      // Get all attendance records for the day
      const attendanceRecords = await this.readAllFromCollection('attendance');
      const dayRecords = attendanceRecords.filter(record => 
        record.restaurantId === restaurantId &&
        record.timestamp >= dayStart && 
        record.timestamp <= dayEnd
      );

      // Get all employees for the restaurant
      const employees = await this.readAllFromCollection('users');
      const restaurantEmployees = employees.filter(emp => 
        emp.restaurantId === restaurantId && 
        emp.role !== 'Owner'
      );

      // Generate summaries for each employee
      const summaries: EmployeeAttendanceSummary[] = restaurantEmployees.map(employee => {
        const employeeRecords = dayRecords.filter(record => record.staffId === employee.id);
        const checkInRecord = employeeRecords.find(record => record.type === 'in');
        const checkOutRecord = employeeRecords.find(record => record.type === 'out');

        let status: 'checked-in' | 'checked-out' | 'not-checked-in' = 'not-checked-in';
        if (checkInRecord && checkOutRecord) {
          status = 'checked-out';
        } else if (checkInRecord) {
          status = 'checked-in';
        }

        let totalHours: number | undefined;
        if (checkInRecord && checkOutRecord) {
          totalHours = (checkOutRecord.timestamp - checkInRecord.timestamp) / (1000 * 60 * 60);
        }

        return {
          employeeId: employee.id,
          employeeName: employee.name || employee.displayName || employee.email?.split('@')[0] || 'Unknown Employee',
          checkInTime: checkInRecord?.timestamp,
          checkOutTime: checkOutRecord?.timestamp,
          checkInLocation: checkInRecord?.detailedAddress || checkInRecord?.address || 
            (checkInRecord?.latitude && checkInRecord?.longitude ? 
              `${checkInRecord.latitude.toFixed(4)}, ${checkInRecord.longitude.toFixed(4)}` : undefined),
          checkOutLocation: checkOutRecord?.detailedAddress || checkOutRecord?.address || 
            (checkOutRecord?.latitude && checkOutRecord?.longitude ? 
              `${checkOutRecord.latitude.toFixed(4)}, ${checkOutRecord.longitude.toFixed(4)}` : undefined),
          checkInPhoto: checkInRecord?.photoUri,
          checkOutPhoto: checkOutRecord?.photoUri,
          status,
          totalHours,
        };
      });

      return summaries;
    } catch (error) {
      console.error('Error getting attendance summary:', error);
      throw new Error('Failed to get attendance summary');
    }
  }

  async canUserCheckIn(employeeId: string, restaurantId: string): Promise<boolean> {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1;

      const attendanceRecords = await this.readAllFromCollection('attendance');
      
      const todayRecords = attendanceRecords.filter(record => 
        record.restaurantId === restaurantId &&
        record.staffId === employeeId &&
        record.timestamp >= todayStart && 
        record.timestamp <= todayEnd
      ).sort((a, b) => a.timestamp - b.timestamp);
      
      const hasCheckIn = todayRecords.find(record => record.type === 'in');
      const hasCheckOut = todayRecords.find(record => record.type === 'out');
      
      // Can check in only if no check-in and no check-out today
      return !hasCheckIn && !hasCheckOut;
    } catch (error) {
      console.error('Error checking if user can check in:', error);
      return false;
    }
  }

  async canUserCheckOut(employeeId: string, restaurantId: string): Promise<boolean> {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      const todayEnd = todayStart + (24 * 60 * 60 * 1000) - 1;

      const attendanceRecords = await this.readAllFromCollection('attendance');
      
      const todayRecords = attendanceRecords.filter(record => 
        record.restaurantId === restaurantId &&
        record.staffId === employeeId &&
        record.timestamp >= todayStart && 
        record.timestamp <= todayEnd
      ).sort((a, b) => a.timestamp - b.timestamp);
      
      const hasCheckIn = todayRecords.find(record => record.type === 'in');
      const hasCheckOut = todayRecords.find(record => record.type === 'out');
      
      // Can check out only if checked in but not checked out today
      return hasCheckIn && !hasCheckOut;
    } catch (error) {
      console.error('Error checking if user can check out:', error);
      return false;
    }
  }
}

// Factory function to create attendance service
export const createAttendanceService = (restaurantId: string): AttendanceService => {
  return new FirebaseAttendanceService(restaurantId);
};





