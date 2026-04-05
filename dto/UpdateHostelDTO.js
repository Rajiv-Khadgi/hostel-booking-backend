import * as yup from 'yup';

const updateSchema = yup.object({
    name: yup.string(),
    description: yup.string(),
    city: yup.string(),
    area: yup.string(),
    address: yup.string(),
    latitude: yup.number().nullable(),
    longitude: yup.number().nullable(),
    gender_type: yup.string().oneOf(['BOYS', 'GIRLS', 'COED'], 'Invalid gender selection'),
    amenityIds: yup.array().of(yup.number()).min(1, 'Select at least one amenity'),
    serviceIds: yup.array().of(yup.number()).min(1, 'Select at least one service'),
    status: yup.string().oneOf(['PENDING', 'APPROVED', 'REJECTED'])
});

export class UpdateHostelDTO {
    constructor(data) {
        this.data = data;
    }

    async validate() {
        const validated = await updateSchema.validate(this.data, { abortEarly: false });
        return validated;
    }
}
