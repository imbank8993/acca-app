// TypeScript types for ACCA application

export interface User {
    id: number;
    auth_id: string | null;
    username: string;
    password?: string; // Only for migration, not exposed to frontend
    guruId: string;
    nama: string;
    role: string; // Raw role string: "GURU,KAMAD" or "GURU|KAMAD"
    roles: string[]; // Parsed roles: ["GURU", "KAMAD"]
    divisi: string;
    pages: string; // Raw pages string
    pagesArray: string[]; // Parsed pages array
    pagesTree: PageNode[]; // Hierarchical menu structure
    aktif: boolean;
    photoUrl: string | null;
}

export interface PageNode {
    title: string;
    page: string | null; // null if it's a parent with children
    children: PageNode[];
}

export interface AuthResponse {
    ok: boolean;
    error?: string;
    user?: User;
    token?: string;
}

export interface SessionData {
    user: User;
    expiresAt: number;
}
