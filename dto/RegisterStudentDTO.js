import * as yup from 'yup';

const registerStudentSchema = yup.object({
    first_name: yup.string().min(2, 'First name must be at least 2 characters').required(),
    middle_name: yup.string().nullable().optional(),
    last_name: yup.string().min(2, 'Last name must be at least 2 characters').required(),
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string()
        .required('Password is required')
        .min(6, 'Password must be at least 6 characters')
        .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .matches(/[0-9]/, 'Password must contain at least one number')
        .matches(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one symbol'),
    phone: yup.string().optional()
});

export class RegisterStudentDTO {
    constructor(data) {
        this.data = {
            ...data,
            role: 'student' // role is fixed
        };
    }

    async validate() {
        await registerStudentSchema.validate(this.data, { abortEarly: false });
        return this.data;
    }
}
