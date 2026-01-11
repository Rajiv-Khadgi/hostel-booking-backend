import * as yup from 'yup';

const registerOwnerSchema = yup.object({
    first_name: yup.string().min(2, 'First name must be at least 2 characters').required(),
    last_name: yup.string().min(2, 'Last name must be at least 2 characters').required(),
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required(),
    phone: yup.string().optional()
});

export class RegisterOwnerDTO {
    constructor(data) {
        this.data = {
            ...data,
            role: 'owner' // role is fixed
        };
    }

    async validate() {
        await registerOwnerSchema.validate(this.data, { abortEarly: false });
        return this.data;
    }
}
