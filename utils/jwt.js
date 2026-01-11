import jwt from 'jsonwebtoken';

export const generateTokens = {
    access: (user) => {
        return jwt.sign(
            { 
                id: user.user_id, 
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_ACCESS_SECRET || 'access-secret-2026',
            { expiresIn: '15m' }
        );
    },
    refresh: (user) => {
        return jwt.sign(
            { id: user.user_id, email: user.email },
            process.env.JWT_REFRESH_SECRET || 'refresh-secret-2026',
            { expiresIn: '7d' }
        );
    }
};
