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

// Store services in module scope for route handlers
let cacheService: CacheService;
let dbService: DatabaseService;

// Aggregated dashboard summary endpoint
// This replaces multiple API calls with a single efficient query
router.get('/summary', 
  rateLimiter(10), // Stricter rate limiting for dashboard
  async (req, res, next) => {
    const startTime = Date.now();
    
    try {
      const { chamaId, dateRange = '30d', includeMetrics = 'true', includeActivity = 'true' } = req.query;
      
      // Validate required parameter
      if (!chamaId) {
        return res.status(400).json({
          success: false,
          error: 'chamaId is required'
        });
      }
      
      // Generate cache key
      const cacheKey = `dashboard:summary:${chamaId}:${dateRange}:${includeMetrics}:${includeActivity}`;
      
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
            COALESCE(SUM(amount), 0) as total_contributions,
            COALESCE(SUM(CASE WHEN created_at >= NOW() - INTERVAL '${dateRange}' THEN amount END), 0) as recent_contributions,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${dateRange}' THEN 1 END) as contribution_count
          FROM contributions 
          WHERE chama_id = $1 AND status = 'completed'
        `, [chamaId]),
        
        // Get loan statistics
        dbService.query(`
          SELECT 
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_loans,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as active_loans,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_loans,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount END), 0) as pending_loan_amount,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN amount END), 0) as total_loan_amount
          FROM loans 
          WHERE chama_id = $1
        `, [chamaId]),
        
        // Get recent activity (limited for performance)
        includeActivity === 'true' ? dbService.query(`
          SELECT 
            id,
            type,
            amount,
            member_name,
            created_at
          FROM (
            SELECT 
              id, 'contribution' as type, amount, 
              member_name, created_at
            FROM contributions 
            WHERE chama_id = $1 AND status = 'completed'
            
            UNION ALL
            
            SELECT 
              id, 'loan' as type, amount, 
              member_name, created_at
            FROM loans 
            WHERE chama_id = $1 AND status IN ('pending', 'approved', 'completed')
            
            UNION ALL
            
            SELECT 
              id, 'repayment' as type, amount, 
              member_name, created_at
            FROM loan_repayments 
            WHERE chama_id = $1 AND status = 'completed'
          ) activities
          ORDER BY created_at DESC
          LIMIT 20
        `, [chamaId]) : Promise.resolve({ rows: [] })
      ]);

      // Calculate derived metrics
      const metrics = {
        totalMembers: parseInt(memberStats.rows[0]?.total_members || 0),
        activeMembers: parseInt(memberStats.rows[0]?.active_members || 0),
        newMembers: parseInt(memberStats.rows[0]?.new_members || 0),
        
        totalContributions: parseFloat(contributionStats.rows[0]?.total_contributions || 0),
        recentContributions: parseFloat(contributionStats.rows[0]?.recent_contributions || 0),
        contributionCount: parseInt(contributionStats.rows[0]?.contribution_count || 0),
        
        pendingLoans: parseInt(loanStats.rows[0]?.pending_loans || 0),
        activeLoans: parseInt(loanStats.rows[0]?.active_loans || 0),
        completedLoans: parseInt(loanStats.rows[0]?.completed_loans || 0),
        pendingLoanAmount: parseFloat(loanStats.rows[0]?.pending_loan_amount || 0),
        totalLoanAmount: parseFloat(loanStats.rows[0]?.total_loan_amount || 0),
        
        // Calculated metrics
        averageContribution: contributionStats.rows[0]?.contribution_count > 0 
          ? parseFloat(contributionStats.rows[0]?.recent_contributions || 0) / contributionStats.rows[0]?.contribution_count 
          : 0,
        
        memberActivityRate: memberStats.rows[0]?.total_members > 0
          ? (parseInt(memberStats.rows[0]?.active_members || 0) / parseInt(memberStats.rows[0]?.total_members || 1)) * 100
          : 0,
      };

      // Format response data
      const responseData = {
        success: true,
        data: includeMetrics === 'true' ? {
          overview: {
            totalMembers: metrics.totalMembers,
            activeMembers: metrics.activeMembers,
            totalContributions: metrics.totalContributions,
            pendingLoans: metrics.pendingLoans,
          },
          performance: {
            newMembers: metrics.newMembers,
            recentContributions: metrics.recentContributions,
            contributionCount: metrics.contributionCount,
            averageContribution: metrics.averageContribution,
          },
          loans: {
            activeLoans: metrics.activeLoans,
            completedLoans: metrics.completedLoans,
            pendingLoanAmount: metrics.pendingLoanAmount,
            totalLoanAmount: metrics.totalLoanAmount,
          },
          engagement: {
            memberActivityRate: Math.round(metrics.memberActivityRate * 10) / 10,
          }
        } : null,
        
        recentActivity: includeActivity === 'true' ? recentActivity.rows.map(activity => ({
          id: activity.id,
          type: activity.type,
          amount: parseFloat(activity.amount),
          member: activity.member_name,
          date: activity.created_at,
        })) : null,
        
        metadata: {
          chamaId,
          dateRange,
          generatedAt: new Date().toISOString(),
          metricsIncluded: includeMetrics === 'true',
          activityIncluded: includeActivity === 'true',
        }
      };

      // Cache the response for 5 minutes
      await cacheService.set(cacheKey, responseData, 300);

      res.json({
        ...responseData,
        cached: false,
        performance: {
          responseTime: Date.now() - startTime,
          source: 'database'
        }
      });

    } catch (error) {
      next(error);
    }
  }
);

// Real-time metrics endpoint (WebSocket alternative)
router.get('/metrics/realtime/:chamaId', 
  rateLimiter(30),
  async (req, res, next) => {
    try {
      const { chamaId } = req.params;
      
      // Quick real-time metrics from cache or fast query
      const cacheKey = `dashboard:realtime:${chamaId}`;
      
      // Try cache first with shorter TTL
      let metrics = await cacheService.get(cacheKey);
      
      if (!metrics) {
        // Fast query for real-time data
        const result = await dbService.query(`
          SELECT 
            (SELECT COUNT(*) FROM members WHERE chama_id = $1 AND status = 'active') as active_members,
            (SELECT COALESCE(SUM(amount), 0) FROM contributions WHERE chama_id = $1 AND created_at >= CURRENT_DATE) as today_contributions,
            (SELECT COUNT(*) FROM loans WHERE chama_id = $1 AND status = 'pending') as pending_loans,
            (SELECT COUNT(*) FROM loan_repayments WHERE chama_id = $1 AND created_at >= CURRENT_DATE) as today_repayments
        `, [chamaId]);

        metrics = {
          activeMembers: parseInt(result.rows[0]?.active_members || 0),
          todayContributions: parseFloat(result.rows[0]?.today_contributions || 0),
          pendingLoans: parseInt(result.rows[0]?.pending_loans || 0),
          todayRepayments: parseInt(result.rows[0]?.today_repayments || 0),
          timestamp: new Date().toISOString(),
        };

        // Cache for 30 seconds
        await cacheService.set(cacheKey, metrics, 30);
      }

      res.json({
        success: true,
        data: metrics,
        cached: !!metrics.timestamp,
      });

    } catch (error) {
      next(error);
    }
  }
);

// Export dashboard data (CSV/Excel)
router.get('/export/:chamaId', 
  rateLimiter(5),
  async (req, res, next) => {
    try {
      const { chamaId } = req.params;
      const { format = 'csv', dateRange = '30d' } = req.query;
      
      // This would generate and stream the export
      // For now, return a placeholder
      res.json({
        success: true,
        message: 'Export functionality would be implemented here',
        format,
        dateRange,
        chamaId,
      });

    } catch (error) {
      next(error);
    }
  }
);

export default (cache: CacheService, db: DatabaseService) => {
  // Initialize services for route handlers
  cacheService = cache;
  dbService = db;
  
  return router;
};
