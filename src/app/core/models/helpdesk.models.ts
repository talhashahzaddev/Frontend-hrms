export interface Ticket {
  ticketid: string;
  departmentId: string;
  departmentName: string;       // Added department name
  ticketTitle: string;
  ticketType: string;
  category: string;
  groupName: string;
 groupEmployeeNames: string[]; // Added group employee names for display
  groupId:string;
  assignedEmployees: string[];  // IDs
  assignedEmployeeNames: string[]; // Added names
  priority: string;
  createdat: string;
  description: string;
  attachment: string;
  status: string;
  createdByName?: string;       // Added creator name
}

export interface UpdateTicketRequest {
  ticketId: string;
  departmentId: string;
  ticketTitle: string;
  ticketType?: string;
  category?: string;
  groupId?: string | null;
  assignedEmployees: string[];
  priority?: string;
  description: string;
  attachment?: string;
  status?: string;
}

export interface AssignTicketRequest {
  ticketId: string;          // Ticket ID (required)
  groupId?: string | null;   // Optional: Group ID
  assignedEmployees?: string[]; // Optional: Employee IDs
  reason?: string | null;    // Optional reason
}

export interface TicketSearch {
  searchTerm?: string;
  departmentId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: string;
}
export interface TicketGroup {
  groupId: string;
  groupTitle: string;
  employeeIds: string[];
  departmentId?: string | null;
  departmentName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  createdAt: string; // or Date if you convert
  employeeNames?: string[]; // now an array of employee full names
}

export interface TicketMessageRequest {
  ticketId: string;
  senderId?: string; // optional (backend handles it)
  message: string;
  messageType: string; // 'chat' | 'email' | 'system'
  subject?: string;
  recipientIds?: string[];
}

export interface TicketMessageDto {
  messageId: string;
  ticketId: string;
  senderId: string;
  message: string;
  messageType: string;
  subject?: string;
  createdAt: string;
  recipientIds?: string[];
  senderFullName?: string; // Added sender's full name for display
  senderEmail?: string;    // Added sender's email for display
}

export interface CategoryDto {
  departmentId: string;
  name: string;
  status: boolean;
}
export interface CategoryDto {
  categoryId: string;
  organizationId: string;
  departmentId: string;
  departmentName: string;
  categoryName: string;
  status: boolean;
  createdAt: string; // ISO date string
}
export interface SearchCategory {
  departmentId?: string;  // optional, filter by department
  searchTerm?: string;    // optional, search by category name
  page?: number;          // optional, default 1
  pageSize?: number;      // optional, default 50
}