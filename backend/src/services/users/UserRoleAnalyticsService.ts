import { BaseService } from '../BaseService'
import type { 
  UserServiceResult, 
  UserAnalytics, 
  UserStatistics,
  RoleStatistics,
  PermissionStatistics,
  UserTimelineData,
  UserDemographics,
  SecurityMetrics,
  DateRange
} from '../../types/user-role-service'

/**
 * User and Role Analytics Service
 * Provides analytics, statistics, and reporting for users, roles, and permissions
 */
export class UserRoleAnalyticsService extends BaseService {

  constructor() {
    super('UserRoleAnalytics')
  }

  // ============================================================================
  // USER ANALYTICS
  // ============================================================================

  /**
   * Get comprehensive user analytics
   */
  async getUserAnalytics(dateRange?: DateRange): Promise<UserServiceResult<UserAnalytics>> {
    try {
      const [overview, timeline, demographics, security] = await Promise.all([
        this.getUserStatistics(),
        this.getUserTimeline(dateRange),
        this.getUserDemographics(),
        this.getSecurityMetrics()
      ])

      if (!overview.success) {
        return this.error('Failed to get user overview', 'DATABASE_ERROR')
      }

      const analytics: UserAnalytics = {
        overview: overview.data!,
        timeline,
        demographics,
        security
      }

      return this.success(analytics)
    } catch (error) {
      this.logError('Failed to get user analytics', { error, dateRange })
      return this.error('Failed to retrieve user analytics', 'DATABASE_ERROR')
    }
  }

  /**
   * Get user statistics
   */
  async getUserStatistics(): Promise<UserServiceResult<UserStatistics>> {
    try {
      const [
        totalUsers,
        activeUsers, 
        newUsersThisMonth,
        usersByStatus,
        usersByRole,
        recentlyCreated
      ] = await Promise.all([
        this.db.public_users.count(),
        this.db.public_users.count({ where: { status: 'active' } }),
        this.getNewUsersCount(),
        this.getUsersByStatus(),
        this.getUsersByRole(),
        this.getRecentlyCreatedUsers()
      ])

      const inactiveUsers = totalUsers - activeUsers
      const growthRate = await this.calculateGrowthRate()

      const statistics: UserStatistics = {
        totalUsers,
        activeUsers,
        inactiveUsers,
        pendingUsers: 0, // Placeholder - add proper count
        blockedUsers: 0, // Placeholder - add proper count
        usersWithMFA: 0, // Placeholder - add proper count
        averageSessionTime: 0, // Placeholder - add proper count
        newUsersThisMonth,
        growthRate,
        usersByStatus,
        usersByRole,
        recentSignups: [],
        recentlyCreated: [],
        topActiveUsers: []
      }

      return this.success(statistics)
    } catch (error) {
      this.logError('Failed to get user statistics', { error })
      return this.error('Failed to retrieve user statistics', 'DATABASE_ERROR')
    }
  }

  /**
   * Get user timeline data
   */
  async getUserTimeline(dateRange?: DateRange): Promise<UserTimelineData[]> {
    try {
      const startDate = dateRange?.from ? new Date(dateRange.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const endDate = dateRange?.to ? new Date(dateRange.to) : new Date()

      // Get daily user creation counts
      const dailySignups = await this.db.public_users.groupBy({
        by: ['created_at'],
        where: {
          created_at: {
            gte: startDate,
            lte: endDate
          }
        },
        _count: { id: true }
      })

      // Transform to timeline format
      const timeline: UserTimelineData[] = []
      const currentDate = new Date(startDate)
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]
        const dayData = dailySignups.find((d: any) => 
          d.created_at && d.created_at.toISOString().split('T')[0] === dateStr
        )

        timeline.push({
          date: dateStr!,
          newUsers: dayData?._count.id || 0,
          activeUsers: 0, // Placeholder
          totalUsers: 0, // Placeholder
          cumulativeUsers: 0 // Will be calculated below
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Calculate cumulative users
      let cumulative = 0
      for (const day of timeline) {
        cumulative += day.newUsers
        day.cumulativeUsers = cumulative
      }

      return timeline
    } catch (error) {
      this.logError('Failed to get user timeline', { error, dateRange })
      return []
    }
  }

  /**
   * Get user demographics
   */
  async getUserDemographics(): Promise<UserDemographics> {
    try {
      const [statusDistribution, roleDistribution] = await Promise.all([
        this.getUsersByStatus(),
        this.getUsersByRole()
      ])

      return {
        statusDistribution,
        roleDistribution,
        activityLevels: {}, // Placeholder
        byStatus: statusDistribution,
        byRole: roleDistribution
      }
    } catch (error) {
      this.logError('Failed to get user demographics', { error })
      return { 
        statusDistribution: {},
        roleDistribution: {},
        activityLevels: {},
        byStatus: {}, 
        byRole: {} 
      }
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const [
        usersWithoutMFA,
        recentLogins,
        failedLoginAttempts,
        accountsAtRisk
      ] = await Promise.all([
        this.db.public_users.count({ where: { status: 'active' } }), // Placeholder - would need MFA table
        this.getRecentLoginCount(),
        0, // Placeholder - would need audit log table
        0  // Placeholder - would need security assessment
      ])

      return {
        mfaAdoption: 0, // Placeholder
        passwordStrength: {}, // Placeholder
        suspiciousActivity: 0, // Placeholder
        usersWithoutMFA,
        recentLogins,
        failedLoginAttempts,
        accountsAtRisk
      }
    } catch (error) {
      this.logError('Failed to get security metrics', { error })
      return {
        mfaAdoption: 0,
        passwordStrength: {},
        suspiciousActivity: 0,
        usersWithoutMFA: 0,
        recentLogins: 0,
        failedLoginAttempts: 0,
        accountsAtRisk: 0
      }
    }
  }

  // ============================================================================
  // ROLE STATISTICS
  // ============================================================================

  /**
   * Get comprehensive role statistics
   */
  async getRoleStatistics(): Promise<UserServiceResult<RoleStatistics>> {
    try {
      const [
        totalRoles,
        systemRoles,
        customRoles,
        rolesWithUsers,
        averagePermissionsPerRole,
        roleUsageDistribution
      ] = await Promise.all([
        this.db.roles.count(),
        this.getSystemRolesCount(),
        this.getCustomRolesCount(),
        this.getRolesWithUsersCount(),
        this.getAveragePermissionsPerRole(),
        this.getRoleUsageDistribution()
      ])

      const unusedRoles = totalRoles - rolesWithUsers

      const statistics: RoleStatistics = {
        totalRoles,
        systemRoles,
        customRoles,
        rolesWithUsers,
        unusedRoles,
        averagePermissionsPerRole,
        roleDistribution: [], // Placeholder
        roleUsageDistribution,
        permissionUsage: [] // Placeholder
      }

      return this.success(statistics)
    } catch (error) {
      this.logError('Failed to get role statistics', { error })
      return this.error('Failed to retrieve role statistics', 'DATABASE_ERROR')
    }
  }

  // ============================================================================
  // PERMISSION STATISTICS
  // ============================================================================

  /**
   * Get comprehensive permission statistics
   */
  async getPermissionStatistics(): Promise<UserServiceResult<PermissionStatistics>> {
    try {
      const [
        totalPermissions,
        assignedPermissions,
        mostUsedPermissions,
        leastUsedPermissions,
        permissionCoverage
      ] = await Promise.all([
        this.db.permissions.count(),
        this.getAssignedPermissionsCount(),
        this.getMostUsedPermissions(),
        this.getLeastUsedPermissions(),
        this.getPermissionCoverage()
      ])

      const unassignedPermissions = totalPermissions - assignedPermissions

      const statistics: PermissionStatistics = {
        totalPermissions,
        assignedPermissions,
        unassignedPermissions,
        mostUsedPermissions: mostUsedPermissions.map(p => ({
          name: p.name,
          roleCount: 1, // Placeholder
          userCount: p.count
        })),
        leastUsedPermissions: leastUsedPermissions.map(p => ({
          name: p.name,
          roleCount: 1, // Placeholder
          userCount: p.count
        }))
      }

      return this.success(statistics)
    } catch (error) {
      this.logError('Failed to get permission statistics', { error })
      return this.error('Failed to retrieve permission statistics', 'DATABASE_ERROR')
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get count of new users this month
   */
  private async getNewUsersCount(): Promise<number> {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    return await this.db.public_users.count({
      where: {
        created_at: { gte: startOfMonth }
      }
    })
  }

  /**
   * Calculate user growth rate
   */
  private async calculateGrowthRate(): Promise<number> {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [lastMonthCount, thisMonthCount] = await Promise.all([
      this.db.public_users.count({
        where: {
          created_at: {
            gte: lastMonth,
            lt: thisMonth
          }
        }
      }),
      this.db.public_users.count({
        where: {
          created_at: { gte: thisMonth }
        }
      })
    ])

    if (lastMonthCount === 0) return thisMonthCount > 0 ? 100 : 0
    return ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100
  }

  /**
   * Get recently created users
   */
  private async getRecentlyCreatedUsers(limit = 10): Promise<any[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    return await this.db.public_users.findMany({
      where: {
        created_at: { gte: thirtyDaysAgo }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        created_at: true
      }
    })
  }

  /**
   * Get users by role distribution
   */
  private async getUsersByRole(): Promise<Record<string, number>> {
    const userRoleCounts = await this.db.user_roles.groupBy({
      by: ['role_id'],
      _count: { user_id: true }
    })

    const distribution: Record<string, number> = {}
    
    // Get role names for each role_id
    for (const item of userRoleCounts) {
      const role = await this.db.roles.findUnique({
        where: { id: item.role_id },
        select: { name: true }
      })
      
      if (role) {
        distribution[role.name] = item._count.user_id
      }
    }

    return distribution
  }

  /**
   * Get users by status distribution
   */
  private async getUsersByStatus(): Promise<Record<string, number>> {
    const userStatusCounts = await this.db.public_users.groupBy({
      by: ['status'],
      _count: { id: true }
    })

    const distribution: Record<string, number> = {}
    for (const item of userStatusCounts) {
      distribution[item.status] = item._count.id
    }

    return distribution
  }

  /**
   * Get recent login count
   */
  private async getRecentLoginCount(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    // This would require a login audit table - placeholder implementation
    return await this.db.public_users.count({
      where: {
        updated_at: { gte: sevenDaysAgo }
      }
    })
  }

  /**
   * Get system roles count
   */
  private async getSystemRolesCount(): Promise<number> {
    const systemRoleNames = [
      'Super Admin', 'super_admin', 'superAdmin',
      'Owner', 'owner',
      'Compliance Manager', 'compliance_manager', 'complianceManager',
      'Compliance Officer', 'compliance_officer', 'complianceOfficer',
      'Agent', 'agent',
      'Viewer', 'viewer'
    ]

    return await this.db.roles.count({
      where: {
        name: { in: systemRoleNames }
      }
    })
  }

  /**
   * Get custom roles count
   */
  private async getCustomRolesCount(): Promise<number> {
    const totalRoles = await this.db.roles.count()
    const systemRoles = await this.getSystemRolesCount()
    return totalRoles - systemRoles
  }

  /**
   * Get roles with users count
   */
  private async getRolesWithUsersCount(): Promise<number> {
    const rolesWithUsers = await this.db.roles.findMany({
      where: {
        user_roles: {
          some: {}
        }
      },
      select: { id: true }
    })

    return rolesWithUsers.length
  }

  /**
   * Get average permissions per role
   */
  private async getAveragePermissionsPerRole(): Promise<number> {
    const roles = await this.db.roles.findMany({
      include: {
        _count: {
          select: { role_permissions: true }
        }
      }
    })

    if (roles.length === 0) return 0

    const totalPermissions = roles.reduce((sum, role) => sum + role._count.role_permissions, 0)
    return totalPermissions / roles.length
  }

  /**
   * Get role usage distribution
   */
  private async getRoleUsageDistribution(): Promise<Record<string, number>> {
    return await this.getUsersByRole()
  }

  /**
   * Get assigned permissions count
   */
  private async getAssignedPermissionsCount(): Promise<number> {
    const assignedPermissions = await this.db.role_permissions.groupBy({
      by: ['permission_name'],
      _count: { permission_name: true }
    })

    return assignedPermissions.length
  }

  /**
   * Get most used permissions
   */
  private async getMostUsedPermissions(limit = 10): Promise<Array<{ name: string; count: number }>> {
    const permissionUsage = await this.db.role_permissions.groupBy({
      by: ['permission_name'],
      _count: { permission_name: true },
      orderBy: { _count: { permission_name: 'desc' } },
      take: limit
    })

    return permissionUsage.map(usage => ({
      name: usage.permission_name,
      count: usage._count.permission_name
    }))
  }

  /**
   * Get least used permissions
   */
  private async getLeastUsedPermissions(limit = 10): Promise<Array<{ name: string; count: number }>> {
    const permissionUsage = await this.db.role_permissions.groupBy({
      by: ['permission_name'],
      _count: { permission_name: true },
      orderBy: { _count: { permission_name: 'asc' } },
      take: limit
    })

    return permissionUsage.map(usage => ({
      name: usage.permission_name,
      count: usage._count.permission_name
    }))
  }

  /**
   * Get permission coverage
   */
  private async getPermissionCoverage(): Promise<number> {
    const [totalPermissions, assignedPermissions] = await Promise.all([
      this.db.permissions.count(),
      this.getAssignedPermissionsCount()
    ])

    if (totalPermissions === 0) return 0
    return (assignedPermissions / totalPermissions) * 100
  }
}
