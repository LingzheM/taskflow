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

export type MemberRole = 'owner' | ' member';

export interface Column {
    id: string;
    boardId: string;
    title: string;
    description?: string | null;
    position: string;
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
    | 'COLUMN_MOVED'
    | 'BOARD_CREATED'
    | 'MEMBER_INVITED';