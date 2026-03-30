import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PagedResult } from '../../../core/models/auth.models';
import { Ticket ,TicketSearch,TicketGroup,UpdateTicketRequest,AssignTicketRequest,TicketMessageDto,
TicketMessageRequest,CategoryDto,SearchCategory} from '@/app/core/models/helpdesk.models';


@Injectable({
  providedIn: 'root'
})
export class HelpDeskService {

  private readonly apiUrl = `${environment.apiUrl}/HelpDesk`;
  private readonly uploadsUrl = `${environment.apiUrl}/uploads`;

  constructor(private http: HttpClient) {}

    // ✅ Get Tickets with Search
  getAllTickets(search: TicketSearch): Observable<Ticket[]> {

    let params = new HttpParams();

    if (search.searchTerm) {
      params = params.set('SearchTerm', search.searchTerm);
    }

    if (search.departmentId) {
      params = params.set('DepartmentId', search.departmentId);
    }

    if (search.status) {
      params = params.set('Status', search.status);
    }

    if (search.page) {
      params = params.set('Page', search.page);
    }

    if (search.pageSize) {
      params = params.set('PageSize', search.pageSize);
    }

    if (search.sortBy) {
      params = params.set('SortBy', search.sortBy);
    }

    if (search.sortOrder) {
      params = params.set('SortOrder', search.sortOrder);
    }

    return this.http
      .get<ApiResponse<Ticket[]>>(`${this.apiUrl}/get-allTicket`, { params })
      .pipe(map(res => res.data || []));
  }

  createTicket(ticket: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/create-ticket`, ticket);
}



  /** Upload file through uploads API; returns the hosted URL. */
  uploadattachments(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>(`${this.uploadsUrl}/files`, formData).pipe(
      map((res) => {
        if (!res?.url) {
          throw new Error('Upload failed');
        }
        return res.url;
      })
    );
  }

  // Create a group
  createGroup(request: { groupTitle: string; departmentId?: string; employeeIds: string[] }): Observable<any> {
    return this.http.post(`${this.apiUrl}/create-group`, request);
  }
  
// ✅ Get All Groups
 // ✅ Get All Groups
  getAllGroups(search?: string, categoryId?: string): Observable<TicketGroup[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (categoryId) params = params.set('categoryId', categoryId);

    return this.http.get<TicketGroup[]>(`${this.apiUrl}/get-all-groups`, { params });
  }

  getAssignedTickets(search: TicketSearch) {
  let params = new HttpParams();

  if (search.searchTerm) params = params.set('searchTerm', search.searchTerm);
  if (search.departmentId) params = params.set('departmentId', search.departmentId);
  if (search.status) params = params.set('status', search.status);
  if (search.page) params = params.set('page', search.page);
  if (search.pageSize) params = params.set('pageSize', search.pageSize);
  if (search.sortOrder) params = params.set('sortOrder', search.sortOrder);

  return this.http.get<any>(`${this.apiUrl}/get-AssignedTickets`, { params });
}

getTicketById(ticketId: string): Observable<Ticket> {
  return this.http.get<any>(`${this.apiUrl}/get-ticket/${ticketId}`).pipe(
    map(res => res.data)  // Extract the ticket from `data`
  );}

  updateTicket(request: UpdateTicketRequest): Observable<any> {
  return this.http.put<any>(`${this.apiUrl}/update-ticket`, request).pipe(
    map(res => res) // you can also return res.data if needed
  );
}

 assignTicket(request: AssignTicketRequest): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/assign-ticket`, request).pipe(
    map(res => res) // returns the full response; you can change to res.data if needed
  );
}

//Create Message
createMessage(request: TicketMessageRequest): Observable<TicketMessageDto> {
  return this.http.post<ApiResponse<TicketMessageDto>>(
    `${this.apiUrl}/create-message`,
    request
  ).pipe(
    map(res => {
      if (!res.data) throw new Error('Message not created');
      return res.data;
    })
  );
}

// ✅ Get Messages by TicketId
getMessagesByTicket(ticketId: string): Observable<TicketMessageDto[]> {
  return this.http.get<ApiResponse<TicketMessageDto[]>>(
    `${this.apiUrl}/my-messages?ticketId=${ticketId}`
  ).pipe(
    map(res => res.data?? []) // ✅ extract list
  );
}
createCategory(request: CategoryDto): Observable<boolean> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/create-category`, request)
      .pipe(
        map(res => res.data ?? false)
      );
  }

  getCategories(search?: SearchCategory): Observable<CategoryDto[]> {
    const params: any = {
      page: search?.page ?? 1,
      pageSize: search?.pageSize ?? 50
    };
    if (search?.departmentId) params.departmentId = search.departmentId;
    if (search?.searchTerm)  params.searchTerm  = search.searchTerm;

    return this.http.get<ApiResponse<CategoryDto[]>>(`${this.apiUrl}/get-categories`, { params })
      .pipe(map(res => res.data ?? []));
  }




}