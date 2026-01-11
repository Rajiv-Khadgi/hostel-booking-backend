import * as yup from 'yup';

const loginSchema = yup.object({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().required('Password is required')
});

export class LoginUserDTO {
    constructor(data) {
        this.rawData = data; // keep raw data
        this.email = null;
        this.password = null;
    }

    async validate() {
        const validated = await loginSchema.validate(this.rawData, { abortEarly: false });
        this.email = validated.email.toLowerCase().trim();
        this.password = validated.password;
    }
}
