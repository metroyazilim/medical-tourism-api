import { FastifyRequest } from 'fastify';
import { Actor, ActorType } from '../messaging/messaging.types';
import { problem } from './http';

const actorTypes: ActorType[] = ['PATIENT', 'CLINICIAN', 'SUPER_ADMIN', 'SYSTEM_WORKER'];

export function actorFromRequest(request: FastifyRequest): Actor {
  const id = request.headers['x-actor-id'];
  const type = request.headers['x-actor-type'];
  const organizationId = request.headers['x-organization-id'];
  const role = request.headers['x-actor-role'];

  if (typeof id !== 'string' || typeof type !== 'string' || !actorTypes.includes(type as ActorType)) {
    throw problem(401, 'UNAUTHENTICATED', 'x-actor-id and a valid x-actor-type are required');
  }

  return {
    id,
    type: type as ActorType,
    organizationId: typeof organizationId === 'string' ? organizationId : undefined,
    role: typeof role === 'string' ? role : undefined,
  };
}

export function requireAdmin(actor: Actor): void {
  if (actor.type !== 'SUPER_ADMIN') {
    throw problem(403, 'FORBIDDEN', 'Super admin access is required');
  }
}
