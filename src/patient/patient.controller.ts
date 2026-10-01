import { Body, Controller, Get, Inject, Patch, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { actorFromRequest } from '../common/actor';
import { parse } from '../common/http';
import { PatientService } from './patient.service';

const profile = z.record(z.string().min(1), z.string().max(500));
const preferences = z.object({ locale: z.string().regex(/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{2,8})*$/u).max(35).optional(), currency: z.string().regex(/^[A-Z]{3}$/u).optional(), contact: z.record(z.enum(['IN_APP', 'EMAIL', 'PUSH'])).optional() });

@Controller('api/v1/patient')
export class PatientController {
  constructor(@Inject(PatientService) private readonly service: PatientService) {}
  @Get('profile') profile(@Req() request: FastifyRequest) { return this.service.profile(actorFromRequest(request)); }
  @Patch('profile') updateProfile(@Req() request: FastifyRequest, @Body() body: unknown) { return this.service.updateProfile(actorFromRequest(request), parse(profile, body)); }
  @Get('preferences') preferences(@Req() request: FastifyRequest) { return this.service.preferences(actorFromRequest(request)); }
  @Patch('preferences') updatePreferences(@Req() request: FastifyRequest, @Body() body: unknown) { return this.service.updatePreferences(actorFromRequest(request), parse(preferences, body)); }
}
