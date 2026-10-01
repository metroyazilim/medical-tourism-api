import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { actorFromRequest } from '../common/actor';
import { parse } from '../common/http';
import { IdentityService } from './identity.service';

const session = z.object({ provider: z.enum(['firebase-google', 'firebase-apple', 'firebase-email-password']).default('firebase-email-password') });
const consent = z.object({ version: z.string().min(1).max(100), locale: z.string().max(35).optional() });
const membership = z.object({ actorId: z.string().min(1), organizationId: z.string().min(1), role: z.enum(['OWNER', 'ADMIN', 'EDITOR', 'VIEWER']) });
const id = z.object({ id: z.string().min(1) });

@Controller('api/v1')
export class IdentityController {
  constructor(@Inject(IdentityService) private readonly service: IdentityService) {}
  @Get('me') me(@Req() request: FastifyRequest) { return this.service.me(actorFromRequest(request)); }
  @Post('auth/sessions') createSession(@Req() request: FastifyRequest, @Body() body: unknown) { return this.service.createSession(actorFromRequest(request), parse(session, body).provider); }
  @Get('auth/sessions') listSessions(@Req() request: FastifyRequest) { return this.service.listSessions(actorFromRequest(request)); }
  @Post('sessions/:id/revoke') revokeSession(@Req() request: FastifyRequest, @Param() params: unknown) { return this.service.revokeSession(actorFromRequest(request), parse(id, params).id); }
  @Post('consent') setConsent(@Req() request: FastifyRequest, @Body() body: unknown) { const input = parse(consent, body); return this.service.setConsent(actorFromRequest(request), input.version, input.locale); }
  @Post('consent/withdraw') withdrawConsent(@Req() request: FastifyRequest) { return this.service.withdrawConsent(actorFromRequest(request)); }
  @Post('admin/memberships') createMembership(@Req() request: FastifyRequest, @Body() body: unknown) { const input = parse(membership, body); return this.service.createMembership(actorFromRequest(request), input.actorId, input.organizationId, input.role); }
  @Post('memberships/:id/accept') acceptMembership(@Req() request: FastifyRequest, @Param() params: unknown) { return this.service.acceptMembership(actorFromRequest(request), parse(id, params).id); }
  @Post('admin/memberships/:id/revoke') revokeMembership(@Req() request: FastifyRequest, @Param() params: unknown) { return this.service.revokeMembership(actorFromRequest(request), parse(id, params).id); }
  @Post('account/deletion') requestDeletion(@Req() request: FastifyRequest) { return this.service.requestDeletion(actorFromRequest(request)); }
  @Post('account/deletion/cancel') cancelDeletion(@Req() request: FastifyRequest) { return this.service.cancelDeletion(actorFromRequest(request)); }
}
