import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  expertCredentials,
  expertProfiles,
  farmerProfiles,
  users,
} from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  fullName?: string,
  preferredRole?: string
) {
  try {
    const safeName =
      fullName?.trim() || email.split('@')[0] || 'AgriTrust User';
    const roleToInsert =
      preferredRole === 'expert' || preferredRole === 'farmer'
        ? preferredRole
        : 'farmer';

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.uid, uid))
      .limit(1);

    if (existing.length > 0) {
      const updated = await db
        .update(users)
        .set({ email, updatedAt: new Date() })
        .where(eq(users.uid, uid))
        .returning();
      return updated[0];
    }

    // Check if user exists with same email (e.g., seeded/local account)
    const byEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (byEmail.length > 0) {
      const updated = await db
        .update(users)
        .set({ uid, updatedAt: new Date() })
        .where(eq(users.id, byEmail[0].id))
        .returning();
      return updated[0];
    }

    const inserted = await db
      .insert(users)
      .values({
        uid,
        email,
        fullName: safeName,
        role: roleToInsert,
        preferredLanguage: 'en',
        isActive: true,
        isDemo: false,
        consentAccepted: true,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          updatedAt: new Date(),
        },
      })
      .returning();

    const user = inserted[0];

    if (user.role === 'farmer') {
      await db
        .insert(farmerProfiles)
        .values({
          userId: user.id,
          state: 'Karnataka',
        })
        .onConflictDoNothing();
    } else if (user.role === 'expert') {
      await db
        .insert(expertProfiles)
        .values({
          userId: user.id,
          specialization: 'General Agronomy',
          yearsExperience: 0,
          verificationStatus: 'pending',
        })
        .onConflictDoNothing();
    }

    return user;
  } catch (error) {
    console.error('Database error in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function getUserFullRecord(userId: number) {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) return null;

    const [farmerProfile] = await db
      .select()
      .from(farmerProfiles)
      .where(eq(farmerProfiles.userId, user.id))
      .limit(1);

    const [expertProfile] = await db
      .select()
      .from(expertProfiles)
      .where(eq(expertProfiles.userId, user.id))
      .limit(1);

    let credentials: (typeof expertCredentials.$inferSelect)[] = [];
    if (expertProfile) {
      credentials = await db
        .select()
        .from(expertCredentials)
        .where(eq(expertCredentials.expertProfileId, expertProfile.id));
    }

    const { passwordHash: _ph, ...safeUser } = user;
    return {
      ...safeUser,
      farmerProfile: farmerProfile ?? null,
      expertProfile: expertProfile
        ? { ...expertProfile, credentials }
        : null,
    };
  } catch (error) {
    console.error('Database error in getUserFullRecord:', error);
    throw new Error('Failed to load user profile.', { cause: error });
  }
}
