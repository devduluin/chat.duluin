import axios from "axios";

const EMPLOYEE_API_URL =
  process.env.NEXT_PUBLIC_EMPLOYEE_API_URL ||
  "https://apidev-hrms.duluin.com/api/v1/employees";

export interface EmployeeContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  position?: string;
  department?: string;
  [key: string]: any;
}

export interface EmployeeContactsResponse {
  success: boolean;
  message: string;
  data: {
    data: EmployeeContact[];
    meta?: {
      current_page: number;
      total: number;
      per_page: number;
      last_page: number;
    };
  };
}

export async function getEmployeeContacts(params: {
  company_id: string;
  token: string;
  page?: number;
  limit?: number;
  search?: string | null;
}): Promise<EmployeeContactsResponse | null> {
  try {
    const response = await axios.get(`${EMPLOYEE_API_URL}/employee/contacts`, {
      params: {
        company_id: params.company_id,
        page: params.page || 1,
        limit: params.limit || 100,
        search: params.search || null,
      },
      headers: {
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json",
        "X-Forwarded-Host": "https://duluin.hrms.duluin.com",
        "X-Account-Type": "hris_employee",
      },
    });
    return response.data;
  } catch (error: any) {
    console.error("Failed to fetch employee contacts:", error);
    return error?.response?.data;
  }
}
