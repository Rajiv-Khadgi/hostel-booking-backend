// middleware/roleMiddleware.js

/**
 * Middleware to authorize users based on role(s)
 * Usage: authorizeRoles('admin'), authorizeRoles('student', 'owner')
 */
export const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        // req.user must be set by authenticate middleware
        if (!req.user) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Check if user's role is allowed
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied: insufficient permissions' });
        }

        // Role is authorized
        next();
    };
};


