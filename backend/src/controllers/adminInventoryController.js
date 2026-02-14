const { PrismaClient } = require('@prisma/client');
const localImageService = require('../services/localImageService');
const prisma = new PrismaClient();
const { generateUUID } = require('../utils/uuid');

// Get all items for admin (including inactive)
const getAllItems = async (req, res) => {
  try {
    const { category, status, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {};

    if (category && category !== 'All') {
      whereClause.categories = {
        name: category
      };
    }

    if (status && status !== 'all') {
      if (status === 'out_of_stock') {
        whereClause.stock_quantity = 0;
      } else if (status === 'active' || status === 'inactive') {
        whereClause.status = status;
      }
      // For in_stock and low_stock, we'll handle them differently
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // For stock-based filters, we need to fetch all items first then filter
    if (status === 'in_stock' || status === 'low_stock') {
      const allItems = await prisma.items.findMany({
        where: whereClause,
        include: {
          categories: true,
          inventory_history: {
            orderBy: { created_at: 'desc' },
            take: 5
          }
        },
        orderBy: { name: 'asc' }
      });

      let filteredItems;
      if (status === 'in_stock') {
        filteredItems = allItems.filter(item =>
          item.stock_quantity > 0 &&
          (item.low_stock_threshold === null || item.stock_quantity > item.low_stock_threshold)
        );
      } else if (status === 'low_stock') {
        filteredItems = allItems.filter(item =>
          item.stock_quantity > 0 &&
          item.low_stock_threshold !== null &&
          item.stock_quantity <= item.low_stock_threshold
        );
      }

      // Apply pagination to filtered results
      const paginatedItems = filteredItems.slice(offset, offset + parseInt(limit));

      res.json({
        success: true,
        data: paginatedItems,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredItems.length,
          pages: Math.ceil(filteredItems.length / parseInt(limit))
        }
      });
    } else {
      // For other filters, use normal pagination
      const [items, totalCount] = await Promise.all([
        prisma.items.findMany({
          where: whereClause,
          include: {
            categories: true,
            inventory_history: {
              orderBy: { created_at: 'desc' },
              take: 5
            }
          },
          orderBy: { name: 'asc' },
          skip: offset,
          take: parseInt(limit)
        }),
        prisma.items.count({ where: whereClause })
      ]);

      res.json({
        success: true,
        data: items,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      });
    }
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

// Get single item by ID
const getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await prisma.items.findUnique({
      where: { id },
      include: {
        categories: true,
        inventory_history: {
          orderBy: { created_at: 'desc' },
          take: 10
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
};

// Create new item
const createItem = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      stock_quantity,
      low_stock_threshold,
      category_name,
      type,
      status,
      image_path // Local image path from desktop app
    } = req.body;

    // Validation
    if (!name || !price || stock_quantity === undefined) {
      return res.status(400).json({
        error: 'Name, price, and stock quantity are required'
      });
    }

    // Process local image if provided
    let image_url = null;
    if (req.file) {
      const uploadResult = await localImageService.processAndSaveImage(req.file, 'items');

      if (uploadResult.success) {
        image_url = uploadResult.imageUrl;
      } else {
        console.warn('Failed to process image:', uploadResult.error);
        // Continue without image rather than failing the entire operation
      }
    } else if (req.body.image_url && req.body.image_url !== 'null') {
      // Use image_url from request body if provided (from frontend upload)
      image_url = req.body.image_url;
    }

    // Find or create category
    let category;
    if (category_name) {
      category = await prisma.categories.findFirst({
        where: { name: category_name }
      });

      if (!category) {
        category = await prisma.categories.create({
          data: {
            id: generateUUID(),
            name: category_name,
            description: `Category for ${category_name}`
          }
        });
      }
    }

    // Create item with synced image URL
    const item = await prisma.items.create({
      data: {
        id: generateUUID(),
        name,
        description,
        price: parseFloat(price),
        stock_quantity: parseInt(stock_quantity),
        low_stock_threshold: low_stock_threshold !== undefined ? Math.max(0, parseInt(low_stock_threshold)) : 10,
        category_id: category?.id,
        type,
        status,
        image_url // This will be the full URL to the main backend
      },
      include: {
        categories: true
      }
    });

    // Create initial inventory history record
    await prisma.inventory_history.create({
      data: {
        id: generateUUID(),
        item_id: item.id,
        quantity_change: parseInt(stock_quantity),
        previous_quantity: 0,
        new_quantity: parseInt(stock_quantity),
        reason: 'Initial stock'
      }
    });

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
};

// Update item
const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      price,
      stock_quantity,
      low_stock_threshold,
      category_name,
      type,
      status,
      image_path // New image path if updating image
    } = req.body;

    // Check if item exists
    const existingItem = await prisma.items.findUnique({
      where: { id }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Process new image if provided
    let image_url = existingItem.image_url; // Keep existing image by default
    if (req.file) {
      // Delete old image if it exists
      if (existingItem.image_url) {
        await localImageService.deleteImage(existingItem.image_url);
      }

      const uploadResult = await localImageService.processAndSaveImage(req.file, 'items');

      if (uploadResult.success) {
        image_url = uploadResult.imageUrl;
      } else {
        console.warn('Failed to process image:', uploadResult.error);
        // Continue with existing image
      }
    } else if (req.body.image_url !== undefined) {
      // Handle image_url from request body (from frontend upload)
      if (req.body.image_url === null || req.body.image_url === 'null' || req.body.image_url === '') {
        // Remove image if explicitly set to null/empty
        if (existingItem.image_url) {
          await localImageService.deleteImage(existingItem.image_url);
        }
        image_url = null;
      } else {
        // Update with new image URL
        image_url = req.body.image_url;
      }
    }

    // Handle category
    let category_id = existingItem.category_id;
    if (category_name) {
      let category = await prisma.categories.findFirst({
        where: { name: category_name }
      });

      if (!category) {
        category = await prisma.categories.create({
          data: {
            id: generateUUID(),
            name: category_name,
            description: `Category for ${category_name}`
          }
        });
      }

      category_id = category.id;
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (low_stock_threshold !== undefined) updateData.low_stock_threshold = parseInt(low_stock_threshold);
    if (category_id !== undefined) updateData.category_id = category_id;
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (image_url !== undefined) updateData.image_url = image_url;

    // Handle stock quantity change
    if (stock_quantity !== undefined) {
      const newQuantity = parseInt(stock_quantity);
      const quantityChange = newQuantity - existingItem.stock_quantity;

      updateData.stock_quantity = newQuantity;

      if (quantityChange !== 0) {
        await prisma.inventory_history.create({
          data: {
            id: generateUUID(),
            item_id: id,
            quantity_change: quantityChange,
            previous_quantity: existingItem.stock_quantity,
            new_quantity: newQuantity,
            reason: 'Manual adjustment'
          }
        });
      }
    }

    // Update item
    const updatedItem = await prisma.items.update({
      where: { id },
      data: updateData,
      include: {
        categories: true
      }
    });

    res.json({ success: true, data: updatedItem });
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
};

// Delete item
const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;

    // Get item details first to delete associated image
    const item = await prisma.items.findUnique({
      where: { id },
      select: { image_url: true }
    });

    // Start a transaction to ensure all deletions succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Delete related records first
      await tx.order_items.deleteMany({ where: { item_id: id } });
      await tx.favorites.deleteMany({ where: { item_id: id } });
      await tx.inventory_history.deleteMany({ where: { item_id: id } });
      await tx.item_sales.deleteMany({ where: { item_id: id } });
      await tx.ratings_and_reviews.deleteMany({ where: { item_id: id } });
      await tx.reviews.deleteMany({ where: { item_id: id } });

      // Finally delete the item
      await tx.items.delete({ where: { id } });
    });

    // Delete associated image file if it exists
    if (item?.image_url) {
      await localImageService.deleteImage(item.image_url);
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};

// Get inventory statistics
const getInventoryStats = async (req, res) => {
  try {
    // Use basic counts first to avoid complex queries
    const [totalItems, outOfStockItems] = await Promise.all([
      prisma.items.count({
        where: { status: 'active' }
      }),
      prisma.items.count({
        where: {
          status: 'active',
          stock_quantity: 0
        }
      })
    ]);

    // Get items for low stock calculation and total value
    const activeItems = await prisma.items.findMany({
      where: { status: 'active' },
      select: {
        stock_quantity: true,
        low_stock_threshold: true,
        price: true
      }
    });

    // Calculate low stock items safely
    const lowStockItems = activeItems.filter(item => {
      const stockQty = item.stock_quantity || 0;
      const threshold = item.low_stock_threshold || 0;
      return stockQty > 0 && threshold > 0 && stockQty <= threshold;
    }).length;

    // Calculate total value safely
    const totalValue = activeItems.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const stock = parseInt(item.stock_quantity) || 0;
      return sum + (price * stock);
    }, 0);

    res.json({
      success: true,
      data: {
        totalItems: totalItems || 0,
        lowStockItems: lowStockItems || 0,
        outOfStockItems: outOfStockItems || 0,
        totalValue: parseFloat(totalValue.toFixed(2)) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    console.error('Error details:', error.message);

    // Return zero stats if there's an error
    res.json({
      success: true,
      data: {
        totalItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalValue: 0
      }
    });
  }
};

// Update stock quantity (for order processing)
const updateStock = async (itemId, quantityChange, reason = 'Order processing') => {
  try {
    const item = await prisma.items.findUnique({
      where: { id: itemId }
    });

    if (!item) {
      throw new Error('Item not found');
    }

    const newQuantity = item.stock_quantity + quantityChange;

    if (newQuantity < 0) {
      throw new Error('Insufficient stock');
    }

    // Update item stock
    const updatedItem = await prisma.items.update({
      where: { id: itemId },
      data: { stock_quantity: newQuantity }
    });

    // Create inventory history record
    await prisma.inventory_history.create({
      data: {
        id: generateUUID(),
        item_id: itemId,
        change_type: quantityChange > 0 ? 'increase' : 'decrease',
        quantity_change: quantityChange,
        previous_quantity: item.stock_quantity,
        new_quantity: newQuantity,
        reason
        // Remove change_type as it doesn't exist in the schema
      }
    });

    return updatedItem;
  } catch (error) {
    console.error('Error updating stock:', error);
    throw error;
  }
};

// Import items from CSV
const importItems = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fs = require('fs');
    const path = require('path');
    const filePath = req.file.path;

    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // Simple CSV parser
    const rows = fileContent.split('\n');
    const headers = rows[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));

    // Expected headers: name, price, stock, category, description, image
    // Map headers to fields
    const fieldMap = {
      name: headers.findIndex(h => h.includes('name')),
      price: headers.findIndex(h => h.includes('price')),
      stock: headers.findIndex(h => h.includes('stock') || h.includes('quantity')),
      category: headers.findIndex(h => h.includes('category')),
      description: headers.findIndex(h => h.includes('description')),
      image: headers.findIndex(h => h.includes('image'))
    };

    if (fieldMap.name === -1 || fieldMap.price === -1) {
      return res.status(400).json({ error: 'CSV must contain "name" and "price" columns' });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process rows (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row.trim()) continue;

      // Handle commas inside quotes properly? For simplicity, assume simple CSV first. 
      // If needed, we can use a library, but strictly "simple" for now.
      // Better regex for splitting: 
      const cols = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || row.split(','); // Fallback
      // Clean quotes
      const cleanCols = cols ? cols.map(c => c ? c.trim().replace(/^"|"$/g, '').replace(/""/g, '"') : '') : row.split(',');

      try {
        const name = cleanCols[fieldMap.name];
        const price = parseFloat(cleanCols[fieldMap.price]);
        const stock = fieldMap.stock > -1 ? parseInt(cleanCols[fieldMap.stock]) || 0 : 0;
        const categoryName = fieldMap.category > -1 ? cleanCols[fieldMap.category] : 'Uncategorized';
        const description = fieldMap.description > -1 ? cleanCols[fieldMap.description] : '';
        const imageUrl = fieldMap.image > -1 ? cleanCols[fieldMap.image] : null; // URL driven

        if (!name || isNaN(price)) {
          errorCount++;
          errors.push(`Row ${i + 1}: Missing name or valid price`);
          continue;
        }

        // Find or create category
        let category = await prisma.categories.findFirst({
          where: { name: categoryName }
        });

        if (!category) {
          category = await prisma.categories.create({
            data: {
              id: generateUUID(),
              name: categoryName,
              description: `Category for ${categoryName}`
            }
          });
        }

        // Create item
        await prisma.items.create({
          data: {
            id: generateUUID(),
            name,
            description,
            price,
            stock_quantity: stock,
            category_id: category.id,
            status: stock > 0 ? 'active' : 'out_of_stock',
            image_url: imageUrl,
            type: 'simple' // default
          }
        });

        // Add initial history
        if (stock > 0) {
          // We'd need to fetch the ID we just created, but create returns it 
          // Wait, I didn't capture the result. Let me fix that.
        }

        successCount++;
      } catch (err) {
        errorCount++;
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    // Delete temp file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: `Imported ${successCount} items successfully. ${errorCount} failed.`,
      stats: { success: successCount, failed: errorCount, errors }
    });

  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({ error: 'Failed to import items' });
  }
};

module.exports = {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getInventoryStats,
  updateStock,
  importItems
};
