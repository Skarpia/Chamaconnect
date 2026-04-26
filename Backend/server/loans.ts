import { Router } from 'express';
import { CacheService } from '../services/cache';
import { DatabaseService } from '../services/database';
import { validateRequest, rateLimiter } from '../middleware';
import Joi from 'joi';

const router = Router();

// Loan list schema
const loansListSchema = Joi.object({
  chamaId: Joi.string().uuid().required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'approved', 'completed', 'all').default('all'),
  memberId: Joi.string().uuid().optional(),
});

// Get loans list with pagination and caching
router.get('/list', 
  rateLimiter(20),
  validateRequest(loansListSchema),
  async (req, res, next) => {
    try {
      const { chamaId, page, limit, status, memberId } = req.body;
      
      const cacheKey = `loans:list:${chamaId}:${page}:${limit}:${status}:${memberId || ''}`;
      
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
        SELECT l.*, m.name as member_name, m.email as member_email
        FROM loans l
        JOIN members m ON l.member_id = m.id
        WHERE l.chama_id = $1
      `;
      const params = [chamaId];

      if (status !== 'all') {
        query += ` AND l.status = $${params.length + 1}`;
        params.push(status);
      }

      if (memberId) {
        query += ` AND l.member_id = $${params.length + 1}`;
        params.push(memberId);
      }

      query += ` ORDER BY l.created_at DESC`;

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

// Get loan statistics
router.get('/stats/:chamaId', 
  rateLimiter(30),
  async (req, res, next) => {
    try {
      const { chamaId } = req.params;
      
      const cacheKey = `loans:stats:${chamaId}`;
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
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_loans,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as active_loans,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_loans,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN amount END), 0) as active_amount,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as completed_amount,
          COALESCE(SUM(amount), 0) as total_loan_amount,
          COUNT(CASE WHEN due_date < CURRENT_DATE AND status != 'completed' THEN 1 END) as overdue_loans
        FROM loans 
        WHERE chama_id = $1
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
