export type RoomStatus = "available" | "occupied" | "maintenance" | "unavailable";

export interface Building {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  description: string | null;
  facilities: string[];
  photo_urls: string[];
  electricity_rate: number;
  water_rate: number;
  created_at: string;
}

export interface Room {
  id: string;
  building_id: string;
  room_number: string;
  floor: number;
  size_sqm: number | null;
  has_ac: boolean;
  has_furniture: boolean;
  monthly_price: number;
  deposit_months: number;
  min_contract_months: number;
  photo_urls: string[];
  status: RoomStatus;
  created_at: string;
  buildings?: Partial<Building> | null;
}

export interface CostEstimate {
  rent: number;
  electricity_cost: number;
  water_cost: number;
  total: number;
  months_of_data: number;
}

export interface Application {
  id: string;
  room_id: string;
  tenant_id: string;
  message: string | null;
  status: "pending" | "approved" | "rejected" | "cancelled";
  applied_at: string;
  reviewed_at: string | null;
  rooms?: {
    id: string;
    room_number: string;
    floor?: number;
    buildings?: { id: string; name: string } | null;
  } | null;
  users?: { id: string; name: string; email: string; phone?: string | null } | null;
}
