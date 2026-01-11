import * as yup from 'yup';

const forgotPasswordSchema = yup.object({
    email: yup.string().email('Invalid email').required('Email is required')
});

export class ForgotPasswordDTO {
    constructor(data) {
        this.data = data;
    }

    async validate() {
    const validated = await forgotPasswordSchema.validate(this.data, { abortEarly: false });
    return validated;  // return validated object
}
}
