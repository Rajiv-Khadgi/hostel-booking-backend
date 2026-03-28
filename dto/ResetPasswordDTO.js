import * as yup from 'yup';

const resetPasswordSchema = yup.object({
    email: yup.string().email('Invalid email').required('Email is required'),
    token: yup.string().required('Reset token is required'),
    password: yup.string()
        .min(6, 'Password must be at least 6 characters')
        .matches(/[A-Z]/, 'Must contain at least one uppercase letter')
        .matches(/[0-9]/, 'Must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain at least one symbol')
        .required('Password is required')
});

export class ResetPasswordDTO {
    constructor(data) {
        this.data = data;
    }

    async validate() {
        const validated = await resetPasswordSchema.validate(this.data, { abortEarly: false });
        return validated;  
    }
}
