// ============================================================
// Error Codes — must be a const (not just a type) so it compiles to JS
// ============================================================

export type ErrorCode =
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'CONFLICT'
    | 'VALIDATION_ERROR'
    | 'INTERNAL_ERROR';

export const ErrorCodes = {
    UNAUTHORIZED:     'UNAUTHORIZED',
    FORBIDDEN:        'FORBIDDEN',
    NOT_FOUND:        'NOT_FOUND',
    CONFLICT:         'CONFLICT',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR:   'INTERNAL_ERROR',
} as const satisfies Record<ErrorCode, ErrorCode>;

// ============================================================
// Domain Entities
// ============================================================

export interface User {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
}

export interface Board {
    id: string;
    name: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface BoardWithDetails extends Board {
    columns: ColumnWithCards[];
    members: BoardMember[];
}

export interface BoardMember {
    userId: string;
    boardId: string;
    role: MemberRole;
    user: Pick<User, 'id' | 'email' | 'name'>;
    joinedAt: Date;
}

// Fixed: was 'owner' | ' member' (space typo before member)
export type MemberRole = 'owner' | 'member';

export interface Column {
    id: string;
    boardId: string;
    name: string;     // Fixed: was 'title', matches Prisma schema
    position: string; // Removed: 'description' doesn't exist in DB
    createdAt: Date;
    updatedAt: Date;
}

export interface ColumnWithCards extends Column {
    cards: Card[];
}

export interface Card {
    id: string;
    columnId: string;
    title: string;
    description?: string | null;
    position: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ActivityLog {
    id: string;
    boardId: string;
    userId: string;
    action: ActivityAction;
    payload: Record<string, unknown>;
    createdAt: Date;
    user: Pick<User, 'id' | 'email' | 'name'>;
}

export type ActivityAction = 
    | 'CARD_CREATED'
    | 'CARD_UPDATED'
    | 'CARD_DELETED'
    | 'CARD_MOVED'
    | 'COLUMN_CREATED'
    | 'COLUMN_UPDATED'
    | 'COLUMN_DELETED'
    | 'COLUMN_REORDERED'  // Fixed: was 'COLUMN_MOVED', matches Prisma enum
    | 'BOARD_CREATED'
    | 'MEMBER_INVITED';

// API Request / Response Types

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, string[]>;
}

// Auth
export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    user: User;
}