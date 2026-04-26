import { Router } from 'express';
import { CacheService } from '../services/cache';
import { DatabaseService } from '../services/database';
import { validateRequest, rateLimiter } from '../middleware';
import Joi from 'joi';

const router = Router();

// Dashboard summary schema validation
const dashboardSummarySchema = Joi.object({
  chamaId: Joi.string().uuid().required(),
  dateRange: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
  includeMetrics: Joi.boolean().default(true),
  includeActivity: Joi.boolean().default(true),
});

// Aggregated dashboard summary endpoint
router.get('/summary', 
  rateLimiter(10),
  validateRequest(dashboardSummarySchema),
  async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      const { chamaId, dateRange, includeMetrics, includeActivity } = req.query;
      
      // Generate cache key
      const cacheKey = `dashboard:summary:${chamaId}:${dateRange}:${includeMetrics}:${includeActivity}`;
      
      // Initialize services
      const cacheService = new CacheService();
      const dbService = new DatabaseService();
      
      // Try to get from cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({
          ...cached,
          cached: true,
          performance: {
            responseTime: Date.now() - startTime,
            source: 'cache'
          }
        });
      }

      // If not in cache, fetch from database with optimized queries
      const [
        memberStats,
        contributionStats,
        loanStats,
        recentActivity
      ] = await Promise.all([
        // Get member statistics
        dbService.query(`
          SELECT 
            COUNT(*) as total_members,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_members,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${dateRange}' THEN 1 END) as new_members
          FROM members 
          WHERE chama_id = $1
        `, [chamaId]),
        
        // Get contribution statistics
        dbService.query(`
          SELECT 
            COUNT(*) as total_contributions,
            COALESCE(SUM(amount), 0) as total_amount,
            COALESCE(AVG(amount), 0) as average_amount,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${dateRange}' THEN 1 END) as recent_contributions
          FROM contributions 
          WHERE chama_id = $1 AND status = 'completed'
        `, [chamaId]),
        
        // Get loan statistics
        dbService.query(`
          SELECT 
            COUNT(*) as total_loans,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_loans,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as active_loans,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_loans,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount END), 0) as pending_amount,
            COALESCE(SUM(CASE WHEN status = 'approved' THEN amount END), 0) as active_amount
          FROM loans 
          WHERE chama_id = $1
        `, [chamaId]),
        
        // Get recent activity
        includeActivity ? dbService.query(`
          SELECT 
            'contribution' as type,
            amount,
            created_at,
            member_id
          FROM contributions 
          WHERE chama_id = $1 AND status = 'completed'
          UNION ALL
          SELECT 
            'loan' as type,
            amount,
            created_at,
            member_id
          FROM loans 
          WHERE chama_id = $1
          ORDER BY created_at DESC
          LIMIT 10
        `, [chamaId]) : Promise.resolve({ rows: [] })
      ]);

      // Format the response
      const response = {
        success: true,
        data: {
          members: memberStats.rows[0],
          contributions: contributionStats.rows[0],
          loans: loanStats.rows[0],
          recentActivity: recentActivity.rows
        },
        performance: {
          responseTime: Date.now() - startTime,
          source: 'database'
        }
      };

      // Cache the result for 5 minutes
      await cacheService.set(cacheKey, response, 300);

      res.json(response);

    } catch (error) {
      console.error('Dashboard API error:', error);
      next(error);
    }
  }
);

// Real-time metrics endpoint
router.get('/metrics/:chamaId', 
  rateLimiter(30),
  async (req, res, next) => {
    try {
      const { chamaId } = req.params;
      
      // Initialize services
      const cacheService = new CacheService();
      const dbService = new DatabaseService();
      
      const cacheKey = `dashboard:metrics:${chamaId}:realtime`;
      
      // Try cache first (shorter TTL for real-time data)
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true,
          realtime: false
        });
      }

      // Get real-time metrics
      const metrics = await dbService.query(`
        SELECT 
          (SELECT COUNT(*) FROM members WHERE chama_id = $1 AND status = 'active') as active_members,
          (SELECT COALESCE(SUM(amount), 0) FROM contributions WHERE chama_id = $1 AND status = 'completed' AND created_at >= CURRENT_DATE) as today_contributions,
          (SELECT COUNT(*) FROM loans WHERE chama_id = $1 AND status = 'pending') as pending_loans,
          (SELECT COUNT(*) FROM contributions WHERE chama_id = $1 AND created_at >= CURRENT_DATE) as today_activity
      `, [chamaId]);

      const result = metrics.rows[0];
      
      // Cache for 30 seconds
      await cacheService.set(cacheKey, result, 30);

      res.json({
        success: true,
        data: result,
        cached: false,
        realtime: true
      });

    } catch (error) {
      console.error('Metrics API error:', error);
      next(error);
    }
  }
);

export default router;
