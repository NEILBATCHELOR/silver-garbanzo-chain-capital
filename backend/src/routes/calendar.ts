/**
 * Redemption Calendar API Routes
 * Provides RSS and iCal subscription endpoints for redemption events
 * Date: August 25, 2025
 */

import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { RedemptionCalendarService } from '../services/calendar/RedemptionCalendarService';
import { logError } from '../utils/loggerAdapter';

// Route schemas
const CalendarQuerySchema = Type.Object({
  project: Type.Optional(Type.String({ format: 'uuid' })),
  organization: Type.Optional(Type.String({ format: 'uuid' })),
  format: Type.Optional(Type.Union([Type.Literal('ical'), Type.Literal('rss')])),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  days: Type.Optional(Type.Number({ minimum: 1, maximum: 365 }))
});

const CalendarExportQuerySchema = Type.Object({
  project: Type.Optional(Type.String({ format: 'uuid' })),
  organization: Type.Optional(Type.String({ format: 'uuid' })),
  eventTypes: Type.Optional(Type.Array(Type.String())),
  startDate: Type.Optional(Type.String({ format: 'date' })),
  endDate: Type.Optional(Type.String({ format: 'date' }))
});

/**
 * Redemption Calendar Routes Plugin
 */
const calendarRoutes: FastifyPluginAsync = async (fastify) => {
  const calendarService = new RedemptionCalendarService();

  // RSS Feed Endpoint
  fastify.get('/calendar/redemption/rss', {
    schema: {
      description: 'Get RSS feed of upcoming redemption events',
      tags: ['calendar'],
      querystring: CalendarQuerySchema,
      response: {
        200: {
          type: 'string',
          description: 'RSS XML feed'
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { project, organization, limit, days } = request.query as any;

      const rssContent = await calendarService.generateRSSFeed(
        project,
        organization,
        { limit, daysLookAhead: days }
      );

      reply
        .header('Content-Type', 'application/rss+xml; charset=utf-8')
        .header('Cache-Control', 'public, max-age=300') // 5 minute cache
        .send(rssContent);

    } catch (error) {
      logError(fastify.log, 'Error generating RSS feed:', error);
      reply.code(500).send({ 
        error: 'Internal Server Error', 
        message: 'Failed to generate RSS feed' 
      });
    }
  });

  // iCal Subscription Endpoint
  fastify.get('/calendar/redemption/ical', {
    schema: {
      description: 'Get iCal subscription feed of redemption events',
      tags: ['calendar'],
      querystring: CalendarQuerySchema,
      response: {
        200: {
          type: 'string',
          description: 'iCal calendar data'
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { project, organization } = request.query as any;

      const events = await calendarService.getRedemptionEvents(project, organization);
      const icalContent = await calendarService.exportToICalendar(events);

      reply
        .header('Content-Type', 'text/calendar; charset=utf-8')
        .header('Content-Disposition', 'attachment; filename="redemption-calendar.ics"')
        .header('Cache-Control', 'public, max-age=300') // 5 minute cache
        .send(icalContent);

    } catch (error) {
      logError(fastify.log, 'Error generating iCal feed:', error);
      reply.code(500).send({ 
        error: 'Internal Server Error', 
        message: 'Failed to generate iCal feed' 
      });
    }
  });

  // Calendar Events API (JSON)
  fastify.get('/calendar/redemption/events', {
    schema: {
      description: 'Get redemption events as JSON',
      tags: ['calendar'],
      querystring: CalendarQuerySchema,
      response: {
        200: Type.Object({
          success: Type.Boolean(),
          data: Type.Array(Type.Object({
            id: Type.String(),
            title: Type.String(),
            description: Type.String(),
            startDate: Type.String({ format: 'date-time' }),
            endDate: Type.String({ format: 'date-time' }),
            eventType: Type.String(),
            source: Type.Union([Type.Literal('window'), Type.Literal('rule')]),
            projectId: Type.String(),
            projectName: Type.Optional(Type.String()),
            status: Type.String(),
            redemptionType: Type.Optional(Type.String()),
            metadata: Type.Object({})
          })),
          count: Type.Number()
        })
      }
    }
  }, async (request, reply) => {
    try {
      const { project, organization } = request.query as any;

      const events = await calendarService.getRedemptionEvents(project, organization);

      reply.send({
        success: true,
        data: events,
        count: events.length
      });

    } catch (error) {
      logError(fastify.log, 'Error fetching calendar events:', error);
      reply.code(500).send({ 
        success: false,
        error: 'Internal Server Error', 
        message: 'Failed to fetch calendar events' 
      });
    }
  });

  // Calendar Export Endpoint (for downloads)
  fastify.post('/calendar/redemption/export', {
    schema: {
      description: 'Export redemption calendar with specific options',
      tags: ['calendar'],
      querystring: CalendarExportQuerySchema,
      response: {
        200: {
          type: 'string',
          description: 'Calendar file content'
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { 
        project, 
        organization, 
        eventTypes, 
        startDate, 
        endDate 
      } = request.query as any;

      const events = await calendarService.getRedemptionEvents(project, organization);
      
      // Apply filters
      let filteredEvents = events;
      
      if (eventTypes && eventTypes.length > 0) {
        filteredEvents = filteredEvents.filter(event => 
          eventTypes.includes(event.eventType)
        );
      }
      
      if (startDate) {
        const start = new Date(startDate);
        filteredEvents = filteredEvents.filter(event => 
          event.startDate >= start
        );
      }
      
      if (endDate) {
        const end = new Date(endDate);
        filteredEvents = filteredEvents.filter(event => 
          event.endDate <= end
        );
      }

      const icalContent = await calendarService.exportToICalendar(filteredEvents);

      reply
        .header('Content-Type', 'text/calendar; charset=utf-8')
        .header('Content-Disposition', `attachment; filename="redemption-calendar-${project || 'all'}.ics"`)
        .send(icalContent);

    } catch (error) {
      logError(fastify.log, 'Error exporting calendar:', error);
      reply.code(500).send({ 
        error: 'Internal Server Error', 
        message: 'Failed to export calendar' 
      });
    }
  });

  // Health check endpoint
  fastify.get('/calendar/health', {
    schema: {
      description: 'Calendar service health check',
      tags: ['calendar'],
      response: {
        200: Type.Object({
          status: Type.String(),
          timestamp: Type.String(),
          service: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'redemption-calendar'
    });
  });
};

export default calendarRoutes;
