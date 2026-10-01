import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { actorFromRequest } from '../common/actor';
import { parse } from '../common/http';
import { DirectoryService } from './directory.service';

const organization = z.object({ id: z.string().min(1).optional(), name: z.string().min(1).max(200), country: z.string().min(2).max(2), city: z.string().max(100).optional(), languages: z.array(z.string().max(35)).max(20).optional(), treatmentIds: z.array(z.string().min(1)).max(100).optional() });
const doctor = z.object({ id: z.string().min(1).optional(), name: z.string().min(1).max(200), specialties: z.array(z.string().max(100)).max(20).optional(), organizationIds: z.array(z.string().min(1)).max(20).optional() });
const treatment = z.object({ id: z.string().min(1).optional(), name: z.string().min(1).max(200), category: z.string().min(1).max(100), locales: z.array(z.string().max(35)).max(20).optional() });
const publication = z.object({ state: z.enum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'VERIFIED', 'PUBLISHED', 'SUSPENDED', 'EXPIRED']) });
const verification = z.object({ verified: z.boolean(), expiresAt: z.string().datetime().optional() });
const query = z.object({ query: z.string().max(200).optional(), country: z.string().max(2).optional(), city: z.string().max(100).optional(), language: z.string().max(35).optional(), treatmentId: z.string().optional(), specialty: z.string().max(100).optional(), organizationId: z.string().optional(), category: z.string().max(100).optional(), locale: z.string().max(35).optional(), limit: z.coerce.number().int().optional(), cursor: z.string().max(1000).optional() });

@Controller('api/v1')
export class DirectoryController {
  constructor(@Inject(DirectoryService) private readonly service: DirectoryService) {}
  @Post('admin/organizations') createOrganization(@Req() r: FastifyRequest, @Body() b: unknown) { return this.service.createOrganization(actorFromRequest(r), parse(organization, b)); }
  @Post('admin/doctors') createDoctor(@Req() r: FastifyRequest, @Body() b: unknown) { return this.service.createDoctor(actorFromRequest(r), parse(doctor, b)); }
  @Post('admin/treatments') createTreatment(@Req() r: FastifyRequest, @Body() b: unknown) { return this.service.createTreatment(actorFromRequest(r), parse(treatment, b)); }
  @Patch('admin/organizations/:id/publication') publication(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.setOrganizationPublication(actorFromRequest(r), id, parse(publication, b).state); }
  @Patch('admin/organizations/:id/verification') verification(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { const i = parse(verification, b); return this.service.setOrganizationVerification(actorFromRequest(r), id, i.verified, i.expiresAt); }
  @Patch('admin/doctors/:id/verification') doctorVerification(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.setDoctorVerification(actorFromRequest(r), id, parse(z.object({ verified: z.boolean() }), b).verified); }
  @Patch('admin/doctors/:id/publication') doctorPublication(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.setDoctorPublication(actorFromRequest(r), id, parse(publication, b).state); }
  @Patch('admin/treatments/:id/publication') treatmentPublication(@Req() r: FastifyRequest, @Param('id') id: string, @Body() b: unknown) { return this.service.setTreatmentPublication(actorFromRequest(r), id, parse(publication, b).state); }
  @Post('organizations/:organizationId/treatments/:treatmentId') linkTreatment(@Req() r: FastifyRequest, @Param('organizationId') organizationId: string, @Param('treatmentId') treatmentId: string) { return this.service.linkTreatment(actorFromRequest(r), organizationId, treatmentId); }
  @Get('discovery/organizations') organizations(@Query() q: unknown) { return this.service.publicOrganizations(parse(query, q)); }
  @Get('discovery/doctors') doctors(@Query() q: unknown) { return this.service.publicDoctors(parse(query, q)); }
  @Get('discovery/treatments') treatments(@Query() q: unknown) { return this.service.publicTreatments(parse(query, q)); }
  @Get('discovery/organizations/:id') organization(@Param('id') id: string) { return this.service.publicOrganization(id); }
  @Get('discovery/doctors/:id') doctor(@Param('id') id: string) { return this.service.publicDoctor(id); }
  @Get('discovery/treatments/:id') treatment(@Param('id') id: string) { return this.service.publicTreatment(id); }
}
