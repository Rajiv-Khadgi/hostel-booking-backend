import * as yup from 'yup';

const hostelSchema = yup.object({
    name: yup.string().required('Hostel name is required'),
    description: yup.string(),
    city: yup.string().required('City is required'),
    area: yup.string(),
    address: yup.string().required('Address is required'),
    latitude: yup.number().nullable(),
    longitude: yup.number().nullable(),
    amenityIds: yup.array().of(yup.number()).optional(),
    serviceIds: yup.array().of(yup.number()).optional()
});

export class CreateHostelDTO {
    constructor(data) {
        this.data = data;
    }

    async validate() {
        const validated = await hostelSchema.validate(this.data, { abortEarly: false });
        return validated;
    }
}
