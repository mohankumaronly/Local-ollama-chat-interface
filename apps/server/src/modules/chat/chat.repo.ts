import { eq, desc, asc, sql } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { chats, messages, type Chat, type Message } from '../../db/schema.js';

export async function createChat(title: string): Promise<Chat> {
  const [row] = await db.insert(chats).values({ title }).returning();
  if (!row) throw new Error('Failed to create chat');
  return row;
}

export async function getChat(id: number): Promise<Chat | undefined> {
  const [row] = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
  return row;
}

export async function listChats(): Promise<Chat[]> {
  return db.select().from(chats).orderBy(desc(chats.updatedAt));
}

export async function touchChat(id: number): Promise<void> {
  await db
    .update(chats)
    .set({ updatedAt: sql`now()` })
    .where(eq(chats.id, id));
}

export async function appendMessage(
  chatId: number,
  role: 'system' | 'user' | 'assistant',
  content: string,
): Promise<Message> {
  const [row] = await db
    .insert(messages)
    .values({ chatId, role, content })
    .returning();
  if (!row) throw new Error('Failed to insert message');
  return row;
}

export async function listMessages(chatId: number): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt), asc(messages.id));
}
