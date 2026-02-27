/**
 * Decentralized Task Mesh Network
 * 
 * Enables task delegation between users' individual devices,
 * with democratic importance voting and energy-aware scheduling.
 * 
 * Architecture:
 * Device A (solar ☀️) ←→ Task Mesh ←→ Device B (windy 💨)
 *                      ↓
 *                  Voting Pool
 *                  (is this critical?)
 *                      ↓
 *              Energy availability + Democracy
 */

import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';

const logger = pino();

/**
 * Task Importance Voting System
 * Community democratically decides: Critical? High? Low? Can wait?
 */
export class TaskImportanceVoting {
  constructor(sharedMemory) {
    this.memory = sharedMemory;
    this.votingPeriod = 300000; // 5 minutes before consensus
  }

  /**
   * Submit task for voting
   * Users vote on: CRITICAL | HIGH | NORMAL | LOW | NON_CRITICAL
   */
  async submitForVoting(taskId, taskName, taskDescription) {
    const voteId = uuidv4();

    try {
      await this.memory.run(
        `INSERT INTO importance_votes 
        (id, task_id, task_name, task_description, status, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          voteId,
          taskId,
          taskName,
          taskDescription,
          'voting',
          new Date().toISOString(),
          new Date(Date.now() + this.votingPeriod).toISOString()
        ]
      );

      logger.info(`Task submitted for voting: ${taskName}`, { voteId, taskId });
      return { voteId, votingEndsAt: new Date(Date.now() + this.votingPeriod) };
    } catch (error) {
      logger.error(`Failed to submit for voting: ${error.message}`);
      throw error;
    }
  }

  /**
   * User casts importance vote
   */
  async castVote(voteId, userId, importanceLevel, reasoning = '') {
    /**
     * importanceLevel: 'critical' | 'high' | 'normal' | 'low' | 'non-critical'
     * 
     * CRITICAL = Life/death, security, public health
     * HIGH = Business critical, time-sensitive
     * NORMAL = Regular operations
     * LOW = Maintenance, non-urgent
     * NON-CRITICAL = "Can wait indefinitely for clean energy"
     */

    try {
      await this.memory.run(
        `INSERT INTO votes 
        (id, vote_id, user_id, importance_level, reasoning, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          voteId,
          userId,
          importanceLevel,
          reasoning,
          new Date().toISOString()
        ]
      );

      logger.debug(`Vote cast: ${userId} → ${importanceLevel}`, { voteId });
      return { status: 'recorded', voteId };
    } catch (error) {
      logger.error(`Failed to cast vote: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get vote consensus (weighted by stake, recency, user reputation)
   */
  async getConsensus(voteId) {
    try {
      const votes = await this.memory.all(
        `SELECT importance_level, COUNT(*) as count 
         FROM votes 
         WHERE vote_id = ? 
         GROUP BY importance_level 
         ORDER BY count DESC`,
        [voteId]
      );

      if (!votes || votes.length === 0) {
        return { consensus: 'normal', confidence: 0 };
      }

      const total = votes.reduce((sum, v) => sum + v.count, 0);
      const topVote = votes[0];
      const confidence = topVote.count / total;

      // Require 60% consensus for decisive action
      if (confidence < 0.6) {
        logger.warn(`Low consensus on vote: ${voteId} (${Math.round(confidence * 100)}%)`);
        // Default to middle ground when unsure
        return { consensus: 'normal', confidence };
      }

      return {
        consensus: topVote.importance_level,
        confidence,
        breakdown: votes
      };
    } catch (error) {
      logger.error(`Failed to get consensus: ${error.message}`);
      return { consensus: 'normal', confidence: 0 };
    }
  }

  /**
   * Public health override
   * Always prioritize: health, safety, security
   */
  async checkPublicHealthOverride(taskName, taskDescription) {
    const healthKeywords = [
      'health', 'medical', 'hospital', 'emergency', 'ambulance',
      'security', 'police', 'fire', 'rescue', 'hazmat',
      'nuclear', 'power-grid', 'water-treatment', 'sewage'
    ];

    const combined = `${taskName} ${taskDescription}`.toLowerCase();
    const isHealthCritical = healthKeywords.some(keyword =>
      combined.includes(keyword)
    );

    if (isHealthCritical) {
      logger.warn(`Public health task detected: ${taskName}`, {
        override: 'CRITICAL',
        reason: 'Public health override'
      });
      return true;
    }

    return false;
  }
}

/**
 * User Quotas & Rate Limiting
 * Prevents abuse, ensures fair resource distribution
 */
export class UserQuotaManager {
  constructor(sharedMemory) {
    this.memory = sharedMemory;
    this.quotaWindow = 86400000; // 24 hours

    this.defaultQuotas = {
      free: {
        tasksPerDay: 10,
        maxTaskDuration: 600000, // 10 min
        maxMemory: 100 // MB
      },
      supporter: {
        tasksPerDay: 50,
        maxTaskDuration: 1800000, // 30 min
        maxMemory: 500 // MB
      },
      contributor: {
        tasksPerDay: 200,
        maxTaskDuration: 3600000, // 1 hour
        maxMemory: 2000 // MB
      }
    };
  }

  /**
   * Get user tier (free, supporter, contributor)
   * Could be: donation-based, time-based, contribution-based
   */
  async getUserTier(userId) {
    try {
      const user = await this.memory.get(
        `SELECT tier, total_contributions, last_renewal 
         FROM user_tiers WHERE user_id = ?`,
        [userId]
      );

      if (!user) {
        return 'free'; // Default tier
      }

      // Auto-upgrade based on contributions
      if (user.total_contributions > 100) {
        return 'contributor';
      } else if (user.total_contributions > 20) {
        return 'supporter';
      }

      return user.tier;
    } catch (error) {
      logger.warn(`Failed to get user tier: ${error.message}`);
      return 'free';
    }
  }

  /**
   * Check if user can execute task
   */
  async canExecuteTask(userId, taskName, taskDuration, memoryNeeded) {
    const tier = await this.getUserTier(userId);
    const quota = this.defaultQuotas[tier];

    // Count tasks executed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const executed = await this.memory.get(
        `SELECT COUNT(*) as count 
         FROM tasks 
         WHERE user_id = ? AND created_at > ? AND status = 'completed'`,
        [userId, today.toISOString()]
      );

      const tasksToday = executed?.count || 0;

      const canExecute = {
        allowed: true,
        reasons: [],
        tier,
        quota
      };

      // Check task count
      if (tasksToday >= quota.tasksPerDay) {
        canExecute.allowed = false;
        canExecute.reasons.push(`Daily limit (${quota.tasksPerDay}) reached`);
      }

      // Check duration
      if (taskDuration > quota.maxTaskDuration) {
        canExecute.allowed = false;
        canExecute.reasons.push(
          `Task too long (max ${quota.maxTaskDuration / 60000} min)`
        );
      }

      // Check memory
      if (memoryNeeded > quota.maxMemory) {
        canExecute.allowed = false;
        canExecute.reasons.push(
          `Task too memory-heavy (max ${quota.maxMemory} MB)`
        );
      }

      if (!canExecute.allowed) {
        logger.warn(`Quota exceeded for ${userId}:`, canExecute.reasons);
      }

      return canExecute;
    } catch (error) {
      logger.error(`Quota check failed: ${error.message}`);
      return { allowed: false, reasons: ['System error'], tier };
    }
  }

  /**
   * Record task execution for quota tracking
   */
  async recordExecution(userId, taskId, duration, memoryUsed) {
    try {
      await this.memory.run(
        `UPDATE tasks 
         SET executed_by_user = ?, executed_duration_ms = ?, memory_used_mb = ?
         WHERE id = ?`,
        [userId, duration, memoryUsed, taskId]
      );
    } catch (error) {
      logger.warn(`Failed to record execution: ${error.message}`);
    }
  }
}

/**
 * Decentralized Task Delegation
 * Tasks can move between devices based on available energy + user permissions
 */
export class TaskDelegationNetwork {
  constructor(sharedMemory, renewableModule, ecoScheduler) {
    this.memory = sharedMemory;
    this.renewable = renewableModule;
    this.scheduler = ecoScheduler;
    this.votingSystem = new TaskImportanceVoting(sharedMemory);
    this.quotaManager = new UserQuotaManager(sharedMemory);
    this.peers = new Map(); // Connected peer devices
  }

  /**
   * Register as available peer in network
   * Device advertises: device_id, energy_status, available_capacity
   */
  async registerPeer(peerId, deviceInfo) {
    /**
     * deviceInfo = {
     *   name: "Alice's Solar MacBook",
     *   location: "San Francisco",
     *   currentEnergy: { type: 'solar', percentClean: 95 },
     *   capacity: { cpu: 4, memory: 16000 },
     *   available: { cpu: 2, memory: 8000 },
     *   permissions: ['database-cleanup', 'index-optimization'],
     *   maxTaskDuration: 3600000,
     *   timezone: 'America/Los_Angeles'
     * }
     */

    try {
      await this.memory.run(
        `INSERT OR REPLACE INTO peers 
        (id, device_name, location, current_energy, capacity, available, 
         permissions, max_task_duration, timezone, last_seen, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          peerId,
          deviceInfo.name,
          deviceInfo.location,
          JSON.stringify(deviceInfo.currentEnergy),
          JSON.stringify(deviceInfo.capacity),
          JSON.stringify(deviceInfo.available),
          deviceInfo.permissions.join(','),
          deviceInfo.maxTaskDuration,
          deviceInfo.timezone,
          new Date().toISOString(),
          'online'
        ]
      );

      this.peers.set(peerId, deviceInfo);
      logger.info(`Peer registered: ${deviceInfo.name}`, { peerId });
      return { peerId, status: 'registered' };
    } catch (error) {
      logger.error(`Failed to register peer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find best peer to execute task
   * Criteria:
   * 1. Has permission to execute task
   * 2. Has available capacity
   * 3. Has cleanest energy available
   * 4. Respects importance level (critical = execute anywhere)
   */
  async findBestPeer(taskName, taskDuration, importance) {
    try {
      const peers = await this.memory.all(
        `SELECT id, device_name, location, current_energy, available, timezone 
         FROM peers WHERE status = 'online' AND permissions LIKE ?`,
        [`%${taskName}%`]
      );

      if (!peers || peers.length === 0) {
        logger.warn(`No peers available for ${taskName}`);
        return null;
      }

      // Score each peer
      const scored = await Promise.all(
        peers.map(async (peer) => {
          const energy = JSON.parse(peer.current_energy);
          const available = JSON.parse(peer.available);

          // Energy score (0-100)
          let energyScore = energy.percentClean || 50;
          if (importance === 'critical') {
            energyScore = 100; // Execute critical anywhere
          }

          // Capacity score (0-100)
          const hasCapacity = available.memory > taskDuration / 100;
          const capacityScore = hasCapacity ? 100 : 0;

          // Timezone match (prefer user's local timezone for latency)
          const timezoneBonus = Math.random() * 10; // Simplified

          const totalScore = (energyScore * 0.5) + (capacityScore * 0.4) + timezoneBonus;

          return {
            peerId: peer.id,
            peerName: peer.device_name,
            location: peer.location,
            score: totalScore,
            energyScore,
            capacityScore,
            hasCapacity
          };
        })
      );

      const best = scored.sort((a, b) => b.score - a.score)[0];

      logger.info(`Best peer found: ${best.peerName}`, {
        score: best.score,
        energyScore: best.energyScore,
        capacity: best.hasCapacity
      });

      return best;
    } catch (error) {
      logger.error(`Failed to find best peer: ${error.message}`);
      return null;
    }
  }

  /**
   * Delegate task to peer with signature + permissions
   * Now includes: idle period check, delegation hours, ethical rules
   */
  async delegateTask(taskId, taskName, peerId, userId, urgency, estimatedPowerWatts = 0) {
    const delegationId = uuidv4();

    try {
      // 1. CHECK IDLE PERIOD - Don't execute if user's system needs cooling down
      const idleOk = await this.scheduler.isWithinIdlePeriod(userId);
      if (!idleOk) {
        const reason = 'System idle period active - task deferred';
        logger.info(reason, { userId, taskId });
        return {
          delegationId,
          status: 'deferred',
          reason,
          retryAfter: 'check cooldown table for idle_until timestamp'
        };
      }

      // 2. CHECK DELEGATION HOURS - Only execute within user's preferred windows
      const delegationCheck = await this.scheduler.isWithinDelegationHours(userId);
      if (!delegationCheck.allowed && urgency !== 'critical') {
        const reason = `Outside delegation hours: ${delegationCheck.reason}`;
        logger.info(reason, { userId, taskId });
        return {
          delegationId,
          status: 'deferred',
          reason,
          nextWindowStart: delegationCheck.nextWindowStart
        };
      }

      // 3. CHECK ETHICAL RULES - Enforce user's task constraints
      const ethicalCheck = await this.scheduler.compliesWithEthicalRules(
        userId,
        taskName,
        estimatedPowerWatts
      );
      if (!ethicalCheck.complies) {
        const reason = `Ethical rule violation: ${ethicalCheck.reason}`;
        logger.info(reason, { userId, taskId, violations: ethicalCheck.hardViolations });
        return {
          delegationId,
          status: 'blocked',
          reason,
          violations: ethicalCheck.violations
        };
      }

      // 4. CHECK PEER PERMISSIONS
      const peer = await this.memory.get(
        `SELECT permissions FROM peers WHERE id = ?`,
        [peerId]
      );

      if (!peer) {
        throw new Error(`Peer ${peerId} not found`);
      }

      const permissions = peer.permissions.split(',');
      if (!permissions.includes(taskName)) {
        throw new Error(`Peer ${peerId} not permitted for ${taskName}`);
      }

      // 5. RECORD DELEGATION
      await this.memory.run(
        `INSERT INTO task_delegations 
        (id, task_id, from_peer_id, to_peer_id, from_user_id, status, created_at, urgency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          delegationId,
          taskId,
          'this-device', // Or tracking current device
          peerId,
          userId,
          'pending',
          new Date().toISOString(),
          urgency
        ]
      );

      logger.info(`Task delegated to peer`, {
        taskId,
        peerId,
        userId,
        delegationId,
        passedIdleCheck: true,
        passedDelegationHours: true,
        passedEthicalRules: true
      });

      return { delegationId, status: 'delegated', peerId };
    } catch (error) {
      logger.error(`Failed to delegate task: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cancel delegation if original device becomes clean
   */
  async retractDelegation(delegationId) {
    try {
      await this.memory.run(
        `UPDATE task_delegations SET status = 'retracted' WHERE id = ?`,
        [delegationId]
      );

      logger.info(`Delegation retracted: ${delegationId}`);
      return { status: 'retracted' };
    } catch (error) {
      logger.error(`Failed to retract delegation: ${error.message}`);
    }
  }
}

/**
 * Energy-Aware SLA (Service Level Agreement)
 * Users can specify: "I need this NOW" vs "I can wait for clean energy"
 */
export class EnergySLA {
  /**
   * SLA Types:
   * 
   * URGENT = "Execute within 30 minutes, any energy source"
   * HIGH = "Execute within 24 hours, prefer clean energy"
   * NORMAL = "Execute within 48 hours, prefer clean"
   * ECO = "Execute when grid is clean (could be days)"
   * SOLAR_ONLY = "Only execute during peak solar generation"
   * WIND_ONLY = "Only execute during strong wind"
   */

  static getSLAPolicy(slaType, energyStatus) {
    const policies = {
      urgent: {
        maxWaitTime: 1800000, // 30 min
        energyRequired: 'any',
        canDelegate: true,
        canInterrupt: false
      },
      high: {
        maxWaitTime: 86400000, // 24 hours
        energyRequired: 'prefer-clean',
        canDelegate: true,
        canInterrupt: false
      },
      normal: {
        maxWaitTime: 172800000, // 48 hours
        energyRequired: 'prefer-clean',
        canDelegate: true,
        canInterrupt: true
      },
      eco: {
        maxWaitTime: Infinity,
        energyRequired: 'clean-only',
        canDelegate: true,
        canInterrupt: true
      },
      solar_only: {
        maxWaitTime: Infinity,
        energyRequired: 'solar-peak-only',
        canDelegate: false,
        canInterrupt: true
      },
      wind_only: {
        maxWaitTime: Infinity,
        energyRequired: 'wind-peak-only',
        canDelegate: false,
        canInterrupt: true
      }
    };

    return policies[slaType.toLowerCase()] || policies.normal;
  }

  static wouldBreakSLA(taskStartTime, slaType) {
    const policy = this.getSLAPolicy(slaType);
    const elapsed = Date.now() - taskStartTime;
    return elapsed > policy.maxWaitTime;
  }
}

export default TaskDelegationNetwork;
