import { Router } from 'express';
import { CacheService } from '../services/cache';
import { DatabaseService } from '../services/database';
import { validateRequest, rateLimiter } from '../middleware';
import Joi from 'joi';

const router = Router();

// Member list schema
const membersListSchema = Joi.object({
  chamaId: Joi.string().uuid().required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('active', 'inactive', 'all').default('all'),
  search: Joi.string().optional(),
});

// Get members list with pagination and caching
router.get('/list', 
  rateLimiter(20),
  validateRequest(membersListSchema),
  async (req, res, next) => {
    try {
      const { chamaId, page, limit, status, search } = req.body;
      
      const cacheKey = `members:list:${chamaId}:${page}:${limit}:${status}:${search || ''}`;
      
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
        SELECT id, name, email, phone, status, joined_at, last_active
        FROM members 
        WHERE chama_id = $1
      `;
      const params = [chamaId];

      if (status !== 'all') {
        query += ` AND status = $${params.length + 1}`;
        params.push(status);
      }

      if (search) {
        query += ` AND (name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY joined_at DESC`;

      // Get paginated results
      const result = await DatabaseService.paginate(query, params, page, limit);
      
      // Cache for 10 minutes
      await CacheService.set(cacheKey, result, 600);

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

// Get member details
router.get('/:id', 
  rateLimiter(30),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const cacheKey = `member:details:${id}`;
      const cached = await CacheService.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          data: cached,
          cached: true,
        });
      }

      const member = await DatabaseService.findOne(`
        SELECT m.*, 
               COUNT(c.id) as contribution_count,
               COALESCE(SUM(c.amount), 0) as total_contributions,
               COUNT(l.id) as loan_count,
               COALESCE(SUM(l.amount), 0) as total_loans
        FROM members m
        LEFT JOIN contributions c ON m.id = c.member_id AND c.status = 'completed'
        LEFT JOIN loans l ON m.id = l.member_id
        WHERE m.id = $1
        GROUP BY m.id
      `, [id]);

      if (!member) {
        return res.status(404).json({
          success: false,
          error: 'Member not found',
        });
      }

      await CacheService.set(cacheKey, member, 300); // 5 minutes

      res.json({
        success: true,
        data: member,
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
