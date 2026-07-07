import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  where,
  orderBy,
  serverTimestamp,
  runTransaction,
  type Unsubscribe,
} from 'firebase/firestore';
import {db} from './firebase';
import type {CoupleMember, Meeting, RoleLabel, ThinkEvent, ThinkLetter, Wish} from './types';

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  }
  return code;
}

export async function getUserCoupleId(userId: string): Promise<string | null> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  return userDoc.exists() ? (userDoc.data().coupleId as string) ?? null : null;
}

export async function createCoupleSpace(
  userId: string,
  roleLabel: RoleLabel = 'cat',
): Promise<{coupleId: string; inviteCode: string}> {
  const existing = await getUserCoupleId(userId);
  if (existing) throw new Error('你已经在情侣空间中了');

  let inviteCode = generateInviteCode();
  let attempts = 0;
  while (attempts < 10) {
    const codeDoc = await getDoc(doc(db, 'inviteCodes', inviteCode));
    if (!codeDoc.exists()) break;
    inviteCode = generateInviteCode();
    attempts++;
  }

  const coupleRef = doc(collection(db, 'couples'));
  const coupleId = coupleRef.id;

  await setDoc(coupleRef, {
    inviteCode,
    memberCount: 1,
    distanceKm: '',
    createdAt: serverTimestamp(),
    createdBy: userId,
  });

  await setDoc(doc(db, 'inviteCodes', inviteCode), {coupleId});

  await setDoc(doc(db, 'couples', coupleId, 'members', userId), {
    roleLabel,
    nickname: roleLabel === 'cat' ? '我' : 'TA',
    partnerNameHint: '',
    city: '',
    timezone: 8,
    emoji: roleLabel === 'cat' ? '🐱' : '🐶',
    joinedAt: new Date().toISOString(),
  });

  await setDoc(doc(db, 'users', userId), {coupleId}, {merge: true});

  return {coupleId, inviteCode};
}

export async function joinCoupleSpace(
  userId: string,
  inviteCode: string,
  roleLabel: RoleLabel = 'dog',
): Promise<string> {
  const existing = await getUserCoupleId(userId);
  if (existing) throw new Error('你已经在情侣空间中了');

  const normalized = inviteCode.trim().toUpperCase();

  return runTransaction(db, async (transaction) => {
    const codeRef = doc(db, 'inviteCodes', normalized);
    const codeSnap = await transaction.get(codeRef);
    if (!codeSnap.exists()) throw new Error('邀请码不存在');

    const coupleId = codeSnap.data().coupleId as string;
    const coupleRef = doc(db, 'couples', coupleId);
    const coupleSnap = await transaction.get(coupleRef);
    if (!coupleSnap.exists()) throw new Error('空间不存在');

    const memberCount = (coupleSnap.data().memberCount as number) ?? 1;
    if (memberCount >= 2) throw new Error('这个空间已满（最多两人）');

    const memberRef = doc(db, 'couples', coupleId, 'members', userId);
    transaction.set(memberRef, {
      roleLabel,
      nickname: roleLabel === 'cat' ? '我' : 'TA',
      partnerNameHint: '',
      city: '',
      timezone: 0,
      emoji: roleLabel === 'cat' ? '🐱' : '🐶',
      joinedAt: new Date().toISOString(),
    });

    transaction.update(coupleRef, {memberCount: memberCount + 1});
    transaction.set(doc(db, 'users', userId), {coupleId}, {merge: true});

    return coupleId;
  });
}

export async function updateMemberProfile(
  coupleId: string,
  userId: string,
  data: Partial<
    Pick<
      CoupleMember,
      'nickname' | 'partnerNameHint' | 'city' | 'timezone' | 'emoji' | 'latitude' | 'longitude'
    >
  >,
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'members', userId), data);
}

export async function saveCoupleDistance(
  coupleId: string,
  distanceKm: string,
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId), {distanceKm});
}

export async function saveMeeting(
  coupleId: string,
  userId: string,
  meetingAt: string,
  place: string,
): Promise<void> {
  await setDoc(doc(db, 'couples', coupleId, 'meeting', 'main'), {
    meetingAt,
    place,
    updatedBy: userId,
    updatedAt: new Date().toISOString(),
  });
}

export async function addWish(coupleId: string, text: string): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'wishes'), {
    text,
    completed: false,
    createdAt: new Date().toISOString(),
  });
}

export async function toggleWish(
  coupleId: string,
  wishId: string,
  completed: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'couples', coupleId, 'wishes', wishId), {completed});
}

export async function deleteWish(coupleId: string, wishId: string): Promise<void> {
  await deleteDoc(doc(db, 'couples', coupleId, 'wishes', wishId));
}

export async function incrementThinkCount(
  coupleId: string,
  userId: string,
  quoteIndex: number,
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const countDocId = `${today}_${userId}`;
  const countRef = doc(db, 'couples', coupleId, 'dailyThink', countDocId);

  const existing = await getDoc(countRef);
  const newCount = (existing.exists() ? (existing.data().count as number) : 0) + 1;

  await setDoc(countRef, {userId, date: today, count: newCount});

  await addDoc(collection(db, 'couples', coupleId, 'thinkEvents'), {
    senderId: userId,
    quoteIndex,
    createdAt: new Date().toISOString(),
  });

  return newCount;
}

export function subscribeCoupleData(
  coupleId: string,
  onUpdate: (data: {
    members: CoupleMember[];
    meeting: Meeting | null;
    wishes: Wish[];
    thinkCounts: Record<string, number>;
    distanceKm: string;
  }) => void,
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  const state = {
    members: [] as CoupleMember[],
    meeting: null as Meeting | null,
    wishes: [] as Wish[],
    thinkCounts: {} as Record<string, number>,
    distanceKm: '',
  };

  const emit = () => onUpdate({...state});

  unsubs.push(
    onSnapshot(doc(db, 'couples', coupleId), (snap) => {
      state.distanceKm = snap.exists() ? ((snap.data().distanceKm as string) ?? '') : '';
      emit();
    }),
  );

  unsubs.push(
    onSnapshot(collection(db, 'couples', coupleId, 'members'), (snap) => {
      state.members = snap.docs.map((d) => ({
        userId: d.id,
        ...(d.data() as Omit<CoupleMember, 'userId'>),
      }));
      emit();
    }),
  );

  unsubs.push(
    onSnapshot(doc(db, 'couples', coupleId, 'meeting', 'main'), (snap) => {
      state.meeting = snap.exists() ? (snap.data() as Meeting) : null;
      emit();
    }),
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'couples', coupleId, 'wishes'), orderBy('createdAt')),
      (snap) => {
        state.wishes = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Wish, 'id'>),
        }));
        emit();
      },
    ),
  );

  const today = new Date().toISOString().split('T')[0];
  unsubs.push(
    onSnapshot(
      query(
        collection(db, 'couples', coupleId, 'dailyThink'),
        where('date', '==', today),
      ),
      (snap) => {
        state.thinkCounts = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          state.thinkCounts[data.userId as string] = data.count as number;
        });
        emit();
      },
    ),
  );

  return () => unsubs.forEach((fn) => fn());
}

export function subscribeThinkEvents(
  coupleId: string,
  currentUserId: string,
  onEvent: (event: ThinkEvent) => void,
): Unsubscribe {
  const subscribedAt = Date.now();

  return onSnapshot(
    query(
      collection(db, 'couples', coupleId, 'thinkEvents'),
      orderBy('createdAt', 'desc'),
    ),
    (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return;
        const data = change.doc.data();
        if (data.senderId === currentUserId) return;
        const createdAt = data.createdAt as string;
        if (new Date(createdAt).getTime() < subscribedAt - 2000) return;

        onEvent({
          id: change.doc.id,
          senderId: data.senderId as string,
          quoteIndex: data.quoteIndex as number,
          createdAt,
        });
      });
    },
  );
}

export function subscribeThinkLetters(
  coupleId: string,
  onUpdate: (letters: ThinkLetter[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, 'couples', coupleId, 'letters'),
      orderBy('createdAt', 'desc'),
    ),
    (snap) => {
      const letters = snap.docs.map((d) => ({
        id: d.id,
        senderId: d.data().senderId as string,
        text: (d.data().text as string) ?? '',
        createdAt: d.data().createdAt as string,
      }));
      onUpdate(letters);
    },
  );
}

export async function sendLetter(
  coupleId: string,
  senderId: string,
  text: string,
): Promise<void> {
  await addDoc(collection(db, 'couples', coupleId, 'letters'), {
    senderId,
    text: text.trim(),
    createdAt: new Date().toISOString(),
  });
}

export async function getInviteCode(coupleId: string): Promise<string | null> {
  const coupleDoc = await getDoc(doc(db, 'couples', coupleId));
  return coupleDoc.exists() ? (coupleDoc.data().inviteCode as string) : null;
}
