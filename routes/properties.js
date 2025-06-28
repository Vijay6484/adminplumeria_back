const express = require('express');
const routes = express.Router();
const pool = require('../dbcon');
const app = express();

// Helper function to create database connection
const createConnection = async () => {
    return await pool.getConnection();
};

// Helper function to close database connection
const closeConnection = async (connection) => {
    if (connection) connection.release();
};

app.use(express.json());


// GET /admin/properties/accommodations - Fetch all accommodations
routes.get('/accommodations', async (req, res) => {
    const connection = await createConnection();

    try {
        // Validate and parse query parameters
        const {
            type,
            min_capacity,
            max_capacity,
            is_available,
            min_price,
            max_price,
            search,
            amenities,
            page = 1,
            limit = 10,
            sort = 'created_at',
            order = 'DESC'
        } = req.query;

        // Validate numeric parameters
        const pageNum = Math.max(1, parseInt(page)) || 1;
        const limitNum = Math.min(100, Math.max(1, parseInt(limit))) || 10;
        const offset = (pageNum - 1) * limitNum;

        // Base query selecting only from accommodations table
        let query = `
            SELECT 
                id,
                name,
                type,
                description,
                price,
                capacity,
                rooms,
                available,
                features,
                images,
                amenity_ids,
                owner_id,
                city_id,
                address,
                latitude,
                longitude,
                package_name,
                package_description,
                package_images,
                adult_price,
                child_price,
                max_guests,
                created_at,
                updated_at
            FROM accommodations
        `;

        const conditions = [];
        const params = [];

        // Add filters (all from accommodations table)
        if (type) {
            conditions.push('type = ?');
            params.push(type);
        }

        if (min_capacity) {
            conditions.push('capacity >= ?');
            params.push(min_capacity);
        }

        if (max_capacity) {
            conditions.push('capacity <= ?');
            params.push(max_capacity);
        }

        if (is_available === 'true') {
            conditions.push('available = TRUE');
        } else if (is_available === 'false') {
            conditions.push('available = FALSE');
        }

        if (min_price) {
            conditions.push('price >= ?');
            params.push(min_price);
        }

        if (max_price) {
            conditions.push('price <= ?');
            params.push(max_price);
        }

        if (search) {
            conditions.push('(name LIKE ? OR description LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        if (amenities) {
            const amenityIds = amenities.split(',').map(id => parseInt(id.trim()));
            conditions.push(`JSON_OVERLAPS(amenity_ids, ?)`);
            params.push(JSON.stringify(amenityIds));
        }

        // Add WHERE clause if conditions exist
        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Validate sort field against actual table columns
        const validSortFields = [
            'id', 'name', 'type', 'price', 'capacity', 'rooms',
            'available', 'created_at', 'updated_at'
        ];
        const sortField = validSortFields.includes(sort) ? sort : 'created_at';
        const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        // Add sorting
        query += ` ORDER BY ${sortField} ${sortOrder}`;

        // Add pagination
        query += ' LIMIT ? OFFSET ?';
        params.push(limitNum, offset);

        // Execute main query
        const [rows] = await connection.execute(query, params);

        // Get total count (using same conditions)
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM accommodations
            ${conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''}
        `;
        const [countRows] = await connection.execute(countQuery, params.slice(0, -2));
        const total = countRows[0].total;
        const totalPages = Math.ceil(total / limitNum);

        // Process JSON fields
        const processJsonField = (field, defaultValue) => {
            try {
                return field ? JSON.parse(field) : defaultValue;
            } catch (e) {
                console.error('JSON parse error:', e.message);
                return defaultValue;
            }
        };

        // Format response (all fields from accommodations table)
        const formattedRows = rows.map(row => ({
            id: row.id,
            name: row.name,
            type: row.type,
            description: row.description,
            price: row.price,
            capacity: row.capacity,
            rooms: row.rooms,
            available: Boolean(row.available),
            features: processJsonField(row.features, []),
            images: processJsonField(row.images, []),
            amenities: processJsonField(row.amenity_ids, []),
            location: {
                address: row.address,
                coordinates: {
                    latitude: row.latitude,
                    longitude: row.longitude
                }
            },
            ownerId: row.owner_id,
            cityId: row.city_id,
            package: {
                name: row.package_name,
                description: row.package_description,
                images: processJsonField(row.package_images, []),
                pricing: {
                    adult: row.adult_price,
                    child: row.child_price,
                    maxGuests: row.max_guests
                }
            },
            timestamps: {
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }
        }));

        res.json({
            data: formattedRows,
            pagination: {
                total,
                totalPages,
                currentPage: pageNum,
                perPage: limitNum,
                hasNextPage: pageNum < totalPages,
                hasPrevPage: pageNum > 1
            }
        });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            error: 'Failed to fetch accommodations',
            ...(process.env.NODE_ENV === 'development' && {
                details: {
                    message: error.message,
                    sqlMessage: error.sqlMessage
                }
            })
        });
    } finally {
        await closeConnection(connection);
    }
});
// GET /admin/properties/accommodations/:id - Fetch single accommodation
routes.get('/accommodations/:id', async (req, res) => {
    const { id } = req.params;

    // Validate ID is a positive integer
    if (!Number.isInteger(Number(id)) || id <= 0) {
        return res.status(400).json({ error: 'Invalid accommodation ID format' });
    }

    const connection = await createConnection();

    try {
        const [rows] = await connection.execute(
            `SELECT 
                a.*,
                (a.available_rooms > 0) as available,
                u.name as owner_name,
                c.name as city_name,
                c.country as country
            FROM accommodations a
            LEFT JOIN users u ON a.owner_id = u.id
            LEFT JOIN cities c ON a.city_id = c.id
            WHERE a.id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Accommodation not found' });
        }

        const accommodation = rows[0];

        // Helper function to safely parse JSON fields
        const parseJSONField = (field, defaultValue) => {
            try {
                if (field === null || field === undefined) return defaultValue;
                if (typeof field === 'object') return field;
                return JSON.parse(field);
            } catch (e) {
                console.warn(`Failed to parse JSON field ${field}:`, e.message);
                return defaultValue;
            }
        };

        // Transform database fields to frontend structure
        const response = {
            id: accommodation.id,
            basicInfo: {
                name: accommodation.name || '',
                description: accommodation.description || '',
                type: accommodation.type || '',
                capacity: accommodation.capacity || 2,
                rooms: accommodation.rooms || 1,
                price: accommodation.price || 0,
                available: Boolean(accommodation.available),
                features: parseJSONField(accommodation.features, []),
                images: parseJSONField(accommodation.images, [])
            },
            location: {
                owner: {
                    id: accommodation.owner_id,
                    name: accommodation.owner_name
                },
                city: {
                    id: accommodation.city_id,
                    name: accommodation.city_name,
                    country: accommodation.country
                },
                address: accommodation.address || '',
                coordinates: {
                    latitude: accommodation.latitude,
                    longitude: accommodation.longitude
                }
            },
            amenities: {
                ids: parseJSONField(accommodation.amenity_ids, []),
                // You could add full amenity objects here if needed
            },
            packages: {
                name: accommodation.package_name || '',
                description: accommodation.package_description || '',
                images: parseJSONField(accommodation.package_images, []),
                pricing: {
                    adult: accommodation.adult_price || 0,
                    child: accommodation.child_price || 0,
                    maxGuests: accommodation.max_guests || 2
                }
            },
            metadata: {
                createdAt: accommodation.created_at,
                updatedAt: accommodation.updated_at
            }
        };

        res.json(response);

    } catch (error) {
        console.error('Error fetching accommodation:', error);

        // Handle specific SQL errors
        if (error.code === 'ER_PARSE_ERROR') {
            return res.status(500).json({
                error: 'Database query error',
                details: process.env.NODE_ENV === 'development' ? {
                    message: error.message,
                    sql: error.sql
                } : undefined
            });
        }

        res.status(500).json({
            error: 'Failed to fetch accommodation',
            ...(process.env.NODE_ENV === 'development' && {
                details: {
                    message: error.message,
                    stack: error.stack
                }
            })
        });
    } finally {
        await closeConnection(connection);
    }
});

// POST /admin/properties/accommodations - Create new accommodation
routes.post('/accommodations', async (req, res) => {
    try {
        const {
            name, // Frontend sends as "name"
            description,
            type,
            capacity,
            rooms,
            price,
            features = [], // Default empty array
            images = [], // Default empty array
            available = true, // Default true
            ownerId,
            cityId,
            address,
            latitude,
            longitude,
            amenityIds = [], // Default empty array
            packageName,
            packageDescription,
            packageImages = [], // Default empty array
            adultPrice = 0, // Default 0
            childPrice = 0, // Default 0
            maxGuests = 2 // Default 2
        } = req.body;

        // Validate required fields
        if (!name || !type || !capacity || !rooms || !price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const connection = await createConnection();

        // Use parameter names that match your database columns
        const [result] = await connection.execute(
            `INSERT INTO accommodations 
            (name, description, type, capacity, rooms, price, features, images, available, owner_id, city_id, 
             address, latitude, longitude, amenity_ids, package_name, package_description, package_images,
             adult_price, child_price, max_guests) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                description || null,
                type,
                capacity,
                rooms,
                price,
                JSON.stringify(features),
                JSON.stringify(images),
                available,
                ownerId || null,
                cityId || null,
                address || null,
                latitude || null,
                longitude || null,
                JSON.stringify(amenityIds),
                packageName || null,
                packageDescription || null,
                JSON.stringify(packageImages),
                adultPrice,
                childPrice,
                maxGuests
            ]
        );

        await closeConnection(connection);

        res.status(201).json({
            message: 'Accommodation created successfully',
            id: result.insertId,
            name: name // Return the name for confirmation
        });

    } catch (error) {
        console.error('Error creating accommodation:', error);
        res.status(500).json({
            error: 'Failed to create accommodation',
            details: process.env.NODE_ENV === 'development' ? {
                message: error.message,
                sqlMessage: error.sqlMessage,
                code: error.code
            } : undefined
        });
    }
});


// PUT /admin/properties/accommodations/:id - Update accommodation
routes.put('/accommodations/:id', async (req, res) => {
    const { id } = req.params;

    // Validate ID is a positive integer
    if (!Number.isInteger(Number(id))) {
        return res.status(400).json({ error: 'Invalid accommodation ID' });
    }

    try {
        const connection = await createConnection();

        // Check if accommodation exists first
        const [existing] = await connection.execute(
            'SELECT * FROM accommodations WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            await closeConnection(connection);
            return res.status(404).json({ error: 'Accommodation not found' });
        }

        const current = existing[0];

        // Destructure with defaults
        const {
            name = current.name,
            description = current.description,
            type = current.type,
            capacity = current.capacity,
            rooms = current.rooms,
            price = current.price,
            features = current.features,
            images = current.images,
            available = current.available,
            ownerId = current.owner_id,
            cityId = current.city_id,
            address = current.address,
            latitude = current.latitude,
            longitude = current.longitude,
            amenityIds = current.amenity_ids,
            packageName = current.package_name,
            packageDescription = current.package_description,
            packageImages = current.package_images,
            adultPrice = current.adult_price,
            childPrice = current.child_price,
            maxGuests = current.max_guests
        } = req.body;

        // Validate required fields
        if (!name || !type || !capacity || !rooms || !price) {
            await closeConnection(connection);
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Prepare update data
        const updateData = {
            name,
            description,
            type,
            capacity,
            rooms,
            price,
            features: JSON.stringify(Array.isArray(features)) ? features : JSON.parse(features || '[]'),
            images: JSON.stringify(Array.isArray(images)) ? images : JSON.parse(images || '[]'),
            available,
            owner_id: ownerId,
            city_id: cityId,
            address,
            latitude,
            longitude,
            amenity_ids: JSON.stringify(Array.isArray(amenityIds) ? amenityIds : JSON.parse(amenityIds || '[]')),
            package_name: packageName,
            package_description: packageDescription,
            package_images: JSON.stringify(Array.isArray(packageImages)) ? packageImages : JSON.parse(packageImages || '[]'),
            adult_price: adultPrice,
            child_price: childPrice,
            max_guests: maxGuests
        };

        // Execute update
        const [result] = await connection.execute(
            `UPDATE accommodations SET
                name = ?, description = ?, type = ?, capacity = ?, rooms = ?,
                price = ?, features = ?, images = ?, available = ?, owner_id = ?,
                city_id = ?, address = ?, latitude = ?, longitude = ?, amenity_ids = ?,
                package_name = ?, package_description = ?, package_images = ?,
                adult_price = ?, child_price = ?, max_guests = ?,
                updated_at = CURRENT_TIMESTAMP()
            WHERE id = ?`,
            [...Object.values(updateData), id]
        );

        await closeConnection(connection);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No changes made or accommodation not found' });
        }

        // Get updated record
        const [updated] = await connection.execute(
            'SELECT * FROM accommodations WHERE id = ?',
            [id]
        );

        res.status(200).json({
            message: 'Accommodation updated successfully',
            data: updated[0],
            changedFields: Object.keys(req.body)
        });

    } catch (error) {
        console.error('Error updating accommodation:', error);

        // Handle specific SQL errors
        if (error.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD') {
            return res.status(400).json({
                error: 'Invalid data type for one or more fields',
                field: error.sqlMessage?.match(/column '(.*?)'/i)?.[1]
            });
        }

        res.status(500).json({
            error: 'Failed to update accommodation',
            ...(process.env.NODE_ENV === 'development' && {
                details: {
                    message: error.message,
                    sqlMessage: error.sqlMessage,
                    code: error.code
                }
            })
        });
    }
});


// DELETE /admin/properties/accommodations/:id - Delete accommodation
routes.delete('/accommodations/:id', async (req, res) => {
    const { id } = req.params;

    // Validate ID is a positive integer
    if (!Number.isInteger(Number(id)) || id <= 0) {
        return res.status(400).json({ error: 'Invalid accommodation ID format' });
    }

    const connection = await createConnection();

    try {
        // Start transaction for atomic operations
        await connection.beginTransaction();

        // 1. Check if accommodation exists
        const [accommodation] = await connection.execute(
            'SELECT id FROM accommodations WHERE id = ? FOR UPDATE',
            [id]
        );

        if (accommodation.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Accommodation not found' });
        }

        // 2. Check for dependent records (bookings, reviews, etc.)
        const [bookings] = await connection.execute(
            'SELECT COUNT(*) as bookingCount FROM bookings WHERE accommodation_id = ?',
            [id]
        );

        const [reviews] = await connection.execute(
            'SELECT COUNT(*) as reviewCount FROM reviews WHERE accommodation_id = ?',
            [id]
        );

        const [packages] = await connection.execute(
            'SELECT COUNT(*) as packageCount FROM packages WHERE accommodation_id = ?',
            [id]
        );

        if (bookings[0].bookingCount > 0 ||
            reviews[0].reviewCount > 0 ||
            packages[0].packageCount > 0) {

            await connection.rollback();
            return res.status(409).json({
                error: 'Cannot delete accommodation with related records',
                details: {
                    bookings: bookings[0].bookingCount,
                    reviews: reviews[0].reviewCount,
                    packages: packages[0].packageCount
                }
            });
        }

        // 3. Delete from blocked_dates first (if exists)
        await connection.execute(
            'DELETE FROM blocked_dates WHERE accommodation_id = ?',
            [id]
        );

        // 4. Delete from amenities mapping table (if exists)
        await connection.execute(
            'DELETE FROM accommodation_amenities WHERE accommodation_id = ?',
            [id]
        );

        // 5. Finally delete the accommodation
        const [result] = await connection.execute(
            'DELETE FROM accommodations WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'No accommodation deleted' });
        }

        await connection.commit();
        res.json({
            message: 'Accommodation and all related data deleted successfully',
            deletedId: id
        });

    } catch (error) {
        await connection.rollback();
        console.error('Error deleting accommodation:', error);

        // Handle foreign key constraint errors
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).json({
                error: 'Cannot delete - accommodation is referenced by other records',
                hint: 'Please delete related bookings, reviews, or packages first'
            });
        }

        res.status(500).json({
            error: 'Failed to delete accommodation',
            ...(process.env.NODE_ENV === 'development' && {
                details: {
                    message: error.message,
                    sqlMessage: error.sqlMessage,
                    code: error.code
                }
            })
        });
    } finally {
        await closeConnection(connection);
    }
});

// PATCH /admin/properties/accommodations/:id/toggle-availability - Toggle availability
routes.patch('/accommodations/:id/toggle-availability', async (req, res) => {
    try {
        const { id } = req.params;
        const { available } = req.body;

        const connection = await createConnection();

        // If setting to available, set available_rooms to 1, if unavailable set to 0
        const available_rooms = available ? 1 : 0;

        const [result] = await connection.execute(
            'UPDATE accommodations SET available_rooms = ? WHERE id = ?',
            [available_rooms, id]
        );

        if (result.affectedRows === 0) {
            await closeConnection(connection);
            return res.status(404).json({ error: 'Accommodation not found' });
        }

        await closeConnection(connection);
        res.json({
            message: 'Availability updated successfully',
            available: available
        });
    } catch (error) {
        console.error('Error updating availability:', error);
        res.status(500).json({ error: 'Failed to update availability' });
    }
});

// GET /admin/properties/accommodations/stats - Get accommodation statistics
routes.get('/accommodations/stats', async (req, res) => {
    try {
        const connection = await createConnection();

        const [stats] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN available_rooms > 0 THEN 1 ELSE 0 END) as available,
                SUM(CASE WHEN available_rooms = 0 THEN 1 ELSE 0 END) as unavailable,
                AVG(price) as avg_price,
                MIN(price) as min_price,
                MAX(price) as max_price
            FROM accommodations
        `);

        await closeConnection(connection);
        res.json(stats[0]);
    } catch (error) {
        console.error('Error fetching accommodation stats:', error);
        res.status(500).json({ error: 'Failed to fetch accommodation statistics' });
    }
});

// GET /admin/properties/users
routes.get('/users', async (req, res) => {
    try {
        const connection = await createConnection();
        const [rows] = await connection.execute('SELECT id, name, email FROM users');
        await closeConnection(connection);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET /admin/properties/cities
routes.get('/cities', async (req, res) => {
    try {
        const connection = await createConnection();
        const [rows] = await connection.execute('SELECT id, name, country FROM cities WHERE active = 1');
        await closeConnection(connection);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cities' });
    }
});

module.exports = routes;