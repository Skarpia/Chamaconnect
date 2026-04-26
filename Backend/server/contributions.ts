import { Router } from 'express';
import { CacheService } from '../services/cache';
import { DatabaseService } from '../services/database';
import { validateRequest, rateLimiter } from '../middleware';
import Joi from 'joi';

const router = Router();

// Contribution list schema
const contributionsListSchema = Joi.object({
  chamaId: Joi.string().uuid().required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  memberId: Joi.string().uuid().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
});

// Get contributions list with pagination and caching
router.get('/list', 
  rateLimiter(20),
  validateRequest(contributionsListSchema),
  async (req, res, next) => {
    try {
      const { chamaId, page, limit, memberId, dateFrom, dateTo } = req.body;
      
      const cacheKey = `contributions:list:${chamaId}:${page}:${limit}:${memberId || ''}:${dateFrom || ''}:${dateTo || ''}`;
      
      // Try cache first
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true,
        });
      }

      let query = `
        SELECT c.*, m.name as member_name, m.email as member_email
        FROM contributions c
        JOIN members m ON c.member_id = m.id
        WHERE c.chama_id = $1 AND c.status = 'completed'
      `;
      const params = [chamaId];

      if (memberId) {
        query += ` AND c.member_id = $${params.length + 1}`;
        params.push(memberId);
      }

      if (dateFrom) {
        query += ` AND c.created_at >= $${params.length + 1}`;
        params.push(dateFrom);
      }

      if (dateTo) {
        query += ` AND c.created_at <= $${params.length + 1}`;
        params.push(dateTo);
      }

      query += ` ORDER BY c.created_at DESC`;

      // Get paginated results
      const result = await DatabaseService.paginate(query, params, page, limit);
      
      // Cache for 5 minutes
      await CacheService.set(cacheKey, result, 300);

      res.json({
        success: true,
        data: result,
        cached: false,
      });

    } catch (error) {
      next(error);
    }
  }
);

// Get contribution statistics
router.get('/stats/:chamaId', 
  rateLimiter(30),
  async (req, res, next) => {
    try {
      const { chamaId } = req.params;
      
      const cacheKey = `contributions:stats:${chamaId}`;
      const cached = await CacheService.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true,
        });
      }

      const stats = await DatabaseService.findOne(`
        SELECT 
          COUNT(*) as total_contributions,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(AVG(amount), 0) as average_amount,
          COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as recent_contributions,
          COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN amount END), 0) as recent_amount,
          MAX(created_at) as last_contribution_date
        FROM contributions 
        WHERE chama_id = $1 AND status = 'completed'
      `, [chamaId]);

      await CacheService.set(cacheKey, stats, 600); // 10 minutes

      res.json({
        success: true,
        data: stats,
        cached: false,
      });

    } catch (error) {
      next(error);
    }
  }
);

export default (cacheService: CacheService, dbService: DatabaseService) => {
  // Inject services
  return router;
};
