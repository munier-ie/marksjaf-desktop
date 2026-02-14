const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getItems = async (req, res) => {
  try {
    const { category, type } = req.query;
    
    const whereClause = {
      status: 'active'
    };
    
    // Add type filter if provided
    if (type && type !== 'all') {
      whereClause.type = type;
    }
    
    if (category && category !== 'All') {
      whereClause.categories = {
        name: category
      };
    }
    
    const items = await prisma.items.findMany({
      where: whereClause,
      include: {
        categories: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.categories.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

module.exports = {
  getItems,
  getCategories
};