import * as yup from 'yup';

const hostelSchema = yup.object({
    name: yup.string().required('Hostel name is required'),
    description: yup.string(),
    city: yup.string().required('City is required'),
    area: yup.string(),
    address: yup.string().required('Address is required'),
    latitude: yup.number().nullable(),
    longitude: yup.number().nullable(),
    gender_type: yup.string().oneOf(['BOYS', 'GIRLS', 'COED'], 'Invalid gender selection').required('Gender is required'),
    amenityIds: yup.array().of(yup.number()).min(1, 'Select at least one amenity').required('Amenities are required'),
    serviceIds: yup.array().of(yup.number()).min(1, 'Select at least one service').required('Services are required')
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
