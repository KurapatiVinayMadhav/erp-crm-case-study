export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  businessName: string;
  gstNumber: string | null;
  type: "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
  address: string | null;
  status: "LEAD" | "ACTIVE" | "INACTIVE";
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { challans: number };
  followUps?: FollowUp[];
}

export interface FollowUp {
  id: string;
  note: string;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStock: number;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  quantityChanged: number;
  type: "IN" | "OUT";
  reason: string;
  createdAt: string;
  product: { id: string; name: string; sku: string };
  createdBy: { id: string; name: string; role: string };
}

export interface Challan {
  id: string;
  challanNumber: string;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  customer: { id: string; name: string; businessName: string; mobile: string; address: string | null; gstNumber: string | null };
  createdBy: { id: string; name: string };
  items?: ChallanItem[];
}

export interface ChallanItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

export interface DashboardSummary {
  customers: { total: number; byStatus: Record<string, number> };
  products: { total: number; byCategory: { category: string; count: number }[] };
  challans: { total: number; byStatus: Record<string, number> };
  lowStock: { id: string; name: string; sku: string; category: string; currentStock: number; minStock: number }[];
  recentChallans: Challan[];
  recentMovements: StockMovement[];
}