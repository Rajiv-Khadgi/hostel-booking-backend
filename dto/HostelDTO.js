import * as yup from 'yup';

const hostelSchema = yup.object({
    name: yup.string().required('Hostel name is required'),
    description: yup.string(),
    city: yup.string().required('City is required'),
    area: yup.string(),
    address: yup.string().required('Address is required'),
    latitude: yup.number(),
    longitude: yup.number(),
    status: yup.string().oneOf(['active', 'inactive'])
});

export class HostelDTO {
    constructor(data) {
        this.data = data;
    }

    async validate() {
        await hostelSchema.validate(this.data, { abortEarly: false });
        return this.data;
    }
}
