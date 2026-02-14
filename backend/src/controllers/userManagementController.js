const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// Get all users/staff with filtering
const getAllUsers = async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;

    const where = {
      // Exclude customers if not specifically requested
      role: role === 'all' ? undefined : role || { in: ['admin', 'staff'] }
    };

    // Add search functionality
    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone_number: { contains: search } }
      ];
    }

    // Add status filter
    if (status && status !== 'all') {
      where.is_active = status === 'active';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, totalCount] = await Promise.all([
      prisma.users.findMany({
        where,
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          phone_number: true,
          role: true,
          is_active: true,
          is_email_verified: true,
          created_at: true,
          updated_at: true,
          admins: {
            select: {
              permissions: true,
              last_login: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { created_at: 'desc' }
      }),
      prisma.users.count({ where })
    ]);

    // Format response to match frontend expectations
    const formattedUsers = users.map(user => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone_number: user.phone_number || '',
      role: user.role,
      is_active: user.is_active,
      is_email_verified: user.is_email_verified,
      created_at: user.created_at,
      updated_at: user.updated_at,
      permissions: user.admins?.permissions || []
    }));

    res.json({
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.users.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone_number: true,
        role: true,
        is_active: true,
        is_email_verified: true,
        created_at: true,
        updated_at: true,
        admins: {
          select: {
            permissions: true,
            last_login: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const formattedUser = {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      phone: user.phone_number || '',
      role: user.role,
      status: user.is_active ? 'active' : 'inactive',
      joinDate: user.created_at,
      lastLogin: user.admins?.last_login || null,
      permissions: user.admins?.permissions || [],
      isEmailVerified: user.is_email_verified
    };

    res.json({
      success: true,
      data: formattedUser
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

// Create new user/staff
const createUser = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone_number,
      role,
      is_active = true,
      password,
      permissions = []
    } = req.body;

    // Validate required fields
    if (!first_name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'First name, email, password, and role are required'
      });
    }

    // Check if email already exists
    const existingUser = await prisma.users.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.users.create({
        data: {
          id: uuidv4(),
          email,
          password_hash: passwordHash,
          first_name,
          last_name: last_name || '',
          phone_number: phone_number || null,
          role,
          is_active,
          is_email_verified: true // Auto-verify for staff created by admin
        }
      });

      // If admin role, create admin record
      if (role === 'admin') {
        await tx.admins.create({
          data: {
            id: newUser.id,
            permissions: permissions.length > 0 ? permissions : ['all']
          }
        });
      }

      return newUser;
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        id: result.id,
        first_name: result.first_name,
        last_name: result.last_name,
        email: result.email,
        phone_number: result.phone_number,
        role: result.role,
        is_active: result.is_active,
        is_email_verified: result.is_email_verified,
        created_at: result.created_at,
        updated_at: result.updated_at,
        permissions: role === 'admin' ? permissions : []
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

// Update user/staff
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      first_name,
      last_name,
      email,
      phone_number,
      role,
      is_active,
      permissions = [],
      password // Destructure password
    } = req.body;

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id },
      include: { admins: true }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it already exists
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.users.findUnique({
        where: { email }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // Hash password if provided
    let passwordHash = undefined;
    if (password && password.trim() !== '') {
      const saltRounds = 12;
      passwordHash = await bcrypt.hash(password, saltRounds);
    }

    // Update user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Prepare update data
      const updateData = {
        email: email || existingUser.email,
        first_name: first_name || existingUser.first_name,
        last_name: last_name !== undefined ? last_name : existingUser.last_name,
        phone_number: phone_number !== undefined ? phone_number : existingUser.phone_number,
        role: role || existingUser.role,
        is_active: is_active !== undefined ? is_active : existingUser.is_active
      };

      // Only add password_hash if it was updated
      if (passwordHash) {
        updateData.password_hash = passwordHash;
      }

      // Update user
      const updatedUser = await tx.users.update({
        where: { id },
        data: updateData
      });

      // Handle admin permissions
      if (role === 'admin' || existingUser.role === 'admin') {
        if (role === 'admin') {
          // Create or update admin record
          await tx.admins.upsert({
            where: { id },
            create: {
              id,
              permissions: permissions.length > 0 ? permissions : ['all']
            },
            update: {
              permissions: permissions.length > 0 ? permissions : ['all']
            }
          });
        } else if (existingUser.role === 'admin' && role !== 'admin') {
          // Remove admin record if role changed from admin
          await tx.admins.delete({
            where: { id }
          }).catch(() => { }); // Ignore if doesn't exist
        }
      }

      return updatedUser;
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        id: result.id,
        first_name: result.first_name,
        last_name: result.last_name,
        email: result.email,
        phone_number: result.phone_number,
        role: result.role,
        is_active: result.is_active,
        is_email_verified: result.is_email_verified,
        created_at: result.created_at,
        updated_at: result.updated_at,
        permissions: role === 'admin' ? permissions : []
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// Delete user/staff
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.users.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting the last admin
    if (existingUser.role === 'admin') {
      const adminCount = await prisma.users.count({
        where: { role: 'admin', is_active: true }
      });

      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last active admin'
        });
      }
    }

    // Delete user in transaction (cascade will handle related records)
    await prisma.$transaction(async (tx) => {
      // Delete admin record if exists
      await tx.admins.delete({
        where: { id }
      }).catch(() => { }); // Ignore if doesn't exist

      // Delete user
      await tx.users.delete({
        where: { id }
      });
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const [totalUsers, activeUsers, inactiveUsers, adminUsers, staffUsers] = await Promise.all([
      prisma.users.count({
        where: { role: { in: ['admin', 'staff'] } }
      }),
      prisma.users.count({
        where: {
          role: { in: ['admin', 'staff'] },
          is_active: true
        }
      }),
      prisma.users.count({
        where: {
          role: { in: ['admin', 'staff'] },
          is_active: false
        }
      }),
      prisma.users.count({
        where: { role: 'admin' }
      }),
      prisma.users.count({
        where: { role: 'staff' }
      })
    ]);

    res.json({
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        admins: adminUsers,
        staff: staffUsers
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserStats
};