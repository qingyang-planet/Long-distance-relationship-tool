export type RoleLabel = 'cat' | 'dog';

export interface CoupleMember {
  userId: string;
  roleLabel: RoleLabel;
  nickname: string;
  partnerNameHint?: string;
  city: string;
  timezone: number;
  emoji: string;
  joinedAt: string;
}

export interface Meeting {
  meetingAt: string;
  place: string;
  updatedBy: string;
  updatedAt: string;
}

export interface Wish {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export interface ThinkEvent {
  id: string;
  senderId: string;
  quoteIndex: number;
  createdAt: string;
}

export interface ThinkLetter {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface CoupleData {
  coupleId: string;
  inviteCode: string;
  members: CoupleMember[];
  meeting: Meeting | null;
  wishes: Wish[];
  thinkCounts: Record<string, number>;
}
