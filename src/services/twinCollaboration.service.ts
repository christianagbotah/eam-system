// ============================================================================
// TWIN COLLABORATION — Multi-user collaboration for digital twins
// ============================================================================

import { createLogger } from '@/lib/logger';

const logger = createLogger('twinCollaboration');

export interface CollaborationSession {
  id: string;
  twinId: string;
  name: string;
  createdBy: string;
  createdAt: string;
  participants: CollaborationParticipant[];
  status: 'active' | 'ended';
  sharedAnnotations: SharedAnnotation[];
}

export interface CollaborationParticipant {
  userId: string;
  fullName: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
  lastActive: string;
  color: string; // avatar color
  cursor?: { x: number; y: number; z: number };
  camera?: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } };
}

export interface SharedAnnotation {
  id: string;
  sessionId: string;
  userId: string;
  type: 'pin' | 'measurement' | 'area' | 'note' | 'highlight';
  position: { x: number; y: number; z: number };
  content?: string;
  color: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const PARTICIPANT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
];

// In-memory session store (in production: Redis)
const sessions = new Map<string, CollaborationSession>();

export class TwinCollaborationService {
  /**
   * Create a collaboration session
   */
  static async createSession(twinId: string, name: string, userId: string, userName: string): Promise<CollaborationSession> {
    const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    const session: CollaborationSession = {
      id,
      twinId,
      name,
      createdBy: userId,
      createdAt: new Date().toISOString(),
      participants: [{
        userId,
        fullName: userName,
        role: 'owner',
        joinedAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        color: PARTICIPANT_COLORS[0],
      }],
      status: 'active',
      sharedAnnotations: [],
    };

    sessions.set(id, session);
    logger.info('Collaboration session created', { sessionId: id, twinId });
    return session;
  }

  /**
   * Join a collaboration session
   */
  static async joinSession(sessionId: string, userId: string, userName: string): Promise<CollaborationSession | null> {
    const session = sessions.get(sessionId);
    if (!session || session.status !== 'active') return null;

    // Check if already a participant
    const existing = session.participants.find(p => p.userId === userId);
    if (existing) {
      existing.lastActive = new Date().toISOString();
      return session;
    }

    const colorIndex = session.participants.length % PARTICIPANT_COLORS.length;
    session.participants.push({
      userId,
      fullName: userName,
      role: 'editor',
      joinedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      color: PARTICIPANT_COLORS[colorIndex],
    });

    logger.info('User joined collaboration session', { sessionId, userId });
    return session;
  }

  /**
   * Leave a collaboration session
   */
  static async leaveSession(sessionId: string, userId: string): Promise<boolean> {
    const session = sessions.get(sessionId);
    if (!session) return false;

    session.participants = session.participants.filter(p => p.userId !== userId);
    if (session.participants.length === 0) {
      session.status = 'ended';
    }

    logger.info('User left collaboration session', { sessionId, userId });
    return true;
  }

  /**
   * Update participant cursor position
   */
  static async updateCursor(sessionId: string, userId: string, cursor: { x: number; y: number; z: number }, camera?: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } }): Promise<boolean> {
    const session = sessions.get(sessionId);
    if (!session) return false;

    const participant = session.participants.find(p => p.userId === userId);
    if (!participant) return false;

    participant.cursor = cursor;
    participant.camera = camera;
    participant.lastActive = new Date().toISOString();
    return true;
  }

  /**
   * Add a shared annotation
   */
  static async addAnnotation(sessionId: string, userId: string, annotation: Omit<SharedAnnotation, 'id' | 'sessionId' | 'userId' | 'createdAt' | 'color'>): Promise<SharedAnnotation> {
    const session = sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const participant = session.participants.find(p => p.userId === userId);
    if (!participant) throw new Error('Not a participant');

    const newAnnotation: SharedAnnotation = {
      ...annotation,
      id: `annot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      userId,
      color: participant.color,
      createdAt: new Date().toISOString(),
    };

    session.sharedAnnotations.push(newAnnotation);
    return newAnnotation;
  }

  /**
   * Get session details
   */
  static async getSession(sessionId: string): Promise<CollaborationSession | null> {
    return sessions.get(sessionId) || null;
  }

  /**
   * List active sessions for a twin
   */
  static async listSessions(twinId: string): Promise<CollaborationSession[]> {
    return [...sessions.values()].filter(s => s.twinId === twinId && s.status === 'active');
  }

  /**
   * End a session
   */
  static async endSession(sessionId: string): Promise<boolean> {
    const session = sessions.get(sessionId);
    if (!session) return false;
    session.status = 'ended';
    return true;
  }
}
